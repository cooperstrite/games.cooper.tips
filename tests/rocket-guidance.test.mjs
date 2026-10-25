import test from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, presetDesign } from '../rocket-config.js';
import { flightInstruction, flightChecklist } from '../rocket-guidance.js';
import {
  createRocketFlight, beginLaunch, advanceRocket, setThrottle, jettisonStage,
  separateCapsule, deployChutes, releaseFairing, deployPayload, startDeorbit,
  disposeFlight,
} from '../rocket-flight.js';
import { EARTH_RADIUS, MU, G0, Vec3 } from '../arcade/space-physics.js';

function flight(t, missionId = 'first-light', overrides = {}, mode = 'mission') {
  const mission = MISSIONS.find(m => m.id === missionId);
  const s = createRocketFlight({ ...presetDesign(mission.preset), ...overrides }, missionId, mode);
  t.after(() => disposeFlight(s));
  return s;
}

function airborne(t, missionId = 'first-light', overrides = {}, mode = 'mission') {
  const s = flight(t, missionId, overrides, mode);
  Object.assign(s, { phase: 'flying', hasLaunched: true, time: 10, altitude: 20000, maxAltitude: 20000 });
  s.body.position.y = EARTH_RADIUS + s.altitude + s.height / 2;
  s.ignited.add(0);
  return s;
}

function applyAction(s, action) {
  const actions = {
    launch: () => beginLaunch(s), cut: () => setThrottle(s, 0), full: () => setThrottle(s, 1),
    stage: () => jettisonStage(s), capsule: () => separateCapsule(s), chute: () => deployChutes(s),
    fairing: () => releaseFairing(s), payload: () => deployPayload(s), retro: () => startDeorbit(s),
    reduce: () => setThrottle(s, Math.max(0, s.command - .12)),
    guidance: () => { s.guidance = true; return true; },
  };
  assert.ok(actions[action], `Expected an executable flight control, received ${action}`);
  return actions[action]();
}

test('the ready cue launches a six-second sequence without starting the flight early', t => {
  const s = flight(t);
  assert.equal(flightInstruction(s).action, 'launch');
  assert.equal(applyAction(s, flightInstruction(s).action), true);
  assert.equal(s.phase, 'countdown');
  assert.equal(s.countdown, 6);
  const before = { fuel: [...s.fuels], oxygen: s.oxygen, position: s.body.position.clone(), time: s.time };
  advanceRocket(s, 2);
  assert.equal(s.countdown, 4);
  assert.match(flightInstruction(s).title, /water/i);
  s.paused = true;
  const events = s.events.length;
  advanceRocket(s, 3);
  assert.equal(s.countdown, 4);
  assert.equal(s.events.length, events);
  s.paused = false;
  advanceRocket(s, 1);
  assert.equal(s.countdown, 3);
  assert.match(flightInstruction(s).title, /ignit/i);
  assert.equal(s.events.filter(e => e.kind === 'ignition').length, 1);
  advanceRocket(s, 2);
  assert.equal(s.countdown, 1);
  assert.match(flightInstruction(s).title, /thrust/i);
  assert.deepEqual(s.fuels, before.fuel);
  assert.equal(s.oxygen, before.oxygen);
  assert.ok(s.body.position.almostEquals(before.position));
  assert.equal(s.time, before.time);
  advanceRocket(s, 1);
  assert.equal(s.phase, 'flying');
  assert.equal(s.events.filter(e => e.kind === 'release').length, 1);
  assert.match(flightInstruction(s).instruction, /engine|tower/i);
  advanceRocket(s, .1);
  assert.ok(s.fuels[0] < before.fuel[0]);
  assert.ok(s.time > before.time);
  assert.equal(s.events.filter(e => e.kind === 'ignition').length, 1);
  assert.equal(s.events.filter(e => e.kind === 'release').length, 1);
});

