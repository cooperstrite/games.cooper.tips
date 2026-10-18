import test from "node:test";
import assert from "node:assert/strict";
import { createFlappyModel, DIFFICULTIES, WORLD, circleHitsRect, hitsPipe, speedFor } from "../flappy-engine.js";
import { readFlappySettings, PALETTES, COLOR_FIELDS } from "../flappy-appearance.js";
import { flappyCamera, clipFlappyFace } from "../flappy-renderer.js";
import { SHOP_ITEMS, flightReward, readFlappyWallet, canEquip, buyFlappyItem, bankFlappyReward } from "../flappy-shop.js";

const modelFor = (id = "easy") => createFlappyModel(id, () => 0.5);
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be close to ${expected}`);
function seededRandom(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function flyCourse(model, points) {
  model.flap();
  for (let frame = 0; frame < 120 * 300 && model.state.score < points && model.state.phase === "playing"; frame++) {
    const s = model.state, target = s.pipes.find(pipe => !pipe.passed).center - 0.12;
    if (s.y < target - 0.12 && (s.vy < -0.15 || s.y < target - 0.55)) model.flap();
    model.advance(1 / 120);
  }
  assert.equal(model.state.phase, "playing", `Flight ended at score ${model.state.score}`);
  assert.equal(model.state.score, points);
}

test("ready flights wait for a gesture without falling, moving, or scoring", () => {
  const model = modelFor(), before = structuredClone(model.state);
  model.advance(9);
  assert.equal(model.state.phase, "ready");
  assert.equal(model.state.y, before.y);
  assert.equal(model.state.distance, 0);
  assert.equal(model.state.score, 0);
  assert.deepEqual(model.state.pipes, before.pipes);
});

test("one flap starts the flight, rises, and then falls under gravity", () => {
  const model = modelFor(), start = model.state.y;
  assert.equal(model.flap(), true);
  assert.equal(model.state.phase, "playing");
  model.advance(0.2);
  const peakApproach = model.state.y;
  assert.ok(peakApproach > start);
  assert.ok(model.state.vy > 0);
  model.advance(0.5);
  assert.ok(model.state.y < peakApproach);
  assert.ok(model.state.vy < 0);
  assert.equal(model.state.flaps, 1);
});

test("pausing freezes the whole model and rejects flaps until resumed", () => {
  const model = modelFor(); model.flap(); model.advance(0.2);
  assert.equal(model.togglePause(), true);
  const before = structuredClone(model.state);
  assert.equal(model.flap(), false);
  model.advance(5);
  assert.deepEqual(model.state, before);
  assert.equal(model.togglePause(), false);
  model.advance(0.1);
  assert.ok(model.state.distance > before.distance);
});

test("ground impacts end the flight and freeze progress through the crash animation", () => {
  const model = modelFor(); model.flap(); model.advance(2);
  assert.equal(model.state.phase, "gameover");
  assert.equal(model.state.crashReason, "ground");
  assert.equal(model.state.y, WORLD.radius);
  const { distance, score } = model.state;
  assert.equal(model.flap(), false);
  model.advance(2);
  assert.equal(model.state.distance, distance);
  assert.equal(model.state.score, score);
  assert.ok(model.state.crashAge > 2);
});

test("the ceiling contains the bird while allowing the flight to continue", () => {
  const model = modelFor(); model.flap();
  model.state.y = WORLD.height - WORLD.radius - 0.01;
  model.advance(0.1);
  assert.equal(model.state.phase, "playing");
  assert.ok(model.state.y <= WORLD.height - WORLD.radius);
  assert.ok(model.state.vy <= 0);
});

test("both pipe halves collide while the gap stays clear", () => {
  const pipe = { x: 5, center: 3.6, gap: 2.5 };
  assert.equal(hitsPipe(5, 3.6, pipe), false);
  assert.equal(hitsPipe(5, 2.3, pipe), true);
  assert.equal(hitsPipe(5, 4.9, pipe), true);
  assert.equal(hitsPipe(2, 1, pipe), false);
});

test("circular hit detection allows a rounded corner to pass without a false hit", () => {
  const rect = { x: 0, y: 0, width: 1, height: 1 };
  assert.equal(circleHitsRect(-0.18, -0.18, 0.22, rect), false);
  assert.equal(circleHitsRect(-0.1, -0.1, 0.22, rect), true);
  assert.equal(circleHitsRect(-0.22, 0.5, 0.22, rect), false);
});

test("an approaching pipe causes an actual flight collision", () => {
  const model = modelFor(); model.flap();
  const pipe = model.state.pipes[0];
  model.state.distance = pipe.x - 0.9;
  model.state.y = pipe.center - pipe.gap / 2 - 0.3;
  model.state.vy = 0;
  model.advance(0.1);
  assert.equal(model.state.phase, "gameover");
  assert.equal(model.state.crashReason, "pipe");
  assert.equal(model.state.score, 0);
});

test("a pipe scores exactly once only after the whole bird clears it", () => {
  const model = modelFor(); model.flap();
  const pipe = model.state.pipes[0];
  Object.assign(model.state, { distance: pipe.x + WORLD.pipeWidth / 2, y: pipe.center, vy: 0 });
  model.advance(0.03);
  assert.equal(model.state.score, 0);
  model.advance(0.07);
  assert.equal(model.state.score, 1);
  assert.equal(pipe.passed, true);
  model.advance(0.1);
  assert.equal(model.state.score, 1);
});

test("all four difficulties can be played through changing gaps and recycled pipes", () => {
  for (const id of Object.keys(DIFFICULTIES)) {
    const model = createFlappyModel(id, seededRandom(87));
    flyCourse(model, 35);
    assert.equal(model.state.pipes.length, 7);
    assert.ok(model.state.pipes[0].id > 1);
    assert.equal(new Set(model.state.pipes.map(pipe => pipe.id)).size, 7);
    for (let i = 0; i < model.state.pipes.length; i++) {
      const pipe = model.state.pipes[i];
      assert.equal(pipe.gap, DIFFICULTIES[id].gap);
      assert.ok(pipe.center - pipe.gap / 2 >= 0.54);
      assert.ok(pipe.center + pipe.gap / 2 <= WORLD.height - 0.54);
      if (i) near(pipe.x - model.state.pipes[i - 1].x, DIFFICULTIES[id].spacing);
    }
  }
});

test("harder difficulties have faster speed and smaller gaps", () => {
  const levels = Object.values(DIFFICULTIES);
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i].speed > levels[i - 1].speed);
    assert.ok(levels[i].gap < levels[i - 1].gap);
    assert.ok(levels[i].gravity > levels[i - 1].gravity);
  }
  const model = modelFor(); const initial = speedFor(model.state);
  model.state.score = 10; assert.ok(speedFor(model.state) > initial);
  model.state.score = 10000; assert.equal(speedFor(model.state), initial + 0.85);
});

test("Easy preserves the original gentle flight settings", () => {
  assert.deepEqual(DIFFICULTIES.easy, { name: "Easy", note: "Wide gaps, a gentle pace", speed: 2.8, gap: 3.15, spacing: 5.4, gravity: 8.2, flap: 3.15 });
});

test("harder modes change vertical level every time and remain flyable across varied courses", () => {
  for (const id of ["medium", "hard", "expert"]) {
    for (let seed = 1; seed <= 24; seed++) {
      const model = createFlappyModel(id, seededRandom(seed));
      const initial = model.state.pipes;
      for (let i = 1; i < initial.length; i++) {
        assert.ok(Math.abs(initial[i].center - initial[i - 1].center) > 0.3);
        assert.ok(Math.abs(initial[i].center - initial[i - 1].center) <= DIFFICULTIES[id].maxShift);
        assert.ok(DIFFICULTIES[id].levels.includes(initial[i].center));
      }
      flyCourse(model, 50);
    }
  }
});

test("reset clears a paused flight and starts the selected difficulty", () => {
  const model = modelFor(); model.flap(); model.advance(0.2); model.togglePause();
  model.reset("expert");
  assert.equal(model.state.difficultyId, "expert");
  assert.equal(model.state.phase, "ready");
  assert.equal(model.state.distance, 0);
  assert.equal(model.state.score, 0);
  assert.equal(model.state.flaps, 0);
  assert.equal(model.state.paused, false);
  assert.equal(model.state.pipes[0].id, 1);
});

test("invalid difficulties and time values are safe", () => {
  for (const id of ["__proto__", null, ["easy"], {}, 2]) assert.equal(modelFor(id).state.difficultyId, "easy");
  const model = modelFor(), before = structuredClone(model.state);
  for (const dt of [NaN, Infinity, -1, 0]) model.advance(dt);
  assert.deepEqual(model.state, before);
});

test("fixed simulation steps produce consistent motion across frame lengths", () => {
  const batched = modelFor(), individual = modelFor(); batched.flap(); individual.flap();
  batched.advance(0.5);
  for (let i = 0; i < 60; i++) individual.advance(1 / 120);
  near(batched.state.y, individual.state.y);
  near(batched.state.vy, individual.state.vy);
  near(batched.state.distance, individual.state.distance);
});

test("settings reject broken storage, unknown choices, and non-hex colors", () => {
  for (const saved of [null, false, [], 7]) assert.equal(readFlappySettings(saved).bird, "sparrow");
  const settings = readFlappySettings({ bird: "__proto__", pipeStyle: "missing", view: "fake", colors: { body: "red", wing: "#123456", beak: "#ABCDEF" }, guide: false });
  assert.equal(settings.bird, "sparrow");
  assert.equal(settings.pipeStyle, "classic");
  assert.equal(settings.view, "side");
  assert.equal(settings.colors.body, PALETTES.sunshine.body);
  assert.equal(settings.colors.wing, "#123456");
  assert.equal(settings.colors.beak, "#abcdef");
  assert.equal(settings.guide, false);
});

test("character and accessory changes retain all independent color choices", () => {
  const settings = readFlappySettings({ hat: "wizard", eyewear: "goggles", neckwear: "scarf", colors: PALETTES.berry });
  const dragon = readFlappySettings({ ...settings, bird: "dragon" });
  assert.deepEqual(dragon.colors, settings.colors);
  assert.equal(dragon.hat, "wizard");
  assert.equal(dragon.eyewear, "goggles");
  assert.equal(dragon.neckwear, "scarf");
  assert.equal(Object.keys(dragon.colors).length, Object.keys(COLOR_FIELDS).length);
});

test("first-person projection looks forward at the bird's altitude", () => {
  const camera = flappyCamera(1000, 600, 10, 3);
  const center = camera.project({ x: 20, y: 3, z: 0 });
  assert.equal(center.x, 500);
  assert.equal(center.y, 276);
  assert.ok(camera.project({ x: 20, y: 4, z: 0 }).y < center.y);
  assert.ok(camera.project({ x: 20, y: 2, z: 1 }).x > center.x);
  assert.ok(flappyCamera(1000, 600, 10, 4).project({ x: 20, y: 3, z: 0 }).y > center.y);
});

test("approaching pipes grow in perspective", () => {
  const target = { x: 20, y: 4, z: 2 }, far = flappyCamera(1000, 600, 0, 3).project(target), nearPipe = flappyCamera(1000, 600, 10, 3).project(target);
  near(nearPipe.x - 500, (far.x - 500) * 2);
  near(276 - nearPipe.y, (276 - far.y) * 2);
});

test("3D near-plane clipping removes passed geometry and keeps crossing faces finite", () => {
  const camera = flappyCamera(1000, 600, 10, 3);
  const face = [{ x: 9, y: 0, z: -2 }, { x: 12, y: 0, z: -2 }, { x: 12, y: 4, z: 2 }, { x: 9, y: 4, z: 2 }];
  const clipped = clipFlappyFace(face, camera.near);
  assert.equal(clipped.length, 4);
  assert.ok(clipped.every(p => p.x >= camera.near));
  assert.ok(clipped.map(camera.project).every(p => Object.values(p).every(Number.isFinite)));
  assert.deepEqual(clipFlappyFace(face.map(p => ({ ...p, x: 8 })), camera.near), []);
});

test("flight awards increase at pipe milestones and reward harder difficulties", () => {
  const examples = [[0, "First flight", 0], [1, "Sky coin", 1], [4, "Sky coin", 4], [5, "Bronze wings", 10], [14, "Bronze wings", 19], [15, "Silver wings", 30], [30, "Golden wings", 65], [60, "Diamond wings", 150]];
  for (const [pipes, name, coins] of examples) { const reward = flightReward(pipes); assert.equal(reward.name, name); assert.equal(reward.coins, coins); }
  assert.equal(flightReward(5, "medium").coins, 15);
  assert.equal(flightReward(5, "hard").coins, 20);
  assert.equal(flightReward(5, "expert").coins, 25);
  assert.equal(flightReward(0, "expert").coins, 0);
  assert.equal(flightReward(5, "__proto__").coins, 10);
  assert.equal(flightReward(-5).coins, 0);
});

test("saved wallets sanitize balances and only retain real, unique shop purchases", () => {
  assert.deepEqual(readFlappyWallet(null), { coins: 0, earned: 0, owned: [] });
  const wallet = readFlappyWallet({ coins: -1, earned: Infinity, owned: ["flower-crown", "missing", "flower-crown", "golden-pipes"] });
  assert.equal(wallet.coins, 0); assert.equal(wallet.earned, 0);
  assert.deepEqual(wallet.owned, ["flower-crown", "golden-pipes"]);
  assert.equal(readFlappyWallet({ coins: 1.5 }).coins, 0);
});

test("shop purchases spend coins once, permanently unlock, and reject insufficient funds", () => {
  const item = SHOP_ITEMS[0], wallet = readFlappyWallet();
  assert.equal(canEquip(wallet, item.setting, item.value), false);
  assert.equal(canEquip(wallet, "bird", "dragon"), true);
  assert.equal(buyFlappyItem(wallet, item.id).ok, false);
  assert.equal(wallet.coins, 0);
  bankFlappyReward(wallet, flightReward(15));
  assert.equal(wallet.coins, 30);
  const purchase = buyFlappyItem(wallet, item.id);
  assert.equal(purchase.ok, true); assert.equal(purchase.purchased, true);
  assert.equal(wallet.coins, 30 - item.cost);
  assert.equal(canEquip(wallet, item.setting, item.value), true);
  assert.equal(buyFlappyItem(wallet, item.id).purchased, false);
  assert.equal(wallet.coins, 30 - item.cost);
  assert.equal(buyFlappyItem(wallet, "missing").ok, false);
  assert.deepEqual(readFlappyWallet(wallet), wallet);
});

test("all shop items have unique identifiers, a supported look, and positive integer prices", () => {
  assert.equal(new Set(SHOP_ITEMS.map(item => item.id)).size, SHOP_ITEMS.length);
  for (const item of SHOP_ITEMS) {
    assert.ok(Number.isInteger(item.cost) && item.cost > 0);
    assert.equal(readFlappySettings({ [item.setting]: item.value })[item.setting], item.value);
  }
});
