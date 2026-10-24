import { LEVELS, TRAIN_COLORS, createNetwork, pointOnEdge, firstStops, nextJunction } from "./switchyard-network.js";
export const TRAIN_LENGTH=8.2, PASSENGERS=4, SIGNAL_STOP=4.4;
export function createRailway(levelIndex=0){
  levelIndex=Number.isInteger(levelIndex)&&LEVELS[levelIndex]?levelIndex:0;
  const level=LEVELS[levelIndex],network=createNetwork(levelIndex),trains=[];
  for(let i=0;i<level.trains;i++){
    const start=network.starts[i],options=firstStops(network,network.edges[start.edge].to);
    trains.push({id:String.fromCharCode(65+i),index:i,color:TRAIN_COLORS[i],edge:start.edge,distance:start.distance,history:[],odometer:0,held:true,boarding:0,atStation:null,waiting:"held",destination:options[i%options.length],passengers:PASSENGERS,delivered:0,missed:false,speed:level.speed*(levelIndex>=3&&i===1?1.2:i===2?.9:1),lastJunction:null});
  }
  return {levelIndex,level,network,trains,switches:Object.fromEntries(network.junctions.map(n=>[n.id,{choice:0,green:true}])),phase:"ready",paused:false,time:level.seconds,elapsed:0,delivered:0,misses:0,events:[],eventId:0,crash:null,reason:"",score:0};
}
function event(s,kind,text,extra={}){s.events.push({id:++s.eventId,kind,text,...extra});if(s.events.length>30)s.events.shift();}
export function startRailway(s){if(s.phase!=="ready")return false;s.phase="playing";s.trains[0].held=false;event(s,"dispatch","Train A is away. Set its next junction for the destination on its card.");return true;}
export function setTrainHeld(s,id,held){
  const t=s.trains.find(t=>t.id===id);if(!t||!["ready","playing"].includes(s.phase)||!held&&t.boarding>0)return false;
  t.held=!!held;event(s,held?"brake":"dispatch",`Train ${id}: ${held?"stopped":"cleared to go"}.`);return true;
}
export function stopAllTrains(s){for(const t of s.trains)t.held=true;if(s.phase==="playing")event(s,"brake","All trains stopped. The shift clock is still running; Pause freezes it.");}
export function switchLocked(s,id){
  return s.trains.some(t=>{
    const edge=s.network.edges[t.edge];
    return edge.to===id&&edge.length-t.distance<2.7||t.lastJunction?.id===id&&t.odometer-t.lastJunction.at<TRAIN_LENGTH+1;
  });
}
export function setJunction(s,id,choice){
  const node=s.network.nodes[id];if(!["ready","playing"].includes(s.phase)||!node||!s.switches[id]||!Number.isInteger(choice)||choice<0||choice>=node.out.length||switchLocked(s,id))return false;
  s.switches[id].choice=choice;const destination=s.network.nodes[s.network.edges[node.out[choice]].to];event(s,"switch",`${id}: route set to ${destination.name||destination.id}.`);return true;
}
export function setSignal(s,id,green){if(!s.switches[id]||!["ready","playing"].includes(s.phase))return false;s.switches[id].green=!!green;event(s,"signal",`${id}: ${green?"green - trains may pass":"red - approaching trains will wait"}.`);return true;}
export function trainPose(s,train,behind=0){
  let edge=s.network.edges[train.edge],distance=train.distance-behind,index=train.history.length-1;
  while(distance<0&&index>=0){edge=s.network.edges[train.history[index--]];distance+=edge.length;}
  // The nose can extend across the next node before the locomotive's center does.
  for(let i=0;distance>edge.length&&i<12;i++){distance-=edge.length;const node=s.network.nodes[edge.to];edge=s.network.edges[node.out[s.switches[node.id]?.choice||0]];}
  const p=pointOnEdge(edge,Math.max(0,distance));if(distance<0){p.x+=p.dx*distance;p.y+=p.dy*distance;}return p;
}
export function trainParts(s,t){return [1.7,.1,-1.6,-4,-5.8,-7.3].map(offset=>trainPose(s,t,-offset));}
export function routePreview(s,t,limit=5){
  const result=[];let edge=s.network.edges[t.edge],distance=t.distance;
  for(let i=0;i<limit;i++){
    result.push({edge,distance});const node=s.network.nodes[edge.to];if(node.kind==="station")break;
    edge=s.network.edges[node.out[s.switches[node.id]?.choice||0]];distance=0;if(!edge)break;
  }return result;
}
export function desiredChoice(s,t){
  const next=nextJunction(s.network,t);if(!next)return null;
  const choices=next.node.out.map(id=>s.network.edges[id]);
  let choice=choices.findIndex(e=>firstStops(s.network,e.to).includes(t.destination));
  // Recover a missed stop by finding the shortest route back to the destination.
  if(choice<0){
    let shortest=Infinity;
    choices.forEach((e,i)=>{const queue=[[e.to,0]],seen=new Set();while(queue.length){const [id,d]=queue.shift();if(seen.has(id))continue;seen.add(id);if(id===t.destination){if(d<shortest){shortest=d;choice=i;}break;}for(const next of s.network.nodes[id].out)queue.push([s.network.edges[next].to,d+1]);}});
  }
  return {...next,choice:Math.max(0,choice)};
}
function arrive(s,t,node){
  if(node.kind==="station"){
    if(node.id===t.destination){
      s.delivered+=t.passengers;t.delivered+=t.passengers;s.score+=t.passengers*100;t.held=true;t.boarding=2.8;t.atStation=node.id;t.missed=false;
      event(s,"delivery",`Train ${t.id}: ${t.passengers} passengers delivered to ${node.name}. Boarding for the next trip.`,{train:t.id,station:node.id});
      const next=firstStops(s.network,s.network.edges[node.out[0]].to);t.destination=next[(t.delivered/PASSENGERS+t.index+s.levelIndex)%next.length];
    }else if(!t.missed){t.missed=true;s.misses++;event(s,"miss",`Train ${t.id} passed ${node.name}, but its passengers need ${s.network.nodes[t.destination].name}. Reroute it; one missed stop counted.`);}
  }
  if(node.kind==="junction")t.lastJunction={id:node.id,at:t.odometer};
  t.history.push(t.edge);if(t.history.length>12)t.history.shift();t.edge=node.out[s.switches[node.id]?.choice||0];t.distance=0;
}
function moveTrain(s,t,dt){
  t.boarding=Math.max(0,t.boarding-dt);
  if(t.boarding>0){t.waiting="boarding";return;}
  if(t.held){t.waiting="held";return;}
  const edge=s.network.edges[t.edge],node=s.network.nodes[edge.to];let travel=t.speed*dt;
  // A signal already passed cannot stop a train underneath the junction.
  if(node.kind==="junction"&&!s.switches[node.id].green&&edge.length-t.distance>=SIGNAL_STOP-.001){
    travel=Math.min(travel,Math.max(0,edge.length-t.distance-SIGNAL_STOP));
    if(travel<.00001){t.waiting="signal";return;}
  }
  t.waiting="moving";t.atStation=null;
  const used=Math.min(travel,edge.length-t.distance);t.distance+=used;t.odometer+=used;
  if(t.distance>=edge.length-.00001)arrive(s,t,node);
}
export function collisionPair(s){
  const parts=s.trains.map(t=>trainParts(s,t));
  for(let i=0;i<s.trains.length;i++)for(let j=i+1;j<s.trains.length;j++){
    for(const a of parts[i])for(const b of parts[j])if(Math.hypot(a.x-b.x,a.y-b.y)<1.5)return {trains:[s.trains[i].id,s.trains[j].id],x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  }return null;
}
export function advanceRailway(s,dt){
  if(!Number.isFinite(dt)||dt<=0||s.paused)return;dt=Math.min(dt,.1);
  if(s.phase==="crashed"){s.crash.age+=dt;return;}if(s.phase!=="playing")return;
  const steps=Math.ceil(dt/(1/60)),step=dt/steps;
  for(let i=0;i<steps;i++){
    s.time=Math.max(0,s.time-step);s.elapsed+=step;
    for(const train of s.trains)moveTrain(s,train,step);
    const collision=collisionPair(s);
    if(collision){s.phase="crashed";s.crash={...collision,age:0};s.reason=`Trains ${collision.trains.join(" and ")} collided. Hold one train back before a crossing or busy platform.`;event(s,"crash",s.reason);break;}
    if(s.misses>=s.level.mistakes){s.phase="lost";s.reason="Too many missed stops. Match the next junction to each train's destination; the gold line previews its current route.";break;}
    if(s.delivered>=s.level.goal){s.phase="won";s.score+=Math.ceil(s.time)*3;s.reason=`${s.delivered} passengers delivered safely. ${s.misses===0?"A perfect timetable!":"The district is clear."}`;event(s,"win",s.reason);break;}
    if(s.time<=0){s.phase="lost";s.reason="The shift ended before all passengers were delivered. Dispatch waiting trains, and give each service a clear route.";break;}
  }
}
export function rating(s){return s.phase!=="won"?0:s.misses===0&&s.time>s.level.seconds*.25?3:s.misses<=1?2:1;}
