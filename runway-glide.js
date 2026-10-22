import { AIRCRAFT, APPROACHES, KNOTS, FEET, clamp, createFlight, advanceFlight, flightInstruments, startGoAround, towerGuidance } from "./runway-engine.js";
import { createRunwayRenderer } from "./runway-renderer.js";
import { createRunwayAudio } from "./runway-audio.js";

const SAVE_KEY = "cooper-runway-glide-v2";
const activePhases = ["flying", "rollout", "goaround"];
function readSave() {
  try { const data=JSON.parse(localStorage.getItem(SAVE_KEY)||"{}");return data&&typeof data==="object"?data:{}; } catch { return {}; }
}
const icon = name => {
  const shapes={
    passenger:'<path d="M60 4Q65 9 65 28L109 49V57L65 46V63L79 72V77L60 72L41 77V72L55 63V46L11 57V49L55 28Q55 9 60 4Z"/><path d="M36 43V55M84 43V55" stroke-width="6"/>',
    cargo:'<path d="M60 5Q67 10 67 29L112 38V48L67 43V65L83 71V77L60 74L37 77V71L53 65V43L8 48V38L53 29Q53 10 60 5Z"/><path d="M24 33V50M42 31V49M78 31V49M96 33V50" stroke-width="5"/>',
    bush:'<path d="M60 8L65 23V30L110 34V44L65 42L63 66L78 70V76L60 73L42 76V70L57 66L55 42L10 44V34L55 30V23Z"/><path d="M45 16H75M48 45V54M72 45V54" stroke-width="3"/>',
    military:'<path d="M60 3L66 27L77 35L108 65L106 71L76 61L83 77L65 72L60 77L55 72L37 77L44 61L14 71L12 65L43 35L54 27Z"/><path d="M53 49L50 68M67 49L70 68" stroke="#b5c4ca" stroke-width="3"/>',
  };
  return `<svg viewBox="0 0 120 82" fill="currentColor" stroke="currentColor" stroke-linejoin="round" aria-hidden="true">${shapes[name]}</svg>`;
};

