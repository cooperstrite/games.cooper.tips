import { memoryLayout, memorySet } from "./memory-config.js";

function shuffle(values, random) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.max(0, Math.min(0.999999999, Number(random()) || 0)) * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
export function createMemoryGame(settings, random = Math.random) {
  const layout = memoryLayout(settings.tiles), selected = shuffle([...memorySet(settings.set).cards], random).slice(0, layout.tiles / 2);
  const players = settings.mode === "solo" ? 1 : settings.mode === "local" ? Math.max(2, Math.min(4, settings.players || 2)) : 2;
  return {
    settings: { ...settings, tiles: layout.tiles, names: [...(settings.names || [])] },
    deck: shuffle(selected.flatMap(card => [{ ...card }, { ...card }]), random),
    owners: Array(layout.tiles).fill(null), flipped: [], scores: Array(players).fill(0),
    turn: 0, moves: 0, matches: 0, phase: "choose", started: false,
  };
}
export function legalMemoryCards(game) {
  if (game.phase !== "choose") return [];
  return game.owners.flatMap((owner, index) => owner === null && !game.flipped.includes(index) ? [index] : []);
}
export function flipMemoryCard(game, index, player = game.turn) {
  if (player !== game.turn || !legalMemoryCards(game).includes(index)) return null;
  game.started = true;
  game.flipped.push(index);
  if (game.flipped.length === 2) { game.phase = "reveal"; game.moves++; }
  return { index, id: game.deck[index].id, label: game.deck[index].label };
}
export function resolveMemoryPair(game) {
  if (game.phase !== "reveal" || game.flipped.length !== 2) return null;
  const [a, b] = game.flipped, player = game.turn;
  const matched = game.deck[a].id === game.deck[b].id;
  if (matched) {
    game.owners[a] = player; game.owners[b] = player;
    game.scores[player]++; game.matches++;
  } else game.turn = (game.turn + 1) % game.scores.length;
  game.flipped = [];
  game.phase = game.matches * 2 === game.deck.length ? "complete" : matched ? "choose" : "closing";
  return { matched, indices: [a, b], player, label: game.deck[a].label, complete: game.phase === "complete" };
}
// Wait for both physical cards to close before accepting another turn.
export function finishMemoryClose(game) {
  if (game.phase === "closing") { game.phase = "choose"; return true; }
  return false;
}
export function memoryWinners(game) {
  if (game.phase !== "complete") return [];
  const best = Math.max(...game.scores);
  return game.scores.flatMap((score, index) => score === best ? [index] : []);
}
export function memoryProgress(game) {
  return { mode: game.settings.mode, difficulty: game.settings.difficulty, tiles: game.deck.length,
    humanMatches: game.scores[0], computerMatches: game.settings.mode === "computer" ? game.scores[1] : 0,
    complete: game.phase === "complete" };
}
