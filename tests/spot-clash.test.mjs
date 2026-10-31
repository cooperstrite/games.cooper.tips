import test from "node:test";
import assert from "node:assert/strict";
import { SPOT_PICTURES, SPOT_LEVELS, makeSpotPair, createSpotMatch, beginSpotRound, claimSpotPicture, spotComputerPick } from "../spot-clash-engine.js";
import { createComputerOpponent } from "../arcade/opponents.js";

function rng(seed) {
  return () => { seed = Math.imul(1664525, seed) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
}

test("all difficulties keep their original card counts and winning targets", () => {
  assert.deepEqual(SPOT_LEVELS.map(({ id, size, target }) => [id, size, target]), [
    ["easy", 5, 7], ["medium", 6, 8], ["hard", 7, 9], ["expert", 8, 10],
  ]);
  assert.equal(SPOT_PICTURES.length, 25);
  assert.equal(new Set(SPOT_PICTURES.map(p => p.id)).size, 25);
  assert.equal(new Set(SPOT_PICTURES.map(p => p.name)).size, 25);
});

test("every pair has exactly one common picture, with independently shuffled positions", () => {
  const random = rng(8523), identities = new Set(), leftPositions = new Set(), rightPositions = new Set();
  let previous = null;
  for (const level of SPOT_LEVELS) for (let i = 0; i < 500; i++) {
    const pair = makeSpotPair(level.size, random, previous), [left, right] = pair.cards;
    assert.equal(left.length, level.size); assert.equal(right.length, level.size);
    assert.equal(new Set(left).size, level.size); assert.equal(new Set(right).size, level.size);
    assert.deepEqual(left.filter(id => right.includes(id)), [pair.shared]);
    assert.ok(left.concat(right).every(id => SPOT_PICTURES.some(p => p.id === id)));
    assert.notEqual(pair.shared, previous, "consecutive rounds should not repeat the answer");
    identities.add(pair.shared); leftPositions.add(left.indexOf(pair.shared)); rightPositions.add(right.indexOf(pair.shared));
    previous = pair.shared;
  }
  assert.equal(identities.size, 25); assert.equal(leftPositions.size, 8); assert.equal(rightPositions.size, 8);
  for (const size of [1, 14, 2.5, NaN]) assert.throws(() => makeSpotPair(size), RangeError);
});

test("all four claim outcomes identify the scorer and preserve the pictures for review", () => {
  for (const actor of [0, 1]) for (const correct of [true, false]) {
    const state = createSpotMatch();
    assert.equal(beginSpotRound(state, rng(16)), true);
    const original = structuredClone(state.pair);
    const picture = correct ? state.pair.shared : state.pair.cards[actor].find(id => id !== state.pair.shared);
    const result = claimSpotPicture(state, actor, picture, 1234);
    const scorer = correct ? actor : 1 - actor;
    assert.equal(result.scorer, scorer); assert.equal(result.actor, actor); assert.equal(result.correct, correct);
    assert.equal(result.picture, picture); assert.equal(result.shared, original.shared); assert.equal(result.elapsed, 1234);
    assert.deepEqual(state.scores, scorer === 0 ? [1, 0] : [0, 1]);
    assert.equal(state.phase, "review"); assert.deepEqual(state.pair, original); assert.equal(state.history.length, 1);
    assert.equal(claimSpotPicture(state, 1 - actor, original.shared), null, "a late click or bot callback cannot score twice");
    assert.equal(beginSpotRound(state, rng(20)), true);
    assert.equal(state.result, null); assert.equal(state.round, 2); assert.equal(state.history.length, 1);
  }
});

test("a human can select either card; invalid, paused, and inactive input cannot score", () => {
  const state = createSpotMatch();
  assert.equal(claimSpotPicture(state, 0, "fox"), null);
  beginSpotRound(state, rng(34));
  const before = structuredClone(state);
  assert.equal(claimSpotPicture(state, 0, "not-a-picture"), null);
  assert.equal(claimSpotPicture(state, 2, state.pair.shared), null);
  assert.equal(beginSpotRound(state), false, "an active pair cannot be redealt");
  assert.deepEqual(state, before);
  state.paused = true;
  assert.equal(claimSpotPicture(state, 0, state.pair.shared), null);
  assert.equal(claimSpotPicture(state, 1, state.pair.shared), null);
  state.paused = false;
  const rightOnly = state.pair.cards[1].find(id => !state.pair.cards[0].includes(id));
  assert.equal(claimSpotPicture(state, 0, rightOnly).scorer, 1);
  assert.equal(state.history[0].picture, rightOnly);
});

test("computer attempts use their shared difficulty plan and select only visible pictures", () => {
  for (const level of SPOT_LEVELS) {
    const cpu = createComputerOpponent({ difficulty: level.id, random: rng(562) }), random = rng(817);
    let misses = 0;
    for (let i = 0; i < 300; i++) {
      const pair = makeSpotPair(level.size, random), before = structuredClone(pair), plan = cpu.planReaction();
      const pick = spotComputerPick(pair, plan.correct, random);
      assert.ok(pair.cards[1].includes(pick)); assert.equal(pick === pair.shared, plan.correct);
      assert.ok(plan.delay >= 900); assert.deepEqual(pair, before);
      if (!plan.correct) misses++;
    }
    assert.ok(misses > 0, `${level.id} must remain fallible`);
  }
});

test("a match ends at its target, never awards duplicate final points, and resets cleanly", () => {
  for (const level of SPOT_LEVELS) for (const winner of [0, 1]) {
    const state = createSpotMatch(level.id), random = rng(717);
    for (let round = 1; round <= level.target * 2 - 1; round++) {
      assert.equal(beginSpotRound(state, random), true);
      const actor = round % 2 ? winner : 1 - winner;
      claimSpotPicture(state, actor, state.pair.shared, 1000);
      if (round < level.target * 2 - 1) assert.equal(state.phase, "review");
    }
    assert.equal(state.phase, "finished"); assert.equal(state.winner, winner);
    assert.equal(state.scores[winner], level.target); assert.equal(state.scores[1 - winner], level.target - 1);
    assert.equal(state.history.length, state.round);
    const finished = structuredClone(state);
    assert.equal(beginSpotRound(state, random), false); assert.equal(claimSpotPicture(state, 0, state.pair.shared), null);
    assert.deepEqual(state, finished);
    const fresh = createSpotMatch(level.id);
    assert.deepEqual(fresh.scores, [0, 0]); assert.equal(fresh.phase, "ready"); assert.equal(fresh.history.length, 0);
  }
});
