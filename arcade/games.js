import { GAME_PROFILES } from "./characters.js";

// Games can join the wallet and shop without requiring a character editor.
export const ARCADE_GAMES = Object.freeze({
  ...GAME_PROFILES,
  memory: Object.freeze({ name: "Memory Loop", route: "#memory" }),
  spotdiff: Object.freeze({ name: "Spotlight", route: "#spotdiff" }),
  harmonic: Object.freeze({ name: "Harmonic Echo", route: "#harmonic" }),
  cookieclicker: Object.freeze({ name: "Cookie Clicker", route: "#cookieclicker" }),
  runway: Object.freeze({ name: "Runway Glide", route: "#runway" }),
  freeflight: Object.freeze({ name: "Free Flight", route: "#freeflight" }),
});

// Non-character studios can join the library without inventing a character family.
export const STUDIO_GAMES = Object.freeze({ ...GAME_PROFILES, runway: ARCADE_GAMES.runway, freeflight: ARCADE_GAMES.freeflight, harmonic: ARCADE_GAMES.harmonic, cookieclicker: ARCADE_GAMES.cookieclicker });

// Keep unreleased saves and purchases valid, without advertising them in shared menus.
export const PREVIEW_ONLY_GAMES = Object.freeze(["rocket"]);
export const isPublicArcadeGame = id => Object.hasOwn(ARCADE_GAMES, id) && !PREVIEW_ONLY_GAMES.includes(id);
export const PUBLIC_STUDIO_GAMES = Object.freeze(Object.fromEntries(Object.entries(STUDIO_GAMES).filter(([id]) => isPublicArcadeGame(id))));
export const isShopItemVisible = (item, previewGame = null) => item.games.some(id => previewGame ? id === previewGame : isPublicArcadeGame(id));

// Preview capabilities follow the actual game editions, not the availability of
// a generic character mesh. Games with both editions start in their 2D artwork.
export const STUDIO_VIEWS = Object.freeze(Object.fromEntries(Object.entries({
  catsdogs: ["2d"], snake: ["2d"], neondrift: ["2d"], harmonic: ["2d"], cookieclicker: ["2d"],
  flappy: ["2d", "3d"], archery: ["2d", "3d"], redlight: ["2d", "3d"],
  rocket: ["3d"], runway: ["3d"], freeflight: ["3d"],
}).map(([id, views]) => [id, Object.freeze(views)])));
