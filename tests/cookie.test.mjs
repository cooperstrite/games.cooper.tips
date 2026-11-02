import test from 'node:test';
import assert from 'node:assert/strict';
import { BAKERY_KEY, COOKIE_STYLE_KEY, COOKIE_UPGRADES, COOKIE_BADGES, COOKIE_ITEMS, COOKIE_LOOKS, COOKIE_DAILY_COINS, normalizeCookieStyle, readCookieStyle, writeCookieStyle, cookieRewardTotal, cookieDay } from '../cookie-config.js';
import { createBakery, readBakery, writeBakery, bakeryRates, cookieUpgradePrice, bakeCookie, advanceBakery, buyCookieUpgrade, checkCookieBadges, cookieBadgeProgress, syncCookieDay, claimCookieCoins } from '../cookie-engine.js';
import { createArcadeWallet } from '../arcade/wallet.js';
import { ARCADE_ITEMS } from '../arcade/catalog.js';
import { PUBLIC_STUDIO_GAMES, STUDIO_VIEWS } from '../arcade/games.js';
import { rewardTotal } from '../arcade/game-services.js';

const date = (day = 2) => new Date(2026, 10, day, 12).getTime();
function storage(initial = {}) { const data = new Map(Object.entries(initial)); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; }
const rich = () => createBakery({ cookies: 1e12, lifetime: 1e12 }, date());

test('a fresh bakery starts with one cookie per tap, no automation, and no instant coins', () => {
  const state = createBakery(undefined, date());
  assert.deepEqual(bakeryRates(state), { click: 1, cps: 0 });
  assert.equal(state.cookies, 0); assert.equal(cookieRewardTotal(state.daily), 0);
  assert.equal(bakeCookie(state, date()).baked, 1);
  assert.equal(state.cookies, 1); assert.equal(state.lifetime, 1); assert.equal(state.clicks, 1);
  assert.equal(advanceBakery(state, 1, date()).baked, 0);
});

test('all machines retain the same cost per added production after mixed purchases', () => {
  const state = rich();
  for (let i = 0; i < 65; i++) {
    for (const type of ['click', 'cps']) {
      const upgrades = COOKIE_UPGRADES.filter(u => u.type === type);
      const unit = cookieUpgradePrice(state, upgrades[0].id) / upgrades[0].value;
      for (let j = 0; j < upgrades.length; j++) {
        const u = upgrades[j], cost = cookieUpgradePrice(state, u.id);
        assert.equal(cost / u.value, unit);
        if (j) assert.ok(cost > cookieUpgradePrice(state, upgrades[j - 1].id));
      }
    }
    assert.equal(buyCookieUpgrade(state, COOKIE_UPGRADES[i % COOKIE_UPGRADES.length].id, date()).ok, true);
  }
});

test('a purchase raises its entire group together and never changes the other group', () => {
  const state = rich(), before = Object.fromEntries(COOKIE_UPGRADES.map(u => [u.id, cookieUpgradePrice(state, u.id)]));
  buyCookieUpgrade(state, 'factory', date());
  for (const u of COOKIE_UPGRADES) assert.ok(u.type === 'cps' ? cookieUpgradePrice(state, u.id) > before[u.id] : cookieUpgradePrice(state, u.id) === before[u.id]);
  assert.equal(cookieUpgradePrice(state, 'factory'), 12 * cookieUpgradePrice(state, 'convection'));
});

test('purchases debit the exact amount and change only their advertised output', () => {
  const state = rich();
  for (const u of COOKIE_UPGRADES) {
    const balance = state.cookies, lifetime = state.lifetime, daily = state.daily.baked, before = bakeryRates(state), cost = cookieUpgradePrice(state, u.id);
    assert.equal(buyCookieUpgrade(state, u.id, date()).ok, true);
    const after = bakeryRates(state);
    assert.equal(state.cookies, balance - cost); assert.equal(state.upgrades[u.id], 1);
    assert.equal(after[u.type], before[u.type] + u.value);
    assert.equal(after[u.type === 'cps' ? 'click' : 'cps'], before[u.type === 'cps' ? 'click' : 'cps']);
    assert.equal(state.lifetime, lifetime); assert.equal(state.daily.baked, daily);
  }
});

