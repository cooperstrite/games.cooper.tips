export const BIRDS = { sparrow: "Sunny sparrow", jay: "Blue jay", owl: "Little owl", hummingbird: "Hummingbird", dragon: "Baby dragon", phoenix: "Tiny phoenix" };
export const PIPES = { classic: "Classic pipes", candy: "Candy towers", ruins: "Ancient pillars", crystal: "Crystal gates", gold: "Golden pipes" };
export const BACKGROUNDS = { meadow: "Meadow morning", sunset: "Sunset canyon", forest: "Moonlit forest", islands: "Floating islands", neon: "Neon skyline", aurora: "Aurora skies", volcano: "Volcanic twilight" };
export const HATS = { none: "None", cap: "Explorer cap", crown: "Tiny crown", wizard: "Wizard hat", party: "Party hat", flowers: "Flower crown", aviator: "Aviator helmet", space: "Space helmet" };
export const EYEWEAR = { none: "None", glasses: "Round glasses", shades: "Sunglasses", goggles: "Aviator goggles", monocle: "Golden monocle" };
export const NECKWEAR = { none: "None", scarf: "Flying scarf", bowtie: "Bow tie", bandana: "Bandana", medal: "Champion medal" };
export const TRAILS = { none: "None", feathers: "Feathers", stars: "Stars", bubbles: "Bubbles", fire: "Dragon fire", rainbow: "Rainbow ribbon" };
export const PALETTES = {
  sunshine: { name: "Sunshine", body: "#f5c85e", wing: "#d88c45", belly: "#fff0bf", beak: "#ea8250", pipe: "#72bb82", accessory: "#df7181", trail: "#f9dd81" },
  ocean: { name: "Ocean", body: "#71c9df", wing: "#4d80bf", belly: "#d8f4eb", beak: "#e6bc69", pipe: "#5ca9a5", accessory: "#b49ee1", trail: "#a9e9ec" },
  berry: { name: "Berry", body: "#c59be0", wing: "#8966bc", belly: "#f3d8ed", beak: "#e6bc80", pipe: "#a782c9", accessory: "#e6a0b8", trail: "#dab8ef" },
  ember: { name: "Ember", body: "#d68a68", wing: "#a85c57", belly: "#f5d7a0", beak: "#e9ba75", pipe: "#ac9574", accessory: "#76b8a5", trail: "#f6b25c" },
};
export const COLOR_FIELDS = { body: "Body", wing: "Wings", belly: "Belly", beak: "Beak and horns", pipe: "Pipes", accessory: "Accessories", trail: "Trail" };
export const THEMES = {
  meadow: { sky: ["#8ac9d8", "#e0edcc"], ground: "#7ea77b", far: "#91b4a0", near: "#5e8e79", cloud: "#f7f5dc", dark: false },
  sunset: { sky: ["#b67695", "#f5c79a"], ground: "#b68e74", far: "#b38994", near: "#946f7b", cloud: "#f6d7b6", dark: false },
  forest: { sky: ["#172c48", "#708fa2"], ground: "#365b57", far: "#496877", near: "#294f4b", cloud: "#a5c7ca", dark: true },
  islands: { sky: ["#90b8da", "#e8d8d8"], ground: "#859ea0", far: "#a3b6bd", near: "#6d9393", cloud: "#f4eddf", dark: false },
  neon: { sky: ["#211f42", "#6a648f"], ground: "#444865", far: "#545979", near: "#343a5a", cloud: "#9b9bb8", dark: true },
  aurora: { sky: ["#122b40", "#588f8a"], ground: "#648f89", far: "#597b89", near: "#355b63", cloud: "#c0d8d5", dark: true },
  volcano: { sky: ["#372a46", "#c78471"], ground: "#675e65", far: "#8b6b75", near: "#594b60", cloud: "#dbb0a0", dark: true },
};

