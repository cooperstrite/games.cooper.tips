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
      // Cache the small instrument palette once, so notes do not allocate PCM during play.
      for(const chord of HARMONY){chord.forEach(piano);chord.slice(1,4).forEach(pad);}
      for(const bar of MELODY)for(const note of bar)if(note!==null)piano(note);
      levels();return true;
    }catch{context?.close().catch(()=>{});context=null;return false;}
  }
  function levels(){if(!context)return;const t=context.currentTime;stepsBus.gain.setTargetAtTime(prefs.footsteps*prefs.footsteps*1.4,t,.035);musicBus.gain.setTargetAtTime(prefs.music*prefs.music,t,.08);effectsBus.gain.value=.7;master.gain.setTargetAtTime(enabled()?.65:0,t,.06);}
  function enabled(){return active&&prefs.enabled&&!disposed;}
  function connectVoice(source,bus,group,pan){
    const volume=context.createGain(),stereo=context.createStereoPanner();
    stereo.pan.value=pan;source.connect(volume);volume.connect(stereo);stereo.connect(bus);
    const voice={source,volume,stereo,group};voices.add(voice);
    source.onended=()=>{voices.delete(voice);for(const node of [source,volume,stereo])node.disconnect();};return voice;
  }
  function play(b,time,gain,bus,group,pan=0){
    if(!enabled())return;
    const source=context.createBufferSource(),voice=connectVoice(source,bus,group,pan);
    source.buffer=b;voice.volume.gain.value=gain;source.start(time);return voice;
  }
  function stepTone(frequency,time,duration,gain,type,pan){
    const source=context.createOscillator(),voice=connectVoice(source,stepsBus,'step',pan),envelope=voice.volume.gain;
    source.type=type;source.frequency.setValueAtTime(frequency,time);
    envelope.setValueAtTime(.0001,time);envelope.exponentialRampToValueAtTime(gain,time+.015);envelope.exponentialRampToValueAtTime(.0001,time+duration);
    source.start(time);source.stop(time+duration+.03);
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
      const now=context.currentTime,interval=.56/Math.max(.7,speed/2.25);if(lastStep>=0&&now-lastStep<interval)return;lastStep=now;
      const pan=foot++%2? .13:-.13;
      // Restore the original brief, soft shoe taps, with no noisy sole layer or echo.
      // Both components still follow the walking slider and soften on carpet.
      stepTone(soft?92:135,now,.07,soft?.045:.08,'triangle',pan);
      stepTone(soft?230:320,now+.012,.04,.016,'sine',pan);
    },
    clue(){cue([74,77,81],.12,.15);},win(){cue([62,65,69,74,77,81],.19,.18);},
    dispose(){disposed=true;active=false;stopMusic();for(const voice of voices){try{voice.source.stop();}catch{}for(const node of [voice.source,voice.volume,voice.stereo])node.disconnect();}voices.clear();context?.close().catch(()=>{});context=null;pianoNotes.clear();pads.clear();},
  };
}
