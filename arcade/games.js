import { GAME_PROFILES } from "./characters.js";

// Games can join the wallet and shop without requiring a character editor.
export const ARCADE_GAMES = Object.freeze({
  ...GAME_PROFILES,
  memory: Object.freeze({ name: "Memory Loop", route: "#memory" }),
  spotdiff: Object.freeze({ name: "Spotlight", route: "#spotdiff" }),
  harmonic: Object.freeze({ name: "Harmonic Echo", route: "#harmonic" }),
});

// Non-character studios can join the library without inventing a character family.
export const STUDIO_GAMES = Object.freeze({ ...GAME_PROFILES, harmonic: ARCADE_GAMES.harmonic });
