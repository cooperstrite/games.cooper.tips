import { createComputerOpponent, opponentLevel } from "./arcade/opponents.js";

export const TUG_ARENAS = Object.freeze({
  meadow: { name: "Meadow Cup", subtitle: "A sunny start", period: 1.5, rest: 30, backdrop: "park", note: "Moving targets and an accelerating beat. A friendly park with a competitive streak." },
  beach: { name: "Sunset Sands", subtitle: "Take a breather", period: 1.8, rest: 38, backdrop: "beach", note: "A slower opening beat and extra stamina recovered when you rest." },
  moon: { name: "Firefly Grove", subtitle: "Pick up the pace", period: 1.22, rest: 30, backdrop: "park", note: "A quick beat beneath the fireflies. Watch the target move after every pull." },
});
export const TUG_MATCH_RULES = Object.freeze({ target: 32, beats: 24, maxRounds: 3, perfectWindow: .035, goodWindow: .13, cost: 20, recovery: 8, gadgets: 2 });
export const TUG_GADGETS = Object.freeze({
  mud: { name: "Mud pie", short: "Mud", detail: "Weaken their pulls by 35% for 2 beats." },
  squeak: { name: "Squeaky toy", short: "Squeak", detail: "Take 22 stamina from the other team." },
  shield: { name: "Paw shield", short: "Shield", detail: "Clear mud and block attacks for 3 beats." },
});
const other = side => side === "cats" ? "dogs" : "cats";
const sideState = () => ({ energy: 100, streak: 0, queued: null, gadget: null, incoming: null, charges: 2, mud: 0, shield: 0,
  feedback: "Ready to pull", feedbackKind: "ready", perfect: 0, pulls: 0, bursts: 0 });
