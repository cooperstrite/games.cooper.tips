import test from 'node:test';
import assert from 'node:assert/strict';
import {PIECE_NAMES,rotatedCells,islandCells,pieceSequence,TETRIS_LEVELS,TETRIS_ITEMS,TETRIS_STYLE_KEY,normalizeMage,normalizeTournament,readTetrisWardrobe,writeTetrisWardrobe,tetrisRewardTotal} from '../tetris-config.js';
import {createClassic,classicFits,classicAction,classicGhost,lockClassic,clearClassicRows,stepClassic,feedGorilla,gorillaRampage} from '../tetris-classic.js';
import {createIslandRound,spawnIslandPiece,releaseIslandPiece,islandAction,stepIslandRound,landingHeight,bodyAngle,liftIsland,freezeIsland,castIslandSpell,islandFinishLine,rankIslandRound,disposeIslandRound,chooseIslandPlacement,createTetrisTournament,awardTournamentRound,tournamentStandings} from '../tetris-islands.js';
import {ARCADE_ITEMS} from '../arcade/catalog.js';
import {STUDIO_GAMES,STUDIO_VIEWS} from '../arcade/games.js';
import {createArcadeWallet} from '../arcade/wallet.js';
import {createRewardSession,rewardTotal} from '../arcade/game-services.js';

const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const single=(mode='race')=>createIslandRound({mode,difficulty:'easy',seed:42,players:[{name:'Player',kind:'human'}]});
const step=(round,seconds)=>{for(let i=0;i<Math.round(seconds*60);i++)stepIslandRound(round);};
function place(round,{type='O',x=0,y=10,rotation=0}={}){const p=round.players[0];p.active={type,x,y,rotation,touched:true};releaseIslandPiece(round,p,true);p.spawnWait=Infinity;return p.pieces.at(-1);}

