import { MEMORY_LAYOUTS, MEMORY_SETS, MEMORY_BACKS, MEMORY_ITEMS, memorySet, memoryLayout, memoryItemUnlocked, normalizeMemorySettings, readMemorySettings, writeMemorySettings, memoryRewardTotal } from "./memory-config.js";
import { memoryCoinGuide, memoryCoinSummary, memoryCoinBreakdown } from "./memory-coin-guide.js";
import { createMemoryGame, flipMemoryCard, resolveMemoryPair, finishMemoryClose, legalMemoryCards, memoryWinners, memoryProgress } from "./memory-engine.js";
import { memoryPicture, memoryMedallion, memoryFan } from "./memory-art.js";
import { createMemoryAudio } from "./memory-audio.js";
import { OPPONENT_LEVELS, createOpponentScheduler } from "./arcade/opponents.js";
import { createMemoryOpponent } from "./arcade/memory-opponent.js";
import { getArcadeWallet } from "./arcade/wallet.js";
import { createRewardSession, mountGameWallet } from "./arcade/game-services.js";

const FLIP_MS = 440, MATCH_MS = 950, MISS_MS = 1700;
const options = (list, value, label) => list.map(entry => `<option value="${entry[value]}">${entry[label]}</option>`).join("");
const elapsedLabel = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

