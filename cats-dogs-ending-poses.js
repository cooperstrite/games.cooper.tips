import { tugCoat } from "./cats-dogs-customization.js";
import { petPoseLayout, posePoint } from "./cats-dogs-pose-surface.js";

// Pose metadata and feature anchors follow the same rigid head transform as
// the source artwork. Faces and fitted accessories are never redrawn.
export function endingRig(pet,source){
  const {head}=petPoseLayout(source,pet.pose),angle=Math.atan2(head[1],head[0]);
  const feature=([x,y,...rest])=>[...posePoint(head,x,y),...rest];
  return {...source,pose:pet.pose,eyes:source.eyes.map(eye=>{const result=feature(eye);result[4]+=angle;return result;}),nose:feature(source.nose),mouth:feature(source.mouth),hat:feature(source.hat),neck:feature(source.neck)};
}
export function endingAppearance(pet,pose){return {...pet,pose,markings:(pet.markings||[]).map(mark=>({...mark}))};}
export function endingSource(pet){return pet.pose?tugCoat(pet).image:null;}
