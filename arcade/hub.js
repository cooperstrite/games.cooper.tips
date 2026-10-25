import { ARCADE_ITEMS, STYLE_KITS } from "./catalog.js";
import { getArcadeWallet } from "./wallet.js";
import { ARCADE_GAMES } from "./games.js";
import { EARNING_RULES } from "./game-services.js";
import { readFlappySettings } from "../flappy-appearance.js";
import { drawFlappyShopPreview } from "../flappy-renderer.js";
import { readRocketSave, writeRocketSave } from "../rocket-config.js";
import { drawRocketShopPreview } from "../rocket-art.js";
import { readMemorySettings, writeMemorySettings } from "../memory-config.js";
import { memoryShopArt } from "../memory-art.js";
import { memoryShopCoinGuide, memoryShopCoinTable } from "../memory-coin-guide.js";

const gameOptions = (compatible = Object.keys(ARCADE_GAMES).filter(id => ARCADE_ITEMS.some(item => item.games.includes(id)))) => Object.entries(ARCADE_GAMES).filter(([id]) => compatible.includes(id)).map(([id, game]) => `<option value="${id}">${game.name}</option>`).join("");
const KEYS = { flappy: "cooper-flappy-bird-v1", archery: "aurora-archery-v2", snake: "snake-garden-settings-v1", neondrift: "neondrift-drive-v2" };
function readSettings(game) { try { const value = JSON.parse(localStorage.getItem(KEYS[game])); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; } }
function writeSettings(game, settings) { try { localStorage.setItem(KEYS[game], JSON.stringify(settings)); return true; } catch { return false; } }
const money = value => value.toLocaleString();

export function mountArcadeNavigation(root) {
  if (!root) return () => {};
  const nav = document.createElement("nav"); nav.className = "arcade-nav"; nav.setAttribute("aria-label", "Arcade navigation");
  nav.innerHTML = '<a href="#">Games</a><a href="#characters">Character library</a><a href="#store" class="arcade-wallet-link"><span aria-hidden="true">&#9673;</span> <strong>0</strong> <span>Shared shop</span></a>';
  root.append(nav); const unsubscribe = getArcadeWallet().subscribe(state => { nav.querySelector("strong").textContent = money(state.coins); });
  return () => { unsubscribe(); nav.remove(); };
}

