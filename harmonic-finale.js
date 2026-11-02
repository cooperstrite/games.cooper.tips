import { ECHO_INSTRUMENTS } from './harmonic-config.js';
import { echoInstrumentArt } from './harmonic-art.js';

const clamp=(n,low=0,high=1)=>Math.max(low,Math.min(high,n));
const ease=n=>1-Math.pow(1-clamp(n),3);
const instrument=id=>ECHO_INSTRUMENTS.find(i=>i.id===id);

// A presentation-only snapshot. No scoring, records or wallet writes occur here.
export function createEchoFinalePlayback(state,{reducedMotion=false}={}){
  if(!['won','lost'].includes(state.phase))return null;
  const won=state.phase==='won';
  const ensemble=state.lineup.slice(0,state.voices).map((id,index)=>({...instrument(id),pitch:ECHO_INSTRUMENTS[index].frequency}));
  const expected=ensemble.find(i=>i.id===state.mistake?.expected)||ensemble[0];
  const played=ensemble.find(i=>i.id===state.mistake?.played)||ensemble[0];
  const cues=[];
  const note=(time,index,frequency,duration=.42,gain=.6)=>cues.push({time,id:ensemble[index].id,index,frequency,duration,gain});
  if(reducedMotion){
    note(.12,won?0:ensemble.indexOf(expected),won?261.6256:expected.pitch,.55,.55);
    if(won)note(.35,Math.min(2,ensemble.length-1),391.9954,.55,.4);
  }else if(won){
    ensemble.forEach((i,index)=>note(.32+index*.2,index,i.pitch,.4,.72));
    note(1.95,ensemble.length-1,523.2511,.6,.55);
    [261.6256,329.6276,391.9954,523.2511].forEach((pitch,index)=>note(2.38,index%ensemble.length,pitch,.85,.35));
    note(3.28,0,783.9909,.38,.35);note(3.53,Math.min(2,ensemble.length-1),1046.5023,.6,.25);
  }else{
    note(.2,ensemble.indexOf(played),played.pitch,.24,.38);
    note(.48,ensemble.indexOf(played),played.pitch*.75,.3,.25);
    note(1.52,ensemble.indexOf(expected),expected.pitch,.7,.72);
    note(2.6,ensemble.indexOf(expected),expected.pitch,.55,.38);
  }
  return {won,ensemble,expected,played,completed:state.completed,target:state.target,
    reducedMotion,duration:reducedMotion?1.65:won?5.8:4.8,cues:cues.sort((a,b)=>a.time-b.time),
    elapsed:0,nextCue:0,paused:false,done:false};
}

export function stepEchoFinale(playback,delta){
  if(!playback||playback.paused||playback.done||!Number.isFinite(delta)||delta<=0)return [];
  playback.elapsed=Math.min(playback.duration,playback.elapsed+Math.min(.08,delta));
  const cues=[];
  while(playback.nextCue<playback.cues.length&&playback.cues[playback.nextCue].time<=playback.elapsed)cues.push(playback.cues[playback.nextCue++]);
  playback.done=playback.elapsed>=playback.duration;
  return cues;
}

function random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}

