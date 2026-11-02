import { ECHO_INSTRUMENTS } from './harmonic-engine.js';

// Modal and harmonic synthesis: each instrument has its own attack, partials,
// damping and release. Each pad keeps its pentatonic pitch when customized.
const VOICES = {
  marimba:{attack:.004,decay:.21,tail:.18,level:.70,cutoff:5300,partials:[[1,1,1],[4,.32,.35],[10,.08,.17]],noise:.025},
  harp:{attack:.007,decay:.39,tail:.29,level:.60,cutoff:4400,partials:[[1,1,1],[2,.37,.65],[3,.18,.42],[4,.075,.25],[5,.03,.2]],noise:.012},
  bell:{attack:.006,decay:.44,tail:.37,level:.58,cutoff:5900,partials:[[1,1,1],[2.756,.28,.72],[4.07,.11,.4],[5.43,.035,.25]],noise:0},
  piano:{attack:.012,decay:.34,tail:.24,level:.63,cutoff:3600,partials:[[1,1,1],[2.002,.36,.67],[3.009,.17,.5],[4.02,.075,.38],[5.04,.025,.28]],noise:.014},
  kalimba:{attack:.003,decay:.26,tail:.2,level:.66,cutoff:5000,partials:[[1,1,1],[2.9,.29,.35],[5.7,.065,.18],[8.1,.018,.12]],noise:.017},
  glass:{attack:.035,decay:.46,tail:.38,level:.58,cutoff:5600,partials:[[1,1,1],[2.015,.16,.85],[4.02,.035,.55]],noise:0},
  strings:{attack:.08,decay:.5,tail:.22,level:.30,cutoff:3200,partials:[[1,1,1],[2,.42,.9],[3,.25,.8],[4,.13,.65],[5,.055,.5],[6,.02,.4]],noise:.009,bow:true},
  guitar:{attack:.004,decay:.32,tail:.21,level:.62,cutoff:2900,partials:[[1,1,1],[2,.49,.68],[3,.23,.45],[4,.13,.31],[5,.065,.2],[6,.025,.16]],noise:.028},
  handpan:{attack:.009,decay:.43,tail:.32,level:.59,cutoff:4100,partials:[[1,1,1],[2,.48,.82],[3,.22,.65],[4.03,.05,.3],[6.7,.02,.17]],noise:.018},
  musicbox:{attack:.002,decay:.29,tail:.32,level:.66,cutoff:6700,partials:[[1,1,1],[2,.12,.42],[3.98,.36,.6],[6.73,.1,.28],[10.1,.028,.15]],noise:.005},
  celesta:{attack:.007,decay:.39,tail:.34,level:.59,cutoff:4900,partials:[[1,1,1],[2,.19,.63],[3.96,.26,.71],[5.28,.07,.35],[8.2,.025,.22]],noise:.008},
};
function seeded(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}

export function echoRoomImpulse(context){
  const length=Math.ceil(context.sampleRate*1.05),buffer=context.createBuffer(2,length,context.sampleRate);
  for(let channel=0;channel<2;channel++){
    const data=buffer.getChannelData(channel),random=seeded(71+channel*109);let softened=0;
    for(let i=0;i<length;i++){const t=i/context.sampleRate;softened=softened*.72+(random()*2-1)*.28;data[i]=softened*Math.exp(-t*7.5)*Math.min(1,t/.018)*.08;}
    for(const [delay,strength] of [[.013,.22],[.027,.15],[.043,.09],[.071,.045]])data[Math.floor((delay+channel*.002)*context.sampleRate)]+=strength;
  }
  return buffer;
}

