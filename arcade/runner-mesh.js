import { prepareArcherAssets } from "./humanoid-mesh.js";
import { archerGeometry } from "./archer-geometry.js";
import { createArcherMaterials } from "./archer-materials.js";

let headAsset;
export async function prepareRunnerAssets() { headAsset = await prepareArcherAssets(); }
const faceMaps = new WeakMap();

// A sports rig uses the shared anatomical head, surface tools, and PBR materials.
// Its appearance is independent of the archer's equipment and of the race rules.
export function buildRunnerMesh(world, character, root) {
  if (!headAsset) throw new Error("Prepare the runner assets before rendering");
  const { B, scene }=world, c=character.colors, f=character.features;
  const materials=createArcherMaterials(world), mat=(kind,color)=>materials.get(kind,color);
  const g=archerGeometry(world,root), {ellipsoid,sweep,tube,surface,finish}=g, TAU=Math.PI*2;
  const skin=mat("skin",c.skin), hair=mat("hair",c.hair), cloth=mat("cloth",c.body), bottoms=mat("cloth",c.bottoms), trim=mat("cloth",c.accessory), rubber=mat("leather","#dbe2dc");
  const broad=f.build==="strong"?1.13:f.build==="lean"?.88:1, long=character.key==="tracksuit";
  function joint(name,position,parent=root) { const node=new B.TransformNode(name,scene);node.parent=parent;node.position.set(...position);return node; }
  const body=joint("runner-body",[0,0,0]);
  const torso=[[.97,.17,.11],[1.08,.16,.105],[1.3,.19,.12],[1.48,.235,.12],[1.55,.21,.095],[1.59,.08,.066]];
  surface("performance-top",(u,v)=>{const t=v*(torso.length-1),i=Math.min(torso.length-2,Math.floor(t)),a=torso[i],b=torso[i+1],k=t-i,angle=u*TAU,y=a[0]+(b[0]-a[0])*k,fold=Math.sin(angle*8+y*20)*.003*Math.sin(v*Math.PI);return[Math.sin(angle)*((a[1]+(b[1]-a[1])*k)*broad+fold),y,Math.cos(angle)*(a[2]+(b[2]-a[2])*k+fold)];},40,30,cloth,{parent:body,closed:true,uvScale:[4,4]});
  sweep("neck",[[0,1.55,0],[0,1.69,-.025]],[.073,.063],skin,{parent:body});
  ellipsoid("hips",[0,.98,0],[.36*broad,.2,.23],bottoms,body);
  for(const side of [-1,1])tube("top-side-stripe",[[side*.166*broad,1.01,-.044],[side*.19*broad,1.31,-.055],[side*.218*broad,1.51,-.04]],.012,trim,body);
  if(long) tube("zipper",[[0,1.01,-.11],[0,1.3,-.125],[0,1.55,-.09]],.0035,trim,body);
  if(character.key==="trail") {
    ellipsoid("hydration-pack",[0,1.31,.15],[.29,.42,.14],bottoms,body);
    for(const side of [-1,1]) tube("pack-shoulder-strap",[[side*.11,1.04,-.095],[side*.14,1.35,-.13],[side*.16,1.53,-.065],[side*.14,1.5,.13]],.022,bottoms,body);
    tube("chest-strap",[[-.14,1.33,-.137],[.14,1.33,-.137]],.009,trim,body);
  } else {
    const bib=B.MeshBuilder.CreatePlane("race-bib",{width:.13,height:.12},scene);bib.position.set(0,1.29,-.132);finish(bib,mat("cloth","#f2f1de"),body);
    // The number is geometry, keeping the model local and crisp when zoomed.
    tube("bib-number-zero",[[-.04,1.33,-.136],[-.014,1.33,-.136],[-.014,1.26,-.136],[-.04,1.26,-.136],[-.04,1.33,-.136]],.003,mat("cloth","#263b45"),body,undefined,true);
    tube("bib-number-one",[[.014,1.32,-.136],[.025,1.33,-.136],[.025,1.26,-.136]],.003,mat("cloth","#263b45"),body,undefined,true);
  }
  const legs=[],arms=[];
  for(const side of [-1,1]) {
    const hip=joint("hip",[side*.095*broad,.96,0],body),knee=joint("knee",[0,-.43,0],hip),ankle=joint("ankle",[0,-.41,0],knee);
    sweep("upper-leg",[[0,.01,0],[side*.009,-.2,0],[0,-.43,0]],[.088,.08,.058],long?bottoms:skin,{parent:hip});
    ellipsoid("knee",[0,0,0],[.12,.13,.12],long?bottoms:skin,knee);
    sweep("calf",[[0,0,0],[0,-.15,.012],[0,-.41,0]],[.058,.065,.036],long?bottoms:skin,{parent:knee});
    if(!long) sweep("running-shorts",[[0,.03,0],[side*.008,-.13,.005],[side*.01,character.key==="trail"?-.3:-.22,.008]],[.105,.104,.094],bottoms,{parent:hip,folds:.035});
    tube("leg-stripe",[[side*.088,0,-.01],[side*.09,-.2,-.01]],.01,trim,hip);
    sweep("crew-sock",[[0,.09,0],[0,-.01,0]],[.04,.039],rubber,{parent:ankle});
    ellipsoid("running-shoe",[0,-.045,-.058],[.135,.10,.26],mat("cloth",c.shoes),ankle);
    ellipsoid("cushioned-sole",[0,-.085,-.06],[.143,.035,.275],rubber,ankle);
    for(let i=0;i<4;i++)tube("shoe-laces",[[-.035,-.002-i*.004,-.045-i*.018],[.035,-.002-i*.004,-.055-i*.018]],.0025,trim,ankle);
    legs.push({hip,knee,ankle,side});
    const shoulder=joint("shoulder",[side*.23*broad,1.5,0],body),elbow=joint("elbow",[side*.015,-.28,0],shoulder);
    ellipsoid("shoulder",[0,0,0],[.155,.155,.145],long?cloth:skin,shoulder);
    sweep("upper-arm",[[0,0,0],[side*.018,-.13,0],[side*.015,-.28,0]],[.071,.064,.045],long?cloth:skin,{parent:shoulder});
    if(character.key==="trail")sweep("short-sleeve",[[0,.015,0],[side*.018,-.13,0]],[.08,.074],cloth,{parent:shoulder});
    ellipsoid("elbow",[0,0,0],[.09,.10,.09],long?cloth:skin,elbow);
    sweep("forearm",[[0,0,0],[0,-.1,0],[0,-.25,0]],[.044,.049,.029],long?cloth:skin,{parent:elbow});
    ellipsoid("palm",[0,-.288,-.004],[.055,.077,.039],skin,elbow);
    for(let i=0;i<4;i++)tube("runner-finger",[[(i-1.5)*.011,-.305,-.008],[(i-1.5)*.011,-.333,-.019],[(i-1.5)*.011,-.318,-.034]],.006,skin,elbow);
    tube("runner-thumb",[[side*.025,-.276,0],[side*.032,-.30,-.025],[side*.013,-.312,-.032]],.008,skin,elbow);
    if(f.wristwear==="bands" || (f.wristwear==="watch" && side<0)) {
      sweep("wristband",[[0,-.227,0],[0,-.25,0]],[.034,.034],trim,{parent:elbow});
      if(f.wristwear==="watch")ellipsoid("watch-face",[-.032,-.238,0],[.012,.032,.032],mat("eye","#163b46"),elbow);
    }
    arms.push({shoulder,elbow,side});
  }
  const headRoot=joint("runner-head",[0,-.12,0],body);
  const head=new B.Mesh("runner-anatomical-head",scene),data=new B.VertexData();
  data.positions=headAsset.positions;data.normals=headAsset.normals;data.uvs=headAsset.uvs;data.indices=headAsset.indices;data.applyToMesh(head);
  const face=mat("face",c.skin);
  if(!faceMaps.has(world)) { const color=new B.Texture(new URL("../assets/archer/skin-color.png",import.meta.url).href,scene),normal=new B.Texture(new URL("../assets/archer/skin-normal.png",import.meta.url).href,scene);normal.gammaSpace=false;normal.level=.5;faceMaps.set(world,{color,normal}); }
  face.albedoTexture=faceMaps.get(world).color;face.bumpTexture=faceMaps.get(world).normal;finish(head,face,headRoot);
  for(const side of [-1,1]) {
    const [x,y,z]=headAsset.anchors[side<0?"r-eye":"l-eye"];
    ellipsoid("eye",[x,y,z],[.035,.032,.031],mat("eye","#e2dfd3"),headRoot);
    ellipsoid("iris",[x,y,z-.014],[.012,.012,.0025],mat("eye",c.eyes),headRoot);
    ellipsoid("pupil",[x,y,z-.016],[.005,.005,.001],mat("eye","#162129"),headRoot);
    tube("brow",[[side*.016,1.986,-.152],[side*.038,1.991,-.154],[side*.056,1.985,-.141]],.0025,hair,headRoot);
  }
  // Scalp and beard shells follow the anatomical mesh, not an oversized sphere.
  function fittedShell(name, predicate, material, offset=.003) {
    const positions=new Float32Array(headAsset.positions),indices=[];
    for(let i=0;i<headAsset.indices.length;i+=3){const ids=Array.from(headAsset.indices.slice(i,i+3));if(ids.every(n=>predicate(positions[n*3],positions[n*3+1],positions[n*3+2])))indices.push(...ids);}
    for(let i=0;i<positions.length;i++)positions[i]+=headAsset.normals[i]*offset;
    const d=new B.VertexData();d.positions=positions;d.normals=headAsset.normals;d.uvs=headAsset.uvs;d.indices=indices;const mesh=new B.Mesh(name,scene);d.applyToMesh(mesh);finish(mesh,material,headRoot);
  }
  if(f.hair!=="bald") {
    fittedShell("fitted-runner-hair",(x,y,z)=>y>1.915+Math.max(0,Math.min(1,(-z-.015)/.15))*.095,hair,.005);
    if(f.hair==="bob" || f.hair==="braids")for(const side of [-1,1])for(let i=0;i<(f.hair==="bob"?10:3);i++)tube("long-hair",Array.from({length:18},(_,j)=>{const t=j/17;return[side*(.09+Math.sin(t*25+i*2)*.006+i*.001),1.98-t*.25,.015+i*.006];}),f.hair==="bob"?.005:.008,hair,headRoot);
    if(f.hair==="ponytail" || f.hair==="bun") {const bun=f.hair==="bun";for(let i=0;i<20;i++){const a=i/20*TAU;tube("tied-hair",[[Math.sin(a)*.03,2.035,.08+Math.cos(a)*.018],[Math.sin(a)*.04,2.08,.13+Math.cos(a)*.03],[Math.sin(a)*.02,bun?2.045:1.7,.13+Math.cos(a)*.02]],.005,hair,headRoot);} }
    if(f.hair==="curls")for(let i=0;i<50;i++){const a=i*2.4,t=.15+(i%8)/8*1.25;ellipsoid("hair-curl",[Math.sin(a)*Math.sin(t)*.104,1.955+Math.cos(t)*.143,-.04+Math.cos(a)*Math.sin(t)*.142],[.035,.03,.036],hair,headRoot);}
  }
  const beard=mat("hair",c.facialHair);
  if(["beard","goatee","stubble"].includes(f.facialHair))fittedShell("runner-beard",(x,y,z)=>y>1.84&&y<1.89+Math.min(Math.abs(x)/.075,1)*.05&&z<-.07&&!(Math.abs(x)<.028&&y>1.884)&&(f.facialHair!=="goatee"||Math.abs(x)<.029),beard,f.facialHair==="stubble"?.001:.005);
  if(["beard","mustache","goatee"].includes(f.facialHair))for(const side of [-1,1])tube("mustache",[[side*.002,1.905,-.179],[side*.015,1.905,-.176],[side*.029,1.899,-.165]],.003,beard,headRoot);
  if(f.headwear==="headband")surface("running-headband",(u,v)=>{const a=u*TAU;return[Math.sin(a)*.103,2.015+(v-.5)*.027,-.043+Math.cos(a)*.125];},48,4,mat("cloth",c.headwear),{parent:headRoot,closed:true});
  if(f.headwear==="cap") {
    surface("running-cap",(u,v)=>{const a=u*TAU,t=v*Math.PI/2;return[Math.sin(a)*Math.sin(t)*.111,2.015+Math.cos(t)*.09,-.04+Math.cos(a)*Math.sin(t)*.135];},40,16,mat("cloth",c.headwear),{parent:headRoot,closed:true});
    ellipsoid("cap-visor",[0,2.014,-.17],[.235,.012,.2],mat("cloth",c.headwear),headRoot);
  }
  if(f.eyewear!=="none") {
    for(const side of [-1,1]) {const x=side*.034,y=1.96,z=-.174;
      tube("sport-glasses-frame",[[x-.024,y+.014,z],[x+.024,y+.014,z],[x+.021,y-.016,z],[x-.021,y-.016,z],[x-.024,y+.014,z]],.0023,trim,headRoot);
      tube("glasses-arm",[[side*.058,y,z],[side*.093,y,-.02]],.002,trim,headRoot);
      if(f.eyewear==="sunglasses")ellipsoid("sunglass-lens",[x,y,z+.001],[.043,.025,.004],mat("eye","#203c47"),headRoot);
    }tube("glasses-bridge",[[-.011,1.966,-.174],[.011,1.966,-.174]],.002,trim,headRoot);
  }
  // Batch only siblings: limbs retain their individual pivot nodes for animation.
  const batches=new Map();
  for(const mesh of root.getChildMeshes()) {if(mesh===head)continue;const key=`${mesh.parent.uniqueId}:${mesh.material.uniqueId}`;const list=batches.get(key)||[];list.push(mesh);batches.set(key,list);}
  for(const meshes of batches.values())if(meshes.length>1){const parent=meshes[0].parent;parent.computeWorldMatrix(true);const inverse=parent.getWorldMatrix().clone().invert();const merged=B.Mesh.MergeMeshes(meshes,true,true);if(merged){merged.bakeTransformIntoVertices(inverse);merged.parent=parent;merged.receiveShadows=true;world.shadows?.addShadowCaster(merged);}}
  return {
    animate(time, { stride=0, moving=false }={}) {
      const swing=stride ? Math.sin(stride) : 0;
      for(const {hip,knee,ankle,side} of legs){hip.rotation.x=swing*side*.75;knee.rotation.x=stride?-.12-Math.max(0,-swing*side)*1.1:0;ankle.rotation.x=-hip.rotation.x*.2-knee.rotation.x*.3;}
      for(const {shoulder,elbow,side} of arms){shoulder.rotation.x=stride?-swing*side*.55:.08;shoulder.rotation.z=side*.08;elbow.rotation.x=stride?-1.1:-.18;}
      // Pin the lower foot to the track, including when freezing mid-stride.
      body.position.y=0;body.computeWorldMatrix(true);
      const lowest=Math.min(...legs.map(({ankle})=>{ankle.computeWorldMatrix(true);return B.Vector3.TransformCoordinates(new B.Vector3(0,-.103,-.06),ankle.getWorldMatrix()).y;}));
      body.position.y=-lowest+(moving?.012:0);
    },
    dispose() { materials.dispose(); },
  };
}
