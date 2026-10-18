import { createWebGLScene } from "./babylon.js";
import { CharacterBuilder } from "./characters.js";
import { buildCharacterMesh } from "./character-renderers.js";
import { createFrameLoop } from "./runtime.js";
import { createCharacterPortrait } from "./studio-2d.js";

export function studioCharacter(gameId, appearance) {
  const key = { flappy: appearance.bird, archery: appearance.avatarStyle, snake: appearance.skin, neondrift: appearance.car }[gameId];
  const builder = new CharacterBuilder(gameId, key);
  if (gameId === "flappy") {
    builder.withColors(Object.fromEntries(Object.entries(appearance.colors).filter(([slot]) => slot !== "pipe")));
    for (const slot of ["hat", "eyewear", "neckwear", "trail"]) builder.withFeature(slot, appearance[slot]);
  } else if (gameId === "archery") {
    builder.withColors({ body: appearance.outfitColor, accessory: appearance.accentColor, skin: appearance.skinTone, hair: appearance.hairColor, eyes: appearance.eyeColor, facialHair: appearance.facialHairColor, headwear: appearance.headwearColor, boots: appearance.bootColor, bow: appearance.bowColor, grip: appearance.gripColor, arrow: appearance.color });
    for (const [slot, source] of Object.entries({ hair: "hairStyle", facialHair: "facialHair", headwear: "headwear", faceShape: "faceShape", faceDetail: "faceDetail", faceAccessory: "accessory", bowStyle: "bowStyle", arrowDesign: "design" })) builder.withFeature(slot, appearance[source]);
  } else if (gameId === "snake") {
    builder.withColors({ body: appearance.palette[1], belly: appearance.palette[0], dark: appearance.palette[3], accessory: appearance.neckwear === "bow" ? "#62a2da" : appearance.neckwear === "scarf" ? "#a57bd2" : "#d96d78" });
    builder.withFeature("hat", appearance.resolvedHat).withFeature("eyewear", appearance.eyewear).withFeature("neckwear", appearance.neckwear);
  } else builder.withColors({ body: appearance.color.body, light: appearance.color.light, dark: appearance.color.dark });
  return builder.build();
}

