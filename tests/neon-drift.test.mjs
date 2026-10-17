import test from "node:test";
import assert from "node:assert/strict";
import {
  ROAD, ROUTES, DIFFICULTIES, normalizeSettings, getPace,
  getRoadGeometry, getVisibility, createDriveModel,
} from "../neon-drift-engine.js";

function drive(overrides = {}) {
  let seed = 7321;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const model = createDriveModel({ ...normalizeSettings(), length: "endless", ...overrides }, random);
  model.start();
  model.state.traffic = [];
  model.state.spawnTimer = 10000;
  return model;
}

function advance(model, seconds) {
  for (let t = 0; t < seconds; t += 1 / 60) model.step(Math.min(1 / 60, seconds - t));
}

function inLane(model, depth = 9, kind = "sedan") {
  return { id: 999, row: 999, lane: model.state.lane, visualLane: model.state.visualLane,
    z: depth, previousZ: depth, kind, color: 1, cruise: 0, indicator: 0, mergeWait: 0, wantsMerge: false };
}

test("missing or invalid saved settings fall back to a playable configuration", () => {
  const defaults = normalizeSettings();
  assert.deepEqual(normalizeSettings(null), defaults);
  assert.deepEqual(normalizeSettings({ route: "constructor", car: "toString", length: "missing", difficulty: "expert" }), { ...defaults, difficulty: "expert" });
});

test("difficulty presets start at successively faster speeds and denser traffic", () => {
  let previous = null;
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const pace = getPace(normalizeSettings({ difficulty }), 0);
    if (previous) {
      assert.ok(pace.cruise > previous.cruise);
      assert.ok(pace.spawnInterval < previous.spawnInterval);
      assert.ok(pace.doubleChance > previous.doubleChance);
    }
    previous = pace;
  }
});

test("driving farther increases pace and traffic without unbounded speeds", () => {
  const settings = normalizeSettings({ difficulty: "easy" });
  const start = getPace(settings, 0);
  const later = getPace(settings, 2400);
  const endless = getPace(settings, 1000000);
  assert.ok(later.cruise > start.cruise);
  assert.ok(later.spawnInterval < start.spawnInterval);
  assert.ok(later.doubleChance > start.doubleChance);
  assert.ok(endless.cruise < 80);
  assert.ok(endless.spawnInterval >= 0.52);
});

test("country roads curve and rise, while nearby player coordinates stay stable", () => {
  const country = normalizeSettings({ route: "country" });
  const highway = normalizeSettings({ route: "expressway" });
  const straight = getRoadGeometry(highway, 250, 100);
  assert.ok(straight.offset === 0 && straight.elevation === 0);
  for (const distance of [0, 100, 300, 800]) {
    assert.deepEqual(getRoadGeometry(country, distance, ROAD.playerDepth), { offset: 0, elevation: 0 });
  }
  const samples = [0, 100, 200, 400].map((distance) => getRoadGeometry(country, distance, 100));
  assert.ok(samples.some((sample) => sample.offset > 2));
  assert.ok(samples.some((sample) => sample.offset < -2));
  assert.ok(samples.some((sample) => sample.elevation > 0.5));
  assert.ok(samples.some((sample) => sample.elevation < -0.5));
  assert.ok(getVisibility(country, 150) < getVisibility(highway, 150));
  assert.ok(getVisibility(country, 150, true) > getVisibility(country, 150));
});

test("spawned rows always leave a lane open and endless traffic remains bounded", () => {
  for (const route of Object.keys(ROUTES)) {
    const model = drive({ route, difficulty: "expert" });
    model.state.spawnTimer = 0;
    model.state.invulnerable = 10000;
    const types = new Set();
    for (let frame = 0; frame < 12000; frame += 1) {
      model.step(1 / 60);
      const rows = new Map();
      for (const vehicle of model.state.traffic) {
        types.add(vehicle.kind);
        rows.set(vehicle.row, (rows.get(vehicle.row) || 0) + 1);
        assert.ok(vehicle.lane >= 0 && vehicle.lane < ROUTES[route].lanes);
        assert.ok(Number.isFinite(vehicle.z));
      }
      for (const count of rows.values()) assert.ok(count < ROUTES[route].lanes);
      assert.ok(model.state.traffic.length < 90);
    }
    assert.equal(model.state.phase, "running");
    assert.ok(types.size >= 4);
  }
});