test('unaffordable, unknown, and paused purchases never charge the player', () => {
  const state = createBakery(undefined, date()); bakeCookie(state, date());
  let before = structuredClone(state);
  assert.equal(buyCookieUpgrade(state, 'convection', date()).ok, false);
  assert.equal(buyCookieUpgrade(state, 'nope', date()).ok, false); assert.deepEqual(state, before);
  state.cookies = 500; state.paused = true; before = structuredClone(state);
  assert.equal(buyCookieUpgrade(state, 'mitts', date()).ok, false); assert.deepEqual(state, before);
});

test('automated production is frame-rate independent and pause stops every form of baking', () => {
  const a = createBakery({ upgrades: { factory: 1, mixer: 1, mitts: 3 } }, date()), b = structuredClone(a);
  for (let i = 0; i < 600; i++) advanceBakery(a, 1 / 60, date());
  for (let i = 0; i < 40; i++) advanceBakery(b, .25, date());
  assert.ok(Math.abs(a.cookies - 140) < 1e-8); assert.ok(Math.abs(a.cookies - b.cookies) < 1e-8);
  assert.equal(bakeCookie(a, date()).baked, 4);
  a.paused = true; const before = structuredClone(a);
  assert.equal(bakeCookie(a, date()).baked, 0); advanceBakery(a, 1, date()); assert.deepEqual(a, before);
});

test('bad elapsed times cannot mint cookies or create offline catch-up', () => {
  const state = createBakery({ upgrades: { convection: 1 } }, date());
  for (const dt of [NaN, Infinity, -3, 0]) assert.equal(advanceBakery(state, dt, date()).baked, 0);
  assert.equal(advanceBakery(state, 36000, date()).baked, 1);
  const saved = storage(); writeBakery(state, saved);
  const reloaded = readBakery(saved, date(4)); assert.equal(reloaded.cookies, state.cookies); assert.equal(reloaded.lifetime, state.lifetime); assert.equal(reloaded.daily.baked, 0);
});

test('badges unlock once, use lifetime baking, and survive spending and reloads', () => {
  const state = createBakery(undefined, date());
  assert.deepEqual(bakeCookie(state, date()).badges, ['first-click']);
  for (let i = 1; i < 100; i++) bakeCookie(state, date());
  const timestamp = state.badges['first-click'];
  buyCookieUpgrade(state, 'convection', date());
  assert.equal(state.cookies, 10); assert.ok(state.badges.century && state.badges['first-oven'] && state.badges['first-upgrade']);
  assert.deepEqual(checkCookieBadges(state, date(3)), []); assert.equal(state.badges['first-click'], timestamp);
  const store = storage(); writeBakery(state, store); const reloaded = readBakery(store, date());
  assert.deepEqual(reloaded.badges, state.badges);
  for (const badge of COOKIE_BADGES) { const progress = cookieBadgeProgress(reloaded, badge); assert.ok(progress >= 0 && progress <= badge.target); }
});

test('breadth and balance badges distinguish quantities from different types of equipment', () => {
  const state = rich();
  for (let i = 0; i < 5; i++) { buyCookieUpgrade(state, 'mitts', date()); buyCookieUpgrade(state, 'convection', date()); }
  assert.ok(state.badges.balanced); assert.equal(state.badges['variety-five'], undefined);
  for (const u of COOKIE_UPGRADES) buyCookieUpgrade(state, u.id, date());
  assert.ok(state.badges['full-floor']); assert.ok(state.badges['variety-ten']);
});

test('coin earnings use baked cookies, keep fractions, and have a strict daily ceiling', () => {
  for (const [baked, coins] of [[999.99,0],[1000,1],[1999,1],[2000,2],[20000,20],[1e12,20],[-1,0],[NaN,0],[Infinity,0]]) {
    assert.equal(cookieRewardTotal({ baked }), coins); assert.equal(rewardTotal('cookieclicker', { baked }), coins);
  }
  const state = createBakery({ upgrades: { packing: 1 } }, date());
  advanceBakery(state, 1, date()); assert.equal(cookieRewardTotal(state.daily), 1);
  buyCookieUpgrade(state, 'convection', date()); assert.equal(state.cookies, 1000 - 101); assert.equal(cookieRewardTotal(state.daily), 1);
});

