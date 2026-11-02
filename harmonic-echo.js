import { ECHO_INSTRUMENTS, ECHO_MODES, readEchoProgress, echoTarget, createEcho, startEcho, pressEcho, stepEcho, pauseEcho, resumeEcho, reviewEcho, recordEcho } from './harmonic-engine.js';
import { createEchoAudio } from './harmonic-audio.js';
import { echoInstrumentArt, echoMark } from './harmonic-art.js';
import { readEchoSettings, echoCoinGuide, echoRewardTotal } from './harmonic-config.js';
import { createHarmonicCustomizer } from './harmonic-customizer.js';
import { getArcadeWallet } from './arcade/wallet.js';
import { createRewardSession, mountGameWallet } from './arcade/game-services.js';
import { createEchoFinale } from './harmonic-finale.js';

const STORE='cooper-harmonic-echo-v2';
const svg=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const ICONS={play:svg('<path d="m8 4 12 8-12 8Z"/>'),pause:svg('<path d="M8 4v16M16 4v16"/>'),sound:svg('<path d="m10 5-5 4H2v6h3l5 4Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'),listen:svg('<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>'),hand:svg('<path d="M8 12V5a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v5c0 5-11 8-14 2l-3-5a2 2 0 0 1 3-2l2 2"/>'),repeat:svg('<path d="M19 7a8 8 0 1 0 1 9M19 3v5h-5"/>'),award:svg('<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>')};
const instrument=id=>ECHO_INSTRUMENTS.find(i=>i.id===id);

