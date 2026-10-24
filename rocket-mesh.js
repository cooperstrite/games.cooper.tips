import { stageStats, vehicleStats, ROCKET_COSMETICS, TANKS } from './rocket-config.js';
import { prepareRunnerAssets, buildRunnerMesh } from './arcade/runner-mesh.js';
import { archerGeometry } from './arcade/archer-geometry.js';
import { CharacterBuilder } from './arcade/characters.js';
export const prepareAstronautAssets=prepareRunnerAssets;
export function astronautCharacter(a){return new CharacterBuilder('rocket',a.suit).withColors({body:a.suitColor,skin:a.skin,hair:a.hairColor,eyes:a.eyes,facialHair:a.facialHairColor,accessory:a.accent,gloves:a.gloves,boots:a.boots,helmet:a.helmet,visor:a.visorColor}).withFeature('hair',a.hair).withFeature('facialHair',a.facialHair).withFeature('build',a.build).build();}
export function rocketPalette(design){const item=ROCKET_COSMETICS.find(c=>c.setting==='livery'&&c.value===design.livery);return item?item.colors:[design.bodyColor,design.accentColor];}
// Every camera and the library use these same physically based vehicle parts.
export function rocketMaterials(w,design){
 const {B,scene}=w,[body,accent]=rocketPalette(design),texture=new B.DynamicTexture('paint-microstructure',{width:256,height:256},scene,true),c=texture.getContext();
 c.fillStyle='#eeeeea';c.fillRect(0,0,256,256);let seed=42;for(let i=0;i<13000;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%256;seed=(seed*1664525+1013904223)>>>0;const y=seed%256;c.fillStyle=`rgba(40,47,53,${.025+(i%7)*.008})`;c.fillRect(x,y,design.livery==='carbon'?3:1,1);}
 c.strokeStyle='rgba(20,25,30,.15)';c.lineWidth=1;for(let i=0;i<256;i+=64){c.beginPath();c.moveTo(0,i);c.lineTo(256,i);c.stroke();}texture.update();texture.uScale=3;texture.vScale=3;
 const paint=w.material(body,{metalness:.16,roughness:.34}).clone('rocket-enamel');paint.albedoTexture=texture;paint.clearCoat.isEnabled=true;paint.clearCoat.intensity=.22;paint.clearCoat.roughness=.3;
 const metal=w.material('#9ea8ae',{metalness:.82,roughness:.43}),dark=w.material('#232d35',{metalness:.45,roughness:.53}),trim=w.material(accent,{metalness:.3,roughness:.39}),rubber=w.material('#25282a',{roughness:.87}),glass=w.material('#102431',{metalness:.52,roughness:.12}),hot=w.material('#ffd8a4',{emissive:true});
 return{paint,metal,dark,trim,rubber,glass,hot,dispose(){paint.dispose();texture.dispose();}};
}
function primitives(w,parent){const {B,scene}=w;
 const finish=(m,mat)=>{m.parent=parent;m.material=mat;m.receiveShadows=true;w.shadows?.addShadowCaster(m);return m;};
 return {cylinder(name,y,h,top,bottom,mat){const m=B.MeshBuilder.CreateCylinder(name,{height:h,diameterTop:top,diameterBottom:bottom,tessellation:64},scene);m.position.y=y;return finish(m,mat);},box(name,pos,scale,mat){const m=B.MeshBuilder.CreateBox(name,{size:1},scene);m.position.set(...pos);m.scaling.set(...scale);return finish(m,mat);},ring(name,y,d,t,mat){const m=B.MeshBuilder.CreateTorus(name,{diameter:d,thickness:t,tessellation:64},scene);m.position.y=y;return finish(m,mat);},sphere(name,pos,scale,mat){const m=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:24},scene);m.position.set(...pos);m.scaling.set(...scale);return finish(m,mat);},finish};}
