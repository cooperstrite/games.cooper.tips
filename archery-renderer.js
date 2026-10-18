import { LAUNCH, getTarget, getWind, velocityFor, predictFlight, clamp } from "./archery-engine.js";

const TAU = Math.PI * 2;
const THEMES = {
  meadow: ["#0b203b", "#42647a", "#2d5c54", "#193d3a"],
  forest: ["#131c39", "#4d526f", "#284a48", "#183733"],
  gorge: ["#1c233d", "#796983", "#444b62", "#293d46"],
  lake: ["#10253e", "#46768a", "#275963", "#1b424b"],
  aurora: ["#091d32", "#295c67", "#24504d", "#133836"],
};
const RING_COLORS = ["#f6cf5a", "#ed6572", "#529eca", "#293a4c", "#ecede3"];
const positiveMod = (value, max) => ((value % max) + max) % max;

function line(ctx, points, color, width = 2) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function arrowArt(ctx, x, y, angle, gear, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  const crystal = gear.design === "aurora";
  const steel = gear.design === "moonsteel";
  if (crystal) { ctx.shadowColor = gear.color; ctx.shadowBlur = 13; }
  line(ctx, [[-55, 0], [-3, 0]], steel ? "#b6d0dc" : crystal ? "#d1fff0" : "#caa16a", 3);
  line(ctx, [[-48, -0.8], [-6, -0.8]], "#fff4cf", 0.7);
  ctx.fillStyle = gear.color;
  ctx.beginPath();
  ctx.moveTo(-43, -1);
  ctx.lineTo(-54, -9);
  ctx.lineTo(-59, -8);
  ctx.lineTo(-53, 0);
  ctx.lineTo(-59, 8);
  ctx.lineTo(-54, 9);
  ctx.lineTo(-43, 1);
  ctx.closePath();
  ctx.fill();
  line(ctx, [[-55, -6], [-47, -1], [-55, 6]], "rgba(255,255,255,0.5)", 0.8);
  ctx.fillStyle = crystal ? gear.color : steel ? "#e8f1f3" : "#c0d6d8";
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(steel ? -9 : -4, steel ? -7 : -4);
  ctx.lineTo(crystal ? -10 : -2, 0);
  ctx.lineTo(steel ? -9 : -4, steel ? 7 : 4);
  ctx.closePath();
  ctx.fill();
  line(ctx, [[7, 0], [-5, 0]], "rgba(255,255,255,0.8)", 0.8);
  if (steel) line(ctx, [[-26, -1], [-30, 1], [-34, -1]], "#6a97b6", 1.2);
  ctx.restore();
}

