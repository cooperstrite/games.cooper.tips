import {
  ROAD, DIFFICULTIES, ROUTES, CARS, TRAFFIC, LENGTHS,
  normalizeSettings, getPace, getRoadGeometry, getVisibility, createDriveModel,
} from "./neon-drift-engine.js";
import { createDriveAudio } from "./neon-drift-audio.js";

const COLORS = [
  { light: "#ffc879", body: "#d88a43", dark: "#75432e" },
  { light: "#e9eff8", body: "#a1b0c5", dark: "#48556d" },
  { light: "#ff9c98", body: "#c95567", dark: "#672f4d" },
  { light: "#b9b4ef", body: "#7978b8", dark: "#393b69" },
  { light: "#b8e2c7", body: "#6a9f89", dark: "#355f5c" },
];
const STORAGE_KEY = "neondrift-drive-v2";
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatDistance(distance) {
  return distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${Math.round(distance)} m`;
}

export function createNeonDrift(root) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { /* Use defaults. */ }
  const model = createDriveModel(normalizeSettings(saved.settings));
  const state = model.state;
  state.best = Number.isFinite(saved.best) ? Math.max(0, saved.best) : 0;
  const sound = { music: saved.music !== false, effects: saved.effects !== false };
  const audio = createDriveAudio(sound);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let rafId = null;
  let lastFrame = 0;
  let lastHUD = 0;
  let explosion = null;
  let shieldFlash = 0;
  let ejections = [];
  let disposed = false;
  let roadSamples = [];

  const wrapper = element("div", "neondrift");
  const setup = element("details", "neondrift-setup");
  setup.open = true;
  const setupSummary = element("summary", "", "Choose your drive");
  const setupBody = element("div", "neondrift-setup-body");
  const options = element("div", "neondrift-options");

  function selectField(title, choices, value) {
    const label = element("label", "neondrift-field");
    const select = element("select");
    select.setAttribute("aria-label", title);
    Object.entries(choices).forEach(([id, choice]) => {
      const option = element("option", "", choice.name);
      option.value = id;
      select.append(option);
    });
    select.value = value;
    label.append(element("span", "", title), select);
    options.append(label);
    return select;
  }

  const difficultySelect = selectField("Difficulty", DIFFICULTIES, model.settings.difficulty);
  const lengthSelect = selectField("Drive length", LENGTHS, model.settings.length);
  const routeSelect = selectField("Route", ROUTES, model.settings.route);
  const routeNote = element("p", "neondrift-route-note");
  routeNote.id = "neondrift-route-note";
  routeSelect.setAttribute("aria-describedby", routeNote.id);
  const garage = element("fieldset", "neondrift-garage");
  garage.append(element("legend", "", "Choose your car"));
  const carGrid = element("div", "neondrift-car-grid");
  const carInputs = [];
  Object.entries(CARS).forEach(([id, car]) => {
    const label = element("label", "neondrift-car-choice");
    const input = element("input");
    input.type = "radio";
    input.name = "neondrift-car";
    input.value = id;
    input.checked = id === model.settings.car;
    input.setAttribute("aria-label", `${car.name} - ${car.abilityName}`);
    const paint = element("span", "neondrift-car-paint");
    paint.style.setProperty("--paint", car.color.body);
    paint.setAttribute("aria-hidden", "true");
    label.append(input, paint, element("strong", "", car.name), element("span", "neondrift-car-power", car.abilityName));
    carGrid.append(label);
    carInputs.push(input);
  });
  garage.append(carGrid);
  setupBody.append(options, routeNote, garage);
  setup.append(setupSummary, setupBody);

  const top = element("div", "neondrift-top");
  const startButton = element("button", "primary-btn", "Start run");
  startButton.type = "button";
  const status = element("p", "neondrift-status", "Choose a route and a car. The traffic gets tougher as you drive.");
  status.setAttribute("role", "status");
  top.append(startButton, status);
  const soundRow = element("div", "neondrift-audio");
  const musicButton = element("button", "neondrift-sound-toggle");
  const effectsButton = element("button", "neondrift-sound-toggle");
  musicButton.type = effectsButton.type = "button";
  soundRow.append(musicButton, effectsButton);

  const metrics = element("div", "neondrift-metrics");
  const distanceBadge = element("span", "badge neondrift-distance");
  const speedBadge = element("span", "badge neondrift-speed");
  const heatBadge = element("span", "badge neondrift-heat");
  const bestBadge = element("span", "badge neondrift-best");
  metrics.append(distanceBadge, speedBadge, heatBadge, bestBadge);
  const viewport = element("div", "neondrift-viewport");
  const canvas = element("canvas", "neondrift-canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Rear view of your car. Use the steering, boost, and special ability controls to avoid traffic.");
  const routeBanner = element("div", "neondrift-route-banner");
  const routeName = element("strong");
  const condition = element("span");
  routeBanner.append(routeName, condition);
  viewport.append(canvas, routeBanner);
  const progressRow = element("div", "neondrift-progress-row");
  const progress = element("progress", "neondrift-progress");
  progress.setAttribute("aria-label", "Drive progress");
  const progressLabel = element("span");
  progressRow.append(progress, progressLabel);
  const abilityHint = element("p", "neondrift-ability-hint");

  const pad = element("div", "neondrift-pad");
  function control(label, text, extraClass = "") {
    const button = element("button", `neondrift-pad-btn ${extraClass}`, text);
    button.type = "button";
    button.setAttribute("aria-label", label);
    pad.append(button);
    return button;
  }
  const leftButton = control("Move left", "\u2190");
  const boostButton = control("Boost", "Boost", "neondrift-pad-boost");
  const abilityButton = control("Activate special ability", "", "neondrift-pad-ability");
  const abilityName = element("span");
  const abilityTime = element("small");
  abilityButton.append(abilityName, abilityTime);
  const rightButton = control("Move right", "\u2192");
  const hint = element("p", "help-text neondrift-hint", "A / D or arrows to steer. Hold Space to boost. Press E for your car's ability.");
  wrapper.append(setup, top, soundRow, metrics, viewport, progressRow, pad, abilityHint, hint);
  root.append(wrapper);

  const width = 960;
  const height = 540;
  const horizon = height * 0.34;
  const focal = 660;
  const cameraHeight = 2.8;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const route = () => ROUTES[model.settings.route];
  const car = () => CARS[model.settings.car];
  const laneX = (lane) => (lane - (route().lanes - 1) / 2) * ROAD.laneWidth;
  const roadHalf = () => route().lanes * ROAD.laneWidth / 2 + 0.65;

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: model.settings, best: state.best, ...sound })); } catch { /* Storage is optional. */ }
  }

  function project(x, z, elevation = 0) {
    const geometry = getRoadGeometry(model.settings, state.distance, z);
    const scale = focal / z;
    return {
      x: width / 2 + (x + geometry.offset - laneX(state.visualLane) * 0.125) * scale,
      y: horizon + (cameraHeight - geometry.elevation - elevation) * scale,
      scale,
    };
  }

  function polygon(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.closePath();
    ctx.fill();
  }

  function quad(left, right, near, far, color, elevation = 0) {
    polygon([project(left, far, elevation), project(right, far, elevation), project(right, near, elevation), project(left, near, elevation)], color);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.45;
    ctx.stroke();
  }

  function clipAt(depth) {
    const sample = roadSamples[clamp(Math.floor((depth - ROAD.nearDepth) / 2), 0, roadSamples.length - 1)];
    return sample ? sample.clip : height;
  }

  function drawLandscape() {
    const palette = route();
    const sky = ctx.createLinearGradient(0, 0, 0, horizon + 55);
    sky.addColorStop(0, palette.sky[0]);
    sky.addColorStop(0.65, palette.sky[1]);
    sky.addColorStop(1, palette.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const sun = ctx.createRadialGradient(725, 112, 15, 725, 112, 110);
    sun.addColorStop(0, "rgba(255, 218, 171, 0.25)");
    sun.addColorStop(1, "rgba(255, 218, 171, 0)");
    ctx.fillStyle = sun;
    ctx.fillRect(610, 0, 230, 240);
    ctx.fillStyle = palette.weather === "rain" ? "#b9cbdc" : "#ffe0ad";
    ctx.beginPath();
    ctx.arc(725, 112, palette.weather === "rain" ? 17 : 27, 0, Math.PI * 2);
    ctx.fill();
    for (let layer = 0; layer < 3; layer += 1) {
      const ridge = [{ x: 0, y: horizon + 60 }];
      for (let x = 0; x <= width + 30; x += 30) {
        const rugged = palette.landscape === "alpine" ? 38 : palette.landscape === "canyon" ? 30 : 15;
        const y = horizon - 12 - Math.sin(x * 0.012 + layer * 2) * rugged
          - Math.cos(x * 0.025 + layer) * rugged * 0.7 + layer * 17;
        ridge.push({ x, y });
      }
      ridge.push({ x: width + 30, y: horizon + 60 });
      const colors = palette.landscape === "country" ? ["#738a78", "#4d705f", "#355647"]
        : palette.landscape === "canyon" ? ["#ad7c70", "#85584e", "#694c43"]
        : palette.landscape === "alpine" ? ["#b8c4c9", "#7b929d", "#526e7a"] : ["#63556f", "#41445e", "#303b50"];
      polygon(ridge, colors[layer]);
    }
    if (palette.landscape === "city") {
      for (let i = 0; i < 55; i += 1) {
        const x = i * 19 - 10;
        const buildingHeight = 15 + (i * 37) % 48;
        const y = horizon + 12 - buildingHeight;
        ctx.fillStyle = i % 3 ? "#30394f" : "#26314b";
        ctx.fillRect(x, y, 10 + (i * 11) % 14, buildingHeight);
        for (let row = 1; row < buildingHeight / 7; row += 1) {
          ctx.fillStyle = (i + row) % 3 ? "#6b8d9d" : "#c8a187";
          ctx.fillRect(x + 3, y + row * 7, 2, 2);
          if ((i + row) % 4) ctx.fillRect(x + 9, y + row * 7, 2, 2);
        }
      }
    }
    const ground = ctx.createLinearGradient(0, horizon, 0, height);
    ground.addColorStop(0, palette.ground[0]);
    ground.addColorStop(1, palette.ground[1]);
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizon + 20, width, height);
  }

  function drawRoad() {
    roadSamples = [];
    let nearestCrest = height;
    for (let z = ROAD.nearDepth; z < ROAD.maxDepth; z += 2) {
      roadSamples.push({ z, clip: nearestCrest });
      nearestCrest = Math.min(nearestCrest, project(0, z).y);
    }
    const half = roadHalf();
    const edge = route().lanes * ROAD.laneWidth / 2 + 0.12;
    const wet = route().weather === "rain";
    for (let index = roadSamples.length - 1; index >= 0; index -= 1) {
      const sample = roadSamples[index];
      const near = sample.z;
      const far = Math.min(ROAD.maxDepth, near + 2);
      const pNear = project(0, near);
      const pFar = project(0, far);
      if (pFar.y >= sample.clip && pNear.y >= sample.clip) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, Math.max(0, sample.clip));
      ctx.clip();
      const band = Math.floor((state.distance + near) / 6) % 2;
      ctx.fillStyle = route().landscape === "country" ? band ? "#496442" : "#4c6844"
        : route().landscape === "canyon" ? band ? "#865c44" : "#8b6047"
        : route().landscape === "alpine" ? band ? "#607473" : "#647978" : "#152733";
      ctx.fillRect(0, pFar.y, width, Math.max(0, pNear.y - pFar.y) + 1);
      quad(-half - 0.35, half + 0.35, near, far, "#6b6870");
      quad(-half, half, near, far, wet ? band ? "#263c4e" : "#283f52" : band ? "#252f3c" : "#27313e");
      quad(-edge - 0.055, -edge + 0.055, near, far, "#edc67a");
      quad(edge - 0.055, edge + 0.055, near, far, "#d4e0df");
      for (let divider = 1; divider < route().lanes; divider += 1) {
        const x = -route().lanes * ROAD.laneWidth / 2 + divider * ROAD.laneWidth;
        if ((state.distance + near) % 12 < 5) quad(x - 0.065, x + 0.065, near, far, "#d4dfe2");
      }
      for (const side of [-1, 1]) {
        quad(side * (half + 0.4) - 0.065, side * (half + 0.4) + 0.065, near, far, "#88969e", 0.65);
        quad(side * (half + 0.4) - 0.08, side * (half + 0.4) + 0.08, near, far, "#4d6070", 0.5);
      }
      const finish = LENGTHS[model.settings.length].distance - state.distance + ROAD.playerDepth;
      if (Number.isFinite(finish) && near <= finish + 1.3 && far >= finish) {
        const from = Math.max(near, finish);
        const to = Math.min(far, finish + 1.3);
        const cells = route().lanes * 6;
        for (let col = 0; col < cells; col += 1) {
          const x = -route().lanes * ROAD.laneWidth / 2 + col * ROAD.laneWidth / 6;
          quad(x, x + ROAD.laneWidth / 6, from, to, col % 2 ? "#152332" : "#f4eee0");
        }
      }
      ctx.restore();
    }
    const fogTop = project(0, getVisibility(model.settings, state.distance, model.active("focus"))).y;
    const haze = ctx.createLinearGradient(0, Math.min(horizon - 10, fogTop - 30), 0, Math.max(horizon + 90, fogTop + 75));
    haze.addColorStop(0, route().weather === "fog" ? "rgba(186, 204, 207, 0.85)" : "rgba(169, 159, 164, 0.65)");
    haze.addColorStop(1, "rgba(130, 149, 159, 0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon - 10, width, Math.max(110, fogTop - horizon + 100));
  }

  function drawRoadside(z, side, kind) {
    const x = side * (roadHalf() + (kind === "tree" ? 2.4 : kind === "lamp" ? 1.4 : 0.4));
    const base = project(x, z);
    const s = base.scale;
    if (kind === "tree") {
      const top = project(x, z, 5.5);
      ctx.fillStyle = "#4a4439";
      ctx.fillRect(base.x - s * 0.13, top.y, s * 0.26, base.y - top.y);
      polygon([{ x: base.x - s * 1.2, y: base.y - s }, { x: top.x, y: top.y - s * 0.4 },
        { x: base.x + s * 1.2, y: base.y - s }], route().landscape === "alpine" ? "#254b48" : "#294f36");
      polygon([{ x: base.x - s * 0.9, y: base.y - s * 2.3 }, { x: top.x, y: top.y - s * 0.7 },
        { x: base.x + s * 0.9, y: base.y - s * 2.3 }], "#3e6246");
      return;
    }
    const top = project(x, z, kind === "lamp" ? 5.8 : 0.75);
    ctx.strokeStyle = "#657889";
    ctx.lineWidth = Math.max(0.6, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(top.x, top.y);
    if (kind === "lamp") {
      const lamp = project(x - side * 1.2, z, 6);
      ctx.lineTo(lamp.x, lamp.y);
      ctx.stroke();
      const radius = Math.max(2, s * 0.5);
      const glow = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, radius);
      glow.addColorStop(0, "rgba(255, 228, 177, 0.65)");
      glow.addColorStop(1, "rgba(255, 228, 177, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(lamp.x - radius, lamp.y - radius, radius * 2, radius * 2);
      ctx.fillStyle = "#ffe5b3";
      ctx.fillRect(lamp.x - s * 0.2, lamp.y, s * 0.4, Math.max(1, s * 0.04));
      if (route().weather === "rain") {
        ctx.fillStyle = "rgba(255, 215, 147, 0.07)";
        ctx.fillRect(base.x - side * s, base.y, s * 0.1, s * 2);
      }
    } else {
      ctx.stroke();
      ctx.fillStyle = side < 0 ? "#ffc779" : "#d4fbff";
      ctx.fillRect(top.x - s * 0.035, top.y, Math.max(1, s * 0.07), s * 0.12);
    }
  }

  function drawGantry(z) {
    const half = roadHalf() + 0.5;
    const left = project(-half, z);
    const right = project(half, z);
    const top = project(-half, z, 5.9);
    const topRight = project(half, z, 5.9);
    ctx.strokeStyle = "#7b8c99";
    ctx.lineWidth = Math.max(1, left.scale * 0.07);
    ctx.beginPath();
    ctx.moveTo(left.x, left.y); ctx.lineTo(top.x, top.y);
    ctx.lineTo(topRight.x, topRight.y); ctx.lineTo(right.x, right.y); ctx.stroke();
    const sign = project(-3, z, 5.8);
    const s = sign.scale;
    ctx.fillStyle = "#123e43";
    ctx.fillRect(sign.x, sign.y, s * 6, s * 1.2);
    ctx.strokeStyle = "#a3cebd";
    ctx.lineWidth = Math.max(0.5, s * 0.03);
    ctx.strokeRect(sign.x + s * 0.07, sign.y + s * 0.07, s * 5.86, s * 1.06);
    ctx.fillStyle = "#e8f2e7";
    ctx.textAlign = "center";
    ctx.font = `600 ${s * 0.31}px sans-serif`;
    ctx.fillText(route().name.toUpperCase(), sign.x + s * 3, sign.y + s * 0.5);
    ctx.font = `${s * 0.18}px sans-serif`;
    ctx.fillText(model.settings.length === "endless" ? "ENDLESS DRIVE" : `${formatDistance(LENGTHS[model.settings.length].distance - state.distance)} TO FINISH`, sign.x + s * 3, sign.y + s * 0.85);
  }

  function drawCar(lane, z, color, kind, player = false, vehicle = null) {
    const point = project(laneX(lane), z);
    if (vehicle?.flight) {
      point.x += vehicle.flight.x;
      point.y += vehicle.flight.y;
    }
    const bodySpec = TRAFFIC[kind];
    const phased = player && model.active("phase");
    ctx.save();
    ctx.translate(point.x, point.y);
    if (vehicle?.flight) ctx.rotate(vehicle.flight.rotation);
    ctx.scale(point.scale * bodySpec.width / 2, point.scale * bodySpec.height / 1.27);
    if (player) ctx.transform(1, 0, -(state.lane - state.visualLane) * 0.06, 1, 0, 0);
    if (phased) ctx.globalAlpha *= 0.45;
    if (!vehicle?.flight) {
      ctx.fillStyle = "rgba(0, 4, 12, 0.45)";
      ctx.beginPath(); ctx.ellipse(0, 0.015, 1.16, 0.18, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (player) {
      ctx.save(); ctx.scale(1, 0.25);
      const glow = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1.5);
      glow.addColorStop(0, state.boost || model.active("nitro") ? "rgba(88, 215, 255, 0.5)" : "rgba(65, 208, 226, 0.14)");
      glow.addColorStop(1, "rgba(65, 208, 226, 0)");
      ctx.fillStyle = glow; ctx.fillRect(-1.5, -1.5, 3, 3); ctx.restore();
    }
    if (kind === "bike") {
      ctx.fillStyle = "#0b131c";
      ctx.fillRect(-0.24, -0.58, 0.48, 0.57);
      polygon([{ x: -0.75, y: -0.5 }, { x: -0.55, y: -0.97 }, { x: 0.55, y: -0.97 }, { x: 0.75, y: -0.5 }], color.body);
      ctx.fillStyle = "#202b3a"; ctx.fillRect(-0.53, -1.02, 1.06, 0.48);
      ctx.fillStyle = color.light;
      ctx.beginPath(); ctx.ellipse(0, -1.13, 0.4, 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff6672"; ctx.fillRect(-0.3, -0.48, 0.6, 0.09);
      ctx.restore(); return;
    }
    ctx.fillStyle = "#080f19";
    ctx.fillRect(-1.04, -0.59, 0.25, 0.56); ctx.fillRect(0.79, -0.59, 0.25, 0.56);
    const wrecked = player ? state.phase === "crashed" : vehicle?.wrecked;
    if (wrecked) color = { light: "#5b5157", body: "#3c3a44", dark: "#242732" };
    const body = ctx.createLinearGradient(0, -1.3, 0, -0.15);
    body.addColorStop(0, color.light); body.addColorStop(0.45, color.body); body.addColorStop(1, color.dark);
    const boxy = kind === "van" || kind === "truck";
    polygon([{ x: -0.94, y: -0.14 }, { x: -1, y: -0.58 },
      { x: boxy ? -0.88 : -0.8, y: boxy ? -1.25 : -0.87 }, { x: -0.54, y: -1.27 },
      { x: 0.54, y: -1.27 }, { x: boxy ? 0.88 : 0.8, y: boxy ? -1.25 : -0.87 },
      { x: 1, y: -0.58 }, { x: 0.94, y: -0.14 }], body);
    if (boxy) {
      ctx.fillStyle = kind === "truck" ? "#b8bfc7" : "#1d3549";
      ctx.fillRect(-0.77, -1.16, 1.54, kind === "truck" ? 0.78 : 0.43);
      ctx.strokeStyle = color.dark; ctx.lineWidth = 0.035;
      ctx.strokeRect(-0.77, -1.16, 1.54, 0.78);
      ctx.beginPath(); ctx.moveTo(0, -1.15); ctx.lineTo(0, -0.39); ctx.stroke();
      if (kind === "truck") {
        ctx.fillStyle = "#647b8d"; ctx.fillRect(-0.5, -0.96, 1, 0.23);
        ctx.fillStyle = "#eff3f1"; ctx.font = "600 0.13px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("NEON FREIGHT", 0, -0.8);
      }
    } else {
      polygon([{ x: -0.55, y: -1.18 }, { x: 0.55, y: -1.18 }, { x: 0.75, y: -0.81 }, { x: -0.75, y: -0.81 }], "#14263a");
      polygon([{ x: -0.51, y: -1.15 }, { x: 0.51, y: -1.15 }, { x: 0.65, y: -0.9 }, { x: -0.36, y: -0.9 }], "#3b5c74");
      polygon([{ x: -0.47, y: -1.14 }, { x: -0.22, y: -1.14 }, { x: -0.06, y: -0.9 }, { x: -0.32, y: -0.9 }], "rgba(181, 218, 233, 0.24)");
      polygon([{ x: -0.79, y: -0.76 }, { x: 0.79, y: -0.76 }, { x: 0.94, y: -0.57 }, { x: -0.94, y: -0.57 }], color.light);
      if (kind === "suv") {
        ctx.fillStyle = "#253a48"; ctx.fillRect(-0.6, -1.29, 0.08, 0.12); ctx.fillRect(0.52, -1.29, 0.08, 0.12);
      }
      if (kind === "sport" || kind === "rally") {
        ctx.fillStyle = color.dark; ctx.fillRect(-0.92, -0.79, 1.84, 0.06);
      }
      if (kind === "rally") {
        ctx.fillStyle = "#e6f1de"; ctx.fillRect(-0.1, -0.75, 0.2, 0.22);
        ctx.fillStyle = "#244739"; ctx.font = "600 0.15px sans-serif"; ctx.textAlign = "center"; ctx.fillText("7", 0, -0.57);
      }
    }
    ctx.fillStyle = color.dark; ctx.fillRect(-1.04, -0.87, 0.22, 0.08); ctx.fillRect(0.82, -0.87, 0.22, 0.08);
    ctx.fillStyle = "#42232e"; ctx.fillRect(-0.9, -0.55, 1.8, 0.12);
    ctx.fillStyle = wrecked ? "#9a414d" : "#ff6071"; ctx.fillRect(-0.84, -0.54, 0.59, 0.06); ctx.fillRect(0.25, -0.54, 0.59, 0.06);
    ctx.fillStyle = "#172633"; ctx.fillRect(-0.78, -0.27, 1.56, 0.12);
    ctx.fillStyle = "#a2afba"; ctx.fillRect(-0.65, -0.21, 0.16, 0.055); ctx.fillRect(0.49, -0.21, 0.16, 0.055);
    ctx.fillStyle = "#d4e3e5"; ctx.fillRect(-0.18, -0.4, 0.36, 0.1);
    ctx.fillStyle = "#183b49"; ctx.font = "600 0.067px sans-serif"; ctx.textAlign = "center"; ctx.fillText(player ? "DRIFT" : "NEON", 0, -0.325);
    if (vehicle?.indicator && Math.floor(state.time * 5) % 2 === 0) {
      ctx.fillStyle = "#ffbf4d"; ctx.fillRect(vehicle.indicator < 0 ? -0.94 : 0.74, -0.58, 0.2, 0.13);
    }
    if (player && (state.boost || model.active("nitro"))) {
      const length = (model.active("nitro") ? 0.55 : 0.3) + Math.sin(state.distance * 2) * 0.05;
      for (const x of [-0.57, 0.57]) {
        polygon([{ x: x - 0.1, y: -0.17 }, { x: x + 0.1, y: -0.17 }, { x, y: length }], model.active("nitro") ? "#ffb65a" : "#55aaff");
        polygon([{ x: x - 0.045, y: -0.16 }, { x: x + 0.045, y: -0.16 }, { x, y: length * 0.6 }], "#e3ffff");
      }
    }
    ctx.restore();
    if (player && (model.active("shield") || model.active("focus") || phased || shieldFlash > 0)) {
      ctx.save();
      ctx.translate(point.x, point.y - point.scale * 0.6);
      ctx.strokeStyle = model.active("focus") ? "#d5ffb5" : phased ? "#c9a9ff" : "#ffe1a0";
      ctx.globalAlpha = shieldFlash > 0 ? shieldFlash : 0.65;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, point.scale * 1.3, point.scale * 1.05, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawWeather() {
    const weather = route().weather;
    if (weather === "rain") {
      ctx.strokeStyle = "rgba(191, 216, 239, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 75; i += 1) {
        const x = (i * 137 + state.distance * 4) % (width + 60) - 30;
        const y = (i * 71 + state.distance * 11) % height;
        ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 25);
      }
      ctx.stroke();
    } else if (weather === "wind" && Math.abs(state.wind) > 0.04) {
      ctx.strokeStyle = "rgba(242, 204, 153, 0.28)";
      ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < 28; i += 1) {
        const x = (i * 113 + state.distance * 8) % (width + 100) - 50;
        const y = 210 + (i * 61) % 300;
        ctx.moveTo(x, y); ctx.lineTo(x + state.wind * 170, y - 5);
      }
      ctx.stroke();
    }
  }

  function drawExplosion() {
    if (!explosion) return;
    const age = explosion.age;
    const point = explosion.point;
    ctx.save();
    if (age < 0.15 && !reducedMotion) {
      ctx.fillStyle = `rgba(255, 202, 116, ${(1 - age / 0.15) * 0.55})`;
      ctx.fillRect(0, 0, width, height);
    }
    for (const particle of explosion.particles) {
      const t = Math.max(0, age - particle.delay);
      if (t <= 0 || t > particle.life) continue;
      const progress = t / particle.life;
      const x = point.x + particle.vx * t;
      const y = point.y + particle.vy * t + (particle.smoke ? -10 : 100) * t * t;
      const size = particle.size * (particle.smoke ? 1 + t * 2.8 : 1 - progress * 0.6);
      ctx.globalAlpha = (1 - progress) * (particle.smoke ? 0.45 : 1);
      ctx.fillStyle = particle.color;
      if (particle.smoke) ctx.globalCompositeOperation = "source-over";
      else ctx.globalCompositeOperation = "lighter";
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, size), 0, Math.PI * 2); ctx.fill();
    }
    if (age < 0.9) {
      const progress = age / 0.9;
      const radius = 30 + Math.sin(progress * Math.PI * 0.8) * 85;
      const centerY = point.y - 12 - age * 35;
      const fire = ctx.createRadialGradient(point.x, centerY, 3, point.x, centerY, radius);
      fire.addColorStop(0, "rgba(255, 247, 183, 0.98)");
      fire.addColorStop(0.28, "rgba(255, 186, 61, 0.92)");
      fire.addColorStop(0.55, "rgba(255, 91, 24, 0.8)");
      fire.addColorStop(0.8, "rgba(176, 43, 18, 0.38)");
      fire.addColorStop(1, "rgba(146, 34, 16, 0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.pow(1 - progress, 0.45);
      ctx.fillStyle = fire;
      ctx.fillRect(point.x - radius, centerY - radius, radius * 2, radius * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    if (age < 0.65) {
      ctx.globalAlpha = 1 - age / 0.65;
      ctx.strokeStyle = "#ffd28c"; ctx.lineWidth = 5 * (1 - age / 0.65);
      ctx.beginPath(); ctx.ellipse(point.x, point.y, 25 + age * 190, 12 + age * 75, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawScene() {
    ctx.save();
    if (explosion && explosion.age < 0.65 && !reducedMotion) {
      const shake = 8 * (1 - explosion.age / 0.65);
      ctx.translate(Math.sin(explosion.age * 105) * shake, Math.cos(explosion.age * 91) * shake);
    }
    drawLandscape();
    drawRoad();
    const visibility = getVisibility(model.settings, state.distance, model.active("focus"));
    const objects = state.traffic.map((vehicle) => ({ ...vehicle, type: "car" }));
    for (let z = 9 - state.distance % 9; z < ROAD.maxDepth; z += 9) if (z > ROAD.nearDepth) objects.push({ type: "post", z });
    for (let z = 32 - state.distance % 32; z < ROAD.maxDepth; z += 32) {
      if (z > ROAD.nearDepth) objects.push({ type: route().landscape === "city" ? "lamp" : "tree", z });
    }
    const signZ = 180 - state.distance % 180;
    if (signZ < ROAD.maxDepth && signZ > ROAD.nearDepth) objects.push({ type: "sign", z: signZ });
    objects.push({ type: "player", z: ROAD.playerDepth });
    objects.sort((a, b) => b.z - a.z);
    for (const object of objects) {
      if (object.z < ROAD.nearDepth || object.z > ROAD.maxDepth) continue;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, width, Math.max(0, clipAt(object.z))); ctx.clip();
      ctx.globalAlpha = object.type === "player" ? 1 : clamp((visibility - object.z) / 22, 0, 1);
      if (object.type === "car") drawCar(object.visualLane, object.z, COLORS[object.color], object.kind, false, object);
      else if (object.type === "player") drawCar(state.visualLane, ROAD.playerDepth, car().color, car().kind, true);
      else if (object.type === "sign") drawGantry(object.z);
      else for (const side of [-1, 1]) drawRoadside(object.z, side, object.type);
      ctx.restore();
    }
    for (const ejection of ejections) {
      const t = ejection.age;
      const vehicle = ejection.vehicle;
      const flight = { x: ejection.side * (t * 280 + t * t * 130),
        y: -t * 180 + t * t * 125, rotation: ejection.side * t * 4 };
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1.6 - t) * 2);
      drawCar(vehicle.visualLane, ROAD.playerDepth + 1 + t * 5, COLORS[vehicle.color], vehicle.kind, false, { flight });
      ctx.restore();
    }
    drawWeather();
    const vignette = ctx.createRadialGradient(width / 2, height * 0.47, height * 0.3, width / 2, height * 0.47, width * 0.64);
    vignette.addColorStop(0, "rgba(2, 8, 20, 0)");
    vignette.addColorStop(1, state.phase === "crashed" ? "rgba(125, 24, 45, 0.6)" : "rgba(2, 8, 20, 0.55)");
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
    ctx.restore();
    drawExplosion();
  }

  function updateHUD() {
    const running = state.phase === "running";
    const locked = running || Boolean(explosion && explosion.age < 0.65);
    const pace = getPace(model.settings, state.distance);
    const goal = LENGTHS[model.settings.length].distance;
    const traffic = pace.heat < 3 ? "Light" : pace.heat < 6 ? "Busy" : pace.heat < 10 ? "Heavy" : "Extreme";
    distanceBadge.textContent = `Distance: ${formatDistance(state.distance)}`;
    speedBadge.textContent = `Speed: ${running ? Math.round(state.speed * 3.6) : 0} km/h`;
    heatBadge.textContent = `Heat ${pace.tier} - ${traffic}`;
    bestBadge.textContent = `Best: ${formatDistance(state.best)}`;
    progress.hidden = !Number.isFinite(goal);
    progress.max = Number.isFinite(goal) ? goal : 1;
    progress.value = state.distance;
    progressLabel.textContent = Number.isFinite(goal) ? `${formatDistance(state.distance)} / ${formatDistance(goal)}` : "Endless drive - distance is your score";
    routeName.textContent = route().name;
    condition.textContent = route().weather === "wind" && Math.abs(state.wind) > 0.07 ? "CROSSWIND"
      : model.settings.route === "country" ? `BLIND BENDS - ${Math.round(getVisibility(model.settings, state.distance, model.active("focus")))} m VIEW`
      : route().weather === "fog" ? `FOG - ${Math.round(getVisibility(model.settings, state.distance))} m VIEW`
      : route().weather === "rain" ? "WET ROAD - STEER EARLY" : "WATCH FOR MERGING TRAFFIC";
    startButton.textContent = running ? "Restart run" : state.phase === "crashed" ? "Try again" : "Start run";
    startButton.disabled = !running && locked;
    [...options.querySelectorAll("select"), ...carInputs].forEach((input) => { input.disabled = locked; });
    leftButton.disabled = rightButton.disabled = boostButton.disabled = !running;
    boostButton.classList.toggle("is-boosting", state.boost || model.active("nitro"));
    abilityButton.disabled = !running || state.abilityCooldown > 0;
    abilityButton.classList.toggle("is-active", state.abilityRemaining > 0);
    abilityButton.style.setProperty("--charge", `${(1 - state.abilityCooldown / car().recharge) * 100}%`);
    abilityName.textContent = car().abilityName;
    abilityTime.textContent = !running ? "Press Start" : state.abilityRemaining > 0 ? `Active ${state.abilityRemaining.toFixed(1)}s`
      : state.abilityCooldown > 0 ? `${Math.ceil(state.abilityCooldown)}s recharge` : "Ready - E";
    abilityButton.setAttribute("aria-label", `Activate ${car().abilityName}`);
    abilityHint.textContent = `${car().name}: ${car().description}`;
    musicButton.textContent = `Music: ${sound.music ? "On" : "Off"}`;
    effectsButton.textContent = `Sound FX: ${sound.effects ? "On" : "Off"}`;
    musicButton.setAttribute("aria-pressed", String(sound.music));
    effectsButton.setAttribute("aria-pressed", String(sound.effects));
  }

  function applySetup() {
    if (state.phase === "running") return;
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    rafId = null;
    explosion = null;
    shieldFlash = 0;
    ejections = [];
    model.configure({ difficulty: difficultySelect.value, length: lengthSelect.value, route: routeSelect.value,
      car: carInputs.find((input) => input.checked).value });
    routeNote.textContent = `${route().subtitle} ${route().twist}`;
    setupSummary.textContent = `Drive setup - ${DIFFICULTIES[model.settings.difficulty].name} / ${LENGTHS[model.settings.length].name}`;
    status.textContent = "Ready when you are. Speed and traffic increase with distance.";
    updateHUD(); drawScene(); persist();
  }

  function makeExplosion(event) {
    const playerPoint = project(laneX(event.lane), ROAD.playerDepth, 0.5);
    explosion = { age: 0, point: playerPoint, particles: [] };
    for (let i = 0; i < 90; i += 1) {
      const smoke = i < 24;
      const angle = Math.random() * Math.PI * 2;
      const velocity = smoke ? 10 + Math.random() * 45 : 50 + Math.random() * 210;
      explosion.particles.push({
        vx: Math.cos(angle) * velocity, vy: smoke ? -25 - Math.random() * 50 : Math.sin(angle) * velocity - 80,
        size: smoke ? 12 + Math.random() * 12 : 2 + Math.random() * 8,
        life: smoke ? 2.2 + Math.random() * 0.5 : 0.4 + Math.random() * 1,
        delay: smoke ? Math.random() * 0.2 : 0, smoke,
        color: smoke ? i % 2 ? "#4b4750" : "#292e3a" : ["#ff8b32", "#ffd179", "#fff2b0", "#ff4e32"][i % 4],
      });
    }
  }

  function startRun() {
    if (startButton.disabled) return;
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    model.start();
    explosion = null; shieldFlash = 0; ejections = [];
    setup.open = false;
    status.textContent = `${route().twist} Press E for ${car().abilityName}.`;
    audio.start(model.settings.route);
    lastFrame = performance.now(); lastHUD = 0;
    updateHUD(); drawScene();
    rafId = window.requestAnimationFrame(tick);
  }

  function tick(now) {
    rafId = null;
    if (disposed) return;
    const delta = Math.min((now - lastFrame) / 1000, 0.12);
    lastFrame = now;
    const events = model.step(delta);
    for (const event of events) {
      if (event.type === "crash") {
        makeExplosion(event); audio.stop(); audio.effect("crash"); persist();
        status.textContent = `Crash! ${formatDistance(state.distance)} driven. Change your setup or try again.`;
      } else if (event.type === "finish") {
        audio.stop(); audio.effect("finish"); persist();
        status.textContent = `Finish reached in ${state.time.toFixed(1)}s! Try a harder difficulty or a new route.`;
      } else if (event.type === "shield") {
        shieldFlash = 1;
        ejections.push({ age: 0, vehicle: event.vehicle, side: state.visualLane < (route().lanes - 1) / 2 ? -1 : 1 });
        audio.effect("shield"); status.textContent = "Shield impact! The other car is flung clear. Keep driving!";
      } else if (event.type === "heat" && state.abilityRemaining <= 0) {
        status.textContent = `Heat ${event.tier}: the road is getting faster and busier. ${route().twist}`;
      }
    }
    for (const vehicle of state.traffic) {
      if (!vehicle.passed && vehicle.z < ROAD.playerDepth && state.phase === "running") {
        vehicle.passed = true; audio.effect("pass", Math.sign(vehicle.visualLane - state.visualLane) * 0.7);
      }
    }
    if (explosion) {
      explosion.age += delta;
      if (explosion.age > 2.9) explosion = null;
    }
    shieldFlash = Math.max(0, shieldFlash - delta * 2);
    ejections.forEach((ejection) => { ejection.age += delta; });
    ejections = ejections.filter((ejection) => ejection.age < 1.6);
    audio.update(state.speed, state.boost || model.active("nitro"));
    drawScene();
    if (now - lastHUD > 80 || events.length) { updateHUD(); lastHUD = now; }
    if (state.phase === "running" || explosion || ejections.length || shieldFlash > 0) rafId = window.requestAnimationFrame(tick);
    else updateHUD();
  }

  function setBoost(value) {
    const previous = state.boost;
    model.setBoost(value);
    if (!previous && state.boost) audio.effect("boost");
    boostButton.classList.toggle("is-boosting", state.boost);
  }

  function ability() {
    if (!model.activateAbility()) return;
    audio.effect(car().ability);
    status.textContent = `${car().abilityName} active! ${car().description}`;
    updateHUD();
  }

  const onKeyDown = (event) => {
    if (event.target instanceof Element && event.target.closest("select, input, summary")) return;
    const key = event.key.toLowerCase();
    if (!["a", "d", "arrowleft", "arrowright", " ", "w", "arrowup", "e", "enter"].includes(key)) return;
    event.preventDefault();
    if (event.repeat) return;
    if (key === "a" || key === "arrowleft") model.changeLane(-1);
    else if (key === "d" || key === "arrowright") model.changeLane(1);
    else if (key === " " || key === "w" || key === "arrowup") setBoost(true);
    else if (key === "e") ability();
    else if (key === "enter" && state.phase !== "running") startRun();
  };
  const onKeyUp = (event) => {
    if ([" ", "w", "arrowup"].includes(event.key.toLowerCase())) setBoost(false);
  };
  const onBlur = () => setBoost(false);
  const onVisibility = () => {
    if (document.hidden) { setBoost(false); audio.stop(); }
    else if (state.phase === "running") audio.start(model.settings.route);
  };
  startButton.addEventListener("click", startRun);
  [difficultySelect, routeSelect, lengthSelect, ...carInputs].forEach((input) => input.addEventListener("change", applySetup));
  leftButton.addEventListener("pointerdown", (event) => { event.preventDefault(); model.changeLane(-1); });
  rightButton.addEventListener("pointerdown", (event) => { event.preventDefault(); model.changeLane(1); });
  // Keyboard-generated clicks have no pointerdown event.
  leftButton.addEventListener("click", (event) => { if (event.detail === 0) model.changeLane(-1); });
  rightButton.addEventListener("click", (event) => { if (event.detail === 0) model.changeLane(1); });
  boostButton.addEventListener("pointerdown", (event) => { event.preventDefault(); boostButton.setPointerCapture(event.pointerId); setBoost(true); });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) boostButton.addEventListener(event, () => setBoost(false));
  abilityButton.addEventListener("click", ability);
  musicButton.addEventListener("click", () => { sound.music = !sound.music; audio.setMusic(sound.music); updateHUD(); persist(); });
  effectsButton.addEventListener("click", () => { sound.effects = !sound.effects; audio.setEffects(sound.effects); updateHUD(); persist(); });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibility);
  applySetup();

  return () => {
    disposed = true;
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    audio.dispose();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onVisibility);
    wrapper.remove();
  };
}
