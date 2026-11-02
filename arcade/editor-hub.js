import { STUDIO_GAMES as GAME_PROFILES, PUBLIC_STUDIO_GAMES, STUDIO_VIEWS, PREVIEW_ONLY_GAMES } from "./games.js";
import { createStudioPreview } from "./studio-preview.js";

const STUDIOS = {
  cookieclicker: { image: "assets/cookie-clicker-cover.png", summary: "Cookie styles, baking methods, kitchen tiles, and equipment colors.", description: "Make your bakery your own with the same animated artwork as the game. Choose included cookie styles or unlock more looks in the shop. All choices are cosmetic." },
  harmonic: { image: "assets/harmonic-echo-cover.png", summary: "Arrange your instrument lineup and audition your collection.", description: "Seven free instruments and four shop voices. Choose which instruments occupy each pad, preview their sound and artwork, and save your ensemble for every new game." },
  catsdogs: { image: "assets/cats-dogs-cover-v3.jpg", summary: "Cat and dog breeds, coat colors, hand-placed patches, and accessories.", description: "Ten free breeds, Labrador coat colors, flame point Siamese, and your own coat painter. Save separate names, colors, patch designs and accessories for each pet. Preview the original game artwork and ending poses." },
  rocket: { image: "assets/rocket-boost-cover.png", summary: "Build your rocket and customize up to three astronauts.", description: "Rocket families, stages, all vehicle parts, colors, and your crew's faces, hair, pressure suits, and equipment. Inspect the whole rocket or each astronaut in 3D (Beta)." },
  runway: { image: "assets/runway-glide-cover.png", summary: "Inspect your aircraft and choose your landing setup.", description: "Passenger, cargo, bush, and military aircraft, with the same detailed 3D models as the game. Choose your approach, flight controls, guides, and tower voice." },
  freeflight: { image: "assets/free-flight-cover.png", summary: "Choose your plane, departure, weather, and flight preferences.", description: "Turn and inspect all four aircraft in 3D. Choose where your next flight begins, its weather, and your preferred controls." },
  flappy: { image: "assets/flappy-bird-cover.svg", summary: "Birds, dragons, accessories, colors, backgrounds, and pipes.", description: "Every bird, accessory, trail, and individual color, plus a preview of your background and pipes." },
  // The original Aurora Archery cover retains its legacy Memory Loop filename.
  archery: { image: "assets/memory-loop-cover.png", summary: "Your archer's face, hair, outfit, bow, and arrows.", description: "Your full avatar, face, hair, facial hair, outfit, bow, and arrows. Inspect the same look in 2D or turn and zoom it in 3D (Beta)." },
  snake: { image: "assets/ChatGPT Image Feb 4, 2026, 06_33_02 PM.png", summary: "Snake skins, colors, hats, glasses, and neckwear.", description: "All snake skins, colors, hats, eyewear, neckwear, music, and sound effects, with the original live artwork." },
  neondrift: { image: "assets/neon-drift-cover.png", summary: "Choose your car, explore its ability, and pick your paint.", description: "Choose your car, see its original special ability, and customize its paint with the original game artwork." },
  redlight: { image: "assets/redlight-cover.png", summary: "Running outfits, hair, facial hair, accessories, and individual colors.", description: "Customize your runner's outfit, body build, skin, hair, facial hair, and accessories. The same saved look appears in the 2D track and 3D race (Beta)." },
};

