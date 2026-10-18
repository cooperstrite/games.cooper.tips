import { createWebGLScene } from "./babylon.js";
import { CharacterBuilder } from "./characters.js";
import { buildCharacterMesh } from "./character-renderers.js";
import { WORLD } from "../flappy-engine.js";
import { THEMES } from "../flappy-appearance.js";

// A view of the existing Flappy model. No input, collision, score, or physics lives here.
export async function createFlappyWebGL(canvas, model, getSettings, isCurrent = () => true) {
  const world = await createWebGLScene(canvas, { quality: canvas.clientWidth > 650 ? "high" : "balanced", isCurrent });
  const { B, scene, camera } = world, pipes = new Map(), scenery = [];
  let bird = null, appearanceKey = "", styleKey = "", disposed = false;
  camera.fov = 0.95;
  scene.fogMode = B.Scene.FOGMODE_LINEAR; scene.fogStart = 24; scene.fogEnd = 90;
  const ground = B.MeshBuilder.CreateGround("flight-ground", { width: 180, height: 220 }, scene); ground.position.z = 60; ground.receiveShadows = true;
  for (let i = 0; i < 30; i++) {
    const side = i % 2 ? -1 : 1, trunk = B.MeshBuilder.CreateCylinder("tree-trunk", { height: 1.3, diameter: 0.22, tessellation: 8 }, scene);
    const leaves = B.MeshBuilder.CreateSphere("tree-crown", { diameter: 1.8, segments: 12 }, scene); leaves.scaling.y = 1.45;
    trunk.position.x = leaves.position.x = side * (4 + (i * 19 % 13)); trunk.position.y = 0.65; leaves.position.y = 2;
    scenery.push({ trunk, leaves, depth: i * 3.3, side });
  }
  const guide = B.MeshBuilder.CreateTorus("next-gap", { diameter: 0.22, thickness: 0.025, tessellation: 32 }, scene); guide.rotation.x = Math.PI / 2;
  guide.material = world.material("#fff4bf", { emissive: true });
  const reticle = B.MeshBuilder.CreateTorus("aim-ring", { diameter: 0.012, thickness: 0.002, tessellation: 24 }, scene); reticle.parent = camera; reticle.position.z = 0.6; reticle.rotation.x = Math.PI / 2; reticle.material = world.material("#fff8df", { emissive: true });
  function clearPipes() { for (const pair of pipes.values()) for (const mesh of pair) mesh.dispose(); pipes.clear(); }
  function syncAppearance(settings) {
    const key = JSON.stringify([settings.bird, settings.colors, settings.hat, settings.eyewear, settings.neckwear]);
    if (key !== appearanceKey) {
      bird?.dispose();
      const colors = Object.fromEntries(Object.entries(settings.colors).filter(([slot]) => slot !== "pipe"));
      const character = new CharacterBuilder("flappy", settings.bird).withColors(colors).withFeature("hat", settings.hat).build();
      bird = buildCharacterMesh(world, character); bird.root.parent = camera; bird.root.position.set(0, -1.5, 0.8); bird.root.scaling.setAll(0.7); bird.root.rotation.y = Math.PI;
      for (const mesh of bird.root.getChildMeshes()) mesh.isVisible = ["flight-feather", "membrane", "beak"].includes(mesh.name);
      appearanceKey = key;
    }
    const themeKey = JSON.stringify([settings.background, settings.pipeStyle, settings.colors.pipe]);
    if (themeKey !== styleKey) {
      clearPipes(); const theme = THEMES[settings.background];
      scene.clearColor = B.Color4.FromColor3(B.Color3.FromHexString(theme.sky[0]), 1); scene.fogColor = B.Color3.FromHexString(theme.sky[1]);
      ground.material = world.material(theme.ground, { roughness: 0.95 });
      for (const tree of scenery) { tree.trunk.material = world.material("#7c6555"); tree.leaves.material = world.material(theme.near, { roughness: 0.9 }); }
      world.sun.intensity = theme.dark ? 0.8 : 1.7; styleKey = themeKey;
    }
  }
  function makePipe(pipe, settings) {
    const pair = [], bottom = pipe.center - pipe.gap / 2, top = pipe.center + pipe.gap / 2;
    for (const [a, b, upper] of [[0, bottom, false], [top, WORLD.height + 3, true]]) {
      const body = B.MeshBuilder.CreateCylinder("pipe", { height: 1, diameter: 1, tessellation: settings.pipeStyle === "crystal" ? 8 : settings.pipeStyle === "ruins" ? 12 : 32 }, scene);
      body.scaling.set(1.15, b - a, WORLD.pipeWidth); body.position.y = (a + b) / 2;
      const rim = B.MeshBuilder.CreateCylinder("pipe-rim", { height: 0.16, diameter: 1, tessellation: 32 }, scene); rim.scaling.x = 1.32; rim.scaling.z = WORLD.pipeWidth; rim.position.y = upper ? a + 0.08 : b - 0.08;
      for (const mesh of [body, rim]) { mesh.material = world.material(settings.colors.pipe, { metalness: settings.pipeStyle === "gold" ? 0.8 : 0.12, roughness: settings.pipeStyle === "crystal" ? 0.2 : 0.4 }); mesh.receiveShadows = true; world.shadows?.addShadowCaster(mesh); pair.push(mesh); }
    }
    pipes.set(pipe.id, pair); return pair;
  }
  return {
    kind: world.kind,
    resize: world.resize,
    draw() {
      if (disposed) return;
      const state = model.state, settings = getSettings(); syncAppearance(settings);
      const dead = state.phase === "gameover" && !matchMedia("(prefers-reduced-motion: reduce)").matches;
      const height = dead ? Math.max(0.3, state.y + state.crashAge * 0.4 - state.crashAge ** 2 * 3) : state.y;
      camera.position.set(0, height, 0); camera.setTarget(new B.Vector3(0, height, 25));
      camera.rotation.z = dead ? Math.sin(state.crashAge * 10) * 0.05 * Math.max(0, 1 - state.crashAge) : 0;
      const ids = new Set(state.pipes.map(pipe => pipe.id));
      for (const [id, pair] of pipes) if (!ids.has(id)) { pair.forEach(mesh => mesh.dispose()); pipes.delete(id); }
      for (const pipe of state.pipes) {
        const pair = pipes.get(pipe.id) || makePipe(pipe, settings);
        const ranges = [[0, pipe.center - pipe.gap / 2], [pipe.center + pipe.gap / 2, WORLD.height + 3]];
        ranges.forEach(([a, b], index) => { const body = pair[index * 2], rim = pair[index * 2 + 1]; body.scaling.y = b - a; body.position.y = (a + b) / 2; rim.position.y = index ? a + 0.08 : b - 0.08; });
        for (const mesh of pair) mesh.position.z = pipe.x - state.distance;
      }
      for (const tree of scenery) { const z = ((tree.depth - state.distance) % 100 + 100) % 100 - 4; tree.trunk.position.z = tree.leaves.position.z = z; }
      const next = state.pipes.find(pipe => !pipe.passed);
      guide.setEnabled(settings.guide && !!next); if (next) guide.position.set(0, next.center, next.x - state.distance - WORLD.pipeWidth / 2 - 0.03);
      reticle.setEnabled(settings.guide);
      const time = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : state.time;
      bird?.animate(time); world.render();
    },
    dispose() { if (disposed) return; disposed = true; bird?.dispose(); clearPipes(); world.dispose(); },
  };
}
