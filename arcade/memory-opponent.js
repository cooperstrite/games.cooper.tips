import { createComputerOpponent } from "./opponents.js";

// Only exposed cards enter this adapter. It has no reference to the hidden deck.
const CAPACITY = Object.freeze({ easy: 4, medium: 8, hard: 16, expert: 24 });
export function createMemoryOpponent({ difficulty = "medium", random = Math.random } = {}) {
  const policy = createComputerOpponent({ difficulty, random }), seen = new Map();
  const capacity = CAPACITY[policy.level.id];
  return {
    level: policy.level,
    observe({ index, id }) {
      if (!Number.isInteger(index) || typeof id !== "string") return;
      seen.delete(index);
      if (policy.attempt()) seen.set(index, id);
      while (seen.size > capacity) seen.delete(seen.keys().next().value);
    },
    remove(indices) { for (const index of indices) seen.delete(index); },
    choose(legal, first = null) {
      const available = new Set(legal);
      for (const index of seen.keys()) if (!available.has(index) && index !== first?.index) seen.delete(index);
      return policy.choose(legal, index => {
        const id = seen.get(index);
        if (first) return id === first.id ? 10 : !id ? 2 : 0;
        if (!id) return 2;
        return [...seen].some(([other, otherId]) => other !== index && available.has(other) && id === otherId) ? 10 : 0;
      });
    },
    thinkingDelay: () => policy.thinkingDelay(),
  };
}