export function scheduleEchoVoice(context,destination,id,{time=context.currentTime,duration=.44,gain=1,pan=0,frequency,onEnded=()=>{}}={}){
  const instrument=ECHO_INSTRUMENTS.find(i=>i.id===id),voice=VOICES[id];if(!instrument||!voice)return null;
  const pitch=Number.isFinite(frequency)&&frequency>=100&&frequency<=2000?frequency:instrument.frequency;
  const now=Math.max(context.currentTime,time),length=Math.max(.18,Math.min(1,duration)),end=now+length+voice.tail,sources=[],nodes=[];
  const output=context.createGain(),filter=context.createBiquadFilter();output.gain.value=Math.max(0,Math.min(1,gain))*.31*voice.level;filter.type='lowpass';filter.frequency.value=voice.cutoff;filter.Q.value=.45;output.connect(filter);nodes.push(output,filter);
  if(context.createStereoPanner){const panner=context.createStereoPanner();panner.pan.value=Math.max(-.25,Math.min(.25,pan));filter.connect(panner);panner.connect(destination);nodes.push(panner);}else filter.connect(destination);
  let remaining=0,ended=false;
  const finished=()=>{if(--remaining>0||ended)return;ended=true;for(const node of nodes)try{node.disconnect();}catch{}onEnded();};
  function source(node){sources.push(node);nodes.push(node);remaining++;node.onended=finished;}
  let vibrato,depth;
  if(voice.bow){vibrato=context.createOscillator();depth=context.createGain();vibrato.frequency.value=5.25;depth.gain.setValueAtTime(0,now);depth.gain.linearRampToValueAtTime(7,now+.18);vibrato.connect(depth);nodes.push(depth);}
  for(const [ratio,amplitude,damping] of voice.partials){
    const osc=context.createOscillator(),envelope=context.createGain(),attack=voice.attack*(voice.bow?1:Math.max(.5,damping));
    osc.type='sine';osc.frequency.setValueAtTime(pitch*ratio,now);
    if(voice.bow){osc.detune.setValueAtTime(-1.5,now);osc.detune.linearRampToValueAtTime(1.5,now+.18);osc.detune.linearRampToValueAtTime(-1.2,now+.37);depth.connect(osc.detune);}
    envelope.gain.setValueAtTime(0,now);envelope.gain.linearRampToValueAtTime(amplitude,now+attack);
    if(voice.bow){envelope.gain.exponentialRampToValueAtTime(amplitude*.68,now+length);envelope.gain.exponentialRampToValueAtTime(.0001,end-.012);}
    else{
      const decay=Math.min(length+voice.tail-.025,voice.decay*damping);
      envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,amplitude*.075),now+Math.max(attack+.025,decay));
      envelope.gain.exponentialRampToValueAtTime(.0001,end-.012);
    }
    envelope.gain.linearRampToValueAtTime(0,end);osc.connect(envelope);envelope.connect(output);nodes.push(envelope);source(osc);osc.start(now);osc.stop(end+.008);
  }
  if(vibrato){source(vibrato);vibrato.start(now);vibrato.stop(end+.008);}
  if(voice.noise){
    const duration=voice.bow?length:.045,buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0),random=seeded(Math.floor(instrument.frequency));let low=0;
    for(let i=0;i<data.length;i++){low=low*.6+(random()*2-1)*.4;const t=i/data.length;data[i]=low*Math.min(1,t*18)*Math.exp(-t*(voice.bow?2:7))*Math.min(1,(1-t)*14);}
    const noise=context.createBufferSource(),level=context.createGain();level.gain.value=voice.noise;noise.buffer=buffer;noise.connect(level);level.connect(output);nodes.push(level);source(noise);noise.start(now);
  }
  let stopping=false;
  return {end,stop(){if(stopping||ended)return;stopping=true;const t=context.currentTime;output.gain.cancelScheduledValues(t);output.gain.setValueAtTime(output.gain.value,t);output.gain.linearRampToValueAtTime(0,t+.015);for(const node of sources)try{node.stop(t+.016);}catch{}},get ended(){return ended;}};
}

export function createEchoAudio({enabled=true,volume=.65}={}){
  let context=null,input,dry,wet,room,compressor,master,analyser,impulse,disposed=false,available=true;const voices=new Set();
  function createRoom(){room?.disconnect();room=context.createConvolver();room.buffer=impulse;input.connect(room);room.connect(wet);}
  function ensure(){
    if(disposed||!available)return false;if(context)return true;
    try{
      const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio){available=false;return false;}
      context=new Audio();input=context.createGain();dry=context.createGain();wet=context.createGain();compressor=context.createDynamicsCompressor();master=context.createGain();analyser=context.createAnalyser();
      dry.gain.value=.92;wet.gain.value=.14;compressor.threshold.value=-15;compressor.knee.value=12;compressor.ratio.value=5;compressor.attack.value=.003;compressor.release.value=.14;
      master.gain.value=enabled?volume*.8:0;analyser.fftSize=512;input.connect(dry);dry.connect(compressor);wet.connect(compressor);compressor.connect(master);master.connect(analyser);analyser.connect(context.destination);impulse=echoRoomImpulse(context);createRoom();return true;
    }catch{available=false;try{context?.close().catch(()=>{});}catch{}context=null;return false;}
  }
  async function start(){if(!enabled)return true;if(!ensure())return false;try{if(context.state!=='running')await context.resume();return context.state==='running';}catch{return false;}}
  function play(id,{delay=0,duration=.44,gain=1,frequency}={}){
    if(!enabled||!volume||!ensure())return false;if(context.state==='suspended')context.resume().catch(()=>{});
    while(voices.size>=16){const first=voices.values().next().value;first.stop();voices.delete(first);}
    const index=ECHO_INSTRUMENTS.findIndex(i=>i.id===id);let handle;
    handle=scheduleEchoVoice(context,input,id,{time:context.currentTime+.012+Math.max(0,delay),duration,gain,frequency,pan:(index-3)*.04,onEnded:()=>voices.delete(handle)});
    if(handle)voices.add(handle);return !!handle;
  }
  function stop(){for(const voice of voices)voice.stop();voices.clear();if(context&&room){input.disconnect(room);createRoom();}}
  return {
    start,play,stop,get enabled(){return enabled;},get available(){return available;},get volume(){return volume;},get activeVoices(){return voices.size;},
    setEnabled(value){enabled=!!value;if(!enabled)stop();if(context)master.gain.setTargetAtTime(enabled?volume*.8:0,context.currentTime,.025);},
    setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(context)master.gain.setTargetAtTime(enabled?volume*.8:0,context.currentTime,.025);},
    waveform(array){if(analyser&&enabled&&volume)analyser.getFloatTimeDomainData(array);else array.fill(0);},
    finish(){['marimba','bell','piano','glass'].forEach((id,i)=>play(id,{delay:.1+i*.17,duration:.55,gain:.8}));},
    miss(){play('harp',{delay:.16,duration:.32,gain:.45});play('marimba',{delay:.34,duration:.36,gain:.5});},
    dispose(){disposed=true;for(const voice of voices)voice.stop();voices.clear();try{context?.close().catch(()=>{});}catch{}context=null;},
  };
}
