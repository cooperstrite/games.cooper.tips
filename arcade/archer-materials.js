// Small, deterministic material maps. They stay on the GPU while colors change.
const textureSets = new WeakMap();
function textures(world) {
  if (textureSets.has(world)) return textureSets.get(world);
  const { B, scene } = world, maps = {};
  for (const kind of ["cloth", "leather", "wood", "hair", "skin"]) {
    const size = 256, heights = new Float32Array(size * size);
    const noise = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const n = noise(x, y), grain = Math.sin(x * 0.18 + Math.sin(y * 0.025) * 3);
      heights[y * size + x] = kind === "cloth" ? (Math.sin(x * Math.PI / 2) * Math.cos(y * Math.PI / 2) * .3 + n * .15)
        : kind === "wood" ? grain * .3 + Math.sin(x * .8 + y * .01) * .1 + n * .06
        : kind === "hair" ? Math.sin(x * 1.7 + Math.sin(y * .03)) * .3 + n * .08
        : kind === "leather" ? n * .3 + noise(Math.floor(x / 4), Math.floor(y / 4)) * .25 : n * .12;
    }
    const albedo = new B.DynamicTexture(`${kind}-grain`, size, scene, true), normal = new B.DynamicTexture(`${kind}-normal`, size, scene, true);
    const a = albedo.getContext().createImageData(size, size), b = normal.getContext().createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x, p = i * 4, h = heights[i];
      const dx = heights[y * size + (x + 1) % size] - heights[y * size + (x + size - 1) % size];
      const dy = heights[((y + 1) % size) * size + x] - heights[((y + size - 1) % size) * size + x];
      const value = Math.max(0, Math.min(255, 231 + h * (kind === "wood" ? 55 : 24)));
      a.data.set([value, value, value, 255], p); b.data.set([128 - dx * 55, 128 - dy * 55, 252, 255], p);
    }
    albedo.getContext().putImageData(a, 0, 0); normal.getContext().putImageData(b, 0, 0); albedo.update(); normal.update(); normal.gammaSpace = false;
    for (const texture of [albedo, normal]) { texture.wrapU = texture.wrapV = B.Texture.WRAP_ADDRESSMODE; texture.anisotropicFilteringLevel = 8; }
    maps[kind] = { albedo, normal };
  }
  textureSets.set(world, maps); return maps;
}

export function createArcherMaterials(world) {
  const { B, scene } = world, maps = textures(world), materials = new Map();
  return {
    get(kind, color) {
      const key = `${kind}:${color}`;
      if (materials.has(key)) return materials.get(key);
      const mat = new B.PBRMaterial(`archer-${key}`, scene);
      mat.albedoColor = B.Color3.FromHexString(color).toLinearSpace(); mat.metallic = kind === "metal" ? .78 : 0;
      mat.twoSidedLighting = true;
      mat.roughness = { cloth: .94, leather: .66, wood: .44, hair: .7, skin: .58, metal: .32, eye: .2, crystal: .16 }[kind] ?? .7;
      if (kind === "hair") mat.specularIntensity = .45;
      if (maps[kind]) { mat.albedoTexture = maps[kind].albedo; mat.bumpTexture = maps[kind].normal; }
      if (kind === "cloth") { mat.sheen.isEnabled = true; mat.sheen.intensity = .25; mat.sheen.color = B.Color3.FromHexString(color); }
      if (kind === "skin") { mat.subSurface.isTranslucencyEnabled = true; mat.subSurface.translucencyIntensity = .12; mat.subSurface.tintColor = new B.Color3(1, .48, .32); }
      if (kind === "eye") { mat.clearCoat.isEnabled = true; mat.clearCoat.intensity = .6; mat.clearCoat.roughness = .1; }
      if (kind === "crystal") { mat.metallic = .35; mat.emissiveColor = mat.albedoColor.scale(.12); mat.clearCoat.isEnabled = true; }
      materials.set(key, mat); return mat;
    },
    // Textures belong to the scene; each appearance only owns its materials.
    dispose() { for (const mat of materials.values()) mat.dispose(false, false); materials.clear(); },
  };
}

