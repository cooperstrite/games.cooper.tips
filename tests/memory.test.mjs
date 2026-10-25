import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { MEMORY_LAYOUTS, MEMORY_SETS, MEMORY_ITEMS, MEMORY_REWARDS, normalizeMemorySettings, memoryRewardTotal } from "../memory-config.js";
import { createMemoryGame, legalMemoryCards, flipMemoryCard, resolveMemoryPair, finishMemoryClose, memoryWinners, memoryProgress } from "../memory-engine.js";
import { createMemoryOpponent } from "../arcade/memory-opponent.js";
import { createArcadeWallet, ARCADE_STORAGE_KEY } from "../arcade/wallet.js";
import { createRewardSession, rewardTotal } from "../arcade/game-services.js";
import { charactersForGame } from "../arcade/characters.js";

const rng = seed => () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
const settings = patch => normalizeMemorySettings(patch, MEMORY_ITEMS.map(item => item.id));
const game = (patch = {}) => createMemoryGame(settings(patch), rng(133));
function pair(g, match = true) {
  const [a, ...rest] = legalMemoryCards(g), b = rest.find(index => (g.deck[index].id === g.deck[a].id) === match);
  flipMemoryCard(g, a); flipMemoryCard(g, b); return resolveMemoryPair(g);
}
function memoryStorage() { const store = new Map(); return { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) }; }

test("every original arrangement and picture set deals distinct pairs without missing artwork", () => {
  for (const set of MEMORY_SETS) {
    assert.ok(existsSync(new URL(`../${set.image}`, import.meta.url)));
    assert.equal(new Set(set.cards.map(card => card.id)).size, 12);
    for (const layout of MEMORY_LAYOUTS) for (let seed = 1; seed <= 30; seed++) {
      const g = createMemoryGame(settings({ set: set.id, tiles: layout.tiles }), rng(seed));
      assert.equal(g.deck.length, layout.tiles);
      const counts = new Map(); for (const card of g.deck) counts.set(card.id, (counts.get(card.id) || 0) + 1);
      assert.equal(counts.size, layout.tiles / 2); assert.ok([...counts.values()].every(count => count === 2));
      assert.equal(legalMemoryCards(g).length, layout.tiles);
    }
  }
});

test("double taps, invalid cards, and out-of-turn taps cannot change the board", () => {
  const g = game({ mode: "local" });
  assert.equal(flipMemoryCard(g, -1), null); assert.equal(flipMemoryCard(g, 16), null); assert.equal(flipMemoryCard(g, 0, 1), null);
  assert.equal(g.started, false); assert.ok(flipMemoryCard(g, 0)); assert.equal(g.started, true);
  assert.equal(flipMemoryCard(g, 0), null); assert.equal(flipMemoryCard(g, "1"), null);
  assert.equal(g.flipped.length, 1); assert.ok(flipMemoryCard(g, 1));
  assert.equal(g.phase, "reveal"); assert.equal(flipMemoryCard(g, 2), null); assert.equal(g.moves, 1);
});

test("a mismatch is visible until resolution and rejects input until both cards close", () => {
  const g = game({ mode: "local", players: 3 });
  const a = 0, b = g.deck.findIndex(card => card.id !== g.deck[a].id);
  flipMemoryCard(g, a); flipMemoryCard(g, b);
  assert.deepEqual(g.flipped, [a, b]); assert.equal(g.turn, 0);
  assert.equal(resolveMemoryPair(g).matched, false); assert.equal(g.turn, 1); assert.equal(g.phase, "closing");
  assert.deepEqual(g.scores, [0, 0, 0]); assert.equal(flipMemoryCard(g, a), null);
  assert.equal(resolveMemoryPair(g), null); assert.equal(finishMemoryClose(g), true); assert.equal(finishMemoryClose(g), false);
  assert.equal(legalMemoryCards(g).length, 16);
});