export function createRunwayGlide(root) {
  const saved=readSave();
  const settings={aircraft:AIRCRAFT[saved.aircraft]?saved.aircraft:"passenger",level:APPROACHES.some(l=>l.id===saved.level)?saved.level:"training",assist:saved.assist!==false,guides:saved.guides!==false,invertPitch:saved.invertPitch===true,voice:saved.voice!==false,effects:saved.effects!==false,towerVoice:typeof saved.towerVoice==="string"?saved.towerVoice:"auto"};
  const records=saved.records&&typeof saved.records==="object"?saved.records:{};
  let state=createFlight(settings.aircraft,settings.level,settings.assist),renderer=null,disposed=false,paused=false,frame=0,last=0,uiElapsed=0,view="chase",loading=true;
  let guidanceKey="",guidanceTime=-20,lastCaption="",lastPhase="ready";
  const keys=new Set(),touch={pitch:0,roll:0,rudder:0,brake:false},listeners=[];
  const audio=createRunwayAudio(settings);
  const wrapper=document.createElement("section");wrapper.className="rg-game";wrapper.setAttribute("aria-label","Runway Glide flight simulator");wrapper.setAttribute("aria-live","off");
  wrapper.innerHTML=`
    <div class="rg-topline"><span class="rg-brand"><span class="rg-brand-mark" aria-hidden="true">RG</span> FLIGHT OPERATIONS</span><span class="rg-beta">3D FLIGHT</span></div>
    <div class="rg-stage" tabindex="0" aria-label="3D flight view. W and S change pitch; A and D bank. Full controls below.">
      <canvas class="rg-canvas" aria-label="Your aircraft on final approach"></canvas>
      <div class="rg-loading" role="status"><span class="rg-loader"></span><strong>Preparing the approach</strong><span>Loading aircraft and airfield...</span></div>
      <div class="rg-flight-header"><div><span class="rg-micro rg-location"></span><strong class="rg-callout">READY FOR APPROACH</strong></div><span class="rg-view-label">CHASE CAMERA</span></div>
      <div class="rg-instruments rg-instruments-left"><div><span>AIRSPEED <small>KT</small></span><strong data-readout="speed">138</strong><small data-readout="target"></small></div><div><span>POWER</span><strong data-readout="power">48<span>%</span></strong></div></div>
      <div class="rg-instruments rg-instruments-right"><div><span>HEIGHT <small>FT AGL</small></span><strong data-readout="altitude">350</strong><small data-readout="sink"></small></div><div><span>THRESHOLD</span><strong data-readout="distance">1.9<span>KM</span></strong></div></div>
      <div class="rg-aim" aria-hidden="true"><span class="rg-aim-wing"></span><span class="rg-aim-dot"></span><span class="rg-aim-wing"></span></div>
      <div class="rg-flight-director"><span class="rg-director-label">GLIDE PATH</span><div class="rg-director-track"><i class="rg-director-pip"></i></div><span class="rg-director-text">ON PATH</span></div>
      <div class="rg-cockpit" hidden><div class="rg-cockpit-frame"></div><div class="rg-cockpit-panel"><span>GLIDE ONE</span><span class="rg-attitude"></span><span>FLIGHT DIRECTOR</span></div></div>
      <div class="rg-weather"><span class="rg-wind-arrow" aria-hidden="true">&#8599;</span><span data-readout="wind"></span></div>
      <div class="rg-attitude-strip"><span data-readout="pitch"></span><span data-readout="bank"></span><span data-readout="heading"></span></div>
      <div class="rg-paused" hidden><strong>Flight paused</strong><span>Press P or Resume when you are ready.</span></div>
      <div class="rg-result" hidden><span class="rg-micro">FLIGHT DEBRIEF</span><h3></h3><p class="rg-result-reason"></p><div class="rg-result-metrics"></div><div class="rg-result-actions"><button type="button" class="rg-primary rg-retry">Fly again</button><button type="button" class="rg-next">Next approach</button></div></div>
    </div>
    <div class="rg-tower"><span class="rg-tower-icon" aria-hidden="true">ATC</span><div><span class="rg-micro">TOWER / 121.80 <span class="rg-voice-status"></span></span><p class="rg-caption" role="status" aria-live="polite">Choose your aircraft and approach. Tower will guide you from final approach to a full stop.</p></div></div>
    <div class="rg-toolbar"><button type="button" class="rg-primary rg-start" disabled>Start approach</button><button type="button" class="rg-pause" disabled>Pause</button><button type="button" class="rg-goaround" disabled>Go around <kbd>Space</kbd></button><button type="button" class="rg-hangar" hidden>Return to setup</button><label class="rg-camera-label">Camera <select class="rg-camera"><option value="chase">Chase</option><option value="cockpit">Cockpit</option><option value="tower">Tower</option></select></label><button type="button" class="rg-fullscreen" aria-label="Toggle full screen flight view">Expand view</button></div>
    <div class="rg-flight-controls"><label class="rg-throttle">Throttle <output>48%</output><input type="range" min="0" max="100" step="1" value="48" aria-label="Throttle"><span>IDLE <span>FULL POWER</span></span></label><div class="rg-switches"><button type="button" data-toggle="gear" aria-pressed="true">Gear DOWN <kbd>G</kbd></button><button type="button" data-toggle="flaps" aria-pressed="true">Flaps LAND <kbd>F</kbd></button><button type="button" data-toggle="hook" aria-pressed="false" hidden>Hook UP <kbd>H</kbd></button><button type="button" class="rg-brake" data-hold="brake" aria-label="Hold wheel brakes">Hold brake <kbd>B</kbd></button></div></div>
    <div class="rg-touch-controls" aria-label="Touch flight controls"><div><button type="button" data-hold="rudder" data-value="-1" aria-label="Rudder left">Rudder L</button><button type="button" data-hold="rudder" data-value="1" aria-label="Rudder right">Rudder R</button></div><div class="rg-pad"><button type="button" data-hold="pitch" data-value="1" aria-label="Raise nose">Nose up</button><button type="button" data-hold="roll" data-value="-1" aria-label="Bank left">Bank left</button><button type="button" data-hold="roll" data-value="1" aria-label="Bank right">Bank right</button><button type="button" data-hold="pitch" data-value="-1" aria-label="Lower nose">Nose down</button></div></div>
    <div class="rg-control-preferences"><label><input type="checkbox" data-setting="invertPitch" aria-describedby="rg-pitch-help"> Inverted flight controls</label><p id="rg-pitch-help" class="rg-pitch-help"></p></div>
    <div class="rg-setup">
      <div class="rg-section-heading"><div><span class="rg-micro">01 / THE AIRCRAFT</span><h3>Choose your approach to flying.</h3></div><span class="rg-setup-hint">Each aircraft handles differently.</span></div>
      <div class="rg-aircraft-grid" role="group" aria-label="Choose aircraft">${Object.values(AIRCRAFT).map(a=>`<button type="button" class="rg-aircraft-card" data-aircraft="${a.id}" aria-pressed="false"><span class="rg-plane-silhouette rg-silhouette-${a.id}" aria-hidden="true">${icon(a.id)}</span><span class="rg-micro">${a.badge}</span><strong>${a.name}</strong><span>${a.type}</span><small>${Math.round(a.target*KNOTS)} KT APPROACH</small></button>`).join("")}</div>
      <div class="rg-aircraft-detail"><strong class="rg-aircraft-name"></strong><p class="rg-aircraft-description"></p><span class="rg-aircraft-landing"></span></div>
      <div class="rg-section-heading"><div><span class="rg-micro">02 / THE DESTINATION</span><h3>Eight ways to earn your landing.</h3></div><label>Approach <select class="rg-mission-select" aria-label="Choose approach">${APPROACHES.map((l,j)=>`<option value="${l.id}">${String(j+1).padStart(2,"0")} / ${l.name}</option>`).join("")}</select></label></div>
      <div class="rg-mission-panel"><div class="rg-mission-art"><span class="rg-mission-number">09</span><span class="rg-mission-lines"></span><span class="rg-mission-badge">TRAINING</span></div><div class="rg-mission-brief"><span class="rg-micro rg-mission-location"></span><h4 class="rg-mission-title"></h4><p class="rg-mission-tip"></p><div class="rg-mission-facts"></div><p class="rg-record"></p></div></div>
    </div>
    <details class="rg-instructions" open><summary>Flight school <span>How to land</span></summary><div class="rg-lesson-grid"><div><b>01</b><strong>Line up</strong><p>Follow the green diamonds toward the runway. Use small bank corrections, then level your wings. Q / E rudder makes fine heading adjustments. Counter the wind to stop sideways drift.</p></div><div><b>02</b><strong>Manage the approach</strong><p>Use the throttle to hold the target airspeed. Raise or lower the nose to follow the glide path. Beside the runway, two white and two red PAPI lights mean you are on path; all white is high, all red is low.</p></div><div><b>03</b><strong>Flare, land, stop</strong><p>Just above the runway, gently raise the nose to slow your descent. Keep the wheels down and wings level. Once you touch down, reduce throttle to idle and hold B to brake. On the carrier, lower H for the hook and catch a wire.</p></div></div><div class="rg-keyboard"><span><kbd>W / &#8593;</kbd> Raise nose</span><span><kbd>S / &#8595;</kbd> Lower nose</span><span><kbd>A / D</kbd> Bank</span><span><kbd>Q / E</kbd> Rudder</span><span><kbd>+ / -</kbd> Throttle</span><span><kbd>G</kbd> Gear</span><span><kbd>F</kbd> Flaps</span><span><kbd>H</kbd> Hook</span><span><kbd>B</kbd> Brake</span><span><kbd>Space</kbd> Go around</span><span><kbd>P</kbd> Pause</span><span><kbd>C</kbd> Camera</span></div><p class="rg-school-note">Start with First approach and stability assist. It levels your wings, gently returns the nose to approach trim above flare height, and idles the throttle after touchdown. You still control the landing. If the approach is unsafe, go around for another attempt.</p></details>
    <div class="rg-options"><label><input type="checkbox" data-setting="assist"> Stability assist</label><label><input type="checkbox" data-setting="guides"> Approach guides</label><label><input type="checkbox" data-setting="voice"> Tower voice</label><label><input type="checkbox" data-setting="effects"> Sound effects</label><span class="rg-save-note">Flight records saved on this device.</span></div>
    <div class="rg-voice-options"><label>Tower voice <select class="rg-voice-select" aria-label="Tower voice"><option value="auto">Natural / Automatic</option></select></label><button type="button" class="rg-voice-preview">Listen to voice</button><span class="rg-voice-note">Natural voices available on your device.</span></div>
  `;
  root.appendChild(wrapper);
  const $=selector=>wrapper.querySelector(selector), $$=selector=>[...wrapper.querySelectorAll(selector)];
  const stage=$(".rg-stage"),canvas=$(".rg-canvas"),startButton=$(".rg-start"),pauseButton=$(".rg-pause"),result=$(".rg-result"),loadingPanel=$(".rg-loading"),caption=$(".rg-caption"),throttle=$(".rg-throttle input"),readouts=Object.fromEntries($$("[data-readout]").map(el=>[el.dataset.readout,el]));
  const on=(target,event,handler,options)=>{target.addEventListener(event,handler,options);listeners.push(()=>target.removeEventListener(event,handler,options));};
  function save() { try {localStorage.setItem(SAVE_KEY,JSON.stringify({...settings,aircraft:state.aircraft.id,level:state.level.id,records}));}catch{$(".rg-save-note").textContent="Storage unavailable; records last for this visit.";} }
  function announce(text,{urgent=false,speak=true,spoken=text}={}) {
    if(text!==lastCaption){caption.textContent=text;lastCaption=text;}
    if(speak)audio.speak(spoken,{urgent});
  }
  function clearInput(){keys.clear();touch.pitch=touch.roll=touch.rudder=0;touch.brake=false;$$("[data-hold]").forEach(el=>el.classList.remove("is-held"));}
  function updateSetup() {
    const a=state.aircraft,l=state.level;
    settings.aircraft=a.id;settings.level=l.id;
    $$("[data-aircraft]").forEach(button=>{const selected=button.dataset.aircraft===a.id;button.setAttribute("aria-pressed",String(selected));button.disabled=activePhases.includes(state.phase);});
    $(".rg-aircraft-name").textContent=`${a.name} / ${a.type}`;$(".rg-aircraft-description").textContent=a.description;$(".rg-aircraft-landing").textContent=a.landing;
    $(".rg-mission-select").value=l.id;$(".rg-mission-title").textContent=l.name;$(".rg-mission-location").textContent=l.location;$(".rg-mission-tip").textContent=l.tip;
    $(".rg-mission-art").dataset.scenery=l.scenery;$(".rg-mission-number").textContent=l.runway;$(".rg-mission-badge").textContent=l.level;
    $(".rg-mission-facts").replaceChildren(...[`${l.length.toLocaleString()} m ${l.id==="carrier"?"flight deck":"runway"}`,`${Math.round(Math.hypot(l.headwind,l.crosswind)*KNOTS)} kt wind${l.gust?" + gusts":""}`,l.traffic==="none"?"Clear approach":"Live air traffic",l.allowed.length===1?`${AIRCRAFT[l.allowed[0]].type} only`:"Multiple aircraft"].map(text=>{const span=document.createElement("span");span.textContent=text;return span;}));
    const best=records[`${l.id}:${a.id}`];$(".rg-record").textContent=Number.isFinite(best)?`PERSONAL BEST / ${best} out of 100`:`NO LANDING RECORDED / ${a.name}`;
    $(".rg-location").textContent=`${l.location} / ${a.name}`;
    $("[data-toggle=hook]").hidden=a.id!=="military";
    $$("[data-setting]").forEach(input=>{input.checked=settings[input.dataset.setting];});
    const upAction=settings.invertPitch?"Lower nose":"Raise nose",downAction=settings.invertPitch?"Raise nose":"Lower nose";
    $(".rg-pitch-help").textContent=settings.invertPitch?"Up / W lowers the nose. Down / S raises the nose. Touch buttons follow their labels.":"Up / W raises the nose. Down / S lowers the nose. Your preference is saved.";
    const pitchHelp=$$(".rg-keyboard > span").slice(0,2);
    pitchHelp[0].lastChild.textContent=` ${upAction}`;pitchHelp[1].lastChild.textContent=` ${downAction}`;
    stage.setAttribute("aria-label",`3D flight view. Up arrow or W: ${upAction.toLowerCase()}. Down arrow or S: ${downAction.toLowerCase()}. A and D bank. Full controls below.`);
    $(".rg-voice-status").textContent=audio.voiceAvailable?(settings.voice?"VOICE + CAPTIONS":"CAPTIONS"):"CAPTIONS / VOICE UNAVAILABLE";
    save();
  }
  function configure(aircraftId,levelId,{message=""}={}) {
    audio.pause();clearInput();paused=false;state=createFlight(aircraftId,levelId,settings.assist);renderer?.setFlight(state);lastPhase="ready";guidanceKey="";guidanceTime=-20;result.hidden=true;updateSetup();updateUI();
    announce(message||`${state.level.name}. ${state.aircraft.landing}`,{speak:false});
  }
  function begin() {
    if(loading||!renderer)return;
    if(state.phase!=="ready")configure(state.aircraft.id,state.level.id);
    state.phase="flying";paused=false;clearInput();guidanceTime=0;guidanceKey="briefing";
    audio.start();
    const i=flightInstruments(state);
    announce(`Glide One, welcome. Hold ${Math.round(i.targetKnots)} knots on final. ${state.level.traffic==="departure"?"Traffic is departing ahead. Continue your approach.":state.level.id==="carrier"?"Resolute has you in sight. Hook down. Follow the landing lights.":`You're cleared to land, runway ${state.level.runway}. Looking good.`}`,{urgent:true});
    updateSetup();updateUI();stage.focus({preventScroll:true});
    if(window.matchMedia("(max-width: 760px)").matches)stage.scrollIntoView({block:"start",behavior:"instant"});
  }
  function togglePause(force) {
    if(!activePhases.includes(state.phase))return;
    paused=typeof force==="boolean"?force:!paused;clearInput();
    if(paused)audio.pause();else{audio.start();audio.speak("Approach resumed.");}
    updateUI();
  }
  function equipment(name) {
    if(!["ready","flying"].includes(state.phase)||paused)return;
    if(name==="gear"&&state.aircraft.fixedGear)return;
    if(name==="gear")state.gear=!state.gear;
    if(name==="flaps")state.flaps=(state.flaps+1)%3;
    if(name==="hook"&&state.aircraft.id==="military")state.hook=!state.hook;
    audio.effect("gear");updateUI();
  }
  function cycleCamera(){const modes=["chase","cockpit","tower"];view=modes[(modes.indexOf(view)+1)%modes.length];$(".rg-camera").value=view;updateUI();}
  function goAround(){if(!paused&&startGoAround(state)){clearInput();updateUI();}}
  function showResult() {
    const r=state.result;if(!r)return;
    $(".rg-result h3").textContent=r.title;$(".rg-result-reason").textContent=r.reason;
    result.dataset.success=String(r.success);
    const td=state.touchdown;const stats=r.success?[["LANDING SCORE",`${r.score}/100`],["TOUCHDOWN",`${Math.round(td.impact*FEET*60)} ft/min`],["CENTERLINE",`${td.offset.toFixed(1)} m`]]:[["NEXT ATTEMPT","Learn & retry"],["AIRCRAFT",state.aircraft.name]];
    $(".rg-result-metrics").replaceChildren(...stats.map(([label,value])=>{const block=document.createElement("div"),span=document.createElement("span"),strong=document.createElement("strong");span.textContent=label;strong.textContent=value;block.append(span,strong);return block;}));
    if(r.success){const key=`${state.level.id}:${state.aircraft.id}`;records[key]=Math.max(Number(records[key])||0,r.score);save();}
    result.hidden=false;$(".rg-next").hidden=!r.success;audio.effect(r.success?"complete":"failed");announce(r.reason,{urgent:true});clearInput();updateSetup();
  }
  function updateUI() {
    const i=flightInstruments(state),active=activePhases.includes(state.phase);
    wrapper.dataset.phase=state.phase;wrapper.dataset.aircraft=state.aircraft.id;wrapper.dataset.level=state.level.id;wrapper.dataset.paused=String(paused);
    readouts.speed.textContent=Math.round(i.knots);readouts.target.textContent=`TARGET ${Math.round(i.targetKnots)} KT`;readouts.speed.classList.toggle("rg-caution",state.speed<state.aircraft.stall*1.15||state.speed>state.aircraft.target*1.2);
    readouts.altitude.textContent=Math.round(i.altitudeFeet).toLocaleString();readouts.sink.textContent=`${state.verticalSpeed>=0?"+":""}${Math.round(i.sinkFeet/10)*10} FT/MIN`;
    readouts.power.textContent=`${Math.round(state.throttle*100)}%`;readouts.distance.textContent=i.distance>999?`${(i.distance/1000).toFixed(1)} KM`:`${Math.round(i.distance)} M`;
    readouts.wind.textContent=`WIND ${Math.round(Math.hypot(i.wind.cross,i.wind.head)*KNOTS)} KT / ${Math.abs(i.wind.cross*KNOTS).toFixed(0)} KT ${i.wind.cross<0?"LEFT":"RIGHT"} DRIFT`;
    $(".rg-wind-arrow").style.transform=`rotate(${Math.atan2(i.wind.cross,-i.wind.head)/Math.PI*180-45}deg)`;
    readouts.pitch.textContent=`PITCH ${state.pitch.toFixed(1)}\u00b0`;readouts.bank.textContent=`BANK ${state.bank.toFixed(1)}\u00b0`;readouts.heading.textContent=`CRAB ${state.heading.toFixed(1)}\u00b0`;
    $(".rg-attitude").textContent=`${Math.round(i.knots)} KT / ${Math.round(i.altitudeFeet)} FT`;
    $(".rg-director-pip").style.transform=`translateX(${clamp(i.glideError*1.6,-45,45)}px)`;
    $(".rg-director-text").textContent=Math.abs(i.glideError)<5?"ON PATH":i.glideError>0?"HIGH / LOWER NOSE":"LOW / RAISE NOSE";
    $(".rg-flight-director").hidden=!settings.guides||!(["ready","flying"].includes(state.phase));
    $(".rg-callout").textContent=paused?"FLIGHT PAUSED":({ready:"READY FOR APPROACH",flying:i.flare?"FLARE / WINGS LEVEL":!i.runwayClear?"TRAFFIC DEPARTING":"FINAL APPROACH",rollout:state.wire?`WIRE ${state.wire} / ARRESTING`:"THROTTLE IDLE / HOLD BRAKE",goaround:"GO AROUND / CLIMBING",complete:"LANDING COMPLETE",crashed:"APPROACH ENDED"}[state.phase]);
    $(".rg-view-label").textContent=`${view.toUpperCase()} CAMERA`;$(".rg-cockpit").hidden=view!=="cockpit";$(".rg-aim").hidden=view!=="cockpit";
    $(".rg-paused").hidden=!paused;startButton.hidden=active;startButton.textContent=state.phase==="ready"?"Start approach":"Fly again";startButton.disabled=loading;
    pauseButton.disabled=!active;pauseButton.textContent=paused?"Resume":"Pause";$(".rg-goaround").disabled=paused||!["flying","rollout"].includes(state.phase);$(".rg-hangar").hidden=!active;
    $(".rg-mission-select").disabled=active;$$("[data-aircraft]").forEach(button=>{button.disabled=active;});
    throttle.value=Math.round(state.throttle*100);$(".rg-throttle output").textContent=`${Math.round(state.throttle*100)}%`;
    throttle.disabled=paused||["complete","crashed","goaround"].includes(state.phase);
    const gearButton=$("[data-toggle=gear]");
    gearButton.innerHTML=state.aircraft.fixedGear?"Gear DOWN / FIXED":`Gear ${state.gear?"DOWN":"UP"} <kbd>G</kbd>`;
    gearButton.setAttribute("aria-pressed",String(state.gear));
    gearButton.title=state.aircraft.fixedGear?"The bush plane has fixed landing gear. Its wheels stay down.":"Toggle landing gear (G)";
    $("[data-toggle=flaps]").innerHTML=`Flaps ${["UP","APPROACH","LAND"][state.flaps]} <kbd>F</kbd>`;$("[data-toggle=flaps]").setAttribute("aria-pressed",String(state.flaps>0));
    $("[data-toggle=hook]").innerHTML=`Hook ${state.hook?"DOWN":"UP"} <kbd>H</kbd>`;$("[data-toggle=hook]").setAttribute("aria-pressed",String(state.hook));
    $$("[data-toggle]").forEach(button=>{button.disabled=paused||!["ready","flying"].includes(state.phase)||(button.dataset.toggle==="gear"&&state.aircraft.fixedGear);});
    $$("[data-hold]").forEach(button=>{button.disabled=paused||!active;});
    $(".rg-brake").classList.toggle("is-held",state.braking);
  }
  on(startButton,"click",begin);on($(".rg-retry"),"click",begin);on(pauseButton,"click",()=>togglePause());on($(".rg-goaround"),"click",goAround);
  on($(".rg-hangar"),"click",()=>configure(state.aircraft.id,state.level.id));
  on($(".rg-next"),"click",()=>{const index=(APPROACHES.findIndex(l=>l.id===state.level.id)+1)%APPROACHES.length;configure(state.aircraft.id,APPROACHES[index].id);});
  on($(".rg-camera"),"change",event=>{view=event.target.value;updateUI();});
  on($(".rg-fullscreen"),"click",async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await wrapper.requestFullscreen();}catch{stage.classList.toggle("rg-expanded");renderer?.resize();}});
  on(throttle,"input",()=>{state.throttle=Number(throttle.value)/100;updateUI();});
  $$("[data-toggle]").forEach(button=>on(button,"click",()=>equipment(button.dataset.toggle)));
  $$("[data-aircraft]").forEach(button=>on(button,"click",()=>{
    const id=button.dataset.aircraft,compatible=state.level.allowed.includes(id),next=compatible?state.level.id:"training";
    configure(id,next,{message:compatible?"":`${AIRCRAFT[id].name} selected. First approach is ready; the previous runway requires a different aircraft.`});
  }));
  on($(".rg-mission-select"),"change",event=>{const l=APPROACHES.find(l=>l.id===event.target.value),id=l.allowed.includes(state.aircraft.id)?state.aircraft.id:l.allowed[0];configure(id,l.id,{message:l.allowed.length===1?`${l.name} uses the ${AIRCRAFT[id].name}. ${l.tip}`:""});});
  $$("[data-setting]").forEach(input=>on(input,"change",()=>{const key=input.dataset.setting;settings[key]=input.checked;if(key==="invertPitch")clearInput();state.assist=settings.assist;audio.setVoice(settings.voice);audio.setEffects(settings.effects);updateSetup();updateUI();}));
  function refreshVoices(){
    const select=$(".rg-voice-select");select.replaceChildren();
    const automatic=document.createElement("option");automatic.value="auto";automatic.textContent=`Natural / Automatic (${audio.selectedVoice()})`;select.append(automatic);
    for(const voice of audio.voices()){const option=document.createElement("option");option.value=voice.name;option.textContent=`${voice.name} / ${voice.lang}`;select.append(option);}
    select.value=[...select.options].some(option=>option.value===settings.towerVoice)?settings.towerVoice:"auto";
    select.disabled=!audio.voiceAvailable;$(".rg-voice-preview").disabled=!audio.voiceAvailable;
  }
  on($(".rg-voice-select"),"change",event=>{settings.towerVoice=event.target.value;audio.setTowerVoice(settings.towerVoice);save();});
  on($(".rg-voice-preview"),"click",()=>{settings.voice=true;audio.setVoice(true);audio.start();audio.speak("Glide One, welcome to Azure Bay. You're cleared to land, runway two seven. A little wind from the left. Take your time... looking good.",{urgent:true});updateSetup();});
  if(globalThis.speechSynthesis)on(speechSynthesis,"voiceschanged",refreshVoices);refreshVoices();
  $$("[data-hold]").forEach(button=>{
    const release=()=>{touch[button.dataset.hold]=button.dataset.hold==="brake"?false:0;button.classList.remove("is-held");};
    on(button,"pointerdown",event=>{event.preventDefault();if(paused||!activePhases.includes(state.phase))return;button.setPointerCapture(event.pointerId);touch[button.dataset.hold]=button.dataset.hold==="brake"?true:Number(button.dataset.value);button.classList.add("is-held");});
    on(button,"pointerup",release);on(button,"pointercancel",release);on(button,"lostpointercapture",release);
  });
  const controls=new Set(["KeyW","KeyS","KeyA","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyQ","KeyE","Equal","Minus","NumpadAdd","NumpadSubtract","PageUp","PageDown","KeyG","KeyF","KeyH","KeyB","Space","KeyP","KeyC"]);
  on(window,"keydown",event=>{
    if(!controls.has(event.code)||event.ctrlKey||event.metaKey||event.altKey||event.target.closest("input, select, textarea, [contenteditable=true]"))return;
    if(event.code==="Space"&&event.target.closest("button"))return;
    event.preventDefault();if(event.repeat)return;keys.add(event.code);
    if(event.code==="KeyP")togglePause();if(event.code==="KeyC")cycleCamera();if(event.code==="Space")goAround();if(["KeyG","KeyF","KeyH"].includes(event.code))equipment({KeyG:"gear",KeyF:"flaps",KeyH:"hook"}[event.code]);
  });
  on(window,"keyup",event=>keys.delete(event.code));on(window,"blur",()=>{clearInput();if(activePhases.includes(state.phase))togglePause(true);});
  on(document,"visibilitychange",()=>{if(document.hidden&&activePhases.includes(state.phase))togglePause(true);});
  on(canvas,"webglcontextlost",event=>{event.preventDefault();togglePause(true);announce("The graphics context was interrupted. Reload the page to restart the 3D engine; your records are saved.",{speak:false});});
  function input(){
    const down=(...codes)=>codes.some(code=>keys.has(code))?1:0;
    const keyboardPitch=(down("KeyW","ArrowUp")-down("KeyS","ArrowDown"))*(settings.invertPitch?-1:1);
    return {
      pitch:clamp(touch.pitch+keyboardPitch,-1,1),
      roll:clamp(touch.roll+down("KeyD","ArrowRight")-down("KeyA","ArrowLeft"),-1,1),
      rudder:clamp(touch.rudder+down("KeyE")-down("KeyQ"),-1,1),
      throttle:down("Equal","NumpadAdd","PageUp")-down("Minus","NumpadSubtract","PageDown"),
      brake:touch.brake||keys.has("KeyB"),
    };
  }
  function tick(now) {
    if(disposed)return;const dt=Math.min((now-last)/1000||0,.1);last=now;
    if(!paused&&renderer){
      advanceFlight(state,input(),dt);audio.update(state);
      for(const event of state.events.splice(0)){
        if(event.type==="touchdown"){renderer.touchdown(state);audio.effect("touchdown");const guidance=towerGuidance(state);announce(guidance.text,{urgent:true,spoken:guidance.spoken});}
        if(event.type==="wire"){audio.effect("wire");announce(`Wire ${event.wire} caught. Welcome aboard the Resolute.`,{urgent:true});}
        if(event.type==="goaround"){audio.effect("warning");announce(event.reason,{urgent:true});guidanceTime=state.time;}
        if(event.type==="new-approach"){renderer.setFlight(state);guidanceTime=-20;guidanceKey="";announce("Glide One, back on final. Set up for another approach.",{urgent:true});}
      }
      if(state.phase!==lastPhase){if(["complete","crashed"].includes(state.phase))showResult();lastPhase=state.phase;updateUI();}
      if(state.phase==="flying"){
        const guidance=towerGuidance(state),urgent=["stall","gear","hook","flare"].includes(guidance.key),interval=urgent?4:9;
        if(guidance.key!==guidanceKey&&state.time-guidanceTime>interval){announce(guidance.text,{urgent,spoken:guidance.spoken||guidance.text});guidanceKey=guidance.key;guidanceTime=state.time;}
      }
    }
    if(renderer){renderer.render(state,dt,{cameraView:view,guides:settings.guides,paused});}
    uiElapsed+=dt;if(uiElapsed>.1){updateUI();uiElapsed=0;}
    frame=requestAnimationFrame(tick);
  }
  updateSetup();updateUI();
  createRunwayRenderer(canvas,{isCurrent:()=>!disposed}).then(value=>{
    if(disposed){value.dispose();return;}renderer=value;renderer.setFlight(state);loading=false;loadingPanel.hidden=true;wrapper.dataset.ready="true";updateUI();
  }).catch(error=>{
    if(disposed)return;loadingPanel.replaceChildren();const title=document.createElement("strong"),detail=document.createElement("span"),retry=document.createElement("button");title.textContent="3D graphics could not start";detail.textContent="Runway Glide needs WebGL. Enable hardware acceleration or try another browser, then reload.";retry.textContent="Reload game";retry.type="button";on(retry,"click",()=>location.reload());loadingPanel.append(title,detail,retry);wrapper.dataset.ready="error";console.error("Runway Glide renderer:",error);
  });
  frame=requestAnimationFrame(tick);
  return()=>{disposed=true;cancelAnimationFrame(frame);listeners.forEach(remove=>remove());audio.dispose();renderer?.dispose();wrapper.remove();};
}
