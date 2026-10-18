import test from "node:test";
import assert from "node:assert/strict";
import { CharacterBuilder, GameCharacter, charactersForGame, GAME_PROFILES } from "../arcade/characters.js";
import { ARCADE_ITEMS } from "../arcade/catalog.js";
import { createArcadeWallet, readArcadeState, flappyWalletView, ARCADE_STORAGE_KEY } from "../arcade/wallet.js";
import { rewardTotal, createRewardSession } from "../arcade/game-services.js";
import { createFrameLoop } from "../arcade/runtime.js";
import { studioCharacter } from "../arcade/studio-preview.js";
import { readArcheryAppearance } from "../archery-appearance.js";
import { readFlappySettings } from "../flappy-appearance.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
const legacyStorage = coins => memoryStorage({ "cooper-flappy-bird-v1": JSON.stringify({ bird: "phoenix", bests: { hard: 14 }, wallet: { coins, earned: coins + 50, owned: ["phoenix-bird", "flower-crown", "flower-crown", "fake"] } }) });

test("each game receives compatible character families and rejects other casts", () => {
  for (const [game, profile] of Object.entries(GAME_PROFILES)) {
    const cast = charactersForGame(game); assert.ok(cast.length);
    for (const definition of cast) {
      const character = new CharacterBuilder(game, definition.key).build();
      assert.ok(character instanceof GameCharacter); assert.equal(character.family, profile.family);
      for (const otherGame of Object.keys(GAME_PROFILES).filter(id => id !== game)) assert.throws(() => new CharacterBuilder(otherGame, definition.id), /incompatible/);
    }
  }
  assert.deepEqual(charactersForGame("unknown"), []);
  assert.throws(() => new GameCharacter("archery", charactersForGame("flappy")[0], {}, {}), /incompatible/);
});

test("character composition allows independent cosmetics and rejects physics or incompatible parts", () => {
  const builder = new CharacterBuilder("flappy", "owl").withColors({ body: "#AABBCC" }).withFeature("hat", "wizard");
  const first = builder.build(); builder.withColors({ body: "#123456" });
  assert.equal(first.colors.body, "#aabbcc"); assert.equal(first.features.hat, "wizard");
  assert.throws(() => { first.colors.body = "#ffffff"; }, TypeError);
  assert.throws(() => builder.withColors({ speed: "#ffffff" }), /Invalid/);
  assert.throws(() => builder.withFeature("gravity", 0), /Invalid/);
  assert.throws(() => new CharacterBuilder("archery", "ranger").withFeature("hat", "wizard"), /Invalid/);
  assert.throws(() => builder.withColors({ body: "red" }), /Invalid/);
});

test("the 3D studio retains every archer color and feature independently of outfit changes", () => {
  const gear = readArcheryAppearance({ avatarStyle: "ranger", hairStyle: "braids", hairColor: "#b56842", facialHair: "full", facialHairColor: "#302a2c", skinTone: "#a66d49", eyeColor: "#71bfe8", faceShape: "angular", faceDetail: "freckles", accessory: "glasses", headwear: "headband", headwearColor: "#d9b568", outfitColor: "#3d7fba", accentColor: "#d68a68", bootColor: "#465753", bowStyle: "crystal", bowColor: "#b89aee", gripColor: "#ede3c4", design: "moonsteel", color: "#a1e3cd" });
  Object.assign(gear, { design: "moonsteel", color: "#a1e3cd" });
  const first = studioCharacter("archery", gear), second = studioCharacter("archery", { ...gear, avatarStyle: "knight", outfitColor: "#719a68" });
  assert.deepEqual(first.features, { hair: "braids", facialHair: "full", headwear: "headband", faceShape: "angular", faceDetail: "freckles", faceAccessory: "glasses", bowStyle: "crystal", arrowDesign: "moonsteel" });
  assert.deepEqual(first.colors, { body: "#3d7fba", accessory: "#d68a68", skin: "#a66d49", hair: "#b56842", eyes: "#71bfe8", facialHair: "#302a2c", headwear: "#d9b568", boots: "#2b3839", bow: "#b89aee", grip: "#ede3c4", arrow: "#a1e3cd" });
  assert.deepEqual(first.features, second.features); assert.equal(second.colors.hair, first.colors.hair); assert.equal(second.colors.facialHair, first.colors.facialHair);
});

