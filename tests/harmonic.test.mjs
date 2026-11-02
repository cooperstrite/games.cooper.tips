import test from 'node:test';
import assert from 'node:assert/strict';
import {ECHO_INSTRUMENTS,ECHO_MODES,readEchoProgress,createEcho,startEcho,pressEcho,stepEcho,pauseEcho,resumeEcho,reviewEcho,recordEcho} from '../harmonic-engine.js';
import {createEchoAudio,echoRoomImpulse,scheduleEchoVoice} from '../harmonic-audio.js';
import {ECHO_DEFAULT_LINEUP,ECHO_ITEMS,ECHO_WARDROBE_KEY,normalizeEchoLineup,swapEchoInstrument,readEchoSettings,writeEchoSettings,echoRewardTotal,echoCoinGuide} from '../harmonic-config.js';
import {createRewardSession} from '../arcade/game-services.js';
import {createArcadeWallet} from '../arcade/wallet.js';
import {STUDIO_GAMES} from '../arcade/games.js';
import {charactersForGame} from '../arcade/characters.js';

function advance(s,seconds){const events=[];for(let i=0;i<Math.ceil(seconds*120);i++)events.push(...stepEcho(s,1/120));return events;}
function until(s,phase){const events=[];for(let i=0;i<20000&&s.phase!==phase;i++)events.push(...stepEcho(s,1/120));assert.equal(s.phase,phase);return events;}
function complete(s){startEcho(s);while(s.phase!=='won'){until(s,'input');for(const id of s.sequence)pressEcho(s,id);}return s;}

test('three original difficulty targets and expanding Hard ensemble are preserved',()=>{
  assert.deepEqual(Object.values(ECHO_MODES).map(m=>[m.voices,m.target]),[[3,12],[4,20],[5,15]]);
  assert.equal(createEcho().voices,4);assert.equal(createEcho({mode:'easy',unlocked:2}).voices,3);
  assert.equal(createEcho({mode:'hard',unlocked:1}).voices,6);assert.equal(createEcho({mode:'hard',unlocked:100}).voices,7);
  assert.equal(createEcho({mode:'invalid'}).mode,'normal');
  assert.equal(new Set(ECHO_INSTRUMENTS.map(i=>i.frequency)).size,7);
});

test('input opens only after the last note has played for a full beat and release',()=>{
  for(const mode of Object.keys(ECHO_MODES)){
    const s=createEcho({mode,random:()=>0});startEcho(s);
    assert.equal(pressEcho(s,'marimba').accepted,false);
    const first=until(s,'listen');assert.equal(first.filter(e=>e.type==='note').length,1);
    assert.equal(pressEcho(s,'marimba').accepted,false);
    advance(s,ECHO_MODES[mode].noteLength+.38);assert.equal(s.phase,'listen','room for the slowest instrument release');
    until(s,'input');assert.equal(s.input,0);assert.equal(pressEcho(s,'marimba').correct,true);
  }
});

test('a round appends exactly one note and repeated instruments are separate beats',()=>{
  const s=createEcho({random:()=>0});startEcho(s);until(s,'input');pressEcho(s,'marimba');
  assert.equal(s.phase,'between');assert.equal(s.completed,1);assert.equal(pressEcho(s,'marimba').accepted,false);
  const events=until(s,'input');assert.deepEqual(s.sequence,['marimba','marimba']);
  assert.deepEqual(events.filter(e=>e.type==='note').map(e=>[e.id,e.index]),[['marimba',0],['marimba',1]]);
  pressEcho(s,'marimba');assert.equal(s.phase,'input');assert.equal(s.input,1);
  pressEcho(s,'marimba');assert.equal(s.phase,'between');assert.equal(s.completed,2);
});

test('wrong notes preserve the melody and report the exact error; unavailable voices do not count',()=>{
  const s=createEcho({mode:'easy',random:()=>0});startEcho(s);until(s,'input');
  assert.equal(pressEcho(s,'strings').accepted,false);assert.equal(pressEcho(s,'unknown').accepted,false);assert.equal(s.phase,'input');
  const result=pressEcho(s,'harp');assert.deepEqual(result,{accepted:true,correct:false,finished:true});
  assert.equal(s.phase,'lost');assert.deepEqual(s.mistake,{index:0,expected:'marimba',played:'harp'});assert.deepEqual(s.sequence,['marimba']);assert.equal(s.completed,0);
  advance(s,10);assert.equal(s.phase,'lost');assert.equal(pressEcho(s,'marimba').accepted,false);
});

