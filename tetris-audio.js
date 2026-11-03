export function createTetrisAudio(enabled=true) {
  let ctx,master,on=enabled,disposed=false,paused=false,lastMove=0;
  const voices=new Set();
  const contextAction=action=>{try{const result=ctx?.[action]();result?.catch?.(()=>{});}catch{}};
  function stopVoices(){for(const voice of [...voices]){try{voice.oscillator.stop();}catch{}voice.release();}}
  async function start(){
    paused=false;if(!on||disposed)return;
    try{
      ctx||=new(window.AudioContext||window.webkitAudioContext)();
      if(!master){master=ctx.createGain();master.gain.value=.18;master.connect(ctx.destination);}
      if(ctx.state==='suspended')await ctx.resume();
    }catch{}
  }
  function tone(frequency,duration=.15,volume=.3,type='sine',delay=0,end=frequency){
    if(!on||paused||!ctx||ctx.state!=='running'||disposed||voices.size>=64)return;
    const time=ctx.currentTime+delay,oscillator=ctx.createOscillator(),gain=ctx.createGain();
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,time);oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,end),time+duration);
    gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    oscillator.connect(gain);gain.connect(master);
    const voice={oscillator,release(){if(!voices.delete(voice))return;oscillator.disconnect();gain.disconnect();}};
    voices.add(voice);oscillator.onended=voice.release;oscillator.start(time);oscillator.stop(time+duration+.02);
  }
  function bell(frequency,delay=0,volume=.17,duration=.32){
    tone(frequency,duration,volume,'sine',delay);tone(frequency*2.01,duration*.46,volume*.22,'sine',delay);
  }
  function play(event){
    if(!on||paused||disposed)return;const type=typeof event==='string'?event:event?.type;
    if(type==='move'){
      if(performance.now()-lastMove<80)return;lastMove=performance.now();tone(260,.045,.07,'sine',0,310);
    }else if(type==='rotate'){
      tone(430,.08,.12,'sine',0,650);bell(780,.035,.05,.12);
    }else if(type==='release'){
      tone(280,.12,.13,'triangle',0,95);
    }else if(type==='land'){
      tone(145,.12,.16,'triangle',0,75);tone(540,.065,.055,'sine',.015,360);
    }else if(type==='clear'){
      const count=Math.max(1,Math.min(4,Math.floor(event?.count)||1));
      const notes=[523,659,784,1047,1319,1568];
      notes.slice(0,count+2).forEach((frequency,i)=>bell(frequency,i*.075,.15+i*.006,.3));
      tone(130.8,.42,.12,'triangle');
      if(count===4){bell(2093,.46,.15,.55);tone(261.6,.64,.1,'sine',.14);tone(392,.6,.08,'sine',.18);}
    }else if(type==='loss'){
      tone(150,.28,.17,'triangle',0,45);tone(70,.35,.12,'sine',.04,30);
    }else if(type==='smash'){
      tone(115,.4,.25,'triangle',0,32);tone(180,.13,.07,'square',.03,55);tone(70,.48,.17,'sine',.04,27);
    }else if(type==='freeze'){
      [1000,1420,1730,2000].forEach((frequency,i)=>bell(frequency,i*.055,.075,.5));
    }else if(type==='power'){
      [523,784,1047].forEach((frequency,i)=>bell(frequency,i*.115,.19,.48));
      bell(1568,.35,.1,.55);
    }else if(type==='spell'){
      tone(400,.23,.12,'triangle',0,1100);[784,1047,1568].forEach((frequency,i)=>bell(frequency,.1+i*.065,.12,.28));
    }else if(type==='hungry'){
      tone(240,.105,.16,'triangle',0,190);tone(240,.105,.16,'triangle',.19,190);
    }else if(type==='urgent'){
      [330,392,440].forEach((frequency,i)=>{tone(frequency,.095,.16,'triangle',i*.14,frequency*.85);});
    }else if(type==='banana'){
      bell(440,0,.13,.22);bell(660,.12,.15,.34);tone(165,.18,.075,'triangle',.07,130);
    }else if(type==='win'){
      [392,523,659,784,1047].forEach((frequency,i)=>bell(frequency,i*.12,.19,.5));
      tone(196,.75,.1,'triangle',.18);tone(261.6,.65,.09,'sine',.38);
    }else if(type==='lose'){
      [392,330,262].forEach((frequency,i)=>bell(frequency,i*.18,.13,.4));
    }
  }
  return {
    start,play,get enabled(){return on;},
    setEnabled(value){on=!!value;if(!on){stopVoices();contextAction('suspend');}else if(!paused)start();},
    pause(){paused=true;stopVoices();contextAction('suspend');},resume:start,
    dispose(){if(disposed)return;disposed=true;stopVoices();contextAction('close');},
  };
}
