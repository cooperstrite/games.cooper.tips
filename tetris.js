import {TETRIS_SETTINGS_KEY,TETRIS_LEVELS,TETRIS_MODES,TETRIS_COIN_GUIDE,SPELLS,tetrisLevel,readTetrisWardrobe,writeTetrisWardrobe,normalizeTournament} from './tetris-config.js';
import {createClassic,classicAction,stepClassic,GORILLA_WARNING_SECONDS,GORILLA_URGENT_SECONDS} from './tetris-classic.js';
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
const SPELL_KEYS=[['1','2'],['Q','E'],['O','P'],['Num 7','Num 9']];
const spellIcon=id=>`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
  anchor:'<path d="M16 5v17M10 11h12M7 19c0 10 18 10 18 0M7 19l-3 3m3-3 3 3m15-3 3 3m-3-3-3 3"/><circle cx="16" cy="6" r="3"/>',
  shield:'<path d="m16 3 11 5v9c0 6-7 10-11 12C12 27 5 23 5 17V8z"/><path d="m16 9 2 4 5 .7-3.5 3.5.8 4.8-4.3-2.3-4.3 2.3.8-4.8L8 13.7l5-.7z"/>',
  steady:'<path d="M4 11c4-4 8 4 12 0s8 4 12 0M4 18c4-4 8 4 12 0s8 4 12 0M9 25h14"/>',
  gust:'<path d="M4 11h17c7 0 7-8 2-8-3 0-4 2-4 4M4 17h23M4 23h16c7 0 6 7 2 7-2 0-3-1-3-3"/>',
  heavy:'<path d="M10 11h12l5 16H5zM13 11V7a3 3 0 0 1 6 0v4M16 15v8m-3-3 3 3 3-3"/>',
  tilt:'<path d="m9 8 16 6-6 16-16-6zM7 3h14l5 5m0 0V3m0 5h-5"/>',
}[id]||'<path d="m16 3 4 9 9 4-9 4-4 9-4-9-9-4 9-4z"/>'}</svg>`;
const bananaIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 6c4 15 16 18 21 6-1 17-23 17-25-3z" fill="#f3ce59" stroke="#b78326" stroke-width="1.4"/><path d="M6 9c4 16 16 17 21 5" fill="none" stroke="#fff2ab" stroke-width="2"/><path d="m3 5 3-1 2 4-3 2z" fill="#77552d"/></svg>';
const levels=(selected)=>TETRIS_LEVELS.map(l=>`<option value="${l.id}" ${l.id===selected?'selected':''}>${l.name}</option>`).join('');
function readSettings(){let raw;try{raw=JSON.parse(localStorage.getItem(TETRIS_SETTINGS_KEY));}catch{}
  return {mode:Object.hasOwn(TETRIS_MODES,raw?.mode)?raw.mode:'classic',difficulty:tetrisLevel(raw?.difficulty).id,count:Math.max(1,Math.min(4,Math.floor(raw?.count)||2)),gorilla:raw?.gorilla===true,sound:raw?.sound!==false,best:Math.max(0,Number(raw?.best)||0),
    players:Array.from({length:4},(_,i)=>({kind:i===0?'human':raw?.players?.[i]?.kind==='human'?'human':'bot',difficulty:tetrisLevel(raw?.players?.[i]?.difficulty).id})),rounds:normalizeTournament(raw?.rounds)};
}

