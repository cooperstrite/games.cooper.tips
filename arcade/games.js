import { GAME_PROFILES } from "./characters.js";

// Games can join the wallet and shop without requiring a character editor.
export const ARCADE_GAMES = Object.freeze({
  ...GAME_PROFILES,
  memory: Object.freeze({ name: "Memory Loop", route: "#memory" }),
});
