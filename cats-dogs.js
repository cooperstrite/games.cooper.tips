import { OPPONENT_LEVELS } from "./arcade/opponents.js";
import { TUG_ARENAS, TUG_MATCH_RULES, TUG_GADGETS, createTugMatch, startTugMatch, nextTugRound, queueTugPull, queueTugGadget, createTugComputer, tickTugMatch, tugSecondsLeft, tugPeriod, tugTarget } from "./cats-dogs-engine.js";
import { createTugRenderer } from "./cats-dogs-renderer.js";
import { createTugAudio } from "./cats-dogs-audio.js";
import { readTugWardrobe, TUG_REWARDS } from "./cats-dogs-customization.js";
import { createTugStudio } from "./cats-dogs-studio.js";
import { createRewardSession, mountGameWallet } from "./arcade/game-services.js";
import { getArcadeWallet } from "./arcade/wallet.js";

const STORAGE = "cooper-cats-dogs-v2";
const escapeHTML = value => value.replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
function readSettings() { try { const raw=JSON.parse(localStorage.getItem(STORAGE)); return raw && typeof raw==="object" ? raw : {}; } catch { return {}; } }
const paw = '<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="27" rx="10" ry="8"/><ellipse cx="7" cy="17" rx="4" ry="6" transform="rotate(-25 7 17)"/><ellipse cx="15" cy="9" rx="4" ry="6"/><ellipse cx="25" cy="9" rx="4" ry="6"/><ellipse cx="33" cy="17" rx="4" ry="6" transform="rotate(25 33 17)"/></svg>';
export function createCatsDogs(root, { editorOnly = false, onAppearanceChange } = {}) {
  if (editorOnly) return createTugStudio(root, onAppearanceChange);
  const saved=readSettings(), events=new AbortController(), reduced=matchMedia("(prefers-reduced-motion: reduce)");
  const wardrobe=readTugWardrobe(getArcadeWallet().getState().owned), names={cats:wardrobe.cats.name,dogs:wardrobe.dogs.name};
  const unmountWallet=mountGameWallet(root,"catsdogs");let reward=createRewardSession("catsdogs"), paid=false;
  let state=createTugMatch(saved), sound=saved.sound!==false, music=saved.music===true, wins=Number.isSafeInteger(saved.wins)&&saved.wins>=0?saved.wins:0;
  let computer=createTugComputer({difficulty:state.difficulty}), disposed=false, frame, last=performance.now(), beatCue=-1, loaded=false;
  const audio=createTugAudio(); audio.configure(sound,music);
  const wrapper=document.createElement("section");wrapper.className="cd-game";
  wrapper.innerHTML=`<header class="cd-hero"><div><p class="cd-eyebrow">THE PAW PULL CHAMPIONSHIP</p><h3>Small paws.<br>Big rivalry.</h3><p>A little rhythm. A little strategy.<br>One very coveted patch of park.</p></div><div class="cd-hero-badge">${paw}<span>FIRST TO<br><b>2 WINS</b></span></div></header>
  <div class="cd-setup"><label>Play with<select class="cd-mode" aria-label="Game mode"><option value="ai">Computer opponent</option><option value="local">2 players / same device</option></select></label><label class="cd-team-field">Your team<select class="cd-team" aria-label="Your team"><option value="cats">Cats / Team Whiskers</option><option value="dogs">Dogs / Team Woof</option></select></label><label class="cd-difficulty-field">Computer difficulty<select class="cd-difficulty" aria-label="Computer difficulty">${OPPONENT_LEVELS.map(l=>`<option value="${l.id}">${l.label}</option>`).join("")}</select></label></div>
  <div class="cd-venues" role="group" aria-label="Choose an arena">${Object.entries(TUG_ARENAS).map(([id,a])=>`<button type="button" data-arena="${id}" aria-pressed="false"><span class="cd-venue-thumb cd-venue-${id}"></span><span><b>${a.name}</b><small>${a.subtitle}</small></span></button>`).join("")}</div>
  <p class="cd-arena-note"></p><div class="cd-personalize"><a href="#characters/catsdogs">Personalize your cat &amp; dog &rarr;</a><a href="#store/catsdogs">Pet accessories shop &rarr;</a></div>
  <div class="cd-match"><div class="cd-scoreboard"><div class="cd-score cd-cats">${paw}<span>${escapeHTML(names.cats)}<b class="cd-cat-score"></b></span></div><div class="cd-round"><span class="cd-round-number">ROUND 01</span><strong class="cd-time">0:36</strong><small>Best of 3 rounds</small></div><div class="cd-score cd-dogs"><span>${escapeHTML(names.dogs)}<b class="cd-dog-score"></b></span>${paw}</div></div>
    <div class="cd-stage"><canvas aria-label="Animated tug-of-war between Team Whiskers and Team Woof. Rope position is also shown in the lead meter below." role="img"></canvas><div class="cd-stage-shade"></div><div class="cd-stage-overlay"><div class="cd-stage-card"><p class="cd-overlay-kicker"></p><h4 class="cd-overlay-title"></h4><p class="cd-overlay-detail"></p><button type="button" class="cd-main-action">Start match</button></div></div><div class="cd-stage-label"><i></i><span></span></div></div>
    <div class="cd-lead"><span>CATS</span><div class="cd-lead-track" role="meter" aria-label="Rope position" aria-valuemin="-32" aria-valuemax="32" aria-valuenow="0"><i></i><b></b></div><span>DOGS</span></div>
    <section class="cd-rhythm" aria-label="Pull timing"><div class="cd-rhythm-caption"><b class="cd-timing-call">Find your rhythm</b><span>ONE PULL PER BEAT</span></div><div class="cd-timing-track"><div class="cd-good-zone"></div><div class="cd-perfect-zone"></div><i class="cd-timing-marker"></i><span>GOLD</span></div><p>Aim for the center of gold. The target moves each beat; closer hits pull harder.</p></section>
    <div class="cd-player-panels">${["cats","dogs"].map((side,i)=>`<section class="cd-player cd-${side}" data-player="${side}"><div class="cd-player-top"><strong>${escapeHTML(names[side])}</strong><span class="cd-owner"></span></div><div class="cd-energy-label"><span>Stamina</span><b class="cd-energy-number">100%</b></div><div class="cd-energy" role="progressbar" aria-label="${escapeHTML(names[side])} stamina" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i></i></div><div class="cd-combo"><span class="cd-combo-dots"><i></i><i></i><i></i></span><span class="cd-combo-note">3 perfect pulls charge a super</span></div><button type="button" class="cd-pull" data-pull="${side}">${paw}<span>Pull for ${side}</span><kbd>${i?"L":"A"}</kbd></button><p class="cd-feedback">Ready to pull</p><div class="cd-gadget-caption"><b>Devices</b><span class="cd-charges">2 left</span></div><div class="cd-gadgets">${Object.entries(TUG_GADGETS).map(([id,g],j)=>`<button type="button" data-gadget="${id}" data-side="${side}" title="${g.name}: ${g.detail}" aria-label="${side}: ${g.name}. ${g.detail}"><span class="cd-device-icon cd-device-${id}" aria-hidden="true"></span>${g.short}<kbd>${(i?["U","I","O"]:["Q","W","E"])[j]}</kbd></button>`).join("")}</div><p class="cd-effects">2 free devices each round</p></section>`).join("")}</div>
    <p class="cd-earned" role="status"></p><p class="cd-status" role="status" aria-live="polite"></p>
    <div class="cd-toolbar"><button type="button" class="cd-pause">Pause</button><button type="button" class="cd-reset">New match</button><span></span><button type="button" class="cd-sound" aria-pressed="true">Sound on</button><button type="button" class="cd-music" aria-pressed="false">Music off</button></div>
  </div>
  <section class="cd-instructions"><div><p class="cd-eyebrow">THE GAME PLAN</p><h4>Timing beats tiny tantrums.</h4><p>Reach your flag or lead after 24 beats. Win two rounds to take the cup. A championship lasts no more than three rounds.</p></div><ol><li><b>Catch the gold.</b> Tap your team's button when the marker crosses gold. The thin gold zone moves between beats, and the beat speeds up. A hit nearer its center pulls harder, even against another perfect hit. Mint still gives a good pull. Each team gets one try per beat.</li><li><b>Take a breather.</b> Pulling uses 20 stamina and gives 8 back. Skip a beat to recover <span class="cd-rest-amount">30</span>. Below 20, your pull is much weaker. Resting keeps your combo.</li><li><b>Make it super.</b> Three perfect pulls charge your paw meter. Your next perfect pull has double power. An off-beat or good pull resets the combo.</li><li><b>Make a little mischief.</b> Each team gets 2 devices per round. Mud weakens their pulls for 2 beats by 35%; a squeaky toy takes 22 stamina. Attacks give a full beat of warning. Use a shield during that warning to block the attack, clear mud, and protect yourself for 3 beats. Devices are free, with one device in flight at a time.</li><li><b>Break a tie.</b> An exactly tied round ends with a final pull. Wait for GO, then be the first to pull. An early pull loses the round. If neither team reacts within 3 seconds, the round ends without a point; it never repeats forever.</li></ol><p class="cd-key-note"></p><p class="cd-record"></p></section>`;
  root.append(wrapper);
  const $=selector=>wrapper.querySelector(selector), $$=selector=>[...wrapper.querySelectorAll(selector)];
  $(".cd-match").setAttribute("aria-live","off");
  const on=(node,event,fn)=>node.addEventListener(event,fn,{signal:events.signal});
  const renderer=createTugRenderer($("canvas"),{reducedMotion:reduced.matches,wardrobe});
  function persist() { try {localStorage.setItem(STORAGE,JSON.stringify({mode:state.mode,team:state.team,difficulty:state.difficulty,arena:state.arena,sound,music,wins}));}catch{} }
  function say(text){$(".cd-status").textContent=text;}
  function text(selector,value) {const el=$(selector);if(el.textContent!==String(value))el.textContent=value;}
  function configure() {
    $(".cd-mode").value=state.mode;$(".cd-team").value=state.team;$(".cd-difficulty").value=state.difficulty;
    $(".cd-team-field").hidden=state.mode==="local";$(".cd-difficulty-field").hidden=state.mode==="local";
    $$('[data-arena]').forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.arena===state.arena)));
    text(".cd-arena-note",TUG_ARENAS[state.arena].note);text(".cd-stage-label span",TUG_ARENAS[state.arena].name);
    text(".cd-rest-amount",TUG_ARENAS[state.arena].rest);text(".cd-key-note",state.mode==="local"?"Share a keyboard or touchscreen: Cats press A, Dogs press L. Both teams use the same beat and the same rules.":`You are ${names[state.team]}. Press ${state.team==="cats"?"A":"L"} or Space to pull. P pauses. The computer has the same stamina, timing windows, and pull strength as you.`);
    text(".cd-record",`${wins} championship${wins===1?"":"s"} won against the computer on this browser.`);
    text(".cd-sound",sound?"Sound on":"Sound off");text(".cd-music",music?"Music on":"Music off");$(".cd-sound").setAttribute("aria-pressed",String(sound));$(".cd-music").setAttribute("aria-pressed",String(music));
    const rates=TUG_REWARDS[state.difficulty];root.querySelector(".arcade-game-wallet>span").textContent=state.mode==="local"?"Friendly matches earn no coins. All devices are free; shop items only change your look.":`${state.difficulty[0].toUpperCase()+state.difficulty.slice(1)} computer: ${rates.round} coins per round you win + ${rates.win} for winning the match (up to ${rates.round*2+rates.win}). Banked only when the match ends, after at least 4 pulls. Abandoning a match earns nothing.`;
    text(".cd-key-note",$(".cd-key-note").textContent+" Devices: Cats Q / W / E; Dogs U / I / O = Mud / Squeak / Shield.");
    wrapper.dataset.arena=state.arena;persist();
  }
  function update() {
    const playing=state.phase==="playing"&&!state.paused, showdown=state.phase==="showdown"&&!state.paused, phase=state.beatTime/tugPeriod(state), target=tugTarget(state);
    wrapper.dataset.phase=state.phase;wrapper.dataset.beat=state.beat;wrapper.dataset.paused=String(state.paused);
    text(".cd-cat-score",`${state.scores.cats} / 2`);text(".cd-dog-score",`${state.scores.dogs} / 2`);
    text(".cd-round-number",showdown?"FINAL PULL":`ROUND ${state.round} / 3`);
    const seconds=Math.ceil(tugSecondsLeft(state));text(".cd-time",`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`);
    $(".cd-lead-track b").style.left=`${50+state.position/TUG_MATCH_RULES.target*50}%`;
    $(".cd-lead-track").setAttribute("aria-valuenow",state.position.toFixed(1));$(".cd-lead-track").setAttribute("aria-valuetext",Math.abs(state.position)<.05?"Even":`${state.position<0?"Cats":"Dogs"} lead by ${Math.abs(state.position).toFixed(1)}`);
    $(".cd-good-zone").style.left=`${(target-TUG_MATCH_RULES.goodWindow)*100}%`;$(".cd-good-zone").style.width=`${TUG_MATCH_RULES.goodWindow*200}%`;$(".cd-perfect-zone").style.left=`${(target-TUG_MATCH_RULES.perfectWindow)*100}%`;$(".cd-perfect-zone").style.width=`${TUG_MATCH_RULES.perfectWindow*200}%`;$(".cd-timing-track>span").style.left=`${target*100}%`;
    $(".cd-rhythm").dataset.showdown=String(showdown);
    $(".cd-timing-marker").style.left=`${phase*100}%`;$(".cd-rhythm").classList.toggle("is-gold",playing&&Math.abs(phase-target)<=TUG_MATCH_RULES.perfectWindow);
    text(".cd-timing-call",showdown?state.photoGo?"GO! Pull now!":"WAIT... do not pull yet":!playing?state.paused?"Take a breather":"Find your rhythm":Math.abs(phase-target)<=TUG_MATCH_RULES.perfectWindow?"GOLD! Pull now":phase<target?"Here comes the gold...":"Pulls land at the end");
    for(const side of ["cats","dogs"]) {
      const panel=$(`[data-player="${side}"]`),pet=state.sides[side],human=state.mode==="local"||state.team===side;
      panel.querySelector(".cd-owner").textContent=state.mode==="local"?side==="cats"?"PLAYER 1":"PLAYER 2":human?"YOU":"COMPUTER";
      panel.querySelector(".cd-energy-number").textContent=`${Math.round(pet.energy)}%`;panel.querySelector(".cd-energy i").style.width=pet.energy+"%";panel.querySelector(".cd-energy").setAttribute("aria-valuenow",Math.round(pet.energy));panel.classList.toggle("is-tired",pet.energy<20);
      [...panel.querySelectorAll(".cd-combo-dots i")].forEach((dot,i)=>dot.classList.toggle("is-lit",i<pet.streak));
      panel.querySelector(".cd-combo-note").textContent=pet.streak===3?"SUPER READY / hit gold!":"3 perfect pulls charge a super";
      const button=panel.querySelector(".cd-pull");button.disabled=!(playing||showdown)||!human||playing&&!!pet.queued;button.querySelector("span").textContent=!human?"Computer is playing":pet.queued?"Pull locked in":`Pull for ${side}`;
      panel.querySelector(".cd-charges").textContent=`${pet.charges} left`;const incoming=state.sides[side==="cats"?"dogs":"cats"].incoming;
      panel.querySelector(".cd-effects").textContent=incoming?`${TUG_GADGETS[incoming].name} incoming! Shield now.`:pet.gadget?`${TUG_GADGETS[pet.gadget].name} prepared`:pet.shield?`Shield: ${pet.shield} beats`:pet.mud?`Muddy paws: ${pet.mud} beats / -35% power`:pet.incoming?"Attack on its way...":"2 free devices each round";panel.querySelector(".cd-effects").dataset.warning=String(!!incoming);
      panel.querySelectorAll("[data-gadget]").forEach(b=>b.disabled=!playing||!human||!pet.charges||!!pet.gadget||!!pet.incoming);
      const feedback=panel.querySelector(".cd-feedback");feedback.textContent=pet.feedback;feedback.dataset.kind=pet.feedbackKind;
    }
    $(".cd-pause").disabled=!["countdown","playing","showdown"].includes(state.phase);text(".cd-pause",state.paused?"Resume":"Pause");
    const overlay=$(".cd-stage-overlay");overlay.hidden=playing;overlay.dataset.kind=state.paused?"paused":state.phase;
    $(".cd-main-action").hidden=["countdown","showdown"].includes(state.phase)&&!state.paused;$(".cd-main-action").disabled=!loaded;
    if(state.paused) {text(".cd-overlay-kicker","PAWS FOR A MOMENT");text(".cd-overlay-title","Take a breather.");text(".cd-overlay-detail","The rope, rhythm, and computer are paused.");text(".cd-main-action","Resume match");}
    else if(state.phase==="ready") {text(".cd-overlay-kicker","A FRIENDLY LITTLE SHOWDOWN");text(".cd-overlay-title","Who rules the park?");text(".cd-overlay-detail","Catch the gold. Save your stamina. First to two wins.");text(".cd-main-action",loaded?"Start match":"Getting the park ready...");}
    else if(state.phase==="countdown") {text(".cd-overlay-kicker","PAWS ON THE ROPE");text(".cd-overlay-title",String(Math.max(1,Math.ceil(state.countdown))));text(".cd-overlay-detail",state.mode==="local"?"Cats: A / Dogs: L":"Watch the gold zone below.");}
    else if(showdown) {overlay.dataset.go=String(state.photoGo);text(".cd-overlay-kicker","EXACT TIE / ONE FINAL PULL");text(".cd-overlay-title",state.photoGo?"GO!":"Wait...");text(".cd-overlay-detail",state.photoGo?"First pull wins the round!":"Wait for GO. An early pull loses.");}
    else if(state.phase==="roundEnd"||state.phase==="matchEnd") {
      const match=state.phase==="matchEnd",winner=match?state.winner:state.roundWinner;
      text(".cd-overlay-kicker",match&&winner?"THE CUP HAS A NEW HOME":winner?"ROUND COMPLETE":"WHAT A CLOSE CALL");
      text(".cd-overlay-title",winner?`${names[winner]} ${match?"wins the cup!":"takes the round!"}`:"An even match!");
      const score=`${state.scores.cats} - ${state.scores.dogs}`;
      text(".cd-overlay-detail",match&&winner?`${score} / ${state.totals[winner].perfect} perfect pulls and ${state.totals[winner].bursts} super pulls.`:winner?`${score}. ${state.finishReason}. Fresh stamina and devices next round.`:match?"No contest. Three rounds complete. No more overtime.":`${state.finishReason}. No point awarded; one round used.`);text(".cd-main-action",match?"Play another match":"Next round");
    }
  }
  function process(outcomes) {
    for(const event of outcomes) {
      if(event.type==="beat") { renderer.hit(event,state);audio.beat(state.beat);beatCue=-1; }
      if(event.type==="pull") renderer.pull(event.side,event.power);
      if(event.type==="gadget") {audio.play("gadget");say(`${names[event.side]} prepared ${TUG_GADGETS[event.gadget].name}.`);}
      if(event.type==="showdown") say("Exact tie! Final pull: wait for GO. Pulling early loses.");
      if(event.type==="go") {audio.play("burst");say("GO! First pull wins the round!");}
      if(event.type==="start") say("Go! Tap once in the gold zone, or skip a beat to rest.");
      if(event.type==="finish") {
        const victory=event.winner&&(state.mode==="local"||event.winner===state.team);audio.play(victory?"win":"lose");
        if(event.match&&!paid){paid=true;const current=reward,progress={mode:state.mode,difficulty:state.difficulty,finished:true,won:state.winner===state.team,roundsWon:state.scores[state.team],pulls:state.totals[state.team].pulls};current.award(progress).then(result=>{if(!disposed&&reward===current)text(".cd-earned",result.coins?`+${result.coins} coins banked in your shared wallet.`:state.mode==="local"?"Friendly match / no coins earned.":"No coins earned this match. Win a round and finish the match to earn coins.");}).catch(()=>{if(!disposed&&reward===current)text(".cd-earned","Your browser could not save the coin reward.");});}
        if(event.match&&state.mode==="ai"&&event.winner===state.team){wins++;configure();}
        say(event.winner?`${names[event.winner]} ${event.match?"wins the championship":"wins the round"}. ${state.scores.cats} to ${state.scores.dogs}.`:state.phase==="matchEnd"?"Match complete. No contest.":"No point awarded. Continue to the next round.");
      }
    }
  }
  function advance(now) {
    const dt=Math.min(.15,Math.max(0,(now-last)/1000));last=now;
    process(tickTugMatch(state,dt,computer));
    if(state.phase==="playing"&&!state.paused&&state.beatTime/tugPeriod(state)>=tugTarget(state)-TUG_MATCH_RULES.perfectWindow&&beatCue!==state.beat){audio.play("beat");beatCue=state.beat;}
    return dt;
  }
  function loop(now){if(disposed)return;const dt=advance(now);update();renderer.draw(state,dt);frame=requestAnimationFrame(loop);}
  function pull(side) {
    if(state.mode==="ai"&&side!==state.team)return;
    audio.unlock();advance(performance.now());const outcome=queueTugPull(state,side);
    if(outcome.type==="pull"){audio.play(outcome.burst?"burst":outcome.quality==="perfect"?"perfect":"pull");say(`${names[side]}: ${state.sides[side].feedback}. Pull locked in for this beat.`);}
    if(outcome.type==="finish"||outcome.type==="pull")process([outcome]);
    update();
  }
  function gadget(side,id){if(state.mode==="ai"&&side!==state.team)return;audio.unlock();advance(performance.now());if(queueTugGadget(state,side,id))process([{type:"gadget",side,gadget:id}]);update();}
  function pause(value=!state.paused){if(!["countdown","playing","showdown"].includes(state.phase))return;state.paused=value;last=performance.now();audio.stop();update();say(value?"Match paused.":"Match resumed.");}
  function reset(changes={}) { audio.stop();state=createTugMatch({...state,...changes});reward=createRewardSession("catsdogs");paid=false;text(".cd-earned","");computer=createTugComputer({difficulty:state.difficulty});beatCue=-1;last=performance.now();configure();update();say("Choose your team and arena, then start the match."); }
  on($(".cd-main-action"),"click",()=>{audio.unlock();if(state.paused)pause(false);else if(state.phase==="roundEnd")nextTugRound(state);else{if(state.phase==="matchEnd")reset();startTugMatch(state);}last=performance.now();beatCue=-1;update();$(".cd-match").scrollIntoView({block:"start",behavior:"instant"});});
  on($(".cd-pause"),"click",()=>{audio.unlock();pause();});on($(".cd-reset"),"click",()=>reset());
  on($(".cd-mode"),"change",e=>reset({mode:e.target.value}));on($(".cd-team"),"change",e=>reset({team:e.target.value}));on($(".cd-difficulty"),"change",e=>reset({difficulty:e.target.value}));
  $$('[data-arena]').forEach(b=>on(b,"click",()=>reset({arena:b.dataset.arena})));
  $$('[data-pull]').forEach(b=>{on(b,"pointerdown",e=>{if(e.button>0||b.disabled)return;e.preventDefault();pull(b.dataset.pull);});on(b,"click",e=>{if(e.detail===0)pull(b.dataset.pull);});});
  $$("[data-gadget]").forEach(b=>on(b,"click",()=>gadget(b.dataset.side,b.dataset.gadget)));
  on($(".cd-sound"),"click",()=>{sound=!sound;audio.configure(sound,music);audio.unlock();configure();});on($(".cd-music"),"click",()=>{music=!music;audio.configure(sound,music);audio.unlock();configure();});
  on(window,"keydown",e=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target.closest("input,select,textarea,[contenteditable=true]"))return;const device={KeyQ:["cats","mud"],KeyW:["cats","squeak"],KeyE:["cats","shield"],KeyU:["dogs","mud"],KeyI:["dogs","squeak"],KeyO:["dogs","shield"]}[e.code];if(device){e.preventDefault();gadget(...device);return;}if(e.code==="KeyP"){e.preventDefault();pause();return;}const side=e.code==="KeyA"?"cats":e.code==="KeyL"?"dogs":e.code==="Space"&&state.mode==="ai"&&!e.target.closest("button,a,summary")?state.team:null;if(side){e.preventDefault();pull(side);}});
  on(document,"visibilitychange",()=>{if(document.hidden)pause(true);});on(window,"blur",()=>pause(true));
  renderer.ready.then(results=>{if(disposed)return;loaded=true;wrapper.dataset.assets=results.every(Boolean)?"ready":"partial";if(!results.every(Boolean))say("Some artwork did not load. The match is playable; reload to retry the pictures.");update();});
  configure();update();say("Ready when you are. Start a match to meet your rival.");frame=requestAnimationFrame(loop);
  return ()=>{disposed=true;cancelAnimationFrame(frame);events.abort();audio.dispose();renderer.dispose();unmountWallet();wrapper.remove();};
}
