import { createWebGLScene } from "./arcade/babylon.js";
import { pointOnEdge } from "./switchyard-network.js";
import { trainPose } from "./switchyard-model.js";
import { PALETTES, stationSite } from "./switchyard-art.js";

// A second rendering adapter for the same railway simulation; no rules live here.
export async function createRailwayCab(canvas,state,{isCurrent=()=>true}={}) {
  const view=await createWebGLScene(canvas,{quality:"balanced",isCurrent});
  const {B,scene,camera}=view, pal=PALETTES[state.level.theme],materials=new Map();
  function material(color,{emissive=false}={}) {const key=color+emissive;if(!materials.has(key)){const mat=new B.StandardMaterial(key,scene);mat.diffuseColor=B.Color3.FromHexString(color);mat.specularColor=B.Color3.Black();if(emissive)mat.emissiveColor=mat.diffuseColor.scale(.3);materials.set(key,mat);}return materials.get(key);}
  scene.clearColor=B.Color4.FromHexString("#c6e6e8ff");scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.005;scene.fogColor=B.Color3.FromHexString("#c6e6e8");
  scene.imageProcessingConfiguration.toneMappingEnabled=false;view.sun.intensity=.85;camera.fov=1.03;camera.maxZ=280;
  const staticMeshes=[],signals=[],trainMeshes=new Map(),owned=[];
  function finish(mesh,color,x,y,z,parent=null,options={}){mesh.position.set(x,y,z);mesh.material=material(color,options);mesh.isPickable=false;if(parent)mesh.parent=parent;else staticMeshes.push(mesh);return mesh;}
  function box(name,x,y,z,w,h,d,color,parent=null){return finish(B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene),color,x,y,z,parent);}
  function ball(name,x,y,z,size,color,parent=null){return finish(B.MeshBuilder.CreateSphere(name,{diameter:size,segments:8},scene),color,x,y,z,parent);}
  function cylinder(name,x,y,z,diameter,height,color,parent=null,top=diameter){return finish(B.MeshBuilder.CreateCylinder(name,{diameterBottom:diameter,diameterTop:top,height,tessellation:12},scene),color,x,y,z,parent);}
  function tube(name,points,radius,color,parent=null){return finish(B.MeshBuilder.CreateTube(name,{path:points,radius,tessellation:6,cap:B.Mesh.CAP_ALL},scene),color,0,0,0,parent);}
  function sign(label,x,y,z,color,width=6){
    const texture=new B.DynamicTexture(`sign-${label}`,{width:512,height:128},scene,false);texture.hasAlpha=true;
    const ctx=texture.getContext();ctx.fillStyle="#fff4d9";ctx.beginPath();ctx.roundRect(0,0,512,128,20);ctx.fill();ctx.font="bold 56px sans-serif";ctx.fillStyle=color;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(label,256,67);texture.update();
    const mat=new B.StandardMaterial(`sign-${label}`,scene);mat.diffuseTexture=texture;mat.emissiveColor=new B.Color3(.45,.45,.45);mat.specularColor=B.Color3.Black();mat.backFaceCulling=false;
    const mesh=B.MeshBuilder.CreatePlane(`sign-${label}`,{width,height:width/4},scene);mesh.position.set(x,y,z);mesh.material=mat;mesh.billboardMode=B.Mesh.BILLBOARDMODE_Y;mesh.isPickable=false;owned.push(mesh,mat,texture);
  }
  box("rolling meadow",50,-.22,-35,380,.4,380,pal.grass);
  if(["river","alpine","festival"].includes(state.level.theme)){
    const points=[];for(let i=0;i<=40;i++){const y=-15+i*2.5;points.push(new B.Vector3(51+Math.sin(y*.08)*7,-.005,-y));}
    const bank=tube("river bank",points,3.3,pal.light);bank.scaling.y=.012;const water=tube("river",points,2.7,pal.water);water.scaling.y=.018;
  }
  if(state.level.theme==="coast")box("open sea",161,-.04,-35,130,.08,180,pal.water);
  // Rails are true curves; sleepers and buildings are merged by material below.
  for(const edge of Object.values(state.network.edges)) {
    const paths=[[],[]];for(let i=0;i<edge.samples.length;i++){const p=edge.samples[i],a=edge.samples[Math.max(0,i-1)],b=edge.samples[Math.min(edge.samples.length-1,i+1)],l=Math.hypot(b.x-a.x,b.y-a.y)||1,dx=(b.x-a.x)/l,dy=(b.y-a.y)/l;for(let j=0;j<2;j++)paths[j].push(new B.Vector3(p.x+dy*(j?1:-1)*1.5,.025,-p.y+dx*(j?1:-1)*1.5));}
    finish(B.MeshBuilder.CreateRibbon("ballast",{pathArray:paths,sideOrientation:B.Mesh.DOUBLESIDE},scene),"#b6ad91",0,0,0);
    for(let d=.5;d<edge.length;d+=1.5){const p=pointOnEdge(edge,d),tie=box("sleeper",p.x,.12,-p.y,2.5,.16,.28,"#826e54");tie.rotation.y=Math.atan2(p.dx,-p.dy);}
    for(const side of [-1,1]){const points=[];for(let d=0;d<=edge.length+.5;d+=.65){const p=pointOnEdge(edge,Math.min(edge.length,d));points.push(new B.Vector3(p.x+p.dy*.68*side,.28,-p.y+p.dx*.68*side));}tube("rail",points,.095,"#b8c3bb");}
  }
  for(const p of state.network.crossings){const cross=box("crossing warning",p.x,.07,-p.y,4,.04,4,"#ebd38e");cross.rotation.y=Math.PI/4;}
  for(const p of state.network.scenery){
    cylinder("trunk",p.x,.8*p.size,-p.y,.4*p.size,1.6*p.size,"#8b7352");
    if(p.kind==="house"){box("cottage",p.x,1.4,-p.y,4,2.8,3,"#eac896");box("roof",p.x,2.95,-p.y,4.6,.45,3.6,"#a46952");box("door",p.x,1,-p.y-1.52,.8,2,.05,"#728d80");}
    else if(p.kind==="pine"){for(let i=0;i<3;i++)cylinder("pine",p.x,(2+i*.8)*p.size,-p.y,(3.3-i*.7)*p.size,2.4*p.size,pal.tree,null,0);}
    else {const crown=ball("tree crown",p.x,2.7*p.size,-p.y,3.2*p.size,pal.tree);crown.scaling.y=1.12;ball("sunlit leaves",p.x-.6*p.size,3.2*p.size,-p.y-.3,2.3*p.size,"#91b17f");}
  }
  for(let i=0;i<16;i++){const angle=i*Math.PI/8,x=50+Math.cos(angle)*108,z=-35+Math.sin(angle)*104,h=state.level.theme==="alpine"?20:9;const hill=ball("distant hills",x,h*.2,z,30,i%2?"#a1c3ab":"#b4d0b7");hill.scaling.y=h/20;if(state.level.theme==="alpine")cylinder("mountain snow",x,h+4,z,14,12,"#f2f1df",null,0);}
  for(let i=0;i<11;i++){const x=-60+(i*37)%210,z=-90+(i*53)%160;for(let j=0;j<3;j++){const cloud=ball("cloud",x+j*3,31+i%3*3,z,6,"#f9f4df");cloud.scaling.y=.5;}}
  for(const n of state.network.stations){
    const p=stationSite(n),yaw=Math.atan2(n.heading[0],-n.heading[1]);
    const platform=box("platform",n.x+n.heading[1]*2.8,.4,-n.y+n.heading[0]*2.8,2,.8,11,"#d0c2a2");platform.rotation.y=yaw;
    box("station",p.x,1.65,-p.y,5.8,3.3,3.7,"#ffebbf");box("station canopy",p.x,3.5,-p.y,6.6,.45,4.3,n.color);
    for(const dx of [-1.8,1.8]){box("station window",p.x+dx,2,-p.y-1.87,1.1,1.3,.05,"#83b8bc");box("station window",p.x+dx,2,-p.y+1.87,1.1,1.3,.05,"#83b8bc");}
    for(const side of [-1,1])box("door",p.x,1,-p.y+side*1.87,.95,2,.05,n.color);
    sign(`${n.icon}  ${n.short}`,p.x,4.6,-p.y,n.color,7);
    for(let i=0;i<3;i++){const x=n.x+n.heading[1]*2.8+n.heading[0]*(i-1)*1.25,z=-n.y+n.heading[0]*2.8-n.heading[1]*(i-1)*1.25;cylinder("passenger",x,1.25,z,.42,.9,["#c67563","#6892ab","#9882b1"][i]);ball("passenger head",x,1.95,z,.47,"#e8be8f");}
  }
  // Keep signals separate so a red light and the selected branch update immediately.
  for(const n of state.network.junctions){const root=new B.TransformNode(`signal-${n.id}`,scene),x=n.x+n.heading[1]*3.8,z=-n.y+n.heading[0]*3.8;
    cylinder("signal post",x,1.6,z,.2,3.2,"#52675b");const lamp=ball("signal lamp",x,3.4,z,.75,"#a8df8d",root);
    sign(n.id,x,2.4,z,"#35584e",1.8);const routes=n.out.map(id=>{const edge=state.network.edges[id],points=[];for(let d=0;d<5;d+=.5){const p=pointOnEdge(edge,d);points.push(new B.Vector3(p.x,.36,-p.y));}return tube("route indicator",points,.13,"#f4c666",root);});signals.push({id:n.id,lamp,routes});
  }
  // A compact scene: hundreds of sleepers/trees become a few material batches.
  const batches=new Map();for(const mesh of staticMeshes){const key=mesh.material; if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);}
  for(const batch of batches.values())if(batch.length>1)B.Mesh.MergeMeshes(batch,true,true,undefined,false,false);
  function vehicle(t,coach){
    const root=new B.TransformNode(`${t.id}-${coach?"coach":"engine"}`,scene),wheels=[];
    box("chassis",0,.64,0,1.85,.3,4.1,"#3b554c",root);
    for(const z of [-1.35,1.35])for(const x of [-.95,.95]){const axle=new B.TransformNode("axle",scene);axle.parent=root;axle.position.set(x,.5,z);axle.rotation.z=Math.PI/2;const wheel=cylinder("wheel",0,0,0,.83,.22,"#344a44",axle);const hub=cylinder("wheel hub",0,x>0?-.13:.13,0,.48,.03,"#eed08b",axle);const spoke=box("wheel spoke",0,x>0?-.15:.15,0,.07,.04,.55,"#fff0c4",axle);wheels.push({wheel,hub,spoke});}
    if(coach){box("coach body",0,1.4,0,1.8,1.3,3.8,t.color,root);box("coach roof",0,2.18,0,2,.3,4.05,"#fae6b5",root);for(const side of [-1,1])for(let i=0;i<3;i++)box("coach glass",side*.91,1.65,-1.15+i*1.15,.04,.6,.75,"#a2d4d8",root);}
    else {
      const boiler=cylinder("boiler",0,1.3,.65,1.45,2.6,t.color,root);boiler.rotation.x=Math.PI/2;
      for(const z of [-.3,1.3]){const ring=cylinder("boiler band",0,1.3,z,1.5,.13,"#f0d195",root);ring.rotation.x=Math.PI/2;}
      cylinder("chimney",0,2.1,1.3,.42,1,"#43574d",root);cylinder("chimney lip",0,2.6,1.3,.62,.15,"#52635a",root);
      box("cab back",0,1.75,-1.75,1.9,2.1,.15,t.color,root);
      for(const x of [-.94,.94]){box("cab side",x,1.3,-1.1,.12,1.1,1.5,t.color,root);for(const z of [-1.7,-.4])box("cab window pillar",x,2.5,z,.12,1.35,.12,"#ffe9b5",root);}
      box("cab roof",0,3.25,-1.05,2.3,.2,2,"#fae8be",root);
      const light=ball("headlight",0,1.3,2,.45,"#fff1ad",root);light.scaling.z=.4;
      box("buffer beam",0,.72,2.1,2,.3,.2,"#f2d297",root);
    }
    return {root,wheels};
  }
  for(const t of state.trains)trainMeshes.set(t.id,{engine:vehicle(t,false),coach:vehicle(t,true)});
  const effectRoot=new B.TransformNode("crash effects",scene),sparks=[];
  for(let i=0;i<24;i++){const mesh=ball("explosion",0,-10,0,1,["#ffd989","#ed9755","#6c776c"][i%3],effectRoot);mesh.setEnabled(false);sparks.push(mesh);}
  let disposed=false;
  return {
    draw(s,selected,reduced=false){if(disposed)return;const active=s.trains.find(t=>t.id===selected)||s.trains[0];
      for(const t of s.trains){const meshes=trainMeshes.get(t.id);for(const [part,behind] of [[meshes.engine,0],[meshes.coach,5.7]]){const p=trainPose(s,t,behind);part.root.position.set(p.x,0,-p.y);part.root.rotation.y=Math.atan2(p.dx,-p.dy);for(const wheel of part.wheels){wheel.spoke.rotation.y=-t.odometer/.415;}}}
      for(const signal of signals){const sw=s.switches[signal.id];signal.lamp.material=material(sw.green?"#a4e386":"#ed7057",{emissive:true});signal.routes.forEach((r,i)=>r.setEnabled(i===sw.choice));}
      const p=trainPose(s,active);camera.position.set(p.x-p.dx*.9,2.83,-p.y+p.dy*.9);camera.setTarget(new B.Vector3(p.x+p.dx*14,2.35,-p.y-p.dy*14));
      for(let i=0;i<sparks.length;i++){const mesh=sparks[i],age=s.crash?.age??10,visible=age<3.8;mesh.setEnabled(visible);if(visible){const a=i*2.4,r=Math.min(age,2)*(reduced?1.2:2.8)*(1+i%3*.25);mesh.position.set(s.crash.x+Math.cos(a)*r,1+age*(i%3===2?1.6:.5),-s.crash.y+Math.sin(a)*r);mesh.scaling.setAll(Math.max(.01,(i%3===2?1+age:1.6-age*.5)*(1-age/3.8)));}}
      view.render();
    },
    resize:view.resize,
    dispose(){if(disposed)return;disposed=true;owned.forEach(item=>item.dispose());view.dispose();},
  };
}