test("two to four players take turns on misses; a match keeps the turn and cannot score twice", () => {
  for (const players of [2, 3, 4]) {
    const g = game({ mode: "local", players });
    for (let i = 0; i < players + 2; i++) { pair(g, false); finishMemoryClose(g); assert.equal(g.turn, (i + 1) % players); }
    const turn = g.turn, result = pair(g);
    assert.equal(g.turn, turn); assert.equal(g.scores[turn], 1); assert.equal(g.matches, 1);
    assert.equal(flipMemoryCard(g, result.indices[0]), null); assert.equal(resolveMemoryPair(g), null);
    assert.equal(g.scores[turn], 1); assert.equal(g.owners[result.indices[0]], turn);
  }
  const solo = game(); pair(solo, false); finishMemoryClose(solo); assert.equal(solo.turn, 0);
});

test("complete boards stop accepting cards and ties share the same winning place", () => {
  const g = game({ mode: "local", players: 2, tiles: 8 });
  pair(g); pair(g); pair(g, false); finishMemoryClose(g); pair(g); pair(g);
  assert.equal(g.phase, "complete"); assert.deepEqual(g.scores, [2, 2]); assert.deepEqual(memoryWinners(g), [0, 1]);
  assert.equal(flipMemoryCard(g, 0), null); assert.equal(resolveMemoryPair(g), null); assert.equal(g.matches, 4);
  const solo = game({ tiles: 8 }); while (solo.phase !== "complete") pair(solo);
  assert.deepEqual(memoryWinners(solo), [0]);
});

test("locked pictures and backs fall back safely; purchases preserve independent game choices", () => {
  const requested = { mode: "computer", tiles: 24, difficulty: "expert", set: "tidepool", back: "lunar", names: ["   Ada   ", "x".repeat(50)] };
  const locked = normalizeMemorySettings(requested);
  assert.equal(locked.set, "wonders"); assert.equal(locked.back, "atlas"); assert.equal(locked.names[0], "Ada"); assert.equal(locked.names[1].length, 20);
  const unlocked = normalizeMemorySettings(requested, ["memory:tidepool", "memory:lunar"]);
  assert.equal(unlocked.set, "tidepool"); assert.equal(unlocked.back, "lunar"); assert.equal(unlocked.difficulty, "expert"); assert.equal(unlocked.tiles, 24);
  assert.equal(normalizeMemorySettings(null).tiles, 16);
  assert.equal(normalizeMemorySettings({ mode: "fake", difficulty: "__proto__", tiles: 999, set: "fake", players: 99 }).mode, "solo");
  const g = createMemoryGame(unlocked, rng(9)); unlocked.names[0] = "Changed"; unlocked.difficulty = "easy";
  assert.equal(g.settings.names[0], "Ada"); assert.equal(g.settings.difficulty, "expert");
});

test("only human matches count; victory bonuses require a completed, strictly won board", () => {
  for (const tiles of [8, 12, 16, 20, 24]) for (const [difficulty, rate] of Object.entries(MEMORY_REWARDS)) {
    const pairs = tiles / 2, p = { tiles, difficulty, mode: "computer", humanMatches: pairs - 1, computerMatches: 1 };
    assert.equal(memoryRewardTotal(p), (pairs - 1) * rate.match);
    assert.equal(memoryRewardTotal({ ...p, complete: true }), (pairs - 1) * rate.match + Math.round(rate.win * pairs / 8));
    assert.equal(memoryRewardTotal({ ...p, complete: true, humanMatches: 1, computerMatches: pairs - 1 }), rate.match);
    assert.equal(memoryRewardTotal({ ...p, complete: true, humanMatches: pairs / 2, computerMatches: pairs / 2 }), pairs / 2 * rate.match);
    assert.equal(memoryRewardTotal({ ...p, complete: true, computerMatches: 0 }), (pairs - 1) * rate.match);
    assert.equal(memoryRewardTotal({ ...p, mode: "local", complete: true }), 0);
    assert.equal(memoryRewardTotal({ ...p, mode: "solo", complete: true }), pairs - 1);
  }
  assert.equal(memoryRewardTotal({ mode: "computer", tiles: 16, difficulty: "__proto__", humanMatches: 8 }), 0);
  assert.equal(memoryRewardTotal({ mode: "solo", tiles: 16, humanMatches: Infinity }), 0);
  assert.equal(memoryRewardTotal({ mode: "solo", tiles: 99, humanMatches: 8 }), 0);
});

