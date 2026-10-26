import { SPOTLIGHT_CHALLENGE_COUNT, SPOTLIGHT_LEVELS, SPOTLIGHT_SCENES } from "./spotlight-config.js";

export const SPOTLIGHT_ROTATION_KEY = "cooper-spotlight-rotation-v1";
const validIndex = value => Number.isInteger(value) && value >= 0 && value < SPOTLIGHT_CHALLENGE_COUNT;
const validKey = key => SPOTLIGHT_SCENES.some(scene => Object.keys(SPOTLIGHT_LEVELS).some(level => key === `${scene.id}:${level}`));
function browserStorage() { try { return globalThis.localStorage; } catch { return null; } }
function normalize(raw) {
  const decks = {};
  if (raw?.version === 1 && raw.decks && typeof raw.decks === "object") {
    for (const [key, value] of Object.entries(raw.decks)) {
      if (!validKey(key) || !value || !validIndex(value.current) || !Array.isArray(value.bag)) continue;
      if (value.bag.length >= SPOTLIGHT_CHALLENGE_COUNT || value.bag.some(i => !validIndex(i) || i === value.current) || new Set(value.bag).size !== value.bag.length) continue;
      decks[key] = { current: value.current, started: value.started === true, bag: [...value.bag] };
    }
  }
  return { version: 1, decks };
}

// Each scene/difficulty has its own shuffled bag. An unopened challenge stays
// reserved across reloads; starting it makes the next visit advance the bag.
export function createSpotlightRotation({ storage = browserStorage(), random = Math.random } = {}) {
  let memory = normalize(null), available = true;
  function read() {
    if (available && storage) {
      try {
        const saved = storage.getItem(SPOTLIGHT_ROTATION_KEY);
        try { memory = normalize(saved ? JSON.parse(saved) : null); } catch { memory = normalize(null); }
      }
      catch { available = false; }
    }
    return memory;
  }
  function write(state) {
    memory = state;
    if (available && storage) { try { storage.setItem(SPOTLIGHT_ROTATION_KEY, JSON.stringify(state)); } catch { available = false; } }
  }
  function keyFor(scene, level) {
    const key = `${scene}:${level}`;
    if (!validKey(key)) throw new RangeError("Unknown Spotlight scene or difficulty.");
    return key;
  }
  function shuffle(previous) {
    const bag = Array.from({ length: SPOTLIGHT_CHALLENGE_COUNT }, (_, i) => i);
    for (let i = bag.length - 1; i > 0; i--) {
      const sample = random(), unit = Number.isFinite(sample) ? Math.max(0, Math.min(1 - Number.EPSILON, sample)) : 0;
      const j = Math.floor(unit * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    if (bag[0] === previous) [bag[0], bag[1]] = [bag[1], bag[0]];
    return bag;
  }
  return {
    prepare(scene, level, { fresh = false } = {}) {
      const key = keyFor(scene, level), state = read(), deck = state.decks[key];
      if (deck && !deck.started && !fresh) return deck.current;
      const bag = deck?.bag.length ? [...deck.bag] : shuffle(deck?.current);
      const current = bag.shift();
      state.decks[key] = { current, started: false, bag }; write(state); return current;
    },
    start(scene, level, challenge) {
      const key = keyFor(scene, level), state = read(), deck = state.decks[key];
      if (!deck || deck.current !== challenge || deck.started) return;
      deck.started = true; write(state);
    },
  };
}
