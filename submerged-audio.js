export function createSubmergedAudio(enabled=true){
  let context,master,motor,motorGain,disposed=false,lastBubble=0,lastScan=0;const voices=new Set();
  function start(){if(!enabled||disposed)return false;try{if(!context){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return false;context=new Audio();master=context.createGain();master.gain.value=.4;master.connect(context.destination);motor=context.createOscillator();motor.type='sine';motor.frequency.value=49;motorGain=context.createGain();motorGain.gain.value=0;motor.connect(motorGain);motorGain.connect(master);motor.start();}context.resume().catch(()=>{});return true;}catch{return false;}}
  function tone(frequency,delay,duration,gain,end=frequency,type='sine'){
    if(!start())return;const time=context.currentTime+delay,source=context.createOscillator(),volume=context.createGain();source.type=type;source.frequency.setValueAtTime(frequency,time);source.frequency.exponentialRampToValueAtTime(end,time+duration);
    volume.gain.setValueAtTime(.0001,time);volume.gain.exponentialRampToValueAtTime(gain,time+.008);volume.gain.exponentialRampToValueAtTime(.0001,time+duration);source.connect(volume);volume.connect(master);voices.add(source);
    source.onended=()=>{voices.delete(source);source.disconnect();volume.disconnect();};source.start(time);source.stop(time+duration+.03);
  }
  function stop(){if(!context)return;motorGain.gain.setTargetAtTime(0,context.currentTime,.05);for(const voice of voices)try{voice.stop();}catch{}}
  return {get enabled(){return enabled;},start,
    setEnabled(value){enabled=!!value;if(!enabled)stop();},
    update(state,active){if(!context)return;const t=context.currentTime,speed=Math.min(1,Math.hypot(state.vx,state.vy)/250);motorGain.gain.setTargetAtTime(enabled&&active?.016+speed*.025:0,t,.12);motor.frequency.setTargetAtTime(43+speed*31,t,.15);
      if(!active||!enabled)return;if(speed>.15&&t-lastBubble>.55){lastBubble=t;tone(180+Math.random()*70,0,.09,.028,650+Math.random()*250);}
      if(state.scanProgress>0&&t-lastScan>.23){lastScan=t;tone(520+state.scanProgress*360,0,.12,.045,600+state.scanProgress*360);}
    },
    ping(){tone(880,0,1,.19,830);tone(880,.25,.75,.055,820);},
    found(){[523.25,659.25,783.99].forEach((n,i)=>tone(n,i*.1,.65,.13));},
    impact(){tone(90,0,.22,.15,35,'triangle');},
    dock(){tone(440,0,.35,.08);tone(660,.16,.4,.08);},
    finish(){[392,523.25,659.25,783.99,1046.5].forEach((n,i)=>tone(n,i*.16,1.1,.13));},
    stop,dispose(){disposed=true;stop();try{motor?.stop();}catch{}context?.close().catch(()=>{});context=null;voices.clear();},
  };
}