test("match receipts survive reload, award each victory once, and buy cross-game cosmetics", async () => {
  const storage = memoryStorage(), wallet = createArcadeWallet({ storage }), g = game({ mode: "computer", difficulty: "expert", tiles: 24 });
  const session = createRewardSession("memory", wallet);
  while (g.phase !== "complete") {
    pair(g); const progress = memoryProgress(g);
    await Promise.all([session.award(progress), session.award(progress)]);
  }
  assert.equal(wallet.getState().coins, 12 * 4 + 45);
  assert.equal(rewardTotal("memory", memoryProgress(g)), 93);
  await wallet.claim("flappy", "other-game", 147);
  const purchase = await wallet.purchase("memory:tidepool"); assert.equal(purchase.ok, true); assert.equal(wallet.getState().coins, 0);
  const reloaded = createArcadeWallet({ storage });
  assert.ok(reloaded.getState().owned.includes("memory:tidepool"));
  assert.equal((await reloaded.claim("memory", session.id, 93)).coins, 0);
  assert.equal((await reloaded.purchase("memory:tidepool")).purchased, false);
  assert.equal(JSON.parse(storage.getItem(ARCADE_STORAGE_KEY)).coins, 0);
  assert.deepEqual(charactersForGame("memory"), []);
});

test("a computer cannot know a hidden pair or choose an unavailable card", () => {
  const cpu = createMemoryOpponent({ difficulty: "expert", random: () => 0 });
  assert.equal(cpu.choose([]), null);
  // With no observations, unseen cards are equivalent: no secret deck input exists.
  assert.equal(cpu.choose([6, 2, 5, 8]), 6);
  cpu.observe({ index: 2, id: "fox" }); cpu.observe({ index: 8, id: "fox" });
  assert.equal(cpu.choose([6, 2, 5, 8]), 2);
  assert.equal(cpu.choose([6, 5, 8], { index: 2, id: "fox" }), 8);
  cpu.remove([2, 8]); assert.equal(cpu.choose([6, 5]), 6);
  assert.equal(cpu.choose([5], { index: 6, id: "fox" }), 5);
});

test("higher levels recall more revealed pairs but even expert sometimes makes mistakes", () => {
  const results = Object.keys(MEMORY_REWARDS).map(difficulty => {
    let successes = 0;
    for (let seed = 1; seed <= 1800; seed++) {
      const cpu = createMemoryOpponent({ difficulty, random: rng(seed * 67) });
      for (let i = 0; i < 12; i++) cpu.observe({ index: i, id: `pair-${i % 6}` });
      if (cpu.choose([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], { index: 0, id: "pair-0" }) === 6) successes++;
    }
    return successes;
  });
  for (let i = 1; i < results.length; i++) assert.ok(results[i] > results[i - 1], results.join(","));
  assert.ok(results[3] < 1800);
});

