export function createRailwayAudio(enabled=true) {
  let context=null,master=null,lastChug=0,disposed=false;
  function unlock(){if(disposed||!enabled)return;const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;if(!context){context=new Audio();master=context.createGain();master.gain.value=.16;master.connect(context.destination);}context.resume().catch(()=>{});}
  function tone(frequency,duration=.15,delay=0,type="sine",volume=.4,end=frequency){if(!context||!enabled||context.state!=="running")return;const now=context.currentTime+delay,osc=context.createOscillator(),gain=context.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(Math.max(10,end),now+duration);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(master);osc.start(now);osc.stop(now+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
  function noise(duration,volume,lowpass=600){if(!context||!enabled||context.state!=="running")return;const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);const source=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter();source.buffer=buffer;filter.type="lowpass";filter.frequency.value=lowpass;gain.gain.value=volume;source.connect(filter);filter.connect(gain);gain.connect(master);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};}
  function play(kind){if(!enabled)return;
    if(kind==="dispatch"){tone(590,.3,0,"sine",.25,650);tone(780,.32,0,"sine",.11,850);}
    if(kind==="switch"||kind==="signal")noise(.06,.3,2200);
    if(kind==="brake")noise(.2,.14,3200);
    if(kind==="delivery"){tone(880,.3,0,"sine",.3);tone(1174,.4,.17,"sine",.23);}
    if(kind==="miss") {tone(280,.2,0,"triangle",.25);tone(220,.25,.17,"triangle",.22);}
    if(kind==="crash"){noise(1.7,1.4,1000);tone(95,.9,0,"triangle",.8,22);}
    if(kind==="win")for(const [i,f] of [523,659,784,1046].entries())tone(f,.5,i*.15,"triangle",.25);
  }
  return {unlock,play,setEnabled(value){enabled=!!value;if(enabled)unlock();else if(context)context.suspend().catch(()=>{});},tick(s){if(!enabled||!context||s.phase!=="playing"||s.paused)return;if(context.currentTime-lastChug>.22&&s.trains.some(t=>t.waiting==="moving")){lastChug=context.currentTime;noise(.045,.055,650);}},dispose(){disposed=true;if(context)context.close().catch(()=>{});context=null;master=null;}};
}
