import { SPOTLIGHT_LEVELS, SPOTLIGHT_SCENES, SPOTLIGHT_FRAMES, spotlightImage, spotlightUnlocked, readSpotlightSettings, writeSpotlightSettings, spotlightRewardKey, spotlightCoinGuide } from "./spotlight-config.js";
import { spotlightTargets } from "./spotlight-puzzles.js";
import { createSpotlightRound, startSpotlight, tickSpotlight, tapSpotlight, hintSpotlight, spotlightProgress } from "./spotlight-engine.js";
import { getArcadeWallet } from "./arcade/wallet.js";
import { mountGameWallet, rewardTotal } from "./arcade/game-services.js";
import { createSpotlightFinale } from "./spotlight-finale.js";
import { createSpotlightAudio } from "./spotlight-audio.js";

const time = seconds => { const whole = Math.ceil(Math.max(0, seconds)); return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`; };
const esc = text => String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const loadImage = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("A picture could not load.")); image.src = src; });
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));

export function createSpotlight(root) {
  const wallet = getArcadeWallet(), events = new AbortController();
  let settings = readSpotlightSettings(wallet.getState().owned), game, disposed = false, loading = false, imageError = false, generation = 0, earned = 0, custom = null;
  let zoom = 1, pan = { x: 0, y: 0 }, cursor = null, drag = null, lastTick = performance.now(), finishShown = false;
  const audio = createSpotlightAudio(() => settings.sound);
  let customImages = [], customPoints = [], customAspect = 1.5;
  const customUrls = new Set(), customLoads = [0, 0];
  const wrapper = document.createElement("section"); wrapper.className = "sl-game";
  wrapper.innerHTML = `<header class="sl-hero"><div><p class="sl-eyebrow">THE ART OF PAYING ATTENTION</p><h3>A world worth a closer look.</h3><p>Two pictures. A handful of little secrets. Find what changed.</p></div><div class="sl-mark" aria-hidden="true"></div></header>
    <div class="sl-settings"><div><p class="sl-eyebrow">CHOOSE YOUR CHALLENGE</p><div class="sl-levels" role="group" aria-label="Difficulty">${Object.entries(SPOTLIGHT_LEVELS).map(([id, l]) => `<button type="button" data-level="${id}" aria-pressed="false"><span>${l.label}</span><small>${l.count} differences</small></button>`).join("")}</div></div><div class="sl-mode"><label>Play style<select aria-label="Play style"><option value="challenge">Challenge / earn coins</option><option value="relaxed">Relaxed / no timer</option></select></label></div></div>
    <p class="sl-level-note"></p><div class="sl-gallery-heading"><h4>Your picture collection</h4><a href="#store/spotdiff">Discover more in the shop &nearr;</a></div><div class="sl-gallery" role="group" aria-label="Picture scenes"></div>
    <div class="sl-workspace"><section class="sl-desk" data-frame="gallery"><div class="sl-topbar"><div class="sl-title"><p class="sl-eyebrow sl-scene-number"></p><h4></h4><p class="sl-scene-subtitle"></p></div><div class="sl-stats" aria-label="Puzzle progress"><div><span>Differences</span><strong class="sl-count">0 / 4</strong></div><div><span class="sl-clock-label">Time left</span><strong class="sl-time">3:00</strong></div><div><span>This attempt</span><strong class="sl-earned">+0 coins</strong></div></div></div>
      <div class="sl-board-wrap"><div class="sl-board">${["A", "B"].map((letter, i) => `<figure class="sl-picture"><div class="sl-viewport" data-side="${i}"></div><figcaption><b>IMAGE ${letter}</b><span>${i ? "FIND THE CHANGES" : "THE ORIGINAL"}</span></figcaption></figure>`).join("")}</div><div class="sl-cover"><div><p class="sl-eyebrow">A MOMENT TO LOOK CLOSER</p><h4></h4><p class="sl-cover-note"></p><button type="button" class="sl-primary sl-start">Start looking</button></div></div></div>
      <div class="sl-utility"><div class="sl-utility-group" aria-label="Picture zoom"><button class="sl-tool sl-zoom-out" type="button" aria-label="Zoom out">&minus;</button><span class="sl-zoom-label">1&times;</span><button class="sl-tool sl-zoom-in" type="button" aria-label="Zoom in">+</button><button class="sl-tool sl-center" type="button">Reset view</button><button class="sl-tool sl-expand" type="button" aria-pressed="false">Expand</button></div><div class="sl-utility-group"><button class="sl-tool sl-hint" type="button">Hint (2)</button><button class="sl-tool sl-pause" type="button">Pause</button><button class="sl-tool sl-restart" type="button">Restart</button></div></div>
      <p class="sl-interaction-note">Tap a change in either picture. Zoom moves both pictures together; drag to explore when zoomed. Keyboard: focus a picture, arrows move the pointer, Enter checks it.</p><p class="sl-status" role="status" aria-live="polite"></p><ol class="sl-found-list" aria-label="Differences found"></ol>
      <section class="sl-results" hidden><div class="sl-result-stars" aria-hidden="true"></div><p class="sl-eyebrow">YOUR OBSERVATION REPORT</p><h4 tabindex="-1"></h4><p class="sl-result-detail"></p><p class="sl-result-coins"></p><div class="sl-result-actions"><button type="button" class="sl-primary sl-again">Try again</button><button type="button" class="sl-tool sl-answers">Show remaining changes</button><a href="#store/spotdiff">Visit the shared shop &rarr;</a></div></section>
    </section></div>
    <div class="sl-bottom"><section class="sl-rules"><h4>How to play</h4><ol><li>Choose a scene and a difficulty, then press <b>Start looking</b>.</li><li>Compare Image A with Image B. Tap any changed detail in either picture. It is marked in both.</li><li>Find every change before the clock runs out. A wrong tap costs <b>5 seconds</b>; an already-found spot has no penalty.</li><li>Two hints reveal a change each. That change earns no coins. Use Relaxed to explore without a clock or rewards.</li></ol><p>Pause hides the pictures and stops the clock. Changing scene, level, or play style starts a fresh puzzle.</p></section>
    <section class="sl-rewards"><h4>A good eye earns a little gold.</h4><div class="sl-reward-grid">${Object.entries(SPOTLIGHT_LEVELS).map(([id, l]) => `<div class="sl-reward-cell" data-reward-level="${id}"><span>${l.label}</span><b>${l.count * l.find + l.bonus}</b><span>maximum coins</span></div>`).join("")}</div><p class="sl-reward-detail"></p><p>Each scene and difficulty has its own reward limit. Replaying can improve your best reward, but never pays the same coins twice. Coins go directly to your shared wallet.</p></section></div>
    <div class="sl-preferences"><label class="sl-frame-label">Picture frame<select class="sl-frame" aria-label="Picture frame"></select></label><button class="sl-tool sl-sound" type="button" aria-pressed="true">Sound on</button></div>
    <details class="sl-custom"><summary>Make a puzzle with your own pictures</summary><p>Upload two versions of the same picture. On Image B below, mark the center of each difference, then play. Your pictures stay on this device. Custom puzzles are untimed and earn no coins.</p><div class="sl-custom-form"><label>Puzzle name<input type="text" class="sl-custom-name" maxlength="45" placeholder="My picture puzzle"></label><span></span><label>Image A / original<input type="file" class="sl-custom-file" data-file="0" accept="image/png,image/jpeg,image/webp"></label><label>Image B / changed<input type="file" class="sl-custom-file" data-file="1" accept="image/png,image/jpeg,image/webp"></label></div><div class="sl-custom-preview" hidden></div><div class="sl-custom-actions"><button type="button" class="sl-tool sl-custom-undo">Undo last mark</button><button type="button" class="sl-primary sl-custom-play" disabled>Play my puzzle</button><span class="sl-custom-status">Choose two pictures to begin.</span></div></details>`;
  root.append(wrapper);
  const $ = selector => wrapper.querySelector(selector), $$ = selector => [...wrapper.querySelectorAll(selector)];
  const on = (node, type, fn, options = {}) => node.addEventListener(type, fn, { ...options, signal: events.signal });
  const unmountWallet = mountGameWallet(wrapper, "spotdiff"), banner = $(".arcade-game-wallet > span"), desk = $(".sl-desk"), cover = $(".sl-cover"), result = $(".sl-results");
  const finale = createSpotlightFinale(wrapper, {
    onReplay: async () => { await newRound(); if (!disposed) $(".sl-start").focus(); },
    onInspect: reveal => {
      audio.stop();
      if (reveal && game.phase === "failed") { game.revealed = true; drawMarkers(); update(); say("The remaining changes are outlined in amber. Try again whenever you like."); }
      const target = reveal ? $(".sl-board") : result;
      target.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      $(".sl-results h4").focus({ preventScroll: true });
    },
    onToggleSound: toggleSound,
  });
  $(".sl-mode select").value = settings.mode;
  function say(message, miss = false) { $(".sl-status").textContent = message; $(".sl-status").classList.toggle("is-miss", miss); }
  const sound = kind => audio.play(kind);
  function toggleSound() { settings.sound = !settings.sound; if (!settings.sound) audio.stop(); $(".sl-sound").textContent = settings.sound ? "Sound on" : "Sound off"; $(".sl-sound").setAttribute("aria-pressed", String(settings.sound)); finale.setSound(settings.sound); writeSpotlightSettings(settings); }
  function banked() { return custom ? 0 : wallet.getState().rewards[`spotdiff:${spotlightRewardKey(settings.scene, settings.difficulty)}`] || 0; }
  function refreshCoins() {
    const guide = custom ? "Custom pictures: untimed practice, with no coin rewards." : spotlightCoinGuide(settings, banked());
    banner.textContent = guide; $(".sl-reward-detail").textContent = guide;
    $$("[data-reward-level]").forEach(el => el.setAttribute("aria-current", String(el.dataset.rewardLevel === settings.difficulty)));
  }
  function collection() {
    const owned = wallet.getState().owned;
    $(".sl-gallery").innerHTML = SPOTLIGHT_SCENES.map((scene, i) => {
      const unlocked = spotlightUnlocked("scene", scene.id, owned);
      return `<button type="button" class="sl-scene" data-scene="${scene.id}" data-locked="${!unlocked}" aria-pressed="${!custom && settings.scene === scene.id}" aria-label="${scene.title}${unlocked ? "" : `, locked, ${scene.cost} coins in shop`}"><img src="${spotlightImage(scene.id)}" alt="" loading="lazy">${unlocked ? "" : `<span class="sl-scene-badge">${scene.cost} COINS</span>`}<strong>${scene.title}</strong><small>${unlocked ? `SCENE ${String(i + 1).padStart(2, "0")} / FOUR LEVELS` : "UNLOCK IN THE SHOP"}</small></button>`;
    }).join("");
    $(".sl-frame").innerHTML = SPOTLIGHT_FRAMES.map(frame => `<option value="${frame.id}" ${spotlightUnlocked("frame", frame.id, owned) ? "" : "disabled"}>${frame.name}${spotlightUnlocked("frame", frame.id, owned) ? "" : ` / ${frame.cost} coins`}</option>`).join("");
    $(".sl-frame").value = settings.frame;
  }
  const viewHeight = () => 1000 / (custom?.aspect || 1.5);
  function frameArt(side) {
    const height = viewHeight(), base = custom ? custom.urls[side] : spotlightImage(settings.scene);
    const defs = !custom && side ? game.targets.map((target, i) => `<mask id="sl-${generation}-${side}-mask-${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="${height}"><rect x="${target.x * 10}" y="${target.y * height / 100}" width="${target.w * 10}" height="${target.h * height / 100}" fill="white" filter="url(#sl-${generation}-${side}-feather)"/></mask>`).join("") : "";
    const overlays = !custom && side ? game.targets.map((target, i) => `<image href="${spotlightImage(settings.scene, target.source)}" width="1000" height="${height}" preserveAspectRatio="none" mask="url(#sl-${generation}-${side}-mask-${i})"/>`).join("") : "";
    return `<svg class="sl-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${height}" tabindex="0" role="application" aria-label="Image ${side ? "B, find the changes" : "A, the original"}. Arrow keys move the pointer. Enter checks a difference."><defs><filter id="sl-${generation}-${side}-feather" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="1.2"/></filter>${defs}</defs><image href="${esc(base)}" width="1000" height="${height}" preserveAspectRatio="none"/>${overlays}<g class="sl-markers" pointer-events="none"></g><g class="sl-key-cursor" pointer-events="none"></g></svg>`;
  }
  function transform() {
    const limit = (zoom - 1) * 50; pan.x = clamp(pan.x, -limit, limit); pan.y = clamp(pan.y, -limit, limit);
    $$(".sl-art").forEach(svg => { svg.style.transform = `translate(${pan.x}%,${pan.y}%) scale(${zoom})`; });
    $$(".sl-viewport").forEach(el => el.classList.toggle("is-zoomed", zoom > 1));
    $(".sl-zoom-label").textContent = zoom + "x"; $(".sl-zoom-out").disabled = zoom <= 1; $(".sl-zoom-in").disabled = zoom >= 3;
  }
  function drawMarkers() {
    const height = viewHeight();
    const found = game.targets.filter(t => game.found.has(t.id) || game.revealed);
    const markup = found.map(t => {
      const x = (t.x + t.w / 2) * 10, y = (t.y + t.h / 2) * height / 100, rx = Math.max(12, t.w * 5 + 5), ry = Math.max(12, t.h * height / 200 + 5), n = game.targets.indexOf(t) + 1;
      return `<g class="sl-found-marker" data-hint="${game.hinted.has(t.id)}" data-answer="${!game.found.has(t.id)}"><ellipse class="sl-found-ring" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/><ellipse class="sl-found-ring inner" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/><circle cx="${x + rx * .7}" cy="${y - ry * .7}" r="11"/><text x="${x + rx * .7}" y="${y - ry * .7}">${n}</text></g>`;
    }).join("");
    $$(".sl-markers").forEach(g => { g.innerHTML = markup; });
    $(".sl-found-list").innerHTML = found.map(t => `<li><b>${game.targets.indexOf(t) + 1}</b>${esc(t.label)}${game.hinted.has(t.id) ? " / hint" : !game.found.has(t.id) ? " / answer" : ""}</li>`).join("");
  }
  function drawCursor() {
    $$(".sl-key-cursor").forEach(g => { g.innerHTML = cursor && !game.paused && game.phase === "playing" ? `<path class="sl-cursor" d="M${cursor.x * 10 - 11} ${cursor.y * viewHeight() / 100}h22m-11 -11v22"/>` : ""; });
  }
  function update() {
    if (!game || disposed) return;
    const level = SPOTLIGHT_LEVELS[settings.difficulty], running = game.phase === "playing";
    $(".sl-count").textContent = `${game.found.size} / ${game.targets.length}`;
    $(".sl-time").textContent = time(game.mode === "challenge" ? game.remaining : game.elapsed);
    $(".sl-clock-label").textContent = game.mode === "challenge" ? "Time left" : "Time enjoyed";
    $(".sl-time").classList.toggle("is-low", game.mode === "challenge" && game.remaining < 25 && running);
    $(".sl-earned").textContent = `+${earned} coins`;
    $(".sl-pause").disabled = !running; $(".sl-pause").textContent = game.paused ? "Resume" : "Pause";
    $(".sl-hint").disabled = !running || game.paused || game.hints <= 0; $(".sl-hint").textContent = `Hint (${game.hints})`;
    cover.hidden = !loading && game.phase !== "ready" && !game.paused;
    $(".sl-cover h4").textContent = loading ? "Opening your pictures..." : imageError ? "Let's try that again." : game.paused ? "A little pause." : `${game.targets.length} differences await.`;
    $(".sl-cover-note").textContent = loading ? "Preparing every little detail." : imageError ? "A picture could not load. Check your connection and retry." : game.paused ? "The clock is stopped. Resume whenever you are ready." : game.mode === "challenge" ? `${time(level.seconds)} to find them all. Two hints if you need a little help.` : "No clock to beat. Take all the time you like.";
    $(".sl-start").disabled = loading; $(".sl-start").textContent = imageError ? "Retry pictures" : game.paused ? "Resume looking" : "Start looking";
    $$(".sl-art").forEach(svg => { svg.tabIndex = running && !game.paused ? 0 : -1; svg.setAttribute("aria-hidden", String(!running || game.paused)); });
    result.hidden = !["complete", "failed"].includes(game.phase);
    if (!result.hidden) {
      const complete = game.phase === "complete";
      $(".sl-result-stars").textContent = complete ? "\u2726 \u2726 \u2726" : "\u2726";
      $(".sl-results h4").textContent = complete ? "Nothing gets past you." : "A few secrets remain.";
      $(".sl-result-detail").textContent = `${game.found.size} of ${game.targets.length} found in ${time(game.elapsed)}. ${game.mistakes} wrong tap${game.mistakes === 1 ? "" : "s"}. ${game.hinted.size} hint${game.hinted.size === 1 ? "" : "s"} used.`;
      $(".sl-result-coins").textContent = game.mode === "relaxed" ? "A little time well spent. Practice does not earn coins." : `${earned} new coins added to your shared wallet this attempt. ${banked()} coins banked for this scene and level in total. ${complete && !earned ? "This result was already rewarded; a better unhinted result can still earn any remaining coins." : ""}`;
      $(".sl-answers").hidden = complete || game.revealed; $(".sl-again").textContent = complete ? "Look again" : "Try again";
      result.dataset.outcome = complete ? "win" : "loss";
      if (!finishShown) {
        finishShown = true;
        finale.play({ won: complete, found: game.found.size, total: game.targets.length, elapsed: time(game.elapsed), scene: $(".sl-title h4").textContent, level: custom ? "Your own puzzle" : level.label, coins: earned, practice: game.mode === "relaxed", sound: settings.sound });
        sound(complete ? "win" : "lose");
      }
      finale.updateCoins(earned);
    }
  }
  async function award(round = game) {
    if (round.mode !== "challenge" || round.custom) return;
    const token = generation, total = rewardTotal("spotdiff", spotlightProgress(round));
    const response = await wallet.claim("spotdiff", spotlightRewardKey(round.scene, round.difficulty), total);
    if (disposed || token !== generation) return;
    earned += response.coins || 0; refreshCoins(); update();
  }
  async function newRound() {
    finale.reset(); audio.stop(); finishShown = false;
    const token = ++generation; loading = true; imageError = false; earned = 0; zoom = 1; pan = { x: 0, y: 0 }; cursor = null; drag = null;
    wrapper.dataset.ready = "loading";
    releaseUnusedCustomUrls();
    game = createSpotlightRound({ ...settings, custom: !!custom, targets: custom ? custom.targets : spotlightTargets(settings.scene, settings.difficulty) });
    const scene = SPOTLIGHT_SCENES.find(s => s.id === settings.scene);
    $(".sl-title h4").textContent = custom ? custom.title : scene.title;
    $(".sl-scene-number").textContent = custom ? "YOUR OWN COLLECTION" : `${String(SPOTLIGHT_SCENES.indexOf(scene) + 1).padStart(2, "0")} / THE SPOTLIGHT COLLECTION`;
    $(".sl-scene-subtitle").textContent = custom ? "A puzzle made by you." : scene.subtitle;
    $(".sl-level-note").textContent = custom ? "Your own pictures / untimed practice / no coins." : `${SPOTLIGHT_LEVELS[settings.difficulty].note} ${SPOTLIGHT_LEVELS[settings.difficulty].count} differences. ${settings.mode === "challenge" ? time(SPOTLIGHT_LEVELS[settings.difficulty].seconds) + " on the clock." : "No time limit."}`;
    $$("[data-level]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.level === settings.difficulty && !custom)));
    $$(".sl-viewport").forEach((viewport, side) => { viewport.style.aspectRatio = String(custom?.aspect || 1.5); viewport.innerHTML = frameArt(side); });
    desk.dataset.frame = settings.frame; $(".sl-sound").textContent = settings.sound ? "Sound on" : "Sound off"; $(".sl-sound").setAttribute("aria-pressed", String(settings.sound));
    collection(); refreshCoins(); transform(); drawMarkers(); update(); say("Compare the pictures and tap a change in either one.");
    writeSpotlightSettings(settings);
    try { await Promise.all((custom ? custom.urls : [...new Set([spotlightImage(settings.scene), ...game.targets.map(t => spotlightImage(settings.scene, t.source))])]).map(loadImage)); }
    catch { if (!disposed && token === generation) imageError = true; }
    if (disposed || token !== generation) return;
    loading = false; wrapper.dataset.ready = imageError ? "error" : "true"; update();
  }
  function pause(value = !game.paused) { if (game.phase !== "playing") return; game.paused = value; lastTick = performance.now(); drag = null; update(); drawCursor(); }
  function begin() {
    if (loading) return; if (imageError) { newRound(); return; }
    if (game.paused) pause(false); else if (startSpotlight(game)) { lastTick = performance.now(); sound("start"); update(); say("Take a good look. You can tap either picture."); }
  }
  function foundOutcome(outcome) {
    if (outcome.type === "found") { if (game.phase !== "complete") sound("found"); say(`Found: ${outcome.target.label}. ${game.targets.length - game.found.size} left.`); drawMarkers(); award(); }
    else if (outcome.type === "miss") { if (game.phase !== "failed") sound("miss"); say(outcome.penalty ? "Not a change. Five seconds off the clock; look closely before your next tap." : "Those details match. Take another look.", true); }
    else if (outcome.type === "already") say("You already found that one. Look for another change.");
    update();
  }
  function checkPoint(svg, event) {
    if (game.phase !== "playing" || game.paused) return;
    const rect = svg.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width * 100, y = (event.clientY - rect.top) / rect.height * 100;
    const outcome = tapSpotlight(game, x, y, 600 / rect.width); foundOutcome(outcome);
    if (outcome.type === "miss") { const view = svg.parentElement, r = view.getBoundingClientRect(), mark = document.createElement("i"); mark.className = "sl-miss"; mark.style.left = event.clientX - r.left + "px"; mark.style.top = event.clientY - r.top + "px"; view.append(mark); mark.addEventListener("animationend", () => mark.remove(), { once: true }); setTimeout(() => mark.remove(), 700); }
  }
  on(wrapper, "click", event => {
    const level = event.target.closest("[data-level]"), scene = event.target.closest("[data-scene]");
    if (level) { settings.difficulty = level.dataset.level; custom = null; newRound(); }
    if (scene) { if (!spotlightUnlocked("scene", scene.dataset.scene, wallet.getState().owned)) { location.hash = "#store/spotdiff"; return; } settings.scene = scene.dataset.scene; custom = null; newRound(); }
  });
  on($(".sl-mode select"), "change", e => { settings.mode = e.target.value; custom = null; newRound(); });
  on($(".sl-frame"), "change", e => { if (!spotlightUnlocked("frame", e.target.value, wallet.getState().owned)) return; settings.frame = e.target.value; desk.dataset.frame = settings.frame; writeSpotlightSettings(settings); });
  on($(".sl-sound"), "click", toggleSound);
  on($(".sl-start"), "click", begin); on($(".sl-pause"), "click", () => pause());
  for (const selector of [".sl-restart", ".sl-again"]) on($(selector), "click", newRound);
  on($(".sl-hint"), "click", () => { const target = hintSpotlight(game); if (!target) return; if (zoom > 1) { pan = { x: -(target.x + target.w / 2 - 50) * zoom, y: -(target.y + target.h / 2 - 50) * zoom }; transform(); } say(`Hint: ${target.label}. Marked in both pictures; this find earns no coins.`); if (game.phase !== "complete") sound("hint"); drawMarkers(); award(); update(); });
  on($(".sl-answers"), "click", () => { if (game.phase !== "failed") return; game.revealed = true; drawMarkers(); update(); say("The remaining changes are outlined in amber. Try again whenever you like."); });
  function changeZoom(step) { zoom = clamp(zoom + step, 1, 3); cursor = null; transform(); drawCursor(); }
  on($(".sl-zoom-in"), "click", () => changeZoom(.5)); on($(".sl-zoom-out"), "click", () => changeZoom(-.5));
  on($(".sl-center"), "click", () => { zoom = 1; pan = { x: 0, y: 0 }; transform(); });
  function expand(force) { const expanded = typeof force === "boolean" ? force : !$(".sl-workspace").classList.contains("is-expanded"); $(".sl-workspace").classList.toggle("is-expanded", expanded); $(".sl-expand").textContent = expanded ? "Close expanded view" : "Expand"; $(".sl-expand").setAttribute("aria-pressed", String(expanded)); }
  on($(".sl-expand"), "click", () => expand());
  on(window, "keydown", event => { if (event.key === "Escape") expand(false); });
  on(document, "visibilitychange", () => { if (document.hidden) pause(true); });
  on($(".sl-board"), "pointerdown", event => {
    const svg = event.target.closest(".sl-art"); if (!svg || game.phase !== "playing" || game.paused || event.button > 0) return;
    cursor = null; drawCursor(); drag = { id: event.pointerId, svg, x: event.clientX, y: event.clientY, px: pan.x, py: pan.y, moved: false };
    if (zoom > 1) svg.setPointerCapture(event.pointerId);
  });
  on($(".sl-board"), "pointermove", event => {
    if (!drag || drag.id !== event.pointerId || zoom === 1) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 6) drag.moved = true;
    if (drag.moved) { const r = drag.svg.parentElement.getBoundingClientRect(); pan = { x: drag.px + dx / r.width * 100, y: drag.py + dy / r.height * 100 }; transform(); drag.svg.parentElement.classList.add("is-dragging"); event.preventDefault(); }
  });
  on($(".sl-board"), "pointerup", event => { if (!drag || drag.id !== event.pointerId) return; const active = drag; drag = null; active.svg.parentElement.classList.remove("is-dragging"); if (!active.moved) checkPoint(active.svg, event); });
  on($(".sl-board"), "pointercancel", () => { drag = null; $$(".sl-viewport").forEach(v => v.classList.remove("is-dragging")); });
  on($(".sl-board"), "keydown", event => {
    const svg = event.target.closest(".sl-art"); if (!svg || game.phase !== "playing" || game.paused) return;
    if (event.code === "KeyP") { pause(); event.preventDefault(); return; }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault(); cursor ||= { x: 50, y: 50 }; const step = event.shiftKey ? 5 : 1;
      if (event.key === "ArrowLeft") cursor.x -= step; if (event.key === "ArrowRight") cursor.x += step;
      if (event.key === "ArrowUp") cursor.y -= step; if (event.key === "ArrowDown") cursor.y += step;
      cursor.x = clamp(cursor.x, 1, 99); cursor.y = clamp(cursor.y, 1, 99);
      if (event.key === "Enter" || event.key === " ") foundOutcome(tapSpotlight(game, cursor.x, cursor.y));
      if (zoom > 1) { pan = { x: -(cursor.x - 50) * zoom, y: -(cursor.y - 50) * zoom }; transform(); } drawCursor();
    }
  });
  function releaseUnusedCustomUrls() {
    const used = new Set([...customImages.filter(Boolean).map(image => image.url), ...(custom?.urls || [])]);
    for (const url of customUrls) if (!used.has(url)) { URL.revokeObjectURL(url); customUrls.delete(url); }
  }
  function customPreview() {
    const preview = $(".sl-custom-preview"); preview.hidden = !customImages[1];
    preview.innerHTML = customImages[1] ? `<img src="${customImages[1].url}" alt="Your changed picture. Tap the center of each difference.">${customPoints.map(p => `<i style="left:${p.x}%;top:${p.y}%"></i>`).join("")}` : "";
    const ready = customImages[0] && customImages[1] && Math.abs(customImages[0].aspect - customImages[1].aspect) < .005;
    $(".sl-custom-play").disabled = !ready || customPoints.length === 0;
    $(".sl-custom-status").textContent = !customImages[0] || !customImages[1] ? "Choose both pictures, then mark the differences on Image B." : !ready ? "Use two pictures with the same proportions." : `${customPoints.length} difference${customPoints.length === 1 ? "" : "s"} marked. Tap up to 20 spots.`;
  }
  $$(".sl-custom-file").forEach(input => on(input, "change", async () => {
    const file = input.files?.[0], index = Number(input.dataset.file), token = ++customLoads[index]; if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 12 * 1024 * 1024) { $(".sl-custom-status").textContent = "Use a PNG, JPEG, or WebP picture smaller than 12 MB."; return; }
    const url = URL.createObjectURL(file);
    try { const image = await loadImage(url); if (disposed || token !== customLoads[index]) { URL.revokeObjectURL(url); return; } customUrls.add(url); customImages[index] = { url, aspect: image.naturalWidth / image.naturalHeight }; if (index === 1) { customPoints = []; customAspect = customImages[1].aspect; } releaseUnusedCustomUrls(); customPreview(); }
    catch { URL.revokeObjectURL(url); if (!disposed && token === customLoads[index]) $(".sl-custom-status").textContent = "That picture could not be opened. Please try another."; }
  }));
  on($(".sl-custom-preview"), "click", event => { if (!customImages[1] || customPoints.length >= 20) return; const r = $(".sl-custom-preview img").getBoundingClientRect(); customPoints.push({ x: clamp((event.clientX - r.left) / r.width * 100, 0, 100), y: clamp((event.clientY - r.top) / r.height * 100, 0, 100) }); customPreview(); });
  on($(".sl-custom-undo"), "click", () => { customPoints.pop(); customPreview(); });
  on($(".sl-custom-play"), "click", () => {
    if ($( ".sl-custom-play").disabled) return;
    custom = { title: $(".sl-custom-name").value.trim() || "My picture puzzle", urls: customImages.map(i => i.url), aspect: customAspect, targets: customPoints.map((p, i) => ({ id: `custom-${i}`, x: clamp(p.x - 3, 0, 94), y: clamp(p.y - 3 * customAspect, 0, 100 - 6 * customAspect), w: 6, h: 6 * customAspect, label: `Your difference ${i + 1}` })) };
    newRound(); $(".sl-custom").open = false; $(".sl-workspace").scrollIntoView({ block: "start", behavior: "smooth" });
  });
  const unsubscribe = wallet.subscribe(() => { if (!disposed) { collection(); refreshCoins(); } });
  const timer = setInterval(() => { const now = performance.now(), dt = (now - lastTick) / 1000; lastTick = now; if (!game || document.hidden) return; const was = game.phase; if (tickSpotlight(game, dt)) update(); if (was === "playing" && game.phase === "failed") say("Time is up. Your earned coins are safe. Try again or reveal the remaining changes."); }, 100);
  newRound();
  return () => { disposed = true; generation++; clearInterval(timer); events.abort(); unsubscribe(); unmountWallet(); finale.dispose(); audio.dispose(); for (const url of customUrls) URL.revokeObjectURL(url); wrapper.remove(); };
}
