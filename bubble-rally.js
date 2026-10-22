import { OPPONENT_LEVELS, createComputerOpponent, createOpponentScheduler } from "./arcade/opponents.js";
import { createRally, rollRally, rallyActions, resolveRallyAction, advanceRally, scoreRallyAction,
  RALLY_COURSES, RALLY_ACTIONS, RACER_COLORS, rallyCourse, MAX_ENERGY } from "./bubble-rally-model.js";
import { createRallyRenderer } from "./bubble-rally-renderer.js";
import { rallyMoveDetails } from "./bubble-rally-guide.js";
import { createRallyFinishPlayer, RALLY_FINISHES } from "./bubble-rally-finish.js";

const SETTINGS_KEY = "bubble-rally-setup-v2";
// Temporary review shortcuts. Turn off after the four finish clips are approved.
const ENABLE_FINISH_PREVIEWS = true;
const el = (tag, className, text) => {
  const node = document.createElement(tag); if (className) node.className = className;
  if (text !== undefined) node.textContent = text; return node;
};
const button = (text, className = "") => { const node = el("button", className, text); node.type = "button"; return node; };
function selectField(title, options, value, aria = title) {
  const label = el("label", "rally-field"), select = el("select");
  select.setAttribute("aria-label", aria);
  options.forEach(option => select.add(new Option(option.label, option.id)));
  select.value = value;
  if (select.selectedIndex < 0) select.selectedIndex = 0;
  label.append(el("span", "", title), select); return { label, select };
}

