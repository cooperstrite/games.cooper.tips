import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS, createNetwork, pointOnEdge, firstStops } from "../switchyard-network.js";
import { createRailway, startRailway, advanceRailway, setTrainHeld, stopAllTrains, setJunction, setSignal, switchLocked, desiredChoice, collisionPair, trainPose, rating, SIGNAL_STOP } from "../switchyard-model.js";

const tick=(s,seconds)=>{for(let remaining=seconds;remaining>1e-8;remaining-=.05)advanceRailway(s,Math.min(remaining,.05));};
function approach(s,station){const t=s.trains[0],edge=Object.values(s.network.edges).find(e=>e.to===station);t.edge=edge.id;t.distance=edge.length-.01;t.history=[];t.held=false;t.boarding=0;}

test("all six districts have valid continuous routes, reachable stops and safe starts",()=>{
  for(let level=0;level<LEVELS.length;level++){
    const s=createRailway(level),net=s.network;assert.equal(s.trains.length,LEVELS[level].trains);assert.equal(collisionPair(s),null);
    for(const e of Object.values(net.edges)){
      const a=pointOnEdge(e,0),b=pointOnEdge(e,e.length),from=net.nodes[e.from],to=net.nodes[e.to];assert.ok(e.length>5);assert.equal(a.x,from.x);assert.equal(a.y,from.y);assert.equal(b.x,to.x);assert.equal(b.y,to.y);
      assert.ok(a.dx*from.heading[0]+a.dy*from.heading[1]>.97,`${e.id} starts in the wrong direction`);assert.ok(b.dx*to.heading[0]+b.dy*to.heading[1]>.97,`${e.id} ends in the wrong direction`);
      const reachable=new Set(),queue=[e.to];while(queue.length){const id=queue.shift();if(reachable.has(id))continue;reachable.add(id);for(const next of net.nodes[id].out){assert.ok(net.edges[next]);queue.push(net.edges[next].to);}}
      assert.equal(reachable.size,Object.keys(net.nodes).length);
    }
    for(const t of s.trains)assert.ok(firstStops(net,net.edges[t.edge].to).includes(t.destination));
  }
});
test("arc length gives steady train speed through curves",()=>{
  const edge=createNetwork(2).edges["J1-S"];
  for(let distance=1;distance<edge.length-1;distance+=1){const a=pointOnEdge(edge,distance),b=pointOnEdge(edge,distance+.5);assert.ok(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-.5)<.025);}
});
test("Start releases only Train A; pause freezes the clock and every carriage",()=>{
  const s=createRailway(4);startRailway(s);assert.equal(s.trains[0].held,false);assert.ok(s.trains.slice(1).every(t=>t.held));s.paused=true;const before=structuredClone(s);tick(s,2);assert.deepEqual(s,before);s.paused=false;tick(s,.2);assert.ok(s.time<before.time);assert.ok(s.trains[0].distance>before.trains[0].distance);
});
test("red signals stop before the lock zone and green releases the train",()=>{
  const s=createRailway();setSignal(s,"J1",false);startRailway(s);tick(s,3);const t=s.trains[0],edge=s.network.edges[t.edge];assert.equal(t.waiting,"signal");assert.ok(Math.abs(edge.length-t.distance-SIGNAL_STOP)<.001);assert.equal(switchLocked(s,"J1"),false);assert.equal(setJunction(s,"J1",1),true);setSignal(s,"J1",true);tick(s,.8);assert.equal(t.edge,"J1-S");
});
test("a switch stays locked until the coach clears it",()=>{
  const s=createRailway();startRailway(s);tick(s,1.8);assert.equal(switchLocked(s,"J1"),true);assert.equal(setJunction(s,"J1",1),false);tick(s,.6);assert.equal(switchLocked(s,"J1"),true);tick(s,1);assert.equal(switchLocked(s,"J1"),false);assert.equal(setJunction(s,"J1",1),true);
});
test("red cannot catch a train that already passed the signal",()=>{
  const s=createRailway();startRailway(s);s.trains[0].distance=s.network.edges["D-J1"].length-2;setSignal(s,"J1",false);tick(s,.4);assert.equal(s.trains[0].edge,"J1-N");
});
test("correct arrivals deliver once, board, and wait for an explicit Go",()=>{
  const s=createRailway();startRailway(s);approach(s,"N");tick(s,.05);const t=s.trains[0];assert.equal(s.delivered,4);assert.equal(t.held,true);assert.ok(t.boarding>2);assert.equal(t.destination,"S");assert.equal(setTrainHeld(s,"A",false),false);const pose=trainPose(s,t);tick(s,3);assert.deepEqual(trainPose(s,t),pose);assert.equal(s.delivered,4);assert.equal(t.boarding,0);assert.equal(t.held,true);assert.equal(setTrainHeld(s,"A",false),true);tick(s,.1);assert.notDeepEqual(trainPose(s,t),pose);
});
test("a missed stop retains the destination and counts only once until delivery",()=>{
  const s=createRailway();startRailway(s);s.trains[0].destination="S";approach(s,"N");tick(s,.05);assert.equal(s.misses,1);assert.equal(s.trains[0].destination,"S");assert.equal(s.delivered,0);approach(s,"N");tick(s,.05);assert.equal(s.misses,1);approach(s,"S");tick(s,.05);assert.equal(s.delivered,4);assert.equal(s.trains[0].missed,false);
});
test("Stop all leaves the shift clock running; individual Go resumes one service",()=>{
  const s=createRailway(1);startRailway(s);setTrainHeld(s,"B",false);stopAllTrains(s);const poses=s.trains.map(t=>trainPose(s,t)),time=s.time;tick(s,1);assert.deepEqual(s.trains.map(t=>trainPose(s,t)),poses);assert.ok(s.time<time);setTrainHeld(s,"B",false);tick(s,.1);assert.deepEqual(trainPose(s,s.trains[0]),poses[0]);assert.notDeepEqual(trainPose(s,s.trains[1]),poses[1]);
});
test("collisions include rear coaches, not only the locomotives",()=>{
  const s=createRailway();const a=s.trains[0];a.distance=8;const b={...structuredClone(a),id:"B",distance:17};s.trains.push(b);assert.ok(Math.hypot(trainPose(s,a).x-trainPose(s,b).x,trainPose(s,a).y-trainPose(s,b).y)>8);assert.deepEqual(collisionPair(s)?.trains,["A","B"]);
});
test("crossing tracks cause a crash, freeze trains, and continue the explosion",()=>{
  const s=createRailway(2),cross=s.network.crossings[0];s.trains=s.trains.slice(0,2);
  for(let i=0;i<2;i++){const e=s.network.edges[cross.edges[i]],p=e.samples.reduce((a,b)=>Math.hypot(a.x-cross.x,a.y-cross.y)<Math.hypot(b.x-cross.x,b.y-cross.y)?a:b);Object.assign(s.trains[i],{edge:e.id,distance:p.d,history:[],held:true});}
  startRailway(s);stopAllTrains(s);tick(s,.05);assert.equal(s.phase,"crashed");assert.deepEqual(s.crash.trains,["A","B"]);const positions=s.trains.map(t=>trainPose(s,t));tick(s,2);assert.deepEqual(s.trains.map(t=>trainPose(s,t)),positions);assert.ok(s.crash.age>1.9);assert.equal(setTrainHeld(s,"A",false),false);
});
test("fast trains do not skip over a stopped coach between frames",()=>{
  const s=createRailway(),a=s.trains[0];a.distance=6;a.speed=65;s.trains.push({...structuredClone(a),id:"B",distance:20,held:true});startRailway(s);advanceRailway(s,.1);assert.equal(s.phase,"crashed");
});
test("collision takes precedence over a passenger goal in the same frame",()=>{
  const s=createRailway();s.trains.push({...structuredClone(s.trains[0]),id:"B"});s.delivered=s.level.goal;startRailway(s);advanceRailway(s,.01);assert.equal(s.phase,"crashed");assert.equal(rating(s),0);
});
test("timeout and the missed-stop limit end the shift",()=>{
  const timeout=createRailway();startRailway(timeout);timeout.time=.01;tick(timeout,.05);assert.equal(timeout.phase,"lost");assert.match(timeout.reason,/shift ended/);
  const missed=createRailway();startRailway(missed);missed.misses=missed.level.mistakes-1;missed.trains[0].destination="S";approach(missed,"N");tick(missed,.05);assert.equal(missed.phase,"lost");assert.match(missed.reason,/missed stops/);
});
test("invalid levels, time steps, and control requests are harmless",()=>{
  const s=createRailway(99);assert.equal(s.levelIndex,0);assert.equal(setJunction(s,"bogus",1),false);assert.equal(setJunction(s,"J1",8),false);assert.equal(setSignal(s,"bogus",true),false);assert.equal(setTrainHeld(s,"Z",false),false);startRailway(s);const before=structuredClone(s);for(const dt of [NaN,Infinity,-1,0])advanceRailway(s,dt);assert.deepEqual(s,before);
});

