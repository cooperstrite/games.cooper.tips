import { stageStats, vehicleStats, TANKS } from './rocket-config.js';

const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// These visual nozzle dimensions are shared with the exhaust renderer. The
// flight model continues to use the original stage mass, height and thrust.
export function rocketEngineLayout(stage, stats = stageStats(stage)) {
  const count = stage.engines, spread = count > 1 ? stats.diameter * .225 : 0;
  const original = stats.diameter / (count > 1 ? 2.3 : 1.5);
  const diameter = count > 2 ? Math.min(original, 2 * spread * Math.sin(Math.PI / count) * .9) : original;
  return Array.from({ length: count }, (_, index) => {
    const a = index / count * TAU;
    return { index, x: Math.sin(a) * spread, z: Math.cos(a) * spread, diameter };
  });
}

function random(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }

export function createRocketMaterials(w, design, palette) {
  const { B, scene } = w, [body, accent] = palette, owned = [], textures = [];
  function texture(name, width, height, draw) {
    const t = new B.DynamicTexture(name, { width, height }, scene, true);
    t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE; t.anisotropicFilteringLevel = 8;
    draw(t.getContext(), width, height); t.update(); textures.push(t); return t;
  }
  function copy(name, color, options) { const m = w.material(color, options).clone(name); owned.push(m); return m; }
  const paint = copy('rocket-aerospace-enamel', body, { metalness: design.livery === 'carbon' ? .42 : .26, roughness: .3 });
  paint.albedoTexture = texture('rocket-enamel-panels', 1024, 1024, (c, width, height) => {
    const r = random(5729); c.fillStyle = '#f7f7f3'; c.fillRect(0, 0, width, height);
    for (let j = 0; j < 8; j++) {
      c.fillStyle = `rgba(43,51,56,${.008 + r() * .019})`; c.fillRect(j * 128, 0, 128, height);
      c.strokeStyle = 'rgba(33,43,50,.12)'; c.lineWidth = 1; c.beginPath(); c.moveTo(j * 128, 0); c.lineTo(j * 128, height); c.stroke();
      for (let y = 18; y < height; y += 58) for (const x of [j * 128 + 5, j * 128 + 123]) {
        c.fillStyle = 'rgba(21,33,43,.2)'; c.beginPath(); c.arc(x, y, 1.4, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(x - .4, y - 1, 1.2, .6);
      }
    }
    for (let j = 0; j < 26000; j++) { c.fillStyle = `rgba(25,35,41,${r() * .025})`; c.fillRect(r() * width, r() * height, design.livery === 'carbon' ? 3 : 1, 1); }
    if (design.livery === 'carbon') for (let y = 0; y < height; y += 8) for (let x = 0; x < width; x += 8) {
      c.fillStyle = (x + y) % 16 ? 'rgba(255,255,255,.10)' : 'rgba(10,16,22,.1)'; c.fillRect(x, y, 5, 2);
    }
    if (design.livery === 'heritage') for (let x = 0; x < width; x += 256) { c.fillStyle = '#303941'; c.fillRect(x, 912, 128, 112); }
    if (design.livery === 'nebula') for (let i = 0; i < 50; i++) { c.fillStyle = 'rgba(215,213,255,.35)'; c.beginPath(); c.arc(r() * width, r() * height, 1 + r() * 2, 0, TAU); c.fill(); }
  });
  paint.clearCoat.isEnabled = true; paint.clearCoat.intensity = .3; paint.clearCoat.roughness = .28;
  paint.albedoTexture.vScale = 1.5;
  const metal = copy('rocket-brushed-aluminum', '#9aa8ad', { metalness: .88, roughness: .35 });
  metal.albedoTexture = texture('rocket-machined-metal-grain', 256, 256, (c, width, height) => {
    const r = random(71); c.fillStyle = '#dfe3e2'; c.fillRect(0, 0, width, height);
    for (let j = 0; j < 1800; j++) { c.fillStyle = `rgba(40,50,57,${r() * .08})`; c.fillRect(0, r() * height, width, .25 + r() * .5); }
  });
  const dark = w.material('#222c32', { metalness: .4, roughness: .54 });
  const trim = w.material(accent, { metalness: .34, roughness: .34 });
  const rubber = w.material('#222527', { roughness: .9 });
  const glass = copy('rocket-laminated-flight-glass', '#17323f', { metalness: .2, roughness: .09 });
  glass.clearCoat.isEnabled = true; glass.clearCoat.intensity = .95; glass.clearCoat.roughness = .035;
  const engine = copy('rocket-nozzle-alloy', '#585e60', { metalness: .87, roughness: .39 });
  const copper = w.material('#93765a', { metalness: .76, roughness: .39 });
  const insulation = w.material('#b8b6a3', { metalness: .5, roughness: .68 });
  const heatshield = copy('rocket-ablative-thermal-tiles', '#59524a', { metalness: .05, roughness: .92 });
  heatshield.albedoTexture = texture('rocket-heatshield-tiles', 512, 512, (c, width, height) => {
    const r = random(938); c.fillStyle = '#222426'; c.fillRect(0, 0, width, height);
    for (let y = -16; y < height + 32; y += 25) for (let x = -18; x < width + 32; x += 29) {
      const px = x + (Math.round(y / 25) % 2 ? 14.5 : 0), n = 124 + Math.floor(r() * 42);
      c.fillStyle = `rgb(${n},${n - 3},${n - 8})`; c.beginPath();
      for (let j = 0; j < 6; j++) { const a = (j + .5) * TAU / 6; c.lineTo(px + Math.cos(a) * 15, y + Math.sin(a) * 15); }
      c.closePath(); c.fill(); c.strokeStyle = '#424444'; c.lineWidth = 1.5; c.stroke();
    }
  });
  heatshield.albedoTexture.uScale = 3; heatshield.albedoTexture.vScale = .22;
  const hot = w.material('#ffd8a4', { emissive: true });
  return { paint, metal, dark, trim, rubber, glass, engine, copper, insulation, heatshield, hot,
    dispose() { owned.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); } };
}

