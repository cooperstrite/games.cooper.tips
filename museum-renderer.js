import { createWebGLScene } from "./arcade/babylon.js";
import { createMuseumMaterials } from "./museum-materials.js";
import { prepareArcherAssets } from "./arcade/humanoid-mesh.js";
import { WALLS, FURNITURE, ROOMS, CLUES, HEIGHT, COLUMNS, segmentHitsBox } from "./museum-world.js";
import { WINDOWS, SKYLIGHT, wallPanels, wallTrim, ceilingPanels, pictureFrameGeometry } from "./museum-architecture.js";

export async function createMuseumRenderer(canvas, physics, { isCurrent=()=>true }={}) {
  const gfx=await createWebGLScene(canvas,{quality:"high",isCurrent});
  const {B,scene,engine,camera,sun,shadows}=gfx,V=(x,y,z)=>new B.Vector3(x,y,z);
  scene.useRightHandedSystem=true;scene.skipPointerMovePicking=true;
  scene.clearColor=B.Color4.FromHexString('#c8d8ddff');scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.0018;scene.fogColor=B.Color3.FromHexString('#c6b695');
  scene.imageProcessingConfiguration.exposure=1.05;scene.imageProcessingConfiguration.contrast=1.12;
  camera.fov=.98;camera.minZ=.055;camera.maxZ=140;camera.inputs.clear();
  const fill=scene.getLightByName('sky-fill');fill.intensity=.3;fill.diffuse=B.Color3.FromHexString('#d8e4ed');fill.groundColor=B.Color3.FromHexString('#66533a');
  sun.direction.set(-.82,-.62,-.25);sun.position.set(30,25,22);sun.intensity=4.2;sun.diffuse=B.Color3.FromHexString('#ffdea5');
  shadows.mapSize=4096;shadows.useBlurExponentialShadowMap=false;shadows.usePercentageCloserFiltering=true;shadows.filteringQuality=B.ShadowGenerator.QUALITY_HIGH;shadows.bias=.00008;shadows.normalBias=.015;sun.autoCalcShadowZBounds=true;sun.shadowOrthoScale=.04;
  const m=createMuseumMaterials(B,scene), props=[],wallSurfaces=[],floorMaterials=[],clueNodes=new Map(),debugMeshes=new Map(),dynamicMeshes=new Map(),localLights=[],pictureLights=[];
  await m.ready;
  if(!isCurrent()){gfx.dispose();throw new Error('Museum loading cancelled');}
  function finish(mesh,mat,shadow=true){mesh.material=mat;mesh.receiveShadows=true;mesh.isPickable=false;props.push(mesh);if(shadow)shadows.addShadowCaster(mesh);return mesh;}
  function box(name,w,h,d,x,y,z,mat,shadow=true){
    const scale=mat===m.wood?.85:2;
    const faceUV=[new B.Vector4(0,0,w/scale,h/scale),new B.Vector4(0,0,w/scale,h/scale),new B.Vector4(0,0,d/scale,h/scale),new B.Vector4(0,0,d/scale,h/scale),new B.Vector4(0,0,w/scale,d/scale),new B.Vector4(0,0,w/scale,d/scale)];
    const s=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d,faceUV:mat.albedoTexture?faceUV:undefined},scene);s.position.set(x,y,z);return finish(s,mat,shadow);
  }
  function sphere(name,w,h,d,x,y,z,mat){const s=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:24},scene);s.scaling.set(w,h,d);s.position.set(x,y,z);return finish(s,mat);}
  function cylinder(name,top,bottom,h,x,y,z,mat){const s=B.MeshBuilder.CreateCylinder(name,{height:h,diameterTop:top,diameterBottom:bottom,tessellation:32},scene);s.position.set(x,y,z);return finish(s,mat);}
  function plane(name,w,h,x,y,z,mat,ry=0){const s=B.MeshBuilder.CreatePlane(name,{width:w,height:h,sideOrientation:B.Mesh.DOUBLESIDE},scene);s.position.set(x,y,z);s.rotation.y=ry;return finish(s,mat,false);}
  function groupAt(name,x,y,z,rotation=0){const g=new B.TransformNode(name,scene);g.position.set(x,y,z);g.rotation.y=rotation;return g;}
  function attach(mesh,parent){mesh.parent=parent;return mesh;}
  function localBox(parent,name,w,h,d,x,y,z,mat,shadow=true){return attach(box(name,w,h,d,x,y,z,mat,shadow),parent);}
  function label(text,x,y,z,width=1.4,angle=0,dark=false){
    const mat=m.material('label '+text,dark?'#dfcda7':'#c7b995',.8);mat.albedoTexture=m.texture('label '+text,512,128,(c,w,h)=>{c.fillStyle=dark?'#262c29':'#d8c9a5';c.fillRect(0,0,w,h);c.fillStyle=dark?'#e9d8b6':'#242c2c';c.font='500 25px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillText(text,w/2,h/2,w-30);});
    const sign=groupAt(text,x,y,z,angle),w=width/2,h=width/8;
    // Two independently oriented printed faces. A double-sided single quad
    // shows the same UVs through its back and mirrors the lettering.
    for(const back of [false,true]){
      const face=new B.Mesh(text+(back?' / back':' / front'),scene),data=new B.VertexData();
      data.positions=[-w,-h,0,w,-h,0,w,h,0,-w,h,0];data.normals=[0,0,1,0,0,1,0,0,1,0,0,1];data.uvs=[0,0,1,0,1,1,0,1];data.indices=[0,2,1,0,3,2];data.applyToMesh(face);
      face.parent=sign;face.position.z=back?-.006:.006;face.rotation.y=back?Math.PI:0;finish(face,mat,false);
    }
    return sign;
  }
  // Each room uses the same footprint as the navigable map and collision world.
  for(const r of ROOMS){
    const floorMat=m.material(r.id+' stone','#ffffff',.32);floorMat.albedoTexture=m.copyTexture(m.stone.albedoTexture,r.id+' marble');floorMat.albedoTexture.uScale=r.w/4;floorMat.albedoTexture.vScale=r.d/4;
    floorMaterials.push(floorMat);
    const floor=B.MeshBuilder.CreateGround(r.name+' floor',{width:r.w,height:r.d},scene);floor.position.set(r.x,.001,r.z);finish(floor,floorMat,false);
    for(const p of ceilingPanels(r))box(r.id+' ceiling',p.w,.18,p.d,p.x,HEIGHT,p.z,m.plaster);
    for(let x=r.x-r.w/2+2;x<r.x+r.w/2;x+=4)for(let z=r.z-r.d/2+2;z<r.z+r.d/2;z+=4){
      if(r.id===SKYLIGHT.room&&Math.abs(x-SKYLIGHT.x)<SKYLIGHT.w/2+1.83&&Math.abs(z-SKYLIGHT.z)<SKYLIGHT.d/2+1.83)continue;
      box('ceiling coffer',3.65,.08,3.65,x,HEIGHT-.13,z,m.linen,false);
      box('coffer panel',3.5,.06,3.5,x,HEIGHT-.18,z,m.plaster,false);
    }
    for(const dx of [-1,1])box('floor border',.12,.006,r.d-.35,r.x+dx*(r.w/2-.34),.009,r.z,m.darkStone,false);
    for(const dz of [-1,1])box('floor border',r.w-.65,.006,.12,r.x,.009,r.z+dz*(r.d/2-.34),m.darkStone,false);
    // Fine grout and small dark inlays give the marble its real-world scale.
    for(let x=r.x-r.w/2+2;x<r.x+r.w/2;x+=2)box('stone tile joint',.012,.003,r.d,x,.008,r.z,m.linen,false);
    for(let z=r.z-r.d/2+2;z<r.z+r.d/2;z+=2)box('stone tile joint',r.w,.003,.012,r.x,.008,z,m.linen,false);
    for(let x=r.x-r.w/2+2;x<r.x+r.w/2;x+=4)for(let z=r.z-r.d/2+2;z<r.z+r.d/2;z+=4){const tile=box('marble diamond',.19,.003,.19,x,.012,z,m.darkStone,false);tile.rotation.y=Math.PI/4;}
  }
  for(const d of WALLS){
    for(const p of wallPanels(d))wallSurfaces.push(box(p.id,p.w,p.h,p.d,p.x,p.y,p.z,m.plaster));
    for(const p of wallTrim(d))box(p.id,p.w,p.h,p.d,p.x,p.y,p.z,m[p.material],false);
  }
  // Broad open doorways stay open in both geometry and physics.
  for(const z of [-4,4])for(const x of [-3.25,3.25]){
    cylinder('portal base',.68,.74,.2,x,.1,z,m.white);cylinder('fluted column',.44,.52,3.5,x,1.95,z,m.plaster);cylinder('capital',.8,.58,.18,x,3.78,z,m.white);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;cylinder('column flute',.035,.035,3.35,x+Math.sin(a)*.245,1.94,z+Math.cos(a)*.245,m.white);}
  }
  for(const z of [-4,4]){box('door lintel',7.2,.28,.72,0,3.96,z,m.white);label(z<0?'THE MAIN GALLERY':'ENTRANCE HALL',0,4.45,z+.225,3.1,0,true);}
  label('SECURITY OFFICE',-11.76,4.35,0,2.6,Math.PI/2,true);label('EAST WING / STORAGE',11.76,4.35,0,3,-Math.PI/2,true);
  for(const [x,z,w,d] of [[0,9,4.4,8],[0,0,4.4,7.4],[0,-8,7,7],[24,-3,5,10]]){
    const rug=B.MeshBuilder.CreateGround('woven runner',{width:w,height:d},scene);rug.position.set(x,.017,z);finish(rug,m.rug,false);
  }
  function point(name,x,y,z,power,color='#ffe1b1',range=14){const l=new B.PointLight(name,V(x,y,z),scene);l.intensity=power;l.diffuse=B.Color3.FromHexString(color);l.range=range;l.radius=.5;localLights.push(l);return l;}
  for(const [x,z]of [[0,10],[0,0],[0,-8],[-18,0],[22,-3],[31,-3]]){
    point('gallery bounce',x,4.3,z,42,'#ffdfb0',12);
    cylinder('ceiling rose',.48,.48,.07,x,HEIGHT-.12,z,m.gold);
    cylinder('pendant cable',.018,.018,.6,x,HEIGHT-.4,z,m.black);
    cylinder('pendant shade',.18,.54,.28,x,HEIGHT-.76,z,m.gold);
    cylinder('pendant diffuser',.49,.49,.025,x,HEIGHT-.91,z,m.dust);
  }
  // Detailed frames, with real painting textures rather than colored rectangles.
  const atlas=new B.Texture(new URL('./assets/museum-paintings.png',import.meta.url).href,scene);
  function artwork(name,x,y,z,w,h,rotation,index,empty=false){
    const g=groupAt(name,0,0,0);
    const frame=new B.Mesh(name+' continuous gilt frame',scene),data=new B.VertexData(),shape=pictureFrameGeometry(w,h);Object.assign(data,shape);data.normals=[];B.VertexData.ComputeNormals(shape.positions,shape.indices,data.normals);data.applyToMesh(frame);frame.parent=g;finish(frame,m.gold);
    // Fine beading and small leaf scrolls stay on the moulding, outside the art.
    for(const sign of [-1,1]){
      for(let t=-w/2;t<=w/2;t+=.075)attach(sphere('gilt pearl',.021,.021,.018,t,sign*(h/2+.055),.09,m.gold),g);
      for(let t=-h/2;t<=h/2;t+=.075)attach(sphere('gilt pearl',.021,.021,.018,sign*(w/2+.055),t,.09,m.gold),g);
    }
    for(const sx of [-1,1])for(const sy of [-1,1])for(const n of [-1,1]){
      const path=Array.from({length:18},(_,i)=>{const a=i/17*Math.PI*1.65,r=.055*(1-i/24);return V(sx*(w/2+.12)+Math.cos(a)*r,sy*(h/2+.12)+Math.sin(a)*r*n,.152);});
      attach(finish(B.MeshBuilder.CreateTube('corner leaf scroll',{path,radius:.009,tessellation:6},scene),m.gold),g);
    }
    // Bake the tiny ornamental pieces into one draw call per frame.
    const ornaments=g.getChildMeshes();for(const mesh of ornaments){props.splice(props.indexOf(mesh),1);shadows.removeShadowCaster(mesh);}
    const joined=B.Mesh.MergeMeshes(ornaments,true,true);joined.name=name+' continuous gilt frame';joined.parent=g;finish(joined,m.gold);
    let mat=m.linen;
    if(!empty){mat=m.material(name+' oil on canvas','#ffffff',.78);mat.albedoTexture=atlas.clone();mat.albedoTexture.uScale=.5;mat.albedoTexture.vScale=.5;mat.albedoTexture.uOffset=(index%2)*.5;mat.albedoTexture.vOffset=(1-Math.floor(index/2))*.5;}
    const picture=attach(plane(name+' painting',w,h,0,0,.045,mat),g);
    const plaque=label(name,0,-h/2-.4,.06,Math.min(1.1,w*.65),0);plaque.parent=g;
    const lampY=h/2+.5,lampZ=.48;
    localBox(g,'picture lamp backplate',.34,.075,.045,0,lampY,.015,m.gold);
    for(const side of [-1,1]){
      const path=[V(side*w*.23,lampY,.02),V(side*w*.23,lampY+.045,.2),V(side*w*.23,lampY-.005,lampZ)];
      attach(finish(B.MeshBuilder.CreateTube('picture lamp curved arm',{path,radius:.012,tessellation:10},scene),m.gold),g);
    }
    const hood=attach(cylinder('brass picture light',.095,.095,w*.72,0,lampY,lampZ,m.gold),g);hood.rotation.z=Math.PI/2;
    localBox(g,'picture lamp diffuser',w*.68,.012,.045,0,lampY-.047,lampZ-.012,m.dust,false);
    const origin=V(x+Math.sin(rotation)*lampZ,y+lampY,z+Math.cos(rotation)*lampZ);
    const direction=V(-Math.sin(rotation)*lampZ,-lampY,-Math.cos(rotation)*lampZ).normalize();
    const light=new B.SpotLight(name+' picture light',origin,direction,1.6,1,scene);light.intensity=17;light.range=5;light.diffuse=B.Color3.FromHexString('#ffe0ad');light.radius=.16;pictureLights.push({light,group:g});
    g.position.set(x,y,z);g.rotation.y=rotation;
    return picture;
  }
  const restored=artwork('MONA LISA',0,2.6,-11.72,1.55,2.12,0,0,true);
  for(const [i,[x,z,ry]]of [[-6,-11.72,0],[6,-11.72,0],[-11.72,-7,Math.PI/2],[11.72,-7,-Math.PI/2],[-7,14.72,Math.PI],[0,14.72,Math.PI],[7,14.72,Math.PI],[-11.72,11,Math.PI/2],[11.72,9.55,-Math.PI/2],[23,-11.72,0],[31,-11.72,0]].entries())artwork(['RIVER STUDY','THE DISTANT SHORE','STILL LIFE','EVENING ON THE LAKE'][i%4],x,2.8,z,2.35,1.65,ry,i%4);
  for(const z of [4.25,-3.75])for(const x of [-7.4,7.4])artwork(x<0?'LANDSCAPE STUDY':'STILL LIFE',x,2.6,z,2.5,1.7,0,x<0?0:2);
  for(const win of WINDOWS){
    const height=win.top-win.bottom,y=(win.top+win.bottom)/2;
    const g=groupAt(win.id,win.x,y,win.z,win.angle),w=win.width;
    // Deep reveals and real openings let the directional sunlight cast the
    // window grid onto the floor; the physical wall still includes solid glass.
    attach(plane('daylit garden beyond glass',w,height,0,0,-.27,m.window),g);
    for(const dx of [-w/2,w/2])localBox(g,'window stone reveal',.13,height+.22,.5,dx,0,0,m.white);
    for(const yy of [-height/2,height/2])localBox(g,'window stone lintel',w+.3,.15,.52,0,yy,.02,m.white);
    localBox(g,'window sill',w+.38,.12,.6,0,-height/2-.07,.08,m.white);
    localBox(g,'window central mullion',.05,height,.085,0,0,.025,m.wood);
    for(const yy of [-height/6,height/6])localBox(g,'window cross mullion',w,.045,.085,0,yy,.025,m.wood);
    point('window sky bounce',win.x+Math.sin(win.angle)*.75,y,win.z+Math.cos(win.angle)*.75,24,'#c9deee',8);
  }
  const sky=B.MeshBuilder.CreateGround('gallery skylight glass',{width:SKYLIGHT.w,height:SKYLIGHT.d,sideOrientation:B.Mesh.DOUBLESIDE},scene);sky.position.set(SKYLIGHT.x,HEIGHT+.2,SKYLIGHT.z);finish(sky,m.window,false);
  for(const side of [-1,1]){
    box('skylight stone reveal',.15,.32,SKYLIGHT.d+.25,SKYLIGHT.x+side*SKYLIGHT.w/2,HEIGHT,SKYLIGHT.z,m.white);
    box('skylight stone reveal',SKYLIGHT.w,.32,.15,SKYLIGHT.x,HEIGHT,SKYLIGHT.z+side*SKYLIGHT.d/2,m.white);
  }
  box('skylight mullion',.05,.1,SKYLIGHT.d,SKYLIGHT.x,HEIGHT+.04,SKYLIGHT.z,m.wood);
  box('skylight mullion',SKYLIGHT.w,.1,.05,SKYLIGHT.x,HEIGHT+.04,SKYLIGHT.z,m.wood);
  point('gallery skylight bounce',SKYLIGHT.x,HEIGHT-.4,SKYLIGHT.z,40,'#d9e6eb',12);
  // Layered brass sconces and warm light keep the gallery readable at eye level.
  for(const x of [-3.6,3.6]){
    box('sconce backplate',.18,.42,.04,x,2.9,-11.7,m.gold);cylinder('sconce arm',.025,.025,.4,x,2.74,-11.53,m.gold);cylinder('sconce shade',.17,.3,.25,x,3.03,-11.5,m.linen);point('sconce',x,3.04,-11.3,9,'#ffcf8b',5);
  }
  function shadowPatch(x,z,w,d){const mat=new B.StandardMaterial('contact shade',scene);mat.disableLighting=true;mat.diffuseColor=B.Color3.Black();mat.emissiveColor=B.Color3.Black();mat.opacityTexture=contact;mat.alpha=.22;const s=B.MeshBuilder.CreateGround('soft contact shadow',{width:w,height:d},scene);s.position.set(x,.022,z);s.material=mat;s.isPickable=false;return s;}
  const contact=m.texture('contact falloff',64,64,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,4,w/2,h/2,w/2);g.addColorStop(0,'white');g.addColorStop(1,'black');c.fillStyle=g;c.fillRect(0,0,w,h);});
  contact.getAlphaFromRGB=true;
  function plant(d){cylinder('planter rim',d.w,d.w*.8,.12,d.x,.88,d.z,m.terracotta);cylinder('ceramic planter',d.w*.8,d.w*.5,.82,d.x,.45,d.z,m.terracotta);cylinder('soil',.75,.75,.02,d.x,.92,d.z,m.wood);
    for(let i=0;i<16;i++){const a=i*2.4,h=1.1+(i%4)*.24,dx=Math.sin(a)*.38,dz=Math.cos(a)*.38;const path=[V(d.x,.88,d.z),V(d.x+dx*.55,h,d.z+dz*.55),V(d.x+dx*1.4,h+.25,d.z+dz*1.4)];finish(B.MeshBuilder.CreateTube('plant stem',{path,radius:.009,tessellation:5},scene),m.leaves);const leaf=sphere('broad leaf',.19,.48,.028,d.x+dx*1.5,h+.18,d.z+dz*1.5,m.leaves);leaf.rotation.set(.35,a,.3);}}
  function crate(d,body){const g=groupAt(d.id,d.x,d.y,d.z);localBox(g,'crate shell',d.w,d.h,d.d,0,0,0,m.wood);for(const x of [-d.w*.36,d.w*.36])for(const z of [-d.d/2-.018,d.d/2+.018])localBox(g,'crate batten',.1,d.h,.045,x,0,z,m.linen);for(const z of [-d.d/2-.045,d.d/2+.045]){const a=label('FRAGILE',0,0,z,Math.min(.55,d.w*.75),0,true);a.parent=g;}if(body)dynamicMeshes.set(d.id,g);return g;}
  for(const d of FURNITURE){
    shadowPatch(d.x,d.z,d.w+1,d.d+1);
    if(d.kind==='planter'){plant(d);continue;}
    if(d.kind==='bin'){cylinder('waste basket',.48,.36,.56,d.x,.28,d.z,m.black);cylinder('basket lip',.5,.5,.035,d.x,.56,d.z,m.gold);continue;}
    if(d.kind==='bench'){box(d.id,d.w,.23,d.d,d.x,.49,d.z,m.wood);box('leather cushion',d.w-.12,.16,d.d-.08,d.x,.625,d.z,m.red);for(const dx of [-1,1])for(const dz of [-1,1])cylinder('turned leg',.08,.11,.4,d.x+dx*(d.w/2-.2),.2,d.z+dz*(d.d/2-.15),m.wood);continue;}
    if(d.kind==='desk'){box('desk top',d.w,.1,d.d,d.x,d.h-.05,d.z,m.wood);for(const dx of [-1,1]){box('desk drawers',.55,d.h-.1,d.d-.16,d.x+dx*(d.w/2-.38),(d.h-.1)/2,d.z,m.wood);for(let i=0;i<3;i++){box('drawer panel',.49,.18,.022,d.x+dx*(d.w/2-.38),.2+i*.22,d.z+d.d/2-.06,m.wood);box('brass handle',.18,.018,.06,d.x+dx*(d.w/2-.38),.25+i*.22,d.z+d.d/2-.025,m.gold);}}continue;}
    if(d.kind==='plinth'){box('plinth body',d.w-.12,d.h-.16,d.d-.12,d.x,d.y,d.z,m.stone);box('plinth base',d.w,.12,d.d,d.x,.06,d.z,m.white);box('plinth cap',d.w,.12,d.d,d.x,d.h-.06,d.z,m.white);continue;}
    if(d.kind==='crate'){crate(d);continue;}
    if(d.kind==='rack'){for(const dx of [-1,1])for(const dz of [-1,1])box('rack support',.05,d.h,.05,d.x+dx*d.w/2,d.y,d.z+dz*d.d/2,m.black);for(let i=0;i<4;i++)box('rack shelf',d.w,.045,d.d,d.x,.2+i*.65,d.z,m.wood);for(let i=0;i<5;i++)crate({id:'archived artwork',x:d.x-2+i,y:.53,z:d.z,w:.7,h:.57,d:.8});continue;}
    box(d.id,d.w,d.h,d.d,d.x,d.y,d.z,m.wood);
  }
  for(const b of physics.dynamic)crate(b.museum,b);
  // Familiar museum props, built from smooth profiles rather than block stand-ins.
  function amphora(x,y,z){const profile=[[0,0],[.24,0],[.27,.09],[.2,.16],[.3,.28],[.38,.55],[.31,.82],[.15,1],[.13,1.17],[.23,1.2],[.23,1.27],[.15,1.27]].map(([a,b])=>V(a,b,0));const vase=B.MeshBuilder.CreateLathe('carved marble amphora',{shape:profile,tessellation:64,sideOrientation:B.Mesh.DOUBLESIDE},scene);vase.position.set(x,y,z);finish(vase,m.white);for(const dx of [-1,1]){const path=Array.from({length:30},(_,i)=>{const a=i/29*Math.PI;return V(x+dx*(.2+Math.sin(a)*.28),y+.4+i/29*.63,z);});finish(B.MeshBuilder.CreateTube('amphora handle',{path,radius:.038,tessellation:10},scene),m.white);}}
  amphora(7.5,1.28,-8.8);
  const knot=B.MeshBuilder.CreateTorusKnot('bronze study',{radius:.4,tube:.11,radialSegments:96,tubularSegments:24,p:2,q:3},scene);knot.position.set(-5.5,1.85,0);finish(knot,m.gold);
  const head=await prepareArcherAssets().catch(()=>null);
  if(!isCurrent()){gfx.dispose();throw new Error('Museum loading cancelled');}
  if(head){const bust=groupAt('marble portrait',-7.5,1.28,-8.8,Math.PI);const mesh=new B.Mesh('carved anatomical portrait',scene),data=new B.VertexData();data.positions=Array.from(head.positions);for(let i=1;i<data.positions.length;i+=3)data.positions[i]-=1.74;data.normals=Array.from(head.normals);data.indices=Array.from(head.indices);data.uvs=Array.from(head.uvs);data.applyToMesh(mesh);mesh.scaling.setAll(2);mesh.position.y=.5;mesh.parent=bust;finish(mesh,m.white);attach(sphere('draped bust shoulders',.94,.65,.48,0,.31,0,m.white),bust);cylinder('bust socle',.55,.64,.16,-7.5,1.36,-8.8,m.white);}
  // Workstation and surveillance hardware retain the original evidence locations.
  box('monitor casing',.72,.47,.055,-20.4,1.2,-3.15,m.black);plane('monitor screen',.65,.39,-20.4,1.2,-3.115,m.screen);box('monitor stand',.08,.18,.08,-20.4,.94,-3.15,m.black);box('keyboard',.55,.025,.19,-20.4,.88,-2.73,m.black);
  for(let row=0;row<4;row++)for(let col=0;col<12;col++)box('key',.028,.012,.026,-20.64+col*.04,.903,-2.79+row*.034,m.linen,false);
  label('VISITOR INFORMATION',6.4,1.24,12.1,1.7);label('MAINTENANCE RECORDS',-22.82,1.5,4,1.4,Math.PI/2,true);
  function securityCamera(x,y,z){const g=groupAt('security camera',x,y,z);localBox(g,'mount arm',.055,.055,.65,0,.12,-.25,m.black);localBox(g,'camera housing',.27,.18,.48,0,0,0,m.white);attach(cylinder('lens barrel',.12,.12,.08,0,0,.26,m.black),g).rotation.x=Math.PI/2;attach(sphere('lens glass',.08,.08,.015,0,0,.31,m.screen),g);return g;}
  securityCamera(0,3.73,5.8);securityCamera(16,3.7,-3);
  cylinder('entrance camera ceiling mount',.035,.035,1.78,0,4.79,5.55,m.black);
  cylinder('storage camera ceiling mount',.035,.035,1.81,16,4.775,-3.25,m.black);
  function clueMaterial(name,color){const mat=m.material(name,color,.86);return mat;}
  for(const c of CLUES){
    const g=groupAt(c.id,c.x,c.y,c.z);clueNodes.set(c.id,g);
    const mark=clueMaterial(c.id,c.id==='fabric'?'#38434a':c.id==='footprint1'?'#514535':'#e9e3d3');
    if(c.id==='footprint1'){
      for(let i=0;i<8;i++)localBox(g,'boot tread',.12,.005,.016,Math.sin(i)*.014,.002,-.13+i*.034,mark,false);attach(sphere('mud heel',.12,.008,.09,0,.004,.15,mark),g);
    }else if(c.id==='droplet'){
      attach(sphere('paint drop',.1,.006,.15,0,.005,0,mark),g);for(let i=0;i<5;i++)attach(sphere('paint splatter',.014,.004,.028,Math.sin(i*2)*.08,.003,Math.cos(i*2)*.09,mark),g);
    }else if(c.id==='scratches'){
      for(let i=0;i<4;i++){const scratch=localBox(g,'tool mark',.011,.3+i*.02,.008,i*.045,0,.02,m.wood,false);scratch.rotation.z=.3+i*.13;}
    }else if(c.id==='fabric'){
      const cloth=B.MeshBuilder.CreateGround('torn cloth',{width:.2,height:.36,subdivisions:9},scene);const pos=cloth.getVerticesData(B.VertexBuffer.PositionKind);for(let i=0;i<pos.length;i+=3)pos[i+1]=Math.sin(pos[i]*29+pos[i+2]*13)*.02;cloth.setVerticesData(B.VertexBuffer.PositionKind,pos);cloth.rotation.x=Math.PI/2;cloth.parent=g;finish(cloth,mark);for(let i=0;i<6;i++)localBox(g,'frayed thread',.003,.06,.003,-.08+i*.03,-.19,0,mark,false);
    }else if(c.id==='keycard'){
      localBox(g,'staff access card',.19,.007,.3,0,0,0,m.paper,false);localBox(g,'magnetic stripe',.15,.001,.035,0,.006,-.07,m.black,false);localBox(g,'staff photo',.055,.001,.07,-.035,.006,.04,m.screen,false);
    }else if(c.id==='glove'){
      attach(sphere('glove palm',.13,.022,.14,0,.01,0,mark),g);for(let i=0;i<4;i++)attach(sphere('glove finger',.024,.018,.12,-.043+i*.029,.01,-.1,mark),g);const thumb=attach(sphere('glove thumb',.03,.02,.1,-.08,.01,-.02,mark),g);thumb.rotation.y=.7;
    }else if(c.id==='note'){
      localBox(g,'folded note',.28,.007,.21,0,0,0,m.paper,false);for(let i=0;i<6;i++)localBox(g,'pencil line',.18-(i%3)*.025,.001,.002,0,.005,-.07+i*.026,m.wood,false);
    }else{attach(sphere('disabled status LED',.025,.025,.02,.11,.02,.25,m.red),g);}
  }
  const restoredMat=m.material('recovered Mona Lisa','#ffffff',.8);restoredMat.albedoTexture=new B.Texture(new URL('./assets/museum-mona-lisa.jpg',import.meta.url).href,scene);
  // Reserve the light budget for the room and nearby fixtures. Previously the
  // first eight global lights crowded out fixtures in the other rooms.
  for(const light of localLights)light.includedOnlyMeshes=[];
  const roomFor=p=>ROOMS.find(r=>Math.abs(p.x-r.x)<=r.w/2+.1&&Math.abs(p.z-r.z)<=r.d/2+.1);
  for(const mesh of props){mesh.computeWorldMatrix(true);const p=mesh.getBoundingInfo().boundingBox.centerWorld,room=roomFor(p);
    const nearest=localLights.filter(l=>roomFor(l.position)===room).sort((a,b)=>B.Vector3.DistanceSquared(p,a.position)-B.Vector3.DistanceSquared(p,b.position)).slice(0,2);
    for(const light of nearest)light.includedOnlyMeshes.push(mesh);
  }
  for(const {light,group}of pictureLights){
    const own=group.getChildMeshes();light.includedOnlyMeshes=[...own,...wallSurfaces.filter(mesh=>{const box=mesh.getBoundingInfo().boundingBox,p=light.position;return B.Vector3.Distance(p,B.Vector3.Clamp(p,box.minimumWorld,box.maximumWorld))<2;})];
    const shade=new B.ShadowGenerator(512,light);shade.usePercentageCloserFiltering=true;shade.bias=.00015;shade.normalBias=.008;shade.getShadowMap().renderList=own.filter(mesh=>mesh.name.includes('frame'));shade.getShadowMap().refreshRate=0;
  }
  shadows.getShadowMap().refreshRate=0;
  // A static room reflection supplies soft brass highlights without a distant sky photograph.
  const probe=new B.ReflectionProbe('museum reflections',256,scene);probe.position.set(0,2,-7);probe.renderList=props;probe.refreshRate=0;scene.environmentIntensity=.8;
  // Never sample the cubemap while drawing into that same cubemap.
  probe.cubeTexture.onBeforeBindObservable.add(()=>{scene.environmentTexture=null;});
  probe.cubeTexture.onAfterUnbindObservable.add(()=>{scene.environmentTexture=probe.cubeTexture;});
  // Capture once before assigning the environment. Without this explicit render
  // target the probe is never drawn, leaving metal and reflections black.
  scene.customRenderTargets.push(probe.cubeTexture);
  scene.executeWhenReady(()=>probe.cubeTexture.resetRefreshCounter());
  // Planar floor reflections are local to the museum and softened by the stone finish.
  const mirror=new B.MirrorTexture('polished marble reflection',1024,scene,true);
  mirror.mirrorPlane=new B.Plane(0,-1,0,.015);mirror.level=.35;mirror.adaptiveBlurKernel=12;
  mirror.renderList=props.filter(mesh=>!mesh.name.includes('floor')&&!mesh.name.includes('runner')&&!mesh.name.includes('joint')&&!mesh.name.includes('diamond'));
  mirror.refreshRate=2;for(const mat of floorMaterials){mat.reflectionTexture=mirror;mat.roughness=.25;}
  probe.renderList=props.filter(mesh=>!floorMaterials.includes(mesh.material));
  if(engine.webGLVersion>1){const ao=new B.SSAO2RenderingPipeline('museum ambient occlusion',scene,{ssaoRatio:.5,blurRatio:.5},[camera]);ao.radius=.5;ao.totalStrength=.65;ao.samples=8;ao.expensiveBlur=false;ao.textureSamples=4;}
  const glow=new B.GlowLayer('restrained light bloom',scene,{blurKernelSize:32});glow.intensity=.18;
  const debugMaterial=new B.StandardMaterial('collision wireframe',scene);debugMaterial.emissiveColor=B.Color3.FromHexString('#55edcd');debugMaterial.disableLighting=true;debugMaterial.wireframe=true;debugMaterial.alpha=.7;
  let boxesVisible=false,solved=false,time=0,foundCount=0;
  function hitboxes(value){boxesVisible=!!value;for(const mesh of debugMeshes.values())mesh.dispose();debugMeshes.clear();if(!boxesVisible)return;
    for(const body of physics.bodies){const d=body.museum;if(d.kind==='floor'||d.kind==='ceiling')continue;const mesh=B.MeshBuilder.CreateBox('hitbox '+d.id,{width:d.w+.005,height:d.h+.005,depth:d.d+.005},scene);mesh.material=debugMaterial;mesh.isPickable=false;mesh.position.copyFromFloats(body.position.x,body.position.y,body.position.z);debugMeshes.set(d.id,mesh);}
  }
  function target(found) {
    const ray=camera.getForwardRay(4.6),a=camera.position;let best=null,bestT=Infinity;
    for(const c of CLUES){if(found.includes(c.id))continue;const to=V(c.x-a.x,c.y-a.y,c.z-a.z),t=B.Vector3.Dot(to,ray.direction);if(t<0||t>4.5)continue;const d2=to.lengthSquared()-t*t;if(d2>Math.pow(c.radius+Math.min(.12,t*.022),2))continue;
      if([...WALLS,...FURNITURE,...COLUMNS].some(b=>segmentHitsBox(a,c,b)))continue;
      if(t<bestT){best=c;bestT=t;}
    }
    return best;
  }
  function update(pos,yaw,pitch,dt,state,{headBob=true}={}){
    time+=dt;camera.position.set(pos.x,pos.y+(headBob?Math.sin(time*9)*Math.min(.012,pos.speed*.005):0),pos.z);camera.rotation.set(-pitch,yaw+Math.PI,0);
    for(const b of physics.dynamic){const node=dynamicMeshes.get(b.museum.id),q=new B.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);if(B.Vector3.DistanceSquared(node.position,V(b.position.x,b.position.y,b.position.z))>.0001||(node.rotationQuaternion&&1-Math.abs(B.Quaternion.Dot(node.rotationQuaternion,q))>.00001))shadows.getShadowMap().resetRefreshCounter();node.position.copyFromFloats(b.position.x,b.position.y,b.position.z);node.rotationQuaternion=q;}
    if(boxesVisible)for(const b of physics.bodies){const mesh=debugMeshes.get(b.museum.id);if(mesh){mesh.position.copyFromFloats(b.position.x,b.position.y,b.position.z);mesh.rotationQuaternion=new B.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);}}
    for(const c of CLUES){const node=clueNodes.get(c.id);node.setEnabled(!state.found.includes(c.id));}
    if(foundCount!==state.found.length){foundCount=state.found.length;shadows.getShadowMap().resetRefreshCounter();}
    if(solved!==state.solved){solved=state.solved;restored.material=solved?restoredMat:m.linen;probe.cubeTexture.resetRefreshCounter();}
    scene.render();
  }
  await scene.whenReadyAsync();
  if(!isCurrent()){gfx.dispose();throw new Error('Museum loading cancelled');}
  return {gfx,scene,camera,update,target,hitboxes,resize:gfx.resize,dispose:gfx.dispose};
}
