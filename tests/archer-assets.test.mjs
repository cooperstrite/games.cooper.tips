import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const meta = JSON.parse(await readFile(new URL("../assets/archer/head.json", import.meta.url)));
const file = await readFile(new URL("../assets/archer/head.bin", import.meta.url));
const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);

test("the anatomical head has valid compact geometry and Babylon-facing triangles", () => {
  const n = meta.vertexCount;
  assert.equal(buffer.byteLength, n * 32 + meta.indexCount * 2);
  assert.ok(n < 65536, "the mesh fits uint16 indices");
  const p = new Float32Array(buffer, 0, n * 3), normals = new Float32Array(buffer, n * 12, n * 3);
  const uv = new Float32Array(buffer, n * 24, n * 2), indices = new Uint16Array(buffer, n * 32, meta.indexCount);
  for (let i = 0; i < n; i++) {
    assert.ok(Number.isFinite(p[i * 3]) && Number.isFinite(p[i * 3 + 2]));
    assert.ok(p[i * 3 + 1] > 1.7 && p[i * 3 + 1] < 2.15, "only head and neck are included");
    assert.ok(Math.abs(Math.hypot(...normals.slice(i * 3, i * 3 + 3)) - 1) < .01);
    assert.ok(uv[i * 2] >= 0 && uv[i * 2] <= 1 && uv[i * 2 + 1] >= 0 && uv[i * 2 + 1] <= 1);
  }
  let facing = 0, triangles = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const [a,b,c] = Array.from(indices.slice(i,i+3), n => n * 3);
    assert.ok(Math.max(a,b,c) < p.length);
    const u = [0,1,2].map(k => p[b+k]-p[a+k]), v = [0,1,2].map(k => p[c+k]-p[a+k]);
    const cross = [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    if (Math.hypot(...cross) < 1e-12) continue;
    const dot = cross.reduce((sum, x, k) => sum+x*(normals[a+k]+normals[b+k]+normals[c+k]), 0);
    triangles++; if (dot < 0) facing++;
  }
  assert.ok(facing / triangles > .99, "clockwise triangles retain outward normals, so the face is visible");
  assert.ok(meta.anchors["l-eye"][0] > 0 && meta.anchors["r-eye"][0] < 0);
});

test("head loading retries after a failed request, validates truncation, and caches success", async () => {
  const original = globalThis.fetch;
  let attempt = 0, requests = 0;
  globalThis.fetch = async url => {
    requests++;
    if (url.pathname.endsWith("head.json")) return { ok:true, json:async()=>meta };
    attempt++;
    return { ok:attempt !== 1, arrayBuffer:async()=>attempt === 2 ? buffer.slice(0, 40) : buffer };
  };
  try {
    const { prepareArcherAssets } = await import("../arcade/humanoid-mesh.js");
    await assert.rejects(prepareArcherAssets(), /unavailable/);
    await assert.rejects(prepareArcherAssets(), /Incomplete/);
    const loaded = await prepareArcherAssets();
    assert.equal(loaded.positions.length, meta.vertexCount * 3);
    assert.equal(loaded.indices.length, meta.indexCount);
    assert.equal(await prepareArcherAssets(), loaded);
    assert.equal(requests, 6);
  } finally { globalThis.fetch = original; }
});
