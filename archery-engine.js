export const QUIVER = 6;
export const GRAVITY = 9.81;
export const LAUNCH = { x: 0, y: 2.2 };
export const LEVELS = [
  { id: "first-flight", name: "First Flight", tag: "Learn the bow", distance: 20, height: 2.8, radius: 1.25, goal: 24, wind: 0, gust: 0, motionY: 0, motionX: 0, period: 6, theme: "meadow", tip: "A calm, stationary target. Follow the dotted flight guide and send your first arrow into the gold." },
  { id: "meadow-breeze", name: "Meadow Breeze", tag: "Wind per shot", distance: 35, height: 2.8, radius: 1.25, goal: 26, wind: 3.5, shotWinds: [3.5, -4.5, 1.5, 5.5, -2, -5.5], gust: 0, motionY: 0, motionX: 0, period: 6, theme: "meadow", tip: "A new steady wind after every arrow. It stays fixed while you aim and shoot. Recheck the windsock and recalibrate before each shot." },
  { id: "lantern-lift", name: "Lantern Lift", tag: "Moving target", distance: 35, height: 3.4, radius: 1.2, goal: 22, wind: 0, gust: 0, motionY: 1.35, motionX: 0, period: 5.6, theme: "forest", tip: "The target rises and falls. Shoot toward where it will be when your arrow arrives, not where it is now." },
  { id: "gusty-gorge", name: "Gusty Gorge", tag: "Changing wind", distance: 50, height: 3, radius: 1.25, goal: 24, wind: -1, gust: 4.8, windPeriod: 7.5, motionY: 0, motionX: 0, period: 6, theme: "gorge", tip: "Watch the windsock: gusts change direction, even during a shot. The dotted guide assumes the current wind stays steady." },
  { id: "longshot-lake", name: "Longshot Lake", tag: "Distance per shot", distance: 70, shotDistances: [70, 45, 60, 35, 65, 50], height: 3, radius: 1.35, goal: 22, wind: 0, gust: 0, motionY: 0, motionX: 0, period: 6, theme: "lake", tip: "Calm air, but a new target distance after every arrow, from 35 to 70 meters. Your aim and power stay put: recalibrate the dotted path before shooting again." },
  { id: "aurora-finale", name: "Aurora Finale", tag: "All three twists", distance: 60, height: 3.6, radius: 1.25, goal: 26, wind: 0, gust: 6, windPeriod: 6.5, motionY: 1.3, motionX: 6, period: 5.2, theme: "aurora", tip: "The target moves up, down, nearer, and farther while the wind shifts. Watch a full cycle, then time your shot." },
];

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function getLevel(id) { return LEVELS.find(level => level.id === id) || LEVELS[0]; }
function perShot(choices, index, fallback) {
  return choices?.length ? choices[clamp(Number.isFinite(index) ? Math.floor(index) : 0, 0, choices.length - 1)] : fallback;
}
export function getWind(level, time, shotIndex = 0) {
  return perShot(level.shotWinds, shotIndex, level.wind) + (level.gust ? Math.sin(time * Math.PI * 2 / level.windPeriod) * level.gust : 0);
}
export function getTarget(level, time, shotIndex = 0) {
  return {
    x: perShot(level.shotDistances, shotIndex, level.distance) + level.motionX * Math.sin(time * Math.PI * 2 / (level.period * 1.4)),
    y: level.height + level.motionY * Math.sin(time * Math.PI * 2 / level.period),
    radius: level.radius,
  };
}
export function velocityFor(angle, power) {
  const speed = 12 + clamp(power, 25, 100) * 0.3;
  const radians = clamp(angle, 2, 65) * Math.PI / 180;
  return { x: Math.cos(radians) * speed, y: Math.sin(radians) * speed };
}
export function startingAngle(level, power = 70) {
  const speed = 12 + power * 0.3;
  const x = level.distance;
  const height = level.height - LAUNCH.y;
  const discriminant = speed ** 4 - GRAVITY * (GRAVITY * x * x + 2 * height * speed * speed);
  if (discriminant < 0) return 35;
  return clamp(Math.atan((speed * speed - Math.sqrt(discriminant)) / (GRAVITY * x)) * 180 / Math.PI, 2, 65);
}
export function scoreOffset(offset, radius) {
  const fraction = Math.abs(offset) / radius;
  return fraction > 1 ? 0 : clamp(Math.ceil((1 - fraction) * 10 + 1e-9), 1, 10);
}
export function starsForScore(level, score) {
  if (score < level.goal) return 0;
  if (score >= Math.max(52, level.goal + 18)) return 3;
  return score >= Math.max(40, level.goal + 8) ? 2 : 1;
}

