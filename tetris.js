import {TETRIS_SETTINGS_KEY,TETRIS_LEVELS,TETRIS_MODES,TETRIS_COIN_GUIDE,SPELLS,tetrisLevel,readTetrisWardrobe,writeTetrisWardrobe,normalizeTournament} from './tetris-config.js';
import {createClassic,classicAction,stepClassic} from './tetris-classic.js';
import {createIslandRound,stepIslandRound,islandAction,castIslandSpell,rankIslandRound,disposeIslandRound,createTetrisTournament,awardTournamentRound,tournamentStandings,islandFinishLine} from './tetris-islands.js';
import {drawClassicBoard,drawIslandBoard,drawTetrisPodium} from './tetris-renderer.js';
import {tetrisEscape as esc} from './tetris-art.js';
import {createTetrisAudio} from './tetris-audio.js';
import {createTetrisCustomizer} from './tetris-customizer.js';
import {getArcadeWallet} from './arcade/wallet.js';
import {createRewardSession} from './arcade/game-services.js';

const KEYS=[
  {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'rotate',ArrowDown:'down',Space:'drop',KeyZ:'counter',KeyC:'hold',Digit1:'spell0',Digit2:'spell1',KeyB:'feed'},
  {KeyA:'left',KeyD:'right',KeyW:'rotate',KeyS:'down',KeyF:'drop',KeyQ:'spell0',KeyE:'spell1',KeyR:'bank'},
  {KeyJ:'left',KeyL:'right',KeyI:'rotate',KeyK:'down',KeyU:'drop',KeyO:'spell0',KeyP:'spell1',KeyH:'bank'},
  {Numpad4:'left',Numpad6:'right',Numpad8:'rotate',Numpad2:'down',Numpad0:'drop',Numpad7:'spell0',Numpad9:'spell1',Numpad5:'bank'},
];
const KEY_NOTES=['Arrows to move/rotate; Space to drop; Z reverse; C hold or bank; 1/2 spells.','A/D move; W rotate; S soft drop; F release; Q/E spells; R bank.','J/L move; I rotate; K soft drop; U release; O/P spells; H bank.','Numpad 4/6 move; 8 rotate; 2 soft drop; 0 release; 7/9 spells; 5 bank.'];
const levels=(selected)=>TETRIS_LEVELS.map(l=>`<option value="${l.id}" ${l.id===selected?'selected':''}>${l.name}</option>`).join('');
function readSettings(){let raw;try{raw=JSON.parse(localStorage.getItem(TETRIS_SETTINGS_KEY));}catch{}
  return {mode:Object.hasOwn(TETRIS_MODES,raw?.mode)?raw.mode:'classic',difficulty:tetrisLevel(raw?.difficulty).id,count:Math.max(1,Math.min(4,Math.floor(raw?.count)||2)),gorilla:raw?.gorilla===true,sound:raw?.sound!==false,best:Math.max(0,Number(raw?.best)||0),
    players:Array.from({length:4},(_,i)=>({kind:i===0?'human':raw?.players?.[i]?.kind==='human'?'human':'bot',difficulty:tetrisLevel(raw?.players?.[i]?.difficulty).id})),rounds:normalizeTournament(raw?.rounds)};
}

