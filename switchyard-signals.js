import { createFrameLoop } from "./arcade/runtime.js";
import { LEVELS, nextJunction } from "./switchyard-network.js";
import { createRailway, startRailway, advanceRailway, setTrainHeld, stopAllTrains, setJunction, setSignal, switchLocked, routePreview, rating } from "./switchyard-model.js";
import { createRailwayMap } from "./switchyard-art.js";
import { createRailwayCab } from "./switchyard-webgl.js";
import { createRailwayAudio } from "./switchyard-audio.js";

const SAVE_KEY="cooper-switchyard-v2";
const clock=seconds=>`${Math.floor(Math.ceil(seconds)/60)}:${String(Math.ceil(seconds)%60).padStart(2,"0")}`;
export function createSwitchyardSignals(root) {
  let saved={};try{saved=JSON.parse(localStorage.getItem(SAVE_KEY))||{};}catch{}
  const best=LEVELS.map((_,i)=>Math.max(0,Math.min(3,Number(saved.best?.[i])||0)));
  let sound=saved.sound!==false,state=createRailway(),selected="A",viewMode="map",cab=null,loading=false,token=0,disposed=false,lastEvent=0,lastUI=0,resultSaved=false;
  const listeners=[],reduced=matchMedia("(prefers-reduced-motion: reduce)").matches,audio=createRailwayAudio(sound);
  const wrapper=document.createElement("section");wrapper.className="sw-game";wrapper.setAttribute("aria-label","Railway dispatch desk");wrapper.setAttribute("aria-live","off");
  wrapper.innerHTML=`
    <div class="sw-masthead"><div><span class="sw-eyebrow">THE LITTLE RAILWAY CO.</span><h3>All aboard. You're in control.</h3></div><span class="sw-ticket">DISPATCH DESK <b>01 / 06</b></span></div>
    <div class="sw-toolbar"><label>Railway district<select class="sw-level" aria-label="Railway district"></select></label><button class="sw-start sw-primary" type="button">Start shift</button><button class="sw-pause" type="button" disabled>Pause</button><button class="sw-sound" type="button">Sound on</button><button class="sw-help-button" type="button">How to play</button></div>
    <div class="sw-stats"><div><span>PASSENGERS HOME</span><strong class="sw-delivered">0 / 8</strong><progress class="sw-progress" max="8" value="0" aria-label="Passenger goal"></progress></div><div><span>SHIFT REMAINING</span><strong class="sw-time">3:00</strong></div><div><span>MISSED STOPS</span><strong class="sw-misses">0 / 5</strong></div><div><span>TRAINS ON DUTY</span><strong class="sw-count">1</strong></div></div>
    <div class="sw-brief"><span class="sw-step">01</span><div><strong class="sw-brief-title"></strong><p class="sw-brief-detail"></p></div></div>
    <div class="sw-viewbar"><div class="sw-view-options" role="group" aria-label="Camera view"><button type="button" data-view="map" aria-pressed="true">Overview 2D</button><button type="button" data-view="cab" aria-pressed="false">Cab 3D <small>Beta</small></button></div><span class="sw-map-key"><i></i> Selected train's route</span></div>
    <div class="sw-stage" data-camera="map"><canvas class="sw-map" aria-label="Railway map. Select trains and junctions here, or use the buttons below."></canvas><canvas class="sw-cab" aria-label="First-person view from the selected train" hidden></canvas><div class="sw-cab-hud" hidden><span>DRIVER'S CAB <b class="sw-cab-name">TRAIN A</b></span><span class="sw-cab-destination"></span></div><canvas class="sw-minimap" aria-label="Overhead railway map in cab view" hidden></canvas><div class="sw-loading" hidden>Preparing your cab...</div><div class="sw-pause-shade" hidden><strong>Timetable paused</strong><span>Set your routes, then resume when you're ready.</span><button class="sw-resume sw-primary" type="button">Resume shift</button></div><div class="sw-result" hidden><span class="sw-eyebrow">SHIFT REPORT</span><h3></h3><p></p><strong class="sw-stars"></strong><div><button class="sw-retry" type="button">Try again</button><button class="sw-next sw-primary" type="button">Next district</button></div></div></div>
    <div class="sw-announcement" role="status" aria-live="polite">Welcome aboard. Set the first route, then start your shift.</div>
    <div class="sw-section-title"><h4>Your trains</h4><button class="sw-stop-all" type="button">Stop all trains</button></div><div class="sw-trains"></div>
    <div class="sw-section-title"><h4>Junctions &amp; signals</h4><span>Set a destination. Green lets trains through.</span></div><div class="sw-junctions"></div>
    <details class="sw-guide"><summary>Dispatcher's handbook <span>Rules, signals &amp; controls</span></summary><div class="sw-guide-body"><ol><li><strong>Read the destination.</strong> Each train carries 4 passengers. The letter above it matches its train card; P = Park, H = Harbor, M = Market, V = Village.</li><li><strong>Set the junction, then send the train.</strong> Choose a named route on a junction card. The gold line previews the selected train's current route. Tracks are one-way; arrows show the direction. You cannot reverse a train.</li><li><strong>Keep the rails clear.</strong> Trains can collide at crossings, shared tracks, or platforms. A red signal holds approaching trains before its junction. Stop halts one train immediately. Stop all halts every train; the clock keeps running. Pause freezes the clock too, and you can still plan routes.</li><li><strong>Board, then depart.</strong> A correct arrival delivers 4 passengers and stops for 3 seconds of boarding. Press Go again to depart with a new destination. At the wrong station, the passengers stay aboard and one missed stop is counted for that group until delivered.</li><li><strong>Complete the shift.</strong> Deliver the target number before time runs out. A collision or reaching the missed-stop limit ends the shift. Earn up to 3 stars for a fast shift with no missed stops. All six districts are available to practice.</li></ol><p><strong>Watch the switch lock:</strong> A route locks while a train and its coach pass over the junction. A red signal cannot stop a train that has already passed it. Stop the train directly if you need to react immediately.</p><p><strong>Start shift releases Train A only.</strong> Send the others with their Go buttons. Faster blue express services appear from Alpine Express onward.</p><div class="sw-shortcuts"><span><kbd>1</kbd>-<kbd>5</kbd> select train</span><span><kbd>Space</kbd> Go / Stop</span><span><kbd>&larr;</kbd><kbd>&rarr;</kbd> next junction route</span><span><kbd>R</kbd> next signal</span><span><kbd>S</kbd> stop all</span><span><kbd>P</kbd> pause</span><span><kbd>V</kbd> camera</span></div><p class="sw-save-note">Stars and sound preferences save on this device. No server needed.</p></div></details>`;
  root.append(wrapper);const $=selector=>wrapper.querySelector(selector),$$=selector=>[...wrapper.querySelectorAll(selector)];
  const desk=document.createElement("div"),viewport=document.createElement("div"),panel=document.createElement("div");desk.className="sw-desk";viewport.className="sw-viewport";panel.className="sw-control-panel";
  wrapper.insertBefore(desk,$(".sw-viewbar"));viewport.append($(".sw-viewbar"),$(".sw-stage"),$(".sw-announcement"));const headings=$$(".sw-section-title");panel.append(headings[0],$(".sw-trains"),headings[1],$(".sw-junctions"));desk.append(viewport,panel);
  const quick=document.createElement("div");quick.className="sw-quick-controls";quick.innerHTML=`<div class="sw-quick-dispatch"><select class="sw-quick-train" aria-label="Quick select train"></select><button class="sw-quick-go" type="button">Go</button><button class="sw-quick-pause" type="button">Pause</button></div><div class="sw-quick-routing"><strong class="sw-quick-junction"></strong><button type="button" data-quick-choice="0"></button><button type="button" data-quick-choice="1"></button><button class="sw-quick-signal" type="button"></button></div>`;viewport.insertBefore(quick,$(".sw-announcement"));
  const on=(el,type,fn)=>{el.addEventListener(type,fn);listeners.push(()=>el.removeEventListener(type,fn));};
  const map=createRailwayMap($(".sw-map")),minimap=createRailwayMap($(".sw-minimap"));
  const trainCards=new Map(),junctionCards=new Map();
  function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({sound,best}));}catch{$(".sw-save-note").textContent="Storage is unavailable. Stars will last for this visit.";}}
  function announce(message){$(".sw-announcement").textContent=message;}
  function renderLevelOptions(){const current=$(".sw-level").value;$(".sw-level").replaceChildren();LEVELS.forEach((level,i)=>{const option=document.createElement("option");option.value=i;option.textContent=`${i+1}. ${level.name}${best[i]?` / ${best[i]} stars`:""}`;$(".sw-level").append(option);});$(".sw-level").value=current||state.levelIndex;}
  function buildControls(){
    trainCards.clear();junctionCards.clear();$(".sw-trains").replaceChildren();$(".sw-junctions").replaceChildren();
    $(".sw-quick-train").replaceChildren();for(const t of state.trains){const option=document.createElement("option");option.value=t.id;option.textContent=`Train ${t.id}`;$(".sw-quick-train").append(option);}
    for(const t of state.trains){const el=document.createElement("article");el.className="sw-train-card";el.style.setProperty("--train-color",t.color);el.dataset.train=t.id;el.innerHTML=`<div class="sw-train-heading"><button type="button" class="sw-select-train" aria-label="Select train ${t.id}"><i>${t.id}</i><span>Train ${t.id}<small>${state.levelIndex>=3&&t.index===1?"EXPRESS SERVICE":"PASSENGER SERVICE"}</small></span></button><button class="sw-enter-cab" type="button" aria-label="Enter train ${t.id} cab">Cab</button></div><p class="sw-destination"></p><span class="sw-train-status"></span><button class="sw-dispatch" type="button">Go</button>`;
      $(".sw-trains").append(el);trainCards.set(t.id,{el,select:el.querySelector(".sw-select-train"),go:el.querySelector(".sw-dispatch"),status:el.querySelector(".sw-train-status"),destination:el.querySelector(".sw-destination")});
    }
    for(const n of state.network.junctions){const el=document.createElement("article");el.className="sw-junction-card";el.dataset.junction=n.id;el.innerHTML=`<div class="sw-junction-heading"><strong>${n.id} <span>Junction ${n.id.slice(1)}</span></strong><button class="sw-signal" type="button"></button></div><div class="sw-routes" role="group" aria-label="Junction ${n.id.slice(1)} route"></div><span class="sw-lock"></span>`;
      for(const [choice,id] of n.out.entries()){const stop=state.network.nodes[state.network.edges[id].to],button=document.createElement("button");button.type="button";button.dataset.choice=choice;button.innerHTML=`<i style="--stop-color:${stop.color||"#486b59"}">${stop.icon||stop.id}</i><span>${stop.name||stop.id}</span>`;el.querySelector(".sw-routes").append(button);}
      $(".sw-junctions").append(el);junctionCards.set(n.id,{el,signal:el.querySelector(".sw-signal"),routes:[...el.querySelectorAll("[data-choice]")],lock:el.querySelector(".sw-lock")});
    }
  }
  function active(){return state.trains.find(t=>t.id===selected)||state.trains[0];}
  function selectTrain(id){if(!state.trains.some(t=>t.id===id))return;selected=id;renderUI();}
  function go(id){const t=state.trains.find(t=>t.id===id);if(state.phase==="ready"){announce("Press Start shift first. You can set routes before the clock starts.");return;}audio.unlock();setTrainHeld(state,id,!t.held);renderUI();}
  function pause(){if(state.phase!=="playing")return;state.paused=!state.paused;renderUI();}
  async function setView(mode){
    viewMode=mode;const request=++token;loading=false;
    if(mode==="cab"&&!cab){loading=true;renderUI();try{const created=await createRailwayCab($(".sw-cab"),state,{isCurrent:()=>!disposed&&request===token});if(disposed||request!==token){created.dispose();return;}cab=created;}catch(error){if(disposed||request!==token)return;viewMode="map";announce("The 3D cab could not start on this device. The overhead railway is ready to play.");}loading=false;}
    renderUI();if(cab&&mode==="cab")cab.resize();map.resize();minimap.resize();
  }
  function reset(index=state.levelIndex){token++;cab?.dispose();cab=null;loading=false;state=createRailway(index);selected="A";lastEvent=0;resultSaved=false;$(".sw-level").value=index;buildControls();announce(state.level.tip);const mode=viewMode;viewMode="map";renderUI();if(mode==="cab")setView("cab");}
  function renderBrief(){
    const t=active(),next=nextJunction(state.network,t),route=routePreview(state,t),end=state.network.nodes[route[route.length-1].edge.to],destination=state.network.nodes[t.destination];
    let title=`Train ${t.id}: ${t.passengers} passengers for ${destination.name}`,detail=`${next?`Next junction: ${next.node.id}. `:""}Gold route currently leads to ${end.name||"the next junction"}.`;
    if(state.phase==="ready")detail=`Choose ${destination.name} at ${next?.node.id||"the next junction"}, then Start shift. Only Train A starts automatically.`;
    else if(t.boarding>0)detail=`Passengers arrived! Boarding for ${destination.name}: ${Math.ceil(t.boarding)}s. Press Go after boarding finishes.`;
    else if(t.held)detail=`Stopped. Check ${next?.node.id||"the next junction"} and the tracks ahead, then press Go. ${end.id!==t.destination?`Current route leads to ${end.name}; your passengers need ${destination.name}.`:"The gold route matches your destination."}`;
    else if(t.waiting==="signal")detail=`Waiting at the red signal at ${next?.node.id}. Set the route, check the line is clear, then make that signal green.`;
    if(state.phase==="playing"&&!next&&t.boarding<=0)detail=end.id===t.destination?`${t.held?"Stopped. Press Go when the line is clear. ":""}The track leads directly to ${destination.name}; no more switches are needed before this stop.`:`This track reaches ${end.name} first. Your passengers need ${destination.name}; reroute at the junction after this station.`;
    if(state.phase==="won"){title="Everyone is home. Your shift is complete.";detail="Try the next district for more trains and busier tracks, or drive this railway again.";}
    else if(["crashed","lost"].includes(state.phase)){title=state.phase==="crashed"?"All services stopped after a collision.":"This shift has ended.";detail="Check the shift report, then try again. Pause any time to plan your next dispatch.";}
    $(".sw-brief-title").textContent=title;$(".sw-brief-detail").textContent=detail;$(".sw-step").textContent=t.id;
  }
  function renderUI(){
    const playable=["ready","playing"].includes(state.phase),ended=!playable;
    wrapper.dataset.phase=state.phase;wrapper.dataset.paused=String(state.paused);wrapper.dataset.level=state.levelIndex;
    $(".sw-ticket b").textContent=`0${state.levelIndex+1} / 06`;
    $(".sw-delivered").textContent=`${state.delivered} / ${state.level.goal}`;$(".sw-progress").max=state.level.goal;$(".sw-progress").value=state.delivered;$(".sw-time").textContent=clock(state.time);$(".sw-misses").textContent=`${state.misses} / ${state.level.mistakes}`;$(".sw-count").textContent=state.trains.length;
    $(".sw-start").textContent=state.phase==="ready"?"Start shift":"Restart shift";$(".sw-start").disabled=loading;
    $(".sw-pause").disabled=state.phase!=="playing"||loading;$(".sw-pause").textContent=state.paused?"Resume":"Pause";$(".sw-pause").setAttribute("aria-pressed",String(state.paused));
    $(".sw-sound").textContent=`Sound ${sound?"on":"off"}`;$(".sw-sound").setAttribute("aria-pressed",String(sound));$(".sw-stop-all").disabled=state.phase!=="playing";
    for(const t of state.trains){const card=trainCards.get(t.id);card.el.classList.toggle("is-selected",selected===t.id);card.select.setAttribute("aria-pressed",String(selected===t.id));card.destination.textContent=`4 passengers > ${state.network.nodes[t.destination].name}`;card.go.textContent=t.boarding>0?`Boarding ${Math.ceil(t.boarding)}s`:t.held?"Go":"Stop";card.go.disabled=!playable||state.phase==="ready"||t.boarding>0;card.go.setAttribute("aria-label",`${t.held?"Go":"Stop"} train ${t.id}`);card.go.classList.toggle("is-go",t.held);card.status.textContent=ended?(state.phase==="crashed"?"Shift stopped":"Shift complete"):t.boarding>0?"At platform / boarding":t.held?"Holding / ready to depart":t.waiting==="signal"?"Waiting at a red signal":state.paused?"Paused on the line":"On the move";}
    if(ended)for(const card of trainCards.values())card.go.textContent="Shift ended";
    const next=nextJunction(state.network,active());
    $(".sw-quick-train").value=selected;$(".sw-quick-go").textContent=trainCards.get(selected).go.textContent;$(".sw-quick-go").disabled=trainCards.get(selected).go.disabled;$(".sw-quick-go").setAttribute("aria-label",`${active().held?"Go":"Stop"} selected train`);$(".sw-quick-pause").textContent=state.paused?"Resume":"Pause";$(".sw-quick-pause").disabled=state.phase!=="playing"||loading;
    $(".sw-quick-junction").textContent=next?`Next: ${next.node.id}`:"To station";for(const b of $$("[data-quick-choice]")){const choice=Number(b.dataset.quickChoice),edge=next&&state.network.edges[next.node.out[choice]],stop=edge&&state.network.nodes[edge.to];b.textContent=stop?.short||"--";b.setAttribute("aria-pressed",String(!!next&&state.switches[next.node.id].choice===choice));b.disabled=!playable||!next||switchLocked(state,next.node.id);}
    $(".sw-quick-signal").textContent=next&&state.switches[next.node.id].green?"Green":"Red";$(".sw-quick-signal").setAttribute("aria-label",`Toggle ${next?.node.id||"next"} signal`);$(".sw-quick-signal").disabled=!playable||!next;
    for(const [id,card] of junctionCards){const sw=state.switches[id],locked=switchLocked(state,id);card.el.classList.toggle("is-next",next?.node.id===id);card.signal.textContent=sw.green?"Green / pass":"Red / wait";card.signal.dataset.green=String(sw.green);card.signal.setAttribute("aria-label",`${id} signal ${sw.green?"green; change to red":"red; change to green"}`);card.signal.setAttribute("aria-pressed",String(sw.green));card.signal.disabled=!playable;card.routes.forEach((b,i)=>{b.setAttribute("aria-pressed",String(sw.choice===i));b.disabled=!playable||locked;});card.lock.textContent=locked?"Train crossing / switch locked":next?.node.id===id?`Next junction for Train ${selected}`:"Switch ready";}
    renderBrief();$(".sw-map").hidden=viewMode!=="map";$(".sw-cab").hidden=viewMode!=="cab";$(".sw-cab-hud").hidden=$(".sw-minimap").hidden=viewMode!=="cab";$(".sw-stage").dataset.camera=viewMode;$(".sw-loading").hidden=!loading;
    for(const b of $$("[data-view]"))b.setAttribute("aria-pressed",String(b.dataset.view===viewMode));
    $(".sw-cab-name").textContent=`TRAIN ${selected}`;$(".sw-cab-destination").textContent=`Next stop: ${state.network.nodes[active().destination].name}`;
    $(".sw-pause-shade").hidden=!state.paused||state.phase!=="playing"||loading;
    const showResult=ended&&(state.phase!=="crashed"||state.crash.age>1.5);$(".sw-result").hidden=!showResult;
    if(showResult){$(".sw-result h3").textContent=state.phase==="won"?"A splendid shift!":state.phase==="crashed"?"Collision on the line":"End of the line";$(".sw-result p").textContent=state.reason;$(".sw-stars").textContent=state.phase==="won"?`${"\u2605".repeat(rating(state))}${"\u2606".repeat(3-rating(state))} / ${state.score.toLocaleString()} points`: `${state.delivered} passengers delivered`;$(".sw-next").hidden=state.phase!=="won"||state.levelIndex===LEVELS.length-1;$(".sw-retry").textContent=state.phase==="won"?"Drive again":"Try again";}
    if(state.phase==="won"&&!resultSaved){resultSaved=true;best[state.levelIndex]=Math.max(best[state.levelIndex],rating(state));save();renderLevelOptions();}
    for(const event of state.events)if(event.id>lastEvent){lastEvent=event.id;audio.play(event.kind);announce(event.text);}
  }
  on($(".sw-level"),"change",e=>reset(Number(e.target.value)));
  on($(".sw-start"),"click",()=>{audio.unlock();if(state.phase==="ready")startRailway(state);else reset();renderUI();});
  on($(".sw-pause"),"click",pause);on($(".sw-resume"),"click",pause);
  on($(".sw-quick-train"),"change",e=>selectTrain(e.target.value));on($(".sw-quick-go"),"click",()=>go(selected));on($(".sw-quick-pause"),"click",pause);
  on($(".sw-quick-signal"),"click",()=>{const next=nextJunction(state.network,active());if(next){audio.unlock();setSignal(state,next.node.id,!state.switches[next.node.id].green);renderUI();}});
  for(const b of $$("[data-quick-choice]"))on(b,"click",()=>{const next=nextJunction(state.network,active());if(next){audio.unlock();setJunction(state,next.node.id,Number(b.dataset.quickChoice));renderUI();}});
  on($(".sw-stop-all"),"click",()=>{audio.unlock();stopAllTrains(state);renderUI();});
  on($(".sw-sound"),"click",()=>{sound=!sound;audio.setEnabled(sound);save();renderUI();});
  on($(".sw-help-button"),"click",()=>{if(state.phase==="playing")state.paused=true;$(".sw-guide").open=true;$(".sw-guide").scrollIntoView({behavior:reduced?"instant":"smooth",block:"start"});renderUI();});
  on($(".sw-guide"),"toggle",()=>{if($(".sw-guide").open&&state.phase==="playing"){state.paused=true;renderUI();}});
  on($(".sw-retry"),"click",()=>reset());on($(".sw-next"),"click",()=>reset(state.levelIndex+1));
  for(const b of $$("[data-view]"))on(b,"click",()=>setView(b.dataset.view));
  on($(".sw-trains"),"click",e=>{const card=e.target.closest("[data-train]"),button=e.target.closest("button");if(!card||!button)return;const id=card.dataset.train;if(button.classList.contains("sw-dispatch"))go(id);else {selectTrain(id);if(button.classList.contains("sw-enter-cab"))setView("cab");}});
  on($(".sw-junctions"),"click",e=>{const card=e.target.closest("[data-junction]"),button=e.target.closest("button");if(!card||!button)return;audio.unlock();const id=card.dataset.junction;if(button.hasAttribute("data-choice"))setJunction(state,id,Number(button.dataset.choice));else setSignal(state,id,!state.switches[id].green);renderUI();});
  for(const [canvas,renderer] of [[$(".sw-map"),map],[$(".sw-minimap"),minimap]])on(canvas,"click",e=>{const hit=renderer.hit(e.clientX,e.clientY);if(hit?.kind==="train")selectTrain(hit.id);else if(hit?.kind==="junction"){audio.unlock();if(!setJunction(state,hit.id,1-state.switches[hit.id].choice))announce(`${hit.id} is locked while a train passes. Wait for the coach to clear.`);renderUI();}});
  on(document,"keydown",e=>{
    if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest("input,select,textarea")||e.key===" "&&e.target.closest("button,summary"))return;
    const key=e.key.toLowerCase(),next=nextJunction(state.network,active());
    if(!["1","2","3","4","5"," ","p","s","v","r","arrowleft","arrowright"].includes(key))return;e.preventDefault();audio.unlock();
    if(/^[1-5]$/.test(key))selectTrain(String.fromCharCode(64+Number(key)));
    else if(key===" ")go(selected);else if(key==="p")pause();else if(key==="s")stopAllTrains(state);else if(key==="v")setView(viewMode==="map"?"cab":"map");
    else if(next){if(key==="r")setSignal(state,next.node.id,!state.switches[next.node.id].green);else setJunction(state,next.node.id,key==="arrowright"?1:0);}renderUI();
  });
  on(document,"visibilitychange",()=>{if(document.hidden&&state.phase==="playing"){state.paused=true;renderUI();}});
  renderLevelOptions();buildControls();renderUI();
  const loop=createFrameLoop((time,dt)=>{if(!loading&&!document.hidden)advanceRailway(state,dt);if(time-lastUI>100){renderUI();lastUI=time;}if(viewMode==="cab"&&cab){cab.draw(state,selected,reduced);minimap.draw(state,selected,time/1000,reduced);}else map.draw(state,selected,time/1000,reduced);audio.tick(state);});loop.start();
  return ()=>{disposed=true;token++;loop.stop();listeners.forEach(remove=>remove());cab?.dispose();map.dispose();minimap.dispose();audio.dispose();wrapper.remove();};
}
