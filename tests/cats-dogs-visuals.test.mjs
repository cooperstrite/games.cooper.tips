import test from "node:test";
import assert from "node:assert/strict";
import { TugGroundEffects } from "../cats-dogs-ground-effects.js";
import { petBlink } from "../cats-dogs-expressions.js";
import { tugPresentation } from "../cats-dogs-ending.js";
import { petEarMotion } from "../cats-dogs-ears.js";
import { furVariation, furDepth } from "../cats-dogs-fur.js";
import { dogEarPose } from "../cats-dogs-dog-ears.js";
import { petRig } from "../cats-dogs-pet-rig.js";
import { TUG_BREEDS, tugCoats } from "../cats-dogs-customization.js";
import { petPoseLayout } from "../cats-dogs-pose-surface.js";
const paws=[{x:200,y:550},{x:420,y:550}];

test("celebrations preserve each original face and fitted hat with uniform scaling",()=>{
  for(const breed of Object.keys(TUG_BREEDS))for(const coat of tugCoats(breed)){
    const pet={breed,coat:coat.id,pose:"win"},source=petRig({...pet,pose:undefined}),target=petRig(pet),layout=petPoseLayout(source,pet);
    const features=rig=>[...rig.eyes,rig.nose,rig.mouth,rig.hat];
    const a=features(source),b=features(target);
    for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)assert.ok(Math.abs(Math.hypot(a[i][0]-a[j][0],a[i][1]-a[j][1])*layout.scale-Math.hypot(b[i][0]-b[j][0],b[i][1]-b[j][1]))<1e-12,"A pose must not shear a face or move its fitted hat");
  }
});

test("only actual pulls wear the ground, with stronger pulls disturbing more terrain",()=>{
  const weak=new TugGroundEffects(),strong=new TugGroundEffects();
  weak.update(.1);assert.equal(weak.marks.length,0);
  weak.pull("cats",paws,.6);strong.pull("cats",paws,12);
  assert.equal(weak.marks.length,2);assert.ok(strong.marks[0].rx>weak.marks[0].rx);assert.ok(strong.particles.length>weak.particles.length);
  const before=JSON.stringify(strong);strong.update(0);assert.equal(JSON.stringify(strong),before);
});
test("long matches retain bounded wear, settle their debris, and reset to fresh ground",()=>{
  const ground=new TugGroundEffects();for(let i=0;i<300;i++)ground.pull(i%2?"cats":"dogs",paws,6);
  assert.ok(ground.marks.length<=144);assert.ok(ground.particles.length<=180);
  for(let i=0;i<60;i++)ground.update(.05);
  assert.equal(ground.particles.length,0);assert.ok(ground.marks.length>0);
  ground.reset("beach");assert.equal(ground.arena,"beach");assert.equal(ground.marks.length,0);assert.equal(ground.particles.length,0);
});
test("reduced motion keeps the result of a pull without airborne debris; blink schedules are independent",()=>{
  const ground=new TugGroundEffects({reducedMotion:true});ground.pull("dogs",paws,12);
  assert.equal(ground.marks.length,2);assert.equal(ground.particles.length,0);
  let catBlinks=0,dogBlinks=0,different=false;
  for(let t=0;t<20;t+=.02){const a=petBlink(t,"cats"),b=petBlink(t,"dogs");assert.ok(a>=0&&a<=1&&b>=0&&b<=1);if(a>.5)catBlinks++;if(b>.5)dogBlinks++;if(Math.abs(a-b)>.5)different=true;}
  assert.ok(catBlinks>0&&dogBlinks>0&&different);
});
test("the match ending follows the human result in computer games and the winning animal in local games",()=>{
  for(const team of ["cats","dogs"])for(const winner of ["cats","dogs"]){
    const ai=tugPresentation({mode:"ai",team,winner});assert.equal(ai.kind,team===winner?"win":"lose");assert.equal(ai.featured,winner);assert.equal(ai.winner,winner);assert.notEqual(ai.loser,winner);
    const local=tugPresentation({mode:"local",team,winner});assert.equal(local.kind,"win");assert.equal(local.featured,winner);
  }
  for(const mode of ["ai","local"])assert.deepEqual(tugPresentation({mode,team:"cats",winner:null}),{kind:"draw",winner:null,featured:null,loser:null});
});
test("ear animation and fur texture stay deterministic and do not need gameplay randomness",()=>{
  for(let i=0;i<200;i++){
    const v=furVariation(i,i*3);assert.deepEqual(furVariation(i,i*3),v);assert.ok(v.shade>.94&&v.shade<1.06);assert.ok(Math.abs(v.warmth)<=8);
    assert.equal(petEarMotion(i/20,"cats",.8),petEarMotion(i/20,"cats",.8));
    assert.ok(Number.isFinite(petEarMotion(i/20,"dogs",.8,"lose")));
  }
  assert.notEqual(petEarMotion(.3,"cats"),petEarMotion(.3,"dogs"));
});
test("paint detail scales with its patch and foreground limbs retain depth over the chest",()=>{
  const spot={x:.4,y:.5,size:.08,textureScale:1};
  assert.notDeepEqual(furVariation(435,540,spot),furVariation(435,540,{...spot,textureScale:2}));
  for(const breed of ["tabby","labrador"]){
    const rig=petRig({breed}),arm=furDepth(rig,rig.cat?.64:.35,.43),body=furDepth(rig,.53,.59);
    assert.ok(arm>body+.08,"The foreleg should remain visibly separate from the chest under painted fur");
  }
});
test("both dog ears have independent, bounded listening and pulling motion for floppy and pointed breeds",()=>{
  for(const breed of ["golden","labrador","pitbull","corgi","husky"]){
    let independent=false,reacts=false;
    for(let t=0;t<14;t+=.1){
      const near=dogEarPose(t,breed,1),far=dogEarPose(t,breed,0),pull=dogEarPose(t,breed,1,1);
      assert.deepEqual(near,dogEarPose(t,breed,1));
      for(const pose of [near,far,pull]){assert.ok(Math.abs(pose.angle)<.6);assert.ok(Math.abs(pose.fold)<.7);assert.ok(pose.turn>=.9&&pose.turn<=1);}
      independent ||= Math.abs(near.angle-far.angle)>.05;
      reacts ||= Math.abs(near.fold-pull.fold)>.1;
    }
    assert.ok(independent&&reacts);
  }
  assert.notDeepEqual(dogEarPose(1,"labrador",1,1),dogEarPose(1,"corgi",1,1));
});
