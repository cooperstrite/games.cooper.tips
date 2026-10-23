import { createCanvasSurface, createFrameLoop } from "./arcade/runtime.js";
import { NIGHTS, MODES, TARGETS, createHarvest, beginHarvest, advanceHarvest, catchTarget, answerRiddle, ringBell, canCarve, openCarving, cancelCarving, finishCarving, nextNight } from "./haunted-harvest-model.js";
import { STENCILS, validSavedCarving } from "./haunted-harvest-carving.js";
import { drawGrove, drawCarving, harvestIcon } from "./haunted-harvest-art.js";
import { createHarvestAudio } from "./haunted-harvest-audio.js";
import { createRiddleDeck, isRiddleAnswer } from "./haunted-harvest-riddles.js";
import { createCarvingWorkshop } from "./haunted-harvest-workshop.js";

const SAVE_KEY="cooper-haunted-harvest-v2";
const shuffle=items=>{const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
export function createHauntedHarvest(root){
  let saved={};try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||"{}");if(!saved||typeof saved!=="object")saved={};}catch{}
  const settings={music:saved.music!==false,effects:saved.effects!==false,mode:MODES[saved.mode]?saved.mode:"eerie",guided:saved.guided!==false};
  let gallery=Array.isArray(saved.gallery)?saved.gallery.map(validSavedCarving).filter(Boolean).slice(0,6):[];
  const best={};for(const key of Object.keys(MODES))best[key]=Math.max(0,Number(saved.best?.[key])||0);
  let state=createHarvest(settings.mode),paused=false,modal=null,carving=null,question=null,selection=[],answered=false,hinted=false,guideStep="",nextAction="",deck={},lastMessage="",lastPhase="",uiClock=0,artTime=0,disposed=false,scenerySize={width:0,height:0};
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  const audio=createHarvestAudio(settings),listeners=[],targets=new Map();
  const wrapper=document.createElement("section");wrapper.className="hh-game";wrapper.setAttribute("aria-label","Haunted Harvest");
  wrapper.innerHTML=`
    <div class="hh-masthead"><div><span class="hh-eyebrow">THE MIDNIGHT GATHERING</span><h3>A harvest worth haunting.</h3></div><span class="hh-edition">THREE PATHS<br>ONE LONG NIGHT</span></div>
    <div class="hh-toolbar"><label>Difficulty<select class="hh-mode" aria-label="Harvest difficulty">${Object.entries(MODES).map(([id,m])=>`<option value="${id}">${m.name}</option>`).join("")}</select></label><button type="button" class="hh-primary hh-start">Begin harvest</button><button type="button" class="hh-pause" disabled>Pause</button><button type="button" class="hh-practice">Carving studio</button><button type="button" class="hh-help">How to play</button></div>
    <p class="hh-mode-note"></p>
    <label class="hh-learn-toggle"><input type="checkbox" class="hh-guided" ${settings.guided?"checked":""}> Guide me through my first pumpkin, wax, and lantern with the clock paused.</label>
    <div class="hh-objective"><div><span class="hh-eyebrow">WHAT TO DO NEXT</span><strong class="hh-next-title"></strong><p class="hh-next-detail"></p></div><button type="button" class="hh-primary hh-next-action"></button></div>
    <div class="hh-guide-steps" hidden><span data-step="pumpkin">1. Solve a pumpkin</span><span data-step="wisp">2. Collect green wax</span><span data-step="carve">3. Carve & light</span><button type="button" class="hh-skip-guide">Skip lesson</button></div>
    <div class="hh-scoreboard"><div><span>CANDY OFFERING</span><strong data-stat="candy">0 / 9</strong></div><div><span>LANTERNS THIS PATH</span><strong data-stat="lanterns">0 / 1</strong></div><div><span>UNTIL MIDNIGHT</span><strong data-stat="time">1:15</strong></div><div class="hh-fright"><span>FRIGHT <b data-stat="fear">0 / 6</b></span><meter min="0" max="6" value="0" aria-label="Fright"></meter></div></div>
    <div class="hh-stage" role="group" aria-label="Haunted orchard"><canvas class="hh-landscape" aria-hidden="true"></canvas><div class="hh-stage-heading"><span class="hh-eyebrow hh-night-count">PATH 01 / 03</span><strong class="hh-place">Moonlight Grove</strong><span class="hh-subtitle">The orchard wakes</span></div><div class="hh-targets"></div><div class="hh-scene-note"><span class="hh-scene-tip"></span><button type="button" class="hh-primary hh-scene-carve" hidden>Open carving bench</button></div><div class="hh-stage-panel"></div></div>
    <p class="hh-status" role="status" aria-live="polite"></p>
    <div class="hh-inventory"><div><span>ON YOUR BENCH</span><strong data-stat="inventory">1 pumpkin / 1 wax</strong><small data-stat="shield">0 ghost shields</small></div><button type="button" class="hh-primary hh-carve">Carve a lantern<small>Costs 1 pumpkin + 1 wax</small></button><button type="button" class="hh-bell">Ring the bell<small>Costs 3 candy / -2 fright</small></button></div>
    <div class="hh-legend">${Object.entries(TARGETS).map(([kind,t])=>`<div><span class="hh-legend-icon">${harvestIcon(kind)}</span><p><strong>${t.name}</strong><span>${t.hint}</span></p></div>`).join("")}</div>
    <details class="hh-rules"><summary>Full rules, rewards, and survival tips</summary><div class="hh-rule-grid"><div><b>01 / GATHER</b><p>Meet <strong>both goals</strong> on each path: the candy offering and lit lanterns. Sweet pumpkins pay 3 candy; cursed pumpkins pay 5. Solve three puzzles in a row for 2 bonus candy. Each correct answer also gives a carving pumpkin. A hint reduces that puzzle's candy reward by 1. Cozy, Eerie, and Wicked have different puzzles, with 3, 4, and 5 runes in their cursed spells.</p></div><div><b>02 / CARVE</b><p>Collect wax from green candle wisps. At the bench, draw shapes and cut out the enclosed pieces. Any design with an eye-sized opening can become a lantern. Spend <strong>1 pumpkin + 1 wax</strong> when you light it: gain 3 candy, soothe 2 fright, and earn one ghost shield (up to 3). Your first materials are free. Guides never affect your reward.</p></div><div><b>03 / OUTWIT</b><p>A wrong sweet-pumpkin answer adds 1 fright; a cursed one adds 2. Touching an unshielded ghost adds 2 fright and steals 2 candy. A shield banishes it for 2 candy. The bell spends 3 candy to soothe 2 fright and clear ghosts; it recharges in 10 seconds.</p></div><div><b>04 / REACH MIDNIGHT</b><p>Finish all three paths before each timer expires. Each path starts a fresh candy offering and lantern goal; supplies and shields carry over, and 2 fright fades. Full fright ends the harvest. Escaped pumpkins simply disappear. <strong>Clocks and spirits pause during puzzles, carving, and the guided start.</strong> Pause or press P any time in the orchard. Switching tabs pauses automatically. The separate carving studio is untimed and saves artwork without harvest rewards.</p></div></div></details>
    <div class="hh-gallery-heading"><div><span class="hh-eyebrow">YOUR LANTERN SHELF</span><h4>Little lights in the dark.</h4></div><span class="hh-best"></span></div><div class="hh-gallery"></div><p class="hh-storage-note">Your last six lanterns, sound preferences, and best scores save on this device.</p>
    <div class="hh-audio"><button type="button" data-audio="music">Music on</button><button type="button" data-audio="effects">Sound effects on</button><span>Original, softly spooky sounds.</span></div>
    <dialog class="hh-dialog" aria-labelledby="hh-dialog-title"><div class="hh-dialog-body"></div></dialog>`;
  root.appendChild(wrapper);
  const $=s=>wrapper.querySelector(s),$$=s=>[...wrapper.querySelectorAll(s)],dialog=$(".hh-dialog"),body=$(".hh-dialog-body"),stage=$(".hh-stage"),canvas=$(".hh-landscape"),surface=createCanvasSurface(canvas),stats=Object.fromEntries($$("[data-stat]").map(el=>[el.dataset.stat,el]));
  const on=(el,type,handler,options)=>{el.addEventListener(type,handler,options);listeners.push(()=>el.removeEventListener(type,handler,options));};
  function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({...settings,best,gallery}));}catch{$(".hh-storage-note").textContent="Storage is unavailable. Your lanterns will last for this visit.";}}
  function syncAudio(){for(const b of $$("[data-audio]")){const key=b.dataset.audio;b.textContent=`${key==="music"?"Music":"Sound effects"} ${settings[key]?"on":"off"}`;b.setAttribute("aria-pressed",String(settings[key]));}}
  function closeDialog(){if(!modal)return;if(modal==="carve"&&!carving.practice)cancelCarving(state);if(modal==="riddle"&&!answered){answerRiddle(state,false);if(guideStep==="pumpkin")seedGuideTarget("sweet");}carving?.dispose();modal=null;carving=null;question=null;dialog.close();body.replaceChildren();renderUI();if(state.phase==="playing"){if(!paused)audio.start();const focus=paused?$(".hh-pause"):$(".hh-target:not(:disabled)")||$(".hh-next-action:not([hidden])")||$(".hh-pause");focus.focus({preventScroll:true});}else $(".hh-start").focus({preventScroll:true});}
  function openDialog(kind){modal=kind;dialog.showModal();}
  function showRiddle(){
    const kind=state.pending;
    if(!deck[kind]?.length)deck[kind]=createRiddleDeck(state.mode,state.night)[kind];
    question=deck[kind].pop();selection=[];answered=false;hinted=false;
    body.innerHTML=`<div class="hh-dialog-head"><span class="hh-eyebrow">${kind==="cursed"?"CURSED SPELL / +5 CANDY":"PUMPKIN PUZZLE / +3 CANDY"}</span><span class="hh-time-paused">Clock paused / think it through</span></div><span class="hh-puzzle-level"></span><h3 id="hh-dialog-title"></h3><ul class="hh-puzzle-clues"></ul><p class="hh-question-help"></p><div class="hh-answer-order" aria-live="polite"></div><div class="hh-answers"></div><form class="hh-number-form" hidden><label>Your answer (whole number)<input class="hh-number-answer" type="text" inputmode="numeric" autocomplete="off" maxlength="8"></label></form><p class="hh-puzzle-hint" hidden></p><p class="hh-answer-feedback" role="status"></p><div class="hh-dialog-actions"><button type="button" class="hh-riddle-hint">Hint (-1 candy if solved)</button><button type="button" class="hh-reset-order" hidden>Clear order</button><button type="button" class="hh-undo-order" hidden>Undo last rune</button><button type="button" class="hh-leave-riddle">Leave (+${kind==="cursed"?2:1} fright)</button><button type="button" class="hh-submit-answer hh-primary" disabled>Check answer</button><button type="button" class="hh-primary hh-continue" hidden>Return to grove</button></div>`;
    dialog.dataset.puzzle=question.id;dialog.dataset.puzzleLevel=state.mode;
    $(".hh-puzzle-level").textContent=question.level;$("#hh-dialog-title").textContent=question.prompt;
    for(const clue of question.clues||[]){const li=document.createElement("li");li.textContent=clue;$(".hh-puzzle-clues").append(li);}
    $(".hh-puzzle-clues").hidden=!question.clues;
    $(".hh-question-help").textContent=question.type==="order"?"Select the runes in order. Check your complete arrangement when you are ready.":question.type==="number"?"Work out the answer and type the number below.":"Choose an answer, then press Check answer. You can change your choice first.";
    const updateSelection=()=>{
      $(".hh-answer-order").replaceChildren();
      if(question.type==="order")question.options.forEach((_,i)=>{const slot=document.createElement("span");slot.textContent=`${i+1}. ${selection[i]===undefined?"?":question.options[selection[i]]}`;$(".hh-answer-order").append(slot);});
      $$(".hh-answer").forEach(b=>{const selected=selection.includes(Number(b.dataset.answer));b.setAttribute("aria-pressed",String(selected));b.disabled=question.type==="order"&&selected;});
      $(".hh-submit-answer").disabled=question.type==="number"?!/^\d+$/.test($(".hh-number-answer").value.trim()):selection.length!==question.answer.length;
      $(".hh-undo-order").disabled=!selection.length;
    };
    if(question.type==="number"){$(".hh-number-form").hidden=false;$(".hh-number-answer").oninput=updateSelection;$(".hh-number-form").onsubmit=e=>{e.preventDefault();if(!$(".hh-submit-answer").disabled)$(".hh-submit-answer").click();};}
    else for(const index of shuffle(question.options.map((_,i)=>i))){const button=document.createElement("button");button.type="button";button.className="hh-answer";button.dataset.answer=index;button.textContent=question.options[index];button.onclick=()=>{if(answered)return;if(question.type==="order")selection.push(index);else selection=[index];updateSelection();};$(".hh-answers").appendChild(button);}
    $(".hh-reset-order").hidden=$(".hh-undo-order").hidden=question.type!=="order";
    $(".hh-reset-order").onclick=()=>{selection=[];updateSelection();};$(".hh-undo-order").onclick=()=>{selection.pop();updateSelection();};
    $(".hh-riddle-hint").onclick=()=>{hinted=true;$(".hh-puzzle-hint").textContent=question.hint;$(".hh-puzzle-hint").hidden=false;$(".hh-riddle-hint").hidden=true;};
    $(".hh-submit-answer").onclick=()=>resolveRiddle(isRiddleAnswer(question,question.type==="number"?$(".hh-number-answer").value:selection));
    $(".hh-leave-riddle").onclick=()=>resolveRiddle(false);$(".hh-continue").onclick=closeDialog;
    updateSelection();openDialog("riddle");(question.type==="number"?$(".hh-number-answer"):$(".hh-answer")).focus();
  }
  function resolveRiddle(correct){
    if(answered)return;answered=true;answerRiddle(state,correct,hinted);audio.effect(correct?"good":"bad");
    if(guideStep==="pumpkin"&&state.phase==="playing"){if(correct){guideStep="wisp";seedGuideTarget("wisp");}else seedGuideTarget("sweet");}
    $$(".hh-answer").forEach(b=>{b.disabled=true;b.classList.toggle("hh-correct",question.answer.includes(Number(b.dataset.answer)));});
    if(question.type==="number")$(".hh-number-answer").disabled=true;
    $(".hh-answer-feedback").textContent=`${state.message} ${question.explain}`;
    for(const name of ["reset-order","undo-order","leave-riddle","submit-answer","riddle-hint"])$(".hh-"+name).hidden=true;
    $(".hh-continue").hidden=false;$(".hh-continue").focus();renderUI();
  }
  function seedGuideTarget(kind){
    if(state.phase!=="playing")return;
    state.targets=[{id:state.nextId++,kind,slot:1,remaining:1,life:1}];
  }
  function endGuide(){guideStep="";settings.guided=false;$(".hh-guided").checked=false;state.targets=[];state.spawnClock=.3;save();}
  function begin(){
    state=createHarvest(settings.mode);paused=false;deck={};lastPhase="";beginHarvest(state);
    guideStep=$(".hh-guided").checked?"pumpkin":"";if(guideStep)seedGuideTarget("sweet");audio.start();renderUI();
  }
  function showHelp(){
    body.innerHTML=`<span class="hh-eyebrow">HOW TO PLAY / CLOCK PAUSED</span><h3 id="hh-dialog-title">Candy AND lanterns open the next path.</h3><div class="hh-help-cards"><div>${harvestIcon("sweet")}<strong>1. Solve pumpkins</strong><p>Tap orange pumpkins for +3 candy puzzles. Purple pumpkins give harder rune spells for +5. Correct answers also give you a carving pumpkin.</p></div><div>${harvestIcon("wisp")}<strong>2. Catch green wisps</strong><p>Tap a green flame to collect wax. A lantern needs 1 pumpkin and 1 wax. Your first set is free.</p></div><div>${harvestIcon("cursed")}<strong>3. Carve and light</strong><p>Open the carving bench. Draw outlines to remove pieces, then light your design. Gain +3 candy, a shield, and 2 less fright.</p></div><div>${harvestIcon("ghost")}<strong>4. Watch your fright</strong><p>Avoid ghosts without a shield. Wrong answers raise fright; a full meter ends the game. The bell spends 3 candy to remove 2 fright and clear ghosts.</p></div></div><p class="hh-question-help">Meet BOTH numbers above the orchard before the timer runs out. Repeat on all three paths to win. The timer always pauses inside puzzles and carving.</p><div class="hh-dialog-actions"><button type="button" class="hh-close-help hh-primary">Got it</button></div>`;
    $(".hh-close-help").onclick=closeDialog;openDialog("help");$(".hh-close-help").focus();
  }
  function renderObjective(){
    const night=NIGHTS[state.night],remaining=Math.max(0,night.candy-state.candy),lanterns=Math.max(0,night.lanterns-state.lanterns);
    let title="Bring candy AND lanterns to the gate.",detail=`This path needs ${night.candy} candy and ${night.lanterns} lit lantern${night.lanterns===1?"":"s"}.`,label="Begin harvest";nextAction="begin";
    if(paused){title="The harvest is paused.";detail="Your timer and all spirits are waiting.";label="Resume";nextAction="resume";}
    else if(state.phase==="won"||state.phase==="lost"){title=state.phase==="won"?"All three paths are complete!":"Try another harvest.";detail=state.reason;label="Harvest again";}
    else if(state.phase==="cleared"){title="Both goals complete. The next path is open.";detail="Your supplies and shields carry over. Candy and lantern goals reset.";label="Next path";nextAction="next";}
    else if(guideStep){
      [title,detail,label,nextAction]={pumpkin:["1. Tap the orange pumpkin below.","Solve its puzzle to earn candy and a pumpkin. The clock is paused while you learn.","Find pumpkin","sweet"],wisp:["2. Tap the green flame below.","Green wisps give wax. You need wax to put a candle inside a carved pumpkin.","Find green wax","wisp"],carve:["3. Make your first lantern.","You have the supplies. Draw a face, then light it to earn candy and a ghost shield.","Open carving bench","carve"]}[guideStep];
    }else if(state.phase!=="ready"){
      if(state.fear>=MODES[state.mode].fear-2&&state.candy>=3&&state.bellCooldown<=0){title="Your fright is nearly full. Ring the bell.";detail="Spend 3 candy to remove 2 fright and clear ghosts. Lanterns also calm fright.";label="Ring the bell";nextAction="bell";}
      else if(lanterns&&canCarve(state)){title=`Light ${lanterns} more lantern${lanterns===1?"":"s"}. Your supplies are ready.`;detail=`You still need ${remaining} candy. A lit lantern gives 3 candy, a shield, and 2 less fright.`;label="Open carving bench";nextAction="carve";}
      else if(lanterns&&!state.wax){title="Collect wax from the green flames.";detail=`You need ${lanterns} more lantern${lanterns===1?"":"s"} and ${remaining} more candy. Tap a green wisp when one appears.`;label="";nextAction="";}
      else if(lanterns&&!state.pumpkins){title="Solve a pumpkin puzzle to earn a carving pumpkin.";detail=`Your lantern goal still needs ${lanterns} more. Correct answers give candy AND a pumpkin for the bench.`;label="";nextAction="";}
      else{title=`Earn ${remaining} more candy to open the gate.`;detail=lanterns?"Solve pumpkin puzzles for candy and carving pumpkins, then light your remaining lanterns.":"Your lantern goal is complete. Solve orange or purple pumpkins; shields let you banish ghosts for +2 candy.";label="";nextAction="";}
    }
    $(".hh-next-title").textContent=title;$(".hh-next-detail").textContent=detail;$(".hh-next-action").textContent=label;$(".hh-next-action").hidden=!label;
    $(".hh-guide-steps").hidden=!guideStep;for(const el of $$("[data-step]"))el.classList.toggle("hh-current-step",el.dataset.step===guideStep);
    wrapper.dataset.learning=String(!!guideStep);
    $(".hh-carve").classList.toggle("hh-recommended",nextAction==="carve");
  }
  function showBench(practice=false){
    if(!practice&&!openCarving(state))return;
    const workshop=createCarvingWorkshop(body,{practice,reducedMotion:reduced.matches,sound:kind=>audio.effect(kind),onCancel:closeDialog,onSave:art=>{
      if(!practice&&!finishCarving(state,art))return;
      gallery.unshift(art);gallery=gallery.slice(0,6);save();audio.effect("light");
      if(practice)state.message="Your lantern is on the shelf. The carving studio never spends harvest supplies.";
      else if(guideStep==="carve"){endGuide();state.message="First lantern lit! +3 candy and a shield. The clock starts now: finish the candy goal to open the next path.";}
      closeDialog();renderGallery();
    }});
    carving={practice,...workshop};openDialog("carve");$(".hh-carving-canvas").focus();renderUI();
  }
  function renderGallery(){
    const shelf=$(".hh-gallery");shelf.replaceChildren();
    if(!gallery.length){const empty=document.createElement("p");empty.className="hh-empty-shelf";empty.textContent="Your lanterns will glow here. Visit the carving studio to make your first.";shelf.appendChild(empty);return;}
    for(const art of gallery){const card=document.createElement("figure"),preview=document.createElement("canvas"),caption=document.createElement("figcaption");preview.width=256;preview.height=208;preview.setAttribute("role","img");preview.setAttribute("aria-label",`${art.name}, ${STENCILS[art.stencil].name} pumpkin with ${art.glow} candlelight`);drawCarving(preview.getContext("2d"),256,208,art.cuts,art.stencil,art.glow,false);const name=document.createElement("strong"),detail=document.createElement("span");name.textContent=art.name;detail.textContent=`${art.cuts.length} cutouts / ${art.glow} candlelight`;caption.append(name,detail);card.append(preview,caption);shelf.appendChild(card);}
  }
  function catchSpirit(id){if(paused||modal)return;const event=catchTarget(state,id);if(!event)return;if(event==="wax"&&guideStep==="wisp"){guideStep="carve";state.targets=[];}audio.effect(event==="wax"?"wax":event==="ghost"?"bad":"good");if(event==="riddle")showRiddle();renderUI();}
  function renderTargets(){
    const alive=new Set(state.targets.map(t=>t.id));for(const [id,el]of targets)if(!alive.has(id)){el.remove();targets.delete(id);}
    for(const t of state.targets){let el=targets.get(t.id);if(!el){el=document.createElement("button");el.type="button";el.className=`hh-target hh-target-${t.kind}`;el.dataset.kind=t.kind;el.dataset.id=t.id;el.title=TARGETS[t.kind].hint;el.setAttribute("aria-label",`${TARGETS[t.kind].name}. ${TARGETS[t.kind].hint}`);el.innerHTML=`${harvestIcon(t.kind)}<span>${t.kind==="sweet"?"+3 CANDY":t.kind==="cursed"?"+5 CANDY":t.kind==="wisp"?"+1 WAX":"BEWARE"}</span><i></i>`;el.onclick=()=>catchSpirit(t.id);$(".hh-targets").appendChild(el);targets.set(t.id,el);}const x=[18,50,82][t.slot%3],y=t.slot<3?44:75;el.style.left=`${x}%`;el.style.top=`${y}%`;el.style.setProperty("--life",Math.max(0,t.remaining/t.life));el.disabled=paused||!!modal;el.querySelector("span").textContent=t.kind==="sweet"?"PUZZLE +3":t.kind==="cursed"?"SPELL +5":t.kind==="wisp"?"COLLECT WAX":state.shields?"BANISH +2":"AVOID GHOST";if(t.kind==="ghost")el.setAttribute("aria-label",state.shields?"Ghost. Use one shield to banish it for 2 candy.":"Ghost. Avoid: touching adds 2 fright and steals 2 candy.");}
  }
  function renderPanel(){
    const phase=paused?"paused":state.phase,key=`${phase}:${state.night}`;if(lastPhase===key)return;lastPhase=key;
    const panel=$(".hh-stage-panel");panel.replaceChildren();panel.hidden=!["ready","paused","won","lost","cleared"].includes(phase);
    if(panel.hidden)return;const card=document.createElement("div"),eyebrow=document.createElement("span"),title=document.createElement("h4"),text=document.createElement("p");eyebrow.className="hh-eyebrow";
    const data={ready:["WELCOME, NIGHT GARDENER","Three paths. One midnight harvest.","Fill BOTH goals: 9 candy and 1 lit lantern open this first path. The guided start teaches you each action before the clock begins. Complete all three paths to win."],paused:["TAKE YOUR TIME","The grove can wait.","The harvest clock and all spirits are paused."],cleared:["OFFERING COMPLETE","A path through the dark.",state.reason],won:["THE MIDNIGHT GATHERING","You kept the lights alive.",state.reason],lost:["UNTIL ANOTHER MOON","The harvest has ended.",state.reason]}[phase];
    eyebrow.textContent=data[0];title.textContent=data[1];text.textContent=data[2];card.append(eyebrow,title,text);
    if(["won","lost","cleared"].includes(phase)){const score=document.createElement("strong");score.className="hh-end-score";score.textContent=`${state.score} points / ${state.totalLanterns} lanterns lit`;card.appendChild(score);}
    if(phase==="cleared"){const next=document.createElement("button");next.type="button";next.className="hh-primary hh-next";next.textContent=`Enter ${NIGHTS[state.night+1].name}`;next.onclick=()=>{nextNight(state);deck={};lastPhase="";audio.start();renderUI();};card.appendChild(next);}
    if(phase==="paused"){const resume=document.createElement("button");resume.type="button";resume.className="hh-primary";resume.textContent="Resume harvest";resume.onclick=()=>setPaused(false);card.appendChild(resume);}panel.appendChild(card);
  }
  function renderUI(){
    const night=NIGHTS[state.night],active=["playing","riddle","carving"].includes(state.phase);
    if(["won","lost"].includes(state.phase))guideStep="";
    wrapper.dataset.phase=state.phase;wrapper.dataset.paused=String(paused);wrapper.dataset.night=String(state.night+1);
    stats.candy.textContent=`${state.candy} / ${night.candy}`;stats.lanterns.textContent=`${state.lanterns} / ${night.lanterns}`;
    const seconds=Math.ceil(state.time);stats.time.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;
    stats.fear.textContent=`${state.fear} / ${MODES[state.mode].fear}`;$(".hh-fright meter").max=MODES[state.mode].fear;$(".hh-fright meter").value=state.fear;
    stats.inventory.textContent=`${state.pumpkins} pumpkin${state.pumpkins===1?"":"s"} / ${state.wax} wax`;stats.shield.textContent=`${state.shields} ghost shield${state.shields===1?"":"s"} / streak ${state.streak}`;
    $(".hh-mode-note").textContent={cozy:"Cozy: gentle riddles and number patterns / 3-rune spells / longer nights / 8 fright.",eerie:"Eerie: deduction, tricky patterns, and multi-step reasoning / 4-rune spells / 6 fright.",wicked:"Wicked: expert logic and typed number answers / 5-rune spells / shorter nights / 5 fright."}[settings.mode];
    $(".hh-guided").disabled=active||state.phase==="cleared";$(".hh-learn-toggle").hidden=active||state.phase==="cleared";
    $(".hh-mode").value=settings.mode;$(".hh-mode").disabled=active||state.phase==="cleared";$(".hh-start").textContent=state.phase==="ready"?"Begin harvest":active||state.phase==="cleared"?"New harvest":"Harvest again";
    $(".hh-pause").disabled=!active;$(".hh-pause").textContent=paused?"Resume":"Pause";$(".hh-practice").disabled=active||state.phase==="cleared";
    $(".hh-carve").disabled=paused||!canCarve(state)||!!modal||!!guideStep&&guideStep!=="carve";$(".hh-bell").disabled=paused||state.phase!=="playing"||state.candy<3||state.bellCooldown>0||!!modal||!!guideStep;
    $(".hh-carve small").textContent=state.phase==="ready"?"Begin a harvest, or use the studio":guideStep&&guideStep!=="carve"?"Finish the highlighted lesson step first":!state.wax?"Need wax: tap a green flame":!state.pumpkins?"Need a pumpkin: solve a riddle":"Costs 1 pumpkin + 1 wax";
    $(".hh-bell small").textContent=state.bellCooldown>0?`Recharging / ${Math.ceil(state.bellCooldown)}s` : "Costs 3 candy / -2 fright";
    $(".hh-night-count").textContent=`PATH 0${state.night+1} / 03`;
    $(".hh-place").textContent=night.name;$(".hh-subtitle").textContent=night.subtitle;
    $(".hh-scene-tip").textContent=guideStep?{pumpkin:"1. Tap the orange pumpkin to solve a puzzle. Your clock is paused.",wisp:"2. Tap the green flame to collect candle wax. Your clock is paused.",carve:"3. Your supplies are ready. Open the bench, carve a shape, then light it."}[guideStep]:modal?"The harvest clock is paused while you work.":state.phase==="playing"?"Tap pumpkins for puzzles. Green flames give wax. Puzzles and carving pause the clock.":"Every lantern makes the dark a little kinder.";
    $(".hh-scene-carve").hidden=guideStep!=="carve";$(".hh-scene-carve").disabled=paused||!!modal;
    if(lastMessage!==state.message){$(".hh-status").textContent=state.message;lastMessage=state.message;}
    if(["won","lost"].includes(state.phase)&&state.score>best[state.mode]){best[state.mode]=state.score;save();}
    $(".hh-best").textContent=`${MODES[state.mode].name} best: ${best[state.mode]} points`;
    renderObjective();renderPanel();renderTargets();
  }
  function setPaused(value){if(!["playing","riddle","carving"].includes(state.phase))return;paused=value;if(paused)audio.pause();else audio.start();lastPhase="";renderUI();}
  on($(".hh-start"),"click",begin);
  on($(".hh-mode"),"change",e=>{settings.mode=e.target.value;state=createHarvest(settings.mode);paused=false;lastPhase="";save();renderUI();});
  on($(".hh-pause"),"click",()=>setPaused(!paused));on($(".hh-practice"),"click",()=>{audio.start();showBench(true);});on($(".hh-carve"),"click",()=>showBench(false));on($(".hh-bell"),"click",()=>{if(ringBell(state)){audio.effect("bell");renderUI();}});
  on($(".hh-scene-carve"),"click",()=>showBench());on($(".hh-help"),"click",showHelp);on($(".hh-guided"),"change",e=>{settings.guided=e.target.checked;save();});
  on($(".hh-skip-guide"),"click",()=>{endGuide();state.message="Lesson skipped. Gather candy and light the required lanterns before midnight.";renderUI();});
  on($(".hh-next-action"),"click",()=>{if(nextAction==="begin")begin();else if(nextAction==="resume")setPaused(false);else if(nextAction==="carve")showBench();else if(nextAction==="bell")$(".hh-bell").click();else if(nextAction==="next")$(".hh-next")?.click();else{const target=$(".hh-target-"+nextAction);target?.scrollIntoView({block:"center",behavior:reduced.matches?"instant":"smooth"});target?.focus({preventScroll:true});}});
  on(dialog,"cancel",e=>{e.preventDefault();closeDialog();});
  for(const b of $$("[data-audio]"))on(b,"click",()=>{settings[b.dataset.audio]=!settings[b.dataset.audio];audio.mute();if(settings.music||settings.effects)audio.start();syncAudio();save();});
  on(document,"visibilitychange",()=>{if(document.hidden){setPaused(true);audio.pause();}});
  on(window,"keydown",e=>{if(e.code!=="KeyP"||modal||e.target.closest("input,select,textarea,[contenteditable=true]"))return;e.preventDefault();setPaused(!paused);});
  const resize=()=>{scenerySize=surface.resize();};const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  const loop=createFrameLoop((_,dt)=>{if(disposed)return;if(!paused&&!modal&&!guideStep)advanceHarvest(state,dt);if(!paused&&!document.hidden)artTime+=dt;audio.update(dt,!paused&&!document.hidden&&(["playing","riddle","carving"].includes(state.phase)||!!modal));drawGrove(surface.context,scenerySize.width,scenerySize.height,state.night,artTime,reduced.matches);carving?.render(dt);renderTargets();uiClock+=dt;if(uiClock>.1){uiClock=0;renderUI();}});
  syncAudio();renderGallery();renderUI();loop.start();
  return()=>{disposed=true;loop.stop();carving?.dispose();observer.disconnect();listeners.forEach(remove=>remove());if(dialog.open)dialog.close();audio.dispose();surface.dispose();wrapper.remove();};
}