test('capsule coaching waits for engine spool-down and the actual 5 kPa separation boundary', t => {
  const s = airborne(t);
  Object.assign(s, { cutoffReady: true, command: .8, throttle: .8, q: 8500 });
  assert.equal(flightInstruction(s).action, 'cut');
  assert.equal(applyAction(s, 'cut'), true);
  assert.equal(flightInstruction(s).action, 'cut', 'Cutting command does not instantly stop thrust.');
  s.throttle = .12;
  s.q = 5000.01;
  assert.equal(flightInstruction(s).action, null);
  assert.equal(separateCapsule(s), false);
  s.q = 5000;
  assert.equal(flightInstruction(s).action, 'capsule');
  assert.equal(applyAction(s, 'capsule'), true);
  assert.equal(s.capsule, true);
});

for (const { altitude, speed, verticalSpeed, permitted } of [
  { altitude: 5000.01, speed: 150, verticalSpeed: -150, permitted: false },
  { altitude: 5000, speed: 220, verticalSpeed: -220, permitted: true },
  { altitude: 4999, speed: 220.01, verticalSpeed: -220.01, permitted: false },
  { altitude: 4999, speed: 220, verticalSpeed: -220, permitted: true },
  { altitude: 4000, speed: 150, verticalSpeed: 0, permitted: false },
  { altitude: 4000, speed: 150, verticalSpeed: 150, permitted: false },
]) {
  test(`parachute cue agrees with the flight rules at ${altitude} m, ${speed} m/s, vertical ${verticalSpeed}`, t => {
    const s = airborne(t);
    assert.equal(separateCapsule(s), true);
    Object.assign(s, { altitude, speed, verticalSpeed });
    assert.equal(flightInstruction(s).action === 'chute', permitted);
    assert.equal(deployChutes(s), permitted);
  });
}

test('missing parachutes are explained without offering an impossible control', t => {
  const s = airborne(t, 'first-light', { parachute: false });
  assert.equal(separateCapsule(s), true);
  Object.assign(s, { altitude: 3000, speed: 150, verticalSpeed: -150 });
  const instruction = flightInstruction(s);
  assert.equal(instruction.action, null);
  assert.match(instruction.instruction, /no.*parachute/i);
  assert.equal(deployChutes(s), false);
});

test('an empty intermediate booster can be dropped and the next engine must be ignited by the player', t => {
  const s = airborne(t, 'spaceward');
  s.fuels[0] = 0;
  s.command = 1;
  s.throttle = .8;
  assert.equal(flightInstruction(s).action, 'stage');
  assert.equal(applyAction(s, 'stage'), true);
  assert.equal(s.activeStage, 1);
  assert.equal(s.command, 0);
  assert.equal(flightInstruction(s).action, 'full');
  assert.equal(applyAction(s, 'full'), true);
  advanceRocket(s, .1);
  assert.ok(s.throttle > 0);
  assert.ok(s.ignited.has(1));
});

test('a nearly empty but still powered booster is cut before offering stage separation', t => {
  const s = airborne(t, 'spaceward');
  s.fuels[0] = .4;
  s.command = .8;
  s.throttle = .8;
  assert.equal(jettisonStage(s), false);
  assert.equal(flightInstruction(s).action, 'cut');
  assert.equal(applyAction(s, 'cut'), true);
  s.throttle = .12;
  assert.equal(flightInstruction(s).action, 'stage');
  assert.equal(applyAction(s, 'stage'), true);
});

for (const mode of ['mission', 'free']) {
  test(`the final empty stage leads to capsule recovery, never a nonexistent next engine (${mode})`, t => {
    const s = airborne(t, 'first-light', {}, mode);
    s.fuels[0] = 0;
    const instruction = flightInstruction(s);
    assert.equal(instruction.action, 'capsule');
    assert.doesNotMatch(instruction.instruction + instruction.detail, /ignite.*next|stage 2/i);
    assert.equal(applyAction(s, instruction.action), true);
    assert.equal(s.capsule, true);
  });
}

