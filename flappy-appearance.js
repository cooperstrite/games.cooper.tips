import { drawSpecies, tint } from "./flappy-bird-art.js";
import { characterOptions } from "./arcade/characters.js";
export { tint, BIRD_DESIGNS } from "./flappy-bird-art.js";

export const BIRDS = characterOptions("flappy");
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
  return { bird: option(BIRDS, saved.bird, "sparrow"), pipeStyle: option(PIPES, saved.pipeStyle, "classic"), background: option(BACKGROUNDS, saved.background, "meadow"), hat: option(HATS, saved.hat, "none"), eyewear: option(EYEWEAR, saved.eyewear, "none"), neckwear: option(NECKWEAR, saved.neckwear, "none"), trail: option(TRAILS, saved.trail, "feathers"), view: ["first-person", "first-person-webgl"].includes(saved.view) ? saved.view : "side", guide: saved.guide !== false, sound: saved.sound !== false, colors };
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
  const c = settings.colors;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  const frame = drawSpecies(ctx, settings.bird, c, { flap, time, crashed });
  ctx.save(); ctx.translate(frame.neck[0], frame.neck[1]); ctx.scale(frame.neck[2], frame.neck[2]);
  if (settings.neckwear === "scarf") {
    path(ctx, [[4, 12], [-24, 8], [-44, 15], [-37, 22], [-15, 17], [9, 18]], c.accessory);
    ctx.strokeStyle = tint(c.accessory, 0.3); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-18, 13); ctx.lineTo(-36, 17); ctx.stroke();
  } else if (settings.neckwear === "bowtie") { path(ctx, [[5, 13], [-4, 9], [-4, 21], [5, 17], [14, 22], [14, 9]], c.accessory); ellipse(ctx, 5, 16, 3, 3, tint(c.accessory, -0.18)); }
  else if (settings.neckwear === "bandana") path(ctx, [[-7, 11], [20, 10], [11, 26]], c.accessory);
  else if (settings.neckwear === "medal") { path(ctx, [[-6, 12], [2, 27], [13, 12], [8, 12], [2, 20], [-2, 12]], c.accessory); ellipse(ctx, 2, 26, 6, 7, "#e4bd60"); star(ctx, 2, 26, 3.5, "#fff0b0"); }
  ctx.restore();
  ctx.save(); ctx.translate(frame.hat[0], frame.hat[1]); ctx.scale(frame.hat[2], frame.hat[2]);
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
  ctx.restore();
  if (settings.eyewear !== "none") {
    const monocle = settings.eyewear === "monocle", eyes = monocle ? [frame.eyes[frame.eyes.length - 1]] : frame.eyes;
    ctx.strokeStyle = monocle ? "#dcb96b" : tint(c.accessory, -0.35); ctx.lineWidth = settings.eyewear === "goggles" ? 2.6 : 1.7;
    for (const [ex, ey, radius] of eyes) {
      ctx.beginPath(); ctx.ellipse(ex, ey, radius, radius * 1.05, 0, 0, TAU);
      ctx.fillStyle = settings.eyewear === "shades" ? "#2e4053" : "rgba(160,218,232,0.2)"; ctx.fill(); ctx.stroke();
      if (settings.eyewear === "shades") { ctx.save(); ctx.strokeStyle = "#90b5bf"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ex - radius * 0.5, ey - 2); ctx.lineTo(ex + radius * 0.4, ey - 4); ctx.stroke(); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(ex - radius, ey - 1); ctx.lineTo(ex - radius - 9, ey - 2); ctx.stroke();
    }
    if (eyes.length > 1) { ctx.beginPath(); ctx.moveTo(eyes[0][0] + eyes[0][2], eyes[0][1]); ctx.lineTo(eyes[1][0] - eyes[1][2], eyes[1][1]); ctx.stroke(); }
    if (monocle) { const [ex, ey, radius] = eyes[0]; ctx.strokeStyle = "#dcb96b"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex + radius, ey + 1); ctx.bezierCurveTo(ex + radius + 6, ey + 20, ex - 6, ey + 28, ex - 10, ey + 17); ctx.stroke(); }
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
  const tallOwlHat = settings.bird === "owl" && ["wizard", "party"].includes(settings.hat);
  drawBird(ctx, settings, { x: 183, y: 151, scale: tallOwlHat ? 1.8 : 2, flap: 0.5 + Math.sin(time * 7) * 0.2, time });
}
