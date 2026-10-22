import { RACER_COLORS } from "./bubble-rally-model.js";

export const RALLY_FINISHES = ["Cyan", "Coral", "Amber", "Violet"].map((name, index) => ({
  id: name.toLowerCase(), name, color: RACER_COLORS[index],
}));

// Name text stays separate from the video, so every local racer can personalize it.
export function createRallyFinishPlayer(root, { getName, setName, getSound, setSound, onOpen, onClose }) {
  const dialog = document.createElement("dialog"); dialog.className = "rally-clip-dialog";
  dialog.setAttribute("aria-label", "Bubble Rally finish clip");
  dialog.innerHTML = `
    <div class="rally-clip-header"><div><span class="rally-eyebrow">BUBBLE RALLY / THE FINISH LINE</span><h3 class="rally-clip-title"></h3></div><button type="button" class="rally-clip-close" aria-label="Close finish clip">Close</button></div>
    <div class="rally-clip-stage">
      <video class="rally-clip-video" playsinline muted preload="none" aria-label="Winning bubble rolling through the finish arch"></video>
      <img class="rally-clip-poster" alt="Winning glass bubble at the finish" hidden />
      <div class="rally-clip-caption" hidden><span>CIRCUIT CHAMPION</span><h3 class="rally-clip-name"></h3></div>
    </div>
    <div class="rally-clip-footer">
      <label class="rally-field rally-clip-name-field"><span>Winner name</span><input type="text" maxlength="32" autocomplete="off" aria-label="Winner name in finish clip" /></label>
      <div class="rally-clip-buttons"><button type="button" class="rally-clip-play">Pause clip</button><button type="button" class="rally-clip-replay">Replay</button><button type="button" class="rally-clip-sound" aria-pressed="false">Sound off</button><button type="button" class="rally-clip-return rally-primary">Back to race</button></div>
      <p class="rally-clip-status" role="status" aria-live="polite"></p>
    </div>`;
  root.append(dialog);
  const find = selector => dialog.querySelector(selector), video = find("video"), poster = find(".rally-clip-poster");
  const input = find("input"), caption = find(".rally-clip-caption"), playButton = find(".rally-clip-play");
  const soundButton = find(".rally-clip-sound"); video.volume = 0.75;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let racer = 0, generation = 0, previousFocus = null, disposed = false, fallback = false, resumeVisible = false, sourceIndex = -1, pending = null;
  const movies = new Map();
  function loadMovie(index) {
    if (movies.has(index)) return Promise.resolve(movies.get(index));
    if (pending?.index === index) return pending.promise;
    pending?.controller.abort();
    const controller = new AbortController();
    // A local Blob also supports replay/seek on basic static servers without
    // Range responses or a video MIME type. Only the requested color is fetched.
    const promise = fetch(new URL(`./assets/bubble-rally-finish-${RALLY_FINISHES[index].id}.mp4`, import.meta.url), { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Clip unavailable"); return response.arrayBuffer(); })
      .then(buffer => {
        if (disposed || controller.signal.aborted) throw new DOMException("Clip cancelled", "AbortError");
        const url = URL.createObjectURL(new Blob([buffer], { type: "video/mp4" })); movies.set(index, url); return url;
      }).finally(() => { if (pending?.controller === controller) pending = null; });
    pending = { index, controller, promise }; return promise;
  }
  function renderName() {
    const name = getName(racer);
    find(".rally-clip-name").textContent = `${name} wins!`;
    find(".rally-clip-name").classList.toggle("is-long", name.length > 16);
  }
  function updatePlayback() {
    caption.hidden = !(fallback || video.currentTime >= 3.6 || video.ended);
    playButton.textContent = video.paused ? (video.ended || fallback ? "Play clip" : "Resume clip") : "Pause clip";
  }
  function updateSound() {
    soundButton.textContent = video.muted ? "Sound off" : "Sound on";
    soundButton.setAttribute("aria-pressed", String(!video.muted));
  }
  function showFallback() {
    fallback = true; video.hidden = true; poster.hidden = false; updatePlayback();
    find(".rally-clip-status").textContent = "The clip could not load. Your winner card is ready; you can still continue.";
  }
  async function play() {
    const ticket = generation;
    fallback = false; poster.hidden = true; video.hidden = false; resumeVisible = false;
    try {
      if (sourceIndex !== racer) {
        find(".rally-clip-status").textContent = "Loading finish clip...";
        const url = await loadMovie(racer);
        if (disposed || ticket !== generation || !dialog.open) return;
        video.src = url; video.load(); sourceIndex = racer;
      }
      if (video.ended) video.currentTime = 0;
      find(".rally-clip-status").textContent = "";
      if (document.hidden) { resumeVisible = true; return; }
      try { await video.play(); }
      catch (error) {
        if (error.name !== "NotAllowedError" || video.muted) throw error;
        // Browsers may require a fresh gesture for audio after an automatic CPU win.
        video.muted = true; updateSound(); await video.play();
        find(".rally-clip-status").textContent = "Turn Sound on to hear the finish effects.";
      }
    } catch (error) {
      if (disposed || ticket !== generation || !dialog.open || error.name === "AbortError") return;
      if (sourceIndex !== racer || video.error || error.name === "NotSupportedError") { showFallback(); return; }
      find(".rally-clip-status").textContent = "Press Play clip to start, or return to the race.";
      playButton.textContent = "Play clip";
    }
  }
  function close() {
    if (!dialog.open) return;
    generation++; resumeVisible = false; pending?.controller.abort(); video.pause(); dialog.close(); onClose();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  input.addEventListener("input", () => { setName(racer, input.value); renderName(); });
  find(".rally-clip-close").addEventListener("click", close);
  find(".rally-clip-return").addEventListener("click", close);
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
  playButton.addEventListener("click", () => { if (!video.paused) { resumeVisible = false; video.pause(); } else play(); });
  find(".rally-clip-replay").addEventListener("click", () => { video.currentTime = 0; caption.hidden = true; play(); });
  soundButton.addEventListener("click", () => {
    const enabled = video.muted; setSound(enabled); video.muted = !enabled; updateSound();
    find(".rally-clip-status").textContent = "";
  });
  for (const event of ["play", "pause", "ended", "timeupdate"]) video.addEventListener(event, updatePlayback);
  video.addEventListener("error", () => {
    if (!dialog.open || disposed) return;
    showFallback();
  });
  const visibility = () => {
    if (document.hidden) { resumeVisible = dialog.open && !video.paused; video.pause(); }
    else if (resumeVisible && dialog.open) play();
  };
  document.addEventListener("visibilitychange", visibility);
  return {
    get isOpen() { return dialog.open; },
    show(index, { preview = false } = {}) {
      if (disposed || !RALLY_FINISHES[index]) return;
      generation++; racer = index; resumeVisible = false; pending?.controller.abort(); pending = null; video.pause(); sourceIndex = -1;
      const finish = RALLY_FINISHES[index];
      dialog.style.setProperty("--clip-color", finish.color);
      dialog.dataset.color = finish.id; dialog.dataset.preview = String(preview);
      find(".rally-clip-title").textContent = `${finish.name} ${preview ? "finish preview" : "victory"}`;
      find(".rally-clip-return").textContent = preview ? "Back to race" : "Continue to results";
      find(".rally-clip-status").textContent = "";
      input.value = getName(index); renderName();
      const base = new URL(`./assets/bubble-rally-finish-${finish.id}`, import.meta.url).href;
      video.poster = base + ".jpg"; poster.src = video.poster;
      video.removeAttribute("src"); video.muted = !getSound(); updateSound(); video.load();
      if (!dialog.open) {
        const active = document.activeElement;
        previousFocus = active && active !== document.body && active !== document.documentElement ? active : root.querySelector(".rally-finish-customizer summary");
        onOpen(); dialog.showModal();
      }
      find(".rally-clip-close").focus({ preventScroll: true });
      fallback = reducedMotion.matches; video.hidden = fallback; poster.hidden = !fallback; updatePlayback();
      if (fallback) find(".rally-clip-status").textContent = "Reduced motion is on. Press Play clip whenever you want to watch.";
      else play();
    },
    close,
    dispose() {
      disposed = true; generation++; pending?.controller.abort(); video.pause(); video.removeAttribute("src"); video.load();
      movies.forEach(url => URL.revokeObjectURL(url)); movies.clear();
      document.removeEventListener("visibilitychange", visibility); dialog.remove();
    },
  };
}
