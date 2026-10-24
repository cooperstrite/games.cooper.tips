// Rocket Boost's water uses launch-site coordinates, so waves stay in place
// when the camera and rocket move through the floating-origin scene.
export const ROCKET_SHORELINE = Object.freeze({center:410,bendAmplitude:90,bendScale:.0016,rippleAmplitude:35,rippleScale:.0041});
export function rocketShoreX(z){return 410+90*Math.sin(z*.0016)+35*Math.sin(z*.0041+1);}
export const ROCKET_LAGOONS=Object.freeze([[-1450,930,230,690],[-2500,-1430,380,850],[-840,2450,180,520],[-4700,4300,600,1600]].map(lagoon=>Object.freeze(lagoon)));
export function rocketWetlandDistance(x,z){
  let distance=10;
  for(const [cx,cz,rx,rz] of ROCKET_LAGOONS){const px=(x-cx)/rx,pz=(z-cz)/rz,a=Math.atan2(pz,px);distance=Math.min(distance,Math.hypot(px,pz)+Math.sin(a*5+.7)*.08+Math.cos(a*3)*.09);}
  return distance;
}
const lagoonShader=ROCKET_LAGOONS.map(lagoon=>`  d=min(d,lagoonDistance(p,vec4(${lagoon.map(n=>n.toFixed(1)).join(',')})));`).join('\n');

const WATER_COMMON = `
precision highp float;
uniform float clock;
uniform float swell;
uniform float coastal;
uniform vec2 patternOrigin;
float coastX(float z){return 410.0+90.0*sin(z*.0016)+35.0*sin(z*.0041+1.0);}
float hash(vec2 p){p=mod(p,256.0);return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 c=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(c),hash(c+vec2(1.,0.)),f.x),mix(hash(c+vec2(0.,1.)),hash(c+vec2(1.)),f.x),f.y);}
vec3 waves(vec2 p){
  float a=dot(p,vec2(1.,.5))*.0981747704-clock*.5235987756+noise(p/32.)*1.4;
  float b=dot(p,vec2(-.5,1.))*.1963495408-clock*.7853981634+noise(p/8.+vec2(17.,11.))*.85;
  float c=dot(p,vec2(1.,-1.))*.3926990817-clock*1.0471975512+noise(p/8.-vec2(5.,13.))*1.1;
  return vec3(sin(a)*.40+sin(b)*.16+sin(c)*.055,
    cos(a)*.0392699082-cos(b)*.0157079633+cos(c)*.0215984495,
    cos(a)*.0196349541+cos(b)*.0314159265-cos(c)*.0215984495)*swell;
}
`;

export const ROCKET_OCEAN_VERTEX = `${WATER_COMMON}
attribute vec3 position;
uniform mat4 world;
uniform mat4 worldViewProjection;
uniform vec3 eye;
varying vec3 vPosition;
varying vec2 vSurface;
varying vec3 vUp;
varying vec3 vEast;
varying vec3 vNorth;
void main(){
  vec3 point=position;
  vec2 p=point.xz+patternOrigin;
  float shore=point.x-coastX(point.z);
  float shoreAttenuation=mix(1.,smoothstep(0.,36.,shore),coastal);
  vec3 initialWorld=(world*vec4(point,1.)).xyz;
  float nearWaves=1.-smoothstep(4000.,14000.,length(initialWorld-eye));
  point.y+=waves(p).x*shoreAttenuation*nearWaves;
  vPosition=(world*vec4(point,1.)).xyz;
  vSurface=position.xz;
  vUp=normalize((world*vec4(0.,1.,0.,0.)).xyz);
  vEast=normalize((world*vec4(1.,0.,0.,0.)).xyz);
  vNorth=normalize((world*vec4(0.,0.,1.,0.)).xyz);
  gl_Position=worldViewProjection*vec4(point,1.);
}`;