export function createHarmonicEcho(root,{editorOnly=false}={}){
  if(editorOnly)return createHarmonicCustomizer(root);
  let progress;try{progress=readEchoProgress(localStorage.getItem(STORE));}catch{progress=readEchoProgress();}
  const wallet=getArcadeWallet();
  const wrapper=document.createElement('section');wrapper.className='he-game';wrapper.setAttribute('aria-label','Harmonic Echo music memory game');wrapper.setAttribute('aria-live','off');
  wrapper.innerHTML=`
    <header class="he-hero"><div><p class="he-eyebrow">THE LISTENING ROOM</p><h3>Listen closely.<br>Make it a memory.</h3><p>A small ensemble. A growing melody.<br> Listen to the instruments, then play them back in order.</p></div><div class="he-hero-mark">${echoMark()}<span>HARMONIC / ECHO</span></div></header>
    <div class="he-settings"><div class="he-modes" role="group" aria-label="Memory difficulty">${Object.entries(ECHO_MODES).map(([key,m])=>`<button type="button" data-mode="${key}" aria-pressed="false"><b>${m.name}</b><span>${m.voices} instruments</span></button>`).join('')}</div><div class="he-audio-controls"><button type="button" data-action="sound" aria-label="Mute sound">${ICONS.sound}</button><label>Volume <output>65%</output><input type="range" min="0" max="100" step="1" value="65" aria-label="Sound volume"></label></div></div>
    <p class="he-mode-help"></p>
    <div class="he-run-options"><label>Rounds to win <input type="number" min="3" max="30" step="1" value="${progress.targets[progress.mode]}" aria-label="Rounds to win" aria-describedby="he-length-help"></label><p id="he-length-help">Choose 3-30 rounds. Each round adds one note; the final melody has this many notes.</p><a href="#characters/harmonic">Customize instruments &rarr;</a></div>
    <div class="he-studio" tabindex="0" aria-label="Instrument studio. Number keys 1 to 7 play instruments. P pauses. Press Start playing to begin.">
      <div class="he-console"><div class="he-phase-indicator">${ICONS.listen}</div><div class="he-console-heading"><p class="he-console-label">SOUND CHECK</p><h4>Meet your instruments.</h4></div><canvas class="he-wave" width="440" height="90" aria-hidden="true"></canvas><div class="he-round"><span>ROUND</span><strong>00 <small>/ 20</small></strong></div></div>
      <div class="he-message-row"><p class="he-status" role="status" aria-live="polite"></p><span class="he-note-label" aria-hidden="true"></span></div>
      <div class="he-steps" role="progressbar" aria-label="Progress through this melody" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"></div>
      <div class="he-pad-grid" role="group" aria-label="Musical instruments"></div>
      <div class="he-transport"><div><button type="button" data-action="start" class="he-primary">${ICONS.play}<span>Start playing</span></button><button type="button" data-action="pause" disabled>${ICONS.pause}<span>Pause</span></button></div><p class="he-input-hint">Tap any instrument to hear its voice.</p></div>
      <div class="he-paused" role="dialog" aria-label="Melody paused" hidden><div class="he-pause-card">${ICONS.pause}<p class="he-eyebrow">TAKE A BREATHER</p><h4>Your melody is waiting.</h4><p>Resume to hear the current round again from the beginning.</p><button type="button" class="he-primary" data-action="resume">Resume melody</button></div></div>
    </div>
    <div class="he-session"><div><span>BEST FOR THIS LENGTH</span><strong class="he-best">0 <small>notes</small></strong></div><div><span>THIS RUN</span><strong class="he-cleared">0 <small>rounds complete</small></strong></div><div class="he-goal"><span class="he-goal-label">20 NOTES TO MASTER</span><div><span></span></div></div></div>
    <section class="he-result" aria-live="polite" hidden></section>
    <details class="he-guide"><summary>How to play <span>One new note. One longer memory.</span></summary><div><section><h4>1. Listen and look</h4><p>Press Start playing. The instruments light up and play a melody. Each round keeps the same melody and adds one note to the end. Repeated instruments count as separate notes.</p></section><section><h4>2. Echo the order</h4><p>Wait for Your turn, then tap the instruments in the same order, or use number keys 1-7. You do not need to match the rhythm, and there is no time limit for answering. A wrong instrument ends the run.</p></section><section><h4>3. Choose your challenge</h4><p>Set Rounds to win to any number from 3 to 30. Complete that many growing melodies to win. Easy uses 3 instruments; Normal uses 4. Hard starts with 5; each Hard win adds a bonus pad to your next Hard run, up to 7.</p></section><section><h4>Earn your next instrument</h4><p>Completed rounds pay 1 coin on Easy, 2 on Normal, or 3 on Hard. A win doubles that run's total. Coins bank when you win or miss. Individual notes, sound checks, replays, and abandoned runs earn nothing. Use the shared shop to buy voices, then arrange them in the customization library.</p></section><section><h4>Practice with your ears</h4><p>Before a run, tap any available instrument to hear its distinct voice. After a run, Listen again replays the melody without changing your result or coins. P pauses; resume replays the current round. Lights also work with sound muted.</p></section></div><p class="he-save-note">Records save separately for each difficulty and run length. Hard unlocks, your ensemble, and sound settings save in this browser. Changing difficulty or run length starts over and discards unbanked coins.</p></details>`;
  root.append(wrapper);
  const unmountWallet=mountGameWallet(wrapper,'harmonic');
  const $=s=>wrapper.querySelector(s),abort=new AbortController(),on=(node,event,fn)=>node.addEventListener(event,fn,{signal:abort.signal}),studio=$('.he-studio'),audio=createEchoAudio({enabled:progress.sound,volume:progress.volume});
  const wave=$('.he-wave'),context=wave.getContext('2d'),samples=new Float32Array(512),motion=matchMedia('(prefers-reduced-motion: reduce)');
  let state=freshState(),disposed=false,frame=0,last=0,phaseBefore='',starting=false,revision=0,flash=null,flashUntil=0,glowUntil=0,glowColor='#adcfc8',visualWidth=440,visualHeight=90,dpr=1,resultKey='',inputCount=-1,reward=null,bankMessage='',banked=false;
  const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(progress));}catch{}};
  function focusResult(){if(disposed)return;$('.he-result [data-action="review"]')?.focus({preventScroll:true});$('.he-result').scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'nearest'});}
  const finale=createEchoFinale(wrapper,{audio,onDone:focusResult,onSoundChange:value=>{audio.setEnabled(value);progress.sound=value;save();if(value)audio.start();sync();}});
  function freshState(){return createEcho({...progress,...readEchoSettings(wallet.getState().owned)});}
  function playNote(id,options){return audio.play(id,{...options,frequency:ECHO_INSTRUMENTS[state.lineup.indexOf(id)]?.frequency});}
  function renderPads(){
    $('.he-pad-grid').innerHTML=state.lineup.map((id,index)=>{const i=instrument(id),pitch=ECHO_INSTRUMENTS[index].note;return `<button type="button" class="he-pad" data-instrument="${i.id}" style="--voice:${i.color}" aria-label="${i.name}, ${pitch}. Key ${index+1}"><span class="he-pad-top"><kbd>${index+1}</kbd><span class="he-pad-led" aria-hidden="true"></span></span><span class="he-art">${echoInstrumentArt(i.id)}</span><span class="he-pad-caption"><strong>${i.name}</strong><span>${pitch}</span></span><span class="he-pad-description">${i.description}</span><span class="he-pad-ripple" aria-hidden="true"></span></button>`;}).join('');
  }
  function resize(){const r=wave.getBoundingClientRect();visualWidth=Math.max(1,r.width);visualHeight=Math.max(1,r.height);dpr=Math.min(2,devicePixelRatio||1);wave.width=Math.round(visualWidth*dpr);wave.height=Math.round(visualHeight*dpr);}
  const observer=new ResizeObserver(resize);observer.observe(wave);resize();
  function clearFlash(){wrapper.querySelectorAll('.is-lit,.is-wrong').forEach(el=>el.classList.remove('is-lit','is-wrong'));flash=null;flashUntil=0;}
  function illuminate(id,duration=.32,wrong=false){clearFlash();const pad=$(`[data-instrument="${id}"]`);if(!pad)return;pad.classList.add(wrong?'is-wrong':'is-lit');flash=id;flashUntil=performance.now()+duration*1000;glowUntil=flashUntil+180;glowColor=instrument(id).color;studio.style.setProperty('--he-playing',glowColor);}
  function makeSteps(){const count=state.sequence.length;$('.he-steps').innerHTML=Array.from({length:Math.max(1,count)},(_,i)=>`<span data-step="${i}" aria-hidden="true"></span>`).join('');$('.he-steps').setAttribute('aria-valuemax',String(Math.max(1,count)));inputCount=-1;}
  function updateSteps(){
    const index=state.phase==='listen'||state.phase==='review'?state.playIndex:state.input;
    const stamp=state.phase+':'+index;if(inputCount===stamp)return;inputCount=stamp;
    const viewing=state.phase==='listen'||state.phase==='review';
    $('.he-steps').querySelectorAll('span').forEach((dot,i)=>{dot.classList.toggle('is-done',!viewing&&i<state.input);dot.classList.toggle('is-current',viewing&&i===state.playIndex-1);dot.classList.toggle('is-missed',state.phase==='lost'&&i===state.mistake?.index);});
    $('.he-steps').setAttribute('aria-valuenow',String(index));
  }
  function result(){
    const visible=['won','lost','review'].includes(state.phase),panel=$('.he-result');panel.hidden=!visible;if(!visible){resultKey='';return;}
    const won=!state.mistake,key=[won,state.completed,state.sequence.join(),state.voices,progress.unlocked].join(':');
    if(resultKey!==key){resultKey=key;const nextVoice=state.mode==='hard'&&won&&state.voices<7?instrument(state.lineup[state.voices]):null;
      panel.dataset.outcome=won?'win':'loss';panel.innerHTML=`<div class="he-result-emblem">${won?ICONS.award:ICONS.listen}</div><div><p class="he-eyebrow">${won?'A PERFECT ENCORE':'EVERY MELODY TAKES PRACTICE'}</p><h4>${won?'Sequence mastered.':'One note off.'}</h4><p>${won?`You remembered all ${state.completed} notes in order. ${nextVoice?`${nextVoice.name} joins your next Hard run.`:'Your ensemble is in perfect harmony.'}`:`${state.completed} ${state.completed===1?'round':'rounds'} completed. At note ${state.mistake.index+1}, you played ${instrument(state.mistake.played).name}; the next instrument was ${instrument(state.mistake.expected).name}.`}</p><div class="he-recap" aria-label="The melody in order">${state.sequence.map((id,i)=>`<span style="--voice:${instrument(id).color}" class="${!won&&i===state.mistake.index?'is-expected':''}"><small>${i+1}</small>${instrument(id).name}</span>`).join('')}</div><div class="he-result-actions"><button type="button" data-action="review">${ICONS.listen}<span>Listen again</span></button><button type="button" data-action="start" class="he-primary">${ICONS.repeat}<span>${won?'Play another run':'Try again'}</span></button></div></div>`;
    }
    if(!$('.he-earned')){const p=document.createElement('p');p.className='he-earned';panel.querySelector('.he-result-actions').before(p);}
    if(!$('[data-action="finale"]')){const b=document.createElement('button');b.type='button';b.dataset.action='finale';b.textContent='Replay finale';panel.querySelector('.he-result-actions').append(b);}
    $('[data-action="finale"]').disabled=state.phase==='review';
    $('.he-earned').textContent=bankMessage;
    const review=$('[data-action="review"]');review.disabled=state.phase==='review';review.querySelector('span').textContent=state.phase==='review'?'Listening...':'Listen again';
  }
  function sync(){
    const mode=ECHO_MODES[state.mode],active=['ready','listen','input','between','review'].includes(state.phase),listening=state.phase==='listen'||state.phase==='review';
    wrapper.dataset.phase=state.phase;wrapper.dataset.paused=String(state.paused);studio.dataset.phase=state.paused?'paused':state.phase;
    wrapper.querySelectorAll('[data-mode]').forEach(b=>{const key=b.dataset.mode;b.setAttribute('aria-pressed',String(key===state.mode));b.querySelector('span').textContent=`${ECHO_MODES[key].voices+(key==='hard'?progress.unlocked:0)} instruments`;});
    const description=state.mode==='hard'?`${state.voices} instruments with a quicker phrase. ${state.voices<7?'Win to add a bonus voice.':'The complete ensemble is unlocked.'}`:mode.description;
    $('.he-mode-help').textContent=description;
    if(document.activeElement!==$('[aria-label="Rounds to win"]'))$('[aria-label="Rounds to win"]').value=String(state.target);
    $('.arcade-game-wallet>span').textContent=`${mode.name}: ${echoCoinGuide(state.mode,state.target)}`;
    $('[data-action="sound"]').setAttribute('aria-label',audio.enabled?'Mute sound':'Enable sound');$('[data-action="sound"]').setAttribute('aria-pressed',String(audio.enabled));
    $('.he-audio-controls output').textContent=`${Math.round(progress.volume*100)}%`;
    $('.he-pad-grid').dataset.voices=String(state.voices);
    wrapper.querySelectorAll('[data-instrument]').forEach((b,i)=>{b.hidden=i>=state.voices;b.disabled=state.paused||starting||!['idle','input','won','lost'].includes(state.phase);});
    const phases={idle:['SOUND CHECK','Meet your instruments.','Tap an instrument to hear it, or start a run.'],ready:['GET READY','A melody is on its way.','Listen first. Your turn begins when the lights change.'],listen:['LISTEN','Let the melody settle.','Watch the instruments and remember their order.'],input:['YOUR TURN','Play it back.','Repeat the melody in order. Take your time.'],between:['ROUND COMPLETE','Beautifully remembered.','The next round adds one new note to the end.'],won:['SEQUENCE MASTERED','An encore for your memory.','Every note remembered. Your result is below.'],lost:['RUN COMPLETE','A little closer each time.','Review the missed note below, then try another melody.'],review:['LISTEN AGAIN','One more listen.','This replay is for practice. Your result stays the same.']};
    const [label,title,message]=phases[state.phase];$('.he-console-label').textContent=state.paused?'PAUSED':label;$('.he-console-heading h4').textContent=state.paused?'Take a breath.':title;
    $('.he-status').textContent=state.paused?'Resume to replay the current round.':message;
    $('.he-note-label').textContent=state.phase==='input'?`${state.input} / ${state.sequence.length} echoed`:listening?`NOTE ${state.playIndex} / ${state.sequence.length}`:audio.available?'':'Audio unavailable - follow the lights.';
    $('.he-phase-indicator').innerHTML=state.phase==='input'?ICONS.hand:state.phase==='won'?ICONS.award:ICONS.listen;
    $('.he-round strong').innerHTML=`${String(state.sequence.length).padStart(2,'0')} <small>/ ${state.target}</small>`;
    const primary=$('.he-transport [data-action="start"]');primary.querySelector('span').textContent=state.phase==='idle'?'Start playing':state.phase==='won'?'Play again':state.phase==='lost'?'Try again':'Restart';primary.disabled=starting;
    $('[data-action="pause"]').disabled=!active;$('[data-action="pause"] span').textContent=state.paused?'Resume':'Pause';$('[data-action="pause"]').setAttribute('aria-label',state.paused?'Resume melody':'Pause melody');
    $('.he-input-hint').textContent=state.phase==='idle'?'Tap a pad for a sound check.':state.phase==='input'?`Tap the pads or use keys 1-${state.voices}.`:'Listen first. The pads open on your turn.';
    $('.he-best').innerHTML=`${progress.bestByTarget[state.mode][state.target]} <small>notes</small>`;$('.he-cleared').innerHTML=`${state.completed} <small>${state.completed===1?'round complete':'rounds complete'}</small>`;$('.he-goal-label').textContent=`${state.target} NOTES TO MASTER`;$('.he-goal>div>span').style.width=`${state.completed/state.target*100}%`;
    $('.he-paused').hidden=!state.paused;updateSteps();result();
  }
  function record(){progress=recordEcho(progress,state);save();}
  function bank(){
    if(banked||!reward)return;banked=true;const finished=state,total=echoRewardTotal(state);
    bankMessage=total?`Saving ${total} coins to your shared wallet...`:'No coins this run. Complete a whole melody to earn a round reward.';
    reward.award(state).then(result=>{if(disposed||state!==finished)return;bankMessage=total?`${result.coins} coins added to your shared wallet. ${state.completed} completed ${state.completed===1?'round':'rounds'}${state.mistake?'':', plus the completion bonus'}.`:bankMessage;sync();}).catch(()=>{if(disposed||state!==finished)return;bankMessage='Your coins could not be saved. Please check browser storage.';sync();});
  }
  async function begin(){
    if(starting||finale.active)return;starting=true;const current=++revision;audio.stop();clearFlash();state=freshState();reward=createRewardSession('harmonic',wallet);banked=false;bankMessage='';renderPads();makeSteps();sync();await audio.start();
    if(disposed||current!==revision)return;starting=false;startEcho(state);if(document.hidden)pauseEcho(state);makeSteps();sync();studio.scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'center'});studio.focus({preventScroll:true});
  }
  function resetSetup(){finale.cancel();revision++;starting=false;audio.stop();clearFlash();save();state=freshState();reward=null;banked=false;bankMessage='';renderPads();makeSteps();sync();}
  function setMode(mode){if(!Object.hasOwn(ECHO_MODES,mode))return;progress.mode=mode;resetSetup();}
  function pause(){if(state.paused){resumeEcho(state);audio.start();clearFlash();inputCount=-1;sync();studio.focus({preventScroll:true});}else if(pauseEcho(state)){audio.stop();clearFlash();sync();$('[data-action="resume"]').focus({preventScroll:true});}}
  function playPad(id){
    if(disposed||starting||state.paused||finale.active)return;
    if(['idle','won','lost'].includes(state.phase)){if(!state.lineup.slice(0,state.voices).includes(id))return;playNote(id,{duration:.5});illuminate(id,.42);return;}
    const answer=pressEcho(state,id);if(!answer.accepted)return;playNote(id,{duration:ECHO_MODES[state.mode].noteLength});illuminate(id,.3,!answer.correct);
    if(answer.roundComplete)record();
    if(answer.finished){record();bank();}
    sync();
    if(answer.roundComplete||answer.finished)studio.focus({preventScroll:true});
    if(answer.finished){clearFlash();finale.show(state);}
  }
  on(wrapper,'pointerdown',event=>{const pad=event.target.closest('[data-instrument]');if(!pad||pad.disabled||event.button!==0)return;event.preventDefault();studio.focus({preventScroll:true});playPad(pad.dataset.instrument);});
  on(wrapper,'click',event=>{const b=event.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.instrument){if(event.detail===0)playPad(b.dataset.instrument);return;}
    if(b.dataset.mode){setMode(b.dataset.mode);return;}
    const action=b.dataset.action;if(action==='start')begin();if(action==='pause'||action==='resume')pause();
    if(action==='sound'){audio.setEnabled(!audio.enabled);progress.sound=audio.enabled;save();if(audio.enabled)audio.start();sync();}
    if(action==='finale'){audio.start();finale.show(state);}
    if(action==='review'&&reviewEcho(state)){audio.stop();audio.start();clearFlash();inputCount=-1;sync();studio.scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'nearest'});studio.focus({preventScroll:true});}
  });
  const volume=$('[aria-label="Sound volume"]');volume.value=String(Math.round(progress.volume*100));
  on($('[aria-label="Rounds to win"]'),'change',event=>{const value=Number(event.target.value);if(!event.target.checkValidity()){event.target.reportValidity();event.target.value=String(state.target);return;}progress.targets[progress.mode]=echoTarget(value,progress.mode);resetSetup();});
  on(volume,'input',()=>{progress.volume=Number(volume.value)/100;audio.setVolume(progress.volume);save();$('.he-audio-controls output').textContent=`${volume.value}%`;});
  on(wrapper,'keydown',event=>{
    if(finale.active||event.repeat||event.metaKey||event.ctrlKey||event.altKey||event.target.matches('input,select,textarea'))return;
    if(state.paused&&event.code==='Tab'){event.preventDefault();$('[data-action="resume"]').focus();return;}
    if(event.target.closest('button')&&['Enter','Space'].includes(event.code))return;
    const match=/^(?:Digit|Numpad)([1-7])$/.exec(event.code);
    if(match){event.preventDefault();playPad(state.lineup[Number(match[1])-1]);}
    if(['KeyP','Escape'].includes(event.code)){event.preventDefault();pause();}
    if(event.code==='Space'){event.preventDefault();if(['idle','won','lost'].includes(state.phase))begin();else pause();}
  });
  on(window,'blur',()=>{if(pauseEcho(state)){audio.stop();clearFlash();sync();}});
  on(document,'visibilitychange',()=>{if(document.hidden){audio.stop();clearFlash();if(pauseEcho(state))sync();}});
  function draw(now){
    context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,visualWidth,visualHeight);audio.waveform(samples);
    const strength=state.paused?0:Math.max(0,Math.min(1,(glowUntil-now)/450)),mid=visualHeight/2;
    const light=document.documentElement.dataset.theme==='light';
    context.strokeStyle=light?'#3e6e631f':'#8ab4b41c';context.lineWidth=1;for(let x=0;x<visualWidth;x+=18){context.beginPath();context.moveTo(x,mid-19);context.lineTo(x,mid+19);context.stroke();}
    for(const [offset,alpha] of [[0,1],[4,.15]]){
      context.beginPath();context.strokeStyle=light?(strength?'#316b62':'#609285'):(strength?glowColor:'#6eaaa6');context.globalAlpha=alpha;context.lineWidth=offset?4:1.5;
      for(let i=0;i<160;i++){const x=i/159*visualWidth,envelope=Math.sin(i/159*Math.PI),live=samples[Math.floor(i/160*samples.length)]||0;
        const fallback=Math.sin(i*.24+(motion.matches?0:now*.005))*Math.sin(i*.075)*strength*.1;
        const y=mid+(motion.matches?Math.sin(i*.2)*strength*13:(Math.abs(live)>.0001?live:fallback)*visualHeight*2)*envelope; i?context.lineTo(x,y):context.moveTo(x,y);
      }context.stroke();
    }context.globalAlpha=1;
  }
  function loop(now){if(disposed)return;const dt=last?Math.min(.08,(now-last)/1000):0;last=now;
    const events=stepEcho(state,dt);
    for(const e of events){if(e.type==='note'){playNote(e.id,{duration:e.duration});illuminate(e.id,ECHO_MODES[state.mode].noteLength);inputCount=-1;}if(e.type==='round'){makeSteps();clearFlash();}if(e.type==='input'){clearFlash();inputCount=-1;}}
    if(flash&&now>=flashUntil)clearFlash();
    const phase=state.phase+state.paused;if(events.length||phase!==phaseBefore){phaseBefore=phase;sync();}
    draw(now);frame=requestAnimationFrame(loop);
  }
  renderPads();makeSteps();sync();frame=requestAnimationFrame(loop);
  return ()=>{disposed=true;revision++;finale.dispose();cancelAnimationFrame(frame);observer.disconnect();abort.abort();audio.dispose();unmountWallet();wrapper.remove();};
}