function geometry(w, parent) {
  const { B, scene } = w, V = (x, y, z) => new B.Vector3(x, y, z);
  function finish(mesh, material, cast = true) {
    mesh.parent = parent; mesh.material = material; mesh.receiveShadows = true; mesh.isPickable = false;
    if (cast) w.shadows?.addShadowCaster(mesh); return mesh;
  }
  function lathe(name, profile, material, cap = B.Mesh.NO_CAP) {
    return finish(B.MeshBuilder.CreateLathe(name, { shape: profile.map(([y, r]) => V(r, y, 0)), tessellation: 96, cap, sideOrientation: B.Mesh.DOUBLESIDE }, scene), material);
  }
  function cylinder(name, y, height, top, bottom, material) {
    const m = finish(B.MeshBuilder.CreateCylinder(name, { height, diameterTop: top, diameterBottom: bottom, tessellation: 64 }, scene), material); m.position.y = y; return m;
  }
  function box(name, position, size, material) {
    const m = finish(B.MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene), material); m.position.set(...position); return m;
  }
  function sphere(name, position, size, material) {
    const m = finish(B.MeshBuilder.CreateSphere(name, { diameter: 1, segments: 20 }, scene), material); m.position.set(...position); m.scaling.set(...size); return m;
  }
  function ring(name, y, diameter, thickness, material, x = 0, z = 0) {
    const m = finish(B.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 64 }, scene), material); m.position.set(x, y, z); return m;
  }
  function tube(name, points, radius, material, smooth = false, cast = true) {
    let path = points.map(p => Array.isArray(p) ? V(...p) : p);
    if (smooth && path.length > 2) path = B.Curve3.CreateCatmullRomSpline(path, 6, false).getPoints();
    return finish(B.MeshBuilder.CreateTube(name, { path, radius, tessellation: 8, cap: B.Mesh.CAP_ALL }, scene), material, cast);
  }
  return { finish, lathe, cylinder, box, sphere, ring, tube };
}