export function readFlappySettings(saved = {}) {
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) saved = {};
  const option = (choices, value, fallback) => typeof value === "string" && Object.hasOwn(choices, value) ? value : fallback;
  const colors = Object.fromEntries(Object.keys(COLOR_FIELDS).map(key => [key, typeof saved.colors?.[key] === "string" && /^#[0-9a-f]{6}$/i.test(saved.colors[key]) ? saved.colors[key].toLowerCase() : PALETTES.sunshine[key]]));
  return { bird: option(BIRDS, saved.bird, "sparrow"), pipeStyle: option(PIPES, saved.pipeStyle, "classic"), background: option(BACKGROUNDS, saved.background, "meadow"), hat: option(HATS, saved.hat, "none"), eyewear: option(EYEWEAR, saved.eyewear, "none"), neckwear: option(NECKWEAR, saved.neckwear, "none"), trail: option(TRAILS, saved.trail, "feathers"), view: saved.view === "first-person" ? "first-person" : "side", guide: saved.guide !== false, sound: saved.sound !== false, colors };
}
export function tint(hex, amount) {
  const values = hex.slice(1).match(/../g).map(value => parseInt(value, 16));
  return `#${values.map(value => Math.round(amount < 0 ? value * (1 + amount) : value + (255 - value) * amount).toString(16).padStart(2, "0")).join("")}`;
}
const TAU = Math.PI * 2;
function ellipse(ctx, x, y, rx, ry, color, angle = 0) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, TAU); ctx.fill(); }
function path(ctx, points, color, stroke = null, width = 1) {
  ctx.beginPath(); points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.stroke(); }
}
export function star(ctx, x, y, size, color, rotation = 0) {
  path(ctx, Array.from({ length: 10 }, (_, index) => { const a = index / 10 * TAU - Math.PI / 2 + rotation, r = index % 2 ? size * 0.45 : size; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; }), color);
}

