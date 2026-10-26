import { AIRCRAFT, KNOTS, DEG, clamp } from "./runway-engine.js";
import { HOME_AIRFIELDS, WEATHER, terrainHeight, airfieldsNear, headingDifference, navigationTo } from "./free-flight-world.js";
import { createFreeFlight, beginFreeFlight, advanceFreeFlight, freeFlightInstruments } from "./free-flight-engine.js";
import { createFreeFlightRenderer } from "./free-flight-renderer.js";
import { createFreeFlightAudio } from "./free-flight-audio.js";

const SAVE_KEY = "cooper-free-flight-v1";
const minutes = time => Math.floor(time / 60) + ":" + String(Math.floor(time % 60)).padStart(2, "0");
export function readFreeFlightSettings(storage) {
  let saved = {}; try { saved = JSON.parse((storage ?? globalThis.localStorage)?.getItem(SAVE_KEY) || "{}") || {}; } catch { /* Fresh preferences. */ }
  const valid = (value, choices, fallback) => choices.includes(value) ? value : fallback;
  return { aircraft: valid(saved.aircraft, Object.keys(AIRCRAFT), "passenger"), location: valid(saved.location, HOME_AIRFIELDS.map(f => f.id), "azure"),
    departure: valid(saved.departure, ["airborne", "runway"], "airborne"), weather: valid(saved.weather, Object.keys(WEATHER), "breeze"),
    assist: saved.assist !== false, invertPitch: saved.invertPitch === true, effects: saved.effects !== false };
}
export function createFreeFlightGame(root) {
  const settings = readFreeFlightSettings(), audio = createFreeFlightAudio(settings), listeners = [], keys = new Set(), touch = { pitch: 0, roll: 0, rudder: 0, brake: false };
  let state = createFreeFlight(settings), renderer = null, disposed = false, paused = false, frame = 0, last = 0, uiTime = 0, chartTime = 0, crashElapsed = 0, view = "chase", selected = null, lookYaw = 0, lookPitch = 0, chartRange = 25000, chartCache = null, mapFields = [];
  const wrapper = document.createElement("section"); wrapper.className = "rg-game ff-game"; wrapper.setAttribute("aria-label", "Free Flight simulator");
  wrapper.innerHTML = `
    <div class="rg-topline"><span class="rg-brand"><span class="rg-brand-mark" aria-hidden="true">FF</span> THE OPEN SKY</span><span class="rg-beta">3D FREE FLIGHT</span></div>
    <div class="ff-intro"><h3>Take the long way home.</h3><p>A coastline to follow. A valley to discover. Fly for as long as you like, and land whenever you feel like it.</p></div>
    <div class="rg-stage ff-stage" tabindex="0" aria-label="Free flight view. W and S pitch; A and D bank; plus and minus change power.">
      <canvas class="rg-canvas" aria-label="Live 3D aircraft and open world"></canvas>
      <div class="rg-loading" role="status"><span class="rg-loader"></span><strong>Opening the skies</strong><span>Preparing your aircraft and the surrounding landscape...</span></div>
      <div class="rg-flight-header"><div><span class="rg-micro ff-region"></span><strong class="rg-callout">READY TO EXPLORE</strong></div><span class="rg-view-label">CHASE CAMERA</span></div>
      <div class="ff-compass" aria-label="Aircraft heading"><span>N</span><strong data-readout="heading">000</strong><span>HDG</span></div>
      <div class="rg-instruments rg-instruments-left"><div><span>AIRSPEED <small>KT</small></span><strong data-readout="speed">0</strong><small data-readout="landing"></small></div><div><span>POWER</span><strong data-readout="power">0%</strong></div></div>
      <div class="rg-instruments rg-instruments-right"><div><span>ALTITUDE <small>FT MSL</small></span><strong data-readout="altitude">0</strong><small data-readout="height"></small></div><div><span>VERTICAL <small>FT/MIN</small></span><strong data-readout="vertical">0</strong></div></div>
      <div class="rg-aim" hidden aria-hidden="true"><span class="rg-aim-wing"></span><span class="rg-aim-dot"></span><span class="rg-aim-wing"></span></div>
      <div class="rg-cockpit" hidden><div class="rg-cockpit-frame"></div><div class="rg-cockpit-panel"><span>FREE FLIGHT</span><span class="rg-attitude"></span><span>OPEN AIRSPACE</span></div></div>
      <div class="ff-navigation"><span class="ff-nav-arrow" aria-hidden="true">&#8593;</span><span class="ff-nav-text">The world is yours to explore.</span></div>
      <div class="rg-weather"><span class="rg-wind-arrow" aria-hidden="true">&#8599;</span><span data-readout="wind"></span></div><div class="rg-attitude-strip"><span data-readout="pitch"></span><span data-readout="bank"></span></div>
      <div class="rg-paused" hidden><strong>Flight paused</strong><span>Press P or Resume to continue exploring.</span><button type="button" class="ff-resume">Resume flight</button></div>
      <div class="rg-result" hidden><span class="rg-micro">FLIGHT ENDED</span><h3>Ready for another flight?</h3><p class="rg-result-reason"></p><div class="ff-result-stats"></div><button type="button" class="rg-primary ff-retry">Fly again</button><button type="button" class="ff-result-setup">Change aircraft or location</button></div>
    </div>
    <div class="ff-message" role="status" aria-live="polite">Start in the air and explore, or choose a runway departure below. There are no required destinations.</div>
    <div class="rg-toolbar"><button type="button" class="rg-primary ff-start" disabled>Start flying</button><button type="button" class="ff-pause" disabled>Pause</button><button type="button" class="ff-new">New flight</button><label class="rg-camera-label">Camera <select class="ff-camera" aria-label="Flight camera"><option value="chase">Chase</option><option value="cockpit">Cockpit</option><option value="orbit">Orbit / look around</option></select></label><button type="button" class="ff-recenter">Recenter view</button><button type="button" class="ff-sound" aria-pressed="true">Sound on</button><button type="button" class="ff-fullscreen">Expand view</button></div>
    <div class="rg-flight-controls"><label class="rg-throttle">Throttle <output>0%</output><input type="range" min="0" max="100" step="1" aria-label="Throttle"><span>IDLE <span>FULL POWER</span></span></label><div class="rg-switches"><button type="button" data-toggle="gear" aria-pressed="false">Gear UP <kbd>G</kbd></button><button type="button" data-toggle="flaps" aria-pressed="false">Flaps UP <kbd>F</kbd></button><button type="button" class="rg-brake" data-hold="brake">Hold brake <kbd>B</kbd></button></div></div>
    <div class="rg-touch-controls" aria-label="Touch flight controls"><div><button type="button" data-hold="rudder" data-value="-1">Rudder L</button><button type="button" data-hold="rudder" data-value="1">Rudder R</button></div><div class="rg-pad"><button type="button" data-hold="pitch" data-value="1">Nose up</button><button type="button" data-hold="roll" data-value="-1">Bank left</button><button type="button" data-hold="roll" data-value="1">Bank right</button><button type="button" data-hold="pitch" data-value="-1">Nose down</button></div></div>
    <div class="ff-trip"><span><strong data-readout="time">0:00</strong> flight time</span><span><strong data-readout="travel">0.0 KM</strong> explored</span><span><strong data-readout="landings">0</strong> landings</span><span>Fly without a time limit.</span></div>
    <section class="ff-navigation-panel" aria-label="Navigation chart"><div><div class="ff-chart-heading"><span class="rg-micro">YOUR CORNER OF THE WORLD</span><label>Chart range <select class="ff-zoom" aria-label="Chart range"><option value="10000">10 km</option><option value="25000" selected>25 km</option><option value="50000">50 km</option></select></label></div><canvas class="ff-chart" width="600" height="400" role="img" aria-label="North-up chart showing the aircraft and nearby optional airfields"></canvas><p class="ff-chart-key"><span>Teal: your aircraft</span><span>White: optional airfields</span><span>Gold: marked airfield</span></p></div><div class="ff-nearby"><span class="rg-micro">SOMEWHERE TO STOP</span><h4>Runways along the way.</h4><p>Select an airfield for its bearing and distance. The marker is a guide; you fly the aircraft.</p><div class="ff-airfield-list"></div><button type="button" class="ff-clear-marker" hidden>Clear navigation marker</button></div></section>
    <section class="ff-planning"><div class="rg-section-heading"><div><span class="rg-micro">SET OUT ON YOUR OWN TERMS</span><h3>Your aircraft. Your horizon.</h3></div><span class="rg-setup-hint">Choose before starting a new flight.</span></div><div class="ff-aircraft-grid">${Object.values(AIRCRAFT).map(a => `<button type="button" class="ff-aircraft" data-aircraft="${a.id}" aria-pressed="false"><span class="rg-micro">${a.type}</span><strong>${a.name}</strong><span>${{ passenger: "Smooth and steady", cargo: "Heavy, deliberate handling", bush: "Low and slow exploring", military: "Fast, responsive flying" }[a.id]}</span></button>`).join("")}</div><p class="ff-aircraft-detail"></p><div class="ff-departure-grid"><label>Starting location<select name="location" aria-label="Starting location">${HOME_AIRFIELDS.map(f => `<option value="${f.id}">${f.name}</option>`).join("")}</select></label><label>Start your flight<select name="departure" aria-label="Departure type"><option value="airborne">Already flying</option><option value="runway">On the runway</option></select></label><label>Weather<select name="weather" aria-label="Flight weather">${Object.entries(WEATHER).map(([id, w]) => `<option value="${id}">${w.name}</option>`).join("")}</select></label></div><p class="ff-location-description"></p></section>
    <div class="rg-control-preferences"><label><input type="checkbox" data-setting="assist"> Stability assist</label><label><input type="checkbox" data-setting="invertPitch"> Inverted flight controls</label><p class="ff-pitch-help"></p></div>
    <details class="rg-instructions ff-instructions" open><summary>A little flight school <span>Fly, explore, land if you like</span></summary><div class="rg-lesson-grid"><div><b>01</b><strong>Make the sky your own.</strong><p>W / Up raises the nose; S / Down lowers it. A / Left and D / Right bank into a turn. Hold a bank to turn through any heading, then level the wings. With stability assist, released controls ease back toward level flight.</p></div><div><b>02</b><strong>Manage your speed.</strong><p>Use + / - or the throttle slider for power. Pulling up costs speed; lowering the nose gains it. A stall warning means you need more speed: lower the nose and add power. Drag the view in Cockpit or Orbit to look around.</p></div><div><b>03</b><strong>Stop somewhere new.</strong><p>Use the chart to find a runway. Lower the gear (G), choose landing flaps (F), and slow to the shown landing speed. Approach either end, level the wings, and gently raise the nose before touchdown. Idle power and hold B to stop. To depart again, set approach flaps, apply full power, and raise the nose at the shown takeoff speed.</p></div></div><div class="rg-keyboard"><span><kbd>W / S</kbd> Pitch</span><span><kbd>A / D</kbd> Bank</span><span><kbd>Q / E</kbd> Rudder / ground steering</span><span><kbd>+ / -</kbd> Throttle</span><span><kbd>G</kbd> Gear</span><span><kbd>F</kbd> Flaps</span><span><kbd>B</kbd> Brake</span><span><kbd>P</kbd> Pause</span><span><kbd>C</kbd> Camera</span></div><p class="ff-footnote">The world continues beyond the chart. New terrain and airfields appear as you travel. Altitude is above sea level; AGL is your height above the ground below. Short grass strips suit the bush plane; larger aircraft need more runway.</p></details>`;
  root.append(wrapper);
  const $ = selector => wrapper.querySelector(selector), $$ = selector => [...wrapper.querySelectorAll(selector)], stage = $(".ff-stage"), canvas = $(".rg-canvas"), throttle = $(".rg-throttle input"), result = $(".rg-result");
  const readouts = Object.fromEntries($$("[data-readout]").map(e => [e.dataset.readout, e]));
  const on = (target, event, handler, options) => { target.addEventListener(event, handler, options); listeners.push(() => target.removeEventListener(event, handler, options)); };
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(settings)); } catch { /* Flight still works without storage. */ } };
  const active = () => ["flying", "rollout", "parked"].includes(state.phase);
  function clearInput() { keys.clear(); Object.assign(touch, { pitch: 0, roll: 0, rudder: 0, brake: false }); $$("[data-hold]").forEach(b => b.classList.remove("is-held")); }
  function message(text) { $(".ff-message").textContent = text; }
  function setup() {
    $$("[data-aircraft]").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.aircraft === settings.aircraft)); b.disabled = active(); });
    for (const key of ["location", "departure", "weather"]) { const select = $("[name=" + key + "]"); select.value = settings[key]; select.disabled = active(); }
    $$("[data-setting]").forEach(input => { input.checked = settings[input.dataset.setting]; });
    const landingAdvice = state.aircraft.id === "military" ? "Fast and responsive. Slow toward 163 knots for landing and leave room to brake on a long runway." : state.aircraft.landing;
    $(".ff-aircraft-detail").textContent = state.aircraft.name + " - " + landingAdvice + (state.aircraft.fixedGear ? " Its landing gear stays down." : "");
    $(".ff-location-description").textContent = state.field.description;
    $(".ff-pitch-help").textContent = settings.invertPitch ? "Up / W lowers the nose; Down / S raises it. Touch buttons follow their labels." : "Up / W raises the nose; Down / S lowers it. Touch buttons follow their labels.";
    $(".ff-sound").textContent = settings.effects ? "Sound on" : "Sound off"; $(".ff-sound").setAttribute("aria-pressed", String(settings.effects)); save();
  }
  function configure() {
    audio.pause(); clearInput(); paused = false; selected = null; crashElapsed = 0; lookYaw = lookPitch = 0; chartCache = null;
    state = createFreeFlight(settings); renderer?.setFlight(state); result.hidden = true;
    message(settings.departure === "airborne" ? "Start flying whenever you are ready. Choose any heading and follow your curiosity." : "Ready on the runway. Set approach flaps, apply full power, and raise the nose at " + Math.round(state.aircraft.target * KNOTS) + " knots.");
    setup(); updateUI(); drawChart();
  }
  function begin() {
    if (!renderer) return;
    if (state.phase !== "ready") configure();
    beginFreeFlight(state); paused = false; clearInput(); audio.start(); setup(); updateUI(); stage.focus({ preventScroll: true });
    message(state.phase === "parked" ? "Take your time. Apply full power, keep straight with Q / E, and raise the nose near " + Math.round(state.aircraft.target * KNOTS) + " knots." : "Open airspace. Explore in any direction. Nearby airfields are optional places to stop.");
    if (window.matchMedia("(max-width: 760px)").matches) stage.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function pause(value) {
    if (!active()) return;
    paused = typeof value === "boolean" ? value : !paused; clearInput(); if (paused) audio.pause(); else { audio.start(); last = performance.now(); } updateUI();
  }
  function equipment(name) {
    if (paused || state.phase === "crashed") return;
    if (name === "gear") { if (state.aircraft.fixedGear || ["parked", "rollout"].includes(state.phase) || state.phase === "ready" && state.departure === "runway") return; state.gear = !state.gear; }
    if (name === "flaps") state.flaps = (state.flaps + 1) % 3;
    audio.effect("gear"); updateUI();
  }
  function cameraMode(value) { view = value; lookYaw = lookPitch = 0; $(".ff-camera").value = value; updateUI(); }
  function mark(field) { selected = field; chartCache = null; message("Navigation marker: " + field.name + ". Follow its bearing if you would like to visit. You can clear the marker at any time."); updateUI(); drawChart(); }
  function updateUI() {
    const i = freeFlightInstruments(state, selected), flying = active(); wrapper.dataset.phase = state.phase; wrapper.dataset.paused = String(paused); wrapper.dataset.aircraft = state.aircraft.id;
    readouts.speed.textContent = Math.round(i.knots); readouts.speed.classList.toggle("rg-caution", i.stall);
    readouts.landing.textContent = (state.phase === "parked" || state.phase === "rollout" || state.phase === "ready" && state.departure === "runway" ? "ROTATE " : "LAND ") + Math.round(i.landingKnots) + " KT";
    readouts.power.textContent = Math.round(state.throttle * 100) + "%"; readouts.altitude.textContent = Math.round(i.altitudeFeet).toLocaleString(); readouts.height.textContent = Math.round(i.heightFeet).toLocaleString() + " FT AGL";
    readouts.vertical.textContent = (i.sinkFeet >= 0 ? "+" : "") + Math.round(i.sinkFeet / 10) * 10;
    readouts.heading.textContent = String(Math.round(i.heading) % 360).padStart(3, "0") + "\u00b0";
    readouts.wind.textContent = "WIND " + Math.round(Math.hypot(i.wind.cross, i.wind.head) * KNOTS) + " KT";
    readouts.pitch.textContent = "PITCH " + state.pitch.toFixed(0) + "\u00b0"; readouts.bank.textContent = "BANK " + state.bank.toFixed(0) + "\u00b0";
    readouts.time.textContent = minutes(state.time); readouts.travel.textContent = (state.distance / 1000).toFixed(1) + " KM"; readouts.landings.textContent = state.landings;
    $(".ff-region").textContent = i.nearby[0]?.region || "THE OPEN FRONTIER";
    $(".rg-callout").textContent = paused ? "FLIGHT PAUSED" : i.stall ? "STALL / LOWER NOSE & ADD POWER" : state.phase === "ready" ? "READY TO EXPLORE" : state.phase === "crashed" ? "FLIGHT ENDED" : state.phase === "parked" ? "PARKED / DEPART WHEN YOU LIKE" : state.phase === "rollout" ? "ON THE RUNWAY" : "OPEN AIRSPACE";
    $(".rg-view-label").textContent = view.toUpperCase() + " CAMERA"; $(".rg-cockpit").hidden = view !== "cockpit" || state.phase === "crashed"; $(".rg-aim").hidden = view !== "cockpit" || state.phase === "crashed";
    $(".rg-attitude").textContent = Math.round(i.knots) + " KT / " + Math.round(i.altitudeFeet) + " FT";
    $(".ff-nav-arrow").hidden = !selected; $(".ff-nav-arrow").style.transform = "rotate(" + (i.navigation ? headingDifference(i.navigation.bearing, state.heading) : 0) + "deg)";
    $(".ff-nav-text").textContent = selected && i.navigation ? selected.name + " / " + (i.navigation.distance / 1000).toFixed(1) + " KM / " + String(Math.round(i.navigation.bearing) % 360).padStart(3, "0") + "\u00b0" : i.nearby[0] ? "Nearest airfield: " + i.nearby[0].name + " / " + (navigationTo(state, i.nearby[0]).distance / 1000).toFixed(1) + " KM" : "Open skies. Keep exploring.";
    $(".ff-clear-marker").hidden = !selected; $(".rg-paused").hidden = !paused; $(".ff-start").hidden = flying || state.phase === "crashed"; $(".ff-start").disabled = !renderer;
    $(".ff-pause").disabled = !flying; $(".ff-pause").textContent = paused ? "Resume" : "Pause";
    throttle.value = Math.round(state.throttle * 100); throttle.disabled = paused || state.phase === "crashed"; $(".rg-throttle output").textContent = throttle.value + "%";
    const gear = $("[data-toggle=gear]"); gear.innerHTML = state.aircraft.fixedGear ? "Gear DOWN / FIXED" : "Gear " + (state.gear ? "DOWN" : "UP") + " <kbd>G</kbd>"; gear.setAttribute("aria-pressed", String(state.gear));
    gear.disabled = paused || state.phase === "crashed" || state.aircraft.fixedGear || ["parked", "rollout"].includes(state.phase) || state.phase === "ready" && state.departure === "runway";
    const flaps = $("[data-toggle=flaps]"); flaps.innerHTML = "Flaps " + ["UP", "APPROACH", "LAND"][state.flaps] + " <kbd>F</kbd>"; flaps.setAttribute("aria-pressed", String(state.flaps > 0)); flaps.disabled = paused || state.phase === "crashed";
    $$("[data-hold]").forEach(b => { b.disabled = paused || !flying; }); $(".rg-brake").classList.toggle("is-held", state.braking);
  }
  function drawChart() {
    const canvas = $(".ff-chart"), c = canvas.getContext("2d"), w = canvas.width, h = canvas.height, i = freeFlightInstruments(state, selected), centerX = Math.round(state.x / 500) * 500, centerZ = Math.round(state.z / 500) * 500;
    const cacheKey = centerX + ":" + centerZ + ":" + chartRange;
    if (chartCache?.key !== cacheKey) {
      const terrain = document.createElement("canvas"); terrain.width = w; terrain.height = h; const paint = terrain.getContext("2d");
      for (let y = 0; y < h; y += 10) for (let x = 0; x < w; x += 10) {
        const height = terrainHeight(centerX + (x / w - .5) * chartRange * 2, centerZ + (.5 - y / h) * chartRange * 2 * h / w);
        paint.fillStyle = height < 0 ? "#173e51" : height < 20 ? "#758566" : height < 400 ? "#405b49" : height < 950 ? "#59675b" : "#9baba1"; paint.fillRect(x, y, 10, 10);
      }
      chartCache = { key: cacheKey, terrain, x: centerX, z: centerZ };
    }
    c.drawImage(chartCache.terrain, 0, 0); c.strokeStyle = "#d8ece012"; c.lineWidth = 1;
    for (let x = 0; x <= w; x += 100) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y <= h; y += 100) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    const point = p => ({ x: w / 2 + (p.x - chartCache.x) / chartRange * w / 2, y: h / 2 - (p.z - chartCache.z) / chartRange * w / 2 });
    mapFields = airfieldsNear(chartCache.x, chartCache.z, chartRange * 1.25).map(field => ({ field, ...point(field) })).filter(p => p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h);
    for (const p of mapFields) {
      c.save(); c.translate(p.x, p.y); c.rotate(p.field.heading * DEG); c.fillStyle = selected?.id === p.field.id ? "#f3c577" : "#ecf0da"; c.fillRect(-3, -10, 6, 20); c.restore();
      c.font = "14px sans-serif"; c.fillStyle = "#f1f1dd"; c.textAlign = "left"; c.fillText(p.field.name, Math.min(w - 140, Math.max(4, p.x + 12)), Math.max(16, Math.min(h - 8, p.y - 5)));
    }
    const plane = point(state); c.save(); c.translate(plane.x, plane.y); c.rotate(state.heading * DEG); c.fillStyle = "#86f6d0"; c.beginPath(); c.moveTo(0, -15); c.lineTo(10, 11); c.lineTo(0, 6); c.lineTo(-10, 11); c.closePath(); c.fill(); c.restore();
    c.fillStyle = "#e4efdf"; c.font = "bold 16px sans-serif"; c.fillText("N", 16, 25); c.font = "13px sans-serif"; c.fillText(chartRange / 1000 + " KM RADIUS", 16, h - 16);
    const list = $(".ff-airfield-list"), fields = i.nearby.slice(0, 4), ids = fields.map(f => f.id).join(",");
    if (list.dataset.fields !== ids) {
      const oldFocus = document.activeElement?.dataset?.field; list.replaceChildren(); list.dataset.fields = ids;
      for (const field of fields) {
        const button = document.createElement("button"); button.type = "button"; button.dataset.field = field.id;
        button.append(document.createElement("strong"), document.createElement("span")); button.firstChild.textContent = field.name;
        button.addEventListener("click", () => mark(field)); list.append(button);
        if (oldFocus === field.id) button.focus({ preventScroll: true });
      }
    }
    for (let n = 0; n < fields.length; n++) {
      const field = fields[n], nav = navigationTo(state, field), button = list.children[n];
      button.setAttribute("aria-pressed", String(selected?.id === field.id));
      button.lastChild.textContent = (nav.distance / 1000).toFixed(1) + " km / " + Math.round(nav.bearing) + "\u00b0 / " + (field.length / 1000).toFixed(1) + " km " + field.surface;
    }
  }
  on($(".ff-start"), "click", begin); on($(".ff-retry"), "click", begin); on($(".ff-new"), "click", configure); on($(".ff-result-setup"), "click", () => { configure(); $(".ff-planning").scrollIntoView({ block: "start", behavior: "smooth" }); });
  on($(".ff-pause"), "click", () => pause()); on($(".ff-resume"), "click", () => pause(false));
  on($(".ff-camera"), "change", e => cameraMode(e.target.value)); on($(".ff-recenter"), "click", () => { lookYaw = lookPitch = 0; });
  on($(".ff-sound"), "click", () => { settings.effects = !settings.effects; audio.setEffects(settings.effects); setup(); });
  on($(".ff-fullscreen"), "click", async () => {
    if (wrapper.classList.contains("ff-expanded")) { wrapper.classList.remove("ff-expanded"); $(".ff-fullscreen").textContent = "Expand view"; renderer?.resize(); return; }
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await wrapper.requestFullscreen(); }
    catch { wrapper.classList.add("ff-expanded"); $(".ff-fullscreen").textContent = "Exit expanded view"; renderer?.resize(); }
  });
  on(document, "fullscreenchange", () => { $(".ff-fullscreen").textContent = document.fullscreenElement ? "Exit expanded view" : "Expand view"; renderer?.resize(); });
  on(throttle, "input", () => { state.throttle = Number(throttle.value) / 100; updateUI(); });
  $$("[data-toggle]").forEach(b => on(b, "click", () => equipment(b.dataset.toggle)));
  $$("[data-aircraft]").forEach(b => on(b, "click", () => { settings.aircraft = b.dataset.aircraft; configure(); }));
  for (const key of ["location", "departure", "weather"]) on($("[name=" + key + "]"), "change", e => { settings[key] = e.target.value; configure(); });
  $$("[data-setting]").forEach(input => on(input, "change", () => { settings[input.dataset.setting] = input.checked; state.assist = settings.assist; clearInput(); setup(); }));
  on($(".ff-zoom"), "change", e => { chartRange = Number(e.target.value); chartCache = null; drawChart(); });
  on($(".ff-clear-marker"), "click", () => { selected = null; message("Navigation marker cleared. Follow any heading you like."); updateUI(); drawChart(); });
  on($(".ff-chart"), "click", event => { const box = event.currentTarget.getBoundingClientRect(), x = (event.clientX - box.left) / box.width * 600, y = (event.clientY - box.top) / box.height * 400; const p = mapFields.find(p => Math.hypot(p.x - x, p.y - y) < 28); if (p) mark(p.field); });
  let pointer = null;
  on(canvas, "pointerdown", event => { if (view === "chase") return; pointer = { x: event.clientX, y: event.clientY, id: event.pointerId }; canvas.setPointerCapture(event.pointerId); });
  on(canvas, "pointermove", event => { if (!pointer) return; lookYaw += (event.clientX - pointer.x) * .006; lookPitch = clamp(lookPitch + (event.clientY - pointer.y) * .004, -.8, .8); pointer.x = event.clientX; pointer.y = event.clientY; });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) on(canvas, event, () => { pointer = null; });
  $$("[data-hold]").forEach(button => {
    const release = () => { touch[button.dataset.hold] = button.dataset.hold === "brake" ? false : 0; button.classList.remove("is-held"); };
    on(button, "pointerdown", event => { event.preventDefault(); if (paused || !active()) return; button.setPointerCapture(event.pointerId); touch[button.dataset.hold] = button.dataset.hold === "brake" ? true : Number(button.dataset.value); button.classList.add("is-held"); });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) on(button, event, release);
  });
  const controls = new Set(["KeyW", "KeyS", "KeyA", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyQ", "KeyE", "Equal", "Minus", "NumpadAdd", "NumpadSubtract", "PageUp", "PageDown", "KeyG", "KeyF", "KeyB", "KeyP", "KeyC"]);
  on(window, "keydown", event => {
    if (!controls.has(event.code) || event.ctrlKey || event.metaKey || event.altKey || event.target.closest("input, select, textarea, [contenteditable=true]")) return;
    event.preventDefault(); if (event.repeat) return; keys.add(event.code);
    if (event.code === "KeyP") pause(); if (event.code === "KeyC") cameraMode(["chase", "cockpit", "orbit"][( ["chase", "cockpit", "orbit"].indexOf(view) + 1) % 3]);
    if (["KeyG", "KeyF"].includes(event.code)) equipment(event.code === "KeyG" ? "gear" : "flaps");
  });
  on(window, "keyup", e => keys.delete(e.code)); on(window, "blur", () => { clearInput(); pointer = null; if (active()) pause(true); });
  on(document, "visibilitychange", () => { if (document.hidden && active()) pause(true); });
  on(canvas, "webglcontextlost", event => { event.preventDefault(); pause(true); message("The graphics context was interrupted. Reload the page to restart the flight view."); });
  function input() {
    const down = (...codes) => codes.some(code => keys.has(code)) ? 1 : 0;
    return { pitch: clamp(touch.pitch + (down("KeyW", "ArrowUp") - down("KeyS", "ArrowDown")) * (settings.invertPitch ? -1 : 1), -1, 1), roll: clamp(touch.roll + down("KeyD", "ArrowRight") - down("KeyA", "ArrowLeft"), -1, 1), rudder: clamp(touch.rudder + down("KeyE") - down("KeyQ"), -1, 1), throttle: down("Equal", "NumpadAdd", "PageUp") - down("Minus", "NumpadSubtract", "PageDown"), brake: touch.brake || keys.has("KeyB") };
  }
  function tick(now) {
    if (disposed) return; const dt = Math.min(.1, (now - last) / 1000 || 0); last = now;
    if (renderer && !paused) {
      const previous = state.phase; advanceFreeFlight(state, input(), dt); audio.update(state);
      for (const event of state.events.splice(0)) {
        if (event.type === "touchdown") { audio.effect("touchdown"); message((event.smooth ? "Soft landing at " : "Wheels down at ") + event.field.name + ". Idle power and hold B to stop. You can take off again whenever you like."); }
        if (event.type === "takeoff") message("Airborne again. Raise retractable gear, ease the flaps up as you gain speed, and enjoy the next part of your flight.");
        if (event.type === "crash") { renderer.crash(state); audio.crash(); clearInput(); crashElapsed = 0; message(event.reason); }
      }
      if (previous !== state.phase) { setup(); updateUI(); }
      if (state.phase === "crashed") { crashElapsed += dt; if (crashElapsed > 2.7 && result.hidden) { result.hidden = false; $(".rg-result-reason").textContent = state.result.reason; $(".ff-result-stats").textContent = minutes(state.time) + " in the air / " + (state.distance / 1000).toFixed(1) + " km explored / " + state.landings + " landings"; } }
    }
    renderer?.render(state, dt, { cameraView: view, paused, lookYaw, lookPitch });
    uiTime += dt; chartTime += dt; if (uiTime > .12) { updateUI(); uiTime = 0; } if (chartTime > 1) { drawChart(); chartTime = 0; }
    frame = requestAnimationFrame(tick);
  }
  setup(); updateUI(); drawChart();
  createFreeFlightRenderer(canvas, { isCurrent: () => !disposed }).then(value => { if (disposed) { value.dispose(); return; } renderer = value; renderer.setFlight(state); $(".rg-loading").hidden = true; wrapper.dataset.ready = "true"; updateUI(); }).catch(error => {
    if (disposed) return; wrapper.dataset.ready = "error"; $(".rg-loading").innerHTML = "<strong>The 3D view could not start</strong><span>Enable hardware acceleration or try another browser, then reload the page.</span>"; console.error("Free Flight renderer:", error);
  });
  frame = requestAnimationFrame(tick);
  return () => { disposed = true; cancelAnimationFrame(frame); listeners.forEach(remove => remove()); audio.dispose(); renderer?.dispose(); wrapper.remove(); };
}
