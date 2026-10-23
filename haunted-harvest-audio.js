export function createHarvestAudio(settings) {
  let context=null,master=null,musicBus=null,effectsBus=null,clock=0,note=0,disposed=false;
  function start(){
    if(disposed||(!settings.music&&!settings.effects))return;
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
    try{if(!context){context=new Audio();master=context.createGain();master.gain.value=.15;master.connect(context.destination);musicBus=context.createGain();musicBus.gain.value=settings.music?1:0;musicBus.connect(master);effectsBus=context.createGain();effectsBus.gain.value=settings.effects?1:0;effectsBus.connect(master);}if(context.state==="suspended")context.resume().catch(()=>{});}catch{context=null;}
  }
  function tone(hz,delay,duration,type="sine",volume=.15,music=false){
    if(!context||context.state!=="running")return;
    const t=context.currentTime+delay,osc=context.createOscillator(),gain=context.createGain();
    osc.type=type;osc.frequency.value=hz;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.02);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain).connect(music?musicBus:effectsBus);osc.start(t);osc.stop(t+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  return {
    start,
    effect(kind){if(!settings.effects)return;start();const notes={good:[392,493.88,587.33],wax:[880,1174.66],bad:[110,103.83],light:[261.63,329.63,392,523.25],bell:[659.25,987.77],cut:[180]}[kind]||[392];notes.forEach((hz,i)=>tone(hz,i*.09,kind==="cut"?.08:.32,kind==="bad"?"triangle":"sine",kind==="cut"?.06:.2));},
    update(dt,playing){if(!playing||!settings.music||!context)return;clock-=dt;if(clock<=0){clock=.75;const melody=[220,261.63,329.63,293.66,220,196,246.94,164.81];tone(melody[note++%melody.length],0,.65,"sine",.09,true);if(note%4===0)tone(110,0,1.8,"triangle",.05,true);}},
    mute(){if(context)for(const [bus,enabled] of [[musicBus,settings.music],[effectsBus,settings.effects]]){bus.gain.cancelScheduledValues(context.currentTime);bus.gain.setTargetAtTime(enabled?1:0,context.currentTime,.02);}},
    pause(){context?.suspend().catch(()=>{});},
    dispose(){disposed=true;context?.close().catch(()=>{});context=null;},
  };
}
