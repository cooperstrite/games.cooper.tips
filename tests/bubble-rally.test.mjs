import test from "node:test";
import assert from "node:assert/strict";
import { createRally, rollRally, rallyActions, resolveRallyAction, advanceRally, scoreRallyAction, RALLY_COURSES } from "../bubble-rally-model.js";
import { OPPONENT_LEVELS, createComputerOpponent } from "../arcade/opponents.js";
import { rallyMoveDetails } from "../bubble-rally-guide.js";

const players = count => Array.from({ length: count }, (_, i) => ({ name: `Racer ${i + 1}`, kind: i ? "computer" : "human", difficulty: OPPONENT_LEVELS[i].id }));
const rolled = (n = 2, roll = 2, course = "prism") => rollRally(createRally({ players: players(n), course }), () => (roll - 0.5) / 6);
function rng(seed) { return () => { seed = Math.imul(1664525, seed) + 1013904223 | 0; return (seed >>> 0) / 4294967296; }; }

test("two, three and four independent seats retain controller and difficulty; turns wrap once", () => {
  for (const count of [2, 3, 4]) {
    let state = createRally({ players: players(count), firstPlayer: count - 1 });
    assert.equal(state.players.length, count); assert.equal(state.active, count - 1);
    state.players.forEach((p, i) => assert.equal(p.difficulty, OPPONENT_LEVELS[i].id));
    state = resolveRallyAction(rollRally(state, () => 0), "cruise");
    const next = advanceRally(state); assert.equal(next.active, 0); assert.equal(next.turn, 2);
    assert.equal(advanceRally(next), next);
  }
  assert.throws(() => createRally({ players: players(1) }));
  assert.throws(() => createRally({ players: Array(5).fill({}) }));
});

test("all racers use the same uniform die, with no repeat rolls or difficulty-dependent outcome", () => {
  for (const level of OPPONENT_LEVELS) {
    const counts = Array(6).fill(0);
    for (let i = 0; i < 600; i++) {
      const state = createRally({ players: [{ kind: "computer", difficulty: level.id }, {}] });
      const next = rollRally(state, () => (i + 0.5) / 600);
      counts[next.roll - 1]++; assert.equal(rollRally(next, () => 0), next);
    }
    assert.deepEqual(counts, Array(6).fill(100));
  }
});

test("move previews are immutable, spending is bounded, and illegal actions do nothing", () => {
  const state = rolled(), snapshot = JSON.stringify(state);
  const boost = resolveRallyAction(state, "boost");
  assert.equal(boost.players[0].energy, 0); assert.equal(boost.players[0].position, 4);
  assert.equal(JSON.stringify(state), snapshot);
  assert.equal(resolveRallyAction(boost, "boost"), boost);
  state.players[0].energy = 1;
  assert.equal(resolveRallyAction(state, "boost"), state);
  assert.equal(resolveRallyAction(state, "unknown"), state);
  assert.deepEqual(rallyActions(state).map(action => action.id), ["cruise", "brake"]);
  state.players[0].energy = 6;
  assert.equal(resolveRallyAction(state, "cruise").players[0].energy, 6);
  assert.equal(resolveRallyAction(rolled(2, 1), "brake").players[0].position, 1);
});

test("tiles resolve once, energy caps at six, shields block storms and checkpoints limit setbacks", () => {
  assert.equal(resolveRallyAction(rolled(2, 5), "cruise").players[0].position, 7); // boost ends on storm: no cascade
  assert.equal(resolveRallyAction(rolled(2, 3), "cruise").players[0].energy, 5);
  const storm = rolled(2, 2); storm.players[0].position = 5;
  assert.equal(resolveRallyAction(storm, "cruise").players[0].position, 5);
  const blocked = resolveRallyAction(storm, "shield"); assert.equal(blocked.players[0].position, 7); assert.equal(blocked.players[0].shield, false);
  const crossing = rolled(2, 6); crossing.players[0].position = 8;
  const crossed = resolveRallyAction(crossing, "cruise"); assert.equal(crossed.players[0].checkpoint, 10); assert.equal(crossed.players[0].position, 16);
  const tempest = rolled(2, 2, "tempest"); tempest.players[0].position = 20; tempest.players[0].checkpoint = 20;
  assert.equal(resolveRallyAction(tempest, "cruise").players[0].position, 20);
});

test("braking restores two energy, trades distance for a better landing and respects the cap", () => {
  const minimum = resolveRallyAction(rolled(2, 1), "brake");
  assert.equal(minimum.players[0].position, 1); assert.equal(minimum.players[0].energy, 4);
  const example = rolled(2, 4); example.players[0].position = 3;
  const cruise = resolveRallyAction(example, "cruise"), brake = resolveRallyAction(example, "brake");
  assert.equal(cruise.players[0].position, 5); assert.equal(cruise.players[0].energy, 3);
  assert.equal(brake.players[0].position, 7); assert.equal(brake.players[0].energy, 4);
  assert.deepEqual(brake.last.events.map(event => event.type), ["boost"]);
  const full = rolled(2, 5); full.players[0].energy = 5;
  const capped = resolveRallyAction(full, "brake");
  assert.equal(capped.players[0].energy, 6); assert.equal(capped.last.energyAfterAction, 6);
  assert.match(rallyMoveDetails(capped).steps.join(" "), /restored 1 energy.*cap/);
  assert.match(rallyMoveDetails(capped).steps.join(" "), /Charge tile: no extra energy/);
});

