import test from 'node:test';
import assert from 'node:assert/strict';
import { TAU, DASH_PEAK, DASH_DURATION, ORBIT_LEVELS, ORBIT_TARGET, createOrbit, startOrbit, stepOrbit, dashOrbit, pauseOrbit, orbitCue, orbitRadius, gateAngle, orbitSpeed, orbitWidth, readOrbitSave } from '../orbit-engine.js';

const advance=(s,n,dt=1/120)=>{for(let t=0;t<n-1e-8;t+=dt)stepOrbit(s,Math.min(dt,n-t));};
function fly(s,{limit=120,dt=1/120}={}){
  startOrbit(s);
  for(let t=0;t<limit&&s.phase==='playing';t+=dt){
    const cue=orbitCue(s);
    if(cue.ready&&cue.error<orbitWidth(s)*.12)dashOrbit(s);
    stepOrbit(s,dt);s.events.length=0;
  }
  return s;
}

for(const difficulty of Object.keys(ORBIT_LEVELS)){
  test(`${difficulty}: all 18 gates are reachable with legal timed inputs, including drift`,()=>{
    let seed=17;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
    const s=fly(createOrbit({difficulty,random}));
    assert.equal(s.phase,'won');assert.equal(s.gates,ORBIT_TARGET);assert.equal(s.attempts,ORBIT_TARGET);
    assert.equal(s.perfect,ORBIT_TARGET);assert.equal(s.hull,ORBIT_LEVELS[difficulty].hull);assert.ok(s.score>1800);
  });
  test(`${difficulty}: missing gates consumes shields and ends the run`,()=>{
    const s=createOrbit({difficulty,random:()=>0});startOrbit(s);advance(s,60);
    assert.equal(s.phase,'lost');assert.equal(s.hull,0);assert.equal(s.gates,0);assert.equal(s.score,0);
  });
}

test('gates spawn ahead, including unwrapped orbits beyond the angle seam',()=>{
  for(const random of [()=>0,()=>.99])for(const angle of [-Math.PI/2,TAU-.1,TAU*150]){
    const s=createOrbit({random,difficulty:'expert'});s.angle=angle;startOrbit(s);
    assert.ok(gateAngle(s)-s.angle>1.7);advance(s,.5);assert.equal(s.hull,2);
  }
});
test('one dash peaks at the gate radius, returns smoothly, and cannot be repeated while airborne',()=>{
  const s=createOrbit({random:()=>0});startOrbit(s);
  while(!orbitCue(s).perfect)stepOrbit(s,1/240);
  assert.equal(dashOrbit(s),true);assert.equal(dashOrbit(s),false);assert.equal(orbitRadius(s),.72);
  advance(s,DASH_PEAK);assert.ok(Math.abs(orbitRadius(s)-1)<1e-7);assert.equal(s.gates,1);
  advance(s,DASH_DURATION-DASH_PEAK+.02);assert.equal(s.dash,null);assert.equal(orbitRadius(s),.72);
});
test('early and late launches receive accurate feedback and only one penalty',()=>{
  const early=createOrbit({random:()=>0});startOrbit(early);dashOrbit(early);advance(early,.8);
  assert.equal(early.hull,2);assert.match(early.notice,/Too early/);assert.equal(early.events.filter(e=>e.type==='miss').length,1);
  const late=createOrbit({random:()=>0});startOrbit(late);
  while(orbitCue(late).error>-orbitWidth(late)-.04)stepOrbit(late,1/240);
  dashOrbit(late);advance(late,.8);assert.equal(late.hull,2);assert.match(late.notice,/Too late/);
});
test('a gate passing unnoticed cannot immediately respawn or repeat its damage',()=>{
  const s=createOrbit({random:()=>0});startOrbit(s);
  while(s.hull===3)stepOrbit(s,1/120);
  assert.equal(s.gate,null);advance(s,.7);assert.equal(s.hull,2);assert.equal(s.gate,null);
  advance(s,.5);assert.ok(s.gate);assert.ok(gateAngle(s)-s.angle>1);
});
test('pausing freezes the complete approach and refuses dash input',()=>{
  const s=createOrbit();startOrbit(s);advance(s,.4);pauseOrbit(s,true);
  const before=JSON.stringify(s);advance(s,15);assert.equal(dashOrbit(s),false);assert.equal(JSON.stringify(s),before);
  pauseOrbit(s,false);advance(s,.1);assert.ok(s.time>.4);
});
test('30, 60, and 144 fps can all complete the expedition without dropped collision checks',()=>{
  for(const fps of [30,60,144]){const s=fly(createOrbit({difficulty:'expert',random:()=>.3}),{dt:1/fps});assert.equal(s.phase,'won');assert.equal(s.hull,2);}
});
test('endless flight continues past expedition length and difficulty has finite limits',()=>{
  const s=fly(createOrbit({mode:'endless',difficulty:'hard',random:()=>.2}),{limit:140});
  assert.equal(s.phase,'playing');assert.ok(s.gates>30);assert.ok(s.score>0);assert.ok(orbitSpeed(s)<=ORBIT_LEVELS.hard.speed*1.34+1e-9);
  assert.ok(orbitWidth(s)>=ORBIT_LEVELS.hard.width*.84-1e-9);
});
test('a completed sector restores at most one shield and a miss resets the multiplier',()=>{
  const s=createOrbit({random:()=>0});startOrbit(s);dashOrbit(s);advance(s,1.8);assert.equal(s.hull,2);
  while(s.gates<6&&s.phase==='playing'){const cue=orbitCue(s);if(cue.ready&&cue.error<.02)dashOrbit(s);stepOrbit(s,1/120);}
  assert.equal(s.hull,3);assert.equal(s.sector,1);assert.ok(s.streak>=6);
  advance(s,3.5);assert.equal(s.streak,0);assert.equal(s.hull,2);
});
test('completed flights are immutable to input and time, and malformed elapsed time is harmless',()=>{
  const s=fly(createOrbit({random:()=>0}));const before=JSON.stringify(s);
  assert.equal(dashOrbit(s),false);assert.equal(pauseOrbit(s),false);advance(s,10);assert.equal(JSON.stringify(s),before);
  const active=createOrbit();startOrbit(active);stepOrbit(active,NaN);stepOrbit(active,-1);stepOrbit(active,Infinity);assert.equal(active.time,0);
});
test('saved preferences and records are validated and kept separate for each flight plan',()=>{
  assert.equal(readOrbitSave('broken').difficulty,'medium');assert.equal(readOrbitSave('null').mode,'expedition');
  const s=readOrbitSave(JSON.stringify({difficulty:'expert',mode:'endless',sound:false,best:{'expert:endless':1234,'easy:expedition':-12,'hard:endless':'oops'}}));
  assert.equal(s.difficulty,'expert');assert.equal(s.sound,false);assert.equal(s.best['expert:endless'],1234);assert.equal(s.best['easy:expedition'],0);assert.equal(s.best['hard:endless'],0);
});
