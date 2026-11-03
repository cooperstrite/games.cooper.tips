import {World,Body,Box,Vec3,Material,ContactMaterial,SAPBroadphase} from './vendor/cannon-es/cannon-es.js';
import {islandCells,pieceSequence,seededRandom,tetrisLevel,SPELLS,normalizeTournament} from './tetris-config.js';
import {createComputerOpponent} from './arcade/opponents.js';

export const ISLAND_STEP=1/60;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function bodyAngle(body){return 2*Math.atan2(body.quaternion.z,body.quaternion.w);}
export function islandWorldCells(player) {
  const cells=[];
  for(const item of player.pieces){if(item.lost)continue;const angle=bodyAngle(item.body),c=Math.cos(angle),s=Math.sin(angle),radius=(Math.abs(c)+Math.abs(s))*.49;
    for(const [lx,ly]of item.cells){const x=item.body.position.x+lx*c-ly*s,y=item.body.position.y+lx*s+ly*c;cells.push({x,y,radius,angle,type:item.type,item});}}
  return cells;
}
export function towerHeight(player,stableOnly=false) {
  let top=player.base;
  for(const cell of islandWorldCells(player))if(cell.item.settled&&(!stableOnly||cell.item.stable>.25))top=Math.max(top,cell.y+cell.radius);
  return top;
}
export function landingHeight(player,type,x,rotation=0,worldCells=islandWorldCells(player)) {
  let y=player.base-5;
  for(const [cx,cy]of islandCells(type,rotation)){
    const px=x+cx;
    if(px+.48>-player.width/2&&px-.48<player.width/2)y=Math.max(y,player.base+.49-cy);
    for(const cell of worldCells)if(Math.abs(px-cell.x)<cell.radius+.46)y=Math.max(y,cell.y+cell.radius+.49-cy);
  }
  return y;
}
export function createIslandRound({mode='race',difficulty='medium',players=[{name:'Player 1',kind:'human'}],seed=Date.now()}={}) {
  mode=['race','puzzle','survival'].includes(mode)?mode:'race';const level=tetrisLevel(difficulty);
  const round={mode,difficulty:level.id,level,seed,sequence:pieceSequence(seed,2000),seconds:0,status:'playing',players:[],events:[],finishIds:[],finishReason:'',random:seededRandom(seed),id:`isles-${seed}-${mode}`};
  round.players=players.slice(0,4).map((config,index)=>{
    const world=new World({gravity:new Vec3(0,-12,0),allowSleep:true});world.solver.iterations=18;world.solver.tolerance=.0001;world.broadphase=new SAPBroadphase(world);
    const material=new Material('island-block');world.addContactMaterial(new ContactMaterial(material,material,{friction:.72,restitution:.015,contactEquationStiffness:1e7,contactEquationRelaxation:5}));
    const width=mode==='puzzle'?Math.max(5,level.width-1):level.width;
    const ground=new Body({mass:0,material,shape:new Box(new Vec3(width/2,.4,.65)),position:new Vec3(0,-.4,0)});world.addBody(ground);
    const p={id:index,name:String(config.name||`Player ${index+1}`).slice(0,22),kind:config.kind==='bot'?'bot':'human',difficulty:tetrisLevel(config.difficulty||difficulty).id,
      world,material,ground,width,base:0,pieces:[],active:null,pending:null,spawnWait:.2,index:0,manual:0,placed:0,retained:0,lost:0,status:'building',freezeAt:null,finishedAt:null,
      top:0,stableTop:0,raceHold:0,freezeHold:0,spells:[],nextSpellHeight:4,spellCount:0,buffs:{anchor:false,shield:false,heavy:false,tilt:0,calm:0},effects:[],aiTimer:0,aiPlan:null,
      brain:createComputerOpponent({difficulty:config.difficulty||difficulty,random:seededRandom(seed+index*97+13)})};
    return p;
  });return round;
}
export function spawnIslandPiece(round,p) {
  if(p.status!=='building'||round.status!=='playing')return;
  const top=Math.max(p.base,...islandWorldCells(p).map(c=>c.y+c.radius));
  p.active={type:round.sequence[p.index++%round.sequence.length],rotation:0,x:0,y:Math.max(p.base+9,top+5),touched:false};p.aiPlan=null;p.aiTimer=p.brain.thinkingDelay()/1000;
}
export function releaseIslandPiece(round,p,fast=false) {
  if(round.status!=='playing'||p.status!=='building'||!p.active)return false;
  const a=p.active,cells=islandCells(a.type,a.rotation),landing=landingHeight(p,a.type,a.x,a.rotation);
  const y=fast?Math.min(a.y,Math.max(p.base+1,landing+.15)):a.y;
  const body=new Body({mass:p.buffs.heavy?8:4,material:p.material,position:new Vec3(a.x,y,0),velocity:new Vec3(0,fast?-2:-.6,0),
    linearFactor:new Vec3(1,1,0),angularFactor:new Vec3(0,0,1),linearDamping:.12,angularDamping:.34,sleepSpeedLimit:.15,sleepTimeLimit:.6});
  for(const [x,y]of cells)body.addShape(new Box(new Vec3(.49,.49,.5)),new Vec3(x,y,0));
  body.quaternion.setFromAxisAngle(new Vec3(0,0,1),p.buffs.tilt);body.invInertia.x=0;body.invInertia.y=0;body.updateInertiaWorld(true);
  const item={body,type:a.type,cells,settled:false,stable:0,lost:false,age:0,contacted:false,anchored:false,wantsAnchor:p.buffs.anchor,manual:a.touched};
  body.addEventListener('collide',()=>{item.contacted=true;});
  p.buffs.heavy=false;p.buffs.tilt=0;p.buffs.anchor=false;p.world.addBody(body);p.pieces.push(item);p.pending=item;p.active=null;p.spawnWait=.5;
  if(a.touched)p.manual++;
  round.events.push({type:'release',player:p.id});return true;
}
export function islandAction(round,id,action) {
  const p=round.players[id];if(!p||round.status!=='playing'||p.status!=='building')return false;
  if(action==='bank'&&round.mode==='puzzle'){freezeIsland(round,p,'banked');return true;}
  const a=p.active;if(!a)return false;
  if(action==='drop'){a.touched=true;return releaseIslandPiece(round,p,true);}
  let x=a.x,r=a.rotation;
  if(action==='left')x-=.5;else if(action==='right')x+=.5;else if(action==='rotate')r=(r+1)%4;else if(action==='counter')r=(r+3)%4;
  else if(action==='down'){a.touched=true;a.y-=.4;if(a.y<=landingHeight(p,a.type,a.x,a.rotation)+.06)releaseIslandPiece(round,p);return true;}
  else return false;
  if(Math.abs(x)>p.width/2+2||landingHeight(p,a.type,x,r)>a.y+.1)return false;
  a.x=x;a.rotation=r;a.touched=true;round.events.push({type:action==='rotate'?'rotate':'move',player:id});return true;
}
export function liftIsland(round,p,amount) {
  p.base+=amount;p.ground.position.y+=amount;p.ground.aabbNeedsUpdate=true;
  for(const item of p.pieces)if(!item.lost){item.body.position.y+=amount;item.body.aabbNeedsUpdate=true;item.body.wakeUp();}
  if(p.active)p.active.y+=amount;p.world.broadphase.dirty=true;
  p.effects.push({kind:'rise',time:round.seconds});round.events.push({type:'rise',player:p.id});
}
export function freezeIsland(round,p,reason='frozen') {
  if(p.status!=='building')return;
  p.status=reason;p.freezeAt=round.seconds;p.finishedAt=round.seconds;p.active=null;p.pending=null;
  for(const item of p.pieces){item.body.velocity.setZero();item.body.angularVelocity.setZero();item.body.type=Body.STATIC;item.body.mass=0;item.body.updateMassProperties();}
  p.effects.push({kind:'ice',time:round.seconds});round.events.push({type:'freeze',player:p.id});
}
function grantSpell(round,p) {
  if(p.spells.length||p.spellCount>=6||p.stableTop-p.base<p.nextSpellHeight)return;
  const helpers=['anchor','shield','steady'],tricks=['gust','heavy','tilt'],i=p.spellCount%3;
  p.spells=round.players.length===1?[helpers[i],helpers[(i+1)%3]]:[helpers[i],tricks[i]];
  p.nextSpellHeight+=4;p.spellCount++;round.events.push({type:'power',player:p.id});p.effects.push({kind:'power',time:round.seconds});
}
export function castIslandSpell(round,id,choice,targetId) {
  const p=round.players[id];if(!p||round.status!=='playing'||p.status!=='building'||!p.spells[choice])return false;
  const name=p.spells[choice],spell=SPELLS[name];let target=p;
  if(spell.kind==='trick'){
    target=round.players.find(other=>other.id===Number(targetId)&&other.id!==id&&other.status==='building');
    if(!target)return false;
  }
  p.spells=[];p.effects.push({kind:'cast',time:round.seconds,target:target.id});round.events.push({type:'spell',player:id,name,target:target.id});
  if(target!==p&&target.buffs.shield){target.buffs.shield=false;target.effects.push({kind:'shield',blocked:true,time:round.seconds});return true;}
  if(name==='anchor')target.buffs.anchor=true;
  if(name==='shield')target.buffs.shield=true;
  if(name==='steady'){target.buffs.calm=10;for(const item of target.pieces){item.body.velocity.scale(.35,item.body.velocity);item.body.angularVelocity.scale(.2,item.body.angularVelocity);}}
  if(name==='heavy')target.buffs.heavy=true;
  if(name==='tilt')target.buffs.tilt=(round.random()<.5?-1:1)*.18;
  if(name==='gust')for(const item of target.pieces)if(!item.anchored&&!item.lost){item.body.wakeUp();item.body.velocity.x+=(target.id%2?-.65:.65);item.body.angularVelocity.z+=(target.id%2?.07:-.07);}
  target.effects.push({kind:name,time:round.seconds});return true;
}
export function islandFinishLine(round){return Math.max(7,round.level.goal-round.seconds*.028);}
function settlePlayer(round,p,dt) {
  const contacts=new Set();for(const contact of p.world.contacts){contacts.add(contact.bi.id);contacts.add(contact.bj.id);}
  let losses=0;
  for(const item of p.pieces){
    if(item.lost)continue;const b=item.body;item.age+=dt;
    b.position.z=0;b.velocity.z=0;b.angularVelocity.x=0;b.angularVelocity.y=0;b.angularVelocity.z=clamp(b.angularVelocity.z,-8,8);
    b.quaternion.x=0;b.quaternion.y=0;b.quaternion.normalize();
    const stable=(b.sleepState===Body.SLEEPING&&item.settled)||(contacts.has(b.id)&&b.velocity.lengthSquared()<.12&&Math.abs(b.angularVelocity.z)<.24);
    item.stable=stable||item.anchored?item.stable+dt:0;
    if(item.stable>.35&&!item.settled){item.settled=true;p.placed++;round.events.push({type:'land',player:p.id});}
    if(item.settled&&item.wantsAnchor&&!item.anchored){item.anchored=true;b.velocity.setZero();b.angularVelocity.setZero();b.type=Body.STATIC;b.mass=0;b.updateMassProperties();}
    if(b.position.y<p.base-5||Math.abs(b.position.x)>16){item.lost=true;p.world.removeBody(b);p.lost++;losses++;p.effects.push({kind:'splash',x:clamp(b.position.x,-7,7),time:round.seconds});round.events.push({type:'loss',player:p.id});}
  }
  p.pieces=p.pieces.filter(item=>!item.lost);p.retained=p.pieces.filter(item=>item.settled).length;
  if(losses&&round.mode==='puzzle')liftIsland(round,p,losses*round.level.raise);
  p.top=towerHeight(p);p.stableTop=towerHeight(p,true);grantSpell(round,p);
  if(round.mode==='survival'&&p.lost>=3)freezeIsland(round,p,'out');
  if(round.mode==='survival'&&p.retained>=round.level.supply){p.status='complete';p.active=null;p.finishedAt=round.seconds;round.finishIds.push(p.id);}
  if(round.mode==='puzzle'){
    p.freezeHold=p.stableTop>=round.level.ceiling-.02?p.freezeHold+dt:0;
    if(p.freezeHold>.65||p.base>=round.level.ceiling-.5)freezeIsland(round,p);
  }
  if(round.mode==='race'){
    p.raceHold=p.retained>=3&&p.stableTop>=islandFinishLine(round)?p.raceHold+dt:0;
    if(p.raceHold>=1.5){p.status='complete';p.active=null;p.finishedAt=round.seconds;round.finishIds.push(p.id);}
  }
}
export function chooseIslandPlacement(round,p) {
  if(!p.active)return null;
  const cells=islandWorldCells(p),actions=[];
  for(let rotation=0;rotation<4;rotation++)for(let x=-Math.floor(p.width/2);x<=Math.floor(p.width/2);x+=.5){
    const local=islandCells(p.active.type,rotation),y=landingHeight(p,p.active.type,x,rotation,cells);
    if(y<p.base||y>p.active.y+.1)continue;
    let support=0,overhang=0,gap=0;
    for(const [cx,cy]of local){const wx=x+cx,wy=y+cy-.5;const under=cells.filter(c=>Math.abs(c.x-wx)<c.radius+.36&&c.y+c.radius<=wy+.08);const floor=Math.abs(wx)<p.width/2?p.base:p.base-5;const top=Math.max(floor,...under.map(c=>c.y+c.radius));if(wy-top<.18)support++;gap+=Math.min(5,Math.max(0,wy-top));if(Math.abs(wx)>p.width/2)overhang++;}
    const maxY=Math.max(...local.map(c=>c[1]))+y+.5;
    const score=support*4-gap*.9-overhang*2.5-Math.abs(x)*.2-(round.mode==='race'?maxY*.45:maxY*1.5)-(round.mode==='puzzle'&&maxY>=round.level.ceiling?35:0);
    actions.push({x,rotation,score});
  }
  return p.brain.choose(actions,a=>a.score);
}
function playComputer(round,p,dt) {
  if(p.kind!=='bot'||p.status!=='building')return;
  p.aiTimer-=dt;if(p.aiTimer>0)return;
  if(p.spells.length){const rivals=round.players.filter(r=>r.id!==p.id&&r.status==='building').sort((a,b)=>b.retained-a.retained);const choice=p.brain.choose([0,1],i=>i===0?(p.lost?3:1):2);if(!castIslandSpell(round,p.id,choice,rivals[0]?.id))castIslandSpell(round,p.id,0);p.aiTimer=.35;return;}
  if(!p.active)return;
  if(!p.aiPlan)p.aiPlan=chooseIslandPlacement(round,p);
  const plan=p.aiPlan;if(!plan){islandAction(round,p.id,'drop');return;}
  p.aiTimer=Math.max(.085,p.brain.level.tap/2000);
  if(p.active.rotation!==plan.rotation){if(!islandAction(round,p.id,'rotate'))p.aiPlan=null;}
  else if(Math.abs(p.active.x-plan.x)>.1){if(!islandAction(round,p.id,p.active.x<plan.x?'right':'left'))p.aiPlan=null;}
  else islandAction(round,p.id,'drop');
}
export function stepIslandRound(round,seconds=ISLAND_STEP) {
  if(round.status!=='playing'||!Number.isFinite(seconds)||seconds<=0)return;
  const dt=Math.min(ISLAND_STEP,seconds);round.seconds+=dt;
  for(const p of round.players){
    p.effects=p.effects.filter(e=>round.seconds-e.time<2);if(p.status!=='building')continue;
    p.buffs.calm=Math.max(0,p.buffs.calm-dt);playComputer(round,p,dt);
    for(const item of p.pieces)if(!item.anchored&&!item.lost&&item.body.sleepState!==Body.SLEEPING){item.body.force.x+=Math.sin(round.seconds*.7+p.id)*round.level.wind*item.body.mass;if(p.buffs.calm){item.body.velocity.x*=.98;item.body.angularVelocity.z*=.96;}}
    p.world.step(dt);settlePlayer(round,p,dt);if(p.status!=='building')continue;
    if(p.active){p.active.y-=round.level.fall*(p.buffs.calm ? .75 : 1)*dt;const landing=landingHeight(p,p.active.type,p.active.x,p.active.rotation);if(p.active.y<=landing+.03){p.active.y=landing+.03;releaseIslandPiece(round,p);}}
    else {p.spawnWait-=dt;if(p.spawnWait<=0&&(!p.pending||p.pending.contacted||p.pending.lost||p.pending.age>3)){p.pending=null;spawnIslandPiece(round,p);}}
  }
  if(round.finishIds.length||round.players.every(p=>p.status!=='building')||round.seconds>=round.level.limit){
    round.status='over';round.finishReason=round.finishIds.length?'finish':round.seconds>=round.level.limit?'sunset':'all-finished';
    for(const p of round.players)if(p.status==='building'){if(round.mode==='puzzle')freezeIsland(round,p);else{p.status='finished';p.active=null;}}
    round.events.push({type:'end'});
  }
}
export function rankIslandRound(round) {
  const tuple=p=>round.mode==='race'?(round.finishIds.includes(p.id)?[1,0]:[0,p.stableTop-p.base]):round.mode==='puzzle'?[p.retained]:[-Math.max(0,round.level.supply-p.retained),-p.lost];
  const compare=(a,b)=>{const av=tuple(a),bv=tuple(b);for(let i=0;i<av.length;i++)if(Math.abs(av[i]-bv[i])>.025)return bv[i]-av[i];return 0;};
  const sorted=[...round.players].sort(compare);let rank=1;
  return sorted.map((p,index)=>{if(index&&compare(sorted[index-1],p)!==0)rank=index+1;return {id:p.id,name:p.name,rank,points:[5,3,2,1][rank-1],won:rank===1,retained:p.retained,lost:p.lost,remaining:Math.max(0,round.level.supply-p.retained),height:Math.max(0,p.stableTop-p.base),status:p.status};});
}
export function disposeIslandRound(round){for(const p of round?.players||[]){for(const b of [...p.world.bodies])p.world.removeBody(b);p.pieces.length=0;p.active=null;}}
export function createTetrisTournament(rounds,players){return {rounds:normalizeTournament(rounds),scores:players.map((p,id)=>({id,name:p.name,points:0})),completed:[],index:0};}
export function awardTournamentRound(tournament,roundId,results){
  if(tournament.completed.includes(roundId))return false;
  for(const result of results){const p=tournament.scores.find(p=>p.id===result.id);if(p)p.points+=result.points;}
  tournament.completed.push(roundId);return true;
}
export function tournamentStandings(tournament){const sorted=[...tournament.scores].sort((a,b)=>b.points-a.points);let rank=1;return sorted.map((p,i)=>{if(i&&p.points!==sorted[i-1].points)rank=i+1;return {...p,rank,won:rank===1};});}
