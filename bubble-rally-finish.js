import { RACER_COLORS } from "./bubble-rally-model.js";
import { createOpponentScheduler } from "./arcade/opponents.js";

const FINISHES = ["cyan", "coral", "amber", "violet"];

// A win is a single sequence: automatic movie, then the race's final podium.
// Names come from the roster captured at the start of that race.
export function createRallyFinishPlayer(root, { getName, getSound, onOpen, onReveal, onComplete }) {
  const dialog = document.createElement("dialog"); dialog.className = "rally-clip-dialog";
  dialog.innerHTML = `
    <div class="rally-clip-stage">
      <video class="rally-clip-video" playsinline muted preload="none" disablepictureinpicture disableremoteplayback aria-label="Winning bubble rolling through the finish arch"></video>
      <img class="rally-clip-poster" alt="" hidden />
      <div class="rally-clip-caption" hidden><span>CIRCUIT CHAMPION</span><h3 class="rally-clip-name"></h3></div>
      <p class="rally-clip-status" role="status" aria-live="polite"></p>
    </div>`;
  root.append(dialog);
  const video = dialog.querySelector("video"), poster = dialog.querySelector("img");
  const caption = dialog.querySelector(".rally-clip-caption"), name = dialog.querySelector(".rally-clip-name");
  const status = dialog.querySelector(".rally-clip-status"), movies = new Map();
  const clock = createOpponentScheduler(), reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let generation = 0, disposed = false, pending = null, resumeVisible = false, lastTime = 0, staticCard = false, completing = false;
  video.volume = 0.75;
  const current = ticket => !disposed && dialog.open && ticket === generation;

  async function loadMovie(index) {
    if (movies.has(index)) return movies.get(index);
    const controller = new AbortController(); pending = controller;
    try {
      // Blob playback also works on simple static servers without Range responses.
      const response = await fetch(new URL(`./assets/bubble-rally-finish-${FINISHES[index]}.mp4`, import.meta.url), { signal: controller.signal });
      if (!response.ok) throw new Error("Clip unavailable");
      const buffer = await response.arrayBuffer();
      if (disposed || controller.signal.aborted) throw new DOMException("Clip cancelled", "AbortError");
      const url = URL.createObjectURL(new Blob([buffer], { type: "video/mp4" }));
      movies.set(index, url); return url;
    } finally { if (pending === controller) pending = null; }
  }
  function complete() {
    if (!dialog.open || disposed || completing) return;
    completing = true;
    generation++; clock.cancel(); pending?.abort(); pending = null; resumeVisible = false;
    video.pause(); onReveal(); dialog.classList.add("is-finishing");
    const finish = () => {
      video.removeAttribute("src"); video.load(); dialog.close();
      dialog.classList.remove("is-finishing"); completing = false; onComplete();
    };
    if (reducedMotion.matches) finish();
    else clock.schedule(finish, 500);
  }
  function showCard() {
    if (!dialog.open || disposed || staticCard || completing) return;
    generation++; staticCard = true; pending?.abort(); pending = null; resumeVisible = false;
    video.pause(); video.hidden = true; poster.hidden = false; caption.hidden = false;
    status.textContent = "";
    // Reduced motion and unavailable video still lead to results automatically.
    clock.schedule(complete, 1800);
  }
  async function startPlayback(ticket) {
    if (!current(ticket)) return;
    if (document.hidden) { resumeVisible = true; return; }
    resumeVisible = false;
    try {
      try { await video.play(); }
      catch (error) {
        if (!current(ticket) || document.hidden) return;
        if (error.name !== "NotAllowedError" || video.muted) throw error;
        video.muted = true; await video.play();
      }
    } catch {
      if (current(ticket) && !document.hidden) showCard();
    }
  }
  async function play(index, ticket) {
    clock.schedule(showCard, 10000);
    try {
      const url = await loadMovie(index);
      if (!current(ticket)) return;
      video.src = url; video.load(); await startPlayback(ticket);
    } catch {
      if (current(ticket)) showCard();
    }
  }
  video.addEventListener("playing", () => {
    if (!dialog.open || staticCard || completing) return;
    status.textContent = ""; clock.schedule(showCard, 5000);
  });
  video.addEventListener("timeupdate", () => {
    if (!dialog.open || staticCard || completing) return;
    caption.hidden = video.currentTime < 3.6;
    if (video.currentTime > lastTime) {
      lastTime = video.currentTime; clock.schedule(showCard, 5000);
    }
  });
  video.addEventListener("ended", complete);
  video.addEventListener("error", () => { if (dialog.open) showCard(); });
  // Escape remains an accessible way to skip directly to results, without
  // putting preview, replay, name-editing or transport controls over the film.
  dialog.addEventListener("cancel", event => { event.preventDefault(); complete(); });
  const visibility = () => {
    if (!dialog.open || staticCard || completing) return;
    if (document.hidden) { resumeVisible = !video.paused || Boolean(pending); video.pause(); }
    else if (resumeVisible && video.hasAttribute("src")) startPlayback(generation);
  };
  document.addEventListener("visibilitychange", visibility);
  return {
    get isOpen() { return dialog.open; },
    show(index) {
      if (disposed || !FINISHES[index]) return;
      generation++; clock.cancel(); pending?.abort(); pending = null; video.pause();
      resumeVisible = false; staticCard = false; completing = false; lastTime = 0; dialog.classList.remove("is-finishing");
      const winnerName = getName(index);
      dialog.dataset.color = FINISHES[index];
      dialog.style.setProperty("--clip-color", RACER_COLORS[index]);
      dialog.setAttribute("aria-label", `${winnerName} wins Bubble Rally`);
      name.textContent = `${winnerName} wins!`; name.classList.toggle("is-long", winnerName.length > 16);
      video.poster = new URL(`./assets/bubble-rally-finish-${FINISHES[index]}.jpg`, import.meta.url).href;
      poster.src = video.poster; poster.hidden = true; video.hidden = false; caption.hidden = true;
      video.removeAttribute("src"); video.muted = !getSound(); video.load();
      status.textContent = "Celebrating the winner...";
      if (!dialog.open) { onOpen(); dialog.showModal(); }
      if (reducedMotion.matches) showCard();
      else play(index, generation);
    },
    dispose() {
      disposed = true; generation++; clock.dispose(); pending?.abort(); video.pause();
      video.removeAttribute("src"); video.load();
      movies.forEach(url => URL.revokeObjectURL(url)); movies.clear();
      document.removeEventListener("visibilitychange", visibility); dialog.remove();
    },
  };
}
