import { LAUNCH, getTarget, getWind, clamp } from "./archery-engine.js";
import { createRangeCamera } from "./archery-camera.js";

const TAU = Math.PI * 2;
const RINGS = ["#f6cf5a", "#ed6572", "#529eca", "#293a4c", "#ecede3"];
const THEMES = {
  meadow: { sky: "#102b43", mist: "#7b9e9c", grass: "#416858", path: "#8b8666", tree: "#315c50" },
  forest: { sky: "#172640", mist: "#7c9894", grass: "#365d52", path: "#80765f", tree: "#254f46" },
  gorge: { sky: "#282b45", mist: "#a5a3ad", grass: "#5b6570", path: "#8d857a", tree: "#465a59" },
  lake: { sky: "#13344e", mist: "#83b5b6", grass: "#3c6661", path: "#9a8768", tree: "#335f56" },
  aurora: { sky: "#10293c", mist: "#71aaa0", grass: "#335c55", path: "#7a8469", tree: "#2c5c51" },
};
const mix = (a, b, t) => a.map((value, index) => Math.round(value + (b[index] - value) * t));
const rgb = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16));
const css = channels => `rgb(${channels.join(",")})`;
const shade = (hex, brightness) => `#${rgb(hex).map(value => Math.round(clamp(value * brightness, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
const point = (x, y, z) => ({ x, y, z });
const between = (a, b, t) => point(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
const unit = p => { const length = Math.hypot(p.x, p.y, p.z) || 1; return point(p.x / length, p.y / length, p.z / length); };

function stroke(ctx, points, color, width = 1) {
  if (points.some(p => !p)) return;
  ctx.beginPath(); points.forEach((p, index) => index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
}

function sceneMesh(ctx, camera, fog = null) {
  const faces = [];
  function face(vertices, color, light = true, normals = null) {
    if (normals && vertices.length > 3) {
      for (let index = 1; index < vertices.length - 1; index++) face([vertices[0], vertices[index], vertices[index + 1]], color, light, [normals[0], normals[index], normals[index + 1]]);
      return;
    }
    const projected = vertices.map(camera.project);
    if (projected.some(p => !p)) return;
    if (normals) {
      const center = vertices.reduce((p, vertex) => point(p.x + vertex.x / vertices.length, p.y + vertex.y / vertices.length, p.z + vertex.z / vertices.length), point(0, 0, 0));
      const normal = normals.reduce((p, n) => point(p.x + n.x, p.y + n.y, p.z + n.z), point(0, 0, 0));
      if (normal.x * (camera.position.x - center.x) + normal.y * (camera.position.y - center.y) + normal.z * (camera.position.z - center.z) <= 0) return;
    }
    const depth = projected.reduce((sum, p) => sum + p.depth, 0) / projected.length;
    let channels = rgb(color);
    let gradient = null;
    if (normals) {
      const brightness = normals.map(n => 0.66 + Math.max(0, -0.4 * n.x + 0.7 * n.y - 0.58 * n.z) * 0.39 + Math.max(0, -n.x) * 0.09);
      const low = Math.min(...brightness), high = Math.max(...brightness);
      const lit = amount => css(channels.map(value => Math.round(Math.min(255, value * amount))));
      const [a, b, c] = projected, dx1 = b.x - a.x, dy1 = b.y - a.y, dx2 = c.x - a.x, dy2 = c.y - a.y;
      const determinant = dx1 * dy2 - dx2 * dy1;
      if (Math.abs(determinant) > 0.0001 && high - low > 0.001) {
        // Interpolate vertex light across each triangle, keeping shared edges smooth.
        const sx = ((brightness[1] - brightness[0]) * dy2 - (brightness[2] - brightness[0]) * dy1) / determinant;
        const sy = (dx1 * (brightness[2] - brightness[0]) - dx2 * (brightness[1] - brightness[0])) / determinant;
        const length = sx * sx + sy * sy;
        const at = amount => ({ x: a.x + sx * (amount - brightness[0]) / length, y: a.y + sy * (amount - brightness[0]) / length });
        gradient = { from: at(low), to: at(high), dark: lit(low), bright: lit(high) };
      }
      channels = channels.map(value => Math.min(255, Math.round(value * (low + high) / 2)));
    } else if (light) {
      const a = vertices[0], b = vertices[1], c = vertices[2];
      const u = [b.x - a.x, b.y - a.y, b.z - a.z], v = [c.x - a.x, c.y - a.y, c.z - a.z];
      const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const length = Math.hypot(...normal) || 1;
      const brightness = 0.67 + Math.abs((-0.35 * normal[0] + 0.85 * normal[1] - 0.4 * normal[2]) / length) * 0.4;
      channels = channels.map(value => Math.min(255, Math.round(value * brightness)));
    }
    if (fog) channels = mix(channels, rgb(fog), Math.min(0.8, Math.max(0, depth - 18) / 185));
    faces.push({ projected, color: css(channels), depth, gradient });
  }
  function box(center, size, color) {
    const corners = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push(point(center.x + x * size.x / 2, center.y + y * size.y / 2, center.z + z * size.z / 2));
    [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]].forEach(indices => face(indices.map(index => corners[index]), color));
  }
  function tube(points, radius, color, sides = 6, smooth = false, caps = true) {
    const normals = [];
    const rings = points.map((p, index) => {
      const before = points[Math.max(0, index - 1)], after = points[Math.min(points.length - 1, index + 1)];
      const direction = unit(point(after.x - before.x, after.y - before.y, after.z - before.z));
      const normal = Math.abs(direction.z) > 0.98 ? point(1, 0, 0) : unit(point(-direction.y, direction.x, 0));
      const binormal = unit(point(-direction.z * normal.y, direction.z * normal.x, direction.x * normal.y - direction.y * normal.x));
      const r = Array.isArray(radius) ? radius[index] : radius;
      normals[index] = [];
      return Array.from({ length: sides }, (_, side) => {
        const angle = side / sides * TAU;
        const radial = point(normal.x * Math.cos(angle) + binormal.x * Math.sin(angle), normal.y * Math.cos(angle) + binormal.y * Math.sin(angle), normal.z * Math.cos(angle) + binormal.z * Math.sin(angle));
        normals[index][side] = radial;
        return point(p.x + radial.x * r, p.y + radial.y * r, p.z + radial.z * r);
      });
    });
    for (let index = 0; index < rings.length - 1; index++) for (let side = 0; side < sides; side++) {
      const next = (side + 1) % sides;
      face([rings[index][side], rings[index][next], rings[index + 1][next], rings[index + 1][side]], color, true, smooth ? [normals[index][side], normals[index][next], normals[index + 1][next], normals[index + 1][side]] : null);
    }
    if (caps) { face([...rings[0]].reverse(), color); face(rings[rings.length - 1], color); }
  }
  function ellipsoid(center, radii, color, detail = 8) {
    const rings = Math.round(detail * 0.6);
    for (let ring = 0; ring < rings; ring++) for (let side = 0; side < detail; side++) {
      const vertex = (r, s) => {
        const latitude = -Math.PI / 2 + r / rings * Math.PI, longitude = s / detail * TAU;
        return point(center.x + Math.cos(latitude) * Math.cos(longitude) * radii.x, center.y + Math.sin(latitude) * radii.y, center.z + Math.cos(latitude) * Math.sin(longitude) * radii.z);
      };
      const vertices = [vertex(ring, side), vertex(ring, side + 1), vertex(ring + 1, side + 1), vertex(ring + 1, side)];
      face(vertices, color, true, detail > 8 ? vertices.map(p => unit(point((p.x - center.x) / radii.x ** 2, (p.y - center.y) / radii.y ** 2, (p.z - center.z) / radii.z ** 2))) : null);
    }
  }
  function draw() {
    faces.sort((a, b) => b.depth - a.depth);
    faces.forEach(({ projected, color, gradient }) => {
      ctx.beginPath(); projected.forEach((p, index) => index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
      let paint = color;
      if (gradient) {
        paint = ctx.createLinearGradient(gradient.from.x, gradient.from.y, gradient.to.x + 0.001, gradient.to.y);
        paint.addColorStop(0, gradient.dark); paint.addColorStop(1, gradient.bright);
      }
      ctx.fillStyle = paint; ctx.fill();
      ctx.strokeStyle = paint; ctx.lineWidth = gradient ? 0.65 : 0.45; ctx.stroke();
    });
  }
  return { face, box, tube, ellipsoid, draw };
}

function disk(mesh, x, y, z, radius, color, segments = 40) {
  mesh.face(Array.from({ length: segments }, (_, index) => point(x, y + Math.sin(index / segments * TAU) * radius, z + Math.cos(index / segments * TAU) * radius)), color, false);
}

function scenery(ctx, width, height, camera, theme, levelIndex) {
  const colors = THEMES[theme];
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, colors.sky); sky.addColorStop(0.5, colors.mist); sky.addColorStop(1, "#203d3b");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  for (let index = 0; index < 60; index++) {
    ctx.fillStyle = `rgba(229,245,239,${index % 3 ? 0.35 : 0.7})`; ctx.beginPath(); ctx.arc(index * 173.7 % width, index * 37.3 % (camera.horizon * 0.7), index % 5 ? 0.75 : 1.5, 0, TAU); ctx.fill();
  }
  for (let band = 0; band < 4; band++) {
    ctx.beginPath(); ctx.moveTo(-30, height * (0.12 + band * 0.025));
    ctx.bezierCurveTo(width * 0.3, height * 0.4, width * 0.4, -height * 0.12, width + 30, height * (0.2 + band * 0.025));
    ctx.strokeStyle = band % 2 ? "rgba(177,165,242,0.14)" : `rgba(114,237,197,${theme === "aurora" ? 0.28 : 0.1})`; ctx.lineWidth = height * (0.048 - band * 0.006); ctx.stroke();
  }
  const moon = camera.project(point(180, 34, 70));
  ctx.fillStyle = "#f0e8cd"; ctx.beginPath(); ctx.arc(moon.x, moon.y, camera.focal * 0.022, 0, TAU); ctx.fill();
  ctx.fillStyle = colors.sky; ctx.beginPath(); ctx.arc(moon.x + 5, moon.y - 4, camera.focal * 0.021, 0, TAU); ctx.fill();
  const mesh = sceneMesh(ctx, camera, colors.mist);
  for (let index = -5; index < 7; index++) {
    const z = index * 58;
    mesh.face([point(190, -8, z - 55), point(230, 22 + (index + 9) * 13 % 35, z), point(190, -8, z + 55)], index % 2 ? "#526d78" : "#647e86");
  }
  const depths = [-0.9, 1, 3, 6, 10, 15, 22, 32, 45, 62, 83, 110, 145, 185];
  const lanes = [-85, -30, -13, -5, -2.1, 2.1, 5, 13, 30, 85];
  for (let d = 0; d < depths.length - 1; d++) for (let lane = 0; lane < lanes.length - 1; lane++) {
    const inside = lane === 4;
    const water = theme === "lake" && (lane < 3 || lane > 5);
    const base = inside ? colors.path : water ? "#3f7c86" : colors.grass;
    const tint = 0.9 + (d * 7 + lane * 3) % 5 * 0.035;
    const ground = (x, z) => inside ? 0.015 : water ? -0.22 : Math.sin(x * 0.065 + z * 0.1) * Math.min(1.8, Math.abs(z) * 0.035);
    const corners = [[depths[d], lanes[lane]], [depths[d + 1], lanes[lane]], [depths[d + 1], lanes[lane + 1]], [depths[d], lanes[lane + 1]]];
    mesh.face(corners.map(([x, z]) => point(x, ground(x, z), z)), shade(base, tint));
  }
  for (let x = 2; x <= 95; x += 5) for (const z of [-2.65, 2.65]) {
    mesh.box(point(x, 0.55, z), point(0.13, 1.1, 0.13), "#a99675");
    if (x < 95) [0.4, 0.88].forEach(y => mesh.box(point(x + 2.5, y, z), point(5.05, 0.065, 0.065), "#8e816a"));
  }
  if (theme === "lake") {
    for (let x = 0; x < 90; x += 1.8) mesh.box(point(x, 0.04, 0), point(0.07, 0.06, 4.15), "#665f50");
  }
  for (let index = 0; index < 34; index++) {
    const x = 8 + (index * 23 + levelIndex * 9) % 132;
    const z = (index % 2 ? 1 : -1) * (5.5 + index * 11.7 % 24);
    const treeHeight = (theme === "forest" ? 7 : 4) + index * 1.73 % 5;
    mesh.box(point(x, treeHeight * 0.24, z), point(0.32, treeHeight * 0.5, 0.32), "#6b6250");
    for (let tier = 0; tier < 3; tier++) {
      const y = treeHeight * (0.22 + tier * 0.18), radius = treeHeight * (0.26 - tier * 0.055);
      for (let side = 0; side < 6; side++) {
        const a = side / 6 * TAU, b = (side + 1) / 6 * TAU;
        mesh.face([point(x + Math.cos(a) * radius, y, z + Math.sin(a) * radius), point(x, y + treeHeight * 0.43, z), point(x + Math.cos(b) * radius, y, z + Math.sin(b) * radius)], colors.tree);
      }
    }
    if (theme === "gorge" && index < 12) mesh.ellipsoid(point(x, 0.9, z * 0.7), point(2, 1.4, 1.2), "#80838a");
  }
  for (let index = 0; index < 52; index++) {
    const x = 2 + index * 2.71 % 48, z = (index % 2 ? 1 : -1) * (2.95 + index * 0.63 % 3);
    mesh.face([point(x, 0, z - 0.08), point(x, 0.34, z), point(x, 0, z + 0.08)], index % 7 ? "#8fba8b" : "#ead38b");
  }
  mesh.draw();
  for (let distance = 10; distance <= 90; distance += 10) {
    const p = camera.project(point(distance, 0.25, -2.05));
    if (p.scale * 0.45 < 11) continue;
    const size = Math.min(p.scale * 0.45, 18);
    ctx.font = `600 ${size}px system-ui`; ctx.textAlign = "center";
    ctx.fillStyle = "#ede7cf"; ctx.fillText(`${distance}m`, p.x, p.y);
  }
}

function target(mesh, ctx, camera, state) {
  const t = getTarget(state.level, state.time, state.shots.length);
  const r = t.radius;
  for (const side of [-1, 1]) mesh.tube([point(t.x + 0.35, 0, side * r * 0.85), point(t.x, t.y + r * 0.3, side * r * 0.6)], 0.07, "#b0926b");
  mesh.tube([point(t.x, 0.65, -r * 0.78), point(t.x, 0.65, r * 0.78)], 0.05, "#94744f");
  if (state.level.motionY) {
    const top = state.level.height + state.level.motionY + r + 0.45;
    for (const z of [-r * 1.25, r * 1.25]) mesh.box(point(t.x + 0.2, top / 2, z), point(0.13, top, 0.13), "#877b64");
    mesh.box(point(t.x + 0.2, top, 0), point(0.13, 0.13, r * 2.6), "#ad9875");
    mesh.tube([point(t.x, top, -r * 0.5), point(t.x, t.y + r * 0.8, -r * 0.5)], 0.018, "#d2c7a2");
  }
  disk(mesh, t.x + 0.12, t.y, 0, r * 1.1, "#715c43");
  disk(mesh, t.x - 0.09, t.y, 0, r * 1.09, "#d7b47c");
  for (let ring = 10; ring >= 1; ring--) disk(mesh, t.x - 0.1 - (11 - ring) * 0.001, t.y, 0, r * ring / 10, ring % 2 ? shade(RINGS[Math.ceil(ring / 2) - 1], 0.94) : RINGS[Math.ceil(ring / 2) - 1]);
  state.shots.filter(shot => shot.points).forEach((shot, index) => {
    disk(mesh, t.x - 0.14, t.y + shot.offset, (index % 3 - 1) * 0.035, 0.038, "#263b42", 8);
  });
  mesh.draw();
  const label = camera.project(point(t.x, t.y + r + 0.5, 0));
  ctx.textAlign = "center"; ctx.font = "600 15px system-ui"; ctx.fillStyle = "#eff3db";
  ctx.shadowColor = "#102b37"; ctx.shadowBlur = 5; ctx.fillText(`${t.x.toFixed(state.level.motionX ? 1 : 0)} m`, label.x, label.y); ctx.shadowBlur = 0;
}

function arrow(mesh, tip, pitch, gear) {
  const local = (x, y, z) => point(tip.x + x * Math.cos(pitch) - y * Math.sin(pitch), tip.y + x * Math.sin(pitch) + y * Math.cos(pitch), tip.z + z);
  const crystal = gear.design === "aurora", steel = gear.design === "moonsteel";
  mesh.tube([local(-0.72, 0, 0), local(-0.03, 0, 0)], 0.009, crystal ? "#caffeb" : steel ? "#b6d0dc" : "#caa16a", 4);
  for (let side = 0; side < 3; side++) {
    const angle = side / 3 * TAU;
    mesh.face([local(-0.66, 0, 0), local(-0.73, Math.cos(angle) * 0.065, Math.sin(angle) * 0.065), local(-0.57, Math.cos(angle) * 0.045, Math.sin(angle) * 0.045), local(-0.49, 0, 0)], gear.color);
  }
  for (let side = 0; side < 4; side++) {
    const a = side / 4 * TAU, b = (side + 1) / 4 * TAU, radius = steel || crystal ? 0.035 : 0.023;
    mesh.face([local(0.065, 0, 0), local(-0.05, Math.cos(a) * radius, Math.sin(a) * radius), local(-0.05, Math.cos(b) * radius, Math.sin(b) * radius)], crystal ? gear.color : "#dce9e5");
  }
}

function heldBow(ctx, camera, state, gear) {
  const mesh = sceneMesh(ctx, camera);
  const pitch = state.angle * Math.PI / 180;
  const releaseAge = state.arrow?.age ?? 10;
  const reload = state.impact ? clamp((state.time - state.impact.time) / 0.32, 0, 1) : 1;
  const release = state.arrow ? Math.max(0, 1 - releaseAge / 0.13) : state.phase === "aiming" ? reload * reload * (3 - 2 * reload) : 0;
  const pull = (0.22 + state.power * 0.0037) * release;
  const kick = releaseAge < 0.22 ? Math.sin(releaseAge / 0.22 * Math.PI) * 0.035 : 0;
  const local = (x, y, z = 0) => point(0.36 + x * Math.cos(pitch) - y * Math.sin(pitch), LAUNCH.y + x * Math.sin(pitch) + y * Math.cos(pitch) + kick, z - 0.035);
  let profile;
  if (gear.bowStyle === "crystal") profile = [[-0.18, -0.64], [-0.29, -0.43], [0.07, -0.2], [0, 0], [0.07, 0.2], [-0.29, 0.43], [-0.18, 0.64]];
  else if (gear.bowStyle === "recurve") profile = Array.from({ length: 21 }, (_, i) => {const t = i / 20 * 2 - 1; return [-0.21 * t * t + 0.1 * Math.sin(Math.abs(t) * Math.PI * 2), t * 0.63];});
  else profile = Array.from({ length: 19 }, (_, i) => { const t = i / 18 * 2 - 1; return [0.025 - 0.22 * t * t, t * 0.57]; });
  const skin = gear.skinTone;
  function forearm(shoulder, elbow, wrist) {
    const sleeve = [shoulder, between(shoulder, elbow, 0.5), elbow];
    mesh.tube(sleeve, [0.14, 0.13, 0.12], gear.outfitColor, 24, true, false);
    const centerAt = t => {
      const p = between(elbow, wrist, t);
      p.y += Math.sin(t * Math.PI) * 0.025;
      return p;
    };
    const radii = [0.104, 0.105, 0.099, 0.088, 0.075, 0.061, 0.052, 0.049];
    const radiusAt = t => {
      const index = Math.min(6, Math.floor(t * 7)), fraction = t * 7 - index;
      return radii[index] + (radii[index + 1] - radii[index]) * fraction;
    };
    function section(start, end, color, thickness = 0) {
      const count = Math.max(2, Math.ceil((end - start) * 20));
      const steps = Array.from({ length: count + 1 }, (_, index) => start + (end - start) * index / count);
      mesh.tube(steps.map(centerAt), steps.map(t => radiusAt(t) + thickness), color, 24, true, false);
    }
    // Adjacent skin and clothing surfaces avoid intersecting layers at the wrist.
    section(0, 0.14, shade(gear.outfitColor, 0.85), 0.02);
    section(0.14, 0.18, gear.accentColor, 0.02);
    if (gear.avatarStyle === "knight") {
      section(0.18, 0.43, skin);
      section(0.43, 0.46, "#52616a", 0.02);
      section(0.46, 6 / 7, "#a9bbc4", 0.02);
      section(6 / 7, 1, skin);
    } else if (gear.avatarStyle === "ranger") {
      section(0.18, 4 / 7, skin);
      section(4 / 7, 0.59, "#796049", 0.02);
      section(0.59, 0.615, gear.accentColor, 0.02);
      section(0.615, 0.77, "#796049", 0.02);
      section(0.77, 0.795, gear.accentColor, 0.02);
      section(0.795, 6 / 7, "#796049", 0.02);
      section(6 / 7, 1, skin);
    } else section(0.18, 1, skin);
  }
  const wrist = local(-0.09, -0.125, -0.045);
  forearm(point(-0.89, 0.85, -0.75), point(-0.43, 1.74, -0.34), wrist);
  mesh.tube(profile.map(([x, y]) => local(x, y)), gear.bowStyle === "crystal" ? 0.046 : 0.028, gear.bowColor, gear.bowStyle === "crystal" ? 4 : 7);
  mesh.tube([local(0, -0.095), local(0, 0.095)], 0.045, gear.gripColor, 8);
  for (let y = -0.075; y < 0.09; y += 0.04) mesh.tube([local(0.01, y, -0.04), local(0.015, y + 0.02, 0.04)], 0.005, "#dfd2af", 4);
  mesh.ellipsoid(local(-0.065, -0.015, -0.045), point(0.07, 0.108, 0.055), skin, 20);
  const nail = `#${mix(rgb(skin), [242, 220, 209], 0.35).map(value => value.toString(16).padStart(2, "0")).join("")}`;
  for (let i = 0; i < 4; i++) {
    const y = -0.077 + i * 0.042, radius = i === 0 ? 0.015 : 0.018;
    const finger = [local(-0.085, y, -0.04), local(-0.025, y, 0.042), local(0.04, y - 0.003, 0.047), local(0.052, y - 0.01, -0.008)];
    mesh.tube(finger, [radius, radius, radius * 0.88, radius * 0.72], skin, 10, true);
    mesh.ellipsoid(finger[1], point(0.025, radius * 1.1, 0.021), skin, 10);
    mesh.ellipsoid(local(0.052, y - 0.009, -0.003), point(0.007, 0.011, 0.014), nail, 10);
  }
  const thumb = [local(-0.115, 0.07, -0.04), local(-0.055, 0.06, 0.015), local(0.014, 0.03, 0.061), local(0.03, 0.0, 0.047)];
  mesh.tube(thumb, [0.029, 0.027, 0.024, 0.019], skin, 12, true);
  mesh.ellipsoid(thumb[2], point(0.026, 0.027, 0.027), skin, 12);
  mesh.ellipsoid(local(0.03, 0.012, 0.062), point(0.017, 0.017, 0.005), nail, 10);
  const nock = local(-pull, 0, 0.025);
  const open = 1 - release;
  const hand = point(nock.x - 0.105 - open * 0.08, nock.y - 0.07, nock.z + 0.11 + open * 0.21);
  const rightWrist = point(hand.x - 0.03, hand.y - 0.10, hand.z + 0.025);
  forearm(point(-0.9, 0.92, 1.1), point(-0.59, 1.77, 0.63), rightWrist);
  mesh.ellipsoid(hand, point(0.06, 0.088, 0.039), skin, 20);
  for (let i = 0; i < 3; i++) {
    const y = 0.067 - i * 0.043;
    const start = point(hand.x + 0.015, hand.y + y, hand.z - 0.025);
    const joint = between(point(nock.x - 0.025, nock.y + y - 0.045, nock.z + 0.045), point(hand.x + 0.09, hand.y + y, hand.z - 0.02 + i * 0.025), open);
    const bend = between(point(nock.x + 0.028, nock.y + y - 0.045, nock.z + 0.005), point(hand.x + 0.14, hand.y + y - 0.005, hand.z - 0.03 + i * 0.03), open);
    const tip = between(point(nock.x + 0.015, nock.y + y - 0.074, nock.z + 0.0), point(hand.x + 0.16, hand.y + y - 0.025, hand.z - 0.02 + i * 0.034), open);
    mesh.tube([start, joint, bend, tip], [0.018, 0.018, 0.016, 0.012], skin, 10, true);
    mesh.ellipsoid(joint, point(0.021, 0.02, 0.02), skin, 10);
    mesh.ellipsoid(point(tip.x - 0.004, tip.y + 0.005, tip.z + 0.011), point(0.013, 0.01, 0.004), nail, 10);
  }
  mesh.tube([point(hand.x - 0.025, hand.y - 0.005, hand.z - 0.035), point(hand.x + 0.04, hand.y + 0.025, hand.z - 0.065), point(hand.x + 0.07, hand.y + 0.06, hand.z - 0.055)], [0.024, 0.022, 0.018], skin, 12, true);
  if (state.phase === "aiming" && release > 0.1) arrow(mesh, local(0.72 - pull, 0, 0.025), pitch, gear);
  mesh.draw();
  ctx.save(); ctx.globalAlpha = 0.36;
  for (let i = 0; i < 3; i++) {
    const y = -0.052 + i * 0.042;
    stroke(ctx, [camera.project(local(-0.104, y, -0.005)), camera.project(local(-0.112, y - 0.005, 0.012))], shade(skin, 0.57), 0.7);
  }
  stroke(ctx, [camera.project(local(-0.13, 0.035, -0.045)), camera.project(local(-0.135, 0.014, -0.014)), camera.project(local(-0.12, -0.01, 0.002))], shade(skin, 0.58), 0.8);
  ctx.restore();
  const ends = [profile[0], profile[profile.length - 1]].map(([x, y]) => camera.project(local(x, y)));
  stroke(ctx, [ends[0], camera.project(nock), ends[1]], "#f0e7c9", 1.35);
}

