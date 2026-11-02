import { createWebGLScene } from "./arcade/babylon.js";
import { buildAircraft } from "./runway-aircraft.js";

// Reuse the flight model, its panel textures, lights, gear and control surfaces.
// This scene is an inspection stand; it never starts the simulation or its audio.
export async function createAircraftPreview(canvas, { isCurrent = () => true } = {}) {
  const gfx = await createWebGLScene(canvas, { quality: "high", isCurrent });
  const { B, scene, sun, shadows, engine } = gfx;
  gfx.camera.dispose();
  const camera = new B.ArcRotateCamera("hangar-orbit", Math.PI / 3, Math.PI / 2.8, 60, B.Vector3.Zero(), scene);
  camera.minZ = .1; camera.maxZ = 2000;
  camera.lowerBetaLimit = .18; camera.upperBetaLimit = Math.PI / 2 - .025;
  camera.panningSensibility = 0; camera.wheelDeltaPercentage = .01; camera.pinchDeltaPercentage = .01;
  camera.attachControl(canvas, true); scene.activeCamera = camera;
  sun.direction.set(-.55, -.8, -.5); sun.position.set(40, 65, 45); sun.intensity = 2.6;
  sun.diffuse = B.Color3.FromHexString("#ffe7c8");
  sun.shadowMinZ = .1; sun.shadowMaxZ = 220; sun.shadowOrthoScale = .15;
  shadows.mapSize = 2048; shadows.useBlurExponentialShadowMap = false;
  shadows.usePercentageCloserFiltering = true; shadows.filteringQuality = B.ShadowGenerator.QUALITY_HIGH;
  shadows.bias = .0002; shadows.normalBias = .025;
  scene.imageProcessingConfiguration.exposure = 1.05; scene.imageProcessingConfiguration.contrast = 1.12;
  scene.fogMode = B.Scene.FOGMODE_LINEAR; scene.fogStart = 200; scene.fogEnd = 550;
  const floor = B.MeshBuilder.CreateGround("hangar-floor", { width: 1200, height: 1200 }, scene);
  const floorMaterial = gfx.material("#344653", { roughness: .92 }); floor.material = floorMaterial; floor.receiveShadows = true;
  let aircraft = null, currentType, disposed = false, radius = 50;
  const theme = () => {
    const light = document.documentElement.dataset.theme === "light";
    const color = B.Color3.FromHexString(light ? "#c9d9df" : "#233440");
    scene.clearColor = new B.Color4(color.r, color.g, color.b, 1);
    scene.fogColor = color;
    floorMaterial.albedoColor = B.Color3.FromHexString(light ? "#b8cbd2" : "#344653");
  };
  theme();
  const themeObserver = new MutationObserver(theme); themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  // Reflections match the game's coastal lighting; the background remains a
  // quiet hangar so the aircraft is easy to inspect from every direction.
  const environment = new B.EquiRectangularCubeTexture(new URL("./assets/runway-environment.png", import.meta.url).href, scene, 256);
  scene.environmentTexture = environment; scene.environmentIntensity = .9;

  function bounds() {
    let min = new B.Vector3(Infinity, Infinity, Infinity), max = new B.Vector3(-Infinity, -Infinity, -Infinity);
    for (const mesh of aircraft.root.getChildMeshes()) {
      if (!mesh.isEnabled() || !mesh.getTotalVertices()) continue;
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      min = B.Vector3.Minimize(min, box.minimumWorld); max = B.Vector3.Maximize(max, box.maximumWorld);
    }
    return { min, max };
  }
  function fit(reset = false) {
    if (!aircraft || disposed) return;
    gfx.resize();
    const { min, max } = bounds();
    const aspect = Math.max(.3, canvas.clientWidth / Math.max(1, canvas.clientHeight));
    const halfAngle = Math.atan(Math.tan(camera.fov / 2) * Math.min(1, aspect));
    radius = B.Vector3.Distance(min, max) / 2;
    camera.setTarget(min.add(max).scale(.5));
    camera.radius = radius / Math.sin(halfAngle) * .9;
    camera.lowerRadiusLimit = radius * .65; camera.upperRadiusLimit = camera.radius * 2.5;
    floor.position.y = min.y - .025;
    if (reset) { camera.alpha = Math.PI / 3; camera.beta = Math.PI / 2.8; }
  }
  const resizeObserver = new ResizeObserver(() => fit()); resizeObserver.observe(canvas);
  function update(type, { gear = true, flaps = 0, hook = false } = {}) {
    if (disposed) return;
    if (type !== currentType) {
      aircraft?.dispose(); aircraft = buildAircraft(gfx, type); currentType = type;
      aircraft.update({ gear, flaps, hook, power: 0, phase: "ready" }, 0); fit(true);
    } else aircraft.update({ gear, flaps, hook, power: 0, phase: "ready" }, 0);
    canvas.dataset.aircraft = type;
    gfx.render();
  }
  engine.runRenderLoop(() => { if (!disposed && !document.hidden && isCurrent()) gfx.render(); });
  return { update, ready: () => scene.whenReadyAsync(), reset: () => fit(true), turn(amount) { camera.alpha += amount; },
    dispose() { disposed = true; themeObserver.disconnect(); resizeObserver.disconnect(); engine.stopRenderLoop(); aircraft?.dispose(); gfx.dispose(); },
  };
}
