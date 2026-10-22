import { createWebGLScene } from "./arcade/babylon.js";
import { buildAircraft } from "./runway-aircraft.js";
import { createSceneryTools } from "./runway-scenery.js";
import { OCEAN_FRAGMENT } from "./runway-shaders.js";
import { DEG, deckAt, flightInstruments, trafficAt, clamp } from "./runway-engine.js";

export async function createRunwayRenderer(canvas, { isCurrent = () => true } = {}) {
  const gfx = await createWebGLScene(canvas, { quality: "high", isCurrent });
  const { B, scene, camera, sun, material, shadows } = gfx;
  const aircraftLayer = 0x10000000, sceneryLayers = camera.layerMask;
  const panoramaUrl=new URL("./assets/runway-environment.png",import.meta.url).href;
  const environment=await new Promise(resolve=>{
    let texture;
    texture=new B.EquiRectangularCubeTexture(panoramaUrl,scene,512,false,true,()=>resolve(texture),()=>resolve(null));
  });
  if(!isCurrent()){gfx.dispose();throw new Error("Scene creation was cancelled");}
  if(environment){scene.environmentTexture=environment;scene.environmentIntensity=.9;}
  camera.minZ = .3; camera.maxZ = 24000; camera.fov = .82;
  scene.skipPointerMovePicking = true;
  scene.fogMode = B.Scene.FOGMODE_EXP2;
  scene.imageProcessingConfiguration.exposure = 1.05;
  scene.imageProcessingConfiguration.contrast = 1.12;
  sun.direction.set(.55, -.4, .55); sun.intensity = 2.6;
  sun.diffuse=B.Color3.FromHexString("#ffe3b5");
  shadows.mapSize = 2048;
  shadows.useBlurExponentialShadowMap = false;
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = B.ShadowGenerator.QUALITY_HIGH;
  shadows.bias = .00015; shadows.normalBias = .025;
  // Follow the actual model with a tight map for recognizable wing/tail/gear
  // silhouettes. Its depth must also reach the runway below an airborne plane.
  sun.autoCalcShadowZBounds = false; sun.autoUpdateExtends = true;
  sun.shadowMinZ = .1; sun.shadowMaxZ = 700; sun.shadowOrthoScale = .12;
  let world = null, aircraft = null, traffic = [], windsocks = [], water = null, rings = [], papi = [], runwayRoot = null;
  let level, currentAircraft, view = "chase", cameraReady = false, flightSeconds = 0;
  let textures = [], ownedMaterials = [], rain = null, smoke = [], lights = [], clouds = [], glow = null;
  const fill = scene.getLightByName("sky-fill");
  const V = (x, y, z) => new B.Vector3(x, y, z);
  function ownMat(mat) { ownedMaterials.push(mat); return mat; }
  function ownTexture(t) { textures.push(t); return t; }
  function box(name, w, h, d, x, y, z, mat, parent = world) {
    const mesh = B.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    mesh.position.set(x, y, z); mesh.material = mat; mesh.parent = parent; mesh.isPickable = false; mesh.receiveShadows = true; return mesh;
  }
  function sphere(name, size, x, y, z, mat, parent = world) {
    const m = B.MeshBuilder.CreateSphere(name, { diameter: 1, segments: 12 }, scene);
    m.position.set(x, y, z); m.scaling.set(...size); m.material = mat; m.parent = parent; m.isPickable = false; return m;
  }
  function ground(name, width, height, x, y, z, mat, parent = world) {
    const mesh = B.MeshBuilder.CreateGround(name, { width, height }, scene);
    mesh.position.set(x, y, z); mesh.material = mat; mesh.parent = parent; mesh.receiveShadows = true; mesh.isPickable = false; return mesh;
  }
  function seeded(seed) { let n = seed; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
  function noiseTexture(name, colors, size = 256) {
    const tex = ownTexture(new B.DynamicTexture(name, { width: size, height: size }, scene, true));
    tex.wrapU = tex.wrapV = B.Texture.WRAP_ADDRESSMODE;
    const ctx = tex.getContext(), rng = seeded(63); ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, size, size);
    for (let j = 0; j < size * size * .5; j++) { ctx.fillStyle = colors[Math.floor(rng() * colors.length)]; ctx.globalAlpha = .1 + rng() * .3; ctx.fillRect(rng() * size, rng() * size, 1 + rng() * 3, 1 + rng() * 3); }
    ctx.globalAlpha = 1; tex.update(); return tex;
  }
  function surface(name, colors, scale = 1) {
    const mat = ownMat(new B.PBRMaterial(name, scene)); mat.albedoColor = B.Color3.White(); mat.roughness = .98; mat.metallic = 0;
    mat.albedoTexture = noiseTexture(name, colors); mat.albedoTexture.uScale = scale; mat.albedoTexture.vScale = scale; return mat;
  }
  function buildSky(night, storm) {
    if(environment&&!night&&!storm){
      B.Effect.ShadersStore.coastalSkyVertexShader=`precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;varying vec3 direction;void main(){direction=position;gl_Position=worldViewProjection*vec4(position,1.0);}`;
      B.Effect.ShadersStore.coastalSkyFragmentShader=`precision highp float;varying vec3 direction;uniform sampler2D panorama;void main(){vec3 d=normalize(direction);float angle=atan(d.x,d.z);float u=angle/1.5707963+.5;float tile=floor(u);u=fract(u);if(mod(tile,2.0)!=0.0)u=1.0-u;float v=clamp(asin(d.y)/.785398+.5,.003,.997);vec3 color=texture2D(panorama,vec2(u,v)).rgb;gl_FragColor=vec4(color,1.0);}`;
      const skyMat=ownMat(new B.ShaderMaterial("coastal-sky-material",scene,"coastalSky",{attributes:["position"],uniforms:["worldViewProjection"],samplers:["panorama"]}));
      skyMat.setTexture("panorama",ownTexture(new B.Texture(panoramaUrl,scene)));skyMat.backFaceCulling=false;
      const sky=B.MeshBuilder.CreateSphere("photographic-sky",{diameter:38000,segments:32},scene);sky.material=skyMat;sky.infiniteDistance=true;sky.parent=world;sky.isPickable=false;
      return;
    }
    B.Effect.ShadersStore.runwaySkyVertexShader = `precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;varying vec3 skyDirection;void main(){skyDirection=normalize(position);gl_Position=worldViewProjection*vec4(position,1.0);}`;
    B.Effect.ShadersStore.runwaySkyFragmentShader = `precision highp float;varying vec3 skyDirection;uniform vec3 zenith;uniform vec3 horizon;uniform float night;void main(){vec3 dir=normalize(skyDirection);float altitude=clamp(dir.y,0.0,1.0);vec3 color=mix(horizon,zenith,pow(altitude,.45));float sun=max(0.0,dot(dir,normalize(vec3(-7500.0,3300.0,11500.0))));color+=vec3(1.0,.65,.25)*pow(sun,80.0)*.18*(1.0-night);gl_FragColor=vec4(color,1.0);}`;
    const skyMat=ownMat(new B.ShaderMaterial("sky-material",scene,"runwaySky",{attributes:["position"],uniforms:["worldViewProjection","zenith","horizon","night"]}));
    skyMat.setColor3("zenith",B.Color3.FromHexString(night?"#06142d":storm?"#3e5366":"#2f7bb5"));skyMat.setColor3("horizon",B.Color3.FromHexString(night?"#344b61":storm?"#a4b1b9":"#d0e3df"));skyMat.setFloat("night",night?1:0);skyMat.backFaceCulling=false;
    const sky = B.MeshBuilder.CreateSphere("sky", { diameter: 38000, segments: 24 }, scene); sky.material = skyMat; sky.parent = world; sky.infiniteDistance = true; sky.isPickable = false;
    const sunMat = ownMat(new B.StandardMaterial("sun-disc-material", scene)); sunMat.disableLighting = true; sunMat.emissiveColor = B.Color3.FromHexString(night ? "#d7e7ed" : "#fff2cc"); sunMat.fogEnabled = false;
    sphere("sun-disc", [night ? 200 : 280, night ? 200 : 280, 200], -7500, night ? 5000 : 3300, 11500, sunMat);
    const cloudTex = ownTexture(new B.DynamicTexture("cloud-billboard", { width: 256, height: 128 }, scene, true));
    cloudTex.hasAlpha = true; const c = cloudTex.getContext(); c.clearRect(0, 0, 256, 128);
    const rng = seeded(78);
    for (let j = 0; j < 38; j++) {
      const x = 35 + rng() * 180, y = 35 + rng() * 55, r = 20 + rng() * 35;
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, storm ? "rgba(115,127,134,.35)" : "rgba(255,247,229,.28)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(x-r, y-r, r*2, r*2);
    }
    cloudTex.update();
    const cloudMat = ownMat(new B.StandardMaterial("cloud-material", scene)); cloudMat.diffuseTexture = cloudTex; cloudMat.opacityTexture = cloudTex; cloudMat.disableLighting = true; cloudMat.emissiveColor = new B.Color3(night ? .23 : .9, night ? .28 : .9, night ? .35 : .88); cloudMat.backFaceCulling = false;
    for (let j = 0; j < 15; j++) {
      const cloud = B.MeshBuilder.CreatePlane("cloud", { width: 1300 + rng() * 1600, height: 400 + rng() * 500 }, scene);
      cloud.position.set((rng() - .5) * 17000, (storm ? 550 : 900) + rng() * 1600, -1000 + rng() * 13000); cloud.billboardMode = B.Mesh.BILLBOARDMODE_Y; cloud.material = cloudMat; cloud.parent = world; cloud.isPickable = false;
      cloud.metadata = { drift: 1 + rng() * 3 };
      clouds.push(cloud);
    }
    if (night) {
      const stars = [];
      for (let j = 0; j < 180; j++) stars.push(V((rng()-.5)*25000, 2500+rng()*9500, 3000+rng()*11000));
      const starMesh = B.MeshBuilder.CreateLineSystem("stars", { lines: stars.map(v => [v, v.add(V(1, 1, 0))]) }, scene); starMesh.color = new B.Color3(.8,.85,.95); starMesh.parent = world;
    }
  }
  function buildWater() {
    const name = "runwayOcean";
    B.Effect.ShadersStore[`${name}VertexShader`] = `precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;uniform mat4 world;uniform float clock;varying vec3 vPosition;void main(){vec3 p=position;float wave=sin(p.x*.009+clock*.8)*.48+sin(p.z*.015-clock*1.2)*.23;p.y+=wave;vPosition=(world*vec4(p,1.0)).xyz;gl_Position=worldViewProjection*vec4(p,1.0);}`;
    B.Effect.ShadersStore[`${name}FragmentShader`] = OCEAN_FRAGMENT;
    const mat = ownMat(new B.ShaderMaterial("flowing-ocean", scene, name, { attributes: ["position"], uniforms: ["worldViewProjection", "world", "clock", "eye", "darkness"],samplers:["panorama"] }));
    mat.setTexture("panorama",ownTexture(new B.Texture(panoramaUrl,scene)));
    mat.setFloat("clock", 0); mat.setVector3("eye", camera.position); mat.setFloat("darkness", level.scenery === "night" ? .22 : 1);
    water = B.MeshBuilder.CreateGround("ocean", { width: 24000, height: 24000, subdivisions: 140 }, scene); water.position.set(0, level.id === "carrier" ? 0 : -6.5, 2000); water.material = mat; water.parent = world; water.isPickable = false;
  }
  function mountain(x, z, width, height, depth, index) {
    const size = 64, positions = [], indices = [], colors = [];
    const base = level.scenery === "alpine" ? [ .36,.4,.37] : [.25,.36,.31];
    for (let j = 0; j <= size; j++) for (let k = 0; k <= size; k++) {
      const nx = k / size * 2 - 1, nz = j / size * 2 - 1;
      const radial = Math.max(0, 1 - Math.sqrt(nx * nx + nz * nz));
      const ridge=Math.sin(nx*7+index)*Math.sin(nz*6+index*.3)*.17+Math.cos(nx*15+nz*11)*.045;
      const h = Math.pow(radial, 1.1) * height * (.87 + ridge);
      positions.push(x + nx * width, h - 4, z + nz * depth);
      const tint = .8 + Math.sin(nx*18+nz*25)*.05 + radial*.22, snow = level.scenery === "alpine" && h > height * .66;
      colors.push(...(snow ? [.78,.82,.8] : base.map(c => c*tint)), 1);
      if (j < size && k < size) { const a = j * (size + 1) + k; indices.push(a, a+size+1, a+1, a+1, a+size+1, a+size+2); }
    }
    const data = new B.VertexData(); data.positions = positions; data.indices = indices; data.colors = colors; data.normals = [];
    B.VertexData.ComputeNormals(positions, indices, data.normals); const m = new B.Mesh("mountain-ridge", scene); data.applyToMesh(m); m.material = material("#ffffff", { roughness: 1 }); m.parent = world;
  }
  function buildLand() {
    const grass = surface("airfield-grass", level.scenery === "alpine" ? ["#69775e", "#727c62", "#879078"] : ["#59744c", "#496644", "#74865a", "#7c8c61"], 70);
    // Broad agricultural patches plus fine grain give useful speed/depth cues.
    const fields=ownTexture(new B.DynamicTexture("field-mosaic",{width:1024,height:1024},scene,true));
    fields.wrapU=fields.wrapV=B.Texture.WRAP_ADDRESSMODE;fields.anisotropicFilteringLevel=8;
    const ctx=fields.getContext(),fieldRandom=seeded(512),fieldColors=["#66774b","#6d7b4e","#526b43","#5c784b","#7a8054","#878758"];
    ctx.fillStyle="#617348";ctx.fillRect(0,0,1024,1024);
    for(let n=0;n<110;n++){const x=fieldRandom()*1024,y=fieldRandom()*1024,w=55+fieldRandom()*150,h=40+fieldRandom()*180;ctx.fillStyle=fieldColors[Math.floor(fieldRandom()*fieldColors.length)];ctx.fillRect(x,y,w,h);ctx.strokeStyle="#b2ad7c";ctx.globalAlpha=.18;ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);ctx.globalAlpha=.13;ctx.strokeStyle="#354b31";ctx.lineWidth=1;for(let stripe=0;stripe<w;stripe+=4){ctx.beginPath();ctx.moveTo(x+stripe,y);ctx.lineTo(x+stripe,y+h);ctx.stroke();}ctx.globalAlpha=1;}
    for(let n=0;n<50000;n++){ctx.fillStyle=fieldRandom()>.5?"#d7c4a0":"#253f2b";ctx.globalAlpha=.1;ctx.fillRect(fieldRandom()*1024,fieldRandom()*1024,1.5,1.5);}ctx.globalAlpha=1;fields.update();fields.uScale=10;fields.vScale=10;grass.albedoTexture=fields;
    if (level.scenery === "coast") {
      const paths=[],edgeLeft=[],edgeRight=[];
      for(let row=0;row<=100;row++){
        const z=-160+row*65,left=-260-Math.sin(row*.07)*160-Math.sin(row*.47)*15,right=1060+Math.sin(row*.12)*110;
        const points=[];
        for(let col=0;col<=20;col++){const u=col/20,x=left+(right-left)*u,front=row<5?Math.pow((u-.3)*1.4,2)*170*(1-row/5):0;points.push(V(x,-.08,z+front));}
        paths.push(points);edgeLeft.push(points[0]);edgeRight.push(points[20]);
      }
      const island=B.MeshBuilder.CreateRibbon("coastal-airfield",{pathArray:paths,sideOrientation:B.Mesh.DOUBLESIDE},scene);island.material=grass;island.parent=world;island.receiveShadows=true;
      const edge=[...paths[0],...edgeRight.slice(1),...paths[100].slice().reverse().slice(1),...edgeLeft.slice().reverse().slice(1)];
      const middle=edge.map((p,j)=>V(p.x+(p.x<0?-3:3)*Math.sin(j*1.8),-3.2-Math.sin(j*.7),p.z-3));
      const bottom=edge.map((p,j)=>V(p.x+(p.x<0?-9:9),-8.5,p.z-7));
      const cliff=B.MeshBuilder.CreateRibbon("rocky-shore",{pathArray:[edge,middle,bottom],closePath:true,sideOrientation:B.Mesh.DOUBLESIDE},scene);cliff.material=surface("coastal-limestone",["#9f9e8c","#b1aa92","#858b7f","#6a776e"],40);cliff.parent=world;
      const shoreRandom=seeded(93),rockMat=material("#9b9d8e",{roughness:.98});
      for(let j=0;j<edge.length;j+=3){const p=edge[j],rock=B.MeshBuilder.CreateIcoSphere("shore-rock",{radius:1,subdivisions:2,flat:true},scene);rock.scaling.set(4+shoreRandom()*7,2+shoreRandom()*3,5+shoreRandom()*8);rock.position.set(p.x,-4,p.z);rock.rotation.y=shoreRandom()*6;rock.material=rockMat;rock.parent=world;}
    } else ground("airfield", 20000, 20000, 0, -.15, 2000, grass);
    const trimmed=surface("mown-airfield",["#6c8158","#6a7d54","#72865e"],15);
    ground("runway-grass-verge",level.width+75,level.length+240,0,-.06,level.length/2,trimmed);
    for(const side of [-1,1])ground("mown-grass-stripe",12,level.length+200,side*(level.width/2+17),-.04,level.length/2,material("#71875b"));
    const rng = seeded(81);
    for (let j = 0; j < (level.scenery==="coast"?0:13); j++) {
      const side = j % 2 ? -1 : 1;
      const near = level.scenery === "alpine";
      const x = side * (near ? 900 + rng() * 1800 : 2200 + rng() * 4000);
      if (!(level.scenery === "coast" && side === -1)) mountain(x, -1600+j*900, near ? 650+rng()*700 : 1400, near ? 600+rng()*1100 : 400+rng()*800, 1400, j);
    }
    const forest = ["forest", "alpine"].includes(level.scenery);
    const scenery = createSceneryTools({ B, scene, world, material, ownMat, ownTexture, seeded }), trees = [];
    for (let j = 0; j < (forest ? 190 : 80); j++) {
      const x = level.scenery==="coast"?(j%2?-130-rng()*60:300+rng()*550):(j % 2 ? -1 : 1) * ((forest ? 65 : 360) + rng() * (forest ? 480 : 1300));
      const z = (level.scenery==="coast"?140:-350) + rng() * (level.length + 1800);
      // Keep trees out of the terminal/apron footprint and taxi lanes.
      if (!forest && x > 210 && x < 760 && z > 450 && z < 1740) continue;
      trees.push({ x, z, height: 7 + rng() * (forest ? 18 : 12), variation: rng() });
    }
    scenery.grove(trees, forest);
    // Airfield structures remain well clear of the approach and runway.
    if (!forest) scenery.airport(level); else scenery.lodge(level);
  }
  function runwayTexture() {
    const height = Math.min(8192, gfx.engine.getCaps().maxTextureSize);
    const texture = ownTexture(new B.DynamicTexture("runway-markings", { width: 1024, height }, scene, true));
    // Paint in a consistent coordinate system, then rasterize at twice the
    // resolution. Fine material grain is a separate repeating normal map.
    const c = texture.getContext(), w = 512, h = 4096, grass = ["forest", "alpine"].includes(level.scenery), carrier = level.id === "carrier";
    c.scale(2, height / h);
    c.fillStyle = grass ? level.scenery === "forest" ? "#697254" : "#8c8a79" : carrier ? "#44535d" : "#3a4347"; c.fillRect(0,0,w,h);
    const rng = seeded(4);
    for (let j = 0; j < 80000; j++) { c.globalAlpha = rng()*.14; c.fillStyle = rng()>.5 ? "#e9e7dd" : "#0d1519"; c.fillRect(rng()*w,rng()*h,.25+rng(),.3+rng()*2); }
    if (!grass) {
      // Resurfacing lanes, expansion seams, and repaired asphalt give the
      // pavement depth without obscuring the approach markings.
      for (let x = 0; x < w; x += 64) {
        c.globalAlpha = .045; c.fillStyle = (x / 64) % 2 ? "#0d1518" : "#d4d4c7"; c.fillRect(x, 0, 64, h);
        c.globalAlpha = .16; c.fillStyle = "#142024"; c.fillRect(x, 0, .65, h);
      }
      for (let j = 0; j < 45; j++) {
        const x = rng() * w, y = rng() * h;
        c.globalAlpha = .09; c.fillStyle = "#1c292d"; c.fillRect(x, y, 5 + rng() * 15, 4 + rng() * 22);
        c.strokeStyle = "#0b1419"; c.lineWidth = .4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 8, y + 16); c.lineTo(x + 6, y + 30); c.stroke();
      }
    }
    c.globalAlpha=1; c.fillStyle=grass?"#e7e2c7":"#efefdf";
    c.fillRect(18,25,5,h-50);c.fillRect(w-23,25,5,h-50);
    if (carrier) {
      c.fillStyle="#e8c98b"; c.fillRect(45,0,6,h);c.fillRect(w-51,0,6,h);
      c.fillStyle="#ece8d8";
      for(let y=80;y<h;y+=190)c.fillRect(250,y,12,95);
      for (const z of [108,132,156,180]) { const y=h-z/level.length*h; c.fillStyle="#1c262d";c.fillRect(50,y,412,12); c.fillStyle="#b7c1bb"; c.fillRect(50,y,412,3); }
      c.strokeStyle="#f5efe1";c.lineWidth=5;c.strokeRect(106,h-95/level.length*h,300,250);
    } else {
      for(let z=95;z<level.length-70;z+=60){const y=h-z/level.length*h;c.fillRect(253,y,6,26/level.length*h);}
      if(!grass) {
        for(const side of [-1,1])for(let j=0;j<5;j++)c.fillRect(256+side*(57+j*34)-(side<0?22:0),h-36/level.length*h,22,29/level.length*h);
        const aimY=h-level.aim/level.length*h;
        c.fillRect(75,aimY-30/level.length*h,68,40/level.length*h);c.fillRect(369,aimY-30/level.length*h,68,40/level.length*h);
        for (let z = 150; z < Math.min(950, level.length * .55); z += 150) {
          if (Math.abs(z - level.aim) < 70) continue;
          for (const side of [-1, 1]) for (let pair = 0; pair < (z < 450 ? 3 : z < 750 ? 2 : 1); pair++) c.fillRect(256 + side * (65 + pair * 18) - (side < 0 ? 9 : 0), h - (z + 22) / level.length * h, 9, 22 / level.length * h);
        }
      }
    }
    c.save();c.translate(256,h-(carrier?42:64)/level.length*h);c.scale(1,carrier?1:.28);c.font=`bold ${carrier?140:120}px sans-serif`;c.textAlign="center";c.fillStyle="#eceee3";c.fillText(level.runway,0,0);c.restore();
    // Rubber deposits stretch through the touchdown area.
    if (!grass) for (let j = 0; j < 130; j++) {
      const x = 256 + (j % 2 ? -1 : 1) * (20 + rng() * 35), z = level.aim - 40 + rng() * 330, length = 50 + rng() * 160;
      const y = h - z / level.length * h, pixels = length / level.length * h;
      const fade = c.createLinearGradient(0, y, 0, y - pixels);
      fade.addColorStop(0, "rgba(11,17,18,0)"); fade.addColorStop(.2, "rgba(11,17,18,.16)"); fade.addColorStop(.8, "rgba(11,17,18,.1)"); fade.addColorStop(1, "rgba(11,17,18,0)");
      c.fillStyle = fade; c.fillRect(x, y - pixels, .7 + rng() * 1.7, pixels);
    }
    c.globalAlpha=1;texture.anisotropicFilteringLevel=16;
    texture.update(); return texture;
  }
  function buildRunway() {
    runwayRoot = new B.TransformNode("runway-frame", scene); runwayRoot.parent=world;
    const carrier = level.id === "carrier";
    const shortField = ["forest", "alpine"].includes(level.scenery);
    const tarmac = ownMat(new B.PBRMaterial("runway-surface", scene));tarmac.albedoTexture=runwayTexture();tarmac.roughness=level.wet?.4:.9;tarmac.metallic=level.wet?.12:0;
    const grain=ownTexture(new B.DynamicTexture("pavement-micro-normal",{width:256,height:256},scene,true));
    const grainContext=grain.getContext(),noise=seeded(381),image=grainContext.createImageData(256,256);
    for(let n=0;n<image.data.length;n+=4){image.data[n]=115+noise()*26;image.data[n+1]=115+noise()*26;image.data[n+2]=253;image.data[n+3]=255;}
    grainContext.putImageData(image,0,0);grain.update();grain.wrapU=grain.wrapV=B.Texture.WRAP_ADDRESSMODE;grain.uScale=level.width/3;grain.vScale=level.length/3;grain.level=shortField?.28:level.wet?.18:.38;grain.anisotropicFilteringLevel=8;tarmac.bumpTexture=grain;
    if(level.wet&&level.id!=="storm"){tarmac.clearCoat.isEnabled=true;tarmac.clearCoat.intensity=.5;tarmac.clearCoat.roughness=.22;}
    if(level.id==="storm"){
      // Keep the rain-darkened asphalt free of the clear-sky environment's
      // cloud reflection. Wet braking still comes from the flight model.
      tarmac.environmentIntensity=0;tarmac.metallic=0;tarmac.roughness=.95;
    }
    if(!carrier) {
      const shoulders=surface("runway-shoulders",shortField?["#8e8c70","#96947c","#737963"]:["#6c7371","#7d827c","#8a8d83"],level.length/60);
      ground("graded-runway-shoulders",level.width+9,level.length+8,0,.015,level.length/2,shoulders,runwayRoot);
    }
    ground("runway",level.width,level.length,0,.05,level.length/2,tarmac,runwayRoot);
    const white=material("#fff4ca",{emissive:true}), green=material("#5cffa7",{emissive:true}), red=material("#ff5143",{emissive:true});
    const fixtures=[];
    for(const side of [-1,1])for(let z=0;z<level.length;z+=carrier?13:55){
      const x=side*(level.width/2+(carrier?-1:1.3));
      const light=box("runway-edge-light",carrier?.4:.35,.22,carrier?.5:.35,x,carrier?.22:.38,z,white,runwayRoot);lights.push(light);
      if(!carrier)fixtures.push(box("light-fixture",.16,.22,.16,x,.16,z,material("#75694a",{metalness:.5}),runwayRoot));
    }
    if(fixtures.length){const merged=B.Mesh.MergeMeshes(fixtures,true,true);merged.name="runway-light-fixtures";merged.parent=runwayRoot;merged.isPickable=false;}
    for(let x=-level.width/2+3;x<level.width/2;x+=3.5){box("threshold-green",.7,.2,1,x,.23,2,green,runwayRoot);box("runway-end",.7,.2,1,x,.23,level.length-3,red,runwayRoot);}
    if(!carrier){
      const approachFixtures=[],frameMat=material("#627277",{metalness:.55,roughness:.6});
      for(let z=-30;z>-610;z-=30){
        const xs=z%90===0?[-12,-8,-4,0,4,8,12]:[0];
        for(const x of xs){
          approachFixtures.push(box("approach-lamp-housing",.9,.3,.65,x,.35,z,frameMat,runwayRoot));
          box("approach-lens",.65,.2,.07,x,.39,z-.36,white,runwayRoot);
          const overWater=level.scenery==="coast"&&z< -150;
          approachFixtures.push(box("approach-light-support",.16,overWater?7:.22,.16,x,overWater?-3.25:.13,z,frameMat,runwayRoot));
        }
        if(xs.length>1)approachFixtures.push(box("approach-crossbar-frame",25,.14,.2,0,.22,z,frameMat,runwayRoot));
      }
      const merged=B.Mesh.MergeMeshes(approachFixtures,true,true);merged.name="approach-light-structures";merged.parent=runwayRoot;merged.isPickable=false;
    }
    for(let j=0;j<4;j++){
      const light=box("PAPI",carrier?.8:1.1,carrier?.8:.7,.55,-level.width/2-6-j*(carrier?1.2:2.5),carrier?2:.7,carrier?80:level.aim,red,runwayRoot);papi.push(light);
      box("PAPI-housing",1.5,.6,1.2,light.position.x,light.position.y-.35,light.position.z+.4,material("#d9dad1"),runwayRoot);
    }
    if(carrier) {
      const hullMat=material("#566976",{metalness:.25,roughness:.65});
      const hull=B.MeshBuilder.CreateCylinder("carrier-hull",{height:16,diameterTop:1,diameterBottom:.78,tessellation:12},scene);hull.scaling.set(68,1,350);hull.position.set(10,-8,165);hull.material=hullMat;hull.parent=runwayRoot;
      box("flight-deck-base",80,1.5,342,12,-.9,165,material("#6d7d85"),runwayRoot);
      box("carrier-island",15,20,40,43,10,210,hullMat,runwayRoot);
      box("island-bridge",21,6,26,43,22,208,material("#213e4b",{metalness:.4}),runwayRoot);
      box("island-roof",23,1.5,28,43,26,208,material("#8e9d9d"),runwayRoot);
      box("radar-mast",1.2,18,1.2,43,34,219,hullMat,runwayRoot);
      box("radar-panel",14,4,1,43,42,219,material("#adc0bb"),runwayRoot);
      for(let j=0;j<5;j++)box("deck-safety-stripe",3,.04,13,38,.13,25+j*30,material("#d6c17e"),runwayRoot);
      for(const z of [108,132,156,180])box("arresting-cable",38,.1,.15,0,.16,z,material("#aeb6b5",{metalness:.8}),runwayRoot);
      for(const z of [40,280]){
        const parked=buildAircraft(gfx,"military",{traffic:true});parked.root.parent=runwayRoot;parked.root.position.set(40,2.1,z);parked.root.rotation.y=-Math.PI/2;
        parked.update({gear:true,flaps:0,power:0,hook:false},0);
      }
      const wakeMat=material("#bcd5cf",{alpha:.35,emissive:true});
      for(let j=0;j<18;j++){const wake=ground("ship-wake",50+j*4,11,10,.8,-30-j*20,wakeMat);wake.rotation.y=Math.sin(j)*.04;}
    } else {
      for(const z of [120,level.length-120]){
        box("windsock-mast",.22,8,.22,level.width/2+23,4,z,material("#d3d7d2"));
        const sock=B.MeshBuilder.CreateCylinder("windsock",{height:3,diameterTop:.35,diameterBottom:.8,tessellation:14},scene);sock.material=material("#ef7041");sock.position.set(level.width/2+23,8,z);sock.rotation.x=Math.PI/2;sock.parent=world;windsocks.push(sock);
      }
    }
  }
  function buildGuides(s) {
    const mat=ownMat(new B.StandardMaterial("approach-guide",scene));mat.emissiveColor=B.Color3.FromHexString("#73edd5");mat.disableLighting=true;mat.alpha=.36;
    for(let distance=180;distance<s.distance;distance+=230){
      const ring=B.MeshBuilder.CreateTorus("glide-diamond",{diameter:s.aircraft.span*1.45+12,thickness:.3,tessellation:4},scene);ring.rotation.x=Math.PI/2;ring.rotation.y=Math.PI/4;ring.position.set(0,(distance+level.aim)*Math.tan(3*DEG)+(level.id==="carrier"?12:0)+s.aircraft.clearance,-distance);ring.material=mat;ring.parent=world;ring.isPickable=false;rings.push(ring);
    }
  }
  function buildRain() {
    const rainTex=ownTexture(new B.DynamicTexture("raindrop",{width:8,height:64},scene,false));const c=rainTex.getContext();c.clearRect(0,0,8,64);const gradient=c.createLinearGradient(0,0,0,64);gradient.addColorStop(0,"rgba(210,230,240,0)");gradient.addColorStop(1,"rgba(210,230,240,.7)");c.fillStyle=gradient;c.fillRect(3,0,2,64);rainTex.hasAlpha=true;rainTex.update();
    rain=new B.ParticleSystem("rain",650,scene);rain.particleTexture=rainTex;rain.minEmitBox=V(-50,20,-40);rain.maxEmitBox=V(50,65,70);rain.direction1=V(2,-70,-4);rain.direction2=V(5,-50,-3);rain.minLifeTime=.4;rain.maxLifeTime=1;rain.minSize=.5;rain.maxSize=1.2;rain.minScaleX=.08;rain.maxScaleX=.1;rain.minScaleY=3;rain.maxScaleY=7;rain.emitRate=500;rain.gravity=V(0,-9,0);rain.color1=new B.Color4(.7,.8,.85,.35);rain.color2=new B.Color4(.7,.8,.85,.2);rain.emitter=V(0,150,-1000);rain.start();
  }
  function clear() {
    glow?.dispose();glow=null;
    if(rain){rain.dispose();rain=null;}
    for(const puff of smoke)puff.mesh.dispose();smoke=[];
    world?.dispose(false,false);world=null;
    for(const t of textures)t.dispose();textures=[];
    for(const m of ownedMaterials)m.dispose();ownedMaterials=[];
    aircraft=null;traffic=[];windsocks=[];rings=[];papi=[];water=null;lights=[];clouds=[];
    shadows.getShadowMap().renderList=[];
  }
  function setFlight(s) {
    clear();level=s.level;currentAircraft=s.aircraft;
    world=new B.TransformNode("flight-world",scene);world.metadata={level:level.id};
    const night=level.scenery==="night",storm=level.scenery==="storm";
    scene.fogDensity=1/level.visibility;scene.fogColor=B.Color3.FromHexString(night?"#203c50":storm?"#8e9da5":"#bacacf");scene.clearColor=new B.Color4(scene.fogColor.r,scene.fogColor.g,scene.fogColor.b,1);
    fill.intensity=night?.35:storm?.65:.45;fill.groundColor=B.Color3.FromHexString(night?"#102239":"#455649");sun.intensity=night?.45:storm?.8:2.6;scene.environmentIntensity=night?.12:storm?.45:.95;
    buildSky(night,storm);if(["coast","carrier"].includes(level.scenery))buildWater();if(level.id!=="carrier")buildLand();buildRunway();buildGuides(s);if(storm)buildRain();
    aircraft=buildAircraft(gfx,s.aircraft.id);aircraft.root.parent=world;
    for(const mesh of aircraft.root.getChildMeshes())mesh.layerMask=aircraftLayer;
    traffic=trafficAt(s).map(t=>{const model=buildAircraft(gfx,t.aircraft,{traffic:true});model.root.parent=world;return{...t,model};});
    glow=new B.GlowLayer("runway-light-bloom",scene,{mainTextureRatio:.4,blurKernelSize:32});glow.intensity=night?.7:.25;
    for(const mesh of world.getChildMeshes()){
      const emission=mesh.material?.emissiveColor;
      if(emission&&emission.r+emission.g+emission.b>.1&&!["sun-disc","cloud"].includes(mesh.name))glow.addIncludedOnlyMesh(mesh);
    }
    cameraReady=false;flightSeconds=0;
  }
  function touchdown(s) {
    if(!world)return;
    const mat=material("#c8d2d1",{alpha:.38,roughness:1});
    for(const side of [-1,1]){
      const m=sphere("tire-smoke",[2,1.4,3],s.x+side*currentAircraft.span*.08,s.y+.7,s.z,mat);
      smoke.push({mesh:m,age:0});
    }
  }
  function render(s, dt, { cameraView = "chase", guides = true, paused = false } = {}) {
    if(!world)return;
    if(view!==cameraView){view=cameraView;cameraReady=false;}
    const step=paused?0:Math.min(dt,.05);flightSeconds+=step;
    const deck=deckAt(level,s.time,level.length/2);runwayRoot.position.set(deck.x,deck.height,0);runwayRoot.rotation.x=-deck.pitch*DEG;runwayRoot.rotation.z=deck.roll*DEG;
    // Rotate the carrier around its mid-deck, matching the collision surface.
    if(level.id==="carrier")runwayRoot.position.y=deck.height-Math.sin(deck.pitch*DEG)*(level.length/2);
    const contacts={passenger:[[-3,-3.4,-2.8],[3,-3.4,-2.8],[0,-3.4,12]],cargo:[[-2.4,-3.7,-2.6],[2.4,-3.7,-2.6],[0,-3.7,11]],bush:[[-1.12,-1.65,.7],[1.12,-1.65,.7],[0,-1.11,-3.7]],military:[[-1.65,-2.1,-1.4],[1.65,-2.1,-1.4],[0,-2.1,4.7]]}[currentAircraft.id];
    const rotation=B.Matrix.RotationYawPitchRoll(s.heading*DEG,-s.pitch*DEG,-s.bank*DEG);
    const lift=-Math.min(...contacts.map(point=>B.Vector3.TransformCoordinates(V(...point),rotation).y));
    aircraft.root.position.set(s.x,s.y+lift,s.z);aircraft.root.rotation.set(-s.pitch*DEG,s.heading*DEG,-s.bank*DEG);aircraft.update(s,step);
    // Hide the model from the cockpit camera while retaining its shadow pass.
    camera.layerMask=view==="cockpit"?sceneryLayers:sceneryLayers|aircraftLayer;
    const instrument=flightInstruments(s), scale=currentAircraft.length/36;
    const behind=Math.max(19,58*scale), up=Math.max(3,5.5*scale);
    const heading=s.heading*DEG;
    let desired,target;
    if(view==="cockpit") {
      desired=V(s.x+Math.sin(heading)*currentAircraft.length*.3,s.y+lift+currentAircraft.length*.035,s.z+Math.cos(heading)*currentAircraft.length*.3);
      target=desired.add(V(Math.sin(heading)*400,Math.sin(s.pitch*DEG)*400,Math.cos(heading)*400));camera.fov=.93;
    }else if(view==="tower") {
      desired=V(level.width/2+100,level.id==="carrier"?55:40,Math.max(-150,Math.min(level.length,s.z+220)));
      target=V(s.x,s.y+lift,s.z);camera.fov=.6;
    }else {
      desired=V(s.x+7.5*scale,s.y+lift+up,s.z-behind);
      target=V(s.x*.3,s.y+lift-1,s.z+Math.max(55,90*scale));camera.fov=.72;
    }
    if(!cameraReady||view==="cockpit"){camera.position.copyFrom(desired);cameraReady=true;}else camera.position.copyFrom(B.Vector3.Lerp(camera.position,desired,1-Math.exp(-dt*5)));
    camera.setTarget(target);
    if(view==="cockpit")camera.rotation.z=-s.bank*DEG*.75;
    const lightDirection=sun.direction.normalizeToNew();
    sun.position.copyFrom(aircraft.root.position.subtract(lightDirection.scale(220)));
    sun.shadowMaxZ=260+Math.max(40,s.y+lift)/Math.max(.15,-lightDirection.y);
    if(water){water.material.setFloat("clock",flightSeconds);water.material.setVector3("eye",camera.position);}
    if(rain)rain.emitter=aircraft.root.position.clone();
    for(const child of clouds)child.position.x+=step*child.metadata.drift;
    for(const sock of windsocks){sock.rotation.y=Math.atan2(instrument.wind.cross,-instrument.wind.head);sock.rotation.z=Math.sin(flightSeconds*8)*.06;}
    const whiteCount=instrument.glideError>8?4:instrument.glideError>3?3:instrument.glideError< -8?0:instrument.glideError< -3?1:2;
    papi.forEach((m,j)=>{m.material=material(j<whiteCount?"#fff3d2":"#ff4231",{emissive:true});});
    for(const ring of rings)ring.setEnabled(guides&&ring.position.z>s.z+8);
    trafficAt(s).forEach((t,j)=>{const model=traffic[j]?.model;if(!model)return;model.root.position.set(t.x,t.y+(t.aircraft==="bush"?1.65:3.4),t.z);model.root.rotation.set(-t.pitch*DEG,t.heading*DEG,0);model.update({gear:t.y<50,flaps:1,power:.8,phase:t.y===0?"rollout":"flying",speed:t.id==="departing"?68:0,hook:false},s.phase==="ready"?0:step);});
    for(const puff of smoke){puff.age+=step;puff.mesh.scaling.scaleInPlace(1+step*.9);puff.mesh.position.y+=step;puff.mesh.visibility=Math.max(0,1-puff.age/2);}
    smoke=smoke.filter(p=>{if(p.age>2){p.mesh.dispose();return false;}return true;});
    gfx.render();
  }
  return { setFlight, render, touchdown, resize:gfx.resize, getStats:()=>({meshes:scene.meshes.length,fps:Math.round(gfx.engine.getFps()),ready:scene.isReady(),aircraft:currentAircraft?.id,level:level?.id}),dispose(){clear();gfx.dispose();} };
}