test("studio normalization preserves bird, snake, and vehicle choices without importing world settings", () => {
  const appearance = readFlappySettings({ bird: "dragon", hat: "space", eyewear: "goggles", neckwear: "medal", trail: "rainbow", pipeStyle: "gold", colors: { wing: "#123456", pipe: "#654321" } });
  const bird = studioCharacter("flappy", appearance);
  assert.deepEqual(bird.features, { hat: "space", eyewear: "goggles", neckwear: "medal", trail: "rainbow" });
  assert.equal(bird.colors.wing, "#123456"); assert.equal(bird.colors.pipe, undefined); assert.equal(bird.features.pipeStyle, undefined);
  const snake = studioCharacter("snake", { skin: "gardener", palette: ["#c1e783", "#83c85c", "#55a148", "#367b3d"], resolvedHat: "straw", eyewear: "round", neckwear: "scarf", portrait2D: () => {} });
  assert.equal(snake.features.hat, "straw"); assert.equal(snake.colors.body, "#83c85c"); assert.equal(snake.features.portrait2D, undefined);
  const car = studioCharacter("neondrift", { car: "sentinel", color: { body: "#b34d7c", light: "#e9f4eb", dark: "#344651" }, difficulty: "expert" });
  assert.equal(car.key, "sentinel"); assert.equal(car.colors.body, "#b34d7c"); assert.equal(car.features.difficulty, undefined);
});

test("legacy coins and purchases migrate exactly once without editing old settings or records", async () => {
  const storage = legacyStorage(112), before = storage.getItem("cooper-flappy-bird-v1");
  const wallet = createArcadeWallet({ storage });
  assert.equal(wallet.getState().coins, 112);
  assert.deepEqual(flappyWalletView(wallet.getState()).owned.sort(), ["flower-crown", "phoenix-bird"]);
  await wallet.claim("archery", "quiver-one", 12);
  assert.equal(createArcadeWallet({ storage }).getState().coins, 124);
  assert.equal(storage.getItem("cooper-flappy-bird-v1"), before);
});

test("coins earned in archery buy a Flappy Bird item with one charge", async () => {
  const wallet = createArcadeWallet({ storage: memoryStorage() });
  for (const [run, total] of [["a", 60], ["b", 60], ["c", 30]]) await wallet.claim("archery", run, total);
  const purchase = await wallet.purchase("flappy:flower-crown");
  assert.equal(purchase.ok, true); assert.equal(wallet.getState().coins, 0);
  assert.equal(flappyWalletView(wallet.getState()).owned.includes("flower-crown"), true);
  assert.equal((await wallet.purchase("flappy:flower-crown")).purchased, false);
  assert.equal(wallet.getState().coins, 0);
  assert.equal((await wallet.purchase("flappy:space-helmet")).reason, "coins");
});

test("progress awards only the increase, with separate receipts across runs and games", async () => {
  const wallet = createArcadeWallet({ storage: memoryStorage() });
  assert.equal((await wallet.claim("snake", "run", 3)).coins, 3);
  assert.equal((await wallet.claim("snake", "run", 3)).coins, 0);
  assert.equal((await wallet.claim("snake", "run", 1)).coins, 0);
  assert.equal((await wallet.claim("snake", "run", 7)).coins, 4);
  await wallet.claim("flappy", "run", 10); await wallet.claim("snake", "other-run", 2);
  assert.equal(wallet.getState().coins, 19);
  assert.equal((await wallet.claim("unknown", "run", 100)).coins, 0);
});

test("shared storage and browser locks prevent interleaved purchases from overspending", async () => {
  const storage = legacyStorage(700); let queue = Promise.resolve();
  const locks = { request(name, callback) { const result = queue.then(callback); queue = result.catch(() => {}); return result; } };
  const first = createArcadeWallet({ storage, locks }), second = createArcadeWallet({ storage, locks });
  const results = await Promise.all([first.purchase("collection:aurora"), second.purchase("collection:ember")]);
  assert.equal(results.filter(result => result.ok).length, 1);
  assert.equal(first.getState().coins, 250); assert.equal(second.getState().coins, 250);
});