export const ROCKET_OCEAN_FRAGMENT = `${WATER_COMMON}
uniform vec3 eye;
uniform float darkness;
uniform float opacity;
varying vec3 vPosition;
varying vec2 vSurface;
varying vec3 vUp;
varying vec3 vEast;
varying vec3 vNorth;
float ripple(vec2 p){return noise(p/8.+vec2(clock*.04,-clock*.025))*.13+noise(p/2.-vec2(clock*.065,clock*.04))*.035;}
float lagoonDistance(vec2 p,vec4 lagoon){vec2 q=(p-lagoon.xy)/lagoon.zw;float a=atan(q.y,q.x);return length(q)+sin(a*5.+.7)*.08+cos(a*3.)*.09;}
float wetlandDistance(vec2 p){float d=10.;
${lagoonShader}
  return d;
}
void main(){
  float shore=vSurface.x-coastX(vSurface.y);
  // Dry land and sea never compete for the same distant depth-buffer values.
  // The wetland holes use exactly the terrain's distorted lagoon outlines.
  if(coastal>.5&&shore<0.&&wetlandDistance(vSurface)>1.05)discard;
  float edgeOpacity=1.-smoothstep(35000.,70000.,length(vSurface-vec2(600.,0.)));
  if(edgeOpacity*opacity<.001)discard;
  vec2 p=vSurface+patternOrigin;
  float distanceToEye=length(eye-vPosition);
  float fine=1.-smoothstep(200.,1800.,distanceToEye);
  float detail=1.-smoothstep(2200.,15000.,distanceToEye);
  float shoreAttenuation=mix(1.,smoothstep(0.,36.,shore),coastal);
  vec3 wave=waves(p);
  float dx=(ripple(p+vec2(.5,0.))-ripple(p-vec2(.5,0.)))*fine;
  float dz=(ripple(p+vec2(0.,.5))-ripple(p-vec2(0.,.5)))*fine;
  vec3 normal=normalize(vUp-vEast*(wave.y*detail+dx)*shoreAttenuation-vNorth*(wave.z*detail+dz)*shoreAttenuation);
  vec3 view=normalize(eye-vPosition);
  float fresnel=.035+.73*pow(1.-max(0.,dot(normal,view)),4.);
  vec3 reflection=reflect(-view,normal);
  float reflectedAltitude=clamp(dot(reflection,vUp),0.,1.);
  vec3 sky=mix(vec3(.58,.70,.73),vec3(.11,.30,.48),sqrt(reflectedAltitude));
  float shallows=(1.-smoothstep(25.,430.,shore))*coastal;
  float shoalTexture=.86+.14*noise(p/32.);
  vec3 deep=vec3(.018,.105,.161);
  vec3 shallow=vec3(.035,.255,.245)*shoalTexture;
  vec3 water=mix(deep,shallow,shallows);
  water=mix(water,sky,fresnel);
  vec3 light=normalize(vec3(.5,.7,-.45));
  vec3 halfVector=normalize(view+light);
  float glint=pow(max(0.,dot(normal,halfVector)),150.)*1.15*detail;
  float sunPath=pow(max(0.,dot(normal,halfVector)),12.)*.09;
  water+=vec3(1.,.80,.56)*(glint+sunPath);

  // Breakers follow the same curved shoreline as the sandy beach mesh.
  float broken=noise(p/8.+vec2(-clock*.075,clock*.025));
  float wash=sin(shore*.22-clock*1.0471975512+noise(p/32.)*2.2);
  float surfBand=(1.-smoothstep(34.,86.,shore))*smoothstep(-3.,7.,shore)*coastal;
  float breaker=smoothstep(.50,.91,wash)*smoothstep(.20,.65,broken)*surfBand;
  float beachWash=(1.-smoothstep(2.,15.,abs(shore-5.-sin(clock*.5235987756+vSurface.y*.025)*3.)))*coastal;
  float foam=breaker*.85+beachWash*(.20+broken*.35);
  // Broken white caps sit on the traveling wave crests, never on a static grid.
  float crest=smoothstep(.37,.50,wave.x/max(.2,swell));
  float foamGrain=mix(.62,smoothstep(.22,.72,noise(p/2.-clock*.035)),fine);
  float caps=crest*smoothstep(.47,.72,noise(p/8.-clock*.02))*detail*foamGrain;
  caps*=mix(.48,.95,clamp((swell-.8)/1.2,0.,1.));
  foam=max(foam*(.72+.28*foamGrain),caps*shoreAttenuation);
  foam*=1.-smoothstep(4000.,18000.,distanceToEye);
  water=mix(water,vec3(.83,.89,.86),clamp(foam,0.,.92));
  water=mix(water,vec3(.33,.48,.56),smoothstep(6500.,45000.,distanceToEye)*.72);
  water*=darkness;
  gl_FragColor=vec4(water,opacity*edgeOpacity);
}`;

