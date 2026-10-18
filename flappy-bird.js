import { createFlappyModel, DIFFICULTIES, POINTS_PER_PIPE, readFlappyProgress, speedFor } from "./flappy-engine.js";
import { BIRDS, BIRD_DESIGNS, PIPES, BACKGROUNDS, HATS, EYEWEAR, NECKWEAR, TRAILS, COLOR_FIELDS, PALETTES, readFlappySettings } from "./flappy-appearance.js";
import { createFlappyRenderer, drawFlappyShopPreview } from "./flappy-renderer.js";
import { createFlappyAudio } from "./flappy-audio.js";
import { SHOP_ITEMS, COIN_MULTIPLIERS, flightReward, canEquip } from "./flappy-shop.js";
import { getArcadeWallet, flappyWalletView } from "./arcade/wallet.js";
import { createRewardSession, applyEquippedKit, mountGameWallet } from "./arcade/game-services.js";
import { createFrameLoop } from "./arcade/runtime.js";

const STORAGE_KEY = "cooper-flappy-bird-v1";
const coinIcon = '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#e6bb5d" stroke="#bd8c3f" stroke-width="1.4"/><circle cx="12" cy="12" r="7.3" fill="none" stroke="#fff0af"/><path d="m7 13 4-5 2 3 4-1-5 7z" fill="#fff1b5"/></svg>';
const options = choices => Object.entries(choices).map(([id, value]) => `<option value="${id}">${typeof value === "string" ? value : value.name}</option>`).join("");

