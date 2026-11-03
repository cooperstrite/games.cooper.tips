import { COOKIE_UPGRADES } from './cookie-config.js';

// Presentation only: a visible tray represents a batch, never a second source
// of cookies or arcade rewards. The bakery engine remains the scorekeeper.
export const LINE_START = 60;
export const LINE_END = 1715;
export const LINE_WIDTH = 1640;
export const BATCH_SPACING = 112;
export const TRAY_RELEASE = 1300;
export const TRAY_RETURN_LENGTH = Math.PI * (47.5 + 54) + 1240;
export const LINE_STAGES = Object.freeze([
  { id: 'mix', name: 'Mix', x: 100, upgrades: ['mixer', 'depositor', 'bakery'] },
  { id: 'roll', name: 'Roll', x: 280, upgrades: ['mitts', 'rolling-pin'] },
  { id: 'cut', name: 'Cut', x: 450, upgrades: ['cutters', 'factory'] },
  { id: 'fill', name: 'Fill & top', x: 630, upgrades: ['piping'] },
  { id: 'bake', name: 'Bake', x: 890, upgrades: ['convection', 'deck', 'rotary', 'tunnel'] },
  { id: 'cool', name: 'Cool', x: 1155, upgrades: ['conveyor'] },
  { id: 'pack', name: 'Pack & seal', x: 1340, upgrades: ['packing'] },
  { id: 'ship', name: 'Dispatch', x: 1610, upgrades: [] },
].map(Object.freeze));

export function productionFilling(recipe) {
  const fillings = {
    classic: { kind: 'chips', label: 'Chocolate chips', color: '#4c2b25' },
    cocoa: { kind: 'chips', label: 'Chocolate chips', color: '#c99362' },
    oat: { kind: 'oats', label: 'Oats & honey', color: '#daba77' },
    jam: { kind: 'jam', label: 'Berry filling', color: '#b93853' },
  };
  return fillings[recipe] || { kind: 'none', label: 'No filling needed', color: '#abbcaf' };
}

// The tray peels away under the boxing station, runs back under the machinery,
// then rounds the left pulley and comes up under the dough hopper again.
export function returnTrayPose(distance) {
  const d = Math.max(0, Math.min(TRAY_RETURN_LENGTH, distance)), firstArc = Math.PI * 47.5;
  if (d < firstArc) {
    const angle = d / 47.5 - Math.PI / 2;
    return { x: 1300 + Math.cos(angle) * 47.5, y: 390.5 + Math.sin(angle) * 47.5, rotation: (angle + Math.PI / 2) * 180 / Math.PI };
  }
  if (d < firstArc + 1240) return { x: 1300 - (d - firstArc), y: 438, rotation: 180 };
  const angle = (d - firstArc - 1240) / 54 + Math.PI / 2;
  return { x: 60 + Math.cos(angle) * 54, y: 384 + Math.sin(angle) * 54, rotation: (angle + Math.PI / 2) * 180 / Math.PI };
}

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
  const batches = auto ? Array.from({ length: Math.ceil((LINE_END-LINE_START)/BATCH_SPACING) }, (_, id) => ({ id, x: LINE_START + id * BATCH_SPACING })) : [];
  const speed = productionSpeed(upgrades);
  return { batches, returns: [], returned: 0, nextId: batches.length, queued: 0, gap: auto ? 0 : BATCH_SPACING, auto, speed, targetSpeed: speed, distance: 0, shipped: 0 };
}
export function setProductionEquipment(flow, upgrades) {
  flow.auto = productionRates(upgrades).cps > 0;
  flow.targetSpeed = productionSpeed(upgrades);
}
export function queueProductionBatch(flow) { flow.queued = Math.min(24, flow.queued + 1); }
export function advanceProductionFlow(flow, seconds, paused = false) {
  if (paused || !Number.isFinite(seconds) || seconds <= 0 || (!flow.auto && !flow.queued && !flow.batches.length && !flow.returns.length)) return false;
  const dt = Math.min(.1, seconds), previousSpeed = flow.speed, response = 3;
  const blend = 1 - Math.exp(-response * dt);
  flow.speed += (flow.targetSpeed - flow.speed) * blend;
  // Integrate the same easing curve instead of changing an animation duration.
  // Buying equipment therefore accelerates trays without teleporting them.
  const travel = flow.targetSpeed * dt + (previousSpeed - flow.targetSpeed) * blend / response;
  flow.distance += travel; flow.gap += travel;
  for (const tray of flow.returns) tray.distance += travel;
  const returning = flow.returns.length;
  flow.returns = flow.returns.filter(tray => tray.distance < TRAY_RETURN_LENGTH);
  flow.returned += returning - flow.returns.length;
  for (const batch of flow.batches) {
    const oldX = batch.x; batch.x += travel;
    if (oldX < TRAY_RELEASE && batch.x >= TRAY_RELEASE) flow.returns.push({ id: batch.id, distance: batch.x - TRAY_RELEASE });
  }
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
    rolled: smooth(225, 305, x), cut: smooth(426, 454, x), filled: smooth(613, 647, x), baked: smooth(780, 1024, x),
    boxed: smooth(1240, 1300, x), sealed: smooth(1330, 1400, x),
  };
}