export function buildStage(w,stage,index,mats,parent){const {B,scene}=w,p=new B.TransformNode(`stage-${index+1}`,scene);p.parent=parent;const g=primitives(w,p),s=stageStats(stage),r=s.diameter/2,h=s.height,engineH=h-TANKS[stage.tank].height-1.2,tankH=h-engineH-1.2;
 g.cylinder('tank-enamel',engineH+tankH/2-h/2,tankH,s.diameter,s.diameter,mats.paint);
 g.cylinder('upper-interstage',h/2-.6,1.2,s.diameter,s.diameter,mats.dark);
 for(const y of [engineH-h/2,engineH+tankH*.24-h/2,engineH+tankH*.76-h/2,h/2-1.2])g.ring('welded-tank-seam',y,s.diameter,.065,mats.metal);
 g.cylinder('mission-stripe',h/2-2,.55,s.diameter+.025,s.diameter+.025,mats.trim);
 for(let n=0;n<16;n++){const a=n/16*Math.PI*2;g.box('interstage-rib',[Math.cos(a)*(r+.015),h/2-.6,Math.sin(a)*(r+.015)],[.055,.91,.055],mats.metal);}
 for(let side=0;side<2;side++){const a=side*Math.PI+.7;const pipe=g.cylinder('external-feedline',engineH+tankH/2-h/2,tankH*.85,.09,.09,mats.metal);pipe.position.x=Math.cos(a)*(r+.07);pipe.position.z=Math.sin(a)*(r+.07);for(let k=0;k<5;k++)g.box('feedline-clamp',[pipe.position.x,engineH+tankH*(.15+k*.17)-h/2,pipe.position.z],[.19,.12,.19],mats.dark);}
 for(let n=0;n<stage.engines;n++){const a=n/stage.engines*Math.PI*2,spread=stage.engines>1?r*.45:0,x=Math.sin(a)*spread,z=Math.cos(a)*spread,d=s.diameter/(stage.engines>1?2.3:1.5),neck=g.cylinder('engine-throat',-h/2+engineH*.75,engineH*.5,d*.34,d*.55,mats.metal);neck.position.x=x;neck.position.z=z;
 const shape=Array.from({length:19},(_,j)=>{const t=j/18;return new B.Vector3(d*(.26+.24*(1-t)**1.65),engineH*.62*t,0);});
 const bell=g.finish(B.MeshBuilder.CreateLathe('regeneratively-cooled-bell',{shape,tessellation:64,cap:B.Mesh.NO_CAP,sideOrientation:B.Mesh.DOUBLESIDE},scene),mats.dark);bell.position.set(x,-h/2+.08,z);
 const throat=g.finish(B.MeshBuilder.CreateDisc('recessed-nozzle-throat',{radius:d*.26,tessellation:48,sideOrientation:B.Mesh.DOUBLESIDE},scene),mats.rubber);throat.position.set(x,-h/2+engineH*.62,z);throat.rotation.x=Math.PI/2;
 const rim=g.ring('engine-rim',-h/2+.08,d,.075,mats.metal);rim.position.x=x;rim.position.z=z;
 for(let j=1;j<5;j++){const t=j/6,band=g.ring('nozzle-cooling-jacket',-h/2+.08+engineH*.62*t,d*(.52+.48*(1-t)**1.65),.025,mats.metal);band.position.x=x;band.position.z=z;}
 for(let k=0;k<8;k++){const angle=k/8*Math.PI*2;g.box('engine-cooling-line',[x+Math.cos(angle)*d*.28,-h/2+engineH*.58,z+Math.sin(angle)*d*.28],[.035,engineH*.45,.035],mats.metal);}}
 for(let i=0;i<stage.fins;i++){const a=i/stage.fins*Math.PI*2,fin=new B.Mesh('stabilizer-fin',scene),v=new B.VertexData();v.positions=[r,-h/2+.3,-.06,r,-h/2+4.1,-.06,r+1.8,-h/2+.6,-.06,r,-h/2+.3,.06,r,-h/2+4.1,.06,r+1.8,-h/2+.6,.06];v.indices=[0,1,2,5,4,3,0,3,4,0,4,1,1,4,5,1,5,2,2,5,3,2,3,0];v.normals=[];B.VertexData.ComputeNormals(v.positions,v.indices,v.normals);v.applyToMesh(fin);fin.rotation.y=a;g.finish(fin,mats.trim);}
 return p;
}
 export function buildRocketMesh(w,design,parent){const {B,scene}=w,mats=rocketMaterials(w,design),root=new B.TransformNode('launch-vehicle',scene);root.parent=parent;const stats=vehicleStats(design),stages=[],interstages=[];let y=0;
 for(let i=0;i<design.stages.length;i++){
  const node=buildStage(w,design.stages[i],i,mats,root),s=stats.stages[i];node.position.y=y+s.height/2;stages.push(node);
  if(i>0){const engineHeight=s.height-TANKS[design.stages[i].tank].height-1.2,g=primitives(w,node);interstages[i]=g.cylinder('engine-bay-interstage',-s.height/2+engineHeight/2,engineHeight+.05,s.diameter+.025,stats.stages[i-1].diameter,mats.paint);g.ring('separation-flange',-s.height/2+engineHeight,s.diameter+.04,.085,mats.metal);}
  y+=s.height;
 }
 const capsule=new B.TransformNode('command-capsule',scene);capsule.parent=root;capsule.position.y=y+3.4;const g=primitives(w,capsule);
 g.cylinder('ablative-heat-shield',-3.05,.68,3.25,3.5,mats.rubber);g.ring('heat-shield-rim',-2.72,3.3,.13,mats.metal);
 g.cylinder('capsule-pressure-hull',-1.55,2.35,2.75,3.3,mats.paint);g.cylinder('capsule-taper',.63,2.02,1.4,2.75,mats.paint);g.cylinder('docking-neck',1.95,.64,1.18,1.4,mats.dark);g.sphere('nose-cap',[0,2.4,0],[1.3,.8,1.3],mats.paint);
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2,p=g.box('capsule-window-frame',[Math.sin(a)*1.26,-.12,Math.cos(a)*1.26],[.56,.72,.13],mats.metal);p.rotation.y=a;const glass=g.box('capsule-window',[Math.sin(a)*1.34,-.12,Math.cos(a)*1.34],[.43,.56,.06],mats.glass);glass.rotation.y=a;}
 for(let i=0;i<4;i++){const a=i/4*Math.PI*2;g.box('reaction-control-pod',[Math.sin(a)*1.6,-1.7,Math.cos(a)*1.6],[.32,.5,.32],mats.dark);}
 g.ring('capsule-stripe',-2,3.22,.2,mats.trim);
 const pressureParts=capsule.getChildMeshes(false);
 const fairing=new B.TransformNode('payload-fairing',scene);fairing.parent=capsule;const fg=primitives(w,fairing);
 if(!design.crewCount){
  const profile=[[-3.12,1.76],[-2.92,1.82],[-1.3,1.82],[-.25,1.76],[.65,1.56],[1.45,1.14],[2.05,.67],[2.52,.23],[2.68,0]].map(([y,r])=>new B.Vector3(r,y,0));
  fg.finish(B.MeshBuilder.CreateLathe('smooth-payload-ogive',{shape:profile,tessellation:64,cap:B.Mesh.CAP_ALL},scene),mats.paint);
  fg.ring('fairing-belt',-2.85,3.65,.1,mats.trim);
  for(const side of[-1,1])fg.box('fairing-separation-joint',[side*1.823,-1.95,0],[.017,1.9,.018],mats.metal);
 }
 const showPressureHull=()=>pressureParts.forEach(piece=>piece.setEnabled(design.crewCount>0||!design.fairing));showPressureHull();fairing.setEnabled(design.fairing&&!design.crewCount);
 const satellite=new B.TransformNode('science-payload',scene);satellite.parent=capsule;const sg=primitives(w,satellite);sg.box('satellite-bus',[0,.7,0],[1.7,2,1.5],w.material('#c4a263',{metalness:.75,roughness:.35}));for(const side of [-1,1]){sg.box('array-arm',[side*2,.7,0],[2.5,.08,.08],mats.metal);sg.box('solar-array',[side*3.1,.7,0],[2.5,3.2,.05],w.material('#1c365a',{metalness:.55,roughness:.23}));for(let j=0;j<8;j++)sg.box('solar-cell-grid',[side*3.1,-.7+j*.4,-.035],[2.5,.013,.01],mats.metal);}satellite.setEnabled(false);
 // Simple, readable stenciling is baked into a local texture, never placed in the HUD.
 const label=new B.DynamicTexture('vehicle-stencil',{width:256,height:1024},scene,true),ctx=label.getContext();ctx.clearRect(0,0,256,1024);ctx.fillStyle='#25394a';ctx.font='bold 65px sans-serif';ctx.textAlign='center';for(const [i,ch]of [...'COOPER'].entries())ctx.fillText(ch,128,120+i*120);label.hasAlpha=true;label.update();const lm=new B.StandardMaterial('vehicle-label',scene);lm.diffuseTexture=label;lm.useAlphaFromDiffuseTexture=true;lm.emissiveColor=new B.Color3(.13,.13,.13);lm.backFaceCulling=false;
 if(stages.length){const plate=B.MeshBuilder.CreatePlane('mission-stencil',{width:stats.stages[0].diameter*.45,height:stats.stages[0].height*.48},scene);plate.parent=stages[0];plate.position.set(0,1,-stats.stages[0].diameter/2-.025);plate.material=lm;}
 return {root,stages,capsule,fairing,satellite,mats,stats,update(s){let removed=0;for(let i=0;i<stages.length;i++){stages[i].setEnabled(i>=s.activeStage);interstages[i]?.setEnabled(i>s.activeStage);if(i<s.activeStage)removed+=stats.stages[i].height;}root.position.y=-removed-s.height/2;fairing.setEnabled(s.fairing&&!design.crewCount);pressureParts.forEach(piece=>piece.setEnabled(design.crewCount>0||!s.fairing));satellite.setEnabled(s.payloadDeployed);if(s.payloadDeployed)satellite.position.x=6;},dispose(){root.dispose(false);mats.dispose();lm.dispose();label.dispose();}};
}
export function buildAstronautMesh(w,a,design,parent){
 const {B,scene}=w,character=astronautCharacter(a),root=new B.TransformNode('astronaut-'+a.name,scene);
 // Reuse the shared anatomical face and fitted hair, with a dedicated pressure suit.
 const rig=buildRunnerMesh(w,{key:'tracksuit',colors:{body:a.suitColor,bottoms:a.suitColor,skin:a.skin,hair:a.hairColor,eyes:a.eyes,facialHair:a.facialHairColor,shoes:a.boots,accessory:a.accent,headwear:a.helmet},features:{build:a.build,hair:a.hair,facialHair:a.facialHair,headwear:'none',eyewear:'none',wristwear:'none'}},root);rig.animate(0);
 const node=name=>root.getDescendants().find(n=>n.name===name),body=node('runner-body'),g=archerGeometry(w,body),broad=a.build==='strong'?1.1:a.build==='lean'?.91:1,cloth=w.material(a.suitColor,{roughness:.86}),dark=w.material(a.boots,{roughness:.76}),trim=w.material(a.accent,{metalness:.3,roughness:.44}),silver=w.material('#b7c3c4',{metalness:.75,roughness:.25}),gloves=w.material(a.gloves,{roughness:.82});
 const suitRings=[[.94,.215,.148],[1.08,.218,.15],[1.3,.23,.16],[1.47,.245,.152],[1.54,.21,.13],[1.61,.095,.08]];
 g.surface('pressure-suit-torso',(u,v)=>{const t=v*(suitRings.length-1),i=Math.min(suitRings.length-2,Math.floor(t)),a=suitRings[i],b=suitRings[i+1],k=t-i,angle=u*Math.PI*2,y=a[0]+(b[0]-a[0])*k;return[Math.sin(angle)*(a[1]+(b[1]-a[1])*k)*broad,y,Math.cos(angle)*(a[2]+(b[2]-a[2])*k)];},48,32,cloth,{closed:true});
 g.sweep('pressure-collar',[[0,1.54,0],[0,1.66,0]],[.095,.095],cloth);
 const pg=primitives(w,body);pg.box('life-support-backpack',[0,1.28,.23],[.34,.43,.18],cloth);pg.box('chest-control-pack',[0,1.29,-.188],[.21,.22,.055],dark);
 for(let i=0;i<3;i++)pg.box('suit-telemetry',[ -.055+i*.054,1.32,-.221],[.032,.018,.008],w.material(['#72b2b4','#d2c077','#ccd5d8'][i],{emissive:true}));
 const rings=[.98,1.08];for(const y of rings)g.ring('waist-pressure-ring',[0,y,0],.385,.018,trim).rotation.x=0;
 g.tube('oxygen-hose',[[.1,1.2,-.18],[.23,1.12,-.16],[.25,1.02,.04],[.15,1.09,.23]],.018,silver);
 for(const shoulder of root.getDescendants().filter(n=>n.name==='shoulder')){g.sweep('pressure-sleeve',[[0,.04,0],[0,-.12,0],[0,-.25,0]],[.083,.08,.059],cloth,{parent:shoulder,folds:.04});const elbow=shoulder.getChildren().find(n=>n.name==='elbow');if(elbow){g.sweep('forearm-suit',[[0,.02,0],[0,-.13,0],[0,-.22,0]],[.06,.065,.047],cloth,{parent:elbow,folds:.035});g.sweep('glove-cuff',[[0,-.20,0],[0,-.25,0]],[.052,.05],trim,{parent:elbow});const wrist=elbow.getChildren().find(n=>n.name==='wrist');g.ellipsoid('pressure-glove',[0,-.043,.003],[.086,.12,.064],gloves,wrist);}}
 for(const hip of root.getDescendants().filter(n=>n.name==='hip')){g.sweep('pressure-leg',[[0,.02,0],[0,-.2,0],[0,-.42,0]],[.109,.105,.077],cloth,{parent:hip,folds:.028});const knee=hip.getChildren().find(n=>n.name==='knee');g.sweep('boot-gaiter',[[0,0,0],[0,-.2,0],[0,-.41,0]],[.08,.081,.059],cloth,{parent:knee,folds:.035});const ankle=knee.getChildren().find(n=>n.name==='ankle');g.ellipsoid('pressure-boot',[0,-.04,-.07],[.163,.16,.29],dark,ankle);g.ellipsoid('boot-sole',[0,-.103,-.07],[.17,.035,.30],trim,ankle);}
 g.ring('helmet-lock',[0,1.64,-.025],.28,.045,silver).rotation.x=0;
 const helmetMat=w.material(a.helmet,{metalness:.4,roughness:.29});g.surface('helmet-shell',(u,v)=>{const phi=(u-.5)*Math.PI*1.22,t=v*Math.PI;return[Math.sin(phi)*Math.sin(t)*.175,1.82+Math.cos(t)*.222,-.035+Math.cos(phi)*Math.sin(t)*.205];},48,24,helmetMat,{parent:body,closed:true});
 // An open, inset front reveals the selected face and hair in the studio.
 const shell=body.getChildren().find(n=>n.name==='helmet-shell');shell.setEnabled(true);
 for(const side of[-1,1])g.ellipsoid('helmet-side',[side*.155,1.8,.002],[.075,.24,.29],helmetMat);
 g.ellipsoid('helmet-crown',[0,2.005,.015],[.30,.066,.28],helmetMat);g.ellipsoid('helmet-rear',[0,1.82,.145],[.29,.28,.08],helmetMat);
 g.tube('helmet-front-rim',[[-.145,1.69,-.12],[-.17,1.83,-.15],[-.13,1.99,-.15],[0,2.025,-.15],[.13,1.99,-.15],[.17,1.83,-.15],[.145,1.69,-.12]],.014,silver);
 const visor=w.material(design.visor==='gold'?'#d6b36a':a.visorColor,{metalness:design.visor==='gold'?.7:.2,roughness:.12,alpha:design.visor==='gold'?.62:.13});g.ellipsoid('curved-visor',[0,1.835,-.16],[.313,.312,.14],visor);
 if(a.suit==='explorer'||design.suitTrim==='expedition'){for(const side of[-1,1]){pg.box('expedition-shoulder',[side*.20,1.48,-.035],[.12,.09,.27],trim);g.tube('harness',[[side*.15,1,-.14],[side*.15,1.24,-.19],[side*.18,1.5,-.11]],.018,trim);}}
 if(a.suit==='retro'){for(const y of[1.06,1.41])g.ring('retro-metallic-band',[0,y,0],.42,.035,silver).rotation.x=0;}
 const patch=new B.DynamicTexture('crew-patch',128,scene,true),pc=patch.getContext();pc.fillStyle='#19364e';pc.fillRect(0,0,128,128);pc.strokeStyle='#ecc98c';pc.lineWidth=5;pc.beginPath();pc.arc(64,64,49,0,Math.PI*2);pc.stroke();pc.fillStyle='#ecc98c';pc.font='bold 24px sans-serif';pc.textAlign='center';pc.fillText(design.patch==='constellation'?'* . *':'RB',64,72);patch.update();const pm=new B.StandardMaterial('embroidered-patch',scene);pm.diffuseTexture=patch;const p=B.MeshBuilder.CreatePlane('mission-patch',{size:.075},scene);p.parent=body;p.position.set(-.12,1.44,-.17);p.material=pm;
 root.parent=parent;return{root,character,dispose(){rig.dispose();root.dispose();patch.dispose();pm.dispose();}};
}
