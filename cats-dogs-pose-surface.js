// Each pose samples the finished, saved gameplay coat through body landmarks.
// Paint stays in the original image's coordinates; only its surface is posed.
import { END_POSE_PAD, END_POSE_SCALE } from "./cats-dogs-ending-poses.js";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function limb(source,target,width,sourceWidth=width){return{source,target,width,sourceWidth};}
export function petPoseSurface(sourceRig,targetRig,pose){
  const cat=sourceRig.cat,sad=pose==="sad",low=!cat&&sourceRig.neck[1]>.37;
  const eyeCenter=rig=>[(rig.eyes[0][0]+rig.eyes[1][0])/2,(rig.eyes[0][1]+rig.eyes[1][1])/2];
  const original=eyeCenter(sourceRig),posed=eyeCenter(targetRig),eyeAngle=rig=>Math.atan2(rig.eyes[1][1]-rig.eyes[0][1],rig.eyes[1][0]-rig.eyes[0][0]);
  const angle=eyeAngle(sourceRig)-eyeAngle(targetRig),headScale=Math.hypot(sourceRig.eyes[1][0]-sourceRig.eyes[0][0],sourceRig.eyes[1][1]-sourceRig.eyes[0][1])/Math.hypot(targetRig.eyes[1][0]-targetRig.eyes[0][0],targetRig.eyes[1][1]-targetRig.eyes[0][1]);
  const q=(x,y)=>[END_POSE_PAD+x*END_POSE_SCALE,END_POSE_PAD+y*END_POSE_SCALE],line=(a,b)=>[...a,...b];
  const neck=targetRig.neck,hip=q(cat?.55:.59,sad?.78:.74),dy=low?.055:0;
  const near=sad?(cat?[.43,.43,.80,.45]:[.57,.415+dy,.16,.43+dy]):cat?[.68,.44,.82,.46]:[.32,.43+dy,.16,.43+dy];
  const far=cat?[.50,.37,.86,.41]:[.47,.36+dy,.10,.39+dy];
  const frontPaw=q(sad?(cat?.65:.36):(cat?.61:.55),sad?.91:.49),farPaw=sad?q(cat?.75:.47,.90):targetRig.pawPads.slice(0,2);
  const regions=[
    limb(cat?[.50,.49,.54,.72]:[.54,.48+dy,.60,.71],line([neck[0],neck[1]+.08],hip),.13,.15),
    limb(near,line(sad?[neck[0]+(cat?.01:.02),neck[1]+.045]:q(cat?.53:.64,cat?.585:.45),frontPaw),sad?.038:.045,.045),
    limb(far,line([neck[0]+(cat?.075:-.07),neck[1]+.015],farPaw),.043,.040),
    limb(cat?[.46,.72,.25,.94]:[.53,.70,.26,low?.95:.93],line(hip,q(cat?.43:.42,sad?.91:.94)),sad?.10:.07,.08),
    limb(cat?[.63,.73,.88,.94]:[.67,.72,.88,low?.95:.93],line(hip,q(cat&&!sad?.84:.70,sad?.90:.94)),sad?.12:.075,.09),
    limb(cat?[.35,.70,.14,.65]:[.73,.62,.89,.55],line(q(cat?.42:.72,sad?.82:.71),q(cat?.18:.90,sad?.82:.65)),cat?.10:.075,cat?.11:.085),
  ];
  return {original,posed,angle,headScale,neck,cat,regions,sad};
}
export function sourceCoatPoint(surface,x,y){
  const {original,posed,angle,headScale,neck,cat,regions,sad}=surface;
  const dx=x-posed[0],dy=y-posed[1],headBottom=neck[1]+.005;
  // The whole head, ears and muzzle share the same transform. A raised arm
  // outside its silhouette belongs to the arm even when above the head.
  const headX=Math.abs(dx)/.205,headY=dy/(dy<0?.225:.105);
  if(y<headBottom&&headX*headX+headY*headY<1.15){
    return{x:original[0]+(dx*Math.cos(angle)-dy*Math.sin(angle))*headScale,y:original[1]+(dx*Math.sin(angle)+dy*Math.cos(angle))*headScale,cx:original[0]+(cat?-.04:.05),cy:original[1]+.06,part:0};
  }
  let best=null;
  regions.forEach(({source:s,target:t,width,sourceWidth},index)=>{
    const vx=t[2]-t[0],vy=t[3]-t[1],len=Math.hypot(vx,vy),u=((x-t[0])*vx+(y-t[1])*vy)/(len*len),v=((x-t[0])*-vy+(y-t[1])*vx)/len;
    const excess=(u-clamp(u,0,1))*len,distance=(v*v+excess*excess)/(width*width);
    // The folded forepaw sits in front of the chest, so its coat wins where
    // those two body surfaces overlap in the waving pose.
    const score=cat&&!sad&&index===1&&distance<1?distance*.012:distance;
    if(best&&score>=best.score)return;
    const sx=s[2]-s[0],sy=s[3]-s[1],sl=Math.hypot(sx,sy),z=clamp(u,-.12,1.12),cx=s[0]+z*sx,cy=s[1]+z*sy;
    best={score,x:cx-v*sy/sl*sourceWidth/width,y:cy+v*sx/sl*sourceWidth/width,cx,cy,part:index+1};
  });
  return best;
}
