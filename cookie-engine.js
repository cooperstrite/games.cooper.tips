import { BAKERY_KEY, COOKIE_UPGRADES, COOKIE_BADGES, COOKIE_PRICE_GROWTH, COOKIE_UNIT_PRICES, COOKIE_MAX_LINES, cookieDay, cookieRewardTotal, cookieReceipt } from "./cookie-config.js";

const LIMIT = 1e15;
const amount = value => Number.isFinite(value) && value >= 0 ? Math.min(LIMIT, value) : 0;
const integer = value => Number.isSafeInteger(value) && value >= 0 ? Math.min(10000, value) : 0;
export const cookieUpgrade = id => COOKIE_UPGRADES.find(upgrade => upgrade.id === id);
export const categoryCount = (state, type) => COOKIE_UPGRADES.filter(u => u.type === type).reduce((sum, u) => sum + (state.upgrades[u.id] || 0), 0);
export const bakeryLineCount = state => Number.isSafeInteger(state.lines) ? Math.max(1, Math.min(COOKIE_MAX_LINES, state.lines)) : 1;
export function bakeryRates(state) {
  const rates = COOKIE_UPGRADES.reduce((rates, u) => { rates[u.type] += (state.upgrades[u.id] || 0) * u.value; return rates; }, { click: 1, cps: 0 });
  return { ...rates, perLine: rates.cps, cps: rates.cps * bakeryLineCount(state), lines: bakeryLineCount(state) };
}
export function cookieUnitPrice(state, type) {
  if (!Object.hasOwn(COOKIE_UNIT_PRICES, type)) return Infinity;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(COOKIE_UNIT_PRICES[type] * COOKIE_PRICE_GROWTH ** categoryCount(state, type)));
}
export function cookieUpgradePrice(state, id) {
  const upgrade = cookieUpgrade(id);
  return upgrade ? Math.min(Number.MAX_SAFE_INTEGER, cookieUnitPrice(state, upgrade.type) * upgrade.value * (upgrade.type === 'cps' ? bakeryLineCount(state) : 1)) : Infinity;
}
export function cookieLinePrice(state) {
  if (bakeryLineCount(state) >= COOKIE_MAX_LINES || !bakeryRates(state).perLine) return Infinity;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(Math.max(2500, bakeryRates(state).perLine * cookieUnitPrice(state, 'cps') * 1.25) * 1.7 ** (bakeryLineCount(state) - 1)));
}
export function buyCookieLine(state, now = Date.now()) {
  const cost = cookieLinePrice(state);
  if (state.paused || !Number.isFinite(cost) || state.cookies < cost) return { ok: false, cost, badges: [] };
  state.cookies -= cost; state.lines = bakeryLineCount(state) + 1;
  return { ok: true, cost, badges: checkCookieBadges(state, now) };
}
export function createBakery(saved = {}, now = Date.now()) {
  saved = saved && typeof saved === "object" ? saved : {};
  const upgrades = Object.fromEntries(COOKIE_UPGRADES.map(u => [u.id, integer(saved.upgrades?.[u.id])]));
  const today = cookieDay(now), validDay = typeof saved.daily?.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(saved.daily.day);
  const day = validDay && saved.daily.day >= today ? saved.daily.day : today;
  const badges = Object.fromEntries(COOKIE_BADGES.filter(b => Number.isFinite(saved.badges?.[b.id]) && saved.badges[b.id] > 0).map(b => [b.id, saved.badges[b.id]]));
  const state = { version: 2, lines: bakeryLineCount(saved), cookies: amount(saved.cookies), lifetime: Math.max(amount(saved.cookies), amount(saved.lifetime)),
    clicks: Math.floor(amount(saved.clicks)), seconds: amount(saved.seconds), upgrades, badges,
    daily: { day, baked: saved.daily?.day === day ? amount(saved.daily.baked) : 0,
      taps: saved.daily?.day === day ? Math.floor(amount(saved.daily.taps)) : 0 }, paused: false,
  };
  checkCookieBadges(state, now);
  return state;
}
export function readBakery(storage, now = Date.now()) {
  let value; try { value = JSON.parse((storage ?? globalThis.localStorage)?.getItem(BAKERY_KEY)); } catch { /* Fresh bakery. */ }
  return createBakery(value, now);
}
export function writeBakery(state, storage) {
  const { paused, ...saved } = state;
  try { (storage ?? globalThis.localStorage).setItem(BAKERY_KEY, JSON.stringify(saved)); return true; } catch { return false; }
}
export function cookieBadgeProgress(state, badge) {
  const rates = bakeryRates(state);
  const metrics = { ...state, cps: rates.cps, clickPower: rates.click, purchases: categoryCount(state, "click") + categoryCount(state, "cps"),
    varieties: COOKIE_UPGRADES.filter(u => state.upgrades[u.id] > 0).length, balanced: Math.min(categoryCount(state, "click"), categoryCount(state, "cps")) };
  return Math.max(0, Math.min(badge.target, metrics[badge.metric] || 0));
}
export function checkCookieBadges(state, now = Date.now()) {
  const newly = [];
  for (const badge of COOKIE_BADGES) if (!state.badges[badge.id] && cookieBadgeProgress(state, badge) >= badge.target) {
    state.badges[badge.id] = Math.max(1, now); newly.push(badge.id);
  }
  return newly;
}
export function syncCookieDay(state, now = Date.now()) {
  const day = cookieDay(now);
  // Moving the clock backwards cannot open a second allowance for the old day.
  if (day > state.daily.day) state.daily = { day, baked: 0, taps: 0 };
}
function addCookies(state, amountToAdd, now) {
  syncCookieDay(state, now);
  const added = Math.max(0, Math.min(LIMIT - state.lifetime, amountToAdd));
  state.cookies = Math.min(LIMIT, state.cookies + added); state.lifetime += added;
  state.daily.baked = Math.min(LIMIT, state.daily.baked + added);
  return added;
}
export function bakeCookie(state, now = Date.now()) {
  if (state.paused) return { baked: 0, badges: [] };
  syncCookieDay(state, now);
  state.clicks = Math.min(LIMIT, state.clicks + 1);
  state.daily.taps = Math.min(LIMIT, state.daily.taps + 1);
  const baked = addCookies(state, bakeryRates(state).click, now);
  return { baked, badges: checkCookieBadges(state, now) };
}
export function advanceBakery(state, seconds, now = Date.now()) {
  syncCookieDay(state, now);
  if (state.paused || !Number.isFinite(seconds) || seconds <= 0) return { baked: 0, badges: [] };
  const dt = Math.min(1, seconds); state.seconds = Math.min(LIMIT, state.seconds + dt);
  const baked = addCookies(state, bakeryRates(state).cps * dt, now);
  return { baked, badges: checkCookieBadges(state, now) };
}
export function buyCookieUpgrade(state, id, now = Date.now()) {
  const upgrade = cookieUpgrade(id), cost = cookieUpgradePrice(state, id);
  if (!upgrade || state.paused || state.cookies < cost || state.upgrades[id] >= 10000) return { ok: false, cost, badges: [] };
  state.cookies -= cost; state.upgrades[id]++;
  return { ok: true, cost, badges: checkCookieBadges(state, now) };
}
export function claimCookieCoins(state, wallet) {
  return wallet.claim("cookieclicker", cookieReceipt(state.daily.day), cookieRewardTotal(state.daily));
}
