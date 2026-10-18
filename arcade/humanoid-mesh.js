import { archerGeometry } from "./archer-geometry.js";
import { createArcherMaterials } from "./archer-materials.js";

let headAsset, loadingHead;
export function prepareArcherAssets() {
  if (headAsset) return Promise.resolve(headAsset);
  if (!loadingHead) loadingHead = Promise.all([
    fetch(new URL("../assets/archer/head.json", import.meta.url)).then(r => { if (!r.ok) throw new Error("Head metadata unavailable"); return r.json(); }),
    fetch(new URL("../assets/archer/head.bin", import.meta.url)).then(r => { if (!r.ok) throw new Error("Head mesh unavailable"); return r.arrayBuffer(); }),
  ]).then(([meta, buffer]) => {
    const n = meta.vertexCount;
    if (buffer.byteLength !== n * 32 + meta.indexCount * 2) throw new Error("Incomplete head mesh");
    headAsset = { ...meta, positions:new Float32Array(buffer,0,n*3), normals:new Float32Array(buffer,n*12,n*3), uvs:new Float32Array(buffer,n*24,n*2), indices:new Uint16Array(buffer,n*32,meta.indexCount) };
    return headAsset;
  }).catch(error => { loadingHead = null; throw error; });
  return loadingHead;
}

