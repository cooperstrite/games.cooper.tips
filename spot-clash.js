import { createComputerOpponent, createOpponentScheduler } from "./arcade/opponents.js";
import { SPOT_LEVELS, spotLevel, spotPicture, createSpotMatch, beginSpotRound, claimSpotPicture, spotComputerPick } from "./spot-clash-engine.js";
import { SPOT_ATLAS, spotArt, spotAvatar } from "./spot-clash-art.js";
import { createSpotAudio } from "./spot-clash-audio.js";

const EXAMPLE = [
  ["fox", "mushroom", "planet", "key", "shell", "star", "strawberry", "compass"],
  ["camera", "lemon", "fox", "lantern", "butterfly", "whale", "gem", "crown"],
];

export function createSpotClash(root) {
  const wrapper = document.createElement("section"); wrapper.className = "spot-clash";
  wrapper.innerHTML = `
    <header class="scg-hero"><div><p class="scg-eyebrow">A DUEL OF DETAILS</p><h3>Two cards.<br>One match.</h3><p>Find the picture on <strong>both cards</strong>.<br>Spot it before your rival does.</p></div><img src="assets/spot-clash-cover-v2.png" width="180" height="180" alt="Two picture cards with the same fox highlighted"></header>
    <div class="scg-setup"><span class="scg-label">CHOOSE YOUR CHALLENGER</span><div class="scg-levels" role="group" aria-label="Computer difficulty">${SPOT_LEVELS.map(level => `<button type="button" data-level="${level.id}" aria-pressed="${level.id === "medium"}">${level.label}</button>`).join("")}</div><p class="scg-level-note"></p></div>
    <div class="scg-scoreboard" aria-label="Match score">${["You", "Computer"].map((name, i) => `<div class="scg-player" data-player="${i}"><span class="scg-avatar">${spotAvatar(i === 1)}</span><div><span class="scg-player-name">${name}</span><strong class="scg-score">0</strong></div><span class="scg-point" aria-hidden="true">+1</span><div class="scg-pips" aria-hidden="true"></div></div>`).join('<div class="scg-goal"><span>FIRST TO</span><strong></strong><small>points</small></div>')}</div>
    <div class="scg-roundbar"><span class="scg-round">Ready to play</span><span class="scg-search"><i></i>Computer ready</span></div>
    <div class="scg-status" role="status" aria-live="polite" aria-atomic="true"><div><p class="scg-status-tag"></p><h3 class="scg-status-title"></h3><p class="scg-status-detail"></p></div><div class="scg-answer" hidden></div></div>
    <div class="scg-stage">
      <div class="scg-cards">${[0, 1].map(i => `<section class="scg-card" aria-label="Picture card ${i + 1}"><header><span class="scg-card-number">${i + 1}</span><strong>CARD ${i + 1}</strong><span>One picture in common</span></header><div class="scg-grid" data-card="${i}"></div></section>`).join("")}</div>
      <div class="scg-curtain" hidden><span class="scg-lens" aria-hidden="true"></span><strong></strong><p></p></div>
    </div>
    <div class="scg-actions"><button type="button" class="scg-primary" data-action="start">Start match</button><button type="button" class="scg-primary" data-action="next" hidden>Next pair <span aria-hidden="true">&rarr;</span></button><button type="button" data-action="pause" disabled>Pause</button><button type="button" data-action="sound" aria-pressed="true">Sound on</button></div>
    <p class="scg-pacing">After each point, the cards stay so you can see what happened.</p>
    <section class="scg-finale" hidden aria-label="Match result"><div class="scg-sparks" aria-hidden="true"></div><div class="scg-final-avatar" aria-hidden="true"></div><p class="scg-eyebrow">MATCH COMPLETE</p><h3 tabindex="-1"></h3><p class="scg-final-detail"></p><div class="scg-final-stats"></div><button type="button" class="scg-primary" data-action="replay">Play again</button></section>
    <section class="scg-recent" hidden aria-label="Recent points"><div><span class="scg-label">THE LAST FEW POINTS</span><small>Newest first</small></div><ol></ol></section>
    <section class="scg-guide" aria-label="How to play"><div><p class="scg-eyebrow">HOW THE DUEL WORKS</p><h3>Same picture.<br>Fastest eyes.</h3><p>Every pair has exactly one picture in common. Its position changes, but the picture itself stays the same.</p></div><ol><li><strong>Compare both cards.</strong> Tap the shared picture on either card. A correct pick earns you <b>1 point</b>.</li><li><strong>The computer is searching too.</strong> If it finds the match first, it earns 1 point. If either player picks a wrong picture, the other player gets the point.</li><li><strong>See who scored, then continue.</strong> The shared picture is marked on both cards, and the result explains the point. Choose <b>Next pair</b> when you are ready.</li></ol><p class="scg-win-rule"></p></section>`;
  root.append(wrapper);
  const $ = selector => wrapper.querySelector(selector), abort = new AbortController();
  const on = (element, event, callback) => element.addEventListener(event, callback, { signal: abort.signal });
  const botClock = createOpponentScheduler(), dealClock = createOpponentScheduler(), audio = createSpotAudio();
  let state = createSpotMatch(), computer = createComputerOpponent(), preparing = false, disposed = false;
  let pictures = "loading", image, imageAttempt = 0, frame = 0, generation = 0, activeStart = 0, activeElapsed = 0;
  const pictureName = id => spotPicture(id)?.name || "Picture";
  const canPick = () => state.phase === "playing" && !state.paused && !preparing && !document.hidden;

  function renderCards() {
    const size = spotLevel(state.difficulty).size, cards = state.pair?.cards || EXAMPLE.map(card => card.slice(0, size));
    wrapper.querySelectorAll("[data-card]").forEach((grid, i) => {
      grid.dataset.count = size;
      grid.innerHTML = cards[i].map(id => `<button type="button" class="scg-tile" data-picture="${id}" aria-label="${pictureName(id)}, card ${i + 1}">${spotArt(id)}<span class="scg-picture-label">${pictureName(id)}</span><span class="scg-tile-mark" aria-hidden="true"></span></button>`).join("");
    });
  }

  function resultCopy() {
    const r = state.result, you = r.scorer === 0;
    if (r.correct) return { title: you ? "You found it! +1" : "Computer found it. +1", detail: `${you ? "You" : "The computer"} spotted the ${pictureName(r.shared).toLowerCase()} first. It is highlighted on both cards.` };
    return { title: you ? "Computer missed. Your point!" : "Wrong picture. Computer +1", detail: `${r.actor === 0 ? "You" : "The computer"} picked the ${pictureName(r.picture).toLowerCase()}. Only the ${pictureName(r.shared).toLowerCase()} appears on both cards. ${you ? "You get" : "The computer gets"} 1 point.` };
  }

  function update() {
    const config = spotLevel(state.difficulty), result = state.result, reviewed = Boolean(result) && !preparing;
    wrapper.dataset.phase = preparing ? "dealing" : state.phase;
    wrapper.dataset.paused = String(state.paused);
    wrapper.dataset.motionPaused = String(state.paused || document.hidden);
    wrapper.dataset.scorer = reviewed ? String(result.scorer) : "none";
    wrapper.querySelectorAll("[data-level]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.level === state.difficulty)));
    $(".scg-level-note").textContent = `${config.size} pictures per card / First to ${config.target}. ${config.description}`;
    $(".scg-goal strong").textContent = state.target;
    $(".scg-win-rule").textContent = `First to ${state.target} points wins this ${config.label.toLowerCase()} match. Wrong picks never subtract points; they give your rival a point. The computer can make mistakes too.`;
    wrapper.querySelectorAll("[data-player]").forEach((panel, i) => {
      panel.querySelector(".scg-score").textContent = state.scores[i];
      panel.setAttribute("aria-label", `${i ? "Computer" : "You"}: ${state.scores[i]} of ${state.target} points`);
      panel.classList.toggle("is-scoring", reviewed && result.scorer === i);
      panel.querySelector(".scg-pips").innerHTML = Array.from({ length: state.target }, (_, n) => `<i class="${n < state.scores[i] ? "is-filled" : ""}"></i>`).join("");
    });
    $(".scg-round").textContent = preparing ? `Pair ${state.round + 1}` : state.round ? `Pair ${state.round}${state.phase === "finished" ? " / match complete" : ""}` : "Example cards / no points yet";
    $(".scg-search").innerHTML = `<i></i>${state.paused ? "Search paused" : state.phase === "playing" && !preparing ? "Computer is looking" : "Computer waiting"}`;
    $(".scg-status").dataset.scorer = reviewed ? result.scorer : "none";
    let tag = "ONE SHARED PICTURE", title = "Ready, set, spot.", detail = "Tap Start match when you are ready. Find the same picture on both cards.";
    if (pictures === "loading") { title = "Getting the pictures ready..."; detail = "Your opponent waits until the artwork is loaded."; }
    else if (pictures === "error") { title = "The pictures could not load."; detail = "Choose Retry pictures to try again."; }
    else if (state.paused) { tag = "TAKE YOUR TIME"; title = "Match paused"; detail = "Both searches are paused. Resume when you are ready."; }
    else if (preparing) { tag = "NEW PAIR"; title = "Get ready..."; detail = "Both cards will appear together. Tap the matching picture on either card."; }
    else if (state.phase === "playing") { title = "Find the picture on both cards."; detail = "Tap it on either card before the computer finds it."; }
    else if (reviewed) { ({ title, detail } = resultCopy()); tag = result.scorer === 0 ? "POINT TO YOU" : "POINT TO COMPUTER"; }
    if (state.phase === "finished") {
      tag = state.winner === 0 ? "FINAL POINT TO YOU" : "FINAL POINT TO COMPUTER";
      title = state.winner === 0 ? "You win the match!" : "Computer wins the match.";
      detail += ` Final score: You ${state.scores[0]}, Computer ${state.scores[1]}.`;
    }
    $(".scg-status-tag").textContent = tag; $(".scg-status-title").textContent = title; $(".scg-status-detail").textContent = detail;
    $(".scg-answer").hidden = !reviewed;
    $(".scg-answer").innerHTML = reviewed ? `${spotArt(result.shared)}<span>THE MATCH<strong>${pictureName(result.shared)}</strong></span>` : "";
    wrapper.querySelectorAll(".scg-card header>span:last-child").forEach(label => {
      label.textContent = reviewed ? `${result.scorer === 0 ? "YOU" : "COMPUTER"} +1` : "One picture in common";
      label.classList.toggle("is-point", reviewed);
    });
    wrapper.querySelectorAll(".scg-tile").forEach(button => {
      const matched = reviewed && button.dataset.picture === result.shared;
      const wrong = reviewed && !result.correct && button.dataset.picture === result.picture;
      button.disabled = !canPick(); button.classList.toggle("is-match", matched); button.classList.toggle("is-wrong", wrong);
      button.classList.toggle("is-dim", reviewed && !matched && !wrong);
      button.querySelector(".scg-tile-mark").textContent = matched ? "MATCH" : wrong ? "WRONG PICK" : "";
    });
    const covered = state.paused || preparing || pictures !== "ready";
    $(".scg-curtain").hidden = !covered; $(".scg-stage").dataset.covered = String(covered);
    $(".scg-curtain strong").textContent = state.paused ? "Paused" : pictures === "ready" ? "Ready?" : pictures === "error" ? "Pictures unavailable" : "Loading pictures";
    $(".scg-curtain p").textContent = state.paused ? "The computer is waiting too." : "Two cards. One shared picture.";
    const next = $('[data-action="next"]');
    next.hidden = state.phase !== "review"; next.disabled = preparing;
    next.innerHTML = preparing ? "Dealing..." : 'Next pair <span aria-hidden="true">&rarr;</span>';
    const start = $('[data-action="start"]');
    start.textContent = pictures === "error" ? "Retry pictures" : state.phase === "finished" ? "Play again" : state.phase === "ready" ? preparing ? "Dealing..." : "Start match" : "New match";
    // Keep controls in place and ignore double taps while the next pair is being dealt.
    start.disabled = pictures === "loading" || preparing;
    start.classList.toggle("scg-primary", state.phase === "finished" || state.phase === "ready");
    $('[data-action="pause"]').disabled = !preparing && state.phase !== "playing";
    $('[data-action="pause"]').textContent = state.paused ? "Resume" : "Pause";
    $('[data-action="sound"]').textContent = audio.enabled ? "Sound on" : "Sound off";
    $('[data-action="sound"]').setAttribute("aria-pressed", String(audio.enabled));
    $(".scg-pacing").textContent = state.phase === "review" ? "Take a look at the highlighted pair, then choose Next pair." : state.phase === "finished" ? "The final pair stays here so you can review the deciding point." : "After each point, the cards stay so you can see what happened.";
  }

  function cancelWork() {
    generation++; cancelAnimationFrame(frame); frame = 0;
    for (const clock of [botClock, dealClock]) { clock.cancel(); clock.resume(); }
    preparing = false; audio.silence(); activeStart = 0; activeElapsed = 0;
  }
  function reset(difficulty = state.difficulty) {
    cancelWork(); state = createSpotMatch(difficulty); computer = createComputerOpponent({ difficulty });
    $(".scg-finale").hidden = true; $(".scg-recent").hidden = true;
    renderCards(); update();
  }
  function trackTime() {
    const active = state.phase === "playing" && !state.paused && !document.hidden;
    if (active && !activeStart) activeStart = performance.now();
    else if (!active && activeStart) { activeElapsed += performance.now() - activeStart; activeStart = 0; }
  }
  function scheduleComputer() {
    const token = generation;
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
      if (disposed || token !== generation || state.phase !== "playing") return;
      trackTime();
      const plan = computer.planReaction();
      const pick = spotComputerPick(state.pair, plan.correct);
      botClock.schedule(() => claim(1, pick), plan.delay);
    }); });
  }
  function nextPair() {
    if (preparing || state.paused || pictures !== "ready" || !["ready", "review"].includes(state.phase)) return;
    const focusCards = ["start", "next", "replay"].includes(document.activeElement?.dataset.action);
    preparing = true; activeStart = 0; activeElapsed = 0; update();
    dealClock.schedule(() => {
      if (disposed) return;
      preparing = false;
      if (!beginSpotRound(state)) return;
      renderCards(); update(); trackTime(); audio.play("deal"); scheduleComputer();
      if (focusCards && !document.hidden) {
        $(".scg-tile").focus({ preventScroll: true });
      }
    }, 650);
  }
  function showHistory() {
    $(".scg-recent").hidden = !state.history.length;
    $(".scg-recent ol").innerHTML = state.history.slice(-5).reverse().map(r => `<li data-scorer="${r.scorer}">${spotArt(r.shared)}<span><small>PAIR ${r.round}</small><strong>${r.scorer ? "Computer" : "You"} +1</strong><span>${pictureName(r.shared)}${!r.correct ? " / wrong pick" : ""}</span></span></li>`).join("");
  }
  function showFinale() {
    const won = state.winner === 0, finale = $(".scg-finale"); finale.hidden = false; finale.dataset.winner = state.winner;
    $(".scg-final-avatar").innerHTML = spotAvatar(!won);
    $(".scg-finale h3").textContent = won ? "Sharp eyes. Well played!" : "The computer wins this one.";
    $(".scg-final-detail").textContent = `${won ? "You reached" : "The computer reached"} ${state.target} points first. Final score: You ${state.scores[0]}, Computer ${state.scores[1]}.`;
    const correct = state.history.filter(r => r.actor === 0 && r.correct), best = correct.length ? Math.min(...correct.map(r => r.elapsed)) : null;
    $(".scg-final-stats").innerHTML = `<span><strong>${state.round}</strong>pairs played</span><span><strong>${correct.length}</strong>you found first</span><span><strong>${best === null ? "--" : (best / 1000).toFixed(2) + "s"}</strong>your fastest match</span>`;
    $(".scg-sparks").innerHTML = Array.from({ length: won ? 28 : 8 }, (_, i) => `<i style="--x:${i * 37 % 100}%;--delay:${i % 7 * 80}ms;--drift:${Math.sin(i) * 45}px"></i>`).join("");
    audio.play(won ? "win" : "lose");
    // Focus announces the match result without jumping away from the deciding pictures.
    $(".scg-finale h3").focus({ preventScroll: true });
  }
  function claim(actor, id) {
    if (!canPick()) return;
    const elapsed = activeElapsed + (activeStart ? performance.now() - activeStart : 0);
    if (!claimSpotPicture(state, actor, id, elapsed)) return;
    botClock.cancel(); trackTime(); update(); showHistory();
    if (state.phase === "finished") showFinale(); else audio.play(state.result.scorer === 0 ? "you" : "computer");
  }
  function loadPictures() {
    pictures = "loading"; wrapper.style.removeProperty("--scg-atlas"); update();
    // A failed CSS image can remain blank even after an Image() retry succeeds.
    // Decode first, then give every card the same successful URL; retry with a fresh URL.
    const source = SPOT_ATLAS + (imageAttempt ? `?retry=${imageAttempt}` : ""); imageAttempt++;
    const requested = new Image(); image = requested;
    image.onload = async () => {
      try { if (requested.decode) await requested.decode(); }
      catch { if (!disposed) { pictures = "error"; update(); } return; }
      if (!disposed) {
        wrapper.style.setProperty("--scg-atlas", `url("${source}")`);
        pictures = "ready"; update();
      }
    };
    image.onerror = () => { if (!disposed) { pictures = "error"; update(); } };
    image.src = source;
  }
  on(wrapper, "click", event => {
    const button = event.target.closest("button"); if (!button || button.disabled) return;
    audio.unlock();
    if (button.dataset.picture) { claim(0, button.dataset.picture); return; }
    if (button.dataset.level) { reset(button.dataset.level); return; }
    switch (button.dataset.action) {
      case "start": if (pictures === "error") loadPictures(); else { reset(); nextPair(); } break;
      case "next": nextPair(); break;
      case "replay": reset(); nextPair(); $(".scg-roundbar").scrollIntoView({ block: "start", behavior: "instant" }); break;
      case "sound": audio.toggle(); update(); break;
      case "pause":
        state.paused = !state.paused; trackTime();
        for (const clock of [botClock, dealClock]) clock[state.paused ? "pause" : "resume"]();
        if (state.paused) audio.silence(); update(); break;
    }
  });
  on(document, "visibilitychange", () => { trackTime(); if (document.hidden) audio.silence(); wrapper.dataset.motionPaused = String(state.paused || document.hidden); });
  renderCards(); loadPictures();
  return () => { disposed = true; cancelWork(); abort.abort(); botClock.dispose(); dealClock.dispose(); audio.dispose(); if (image) image.onload = image.onerror = null; wrapper.remove(); };
}
