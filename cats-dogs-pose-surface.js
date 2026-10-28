// Articulated cutouts of the actual gameplay sprite. No second coat, lighting
// pass, generated face, pixel projection or procedural fur is introduced.
const cutouts=new Map(),posed=new Map();
export function posePoint(m,x,y){return [m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];}
function transform(source,target,angle=0,sx=1,sy=sx){
  const a=Math.cos(angle)*sx,b=Math.sin(angle)*sx,c=-Math.sin(angle)*sy,d=Math.cos(angle)*sy;
  return [a,b,c,d,target[0]-a*source[0]-c*source[1],target[1]-b*source[0]-d*source[1]];
}
function bone(a,b,A,B,width=1){
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length,vx=(B[0]-A[0])/length,vy=(B[1]-A[1])/length;
  const scale=Math.hypot(vx,vy),a0=vx*ux+vy/scale*uy*width,b0=vy*ux-vx/scale*uy*width,c0=vx*uy-vy/scale*ux*width,d0=vy*uy+vx/scale*ux*width;
  return [a0,b0,c0,d0,A[0]-a0*a[0]-c0*a[1],A[1]-b0*a[0]-d0*a[1]];
}
export function petPoseLayout(rig,pose){
  const cat=rig.cat,sad=pose==="sad",dy=cat?0:rig.neck[1]-.341;
  const shoulder=cat?[.46,.445]:[.57,.43+dy],farShoulder=cat?[.57,.37]:[.46,.36+dy];
  const head=transform(rig.neck,cat?(sad?[.43,.51]:[.43,.37]):(sad?[.57,.50]:[.56,.35]),sad?(cat?.40:-.40):(cat?-.06:.06));
  const near=bone(shoulder,cat?[.82,.445]:[.17,.43+dy],cat?(sad?[.47,.57]:[.49,.47]):(sad?[.57,.56]:[.57,.47]),cat?(sad?[.52,.91]:[.60,.73]):(sad?[.53,.91]:[.46,.73]),.96);
  const far=bone(farShoulder,cat?[.89,.415]:[.115,.39+dy],cat?(sad?[.56,.56]:[.63,.43]):(sad?[.47,.55]:[.44,.43]),cat?(sad?[.65,.91]:[.77,.21]):(sad?[.42,.91]:[.24,.21]),.93);
  return {cat,sad,dy,head,near,far};
}
function canvas(size){const c=document.createElement("canvas");c.width=c.height=size;return c;}
function outline(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function parts(sprite,rig,band){
  if(cutouts.has(sprite))return cutouts.get(sprite);
  const cat=rig.cat,dy=cat?0:rig.neck[1]-.341,size=sprite.width;
  const paths=cat?{
    head:[[.18,0],[1,0],[1,.31],[.60,.33],[.54,.37],[.40,.39],[.24,.37],[.18,.30]],
    near:[[.40,.405],[.58,.383],[.71,.402],[.79,.413],[.835,.406],[.863,.424],[.867,.453],[.843,.486],[.80,.496],[.65,.48],[.54,.50],[.46,.525],[.39,.49]],
    far:[[.52,.32],[1,.32],[1,.50],[.73,.50],[.52,.425]],
  }:{
    head:[[.30,0],[.84,0],[.84,.34+dy],[.74,.34+dy],[.69,.35+dy],[.54,.33+dy],[.45,.30+dy],[.37,.28+dy],[.30,.28+dy]],
    near:[[.66,.395+dy],[.55,.38+dy],[.41,.39+dy],[.27,.405+dy],[.11,.40+dy],[.10,.50+dy],[.34,.51+dy],[.49,.515+dy],[.60,.53+dy],[.67,.47+dy]],
    far:[[0,.29+dy],[.49,.29+dy],[.52,.42+dy],[.28,.46+dy],[0,.46+dy]],
  };
  const result={};
  for(const [name,path]of Object.entries(paths)){
    const piece=canvas(size),c=piece.getContext("2d");c.scale(size,size);c.save();outline(c,path);c.clip();c.drawImage(sprite,0,0,1,1);c.restore();result[name]=piece;
  }
  // Front pieces own their original silhouettes at overlapping joints.
  const exclude=(piece,names)=>{const c=piece.getContext("2d");c.globalCompositeOperation="destination-out";c.save();c.setTransform(size,0,0,size,0,0);for(const name of names){outline(c,paths[name]);c.fill();}c.restore();c.globalCompositeOperation="source-over";};
  exclude(result.far,["head","near"]);exclude(result.near,["head"]);
  for(const name of ["near","far"]){const c=result[name].getContext("2d"),root=cat?(name==="near"?.43:.55):(name==="near"?.61:.49),tip=root+(cat?.11:-.11),fade=c.createLinearGradient(root,0,tip,0);fade.addColorStop(0,"#fff0");fade.addColorStop(1,"#fff");c.save();c.globalCompositeOperation="destination-in";c.fillStyle=fade;c.fillRect(0,0,1,1);c.restore();}
  const body=canvas(size),b=body.getContext("2d");b.scale(size,size);b.beginPath();
  if(cat){b.moveTo(.45,.51);b.quadraticCurveTo(.56,.47,.69,.51);b.lineTo(1,.51);b.lineTo(1,1);b.lineTo(0,1);b.lineTo(0,.45);b.lineTo(.32,.45);b.lineTo(.40,.51);}
  else{b.moveTo(.38,.51+dy*.3);b.quadraticCurveTo(.54,.47+dy*.3,.68,.51+dy*.3);b.lineTo(.76,.58);b.lineTo(.87,.43);b.lineTo(1,.43);b.lineTo(1,1);b.lineTo(0,1);b.lineTo(0,.56+dy*.3);b.lineTo(.38,.56+dy*.3);}
  b.closePath();b.clip();b.drawImage(sprite,0,0,1,1);result.body=body;
  const cloth=canvas(Math.sqrt(band.length)),cc=cloth.getContext("2d"),pixels=cc.createImageData(cloth.width,cloth.height);
  for(let k=0;k<band.length;k++)pixels.data[k*4+3]=band[k];cc.putImageData(pixels,0,0);
  for(const name of ["near","far","body"]){const c=result[name].getContext("2d");c.save();c.globalCompositeOperation="destination-out";c.drawImage(cloth,0,0,1,1);c.restore();}
  const scarf=canvas(size),s=scarf.getContext("2d");s.drawImage(sprite,0,0);s.globalCompositeOperation="destination-in";s.drawImage(cloth,0,0,size,size);result.head.getContext("2d").drawImage(scarf,0,0,1,1);
  cutouts.set(sprite,result);if(cutouts.size>4)cutouts.delete(cutouts.keys().next().value);return result;
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function poseBodyPoint(layout,x,y){
  const t=smooth((y-.50)/.44),topX=.54+(x-(layout.cat?.57:.54))*.95,topY=y+(layout.sad?-.03:layout.cat?-.14:-.17),X=.55+(x-.55)*(layout.sad?.64:.77);
  return [topX*(1-t)+X*t,topY*(1-t)+y*t+(layout.sad?Math.sin(t*Math.PI)*.10:0)];
}
function triangle(c,image,a,b,d,A,B,D){
  const determinant=(b[0]-a[0])*(d[1]-a[1])-(d[0]-a[0])*(b[1]-a[1]);
  const u=((B[0]-A[0])*(d[1]-a[1])-(D[0]-A[0])*(b[1]-a[1]))/determinant,v=((B[1]-A[1])*(d[1]-a[1])-(D[1]-A[1])*(b[1]-a[1]))/determinant;
  const w=((D[0]-A[0])*(b[0]-a[0])-(B[0]-A[0])*(d[0]-a[0]))/determinant,z=((D[1]-A[1])*(b[0]-a[0])-(B[1]-A[1])*(d[0]-a[0]))/determinant;
  c.save();c.beginPath();c.moveTo(...A);c.lineTo(...B);c.lineTo(...D);c.closePath();c.clip();c.transform(u,v,w,z,A[0]-u*a[0]-w*a[1],A[1]-v*a[0]-z*a[1]);c.drawImage(image,0,0,1,1);c.restore();
}
function poseBody(image,layout){
  const out=canvas(image.width),c=out.getContext("2d");c.scale(out.width,out.height);c.imageSmoothingQuality="high";c.globalCompositeOperation="lighter";
  // One continuous surface keeps the hips, legs, tail and chest connected.
  // Additive shared edges avoid the dark grid left by overlapping alpha clips.
  const nx=24,ny=36;
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const points=[[x/nx,y/ny],[(x+1)/nx,y/ny],[(x+1)/nx,(y+1)/ny],[x/nx,(y+1)/ny]],target=points.map(p=>poseBodyPoint(layout,...p));
    triangle(c,image,points[0],points[1],points[2],target[0],target[1],target[2]);triangle(c,image,points[0],points[2],points[3],target[0],target[2],target[3]);
  }
  return out;
}
export function poseTugSprite(sprite,rig,pose,band){
  let cache=posed.get(sprite);if(!cache){cache=new Map();posed.set(sprite,cache);if(posed.size>6)posed.delete(posed.keys().next().value);}if(cache.has(pose))return cache.get(pose);
  const layers=parts(sprite,rig,band),layout=petPoseLayout(rig,pose),out=canvas(sprite.width),c=out.getContext("2d");c.scale(out.width,out.height);c.imageSmoothingEnabled=true;c.imageSmoothingQuality="high";
  c.save();c.transform(...layout.far);c.drawImage(layers.far,0,0,1,1);c.restore();
  c.drawImage(poseBody(layers.body,layout),0,0,1,1);
  for(const name of ["near","head"]){c.save();c.transform(...layout[name]);c.drawImage(layers[name],0,0,1,1);c.restore();}
  cache.set(pose,out);return out;
}
