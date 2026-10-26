import { createComputerOpponent, opponentLevel } from "./arcade/opponents.js";

export const TUG_ARENAS = Object.freeze({
  meadow: { name: "Meadow Cup", subtitle: "A sunny start", period: 1.5, rest: 30, backdrop: "park", note: "A steady beat, soft grass, and a little friendly rivalry." },
  beach: { name: "Sunset Sands", subtitle: "Take a breather", period: 1.8, rest: 38, backdrop: "beach", note: "A slower beat and extra stamina recovered on resting beats." },
  moon: { name: "Firefly Grove", subtitle: "Pick up the pace", period: 1.22, rest: 30, backdrop: "park", note: "A quicker beat beneath the fireflies. Keep your timing sharp." },
});
export const TUG_MATCH_RULES = Object.freeze({ target: 32, beats: 24, overtime: 4, perfectWindow: .075, goodWindow: .17, cost: 20, recovery: 8 });
const sideState = () => ({ energy: 100, streak: 0, queued: null, feedback: "Ready to pull", feedbackKind: "ready", perfect: 0, pulls: 0, bursts: 0 });
export function createTugMatch({ mode = "ai", team = "cats", difficulty = "medium", arena = "meadow" } = {}) {
  return { mode: mode === "local" ? "local" : "ai", team: team === "dogs" ? "dogs" : "cats", difficulty: opponentLevel(difficulty).id,
    arena: Object.hasOwn(TUG_ARENAS, arena) ? arena : "meadow", phase: "ready", paused: false, round: 1,
    countdown: 3, beat: 0, beatTime: 0, position: 0, overtime: false, roundWinner: null, winner: null,
    scores: { cats: 0, dogs: 0 }, sides: { cats: sideState(), dogs: sideState() }, botPlan: undefined, lastBeat: null,
    totals: { cats: { perfect: 0, pulls: 0, bursts: 0 }, dogs: { perfect: 0, pulls: 0, bursts: 0 } } };
}
export function startTugMatch(s) { if (s.phase !== "ready") return false; s.phase = "countdown"; return true; }
export function nextTugRound(s) {
  if (s.phase !== "roundEnd") return false;
  s.round++; s.phase = "countdown"; s.countdown = 3; s.beat = 0; s.beatTime = 0; s.position = 0;
  s.overtime = false; s.roundWinner = null; s.botPlan = undefined; s.lastBeat = null; s.sides = { cats: sideState(), dogs: sideState() }; return true;
}
export function tugQuality(phase) {
  const distance = Math.abs(phase - .5);
  return distance <= TUG_MATCH_RULES.perfectWindow + 1e-9 ? "perfect" : distance <= TUG_MATCH_RULES.goodWindow + 1e-9 ? "good" : "early";
}
export function queueTugPull(s, side) {
  if (s.phase !== "playing" || s.paused || !Object.hasOwn(s.sides, side)) return { type: "ignored" };
  const pet = s.sides[side]; if (pet.queued) return { type: "duplicate" };
  const quality = tugQuality(s.beatTime / TUG_ARENAS[s.arena].period);
  const tired = pet.energy < TUG_MATCH_RULES.cost;
  const burst = quality === "perfect" && !tired && pet.streak >= 3;
  const power = ({ perfect: 5, good: 3, early: .7 }[quality]) * (tired ? .3 : 1) * (burst ? 2 : 1);
  pet.queued = { quality, power, tired, burst };
  pet.feedback = tired ? "Out of breath" : burst ? "SUPER PULL!" : quality === "perfect" ? "Perfect!" : quality === "good" ? "Good pull" : "Off beat";
  pet.feedbackKind = tired ? "tired" : burst ? "burst" : quality;
  return { type: "pull", side, ...pet.queued };
}
function finishRound(s) {
  const winner = Math.abs(s.position) < .05 ? null : s.position < 0 ? "cats" : "dogs";
  s.roundWinner = winner;
  if (winner) s.scores[winner]++;
  s.winner = s.scores.cats >= 2 ? "cats" : s.scores.dogs >= 2 ? "dogs" : null;
  s.phase = s.winner ? "matchEnd" : "roundEnd";
}
function resolveBeat(s) {
  const powers = { cats: 0, dogs: 0 }, pulls = {};
  for (const side of ["cats", "dogs"]) {
    const pet = s.sides[side], action = pet.queued; pulls[side] = action;
    if (action) {
      powers[side] = action.power;
      pet.energy = Math.min(100, Math.max(0, pet.energy - TUG_MATCH_RULES.cost) + TUG_MATCH_RULES.recovery);
      pet.pulls++; s.totals[side].pulls++;
      if (action.quality === "perfect" && !action.tired) { pet.perfect++; s.totals[side].perfect++; pet.streak = action.burst ? 0 : Math.min(3, pet.streak + 1); }
      else pet.streak = 0;
      if (action.burst) { pet.bursts++; s.totals[side].bursts++; }
    } else {
      const recovered = Math.min(100 - pet.energy, TUG_ARENAS[s.arena].rest);
      pet.energy += recovered;
      pet.feedback = recovered ? `Rested +${recovered}` : "Resting / full stamina"; pet.feedbackKind = "rest";
    }
    pet.queued = null;
  }
  // Both teams resolve together: input order and frame rate cannot decide a tie.
  s.position = Math.max(-TUG_MATCH_RULES.target, Math.min(TUG_MATCH_RULES.target, s.position + powers.dogs - powers.cats));
  s.lastBeat = { powers, pulls, position: s.position }; s.beat++; s.beatTime = 0; s.botPlan = undefined;
  if (Math.abs(s.position) >= TUG_MATCH_RULES.target) finishRound(s);
  else if (s.beat >= TUG_MATCH_RULES.beats + (s.overtime ? TUG_MATCH_RULES.overtime : 0)) {
    if (!s.overtime && Math.abs(s.position) < .05) s.overtime = true;
    else finishRound(s);
  }
  return s.lastBeat;
}
export function createTugComputer({ difficulty = "medium", random = Math.random } = {}) {
  const computer = createComputerOpponent({ difficulty, random });
  const unit = () => Math.max(0, Math.min(.99999, Number(random()) || 0));
  return {
    plan(s) {
      const side = s.team === "cats" ? "dogs" : "cats", energy = s.sides[side].energy;
      let choice = computer.choose(["perfect", "good", "early", "rest"], action => action === "rest" ? (energy < 28 ? 5 : energy < 48 ? 2 : 0) : energy < 20 ? -1 : ({ perfect: 4, good: 2, early: 1 }[action]));
      if (choice === "rest") return null;
      if (choice === "perfect" && !computer.attempt()) choice = "good";
      const offset = choice === "perfect" ? (unit() - .5) * .1 : choice === "good" ? .1 + unit() * .055 : .26 + unit() * .15;
      const phase = choice === "perfect" ? .5 + offset : .5 + (unit() < .5 ? -1 : 1) * offset;
      return { side, at: phase * TUG_ARENAS[s.arena].period };
    },
  };
}
export function tickTugMatch(s, dt, computer = null) {
  const events = [];
  if (s.paused || !Number.isFinite(dt) || dt <= 0 || !["countdown", "playing"].includes(s.phase)) return events;
  let remaining = Math.min(dt, 120);
  while (remaining > 1e-8 && ["countdown", "playing"].includes(s.phase)) {
    if (s.phase === "countdown") {
      const step = Math.min(remaining, s.countdown); s.countdown -= step; remaining -= step;
      if (s.countdown < 1e-8) { s.phase = "playing"; events.push({ type: "start" }); }
      continue;
    }
    if (s.botPlan === undefined) s.botPlan = s.mode === "ai" && computer ? computer.plan(s) : null;
    const period = TUG_ARENAS[s.arena].period, plan = s.botPlan;
    const step = Math.min(remaining, period - s.beatTime, plan ? Math.max(0, plan.at - s.beatTime) : Infinity);
    s.beatTime += step; remaining -= step;
    if (plan && s.beatTime >= plan.at - 1e-8) { events.push(queueTugPull(s, plan.side)); s.botPlan = null; }
    if (s.beatTime >= period - 1e-8) {
      const outcome = resolveBeat(s); events.push({ type: "beat", ...outcome });
      if (["roundEnd", "matchEnd"].includes(s.phase)) events.push({ type: "finish", winner: s.roundWinner, match: s.phase === "matchEnd" });
    }
  }
  return events;
}
export function tugSecondsLeft(s) {
  const beats = TUG_MATCH_RULES.beats + (s.overtime ? TUG_MATCH_RULES.overtime : 0);
  return Math.max(0, (beats - s.beat) * TUG_ARENAS[s.arena].period - s.beatTime);
}
