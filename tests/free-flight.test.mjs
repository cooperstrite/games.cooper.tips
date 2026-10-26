import test from "node:test";
import assert from "node:assert/strict";
import { AIRCRAFT } from "../runway-engine.js";
import { HOME_AIRFIELDS, airfieldsNear, sectorAirfield, fieldPosition, fieldCoordinates, terrainHeight, surfaceAt, headingDifference } from "../free-flight-world.js";
import { createFreeFlight, beginFreeFlight, advanceFreeFlight, assessFreeTouchdown, freeFlightInstruments, flightAngle } from "../free-flight-engine.js";

function fly(s, seconds, controls = {}) { for (let i = 0; i < Math.round(seconds * 120); i++) advanceFreeFlight(s, typeof controls === "function" ? controls(s) : controls, 1 / 120); return s; }
function landing(aircraft, reverse = false) {
  const s = createFreeFlight({ aircraft, weather: "calm" }), f = HOME_AIRFIELDS[0], p = fieldPosition(f, 0, (reverse ? 1 : -1) * (f.length / 2 - 230));
  Object.assign(s, { phase: "flying", x: p.x, z: p.z, y: f.elevation + .03, heading: reverse ? 180 : 0, speed: s.aircraft.target, verticalSpeed: -.9, flaps: 2, gear: true, pitch: s.aircraft.aoa + .3, throttle: s.aircraft.trim, power: s.aircraft.trim });
  return s;
}

test("the free-flight world has stable, level, bidirectional airfields", () => {
  for (const f of HOME_AIRFIELDS) for (const along of [-f.length / 2 + 5, 0, f.length / 2 - 5]) for (const across of [-f.width / 2 + 2, 0, f.width / 2 - 2]) {
    const point = fieldPosition(f, across, along), local = fieldCoordinates(f, point.x, point.z), surface = surfaceAt(point.x, point.z);
    assert.ok(Math.abs(local.across - across) < 1e-8); assert.ok(Math.abs(local.along - along) < 1e-8);
    assert.equal(terrainHeight(point.x, point.z), f.elevation); assert.equal(surface.height, f.elevation); assert.equal(surface.field.id, f.id);
  }
});

test("new terrain and usable airfields continue far beyond the six starting locations", () => {
  for (const [x, z] of [[500000, -200000], [-740000, 330000], [10000000, 2500000]]) {
    const first = airfieldsNear(x, z), again = airfieldsNear(x, z);
    assert.ok(first.length > 0); assert.deepEqual(first, again);
    for (const f of first) { assert.equal(surfaceAt(f.x, f.z).field.id, f.id); assert.ok(f.length >= 1100); }
    assert.ok(Number.isFinite(terrainHeight(x, z)));
  }
  const first = sectorAirfield(50, 42);
  for (let i = 0; i < 300; i++) sectorAirfield(i, 100);
  assert.deepEqual(sectorAirfield(50, 42), first, "Evicting terrain cache entries cannot change a revisited airport");
  const edge = 4000, a = terrainHeight(edge - .001, -1800), b = terrainHeight(edge + .001, -1800);
  assert.ok(Math.abs(a - b) < .01, "Terrain stays continuous across rendering chunks");
});

test("every aircraft starts safely at every location, airborne or on the runway", () => {
  for (const aircraft of Object.keys(AIRCRAFT)) for (const location of HOME_AIRFIELDS) for (const departure of ["airborne", "runway"]) {
    const s = createFreeFlight({ aircraft, location: location.id, departure });
    assert.equal(s.aircraft, AIRCRAFT[aircraft]); assert.equal(s.phase, "ready");
    const before = { ...s }; advanceFreeFlight(s, { pitch: 1, throttle: 1 }, 1); assert.deepEqual(s, before);
    assert.equal(beginFreeFlight(s), true); assert.equal(beginFreeFlight(s), false);
    assert.equal(s.phase, departure === "runway" ? "parked" : "flying");
    assert.ok(departure === "runway" ? surfaceAt(s.x, s.z).field.id === location.id : freeFlightInstruments(s).heightFeet > 1500);
  }
});

for (const type of Object.keys(AIRCRAFT)) test(type + " can land, stop, and take off again without ending the game", () => {
  const s = landing(type); fly(s, .15);
  assert.equal(s.phase, "rollout", s.result?.reason); assert.equal(s.landings, 1); assert.ok(s.events.some(e => e.type === "touchdown"));
  fly(s, 45, { brake: true }); assert.equal(s.phase, "parked", s.result?.reason); assert.equal(s.result, null); assert.equal(s.speed, 0);
  s.flaps = 1; s.throttle = 1;
  for (let i = 0; i < 10000 && !["flying", "crashed"].includes(s.phase); i++) advanceFreeFlight(s, { pitch: s.speed > s.aircraft.target * .9 ? 1 : 0 }, 1 / 120);
  assert.equal(s.phase, "flying", s.result?.reason); assert.ok(s.events.some(e => e.type === "takeoff")); assert.equal(s.landings, 1);
});