test('the wallet pays the same daily receipt only once, including concurrent and repeated claims', async () => {
  const store = storage(), wallet = createArcadeWallet({ storage: store });
  const state = createBakery({ daily: { day: cookieDay(date()), baked: 3500 } }, date());
  const results = await Promise.all([claimCookieCoins(state, wallet), claimCookieCoins(state, wallet)]);
  assert.equal(results.reduce((n, r) => n + r.coins, 0), 3);
  state.daily.baked = 1e9; assert.equal((await claimCookieCoins(state, wallet)).coins, 17);
  writeBakery(state, store); const reopened = createArcadeWallet({ storage: store });
  assert.equal((await claimCookieCoins(readBakery(store, date()), reopened)).coins, 0);
  assert.equal(reopened.getState().coins, COOKIE_DAILY_COINS);
  syncCookieDay(state, date(3)); state.daily.baked = 1000;
  assert.equal((await claimCookieCoins(state, reopened)).coins, 1); assert.equal(reopened.getState().coins, 21);
});

test('a new day resets only coin progress and rolling the clock back cannot reopen yesterday', () => {
  const state = createBakery({ cookies: 56, lifetime: 9000, daily: { day: cookieDay(date()), baked: 9000 } }, date());
  syncCookieDay(state, date(3)); assert.equal(state.daily.baked, 0); assert.equal(state.cookies, 56); assert.equal(state.lifetime, 9000);
  bakeCookie(state, date(3)); syncCookieDay(state, date()); assert.equal(state.daily.day, cookieDay(date(3))); assert.equal(state.daily.baked, 1);
});

test('all paid cookie styles require ownership; bakery appearance does not alter game rules or progress', () => {
  const store = storage(), state = rich(); writeBakery(state, store); const progress = store.getItem(BAKERY_KEY);
  for (const item of COOKIE_ITEMS) {
    assert.ok(ARCADE_ITEMS.some(entry => entry.id === item.id));
    const requested = { [item.setting]: item.value, accent: '#a1b2c3', name: 'Cooper Bakery', cps: 99999 };
    assert.notEqual(normalizeCookieStyle(requested)[item.setting], item.value);
    const look = normalizeCookieStyle(requested, [item.id]); assert.equal(look[item.setting], item.value); assert.equal(look.cps, undefined);
    writeCookieStyle(look, [item.id], store); assert.deepEqual(readCookieStyle([item.id], store), look); assert.equal(store.getItem(BAKERY_KEY), progress);
  }
  const appearance = store.getItem(COOKIE_STYLE_KEY); bakeCookie(state, date()); writeBakery(state, store); assert.equal(store.getItem(COOKIE_STYLE_KEY), appearance);
  assert.ok(PUBLIC_STUDIO_GAMES.cookieclicker); assert.deepEqual(STUDIO_VIEWS.cookieclicker, ['2d']);
});

test('included looks work without purchases and invalid saves fall back safely', () => {
  for (const [setting, looks] of Object.entries(COOKIE_LOOKS)) for (const look of looks.filter(v => !v.cost)) assert.equal(normalizeCookieStyle({ [setting]: look.id })[setting], look.id);
  for (const raw of ['broken', 'null', '[]', '3']) { const store = storage({ [BAKERY_KEY]: raw, [COOKIE_STYLE_KEY]: raw }); assert.deepEqual(bakeryRates(readBakery(store, date())), { click: 1, cps: 0 }); assert.equal(readCookieStyle([], store).recipe, 'classic'); }
  const state = createBakery({ cookies: -1, lifetime: Infinity, clicks: NaN, upgrades: { mitts: -1, factory: 1.5, fake: 5000 }, badges: { fake: 42 } }, date());
  assert.equal(state.cookies, 0); assert.deepEqual(bakeryRates(state), { click: 1, cps: 0 }); assert.deepEqual(state.badges, {});
  assert.equal(normalizeCookieStyle({ name: 'x'.repeat(100), accent: 'url(evil)' }).name.length, 28);
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(readBakery(blocked, date()).cookies, 0); assert.equal(writeBakery(state, blocked), false); assert.equal(writeCookieStyle({}, [], blocked), false);
});
