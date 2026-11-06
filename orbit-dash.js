import { ORBIT_LEVELS, ORBIT_SECTORS, ORBIT_TARGET, createOrbit, startOrbit, dashOrbit, stepOrbit, pauseOrbit, orbitCue, readOrbitSave } from './orbit-engine.js';
import { createOrbitRenderer } from './orbit-renderer.js';
import { createOrbitAudio } from './orbit-audio.js';

const STORE='cooper-orbit-dash-v2';
const icon=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const icons={ship:icon('<path d="m12 2 6 16-6-3-6 3Z M9 19l3 3 3-3"/>'),sound:icon('<path d="m10 4-5 5H2v6h3l5 5ZM15 8a6 6 0 0 1 0 8m3-12a11 11 0 0 1 0 16"/>'),expand:icon('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>'),shield:icon('<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/>'),star:icon('<path d="m12 2 3 6 7 2-5 5 1 7-6-4-6 4 1-7-5-5 7-2Z"/>')};

export function createOrbitDash(root){
  let saved;try{saved=readOrbitSave(localStorage.getItem(STORE));}catch{saved=readOrbitSave();}
  const wrapper=document.createElement('section');wrapper.className='od-game';wrapper.setAttribute('aria-label','Orbit Dash flight deck');wrapper.setAttribute('aria-live','off');
  wrapper.innerHTML=`
    <header class="od-intro"><div><p class="od-eyebrow">A SMALL SHIP. A BIG UNIVERSE.</p><h3>Find your orbit.</h3><p>Follow the arc. Find your moment. Dash for the stars.</p></div><div class="od-insignia">${icons.ship}<span>ORBITAL<br>FLIGHT DECK</span></div></header>
    <div class="od-setup"><div><span class="od-label">FLIGHT DIFFICULTY</span><div class="od-levels" role="group" aria-label="Flight difficulty">${Object.entries(ORBIT_LEVELS).map(([id,l])=>`<button type="button" data-level="${id}" aria-pressed="false">${l.name}</button>`).join('')}</div></div><label class="od-mode">FLIGHT PLAN<select aria-label="Flight plan"><option value="expedition">Expedition / 18 gates</option><option value="endless">Endless / personal best</option></select></label></div>
    <p class="od-difficulty-note"></p>
    <div class="od-flight">
      <div class="od-instruments"><div class="od-destination"><span class="od-label">SECTOR <b class="od-sector-number">01</b></span><strong class="od-sector-name">The blue frontier</strong></div><div class="od-reading"><span class="od-label">GATES</span><strong class="od-gates">00 <small>/ 18</small></strong></div><div class="od-reading"><span class="od-label">SCORE</span><strong class="od-score">0</strong></div><div class="od-hull"><span class="od-label">SHIELDS</span><div aria-label="3 shields remaining"></div></div></div>
      <div class="od-stage" tabindex="0" aria-label="Orbit flight area. Space, Arrow Up, or tap to dash. P to pause.">
        <canvas aria-label="Your spacecraft circles a planet. A gold launch arc on your orbit marks when to dash through the outer gate."></canvas>
        <div class="od-stage-top"><span>LIVE / ORBITAL TELEMETRY</span><span class="od-chain">BUILD A CLEAN STREAK</span></div>
        <div class="od-feedback" aria-hidden="true"></div>
        <div class="od-overlay"><div class="od-overlay-card"><div class="od-overlay-icon">${icons.ship}</div><p class="od-eyebrow">READY FOR DEPARTURE</p><h4>One orbit.<br>Perfect timing.</h4><p>Your ship flies itself. Tap once in the gold launch arc to jump through the gate.</p><button type="button" data-action="start" class="od-primary">Launch expedition ${icons.ship}</button><small>SPACE / UP ARROW / TAP</small></div></div>
        <div class="od-signal"><div><span class="od-signal-dot"></span><strong>AWAITING LAUNCH</strong></div><span class="od-signal-detail">18 gates. Three destinations.</span><div class="od-approach"><span></span></div></div>
      </div>
      <div class="od-flight-controls"><button type="button" class="od-dash od-primary" data-action="dash" disabled>${icons.ship}<span>Dash</span><kbd>SPACE</kbd></button><button type="button" data-action="pause" disabled>Pause</button><button type="button" data-action="sound" aria-label="Mute sound" aria-pressed="true">${icons.sound}<span>Sound on</span></button><button type="button" data-action="expand" aria-label="Expand flight view" aria-pressed="false">${icons.expand}<span>Expand</span></button></div>
    </div>
    <p class="od-status" role="status" aria-live="polite"></p>
    <div class="od-records"><div><span class="od-label">PERSONAL BEST / THIS FLIGHT PLAN</span><strong class="od-best">0</strong></div><div><span class="od-label">PERFECT PASSES</span><strong class="od-perfect">0</strong></div><div><span class="od-label">LONGEST CLEAN STREAK</span><strong class="od-streak">0</strong></div><button type="button" data-action="reset">New flight</button></div>
    <section class="od-how"><div><span>01 / FOLLOW</span><h4>Your ship flies clockwise.</h4><p>Look ahead for the gold bracket gate on the outer rail. The gold arc on your inner orbit marks your launch window.</p></div><div><span>02 / DASH</span><h4>One tap. One leap.</h4><p>Press Space, Up Arrow, or tap the flight area when <b>DASH NOW</b> appears. Your ship jumps out, crosses the gate, and returns automatically. Holding does not repeat.</p></div><div><span>03 / EXPLORE</span><h4>Keep your shields intact.</h4><p>Early, late, or missed gates cost one shield. Every six gates restore one shield. Clear 18 to finish an expedition, or chase a record in Endless.</p></div></section>
    <details class="od-guide"><summary>Scoring &amp; flight tips</summary><p>A pass earns 100 points, or 150 for the bright center of the launch arc. Every three consecutive passes raise your multiplier, up to x5. A miss resets the streak. Speed builds gradually; Hard and Expert also have gently drifting gates. Best scores are saved separately for each difficulty and flight plan.</p><p>The gold arc accounts for your ship's travel time. Tap there, before you reach the gate itself. P pauses; leaving this tab pauses automatically. Sound and expanded view are optional.</p></details>`;
  root.append(wrapper);
  const $=s=>wrapper.querySelector(s),stage=$('.od-stage'),flight=$('.od-flight'),canvas=$('canvas'),motion=matchMedia('(prefers-reduced-motion: reduce)'),renderer=createOrbitRenderer(canvas),audio=createOrbitAudio(saved.sound),controller=new AbortController();
  let state=createOrbit(saved),raf=0,last=0,disposed=false,endElapsed=0,overlayKey='',feedbackUntil=0,savedResult=false,expanded=false,lastCue='',uiStamp='';
  const on=(el,event,fn)=>el.addEventListener(event,fn,{signal:controller.signal});
  function save(){try{localStorage.setItem(STORE,JSON.stringify(saved));}catch{/* Play remains available with storage disabled. */}}
  function focusFlight(){stage.focus({preventScroll:true});}
  function overlay(){
    const visible=state.phase==='idle'||state.paused||(['won','lost'].includes(state.phase)&&endElapsed>.95);
    const panel=$('.od-overlay');panel.hidden=!visible;
    if(!visible)return;
    const key=state.paused?'paused':state.phase;if(overlayKey===key)return;overlayKey=key;
    let eyebrow,title,copy,button,detail,emblem=icons.ship;
    if(key==='idle'){eyebrow='READY FOR DEPARTURE';title='One orbit.<br> Perfect timing.';copy='Your ship flies itself. Tap once in the gold launch arc to jump through the gate.';button=state.mode==='expedition'?'Launch expedition':'Launch endless flight';detail='SPACE / UP ARROW / TAP';}
    else if(key==='paused'){eyebrow='FLIGHT PAUSED';title='Take a breath.';copy='Your ship and your timing window are right where you left them.';button='Resume flight';detail='P TO RESUME';}
    else{const won=key==='won';eyebrow=won?'EXPEDITION COMPLETE':'FLIGHT RECORDER';title=won?'The stars are yours.':'Another orbit awaits.';copy=won?'Three destinations. Eighteen gates. One excellent pilot.':state.result;button='Fly again';detail=`${state.gates} GATES / ${state.perfect} PERFECT / ${state.score.toLocaleString()} POINTS`;emblem=won?icons.star:icons.shield;}
    panel.dataset.outcome=key;panel.innerHTML=`<div class="od-overlay-card"><div class="od-overlay-icon">${emblem}</div><p class="od-eyebrow">${eyebrow}</p><h4>${title}</h4><p>${copy}</p><button type="button" data-action="${key==='paused'?'resume':'start'}" class="od-primary">${button} ${icons.ship}</button><small>${detail}</small></div>`;
  }
  function sync(){
    wrapper.dataset.phase=state.phase;wrapper.dataset.paused=String(state.paused);
    $('.od-mode select').value=saved.mode;
    const running=state.phase==='playing';$('.od-mode select').disabled=running;
    wrapper.querySelectorAll('[data-level]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.level===saved.difficulty));b.disabled=running;});
    $('.od-difficulty-note').textContent=ORBIT_LEVELS[saved.difficulty].description+' '+(running?'Finish this flight or choose New flight to change the setup.':'Choose your flight, then launch.');
    $('.od-sector-number').textContent=String(state.sector+1).padStart(2,'0');$('.od-sector-name').textContent=ORBIT_SECTORS[state.sector%3].name;
    $('.od-gates').innerHTML=`${String(state.gates).padStart(2,'0')} <small>${state.mode==='expedition'?'/ '+ORBIT_TARGET:'/ ENDLESS'}</small>`;
    $('.od-score').textContent=state.score.toLocaleString();$('.od-perfect').textContent=state.perfect;$('.od-streak').textContent=state.bestStreak;
    $('.od-hull>div').innerHTML=Array.from({length:ORBIT_LEVELS[state.difficulty].hull},(_,i)=>`<span class="${i<state.hull?'':'is-empty'}">${icons.shield}</span>`).join('');$('.od-hull>div').setAttribute('aria-label',`${state.hull} shields remaining`);
    $('.od-best').textContent=(saved.best[`${state.difficulty}:${state.mode}`]||0).toLocaleString();
    $('.od-status').textContent=state.paused?'Flight paused. Resume when you are ready.':state.notice;
    $('[data-action="pause"]').disabled=!running;$('[data-action="pause"]').textContent=state.paused?'Resume':'Pause';
    $('[data-action="sound"] span').textContent=saved.sound?'Sound on':'Sound off';$('[data-action="sound"]').setAttribute('aria-label',saved.sound?'Mute sound':'Enable sound');$('[data-action="sound"]').setAttribute('aria-pressed',String(saved.sound));
    $('.od-chain').textContent=state.streak?`${state.streak} CLEAN / x${Math.min(5,1+Math.floor((state.streak-1)/3))} STREAK`:'BUILD A CLEAN STREAK';
    overlay();
  }
  function fresh(){state=createOrbit(saved);renderer.reset();audio.stop();savedResult=false;endElapsed=0;overlayKey='';uiStamp='';feedbackUntil=0;$('.od-feedback').textContent='';last=0;sync();}
  function begin(){fresh();startOrbit(state);audio.play('start');sync();focusFlight();}
  function dash(){if(dashOrbit(state)){audio.play('dash');focusFlight();}}
  function pause(){if(pauseOrbit(state)){audio.stop();sync();if(!state.paused){audio.start();focusFlight();}}}
  function expand(value=!expanded){expanded=value;flight.classList.toggle('is-expanded',expanded);document.body.classList.toggle('od-view-expanded',expanded);$('[data-action="expand"]').setAttribute('aria-pressed',String(expanded));$('[data-action="expand"]').setAttribute('aria-label',expanded?'Exit expanded flight view':'Expand flight view');$('[data-action="expand"] span').textContent=expanded?'Exit view':'Expand';focusFlight();}
  on(wrapper,'click',e=>{
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='start')begin();if(action==='dash'&&e.detail===0)dash();if(action==='pause'||action==='resume')pause();if(action==='reset')fresh();if(action==='expand')expand();
    if(action==='sound'){saved.sound=!saved.sound;save();audio.setEnabled(saved.sound);sync();}
    const level=e.target.closest('[data-level]')?.dataset.level;if(level&&state.phase!=='playing'){saved.difficulty=level;save();fresh();}
  });
  on($('.od-mode select'),'change',e=>{saved.mode=e.target.value;save();fresh();});
  on(wrapper,'pointerdown',e=>{if(e.button!==0||e.target.closest('.od-overlay'))return;if(e.target.closest('[data-action="dash"]')||e.target===canvas){e.preventDefault();dash();}});
  on(wrapper,'keydown',e=>{
    if(e.target.matches('select,input,textarea')||e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
    if(e.code==='Escape'&&expanded){e.preventDefault();expand(false);return;}
    if(e.code==='KeyP'){e.preventDefault();pause();return;}
    if(e.code==='Space'||e.code==='ArrowUp'){
      // Let focused menus and overlay buttons retain their native keyboard action.
      if(e.target.closest('button')&&!e.target.closest('[data-action="dash"]'))return;
      e.preventDefault();if(state.phase==='idle')begin();else dash();
    }
  });
  function autoPause(){if(state.phase==='playing'&&!state.paused){pauseOrbit(state,true);audio.stop();sync();}}
  on(document,'visibilitychange',()=>{last=0;if(document.hidden)autoPause();});on(window,'blur',autoPause);
  function tick(timestamp){
    if(disposed)return;const dt=last?Math.min(.1,(timestamp-last)/1000):0;last=timestamp;
    if(!document.hidden){
      stepOrbit(state,dt);
      for(const event of state.events.splice(0)){
        renderer.event(event,motion.matches);
        if(event.type!=='dash')audio.play(event.type==='pass'&&event.perfect?'perfect':event.type);
        if(event.type==='pass'||event.type==='miss'||event.type==='sector'){
          $('.od-feedback').textContent=event.type==='pass'?`${event.perfect?'PERFECT':'CLEAR'} +${event.points}`:event.type==='sector'?'NEW SECTOR / +1 SHIELD':'SHIELD LOST';$('.od-feedback').dataset.kind=event.type;feedbackUntil=timestamp+950;
        }
      }
      if(['won','lost'].includes(state.phase)){
        endElapsed+=dt;
        if(!savedResult){savedResult=true;const key=`${state.difficulty}:${state.mode}`;saved.best[key]=Math.max(saved.best[key]||0,state.score);save();sync();}
      }
      $('.od-feedback').classList.toggle('is-visible',timestamp<feedbackUntil);
      const cue=orbitCue(state),signal=$('.od-signal');signal.dataset.ready=String(cue.ready);
      const label=state.paused?'FLIGHT PAUSED':state.phase==='idle'?'AWAITING LAUNCH':state.phase==='won'?'EXPEDITION COMPLETE':state.phase==='lost'?'SIGNAL LOST':state.dash?'DASH IN PROGRESS':!state.gate?'PLOTTING NEXT GATE':cue.ready?'DASH NOW':cue.error<0?'WINDOW PASSED':'APPROACHING GATE';
      if(label!==lastCue){lastCue=label;signal.querySelector('strong').textContent=label;}
      $('.od-signal-detail').textContent=cue.ready?(cue.perfect?'Perfect center. Tap!':'In the launch window. Tap!'):state.phase==='idle'?(state.mode==='expedition'?'18 gates. Three destinations.':'How far can you fly?'):state.phase!=='playing'?'Your flight is recorded.':state.paused?'Your orbit is on hold.':state.dash?'Returning to orbit automatically.':!state.gate?'Resetting your approach.':cue.error<0?'Watch for the next gate.':`Launch window in ${cue.seconds.toFixed(1)}s`;
      $('.od-approach span').style.width=`${cue.ready?100:Math.max(0,100-cue.seconds/2.5*100)}%`;
      const dashButton=$('[data-action="dash"]');dashButton.disabled=state.phase!=='playing'||state.paused||!!state.dash||!state.gate;dashButton.classList.toggle('is-ready',cue.ready);dashButton.querySelector('span').textContent=cue.ready?'Dash now':state.phase==='playing'&&state.dash&&!state.paused?'Dashing...':'Dash';
      const stamp=[state.phase,state.paused,state.score,state.hull,state.sector,state.notice].join(':');if(stamp!==uiStamp){uiStamp=stamp;sync();}else overlay();
      renderer.draw(state,dt,{light:document.documentElement.dataset.theme==='light',reduced:motion.matches});
    }
    raf=requestAnimationFrame(tick);
  }
  sync();raf=requestAnimationFrame(tick);
  return()=>{disposed=true;cancelAnimationFrame(raf);controller.abort();audio.dispose();document.body.classList.remove('od-view-expanded');wrapper.remove();};
}
