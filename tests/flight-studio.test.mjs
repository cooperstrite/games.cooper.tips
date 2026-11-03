import test from "node:test";
import assert from "node:assert/strict";
import { readFlightSettings, readRunwaySave, readFreeFlightSettings, writeFlightSettings, changeFlightSetting, FLIGHT_SAVE_KEYS } from "../flight-settings.js";
import { createFlight } from "../runway-engine.js";
import { createFreeFlight } from "../free-flight-engine.js";
import { ARCADE_ITEMS } from "../arcade/catalog.js";
import { isShopItemVisible, PUBLIC_STUDIO_GAMES } from "../arcade/games.js";
import { readArcadeState } from "../arcade/wallet.js";

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test("hiding preview games preserves owned cosmetics and isolates their shops and studios", () => {
  const publicItems = ARCADE_ITEMS.filter(item => isShopItemVisible(item));
  assert.ok(publicItems.length);
  for (const game of ["rocket", "tetris"]) {
    const cosmetics = ARCADE_ITEMS.filter(item => item.games.includes(game));
    assert.ok(cosmetics.length > 0);
    const saved = readArcadeState({ coins: 321, owned: cosmetics.map(item => item.id) });
    assert.equal(saved.coins, 321); assert.equal(saved.owned.length, cosmetics.length);
    assert.ok(!publicItems.some(item => item.games.includes(game)));
    assert.deepEqual(ARCADE_ITEMS.filter(item => isShopItemVisible(item, game)), cosmetics);
    assert.equal(PUBLIC_STUDIO_GAMES[game], undefined);
  }
  assert.ok(PUBLIC_STUDIO_GAMES.runway && PUBLIC_STUDIO_GAMES.freeflight);
});

test("aircraft studios preserve landing records, unrelated save fields, and separate game preferences", () => {
  const records = { "carrier:military": 97, "training:passenger": 83 };
  const store = storage({ [FLIGHT_SAVE_KEYS.runway]: JSON.stringify({ aircraft: "military", level: "carrier", records, futureField: 17 }), [FLIGHT_SAVE_KEYS.freeflight]: JSON.stringify({ aircraft: "bush", weather: "calm", departure: "runway", location: "summit" }) });
  const flightBefore = store.getItem(FLIGHT_SAVE_KEYS.freeflight);
  const setting = changeFlightSetting("runway", readFlightSettings("runway", store), "aircraft", "cargo");
  assert.equal(writeFlightSettings("runway", setting, store), true);
  assert.equal(store.getItem(FLIGHT_SAVE_KEYS.freeflight), flightBefore);
  assert.deepEqual(readRunwaySave(store).records, records);
  assert.equal(JSON.parse(store.getItem(FLIGHT_SAVE_KEYS.runway)).futureField, 17);
  const runwayBefore = store.getItem(FLIGHT_SAVE_KEYS.runway);
  const free = { ...readFreeFlightSettings(store), invertPitch: true, assist: false, effects: false };
  assert.equal(writeFlightSettings("freeflight", free, store), true);
  assert.deepEqual(readFreeFlightSettings(store), free);
  assert.equal(store.getItem(FLIGHT_SAVE_KEYS.runway), runwayBefore);
});

test("changing a restricted runway or aircraft produces the same playable setup in the game", () => {
  let saved = readFlightSettings("runway", storage());
  saved = changeFlightSetting("runway", saved, "level", "carrier");
  assert.equal(saved.aircraft, "military");
  let game = createFlight(saved.aircraft, saved.level, saved.assist);
  assert.equal(game.aircraft.id, "military"); assert.equal(game.level.id, "carrier");
  saved = changeFlightSetting("runway", saved, "aircraft", "bush");
  assert.equal(saved.level, "training"); assert.equal(saved.aircraft, "bush");
  saved = changeFlightSetting("runway", saved, "level", "alpine");
  game = createFlight(saved.aircraft, saved.level, saved.assist);
  assert.equal(game.aircraft.id, "bush"); assert.equal(game.level.id, "alpine");
  assert.equal(game.aircraft.fixedGear, true);
});

test("free flight uses studio aircraft, weather, location and departure without altering runway saves", () => {
  const store = storage();
  const settings = { aircraft: "cargo", location: "meridian", departure: "runway", weather: "windy", assist: false, effects: false, invertPitch: true };
  writeFlightSettings("freeflight", settings, store);
  const read = readFreeFlightSettings(store), game = createFreeFlight(read);
  assert.deepEqual(read, settings); assert.equal(game.aircraft.id, "cargo");
  assert.equal(game.assist, false); assert.equal(game.phase, "ready");
  assert.equal(store.getItem(FLIGHT_SAVE_KEYS.runway), null);
});

test("old, malformed and unavailable flight storage produces valid defaults and reports save failure", () => {
  for (const raw of ["broken", "null", "[]", "2", '{}']) {
    const store = storage(Object.fromEntries(Object.values(FLIGHT_SAVE_KEYS).map(key => [key, raw])));
    for (const game of ["runway", "freeflight"]) assert.equal(readFlightSettings(game, store).aircraft, "passenger");
  }
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(readRunwaySave(blocked).level, "training");
  assert.equal(writeFlightSettings("runway", { aircraft: "bush" }, blocked), false);
  const old = storage({ [FLIGHT_SAVE_KEYS.runway]: JSON.stringify({ level: "forest", aircraft: "cargo", voice: false, invertPitch: true, records: { "forest:bush": 80 } }) });
  const read = readRunwaySave(old);
  assert.equal(read.aircraft, "bush"); assert.equal(read.voice, false); assert.equal(read.invertPitch, true); assert.equal(read.records["forest:bush"], 80);
});
