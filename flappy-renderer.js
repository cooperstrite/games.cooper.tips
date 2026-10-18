import { WORLD, clamp } from "./flappy-engine.js";
import { THEMES, drawBird, drawBirdPreview, star, tint } from "./flappy-appearance.js";

const TAU = Math.PI * 2;
const mod = (value, max) => ((value % max) + max) % max;
const point = (x, y, z = 0) => ({ x, y, z });
function line(ctx, points, color, width = 1) {
  ctx.beginPath(); points.forEach((p, index) => index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
}
function oval(ctx, x, y, rx, ry, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }

function sky(ctx, w, h, settings, time, distance) {
  const t = THEMES[settings.background];
  const gradient = ctx.createLinearGradient(0, 0, 0, h); gradient.addColorStop(0, t.sky[0]); gradient.addColorStop(1, t.sky[1]); ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  if (settings.background === "aurora") {
    for (let ribbon = 0; ribbon < 3; ribbon++) {
      const glow = ctx.createLinearGradient(0, h * 0.05, 0, h * 0.65); glow.addColorStop(0, "rgba(118,229,191,0)"); glow.addColorStop(0.55, ribbon % 2 ? "rgba(181,144,221,0.35)" : "rgba(118,229,191,0.4)"); glow.addColorStop(1, "rgba(118,229,191,0)");
      ctx.fillStyle = glow; ctx.beginPath(); const offset = Math.sin(time * 0.2 + ribbon) * h * 0.03;
      ctx.moveTo(-20, h * (0.06 + ribbon * 0.13)); ctx.bezierCurveTo(w * 0.25, h * 0.6 + offset, w * 0.4, -h * 0.1, w + 20, h * (0.15 + ribbon * 0.07)); ctx.lineTo(w + 20, h * 0.6); ctx.bezierCurveTo(w * 0.5, h * 0.45, w * 0.2, h * 0.8, -20, h * 0.3); ctx.closePath(); ctx.fill();
    }
  }
  if (t.dark) {
    for (let i = 0; i < 50; i++) { ctx.fillStyle = `rgba(240,245,237,${0.25 + i % 3 * 0.18})`; ctx.beginPath(); ctx.arc(mod(i * 67.7, w), i * 23.7 % (h * 0.68), i % 5 ? 0.8 : 1.6, 0, TAU); ctx.fill(); }
    oval(ctx, w * 0.78, h * 0.19, 25, 25, "#eee8c9"); oval(ctx, w * 0.78 + 9, h * 0.19 - 6, 23, 23, t.sky[0]);
  } else {
    const glow = ctx.createRadialGradient(w * 0.79, h * 0.2, 10, w * 0.79, h * 0.2, 100); glow.addColorStop(0, "rgba(255,238,188,0.5)"); glow.addColorStop(1, "rgba(255,238,188,0)"); ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    oval(ctx, w * 0.79, h * 0.2, 30, 30, "#f8e8b7");
  }
  for (let i = 0; i < 8; i++) {
    const x = mod(i * 179 - distance * 4 - time * 1.5, w + 200) - 100, y = h * (0.13 + i % 3 * 0.13);
    ctx.globalAlpha = t.dark ? 0.22 : 0.68;
    oval(ctx, x, y, 43 + i % 3 * 9, 12, t.cloud); oval(ctx, x + 14, y - 9, 26, 17, t.cloud); oval(ctx, x - 20, y - 4, 21, 14, t.cloud); ctx.globalAlpha = 1;
  }
  for (let layer = 0; layer < 2; layer++) {
    const hill = ctx.createLinearGradient(0, h * 0.6, 0, h); hill.addColorStop(0, layer ? tint(t.near, 0.1) : tint(t.far, 0.08)); hill.addColorStop(1, layer ? t.near : t.far); ctx.fillStyle = hill; ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = -80; x <= w + 80; x += 40) {
      const scroll = distance * (layer ? 8 : 3), worldX = x + scroll;
      const y = h * (0.67 + layer * 0.08) + Math.sin(worldX * 0.008 + layer) * h * 0.07;
      ctx.lineTo(x, y - (settings.background === "sunset" ? (Math.floor(worldX / 90) % 2 ? 55 : 15) : 0));
    }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  }
  if (settings.background === "neon") {
    for (let i = 0; i < 21; i++) {
      const x = mod(i * 65 - distance * 11, w + 90) - 45, bh = 45 + i * 31 % 100;
      ctx.fillStyle = i % 2 ? "#3b405e" : "#454765"; ctx.fillRect(x, h * 0.91 - bh, 43, bh);
      for (let row = 0; row < bh / 15 - 1; row++) for (let col = 0; col < 3; col++) { ctx.fillStyle = (row + col + i) % 3 ? "#9385b5" : "#a8d3cb"; ctx.fillRect(x + 7 + col * 11, h * 0.91 - bh + 10 + row * 15, 4, 5); }
    }
  } else if (settings.background === "forest") {
    for (let i = 0; i < 17; i++) {
      const x = mod(i * 91 - distance * 10, w + 100) - 50, base = h * 0.91, size = 40 + i * 17 % 70;
      ctx.fillStyle = "#294c4b"; ctx.beginPath(); ctx.moveTo(x, base - size); ctx.lineTo(x - size * 0.3, base); ctx.lineTo(x + size * 0.3, base); ctx.fill();
    }
  } else if (settings.background === "islands") {
    for (let i = 0; i < 5; i++) {
      const x = mod(i * 237 - distance * 6, w + 200) - 100, y = h * (0.3 + i % 3 * 0.16);
      ctx.fillStyle = "#7e929c"; ctx.beginPath(); ctx.moveTo(x - 37, y); ctx.lineTo(x + 37, y); ctx.lineTo(x + 9, y + 42); ctx.lineTo(x - 12, y + 20); ctx.fill(); oval(ctx, x, y, 38, 8, "#86a891");
      line(ctx, [point(x + 15, y), point(x + 16, y + 58)], "rgba(213,243,245,0.55)", 4); line(ctx, [point(x + 17, y + 4), point(x + 18, y + 65)], "rgba(245,254,244,0.5)", 1);
    }
  }
  if (settings.background === "meadow") for (let i = 0; i < 15; i++) {
    const x = mod(i * 113 - distance * 17, w + 80) - 40, base = h * 0.91, size = 18 + i % 3 * 7;
    line(ctx, [point(x, base), point(x - 2, base - size)], "#5b8365", 2);
    oval(ctx, x - 7, base - size * 0.5, 7, 3, "#82a67a"); oval(ctx, x + 3, base - size * 0.75, 7, 3, "#9db787");
    for (let petal = 0; petal < 5; petal++) oval(ctx, x - 2 + Math.cos(petal * TAU / 5) * 3, base - size + Math.sin(petal * TAU / 5) * 3, 2.5, 2.5, i % 2 ? "#f5e5ac" : "#e5b2af");
    oval(ctx, x - 2, base - size, 1.7, 1.7, "#dcbf7b");
  }
  if (settings.background === "volcano") {
    const x = w * 0.72 - Math.sin(distance * 0.015) * 15, y = h * 0.47;
    ctx.fillStyle = "#655066"; ctx.beginPath(); ctx.moveTo(x - w * 0.22, h * 0.91); ctx.lineTo(x - 16, y); ctx.lineTo(x + 18, y); ctx.lineTo(x + w * 0.25, h * 0.91); ctx.fill();
    line(ctx, [point(x - 15, y + 1), point(x, y + 8), point(x + 18, y)], "#e9ad81", 3);
    line(ctx, [point(x + 5, y + 8), point(x - 10, y + h * 0.11), point(x + 18, y + h * 0.2), point(x + 4, h * 0.83)], "#cf8674", 3);
    for (let i = 0; i < 16; i++) { ctx.globalAlpha = 0.25 + i % 3 * 0.15; oval(ctx, mod(i * 83 - distance * 11, w), h * 0.7 - mod(time * 7 + i * 13, h * 0.5), 1.5, 1.5, "#f5c691"); } ctx.globalAlpha = 1;
  }
  if (settings.background === "forest") for (let i = 0; i < 17; i++) {
    const x = mod(i * 167 - distance * 14, w), y = h * (0.58 + i % 5 * 0.06) + Math.sin(time * 0.7 + i) * 7;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 7); glow.addColorStop(0, "rgba(228,239,159,0.65)"); glow.addColorStop(1, "rgba(228,239,159,0)"); ctx.fillStyle = glow; ctx.fillRect(x - 7, y - 7, 14, 14);
  }
}

