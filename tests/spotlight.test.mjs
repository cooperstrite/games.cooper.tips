import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { SPOTLIGHT_CHALLENGE_COUNT, SPOTLIGHT_LEVELS, SPOTLIGHT_SCENES, SPOTLIGHT_ITEMS, spotlightImage, spotlightUnlocked, normalizeSpotlightSettings, spotlightRewardKey, spotlightRewardTotal, spotlightCoinGuide } from "../spotlight-config.js";
import { spotlightTargets } from "../spotlight-puzzles.js";
import { createSpotlightRotation, SPOTLIGHT_ROTATION_KEY } from "../spotlight-rotation.js";
import { createSpotlightRound, startSpotlight, tickSpotlight, tapSpotlight, hintSpotlight, spotlightProgress } from "../spotlight-engine.js";
import { createArcadeWallet } from "../arcade/wallet.js";
import { rewardTotal } from "../arcade/game-services.js";

const center = t => [t.x + t.w / 2, t.y + t.h / 2];
const round = (difficulty = "easy", scene = "glasshouse", mode = "challenge", challenge = 0) => createSpotlightRound({ difficulty, scene, mode, challenge, targets: spotlightTargets(scene, difficulty, challenge) });
const storage = () => { const values = new Map(); return { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }; };

for (const scene of SPOTLIGHT_SCENES) for (const [difficulty, level] of Object.entries(SPOTLIGHT_LEVELS)) for (let challenge = 0; challenge < SPOTLIGHT_CHALLENGE_COUNT; challenge++) {
  test(`${scene.title} / ${level.label} / ${challenge + 1}: every displayed difference is reachable, distinct, and backed by artwork`, () => {
    const s = round(difficulty, scene.id, "challenge", challenge); assert.equal(s.targets.length, level.count); assert.equal(new Set(s.targets.map(t => t.id)).size, level.count);
    assert.ok(existsSync(new URL("../" + spotlightImage(scene.id), import.meta.url)));
    for (const t of s.targets) {
      assert.ok([t.x, t.y, t.w, t.h].every(Number.isFinite)); assert.ok(t.x >= 0 && t.y >= 0 && t.w > 0 && t.h > 0 && t.x + t.w <= 100.0001 && t.y + t.h <= 100.0001);
      assert.ok(existsSync(new URL("../" + spotlightImage(scene.id, t.source), import.meta.url)));
    }
    assert.equal(tapSpotlight(s, ...center(s.targets[0])).type, "ignored");
    assert.equal(startSpotlight(s), true);
    for (const t of s.targets) { const hit = tapSpotlight(s, ...center(t)); assert.equal(hit.type, "found"); assert.equal(hit.target.id, t.id); }
    assert.equal(s.phase, "complete"); assert.equal(s.found.size, level.count);
    assert.equal(rewardTotal("spotdiff", spotlightProgress(s)), level.count * level.find + level.bonus);
    assert.equal(tapSpotlight(s, ...center(s.targets[0])).type, "ignored");
  });
}
test("later levels use progressively smaller details across the ten-challenge collection", () => {
  for (const scene of SPOTLIGHT_SCENES) {
    const area = level => { const targets = Array.from({ length: SPOTLIGHT_CHALLENGE_COUNT }, (_, i) => spotlightTargets(scene.id, level, i)).flat(); return targets.reduce((sum, t) => sum + t.w * t.h, 0) / targets.length; };
    assert.ok(area("easy") > area("medium")); assert.ok(area("medium") > area("hard")); assert.ok(area("hard") > area("expert"));
  }
});
test("every Expert scene requires all eight differences, including the final two", () => {
  for (const scene of SPOTLIGHT_SCENES) for (let i = 0; i < SPOTLIGHT_CHALLENGE_COUNT; i++) {
    const s = round("expert", scene.id, "challenge", i);
    assert.equal(s.targets.length, 8);
    startSpotlight(s);
    for (const t of s.targets.slice(0, 6)) tapSpotlight(s, ...center(t));
    assert.equal(s.phase, "playing"); assert.equal(rewardTotal("spotdiff", spotlightProgress(s)), 24);
    tapSpotlight(s, ...center(s.targets[6])); assert.equal(s.phase, "playing");
    tapSpotlight(s, ...center(s.targets[7])); assert.equal(s.phase, "complete");
    assert.equal(s.found.size, 8); assert.equal(rewardTotal("spotdiff", spotlightProgress(s)), 56);
  }
});
test("duplicate taps and overlapping hit zones cannot pay or count twice", () => {
  const s = round(); startSpotlight(s); const point = center(s.targets[0]);
  tapSpotlight(s, ...point); assert.equal(tapSpotlight(s, ...point).type, "already"); assert.equal(s.found.size, 1); assert.equal(s.mistakes, 0);
  const overlap = createSpotlightRound({ targets: [{ id: "a", x: 10, y: 10, w: 20, h: 20 }, { id: "b", x: 25, y: 10, w: 20, h: 20 }] }); startSpotlight(overlap);
  tapSpotlight(overlap, 26, 20); assert.equal(tapSpotlight(overlap, 26, 20).type, "already"); assert.equal(overlap.found.size, 1);
});
test("pause stops time and interactions; expiration ends the round", () => {
  const s = round(); startSpotlight(s); tickSpotlight(s, 1.25); const before = s.remaining; s.paused = true;
  tickSpotlight(s, 1000); assert.equal(s.remaining, before); assert.equal(tapSpotlight(s, ...center(s.targets[0])).type, "ignored"); assert.equal(hintSpotlight(s), null);
  s.paused = false; tickSpotlight(s, 200); assert.equal(s.phase, "failed"); assert.equal(s.remaining, 0); assert.equal(hintSpotlight(s), null);
});
test("wrong taps cost five seconds, and repeated taps have a brief cooldown", () => {
  const s = round(); startSpotlight(s); assert.equal(tapSpotlight(s, 99, 1).type, "miss"); assert.equal(s.remaining, 175);
  assert.equal(tapSpotlight(s, 99, 1).type, "ignored"); tickSpotlight(s, .6); tapSpotlight(s, 99, 1); assert.equal(s.mistakes, 2);
  s.remaining = 2; tickSpotlight(s, .6); tapSpotlight(s, 99, 1); assert.equal(s.phase, "failed"); assert.equal(s.remaining, 0);
});
test("two hints mark actual differences but do not award find coins", () => {
  const s = round("expert"); startSpotlight(s); hintSpotlight(s); hintSpotlight(s); assert.equal(hintSpotlight(s), null); assert.equal(s.hints, 0);
  for (const t of s.targets.filter(t => !s.found.has(t.id))) tapSpotlight(s, ...center(t));
  assert.equal(s.phase, "complete"); assert.equal(spotlightRewardTotal(spotlightProgress(s)), 6 * 4 + 24);
});
test("relaxed and custom rounds are untimed and never earn coins", () => {
  for (const s of [round("expert", "glasshouse", "relaxed"), createSpotlightRound({ targets: spotlightTargets("glasshouse", "easy"), custom: true })]) {
    startSpotlight(s); tickSpotlight(s, 10000); tapSpotlight(s, 99, 1); assert.equal(s.phase, "playing");
    for (const t of s.targets) tapSpotlight(s, ...center(t));
    assert.equal(s.phase, "complete"); assert.equal(rewardTotal("spotdiff", spotlightProgress(s)), 0);
  }
});
test("invalid progress and coordinates cannot create coins or consume time", () => {
  const p = { mode: "challenge", scene: "glasshouse", difficulty: "easy", found: 4, hinted: 0, complete: true };
  for (const changes of [{ found: 99 }, { found: -1 }, { found: 1.5 }, { hinted: -1 }, { hinted: 5 }, { difficulty: "__proto__" }, { difficulty: "unknown" }, { scene: "custom" }, ...[-1,10,1.5,"1",null,NaN].map(challenge => ({ challenge }))]) assert.equal(spotlightRewardTotal({ ...p, ...changes }), 0);
  const s = round(); startSpotlight(s); for (const point of [[NaN, 2], [Infinity, 2], [-1, 2], [50, 101]]) assert.equal(tapSpotlight(s, ...point).type, "ignored");
  tickSpotlight(s, NaN); tickSpotlight(s, -1); assert.equal(s.elapsed, 0); assert.equal(s.mistakes, 0);
});
test("saved choices enforce ownership and reward explanations match the selected level", () => {
  assert.equal(normalizeSpotlightSettings({ scene: "observatory", frame: "walnut" }).scene, "glasshouse");
  const owned = SPOTLIGHT_ITEMS.map(item => item.id), saved = normalizeSpotlightSettings({ scene: "observatory", frame: "walnut", difficulty: "expert" }, owned);
  assert.equal(saved.scene, "observatory"); assert.equal(saved.frame, "walnut"); assert.ok(spotlightUnlocked("scene", "harbor", []));
  assert.match(spotlightCoinGuide({ ...saved, challenge: 6 }, 20), /Expert, challenge 7 of 10.*4 coins per difference.*24 for finishing.*56 for this challenge.*36 still available/);
  assert.match(spotlightCoinGuide({ ...saved, mode: "relaxed" }), /no coins/);
});
test("coin receipts survive reloads, cap replay rewards, and keep levels and scenes separate", async () => {
  const save = storage(), wallet = createArcadeWallet({ storage: save }), key = spotlightRewardKey("glasshouse", "easy");
  assert.equal((await wallet.claim("spotdiff", key, 2)).coins, 2);
  assert.equal((await wallet.claim("spotdiff", key, 8)).coins, 6);
  const reloaded = createArcadeWallet({ storage: save }); assert.equal((await reloaded.claim("spotdiff", key, 8)).coins, 0);
  assert.equal((await reloaded.claim("spotdiff", key, 3)).coins, 0);
  assert.equal((await reloaded.claim("spotdiff", spotlightRewardKey("glasshouse", "expert"), 56)).coins, 56);
  assert.equal((await reloaded.claim("spotdiff", spotlightRewardKey("harbor", "easy"), 8)).coins, 8);
  assert.equal(reloaded.getState().coins, 72);
});
test("earned shared coins unlock a picture collection once, and unlocks survive reloads", async () => {
  const save = storage(), wallet = createArcadeWallet({ storage: save });
  for (const scene of ["glasshouse", "harbor"]) for (const [difficulty, level] of Object.entries(SPOTLIGHT_LEVELS)) await wallet.claim("spotdiff", spotlightRewardKey(scene, difficulty), level.count * level.find + level.bonus);
  assert.equal(wallet.getState().coins, 234);
  const bought = await wallet.purchase("spotlight:scene:observatory"); assert.equal(bought.ok, true); assert.equal(wallet.getState().coins, 114);
  assert.equal((await wallet.purchase("spotlight:scene:observatory")).purchased, false); assert.equal(wallet.getState().coins, 114);
  assert.ok(spotlightUnlocked("scene", "observatory", createArcadeWallet({ storage: save }).getState().owned));
  assert.equal((await wallet.purchase("spotlight:scene:bakery")).ok, false);
});

