import { TUG_BREEDS } from "../cats-dogs-customization.js";
import { paintPetMesh } from "./pet-coat-materials.js";
// A rotatable studio model. Game art stays the default 2D view.
export function buildPetMesh(world, character) {
  const {B,scene,material}=world,root=new B.TransformNode(character.id,scene),c=character.colors,f=character.features;
  const cat=TUG_BREEDS[character.key].side==="cats",pit=character.key==="pitbull",seal=character.key==="siamese",upright=["corgi","husky"].includes(character.key),fluffy=character.key==="mainecoon";
  function ell(name,p,size,color,parent=root){const m=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:32},scene);m.parent=parent;m.position.set(...p);m.scaling.set(...size);m.material=material(color,{roughness:.85});world.shadows?.addShadowCaster(m);return m;}
  function tube(name,points,r,color,parent=root){const m=B.MeshBuilder.CreateTube(name,{path:points.map(p=>new B.Vector3(...p)),radius:r,tessellation:12,cap:B.Mesh.CAP_ALL},scene);m.parent=parent;m.material=material(color);return m;}
  function cone(name,p,height,bottom,top,color,parent=root){const m=B.MeshBuilder.CreateCylinder(name,{height,diameterBottom:bottom,diameterTop:top,tessellation:32},scene);m.parent=parent;m.position.set(...p);m.material=material(color);return m;}
  ell("soft-coat",[0,.94,0],[cat?.74:pit?.92:.84,1.13,.65],c.body);
  ell("chest",[0,1.02,-.24],[.51,.79,.23],c.belly);
  const head=new B.TransformNode("pet-head",scene);head.parent=root;head.position.set(0,1.78,-.07);
  ell("face",[0,0,0],[character.key==="british"?1.03:cat?.94:pit?1.01:.90,cat?.78:.8,.77],seal?c.dark:c.body,head);
  ell("chin",[0,-.21,-.22],[.52,.33,.42],c.belly,head);
  for(const sign of [-1,1]){
    const leg=ell("hind-leg",[sign*.3,.39,.01],[.31,.61,.34],seal?c.dark:c.body);leg.rotation.z=sign*-.25;
    ell("paw",[sign*.39,.14,-.13],[.35,.25,.44],seal?c.dark:c.belly);
    const arm=ell("front-leg",[sign*.36,1.04,-.29],[.23,.6,.29],c.body);arm.rotation.x=-.62;arm.rotation.z=sign*.2;
    ell("front-paw",[sign*.43,.87,-.5],[.3,.3,.34],seal?c.dark:c.belly);
    if(cat||upright){const ear=cone("pointed-ear",[sign*.34,.43,.015],upright?.65:.53,upright?.4:.35,.015,seal?c.dark:c.body,head);ear.rotation.z=-sign*.19;const inner=cone("ear-lining",[sign*.34,.43,-.075],.34,.19,.01,"#c38b83",head);inner.scaling.z=.24;inner.rotation.z=-sign*.19;if(fluffy)cone("ear-tuft",[sign*.39,.75,.02],.18,.08,0,c.dark,head);}
    else{const ear=ell("floppy-ear",[sign*.47,pit?.1:-.08,.03],[pit?.29:.32,pit?.39:.62,.19],c.dark,head);ear.rotation.z=sign*(pit?.56:.16);}
    ell("eye-white",[sign*.19,.04,-.338],[.25,.3,.11],"#fff7e8",head);
    ell("iris",[sign*.19,.04,-.394],[.135,.19,.052],c.eyes,head);
    ell("pupil",[sign*.19,.04,-.421],[cat?.045:.076,.126,.025],"#18242c",head);
    ell("eye-light",[sign*.19-.025,.09,-.437],[.035,.043,.015],"#ffffff",head);
    const brow=ell("eyebrow",[sign*.2,.235,-.29],[.29,.05,.07],c.dark,head);brow.rotation.z=sign*-.13;
    ell("muzzle",[sign*(cat?.12:.13),-.145,-.36],[cat?.31:.38,.25,cat?.25:.35],c.belly,head);
    if(cat)for(let i=0;i<3;i++)tube("whisker",[[sign*.2,-.15+i*.03,-.46],[sign*.43,-.13+i*.045,-.47],[sign*.64,-.2+i*.07,-.42]],.005,"#f5e9cf",head);
  }
  ell("nose",[0,-.095,cat?-.51:-.565],[cat?.14:.21,.12,.09],cat?"#ac7773":"#322629",head);
  tube("smile",[[-.19,-.23,-.46],[-.1,-.27,-.49],[0,-.25,-.51],[.1,-.27,-.49],[.19,-.23,-.46]],.012,c.dark,head);
  if(character.key==="tabby"||fluffy)for(const sign of [-1,1])for(let i=0;i<3;i++){const stripe=ell("tabby-mark",[sign*(.1+i*.12),.29-i*.03,-.27],[.055,.19,.07],c.dark,head);stripe.rotation.z=-sign*.35;}
  if(fluffy)for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const tuft=ell("ruff",[Math.cos(a)*.32,1.38+Math.sin(a)*.13,-.02],[.25,.45,.28],i%3?c.body:c.belly);tuft.rotation.z=-Math.cos(a)*.5;}
  if(character.key==="calico"){ell("calico-face-patch",[-.3,.15,-.15],[.3,.42,.46],"#c97d3a",head);ell("calico-ear-patch",[.29,.25,.08],[.31,.29,.55],c.dark,head);ell("calico-body-patch",[.29,.96,.02],[.22,.45,.57],"#c97d3a");}
  if(pit||upright)ell("white-blaze",[0,.25,-.26],[upright?.18:.1,.34,.16],c.belly,head);
  const tail=new B.TransformNode("tail",scene);tail.parent=root;tail.position.set(0,.59,.27);
  const tailPath=cat?[[0,0,0],[.3,.02,.13],[.58,.16,.15],[.73,.43,.1],[.63,.69,.1]]:[[0,0,0],[.25,.08,.2],[.52,.26,.23],[.65,.46,.18]];
  const smoothTail=B.Curve3.CreateCatmullRomSpline(tailPath.map(p=>new B.Vector3(...p)),12).getPoints().map(p=>[p.x,p.y,p.z]);
  tube("tail-coat",smoothTail,fluffy?.18:cat?.085:character.key==="golden"||character.key==="husky"?.15:.09,seal?c.dark:c.body,tail);
  const band=cone("bandana",[0,1.43,-.01],.12,.63,.61,cat?"#cf7455":"#428e96");band.scaling.z=.85;
  if(f.hat==="cap"){ell("cap",[0,.36,.02],[.73,.23,.66],c.accessory,head);ell("cap-brim",[0,.30,-.33],[.82,.06,.45],c.accessory,head);}
  if(f.hat==="crown"){cone("gold-crown",[0,.46,.03],.18,.62,.66,"#e7b956",head);for(let i=0;i<7;i++){const a=i/7*Math.PI*2;cone("crown-tip",[Math.cos(a)*.28,.63,Math.sin(a)*.28+.03],.25,.16,.01,"#f1cd70",head);}ell("crown-jewel",[0,.46,-.312],[.10,.12,.04],c.accessory,head);}
  if(f.hat==="wizard"){ell("wizard-brim",[0,.36,.03],[.95,.06,.85],c.accessory,head);cone("wizard-hat",[0,.69,.03],.72,.63,0,c.accessory,head);ell("hat-star",[0,.6,-.24],[.1,.12,.03],"#f4d381",head);}
  if(f.hat==="flowers")for(let i=0;i<10;i++){const a=i/10*Math.PI*2,x=Math.cos(a)*.34,z=Math.sin(a)*.3;for(let j=0;j<5;j++)ell("petal",[x+Math.cos(j/5*Math.PI*2)*.055,.4,z+Math.sin(j/5*Math.PI*2)*.055],[.08,.035,.08],i%2?c.accessory:"#fff0cb",head);ell("flower-center",[x,.425,z],[.06,.03,.06],"#e8bd55",head);}
  if(f.eyewear!=="none"){
    for(const sign of [-1,1]){const points=Array.from({length:33},(_,i)=>[sign*.19+Math.cos(i/32*Math.PI*2)*.155,.04+Math.sin(i/32*Math.PI*2)*.18,-.46]);tube("glasses-frame",points,.015,c.accessory,head);if(f.eyewear==="shades")ell("sunglass-lens",[sign*.19,.04,-.455],[.29,.34,.025],"#243745",head);tube("glasses-arm",[[sign*.34,.07,-.44],[sign*.44,.1,-.1]],.012,c.accessory,head);}tube("glasses-bridge",[[-.04,.07,-.46],[0,.095,-.48],[.04,.07,-.46]],.014,c.accessory,head);
  }
  if(f.charm==="bow"){for(const sign of [-1,1]){const bow=ell("bow",[sign*.11,1.38,-.31],[.23,.17,.1],c.accessory);bow.rotation.z=sign*.3;}ell("bow-knot",[0,1.38,-.36],[.1,.12,.08],"#f4dfb3");}
  if(f.charm==="medal"){tube("medal-ribbon",[[-.15,1.43,-.3],[0,1.12,-.36],[.15,1.43,-.3]],.025,c.accessory);ell("gold-medal",[0,1.11,-.38],[.23,.26,.05],"#f3cb6b");}
  const disposeCoat=paintPetMesh(world,root,character,cat);
  return {root,animate(time){tail.rotation.y=Math.sin(time*2.5)*.18;head.rotation.z=Math.sin(time*.8)*.025;},dispose(){root.dispose(false);disposeCoat();}};
}