export function lightArcherStudio(world) {
  const { B, scene, sun, shadows } = world;
  scene.clearColor = B.Color4.FromHexString("#343f45ff");
  scene.imageProcessingConfiguration.exposure = 1.15;
  const fill = scene.getLightByName("sky-fill"); fill.intensity = 1.05; fill.groundColor = B.Color3.FromHexString("#7b7370");
  sun.position.set(-3, 5, -4); sun.direction.set(.45, -.65, .6); sun.intensity = 2.8; sun.diffuse = B.Color3.FromHexString("#fff0da");
  sun.shadowMinZ = .1; sun.shadowMaxZ = 12; sun.shadowFrustumSize = 4;
  if (shadows) { shadows.useBlurExponentialShadowMap = false; shadows.usePercentageCloserFiltering = true; shadows.filteringQuality = B.ShadowGenerator.QUALITY_MEDIUM; shadows.bias = .0003; shadows.normalBias = .008; }
  const rim = new B.DirectionalLight("archer-rim", new B.Vector3(-.6, -.3, -.8), scene); rim.intensity = 1.2; rim.diffuse = B.Color3.FromHexString("#acc6df");
  const bounce = new B.DirectionalLight("archer-bounce", new B.Vector3(-.7, -.1, .7), scene); bounce.intensity = .7;
  // A local studio reflection cube: softboxes, a dim ceiling and a dark floor.
  // No CDN, HDR download or network dependency is needed for metallic equipment.
  const size = 32, faces = [];
  const directions = [(u,v)=>[1,-v,-u],(u,v)=>[-1,-v,u],(u,v)=>[u,1,v],(u,v)=>[u,-1,-v],(u,v)=>[u,-v,1],(u,v)=>[-u,-v,-1]];
  for (const direction of directions) {
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const v = new B.Vector3(...direction((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1)).normalize();
      const key = Math.pow(Math.max(0, B.Vector3.Dot(v, new B.Vector3(-.5,.6,-.6).normalize())), 24);
      const edge = Math.pow(Math.max(0, B.Vector3.Dot(v, new B.Vector3(.6,.4,.6).normalize())), 35);
      const base = 18 + Math.max(0, v.y) * 25;
      data.set([base + key * 210 + edge * 95, base + key * 195 + edge * 115, base + key * 175 + edge * 140, 255], (y * size + x) * 4);
    }
    faces.push(data);
  }
  const env = new B.RawCubeTexture(scene, faces, size, B.Engine.TEXTUREFORMAT_RGBA, B.Engine.TEXTURETYPE_UNSIGNED_BYTE, true, false, B.Texture.TRILINEAR_SAMPLINGMODE);
  env.name = "local-studio-reflections"; env.gammaSpace = false; scene.environmentTexture = env; scene.environmentIntensity = .45;

  // A curved photography backdrop removes the distracting floor/horizon seam.
  const rows=[[-15,0],[1.4,0]];
  for(let i=1;i<=24;i++){const a=i/24*Math.PI/2;rows.push([1.4+1.6*Math.sin(a),1.6-1.6*Math.cos(a)]);}
  rows.push([3,9]);
  const backdrop=B.MeshBuilder.CreateRibbon("archer-studio-backdrop",{pathArray:rows.map(([z,y])=>[new B.Vector3(-15,y,z),new B.Vector3(15,y,z)]),sideOrientation:B.Mesh.DOUBLESIDE},scene);
  const backdropMat=new B.PBRMaterial("studio-backdrop-matte",scene);backdropMat.albedoColor=B.Color3.FromHexString("#454f55").toLinearSpace();backdropMat.metallic=0;backdropMat.roughness=1;backdropMat.twoSidedLighting=true;
  backdrop.material=backdropMat;backdrop.receiveShadows=true;
  return backdrop;
}
