import test from 'node:test';
import assert from 'node:assert/strict';
import { BAKERY_KEY, COOKIE_STYLE_KEY, COOKIE_UPGRADES, COOKIE_BADGES, COOKIE_ITEMS, COOKIE_LOOKS, COOKIE_DAILY_COINS, normalizeCookieStyle, readCookieStyle, writeCookieStyle, cookieRewardTotal, cookieCoinGoal, cookieCoinProgress, cookieDay } from '../cookie-config.js';
import { createBakery, readBakery, writeBakery, bakeryRates, cookieUpgradePrice, cookieLinePrice, buyCookieLine, grantCookieTestCookies, bakeCookie, advanceBakery, buyCookieUpgrade, checkCookieBadges, cookieBadgeProgress, syncCookieDay, claimCookieCoins } from '../cookie-engine.js';
import { createArcadeWallet } from '../arcade/wallet.js';
import { ARCADE_ITEMS } from '../arcade/catalog.js';
import { PUBLIC_STUDIO_GAMES, STUDIO_VIEWS } from '../arcade/games.js';
import { rewardTotal } from '../arcade/game-services.js';

const date = (day = 2) => new Date(2026, 10, day, 12).getTime();
function storage(initial = {}) { const data = new Map(Object.entries(initial)); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; }
const rich = () => createBakery({ cookies: 1e12, lifetime: 1e12 }, date());