// Anatomical mesh + fitted, independently recolorable costume pieces. Cosmetics
// never enter the archery simulation; 2D and 3D consume the same saved appearance.
export function buildArcherMesh(world, character, { root }) {
  if (!headAsset) throw new Error("Prepare the archer assets before building a character");
  const { B, scene } = world, c = character.colors;
  const f = { hair:"short", facialHair:"none", headwear:"hood", faceShape:"oval", faceDetail:"none", faceAccessory:"none", bowStyle:"longbow", arrowDesign:"ranger", ...character.features };
  const materials = createArcherMaterials(world), mat = (kind,color) => materials.get(kind,color);
  const g = archerGeometry(world, root), { surface, tube, sweep, ellipsoid, band, ring, finish } = g;
  const TAU = Math.PI * 2, mix = (a,b,t) => a+(b-a)*t;
  const shade = (color,k) => B.Color3.FromHexString(color).scale(k).toHexString();
  const outfit = c.body || "#40756a", trimColor = c.accessory || "#d4b47b", skinColor = c.skin || "#dfae88", hairColor = c.hair || "#604634";
  const cloth = mat("cloth",outfit), lining = mat("cloth",shade(outfit,.54)), leather = mat("leather","#654834"), darkLeather = mat("leather","#352b26"), trim = mat("metal",trimColor), thread = mat("cloth",shade(trimColor,.77));
  const skin = mat("skin",skinColor), hair = mat("hair",hairColor), beard = mat("hair",c.facialHair || hairColor), boot = mat("leather",c.boots || "#2b3839");
  const headRoot = new B.TransformNode("archer-head-rig",scene); headRoot.parent=root; headRoot.rotation.y=-.32;
  const head = new B.Mesh("anatomical-head",scene), headData = new B.VertexData();
  headData.positions = new Float32Array(headAsset.positions); headData.indices = headAsset.indices; headData.uvs = headAsset.uvs;
  // Sculpt the lower face, leaving eye sockets and the scalp aligned with gear.
  for (let i=0;i<headData.positions.length;i+=3) {
    const y=headData.positions[i+1], weight=Math.max(0,1-Math.abs(y-1.885)/.075);
    headData.positions[i] *= 1+weight*(f.faceShape==="round"?.14:f.faceShape==="angular"?.08:0);
    if(f.faceShape==="round") headData.positions[i+2]-=weight*.006;
    if(f.faceShape==="angular") headData.positions[i+1]-=weight*.004;
  }
  headData.normals=[]; B.VertexData.ComputeNormals(headData.positions,headData.indices,headData.normals); headData.applyToMesh(head); finish(head,skin,headRoot);
  // Use the original smooth normals when the face has not been morphed.
  if(f.faceShape==="oval") head.setVerticesData(B.VertexBuffer.NormalKind,headAsset.normals);
  const faceSkin = mat("face",skinColor); faceSkin.roughness=.6; faceSkin.subSurface.isTranslucencyEnabled=true; faceSkin.subSurface.translucencyIntensity=.12;
  const faceMaps = getFaceTextures(world); faceSkin.albedoTexture=faceMaps.color; faceSkin.bumpTexture=faceMaps.normal; head.material=faceSkin;
  function facePoint(x,y,offset=.0015) {
    // Intersect the front surface, rather than a nearby vertex inside a nostril
    // or behind a lip. This also keeps scars and brows fitted to face morphs.
    const p=headData.positions,indices=headData.indices;let z=Infinity;
    for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
      if(x<Math.min(p[a],p[b],p[c])||x>Math.max(p[a],p[b],p[c])||y<Math.min(p[a+1],p[b+1],p[c+1])||y>Math.max(p[a+1],p[b+1],p[c+1]))continue;
      const d=(p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);if(Math.abs(d)<1e-10)continue;
      const u=((p[b+1]-p[c+1])*(x-p[c])+(p[c]-p[b])*(y-p[c+1]))/d,v=((p[c+1]-p[a+1])*(x-p[c])+(p[a]-p[c])*(y-p[c+1]))/d;
      if(u>=0&&v>=0&&u+v<=1)z=Math.min(z,u*p[a+2]+v*p[b+2]+(1-u-v)*p[c+2]);
    }
    return [x,y,(Number.isFinite(z)?z:-.15)-offset];
  }
  for (const side of [-1,1]) {
    const p=headAsset.anchors[side<0?"r-eye":"l-eye"], ex=p[0], ey=p[1], ez=p[2];
    ellipsoid("eyeball",[ex,ey,ez],[.035,.032,.031],mat("eye","#dcd9cd"),headRoot);
    ellipsoid("iris",[ex+.002,ey,ez-.014],[.012,.012,.0025],mat("eye",c.eyes || "#79502e"),headRoot);
    ellipsoid("pupil",[ex+.002,ey,ez-.0154],[.0053,.0053,.001],mat("eye","#131517"),headRoot);
    for(let i=0;i<18;i++) { const a=i/18*TAU; tube("iris-fiber",[[ex+.002+Math.cos(a)*.0027,ey+Math.sin(a)*.0027,ez-.0155],[ex+.002+Math.cos(a)*.0055,ey+Math.sin(a)*.0055,ez-.015]],.00025,mat("eye",shade(c.eyes||"#79502e",i%2?.65:1.2)),headRoot); }
    for(let i=0;i<32;i++) { const t=i/31,x=side*(.014+t*.043), y=1.983+Math.sin(t*Math.PI)*.005; tube("eyebrow-hair",[facePoint(x,y),facePoint(x+side*.004,y+.004)],.0007,hair,headRoot); }
  }
  if(f.faceDetail==="freckles") for(let side of [-1,1]) for(let i=0;i<18;i++) { const x=side*(.025+(i%6)*.006), y=1.937-Math.floor(i/6)*.005; ellipsoid("freckle",facePoint(x,y),[.0017,.0014,.001],mat("skin",shade(skinColor,.55)),headRoot); }
  if(f.faceDetail==="scar") tube("adventure-scar",Array.from({length:12},(_,i)=>facePoint(.052+Math.sin(i/11*Math.PI)*.003,1.99-i/11*.066)),.001,mat("skin",shade(skinColor,.78)),headRoot);

  // Fitted torso: shaped shoulders, waist and layered overlapping cloth panels.
  const profile=[[1.12,.18,.115],[1.2,.172,.115],[1.34,.18,.12],[1.48,.225,.135],[1.61,.25,.127],[1.69,.22,.105],[1.75,.085,.072]];
  surface("tailored-tunic",(u,v)=>{
    const t=v*(profile.length-1),i=Math.min(profile.length-2,Math.floor(t)),a=profile[i],b=profile[i+1],q=t-i,angle=u*TAU;
    const y=mix(a[0],b[0],q), fold=.005*Math.sin(angle*10+y*17)*Math.sin(v*Math.PI);
    return [Math.sin(angle)*(mix(a[1],b[1],q)+fold),y,Math.cos(angle)*(mix(a[2],b[2],q)+fold)];
  },64,54,cloth,{uvScale:[6,5],closed:true});
  surface("gathered-standing-collar",(u,v)=>{const a=u*TAU,fold=.003*Math.sin(a*8+v*12);return[Math.sin(a)*(.093+fold),1.725+v*.105,-.02+Math.cos(a)*(.092+fold)];},48,20,lining,{uvScale:[3,2],closed:true});
  for(let i=0;i<3;i++)tube("collar-fold",Array.from({length:25},(_,j)=>{const a=j/24*TAU;return[Math.sin(a)*.096,1.75+i*.026+Math.sin(a*3)*.003,-.02+Math.cos(a)*.096];}),.0025,cloth);
  // Leather cuirass leaves the sleeves and the coat color visible.
  surface("fitted-leather-cuirass",(u,v)=>{
    const a=(u-.5)*Math.PI*1.12, y=1.24+v*.39, w=.184+Math.sin(v*Math.PI/2)*.049;
    return [Math.sin(a)*w,y,-Math.cos(a)*(.127+Math.sin(v*Math.PI)*.026)-.005];
  },32,28,character.key==="knight"?trim:mat("leather",shade(outfit,.7)),{uvScale:[3,3]});
  for(const side of [-1,1]) {
    band("cuirass-bound-edge",[[side*.175,1.24,-.062],[side*.21,1.43,-.075],[side*.214,1.63,-.065]],.012,leather);
    tube("chest-panel-seam",[[side*.06,1.25,-.137],[side*.11,1.42,-.154],[side*.13,1.59,-.135]],.0016,thread);
    for(let i=0;i<10;i++) tube("chest-stitch",[[side*(.075+i*.004),1.29+i*.027,-.15],[side*(.078+i*.004),1.296+i*.027,-.151]],.0007,thread);
  }
  // Split coat tails, with an open center and uneven folds instead of a cylinder.
  const tailLength=character.key==="scout"?.35:.58;
  for(const side of [-1,1]) {
    surface("split-coat-tail",(u,v)=>{
      const angle=side*(.25+u*2.65), radius=.205+v*.095, fold=Math.sin(u*20+v*2)*.012*v;
      return [Math.sin(angle)*(radius+fold),1.22-v*tailLength+Math.sin(u*Math.PI)*.025*v, -Math.cos(angle)*(radius*.75+fold)+v*.035];
    },32,32,cloth,{uvScale:[3,4]});
    tube("coat-hem",Array.from({length:20},(_,i)=>{const a=side*(.25+i/19*2.65);return[Math.sin(a)*.30,1.22-tailLength+Math.sin(i/19*Math.PI)*.025,-Math.cos(a)*.225+.035];}),.0045,leather);
  }
  if(character.key!=="scout") {
    surface("folded-back-mantle",(u,v)=>{ const x=(u-.5)*(.43+v*.28); return [x,1.7-v*.71, .13+v*.07+Math.sin(u*22+v*2)*.022*v]; },36,40,lining,{uvScale:[4,5]});
    tube("mantle-hem",Array.from({length:18},(_,i)=>{const u=i/17;return[(u-.5)*.71,.99,.2+Math.sin(u*22+2)*.022];}),.004,thread);
  }
  // Relaxed, braced stance; gathered trousers and shaped leather boots.
  for(const side of [-1,1]) {
    const hip=[side*.105,1.13,.01],knee=[side*.17,.65,side<0?-.025:.045],ankle=[side*.2,.16,side<0?-.04:.07];
    sweep("gathered-trousers",[hip,[side*.14,.91,.015],knee,ankle],[.103,.101,.078,.068,.055],mat("cloth","#373b37"),{flatten:.9,folds:.065});
    sweep("riding-boot-shaft",[[ankle[0],.14,ankle[2]],[side*.19,.34,ankle[2]], [side*.177,.57,knee[2]]],[.069,.062,.085],boot,{flatten:.91,folds:.035});
    const foot=ellipsoid("shaped-boot-toe",[ankle[0],.095,ankle[2]-.067],[.16,.13,.31],boot); foot.rotation.y=side*-.12;
    const sole=ellipsoid("stitched-boot-sole",[ankle[0],.04,ankle[2]-.067],[.168,.035,.323],darkLeather);sole.rotation.y=side*-.12;
    for(const y of [.23,.47,.55]) { const p=[mix(ankle[0],side*.177,(y-.14)/.43),y,mix(ankle[2],knee[2],(y-.14)/.43)];
      surface("boot-strap",(u,v)=>[p[0]+Math.sin(u*TAU)*.081,p[1]+(v-.5)*.024,p[2]+Math.cos(u*TAU)*.072],32,2,leather,{closed:true});
      buckle([p[0],p[1],p[2]-.075],.035,.027);
    }
    tube("boot-front-seam",[[ankle[0],.16,ankle[2]-.069],[side*.187,.35,ankle[2]-.068],[side*.177,.55,knee[2]-.075]],.0016,thread);
  }
  // The bow arm extends; the drawing hand anchors near the cheek.
  const arms=[[[.22,1.665,0],[.48,1.655,-.095],[.735,1.66,-.19]], [[-.22,1.665,0],[-.46,1.72,-.02],[-.085,1.795,-.165]]];
  for(const [index,arm] of arms.entries()) {
    sweep("fitted-sleeve",arm,[.089,.084,.067,.057,.043],cloth,{folds:.055});
    const [shoulder,elbow,wrist]=arm, start=elbow.map((x,i)=>mix(x,wrist[i],.42));
    sweep("leather-bracer",[start,wrist],[.07,.049],character.key==="knight"?trim:leather);
    for(const t of [.15,.75]) { const p=start.map((x,i)=>mix(x,wrist[i],t)), p2=start.map((x,i)=>mix(x,wrist[i],t+.045));sweep("bracer-strap",[p,p2],[.072-t*.024,.072-t*.024],darkLeather); }
    tube("bracer-edge",[start.map((x,i)=>x+(i===2?-.06:0)),wrist.map((x,i)=>x+(i===2?-.044:0))],.003,trim);
    const pad=ellipsoid("layered-shoulder-guard",shoulder,[.205,.17,.235],character.key==="knight"?trim:mat("leather",shade(outfit,.66)));pad.rotation.z=index===0?-.25:.25;
    for(let i=0;i<3;i++) ellipsoid("shoulder-rivet",[shoulder[0]+(i-1)*.045,shoulder[1]+.035,shoulder[2]-.11],[.01,.01,.006],trim);
  }
  // Sculpted palm and articulated fingers wrapped around the grip / string.
  hand([.755,1.66,-.195],false); hand([-.085,1.795,-.165],true);
  function hand(at,draw) {
    const n=new B.TransformNode(draw?"drawing-hand":"bow-hand",scene);n.parent=root;n.position.set(...at);n.rotation.z=draw?-.45:.12;
    ellipsoid("palm",[0,0,0],[.065,.084,.039],skin,n);
    for(let i=0;i<4;i++) {const y=.028-i*.018,length=.038+(i===1?.007:0);tube("curled-finger",[[-.024,y,-.006],[-.043,y,-.025],[-.034,y,-.043],[draw?-.012:.002,y,-.041]],.0085,skin,n,t=>1-t*.22);
      ellipsoid("knuckle",[-.029,y,-.013],[.016,.014,.017],skin,n);
      ellipsoid("fingernail",[draw?-.016:0,y,-.048],[length*.28,.01,.0015],mat("skin",shade(skinColor,1.12)),n);
    }
    tube("thumb",[[.018,.025,.003],[.031,.006,-.029],[.008,-.01,-.047]],.011,skin,n,t=>1-t*.25);
    for(let i=0;i<3;i++) tube("palm-crease",[[-.018,-.014+i*.013,-.021],[.014,-.021+i*.013,-.021]],.0005,mat("skin",shade(skinColor,.65)),n);
  }
  function buckle(at,width,height) {
    const [x,y,z]=at;tube("forged-buckle",[[x-width/2,y-height/2,z],[x+width/2,y-height/2,z],[x+width/2,y+height/2,z],[x-width/2,y+height/2,z],[x-width/2,y-height/2,z]],.0032,trim);
    tube("buckle-pin",[[x,y-height/2,z-.002],[x,y+height/2,z-.002]],.0018,trim);
  }
  surface("waist-belt",(u,v)=>[Math.sin(u*TAU)*.19,1.22+(v-.5)*.063,Math.cos(u*TAU)*.137],64,4,leather,{uvScale:[5,.5],closed:true});buckle([0,1.22,-.143],.08,.059);
  band("quiver-crossbelt",[[-.19,1.69,-.07],[-.12,1.57,-.161],[.03,1.4,-.167],[.16,1.23,-.111]],.048,leather);
  for(const side of [-1,1]) tube("crossbelt-stitch",[[-.19+side*.019,1.68,-.076],[-.12+side*.019,1.57,-.166],[.03+side*.019,1.4,-.172],[.16+side*.019,1.23,-.116]],.0012,thread);
  buckle([-.075,1.52,-.18],.056,.047);
  const pouch=ellipsoid("belt-pouch",[-.205,1.13,-.04],[.13,.16,.095],leather);pouch.rotation.z=-.12;
  tube("pouch-flap",[[-.263,1.18,-.065],[-.211,1.13,-.097],[-.158,1.18,-.065]],.005,darkLeather);ellipsoid("pouch-fastener",[-.211,1.13,-.1],[.013,.013,.006],trim);

  buildHair(); buildFacialHair(); buildHeadwear(); buildAccessories(); buildEquipment();
  function scalp(u,v,offset=0) {
    const a=u*TAU, limit=1.23+Math.max(0,Math.cos(a))*.45, theta=.02+v*limit;
    return [Math.sin(a)*Math.sin(theta)*(.101+offset),1.955+Math.cos(theta)*(.133+offset),-.044+Math.cos(a)*Math.sin(theta)*(.141+offset)];
  }
  function buildHair() {
    if(f.hair==="bald")return;
    // Fit the hairline directly to the anatomical scalp, including the temples.
    const positions=new Float32Array(headAsset.positions), indices=[], selected=new Set();
    const onScalp=i=>{const x=positions[i*3],y=positions[i*3+1],z=positions[i*3+2],front=Math.max(0,Math.min(1,(-z-.015)/.15));return y>1.915+front*.095+.006*Math.cos(x*60)*front;};
    for(let i=0;i<headAsset.indices.length;i+=3){const tri=Array.from(headAsset.indices.slice(i,i+3));if(tri.every(onScalp)){indices.push(...tri);tri.forEach(v=>selected.add(v));}}
    for(const i of selected)for(let axis=0;axis<3;axis++)positions[i*3+axis]+=headAsset.normals[i*3+axis]*(.004+Math.sin(i*.7)*.001);
    const data=new B.VertexData();data.positions=positions;data.indices=indices;data.normals=headAsset.normals;data.uvs=headAsset.uvs;
    const cap=new B.Mesh("fitted-hairline",scene);data.applyToMesh(cap);finish(cap,hair,headRoot);
    // Fine, swept locks follow the surface instead of making a spherical cap.
    let strand=0;
    for(const i of selected){if(strand++%9)continue;const p=new B.Vector3(...positions.slice(i*3,i*3+3)),n=new B.Vector3(...headAsset.normals.slice(i*3,i*3+3)),direction=new B.Vector3(.25,0,1);const tangent=direction.subtract(n.scale(B.Vector3.Dot(direction,n))).normalize().scale(.014);
      tube("hair-lock",[p.asArray(),p.add(tangent.scale(.5)).add(n.scale(.003)).asArray(),p.add(tangent).asArray()],.00085,hair,headRoot,t=>1-t*.7);
    }
    if(f.hair==="bob")for(let i=0;i<70;i++){const a=-Math.PI*.55+i/69*Math.PI*1.1; tube("bob-lock",[[Math.sin(a)*.09,2.0,-.025+Math.cos(a)*.11],[Math.sin(a)*.114,1.9,Math.cos(a)*.13],[Math.sin(a)*.115,1.76+(i%4)*.007,Math.cos(a)*.1]],.0035,hair,headRoot,t=>1-t*.5);}
    if(f.hair==="ponytail"||f.hair==="bun") {
      const bun=f.hair==="bun", end=bun?[.015,2.04,.13]:[.045,1.66,.15];
      for(let i=0;i<50;i++){const a=i/50*TAU,dx=Math.cos(a)*.035,dz=Math.sin(a)*.027; tube(bun?"bun-strand":"ponytail-strand",[[dx*.6,2.02,.07+dz],[dx,2.07,.135+dz],[end[0]+dx*.6,end[1],end[2]+dz]],.0033,hair,headRoot,t=>1-t*.65);}
      ring("hair-tie",[0,2.025,.095],.069,.008,leather,headRoot);
    }
    if(f.hair==="braids")for(const side of [-1,1])for(let strand=0;strand<3;strand++)tube("braided-lock",Array.from({length:40},(_,i)=>{const t=i/39,a=t*TAU*6+strand/3*TAU;return[side*.105+Math.sin(a)*.012,1.97-t*.26,.006+Math.cos(a)*.012];}),.008,hair,headRoot,t=>1-t*.5);
    if(f.hair==="curls")for(let i=0;i<95;i++){const u=i*.618%1,v=.15+(i%7)/7*.8,p=scalp(u,v,.013);tube("curled-lock",Array.from({length:14},(_,j)=>{const a=j/13*TAU*1.5;return[p[0]+Math.cos(a)*.012,p[1]+Math.sin(a)*.011,p[2]+j*.0008];}),.0028,hair,headRoot);}
  }
  function buildFacialHair() {
    const style=f.facialHair;if(style==="none")return;
    if(["mustache","goatee","beard","full"].includes(style)) {
      surface("fitted-mustache",(u,v)=>{const x=(u-.5)*.06,y=1.904-Math.abs(x)*.18-(v-.5)*.009*Math.sin(u*Math.PI);return facePoint(x,y,.002);},24,4,beard,{parent:headRoot});
      for(let side of [-1,1])for(let i=0;i<45;i++){const t=i/44,x=side*(.003+t*.026),y=1.905-t*.005;tube("mustache-strand",[facePoint(x,y,.003),facePoint(x+side*.002,y-.007,.003)],.0008,beard,headRoot);}
    }
    if(style==="mustache")return;
    const full=style==="full",stubble=style==="stubble",goatee=style==="goatee";
    const positions=new Float32Array(headData.positions),indices=[],selected=new Set();
    const onBeard=i=>{const x=positions[i*3],y=positions[i*3+1],z=positions[i*3+2];return y>1.839&&y<1.891+Math.min(Math.abs(x)/.075,1)*.055&&z<-.06&&(!goatee||Math.abs(x)<.029)&&!(Math.abs(x)<.029&&y>1.884);};
    for(let i=0;i<headAsset.indices.length;i+=3){const tri=Array.from(headAsset.indices.slice(i,i+3));if(tri.every(onBeard)){indices.push(...tri);tri.forEach(v=>selected.add(v));}}
    for(const i of selected){const lower=Math.max(0,(1.891-positions[i*3+1])/.052);for(let axis=0;axis<3;axis++)positions[i*3+axis]+=headData.normals[i*3+axis]*.002;positions[i*3+1]-=lower*(stubble?0:full?.036:.008);positions[i*3+2]-=lower*(stubble?0:.004);}
    if(!stubble){const data=new B.VertexData();data.positions=positions;data.indices=indices;data.normals=headData.normals;data.uvs=headAsset.uvs;const mesh=new B.Mesh("fitted-beard",scene);data.applyToMesh(mesh);finish(mesh,beard,headRoot);}
    let strand=0;
    for(const i of selected){if(strand++%(stubble?2:3))continue;const p=new B.Vector3(...positions.slice(i*3,i*3+3)),n=new B.Vector3(...headData.normals.slice(i*3,i*3+3)),length=stubble?.0025:full?.012:.006;
      tube("beard-strand",[p.asArray(),p.add(n.scale(.002)).add(new B.Vector3(0,-length*.5,0)).asArray(),p.add(new B.Vector3(.001*Math.sin(i),-length,-.001)).asArray()],stubble?.00045:.0008,beard,headRoot,t=>1-t*.75);
    }
  }
  function buildHeadwear() {
    const h=f.headwear,hood=mat(h==="helmet"?"metal":"cloth",c.headwear||outfit);
    if(h==="hood") {
      // Cloth sweeps back from a genuinely open oval. It never crosses the face.
      const point=(u,v)=>{const a=u*TAU,t=v*Math.PI/2,r=Math.cos(t),fold=.004*Math.sin(a*9+v*3)*Math.sin(v*Math.PI),front=-.214+.06*Math.pow(Math.max(0,-Math.cos(a)),2);return[Math.sin(a)*(.112*r+fold),1.965+Math.cos(a)*(.15*r+fold)+Math.pow(Math.max(0,Math.cos(a)),8)*.018*r,front+Math.sin(t)*(.141-front)];};
      surface("tailored-ranger-hood",point,64,42,hood,{parent:headRoot,uvScale:[5,4],closed:true});
      const edge=Array.from({length:65},(_,i)=>point(i/64,0));
      tube("hood-bound-opening",edge,.005,mat("leather",shade(c.headwear||outfit,.7)),headRoot);
      tube("hood-stitched-opening",edge.map(p=>[p[0]*1.025,p[1],p[2]-.002]),.0012,thread,headRoot);
      for(let side of [-1,1]) tube("hood-drape-fold",[[side*.06,1.79,-.16],[side*.1,1.76,-.1],[side*.19,1.71,.01]],.011,hood,headRoot);
    } else if(h==="helmet") {
      surface("forged-open-helmet",(u,v)=>scalp(u,v,.014),64,28,hood,{parent:headRoot,closed:true});
      for(let side of [-1,1]) surface("helmet-cheek-plate",(u,v)=>[side*(.098+Math.sin(v*Math.PI)*.012),1.98-v*.14,-.065+(u-.5)*.15],12,15,hood,{parent:headRoot});
      tube("helmet-brow",[[-.09,1.99,-.12],[0,2.015,-.17],[.09,1.99,-.12]],.007,trim,headRoot);
      tube("helmet-center-ridge",[[0,1.995,-.17],[0,2.105,-.04],[0,2.02,.09]],.006,trim,headRoot);
    } else if(h==="headband") surface("woven-headband",(u,v)=>{const a=u*TAU;return[Math.sin(a)*.101,2.015+(v-.5)*.027,-.043+Math.cos(a)*.123];},64,5,hood,{parent:headRoot,closed:true});
    else if(h==="cap") {
      surface("soft-feathered-cap",(u,v)=>{const p=scalp(u,v,.02);p[0]+=v*.016;p[1]+=.018;return p;},48,24,hood,{parent:headRoot,closed:true});
      feather("cap-feather",[.10,2.03,.015],[.15,2.26,.065],.024,trim,headRoot);
    }
  }
  function buildAccessories() {
    const ex=.033,ey=1.96,ez=-.17;
    if(f.faceAccessory==="glasses") { for(let side of [-1,1]){ring("round-glasses",[side*ex,ey,ez],.045,.002,trim,headRoot);tube("glasses-temple",[[side*.054,ey,ez],[side*.085,ey+.003,-.04]],.0015,trim,headRoot);}tube("glasses-bridge",[[-.01,ey,ez],[0,ey+.004,ez-.001],[.01,ey,ez]],.0015,trim,headRoot); }
    if(f.faceAccessory==="eyepatch") {ellipsoid("leather-eye-patch",[-ex,ey,ez],[.048,.033,.012],darkLeather,headRoot);tube("eye-patch-strap",[[-.087,1.99,-.02],[-ex,ey+.006,ez-.004],[.086,1.93,-.025]],.0025,darkLeather,headRoot);}
    if(f.faceAccessory==="earring")ring("hoop-earring",[.092,1.92,-.014],.026,.003,trim,headRoot);
  }
  function feather(name,start,end,width,material,parent=root) {
    surface(name,(u,v)=>{const p=start.map((n,i)=>mix(n,end[i],v));p[0]+=(u-.5)*width*Math.sin(v*Math.PI);p[2]+=.003*Math.sin(u*Math.PI);return p;},8,16,material,{parent});
    tube(`${name}-quill`,[start,end],.001,thread,parent);
  }
  function buildEquipment() {
    const bowMat=mat(f.bowStyle==="crystal"?"crystal":"wood",c.bow||trimColor), grip=mat("leather",c.grip||"#87633f"), arrowMat=mat("cloth",c.arrow||"#8be7ba");
    const bx=.75,by=1.68,bz=-.21,points=[];
    for(let i=0;i<=40;i++) {const t=i/40*2-1,curve=f.bowStyle==="recurve"?.17*t*t-.07*Math.sin(Math.abs(t)*Math.PI*1.6):.22*t*t;points.push([bx-curve,by+t*.66,bz]);}
    // Flattened limbs have a true bow cross-section and taper toward horn nocks.
    const bow=sweep("carved-bow-limbs",points,[.012,.022,.023,.022,.012],bowMat,{flatten:.55});
    const draw=[-.1,1.79,bz];tube("taut-bowstring",[points[0],draw,points[40]],.0013,mat("cloth","#cdbfa6"),root,undefined,true);
    sweep("leather-bow-grip",[[bx,by-.065,bz],[bx,by+.065,bz]],[.026,.026],grip,{flatten:.8});
    for(let i=0;i<12;i++){const y=by-.06+i*.0105;tube("grip-binding",Array.from({length:20},(_,j)=>{const a=j/19*TAU;return[bx+Math.sin(a)*.027,y+j/19*.008,bz+Math.cos(a)*.022];}),.0016,thread);}
    for(const p of [points[0],points[40]])ellipsoid("bow-horn-nock",p,[.022,.045,.025],darkLeather);
    if(f.bowStyle==="crystal")for(const side of [-1,1])for(let i=1;i<5;i++){const t=i/5,p=points[Math.round(20+side*t*20)];const gem=B.MeshBuilder.CreatePolyhedron("bow-crystal",{type:1,size:.026},scene);gem.position.set(...p);gem.scaling.y=1.8;finish(gem,bowMat);}
    const tip=[.99,1.70,bz],shaft=mat(f.arrowDesign==="moonsteel"?"metal":"wood",f.arrowDesign==="moonsteel"?"#bac5ca":"#a88a5f");
    tube("nocked-arrow-shaft",[draw,tip],.0032,shaft);
    const arrowhead=B.MeshBuilder.CreateCylinder("forged-arrowhead",{height:.066,diameterTop:0,diameterBottom:f.arrowDesign==="moonsteel"?.034:.023,tessellation:4},scene);arrowhead.position.set(1.017,1.698,bz);arrowhead.rotation.z=-Math.PI/2-.08;finish(arrowhead,mat(f.arrowDesign==="aurora"?"crystal":"metal",f.arrowDesign==="aurora"?(c.arrow||"#8be7ba"):"#a4adb2"));
    for(const side of [-1,1]) surface("arrow-fletching",(u,v)=>[mix(-.08,.045,v),1.785-v*.01+side*Math.sin(v*Math.PI)*.027*u,bz+.002],4,12,arrowMat);
    // A stitched, open-topped leather quiver with individual arrows and feathers.
    const quiver=new B.TransformNode("back-quiver",scene);quiver.parent=root;quiver.position.set(-.18,1.46,.19);quiver.rotation.z=.25;
    surface("quiver-leather",(u,v)=>[Math.sin(u*TAU)*.072,(v-.5)*.49,Math.cos(u*TAU)*.065],40,12,leather,{parent:quiver,uvScale:[2,3],closed:true});
    for(const y of [-.235,.22,.245]) {const r=ring("quiver-rim",[0,y,0],.143,.009,darkLeather,quiver);r.rotation.x=0;}
    ellipsoid("quiver-dark-interior",[0,.225,0],[.126,.006,.115],mat("cloth","#1c1815"),quiver);
    tube("quiver-seam",[[0,-.235,-.068],[0,.23,-.068]],.002,thread,quiver);
    for(let i=0;i<7;i++){const a=i*2.4,x=Math.cos(a)*.043,z=Math.sin(a)*.04,h=.50+(i%3)*.035;tube("quiver-arrow",[[x,-.16,z],[x,h,z]],.0031,shaft,quiver);for(let s of [-1,1])feather("quiver-feather",[x+s*.012,h-.13,z],[x+s*.008,h-.025,z],.035,arrowMat,quiver);}
  }
  // The pose is static: batch small stitches, strands and costume panels by
  // material so mobile GPUs do not submit hundreds of separate draw calls.
  const batches=new Map();
  for(const mesh of root.getChildMeshes()) {
    if(mesh===head)continue;
    const list=batches.get(mesh.material)||[];list.push(mesh);batches.set(mesh.material,list);
  }
  for(const [material,meshes] of batches) {
    if(meshes.length<2)continue;
    const parts=[...new Set(meshes.map(mesh=>mesh.name))];
    const merged=B.Mesh.MergeMeshes(meshes,true,true);
    if(merged){merged.name=material.name;merged.parent=root;merged.metadata={parts};merged.receiveShadows=true;world.shadows?.addShadowCaster(merged);}
  }
  return { head, dispose:()=>materials.dispose() };
}

const faceTextures = new WeakMap();
function getFaceTextures(world) {
  if(faceTextures.has(world))return faceTextures.get(world);
  const { B,scene }=world;
  const color=new B.Texture(new URL("../assets/archer/skin-color.png",import.meta.url).href,scene);
  const normal=new B.Texture(new URL("../assets/archer/skin-normal.png",import.meta.url).href,scene);normal.gammaSpace=false;normal.level=.5;
  const result={color,normal};faceTextures.set(world,result);return result;
}
