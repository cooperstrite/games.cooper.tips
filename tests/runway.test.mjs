import test from "node:test";
import assert from "node:assert/strict";
import { AIRCRAFT, APPROACHES, DEG, clamp, createFlight, advanceFlight, assessTouchdown, flightInstruments, windAt, deckAt, trafficAt, startGoAround, towerGuidance } from "../runway-engine.js";
import { chooseTowerVoice, naturalVoices, radioLine } from "../runway-voices.js";

// This bounded controller is a test pilot, not a production autopilot. It uses
// only pitch, bank, rudder, throttle, and brakes; no position/speed corrections.
function pilot(s) {
  const i=flightInstruments(s),a=s.aircraft;
  if(s.phase==="rollout")return{rudder:clamp(-s.x*.08,-1,1),throttle:-1,brake:true};
  let sink=-i.groundspeed*Math.tan(3*DEG)-i.glideError*.22;
  if(i.flare&&s.level.id!=="carrier")sink=-Math.max(a.id==="bush"?.4:.8,Math.min(a.id==="bush"?1.2:2.8,i.altitude*.25));
  const pitch=a.aoa+Math.asin(clamp(sink/s.speed,-.5,.5))/DEG;
  const heading=i.targetHeading-i.centerError*.1,near=i.altitude<2.4;
  return {pitch:clamp((pitch-s.pitch)*1.1-s.pitchVelocity*.25,-1,1),roll:near?clamp(-s.bank*.22,-1,1):clamp(((heading-s.heading)*2.2-s.bank)*.13,-1,1),rudder:near?clamp((heading-s.heading)*.18,-1,1):0,throttle:clamp((a.target-s.speed)*.08,-1,1),brake:true};
}
function landing(plane="passenger",level="training") {
  const s=createFlight(plane,level);s.phase="flying";s.time=20;s.z=80;s.x=0;s.y=deckAt(s.level,s.time,s.z).height+.01;s.pitch=plane==="bush"?9:6;s.bank=0;s.heading=-Math.asin(windAt(s.level,s.time).cross/s.speed)/DEG;s.lateralSpeed=0;s.verticalSpeed=-.8;return s;
}
function run(s,seconds,input={}) { for(let t=0;t<seconds;t+=1/120)advanceFlight(s,input,1/120);return s; }

for(const level of APPROACHES)for(const plane of level.allowed)test(`${level.name}: ${AIRCRAFT[plane].name} can land and stop using the real controls`,()=>{
  const s=createFlight(plane,level.id);s.phase="flying";s.hook=true;
  for(let n=0;n<180*60&&["flying","rollout"].includes(s.phase);n++)advanceFlight(s,pilot(s),1/60);
  assert.equal(s.phase,"complete",s.result?.reason);
  assert.equal(s.attempts,1);assert.equal(s.result.success,true);assert.ok(s.result.score>45);assert.ok(s.z<level.length);assert.equal(s.speed,0);
  assert.ok(s.touchdown.safe);if(level.id==="carrier")assert.ok(s.wire>=1&&s.wire<=4);
});

