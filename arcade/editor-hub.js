import { GAME_PROFILES } from "./characters.js";
import { createStudioPreview } from "./studio-preview.js";

const STUDIOS = {
  catsdogs: { image: "assets/cats-dogs-cover-v3.jpg", summary: "Cat and dog breeds, coat colors, hand-placed patches, and accessories.", description: "Ten free breeds, Labrador coat colors, flame point Siamese, and your own coat painter. Save separate names, colors, patch designs and accessories for each pet. Preview the original artwork or try the 3D character (Beta)." },
  rocket: { image: "assets/rocket-boost-cover.png", summary: "Build your rocket and customize up to three astronauts.", description: "Rocket families, stages, all vehicle parts, colors, and your crew's faces, hair, pressure suits, and equipment. Preview the whole rocket or each astronaut in 2D or 3D (Beta)." },
  flappy: { image: "assets/flappy-bird-cover.svg", summary: "Birds, dragons, accessories, colors, backgrounds, and pipes.", description: "Every bird, accessory, trail, and individual color, plus a preview of your background and pipes." },
  // The original Aurora Archery cover retains its legacy Memory Loop filename.
  archery: { image: "assets/memory-loop-cover.png", summary: "Your archer's face, hair, outfit, bow, and arrows.", description: "Your full avatar, face, hair, facial hair, outfit, bow, and arrows. Inspect the same look in 2D or turn and zoom it in 3D (Beta)." },
  snake: { image: "assets/ChatGPT Image Feb 4, 2026, 06_33_02 PM.png", summary: "Snake skins, colors, hats, glasses, and neckwear.", description: "All snake skins, colors, hats, eyewear, neckwear, music, and sound effects, with the original live artwork." },
  neondrift: { image: "assets/neon-drift-cover.png", summary: "Choose your car, explore its ability, and pick your paint.", description: "Choose your car, see its original special ability, and customize its paint in 2D or try the 3D preview (Beta)." },
  redlight: { image: "assets/redlight-cover.png", summary: "Running outfits, hair, facial hair, accessories, and individual colors.", description: "Customize your runner's outfit, body build, skin, hair, facial hair, and accessories. The same saved look appears in the 2D track and 3D race (Beta)." },
};

// Editors mount the games' original controls and renderers. No reduced copy of a
// customization schema lives in the hub, so new game options appear here too.
export function createCharacterLibrary(root, { gameId = null, mountEditor } = {}) {
  const wrapper = document.createElement("section"); wrapper.className = "arcade-library-hub";
  root.append(wrapper);
  const previousTitle = document.title;
  let current, cleanup = null;
  function show(id, focus = false) {
    id = Object.hasOwn(GAME_PROFILES, id) ? id : null;
    if (id === current) return;
    cleanup?.(); cleanup = null; wrapper.replaceChildren(); current = id;
    wrapper.dataset.page = id ? "studio" : "games";
    if (!id) {
      wrapper.innerHTML = `<div class="arcade-hero"><div><p class="arcade-eyebrow">YOUR WHOLE ARCADE WARDROBE</p><h3>Choose your game.</h3><p>Pick a studio to customize your character, colors, gear, and world.</p></div><a class="arcade-text-link" href="#store">Find new looks in the shop &rarr;</a></div>
        <nav class="arcade-studio-grid" aria-label="Choose a game to customize">${Object.entries(GAME_PROFILES).map(([key, game]) => `<a class="arcade-studio-card" href="#characters/${key}" aria-label="Customize ${game.name}"><img src="${STUDIOS[key].image}" alt="" width="480" height="240"><div><h4>${game.name}</h4><p>${STUDIOS[key].summary}</p><span>Open studio <span aria-hidden="true">&rarr;</span></span></div></a>`).join("")}</nav>`;
      document.title = "Choose a game | Character Library | games.cooper.tips";
    } else {
      const game = GAME_PROFILES[id];
      wrapper.innerHTML = `<a class="arcade-editor-back arcade-text-link" href="#characters">&larr; All games</a><div class="arcade-hero"><div><p class="arcade-eyebrow">${game.name}</p><h3>Make it yours.</h3><p>Use every original customization option with the game's 2D cartoon artwork. You can also try the rotatable 3D character (Beta). Your changes save automatically.</p></div><a class="arcade-text-link" href="#store">Find new looks in the shop &rarr;</a></div>
        <div class="arcade-editor-toolbar"><label>Customize for<select aria-label="Character game">${Object.entries(GAME_PROFILES).map(([key, profile]) => `<option value="${key}">${profile.name}</option>`).join("")}</select></label><p class="arcade-editor-description">${STUDIOS[id].description}</p><a class="arcade-editor-play" href="${game.route}">Play ${game.name} &rarr;</a></div><div class="arcade-studio-layout"><div class="arcade-studio-preview-host"></div><div class="arcade-editor-host"></div></div>`;
      const select = wrapper.querySelector("select"); select.value = id;
      select.addEventListener("change", () => { location.hash = `#characters/${select.value}`; });
      if (id === "rocket") {
        wrapper.querySelector(".arcade-studio-preview-host").remove();
        wrapper.querySelector(".arcade-studio-layout").classList.add("rb-library-layout");
      }
      const preview = id === "rocket" ? { update() {}, dispose() {} } : createStudioPreview(wrapper.querySelector(".arcade-studio-preview-host"));
      const unmountEditor = mountEditor(id, wrapper.querySelector(".arcade-editor-host"), appearance => preview.update(id, appearance));
      cleanup = () => { unmountEditor?.(); preview.dispose(); };
      document.title = `Customize ${game.name} | games.cooper.tips`;
    }
    if (focus) {
      const heading = wrapper.querySelector("h3"); heading.tabIndex = -1; heading.focus({ preventScroll: true });
      wrapper.scrollIntoView({ block: "start" });
    }
  }
  function readRoute() { const match = /^#characters(?:\/(flappy|archery|snake|neondrift|redlight|rocket|catsdogs))?$/.exec(location.hash); if (match) show(match[1], true); }
  window.addEventListener("hashchange", readRoute);
  show(gameId);
  return () => { window.removeEventListener("hashchange", readRoute); cleanup?.(); document.title = previousTitle; wrapper.remove(); };
}
