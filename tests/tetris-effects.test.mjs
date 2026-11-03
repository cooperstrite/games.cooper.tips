import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassic,clearClassicRows,classicAction,stepClassic,feedGorilla,gorillaRampage,GORILLA_WARNING_SECONDS,GORILLA_URGENT_SECONDS} from '../tetris-classic.js';
import {createTetrisAudio} from '../tetris-audio.js';

test('line animation keeps exact removed colors and independent pre-clear tiles while the real grid advances',()=>{
  const game=createClassic({seed:8});game.seconds=12;
  game.grid[19]=['I','J','L','O','S','T','Z','I','J','L'];
  game.grid[18][3]='T';game.grid[16][4]='Z';
  const before=game.grid.map(row=>[...row]);assert.equal(clearClassicRows(game),1);
  const effect=game.effects.at(-1);
  assert.equal(effect.kind,'lines');assert.equal(effect.count,1);assert.equal(effect.points,100);assert.equal(effect.time,12);
  assert.deepEqual(effect.rows,[19]);assert.deepEqual(effect.beforeGrid,before);
  assert.deepEqual(effect.cells,before[19].map((type,x)=>({x,y:19,type})));
  assert.deepEqual(effect.shifts,[{x:4,fromY:16,toY:17,type:'Z'},{x:3,fromY:18,toY:19,type:'T'}]);
  assert.equal(game.grid[19][3],'T');assert.equal(game.grid[18][3],null);assert.equal(game.grid[17][4],'Z');
  game.grid[17][4]='O';assert.equal(effect.beforeGrid[16][4],'Z');assert.equal(effect.shifts[0].type,'Z');
});

test('nonadjacent cleared rows animate each survivor by only the number of cleared rows below it',()=>{
  const game=createClassic();game.grid[17].fill('J');game.grid[19].fill('L');game.grid[18][2]='I';game.grid[16][7]='S';game.grid[3][1]='T';
  assert.equal(clearClassicRows(game),2);
  const effect=game.effects.at(-1);assert.equal(effect.cells.length,20);assert.equal(effect.points,300);
  assert.deepEqual(effect.shifts,[{x:1,fromY:3,toY:5,type:'T'},{x:7,fromY:16,toY:18,type:'S'},{x:2,fromY:18,toY:19,type:'I'}]);
  for(const tile of effect.shifts)assert.equal(game.grid[tile.toY][tile.x],tile.type);
  assert.ok(game.grid[0].every(tile=>tile===null)&&game.grid[1].every(tile=>tile===null));
});

test('multi-line effect points use the earned level once, and replaying the clear does not grant anything twice',()=>{
  const game=createClassic();game.level=2;game.lines=19;game.bananas=2;
  for(let y=16;y<20;y++)game.grid[y].fill('Z');assert.equal(clearClassicRows(game),4);
  const effect=game.effects.at(-1);assert.equal(effect.count,4);assert.equal(effect.cells.length,40);assert.equal(effect.points,1600);
  assert.equal(game.score,1600);assert.equal(game.level,3);assert.equal(game.bananas,4);
  const effects=game.effects.length,events=game.events.length;assert.equal(clearClassicRows(game),0);
  assert.equal(game.score,1600);assert.equal(game.bananas,4);assert.equal(game.effects.length,effects);assert.equal(game.events.length,events);
});

test('hard-drop and lock effects describe the actual falling piece without adding a second lock',()=>{
  const game=createClassic({seed:62}),piece={...game.active};classicAction(game,'right');piece.x++;
  assert.equal(classicAction(game,'drop'),true);
  const drop=game.effects.find(effect=>effect.kind==='drop'),land=game.effects.find(effect=>effect.kind==='lock');
  assert.equal(drop.x,piece.x);assert.equal(drop.type,piece.type);assert.equal(drop.fromY,piece.y);assert.ok(drop.toY>drop.fromY);
  assert.equal(land.cells.length,4);for(const tile of land.cells)assert.equal(game.grid[tile.y][tile.x],tile.type);
  assert.equal(game.placed,1);assert.equal(game.manual,1);
});

