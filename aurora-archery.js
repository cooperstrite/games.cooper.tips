import { LEVELS, QUIVER, getTarget, getWind, starsForScore, createArcheryModel } from "./archery-engine.js";
import { createArcheryRenderer } from "./archery-renderer.js";

const COLORS = [
  { name: "Mint green", value: "#8be7ba" }, { name: "Glacier blue", value: "#86ccef" },
  { name: "Sunset coral", value: "#fa9e88" }, { name: "Honey gold", value: "#f1cf75" },
  { name: "Lavender", value: "#bda0ef" }, { name: "Rose pink", value: "#efa9c9" },
];
const DESIGNS = { ranger: "Woodcraft", moonsteel: "Moonsteel", aurora: "Aurora crystal" };
const STORAGE_KEY = "aurora-archery-v2";
const distanceLabel = level => level.shotDistances ? `${Math.min(...level.shotDistances)}-${Math.max(...level.shotDistances)}` : level.motionX ? `${level.distance - level.motionX}-${level.distance + level.motionX}` : String(level.distance);
const windLabel = wind => Math.abs(wind) < 0.15 ? "calm" : `${Math.abs(wind).toFixed(1)} m/s ${wind > 0 ? "right" : "left"}`;
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/></svg>';

function starsMarkup(count) {
  return [0, 1, 2].map(index => `<span class="${index < count ? "is-earned" : ""}">${STAR}</span>`).join("");
}