export function createEchoFinale(root,{audio,onDone,onSoundChange}){
  const dialog=document.createElement('dialog');dialog.className='he-finale';dialog.setAttribute('aria-labelledby','he-finale-title');
  dialog.innerHTML=`<header class="he-finale-heading"><p class="he-eyebrow"></p><h4 id="he-finale-title"></h4><p class="he-finale-caption"></p></header>
    <div class="he-finale-stage" aria-hidden="true"><canvas></canvas><div class="he-finale-medal"><svg viewBox="0 0 120 120" fill="none"><circle cx="60" cy="60" r="49" stroke="currentColor" stroke-width="1" opacity=".4"/><circle cx="60" cy="60" r="43" stroke="currentColor" stroke-width="3"/><path class="he-finale-star" d="m60 21 11 24 27 3-20 18 5 27-23-13-23 13 5-27-20-18 27-3Z" fill="currentColor" opacity=".17"/><path d="M58 72V43l26-7v29M58 50l26-7" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><ellipse cx="49" cy="74" rx="10" ry="7" fill="currentColor" transform="rotate(-17 49 74)"/><ellipse cx="75" cy="67" rx="10" ry="7" fill="currentColor" transform="rotate(-17 75 67)"/></svg></div><div class="he-finale-ensemble"></div><p class="he-finale-stage-caption"></p></div>
    <footer class="he-finale-footer"><p class="he-finale-count"></p><div><button type="button" data-finale="sound"></button><button type="button" data-finale="pause">Pause clip</button><button type="button" data-finale="skip" class="he-primary">Skip to results</button></div></footer><div class="he-finale-progress" aria-hidden="true"><span></span></div>`;
  root.append(dialog);
  const $=s=>dialog.querySelector(s),canvas=$('canvas'),ctx=canvas.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController();
  const on=(node,event,fn)=>node.addEventListener(event,fn,{signal:abort.signal});
  let playback=null,frame=0,last=0,width=800,height=320,dpr=1,figures=[],lit=[],manualPause=false,away=false,disposed=false;
  const rng=random(791),sparkles=Array.from({length:100},()=>({x:rng(),y:rng(),speed:.3+rng(),size:1+rng()*2.4,phase:rng()*6.28}));
  const confetti=Array.from({length:125},()=>({x:rng(),vx:(rng()-.5)*1.1,vy:-.45-rng()*.85,turn:rng()*6.28,speed:1+rng()*4,size:3+rng()*4,color:Math.floor(rng()*4)}));
  function resize(){const box=canvas.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);if(playback)draw();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  function soundButton(){const b=$('[data-finale="sound"]');b.textContent=audio.enabled?'Sound on':'Sound off';b.setAttribute('aria-pressed',String(audio.enabled));b.setAttribute('aria-label',audio.enabled?'Mute finale sound':'Enable finale sound');}
  function pause(value){if(!playback)return;playback.paused=value;last=0;dialog.dataset.paused=String(value);$('[data-finale="pause"]').textContent=value?'Resume clip':'Pause clip';if(value)audio.stop();else audio.start();}
  function close(notify=false){
    if(!playback)return;playback=null;cancelAnimationFrame(frame);frame=0;audio.stop();
    if(dialog.open)dialog.close();dialog.removeAttribute('open');
    if(notify&&!disposed)onDone();
  }
  function show(state){
    if(disposed)return false;close();playback=createEchoFinalePlayback(state,{reducedMotion:motion.matches});if(!playback)return false;
    const p=playback;manualPause=false;away=document.hidden;last=0;lit=p.ensemble.map(()=>-1);audio.stop();
    dialog.dataset.outcome=p.won?'win':'loss';dialog.dataset.paused='false';dialog.style.opacity='1';
    $('.he-eyebrow').textContent=p.won?'THE PERFECT ENCORE':'EVERY MELODY TAKES PRACTICE';
    $('#he-finale-title').textContent=p.won?'Perfect harmony.':'One note off.';
    $('.he-finale-caption').textContent=p.won?'Every note remembered. This moment is yours.':'A little closer with every listen.';
    $('.he-finale-count').textContent=`${p.completed} / ${p.target} rounds completed`;
    $('[data-finale="pause"]').hidden=p.reducedMotion;$('[data-finale="pause"]').textContent='Pause clip';
    $('.he-finale-ensemble').innerHTML=p.ensemble.map((i,index)=>`<div class="he-finalist" style="--voice:${i.color}"><div>${echoInstrumentArt(i.id,`finale-${index}-${i.id}`)}</div><span>${i.name}</span></div>`).join('');
    figures=[...dialog.querySelectorAll('.he-finalist')];soundButton();
    try{dialog.showModal();}catch{close();onDone();return false;}
    resize();draw();$('[data-finale="skip"]').focus({preventScroll:true});if(away)pause(true);frame=requestAnimationFrame(loop);return true;
  }
  function noteGlyph(x,y,size,angle,color,alpha=1){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(size,size);ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(2,6);ctx.lineTo(2,-12);ctx.lineTo(10,-15);ctx.stroke();ctx.beginPath();ctx.ellipse(-2,7,5,3,-.3,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function draw(){
    if(!playback)return;const p=playback,t=p.reducedMotion?3:p.elapsed,light=document.documentElement.dataset.theme==='light',w=width,h=height;
    const gold=light?'#a67c35':'#e6c989',mint=light?'#448777':'#9ed6c3',ink=light?'#476a5a':'#b2cfbf';
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    // Feathered stage lighting, acoustic wall ribs and a polished elliptical floor.
    for(let x=0;x<w;x+=22){ctx.strokeStyle=light?'#7d9a8820':'#abc5af0b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h*.71);ctx.stroke();}
    for(const side of [-1,1]){
      const sway=p.reducedMotion?0:Math.sin(t*.65+side)*w*.04,top=w*(side<0?.12:.88),center=w*.5+sway+side*w*.17;
      const beam=ctx.createLinearGradient(top,0,center,h*.8);beam.addColorStop(0,light?'#d8c59038':'#ecd49424');beam.addColorStop(1,'#c9d9ac00');ctx.fillStyle=beam;
      ctx.beginPath();ctx.moveTo(top-10,0);ctx.lineTo(center-w*.19,h*.87);ctx.lineTo(center+w*.19,h*.87);ctx.lineTo(top+10,0);ctx.closePath();ctx.fill();
    }
    const floor=ctx.createRadialGradient(w*.5,h*.81,2,w*.5,h*.81,w*.53);floor.addColorStop(0,light?'#ffffff':'#31554e');floor.addColorStop(.6,light?'#d8e2d3':'#1b3c3c');floor.addColorStop(1,light?'#b9cab8':'#102a32');
    ctx.fillStyle=light?'#91a88b55':'#041a22';ctx.beginPath();ctx.ellipse(w*.5,h*.83,w*.49,h*.19,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=floor;ctx.beginPath();ctx.ellipse(w*.5,h*.79,w*.49,h*.19,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=light?'#bca774':'#9f8d6066';ctx.lineWidth=1.4;ctx.stroke();
    ctx.strokeStyle=light?'#ffffff99':'#bdcfb124';ctx.beginPath();ctx.ellipse(w*.5,h*.78,w*.43,h*.14,0,0,Math.PI*2);ctx.stroke();
    for(const star of sparkles){
      const alpha=(.2+.2*Math.sin(star.phase+t*star.speed))*(p.won?1:.45);ctx.globalAlpha=alpha;ctx.fillStyle=gold;
      const y=(star.y*h*.75-(p.reducedMotion?0:t*9*star.speed)+h)%h;ctx.beginPath();ctx.arc(star.x*w,y,star.size*.6,0,Math.PI*2);ctx.fill();
    }ctx.globalAlpha=1;
    // A flowing five-line musical staff lifts into the victory seal.
    const resolve=p.won?ease((t-.25)/1.5):1-ease((t-.4)/1.1);
    for(let row=0;row<5;row++){
      ctx.beginPath();ctx.strokeStyle=gold;ctx.globalAlpha=.16*resolve;ctx.lineWidth=.8;
      for(let i=0;i<=100;i++){const x=i/100*w,y=h*.44+Math.sin(i/100*6.28+t*.65)*h*.075+(row-2)*7;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
    }ctx.globalAlpha=1;
    for(let i=0;i<12;i++){
      const base=i/11*w,x=p.won?base+(w*.5-base)*ease((t-1.35)/1.4):base;
      const y=p.won?h*.46+Math.sin(i*.8+t)*h*.06-ease((t-1.35)/1.4)*h*.27:h*.43+Math.pow(Math.max(0,t-.5),2)*h*.22;
      const alpha=p.won?clamp(t/.5)*(1-ease((t-2.1)/.6)):clamp(1-(t-.7)/.8);
      noteGlyph(x,y,w<400?.65:.9,p.won?Math.sin(t+i)*.12:(t-.5)*(i%2?1:-1),i%2?gold:mint,alpha*.75);
    }
    // A warm confetti burst, timed to the resolving chord; no rapid flashes.
    if(p.won&&!p.reducedMotion&&t>2.32){
      const age=t-2.32,colors=[gold,mint,light?'#bc8ca0':'#dfb4ca',light?'#88a0bc':'#a6bfd7'];
      for(const piece of confetti){const x=w*(.5+piece.vx*age),y=h*(.28+piece.vy*age*.6+.18*age*age);if(y>h+20)continue;
        ctx.save();ctx.translate(x,y);ctx.rotate(piece.turn+age*piece.speed);ctx.globalAlpha=clamp((5.7-t)/.7)*.8;ctx.fillStyle=colors[piece.color];ctx.fillRect(-piece.size/2,0,piece.size,Math.max(1,Math.cos(age*3+piece.turn)*piece.size*.5));ctx.restore();}
    }
    const entry=p.reducedMotion?1:ease(t/.65),focus=p.won?0:ease((t-.85)/.9),n=figures.length;
    figures.forEach((figure,index)=>{
      const key=p.ensemble[index],position=n===1?.5:.11+index/(n-1)*.78,expected=key.id===p.expected.id;
      const pulse=p.reducedMotion?0:Math.max(0,1-(p.elapsed-lit[index])/.55),baseWidth=Math.min(155,w/(n+1)*1.25);
      const expectedIndex=p.ensemble.indexOf(p.expected),sideIndex=index<expectedIndex?index:index-1;
      const wingPosition=sideIndex%2===0?.12+Math.floor(sideIndex/2)*.12:.88-Math.floor(sideIndex/2)*.12;
      const x=p.won?position:expected?position+(.5-position)*focus:position+(wingPosition-position)*focus;
      const y=.62+Math.sin(index/(n-1||1)*Math.PI)*.11-(p.won||expected?0:focus*.09);
      figure.style.width=`${baseWidth}px`;figure.style.left=`${x*100}%`;figure.style.top=`${(y+(1-entry)*.18-(expected&&!p.won?focus*.07:0))*100}%`;
      const size=entry*(p.won?1+pulse*.07:expected?1+focus*(Math.min(200,w*.52)/baseWidth-1):1-focus*.2);
      figure.style.transform=`translate(-50%,-50%) scale(${size})`;figure.style.opacity=String(entry*(p.won||expected?1:1-focus*.87));figure.style.zIndex=String(!p.won&&expected?2:1);
      figure.classList.toggle('is-playing',pulse>0);figure.style.setProperty('--pulse',pulse);
      ctx.globalAlpha=(p.won?.16+pulse*.4:expected?.2+focus*.3:.1)*entry;ctx.strokeStyle=key.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x*w,(y+.13)*h,baseWidth*.47,9+pulse*7,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
    });
    const medal=$('.he-finale-medal'),rise=p.reducedMotion?1:ease((t-(p.won?1.65:1.1))/.75);
    medal.style.opacity=String(rise);medal.style.transform=`translate(-50%,-50%) scale(${.6+rise*.4}) rotate(${p.won?(1-rise)*-20:0}deg)`;
    $('.he-finale-stage-caption').textContent=p.won?(t>2.3?'A melody worth celebrating.':'Your ensemble takes a bow.'):t>1.25?`The next instrument was ${p.expected.name}.`:'The melody slips out of tune.';
    $('.he-finale-stage-caption').style.color=ink;
    $('.he-finale-progress>span').style.width=`${p.elapsed/p.duration*100}%`;
    dialog.style.opacity=String(p.reducedMotion?1:clamp((p.duration-p.elapsed)/.3));
  }
  function loop(now){
    if(!playback||disposed)return;const dt=last?(now-last)/1000:0;last=now;
    for(const cue of stepEchoFinale(playback,dt)){lit[cue.index]=playback.elapsed;audio.play(cue.id,{frequency:cue.frequency,duration:cue.duration,gain:cue.gain});}
    draw();if(playback.done){close(true);return;}frame=requestAnimationFrame(loop);
  }
  on(dialog,'cancel',event=>{event.preventDefault();close(true);});
  on(dialog,'click',event=>{const action=event.target.closest('[data-finale]')?.dataset.finale;
    if(action==='skip')close(true);
    if(action==='sound'){onSoundChange(!audio.enabled);soundButton();}
    if(action==='pause'){manualPause=!manualPause;pause(manualPause||away);}
  });
  on(window,'blur',()=>{if(playback){away=true;pause(true);}});
  on(window,'focus',()=>{if(playback&&!document.hidden){away=false;pause(manualPause);}});
  on(document,'visibilitychange',()=>{if(playback){away=document.hidden;pause(manualPause||away);}});
  on(motion,'change',()=>{if(playback&&motion.matches)close(true);});
  return {show,cancel:()=>close(),get active(){return !!playback;},dispose(){disposed=true;close();observer.disconnect();abort.abort();dialog.remove();}};
}
