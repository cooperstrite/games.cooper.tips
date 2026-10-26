// A bounded, continuous landscape. Global coordinates select the landscape;
// the floating render origin only changes mesh transforms.
import { terrainHeight, airfieldsNear } from "./free-flight-world.js";

const ROOT_SIZE = 32000;
const MIN_SIZE = 2000;
export const FREE_FLIGHT_TERRAIN_RADIUS = ROOT_SIZE * 3;
const clock = () => globalThis.performance?.now() ?? Date.now();
const tileKey = (x, z, size) => `${size}:${x}:${z}`;
const distanceToTile = (x, z, tile) => Math.hypot(Math.max(tile.x - x, 0, x - tile.x - tile.size), Math.max(tile.z - z, 0, z - tile.z - tile.size));

export function planTerrainTiles(x, z) {
  const tiles = [], rootX = Math.floor(x / ROOT_SIZE), rootZ = Math.floor(z / ROOT_SIZE);
  function visit(tx, tz, size) {
    const tile = { key: tileKey(tx, tz, size), x: tx, z: tz, size };
    tile.distance = distanceToTile(x, z, tile);
    if (size > MIN_SIZE && tile.distance < size) {
      const half = size / 2;
      for (let oz = 0; oz < 2; oz++) for (let ox = 0; ox < 2; ox++) visit(tx + ox * half, tz + oz * half, half);
    } else {
      tile.subdivisions = size === MIN_SIZE ? 64 : size < 16000 ? 32 : 16;
      tiles.push(tile);
    }
  }
  for (let rz = -3; rz <= 3; rz++) for (let rx = -3; rx <= 3; rx++) visit((rootX + rx) * ROOT_SIZE, (rootZ + rz) * ROOT_SIZE, ROOT_SIZE);
  const lookup = new Map(tiles.map(tile => [tile.key, tile]));
  function neighborStep(px, pz) {
    for (let size = MIN_SIZE; size <= ROOT_SIZE; size *= 2) {
      const neighbor = lookup.get(tileKey(Math.floor(px / size) * size, Math.floor(pz / size) * size, size));
      if (neighbor) return size / neighbor.subdivisions;
    }
    return 0;
  }
  for (const tile of tiles) {
    const { x: tx, z: tz, size } = tile;
    // North, east, south, west. Finer edge samples meet the actual straight
    // segments of their coarser neighbor instead of leaving T-junction cracks.
    tile.edgeSteps = [neighborStep(tx + size / 2, tz - .1), neighborStep(tx + size + .1, tz + size / 2), neighborStep(tx + size / 2, tz + size + .1), neighborStep(tx - .1, tz + size / 2)];
  }
  return tiles.sort((a, b) => a.distance - b.distance || a.size - b.size || a.x - b.x || a.z - b.z);
}

export function buildTerrainTileData(tile, subdivisions = tile.subdivisions) {
  const { x: x0, z: z0, size } = tile, step = size / subdivisions, stride = subdivisions + 1;
  const fields = airfieldsNear(x0 + size / 2, z0 + size / 2, Math.SQRT2 * size / 2 + 6500);
  const height = (x, z) => terrainHeight(x, z, fields);
  const vertices = stride * stride, borderVertices = stride * 8, totalVertices = vertices + borderVertices;
  const positions = new Float32Array(totalVertices * 3), normals = new Float32Array(totalVertices * 3), colors = new Float32Array(totalVertices * 4), uvs = new Float32Array(totalVertices * 2);
  const indices = new Uint32Array(subdivisions * subdivisions * 6 + subdivisions * 4 * 12);
  const edgeSteps = tile.edgeSteps || [0, 0, 0, 0];
  function edgeCorrection(edge, along) {
    const spacing = edgeSteps[edge], start = Math.floor(along / spacing) * spacing, fraction = (along - start) / spacing;
    const edgeX = edge === 1 ? x0 + size : x0, edgeZ = edge === 2 ? z0 + size : z0;
    const a = edge % 2 ? height(edgeX, start) : height(start, edgeZ);
    const b = edge % 2 ? height(edgeX, start + spacing) : height(start + spacing, edgeZ);
    const h = edge % 2 ? height(edgeX, along) : height(along, edgeZ);
    return a + (b - a) * fraction - h;
  }
  let index = 0;
  for (let iz = 0; iz <= subdivisions; iz++) for (let ix = 0; ix <= subdivisions; ix++) {
    const vertex = iz * stride + ix, x = x0 + ix * step, z = z0 + iz * step;
    let h = height(x, z), correction = 0, influence = 0;
    const distances = [iz, subdivisions - ix, subdivisions - iz, ix];
    for (let edge = 0; edge < 4; edge++) if (edgeSteps[edge] > step && distances[edge] < 3) {
      const weight = (1 - distances[edge] / 3) ** 2;
      correction += edgeCorrection(edge, edge % 2 ? z : x) * weight;
      influence += weight;
    }
    // At a corner both neighbors share the same grid point, so their
    // correction agrees. Average overlapping transition bands.
    if (influence) h += correction / Math.max(1, influence);
    const dx = (height(x + 25, z) - height(x - 25, z)) / 50, dz = (height(x, z + 25) - height(x, z - 25)) / 50, length = Math.hypot(dx, 1, dz);
    positions.set([ix * step, h, iz * step], vertex * 3);
    normals.set([-dx / length, 1 / length, -dz / length], vertex * 3);
    colors.set([1, 1, 1, 1], vertex * 4); uvs.set([x / 100, z / 100], vertex * 2);
    if (ix < subdivisions && iz < subdivisions) {
      // Clockwise front faces in Babylon's left-handed world.
      indices.set([vertex, vertex + 1, vertex + stride, vertex + 1, vertex + stride + 1, vertex + stride], index); index += 6;
    }
  }
  // Downward skirts also cover transient differences while a neighbor's
  // low-resolution loading mesh is being replaced. They are below the
  // landscape, never a second horizontal layer that could flicker.
  const depth = Math.max(90, size * .04);
  let nextVertex = vertices;
  for (let edge = 0; edge < 4; edge++) {
    const edgeStart = nextVertex;
    for (let i = 0; i <= subdivisions; i++) {
      const source = edge === 0 ? i : edge === 1 ? i * stride + subdivisions : edge === 2 ? subdivisions * stride + subdivisions - i : (subdivisions - i) * stride;
      for (let lower = 0; lower < 2; lower++) {
        const vertex = nextVertex++;
        positions.set(positions.subarray(source * 3, source * 3 + 3), vertex * 3); positions[vertex * 3 + 1] -= lower * depth;
        normals.set(normals.subarray(source * 3, source * 3 + 3), vertex * 3); colors.set([1, 1, 1, 1], vertex * 4); uvs.set(uvs.subarray(source * 2, source * 2 + 2), vertex * 2);
      }
      if (i < subdivisions) {
        const a = edgeStart + i * 2;
        indices.set([a, a + 1, a + 2, a + 1, a + 3, a + 2, a + 2, a + 1, a, a + 2, a + 3, a + 1], index); index += 12;
      }
    }
  }
  return { positions, normals, colors, uvs, indices };
}

