import { GameCharacter } from "./characters.js";
import { buildArcherMesh, prepareArcherAssets } from "./humanoid-mesh.js";
import { buildCreatureAccessories } from "./accessory-mesh.js";
import { BIRD_DESIGNS } from "../flappy-bird-art.js";
import { buildRunnerMesh, prepareRunnerAssets } from "./runner-mesh.js";
export function prepareCharacterAssets(character) {
  return character.family === "humanoid" ? prepareArcherAssets() : character.family === "runner" ? prepareRunnerAssets() : Promise.resolve();
}

export function buildCharacterMesh(world, character) {
  if (!(character instanceof GameCharacter)) throw new TypeError("Build a GameCharacter before rendering it");
  const { B, scene, material } = world, root = new B.TransformNode(character.id, scene), wings = [], trailParts = [];
  let archer, runner;
  const natural = BIRD_DESIGNS[character.key]?.colors || {};
  const colors = { body: natural.body || "#75aaa4", wing: natural.wing || "#517889", belly: natural.belly || "#e4d2ad", beak: natural.beak || "#d4ae68", skin: "#d7aa86", hair: "#554035", ...character.colors };
  function sphere(name, position, scale, color, parent = root) {
    const mesh = B.MeshBuilder.CreateSphere(name, { diameter: 1, segments: 24 }, scene); mesh.parent = parent; mesh.position.copyFromFloats(...position); mesh.scaling.copyFromFloats(...scale); mesh.material = material(color); world.shadows?.addShadowCaster(mesh); return mesh;
  }
  function box(name, position, scale, color, parent = root) {
    const mesh = B.MeshBuilder.CreateBox(name, { size: 1 }, scene); mesh.parent = parent; mesh.position.copyFromFloats(...position); mesh.scaling.copyFromFloats(...scale); mesh.material = material(color, { metalness: character.family === "vehicle" ? 0.65 : 0, roughness: 0.4 }); world.shadows?.addShadowCaster(mesh); return mesh;
  }
  if (character.family === "bird") {
    sphere("body", [0, 1.1, 0], [1.15, character.key === "owl" ? 1.4 : 1.05, 0.95], colors.body);
    sphere("breast", [0, 1.03, -0.38], [0.8, 0.8, 0.3], colors.belly);
    sphere("head", [0, 1.75, -0.12], [0.85, 0.8, 0.8], colors.body);
    const bigEyes = character.key === "owl";
    for (const side of [-1, 1]) {
      const ex = side * (bigEyes ? 0.23 : 0.19);
      sphere("eye-white", [ex, 1.82, -0.47], [bigEyes ? 0.38 : 0.24, bigEyes ? 0.44 : 0.29, 0.14], "#fff3d9");
      sphere("pupil", [ex, 1.82, -0.55], [0.11, bigEyes ? 0.22 : 0.17, 0.055], "#243c42");
      const wing = new B.TransformNode("wing-hinge", scene); wing.parent = root; wing.position.set(side * 0.47, 1.3, 0); wings.push({ node: wing, side });
      if (character.key === "dragon") {
        const positions = [0, 0, 0, side * 1.4, 0.8, 0.15, side * 1.15, -0.35, 0.35, side * 0.6, -0.6, 0.1];
        const mesh = new B.Mesh("membrane", scene), data = new B.VertexData(); data.positions = positions; data.indices = [0, 1, 2, 0, 2, 3]; data.normals = []; B.VertexData.ComputeNormals(data.positions, data.indices, data.normals); data.applyToMesh(mesh); mesh.parent = wing; mesh.material = material(colors.wing); mesh.material.backFaceCulling = false;
        const horn = B.MeshBuilder.CreateCylinder("horn", { height: 0.55, diameterTop: 0, diameterBottom: 0.17 }, scene); horn.parent = root; horn.position.set(side * 0.27, 2.3, -0.02); horn.material = material(colors.beak);
      } else {
        for (let i = 0; i < 5; i++) sphere("flight-feather", [side * (0.22 + i * 0.13), -i * 0.07, i * 0.035], [0.35, character.key === "hummingbird" ? 1.45 : 1.05, 0.12], i % 2 ? colors.wing : colors.body, wing);
      }
      sphere("foot", [side * 0.22, 0.44, -0.12], [0.23, 0.13, 0.4], colors.beak);
    }
    const beak = B.MeshBuilder.CreateCylinder("beak", { height: character.key === "hummingbird" ? 1 : 0.42, diameterTop: 0.01, diameterBottom: character.key === "hummingbird" ? 0.09 : 0.25, tessellation: 16 }, scene); beak.parent = root; beak.rotation.x = -Math.PI / 2; beak.position.set(0, 1.64, character.key === "hummingbird" ? -1 : -0.64); beak.material = material(colors.beak);
    if (["jay", "phoenix"].includes(character.key)) for (let i = 0; i < 3; i++) { const crest = sphere("crest", [(i - 1) * 0.12, 2.22 + i * 0.06, 0.06], [0.15, 0.55, 0.18], character.key === "phoenix" ? colors.beak : colors.wing); crest.rotation.z = 0.3; }
    if (["dragon", "phoenix", "jay"].includes(character.key)) for (let i = 0; i < 4; i++) sphere("tail", [(i - 1.5) * 0.12, 0.85 - i * 0.08, 0.8 + i * 0.18], [0.19, 0.2, 1.1], i % 2 ? colors.wing : colors.body);
    if (bigEyes) for (const side of [-1, 1]) {
      const disc = sphere("facial-disc", [side * 0.23, 1.79, -0.42], [0.5, 0.57, 0.12], colors.belly); disc.position.z = -0.42;
      const tuft = B.MeshBuilder.CreateCylinder("ear-tuft", { height: 0.3, diameterBottom: 0.2, diameterTop: 0, tessellation: 6 }, scene); tuft.parent = root; tuft.position.set(side * 0.32, 2.13, -0.05); tuft.rotation.z = -side * 0.25; tuft.material = material(colors.wing);
    }
    if (character.key === "jay") for (const side of [-1, 1]) for (let i = 0; i < 3; i++) box("jay-wing-bar", [side * (0.55 + i * 0.09), 1.2 - i * 0.13, 0.01], [0.18, 0.055, 0.13], "#eeeede");
    if (character.key === "dragon") {
      sphere("snout", [0, 1.57, -0.51], [0.6, 0.35, 0.47], colors.body);
      for (const side of [-1, 1]) { sphere("nostril", [side * 0.15, 1.64, -0.71], [0.055, 0.03, 0.02], colors.wing); const tooth = B.MeshBuilder.CreateCylinder("dragon-tooth", { height: 0.13, diameterTop: 0, diameterBottom: 0.07 }, scene); tooth.parent = root; tooth.position.set(side * 0.2, 1.42, -0.62); tooth.rotation.z = Math.PI; tooth.material = material("#f4e8d2"); }
      for (let i = 0; i < 9; i++) sphere("dragon-scale", [Math.sin(i * 2.4) * 0.39, 0.83 + i * 0.06, -0.35], [0.09, 0.07, 0.04], colors.wing);
    }
    buildCreatureAccessories(world, character, { root, sphere, position: [0, 1.75, -0.12], eyes: [[-0.19, 0.07, -0.35, bigEyes ? 0.45 : 0.28], [0.19, 0.07, -0.35, bigEyes ? 0.45 : 0.28]], neck: [0, 1.4, -0.04] });
  } else if (character.family === "humanoid") {
    archer = buildArcherMesh(world, character, { root, sphere, box });
  } else if (character.family === "runner") {
    runner = buildRunnerMesh(world, character, root);
  } else if (character.family === "snake") {
    const path = Array.from({ length: 45 }, (_, i) => { const a = i / 44 * Math.PI * 2; return new B.Vector3(Math.cos(a) * (0.4 + i / 50), 0.18 + i / 100, Math.sin(a) * 0.65); });
    const body = B.MeshBuilder.CreateTube("snake", { path, radius: 0.15, cap: B.Mesh.CAP_ALL }, scene); body.parent = root; body.material = material(colors.body);
    const belly = B.MeshBuilder.CreateTube("snake-belly", { path: path.map(p => p.add(new B.Vector3(0, -0.075, 0))), radius: 0.1, cap: B.Mesh.CAP_ALL }, scene); belly.parent = root; belly.material = material(colors.belly);
    const end = path[path.length - 1]; sphere("head", [end.x, end.y + 0.12, end.z - 0.1], [0.55, 0.42, 0.5], colors.body);
    if (character.key === "gardener") {
      const stripe = B.MeshBuilder.CreateTube("gardener-stripe", { path: path.map(p => p.add(new B.Vector3(0, 0.145, 0))), radius: 0.025 }, scene); stripe.parent = root; stripe.material = material("#f4e8a3");
    }
    if (["python", "rattlesnake"].includes(character.key)) for (let i = 2; i < path.length - 2; i += 4) {
      const p = path[i];
      if (character.key === "rattlesnake") { const diamond = box("diamond-marking", [p.x, p.y + 0.135, p.z], [0.18, 0.025, 0.18], colors.dark); diamond.rotation.y = Math.PI / 4; }
      else sphere("scale-marking", [p.x, p.y + 0.13, p.z], [0.18, 0.04, 0.19], colors.dark);
    }
    if (character.key === "rattlesnake") for (let i = 0; i < 4; i++) sphere("rattle", [path[0].x - i * 0.09, path[0].y, path[0].z], [0.15 - i * 0.02, 0.18 - i * 0.025, 0.18 - i * 0.025], "#d1bb8f");
    for (const x of [-0.13, 0.13]) { sphere("eye-white", [end.x + x, end.y + 0.24, end.z - 0.31], [0.15, 0.19, 0.1], "#fff2d4"); sphere("pupil", [end.x + x, end.y + 0.24, end.z - 0.37], [["python", "rattlesnake"].includes(character.key) ? 0.025 : 0.06, 0.12, 0.04], "#203e41"); }
    buildCreatureAccessories(world, character, { root, sphere, position: [end.x, end.y + 0.12, end.z - 0.1], scale: 0.65, eyes: [[-0.2, 0.18, -0.32, 0.3], [0.2, 0.18, -0.32, 0.3]], neck: [end.x - 0.14, end.y - 0.02, end.z + 0.08] });
  } else {
    const suv = character.key === "sentinel";
    box("chassis", [0, 0.6, 0], [1.6, suv ? 0.8 : 0.55, 2.7], colors.body); box("cabin", [0, suv ? 1.3 : 1.05, 0.1], [1.35, suv ? 0.85 : 0.6, suv ? 1.9 : 1.5], colors.body); box("windshield", [0, suv ? 1.35 : 1.13, suv ? -0.86 : -0.65], [1.15, suv ? 0.6 : 0.39, 0.04], "#283f51");
    if (["comet", "rally"].includes(character.key)) box("rear-spoiler", [0, 1.1, 1.2], [1.7, 0.09, 0.25], colors.accessory || "#455963");
    if (character.key === "rally") box("racing-stripe", [0, 0.89, -0.85], [0.18, 0.015, 1], "#f4edcd");
    for (const x of [-0.87, 0.87]) for (const z of [-0.85, 0.85]) { const wheel = B.MeshBuilder.CreateCylinder("wheel", { height: 0.24, diameter: 0.6 }, scene); wheel.parent = root; wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.32, z); wheel.material = material("#242e35", { roughness: 0.9 }); }
    for (const x of [-0.55, 0.55]) box("headlight", [x, 0.65, -1.36], [0.35, 0.13, 0.03], "#ffe8a6");
  }
  if (character.family === "bird" && character.features.trail && character.features.trail !== "none") {
    const trail = character.features.trail;
    if (trail === "rainbow") for (const [i, color] of ["#e99b98", "#ebc98b", "#e7e2a2", "#9ac6aa", "#90b7d2", "#bba2ce"].entries()) {
      const path = Array.from({ length: 20 }, (_, j) => new B.Vector3(Math.sin(j * 0.2) * 0.1, 1 - i * 0.055 + Math.sin(j * 0.4) * 0.07, 0.5 + j * 0.095));
      const mesh = B.MeshBuilder.CreateTube("rainbow-trail", { path, radius: 0.023, tessellation: 8 }, scene); mesh.parent = root; mesh.material = material(color, { emissive: true });
    } else for (let i = 0; i < 9; i++) {
      const mesh = trail === "stars" ? B.MeshBuilder.CreatePolyhedron("star-trail", { type: 1, size: 0.055 }, scene) : B.MeshBuilder.CreateSphere(`${trail}-trail`, { diameter: trail === "bubbles" ? 0.13 : 0.09, segments: 12 }, scene);
      mesh.parent = root; mesh.material = material(colors.trail || "#f4cb71", { emissive: trail === "fire" || trail === "stars", roughness: trail === "bubbles" ? 0.1 : 0.7, alpha: trail === "bubbles" ? 0.3 : 1 });
      if (trail === "feathers") mesh.scaling.set(1.7, 0.3, 0.6); if (trail === "fire") mesh.scaling.set(1.2, 0.65, 2.8);
      trailParts.push({ mesh, index: i });
    }
  }
  return {
    root,
    animate(time, pose) {
      runner?.animate(time, pose);
      for (const wing of wings) wing.node.rotation.z = wing.side * (0.5 + Math.sin(time * (character.key === "hummingbird" ? 35 : 6)) * 0.5);
      for (const { mesh, index } of trailParts) { const age = (time * 0.5 + index / 9) % 1; mesh.position.set(Math.sin(index * 2.4 + time) * 0.18, 1 + Math.sin(index + time) * 0.12 - age * 0.13, 0.5 + age * 1.9); mesh.visibility = 1 - age; mesh.rotation.z = time + index; }
    },
    dispose() { root.dispose(false); archer?.dispose(); runner?.dispose(); },
  };
}
