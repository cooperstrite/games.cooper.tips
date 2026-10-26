import test from "node:test";
import assert from "node:assert/strict";
import { TUG_ARENAS, TUG_MATCH_RULES, createTugMatch, startTugMatch, nextTugRound, queueTugPull, createTugComputer, tickTugMatch, tugQuality, tugSecondsLeft } from "../cats-dogs-engine.js";

const rng = seed => () => { seed = Math.imul(1664525,seed)+1013904223|0;return (seed>>>0)/4294967296; };
const playing = options => {const s=createTugMatch(options);startTugMatch(s);tickTugMatch(s,3);return s;};
function beat(s, sides = ["cats"], computer = null) {
  const period=TUG_ARENAS[s.arena].period;tickTugMatch(s,period/2,computer);
  for(const side of sides)queueTugPull(s,side);
  return tickTugMatch(s,period/2,computer);
}
test("saved options normalize to legal modes, teams, arenas and opponents",()=>{
  const s=createTugMatch({mode:"unknown",team:"unknown",difficulty:"__proto__",arena:"__proto__"});
  assert.equal(s.mode,"ai");assert.equal(s.team,"cats");assert.equal(s.arena,"meadow");assert.equal(s.difficulty,"medium");
});
test("countdown blocks pulls, then enters the first beat without losing elapsed time",()=>{
  const s=createTugMatch();assert.equal(queueTugPull(s,"cats").type,"ignored");startTugMatch(s);
  tickTugMatch(s,2.5);assert.equal(s.phase,"countdown");assert.equal(s.countdown,.5);assert.equal(queueTugPull(s,"cats").type,"ignored");
  tickTugMatch(s,.7);assert.equal(s.phase,"playing");assert.ok(Math.abs(s.beatTime-.2)<1e-8);assert.equal(startTugMatch(s),false);
});
test("timing windows have inclusive boundaries and reward precision",()=>{
  assert.equal(tugQuality(.5),"perfect");assert.equal(tugQuality(.425),"perfect");assert.equal(tugQuality(.575),"perfect");
  assert.equal(tugQuality(.33),"good");assert.equal(tugQuality(.67),"good");assert.equal(tugQuality(.2),"early");
  const s=playing();tickTugMatch(s,.75);const p=queueTugPull(s,"cats");assert.equal(p.quality,"perfect");assert.equal(p.power,5);
});
test("mashing cannot create extra pulls, strength, or stamina costs",()=>{
  const s=playing();tickTugMatch(s,.75);queueTugPull(s,"cats");
  for(let i=0;i<40;i++)assert.equal(queueTugPull(s,"cats").type,"duplicate");
  assert.equal(s.position,0);tickTugMatch(s,.75);assert.equal(s.position,-5);assert.equal(s.sides.cats.energy,88);assert.equal(s.sides.cats.pulls,1);
});
test("simultaneous pulls cancel equally regardless of input order",()=>{
  for(const sides of [["cats","dogs"],["dogs","cats"]]){
    const s=playing({mode:"local"});beat(s,sides);assert.equal(s.position,0);assert.equal(s.sides.cats.energy,s.sides.dogs.energy);
    assert.equal(s.sides.cats.perfect,1);assert.equal(s.sides.dogs.perfect,1);
  }
});
test("the fourth perfect pull spends a charged combo for double strength",()=>{
  const s=playing();for(let i=0;i<3;i++)beat(s);assert.equal(s.sides.cats.streak,3);assert.equal(s.position,-15);
  beat(s);assert.equal(s.position,-25);assert.equal(s.sides.cats.streak,0);assert.equal(s.sides.cats.bursts,1);
});
test("rest restores stamina and keeps a charged combo; a good pull breaks it",()=>{
  const s=playing();for(let i=0;i<3;i++)beat(s);const before=s.sides.cats.energy;
  beat(s,[]);assert.equal(s.sides.cats.energy,Math.min(100,before+30));assert.equal(s.sides.cats.streak,3);
  tickTugMatch(s,.9);assert.equal(queueTugPull(s,"cats").quality,"good");tickTugMatch(s,.6);assert.equal(s.sides.cats.streak,0);
});
test("exhausted pets cannot get a full-strength pull or charge a super",()=>{
  const s=playing();s.sides.cats.energy=12;s.sides.cats.streak=3;tickTugMatch(s,.75);
  const p=queueTugPull(s,"cats");assert.equal(p.tired,true);assert.equal(p.burst,false);assert.equal(p.power,1.5);
  tickTugMatch(s,.75);assert.equal(s.sides.cats.energy,8);assert.equal(s.sides.cats.streak,0);assert.equal(s.sides.cats.perfect,0);
});
test("crossing a flag awards one round, and first to two wins the championship",()=>{
  const s=playing();for(let i=0;i<6;i++)beat(s);assert.equal(s.phase,"roundEnd");assert.equal(s.roundWinner,"cats");assert.equal(s.scores.cats,1);
  tickTugMatch(s,60);assert.equal(s.scores.cats,1);assert.equal(queueTugPull(s,"cats").type,"ignored");
  assert.equal(nextTugRound(s),true);assert.equal(s.position,0);assert.equal(s.sides.cats.energy,100);assert.equal(s.round,2);tickTugMatch(s,3);
  for(let i=0;i<6;i++)beat(s);assert.equal(s.phase,"matchEnd");assert.equal(s.winner,"cats");assert.equal(s.scores.cats,2);assert.equal(nextTugRound(s),false);
});
test("the leading team wins at the time limit even if the flag was not reached",()=>{
  const s=playing();beat(s,["dogs"]);tickTugMatch(s,100);assert.equal(s.phase,"roundEnd");assert.equal(s.roundWinner,"dogs");assert.equal(tugSecondsLeft(s),0);
});
test("a tied round gets four overtime beats and then draws without an arbitrary winner",()=>{
  const s=playing({mode:"local"});tickTugMatch(s,36);assert.equal(s.phase,"playing");assert.equal(s.overtime,true);assert.equal(tugSecondsLeft(s),6);
  tickTugMatch(s,6);assert.equal(s.phase,"roundEnd");assert.equal(s.roundWinner,null);assert.deepEqual(s.scores,{cats:0,dogs:0});
});
test("pause freezes the countdown, rope, queued inputs, and computer schedule",()=>{
  const s=createTugMatch(),bot=createTugComputer({random:rng(2)});startTugMatch(s);s.paused=true;const before=JSON.stringify(s);tickTugMatch(s,50,bot);assert.equal(JSON.stringify(s),before);
  s.paused=false;tickTugMatch(s,3.2,bot);s.paused=true;const active=JSON.stringify(s);assert.equal(queueTugPull(s,"cats").type,"ignored");tickTugMatch(s,50,bot);assert.equal(JSON.stringify(s),active);
});
test("the computer produces the same match at different frame rates",()=>{
  const run=step=>{const s=createTugMatch(),bot=createTugComputer({random:rng(412)});startTugMatch(s);for(let t=0;t<15000;t+=step)tickTugMatch(s,Math.min(step,15000-t)/1000,bot);return s;};
  const a=run(10),b=run(125);assert.equal(a.beat,b.beat);assert.equal(a.position,b.position);assert.deepEqual(a.totals,b.totals);assert.ok(Math.abs(a.beatTime-b.beatTime)<1e-7);
});
test("computer plans use its own stamina and never read the human's chosen pull",()=>{
  const a=playing(),b=playing();b.position=-20;b.sides.cats.energy=1;b.sides.cats.queued={quality:"perfect",power:10,burst:true};
  const x=createTugComputer({difficulty:"expert",random:rng(99)}),y=createTugComputer({difficulty:"expert",random:rng(99)});
  assert.deepEqual(x.plan(a),y.plan(b));
});
test("every opponent remains beatable on every arena and from either team",()=>{
  for(const arena of Object.keys(TUG_ARENAS))for(const team of ["cats","dogs"])for(const difficulty of ["easy","medium","hard","expert"]){
    let wins=0;
    for(let seed=1;seed<=35;seed++){
      const s=createTugMatch({arena,team,difficulty}),bot=createTugComputer({difficulty,random:rng(seed)});startTugMatch(s);tickTugMatch(s,3,bot);
      for(let n=0;n<28&&s.phase==="playing";n++)beat(s,s.sides[team].energy>=28?[team]:[],bot);
      if(s.roundWinner===team)wins++;
    }
    assert.ok(wins>=20,`${arena}/${team}/${difficulty}: precise timing and rest must beat the opponent; won ${wins}/35`);
  }
});
test("higher computer difficulty improves timing without changing available power",()=>{
  const scores=[];
  for(const difficulty of ["easy","medium","hard","expert"]){
    let perfect=0;
    for(let seed=1;seed<=60;seed++){const s=createTugMatch({difficulty}),bot=createTugComputer({difficulty,random:rng(seed)});startTugMatch(s);tickTugMatch(s,100,bot);perfect+=s.totals.dogs.perfect;}
    scores.push(perfect);
  }
  for(let i=1;i<scores.length;i++)assert.ok(scores[i]>scores[i-1],scores.join(','));
});
test("all arenas keep stamina bounded and expose the correct recovery",()=>{
  for(const arena of Object.keys(TUG_ARENAS)){
    const s=playing({arena,mode:"local"});s.sides.cats.energy=20;beat(s,[]);assert.equal(s.sides.cats.energy,20+TUG_ARENAS[arena].rest);
    for(let i=0;i<15;i++)beat(s,["cats","dogs"]);for(const pet of Object.values(s.sides))assert.ok(pet.energy>=0&&pet.energy<=100);
  }
});
test("invalid inputs cannot advance a match or create a pull",()=>{
  const s=playing(),before=JSON.stringify(s);for(const dt of [NaN,Infinity,-1,0])tickTugMatch(s,dt);assert.equal(JSON.stringify(s),before);
  for(const side of ["unknown","__proto__",null])assert.equal(queueTugPull(s,side).type,"ignored");assert.equal(nextTugRound(s),false);
});