test('all modes can be completed by following the emitted sequence',()=>{
  for(const mode of Object.keys(ECHO_MODES))for(const unlocked of [0,2]){
    let n=0;const s=createEcho({mode,unlocked,random:()=>((n++*3)%7)/7});startEcho(s);
    while(s.phase!=='won'){
      const events=until(s,'input'),heard=events.filter(e=>e.type==='note').map(e=>e.id);
      assert.deepEqual(heard,s.sequence);
      for(const id of heard)assert.equal(pressEcho(s,id).correct,true);
    }
    assert.equal(s.completed,ECHO_MODES[mode].target);assert.equal(s.sequence.length,ECHO_MODES[mode].target);
  }
});

test('pause freezes playback and input; resuming restarts the current melody without changing progress',()=>{
  const s=createEcho({random:()=>0});startEcho(s);until(s,'input');pressEcho(s,'marimba');until(s,'input');pressEcho(s,'marimba');
  assert.equal(s.input,1);assert.equal(pauseEcho(s),true);const before=s.phaseTime;
  advance(s,60);assert.equal(s.phaseTime,before);assert.equal(pressEcho(s,'marimba').accepted,false);
  assert.equal(resumeEcho(s),true);assert.equal(s.phase,'ready');assert.equal(s.input,0);assert.equal(s.completed,1);assert.equal(s.sequence.length,2);
  assert.deepEqual(until(s,'input').filter(e=>e.type==='note').map(e=>e.id),['marimba','marimba']);
  for(const id of s.sequence)pressEcho(s,id);pauseEcho(s);advance(s,5);resumeEcho(s);assert.equal(s.phase,'between');until(s,'input');assert.equal(s.sequence.length,3);
});

test('replays do not start another round or award another win',()=>{
  const s=complete(createEcho({mode:'hard',random:()=>0}));let progress=recordEcho(readEchoProgress(),s);
  assert.equal(progress.wins.hard,1);assert.equal(progress.unlocked,1);assert.equal(reviewEcho(s),true);
  assert.equal(pressEcho(s,'marimba').accepted,false);pauseEcho(s);resumeEcho(s);assert.equal(s.phase,'review');
  const events=until(s,'won');assert.equal(events.filter(e=>e.type==='note').length,15);
  progress=recordEcho(progress,s);assert.equal(progress.wins.hard,1);assert.equal(progress.unlocked,1);
  assert.equal(createEcho({mode:'hard',unlocked:progress.unlocked}).voices,6);
  const next=complete(createEcho({mode:'hard',unlocked:progress.unlocked,random:()=>.99}));progress=recordEcho(progress,next);assert.equal(progress.wins.hard,2);assert.equal(progress.unlocked,2);
  assert.equal(createEcho({mode:'hard',unlocked:progress.unlocked}).voices,7);
});

test('failed replay returns to the same result and best scores remain separate by difficulty',()=>{
  const s=createEcho({mode:'easy',random:()=>0});startEcho(s);until(s,'input');pressEcho(s,'marimba');until(s,'input');pressEcho(s,'bell');
  const mistake={...s.mistake},progress=recordEcho(readEchoProgress(),s);assert.equal(progress.best.easy,1);assert.equal(progress.best.normal,0);assert.equal(progress.wins.easy,0);
  reviewEcho(s);until(s,'lost');assert.deepEqual(s.mistake,mistake);assert.equal(s.completed,1);assert.equal(s.sequence.length,2);
});

