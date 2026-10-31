import { OPPONENT_LEVELS } from "./arcade/opponents.js";

export const SPOT_PICTURES = Object.freeze([
  ["fox", "Fox"], ["owl", "Owl"], ["mushroom", "Mushroom"], ["leaf", "Maple leaf"], ["flower", "Flower"],
  ["butterfly", "Butterfly"], ["shell", "Seashell"], ["fish", "Fish"], ["whale", "Whale"], ["boat", "Sailboat"],
  ["rocket", "Rocket"], ["planet", "Ringed planet"], ["moon", "Crescent moon"], ["star", "Star"], ["compass", "Compass"],
  ["camera", "Camera"], ["key", "Key"], ["lantern", "Lantern"], ["crown", "Crown"], ["gem", "Gemstone"],
  ["cup", "Teacup"], ["strawberry", "Strawberry"], ["lemon", "Lemon"], ["umbrella", "Umbrella"], ["kite", "Kite"],
].map(([id, name], index) => Object.freeze({ id, name, index })));

export const SPOT_LEVELS = Object.freeze(OPPONENT_LEVELS.map((level, index) => Object.freeze({
  id: level.id, label: level.label, size: 5 + index, target: 7 + index,
  description: ["A gentler pace to learn the pictures.", "A balanced race of eyes and reflexes.", "More pictures. A sharper opponent.", "The busiest cards and quickest rival."][index],
})));
export const spotLevel = id => SPOT_LEVELS.find(level => level.id === id) || SPOT_LEVELS[1];
export const spotPicture = id => SPOT_PICTURES.find(picture => picture.id === id);

function shuffle(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const sample = Math.max(0, Math.min(.999999999, Number(random()) || 0));
    const j = Math.floor(sample * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Disjoint distractor pools guarantee exactly one shared picture, in shuffled positions.
export function makeSpotPair(size, random = Math.random, previous = null) {
  if (!Number.isInteger(size) || size < 2 || size * 2 - 1 > SPOT_PICTURES.length) throw new RangeError("Invalid picture count");
  const pool = shuffle(SPOT_PICTURES.map(picture => picture.id), random);
  if (pool[0] === previous) [pool[0], pool[1]] = [pool[1], pool[0]];
  const shared = pool[0];
  return { shared, cards: [
    shuffle([shared, ...pool.slice(1, size)], random),
    shuffle([shared, ...pool.slice(size, size * 2 - 1)], random),
  ] };
}

export function createSpotMatch(difficulty = "medium") {
  const level = spotLevel(difficulty);
  return { difficulty: level.id, target: level.target, scores: [0, 0], round: 0,
    phase: "ready", paused: false, pair: null, result: null, history: [], winner: null };
}

export function beginSpotRound(state, random = Math.random) {
  if (state.paused || !["ready", "review"].includes(state.phase)) return false;
  state.pair = makeSpotPair(spotLevel(state.difficulty).size, random, state.pair?.shared);
  state.round++;
  state.phase = "playing";
  state.result = null;
  return true;
}

// One claim settles a round atomically. A wrong claim awards the other player a point.
export function claimSpotPicture(state, actor, picture, elapsed = 0) {
  if (state.paused || state.phase !== "playing" || ![0, 1].includes(actor)) return null;
  const choices = actor === 0 ? state.pair.cards.flat() : state.pair.cards[1];
  if (!choices.includes(picture)) return null;
  const correct = picture === state.pair.shared, scorer = correct ? actor : 1 - actor;
  state.scores[scorer]++;
  state.result = { round: state.round, actor, picture, shared: state.pair.shared, correct, scorer,
    elapsed: Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0 };
  state.history.push(state.result);
  if (state.scores[scorer] >= state.target) { state.winner = scorer; state.phase = "finished"; }
  else state.phase = "review";
  return state.result;
}

export function spotComputerPick(pair, correct, random = Math.random) {
  if (correct) return pair.shared;
  const choices = pair.cards[1].filter(id => id !== pair.shared);
  const sample = Math.max(0, Math.min(.999999999, Number(random()) || 0));
  return choices[Math.floor(sample * choices.length)];
}
