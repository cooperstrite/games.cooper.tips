import test from "node:test";
import assert from "node:assert/strict";
import { RedlightRace, REDLIGHT_COURSES, RUN_SPEED } from "../redlight-engine.js";
import { DEFAULT_RUNNER, RUNNER_OPTIONS, readRunnerAppearance, runnerCharacter, loadRunnerAppearance, saveRunnerAppearance } from "../redlight-appearance.js";
import { studioCharacter } from "../arcade/studio-preview.js";

const race = (course="dash") => new RedlightRace({course,random:()=>.5});
const go = model => {model.start();model.step(3);assert.equal(model.phase,"green");};
const near = (actual,expected) => assert.ok(Math.abs(actual-expected)<1e-8,`${actual} differs from ${expected}`);

test("countdown cannot move the runner and the original green, amber, red timing is preserved",()=>{
  const model=race();model.hold(true);assert.equal(model.distance,0);model.start();model.hold(true);model.step(2.9);
  assert.equal(model.phase,"countdown");assert.equal(model.held,false);near(model.elapsed,0);model.step(.1);
  assert.equal(model.phase,"green");assert.equal(model.signal,"green");near(model.remaining,2.5);
  model.hold(true);model.step(2);assert.equal(model.signal,"amber");assert.equal(model.running,true);near(model.distance,2*RUN_SPEED);
  model.hold(false);model.step(.5);assert.equal(model.phase,"red");near(model.remaining,1.55);
  model.step(1.55);assert.equal(model.phase,"green");assert.equal(model.running,false);
});
test("holding across the red boundary catches at that boundary, even during a long frame",()=>{
  const model=race();go(model);model.hold(true);model.step(8);
  assert.equal(model.phase,"caught");near(model.distance,45);near(model.elapsed,2.5);assert.equal(model.running,false);
  const pose=model.stride;model.step(5);near(model.distance,45);assert.equal(model.stride,pose);
});
test("pressing on red loses immediately while releasing during amber is safe",()=>{
  const model=race();go(model);model.hold(true);model.step(2.2);model.hold(false);model.step(.3);
  assert.equal(model.phase,"red");near(model.distance,39.6);model.hold(true);assert.equal(model.phase,"caught");near(model.distance,39.6);
});
test("running starts and stops exactly with the hold input and freezes the last animation pose",()=>{
  const model=race();go(model);model.step(.3);near(model.distance,0);model.hold(true);model.step(.4);model.hold(false);
  const pose=model.stride;model.step(.6);near(model.distance,7.2);assert.equal(model.stride,pose);assert.equal(model.running,false);
});
test("pause freezes the signal, progress, clock and pose, then requires a new hold",()=>{
  const model=race();go(model);model.hold(true);model.step(.5);model.pause();const snapshot=JSON.stringify(model);model.hold(true);model.step(20);
  assert.equal(JSON.stringify(model),snapshot);model.resume();model.step(.25);near(model.distance,9);assert.equal(model.running,false);
  model.hold(true);model.step(.1);near(model.distance,10.8);
});
test("all finite courses finish at their exact line and preserve time only to the crossing",()=>{
  for(const [course,{distance}] of Object.entries(REDLIGHT_COURSES).filter(([,value])=>Number.isFinite(value.distance))){
    const model=race(course);go(model);
    for(let i=0;i<50&&model.phase!=="finished";i++){
      model.hold(true);model.step(1.9);if(model.phase==="finished")break;
      model.hold(false);model.step(model.remaining);assert.equal(model.phase,"red");model.step(model.remaining);
    }
    assert.equal(model.phase,"finished");assert.equal(model.distance,distance);assert.equal(model.running,false);
    const elapsed=model.elapsed;model.step(50);near(model.elapsed,elapsed);
  }
});
test("endless continues beyond the longest finite course and reset clears every active state",()=>{
  const model=race("endless");go(model);
  for(let i=0;i<12;i++){model.hold(true);model.step(2);model.hold(false);model.step(.5);model.step(1.55);}
  near(model.distance,432);assert.equal(model.phase,"green");model.pause();model.reset("sprint");
  assert.equal(model.target,50);assert.equal(model.phase,"idle");assert.equal(model.paused,false);assert.equal(model.distance,0);assert.equal(model.elapsed,0);assert.equal(model.held,false);
});
test("different renderer frame lengths produce the same race outcome",()=>{
  const a=race(),b=race();go(a);go(b);a.hold(true);b.hold(true);
  a.step(1.8);for(let i=0;i<180;i++)b.step(.01);
  a.hold(false);b.hold(false);a.step(3);for(let i=0;i<300;i++)b.step(.01);
  near(a.distance,b.distance);near(a.elapsed,b.elapsed);near(a.remaining,b.remaining);assert.equal(a.phase,b.phase);
});
test("malformed course and clock inputs cannot poison the race",()=>{
  const model=race("__proto__");assert.equal(model.course,"dash");go(model);model.hold(true);
  const before=JSON.stringify(model);for(const dt of [NaN,Infinity,-1,0])model.step(dt);assert.equal(JSON.stringify(model),before);
});
test("every runner option and color maps to both game and studio without altering cosmetics",()=>{
  for(const [slot,choices] of Object.entries(RUNNER_OPTIONS))for(const value of Object.keys(choices)){
    const look=readRunnerAppearance({...DEFAULT_RUNNER,[slot]:value,colors:{...DEFAULT_RUNNER.colors,hair:"#bb3344",body:"#aabbcc"}});
    const character=runnerCharacter(look);assert.deepEqual(studioCharacter("redlight",look),character);
    assert.equal(character.family,"runner");assert.equal(slot==="runner"?character.key:character.features[slot],value);
    assert.equal(character.colors.hair,"#bb3344");assert.equal(character.colors.body,"#aabbcc");assert.deepEqual(Object.keys(character.colors),Object.keys(DEFAULT_RUNNER.colors));
  }
});
test("runner storage normalizes corrupt saves and keeps hair independent of outfit changes",()=>{
  let saved;const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};
  assert.deepEqual(loadRunnerAppearance(storage),DEFAULT_RUNNER);
  const look=readRunnerAppearance({runner:"tracksuit",hair:"braids",colors:{hair:"#AbCdEf",skin:"invalid"},headwear:"__proto__",gravity:1});
  assert.equal(look.colors.hair,"#abcdef");assert.equal(look.colors.skin,DEFAULT_RUNNER.colors.skin);assert.equal(look.headwear,DEFAULT_RUNNER.headwear);assert.equal(look.gravity,undefined);
  saveRunnerAppearance(look,storage);assert.deepEqual(loadRunnerAppearance(storage),look);
  assert.equal(readRunnerAppearance({...look,runner:"sprinter"}).hair,"braids");
  const blocked={getItem:()=>{throw Error("blocked");},setItem:()=>{throw Error("full");}};
  assert.deepEqual(loadRunnerAppearance(blocked),DEFAULT_RUNNER);assert.equal(saveRunnerAppearance(look,blocked),false);
});
