export const SHOP_ITEMS = [
  { id: "flower-crown", name: "Flower crown", setting: "hat", value: "flowers", cost: 15, category: "wearables", description: "A little garden to wear in the sky." },
  { id: "golden-monocle", name: "Golden monocle", setting: "eyewear", value: "monocle", cost: 20, category: "wearables", description: "A polished lens with a golden chain." },
  { id: "aviator-helmet", name: "Aviator helmet", setting: "hat", value: "aviator", cost: 30, category: "wearables", description: "A classic flight helmet with ear flaps." },
  { id: "champion-medal", name: "Champion medal", setting: "neckwear", value: "medal", cost: 35, category: "wearables", description: "A shiny medal for a fearless flyer." },
  { id: "rainbow-trail", name: "Rainbow ribbon", setting: "trail", value: "rainbow", cost: 40, category: "wearables", description: "Leave a flowing rainbow behind you." },
  { id: "space-helmet", name: "Space helmet", setting: "hat", value: "space", cost: 50, category: "wearables", description: "A glass dome for your next adventure." },
  { id: "aurora-world", name: "Aurora skies", setting: "background", value: "aurora", cost: 55, category: "worlds", description: "Dance beneath ribbons of northern light." },
  { id: "golden-pipes", name: "Golden pipes", setting: "pipeStyle", value: "gold", cost: 65, category: "worlds", description: "Engraved pipes with a polished metallic finish." },
  { id: "volcano-world", name: "Volcanic twilight", setting: "background", value: "volcano", cost: 75, category: "worlds", description: "Fly past distant lava and glowing embers." },
  { id: "phoenix-bird", name: "Tiny phoenix", setting: "bird", value: "phoenix", cost: 90, category: "birds", description: "A fiery little flyer with flowing tail feathers." },
];
const MAX_COINS = 1000000000;
export const REWARD_TIERS = [
  { at: 0, name: "First flight", color: "#b4bdb5", bonus: 0 },
  { at: 1, name: "Sky coin", color: "#d9ac55", bonus: 0 },
  { at: 5, name: "Bronze wings", color: "#bb825a", bonus: 5 },
  { at: 15, name: "Silver wings", color: "#adbfc8", bonus: 15 },
  { at: 30, name: "Golden wings", color: "#e8bc54", bonus: 35 },
  { at: 60, name: "Diamond wings", color: "#91d8db", bonus: 90 },
];
export const COIN_MULTIPLIERS = { easy: 1, medium: 2, hard: 3, expert: 4 };
const validAmount = value => Number.isSafeInteger(value) && value >= 0 ? Math.min(MAX_COINS, value) : 0;

export function flightReward(score, difficulty = "easy") {
  const pipes = validAmount(score), multiplier = typeof difficulty === "string" && Object.hasOwn(COIN_MULTIPLIERS, difficulty) ? COIN_MULTIPLIERS[difficulty] : 1;
  const tier = REWARD_TIERS.findLast(value => pipes >= value.at);
  return { ...tier, pipes, multiplier, base: Math.min(MAX_COINS, pipes * multiplier), coins: Math.min(MAX_COINS, pipes * multiplier + tier.bonus) };
}
export function readFlappyWallet(saved) {
  const value = saved && typeof saved === "object" ? saved : {};
  return { coins: validAmount(value.coins), earned: validAmount(value.earned), owned: [...new Set(Array.isArray(value.owned) ? value.owned.filter(id => SHOP_ITEMS.some(item => item.id === id)) : [])] };
}
export function canEquip(wallet, setting, value) {
  const item = SHOP_ITEMS.find(item => item.setting === setting && item.value === value);
  return !item || wallet.owned.includes(item.id);
}
export function buyFlappyItem(wallet, id) {
  const item = SHOP_ITEMS.find(value => value.id === id);
  if (!item) return { ok: false, reason: "unknown" };
  if (wallet.owned.includes(item.id)) return { ok: true, purchased: false, item };
  if (wallet.coins < item.cost) return { ok: false, reason: "coins", needed: item.cost - wallet.coins };
  wallet.coins -= item.cost; wallet.owned.push(item.id);
  return { ok: true, purchased: true, item };
}
export function bankFlappyReward(wallet, reward) {
  wallet.coins = Math.min(MAX_COINS, wallet.coins + reward.coins);
  wallet.earned = Math.min(MAX_COINS, wallet.earned + reward.coins);
}