export function drawBird(ctx, settings, { x, y, scale = 1, angle = 0, flap = 0.5, time = 0, crashed = false }) {
  const c = settings.colors, dragon = settings.bird === "dragon", owl = settings.bird === "owl", humming = settings.bird === "hummingbird";
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  const wingAngle = -0.5 + flap * 1.5;
  if (settings.bird === "phoenix") {
    for (let feather = 0; feather < 3; feather++) {
      ctx.beginPath(); ctx.moveTo(-12, 6 + feather * 3); ctx.bezierCurveTo(-37, -2, -58, 30 + Math.sin(time * 4 + feather) * 5, -72 + feather * 9, 15 + feather * 7); ctx.bezierCurveTo(-49, 42, -35, 20, -12, 15); ctx.fillStyle = feather % 2 ? c.wing : c.beak; ctx.fill();
    }
  }
  if (dragon) {
    ctx.strokeStyle = tint(c.body, -0.18); ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-15, 7); ctx.bezierCurveTo(-48, 21, -53, 4, -44, -1); ctx.stroke();
    path(ctx, [[-46, -3], [-57, -8], [-54, 6]], c.beak);
    path(ctx, [[-19, -11], [-23, -24], [-12, -17], [-8, -28], [0, -17]], c.beak);
  } else {
    path(ctx, humming ? [[-19, 6], [-46, 18], [-35, -2]] : [[-19, 4], [-35, -8], [-34, 13]], c.wing, tint(c.wing, -0.18), 1.2);
  }
  const body = ctx.createRadialGradient(-7, -10, 2, 0, 0, 31); body.addColorStop(0, tint(c.body, 0.22)); body.addColorStop(1, tint(c.body, -0.15));
  ellipse(ctx, 0, 0, humming ? 23 : owl ? 27 : 25, owl ? 29 : 23, body);
  ctx.strokeStyle = tint(c.body, -0.25); ctx.lineWidth = 0.8; ctx.stroke();
  const belly = ctx.createRadialGradient(10, 1, 1, 8, 8, 25); belly.addColorStop(0, tint(c.belly, 0.2)); belly.addColorStop(1, tint(c.belly, -0.13));
  ellipse(ctx, 8, 8, owl ? 18 : 16, owl ? 18 : 14, belly, -0.25);
  ctx.strokeStyle = tint(c.body, 0.3); ctx.lineWidth = 1; ctx.lineCap = "round";
  for (let feather = 0; feather < 5; feather++) {
    const fx = -12 + feather % 3 * 8, fy = -13 + Math.floor(feather / 3) * 6;
    ctx.beginPath(); ctx.moveTo(fx - 2, fy); ctx.quadraticCurveTo(fx, fy + 3, fx + 2, fy); ctx.stroke();
  }
  if (settings.bird === "jay") path(ctx, [[-6, -17], [-13, -37], [3, -27], [11, -35], [13, -18]], c.wing);
  if (settings.bird === "phoenix") path(ctx, [[-11, -19], [-12, -39], [-3, -30], [4, -44], [10, -28], [20, -35], [15, -16]], c.beak);
  if (dragon) {
    path(ctx, [[5, -20], [3, -37], [15, -23]], c.beak, tint(c.beak, -0.2), 1);
    path(ctx, [[20, -16], [25, -32], [28, -12]], c.beak, tint(c.beak, -0.2), 1);
    ellipse(ctx, 24, 1, 15, 12, c.body); ellipse(ctx, 31, -3, 2, 1.4, tint(c.body, -0.5));
    ctx.strokeStyle = tint(c.body, -0.4); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(28, 5, 7, 0.2, 1.1); ctx.stroke();
  } else path(ctx, humming ? [[20, -5], [48, -7], [22, 0]] : [[20, -4], [36, 2], [21, 8]], c.beak, tint(c.beak, -0.2), 1);
  if (owl) {
    ellipse(ctx, -1, -8, 12, 13, tint(c.belly, 0.12)); ellipse(ctx, 15, -8, 12, 13, tint(c.belly, 0.12));
    path(ctx, [[-24, -13], [-25, -31], [-12, -22]], c.body); path(ctx, [[12, -22], [25, -30], [25, -12]], c.body);
  }
  const blink = !crashed && time % 5.2 > 5.05;
  const eyes = owl ? [[-1, -8], [15, -8]] : [[dragon ? 16 : 13, -8]];
  eyes.forEach(([ex, ey]) => {
    if (crashed) { ctx.strokeStyle = "#273c43"; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(ex - 4, ey - 4); ctx.lineTo(ex + 4, ey + 4); ctx.moveTo(ex + 4, ey - 4); ctx.lineTo(ex - 4, ey + 4); ctx.stroke(); }
    else if (blink) { ctx.strokeStyle = "#273c43"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - 4, ey); ctx.lineTo(ex + 4, ey); ctx.stroke(); }
    else { ellipse(ctx, ex, ey, owl ? 7 : 7.5, owl ? 9 : 9.5, tint(c.body, -0.35)); ellipse(ctx, ex, ey - 0.5, owl ? 6 : 6.5, owl ? 8 : 8.5, "#fffcf0"); ellipse(ctx, ex + 1.5, ey + 0.8, 3.7, 5, "#527378"); ellipse(ctx, ex + 2, ey + 1, 2.3, 3.7, "#243a44"); ellipse(ctx, ex + 2, ey - 1.5, 1.5, 1.8, "#ffffff"); }
  });
  ellipse(ctx, 16, 6, 4.5, 2.7, "rgba(224,111,110,0.32)");
  if (!dragon) {
    ctx.strokeStyle = tint(c.beak, -0.2); ctx.lineWidth = 3; ctx.lineCap = "round";
    [-4, 7].forEach(fx => { ctx.beginPath(); ctx.moveTo(fx, 20); ctx.lineTo(fx - 1, 26); ctx.lineTo(fx + 6, 26); ctx.stroke(); });
  }
  ctx.save(); ctx.translate(-6, 3); ctx.rotate(wingAngle);
  if (dragon) {
    path(ctx, [[0, 0], [-14, -36], [-37, -25], [-28, -13], [-35, 1], [-19, -4], [-13, 9]], c.wing, tint(c.body, -0.28), 2);
    [[-14, -36], [-37, -25], [-35, 1]].forEach(([wx, wy]) => { ctx.strokeStyle = tint(c.body, -0.1); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(wx, wy); ctx.stroke(); });
  } else {
    const wing = ctx.createLinearGradient(-15, -5, 0, 14); wing.addColorStop(0, tint(c.wing, 0.18)); wing.addColorStop(1, tint(c.wing, -0.15));
    ellipse(ctx, -5, 3, 18, humming ? 7 : 11, wing, -0.3);
    for (let feather = 0; feather < 4; feather++) ellipse(ctx, -16 + feather * 5, 5 + feather * 0.6, 8, humming ? 2 : 3.2, tint(c.wing, feather % 2 ? -0.05 : 0.04), -0.25);
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = tint(c.wing, 0.2); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-18 + i * 5, 0); ctx.quadraticCurveTo(-11 + i * 5, 9, -2 + i * 3, 5); ctx.stroke(); }
  }
  ctx.restore();
  if (settings.neckwear === "scarf") {
    path(ctx, [[4, 12], [-24, 8], [-44, 15], [-37, 22], [-15, 17], [9, 18]], c.accessory);
    ctx.strokeStyle = tint(c.accessory, 0.3); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-18, 13); ctx.lineTo(-36, 17); ctx.stroke();
  } else if (settings.neckwear === "bowtie") { path(ctx, [[5, 13], [-4, 9], [-4, 21], [5, 17], [14, 22], [14, 9]], c.accessory); ellipse(ctx, 5, 16, 3, 3, tint(c.accessory, -0.18)); }
  else if (settings.neckwear === "bandana") path(ctx, [[-7, 11], [20, 10], [11, 26]], c.accessory);
  else if (settings.neckwear === "medal") { path(ctx, [[-6, 12], [2, 27], [13, 12], [8, 12], [2, 20], [-2, 12]], c.accessory); ellipse(ctx, 2, 26, 6, 7, "#e4bd60"); star(ctx, 2, 26, 3.5, "#fff0b0"); }
  if (settings.hat === "cap") {
    ellipse(ctx, 2, -23, 21, 5, tint(c.accessory, -0.2)); ctx.fillStyle = c.accessory; ctx.beginPath(); ctx.arc(0, -22, 15, Math.PI, 0); ctx.fill();
    path(ctx, [[9, -25], [30, -20], [11, -20]], c.accessory); ellipse(ctx, -2, -29, 4, 3, tint(c.accessory, 0.3));
  } else if (settings.hat === "crown") {
    path(ctx, [[-15, -22], [-19, -40], [-7, -32], [1, -45], [9, -32], [20, -41], [17, -22]], c.accessory, tint(c.accessory, -0.2), 1.5);
    [0, 11, -10].forEach(hx => ellipse(ctx, hx, -27, 2.5, 3, c.beak));
  } else if (settings.hat === "wizard" || settings.hat === "party") {
    ellipse(ctx, 0, -23, 22, 4, tint(c.accessory, -0.2)); path(ctx, [[-15, -24], [-6, -61], [15, -24]], c.accessory);
    if (settings.hat === "wizard") { star(ctx, -4, -40, 4, c.belly); star(ctx, 6, -29, 3, c.belly); }
    else { ellipse(ctx, -6, -59, 4, 4, c.belly); path(ctx, [[-11, -40], [4, -35], [8, -29], [-13, -33]], c.belly); }
  } else if (settings.hat === "flowers") {
    ctx.strokeStyle = tint(c.accessory, -0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -22, 22, 6, 0, Math.PI, TAU); ctx.stroke();
    for (let flower = 0; flower < 5; flower++) { const x = -18 + flower * 9, y = -24 - Math.sin(flower / 4 * Math.PI) * 5; for (let petal = 0; petal < 5; petal++) ellipse(ctx, x + Math.cos(petal / 5 * TAU) * 3.3, y + Math.sin(petal / 5 * TAU) * 3.3, 2.5, 2.5, flower % 2 ? c.belly : c.accessory); ellipse(ctx, x, y, 2, 2, c.beak); }
  } else if (settings.hat === "aviator") {
    ctx.fillStyle = c.accessory; ctx.beginPath(); ctx.arc(0, -15, 23, Math.PI, TAU); ctx.fill();
    ellipse(ctx, -17, -10, 9, 15, c.accessory); ellipse(ctx, -17, -8, 5, 10, c.belly); lineStitch(ctx, c.belly);
  } else if (settings.hat === "space") {
    ellipse(ctx, 1, -3, 36, 38, "rgba(200,234,238,0.14)"); ctx.strokeStyle = tint(c.accessory, 0.2); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.72)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(1, -3, 31, Math.PI * 1.13, Math.PI * 1.5); ctx.stroke();
    ellipse(ctx, -2, 28, 27, 5, c.accessory);
  }
  if (settings.eyewear !== "none") {
    ctx.strokeStyle = settings.eyewear === "monocle" ? "#dcb96b" : tint(c.accessory, -0.35); ctx.lineWidth = settings.eyewear === "goggles" ? 3 : 2;
    (settings.eyewear === "monocle" ? [eyes[eyes.length - 1]] : eyes).forEach(([ex, ey]) => {
      ctx.beginPath(); ctx.ellipse(ex, ey, owl ? 9 : 11, 10, 0, 0, TAU);
      ctx.fillStyle = settings.eyewear === "shades" ? "#2e4053" : "rgba(160,218,232,0.23)"; ctx.fill(); ctx.stroke();
      if (settings.eyewear === "shades") { ctx.strokeStyle = "#90b5bf"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ex - 5, ey - 3); ctx.lineTo(ex + 4, ey - 5); ctx.stroke(); ctx.strokeStyle = tint(c.accessory, -0.35); ctx.lineWidth = 2; }
    });
    ctx.beginPath(); ctx.moveTo(-13, -10); ctx.lineTo(eyes[0][0] - 9, eyes[0][1]); ctx.stroke();
    if (settings.eyewear === "monocle") { ctx.strokeStyle = "#dcb96b"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(eyes[eyes.length - 1][0] + 9, -2); ctx.quadraticCurveTo(36, 19, 15, 24); ctx.stroke(); }
  }
  ctx.restore();
}