test("only supported aircraft can enter short fields or the carrier",()=>{
  assert.equal(createFlight("passenger","carrier").aircraft.id,"military");
  assert.equal(createFlight("cargo","forest").aircraft.id,"bush");
  assert.equal(createFlight("military","alpine").aircraft.id,"bush");
  assert.equal(createFlight("missing","training").aircraft.id,"passenger");
  assert.equal(createFlight("bush","missing").level.id,"training");
});
test("cargo controls and engine spool respond more slowly than the airliner",()=>{
  const jet=createFlight("passenger"),cargo=createFlight("cargo");
  for(const s of [jet,cargo]){s.phase="flying";s.throttle=1;run(s,1,{pitch:1,roll:1});}
  assert.ok(cargo.pitch-cargo.aircraft.trimPitch<jet.pitch-jet.aircraft.trimPitch);
  assert.ok(cargo.bank<jet.bank);assert.ok((cargo.power-cargo.aircraft.trim)/(1-cargo.aircraft.trim)<(jet.power-jet.aircraft.trim)/(1-jet.aircraft.trim));
});
test("same touchdown is less comfortable for passengers than cargo",()=>{
  const jet=landing(),cargo=landing("cargo");jet.z=jet.level.aim;cargo.z=cargo.level.aim;
  const j=assessTouchdown(jet,2),c=assessTouchdown(cargo,2);
  assert.ok(j.safe&&c.safe);assert.equal(j.smooth,false);assert.ok(c.score>j.score);
});
test("bush touchdown needs its three-point attitude and limited bank/drift",()=>{
  const s=landing("bush","forest");assert.equal(assessTouchdown(s,.7).safe,true);
  s.pitch=2;assert.match(assessTouchdown(s,.7).reason,/three-point/);
  s.pitch=9;s.bank=6;assert.match(assessTouchdown(s,.7).reason,/wing/);
  s.bank=0;s.lateralSpeed=3;assert.match(assessTouchdown(s,.7).reason,/sideways/);
});
test("the bush plane has fixed gear through setup, flight, and go-around",()=>{
  const bush=createFlight("bush");
  assert.equal(bush.aircraft.fixedGear,true);
  for(const phase of ["ready","flying","rollout","goaround"]){
    bush.phase=phase;bush.gear=false;advanceFlight(bush,{},0);assert.equal(bush.gear,true);
  }
  const touchdown=landing("bush","forest");touchdown.gear=false;
  assert.equal(assessTouchdown(touchdown,.7).safe,true);
  assert.notEqual(towerGuidance(touchdown).key,"gear");
  for(const type of ["passenger","cargo","military"]){
    const s=createFlight(type);s.gear=false;advanceFlight(s,{},0);
    assert.equal(s.gear,false,"Retractable gear must still work on the other planes");
  }
});
test("retracted gear, hard impacts, excessive speed, and missed pavement fail with actionable instructions",()=>{
  for(const [change,impact,message] of [[{gear:false},.5,/landing gear/i],[{},8,/descent/],[{speed:110},.5,/speed/],[{z:-1},.5,/landing surface/],[{x:40},.5,/centerline/],[{pitch:17},.5,/attitude/]]){
    const s=Object.assign(landing(),change);const result=assessTouchdown(s,impact);assert.equal(result.safe,false);assert.match(result.reason,message);
  }
});
test("traffic occupies the runway until departure clearance and is a physical conflict",()=>{
  const s=landing("passenger","coast");s.time=4;
  assert.equal(flightInstruments(s).runwayClear,false);assert.match(towerGuidance(s).text,/Traffic departing/);assert.match(assessTouchdown(s,.7).reason,/occupied/);
  s.time=17;assert.equal(flightInstruments(s).runwayClear,true);
  const crossing=createFlight("passenger","night");crossing.phase="flying";crossing.time=20;
  const other=trafficAt(crossing)[0];Object.assign(crossing,{x:other.x,y:other.y,z:other.z});advanceFlight(crossing,{},1/60);
  assert.equal(crossing.phase,"crashed");assert.match(crossing.result.reason,/Traffic conflict/);
});
for(const [index,z] of [108,132,156,180].entries())test(`carrier arresting wire ${index+1} catches and stops the fighter`,()=>{
  const s=landing("military","carrier");s.z=z-6;s.y=deckAt(s.level,s.time,s.z).height+.01;s.hook=true;s.verticalSpeed=-2;
  for(let n=0;n<12*120&&["flying","rollout"].includes(s.phase);n++)advanceFlight(s,{brake:true},1/120);
  assert.equal(s.phase,"complete",s.result?.reason);assert.equal(s.wire,index+1);assert.ok(s.z<s.level.length);
});
test("a missed carrier wire triggers a bolter and a fresh approach, with hook state retained",()=>{
  const s=landing("military","carrier");s.hook=false;s.verticalSpeed=-2;
  run(s,3,{brake:false});assert.equal(s.phase,"goaround");assert.equal(s.wire,null);
  run(s,6);assert.equal(s.phase,"flying");assert.equal(s.attempts,2);assert.equal(s.hook,false);assert.equal(s.result,null);assert.ok(s.z<0);
});
test("touching down beyond the last carrier wire gives a bolter instead of a free landing",()=>{
  const s=landing("military","carrier");s.z=205;s.y=deckAt(s.level,s.time,s.z).height+.01;s.hook=true;s.verticalSpeed=-3;
  run(s,.2);assert.equal(s.phase,"goaround");assert.equal(s.wire,null);
});
test("a fighter below deck height strikes the stern instead of snapping onto the carrier",()=>{
  const s=createFlight("military","carrier");Object.assign(s,{phase:"flying",x:0,z:-.1,y:2,verticalSpeed:-1,hook:true});advanceFlight(s,{},1/60);assert.equal(s.phase,"crashed");assert.match(s.result.reason,/stern/);
});
test("moving deck height and relative impact are part of the landing assessment",()=>{
  const level=APPROACHES.find(l=>l.id==="carrier"),a=deckAt(level,0,80),b=deckAt(level,4,80);
  assert.notEqual(a.height,b.height);assert.notEqual(a.pitch,b.pitch);assert.notEqual(a.x,b.x);assert.ok(Math.abs(a.velocity)>0);
  const s=createFlight("military","carrier");const i=flightInstruments(s);assert.ok(Math.abs(i.altitude-(s.y-deckAt(level,0,s.z).height))<1e-10);
});
test("braking is necessary; wet surfaces take longer to stop",()=>{
  const dry=landing(),wet=landing("passenger","storm"),coast=landing();
  for(const s of [dry,wet,coast]){advanceFlight(s,{brake:true},.1);s.heading=0;s.x=0;s.power=s.throttle=0;}
  run(dry,4,{brake:true});run(wet,4,{brake:true});run(coast,4,{brake:false});
  assert.ok(wet.speed>dry.speed);assert.ok(coast.speed>wet.speed);
});
test("leaving the runway or overrunning it during rollout fails",()=>{
  const off=landing();advanceFlight(off,{},.1);off.x=100;advanceFlight(off,{},.1);assert.match(off.result.reason,/Left the runway/);
  const end=landing();advanceFlight(end,{},.1);end.z=end.level.length-10;advanceFlight(end,{},.2);assert.match(end.result.reason,/Ran out of runway/);
});
test("flaps change drag and descent; low speed produces a stall warning and sinking",()=>{
  const full=createFlight(),clean=createFlight();full.phase=clean.phase="flying";clean.flaps=0;
  run(full,3);run(clean,3);assert.ok(clean.speed>full.speed);assert.ok(clean.verticalSpeed<full.verticalSpeed);
  const slow=createFlight();slow.phase="flying";slow.speed=slow.aircraft.stall*.8;run(slow,1);assert.match(towerGuidance(slow).text,/Airspeed low/);assert.ok(slow.verticalSpeed<full.verticalSpeed);
});
test("wind gusts are deterministic, affect drift, and vary with each approach",()=>{
  const calm=APPROACHES[0],storm=APPROACHES.find(l=>l.id==="storm");assert.deepEqual(windAt(calm,1),windAt(calm,17));assert.notDeepEqual(windAt(storm,1),windAt(storm,17));assert.deepEqual(windAt(storm,9),windAt(storm,9));
  const s=createFlight("passenger","coast");s.phase="flying";s.heading=0;run(s,1);assert.ok(s.x>2);
});
test("30 and 120 Hz inputs produce the same trajectory",()=>{
  const a=createFlight("cargo","storm"),b=createFlight("cargo","storm");a.phase=b.phase="flying";
  for(let n=0;n<300;n++)advanceFlight(a,{pitch:.07,roll:.02,rudder:-.01},1/30);
  for(let n=0;n<1200;n++)advanceFlight(b,{pitch:.07,roll:.02,rudder:-.01},1/120);
  for(const key of ["x","y","z","speed","pitch","bank","heading","time"])assert.ok(Math.abs(a[key]-b[key])<1e-7,key);
});
test("ready and completed flights stay frozen; the result cannot be awarded twice",()=>{
  const s=createFlight(),snapshot=JSON.stringify(s);advanceFlight(s,{pitch:1},.25);assert.equal(JSON.stringify(s),snapshot);
  const landed=landing();advanceFlight(landed,{},.1);landed.speed=.5;advanceFlight(landed,{brake:true},.1);assert.equal(landed.phase,"complete");
  const done=JSON.stringify(landed);run(landed,4,{pitch:1,throttle:1});assert.equal(JSON.stringify(landed),done);assert.equal(landed.events.filter(e=>e.type==="complete").length,1);
});
test("go-around is limited to active flights and resets approach hazards without losing aircraft",()=>{
  const s=createFlight("cargo","freight");assert.equal(startGoAround(s),false);s.phase="flying";s.x=150;s.y=30;assert.equal(startGoAround(s),true);assert.equal(startGoAround(s),false);
  run(s,6.05);assert.equal(s.phase,"flying");assert.equal(s.aircraft.id,"cargo");assert.equal(s.level.id,"freight");assert.equal(s.attempts,2);assert.ok(Math.abs(s.x)<.01);assert.equal(s.touchdown,null);assert.equal(s.gear,true);
});
test("throttle input remains bounded, negative time cannot move, and large gaps are capped",()=>{
  const s=createFlight();s.phase="flying";const z=s.z;advanceFlight(s,{throttle:1},-2);assert.equal(s.z,z);
  advanceFlight(s,{},10);assert.ok(s.time<=.2500001);run(s,5,{throttle:1});assert.equal(s.throttle,1);run(s,6,{throttle:-1});assert.equal(s.throttle,0);
});

