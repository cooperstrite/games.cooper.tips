import { BAKERY_KEY, COOKIE_UPGRADES, COOKIE_BADGES, COOKIE_COIN_TIERS, COOKIE_DAILY_COINS, COOKIE_MAX_LINES, readCookieStyle, cookieRewardTotal, cookieCoinProgress, cookieReceipt } from "./cookie-config.js";
import { readBakery, writeBakery, bakeryRates, cookieUnitPrice, cookieUpgradePrice, cookieLinePrice, buyCookieLine, bakeCookie, advanceBakery, buyCookieUpgrade, cookieBadgeProgress, syncCookieDay, claimCookieCoins, grantCookieTestCookies } from "./cookie-engine.js";
import { cookieArt, stationArt, cookieBadgeArt, cookieEscape as esc } from "./cookie-art.js";
import { createCookieCustomizer } from "./cookie-customizer.js";
import { createCookieProduction } from "./cookie-production.js";
import { connectCookieInput } from "./cookie-input.js";
import { connectCookieFullscreen } from "./cookie-fullscreen.js";
import { connectCookieTesting } from "./cookie-testing.js";
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
    <nav class="cc-nav" aria-label="Cookie Clicker pages"><a href="#cookieclicker" data-page="bakery">Bakery</a><a href="#cookieclicker/badges" data-page="badges">Badges <span class="cc-badge-count">0/${COOKIE_BADGES.length}</span></a><a href="#characters/cookieclicker">Customize</a><a href="#store/cookieclicker">Shop looks &rarr;</a><button type="button" class="cc-fullscreen" aria-expanded="false">Fullscreen bakery</button><button type="button" class="cc-pause">Pause bakery</button></nav>
    <div class="cc-focus-controls" hidden><span>THE BAKERY FLOOR</span><button type="button" class="cc-exit-fullscreen">Exit fullscreen <kbd>Esc</kbd></button></div>
    <div class="cc-scoreboard"><div class="cc-balance"><span>COOKIES TO SPEND</span><strong data-stat="cookies">0</strong></div><div><span>PER TAP</span><strong data-stat="click">1</strong></div><div><span>PER SECOND</span><strong data-stat="cps">0</strong></div><div><span>TOTAL BAKED</span><strong data-stat="lifetime">0</strong></div></div>
    <div class="cc-toast" role="status" aria-live="polite"></div>
    <div class="cc-bakery-page"><div class="cc-bakery-scene"><div class="cc-bake-counter"><div class="cc-counter-label">FRESH FROM YOUR OVEN</div><div class="cc-cookie-wrap"><div class="cc-cookie-halo"></div><button type="button" class="cc-bake" aria-label="Bake cookies">${cookieArt(style)}</button><div class="cc-crumbs" aria-hidden="true"></div></div><div class="cc-focus-balance"><span>COOKIES TO SPEND</span><strong>0</strong></div><h4 class="cc-recipe-name"></h4><p>Tap the cookie to bake a batch.</p><span class="cc-tap-value">+1 cookie per tap</span></div>
    <section class="cc-workshop" aria-label="Your working bakery"><header><div><span class="cc-eyebrow">THE PRODUCTION LINE</span><h4>From a little dough to a lovely delivery.</h4></div><div class="cc-line-metrics"><span class="cc-floor-count">0 upgrades</span><strong class="cc-line-pace">1.00x line speed</strong></div></header><div class="cc-line-host"></div>
    <section class="cc-expansion" aria-label="Add a production line"><div><span class="cc-eyebrow">ROOM TO GROW</span><h5><span class="cc-line-count">1</span> / ${COOKIE_MAX_LINES} production lines</h5><p class="cc-line-yield"></p><p class="cc-line-purchase-note"></p></div><button type="button" class="cc-buy-line" disabled><span>Add a production line</span><strong></strong></button></section></section></div>
    <section class="cc-touch-settings" aria-label="Touch gaming settings" hidden><button type="button" aria-pressed="true">Touch gaming: on</button><p></p></section>
    <section class="cc-coin-panel" aria-label="Arcade coin earnings"><div><span class="cc-eyebrow">A LITTLE EXTRA FOR THE ARCADE</span><h4><span class="cc-coins-today">0</span> / ${COOKIE_DAILY_COINS} coins today</h4><p class="cc-coin-next"></p><p>Each coin needs both baking and manual taps.</p></div><div class="cc-coin-meters"><label><span class="cc-cookie-progress-label"></span><progress class="cc-coin-progress" max="1000" value="0" aria-label="Cookies toward next arcade coin"></progress></label><label><span class="cc-tap-progress-label"></span><progress class="cc-tap-progress" max="10" value="0" aria-label="Manual taps toward next arcade coin"></progress></label><details><summary>How cookie coins work</summary><p>These are the extra cookies and taps needed for EACH coin in that range. Machines help bake cookies; only pressing the cookie adds manual taps. Keyboard presses count too.</p><table><caption>Daily coin milestones</caption><thead><tr><th scope="col">Coins</th><th scope="col">Cookies each</th><th scope="col">Taps each</th></tr></thead><tbody>${COOKIE_COIN_TIERS.map(tier => `<tr><th scope="row">${tier.from}-${tier.to}</th><td>${number(tier.cookies)}</td><td>${tier.taps}</td></tr>`).join('')}</tbody></table><p>All 200 take 11,420,000 cookies and 7,300 manual taps that day. Spending cookies does not reduce progress. Both counters reset at local midnight; unused progress does not carry over. Hidden or closed tabs do not bake.</p><p>Cookies buy production upgrades here. Arcade coins buy cosmetic looks in the shared shop. Badges do not add extra coin rewards.</p></details></div></section>
    <section class="cc-upgrades"><div class="cc-section-heading"><div><p class="cc-eyebrow">BUILD YOUR BAKERY</p><h3>A new way to bake.</h3></div><p>Equipment expands your kitchen and speeds up every line. Machine purchases install the same equipment on each line you own.</p></div>
    ${['click', 'cps'].map(type => `<section class="cc-upgrade-group"><div class="cc-group-heading"><h4>${type === 'click' ? '01 / By hand' : '02 / On the production line'}</h4><span class="cc-unit-price" data-type="${type}"></span></div><div class="cc-upgrade-grid">${COOKIE_UPGRADES.filter(u => u.type === type).map(u => `<article class="cc-upgrade" data-upgrade="${u.id}"><div class="cc-upgrade-art">${stationArt(u.id, style)}</div><div class="cc-upgrade-body"><div class="cc-upgrade-heading"><h5>${u.name}</h5><span class="cc-owned-count">0 owned</span></div><strong class="cc-output">${output(u)}</strong><p>${u.note}</p><button type="button" data-buy="${u.id}" disabled><span>Buy</span><strong>0 cookies</strong></button></div></article>`).join('')}</div></section>`).join('')}
    <details class="cc-prices"><summary>Why are the prices fair?</summary><p>All machines use the same price per added cookie per second. A 12-per-second factory always costs 12 times the price of a 1-per-second oven. Machines are installed on every line, so both their added output and purchase cost scale with your line count. Each machine purchase raises the shared unit price by 12%, rounded up. New lines cost cookies, include copies of your installed machines, and become more expensive as the warehouse grows. Hand tools improve manual taps and keep their separate pricing. Nothing in the arcade shop changes these rates.</p></details></section></div>
    <section class="cc-badges-page" hidden><div class="cc-section-heading"><div><p class="cc-eyebrow">YOUR BAKING STORY</p><h3>The badge cabinet.</h3></div><p>From your first crumb to a cookie empire. Every badge stays in your collection once earned.</p></div><div class="cc-badge-grid">${COOKIE_BADGES.map(b => `<article class="cc-badge" data-badge="${b.id}"><div class="cc-badge-picture">${cookieBadgeArt(b, false)}</div><div><span class="cc-badge-state">LOCKED</span><h4>${b.name}</h4><p>${b.description}</p><progress max="${b.target}" value="0" aria-label="${b.name} progress"></progress><small></small></div></article>`).join('')}</div><a class="cc-link" href="#cookieclicker">&larr; Back to the bakery</a></section>
    <p class="cc-save-note">Progress saves in this browser. Baking pauses when you leave the game or hide this tab.</p>`;
  root.append(wrapper);
  const $ = selector => wrapper.querySelector(selector);
  const stats = Object.fromEntries([...wrapper.querySelectorAll('[data-stat]')].map(el => [el.dataset.stat, el]));
  const upgradeCards = new Map([...wrapper.querySelectorAll('[data-upgrade]')].map(el => [el.dataset.upgrade, { el, button: el.querySelector('button'), cost: el.querySelector('button strong'), owned: el.querySelector('.cc-owned-count') }]));
  const badgeCards = new Map([...wrapper.querySelectorAll('[data-badge]')].map(el => [el.dataset.badge, el]));
  const bakeButton = $('.cc-bake'), pauseButton = $('.cc-pause');
  const production = createCookieProduction($('.cc-line-host'), style, state.upgrades, state.lines);
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
    const signature = JSON.stringify([state.upgrades,state.lines]); if (signature === floorSignature) return; floorSignature = signature;
    production.update(state.upgrades,state.lines);
    const count = COOKIE_UPGRADES.reduce((n, u) => n + state.upgrades[u.id], 0);
    $('.cc-floor-count').textContent = `${count.toLocaleString()} ${count === 1 ? 'upgrade' : 'upgrades'} installed`;
    $('.cc-line-pace').textContent = `${production.pace.toFixed(2)}x line speed`;
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
    production.advance(0, paused || pageName !== 'bakery');
    $('.cc-open span').textContent = !lease ? 'Bakery active in another tab' : state.paused ? 'Taking a little break' : 'Fresh batches in progress';
    $('.cc-open').dataset.paused = String(paused);
    stats.cookies.textContent = compact(state.cookies); stats.cookies.title = `${number(state.cookies)} cookies`;
    $('.cc-focus-balance strong').textContent = compact(state.cookies);
    $('.cc-focus-balance strong').title = `${number(state.cookies)} cookies`;
    stats.click.textContent = compact(rates.click); stats.cps.textContent = compact(rates.cps); stats.lifetime.textContent = compact(state.lifetime); stats.lifetime.title = `${number(state.lifetime)} cookies`;
    $('.cc-tap-value').textContent = `+${number(rates.click)} ${rates.click === 1 ? 'cookie' : 'cookies'} per tap`;
    bakeButton.disabled = paused; bakeButton.setAttribute('aria-label', `Bake ${number(rates.click)} ${rates.click === 1 ? 'cookie' : 'cookies'}`);
    pauseButton.textContent = state.paused ? 'Resume bakery' : 'Pause bakery'; pauseButton.setAttribute('aria-pressed', String(state.paused)); pauseButton.disabled = !lease;
    const lineCost=cookieLinePrice(state),lineButton=$('.cc-buy-line'),full=state.lines>=COOKIE_MAX_LINES;
    $('.cc-line-count').textContent=state.lines;
    $('.cc-line-yield').textContent=`${number(rates.perLine)} cookies/sec per line / ${number(rates.cps)} cookies/sec total.`;
    $('.cc-line-purchase-note').textContent=full?'Your warehouse is full. Equipment upgrades still improve every line.':!rates.perLine?'Buy your first automatic machine to open another bay.':'A new line copies your installed machines and keeps baking alongside the others. Manual taps stay the same.';
    lineButton.querySelector('span').textContent=full?'Warehouse complete':'Add a production line';
    lineButton.querySelector('strong').textContent=Number.isFinite(lineCost)?`${compact(lineCost)} cookies`:full?`${COOKIE_MAX_LINES} lines installed`:'Needs automatic production';
    lineButton.disabled=paused||!Number.isFinite(lineCost)||state.cookies<lineCost;
    lineButton.setAttribute('aria-label',Number.isFinite(lineCost)?`Add production line ${state.lines+1} for ${number(lineCost)} cookies`:'Add a production line');
    for (const upgrade of COOKIE_UPGRADES) {
      const card = upgradeCards.get(upgrade.id), cost = cookieUpgradePrice(state, upgrade.id), owned = state.upgrades[upgrade.id];
      card.cost.textContent = `${compact(cost)} cookies`; card.cost.title = `${number(cost)} cookies`;
      card.button.setAttribute('aria-label', `Buy ${upgrade.name} for ${number(cost)} cookies`);
      card.button.disabled = paused || state.cookies < cost || owned >= 10000;
      card.owned.textContent = `${number(owned)} owned`; card.el.dataset.owned = String(owned > 0);
      card.el.querySelector('.cc-output').textContent=upgrade.type==='cps'&&state.lines>1?`+${number(upgrade.value*state.lines)}/sec total (${upgrade.value} per line)`:output(upgrade);
    }
    for (const el of wrapper.querySelectorAll('.cc-unit-price')) el.textContent = `${compact(cookieUnitPrice(state, el.dataset.type))} cookies per +1${el.dataset.type === 'click' ? '/tap' : '/sec'}`;
    $('.cc-coins-today').textContent = paidToday();
    const progress = cookieCoinProgress(state.daily, paidToday());
    $('.cc-coin-next').textContent = progress.complete ? 'Daily coin allowance complete. Keep baking for upgrades and badges.' : `Next: coin ${progress.coin}. Complete both requirements to earn it.`;
    $('.cc-cookie-progress-label').textContent = progress.complete || !progress.cookiesLeft ? 'Baking target complete' : `${number(Math.ceil(progress.cookiesLeft))} more cookies`;
    $('.cc-tap-progress-label').textContent = progress.complete || !progress.tapsLeft ? 'Manual taps complete' : `${number(progress.tapsLeft)} more manual taps`;
    $('.cc-coin-progress').max = progress.cookieMax; $('.cc-coin-progress').value = progress.complete ? progress.cookieMax : progress.cookieValue;
    $('.cc-tap-progress').max = progress.tapMax; $('.cc-tap-progress').value = progress.complete ? progress.tapMax : progress.tapValue;
    $('.cc-badge-count').textContent = `${Object.keys(state.badges).length}/${COOKIE_BADGES.length}`;
    renderFloor();
    const signature = JSON.stringify(state.badges); if (pageName === 'badges' || signature !== badgeSignature) { renderBadges(); badgeSignature = signature; }
  }
  function readPage() {
    const next = location.hash === '#cookieclicker/badges' ? 'badges' : 'bakery'; if (pageName === next) return;
    const changed = !!pageName; pageName = next;
    $('.cc-bakery-page').hidden = pageName !== 'bakery'; $('.cc-badges-page').hidden = pageName !== 'badges';
    $('.cc-fullscreen').hidden = pageName !== 'bakery';
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
    if(event.target.closest('.cc-buy-line')){
      const result=buyCookieLine(state);if(!result.ok)return;
      dirty=true;render();persist();production.purchased('line');newBadges(result.badges);
      announce(`Line ${state.lines} is open. All ${state.lines} lines are baking together.`);return;
    }
    const buy = event.target.closest('[data-buy]');
    if (buy) {
      const result = buyCookieUpgrade(state, buy.dataset.buy); if (!result.ok) return;
      dirty = true; render(); persist(); newBadges(result.badges);
      production.purchased(buy.dataset.buy);
      if (!result.badges.length) announce(`${COOKIE_UPGRADES.find(u=>u.id===buy.dataset.buy).name} installed. The line is picking up speed.`);
    }
  }
  function bake() {
    if (!lease || document.hidden) return;
    const result = bakeCookie(state); if (!result.baked) return;
    production.bake();
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
  const disconnectInput = connectCookieInput(wrapper, bake);
  const disconnectFullscreen = connectCookieFullscreen(wrapper);
  // Temporary testing shortcut. These credits never enter earned-cookie counters.
  const disconnectTesting = connectCookieTesting(wrapper, {
    canOpen: () => !disposed && lease && !document.hidden && pageName === 'bakery',
    grant(amount) {
      if (disposed || !lease || document.hidden) return 0;
      const added = grantCookieTestCookies(state, amount);
      if (added) { dirty = true; render(); persist(); }
      return added;
    }, announce,
  });
  wrapper.addEventListener('click', onClick);
  pauseButton.addEventListener('click', () => { if (!lease) return; state.paused = !state.paused; lastFrame = 0; persist(); bankCoins(); render(); });
  function tick(now) {
    if (disposed) return;
    const dt = lastFrame ? Math.min(.1, (now - lastFrame) / 1000) : 0;
    production.advance(dt, !lease || state.paused || document.hidden || pageName !== 'bakery');
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
    bankCoins(); release(); disposed = true; cancelAnimationFrame(frame); unsubscribe(); disconnectTesting(); disconnectFullscreen(); production.dispose(); disconnectInput();
    window.removeEventListener('hashchange', readPage); window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', release); wrapper.remove();
  };
}
