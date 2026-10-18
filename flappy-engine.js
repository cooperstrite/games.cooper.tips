export const WORLD = { height: 7.2, radius: 0.22, pipeWidth: 1.05 };
export const DIFFICULTIES = {
  easy: { name: "Easy", note: "Wide gaps, a gentle pace", speed: 2.8, gap: 3.15, spacing: 5.4, gravity: 8.2, flap: 3.15 },
  medium: { name: "Medium", note: "Quicker falls, rising and falling gaps", speed: 3.6, gap: 2.45, spacing: 5.1, gravity: 12.5, flap: 4.4, levels: [2, 3.05, 4.15, 5.2], maxShift: 1.4 },
  hard: { name: "Hard", note: "Heavy gravity, narrow gaps, a fast changing course", speed: 4.8, gap: 1.8, spacing: 4.9, gravity: 18, flap: 5, levels: [1.5, 2.55, 3.65, 4.75, 5.7], maxShift: 1.4 },
  expert: { name: "Expert", note: "Very fast drops, tiny openings, almost no room for error", speed: 5.7, gap: 1.45, spacing: 5.1, gravity: 25, flap: 5.8, levels: [1.45, 2.5, 3.55, 4.6, 5.65], maxShift: 1.4 },
};
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const speedFor = state => state.difficulty.speed + Math.min(0.85, state.score * 0.035);

export function circleHitsRect(x, y, radius, rect) {
  const nearestX = clamp(x, rect.x, rect.x + rect.width);
  const nearestY = clamp(y, rect.y, rect.y + rect.height);
  return (x - nearestX) ** 2 + (y - nearestY) ** 2 < radius ** 2;
}

export function hitsPipe(distance, y, pipe, radius = WORLD.radius) {
  const bottom = pipe.center - pipe.gap / 2, top = pipe.center + pipe.gap / 2;
  const x = pipe.x - WORLD.pipeWidth / 2;
  return circleHitsRect(distance, y, radius, { x, y: -2, width: WORLD.pipeWidth, height: bottom + 2 }) || circleHitsRect(distance, y, radius, { x, y: top, width: WORLD.pipeWidth, height: WORLD.height + 2 - top });
}

export function createFlappyModel(difficultyId = "easy", random = Math.random) {
  const state = {};
  let nextPipeId = 1;
  function makePipe(x, previousCenter = WORLD.height * 0.52, first = false) {
    const gap = state.difficulty.gap;
    const margin = gap / 2 + 0.55;
    let center;
    if (state.difficulty.levels) {
      const levels = state.difficulty.levels;
      if (first) {
        const initial = previousCenter + (random() * 2 - 1) * 0.3;
        center = levels.reduce((closest, value) => Math.abs(value - initial) < Math.abs(closest - initial) ? value : closest, levels[0]);
      } else {
        // Every harder-mode opening changes altitude. Limit jumps so the bird
        // can reach the next opening within the space between pipe pairs.
        const choices = levels.filter(value => Math.abs(value - previousCenter) > 0.3 && Math.abs(value - previousCenter) <= state.difficulty.maxShift);
        center = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
      }
    } else {
      const change = (random() * 2 - 1) * (first ? 0.3 : Math.min(1.15, gap * 0.5));
      center = previousCenter + change;
    }
    return { id: nextPipeId++, x, center: clamp(center, margin, WORLD.height - margin), gap, passed: false };
  }
  function reset(id = state.difficultyId || difficultyId) {
    const selected = typeof id === "string" && Object.hasOwn(DIFFICULTIES, id) ? id : "easy";
    nextPipeId = 1;
    Object.assign(state, { difficultyId: selected, difficulty: DIFFICULTIES[selected], phase: "ready", paused: false, time: 0, distance: 0, y: WORLD.height * 0.52, vy: 0, score: 0, flaps: 0, lastFlap: -10, crashAge: 0, crashReason: "", pipes: [] });
    for (let index = 0; index < 7; index++) {
      const previous = state.pipes[state.pipes.length - 1];
      state.pipes.push(makePipe(9 + index * state.difficulty.spacing, previous?.center, index === 0));
    }
  }
  function crash(reason) {
    state.phase = "gameover"; state.crashReason = reason; state.crashAge = 0; state.paused = false;
  }
  function step(dt) {
    if (state.paused) return;
    state.time += dt;
    if (state.phase === "gameover") { state.crashAge += dt; return; }
    if (state.phase !== "playing") return;
    state.distance += speedFor(state) * dt;
    state.y += state.vy * dt - state.difficulty.gravity * dt * dt / 2;
    state.vy -= state.difficulty.gravity * dt;
    if (state.y + WORLD.radius > WORLD.height) { state.y = WORLD.height - WORLD.radius; state.vy = Math.min(0, state.vy); }
    if (state.y - WORLD.radius <= 0) { state.y = WORLD.radius; crash("ground"); return; }
    for (const pipe of state.pipes) {
      if (hitsPipe(state.distance, state.y, pipe)) { crash("pipe"); return; }
      if (!pipe.passed && state.distance - WORLD.radius > pipe.x + WORLD.pipeWidth / 2) { pipe.passed = true; state.score += 1; }
    }
    while (state.pipes[0].x < state.distance - 5) {
      state.pipes.shift(); const previous = state.pipes[state.pipes.length - 1];
      state.pipes.push(makePipe(previous.x + state.difficulty.spacing, previous.center));
    }
  }
  reset(difficultyId);
  return {
    state, reset,
    flap() {
      if (state.paused || state.phase === "gameover") return false;
      state.phase = "playing"; state.vy = state.difficulty.flap; state.flaps += 1; state.lastFlap = state.time; return true;
    },
    togglePause() { if (state.phase === "playing") state.paused = !state.paused; return state.paused; },
    advance(seconds) {
      if (!Number.isFinite(seconds) || seconds <= 0 || state.paused) return;
      let remaining = Math.min(10, seconds);
      while (remaining > 0.000001) { const dt = Math.min(1 / 120, remaining); step(dt); remaining -= dt; }
    },
  };
}