test('saved progress and inputs are validated, and frame stalls never bunch the sequence',()=>{
  assert.deepEqual(readEchoProgress('{broken'),readEchoProgress());
  const data=readEchoProgress({mode:'other',sound:false,volume:9,best:{easy:100,normal:-3,hard:'12'},wins:{hard:4}});
  assert.equal(data.mode,'normal');assert.equal(data.sound,false);assert.equal(data.volume,1);assert.deepEqual(data.best,{easy:30,normal:0,hard:12});assert.equal(data.unlocked,2);
  assert.equal(readEchoProgress({volume:'loud'}).volume,.65);assert.equal(readEchoProgress({unlocked:2}).unlocked,0);
  const s=createEcho({random:()=>NaN});startEcho(s);until(s,'input');pressEcho(s,s.sequence[0]);until(s,'listen');
  const now=s.phaseTime;assert.equal(stepEcho(s,20).filter(e=>e.type==='note').length,0);assert.ok(s.phaseTime-now<=.121);
  const stable=s.phaseTime;stepEcho(s,NaN);stepEcho(s,-3);assert.equal(s.phaseTime,stable);
});

test('chosen run lengths end at the selected round and keep difficulty unchanged',()=>{
  for(const mode of Object.keys(ECHO_MODES))for(const target of [3,8,23,30]){
    const s=complete(createEcho({mode,target,random:()=>.24}));
    assert.equal(s.phase,'won');assert.equal(s.completed,target);assert.equal(s.sequence.length,target);assert.equal(s.voices,ECHO_MODES[mode].voices);
  }
  for(const target of [0,2,31,3.5,NaN,'8',Infinity])assert.equal(createEcho({mode:'easy',target}).target,12);
  assert.equal(createEcho({mode:'hard',targets:{hard:7}}).target,7);
});

test('per-length records and preferences preserve original records without mixing short and long runs',()=>{
  const original=readEchoProgress({best:{normal:16,hard:5},targets:{easy:3,normal:99,hard:NaN}});
  assert.equal(original.bestByTarget.normal[20],16);assert.equal(original.bestByTarget.normal[3],0);
  assert.deepEqual(original.targets,{easy:3,normal:20,hard:15});
  const s=complete(createEcho({mode:'normal',target:3,random:()=>0}));const next=recordEcho(original,s);
  assert.equal(next.bestByTarget.normal[3],3);assert.equal(next.bestByTarget.normal[20],16);assert.equal(next.best.normal,16);
  assert.equal(next.bestByTarget.easy[3],0);assert.equal(next.wins.normal,1);
  assert.deepEqual(readEchoProgress(JSON.stringify(next)),next);
});

test('locked or malformed instrument choices fall back to seven unique included instruments',()=>{
  assert.deepEqual(normalizeEchoLineup(['guitar','handpan','musicbox','celesta']),ECHO_DEFAULT_LINEUP);
  for(const value of [null,{},'guitar',['guitar','guitar','bad','piano',null,'strings','strings']]){
    const ids=normalizeEchoLineup(value,['harmonic:guitar']);assert.equal(ids.length,7);assert.equal(new Set(ids).size,7);
    assert.ok(ids.every(id=>ECHO_DEFAULT_LINEUP.includes(id)||id==='guitar'));
  }
  const changed=swapEchoInstrument(ECHO_DEFAULT_LINEUP,1,'marimba');assert.equal(changed[0],'harp');assert.equal(changed[1],'marimba');
  assert.deepEqual(swapEchoInstrument(ECHO_DEFAULT_LINEUP,2,'guitar'),ECHO_DEFAULT_LINEUP);
  assert.deepEqual(swapEchoInstrument(ECHO_DEFAULT_LINEUP,7,'marimba'),ECHO_DEFAULT_LINEUP);
  const paid=swapEchoInstrument(ECHO_DEFAULT_LINEUP,0,'guitar',['harmonic:guitar']);assert.equal(paid[0],'guitar');assert.equal(new Set(paid).size,7);
});

test('instrument arrangements save, reject unowned choices on load, and drive the real game sequence',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},owned=ECHO_ITEMS.map(i=>i.id);
  const lineup=['guitar','handpan','musicbox','celesta','kalimba','glass','strings'];
  assert.equal(writeEchoSettings({lineup},storage),true);assert.ok(data.has(ECHO_WARDROBE_KEY));
  assert.deepEqual(readEchoSettings(owned,storage).lineup,lineup);assert.deepEqual(readEchoSettings([],storage).lineup,ECHO_DEFAULT_LINEUP);
  const s=createEcho({mode:'normal',target:3,lineup,random:()=>0});startEcho(s);until(s,'input');
  assert.equal(s.sequence[0],'guitar');assert.equal(pressEcho(s,'marimba').accepted,false);assert.equal(pressEcho(s,'guitar').correct,true);
  assert.equal(writeEchoSettings({lineup},{setItem(){throw Error('blocked');}}),false);
});