export function createTugMatch({ mode = "ai", team = "cats", difficulty = "medium", arena = "meadow" } = {}) {
  return { mode: mode === "local" ? "local" : "ai", team: team === "dogs" ? "dogs" : "cats", difficulty: opponentLevel(difficulty).id,
    arena: Object.hasOwn(TUG_ARENAS, arena) ? arena : "meadow", phase: "ready", paused: false, round: 1,
    countdown: 3, beat: 0, beatTime: 0, position: 0, roundWinner: null, winner: null, finishReason: "",
    photoTime: 0, photoDelay: 0, photoGo: false, photoPlan: undefined,
    scores: { cats: 0, dogs: 0 }, sides: { cats: sideState(), dogs: sideState() }, botPlan: undefined, lastBeat: null,
    totals: { cats: { perfect: 0, pulls: 0, bursts: 0 }, dogs: { perfect: 0, pulls: 0, bursts: 0 } } };
}
export function startTugMatch(s) { if (s.phase !== "ready") return false; s.phase = "countdown"; return true; }
export function nextTugRound(s) {
  if (s.phase !== "roundEnd") return false;
  s.round++; s.phase = "countdown"; s.countdown = 3; s.beat = 0; s.beatTime = 0; s.position = 0;
  s.roundWinner = null; s.finishReason = ""; s.botPlan = undefined; s.lastBeat = null;
  s.photoTime = 0; s.photoGo = false; s.photoPlan = undefined; s.sides = { cats: sideState(), dogs: sideState() }; return true;
}
// Shared targets are visible from the start of each beat and never follow input.
export function tugTarget(s) { return [.5, .65, .39, .57, .32, .61, .44, .69][(s.beat + (s.round - 1) * 3) % 8]; }
export function tugPeriod(s, beat = s.beat) { return TUG_ARENAS[s.arena].period * (1 - Math.min(beat, 23) / 23 * .30); }
export function tugQuality(phase, target = .5) {
  const distance = Math.abs(phase - target);
  return distance <= TUG_MATCH_RULES.perfectWindow + 1e-9 ? "perfect" : distance <= TUG_MATCH_RULES.goodWindow + 1e-9 ? "good" : "early";
}
export function queueTugGadget(s, side, gadget) {
  if (s.phase !== "playing" || s.paused || !Object.hasOwn(s.sides, side) || !Object.hasOwn(TUG_GADGETS, gadget)) return false;
  const pet = s.sides[side];
  if (!pet.charges || pet.gadget || pet.incoming) return false;
  pet.gadget = gadget; pet.charges--; return true;
}
export function queueTugPull(s, side) {
  if (s.paused || !Object.hasOwn(s.sides, side)) return { type: "ignored" };
  if (s.phase === "showdown") {
    const early = !s.photoGo;
    finishRound(s, early ? other(side) : side, early ? "False start in the final pull" : "First to pull after GO");
    return { type: "finish", winner: s.roundWinner, match: s.phase === "matchEnd" };
  }
  if (s.phase !== "playing") return { type: "ignored" };
  const pet = s.sides[side]; if (pet.queued) return { type: "duplicate" };
  const distance = Math.abs(s.beatTime / tugPeriod(s) - tugTarget(s));
  const quality = tugQuality(s.beatTime / tugPeriod(s), tugTarget(s)), tired = pet.energy < TUG_MATCH_RULES.cost;
  const burst = quality === "perfect" && !tired && pet.streak >= 3;
  // Even two gold hits differ: closer timing wins ground, without input-order bias.
  const precision = quality === "perfect" ? 6 - distance / TUG_MATCH_RULES.perfectWindow * 1.5 : quality === "good" ? 4.4 - (distance - .035) / .095 * 2 : .6;
  const power = precision * (tired ? .3 : 1) * (burst ? 2 : 1) * (pet.mud ? .65 : 1);
  pet.queued = { quality, power, tired, burst, accuracy: Math.max(0, Math.round((1 - distance / .13) * 100)) };
  pet.feedback = tired ? "Out of breath" : burst ? "SUPER PULL!" : quality === "perfect" ? `Perfect / ${pet.queued.accuracy}%` : quality === "good" ? "Good pull" : "Off beat";
  pet.feedbackKind = tired ? "tired" : burst ? "burst" : quality;
  return { type: "pull", side, ...pet.queued };
}
function finishRound(s, winner, reason) {
  s.roundWinner = winner; s.finishReason = reason;
  if (winner) s.scores[winner]++;
  s.winner = s.scores.cats >= 2 ? "cats" : s.scores.dogs >= 2 ? "dogs" : null;
  if (!s.winner && s.round >= TUG_MATCH_RULES.maxRounds && s.scores.cats !== s.scores.dogs) s.winner = s.scores.cats > s.scores.dogs ? "cats" : "dogs";
  s.phase = s.winner || s.round >= TUG_MATCH_RULES.maxRounds ? "matchEnd" : "roundEnd";
}
function resolveBeat(s) {
  const powers = { cats: 0, dogs: 0 }, pulls = {}, effects = [];
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
      const recovered = Math.min(100 - pet.energy, TUG_ARENAS[s.arena].rest); pet.energy += recovered;
      pet.feedback = recovered ? `Rested +${recovered}` : "Resting / full stamina"; pet.feedbackKind = "rest";
    }
    pet.queued = null; pet.mud = Math.max(0, pet.mud - 1); pet.shield = Math.max(0, pet.shield - 1);
  }
  // Shields resolve first. Attacks wait a FULL visible warning beat before landing.
  for (const side of ["cats", "dogs"]) if (s.sides[side].gadget === "shield") {
    s.sides[side].shield = 3; s.sides[side].mud = 0; effects.push({ side, kind: "shield" });
  }
  for (const side of ["cats", "dogs"]) {
    const pet = s.sides[side], target = s.sides[other(side)], attack = pet.incoming;
    if (attack) {
      if (target.shield) effects.push({ side: other(side), kind: "blocked" });
      else { if (attack === "mud") target.mud = 2; else target.energy = Math.max(0, target.energy - 22); effects.push({ side: other(side), kind: attack }); }
    }
  }
  for (const side of ["cats", "dogs"]) { const pet = s.sides[side]; pet.incoming = pet.gadget && pet.gadget !== "shield" ? pet.gadget : null; pet.gadget = null; }
  s.position = Math.max(-32, Math.min(32, s.position + powers.dogs - powers.cats));
  if (Math.abs(s.position) < 1e-8) s.position = 0;
  s.lastBeat = { powers, pulls, effects, position: s.position }; s.beat++; s.beatTime = 0; s.botPlan = undefined;
  if (Math.abs(s.position) >= 32 || s.beat >= TUG_MATCH_RULES.beats && s.position !== 0) finishRound(s, s.position < 0 ? "cats" : "dogs", Math.abs(s.position) >= 32 ? "Ribbon reached the flag" : "Ahead at the time limit");
  else if (s.beat >= TUG_MATCH_RULES.beats) { s.phase = "showdown"; s.photoTime = 0; s.photoDelay = 1.5 + Math.random() * 1.6; s.photoGo = false; s.photoPlan = undefined; }
  return s.lastBeat;
}
export function createTugComputer({ difficulty = "medium", random = Math.random } = {}) {
  const computer = createComputerOpponent({ difficulty, random });
  const unit = () => Math.max(0, Math.min(.99999, Number(random()) || 0));
  return {
    photo(s) { return computer.attempt() ? s.photoDelay + ({ easy: .65, medium: .48, hard: .35, expert: .26 }[computer.level.id]) + unit() * .2 : null; },
    plan(s) {
      const side = other(s.team), pet = s.sides[side], energy = pet.energy;
      let choice = computer.choose(["perfect", "good", "early", "rest"], action => action === "rest" ? (energy < 28 ? 5 : energy < 48 ? 2 : 0) : energy < 20 ? -1 : ({ perfect: 4, good: 2, early: 1 }[action]));
      if (choice === "perfect" && !computer.attempt()) choice = "good";
      const offset = choice === "perfect" ? (unit() - .5) * .06 : choice === "good" ? .05 + unit() * .07 : .16 + unit() * .12;
      const phase = Math.max(.02, Math.min(.98, tugTarget(s) + (choice === "perfect" ? offset : (unit() < .5 ? -1 : 1) * offset)));
      // Public warning/stamina only; never inspect the human's queued pull or gadget.
      let gadget = null;
      if (pet.charges && !pet.incoming && s.beat > 3) gadget = computer.choose([null, "mud", "squeak", "shield"], action => {
        if (action === "shield") return s.sides[other(side)].incoming || pet.mud ? 6 : -2;
        if (action === null) return s.beat < 10 ? 3 : 0;
        return action === "squeak" ? (s.sides[other(side)].energy < 50 ? 4 : 1) : 2;
      });
      return { side, at: choice === "rest" ? null : phase * tugPeriod(s), gadget };
    },
  };
}
export function tickTugMatch(s, dt, computer = null) {
  const events = [], active = () => ["countdown", "playing", "showdown"].includes(s.phase);
  if (s.paused || !Number.isFinite(dt) || dt <= 0 || !active()) return events;
  let remaining = Math.min(dt, 120);
  while (remaining > 1e-8 && active()) {
    if (s.phase === "countdown") {
      const step = Math.min(remaining, s.countdown); s.countdown -= step; remaining -= step;
      if (s.countdown < 1e-8) { s.phase = "playing"; events.push({ type: "start" }); } continue;
    }
    if (s.phase === "showdown") {
      if (s.photoPlan === undefined) s.photoPlan = s.mode === "ai" && computer ? computer.photo(s) : null;
      const end = s.photoDelay + 3, next = !s.photoGo ? s.photoDelay : s.photoPlan ?? end;
      const step = Math.min(remaining, Math.max(0, next - s.photoTime)); s.photoTime += step; remaining -= step;
      if (!s.photoGo && s.photoTime >= s.photoDelay - 1e-8) { s.photoGo = true; events.push({ type: "go" }); }
      if (s.photoPlan !== null && s.photoTime >= s.photoPlan - 1e-8) events.push(queueTugPull(s, other(s.team)));
      else if (s.photoTime >= end - 1e-8) { finishRound(s, null, "Neither team pulled after GO"); events.push({ type: "finish", winner: s.winner, match: s.phase === "matchEnd" }); }
      continue;
    }
    if (s.botPlan === undefined) {
      s.botPlan = s.mode === "ai" && computer ? computer.plan(s) : null;
      if (s.botPlan?.gadget && queueTugGadget(s, s.botPlan.side, s.botPlan.gadget)) events.push({ type: "gadget", side: s.botPlan.side, gadget: s.botPlan.gadget });
    }
    const period = tugPeriod(s), plan = s.botPlan;
    const step = Math.min(remaining, period - s.beatTime, plan?.at != null ? Math.max(0, plan.at - s.beatTime) : Infinity);
    s.beatTime += step; remaining -= step;
    if (plan?.at != null && s.beatTime >= plan.at - 1e-8) { events.push(queueTugPull(s, plan.side)); s.botPlan = null; }
    if (s.beatTime >= period - 1e-8) {
      const outcome = resolveBeat(s); events.push({ type: "beat", ...outcome });
      if (s.phase === "showdown") events.push({ type: "showdown" });
      if (["roundEnd", "matchEnd"].includes(s.phase)) events.push({ type: "finish", winner: s.roundWinner, match: s.phase === "matchEnd" });
    }
  }
  return events;
}
export function tugSecondsLeft(s) {
  if (s.phase === "showdown") return Math.max(0, s.photoDelay + 3 - s.photoTime);
  let seconds = -s.beatTime;
  for (let beat = s.beat; beat < TUG_MATCH_RULES.beats; beat++) seconds += tugPeriod(s, beat);
  return Math.max(0, seconds);
}
