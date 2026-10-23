// Pure harvest rules. The UI owns focus, drawing, audio, and the paused clock.
import { validSavedCarving, carvingStats } from "./haunted-harvest-carving.js";
export const NIGHTS = Object.freeze([
  { name: "Moonlight Grove", subtitle: "The orchard wakes", candy: 9, lanterns: 1, seconds: 75, interval: 2.8, lifetime: 10, hue: 252, tip: "Gather sweet pumpkins and candle wisps. Your first pumpkin and wax are already on the bench." },
  { name: "Witchwood", subtitle: "Something stirs in the trees", candy: 12, lanterns: 1, seconds: 70, interval: 2.4, lifetime: 9, hue: 173, tip: "More ghosts wander here. A carved lantern blocks one ghost; the bell calms two fright for three candy." },
  { name: "Hollow Manor", subtitle: "The midnight gathering", candy: 15, lanterns: 2, seconds: 65, interval: 2, lifetime: 8, hue: 282, tip: "Light two lanterns and finish the candy offering. Cursed pumpkins are valuable, but wrong answers cost two fright." },
]);
export const MODES = Object.freeze({
  cozy: { name: "Cozy", time: 1.3, lifetime: 1.3, fear: 8 },
  eerie: { name: "Eerie", time: 1, lifetime: 1, fear: 6 },
  wicked: { name: "Wicked", time: .85, lifetime: .8, fear: 5 },
});
export const TARGETS = Object.freeze({
  sweet: { name: "Sweet pumpkin", reward: 3, hint: "Solve a riddle: +3 candy and 1 carving pumpkin. Wrong: +1 fright." },
  cursed: { name: "Cursed pumpkin", reward: 5, hint: "Solve a harder puzzle: +5 candy and 1 pumpkin. Wrong: +2 fright." },
  wisp: { name: "Candle wisp", reward: 0, hint: "Collect 1 wax to light a carved lantern. No riddle." },
  ghost: { name: "Wandering ghost", reward: 0, hint: "Avoid it! Touching costs 2 candy and adds 2 fright. A lantern shield banishes it for +2 candy." },
});
export function createHarvest(mode = "eerie") {
  mode = MODES[mode] ? mode : "eerie";
  return { mode, phase: "ready", night: 0, time: NIGHTS[0].seconds * MODES[mode].time,
    candy: 0, totalCandy: 0, score: 0, pumpkins: 1, wax: 1, fear: 0, shields: 0,
    lanterns: 0, totalLanterns: 0, streak: 0, bellCooldown: 0, targets: [], spawnClock: 0,
    spawnIndex: 0, nextId: 1, pending: null, message: "The gate is open. Choose a difficulty and begin your harvest.", reason: "" };
}
export function beginHarvest(s) { if (s.phase === "ready") { s.phase = "playing"; s.spawnClock = .1; s.message = NIGHTS[s.night].tip; } }
export function nextNight(s) {
  if (s.phase !== "cleared" || s.night >= NIGHTS.length - 1) return false;
  s.night++; s.phase = "playing"; s.candy = 0; s.lanterns = 0; s.fear = Math.max(0, s.fear - 2);
  s.time = NIGHTS[s.night].seconds * MODES[s.mode].time; s.spawnIndex = 0; s.spawnClock = .1;
  s.targets = []; s.pending = null; s.message = NIGHTS[s.night].tip; return true;
}
function checkHarvest(s) {
  if (s.fear >= MODES[s.mode].fear) {
    s.fear = MODES[s.mode].fear;
    s.phase = "lost"; s.reason = "The grove grew too frightening. Use lantern shields, avoid ghosts, and ring the bell before fright fills up.";
  } else if (s.candy >= NIGHTS[s.night].candy && s.lanterns >= NIGHTS[s.night].lanterns) {
    s.phase = s.night === NIGHTS.length - 1 ? "won" : "cleared";
    s.score += Math.ceil(s.time) + 25;
    s.reason = s.phase === "won" ? "The lanterns are lit. The midnight gathering is safe, and the harvest is yours." : "Candy offered, lanterns lit. The next path is open.";
  }
  if (["lost", "won", "cleared"].includes(s.phase)) { s.targets = []; s.pending = null; }
}
export function advanceHarvest(s, dt) {
  if (s.phase !== "playing" || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, .1);
  s.time = Math.max(0, s.time - dt); s.bellCooldown = Math.max(0, s.bellCooldown - dt);
  if (!s.time) { s.phase = "lost"; s.reason = "Midnight arrived before the offering was ready. Gather the required candy and light every lantern before the clock runs out."; s.targets = []; return; }
  for (const t of s.targets) t.remaining -= dt;
  s.targets = s.targets.filter(t => t.remaining > 0);
  s.spawnClock -= dt;
  if (s.spawnClock > 0) return;
  const occupied = new Set(s.targets.map(t => t.slot)), slots = [0, 4, 2, 3, 1, 5];
  const slot = slots.find(n => !occupied.has(n));
  if (slot === undefined) { s.spawnClock = .25; return; }
  // Regular wisps and sweet pumpkins guarantee the materials needed to win.
  const cycle = s.night ? ["sweet", "ghost", "cursed", "wisp", "ghost", "sweet", "wisp", "sweet"] : ["sweet", "ghost", "wisp", "sweet", "cursed", "wisp"];
  const kind = cycle[s.spawnIndex++ % cycle.length], life = NIGHTS[s.night].lifetime * MODES[s.mode].lifetime;
  s.targets.push({ id: s.nextId++, kind, slot, remaining: life, life });
  s.spawnClock = NIGHTS[s.night].interval;
}
function candy(s, amount) { s.candy += amount; s.totalCandy += amount; s.score += amount * 10; }
export function catchTarget(s, id) {
  if (s.phase !== "playing") return null;
  const index = s.targets.findIndex(t => t.id === id); if (index < 0) return null;
  const [t] = s.targets.splice(index, 1);
  if (t.kind === "wisp") { s.wax++; s.message = "A candle wisp left you one wax. Bring it to the carving bench."; return "wax"; }
  if (t.kind === "ghost") {
    if (s.shields) { s.shields--; candy(s, 2); s.message = "Your lantern banished the ghost. +2 candy; one shield used."; }
    else { s.candy = Math.max(0, s.candy - 2); s.fear += 2; s.streak = 0; s.message = "Boo! The ghost took 2 candy and added 2 fright. Avoid ghosts or carry a lantern shield."; }
    checkHarvest(s); return "ghost";
  }
  s.pending = t.kind; s.phase = "riddle"; return "riddle";
}
export function answerRiddle(s, correct, hinted = false) {
  if (s.phase !== "riddle" || !s.pending) return false;
  const kind = s.pending; s.pending = null; s.phase = "playing";
  if (correct) {
    s.streak++; const bonus = s.streak % 3 === 0 ? 2 : 0;
    const reward = TARGETS[kind].reward + bonus - (hinted ? 1 : 0);
    candy(s, reward); s.pumpkins++;
    s.message = `Riddle solved! +${reward} candy and 1 pumpkin.${bonus ? " Three in a row: +2 streak candy included." : ""}${hinted ? " Hint used: reward reduced by 1." : ""}`;
  } else { s.fear += kind === "cursed" ? 2 : 1; s.streak = 0; s.message = `The spell fizzled. +${kind === "cursed" ? 2 : 1} fright; the pumpkin escaped.`; }
  checkHarvest(s); return true;
}
export function canCarve(s) { return s.phase === "playing" && s.pumpkins > 0 && s.wax > 0; }
export function openCarving(s) { if (!canCarve(s)) return false; s.phase = "carving"; return true; }
export function cancelCarving(s) { if (s.phase === "carving") s.phase = "playing"; }
export function finishCarving(s, design) {
  if (s.phase !== "carving" || s.pumpkins < 1 || s.wax < 1) return false;
  const carving = validSavedCarving(design);
  if (!carving || !carvingStats(carving.cuts).ready) return false;
  s.pumpkins--; s.wax--; s.lanterns++; s.totalLanterns++; s.shields = Math.min(3, s.shields + 1);
  s.fear = Math.max(0, s.fear - 2); s.phase = "playing";
  candy(s, 3); s.score += 100;
  s.message = "Lantern lit! +3 candy, one ghost shield (up to 3), and 2 fright soothed.";
  checkHarvest(s); return true;
}
export function ringBell(s) {
  if (s.phase !== "playing" || s.candy < 3 || s.bellCooldown > 0) return false;
  s.candy -= 3; s.fear = Math.max(0, s.fear - 2); s.targets = s.targets.filter(t => t.kind !== "ghost");
  s.bellCooldown = 10; s.message = "The bell cleared nearby ghosts and soothed 2 fright. It cost 3 candy from this night's offering."; return true;
}
