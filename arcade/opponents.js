// Shared computer policy. Games supply legal moves and public-position scores;
// this module never reads player input, changes rules, or rolls a game's dice.
export const OPPONENT_LEVELS = Object.freeze([
  Object.freeze({ id: "easy", label: "Easy", strategy: 0.32, accuracy: 0.60, reaction: 2700, tap: 650, think: 1000 }),
  Object.freeze({ id: "medium", label: "Medium", strategy: 0.65, accuracy: 0.76, reaction: 2100, tap: 450, think: 850 }),
  Object.freeze({ id: "hard", label: "Hard", strategy: 0.88, accuracy: 0.88, reaction: 1550, tap: 310, think: 750 }),
  Object.freeze({ id: "expert", label: "Expert", strategy: 0.96, accuracy: 0.95, reaction: 1150, tap: 225, think: 650 }),
]);

export function opponentLevel(id) {
  return OPPONENT_LEVELS.find(level => level.id === id) || OPPONENT_LEVELS[1];
}

export function createComputerOpponent({ difficulty = "medium", random = Math.random } = {}) {
  const level = opponentLevel(difficulty);
  const sample = () => Math.max(0, Math.min(0.999999999, Number(random()) || 0));
  return Object.freeze({
    level,
    choose(legalActions, evaluate = () => 0) {
      if (!legalActions.length) return null;
      // Even expert can make a mistake. All choices come from the same legal set.
      if (sample() >= level.strategy) return legalActions[Math.floor(sample() * legalActions.length)];
      const scores = legalActions.map(action => Number(evaluate(action)) || 0);
      const best = Math.max(...scores);
      const candidates = legalActions.filter((_, index) => Math.abs(scores[index] - best) < 0.00001);
      return candidates[Math.floor(sample() * candidates.length)];
    },
    attempt() { return sample() < level.accuracy; },
    planReaction() {
      return { delay: Math.max(900, Math.round(level.reaction * (0.85 + sample() * 0.30))), correct: sample() < level.accuracy };
    },
    nextTapDelay() {
      // At most ~5.2 taps/sec on expert, with occasional rests. No rubber-banding.
      return Math.round(level.tap * (0.86 + sample() * 0.28) + (sample() < 0.08 ? level.tap : 0));
    },
    thinkingDelay() { return Math.round(level.think + sample() * 250); },
  });
}

// One cancellable action at a time, with no catch-up burst after a hidden tab.
// Explicit pause and document visibility are independent pause reasons.
export function createOpponentScheduler({
  clock = () => performance.now(), setTimer = setTimeout, clearTimer = clearTimeout,
  visibility = typeof document === "undefined" ? null : document,
} = {}) {
  let timer = null, task = null, remaining = 0, deadline = 0, manualPause = false, disposed = false;
  const paused = () => manualPause || Boolean(visibility?.hidden);
  function stop() {
    if (timer !== null) { remaining = Math.max(0, deadline - clock()); clearTimer(timer); timer = null; }
  }
  function arm() {
    if (!task || timer !== null || paused() || disposed) return;
    deadline = clock() + remaining;
    timer = setTimer(() => {
      timer = null;
      const callback = task; task = null;
      if (!disposed) callback?.();
    }, remaining);
  }
  function onVisibility() { if (paused()) stop(); else arm(); }
  visibility?.addEventListener("visibilitychange", onVisibility);
  return {
    schedule(callback, delay) {
      stop(); task = callback; remaining = Math.max(0, Number(delay) || 0); arm();
    },
    cancel() { stop(); task = null; remaining = 0; },
    pause() { manualPause = true; stop(); },
    resume() { manualPause = false; arm(); },
    dispose() { disposed = true; stop(); task = null; visibility?.removeEventListener("visibilitychange", onVisibility); },
    get paused() { return paused(); },
  };
}
