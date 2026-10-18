// Reusable surface tools for fitted clothing and articulated equipment.
export function archerGeometry(world, root) {
  const { B, scene } = world, V = p => new B.Vector3(...p);
  function finish(mesh, mat, parent = root) { mesh.parent = parent; mesh.material = mat; mesh.receiveShadows = true; world.shadows?.addShadowCaster(mesh); return mesh; }
  function surface(name, point, columns, rows, mat, { parent = root, uvScale = [1,1], closed = false } = {}) {
    const data = new B.VertexData(), positions = [], indices = [], uvs = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) { positions.push(...point(i / columns, j / rows)); uvs.push(i / columns * uvScale[0], j / rows * uvScale[1]); }
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) { const a = j * (columns + 1) + i, b = a + columns + 1; indices.push(a,b,a+1,a+1,b,b+1); }
    data.positions = positions; data.indices = indices; data.uvs = uvs; data.normals = [];
    B.VertexData.ComputeNormals(positions, indices, data.normals);
    if (closed) for (let j = 0; j <= rows; j++) {
      const a = j * (columns + 1) * 3, b = (j * (columns + 1) + columns) * 3;
      const n = new B.Vector3(...data.normals.slice(a,a+3)).add(new B.Vector3(...data.normals.slice(b,b+3))).normalize();
      for (let k = 0; k < 3; k++) data.normals[a+k] = data.normals[b+k] = n.asArray()[k];
    }
    const mesh = new B.Mesh(name, scene); data.applyToMesh(mesh); mat.backFaceCulling = false; return finish(mesh, mat, parent);
  }
  function curve(points, steps = 36) { return B.Curve3.CreateCatmullRomSpline(points.map(V), Math.max(2, Math.ceil(steps / (points.length - 1)))).getPoints(); }
  function tube(name, points, radius, mat, parent = root, taper, straight = false) {
    const path = straight || points.length === 2 ? points.map(V) : curve(points, radius < .003 ? 6 : 24), mesh = B.MeshBuilder.CreateTube(name, { path, radius, radiusFunction: taper ? (i) => radius * taper(i/(path.length-1)) : undefined, tessellation: radius < .003 ? 5 : 10, cap: B.Mesh.CAP_ALL }, scene);
    return finish(mesh, mat, parent);
  }
  function ellipsoid(name, at, scale, mat, parent = root) {
    const mesh = B.MeshBuilder.CreateSphere(name, { diameter:1, segments:24 }, scene); mesh.position.set(...at); mesh.scaling.set(...scale); return finish(mesh,mat,parent);
  }
  function sweep(name, points, radii, mat, { flatten = 1, folds = 0, parent = root } = {}) {
    const path = curve(points, 32), frames = new B.Path3D(path), normals = frames.getNormals(), binormals = frames.getBinormals();
    return surface(name, (u,v) => {
      const k = Math.min(path.length-1, Math.round(v*(path.length-1))), t = v*(radii.length-1), i = Math.min(radii.length-2, Math.floor(t)), r = radii[i]+(radii[i+1]-radii[i])*(t-i);
      const a = u * Math.PI * 2, wrinkle = 1 + folds * Math.sin(v*72 + Math.sin(a*3)*1.7) * Math.sin(v*Math.PI);
      return path[k].add(normals[k].scale(Math.cos(a)*r*wrinkle)).add(binormals[k].scale(Math.sin(a)*r*flatten*wrinkle)).asArray();
    }, 32, path.length-1, mat, { parent, uvScale:[2,4], closed:true });
  }
  function band(name, points, width, mat, parent = root) {
    const path = curve(points), vertices = path.map(p=>p.asArray());
    return surface(name, (u,v) => { const p = vertices[Math.round(v*(vertices.length-1))]; return [p[0]+(u-.5)*width,p[1],p[2]-.001*Math.sin(u*Math.PI)]; }, 3, path.length-1, mat, {parent,uvScale:[.3,3]});
  }
  function ring(name, at, diameter, thickness, mat, parent = root) {
    const mesh = B.MeshBuilder.CreateTorus(name, {diameter,thickness,tessellation:40},scene); mesh.position.set(...at); mesh.rotation.x=Math.PI/2; return finish(mesh,mat,parent);
  }
  return { surface, curve, tube, ellipsoid, sweep, band, ring, finish };
}
