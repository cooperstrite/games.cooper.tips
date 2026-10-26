import test from "node:test";
import assert from "node:assert/strict";
import { planTerrainTiles, buildTerrainTileData, createFlightTerrain, FREE_FLIGHT_TERRAIN_RADIUS } from "../free-flight-terrain.js";
import { terrainHeight } from "../free-flight-world.js";

function checkCoverage(tiles, x, z) {
  const minX = Math.min(...tiles.map(tile => tile.x)), maxX = Math.max(...tiles.map(tile => tile.x + tile.size));
  const minZ = Math.min(...tiles.map(tile => tile.z)), maxZ = Math.max(...tiles.map(tile => tile.z + tile.size));
  assert.ok(Math.min(x - minX, maxX - x, z - minZ, maxZ - z) >= 96000, "Land must extend at least 96 km in every direction");
  assert.equal(tiles.reduce((sum, tile) => sum + tile.size ** 2, 0), (maxX - minX) * (maxZ - minZ), "The visible square has no missing area");
  for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) {
    const a = tiles[i], b = tiles[j];
    assert.ok(!(a.x < b.x + b.size && a.x + a.size > b.x && a.z < b.z + b.size && a.z + a.size > b.z), "Terrain surfaces must not overlap and flicker");
  }
}

test("terrain covers the horizon without gaps or overlapping patches across sector boundaries", () => {
  for (const [x, z] of [[0, 0], [2100, 1400], [31999.99, -32000.01], [32000.01, -31999.99], [500000, -200000], [-10000000, 2500000]]) {
    const tiles = planTerrainTiles(x, z);
    checkCoverage(tiles, x, z);
    const underAircraft = tiles.find(tile => x >= tile.x && x < tile.x + tile.size && z >= tile.z && z < tile.z + tile.size);
    assert.ok(underAircraft.size / underAircraft.subdivisions <= 32, "The closest terrain retains fine detail wherever the aircraft travels");
  }
});

test("near terrain uses the physical landscape and upward, finite normals", () => {
  for (const [x, z] of [[0, 0], [-2800, -4200], [-14000, 19500], [500000, -200000]]) {
    const tile = planTerrainTiles(x, z).find(t => x >= t.x && x < t.x + t.size && z >= t.z && z < t.z + t.size);
    const data = buildTerrainTileData(tile), stride = tile.subdivisions + 1;
    assert.ok(data.positions.every(Number.isFinite));
    assert.ok(data.indices.every(index => index >= 0 && index < data.positions.length / 3));
    // The outer three rows blend to a coarser neighbor's segment. Interior
    // samples, including the flat runway, must agree with collision physics.
    for (let iz = 3; iz < tile.subdivisions - 3; iz += 5) for (let ix = 3; ix < tile.subdivisions - 3; ix += 5) {
      const index = (iz * stride + ix) * 3;
      const worldX = tile.x + data.positions[index], worldZ = tile.z + data.positions[index + 2];
      assert.ok(Math.abs(data.positions[index + 1] - terrainHeight(worldX, worldZ)) < .002, "The rendered ground agrees with the landing/collision surface");
      const normal = data.normals.subarray(index, index + 3);
      assert.ok(normal[1] > 0 && Math.abs(Math.hypot(...normal) - 1) < 1e-6, "Surface normals stay normalized and face the sky");
    }
  }
});

