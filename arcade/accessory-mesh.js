export function buildCreatureAccessories(world, character, { root, sphere, position, scale = 1, eyes, neck }) {
  const { B, scene, material } = world, c = character.colors, f = character.features;
  const head = new B.TransformNode("accessories", scene); head.parent = root; head.position.copyFromFloats(...position); head.scaling.setAll(scale);
  const color = c.accessory || "#d98a9e", brimY = 0.4;
  function cylinder(name, y, diameter, height, top = diameter, paint = color) {
    const mesh = B.MeshBuilder.CreateCylinder(name, { height, diameterBottom: diameter, diameterTop: top, tessellation: 32 }, scene); mesh.parent = head; mesh.position.y = y; mesh.material = material(paint, { roughness: 0.6 }); return mesh;
  }
  function ball(name, p, s, paint) { return sphere(name, p, s, paint, head); }
  function tube(name, points, radius, paint) { const mesh = B.MeshBuilder.CreateTube(name, { path: points.map(p => new B.Vector3(...p)), radius, tessellation: 8 }, scene); mesh.parent = head; mesh.material = material(paint); return mesh; }
  if (f.hat === "cap") { cylinder("cap-brim", brimY, 0.9, 0.035); ball("cap", [0, 0.43, 0.04], [0.72, 0.35, 0.68], color); }
  else if (f.hat === "crown") {
    cylinder("crown-band", 0.43, 0.7, 0.1);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, mesh = B.MeshBuilder.CreateCylinder("crown-point", { height: 0.26, diameterBottom: 0.16, diameterTop: 0, tessellation: 4 }, scene); mesh.parent = head; mesh.position.set(Math.cos(a) * 0.28, 0.57, Math.sin(a) * 0.25); mesh.material = material(color, { metalness: 0.3 }); ball("crown-gem", [Math.cos(a) * 0.3, 0.44, Math.sin(a) * 0.27], [0.06, 0.06, 0.06], c.beak || "#e4c472"); }
  } else if (f.hat === "wizard" || f.hat === "party") {
    cylinder("hat-brim", brimY, 0.9, 0.04); cylinder("pointed-hat", 0.75, 0.65, 0.74, 0);
    if (f.hat === "party") ball("hat-pom", [0, 1.14, 0], [0.11, 0.11, 0.11], c.belly || "#ffdd9e");
    for (let i = 0; i < 7; i++) ball("hat-decoration", [Math.cos(i * 2.4) * (0.26 - i * 0.025), 0.5 + i * 0.07, Math.sin(i * 2.4) * (0.26 - i * 0.025)], [0.055, 0.055, 0.025], c.belly || "#e8dbb2");
  } else if (f.hat === "straw") { cylinder("straw-brim", 0.4, 1, 0.07, 1, "#d6b56d"); cylinder("straw-crown", 0.52, 0.55, 0.2, 0.5, "#dfc27b"); cylinder("hat-ribbon", 0.47, 0.56, 0.05, 0.56, "#95745b"); }
  else if (f.hat === "flowers") {
    const ring = B.MeshBuilder.CreateTorus("flower-vine", { diameter: 0.65, thickness: 0.035 }, scene); ring.parent = head; ring.position.y = 0.36; ring.material = material("#638b5e");
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, x = Math.cos(a) * 0.32, z = Math.sin(a) * 0.24; for (let j = 0; j < 5; j++) { const b = j / 5 * Math.PI * 2; ball("flower-petal", [x + Math.cos(b) * 0.05, 0.39 + Math.sin(b) * 0.05, z], [0.065, 0.065, 0.035], i % 2 ? c.belly || "#f4dfb7" : color); } ball("flower-center", [x, 0.39, z - 0.02], [0.045, 0.045, 0.035], c.beak || "#e5bb66"); }
  } else if (f.hat === "aviator") {
    ball("aviator-helmet", [0, 0.22, 0.13], [0.82, 0.6, 0.7], color);
    for (const side of [-1, 1]) { ball("ear-cover", [side * 0.38, -0.03, 0], [0.21, 0.4, 0.3], color); ball("ear-lining", [side * 0.45, -0.03, -0.03], [0.08, 0.26, 0.21], c.belly || "#e9d7b5"); }
  } else if (f.hat === "space") {
    const glass = ball("space-visor", [0, 0.01, -0.04], [1.05, 1.07, 1.05], "#c0e9ed"); glass.material = material("#c0e9ed", { roughness: 0.15, alpha: 0.17 });
    cylinder("space-collar", -0.4, 0.88, 0.09);
  }
  if (f.eyewear && f.eyewear !== "none") {
    const eyeList = f.eyewear === "monocle" ? [eyes[eyes.length - 1]] : eyes;
    for (const [x, y, z, size] of eyeList) {
      const ring = B.MeshBuilder.CreateTorus("eyewear-frame", { diameter: size, thickness: f.eyewear === "goggles" ? 0.04 : 0.017, tessellation: 32 }, scene); ring.parent = head; ring.position.set(x, y, z - 0.025); ring.rotation.x = Math.PI / 2; ring.material = material(f.eyewear === "monocle" ? "#d8b869" : color);
      if (f.eyewear === "shades") ball("sunglass-lens", [x, y, z - 0.03], [size * 0.9, size * 0.9, 0.035], "#263a4a");
      tube("eyewear-arm", [[x, y, z], [x + Math.sign(x) * 0.13, y, z + 0.12]], 0.012, color);
    }
    if (eyeList.length > 1) tube("eyewear-bridge", [[eyes[0][0], eyes[0][1], eyes[0][2]], [eyes[1][0], eyes[1][1], eyes[1][2]]], 0.012, color);
    else { const [x, y, z] = eyeList[0]; tube("monocle-chain", [[x + 0.12, y, z], [x + 0.16, y - 0.3, z], [x - 0.1, y - 0.4, z + 0.06]], 0.009, "#d8b869"); }
  }
  if (neck && f.neckwear && f.neckwear !== "none") {
    const [x, y, z] = neck, small = character.family === "snake" ? 0.6 : 1;
    const collar = sphere("neckwear-collar", [x, y, z], [0.68 * small, 0.13 * small, 0.6 * small], color);
    if (f.neckwear === "bowtie" || f.neckwear === "bow") for (const side of [-1, 1]) { const bow = sphere("bow-tie", [x + side * 0.12 * small, y - 0.02, z - 0.3 * small], [0.24 * small, 0.18 * small, 0.09 * small], color); bow.rotation.z = side * 0.2; }
    else if (f.neckwear === "medal") { const mesh = B.MeshBuilder.CreateCylinder("champion-medal", { diameter: 0.19, height: 0.035 }, scene); mesh.parent = root; mesh.rotation.x = Math.PI / 2; mesh.position.set(x, y - 0.23, z - 0.33); mesh.material = material("#dbb85d", { metalness: 0.7, roughness: 0.3 }); }
    else if (f.neckwear === "scarf") { const mesh = B.MeshBuilder.CreateBox("scarf-tail", { width: 0.16 * small, height: 0.08 * small, depth: 0.7 * small }, scene); mesh.parent = root; mesh.position.set(x + 0.22 * small, y - 0.08, z + 0.32 * small); mesh.rotation.z = -0.15; mesh.material = material(color); }
    else { const mesh = new B.Mesh("bandana", scene), data = new B.VertexData(); data.positions = [-0.23 * small, 0, 0, 0.23 * small, 0, 0, 0, -0.32 * small, -0.03]; data.indices = [0, 1, 2]; data.normals = []; B.VertexData.ComputeNormals(data.positions, data.indices, data.normals); data.applyToMesh(mesh); mesh.parent = root; mesh.position.set(x, y, z - 0.31 * small); mesh.material = material(color); mesh.material.backFaceCulling = false; }
  }
}
