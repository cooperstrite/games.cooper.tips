// Only added paint is transferred between poses. Native body art keeps its
// original pixels, anatomy, lighting and fur detail.
import { END_POSE_PAD, END_POSE_SCALE } from "./cats-dogs-pose-rigs.js";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function limb(source,target,width,sourceWidth=width){return{source,target,width,sourceWidth};}
export function petPoseSurface(sourceRig,targetRig,pose){
  const cat=sourceRig.cat,sad=pose==="sad",low=!cat&&sourceRig.neck[1]>.37;
  const eyeCenter=rig=>[(rig.eyes[0][0]+rig.eyes[1][0])/2,(rig.eyes[0][1]+rig.eyes[1][1])/2];
  const original=eyeCenter(sourceRig),posed=eyeCenter(targetRig),eyeAngle=rig=>Math.atan2(rig.eyes[1][1]-rig.eyes[0][1],rig.eyes[1][0]-rig.eyes[0][0]);
  const angle=eyeAngle(sourceRig)-eyeAngle(targetRig),headScale=Math.hypot(sourceRig.eyes[1][0]-sourceRig.eyes[0][0],sourceRig.eyes[1][1]-sourceRig.eyes[0][1])/Math.hypot(targetRig.eyes[1][0]-targetRig.eyes[0][0],targetRig.eyes[1][1]-targetRig.eyes[0][1]);
  const q=(x,y)=>[END_POSE_PAD+x*END_POSE_SCALE,END_POSE_PAD+y*END_POSE_SCALE+(targetRig.groundOffset||0)],line=(a,b)=>[...a,...b];
  const neck=targetRig.neck,hip=q(cat?.55:.59,sad?.78:.74),dy=low?.055:0;
  const near=cat?[.43,.445,.82,.45]:[.58,.445+dy,.16,.45+dy];
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
// Reposition complete markings with their body part. Sampling RGB through a
// changing mesh introduced grain and pulled spots into thin streaks; each mark
// now keeps its own rounded outline, scale, color and material controls.
export function posePetMarkings(markings,sourceRig,targetRig,pose){
  const surface=petPoseSurface(sourceRig,targetRig,pose),{original,posed,angle,headScale,regions}=surface;
  return markings.map(mark=>{
    const dx=mark.x-original[0],dy=mark.y-original[1];
    if(mark.y<sourceRig.neck[1]-.045&&Math.abs(dx)<.27){
      const a=-angle,s=1/headScale;
      return {...mark,x:posed[0]+(dx*Math.cos(a)-dy*Math.sin(a))*s,y:posed[1]+(dx*Math.sin(a)+dy*Math.cos(a))*s,size:mark.size*s,rotation:mark.rotation+a*180/Math.PI};
    }
    let best=null;
    regions.forEach(({source:s,target:t,width,sourceWidth},index)=>{
      const sx=s[2]-s[0],sy=s[3]-s[1],length=Math.hypot(sx,sy),u=((mark.x-s[0])*sx+(mark.y-s[1])*sy)/(length*length),v=((mark.x-s[0])*-sy+(mark.y-s[1])*sx)/length;
      const excess=(u-clamp(u,0,1))*length,score=(v*v+excess*excess)/(sourceWidth*sourceWidth);
      if(best&&score>=best.score)return;
      const tx=t[2]-t[0],ty=t[3]-t[1],targetLength=Math.hypot(tx,ty),z=clamp(u,-.12,1.12),side=v*width/sourceWidth;
      const a=Math.atan2(ty,tx)-Math.atan2(sy,sx),scale=clamp(Math.sqrt(targetLength/length*width/sourceWidth),.55,1.15);
      best={score,x:t[0]+tx*z-side*ty/targetLength,y:t[1]+ty*z+side*tx/targetLength,rotation:mark.rotation+a*180/Math.PI,size:mark.size*scale};
    });
    const {score,...mapped}=best;return {...mark,...mapped};
  });
}