test('all seven tetrominoes keep four square cells and return to their original rotation',()=>{
  for(const type of PIECE_NAMES){assert.deepEqual(rotatedCells(type,4),rotatedCells(type,0));for(let r=0;r<4;r++){const cells=rotatedCells(type,r),local=islandCells(type,r);assert.equal(new Set(cells.map(c=>c.join(','))).size,4);assert.ok(cells.every(c=>c.every(Number.isInteger)));assert.equal(local.reduce((n,c)=>n+c[0],0),0);assert.equal(local.reduce((n,c)=>n+c[1],0),0);}}
});
test('seven-bag sequences are deterministic, fair, and never omit a shape from a bag',()=>{
  const sequence=pieceSequence(312,140);assert.deepEqual(sequence,pieceSequence(312,140));assert.notDeepEqual(sequence,pieceSequence(313,140));
  for(let i=0;i<sequence.length;i+=7)assert.equal(new Set(sequence.slice(i,i+7)).size,7);
  const round=createIslandRound({seed:8,players:[{},{},{},{}]});for(const p of round.players)spawnIslandPiece(round,p);assert.equal(new Set(round.players.map(p=>p.active.type)).size,1);disposeIslandRound(round);
});
test('Classic movement respects walls, supports both rotation directions, and hard drops onto the ghost',()=>{
  const s=createClassic({seed:7});for(let i=0;i<20;i++)classicAction(s,'left');assert.ok(classicFits(s,s.active.type,s.active.x,s.active.y,s.active.rotation));
  const first=s.active.rotation;classicAction(s,'rotate');classicAction(s,'counter');assert.equal(s.active.rotation,first);
  const ghost=classicGhost(s),cells=rotatedCells(ghost.type,ghost.rotation).map(([x,y])=>[x+ghost.x,y+ghost.y]);classicAction(s,'drop');assert.equal(s.placed,1);assert.equal(s.manual,1);for(const [x,y]of cells)assert.equal(s.grid[y][x],ghost.type);
});
test('Classic clears rows rather than collapsing individual columns',()=>{
  const s=createClassic();s.grid[19].fill('I');s.grid[18][4]='T';s.grid[16][4]='O';assert.equal(clearClassicRows(s),1);assert.equal(s.lines,1);assert.equal(s.score,100);assert.equal(s.grid[19][4],'T');assert.equal(s.grid[18][4],null);assert.equal(s.grid[17][4],'O');
  for(let y=16;y<20;y++)s.grid[y].fill('Z');assert.equal(clearClassicRows(s),4);assert.equal(s.score,900);assert.equal(s.lines,5);
});
test('Classic hold can be used once per piece and resets after a legal lock',()=>{
  const s=createClassic({seed:44}),first=s.active.type;assert.equal(classicAction(s,'hold'),true);assert.equal(s.hold,first);const current=s.active.type;assert.equal(classicAction(s,'hold'),false);assert.equal(s.active.type,current);classicAction(s,'drop');assert.equal(classicAction(s,'hold'),true);assert.equal(s.active.type,first);
});
test('Classic gives a short lock delay and top-out ends the run without writing outside the grid',()=>{
  const s=createClassic();s.active.y=classicGhost(s).y;for(let i=0;i<20;i++)stepClassic(s,1/60);assert.equal(s.placed,0);for(let i=0;i<10;i++)stepClassic(s,1/60);assert.equal(s.placed,1);
  s.active={type:'O',x:3,y:-2,rotation:0,touched:true};s.grid[0].fill('I');lockClassic(s);assert.equal(s.status,'over');assert.equal(s.grid.length,20);const snapshot=structuredClone({...s,random:null});stepClassic(s,1);assert.deepEqual({...s,random:null},snapshot);
});
test('the optional gorilla uses a limited banana supply and actually breaks and collapses tiles',()=>{
  const s=createClassic({gorilla:true,seed:8});assert.equal(feedGorilla(s),true);assert.equal(s.bananas,2);assert.equal(s.hunger,42);feedGorilla(s);feedGorilla(s);assert.equal(feedGorilla(s),false);
  for(let x=0;x<10;x++){s.grid[15][x]='T';s.grid[19][x]='J';}const before=s.grid.flat().filter(Boolean).length;gorillaRampage(s);assert.ok(s.grid.flat().filter(Boolean).length<before);assert.ok(s.events.some(e=>e.type==='smash'));
  for(let x=0;x<10;x++){const column=s.grid.map(row=>row[x]);const first=column.findIndex(Boolean);if(first>=0)assert.ok(column.slice(first).every(Boolean));}
  const normal=createClassic({gorilla:false});assert.equal(feedGorilla(normal),false);for(let i=0;i<1800;i++)stepClassic(normal,1/60);assert.equal(normal.events.some(e=>e.type==='smash'),false);
});
test('clearing two Classic lines replenishes a banana, capped at five',()=>{
  const s=createClassic({gorilla:true});s.bananas=2;s.grid[18].fill('J');s.grid[19].fill('J');clearClassicRows(s);assert.equal(s.bananas,3);for(let i=0;i<6;i++){s.grid[18].fill('J');s.grid[19].fill('J');clearClassicRows(s);}assert.equal(s.bananas,5);assert.ok(s.level>=2);
});
test('real rigid bodies settle on the island and remain stable when asleep',()=>{
  const r=single(),p=r.players[0],item=place(r);step(r,7);assert.equal(item.body.shapes.length,4);assert.equal(p.retained,1);assert.ok(p.stableTop>1.8&&p.stableTop<2.1);assert.ok(Math.abs(item.body.position.z)<1e-9);assert.ok(Math.abs(bodyAngle(item.body))<.05);assert.equal(p.manual,1);disposeIslandRound(r);
});
test('unsupported pieces tip and tumble rather than snapping into a grid',()=>{
  const r=single(),p=r.players[0],item=place(r,{type:'I',x:p.width/2+.7});let angle=0;
  for(let i=0;i<600;i++){stepIslandRound(r);angle=Math.max(angle,Math.abs(bodyAngle(item.body)));}
  assert.ok(angle>.2);assert.ok(p.lost>=1);assert.equal(p.pieces.includes(item),false);disposeIslandRound(r);
});
test('island steering obeys legal bounds and a released piece cannot be moved by hand',()=>{
  const r=single(),p=r.players[0];spawnIslandPiece(r,p);for(let i=0;i<30;i++)islandAction(r,0,'left');assert.ok(Math.abs(p.active.x)<=p.width/2+2);islandAction(r,0,'drop');assert.equal(p.active,null);assert.equal(islandAction(r,0,'right'),false);assert.equal(p.manual,1);disposeIslandRound(r);
});
test('a lost puzzle piece lifts the whole island and its existing tower',()=>{
  const r=single('puzzle'),p=r.players[0];const kept=place(r);step(r,3);const start=kept.body.position.y,base=p.base;place(r,{type:'O',x:10});step(r,4);assert.equal(p.lost,1);assert.equal(p.base,base+r.level.raise);assert.ok(kept.body.position.y>start+.5);assert.equal(p.ground.position.y,p.base-.4);disposeIslandRound(r);
});
test('a held puzzle piece above the line does not freeze the tower, but a settled tower crossing it does',()=>{
  const r=single('puzzle'),p=r.players[0];spawnIslandPiece(r,p);step(r,.3);assert.equal(p.status,'building');p.active=null;place(r);step(r,3);liftIsland(r,p,7);step(r,2);assert.equal(p.status,'frozen');assert.ok(p.pieces.every(item=>item.body.mass===0));const y=p.pieces[0].body.position.y;step(r,2);assert.equal(p.pieces[0].body.position.y,y);disposeIslandRound(r);
});
test('survival gives exactly three lost-piece chances and a harder course has a larger supply',()=>{
  const r=single('survival'),p=r.players[0];for(let i=0;i<3;i++){place(r,{x:10});step(r,3);}assert.equal(p.lost,3);assert.equal(p.status,'out');assert.equal(r.status,'over');assert.equal(islandAction(r,0,'drop'),false);
  for(let i=1;i<TETRIS_LEVELS.length;i++){assert.ok(TETRIS_LEVELS[i].supply>TETRIS_LEVELS[i-1].supply);assert.ok(TETRIS_LEVELS[i].width>=4);}disposeIslandRound(r);
});
test('race finish lowers over time and held or freely falling pieces cannot win',()=>{
  const r=single(),p=r.players[0],goal=islandFinishLine(r);spawnIslandPiece(r,p);p.active.y=35;step(r,2);assert.ok(islandFinishLine(r)<goal);assert.equal(r.status,'playing');assert.equal(p.raceHold,0);p.active=null;place(r,{x:10,y:30});step(r,1);assert.equal(p.raceHold,0);disposeIslandRound(r);
});
test('spell choices are consumed once, require a valid target, and shields stop sabotage',()=>{
  const r=createIslandRound({players:[{},{},{}]}),a=r.players[0],b=r.players[1];a.spells=['anchor','gust'];assert.equal(castIslandSpell(r,0,1,0),false);assert.equal(a.spells.length,2);assert.equal(castIslandSpell(r,0,0),true);assert.equal(a.buffs.anchor,true);assert.equal(castIslandSpell(r,0,0),false);
  a.spells=['steady','heavy'];b.buffs.shield=true;assert.equal(castIslandSpell(r,0,1,1),true);assert.equal(b.buffs.shield,false);assert.equal(b.buffs.heavy,false);a.spells=['shield','heavy'];castIslandSpell(r,0,1,1);assert.equal(b.buffs.heavy,true);disposeIslandRound(r);
});
test('an anchored piece freezes only after settling and does not make all pieces static',()=>{
  const r=single(),p=r.players[0];p.buffs.anchor=true;const item=place(r);assert.ok(item.body.mass>0);step(r,3);assert.equal(item.anchored,true);assert.equal(item.body.mass,0);const next=place(r);assert.equal(next.wantsAnchor,false);assert.ok(next.body.mass>0);disposeIslandRound(r);
});
test('bad time steps and ended rounds cannot accelerate physics or produce catch-up bursts',()=>{
  const r=single();for(const dt of [0,-1,NaN,Infinity])stepIslandRound(r,dt);assert.equal(r.seconds,0);stepIslandRound(r,50);assert.equal(r.seconds,1/60);r.status='over';stepIslandRound(r,1);assert.equal(r.seconds,1/60);disposeIslandRound(r);
});
test('computer choices use the visible current piece and tower, not future unseen pieces',()=>{
  const options={seed:98,players:[{kind:'bot',difficulty:'hard'}]},a=createIslandRound(options),b=createIslandRound(options);spawnIslandPiece(a,a.players[0]);spawnIslandPiece(b,b.players[0]);b.sequence.fill('O',b.players[0].index);assert.deepEqual(chooseIslandPlacement(a,a.players[0]),chooseIslandPlacement(b,b.players[0]));disposeIslandRound(a);disposeIslandRound(b);
});
test('all island modes end in finite time and computers can complete a legal survival supply',()=>{
  for(const mode of ['race','puzzle','survival']){const r=createIslandRound({mode,difficulty:'easy',seed:7,players:[{kind:'bot',difficulty:'easy'},{kind:'bot',difficulty:'expert'}]});for(let i=0;i<14410&&r.status==='playing';i++)stepIslandRound(r);assert.equal(r.status,'over',mode);assert.equal(rankIslandRound(r).length,2);assert.ok(r.players.every(p=>Number.isFinite(p.top)));if(mode==='survival')assert.ok(r.players.some(p=>p.retained>=r.level.supply));disposeIslandRound(r);}
});
test('race and puzzle ties share places; survival ranks by supply left then dropped pieces',()=>{
  const r=createIslandRound({mode:'puzzle',players:[{name:'A'},{name:'B'},{name:'C'}]});r.players[0].retained=8;r.players[1].retained=8;r.players[2].retained=3;assert.deepEqual(rankIslandRound(r).map(p=>[p.rank,p.points]),[[1,5],[1,5],[3,2]]);
  r.mode='survival';r.players[0].lost=2;r.players[1].lost=1;assert.equal(rankIslandRound(r)[0].id,1);
  r.mode='race';r.finishIds=[0,1];r.players[0].stableTop=20;r.players[1].stableTop=21;assert.deepEqual(rankIslandRound(r).map(p=>p.rank),[1,1,3]);disposeIslandRound(r);
});
test('custom tournaments preserve their order, cap at nine rounds, and never count a round twice',()=>{
  const rounds=[{mode:'survival',difficulty:'hard'},{mode:'puzzle',difficulty:'easy'},{mode:'race',difficulty:'expert'}];assert.deepEqual(normalizeTournament(rounds),rounds);assert.equal(normalizeTournament(Array(14).fill(rounds[0])).length,9);assert.equal(normalizeTournament([{mode:'invalid'}]).length,3);
  const cup=createTetrisTournament(rounds,[{name:'A'},{name:'B'}]);const result=[{id:0,points:5},{id:1,points:3}];assert.equal(awardTournamentRound(cup,'one',result),true);assert.equal(awardTournamentRound(cup,'one',result),false);awardTournamentRound(cup,'two',[{id:0,points:3},{id:1,points:5}]);assert.deepEqual(tournamentStandings(cup).map(p=>[p.points,p.rank]),[[8,1],[8,1]]);
});
test('appearance is saved independently per player and paid skins never change mechanics',()=>{
  const store=storage(),owned=TETRIS_ITEMS.map(i=>i.id),w=readTetrisWardrobe(owned,store);w.players[0].hair='braids';w.players[0].robeColor='#123456';w.players[0].hairColor='#654321';w.players[1].name='River';writeTetrisWardrobe(w,owned,store);const saved=readTetrisWardrobe(owned,store);assert.equal(saved.players[0].hair,'braids');assert.equal(saved.players[0].hairColor,'#654321');assert.equal(saved.players[1].name,'River');assert.notEqual(saved.players[1].robeColor,'#123456');
  for(const item of TETRIS_ITEMS){assert.ok(ARCADE_ITEMS.some(i=>i.id===item.id));assert.notEqual(normalizeMage({[item.setting]:item.value})[item.setting],item.value);assert.equal(normalizeMage({[item.setting]:item.value},owned)[item.setting],item.value);}
  assert.equal(normalizeMage({mass:0,gravity:0}).mass,undefined);assert.ok(STUDIO_GAMES.tetris);assert.deepEqual(STUDIO_VIEWS.tetris,['2d']);store.setItem(TETRIS_STYLE_KEY,'invalid');assert.equal(readTetrisWardrobe([],store).players.length,4);
});
test('coin rewards need a completed active run and never pay local or solo island practice',()=>{
  const p={mode:'classic',finished:true,manual:5,seconds:20,lines:7,difficulty:'hard'};assert.equal(tetrisRewardTotal(p),21);assert.equal(rewardTotal('tetris',p),21);assert.equal(tetrisRewardTotal({...p,lines:10000}),40);
  for(const change of [{finished:false},{manual:4},{seconds:19},{lines:NaN}])assert.equal(tetrisRewardTotal({...p,...change}),0);
  const battle={mode:'race',finished:true,manual:10,seconds:40,retained:30,won:true,humans:1,bots:['hard','easy'],difficulty:'expert'};assert.equal(tetrisRewardTotal(battle),12);assert.equal(tetrisRewardTotal({...battle,bots:['expert']}),30);assert.equal(tetrisRewardTotal({...battle,humans:2}),0);assert.equal(tetrisRewardTotal({...battle,bots:[]}),0);assert.equal(tetrisRewardTotal({...battle,won:false}),6);
});
test('the shared wallet awards a finished Tetris round once and supports its cosmetic purchases',async()=>{
  const store=storage(),wallet=createArcadeWallet({storage:store}),session=createRewardSession('tetris',wallet),p={mode:'classic',finished:true,manual:20,seconds:40,lines:20,difficulty:'expert'};
  const results=await Promise.all([session.award(p),session.award(p)]);assert.equal(results.reduce((n,r)=>n+r.coins,0),40);assert.equal((await session.award(p)).coins,0);assert.equal(wallet.getState().coins,40);assert.equal((await wallet.purchase(TETRIS_ITEMS[0].id)).ok,false);
});
