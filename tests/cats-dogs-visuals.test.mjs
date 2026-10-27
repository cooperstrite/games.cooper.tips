import test from "node:test";
import assert from "node:assert/strict";
import { TugGroundEffects } from "../cats-dogs-ground-effects.js";
import { petBlink } from "../cats-dogs-expressions.js";
const paws=[{x:200,y:550},{x:420,y:550}];

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
