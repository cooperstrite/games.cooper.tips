// Character identity and cosmetics belong here. Physics and abilities belong to games.
export const GAME_PROFILES = Object.freeze({
  flappy: Object.freeze({ name: "Flappy Bird", family: "bird", route: "#flappy" }),
  archery: Object.freeze({ name: "Aurora Archery", family: "humanoid", route: "#archery" }),
  snake: Object.freeze({ name: "Snake", family: "snake", route: "#snake" }),
  neondrift: Object.freeze({ name: "Neon Drift", family: "vehicle", route: "#neondrift" }),
  redlight: Object.freeze({ name: "Red Light Green Light", family: "runner", route: "#redlight" }),
  rocket: Object.freeze({ name: "Rocket Boost", family: "astronaut", route: "#rocket" }),
});

const definitions = [
  ["bird", "sparrow", "Sunny sparrow"], ["bird", "jay", "Blue jay"],
  ["bird", "owl", "Little owl"], ["bird", "hummingbird", "Hummingbird"],
  ["bird", "dragon", "Baby dragon"], ["bird", "phoenix", "Tiny phoenix"],
  ["humanoid", "ranger", "Trail ranger"], ["humanoid", "scout", "Woodland scout"], ["humanoid", "knight", "Aurora knight"],
  ["snake", "generic", "Generic"], ["snake", "gardener", "Gardener"],
  ["snake", "python", "Python"], ["snake", "rattlesnake", "Rattlesnake"],
  ["vehicle", "comet", "Comet GT"], ["vehicle", "sentinel", "Sentinel SUV"],
  ["vehicle", "phantom", "Phantom Coupe"], ["vehicle", "rally", "Rally RS"],
  ["runner", "sprinter", "Sprint runner"], ["runner", "tracksuit", "Track runner"], ["runner", "trail", "Trail runner"],
  ["astronaut", "flight", "Flight suit"], ["astronaut", "explorer", "Explorer suit"], ["astronaut", "retro", "Heritage suit"],
];
export const CHARACTERS = Object.freeze(definitions.map(([family, key, name]) => Object.freeze({
  id: `${family}:${key}`, key, name, family,
})));
const SLOTS = {
  bird: { hat: ["none", "cap", "crown", "wizard", "party", "flowers", "aviator", "space"], eyewear: ["none", "glasses", "shades", "goggles", "monocle"], neckwear: ["none", "scarf", "bowtie", "bandana", "medal"], trail: ["none", "feathers", "stars", "bubbles", "fire", "rainbow"] },
  humanoid: { hair: ["short", "bob", "ponytail", "braids", "curls", "bun", "bald"], facialHair: ["none", "stubble", "mustache", "goatee", "beard", "full"], headwear: ["none", "hood", "headband", "helmet", "cap"], faceShape: ["oval", "round", "angular"], faceDetail: ["none", "freckles", "scar"], faceAccessory: ["none", "glasses", "eyepatch", "earring"], bowStyle: ["longbow", "recurve", "crystal"], arrowDesign: ["ranger", "moonsteel", "aurora"] },
  snake: { hat: ["none", "skin", "straw", "crown", "party", "flowers"], eyewear: ["none", "round", "shades"], neckwear: ["none", "bandana", "bow", "scarf"] },
  vehicle: {},
  astronaut: { build: ["lean", "athletic", "strong"], hair: ["short", "bob", "ponytail", "braids", "curls", "bun", "bald"], facialHair: ["none", "stubble", "mustache", "goatee", "beard"] },
  runner: { build: ["lean", "athletic", "strong"], hair: ["short", "bob", "ponytail", "braids", "curls", "bun", "bald"], facialHair: ["none", "stubble", "mustache", "goatee", "beard"], headwear: ["none", "headband", "cap"], eyewear: ["none", "glasses", "sunglasses"], wristwear: ["none", "watch", "bands"] },
};
const COLOR_SLOTS = {
  bird: ["body", "wing", "belly", "beak", "accessory", "trail"],
  humanoid: ["body", "skin", "hair", "eyes", "accessory", "facialHair", "headwear", "boots", "bow", "grip", "arrow"],
  snake: ["body", "belly", "accessory", "dark"], vehicle: ["body", "accessory", "light", "dark"],
  runner: ["body", "bottoms", "skin", "hair", "eyes", "facialHair", "shoes", "accessory", "headwear"],
  astronaut: ["body", "skin", "hair", "eyes", "facialHair", "accessory", "gloves", "boots", "helmet", "visor"],
};

export function charactersForGame(gameId) {
  const profile = GAME_PROFILES[gameId];
  return profile ? CHARACTERS.filter(character => character.family === profile.family) : [];
}
export function characterOptions(gameId) {
  return Object.fromEntries(charactersForGame(gameId).map(character => [character.key, character.name]));
}
export function resolveCharacter(gameId, key) {
  return charactersForGame(gameId).find(character => character.key === key || character.id === key) || null;
}

export class GameCharacter {
  constructor(gameId, definition, colors, features) {
    if (!definition || resolveCharacter(gameId, definition.id) !== definition) throw new TypeError("Character definition is incompatible with this game");
    this.gameId = gameId; this.id = definition.id; this.key = definition.key;
    this.name = definition.name; this.family = definition.family;
    this.colors = Object.freeze({ ...colors }); this.features = Object.freeze({ ...features });
    Object.freeze(this);
  }
}

export class CharacterBuilder {
  constructor(gameId, key) {
    const definition = resolveCharacter(gameId, key);
    if (!definition) throw new TypeError(`Character ${key} is incompatible with ${gameId}`);
    this.gameId = gameId; this.definition = definition; this.colors = {}; this.features = {};
  }
  withColors(colors = {}) {
    for (const [slot, value] of Object.entries(colors)) {
      if (!COLOR_SLOTS[this.definition.family].includes(slot) || typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) throw new TypeError(`Invalid character color: ${slot}`);
      this.colors[slot] = value.toLowerCase();
    }
    return this;
  }
  withFeature(slot, value) {
    if (!Object.hasOwn(SLOTS[this.definition.family], slot) || !SLOTS[this.definition.family][slot].includes(value)) throw new TypeError(`Invalid character feature: ${slot}`);
    this.features[slot] = value; return this;
  }
  build() { return new GameCharacter(this.gameId, this.definition, this.colors, this.features); }
}
