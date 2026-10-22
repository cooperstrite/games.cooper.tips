export const OCEAN_FRAGMENT = `
precision highp float;
varying vec3 vPosition;
uniform float clock;
uniform vec3 eye;
uniform float darkness;
uniform sampler2D panorama;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 cell=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(hash(cell),hash(cell+vec2(1.0,0.0)),f.x),mix(hash(cell+vec2(0.0,1.0)),hash(cell+vec2(1.0)),f.x),f.y);
}
float wave(vec2 p,float fine) {
  vec2 drift=vec2(clock*.14,-clock*.11);
  return noise(p*.085+drift)*.9+noise(p*.23-drift*1.4)*.26*fine+noise(p*.62+drift*1.9)*.07*fine;
}
void main() {
  vec2 p=vPosition.xz;
  float distanceToEye=length(eye-vPosition);
  float fine=1.0-smoothstep(300.0,2200.0,distanceToEye);
  float dx=wave(p+vec2(.5,0.0),fine)-wave(p-vec2(.5,0.0),fine);
  float dz=wave(p+vec2(0.0,.5),fine)-wave(p-vec2(0.0,.5),fine);
  vec3 normal=normalize(vec3(-dx,1.0,-dz));
  vec3 view=normalize(eye-vPosition),reflection=reflect(-view,normal);
  vec2 uv=vec2(atan(reflection.z,reflection.x)/6.2831853+.5,asin(clamp(reflection.y,-1.0,1.0))/3.1415926+.5);
  vec3 sky=texture2D(panorama,uv).rgb;
  float fresnel=.1+.42*pow(1.0-max(dot(normal,view),0.0),4.0);
  vec3 sea=mix(vec3(.014,.105,.185),sky,fresnel);
  vec3 halfVector=normalize(view+normalize(vec3(-.55,.25,.55)));
  float shimmer=pow(max(dot(normal,halfVector),0.0),180.0)*2.2;
  sea+=vec3(1.0,.78,.48)*shimmer;
  sea+=(noise(p*.35+clock*.07)-.5)*.018*fine;
  sea=mix(sea,vec3(.22,.38,.49),smoothstep(5000.0,14000.0,distanceToEye));
  gl_FragColor=vec4(sea*darkness,1.0);
}`;
