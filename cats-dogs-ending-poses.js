import { nativePoseSource, nativePoseRig } from "./cats-dogs-pose-rigs.js";
import { petPoseLayout, posePoint } from "./cats-dogs-pose-surface.js";

export function endingRig(pet,source){
  if(pet.pose==="sad")return nativePoseRig(pet);
  const {head,angle,scale,target}=petPoseLayout(source,pet);
  const feature=([x,y,...rest])=>[...posePoint(head,x,y),...rest.map(v=>v*scale)];
  return {...source,pose:pet.pose,eyes:source.eyes.map(([x,y,rx,ry,a,shape])=>[...posePoint(head,x,y),rx*scale,ry*scale,a+angle,shape]),nose:feature(source.nose),mouth:feature(source.mouth),hat:feature(source.hat),neck:target.neck};
}
// Paint stays in gameplay coordinates; rendering never mutates the wardrobe.
export function endingAppearance(pet,pose){return {...pet,pose,markings:(pet.markings||[]).map(mark=>({...mark}))};}
export function endingSource(pet){return pet.pose?nativePoseSource(pet):null;}
