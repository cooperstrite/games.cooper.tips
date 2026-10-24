import { SHOP_ITEMS } from "../flappy-shop.js";
import { ROCKET_COSMETICS } from "../rocket-config.js";

export const STYLE_KITS = Object.freeze({
  aurora: {
    name: "Aurora collection", body: "#65bdb6", wing: "#6654a2", belly: "#e1f4df", accent: "#b9a1ed", beak: "#e3bf78",
    archery: { outfitColor: "#387d80", accentColor: "#b9a1ed", bowColor: "#90dace", headwearColor: "#387d80" },
    snake: { color: "teal" }, paint: { light: "#d3fff1", body: "#65bdb6", dark: "#365c79" },
  },
  ember: {
    name: "Ember collection", body: "#d98d68", wing: "#8f4e63", belly: "#ffe1aa", accent: "#eab85f", beak: "#e9bb68",
    archery: { outfitColor: "#a35352", accentColor: "#eab85f", bowColor: "#e7a96b", headwearColor: "#a35352" },
    snake: { color: "orange" }, paint: { light: "#ffe0ad", body: "#d98d68", dark: "#7b3e59" },
  },
});
export const ARCADE_ITEMS = Object.freeze([
  ...ROCKET_COSMETICS.map(item => Object.freeze({ ...item, kind: "rocket", games: ["rocket"], category: "rocket" })),
  ...SHOP_ITEMS.map(item => Object.freeze({ ...item, id: `flappy:${item.id}`, legacyId: item.id, games: ["flappy"], kind: "flappy" })),
  ...Object.entries(STYLE_KITS).map(([kit, style], index) => Object.freeze({
    id: `collection:${kit}`, name: style.name, cost: 450 + index * 150, kind: "collection", kit,
    games: ["flappy", "archery", "snake", "neondrift"], category: "collections",
    description: "A coordinated bird palette, archer outfit and bow, snake color, and car paint. Equip separately in each game.",
  })),
]);
export const findArcadeItem = id => ARCADE_ITEMS.find(item => item.id === id);
