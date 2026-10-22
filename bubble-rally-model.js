import { opponentLevel } from "./arcade/opponents.js";

export const RACER_COLORS = ["#62e8ff", "#ff819c", "#ffcb66", "#b8a0ff"];
export const MAX_ENERGY = 6;
export const RALLY_COURSES = Object.freeze([
  { id: "lagoon", name: "Crystal Lagoon", note: "Gentle currents. More energy, fewer storms.", finish: 31, checkpoints: [10, 20],
    tiles: { 3: "charge", 5: "boost", 9: "charge", 13: "storm", 15: "boost", 18: "charge", 24: "boost", 26: "charge", 28: "storm" } },
  { id: "prism", name: "Prism Circuit", note: "A tactical balance of boosts, energy and storms.", finish: 31, checkpoints: [10, 20],
    tiles: { 3: "charge", 5: "boost", 7: "storm", 9: "charge", 13: "storm", 14: "boost", 17: "charge", 22: "storm", 24: "boost", 26: "charge", 28: "storm" } },
  { id: "tempest", name: "Tempest Run", note: "Storms send you back 3. Shields really matter.", finish: 31, checkpoints: [10, 20],
    tiles: { 3: "charge", 5: "storm", 7: "boost", 9: "storm", 12: "charge", 14: "storm", 16: "boost", 18: "storm", 22: "storm", 24: "charge", 26: "boost", 28: "storm", 29: "storm" } },
]);
export const RALLY_ACTIONS = Object.freeze([
  { id: "cruise", name: "Cruise", cost: 0, gain: 1, delta: 0, description: "Move your roll. Recover 1 energy." },
  { id: "boost", name: "Boost", cost: 2, gain: 0, delta: 2, description: "Spend 2 energy to move 2 extra spaces." },
  { id: "brake", name: "Brake", cost: 0, gain: 2, delta: -2, description: "Move 2 fewer spaces (at least 1). Recover 2 energy." },
  { id: "shield", name: "Shield", cost: 2, gain: 0, delta: 0, description: "Move your roll. Block one storm or incoming pop." },
]);

export function rallyCourse(id) { return RALLY_COURSES.find(course => course.id === id) || RALLY_COURSES[1]; }
export function tileAt(course, position) {
  if (position === 0) return "start";
  if (position === course.finish) return "finish";
  if (course.checkpoints.includes(position)) return "checkpoint";
  return course.tiles[position] || "normal";
}

export function createRally({ players, course = "prism", firstPlayer = 0 } = {}) {
  if (!Array.isArray(players) || players.length < 2 || players.length > 4) throw new Error("Choose 2 to 4 racers.");
  const roster = players.map((player, index) => ({
    id: index, name: String(player.name || `Racer ${index + 1}`).trim().slice(0, 20) || `Racer ${index + 1}`,
    kind: player.kind === "computer" ? "computer" : "human", difficulty: opponentLevel(player.difficulty).id,
    color: RACER_COLORS[index], position: 0, checkpoint: 0, energy: 2, shield: false, pops: 0,
  }));
  return { course: rallyCourse(course).id, players: roster, active: ((firstPlayer % roster.length) + roster.length) % roster.length,
    phase: "roll", roll: null, turn: 1, winner: null, last: null };
}

export function rollRally(state, random = Math.random) {
  if (state.phase !== "roll") return state;
  // This one uniform die is shared by every seat, independent of CPU difficulty.
  const roll = 1 + Math.floor(Math.max(0, Math.min(0.999999999, Number(random()) || 0)) * 6);
  return { ...state, roll, phase: "choose", last: null };
}

export function rallyActions(state) {
  if (state.phase !== "choose") return [];
  const player = state.players[state.active];
  return RALLY_ACTIONS.filter(action => player.energy >= action.cost && (action.id !== "shield" || !player.shield));
}

