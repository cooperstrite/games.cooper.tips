export const REDLIGHT_AUDIO_KEY = "cooper-redlight-audio-v1";

export function readRedlightSound(storage) {
  try { return JSON.parse((storage || globalThis.localStorage).getItem(REDLIGHT_AUDIO_KEY))?.effects !== false; }
  catch { return true; }
}
export function saveRedlightSound(enabled, storage) {
  try { (storage || globalThis.localStorage).setItem(REDLIGHT_AUDIO_KEY, JSON.stringify({ effects: Boolean(enabled) })); } catch {}
}

// Local Web Audio effects: no downloads, timers, or renderer-specific rules.
export function createRedlightAudio(initiallyEnabled = true, AudioClass = globalThis.AudioContext || globalThis.webkitAudioContext) {
  let enabled=Boolean(initiallyEnabled),context=null,master=null,noise=null,disposed=false,previous=null;
  const voices=new Set();
  function silence(group) {
    for(const voice of [...voices]) {
      if(group && voice.group!==group)continue;
      voice.source.onended=null;
      try { voice.source.stop(); } catch { /* An ended voice is already silent. */ }
      voice.source.disconnect();voice.gain.disconnect();voice.filter?.disconnect();voices.delete(voice);
    }
  }
  function unlock() {
    if(disposed||!enabled||!AudioClass)return;
    try {
      if(!context) {
        context=new AudioClass();master=context.createGain();master.gain.value=.42;master.connect(context.destination);
        noise=context.createBuffer(1,Math.ceil(context.sampleRate*.12),context.sampleRate);
        const samples=noise.getChannelData(0);
        for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
      }
      if(context.state==="suspended")context.resume().catch(()=>silence());
    } catch { silence();context?.close().catch(()=>{});context=null;master=null; }
  }
  function connect(source, duration, volume, delay=0, group="cue", filter=null) {
    const now=context.currentTime+delay,gain=context.createGain(),voice={source,gain,filter,group};
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    if(filter){source.connect(filter);filter.connect(gain);}else source.connect(gain);
    gain.connect(master);voices.add(voice);
    source.onended=()=>{source.disconnect();gain.disconnect();filter?.disconnect();voices.delete(voice);};
    source.start(now);source.stop(now+duration+.012);
  }
  function tone(frequency,end,duration,volume,type="sine",delay=0,group="cue") {
    const source=context.createOscillator();source.type=type;
    const now=context.currentTime+delay;source.frequency.setValueAtTime(frequency,now);source.frequency.exponentialRampToValueAtTime(end,now+duration);
    connect(source,duration,volume,delay,group);
  }
  function effect(kind, foot=0) {
    if(!enabled||disposed||!context||context.state==="closed")return;
    // Do not accumulate footsteps if the browser suspends its audio device.
    if(context.state==="suspended"&&kind==="step")return;
    if(kind==="count")tone(660,620,.12,.2);
    else if(kind==="green") {tone(880,1046,.15,.22);tone(1318,1318,.22,.14,"sine",.09);}
    else if(kind==="amber") {tone(740,740,.075,.17,"triangle");tone(740,660,.1,.15,"triangle",.14);}
    else if(kind==="red")tone(220,185,.2,.19,"triangle");
    else if(kind==="caught") {tone(260,75,.42,.2,"sawtooth");tone(110,55,.34,.2,"sine",.08);}
    else if(kind==="finish")[523.25,659.25,783.99,1046.5].forEach((note,i)=>tone(note,note,i===3?.5:.23,.2,"triangle",i*.12));
    else if(kind==="step") {
      const source=context.createBufferSource(),filter=context.createBiquadFilter();source.buffer=noise;
      filter.type="lowpass";filter.frequency.value=foot%2?950:750;
      connect(source,.065,.1,0,"step",filter);tone(foot%2?145:125,65,.075,.13,"sine",0,"step");
    }
  }
  function update(race) {
    if(disposed)return;
    const next={phase:race.phase,signal:race.signal,count:race.phase==="countdown"?Math.max(1,Math.ceil(race.remaining)):0,step:Math.floor(race.stride/Math.PI),running:race.running,paused:race.paused};
    const before=previous;previous=next;
    if(next.paused||next.phase==="idle") {silence();return;}
    if(!next.running&&before?.running)silence("step");
    if(!enabled)return;
    // Muting and pausing still track the model, so resuming cannot replay old cues.
    if(next.phase!==before?.phase) {
      silence();
      if(next.phase==="countdown")effect("count");
      else effect({green:"green",red:"red",caught:"caught",finished:"finish"}[next.phase]);
    } else if(next.phase==="countdown"&&next.count!==before?.count)effect("count");
    else if(next.phase==="green"&&next.signal==="amber"&&before?.signal!=="amber")effect("amber");
    if(next.running&&(next.step!==before?.step||(!before?.running&&next.step===0)))effect("step",next.step);
  }
  return {
    unlock,update,silence,
    get supported(){return Boolean(AudioClass);},
    setEnabled(value) {
      enabled=Boolean(value);
      if(!enabled)silence();
      if(master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setValueAtTime(enabled?.42:0,context.currentTime);}
      if(enabled)unlock();
    },
    dispose() {if(disposed)return;disposed=true;silence();master?.disconnect();context?.close().catch(()=>{});context=null;master=null;noise=null;},
  };
}
