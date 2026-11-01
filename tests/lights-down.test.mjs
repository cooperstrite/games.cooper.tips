import test from 'node:test';
import assert from 'node:assert/strict';
import { LIGHTS_SIZES, LIGHTS_LEVELS, LIGHTS_DIFFICULTIES, affectedLights, toggleLights, solveLights, makeLightsPuzzle, lightsLevel, createLightsRound, pressLight, undoLight, lightsHint, lightsStars, readLightsProgress, saveLightsProgress, recordLightsWin } from '../lights-down-engine.js';

test('a switch flips its orthogonal neighbors, with no diagonals, wrapping, or outside cells', () => {
  assert.deepEqual(affectedLights(3, 4).sort(), [1, 3, 4, 5, 7]);
  assert.deepEqual(affectedLights(3, 0).sort(), [0, 1, 3]);
  assert.deepEqual(affectedLights(3, 2).sort(), [1, 2, 5]);
  for (const size of LIGHTS_SIZES) for (let i = 0; i < size * size; i++) {
    const before = Array(size * size).fill(0), after = toggleLights(before, size, i);
    assert.deepEqual(before, Array(size * size).fill(0), 'input is not changed');
    assert.deepEqual(toggleLights(after, size, i), before, 'pressing twice cancels');
    assert.equal(after.filter(Boolean).length, affectedLights(size, i).length);
  }
  for (const index of [-1, 9, NaN, 1.5]) assert.deepEqual(affectedLights(3, index), []);
});

