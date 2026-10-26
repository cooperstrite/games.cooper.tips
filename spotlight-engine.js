import { SPOTLIGHT_LEVELS, spotlightRewardTotal } from "./spotlight-config.js";

export function createSpotlightRound({ scene = "glasshouse", difficulty = "easy", mode = "challenge", targets = [], custom = false } = {}) {
  const level = Object.hasOwn(SPOTLIGHT_LEVELS, difficulty) ? SPOTLIGHT_LEVELS[difficulty] : SPOTLIGHT_LEVELS.easy;
  return { scene, difficulty: Object.hasOwn(SPOTLIGHT_LEVELS, difficulty) ? difficulty : "easy", mode: custom || mode === "relaxed" ? "relaxed" : "challenge", custom,
    targets: targets.map(t => ({ ...t })), found: new Set(), hinted: new Set(), phase: "ready", paused: false,
    remaining: level.seconds, elapsed: 0, mistakes: 0, hints: 2, lastMiss: -1, revealed: false };
}
export function startSpotlight(s) { if (s.phase !== "ready" || !s.targets.length) return false; s.phase = "playing"; return true; }
export function tickSpotlight(s, dt) {
  if (s.phase !== "playing" || s.paused || !Number.isFinite(dt) || dt <= 0) return false;
  s.elapsed += dt;
  if (s.mode === "challenge") { s.remaining = Math.max(0, s.remaining - dt); if (s.remaining === 0) s.phase = "failed"; }
  return true;
}
const includes = (t, x, y, tolerance) => x >= t.x - tolerance && x <= t.x + t.w + tolerance && y >= t.y - tolerance && y <= t.y + t.h + tolerance;
function finish(s) { if (s.found.size === s.targets.length) s.phase = "complete"; }
export function tapSpotlight(s, x, y, tolerance = .6) {
  if (s.phase !== "playing" || s.paused || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) return { type: "ignored" };
  const padding = Math.max(0, Math.min(1.5, Number.isFinite(tolerance) ? tolerance : .6));
  const target = s.targets.filter(t => includes(t, x, y, padding)).sort((a, b) => Math.hypot(x - a.x - a.w / 2, y - a.y - a.h / 2) - Math.hypot(x - b.x - b.w / 2, y - b.y - b.h / 2))[0];
  if (target && s.found.has(target.id)) return { type: "already" };
  if (target) { s.found.add(target.id); finish(s); return { type: "found", target }; }
  if (s.elapsed - s.lastMiss < .55) return { type: "ignored" };
  s.lastMiss = s.elapsed; s.mistakes++;
  if (s.mode === "challenge") { s.remaining = Math.max(0, s.remaining - 5); if (s.remaining === 0) s.phase = "failed"; }
  return { type: "miss", penalty: s.mode === "challenge" ? 5 : 0 };
}
export function hintSpotlight(s) {
  if (s.phase !== "playing" || s.paused || s.hints <= 0) return null;
  const target = s.targets.find(t => !s.found.has(t.id));
  if (!target) return null;
  s.hints--; s.hinted.add(target.id); s.found.add(target.id); finish(s); return target;
}
export function spotlightProgress(s) {
  return { scene: s.custom ? "custom" : s.scene, difficulty: s.difficulty, mode: s.mode, found: s.found.size, hinted: s.hinted.size, complete: s.phase === "complete" };
}
export const spotlightRoundCoins = s => spotlightRewardTotal(spotlightProgress(s));
