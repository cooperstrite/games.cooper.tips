// Orbit Dash rules use seconds and unwrapped angles. A gate is always ahead of
// the ship, including across the 0/2PI seam. Rendering never decides a hit.
export const TAU = Math.PI * 2;
export const DASH_PEAK = .28;
export const DASH_DURATION = .68;
export const ORBIT_TARGET = 18;
export const ORBIT_LEVELS = Object.freeze({
  easy: { name: 'Easy', speed: 1.08, width: .31, hull: 3, drift: 0, description: 'Wide gates, a gentle orbit, and three shields.' },
  medium: { name: 'Medium', speed: 1.38, width: .24, hull: 3, drift: 0, description: 'A quicker orbit and smaller timing windows.' },
  hard: { name: 'Hard', speed: 1.68, width: .19, hull: 3, drift: .08, description: 'Fast approaches. Gates begin to drift sideways.' },
  expert: { name: 'Expert', speed: 1.95, width: .15, hull: 2, drift: .12, description: 'Two shields, narrow openings, and drifting gates.' },
});
export const ORBIT_SECTORS = Object.freeze([
  { name: 'The blue frontier', planet: 'PELAGIC / 01', color: '#73e9ec', ocean: '#136783', land: '#5fafa0', glow: '#37cbe3' },
  { name: 'The amber passage', planet: 'SOLSTICE / 02', color: '#ffc978', ocean: '#936341', land: '#d09a6b', glow: '#e9a454' },
  { name: 'Beyond the nebula', planet: 'VESPER / 03', color: '#b8a3ff', ocean: '#48488b', land: '#a185be', glow: '#9f7deb' },
]);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const ease = t => t * t * (3 - 2 * t);
export function createOrbit({ difficulty = 'medium', mode = 'expedition', random = Math.random } = {}) {
  difficulty = Object.hasOwn(ORBIT_LEVELS, difficulty) ? difficulty : 'medium';
  return { difficulty, mode: mode === 'endless' ? 'endless' : 'expedition', random,
    phase: 'idle', paused: false, time: 0, angle: -Math.PI / 2, dash: null, gate: null,
    hull: ORBIT_LEVELS[difficulty].hull, gates: 0, perfect: 0, streak: 0, bestStreak: 0,
    score: 0, attempts: 0, sector: 0, recovery: 0, events: [], result: '', notice: 'Your next adventure is one good orbit away.' };
}
export function orbitSpeed(s) { return ORBIT_LEVELS[s.difficulty].speed * (1 + Math.min(.34, s.gates * .012)); }
export function orbitWidth(s) { return ORBIT_LEVELS[s.difficulty].width * (1 - Math.min(.16, s.gates * .006)); }
export function gateAngle(s, time = s.time) {
  return s.gate ? s.gate.angle + Math.sin(time * .9 + s.gate.seed) * ORBIT_LEVELS[s.difficulty].drift : 0;
}
function spawnGate(s) {
  s.gate = { angle: s.angle + 1.95 + clamp(Number(s.random()) || 0, 0, 1) * 1.4, seed: s.attempts * 1.7 };
}
export function startOrbit(s) {
  if (s.phase !== 'idle') return false;
  s.phase = 'playing'; s.notice = 'Follow the ship. Tap once when the launch arc turns gold.';
  spawnGate(s); return true;
}
export function orbitCue(s) {
  if (s.phase !== 'playing' || s.paused || !s.gate || s.dash) return { ready: false, error: 0, seconds: 0 };
  const error = gateAngle(s, s.time + DASH_PEAK) - (s.angle + orbitSpeed(s) * DASH_PEAK);
  return { ready: Math.abs(error) <= orbitWidth(s), error, seconds: Math.max(0, (error - orbitWidth(s)) / orbitSpeed(s)), perfect: Math.abs(error) <= orbitWidth(s) * .3 };
}
export function dashOrbit(s) {
  if (s.phase !== 'playing' || s.paused || s.dash || !s.gate || s.recovery > 0) return false;
  s.dash = { elapsed: 0, checked: false }; s.attempts++;
  s.events.push({ type: 'dash', angle: s.angle }); return true;
}
export function orbitRadius(s) {
  if (!s.dash) return .72;
  const t = s.dash.elapsed;
  return .72 + .28 * (t <= DASH_PEAK ? ease(t / DASH_PEAK) : 1 - ease(Math.min(1, (t - DASH_PEAK) / (DASH_DURATION - DASH_PEAK))));
}
function miss(s, reason) {
  s.hull--; s.streak = 0; s.gate = null; s.recovery = 1.1;
  s.notice = reason; s.events.push({ type: 'miss', angle: s.angle, fatal: s.hull <= 0 });
  if (s.hull <= 0) { s.phase = 'lost'; s.result = reason; }
}
function pass(s, error) {
  const perfect = Math.abs(error) <= orbitWidth(s) * .3;
  s.gates++; s.streak++; if (perfect) s.perfect++;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  const multiplier = Math.min(5, 1 + Math.floor((s.streak - 1) / 3));
  const points = (perfect ? 150 : 100) * multiplier;
  s.score += points; s.gate = null; s.recovery = .62;
  s.notice = `${perfect ? 'Perfect center!' : 'Gate cleared!'} +${points}${multiplier > 1 ? ` / x${multiplier} streak` : ''}`;
  s.events.push({ type: 'pass', angle: s.angle, perfect, points });
  if (s.mode === 'expedition' && s.gates >= ORBIT_TARGET) {
    s.phase = 'won'; s.notice = 'All three sectors cleared. Welcome home, pilot.';
    s.events.push({ type: 'win', angle: s.angle });
  } else if (s.gates % 6 === 0) {
    s.sector++; s.hull = Math.min(ORBIT_LEVELS[s.difficulty].hull, s.hull + 1);
    s.notice = 'Sector cleared. One shield restored. Next destination ahead.';
    s.events.push({ type: 'sector', angle: s.angle });
  }
}
export function stepOrbit(s, seconds) {
  if (s.phase !== 'playing' || s.paused || !Number.isFinite(seconds) || seconds <= 0) return;
  // Small substeps make the dash peak and gate expiry independent of frame rate.
  let remaining = Math.min(.1, seconds);
  while (remaining > .000001 && s.phase === 'playing') {
    let dt = Math.min(1 / 120, remaining);
    if (s.dash && !s.dash.checked) dt = Math.min(dt, Math.max(.000001, DASH_PEAK - s.dash.elapsed));
    s.time += dt; s.angle += orbitSpeed(s) * dt; remaining -= dt;
    if (s.dash) {
      s.dash.elapsed += dt;
      if (!s.dash.checked && s.dash.elapsed >= DASH_PEAK - .000001) {
        s.dash.checked = true;
        const error = gateAngle(s) - s.angle;
        if (s.gate && Math.abs(error) <= orbitWidth(s)) pass(s, error);
        else miss(s, error > 0 ? 'Too early. Wait for the gold launch arc before tapping.' : 'Too late. Tap as the ship enters the gold launch arc.');
      }
      if (s.dash.elapsed >= DASH_DURATION) s.dash = null;
    } else if (s.gate && s.angle > gateAngle(s) + orbitWidth(s) + .15) {
      miss(s, 'Gate missed. Tap once when DASH NOW appears.');
    }
    if (!s.gate) {
      s.recovery = Math.max(0, s.recovery - dt);
      if (!s.dash && !s.recovery && s.phase === 'playing') spawnGate(s);
    }
  }
}
export function pauseOrbit(s, paused = !s.paused) {
  if (s.phase !== 'playing') return false;
  s.paused = Boolean(paused); return true;
}
export function readOrbitSave(raw) {
  let data = {}; try { data = JSON.parse(raw) || {}; } catch { /* New pilot. */ }
  const best = {};
  for (const d of Object.keys(ORBIT_LEVELS)) for (const m of ['expedition', 'endless']) {
    const n = data.best?.[`${d}:${m}`]; best[`${d}:${m}`] = Number.isFinite(n) ? clamp(Math.floor(n), 0, 999999999) : 0;
  }
  return { difficulty: Object.hasOwn(ORBIT_LEVELS, data.difficulty) ? data.difficulty : 'medium', mode: data.mode === 'endless' ? 'endless' : 'expedition', sound: data.sound !== false, best };
}
