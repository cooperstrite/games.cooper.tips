import { findArcadeItem, ARCADE_ITEMS } from "./catalog.js";
import { ARCADE_GAMES } from "./games.js";

export const ARCADE_STORAGE_KEY = "cooper-arcade-v1";
const LIMIT = 1000000000;
const amount = value => Number.isSafeInteger(value) && value >= 0 ? Math.min(LIMIT, value) : 0;
const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
function parse(value) { try { return object(JSON.parse(value)); } catch { return {}; } }
export function readArcadeState(saved = {}) {
  saved = object(saved);
  const owned = [...new Set(Array.isArray(saved.owned) ? saved.owned.filter(id => !!findArcadeItem(id)) : [])];
  return {
    version: 1, coins: amount(saved.coins), earned: amount(saved.earned),
    owned,
    equipped: Object.fromEntries(Object.entries(object(saved.equipped)).filter(([game, id]) => findArcadeItem(id)?.games.includes(game) && owned.includes(id))),
    rewards: Object.fromEntries(Object.entries(object(saved.rewards)).filter(([id, value]) => id.length < 200 && Number.isSafeInteger(value) && value >= 0).map(([id, value]) => [id, amount(value)])),
    migrations: { flappy: saved.migrations?.flappy === true },
    history: (Array.isArray(saved.history) ? saved.history : []).filter(entry => entry && typeof entry.label === "string" && Number.isSafeInteger(entry.coins)).slice(-30).map(entry => ({ label: entry.label.slice(0, 100), coins: entry.coins })),
  };
}

export function createArcadeWallet({ storage, locks, events } = {}) {
  let memory = readArcadeState(), disposed = false, storageAvailable = true;
  const subscribers = new Set();
  function read() {
    try { const raw = storageAvailable && storage?.getItem(ARCADE_STORAGE_KEY); if (raw) memory = readArcadeState(parse(raw)); } catch { storageAvailable = false; }
    return structuredClone(memory);
  }
  function emit() { if (!disposed) for (const callback of subscribers) callback(read()); }
  const onStorage = event => { if (!event.key || event.key === ARCADE_STORAGE_KEY) emit(); };
  events?.addEventListener("storage", onStorage);
  events?.addEventListener("cooper-arcade-change", emit);
  function write(state) {
    memory = readArcadeState(state);
    try { if (storageAvailable) storage?.setItem(ARCADE_STORAGE_KEY, JSON.stringify(memory)); } catch { storageAvailable = false; }
    if (events) events.dispatchEvent(new Event("cooper-arcade-change")); else emit();
  }
  function migrate(state) {
    if (state.migrations.flappy) return false;
    let legacy = {};
    try { legacy = object(parse(storage?.getItem("cooper-flappy-bird-v1")).wallet); } catch { /* No legacy wallet. */ }
    state.coins = Math.min(LIMIT, state.coins + amount(legacy.coins));
    state.earned = Math.min(LIMIT, state.earned + amount(legacy.earned));
    for (const id of Array.isArray(legacy.owned) ? legacy.owned : []) {
      const item = findArcadeItem(`flappy:${id}`); if (item && !state.owned.includes(item.id)) state.owned.push(item.id);
    }
    state.migrations.flappy = true; return true;
  }
  // Migration is repeatable and only reads the old save. Old settings and records stay intact.
  const initial = read(); if (migrate(initial)) write(initial);
  async function transaction(change) {
    const work = () => { const state = read(); migrate(state); const result = change(state); if (result.changed) write(state); return result; };
    return locks?.request ? locks.request(ARCADE_STORAGE_KEY, work) : work();
  }
  return {
    getState: read,
    subscribe(callback) { subscribers.add(callback); callback(read()); return () => subscribers.delete(callback); },
    claim(gameId, runId, totalCoins) {
      if (!Object.hasOwn(ARCADE_GAMES, gameId) || typeof runId !== "string" || runId.length > 150 || !runId || !Number.isSafeInteger(totalCoins) || totalCoins < 0) return Promise.resolve({ changed: false, coins: 0 });
      return transaction(state => {
        const key = `${gameId}:${runId}`, previous = state.rewards[key] || 0, total = amount(totalCoins);
        const coins = Math.max(0, Math.min(LIMIT - state.coins, total - previous));
        if (total <= previous) return { changed: false, coins: 0 };
        state.rewards[key] = total; state.coins += coins; state.earned = Math.min(LIMIT, state.earned + coins);
        if (coins) state.history.push({ label: gameId, coins });
        return { changed: true, coins };
      });
    },
    purchase(id) {
      return transaction(state => {
        const item = findArcadeItem(id);
        if (!item) return { changed: false, ok: false, reason: "unknown" };
        if (state.owned.includes(id)) return { changed: false, ok: true, purchased: false, item };
        if (state.coins < item.cost) return { changed: false, ok: false, reason: "coins", needed: item.cost - state.coins };
        state.coins -= item.cost; state.owned.push(id); state.history.push({ label: item.name, coins: -item.cost });
        return { changed: true, ok: true, purchased: true, item };
      });
    },
    equip(id, gameId) {
      return transaction(state => {
        if (!Object.hasOwn(ARCADE_GAMES, gameId)) return { changed: false, ok: false };
        if (id === null) { delete state.equipped[gameId]; return { changed: true, ok: true }; }
        const item = findArcadeItem(id);
        if (!item?.games.includes(gameId) || !state.owned.includes(id) || item.kind !== "collection") return { changed: false, ok: false };
        state.equipped[gameId] = id; return { changed: true, ok: true };
      });
    },
    dispose() { disposed = true; subscribers.clear(); events?.removeEventListener("storage", onStorage); events?.removeEventListener("cooper-arcade-change", emit); },
  };
}

let sharedWallet;
export function getArcadeWallet() {
  if (!sharedWallet) {
    let storage; try { storage = globalThis.localStorage; } catch { /* Storage can be disabled. */ }
    sharedWallet = createArcadeWallet({ storage, locks: globalThis.navigator?.locks, events: globalThis.window });
  }
  return sharedWallet;
}
export function flappyWalletView(state) {
  return { coins: state.coins, earned: state.earned, owned: state.owned.filter(id => id.startsWith("flappy:")).map(id => id.slice(7)) };
}
export const arcadeInventory = ARCADE_ITEMS;
