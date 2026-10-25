import { stageStats } from './rocket-config.js';
import { rocketEngineLayout } from './rocket-mesh.js';

// A small, seamless 3D noise field packed into a 2D atlas works on both WebGL
// versions. Two filtered texture reads replace eight hashes at every ray step.
const VOLUME_NOISE = `
uniform sampler2D volumeNoise;
float noise(vec3 p) {
  p=mod(p,32.0);
  vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  vec2 xy=floor(p.xy)+f.xy+1.5;
  float slice=floor(p.z), nextSlice=mod(slice+1.0,32.0);
  vec2 a=(vec2(mod(slice,8.0),floor(slice/8.0))*34.0+xy)/vec2(272.0,136.0);
  vec2 b=(vec2(mod(nextSlice,8.0),floor(nextSlice/8.0))*34.0+xy)/vec2(272.0,136.0);
  return mix(texture2D(volumeNoise,a).r,texture2D(volumeNoise,b).r,f.z);
}
`;

// Ray-march a bounded volume instead of stacking solid cones. The bounds stay in
// nozzle space, so the plume remains continuous during staging and camera changes.
const PLUME_VERTEX = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 point;
void main() { point=position; gl_Position=worldViewProjection*vec4(position,1.0); }
`;
const PLUME_FRAGMENT = `
precision highp float;
varying vec3 point;
uniform vec3 eye;
uniform float clock, nozzle, power, expansion, seed;
${VOLUME_NOISE}
void main() {
  vec3 direction=normalize(point-eye);
  float a=max(0.00001,dot(direction.xz,direction.xz));
  float b=dot(point.xz,direction.xz);
  float radialExit=(-b+sqrt(max(0.0,b*b-a*(dot(point.xz,point.xz)-1.0))))/a;
  float capExit=direction.y>0.0?(0.5-point.y)/max(0.00001,direction.y):(-0.5-point.y)/min(-0.00001,direction.y);
  float distance=max(0.0,min(radialExit,capExit));
  float stepLength=distance/22.0;
  vec3 light=vec3(0.0);
  float opacity=0.0;
  for(int i=0;i<22;i++) {
    vec3 p=point+direction*(float(i)+0.5)*stepLength;
    float down=clamp(0.5-p.y,0.0,1.0);
    vec3 flow=vec3(p.x*7.0+seed,down*11.0-clock*6.5,p.z*7.0);
    float turbulence=noise(flow)*0.70+noise(flow*2.13+7.9)*0.30;
    float radius=nozzle+(0.83-nozzle)*pow(down,0.72);
    radius*=0.88+0.20*turbulence;
    vec2 curl=vec2(sin(down*18.0-clock*3.2+seed),cos(down*15.0-clock*2.8+seed))*down*down*0.055;
    float radial=length(p.xz+curl)/max(0.02,radius);
    float envelope=(1.0-smoothstep(0.18,1.0,radial))*(1.0-smoothstep(0.68,1.0,down));
    float diamonds=0.78+0.22*pow(0.5+0.5*cos(down*62.0-expansion*13.0),5.0);
    float density=envelope*(0.5+0.8*turbulence)*diamonds;
    float core=exp(-radial*radial*9.0)*(1.0-smoothstep(0.23,0.82,down));
    vec3 amber=mix(vec3(1.0,0.26,0.035),vec3(1.0,0.65,0.23),turbulence);
    vec3 color=mix(amber,vec3(1.0,0.96,0.79),clamp(core*1.7,0.0,1.0));
    color=mix(color,vec3(0.48,0.66,1.0),exp(-down*26.0)*0.65);
    float alpha=1.0-exp(-density*stepLength*5.0);
    light+=(1.0-opacity)*color*alpha*(1.35+core*3.0);
    opacity+=(1.0-opacity)*alpha;
  }
  float strength=smoothstep(0.0,0.12,power);
  gl_FragColor=vec4(light*strength,opacity*strength);
}
`;

const SMOKE_FRAGMENT = `
precision highp float;
varying vec3 point;
uniform vec3 eye, sun;
uniform float clock, seed, opacity, densityScale, heat, darkness;
uniform mat4 localToView;
uniform vec2 screenSize;
uniform sampler2D sceneDepth;
${VOLUME_NOISE}
// Several overlapping lobes give each volume a rolling, cauliflower-shaped
// silhouette. Noise erodes that silhouette in 3D instead of painting a flat card.
// Squared sphere distances match the rounded surface while avoiding eleven
// square roots per sample. Blended gradients also provide a soft lighting normal.
vec4 lobe(vec3 p,vec3 center,float radius){vec3 q=p-center;return vec4(q/radius,(dot(q,q)-radius*radius)/(2.*radius));}
vec4 blendLobes(vec4 a,vec4 b){float k=clamp(.5+.5*(b.w-a.w)/.24,0.,1.);return vec4(mix(b.xyz,a.xyz,k),mix(b.w,a.w,k)-.24*k*(1.-k));}
vec4 shape(vec3 p){
 vec4 a=lobe(p,vec3(0.,-.12,0.),.68);
 a=blendLobes(a,lobe(p,vec3(.32,.13,.11),.54));
 a=blendLobes(a,lobe(p,vec3(-.31,.24,-.12),.53));
 a=blendLobes(a,lobe(p,vec3(.04,.47,-.21),.39));
 a=blendLobes(a,lobe(p,vec3(.37,-.26,-.34),.41));
 a=blendLobes(a,lobe(p,vec3(-.40,-.18,.32),.39));
 return a;
}
void main(){
 bool inside=all(lessThan(abs(eye),vec3(1.0)));
 if(gl_FrontFacing==inside)discard;
 vec3 direction=normalize(point-eye),inverse=1.0/(direction+vec3(.000001));
 vec3 a=(-vec3(1.)-eye)*inverse,b=(vec3(1.)-eye)*inverse;
 vec3 nearPoint=min(a,b),farPoint=max(a,b);
 float nearDistance=max(0.,max(nearPoint.x,max(nearPoint.y,nearPoint.z)));
 float farDistance=min(farPoint.x,min(farPoint.y,farPoint.z));
 // Clip the actual volume ray against opaque geometry, not against its bounding
 // box. This also remains correct when the camera is inside a rolling cloud.
 float sceneZ=texture2D(sceneDepth,gl_FragCoord.xy/screenSize).r;
 float viewZ=(localToView*vec4(direction,0.)).z;
 if(sceneZ>0.0&&viewZ>.00001)farDistance=min(farDistance,sceneZ/viewZ);
 if(farDistance<=nearDistance)discard;
 float stride=max(0.,farDistance-nearDistance)/32.;
 // Offset the sample lattice per pixel. A fixed lattice produces long visible
 // ray bands through turbulent density, especially on a fullscreen launch.
 float jitter=fract(52.9829189*fract(dot(gl_FragCoord.xy+vec2(seed*9.7,seed*3.1),vec2(.06711056,.00583715))));
 vec3 sum=vec3(0.);float alpha=0.;
 for(int i=0;i<32;i++){
  vec3 p=eye+direction*(nearDistance+(float(i)+jitter)*stride);
  vec4 boundary=shape(p);
  if(boundary.w>.28)continue;
  vec3 flow=p*5.2+vec3(seed,clock*.20,-clock*.09);
  float coarse=noise(flow),fine=noise(flow*2.13+4.7);
  float density=(1.-smoothstep(-.16,.12,boundary.w+(coarse*.67+fine*.33-.5)*.30));
  density*=densityScale*(.76+coarse*.32);
  if(density<.003)continue;
  float light=max(0.,dot(boundary.xyz,sun));
  light=clamp(.08+light*.74+coarse*.25,0.,1.);
  vec3 color=mix(vec3(.26,.31,.37),vec3(1.,.96,.87),light)*darkness;
  // Hot steam nearest the deflector catches a warm glow from the engine.
  float glow=heat*exp(-dot(p.xz,p.xz)*1.8)*(.38+.62*max(0.,-p.y));
  color+=vec3(1.,.40,.075)*glow*.70;
  float sampleAlpha=1.-exp(-density*stride*12.);
  sum+=(1.-alpha)*color*sampleAlpha;alpha+=(1.-alpha)*sampleAlpha;
  if(alpha>.98)break;
 }
 if(alpha<.003)discard;
 gl_FragColor=vec4(sum/max(alpha,.001),alpha*opacity);
}
`;

function createVolumeNoise(B,scene){
 const field=new Uint8Array(32*32*32),pixels=new Uint8Array(272*136*4);let seed=718932;
 for(let i=0;i<field.length;i++){seed=(seed*1664525+1013904223)>>>0;field[i]=seed>>>24;}
 for(let z=0;z<32;z++)for(let y=0;y<34;y++)for(let x=0;x<34;x++){
  const sample=field[z*1024+((y+31)%32)*32+(x+31)%32];
  const i=((Math.floor(z/8)*34+y)*272+(z%8)*34+x)*4;
  pixels[i]=pixels[i+1]=pixels[i+2]=sample;pixels[i+3]=255;
 }
 const texture=B.RawTexture.CreateRGBATexture(pixels,272,136,scene,false,false,B.Texture.BILINEAR_SAMPLINGMODE);
 texture.name='rocket-volume-noise';texture.wrapU=texture.wrapV=B.Texture.CLAMP_ADDRESSMODE;return texture;
}
const smooth=(a,b,t)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};

/** Plumes stay in nozzle space. Every steam volume stores launch-site coordinates
 * and follows the floating origin afresh, including after time warp or a pause. */
export function createRocketExhaust(w,{relative,ground}){
 const {B,scene,camera}=w,noiseTexture=createVolumeNoise(B,scene),root=new B.TransformNode('rocket-engine-exhaust',scene);
 root.parent=relative;
 const depth=scene.enableDepthRenderer(camera,false,true,B.Texture.NEAREST_SAMPLINGMODE,true),depthMap=depth.getDepthMap();depth.enabled=false;
 for(let group=0;group<4;group++)depthMap.setRenderingAutoClearDepthStencil(group,false,false,false);
 const engines=Array.from({length:4},(_,i)=>{
  const mesh=B.MeshBuilder.CreateCylinder('engine-plume-volume-'+i,{height:1,diameter:2,tessellation:32},scene);
  const material=new B.ShaderMaterial('engine-plume-light-'+i,scene,{vertexSource:PLUME_VERTEX,fragmentSource:PLUME_FRAGMENT},{attributes:['position'],uniforms:['worldViewProjection','eye','clock','nozzle','power','expansion','seed'],samplers:['volumeNoise'],needAlphaBlending:true});
  material.alphaMode=B.Engine.ALPHA_ADD;material.disableDepthWrite=true;material.backFaceCulling=true;
  material.setFloat('seed',i*9.73);material.setTexture('volumeNoise',noiseTexture);
  mesh.parent=root;mesh.material=material;mesh.isPickable=false;mesh.renderingGroupId=2;mesh.setEnabled(false);
  return{mesh,material,inverse:B.Matrix.Identity(),eye:new B.Vector3()};
 });
 const smokeRoot=new B.TransformNode('launch-steam-volumes',scene);
 // A bounded pool keeps the draw count and memory fixed even for long pad burns.
 const clouds=Array.from({length:20},(_,i)=>{
  const mesh=B.MeshBuilder.CreateBox('billowing-pad-steam-'+i,{size:2},scene);
  const material=new B.ShaderMaterial('pad-steam-scattering-'+i,scene,{vertexSource:PLUME_VERTEX,fragmentSource:SMOKE_FRAGMENT},{attributes:['position'],uniforms:['worldViewProjection','eye','sun','clock','seed','opacity','densityScale','heat','darkness','localToView','screenSize'],samplers:['volumeNoise','sceneDepth'],needAlphaBlending:true});
  material.alphaMode=B.Engine.ALPHA_COMBINE;material.disableDepthWrite=true;material.depthFunction=B.Engine.ALWAYS;material.backFaceCulling=false;material.setTexture('volumeNoise',noiseTexture);material.setTexture('sceneDepth',depthMap);
  mesh.parent=smokeRoot;mesh.material=material;mesh.isPickable=false;mesh.renderingGroupId=2;mesh.layerMask=0x10000000;mesh.setEnabled(false);
  return{mesh,material,inverse:B.Matrix.Identity(),view:B.Matrix.Identity(),eye:new B.Vector3(),sun:new B.Vector3(),birth:-100,life:0,x:0,z:0,vx:0,vz:0,size:1,grow:1,rise:1,angle:0,seed:i*2.17,density:1,core:false};
 });
 // Smoke is naturally soft, so ray-march it at half resolution and composite the
 // result. Vehicle/terrain geometry and the depth used for occlusion stay sharp.
 const smokeResolution=()=>{const width=w.engine.getRenderWidth(),height=w.engine.getRenderHeight(),scale=Math.min(.5,320/Math.max(width,height));return{width:Math.max(2,Math.round(width*scale)),height:Math.max(2,Math.round(height*scale))};};
 // A fullscreen or Retina display must not multiply the cost of soft steam.
 // Only this layer is capped; the vehicle and scenery retain native detail.
 const smokeTarget=new B.RenderTargetTexture('launch-steam-half-resolution',smokeResolution(),scene,false,true,B.Engine.TEXTURETYPE_UNSIGNED_BYTE,false,B.Texture.BILINEAR_SAMPLINGMODE,false,false);
 smokeTarget.renderList=clouds.map(c=>c.mesh);smokeTarget.activeCamera=camera;smokeTarget.forceLayerMaskCheck=false;
 smokeTarget.clearColor=new B.Color4(0,0,0,0);smokeTarget.gammaSpace=true;smokeTarget.renderParticles=false;smokeTarget.renderSprites=false;
 for(let group=0;group<4;group++)smokeTarget.setRenderingAutoClearDepthStencil(group,false,false,false);
 const smokeLayer=new B.Layer('launch-steam-composite',null,scene,false);
 smokeLayer.texture=smokeTarget;smokeLayer.alphaBlendingMode=B.Engine.ALPHA_PREMULTIPLIED_PORTERDUFF;smokeLayer.applyPostProcess=false;smokeLayer.isEnabled=false;
 let smokeRendering=false,depthMeshCount=-1;
 function setSmokeRendering(active){
  smokeLayer.isEnabled=active;if(active===smokeRendering)return;smokeRendering=active;
  const targets=camera.customRenderTargets,index=targets.indexOf(smokeTarget);
  if(active&&index<0)targets.push(smokeTarget);else if(!active&&index>=0)targets.splice(index,1);
 }
 const light=new B.PointLight('engine-plume-illumination',B.Vector3.Zero(),scene);
 light.diffuse=new B.Color3(1,.61,.27);light.specular=new B.Color3(1,.72,.46);light.range=100;light.intensity=0;
 let lightMeshCount=-1;
 const nozzleWorld=new B.Vector3(),axis=new B.Vector3(),localNozzle=new B.Vector3(),sunDirection=w.sun.direction.negate().normalize(),screenSize=new B.Vector2();
 let enabled=true,disposed=false,lastState=null,lastClock=0,spawn=0,cursor=0,randomSeed=39812,visualPower=0;
 const random=()=>{randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;};
 function reset(){
  spawn=0;cursor=0;lastState=null;lastClock=0;randomSeed=39812;visualPower=0;depthMeshCount=-1;root.setEnabled(false);light.intensity=0;depth.enabled=false;setSmokeRendering(false);
  clouds.forEach(c=>{c.life=0;c.mesh.setEnabled(false);});
 }
 function update({state:s,time=0,view='follow'}){
  if(disposed||!s)return;
  const total=Math.max(3,s.countdownTotal||3),clock=s.phase==='countdown'?-Math.max(0,s.countdown):s.phase==='ready'?-total:(Number.isFinite(s.time)?s.time:time);
  if(lastState!==s||clock<lastClock-.001){reset();lastState=s;lastClock=clock;}
  const dt=Math.min(.5,Math.max(0,clock-lastClock));lastClock=clock;
  const stage=s.design.stages[s.activeStage],stats=stage?stageStats(stage):null;
  const fueled=!!stage&&!s.capsule&&(s.fuels?.[s.activeStage]??1)>0;
  const countdown=fueled&&s.phase==='countdown',burning=fueled&&s.phase==='flying'&&s.throttle>.005;
  const command=Math.max(0,Math.min(1,s.command||0));
  const ignition=countdown?command*smooth(Math.min(3,total*.7),.15,s.countdown):0;
  const requestedPower=burning?s.throttle:ignition;
  visualPower+=(requestedPower-visualPower)*(1-Math.exp(-dt*9));
  if(!fueled||!['countdown','flying'].includes(s.phase))visualPower=0;
  const power=visualPower,active=power>.005,visible=enabled&&view!=='cockpit'&&view!=='orbit';
  const expansion=1-Math.exp(-Math.max(0,s.altitude)/18000);
  root.setEnabled(visible&&active);root.position.y=-s.height/2+.015;
  relative.computeWorldMatrix(true);
  B.Vector3.TransformNormalToRef(B.Axis.Y,relative.getWorldMatrix(),axis);axis.normalize();localNozzle.set(0,-s.height/2,0);
  B.Vector3.TransformCoordinatesToRef(localNozzle,relative.getWorldMatrix(),nozzleWorld);
  light.position.copyFrom(nozzleWorld).subtractInPlace(axis.scale(2));
  light.intensity=visible?power*(s.mission?.night?23:14):0;light.range=stats?Math.max(55,stats.diameter*23):60;
  // A thin-instanced forest is one enormous mesh. Its distant trees must not
  // all evaluate a local engine light just because its bounds touch the pad.
  if(lightMeshCount!==scene.meshes.length){lightMeshCount=scene.meshes.length;light.excludedMeshes=scene.meshes.filter(m=>/^broadleaf-canopy|^bark-and-branches|^tree-ground-shadows/.test(m.name));}
  const layout=stage?rocketEngineLayout(stage,stats):[];
  for(let i=0;i<engines.length;i++){
   const e=engines[i],nozzle=layout[i];e.mesh.setEnabled(active&&!!nozzle);if(!active||!nozzle)continue;
   const {x,z,diameter}=nozzle,radius=diameter*(1.06+expansion*1.65),length=diameter*(12+expansion*6.5)*(.22+.78*Math.sqrt(power));
   e.mesh.position.set(x,-length/2,z);e.mesh.scaling.set(radius,length,radius);e.mesh.computeWorldMatrix(true).invertToRef(e.inverse);
   B.Vector3.TransformCoordinatesToRef(camera.position,e.inverse,e.eye);
   e.material.setVector3('eye',e.eye);e.material.setFloat('clock',clock);e.material.setFloat('nozzle',diameter*.49/radius);e.material.setFloat('power',power);e.material.setFloat('expansion',expansion);
  }
  const elapsed=countdown?total-s.countdown:total+s.time;
  const preflow=countdown?command*smooth(0,1.1,elapsed)*.30:0;
  const padDistance=Math.hypot(s.body.position.x,s.body.position.z);
  const nearPad=fueled&&(countdown||burning)&&s.altitude<190&&padDistance<2500;
  const reach=1-smooth(65,190,s.altitude),flow=nearPad?Math.max(preflow,power)*reach:0;
  if(flow>.01&&dt>0&&enabled){
   spawn+=dt*(2.0+Math.sqrt(Math.max(.001,flow))*3.0)*(countdown&&ignition<.02?.6:1);
   const originX=nozzleWorld.x-ground.position.x,originZ=nozzleWorld.z-ground.position.z;
   while(spawn>=1){
    spawn--;const c=clouds[cursor++%clouds.length],side=random()<.56?-1:1,waterOnly=countdown&&ignition<.08;
    c.core=!waterOnly&&cursor%3===0;
    c.birth=clock;c.life=27+random()*15;c.x=originX+(random()-.5)*9;c.z=originZ+side*(8+random()*8);
    c.vx=(random()-.5)*(waterOnly?6:17);c.vz=side*(waterOnly?6+random()*4:12+random()*13);
    c.size=(6.5+stats.diameter*1.1+stage.engines*.55+random()*3)*(waterOnly?.59:1);
    c.grow=(waterOnly?1.25:2.0)+random()*1.1;c.rise=(waterOnly?.35:.7)+random()*.65;
    // Fresh steam boils around the launch mount before joining the faster
    // sideways trench flow, keeping a dense cloud at the source during release.
    if(c.core){c.z=originZ+(random()-.5)*9;c.vx=(random()-.5)*5;c.vz=(random()-.5)*5;c.size*=.86;c.grow*=.8;c.rise*=.65;}
    c.angle=random()*Math.PI*2;c.seed=random()*29;c.density=waterOnly?.48:.86+random()*.30;
   }
  }else if(flow<=.01||!enabled)spawn=0;
  const night=!!s.mission?.night;sunDirection.copyFrom(w.sun.direction).negateInPlace().normalize();depth.enabled=false;
  const {width:sw,height:sh}=smokeResolution(),smokeSize=smokeTarget.getSize();
  if(smokeSize.width!==sw||smokeSize.height!==sh)smokeTarget.resize({width:sw,height:sh});screenSize.set(sw,sh);
  for(const c of clouds){
   const age=clock-c.birth,alive=c.life>0&&age>=0&&age<c.life;
   const fade=smooth(0,.50,age)*(1-smooth(c.life*.60,c.life,age));
   c.mesh.setEnabled(visible&&alive&&fade>.02&&s.altitude<22000);if(!alive)continue;if(c.mesh.isEnabled())depth.enabled=true;
   const drift=(1-Math.exp(-age*.16))/.16,size=c.size+c.grow*age;
   const rise=c.rise*age,sy=size*(.68+.06*Math.sin(age*.2+c.seed));
   c.mesh.position.set(ground.position.x+c.x+c.vx*drift,ground.position.y+sy*.80+1+rise,ground.position.z+c.z+c.vz*drift);
   c.mesh.scaling.set(size,sy,size*(1.1+.10*Math.sin(age*.18+c.seed)));
   c.mesh.rotation.y=c.angle+Math.sin(age*.15+c.seed)*.11;
   c.mesh.computeWorldMatrix(true).invertToRef(c.inverse);
   c.mesh.getWorldMatrix().multiplyToRef(camera.getViewMatrix(),c.view);
   B.Vector3.TransformCoordinatesToRef(camera.position,c.inverse,c.eye);B.Vector3.TransformNormalToRef(sunDirection,c.inverse,c.sun);c.sun.normalize();
   const warm=power*Math.exp(-age*.17)*Math.exp(-Math.hypot(c.x+c.vx*drift,c.z+c.vz*drift)/70)*(c.core?1.4:1);
   c.material.setVector3('eye',c.eye);c.material.setVector3('sun',c.sun);c.material.setFloat('clock',age);c.material.setFloat('seed',c.seed);
   c.material.setFloat('opacity',fade);c.material.setFloat('densityScale',c.density);c.material.setFloat('heat',warm);c.material.setFloat('darkness',night?.32:1);
   c.material.setMatrix('localToView',c.view);c.material.setVector2('screenSize',screenSize);
  }
  // The distant forest lies beyond the launch steam. Do not redraw thousands of
  // instanced trees just to establish the depth of the pad, tower, and vehicle.
  if(depth.enabled&&depthMeshCount!==scene.meshes.length){depthMeshCount=scene.meshes.length;depthMap.renderList=scene.meshes.filter(m=>!/^broadleaf-canopy|^bark-and-branches|^tree-ground-shadows/.test(m.name));}
  setSmokeRendering(depth.enabled);
 }
 return{update,reset,setEnabled(value){enabled=!!value;if(!enabled){root.setEnabled(false);light.intensity=0;depth.enabled=false;setSmokeRendering(false);clouds.forEach(c=>c.mesh.setEnabled(false));}},dispose(){if(disposed)return;disposed=true;setSmokeRendering(false);smokeLayer.texture=null;smokeLayer.dispose();smokeTarget.dispose();root.dispose();smokeRoot.dispose();engines.forEach(e=>e.material.dispose());clouds.forEach(c=>c.material.dispose());noiseTexture.dispose();light.dispose();scene.disableDepthRenderer(camera);}};
}
