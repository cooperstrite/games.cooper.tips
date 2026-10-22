// Airport architecture and layered foliage share the flight's PBR lighting.
// Static details are merged or instanced so a busy airfield stays inexpensive.
export function createSceneryTools({ B, scene, world, material, ownMat, ownTexture, seeded }) {
  const V = (x, y, z) => new B.Vector3(x, y, z);
  const parts = [];
  function finish(mesh, mat) {
    mesh.material = mat; mesh.parent = world; mesh.isPickable = false; mesh.receiveShadows = true;
    parts.push(mesh); return mesh;
  }
  function box(name, w, h, d, x, y, z, mat) {
    const m = finish(B.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene), mat);
    m.position.set(x, y, z); return m;
  }
  function ground(name, w, d, x, y, z, mat) {
    const m = finish(B.MeshBuilder.CreateGround(name, { width: w, height: d }, scene), mat);
    m.position.set(x, y, z); return m;
  }
  function rod(name, a, b, diameter, mat) {
    const delta = b.subtract(a), m = finish(B.MeshBuilder.CreateCylinder(name, { diameter, height: delta.length(), tessellation: 8 }, scene), mat);
    m.position.copyFrom(a.add(b).scale(.5)); m.rotationQuaternion = B.Quaternion.FromUnitVectorsToRef(B.Axis.Y, delta.normalize(), new B.Quaternion()); return m;
  }
  function texture(name, width, height, draw) {
    const t = ownTexture(new B.DynamicTexture(name, { width, height }, scene, true));
    t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE; t.anisotropicFilteringLevel = 8;
    draw(t.getContext(), width, height); t.update(); return t;
  }
  function pbr(name, tex, roughness = .8, metallic = 0) {
    const m = ownMat(new B.PBRMaterial(name, scene)); m.albedoColor = B.Color3.White();
    m.albedoTexture = tex; m.roughness = roughness; m.metallic = metallic; return m;
  }
  function mergeParts(label) {
    const groups = new Map();
    for (const mesh of parts.splice(0)) {
      if (!groups.has(mesh.material)) groups.set(mesh.material, []);
      groups.get(mesh.material).push(mesh);
    }
    for (const [mat, meshes] of groups) {
      const m = B.Mesh.MergeMeshes(meshes, true, true);
      m.name = `${label}-${mat.name}`; m.parent = world; m.isPickable = false; m.receiveShadows = true;
    }
  }
  const shadowTexture = texture("scenery-contact-shadow", 64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 3, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(17,29,25,.55)"); g.addColorStop(.55, "rgba(17,29,25,.27)"); g.addColorStop(1, "rgba(17,29,25,0)");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  shadowTexture.hasAlpha = true;
  const shadow = ownMat(new B.StandardMaterial("scenery-soft-shadow", scene));
  shadow.diffuseTexture = shadowTexture; shadow.useAlphaFromDiffuseTexture = true;
  shadow.disableLighting = true; shadow.emissiveColor = B.Color3.White(); shadow.disableDepthWrite = true;

  function grove(placements, conifers) {
    const foliage = ownTexture(new B.Texture(new URL("./assets/runway-foliage.png", import.meta.url).href, scene));
    foliage.hasAlpha = true; foliage.anisotropicFilteringLevel = 4;
    const leaf = pbr("sunlit-foliage", foliage, .94);
    leaf.transparencyMode = B.PBRMaterial.PBRMATERIAL_ALPHATEST; leaf.alphaCutOff = .38;
    leaf.backFaceCulling = false; leaf.twoSidedLighting = true; leaf.useAlphaFromAlbedoTexture = true;
    const bark = pbr("ridged-tree-bark", texture("bark-grain", 128, 256, (c, w, h) => {
      const r = seeded(763); c.fillStyle = "#716a54"; c.fillRect(0, 0, w, h);
      for (let j = 0; j < 600; j++) { c.fillStyle = r() > .5 ? "#443f32" : "#9b9276"; c.globalAlpha = .2 + r() * .4; c.fillRect(r() * w, r() * h, 1 + r() * 2, 7 + r() * 70); }
      c.globalAlpha = 1;
    }));
    // Each prototype has an irregular 3D crown made from individual branches,
    // rather than a flat tree billboard or a solid cone.
    const variants = Array.from({ length: 5 }, (_, variant) => {
      const pine = variant < 3, r = seeded(409 + variant * 63), cards = [], wood = [];
      const trunk = B.MeshBuilder.CreateCylinder("tree-trunk", { diameterTop: pine ? .08 : .17, diameterBottom: pine ? .55 : .65, height: pine ? 9 : 6.2, tessellation: 10 }, scene);
      trunk.position.y = pine ? 4.5 : 3.1; wood.push(trunk);
      const branchCount = pine ? 28 : 19;
      for (let j = 0; j < branchCount; j++) {
        const y = pine ? 2 + j / branchCount * 7.8 : 4.4 + r() * 4.1;
        const angle = j * 2.4 + r() * .4;
        const reach = pine ? (10.8 - y) * .28 : Math.sqrt(Math.max(.2, 1 - ((y - 6.6) / 3.2) ** 2)) * (1.8 + r() * 1.2);
        const end = V(Math.cos(angle) * reach, y + .3, Math.sin(angle) * reach);
        const delta = end.subtract(V(0, y - .35, 0));
        const branch = B.MeshBuilder.CreateCylinder("tree-branch", { diameterTop: .025, diameterBottom: pine ? .11 : .16, height: delta.length(), tessellation: 5 }, scene);
        branch.position.copyFrom(end.add(V(0, y - .35, 0)).scale(.5));
        branch.rotationQuaternion = B.Quaternion.FromUnitVectorsToRef(B.Axis.Y, delta.normalize(), new B.Quaternion()); wood.push(branch);
        for (let k = 0; k < 3; k++) {
          const width = pine ? .8 + reach * 1.5 : 2.6 + r() * .9;
          const card = B.MeshBuilder.CreatePlane("leaf-branch", { width, height: width * (pine ? .8 : .9) }, scene);
          card.position.copyFrom(end); card.position.y += (k - 1) * .23;
          card.rotation.set((r() - .5) * 1.4, angle + k * Math.PI / 3, (r() - .5) * .5);
          const uv = card.getVerticesData(B.VertexBuffer.UVKind);
          for (let n = 0; n < uv.length; n += 2) uv[n] = (pine ? .5 : 0) + .012 + uv[n] * .476;
          card.setVerticesData(B.VertexBuffer.UVKind, uv); cards.push(card);
        }
      }
      const crown = B.Mesh.MergeMeshes(cards, true, true), branches = B.Mesh.MergeMeshes(wood, true, true);
      crown.name = pine ? "pine-branches" : "broadleaf-canopy"; crown.material = leaf;
      branches.name = "bark-and-branches"; branches.material = bark;
      for (const m of [crown, branches]) { m.parent = world; m.isPickable = false; m.receiveShadows = true; }
      return { crown, branches, matrices: [] };
    });
    const shadowMatrices = [];
    for (const { x, z, height, variation } of placements) {
      const index = conifers || variation < .25 ? Math.floor(variation * 11) % 3 : 3 + Math.floor(variation * 13) % 2;
      const scale = height / 10, spread = scale * (.87 + variation * .25);
      const matrix = B.Matrix.Compose(V(spread, scale, spread), B.Quaternion.RotationYawPitchRoll(variation * Math.PI * 8, 0, (variation - .5) * .035), V(x, 0, z));
      variants[index].matrices.push(...matrix.asArray());
      shadowMatrices.push(...B.Matrix.Compose(V(height * .85, 1, height * .7), B.Quaternion.Identity(), V(x + height * .12, .018, z + height * .1)).asArray());
    }
    for (const { crown, branches, matrices } of variants) for (const m of [crown, branches]) {
      if (!matrices.length) { m.dispose(); continue; }
      m.thinInstanceSetBuffer("matrix", new Float32Array(matrices), 16, true);
    }
    const shade = B.MeshBuilder.CreateGround("tree-ground-shadows", { width: 1, height: 1 }, scene);
    shade.material = shadow; shade.parent = world; shade.isPickable = false;
    shade.thinInstanceSetBuffer("matrix", new Float32Array(shadowMatrices), 16, true);
  }

  function airport(level) {
    const r = seeded(817), night = level.scenery === "night";
    const trim = material("#d3d5ca", { metalness: .38, roughness: .42 });
    const steel = material("#526570", { metalness: .65, roughness: .38 });
    const glass = material(night ? "#355564" : "#466875", { metalness: .72, roughness: .14 });
    const dark = material("#243541", { roughness: .85 });
    const yellow = material("#ddb94f", { roughness: .78 });
    const lit = material(night ? "#ffe2ab" : "#adc6cf", { emissive: night, roughness: .4 });
    const concrete = pbr("apron-slabs", texture("expansion-joints", 512, 512, (c, w, h) => {
      c.fillStyle = "#9a9d94"; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) {
        const tone = 145 + Math.floor(r() * 18); c.fillStyle = `rgb(${tone},${tone + 3},${tone - 4})`; c.fillRect(x, y, 128, 128);
        c.strokeStyle = "#6e7774"; c.lineWidth = 1.5; c.strokeRect(x + .8, y + .8, 126.4, 126.4);
      }
      for (let j = 0; j < 20000; j++) { c.globalAlpha = .11; c.fillStyle = r() > .5 ? "#e4e2d1" : "#38453e"; c.fillRect(r() * w, r() * h, 1, 1); }
      c.globalAlpha = 1;
    }));
    concrete.albedoTexture.uScale = 14; concrete.albedoTexture.vScale = 31;
    ground("apron", 540, 1200, 490, .025, 1100, concrete);
    const pavement = material("#515d60", { roughness: level.wet ? .45 : .95 });
    ground("taxiway", 27, level.length, 150, .03, level.length / 2, pavement);
    ground("taxi-centerline", .28, level.length, 150, .04, level.length / 2, yellow);
    for (const x of [137.5, 162.5]) ground("taxi-edge-line", .2, level.length, x, .04, level.length / 2, yellow);
    for (const z of [350, 950, 1850].filter(z => z < level.length - 100)) {
      ground("taxi-link", 208, 27, 119, .032, z, pavement);
      ground("taxi-link-line", 204, .28, 121, .043, z, yellow);
      // The four-line holding point is safely outside the runway edge.
      for (const x of [level.width / 2 + 19, level.width / 2 + 20]) ground("hold-short-solid", .25, 22, x, .05, z, yellow);
      for (const x of [level.width / 2 + 21, level.width / 2 + 22]) for (let dz = -10; dz < 11; dz += 3) ground("hold-short-dash", .25, 1.6, x, .05, z + dz, yellow);
      const signTex = texture(`runway-sign-${z}`, 256, 64, c => { c.fillStyle = "#8d2626"; c.fillRect(0, 0, 256, 64); c.font = "bold 45px sans-serif"; c.textAlign = "center"; c.fillStyle = "#f6edcf"; c.fillText(`${level.runway} - HOLD`, 128, 49); });
      const signMat = pbr(`hold-sign-${z}`, signTex, .8);
      const sign = finish(B.MeshBuilder.CreatePlane("runway-holding-sign", { width: 5, height: 1.25, sideOrientation: B.Mesh.DOUBLESIDE }, scene), signMat);
      sign.position.set(level.width / 2 + 27, 1.15, z - 17);
      for (const x of [-1.7, 1.7]) box("sign-leg", .12, .8, .12, sign.position.x + x, .4, sign.position.z, steel);
    }
    const blue = material("#779edb", { emissive: true });
    for (let z = 30; z < level.length; z += 65) for (const x of [136, 164]) box("taxiway-blue-light", .35, .25, .35, x, .23, z, blue);
    // Long glass concourse, staggered roof panels, windows, and boarding bridges.
    ground("terminal-contact-shadow", 155, 380, 470, .04, 885, shadow);
    box("terminal-base", 77, 3, 312, 480, 1.5, 890, trim);
    box("terminal", 72, 17, 300, 480, 11.5, 890, dark);
    box("terminal-curtain-wall", 1, 11, 294, 443.5, 12, 890, glass);
    box("terminal-roof", 90, 1.8, 320, 480, 21, 890, trim);
    for (let z = 745; z < 1040; z += 8) {
      box("window-mullion", 1.3, 12, .2, 443, 12, z, trim);
      if (night && Math.round(z / 8) % 3 !== 0) box("terminal-lit-window", 1.05, 4, 6.5, 443.4, 13, z + 3.8, lit);
    }
    for (const y of [7.3, 12, 17]) box("window-transom", 1.4, .16, 296, 443, y, 890, steel);
    for (let z = 760; z < 1040; z += 45) {
      box("roof-skylight", 38, .7, 20, 483, 22.3, z, glass);
      for (const x of [455, 510]) box("roof-vent", 4, 1.4, 5, x, 22.6, z, steel);
    }
    for (let j = 0; j < 4; j++) {
      const z = 780 + j * 65;
      box("jet-bridge", 42, 3.6, 5.2, 423, 6.1, z, trim);
      box("jet-bridge-windows", 39, 1.7, 5.3, 423, 6.5, z, glass);
      for (let x = 405; x < 442; x += 3.5) box("bridge-frame", .16, 3.6, 5.45, x, 6.1, z, trim);
      box("bridge-cab", 6, 4.3, 7, 399, 6, z, steel);
      box("bridge-bellows", 2, 4, 6.5, 395, 6, z, dark);
      for (const x of [400, 431]) box("bridge-support", .8, 4.3, .8, x, 2.2, z, steel);
      ground("aircraft-stand-centerline", 72, .22, 350, .052, z, yellow);
      for (const dz of [-23, 23]) ground("stand-safety-line", 90, .22, 350, .052, z + dz, material("#e4dfc7"));
      for (let x = 309; x < 390; x += 17) ground("stand-stop-mark", .22, 5, x, .054, z, yellow);
    }
    // Metal hangars use corrugated facades and genuinely curved roofs.
    const cladding = pbr("corrugated-hangar", texture("metal-cladding", 256, 256, (c, w, h) => {
      c.fillStyle = "#a3b0ae"; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 8) { c.fillStyle = "#829491"; c.fillRect(x, 0, 2, h); c.fillStyle = "#c9cfbf"; c.fillRect(x + 2, 0, 1, h); }
      for (let y = 8; y < h; y += 42) { c.strokeStyle = "#83918d"; c.strokeRect(0, y, w, 1); }
    }), .56, .38);
    cladding.albedoTexture.uScale = 4; cladding.albedoTexture.vScale = 2;
    for (let j = 0; j < 4; j++) {
      const z = 540 + j * 300, height = 18 + (j % 2) * 7;
      ground("hangar-contact-shadow", 160, 126, 625, .04, z + 8, shadow);
      box("hangar-walls", 116, height, 92, 620, height / 2, z, cladding);
      const paths = [562, 678].map(x => Array.from({ length: 25 }, (_, k) => { const a = k / 24 * Math.PI; return V(x, height + Math.sin(a) * 13, z + Math.cos(a) * 48); }));
      finish(B.MeshBuilder.CreateRibbon("arched-hangar-roof", { pathArray: paths, sideOrientation: B.Mesh.DOUBLESIDE }, scene), cladding);
      for (const arc of paths) {
        const base = arc.map(p => V(p.x, height, p.z));
        finish(B.MeshBuilder.CreateRibbon("hangar-gable", { pathArray: [arc, base], sideOrientation: B.Mesh.DOUBLESIDE }, scene), cladding);
      }
      box("hangar-door-recess", .5, height * .86, 74, 561.6, height * .43, z, dark);
      for (let k = -3; k <= 3; k++) {
        box("hangar-sliding-door", .6, height * .8, 9.5, 561.1, height * .4, z + k * 10, steel);
        box("hangar-door-glass", .65, 3.1, 8.5, 560.7, height * .64, z + k * 10, glass);
      }
      box("hangar-door-header", 1.5, .8, 80, 560.5, height * .89, z, trim);
      for (const dz of [-39, 39]) box("hangar-floodlight", 1.4, .6, .9, 560, height * .92, z + dz, lit);
    }
    // A faceted glass tower with structural framing, access block and balcony.
    ground("tower-contact-shadow", 55, 65, 375, .045, 1138, shadow);
    box("tower-access-building", 32, 7, 24, 370, 3.5, 1130, cladding);
    const shaft = finish(B.MeshBuilder.CreateCylinder("tapered-control-tower", { height: 52, diameterBottom: 14, diameterTop: 10, tessellation: 8 }, scene), trim);
    shaft.position.set(370, 26, 1130);
    for (const [name, y, h, bottom, top, mat] of [["tower-balcony", 51, 1.3, 27, 27, steel], ["tower-glass-cab", 56, 9, 19, 25, glass], ["tower-overhang", 61.5, 1.8, 28, 28, trim]]) {
      const m = finish(B.MeshBuilder.CreateCylinder(name, { height: h, diameterBottom: bottom, diameterTop: top, tessellation: 8 }, scene), mat); m.position.set(370, y, 1130);
    }
    for (let j = 0; j < 8; j++) {
      const a = j / 8 * Math.PI * 2;
      rod("tower-window-frame", V(370 + Math.cos(a) * 9.6, 51.5, 1130 + Math.sin(a) * 9.6), V(370 + Math.cos(a) * 12.6, 60.5, 1130 + Math.sin(a) * 12.6), .22, trim);
    }
    rod("tower-antenna", V(370, 62, 1130), V(370, 76, 1130), .28, steel);
    box("radar-aerial", 8, 1.7, .6, 370, 73, 1130, trim);
    box("tower-beacon", .8, .6, .8, 370, 76.2, 1130, material("#ff6d51", { emissive: true }));
    // Service equipment provides a readable sense of scale from low approach.
    for (let j = 0; j < 12; j++) {
      const x = 280 + j % 4 * 31, z = 606 + Math.floor(j / 4) * 42;
      box("service-van-body", 2.3, 1.7, 5.5, x, 1.2, z, j % 3 ? trim : yellow);
      box("service-van-cab", 2.2, 1.15, 1.8, x, 1.8, z + 1.5, glass);
      for (const dz of [-1.7, 1.6]) for (const dx of [-1.1, 1.1]) {
        const wheel = finish(B.MeshBuilder.CreateCylinder("service-wheel", { diameter: .8, height: .27, tessellation: 10 }, scene), dark);
        wheel.rotation.z = Math.PI / 2; wheel.position.set(x + dx, .42, z + dz);
      }
    }
    for (const z of [650, 1110, 1530]) {
      rod("apron-light-pole", V(250, 0, z), V(250, 23, z), .28, steel);
      box("apron-light-crossarm", 9, .22, .3, 250, 23, z, steel);
      for (const dx of [-3.5, 0, 3.5]) box("apron-floodlight", 1.1, .35, 1.4, 250 + dx, 22.7, z, lit);
    }
    mergeParts("airport");
  }
  function lodge(level) {
    const timber = material("#796a50", { roughness: .95 }), metal = material("#50615a", { metalness: .5, roughness: .5 });
    const x = 70, z = level.length - 100;
    ground("lodge-contact-shadow", 29, 25, x + 2, .025, z + 2, shadow);
    box("field-lodge", 18, 6, 12, x, 3, z, timber);
    for (const side of [-1, 1]) {
      const roof = box("pitched-lodge-roof", 11, .3, 15, x + side * 4.7, 7.1, z, metal); roof.rotation.z = -side * .35;
      for (let dz = -5; dz <= 5; dz += 2.5) box("lodge-window", .12, 1.5, 1.3, x + side * 9.05, 3.8, z + dz, material("#405c62", { metalness: .6, roughness: .15 }));
    }
    box("lodge-porch", 18, .3, 3.5, x, .3, z - 7.5, timber);
    for (let dx = -8; dx <= 8; dx += 4) box("porch-post", .16, 5.5, .16, x + dx, 2.9, z - 8.5, timber);
    for (let y = .7; y < 6; y += .4) for (const side of [-1, 1]) box("timber-seam", 18, .03, .03, x, y, z + side * 6.01, metal);
    mergeParts("short-field");
  }
  return { grove, airport, lodge };
}
