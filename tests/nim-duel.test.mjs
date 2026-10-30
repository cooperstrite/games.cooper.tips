import test from "node:test";
import assert from "node:assert/strict";
import { buildNimPiles, createNimRound, applyNimMove, chooseNimMove } from "../nim-duel-engine.js";
import { OPPONENT_LEVELS, createComputerOpponent } from "../arcade/opponents.js";
import { nimValue, nimActions, scoreNimAction } from "../arcade/opponent-strategies.js";

function rng(seed) {
  return () => { seed = Math.imul(1664525, seed) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
}

test("one turn removes one to three matches from exactly one pile", () => {
  const original = [5, 2, 1], round = createNimRound({ piles: original });
  assert.equal(applyNimMove(round, { pile: 0, amount: 2 }), true);
  assert.deepEqual(round.piles, [3, 2, 1]);
  assert.deepEqual(original, [5, 2, 1]);
  assert.equal(round.turn, 1);
  assert.deepEqual(round.moves, [{ pile: 0, amount: 2, actor: 0, remaining: 3 }]);
  assert.deepEqual(round.removed, [2, 0]);
  assert.equal(applyNimMove(round, { pile: 1, amount: 2 }), true);
  assert.deepEqual(round.piles, [3, 0, 1]);
  assert.equal(round.turn, 0);
  assert.equal(round.winner, null, "emptying one pile does not win the round");
});

test("illegal, repeated, paused, and post-game moves cannot change a round", () => {
  const round = createNimRound({ piles: [4, 1, 0] });
  for (const action of [null, {}, { pile: -1, amount: 1 }, { pile: 3, amount: 1 },
    { pile: 0.5, amount: 1 }, { pile: 0, amount: 0 }, { pile: 0, amount: 4 },
    { pile: 0, amount: 1.5 }, { pile: 1, amount: 2 }, { pile: 2, amount: 1 }]) {
    const before = structuredClone(round);
    assert.equal(applyNimMove(round, action), false);
    assert.deepEqual(round, before);
  }
  assert.equal(applyNimMove(round, { pile: 0, amount: 1 }, 1), false);
  round.paused = true;
  assert.equal(applyNimMove(round, { pile: 0, amount: 1 }), false);
  assert.equal(chooseNimMove(round, createComputerOpponent()), null);
  round.paused = false;
  assert.equal(applyNimMove(round, { pile: 0, amount: 3 }, 0), true);
  assert.equal(applyNimMove(round, { pile: 0, amount: 1 }, 0), false, "the previous player cannot move twice");
  assert.equal(applyNimMove(round, { pile: 0, amount: 1 }, 1), true);
  assert.equal(round.winner, null);
  assert.equal(applyNimMove(round, { pile: 1, amount: 1 }, 0), true);
  assert.equal(round.winner, 0, "the final match wins, not loses");
  const finished = structuredClone(round);
  assert.equal(applyNimMove(round, { pile: 1, amount: 1 }), false);
  assert.equal(chooseNimMove(round, createComputerOpponent()), null);
  assert.deepEqual(round, finished);
});

test("either local player can start and win under the same rules", () => {
  for (const starter of [0, 1]) {
    const round = createNimRound({ piles: [1, 1, 1], starter });
    assert.equal(round.turn, starter);
    for (let pile = 0; pile < 3; pile++) assert.equal(applyNimMove(round, { pile, amount: 1 }), true);
    assert.equal(round.winner, starter);
    assert.deepEqual(round.moves.map(move => move.actor), [starter, 1 - starter, starter]);
  }
});

test("new rounds retain the original range and a winning first-player opening", () => {
  const sizes = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const random = rng(seed * 7919), piles = buildNimPiles(random);
    sizes.add(piles.length);
    assert.ok(piles.length >= 3 && piles.length <= 6);
    // The original fairness correction may lower the first pile from 3 to 2.
    assert.ok(piles.every(n => n >= 2 && n <= 9));
    assert.notEqual(nimValue(piles), 0);
  }
  assert.deepEqual([...sizes].sort(), [3, 4, 5, 6]);
  assert.throws(() => createNimRound({ piles: [0, 0] }), TypeError);
  assert.throws(() => createNimRound({ piles: [3, -1] }), TypeError);
});

test("every computer level makes legal moves and remains beatable through the new round engine", () => {
  for (const level of OPPONENT_LEVELS) for (let seed = 1; seed <= 60; seed++) {
    const round = createNimRound({ piles: buildNimPiles(rng(seed * 7919)) });
    const cpu = createComputerOpponent({ difficulty: level.id, random: rng(seed + 900) });
    const initial = round.piles.reduce((a, b) => a + b, 0);
    while (round.winner === null) {
      const before = structuredClone(round);
      const move = round.turn === 0
        ? nimActions(round.piles).find(action => scoreNimAction(round.piles, action) === 1)
        : chooseNimMove(round, cpu);
      assert.deepEqual(round, before, "choosing a move must not remove matches");
      assert.ok(move);
      assert.equal(applyNimMove(round, move), true);
      assert.ok(round.moves.length <= initial);
    }
    assert.equal(round.winner, 0, level.id);
    assert.equal(round.removed[0] + round.removed[1], initial);
  }
});
