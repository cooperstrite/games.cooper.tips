import { createWebGLScene } from "./arcade/babylon.js";
import { buildAircraft } from "./runway-aircraft.js";
import { createSceneryTools } from "./runway-scenery.js";
import { createFlightAtmosphere } from "./free-flight-atmosphere.js";
import { createFlightTerrain } from "./free-flight-terrain.js";
import { createFlightSurface } from "./free-flight-surface.js";
import { DEG } from "./runway-engine.js";
import { createCrashEffects } from "./free-flight-effects.js";
import { TERRAIN_CHUNK as SIZE, terrainHeight, airfieldsNear, fieldCoordinates, seeded, heading360 } from "./free-flight-world.js";

export async function createFreeFlightRenderer(canvas, { isCurrent = () => true } = {}) {
  const gfx = await createWebGLScene(canvas, { quality: "high", isCurrent });
  const { B, scene, camera, sun, material, shadows } = gfx, V = (x, y, z) => new B.Vector3(x, y, z);
  // The scenery spans over 100 km; a shared logarithmic depth buffer keeps
  // distant shores and nearby runway markings from fighting for the same depth.
  function syncDepth() {
    for (const mat of scene.materials) if (!(mat instanceof B.ShaderMaterial) && !mat.useLogarithmicDepth) mat.useLogarithmicDepth = true;
  }
  const panoramaUrl = new URL("./assets/runway-environment.png", import.meta.url).href;
  const environment = await new Promise(resolve => {
    let texture;
    texture = new B.EquiRectangularCubeTexture(panoramaUrl, scene, 512, false, true, () => resolve(texture), () => resolve(null));
  });
  if (!isCurrent()) { gfx.dispose(); throw new Error("Scene creation was cancelled"); }
  if (environment) { scene.environmentTexture = environment; scene.environmentIntensity = .95; }
  scene.skipPointerMovePicking = true;
  scene.imageProcessingConfiguration.exposure = 1.05; scene.imageProcessingConfiguration.contrast = 1.12;
  camera.minZ = .35; camera.maxZ = 220000; camera.fov = .76;
  sun.direction.set(.55, -.4, .55); sun.intensity = 2.6; sun.diffuse = B.Color3.FromHexString("#ffe3b5");
  scene.getLightByName("sky-fill").intensity = .5;
  shadows.mapSize = 2048; shadows.useBlurExponentialShadowMap = false; shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = B.ShadowGenerator.QUALITY_HIGH; shadows.bias = .00015; shadows.normalBias = .025;
  sun.autoCalcShadowZBounds = false; sun.autoUpdateExtends = true; sun.shadowMinZ = .1; sun.shadowOrthoScale = .12;
  const aircraftLayer = 0x10000000, sceneryLayers = camera.layerMask;
  let origin = { x: 0, z: 0 }, sector = "", aircraft = null, currentType = "", view = "", cameraReady = false, seconds = 0, effectTime = 0;
  const impact = createCrashEffects({ B, scene, material, groundHeight: terrainHeight });
  const airports = new Map();
  const ownMat = mat => mat, ownTexture = tex => tex;
  function ground(name, width, length, mat, parent = null) {
    const mesh = B.MeshBuilder.CreateGround(name, { width, height: length }, scene);
    mesh.material = mat; mesh.parent = parent; mesh.receiveShadows = true; mesh.isPickable = false; return mesh;
  }
  function texture(name, width, height, draw) {
    const t = new B.DynamicTexture(name, { width, height }, scene, true); t.anisotropicFilteringLevel = 8;
    draw(t.getContext(), width, height); t.update(); return t;
  }
  const surface = createFlightSurface({ B, scene });
  const terrain = createFlightTerrain({ B, scene, material: surface.material });
  const atmosphere = createFlightAtmosphere({ B, scene, camera, panoramaUrl });
  const treeRoot = new B.TransformNode("free-flight-forest", scene), treeStart = scene.meshes.length;
  createSceneryTools({ B, scene, world: treeRoot, material, ownMat, ownTexture, seeded }).grove([.03, .12, .22, .4, .5].map(variation => ({ x: 0, z: 0, height: 10, variation })), false);
  const treeMeshes = scene.meshes.slice(treeStart).filter(m => m.thinInstanceCount > 0), crowns = treeMeshes.filter(m => ["pine-branches", "broadleaf-canopy"].includes(m.name)), branches = treeMeshes.filter(m => m.name === "bark-and-branches"), treeShadows = treeMeshes.find(m => m.name === "tree-ground-shadows");
  function growForest(cx, cz) {
    const matrices = Array.from({ length: 5 }, () => []), shades = [], fields = airfieldsNear(origin.x, origin.z, 16000);
    for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
      const tx = cx + ox, tz = cz + oz, r = seeded((Math.imul(tx, 92821) ^ Math.imul(tz, 68917) ^ 191) >>> 0);
      const groves = Array.from({ length: 18 }, () => ({ x: (tx + r()) * SIZE, z: (tz + r()) * SIZE, radius: 110 + r() * 220 }));
      for (let j = 0; j < 1500; j++) {
        const grove = groves[j % groves.length], angle = r() * Math.PI * 2, radius = Math.sqrt(r()) * grove.radius;
        const x = j < 180 ? (tx + r()) * SIZE : grove.x + Math.cos(angle) * radius;
        const z = j < 180 ? (tz + r()) * SIZE : grove.z + Math.sin(angle) * radius;
        const y = terrainHeight(x, z, fields), variation = r(), height = 10 + r() * 18;
        if (y < 11 || y > 1300 || fields.some(f => { const p = fieldCoordinates(f, x, z); return p.across > -450 && p.across < 950 && Math.abs(p.along) < f.length / 2 + 750; })) continue;
        const variant = y > 450 || variation < .25 ? Math.floor(variation * 11) % 3 : 3 + Math.floor(variation * 13) % 2;
        const scale = height / 10;
        matrices[variant].push(...B.Matrix.Compose(V(scale, scale, scale), B.Quaternion.RotationYawPitchRoll(variation * 25, 0, 0), V(x - origin.x, y, z - origin.z)).asArray());
        shades.push(...B.Matrix.Compose(V(height * .85, 1, height * .7), B.Quaternion.Identity(), V(x - origin.x + height * .12, y + .035, z - origin.z + height * .1)).asArray());
      }
    }
    matrices.forEach((values, i) => { for (const mesh of [crowns[i], branches[i]]) { if (!mesh) continue; mesh.setEnabled(values.length > 0); if (values.length) mesh.thinInstanceSetBuffer("matrix", new Float32Array(values), 16, true); } });
    if (treeShadows) { treeShadows.setEnabled(shades.length > 0); if (shades.length) treeShadows.thinInstanceSetBuffer("matrix", new Float32Array(shades), 16, true); }
  }
  const facilities = {};
  for (const type of ["asphalt", "grass"]) {
    const root = new B.TransformNode("free-flight-" + type + "-facilities", scene), tools = createSceneryTools({ B, scene, world: root, material, ownMat, ownTexture, seeded });
    const level = { length: type === "grass" ? 1100 : 3000, width: 60, scenery: "coast", runway: "RWY" };
    if (type === "asphalt") tools.airport(level); else tools.lodge(level);
    root.setEnabled(false); facilities[type] = root;
  }
  function runwayTexture(field) {
    return texture("field-markings-" + field.id, 256, 2048, (c, w, h) => {
      const grass = field.surface === "grass", r = seeded(108); c.fillStyle = grass ? "#64734d" : "#444d50"; c.fillRect(0, 0, w, h);
      for (let j = 0; j < 30000; j++) { c.globalAlpha = .1; c.fillStyle = r() > .5 ? "#f0eddf" : "#111f24"; c.fillRect(r() * w, r() * h, 1, 1.5); } c.globalAlpha = 1;
      c.fillStyle = "#edecdc"; c.fillRect(9, 10, 2, h - 20); c.fillRect(w - 11, 10, 2, h - 20);
      for (let y = 90; y < h - 70; y += 60 / field.length * h) c.fillRect(w / 2 - 1.5, y, 3, 25 / field.length * h);
      for (const end of [0, 1]) {
        c.save(); if (end) { c.translate(w, h); c.rotate(Math.PI); }
        for (let i = 0; i < 6; i++) { c.fillRect(25 + i * 16, 22, 9, 28); c.fillRect(w - 34 - i * 16, 22, 9, 28); }
        c.font = "bold 49px sans-serif"; c.textAlign = "center"; const number = Math.round(heading360(field.heading + (end ? 0 : 180)) / 10) || 36; c.fillText(String(number).padStart(2, "0"), w / 2, 114);
        c.fillRect(36, 175, 28, 52); c.fillRect(w - 64, 175, 28, 52); c.restore();
      }
      if (!grass) { c.fillStyle = "#131c22"; c.globalAlpha = .17; for (let j = 0; j < 60; j++) c.fillRect(90 + r() * 75, 130 + r() * 300, .6 + r() * 2, 35 + r() * 100); c.globalAlpha = 1; }
    });
  }
  function buildAirport(field) {
    const root = new B.TransformNode("airfield-" + field.id, scene); root.rotation.y = field.heading * DEG;
    root.position.set(field.x - origin.x, field.elevation, field.z - origin.z);
    const apron = ground("airfield-mown-verge", field.width + 75, field.length + 180, material("#6f8054", { roughness: 1 }), root); apron.position.y = .035;
    const tex = runwayTexture(field), mat = new B.PBRMaterial("runway-" + field.id, scene); mat.albedoTexture = tex; mat.roughness = .98; mat.metallic = 0; mat.environmentIntensity = 0;
    const runway = ground("optional-runway", field.width, field.length, mat, root); runway.position.y = .07;
    const facility = facilities[field.surface].clone("facilities-" + field.id, root); facility.position.z = -field.length / 2; facility.setEnabled(true);
    const lights = [];
    for (let z = -field.length / 2; z <= field.length / 2; z += 90) for (const side of [-1, 1]) {
      const light = B.MeshBuilder.CreateBox("runway-edge-light", { width: .6, height: .5, depth: .6 }, scene); light.position.set(side * (field.width / 2 + 1.5), .5, z); lights.push(light);
    }
    const merged = B.Mesh.MergeMeshes(lights, true, true); merged.material = material("#fff0b3", { emissive: true }); merged.parent = root; merged.isPickable = false;
    const pole = B.MeshBuilder.CreateCylinder("windsock-pole", { diameter: .2, height: 7 }, scene); pole.position.set(-field.width / 2 - 22, 3.5, -field.length / 2 + 90); pole.material = material("#b7c4bb"); pole.parent = root;
    const sock = B.MeshBuilder.CreateCylinder("windsock", { height: 3, diameterTop: .3, diameterBottom: .9 }, scene); sock.material = material("#ef7041"); sock.position.copyFrom(pole.position); sock.position.y = 7; sock.rotation.x = Math.PI / 2; sock.parent = root;
    airports.set(field.id, { field, root, tex, mat, sock });
  }
  function stream(s, force = false) {
    const cx = Math.floor(s.x / SIZE), cz = Math.floor(s.z / SIZE), next = cx + ":" + cz;
    if (next === sector && !force) return;
    const oldOrigin = origin;
    sector = next; origin = { x: cx * SIZE, z: cz * SIZE };
    camera.position.x += oldOrigin.x - origin.x; camera.position.z += oldOrigin.z - origin.z;
    if (force) cameraReady = false;
    surface.update({ origin });
    terrain.update(s, origin, force);
    growForest(cx, cz);
    const near = airfieldsNear(s.x, s.z, 18000);
    for (const [id, airport] of airports) {
      if (!near.some(f => f.id === id)) { airport.root.dispose(false, false); airport.tex.dispose(); airport.mat.dispose(); airports.delete(id); }
      else airport.root.position.set(airport.field.x - origin.x, airport.field.elevation, airport.field.z - origin.z);
    }
    for (const field of near) if (!airports.has(field.id)) buildAirport(field);
  }
  function setFlight(s) {
    impact.reset(); effectTime = 0;
    if (currentType !== s.aircraft.id) {
      aircraft?.dispose(); shadows.getShadowMap().renderList = []; aircraft = buildAircraft(gfx, s.aircraft.id); currentType = s.aircraft.id;
      for (const mesh of aircraft.root.getChildMeshes()) mesh.layerMask = aircraftLayer;
    }
    aircraft.root.setEnabled(true); cameraReady = false; stream(s, true);
  }
  function crash(s) {
    effectTime = 0; impact.burst(s, origin);
  }
  function render(s, dt, { cameraView = "chase", paused = false, lookYaw = 0, lookPitch = 0 } = {}) {
    if (!aircraft) return;
    const step = paused ? 0 : Math.min(.1, dt); seconds += step;
    if (s.phase !== "crashed") stream(s); else effectTime += step;
    terrain.update(s, origin); terrain.tick(4);
    if (view !== cameraView) { view = cameraView; cameraReady = false; }
    const contacts = { passenger: [[-3, -3.4, -2.8], [3, -3.4, -2.8], [0, -3.4, 12]], cargo: [[-2.4, -3.7, -2.6], [2.4, -3.7, -2.6], [0, -3.7, 11]], bush: [[-1.12, -1.65, .7], [1.12, -1.65, .7], [0, -1.11, -3.7]], military: [[-1.65, -2.1, -1.4], [1.65, -2.1, -1.4], [0, -2.1, 4.7]] }[currentType];
    const rotation = B.Matrix.RotationYawPitchRoll(s.heading * DEG, -s.pitch * DEG, -s.bank * DEG), lift = -Math.min(...contacts.map(p => B.Vector3.TransformCoordinates(V(...p), rotation).y));
    const position = V(s.x - origin.x, s.y + lift, s.z - origin.z);
    aircraft.root.position.copyFrom(position); aircraft.root.rotation.set(-s.pitch * DEG, s.heading * DEG, -s.bank * DEG); aircraft.update(s, s.phase === "ready" ? 0 : step);
    aircraft.root.setEnabled(s.phase !== "crashed" || effectTime < .3);
    camera.layerMask = view === "cockpit" && s.phase !== "crashed" ? sceneryLayers : sceneryLayers | aircraftLayer;
    const heading = s.heading * DEG, length = s.aircraft.length, scale = length / 36, behind = Math.max(24, 65 * scale), up = Math.max(5, 12 * scale);
    let desired, target;
    if (view === "cockpit" && s.phase !== "crashed") {
      desired = position.add(V(Math.sin(heading) * length * .3, length * .035, Math.cos(heading) * length * .3));
      const yaw = heading + lookYaw, pitch = s.pitch * DEG + lookPitch;
      target = desired.add(V(Math.sin(yaw) * Math.cos(pitch) * 400, Math.sin(pitch) * 400, Math.cos(yaw) * Math.cos(pitch) * 400)); camera.fov = .93;
    } else if (view === "orbit" && s.phase !== "crashed") {
      const yaw = heading + .7 + lookYaw, elevation = .23 + lookPitch;
      desired = position.add(V(-Math.sin(yaw) * behind * 1.35 * Math.cos(elevation), up + Math.sin(elevation) * behind, -Math.cos(yaw) * behind * 1.35 * Math.cos(elevation)));
      target = position.add(V(0, 0, 0)); camera.fov = .79;
    } else {
      desired = position.add(V(-Math.sin(heading) * behind + Math.cos(heading) * 7 * scale, up, -Math.cos(heading) * behind - Math.sin(heading) * 7 * scale));
      target = position.add(V(Math.sin(heading) * length * .5, 0, Math.cos(heading) * length * .5)); camera.fov = .76;
    }
    const floor = Math.max(0, terrainHeight(desired.x + origin.x, desired.z + origin.z)); desired.y = Math.max(floor + 2.5, desired.y);
    if (!cameraReady || view === "cockpit") { camera.position.copyFrom(desired); cameraReady = true; } else camera.position.copyFrom(B.Vector3.Lerp(camera.position, desired, 1 - Math.exp(-dt * 5)));
    camera.setTarget(target); camera.rotation.z = view === "cockpit" && s.phase !== "crashed" ? -s.bank * DEG * .75 : 0;
    const lightDirection = sun.direction.normalizeToNew(); sun.position.copyFrom(position.subtract(lightDirection.scale(220))); sun.shadowMaxZ = 260 + Math.max(40, s.y + lift) / Math.max(.15, -lightDirection.y);
    atmosphere.update(s, origin, step);
    for (const airport of airports.values()) { airport.sock.rotation.y = Math.atan2(s.weather.crosswind, -s.weather.headwind) - airport.field.heading * DEG; airport.sock.rotation.z = Math.sin(seconds * 8) * .06; }
    impact.update(step);
    syncDepth(); gfx.render();
  }
  await impact.ready;
  if (!isCurrent()) { impact.dispose(); terrain.dispose(); surface.dispose(); atmosphere.dispose(); gfx.dispose(); throw new Error("Scene creation was cancelled"); }
  return { setFlight, render, crash, resize: gfx.resize,
    getStats: () => ({ meshes: scene.meshes.length, ...terrain.getStats(), airports: airports.size, particles: impact.count, origin: { ...origin }, ready: scene.isReady(), fps: Math.round(gfx.engine.getFps()) }),
    dispose() { impact.dispose(); terrain.dispose(); surface.dispose(); atmosphere.dispose(); gfx.dispose(); },
  };
}
