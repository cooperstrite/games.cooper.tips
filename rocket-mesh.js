import { ROCKET_COSMETICS } from './rocket-config.js';
import { createRocketMaterials, buildRocketStage, buildRocketVehicle } from './rocket-vehicle-geometry.js';
export { rocketEngineLayout } from './rocket-vehicle-geometry.js';
import { prepareRunnerAssets, buildRunnerMesh } from './arcade/runner-mesh.js';
import { archerGeometry } from './arcade/archer-geometry.js';
import { CharacterBuilder } from './arcade/characters.js';
export const prepareAstronautAssets=prepareRunnerAssets;
export function astronautCharacter(a){return new CharacterBuilder('rocket',a.suit).withColors({body:a.suitColor,skin:a.skin,hair:a.hairColor,eyes:a.eyes,facialHair:a.facialHairColor,accessory:a.accent,gloves:a.gloves,boots:a.boots,helmet:a.helmet,visor:a.visorColor}).withFeature('hair',a.hair).withFeature('facialHair',a.facialHair).withFeature('build',a.build).build();}
export function rocketPalette(design){const item=ROCKET_COSMETICS.find(c=>c.setting==='livery'&&c.value===design.livery);return item?item.colors:[design.bodyColor,design.accentColor];}
// One vehicle mesh implementation is shared by flight, debris and the studio.
export function rocketMaterials(w, design) { return createRocketMaterials(w, design, rocketPalette(design)); }
export function buildStage(w, stage, index, mats, parent) { return buildRocketStage(w, stage, index, mats, parent); }
export function buildRocketMesh(w, design, parent) { return buildRocketVehicle(w, design, parent, rocketMaterials(w, design)); }
function primitives(w,parent){const {B,scene}=w;
 const finish=(m,mat)=>{m.parent=parent;m.material=mat;m.receiveShadows=true;w.shadows?.addShadowCaster(m);return m;};
 return {cylinder(name,y,h,top,bottom,mat){const m=B.MeshBuilder.CreateCylinder(name,{height:h,diameterTop:top,diameterBottom:bottom,tessellation:64},scene);m.position.y=y;return finish(m,mat);},box(name,pos,scale,mat){const m=B.MeshBuilder.CreateBox(name,{size:1},scene);m.position.set(...pos);m.scaling.set(...scale);return finish(m,mat);},ring(name,y,d,t,mat){const m=B.MeshBuilder.CreateTorus(name,{diameter:d,thickness:t,tessellation:64},scene);m.position.y=y;return finish(m,mat);},sphere(name,pos,scale,mat){const m=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:24},scene);m.position.set(...pos);m.scaling.set(...scale);return finish(m,mat);},finish};}
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
