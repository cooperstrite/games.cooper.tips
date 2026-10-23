export const CARVE_COLS = 64, CARVE_ROWS = 48;
export const STENCILS = Object.freeze({
  grin: { name: "Classic grin", features: [
    { name: "Left eye", points: [[16,23],[25,16],[27,24]] },
    { name: "Right eye", points: [[37,24],[39,16],[48,23]] },
    { name: "Nose", points: [[29,29],[32,24],[35,29]] },
    { name: "Grin", points: [[16,31],[22,34],[24,32],[27,35],[36,35],[39,32],[42,34],[48,31],[44,38],[38,41],[26,41],[20,38]] },
  ] },
  cat: { name: "Moon cat", features: [
    { name: "Left eye", points: [[15,20],[23,18],[27,23],[22,25],[17,24]] },
    { name: "Right eye", points: [[37,23],[41,18],[49,20],[47,24],[42,25]] },
    { name: "Nose", points: [[28,28],[36,28],[32,32]] },
    { name: "Whisker smile", points: [[18,31],[28,34],[32,32],[36,34],[46,31],[44,36],[36,38],[32,36],[28,38],[20,36]] },
  ] },
  ghost: { name: "Ghostly howl", features: [
    { name: "Left eye", points: [[19,16],[24,17],[27,21],[25,27],[20,26],[17,22]] },
    { name: "Right eye", points: [[40,17],[45,16],[47,22],[44,26],[39,27],[37,21]] },
    { name: "Nose", points: [[30,28],[32,25],[34,28],[32,30]] },
    { name: "Howl", points: [[28,33],[36,33],[40,36],[39,41],[35,43],[29,43],[25,41],[24,36]] },
  ] },
  free: { name: "Freehand", features: [] },
});
export const CARVE_WIDTH = 512, CARVE_HEIGHT = 416, MAX_CUTS = 60, MAX_POINTS = 1024;
export function insideFace([x, y]) { return Number.isFinite(x) && Number.isFinite(y) && ((x - 256) / 213) ** 2 + ((y - 240) / 151) ** 2 <= 1.0001; }
export function facePoint(x, y) {
  const dx = x - 256, dy = y - 240, distance = Math.hypot(dx / 213, dy / 151);
  const scale = distance > 1 ? 1 / distance : 1;
  return [256 + dx * scale, 240 + dy * scale];
}
export function insidePolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function featureOutline(stencil, feature) {
  return (STENCILS[stencil]?.features[feature]?.points || []).map(([x, y]) => [x * 8, 32 + y * 8]);
}
export function signedArea(points) {
  return points.reduce((sum, [x, y], i) => {
    const next = points[(i + 1) % points.length];
    return sum + x * next[1] - next[0] * y;
  }, 0) / 2;
}
// Subpixel coordinates are retained. Simplification only removes deviations
// smaller than a quarter of one canvas pixel, independent of display zoom.
export function simplifyOutline(points, tolerance = .22) {
  if (points.length < 3) return points;
  const keep = new Set([0, points.length - 1]), stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop(), a = points[start], b = points[end];
    const dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
    let farthest = tolerance, at = -1;
    for (let i = start + 1; i < end; i++) {
      const p = points[i], t = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) : 0;
      const distance = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
      if (distance > farthest) { farthest = distance; at = i; }
    }
    if (at !== -1) { keep.add(at); stack.push([start, at], [at, end]); }
  }
  return [...keep].sort((a, b) => a - b).map(i => points[i]);
}
export function makeCut(points) {
  if (!Array.isArray(points) || points.length < 3 || points.length > 8192 || !points.every(p => Array.isArray(p) && p.length === 2 && insideFace(p))) return null;
  let cut = simplifyOutline(points).map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
  if (cut.length < 3 || cut.length > MAX_POINTS || Math.abs(signedArea(cut)) < 12) return null;
  if (signedArea(cut) < 0) cut = cut.reverse();
  return cut;
}
export function carvingStats(cuts) {
  const area = cuts.reduce((sum, points) => sum + Math.abs(signedArea(points)), 0);
  return { count: cuts.length, area, ready: cuts.length > 0 && area >= 80 };
}
export function cutAt(cuts, [x, y]) {
  for (let i = cuts.length - 1; i >= 0; i--) if (insidePolygon(x, y, cuts[i])) return i;
  return -1;
}
// Read old lanterns without throwing away a player's saved designs. Their cell
// boundaries become vector outlines; all newly drawn designs are vector-only.
function legacyOutlines(cells) {
  const mask = new Set(cells.filter(i => Number.isInteger(i) && i >= 0 && i < CARVE_COLS * CARVE_ROWS));
  const edges = new Map(), key = p => p.join(":"), add = (a, b) => { const k = key(a); if (!edges.has(k)) edges.set(k, []); edges.get(k).push(b); };
  for (const cell of mask) {
    const x = cell % CARVE_COLS, y = Math.floor(cell / CARVE_COLS);
    if (!mask.has(cell - CARVE_COLS)) add([x, y], [x + 1, y]);
    if (x === CARVE_COLS - 1 || !mask.has(cell + 1)) add([x + 1, y], [x + 1, y + 1]);
    if (!mask.has(cell + CARVE_COLS)) add([x + 1, y + 1], [x, y + 1]);
    if (x === 0 || !mask.has(cell - 1)) add([x, y + 1], [x, y]);
  }
  const cuts = [];
  while (edges.size && cuts.length < MAX_CUTS) {
    const first = edges.keys().next().value, points = [first.split(":").map(Number)]; let current = first;
    for (let guard = 0; guard < mask.size * 4 + 1; guard++) {
      const choices = edges.get(current); if (!choices?.length) break;
      const next = choices.shift(); if (!choices.length) edges.delete(current);
      points.push(next); current = key(next); if (current === first) break;
    }
    if (points.length > 3) cuts.push(simplifyOutline(points.map(([x, y]) => facePoint(x * 8, 32 + y * 8)), 2));
  }
  return cuts;
}
export function validSavedCarving(value) {
  if (!value || !Object.hasOwn(STENCILS, value.stencil)) return null;
  let cuts;
  if (Array.isArray(value.cuts) && value.cuts.length <= MAX_CUTS) cuts = value.cuts.filter(points =>
    Array.isArray(points) && points.length >= 3 && points.length <= MAX_POINTS && points.every(p => Array.isArray(p) && p.length === 2 && insideFace(p))).map(points => points.map(p => [...p]));
  else if (Array.isArray(value.cells) && value.cells.length <= CARVE_COLS * CARVE_ROWS) cuts = legacyOutlines(value.cells);
  else return null;
  return { version: 3, name: typeof value.name === "string" ? value.name.slice(0, 24) : "Harvest lantern", stencil: value.stencil, cuts,
    glow: ["amber", "jade", "violet"].includes(value.glow) ? value.glow : "amber" };
}