export function createFlightTerrain({ B, scene, material }) {
  const chunks = new Map(); let pending = [], origin = { x: 0, z: 0 }, planKey = "", disposed = false;
  function apply(tile, subdivisions) {
    let chunk = chunks.get(tile.key);
    if (!chunk) {
      const mesh = new B.Mesh("free-flight-land-" + tile.key, scene);
      mesh.material = material; mesh.receiveShadows = true; mesh.isPickable = false;
      chunk = { tile, mesh, subdivisions: 0, triangles: 0 }; chunks.set(tile.key, chunk);
    }
    const geometry = buildTerrainTileData(tile, subdivisions), data = new B.VertexData(); Object.assign(data, geometry); data.applyToMesh(chunk.mesh);
    chunk.mesh.position.set(tile.x - origin.x, 0, tile.z - origin.z);
    chunk.tile = tile; chunk.subdivisions = subdivisions; chunk.triangles = geometry.indices.length / 3;
    chunk.edgeKey = tile.edgeSteps.join(":");
    return chunk;
  }
  function update(state, renderOrigin, force = false) {
    if (disposed) return;
    origin = { x: renderOrigin.x, z: renderOrigin.z };
    const nextKey = Math.floor(state.x / 2000) + ":" + Math.floor(state.z / 2000);
    for (const chunk of chunks.values()) chunk.mesh.position.set(chunk.tile.x - origin.x, 0, chunk.tile.z - origin.z);
    if (nextKey === planKey && !force) return;
    planKey = nextKey;
    const tiles = planTerrainTiles(state.x, state.z), wanted = new Set(tiles.map(tile => tile.key));
    // Establish every incoming tile before removing outgoing tiles. Even the
    // first rendered frame has land all the way into the atmospheric horizon.
    for (const tile of tiles) if (!chunks.has(tile.key)) apply(tile, 8);
    for (const [key, chunk] of chunks) if (!wanted.has(key)) { chunk.mesh.dispose(false, false); chunks.delete(key); }
    pending = tiles.filter(tile => {
      const chunk = chunks.get(tile.key);
      return chunk.subdivisions !== tile.subdivisions || chunk.edgeKey !== tile.edgeSteps.join(":");
    });
    // Resolve the immediate ground first for takeoff, landing, and low passes.
    for (let i = 0; i < (force ? 4 : 1) && pending.length; i++) { const tile = pending.shift(); apply(tile, tile.subdivisions); }
  }
  function tick(budgetMs = 6) {
    if (disposed) return;
    const start = clock();
    while (pending.length) {
      const tile = pending.shift(); apply(tile, tile.subdivisions);
      if (clock() - start >= budgetMs) break;
    }
  }
  return {
    update, tick,
    getStats: () => ({ chunks: chunks.size, pending: pending.length, triangles: [...chunks.values()].reduce((sum, chunk) => sum + chunk.triangles, 0), radius: FREE_FLIGHT_TERRAIN_RADIUS }),
    dispose() { disposed = true; pending.length = 0; for (const chunk of chunks.values()) chunk.mesh.dispose(false, false); chunks.clear(); },
  };
}