function radiusAt(profile, y) {
  let i = 0; while (i < profile.length - 2 && y > profile[i + 1][0]) i++;
  const a = profile[i], b = profile[i + 1]; return a[1] + (b[1] - a[1]) * clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
}
function smoothProfile(points, steps = 5) {
  const result = [];
  for (let i = 0; i < points.length - 1; i++) for (let j = 0; j < steps; j++) {
    const t = j / steps, a = points[i], b = points[i + 1], p = points[Math.max(0, i - 1)], n = points[Math.min(points.length - 1, i + 2)];
    const r = .5 * (2 * a[1] + (-p[1] + b[1]) * t + (2 * p[1] - 5 * a[1] + 4 * b[1] - n[1]) * t * t + (-p[1] + 3 * a[1] - 3 * b[1] + n[1]) * t * t * t);
    result.push([a[0] + (b[0] - a[0]) * t, clamp(r, Math.min(a[1], b[1]), Math.max(a[1], b[1]))]);
  }
  result.push(points.at(-1)); return result;
}

function surfacePatch(w, parent, name, material, profile, angle, width, bottom, top, offset = 0, rows = 16, columns = 16) {
  const { B, scene } = w, mesh = new B.Mesh(name, scene), positions = [], normals = [], uvs = [], indices = [];
  for (let j = 0; j <= rows; j++) {
    const y = bottom + (top - bottom) * j / rows, radius = radiusAt(profile, y) + offset;
    const slope = (radiusAt(profile, y + .01) - radiusAt(profile, y - .01)) / .02;
    for (let i = 0; i <= columns; i++) {
      const a = angle + (i / columns - .5) * width, length = Math.hypot(1, slope);
      positions.push(Math.sin(a) * radius, y, Math.cos(a) * radius); normals.push(Math.sin(a) / length, -slope / length, Math.cos(a) / length); uvs.push(i / columns, j / rows);
    }
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) { const k = j * (columns + 1) + i; indices.push(k, k + columns + 1, k + 1, k + 1, k + columns + 1, k + columns + 2); }
  const data = new B.VertexData(); Object.assign(data, { positions, normals, uvs, indices }); data.applyToMesh(mesh);
  mesh.parent = parent; mesh.material = material; mesh.isPickable = false; mesh.receiveShadows = true; return mesh;
}

function roundedOutline(profile, angle, centerY, halfWidth, halfHeight, offset, corner = .11) {
  const points = [];
  for (let c = 0; c < 4; c++) {
    const sx = c === 0 || c === 3 ? 1 : -1, sy = c < 2 ? 1 : -1;
    for (let j = 0; j < 9; j++) {
      const a = c * Math.PI / 2 + j / 8 * Math.PI / 2;
      const x = sx * (halfWidth - corner * .5) + Math.cos(a) * corner * .5;
      const y = centerY + sy * (halfHeight - corner) + Math.sin(a) * corner;
      const r = radiusAt(profile, y) + offset, theta = angle + x;
      points.push([Math.sin(theta) * r, y, Math.cos(theta) * r]);
    }
  }
  points.push(points[0]); return points;
}

