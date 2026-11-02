import { BAKERY_KEY, COOKIE_UPGRADES, COOKIE_BADGES, COOKIE_COIN_GUIDE, COOKIE_COIN_STEP, COOKIE_DAILY_COINS, readCookieStyle, cookieRewardTotal, cookieReceipt } from "./cookie-config.js";
import { readBakery, writeBakery, bakeryRates, cookieUnitPrice, cookieUpgradePrice, bakeCookie, advanceBakery, buyCookieUpgrade, cookieBadgeProgress, syncCookieDay, claimCookieCoins } from "./cookie-engine.js";
import { cookieArt, stationArt, cookieBadgeArt, cookieEscape as esc } from "./cookie-art.js";
import { createCookieCustomizer } from "./cookie-customizer.js";
import { getArcadeWallet } from "./arcade/wallet.js";

const number = value => Math.floor(value).toLocaleString('en-US');
const compact = value => value < 1000000 ? number(value) : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
const output = upgrade => `+${number(upgrade.value)} ${upgrade.type === 'click' ? 'per tap' : 'per second'}`;

export function createCookieClicker(root, { editorOnly = false } = {}) {
  if (editorOnly) return createCookieCustomizer(root);
  const wallet = getArcadeWallet(), wrapper = document.createElement('section');
  wrapper.className = 'cc-game cc-paused';
  let walletState = wallet.getState(), style = readCookieStyle(walletState.owned), state = readBakery();
  let disposed = false, lease = false, acquiring = false, releaseLease = null, claimBusy = false, dirty = false;
  let frame = 0, lastFrame = 0, lastRender = 0, lastSave = 0, lastRetry = 0, bakingUntil = 0, pageName = '', floorSignature = '', badgeSignature = '';
  let toastUntil = 0, saveFailed = false;
  wrapper.innerHTML = `<header class="cc-header"><div><p class="cc-eyebrow">SMALL BATCHES. BIG DREAMS.</p><h3>${esc(style.name)}</h3></div><span class="cc-open"><i></i><span>Opening the bakery</span></span></header>
    <nav class="cc-nav" aria-label="Cookie Clicker pages"><a href="#cookieclicker" data-page="bakery">Bakery</a><a href="#cookieclicker/badges" data-page="badges">Badges <span class="cc-badge-count">0/${COOKIE_BADGES.length}</span></a><a href="#characters/cookieclicker">Customize</a><a href="#store/cookieclicker">Shop looks &rarr;</a><button type="button" class="cc-pause">Pause bakery</button></nav>
    <div class="cc-scoreboard"><div class="cc-balance"><span>COOKIES TO SPEND</span><strong data-stat="cookies">0</strong></div><div><span>PER TAP</span><strong data-stat="click">1</strong></div><div><span>PER SECOND</span><strong data-stat="cps">0</strong></div><div><span>TOTAL BAKED</span><strong data-stat="lifetime">0</strong></div></div>
    <div class="cc-toast" role="status" aria-live="polite"></div>
    <div class="cc-bakery-page"><div class="cc-bakery-scene"><div class="cc-bake-counter"><div class="cc-counter-label">FRESH FROM YOUR OVEN</div><div class="cc-cookie-wrap"><div class="cc-cookie-halo"></div><button type="button" class="cc-bake" aria-label="Bake cookies">${cookieArt(style)}</button><div class="cc-crumbs" aria-hidden="true"></div></div><h4 class="cc-recipe-name"></h4><p>Tap the cookie to bake a batch.</p><span class="cc-tap-value">+1 cookie per tap</span></div>
    <section class="cc-workshop" aria-label="Your working bakery"><header><div><span class="cc-eyebrow">THE BAKERY FLOOR</span><h4>Made with a little motion.</h4></div><span class="cc-floor-count">0 machines</span></header><div class="cc-floor"></div><p class="cc-floor-hint">Buy your first machine below to start baking automatically.</p></section></div>
    <section class="cc-coin-panel" aria-label="Arcade coin earnings"><div><span class="cc-eyebrow">A LITTLE EXTRA FOR THE ARCADE</span><h4><span class="cc-coins-today">0</span> / ${COOKIE_DAILY_COINS} coins today</h4><p class="cc-coin-next"></p></div><div><progress class="cc-coin-progress" max="${COOKIE_COIN_STEP}" value="0" aria-label="Progress toward next arcade coin"></progress><details><summary>How cookie coins work</summary><p>${COOKIE_COIN_GUIDE}</p><p>Cookies buy production upgrades here. Arcade coins buy cosmetic looks in the shared shop. Badges do not add extra coin rewards.</p></details></div></section>
    <section class="cc-upgrades"><div class="cc-section-heading"><div><p class="cc-eyebrow">BUILD YOUR BAKERY</p><h3>A new way to bake.</h3></div><p>Spend cookies on tools and machines. Every purchase adds its own working station above.</p></div>
    ${['click', 'cps'].map(type => `<section class="cc-upgrade-group"><div class="cc-group-heading"><h4>${type === 'click' ? '01 / By hand' : '02 / On the production line'}</h4><span class="cc-unit-price" data-type="${type}"></span></div><div class="cc-upgrade-grid">${COOKIE_UPGRADES.filter(u => u.type === type).map(u => `<article class="cc-upgrade" data-upgrade="${u.id}"><div class="cc-upgrade-art">${stationArt(u.id, style)}</div><div class="cc-upgrade-body"><div class="cc-upgrade-heading"><h5>${u.name}</h5><span class="cc-owned-count">0 owned</span></div><strong class="cc-output">${output(u)}</strong><p>${u.note}</p><button type="button" data-buy="${u.id}" disabled><span>Buy</span><strong>0 cookies</strong></button></div></article>`).join('')}</div></section>`).join('')}
    <details class="cc-prices"><summary>Why are the prices fair?</summary><p>All machines use the same price per added cookie per second. A 12-per-second factory always costs 12 times the price of a 1-per-second oven. Each machine purchase raises that shared price by 12%, rounded up. Hand tools follow the same rule in their own group. Nothing in the arcade shop changes these rates.</p></details></section></div>
    <section class="cc-badges-page" hidden><div class="cc-section-heading"><div><p class="cc-eyebrow">YOUR BAKING STORY</p><h3>The badge cabinet.</h3></div><p>From your first crumb to a cookie empire. Every badge stays in your collection once earned.</p></div><div class="cc-badge-grid">${COOKIE_BADGES.map(b => `<article class="cc-badge" data-badge="${b.id}"><div class="cc-badge-picture">${cookieBadgeArt(b, false)}</div><div><span class="cc-badge-state">LOCKED</span><h4>${b.name}</h4><p>${b.description}</p><progress max="${b.target}" value="0" aria-label="${b.name} progress"></progress><small></small></div></article>`).join('')}</div><a class="cc-link" href="#cookieclicker">&larr; Back to the bakery</a></section>
    <p class="cc-save-note">Progress saves in this browser. Baking pauses when you leave the game or hide this tab.</p>`;
  root.append(wrapper);
  const $ = selector => wrapper.querySelector(selector);
  const stats = Object.fromEntries([...wrapper.querySelectorAll('[data-stat]')].map(el => [el.dataset.stat, el]));
  const upgradeCards = new Map([...wrapper.querySelectorAll('[data-upgrade]')].map(el => [el.dataset.upgrade, { el, button: el.querySelector('button'), cost: el.querySelector('button strong'), owned: el.querySelector('.cc-owned-count') }]));
  const badgeCards = new Map([...wrapper.querySelectorAll('[data-badge]')].map(el => [el.dataset.badge, el]));
  const bakeButton = $('.cc-bake'), floor = $('.cc-floor'), pauseButton = $('.cc-pause');
  $('.cc-recipe-name').textContent = { classic: 'Chocolate chip', sugar: 'Vanilla sugar', oat: 'Oat & honey', cocoa: 'Double chocolate', jam: 'Strawberry thumbprint', star: 'Iced ginger stars', galaxy: 'Midnight galaxy' }[style.recipe];

  function announce(message) { if (disposed) return; $('.cc-toast').textContent = message; toastUntil = performance.now() + 6000; wrapper.classList.add('cc-has-toast'); }
  function newBadges(ids) {
    if (ids.length) announce(`Badge unlocked: ${ids.map(id => COOKIE_BADGES.find(b => b.id === id).name).join(', ')}. See your badge cabinet.`);
  }
  function persist() {
    if (!lease || !dirty) return;
    saveFailed = !writeBakery(state); if (!saveFailed) dirty = false;
    $('.cc-save-note').textContent = saveFailed ? 'This browser could not save your bakery. Keep this tab open, or enable local storage to keep your progress.' : 'Progress saves in this browser. Baking pauses when you leave the game or hide this tab.';
  }
  function paidToday() { return walletState.rewards[`cookieclicker:${cookieReceipt(state.daily.day)}`] || 0; }
  async function bankCoins() {
    if (claimBusy || !lease || cookieRewardTotal(state.daily) <= paidToday()) return;
    persist(); if (saveFailed) return;
    claimBusy = true;
    try { const result = await claimCookieCoins(state, wallet); if (result.coins) announce(`+${result.coins} arcade ${result.coins === 1 ? 'coin' : 'coins'} saved to your shared wallet.`); }
    catch { /* Retry on the next save tick. */ }
    finally { claimBusy = false; }
  }
  function renderFloor() {
    const signature = JSON.stringify(state.upgrades); if (signature === floorSignature) return; floorSignature = signature;
    const machines = COOKIE_UPGRADES.filter(u => state.upgrades[u.id]);
    floor.innerHTML = `<div class="cc-station cc-manual" data-station="bench">${stationArt('bench', style)}<span>Hand-baking bench <b>1</b></span></div>` + machines.map(u => `<div class="cc-station ${u.type === 'click' ? 'cc-manual' : 'cc-owned'}" data-station="${u.id}">${stationArt(u.id, style)}<span>${u.name} <b>&times;${state.upgrades[u.id]}</b></span></div>`).join('');
    const count = COOKIE_UPGRADES.filter(u => u.type === 'cps').reduce((n, u) => n + state.upgrades[u.id], 0);
    $('.cc-floor-count').textContent = `${count} ${count === 1 ? 'machine' : 'machines'}`;
    $('.cc-floor-hint').textContent = count ? 'Your machines bake while this game is open. Hand tools move when you tap.' : 'Buy your first machine below to start baking automatically.';
  }
  function renderBadges() {
    for (const badge of COOKIE_BADGES) {
      const card = badgeCards.get(badge.id), earned = state.badges[badge.id], progress = cookieBadgeProgress(state, badge);
      const value = String(!!earned);
      if (card.dataset.earned !== value) { card.dataset.earned = value; card.querySelector('.cc-badge-picture').innerHTML = cookieBadgeArt(badge, !!earned); }
      card.querySelector('.cc-badge-state').textContent = earned ? 'EARNED' : 'LOCKED';
      card.querySelector('progress').value = earned ? badge.target : progress;
      card.querySelector('small').textContent = earned ? `Unlocked ${new Date(earned).toLocaleDateString()}` : `${number(progress)} / ${number(badge.target)}`;
    }
  }
  function render() {
    if (disposed) return;
    const rates = bakeryRates(state), paused = state.paused || !lease || document.hidden;
    wrapper.classList.toggle('cc-paused', paused);
    $('.cc-open span').textContent = !lease ? 'Bakery active in another tab' : state.paused ? 'Taking a little break' : 'Fresh batches in progress';
    $('.cc-open').dataset.paused = String(paused);
    stats.cookies.textContent = compact(state.cookies); stats.cookies.title = `${number(state.cookies)} cookies`;
    stats.click.textContent = compact(rates.click); stats.cps.textContent = compact(rates.cps); stats.lifetime.textContent = compact(state.lifetime); stats.lifetime.title = `${number(state.lifetime)} cookies`;
    $('.cc-tap-value').textContent = `+${number(rates.click)} ${rates.click === 1 ? 'cookie' : 'cookies'} per tap`;
    bakeButton.disabled = paused; bakeButton.setAttribute('aria-label', `Bake ${number(rates.click)} ${rates.click === 1 ? 'cookie' : 'cookies'}`);
    pauseButton.textContent = state.paused ? 'Resume bakery' : 'Pause bakery'; pauseButton.setAttribute('aria-pressed', String(state.paused)); pauseButton.disabled = !lease;
    for (const upgrade of COOKIE_UPGRADES) {
      const card = upgradeCards.get(upgrade.id), cost = cookieUpgradePrice(state, upgrade.id), owned = state.upgrades[upgrade.id];
      card.cost.textContent = `${compact(cost)} cookies`; card.cost.title = `${number(cost)} cookies`;
      card.button.setAttribute('aria-label', `Buy ${upgrade.name} for ${number(cost)} cookies`);
      card.button.disabled = paused || state.cookies < cost || owned >= 10000;
      card.owned.textContent = `${number(owned)} owned`; card.el.dataset.owned = String(owned > 0);
    }
    for (const el of wrapper.querySelectorAll('.cc-unit-price')) el.textContent = `${compact(cookieUnitPrice(state, el.dataset.type))} cookies per +1${el.dataset.type === 'click' ? '/tap' : '/sec'}`;
    $('.cc-coins-today').textContent = paidToday();
    const reached = Math.max(paidToday(), cookieRewardTotal(state.daily)), remaining = Math.max(0, (reached + 1) * COOKIE_COIN_STEP - state.daily.baked);
    $('.cc-coin-next').textContent = reached >= COOKIE_DAILY_COINS ? 'Daily coin allowance complete. Keep baking for upgrades and badges.' : `${number(Math.ceil(remaining))} more cookies to your next arcade coin.`;
    $('.cc-coin-progress').value = reached >= COOKIE_DAILY_COINS ? COOKIE_COIN_STEP : Math.max(0, state.daily.baked - reached * COOKIE_COIN_STEP);
    $('.cc-badge-count').textContent = `${Object.keys(state.badges).length}/${COOKIE_BADGES.length}`;
    renderFloor();
    const signature = JSON.stringify(state.badges); if (pageName === 'badges' || signature !== badgeSignature) { renderBadges(); badgeSignature = signature; }
  }
  function readPage() {
    const next = location.hash === '#cookieclicker/badges' ? 'badges' : 'bakery'; if (pageName === next) return;
    const changed = !!pageName; pageName = next;
    $('.cc-bakery-page').hidden = pageName !== 'bakery'; $('.cc-badges-page').hidden = pageName !== 'badges';
    for (const link of wrapper.querySelectorAll('[data-page]')) { if (link.dataset.page === pageName) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
    render();
    if (changed) { const heading = $(pageName === 'badges' ? '.cc-badges-page h3' : '.cc-header h3'); heading.tabIndex = -1; heading.focus({ preventScroll: true }); heading.scrollIntoView({ block: 'nearest' }); }
  }
  function ready() {
    const paused = state.paused; state = readBakery(); state.paused = paused;
    lease = true; dirty = true; lastFrame = 0; floorSignature = ''; render(); bankCoins();
  }
  async function acquire() {
    if (disposed || lease || acquiring || document.hidden) return;
    if (!navigator.locks?.request) { ready(); return; }
    acquiring = true;
    try {
      await navigator.locks.request('cooper-cookie-bakery', { ifAvailable: true }, async lock => {
        if (!lock || disposed || document.hidden) return;
        // Only one visible tab writes production. A second tab can take over
        // after this one becomes hidden, without losing or duplicating cookies.
        await new Promise(resolve => { releaseLease = resolve; ready(); });
      });
    } finally { acquiring = false; }
  }
  function release() { persist(); lease = false; releaseLease?.(); releaseLease = null; lastFrame = 0; }
  function visibility() { if (document.hidden) { bankCoins(); release(); render(); } else { lastFrame = 0; acquire(); } }
  function onStorage(event) { if (!lease && event.key === BAKERY_KEY) { state = readBakery(); render(); } }
  function onClick(event) {
    if (disposed || !lease || state.paused || document.hidden) return;
    const buy = event.target.closest('[data-buy]');
    if (buy) {
      const result = buyCookieUpgrade(state, buy.dataset.buy); if (!result.ok) return;
      dirty = true; render(); persist(); newBadges(result.badges);
      const station = floor.querySelector(`[data-station="${buy.dataset.buy}"]`); station.classList.add('cc-new-station');
      floor.scrollTo({ top: floor.scrollTop + station.getBoundingClientRect().top - floor.getBoundingClientRect().top - 4, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }
  function bake() {
    if (!lease || document.hidden) return;
    const result = bakeCookie(state); if (!result.baked) return;
    dirty = true; newBadges(result.badges); bakingUntil = performance.now() + 700; wrapper.classList.add('is-baking');
    const crumbs = $('.cc-crumbs');
    if (crumbs.children.length < 12) {
      const pop = document.createElement('span'); pop.textContent = `+${compact(result.baked)}`; pop.style.setProperty('--cc-drift', `${Math.random() * 70 - 35}px`); crumbs.append(pop);
      pop.addEventListener('animationend', () => pop.remove(), { once: true });
      // Reduced-motion users get a brief static number instead.
      window.setTimeout(() => pop.remove(), 950);
    }
    render();
  }
  bakeButton.addEventListener('click', bake);
  wrapper.addEventListener('click', onClick);
  pauseButton.addEventListener('click', () => { if (!lease) return; state.paused = !state.paused; lastFrame = 0; persist(); bankCoins(); render(); });
  function tick(now) {
    if (disposed) return;
    if (lease && !document.hidden) {
      const result = advanceBakery(state, lastFrame ? Math.min(.25, (now - lastFrame) / 1000) : 0);
      if (!state.paused) dirty = true; newBadges(result.badges);
    }
    lastFrame = now;
    if (now - lastRender > 160) { render(); lastRender = now; }
    if (now - lastSave > 1000) { syncCookieDay(state); persist(); bankCoins(); lastSave = now; }
    if (now - lastRetry > 1000) { acquire(); lastRetry = now; }
    if (now > bakingUntil) wrapper.classList.remove('is-baking');
    if (now > toastUntil) wrapper.classList.remove('cc-has-toast');
    frame = requestAnimationFrame(tick);
  }
  const unsubscribe = wallet.subscribe(value => { walletState = value; });
  window.addEventListener('hashchange', readPage); window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', release);
  readPage(); acquire(); frame = requestAnimationFrame(tick);
  return () => {
    bankCoins(); release(); disposed = true; cancelAnimationFrame(frame); unsubscribe();
    window.removeEventListener('hashchange', readPage); window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', release); wrapper.remove();
  };
}