// Editors mount the games' original controls and renderers. No reduced copy of a
// customization schema lives in the hub, so new game options appear here too.
export function createCharacterLibrary(root, { gameId = null, allowPreview = false, mountEditor } = {}) {
  const wrapper = document.createElement("section"); wrapper.className = "arcade-library-hub";
  root.append(wrapper);
  const previousTitle = document.title;
  let current, cleanup = null;
  function show(id, focus = false) {
    id = Object.hasOwn(GAME_PROFILES, id) ? id : null;
    if (PREVIEW_ONLY_GAMES.includes(id) && !allowPreview) id = null;
    if (id === current) return;
    cleanup?.(); cleanup = null; wrapper.replaceChildren(); current = id;
    wrapper.dataset.page = id ? "studio" : "games";
    if (!id) {
      wrapper.innerHTML = `<div class="arcade-hero"><div><p class="arcade-eyebrow">YOUR WHOLE ARCADE WARDROBE</p><h3>Choose your game.</h3><p>Pick a studio to customize your character, colors, gear, and world.</p></div><a class="arcade-text-link" href="#store">Find new looks in the shop &rarr;</a></div>
        <nav class="arcade-studio-grid" aria-label="Choose a game to customize">${Object.entries(PUBLIC_STUDIO_GAMES).map(([key, game]) => `<a class="arcade-studio-card" href="#characters/${key}" aria-label="Customize ${game.name}"><img src="${STUDIOS[key].image}" alt="" width="480" height="240"><div><h4>${game.name}</h4><p>${STUDIOS[key].summary}</p><span>Open studio <span aria-hidden="true">&rarr;</span></span></div></a>`).join("")}</nav>`;
      document.title = "Choose a game | Character Library | games.cooper.tips";
    } else {
      const game = GAME_PROFILES[id];
      const temporary = PREVIEW_ONLY_GAMES.includes(id), aircraft = ['runway', 'freeflight'].includes(id);
      const choices = temporary ? { [id]: game } : PUBLIC_STUDIO_GAMES;
      const viewNote = STUDIO_VIEWS[id].length === 2 ? "Preview the original 2D cartoon animation or the rotatable 3D character (Beta)." : aircraft ? "Inspect the same 3D aircraft you fly in the game." : id === 'rocket' ? "Inspect your vehicle and crew in 3D (Beta)." : "Preview your choices with the original game artwork.";
      wrapper.innerHTML = `<a class="arcade-editor-back arcade-text-link" href="${temporary ? game.route : '#characters'}">&larr; ${temporary ? 'Back to Rocket Boost' : 'All games'}</a><div class="arcade-hero"><div><p class="arcade-eyebrow">${game.name}${temporary ? ' / TEMPORARY CUSTOMIZATION' : ''}</p><h3>${aircraft ? 'Your personal hangar.' : 'Make it yours.'}</h3><p>${viewNote} Your changes save automatically.</p></div>${aircraft ? '' : `<a class="arcade-text-link" href="${temporary ? '#store/rocket' : '#store'}">${temporary ? 'Temporary shop' : 'Find new looks in the shop'} &rarr;</a>`}</div>
        <div class="arcade-editor-toolbar"><label>Customize for<select aria-label="Character game">${Object.entries(choices).map(([key, profile]) => `<option value="${key}">${profile.name}</option>`).join("")}</select></label><p class="arcade-editor-description">${STUDIOS[id].description}</p><a class="arcade-editor-play" href="${game.route}">Play ${game.name} &rarr;</a></div><div class="arcade-studio-layout"><div class="arcade-studio-preview-host"></div><div class="arcade-editor-host"></div></div>`;
      const select = wrapper.querySelector("select"); select.value = id;
      select.addEventListener("change", () => { location.hash = `#characters/${select.value}`; });
      if (id === "harmonic") {
        wrapper.querySelector('.arcade-hero p:last-child').textContent = 'Arrange your instrument collection and hear each voice. Your changes save automatically.';
        wrapper.querySelector('.arcade-hero a').href = '#store/harmonic';
        wrapper.querySelector('.arcade-hero a').textContent = 'Find new instruments in the shop';
        wrapper.querySelector('.arcade-editor-toolbar select').setAttribute('aria-label', 'Customization game');
      }
      if (id === "cookieclicker") {
        wrapper.querySelector('.arcade-hero h3').textContent = 'A bakery with your name on it.';
        wrapper.querySelector('.arcade-hero a').href = '#store/cookieclicker';
        wrapper.querySelector('.arcade-hero a').textContent = 'Find new bakery looks in the shop';
        wrapper.querySelector('.arcade-editor-toolbar select').setAttribute('aria-label', 'Customization game');
      }
      const nativePreview = id === "rocket" || id === "harmonic" || id === "cookieclicker" || aircraft;
      if (nativePreview) {
        wrapper.querySelector(".arcade-studio-preview-host").remove();
        wrapper.querySelector(".arcade-studio-layout").classList.add(id === "rocket" ? "rb-library-layout" : aircraft ? "flight-library-layout" : id === "cookieclicker" ? "cc-library-layout" : "he-library-layout");
      }
      const preview = nativePreview ? { update() {}, dispose() {} } : createStudioPreview(wrapper.querySelector(".arcade-studio-preview-host"), { gameId: id });
      const unmountEditor = mountEditor(id, wrapper.querySelector(".arcade-editor-host"), appearance => preview.update(id, appearance));
      cleanup = () => { unmountEditor?.(); preview.dispose(); };
      document.title = `Customize ${game.name} | games.cooper.tips`;
    }
    if (focus) {
      const heading = wrapper.querySelector("h3"); heading.tabIndex = -1; heading.focus({ preventScroll: true });
      wrapper.scrollIntoView({ block: "start" });
    }
  }
  function readRoute() { const match = /^#characters(?:\/([a-z]+))?$/.exec(location.hash); if (match) show(match[1], true); }
  window.addEventListener("hashchange", readRoute);
  show(gameId);
  return () => { window.removeEventListener("hashchange", readRoute); cleanup?.(); document.title = previousTitle; wrapper.remove(); };
}