test("blind picks give every unknown position equal odds at every difficulty", () => {
  for (const size of [7, 15, 23]) {
    const legal = Array.from({ length: size }, (_, i) => i * 3 + 2), countsByLevel = [];
    for (const difficulty of Object.keys(MEMORY_REWARDS)) {
      const counts = Array(size).fill(0), draw = rng(95623), cpu = createMemoryOpponent({ difficulty, random: rng(41), guessRandom: draw });
      // The caller alone knows where any hidden partner is. Its location and
      // the first picture cannot reach the positional random draw.
      for (let attempt = 0; attempt < 23000; attempt++) {
        cpu.thinkingDelay();
        const choice = cpu.choose(legal, { index: 0, id: attempt % 2 ? "fox" : "whale" });
        counts[legal.indexOf(choice)]++;
        assert.equal(cpu.lastDecision.kind, "guess");
        assert.equal(cpu.lastDecision.options, size);
      }
      const expected = 23000 / size;
      for (const count of counts) assert.ok(Math.abs(count - expected) < expected * .12, `${difficulty}: ${counts}`);
      countsByLevel.push(counts);
    }
    for (const counts of countsByLevel.slice(1)) assert.deepEqual(counts, countsByLevel[0]);
  }
});

test("choice explanations require public memories and distinguish forced choices", () => {
  const cpu = createMemoryOpponent({ difficulty: "expert", random: () => 0, guessRandom: () => .5 });
  cpu.observe({ index: 0, id: "fox" });
  cpu.observe({ index: 1, id: "whale" });
  assert.equal(cpu.choose([1, 2, 3, 4], { index: 0, id: "fox" }), 3);
  assert.deepEqual(cpu.lastDecision, { index: 3, kind: "guess", options: 3 });
  // Only after a public reveal can a hidden partner be recalled.
  cpu.observe({ index: 3, id: "fox" });
  assert.equal(cpu.choose([0, 1, 2, 3, 4]), 0);
  assert.equal(cpu.lastDecision.kind, "remembered-pair");
  assert.equal(cpu.choose([1, 2, 3, 4], { index: 0, id: "fox" }), 3);
  assert.equal(cpu.lastDecision.kind, "remembered-match");
  cpu.remove([0, 3]);
  cpu.choose([1, 2, 4]); assert.equal(cpu.lastDecision.kind, "guess");
  assert.equal(cpu.choose([4], { index: 2, id: "whale" }), 4);
  assert.equal(cpu.lastDecision.kind, "only-card");
  assert.equal(cpu.choose([]), null); assert.equal(cpu.lastDecision, null);
});

test("a player using only remembered public cards can beat every computer level", () => {
  const wins = {};
  for (const difficulty of Object.keys(MEMORY_REWARDS)) {
    wins[difficulty] = 0;
    for (let seed = 1; seed <= 140; seed++) {
      const g = createMemoryGame(settings({ mode: "computer", difficulty, tiles: 16 }), rng(seed));
      const cpu = createMemoryOpponent({ difficulty, random: rng(seed + 600) }), seen = new Map(); let guard = 0;
      while (g.phase !== "complete" && guard++ < 500) {
        const legal = legalMemoryCards(g), firstIndex = g.flipped[0], first = firstIndex === undefined ? null : { index: firstIndex, id: g.deck[firstIndex].id };
        let index;
        if (g.turn === 1) index = cpu.choose(legal, first);
        else {
          index = first ? legal.find(i => seen.get(i) === first.id) : legal.find(i => seen.has(i) && legal.some(j => j !== i && seen.get(j) === seen.get(i)));
          index ??= legal.find(i => !seen.has(i)) ?? legal[0];
        }
        const exposed = flipMemoryCard(g, index); assert.ok(exposed); seen.set(index, exposed.id); cpu.observe(exposed);
        if (g.phase === "reveal") {
          const outcome = resolveMemoryPair(g);
          if (outcome.matched) { cpu.remove(outcome.indices); outcome.indices.forEach(i => seen.delete(i)); }
          else finishMemoryClose(g);
        }
      }
      assert.equal(g.phase, "complete"); assert.equal(g.scores.reduce((a, b) => a + b), 8);
      if (g.scores[0] > g.scores[1]) wins[difficulty]++;
    }
    assert.ok(wins[difficulty] >= 20, `${difficulty}: only ${wins[difficulty]} human wins`);
  }
});