function oceanGrid(B,scene){
  const mesh=new B.Mesh('Atlantic-wave-surface',scene),positions=[],indices=[];
  const count=192,radius=75000,scale=250,stretch=Math.log(1+radius/scale);
  const spread=t=>Math.sign(t)*scale*(Math.exp(Math.abs(t)*stretch)-1);
  for(let z=0;z<=count;z++)for(let x=0;x<=count;x++)positions.push(spread(x/count*2-1)+600,0,spread(z/count*2-1));
  for(let z=0;z<count;z++)for(let x=0;x<count;x++){const a=z*(count+1)+x,b=a+1,c=a+count+1,d=c+1;indices.push(a,c,b,b,c,d);}
  const data=new B.VertexData();data.positions=positions;data.indices=indices;data.applyToMesh(mesh);mesh.isPickable=false;mesh.receiveShadows=false;
  return mesh;
}

/** One active surface at a time avoids intersecting launch and recovery water. */
export function createRocketOcean(w,{ground}={}){
  const {B,scene}=w,V=(x,y,z)=>new B.Vector3(x,y,z);
  const makeMaterial=name=>new B.ShaderMaterial(name,scene,{vertexSource:ROCKET_OCEAN_VERTEX,fragmentSource:ROCKET_OCEAN_FRAGMENT},{attributes:['position'],uniforms:['world','worldViewProjection','clock','swell','coastal','patternOrigin','eye','darkness','opacity'],needAlphaBlending:true});
  const material=makeMaterial('Atlantic-water-and-whitecaps'),recoveryMaterial=makeMaterial('recovery-water-and-whitecaps');
  material.backFaceCulling=false;recoveryMaterial.backFaceCulling=false;
  material.forceDepthWrite=true;recoveryMaterial.forceDepthWrite=true;
  const ocean=oceanGrid(B,scene);ocean.parent=ground||null;ocean.position.y=-3;ocean.material=material;ocean.renderingGroupId=0;
  const recovery=ocean.clone('open-ocean-recovery',null);recovery.parent=null;recovery.material=recoveryMaterial;recovery.setEnabled(false);
  let enabled=true,disposed=false;
  for(const [m,coastal] of [[material,1],[recoveryMaterial,0]]){m.setFloat('coastal',coastal);m.setFloat('clock',0);m.setFloat('swell',1);m.setFloat('darkness',1);m.setFloat('opacity',1);m.setVector2('patternOrigin',new B.Vector2(0,0));m.setVector3('eye',V(0,0,0));}
  function update({state,time=0,view='follow',up,eye}){
    if(disposed||!state){ocean.setEnabled(false);recovery.setEnabled(false);return;}
    const h=state.altitude,downrange=Math.hypot(state.body.position.x,state.body.position.z);
    const visible=enabled&&view!=='orbit'&&h<55000;
    const distant=downrange>18000;
    ocean.setEnabled(visible&&!distant);recovery.setEnabled(visible&&distant);
    const normal=up||V(state.body.position.x,state.body.position.y,state.body.position.z).normalize();
    // The sea sits 7.3 m below the collision sphere, matching the launch coast.
    recovery.position.copyFrom(normal.scale(-h-state.height/2-7.3));
    recovery.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,normal,new B.Quaternion());
    const radius=state.body.position.length?.()||Math.hypot(state.body.position.x,state.body.position.y,state.body.position.z);
    const worldX=6371000*Math.atan2(state.body.position.x,state.body.position.y);
    const worldZ=6371000*Math.asin(Math.max(-1,Math.min(1,state.body.position.z/radius)));
    // All spatial frequencies repeat on this period: wrapping prevents float
    // precision shimmer on ocean recoveries thousands of kilometres away.
    recoveryMaterial.setVector2('patternOrigin',new B.Vector2(((worldX%8192)+8192)%8192,((worldZ%8192)+8192)%8192));
    const swell=.9+Math.min(1.2,(state.mission?.wind||0)/25);
    const transition=Math.max(0,Math.min(1,(h-22000)/33000)),opacity=1-transition*transition*(3-2*transition);
    for(const m of [material,recoveryMaterial]){m.setFloat('clock',time);m.setFloat('swell',swell);m.setFloat('darkness',state.mission?.night ? .32 : 1);m.setFloat('opacity',opacity);m.setVector3('eye',eye||w.camera.position);}
  }
  return{update,setEnabled(value){enabled=!!value;if(!enabled){ocean.setEnabled(false);recovery.setEnabled(false);}},meshes:{ocean,recovery},dispose(){if(disposed)return;disposed=true;ocean.dispose();recovery.dispose();material.dispose();recoveryMaterial.dispose();}};
}
