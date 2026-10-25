import { createComputerOpponent } from "./opponents.js";

// Only exposed cards enter this adapter. It has no reference to the hidden deck.
const CAPACITY = Object.freeze({ easy: 4, medium: 8, hard: 16, expert: 24 });
export function createMemoryOpponent({ difficulty = "medium", random = Math.random, guessRandom = random } = {}) {
  const policy = createComputerOpponent({ difficulty, random }), seen = new Map();
  const capacity = CAPACITY[policy.level.id];
  let decision = null;
  function pick(candidates, kind) {
    // Blind picks use positions alone. Neither picture IDs nor difficulty can
    // weight the draw, reroll a miss, or steer it toward a hidden matching card.
    const roll = Math.max(0, Math.min(0.999999999, Number(guessRandom()) || 0));
    const index = candidates[Math.floor(roll * candidates.length)];
    decision = Object.freeze({ kind, index, options: candidates.length });
    return index;
  }
  return {
    level: policy.level,
    get lastDecision() { return decision; },
    observe({ index, id }) {
      if (!Number.isInteger(index) || typeof id !== "string") return;
      seen.delete(index);
      if (policy.attempt()) seen.set(index, id);
      while (seen.size > capacity) seen.delete(seen.keys().next().value);
    },
    remove(indices) { for (const index of indices) seen.delete(index); },
    choose(legal, first = null) {
      decision = null;
      if (!legal.length) return null;
      const available = new Set(legal);
      for (const index of seen.keys()) if (!available.has(index) && index !== first?.index) seen.delete(index);
      if (legal.length === 1) return pick(legal, "only-card");
      const recalled = legal.filter(index => {
        const id = seen.get(index);
        if (!id) return false;
        return first ? id === first.id : legal.some(other => other !== index && seen.get(other) === id);
      });
      if (recalled.length) {
        // Difficulty controls whether a remembered opportunity is used.
        const index = policy.choose(legal, candidate => recalled.includes(candidate) ? 1 : 0);
        if (recalled.includes(index)) {
          decision = Object.freeze({ kind: first ? "remembered-match" : "remembered-pair", index });
          return index;
        }
      }
      const unknown = legal.filter(index => !seen.has(index));
      // Once recall fails, every eligible guess has exactly the same chance.
      // There is no higher-difficulty luck bonus or search of the deck.
      return pick(unknown.length ? unknown : legal, "guess");
    },
    thinkingDelay: () => policy.thinkingDelay(),
  };
}
