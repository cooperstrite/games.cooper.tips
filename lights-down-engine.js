// Classic Lights Out: a press flips only itself and its four orthogonal neighbors.
export const LIGHTS_SIZES = Object.freeze([3, 4, 5, 6, 7]);
export const LIGHTS_DIFFICULTIES = Object.freeze({
  easy: { name: 'Easy', fraction: .16 },
  normal: { name: 'Normal', fraction: .28 },
  hard: { name: 'Hard', fraction: .42 },
});
const chapters = [
  ['First light', 'A little ripple', 'Side by side', 'Crossed wires', 'Small wonder'],
  ['Afterglow', 'Four corners', 'A different angle', 'Night shift', 'Pattern finder'],
  ['The original', 'Chain reaction', 'In the balance', 'Quiet current', 'Midnight logic'],
  ['Wider horizons', 'Switchcraft', 'Hidden connections', 'Deep circuit', 'The long way home'],
  ['City of lights', 'Signal hunter', 'Almost midnight', 'The final flicker', 'Perfect darkness'],
];
const targets = [[1, 2, 3, 4, 5], [3, 4, 5, 6, 7], [5, 6, 8, 10, 12], [8, 10, 12, 14, 16], [10, 13, 16, 19, 22]];
export const LIGHTS_LEVELS = Object.freeze(chapters.flatMap((names, chapter) => names.map((name, stage) => Object.freeze({
  id: chapter * 5 + stage, name, size: chapter + 3, target: targets[chapter][stage], seed: 7319 + chapter * 1097 + stage * 331,
}))));
const systems = new Map(), puzzles = new Map();
const validSize = size => LIGHTS_SIZES.includes(size);
const validBoard = (board, size) => validSize(size) && Array.isArray(board) && board.length === size * size && board.every(v => v === 0 || v === 1 || typeof v === 'boolean');
const countBits = bits => { let n = 0; while (bits) { bits &= bits - 1n; n++; } return n; };
const bit = index => 1n << BigInt(index);

