import { stageStats } from './rocket-config.js';

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
float hash(vec3 p) {
  p=fract(p*0.1031); p+=dot(p,p.yzx+33.33); return fract((p.x+p.y)*p.z);
}
float noise(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                 mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                 mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
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
    float radius=nozzle+(0.65-nozzle)*pow(down,0.72);
    radius*=0.88+0.20*turbulence;
    vec2 curl=vec2(sin(down*18.0-clock*3.2+seed),cos(down*15.0-clock*2.8+seed))*down*down*0.055;
    float radial=length(p.xz+curl)/max(0.02,radius);
    float envelope=(1.0-smoothstep(0.18,1.0,radial))*(1.0-smoothstep(0.62,1.0,down));
    float diamonds=0.78+0.22*pow(0.5+0.5*cos(down*62.0-expansion*13.0),5.0);
    float density=envelope*(0.5+0.8*turbulence)*diamonds;
    float core=exp(-radial*radial*9.0)*(1.0-smoothstep(0.23,0.82,down));
    vec3 amber=mix(vec3(1.0,0.26,0.035),vec3(1.0,0.65,0.23),turbulence);
    vec3 color=mix(amber,vec3(1.0,0.96,0.79),clamp(core*1.7,0.0,1.0));
    color=mix(color,vec3(0.48,0.66,1.0),exp(-down*26.0)*0.65);
    float alpha=1.0-exp(-density*stepLength*5.0);
    light+=(1.0-opacity)*color*alpha*(1.2+core*2.8);
    opacity+=(1.0-opacity)*alpha;
  }
  float strength=smoothstep(0.0,0.12,power);
  gl_FragColor=vec4(light*strength,opacity*strength);
}
`;

function steamTexture(B, scene) {
  const size=256, texture=new B.DynamicTexture('rocket-steam-atlas',{width:size*4,height:size},scene,false);
  const context=texture.getContext(),image=context.createImageData(size*4,size);
  let seed=29183;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let cell=0;cell<4;cell++) {
    const lobes=[{x:0,y:0,r:.61}];
    for(let i=0;i<12;i++) {const angle=random()*Math.PI*2,reach=.14+random()*.39;lobes.push({x:Math.cos(angle)*reach,y:Math.sin(angle)*reach,r:.24+random()*.25});}
    for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
      const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1;
      let density=0,shade=0;
      for(const lobe of lobes){const dx=(u-lobe.x)/lobe.r,dy=(v-lobe.y)/lobe.r,r2=dx*dx+dy*dy;
        const d=Math.exp(-r2*3.1);density+=d;shade+=d*(.70-dy*.18-dx*.12);}
      const edge=Math.max(0,1-Math.pow(Math.max(Math.abs(u),Math.abs(v)),6));
      const grain=.94+.06*Math.sin(u*67+Math.sin(v*33))*Math.sin(v*59+Math.cos(u*41));
      const alpha=(1-Math.exp(-Math.max(0,density-.025)*1.5))*edge*grain;
      const light=Math.max(.40,Math.min(1.0,shade/Math.max(.001,density)));
      const index=(y*size*4+cell*size+x)*4;
      image.data[index]=158+light*92;image.data[index+1]=168+light*82;image.data[index+2]=174+light*75;image.data[index+3]=Math.round(alpha*255);
    }
  }
  context.putImageData(image,0,0);texture.hasAlpha=true;texture.update(false);
  return texture;
}

/** All flight coordinates are relative to the current vehicle. Ground steam is
 * stored in launch-site coordinates and transformed afresh every frame; moving
 * the floating origin never leaves a stale screen-space particle trail. */
export function createRocketExhaust(w,{relative,ground}) {
  const {B,scene,camera}=w,root=new B.TransformNode('rocket-engine-exhaust',scene);
  root.parent=relative;
  const engines=[];
  for(let i=0;i<4;i++) {
    const mesh=B.MeshBuilder.CreateCylinder('engine-plume-volume-'+i,{height:1,diameter:2,tessellation:32},scene);
    const material=new B.ShaderMaterial('engine-plume-light-'+i,scene,{vertexSource:PLUME_VERTEX,fragmentSource:PLUME_FRAGMENT},{attributes:['position'],uniforms:['worldViewProjection','eye','clock','nozzle','power','expansion','seed'],needAlphaBlending:true});
    material.alphaMode=B.Engine.ALPHA_ADD;material.disableDepthWrite=true;material.backFaceCulling=true;material.setFloat('seed',i*9.73);
    mesh.parent=root;mesh.material=material;mesh.isPickable=false;mesh.renderingGroupId=2;mesh.setEnabled(false);
    engines.push({mesh,material,inverse:B.Matrix.Identity(),eye:new B.Vector3()});
  }
  const light=new B.PointLight('engine-plume-illumination',B.Vector3.Zero(),scene);
  light.diffuse=new B.Color3(1,.61,.27);light.specular=new B.Color3(1,.72,.46);light.range=100;light.intensity=0;
  const texture=steamTexture(B,scene),steam=new B.SpriteManager('launch-steam',null,80,256,scene);
  steam.texture=texture;steam.disableDepthWrite=true;steam.isPickable=false;steam.fogEnabled=true;steam.renderingGroupId=2;
  const particles=Array.from({length:80},(_,i)=>{const sprite=new B.Sprite('pad-steam-'+i,steam);sprite.isVisible=false;sprite.cellIndex=i%4;return{sprite,birth:-100,life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:1,grow:1,spin:0};});
  const nozzleWorld=new B.Vector3(),axis=new B.Vector3();
  let enabled=true,disposed=false,lastState=null,lastTime=0,spawn=0,cursor=0,randomSeed=39812;
  const random=()=>{randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;};

  function reset() {
    spawn=0;cursor=0;lastState=null;lastTime=0;root.setEnabled(false);light.intensity=0;
    particles.forEach(p=>{p.life=0;p.sprite.isVisible=false;});
  }
  function update({state:s,time=0,view='follow'}) {
    if(disposed||!s)return;
    if(lastState!==s||s.time<lastTime){reset();lastState=s;lastTime=s.time;}
    const clock=Number.isFinite(s.time)?s.time:time,dt=Math.min(.12,Math.max(0,clock-lastTime));lastTime=clock;
    const stage=s.design.stages[s.activeStage],stats=stage?stageStats(stage):null;
    const burning=!!stage&&!s.capsule&&s.phase==='flying'&&s.throttle>.005&&(s.fuels?.[s.activeStage]??1)>0;
    const visible=enabled&&view!=='cockpit'&&view!=='orbit';
    const expansion=1-Math.exp(-Math.max(0,s.altitude)/18000),power=burning?s.throttle:0;
    root.setEnabled(visible&&burning);root.position.y=-s.height/2+.015;
    relative.computeWorldMatrix(true);
    B.Vector3.TransformNormalToRef(B.Axis.Y,relative.getWorldMatrix(),axis);axis.normalize();
    B.Vector3.TransformCoordinatesToRef(new B.Vector3(0,-s.height/2,0),relative.getWorldMatrix(),nozzleWorld);
    light.position.copyFrom(nozzleWorld).subtractInPlace(axis.scale(2));
    light.intensity=visible?power*(s.mission?.night?15:8):0;
    light.range=stats?Math.max(45,stats.diameter*17):60;
    for(let i=0;i<engines.length;i++) {
      const e=engines[i],active=burning&&i<stage.engines;e.mesh.setEnabled(active);
      if(!active)continue;
      const angle=i/stage.engines*Math.PI*2,spread=stage.engines>1?stats.diameter*.225:0;
      const diameter=stats.diameter/(stage.engines>1?2.3:1.5);
      const radius=diameter*(.90+expansion*1.45),length=diameter*(8.5+expansion*5.5)*(.25+.75*Math.sqrt(power));
      e.mesh.position.set(Math.sin(angle)*spread,-length/2,Math.cos(angle)*spread);e.mesh.scaling.set(radius,length,radius);
      e.mesh.computeWorldMatrix(true).invertToRef(e.inverse);B.Vector3.TransformCoordinatesToRef(camera.position,e.inverse,e.eye);
      e.material.setVector3('eye',e.eye);e.material.setFloat('clock',clock);e.material.setFloat('nozzle',diameter*.48/radius);e.material.setFloat('power',power);e.material.setFloat('expansion',expansion);
    }
    // At the pad, the exhaust is deflected sideways by the flame trench. Pooling
    // avoids allocating particles, materials, or textures during a launch.
    const nearPad=burning&&s.altitude<100&&Math.hypot(s.body.position.x,s.body.position.z)<2500;
    if(nearPad&&dt>0&&enabled) {
      const reach=Math.max(0,1-s.altitude/100);spawn+=dt*power*(14+stats.diameter*2)*reach;
      const localX=nozzleWorld.x-ground.position.x,localZ=nozzleWorld.z-ground.position.z;
      while(spawn>=1) {
        spawn--;const p=particles[cursor++%particles.length],side=random()>.5?1:-1,spread=random()*Math.PI*2;
        p.birth=clock;p.life=8+random()*7;p.x=localX+(random()-.5)*5;p.y=3+random()*3;p.z=localZ+side*(7+random()*5);
        p.vx=Math.cos(spread)*(3+random()*5);p.vy=1.1+random()*1.6;p.vz=side*(7+random()*10);
        p.size=5+random()*5+stats.diameter*.7;p.grow=2+random()*1.5;p.spin=(random()-.5)*.13;
        p.sprite.angle=random()*Math.PI*2;p.sprite.invertU=random()>.5;
      }
    } else spawn=0;
    const night=!!s.mission?.night;
    for(const p of particles) {
      const age=clock-p.birth,alive=p.life>0&&age<p.life;
      p.sprite.isVisible=visible&&alive&&s.altitude<25000;
      if(!alive)continue;
      const drift=(1-Math.exp(-age*.13))/.13;
      p.sprite.position.set(ground.position.x+p.x+p.vx*drift,ground.position.y+p.y+p.vy*age,ground.position.z+p.z+p.vz*drift);
      p.sprite.width=p.size+p.grow*age;p.sprite.height=p.sprite.width*(.68+.13*Math.min(1,age/4));
      p.sprite.angle+=p.spin*dt;
      const fade=Math.min(1,age/.65)*Math.pow(Math.max(0,1-age/p.life),1.1),warm=power*Math.exp(-age*.6);
      p.sprite.color.set(night?.37+warm*.54:.94+warm*.06,night?.43+warm*.27:.97-warm*.04,night?.52+warm*.08:1-warm*.14,fade*.76);
    }
  }
  return{update,reset,setEnabled(value){enabled=!!value;if(!enabled){root.setEnabled(false);light.intensity=0;particles.forEach(p=>p.sprite.isVisible=false);}},dispose(){if(disposed)return;disposed=true;root.dispose();engines.forEach(e=>e.material.dispose());light.dispose();steam.dispose();texture.dispose();}};
}
