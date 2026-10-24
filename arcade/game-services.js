import { getArcadeWallet } from "./wallet.js";
import { COIN_MULTIPLIERS } from "../flappy-shop.js";
import { findArcadeItem, STYLE_KITS } from "./catalog.js";
import { MISSIONS } from "../rocket-config.js";

export const EARNING_RULES = Object.freeze({
  flappy: "Each pipe: Easy 1, Medium 3, Hard 5, Expert 10 coins. Banked when the flight ends.",
  archery: "Earn 1 coin per scored point. Misses earn no coins.",
  snake: "Earn coins for each apple: Sloth 1, Easy 1, Classic 2, Fast 3, Blitz 4.",
  neondrift: "Each 100 meters: Easy 1, Medium 2, Hard 3, Expert 5 coins.",
  rocket: "Complete missions for 20, 35, 60, 85, 110, or 140 coins. Free play earns no coins. All rocket hardware is free; shop items are visual only.",
});
const safeCount = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const rate = (rates, key) => typeof key === "string" && Object.hasOwn(rates, key) ? rates[key] : 1;
export function rewardTotal(gameId, progress = {}) {
  let total = 0;
  if (gameId === "rocket" && progress.mode === "mission" && progress.success === true) total = MISSIONS.find(mission => mission.id === progress.mission)?.coins || 0;
  if (gameId === "flappy") total = safeCount(progress.pipes) * (Object.hasOwn(COIN_MULTIPLIERS, progress.difficulty) ? COIN_MULTIPLIERS[progress.difficulty] : 1);
  if (gameId === "archery") total = Math.min(60, safeCount(progress.score));
  if (gameId === "snake") {
    const rates = { sloth: 1, easy: 1, classic: 2, fast: 3, blitz: 4 };
    total = progress.applesByDifficulty ? Object.entries(rates).reduce((sum, [id, value]) => sum + safeCount(progress.applesByDifficulty[id]) * value, 0) : safeCount(progress.apples) * rate(rates, progress.difficulty);
  }
  if (gameId === "neondrift") total = Math.floor(Math.max(0, Number.isFinite(progress.distance) ? progress.distance : 0) / 100) * rate({ easy: 1, medium: 2, hard: 3, expert: 5 }, progress.difficulty);
  return Math.min(1000000000, total);
}
export function createRewardSession(gameId, wallet = getArcadeWallet()) {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let claimed = 0;
  return {
    id,
    award(progress) {
      const total = rewardTotal(gameId, progress);
      if (total <= claimed) return Promise.resolve({ changed: false, coins: 0 });
      claimed = total; return wallet.claim(gameId, id, total);
    },
  };
}
export function getEquippedKit(gameId, wallet = getArcadeWallet()) {
  const state = wallet.getState(), item = findArcadeItem(state.equipped[gameId]);
  return item?.kind === "collection" && state.owned.includes(item.id) && item.games.includes(gameId) ? STYLE_KITS[item.kit] : null;
}
export function applyEquippedKit(gameId, appearance) {
  const kit = getEquippedKit(gameId);
  if (!kit) return appearance;
  if (gameId === "flappy") return { ...appearance, colors: { ...appearance.colors, body: kit.body, wing: kit.wing, belly: kit.belly, beak: kit.beak, accessory: kit.accent } };
  if (gameId === "archery") return { ...appearance, ...kit.archery };
  if (gameId === "snake") return { ...appearance, ...kit.snake };
  return appearance;
}
export function mountGameWallet(root, gameId) {
  const row = document.createElement("div"); row.className = "arcade-game-wallet";
  const link = document.createElement("a"); link.href = `#store/${gameId}`;
  const label = document.createElement("span"); label.textContent = EARNING_RULES[gameId];
  row.append(link, label); root.prepend(row);
  const unsubscribe = getArcadeWallet().subscribe(state => { link.textContent = `${state.coins.toLocaleString()} coins | Shared shop`; });
  return () => { unsubscribe(); row.remove(); };
}
