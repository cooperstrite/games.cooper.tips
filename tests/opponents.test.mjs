import test from "node:test";
import assert from "node:assert/strict";
import { OPPONENT_LEVELS, createComputerOpponent, createOpponentScheduler } from "../arcade/opponents.js";
import { nimValue, nimActions, scoreNimAction, giveNimFirstPlayerAChance, TUG_RULES } from "../arcade/opponent-strategies.js";

function rng(seed) { return () => { seed = Math.imul(1664525, seed) + 1013904223 | 0; return (seed >>> 0) / 4294967296; }; }

test("difficulty changes decision quality and pace without illegal actions or perfect accuracy", () => {
  const results = OPPONENT_LEVELS.map(level => {
    const cpu = createComputerOpponent({ difficulty: level.id, random: rng(827) });
    const actions = Object.freeze(["poor", "okay", "good", "best"]);
    let best = 0, correct = 0, delay = 0, tap = 0;
    for (let i = 0; i < 12000; i++) {
      const action = cpu.choose(actions, value => actions.indexOf(value));
      assert.ok(actions.includes(action)); if (action === "best") best++;
      const reaction = cpu.planReaction(); if (reaction.correct) correct++;
      assert.ok(reaction.delay >= 900); delay += reaction.delay;
      const interval = cpu.nextTapDelay(); assert.ok(interval >= 193); tap += interval;
    }
    assert.ok(best < 12000); assert.ok(correct < 12000);
    assert.equal(cpu.choose([]), null);
    return { best, correct, delay, tap };
  });
  for (let i = 1; i < results.length; i++) {
    assert.ok(results[i].best > results[i - 1].best);
    assert.ok(results[i].correct > results[i - 1].correct);
    assert.ok(results[i].delay < results[i - 1].delay);
    assert.ok(results[i].tap < results[i - 1].tap);
  }
});

test("every tug opponent can be outpaced at six human taps per second with equal pull", () => {
  for (const level of OPPONENT_LEVELS) {
    const cpu = createComputerOpponent({ difficulty: level.id, random: rng(199) });
    let position = 0, humanAt = 0, computerAt = cpu.nextTapDelay(), won = false;
    for (let time = 0; time < 45000; time += 1000 / 120) {
      if (time >= humanAt) { position -= TUG_RULES.clickImpulse; humanAt += 1000 / 6; }
      if (time >= computerAt) { position += TUG_RULES.clickImpulse; computerAt += cpu.nextTapDelay(); }
      if (position <= -TUG_RULES.maxPull) { won = true; break; }
      position -= position * TUG_RULES.returnRate / 120;
    }
    assert.ok(won, `${level.id}: six taps/sec must overcome both the computer and rope tension`);
  }
});

test("bounded Nim solver matches exhaustive game outcomes, including piles above three", () => {
  const cache = new Map();
  function winning(piles) {
    const key = piles.join(","); if (cache.has(key)) return cache.get(key);
    const result = nimActions(piles).some(action => { const next = [...piles]; next[action.pile] -= action.amount; return !winning(next); });
    cache.set(key, result); return result;
  }
  for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 6; c++) {
    const piles = [a, b, c];
    assert.equal(nimValue(piles) !== 0, winning(piles), piles.join(","));
    if (winning(piles)) assert.ok(nimActions(piles).some(action => scoreNimAction(piles, action) === 1));
  }
});

test("a skilled Nim player can beat every difficulty from every generated opening", () => {
  for (const level of OPPONENT_LEVELS) for (let seed = 1; seed <= 80; seed++) {
    const random = rng(seed), cpu = createComputerOpponent({ difficulty: level.id, random: rng(seed + 400) });
    let piles = giveNimFirstPlayerAChance(Array.from({ length: 3 + seed % 4 }, () => 3 + Math.floor(random() * 7)));
    assert.notEqual(nimValue(piles), 0);
    let human = true, winner;
    while (piles.some(Boolean)) {
      const actions = nimActions(piles);
      const move = human ? actions.find(action => scoreNimAction(piles, action) === 1) : cpu.choose(actions, action => scoreNimAction(piles, action));
      assert.ok(move); piles[move.pile] -= move.amount; winner = human; human = !human;
    }
    assert.equal(winner, true);
  }
});

test("scheduled opponents preserve remaining time on pause and cancel work on reset or disposal", () => {
  let now = 0, serial = 0, called = 0;
  const timers = new Map(), handlers = new Map();
  const visibility = { hidden: false, addEventListener: (name, fn) => handlers.set(name, fn), removeEventListener: name => handlers.delete(name) };
  const scheduler = createOpponentScheduler({ clock: () => now, visibility,
    setTimer: (fn, delay) => { const id = ++serial; timers.set(id, { fn, due: now + delay }); return id; }, clearTimer: id => timers.delete(id) });
  function advance(ms) { now += ms; for (const [id, timer] of [...timers]) if (timer.due <= now) { timers.delete(id); timer.fn(); } }
  scheduler.schedule(() => called++, 1000); advance(400); scheduler.pause(); advance(5000); assert.equal(called, 0);
  scheduler.resume(); advance(599); assert.equal(called, 0); advance(1); assert.equal(called, 1);
  scheduler.schedule(() => called++, 500); visibility.hidden = true; handlers.get("visibilitychange")(); advance(5000);
  scheduler.pause(); visibility.hidden = false; handlers.get("visibilitychange")(); advance(5000); assert.equal(called, 1);
  scheduler.resume(); advance(500); assert.equal(called, 2);
  scheduler.schedule(() => called++, 500); scheduler.cancel(); advance(1000); assert.equal(called, 2);
  scheduler.schedule(() => called++, 500); scheduler.dispose(); advance(1000); assert.equal(called, 2); assert.equal(handlers.size, 0);
});