export function createBubbleRally(root) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { /* Fresh setup. */ }
  const wrapper = el("div", "rally-game");
  wrapper.innerHTML = `
    <div class="rally-intro">
      <img src="assets/bubble-rally-cover.png" width="88" height="88" alt="Four glass bubbles racing along a luminous track" />
      <div><span class="rally-eyebrow">THE GLASS CIRCUITS</span><h3>Small bubbles. Big rivalries.</h3><p>2-4 racers / Shared screen / Your choice of opponents</p></div>
    </div>
    <details class="rally-setup" open><summary>Race setup</summary><div class="rally-setup-body"></div></details>
    <details class="rally-finish-customizer" open><summary>Finish clips &amp; character names</summary><div class="rally-finish-body"><p>Choose the name shown when each color wins. Leave a name blank to use its racer name.</p><div class="rally-finish-names"></div><p class="rally-finish-cheats" hidden>Temporary previews: press <kbd>1</kbd> Cyan, <kbd>2</kbd> Coral, <kbd>3</kbd> Amber, or <kbd>4</kbd> Violet. Your race waits while you watch. <kbd>Esc</kbd> closes the clip.</p></div></details>
    <div class="rally-scoreboard" aria-label="Racer positions and energy"></div>
    <div class="rally-arena">
      <div class="rally-arena-header"><span class="rally-course-name"></span><span class="rally-round"></span></div>
      <canvas class="rally-canvas" role="img" aria-label="Bubble race board. Racer positions and resources are listed above."></canvas>
      <div class="rally-finale" hidden>
        <span class="rally-eyebrow">CIRCUIT CHAMPION</span><h3 class="rally-winner-name"></h3><p class="rally-winner-detail"></p>
        <div class="rally-finale-controls"></div>
      </div>
      <div class="rally-arena-footer"><span>START</span><span>Checkpoints 10 / 20</span><span>FINISH 31</span></div>
    </div>
    <div class="rally-turn-panel">
      <div class="rally-turn-heading"><div><span class="rally-eyebrow rally-turn-label">READY TO RALLY</span><p class="rally-status" role="status" aria-live="polite"></p></div><div class="rally-die" aria-label="No roll yet">?</div></div>
      <div class="rally-turn-controls"></div><div class="rally-actions" aria-label="Choose your move"></div>
      <p class="rally-preview-note">Roll first, then choose how to use it.</p>
      <ol class="rally-move-details" aria-label="Move breakdown" hidden></ol>
    </div>
    <div class="rally-rules">
      <h3>How to rally</h3>
      <p class="rally-rule-goal">Be the first bubble to reach tile 31. Overshooting counts!</p>
      <ol><li><strong>Roll once, then choose a move.</strong> Every racer uses the same fair 1-6 die. Cruise moves that many spaces and restores 1 energy. Boost spends 2 energy for 2 extra spaces. Brake moves 2 fewer spaces (at least 1) and restores <strong>2 energy</strong>. Shield spends 2 energy, moves your roll, and protects you until it blocks one hit.</li>
      <li><strong>Check where you will land.</strong> Each move card shows your final tile and energy, including the tile's effect. Hover or keyboard-focus a card for a path preview and full breakdown. Energy starts at 2 and cannot exceed 6.</li>
      <li><strong>Resolve the landing tile, then any rivals.</strong> Only the first tile you land on triggers an effect. Passing over currents, charge tiles or storms does nothing. A current or storm moving you onto another special tile does not trigger it again.</li>
      <li><strong>Pop rivals and keep your progress.</strong> End your move on a rival to send them back to their latest checkpoint (or START). A shield blocks one incoming pop or storm, then breaks; you can still pop others while shielded. Reaching or passing 10 or 20 saves a checkpoint. Nobody can be popped at START, a checkpoint, or FINISH.</li>
      <li><strong>Pass the turn.</strong> Humans press Next racer; computers play automatically. Rematches rotate the starting racer. Pause stops the race for everyone.</li></ol>
      <div class="rally-brake-tip"><strong>Why brake?</strong> Trade some distance now for 2 energy to use on a later Boost or Shield. You can also avoid a bad landing: on Prism Circuit, from tile 3 with a roll of 4, Cruise lands on storm 7 and pushes you back to 5. Brake lands on current 5, which carries you to 7 instead, and restores 2 energy. The storm does not trigger after the current.</div>
      <div class="rally-legend">
        <div data-tile="boost"><b>&gt;&gt;</b><div><strong>Current: +2 spaces</strong><p>Land here and move forward 2 more spaces. This does not give energy.</p></div></div>
        <div data-tile="charge"><b>E+2</b><div><strong>Charge: +2 energy</strong><p>Stay on this tile and recharge, up to 6 energy. This does not move you.</p></div></div>
        <div data-tile="storm"><b class="rally-storm-symbol">-2</b><div><strong class="rally-storm-title">Storm: back 2 spaces</strong><p>Land here and get pushed back, never behind your checkpoint. A shield absorbs the storm and breaks.</p></div></div>
        <div data-tile="checkpoint"><b>SAFE</b><div><strong>Checkpoint: tiles 10 and 20</strong><p>Reach or pass one to save your progress. Racers can share these tiles without being popped.</p></div></div>
      </div>
      <p class="rally-fair-note">Computer racers use the same dice, energy and legal moves. Difficulty changes their decisions. Even expert can make mistakes.</p>
    </div>
    <details class="rally-history"><summary>Race log</summary><ol aria-label="Recent moves"></ol></details>`;
  root.append(wrapper);
  const find = selector => wrapper.querySelector(selector);
  const setup = find(".rally-setup"), setupBody = find(".rally-setup-body");
  const presets = el("div", "rally-presets");
  const cpuPreset = button("Vs computer"), localPreset = button("Local multiplayer");
  presets.append(cpuPreset, localPreset);
  const fields = el("div", "rally-setup-fields");
  const count = selectField("Racers", [2, 3, 4].map(n => ({ id: String(n), label: `${n} racers` })), String(saved.count || 2));
  const course = selectField("Circuit", RALLY_COURSES.map(c => ({ id: c.id, label: c.name })), saved.course || "prism");
  fields.append(count.label, course.label);
  const courseNote = el("p", "rally-course-note");
  const roster = el("div", "rally-roster");
  const names = ["Cyan", "Coral", "Amber", "Violet"];
  const seats = names.map((name, index) => {
    const value = saved.players?.[index] || {};
    const row = el("div", "rally-seat"); row.style.setProperty("--racer-color", RACER_COLORS[index]);
    const number = el("span", "rally-seat-number", String(index + 1));
    const nameLabel = el("label", "rally-field");
    const input = el("input"); input.type = "text"; input.maxLength = 20; input.value = String(value.name || name).slice(0, 20);
    input.setAttribute("aria-label", `Racer ${index + 1} name`); nameLabel.append(el("span", "", "Name"), input);
    const kind = selectField("Control", [{ id: "human", label: "Human" }, { id: "computer", label: "Computer" }], value.kind || (index === 0 ? "human" : "computer"), `Racer ${index + 1} control`);
    const difficulty = selectField("Difficulty", OPPONENT_LEVELS, value.difficulty || "medium", `Racer ${index + 1} difficulty`);
    const humanNote = el("span", "rally-human-note", "Your move, your strategy.");
    const sync = () => { difficulty.label.hidden = kind.select.value !== "computer"; difficulty.select.disabled = kind.select.value !== "computer"; humanNote.hidden = kind.select.value === "computer"; };
    kind.select.addEventListener("change", sync); sync();
    row.append(number, nameLabel, kind.label, difficulty.label, humanNote); roster.append(row);
    return { row, input, kind: kind.select, difficulty: difficulty.select, sync };
  });
  const setupFooter = el("div", "rally-setup-footer");
  const startButton = button("Start race", "rally-primary");
  const setupHint = el("span", "", "Mix humans and computers. Set each computer separately.");
  setupFooter.append(startButton, setupHint);
  setupBody.append(presets, fields, courseNote, roster, setupFooter);
  const status = find(".rally-status"), die = find(".rally-die"), actions = find(".rally-actions"), scoreboard = find(".rally-scoreboard");
  const rollButton = button("Roll bubble", "rally-primary"), nextButton = button("Next racer", "rally-primary");
  const pauseButton = button("Pause"), soundButton = button("Sound on"), rematchButton = button("Race again", "rally-primary");
  const soundEnabled = saved.sound !== false;
  let sound = soundEnabled, audio = null, live = false, paused = false, rolling = false, moving = false, disposed = false;
  let preview = null, computers = [], history = [], firstPlayer = Math.floor(Math.random() * Number(count.select.value));
  let finishPlayer = null;
  const finishNames = RALLY_FINISHES.map((_, index) => String(saved.finishNames?.[index] || "").slice(0, 32));
  const clock = createOpponentScheduler();
  const readPlayers = () => seats.slice(0, Number(count.select.value)).map(seat => ({ name: seat.input.value, kind: seat.kind.value, difficulty: seat.difficulty.value }));
  let state = createRally({ players: readPlayers(), course: course.select.value, firstPlayer });
  const renderer = createRallyRenderer(find("canvas"), { getState: () => state, getPreview: () => preview, isPaused: () => paused || document.hidden || finishPlayer?.isOpen, isRolling: () => rolling });
  find(".rally-turn-controls").append(rollButton, nextButton, pauseButton, soundButton);
  find(".rally-finale-controls").append(rematchButton);
  const actionButtons = RALLY_ACTIONS.map(action => {
    const node = button("", "rally-action"); node.dataset.action = action.id;
    node.append(el("span", "rally-action-title", action.name), el("span", "rally-action-cost", action.cost ? `Spend ${action.cost} energy` : `+${action.gain} energy`), el("small", "", action.description), el("strong", "rally-action-result", "Roll first"), el("span", "rally-action-effects"));
    const showPreview = () => {
      if (node.disabled) return; preview = resolveRallyAction(state, action.id);
      find(".rally-preview-note").textContent = `Preview: ${rallyMoveDetails(preview).summary}`;
      showMoveDetails(preview);
    };
    node.addEventListener("pointerenter", showPreview); node.addEventListener("focus", showPreview);
    node.addEventListener("pointerleave", clearPreview); node.addEventListener("blur", clearPreview);
    node.addEventListener("click", () => { if (!node.disabled) takeAction(action.id); });
    actions.append(node); return node;
  });

  const finishName = index => finishNames[index].trim() || state.players[index]?.name || seats[index].input.value.trim() || RALLY_FINISHES[index].name;
  const finishInputs = RALLY_FINISHES.map((finish, index) => {
    const card = el("div", "rally-finish-color"); card.style.setProperty("--racer-color", finish.color);
    const label = el("label", "rally-field"), input = el("input"); input.type = "text"; input.maxLength = 32;
    input.value = finishNames[index]; input.placeholder = seats[index].input.value; input.setAttribute("aria-label", `${finish.name} finish name`);
    const title = el("span", "rally-finish-label"); title.append(el("i", "rally-mini-bubble", String(index + 1)), el("strong", "", finish.name));
    label.append(title, input); card.append(label);
    input.addEventListener("input", () => { finishNames[index] = input.value; saveSetup(); });
    if (ENABLE_FINISH_PREVIEWS) {
      const previewButton = button(`Preview ${index + 1}`); previewButton.setAttribute("aria-label", `Preview ${finish.name} finish clip`);
      previewButton.addEventListener("click", () => finishPlayer.show(index, { preview: true })); card.append(previewButton);
    }
    find(".rally-finish-names").append(card); return input;
  });
  find(".rally-finish-cheats").hidden = !ENABLE_FINISH_PREVIEWS;
  finishPlayer = createRallyFinishPlayer(wrapper, {
    getName: finishName,
    setName(index, value) { finishNames[index] = value.slice(0, 32); finishInputs[index].value = finishNames[index]; saveSetup(); },
    getSound: () => sound,
    setSound(enabled) { sound = enabled; saveSetup(); render(); },
    onOpen() { clock.pause(); },
    onClose() { if (!paused) clock.resume(); if (!disposed) render(); },
  });
  const previewShortcut = event => {
    if (!ENABLE_FINISH_PREVIEWS || event.repeat || event.altKey || event.ctrlKey || event.metaKey || !/^[1-4]$/.test(event.key)) return;
    if (event.target.isContentEditable || event.target.closest?.("input, textarea, select")) return;
    event.preventDefault(); finishPlayer.show(Number(event.key) - 1, { preview: true });
  };
  document.addEventListener("keydown", previewShortcut);

  function saveSetup() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ count: Number(count.select.value), course: course.select.value, sound, finishNames, players: seats.map(seat => ({ name: seat.input.value, kind: seat.kind.value, difficulty: seat.difficulty.value })) })); } catch { /* Storage is optional. */ }
  }
  function syncSetup() {
    seats.forEach((seat, index) => { seat.row.hidden = index >= Number(count.select.value); seat.sync(); });
    courseNote.textContent = rallyCourse(course.select.value).note;
    finishInputs.forEach((input, index) => { input.placeholder = seats[index].input.value; });
    if (!live) { state = createRally({ players: readPlayers(), course: course.select.value, firstPlayer }); render(); }
    saveSetup();
  }
  function preset(kind) {
    count.select.value = "2"; seats[0].kind.value = "human"; seats[1].kind.value = kind;
    syncSetup();
  }
  cpuPreset.addEventListener("click", () => preset("computer")); localPreset.addEventListener("click", () => preset("human"));
  [count.select, course.select, ...seats.flatMap(seat => [seat.input, seat.kind, seat.difficulty])].forEach(node => node.addEventListener("change", syncSetup));

  function playSound(kind) {
    if (!sound || disposed) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume().catch(() => {});
      const notes = kind === "win" ? [523, 659, 784, 1047] : kind === "pop" ? [230, 90] : kind === "roll" ? [350, 500, 700] : [600, 850];
      notes.forEach((frequency, i) => {
        const at = audio.currentTime + i * 0.075, oscillator = audio.createOscillator(), gain = audio.createGain();
        oscillator.type = "sine"; oscillator.frequency.setValueAtTime(frequency, at); oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.6, at + 0.16);
        gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(0.045, at + 0.008); gain.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
        oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(at); oscillator.stop(at + 0.2);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* Gameplay works without audio. */ }
  }
  soundButton.addEventListener("click", () => { sound = !sound; saveSetup(); render(); });
  function showMoveDetails(next) {
    const list = find(".rally-move-details"), details = next && rallyMoveDetails(next);
    list.hidden = !details;
    list.replaceChildren(...(details?.steps || []).map(step => el("li", "", step)));
  }
  function clearPreview() {
    preview = null;
    find(".rally-preview-note").textContent = moving ? "Your move is resolving. Follow each step below." : state.phase === "choose" ? "Cards include tile effects. Hover or focus a move for a breakdown. White ring = final tile." : state.phase === "resolved" ? "Move complete. Here is what happened:" : state.phase === "finished" ? "Race complete! Start a rematch from the winner's podium." : "Roll first, then choose how to use it.";
    showMoveDetails(state.phase === "resolved" || state.phase === "finished" ? state : null);
  }
  function describeMove(next) {
    const details = rallyMoveDetails(next);
    return `${details.summary} ${details.steps.join(" ")}`;
  }
  function startRace(rematch = false) {
    clock.cancel(); clock.resume(); paused = false; rolling = false; moving = false; preview = null; history = []; renderer.reset();
    if (rematch || live) firstPlayer = (firstPlayer + 1) % Number(count.select.value);
    state = createRally({ players: readPlayers(), course: course.select.value, firstPlayer });
    computers = state.players.map(player => createComputerOpponent({ difficulty: player.difficulty }));
    live = true; setup.open = false; saveSetup(); render();
    playSound("move"); scheduleComputer();
  }
  startButton.addEventListener("click", () => startRace()); rematchButton.addEventListener("click", () => startRace(true));
  function scheduleComputer() {
    if (!live || state.winner !== null || state.players[state.active].kind !== "computer") return;
    const computer = computers[state.active];
    if (state.phase === "roll") clock.schedule(doRoll, computer.thinkingDelay());
    else if (state.phase === "choose") clock.schedule(() => {
      const action = computer.choose(rallyActions(state), action => scoreRallyAction(state, action));
      if (action) takeAction(action.id);
    }, computer.thinkingDelay());
  }
  function doRoll() {
    if (!live || paused || rolling || state.phase !== "roll") return;
    rolling = true; clearPreview(); render(); playSound("roll");
    clock.schedule(() => { state = rollRally(state); rolling = false; render(); scheduleComputer(); }, 500);
  }
  function takeAction(actionId) {
    if (paused || moving || state.phase !== "choose") return;
    const before = state, next = resolveRallyAction(state, actionId);
    if (next === state) return;
    state = next; moving = true; preview = null;
    const duration = renderer.animate(before, next); render();
    playSound(next.last.events.some(event => event.type === "pop") ? "pop" : "move");
    clock.schedule(() => {
      moving = false; history.unshift(describeMove(state)); history = history.slice(0, 20);
      if (state.winner !== null) { renderer.celebrate(state.winner); finishPlayer.show(state.winner); }
      render();
      if (state.winner === null && state.players[state.active].kind === "computer") clock.schedule(nextTurn, 900);
    }, duration + 60);
  }
  function nextTurn() {
    if (paused || moving || state.phase !== "resolved") return;
    state = advanceRally(state); clearPreview(); render(); scheduleComputer();
  }
  rollButton.addEventListener("click", doRoll); nextButton.addEventListener("click", nextTurn);
  pauseButton.addEventListener("click", () => {
    paused = !paused; if (paused) clock.pause(); else clock.resume(); render();
  });
  function render() {
    const player = state.players[state.active];
    scoreboard.replaceChildren(...state.players.map((racer, index) => {
      const card = el("div", "rally-racer-card"); card.style.setProperty("--racer-color", racer.color);
      card.classList.toggle("is-active", live && index === state.active);
      const line = el("div", "rally-racer-name"); line.append(el("span", "rally-mini-bubble", String(index + 1)), el("strong", "", racer.name));
      const identity = el("small", "", racer.kind === "computer" ? `${computers[index]?.level.label || OPPONENT_LEVELS.find(level => level.id === racer.difficulty).label} computer` : "Human");
      const position = el("span", "rally-position", `Tile ${racer.position} / 31`);
      const meter = el("div", "rally-energy"); meter.setAttribute("aria-label", `${racer.energy} of 6 energy`);
      for (let i = 0; i < MAX_ENERGY; i++) { const pip = el("i"); pip.classList.toggle("filled", i < racer.energy); meter.append(pip); }
      const resources = el("span", "rally-resources", `${racer.energy}/6 energy | ${racer.shield ? "Shield on" : "No shield"} | Save ${racer.checkpoint}`);
      card.append(line, identity, position, meter, resources); return card;
    }));
    find(".rally-course-name").textContent = rallyCourse(state.course).name;
    const stormStrength = state.course === "tempest" ? 3 : 2;
    find(".rally-storm-symbol").textContent = `-${stormStrength}`;
    find(".rally-storm-title").textContent = `Storm: back ${stormStrength} spaces${state.course === "tempest" ? " on Tempest Run" : ""}`;
    find(".rally-round").textContent = live ? `Turn ${state.turn}` : "Choose your racers";
    find(".rally-turn-label").textContent = state.winner !== null && !moving ? "RALLY CHAMPION" : live ? `RACER ${player.id + 1} / ${player.kind === "human" ? "HUMAN" : computers[player.id]?.level.label.toUpperCase() + " COMPUTER"}` : "READY TO RALLY";
    let message = "Choose your racers above, then start the race.";
    if (live) {
      if (paused) message = "Race paused. Resume when everyone is ready.";
      else if (moving) message = `${player.name} is moving...`;
      else if (state.winner !== null) message = `${player.name} wins! First to the finish in ${state.turn} turns.`;
      else if (rolling) message = `${player.name} is rolling...`;
      else if (state.phase === "resolved") message = rallyMoveDetails(state).summary;
      else if (player.kind === "computer") message = `${player.name} is ${state.phase === "roll" ? "getting ready to roll" : "choosing a move"}...`;
      else message = state.phase === "roll" ? `${player.name}, your turn. Roll the bubble!` : `${player.name} rolled ${state.roll}. Choose your move.`;
    }
    status.textContent = message;
    die.textContent = rolling ? "..." : state.roll ?? "?"; die.setAttribute("aria-label", state.roll ? `Rolled ${state.roll}` : "No roll yet");
    die.classList.toggle("is-rolling", rolling && !paused); die.style.setProperty("--racer-color", player.color);
    rollButton.hidden = !live || state.phase !== "roll" || player.kind !== "human";
    rollButton.disabled = paused || rolling;
    nextButton.hidden = !live || state.phase !== "resolved" || player.kind !== "human" || moving;
    nextButton.textContent = `Next: ${state.players[(state.active + 1) % state.players.length].name}`;
    nextButton.disabled = paused;
    pauseButton.hidden = !live || (state.winner !== null && !moving); pauseButton.textContent = paused ? "Resume" : "Pause"; pauseButton.setAttribute("aria-pressed", String(paused));
    soundButton.textContent = sound ? "Sound on" : "Sound off"; soundButton.setAttribute("aria-pressed", String(sound));
    rematchButton.hidden = state.winner === null || moving;
    const finished = live && state.winner !== null && !moving;
    find(".rally-finale").hidden = !finished;
    if (finished) {
      find(".rally-winner-name").textContent = `${finishName(state.winner)} wins!`;
      find(".rally-winner-name").classList.toggle("is-long", finishName(state.winner).length > 12);
      find(".rally-winner-detail").textContent = `${rallyCourse(state.course).name} / ${state.turn} turns`;
    }
    startButton.textContent = live ? "Start new race" : "Start race";
    const legal = rallyActions(state);
    actionButtons.forEach((node, index) => {
      const action = RALLY_ACTIONS[index];
      node.disabled = !live || paused || moving || player.kind !== "human" || !legal.includes(action);
      const result = node.querySelector(".rally-action-result");
      const effects = node.querySelector(".rally-action-effects"); effects.textContent = "";
      if (state.phase === "choose" && legal.includes(action)) {
        const next = resolveRallyAction(state, action.id);
        const details = rallyMoveDetails(next);
        result.textContent = details.destination; effects.textContent = details.result;
      } else result.textContent = player.energy < action.cost ? "Need 2 energy" : action.id === "shield" && player.shield ? "Shield already active" : "Roll first";
    });
    const log = find(".rally-history ol"); log.replaceChildren(...history.map(entry => el("li", "", entry)));
    if (!history.length) log.append(el("li", "", "Your moves will appear here."));
    if (!preview) clearPreview();
    wrapper.classList.toggle("is-paused", paused);
  }
  syncSetup();
  return () => { disposed = true; document.removeEventListener("keydown", previewShortcut); finishPlayer.dispose(); clock.dispose(); renderer.dispose(); audio?.close().catch(() => {}); wrapper.remove(); };
}
