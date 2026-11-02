import { AIRCRAFT, APPROACHES } from "./runway-engine.js";
import { HOME_AIRFIELDS, WEATHER } from "./free-flight-world.js";

export const FLIGHT_SAVE_KEYS = Object.freeze({ runway: "cooper-runway-glide-v2", freeflight: "cooper-free-flight-v1" });
const choice = (value, values, fallback) => values.includes(value) ? value : fallback;
function readData(game, storage) {
  try {
    const value = JSON.parse((storage ?? globalThis.localStorage)?.getItem(FLIGHT_SAVE_KEYS[game]) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export function normalizeFlightSettings(game, saved = {}) {
  const common = {
    aircraft: choice(saved.aircraft, Object.keys(AIRCRAFT), "passenger"),
    assist: saved.assist !== false, invertPitch: saved.invertPitch === true, effects: saved.effects !== false,
  };
  if (game === "freeflight") return { ...common,
    location: choice(saved.location, HOME_AIRFIELDS.map(field => field.id), "azure"),
    departure: choice(saved.departure, ["airborne", "runway"], "airborne"),
    weather: choice(saved.weather, Object.keys(WEATHER), "breeze"),
  };
  const level = APPROACHES.find(level => level.id === saved.level) || APPROACHES[0];
  return { ...common, aircraft: level.allowed.includes(common.aircraft) ? common.aircraft : level.allowed[0],
    level: level.id, guides: saved.guides !== false, voice: saved.voice !== false,
    towerVoice: typeof saved.towerVoice === "string" ? saved.towerVoice : "auto",
  };
}

export const readFlightSettings = (game, storage) => normalizeFlightSettings(game, readData(game, storage));
export const readFreeFlightSettings = storage => readFlightSettings("freeflight", storage);
export function readRunwaySave(storage) {
  const data = readData("runway", storage);
  const records = data.records && typeof data.records === "object" && !Array.isArray(data.records) ? data.records : {};
  return { ...normalizeFlightSettings("runway", data), records };
}

// Aircraft selection falls back to First approach when the current runway is
// incompatible. Selecting a runway instead chooses one of its allowed planes,
// matching the existing Runway Glide setup controls.
export function changeFlightSetting(game, current, key, value) {
  const next = { ...current, [key]: value };
  if (game === "runway" && key === "aircraft") {
    const level = APPROACHES.find(level => level.id === current.level);
    if (!level?.allowed.includes(value)) next.level = "training";
  }
  return normalizeFlightSettings(game, next);
}

export function writeFlightSettings(game, next, storage) {
  if (!Object.hasOwn(FLIGHT_SAVE_KEYS, game)) return false;
  try {
    const previous = readData(game, storage), combined = { ...previous, ...next };
    // Merge preferences without losing Runway Glide records or future save fields.
    (storage ?? globalThis.localStorage).setItem(FLIGHT_SAVE_KEYS[game], JSON.stringify({ ...combined, ...normalizeFlightSettings(game, combined) }));
    return true;
  } catch { return false; }
}