test("collections require ownership, apply only to supported games, and keep game choices separate", async () => {
  const wallet = createArcadeWallet({ storage: legacyStorage(500) });
  assert.equal((await wallet.equip("collection:aurora", "archery")).ok, false);
  await wallet.purchase("collection:aurora"); await wallet.equip("collection:aurora", "archery");
  assert.equal(wallet.getState().equipped.archery, "collection:aurora"); assert.equal(wallet.getState().equipped.flappy, undefined);
  assert.equal((await wallet.equip("flappy:phoenix-bird", "archery")).ok, false);
  assert.equal((await wallet.equip("collection:aurora", "unknown")).ok, false);
  await wallet.equip(null, "archery"); assert.equal(wallet.getState().equipped.archery, undefined);
});

test("malformed saves and unavailable storage keep a usable wallet without resetting purchases", async () => {
  const state = readArcadeState({ coins: -10, earned: Infinity, owned: ["fake", "collection:aurora", "collection:aurora"], equipped: { archery: "flappy:phoenix-bird", snake: "collection:aurora" } });
  assert.equal(state.coins, 0); assert.equal(state.earned, 0); assert.deepEqual(state.owned, ["collection:aurora"]); assert.deepEqual(state.equipped, { snake: "collection:aurora" });
  assert.equal(readArcadeState(null).coins, 0);
  assert.deepEqual(readArcadeState({ owned: {}, equipped: { archery: "collection:aurora" } }).equipped, {});
  const storage = memoryStorage({ [ARCADE_STORAGE_KEY]: JSON.stringify({ coins: 20, migrations: { flappy: true } }) });
  storage.setItem = () => { throw new Error("quota"); };
  const wallet = createArcadeWallet({ storage }); await wallet.claim("archery", "one", 10); await wallet.claim("archery", "two", 10);
  assert.equal(wallet.getState().coins, 40);
});

test("reward policies preserve Flappy rates and use real achievements in other games", async () => {
  for (const [difficulty, rate] of Object.entries({ easy: 1, medium: 3, hard: 5, expert: 10 })) assert.equal(rewardTotal("flappy", { pipes: 2, difficulty }), 2 * rate);
  assert.equal(rewardTotal("archery", { score: 10 }), 10); assert.equal(rewardTotal("archery", { score: 999 }), 60);
  assert.equal(rewardTotal("snake", { apples: 3, difficulty: "fast" }), 9);
  assert.equal(rewardTotal("snake", { applesByDifficulty: { easy: 3, blitz: 1 } }), 7);
  assert.equal(rewardTotal("neondrift", { distance: 299, difficulty: "hard" }), 6);
  for (const game of Object.keys(GAME_PROFILES)) assert.equal(rewardTotal(game, {}), 0);
  assert.equal(rewardTotal("snake", { apples: 2, difficulty: "__proto__" }), 2);
  const wallet = createArcadeWallet({ storage: memoryStorage() }), session = createRewardSession("flappy", wallet);
  await Promise.all([session.award({ pipes: 1, difficulty: "expert" }), session.award({ pipes: 1, difficulty: "expert" })]);
  assert.equal(wallet.getState().coins, 10);
});

test("frame loops cap background time, stop cleanly, and resume without advancing hidden time", () => {
  let callback, nextId = 0; const frames = [], cancelled = [];
  const loop = createFrameLoop((time, delta) => frames.push(delta), { request: next => { callback = next; return ++nextId; }, cancel: id => cancelled.push(id) });
  loop.start(); loop.start(); callback(100); callback(10100); loop.stop(); callback(10200); loop.start(); callback(50000); loop.stop();
  assert.deepEqual(frames, [0, 0.05, 0]); assert.equal(loop.running, false); assert.equal(cancelled.length, 2);
});

test("all shop products have unique ids, integer prices, and registered compatible games", () => {
  assert.equal(new Set(ARCADE_ITEMS.map(item => item.id)).size, ARCADE_ITEMS.length);
  for (const item of ARCADE_ITEMS) { assert.ok(Number.isInteger(item.cost) && item.cost > 0); for (const game of item.games) assert.ok(Object.hasOwn(GAME_PROFILES, game)); }
});