function pipe2D(ctx, settings, x, top, bottom, width, ground, ceiling) {
  const c = settings.colors.pipe, style = settings.pipeStyle;
  for (const [y, height, upper] of [[ceiling, top - ceiling, true], [bottom, ground - bottom, false]]) {
    if (height <= 0) continue;
    const material = ctx.createLinearGradient(x, 0, x + width, 0); material.addColorStop(0, tint(c, -0.23)); material.addColorStop(0.3, tint(c, 0.3)); material.addColorStop(0.7, c); material.addColorStop(1, tint(c, -0.3));
    ctx.save(); ctx.shadowColor = "rgba(27,57,49,0.2)"; ctx.shadowBlur = 9; ctx.shadowOffsetX = 4; ctx.fillStyle = material; ctx.fillRect(x, y, width, height); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
    if (style === "candy") {
      ctx.strokeStyle = tint(c, 0.7); ctx.lineWidth = 12;
      for (let stripe = y - width; stripe < y + height + width; stripe += 34) { ctx.beginPath(); ctx.moveTo(x - 4, stripe); ctx.lineTo(x + width + 4, stripe + width); ctx.stroke(); }
    } else if (style === "ruins") {
      ctx.strokeStyle = tint(c, -0.2); ctx.lineWidth = 1.5;
      for (let brick = y; brick < y + height; brick += 30) { ctx.beginPath(); ctx.moveTo(x, brick); ctx.lineTo(x + width, brick); ctx.moveTo(x + width * (Math.floor(brick / 30) % 2 ? 0.3 : 0.7), brick); ctx.lineTo(x + width * (Math.floor(brick / 30) % 2 ? 0.3 : 0.7), brick + 30); ctx.stroke(); }
    } else if (style === "crystal") {
      ctx.fillStyle = tint(c, 0.35); ctx.beginPath(); ctx.moveTo(x + width * 0.2, y); ctx.lineTo(x + width * 0.6, y + height * 0.3); ctx.lineTo(x + width * 0.25, y + height); ctx.fill();
      ctx.strokeStyle = tint(c, 0.75); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + width * 0.22, y); ctx.lineTo(x + width * 0.22, y + height); ctx.stroke();
    } else if (style === "gold") {
      ctx.fillStyle = tint(c, 0.7); ctx.fillRect(x + width * 0.24, y, width * 0.045, height);
      for (let mark = y + 30; mark < y + height; mark += 46) { line(ctx, [point(x + width * 0.4, mark), point(x + width * 0.55, mark - 6), point(x + width * 0.7, mark), point(x + width * 0.55, mark + 6), point(x + width * 0.4, mark)], tint(c, 0.45), 1); oval(ctx, x + width * 0.13, mark, 1.5, 1.5, tint(c, -0.25)); }
    } else { ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(x + width * 0.18, y, Math.max(2, width * 0.08), height); }
    ctx.restore();
    const capY = upper ? y + height - 14 : y;
    ctx.fillStyle = material; ctx.beginPath(); ctx.roundRect(x - 5, capY, width + 10, 14, 3); ctx.fill(); ctx.strokeStyle = tint(c, -0.4); ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = tint(c, 0.4); ctx.beginPath(); ctx.moveTo(x - 3, capY + 3); ctx.lineTo(x + width + 3, capY + 3); ctx.stroke();
    oval(ctx, x + width / 2, upper ? capY + 14 : capY, (width + 10) / 2, 3, tint(c, upper ? -0.23 : 0.2));
    if (style === "crystal") { star(ctx, x + width * 0.25, capY + (upper ? -18 : 28), 4, tint(c, 0.85), 0.15); }
  }
}