test('a fresh bakery starts with one cookie per tap, no automation, and no instant coins', () => {
  const state = createBakery(undefined, date());
  assert.deepEqual(bakeryRates(state), { click: 1, cps: 0, perLine: 0, lines: 1 });
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

test('all 200 daily coin milestones require both baking and manual taps, with increasingly costly tiers', () => {
  for (let coins = 1; coins <= 200; coins++) {
    const goal = cookieCoinGoal(coins);
    assert.equal(cookieRewardTotal(goal), coins); assert.equal(rewardTotal('cookieclicker', goal), coins);
    assert.equal(cookieRewardTotal({ ...goal, baked: goal.baked - .01 }), coins - 1);
    assert.equal(cookieRewardTotal({ ...goal, taps: goal.taps - .01 }), coins - 1);
  }
  for (const [coins, baked, taps] of [[20,20000,200],[21,25000,220],[50,170000,800],[51,195000,830],[100,1420000,2300],[101,1520000,2350],[200,11420000,7300]]) assert.deepEqual(cookieCoinGoal(coins), { baked, taps });
  assert.equal(cookieRewardTotal({ baked: 1e15, taps: 1e15 }), 200);
  for (const invalid of [-1,NaN,Infinity,undefined,'5000']) {
    assert.equal(cookieRewardTotal({ baked: invalid, taps: 1e9 }), 0);
    assert.equal(cookieRewardTotal({ baked: 1e9, taps: invalid }), 0);
  }
});

test('idle machines cannot earn coins and spending never consumes baking or tap progress', () => {
  const state = createBakery({ upgrades: { packing: 100 } }, date());
  for (let i=0; i<1000; i++) advanceBakery(state, 1, date());
  assert.equal(cookieRewardTotal(state.daily), 0);
  for (let i=0; i<10; i++) bakeCookie(state, date());
  assert.equal(cookieRewardTotal(state.daily), 1);
  const progress = structuredClone(state.daily);
  buyCookieUpgrade(state, 'convection', date()); assert.deepEqual(state.daily, progress);
  for (let i=0; i<1000; i++) advanceBakery(state, 1, date());
  assert.equal(cookieRewardTotal(state.daily), 1);
  const saved = storage(); writeBakery(state,saved);
  assert.deepEqual(readBakery(saved,date()).daily,state.daily);
  syncCookieDay(state,date(3)); advanceBakery(state,1,date(3));
  assert.equal(state.daily.taps,0); assert.equal(cookieRewardTotal(state.daily),0);
});

test('the next-coin meters account for both requirements and preserve already-paid old rewards', () => {
  const p = cookieCoinProgress({baked:24500,taps:207},20);
  assert.equal(p.coin,21); assert.equal(p.cookiesLeft,500); assert.equal(p.tapsLeft,13);
  assert.equal(p.cookieValue,4500); assert.equal(p.cookieMax,5000); assert.equal(p.tapValue,7); assert.equal(p.tapMax,20);
  const migrated = cookieCoinProgress({baked:20000,taps:0},20);
  assert.equal(migrated.coin,21); assert.equal(migrated.tapValue,0); assert.equal(migrated.tapsLeft,220);
  assert.equal(cookieCoinProgress(cookieCoinGoal(200),200).complete,true);
});

test('the wallet pays the same daily receipt only once, including concurrent and repeated claims', async () => {
  const store = storage(), wallet = createArcadeWallet({ storage: store });
  const state = createBakery({ daily: { day: cookieDay(date()), baked: 3500, taps: 35 } }, date());
  const results = await Promise.all([claimCookieCoins(state, wallet), claimCookieCoins(state, wallet)]);
  assert.equal(results.reduce((n, r) => n + r.coins, 0), 3);
  Object.assign(state.daily,cookieCoinGoal(200)); assert.equal((await claimCookieCoins(state, wallet)).coins, 197);
  writeBakery(state, store); const reopened = createArcadeWallet({ storage: store });
  assert.equal((await claimCookieCoins(readBakery(store, date()), reopened)).coins, 0);
  assert.equal(reopened.getState().coins, COOKIE_DAILY_COINS);
  syncCookieDay(state, date(3)); Object.assign(state.daily,cookieCoinGoal(1));
  assert.equal((await claimCookieCoins(state, reopened)).coins, 1); assert.equal(reopened.getState().coins, 201);
});

test('updating an old bakery preserves balances and daily receipts without paying old coins again', async () => {
  const store=storage(), wallet=createArcadeWallet({storage:store});
  await wallet.claim('cookieclicker',`bakery-day:${cookieDay(date())}`,20);
  const old={cookies:12345,lifetime:99999,clicks:500,upgrades:{packing:2},daily:{day:cookieDay(date()),baked:35000}};
  const state=createBakery(old,date());
  assert.equal(state.cookies,old.cookies);assert.equal(state.clicks,old.clicks);assert.equal(state.upgrades.packing,2);
  assert.equal(state.daily.taps,0);assert.equal((await claimCookieCoins(state,wallet)).coins,0);
  for(let i=0;i<220;i++)bakeCookie(state,date());
  assert.equal((await claimCookieCoins(state,wallet)).coins,1);assert.equal(wallet.getState().coins,21);
});

test('a new day resets only coin progress and rolling the clock back cannot reopen yesterday', () => {
  const state = createBakery({ cookies: 56, lifetime: 9000, daily: { day: cookieDay(date()), baked: 9000, taps: 150 } }, date());
  syncCookieDay(state, date(3)); assert.equal(state.daily.baked, 0); assert.equal(state.daily.taps,0); assert.equal(state.cookies, 56); assert.equal(state.lifetime, 9000);
  bakeCookie(state, date(3)); syncCookieDay(state, date()); assert.equal(state.daily.day, cookieDay(date(3))); assert.equal(state.daily.baked, 1); assert.equal(state.daily.taps,1);
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
  for (const raw of ['broken', 'null', '[]', '3']) { const store = storage({ [BAKERY_KEY]: raw, [COOKIE_STYLE_KEY]: raw }); assert.deepEqual(bakeryRates(readBakery(store, date())), { click: 1, cps: 0, perLine: 0, lines: 1 }); assert.equal(readCookieStyle([], store).recipe, 'classic'); }
  const state = createBakery({ cookies: -1, lifetime: Infinity, clicks: NaN, upgrades: { mitts: -1, factory: 1.5, fake: 5000 }, badges: { fake: 42 } }, date());
  assert.equal(state.cookies, 0); assert.deepEqual(bakeryRates(state), { click: 1, cps: 0, perLine: 0, lines: 1 }); assert.deepEqual(state.badges, {});
  assert.equal(normalizeCookieStyle({ name: 'x'.repeat(100), accent: 'url(evil)' }).name.length, 28);
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(readBakery(blocked, date()).cookies, 0); assert.equal(writeBakery(state, blocked), false); assert.equal(writeCookieStyle({}, [], blocked), false);
});

test('warehouse expansion charges cookies once and adds only its advertised passive output', () => {
  const state=createBakery({cookies:100000,upgrades:{convection:2,mixer:1,cutters:1}},date());
  const before=structuredClone(state),cost=cookieLinePrice(state),rate=bakeryRates(state);
  assert.equal(buyCookieLine(state,date()).ok,true);assert.equal(state.lines,2);assert.equal(state.cookies,before.cookies-cost);
  assert.deepEqual(state.upgrades,before.upgrades);assert.deepEqual(state.daily,before.daily);assert.equal(state.lifetime,before.lifetime);
  assert.equal(bakeryRates(state).cps,rate.cps*2);assert.equal(bakeryRates(state).click,rate.click);assert.ok(cookieLinePrice(state)>cost);
  assert.equal(advanceBakery(state,1,date()).baked,rate.cps*2);assert.equal(state.daily.taps,0);assert.equal(cookieRewardTotal(state.daily),0);
  const store=storage();writeBakery(state,store);const loaded=readBakery(store,date());assert.equal(loaded.lines,2);assert.deepEqual(bakeryRates(loaded),bakeryRates(state));
});

test('equipment on multiple lines keeps the same cost per added cookie per second', () => {
  const state=createBakery({cookies:1e12,lines:4,upgrades:{mixer:1}},date());
  const reference=cookieUpgradePrice(state,'convection')/4;
  for(const u of COOKIE_UPGRADES.filter(u=>u.type==='cps'))assert.equal(cookieUpgradePrice(state,u.id)/(u.value*4),reference);
  const before=bakeryRates(state),price=cookieUpgradePrice(state,'factory'),balance=state.cookies;
  buyCookieUpgrade(state,'factory',date());assert.equal(state.cookies,balance-price);assert.equal(bakeryRates(state).cps-before.cps,48);
  const single=createBakery({upgrades:state.upgrades},date());assert.equal(cookieUpgradePrice(single,'mitts'),cookieUpgradePrice(state,'mitts'));
});

test('legacy saves keep one line and invalid or unavailable warehouse purchases do not spend cookies', () => {
  for(const lines of [undefined,null,0,-3,1.5,'4',NaN,Infinity])assert.equal(createBakery({lines},date()).lines,1);
  assert.equal(createBakery({lines:100},date()).lines,6);
  for(const saved of [{cookies:1e9},{cookies:1,upgrades:{convection:1}},{cookies:1e9,lines:6,upgrades:{packing:1}}]){
    const state=createBakery(saved,date()),before=structuredClone(state);assert.equal(buyCookieLine(state,date()).ok,false);assert.deepEqual(state,before);
  }
  const state=createBakery({cookies:1e9,upgrades:{convection:1}},date());state.paused=true;const before=structuredClone(state);assert.equal(buyCookieLine(state,date()).ok,false);assert.deepEqual(state,before);
});

test('temporary cookie grants survive reload without awarding baking progress, badges, or arcade coins', async () => {
  const state=createBakery(undefined,date()),store=storage(),wallet=createArcadeWallet({storage:store});
  bakeCookie(state,date());const before=structuredClone(state);
  assert.equal(grantCookieTestCookies(state,1000000),1000000);assert.equal(grantCookieTestCookies(state,50000),50000);
  assert.equal(state.cookies,before.cookies+1050000);assert.equal(state.testCookies,1050000);
  assert.equal(state.lifetime,before.lifetime);assert.equal(state.clicks,before.clicks);assert.deepEqual(state.daily,before.daily);assert.deepEqual(state.badges,before.badges);
  assert.equal(writeBakery(state,store),true);const loaded=readBakery(store,date());
  assert.deepEqual(loaded,state);assert.equal((await claimCookieCoins(loaded,wallet)).coins,0);assert.equal(wallet.getState().coins,0);
  assert.equal(bakeCookie(loaded,date()).baked,1);assert.equal(loaded.lifetime,2);assert.equal(loaded.daily.baked,2);assert.equal(loaded.daily.taps,2);
  assert.equal(buyCookieUpgrade(loaded,'convection',date()).ok,true);writeBakery(loaded,store);
  const purchased=readBakery(store,date());assert.equal(purchased.lifetime,2);assert.equal(purchased.testCookies,1050000);assert.equal(purchased.upgrades.convection,1);
});

test('invalid temporary cookie grants never change the bakery',()=>{
  const state=createBakery({cookies:800,lifetime:950},date()),before=structuredClone(state);
  for(const count of [undefined,null,'100',0,-1,.5,NaN,Infinity,1e12+1,Number.MAX_SAFE_INTEGER]){
    assert.equal(grantCookieTestCookies(state,count),0);assert.deepEqual(state,before);
  }
});

test('temporary grants work while paused and stop exactly at the bakery balance cap',()=>{
  const state=createBakery({cookies:1e15-50,lifetime:1e15-50,testCookies:1e15-100},date());state.paused=true;
  const before=structuredClone(state);assert.equal(grantCookieTestCookies(state,100),50);assert.equal(state.cookies,1e15);assert.equal(state.testCookies,1e15-50);
  assert.equal(state.paused,true);assert.equal(state.lifetime,before.lifetime);assert.deepEqual(state.daily,before.daily);assert.deepEqual(state.badges,before.badges);
  const full=structuredClone(state);assert.equal(grantCookieTestCookies(state,100),0);assert.deepEqual(state,full);
});

test('legacy balances retain their lifetime minimum and saved test credits are sanitized',()=>{
  for(const testCookies of [undefined,null,-1,'500',NaN,Infinity]){
    const state=createBakery({cookies:700,lifetime:20,testCookies},date());assert.equal(state.testCookies,0);assert.equal(state.lifetime,700);
  }
  const granted=createBakery({cookies:700,lifetime:20,testCookies:650},date());assert.equal(granted.lifetime,50);
  const excessive=createBakery({cookies:700,lifetime:20,testCookies:1e20},date());assert.equal(excessive.testCookies,1e15);assert.equal(excessive.lifetime,20);
});
