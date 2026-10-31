import test from 'node:test';
import assert from 'node:assert/strict';
import {createMuseumAudio,readMuseumAudio,saveMuseumAudio,MUSEUM_AUDIO_DEFAULTS} from '../museum-audio.js';

function fixture(t,options={}){
  const sources=[],devices=[],timers=new Map();let timerId=0;
  t.mock.method(globalThis,'setInterval',callback=>{timers.set(++timerId,callback);return timerId;});
  t.mock.method(globalThis,'clearInterval',id=>timers.delete(id));
  const param=()=>({value:0,setTargetAtTime(value){this.value=value;},cancelScheduledValues(){}});
  const node=()=>({connections:[],connect(other){this.connections.push(other);return other;},disconnect(){this.disconnected=true;},gain:param(),pan:param()});
  class Device{
    constructor(){this.currentTime=0;this.sampleRate=8000;this.destination={};this.state='running';devices.push(this);}
    createGain(){return node();}createStereoPanner(){return node();}createConvolver(){return node();}
    createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};}
    createBuffer(channels,length,rate){const data=new Float32Array(length);return {length,duration:length/rate,getChannelData:()=>data};}
    createBufferSource(){const source={...node(),start(time){this.started=time;sources.push(this);},stop(){this.stopped=true;this.onended?.();}};return source;}
    resume(){return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
  }
  const audio=createMuseumAudio({...MUSEUM_AUDIO_DEFAULTS,...options},Device);
  t.after(()=>audio.dispose());
  const advance=seconds=>{const end=devices[0].currentTime+seconds;while(devices[0].currentTime<end){devices[0].currentTime=Math.min(end,devices[0].currentTime+.1);for(const callback of timers.values())callback();}};
  const bus=source=>source.connections[0].connections[0].connections[0];
  return {audio,sources,devices,timers,advance,bus};
}

test('museum mix preferences preserve independent volumes and tolerate blocked or damaged storage',()=>{
  let data=null;const storage={getItem:()=>data,setItem:(key,value)=>{data=value;}};
  assert.deepEqual(readMuseumAudio(storage),MUSEUM_AUDIO_DEFAULTS);
  saveMuseumAudio({enabled:false,footsteps:.35,music:0},storage);
  assert.deepEqual(readMuseumAudio(storage),{enabled:false,footsteps:.35,music:0});
  data='{"footsteps":100,"music":-1}';assert.deepEqual(readMuseumAudio(storage),{enabled:true,footsteps:1,music:0});
  data='{"footsteps":"loud","music":null}';assert.deepEqual(readMuseumAudio(storage),MUSEUM_AUDIO_DEFAULTS);
  data='broken';assert.deepEqual(readMuseumAudio(storage),MUSEUM_AUDIO_DEFAULTS);
  const blocked={getItem(){throw Error('Blocked');},setItem(){throw Error('Blocked');}};
  assert.deepEqual(readMuseumAudio(blocked),MUSEUM_AUDIO_DEFAULTS);assert.doesNotThrow(()=>saveMuseumAudio({},blocked));
});

test('walking has audible varied surface sounds, follows pace, and stays silent when still',t=>{
  const {audio,sources,devices,advance}=fixture(t,{music:0});
  audio.step(2.25,false);assert.equal(devices.length,0,'no audio before a gesture');
  audio.start();audio.step(0,false);assert.equal(sources.length,0);
  audio.step(2.25,false);const first=sources[0].buffer;assert.equal(sources.length,2,'one step and a quiet stone echo');
  const data=first.getChannelData(0);assert.ok(data.every(Number.isFinite));assert.ok(Math.max(...data)>.3,'clear heel contact');
  advance(.2);audio.step(2.25,false);assert.equal(sources.length,2,'no machine-gun steps');
  advance(.35);audio.step(2.25,true);assert.equal(sources.length,3,'carpet has no hard echo');
  const carpet=sources.at(-1).buffer.getChannelData(0),energy=a=>a.reduce((sum,n)=>sum+n*n,0);
  assert.ok(energy(carpet)<energy(data),'rugs soften the contact');
  advance(.3);audio.step(4.5,false);assert.equal(sources.length,5,'brisk movement has a quicker cadence');
  assert.notDeepEqual(sources.at(-1).buffer.getChannelData(0),data,'consecutive contacts vary');
});

test('walking and music sliders affect separate channels and zero fully mutes each part',t=>{
  const {audio,sources,advance,bus}=fixture(t);audio.start();const music=sources[0],musicLevel=bus(music).gain.value;
  audio.step(2.25,false);const step=sources.find(s=>s.buffer.duration<.4),walkingBus=bus(step);
  assert.notEqual(walkingBus,bus(music));audio.setVolume('footsteps',.3);
  assert.equal(bus(music).gain.value,musicLevel);assert.ok(walkingBus.gain.value<.2);
  audio.setVolume('footsteps',0);assert.equal(walkingBus.gain.value,0);assert.equal(step.stopped,true);assert.notEqual(music.stopped,true);
  const steps=sources.filter(s=>s.buffer.duration<.4).length;advance(1);audio.step(4,false);assert.equal(sources.filter(s=>s.buffer.duration<.4).length,steps);
  audio.setVolume('music',0);assert.equal(bus(music).gain.value,0);assert.equal(music.stopped,true);
  audio.setVolume('footsteps',.8);advance(1);audio.step(2.25,false);assert.ok(sources.length>steps);
  const count=sources.length;advance(5);assert.equal(sources.length,count,'music stays off while footsteps remain available');
});

test('pause, mute, restart, and disposal cancel the score without duplicate schedulers or catch-up bursts',t=>{
  const {audio,sources,devices,timers,advance}=fixture(t);audio.start();audio.start();assert.equal(timers.size,1);
  advance(.9);assert.ok(sources.length>6,'the composition advances');
  audio.pause();assert.equal(timers.size,0);assert.ok(sources.every(s=>s.stopped));const paused=sources.length;
  advance(120);audio.step(3,false);audio.clue();assert.equal(sources.length,paused);
  audio.start();assert.equal(timers.size,1);assert.ok(sources.length-paused<=6,'resume does not replay missed notes');
  audio.setEnabled(false);assert.equal(timers.size,0);const muted=sources.length;advance(2);audio.win();assert.equal(sources.length,muted);
  audio.setEnabled(true);assert.equal(timers.size,1);audio.dispose();assert.equal(timers.size,0);assert.equal(devices[0].state,'closed');
  const disposed=sources.length;audio.start();audio.setEnabled(true);audio.step(3,false);assert.equal(sources.length,disposed);assert.equal(devices.length,1);
});

test('audio remains optional when disabled or unavailable',t=>{
  const {audio,devices}=fixture(t,{enabled:false});audio.start();assert.equal(devices.length,0);
  for(const Audio of [null,class{constructor(){throw Error('No device');}}]){const absent=createMuseumAudio({},Audio);assert.doesNotThrow(()=>{absent.start();absent.step(2,false);absent.clue();absent.win();absent.pause();absent.dispose();});}
});
