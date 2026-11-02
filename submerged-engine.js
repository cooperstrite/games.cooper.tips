import { OCEAN, DIVE_LEVELS, SURVEYS, STATIONS, makeOcean, sitePosition, hazardPosition, rockContact } from './submerged-world.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createDive({difficulty='medium',mode='expedition',seed=7831}={}) {
  if(!Object.hasOwn(DIVE_LEVELS,difficulty))difficulty='medium';if(mode!=='explore')mode='expedition';
  return {difficulty,mode,world:makeOcean(seed,difficulty),x:STATIONS[0].x,y:STATIONS[0].y,vx:0,vy:0,facing:1,tilt:0,hull:100,battery:100,time:0,
    phase:'ready',paused:false,found:0,counts:Object.fromEntries(Object.keys(SURVEYS).map(k=>[k,0])),scanId:null,scanProgress:0,sonarCooldown:0,sonarAge:20,sonarX:0,sonarY:0,
    checkpoint:0,visited:[0],docked:0,damageCooldown:0,rescues:0,events:[],targetType:'all',targetId:null,flow:{x:0,y:0},distance:0};
}
export function startDive(state) { if(state.phase!=='ready')return false;state.phase='playing';state.paused=false;return true; }
export function pauseDive(state,value=true) { if(state.phase!=='playing')return false;state.paused=!!value;return true; }
export function diveComplete(state) { return state.found===state.world.items.length; }
export function diveTarget(state) {
  if(state.targetType==='home'||(state.mode==='expedition'&&diveComplete(state)))return {...STATIONS[0],kind:'station',label:'Return to the research ship'};
  if(state.targetType==='station')return {...state.world.stations.reduce((best,s)=>Math.hypot(s.x-state.x,s.y-state.y)<Math.hypot(best.x-state.x,best.y-state.y)?s:best),kind:'station',label:'Repair and recharge'};
  const explicit=state.world.items.find(i=>i.id===state.targetId&&!i.done);
  const eligible=explicit?[explicit]:state.world.items.filter(i=>!i.done&&(state.targetType==='all'||i.type===state.targetType));
  if(!eligible.length)return null;
  const item=eligible.reduce((best,i)=>Math.hypot(i.x-state.x,i.y-state.y)<Math.hypot(best.x-state.x,best.y-state.y)?i:best);
  return {...item,...sitePosition(item,state.time),kind:'site',label:SURVEYS[item.type].action};
}
export function nearestSurvey(state) {
  const range=DIVE_LEVELS[state.difficulty].range;
  let best=null,distance=range;
  for(const item of state.world.items)if(!item.done){const p=sitePosition(item,state.time),d=Math.hypot(p.x-state.x,p.y-state.y);if(d<distance){distance=d;best=item;}}
  return best;
}
export function pingSonar(state) {
  if(state.phase!=='playing'||state.paused||state.sonarCooldown>0||state.battery<2)return false;
  if(state.mode!=='explore')state.battery-=1.5;
  state.sonarCooldown=8;state.sonarAge=0;state.sonarX=state.x;state.sonarY=state.y;
  for(const item of state.world.items)if(Math.hypot(item.x-state.x,item.y-state.y)<950)item.revealed=true;
  return true;
}
export function recoverDive(state) {
  if(!['playing','stranded'].includes(state.phase))return false;
  const station=STATIONS[state.checkpoint];state.x=station.x;state.y=station.y;state.vx=0;state.vy=0;state.hull=100;state.battery=100;
  state.scanId=null;state.scanProgress=0;state.phase='playing';state.paused=false;state.damageCooldown=2;state.docked=station.id;state.rescues++;return true;
}
export function currentAt(state,x=state.x,y=state.y) {
  let fx=0,fy=0;
  for(const flow of state.world.currents)if(x>flow.x&&x<flow.x+flow.w&&y>flow.y&&y<flow.y+flow.h){
    const fade=Math.min(1,(y-flow.y)/65,(flow.y+flow.h-y)/65),pulse=.85+.15*Math.sin(state.time*.5+y*.01);
    fx+=flow.vx*fade*pulse;fy+=flow.vy*fade;
  }
  return {x:fx*DIVE_LEVELS[state.difficulty].current,y:fy*DIVE_LEVELS[state.difficulty].current};
}
function damage(state,amount,cause) {
  if(state.mode==='explore'||state.damageCooldown>0)return;
  state.hull=Math.max(0,state.hull-amount*DIVE_LEVELS[state.difficulty].damage);state.damageCooldown=1.15;
  state.events.push({type:'damage',message:cause});
}
function simulate(state,dt,input) {
  const settings=DIVE_LEVELS[state.difficulty];state.time+=dt;
  state.damageCooldown=Math.max(0,state.damageCooldown-dt);state.sonarCooldown=Math.max(0,state.sonarCooldown-dt);state.sonarAge+=dt;
  let ix=clamp(Number(input.x)||0,-1,1),iy=clamp(Number(input.y)||0,-1,1),length=Math.hypot(ix,iy);
  if(length>1){ix/=length;iy/=length;}
  const braking=!!input.brake||!!input.scan,boost=!!input.boost&&!braking&&state.battery>5,flow=currentAt(state),drag=braking?9:2.8,acceleration=braking?300:boost?800:530;
  state.flow=flow;
  state.vx+=(ix*acceleration+((braking?.12:1)*flow.x-state.vx)*drag)*dt;
  state.vy+=(iy*acceleration+((braking?.12:1)*flow.y-state.vy)*drag)*dt;
  const previous={x:state.x,y:state.y};state.x+=state.vx*dt;state.y+=state.vy*dt;
  const extent=OCEAN.hullOffset+OCEAN.hullRadius;
  const boundedX=clamp(state.x,extent,OCEAN.width-extent),boundedY=clamp(state.y,OCEAN.surface,OCEAN.height-OCEAN.radius);
  if(boundedX!==state.x)state.vx=0;if(boundedY!==state.y)state.vy=0;state.x=boundedX;state.y=boundedY;
  for(const rock of state.world.rocks){
    if(Math.abs(rock.x-state.x)>rock.rx+extent||Math.abs(rock.y-state.y)>rock.ry+OCEAN.radius+10)continue;
    // Three overlapping circles follow the long hull, including its bow and tail.
    for(const offset of [-OCEAN.hullOffset,0,OCEAN.hullOffset]){
      const hit=rockContact(rock,state.x+offset*Math.cos(state.tilt),state.y+offset*Math.sin(state.tilt),OCEAN.hullRadius);if(!hit)continue;
      state.x+=hit.nx*(hit.penetration+.02);state.y+=hit.ny*(hit.penetration+.02);
      const speed=state.vx*hit.nx+state.vy*hit.ny;
      if(speed<0){state.vx-=speed*1.35*hit.nx;state.vy-=speed*1.35*hit.ny;if(speed<-65)damage(state,Math.min(20,(-speed-65)*.11),'Rock impact. Brake before tight passages.');}
    }
  }
  state.distance+=Math.hypot(state.x-previous.x,state.y-previous.y);
  if(Math.abs(ix)>.1)state.facing=ix>0?1:-1;else if(Math.abs(state.vx)>30)state.facing=state.vx>0?1:-1;
  state.tilt+=((clamp(state.vy/700,-.2,.2)*state.facing)-state.tilt)*Math.min(1,dt*5);
  if(state.mode!=='explore')state.battery=Math.max(0,state.battery-dt*(settings.drain+(length>.1?.07:0)+(boost?.25:0)));
  for(const hazard of state.world.hazards){
    const p=hazardPosition(hazard,state.time),dx=state.x-p.x,dy=state.y-p.y;
    const active=hazard.type==='vent'?Math.sin(state.time*.8+hazard.phase)>-.25:true;
    if(active&&(hazard.type==='vent'?(Math.abs(dx)<48&&dy<20&&dy>-180):Math.hypot(dx,dy)<64)){
      damage(state,hazard.type==='vent'?11:8,hazard.type==='vent'?'Hot vent plume. Move to its side.':'Jellyfish contact. Give wildlife more space.');
      if(hazard.type==='vent')state.vy-=dt*95;
    }
  }
  for(const item of state.world.items)if(Math.hypot(item.x-state.x,item.y-state.y)<450)item.revealed=true;
  const item=nearestSurvey(state),speed=Math.hypot(state.vx,state.vy);
  if(input.scan&&item&&speed<85){
    if(state.scanId!==item.id){state.scanId=item.id;state.scanProgress=0;}
    state.scanProgress+=dt/settings.scan;
    if(state.scanProgress>=1){
      item.done=true;item.revealed=true;state.found++;state.counts[item.type]++;state.scanProgress=0;state.scanId=null;
      if(state.targetId===item.id)state.targetId=null;
      state.events.push({type:'discovery',item:item.id,message:SURVEYS[item.type].report});
      if(diveComplete(state))state.events.push({type:'surveyed',message:state.mode==='expedition'?'All research secured. Return to the ship to finish.':'Every discovery recorded. You can keep exploring.'});
    }
  }else{state.scanProgress=Math.max(0,state.scanProgress-dt*1.8);if(!state.scanProgress)state.scanId=null;}
  state.docked=null;
  for(const station of state.world.stations)if(Math.hypot(state.x-station.x,state.y-station.y)<95&&speed<90){
    state.docked=station.id;state.checkpoint=station.id;state.hull=Math.min(100,state.hull+dt*13);state.battery=Math.min(100,state.battery+dt*20);
    if(!state.visited.includes(station.id)){state.visited.push(station.id);state.events.push({type:'station',message:`${station.name} reached. Recovery checkpoint saved.`});}
    if(station.id===0&&diveComplete(state)&&state.mode==='expedition'){state.phase='won';state.vx=0;state.vy=0;state.events.push({type:'win',message:'Expedition complete. Every discovery brought home.'});}
    break;
  }
  if(state.mode==='explore'){state.hull=100;state.battery=100;}
  if(state.phase==='playing'&&(state.hull<=0||state.battery<=0)){state.phase='stranded';state.vx=0;state.vy=0;state.events.push({type:'stranded',message:state.hull<=0?'Hull integrity lost. The recovery team can bring you to your last station.':'Battery depleted. The recovery team can bring you to your last station.'});}
}
export function stepDive(state,delta,input={}) {
  state.events.length=0;
  if(state.phase!=='playing'||state.paused||!Number.isFinite(delta)||delta<=0)return state.events;
  // Substeps make the same input behave consistently and prevent tunneling through rocks.
  let remaining=Math.min(.1,delta);
  while(remaining>1e-7&&state.phase==='playing'){const dt=Math.min(1/120,remaining);simulate(state,dt,input);remaining-=dt;}
  return state.events;
}
export function diveRating(state) { return state.phase!=='won'?0:state.rescues===0&&state.hull>=60?3:state.rescues<=1?2:1; }
