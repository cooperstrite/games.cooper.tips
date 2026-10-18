import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS, QUIVER, getWind, getTarget, scoreOffset, starsForScore, startingAngle, predictFlight, createArcheryModel } from "../archery-engine.js";

function finishShot(model) {
  for (let frame = 0; frame < 600 && model.state.phase === "flying"; frame++) model.advance(1 / 60);
  assert.notEqual(model.state.phase, "flying", "A shot must resolve within ten seconds");
  return model.state.impact;
}

test("a fresh game has a playable default level and an accurate first shot", () => {
  const model = createArcheryModel("not-a-level");
  assert.equal(model.state.level.id, LEVELS[0].id);
  assert.equal(model.state.arrowsLeft, QUIVER);
  assert.equal(model.shoot(), true);
  const shot = finishShot(model);
  assert.equal(shot.points, 10);
  assert.ok(Math.abs(shot.offset) < 0.05);
  assert.equal(model.state.arrowsLeft, 5);
});

test("scoring follows the ten rings, including inner scoring lines and misses", () => {
  assert.equal(scoreOffset(0, 1), 10);
  assert.equal(scoreOffset(0.1, 1), 10);
  assert.equal(scoreOffset(0.11, 1), 9);
  assert.equal(scoreOffset(-0.35, 1), 7);
  assert.equal(scoreOffset(0.95, 1), 1);
  assert.equal(scoreOffset(1, 1), 1);
  assert.equal(scoreOffset(1.001, 1), 0);
});

test("a weak, low shot lands short without scoring on the target", () => {
  const model = createArcheryModel();
  model.setAim(2, 25);
  model.shoot();
  const shot = finishShot(model);
  assert.equal(shot.reason, "short");
  assert.equal(shot.points, 0);
  assert.ok(shot.x < model.state.level.distance);
  assert.equal(shot.y, 0);
});

test("power changes range and wind changes the arrow's travel time and height", () => {
  const level = { ...LEVELS[1], shotWinds: null };
  const weak = predictFlight(level, 10, 25, 0);
  const strong = predictFlight(level, 10, 90, 0);
  assert.ok(strong.points.at(-1).x > weak.points.at(-1).x);
  const tailwind = predictFlight({ ...level, wind: 4 }, 12, 70, 0).crossing;
  const headwind = predictFlight({ ...level, wind: -4 }, 12, 70, 0).crossing;
  assert.ok(tailwind.time < headwind.time);
  assert.ok(tailwind.y > headwind.y);
});

test("gusts continue to influence the arrow after it has been released", () => {
  const changing = createArcheryModel("gusty-gorge");
  const calm = createArcheryModel("gusty-gorge");
  calm.state.level = { ...calm.state.level, gust: 0 };
  changing.setAim(18, 80); calm.setAim(18, 80);
  changing.shoot(); calm.shoot();
  const gustShot = finishShot(changing);
  const calmShot = finishShot(calm);
  assert.ok(Math.abs(gustShot.offset - calmShot.offset) > 0.1);
  const level = LEVELS[3];
  assert.ok(getWind(level, level.windPeriod / 4) > 0);
  assert.ok(getWind(level, level.windPeriod * 3 / 4) < 0);
});

test("moving targets are scored where they are at impact, with continuous collision detection", () => {
  const model = createArcheryModel("lantern-lift");
  model.shoot();
  const shot = finishShot(model);
  const target = getTarget(model.state.level, shot.time);
  assert.ok(Math.abs(shot.targetY - target.y) < 0.03);
  assert.ok(Math.abs(shot.targetY - model.state.level.height) > 0.3);
  assert.equal(shot.points, scoreOffset(shot.y - shot.targetY, target.radius));
  const fast = createArcheryModel();
  fast.shoot();
  Object.assign(fast.state.arrow, { x: 19, y: 2.8, vx: 1000, vy: 0 });
  fast.advance(1 / 60);
  assert.equal(fast.state.shots.length, 1);
  assert.equal(fast.state.impact.points, 10);
});

test("the finale varies distance and height while the longshot level reaches seventy meters", () => {
  const finale = LEVELS.at(-1);
  const positions = [0, 1, 2, 3, 4].map(time => getTarget(finale, time));
  assert.ok(new Set(positions.map(point => point.x)).size > 3);
  assert.ok(new Set(positions.map(point => point.y)).size > 3);
  positions.forEach(point => assert.ok(point.x >= 54 && point.x <= 66));
  assert.equal(getTarget(LEVELS[4], 10).x, 70);
});

test("the distance-only trail moves after every arrow, including misses, without adjusting the bow", () => {
  const model = createArcheryModel("longshot-lake");
  model.setAim(2, 25);
  const distances = [];
  for (let index = 0; index < QUIVER; index++) {
    const distance = getTarget(model.state.level, model.state.time, model.state.shots.length).x;
    distances.push(distance);
    assert.equal(getWind(model.state.level, model.state.time, index), 0);
    assert.equal(getTarget(model.state.level, model.state.time + 20, index).x, distance);
    model.shoot(); model.advance(0.1);
    assert.equal(getTarget(model.state.level, model.state.time, model.state.shots.length).x, distance);
    const shot = finishShot(model);
    assert.equal(shot.points, 0);
    assert.equal(model.state.angle, 2);
    assert.equal(model.state.power, 25);
  }
  assert.equal(new Set(distances).size, QUIVER);
  assert.ok(Math.min(...distances) >= 35 && Math.max(...distances) <= 70);
  assert.equal(getTarget(model.state.level, model.state.time, QUIVER).x, distances.at(-1));
});