test('coin rates use completed melodies, chosen length, difficulty and a real end result',()=>{
  for(const [mode,rate] of [['easy',1],['normal',2],['hard',3]]){
    assert.equal(echoRewardTotal({mode,target:8,completed:8,phase:'won'}),16*rate);
    assert.equal(echoRewardTotal({mode,target:8,completed:5,phase:'lost'}),5*rate);
    for(const phase of ['idle','ready','input','between','review'])assert.equal(echoRewardTotal({mode,target:8,completed:5,phase}),0);
    assert.equal(echoRewardTotal({mode,target:8,completed:7,phase:'won'}),0);
    assert.equal(echoRewardTotal({mode,target:8,completed:8,phase:'lost'}),0);
    assert.match(echoCoinGuide(mode,8),new RegExp(`Full run: ${16*rate} coins`));
  }
  for(const p of [{mode:'other',target:8,completed:8,phase:'won'},{mode:'easy',target:2,completed:2,phase:'won'},{mode:'hard',target:8,completed:8.5,phase:'lost'}])assert.equal(echoRewardTotal(p),0);
});

test('replaying an awarded run cannot pay twice and shared coins buy permanent instruments',async()=>{
  const wallet=createArcadeWallet(),session=createRewardSession('harmonic',wallet),s=complete(createEcho({mode:'hard',target:3,random:()=>0}));
  assert.equal((await session.award(s)).coins,18);assert.equal((await session.award(s)).coins,0);
  reviewEcho(s);assert.equal((await session.award(s)).coins,0);until(s,'won');assert.equal((await session.award(s)).coins,0);
  assert.equal(wallet.getState().coins,18);assert.equal((await wallet.purchase('harmonic:guitar')).ok,false);
  await wallet.claim('archery','earlier-arcade-play',302);const purchase=await wallet.purchase('harmonic:guitar');assert.equal(purchase.ok,true);assert.equal(wallet.getState().coins,0);
  assert.equal((await wallet.purchase('harmonic:guitar')).purchased,false);assert.deepEqual(wallet.getState().owned,['harmonic:guitar']);
  assert.equal(STUDIO_GAMES.harmonic.name,'Harmonic Echo');assert.deepEqual(charactersForGame('harmonic'),[],'instrument studio does not introduce incompatible characters');wallet.dispose();
});

// Audio graph fixture checks cleanup and scheduled envelopes without requiring
// an audio device. Real rendered waveforms are also checked in the browser.
function audioFixture(t){
  const devices=[];
  const param=()=>({value:0,events:[],setValueAtTime(value,time){this.value=value;this.events.push([time,value]);},linearRampToValueAtTime(value,time){this.events.push([time,value]);},exponentialRampToValueAtTime(value,time){assert.ok(value>0);this.events.push([time,value]);},setTargetAtTime(value){this.value=value;},cancelScheduledValues(){}});
  const node=()=>({connections:[],connect(n){this.connections.push(n);return n;},disconnect(n){this.connections=n?this.connections.filter(v=>v!==n):[];}});
  class Audio {
    constructor(){this.currentTime=0;this.state='running';this.sampleRate=8000;this.destination={};this.sources=[];this.gains=[];devices.push(this);}
    createGain(){const n={...node(),gain:param()};this.gains.push(n);return n;}
    createBiquadFilter(){return {...node(),frequency:param(),Q:param()};}createStereoPanner(){return {...node(),pan:param()};}createConvolver(){return node();}
    createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};}
    createAnalyser(){return {...node(),getFloatTimeDomainData(a){a.fill(.1);}};}
    createBuffer(channels,length,rate){const data=Array.from({length:channels},()=>new Float32Array(length));return {length,duration:length/rate,numberOfChannels:channels,getChannelData:i=>data[i]};}
    source(){const ctx=this,n={...node(),frequency:param(),detune:param(),start(time){this.startTime=time;this.stopTime??=this.buffer?time+this.buffer.duration:Infinity;ctx.sources.push(this);},stop(time=ctx.currentTime){this.stopTime=time;},finish(){if(this.ended)return;this.ended=true;this.onended?.();}};return n;}
    createOscillator(){return this.source();}createBufferSource(){return this.source();}
    resume(){this.state='running';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
    advance(seconds){this.currentTime+=seconds;for(const s of this.sources)if(s.stopTime<=this.currentTime)s.finish();}
  }
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');Object.defineProperty(globalThis,'AudioContext',{value:Audio,writable:true,configurable:true});
  t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'AudioContext',descriptor);else delete globalThis.AudioContext;});return {devices,Audio};
}

