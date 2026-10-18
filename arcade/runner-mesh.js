import { prepareArcherAssets } from "./humanoid-mesh.js";
import { archerGeometry } from "./archer-geometry.js";
import { createArcherMaterials } from "./archer-materials.js";
import { runnerHeadGeometry } from "./runner-head.js";

let headAsset;
export async function prepareRunnerAssets() { headAsset = await prepareArcherAssets(); }

// A sports rig uses the shared anatomical head, surface tools, and PBR materials.
// Its appearance is independent of the archer's equipment and of the race rules.
export function buildRunnerMesh(world, character, root) {
  if (!headAsset) throw new Error("Prepare the runner assets before rendering");
  const { B, scene }=world, c=character.colors, f=character.features;
  const materials=createArcherMaterials(world), mat=(kind,color)=>materials.get(kind,color);
  const g=archerGeometry(world,root), {ellipsoid,sweep,tube,surface,finish}=g, TAU=Math.PI*2;
  const skin=mat("skin",c.skin), hair=mat("hair",c.hair), cloth=mat("cloth",c.body), bottoms=mat("cloth",c.bottoms), trim=mat("cloth",c.accessory), rubber=mat("leather","#dbe2dc");
  const broad=f.build==="strong"?1.10:f.build==="lean"?.91:1, long=character.key==="tracksuit";
  function joint(name,position,parent=root) { const node=new B.TransformNode(name,scene);node.parent=parent;node.position.set(...position);return node; }
  const body=joint("runner-body",[0,0,0]);
  // Balanced shoulders and hips, with a relaxed athletic fit for every build.
  const torso=[[.97,.183,.115],[1.08,.176,.112],[1.3,.183,.119],[1.47,.207,.112],[1.54,.185,.087],[1.59,.078,.068]];
  surface("performance-top",(u,v)=>{const t=v*(torso.length-1),i=Math.min(torso.length-2,Math.floor(t)),a=torso[i],b=torso[i+1],k=t-i,angle=u*TAU,y=a[0]+(b[0]-a[0])*k,fold=Math.sin(angle*8+y*20)*.002*Math.sin(v*Math.PI);return[Math.sin(angle)*((a[1]+(b[1]-a[1])*k)*broad+fold),y,Math.cos(angle)*(a[2]+(b[2]-a[2])*k+fold)-Math.max(0,(y-1.5)/.09)*.025];},48,36,cloth,{parent:body,closed:true,uvScale:[4,4]});
  ellipsoid("hips",[0,.95,0],[.40*broad,.25,.26],bottoms,body);
  for(const side of [-1,1])tube("top-side-stripe",[[side*.173*broad,1.01,-.043],[side*.176*broad,1.31,-.04],[side*.185*broad,1.51,-.033]],.009,trim,body);
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
    sweep("upper-leg",[[0,.055,0],[0,0,0],[side*.009,-.2,0],[0,-.43,0]],[.067,.088,.08,.058],long?bottoms:skin,{parent:hip});
    ellipsoid("knee",[0,0,0],[.12,.13,.12],long?bottoms:skin,knee);
    sweep("calf",[[0,0,0],[0,-.15,.012],[0,-.41,0]],[.058,.065,.036],long?bottoms:skin,{parent:knee});
    if(!long) sweep("running-shorts",[[0,.085,0],[side*.004,0,0],[side*.008,-.13,.005],[side*.01,character.key==="trail"?-.3:-.22,.008]],[.075,.105,.104,.094],bottoms,{parent:hip,folds:.035});
    tube("leg-stripe",[[side*.088,0,-.01],[side*.09,-.2,-.01]],.01,trim,hip);
    sweep("crew-sock",[[0,.09,0],[0,-.01,0]],[.04,.039],rubber,{parent:ankle});
    ellipsoid("running-shoe",[0,-.045,-.058],[.135,.10,.26],mat("cloth",c.shoes),ankle);
    ellipsoid("cushioned-sole",[0,-.085,-.06],[.143,.035,.275],rubber,ankle);
    for(let i=0;i<4;i++)tube("shoe-laces",[[-.035,-.002-i*.004,-.045-i*.018],[.035,-.002-i*.004,-.055-i*.018]],.0025,trim,ankle);
    legs.push({hip,knee,ankle,side});
    const shoulder=joint("shoulder",[side*.209*broad,1.49,0],body),elbow=joint("elbow",[side*.012,-.275,0],shoulder);
    sweep("upper-arm",[[0,.058,0],[0,.035,0],[0,-.015,0],[side*.012,-.09,0],[side*.014,-.19,.002],[side*.012,-.275,0]],[.004,.043,.061,.059,.047,.037],long?cloth:skin,{parent:shoulder});
    if(character.key==="trail")sweep("short-sleeve",[[0,.01,0],[side*.012,-.13,0]],[.068,.062],cloth,{parent:shoulder});
    ellipsoid("elbow",[0,0,0],[.077,.083,.077],long?cloth:skin,elbow);
    sweep("forearm",[[0,.012,0],[0,-.07,0],[0,-.16,0],[0,-.245,0]],[.037,.044,.034,.026],long?cloth:skin,{parent:elbow});
    const wrist=joint("wrist",[0,-.245,0],elbow);wrist.rotation.y=side*.25;
    ellipsoid("palm",[0,-.032,0],[.057,.075,.036],skin,wrist);
    for(let i=0;i<4;i++) {
      const x=(i-1.5)*.013,length=.034-Math.abs(i-1)*.003;
      tube("runner-finger",[[x,-.05,0],[x,-.05-length,.006],[x,-.05-length,.023],[x,-.055,.026]],.0065,skin,wrist);
    }
    tube("runner-thumb",[[side*.025,-.016,0],[side*.035,-.037,.014],[side*.019,-.055,.029]],.008,skin,wrist);
    if(f.wristwear==="bands" || (f.wristwear==="watch" && side<0)) {
      sweep("wristband",[[0,-.227,0],[0,-.25,0]],[.034,.034],trim,{parent:elbow});
      if(f.wristwear==="watch")ellipsoid("watch-face",[-.032,-.238,0],[.012,.032,.032],mat("eye","#163b46"),elbow);
    }
    arms.push({shoulder,elbow,side});
  }
  const headRoot=joint("runner-head",[0,-.18,0],body);
  const head=new B.Mesh("runner-anatomical-head",scene),data=new B.VertexData();
  Object.assign(data,runnerHeadGeometry(headAsset));
  data.normals=[];B.VertexData.ComputeNormals(data.positions,data.indices,data.normals);
  // Weld lighting across UV seams without changing the reusable source asset.
  const normalGroups=new Map();
  for(let i=0;i<data.positions.length;i+=3) {
    const key=[0,1,2].map(k=>Math.round(data.positions[i+k]*1e6)).join(":"),group=normalGroups.get(key)||[];
    group.push(i);normalGroups.set(key,group);
  }
  for(const group of normalGroups.values()) {
    const n=new B.Vector3();for(const i of group)n.addInPlace(B.Vector3.FromArray(data.normals,i));n.normalize();
    const values=n.asArray();for(const i of group)for(let k=0;k<3;k++)data.normals[i+k]=values[k];
  }
  data.applyToMesh(head);finish(head,skin,headRoot);
  function facePoint(x,y,offset=.001) {
    const p=data.positions,indices=data.indices;let z=Infinity;
    for(let i=0;i<indices.length;i+=3) {
      const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
      if(x<Math.min(p[a],p[b],p[c])||x>Math.max(p[a],p[b],p[c])||y<Math.min(p[a+1],p[b+1],p[c+1])||y>Math.max(p[a+1],p[b+1],p[c+1]))continue;
      const d=(p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);if(Math.abs(d)<1e-10)continue;
      const u=((p[b+1]-p[c+1])*(x-p[c])+(p[c]-p[b])*(y-p[c+1]))/d,v=((p[c+1]-p[a+1])*(x-p[c])+(p[a]-p[c])*(y-p[c+1]))/d;
      if(u>=0&&v>=0&&u+v<=1)z=Math.min(z,u*p[a+2]+v*p[b+2]+(1-u-v)*p[c+2]);
    }
    return[x,y,(Number.isFinite(z)?z:-.15)-offset];
  }
  for(const side of [-1,1]) {
    const [x,y,z]=headAsset.anchors[side<0?"r-eye":"l-eye"];
    ellipsoid("eye",[x,y,z],[.035,.032,.031],mat("eye","#d9d5c8"),headRoot);
    ellipsoid("iris",[x,y,z-.0155],[.013,.013,.0028],mat("eye",c.eyes),headRoot);
    ellipsoid("pupil",[x,y,z-.017],[.005,.005,.0015],mat("eye","#162129"),headRoot);
    for(let i=0;i<24;i++) {
      const t=i/23,bx=side*(.014+t*.043),by=1.983+Math.sin(t*Math.PI)*.005;
      tube("brow-hair",[facePoint(bx,by),facePoint(bx+side*.003,by+.0025)],.00065,hair,headRoot);
    }
  }
  // Scalp and beard shells follow the anatomical mesh, not an oversized sphere.
  function fittedShell(name, predicate, material, offset=.003) {
    const positions=new Float32Array(data.positions),indices=[];
    for(let i=0;i<data.indices.length;i+=3){const ids=data.indices.slice(i,i+3);if(ids.every(n=>predicate(positions[n*3],positions[n*3+1],positions[n*3+2])))indices.push(...ids);}
    for(let i=0;i<positions.length;i++)positions[i]+=data.normals[i]*offset;
    const d=new B.VertexData();d.positions=positions;d.normals=data.normals;d.uvs=data.uvs;d.indices=indices;const mesh=new B.Mesh(name,scene);d.applyToMesh(mesh);finish(mesh,material,headRoot);
  }
  if(f.hair!=="bald") {
    fittedShell("fitted-runner-hair",(x,y,z)=>y>1.915+Math.max(0,Math.min(1,(-z-.015)/.15))*.095,hair,.005);
    if(f.hair==="bob" || f.hair==="braids")for(const side of [-1,1])for(let i=0;i<(f.hair==="bob"?10:3);i++)tube("long-hair",Array.from({length:18},(_,j)=>{const t=j/17;return[side*(.09+Math.sin(t*25+i*2)*.006+i*.001),1.98-t*.25,.015+i*.006];}),f.hair==="bob"?.005:.008,hair,headRoot);
    if(f.hair==="ponytail")for(let i=0;i<20;i++) {
      const a=i/20*TAU;
      tube("tied-hair",[[Math.sin(a)*.018,2.01,.046+Math.cos(a)*.012],[Math.sin(a)*.027,2.02,.094+Math.cos(a)*.021],[Math.sin(a)*.023,1.91,.135+Math.cos(a)*.019],[Math.sin(a)*.009,1.76,.12+Math.cos(a)*.009]],.005,hair,headRoot);
    }
    if(f.hair==="bun")ellipsoid("hair-bun",[0,2.025,.062],[.082,.078,.08],hair,headRoot);
    if(f.hair==="curls")for(let i=0;i<50;i++){const a=i*2.4,t=.15+(i%8)/8*1.25;ellipsoid("hair-curl",[Math.sin(a)*Math.sin(t)*.104,1.955+Math.cos(t)*.143,-.04+Math.cos(a)*Math.sin(t)*.142],[.035,.03,.036],hair,headRoot);}
  }
  const beard=mat("hair",c.facialHair);
  if(["beard","goatee","stubble"].includes(f.facialHair))fittedShell("runner-beard",(x,y,z)=>y>1.84&&y<1.89+Math.min(Math.abs(x)/.075,1)*.05&&z<-.07&&!(Math.abs(x)<.028&&y>1.884)&&(f.facialHair!=="goatee"||Math.abs(x)<.029),beard,f.facialHair==="stubble"?.001:.005);
  if(["beard","mustache","goatee"].includes(f.facialHair))for(const side of [-1,1])tube("mustache",[facePoint(side*.002,1.905),facePoint(side*.015,1.905),facePoint(side*.029,1.899)],.003,beard,headRoot);
  if(f.headwear==="headband") {
    // Project the band onto the actual scalp instead of using a floating hoop.
    const rings=new Map();
    function scalpRadius(y,angle) {
      if(!rings.has(y)) {
        const segments=[],p=data.positions;
        for(let i=0;i<data.indices.length;i+=3) {
          const ids=data.indices.slice(i,i+3),points=[];
          for(let j=0;j<3;j++) {
            const a=ids[j]*3,b=ids[(j+1)%3]*3;
            if((p[a+1]>y)===(p[b+1]>y))continue;
            const t=(y-p[a+1])/(p[b+1]-p[a+1]);points.push([p[a]+t*(p[b]-p[a]),p[a+2]+t*(p[b+2]-p[a+2])+.05]);
          }
          if(points.length===2)segments.push(points);
        }
        rings.set(y,segments);
      }
      const dx=Math.sin(angle),dz=Math.cos(angle);let radius=0;
      for(const [a,b] of rings.get(y)) {
        const ex=b[0]-a[0],ez=b[1]-a[1],denom=dx*ez-dz*ex;if(Math.abs(denom)<1e-9)continue;
        const r=(a[0]*ez-a[1]*ex)/denom,t=(a[0]*dz-a[1]*dx)/denom;
        if(t>=0&&t<=1&&r>radius)radius=r;
      }
      return radius+(f.hair==="bald"?.0025:.009);
    }
    surface("running-headband",(u,v)=>{const a=u*TAU,y=2.022+(v-.5)*.024,r=scalpRadius(y,a);return[Math.sin(a)*r,y,-.05+Math.cos(a)*r];},64,6,mat("cloth",c.headwear),{parent:headRoot,closed:true});
  }
  if(f.headwear==="cap") {
    surface("running-cap",(u,v)=>{const a=u*TAU,t=v*Math.PI/2;return[Math.sin(a)*Math.sin(t)*.091,2.015+Math.cos(t)*.09,-.06+Math.cos(a)*Math.sin(t)*.123];},40,16,mat("cloth",c.headwear),{parent:headRoot,closed:true});
    ellipsoid("cap-visor",[0,2.014,-.17],[.211,.012,.19],mat("cloth",c.headwear),headRoot);
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
      body.rotation.x=stride?-.07:0;
      for(const {hip,knee,ankle,side} of legs){hip.rotation.x=swing*side*.75;knee.rotation.x=stride?-.12-Math.max(0,-swing*side)*1.1:0;ankle.rotation.x=-hip.rotation.x*.2-knee.rotation.x*.3;}
      for(const {shoulder,elbow,side} of arms){
        // Forward is -Z: positive elbow flex brings the hands toward the chest.
        shoulder.rotation.x=stride?-swing*side*.62:.02;
        shoulder.rotation.z=side*(stride?.16:.10);
        elbow.rotation.x=stride?1.25-swing*side*.18:.16;
      }
      // Pin the lower foot to the track, including when freezing mid-stride.
      body.position.y=0;body.computeWorldMatrix(true);
      const lowest=Math.min(...legs.map(({ankle})=>{ankle.computeWorldMatrix(true);return B.Vector3.TransformCoordinates(new B.Vector3(0,-.103,-.06),ankle.getWorldMatrix()).y;}));
      body.position.y=-lowest+(moving?.012:0);
    },
    dispose() { materials.dispose(); },
  };
}