test("Meadow Breeze changes wind between arrows and holds it steady throughout each shot", () => {
  const model = createArcheryModel("meadow-breeze");
  model.setAim(2, 25);
  const winds = [];
  for (let index = 0; index < QUIVER; index++) {
    const wind = getWind(model.state.level, model.state.time, model.state.shots.length);
    winds.push(wind);
    assert.equal(getWind(model.state.level, model.state.time + 20, index), wind);
    model.shoot(); model.advance(0.2);
    assert.equal(getWind(model.state.level, model.state.time, model.state.shots.length), wind);
    const shot = finishShot(model);
    assert.equal(shot.wind, wind);
    assert.equal(model.state.angle, 2);
    assert.equal(model.state.power, 25);
  }
  assert.equal(new Set(winds).size, QUIVER);
  assert.ok(winds.some(wind => wind > 0) && winds.some(wind => wind < 0));
  assert.equal(getWind(model.state.level, model.state.time, QUIVER), winds.at(-1));
});

test("the guide and collision use the new distance, and recalibration can hit the next bullseye", () => {
  const model = createArcheryModel("longshot-lake");
  const firstAngle = model.state.angle;
  model.shoot();
  assert.equal(finishShot(model).points, 10);
  const target = getTarget(model.state.level, model.state.time, model.state.shots.length);
  assert.notEqual(target.x, 70);
  assert.equal(model.state.angle, firstAngle);
  const unchanged = predictFlight(model.state.level, model.state.angle, model.state.power, model.state.time, model.state.shots.length);
  assert.equal(unchanged.crossing.x, target.x);
  assert.equal(scoreOffset(unchanged.crossing.y - target.y, target.radius), 0);
  model.setAim(startingAngle({ ...model.state.level, distance: target.x }, model.state.power), model.state.power);
  model.shoot();
  const second = finishShot(model);
  assert.equal(second.targetX, target.x);
  assert.equal(second.points, 10);
});

test("pause freezes the target, wind time, and arrow without consuming extra arrows", () => {
  const model = createArcheryModel("aurora-finale");
  model.shoot(); model.advance(0.2); model.togglePause();
  const frozen = structuredClone(model.state);
  model.advance(2);
  assert.deepEqual(model.state, frozen);
  assert.equal(model.shoot(), false);
  model.togglePause(); model.advance(0.2);
  assert.ok(model.state.time > frozen.time);
  assert.notEqual(model.state.arrow.x, frozen.arrow.x);
});

test("one quiver contains exactly six shots and can earn three stars", () => {
  const model = createArcheryModel();
  for (let arrow = 0; arrow < QUIVER; arrow++) {
    assert.equal(model.shoot(), true);
    assert.equal(model.shoot(), false);
    finishShot(model);
  }
  assert.equal(model.state.phase, "complete");
  assert.equal(model.state.arrowsLeft, 0);
  assert.equal(model.state.score, 60);
  assert.equal(starsForScore(model.state.level, model.state.score), 3);
  assert.equal(starsForScore(model.state.level, 0), 0);
  assert.equal(starsForScore(model.state.level, model.state.level.goal), 1);
  assert.equal(model.shoot(), false);
});

test("resetting in flight clears the old shot and starts the selected level cleanly", () => {
  const model = createArcheryModel();
  model.shoot(); model.advance(0.1); model.togglePause();
  model.reset("longshot-lake");
  assert.equal(model.state.level.distance, 70);
  assert.equal(model.state.arrow, null);
  assert.equal(model.state.impact, null);
  assert.equal(model.state.paused, false);
  assert.equal(model.state.time, 0);
  assert.equal(model.state.arrowsLeft, QUIVER);
  assert.equal(model.state.shots.length, 0);
  model.setAim(-100, 200);
  assert.equal(model.state.angle, 2);
  assert.equal(model.state.power, 100);
  model.setAim(NaN, NaN);
  assert.equal(model.state.power, 100);
});

test("physics is independent of frame batching and arrow cosmetics", () => {
  const first = createArcheryModel("longshot-lake");
  const second = createArcheryModel("longshot-lake");
  first.shoot(); second.shoot();
  first.state.arrow.gear = { design: "ranger", color: "#8be7ba" };
  second.state.arrow.gear = { design: "aurora", color: "#fa9e88" };
  first.advance(1);
  for (let frame = 0; frame < 60; frame++) second.advance(1 / 60);
  assert.ok(Math.abs(first.state.arrow.x - second.state.arrow.x) < 1e-8);
  assert.ok(Math.abs(first.state.arrow.y - second.state.arrow.y) < 1e-8);
  const firstShot = finishShot(first);
  const secondShot = finishShot(second);
  assert.equal(firstShot.points, secondShot.points);
  assert.ok(Math.abs(firstShot.offset - secondShot.offset) < 1e-8);
  assert.equal(secondShot.gear.design, "aurora");
});