test('a final stage without a decoupler never recommends an impossible capsule release', t => {
  const s = airborne(t);
  s.design.stages[0].decoupler = false;
  s.fuels[0] = 0;
  assert.equal(flightInstruction(s).action, null);
  assert.match(flightInstruction(s).instruction + flightInstruction(s).detail, /decoupler/i);
  assert.equal(separateCapsule(s), false);
});

test('capsule release checks decouplers on every remaining stage, including an upper stage', t => {
  const s = airborne(t, 'spaceward');
  s.design.stages[1].decoupler = false;
  s.cutoffReady = true;
  assert.equal(flightInstruction(s).action, null);
  assert.match(flightInstruction(s).instruction + flightInstruction(s).detail, /decoupler/i);
  assert.equal(s.activeStage, 0, 'Reading the warning must not partially discard the vehicle.');
});

test('air-pressure coaching reduces the throttle before any staging or mission advice', t => {
  const s = airborne(t, 'spaceward');
  Object.assign(s, { command: .8, throttle: .8, q: s.mission.maxQ * .91, warning: 'Max-Q: reduce power through thick air', cutoffReady: true });
  const instruction = flightInstruction(s);
  assert.equal(instruction.action, 'reduce');
  assert.equal(instruction.tone, 'warning');
  assert.equal(applyAction(s, instruction.action), true);
  assert.ok(s.command < .8);
});

test('expedition coaching warns at its stricter 4 G crew limit before continued powered ascent', t => {
  const s = airborne(t, 'expedition', { ...presetDesign('pioneer'), crewCount: 1 });
  s.body.position.y = EARTH_RADIUS + 200000 + s.height / 2;
  s.altitude = 200000;
  s.fuels[0] = 100;
  advanceRocket(s, 1 / 60); // Refresh the mass after preparing a nearly spent test vehicle.
  const targetG = 4.25;
  s.command = s.throttle = targetG * s.mass * G0 / s.stats.stages[0].thrust;
  s.gLoad = targetG;
  const health = s.crew[0].health;
  advanceRocket(s, 1 / 60);
  assert.ok(s.crew[0].health < health, 'The physics already applies damage above the expedition 4 G limit.');
  assert.equal(flightInstruction(s).action, 'reduce');
});

test('manual capsule re-entry offers guidance while enabled guidance needs no repeated action', t => {
  const s = airborne(t, 'first-light');
  assert.equal(separateCapsule(s), true);
  Object.assign(s, { altitude: 30000, verticalSpeed: -1000, speed: 1000, guidance: false });
  assert.equal(flightInstruction(s).action, 'guidance');
  s.guidance = true;
  assert.equal(flightInstruction(s).action, null);
  Object.assign(s, { warning: 'Rotate the heat shield into the airflow', guidance: false });
  assert.equal(flightInstruction(s).action, 'guidance');
  s.guidance = true;
  assert.equal(flightInstruction(s).action, null);
});

test('a low-oxygen warning does not hide an available parachute recovery action', t => {
  const s = airborne(t, 'first-light', { crewCount: 1 });
  assert.equal(separateCapsule(s), true);
  Object.assign(s, { altitude: 4000, verticalSpeed: -150, speed: 150, oxygen: 40, warning: 'Life support reserve is low' });
  assert.equal(flightInstruction(s).action, 'chute');
  assert.equal(applyAction(s, 'chute'), true);
});

test('orbital delivery instructions order cutoff, fairing release, then successful payload deployment', t => {
  const s = airborne(t, 'courier');
  Object.assign(s, { orbitAchieved: true, altitude: 180000, command: 1, throttle: .8 });
  assert.equal(flightInstruction(s).action, 'cut');
  assert.equal(applyAction(s, 'cut'), true);
  assert.equal(flightInstruction(s).action, 'cut');
  s.throttle = 0;
  assert.equal(flightInstruction(s).action, 'fairing');
  assert.equal(deployPayload(s), false, 'The protective fairing still blocks deployment.');
  assert.equal(applyAction(s, 'fairing'), true);
  assert.equal(s.payloadDeployed, false);
  assert.equal(flightInstruction(s).action, 'payload');
  assert.equal(applyAction(s, 'payload'), true);
  assert.equal(s.phase, 'won');
  assert.equal(flightInstruction(s).action, null);
  assert.match(flightInstruction(s).detail, /60 shared coins/);
});

