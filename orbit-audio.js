// Small synthesized spacecraft cues, created only after a player gesture.
export function createOrbitAudio(enabled=true){
  let context=null,master=null,voices=new Set();
  function start(){if(!enabled)return;try{if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;context=new Audio();master=context.createGain();master.gain.value=.19;master.connect(context.destination);}if(context.state==='suspended')context.resume().catch(()=>{});}catch{/* Visual cues remain available. */}}
  function tone(frequency,duration=.18,delay=0,type='sine',end=frequency){
    if(!enabled||!context||context.state!=='running')return;
    const t=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.3,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(master);voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.02);
  }
  function play(type){start();if(type==='dash')tone(180,.26,0,'sine',650);if(type==='pass'){tone(520);tone(780,.24,.09);}if(type==='perfect'){tone(660);tone(990,.22,.07);tone(1320,.25,.14);}if(type==='miss'){tone(110,.35,0,'triangle',30);tone(65,.45,.06,'sawtooth',26);}if(type==='sector'||type==='win')[392,523,659,784].forEach((f,i)=>tone(f,.5,i*.12));if(type==='start'){tone(330);tone(660,.25,.12);}}
  function stop(){for(const o of voices){try{o.stop();}catch{/* Already ended. */}}voices.clear();}
  return{start,play,stop,setEnabled(value){enabled=!!value;if(!enabled)stop();else start();},dispose(){stop();context?.close().catch(()=>{});context=null;}};
}