export function buildRocketStage(w, stage, index, mats, parent) {
  const { B, scene } = w, node = new B.TransformNode(`stage-${index + 1}`, scene); node.parent = parent;
  const g = geometry(w, node), s = stageStats(stage), r = s.diameter / 2, h = s.height;
  const tankHeight = TANKS[stage.tank].height, engineHeight = h - tankHeight - 1.2, bottom = -h / 2, tankBase = bottom + engineHeight, tankTop = h / 2 - 1.2;
  const tankProfile = [[tankBase, r * .96], [tankBase + .12, r], [tankTop - .15, r], [tankTop, r * .98]];
  g.lathe('tank-enamel', tankProfile, mats.paint, B.Mesh.CAP_ALL);
  g.cylinder('upper-interstage', h / 2 - .6, 1.2, s.diameter, s.diameter, mats.dark);
  g.cylinder('lower-thrust-skirt', tankBase + .12, .36, s.diameter + .01, s.diameter + .01, mats.metal);
  for (const y of [tankBase + .34, tankBase + tankHeight * .26, tankBase + tankHeight * .73, tankTop - .12]) {
    g.ring('welded-tank-seam', y, s.diameter + .018, .033, mats.metal);
    g.ring('weld-shadow', y - .035, s.diameter + .013, .012, mats.dark);
  }
  g.cylinder('mission-stripe', h / 2 - 2, .37, s.diameter + .024, s.diameter + .024, mats.trim);
  for (const y of [h / 2 - 2.27, h / 2 - 1.73]) g.ring('mission-pinstripe', y, s.diameter + .018, .025, mats.trim);
  for (let j = 0; j < 24; j++) {
    const a = j / 24 * TAU, x = Math.sin(a) * (r + .015), z = Math.cos(a) * (r + .015);
    const rib = g.box('interstage-stringer', [x, h / 2 - .6, z], [.045, .91, .05], mats.metal); rib.rotation.y = a;
    for (const y of [h / 2 - 1.09, h / 2 - .1]) g.sphere('stage-fastener', [Math.sin(a) * (r + .028), y, Math.cos(a) * (r + .028)], [.046, .046, .04], mats.metal);
  }
  for (const y of [h / 2 - 1.17, h / 2 - .025]) g.ring('separation-joint-band', y, s.diameter + .015, .07, mats.metal);
  for (let side = 0; side < 2; side++) {
    const a = side * Math.PI + .7, x = Math.sin(a) * (r + .055), z = Math.cos(a) * (r + .055);
    const top = tankBase + tankHeight * .92, low = tankBase + tankHeight * .07;
    g.tube('insulated-propellant-raceway', [[x, low, z], [x, top, z]], .065, mats.insulation);
    for (let j = 0; j < 8; j++) {
      const y = low + (top - low) * j / 7;
      const clamp = g.box('feedline-clamp', [x, y, z], [.21, .1, .13], mats.metal); clamp.rotation.y = a;
    }
    g.tube('raceway-return', [[x, top, z], [x, top + .18, z], [x * .92, top + .28, z * .92]], .047, mats.metal, true);
  }
  for (const { x, z, diameter: d, index: engineIndex } of rocketEngineLayout(stage, s)) {
    const engineRoot = new B.TransformNode(`engine-assembly-${engineIndex}`, scene); engineRoot.parent = node; engineRoot.position.set(x, bottom, z);
    const e = geometry(w, engineRoot);
    const profile = smoothProfile([[.08, d * .5], [engineHeight * .13, d * .47], [engineHeight * .26, d * .365], [engineHeight * .42, d * .235], [engineHeight * .56, d * .135], [engineHeight * .64, d * .105], [engineHeight * .73, d * .13]], 5);
    e.lathe('regeneratively-cooled-bell', profile, mats.engine);
    // The visible interior is a second dark liner with an actual recessed throat.
    e.lathe('nozzle-inner-carbon-liner', profile.map(([y, radius]) => [y + .003, Math.max(.01, radius - .017)]), mats.dark);
    const throat = e.finish(B.MeshBuilder.CreateDisc('recessed-nozzle-throat', { radius: d * .104, tessellation: 48, sideOrientation: B.Mesh.DOUBLESIDE }, scene), mats.rubber); throat.position.y = engineHeight * .66; throat.rotation.x = Math.PI / 2;
    e.ring('engine-rim', .08, d, .055, mats.metal);
    for (let j = 1; j < 11; j++) {
      const y = .08 + (engineHeight * .61 - .08) * j / 12;
      e.ring('nozzle-cooling-hoop', y, radiusAt(profile, y) * 2 + .009, .018, j % 4 ? mats.metal : mats.copper);
    }
    for (let j = 0; j < 24; j++) {
      const a = j / 24 * TAU;
      e.tube('regenerative-nozzle-channel', profile.filter((_, k) => k % 3 === 0).map(([y, radius]) => [Math.sin(a) * (radius + .008), y, Math.cos(a) * (radius + .008)]), .012, mats.copper, false, false);
    }
    e.cylinder('combustion-chamber', engineHeight * .8, engineHeight * .24, d * .29, d * .24, mats.metal);
    e.ring('injector-flange', engineHeight * .91, d * .32, .075, mats.metal);
    e.sphere('gimbal-joint', [0, engineHeight * .97, 0], [d * .27, engineHeight * .15, d * .27], mats.dark);
    for (let j = 0; j < 3; j++) {
      const a = j / 3 * TAU + .2, sn = Math.sin(a), cs = Math.cos(a);
      e.tube('engine-thrust-frame', [[sn * d * .35, engineHeight * 1.015, cs * d * .35], [sn * d * .16, engineHeight * .88, cs * d * .16]], .055, mats.metal);
      e.tube('engine-feed-duct', [[sn * d * .34, engineHeight * 1.01, cs * d * .34], [sn * d * .35, engineHeight * .82, cs * d * .35], [sn * d * .26, engineHeight * .72, cs * d * .26], [sn * d * .13, engineHeight * .72, cs * d * .13]], .045, mats.metal, true);
      e.sphere('turbopump-housing', [sn * d * .31, engineHeight * .83, cs * d * .31], [d * .2, engineHeight * .18, d * .2], mats.metal);
    }
  }
  for (let i = 0; i < stage.fins; i++) {
    const fin = new B.Mesh('tapered-airfoil-stabilizer', scene), data = new B.VertexData();
    data.positions = [r, bottom + .3, -.08, r, bottom + 4.1, -.08, r + 1.8, bottom + .8, -.028, r + 1.8, bottom + .6, -.028, r, bottom + .3, .08, r, bottom + 4.1, .08, r + 1.8, bottom + .8, .028, r + 1.8, bottom + .6, .028];
    data.indices = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0];
    data.normals = []; B.VertexData.ComputeNormals(data.positions, data.indices, data.normals); data.applyToMesh(fin); fin.rotation.y = i / stage.fins * TAU; g.finish(fin, mats.trim);
    const edge = g.tube('fin-leading-edge', [[r, bottom + 4.1, 0], [r + 1.8, bottom + .8, 0]], .034, mats.metal); edge.rotation.y = fin.rotation.y;
    for (const dy of [.55, 1.4, 2.3]) { const a = -fin.rotation.y; g.sphere('fin-root-fastener', [Math.cos(a) * (r + .025), bottom + dy, Math.sin(a) * (r + .025)], [.055, .055, .055], mats.metal); }
  }
  // Static hardware shares materials. Merge it in stage-local coordinates so
  // even a four-stage, sixteen-engine custom stack stays inexpensive to draw.
  const originalParent = node.parent; node.parent = null; node.computeWorldMatrix(true);
  const groups = new Map();
  for (const mesh of node.getChildMeshes()) {
    if (!mesh.isVerticesDataPresent(B.VertexBuffer.UVKind)) mesh.setVerticesData(B.VertexBuffer.UVKind, new Float32Array(mesh.getTotalVertices() * 2));
    if (!groups.has(mesh.material)) groups.set(mesh.material, []);
    groups.get(mesh.material).push(mesh); mesh.computeWorldMatrix(true); w.shadows?.removeShadowCaster(mesh);
  }
  for (const [material, meshes] of groups) {
    const name = meshes[0].name, merged = B.Mesh.MergeMeshes(meshes, true, true);
    merged.name = name; merged.parent = node; merged.material = material; merged.receiveShadows = true; merged.isPickable = false; w.shadows?.addShadowCaster(merged);
  }
  node.parent = originalParent;
  return node;
}