export function predictFlight(level, angle, power, time, shotIndex = 0) {
  const velocity = velocityFor(angle, power);
  const wind = getWind(level, time, shotIndex);
  const target = getTarget(level, time, shotIndex);
  const points = [];
  let crossing = null;
  let previous = { ...LAUNCH, time: 0 };
  for (let t = 0; t <= 8; t += 0.04) {
    const point = { x: velocity.x * t + 0.5 * wind * 0.9 * t * t, y: LAUNCH.y + velocity.y * t - 0.5 * GRAVITY * t * t, time: t };
    points.push(point);
    if (!crossing && previous.x <= target.x && point.x >= target.x) {
      const fraction = (target.x - previous.x) / (point.x - previous.x);
      crossing = { x: target.x, y: previous.y + (point.y - previous.y) * fraction, time: previous.time + (t - previous.time) * fraction };
    }
    if (point.y < 0 || point.x > level.distance + level.motionX + 12) break;
    previous = point;
  }
  return { points, crossing };
}

export function createArcheryModel(levelId = LEVELS[0].id) {
  const state = {};
  function reset(id = state.level?.id || levelId) {
    const level = getLevel(id);
    Object.assign(state, { level, time: 0, score: 0, arrowsLeft: QUIVER, shots: [], phase: "aiming", paused: false, angle: Math.round(startingAngle(level) * 10) / 10, power: 70, arrow: null, impact: null });
  }
  function finish(arrow, target, reason) {
    const offset = arrow.y - target.y;
    const points = reason === "short" ? 0 : scoreOffset(offset, target.radius);
    const shot = { number: state.shots.length + 1, points, offset, x: arrow.x, y: arrow.y, targetX: target.x, targetY: target.y, wind: getWind(state.level, state.time, state.shots.length), flightTime: arrow.age, gear: arrow.gear, reason: points ? "hit" : reason === "short" ? "short" : offset > 0 ? "high" : "low", time: state.time };
    state.shots.push(shot);
    state.score += points;
    state.impact = shot;
    state.arrow = null;
    state.phase = state.arrowsLeft === 0 ? "complete" : "aiming";
  }
  function step(dt) {
    if (state.paused || state.phase === "complete") return;
    const beforeTarget = getTarget(state.level, state.time, state.shots.length);
    state.time += dt;
    if (!state.arrow) return;
    const target = getTarget(state.level, state.time, state.shots.length);
    const arrow = state.arrow;
    const previous = { x: arrow.x, y: arrow.y, age: arrow.age };
    const acceleration = getWind(state.level, state.time - dt / 2, state.shots.length) * 0.9;
    arrow.x += arrow.vx * dt + acceleration * dt * dt / 2;
    arrow.y += arrow.vy * dt - GRAVITY * dt * dt / 2;
    arrow.vx += acceleration * dt;
    arrow.vy -= GRAVITY * dt;
    arrow.age += dt;
    const before = previous.x - beforeTarget.x;
    const after = arrow.x - target.x;
    const crossing = before <= 0 && after >= 0 ? -before / (after - before) : Infinity;
    const ground = arrow.y <= 0 ? previous.y / (previous.y - arrow.y) : Infinity;
    if (ground <= crossing && ground <= 1) {
      finish({ ...arrow, x: previous.x + (arrow.x - previous.x) * ground, y: 0, age: previous.age + dt * ground }, target, "short");
    } else if (crossing <= 1) {
      const hit = { ...arrow, x: previous.x + (arrow.x - previous.x) * crossing, y: previous.y + (arrow.y - previous.y) * crossing, age: previous.age + dt * crossing };
      const atImpact = { ...target, x: beforeTarget.x + (target.x - beforeTarget.x) * crossing, y: beforeTarget.y + (target.y - beforeTarget.y) * crossing };
      finish(hit, atImpact, "miss");
    } else if (arrow.age > 8 || arrow.x < -5) {
      finish(arrow, target, "short");
    }
  }
  reset(levelId);
  return {
    state, reset,
    setAim(angle, power) {
      if (state.phase !== "aiming" || state.paused) return;
      if (Number.isFinite(angle)) state.angle = Math.round(clamp(angle, 2, 65) * 10) / 10;
      if (Number.isFinite(power)) state.power = clamp(power, 25, 100);
    },
    shoot() {
      if (state.phase !== "aiming" || state.paused || state.arrowsLeft <= 0) return false;
      const velocity = velocityFor(state.angle, state.power);
      state.arrow = { ...LAUNCH, vx: velocity.x, vy: velocity.y, age: 0 };
      state.arrowsLeft -= 1;
      state.phase = "flying";
      return true;
    },
    advance(seconds) {
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      let remaining = Math.min(seconds, 10);
      while (remaining > 0.000001) { const dt = Math.min(remaining, 1 / 120); step(dt); remaining -= dt; }
    },
    togglePause() { if (state.phase !== "complete") state.paused = !state.paused; },
  };
}