export function createStudioPreview(root) {
  const panel = document.createElement("figure"); panel.className = "arcade-studio-preview";
  panel.innerHTML = '<div class="arcade-studio-modes" role="group" aria-label="Character preview mode"><button type="button" data-mode="2d" aria-pressed="false">2D artwork</button><button type="button" data-mode="3d" aria-pressed="true">3D character</button></div><div class="arcade-studio-stage"><canvas class="arcade-studio-webgl" role="img" aria-label="Your customized 3D character"></canvas><div class="arcade-studio-portrait" hidden></div><span>DRAG TO TURN &middot; SCROLL TO ZOOM</span></div><figcaption><strong class="arcade-studio-character-name">Your character</strong><div class="arcade-studio-focus"><button type="button" data-focus="body">Full character</button><button type="button" data-focus="face">Face / details</button><button type="button" data-focus="equipment">Bow &amp; arrows</button></div><p role="status">Preparing your 3D character...</p></figcaption>';
  root.append(panel);
  const canvas = panel.querySelector("canvas"), status = panel.querySelector("[role=status]");
  const portraitRoot = panel.querySelector(".arcade-studio-portrait"), portrait = createCharacterPortrait(portraitRoot), hint = panel.querySelector(".arcade-studio-stage > span");
  let world, entity, camera, character, appearance, gameId, signature = "", disposed = false, focus = "body", mode = "3d", failed = false, portraitTime = 0;
  panel.dataset.mode = mode;
  function drawPortrait() { if (appearance) portrait.update(gameId, appearance, focus); }
  function setMode(next) {
    mode = next; panel.dataset.mode = mode; canvas.hidden = mode !== "3d"; portraitRoot.hidden = mode !== "2d";
    hint.textContent = mode === "3d" ? "DRAG TO TURN \u00b7 SCROLL TO ZOOM" : "ORIGINAL GAME ARTWORK";
    panel.querySelectorAll("[data-mode]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.mode === mode)));
    status.textContent = failed ? "2D artwork is available. This device could not start the 3D preview. Your choices still save automatically." : "Both views share every saved choice. Changes save automatically.";
    if (mode === "2d") drawPortrait();
    else { world?.resize(); focusCamera(); world?.render(); }
  }
  function focusCamera() {
    panel.querySelectorAll("[data-focus]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.focus === focus)));
    if (!camera || !character) return;
    const family = character.family;
    const aspect = Math.max(0.3, canvas.clientWidth / (canvas.clientHeight || 1));
    const narrowScale = Math.max(1, 0.85 / aspect);
    const targets = { bird: [0, 1.7, -0.1], humanoid: [0, 1.9, -0.05], snake: [1.28, 0.75, -0.1], vehicle: [0, 0.8, -0.9] };
    if (focus === "face") { camera.setTarget(new world.B.Vector3(...targets[family])); camera.radius = { bird: 2, humanoid: 0.85, snake: 1.65, vehicle: 2.7 }[family] * narrowScale; }
    else if (focus === "equipment") { camera.setTarget(new world.B.Vector3(-0.05, 1.2, -0.12)); camera.radius = 2.3 * narrowScale; }
    else if (entity) {
      const { B } = world;
      let min = new B.Vector3(Infinity, Infinity, Infinity), max = new B.Vector3(-Infinity, -Infinity, -Infinity);
      entity.animate(0);
      for (const mesh of entity.root.getChildMeshes()) {
        mesh.computeWorldMatrix(true);
        const bounds = mesh.getBoundingInfo().boundingBox;
        min = B.Vector3.Minimize(min, bounds.minimumWorld); max = B.Vector3.Maximize(max, bounds.maximumWorld);
      }
      camera.setTarget(min.add(max).scale(0.5));
      const halfAngle = Math.atan(Math.tan(camera.fov / 2) * Math.min(1, aspect));
      camera.radius = B.Vector3.Distance(min, max) / 2 / Math.sin(halfAngle) * 1.08;
    }
    camera.alpha = -Math.PI / 2 - 0.25; camera.beta = focus === "face" ? Math.PI / 2.15 : Math.PI / 2.6;
  }
  function rebuild() {
    if (!world || !character) return;
    entity?.dispose(); entity = buildCharacterMesh(world, character); focusCamera(); if (mode === "3d") world.render();
  }
  const ready = createWebGLScene(canvas, { quality: "balanced", isCurrent: () => !disposed }).then(next => {
    if (disposed) { next.dispose(); return; }
    world = next; const { B, scene } = world; world.camera.dispose();
    camera = new B.ArcRotateCamera("character-orbit", -Math.PI / 2 - 0.25, Math.PI / 2.6, 4.5, new B.Vector3(0, 1, 0), scene);
    camera.minZ = 0.03; camera.maxZ = 100;
    scene.activeCamera = camera; camera.attachControl(canvas, true); camera.lowerRadiusLimit = 0.45; camera.upperRadiusLimit = 10; camera.lowerBetaLimit = 0.15; camera.upperBetaLimit = Math.PI / 2 + 0.3; camera.wheelDeltaPercentage = 0.01; camera.pinchDeltaPercentage = 0.01; camera.panningSensibility = 0;
    scene.clearColor = B.Color4.FromHexString("#213744ff");
    const floor = B.MeshBuilder.CreateGround("studio-floor", { width: 24, height: 24 }, scene); floor.material = world.material("#485e62", { roughness: 0.9 }); floor.receiveShadows = true;
    rebuild(); setMode(mode); panel.dataset.ready = "true";
  }).catch(() => { if (!disposed) { failed = true; panel.dataset.ready = "fallback"; panel.querySelector('[data-mode="3d"]').disabled = true; setMode("2d"); } });
  const loop = createFrameLoop(time => {
    const animationTime = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : time / 1000;
    if (mode === "3d" && world && entity) { entity.animate(animationTime); world.render(); }
    else if (mode === "2d" && time - portraitTime > 80) { portrait.animate(animationTime); portraitTime = time; }
  }); loop.start();
  const observer = new ResizeObserver(() => { if (mode === "3d") focusCamera(); }); observer.observe(panel.querySelector(".arcade-studio-stage"));
  panel.addEventListener("click", event => {
    const view = event.target.closest("button[data-mode]"); if (view) setMode(view.dataset.mode);
    const button = event.target.closest("button[data-focus]"); if (button) { focus = button.dataset.focus; focusCamera(); if (mode === "2d") drawPortrait(); }
  });
  return {
    update(id, nextAppearance) {
      if (disposed) return;
      if (gameId !== id) focus = "body";
      gameId = id; appearance = nextAppearance;
      const next = studioCharacter(gameId, appearance), nextSignature = JSON.stringify(next), changed = signature !== nextSignature;
      character = next; signature = nextSignature; panel.querySelector("strong").textContent = next.name; canvas.setAttribute("aria-label", `3D ${next.name}, with all your selected colors, features, accessories, and equipment`);
      panel.querySelector('[data-focus="equipment"]').hidden = gameId !== "archery";
      panel.querySelector('[data-focus="face"]').hidden = gameId !== "archery";
      // The normalized appearance is available to accessibility/UI checks as well as the renderer.
      panel.dataset.character = next.id; panel.dataset.appearance = nextSignature;
      if (changed) rebuild();
      // Snake's initial SVG geometry is painted after the controls are mounted.
      if (mode === "2d") queueMicrotask(() => { if (!disposed) drawPortrait(); });
    },
    ready,
    dispose() { disposed = true; observer.disconnect(); loop.stop(); entity?.dispose(); world?.dispose(); panel.remove(); },
  };
}