// Perspective uses forward distance, height, and lateral position in world meters.
export function flappyCamera(width, height, distance, altitude) {
  const focal = height * 0.88, near = distance + 0.08;
  return { near, project: p => ({ x: width / 2 + p.z * focal / (p.x - distance), y: height * 0.46 - (p.y - altitude) * focal / (p.x - distance), depth: p.x - distance }), focal };
}
export function clipFlappyFace(vertices, near) {
  const result = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length], aIn = a.x >= near, bIn = b.x >= near;
    if (aIn) result.push(a);
    if (aIn !== bIn) { const t = (near - a.x) / (b.x - a.x); result.push(point(near, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t)); }
  }
  return result;
}
function mesh3D(ctx, camera, fog) {
  const faces = [];
  function face(vertices, color, light = 1) {
    const clipped = clipFlappyFace(vertices, camera.near); if (clipped.length < 3) return;
    const points = clipped.map(camera.project), depth = points.reduce((sum, p) => sum + p.depth, 0) / points.length;
    const fade = Math.min(0.65, Math.max(0, depth - 9) / 56);
    const base = color.slice(1).match(/../g).map(v => parseInt(v, 16)), mist = fog.slice(1).match(/../g).map(v => parseInt(v, 16));
    const fill = `rgb(${base.map((v, i) => Math.round(Math.min(255, v * light) * (1 - fade) + mist[i] * fade)).join(",")})`;
    faces.push({ points, fill, depth });
  }
  function box(x, y, z, sx, sy, sz, color) {
    const p = []; for (const xx of [-1, 1]) for (const yy of [-1, 1]) for (const zz of [-1, 1]) p.push(point(x + xx * sx / 2, y + yy * sy / 2, z + zz * sz / 2));
    [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]].forEach((indices, index) => face(indices.map(i => p[i]), color, [0.87, 0.7, 0.75, 1.1, 0.82, 1][index]));
  }
  function cylinder(x, low, high, rx, rz, color, sides = 20, caps = true) {
    if (high <= low) return;
    const top = [], bottom = [];
    for (let side = 0; side < sides; side++) {
      const a = side / sides * TAU, b = (side + 1) / sides * TAU;
      const p = angle => point(x + Math.cos(angle) * rx, low, Math.sin(angle) * rz);
      const a0 = p(a), b0 = p(b), a1 = { ...a0, y: high }, b1 = { ...b0, y: high };
      face([a0, b0, b1, a1], color, 0.76 + (Math.sin(a) + 1) * 0.17); top.push(a1); bottom.push(a0);
    }
    if (caps) { face(top, color, 1.14); face(bottom.reverse(), color, 0.64); }
  }
  function crown(x, y, z, radius, color) {
    const vertex = (row, column) => { const latitude = row / 4 * Math.PI, longitude = column / 8 * TAU; return point(x + Math.sin(latitude) * Math.cos(longitude) * radius, y + Math.cos(latitude) * radius, z + Math.sin(latitude) * Math.sin(longitude) * radius); };
    for (let row = 0; row < 4; row++) for (let column = 0; column < 8; column++) face([vertex(row, column), vertex(row + 1, column), vertex(row + 1, column + 1), vertex(row, column + 1)], color, 0.75 + (4 - row) * 0.065 + Math.sin(column / 8 * TAU) * 0.08);
  }
  return { face, box, cylinder, crown, draw() {
    faces.sort((a, b) => b.depth - a.depth);
    faces.forEach(({ points, fill }) => { ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = fill; ctx.lineWidth = 0.5; ctx.stroke(); });
  } };
}