function buildPressureCapsule(w, capsule, mats) {
  const { B, scene } = w, g = geometry(w, capsule);
  const profile = smoothProfile([[-2.72, 1.6], [-2.5, 1.65], [-1.95, 1.63], [-1.35, 1.52], [-.7, 1.37], [0, 1.18], [.65, .96], [1.15, .77], [1.68, .59]], 6);
  const windows = Array.from({ length: 5 }, (_, i) => (i + .5) / 5 * TAU), bottomWindow = -.04, topWindow = .68, halfWidth = .225;
  const ys = Array.from({ length: 89 }, (_, i) => -2.72 + i / 88 * 4.4).concat([bottomWindow, topWindow]).sort((a, b) => a - b);
  const angles = Array.from({ length: 193 }, (_, i) => i / 192 * TAU).concat(windows.flatMap(a => [a - halfWidth, a + halfWidth])).sort((a, b) => a - b);
  const positions = [], normals = [], uvs = [], indices = [], columns = angles.length;
  for (const y of ys) for (const a of angles) {
    const r = radiusAt(profile, y), slope = (radiusAt(profile, y + .01) - radiusAt(profile, y - .01)) / .02, n = Math.hypot(1, slope);
    positions.push(Math.sin(a) * r, y, Math.cos(a) * r); normals.push(Math.sin(a) / n, -slope / n, Math.cos(a) / n); uvs.push(a / TAU, (y + 2.72) / 4.4);
  }
  for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < columns - 1; i++) {
    const y = (ys[j] + ys[j + 1]) / 2, a = (angles[i] + angles[i + 1]) / 2;
    if (y > bottomWindow && y < topWindow && windows.some(center => Math.abs(a - center) < halfWidth)) continue;
    const k = j * columns + i; indices.push(k, k + columns, k + 1, k + 1, k + columns, k + columns + 1);
  }
  const hull = new B.Mesh('capsule-curved-pressure-hull', scene), data = new B.VertexData();
  Object.assign(data, { positions, normals, uvs, indices }); data.applyToMesh(hull); g.finish(hull, mats.paint);
  g.lathe('ablative-heat-shield', smoothProfile([[-3.39, 1.43], [-3.31, 1.62], [-3.13, 1.74], [-2.91, 1.75], [-2.72, 1.61]], 5), mats.heatshield, B.Mesh.CAP_ALL);
  g.ring('heat-shield-rim', -2.73, 3.26, .075, mats.metal);
  g.ring('capsule-stripe', -2.23, radiusAt(profile, -2.23) * 2 + .016, .105, mats.trim);
  for (const y of [-2.55, -1.95]) g.ring('pressure-shell-panel-seam', y, radiusAt(profile, y) * 2 + .006, .022, mats.metal);
  for (const a of windows) {
    surfacePatch(w, capsule, 'capsule-recessed-laminated-window', mats.glass, profile, a, halfWidth * 2 + .05, bottomWindow - .03, topWindow + .03, -.045);
    g.tube('window-pressure-frame', roundedOutline(profile, a, .32, .267, .411, .014, .08), .041, mats.metal);
    g.tube('window-elastomer-seal', roundedOutline(profile, a, .32, .237, .378, .014, .06), .024, mats.rubber);
    for (const dy of [-.36, .36]) for (const da of [-.24, .24]) {
      const y = .32 + dy, r = radiusAt(profile, y) + .042;
      g.sphere('window-frame-fastener', [Math.sin(a + da) * r, y, Math.cos(a + da) * r], [.025, .025, .025], mats.metal);
    }
  }
  const hatchAngle = Math.PI;
  surfacePatch(w, capsule, 'pressure-hatch-panel', mats.paint, profile, hatchAngle, .6, -1.95, -.56, .014, 24, 16);
  g.tube('pressure-hatch-seal', roundedOutline(profile, hatchAngle, -1.25, .31, .73, .027, .15), .021, mats.dark);
  for (const y of [-1.75, -1.32, -.88]) {
    const a = hatchAngle + .31, r = radiusAt(profile, y) + .055;
    g.sphere('hatch-hinge', [Math.sin(a) * r, y, Math.cos(a) * r], [.13, .15, .1], mats.metal);
  }
  const latchRadius = radiusAt(profile, -1.25) + .06;
  g.tube('hatch-release-handle', [[-.24, -1.38, -latchRadius], [-.24, -1.15, -latchRadius], [-.04, -1.15, -latchRadius]], .028, mats.metal, true);
  for (let i = 0; i < 4; i++) {
    const a = (i + .25) / 4 * TAU, r = radiusAt(profile, -1.68);
    const pod = new B.TransformNode('capsule-reaction-control', scene); pod.parent = capsule; pod.position.set(Math.sin(a) * r, -1.68, Math.cos(a) * r); pod.rotation.y = a;
    const p = geometry(w, pod); p.sphere('recessed-thruster-panel', [0, 0, 0], [.34, .48, .17], mats.dark);
    for (const y of [-.12, .12]) {
      const nozzle = p.cylinder('reaction-control-nozzle', y, .16, .08, .14, mats.engine); nozzle.rotation.x = Math.PI / 2; nozzle.position.z = .11;
      p.sphere('reaction-control-throat', [0, y, .195], [.075, .075, .014], mats.rubber);
    }
  }
  g.cylinder('docking-neck', 1.75, .17, 1.14, 1.25, mats.dark);
  for (const [y, diameter] of [[1.69, 1.23], [1.81, 1.145]]) g.ring('docking-interface-ring', y, diameter, .028, mats.metal);
  for (let j = 0; j < 12; j++) { const a = j / 12 * TAU; g.box('docking-latch', [Math.sin(a) * .599, 1.75, Math.cos(a) * .599], [.055, .09, .055], mats.metal).rotation.y = a; }
  g.lathe('aerodynamic-nose-cap', smoothProfile([[1.81, .57], [2, .5], [2.22, .39], [2.45, .25], [2.68, .10], [2.8, 0]], 7), mats.paint, B.Mesh.CAP_END);
  g.ring('nose-cover-joint', 1.85, 1.11, .018, mats.trim);
  return capsule.getChildMeshes(false);
}

