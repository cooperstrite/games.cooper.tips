// Coastal launch facilities share a single floating origin with the vehicle.
// Landscape is continuous geometry; structures merge by material and forests
// use thin instances, so detail does not require thousands of draw calls.
import { createSceneryTools } from './runway-scenery.js';
import { rocketShoreX, rocketWetlandDistance } from './rocket-ocean.js';

export { rocketShoreX };

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const wetlandDistance = rocketWetlandDistance;

export function createRocketScenery(w, { ground }) {
  const { B, scene } = w, V = (x, y, z) => new B.Vector3(x, y, z);
  const root = new B.TransformNode('rocket-coastal-scenery', scene); root.parent = ground;
  const gantry = new B.TransformNode('rocket-service-tower', scene); gantry.parent = root;
  const serviceArms = new B.TransformNode('rocket-retracting-access-arms', scene); serviceArms.parent = gantry;
  const materials = [], textures = [], parts = [], shadowMeshes = [], trees = [], structures = [];
  const ownMat = m => { materials.push(m); return m; }, ownTexture = t => { textures.push(t); return t; };
  const mat = (color, options = {}) => w.material(color, options);
  function texture(name, size, draw) {
    const t = ownTexture(new B.DynamicTexture(`rocket-${name}`, size, scene, true));
    t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE; t.anisotropicFilteringLevel = 8;
    draw(t.getContext(), size); t.update(); return t;
  }
  function pbr(name, color, roughness = .85, metallic = 0) {
    const m = ownMat(new B.PBRMaterial(`rocket-${name}`, scene));
    m.albedoColor = B.Color3.FromHexString(color); m.roughness = roughness; m.metallic = metallic; return m;
  }
  function finish(mesh, material, parent = root, cast = false) {
    mesh.material = material; mesh.parent = parent; mesh.isPickable = false;
    mesh.receiveShadows = true; mesh.renderingGroupId = 1; parts.push({ mesh, parent, cast }); return mesh;
  }
  function box(name, x, y, z, width, height, depth, material, parent = root, cast = false) {
    const m = finish(B.MeshBuilder.CreateBox(`rocket-${name}`, { width, height, depth }, scene), material, parent, cast);
    m.position.set(x, y, z); return m;
  }
  function rod(name, a, b, diameter, material, parent = root, cast = false, tessellation = 8) {
    const delta = b.subtract(a), m = finish(B.MeshBuilder.CreateCylinder(`rocket-${name}`, { height: delta.length(), diameter, tessellation }, scene), material, parent, cast);
    m.position.copyFrom(a.add(b).scale(.5));
    m.rotationQuaternion = B.Quaternion.FromUnitVectorsToRef(B.Axis.Y, delta.normalize(), new B.Quaternion()); return m;
  }
  function cylinder(name, x, y, z, diameter, height, material, parent = root, cast = false, tessellation = 32) {
    const m = finish(B.MeshBuilder.CreateCylinder(`rocket-${name}`, { diameter, height, tessellation }, scene), material, parent, cast); m.position.set(x, y, z); return m;
  }
  function ring(name, x, y, z, diameter, thickness, material, parent = root, cast = false) {
    const m = finish(B.MeshBuilder.CreateTorus(`rocket-${name}`, { diameter, thickness, tessellation: 32 }, scene), material, parent, cast); m.position.set(x, y, z); return m;
  }
  function mergeStructures() {
    const groups = [];
    for (const p of parts.splice(0)) {
      let group = groups.find(g => g.material === p.mesh.material && g.parent === p.parent && g.cast === p.cast);
      if (!group) groups.push(group = { material: p.mesh.material, parent: p.parent, cast: p.cast, meshes: [] });
      group.meshes.push(p.mesh);
    }
    for (const group of groups) {
      const m = B.Mesh.MergeMeshes(group.meshes, true, true);
      if (!m) continue;
      m.name = `rocket-launch-facility-${group.parent.name}-${group.material.name}`;
      m.parent = group.parent; m.material = group.material; m.isPickable = false;
      m.receiveShadows = true; m.renderingGroupId = 1; structures.push(m);
      if (group.cast) { shadowMeshes.push(m); w.shadows?.addShadowCaster(m); }
    }
  }

  // Patches of scrub, grass and canopy remain readable from low flight and orbit.
  const land = pbr('coastal-scrub', '#ffffff', .98);
  land.albedoTexture = texture('coastal-ground-detail', 1024, (c, size) => {
    const r = seeded(77531); c.fillStyle = '#5b6443'; c.fillRect(0, 0, size, size);
    for (let j = 0; j < 18000; j++) {
      const x = r() * size, y = r() * size, radius = 1.3 + r() * 10;
      c.fillStyle = ['#44553a', '#677347', '#788153', '#3d4f36', '#869061', '#596945'][j % 6];
      c.globalAlpha = .18 + r() * .3; c.beginPath(); c.ellipse(x, y, radius, radius * .72, r() * 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#a1a16d'; c.globalAlpha = .11; c.beginPath(); c.arc(x - radius * .25, y - radius * .25, radius * .55, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  });
  const terrain = new B.Mesh('rocket-organic-coast-and-wetlands', scene);
  const positions = [], colors = [], uvs = [], indices = [], nx = 144, nz = 272;
  for (let j = 0; j <= nz; j++) {
    const t = j / nz * 2 - 1, z = Math.sinh(t * 4.8) / Math.sinh(4.8) * 50000;
    const shore = rocketShoreX(z);
    for (let i = 0; i <= nx; i++) {
      const d = (i / nx) ** 2 * 24000, x = shore - d;
      const wet = wetlandDistance(x, z), coast = smooth(0, 60, d);
      const field = -.7 + Math.sin(x * .0012) * Math.cos(z * .0015) * .27;
      const bank = -.7 - (1 - smooth(.88, 1.25, wet)) * 4.8;
      const y = Math.min(-3.08 + coast * (field + 3.08), bank);
      positions.push(x, y, z); uvs.push(x / 200, z / 200);
      const macro = .9 + Math.sin(x * .0016 + z * .0007) * .07 + Math.cos(z * .0031) * .04;
      const beach = 1 - smooth(36, 88, d), marsh = (1 - smooth(1.05, 1.5, wet)) * (1 - beach);
      colors.push((.78 + beach * 1.2 - marsh * .15) * macro, (.88 + beach * .82 - marsh * .08) * macro, (.7 + beach * 1.37 - marsh * .12) * macro, 1);
    }
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * (nx + 1) + i;
    // x decreases across each row, so this winding faces the sky.
    indices.push(k, k + nx + 1, k + 1, k + 1, k + nx + 1, k + nx + 2);
  }
  const normals = []; B.VertexData.ComputeNormals(positions, indices, normals);
  const data = new B.VertexData(); Object.assign(data, { positions, indices, normals, uvs, colors }); data.applyToMesh(terrain);
  terrain.material = land; terrain.parent = root; terrain.isPickable = false; terrain.receiveShadows = true; terrain.renderingGroupId = 1;

  const concrete = pbr('weathered-pad-concrete', '#ffffff', .94);
  concrete.albedoTexture = texture('concrete-expansion-joints', 512, (c, size) => {
    const r = seeded(211); c.fillStyle = '#a4a79b'; c.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 128) for (let x = 0; x < size; x += 128) {
      const n = 150 + r() * 20; c.fillStyle = `rgb(${n},${n + 3},${n - 5})`; c.fillRect(x, y, 128, 128);
      c.strokeStyle = '#707b72'; c.lineWidth = 1.2; c.strokeRect(x + .7, y + .7, 126.6, 126.6);
    }
    for (let j = 0; j < 22000; j++) { c.globalAlpha = .08 + r() * .08; c.fillStyle = j % 2 ? '#f0ebd4' : '#2c3a38'; c.fillRect(r() * size, r() * size, 1, 1); }
    c.globalAlpha = 1;
  });
  concrete.albedoTexture.uScale = concrete.albedoTexture.vScale = 4;
  const asphalt = pbr('access-road-aggregate', '#ffffff', .98);
  asphalt.albedoTexture = texture('asphalt-grain', 256, (c, size) => {
    const r = seeded(654); c.fillStyle = '#48514e'; c.fillRect(0, 0, size, size);
    for (let j = 0; j < 17000; j++) { c.globalAlpha = .08; c.fillStyle = j % 2 ? '#eff0df' : '#15272b'; c.fillRect(r() * size, r() * size, 1, 1); } c.globalAlpha = 1;
  });
  asphalt.albedoTexture.uScale = 30; asphalt.albedoTexture.vScale = 2;
  const steel = mat('#8d9b9b', { metalness: .58, roughness: .54 });
  const orange = mat('#bd713e', { metalness: .3, roughness: .62 });
  const dark = mat('#26363c', { metalness: .25, roughness: .72 });
  const white = mat('#bfc5b9', { metalness: .2, roughness: .63 });
  const yellow = mat('#d6b665', { roughness: .9 });
  const glass = mat('#3b5a65', { metalness: .35, roughness: .3 });
  const beacon = mat('#efac68', { emissive: true, roughness: .6 });

  box('launch-apron', -32, -.2, -4, 156, .8, 174, concrete);
  box('main-access-road', -1370, -.44, -8, 2700, .2, 17, asphalt);
  box('facility-access-road', -270, -.4, 0, 15, .2, 700, asphalt);
  box('maintenance-yard', -295, -.3, -225, 228, .5, 122, concrete);
  for (let j = 0; j < 57; j++) box('lane-marking', -140 - j * 45, -.305, -8, 17, .045, .22, yellow);
  for (const z of [-14.8, -1.2]) box('road-edge', -1370, -.3, z, 2690, .045, .12, white);
  for (const z of [-88, 80]) box('apron-edge', -32, .235, z, 151, .055, .3, yellow);
  for (const x of [-106, 42]) box('apron-edge', x, .235, -4, .3, .055, 168, yellow);

  // Open support ring and the deflector trench leave real space for engine fire.
  box('flame-trench-soot', 0, .26, 21, 11, .12, 66, dark, root, true);
  for (const x of [-6.7, 6.7]) box('flame-trench-wall', x, .9, 17, 1.4, 1.4, 60, concrete, root, true);
  for (const x of [-4.7, 4.7]) for (const z of [-4.7, 4.7]) box('launch-mount-leg', x, 2.1, z, 1.2, 3.8, 1.2, steel, root, true);
  ring('launch-mount-support', 0, 3.7, 0, 12, 1.1, steel, root, true);
  ring('launch-mount-upper-flange', 0, 4.08, 0, 11.8, .3, dark, root, true);
  const deflector = box('flame-deflector', 0, 1.4, 9, 9.5, .6, 9, steel, root, true); deflector.rotation.x = -.3;
  for (let j = 0; j < 10; j++) box('trench-service-grate', -7.8, .5, -12 + j * 6, 1.1, .16, 3.8, steel);
  for (const x of [-8.8, 8.8]) rod('deluge-water-main', V(x, 1, -15), V(x, 1, 25), .55, white);
  for (let j = 0; j < 8; j++) for (const x of [-8.8, 8.8]) rod('deluge-outlet', V(x, 1, -12 + j * 5), V(x * .86, 1.6, -12 + j * 5), .16, steel);

  // A legible orange lattice, rails, stair landings and fewer actual access arms.
  for (const x of [-18, -10]) for (const z of [-5.5, 5.5]) box('gantry-main-column', x, 37, z, .48, 74, .48, orange, gantry, true);
  for (let j = 0; j < 12; j++) {
    const y = j * 6 + 2;
    box('gantry-platform', -14, y, 0, 9.4, .25, 12.4, steel, gantry, true);
    for (const z of [-5.5, 5.5]) {
      rod('gantry-cross-brace', V(-18, y, z), V(-10, y + 6, z), .22, orange, gantry, true);
      rod('gantry-cross-brace', V(-10, y, z), V(-18, y + 6, z), .16, orange, gantry, true);
      for (const dy of [.65, 1.2]) rod('gantry-guardrail', V(-18.5, y + dy, z * 1.09), V(-9.5, y + dy, z * 1.09), .075, orange, gantry);
      for (const x of [-18.4, -15.5, -12.5, -9.6]) rod('gantry-railing-post', V(x, y, z * 1.09), V(x, y + 1.2, z * 1.09), .075, orange, gantry);
    }
    for (const x of [-18, -10]) rod('gantry-end-brace', V(x, y, -5.5), V(x, y + 6, 5.5), .19, orange, gantry, true);
    rod('gantry-stair-stringer', V(-17.1, y, -4), V(-17.1, y + 6, 4), .18, dark, gantry);
    for (let step = 0; step < 13; step++) box('gantry-stair-tread', -16.6, y + step * .46, -4 + step * .615, 1.2, .1, .6, steel, gantry);
    if (j === 2 || j === 5 || j === 8 || j === 11) {
      box('umbilical-access-walkway', -6, y, 0, 8, .32, 2, steel, serviceArms, true);
      for (const z of [-1.05, 1.05]) rod('access-arm-railing', V(-10, y + 1.15, z), V(-2, y + 1.15, z), .07, orange, serviceArms);
      rod('access-arm-underside-brace', V(-10, y - 2.5, 0), V(-2, y - .2, 0), .2, orange, serviceArms, true);
      box('umbilical-connector', -1.8, y + .45, 0, .65, 1.2, 1.5, dark, serviceArms, true);
    }
  }
  for (const x of [-14.8, -14.3, -13.8]) rod('gantry-service-pipes', V(x, 0, 5.8), V(x, 73, 5.8), .22, white, gantry);
  cylinder('gantry-lightning-finial', -14, 80, 0, .28, 16, steel, gantry, true);

  for (const [x, z] of [[-63, -93], [61, 83], [-68, 92]]) {
    const h = 89, radius = 3.1;
    const leg = j => V(x + Math.cos(j * Math.PI * 2 / 3) * radius, 0, z + Math.sin(j * Math.PI * 2 / 3) * radius);
    for (let j = 0; j < 3; j++) {
      const a = leg(j), b = leg((j + 1) % 3);
      rod('lightning-mast-leg', a, V(x + (a.x - x) * .25, h, z + (a.z - z) * .25), .22, steel, root, true);
      for (let k = 0; k < 13; k++) {
        const t0 = k / 13, t1 = (k + 1) / 13, s0 = 1 - t0 * .75, s1 = 1 - t1 * .75;
        rod('lightning-mast-lattice', V(x + (a.x - x) * s0, t0 * h, z + (a.z - z) * s0), V(x + (b.x - x) * s1, t1 * h, z + (b.z - z) * s1), .095, steel, root, true, 6);
      }
    }
    cylinder('lightning-terminal', x, 95, z, .18, 12, steel, root, true);
    cylinder('obstruction-light', x, 90, z, .65, .4, beacon);
  }

  const cladding = pbr('corrugated-assembly-buildings', '#ffffff', .67, .25);
  cladding.albedoTexture = texture('hangar-cladding', 256, (c, size) => {
    c.fillStyle = '#bbc2b8'; c.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 8) { c.fillStyle = '#939f9b'; c.fillRect(x, 0, 2, size); c.fillStyle = '#d1d4c6'; c.fillRect(x + 2, 0, 1, size); }
    for (let y = 0; y < size; y += 64) { c.fillStyle = '#7e908b'; c.fillRect(0, y, size, 1); }
  });
  cladding.albedoTexture.uScale = 3; cladding.albedoTexture.vScale = 2;
  for (const [x, z, width, depth, height] of [[-310, -225, 145, 81, 30], [-405, 190, 92, 63, 19], [-570, 190, 110, 70, 22]]) {
    box('assembly-hangar-walls', x, height / 2, z, width, height, depth, cladding);
    const pathArray = [-width / 2, width / 2].map(dx => Array.from({ length: 25 }, (_, j) => { const a = j / 24 * Math.PI; return V(x + dx, height + Math.sin(a) * depth * .17, z + Math.cos(a) * depth * .51); }));
    finish(B.MeshBuilder.CreateRibbon('rocket-arched-hangar-roof', { pathArray, sideOrientation: B.Mesh.DOUBLESIDE }, scene), cladding);
    for (const arc of pathArray) finish(B.MeshBuilder.CreateRibbon('rocket-hangar-gable', { pathArray: [arc, arc.map(p => V(p.x, height, p.z))], sideOrientation: B.Mesh.DOUBLESIDE }, scene), cladding);
    box('hangar-door-recess', x, height * .42, z - depth / 2 - .25, width * .82, height * .84, .5, dark);
    for (let j = 0; j < 8; j++) {
      const dx = (j - 3.5) * width * .098;
      box('hangar-door-panel', x + dx, height * .42, z - depth / 2 - .55, width * .09, height * .8, .25, steel);
      box('hangar-door-window', x + dx, height * .62, z - depth / 2 - .71, width * .078, 2.3, .08, glass);
    }
    for (const dx of [-width * .36, 0, width * .36]) box('hangar-roof-vent', x + dx, height + depth * .17 + .6, z, 3, 1.3, 5, steel);
  }
  box('launch-control-building', -154, 5.7, -119, 59, 11.5, 28, cladding);
  box('control-room-windows', -154, 7.4, -104.7, 53, 3.2, .16, glass);
  box('control-room-overhang', -154, 11.8, -117, 65, .65, 35, white);
  for (let j = 0; j < 12; j++) box('control-room-mullion', -180 + j * 4.8, 7.4, -104.55, .16, 3.4, .12, steel);
  cylinder('control-antenna', -150, 17, -119, .2, 12, steel);

  // Pressurized tanks have domed ends, cradle supports, ladders and pipework.
  for (let j = 0; j < 6; j++) {
    const x = -105 - j % 3 * 33, z = 133 + Math.floor(j / 3) * 42;
    const tank = cylinder('horizontal-cryogenic-tank', x, 6.1, z, 9.5, 28, white); tank.rotation.x = Math.PI / 2;
    for (const dz of [-14, 14]) {
      const dome = finish(B.MeshBuilder.CreateSphere('rocket-cryogenic-endcap', { diameter: 9.5, segments: 20 }, scene), white); dome.scaling.z = .4; dome.position.set(x, 6.1, z + dz);
    }
    for (const dz of [-8, 8]) {
      box('cryogenic-cradle', x, 1.3, z + dz, 8.5, 2.5, 1.8, concrete);
      const collar = ring('tank-insulation-band', x, 6.1, z + dz, 9.65, .17, steel); collar.rotation.x = Math.PI / 2;
    }
    rod('storage-feed-line', V(x, 1.8, z + 16), V(x, 1.8, 193), .35, steel);
  }
  rod('cryogenic-header', V(-180, 1.8, 193), V(-40, 1.8, 193), .65, white);
  rod('pad-fuel-main', V(-40, 1.8, 193), V(-40, 1.8, 15), .5, white);
  rod('pad-feed-branch', V(-40, 1.8, 15), V(-9, 1.8, 15), .5, white);
  for (const [x, z, diameter] of [[-224, 140, 21], [-224, 178, 16]]) {
    cylinder('vertical-liquid-storage', x, 8, z, diameter, 15, white);
    const dome = finish(B.MeshBuilder.CreateSphere('rocket-liquid-storage-dome', { diameter, segments: 24 }, scene), white); dome.scaling.y = .3; dome.position.set(x, 15.5, z);
    ring('storage-top-railing', x, 17.8, z, diameter * .75, .13, steel);
    for (let step = 1; step < 16; step++) rod('tank-ladder-rung', V(x - .55, step, z - diameter * .505), V(x + .55, step, z - diameter * .505), .075, steel);
    for (const dx of [-.55, .55]) rod('tank-ladder-rail', V(x + dx, .5, z - diameter * .505), V(x + dx, 16, z - diameter * .505), .09, steel);
  }
  for (const [x, z] of [[-97, -74], [-105, 64], [-260, -130], [-270, 115]]) {
    rod('service-light-pole', V(x, 0, z), V(x, 15, z), .19, steel);
    box('service-light-arm', x, 15, z, 4.5, .18, .25, steel);
    for (const dx of [-1.5, 1.5]) box('service-floodlight', x + dx, 14.8, z, 1.1, .3, .65, beacon);
  }
  for (const [x, z] of [[-73, -59], [-215, -152], [-226, -152]]) {
    box('service-van', x, 1.2, z, 2.3, 1.7, 5.1, white);
    box('service-van-cab', x, 1.85, z - 1.1, 2.17, .8, 2, glass);
    for (const dx of [-1.15, 1.15]) for (const dz of [-1.65, 1.65]) {
      const tire = cylinder('service-van-wheel', x + dx, .48, z + dz, .82, .24, dark, root, false, 12); tire.rotation.z = Math.PI / 2;
    }
  }
  mergeStructures();

  // The nearest trees are individual branching crowns. Dense distant groves
  // continue the forest texture without adding individual scene objects.
  const forestRoot = new B.TransformNode('rocket-coastal-forest', scene); forestRoot.parent = root; forestRoot.position.y = -.7;
  const scenery = createSceneryTools({ B, scene, world: forestRoot, material: w.material, ownMat, ownTexture, seeded });
  const r = seeded(86361), placements = [];
  function clearOfFacilities(x, z) {
    if (Math.abs(z + 8) < 25 || (Math.abs(x + 270) < 24 && Math.abs(z) < 390)) return false;
    if (x > -220 && x < 90 && z > -155 && z < 225) return false;
    if (x > -650 && x < -200 && z > -320 && z < 290) return false;
    return true;
  }
  function plant(x, z, height) {
    if (!clearOfFacilities(x, z) || rocketShoreX(z) - x < 72 || wetlandDistance(x, z) < 1.37) return;
    placements.push({ x, z, height, variation: .26 + r() * .72 });
  }
  // Real forest spacing produces connected crowns rather than isolated park
  // trees. Jittered spacing, clearings and a low understory hide the grid.
  for (let x = 88; x < 370; x += 18) for (let z = -900; z < 1050; z += 21) {
    if (r() > .93) continue;
    plant(x + (r() - .5) * 14, z + (r() - .5) * 16, 13 + r() * 12);
  }
  for (let x = -1050; x < 85; x += 24) for (let z = -720; z < 900; z += 26) {
    if (r() > .9) continue;
    plant(x + (r() - .5) * 18, z + (r() - .5) * 20, 12 + r() * 14);
  }
  for (let j = 0; j < 1400; j++) {
    const x = -5600 + r() * 5900, z = (r() - .5) * 13000;
    if (x > -1100 && Math.abs(z) < 1100) continue;
    plant(x, z, 19 + r() * 18);
  }
  for (let j = 0; j < 360; j++) plant(-750 + r() * 1120, (r() - .5) * 1500, 3.8 + r() * 4.6);
  scenery.grove(placements, false);
  for (const mesh of forestRoot.getChildMeshes()) {
    mesh.renderingGroupId = 1;
    // Trees sit on slightly rolling land. Lift only their diffuse contact
    // shadows above the highest grass vertex so the shadows never flicker
    // or disappear inside the ground.
    if (mesh.name === 'tree-ground-shadows') mesh.position.y = .58;
    trees.push(mesh);
  }
  const meshes = root.getChildMeshes();
  let previousGantryHeight = 0, previousAltitude = -1, shadowActive = true;
  return {
    gantry, meshes,
    update({ state, time = 0, view = 'follow' } = {}) {
      if (!state) return;
      const h = Math.max(0, state.altitude || 0), fullHeight = state.stats?.height || state.height || 75;
      if (fullHeight !== previousGantryHeight) { gantry.scaling.y = fullHeight / 75 * 1.05; previousGantryHeight = fullHeight; }
      const sequenceTime = state.phase === 'ready' ? 0 : state.phase === 'countdown' ? (state.countdownTotal || 6) - state.countdown : (state.countdownTotal || 6) + (state.time || 0);
      serviceArms.position.x = -smooth(2, 5, sequenceTime) * 6;
      if (Math.abs(h - previousAltitude) > 20 || previousAltitude < 0) {
        previousAltitude = h;
        terrain.visibility = 1 - smooth(28000, 55000, h);
        const forestVisibility = 1 - smooth(12000, 32000, h), structureVisibility = 1 - smooth(8500, 18000, h);
        for (const mesh of trees) { mesh.visibility = forestVisibility; mesh.setEnabled(forestVisibility > .001); }
        for (const mesh of structures) { mesh.visibility = structureVisibility; mesh.setEnabled(structureVisibility > .001); }
        const needsShadows = h < 700;
        if (needsShadows !== shadowActive) {
          shadowActive = needsShadows;
          for (const mesh of shadowMeshes) { if (needsShadows) w.shadows?.addShadowCaster(mesh); else w.shadows?.removeShadowCaster(mesh); }
        }
      }
    },
    dispose() {
      for (const mesh of shadowMeshes) w.shadows?.removeShadowCaster(mesh);
      root.dispose(); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    },
  };
}
