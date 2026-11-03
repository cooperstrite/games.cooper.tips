import { rotatedCells, pieceSequence, tetrisLevel, seededRandom } from './tetris-config.js';

export const GRID_WIDTH=10,GRID_HEIGHT=20;
export function createClassic({difficulty='medium',gorilla=false,seed=Date.now()}={}) {
  const state={mode:'classic',difficulty:tetrisLevel(difficulty).id,grid:Array.from({length:20},()=>Array(10).fill(null)),sequence:pieceSequence(seed,7000),index:0,active:null,hold:null,held:false,
    status:'playing',seconds:0,score:0,lines:0,level:1,placed:0,manual:0,fallTime:0,lockTime:0,lockResets:0,events:[],effects:[],seed,
    gorilla,bananas:3,hunger:gorilla?30:0,anger:0,random:seededRandom(seed^0xF00D)};
  spawnClassic(state);return state;
}
export function classicFits(state,type,x,y,rotation) {
  return rotatedCells(type,rotation).every(([cx,cy])=>{const px=x+cx,py=y+cy;return px>=0&&px<10&&py<20&&(py<0||!state.grid[py][px]);});
}
export function spawnClassic(state,type) {
  state.active={type:type||state.sequence[state.index++%state.sequence.length],x:3,y:-2,rotation:0,touched:false};state.fallTime=0;state.lockTime=0;state.lockResets=0;
  const p=state.active;
  if(!classicFits(state,p.type,p.x,p.y,p.rotation)){state.status='over';state.events.push({type:'end'});}
}
export function classicGhost(state) {
  if(!state.active)return null;
  const p={...state.active};for(let i=0;i<24&&classicFits(state,p.type,p.x,p.y+1,p.rotation);i++)p.y++;return p;
}
export function clearClassicRows(state) {
  const rows=[];state.grid.forEach((row,y)=>{if(row.every(Boolean))rows.push(y);});
  if(!rows.length)return 0;
  const before=state.lines;state.grid=state.grid.filter((_,y)=>!rows.includes(y));while(state.grid.length<20)state.grid.unshift(Array(10).fill(null));
  state.lines+=rows.length;state.score+=[0,100,300,500,800][Math.min(4,rows.length)]*state.level;state.level=1+Math.floor(state.lines/10);
  state.bananas=Math.min(5,state.bananas+Math.floor(state.lines/2)-Math.floor(before/2));
  state.effects.push({kind:'lines',rows,time:state.seconds});state.events.push({type:'clear',count:rows.length});return rows.length;
}
export function lockClassic(state) {
  if(state.status!=='playing'||!state.active)return;
  const p=state.active,cells=rotatedCells(p.type,p.rotation).map(([x,y])=>[x+p.x,y+p.y]);
  if(cells.some(([,y])=>y<0)){state.status='over';state.events.push({type:'end'});return;}
  for(const [x,y]of cells)state.grid[y][x]=p.type;
  state.placed++;if(p.touched)state.manual++;
  state.events.push({type:'land'});clearClassicRows(state);state.held=false;spawnClassic(state);
}
export function classicAction(state,action) {
  if(state.status!=='playing'||!state.active)return false;
  const p=state.active;
  if(action==='feed')return feedGorilla(state);
  if(action==='hold') {
    if(state.held)return false;
    const swap=state.hold;state.hold=p.type;spawnClassic(state,swap||undefined);state.held=true;state.active.touched=true;state.events.push({type:'move'});return true;
  }
  if(action==='drop') {const ghost=classicGhost(state);state.score+=(ghost.y-p.y)*2;p.y=ghost.y;p.touched=true;lockClassic(state);return true;}
  let x=p.x,y=p.y,rotation=p.rotation;
  if(action==='left')x--;else if(action==='right')x++;else if(action==='down')y++;
  else if(action==='rotate'||action==='counter') {
    rotation=(rotation+(action==='counter'?3:1))%4;
    const kicks=[[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[-1,-1],[1,-1],[0,-2]];
    const kick=kicks.find(([dx,dy])=>classicFits(state,p.type,p.x+dx,p.y+dy,rotation));if(!kick)return false;
    x+=kick[0];y+=kick[1];
  } else return false;
  if(!classicFits(state,p.type,x,y,rotation))return false;
  p.x=x;p.y=y;p.rotation=rotation;p.touched=true;
  if(action==='down')state.score++;else if(state.lockResets<15){state.lockTime=0;state.lockResets++;}
  state.events.push({type:action==='rotate'||action==='counter'?'rotate':'move'});return true;
}
export function feedGorilla(state) {
  if(!state.gorilla||!state.bananas||state.status!=='playing')return false;
  state.bananas--;state.hunger=Math.min(42,state.hunger+24);state.anger=0;state.effects.push({kind:'banana',time:state.seconds});state.events.push({type:'banana'});return true;
}
export function gorillaRampage(state) {
  const occupied=[];for(let y=9;y<20;y++)for(let x=0;x<10;x++)if(state.grid[y][x])occupied.push([x,y]);
  const focus=occupied[Math.floor(state.random()*occupied.length)];const broken=[];
  if(focus)for(let y=Math.max(0,focus[1]-1);y<=Math.min(19,focus[1]+1);y++)for(let x=Math.max(0,focus[0]-1);x<=Math.min(9,focus[0]+1);x++)if(state.grid[y][x]){broken.push({x,y,type:state.grid[y][x]});state.grid[y][x]=null;}
  // Only this optional challenge collapses columns; ordinary Classic always
  // uses conventional whole-row clearing and preserves gaps.
  for(let x=0;x<10;x++){const cells=state.grid.map(row=>row[x]).filter(Boolean);for(let y=19;y>=0;y--)state.grid[y][x]=cells.pop()||null;}
  state.effects.push({kind:'smash',cells:broken,time:state.seconds});state.events.push({type:'smash'});state.anger=1.4;
  state.hunger=Math.max(15,30-tetrisLevel(state.difficulty).coin*2);
}
export function stepClassic(state,seconds) {
  if(state.status!=='playing'||!Number.isFinite(seconds)||seconds<=0)return;
  const dt=Math.min(.1,seconds);state.seconds+=dt;state.effects=state.effects.filter(e=>state.seconds-e.time<1.5);state.anger=Math.max(0,state.anger-dt);
  if(state.gorilla){state.hunger-=dt;if(state.hunger<=0)gorillaRampage(state);}
  const p=state.active,fall=Math.max(.065,tetrisLevel(state.difficulty).gridFall*.84**(state.level-1));
  state.fallTime+=dt;
  if(state.fallTime>=fall){state.fallTime%=fall;if(classicFits(state,p.type,p.x,p.y+1,p.rotation))p.y++;}
  if(classicFits(state,p.type,p.x,p.y+1,p.rotation))state.lockTime=0;else{state.lockTime+=dt;if(state.lockTime>=.48)lockClassic(state);}
}