test("tower chooses natural English voices ahead of robotic/novelty defaults",()=>{
  const voices=[{name:"Zarvox",lang:"en-US",default:true},{name:"Albert",lang:"en-US"},{name:"Samantha",lang:"en-US"},{name:"Daniel",lang:"en-GB"},{name:"Microsoft Ava Online (Natural)",lang:"en-US"},{name:"Thomas",lang:"fr-FR"}];
  assert.equal(chooseTowerVoice(voices).name,"Microsoft Ava Online (Natural)");
  assert.equal(chooseTowerVoice(voices,"Samantha").name,"Samantha");
  assert.equal(chooseTowerVoice(voices,"missing").name,"Microsoft Ava Online (Natural)");
  assert.deepEqual(naturalVoices(voices).map(v=>v.name),["Microsoft Ava Online (Natural)","Daniel","Samantha"]);
  assert.equal(chooseTowerVoice([]),null);
});
test("spoken radio instructions use runway digits and natural words instead of keyboard commands",()=>{
  assert.equal(radioLine("Cleared to land runway 09. Press G to lower your wheels."),"Cleared to land runway zero nine. Lower your landing gear.");
  assert.match(radioLine("Press H before reaching the carrier."),/Lower your hook/);
  const s=createFlight();s.phase="flying";s.gear=false;s.y=20;
  const guidance=towerGuidance(s);assert.match(guidance.text,/Press G/);assert.doesNotMatch(guidance.spoken,/Press|knots|degrees/);assert.match(guidance.spoken,/gear/);
});
