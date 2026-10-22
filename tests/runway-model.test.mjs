import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { buildAircraft } from "../runway-aircraft.js";
const B = createRequire(import.meta.url)("../vendor/babylonjs/babylon.js");

for (const type of ["passenger", "cargo", "bush", "military"]) test(`${type} tires roll forward around fixed axles without steering or sliding`, () => {
  const engine = new B.NullEngine(), scene = new B.Scene(engine);
  try {
    const mat = new B.StandardMaterial("test", scene);
    const model = buildAircraft({ B, scene, material: () => mat }, type, { traffic: true });
    const wheels = model.parts.filter(m => m.name === "tire");
    assert.ok(wheels.length >= 3);
    const initial = wheels.map(w => {
      w.computeWorldMatrix(true);
      return B.Vector3.TransformNormal(B.Axis.Y, w.getWorldMatrix());
    });
    model.update({ phase: "rollout", gear: true, flaps: 1, power: 0, speed: 7 }, 1 / 70);
    wheels.forEach((wheel, index) => {
      const radius = wheel.metadata.radius;
      wheel.computeWorldMatrix(true);
      const axis = B.Vector3.TransformNormal(B.Axis.Y, wheel.getWorldMatrix());
      assert.ok(B.Vector3.Distance(initial[index], axis) < 1e-8, "The axle must not wobble while the tire turns");
      assert.ok(Math.abs(wheel.rotation.y * radius + .1) < 1e-8, "Tire circumference must move the same distance as the aircraft");
      const contact = B.Vector3.TransformNormal(new B.Vector3(-radius, 0, 0), wheel.getWorldMatrix());
      assert.ok(contact.z < 0, "The bottom tread must move backward relative to the plane as the plane rolls forward");
      assert.ok(Math.abs(contact.z + .1) < .005, "Ground contact must not slide backward or forward");
    });
    const angles = wheels.map(w => w.rotation.y);
    for (const [phase, speed, dt] of [["flying", 70, 1], ["ready", 70, 1], ["rollout", 0, 1], ["rollout", 70, 0]]) {
      model.update({ phase, gear: true, flaps: 1, power: 0, speed }, dt);
      assert.deepEqual(wheels.map(w => w.rotation.y), angles, "Airborne, stopped, and paused wheels stay still");
    }
  } finally { engine.dispose(); }
});