export function createMemoryLoop(root) {
  const wallet = getArcadeWallet(), audio = createMemoryAudio(), scheduler = createOpponentScheduler();
  let saved = readMemorySettings(wallet.getState().owned), game, computer, reward, cards = [], scoreCards = [];
  let disposed = false, paused = false, elapsed = 0, lastTick = performance.now(), round = 0;
  const wrapper = document.createElement("section"); wrapper.className = "memory-game ml-game";
  wrapper.innerHTML = `<div class="ml-intro"><div><p class="ml-eyebrow">A COLLECTION OF LITTLE WONDERS</p><h3>Look closely. Remember beautifully.</h3><p>Find the pairs. Follow your intuition. Make your next match.</p></div><div class="ml-intro-art">${memoryFan()}</div></div>
    <div class="ml-layout">
      <aside class="ml-sidebar" id="memory-setup">
        <form class="ml-setup"><div class="ml-section-title"><span>01</span><h4>Set the table</h4></div>
          <label>Play mode<select name="mode" aria-label="Play mode"><option value="solo">Solo / quiet practice</option><option value="computer">You vs computer</option><option value="local">Friends / same device</option></select></label>
          <div class="ml-setup-row"><label>Card arrangement<select name="tiles" aria-label="Card arrangement">${options(MEMORY_LAYOUTS, "tiles", "label")}</select></label>
          <label class="ml-cpu-setting">Computer level<select name="difficulty" aria-label="Computer difficulty">${options(OPPONENT_LEVELS, "id", "label")}</select></label>
          <label class="ml-local-setting">Players<select name="players" aria-label="Number of players"><option value="2">2 players</option><option value="3">3 players</option><option value="4">4 players</option></select></label></div>
          <div class="ml-names">${Array.from({ length: 4 }, (_, i) => `<label data-name="${i}">Player ${i + 1} name<input name="name${i}" aria-label="Player ${i + 1} name" maxlength="20" autocomplete="off"></label>`).join("")}</div>
          <p class="ml-opponent-note"></p><p class="ml-next-coins"></p><button class="ml-primary ml-deal" type="submit">Deal new game <span aria-hidden="true">&rarr;</span></button>
          <p class="ml-setup-note">A fresh shuffle. Your first flip starts the clock.</p>
          <div class="ml-section-title"><span>02</span><h4>Your collection</h4></div>
          <div class="ml-collection-preview"></div>
          <label>Picture set<select name="set" aria-label="Picture set"></select></label>
          <label>Card back<select name="back" aria-label="Card back"></select></label>
          <a class="ml-shop-link" href="#store/memory">Discover card sets in the shop <span aria-hidden="true">&nearr;</span></a>
        </form>
        <details class="ml-rules" open><summary>How to play</summary><ol><li>Turn over any two hidden cards.</li><li>Same picture? Keep the pair and play again.</li><li>Different pictures? Both turn back after a short look. In a duel, the next player takes over.</li><li>Clear the table. The player with the most pairs wins; equal scores share the win.</li></ol><p>Take your time. Speed never changes your score.</p></details>
      </aside>
      <div class="ml-play-area">
        <div class="ml-table-top"><div><p class="ml-eyebrow ml-round-label"></p><h4 class="ml-table-title"></h4></div><div class="ml-table-actions"><button type="button" class="ml-sound" aria-pressed="true">Sound on</button><button type="button" class="ml-pause">Pause</button></div></div>
        <a href="#memory-setup" class="ml-mobile-setup ml-setup-jump">Change mode, players, or card collection &darr;</a>
        <div class="ml-scoreboard" aria-label="Pair scores"></div>
        <div class="ml-turn-status" role="status" aria-live="polite"><span class="ml-turn-dot" aria-hidden="true"></span><span class="ml-status-text"></span></div>
        <div class="ml-table"><div class="memory-grid ml-grid" role="group" aria-label="Memory cards"></div><div class="ml-pause-cover" hidden><span class="ml-eyebrow">TAKE A BREATHER</span><h4>Table paused</h4><p>Your cards and turn will be here.</p><button type="button" class="ml-resume ml-primary">Resume game</button></div></div>
        <p class="ml-computer-read" role="status" hidden></p>
        <div class="ml-stats"><span><strong class="ml-pairs">0 / 8</strong> pairs found</span><span><strong class="ml-moves">0</strong> attempts</span><span><strong class="ml-time">0:00</strong> time</span><span><strong class="ml-coins">0</strong> coins this game</span></div>
        <p class="ml-live-coin-breakdown"></p>
        <section class="ml-results" hidden><p class="ml-eyebrow">THE TABLE IS CLEAR</p><h4 tabindex="-1"></h4><p class="ml-result-summary"></p><p class="ml-result-coins"></p><ol class="ml-standings"></ol><button type="button" class="ml-replay ml-primary">Play again</button><a href="#store/memory">Spend your coins in the shop &rarr;</a></section>
        <details class="ml-coin-guide" open><summary>How you earn coins</summary><div></div></details>
        <p class="ml-table-foot">Tap or click to flip. Tab + Enter works too. <a href="#memory-setup" class="ml-setup-jump">Game setup &uarr;</a></p>
      </div>
    </div>`;
  root.append(wrapper);
  const form = wrapper.querySelector("form"), control = name => form.elements.namedItem(name);
  const grid = wrapper.querySelector(".ml-grid"), status = wrapper.querySelector(".ml-status-text"), result = wrapper.querySelector(".ml-results");
  const unmountWallet = mountGameWallet(wrapper, "memory");
  const coinBanner = wrapper.querySelector(".arcade-game-wallet > span"), computerRead = wrapper.querySelector(".ml-computer-read");
  coinBanner.setAttribute("aria-live", "polite");
  let computerPicks = [];
  for (const name of ["mode", "tiles", "difficulty", "players"]) control(name).value = String(saved[name]);
  saved.names.forEach((name, i) => { control(`name${i}`).value = name; });

  function fillCollection() {
    const owned = wallet.getState().owned;
    for (const [setting, entries] of [["set", MEMORY_SETS], ["back", MEMORY_BACKS]]) {
      const previous = control(setting).value || saved[setting];
      control(setting).innerHTML = entries.map(entry => {
        const locked = !memoryItemUnlocked(setting, entry.id, owned), item = MEMORY_ITEMS.find(item => item.setting === setting && item.value === entry.id);
        return `<option value="${entry.id}" ${locked ? "disabled" : ""}>${entry.name}${locked ? ` / ${item.cost} coins in shop` : ""}</option>`;
      }).join("");
      control(setting).value = memoryItemUnlocked(setting, previous, owned) ? previous : setting === "set" ? "wonders" : "atlas";
    }
  }
  function choices() {
    return normalizeMemorySettings({ ...saved, mode: control("mode").value, tiles: Number(control("tiles").value), difficulty: control("difficulty").value,
      players: Number(control("players").value), set: control("set").value, back: control("back").value,
      names: Array.from({ length: 4 }, (_, i) => control(`name${i}`).value) }, wallet.getState().owned);
  }
  function setupView(changed = false) {
    const draft = choices();
    wrapper.querySelector(".ml-cpu-setting").hidden = draft.mode !== "computer";
    wrapper.querySelector(".ml-local-setting").hidden = draft.mode !== "local";
    wrapper.querySelectorAll("[data-name]").forEach(label => { label.hidden = Number(label.dataset.name) >= (draft.mode === "local" ? draft.players : 1); });
    const notes = { easy: "A relaxed rival with a short memory.", medium: "Remembers more cards, but still gets distracted.", hard: "A sharp observer who occasionally misses a pair.", expert: "A very strong memory, with the occasional mistake." };
    wrapper.querySelector(".ml-opponent-note").textContent = draft.mode === "computer" ? `${notes[draft.difficulty]} It learns from both players' flips. When guessing, every eligible card has the same chance. You go first.` : draft.mode === "local" ? "Pass the device on a miss. Everyone sees the same cards." : "Play at your own pace. Every pair is a small victory.";
    wrapper.querySelector(".ml-collection-preview").innerHTML = memoryFan(draft.set, draft.back);
    wrapper.querySelector(".ml-next-coins").textContent = `Next deal: ${memoryCoinSummary(draft)}`;
    updateCoinBanner(draft);
    if (changed) {
      saved = draft; writeMemorySettings(saved);
      wrapper.querySelector(".ml-setup-note").textContent = "New choices apply when you deal a new game.";
    }
  }
  function updateCoinBanner(draft) {
    const summary = memoryCoinSummary(draft);
    const pending = game && summary !== memoryCoinSummary(game.settings);
    coinBanner.textContent = pending ? `Next deal: ${summary} Choose Deal new game to apply.` : summary;
  }
  function showComputerChoice(first) {
    const decision = computer.lastDecision;
    if (!first) computerPicks = [];
    const reason = decision.kind === "guess" ? `blind pick (${decision.options} equally likely choices)`
      : decision.kind === "only-card" ? "only card left"
      : decision.kind === "remembered-pair" ? "remembered pair" : "remembered partner";
    computerPicks.push(`${first ? "Second card" : "First card"}: ${reason}.`);
    computerRead.textContent = `Computer's picks - ${computerPicks.join(" ")}`;
    computerRead.hidden = false;
  }
  function playerName(index) {
    return game.settings.mode === "computer" && index === 1 ? "Computer" : game.settings.names[index] || `Player ${index + 1}`;
  }
  function cpuTurn() { return game.settings.mode === "computer" && game.turn === 1; }
  function say(message) { status.textContent = message; }
  function turnMessage() {
    if (cpuTurn()) return "Computer is thinking. Watch the cards it reveals.";
    return game.settings.mode === "solo" ? "Choose a card. Find its matching picture." : `${playerName(game.turn)}'s turn. Choose two cards.`;
  }
  function effect(kind) { if (saved.sound && !paused) audio.play(kind); }
  function drawCards() {
    const legal = new Set(legalMemoryCards(game));
    cards.forEach((button, index) => {
      const owner = game.owners[index], matched = owner !== null, visible = matched || game.flipped.includes(index), card = game.deck[index];
      button.classList.toggle("is-flipped", visible); button.classList.toggle("is-matched", matched);
      button.dataset.owner = matched ? String(owner) : "";
      button.disabled = paused || cpuTurn() || !legal.has(index);
      button.setAttribute("aria-label", matched ? `Card ${index + 1}: ${card.label}, matched by ${playerName(owner)}` : visible ? `Card ${index + 1}: ${card.label}` : `Card ${index + 1}, face down`);
      button.querySelector(".ml-claim").textContent = matched ? game.scores.length === 1 ? "PAIRED" : `P${owner + 1}` : "";
    });
  }
  function drawStats() {
    wrapper.querySelector(".ml-pairs").textContent = `${game.matches} / ${game.deck.length / 2}`;
    wrapper.querySelector(".ml-moves").textContent = String(game.moves);
    wrapper.querySelector(".ml-time").textContent = elapsedLabel(elapsed);
    wrapper.querySelector(".ml-coins").textContent = String(memoryRewardTotal(memoryProgress(game)));
    wrapper.querySelector(".ml-live-coin-breakdown").textContent = memoryCoinBreakdown(memoryProgress(game));
    wrapper.querySelector(".ml-pause").disabled = !game.started || game.phase === "complete";
    scoreCards.forEach((element, i) => {
      element.classList.toggle("is-active", i === game.turn && game.phase !== "complete");
      element.querySelector("strong").textContent = String(game.scores[i]);
      element.querySelector("small").textContent = game.phase === "complete" ? "FINAL PAIRS" : i === game.turn ? "PLAYING" : "PAIRS";
    });
    wrapper.querySelector(".ml-turn-status").dataset.player = String(game.turn);
  }
  function scheduleComputer() {
    if (!cpuTurn() || game.phase !== "choose") return;
    scheduler.schedule(() => {
      if (disposed || !cpuTurn()) return;
      const index = game.flipped[0], first = index === undefined ? null : { index, id: game.deck[index].id };
      const choice = computer.choose(legalMemoryCards(game), first);
      if (choice !== null) { showComputerChoice(first); flip(choice, true); }
    }, computer.thinkingDelay() + (game.flipped.length ? 250 : 0));
  }
  function finishRound() {
    const winners = memoryWinners(game), names = winners.map(playerName);
    result.hidden = false;
    result.querySelector("h4").textContent = game.settings.mode === "solo" ? "Every wonder, remembered." : winners.length > 1 ? `${names.join(" & ")} share the win!` : `${names[0]} wins!`;
    result.querySelector(".ml-result-summary").textContent = `${game.deck.length / 2} pairs found in ${game.moves} attempts and ${elapsedLabel(elapsed)}.`;
    result.querySelector(".ml-result-coins").textContent = memoryCoinBreakdown(memoryProgress(game));
    const standings = result.querySelector(".ml-standings"); standings.replaceChildren();
    game.scores.map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score).forEach(({ score, index }) => {
      const entry = document.createElement("li"), name = document.createElement("span"), points = document.createElement("strong");
      name.textContent = `${1 + game.scores.filter(value => value > score).length}. ${playerName(index)}`; points.textContent = `${score} pairs`;
      entry.dataset.player = String(index); entry.append(name, points); standings.append(entry);
    });
    say(result.querySelector("h4").textContent);
    effect(game.settings.mode === "computer" && !winners.includes(0) ? "match" : "win");
    result.querySelector("h4").focus({ preventScroll: true });
  }
  function settle() {
    if (disposed) return;
    const outcome = resolveMemoryPair(game); if (!outcome) return;
    if (outcome.matched) {
      computer.remove(outcome.indices); effect("match");
      const currentRound = round;
      reward.award(memoryProgress(game)).catch(() => { if (!disposed && currentRound === round) say("Your match counts, but the browser could not save its coins."); });
      say(`${playerName(outcome.player)} found ${outcome.label}! ${outcome.complete ? "" : "A match earns another turn."}`);
    } else {
      effect("miss"); say(game.settings.mode === "solo" ? "Different pictures. Remember their places and try again." : `Different pictures. Passing to ${playerName(game.turn)}.`);
    }
    drawCards(); drawStats();
    if (outcome.complete) { finishRound(); return; }
    if (!outcome.matched) scheduler.schedule(() => { finishMemoryClose(game); drawCards(); say(turnMessage()); scheduleComputer(); }, FLIP_MS + 80);
    else scheduleComputer();
  }
  function flip(index, isComputer = false) {
    if (disposed || paused || cpuTurn() !== isComputer) return;
    if (!isComputer && saved.sound) audio.unlock();
    const shown = flipMemoryCard(game, index); if (!shown) return;
    if (!isComputer) computerRead.hidden = true;
    computer.observe(shown); effect("flip"); drawCards(); drawStats();
    if (game.phase === "reveal") {
      const matched = game.deck[game.flipped[0]].id === game.deck[game.flipped[1]].id;
      say(matched ? "A pair!" : "Take a look. These two will turn back together.");
      scheduler.schedule(settle, matched ? MATCH_MS : MISS_MS);
    } else { say(`${playerName(game.turn)} revealed ${shown.label}. Choose its partner.`); scheduleComputer(); }
  }
  function pause(value) {
    if (!game.started || game.phase === "complete") return;
    paused = value; wrapper.classList.toggle("is-paused", paused);
    wrapper.querySelector(".ml-pause-cover").hidden = !paused;
    wrapper.querySelector(".ml-pause").textContent = paused ? "Resume" : "Pause";
    if (paused) { scheduler.pause(); audio.silence(); say("Paused. Resume when you are ready."); }
    else { scheduler.resume(); lastTick = performance.now(); say(game.phase === "reveal" ? "Finishing this pair." : turnMessage()); }
    drawCards();
  }
  function deal() {
    scheduler.cancel(); scheduler.resume(); audio.silence(); paused = false; round++; elapsed = 0; lastTick = performance.now();
    saved = choices(); writeMemorySettings(saved); game = createMemoryGame(saved); computer = createMemoryOpponent({ difficulty: saved.difficulty }); reward = createRewardSession("memory", wallet);
    result.hidden = true; wrapper.classList.remove("is-paused"); wrapper.querySelector(".ml-pause-cover").hidden = true; wrapper.querySelector(".ml-pause").textContent = "Pause";
    wrapper.querySelector(".ml-round-label").textContent = saved.mode === "solo" ? "SOLO / AT YOUR OWN PACE" : saved.mode === "computer" ? `DUEL / ${saved.difficulty.toUpperCase()} COMPUTER` : `FRIENDS / ${saved.players} PLAYERS`;
    wrapper.querySelector(".ml-table-title").textContent = memorySet(saved.set).name;
    wrapper.querySelector(".ml-setup-note").textContent = "A fresh shuffle. Your first flip starts the clock.";
    updateCoinBanner(game.settings); computerRead.hidden = true; computerPicks = [];
    wrapper.querySelector(".ml-coin-guide > div").innerHTML = memoryCoinGuide(game.settings);
    const scores = wrapper.querySelector(".ml-scoreboard"); scores.replaceChildren(); scoreCards = game.scores.map((score, index) => {
      const card = document.createElement("div"); card.className = "ml-player"; card.dataset.player = String(index);
      const name = document.createElement("span"); name.textContent = playerName(index);
      const number = document.createElement("strong"), label = document.createElement("small"); card.append(name, number, label); scores.append(card); return card;
    });
    grid.replaceChildren(); grid.dataset.tiles = String(saved.tiles); grid.style.setProperty("--memory-columns", memoryLayout(saved.tiles).columns);
    cards = game.deck.map((card, index) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "memory-card ml-card"; button.dataset.index = String(index);
      button.innerHTML = `<span class="ml-card-inner"><span class="ml-card-face ml-card-cover ml-pattern" data-back="${saved.back}" aria-hidden="true"><span class="ml-card-number">${String(index + 1).padStart(2, "0")}</span>${memoryMedallion()}<span class="ml-card-brand">MEMORY LOOP</span></span><span class="ml-card-face ml-card-picture" aria-hidden="true">${memoryPicture(saved.set, card.index)}<span class="ml-picture-label">${card.label}</span><span class="ml-claim"></span></span></span>`;
      button.addEventListener("click", () => flip(index)); grid.append(button); return button;
    });
    say(turnMessage()); drawCards(); drawStats();
  }

  fillCollection(); setupView(); deal();
  const unsubscribe = wallet.subscribe(fillCollection);
  form.addEventListener("submit", event => { event.preventDefault(); if (saved.sound) audio.unlock(); deal(); });
  form.addEventListener("change", () => setupView(true));
  wrapper.querySelector(".ml-replay").addEventListener("click", () => { deal(); grid.scrollIntoView({ block: "center", behavior: "smooth" }); });
  wrapper.querySelector(".ml-pause").addEventListener("click", () => pause(!paused));
  wrapper.querySelector(".ml-resume").addEventListener("click", () => pause(false));
  wrapper.querySelectorAll(".ml-setup-jump").forEach(link => link.addEventListener("click", event => { event.preventDefault(); form.scrollIntoView({ block: "start", behavior: "smooth" }); control("mode").focus({ preventScroll: true }); }));
  const sound = wrapper.querySelector(".ml-sound");
  function soundLabel() { sound.textContent = saved.sound ? "Sound on" : "Sound off"; sound.setAttribute("aria-pressed", String(saved.sound)); }
  soundLabel(); sound.addEventListener("click", () => { saved.sound = !saved.sound; writeMemorySettings(saved); soundLabel(); if (saved.sound) { audio.unlock(); effect("flip"); } else audio.silence(); });
  function onVisibility() { lastTick = performance.now(); if (document.hidden) pause(true); }
  document.addEventListener("visibilitychange", onVisibility);
  const timer = setInterval(() => {
    const now = performance.now(); if (game.started && game.phase !== "complete" && !paused && !document.hidden) elapsed += now - lastTick;
    lastTick = now; wrapper.querySelector(".ml-time").textContent = elapsedLabel(elapsed);
  }, 250);
  return () => { disposed = true; scheduler.dispose(); clearInterval(timer); audio.dispose(); document.removeEventListener("visibilitychange", onVisibility); unsubscribe(); unmountWallet(); wrapper.remove(); };
}
