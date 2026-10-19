import { RedlightRace, REDLIGHT_COURSES } from "./redlight-engine.js";
import { loadRunnerAppearance } from "./redlight-appearance.js";
import { createRunnerCustomizer } from "./redlight-customizer.js";
import { createRedlight2D } from "./redlight-renderer.js";
import { createRedlightWebGL } from "./arcade/redlight-webgl.js";
import { createFrameLoop } from "./arcade/runtime.js";
import { createRedlightAudio, readRedlightSound, saveRedlightSound } from "./redlight-audio.js";

export function createRedLightGreenLight(root, { editorOnly = false, onAppearanceChange } = {}) {
  if(editorOnly) return createRunnerCustomizer(root,onAppearanceChange);
  const wrapper=document.createElement("section");wrapper.className="rlgl-game";wrapper.dataset.view="2d";
  wrapper.innerHTML=`<div class="rlgl-toolbar"><div class="rlgl-view-buttons" role="group" aria-label="Race view"><button type="button" data-view="2d" aria-pressed="true">2D track</button><button type="button" data-view="3d" aria-pressed="false">3D race (Beta)</button></div><button type="button" class="rlgl-sound" aria-label="Sound effects" aria-pressed="true">Sound FX: On</button><a class="arcade-text-link" href="#characters/redlight">Customize runner &rarr;</a></div>
    <div class="rlgl-stats" aria-live="off"><span class="badge rlgl-timer">Time: -</span><span class="badge rlgl-distance">Distance: 0 / 100 m</span><span class="badge rlgl-best">Best: -</span></div>
    <div class="rlgl-stage"><canvas class="rlgl-canvas-2d" role="img" aria-label="Bird's-eye 2D running track with your customized runner"></canvas><canvas class="rlgl-canvas-3d" role="img" aria-label="3D race (Beta), following your customized runner" hidden></canvas>
      <div class="rlgl-stage-label">PARK CIRCUIT <span>BIRD'S-EYE 2D</span></div>
      <div class="rlgl-stoplight" role="img" aria-label="Stoplight: ready" data-state="idle"><div class="rlgl-lamps"><i class="rlgl-lamp-red"></i><i class="rlgl-lamp-amber"></i><i class="rlgl-lamp-green"></i></div><strong>READY</strong></div>
      <div class="rlgl-overlay"><strong>Find your moment.</strong><span>Run on green. Freeze on red.</span></div>
      <div class="rlgl-progress"><span></span></div>
    </div><p class="rlgl-view-status" role="status" hidden></p>
    <div class="rlgl-status" role="status">Press Start round when you are ready.</div>
    <div class="rlgl-controls"><label class="rlgl-mode">Course<select aria-label="Select course length">${Object.entries(REDLIGHT_COURSES).map(([key,value])=>`<option value="${key}" ${key==="dash"?"selected":""}>${value.label}</option>`).join("")}</select></label><button type="button" class="primary-btn rlgl-start">Start round</button><button type="button" class="rlgl-run-btn" aria-pressed="false" disabled>Hold to run</button><button type="button" class="ghost-btn rlgl-pause" disabled>Pause</button><button type="button" class="ghost-btn rlgl-reset" disabled>Reset</button></div>
    <div class="rlgl-instructions"><h3>How to play</h3><ol><li><strong>Green: run.</strong> Hold the run button or the space bar.</li><li><strong>Amber: get ready to stop.</strong> Release before the light turns red.</li><li><strong>Red: freeze.</strong> Moving on red ends the round. Wait for green, then run again.</li></ol><p>Cross the finish line as quickly as you can, or choose Endless to chase your longest run. Both views use the same speed and signal timing. Leaving the window pauses your race.</p></div>`;
  root.append(wrapper);
  const $=selector=>wrapper.querySelector(selector),race=new RedlightRace(),appearance=loadRunnerAppearance();
  let soundEnabled=readRedlightSound();
  const audio=createRedlightAudio(soundEnabled),soundButton=$(".rlgl-sound");
  function syncSoundButton(){soundButton.textContent=audio.supported?`Sound FX: ${soundEnabled?"On":"Off"}`:"Sound FX unavailable";soundButton.setAttribute("aria-pressed",String(audio.supported&&soundEnabled));soundButton.disabled=!audio.supported;}
  soundButton.addEventListener("click",()=>{soundEnabled=!soundEnabled;audio.setEnabled(soundEnabled);saveRedlightSound(soundEnabled);syncSoundButton();});
  syncSoundButton();
  wrapper.dataset.appearance=JSON.stringify(appearance);
  const canvas2D=$(".rlgl-canvas-2d"),canvas3D=$(".rlgl-canvas-3d"),painter=createRedlight2D(canvas2D,appearance);
  const run=$(".rlgl-run-btn"),start=$(".rlgl-start"),pause=$(".rlgl-pause"),reset=$(".rlgl-reset"),course=$("select"),light=$(".rlgl-stoplight"),status=$(".rlgl-status"),overlay=$(".rlgl-overlay"),viewStatus=$(".rlgl-view-status");
  let view="2d",desiredView="2d",webgl,loading,disposed=false,failed=false,keyDown=false,pointerId=null,outcomeRecorded=false,previousPhase=race.phase;
  const bests=readRecords();
  const writeText=(element,text)=>{if(element.textContent!==text)element.textContent=text;};
  function release(){keyDown=false;pointerId=null;race.hold(false);}
  function updateInput(){if(keyDown||pointerId!==null)audio.unlock();race.hold(keyDown||pointerId!==null);sync();}
  function sync(){
    if(disposed)return;
    audio.update(race);
    const launched=previousPhase==="countdown"&&race.phase==="green";previousPhase=race.phase;
    wrapper.dataset.phase=race.phase;wrapper.dataset.signal=race.signal;wrapper.dataset.paused=String(race.paused);wrapper.dataset.distance=race.distance.toFixed(3);
    light.dataset.state=race.signal;
    const cue=race.paused?"PAUSED":race.phase==="countdown"?"GET READY":{green:"GO",amber:"GET READY",red:"STOP",idle:"READY"}[race.signal];
    writeText(light.querySelector("strong"),cue);light.setAttribute("aria-label",`Stoplight: ${cue.toLowerCase()}`);
    let message="Press Start round when you are ready.",headline="Find your moment.",detail="Run on green. Freeze on red.";
    if(race.paused){message="Paused. Press Resume when you are ready. Release and hold again to run.";headline="Paused";detail="Your place on the track is saved.";}
    else if(race.phase==="countdown"){const count=Math.max(1,Math.ceil(race.remaining));message=`Go in ${count}...`;headline=String(count);detail="Wait for green.";}
    else if(race.phase==="green"){message=race.signal==="amber"?"Amber! Release now and get ready to freeze.":"Green light! Hold the button or space bar to run.";}
    else if(race.phase==="red"){message="Red light! Freeze. Wait until green to move.";}
    else if(race.phase==="caught"){message="Caught! You moved during red light. Try again.";headline="Too soon!";detail=`You reached ${race.distance.toFixed(1)} meters. Wait for green next time.`;}
    else if(race.phase==="finished"){message="Made it! You crossed the finish line.";headline="Finish!";detail=`${race.target} meters in ${race.elapsed.toFixed(2)} seconds.`;}
    writeText(status,message);overlay.hidden=!race.paused&&["green","red"].includes(race.phase);writeText(overlay.querySelector("strong"),headline);writeText(overlay.querySelector("span"),detail);
    start.disabled=race.active;writeText(start,race.phase==="finished"?"Race again":race.phase==="caught"?"Try again":"Start round");
    run.disabled=race.paused||!["green","red"].includes(race.phase);run.classList.toggle("is-active",race.running);run.setAttribute("aria-pressed",String(race.running));
    if(launched)run.focus({preventScroll:true});
    pause.disabled=!race.active;writeText(pause,race.paused?"Resume":"Pause");reset.disabled=race.phase==="idle";course.disabled=race.active;
    writeText($(".rlgl-timer"),`Time: ${race.phase==="idle"||race.phase==="countdown"?"-":`${race.elapsed.toFixed(2)} s`}`);
    writeText($(".rlgl-distance"),`Distance: ${race.distance.toFixed(1)}${Number.isFinite(race.target)?` / ${race.target}`:""} m`);
    if(!outcomeRecorded&&["caught","finished"].includes(race.phase)){
      outcomeRecorded=true;
      if(race.target===Infinity)bests.endless=Math.max(bests.endless||0,race.distance);
      else if(race.phase==="finished")bests[race.course]=Math.min(bests[race.course]||Infinity,race.elapsed);
      try{localStorage.setItem("cooper-redlight-records-v1",JSON.stringify(bests));}catch{}
      release();
    }
    const best=bests[race.course];writeText($(".rlgl-best"),race.target===Infinity?`Longest: ${best?`${best.toFixed(1)} m`:"-"}`:`Best: ${best?`${best.toFixed(2)} s`:"-"}`);
    $(".rlgl-progress span").style.width=`${race.target===Infinity?(race.distance%50)/50*100:race.distance/race.target*100}%`;
  }
  function draw(){if(view==="3d"&&webgl)webgl.draw(race);else painter.draw(race);}
  function pauseRace(){audio.silence();release();race.pause();sync();draw();}
  async function setView(next){
    desiredView=next;audio.silence();release();if(race.active)race.pause();sync();
    wrapper.querySelectorAll("[data-view]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.view===next)));
    if(next==="2d"){
      view="2d";canvas2D.hidden=false;canvas3D.hidden=true;wrapper.dataset.view=view;$(".rlgl-stage-label span").textContent="BIRD'S-EYE 2D";
      viewStatus.hidden=!failed;if(failed)viewStatus.textContent="The 3D race (Beta) could not load on this device. You can keep playing in 2D.";painter.resize();draw();return;
    }
    if(webgl){view="3d";wrapper.dataset.view=view;canvas2D.hidden=true;canvas3D.hidden=false;$(".rlgl-stage-label span").textContent="3D RACE (BETA)";viewStatus.hidden=true;webgl.resize();draw();return;}
    viewStatus.hidden=false;viewStatus.textContent=`Preparing the 3D race (Beta)...${race.active?" Your race is paused while it loads.":""}`;
    if(loading)return;
    loading=createRedlightWebGL(canvas3D,appearance,{isCurrent:()=>!disposed&&desiredView==="3d"}).then(nextView=>{
      if(disposed){nextView.dispose();return;}webgl=nextView;if(desiredView==="3d")setView("3d");
    }).catch(()=>{
      if(disposed||desiredView!=="3d")return;failed=true;$("[data-view='3d']").disabled=true;setView("2d");
    }).finally(()=>{loading=null;});
  }
  start.addEventListener("click",()=>{audio.unlock();release();outcomeRecorded=false;race.start();sync();});
  reset.addEventListener("click",()=>{release();race.reset();outcomeRecorded=false;sync();draw();});
  pause.addEventListener("click",()=>{const resuming=race.paused;release();if(resuming){audio.unlock();race.resume();}else race.pause();sync();if(resuming&&!run.disabled)run.focus({preventScroll:true});});
  course.addEventListener("change",()=>{release();race.reset(course.value);outcomeRecorded=false;sync();draw();});
  wrapper.querySelectorAll("[data-view]").forEach(button=>button.addEventListener("click",()=>setView(button.dataset.view)));
  run.addEventListener("pointerdown",event=>{if(run.disabled||pointerId!==null||event.button!==0)return;event.preventDefault();run.focus({preventScroll:true});pointerId=event.pointerId;run.setPointerCapture(event.pointerId);updateInput();});
  function pointerUp(event){if(event.pointerId===pointerId){pointerId=null;updateInput();}}
  run.addEventListener("pointerup",pointerUp);run.addEventListener("pointercancel",pointerUp);run.addEventListener("lostpointercapture",pointerUp);
  function keydown(event){
    if(event.code!=="Space"||event.repeat||event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.target.closest("input,select,textarea,a,[contenteditable=true]")||(event.target.closest("button")&&event.target!==run))return;
    if(run.disabled)return;event.preventDefault();keyDown=true;updateInput();
  }
  function keyup(event){if(event.code==="Space"&&keyDown){event.preventDefault();keyDown=false;updateInput();}}
  function visibility(){if(document.hidden){pauseRace();loop.stop();}else loop.start();}
  window.addEventListener("keydown",keydown);window.addEventListener("keyup",keyup);window.addEventListener("blur",pauseRace);document.addEventListener("visibilitychange",visibility);
  const observer=new ResizeObserver(()=>{if(disposed)return;painter.resize();webgl?.resize();draw();});observer.observe($(".rlgl-stage"));
  const loop=createFrameLoop((time,delta)=>{race.step(delta);sync();draw();});loop.start();sync();draw();
  return ()=>{disposed=true;audio.dispose();release();loop.stop();observer.disconnect();window.removeEventListener("keydown",keydown);window.removeEventListener("keyup",keyup);window.removeEventListener("blur",pauseRace);document.removeEventListener("visibilitychange",visibility);webgl?.dispose();painter.dispose();wrapper.remove();};
}

function readRecords(){
  try{const value=JSON.parse(localStorage.getItem("cooper-redlight-records-v1"));return Object.fromEntries(Object.keys(REDLIGHT_COURSES).filter(key=>Number.isFinite(value?.[key])&&value[key]>0).map(key=>[key,value[key]]));}catch{return {};}
}