export function createTetris(root,{editorOnly=false}={}) {
  if(editorOnly)return createTetrisCustomizer(root);
  const wallet=getArcadeWallet(),settings=readSettings(),abort=new AbortController(),audio=createTetrisAudio(settings.sound),media=matchMedia('(prefers-reduced-motion: reduce)');
  let wardrobe=readTetrisWardrobe(wallet.getState().owned),phase='setup',round=null,tournament=null,lineup=[],reward=null,roundToken=0,roundResults=[],paused=false,expanded=false,oldOverflow='',frame=0,lastTime=0,accumulator=0,lastUi=0,finaleStart=0,disposed=false;
  const held=new Map(),views=new Map(),notices=new Map();let drag=null,pointerRepeat=null;
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
    const gorilla=classic&&settings.gorilla?`<section class="ti-gorilla-hud" aria-label="Gorilla hunger"><div class="ti-hunger-top"><div><span class="ti-hud-label">GORILLA WATCH</span><strong class="ti-hunger-title">The gorilla is calm</strong></div><div class="ti-hunger-countdown"><b class="ti-hunger-clock"></b><span>until smash</span></div></div><div class="ti-hunger-meter" role="progressbar" aria-label="Time remaining before the gorilla smashes blocks" aria-valuemin="0" aria-valuemax="42"><span></span></div><div class="ti-hunger-bottom"><p class="ti-hunger-detail"></p><button type="button" data-control="feed" data-player="0" class="ti-feed" aria-label="Feed banana (B)">${bananaIcon}<span>Feed banana</span><kbd>B</kbd></button></div></section>`:'';
    return `<article class="ti-board" data-board="${i}" style="--player-color:${style.robeColor}"><header><strong>${esc(p.name)}</strong><span>${human?`LOCAL PLAYER ${i+1}`:`${tetrisLevel(p.difficulty).name.toUpperCase()} COMPUTER`}</span></header>${gorilla}<div class="ti-board-stage"><canvas class="ti-board-canvas" data-canvas="${i}" tabindex="0" role="img" aria-label="${esc(p.name)} ${classic?'Classic board':'island tower'}. ${human?'Use your keyboard or the controls below.':''}"></canvas>${!classic&&human?`<button type="button" class="ti-power-beacon" data-focus-powers="${i}" hidden>${spellIcon('power')}<span>POWER READY<small>Choose below / ${SPELL_KEYS[i].join(' or ')}</small></span></button>`:''}</div>${!classic&&human?`<section class="ti-powers" data-power-player="${i}" aria-label="${esc(p.name)} magic powers"></section>`:''}<div class="ti-board-stats"></div><div class="ti-board-status"></div>
      ${human?`<div class="ti-controls" role="group" aria-label="Controls for ${esc(p.name)}">${[['left','Left'],['rotate','Rotate'],['right','Right'],['down','Soft drop'],['drop','Drop'],[classic?'hold':'counter',classic?'Hold':'Rotate back']].map(([key,label])=>`<button type="button" data-control="${key}" data-player="${i}" aria-label="Player ${i+1}: ${label}">${label}</button>`).join('')}${!classic&&round.mode==='puzzle'?`<button type="button" data-control="bank" data-player="${i}" style="grid-column:1/-1">Freeze &amp; bank</button>`:''}</div>`:''}<span class="ti-accessible-status" role="status" aria-live="polite" aria-atomic="true"></span></article>`;
  }
  function startRound(){
    if(round?.players)disposeIslandRound(round);roundToken++;reward=createRewardSession('tetris');held.clear();pointerRepeat=null;drag=null;views.clear();notices.clear();paused=false;lastTime=0;accumulator=0;
    const chosen=tournament?tournament.rounds[tournament.index]:settings,seed=(Date.now()+roundToken*971)>>>0;
    round=chosen.mode==='classic'?createClassic({difficulty:chosen.difficulty,gorilla:settings.gorilla,seed}):createIslandRound({mode:chosen.mode,difficulty:chosen.difficulty,players:lineup,seed});
    phase='playing';wrap.dataset.phase=phase;const classic=round.mode==='classic';
    wrap.innerHTML=`${topLinks()}<header class="ti-match-heading"><div><p class="ti-eyebrow">${tournament?`ISLAND CUP / ROUND ${tournament.index+1} OF ${tournament.rounds.length}`:classic?'THE CLASSIC GRID':'THE ISLAND CHALLENGE'}</p><h3>${TETRIS_MODES[round.mode].name} <small>/ ${tetrisLevel(round.difficulty).name}</small></h3></div><span class="ti-clock"></span></header><p class="ti-match-instruction">${classic?'Clear complete rows. Arrows move and rotate, Space drops, C holds.':round.mode==='race'?'Drag to aim, rotate, and release. Keep a stable tower above the descending ribbon for 1.5 seconds.':round.mode==='puzzle'?'Fit pieces below the frost line. Every lost piece lifts your whole island. Touch the line and your tower freezes.':'Retain your full supply. Three lost pieces ends your run. The fewest pieces left wins.'}</p><div class="ti-paused-note" hidden>Paused for everyone. Resume when you are ready.</div>
      <div class="ti-boards" data-count="${lineup.length}" style="--ti-players:${lineup.length}" aria-live="off">${lineup.map((p,i)=>boardMarkup(p,i,classic)).join('')}</div><div class="ti-play-toolbar"><button type="button" data-action="pause">Pause</button><button type="button" data-action="leave">Leave match (no rewards)</button></div><p class="ti-live-status" role="status">${classic?'Your next pieces are shown at the right.':'The same shuffled piece sequence is shared by every player.'}</p>${help()}<div class="ti-result-host"></div>`;
    audio.start();renderUi();$('[data-canvas="0"]').focus({preventScroll:true});$('.ti-match-heading').scrollIntoView({block:'nearest'});
  }
  function start(){saveSettings();lineup=playersForGame();tournament=settings.mode==='tournament'?createTetrisTournament(settings.rounds,lineup):null;startRound();}
  function runControl(id,action){if(phase!=='playing'||paused||document.hidden||lineup[id]?.kind!=='human')return false;
    if(action.startsWith('spell')){if(round.mode==='classic')return false;const target=$(`[data-target="${id}"]`),choice=Number(action.at(-1)),spell=round.players?.[id]?.spells[choice];const cast=castIslandSpell(round,id,choice,Number(target?.value));if(cast){const label=SPELLS[spell],other=round.players[Number(target?.value)];announce(`${lineup[id].name} used ${label.name}${label.kind==='trick'&&other?` on ${other.name}`:''}.`);renderUi();}return cast;}
    if(round.mode==='classic')return id===0?classicAction(round,action):false;
    return islandAction(round,id,action==='hold'?'bank':action);
  }
  function togglePause(){if(phase!=='playing')return;paused=!paused;held.clear();pointerRepeat=null;drag=null;lastTime=0;accumulator=0;paused?audio.pause():audio.resume();renderUi();}
  function updatePowers(p){
    const host=$(`[data-power-player="${p.id}"]`);if(!host)return;
    const board=host.closest('.ti-board'),beacon=board.querySelector('.ti-power-beacon'),ready=p.status==='building'&&p.spells.length>0;
    board.dataset.powerState=ready?'ready':'waiting';beacon.hidden=!ready;beacon.disabled=paused||document.hidden;host.dataset.ready=String(ready);
    const rivals=round.players.filter(o=>o.id!==p.id&&o.status==='building'),sig=`${p.spells.join(',')}:${rivals.map(o=>o.id)}:${p.status}:${p.nextSpellHeight}`;
    if(host.dataset.signature!==sig){
      const previousTarget=host.querySelector('[data-target]')?.value;host.dataset.signature=sig;
      if(p.status!=='building'){host.innerHTML='<p class="ti-power-complete">Your magic is resting. Round finished.</p>';return;}
      if(!ready){host.innerHTML=`<div class="ti-power-progress-label"><span>${spellIcon('power')} ${p.spellCount>=6?'ALL SPELLS EARNED':'BUILD TO EARN MAGIC'}</span><strong data-power-height></strong></div><div class="ti-power-meter" aria-hidden="true"><span></span></div><p class="ti-power-progress-note">${p.spellCount>=6?'Keep building toward your goal.':`Your next choice unlocks at ${p.nextSpellHeight} m.`}</p>`;}
      else {
        host.innerHTML=`<div class="ti-power-ready-title"><span>${spellIcon('power')} POWER READY</span><strong>Choose ONE</strong></div><p class="ti-power-ready-note">Keep building, or cast now. Your choice stays ready.</p><div class="ti-power-options">${p.spells.map((id,i)=>`<button type="button" data-spell="${i}" data-player="${p.id}" data-kind="${SPELLS[id].kind}" ${SPELLS[id].kind==='trick'&&!rivals.length?'disabled':''} aria-label="Player ${p.id+1}: ${SPELLS[id].name}. ${SPELLS[id].description} Press ${SPELL_KEYS[p.id][i]}."><span class="ti-spell-symbol">${spellIcon(id)}</span><span class="ti-spell-copy"><span class="ti-spell-category">${SPELLS[id].kind==='help'?'HELP YOUR TOWER':'AFFECT A RIVAL'}</span><strong>${SPELLS[id].name}</strong><small>${SPELLS[id].description}</small></span><kbd>${SPELL_KEYS[p.id][i]}</kbd></button>`).join('')}</div>${p.spells.some(id=>SPELLS[id].kind==='trick')?`<label class="ti-spell-target">Rival spell target<select data-target="${p.id}" aria-label="Player ${p.id+1} spell target">${rivals.length?rivals.map(o=>`<option value="${o.id}" ${String(o.id)===previousTarget?'selected':''}>${esc(o.name)}</option>`).join(''):'<option value="">No active rivals</option>'}</select></label>`:''}`;
        if(notices.get(`power-${p.id}`)!==p.spellCount){notices.set(`power-${p.id}`,p.spellCount);board.querySelector('.ti-accessible-status').textContent=`${p.name}, your power is ready. Choose ${p.spells.map((id,i)=>`${SPELLS[id].name} with ${SPELL_KEYS[p.id][i]}`).join(' or ')}.`;}
      }
    }
    if(!ready&&p.status==='building'){
      const height=Math.max(0,p.stableTop-p.base),previous=Math.max(0,p.nextSpellHeight-4),progress=p.spellCount>=6?1:Math.max(0,Math.min(1,(height-previous)/4));
      host.querySelector('[data-power-height]').textContent=p.spellCount>=6?'6 / 6':`${height.toFixed(1)} / ${p.nextSpellHeight} m`;
      host.querySelector('.ti-power-meter span').style.width=`${progress*100}%`;
    }
  }
  function updateGorilla(board){
    const hud=board.querySelector('.ti-gorilla-hud');if(!hud)return;
    const seconds=Math.max(0,Math.ceil(round.hunger)),danger=round.anger>0?'smashing':round.hunger<=GORILLA_URGENT_SECONDS?'urgent':round.hunger<=GORILLA_WARNING_SECONDS?'warning':'calm';
    const fed=round.effects.some(effect=>effect.kind==='banana'&&round.seconds-effect.time<1);
    board.dataset.hunger=danger;hud.dataset.hunger=danger;hud.dataset.fed=String(fed);
    hud.querySelector('.ti-hunger-title').textContent=fed?'Banana delivered!':danger==='smashing'?'The gorilla is smashing!':danger==='urgent'?'Feed it before it smashes!':danger==='warning'?'The gorilla is getting hungry':'The gorilla is calm';
    hud.querySelector('.ti-hunger-clock').textContent=`${seconds}s`;
    const meter=hud.querySelector('.ti-hunger-meter');meter.setAttribute('aria-valuenow',String(seconds));meter.setAttribute('aria-valuetext',`${seconds} seconds until the next smash`);meter.firstElementChild.style.width=`${Math.max(0,Math.min(1,round.hunger/42))*100}%`;
    const needed=2-round.lines%2;hud.querySelector('.ti-hunger-detail').textContent=round.bananas?`${round.bananas} ${round.bananas===1?'banana':'bananas'} ready / press B or tap Feed`:`No bananas. Clear ${needed} ${needed===1?'line':'lines'} to earn one.`;
    if(notices.get('hunger')!==danger){notices.set('hunger',danger);if(danger!=='calm')board.querySelector('.ti-accessible-status').textContent=danger==='smashing'?'The gorilla smashed your blocks.':`Gorilla ${danger==='urgent'?'urgent warning':'warning'}: ${seconds} seconds left. ${round.bananas?'Press B or use Feed banana.':`Clear ${needed} ${needed===1?'line':'lines'} to earn a banana.`}`;}
  }
  function renderUi(){
    if(phase!=='playing')return;
    const classic=round.mode==='classic',clock=$('.ti-clock');clock.textContent=classic?`${Math.floor(round.seconds/60)}:${String(Math.floor(round.seconds%60)).padStart(2,'0')}`:`${Math.ceil(Math.max(0,round.level.limit-round.seconds))}s until sunset`;
    const isPaused=paused||document.hidden;wrap.dataset.paused=String(isPaused);$('.ti-paused-note').hidden=!isPaused;$('[data-action="pause"]').textContent=paused?'Resume':'Pause';
    for(let i=0;i<lineup.length;i++){const board=$(`[data-board="${i}"]`),p=classic?round:round.players[i];
      const stats=classic?[['SCORE',round.score.toLocaleString()],['LINES',round.lines],['LEVEL',round.level]]:round.mode==='survival'?[['LEFT',Math.max(0,round.level.supply-p.retained)],['LIVES',Math.max(0,3-p.lost)],['KEPT',p.retained]]:round.mode==='puzzle'?[['KEPT',p.retained],['ISLAND',`${p.base.toFixed(1)} m`],['LOST',p.lost]]:[['HEIGHT',`${Math.max(0,p.top-p.base).toFixed(1)} m`],['FINISH',`${islandFinishLine(round).toFixed(1)} m`],['KEPT',p.retained]];
      board.querySelector('.ti-board-stats').innerHTML=stats.map(([label,value])=>`<span>${label}<strong>${value}</strong></span>`).join('');
      const status=classic?(round.gorilla?'Every two cleared lines earn a banana. Feed before the countdown reaches zero.':'Keep the stack below the top. Complete a full row to clear it.'):p.status==='building'?[p.buffs.anchor?'Next piece anchored':'',p.buffs.shield?'Shield ready':'',p.buffs.heavy?'Heavy piece next':'',p.buffs.tilt?'Tilted piece next':'',p.raceHold>0?'Hold steady...':''].filter(Boolean).join(' / ')||(!p.active&&p.pending?'Piece landing. Watch its balance.':`${p.retained} ${p.retained===1?'piece':'pieces'} held by your tower.`):p.status==='out'?'Three lost pieces. Your run is over.':p.status==='complete'?'Supply or finish reached!':p.status==='finished'?'Round complete. Your final height and pieces are recorded.':'Your tower is frozen. Watching the other players.';
      board.querySelector('.ti-board-status').textContent=status;
      if(classic&&round.gorilla)updateGorilla(board);
      for(const button of board.querySelectorAll('[data-control]'))button.disabled=isPaused||(!classic&&(p.status!=='building'||(!p.active&&button.dataset.control!=='bank')))||(button.dataset.control==='feed'&&!round.bananas)||(button.dataset.control==='hold'&&round.held);
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
    if(button.dataset.focusPowers!==undefined){const host=$(`[data-power-player="${button.dataset.focusPowers}"]`);host.scrollIntoView({block:'nearest',behavior:media.matches?'instant':'smooth'});host.querySelector('[data-spell]:not(:disabled)')?.focus({preventScroll:true});return;}
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
    else if(canvas){event.preventDefault();canvas.focus({preventScroll:true});
      const id=Number(canvas.dataset.canvas),view=views.get(id),rect=canvas.getBoundingClientRect();
      if(round?.mode==='classic'&&round.gorilla&&view&&event.clientX-rect.left>=view.x+10*view.unit+10&&event.clientY-rect.top>=rect.height-220){runControl(id,'feed');return;}
      drag={canvas,pointer:event.pointerId};canvas.setPointerCapture?.(event.pointerId);aim(canvas,event.clientX);}
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
