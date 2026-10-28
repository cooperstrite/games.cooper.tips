import test from "node:test";
import assert from "node:assert/strict";
import { TUG_ARENAS, TUG_MATCH_RULES, createTugMatch, startTugMatch, nextTugRound, queueTugPull, createTugComputer, tickTugMatch, tugQuality, tugSecondsLeft, tugTarget, tugPeriod, queueTugGadget } from "../cats-dogs-engine.js";

const rng = seed => () => { seed = Math.imul(1664525,seed)+1013904223|0;return (seed>>>0)/4294967296; };
const playing = options => {const s=createTugMatch(options);startTugMatch(s);tickTugMatch(s,3);return s;};
function beat(s, sides = ["cats"], computer = null) {
  const period=tugPeriod(s),target=tugTarget(s);tickTugMatch(s,period*target,computer);
  for(const side of sides)queueTugPull(s,side);
  return tickTugMatch(s,period*(1-target),computer);
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
  assert.equal(tugQuality(.5),"perfect");assert.equal(tugQuality(.465),"perfect");assert.equal(tugQuality(.535),"perfect");
  assert.equal(tugQuality(.37),"good");assert.equal(tugQuality(.63),"good");assert.equal(tugQuality(.2),"early");
  const s=playing();tickTugMatch(s,.75);const p=queueTugPull(s,"cats");assert.equal(p.quality,"perfect");assert.equal(p.power,6);
});
test("mashing cannot create extra pulls, strength, or stamina costs",()=>{
  const s=playing();tickTugMatch(s,.75);queueTugPull(s,"cats");
  for(let i=0;i<40;i++)assert.equal(queueTugPull(s,"cats").type,"duplicate");
  assert.equal(s.position,0);tickTugMatch(s,.75);assert.equal(s.position,-6);assert.equal(s.sides.cats.energy,88);assert.equal(s.sides.cats.pulls,1);
});
test("simultaneous pulls cancel equally regardless of input order",()=>{
  for(const sides of [["cats","dogs"],["dogs","cats"]]){
    const s=playing({mode:"local"});beat(s,sides);assert.equal(s.position,0);assert.equal(s.sides.cats.energy,s.sides.dogs.energy);
    assert.equal(s.sides.cats.perfect,1);assert.equal(s.sides.dogs.perfect,1);
  }
});
test("the fourth perfect pull spends a charged combo for double strength",()=>{
  const s=playing();for(let i=0;i<3;i++)beat(s);assert.equal(s.sides.cats.streak,3);assert.equal(s.position,-18);
  beat(s);assert.equal(s.position,-30);assert.equal(s.sides.cats.streak,0);assert.equal(s.sides.cats.bursts,1);
});
test("rest restores stamina and keeps a charged combo; a good pull breaks it",()=>{
  const s=playing();for(let i=0;i<3;i++)beat(s);const before=s.sides.cats.energy;
  beat(s,[]);assert.equal(s.sides.cats.energy,Math.min(100,before+30));assert.equal(s.sides.cats.streak,3);
  const period=tugPeriod(s),phase=tugTarget(s)+.1;tickTugMatch(s,period*phase);assert.equal(queueTugPull(s,"cats").quality,"good");tickTugMatch(s,period*(1-phase));assert.equal(s.sides.cats.streak,0);
});
test("exhausted pets cannot get a full-strength pull or charge a super",()=>{
  const s=playing();s.sides.cats.energy=12;s.sides.cats.streak=3;tickTugMatch(s,.75);
  const p=queueTugPull(s,"cats");assert.equal(p.tired,true);assert.equal(p.burst,false);assert.ok(Math.abs(p.power-1.8)<1e-9);
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
test("identical timing keeps the rope centered until a real pull moves it to the winner",()=>{
  const s=playing({mode:"local"});for(let i=0;i<24;i++)beat(s,["cats","dogs"]);
  assert.equal(s.phase,"showdown");assert.equal(s.position,0);assert.ok(tugSecondsLeft(s)<=6.1);
  tickTugMatch(s,s.photoDelay);assert.equal(s.photoGo,true);const result=queueTugPull(s,"dogs");
  assert.equal(result.type,"finish");assert.equal(s.roundWinner,"dogs");assert.equal(s.phase,"roundEnd");
  assert.ok(s.position>0);assert.equal(s.scores.dogs,1);
});
test("early taps and a paused tie-break cannot award either player a win",()=>{
  const s=playing({mode:"local"});tickTugMatch(s,30.6);assert.equal(s.phase,"showdown");
  s.paused=true;assert.equal(queueTugPull(s,"cats").type,"ignored");tickTugMatch(s,10);assert.equal(s.photoGo,false);
  s.paused=false;assert.equal(queueTugPull(s,"cats").type,"ignored");assert.equal(s.roundWinner,null);assert.equal(s.position,0);assert.deepEqual(s.scores,{cats:0,dogs:0});
  tickTugMatch(s,s.photoDelay);queueTugPull(s,"cats");assert.equal(s.roundWinner,"cats");assert.ok(s.position<0);
});
test("an idle centered rope waits indefinitely without awarding a round or ending a match",()=>{
  const s=playing({mode:"local"});for(let i=0;i<5;i++)tickTugMatch(s,120);
  assert.equal(s.phase,"showdown");assert.equal(s.round,1);assert.equal(s.photoGo,true);assert.equal(s.winner,null);assert.deepEqual(s.scores,{cats:0,dogs:0});assert.equal(nextTugRound(s),false);
  queueTugPull(s,"dogs");assert.equal(s.roundWinner,"dogs");assert.ok(s.position>0);
});
test("a subpixel centered finish uses the tie-break, while a visible lead still wins",()=>{
  for(const position of [-.04,0,.04]){const s=playing({mode:"local"});s.beat=23;s.position=position;tickTugMatch(s,tugPeriod(s));assert.equal(s.phase,"showdown");assert.equal(s.position,0);assert.equal(s.roundWinner,null);}
  for(const position of [-.2,.2]){const s=playing({mode:"local"});s.beat=23;s.position=position;tickTugMatch(s,tugPeriod(s));assert.equal(s.phase,"roundEnd");assert.equal(s.roundWinner,position<0?"cats":"dogs");}
});
test("computer tie-breaks use beatable reaction time and the same actual pull rule",()=>{
  for(const difficulty of ["easy","medium","hard","expert"])for(const team of ["cats","dogs"]){
    const bot=createTugComputer({difficulty,random:rng(10)}),s=playing({mode:"ai",difficulty,team});s.beat=23;tickTugMatch(s,tugPeriod(s));assert.equal(s.phase,"showdown");
    tickTugMatch(s,s.photoDelay+.2,bot);assert.equal(s.roundWinner,null);queueTugPull(s,team);assert.equal(s.roundWinner,team);
    const idle=playing({mode:"ai",difficulty,team});idle.beat=23;tickTugMatch(idle,tugPeriod(idle));tickTugMatch(idle,8,bot);
    assert.equal(idle.roundWinner,team==="cats"?"dogs":"cats");assert.equal(idle.totals[idle.roundWinner].pulls,1);assert.ok(Math.abs(idle.position)>0);
  }
});
test("pause freezes the countdown, rope, queued inputs, and computer schedule",()=>{
  const s=createTugMatch(),bot=createTugComputer({random:rng(2)});startTugMatch(s);s.paused=true;const before=JSON.stringify(s);tickTugMatch(s,50,bot);assert.equal(JSON.stringify(s),before);
  s.paused=false;tickTugMatch(s,3.2,bot);s.paused=true;const active=JSON.stringify(s);assert.equal(queueTugPull(s,"cats").type,"ignored");tickTugMatch(s,50,bot);assert.equal(JSON.stringify(s),active);
});
test("the computer produces the same match at different frame rates",()=>{
  const run=step=>{const s=createTugMatch(),bot=createTugComputer({random:rng(412)});startTugMatch(s);for(let t=0;t<15000;t+=step)tickTugMatch(s,Math.min(step,15000-t)/1000,bot);return s;};
  const a=run(10),b=run(125);assert.equal(a.beat,b.beat);assert.ok(Math.abs(a.position-b.position)<1e-8);assert.deepEqual(a.totals,b.totals);assert.ok(Math.abs(a.beatTime-b.beatTime)<1e-7);
});
test("computer plans cannot read the human's chosen pull or prepared gadget",()=>{
  const a=playing(),b=playing();b.position=-20;b.sides.cats.gadget="mud";b.sides.cats.queued={quality:"perfect",power:10,burst:true};
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

test("gold is less than half its old width and center hits beat edge hits",()=>{
  assert.ok(TUG_MATCH_RULES.perfectWindow<.075/2);
  const s=playing({mode:"local"});tickTugMatch(s,.75);const a=queueTugPull(s,"cats");tickTugMatch(s,.04);const b=queueTugPull(s,"dogs");
  assert.equal(a.quality,"perfect");assert.equal(b.quality,"perfect");assert.ok(a.power>b.power);tickTugMatch(s,.71);assert.ok(s.position<0);
});
test("both teams see the same moving target and a 30 percent faster closing beat",()=>{
  const s=playing();const first=tugTarget(s),period=tugPeriod(s);beat(s,[]);assert.notEqual(tugTarget(s),first);assert.ok(tugPeriod(s)<period);
  assert.equal(tugPeriod(s,23),period*.7);
});
test("mud gives a full warning beat, affects two beats, and cannot be spammed",()=>{
  const s=playing({mode:"local"});assert.equal(queueTugGadget(s,"cats","mud"),true);assert.equal(queueTugGadget(s,"cats","mud"),false);
  beat(s,[]);assert.equal(s.sides.dogs.mud,0);assert.equal(s.sides.cats.incoming,"mud");assert.equal(queueTugGadget(s,"cats","squeak"),false);
  beat(s,[]);assert.equal(s.sides.dogs.mud,2);assert.equal(s.sides.cats.charges,1);
  beat(s,["cats","dogs"]);assert.ok(s.lastBeat.powers.dogs<s.lastBeat.powers.cats);assert.equal(s.sides.dogs.mud,1);
  beat(s,["cats","dogs"]);assert.equal(s.sides.dogs.mud,0);assert.equal(queueTugGadget(s,"cats","squeak"),true);
  beat(s,[]);beat(s,[]);assert.equal(s.sides.cats.charges,0);assert.equal(queueTugGadget(s,"cats","shield"),false);
});
test("a shield during the warning blocks the incoming attack and clears existing mud",()=>{
  for(const attacker of ["cats","dogs"]){const defender=attacker==="cats"?"dogs":"cats",s=playing({mode:"local"});
    queueTugGadget(s,attacker,"squeak");beat(s,[]);s.sides[defender].mud=2;queueTugGadget(s,defender,"shield");beat(s,[]);
    assert.equal(s.sides[defender].energy,100);assert.equal(s.sides[defender].mud,0);assert.equal(s.sides[defender].shield,3);assert.ok(s.lastBeat.effects.some(e=>e.kind==="blocked"&&e.side===defender));
  }
});
test("squeaks drain real stamina under the same rules for both teams",()=>{
  const s=playing({mode:"local"});for(const side of ["cats","dogs"])queueTugGadget(s,side,"squeak");beat(s,[]);beat(s,[]);
  assert.equal(s.sides.cats.energy,78);assert.equal(s.sides.dogs.energy,78);
  s.paused=true;assert.equal(queueTugGadget(s,"cats","mud"),false);
  for(const id of ["__proto__","oops",null])assert.equal(queueTugGadget(s,"cats",id),false);
});
