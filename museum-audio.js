// An original, locally synthesized gallery score and surface-aware footsteps.
// No recordings, network services, or audio downloads are needed.
const SETTINGS_KEY='cooper-museum-audio-v1';
export const MUSEUM_AUDIO_DEFAULTS=Object.freeze({enabled:true,footsteps:.8,music:.45});
const clamp=(value,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
function preferences(value={}){return {enabled:typeof value.enabled==='boolean'?value.enabled:true,footsteps:clamp(value.footsteps,.8),music:clamp(value.music,.45)};}
export function readMuseumAudio(storage){try{storage??=globalThis.localStorage;return preferences(JSON.parse(storage?.getItem(SETTINGS_KEY)||'{}')||{});}catch{return {...MUSEUM_AUDIO_DEFAULTS};}}
export function saveMuseumAudio(value,storage){try{storage??=globalThis.localStorage;storage?.setItem(SETTINGS_KEY,JSON.stringify(preferences(value)));}catch{/* Sound still works without storage. */}}

const BEAT=60/72,HALF_BEAT=BEAT/2;
// Sixteen bars: a quiet D-minor theme, a warmer middle section, then a return.
const HARMONY=[
  [38,53,57,60,64],[34,53,57,62,65],[41,53,57,60,67],[36,52,55,60,62],
  [43,53,57,62,65],[41,53,57,62,64],[34,53,57,62,65],[33,52,57,62,64],
  [38,53,57,60,64],[41,53,57,60,67],[34,53,57,62,65],[36,52,55,60,64],
  [43,53,57,62,65],[38,53,57,60,64],[34,53,57,62,65],[33,52,57,61,64],
];
const MELODY=[
  [69,null,72,null,74,null,72,null],[69,null,null,65,67,null,69,null],
  [72,null,76,null,74,null,72,null],[67,null,null,null,64,null,62,null],
  [65,null,69,null,74,null,72,null],[69,null,null,65,64,null,62,null],
  [65,null,69,null,67,null,65,null],[64,null,null,null,61,null,null,null],
  [74,null,72,null,69,null,65,null],[67,null,69,null,72,null,76,null],
  [77,null,null,74,72,null,69,null],[67,null,64,null,62,null,null,null],
  [65,null,69,null,74,null,72,null],[69,null,null,65,64,null,62,null],
  [65,null,69,null,67,null,65,null],[64,null,null,null,61,null,null,null],
];

export function createMuseumAudio(options=readMuseumAudio(),Audio=globalThis.AudioContext||globalThis.webkitAudioContext){
  let prefs=preferences(options),context,master,stepsBus,musicBus,effectsBus,roomSend;
  let active=false,disposed=false,timer=null,nextNote=0,scoreStep=0,lastStep=-1,foot=0;
  const voices=new Set(),pianoNotes=new Map(),pads=new Map();
  let stoneSteps=[],rugSteps=[];
  const hz=note=>440*Math.pow(2,(note-69)/12);
  function buffer(seconds,write){const b=context.createBuffer(1,Math.ceil(context.sampleRate*seconds),context.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=write(i/context.sampleRate,i);return b;}
  function piano(note){
    if(pianoNotes.has(note))return pianoNotes.get(note);
    const f=hz(note);
    const b=buffer(3.4,t=>{
      const attack=1-Math.exp(-t*330),release=Math.min(1,(3.4-t)/.06);
      let sample=0;
      for(let p=1;p<=6;p++){
        const decay=Math.exp(-t*(1.35+p*.65)),weight=[0,1,.36,.18,.075,.035,.016][p];
        // Slightly detuned strings and quicker upper-partial decay soften the hammer.
        sample+=weight*decay*(Math.sin(2*Math.PI*f*p*t)+.25*Math.sin(2*Math.PI*f*p*1.0011*t));
      }
      return sample*attack*release*.5;
    });pianoNotes.set(note,b);return b;
  }
  function pad(note){
    if(pads.has(note))return pads.get(note);
    const f=hz(note),duration=BEAT*4+.7;
    const b=buffer(duration,t=>{
      const envelope=Math.min(1,t/.8)*Math.min(1,(duration-t)/1.15);
      return (Math.sin(2*Math.PI*f*t+.012*Math.sin(t*4.1))+.34*Math.sin(2*Math.PI*f*1.002*t)+.12*Math.sin(4*Math.PI*f*t))*.4*envelope;
    });pads.set(note,b);return b;
  }
  function footstep(soft,variant){
    let smooth=0,seed=9137+variant*1741+(soft?117:0);
    return buffer(.3,t=>{
      seed=(Math.imul(seed,1664525)+1013904223)|0;const noise=seed/2147483648;
      smooth+=(noise-smooth)*(soft?.09:.38);
      const heel=(1-Math.exp(-t*1300))*Math.exp(-t*(soft?38:47));
      const soleTime=Math.max(0,t-.045),sole=t>.045?(1-Math.exp(-soleTime*350))*Math.exp(-soleTime*55):0;
      const body=Math.sin(2*Math.PI*((soft?94:138)+variant*3)*t-2.8*t*t)*heel;
      const contact=smooth*(heel*(soft?.55:1.05)+sole*.62);
      return (body*.48+contact)*Math.min(1,(.3-t)/.025)*(soft?.78:1);
    });
  }
  function setup(){
    if(disposed||!Audio)return false;if(context)return true;
    try{
      context=new Audio();master=context.createGain();master.gain.value=0;
      const limiter=context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=3;limiter.attack.value=.006;limiter.release.value=.18;master.connect(limiter);limiter.connect(context.destination);
      stepsBus=context.createGain();musicBus=context.createGain();effectsBus=context.createGain();
      for(const bus of [stepsBus,musicBus,effectsBus])bus.connect(master);
      const reverb=context.createConvolver(),wet=context.createGain();wet.gain.value=.19;roomSend=context.createGain();roomSend.connect(reverb);reverb.connect(wet);wet.connect(master);
      let smoothed=0;reverb.buffer=buffer(1.45,t=>{smoothed+=((Math.random()*2-1)-smoothed)*.22;return t<.025?0:smoothed*Math.exp(-t*4.8)*Math.min(1,(1.45-t)/.03);});
      musicBus.connect(roomSend);effectsBus.connect(roomSend);
      stoneSteps=Array.from({length:4},(_,i)=>footstep(false,i));rugSteps=Array.from({length:4},(_,i)=>footstep(true,i));
      // Cache the small instrument palette once, so notes do not allocate PCM during play.
      for(const chord of HARMONY){chord.forEach(piano);chord.slice(1,4).forEach(pad);}
      for(const bar of MELODY)for(const note of bar)if(note!==null)piano(note);
      levels();return true;
    }catch{context?.close().catch(()=>{});context=null;return false;}
  }
  function levels(){if(!context)return;const t=context.currentTime;stepsBus.gain.setTargetAtTime(prefs.footsteps*prefs.footsteps*1.4,t,.035);musicBus.gain.setTargetAtTime(prefs.music*prefs.music,t,.08);effectsBus.gain.value=.7;master.gain.setTargetAtTime(enabled()?.65:0,t,.06);}
  function enabled(){return active&&prefs.enabled&&!disposed;}
  function play(b,time,gain,bus,group,pan=0){
    if(!enabled())return;
    const source=context.createBufferSource(),volume=context.createGain(),stereo=context.createStereoPanner();
    source.buffer=b;volume.gain.value=gain;stereo.pan.value=pan;source.connect(volume);volume.connect(stereo);stereo.connect(bus);
    const voice={source,volume,stereo,group};voices.add(voice);
    source.onended=()=>{voices.delete(voice);for(const node of [source,volume,stereo])node.disconnect();};source.start(time);return voice;
  }
  function stop(group){
    if(!context)return;
    for(const voice of voices){if(group&&voice.group!==group)continue;voice.volume.gain.cancelScheduledValues(context.currentTime);voice.volume.gain.setTargetAtTime(0,context.currentTime,.012);try{voice.source.stop(context.currentTime+.06);}catch{}}
  }
  function schedule(){
    if(!enabled()||prefs.music===0)return;
    const now=context.currentTime;if(nextNote<now-.2)nextNote=now+.04;
    while(nextNote<now+.18){
      const bar=Math.floor(scoreStep/8)%HARMONY.length,part=scoreStep%8,chord=HARMONY[bar],melody=MELODY[bar][part];
      if(part===0){play(piano(chord[0]),nextNote,.17,musicBus,'music',-.12);for(const [i,note]of chord.slice(1,4).entries())play(pad(note),nextNote,.036,musicBus,'music',(i-1)*.32);}
      if([0,3,5,7].includes(part))play(piano(chord[1+([0,3,5,7].indexOf(part)%4)]),nextNote+.012,.11,musicBus,'music',-.24);
      if(melody!==null)play(piano(melody),nextNote+.025,.22,musicBus,'music',.2);
      scoreStep=(scoreStep+1)%(HARMONY.length*8);nextNote+=HALF_BEAT;
    }
  }
  function music(){
    if(timer!==null||!enabled()||prefs.music===0)return;
    nextNote=context.currentTime+.06;schedule();timer=setInterval(schedule,100);
  }
  function stopMusic(){if(timer!==null)clearInterval(timer);timer=null;stop('music');}
  function start(){if(disposed||!prefs.enabled)return;try{if(!setup())return;active=true;context.resume().catch(()=>{});levels();music();}catch{/* Audio is optional. */}}
  function cue(notes,spacing,gain){if(!context||!enabled())return;for(const [i,note]of notes.entries())play(piano(note),context.currentTime+i*spacing,gain,effectsBus,'cue');}
  return {
    get preferences(){return {...prefs};},start,
    setEnabled(value){prefs.enabled=!!value;saveMuseumAudio(prefs);if(!prefs.enabled){stopMusic();stop();}else if(active)start();levels();},
    setVolume(kind,value){if(!['footsteps','music'].includes(kind))return;prefs[kind]=clamp(value,prefs[kind]);saveMuseumAudio(prefs);levels();if(kind==='music'){if(prefs.music===0)stopMusic();else music();}if(kind==='footsteps'&&prefs.footsteps===0)stop('step');},
    pause(){active=false;stopMusic();stop();levels();lastStep=-1;},
    step(speed,soft){
      if(!context||!enabled()||prefs.footsteps===0||speed<.2)return;
      const now=context.currentTime,interval=Math.max(.25,Math.min(.7,.51*2.25/speed));if(lastStep>=0&&now-lastStep<interval)return;lastStep=now;
      const variation=foot++%4,pan=foot%2?-.13:.13;
      play((soft?rugSteps:stoneSteps)[variation],now,.46,stepsBus,'step',pan);
      // The echo follows the walking slider too; muting footsteps removes both.
      if(!soft)play(stoneSteps[variation],now+.08,.046,stepsBus,'step',-pan);
    },
    clue(){cue([74,77,81],.12,.15);},win(){cue([62,65,69,74,77,81],.19,.18);},
    dispose(){disposed=true;active=false;stopMusic();for(const voice of voices){try{voice.source.stop();}catch{}for(const node of [voice.source,voice.volume,voice.stereo])node.disconnect();}voices.clear();context?.close().catch(()=>{});context=null;pianoNotes.clear();pads.clear();stoneSteps=[];rugSteps=[];},
  };
}