export function createAuroraArchery(root) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { /* Storage is optional. */ }
  const records = {};
  LEVELS.forEach(level => { records[level.id] = Number.isFinite(saved.records?.[level.id]) ? Math.max(0, Math.min(60, saved.records[level.id])) : 0; });
  const gear = {
    design: Object.hasOwn(DESIGNS, saved.design) ? saved.design : "ranger",
    color: COLORS.some(color => color.value === saved.color) ? saved.color : COLORS[0].value,
  };
  const model = createArcheryModel(saved.level);
  const state = model.state;
  const wrapper = document.createElement("div");
  wrapper.className = "archery-range";
  wrapper.innerHTML = `
    <div class="archery-heading">
      <div><p class="archery-eyebrow">THE AURORA TRAILS</p><h3 class="archery-level-title"></h3><p class="archery-goal"></p></div>
      <div class="archery-personal-best"><span>Your best</span><strong>0 / 60</strong><div class="archery-stars" role="img" aria-label="No stars yet"></div></div>
    </div>
    <nav class="archery-levels" aria-label="Archery levels">
      ${LEVELS.map((level, index) => `<button type="button" data-level="${level.id}" aria-label="Level ${index + 1}: ${level.name}, ${distanceLabel(level)} meters, ${level.tag}"><span class="archery-level-number">${index + 1}</span><span><strong>${level.name}</strong><small>${level.tag}</small></span><span class="archery-level-check" aria-hidden="true"></span></button>`).join("")}
    </nav>
    <label class="archery-level-picker"><span>Choose a trail</span><select aria-label="Choose archery level">${LEVELS.map((level, index) => `<option value="${level.id}">${index + 1}. ${level.name} - ${distanceLabel(level)} m - ${level.tag}</option>`).join("")}</select></label>
    <p class="archery-level-tip"></p>
    <div class="archery-stats" aria-live="off">
      <div><span>Score</span><strong class="archery-score">0 <small>/ 60</small></strong></div>
      <div><span>Arrows left</span><strong class="archery-arrows">6 <small>/ 6</small></strong></div>
      <div><span>Target distance</span><strong class="archery-distance">20 <small>m</small></strong></div>
      <div class="archery-wind"><span>Wind <svg viewBox="0 0 44 16" aria-hidden="true"><path d="M2 8h36m-7-6 7 6-7 6M3 2h12M3 14h18"/></svg></span><strong>Calm</strong></div>
    </div>
    <div class="archery-scene" tabindex="0" role="group" aria-label="Archery range. Drag to aim. Arrow up and down adjust angle; left and right adjust power; Space shoots; P pauses.">
      <canvas class="archery-canvas" role="img" aria-label="A hooded archer with a wooden bow in a mountain meadow. A ringed target, windsock, and dotted flight path show where the arrow will go."></canvas>
      <div class="archery-scene-label"><span class="archery-scene-dot"></span><span class="archery-scene-mode">Stationary target</span></div>
      <div class="archery-scene-hint">Drag to aim <span>&middot;</span><span class="archery-keyboard-hint">Space to shoot</span><span class="archery-touch-hint">Tap Shoot below</span></div>
      <div class="archery-pause-overlay" hidden><strong>Range paused</strong><span>Press Resume or P to continue.</span></div>
      <div class="archery-result" hidden>
        <p class="archery-eyebrow">QUIVER COMPLETE</p><h3></h3><div class="archery-stars" role="img"></div><strong class="archery-final-score"></strong><p></p>
        <div><button class="primary-btn archery-next" type="button">Next trail</button><button class="archery-retry" type="button">Try again</button></div>
      </div>
    </div>
    <p class="archery-status" role="status" aria-live="polite"></p>
    <div class="archery-controls">
      <label class="archery-control"><span>Bow angle <output class="archery-angle-value">0&deg;</output></span><input type="range" min="2" max="65" step="0.1" aria-label="Bow angle"><small>Lower shot <span>Higher arc</span></small></label>
      <label class="archery-control"><span>Draw power <output class="archery-power-value">70%</output></span><input type="range" min="25" max="100" step="1" value="70" aria-label="Draw power"><small>Shorter flight <span>Farther flight</span></small></label>
      <div class="archery-fire-controls"><button class="primary-btn archery-shoot" type="button">Shoot arrow</button><button class="archery-pause" type="button">Pause</button><button class="archery-reset" type="button">Reset level</button></div>
    </div>
    <div class="archery-flight-info" aria-live="off"><label><input type="checkbox" class="archery-guide" checked> Show flight guide</label><button class="archery-help" type="button">How to play</button><span class="archery-flight-time"></span><span class="archery-wind-hint"></span></div>
    <div class="archery-details-grid">
      <section class="archery-instructions" aria-labelledby="archery-how-title">
        <h4 id="archery-how-title">How to play</h4>
        <ol><li><strong>Aim the bow.</strong> Drag in the range or use Bow angle. Raising the angle makes a higher arc.</li><li><strong>Set your power.</strong> More power sends the arrow faster and farther. Follow the dotted flight path toward the target.</li><li><strong>Read the range, then shoot.</strong> Wind to the right pushes arrows farther; wind to the left slows them. Lead a moving target: aim where it will be when the arrow arrives. Recheck the meters after every shot: some trails change wind or distance between arrows.</li></ol>
        <p>You have <strong>6 arrows</strong>. Gold scores 9&ndash;10 points; a miss scores 0. Meet the trail's goal to earn a star. You can choose any trail above.</p>
        <p class="archery-key-help">Keyboard: <kbd>&uarr;</kbd> <kbd>&darr;</kbd> aim &nbsp; <kbd>&larr;</kbd> <kbd>&rarr;</kbd> power &nbsp; <kbd>Space</kbd> shoot &nbsp; <kbd>P</kbd> pause</p>
      </section>
      <section class="archery-target-card" aria-labelledby="archery-face-title">
        <h4 id="archery-face-title">Your target</h4>
        <canvas class="archery-face" role="img" aria-label="Target close-up with five colored scoring bands. Gold 9 to 10, red 7 to 8, blue 5 to 6, black 3 to 4, white 1 to 2 points."></canvas>
        <div class="archery-ring-key"><span style="--ring:#f6cf5a">9&ndash;10</span><span style="--ring:#ed6572">7&ndash;8</span><span style="--ring:#529eca">5&ndash;6</span><span style="--ring:#293a4c">3&ndash;4</span><span style="--ring:#ecede3">1&ndash;2</span></div>
        <p>Marks show where your arrows hit. The gold center is the bullseye.</p>
      </section>
      <fieldset class="archery-gear"><legend>Your arrows</legend>
        <svg class="archery-arrow-preview" viewBox="0 0 220 55" role="img" aria-label="Your selected arrow design">
          <path class="archery-preview-shaft" d="M28 27H193"/><path d="m36 27-19-17H4l18 17L4 44h13Z" class="archery-preview-feather"/>
          <path d="m24 15 13 12-13 12" fill="none" stroke="#fff8dc" stroke-width="1" opacity="0.7"/>
          <path class="archery-preview-head archery-head-ranger" d="m210 27-23-8 5 8-5 8Z"/>
          <path class="archery-preview-head archery-head-moonsteel" d="m215 27-30-14 6 14-6 14Z"/>
          <path class="archery-preview-head archery-head-aurora" d="m216 27-19-11-10 11 10 11Z"/>
        </svg>
        <label class="archery-gear-select"><span>Arrow design</span><select aria-label="Arrow design">${Object.entries(DESIGNS).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>
        <fieldset class="archery-colors"><legend>Feather color</legend><div>${COLORS.map(color => `<label class="archery-color-choice" title="${color.name}"><input type="radio" name="archery-arrow-color" value="${color.value}" aria-label="${color.name}"><span style="--swatch:${color.value}"></span></label>`).join("")}</div></fieldset>
        <p>Every arrow design flies the same. Pick your favorite look.</p>
      </fieldset>
    </div>
    <section class="archery-history" aria-labelledby="archery-history-title"><h4 id="archery-history-title">This quiver</h4><ol class="archery-log"></ol></section>`;
  root.append(wrapper);
  const $ = selector => wrapper.querySelector(selector);
  const angleInput = $('[aria-label="Bow angle"]');
  const powerInput = $('[aria-label="Draw power"]');
  const shoot = $(".archery-shoot");
  const pause = $(".archery-pause");
  const status = $(".archery-status");
  const scene = $(".archery-scene");
  const result = $(".archery-result");
  const renderer = createArcheryRenderer($(".archery-canvas"), $(".archery-face"), model, () => gear);
  let frame = null;
  let lastTime = performance.now();
  let lastHUD = 0;
  let lastShotCount = 0;
  let dragging = false;
  let disposed = false;

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ records, level: state.level.id, ...gear })); } catch { /* Storage is optional. */ }
  }
  function updateGear() {
    wrapper.dataset.arrowDesign = gear.design;
    wrapper.style.setProperty("--arrow-color", gear.color);
    $('[aria-label="Arrow design"]').value = gear.design;
    wrapper.querySelectorAll('[name="archery-arrow-color"]').forEach(input => { input.checked = input.value === gear.color; });
    $(".archery-arrow-preview").setAttribute("aria-label", `${DESIGNS[gear.design]} arrow with ${COLORS.find(color => color.value === gear.color).name.toLowerCase()} feathers`);
  }
  function updateControls() {
    angleInput.value = String(state.angle);
    powerInput.value = String(state.power);
    $(".archery-angle-value").textContent = `${state.angle.toFixed(1)}\u00b0`;
    $(".archery-power-value").textContent = `${state.power}%`;
    angleInput.setAttribute("aria-valuetext", `${state.angle.toFixed(1)} degrees`);
    powerInput.setAttribute("aria-valuetext", `${state.power} percent`);
    const blocked = state.phase !== "aiming" || state.paused;
    angleInput.disabled = powerInput.disabled = shoot.disabled = blocked;
    shoot.textContent = state.paused ? "Paused" : state.phase === "flying" ? "Arrow in flight..." : state.phase === "complete" ? "Quiver complete" : "Shoot arrow";
    pause.textContent = state.paused ? "Resume" : "Pause";
    pause.disabled = state.phase === "complete";
    $(".archery-pause-overlay").hidden = !state.paused;
    wrapper.dataset.phase = state.paused ? "paused" : state.phase;
  }
  function updateHUD() {
    const wind = getWind(state.level, state.time, state.shots.length);
    const target = getTarget(state.level, state.time, state.shots.length);
    $(".archery-score").innerHTML = `${state.score} <small>/ 60</small>`;
    $(".archery-arrows").innerHTML = `${state.arrowsLeft} <small>/ ${QUIVER}</small>`;
    $(".archery-distance").innerHTML = `${target.x.toFixed(state.level.motionX ? 1 : 0)} <small>m</small>`;
    $(".archery-wind strong").textContent = Math.abs(wind) < 0.15 ? "Calm" : `${Math.abs(wind).toFixed(1)} m/s ${wind > 0 ? "right" : "left"}`;
    $(".archery-wind").dataset.direction = Math.abs(wind) < 0.15 ? "calm" : wind > 0 ? "right" : "left";
    $(".archery-wind-hint").textContent = Math.abs(wind) < 0.15 ? "Still air: watch the dotted path." : wind > 0 ? "Tailwind pushes your arrow farther." : "Headwind slows your arrow down.";
    const crossing = renderer.prediction().crossing;
    $(".archery-flight-time").textContent = state.arrow ? `${state.arrow.age.toFixed(1)} s in flight, ${state.arrow.y.toFixed(1)} m high` : crossing && crossing.y > 0 ? `About ${crossing.time.toFixed(1)} s to the target` : "Guide falls short: add power or adjust the angle.";
  }
  function updateLevel() {
    const level = state.level;
    $(".archery-level-title").textContent = level.name;
    $('[aria-label="Choose archery level"]').value = level.id;
    $(".archery-goal").textContent = `Goal: ${level.goal} points from 6 arrows. A perfect quiver is 60.`;
    $(".archery-level-tip").textContent = level.tip;
    $(".archery-scene-mode").textContent = level.shotDistances ? "New distance after every shot" : level.shotWinds ? "New steady wind after every shot" : level.motionX ? "Target moves nearer, farther, up, and down" : level.motionY ? "Target rises and falls" : "Stationary target";
    $(".archery-personal-best strong").textContent = `${records[level.id]} / 60`;
    const count = starsForScore(level, records[level.id]);
    $(".archery-personal-best .archery-stars").innerHTML = starsMarkup(count);
    $(".archery-personal-best .archery-stars").setAttribute("aria-label", `${count} of 3 stars`);
    wrapper.querySelectorAll("[data-level]").forEach(button => {
      const selected = button.dataset.level === level.id;
      button.setAttribute("aria-current", selected ? "step" : "false");
      button.classList.toggle("is-complete", starsForScore(LEVELS.find(item => item.id === button.dataset.level), records[button.dataset.level]) > 0);
    });
  }
  function showHistory() {
    $(".archery-log").innerHTML = state.shots.length ? state.shots.map(shot => `<li class="${shot.points ? "is-hit" : "is-miss"}"><span>Arrow ${shot.number}</span><strong>${shot.points ? `${shot.points} points` : "Miss"}</strong><small>${shot.reason === "short" ? "Landed short" : Math.abs(shot.offset) < 0.04 ? "Center hit" : `${Math.abs(shot.offset * 100).toFixed(0)} cm ${shot.offset > 0 ? "above" : "below"} center`}</small><small>${shot.targetX.toFixed(0)} m &middot; ${windLabel(shot.wind)}</small></li>`).join("") : '<li class="archery-empty-log">Six arrows, one fresh target. Your shots will appear here.</li>';
  }
  function onShot() {
    lastShotCount = state.shots.length;
    const shot = state.impact;
    status.className = `archery-status ${shot.points ? "is-hit" : "is-miss"}`;
    status.textContent = shot.points === 10 ? "Bullseye! 10 points. That arrow landed in the gold center." : shot.points ? `${shot.points} points! ${Math.abs(shot.offset * 100).toFixed(0)} cm ${shot.offset > 0 ? "above" : "below"} center. ${shot.offset > 0 ? "Lower the angle a little" : "Raise the angle a little"} for your next shot.` : shot.reason === "short" ? "Your arrow landed short. Add power or adjust the angle, then check the dotted path." : shot.reason === "high" ? "High miss. Lower the angle or reduce power to bring the arrow down." : "Low miss. Raise the angle or add power to lift your next shot.";
    if (state.arrowsLeft > 0 && state.level.shotDistances) {
      status.textContent = `${shot.points ? `${shot.points} points!` : "Miss."} Next target: ${getTarget(state.level, state.time, state.shots.length).x} m (was ${shot.targetX.toFixed(0)} m). Recalibrate your angle and power; the wind is calm.`;
    } else if (state.arrowsLeft > 0 && state.level.shotWinds) {
      status.textContent = `${shot.points ? `${shot.points} points!` : "Miss."} New wind: ${windLabel(getWind(state.level, state.time, state.shots.length))}. It stays steady for your next arrow. Recalibrate before shooting.`;
    }
    showHistory();
    if (state.phase === "complete") {
      const stars = starsForScore(state.level, state.score);
      records[state.level.id] = Math.max(records[state.level.id], state.score);
      updateLevel(); persist();
      result.hidden = false;
      result.querySelector("h3").textContent = stars ? "Trail cleared!" : "Keep practicing";
      result.querySelector(".archery-final-score").textContent = `${state.score} / 60`;
      result.querySelector(".archery-stars").innerHTML = starsMarkup(stars);
      result.querySelector(".archery-stars").setAttribute("aria-label", `${stars} of 3 stars`);
      result.querySelector("p:not(.archery-eyebrow)").textContent = stars ? "Great shooting. Try another trail or chase three stars." : `You need ${state.level.goal} points to clear this trail. Use the guide and adjust after each shot.`;
      $(".archery-next").hidden = !stars;
      $(".archery-next").textContent = state.level === LEVELS[LEVELS.length - 1] ? "Back to first trail" : "Next trail";
      status.textContent = `Quiver complete: ${state.score} out of 60. ${stars ? "Trail cleared!" : `Reach ${state.level.goal} points to clear the trail.`}`;
    }
    updateControls(); updateHUD();
  }
  function resetLevel(id = state.level.id) {
    model.reset(id);
    lastShotCount = 0;
    result.hidden = true;
    status.className = "archery-status";
    status.textContent = "Set your angle and power, follow the dotted guide, then shoot. You have six arrows.";
    updateLevel(); updateControls(); updateHUD(); showHistory(); persist();
  }
  function fire() {
    if (!model.shoot()) return;
    state.arrow.gear = { ...gear };
    status.className = "archery-status";
    status.textContent = "Arrow away! Watch its flight and where it meets the target.";
    updateControls(); updateHUD();
  }
  function togglePause() {
    model.togglePause();
    updateControls();
    if (state.phase !== "complete") status.textContent = state.paused ? "Paused. The target, wind, and arrow are frozen. Press Resume or P to continue." : "Range resumed. Read the wind and time your next shot.";
  }
  function aimFromPointer(event) {
    model.setAim(renderer.aimAt(event.clientX, event.clientY), state.power);
    updateControls(); updateHUD();
  }
  function onKey(event) {
    if (event.target instanceof Element && event.target.closest("input, select, textarea")) return;
    const key = event.key.toLowerCase();
    if (event.code === "Space") {
      if (event.target instanceof Element && event.target.closest("button")) return;
      event.preventDefault();
      if (!event.repeat) fire();
    } else if (key === "p") {
      if (!event.repeat) togglePause();
    } else if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      event.preventDefault();
      model.setAim(state.angle + (key === "arrowup" ? 0.5 : key === "arrowdown" ? -0.5 : 0), state.power + (key === "arrowright" ? 1 : key === "arrowleft" ? -1 : 0));
      updateControls(); updateHUD();
    }
  }
  function onVisibility() {
    if (document.hidden && !state.paused && state.phase !== "complete") togglePause();
  }
  function animate(now) {
    if (disposed) return;
    model.advance(Math.min(0.05, (now - lastTime) / 1000));
    lastTime = now;
    if (lastShotCount !== state.shots.length) onShot();
    if (now - lastHUD > 100) { updateHUD(); lastHUD = now; }
    renderer.draw();
    frame = requestAnimationFrame(animate);
  }
  angleInput.addEventListener("input", () => { model.setAim(Number(angleInput.value), state.power); updateControls(); updateHUD(); });
  powerInput.addEventListener("input", () => { model.setAim(state.angle, Number(powerInput.value)); updateControls(); updateHUD(); });
  shoot.addEventListener("click", () => { fire(); scene.focus({ preventScroll: true }); });
  pause.addEventListener("click", () => { togglePause(); scene.focus({ preventScroll: true }); });
  $(".archery-reset").addEventListener("click", () => resetLevel());
  $(".archery-retry").addEventListener("click", () => resetLevel());
  $(".archery-next").addEventListener("click", () => resetLevel(LEVELS[(LEVELS.indexOf(state.level) + 1) % LEVELS.length].id));
  wrapper.querySelectorAll("[data-level]").forEach(button => button.addEventListener("click", () => resetLevel(button.dataset.level)));
  $('[aria-label="Choose archery level"]').addEventListener("change", event => resetLevel(event.target.value));
  $(".archery-guide").addEventListener("change", event => renderer.showGuide(event.target.checked));
  $(".archery-help").addEventListener("click", () => {
    const instructions = $(".archery-instructions");
    instructions.tabIndex = -1;
    instructions.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    instructions.focus({ preventScroll: true });
  });
  $('[aria-label="Arrow design"]').addEventListener("change", event => { gear.design = event.target.value; updateGear(); persist(); });
  wrapper.querySelectorAll('[name="archery-arrow-color"]').forEach(input => input.addEventListener("change", () => { if (input.checked) { gear.color = input.value; updateGear(); persist(); } }));
  scene.addEventListener("pointerdown", event => {
    if (event.target !== $(".archery-canvas") || state.phase !== "aiming" || state.paused) return;
    dragging = true; scene.setPointerCapture(event.pointerId); scene.focus({ preventScroll: true }); aimFromPointer(event); event.preventDefault();
  });
  scene.addEventListener("pointermove", event => { if (dragging) aimFromPointer(event); });
  scene.addEventListener("pointerup", () => { dragging = false; });
  scene.addEventListener("pointercancel", () => { dragging = false; });
  window.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", onVisibility);
  const observer = new ResizeObserver(() => { renderer.resize(); renderer.draw(); });
  observer.observe($(".archery-canvas"));
  updateGear(); resetLevel(); renderer.draw();
  frame = requestAnimationFrame(animate);
  return () => {
    disposed = true; cancelAnimationFrame(frame); observer.disconnect();
    window.removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onVisibility); wrapper.remove();
  };
}
