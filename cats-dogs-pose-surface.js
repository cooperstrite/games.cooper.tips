import { nativePoseRig, END_POSE_PAD, END_POSE_SCALE } from "./cats-dogs-pose-rigs.js";

// Celebration bodies use complete posed artwork. Only the original head is
// moved, as a rigid piece: no stretched arms, folded legs or warped faces.
const composed=new WeakMap();
export function posePoint(m,x,y){return [m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];}
export function petPoseLayout(source,pet){
  const target=nativePoseRig(pet),center=r=>r.eyes[0].slice(0,2).map((v,i)=>(v+r.eyes[1][i])/2);
  const A=center(source),B=center(target),vector=r=>[r.eyes[1][0]-r.eyes[0][0],r.eyes[1][1]-r.eyes[0][1]],a=vector(source),b=vector(target);
  const scale=Math.max(.86,Math.min(1.08,Math.hypot(...b)/Math.hypot(...a))),angle=Math.atan2(b[1],b[0])-Math.atan2(a[1],a[0]);
  const u=Math.cos(angle)*scale,v=Math.sin(angle)*scale,head=[u,v,-v,u,B[0]-u*A[0]+v*A[1],B[1]-v*A[0]-u*A[1]];
  return {head,scale,angle,target};
}
function canvas(size){const c=document.createElement("canvas");c.width=c.height=size;return c;}
function outline(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function clothMask(band,size){const out=canvas(size),c=out.getContext("2d"),data=c.createImageData(size,size);for(let k=0;k<band.length;k++)data.data[k*4+3]=band[k];c.putImageData(data,0,0);return out;}
export function poseTugSprite(body,sprite,sourceRig,pet,sourceBand,nativeBand){
  let cache=composed.get(body);if(!cache){cache=new WeakMap();composed.set(body,cache);}if(cache.has(sprite))return cache.get(sprite);
  const size=body.width,out=canvas(size),c=out.getContext("2d"),head=canvas(size),h=head.getContext("2d"),cat=sourceRig.cat,dy=cat?0:sourceRig.neck[1]-.341;
  const path=cat?[[.18,0],[1,0],[1,.31],[.60,.33],[.54,.37],[.40,.39],[.24,.37],[.18,.30]]:[[.30,0],[.84,0],[.84,.34+dy],[.74,.34+dy],[.69,.35+dy],[.54,.33+dy],[.45,.30+dy],[.37,.28+dy],[.30,.28+dy]];
  h.save();h.scale(size,size);outline(h,path);h.clip();h.drawImage(sprite,0,0,1,1);h.restore();h.globalCompositeOperation="destination-out";h.drawImage(clothMask(sourceBand,size),0,0,size,size);
  const layout=petPoseLayout(sourceRig,pet),rig=layout.target,p=v=>END_POSE_PAD+v*END_POSE_SCALE;
  c.drawImage(body,0,0);c.save();c.scale(size,size);c.globalCompositeOperation="destination-out";
  const rawNeck=rig.neck.map(v=>(v-END_POSE_PAD)/END_POSE_SCALE);
  let nativeHead;
  if(cat){const x=rawNeck[0]-.53,y=rawNeck[1]-.43;nativeHead=[[.15,0],[.75,0],[.78,.26],[.70,.38],[.57,.44],[.30,.45],[.17,.35]].map(([a,b])=>[p(a+x),p(b+y)]);}
  else{const x=rawNeck[0]-.56,y=rawNeck[1]-.323;nativeHead=[[.39,0],[1,0],[1,.32],[.69,.38],[.42,.31],[.38,.18]].map(([a,b])=>[p(a+x),p(b+y)]);}
  nativeHead=nativeHead.map(([x,y])=>[x,Math.min(y,rig.neck[1]-.012)]);outline(c,nativeHead);c.fill();c.restore();
  // Keep the body's collar, including its own lighting and saved color.
  const scarf=canvas(size),s=scarf.getContext("2d");s.drawImage(body,0,0);s.globalCompositeOperation="destination-in";s.drawImage(clothMask(nativeBand,size),0,0);
  c.drawImage(scarf,0,0);c.save();c.scale(size,size);c.transform(...layout.head);c.imageSmoothingQuality="high";c.drawImage(head,0,0,1,1);c.restore();
  cache.set(sprite,out);return out;
}