export function createFirstPersonRenderer(ctx, model, getGear, prediction) {
  const background = document.createElement("canvas");
  const hands = document.createElement("canvas");
  let backgroundKey = "";
  let handsKey = "";
  let lastArrow = null;
  let trail = [];
  function draw(width, height, { focus, guide }) {
    const state = model.state, gear = getGear();
    const camera = createRangeCamera(width, height, focus ? 2 : 1);
    const key = `${width}/${height}/${state.level.id}/${focus}`;
    if (key !== backgroundKey) {
      backgroundKey = key;
      background.width = width; background.height = height;
      scenery(background.getContext("2d"), width, height, camera, state.level.theme, state.level.distance);
    }
    ctx.drawImage(background, 0, 0, width, height);
    const wind = getWind(state.level, state.time, state.shots.length);
    const windMesh = sceneMesh(ctx, camera, THEMES[state.level.theme].mist);
    windMesh.box(point(9, 1.65, -1.8), point(0.075, 3.3, 0.075), "#c4b795");
    const flutter = Math.sin(state.time * 5) * Math.min(0.13, Math.abs(wind) * 0.025);
    const length = Math.abs(wind) < 0.15 ? 0.1 : Math.sign(wind) * (0.4 + Math.abs(wind) * 0.12);
    const droop = Math.abs(wind) < 0.15 ? 0.9 : 0.15;
    for (let i = 0; i < 5; i++) {
      const a = i / 5, b = (i + 1) / 5;
      windMesh.face([point(9 + a * length, 3.2 - a * droop + a * flutter, -1.8), point(9 + b * length, 3.2 - b * droop + b * flutter, -1.8), point(9 + b * length, 2.88 - b * droop + b * flutter, -1.8), point(9 + a * length, 2.88 - a * droop + a * flutter, -1.8)], i % 2 ? "#f0ddae" : "#e8a77a");
    }
    windMesh.draw();
    if (Math.abs(wind) > 0.15) for (let index = 0; index < 13; index++) {
      const travel = ((index * 6.17 + wind * state.time * 1.3) % 48 + 48) % 48 + 2;
      const z = (index % 2 ? 1 : -1) * (1.4 + index % 4 * 0.45);
      stroke(ctx, [camera.project(point(travel, 1.6 + index % 3 * 0.55, z)), camera.project(point(travel + Math.sign(wind) * 0.65, 1.64 + index % 3 * 0.55, z))], "rgba(210,242,218,0.25)", 1.4);
    }
    target(sceneMesh(ctx, camera), ctx, camera, state);
    if (guide && state.phase === "aiming") {
      const flight = prediction();
      flight.points.forEach((p, index) => {
        if (index % 3 || p.x < 0.6 || flight.crossing && p.x > flight.crossing.x || p.y < 0) return;
        const projected = camera.project(p);
        if (!projected) return;
        ctx.fillStyle = "rgba(213,255,226,0.67)"; ctx.beginPath(); ctx.arc(projected.x, projected.y, clamp(projected.scale * 0.025, 1.5, 3.5), 0, TAU); ctx.fill();
      });
      if (flight.crossing?.y > 0) {
        const p = camera.project(flight.crossing);
        ctx.strokeStyle = "#c5f0c9"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    const projectile = state.arrow;
    if (projectile !== lastArrow) { lastArrow = projectile; trail = []; }
    if (projectile) {
      if (!trail.length || projectile.age - trail[trail.length - 1].age > 0.025) { trail.push({ x: projectile.x, y: projectile.y, age: projectile.age }); if (trail.length > 18) trail.shift(); }
      stroke(ctx, trail.map(camera.project), "rgba(218,255,230,0.45)", 2);
      const mesh = sceneMesh(ctx, camera);
      arrow(mesh, { x: projectile.x, y: projectile.y, z: 0 }, Math.atan2(projectile.vy, projectile.vx), projectile.gear || gear); mesh.draw();
      const p = camera.project(projectile);
      if (p && p.y < 16) {
        ctx.fillStyle = gear.color; ctx.beginPath(); ctx.moveTo(p.x, 14); ctx.lineTo(p.x - 5, 24); ctx.lineTo(p.x + 5, 24); ctx.fill();
      }
    }
    const hit = state.impact;
    if (hit && state.time - hit.time < 0.8) {
      const p = camera.project(hit), age = (state.time - hit.time) / 0.8;
      if (p) {
        ctx.save(); ctx.globalAlpha = 1 - age; ctx.fillStyle = hit.points ? "#ffe39a" : "#fac2b8"; ctx.font = "700 23px system-ui"; ctx.textAlign = "center"; ctx.fillText(hit.points ? `+${hit.points}` : "Miss", p.x, p.y - 22 - age * 28); ctx.restore();
      }
    }
    const poseTime = state.arrow ? Math.min(state.arrow.age, 0.23) : state.impact && state.phase === "aiming" ? Math.min(state.time - state.impact.time, 0.32) : 0;
    const poseKey = `${width}/${height}/${state.angle}/${state.power}/${state.phase}/${poseTime}/${JSON.stringify(gear)}`;
    if (poseKey !== handsKey) {
      handsKey = poseKey;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      hands.width = Math.ceil(width * ratio); hands.height = Math.ceil(height * ratio);
      const handContext = hands.getContext("2d"); handContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      heldBow(handContext, createRangeCamera(width, height), state, gear);
    }
    ctx.drawImage(hands, 0, 0, width, height);
    const sightY = camera.horizon - Math.tan(state.angle * Math.PI / 180) * camera.focal;
    const y = clamp(sightY, 60, height - 50);
    ctx.save(); ctx.strokeStyle = "rgba(224,245,227,0.65)"; ctx.lineWidth = 1.2;
    [[-13, -5], [5, 13]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(width / 2 + a, y); ctx.lineTo(width / 2 + b, y); ctx.stroke(); });
    stroke(ctx, [{ x: width / 2, y: y - 13 }, { x: width / 2, y: y - 6 }], "rgba(224,245,227,0.65)", 1.2);
    stroke(ctx, [{ x: width / 2, y: y + 6 }, { x: width / 2, y: y + 13 }], "rgba(224,245,227,0.65)", 1.2);
    if (sightY < 60) { ctx.fillStyle = "#d5e8dc"; ctx.font = "11px system-ui"; ctx.textAlign = "center"; ctx.fillText(`Aim ${state.angle.toFixed(1)} degrees up`, width / 2, 43); }
    ctx.restore();
    const vignette = ctx.createRadialGradient(width / 2, height * 0.4, height * 0.2, width / 2, height / 2, width * 0.7);
    vignette.addColorStop(0, "rgba(6,21,29,0)"); vignette.addColorStop(1, "rgba(6,21,29,0.35)"); ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
  }
  return { draw };
}