export function createArcadeShop(root, initialGame = "all") {
  const wallet = getArcadeWallet(), wrapper = document.createElement("section"); wrapper.className = "arcade-hub arcade-shop";
  wrapper.innerHTML = `<div class="arcade-hero"><div><p class="arcade-eyebrow">ONE ARCADE. MORE POSSIBILITIES.</p><h3>A little play goes a long way.</h3><p>Your coins travel between games. Pick a look for one adventure, or a collection for several.</p></div><div class="arcade-balance"><span>YOUR COINS</span><strong>0</strong><small>Shared across your arcade</small></div></div>
    <div class="arcade-toolbar"><label>Find something for<select aria-label="Shop game"><option value="all">All games</option>${gameOptions()}</select></label><label class="arcade-owned-filter"><input type="checkbox" aria-label="Show owned items only"> My collection</label><a href="#characters">Open character library &rarr;</a></div>
    <p class="arcade-shop-status" role="status">All items change appearance. Your game abilities stay the same.</p><div class="arcade-item-grid"></div>
    <details class="arcade-earning-guide"><summary>How to earn coins</summary><div>${Object.entries(EARNING_RULES).map(([id, note]) => `<p><a href="${ARCADE_GAMES[id].route}">${ARCADE_GAMES[id].name}</a><span>${note}</span></p>`).join("")}</div>${memoryShopCoinGuide(readMemorySettings(wallet.getState().owned).tiles)}<p>Coins and unlocks save in this browser. Existing Flappy Bird coins and purchases are carried over automatically.</p></details>`;
  root.append(wrapper);
  const filter = wrapper.querySelector("select"), onlyOwned = wrapper.querySelector("input"), grid = wrapper.querySelector(".arcade-item-grid"), status = wrapper.querySelector(".arcade-shop-status");
  filter.value = initialGame; let disposed = false, busy = false;
  function render() {
    if (disposed) return;
    const state = wallet.getState(); wrapper.querySelector(".arcade-balance strong").textContent = money(state.coins);
    grid.innerHTML = "";
    const items = ARCADE_ITEMS.filter(item => (filter.value === "all" || item.games.includes(filter.value)) && (!onlyOwned.checked || state.owned.includes(item.id)));
    for (const item of items) {
      const owned = state.owned.includes(item.id), card = document.createElement("article"); card.className = "arcade-item"; card.dataset.item = item.id; card.dataset.owned = String(owned);
      card.innerHTML = `${item.kind === "memory" ? memoryShopArt(item) : item.kind === "flappy" || item.kind === "rocket" ? '<canvas class="arcade-item-art" role="img"></canvas>' : `<div class="arcade-collection-art" style="--collection-body:${STYLE_KITS[item.kit].body};--collection-wing:${STYLE_KITS[item.kit].wing};--collection-accent:${STYLE_KITS[item.kit].accent}"><span class="arcade-collection-orb"></span><span class="arcade-collection-orb"></span><span class="arcade-collection-orb"></span><strong>FOUR WORLDS.<br>ONE COLLECTION.</strong></div>`}
        <div class="arcade-item-body"><small>${item.kind === "collection" ? "FLAPPY BIRD / ARCHERY / SNAKE / NEON DRIFT" : item.kind === "rocket" ? "ROCKET BOOST / COSMETICS" : item.kind === "memory" ? "MEMORY LOOP / CARD COLLECTION" : "FLAPPY BIRD"}</small><h4>${item.name}</h4><p>${item.description}</p><div class="arcade-price"><strong>${owned ? "In your collection" : `${money(item.cost)} coins`}</strong><button type="button" data-buy="${item.id}" ${owned || state.coins < item.cost || busy ? "disabled" : ""}>${owned ? "Owned" : "Unlock"}</button></div>${owned ? item.kind === "collection" ? `<label>Use this collection in<select aria-label="Use ${item.name} in">${gameOptions(item.games)}</select></label><button type="button" data-equip="${item.id}">Apply collection &amp; play</button>` : `<button type="button" data-use="${item.id}">Use in ${item.kind === "rocket" ? "Rocket Boost" : item.kind === "memory" ? "Memory Loop" : "Flappy Bird"}</button>` : `<small>${Math.max(0, item.cost - state.coins) ? `${money(item.cost - state.coins)} more coins to unlock` : "Ready to unlock"}</small>`}</div>`;
      grid.append(card);
      if (item.kind === "flappy") { const canvas = card.querySelector("canvas"); canvas.setAttribute("aria-label", `${item.name} preview`); drawFlappyShopPreview(canvas, readFlappySettings(readSettings("flappy")), item); }
      if (item.kind === "rocket") { const canvas = card.querySelector("canvas"); canvas.setAttribute("aria-label", `${item.name} preview`); drawRocketShopPreview(canvas, item); }
      if (owned && item.kind === "collection" && filter.value !== "all") card.querySelector("select").value = filter.value;
    }
    if (!items.length) { const empty = document.createElement("p"); empty.className = "arcade-empty"; empty.textContent = "Your collection starts here. Play any connected game to earn coins."; grid.append(empty); }
  }
  const unsubscribe = wallet.subscribe(render);
  wrapper.querySelector('[aria-label="Memory Loop reward board size"]').addEventListener("change", event => {
    wrapper.querySelector(".ml-shop-coin-table").innerHTML = memoryShopCoinTable(Number(event.target.value));
  });
  filter.addEventListener("change", () => { render(); const hash = filter.value === "all" ? "#store" : `#store/${filter.value}`; history.replaceState(null, "", hash); });
  onlyOwned.addEventListener("change", render);
  wrapper.addEventListener("click", async event => {
    const button = event.target.closest("[data-buy], [data-equip], [data-use]"); if (!button || busy) return;
    if (button.dataset.buy) {
      busy = true; button.disabled = true; const result = await wallet.purchase(button.dataset.buy); busy = false; if (disposed) return;
      status.textContent = result.ok ? `${result.item.name} unlocked. Choose where to use it below.` : "You need more coins for this item."; render();
    } else if (button.dataset.equip) {
      const game = button.closest("article").querySelector("select").value; busy = true;
      const result = await wallet.equip(button.dataset.equip, game); busy = false; if (disposed) return;
      if (result.ok) location.hash = ARCADE_GAMES[game].route; else status.textContent = "Unlock this collection before equipping it.";
    } else {
      const item = ARCADE_ITEMS.find(entry => entry.id === button.dataset.use);
      if (!item || !wallet.getState().owned.includes(item.id)) return;
      if (item.kind === "memory") {
        const saved = readMemorySettings(wallet.getState().owned); saved[item.setting] = item.value;
        if (writeMemorySettings(saved)) location.hash = "#memory"; else status.textContent = "Your browser could not save the card choice.";
        return;
      }
      if (item.kind === "rocket") { const saved = readRocketSave(); saved.design[item.setting] = item.value; if (writeRocketSave(saved)) location.hash = "#characters/rocket"; else status.textContent = "Your browser could not save the look."; return; }
      if (writeSettings("flappy", { ...readSettings("flappy"), [item.setting]: item.value })) location.hash = "#flappy/customize";
      else status.textContent = "Your browser could not save the look. You can equip it in Flappy Bird's studio.";
    }
  });
  return () => { disposed = true; unsubscribe(); wrapper.remove(); };
}

