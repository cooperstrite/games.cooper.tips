import test from "node:test";
import assert from "node:assert/strict";
import { NIGHTS, MODES, createHarvest, beginHarvest, advanceHarvest, nextNight, catchTarget, answerRiddle, canCarve, openCarving, cancelCarving, finishCarving, ringBell } from "../haunted-harvest-model.js";
import { STENCILS, CARVE_COLS, insideFace, facePoint, featureOutline, makeCut, carvingStats, cutAt, signedArea, validSavedCarving } from "../haunted-harvest-carving.js";

const run=(s,seconds)=>{for(let elapsed=0;elapsed<seconds;elapsed+=.05)advanceHarvest(s,.05);};
const target=(s,kind)=>{const id=s.nextId++;s.targets.push({id,kind,slot:0,remaining:10,life:10});return id;};
const lantern={name:"Test lantern",stencil:"free",glow:"amber",cuts:[[[180,180],[240,180],[210,230]]]};
const start=()=>{const s=createHarvest();beginHarvest(s);return s;};

for(const mode of Object.keys(MODES))test(`${mode}: all three paths can be won using naturally spawned supplies`,()=>{
  const s=createHarvest(mode);beginHarvest(s);let steps=0;const nights=[];
  while(!["won","lost"].includes(s.phase)&&steps++<5000){
    if(s.phase==="cleared"){nights.push(s.night);assert.ok(s.time>0);assert.equal(nextNight(s),true);}
    if(s.lanterns<NIGHTS[s.night].lanterns&&canCarve(s)){assert.ok(openCarving(s));assert.ok(finishCarving(s,lantern));}
    if(s.phase!=="playing")continue;
    for(const t of [...s.targets]){
      if(t.kind==="ghost")continue;
      const result=catchTarget(s,t.id);if(result==="riddle")answerRiddle(s,true);
      if(s.phase!=="playing")break;
    }
    advanceHarvest(s,.05);assert.ok(s.pumpkins>=0&&s.wax>=0&&s.candy>=0);
  }
  assert.equal(s.phase,"won",s.reason);assert.deepEqual(nights,[0,1]);assert.equal(s.totalLanterns,4);assert.ok(s.score>200);assert.ok(s.time>0);
});
test("riddles award the documented candy, pumpkin, and three-answer streak bonus once",()=>{
  const s=start();
  for(const kind of ["sweet","cursed","sweet"]){const id=target(s,kind);assert.equal(catchTarget(s,id),"riddle");assert.equal(catchTarget(s,id),null);assert.equal(answerRiddle(s,true),true);assert.equal(answerRiddle(s,true),false);}
  assert.equal(s.candy,3+5+3+2);assert.equal(s.pumpkins,4);assert.equal(s.streak,3);
  catchTarget(s,target(s,"cursed"));answerRiddle(s,false);assert.equal(s.fear,2);assert.equal(s.streak,0);assert.equal(s.candy,13);
});
test("carving spends materials only on lighting, calms fright, and cannot pay twice",()=>{
  const s=start();s.fear=4;assert.ok(openCarving(s));cancelCarving(s);assert.deepEqual([s.pumpkins,s.wax,s.lanterns],[1,1,0]);
  assert.ok(openCarving(s));assert.equal(finishCarving(s,NaN),false);assert.equal(finishCarving(s,{...lantern,cuts:[]}),false);assert.equal(finishCarving(s,lantern),true);
  assert.deepEqual([s.pumpkins,s.wax,s.lanterns,s.fear,s.shields,s.candy],[0,0,1,2,1,3]);
  assert.equal(finishCarving(s,lantern),false);assert.equal(openCarving(s),false);
});
test("ghost shields prevent theft and fright, while unprotected ghosts steal only available candy",()=>{
  const s=start();s.candy=1;catchTarget(s,target(s,"ghost"));assert.equal(s.candy,0);assert.equal(s.fear,2);
  s.shields=1;catchTarget(s,target(s,"ghost"));assert.equal(s.candy,2);assert.equal(s.fear,2);assert.equal(s.shields,0);
  catchTarget(s,target(s,"ghost"));catchTarget(s,target(s,"ghost"));assert.equal(s.phase,"lost");assert.equal(s.fear,MODES.eerie.fear);
});
test("the bell charges candy, clears only ghosts, and cannot bypass its cooldown",()=>{
  const s=start();s.candy=8;s.fear=4;target(s,"ghost");target(s,"sweet");assert.equal(ringBell(s),true);
  assert.equal(s.candy,5);assert.equal(s.fear,2);assert.ok(s.targets.every(t=>t.kind!=="ghost"));assert.equal(ringBell(s),false);
  run(s,10.1);assert.equal(ringBell(s),true);assert.equal(s.candy,2);run(s,10.1);assert.equal(ringBell(s),false);
});
test("harvest time, spirit lifetimes, and bell cooldown all freeze in puzzles and carving",()=>{
  const s=start();run(s,3);s.bellCooldown=7;
  for(const activity of ["riddle","carving"]){
    if(activity==="riddle")catchTarget(s,target(s,"sweet"));else openCarving(s);
    const before=JSON.stringify(s);run(s,12);assert.equal(JSON.stringify(s),before);
    if(activity==="riddle")answerRiddle(s,true);else cancelCarving(s);
  }
});
test("midnight ends the harvest, and expired targets neither penalize nor reward",()=>{
  const s=start();const id=target(s,"sweet");s.targets[0].remaining=.01;advanceHarvest(s,.05);assert.equal(catchTarget(s,id),null);assert.equal(s.fear,0);assert.equal(s.candy,0);
  s.time=.01;advanceHarvest(s,.05);assert.equal(s.phase,"lost");assert.match(s.reason,/Midnight/);assert.equal(s.targets.length,0);const before=JSON.stringify(s);run(s,10);assert.equal(JSON.stringify(s),before);
});
test("both goals are required; moving paths resets only the new offering and lantern target",()=>{
  const s=start();s.candy=20;catchTarget(s,target(s,"sweet"));answerRiddle(s,true);assert.equal(s.phase,"playing");
  openCarving(s);finishCarving(s,lantern);assert.equal(s.phase,"cleared");const score=s.score,pumpkins=s.pumpkins;
  assert.ok(nextNight(s));assert.equal(s.night,1);assert.equal(s.candy,0);assert.equal(s.lanterns,0);assert.equal(s.pumpkins,pumpkins);assert.equal(s.score,score);assert.equal(s.totalLanterns,1);
});
test("vector cuts preserve subpixel corners and thin details without snapping to a grid",()=>{
  const points=[[180.12,190.28],[209.64,182.83],[210.37,184.1],[240.66,195.22],[210.12,230.15]];
  const cut=makeCut(points);assert.ok(cut);assert.deepEqual(cut,points);assert.ok(signedArea(cut)>0);
  assert.deepEqual(makeCut([...points].reverse()),points);assert.equal(makeCut([[180,200],[200,200],[220,200]]),null);
  assert.equal(makeCut([[180,200],[200,200],[NaN,220]]),null);assert.equal(makeCut([[0,0],[20,0],[10,20]]),null);
});
test("every optional face guide can be cut precisely; custom artwork receives the same eligibility",()=>{
  for(const id of Object.keys(STENCILS).filter(id=>id!=="free")){
    const cuts=STENCILS[id].features.map((_,i)=>makeCut(featureOutline(id,i)));
    assert.ok(cuts.every(Boolean));assert.ok(cuts.flat().every(insideFace));assert.equal(carvingStats(cuts).ready,true);
  }
  assert.equal(carvingStats([]).ready,false);assert.equal(carvingStats([makeCut([[190,190],[210,190],[200,210]])]).ready,true);
  for(const point of [[0,0],[512,416],[512,0],[256,80]])assert.ok(insideFace(facePoint(...point)));
});
test("patch targets the topmost opening, and recognizes untouched pumpkin",()=>{
  const cuts=[makeCut([[170,180],[240,180],[205,240]]),makeCut([[200,190],[240,190],[220,220]])];
  assert.equal(cutAt(cuts,[220,200]),1);assert.equal(cutAt(cuts,[180,185]),0);assert.equal(cutAt(cuts,[300,300]),-1);
});
test("saved vector designs retain precision and migrate old lanterns without trusting invalid data",()=>{
  const cuts=[makeCut([[180.12,180.42],[240.37,180.66],[210.18,230.24]])];
  const saved=validSavedCarving({name:"x".repeat(40),stencil:"free",glow:"missing",cuts:[...cuts,[[1,2],[3,4],[Infinity,5]]]});
  assert.equal(saved.name.length,24);assert.equal(saved.glow,"amber");assert.deepEqual(saved.cuts,cuts);assert.equal(saved.version,3);
  assert.deepEqual(validSavedCarving(JSON.parse(JSON.stringify(saved))).cuts,cuts);
  const cells=Array.from({length:20},(_,i)=>(20+Math.floor(i/5))*CARVE_COLS+20+i%5);
  const legacy=validSavedCarving({name:"Old moon",stencil:"grin",glow:"jade",cells:[...cells,-1,1e6,"bad"]});
  assert.equal(legacy.name,"Old moon");assert.ok(legacy.cuts.length);assert.ok(legacy.cuts.flat().every(insideFace));
  assert.equal(validSavedCarving({stencil:"__proto__",cuts:[]}),null);assert.equal(validSavedCarving(null),null);
});
test("a requested hint reduces only the solved puzzle's reward and cannot charge twice",()=>{
  const s=start();catchTarget(s,target(s,"sweet"));assert.ok(answerRiddle(s,true,true));assert.equal(s.candy,2);
  assert.equal(answerRiddle(s,true,true),false);assert.equal(s.candy,2);
  catchTarget(s,target(s,"cursed"));answerRiddle(s,false,true);assert.equal(s.candy,2);assert.equal(s.fear,2);
});
