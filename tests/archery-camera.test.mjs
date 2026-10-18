import test from "node:test";
import assert from "node:assert/strict";
import { createRangeCamera, firstPersonAim } from "../archery-camera.js";

test("the first-person camera looks down the range from the archer's eye height", () => {
  const camera = createRangeCamera(1100, 620);
  const ahead = camera.project({ x: 20, y: camera.position.y, z: camera.position.z });
  assert.equal(ahead.x, 550);
  assert.equal(ahead.y, camera.horizon);
  assert.ok(camera.project({ x: 20, y: 4, z: 0 }).y < ahead.y);
  assert.ok(camera.project({ x: 20, y: 0, z: 0 }).y > ahead.y);
});

test("target size and spacing diminish with real distance", () => {
  const camera = createRangeCamera(1100, 620);
  const near = camera.project({ x: 20, y: 3, z: 0 });
  const far = camera.project({ x: 70, y: 3, z: 0 });
  assert.ok(near.scale > far.scale * 3);
  const wide = camera.project({ x: 20, y: 3, z: 2 });
  assert.ok(wide.x > near.x);
});

test("focus magnifies the world without moving the camera or changing target distance", () => {
  const wide = createRangeCamera(1100, 620);
  const focused = createRangeCamera(1100, 620, 2);
  const target = { x: 70, y: 3, z: 0 };
  assert.deepEqual(focused.position, wide.position);
  assert.equal(focused.project(target).scale, wide.project(target).scale * 2);
  assert.equal(focused.project(target).depth, wide.project(target).depth);
});

test("the near plane excludes geometry behind the player and avoids infinite projections", () => {
  const camera = createRangeCamera(760, 630);
  assert.equal(camera.project({ x: -2, y: 2, z: 0 }), null);
  assert.equal(camera.project(camera.position), null);
  const nearby = camera.project({ x: 0, y: 2.2, z: 0 });
  assert.ok(Object.values(nearby).every(Number.isFinite));
});

test("first-person dragging starts without a jump and raises the bow when dragging upward", () => {
  assert.equal(firstPersonAim(15, 400, 400, 600), 15);
  assert.equal(firstPersonAim(15, 400, 300, 600), 25);
  assert.equal(firstPersonAim(15, 400, 500, 600), 5);
  assert.equal(firstPersonAim(15, 200, 150, 300), 25);
});

test("first-person dragging respects the same bow limits as the side view", () => {
  assert.equal(firstPersonAim(15, 400, -1000, 600), 65);
  assert.equal(firstPersonAim(15, 400, 2000, 600), 2);
});
