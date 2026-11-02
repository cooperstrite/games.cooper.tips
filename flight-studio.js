import { AIRCRAFT, APPROACHES, KNOTS } from "./runway-engine.js";
import { HOME_AIRFIELDS, WEATHER } from "./free-flight-world.js";
import { readFlightSettings, changeFlightSetting, writeFlightSettings } from "./flight-settings.js";
import { createAircraftPreview } from "./flight-studio-preview.js";
import { createRunwayAudio } from "./runway-audio.js";

export function createFlightStudio(root, game) {
  const runway = game === "runway", name = runway ? "Runway Glide" : "Free Flight";
  let settings = readFlightSettings(game), preview = null, disposed = false, loading = false;
  const equipment = { gear: true, flaps: 0, hook: false };
  const audio = runway ? createRunwayAudio({ ...settings, effects: false }) : null;
  const wrapper = document.createElement("section"); wrapper.className = "flight-studio"; wrapper.setAttribute("aria-label", `${name} aircraft studio`);
  const options = entries => entries.map(([id, label]) => `<option value="${id}">${label}</option>`).join("");
  const checkbox = (key, label) => `<label class="flight-studio-check"><input type="checkbox" data-flight-setting="${key}">${label}</label>`;
  wrapper.innerHTML = `
    <figure class="flight-studio-preview" data-ready="loading">
      <div class="flight-studio-preview-heading"><span>THE HANGAR</span><strong>3D aircraft</strong></div>
      <div class="flight-studio-stage"><canvas tabindex="0" role="img" aria-label="Rotatable 3D aircraft"></canvas><div class="flight-studio-loading" role="status">Preparing your aircraft...</div></div>
      <figcaption><div><span class="flight-studio-type"></span><h4 class="flight-studio-name"></h4></div><p>Drag to turn. Scroll or pinch to zoom.</p></figcaption>
      <div class="flight-studio-view-controls" role="group" aria-label="Aircraft inspection view"><button type="button" data-turn="-.4" aria-label="Turn aircraft left">&larr; Turn</button><button type="button" class="flight-studio-reset">Reset view</button><button type="button" data-turn=".4" aria-label="Turn aircraft right">Turn &rarr;</button><button type="button" class="flight-studio-retry" hidden>Retry 3D preview</button></div>
      <details class="flight-studio-inspection"><summary>Inspect landing equipment</summary><div><label><input type="checkbox" data-equipment="gear" checked> Landing gear down</label><label>Flaps<select data-equipment="flaps" aria-label="Preview flaps"><option value="0">Up</option><option value="1">Approach</option><option value="2">Landing</option></select></label><label class="flight-studio-hook"><input type="checkbox" data-equipment="hook"> Tailhook down</label></div><p>These controls pose the model for inspection. Flights use their usual departure configuration.</p></details>
    </figure>
    <div class="flight-studio-controls">
      <section class="flight-studio-section"><span class="flight-studio-kicker">01 / YOUR AIRCRAFT</span><h4>Choose what you fly.</h4><div class="flight-studio-aircraft" role="group" aria-label="Choose aircraft">${Object.values(AIRCRAFT).map(a => `<button type="button" data-aircraft="${a.id}" aria-pressed="false" style="--aircraft-color:${a.color}"><span>${a.type}</span><strong>${a.name}</strong></button>`).join("")}</div><p class="flight-studio-description"></p><p class="flight-studio-landing"></p><div class="flight-studio-facts"></div></section>
      <section class="flight-studio-section"><span class="flight-studio-kicker">02 / YOUR NEXT FLIGHT</span><h4>${runway ? 'Choose an approach.' : 'Find your horizon.'}</h4><div class="flight-studio-fields">${runway ? `<label>Approach<select data-flight-setting="level" aria-label="Approach">${options(APPROACHES.map(l => [l.id, `${l.name} / ${l.level}`]))}</select></label>` : `<label>Starting location<select data-flight-setting="location" aria-label="Starting location">${options(HOME_AIRFIELDS.map(f => [f.id, f.name]))}</select></label><label>Start your flight<select data-flight-setting="departure" aria-label="Departure type"><option value="airborne">Already flying</option><option value="runway">On the runway</option></select></label><label>Weather<select data-flight-setting="weather" aria-label="Flight weather">${options(Object.entries(WEATHER).map(([id, w]) => [id, w.name]))}</select></label>`}</div><p class="flight-studio-location"></p><p class="flight-studio-compatibility" role="status"></p></section>
      <section class="flight-studio-section"><span class="flight-studio-kicker">03 / FLIGHT PREFERENCES</span><h4>Make yourself comfortable.</h4><div class="flight-studio-checks">${checkbox('assist', 'Stability assist')}${checkbox('invertPitch', 'Inverted flight controls')}${runway ? checkbox('guides', 'Approach guides') + checkbox('voice', 'Tower voice') : ''}${checkbox('effects', 'Sound effects')}</div><p class="flight-studio-pitch"></p>${runway ? '<label>Tower voice<select class="flight-studio-voice" data-flight-setting="towerVoice" aria-label="Tower voice"></select></label><button type="button" class="flight-studio-listen">Listen to voice</button><p class="flight-studio-voice-note"></p>' : ''}</section>
      <div class="flight-studio-footer"><p class="flight-studio-save" role="status">Your saved ${name} setup. Changes save automatically.</p><a href="#${game}">Fly in ${name} &rarr;</a></div>
    </div>`;
  root.append(wrapper);
  const $ = selector => wrapper.querySelector(selector), $$ = selector => [...wrapper.querySelectorAll(selector)];
  const canvas = $("canvas"), loadingPanel = $(".flight-studio-loading"), figure = $("figure");
  function render() {
    const a = AIRCRAFT[settings.aircraft];
    $$("button[data-aircraft]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.aircraft === a.id)));
    $$("[data-flight-setting]").forEach(input => { if (input.type === "checkbox") input.checked = settings[input.dataset.flightSetting]; else input.value = settings[input.dataset.flightSetting]; });
    $(".flight-studio-type").textContent = a.type; $(".flight-studio-name").textContent = a.name;
    $(".flight-studio-description").textContent = a.description;
    $(".flight-studio-landing").textContent = !runway && a.id === "military" ? "Fast and responsive. Slow toward 163 knots for landing and leave room to brake on a long runway." : a.landing;
    const facts = [a.badge, `${Math.round(a.target * KNOTS)} kt approach`, a.fixedGear ? "Fixed landing gear" : "Retractable landing gear"];
    $(".flight-studio-facts").replaceChildren(...facts.map(text => { const span = document.createElement('span'); span.textContent = text; return span; }));
    $(".flight-studio-location").textContent = runway ? APPROACHES.find(l => l.id === settings.level).tip : HOME_AIRFIELDS.find(f => f.id === settings.location).description;
    $(".flight-studio-pitch").textContent = settings.invertPitch ? "Up / W lowers the nose. Down / S raises the nose." : "Up / W raises the nose. Down / S lowers the nose.";
    if (a.fixedGear) equipment.gear = true;
    $("[data-equipment=gear]").checked = equipment.gear; $("[data-equipment=gear]").disabled = !!a.fixedGear;
    $(".flight-studio-hook").hidden = a.id !== "military";
    canvas.setAttribute("aria-label", `3D ${a.name}, ${a.type}. Drag to turn, scroll to zoom, or use the turn buttons.`);
    preview?.update(a.id, equipment);
  }
  function change(key, value) {
    const before = settings;
    settings = changeFlightSetting(game, settings, key, value);
    $(".flight-studio-compatibility").textContent = key === "aircraft" && settings.level !== before.level ? "First approach selected to suit this aircraft." : key === "level" && settings.aircraft !== before.aircraft ? `${AIRCRAFT[settings.aircraft].name} selected for this runway.` : "";
    $(".flight-studio-save").textContent = writeFlightSettings(game, settings) ? `Saved. Your next ${name} flight will use these choices.` : "Storage is unavailable. Keep this page open to review your choices; they could not be saved.";
    audio?.setTowerVoice(settings.towerVoice); audio?.setVoice(settings.voice);
    render();
  }
  async function loadPreview() {
    if (loading || preview || disposed) return;
    loading = true; loadingPanel.hidden = false; loadingPanel.textContent = "Preparing your aircraft..."; figure.dataset.ready = "loading"; $(".flight-studio-retry").hidden = true;
    try {
      const next = await createAircraftPreview(canvas, { isCurrent: () => !disposed });
      if (disposed) { next.dispose(); return; }
      preview = next; render(); await preview.ready();
      if (!disposed) { loadingPanel.hidden = true; figure.dataset.ready = "true"; }
    } catch {
      preview?.dispose(); preview = null;
      if (!disposed) { figure.dataset.ready = "unavailable"; loadingPanel.textContent = "The 3D view could not start. Your aircraft and flight settings are still available below."; $(".flight-studio-retry").hidden = false; }
    } finally { loading = false; }
  }
  function refreshVoices() {
    if (!audio || disposed) return;
    const select = $(".flight-studio-voice"); select.replaceChildren();
    const entries = [["auto", `Natural / Automatic (${audio.selectedVoice()})`], ...audio.voices().map(v => [v.name, `${v.name} / ${v.lang}`])];
    if (!entries.some(([id]) => id === settings.towerVoice)) entries.push([settings.towerVoice, `${settings.towerVoice} / saved voice`]);
    for (const [id, text] of entries) { const option = document.createElement('option'); option.value = id; option.textContent = text; select.append(option); }
    select.value = settings.towerVoice; select.disabled = !audio.voiceAvailable; $(".flight-studio-listen").disabled = !audio.voiceAvailable;
    $(".flight-studio-voice-note").textContent = audio.voiceAvailable ? "Natural voices available on your device." : "Voice playback is unavailable on this device. The game still shows tower captions.";
  }
  wrapper.addEventListener("change", event => {
    const input = event.target, key = input.dataset.flightSetting;
    if (key) change(key, input.type === "checkbox" ? input.checked : input.value);
    if (input.dataset.equipment) { equipment[input.dataset.equipment] = input.type === "checkbox" ? input.checked : Number(input.value); render(); }
  });
  wrapper.addEventListener("click", event => {
    const button = event.target.closest("button"); if (!button) return;
    if (button.dataset.aircraft) change("aircraft", button.dataset.aircraft);
    if (button.dataset.turn) preview?.turn(Number(button.dataset.turn));
    if (button.classList.contains("flight-studio-reset")) preview?.reset();
    if (button.classList.contains("flight-studio-retry")) loadPreview();
    if (button.classList.contains("flight-studio-listen")) {
      change("voice", true); audio.start(); audio.speak("Glide One, welcome to Azure Bay. You're cleared to land, runway two seven. Looking good.", { urgent: true });
    }
  });
  if (runway) globalThis.speechSynthesis?.addEventListener("voiceschanged", refreshVoices);
  refreshVoices(); render(); loadPreview();
  return () => { disposed = true; if (runway) globalThis.speechSynthesis?.removeEventListener("voiceschanged", refreshVoices); audio?.dispose(); preview?.dispose(); wrapper.remove(); };
}
