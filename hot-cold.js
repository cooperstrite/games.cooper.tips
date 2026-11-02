const RANGES = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
const number = value => value.toLocaleString("en-US");
const TEMPERATURES = [
  { limit: 2, name: "Scorching", key: "scorching", fill: 94 },
  { limit: 5, name: "Hot", key: "hot", fill: 76 },
  { limit: 10, name: "Warm", key: "warm", fill: 57 },
  { limit: 20, name: "Cool", key: "cool", fill: 36 },
  { limit: Infinity, name: "Chilly", key: "chilly", fill: 16 },
];
const temperature = distance => TEMPERATURES.find(tone => distance <= tone.limit);
const arrow = direction => direction === "high" ? "&#8595;" : direction === "low" ? "&#8593;" : "&#10003;";

export function createHotCold(root, { onRangeChange = () => {} } = {}) {
  const state = { max: 100, secret: 0, attempts: [], finished: false, best: null };
  const wrapper = document.createElement("section"); wrapper.className = "guess-game hc-game";
  wrapper.setAttribute("aria-label", "Hot and Cold number hunt");
  wrapper.innerHTML = `
    <header class="hc-topline"><div><span class="hc-emblem" aria-hidden="true"><i></i></span><span>THE NUMBER HUNT</span></div><label>Number range<select aria-label="Guessing range">${RANGES.map(max => `<option value="${max}">1 &ndash; ${number(max)}</option>`).join("")}</select></label></header>
    <div class="hc-play">
      <figure class="hc-sensor">
        <div class="hc-sensor-heading"><span class="hc-eyebrow">LAST GUESS</span><strong class="hc-last-number">&mdash;</strong></div>
        <div class="hc-thermometer" aria-hidden="true">
          <div class="hc-halo"></div>
          <svg class="hc-hot-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></svg>
          <div class="hc-tube"><div class="hc-liquid"></div><div class="hc-glass-shine"></div></div>
          <div class="hc-ticks">${Array.from({ length: 9 }, () => '<i></i>').join('')}</div>
          <div class="hc-bulb"><i></i></div>
          <svg class="hc-cold-icon" viewBox="0 0 24 24"><path d="M12 1v22M2.5 6.5l19 11m-19 0 19-11M8 3l4 3 4-3M8 21l4-3 4 3M3 10l5-1-1-5m14 10-5 1 1 5M7 20l1-5-5-1M17 4l-1 5 5 1"/></svg>
          <div class="hc-sparks">${Array.from({ length: 8 }, (_, i) => `<i style="--spark:${i}"></i>`).join('')}</div>
        </div>
        <figcaption><span class="hc-temperature">Awaiting a signal</span><span class="hc-temperature-note">Your first guess sets the temperature.</span></figcaption>
      </figure>
      <div class="hc-console">
        <div class="hc-stats"><div><span>GUESSES</span><strong class="hc-count">0</strong></div><div><span>BEST THIS RANGE <small>THIS VISIT</small></span><strong class="hc-best">&mdash;</strong></div></div>
        <div class="hc-feedback" role="status" aria-live="polite" aria-atomic="true"><span class="hc-eyebrow hc-feedback-label"></span><h3></h3><p></p></div>
        <form class="hc-form" novalidate><label for="hc-guess"><span class="hc-input-label">Your next guess</span><span class="hc-range-note"></span></label><div class="hc-entry"><input id="hc-guess" type="number" min="1" step="1" inputmode="numeric" autocomplete="off" required aria-describedby="hc-error hc-key-hint"><button type="submit">Take a guess <span aria-hidden="true">&rarr;</span></button></div><p id="hc-error" class="hc-error" role="alert"></p><p id="hc-key-hint" class="hc-key-hint"></p></form>
      </div>
    </div>
    <section class="hc-history" aria-label="Your guesses"><div class="hc-history-heading"><h4>Your trail</h4><span>Most recent first</span></div><p class="hc-empty">Every guess leaves a clue. Your trail starts here.</p><ol></ol></section>
    <footer class="hc-help"><span aria-hidden="true">?</span><p>Find the hidden number in as few guesses as you can. <strong>Warmer means closer.</strong> Follow the higher or lower hint, then try again. There is no time limit.</p></footer>`;
  root.append(wrapper);
  const $ = selector => wrapper.querySelector(selector), input = $("input"), button = $(".hc-entry button"), select = $("select");
  function feedback(label, title, detail) {
    $(".hc-feedback-label").textContent = label; $(".hc-feedback h3").textContent = title; $(".hc-feedback p").textContent = detail;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) $(".hc-feedback").animate([{ opacity: .3, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 220, easing: "ease-out" });
  }
  function clearError() { $(".hc-error").textContent = ""; input.removeAttribute("aria-invalid"); }
  function invalid(message) { $(".hc-error").textContent = message; input.setAttribute("aria-invalid", "true"); input.focus(); }
  function history() {
    const list = $(".hc-history ol"); list.replaceChildren();
    list.tabIndex = state.attempts.length ? 0 : -1;
    $(".hc-empty").hidden = state.attempts.length > 0;
    $(".hc-count").textContent = number(state.attempts.length);
    for (let index = state.attempts.length - 1; index >= 0; index--) {
      const guess = state.attempts[index], found = guess === state.secret, tone = temperature(Math.abs(guess - state.secret));
      const direction = found ? "found" : guess > state.secret ? "high" : "low";
      const item = document.createElement("li"); item.dataset.tone = found ? "found" : tone.key;
      item.innerHTML = `<span class="hc-try-number">${String(index + 1).padStart(2, '0')}</span><strong>${number(guess)}</strong><span class="hc-history-temperature">${found ? "Found it" : tone.name}</span><span class="hc-history-direction"><b aria-hidden="true">${arrow(direction)}</b>${found ? "Correct" : direction === 'high' ? 'Too high' : 'Too low'}</span>`;
      list.append(item);
    }
  }
  function reset({ clearBest = false, focus = true } = {}) {
    if (clearBest) state.best = null;
    state.secret = Math.floor(Math.random() * state.max) + 1;
    state.attempts = []; state.finished = false;
    wrapper.dataset.phase = "ready"; wrapper.dataset.tone = "idle"; wrapper.style.setProperty("--hc-fill", "7%");
    $(".hc-last-number").textContent = "\u2014"; $(".hc-last-number").classList.remove('is-long');
    $(".hc-temperature").textContent = "Awaiting a signal"; $(".hc-temperature-note").textContent = "Your first guess sets the temperature.";
    $(".hc-best").textContent = state.best ?? "\u2014";
    input.disabled = false; input.value = ""; input.max = String(state.max); input.placeholder = `Guess between 1 and ${number(state.max)}`;
    select.value = String(state.max); $(".hc-range-note").textContent = `1 to ${number(state.max)}`;
    $(".hc-input-label").textContent = "Your next guess";
    $(".hc-key-hint").innerHTML = 'Press <kbd>Enter</kbd> to guess. Arrow keys adjust your number.';
    button.innerHTML = 'Take a guess <span aria-hidden="true">&rarr;</span>';
    clearError(); history(); feedback("A NEW NUMBER IS HIDING", "Follow the warmth.", `Pick a whole number from 1 to ${number(state.max)}. Each guess tells you how close you are and which way to go.`);
    onRangeChange(state.max);
    if (focus) input.focus({ preventScroll: true });
  }
  $(".hc-form").addEventListener("submit", event => {
    event.preventDefault();
    if (state.finished) { reset(); return; }
    const value = input.valueAsNumber;
    if (!Number.isInteger(value) || value < 1 || value > state.max) { invalid(`Enter a whole number between 1 and ${number(state.max)}.`); return; }
    if (state.attempts.includes(value)) { invalid("You already tried that number. Pick a fresh one!"); return; }
    clearError(); state.attempts.push(value); history();
    $(".hc-last-number").textContent = number(value); $(".hc-last-number").classList.toggle('is-long', value >= 100000);
    if (value === state.secret) {
      const improved = state.best === null || state.attempts.length < state.best;
      state.finished = true; state.best = Math.min(state.best ?? Infinity, state.attempts.length);
      wrapper.dataset.phase = "won"; wrapper.dataset.tone = "found"; wrapper.style.setProperty("--hc-fill", "100%");
      $(".hc-temperature").textContent = "Right on the number!"; $(".hc-temperature-note").textContent = "Play again for a fresh number hunt.";
      $(".hc-best").textContent = state.best;
      feedback(improved ? "NEW PERSONAL BEST" : "MYSTERY SOLVED", "You found it!", `${number(value)} was the secret. Solved in ${state.attempts.length} ${state.attempts.length === 1 ? 'guess' : 'guesses'}.`);
      $(".hc-input-label").textContent = "Secret number";
      $(".hc-key-hint").innerHTML = 'Press <kbd>Enter</kbd> or choose Play again to start a new round.';
      input.disabled = true; button.innerHTML = 'Play again <span aria-hidden="true">&rarr;</span>'; button.focus({ preventScroll: true });
    } else {
      const tone = temperature(Math.abs(value - state.secret)), high = value > state.secret;
      wrapper.dataset.phase = "playing"; wrapper.dataset.tone = tone.key; wrapper.style.setProperty("--hc-fill", `${tone.fill}%`);
      $(".hc-temperature").textContent = tone.name; $(".hc-temperature-note").textContent = tone.key === 'scorching' ? "Within 2 of the secret number." : "The warmer it feels, the closer you are.";
      feedback(`${tone.name.toUpperCase()} / KEEP EXPLORING`, high ? "Too high. Go lower." : "Too low. Go higher.", tone.key === 'scorching' ? "You're right beside it. Try a nearby number." : "Follow the hint and watch the temperature change.");
      input.value = ""; input.focus({ preventScroll: true });
    }
  });
  input.addEventListener("input", clearError);
  select.addEventListener("change", () => { state.max = Number(select.value); reset({ clearBest: true }); });
  reset();
  return () => wrapper.remove();
}
