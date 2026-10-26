import { terrainHeight, airfieldsNear } from "./free-flight-world.js";

// All scenery shares one linear-light atmosphere and one final display transform.
// The photograph supplies the sky only; every coastline and ocean below it is 3D.
export function createFlightAtmosphere({ B, scene, camera, panoramaUrl }) {
  const haze = new B.Color3(.27, .38, .48), density = 1 / 58000;
  scene.fogMode = B.Scene.FOGMODE_EXP2; scene.fogDensity = density; scene.fogColor = haze.toGammaSpace();
  const pipeline = new B.DefaultRenderingPipeline("free-flight-finish", true, scene, [camera]);
  pipeline.fxaaEnabled = true; pipeline.samples = 1; pipeline.imageProcessingEnabled = true;
  scene.imageProcessingConfiguration.exposure = 1.02; scene.imageProcessingConfiguration.contrast = 1.06;
  const panorama = new B.Texture(panoramaUrl, scene); panorama.wrapU = panorama.wrapV = B.Texture.CLAMP_ADDRESSMODE;
  const skySampling = `
    vec3 skyColor(vec3 d){
      float u=atan(d.x,d.z)/1.5707963+.5;float tile=floor(u);u=fract(u);if(mod(tile,2.0)!=0.0)u=1.0-u;
      // Crop the baked ocean and distant mountains out of the horizon.
      float v=clamp(.565+asin(clamp(d.y,0.0,1.0))/.785398,.565,.997);
      vec3 photo=pow(texture2D(panorama,vec2(u,v)).rgb,vec3(2.2));
      return mix(haze,photo,smoothstep(-.005,.065,d.y));
    }`;
  B.Effect.ShadersStore.freeFlightAtmosphereVertexShader = `precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;varying vec3 direction;
    void main(){direction=position;gl_Position=worldViewProjection*vec4(position,1.0);gl_Position.z=gl_Position.w*.999999;}`;
  B.Effect.ShadersStore.freeFlightAtmosphereFragmentShader = `precision highp float;varying vec3 direction;uniform sampler2D panorama;uniform vec3 haze;${skySampling}
    void main(){gl_FragColor=vec4(skyColor(normalize(direction)),1.0);}`;
  const skyMat = new B.ShaderMaterial("free-flight-atmosphere", scene, "freeFlightAtmosphere", { attributes: ["position"], uniforms: ["worldViewProjection", "haze"], samplers: ["panorama"] });
  skyMat.setTexture("panorama", panorama); skyMat.setColor3("haze", haze); skyMat.backFaceCulling = false; skyMat.disableDepthWrite = true;
  const sky = B.MeshBuilder.CreateSphere("free-flight-sky", { diameter: 400000, segments: 32 }, scene); sky.material = skyMat; sky.infiniteDistance = true; sky.isPickable = false;

  const resolution = 193, depthSpan = 32000, depthData = new Uint8Array(resolution * resolution * 4);
  const depthMap = B.RawTexture.CreateRGBATexture(depthData, resolution, resolution, scene, false, false, B.Texture.BILINEAR_SAMPLINGMODE);
  depthMap.wrapU = depthMap.wrapV = B.Texture.CLAMP_ADDRESSMODE; depthMap.gammaSpace = false;
  let mapOrigin = { x: 0, z: 0 }, origin = { x: 0, z: 0 }, mapKey = "", elapsed = 0;
  function updateDepth(s) {
    const x = Math.floor(s.x / 4000) * 4000, z = Math.floor(s.z / 4000) * 4000, key = x + ":" + z;
    if (key === mapKey) return;
    mapKey = key; mapOrigin = { x: x - depthSpan / 2, z: z - depthSpan / 2 };
    const fields = airfieldsNear(x, z, depthSpan * .8 + 6000);
    for (let iz = 0; iz < resolution; iz++) for (let ix = 0; ix < resolution; ix++) {
      const height = terrainHeight(mapOrigin.x + ix / (resolution - 1) * depthSpan, mapOrigin.z + iz / (resolution - 1) * depthSpan, fields);
      const value = Math.round(Math.max(0, Math.min(1, (height + 2048) / 8192)) * 65535), i = (iz * resolution + ix) * 4;
      depthData[i] = value >> 8; depthData[i + 1] = value & 255; depthData[i + 2] = 0; depthData[i + 3] = 255;
    }
    depthMap.update(depthData);
  }
  B.Effect.ShadersStore.freeFlightSeaVertexShader = `precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;uniform mat4 world;varying vec3 vPosition;
    #include<logDepthDeclaration>
    void main(){vPosition=(world*vec4(position,1.0)).xyz;gl_Position=worldViewProjection*vec4(position,1.0);
    #include<logDepthVertex>
    }`;
  B.Effect.ShadersStore.freeFlightSeaFragmentShader = `
    precision highp float;varying vec3 vPosition;uniform sampler2D panorama,depthMap;
    uniform vec3 eye,haze;uniform vec2 worldOrigin,depthOrigin;uniform float clock,fogDensity,depthSpan;
    #include<logDepthDeclaration>
    ${skySampling}
    float hash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+19.19);return fract((p.x+p.y)*p.x);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.0),f.x),f.y);}
    vec2 ripple(vec2 p,float scale,float strength,float speed,float footprint){
      // Analytic noise slopes break up long parallel wave bands. Different
      // scales drift independently, and subpixel ripples fade before aliasing.
      p=p/scale+vec2(clock*speed,-clock*speed*.63);
      vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f),du=6.0*f*(1.0-f);
      float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+1.0);
      vec2 slope=du*vec2(b-a+(a-b-c+d)*u.y,c-a+(a-b-c+d)*u.x);
      return slope*strength*(1.0-smoothstep(scale*.18,scale*.9,footprint));
    }
    void main(){
      vec2 p=vPosition.xz+worldOrigin;
      float footprint=max(length(dFdx(vPosition.xz)),length(dFdy(vPosition.xz)));
      mat2 turn=mat2(.8,-.6,.6,.8);
      vec2 gradient=ripple(p,180.0,.045,.018,footprint);
      gradient+=turn*ripple(p*turn+83.0,42.0,.095,.04,footprint);
      gradient+=ripple(p+173.0,11.0,.14,.075,footprint);
      gradient+=turn*ripple(p*turn+311.0,2.8,.11,.15,footprint);
      gradient+=ripple(p+701.0,.7,.065,.22,footprint);
      vec3 normal=normalize(vec3(-gradient.x,1.0,-gradient.y)),view=normalize(eye-vPosition);
      float distanceToEye=length(eye-vPosition);
      vec2 uv=(p-depthOrigin)/depthSpan;
      vec2 depthUV=(clamp(uv,vec2(0.0),vec2(1.0))*${resolution - 1}.0+.5)/${resolution}.0;
      vec4 encoded=texture2D(depthMap,depthUV);
      float ground=(encoded.r*65280.0+encoded.g*255.0)/65535.0*8192.0-2048.0;
      float edge=min(min(uv.x,uv.y),min(1.0-uv.x,1.0-uv.y));
      float inside=smoothstep(0.0,.04,edge);
      float depth=mix(180.0,max(.05,-ground),inside);
      vec3 deep=vec3(.012,.065,.105),shallows=vec3(.035,.235,.235);
      vec3 base=mix(shallows,deep,smoothstep(2.0,32.0,depth));
      base*=.88+noise(p/2400.0)*.22;
      float fresnel=.08+.54*pow(1.0-max(dot(normal,view),0.0),4.5);
      vec3 reflected=skyColor(reflect(-view,normal));
      vec3 sea=mix(base,reflected,fresnel);
      vec3 sunDirection=normalize(vec3(-.55,.4,-.55));
      float shine=pow(max(dot(normal,normalize(view+sunDirection)),0.0),mix(110.0,32.0,clamp(footprint/90.0,0.0,1.0)));
      sea+=vec3(1.0,.73,.37)*shine*.5;
      // Surf is part of the water surface, so no overlapping foam sheets flicker.
      float coast=inside*(1.0-smoothstep(.3,4.5,depth));
      float breaker=pow(.5+.5*sin(depth*2.1-clock*1.6+noise(p/65.0)*3.0),3.0);
      float foam=coast*(.25+breaker*.65)*(1.0-smoothstep(12.0,60.0,footprint));
      sea=mix(sea,vec3(.62,.73,.7),foam);
      float fog=1.0-pow(exp(-pow(distanceToEye*fogDensity,2.0)),2.2);
      sea=mix(sea,haze,fog);
      gl_FragColor=vec4(sea,1.0);
      #include<logDepthFragment>
    }`;
  const seaMat = new B.ShaderMaterial("free-flight-water", scene, "freeFlightSea", { attributes: ["position"], uniforms: ["worldViewProjection", "world", "clock", "eye", "haze", "fogDensity", "worldOrigin", "depthOrigin", "depthSpan"], samplers: ["panorama", "depthMap"] });
  seaMat.useLogarithmicDepth = true;
  seaMat.setTexture("panorama", panorama); seaMat.setTexture("depthMap", depthMap); seaMat.setColor3("haze", haze); seaMat.setFloat("fogDensity", density); seaMat.setFloat("depthSpan", depthSpan); seaMat.setFloat("clock", 0);
  const sea = B.MeshBuilder.CreateGround("free-flight-ocean", { width: 500000, height: 500000 }, scene); sea.material = seaMat; sea.position.y = -.08; sea.isPickable = false;
  return {
    update(s, renderOrigin, dt) {
      elapsed += dt; origin = renderOrigin; updateDepth(s);
      sea.position.x = s.x - origin.x; sea.position.z = s.z - origin.z;
      seaMat.setFloat("clock", elapsed); seaMat.setVector3("eye", camera.position); seaMat.setVector2("worldOrigin", new B.Vector2(origin.x, origin.z)); seaMat.setVector2("depthOrigin", new B.Vector2(mapOrigin.x, mapOrigin.z));
      // Improve depth precision at cruise height, while preserving nearby cockpit
      // details and centimeter-separated runway markings close to the ground.
      const clearance = Math.max(0, s.y - Math.max(0, terrainHeight(s.x, s.z)));
      camera.minZ = Math.max(.35, Math.min(4, clearance * .008)); camera.maxZ = 220000;
    },
    dispose() { pipeline.dispose(); sky.dispose(); sea.dispose(); skyMat.dispose(); seaMat.dispose(); depthMap.dispose(); panorama.dispose(); },
  };
}