test("move explanations distinguish spaces and energy and describe actual shield/checkpoint outcomes", () => {
  const current = rallyMoveDetails(resolveRallyAction(rolled(2, 5), "cruise"));
  assert.match(current.result, /Current \+2 spaces/);
  assert.match(current.steps.join(" "), /from tile 5 to 7.*does not trigger/);
  const charge = rallyMoveDetails(resolveRallyAction(rolled(2, 3), "cruise"));
  assert.match(charge.result, /5\/6 energy.*Charge \+2 energy/);
  const storm = rolled(2, 2, "tempest"); storm.players[0].position = 20; storm.players[0].checkpoint = 20;
  const setback = rallyMoveDetails(resolveRallyAction(storm, "cruise"));
  assert.match(setback.steps.join(" "), /back 2 spaces to tile 20.*checkpoint at 20 stops the 3-space setback/);
  const shield = rallyMoveDetails(resolveRallyAction(storm, "shield"));
  assert.match(shield.steps.join(" "), /spent 2 energy.*shield raised.*blocked the storm and broke.*tile 22/);
  const collision = rolled(3, 4); collision.players[1].position = 4; collision.players[2].position = 4; collision.players[2].shield = true;
  const popped = rallyMoveDetails(resolveRallyAction(collision, "cruise"));
  assert.match(popped.steps.join(" "), /Racer 2 was popped back to checkpoint 0/);
  assert.match(popped.steps.join(" "), /Racer 3's shield blocked the pop and broke/);
  assert.equal(rallyMoveDetails(createRally({ players: players(2) })), null);
});

test("four-player collisions pop all unshielded rivals; checkpoints and shielded rivals are safe", () => {
  const state = rolled(4, 4);
  state.players[1].position = 4; state.players[2].position = 4; state.players[2].shield = true; state.players[3].position = 4;
  const next = resolveRallyAction(state, "cruise");
  assert.deepEqual(next.players.map(p => p.position), [4, 0, 4, 0]); assert.equal(next.players[2].shield, false); assert.equal(next.players[0].pops, 2);
  const safe = rolled(4, 2); safe.players[0].position = 8; safe.players[1].position = 10; safe.players[1].checkpoint = 10;
  assert.equal(resolveRallyAction(safe, "cruise").players[1].position, 10);
  const checkpoint = rolled(2, 3); checkpoint.players[0].position = 23; checkpoint.players[1].position = 26; checkpoint.players[1].checkpoint = 20;
  assert.equal(resolveRallyAction(checkpoint, "cruise").players[1].position, 20);
});

test("overshooting finishes the race once and prevents subsequent moves", () => {
  const state = rolled(4, 6); state.players[0].position = 29;
  const next = resolveRallyAction(state, "boost"); assert.equal(next.winner, 0); assert.equal(next.players[0].position, 31);
  assert.equal(next.phase, "finished"); assert.equal(advanceRally(next), next); assert.deepEqual(rallyActions(next), []);
});

test("seeded matches finish in all circuits and seat counts; every difficulty can win and lose", () => {
  const summary = [];
  for (const level of OPPONENT_LEVELS) {
    let humanWins = 0, computerWins = 0;
    for (let game = 1; game <= 600; game++) {
      const dice = rng(game * 817), policy = createComputerOpponent({ difficulty: level.id, random: rng(game * 491 + 3) });
      let state = createRally({ players: [{}, { kind: "computer", difficulty: level.id }], course: RALLY_COURSES[game % 3].id, firstPlayer: game % 2 });
      while (state.winner === null && state.turn < 400) {
        state = rollRally(state, dice);
        const actions = rallyActions(state);
        const action = state.active === 0 ? actions.reduce((best, action) => scoreRallyAction(state, action) > scoreRallyAction(state, best) ? action : best) : policy.choose(actions, action => scoreRallyAction(state, action));
        state = resolveRallyAction(state, action.id);
        for (const p of state.players) { assert.ok(p.position >= p.checkpoint && p.position <= 31); assert.ok(p.energy >= 0 && p.energy <= 6); }
        state = advanceRally(state);
      }
      assert.notEqual(state.winner, null);
      if (state.winner === 0) humanWins++; else computerWins++;
    }
    assert.ok(humanWins > 150 && computerWins > 70, `${level.id}: ${humanWins}/${computerWins}`);
    summary.push({ level: level.id, humanWins, computerWins });
  }
  assert.ok(summary[3].computerWins > summary[0].computerWins);
  console.log("Bubble Rally calibration (600 matches/level, alternating starter):", summary);
  for (const count of [3, 4]) for (const course of RALLY_COURSES) for (let seed = 1; seed <= 50; seed++) {
    let state = createRally({ players: players(count), course: course.id, firstPlayer: seed % count });
    const random = rng(seed * 31), opponents = state.players.map(p => createComputerOpponent({ difficulty: p.difficulty, random: rng(seed + p.id) }));
    while (state.winner === null && state.turn < 500) {
      state = rollRally(state, random);
      const action = opponents[state.active].choose(rallyActions(state), action => scoreRallyAction(state, action));
      state = advanceRally(resolveRallyAction(state, action.id));
    }
    assert.notEqual(state.winner, null);
  }
});
