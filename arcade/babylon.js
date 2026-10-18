// Pinned, self-hosted engine; no CDN or game server is needed at runtime.
let loading;
export function loadBabylon() {
  if (globalThis.BABYLON) return Promise.resolve(globalThis.BABYLON);
  if (!loading) loading = new Promise((resolve, reject) => {
    const script = document.createElement("script"); script.src = new URL("../vendor/babylonjs/babylon.js", import.meta.url).href; script.async = true;
    script.onload = () => globalThis.BABYLON ? resolve(globalThis.BABYLON) : reject(new Error("The 3D engine could not start"));
    script.onerror = () => { script.remove(); loading = null; reject(new Error("The local 3D engine could not load")); };
    document.head.append(script);
  });
  return loading;
}

export async function createWebGLScene(canvas, { quality = "balanced", orthographic = false, isCurrent = () => true } = {}) {
  const B = await loadBabylon();
  if (!isCurrent()) throw new Error("Scene creation was cancelled");
  const engine = new B.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, powerPreference: "high-performance", audioEngine: false });
  engine.setHardwareScalingLevel(1 / Math.min(globalThis.devicePixelRatio || 1, quality === "high" ? 2 : 1.5));
  const scene = new B.Scene(engine);
  scene.clearColor = B.Color4.FromHexString("#182a38ff");
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 0.95;
  const camera = new B.FreeCamera("camera", new B.Vector3(0, 2, -7), scene);
  camera.setTarget(new B.Vector3(0, 1, 0)); camera.minZ = 0.08; camera.maxZ = 200;
  if (orthographic) { camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA; camera.orthoTop = 2.4; camera.orthoBottom = -2.4; }
  const fill = new B.HemisphericLight("sky-fill", new B.Vector3(0, 1, 0), scene); fill.intensity = 0.65; fill.groundColor = B.Color3.FromHexString("#728176");
  const sun = new B.DirectionalLight("sun", new B.Vector3(-0.6, -1, 0.5), scene); sun.position.set(6, 12, -6); sun.intensity = 1.7;
  let shadows = null;
  if (quality === "high") { shadows = new B.ShadowGenerator(1024, sun); shadows.useBlurExponentialShadowMap = true; shadows.blurKernel = 24; }
  const materials = new Map();
  function material(color, { metalness = 0, roughness = 0.65, emissive = false, alpha = 1 } = {}) {
    const key = `${color}:${metalness}:${roughness}:${emissive}:${alpha}`;
    if (!materials.has(key)) {
      const mat = new B.PBRMaterial(key, scene); mat.albedoColor = B.Color3.FromHexString(color); mat.metallic = metalness; mat.roughness = roughness;
      if (emissive) mat.emissiveColor = B.Color3.FromHexString(color).scale(0.6);
      if (alpha < 1) { mat.alpha = alpha; mat.transparencyMode = B.PBRMaterial.PBRMATERIAL_ALPHABLEND; }
      materials.set(key, mat);
    }
    return materials.get(key);
  }
  let disposed = false;
  const resize = () => { if (disposed) return; engine.resize(); if (orthographic) { const aspect = Math.max(0.1, canvas.clientWidth / (canvas.clientHeight || 1)); camera.orthoLeft = -2.4 * aspect; camera.orthoRight = 2.4 * aspect; } };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  return {
    kind: "webgl3d", B, engine, scene, camera, sun, shadows, material,
    render() { if (!disposed) scene.render(); }, resize,
    dispose() { if (disposed) return; disposed = true; observer.disconnect(); scene.dispose(); engine.dispose(); },
  };
}
