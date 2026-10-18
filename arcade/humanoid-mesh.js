// The archer's complete appearance, independent of targets, arrows in flight,
// range input, and scoring. The same saved gear drives the game and this rig.
export function buildArcherMesh(world, character, { root, sphere, box }) {
  const { B, scene, material } = world, c = character.colors, f = character.features;
  const skin = c.skin || "#dfae88", hair = c.hair || "#604634", trim = c.accessory || "#d4b47b", outfit = c.body || "#40756a";
  const beardColor = c.facialHair || hair, hoodColor = c.headwear || outfit, boots = c.boots || "#2b3839";
  function tube(name, points, radius, color, metallic = 0) {
    const mesh = B.MeshBuilder.CreateTube(name, { path: points.map(p => new B.Vector3(...p)), radius, tessellation: 10, cap: B.Mesh.CAP_ALL }, scene);
    mesh.parent = root; mesh.material = material(color, { metalness: metallic, roughness: metallic ? 0.35 : 0.7 }); world.shadows?.addShadowCaster(mesh); return mesh;
  }
  function ring(name, x, y, z, diameter, thickness, color) {
    const mesh = B.MeshBuilder.CreateTorus(name, { diameter, thickness, tessellation: 32 }, scene); mesh.parent = root; mesh.position.set(x, y, z); mesh.rotation.x = Math.PI / 2; mesh.material = material(color, { metalness: 0.35, roughness: 0.3 }); return mesh;
  }
  function cone(name, x, y, z, diameter, height, color) {
    const mesh = B.MeshBuilder.CreateCylinder(name, { diameterTop: 0, diameterBottom: diameter, height, tessellation: 16 }, scene); mesh.parent = root; mesh.position.set(x, y, z); mesh.material = material(color); return mesh;
  }
  const faceWidth = f.faceShape === "round" ? 0.36 : f.faceShape === "angular" ? 0.31 : 0.32;
  const head = sphere("head", [0, 1.89, 0], [faceWidth, f.faceShape === "round" ? 0.38 : 0.42, 0.32], skin);
  if (f.faceShape === "angular") { sphere("jaw-left", [-0.075, 1.79, -0.005], [0.17, 0.13, 0.22], skin); sphere("jaw-right", [0.075, 1.79, -0.005], [0.17, 0.13, 0.22], skin); }
  sphere("neck", [0, 1.65, 0], [0.14, 0.2, 0.15], skin);
  sphere("nose", [0, 1.87, -0.17], [0.065, 0.09, 0.07], skin);
  for (const side of [-1, 1]) {
    sphere("ear", [side * 0.16, 1.89, 0], [0.065, 0.12, 0.06], skin);
    sphere("inner-ear", [side * 0.18, 1.89, -0.015], [0.02, 0.075, 0.04], "#bd836b");
    sphere("eye-white", [side * 0.065, 1.92, -0.143], [0.07, 0.045, 0.035], "#fff5df");
    sphere("iris", [side * 0.065, 1.921, -0.161], [0.033, 0.037, 0.013], c.eyes || "#79502e");
    sphere("pupil", [side * 0.065, 1.922, -0.168], [0.014, 0.023, 0.006], "#1b2c34");
    sphere("eye-catchlight", [side * 0.065 - 0.007, 1.932, -0.172], [0.008, 0.009, 0.004], "#fffaf0");
    tube("eyebrow", [[side * 0.1, 1.965, -0.135], [side * 0.067, 1.977, -0.151], [side * 0.035, 1.967, -0.144]], 0.008, hair);
  }
  tube("mouth", [[-0.039, 1.805, -0.145], [0, 1.799, -0.163], [0.039, 1.805, -0.145]], 0.006, "#a86f63");
  if (f.faceDetail === "freckles") for (const side of [-1, 1]) for (let i = 0; i < 5; i++) sphere("freckle", [side * (0.06 + i % 3 * 0.02), 1.87 - Math.floor(i / 3) * 0.017, -0.148 + i * 0.001], [0.006, 0.006, 0.004], "#9d7154");
  if (f.faceDetail === "scar") tube("scar", [[0.085, 1.98, -0.14], [0.095, 1.92, -0.15], [0.073, 1.86, -0.145]], 0.005, "#be8e7d");

  if (f.hair !== "bald") {
    sphere("hair-cap", [0, 2.025, 0.035], [faceWidth + 0.025, 0.19, 0.32], hair);
    for (let i = 0; i < 11; i++) {
      const angle = i / 10 * Math.PI, x = Math.cos(angle) * 0.15, z = Math.sin(angle) * 0.14;
      tube("hair-strand", [[x, 2.01, -0.08], [x * 0.8, 2.12, z * 0.3], [x * 0.65, 2.06, z + 0.05]], 0.014, hair);
    }
    if (f.hair === "bob" || f.hair === "braids") for (const side of [-1, 1]) {
      if (f.hair === "bob") for (let i = 0; i < 5; i++) tube("bob-strand", [[side * 0.135, 2.02, i * 0.035 - 0.04], [side * 0.19, 1.87, i * 0.04], [side * 0.18, 1.7, i * 0.04]], 0.028, hair);
      else for (let i = 0; i < 10; i++) sphere("braid", [side * (0.17 + Math.sin(i) * 0.012), 1.97 - i * 0.04, 0.04 + Math.cos(i) * 0.012], [0.075, 0.07, 0.075], hair);
    }
    if (f.hair === "ponytail") tube("ponytail", [[0, 2.04, 0.14], [0.02, 1.97, 0.28], [0.06, 1.74, 0.28], [0.1, 1.58, 0.22]], 0.065, hair);
    if (f.hair === "bun") sphere("hair-bun", [0, 2.09, 0.17], [0.2, 0.19, 0.19], hair);
    if (f.hair === "curls") for (let i = 0; i < 18; i++) { const a = i * 2.4; sphere("hair-curl", [Math.cos(a) * 0.14, 2.035 + Math.sin(i * 1.5) * 0.08, 0.025 + Math.sin(a) * 0.14], [0.1, 0.1, 0.1], hair); }
  }
  if (f.facialHair !== "none") {
    if (["mustache", "goatee", "beard", "full"].includes(f.facialHair)) for (const side of [-1, 1]) { const m = sphere("mustache", [side * 0.035, 1.824, -0.158], [0.084, 0.023, 0.035], beardColor); m.rotation.z = side * 0.15; }
    if (f.facialHair !== "mustache") {
      const full = f.facialHair === "full", goatee = f.facialHair === "goatee", stubble = f.facialHair === "stubble";
      sphere("beard", [0, full ? 1.735 : 1.77, -0.08], [goatee ? 0.1 : 0.25, stubble ? 0.08 : full ? 0.25 : 0.13, 0.22], beardColor);
      if (!stubble && !goatee) for (const side of [-1, 1]) tube("sideburn", [[side * 0.13, 1.91, -0.025], [side * 0.13, 1.8, -0.06], [side * 0.06, 1.72, -0.1]], 0.025, beardColor);
    }
  }

  const torso = sphere("tunic", [0, 1.32, 0], [0.46, 0.65, 0.27], outfit);
  const skirt = B.MeshBuilder.CreateCylinder("tunic-skirt", { height: 0.33, diameterTop: 0.32, diameterBottom: 0.5, tessellation: 24 }, scene); skirt.parent = root; skirt.position.set(0, 1.04, 0); skirt.material = material(outfit);
  for (const side of [-1, 1]) {
    tube("trouser", [[side * 0.11, 0.98, 0], [side * 0.12, 0.57, 0], [side * 0.13, 0.22, -0.01]], 0.075, "#394b4c");
    sphere("boot", [side * 0.13, 0.12, -0.045], [0.17, 0.23, 0.31], boots);
    box("boot-sole", [side * 0.13, 0.035, -0.05], [0.17, 0.04, 0.3], "#263333");
    const shoulder = [side * 0.24, 1.56, 0], elbow = [side * 0.35, 1.3, -0.04], wrist = [side * 0.43, 1.12, -0.09];
    tube("sleeve", [shoulder, elbow], 0.075, outfit); tube("forearm", [elbow, wrist], 0.051, skin);
    tube("bracer", [[side * 0.39, 1.22, -0.065], [side * 0.43, 1.13, -0.09]], 0.06, trim);
    sphere("hand", [side * 0.445, 1.065, -0.1], [0.09, 0.12, 0.06], skin);
    for (let finger = 0; finger < 4; finger++) tube("finger", [[side * 0.43 + finger * 0.012 - 0.018, 1.05, -0.12], [side * 0.44 + finger * 0.012 - 0.018, 0.995, -0.125]], 0.007, skin);
  }
  const belt = B.MeshBuilder.CreateCylinder("belt", { height: 0.055, diameter: 0.41, tessellation: 32 }, scene); belt.parent = root; belt.position.y = 1.17; belt.scaling.z = 0.7; belt.material = material("#71513a");
  box("belt-buckle", [0, 1.17, -0.16], [0.065, 0.065, 0.02], trim);
  tube("outfit-trim", [[0, 1.62, -0.11], [0, 1.38, -0.145], [0, 1.2, -0.14]], 0.009, trim);
  if (character.key === "knight") {
    const armor = material(trim, { metalness: 0.7, roughness: 0.33 }); torso.material = armor;
    for (const side of [-1, 1]) { const shoulder = sphere("pauldron", [side * 0.24, 1.56, 0], [0.23, 0.17, 0.29], trim); shoulder.material = armor; }
    box("chest-insignia", [0, 1.43, -0.15], [0.1, 0.12, 0.02], outfit);
  } else {
    const cape = new B.Mesh("cape", scene), data = new B.VertexData(); data.positions = [-0.2, 1.59, 0.13, 0.2, 1.59, 0.13, -0.3, 0.93, 0.2, 0.3, 0.93, 0.2]; data.indices = [0, 1, 2, 1, 3, 2]; data.normals = []; B.VertexData.ComputeNormals(data.positions, data.indices, data.normals); data.applyToMesh(cape); cape.parent = root; cape.material = material(character.key === "scout" ? trim : outfit); cape.material.backFaceCulling = false;
  }
  const headwear = f.headwear;
  if (headwear === "hood") {
    sphere("hood-back", [0, 1.96, 0.13], [0.43, 0.46, 0.23], hoodColor);
    ring("hood-opening", 0, 1.91, -0.08, 0.37, 0.065, hoodColor);
  } else if (headwear === "helmet") {
    sphere("helmet", [0, 2.035, 0.015], [0.37, 0.19, 0.36], hoodColor);
    for (const side of [-1, 1]) box("helmet-cheek", [side * 0.15, 1.88, 0.02], [0.05, 0.2, 0.17], hoodColor);
    tube("helmet-brow", [[-0.16, 1.99, -0.13], [0, 2.015, -0.16], [0.16, 1.99, -0.13]], 0.022, trim);
  } else if (headwear === "headband") tube("headband", [[-0.16, 2.0, -0.06], [0, 2.015, -0.16], [0.16, 2.0, -0.06]], 0.022, hoodColor);
  else if (headwear === "cap") { sphere("feathered-cap", [0, 2.05, 0.015], [0.4, 0.15, 0.36], hoodColor); tube("cap-feather", [[0.12, 2.07, 0], [0.17, 2.19, 0.04], [0.15, 2.29, 0.09]], 0.025, trim); }
  if (f.faceAccessory === "glasses") { for (const x of [-0.065, 0.065]) ring("glasses", x, 1.92, -0.176, 0.085, 0.006, trim); tube("glasses-bridge", [[-0.02, 1.92, -0.18], [0.02, 1.92, -0.18]], 0.004, trim); }
  if (f.faceAccessory === "eyepatch") { sphere("eyepatch", [-0.065, 1.92, -0.18], [0.09, 0.07, 0.025], "#2b353b"); tube("eyepatch-strap", [[-0.15, 1.96, -0.07], [-0.07, 1.94, -0.18], [0.14, 1.87, -0.08]], 0.006, "#2b353b"); }
  if (f.faceAccessory === "earring") ring("earring", 0.18, 1.82, 0, 0.055, 0.009, "#dbbb67");

  const bowColor = c.bow || "#d4b47b", grip = c.grip || "#87633f", bowX = -0.27, bowY = 1.08;
  const points = [];
  for (let i = 0; i <= 32; i++) { const t = i / 32 * 2 - 1, curve = f.bowStyle === "recurve" ? -0.17 * Math.sin((t + 1) * Math.PI) + Math.sign(t) * Math.sin(Math.abs(t) * Math.PI * 1.4) * 0.07 : -0.18 * (1 - t * t); points.push([bowX + curve, bowY + t * 0.61, -0.13]); }
  const bow = tube("bow-limbs", points, f.bowStyle === "crystal" ? 0.023 : 0.017, bowColor, f.bowStyle === "crystal" ? 0.25 : 0);
  if (f.bowStyle === "crystal") bow.material = material(bowColor, { metalness: 0.2, roughness: 0.2, emissive: true });
  tube("bow-string", [points[0], [bowX + 0.015, bowY, -0.13], points[points.length - 1]], 0.002, "#e7dfc8");
  tube("bow-grip", [[bowX - 0.18, bowY - 0.085, -0.13], [bowX - 0.18, bowY + 0.085, -0.13]], 0.025, grip);
  for (let i = 0; i < 8; i++) tube("grip-wrap", [[bowX - 0.205, bowY - 0.075 + i * 0.02, -0.13], [bowX - 0.155, bowY - 0.067 + i * 0.02, -0.13]], 0.003, trim);
  const quiver = B.MeshBuilder.CreateCylinder("quiver", { height: 0.5, diameter: 0.16, tessellation: 20 }, scene); quiver.parent = root; quiver.position.set(0.17, 1.38, 0.25); quiver.rotation.z = -0.2; quiver.material = material("#78503a");
  for (let arrow = 0; arrow < 3; arrow++) {
    const x = 0.13 + arrow * 0.04, z = 0.25 + arrow % 2 * 0.035;
    tube("arrow-shaft", [[x, 1.33, z], [x, 1.99, z]], 0.004, f.arrowDesign === "moonsteel" ? "#abc5cd" : "#b78f61");
    for (const side of [-1, 1]) { const feather = box("arrow-feather", [x + side * 0.015, 1.91, z], [0.03, 0.11, 0.005], c.arrow || "#8be7ba"); feather.rotation.z = side * 0.3; }
  }
  tube("held-arrow", [[0.45, 1.02, -0.12], [0.45, 1.61, -0.12]], 0.004, f.arrowDesign === "moonsteel" ? "#c0d3db" : "#ba9366");
  const tip = cone("arrowhead", 0.45, 1.65, -0.12, f.arrowDesign === "moonsteel" ? 0.055 : 0.035, 0.09, f.arrowDesign === "aurora" ? c.arrow || "#8be7ba" : "#b4c7cf");
  if (f.arrowDesign === "aurora") tip.material = material(c.arrow || "#8be7ba", { emissive: true });
  for (const side of [-1, 1]) { const feather = box("held-arrow-feather", [0.45 + side * 0.015, 1.1, -0.12], [0.03, 0.11, 0.005], c.arrow || "#8be7ba"); feather.rotation.z = side * 0.3; }
  return head;
}