export function createTetris(root,{editorOnly=false}={}) {
  if(editorOnly)return createTetrisCustomizer(root);
  const wallet=getArcadeWallet(),settings=readSettings(),abort=new AbortController(),audio=createTetrisAudio(settings.sound),media=matchMedia('(prefers-reduced-motion: reduce)');
  let wardrobe=readTetrisWardrobe(wallet.getState().owned),phase='setup',round=null,tournament=null,lineup=[],reward=null,roundToken=0,roundResults=[],paused=false,expanded=false,oldOverflow='',frame=0,lastTime=0,accumulator=0,lastUi=0,finaleStart=0,disposed=false;
  const held=new Map(),views=new Map();let drag=null,pointerRepeat=null;
  const wrap=document.createElement('section');wrap.className='ti-game';wrap.dataset.phase='setup';root.append(wrap);
  const $=s=>wrap.querySelector(s),on=(node,event,fn,options={})=>node.addEventListener(event,fn,{...options,signal:abort.signal});
  function saveSettings(){try{localStorage.setItem(TETRIS_SETTINGS_KEY,JSON.stringify(settings));}catch{}}
  function announce(message){const el=$('.ti-live-status');if(el)el.textContent=message;}
  function topLinks(){return `<div class="ti-top-links"><a href="#characters/tetris">Customize caster & blocks</a><a href="#store/tetris">Island shop</a><span class="ti-wallet">${wallet.getState().coins.toLocaleString()} arcade coins</span><button type="button" data-action="sound" aria-pressed="${audio.enabled}">${audio.enabled?'Sound on':'Sound off'}</button><button type="button" data-action="expand">${expanded?'Exit expanded view':'Expand game'}</button></div>`;}
  function help(){return `<details class="ti-help"><summary>Controls, rules & coin earnings</summary><p>Drag or tap your board to aim, then use Rotate and Drop. Keyboard players can play together on one device; every human also gets touch controls. Released island pieces cannot be moved by hand. Escape pauses everyone.</p><table><thead><tr><th>Player</th><th>Keyboard</th></tr></thead><tbody>${KEY_NOTES.map((v,i)=>`<tr><th>${i+1}</th><td>${v}</td></tr>`).join('')}</tbody></table><p>${TETRIS_COIN_GUIDE}</p><p>Computers use the same piece sequence, gravity, islands, and legal controls as you. Their difficulty changes their planning and reaction speed. Every difficulty can make mistakes. Multiplayer here is shared-device play; no room codes or server are needed.</p></details>`;}
  function showSetup(){
    held.clear();pointerRepeat=null;drag=null;audio.pause();if(round?.players)disposeIslandRound(round);round=null;tournament=null;phase='setup';wrap.dataset.phase=phase;paused=false;
    const mode=TETRIS_MODES[settings.mode],count=settings.mode==='classic'?1:settings.count,level=tetrisLevel(settings.difficulty);
    wrap.innerHTML=`<div class="ti-hero"><div><p class="ti-eyebrow">A LITTLE BALANCE. A LITTLE MAGIC.</p><h3>Tetris Isles</h3><p>Classic falling blocks, wonderfully wobbly towers, and a whole archipelago of friendly rivalry.</p></div></div>${topLinks()}
      <nav class="ti-mode-tabs" aria-label="Game mode">${Object.entries(TETRIS_MODES).map(([id,m])=>`<button type="button" data-mode="${id}" aria-pressed="${settings.mode===id}">${m.name}</button>`).join('')}</nav>
      <section class="ti-mode-guide"><span class="ti-eyebrow">${mode.tag}</span><h4>${mode.summary}</h4><p>${mode.rules}</p></section>
      <div class="ti-setup-row">${settings.mode==='tournament'?'':`<label>Course difficulty<select data-setting="difficulty" aria-label="Course difficulty">${levels(settings.difficulty)}</select></label>`}${settings.mode==='classic'?'':`<label>Players on this device<select data-setting="count" aria-label="Number of players">${[1,2,3,4].map(n=>`<option value="${n}" ${count===n?'selected':''}>${n===1?'1 - solo practice':`${n} players`}</option>`).join('')}</select></label>`}<p class="ti-course-note">${settings.mode==='classic'?`10 x 20 grid. Speed rises every 10 lines. Personal best: ${settings.best.toLocaleString()} points.`:settings.mode==='tournament'?'Create your own running order below. Players and their chosen computer levels stay the same throughout the cup.':settings.mode==='survival'?`${level.supply} pieces to keep on your ${level.width}-cell island. Three dropped pieces ends your run.`:settings.mode==='puzzle'?`Frost line: ${level.ceiling} m. Every dropped piece lifts the whole island ${level.raise} m.`:`Finish starts at ${level.goal} m and lowers slowly. Keep your tower above it for 1.5 seconds.`}</p></div>
      ${settings.mode==='classic'?`<div class="ti-gorilla-option"><input type="checkbox" id="ti-gorilla" data-setting="gorilla" ${settings.gorilla?'checked':''}><div><label for="ti-gorilla">Optional: the hungry gorilla</label><p>Start with 3 bananas and earn another every 2 cleared lines, up to 5. Feed it from the side controls or press B. If its hunger timer runs out, it breaks tiles and the columns collapse. Leave this off for normal Classic rules.</p></div></div>`:''}
      ${settings.mode==='tournament'?`<section class="ti-tournament-builder"><h4>Build your challenge cup</h4><ol class="ti-round-list">${settings.rounds.map((r,i)=>`<li><select data-round-mode="${i}" aria-label="Round ${i+1} mode">${['race','puzzle','survival'].map(m=>`<option value="${m}" ${m===r.mode?'selected':''}>${TETRIS_MODES[m].name}</option>`).join('')}</select><select data-round-level="${i}" aria-label="Round ${i+1} difficulty">${levels(r.difficulty)}</select><button type="button" data-round-up="${i}" aria-label="Move round ${i+1} earlier" ${i?'':'disabled'}>&uarr;</button><button type="button" data-round-remove="${i}" aria-label="Remove round ${i+1}" ${settings.rounds.length>1?'':'disabled'}>&times;</button></li>`).join('')}</ol><button type="button" data-action="add-round" ${settings.rounds.length>=9?'disabled':''}>Add a round (${settings.rounds.length}/9)</button></section>`:''}
      <section class="ti-players" aria-label="Players and computer opponents">${Array.from({length:count},(_,i)=>`<article class="ti-player-setup"><strong>PLAYER ${i+1}${i===0?' / YOU':''}</strong><div class="ti-player-fields"><label>Name<input data-player-name="${i}" aria-label="Player ${i+1} name" maxlength="22" value="${esc(wardrobe.players[i].name)}"></label>${i?`<label>Playing as<select data-player-kind="${i}" aria-label="Player ${i+1} type"><option value="human" ${settings.players[i].kind==='human'?'selected':''}>Local person</option><option value="bot" ${settings.players[i].kind==='bot'?'selected':''}>Computer</option></select></label>`:'<p class="ti-course-note">Local person</p>'}${settings.players[i].kind==='bot'?`<label>Computer level<select data-player-level="${i}" aria-label="Player ${i+1} computer difficulty">${levels(settings.players[i].difficulty)}</select></label>`:''}</div><p class="ti-key-note">${settings.players[i].kind==='human'?KEY_NOTES[i]:'A fair computer opponent. Same pieces, same physics, no hidden advantages.'}</p></article>`).join('')}</section>
      <div class="ti-start-row"><button type="button" class="ti-primary" data-action="start">${settings.mode==='tournament'?'Start tournament':'Start playing'}</button><p>${settings.mode==='classic'?'Classic games earn coins when the run ends.':count===1?'Solo island practice is free of coin rewards. Add a computer to compete for coins.':settings.players.slice(0,count).filter(p=>p.kind==='human').length>1?'Local multiplayer is for friendly competition; no coin rewards.':'Win against the computers and retain pieces to earn arcade coins.'} Appearance and purchases never change the physics.</p></div>${help()}<p class="ti-live-status" role="status"></p>`;
  }
  function playersForGame(){return settings.players.slice(0,settings.mode==='classic'?1:settings.count).map((p,i)=>({...p,name:wardrobe.players[i].name||`Player ${i+1}`}));}
  function boardMarkup(p,i,classic){const style=wardrobe.players[i],human=p.kind==='human';
    return `<article class="ti-board" data-board="${i}" style="--player-color:${style.robeColor}"><header><strong>${esc(p.name)}</strong><span>${human?`LOCAL PLAYER ${i+1}`:`${tetrisLevel(p.difficulty).name.toUpperCase()} COMPUTER`}</span></header><canvas class="ti-board-canvas" data-canvas="${i}" tabindex="0" role="img" aria-label="${esc(p.name)} ${classic?'Classic board':'island tower'}. ${human?'Use your keyboard or the controls below.':''}"></canvas><div class="ti-board-stats"></div><div class="ti-board-status"></div>
      ${human?`<div class="ti-controls" role="group" aria-label="Controls for ${esc(p.name)}">${[['left','Left'],['rotate','Rotate'],['right','Right'],['down','Soft drop'],['drop','Drop'],[classic?'hold':'counter',classic?'Hold':'Turn back']].map(([key,label])=>`<button type="button" data-control="${key}" data-player="${i}" aria-label="Player ${i+1}: ${label}">${label}</button>`).join('')}${!classic&&round.mode==='puzzle'?`<button type="button" data-control="bank" data-player="${i}" style="grid-column:1/-1">Freeze &amp; bank</button>`:''}${classic&&settings.gorilla?`<button type="button" data-control="feed" data-player="0" class="ti-feed" style="grid-column:1/-1">Feed banana (B)</button>`:''}</div><div class="ti-powers" data-power-player="${i}"></div>`:''}</article>`;
  }
  function startRound(){
    if(round?.players)disposeIslandRound(round);roundToken++;reward=createRewardSession('tetris');held.clear();pointerRepeat=null;drag=null;views.clear();paused=false;lastTime=0;accumulator=0;
    const chosen=tournament?tournament.rounds[tournament.index]:settings,seed=(Date.now()+roundToken*971)>>>0;
    round=chosen.mode==='classic'?createClassic({difficulty:chosen.difficulty,gorilla:settings.gorilla,seed}):createIslandRound({mode:chosen.mode,difficulty:chosen.difficulty,players:lineup,seed});
    phase='playing';wrap.dataset.phase=phase;const classic=round.mode==='classic';
    wrap.innerHTML=`${topLinks()}<header class="ti-match-heading"><div><p class="ti-eyebrow">${tournament?`ISLAND CUP / ROUND ${tournament.index+1} OF ${tournament.rounds.length}`:classic?'THE CLASSIC GRID':'THE ISLAND CHALLENGE'}</p><h3>${TETRIS_MODES[round.mode].name} <small>/ ${tetrisLevel(round.difficulty).name}</small></h3></div><span class="ti-clock"></span></header><p class="ti-match-instruction">${classic?'Clear complete rows. Arrows move and rotate, Space drops, C holds.':round.mode==='race'?'Drag to aim, rotate, and release. Keep a stable tower above the descending ribbon for 1.5 seconds.':round.mode==='puzzle'?'Fit pieces below the frost line. Every lost piece lifts your whole island. Touch the line and your tower freezes.':'Retain your full supply. Three lost pieces ends your run. The fewest pieces left wins.'}</p><div class="ti-paused-note" hidden>Paused for everyone. Resume when you are ready.</div>
      <div class="ti-boards" data-count="${lineup.length}" style="--ti-players:${lineup.length}" aria-live="off">${lineup.map((p,i)=>boardMarkup(p,i,classic)).join('')}</div><div class="ti-play-toolbar"><button type="button" data-action="pause">Pause</button><button type="button" data-action="leave">Leave match (no rewards)</button></div><p class="ti-live-status" role="status">${classic?'Your next pieces are shown at the right.':'The same shuffled piece sequence is shared by every player.'}</p>${help()}<div class="ti-result-host"></div>`;
    audio.start();renderUi();$('[data-canvas="0"]').focus({preventScroll:true});$('.ti-match-heading').scrollIntoView({block:'nearest'});
  }
  function start(){saveSettings();lineup=playersForGame();tournament=settings.mode==='tournament'?createTetrisTournament(settings.rounds,lineup):null;startRound();}
  function runControl(id,action){if(phase!=='playing'||paused||document.hidden||lineup[id]?.kind!=='human')return false;
    if(action.startsWith('spell')){const target=$(`[data-target="${id}"]`);return castIslandSpell(round,id,Number(action.at(-1)),Number(target?.value));}
    if(round.mode==='classic')return id===0?classicAction(round,action):false;
    return islandAction(round,id,action==='hold'?'bank':action);
  }
  function togglePause(){if(phase!=='playing')return;paused=!paused;held.clear();pointerRepeat=null;drag=null;lastTime=0;accumulator=0;paused?audio.pause():audio.resume();renderUi();}
  function updatePowers(p){const host=$(`[data-power-player="${p.id}"]`);if(!host)return;const rivals=round.players.filter(o=>o.id!==p.id&&o.status==='building');const sig=`${p.spells.join(',')}:${rivals.map(o=>o.id)}:${p.status}`;if(host.dataset.signature===sig)return;host.dataset.signature=sig;
    if(p.status!=='building'){host.replaceChildren();return;}
    if(!p.spells.length){host.innerHTML=`<p>Next spell choice at ${p.nextSpellHeight} m of tower height. Powers are earned once per altitude.</p>`;return;}
    host.innerHTML=`<p><strong>A spell is ready. Choose one:</strong></p><div class="ti-power-options">${p.spells.map((id,i)=>`<button type="button" data-spell="${i}" data-player="${p.id}" ${SPELLS[id].kind==='trick'&&!rivals.length?'disabled':''}>${SPELLS[id].name}<small>${SPELLS[id].description}</small></button>`).join('')}</div>${p.spells.some(id=>SPELLS[id].kind==='trick')?`<label>Target<select data-target="${p.id}" aria-label="Player ${p.id+1} spell target">${rivals.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select></label>`:''}`;
  }
  function renderUi(){
    if(phase!=='playing')return;
    const classic=round.mode==='classic',clock=$('.ti-clock');clock.textContent=classic?`${Math.floor(round.seconds/60)}:${String(Math.floor(round.seconds%60)).padStart(2,'0')}`:`${Math.ceil(Math.max(0,round.level.limit-round.seconds))}s until sunset`;
    const isPaused=paused||document.hidden;$('.ti-paused-note').hidden=!isPaused;$('[data-action="pause"]').textContent=paused?'Resume':'Pause';
    for(let i=0;i<lineup.length;i++){const board=$(`[data-board="${i}"]`),p=classic?round:round.players[i];
      const stats=classic?[['SCORE',round.score.toLocaleString()],['LINES',round.lines],['LEVEL',round.level]]:round.mode==='survival'?[['LEFT',Math.max(0,round.level.supply-p.retained)],['LIVES',Math.max(0,3-p.lost)],['KEPT',p.retained]]:round.mode==='puzzle'?[['KEPT',p.retained],['ISLAND',`${p.base.toFixed(1)} m`],['LOST',p.lost]]:[['HEIGHT',`${Math.max(0,p.top-p.base).toFixed(1)} m`],['FINISH',`${islandFinishLine(round).toFixed(1)} m`],['KEPT',p.retained]];
      board.querySelector('.ti-board-stats').innerHTML=stats.map(([label,value])=>`<span>${label}<strong>${value}</strong></span>`).join('');
      const status=classic?(round.gorilla?`Gorilla: ${Math.ceil(round.hunger)}s until hungry / ${round.bananas} bananas`:'Keep the stack below the top.'):p.status==='building'?[p.buffs.anchor?'Next piece anchored':'',p.buffs.shield?'Shield ready':'',p.buffs.heavy?'Heavy piece next':'',p.buffs.tilt?'Tilted piece next':'',p.raceHold>0?'Hold steady...':''].filter(Boolean).join(' / ')||`${p.retained} ${p.retained===1?'piece':'pieces'} held by your tower.`:p.status==='out'?'Three lost pieces. Your run is over.':p.status==='complete'?'Supply or finish reached!':p.status==='finished'?'Round complete. Your final height and pieces are recorded.':'Your tower is frozen. Watching the other players.';
      board.querySelector('.ti-board-status').textContent=status;
      for(const button of board.querySelectorAll('[data-control]'))button.disabled=isPaused||(!classic&&p.status!=='building')||(button.dataset.control==='feed'&&!round.bananas)||(button.dataset.control==='hold'&&round.held);
      if(!classic){updatePowers(p);for(const button of board.querySelectorAll('[data-spell]'))button.disabled=isPaused||p.status!=='building'||(SPELLS[p.spells[Number(button.dataset.spell)]]?.kind==='trick'&&!round.players.some(o=>o.id!==p.id&&o.status==='building'));}
    }
  }
  function resultRows(results,final=false){return results.map(r=>`<div class="ti-rank-row" data-rank="${r.rank}"><span>${r.rank}</span><div><strong>${esc(r.name)}</strong><small>${final?`${r.points} tournament points`:round.mode==='classic'?`${round.lines} lines / level ${round.level}`:round.mode==='puzzle'?`${r.retained} pieces packed / ${r.lost} lost`:round.mode==='survival'?`${r.remaining} pieces left / ${r.lost} lost`:`${r.height.toFixed(1)} m stable height / ${r.retained} pieces kept`}</small></div><b>${final?r.won?'CHAMPION':'':tournament?`+${r.points} pts`:lineup.length===1?'PERSONAL RESULT':r.rank===1?'1ST PLACE':''}</b></div>`).join('');}
  function showResults(final=false){const classic=round.mode==='classic',results=final?tournamentStandings(tournament):roundResults,winners=results.filter(r=>r.rank===1),names=winners.map(r=>r.name).join(' & '),title=classic?'One more for the record book.':final?`${names} ${winners.length>1?'share the cup!':'wins the cup!'}`:lineup.length===1?(round.players[0].status==='out'?'Out of chances. Try another tower.':round.players[0].status==='complete'?'Challenge complete!':'Practice complete.'):winners.length>1?'A shared victory!':`${names} wins!`;
    const host=$('.ti-result-host');host.innerHTML=`<section class="ti-result"><header><p class="ti-eyebrow">${final?'THE ISLAND CUP / FINAL STANDINGS':classic?'CLASSIC / RUN COMPLETE':round.finishReason==='sunset'?'SUNSET / FINAL PLACINGS':'A LITTLE MAGIC GOES A LONG WAY'}</p><h3 tabindex="-1">${esc(title)}</h3><p>${classic?`${round.score.toLocaleString()} points. Best: ${settings.best.toLocaleString()}.`:final?'Every round counted. Tied totals share the championship.':TETRIS_MODES[round.mode].name+' complete. Your chosen avatars take the podium.'}</p></header><canvas class="ti-podium-canvas" role="img" aria-label="The players celebrating on their island podiums"></canvas><div class="ti-rankings">${resultRows(results,final)}</div>${!final&&tournament?`<div class="ti-rankings"><p class="ti-eyebrow">CUP STANDINGS</p>${tournamentStandings(tournament).map(r=>`<p>${r.rank}. ${esc(r.name)} / ${r.points} points</p>`).join('')}</div>`:''}<p class="ti-reward-note" role="status">${final?'Round rewards have already been saved.':'Checking this round\'s coin rewards...'}</p><div class="ti-result-actions">${!final&&tournament?`<button type="button" class="ti-primary" data-action="next">${tournament.index+1<tournament.rounds.length?`Next: ${TETRIS_MODES[tournament.rounds[tournament.index+1].mode].name}`:'View final cup standings'}</button>`:'<button type="button" class="ti-primary" data-action="again">Play again</button>'}<button type="button" data-action="setup">Back to setup</button></div></section>`;
    host.querySelector('h3').focus({preventScroll:true});host.scrollIntoView({block:'nearest',behavior:media.matches?'instant':'smooth'});finaleStart=performance.now();if(final)phase='cup-results';
  }
  function finish(){
    if(phase!=='playing')return;renderUi();phase='results';wrap.dataset.phase=phase;held.clear();pointerRepeat=null;drag=null;
    const classic=round.mode==='classic';if(classic){settings.best=Math.max(settings.best,round.score);saveSettings();roundResults=[{id:0,name:lineup[0].name,rank:1,points:0,won:true}];}else roundResults=rankIslandRound(round);
    if(tournament)awardTournamentRound(tournament,`${roundToken}`,roundResults);
    for(const button of wrap.querySelectorAll('[data-control],[data-spell],[data-action="pause"],[data-action="leave"]'))button.disabled=true;
    showResults();const humanResult=roundResults.find(r=>r.id===0),won=classic?round.lines>0:lineup.length===1?round.players[0].status==='complete'||round.mode==='puzzle'&&round.players[0].retained>0:humanResult?.rank===1;audio.play(won?'win':'lose');
    const progress=classic?{mode:'classic',difficulty:round.difficulty,finished:true,seconds:round.seconds,manual:round.manual,lines:round.lines}:{mode:round.mode,difficulty:round.difficulty,finished:true,seconds:round.seconds,manual:round.players[0].manual,retained:round.players[0].retained,won:humanResult?.rank===1,humans:lineup.filter(p=>p.kind==='human').length,bots:lineup.filter(p=>p.kind==='bot').map(p=>p.difficulty)};
    const token=roundToken;reward.award(progress).then(result=>{if(disposed||token!==roundToken||phase==='cup-results')return;const el=$('.ti-reward-note');if(el)el.textContent=result.coins?`+${result.coins} arcade coins saved to your shared wallet.`:!classic&&(progress.humans!==1||!progress.bots.length)?'Local multiplayer and solo island practice do not award coins.':'No coins this time. Qualify with 5 manually placed pieces and 20 seconds of play; then clear lines or retain pieces against a computer.';}).catch(()=>{if(token===roundToken&&$('.ti-reward-note'))$('.ti-reward-note').textContent='The wallet could not save this reward. Your game result is still shown.';});
  }
  function expand(){expanded=!expanded;wrap.classList.toggle('ti-expanded',expanded);if(expanded){oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}else document.body.style.overflow=oldOverflow;$('[data-action="expand"]').textContent=expanded?'Exit expanded view':'Expand game';}
  on(wrap,'click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.mode){settings.mode=button.dataset.mode;saveSettings();showSetup();return;}
    if(button.dataset.control){if(event.detail===0)runControl(Number(button.dataset.player),button.dataset.control);return;}
    if(button.dataset.spell!==undefined){runControl(Number(button.dataset.player),`spell${button.dataset.spell}`);renderUi();return;}
    if(button.dataset.roundRemove!==undefined){settings.rounds.splice(Number(button.dataset.roundRemove),1);saveSettings();showSetup();return;}
    if(button.dataset.roundUp!==undefined){const i=Number(button.dataset.roundUp);[settings.rounds[i-1],settings.rounds[i]]=[settings.rounds[i],settings.rounds[i-1]];saveSettings();showSetup();return;}
    switch(button.dataset.action){
      case 'start':start();break;case 'again':start();break;case 'pause':togglePause();break;case 'leave':case 'setup':showSetup();break;case 'expand':expand();break;
      case 'add-round':if(settings.rounds.length<9)settings.rounds.push({mode:'race',difficulty:settings.difficulty});saveSettings();showSetup();break;
      case 'next':if(phase!=='results'||!tournament)break;if(tournament.index+1<tournament.rounds.length){tournament.index++;startRound();}else{showResults(true);wrap.dataset.phase=phase;audio.play('win');}break;
      case 'sound':settings.sound=!audio.enabled;audio.setEnabled(settings.sound);saveSettings();button.textContent=audio.enabled?'Sound on':'Sound off';button.setAttribute('aria-pressed',String(audio.enabled));break;
    }
  });
  on(wrap,'change',event=>{const el=event.target;if(phase!=='setup')return;
    if(el.dataset.setting){const key=el.dataset.setting;settings[key]=key==='gorilla'?el.checked:key==='count'?Number(el.value):el.value;}
    if(el.dataset.playerKind!==undefined)settings.players[Number(el.dataset.playerKind)].kind=el.value;
    if(el.dataset.playerLevel!==undefined)settings.players[Number(el.dataset.playerLevel)].difficulty=el.value;
    if(el.dataset.roundMode!==undefined)settings.rounds[Number(el.dataset.roundMode)].mode=el.value;
    if(el.dataset.roundLevel!==undefined)settings.rounds[Number(el.dataset.roundLevel)].difficulty=el.value;
    if(el.dataset.playerName!==undefined)return;saveSettings();showSetup();
  });
  on(wrap,'input',event=>{const el=event.target;if(el.dataset.playerName!==undefined){wardrobe.players[Number(el.dataset.playerName)].name=el.value;writeTetrisWardrobe(wardrobe,wallet.getState().owned);}});
  function aim(canvas,clientX){const id=Number(canvas.dataset.canvas);if(phase!=='playing'||paused||lineup[id]?.kind!=='human')return;const rect=canvas.getBoundingClientRect(),view=views.get(id);if(!view)return;
    const p=round.mode==='classic'?round:round.players[id],active=p.active;if(!active)return;
    const target=round.mode==='classic'?Math.floor((clientX-rect.left-view.x)/view.unit)-1:Math.round((clientX-rect.left-view.cx)/view.unit*2)/2;
    for(let n=0;n<30&&Math.abs(active.x-target)>.1;n++)if(!runControl(id,active.x<target?'right':'left'))break;
  }
  on(wrap,'pointerdown',event=>{const control=event.target.closest('[data-control]'),canvas=event.target.closest('[data-canvas]');if(control&&!control.disabled){event.preventDefault();const id=Number(control.dataset.player),action=control.dataset.control;runControl(id,action);if(['left','right','down'].includes(action))pointerRepeat={id,action,delay:.18,pointer:event.pointerId};control.setPointerCapture?.(event.pointerId);}
    else if(canvas){event.preventDefault();canvas.focus({preventScroll:true});drag={canvas,pointer:event.pointerId};canvas.setPointerCapture?.(event.pointerId);aim(canvas,event.clientX);}
  });
  on(wrap,'pointermove',event=>{if(drag?.pointer===event.pointerId)aim(drag.canvas,event.clientX);});
  on(window,'pointerup',()=>{pointerRepeat=null;drag=null;});on(window,'pointercancel',()=>{pointerRepeat=null;drag=null;});
  on(window,'keydown',event=>{if(phase!=='playing'||event.target.closest('input,select,textarea,[contenteditable]'))return;if(event.code==='Escape'){event.preventDefault();if(!event.repeat)togglePause();return;}if(event.target.closest('button')&&['Space','Enter'].includes(event.code))return;
    for(let id=0;id<lineup.length;id++){const action=KEYS[id][event.code];if(!action||lineup[id].kind!=='human')continue;event.preventDefault();if(event.repeat)return;runControl(id,action);if(['left','right','down'].includes(action))held.set(event.code,{id,action,delay:.17});break;}
  });
  on(window,'keyup',event=>held.delete(event.code));
  function loseFocus(){held.clear();pointerRepeat=null;drag=null;lastTime=0;accumulator=0;audio.pause();}
  on(window,'blur',()=>{if(phase==='playing'&&!paused){paused=true;loseFocus();renderUi();}});
  on(document,'visibilitychange',()=>{if(document.hidden)loseFocus();else{lastTime=0;if(!paused&&phase==='playing')audio.resume();}renderUi();});
  const unsubscribe=wallet.subscribe(value=>{const el=$('.ti-wallet');if(el)el.textContent=`${value.coins.toLocaleString()} arcade coins`;});
  function tick(now){if(disposed)return;const dt=lastTime?Math.min(.1,(now-lastTime)/1000):0;lastTime=now;
    if(!document.hidden&&phase==='playing'&&!paused){
      for(const hold of [...held.values(),...(pointerRepeat?[pointerRepeat]:[])]){hold.delay-=dt;if(hold.delay<=0){runControl(hold.id,hold.action);hold.delay=.065;}}
      accumulator=Math.min(.12,accumulator+dt);while(accumulator>=1/60&&phase==='playing'){if(round.mode==='classic')stepClassic(round,1/60);else stepIslandRound(round,1/60);accumulator-=1/60;for(const event of round.events.splice(0))audio.play(event);if(round.status==='over')finish();}
      if(now-lastUi>120){renderUi();lastUi=now;}
    }
    if(round&&!document.hidden){const light=document.documentElement.dataset.theme==='light';for(const canvas of wrap.querySelectorAll('[data-canvas]')){const i=Number(canvas.dataset.canvas);if(round.mode==='classic'){drawClassicBoard(canvas,round,wardrobe.players[i],{light,reduced:media.matches});const rect=canvas.getBoundingClientRect(),unit=Math.min((rect.width-112)/10,(rect.height-54)/20);views.set(i,{x:Math.max(13,(rect.width-10*unit-104)/2),unit});}else views.set(i,drawIslandBoard(canvas,round,round.players[i],wardrobe.players[i],{reduced:media.matches}));}
      const podium=$('.ti-podium-canvas');if(podium)drawTetrisPodium(podium,phase==='cup-results'?tournamentStandings(tournament):roundResults,wardrobe.players,(now-finaleStart)/1000,{reduced:media.matches,classic:round.mode==='classic'});
    }
    frame=requestAnimationFrame(tick);
  }
  showSetup();frame=requestAnimationFrame(tick);
  return ()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);unsubscribe();audio.dispose();if(round?.players)disposeIslandRound(round);if(expanded)document.body.style.overflow=oldOverflow;wrap.remove();};
}
