// A short, replayable curtain call. All effects are local to the result dialog.
export function createSpotlightFinale(host, { onReplay, onInspect, onToggleSound }) {
  const events = new AbortController(), dialog = document.createElement("dialog");
  let disposed = false, shownCoins = -1;
  dialog.className = "sl-finale";
  dialog.setAttribute("aria-labelledby", "sl-finale-heading");
  dialog.setAttribute("aria-describedby", "sl-finale-message");
  dialog.innerHTML = `<div class="sl-finale-stage">
    <div class="sl-finale-atmosphere" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="sl-finale-particles" aria-hidden="true"></div>
    <button type="button" class="sl-finale-close" aria-label="Return to puzzle">&times;</button>
    <p class="sl-finale-kicker"></p>
    <div class="sl-finale-emblem" aria-hidden="true"><div class="sl-finale-halo"></div>
      <svg class="sl-finale-medal" viewBox="0 0 160 160" fill="none"><circle class="sl-medal-outer" cx="80" cy="80" r="66"/><circle class="sl-medal-inner" cx="80" cy="80" r="55"/><path class="sl-medal-laurel" d="M40 115C17 95 18 62 37 41M120 115c23-20 22-53 3-74M29 89l-12-9m12-7-9-12m15-3-4-15m99 46 13-9m-12-7 9-12m-15-3 4-15"/><path class="sl-medal-check" d="m52 80 19 20 38-41"/><path class="sl-medal-glint" d="M126 13v20m-10-10h20M27 121v14m-7-7h14"/></svg>
      <svg class="sl-finale-clock" viewBox="0 0 160 160" fill="none"><circle class="sl-clock-outer" cx="80" cy="80" r="61"/><circle class="sl-clock-inner" cx="80" cy="80" r="51"/><path class="sl-clock-ticks" d="M80 35v7m45 38h-7m-38 45v-7m-45-38h7"/><path class="sl-clock-hour" d="M80 80 60 65"/><path class="sl-clock-hand" d="M80 80V47"/><circle class="sl-clock-pin" cx="80" cy="80" r="4"/><path class="sl-clock-crack" d="m109 28-5 20 10 10-7 17"/></svg>
    </div>
    <div class="sl-finale-stars" aria-hidden="true"><span>&#10022;</span><span>&#10022;</span><span>&#10022;</span></div>
    <h3 id="sl-finale-heading" tabindex="-1"></h3>
    <p id="sl-finale-message"></p>
    <div class="sl-finale-progress" aria-hidden="true"></div>
    <p class="sl-finale-scene"></p>
    <div class="sl-finale-scoreboard"><div><span>Spotted</span><strong class="sl-finale-found"></strong></div><div><span>Time</span><strong class="sl-finale-time"></strong></div><div><span>New coins</span><strong class="sl-finale-coins" aria-live="polite"></strong></div></div>
    <p class="sl-finale-coin-note"></p>
    <div class="sl-finale-actions"><button type="button" class="sl-finale-replay">Play again</button><button type="button" class="sl-finale-review">Review puzzle</button></div>
    <button type="button" class="sl-finale-sound" aria-pressed="true">Sound on</button>
  </div>`;
  host.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  const on = (node, name, callback) => node.addEventListener(name, callback, { signal: events.signal });
  on($(".sl-finale-replay"), "click", () => dialog.close("replay"));
  on($(".sl-finale-review"), "click", () => dialog.close(dialog.dataset.outcome === "win" ? "inspect" : "reveal"));
  on($(".sl-finale-close"), "click", () => dialog.close("inspect"));
  on($(".sl-finale-sound"), "click", onToggleSound);
  on(dialog, "keydown", event => { if (event.key === "Escape") event.stopPropagation(); });
  on(dialog, "cancel", () => { dialog.returnValue = "inspect"; });
  on(dialog, "close", () => {
    if (disposed || dialog.returnValue === "reset") return;
    if (dialog.returnValue === "replay") onReplay();
    else onInspect(dialog.returnValue === "reveal");
  });
  function setSound(enabled) { $(".sl-finale-sound").textContent = enabled ? "Sound on" : "Sound off"; $(".sl-finale-sound").setAttribute("aria-pressed", String(enabled)); }
  function updateCoins(coins) {
    if (coins === shownCoins) return;
    shownCoins = coins;
    $(".sl-finale-coins").textContent = `+${coins}`;
    $(".sl-finale-coins").classList.toggle("has-coins", coins > 0);
  }
  function play({ won, found, total, elapsed, scene, level, coins, practice, sound, rotating = false }) {
    if (disposed) return;
    shownCoins = -1; dialog.returnValue = "inspect";
    dialog.dataset.outcome = won ? "win" : "loss";
    $(".sl-finale-kicker").textContent = won ? "CASE CLOSED" : "THE CLOCK HAS SPOKEN";
    $("#sl-finale-heading").textContent = won ? "Every secret, spotted." : "Time's up!";
    $("#sl-finale-message").textContent = won ? `All ${total} differences found. What an eye for detail!` : `${found} of ${total} found. ${total - found} little secret${total - found === 1 ? "" : "s"} escaped this time.`;
    $(".sl-finale-scene").textContent = `${scene} / ${level}`;
    $(".sl-finale-found").textContent = `${found} / ${total}`;
    $(".sl-finale-time").textContent = elapsed;
    $(".sl-finale-coin-note").textContent = practice ? "A little practice. A sharper eye. No coins in this mode." : won ? "Newly earned coins are saved to your shared wallet. Replays reward improvements." : "Your earned coins are safe. Take another look and try again.";
    $(".sl-finale-replay").textContent = rotating ? "Next challenge" : won ? "Play again" : "Try again";
    $(".sl-finale-review").textContent = won ? "Admire your finds" : "Reveal the differences";
    $(".sl-finale-progress").innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < found ? "is-found" : ""}" style="--dot-delay:${i * 65}ms"></i>`).join("");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colors = won ? ["#f6d38a", "#fff5ce", "#8bc9ad", "#d8a35f", "#e0a39a"] : ["#e6b880", "#c47b55", "#f5dbb3"];
    $(".sl-finale-particles").innerHTML = reduced ? "" : Array.from({ length: won ? 58 : 20 }, (_, i) => {
      const angle = i * 2.39996, reach = 105 + i % 7 * 27;
      return `<i class="sl-finale-particle" style="--dx:${Math.cos(angle) * reach}px;--dy:${Math.sin(angle) * reach - 70}px;--fall:${220 + i % 5 * 45}px;--turn:${i % 2 ? -450 : 540}deg;--delay:${220 + i % 9 * 45}ms;--duration:${1700 + i % 5 * 270}ms;--color:${colors[i % colors.length]};--size:${5 + i % 4 * 2}px;--shape:${i % 3 === 0 ? "50%" : "1px"}"></i>`;
    }).join("");
    setSound(sound); updateCoins(coins);
    dialog.showModal(); $("#sl-finale-heading").focus({ preventScroll: true });
  }
  function reset() { if (dialog.open) dialog.close("reset"); $(".sl-finale-particles").replaceChildren(); }
  return { play, updateCoins, setSound, reset, dispose() { disposed = true; events.abort(); reset(); dialog.remove(); } };
}