function targetFace(ctx, x, y, radius, squash = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(squash, 1);
  const wood = ctx.createLinearGradient(-radius, -radius, radius, radius);
  wood.addColorStop(0, "#e8c38a");
  wood.addColorStop(0.5, "#a9764b");
  wood.addColorStop(1, "#72583f");
  ctx.fillStyle = wood;
  ctx.beginPath(); ctx.arc(0, 0, radius + 6, 0, TAU); ctx.fill();
  for (let ring = 10; ring >= 1; ring--) {
    ctx.fillStyle = RING_COLORS[Math.ceil(ring / 2) - 1];
    ctx.beginPath(); ctx.arc(0, 0, radius * ring / 10, 0, TAU); ctx.fill();
    ctx.strokeStyle = ring % 2 ? "rgba(10,25,35,0.22)" : "rgba(255,255,255,0.28)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  const light = ctx.createLinearGradient(-radius, -radius, radius, radius);
  light.addColorStop(0, "rgba(255,255,255,0.2)");
  light.addColorStop(0.6, "rgba(255,255,255,0)");
  light.addColorStop(1, "rgba(7,20,27,0.16)");
  ctx.fillStyle = light;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.fill();
  line(ctx, [[-3, 0], [3, 0]], "#574c28", 1);
  line(ctx, [[0, -3], [0, 3]], "#574c28", 1);
  ctx.restore();
}

export function createArcheryRenderer(canvas, faceCanvas, model, getGear) {
  const ctx = canvas.getContext("2d");
  const face = faceCanvas.getContext("2d");
  let width = 1100;
  let height = 590;
  let windTravel = 0;
  let previousTime = 0;
  let guideCache = null;
  let guideKey = "";
  let guideShown = true;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width < 600 ? 760 : 1100;
    height = width * rect.height / rect.width;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    faceCanvas.width = Math.round(180 * dpr);
    faceCanvas.height = Math.round(180 * dpr);
    face.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function geometry() {
    const state = model.state;
    const ground = height * 0.82;
    const origin = width * 0.15;
    const sx = (width * 0.69) / (state.level.distance + state.level.motionX + 3);
    const sy = height / 14;
    return { ground, origin, sx, sy, project: (x, y) => ({ x: origin + x * sx, y: ground - y * sy }) };
  }
  function prediction() {
    const state = model.state;
    const key = `${state.level.id}/${state.angle}/${state.power}/${state.shots.length}/${Math.round(state.time * 12)}`;
    if (key !== guideKey) {
      guideKey = key;
      guideCache = predictFlight(state.level, state.angle, state.power, state.time, state.shots.length);
    }
    return guideCache;
  }
  function scenery(g) {
    const { level } = model.state;
    const time = reducedMotion ? 0 : model.state.time;
    const colors = THEMES[level.theme];
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, colors[0]); sky.addColorStop(0.65, colors[1]); sky.addColorStop(1, "#759891");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 65; i++) {
      const x = positiveMod(i * 137.6 + 49, width);
      const y = positiveMod(i * 73.3, height * 0.4);
      ctx.fillStyle = `rgba(222,243,255,${0.22 + Math.sin(time * 0.5 + i) * 0.12})`;
      ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 1.5 : 0.8, 0, TAU); ctx.fill();
    }
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let band = 0; band < 4; band++) {
      const hue = band % 2 ? "138,147,238" : "79,229,185";
      ctx.strokeStyle = `rgba(${hue},${level.theme === "aurora" ? 0.16 : 0.06})`;
      ctx.lineWidth = height * (0.075 - band * 0.012);
      ctx.beginPath();
      ctx.moveTo(-60, height * (0.1 + band * 0.04));
      ctx.bezierCurveTo(width * 0.27, height * (0.35 + Math.sin(time * 0.16) * 0.025), width * 0.56, -height * 0.12, width + 60, height * (0.18 + band * 0.025));
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "#e9e5ce";
    ctx.beginPath(); ctx.arc(width * 0.78, height * 0.17, 22, 0, TAU); ctx.fill();
    ctx.fillStyle = colors[0];
    ctx.beginPath(); ctx.arc(width * 0.79, height * 0.155, 21, 0, TAU); ctx.fill();
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = ["#33465f", "#2d4b5b", colors[2]][layer];
      ctx.beginPath(); ctx.moveTo(0, height);
      for (let x = -60; x < width + 80; x += 90) {
        const y = height * (0.5 + layer * 0.08) + Math.sin(x * 0.012 + layer * 3) * height * 0.09;
        ctx.lineTo(x, y);
        ctx.lineTo(x + 45, y - height * (0.07 - layer * 0.014));
      }
      ctx.lineTo(width, height); ctx.closePath(); ctx.fill();
    }
    if (level.theme === "lake") {
      const water = ctx.createLinearGradient(0, height * 0.64, 0, g.ground + 15);
      water.addColorStop(0, "#508f9b"); water.addColorStop(1, "#244d62");
      ctx.fillStyle = water; ctx.fillRect(width * 0.27, height * 0.67, width, height * 0.16);
      for (let i = 0; i < 15; i++) line(ctx, [[width * 0.3 + i * 42, height * 0.72 + i % 4 * 12], [width * 0.34 + i * 42, height * 0.72 + i % 4 * 12]], "rgba(188,224,219,0.18)", 1);
    }
    for (let i = 0; i < 15; i++) {
      const x = i * width / 14 + Math.sin(i * 3) * 20;
      const y = g.ground - 20 + Math.sin(i * 2) * 14;
      const treeHeight = 45 + positiveMod(i * 37, 70);
      ctx.fillStyle = i % 2 ? "#24463f" : "#203e3c";
      ctx.beginPath(); ctx.moveTo(x, y - treeHeight); ctx.lineTo(x - treeHeight * 0.3, y); ctx.lineTo(x + treeHeight * 0.3, y); ctx.closePath(); ctx.fill();
      line(ctx, [[x, y - 7], [x, y + 14]], "#304438", 5);
    }
    const grass = ctx.createLinearGradient(0, g.ground - 20, 0, height);
    grass.addColorStop(0, colors[2]); grass.addColorStop(1, colors[3]);
    ctx.fillStyle = grass;
    ctx.beginPath(); ctx.moveTo(0, g.ground - 10); ctx.quadraticCurveTo(width * 0.45, g.ground + 15, width, g.ground - 5); ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(166,158,118,0.18)";
    ctx.beginPath(); ctx.moveTo(g.origin - 20, g.ground + 2); ctx.lineTo(width * 0.85, g.ground + 5); ctx.lineTo(width * 0.95, height); ctx.lineTo(g.origin - 85, height); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 55; i++) {
      const x = positiveMod(i * 91.7, width);
      const y = g.ground + 15 + positiveMod(i * 17.3, height - g.ground - 20);
      line(ctx, [[x - 4, y], [x - 2, y - 6], [x, y], [x + 4, y - 7]], "rgba(149,184,127,0.27)", 1.3);
      if (i % 7 === 0) { ctx.fillStyle = "#d7cfa1"; ctx.beginPath(); ctx.arc(x + 4, y - 7, 1.8, 0, TAU); ctx.fill(); }
    }
    for (let distance = 10; distance < level.distance + level.motionX; distance += 10) {
      const marker = g.project(distance, 0);
      line(ctx, [[marker.x, g.ground + 5], [marker.x, g.ground + 23]], "#a8a48a", 2);
      ctx.font = "11px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#d8e0cb"; ctx.fillText(`${distance}m`, marker.x, g.ground + 37);
    }
  }
  function target(g) {
    const state = model.state;
    const position = getTarget(state.level, state.time, state.shots.length);
    const point = g.project(position.x, position.y);
    const radius = position.radius * g.sy;
    ctx.fillStyle = "rgba(3,18,23,0.3)";
    ctx.beginPath(); ctx.ellipse(point.x, g.ground + 7, radius * 0.8, 10, 0, 0, TAU); ctx.fill();
    if (state.level.motionY) {
      const top = g.project(position.x, state.level.height + state.level.motionY + position.radius + 0.4);
      line(ctx, [[point.x - radius * 0.9, g.ground], [point.x - radius * 0.9, top.y], [point.x + radius * 0.9, top.y], [point.x + radius * 0.9, g.ground]], "#756752", 5);
      line(ctx, [[point.x - radius * 0.55, top.y], [point.x - radius * 0.55, point.y]], "#c9bc91", 1.4);
    }
    line(ctx, [[point.x - 17, point.y + radius * 0.4], [point.x - radius * 0.65, g.ground], [point.x - radius * 0.55, g.ground]], "#987958", 8);
    line(ctx, [[point.x + 10, point.y + radius * 0.4], [point.x + radius * 0.65, g.ground]], "#b59770", 7);
    line(ctx, [[point.x - radius * 0.5, g.ground - 14], [point.x + radius * 0.5, g.ground - 14]], "#735d49", 5);
    ctx.fillStyle = "#554736";
    ctx.beginPath(); ctx.ellipse(point.x + 5, point.y + 3, radius * 0.71, radius + 7, 0, 0, TAU); ctx.fill();
    targetFace(ctx, point.x, point.y, radius, 0.69);
    const gear = getGear();
    state.shots.filter(shot => shot.points > 0).forEach((shot, index) => {
      arrowArt(ctx, point.x + (index % 3 - 1) * 3, point.y - shot.offset * g.sy, -0.1 + index * 0.015, shot.gear || gear, 0.7);
    });
    ctx.textAlign = "center"; ctx.font = "600 15px system-ui"; ctx.fillStyle = "#e8f0df";
    ctx.fillText(`${position.x.toFixed(state.level.motionX ? 1 : 0)} m`, point.x, Math.max(26, point.y - radius - 22));
    const impact = state.impact;
    if (impact && state.time - impact.time < 0.8) {
      const age = (state.time - impact.time) / 0.8;
      const impactY = point.y - impact.offset * g.sy;
      ctx.save(); ctx.globalAlpha = 1 - age;
      for (let i = 0; i < 10; i++) {
        const angle = i * TAU / 10;
        const length = 9 + age * 30;
        line(ctx, [[point.x + Math.cos(angle) * length, impactY + Math.sin(angle) * length], [point.x + Math.cos(angle) * (length + 5), impactY + Math.sin(angle) * (length + 5)]], impact.points ? "#f6dc87" : "#ed8990", 2);
      }
      ctx.restore();
    }
  }
  function wind(g) {
    const state = model.state;
    const force = getWind(state.level, state.time, state.shots.length);
    const dt = state.time >= previousTime ? state.time - previousTime : 0;
    if (state.time < previousTime) windTravel = 0;
    previousTime = state.time;
    windTravel += force * dt * 24;
    const strength = Math.min(1, Math.abs(force) / 6);
    if (Math.abs(force) > 0.15) {
      ctx.save(); ctx.globalAlpha = 0.1 + strength * 0.28;
      for (let i = 0; i < 16; i++) {
        const x = positiveMod(i * 113 + windTravel, width + 100) - 50;
        const y = height * 0.23 + positiveMod(i * 59, height * 0.47);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 18, y - 5, x + 33 + strength * 28, y);
        ctx.strokeStyle = "#c9f4e5"; ctx.lineWidth = 1.6; ctx.stroke();
        if (i % 3 === 0) {
          ctx.fillStyle = "#c3ca88"; ctx.beginPath(); ctx.ellipse(x, y + 7, 5, 2, state.time + i, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    }
    const x = width * 0.43;
    const y = g.ground - height * 0.26;
    line(ctx, [[x, y - 10], [x, g.ground]], "#b4a789", 4);
    const direction = force < 0 ? -1 : 1;
    const length = Math.abs(force) < 0.15 ? 14 : 25 + strength * 42;
    const droop = Math.abs(force) < 0.15 ? 25 : 8 - strength * 5;
    const flutter = Math.sin(state.time * (5 + strength * 5)) * (2 + strength * 3);
    ctx.save(); ctx.translate(x, y); ctx.scale(direction, 1);
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(length * 0.4, -7 + flutter, length, droop - 4 + flutter); ctx.lineTo(length, droop + 4 + flutter); ctx.quadraticCurveTo(length * 0.4, 9 + flutter, 0, 10); ctx.closePath();
    ctx.fillStyle = "#edb47c"; ctx.fill();
    for (let i = 1; i < 4; i++) line(ctx, [[length * i / 4, -8 + droop * i / 4 + flutter * i / 4], [length * i / 4, 8 + droop * i / 4 + flutter * i / 4]], "#f4e6c2", 6 - i);
    ctx.strokeStyle = "#d1d7bf"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 3, 10, 0, 0, TAU); ctx.stroke(); ctx.restore();
  }
  function archer(g) {
    const state = model.state;
    const gear = getGear();
    const s = height / 590;
    const bow = g.project(LAUNCH.x, LAUNCH.y);
    const bodyX = bow.x - 49 * s;
    const ground = g.ground;
    const velocity = velocityFor(state.angle, state.power);
    const angle = -Math.atan2(velocity.y * g.sy, velocity.x * g.sx);
    const release = state.arrow ? Math.max(0, 1 - state.arrow.age / 0.16) : state.impact && state.time - state.impact.time < 0.15 ? 0 : 1;
    ctx.fillStyle = "rgba(3,17,25,0.38)"; ctx.beginPath(); ctx.ellipse(bodyX, ground + 5, 46 * s, 11 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#6b6551"; ctx.fillRect(bodyX - 52 * s, ground - 3 * s, 102 * s, 9 * s);
    line(ctx, [[bodyX - 10 * s, ground - 51 * s], [bodyX - 19 * s, ground - 15 * s], [bodyX - 28 * s, ground - 4 * s]], "#384c4c", 13 * s);
    line(ctx, [[bodyX + 8 * s, ground - 50 * s], [bodyX + 15 * s, ground - 24 * s], [bodyX + 25 * s, ground - 5 * s]], "#465f5a", 13 * s);
    line(ctx, [[bodyX - 27 * s, ground - 5 * s], [bodyX - 12 * s, ground - 5 * s]], "#2b3839", 9 * s);
    line(ctx, [[bodyX + 21 * s, ground - 5 * s], [bodyX + 35 * s, ground - 5 * s]], "#2b3839", 9 * s);
    ctx.fillStyle = "#224e4d";
    ctx.beginPath(); ctx.moveTo(bodyX - 13 * s, bow.y - 22 * s); ctx.quadraticCurveTo(bodyX - 28 * s, bow.y + 22 * s, bodyX - 31 * s, ground - 41 * s); ctx.lineTo(bodyX + 13 * s, ground - 37 * s); ctx.lineTo(bodyX + 15 * s, bow.y + 6 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#40756a"; ctx.beginPath(); ctx.moveTo(bodyX - 10 * s, bow.y - 1 * s); ctx.lineTo(bodyX + 13 * s, bow.y + 1 * s); ctx.lineTo(bodyX + 16 * s, ground - 43 * s); ctx.lineTo(bodyX - 15 * s, ground - 43 * s); ctx.closePath(); ctx.fill();
    line(ctx, [[bodyX - 13 * s, ground - 51 * s], [bodyX + 16 * s, ground - 51 * s]], "#a47f52", 6 * s);
    line(ctx, [[bodyX - 12 * s, bow.y - 3 * s], [bodyX + 12 * s, ground - 52 * s]], "#bc9e6d", 4 * s);
    ctx.fillStyle = "#dfae88"; ctx.beginPath(); ctx.ellipse(bodyX + 2 * s, bow.y - 24 * s, 13 * s, 17 * s, -0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = "#233f40"; ctx.beginPath(); ctx.moveTo(bodyX - 15 * s, bow.y - 16 * s); ctx.quadraticCurveTo(bodyX - 20 * s, bow.y - 47 * s, bodyX + 5 * s, bow.y - 45 * s); ctx.quadraticCurveTo(bodyX + 19 * s, bow.y - 40 * s, bodyX + 18 * s, bow.y - 27 * s); ctx.lineTo(bodyX + 5 * s, bow.y - 32 * s); ctx.lineTo(bodyX - 4 * s, bow.y - 14 * s); ctx.closePath(); ctx.fill();
    line(ctx, [[bodyX - 10 * s, bow.y - 36 * s], [bodyX + 8 * s, bow.y - 40 * s]], "#58968a", 2 * s);
    ctx.fillStyle = "#293f43"; ctx.beginPath(); ctx.arc(bodyX + 10 * s, bow.y - 26 * s, 1.5 * s, 0, TAU); ctx.fill();
    line(ctx, [[bodyX + 2 * s, bow.y + 7 * s], [bodyX + 22 * s, bow.y + 9 * s], [bow.x - 3 * s, bow.y]], "#689886", 10 * s);
    line(ctx, [[bodyX + 21 * s, bow.y + 9 * s], [bow.x - 3 * s, bow.y]], "#e0b18c", 6 * s);
    const pull = (9 + state.power * 0.19) * release * s;
    const hand = { x: bow.x - Math.cos(angle) * pull, y: bow.y - Math.sin(angle) * pull };
    line(ctx, [[bodyX - 5 * s, bow.y + 6 * s], [bodyX - 21 * s, bow.y + 19 * s], [hand.x, hand.y]], "#5e8b7b", 9 * s);
    line(ctx, [[bodyX - 21 * s, bow.y + 19 * s], [hand.x, hand.y]], "#d8a680", 5 * s);
    ctx.save(); ctx.translate(bow.x, bow.y); ctx.rotate(angle);
    ctx.strokeStyle = "#d4b47b"; ctx.lineWidth = 4 * s; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-5 * s, -40 * s); ctx.quadraticCurveTo(23 * s, 0, -5 * s, 40 * s); ctx.stroke();
    line(ctx, [[-5 * s, -40 * s], [-pull, 0], [-5 * s, 40 * s]], "#e4dcc0", 1 * s);
    line(ctx, [[7 * s, -7 * s], [7 * s, 7 * s]], "#87633f", 5 * s);
    if (state.phase === "aiming") arrowArt(ctx, 7 * s, 0, 0, gear, s * 0.8);
    ctx.restore();
    for (let i = 0; i < Math.min(4, state.arrowsLeft); i++) line(ctx, [[bodyX - 20 * s + i * 3 * s, bow.y + 17 * s], [bodyX - 29 * s + i * 3 * s, bow.y - 13 * s]], gear.color, 2 * s);
  }
  function drawGuide(g) {
    const state = model.state;
    if (!guideShown || state.phase !== "aiming") return;
    const flight = prediction();
    ctx.save();
    flight.points.forEach((point, index) => {
      if (index % 3 || point.y < 0) return;
      const p = g.project(point.x, point.y);
      ctx.fillStyle = `rgba(202,247,221,${0.8 - index / flight.points.length * 0.5})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, TAU); ctx.fill();
    });
    if (flight.crossing?.y > 0) {
      const p = g.project(flight.crossing.x, flight.crossing.y);
      ctx.strokeStyle = "rgba(213,255,229,0.8)"; ctx.lineWidth = 1.6; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  function drawFace() {
    const state = model.state;
    face.clearRect(0, 0, 180, 180);
    targetFace(face, 90, 90, 73);
    state.shots.filter(shot => shot.points).forEach(shot => {
      const y = 90 - shot.offset / state.level.radius * 73;
      face.fillStyle = shot.number === state.shots.length ? "#d9fff2" : "#375252";
      face.strokeStyle = "#172b34"; face.lineWidth = 1;
      face.beginPath(); face.arc(90, y, 3.7, 0, TAU); face.fill(); face.stroke();
    });
  }
  function draw() {
    const g = geometry();
    ctx.clearRect(0, 0, width, height);
    scenery(g); wind(g); target(g); drawGuide(g); archer(g);
    const arrow = model.state.arrow;
    if (arrow) {
      const point = g.project(arrow.x, arrow.y);
      const angle = Math.atan2(-arrow.vy * g.sy, arrow.vx * g.sx);
      line(ctx, [[point.x - Math.cos(angle) * 65, point.y - Math.sin(angle) * 65], [point.x, point.y]], "rgba(219,255,235,0.2)", 3);
      arrowArt(ctx, point.x, point.y, angle, arrow.gear || getGear(), height / 640);
      if (point.y < 12) {
        const markerX = clamp(point.x, 65, width - 65);
        ctx.fillStyle = (arrow.gear || getGear()).color;
        ctx.beginPath(); ctx.moveTo(markerX, 12); ctx.lineTo(markerX - 7, 23); ctx.lineTo(markerX + 7, 23); ctx.closePath(); ctx.fill();
        ctx.font = "600 13px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#d8eee3";
        ctx.fillText(`${arrow.y.toFixed(0)} m high`, markerX, 40);
      }
    }
    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.45, height * 0.3, width * 0.5, height * 0.45, width * 0.7);
    vignette.addColorStop(0, "rgba(3,15,26,0)"); vignette.addColorStop(1, "rgba(3,15,26,0.28)"); ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
    drawFace();
  }
  resize();
  return {
    draw, resize, prediction,
    showGuide(value) { guideShown = value; },
    aimAt(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const g = geometry();
      const x = (clientX - rect.left) / rect.width * width;
      const y = (clientY - rect.top) / rect.height * height;
      const worldX = (x - g.origin) / g.sx;
      const worldY = (g.ground - y) / g.sy;
      return clamp(Math.atan2(worldY - LAUNCH.y, Math.max(0.5, worldX)) * 180 / Math.PI, 2, 65);
    },
  };
}