test("runways accept a safe arrival from the opposite heading", () => {
  const s = landing("passenger", true); fly(s, .15); assert.equal(s.phase, "rollout");
  fly(s, 40, { brake: true }); assert.equal(s.phase, "parked"); assert.equal(s.landings, 1);
});

test("stall, gear, landing attitude, crosswind, and aircraft-specific touchdown limits matter", () => {
  const s = landing("passenger"), surface = surfaceAt(s.x, s.z);
  assert.equal(assessFreeTouchdown(s, surface, .8).safe, true);
  s.gear = false; assert.match(assessFreeTouchdown(s, surface).reason, /gear/); s.gear = true;
  assert.match(assessFreeTouchdown(s, surface, 5).reason, /hard/);
  s.bank = 30; assert.match(assessFreeTouchdown(s, surface).reason, /wing/); s.bank = 0;
  s.heading = 90; assert.match(assessFreeTouchdown(s, surface).reason, /sideways/);
  const bush = landing("bush"); bush.pitch = 1; assert.match(assessFreeTouchdown(bush, surfaceAt(bush.x, bush.z)).reason, /three wheels/);
  const slow = createFreeFlight({ aircraft: "passenger", weather: "calm" }); beginFreeFlight(slow); slow.speed = slow.aircraft.stall * .8; slow.y = 3000; slow.throttle = 0; slow.power = 0;
  fly(slow, 2); assert.ok(freeFlightInstruments(slow).stall); assert.ok(slow.verticalSpeed < -4);
});

test("free flight crosses the old approach boundaries and permits complete turns", () => {
  const s = createFreeFlight({ weather: "calm", assist: false }); beginFreeFlight(s); s.y = 4000;
  let turning = 0;
  for (let n = 0; n < 120 * 60; n++) { const previous = s.heading; advanceFreeFlight(s, { roll: 1 }, 1 / 120); turning += headingDifference(s.heading, previous); }
  assert.equal(s.phase, "flying"); assert.ok(turning > 360); assert.ok(s.heading >= 0 && s.heading < 360); assert.equal(s.result, null);
  s.x = 80000; s.z = -75000; s.y = 5000; s.bank = 0; s.pitch = flightAngle(s); fly(s, 30);
  assert.equal(s.phase, "flying"); assert.ok(s.distance > 5000); assert.ok(s.x > 70000); assert.equal(s.events.filter(e => e.type === "new-approach").length, 0);
});

test("a ground or water crash emits one explosion event and freezes the aircraft", () => {
  for (const water of [false, true]) {
    const s = createFreeFlight({ weather: "calm" }); beginFreeFlight(s);
    let point;
    for (let x = -18000; x < 18000 && !point; x += 600) for (let z = -14000; z < 14000 && !point; z += 600) { const surface = surfaceAt(x, z); if (!surface.field && surface.water === water) point = { x, z, surface }; }
    assert.ok(point); Object.assign(s, { x: point.x, z: point.z, y: point.surface.height + .001, verticalSpeed: -9 }); advanceFreeFlight(s, {}, .05);
    assert.equal(s.phase, "crashed"); assert.equal(s.result.water, water); assert.equal(s.events.filter(e => e.type === "crash").length, 1);
    const position = [s.x, s.y, s.z]; fly(s, 5, { pitch: 1, throttle: 1 }); assert.deepEqual([s.x, s.y, s.z], position); assert.equal(s.events.filter(e => e.type === "crash").length, 1);
  }
});

test("fixed gear, heavy response, braking, and frame-rate independence are preserved", () => {
  const bush = createFreeFlight({ aircraft: "bush" }); bush.gear = false; advanceFreeFlight(bush); assert.equal(bush.gear, true);
  const light = createFreeFlight({ aircraft: "passenger", weather: "calm" }), heavy = createFreeFlight({ aircraft: "cargo", weather: "calm" }); beginFreeFlight(light); beginFreeFlight(heavy);
  light.throttle = heavy.throttle = 1; fly(light, 1, { roll: 1 }); fly(heavy, 1, { roll: 1 }); assert.ok(light.bank > heavy.bank); assert.ok(light.power - light.aircraft.trim > heavy.power - heavy.aircraft.trim);
  const a = createFreeFlight({ weather: "calm" }), b = createFreeFlight({ weather: "calm" }); beginFreeFlight(a); beginFreeFlight(b);
  for (let n = 0; n < 30 * 6; n++) advanceFreeFlight(a, { roll: .2, pitch: .1 }, 1 / 30);
  for (let n = 0; n < 120 * 6; n++) advanceFreeFlight(b, { roll: .2, pitch: .1 }, 1 / 120);
  for (const key of ["x", "y", "z", "speed", "heading", "pitch", "bank"]) assert.ok(Math.abs(a[key] - b[key]) < 1e-7, key);
  const before = a.time; advanceFreeFlight(a, {}, 100); assert.ok(a.time - before <= .25001); const after = a.time; advanceFreeFlight(a, {}, -1); assert.equal(a.time, after);
});