function lineStitch(ctx, color) { ctx.strokeStyle = color; ctx.lineWidth = 0.8; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(0, -15, 19, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); ctx.setLineDash([]); }

export function drawBirdPreview(canvas, settings, time = 0) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = 360 * ratio; canvas.height = 280 * ratio;
  const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio);
  const theme = THEMES[settings.background];
  const sky = ctx.createLinearGradient(0, 0, 0, 280); sky.addColorStop(0, theme.sky[0]); sky.addColorStop(1, theme.sky[1]); ctx.fillStyle = sky; ctx.fillRect(0, 0, 360, 280);
  ellipse(ctx, 70, 76, 52, 17, theme.cloud); ellipse(ctx, 278, 185, 65, 20, theme.cloud);
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(180, 138, 101, 0, TAU); ctx.stroke();
  const glow = ctx.createRadialGradient(180, 150, 30, 180, 150, 125); glow.addColorStop(0, "rgba(255,250,221,0.28)"); glow.addColorStop(1, "rgba(255,250,221,0)"); ctx.fillStyle = glow; ctx.fillRect(0, 0, 360, 280);
  ellipse(ctx, 180, 240, 61, 9, "rgba(27,60,70,0.13)");
  if (settings.trail === "rainbow") ["#e99b98", "#ebc98b", "#e7e2a2", "#9ac6aa", "#90b7d2", "#bba2ce"].forEach((color, i) => { ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(45, 155 + i * 3); ctx.bezierCurveTo(70, 143 + i * 3, 100, 163 + i * 3, 137, 150 + i * 3); ctx.stroke(); });
  else if (settings.trail !== "none") for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.25 + i * 0.1; const x = 50 + i * 15, y = 153 + Math.sin(i + time) * 12; if (settings.trail === "stars") star(ctx, x, y, 4, settings.colors.trail, i); else if (settings.trail === "bubbles") { ctx.strokeStyle = settings.colors.trail; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.stroke(); } else ellipse(ctx, x, y, settings.trail === "fire" ? 9 : 4, 2, settings.colors.trail); } ctx.globalAlpha = 1;
  drawBird(ctx, settings, { x: 183, y: 151, scale: 2, flap: 0.5 + Math.sin(time * 7) * 0.2, time });
}
