import { LIGHTS_SIZES, LIGHTS_DIFFICULTIES, LIGHTS_LEVELS, affectedLights, makeLightsPuzzle, lightsLevel, createLightsRound, pressLight, undoLight, lightsHint, solveLights, lightsStars, readLightsProgress, saveLightsProgress, recordLightsWin } from './lights-down-engine.js';
import { createLightsAudio } from './lights-down-audio.js';

const power = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 5v11M10 8.5a10 10 0 1 0 12 0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.1 6.3 7 .9-5 5 1.2 7-6.3-3.4-6.3 3.4 1.2-7-5-5 7-.9Z"/></svg>';
const icons = {
  undo: '<path d="M9 6 4 11l5 5M5 11h9a5 5 0 0 1 0 10"/>',
  restart: '<path d="M5 9a8 8 0 1 1 0 7M5 4v5h5"/>',
  hint: '<path d="M9 17h6m-5 4h4M9 14a6 6 0 1 1 6 0v3H9Z"/>',
  expand: '<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
  sound: '<path d="m10 5-5 4H2v6h3l5 4Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const starRow = count => Array.from({ length: 3 }, (_, i) => `<span class="${i < count ? 'is-earned' : ''}" style="--star-order:${i}">${star}</span>`).join('');

export function createLightsDown(root) {
  const wrapper = document.createElement('section'); wrapper.className = 'ld-game'; wrapper.setAttribute('aria-label', 'Lights Down puzzle'); wrapper.setAttribute('aria-live', 'off');
  wrapper.innerHTML = `
    <header class="ld-hero"><div><p class="ld-eyebrow">A QUIET LITTLE LOGIC GAME</p><h3>One switch.<br>A ripple of possibilities.</h3><p>Find the pattern. Follow the connections.<br>Leave every light off.</p></div><img src="assets/lights-down.svg" width="150" height="150" alt="Glowing amber switches on a midnight-blue circuit board"></header>
    <div class="ld-setup"><div class="ld-modes" role="group" aria-label="Puzzle mode"><button type="button" data-mode="journey">Circuit journey <small>25 challenges</small></button><button type="button" data-mode="free">Free play <small>Endless puzzles</small></button></div><button type="button" class="ld-sound" data-action="sound">${icon('sound')}<span></span></button></div>
    <details class="ld-circuits"><summary><span>Choose a circuit <strong class="ld-progress-count"></strong></span><span class="ld-progress-stars"></span></summary><div class="ld-levels"></div><p>Start anywhere. Your best stars are saved on this device.</p></details>
    <div class="ld-free-settings" hidden><label>Board size<select aria-label="Lights grid size">${LIGHTS_SIZES.map(size => `<option value="${size}">${size} &times; ${size}</option>`).join('')}</select></label><label>Difficulty<select aria-label="Puzzle difficulty">${Object.entries(LIGHTS_DIFFICULTIES).map(([id, level]) => `<option value="${id}">${level.name}</option>`).join('')}</select></label><p>Every puzzle can be solved. <br>No clock. Take your time.</p></div>
    <div class="ld-workspace"><div class="ld-playfield">
      <div class="ld-circuit-heading"><div><p class="ld-eyebrow ld-circuit-number"></p><h4 class="ld-circuit-title"></h4></div><button type="button" data-action="expand" aria-label="Expand puzzle">${icon('expand')}</button></div>
      <div class="ld-stats" aria-label="Puzzle statistics"><div><span>MOVES</span><strong class="ld-moves">0</strong></div><div><span>PAR <small title="The fewest possible moves for the starting puzzle">/ BEST POSSIBLE</small></span><strong class="ld-par"></strong></div><div><span>LIGHTS ON</span><strong class="ld-count"></strong></div></div>
      <div class="ld-board-wrap"><div class="ld-board-frame"><i class="ld-screw s1"></i><i class="ld-screw s2"></i><i class="ld-screw s3"></i><i class="ld-screw s4"></i><div class="ld-traces" aria-hidden="true"></div><div class="ld-grid" role="group" aria-label="Lights Down board. Arrow keys move; Enter or Space presses a switch."></div><div class="ld-frame-label" aria-hidden="true"><span>LD / SWITCH ARRAY</span><span class="ld-array-size"></span></div></div>
        <section class="ld-ending" aria-label="Puzzle complete" hidden><div class="ld-end-orbit" aria-hidden="true"></div><div class="ld-end-emblem" aria-hidden="true">${power}</div><p class="ld-eyebrow">CIRCUIT COMPLETE</p><h4 tabindex="-1">Beautifully switched off.</h4><div class="ld-end-stars"></div><p class="ld-end-detail"></p><p class="ld-end-rating"></p><div class="ld-end-actions"><button type="button" class="ld-primary" data-action="next">Next circuit</button><button type="button" data-action="replay">Try again</button></div></section>
      </div>
      <div class="ld-meter" aria-hidden="true"><span></span></div>
      <p class="ld-status" role="status" aria-live="polite"></p>
      <div class="ld-tools"><button type="button" data-action="undo">${icon('undo')}Undo</button><button type="button" data-action="restart">${icon('restart')}Restart</button><button type="button" data-action="hint">${icon('hint')}One hint</button><button type="button" data-action="solution">Show solution</button></div>
      <div class="ld-bottom"><span class="ld-assist-note">Aim for par to earn all three stars.</span><button type="button" data-action="new">New puzzle <span aria-hidden="true">&rarr;</span></button></div>
    </div><aside class="ld-guide" aria-label="How to play"><p class="ld-eyebrow">THE RULE IS SIMPLE</p><h4>One tap.<br>Five possibilities.</h4><p>A switch flips <strong>itself</strong> and its neighbors <strong>above, below, left, and right</strong>. Lit becomes dark. Dark becomes lit.</p>
      <button type="button" class="ld-demo" data-action="demo" aria-label="Try the example: press the center to switch off the five lights">${Array.from({ length: 9 }, (_, i) => `<span class="${[1, 3, 4, 5, 7].includes(i) ? 'is-lit' : ''} ${i === 4 ? 'is-demo-center' : ''}">${i === 4 ? power : ''}</span>`).join('')}</button><p class="ld-demo-caption">Try the center switch above.</p>
      <ul><li><strong>No diagonals.</strong> At an edge, only the neighbors on the board flip.</li><li><strong>Every light must be off.</strong> Sometimes you need to turn a light on to solve the puzzle.</li><li><strong>Experiment freely.</strong> Undo takes back a tap. Restart restores this exact puzzle.</li></ul>
      <div class="ld-rating-guide"><h5>Aim for the cleanest solution</h5><p>${star}<span><strong>3 stars:</strong> finish at par, without hints.</span></p><p>${star}<span><strong>2 stars:</strong> finish close to par, without hints.</span></p><p>${star}<span><strong>1 star:</strong> every other solve, including assisted solves.</span></p><small class="ld-two-star-guide"></small></div>
      <p class="ld-keyboard">Keyboard: arrow keys to move, Enter or Space to switch, Z to undo.</p>
    </aside></div>`;
  root.append(wrapper);
  const $ = selector => wrapper.querySelector(selector), abort = new AbortController(), on = (node, name, handler) => node.addEventListener(name, handler, { signal: abort.signal });
  const progress = readLightsProgress(), audio = createLightsAudio(progress.sound), motion = matchMedia('(prefers-reduced-motion: reduce)'), animations = new Set();
  let state, cells = [], focusIndex = 0, preview = -1, singleHint = -1, showSolution = false, disposed = false, expanded = false, previousOverflow = '', demoDark = false;
  const persist = () => saveLightsProgress(progress);
  function buildLevels() {
    $('.ld-levels').innerHTML = LIGHTS_SIZES.map((size, chapter) => `<div class="ld-chapter"><p>${size} &times; ${size} <span>${['Warm up', 'Find the rhythm', 'The classic', 'Think bigger', 'Master the grid'][chapter]}</span></p><div>${LIGHTS_LEVELS.filter(level => level.size === size).map(level => `<button type="button" data-level="${level.id}"><strong>${String(level.id + 1).padStart(2, '0')}</strong><span class="ld-level-stars" aria-hidden="true">${starRow(progress.completed[level.id]?.stars || 0)}</span></button>`).join('')}</div></div>`).join('');
  }
  function levelProgress() {
    $('.ld-progress-count').textContent = `${Object.keys(progress.completed).length} / 25 complete`;
    $('.ld-progress-stars').textContent = `${Object.values(progress.completed).reduce((sum, record) => sum + record.stars, 0)} / 75 stars`;
    wrapper.querySelectorAll('[data-level]').forEach(button => {
      const level = LIGHTS_LEVELS[+button.dataset.level], record = progress.completed[level.id];
      button.setAttribute('aria-pressed', String(progress.level === level.id));
      button.setAttribute('aria-label', `Circuit ${level.id + 1}: ${level.name}, ${level.size} by ${level.size}${record ? `, ${record.stars} stars, best ${record.moves} moves` : ', not completed'}`);
      button.querySelector('.ld-level-stars').innerHTML = starRow(record?.stars || 0);
    });
  }
  function updatePreview(index = -1) {
    preview = state.solved ? -1 : index;
    const affected = affectedLights(state.size, preview);
    cells.forEach((cell, i) => { cell.classList.toggle('is-preview', affected.includes(i)); cell.classList.toggle('is-center', i === preview); });
  }
  function render() {
    const onCount = state.board.filter(Boolean).length, solution = showSolution && !state.solved ? solveLights(state.board, state.size) : [];
    wrapper.dataset.mode = progress.mode; wrapper.dataset.solved = String(state.solved);
    wrapper.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === progress.mode)));
    $('.ld-circuits').hidden = progress.mode !== 'journey'; $('.ld-free-settings').hidden = progress.mode !== 'free';
    $('.ld-circuit-number').textContent = progress.mode === 'journey' ? `CIRCUIT ${String(progress.level + 1).padStart(2, '0')} / 25` : `${LIGHTS_DIFFICULTIES[progress.difficulty].name.toUpperCase()} / FREE PLAY`;
    $('.ld-circuit-title').textContent = progress.mode === 'journey' ? LIGHTS_LEVELS[progress.level].name : 'Your own quiet challenge';
    $('.ld-moves').textContent = state.moves; $('.ld-par').textContent = state.par; $('.ld-count').textContent = `${onCount} / ${state.board.length}`;
    $('.ld-meter span').style.width = `${onCount / state.board.length * 100}%`;
    $('.ld-array-size').textContent = `${state.size} x ${state.size}`;
    $('.ld-grid').style.setProperty('--ld-size', state.size);
    cells.forEach((cell, index) => {
      const hintIndex = solution.indexOf(index), hinted = index === singleHint || hintIndex >= 0;
      cell.dataset.on = String(!!state.board[index]); cell.disabled = state.solved; cell.tabIndex = index === focusIndex && !state.solved ? 0 : -1;
      cell.classList.toggle('is-hint', hinted);
      cell.querySelector('.ld-hint-number').textContent = hinted ? showSolution ? hintIndex + 1 : '1' : '';
      cell.setAttribute('aria-pressed', String(!!state.board[index]));
      cell.setAttribute('aria-label', `Row ${Math.floor(index / state.size) + 1}, column ${index % state.size + 1}, ${state.board[index] ? 'on' : 'off'}${hinted ? ', suggested switch' : ''}`);
    });
    $('[data-action="undo"]').disabled = !state.history.length || state.solved;
    for (const action of ['hint', 'solution']) $(`[data-action="${action}"]`).disabled = state.solved;
    $('[data-action="restart"]').disabled = !state.moves && !state.assisted;
    $('[data-action="solution"]').textContent = showSolution ? 'Hide solution' : 'Show solution';
    $('[data-action="solution"]').setAttribute('aria-pressed', String(showSolution));
    $('[data-action="sound"] span').textContent = audio.enabled ? 'Sound on' : 'Sound off';
    $('[data-action="sound"]').setAttribute('aria-pressed', String(audio.enabled));
    $('.ld-assist-note').textContent = state.assisted ? 'Assisted solve: one star. Restart for a fresh attempt.' : 'Aim for par to earn all three stars.';
    $('.ld-two-star-guide').textContent = `This puzzle: 3 stars in ${state.par} ${state.par === 1 ? 'move' : 'moves'}; 2 stars in ${state.par + Math.max(2, Math.ceil(state.par / 2))} or fewer. Hints limit a solve to 1 star.`;
    $('[data-action="new"]').hidden = progress.mode !== 'free';
    updatePreview(preview); levelProgress();
  }
  function announce(message) { $('.ld-status').textContent = message; }
  function stopAnimations() { for (const animation of animations) animation.cancel(); animations.clear(); }
  function newPuzzle(replay = false) {
    stopAnimations(); audio.stop(); singleHint = -1; showSolution = false; preview = -1;
    const oldFocus = focusIndex, oldSize = state?.size;
    let puzzle;
    if (replay && state) puzzle = { size: state.size, board: state.initial, par: state.par, key: state.key };
    else if (progress.mode === 'journey') puzzle = lightsLevel(progress.level);
    else puzzle = makeLightsPuzzle({ size: progress.size, target: Math.max(2, Math.round(progress.size ** 2 * LIGHTS_DIFFICULTIES[progress.difficulty].fraction)), seed: Math.floor(Math.random() * 4294967296) });
    state = createLightsRound(puzzle); focusIndex = oldSize === state.size ? oldFocus : Math.floor(state.size ** 2 / 2);
    $('.ld-ending').hidden = true;
    $('.ld-grid').innerHTML = state.board.map((_, i) => `<button type="button" class="ld-cell" data-cell="${i}"><span class="ld-lens">${power}</span><span class="ld-cell-id" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span class="ld-hint-number" aria-hidden="true"></span></button>`).join('');
    cells = [...$('.ld-grid').children]; render(); persist();
    announce(replay ? 'Same puzzle, fresh start. Every light needs to go off.' : state.par === 1 ? 'One well-placed tap can clear this circuit. Look for the center of the glowing cross.' : 'Hover or focus a switch to preview its neighbors. Turn every light off.');
  }
  function animateSwitches(index) {
    if (motion.matches) return;
    affectedLights(state.size, index).forEach((i, order) => {
      const animation = cells[i].querySelector('.ld-lens').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(3px) scale(.95)', offset: .28 }, { transform: 'translateY(0)' }], { duration: 270, delay: order * 18, easing: 'ease-out' });
      animations.add(animation); animation.onfinish = () => animations.delete(animation);
    });
  }
  function finish() {
    const stars = lightsStars(state); recordLightsWin(progress, progress.level, state); persist(); levelProgress();
    $('.ld-end-stars').innerHTML = starRow(stars); $('.ld-end-stars').setAttribute('aria-label', `${stars} out of 3 stars`);
    $('.ld-end-detail').textContent = `${state.moves} ${state.moves === 1 ? 'move' : 'moves'} / par ${state.par} / every light off`;
    $('.ld-end-rating').textContent = state.assisted ? 'Solved with a little help. Try again without hints for more stars.' : stars === 3 ? 'A perfect solution. Not a single extra switch.' : stars === 2 ? 'Nicely done. A few fewer taps will earn your third star.' : 'You found your way through. Every solved circuit is a win.';
    $('.ld-ending h4').textContent = progress.mode === 'journey' && Object.keys(progress.completed).length === 25 ? 'Every circuit. Beautifully dark.' : 'Beautifully switched off.';
    $('[data-action="next"]').textContent = progress.mode === 'free' ? 'New puzzle' : progress.level < 24 ? 'Next circuit' : 'Explore free play';
    $('.ld-ending').hidden = false; $('.ld-ending h4').focus({ preventScroll: true });
    announce(`Circuit complete in ${state.moves} moves. ${stars} out of 3 stars.`); audio.win();
  }
  function tap(index) {
    const previous = state.board.filter(Boolean).length;
    if (!pressLight(state, index)) return;
    focusIndex = index; singleHint = -1; render(); animateSwitches(index); audio.tap(state.board.filter(Boolean).length < previous);
    if (state.solved) finish();
    else announce(showSolution ? 'Tap the numbered switches once each, in any order. The solution updates after every move.' : `${state.board.filter(Boolean).length} lights still on. Keep following the pattern.`);
  }
  function undo() {
    if (!undoLight(state)) return;
    singleHint = -1; render(); audio.tap(true); announce('Last tap undone. You can try a different switch.');
  }
  function setExpanded(value) {
    expanded = value; wrapper.classList.toggle('ld-expanded', value);
    if (value) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    else document.body.style.overflow = previousOverflow;
    $('[data-action="expand"]').setAttribute('aria-label', value ? 'Exit expanded puzzle' : 'Expand puzzle');
    $('[data-action="expand"]').setAttribute('aria-pressed', String(value));
  }
  on(wrapper, 'click', event => {
    const button = event.target.closest('button'); if (!button || button.disabled) return;
    if (button.dataset.cell !== undefined) { tap(+button.dataset.cell); return; }
    if (button.dataset.level !== undefined) { progress.level = +button.dataset.level; $('.ld-circuits').open = false; newPuzzle(); return; }
    if (button.dataset.mode) { if (button.dataset.mode !== progress.mode) { progress.mode = button.dataset.mode; newPuzzle(); } return; }
    const action = button.dataset.action;
    if (action === 'undo') undo();
    if (action === 'restart' || action === 'replay') { newPuzzle(true); if (action === 'replay') cells[focusIndex].focus({ preventScroll: true }); }
    if (action === 'new') newPuzzle();
    if (action === 'next') {
      if (progress.mode === 'journey') { if (progress.level < 24) progress.level++; else progress.mode = 'free'; }
      newPuzzle(); cells[focusIndex].focus({ preventScroll: true });
    }
    if (action === 'hint') {
      singleHint = lightsHint(state)[0] ?? -1; showSolution = false; render(); audio.hint();
      announce(singleHint < 0 ? 'Every light is already off.' : `Try row ${Math.floor(singleHint / state.size) + 1}, column ${singleHint % state.size + 1}: the switch marked 1. This solve will earn one star.`);
    }
    if (action === 'solution') {
      showSolution = !showSolution; singleHint = -1; if (showSolution) lightsHint(state); render();
      announce(showSolution ? 'Press every numbered switch once, in any order. Other switches do not need pressing. This is an assisted, one-star solve.' : 'Solution hidden. This attempt is still marked as assisted.');
    }
    if (action === 'sound') { audio.setEnabled(!audio.enabled); progress.sound = audio.enabled; persist(); render(); if (audio.enabled) audio.tap(true); }
    if (action === 'expand') setExpanded(!expanded);
    if (action === 'demo') {
      demoDark = !demoDark; $('.ld-demo').classList.toggle('is-dark', demoDark);
      $('.ld-demo-caption').textContent = demoDark ? 'Five lights off. The diagonal corners stayed the same. Tap again to reset.' : 'Try the center switch above.';
      $('.ld-demo').setAttribute('aria-label', demoDark ? 'Example solved. Press to turn the five lights back on.' : 'Try the example: press the center to switch off the five lights'); audio.tap(demoDark);
    }
  });
  on($('.ld-grid'), 'pointerover', event => { const cell = event.target.closest('[data-cell]'); if (cell) updatePreview(+cell.dataset.cell); });
  on($('.ld-grid'), 'pointerleave', () => updatePreview(-1));
  on($('.ld-grid'), 'focusin', event => { const cell = event.target.closest('[data-cell]'); if (cell) { focusIndex = +cell.dataset.cell; cells.forEach((b, i) => { b.tabIndex = i === focusIndex ? 0 : -1; }); updatePreview(focusIndex); } });
  on($('.ld-grid'), 'focusout', event => { if (!$('.ld-grid').contains(event.relatedTarget)) updatePreview(-1); });
  on(wrapper, 'keydown', event => {
    if (event.target.matches('input,select,textarea') || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Escape' && expanded) { event.preventDefault(); setExpanded(false); $('[data-action="expand"]').focus(); }
    if (event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); }
    if (!event.target.matches('[data-cell]') || state.solved) return;
    let next = focusIndex;
    if (event.key === 'ArrowLeft') next -= focusIndex % state.size > 0 ? 1 : 0;
    else if (event.key === 'ArrowRight') next += focusIndex % state.size < state.size - 1 ? 1 : 0;
    else if (event.key === 'ArrowUp') next = Math.max(focusIndex % state.size, focusIndex - state.size);
    else if (event.key === 'ArrowDown') next = Math.min((state.size - 1) * state.size + focusIndex % state.size, focusIndex + state.size);
    else if (event.key === 'Home') next -= focusIndex % state.size;
    else if (event.key === 'End') next += state.size - 1 - focusIndex % state.size;
    else return;
    event.preventDefault(); cells[next].focus();
  });
  for (const [selector, key] of [['[aria-label="Lights grid size"]', 'size'], ['[aria-label="Puzzle difficulty"]', 'difficulty']]) {
    $(selector).value = progress[key]; on($(selector), 'change', event => { progress[key] = key === 'size' ? +event.target.value : event.target.value; newPuzzle(); });
  }
  on(document, 'visibilitychange', () => { if (document.hidden) audio.stop(); });
  buildLevels(); newPuzzle();
  return () => { if (disposed) return; disposed = true; if (expanded) setExpanded(false); stopAnimations(); audio.dispose(); abort.abort(); wrapper.remove(); };
}
