import { OPPONENT_LEVELS, createComputerOpponent, createOpponentScheduler } from "./arcade/opponents.js";
import { createNimRound, applyNimMove, chooseNimMove } from "./nim-duel-engine.js";
import { createNimAudio } from "./nim-duel-audio.js";

const stick='<span class="nd-stick"><i class="nd-wood"></i><i class="nd-head"></i></span>';
export function createNimDuel(root){
  const wrapper=document.createElement("section");wrapper.className="nim-duel";
  wrapper.innerHTML=`
    <header class="nd-hero"><div><p class="nd-eyebrow">THE MATCH ROOM</p><h3>A small move.<br>A bright finish.</h3><p>Take 1, 2, or 3 matches from <strong>one pile</strong>.<br>Take the final match on the table to win.</p></div><img src="assets/nim-duel-cover.png" alt="Wooden matches in brass-edged trays on a stone table" width="190" height="190"></header>
    <div class="nd-settings"><div class="nd-mode" role="group" aria-label="Play mode"><button type="button" data-mode="ai" aria-pressed="true">vs Computer</button><button type="button" data-mode="local" aria-pressed="false">2 players</button></div>
      <label class="nd-difficulty">Computer difficulty<select aria-label="Computer difficulty">${OPPONENT_LEVELS.map(level=>`<option value="${level.id}" ${level.id==="medium"?"selected":""}>${level.label}</option>`).join("")}</select></label>
      <div class="nd-names" hidden><label>Player 1<input data-name="0" maxlength="20" value="Player 1" autocomplete="off" aria-label="Player 1 name"></label><label>Player 2<input data-name="1" maxlength="20" value="Player 2" autocomplete="off" aria-label="Player 2 name"></label></div>
    </div><p class="nd-mode-note"></p>
    <div class="nd-scoreboard"><div class="nd-player" data-player="0"><span class="nd-player-dot"></span><span class="nd-player-name">You</span><strong class="nd-wins">0 wins</strong></div><span class="nd-round">Round 1</span><div class="nd-player" data-player="1"><span class="nd-player-dot"></span><span class="nd-player-name">Computer</span><strong class="nd-wins">0 wins</strong></div></div>
    <div class="nd-turnbar"><div><p class="nd-turn" role="status" aria-live="polite"></p><p class="nd-last">Choose any pile to begin.</p></div><span class="nd-remaining"></span></div>
    <div class="nd-stage">
      <div class="nd-board" role="group" aria-label="Match piles"></div><div class="nd-burn-layer" aria-hidden="true"></div>
      <div class="nd-ending" hidden>
        <div class="nd-scene-glow" aria-hidden="true"></div><div class="nd-confetti" aria-hidden="true"></div>
        <p class="nd-ending-kicker"></p><h3 class="nd-ending-title" tabindex="-1"></h3><p class="nd-ending-detail"></p>
        <div class="nd-award" aria-hidden="true"><svg viewBox="0 0 250 210"><path d="M99 187C28 166 15 87 60 33M151 187C222 166 235 87 190 33" fill="none" stroke="currentColor" stroke-width="2"/>${Array.from({length:7},(_,i)=>`<ellipse cx="${49-i*1.1+i*i*.9}" cy="${48+i*18}" rx="8" ry="18" transform="rotate(${-25-i*8} ${49-i*1.1+i*i*.9} ${48+i*18})"/><ellipse cx="${201+i*1.1-i*i*.9}" cy="${48+i*18}" rx="8" ry="18" transform="rotate(${25+i*8} ${201+i*1.1-i*i*.9} ${48+i*18})"/>`).join("")}</svg>
          <span class="nd-final-match"><i class="nd-wood"></i><i class="nd-head"></i><i class="nd-final-flame"></i></span><span class="nd-award-base"></span>
        </div><p class="nd-ending-score"></p><div class="nd-ending-actions"><button type="button" class="nd-primary" data-action="replay">Play another round</button><button type="button" class="nd-skip" data-action="skip">Skip animation</button></div>
      </div>
    </div>
    <div class="nd-takebar"><div><span class="nd-label">HOW MANY?</span><div class="nd-amounts" role="group" aria-label="Matches to remove">${[1,2,3].map(n=>`<button type="button" data-amount="${n}" aria-pressed="${n===1}" aria-label="Remove ${n} ${n===1?"match":"matches"}">${n}</button>`).join("")}</div></div><p class="nd-selection"></p><button type="button" class="nd-primary nd-take">Take 1 match</button></div>
    <div class="nd-toolbar"><button type="button" data-action="new">New round</button><button type="button" data-action="pause">Pause</button><button type="button" data-action="sound" aria-pressed="true">Sound on</button></div>
    <section class="nd-guide" aria-label="How to play"><div><p class="nd-eyebrow">THREE SIMPLE RULES</p><h3>One pile. One turn.<br>The last match wins.</h3><p>There is no timer. Take a moment to think before you confirm your move.</p></div><ol><li><strong>Choose one pile.</strong> Click or tap its wooden tray. The number above it is how many matches remain.</li><li><strong>Take 1, 2, or 3.</strong> The highlighted matches show your move. Confirm to light them and burn them away. You cannot combine piles or take more than a pile contains.</li><li><strong>Take turns until the table is empty.</strong> Whoever removes the very last match across <em>all</em> piles wins. Emptying just one pile does not end the round.</li></ol>
      <div class="nd-example"><strong>A move in practice</strong><span>5 / 2 / 1</span><span>Take 2 from pile 1 &rarr;</span><span>3 / 2 / 1</span><small>Only the chosen pile changes. Then it is the other player's turn.</small></div>
      <details class="nd-tip"><summary>A small strategy tip</summary><p>When only one pile remains, try to leave your opponent 4 or 8 matches. Whatever they take, you can answer with enough to make the two moves total 4. Earlier in the round, think about the whole table, not just the biggest pile.</p></details>
    </section>
    <details class="nd-log"><summary>Round history <span class="nd-move-count">0 moves</span></summary><ol></ol></details>`;
  root.append(wrapper);
  const $=s=>wrapper.querySelector(s),abort=new AbortController(),on=(el,event,fn)=>el.addEventListener(event,fn,{signal:abort.signal});
  const botClock=createOpponentScheduler(),burnClock=createOpponentScheduler(),endingClock=createOpponentScheduler(),audio=createNimAudio(),motion=matchMedia("(prefers-reduced-motion: reduce)");
  const tallies={ai:{wins:[0,0],rounds:0},local:{wins:[0,0],rounds:0}},playerNames=["Player 1","Player 2"];
  let mode="ai",computer=createComputerOpponent(),state,selected=0,amount=1,busy=false,ended=false,disposed=false;
  const names=()=>mode==="ai"?["You","Computer"]:playerNames,canMove=()=>state&&!state.paused&&!busy&&state.winner===null&&(mode==="local"||state.turn===0);
  const name=actor=>names()[actor],takeText=n=>n===1?"1 match":n+" matches";
  function board(){
    $(".nd-board").style.setProperty("--nd-columns",state.piles.length===4?2:3);
    $(".nd-board").innerHTML=state.piles.map((count,i)=>`<button type="button" class="nd-pile" data-pile="${i}" aria-label="Pile ${i+1}, ${count} ${count===1?"match":"matches"}"><span class="nd-pile-top"><span>PILE ${i+1}</span><strong>${count}</strong></span><span class="nd-tray"><span class="nd-matches">${Array.from({length:count},(_,j)=>stick.replace('class="nd-stick"',`class="nd-stick" style="--tilt:${(j*7+i*3)%9-4}deg"`)).join("")}</span></span><span class="nd-pile-preview">${count?"Select this pile":"Empty"}</span></button>`).join("");
  }
  function update(){
    const allowed=canMove(),available=state.piles[selected]||0,players=names(),t=tallies[mode];
    wrapper.dataset.phase=ended?"finished":busy?"burning":mode==="ai"&&state.turn===1?"thinking":"playing";wrapper.dataset.paused=String(state.paused);wrapper.dataset.turn=String(state.turn);wrapper.dataset.mode=mode;
    wrapper.dataset.motionPaused=String(state.paused||document.hidden);
    wrapper.querySelectorAll("[data-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===mode)));
    $(".nd-difficulty").hidden=mode==="local";$(".nd-names").hidden=mode!=="local";
    $(".nd-mode-note").textContent=mode==="local"?"Two people, one device. The opening turn alternates each round.":"You move first. Each opening has a winning line, and every computer plays by the same rules.";
    $(".nd-round").textContent="Round "+t.rounds;
    wrapper.querySelectorAll(".nd-player").forEach((el,i)=>{el.querySelector(".nd-player-name").textContent=players[i];el.querySelector(".nd-wins").textContent=t.wins[i]+(t.wins[i]===1?" win":" wins");el.classList.toggle("is-active",state.winner===null&&state.turn===i);el.classList.toggle("is-winner",ended&&state.winner===i);});
    $(".nd-turn").textContent=state.paused?"Round paused":ended?name(state.winner)+(mode==="ai"&&state.winner===0?" win!":" wins!"):busy?"The matches are burning...":mode==="ai"&&state.turn===1?"Computer is thinking...":state.turn===0&&mode==="ai"?"Your turn":name(state.turn)+"'s turn";
    const last=state.moves.at(-1);$(".nd-last").textContent=last?(mode==="ai"&&last.actor===0?"You":name(last.actor))+" took "+takeText(last.amount)+" from pile "+(last.pile+1)+".":"Choose a pile, then preview your move below.";
    const remaining=state.piles.reduce((a,b)=>a+b,0);$(".nd-remaining").textContent=remaining+" left";
    wrapper.querySelectorAll("[data-pile]").forEach(b=>{
      const i=+b.dataset.pile,count=state.piles[i],active=i===selected&&allowed;b.disabled=!allowed||count===0;b.setAttribute("aria-pressed",String(active));b.classList.toggle("is-empty",!count);
      b.querySelector(".nd-pile-preview").textContent=active?count+" left / take "+Math.min(amount,count):count?"Select this pile":"Empty";
      b.querySelectorAll(".nd-stick").forEach((match,j)=>match.classList.toggle("is-picked",active&&j>=count-amount));
    });
    wrapper.querySelectorAll("[data-amount]").forEach(b=>{b.disabled=!allowed||+b.dataset.amount>available;b.setAttribute("aria-pressed",String(+b.dataset.amount===amount));});
    $(".nd-take").disabled=!allowed||!available;$(".nd-take").textContent="Take "+takeText(amount);
    $(".nd-selection").textContent=ended?"The table is empty.":allowed?"From pile "+(selected+1)+" / "+Math.max(0,available-amount)+" will remain":state.paused?"Resume when you are ready.":"Wait for the next turn.";
    $(".nd-takebar").hidden=ended;$('[data-action="pause"]').disabled=ended&&$(".nd-ending").dataset.settled==="true";$('[data-action="pause"]').textContent=state.paused?"Resume":"Pause";
    $('[data-action="sound"]').textContent=audio.enabled?"Sound on":"Sound off";$('[data-action="sound"]').setAttribute("aria-pressed",String(audio.enabled));
    $(".nd-move-count").textContent=state.moves.length+" moves";
    const log=$(".nd-log ol");log.replaceChildren();state.moves.forEach(move=>{const li=document.createElement("li");li.textContent=name(move.actor)+" took "+takeText(move.amount)+" from pile "+(move.pile+1)+"; "+move.remaining+" remained in that pile.";log.append(li);});
  }
  function newRound(){
    for(const clock of [botClock,burnClock,endingClock]){clock.cancel();clock.resume();}audio.stop();busy=false;ended=false;
    const t=tallies[mode],starter=mode==="local"?t.rounds%2:0;state=createNimRound({starter});t.rounds++;selected=0;amount=1;
    $(".nd-ending").hidden=true;$(".nd-ending").classList.remove("is-loss");$(".nd-ending").removeAttribute("data-settled");$(".nd-stage").dataset.finished="false";$(".nd-burn-layer").replaceChildren();
    board();update();
  }
  function burn(pile,count){
    if(motion.matches)return;
    const stage=$(".nd-stage").getBoundingClientRect(),matches=[...$(`[data-pile="${pile}"]`).querySelectorAll(".nd-stick")].slice(-count);
    matches.forEach((match,i)=>{
      const r=match.getBoundingClientRect(),width=match.offsetWidth,height=match.offsetHeight,transform=new DOMMatrix(getComputedStyle(match).transform),angle=Math.atan2(transform.b,transform.a)*180/Math.PI,ghost=document.createElement("span");ghost.className="nd-burning";
      ghost.style.cssText=`left:${r.left-stage.left+(r.width-width)/2}px;top:${r.top-stage.top+(r.height-height)/2}px;width:${width}px;height:${height}px;transform:rotate(${angle}deg);--delay:${i*65}ms;`;
      ghost.innerHTML='<i class="nd-burn-wood"></i><i class="nd-burn-head"></i><i class="nd-fire"></i><i class="nd-ash a1"></i><i class="nd-ash a2"></i><i class="nd-ash a3"></i>';$(".nd-burn-layer").append(ghost);
    });
  }
  function settleEnding(){endingClock.cancel();state.paused=false;$(".nd-ending").dataset.settled="true";$(".nd-skip").hidden=true;update();}
  function finish(){
    if(ended||disposed)return;ended=true;tallies[mode].wins[state.winner]++;const won=mode==="local"||state.winner===0,scene=$(".nd-ending");
    scene.classList.toggle("is-loss",!won);scene.hidden=false;$(".nd-stage").dataset.finished="true";
    $(".nd-ending-kicker").textContent=won?"THE LAST MATCH IS YOURS":"A GOOD DUEL. A NEW CHANCE.";
    $(".nd-ending-title").textContent=mode==="ai"?(won?"You win!":"The computer wins."):name(state.winner)+" wins!";
    $(".nd-ending-detail").textContent=(mode==="ai"&&won?"You":name(state.winner))+" took the final match on the table.";
    $(".nd-ending-score").textContent=state.moves.length+" turns / "+state.piles.length+" piles cleared";
    $(".nd-confetti").innerHTML=Array.from({length:won?36:10},(_,i)=>`<i style="--x:${(i*37)%100}%;--delay:${(i%9)*90}ms;--sway:${Math.sin(i*3)*70}px;--spin:${(i%2?1:-1)*(140+i*11)}deg;--tone:${i%3}"></i>`).join("");
    $(".nd-skip").hidden=motion.matches;if(motion.matches)settleEnding();else endingClock.schedule(settleEnding,3600);
    audio.finish(won);update();$(".nd-ending-title").focus({preventScroll:true});
  }
  function scheduleComputer(){
    if(mode!=="ai"||state.turn!==1||state.winner!==null||disposed)return;
    botClock.schedule(()=>{if(!disposed&&!state.paused)take(chooseNimMove(state,computer),1);},computer.thinkingDelay());
  }
  function take(action,actor){
    if(disposed||busy||state.paused||state.winner!==null||actor!==state.turn||!action)return;
    if(!applyNimMove(state,action,actor))return;
    busy=true;burn(action.pile,action.amount);audio.fire(action.amount);
    if(!state.piles[selected])selected=Math.max(0,state.piles.findIndex(Boolean));
    amount=Math.min(amount,Math.max(1,state.piles[selected]||1));board();update();
    burnClock.schedule(()=>{if(disposed)return;busy=false;$(".nd-burn-layer").replaceChildren();if(state.winner!==null)finish();else{update();scheduleComputer();}},motion.matches?40:1100);
  }
  on(wrapper,"click",e=>{
    const b=e.target.closest("button");if(!b||b.disabled)return;audio.resume();
    if(b.dataset.mode){if(mode!==b.dataset.mode){mode=b.dataset.mode;newRound();}return;}
    if(b.dataset.pile!==undefined&&canMove()){selected=+b.dataset.pile;amount=Math.min(amount,state.piles[selected]);update();return;}
    if(b.dataset.amount&&canMove()){amount=+b.dataset.amount;update();return;}
    if(b.classList.contains("nd-take")&&canMove()){take({pile:selected,amount},state.turn);return;}
    if(["new","replay"].includes(b.dataset.action))newRound();
    if(b.dataset.action==="skip")settleEnding();
    if(b.dataset.action==="sound"){audio.toggle();update();}
    if(b.dataset.action==="pause"){
      state.paused=!state.paused;for(const clock of [botClock,burnClock,endingClock])clock[state.paused?"pause":"resume"]();if(state.paused)audio.stop();update();
    }
  });
  on($(".nd-difficulty select"),"change",e=>{computer=createComputerOpponent({difficulty:e.target.value});newRound();});
  wrapper.querySelectorAll("[data-name]").forEach(input=>on(input,"input",()=>{playerNames[+input.dataset.name]=input.value.trim().replace(/[<>\x00-\x1f]/g,"").slice(0,20)||"Player "+(+input.dataset.name+1);update();if(ended){$(".nd-ending-title").textContent=name(state.winner)+" wins!";$(".nd-ending-detail").textContent=name(state.winner)+" took the final match on the table.";}}));
  on(motion,"change",()=>{if(motion.matches&&ended)settleEnding();});
  on(document,"visibilitychange",()=>{if(document.hidden)audio.stop();wrapper.dataset.motionPaused=String(state.paused||document.hidden);});
  newRound();
  return()=>{disposed=true;abort.abort();for(const clock of [botClock,burnClock,endingClock])clock.dispose();audio.dispose();wrapper.remove();};
}
