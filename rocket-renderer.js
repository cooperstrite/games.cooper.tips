import {createWebGLScene} from './arcade/babylon.js';
import {buildRocketMesh,buildStage,buildAstronautMesh,prepareAstronautAssets} from './rocket-mesh.js';
import {EARTH_RADIUS} from './rocket-flight.js';
import {createRocketScenery} from './rocket-scenery.js';
import {createRocketOcean} from './rocket-ocean.js';
import {createRocketExhaust} from './rocket-exhaust.js';
import {createRocketBackdrop,createRocketEnvironment} from './rocket-backdrop.js';
const TAU=Math.PI*2;
export async function createRocketRenderer(canvas,{isCurrent=()=>true,studio=false}={}){
 const w=await createWebGLScene(canvas,{quality:'high',isCurrent}),{B,scene,camera,sun}=w;let disposed=false,model=null,crewModels=[],currentDesign=null,view='follow',angle=-.55,zoom=1,drag=null,lookYaw=0,lookPitch=0;
 const cachedMaterial=w.material;
 w.material=(color,options={})=>{const m=cachedMaterial(color,options);if(!m.metadata?.rocketLinear){m.albedoColor=m.albedoColor.toLinearSpace();m.metadata={...m.metadata,rocketLinear:true};}return m;};
 scene.imageProcessingConfiguration.exposure=1.02;scene.imageProcessingConfiguration.contrast=1.17;scene.environmentTexture=createRocketEnvironment(B,scene);scene.environmentIntensity=.65;scene.skipPointerMovePicking=true;
 scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=studio?0:.00014;scene.fogColor=new B.Color3(.46,.59,.65);
 // Native display resolution with MSAA keeps the flight view crisp without
 // multiplying every terrain, shadow, and volumetric pixel on Retina screens.
 if(!studio)w.engine.setHardwareScalingLevel(1);
 sun.direction.set(-.55,-.48,.65);sun.diffuse=new B.Color3(1,.83,.63);sun.intensity=2.8;sun.autoUpdateExtends=false;sun.shadowMinZ=1;sun.shadowMaxZ=1500;sun.orthoLeft=-180;sun.orthoRight=180;sun.orthoTop=180;sun.orthoBottom=-180;
 const fill=scene.getLightByName('sky-fill');fill.intensity=.38;fill.groundColor=new B.Color3(.12,.16,.13);
 if(w.shadows){w.shadows.useBlurExponentialShadowMap=false;w.shadows.usePercentageCloserFiltering=true;w.shadows.filteringQuality=B.ShadowGenerator.QUALITY_MEDIUM;w.shadows.bias=.00025;w.shadows.normalBias=.04;}
 camera.fov=.63;camera.minZ=.2;camera.maxZ=160000;
 const relative=new B.TransformNode('vehicle-orientation',scene),ground=new B.TransformNode('coastal-launch-complex',scene),debrisMeshes=new Map(),V=(x,y,z)=>new B.Vector3(x,y,z);
 const mat=(c,o={})=>w.material(c,o);
 function finish(m,mate,parent=ground){m.material=mate;m.parent=parent;m.receiveShadows=true;w.shadows?.addShadowCaster(m);return m;}
 function box(name,x,y,z,sx,sy,sz,mate,parent=ground){const m=B.MeshBuilder.CreateBox(name,{width:sx,height:sy,depth:sz},scene);m.position.set(x,y,z);return finish(m,mate,parent);}
 const steel=mat('#a9acaa',{metalness:.7,roughness:.46}),dark=mat('#303b42',{metalness:.25,roughness:.61});
 const scenery=createRocketScenery(w,{ground}),ocean=createRocketOcean(w,{ground}),exhaust=createRocketExhaust(w,{relative,ground}),backdrop=createRocketBackdrop(w,{studio});
 const studioFloor=B.MeshBuilder.CreateGround('studio-floor',{width:200,height:200},scene);studioFloor.material=mat('#1b3039',{roughness:.8});studioFloor.receiveShadows=true;studioFloor.setEnabled(studio);
 const orbitMarker=B.MeshBuilder.CreateSphere('orbital-vehicle-marker',{diameter:11,segments:12},scene);orbitMarker.material=mat('#f7cf86',{emissive:true});orbitMarker.material.unlit=true;orbitMarker.setEnabled(false);
 for(let group=0;group<4;group++)scene.setRenderingAutoClearDepthStencil(group,false,false,false);
 let smoothExtent=0,lastFrame=0,trackerExtent=0,trackerInitialized=false;
 const trackerUp=V(0,1,0);
 const plasma=B.MeshBuilder.CreateSphere('reentry-plasma',{diameter:1,segments:24},scene);plasma.parent=relative;plasma.material=mat('#ff6e2c',{emissive:true,alpha:.23});plasma.renderingGroupId=2;plasma.setEnabled(false);
 const chuteRoot=new B.TransformNode('parachutes',scene);const chuteMat=mat('#f3dfbd',{roughness:.9});
 for(let i=0;i<3;i++){const canopy=B.MeshBuilder.CreateSphere('recovery-canopy',{diameter:14,slice:.5,segments:24},scene);canopy.parent=chuteRoot;canopy.position.set((i-1)*13,35+Math.abs(i-1)*2,0);canopy.material=chuteMat;for(let j=0;j<8;j++){const a=j/8*TAU;const line=B.MeshBuilder.CreateLines('parachute-shroud',{points:[V(0,2,0),V((i-1)*13+Math.cos(a)*7,35+Math.abs(i-1)*2,Math.sin(a)*7)]},scene);line.parent=chuteRoot;line.color=new B.Color3(.75,.71,.6);}}
 chuteRoot.setEnabled(false);
 // Capsule interior stays fixed to the vehicle while the pilot looks around.
 const cockpit=new B.TransformNode('capsule-interior',scene);cockpit.parent=null;
 const cabinWall=B.MeshBuilder.CreateCylinder('capsule-inner-wall',{height:4.4,diameter:4.25,tessellation:48,cap:B.Mesh.NO_CAP,sideOrientation:B.Mesh.BACKSIDE},scene);cabinWall.parent=cockpit;cabinWall.position.z=-.75;cabinWall.rotation.x=Math.PI/2;cabinWall.material=mat('#444e53',{metalness:.15,roughness:.82});
 const rear=B.MeshBuilder.CreateDisc('rear-pressure-bulkhead',{radius:2.12,tessellation:48},scene);rear.parent=cockpit;rear.position.z=-2.95;rear.rotation.y=Math.PI;rear.material=mat('#495962',{roughness:.8});
 for(const x of[-1.12,0,1.12]){box('crew-seat-back',x,-.62,x===0?-1.05:-2.25,.68,1.2,.16,mat('#253a45',{roughness:.9}),cockpit);box('crew-seat-cushion',x,-1.27,x===0?-.65:-1.85,.68,.18,.8,mat('#2e424b',{roughness:.9}),cockpit);}
 const panel=box('flight-console',0,-.8,1.7,3.3,.8,.55,dark,cockpit);panel.rotation.x=.25;
 const instrumentTexture=new B.DynamicTexture('flight-instruments',{width:1024,height:256},scene,true),instrumentMat=new B.StandardMaterial('instrument-displays',scene);instrumentMat.diffuseTexture=instrumentTexture;instrumentMat.emissiveTexture=instrumentTexture;instrumentMat.disableLighting=true;
 const display=B.MeshBuilder.CreatePlane('flight-display',{width:1.32,height:.33},scene);display.parent=cockpit;display.position.set(0,-.46,1.3);display.rotation.y=0;display.material=instrumentMat;
 for(const x of[-1.13,1.13]){const rib=box('cockpit-window-rib',x,.35,2.2,.13,2.5,.24,steel,cockpit);rib.rotation.z=x>0?-.2:.2;}
 box('cockpit-header',0,1.4,2.2,2.7,.17,.22,steel,cockpit);cockpit.setEnabled(false);
 const observer=new ResizeObserver(()=>w.resize());observer.observe(canvas);
 function pointerdown(e){if(!studio&&view!=='cockpit')return;drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}
 function pointermove(e){if(drag){if(studio)angle+=(e.clientX-drag.x)*.008;else{lookYaw-=(e.clientX-drag.x)*.006;lookPitch=Math.max(-1.15,Math.min(1.15,lookPitch+(e.clientY-drag.y)*.006));}drag={x:e.clientX,y:e.clientY};}}
 const pointerup=()=>{drag=null;},wheel=e=>{if(studio){e.preventDefault();zoom=Math.max(.6,Math.min(2,zoom+e.deltaY*.001));}};
 canvas.addEventListener('pointerdown',pointerdown);canvas.addEventListener('pointermove',pointermove);canvas.addEventListener('pointerup',pointerup);canvas.addEventListener('wheel',wheel,{passive:false});
 let focus='rocket',lastInstrument=-1;
 async function setDesign(design,previewFocus='rocket'){
 currentDesign=design;focus=previewFocus;exhaust.reset();smoothExtent=0;trackerInitialized=false;for(const mesh of debrisMeshes.values())mesh.dispose();debrisMeshes.clear();model?.dispose();crewModels.forEach(m=>m.dispose());crewModels=[];model=buildRocketMesh(w,design,relative);const mine=design;
 if((studio&&focus!=='rocket')||design.crewCount){await prepareAstronautAssets();if(disposed||currentDesign!==mine)return;
  if(studio&&focus!=='rocket'){const m=buildAstronautMesh(w,design.crew[Number(focus)||0],design,relative);crewModels.push(m);model.root.setEnabled(false);m.root.position.y=-1;}
  else for(let i=0;i<design.crewCount;i++){const m=buildAstronautMesh(w,design.crew[i],design,cockpit);m.root.position.set(i===0?0:i===1?-1.12:1.12,-1.7,i===0?-.6:-1.8);m.root.rotation.y=Math.PI;crewModels.push(m);}
 }
 }
 function render(s,time=0){
  if(disposed||!model)return;
  const h=studio?0:s.altitude,night=!studio&&s.mission.night,dt=Math.min(.1,Math.max(0,time-lastFrame));lastFrame=time;
  const effectTime=studio?time:s.time;let backdropObserver=null;
  orbitMarker.setEnabled(!studio&&view==='orbit');
  if(studio){
   ocean.setEnabled(false);exhaust.setEnabled(false);ground.setEnabled(false);cockpit.setEnabled(false);chuteRoot.setEnabled(false);plasma.setEnabled(false);
   relative.rotationQuaternion=B.Quaternion.Identity();model.root.position.y=-model.stats.height/2;relative.position.set(0,0,0);
   const astronaut=focus!=='rocket';studioFloor.position.y=astronaut?-1.08:-model.stats.height/2;
   const d=(astronaut?4.5:model.stats.height*1.8)*zoom;
   camera.position.set(Math.sin(angle)*d,astronaut?.35:model.stats.height*.1,-Math.cos(angle)*d);
   camera.upVector.copyFrom(B.Axis.Y);camera.setTarget(V(0,0,0));camera.minZ=.05;camera.maxZ=1000;sun.position.set(-30,60,-30);
  }else{
   relative.rotationQuaternion=new B.Quaternion(s.body.quaternion.x,s.body.quaternion.y,s.body.quaternion.z,s.body.quaternion.w);
   model.update(s);relative.setEnabled(view!=='cockpit'&&view!=='orbit');
   ground.position.set(-s.body.position.x,EARTH_RADIUS-s.body.position.y-4.3,-s.body.position.z);
   ground.setEnabled(h<55000&&view!=='orbit');scenery.update({state:s,time:effectTime,view});
   sun.intensity=night?1.05:2.45;scene.environmentIntensity=night?.23:.60;
   scene.fogDensity=.00014*Math.exp(-h/9000);scene.fogColor.set(night?.07:.46,night?.11:.59,night?.17:.65);
   const up=V(s.body.position.x,s.body.position.y,s.body.position.z).normalize(),east=V(up.y,-up.x,0).normalize(),north=B.Vector3.Cross(east,up);
   fill.direction.copyFrom(up);fill.intensity=night?.2:.38;
   const extent=Math.max(10,s.height),axis=V(0,1,0).rotateByQuaternionToRef(relative.rotationQuaternion,new B.Vector3());
   smoothExtent=smoothExtent?smoothExtent+(extent-smoothExtent)*(1-Math.exp(-dt*3)):extent;
   camera.fov=.63;camera.maxZ=160000;camera.upVector.copyFrom(up);
   if(view==='follow'){
    const launchFrame=1-Math.min(1,Math.max(0,h-35)/160),d=smoothExtent*(1.55+launchFrame*.40);
    camera.position.copyFrom(east.scale(-d*.82).add(up.scale(smoothExtent*(.70-launchFrame*.20))).add(north.scale(-d)));
    camera.setTarget(up.scale(smoothExtent*(.06-launchFrame*.23)));camera.minZ=Math.max(.75,Math.min(5,smoothExtent*.1));
   }
   if(view==='mission'){
    // A stabilized optical tracker preserves the ground-station viewing angle
    // without million-metre camera translations or vanishingly narrow FOVs.
    const station=ground.position.add(V(-160,13,-330)),range=station.length(),visualRange=Math.min(range,Math.max(650,smoothExtent*30));
    camera.position.copyFrom(station.scale(visualRange/Math.max(1,range)));
    const target=axis.scale(-smoothExtent*.12),forward=target.subtract(camera.position).normalize();
    const axial=Math.min(1,Math.abs(B.Vector3.Dot(axis,forward))),projectedExtent=Math.max(smoothExtent*.18,smoothExtent*Math.sqrt(1-axial*axial)+s.stats.diameter*axial);
    // Parallel-transport the camera's up vector: a ground tracker must not
    // suddenly roll over when the vehicle passes almost directly overhead.
    if(!trackerInitialized){trackerUp.copyFrom(B.Axis.Y);trackerExtent=projectedExtent;trackerInitialized=true;}
    trackerExtent+=(projectedExtent-trackerExtent)*(1-Math.exp(-dt*3));
    trackerUp.subtractInPlace(forward.scale(B.Vector3.Dot(trackerUp,forward)));
    if(trackerUp.lengthSquared()<.00001)trackerUp.copyFrom(B.Vector3.Cross(forward,B.Axis.X));
    trackerUp.normalize();camera.upVector.copyFrom(trackerUp);
    camera.setTarget(target);camera.fov=Math.min(.63,2*Math.atan(trackerExtent*.78/visualRange));camera.minZ=Math.max(.5,visualRange*.002);
    // The optical zoom uses nearby geometry for precision, but the sky must
    // still be observed from the real ground station, never from the rocket.
    backdropObserver=V(-160,EARTH_RADIUS+8.7,-330);
   }
   if(view==='cockpit'){
    camera.fov=1.05;
    const interiorRotation=relative.rotationQuaternion.multiply(B.Quaternion.RotationAxis(B.Axis.X,-Math.PI/2));
    camera.position.copyFrom(axis.scale(s.height/2+2));cockpit.position.copyFrom(camera.position);cockpit.rotationQuaternion=interiorRotation;
    camera.upVector=V(0,1,0).rotateByQuaternionToRef(interiorRotation,new B.Vector3());
    const forward=V(Math.sin(lookYaw)*Math.cos(lookPitch),Math.sin(lookPitch),Math.cos(lookYaw)*Math.cos(lookPitch)).rotateByQuaternionToRef(interiorRotation,new B.Vector3());
    camera.setTarget(camera.position.add(forward.scale(10)));camera.minZ=.05;
   }
   if(view==='orbit'){
    camera.upVector.copyFrom(B.Axis.Y);
    backdropObserver=V(0,EARTH_RADIUS*3.8,-EARTH_RADIUS*2.1);
    camera.position.set(0,0,0);camera.setTarget(backdropObserver.negate().normalize());
    // The tracking dot is projected onto a nearby overlay plane. Earth itself
    // is drawn analytically by the background pass, never by this depth buffer.
    const direction=V(s.body.position.x,s.body.position.y,s.body.position.z).subtract(backdropObserver).normalize();orbitMarker.position.copyFrom(direction.scale(1200));orbitMarker.scaling.setAll(1);
    camera.minZ=10;camera.maxZ=5000;
   }
   cockpit.setEnabled(view==='cockpit');
   sun.position.copyFrom(sun.direction.normalizeToNew().scale(-280));
   // Shadow projection follows the vehicle, not the previous frame's camera.
   // Fixed extents also keep texture texels stable through camera changes.
   const shadowRange=Math.max(35,Math.min(120,model.stats.height*1.3));
   sun.orthoLeft=-shadowRange;sun.orthoRight=shadowRange;sun.orthoTop=shadowRange;sun.orthoBottom=-shadowRange;
   scene.shadowsEnabled=view!=='orbit'&&h<18000;
   ocean.setEnabled(true);ocean.update({state:s,time:effectTime,view,up,east,north,eye:camera.position});
   exhaust.setEnabled(true);exhaust.update({state:s,time:effectTime,view});
   plasma.setEnabled(s.capsule&&s.temperature>520&&s.phase==='flying'&&view!=='cockpit'&&view!=='orbit');plasma.scaling.set(4.1,3.5,4.1);plasma.position.y=-2.3;
   chuteRoot.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,up,new B.Quaternion());
   chuteRoot.setEnabled(s.chute&&view!=='cockpit'&&view!=='orbit');chuteRoot.scaling.setAll(Math.min(1,s.chuteAge/4));
   for(const d of s.debris){
    let m=debrisMeshes.get(d);
    if(!m){m=d.kind==='stage'?buildStage(w,s.design.stages[d.index],d.index,model.mats,null):B.MeshBuilder.CreateCylinder('separated-fairing',{height:5,diameterTop:.2,diameterBottom:2,tessellation:24},scene);if(d.kind!=='stage')m.material=model.mats.paint;debrisMeshes.set(d,m);}
    m.position.set(d.body.position.x-s.body.position.x,d.body.position.y-s.body.position.y,d.body.position.z-s.body.position.z);
    m.rotationQuaternion=new B.Quaternion(d.body.quaternion.x,d.body.quaternion.y,d.body.quaternion.z,d.body.quaternion.w);m.setEnabled(view!=='orbit'&&m.position.length()<30000);
   }
   if(view==='cockpit'&&Math.floor(effectTime*5)!==lastInstrument){
    lastInstrument=Math.floor(effectTime*5);const c=instrumentTexture.getContext();c.fillStyle='#071823';c.fillRect(0,0,1024,256);c.fillStyle='#7bcec4';c.font='24px monospace';c.fillText('ALTITUDE',40,46);c.fillText('VELOCITY',390,46);c.fillText('ACCEL / O2',730,46);c.font='bold 48px monospace';c.fillText((h/1000).toFixed(1)+' km',40,112);c.fillText(s.speed.toFixed(0)+' m/s',390,112);c.fillText(s.gLoad.toFixed(1)+' G',730,112);c.font='22px monospace';c.fillStyle='#edc990';c.fillText(s.capsule?'CAPSULE / THERMAL CONTROL':'MAIN ENGINE '+Math.round(s.throttle*100)+'%',40,190);c.fillText(s.crew.length?Math.ceil(s.oxygen/60)+' MIN OXYGEN':'UNCREWED',730,190);instrumentTexture.update();
   }
  }
  backdrop.render(s,effectTime,backdropObserver);w.render();
 }

 return{setDesign,setView(v){view=v;lookYaw=0;lookPitch=0;trackerInitialized=false;},render,resize:w.resize,world:w,dispose(){disposed=true;observer.disconnect();canvas.removeEventListener('pointerdown',pointerdown);canvas.removeEventListener('pointermove',pointermove);canvas.removeEventListener('pointerup',pointerup);canvas.removeEventListener('wheel',wheel);model?.dispose();crewModels.forEach(m=>m.dispose());exhaust.dispose();ocean.dispose();scenery.dispose();backdrop.dispose();w.dispose();}};
}
