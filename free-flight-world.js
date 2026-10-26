// Deterministic terrain, navigation, and landing surfaces. World units are meters.
// Rendering and collision sample the same landscape, including flattened airfields.
import { DEG, clamp } from "./runway-engine.js";

export const WORLD_CELL = 24000;
export const TERRAIN_CHUNK = 4000;
export const HOME_AIRFIELDS = Object.freeze([
  { id: "azure", name: "Azure Coast", region: "THE SUNLIT COAST", x: 0, z: 0, elevation: 22, heading: 0, length: 3200, width: 64, surface: "asphalt", description: "A long coastal runway, sandy coves, and open water." },
  { id: "pine", name: "Pine Reach", region: "THE GREEN VALLEYS", x: 12500, z: 14000, elevation: 175, heading: 55, length: 1700, width: 46, surface: "asphalt", description: "A quiet valley airfield surrounded by woodland." },
  { id: "summit", name: "Summit Basin", region: "THE HIGH COUNTRY", x: -14000, z: 19500, elevation: 730, heading: 100, length: 1100, width: 32, surface: "grass", description: "A mountain strip best suited to the Kestrel bush plane." },
  { id: "meridian", name: "Port Meridian", region: "THE EASTERN LOWLANDS", x: 22500, z: -13000, elevation: 48, heading: 330, length: 3600, width: 65, surface: "asphalt", description: "A spacious airport with room for the heavy cargo aircraft." },
  { id: "glasswater", name: "Glasswater Island", region: "THE OUTER ISLANDS", x: -19000, z: -11500, elevation: 18, heading: 30, length: 2600, width: 54, surface: "asphalt", description: "An island stop between long stretches of blue water." },
  { id: "northlight", name: "Northlight", region: "THE NORTHERN HILLS", x: 3000, z: 33000, elevation: 250, heading: 20, length: 2900, width: 58, surface: "asphalt", description: "Rolling hills and a broad runway beyond the first mountain range." },
]);
export const WEATHER = Object.freeze({
  calm: { name: "Calm skies", crosswind: 0, headwind: 0, gust: 0 },
  breeze: { name: "Coastal breeze", crosswind: 2.5, headwind: 2, gust: .7 },
  windy: { name: "Gusty afternoon", crosswind: 5, headwind: 4, gust: 2.5 },
});
export const heading360 = value => ((value % 360) + 360) % 360;
export const headingDifference = (a, b) => ((a - b + 540) % 360) - 180;
export function seeded(seed) { let n = seed; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
export function hash2(x, z) { let n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; }
const smooth = n => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };
function noise(x, z) {
  const a = Math.floor(x), b = Math.floor(z), u = smooth(x - a), v = smooth(z - b);
  const low = hash2(a, b) * (1 - u) + hash2(a + 1, b) * u;
  return low * (1 - v) + (hash2(a, b + 1) * (1 - u) + hash2(a + 1, b + 1) * u) * v;
}
export function naturalHeight(x, z) {
  const land = Math.sin((x + 4700) / 11500) + .64 * Math.cos((z - 3500) / 14500) + (noise(x / 17000 + 8, z / 17000 + 8) - .5) * 1.4;
  const ridges = Math.pow(noise(x / 10500 + 61, z / 10500 + 19), 3) * 1850;
  const mountains = ridges * smooth((land + .15) / .95);
  const wild = land * 125 - 68 + mountains + (noise(x / 2000, z / 2000) - .5) * 80 + (noise(x / 550 + 4, z / 550) - .5) * 11;
  const coastalBlend = 1 - smooth((Math.hypot(x, z) - 12000) / 16000);
  const coast = (x + 2800 + Math.sin(z / 4000) * 600) * .035 + (noise(x / 1700 + 3, z / 1700) - .5) * 22;
  const highCountry = Math.exp(-Math.pow((x + 12000) / 8200, 2) - Math.pow((z - 20000) / 11500, 2)) * (900 + noise(x / 3000, z / 3000) * 650);
  return wild + (coast - wild) * coastalBlend + highCountry;
}
const fieldCache = new Map();
export function sectorAirfield(cx, cz) {
  const key = cx + ":" + cz;
  if (fieldCache.has(key)) return fieldCache.get(key);
  const r = seeded((Math.imul(cx, 23497) ^ Math.imul(cz, 49999) ^ 7813) >>> 0);
  const x = (cx + .2 + r() * .6) * WORLD_CELL, z = (cz + .2 + r() * .6) * WORLD_CELL;
  let field = null;
  if (!HOME_AIRFIELDS.some(a => Math.hypot(a.x - x, a.z - z) < 11000)) {
    const grass = r() < .23, elevation = Math.max(18, Math.round(naturalHeight(x, z)));
    field = { id: "field-" + key, name: (grass ? "Meadow" : "Frontier") + " " + cx + "/" + cz, region: "THE OPEN FRONTIER", x, z, elevation, heading: Math.floor(r() * 36) * 10,
      length: grass ? 1200 : 3000, width: grass ? 34 : 56, surface: grass ? "grass" : "asphalt", description: grass ? "A quiet grass strip. Short-field aircraft are recommended." : "A remote airfield for a break, a landing, or another departure." };
  }
  fieldCache.set(key, field);
  if (fieldCache.size > 256) fieldCache.delete(fieldCache.keys().next().value);
  return field;
}
export function airfieldsNear(x, z, radius = 32000) {
  const fields = HOME_AIRFIELDS.filter(a => Math.hypot(a.x - x, a.z - z) < radius + a.length);
  for (let cz = Math.floor((z - radius) / WORLD_CELL); cz <= Math.floor((z + radius) / WORLD_CELL); cz++) for (let cx = Math.floor((x - radius) / WORLD_CELL); cx <= Math.floor((x + radius) / WORLD_CELL); cx++) {
    const a = sectorAirfield(cx, cz);
    if (a && Math.hypot(a.x - x, a.z - z) < radius + a.length) fields.push(a);
  }
  return fields.sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
}
export function fieldCoordinates(field, x, z) {
  const sin = Math.sin(field.heading * DEG), cos = Math.cos(field.heading * DEG), dx = x - field.x, dz = z - field.z;
  return { across: dx * cos - dz * sin, along: dx * sin + dz * cos };
}
export function fieldPosition(field, across, along) {
  const sin = Math.sin(field.heading * DEG), cos = Math.cos(field.heading * DEG);
  return { x: field.x + across * cos + along * sin, z: field.z - across * sin + along * cos };
}
export function terrainHeight(x, z, fields = airfieldsNear(x, z, 6000)) {
  let height = naturalHeight(x, z), strongest = 0, target = height;
  for (const field of fields) {
    const p = fieldCoordinates(field, x, z);
    // Flat runway, aprons, and an unobstructed approach; blend into the landscape.
    const edge = Math.max((Math.abs(p.across) - 900) / 1900, (Math.abs(p.along) - field.length / 2 - 650) / 2200);
    const influence = 1 - smooth(edge);
    if (influence > strongest) { strongest = influence; target = field.elevation; }
  }
  return height + (target - height) * strongest;
}
export function surfaceAt(x, z, fields) {
  fields ||= airfieldsNear(x, z, 6000);
  for (const field of fields) {
    const p = fieldCoordinates(field, x, z);
    if (Math.abs(p.across) <= field.width / 2 && Math.abs(p.along) <= field.length / 2) return { height: field.elevation, water: false, field, ...p };
  }
  const height = terrainHeight(x, z, fields);
  return { height: Math.max(0, height), water: height < 0, field: null };
}
export function navigationTo(state, field) {
  return { distance: Math.hypot(field.x - state.x, field.z - state.z), bearing: heading360(Math.atan2(field.x - state.x, field.z - state.z) / DEG), field };
}