export function buildRocketVehicle(w, design, parent, mats) {
  const { B, scene } = w, root = new B.TransformNode('launch-vehicle', scene); root.parent = parent;
  const stats = vehicleStats(design), stages = [], interstages = []; let height = 0;
  for (let i = 0; i < design.stages.length; i++) {
    const node = buildRocketStage(w, design.stages[i], i, mats, root), s = stats.stages[i]; node.position.y = height + s.height / 2; stages.push(node);
    if (i > 0) {
      const engineHeight = s.height - TANKS[design.stages[i].tank].height - 1.2, g = geometry(w, node);
      const shell = new B.TransformNode('separating-engine-bay-shroud', scene); shell.parent = node; const sg = geometry(w, shell);
      const low = -s.height / 2, previous = stats.stages[i - 1].diameter;
      sg.lathe('engine-bay-interstage', smoothProfile([[low, previous / 2], [low + .13, previous / 2], [low + engineHeight * .85, s.diameter / 2 + .013], [low + engineHeight, s.diameter / 2 + .013]], 5), mats.paint);
      for (const [y, diameter] of [[low + .08, previous + .014], [low + engineHeight - .08, s.diameter + .038]]) sg.ring('interstage-joint', y, diameter, .045, mats.metal);
      interstages[i] = shell;
      g.ring('separation-flange', low + engineHeight, s.diameter + .04, .085, mats.metal);
    }
    height += s.height;
  }
  const capsule = new B.TransformNode('command-capsule', scene); capsule.parent = root; capsule.position.y = height + 3.4;
  const pressureParts = buildPressureCapsule(w, capsule, mats), fairing = new B.TransformNode('payload-fairing', scene); fairing.parent = capsule;
  if (!design.crewCount) {
    const fg = geometry(w, fairing), profile = smoothProfile([[-3.12, 1.76], [-2.92, 1.82], [-1.3, 1.82], [-.25, 1.76], [.65, 1.56], [1.45, 1.14], [2.05, .67], [2.52, .23], [2.68, 0]], 7);
    fg.lathe('smooth-payload-ogive', profile, mats.paint, B.Mesh.CAP_ALL);
    fg.ring('fairing-belt', -2.85, 3.65, .07, mats.trim);
    fg.ring('fairing-release-ring', -3.06, 3.56, .035, mats.metal);
    for (const a of [0, Math.PI]) {
      fg.tube('fairing-longitudinal-separation-seam', profile.filter(([, r]) => r > .2).map(([y, r]) => [Math.sin(a) * (r + .006), y, Math.cos(a) * (r + .006)]), .009, mats.metal, false, false);
      for (const y of [-2.52, -1.8, -.95, -.1]) {
        const r = radiusAt(profile, y) + .019;
        fg.sphere('fairing-release-latch', [Math.sin(a) * r, y, Math.cos(a) * r], [.11, .13, .04], mats.metal);
      }
    }
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; fg.box('fairing-pressure-vent', [Math.sin(a) * 1.825, -2.37, Math.cos(a) * 1.825], [.055, .095, .016], mats.dark).rotation.y = a; }
  }
  const showPressureHull = () => pressureParts.forEach(piece => piece.setEnabled(design.crewCount > 0 || !design.fairing)); showPressureHull(); fairing.setEnabled(design.fairing && !design.crewCount);
  const satellite = new B.TransformNode('science-payload', scene); satellite.parent = capsule; const sg = geometry(w, satellite);
  sg.box('satellite-bus', [0, .7, 0], [1.7, 2, 1.5], w.material('#c4a263', { metalness: .75, roughness: .35 }));
  for (const side of [-1, 1]) {
    sg.box('array-arm', [side * 2, .7, 0], [2.5, .08, .08], mats.metal);
    sg.box('solar-array', [side * 3.1, .7, 0], [2.5, 3.2, .05], w.material('#1c365a', { metalness: .55, roughness: .23 }));
    for (let j = 0; j < 8; j++) sg.box('solar-cell-grid', [side * 3.1, -.7 + j * .4, -.035], [2.5, .013, .01], mats.metal);
  }
  satellite.setEnabled(false);
  const label = new B.DynamicTexture('vehicle-stencil', { width: 256, height: 1024 }, scene, true), ctx = label.getContext();
  ctx.clearRect(0, 0, 256, 1024); ctx.fillStyle = '#1d3444'; ctx.font = 'bold 65px sans-serif'; ctx.textAlign = 'center';
  for (const [i, ch] of [...'COOPER'].entries()) ctx.fillText(ch, 128, 120 + i * 120);
  ctx.font = 'bold 22px monospace'; ctx.fillText('RB / 01', 128, 940); label.hasAlpha = true; label.uScale = -1; label.uOffset = 1; label.update();
  const labelMat = new B.StandardMaterial('vehicle-label', scene); labelMat.diffuseTexture = label; labelMat.useAlphaFromDiffuseTexture = true; labelMat.emissiveColor = new B.Color3(.08, .08, .08); labelMat.transparencyMode = B.Material.MATERIAL_ALPHATEST;
  if (stages.length) {
    const s = stats.stages[0], profile = [[-s.height / 2, s.diameter / 2], [s.height / 2, s.diameter / 2]];
    surfacePatch(w, stages[0], 'mission-stencil', labelMat, profile, Math.PI, .9, 1 - s.height * .24, 1 + s.height * .24, .012, 2, 32);
  }
  return { root, stages, capsule, fairing, satellite, mats, stats,
    update(s) {
      let removed = 0;
      for (let i = 0; i < stages.length; i++) { stages[i].setEnabled(i >= s.activeStage); interstages[i]?.setEnabled(i > s.activeStage); if (i < s.activeStage) removed += stats.stages[i].height; }
      root.position.y = -removed - s.height / 2; fairing.setEnabled(s.fairing && !design.crewCount);
      pressureParts.forEach(piece => piece.setEnabled(design.crewCount > 0 || !s.fairing)); satellite.setEnabled(s.payloadDeployed); if (s.payloadDeployed) satellite.position.x = 6;
    },
    dispose() { root.dispose(false); mats.dispose(); labelMat.dispose(); label.dispose(); },
  };
}