// An independent breadth-first search checks optimality, including 4x4 boards
// with several different solutions. The game solver uses algebra, not this search.
function shortestPaths(size) {
  const n = size * size, masks = [];
  for (let i = 0; i < n; i++) {
    let mask = 0;
    for (let j = 0; j < n; j++) if (Math.abs(Math.floor(i / size) - Math.floor(j / size)) + Math.abs(i % size - j % size) <= 1) mask |= 1 << j;
    masks.push(mask);
  }
  const distance = new Map([[0, 0]]), queue = [0];
  for (let at = 0; at < queue.length; at++) for (const mask of masks) {
    const next = queue[at] ^ mask;
    if (!distance.has(next)) { distance.set(next, distance.get(queue[at]) + 1); queue.push(next); }
  }
  return distance;
}
test('par and hints are shortest solutions for every reachable 3x3 and 4x4 board', () => {
  for (const size of [3, 4]) for (const [mask, minimum] of shortestPaths(size)) {
    let board = Array.from({ length: size * size }, (_, i) => (mask >> i) & 1);
    const solution = solveLights(board, size);
    assert.equal(solution.length, minimum, `minimum for ${size}x${size}, state ${mask}`);
    for (const index of solution) board = toggleLights(board, size, index);
    assert.ok(board.every(v => !v));
  }
});
test('solver rejects unreachable or malformed boards rather than suggesting false moves', () => {
  const distances = shortestPaths(4), missing = Array.from({ length: 65536 }, (_, i) => i).find(i => !distances.has(i));
  assert.equal(solveLights(Array.from({ length: 16 }, (_, i) => (missing >> i) & 1), 4), null);
  assert.equal(solveLights([1, 0], 3), null);
  assert.equal(solveLights(Array(9).fill('on'), 3), null);
  assert.equal(solveLights(Array(64).fill(0), 8), null);
});
test('all 25 fixed circuits meet their intended par, increase within each chapter, and solve normally', () => {
  assert.equal(LIGHTS_LEVELS.length, 25);
  const unique = new Set();
  for (const level of LIGHTS_LEVELS) {
    const puzzle = lightsLevel(level.id), state = createLightsRound(puzzle), solution = solveLights(puzzle.board, puzzle.size);
    unique.add(`${puzzle.size}:${puzzle.board.join('')}`);
    assert.equal(puzzle.par, level.target);
    assert.equal(solution.length, puzzle.par);
    assert.deepEqual(lightsLevel(level.id), puzzle, 'stable after reload');
    solution.forEach(index => assert.equal(pressLight(state, index), true));
    assert.equal(state.solved, true); assert.equal(lightsStars(state), 3);
    assert.deepEqual(lightsLevel(level.id), puzzle, 'playing does not alter the saved puzzle');
    if (level.id % 5) assert.ok(level.target > LIGHTS_LEVELS[level.id - 1].target);
  }
  assert.equal(unique.size, 25);
  assert.deepEqual(solveLights(lightsLevel(0).board, 3), [4], 'first circuit teaches the center cross');
});
test('all free-play sizes and difficulty levels produce nonempty solvable boards', () => {
  for (const size of LIGHTS_SIZES) for (const difficulty of Object.values(LIGHTS_DIFFICULTIES)) for (let seed = 1; seed <= 15; seed++) {
    const puzzle = makeLightsPuzzle({ size, target: Math.max(2, Math.round(size * size * difficulty.fraction)), seed });
    let board = puzzle.board;
    assert.ok(board.some(Boolean));
    const solution = solveLights(board, size); assert.equal(solution.length, puzzle.par);
    for (const index of solution) board = toggleLights(board, size, index);
    assert.ok(board.every(v => !v));
  }
  assert.ok(makeLightsPuzzle({ size: 4, target: 16, seed: 3 }).par > 0, 'impossible par request has a bounded fallback');
});
test('undo restores the exact board and move count, while hints cannot be undone for extra stars', () => {
  const puzzle = lightsLevel(14), state = createLightsRound(puzzle);
  assert.equal(undoLight(state), false); assert.equal(pressLight(state, -1), false);
  pressLight(state, 0); pressLight(state, 4); assert.equal(state.moves, 2);
  undoLight(state); undoLight(state); assert.deepEqual(state.board, puzzle.board); assert.equal(state.moves, 0);
  const hinted = lightsHint(state); assert.equal(state.assisted, true); assert.equal(hinted.length, puzzle.par);
  pressLight(state, 3); undoLight(state); assert.equal(state.assisted, true);
  hinted.forEach(index => pressLight(state, index)); assert.equal(lightsStars(state), 1);
  assert.equal(pressLight(state, 0), false); assert.equal(undoLight(state), false); assert.deepEqual(lightsHint(state), []);
  const replay = createLightsRound({ ...state, board: state.initial }); assert.equal(replay.assisted, false); assert.equal(replay.moves, 0);
});
test('stars reward par and close solutions; every completion earns at least one', () => {
  const state = createLightsRound(lightsLevel(3)); assert.equal(lightsStars(state), 0);
  state.solved = true; state.moves = state.par; assert.equal(lightsStars(state), 3);
  state.moves += 2; assert.equal(lightsStars(state), 2);
  state.moves += 5; assert.equal(lightsStars(state), 1);
  state.assisted = true; state.moves = state.par; assert.equal(lightsStars(state), 1);
});
test('progress persists best results without downgrading them or counting free-play wins', () => {
  let data; const storage = { getItem: () => data, setItem: (key, value) => { data = value; } }, progress = readLightsProgress(storage), state = createLightsRound(lightsLevel(0));
  assert.equal(recordLightsWin(progress, 0, state), false);
  pressLight(state, 4); assert.equal(recordLightsWin(progress, 0, state), true);
  state.assisted = true; state.moves = 9; recordLightsWin(progress, 0, state);
  assert.deepEqual(progress.completed[0], { stars: 3, moves: 1 });
  state.key = 'free'; assert.equal(recordLightsWin(progress, 0, state), false);
  progress.level = 8; progress.mode = 'free'; progress.size = 7; progress.difficulty = 'hard'; progress.sound = false;
  saveLightsProgress(progress, storage); assert.deepEqual(readLightsProgress(storage), progress);
});
test('damaged or blocked saves fall back to valid settings without losing playability', () => {
  const blocked = { getItem() { throw Error('Unavailable'); }, setItem() { throw Error('Unavailable'); } };
  const defaults = readLightsProgress(blocked); assert.equal(defaults.level, 0); assert.equal(defaults.size, 5); assert.equal(defaults.mode, 'journey');
  assert.doesNotThrow(() => saveLightsProgress(defaults, blocked));
  for (const data of ['broken', 'null', '12', '{}']) assert.deepEqual(readLightsProgress({ getItem: () => data }), defaults);
  const bad = readLightsProgress({ getItem: () => JSON.stringify({ mode: 'bad', level: 120, size: 8, difficulty: '__proto__', completed: { 0: { stars: 9, moves: -1 }, 999: { stars: 3, moves: 4 } } }) });
  assert.deepEqual(bad, defaults);
});