export function createFlappyBird(root, { editorOnly = false, onAppearanceChange } = {}) {
  const deathTime = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.15 : 1.05;
  let saved = {};
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (value && typeof value === "object" && !Array.isArray(value)) saved = value; } catch { /* Use defaults when storage is unavailable. */ }
  const settings = applyEquippedKit("flappy", readFlappySettings(saved));
  const arcadeWallet = getArcadeWallet(), wallet = flappyWalletView(arcadeWallet.getState()), defaults = readFlappySettings();
  let rewardSession = createRewardSession("flappy");
  for (const item of SHOP_ITEMS) if (settings[item.setting] === item.value && !canEquip(wallet, item.setting, item.value)) settings[item.setting] = defaults[item.setting];
  const audio = createFlappyAudio(settings.sound);
  const progress = readFlappyProgress(saved), bests = progress.bests;
  const model = createFlappyModel(progress.difficulty);
  const wrapper = document.createElement("section");
  wrapper.className = "flappy-game";
  wrapper.dataset.editorOnly = String(editorOnly);
  wrapper.innerHTML = `
    <div class="flappy-heading"><div><p class="flappy-eyebrow">THE LITTLE SKY CLUB</p><h3 class="flappy-page-title">A little flap. A big adventure.</h3></div><nav class="flappy-page-nav" aria-label="Flappy Bird pages"><a href="#flappy" data-flappy-page-link="play">Play</a><a href="#flappy/customize" data-flappy-page-link="customize" class="flappy-customize-link">Customize</a><a href="#flappy/shop" data-flappy-page-link="shop" class="flappy-shop-link">${coinIcon}<span class="flappy-wallet">0</span> <span>Shop</span></a></nav></div>
    <div class="flappy-flight-settings">
      <label>Difficulty <span class="flappy-label-note">starts a new flight</span><select aria-label="Flight difficulty">${options(DIFFICULTIES)}</select></label>
      <label>View mode<select aria-label="Flappy view mode"><option value="side">Classic side view</option><option value="first-person">First-person 3D</option><option value="first-person-webgl">Enhanced first-person 3D</option></select></label>
      <p class="flappy-difficulty-note"></p>
    </div>
    <div class="flappy-hud" aria-label="Flight statistics">
      <div><span>Pipes cleared</span><strong class="flappy-pipes">0</strong><small class="flappy-points-total"><span class="flappy-score">0</span> points</small></div><div><span>Best pipes on <span class="flappy-best-level">Hard</span></span><strong class="flappy-best">0</strong><small class="flappy-points-total"><span class="flappy-best-score">0</span> points</small></div><div><span>Distance</span><strong><span class="flappy-distance">0</span><small> m</small></strong></div><div><span>Altitude</span><strong><span class="flappy-altitude">3.7</span><small> m</small></strong></div>
    </div>
    <div class="flappy-scene" tabindex="0" role="group" aria-label="Flappy Bird flight controls" aria-describedby="flappy-controls-help">
      <canvas class="flappy-canvas" role="img" aria-label="Side-view flight through a meadow with green pipes"></canvas>
      <span class="flappy-view-badge">SIDE VIEW</span><span class="flappy-speed-badge">2.8 m/s</span>
      <div class="flappy-overlay"><div class="flappy-overlay-card"><span class="flappy-overlay-symbol" aria-hidden="true">&#10022;</span><h4>Ready to spread your wings?</h4><p>Tap, click, or press Space to flap.<br>Fly through the gaps. Keep off the ground.</p><div class="flappy-reward" hidden><div class="flappy-award-coin" aria-hidden="true">${coinIcon}</div><div><strong class="flappy-award-name"></strong><span class="flappy-award-coins"></span><small class="flappy-award-detail"></small></div></div><div class="flappy-overlay-actions"><button type="button" class="flappy-play">Let's fly</button><button type="button" class="flappy-shop-after" hidden>Visit shop</button></div></div></div>
    </div>
    <div class="flappy-actions"><button type="button" class="flappy-flap">Flap / Start</button><button type="button" class="flappy-pause" disabled>Pause</button><button type="button" class="flappy-restart">Restart</button><label class="flappy-guide-label"><input type="checkbox" class="flappy-guide" checked> Gap guide</label><label class="flappy-guide-label"><input type="checkbox" class="flappy-sound" checked> Sound FX</label></div>
    <p class="flappy-status" role="status" aria-live="polite">Your adventure is ready. One tap starts your flight.</p>
    <section class="flappy-instructions" aria-labelledby="flappy-how-title"><h4 id="flappy-how-title">How to fly</h4><ol><li><strong>Flap to climb.</strong> Tap the scene, click Flap, or press Space, W, or Up. Gravity pulls you down between flaps.</li><li><strong>Find the opening.</strong> Each pipe scores 1 point on Easy, 3 on Medium, 6 on Hard, or 10 on Expert. A pipe or the ground ends your flight. Hard starts by default. The pace increases as you clear more pipes.</li><li><strong>Try a new perspective.</strong> First-person 3D puts you behind your bird's beak. The dotted circle marks the next gap; line it up with the small center ring as you approach.</li></ol><p id="flappy-controls-help"><kbd>P</kbd> pauses or resumes. <kbd>R</kbd> restarts. Difficulty starts a new flight; use Play, Customize, and Shop above. Shop and customization pause your flight; Play brings it back. Every character has the same flight abilities.</p></section>
    <section class="flappy-studio" aria-labelledby="flappy-studio-title"><div class="flappy-studio-heading"><p class="flappy-eyebrow">MAKE IT YOURS</p><h4 id="flappy-studio-title">Your flight studio</h4><p>Mix your favorite creature, world, and accessories. Your choices save automatically.</p></div>
      <div class="flappy-studio-grid">
        <figure class="flappy-preview"><canvas class="flappy-bird-preview" width="360" height="280" role="img" aria-label="Your customized bird"></canvas><figcaption><strong class="flappy-bird-name">Sunny sparrow</strong><span>Live character preview</span></figcaption></figure>
        <fieldset><legend>Bird &amp; world</legend><label>Bird<select aria-label="Bird character" data-setting="bird">${options(BIRDS)}</select></label><label>Pipe style<select aria-label="Pipe style" data-setting="pipeStyle">${options(PIPES)}</select></label><label>Background<select aria-label="Flight background" data-setting="background">${options(BACKGROUNDS)}</select></label></fieldset>
        <fieldset><legend>Accessories</legend><label>Headwear<select aria-label="Bird headwear" data-setting="hat">${options(HATS)}</select></label><label>Eyewear<select aria-label="Bird eyewear" data-setting="eyewear">${options(EYEWEAR)}</select></label><label>Neckwear<select aria-label="Bird neckwear" data-setting="neckwear">${options(NECKWEAR)}</select></label><label>Flight trail<select aria-label="Flight trail" data-setting="trail">${options(TRAILS)}</select></label></fieldset>
      </div>
      <fieldset class="flappy-colors"><legend>Color customization</legend><p>Choose each color separately, or apply a full palette. Changing your bird or accessories keeps your colors.</p><div class="flappy-palettes">${Object.entries(PALETTES).map(([id, palette]) => `<button type="button" data-palette="${id}"><span class="flappy-palette-dots" aria-hidden="true"><i style="--swatch:${palette.body}"></i><i style="--swatch:${palette.wing}"></i><i style="--swatch:${palette.accessory}"></i></span>${palette.name}</button>`).join("")}</div><div class="flappy-color-grid">${Object.entries(COLOR_FIELDS).map(([id, label]) => `<label><span>${label}</span><span class="flappy-color-control"><input type="color" aria-label="${label} color" data-color="${id}" value="${settings.colors[id]}"><output data-color-output="${id}">${settings.colors[id]}</output></span></label>`).join("")}</div></fieldset>
    </section>
    <section class="flappy-shop" aria-labelledby="flappy-shop-title"><div class="flappy-shop-heading"><div><p class="flappy-eyebrow">EARN IT. WEAR IT. FLY IT.</p><h4 id="flappy-shop-title">The sky shop</h4><p>Spend flight coins on new looks. Purchases unlock permanently and equip right away.</p></div><div class="flappy-shop-balance">${coinIcon}<strong class="flappy-wallet">0</strong><span>coins to spend</span></div></div><details class="flappy-coin-guide"><summary>How do I earn coins?</summary><p>Each cleared pipe pair earns ${Object.entries(COIN_MULTIPLIERS).map(([id, coins]) => `<strong>${DIFFICULTIES[id].name}: ${coins} ${coins === 1 ? "coin" : "coins"}</strong>`).join(", ")}. Medal tiers recognize 5, 15, 30, and 60 cleared pipes; the coin rate applies once per pipe, with no extra coin bonuses. Coins are banked when the flight ends, including Restart or leaving the game. Zero pipes earns zero coins.</p></details><div class="flappy-shop-filters" aria-label="Shop categories"><button type="button" data-shop-filter="all" aria-pressed="true">Everything</button><button type="button" data-shop-filter="wearables" aria-pressed="false">Accessories</button><button type="button" data-shop-filter="worlds" aria-pressed="false">Worlds &amp; pipes</button><button type="button" data-shop-filter="birds" aria-pressed="false">Birds</button></div><p class="flappy-shop-status" role="status">Your starter collection is free. Fly to earn your first unlock.</p><div class="flappy-shop-grid">${SHOP_ITEMS.map(item => `<article class="flappy-shop-item" data-item="${item.id}" data-category="${item.category}"><canvas class="flappy-shop-preview" width="264" height="150" role="img" aria-label="${item.name} preview"></canvas><div class="flappy-shop-item-info"><h5>${item.name}</h5><p>${item.description}</p><div class="flappy-shop-item-action"><span class="flappy-shop-price">${coinIcon} ${item.cost}</span><button type="button" data-buy="${item.id}" aria-label="Buy ${item.name} for ${item.cost} coins">Unlock</button></div><small class="flappy-shop-need"></small></div></article>`).join("")}</div></section>`;
  root.append(wrapper);
  const $ = selector => wrapper.querySelector(selector);
  $(".flappy-palettes").insertAdjacentHTML("afterbegin", '<button type="button" class="flappy-natural-colors">Natural colors</button>');
  const playPage = document.createElement("section");
  playPage.className = "flappy-play-page";
  playPage.setAttribute("aria-label", "Play Flappy Bird");
  const studio = $(".flappy-studio"), shop = $(".flappy-shop");
  [...wrapper.children].filter(element => !element.matches(".flappy-heading, .flappy-studio, .flappy-shop")).forEach(element => playPage.append(element));
  wrapper.insertBefore(playPage, studio);
  const pages = { play: playPage, customize: studio, shop };
  const scene = $(".flappy-scene"), canvas = $(".flappy-canvas"), previewCanvas = $(".flappy-bird-preview");
  const overlay = $(".flappy-overlay"), overlayTitle = overlay.querySelector("h4"), overlayText = overlay.querySelector("p"), playButton = $(".flappy-play");
  const flapButton = $(".flappy-flap"), pauseButton = $(".flappy-pause"), difficultySelect = $('[aria-label="Flight difficulty"]'), viewSelect = $('[aria-label="Flappy view mode"]');
  if (!editorOnly) {
    const link = $('[data-flappy-page-link="customize"]'); link.href = "#characters/flappy"; link.removeAttribute("data-flappy-page-link");
  }
  const renderer = createFlappyRenderer(canvas, previewCanvas, model, () => settings);
  const webglCanvas = document.createElement("canvas"); webglCanvas.className = "flappy-webgl-canvas"; webglCanvas.hidden = true; webglCanvas.setAttribute("role", "img"); webglCanvas.setAttribute("aria-label", "Enhanced 3D flight"); canvas.after(webglCanvas);
  let webgl = null, webglLoading = false, webglDisposed = false;
  function syncWebGL() {
    if (editorOnly) return;
    webglCanvas.hidden = settings.view !== "first-person-webgl" || !webgl;
    wrapper.dataset.renderer = settings.view === "first-person-webgl" && webgl ? "webgl3d" : "canvas2d";
    if (settings.view !== "first-person-webgl" || (!editorOnly && currentPage !== "play") || webgl || webglLoading || webglDisposed) return;
    webglLoading = true;
    // Give the engine a real viewport while it starts. Classic 3D remains underneath.
    webglCanvas.hidden = false;
    import("./arcade/flappy-webgl.js").then(module => module.createFlappyWebGL(webglCanvas, model, () => settings, () => !webglDisposed && settings.view === "first-person-webgl" && (editorOnly || currentPage === "play"))).then(view => {
      webglLoading = false;
      if (webglDisposed) { view.dispose(); return; }
      webgl = view; webglCanvas.hidden = settings.view !== "first-person-webgl"; wrapper.dataset.renderer = "webgl3d"; webgl.draw();
    }).catch(() => { webglLoading = false; webgl?.dispose(); webgl = null; webglCanvas.hidden = true; if (!webglDisposed && settings.view === "first-person-webgl" && currentPage === "play") { wrapper.dataset.renderer = "canvas2d"; announce("Enhanced 3D is unavailable on this device. Classic 3D is ready to play."); } });
  }
  function drawFlight() {
    if (settings.view === "first-person-webgl" && webgl) {
      try { webgl.draw(); return; }
      catch { webgl.dispose(); webgl = null; webglCanvas.hidden = true; wrapper.dataset.renderer = "canvas2d"; announce("Enhanced 3D stopped. Your flight continues in classic 3D."); }
    }
    renderer.draw();
  }
  const disposers = [];
  let hudAt = 0, previousPhase = "ready", previousScore = 0, retryReady = false, flightSettled = false, lastReward = null, currentPage = "play";
  const previousTitle = document.title;
  function on(target, name, callback, options) { target.addEventListener(name, callback, options); disposers.push(() => target.removeEventListener(name, callback, options)); }
  function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, difficulty: model.state.difficultyId, bests, wallet, scoringVersion: progress.scoringVersion })); } catch { /* The game also works without storage. */ } }
  function settleFlight() {
    if (flightSettled || model.state.phase === "ready") return;
    flightSettled = true; lastReward = flightReward(model.state.pipesCleared, model.state.difficultyId);
    rewardSession.award({ pipes: model.state.pipesCleared, difficulty: model.state.difficultyId }).then(() => { if (wrapper.isConnected) { persist(); updateShop(); } });
  }
  function rememberBest() { const s = model.state; if (s.score > bests[s.difficultyId]) { bests[s.difficultyId] = s.score; persist(); } }
  function announce(message) { $(".flappy-status").textContent = message; }
  function updateHUD() {
    const s = model.state;
    $(".flappy-score").textContent = s.score;
    $(".flappy-pipes").textContent = s.pipesCleared;
    $(".flappy-best").textContent = Math.floor(bests[s.difficultyId] / POINTS_PER_PIPE[s.difficultyId]);
    $(".flappy-best-score").textContent = bests[s.difficultyId];
    $(".flappy-best-level").textContent = s.difficulty.name;
    $(".flappy-distance").textContent = Math.floor(s.distance);
    $(".flappy-altitude").textContent = s.y.toFixed(1);
    $(".flappy-speed-badge").textContent = `${speedFor(s).toFixed(1)} m/s`;
    wrapper.querySelectorAll(".flappy-wallet").forEach(element => { element.textContent = wallet.coins; });
  }
  function updateControls() {
    const s = model.state;
    wrapper.dataset.phase = s.phase; wrapper.dataset.paused = String(s.paused);
    overlay.hidden = (s.phase === "playing" && !s.paused) || (s.phase === "gameover" && !retryReady);
    $(".flappy-reward").hidden = s.phase !== "gameover" || !lastReward;
    $(".flappy-shop-after").hidden = s.phase !== "gameover";
    pauseButton.disabled = s.phase !== "playing";
    pauseButton.textContent = s.paused ? "Resume" : "Pause";
    flapButton.disabled = s.paused || (s.phase === "gameover" && !retryReady);
    playButton.disabled = s.phase === "gameover" && !retryReady;
    flapButton.textContent = s.phase === "ready" ? "Flap / Start" : s.phase === "gameover" ? "Fly again" : "Flap";
    if (s.paused) { overlayTitle.textContent = "Taking a little breather"; overlayText.textContent = "Your flight is paused. Resume when you're ready."; playButton.textContent = "Resume flight"; }
    else if (s.phase === "gameover") { overlayTitle.textContent = "One more little adventure?"; overlayText.textContent = `${s.crashReason === "pipe" ? "You clipped a pipe." : "You touched the ground."} ${s.score} points from ${s.pipesCleared} ${s.pipesCleared === 1 ? "pipe" : "pipes"}. Best on ${s.difficulty.name}: ${bests[s.difficultyId]} points.`; playButton.textContent = "Fly again"; }
    else { overlayTitle.textContent = "Ready to spread your wings?"; overlayText.innerHTML = settings.view.startsWith("first-person") ? "Tap, click, or press Space to flap.<br>Line up the center ring with the dotted gap ahead." : "Tap, click, or press Space to flap.<br>Fly through the gaps. Keep off the ground."; playButton.textContent = "Let's fly"; }
    if (s.phase === "gameover" && lastReward) {
      $(".flappy-award-name").textContent = lastReward.name;
      $(".flappy-award-coins").textContent = `+${lastReward.coins} ${lastReward.coins === 1 ? "coin" : "coins"} earned`;
      $(".flappy-award-detail").textContent = lastReward.pipes ? `${lastReward.pipes} pipes x ${lastReward.multiplier}${lastReward.bonus ? ` + ${lastReward.bonus} award bonus` : ""}` : "Clear a gap to earn your first coins.";
      $(".flappy-award-coin").style.setProperty("--award-color", lastReward.color);
    }
  }
  function updateAppearance() {
    wrapper.dataset.view = settings.view;
    viewSelect.value = settings.view;
    syncWebGL();
    $(".flappy-guide").checked = settings.guide;
    $(".flappy-sound").checked = settings.sound;
    wrapper.querySelectorAll("[data-setting]").forEach(input => { input.value = settings[input.dataset.setting]; });
    wrapper.querySelectorAll("[data-color]").forEach(input => { const value = settings.colors[input.dataset.color]; input.value = value; $(`[data-color-output="${input.dataset.color}"]`).textContent = value; });
    wrapper.querySelectorAll("[data-palette]").forEach(button => button.setAttribute("aria-pressed", String(Object.keys(COLOR_FIELDS).every(key => settings.colors[key] === PALETTES[button.dataset.palette][key]))));
    $(".flappy-view-badge").textContent = settings.view.startsWith("first-person") ? "FIRST-PERSON 3D" : "SIDE VIEW";
    $(".flappy-bird-name").textContent = BIRDS[settings.bird];
    $(".flappy-preview figcaption > span").textContent = BIRD_DESIGNS[settings.bird].detail;
    $(".flappy-natural-colors").setAttribute("aria-pressed", String(Object.entries(BIRD_DESIGNS[settings.bird].colors).every(([key, color]) => settings.colors[key] === color)));
    const outfit = [HATS[settings.hat], EYEWEAR[settings.eyewear], NECKWEAR[settings.neckwear]].filter(name => name !== "None");
    previewCanvas.setAttribute("aria-label", `${BIRDS[settings.bird]}${outfit.length ? ` wearing ${outfit.join(", ")}` : ""}, with your custom colors`);
    canvas.setAttribute("aria-label", `${settings.view.startsWith("first-person") ? "First-person 3D" : "Side-view"} flight, ${BIRDS[settings.bird]}, ${PIPES[settings.pipeStyle]}, ${BACKGROUNDS[settings.background]}`);
    renderer.preview(); renderer.draw(); updateControls(); updateShop();
    onAppearanceChange?.(structuredClone(settings));
  }
  function updateShop() {
    for (const item of SHOP_ITEMS) {
      const card = $(`[data-item="${item.id}"]`), button = card.querySelector("[data-buy]"), owned = wallet.owned.includes(item.id), equipped = owned && settings[item.setting] === item.value;
      button.disabled = equipped || (!owned && wallet.coins < item.cost);
      button.textContent = equipped ? "Equipped" : owned ? "Equip" : "Unlock";
      button.setAttribute("aria-label", equipped ? `${item.name} equipped` : owned ? `Equip ${item.name}` : `Buy ${item.name} for ${item.cost} coins`);
      card.dataset.owned = String(owned); card.dataset.equipped = String(equipped);
      card.querySelector(".flappy-shop-need").textContent = owned ? "Unlocked forever" : wallet.coins < item.cost ? `${item.cost - wallet.coins} more coins needed` : "Ready to unlock";
      drawFlappyShopPreview(card.querySelector("canvas"), settings, item);
    }
    wrapper.querySelectorAll("[data-setting] option").forEach(option => { const key = option.parentElement.dataset.setting, item = SHOP_ITEMS.find(item => item.setting === key && item.value === option.value); if (item) { const owned = wallet.owned.includes(item.id); option.disabled = !owned; option.textContent = `${item.name}${owned ? "" : ` (Shop: ${item.cost} coins)`}`; } });
    wrapper.querySelectorAll(".flappy-wallet").forEach(element => { element.textContent = wallet.coins; });
  }
  function reset(id = model.state.difficultyId) {
    rememberBest(); settleFlight(); model.reset(id); previousPhase = "ready"; previousScore = 0; retryReady = false; flightSettled = false; lastReward = null;
    rewardSession = createRewardSession("flappy");
    difficultySelect.value = model.state.difficultyId;
    updateDifficultyNote();
    announce(`${model.state.difficulty.name} flight ready. Tap the scene or press Space to start.`);
    updateHUD(); updateControls(); renderer.draw(); persist();
  }
  function focusFlight() { scene.focus({ preventScroll: true }); }
  function flap() {
    if (editorOnly || currentPage !== "play") return;
    if (model.state.phase === "gameover") { if (!retryReady) return; reset(); }
    const starting = model.state.phase === "ready";
    if (!model.flap()) return;
    audio.unlock(); audio.flap();
    if (starting) announce("You're flying! Flap to climb and clear the gaps.");
    updateControls(); focusFlight();
  }
  function pause() {
    if (model.state.phase !== "playing") return;
    model.togglePause(); updateControls(); announce(model.state.paused ? "Flight paused." : "Flight resumed. Keep flapping!"); focusFlight();
  }
  on(canvas, "pointerdown", event => { if (event.button !== 0 || model.state.paused) return; event.preventDefault(); flap(); });
  on(flapButton, "click", flap);
  on(playButton, "click", () => model.state.paused ? pause() : flap());
  on(pauseButton, "click", pause);
  on($(".flappy-restart"), "click", () => { reset(); focusFlight(); });
  on(difficultySelect, "change", () => reset(difficultySelect.value));
  on(viewSelect, "change", () => { settings.view = viewSelect.value; updateAppearance(); persist(); });
  on($(".flappy-guide"), "change", event => { settings.guide = event.target.checked; renderer.draw(); persist(); });
  on($(".flappy-sound"), "change", event => { settings.sound = event.target.checked; audio.setEnabled(settings.sound); if (settings.sound) { audio.unlock(); audio.flap(); } persist(); });
  function updateDifficultyNote() {
    const s = model.state, points = POINTS_PER_PIPE[s.difficultyId], coins = COIN_MULTIPLIERS[s.difficultyId];
    $(".flappy-difficulty-note").textContent = `${s.difficulty.note}. Each pipe: ${points} ${points === 1 ? "point" : "points"}, ${coins} ${coins === 1 ? "coin" : "coins"}.`;
  }
  function applyPageRoute(focus = false) {
    const route = editorOnly ? { 1: "customize" } : /^#flappy(?:\/(shop|customize))?$/.exec(location.hash);
    if (!route) return;
    const next = route[1] || "play";
    if (next !== "play" && model.state.phase === "playing" && !model.state.paused) { model.togglePause(); updateControls(); announce("Flight paused. Return to Play to resume."); }
    currentPage = next; wrapper.dataset.page = next;
    Object.entries(pages).forEach(([id, panel]) => { panel.hidden = id !== next; });
    wrapper.querySelectorAll("[data-flappy-page-link]").forEach(link => { if (link.dataset.flappyPageLink === next) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current"); });
    $(".flappy-page-title").textContent = { play: "A little flap. A big adventure.", customize: "Customize your flyer", shop: "The sky shop" }[next];
    document.title = `${next === "play" ? "Play" : next === "shop" ? "Shop" : "Customize"} | Flappy Bird | games.cooper.tips`;
    if (next === "play" || editorOnly) { renderer.resize(); syncWebGL(); webgl?.resize(); drawFlight(); } else if (next === "customize") renderer.preview();
    if (focus) { const heading = next === "play" ? $(".flappy-page-title") : pages[next].querySelector("h4"); heading.tabIndex = -1; heading.focus({ preventScroll: true }); wrapper.scrollIntoView({ block: "start" }); }
  }
  function navigatePage(page) { const hash = `#flappy${page === "play" ? "" : `/${page}`}`; if (location.hash === hash) applyPageRoute(true); else location.hash = hash; }
  on($(".flappy-page-nav"), "click", event => { const link = event.target.closest("[data-flappy-page-link]"); if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigatePage(link.dataset.flappyPageLink); });
  on($(".flappy-shop-after"), "click", () => navigatePage("shop"));
  on(window, "hashchange", () => applyPageRoute(true));
  on($(".flappy-studio"), "focusin", () => { if (model.state.phase === "playing" && !model.state.paused) { model.togglePause(); updateControls(); announce("Flight paused while you customize. Press P or Resume to keep flying."); } });
  on($(".flappy-shop"), "click", async event => {
    const button = event.target.closest("[data-buy], [data-shop-filter]"); if (!button) return;
    if (model.state.phase === "playing" && !model.state.paused) pause();
    if (button.dataset.shopFilter) {
      const filter = button.dataset.shopFilter;
      wrapper.querySelectorAll("[data-shop-filter]").forEach(tab => tab.setAttribute("aria-pressed", String(tab === button)));
      wrapper.querySelectorAll(".flappy-shop-item").forEach(card => { card.hidden = filter !== "all" && card.dataset.category !== filter; }); return;
    }
    button.disabled = true;
    const result = await arcadeWallet.purchase(`flappy:${button.dataset.buy}`);
    if (!wrapper.isConnected) return;
    updateShop();
    if (!result.ok) { $(".flappy-shop-status").textContent = result.reason === "coins" ? `Earn ${result.needed} more coins to unlock this item.` : "That item is unavailable."; return; }
    settings[result.item.setting] = result.item.value;
    if (result.purchased) { audio.unlock(); audio.purchase(); }
    $(".flappy-shop-status").textContent = `${result.item.name} ${result.purchased ? "unlocked and equipped" : "equipped"}. ${wallet.coins} coins remaining.`;
    updateAppearance(); updateHUD(); persist();
  });
  wrapper.querySelectorAll("[data-setting]").forEach(input => on(input, "change", () => { if (canEquip(wallet, input.dataset.setting, input.value)) settings[input.dataset.setting] = input.value; updateAppearance(); persist(); }));
  wrapper.querySelectorAll("[data-color]").forEach(input => on(input, "input", () => { arcadeWallet.equip(null, "flappy"); settings.colors[input.dataset.color] = input.value; updateAppearance(); persist(); }));
  wrapper.querySelectorAll("[data-palette]").forEach(button => on(button, "click", () => { arcadeWallet.equip(null, "flappy"); const palette = PALETTES[button.dataset.palette]; Object.keys(COLOR_FIELDS).forEach(key => { settings.colors[key] = palette[key]; }); updateAppearance(); persist(); }));
  on($(".flappy-natural-colors"), "click", () => { arcadeWallet.equip(null, "flappy"); Object.assign(settings.colors, BIRD_DESIGNS[settings.bird].colors); updateAppearance(); persist(); });
  on(document, "keydown", event => {
    if (editorOnly || currentPage !== "play" || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.target.closest("input, select, textarea, [contenteditable='true']")) return;
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "w"].includes(key)) { if (key === " " && event.target.closest("button, a")) return; event.preventDefault(); flap(); }
    else if (key === "p") { event.preventDefault(); pause(); }
    else if (key === "r") { event.preventDefault(); reset(); focusFlight(); }
  });
  on(document, "visibilitychange", () => { audio.setPaused(document.hidden); if (document.hidden && model.state.phase === "playing" && !model.state.paused) pause(); });
  const observer = new ResizeObserver(() => { renderer.resize(); webgl?.resize(); drawFlight(); });
  observer.observe(canvas);
  function animate(timestamp, dt) {
    model.advance(dt);
    const s = model.state;
    if (s.score !== previousScore) { rememberBest(); previousScore = s.score; audio.score(); announce(`${s.score} points from ${s.pipesCleared} ${s.pipesCleared === 1 ? "pipe" : "pipes"}!`); }
    if (s.phase !== previousPhase) {
      previousPhase = s.phase;
      if (s.phase === "gameover") { rememberBest(); settleFlight(); audio.crash(); announce(`${s.crashReason === "pipe" ? "Pipe collision" : "Ground landing"}. ${s.score} ${s.score === 1 ? "point" : "points"}. ${lastReward.coins} coins earned. Try again!`); }
      updateControls(); updateHUD();
    }
    if (s.phase === "gameover" && !retryReady && s.crashAge >= deathTime) { retryReady = true; updateControls(); }
    if (timestamp - hudAt >= 100) { updateHUD(); if (currentPage === "customize") renderer.preview(); hudAt = timestamp; }
    if (currentPage === "play" || editorOnly && settings.view.startsWith("first-person")) drawFlight();
  }
  difficultySelect.value = model.state.difficultyId;
  updateDifficultyNote();
  const unmountWallet = editorOnly ? () => {} : mountGameWallet(root, "flappy");
  const unsubscribeWallet = arcadeWallet.subscribe(state => { Object.assign(wallet, flappyWalletView(state)); updateShop(); updateHUD(); });
  const loop = createFrameLoop(animate);
  updateAppearance(); updateHUD(); applyPageRoute(); persist(); if (!editorOnly) loop.start();
  return () => { rememberBest(); settleFlight(); webglDisposed = true; webgl?.dispose(); unsubscribeWallet(); unmountWallet(); audio.destroy(); loop.stop(); observer.disconnect(); disposers.forEach(dispose => dispose()); document.title = previousTitle; wrapper.remove(); };
}
