export function createTetrisAudio(enabled=true) {
  let ctx,master,on=enabled,disposed=false,lastMove=0;
  async function start(){if(!on||disposed)return;try{ctx||=new(window.AudioContext||window.webkitAudioContext)();if(!master){master=ctx.createGain();master.gain.value=.18;master.connect(ctx.destination);}if(ctx.state==='suspended')await ctx.resume();}catch{}}
  function tone(frequency,duration=.15,volume=.3,type='sine',delay=0,end=frequency){if(!on||!ctx||ctx.state!=='running'||disposed)return;const time=ctx.currentTime+delay,o=ctx.createOscillator(),gain=ctx.createGain();o.type=type;o.frequency.setValueAtTime(frequency,time);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),time+duration);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(gain);gain.connect(master);o.start(time);o.stop(time+duration+.02);o.onended=()=>{o.disconnect();gain.disconnect();};}
  function play(event){if(!on||disposed)return;const type=typeof event==='string'?event:event.type;
    if(type==='move'){if(performance.now()-lastMove<80)return;lastMove=performance.now();tone(260,.04,.08,'sine',0,310);}
    else if(type==='rotate'){tone(430,.075,.14,'sine',0,650);}
    else if(type==='land'||type==='release'){tone(type==='land'?150:280,.1,.18,'triangle',0,85);}
    else if(type==='clear'){[523,659,784,1047].slice(0,Math.min(4,(event.count||1)+1)).forEach((f,i)=>tone(f,.24,.28,'sine',i*.07));}
    else if(type==='loss'||type==='smash'){tone(120,.3,.26,'triangle',0,35);tone(70,.4,.16,'sine',.04,30);}
    else if(type==='freeze'){[1000,1420,1730].forEach((f,i)=>tone(f,.45,.12,'sine',i*.04,f*.9));}
    else if(type==='win'){[392,523,659,784,1047].forEach((f,i)=>tone(f,.5,.25,'sine',i*.12));}
    else if(type==='lose'){[392,330,262].forEach((f,i)=>tone(f,.4,.18,'sine',i*.18));}
    else if(type==='power'||type==='spell'||type==='banana'){tone(660,.24,.16,'sine',0,1100);tone(990,.3,.11,'sine',.08,1320);}
  }
  return {start,play,get enabled(){return on;},setEnabled(value){on=!!value;if(!on&&ctx)ctx.suspend();else start();},pause(){ctx?.suspend();},resume:start,dispose(){disposed=true;ctx?.close();}};
}