test('gorilla warnings occur once per threshold and feeding rearms the countdown',()=>{
  const game=createClassic({gorilla:true});game.events.length=0;game.hunger=GORILLA_WARNING_SECONDS+.01;
  stepClassic(game,.02);stepClassic(game,.02);assert.deepEqual(game.events.map(event=>event.type),['hungry']);
  game.hunger=GORILLA_URGENT_SECONDS+.01;stepClassic(game,.02);stepClassic(game,.02);
  assert.deepEqual(game.events.map(event=>event.type),['hungry','urgent']);assert.equal(game.effects.at(-1).level,'urgent');
  assert.equal(feedGorilla(game),true);assert.ok(game.hunger>GORILLA_WARNING_SECONDS);assert.equal(game.hungerCue,0);
  game.hunger=GORILLA_WARNING_SECONDS+.01;stepClassic(game,.02);
  assert.deepEqual(game.events.map(event=>event.type),['hungry','urgent','banana','hungry']);
});

test('an empty banana supply still warns, cannot be fed, and rearms after a rampage',()=>{
  const game=createClassic({gorilla:true});game.bananas=0;game.hunger=7;stepClassic(game,.02);
  assert.equal(game.events.at(-1).type,'urgent');assert.equal(game.events.at(-1).bananas,0);assert.equal(feedGorilla(game),false);
  gorillaRampage(game);assert.equal(game.hungerCue,0);assert.ok(game.hunger>GORILLA_WARNING_SECONDS);
  game.hunger=15;stepClassic(game,.02);assert.equal(game.events.at(-1).type,'hungry');
  const normal=createClassic();normal.hunger=7;stepClassic(normal,.02);assert.equal(normal.events.some(event=>['hungry','urgent','smash'].includes(event.type)),false);
});

function fakeAudioWindow(){
  const contexts=[];
  const parameter=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
  class AudioContext {
    constructor(){this.state='running';this.currentTime=1;this.destination={};this.oscillators=[];this.suspends=0;this.closes=0;contexts.push(this);}
    createGain(){return {gain:parameter(),connect(){},disconnect(){}};}
    createOscillator(){const oscillator={frequency:parameter(),connect(){},disconnect(){this.disconnected=true;},start(time){this.starts=[time];},stop(time){(this.stops||=[]).push(time);}};this.oscillators.push(oscillator);return oscillator;}
    async resume(){this.state='running';}
    async suspend(){this.suspends++;this.state='suspended';}
    async close(){this.closes++;this.state='closed';}
  }
  return {window:{AudioContext},contexts};
}

test('line, spell-ready, and hunger sounds are distinct; muting and pausing stop queued cues',async()=>{
  const original=globalThis.window,fake=fakeAudioWindow();globalThis.window=fake.window;
  try {
    const audio=createTetrisAudio();await audio.start();const context=fake.contexts[0];
    const count=()=>context.oscillators.length;
    audio.play({type:'clear',count:1});const single=count();audio.pause();assert.ok(context.oscillators.every(voice=>voice.stops.at(-1)===undefined&&voice.disconnected));
    await audio.resume();audio.play({type:'clear',count:4});assert.ok(count()-single>single);
    const beforeReady=count();audio.play('power');const ready=count()-beforeReady;audio.play('hungry');const hungry=count()-beforeReady-ready;audio.play('urgent');const urgent=count()-beforeReady-ready-hungry;
    assert.ok(ready>hungry);assert.ok(urgent>hungry);assert.ok(hungry>0);
    audio.setEnabled(false);const muted=count();audio.play('power');assert.equal(count(),muted);assert.equal(audio.enabled,false);
    audio.pause();audio.setEnabled(true);audio.play('power');assert.equal(count(),muted);
    await audio.resume();audio.play('banana');assert.ok(count()>muted);
    audio.dispose();audio.dispose();assert.equal(context.closes,1);const closed=count();audio.play('win');await audio.start();assert.equal(count(),closed);
  }finally{if(original===undefined)delete globalThis.window;else globalThis.window=original;}
});

test('starting a muted match permits sound to be enabled later without replaying old cues',async()=>{
  const original=globalThis.window,fake=fakeAudioWindow();globalThis.window=fake.window;
  try {
    const audio=createTetrisAudio(false);audio.pause();await audio.start();audio.play('clear');assert.equal(fake.contexts.length,0);
    audio.setEnabled(true);audio.play('power');assert.equal(fake.contexts.length,1);assert.ok(fake.contexts[0].oscillators.length>0);audio.dispose();
  }finally{if(original===undefined)delete globalThis.window;else globalThis.window=original;}
});
