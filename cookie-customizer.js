import { COOKIE_LOOKS, COOKIE_STYLE_KEY, ownsCookieLook, readCookieStyle, writeCookieStyle } from "./cookie-config.js";
import { cookieArt, stationArt, cookieEscape as esc } from "./cookie-art.js";
import { getArcadeWallet } from "./arcade/wallet.js";

export function createCookieCustomizer(root) {
  const wallet = getArcadeWallet(), wrapper = document.createElement("section");
  wrapper.className = "cc-studio";
  let owned = wallet.getState().owned, style = readCookieStyle(owned);
  wrapper.innerHTML = `<div class="cc-studio-preview cc-preview"><div class="cc-studio-cookie"></div><div class="cc-studio-station"></div><p>YOUR BAKERY, IN MOTION</p><h3></h3><span>Cookie styles and baking methods are visual only.</span></div>
    <div class="cc-studio-controls"><div class="cc-studio-basics"><label>Bakery name<input data-setting="name" maxlength="28" autocomplete="off"></label><label>Equipment color<input data-setting="accent" type="color" aria-label="Equipment color"></label></div>
    ${Object.entries(COOKIE_LOOKS).map(([setting, looks]) => `<fieldset><legend>${{ recipe: 'Cookie style', method: 'Baking method', room: 'Kitchen tiles' }[setting]}</legend><div class="cc-look-grid">${looks.map(look => `<button type="button" data-look="${look.id}" data-setting="${setting}" aria-pressed="false"><span class="cc-look-art">${setting === 'recipe' ? cookieArt({ ...style, recipe: look.id }) : stationArt('convection', { ...style, [setting]: look.id })}</span><strong>${esc(look.name)}</strong><small></small></button>`).join('')}</div></fieldset>`).join('')}
    <p class="cc-studio-status" role="status">Choose a look. Your bakery keeps the same upgrades and production.</p><a class="cc-link" href="#store/cookieclicker">Browse bakery looks in the shared shop &rarr;</a></div>`;
  root.append(wrapper);
  const status = wrapper.querySelector('.cc-studio-status');
  wrapper.querySelector('[data-setting="name"]').value = style.name;
  wrapper.querySelector('[data-setting="accent"]').value = style.accent;
  function preview() {
    wrapper.querySelector('.cc-studio-cookie').innerHTML = cookieArt(style);
    wrapper.querySelector('.cc-studio-station').innerHTML = stationArt('convection', style) + stationArt('conveyor', style);
    wrapper.querySelector('.cc-studio-preview h3').textContent = style.name;
    for (const button of wrapper.querySelectorAll('[data-look]')) {
      const setting = button.dataset.setting, value = button.dataset.look;
      const look = COOKIE_LOOKS[setting].find(item => item.id === value), unlocked = ownsCookieLook(setting, value, owned);
      button.setAttribute('aria-pressed', String(style[setting] === value));
      button.dataset.locked = String(!unlocked);
      button.querySelector('small').textContent = unlocked ? look.cost ? 'In your collection' : 'Included' : `${look.cost} arcade coins / shop`;
    }
  }
  function save() {
    const ok = writeCookieStyle(style, owned);
    status.textContent = ok ? 'Look saved. It will appear on your cookies and baking stations.' : 'This browser could not save your look. Enable local storage to keep it.';
    preview();
  }
  wrapper.addEventListener('click', event => {
    const button = event.target.closest('[data-look]'); if (!button) return;
    const { setting, look } = button.dataset;
    if (!ownsCookieLook(setting, look, owned)) { location.hash = '#store/cookieclicker'; return; }
    style[setting] = look; save();
  });
  wrapper.addEventListener('input', event => {
    const { setting } = event.target.dataset; if (!['name', 'accent'].includes(setting)) return;
    style[setting] = event.target.value; save();
  });
  const unsubscribe = wallet.subscribe(state => { owned = state.owned; preview(); });
  function onStorage(event) { if (event.key === COOKIE_STYLE_KEY) { style = readCookieStyle(owned); wrapper.querySelector('[data-setting="name"]').value = style.name; wrapper.querySelector('[data-setting="accent"]').value = style.accent; preview(); } }
  window.addEventListener('storage', onStorage);
  return () => { unsubscribe(); window.removeEventListener('storage', onStorage); wrapper.remove(); };
}