// This controller uses only player controls and look-ahead copies of the real
// model: stop one train before a predicted crossing, then release it when clear.
// It demonstrates that every district can be completed without privileged moves.
for(let level=0;level<LEVELS.length;level++)test(`${LEVELS[level].name} can be completed with legal dispatches and no misses`,()=>{
  const s=createRailway(level);startRailway(s);
  for(let i=0;i<7000&&s.phase==="playing";i++){
    for(const t of [...s.trains].sort((a,b)=>(desiredChoice(s,b)?.distance||0)-(desiredChoice(s,a)?.distance||0))){const c=desiredChoice(s,t);if(c&&s.switches[c.node.id].choice!==c.choice)setJunction(s,c.node.id,c.choice);if(t.held&&!t.boarding)setTrainHeld(s,t.id,false);}
    for(let attempt=0;attempt<s.trains.length;attempt++){
      const forecast=structuredClone(s);tick(forecast,.6);if(forecast.phase!=="crashed")break;
      let held=false;for(const id of forecast.crash.trains){const option=structuredClone(s);setTrainHeld(option,id,true);tick(option,.6);if(option.phase!=="crashed"){setTrainHeld(s,id,true);held=true;break;}}
      if(!held)for(const id of forecast.crash.trains)setTrainHeld(s,id,true);
    }
    advanceRailway(s,.05);
  }
  assert.equal(s.phase,"won",s.reason);assert.equal(s.delivered,s.level.goal);assert.equal(s.misses,0);assert.equal(rating(s),3);
});