test("each level has ten genuinely distinct target sets; Medium and Hard share no complete sets", () => {
  const signature = targets => targets.map(t => `${t.source}:${t.x}:${t.y}:${t.w}:${t.h}`).sort().join("|");
  assert.equal(SPOTLIGHT_CHALLENGE_COUNT, 10);
  for (const scene of SPOTLIGHT_SCENES) {
    const sets = {};
    for (const [difficulty, count] of Object.entries({ easy: 4, medium: 6, hard: 6, expert: 8 })) {
      sets[difficulty] = Array.from({ length: 10 }, (_, i) => {
        const targets = spotlightTargets(scene.id, difficulty, i);
        assert.equal(targets.length, count);
        return signature(targets);
      });
      assert.equal(new Set(sets[difficulty]).size, 10);
    }
    assert.ok(sets.medium.every(set => !sets.hard.includes(set)));
  }
});
test("challenge one preserves the old puzzle identities and wallet receipts", () => {
  assert.equal(spotlightRewardKey("glasshouse", "easy", 0), "gallery-1:glasshouse:easy");
  assert.deepEqual(spotlightTargets("glasshouse", "easy", 0).map(t => t.id), ["watering", "flowers", "fruit", "pitcher"]);
  assert.deepEqual(spotlightTargets("glasshouse", "medium", 0).map(t => t.id), ["butterfly", "birdhouse", "book", "teacup", "fruit", "pitcher"]);
  assert.deepEqual(spotlightTargets("glasshouse", "hard", 0).map(t => t.id), ["clock-hand", "lantern-brace", "bird-perch", "apple-leaf", "book-moon", "glove-stripe"]);
  assert.deepEqual(spotlightTargets("glasshouse", "expert", 0).map(t => t.id), ["clock-hand", "lantern-brace", "bird-perch", "apple-leaf", "book-moon", "glove-stripe", "pitcher-diamond", "tile-petal"]);
  for (const invalid of [-1, 10, 1.5, null, "map", "__proto__"]) assert.deepEqual(spotlightTargets("glasshouse", "easy", invalid), spotlightTargets("glasshouse", "easy", 0));
});
test("every scene and level cycles through all ten in shuffled order without boundary repeats", () => {
  const rotation = createSpotlightRotation({ storage: storage(), random: () => .37 });
  for (const scene of SPOTLIGHT_SCENES) for (const level of Object.keys(SPOTLIGHT_LEVELS)) {
    let previous;
    for (let cycle = 0; cycle < 3; cycle++) {
      const seen = [];
      for (let i = 0; i < 10; i++) {
        const challenge = rotation.prepare(scene.id, level);
        assert.notEqual(challenge, previous); seen.push(challenge);
        rotation.start(scene.id, level, challenge); previous = challenge;
      }
      assert.equal(new Set(seen).size, 10);
      assert.notDeepEqual(seen, [0,1,2,3,4,5,6,7,8,9]);
    }
  }
});
test("unstarted puzzles stay reserved across reloads; starting advances the next visit", () => {
  const save = storage();
  const create = () => createSpotlightRotation({ storage: save, random: () => .2 });
  const first = create().prepare("harbor", "hard");
  assert.equal(create().prepare("harbor", "hard"), first);
  create().start("harbor", "hard", (first + 1) % 10);
  assert.equal(create().prepare("harbor", "hard"), first, "stale starts must not skip the reserved puzzle");
  create().start("harbor", "hard", first);
  const second = create().prepare("harbor", "hard");
  assert.notEqual(second, first);
  const played = [first, second];
  for (let i = 2; i < 10; i++) played.push(create().prepare("harbor", "hard", { fresh: true }));
  assert.equal(new Set(played).size, 10);
});
test("skips consume one challenge, while retries and other difficulty/scene decks do not", () => {
  const save = storage(), rotation = createSpotlightRotation({ storage: save, random: () => .4 });
  const first = rotation.prepare("glasshouse", "easy");
  rotation.start("glasshouse", "easy", first);
  const before = JSON.parse(save.getItem(SPOTLIGHT_ROTATION_KEY)).decks["glasshouse:easy"];
  rotation.start("glasshouse", "easy", first); // Retry starts the same round without drawing another puzzle.
  rotation.prepare("glasshouse", "medium"); rotation.prepare("harbor", "easy");
  assert.deepEqual(JSON.parse(save.getItem(SPOTLIGHT_ROTATION_KEY)).decks["glasshouse:easy"], before);
  const second = rotation.prepare("glasshouse", "easy", { fresh: true });
  assert.notEqual(second, first);
  assert.equal(JSON.parse(save.getItem(SPOTLIGHT_ROTATION_KEY)).decks["glasshouse:easy"].bag.length, 8);
});
test("damaged saves are repaired and unavailable storage still permits a complete cycle", () => {
  const save = storage(); save.setItem(SPOTLIGHT_ROTATION_KEY, "not json");
  const repaired = createSpotlightRotation({ storage: save }); repaired.prepare("glasshouse", "easy");
  assert.equal(JSON.parse(save.getItem(SPOTLIGHT_ROTATION_KEY)).version, 1);
  save.setItem(SPOTLIGHT_ROTATION_KEY, JSON.stringify({ version: 1, decks: { "glasshouse:easy": { current: 3, bag: [3,3,20] } } }));
  repaired.prepare("glasshouse", "easy");
  assert.equal(JSON.parse(save.getItem(SPOTLIGHT_ROTATION_KEY)).decks["glasshouse:easy"].bag.length, 9);
  for (const storage of [null, { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } }, { getItem() { return null; }, setItem() { throw Error("full"); } }]) {
    const rotation = createSpotlightRotation({ storage });
    assert.equal(new Set(Array.from({ length: 10 }, () => rotation.prepare("bakery", "expert", { fresh: true }))).size, 10);
  }
});
test("invalid random values stay within the deck and unknown games are rejected", () => {
  for (const sample of [NaN, Infinity, -2, 0, 1, 20]) {
    const rotation = createSpotlightRotation({ storage: null, random: () => sample });
    const all = Array.from({ length: 10 }, () => rotation.prepare("harbor", "easy", { fresh: true }));
    assert.deepEqual(all.slice().sort((a,b) => a-b), [0,1,2,3,4,5,6,7,8,9]);
    assert.throws(() => rotation.prepare("unknown", "easy"), RangeError);
    assert.throws(() => rotation.prepare("harbor", "__proto__"), RangeError);
  }
});
test("each of the ten puzzles has its own coin cap; repeated cycles and reloads do not pay twice", async () => {
  const save = storage(), wallet = createArcadeWallet({ storage: save });
  for (let challenge = 0; challenge < 10; challenge++) {
    const s = round("expert", "harbor", "challenge", challenge); startSpotlight(s);
    const key = spotlightRewardKey(s.scene, s.difficulty, s.challenge);
    hintSpotlight(s);
    for (const t of s.targets.filter(t => !s.found.has(t.id))) tapSpotlight(s, ...center(t));
    assert.equal((await wallet.claim("spotdiff", key, rewardTotal("spotdiff", spotlightProgress(s)))).coins, 52);
    assert.equal((await wallet.claim("spotdiff", key, 56)).coins, 4);
  }
  const reloaded = createArcadeWallet({ storage: save });
  assert.equal(reloaded.getState().coins, 560);
  for (let challenge = 0; challenge < 10; challenge++) assert.equal((await reloaded.claim("spotdiff", spotlightRewardKey("harbor", "expert", challenge), 56)).coins, 0);
});
