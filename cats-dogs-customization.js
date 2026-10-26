// One appearance schema for the game, character studio and cosmetic shop.
export const TUG_BREEDS = Object.freeze({
  tabby: { name: "Orange tabby", side: "cats", image: "assets/cats-dogs-cat-v2.png", coat: "#d88939", light: "#fff0d6", dark: "#975023", eyes: "#658b42" },
  siamese: { name: "Siamese", side: "cats", image: "assets/cats-dogs-siamese.png", coat: "#e5d7bd", light: "#f5e8cf", dark: "#554033", eyes: "#65b8d9" },
  calico: { name: "Calico", side: "cats", image: "assets/cats-dogs-calico.png", coat: "#f0e5d0", light: "#fff1dd", dark: "#332c29", eyes: "#698b41" },
  golden: { name: "Golden retriever", side: "dogs", image: "assets/cats-dogs-dog-v2.png", coat: "#c38c4b", light: "#f5dcaf", dark: "#946039", eyes: "#aa6e32" },
  labrador: { name: "Labrador retriever", side: "dogs", image: "assets/cats-dogs-labrador.png", coat: "#74462e", light: "#946044", dark: "#43291f", eyes: "#b8843d" },
  pitbull: { name: "Pit bull", side: "dogs", image: "assets/cats-dogs-pitbull.png", coat: "#838186", light: "#f1e5d7", dark: "#55525a", eyes: "#b78338" },
});
export const TUG_WARDROBE_KEY = "cooper-paw-wardrobe-v1";
export const TUG_ACCESSORIES = Object.freeze({
  hat: { none: "No hat", cap: "Park cap", crown: "Royal crown", wizard: "Stargazer hat", flowers: "Flower crown" },
  eyewear: { none: "No glasses", round: "Round glasses", shades: "Sunset shades" },
  charm: { none: "Classic bandana", bow: "Add a bow tie", medal: "Champion medal" },
});
export const TUG_ITEMS = Object.freeze([
  ["crown", "Royal crown", 320, "hat", "crown", "A little gold crown for a very important cat or dog."],
  ["wizard", "Stargazer hat", 400, "hat", "wizard", "A velvet wizard hat with a golden star."],
  ["flowers", "Flower crown", 240, "hat", "flowers", "A circle of sunny blossoms for either pet."],
  ["shades", "Sunset shades", 200, "eyewear", "shades", "Polished sunglasses for your park champion."],
  ["medal", "Champion medal", 180, "charm", "medal", "A golden paw medal on a ribbon in your chosen color."],
].map(([id, name, cost, setting, value, description]) => Object.freeze({ id: `catsdogs:${id}`, name, cost, setting, value, description: `${description} Cosmetic only; unlock once for both teams.`, kind: "pets", category: "pets", games: ["catsdogs"] })));
export const TUG_REWARDS = Object.freeze({ easy: { round: 3, win: 8 }, medium: { round: 5, win: 16 }, hard: { round: 8, win: 28 }, expert: { round: 12, win: 45 } });
export function tugRewardTotal(p = {}) {
  if (p.mode !== "ai" || p.finished !== true || !Object.hasOwn(TUG_REWARDS, p.difficulty) || !Number.isSafeInteger(p.roundsWon) || p.roundsWon < 0 || p.roundsWon > 2 || !Number.isSafeInteger(p.pulls) || p.pulls < 4 || typeof p.won !== "boolean" || p.won && p.roundsWon === 0) return 0;
  const rate = TUG_REWARDS[p.difficulty]; return p.roundsWon * rate.round + (p.won ? rate.win : 0);
}
export function tugItemAvailable(slot, value, owned = []) {
  const item = TUG_ITEMS.find(item => item.setting === slot && item.value === value);
  return !item || owned.includes(item.id);
}
export function normalizeTugPet(side, raw = {}, owned = []) {
  raw = raw && typeof raw === "object" ? raw : {};
  const breed = Object.hasOwn(TUG_BREEDS, raw.breed) && TUG_BREEDS[raw.breed].side === side ? raw.breed : side === "cats" ? "tabby" : "golden";
  const pet = { breed, name: typeof raw.name === "string" ? raw.name.replace(/[\x00-\x1f<>]/g, "").trim().slice(0, 20) : "", accent: /^#[0-9a-f]{6}$/i.test(raw.accent) ? raw.accent : side === "cats" ? "#cf7455" : "#428e96" };
  if (!pet.name) pet.name = side === "cats" ? "Whiskers" : "Woof";
  for (const [slot, choices] of Object.entries(TUG_ACCESSORIES)) pet[slot] = Object.hasOwn(choices, raw[slot]) && tugItemAvailable(slot, raw[slot], owned) ? raw[slot] : "none";
  return pet;
}
export function readTugWardrobe(owned = [], storage = globalThis.localStorage) {
  let raw; try { raw = JSON.parse(storage?.getItem(TUG_WARDROBE_KEY)); } catch {}
  return { selected: raw?.selected === "dogs" ? "dogs" : "cats", cats: normalizeTugPet("cats", raw?.cats, owned), dogs: normalizeTugPet("dogs", raw?.dogs, owned) };
}
export function writeTugWardrobe(wardrobe, storage = globalThis.localStorage) {
  try { storage.setItem(TUG_WARDROBE_KEY, JSON.stringify(wardrobe)); return true; } catch { return false; }
}
