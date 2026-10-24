// The planet lives in its own render pass. Metre-sized rocket parts never share
// a depth buffer with an Earth-sized sphere, including at the horizon.
const VERTEX = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 ray;
void main(){ray=position;gl_Position=worldViewProjection*vec4(position,1.);}
`;
const FRAGMENT = `
precision highp float;
varying vec3 ray;
uniform vec3 observer;
uniform vec3 sunDirection;
uniform float altitude;
uniform float night;
uniform float clock;
uniform float studio;
uniform sampler2D earthMap;
const float PI=3.14159265359;
float hash(vec3 p){p=fract(p*.3183099+vec3(.17,.31,.57));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float f=0.,a=.5;for(int i=0;i<5;i++){f+=noise(p)*a;p=p*2.03+vec3(4.7,9.2,1.3);a*=.5;}return f;}
vec2 sphere(vec3 ro,vec3 rd,float radius){float b=dot(ro,rd),c=dot(ro,ro)-radius*radius,d=b*b-c;if(d<0.)return vec2(-1.);float q=sqrt(d);return vec2(-b-q,-b+q);}
vec3 localSky(vec3 d,vec3 up){
 float elevation=dot(d,up),sun=dot(d,sunDirection),day=1.-night*.87;
 vec3 zenith=vec3(.028,.13,.28),horizon=vec3(.61,.70,.73);
 vec3 col=mix(horizon,zenith,pow(clamp(elevation,0.,1.),.42));
 float warmth=pow(max(0.,sun),10.)*pow(1.-abs(elevation),3.);
 col+=vec3(.35,.17,.015)*warmth;
 float disk=smoothstep(.99975,.99994,sun);
 col+=vec3(1.,.73,.35)*(pow(max(0.,sun),100.)*.38+disk*4.);
 // A distant, layered cumulus deck drifts slowly over the Atlantic.
 if(elevation>.012){
  vec3 p=d/(elevation+.12)*3.2+vec3(clock*.003,0.,clock*.001);
  float cloud=fbm(p+vec3(17.,3.,8.));
  float bank=smoothstep(.49,.69,cloud)*(1.-smoothstep(.42,.86,elevation));
  float shade=fbm(p+sunDirection*.34+vec3(17.,3.,8.));
  vec3 cloudColor=mix(vec3(.42,.51,.58),vec3(1.,.93,.80),clamp(shade*1.7-.25,0.,1.));
  col=mix(col,cloudColor,bank*.88);
 }
 return col*day+vec3(.006,.012,.027)*night;
}
void main(){
 vec3 d=normalize(ray),up=normalize(observer),ro=observer;
 if(studio>.5){float t=clamp(d.y*.65+.5,0.,1.);gl_FragColor=vec4(mix(vec3(.14,.23,.27),vec3(.025,.06,.09),t),1.);return;}
 float space=smoothstep(16000.,105000.,altitude);
 vec3 sky=localSky(d,up),col=mix(sky,vec3(.002,.005,.014),space);
 float star=pow(max(0.,noise(d*1600.)-.78)/.22,9.);
 col+=vec3(.72,.83,1.)*star*max(space,night*.8)*.9;
 vec2 hit=sphere(ro,d,1.);
 if(hit.x>0.){
  vec3 n=normalize(ro+d*hit.x);
  // Match the launch latitude to a subtropical coast on the Blue Marble map.
  float a=1.073;vec3 q=vec3(n.x,cos(a)*n.y-sin(a)*n.z,sin(a)*n.y+cos(a)*n.z);
  vec2 uv=vec2(.526-atan(q.z,q.x)/(2.*PI),.5+asin(clamp(q.y,-1.,1.))/PI);
  vec3 surface=texture2D(earthMap,uv).rgb;
  float lit=max(0.,dot(n,sunDirection));
  surface*=.28+lit*.85;
  vec3 drift=vec3(clock*.0004,0.,0.);
  float weather=fbm(n*8.+drift),detail=fbm(n*170.+drift);
  float coverage=smoothstep(.49,.68,weather*.68+detail*.32);
  surface=mix(surface,vec3(.80,.86,.91)*(.45+lit*.65),coverage*.86);
  float grazing=1.-max(0.,dot(n,-d));
  surface=mix(surface,vec3(.24,.49,.68),pow(grazing,4.)*.72);
  // Atmospheric haze conceals the regional-to-planetary scenery transition.
  float aerial=1.-exp(-hit.x*6371000./(19000.+altitude*.65));
  float localBlend=(1.-smoothstep(24000.,85000.,altitude))*aerial;
  surface=mix(surface,sky,localBlend*.93);
  col=surface*(1.-night*.72);
 }else{
  vec2 air=sphere(ro,d,1.006);
  if(air.y>0.){
   float path=max(0.,air.y-max(air.x,0.));
   float rim=(1.-exp(-path*4.))*space;
   col=mix(col,vec3(.15,.38,.65)*(1.-night*.55),rim*.78);
  }
 }
 gl_FragColor=vec4(col,1.);
}
`;

// A clean sky/ground radiance map gives brushed metal broad, natural highlights
// instead of reflecting a stretched landscape photograph over every panel.
export function createRocketEnvironment(B,scene){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
 const c=canvas.getContext('2d'),gradient=c.createLinearGradient(0,0,0,256);
 gradient.addColorStop(0,'#18334e');gradient.addColorStop(.35,'#7593a8');gradient.addColorStop(.49,'#cfcebb');gradient.addColorStop(.53,'#777b69');gradient.addColorStop(1,'#292f29');
 c.fillStyle=gradient;c.fillRect(0,0,512,256);
 const light=c.createRadialGradient(315,93,0,315,93,75);light.addColorStop(0,'rgba(255,240,203,1)');light.addColorStop(.12,'rgba(255,228,174,.82)');light.addColorStop(1,'rgba(255,218,161,0)');c.fillStyle=light;c.fillRect(225,0,180,185);
 return new B.EquiRectangularCubeTexture(canvas.toDataURL(),scene,128,false,true);
}

export function createRocketBackdrop(w,{studio=false}={}){
 const {B,engine,camera}=w,scene=new B.Scene(engine);
 scene.clearColor=new B.Color4(.01,.025,.05,1);
 const eye=new B.FreeCamera('planet-background-camera',B.Vector3.Zero(),scene);
 eye.minZ=.1;eye.maxZ=2000;
 const material=new B.ShaderMaterial('planet-and-atmosphere',scene,{vertexSource:VERTEX,fragmentSource:FRAGMENT},{attributes:['position'],uniforms:['worldViewProjection','observer','sunDirection','altitude','night','clock','studio'],samplers:['earthMap']});
 material.backFaceCulling=false;material.disableDepthWrite=true;
 material.setTexture('earthMap',new B.Texture(new URL('./assets/rocket-earth-nasa.png',import.meta.url).href,scene));
 material.setVector3('sunDirection',w.sun.direction.negate().normalize());
 material.setFloat('studio',studio?1:0);
 const dome=B.MeshBuilder.CreateSphere('analytic-Earth-and-sky',{diameter:2000,segments:24},scene);
 dome.material=material;dome.isPickable=false;
 w.scene.autoClear=false;
 return {render(state,time,physicalObserver=null){
  eye.fov=camera.fov;eye.upVector.copyFrom(camera.upVector);
  camera.getViewMatrix(true);eye.setTarget(camera.getForwardRay(1).direction);
  const p=state?.body.position||{x:0,y:6371000,z:0};
  const observer=(physicalObserver?physicalObserver.clone():new B.Vector3(p.x+camera.position.x,p.y+camera.position.y,p.z+camera.position.z)).scaleInPlace(1/6371000);
  // Keep the analytic camera just outside the surface even at a land-based pad.
  if(observer.length()<1.000003)observer.normalize().scaleInPlace(1.000003);
  material.setVector3('observer',observer);material.setFloat('altitude',Math.max(0,(observer.length()-1)*6371000));
  material.setFloat('night',state?.mission.night?1:0);material.setFloat('clock',time);
  scene.render();
 },dispose(){scene.dispose();}};
}
