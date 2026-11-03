export const TETRIS_STYLE_KEY = 'cooper-tetris-isles-wardrobe-v1';
export const TETRIS_SETTINGS_KEY = 'cooper-tetris-isles-settings-v1';
export const TETRIS_COLORS = ['#4fc9dd','#5375d9','#eea45d','#f2d16b','#83c55e','#ad77d9','#e7788c'];
export const PIECE_NAMES = ['I','J','L','O','S','T','Z'];
export const PIECES = Object.freeze({
  I:[[0,1],[1,1],[2,1],[3,1]], J:[[0,0],[0,1],[1,1],[2,1]], L:[[2,0],[0,1],[1,1],[2,1]],
  O:[[1,0],[2,0],[1,1],[2,1]], S:[[1,0],[2,0],[0,1],[1,1]], T:[[1,0],[0,1],[1,1],[2,1]], Z:[[0,0],[1,0],[1,1],[2,1]],
});
export function rotatedCells(type, rotation=0) {
  let cells=(PIECES[type]||PIECES.T).map(p=>[...p]);
  const center=type==='I'?1.5:1;
  if(type==='O')return cells;
  for(let i=0;i<((rotation%4)+4)%4;i++)cells=cells.map(([x,y])=>[center-(y-center),center+(x-center)]);
  return cells;
}
export function islandCells(type, rotation=0) {
  const cells=rotatedCells(type,rotation),cx=cells.reduce((n,p)=>n+p[0],0)/4,cy=cells.reduce((n,p)=>n+p[1],0)/4;
  return cells.map(([x,y])=>[x-cx,cy-y]);
}
export function seededRandom(seed=1) { let value=seed>>>0;return ()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}; }
export function pieceSequence(seed=1, count=1000) {
  const random=seededRandom(seed),out=[];
  while(out.length<count){const bag=[...PIECE_NAMES];for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}out.push(...bag);}return out.slice(0,count);
}
export const TETRIS_LEVELS = Object.freeze([
  {id:'easy',name:'Easy',fall:1.1,gridFall:.85,width:8,supply:22,goal:15,ceiling:8,raise:.65,wind:0,limit:240,coin:1},
  {id:'medium',name:'Medium',fall:1.6,gridFall:.65,width:7,supply:32,goal:18,ceiling:8,raise:.8,wind:.04,limit:240,coin:2},
  {id:'hard',name:'Hard',fall:2.3,gridFall:.46,width:6,supply:44,goal:21,ceiling:7.5,raise:1,wind:.08,limit:240,coin:3},
  {id:'expert',name:'Expert',fall:3.1,gridFall:.32,width:5.5,supply:58,goal:24,ceiling:7,raise:1.2,wind:.12,limit:240,coin:4},
].map(Object.freeze));
export const tetrisLevel=id=>TETRIS_LEVELS.find(l=>l.id===id)||TETRIS_LEVELS[1];
export const TETRIS_MODES = Object.freeze({
  classic:{name:'Classic',tag:'THE ORIGINAL RHYTHM',summary:'Rotate, drop, and clear complete rows on a 10 by 20 grid.',rules:'Fill a horizontal row to clear it. Clear four at once for a bigger score. The pace rises every ten lines. A piece that cannot enter the board ends the game. Hold one piece with C; the ghost shows its landing position.'},
  race:{name:'Island race',tag:'REACH FOR THE SKY',summary:'Build a steady tower up to a slowly descending finish ribbon.',rules:'Steer the enchanted falling piece, rotate, then release it. Released pieces tip and tumble. Keep a settled tower above the finish ribbon for 1.5 seconds to win. The ribbon slowly lowers. At four-minute sunset, the highest stable tower wins. Every four new meters of stable tower height offers a choice of two spells.'},
  puzzle:{name:'Frozen puzzle',tag:'MAKE EVERY SPACE COUNT',summary:'Fit the most pieces below the frost line. Every lost piece lifts your island.',rules:'Pack pieces into the small space below the frost line. Each piece lost to the sea lifts your island AND tower closer to the line. A settled tower touching it freezes in ice and your turn ends. You can Freeze & bank early. Most retained pieces wins; equal scores share the place. The round ends when everyone freezes or at sunset.'},
  survival:{name:'Survival',tag:'THREE CHANCES. ONE TOWER.',summary:'Work through your supply without losing three pieces to the sea.',rules:'Every piece still in your tower reduces your remaining supply. A lost piece costs one of three hearts, including pieces that fall later. Three losses ends your run. Finish your supply, or have the fewest pieces left when everyone finishes or sunset arrives. Ties favor fewer losses. Difficulty changes the island width and supply.'},
  tournament:{name:'Tournament',tag:'YOUR OWN ISLAND CUP',summary:'Arrange up to nine races, puzzles, and survival rounds.',rules:'Choose the order and difficulty of each round. Keep the same players throughout. Places award 5 / 3 / 2 / 1 points; ties share the points for their place. Most points after the final round wins. Coin rewards come from each completed qualifying round, with no extra tournament jackpot.'},
});
export const SPELLS = Object.freeze({
  anchor:{name:'Root rune',description:'Anchor your next settled piece in place.',kind:'help'},
  shield:{name:'Star shield',description:'Block the next spell aimed at your tower.',kind:'help'},
  steady:{name:'Calm hands',description:'Slow your tower\'s wobble and falling speed for 10 seconds.',kind:'help'},
  gust:{name:'Sea gust',description:'Send a brief sideways gust at a rival tower.',kind:'trick'},
  heavy:{name:'Heavy charm',description:'Make a rival\'s next piece twice as heavy.',kind:'trick'},
  tilt:{name:'Crooked spell',description:'Give a rival\'s next released piece a slight tilt.',kind:'trick'},
});
export const TETRIS_LOOKS = Object.freeze({
  blocks:[{id:'gem',name:'Island gems'},{id:'wood',name:'Carved timber'},{id:'clay',name:'Glazed clay'},{id:'glass',name:'Sea glass',cost:180},{id:'cosmic',name:'Starlight crystal',cost:260},{id:'copper',name:'Clockwork copper',cost:220},{id:'frost',name:'Frosted quartz',cost:240}],
  robe:[{id:'scholar',name:'Island scholar'},{id:'traveler',name:'Wayfarer'},{id:'astral',name:'Constellation robes',cost:200},{id:'forest',name:'Fernweaver robes',cost:160}],
  hat:[{id:'pointed',name:'Wizard hat'},{id:'hood',name:'Soft hood'},{id:'none',name:'No headwear'},{id:'crown',name:'Crystal crown',cost:180}],
  wand:[{id:'oak',name:'Oak wand'},{id:'moon',name:'Moon staff'},{id:'crystal',name:'Prism staff',cost:180}],
  scene:[{id:'lagoon',name:'Golden lagoon'},{id:'dusk',name:'Evening islands'},{id:'aurora',name:'Aurora sea',cost:240}],
});
export const TETRIS_ITEMS = Object.freeze(Object.entries(TETRIS_LOOKS).flatMap(([setting,items])=>items.filter(i=>i.cost).map(i=>Object.freeze({id:`tetris:${setting}:${i.id}`,name:i.name,cost:i.cost,kind:'tetris',category:'isles',games:['tetris'],setting,value:i.id,description:`${i.name} for Tetris Isles. A cosmetic look only; weight, grip, powers, and rewards stay the same.`}))));
const hex=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value)?value:fallback;
const choose=(value,options,fallback)=>options.includes(value)?value:fallback;
export function normalizeMage(value={},owned=[],index=0) {
  const look={};for(const [key,items]of Object.entries(TETRIS_LOOKS))look[key]=items.some(i=>i.id===value?.[key]&&(!i.cost||owned.includes(`tetris:${key}:${i.id}`)))?value[key]:items[0].id;
  return {...look,name:typeof value?.name==='string'?value.name.replace(/[\x00-\x1f]/g,'').trim().slice(0,22)||`Player ${index+1}`:`Player ${index+1}`,
    skin:hex(value?.skin,'#d69b71'),hairColor:hex(value?.hairColor,'#593a32'),robeColor:hex(value?.robeColor,['#267e83','#a65a74','#695b9e','#b37d32'][index%4]),accent:hex(value?.accent,'#efd08a'),
    hair:choose(value?.hair,['short','long','curls','braids','bald'],'curls'),beard:choose(value?.beard,['none','short','long','moustache'],'none')};
}
export function readTetrisWardrobe(owned=[],storage=globalThis.localStorage) {
  let raw;try{raw=JSON.parse(storage?.getItem(TETRIS_STYLE_KEY));}catch{}
  return {selected:Math.max(0,Math.min(3,Number.isInteger(raw?.selected)?raw.selected:0)),players:Array.from({length:4},(_,i)=>normalizeMage(raw?.players?.[i],owned,i))};
}
export function writeTetrisWardrobe(value,owned=[],storage=globalThis.localStorage) {
  try{storage.setItem(TETRIS_STYLE_KEY,JSON.stringify({selected:Math.max(0,Math.min(3,value.selected||0)),players:Array.from({length:4},(_,i)=>normalizeMage(value.players?.[i],owned,i))}));return true;}catch{return false;}
}
export function normalizeTournament(rounds) {
  const valid=Array.isArray(rounds)?rounds.filter(r=>['race','puzzle','survival'].includes(r?.mode)).slice(0,9):[];
  return (valid.length?valid:[{mode:'race'},{mode:'puzzle'},{mode:'survival'}]).map(r=>({mode:r.mode,difficulty:tetrisLevel(r.difficulty).id}));
}
export const TETRIS_COIN_GUIDE='Classic pays 1 / 2 / 3 / 4 coins per cleared line on Easy / Medium / Hard / Expert, up to 40 per finished game. Island matches with one human against computers pay 1 coin per 5 retained pieces (up to 6), plus 6 / 10 / 16 / 24 for a win, using the lowest computer or course difficulty. Place at least 5 pieces manually and play for 20 seconds to qualify. Local multiplayer, solo island practice, and abandoned games earn no coins. Tournaments pay each completed round once. Shop items are visual only.';
export function tetrisRewardTotal(p={}) {
  if(p.finished!==true||!(p.seconds>=20)||!(p.manual>=5))return 0;
  const safe=n=>Number.isSafeInteger(n)&&n>0?n:0,level=tetrisLevel(p.difficulty);
  if(p.mode==='classic')return Math.min(40,safe(p.lines)*level.coin);
  if(!['race','puzzle','survival'].includes(p.mode)||p.humans!==1||!Array.isArray(p.bots)||!p.bots.length)return 0;
  const difficulty=Math.min(level.coin,...p.bots.map(id=>tetrisLevel(id).coin));
  return Math.min(30,Math.min(6,Math.floor(safe(p.retained)/5))+(p.won===true?[6,10,16,24][difficulty-1]:0));
}