export function affectedLights(size, index) {
  if (!validSize(size) || !Number.isInteger(index) || index < 0 || index >= size * size) return [];
  const row = Math.floor(index / size), col = index % size, result = [index];
  if (row > 0) result.push(index - size);
  if (row < size - 1) result.push(index + size);
  if (col > 0) result.push(index - 1);
  if (col < size - 1) result.push(index + 1);
  return result;
}
export function toggleLights(board, size, index) {
  const next = board.slice();
  for (const i of affectedLights(size, index)) next[i] = next[i] ? 0 : 1;
  return next;
}
function system(size) {
  if (systems.has(size)) return systems.get(size);
  const n = size * size;
  const rows = Array.from({ length: n }, (_, i) => affectedLights(size, i).reduce((mask, j) => mask | bit(j), 0n));
  const transform = Array.from({ length: n }, (_, i) => bit(i)), pivots = [];
  let rank = 0;
  for (let col = 0; col < n; col++) {
    const pivot = rows.findIndex((row, i) => i >= rank && (row & bit(col)) !== 0n);
    if (pivot < 0) continue;
    [rows[rank], rows[pivot]] = [rows[pivot], rows[rank]];
    [transform[rank], transform[pivot]] = [transform[pivot], transform[rank]];
    for (let r = 0; r < n; r++) if (r !== rank && (rows[r] & bit(col))) {
      rows[r] ^= rows[rank]; transform[r] ^= transform[rank];
    }
    pivots.push(col); rank++;
  }
  const basis = [];
  for (let col = 0; col < n; col++) if (!pivots.includes(col)) {
    let vector = bit(col);
    for (let r = 0; r < rank; r++) if (rows[r] & bit(col)) vector |= bit(pivots[r]);
    basis.push(vector);
  }
  const result = { transform, pivots, basis, rank, n }; systems.set(size, result); return result;
}
export function solveLights(board, size) {
  if (!validBoard(board, size)) return null;
  const { transform, pivots, basis, rank, n } = system(size);
  const mask = board.reduce((value, on, i) => on ? value | bit(i) : value, 0n);
  const rhs = transform.map(row => countBits(row & mask) % 2);
  if (rhs.slice(rank).some(Boolean)) return null;
  let particular = 0n;
  for (let r = 0; r < rank; r++) if (rhs[r]) particular |= bit(pivots[r]);
  let best = particular, minimum = countBits(best);
  // Enumerate the nullspace so par and hints use a shortest solution, not just any solution.
  for (let choice = 1; choice < 2 ** basis.length; choice++) {
    let candidate = particular;
    basis.forEach((vector, i) => { if (choice & (1 << i)) candidate ^= vector; });
    const length = countBits(candidate);
    if (length < minimum || (length === minimum && candidate < best)) { best = candidate; minimum = length; }
  }
  return Array.from({ length: n }, (_, i) => i).filter(i => (best & bit(i)) !== 0n);
}
function randomSource(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
export function makeLightsPuzzle({ size = 5, target = 7, seed = Date.now(), key = 'free' } = {}) {
  if (!validSize(size)) size = 5;
  target = Math.max(1, Math.min(size * size, Math.round(Number.isFinite(target) ? target : 7)));
  const random = randomSource(seed), total = size * size;
  let best;
  // Start dark and scramble with legal moves: every board is solvable by construction.
  // A bounded search avoids hanging on a requested par beyond a board's maximum.
  for (let attempt = 0; attempt < 96; attempt++) {
    const indices = Array.from({ length: total }, (_, i) => i);
    for (let i = total - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
    let board = Array(total).fill(0);
    for (const index of indices.slice(0, target)) board = toggleLights(board, size, index);
    const par = solveLights(board, size).length;
    if (par && (!best || par > best.par)) best = { board, size, par, key };
    if (par === target) return best;
  }
  return best || makeLightsPuzzle({ size, target: 1, seed, key });
}
export function lightsLevel(id) {
  const level = LIGHTS_LEVELS[id] || LIGHTS_LEVELS[0];
  if (!puzzles.has(level.id)) puzzles.set(level.id, level.id === 0
    ? { size: 3, board: toggleLights(Array(9).fill(0), 3, 4), par: 1, key: 'level-0' }
    : makeLightsPuzzle({ ...level, key: `level-${level.id}` }));
  const puzzle = puzzles.get(level.id); return { ...puzzle, board: puzzle.board.slice() };
}
export function createLightsRound(puzzle) {
  return { ...puzzle, initial: puzzle.board.slice(), board: puzzle.board.slice(), history: [], moves: 0, assisted: false, solved: false };
}
export function pressLight(state, index) {
  if (state.solved || !affectedLights(state.size, index).length) return false;
  state.board = toggleLights(state.board, state.size, index); state.history.push(index); state.moves++;
  state.solved = state.board.every(v => !v); return true;
}
export function undoLight(state) {
  if (state.solved || !state.history.length) return false;
  state.board = toggleLights(state.board, state.size, state.history.pop()); state.moves--; return true;
}
export function lightsHint(state) {
  if (state.solved) return [];
  const solution = solveLights(state.board, state.size);
  if (solution?.length) state.assisted = true;
  return solution || [];
}
export function lightsStars(state) {
  if (!state.solved) return 0;
  if (state.assisted) return 1;
  return state.moves <= state.par ? 3 : state.moves <= state.par + Math.max(2, Math.ceil(state.par / 2)) ? 2 : 1;
}

const SAVE_KEY = 'cooper-lights-down-v1';
function normalizeProgress(value = {}) {
  if (!value || typeof value !== 'object') value = {};
  const progress = { mode: value.mode === 'free' ? 'free' : 'journey', level: Number.isInteger(value.level) && LIGHTS_LEVELS[value.level] ? value.level : 0,
    size: validSize(value.size) ? value.size : 5, difficulty: Object.hasOwn(LIGHTS_DIFFICULTIES, value.difficulty) ? value.difficulty : 'normal', sound: value.sound !== false, completed: {} };
  for (const level of LIGHTS_LEVELS) {
    const record = value.completed?.[level.id];
    if (record && Number.isInteger(record.stars) && record.stars >= 1 && record.stars <= 3 && Number.isInteger(record.moves) && record.moves > 0 && record.moves <= 100000)
      progress.completed[level.id] = { stars: record.stars, moves: record.moves };
  }
  return progress;
}
export function readLightsProgress(storage) {
  try { storage ??= globalThis.localStorage; return normalizeProgress(JSON.parse(storage?.getItem(SAVE_KEY) || '{}')); }
  catch { return normalizeProgress(); }
}
export function saveLightsProgress(progress, storage) {
  try { storage ??= globalThis.localStorage; storage?.setItem(SAVE_KEY, JSON.stringify(normalizeProgress(progress))); } catch { /* Puzzles remain playable without storage. */ }
}
export function recordLightsWin(progress, id, state) {
  if (!LIGHTS_LEVELS[id] || !state.solved || state.key !== `level-${id}`) return false;
  const old = progress.completed[id];
  progress.completed[id] = { stars: Math.max(old?.stars || 0, lightsStars(state)), moves: Math.min(old?.moves || Infinity, state.moves) };
  return true;
}
