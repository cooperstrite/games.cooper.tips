import { COOKIE_UPGRADES } from './cookie-config.js';

// Presentation only: a visible tray represents a batch, never a second source
// of cookies or arcade rewards. The bakery engine remains the scorekeeper.
export const LINE_START = 60;
export const LINE_END = 1515;
export const BATCH_SPACING = 112;
export const LINE_STAGES = Object.freeze([
  { id: 'mix', name: 'Mix', x: 100, upgrades: ['mixer', 'depositor', 'bakery'] },
  { id: 'roll', name: 'Roll', x: 280, upgrades: ['mitts', 'rolling-pin'] },
  { id: 'cut', name: 'Cut', x: 450, upgrades: ['cutters', 'piping', 'factory'] },
  { id: 'bake', name: 'Bake', x: 690, upgrades: ['convection', 'deck', 'rotary', 'tunnel'] },
  { id: 'cool', name: 'Cool', x: 955, upgrades: ['conveyor'] },
  { id: 'pack', name: 'Box & ship', x: 1220, upgrades: ['packing'] },
].map(Object.freeze));

export function productionRates(upgrades = {}) {
  const rates = { click: 1, cps: 0, equipment: 0 };
  for (const u of COOKIE_UPGRADES) {
    const count = Number.isFinite(upgrades[u.id]) ? Math.max(0, upgrades[u.id]) : 0;
    rates[u.type] += count * u.value; rates.equipment += count;
  }
  return rates;
}
export function productionSpeed(upgrades = {}) {
  const rates = productionRates(upgrades);
  // Logarithmic growth keeps very large bakeries readable while every purchase,
  // including a duplicate tool, still increases the conveyor's target speed.
  return 52 + 14 * Math.log2(1 + rates.cps) + 10 * Math.log2(rates.click);
}
export function createProductionFlow(upgrades = {}) {
  const auto = productionRates(upgrades).cps > 0;
  const batches = auto ? Array.from({ length: 13 }, (_, id) => ({ id, x: LINE_START + id * BATCH_SPACING })) : [];
  const speed = productionSpeed(upgrades);
  return { batches, nextId: batches.length, queued: 0, gap: auto ? 0 : BATCH_SPACING, auto, speed, targetSpeed: speed, distance: 0, shipped: 0 };
}
export function setProductionEquipment(flow, upgrades) {
  flow.auto = productionRates(upgrades).cps > 0;
  flow.targetSpeed = productionSpeed(upgrades);
}
export function queueProductionBatch(flow) { flow.queued = Math.min(24, flow.queued + 1); }
export function advanceProductionFlow(flow, seconds, paused = false) {
  if (paused || !Number.isFinite(seconds) || seconds <= 0 || (!flow.auto && !flow.queued && !flow.batches.length)) return false;
  const dt = Math.min(.1, seconds), previousSpeed = flow.speed, response = 3;
  const blend = 1 - Math.exp(-response * dt);
  flow.speed += (flow.targetSpeed - flow.speed) * blend;
  // Integrate the same easing curve instead of changing an animation duration.
  // Buying equipment therefore accelerates trays without teleporting them.
  const travel = flow.targetSpeed * dt + (previousSpeed - flow.targetSpeed) * blend / response;
  flow.distance += travel; flow.gap += travel;
  for (const batch of flow.batches) batch.x += travel;
  const before = flow.batches.length;
  flow.batches = flow.batches.filter(batch => batch.x < LINE_END);
  flow.shipped += before - flow.batches.length;
  if ((flow.auto || flow.queued) && flow.gap >= BATCH_SPACING) {
    flow.gap -= BATCH_SPACING;
    flow.batches.push({ id: flow.nextId++, x: LINE_START + flow.gap });
    if (flow.queued) flow.queued--;
  }
  if (!flow.auto && !flow.queued) flow.gap = Math.min(BATCH_SPACING,flow.gap);
  return true;
}

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function productionBatchAppearance(x) {
  return {
    rolled: smooth(225, 305, x), cut: smooth(426, 454, x), baked: smooth(580, 824, x),
    boxed: smooth(1040, 1100, x), sealed: smooth(1130, 1200, x),
  };
}
