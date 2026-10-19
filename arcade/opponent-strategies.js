// Rules adapters stay separate from the shared difficulty/timing policy.
export const TUG_RULES = Object.freeze({ maxPull: 100, clickImpulse: 4.6, returnRate: 0.035 });

export function nimValue(piles, maxTake = 3) {
  return piles.reduce((value, count) => value ^ (count % (maxTake + 1)), 0);
}

export function nimActions(piles, maxTake = 3) {
  return piles.flatMap((count, pile) => Array.from({ length: Math.min(count, maxTake) }, (_, i) => ({ pile, amount: i + 1 })));
}

export function scoreNimAction(piles, action, maxTake = 3) {
  const next = [...piles]; next[action.pile] -= action.amount;
  return nimValue(next, maxTake) === 0 ? 1 : 0;
}

export function giveNimFirstPlayerAChance(piles, maxTake = 3) {
  const result = [...piles];
  // A nonzero starting position always has a winning line for the human opener.
  if (nimValue(result, maxTake) === 0) result[0] = Math.max(1, result[0] - 1);
  if (nimValue(result, maxTake) === 0) result[0] += 1;
  return result;
}