test('a delivery capsule already detached in a valid orbit still deploys its satellite instead of deorbiting', t => {
  const s = airborne(t, 'courier');
  Object.assign(s, { orbitAchieved: true, altitude: 180000 });
  assert.equal(separateCapsule(s), true);
  assert.equal(flightInstruction(s).action, 'fairing');
  assert.equal(applyAction(s, 'fairing'), true);
  assert.equal(flightInstruction(s).action, 'payload');
  assert.equal(applyAction(s, 'payload'), true);
  assert.equal(s.phase, 'won');
  assert.equal(s.deorbited, false);
});

test('orbital recovery releases the capsule before arming retro and does not repeatedly request the burn', t => {
  const s = airborne(t, 'homeward');
  Object.assign(s, { orbitAchieved: true, altitude: 180000, guidance: false });
  assert.equal(flightInstruction(s).action, 'capsule');
  assert.equal(startDeorbit(s), false);
  assert.equal(applyAction(s, 'capsule'), true);
  assert.equal(flightInstruction(s).action, 'retro');
  assert.equal(applyAction(s, 'retro'), true);
  assert.equal(s.guidance, true, 'The real return motor enables attitude guidance.');
  assert.equal(s.deorbited, true);
  assert.equal(s.retro, true);
  assert.equal(flightInstruction(s).action, null);
  assert.match(flightInstruction(s).title, /burn in progress/i);
});

test('satisfying orbit height targets does not replace a required stage separation', t => {
  const s = airborne(t, 'courier');
  s.orbit = { apoapsis: 200000, periapsis: 120000, period: 5000 };
  s.staged = 0;
  s.command = 0;
  s.throttle = 0;
  assert.equal(flightInstruction(s).action, 'stage');
  assert.equal(applyAction(s, 'stage'), true);
  assert.equal(s.staged, 1);
  assert.equal(flightInstruction(s).id, 'confirm-orbit', 'Do not ignite a new engine after the orbit height targets are already satisfied.');
});

test('an orbit is not reported complete until the real physics confirms four stable seconds', t => {
  const s = airborne(t, 'courier');
  assert.equal(jettisonStage(s), true);
  const radius = EARTH_RADIUS + 220000;
  s.body.position.set(0, radius, 0);
  s.body.velocity.set(Math.sqrt(MU / radius), 0, 0);
  s.altitude = 220000 - s.height / 2;
  s.ignited.add(s.activeStage);
  advanceRocket(s, 3);
  assert.equal(s.orbitAchieved, false);
  assert.equal(flightInstruction(s).id, 'confirm-orbit');
  assert.notEqual(flightInstruction(s).action, 'payload');
  advanceRocket(s, .9);
  assert.equal(s.orbitAchieved, false);
  advanceRocket(s, .2);
  assert.equal(s.orbitAchieved, true);
  assert.equal(flightInstruction(s).action, 'fairing');
});

test('an empty final engine waits for valid orbit confirmation rather than abandoning the delivery', t => {
  const s = airborne(t, 'courier');
  assert.equal(jettisonStage(s), true);
  s.fuels[s.activeStage] = 0;
  const radius = EARTH_RADIUS + 220000;
  s.body.position.set(0, radius, 0);
  s.body.velocity.set(Math.sqrt(MU / radius), 0, 0);
  s.altitude = 220000 - s.height / 2;
  advanceRocket(s, 3);
  assert.equal(s.orbitAchieved, false);
  assert.equal(flightInstruction(s).id, 'confirm-orbit');
  assert.notEqual(flightInstruction(s).action, 'capsule');
  advanceRocket(s, 1.1);
  assert.equal(s.orbitAchieved, true);
  assert.equal(flightInstruction(s).action, 'fairing');
});

