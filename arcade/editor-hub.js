import { GAME_PROFILES } from "./characters.js";
import { createStudioPreview } from "./studio-preview.js";

// Editors mount the games' original controls and renderers. No reduced copy of a
// customization schema lives in the hub, so new game options appear here too.
export function createCharacterLibrary(root, { gameId = "flappy", mountEditor } = {}) {
  const wrapper = document.createElement("section"); wrapper.className = "arcade-library-hub";
  wrapper.innerHTML = `<div class="arcade-hero"><div><p class="arcade-eyebrow">YOUR WHOLE ARCADE WARDROBE</p><h3>Every detail. All in one place.</h3><p>Use every original customization option with the game's 2D cartoon artwork. You can also try the rotatable 3D character (Beta). Your changes save automatically.</p></div><a class="arcade-text-link" href="#store">Find new looks in the shop &rarr;</a></div>
    <div class="arcade-editor-toolbar"><label>Customize for<select aria-label="Character game">${Object.entries(GAME_PROFILES).map(([id, game]) => `<option value="${id}">${game.name}</option>`).join("")}</select></label><p class="arcade-editor-description"></p><a class="arcade-editor-play" href="#flappy">Play Flappy Bird &rarr;</a></div><div class="arcade-studio-layout"><div class="arcade-studio-preview-host"></div><div class="arcade-editor-host"></div></div>`;
  root.append(wrapper);
  const select = wrapper.querySelector("select"), host = wrapper.querySelector(".arcade-editor-host"), description = wrapper.querySelector(".arcade-editor-description"), play = wrapper.querySelector(".arcade-editor-play");
  const descriptions = {
    flappy: "Every bird, accessory, trail, and individual color, plus your saved pipe and background choices.",
    archery: "Your full avatar, face, hair, facial hair, outfit, bow, and arrows. Inspect the same look in 2D or turn and zoom it in 3D (Beta).",
    snake: "All snake skins, colors, hats, eyewear, neckwear, music, and sound effects, with the original live artwork.",
    neondrift: "Choose your car, see its original special ability, and customize its paint in 2D or try the 3D preview (Beta).",
  };
  let current = null, cleanup = null;
  const preview = createStudioPreview(wrapper.querySelector(".arcade-studio-preview-host"));
  function show(id) {
    if (!Object.hasOwn(GAME_PROFILES, id) || id === current) return;
    cleanup?.(); cleanup = null; host.replaceChildren(); current = id; select.value = id;
    description.textContent = descriptions[id]; play.href = GAME_PROFILES[id].route; play.textContent = `Play ${GAME_PROFILES[id].name} ->`;
    cleanup = mountEditor(id, host, appearance => preview.update(id, appearance));
    document.title = `Customize ${GAME_PROFILES[id].name} | games.cooper.tips`;
  }
  function readRoute() { const match = /^#characters(?:\/(flappy|archery|snake|neondrift))?$/.exec(location.hash); if (match) show(match[1] || "flappy"); }
  select.addEventListener("change", () => { location.hash = `#characters/${select.value}`; });
  window.addEventListener("hashchange", readRoute);
  const previousTitle = document.title; show(gameId);
  return () => { window.removeEventListener("hashchange", readRoute); cleanup?.(); preview.dispose(); document.title = previousTitle; wrapper.remove(); };
}
