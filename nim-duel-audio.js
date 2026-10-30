// Short, locally synthesized wood, ignition and result sounds; no audio files.
export function createNimAudio(){
  let context=null,enabled=true;const voices=new Set();
  try{enabled=localStorage.getItem("cooper-nim-sound-v1")!=="off";}catch{}
  function resume(){if(!enabled)return;try{context||=new (window.AudioContext||window.webkitAudioContext)();if(context.state==="suspended")context.resume().catch(()=>{});}catch{}}
  function tone(frequency,start,duration,volume=.045,type="sine"){
    if(!context||!enabled||context.state!=="running")return;
    const osc=context.createOscillator(),gain=context.createGain(),t=context.currentTime+start;osc.type=type;osc.frequency.setValueAtTime(frequency,t);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain).connect(context.destination);osc.start(t);osc.stop(t+duration+.03);voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};
  }
  function fire(amount){
    if(!context||!enabled||context.state!=="running")return;
    const size=Math.floor(context.sampleRate*.8),buffer=context.createBuffer(1,size,context.sampleRate),data=buffer.getChannelData(0);
    let seed=123456;for(let i=0;i<size;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=(seed/2147483648)*(.65+.35*Math.sin(i*.007));}
    const noise=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain(),t=context.currentTime;noise.buffer=buffer;filter.type="bandpass";filter.frequency.value=1600;filter.Q.value=.6;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.04+amount*.008,t+.045);gain.gain.exponentialRampToValueAtTime(.0001,t+.8);
    noise.connect(filter).connect(gain).connect(context.destination);noise.start();voices.add(noise);noise.onended=()=>{voices.delete(noise);noise.disconnect();filter.disconnect();gain.disconnect();};
    tone(260,0,.09,.045,"triangle");tone(150,.045,.09,.025,"triangle");
  }
  function stop(){for(const node of voices){try{node.stop();}catch{}}voices.clear();}
  return {resume,fire,stop,get enabled(){return enabled;},toggle(){enabled=!enabled;if(!enabled)stop();else resume();try{localStorage.setItem("cooper-nim-sound-v1",enabled?"on":"off");}catch{}return enabled;},
    finish(won){if(won)[392,493.88,587.33,783.99].forEach((hz,i)=>tone(hz,i*.16,.65,.045,"triangle"));else{tone(293.66,0,.6,.035);tone(220,.23,.8,.03);tone(196,.47,.9,.025);}},
    dispose(){stop();context?.close().catch(()=>{});context=null;},
  };
}
