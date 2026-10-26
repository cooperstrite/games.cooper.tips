export const SPOTLIGHT_STORAGE_KEY = "cooper-spotlight-v2";
export const SPOTLIGHT_EDITION = "gallery-1";
export const SPOTLIGHT_CHALLENGE_COUNT = 10;
export const SPOTLIGHT_LEVELS = Object.freeze({
  easy: { label: "Easy", count: 4, seconds: 180, find: 1, bonus: 4, layer: "broad", note: "Big changes. A gentle place to start." },
  medium: { label: "Medium", count: 6, seconds: 180, find: 2, bonus: 8, layer: "broad", note: "Smaller objects and less obvious changes." },
  hard: { label: "Hard", count: 6, seconds: 150, find: 3, bonus: 15, layer: "fine", note: "Look closely at patterns, shapes, and details." },
  expert: { label: "Expert", count: 8, seconds: 120, find: 4, bonus: 24, layer: "fine", note: "Tiny changes, hidden in plain sight. Zoom helps." },
});
export const SPOTLIGHT_SCENES = Object.freeze([
  { id: "glasshouse", title: "Glasshouse Morning", subtitle: "Sage leaves & golden light", color: "#4b735d", free: true },
  { id: "harbor", title: "The Harbor Cafe", subtitle: "A little escape by the sea", color: "#397d93", free: true },
  { id: "observatory", title: "Celestial Study", subtitle: "A universe of little details", color: "#5d5380", cost: 120 },
  { id: "bakery", title: "Alpine Bakery", subtitle: "Warm bread, mountain air", color: "#ad7951", cost: 180 },
]);
export const SPOTLIGHT_FRAMES = Object.freeze([
  { id: "gallery", name: "Gallery white" }, { id: "walnut", name: "Walnut & brass", cost: 60 }, { id: "midnight", name: "Midnight blue", cost: 140 },
]);
export const spotlightImage = (id, variant = "original") => `assets/spotlight-${id}-${variant}.jpg`;
export const SPOTLIGHT_ITEMS = Object.freeze([
  ...SPOTLIGHT_SCENES.filter(s => !s.free).map(s => ({ id: `spotlight:scene:${s.id}`, name: s.title, cost: s.cost, kind: "spotlight", games: ["spotdiff"], category: "pictures", setting: "scene", value: s.id, description: "A new illustrated destination with 40 puzzles: ten shuffled challenges at each difficulty, from Easy to Expert. Each challenge has its own coin rewards." })),
  ...SPOTLIGHT_FRAMES.filter(f => f.cost).map(f => ({ id: `spotlight:frame:${f.id}`, name: f.name, cost: f.cost, kind: "spotlight", games: ["spotdiff"], category: "frames", setting: "frame", value: f.id, description: "A beautifully finished frame for every Spotlight picture. A visual change only; clues and rewards stay the same." })),
]);
export function spotlightUnlocked(setting, value, owned = []) {
  if (setting === "scene" && SPOTLIGHT_SCENES.some(s => s.id === value && s.free)) return true;
  if (setting === "frame" && value === "gallery") return true;
  return SPOTLIGHT_ITEMS.some(item => item.setting === setting && item.value === value && owned.includes(item.id));
}
export function normalizeSpotlightSettings(raw = {}, owned = []) {
  raw = raw && typeof raw === "object" ? raw : {};
  return { scene: spotlightUnlocked("scene", raw.scene, owned) ? raw.scene : "glasshouse", difficulty: Object.hasOwn(SPOTLIGHT_LEVELS, raw.difficulty) ? raw.difficulty : "easy", mode: raw.mode === "relaxed" ? "relaxed" : "challenge", frame: spotlightUnlocked("frame", raw.frame, owned) ? raw.frame : "gallery", sound: raw.sound !== false };
}
export function readSpotlightSettings(owned = []) {
  try { return normalizeSpotlightSettings(JSON.parse(localStorage.getItem(SPOTLIGHT_STORAGE_KEY)), owned); }
  catch { return normalizeSpotlightSettings({}, owned); }
}
export function writeSpotlightSettings(settings) {
  try { localStorage.setItem(SPOTLIGHT_STORAGE_KEY, JSON.stringify(settings)); return true; } catch { return false; }
}
// Challenge 1 retains the original puzzle and receipt, preserving earned coins.
export function spotlightRewardKey(scene, difficulty, challenge = 0) {
  const base = `${SPOTLIGHT_EDITION}:${scene}:${difficulty}`;
  return challenge === 0 ? base : `${base}:challenge-${challenge + 1}`;
}
export function spotlightRewardTotal(p = {}) {
  const level = Object.hasOwn(SPOTLIGHT_LEVELS, p.difficulty) ? SPOTLIGHT_LEVELS[p.difficulty] : null;
  if (p.mode !== "challenge" || !level || !SPOTLIGHT_SCENES.some(s => s.id === p.scene)) return 0;
  if (p.challenge !== undefined && (!Number.isInteger(p.challenge) || p.challenge < 0 || p.challenge >= SPOTLIGHT_CHALLENGE_COUNT)) return 0;
  if (!Number.isInteger(p.found) || !Number.isInteger(p.hinted) || p.hinted < 0 || p.found < p.hinted || p.found > level.count) return 0;
  return (p.found - p.hinted) * level.find + (p.complete === true && p.found === level.count ? level.bonus : 0);
}
export function spotlightCoinGuide(settings, banked = 0) {
  if (settings.mode === "relaxed") return "Relaxed practice: no timer, no tap penalties, and no coins. Switch to Challenge to earn.";
  const level = SPOTLIGHT_LEVELS[settings.difficulty], maximum = level.count * level.find + level.bonus;
  return `${level.label}, challenge ${(settings.challenge || 0) + 1} of ${SPOTLIGHT_CHALLENGE_COUNT}: ${level.find} coin${level.find === 1 ? "" : "s"} per difference you find + ${level.bonus} for finishing. Up to ${maximum} for this challenge. ${banked ? `${banked} already banked; ${Math.max(0, maximum - banked)} still available.` : "Each challenge has its own reward limit; retries can improve your best reward."} Hinted finds earn 0.`;
}
export function spotlightShopArt(item) {
  const frame = item.setting === "frame" ? item.value : "gallery", scene = item.setting === "scene" ? item.value : "glasshouse";
  return `<div class="sl-shop-art" data-frame="${frame}"><img src="${spotlightImage(scene)}" alt="${item.name} preview" loading="lazy"><span>${item.setting === "scene" ? "40 PUZZLES / FOUR LEVELS" : "PICTURE FRAME"}</span></div>`;
}