function firstPerson(ctx, w, h, state, settings, flap) {
  const theme = THEMES[settings.background], camera = flappyCamera(w, h, state.distance, state.y), mesh = mesh3D(ctx, camera, theme.sky[1]);
  const start = Math.floor(state.distance / 3) * 3;
  for (let x = start; x < state.distance + 54; x += 3) for (let z = -12; z < 12; z += 3) {
    mesh.face([point(x, 0, z), point(x + 3, 0, z), point(x + 3, 0, z + 3), point(x, 0, z + 3)], Math.floor(x / 3 + z / 3) % 2 ? theme.ground : tint(theme.ground, -0.08));
  }
  for (let x = start; x < state.distance + 50; x += 3) for (const side of [-1, 1]) {
    mesh.face([point(x, 0.012, side * 1.7), point(x + 1.5, 0.012, side * 1.7), point(x + 1.5, 0.012, side * 1.74), point(x, 0.012, side * 1.74)], tint(theme.ground, 0.3));
    for (let blade = 0; blade < 2; blade++) { const z = side * (2.8 + blade * 0.35), color = tint(theme.ground, blade ? 0.08 : -0.16); mesh.face([point(x, 0, z), point(x + 0.12, 0.2, z + 0.04), point(x + 0.2, 0, z + 0.04)], color); }
  }
  for (let i = 0; i < 13; i++) {
    const x = start + i * 4 + 2;
    for (const side of [-1, 1]) {
      const z = side * (5.2 + i % 3 * 1.7);
      if (settings.background === "neon") {
        const bh = 3 + i * 1.73 % 5; mesh.box(x, bh / 2, z + side * 2, 2.3, bh, 2.2, theme.near);
        for (let y = 1; y < bh; y += 1) mesh.box(x - 1.17, y, z + side * 2, 0.03, 0.25, 0.9, i % 2 ? "#bba3dc" : "#9bd4ca");
      } else if (settings.background === "sunset" || settings.background === "volcano") {
        const rh = 2 + i % 3 * 1.3;
        const volcanic = settings.background === "volcano";
        mesh.box(x, rh / 2, z + side, 2.4, rh, 2.4, volcanic ? "#665466" : "#b78b79");
        mesh.box(x, rh + 0.12, z + side, 2.8, 0.24, 2.6, volcanic ? "#9b7773" : "#d2a689");
        for (let layer = 0.5; layer < rh; layer += 0.9) mesh.box(x - 1.21, layer, z + side, 0.02, 0.08, 2.4, volcanic ? "#b87b74" : "#9b736e");
      } else if (settings.background === "islands") {
        const base = 1.8 + i % 3;
        for (let facet = 0; facet < 6; facet++) { const a = facet / 6 * TAU, b = (facet + 1) / 6 * TAU; mesh.face([point(x + Math.cos(a) * 1.2, base, z + Math.sin(a) * 1.2), point(x + Math.cos(b) * 1.2, base, z + Math.sin(b) * 1.2), point(x + 0.15, base - 1.7, z)], "#7b929a", 0.8 + facet * 0.035); }
        // The grass cap shares the island's lateral offset.
        mesh.face(Array.from({ length: 8 }, (_, j) => point(x + Math.cos(j / 8 * TAU) * 1.25, base + 0.19, z + Math.sin(j / 8 * TAU) * 1.25)), "#9bb798");
      } else {
        mesh.box(x, 0.7, z, 0.22, 1.4, 0.22, "#84765b");
        const th = 2.5 + i % 3 * 0.6;
        if (settings.background === "meadow") mesh.crown(x, th - 0.3, z, 1.15, i % 2 ? "#7fa285" : "#90ad86");
        else for (let sideIndex = 0; sideIndex < 5; sideIndex++) {
          const a = sideIndex / 5 * TAU, b = (sideIndex + 1) / 5 * TAU;
          mesh.face([point(x + Math.cos(a), 0.8, z + Math.sin(a)), point(x, th + 1, z), point(x + Math.cos(b), 0.8, z + Math.sin(b))], theme.near, 0.8 + sideIndex * 0.04);
        }
      }
    }
  }
  for (const pipe of state.pipes) {
    if (pipe.x + WORLD.pipeWidth < state.distance) continue;
    const low = pipe.center - pipe.gap / 2, high = pipe.center + pipe.gap / 2, c = settings.colors.pipe;
    mesh.face(Array.from({ length: 14 }, (_, i) => point(pipe.x + Math.cos(i / 14 * TAU) * 0.9 + 0.25, 0.02, Math.sin(i / 14 * TAU) * 1.45 + 0.25)), tint(theme.ground, -0.2));
    for (const [a, b, upper] of [[0, low, false], [high, WORLD.height + 4, true]]) {
      if (settings.pipeStyle === "ruins") {
        mesh.box(pipe.x, (a + b) / 2, 0, WORLD.pipeWidth, b - a, 2.5, c);
        for (let y = a; y < b; y += 0.75) mesh.box(pipe.x - WORLD.pipeWidth / 2 - 0.015, y, 0, 0.025, 0.045, 2.5, tint(c, -0.2));
        mesh.box(pipe.x, upper ? a + 0.1 : b - 0.1, 0, 1.22, 0.22, 2.8, tint(c, 0.15));
      } else if (settings.pipeStyle === "candy") {
        for (let y = a, index = 0; y < b; y += 0.44, index++) mesh.cylinder(pipe.x, y, Math.min(b, y + 0.44), 0.525, 1.25, index % 2 ? tint(c, 0.65) : c, 16, false);
        mesh.cylinder(pipe.x, upper ? a : b - 0.17, upper ? a + 0.17 : b, 0.61, 1.4, c, 20);
      } else {
        mesh.cylinder(pipe.x, a, b, 0.525, 1.25, c, settings.pipeStyle === "crystal" ? 8 : 24);
        mesh.cylinder(pipe.x, upper ? a : b - 0.17, upper ? a + 0.17 : b, 0.6, 1.4, tint(c, 0.12), settings.pipeStyle === "crystal" ? 8 : 24);
        if (settings.pipeStyle === "gold") for (let y = a + 0.75; y < b; y += 1.1) mesh.cylinder(pipe.x, y, y + 0.035, 0.532, 1.26, tint(c, 0.5), 20, false);
      }
    }
  }
  mesh.draw();
  const next = state.pipes.find(p => !p.passed);
  if (settings.guide && next && next.x > camera.near) {
    const p = camera.project(point(next.x, next.center));
    ctx.strokeStyle = "rgba(255,250,210,0.7)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(p.x, p.y, clamp(camera.focal * next.gap / (next.x - state.distance) * 0.16, 7, 40), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#fff8dc"; ctx.shadowColor = "#294d53"; ctx.shadowBlur = 4; ctx.fillText(`${Math.max(0, next.x - state.distance).toFixed(1)} m to gap`, p.x, clamp(p.y - 25, 45, h - 80)); ctx.shadowBlur = 0;
  }
  const wings = mesh3D(ctx, camera, theme.sky[1]), c = settings.colors, bones = [];
  for (const side of [-1, 1]) {
    const root = point(state.distance + 0.48, state.y - 0.55, side * 0.37);
    if (settings.bird === "dragon") {
      const elbow = point(state.distance + 1.15, state.y - 0.24 + flap * 0.23, side * 0.57);
      const tips = [point(state.distance + 1.6, state.y - 0.3 + flap * 0.16, side * 0.98), point(state.distance + 1.1, state.y - 0.46 + flap * 0.12, side * 0.86), point(state.distance + 0.8, state.y - 0.6, side * 0.7)];
      wings.face([root, elbow, tips[0]], c.wing, 1.08); wings.face([root, tips[0], tips[1]], c.wing, 0.86); wings.face([root, tips[1], tips[2]], c.wing, 0.7);
      bones.push([root, elbow, tips[0]], [root, tips[1]], [root, tips[2]]);
    } else {
      for (let feather = 7; feather >= 0; feather--) {
        const z = side * (0.32 + feather * 0.085), y = state.y - 0.3 + flap * 0.2 - feather * 0.016, x = state.distance + 1.1 + feather * 0.06;
        const tip = point(x + 0.12, y, z), edge = point(x + 0.04, y - 0.06, z + side * 0.06);
        wings.face([root, point(x, y + 0.01, z - side * 0.055), tip, edge, point(state.distance + 0.62, state.y - 0.58, side * (0.32 + feather * 0.035))], feather % 2 ? c.wing : tint(c.wing, 0.08), 0.94 + feather * 0.015);
        wings.face([root, tip, point(x + 0.02, y - 0.025, z)], tint(c.wing, 0.23), 1);
      }
    }
  }
  const length = settings.bird === "hummingbird" ? 0.9 : settings.bird === "dragon" ? 0.58 : 0.62;
  wings.face([point(state.distance + 0.22, state.y - 0.35, -0.11), point(state.distance + length, state.y - 0.25, 0), point(state.distance + 0.22, state.y - 0.35, 0.11)], c.beak, 1.1);
  wings.face([point(state.distance + 0.22, state.y - 0.35, -0.11), point(state.distance + 0.22, state.y - 0.44, 0), point(state.distance + length, state.y - 0.25, 0)], c.beak, 0.75);
  wings.face([point(state.distance + 0.22, state.y - 0.35, -0.012), point(state.distance + length, state.y - 0.25, 0), point(state.distance + 0.22, state.y - 0.35, 0.012)], tint(c.beak, 0.3));
  wings.draw();
  bones.forEach(points => line(ctx, points.map(camera.project), tint(c.body, 0.15), 2.2));
  if (settings.eyewear === "goggles" || settings.eyewear === "shades") { ctx.fillStyle = settings.eyewear === "shades" ? "rgba(23,35,57,0.12)" : "rgba(157,219,229,0.04)"; ctx.fillRect(0, 0, w, h); }
  if (settings.hat === "space") { ctx.strokeStyle = "rgba(224,246,245,0.35)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.49, h * 0.48, 0, Math.PI * 1.05, Math.PI * 1.5); ctx.stroke(); }
  ctx.strokeStyle = "rgba(255,250,220,0.75)"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(w / 2, h * 0.46, 4.5, 0, TAU); ctx.stroke();
  const vignette = ctx.createRadialGradient(w / 2, h * 0.43, h * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7); vignette.addColorStop(0, "rgba(25,48,51,0)"); vignette.addColorStop(1, "rgba(25,48,51,0.2)"); ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
}

export function createFlappyRenderer(canvas, previewCanvas, model, getSettings) {
  const ctx = canvas.getContext("2d"); let width = 950, height = 535, lastPreview = -1;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function resize() {
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    width = rect.width; height = rect.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function preview() { drawBirdPreview(previewCanvas, getSettings(), reduced ? 0 : model.state.time); }
  function draw() {
    const state = model.state, settings = getSettings(), theme = THEMES[settings.background];
    const flapAge = state.time - state.lastFlap, flap = state.phase === "ready" ? 0.5 + Math.sin(state.time * 7) * 0.3 : Math.exp(-flapAge * 8);
    sky(ctx, width, height, settings, reduced ? 0 : state.time, settings.view === "first-person" ? state.distance * 0.15 : state.distance);
    if (settings.view === "first-person") {
      const dead = state.phase === "gameover" && !reduced, age = state.crashAge;
      ctx.save();
      if (dead) { ctx.translate(width / 2, height / 2); ctx.rotate(Math.sin(age * 10) * 0.055 * Math.max(0, 1 - age)); ctx.translate(-width / 2, -height / 2); }
      firstPerson(ctx, width, height, dead ? { ...state, y: Math.max(0.35, state.y + age * 0.4 - age * age * 3), distance: state.distance + Math.min(0.5, age * 0.5) } : state, settings, dead ? -Math.min(1, age) : flap);
      ctx.restore();
    }
    else {
      const ground = height * 0.91, unit = height * 0.86 / WORLD.height, birdX = width * 0.27;
      for (const pipe of state.pipes) {
        const x = birdX + (pipe.x - state.distance - WORLD.pipeWidth / 2) * unit, pw = WORLD.pipeWidth * unit;
        if (x + pw < -10 || x > width + 10) continue;
        const top = ground - (pipe.center + pipe.gap / 2) * unit, bottom = ground - (pipe.center - pipe.gap / 2) * unit;
        pipe2D(ctx, settings, x, top, bottom, pw, ground, -20);
        if (settings.guide && !pipe.passed) { ctx.strokeStyle = "rgba(255,249,210,0.42)"; ctx.setLineDash([3, 5]); ctx.strokeRect(x - 3, top + 3, pw + 6, bottom - top - 6); ctx.setLineDash([]); }
      }
      ctx.fillStyle = theme.ground; ctx.fillRect(0, ground, width, height - ground);
      ctx.fillStyle = tint(theme.ground, 0.24); ctx.fillRect(0, ground, width, 5);
      for (let i = -1; i < width / 28 + 1; i++) { const x = i * 28 - mod(state.distance * unit, 28); line(ctx, [point(x, ground + 13), point(x + 12, ground + 13)], tint(theme.ground, -0.12), 2); }
      const dead = state.phase === "gameover", age = reduced ? 1.4 : state.crashAge;
      const deathAltitude = state.crashReason === "ground" ? WORLD.radius + Math.max(0, Math.sin(Math.min(1, age / 0.6) * Math.PI)) * 0.65 : Math.max(WORLD.radius, state.y + age * 1.3 - age * age * 4.5);
      const birdY = ground - (dead ? deathAltitude : state.y) * unit + (state.phase === "ready" && !reduced ? Math.sin(state.time * 3) * 4 : 0), flightX = birdX + (dead ? Math.min(0.65, age) * unit : 0);
      if (settings.trail === "rainbow" && state.phase === "playing") {
        ["#e99b98", "#ebc98b", "#e7e2a2", "#9ac6aa", "#90b7d2", "#bba2ce"].forEach((color, i) => { ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(birdX - 18, birdY + i * 2 - 5); ctx.bezierCurveTo(birdX - 50, birdY - 9 + i * 2, birdX - 85, birdY + Math.sin(state.time * 4) * 8 + i * 2, birdX - 125, birdY + 4 + i * 2); ctx.stroke(); }); ctx.globalAlpha = 1;
      }
      if (settings.trail !== "none" && settings.trail !== "rainbow" && state.phase === "playing") for (let i = 0; i < 9; i++) {
        const age = mod(state.time * 1.6 + i / 9, 1), x = birdX - 24 - age * 90, y = birdY + Math.sin(i * 2 + state.time * 4) * 10;
        ctx.globalAlpha = (1 - age) * 0.65;
        if (settings.trail === "stars") star(ctx, x, y, 2 + age * 3, settings.colors.trail, age * 4);
        else if (settings.trail === "bubbles") { ctx.strokeStyle = settings.colors.trail; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 2 + age * 5, 0, TAU); ctx.stroke(); }
        else if (settings.trail === "fire") oval(ctx, x, y, 10 * (1 - age), 4 * (1 - age), settings.colors.trail);
        else oval(ctx, x, y, 4, 1.5, settings.colors.trail);
      }
      ctx.globalAlpha = 1;
      drawBird(ctx, settings, { x: flightX, y: birdY, scale: Math.max(0.5, unit * 0.012), angle: dead ? Math.min(2.9, age * 5) : clamp(-state.vy * 0.09, -0.38, 0.9), flap: dead ? 0 : flap, time: state.time, crashed: dead });
      if (dead && !reduced && state.crashAge < 0.9) for (let i = 0; i < 11; i++) {
        const angle = i / 11 * TAU, radius = 12 + state.crashAge * 100; ctx.globalAlpha = Math.max(0, 1 - state.crashAge / 0.9);
        if (i % 2) { ctx.save(); ctx.translate(flightX + Math.cos(angle) * radius, birdY + Math.sin(angle) * radius); ctx.rotate(angle + age * 5); oval(ctx, 0, 0, 5, 1.8, settings.colors.wing); ctx.restore(); }
        else star(ctx, flightX + Math.cos(angle) * radius, birdY + Math.sin(angle) * radius, 3, settings.colors.trail, angle); ctx.globalAlpha = 1;
      }
    }
    if (state.phase === "gameover" && state.crashAge < 0.3) { ctx.fillStyle = `rgba(244,159,123,${(1 - state.crashAge / 0.3) * 0.17})`; ctx.fillRect(0, 0, width, height); }
    if (settings.view === "first-person" && state.phase === "gameover" && !reduced && state.crashAge < 0.8) {
      const age = state.crashAge; ctx.globalAlpha = Math.max(0, 1 - age / 0.8);
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = 18 + age * 150; star(ctx, width / 2 + Math.cos(a) * r, height * 0.46 + Math.sin(a) * r * 0.65, 4, settings.colors.trail, a + age * 4); }
      ctx.globalAlpha = 1;
    }
    if (state.time - lastPreview > 0.12 || lastPreview < 0 || state.time < lastPreview) { preview(); lastPreview = state.time; }
  }
  resize(); return { draw, resize, preview };
}

export function drawFlappyShopPreview(canvas, settings, item) {
  const preview = { ...settings, [item.setting]: item.value }, ctx = canvas.getContext("2d"), w = 264, h = 150;
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5); canvas.width = w * ratio; canvas.height = h * ratio; ctx.scale(ratio, ratio);
  sky(ctx, w, h, preview, 0, 0);
  if (item.setting === "pipeStyle") pipe2D(ctx, preview, 198, 41, 99, 30, h, -10);
  if (item.value === "rainbow") ["#e99b98", "#ebc98b", "#e7e2a2", "#9ac6aa", "#90b7d2", "#bba2ce"].forEach((color, i) => line(ctx, [point(20, 91 + i * 3), point(60, 85 + i * 3), point(108, 90 + i * 3)], color, 3));
  drawBird(ctx, preview, { x: item.category === "worlds" ? 115 : 145, y: 92, scale: item.category === "worlds" ? 0.85 : 1.35, time: 0 });
}