test('instrument envelopes have smooth attacks, damped partials and silent releases',t=>{
  const {Audio}=audioFixture(t);
  for(const instrument of ECHO_INSTRUMENTS){
    const c=new Audio(),ended=[];const voice=scheduleEchoVoice(c,c.destination,instrument.id,{onEnded:()=>ended.push(true)});
    assert.ok(c.sources.length>=3);assert.equal(c.sources[0].frequency.value,instrument.frequency);
    for(const gain of c.gains.filter(g=>g.gain.events.length>2)){
      const events=gain.gain.events;assert.equal(events[0][1],0);assert.equal(events.at(-1)[1],0);
      assert.ok(events.every((e,i)=>!i||e[0]>=events[i-1][0]),'envelope time is ordered');
    }
    c.advance(2);assert.equal(voice.ended,true);assert.equal(ended.length,1);assert.ok(c.sources.every(s=>!s.connections.length));
  }
});

test('room reflections are finite, stereo and decay into silence',t=>{
  const {Audio}=audioFixture(t),buffer=echoRoomImpulse(new Audio());assert.equal(buffer.numberOfChannels,2);
  const a=buffer.getChannelData(0),b=buffer.getChannelData(1);assert.notDeepEqual(a,b);assert.ok(a.every(Number.isFinite));
  const rms=v=>Math.sqrt(v.reduce((n,x)=>n+x*x,0)/v.length);assert.ok(rms(a.slice(-800))<rms(a.slice(0,800))*.01);
});

test('replacing an instrument preserves the chosen pad pitch',t=>{
  const {Audio}=audioFixture(t);
  for(const id of ['marimba','guitar','handpan','musicbox','celesta']){
    const context=new Audio();scheduleEchoVoice(context,context.destination,id,{frequency:587.3295});
    assert.equal(context.sources[0].frequency.value,587.3295);context.advance(2);
  }
});

test('mute, zero volume, pause and disposal stop voices and keep audio optional',async t=>{
  const {devices}=audioFixture(t),audio=createEchoAudio({enabled:false});
  await audio.start();assert.equal(devices.length,0);assert.equal(audio.play('harp'),false);
  audio.setEnabled(true);await audio.start();assert.equal(devices.length,1);audio.play('harp');audio.play('piano');assert.equal(audio.activeVoices,2);
  audio.setVolume(0);assert.equal(audio.play('bell'),false);const waveform=new Float32Array(32);audio.waveform(waveform);assert.ok(waveform.every(x=>x===0));
  audio.setVolume(.7);audio.stop();devices[0].advance(.1);assert.equal(audio.activeVoices,0);assert.ok(devices[0].sources.every(s=>s.ended));
  audio.play('bell');audio.setEnabled(false);devices[0].advance(.1);assert.equal(audio.activeVoices,0);
  audio.dispose();audio.setEnabled(true);assert.equal(audio.play('marimba'),false);assert.equal(devices[0].state,'closed');
});

test('rapid taps are bounded and device failure does not break the game',async t=>{
  const {devices}=audioFixture(t),audio=createEchoAudio();for(let i=0;i<50;i++)audio.play('marimba');assert.ok(audio.activeVoices<=16);
  devices[0].advance(3);assert.equal(audio.activeVoices,0);audio.dispose();
  globalThis.AudioContext=class{constructor(){throw Error('Device unavailable');}};const absent=createEchoAudio();assert.equal(await absent.start(),false);assert.equal(absent.play('harp'),false);assert.doesNotThrow(()=>absent.dispose());
});
