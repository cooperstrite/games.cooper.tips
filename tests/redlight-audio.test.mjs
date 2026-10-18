import test from "node:test";
import assert from "node:assert/strict";
import { createRedlightAudio, readRedlightSound, saveRedlightSound } from "../redlight-audio.js";
import { RedlightRace } from "../redlight-engine.js";

function audioDevice() {
  const started=[],devices=[];
  const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});
  const node=()=>({connect(){},disconnect(){this.disconnected=true;},gain:parameter(),frequency:parameter()});
  class Device {
    constructor(){this.currentTime=0;this.state="running";this.sampleRate=8000;this.destination={};devices.push(this);}
    createGain(){return node();}
    createBiquadFilter(){return node();}
    createBuffer(channels,length){return{getChannelData:()=>new Float32Array(length)};}
    createOscillator(){return this.source("tone");}
    createBufferSource(){return this.source("step");}
    source(kind){return{...node(),kind,start(){started.push(this);},stop(time){if(time===undefined)this.cancelled=true;}};}
    resume(){return Promise.resolve();}
    close(){this.state="closed";return Promise.resolve();}
  }
  return {Device,started,devices};
}
function fixture(enabled=true){const device=audioDevice(),audio=createRedlightAudio(enabled,device.Device),race=new RedlightRace({random:()=>.5});audio.update(race);return{...device,audio,race};}

test("audio starts on a gesture and cues fire once for countdown and signal changes",()=>{
  const {audio,race,started,devices}=fixture();assert.equal(devices.length,0);
  audio.unlock();race.start();audio.update(race);assert.equal(devices.length,1);assert.equal(started.length,1);
  for(let i=0;i<20;i++)audio.update(race);assert.equal(started.length,1);
  race.step(1);audio.update(race);race.step(1);audio.update(race);assert.equal(started.length,3);
  race.step(1);audio.update(race);const green=started.length;assert.ok(green>3);
  race.step(2);audio.update(race);const amber=started.length;assert.ok(amber>green);
  race.step(.1);audio.update(race);assert.equal(started.length,amber);
  race.step(.4);audio.update(race);assert.ok(started.length>amber);audio.dispose();
});
test("footsteps track movement and stop immediately on release and pause",()=>{
  const {audio,race,started}=fixture();audio.unlock();race.start();race.step(3);audio.update(race);
  race.hold(true);audio.update(race);race.step(.26);audio.update(race);
  const steps=started.filter(voice=>voice.kind==="step");assert.equal(steps.length,2);
  race.hold(false);audio.update(race);assert.ok(steps.every(voice=>voice.cancelled&&voice.disconnected));
  const count=started.length;race.step(.3);audio.update(race);assert.equal(started.length,count);
  race.pause();audio.update(race);assert.ok(started.every(voice=>voice.cancelled));
  race.step(10);audio.update(race);race.resume();audio.update(race);assert.equal(started.length,count);audio.dispose();
});
test("mute cancels scheduled effects and re-enabling cannot replay a finish fanfare",()=>{
  const {audio,race,started}=fixture();audio.unlock();race.start();audio.update(race);audio.setEnabled(false);
  assert.ok(started.every(voice=>voice.cancelled));const count=started.length;
  race.step(3);audio.update(race);race.phase="finished";audio.update(race);assert.equal(started.length,count);
  audio.setEnabled(true);audio.update(race);assert.equal(started.length,count);
  race.start();audio.update(race);assert.ok(started.length>count);audio.dispose();
});
test("end cues are distinct, reset cancels them, and disposal closes the audio device",()=>{
  const {audio,race,started,devices}=fixture();audio.unlock();race.start();race.step(3);audio.update(race);
  race.step(2.5);race.hold(true);audio.update(race);const caught=started.length;
  audio.update(race);assert.equal(started.length,caught);race.reset();audio.update(race);assert.ok(started.every(voice=>voice.cancelled));
  race.phase="finished";audio.update(race);assert.ok(started.length>caught);
  audio.dispose();assert.equal(devices[0].state,"closed");assert.ok(started.every(voice=>voice.disconnected));
  const count=started.length;audio.unlock();audio.setEnabled(true);race.start();audio.update(race);assert.equal(started.length,count);audio.dispose();
});
test("disabled or unavailable audio is optional and preference storage tolerates failures",()=>{
  const {audio,race,devices}=fixture(false);audio.unlock();race.start();audio.update(race);assert.equal(devices.length,0);audio.dispose();
  const absent=createRedlightAudio(true,null);assert.equal(absent.supported,false);absent.unlock();absent.update(race);absent.dispose();
  const broken=createRedlightAudio(true,class{constructor(){throw Error("No device");}});assert.doesNotThrow(()=>{broken.unlock();broken.update(race);broken.dispose();});
  let saved;const storage={getItem:()=>saved,setItem:(key,value)=>{saved=value;}};
  assert.equal(readRedlightSound(storage),true);saveRedlightSound(false,storage);assert.equal(readRedlightSound(storage),false);saveRedlightSound(true,storage);assert.equal(readRedlightSound(storage),true);
  saved="corrupt";assert.equal(readRedlightSound(storage),true);
  const unavailable={getItem(){throw Error("Blocked");},setItem(){throw Error("Blocked");}};assert.equal(readRedlightSound(unavailable),true);assert.doesNotThrow(()=>saveRedlightSound(false,unavailable));
});