test("collision detection catches a car crossed between animation frames", () => {
  const model = drive({ difficulty: "expert" });
  model.state.speed = 90;
  model.state.traffic = [inLane(model, 13)];
  const events = model.step(0.12);
  assert.equal(model.state.phase, "crashed");
  assert.ok(events.some((event) => event.type === "crash"));
  assert.equal(model.state.best, model.state.distance);
});

test("shield absorbs one impact and supplies the struck vehicle for its ejection animation", () => {
  const model = drive({ car: "sentinel" });
  assert.equal(model.activateAbility(), true);
  assert.equal(model.activateAbility(), false);
  model.state.traffic = [inLane(model)];
  const events = model.step(0.1);
  const shield = events.find((event) => event.type === "shield");
  assert.ok(shield);
  assert.equal(shield.vehicle.kind, "sedan");
  assert.equal(model.state.phase, "running");
  assert.equal(model.state.traffic.length, 0);
  assert.equal(model.state.abilityRemaining, 0);
  advance(model, 1.5);
  model.state.traffic = [inLane(model)];
  model.step(0.1);
  assert.equal(model.state.phase, "crashed");
});

test("ghost phase passes through traffic, expires, and cannot bypass its recharge", () => {
  const model = drive({ car: "phantom" });
  model.activateAbility();
  model.state.traffic = [inLane(model)];
  model.step(0.1);
  assert.equal(model.state.phase, "running");
  model.state.traffic = [];
  advance(model, 3.1);
  assert.equal(model.active("phase"), false);
  assert.equal(model.activateAbility(), false);
  model.state.traffic = [inLane(model)];
  model.step(0.1);
  assert.equal(model.state.phase, "crashed");
});

test("nitro raises actual speed and rally focus slows closing traffic", () => {
  const regular = drive({ car: "comet" });
  const nitro = drive({ car: "comet" });
  nitro.activateAbility();
  advance(regular, 1);
  advance(nitro, 1);
  assert.ok(nitro.state.speed > regular.state.speed + 10);
  const normal = drive({ car: "rally" });
  const focused = drive({ car: "rally" });
  normal.state.traffic = [inLane(normal, 60)];
  focused.state.traffic = [inLane(focused, 60)];
  focused.activateAbility();
  advance(normal, 1);
  advance(focused, 1);
  assert.ok(focused.state.traffic[0].z > normal.state.traffic[0].z + 5);
});

test("rain affects steering and crosswinds physically move the car", () => {
  const dry = drive({ route: "expressway" });
  const wet = drive({ route: "rainway" });
  dry.changeLane(-1); wet.changeLane(-1);
  dry.step(0.1); wet.step(0.1);
  assert.ok(wet.state.visualLane > dry.state.visualLane);
  const windy = drive({ route: "canyon" });
  windy.state.distance = 95;
  advance(windy, 0.4);
  assert.ok(Math.abs(windy.state.wind) > 0.02);
  assert.notEqual(windy.state.visualLane, windy.state.lane);
});

test("finite drives finish at the exact chosen distance and endless drives continue", () => {
  const sprint = drive({ length: "sprint" });
  sprint.state.distance = 999;
  sprint.step(0.12);
  assert.equal(sprint.state.phase, "finished");
  assert.equal(sprint.state.distance, 1000);
  const endless = drive({ length: "endless" });
  endless.state.distance = 9000;
  endless.step(0.12);
  assert.equal(endless.state.phase, "running");
  assert.ok(endless.state.distance > 9000);
});