test("fine and coarse terrain meet along the same edge instead of exposing a crack", () => {
  const tiles = planTerrainTiles(2100, 1400), cache = new Map();
  const geometry = tile => { if (!cache.has(tile.key)) cache.set(tile.key, buildTerrainTileData(tile)); return cache.get(tile.key); };
  let checked = 0;
  for (const tile of tiles.filter(t => t.size === 2000)) for (let edge = 0; edge < 4; edge++) {
    if (tile.edgeSteps[edge] <= tile.size / tile.subdivisions) continue;
    const edgeX = edge === 1 ? tile.x + tile.size : edge === 3 ? tile.x : tile.x + tile.size / 2;
    const edgeZ = edge === 0 ? tile.z : edge === 2 ? tile.z + tile.size : tile.z + tile.size / 2;
    const probeX = edgeX + (edge === 1 ? .1 : edge === 3 ? -.1 : 0), probeZ = edgeZ + (edge === 0 ? -.1 : edge === 2 ? .1 : 0);
    const neighbor = tiles.find(t => probeX >= t.x && probeX < t.x + t.size && probeZ >= t.z && probeZ < t.z + t.size);
    const a = geometry(tile), b = geometry(neighbor), stride = tile.subdivisions + 1, neighborStride = neighbor.subdivisions + 1;
    for (let i = Math.ceil(tile.subdivisions / 3); i < tile.subdivisions * 2 / 3; i++) {
      const along = i * tile.size / tile.subdivisions;
      const local = ((edge % 2 ? tile.z - neighbor.z : tile.x - neighbor.x) + along) / neighbor.size * neighbor.subdivisions;
      const low = Math.floor(local), fraction = local - low;
      const vertex = edge === 0 ? i : edge === 1 ? i * stride + tile.subdivisions : edge === 2 ? tile.subdivisions * stride + i : i * stride;
      const first = edge === 0 ? neighbor.subdivisions * neighborStride + low : edge === 1 ? low * neighborStride : edge === 2 ? low : low * neighborStride + neighbor.subdivisions;
      const second = first + (edge % 2 ? neighborStride : 1);
      const expected = b.positions[first * 3 + 1] * (1 - fraction) + b.positions[second * 3 + 1] * fraction;
      assert.ok(Math.abs(a.positions[vertex * 3 + 1] - expected) < .002, "Fine edge vertices lie on the neighbor's coarse triangle edge");
      checked++;
    }
  }
  assert.ok(checked > 100, "Exercise multiple terrain detail transitions");
});

test("streaming remains complete and bounded through climbing, long travel, and returning home", () => {
  const scene = { meshes: [] }; let created = 0, disposed = 0;
  class Mesh {
    constructor(name) { this.name = name; this.position = { set: (x, y, z) => Object.assign(this.position, { x, y, z }) }; scene.meshes.push(this); created++; }
    dispose() { scene.meshes.splice(scene.meshes.indexOf(this), 1); disposed++; }
  }
  class VertexData {
    applyToMesh(mesh) {
      let size = 0;
      for (let i = 0; i < this.positions.length; i += 3) size = Math.max(size, this.positions[i], this.positions[i + 2]);
      mesh.size = size;
    }
  }
  const terrain = createFlightTerrain({ B: { Mesh, VertexData }, scene, material: {} });
  for (const [x, z, y] of [[0, -4200, 20], [0, -4200, 5000], [4000, -3000, 1200], [400000, 400000, 5000], [-10000000, 3000000, 9000], [0, -4200, 600]]) {
    const origin = { x: Math.floor(x / 4000) * 4000, z: Math.floor(z / 4000) * 4000 };
    terrain.update({ x, z, y }, origin);
    // Coverage must exist immediately, before any deferred detail is built.
    checkCoverage(scene.meshes.map(mesh => ({ x: mesh.position.x + origin.x, z: mesh.position.z + origin.z, size: mesh.size })), x, z);
    for (let frame = 0; frame < 300 && terrain.getStats().pending; frame++) terrain.tick(0);
    const stats = terrain.getStats();
    assert.equal(stats.pending, 0); assert.equal(stats.chunks, scene.meshes.length);
    assert.ok(stats.chunks < 200 && stats.triangles < 600000, "World travel must not accumulate an unbounded terrain mesh");
    assert.equal(stats.radius, FREE_FLIGHT_TERRAIN_RADIUS);
  }
  terrain.dispose();
  assert.equal(scene.meshes.length, 0); assert.equal(created, disposed, "Leaving the game releases all streamed patches");
  terrain.tick(); terrain.update({ x: 0, z: 0 }, { x: 0, z: 0 });
  assert.equal(scene.meshes.length, 0, "Disposed streaming cannot recreate the world");
});
