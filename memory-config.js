export const MEMORY_STORAGE_KEY = "cooper-memory-loop-v1";
export const MEMORY_LAYOUTS = Object.freeze([
  { tiles: 8, columns: 4, label: "8 cards / 4 pairs" },
  { tiles: 12, columns: 4, label: "12 cards / 6 pairs" },
  { tiles: 16, columns: 4, label: "16 cards / 8 pairs" },
  { tiles: 20, columns: 5, label: "20 cards / 10 pairs" },
  { tiles: 24, columns: 6, label: "24 cards / 12 pairs" },
]);
const collection = (id, name, labels) => Object.freeze({ id, name, image: `assets/memory-${id}.jpg`, cards: Object.freeze(labels.map((label, index) => Object.freeze({ id: `${id}-${index}`, label, index }))) });
export const MEMORY_SETS = Object.freeze([
  collection("wonders", "Pocket Wonders", ["Mushroom", "Compass", "Fox", "Lantern", "Butterfly", "Camera", "Strawberry", "Seashell", "Frog", "Amethyst", "Biplane", "Bonsai"]),
  collection("tidepool", "Tidepool", ["Clownfish", "Sea turtle", "Crab", "Scallop shell", "Octopus", "Seahorse", "Jellyfish", "Coral", "Whale", "Starfish", "Pearl", "Lighthouse"]),
  collection("starlight", "Starlight", ["Rocket", "Saturn", "Space helmet", "Comet", "Telescope", "Mars rover", "Crystal moon", "Satellite", "Flying saucer", "Earth", "Robot", "Star crystal"]),
]);
export const MEMORY_BACKS = Object.freeze([
  { id: "atlas", name: "Gilded Atlas" }, { id: "coral", name: "Coral Current" }, { id: "lunar", name: "Lunar Velvet" },
]);
export const MEMORY_ITEMS = Object.freeze([
  { id: "memory:tidepool", name: "Tidepool picture set", setting: "set", value: "tidepool", cost: 240, description: "Twelve richly illustrated ocean treasures, from a tiny seahorse to a great blue whale." },
  { id: "memory:starlight", name: "Starlight picture set", setting: "set", value: "starlight", cost: 420, description: "Twelve space curiosities: jewel-like planets, a little robot, a rocket, and more." },
  { id: "memory:coral", name: "Coral Current card back", setting: "back", value: "coral", cost: 120, description: "Warm coral lacquer, rippling lines, and a golden medallion for every hidden card." },
  { id: "memory:lunar", name: "Lunar Velvet card back", setting: "back", value: "lunar", cost: 200, description: "Deep violet velvet, silver constellations, and a moonlit medallion." },
].map(item => Object.freeze({ ...item, kind: "memory", games: ["memory"], category: "cards" })));
export const MEMORY_REWARDS = Object.freeze({
  easy: { match: 1, win: 6 }, medium: { match: 2, win: 12 }, hard: { match: 3, win: 20 }, expert: { match: 4, win: 30 },
});
export const memorySet = id => MEMORY_SETS.find(set => set.id === id) || MEMORY_SETS[0];
export const memoryLayout = tiles => MEMORY_LAYOUTS.find(layout => layout.tiles === tiles) || MEMORY_LAYOUTS[2];
export function memoryItemUnlocked(setting, value, owned = []) {
  if (setting === "set" && value === "wonders" || setting === "back" && value === "atlas") return true;
  return MEMORY_ITEMS.some(item => item.setting === setting && item.value === value && owned.includes(item.id));
}
export function normalizeMemorySettings(raw = {}, owned = []) {
  raw = raw && typeof raw === "object" ? raw : {};
  return {
    mode: ["solo", "local", "computer"].includes(raw.mode) ? raw.mode : "solo",
    tiles: memoryLayout(raw.tiles).tiles,
    difficulty: Object.hasOwn(MEMORY_REWARDS, raw.difficulty) ? raw.difficulty : "medium",
    players: [2, 3, 4].includes(raw.players) ? raw.players : 2,
    names: Array.from({ length: 4 }, (_, i) => typeof raw.names?.[i] === "string" ? raw.names[i].trim().slice(0, 20) || `Player ${i + 1}` : `Player ${i + 1}`),
    set: memoryItemUnlocked("set", raw.set, owned) ? raw.set : "wonders",
    back: memoryItemUnlocked("back", raw.back, owned) ? raw.back : "atlas",
    sound: raw.sound !== false,
  };
}
export function readMemorySettings(owned = []) {
  try { return normalizeMemorySettings(JSON.parse(localStorage.getItem(MEMORY_STORAGE_KEY)), owned); }
  catch { return normalizeMemorySettings({}, owned); }
}
export function writeMemorySettings(settings) {
  try { localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(settings)); return true; }
  catch { return false; }
}
export function memoryRewardTotal(progress = {}) {
  if (!MEMORY_LAYOUTS.some(layout => layout.tiles === progress.tiles)) return 0;
  const pairs = progress.tiles / 2;
  const matches = Number.isInteger(progress.humanMatches) && progress.humanMatches >= 0 ? Math.min(pairs, progress.humanMatches) : 0;
  if (progress.mode === "solo") return matches;
  if (progress.mode !== "computer" || !Object.hasOwn(MEMORY_REWARDS, progress.difficulty)) return 0;
  const reward = MEMORY_REWARDS[progress.difficulty];
  const won = progress.complete === true && Number.isInteger(progress.computerMatches) && progress.computerMatches >= 0 && matches + progress.computerMatches === pairs && matches > progress.computerMatches;
  return matches * reward.match + (won ? Math.round(reward.win * pairs / 8) : 0);
}