test('checklists distinguish predicted altitude from actual altitude and separate delivery milestones', t => {
  const first = airborne(t);
  first.maxAltitude = 1000;
  first.orbit.apoapsis = 20000;
  first.cutoffReady = true;
  assert.equal(flightChecklist(first)[0].complete, false);
  first.maxAltitude = first.mission.target;
  assert.equal(flightChecklist(first)[0].complete, true);
  const courier = airborne(t, 'courier');
  assert.deepEqual(flightChecklist(courier).map(item => item.complete), [false, false, false, false]);
  courier.staged = 1;
  courier.orbitAchieved = true;
  courier.fairing = false;
  assert.deepEqual(flightChecklist(courier).map(item => item.complete), [true, true, true, false]);
  courier.payloadDeployed = true;
  assert.deepEqual(flightChecklist(courier).map(item => item.complete), [true, true, true, true]);
});

test('guidance steers the real vehicle without applying throttle, and manual mode keeps pilot pitch', t => {
  const auto = airborne(t, 'courier'), manual = airborne(t, 'courier');
  auto.guidance = true;
  manual.guidance = false;
  auto.pitch = manual.pitch = 0;
  auto.command = manual.command = 0;
  for (let i = 0; i < 40; i++) { advanceRocket(auto, .1); advanceRocket(manual, .1); }
  const autoAxis = auto.body.quaternion.vmult(new Vec3(0, 1, 0));
  const manualAxis = manual.body.quaternion.vmult(new Vec3(0, 1, 0));
  assert.ok(Math.abs(autoAxis.x) > .05, 'Orbital guidance should begin turning the unpowered vehicle sideways.');
  assert.ok(Math.abs(manualAxis.x) < .01, 'Manual zero pitch should remain upright.');
  assert.equal(auto.command, 0);
  assert.equal(auto.throttle, 0);
});

test('reading instructions never operates the controls or advances the simulation', t => {
  const s = airborne(t, 'courier');
  const values = () => ({ command: s.command, throttle: s.throttle, stage: s.activeStage, capsule: s.capsule, fairing: s.fairing, payload: s.payloadDeployed, guidance: s.guidance, time: s.time, fuel: [...s.fuels], events: s.events.length });
  const before = values();
  for (let i = 0; i < 20; i++) { flightInstruction(s); flightChecklist(s); }
  assert.deepEqual(values(), before);
});

for (const mission of MISSIONS) {
  for (const crewCount of mission.recover ? [0, 3] : [0]) {
    test(`${mission.name}: following only the guide completes the mission with ${crewCount} crew`, t => {
      const s = flight(t, mission.id, { crewCount });
      const controlsUsed = new Set();
      for (let i = 0; i < 55000 && !s.result; i++) {
        const instruction = flightInstruction(s);
        if (instruction.action) {
          controlsUsed.add(instruction.action);
          assert.equal(applyAction(s, instruction.action), true,
            `${instruction.id} recommended rejected action ${instruction.action} at ${s.time.toFixed(1)} s.`);
        }
        // A player responds to the displayed cue; no trajectory-specific
        // throttle policy, staging rule, or recovery shortcut is supplied.
        advanceRocket(s, .2);
      }
      assert.equal(s.phase, 'won',
        `${s.result?.title || 'Flight never finished'}: ${s.result?.reason || flightInstruction(s).instruction}; time ${s.time.toFixed(1)} s.`);
      assert.ok(controlsUsed.has('launch'));
      assert.ok(s.maxAltitude >= mission.target);
      assert.ok(s.staged >= mission.stages);
      assert.ok(s.integrity > 0);
      assert.ok(s.payloadHealth > 0);
      for (const person of s.crew) assert.ok(person.health > 0);
      if (mission.orbit) assert.equal(s.orbitAchieved, true);
      if (mission.recover) {
        assert.ok(controlsUsed.has('chute'));
        assert.equal(s.chute, true);
      } else {
        assert.ok(controlsUsed.has('payload'));
        assert.equal(s.payloadDeployed, true);
      }
    });
  }
}