// Both previews and committed moves use this exact resolver. Never roll in it.
export function resolveRallyAction(state, actionId) {
  const action = rallyActions(state).find(entry => entry.id === actionId);
  if (!action) return state;
  const course = rallyCourse(state.course);
  const players = state.players.map(player => ({ ...player }));
  const player = players[state.active];
  const from = player.position;
  const steps = Math.max(1, state.roll + action.delta);
  const landing = Math.min(course.finish, from + steps);
  const events = [];
  const energyBefore = player.energy;
  player.energy = Math.min(MAX_ENERGY, player.energy - action.cost + action.gain);
  const energyAfterAction = player.energy;
  if (action.id === "shield") player.shield = true;
  player.position = landing;
  const tile = tileAt(course, landing);
  // Landing triggers one tile effect. It never cascades into an invisible chain.
  if (tile === "boost") { player.position = Math.min(course.finish, landing + 2); events.push({ type: "boost" }); }
  if (tile === "charge") { player.energy = Math.min(MAX_ENERGY, player.energy + 2); events.push({ type: "charge" }); }
  if (tile === "storm") {
    if (player.shield) { player.shield = false; events.push({ type: "blocked-storm" }); }
    else { player.position = Math.max(player.checkpoint, landing - (course.id === "tempest" ? 3 : 2)); events.push({ type: "storm" }); }
  }
  for (const checkpoint of course.checkpoints) {
    if (Math.max(landing, player.position) >= checkpoint && checkpoint > player.checkpoint) {
      player.checkpoint = checkpoint; events.push({ type: "checkpoint", position: checkpoint });
    }
  }
  player.position = Math.max(player.checkpoint, player.position);
  const safe = ["start", "checkpoint", "finish"].includes(tileAt(course, player.position));
  if (!safe) {
    for (const rival of players) {
      if (rival.id === player.id || rival.position !== player.position) continue;
      if (rival.shield) { rival.shield = false; events.push({ type: "blocked-pop", player: rival.id }); }
      else {
        events.push({ type: "pop", player: rival.id, from: rival.position, to: rival.checkpoint });
        rival.position = rival.checkpoint; player.pops += 1;
      }
    }
  }
  const winner = player.position === course.finish ? player.id : null;
  return { ...state, players, phase: winner === null ? "resolved" : "finished", winner,
    last: { player: player.id, action: action.id, roll: state.roll, from, landing, to: player.position,
      energyBefore, energyAfterAction, events } };
}

export function advanceRally(state) {
  if (state.phase !== "resolved") return state;
  return { ...state, active: (state.active + 1) % state.players.length, turn: state.turn + 1, roll: null, phase: "roll" };
}

// The race ends at its first finisher. Remaining places use final positions,
// with competition ranks for ties (for example: 1st, 2nd, 2nd, 4th).
export function rallyStandings(state) {
  if (state.winner === null) return [];
  const racers = [...state.players].sort((a, b) => {
    if (a.id === state.winner) return -1;
    if (b.id === state.winner) return 1;
    return b.position - a.position || a.id - b.id;
  });
  let place = 1;
  const standings = racers.map((racer, index) => {
    if (index && (racers[index - 1].id === state.winner || racer.position !== racers[index - 1].position)) place = index + 1;
    return { ...racer, place };
  });
  return standings.map(racer => ({ ...racer, tied: standings.filter(other => other.place === racer.place).length > 1 }));
}

export function scoreRallyAction(state, action) {
  const next = resolveRallyAction(state, action.id);
  const before = state.players[state.active], after = next.players[state.active];
  if (next.winner === after.id) return 10000;
  const setback = next.last.events.filter(event => event.type === "pop").reduce((total, event) => total + event.from - event.to, 0);
  // Uses only visible positions/resources. No future dice or human intent.
  const nearRivals = state.players.filter(player => player.id !== after.id && player.position < after.position && after.position - player.position <= 8).length;
  return (after.position - before.position) * 4 + after.energy * 1.25 + (after.shield ? 2 + nearRivals * 1.7 : 0)
    + (after.checkpoint - before.checkpoint) * 0.25 + setback * 0.8;
}
