const TAU = Math.PI * 2;
export const BIRD_DESIGNS = {
  sparrow: { detail: "A fluffy garden bird with a chestnut cap, soft cheek patches, and little scalloped feathers.", colors: { body: "#b68a5c", wing: "#79543d", belly: "#f4dfb7", beak: "#dba052" } },
  jay: { detail: "A sleek crested flyer with a black collar, white wing bars, and a long striped tail.", colors: { body: "#629cc8", wing: "#356899", belly: "#e8e6d9", beak: "#455763" } },
  owl: { detail: "A round, forward-facing owl with huge facial discs, amber eyes, and silent fringed wings.", colors: { body: "#9d7864", wing: "#725849", belly: "#e6cda2", beak: "#d2a052" } },
  hummingbird: { detail: "A tiny hovering jewel with a ruby throat, needle beak, forked tail, and rapid, translucent wingbeats.", colors: { body: "#58ab8b", wing: "#39877f", belly: "#cce8c2", beak: "#aa5873" } },
  dragon: { detail: "A little scaled reptile with a long curling tail, a toothy snout, horns, and articulated membrane wings.", colors: { body: "#76a48b", wing: "#b5786d", belly: "#e4cf9a", beak: "#d6ad68" } },
  phoenix: { detail: "A radiant firebird with a swept flame crown, ember wings, and flowing, glowing tail plumes.", colors: { body: "#d87d50", wing: "#a94445", belly: "#ffd899", beak: "#f3bd65" } },
};
export function tint(hex, amount) {
  return `#${hex.slice(1).match(/../g).map(value => { const channel = parseInt(value, 16); return Math.round(amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount).toString(16).padStart(2, "0"); }).join("")}`;
}
function oval(ctx, x, y, rx, ry, color, rotation = 0) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, TAU); ctx.fill(); }
function shape(ctx, points, color, edge = null, width = 1) { ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); finish(ctx, color, edge, width); }
function finish(ctx, color, edge = null, width = 1) { ctx.fillStyle = color; ctx.fill(); if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.stroke(); } }
function stroke(ctx, points, color, width = 1) { ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); }
function sheen(ctx, color, x = 0, y = 0, size = 40) { const g = ctx.createRadialGradient(x - 9, y - 15, 1, x, y, size); g.addColorStop(0, tint(color, 0.25)); g.addColorStop(0.6, color); g.addColorStop(1, tint(color, -0.25)); return g; }
function feather(ctx, x, y, tx, ty, width, color) { const dx = tx - x, dy = ty - y, length = Math.hypot(dx, dy), nx = -dy / length * width, ny = dx / length * width; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + dx * 0.25 + nx, y + dy * 0.25 + ny, tx + nx * 0.5, ty + ny * 0.5, tx, ty); ctx.bezierCurveTo(tx - nx * 0.4, ty - ny * 0.4, x + dx * 0.3 - nx, y + dy * 0.3 - ny, x, y); finish(ctx, color); stroke(ctx, [[x, y], [x + dx * 0.76, y + dy * 0.76]], tint(color, 0.18), 0.7); }
function eye(ctx, x, y, radius, pose, iris = "#766349", slit = false) {
  if (pose.crashed) { stroke(ctx, [[x - radius * 0.55, y - radius * 0.55], [x + radius * 0.55, y + radius * 0.55]], "#293d43", 2); stroke(ctx, [[x + radius * 0.55, y - radius * 0.55], [x - radius * 0.55, y + radius * 0.55]], "#293d43", 2); return; }
  if (pose.time % 5.2 > 5.03) { stroke(ctx, [[x - radius, y], [x, y + 1], [x + radius, y]], "#293d43", 1.8); return; }
  oval(ctx, x, y, radius + 1, radius * 1.12 + 1, "#34484b"); oval(ctx, x, y - 0.4, radius, radius * 1.12, "#fff9e9"); oval(ctx, x + radius * 0.2, y + 0.5, radius * 0.63, radius * 0.82, iris); oval(ctx, x + radius * 0.3, y + 0.7, radius * (slit ? 0.15 : 0.35), radius * 0.65, "#20333d"); oval(ctx, x + radius * 0.36, y - radius * 0.4, radius * 0.22, radius * 0.25, "#ffffff");
}
function feet(ctx, c, pairs, y) { for (const x of pairs) { stroke(ctx, [[x, y], [x - 1, y + 6], [x + 5, y + 6]], tint(c.beak, -0.2), 2.6); stroke(ctx, [[x - 1, y + 5], [x - 4, y + 7]], tint(c.beak, -0.2), 1.5); } }

function sparrow(ctx, c, p) {
  for (let i = 0; i < 4; i++) feather(ctx, -15, 5, -41 + i * 2, -7 + i * 7, 5, tint(c.wing, i * 0.05));
  ctx.beginPath(); ctx.moveTo(-23, 10); ctx.bezierCurveTo(-32, -10, -15, -27, 4, -23); ctx.bezierCurveTo(24, -28, 34, -10, 28, 8); ctx.bezierCurveTo(27, 28, -4, 31, -19, 18); ctx.quadraticCurveTo(-24, 18, -23, 10); finish(ctx, sheen(ctx, c.body), tint(c.body, -0.3));
  oval(ctx, 10, 10, 18, 16, sheen(ctx, c.belly, 10, 10, 27), -0.2); oval(ctx, 15, -5, 13, 14, tint(c.belly, 0.07));
  ctx.beginPath(); ctx.moveTo(-10, -19); ctx.bezierCurveTo(8, -34, 31, -25, 29, -9); ctx.quadraticCurveTo(12, -17, -10, -19); finish(ctx, tint(c.body, -0.28));
  shape(ctx, [[26, -6], [41, 0], [28, 6]], sheen(ctx, c.beak), tint(c.beak, -0.3)); eye(ctx, 17, -9, 6.8, p);
  ctx.save(); ctx.translate(-7, 4); ctx.rotate(-0.5 + p.flap * 1.1);
  for (let i = 0; i < 5; i++) feather(ctx, 4, -4, -24 + i * 5, 12 + Math.sin(i) * 4, 6, tint(c.wing, i * 0.03 - 0.05));
  oval(ctx, -5, -2, 13, 8, sheen(ctx, c.wing, -5, -2, 22), -0.2); ctx.restore();
  for (let i = 0; i < 7; i++) { const x = 7 + i % 3 * 5, y = 13 + Math.floor(i / 3) * 4; stroke(ctx, [[x - 1.5, y], [x, y + 2], [x + 1.5, y]], tint(c.belly, -0.13), 0.8); }
  oval(ctx, 24, 6, 3.5, 2, "rgba(219,134,122,0.3)"); feet(ctx, c, [-2, 12], 23);
  return { eyes: [[17, -9, 9]], hat: [5, -2, 0.95], neck: [0, 0, 1] };
}

function jay(ctx, c, p) {
  for (let i = 0; i < 3; i++) { feather(ctx, -13, 8, -64 + i * 3, 25 + i * 4, 5, tint(c.wing, i * 0.08 - 0.1)); stroke(ctx, [[-51, 23 + i * 4], [-46, 26 + i * 4]], "#ebe9dd", 2); }
  oval(ctx, -1, 6, 29, 17, sheen(ctx, c.body), -0.2); oval(ctx, 9, 13, 22, 11, c.belly, -0.3); oval(ctx, 20, -12, 15, 18, sheen(ctx, c.body, 20, -12, 29));
  ctx.beginPath(); ctx.moveTo(6, -22); ctx.bezierCurveTo(-4, -31, -1, -46, 5, -48); ctx.quadraticCurveTo(3, -36, 19, -33); ctx.lineTo(29, -27); ctx.quadraticCurveTo(13, -29, 6, -22); finish(ctx, c.wing, tint(c.wing, -0.25));
  shape(ctx, [[9, -7], [23, 1], [29, -5], [25, 11], [13, 12], [4, 1]], "#344952");
  oval(ctx, 24, -4, 8, 9, "#f4f0dd", -0.4); shape(ctx, [[32, -15], [53, -10], [33, -6]], tint(c.beak, -0.2), "#344952", 0.8); eye(ctx, 24, -17, 5.1, p, "#466b81");
  ctx.save(); ctx.translate(-8, 1); ctx.rotate(-0.65 + p.flap * 1.15);
  for (let i = 0; i < 6; i++) { feather(ctx, 7, 1, -41 + i * 4, -26 + i * 8, 6, tint(c.wing, i * 0.035)); feather(ctx, -25 + i * 3, -14 + i * 5, -41 + i * 4, -26 + i * 8, 3.6, "#344b57"); }
  stroke(ctx, [[-26, -12], [-14, -6], [-5, 4]], "#e9ecdf", 3.5); stroke(ctx, [[-31, -7], [-18, 2], [-9, 10]], "#dce6dd", 2); ctx.restore(); feet(ctx, c, [-2, 12], 20);
  return { eyes: [[24, -17, 7.5]], hat: [18, -8, 0.75], neck: [10, -12, 0.85] };
}

function owl(ctx, c, p) {
  for (const side of [-1, 1]) { ctx.save(); ctx.scale(side, 1); ctx.beginPath(); ctx.moveTo(19, -7); ctx.quadraticCurveTo(42, -4 - p.flap * 14, 44, 20 - p.flap * 8); ctx.quadraticCurveTo(30, 30, 20, 19); finish(ctx, sheen(ctx, c.wing), tint(c.wing, -0.25)); for (let i = 0; i < 4; i++) feather(ctx, 24, 2, 29 + i * 4, 24 - p.flap * 5 - i * 2, 3, tint(c.wing, i * 0.07)); ctx.restore(); }
  ctx.beginPath(); ctx.moveTo(-27, -12); ctx.bezierCurveTo(-37, 3, -26, 38, 0, 38); ctx.bezierCurveTo(26, 38, 37, 3, 27, -12); ctx.quadraticCurveTo(0, -40, -27, -12); finish(ctx, sheen(ctx, c.body, 0, 0, 45), tint(c.body, -0.3));
  oval(ctx, 0, 16, 22, 19, sheen(ctx, c.belly, 0, 10, 35)); shape(ctx, [[-25, -15], [-31, -42], [-9, -27]], c.wing); shape(ctx, [[25, -15], [31, -42], [9, -27]], c.wing);
  for (const x of [-12, 12]) { oval(ctx, x, -10, 16, 19, tint(c.wing, -0.08)); oval(ctx, x, -9, 14, 17, tint(c.belly, 0.15)); eye(ctx, x, -10, 9.8, p, c.beak); }
  shape(ctx, [[-5, -2], [5, -2], [0, 10]], c.beak, tint(c.beak, -0.3));
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4 - row % 2; col++) { const x = -14 + col * 9 + row % 2 * 4, y = 11 + row * 5; stroke(ctx, [[x - 2, y], [x, y + 3], [x + 2, y]], tint(c.body, -0.1), 1.3); }
  for (const x of [-11, 11]) for (let toe = -1; toe <= 1; toe++) stroke(ctx, [[x, 33], [x + toe * 4, 39], [x + toe * 4 + 2, 39]], c.beak, 2);
  return { eyes: [[-12, -10, 12], [12, -10, 12]], hat: [0, -10, 1.1], neck: [-5, 2, 1] };
}

function hummingbird(ctx, c, p) {
  feather(ctx, -12, 10, -54, 29, 4, tint(c.wing, -0.15)); feather(ctx, -12, 12, -43, 43, 4, tint(c.wing, 0.06));
  const beat = p.crashed ? 0 : Math.sin(p.time * 51) * 10;
  for (let ghost = 2; ghost >= 0; ghost--) { ctx.save(); ctx.globalAlpha = ghost ? 0.14 : 0.8; ctx.translate(-1, -2); ctx.rotate(beat * 0.025 + ghost * 0.22); feather(ctx, 0, 0, -25, -59 + ghost * 7, 8, tint(c.wing, 0.1 + ghost * 0.1)); feather(ctx, 0, 0, -43, -35 + ghost * 4, 5, tint(c.wing, 0.16)); ctx.restore(); }
  ctx.beginPath(); ctx.moveTo(-25, 9); ctx.quadraticCurveTo(-5, -10, 12, -13); ctx.bezierCurveTo(24, -26, 36, -13, 29, -3); ctx.quadraticCurveTo(11, 19, -17, 19); ctx.quadraticCurveTo(-29, 17, -25, 9); finish(ctx, sheen(ctx, c.body, 0, 0, 32), tint(c.body, -0.28));
  ctx.beginPath(); ctx.moveTo(-14, 14); ctx.quadraticCurveTo(5, 17, 18, -3); ctx.quadraticCurveTo(23, -1, 22, 7); ctx.quadraticCurveTo(2, 24, -14, 14); finish(ctx, tint(c.belly, 0.08));
  const throat = ctx.createLinearGradient(13, -2, 21, 11); throat.addColorStop(0, tint(c.beak, 0.15)); throat.addColorStop(0.5, c.beak); throat.addColorStop(1, tint(c.beak, -0.28));
  ctx.beginPath(); ctx.moveTo(14, -4); ctx.quadraticCurveTo(28, -7, 26, 3); ctx.lineTo(13, 14); ctx.quadraticCurveTo(18, 6, 14, -4); finish(ctx, throat);
  shape(ctx, [[28, -13], [63, -16], [30, -9]], tint(c.beak, -0.35), "#345b5b", 0.7); stroke(ctx, [[32, -12], [57, -14]], tint(c.beak, 0.45), 0.65); eye(ctx, 20, -13, 4.6, p, "#446f68");
  for (let i = 0; i < 8; i++) { const x = -15 + i % 4 * 6, y = 2 + Math.floor(i / 4) * 5; stroke(ctx, [[x - 2, y], [x, y + 1.5], [x + 2, y - 1]], tint(c.body, i % 2 ? 0.25 : -0.1), 0.8); }
  stroke(ctx, [[7, 16], [12, 19], [16, 17]], tint(c.beak, -0.25), 1.5);
  return { eyes: [[20, -13, 6]], hat: [19, -7, 0.58], neck: [10, -11, 0.6] };
}

function dragon(ctx, c, p) {
  ctx.beginPath(); ctx.moveTo(-15, 8); ctx.bezierCurveTo(-43, 37, -81, 22, -64, -8); ctx.bezierCurveTo(-70, 13, -46, 17, -20, -1); ctx.closePath(); finish(ctx, sheen(ctx, c.body), tint(c.body, -0.3));
  shape(ctx, [[-66, -6], [-76, -12], [-72, 4]], c.beak); for (let i = 0; i < 5; i++) shape(ctx, [[-53 + i * 11, 16 - i * 6], [-54 + i * 11, 5 - i * 6], [-45 + i * 11, 12 - i * 6]], c.beak);
  ctx.save(); ctx.globalAlpha = 0.65; ctx.translate(2, -5); ctx.rotate(-0.5 - p.flap * 0.4); shape(ctx, [[0, 0], [11, -42], [34, -30], [21, -8], [16, 9]], tint(c.wing, -0.12)); ctx.restore();
  ctx.beginPath(); ctx.moveTo(-23, 10); ctx.bezierCurveTo(-28, -10, -8, -26, 10, -16); ctx.quadraticCurveTo(16, -24, 18, -35); ctx.bezierCurveTo(21, -48, 42, -43, 42, -25); ctx.lineTo(46, -17); ctx.bezierCurveTo(60, -13, 58, 1, 43, 3); ctx.quadraticCurveTo(32, 2, 26, 12); ctx.bezierCurveTo(14, 31, -13, 29, -23, 10); finish(ctx, sheen(ctx, c.body, 5, -8, 48), tint(c.body, -0.3), 1.2);
  ctx.beginPath(); ctx.moveTo(36, -9); ctx.quadraticCurveTo(38, 16, 10, 24); ctx.quadraticCurveTo(-1, 26, -3, 18); ctx.quadraticCurveTo(21, 17, 24, -7); finish(ctx, c.belly);
  for (let i = 0; i < 5; i++) { const y = -4 + i * 5; stroke(ctx, [[27 - i * 2, y], [34 - i * 3, y + 2]], tint(c.belly, -0.2), 1); }
  shape(ctx, [[20, -35], [18, -58], [30, -41]], c.beak, tint(c.beak, -0.25)); shape(ctx, [[35, -37], [44, -56], [43, -29]], c.beak, tint(c.beak, -0.25));
  eye(ctx, 33, -27, 5.6, p, c.beak, true); oval(ctx, 49, -15, 2, 1.5, tint(c.body, -0.45));
  ctx.beginPath(); ctx.moveTo(37, -6); ctx.quadraticCurveTo(48, -1, 53, -7); ctx.strokeStyle = tint(c.body, -0.45); ctx.lineWidth = 1.2; ctx.stroke(); shape(ctx, [[42, -4], [46, 1], [47, -3]], "#fff2d4");
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) { const x = -16 + col * 7 + row % 2 * 2, y = -5 + row * 7; stroke(ctx, [[x - 2, y], [x, y + 2], [x + 2, y]], tint(c.body, row % 2 ? 0.18 : -0.18), 0.9); }
  ctx.save(); ctx.translate(-5, -5); ctx.rotate(-0.55 + p.flap * 0.85);
  ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(-9, -51); ctx.quadraticCurveTo(-31, -49, -52, -33); ctx.quadraticCurveTo(-35, -28, -43, -12); ctx.quadraticCurveTo(-26, -19, -28, 3); ctx.quadraticCurveTo(-10, -7, 0, 9); finish(ctx, sheen(ctx, c.wing, -18, -20, 43), tint(c.body, -0.3), 1.4);
  for (const tip of [[-9, -51], [-52, -33], [-43, -12], [-28, 3]]) stroke(ctx, [[0, 9], [-9, -13], tip], tint(c.body, -0.15), 1.8);
  oval(ctx, -9, -50, 2.3, 3, c.beak); ctx.restore();
  for (const x of [-12, 13]) { oval(ctx, x, 22, 7, 6, c.body); for (let claw = 0; claw < 3; claw++) shape(ctx, [[x + claw * 3 - 3, 25], [x + claw * 3, 31], [x + claw * 3 + 1, 24]], c.beak); }
  return { eyes: [[33, -27, 8]], hat: [31, -18, 0.76], neck: [18, -15, 0.8] };
}

function phoenix(ctx, c, p) {
  if (!p.crashed) { const glow = ctx.createRadialGradient(-10, 0, 8, -10, 0, 66); glow.addColorStop(0, `${c.trail}50`); glow.addColorStop(1, `${c.trail}00`); ctx.fillStyle = glow; ctx.fillRect(-76, -68, 135, 135); }
  for (let i = 4; i >= 0; i--) { const sway = Math.sin(p.time * 3.5 + i) * 7; ctx.beginPath(); ctx.moveTo(-11, 7 + i); ctx.bezierCurveTo(-37, 12 - i * 4, -51, 40 + i * 2, -78 + i * 6, 17 + sway + i * 4); ctx.bezierCurveTo(-56, 64 - i * 4, -30, 30 + i * 2, -8, 17); finish(ctx, i % 2 ? c.wing : sheen(ctx, c.beak, -45, 25, 40)); }
  ctx.beginPath(); ctx.moveTo(-22, 12); ctx.bezierCurveTo(-28, -8, -4, -26, 9, -20); ctx.quadraticCurveTo(9, -43, 28, -39); ctx.quadraticCurveTo(43, -35, 35, -17); ctx.quadraticCurveTo(18, 22, -6, 23); ctx.quadraticCurveTo(-20, 24, -22, 12); finish(ctx, sheen(ctx, c.body, 4, -8, 42), tint(c.body, -0.25));
  ctx.beginPath(); ctx.moveTo(7, -14); ctx.quadraticCurveTo(24, -20, 25, -7); ctx.quadraticCurveTo(10, 22, -4, 21); ctx.quadraticCurveTo(1, 5, 7, -14); finish(ctx, sheen(ctx, c.belly, 10, 0, 30));
  ctx.beginPath(); ctx.moveTo(15, -32); ctx.quadraticCurveTo(-1, -48, 4, -59); ctx.quadraticCurveTo(14, -46, 20, -45); ctx.lineTo(26, -65); ctx.quadraticCurveTo(37, -48, 32, -35); ctx.lineTo(46, -50); ctx.quadraticCurveTo(43, -30, 29, -27); finish(ctx, sheen(ctx, c.beak, 20, -44, 35));
  ctx.beginPath(); ctx.moveTo(35, -26); ctx.quadraticCurveTo(55, -23, 44, -6); ctx.quadraticCurveTo(43, -18, 34, -16); finish(ctx, c.beak, tint(c.beak, -0.2)); eye(ctx, 27, -28, 4.6, p, c.beak);
  ctx.save(); ctx.translate(-7, -3); ctx.rotate(-0.7 + p.flap * 0.95);
  for (let i = 5; i >= 0; i--) { const x = -56 + i * 7, y = -47 + i * 9; feather(ctx, 4, 9, x, y, 8, tint(c.wing, i * 0.045)); feather(ctx, x * 0.7, y * 0.7, x, y, 4.5, i % 2 ? c.beak : c.trail); }
  ctx.restore();
  for (let i = 0; i < 6; i++) shape(ctx, [[6 + i % 2 * 7, -6 + i * 4], [10 + i % 2 * 7, -2 + i * 4], [6 + i % 2 * 7, 2 + i * 4], [3 + i % 2 * 7, -2 + i * 4]], tint(c.belly, i % 2 ? -0.12 : 0.12));
  feet(ctx, c, [-4, 11], 20);
  if (!p.crashed) for (let i = 0; i < 7; i++) { const life = (p.time * 0.55 + i / 7) % 1; ctx.globalAlpha = (1 - life) * 0.8; oval(ctx, -25 - life * 48, -6 + Math.sin(i * 3 + p.time) * 22 - life * 18, 1.3 + i % 2, 2, c.trail); } ctx.globalAlpha = 1;
  return { eyes: [[27, -28, 7]], hat: [23, -15, 0.68], neck: [12, -14, 0.75] };
}

const SPECIES = { sparrow, jay, owl, hummingbird, dragon, phoenix };
export function drawSpecies(ctx, bird, colors, pose) { return (SPECIES[bird] || sparrow)(ctx, colors, pose); }

// Foreground anatomy is painted with curved surfaces over the perspective world.
export function drawBirdCockpit(ctx, width, height, settings, pose) {
  const c = settings.colors, bird = settings.bird, lift = Math.max(0, pose.flap) * 45;
  ctx.save(); ctx.scale(width / 1000, height / 600); ctx.translate(500, 600);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1);
    if (bird === "dragon") {
      const g = ctx.createLinearGradient(200, -180, 380, 20); g.addColorStop(0, tint(c.wing, 0.2)); g.addColorStop(0.55, c.wing); g.addColorStop(1, tint(c.wing, -0.35));
      ctx.beginPath(); ctx.moveTo(355, 65); ctx.quadraticCurveTo(335, -40, 310, -200 - lift); ctx.quadraticCurveTo(210, -215 - lift, 135, -175 - lift); ctx.quadraticCurveTo(260, -158, 188, -85); ctx.quadraticCurveTo(290, -125, 268, -11); ctx.quadraticCurveTo(336, -44, 355, 65); finish(ctx, g, tint(c.body, -0.2), 2);
      for (const [x, y] of [[310, -200 - lift], [135, -175 - lift], [188, -85], [268, -11]]) { ctx.beginPath(); ctx.moveTo(355, 65); ctx.quadraticCurveTo(310, -45, x, y); ctx.strokeStyle = tint(c.body, 0.06); ctx.lineWidth = 5; ctx.stroke(); }
      for (let i = 0; i < 6; i++) shape(ctx, [[327 + i * 3, -28 + i * 12], [333 + i * 3, -35 + i * 12], [338 + i * 3, -24 + i * 12], [332 + i * 3, -17 + i * 12]], tint(c.body, i % 2 ? -0.14 : 0.15));
    } else if (bird === "hummingbird") {
      for (let ghost = 3; ghost >= 0; ghost--) { ctx.save(); ctx.globalAlpha = ghost ? 0.11 : 0.65; const motion = pose.crashed ? 40 : Math.sin(pose.time * 51 + ghost * 0.35) * 45; feather(ctx, 345, 65, 160 + ghost * 15, -210 + motion, 24, tint(c.wing, ghost * 0.08)); feather(ctx, 345, 65, 270 + ghost * 9, -160 + motion, 13, c.wing); ctx.restore(); }
    } else {
      const count = bird === "jay" ? 8 : bird === "owl" ? 6 : bird === "phoenix" ? 7 : 5;
      if (bird === "phoenix") { ctx.shadowColor = c.trail; ctx.shadowBlur = 12; }
      for (let i = count - 1; i >= 0; i--) {
        const x = 155 + i * (240 / count), y = -(bird === "phoenix" ? 190 : bird === "jay" ? 170 : 125) - Math.sin(i / (count - 1) * Math.PI) * 50 - lift;
        const rootX = 335 + i * 3, rootY = 70, color = tint(c.wing, i % 2 ? 0.08 : -0.08);
        feather(ctx, rootX, rootY, x, y, bird === "owl" ? 38 : 27, color);
        if (bird === "jay") {
          feather(ctx, rootX + (x - rootX) * 0.72, rootY + (y - rootY) * 0.72, x, y, 15, "#344b57");
          const px = rootX + (x - rootX) * 0.63, py = rootY + (y - rootY) * 0.63; stroke(ctx, [[px - 7, py + 4], [px + 9, py - 3]], "#f3eee0", 6);
        } else if (bird === "owl") {
          for (let mark = 0; mark < 3; mark++) { const fraction = 0.35 + mark * 0.16, px = rootX + (x - rootX) * fraction, py = rootY + (y - rootY) * fraction; stroke(ctx, [[px - 7, py - 2], [px, py + 5], [px + 7, py - 2]], tint(c.belly, -0.1), 2.5); }
        } else if (bird === "phoenix") feather(ctx, rootX + (x - rootX) * 0.65, rootY + (y - rootY) * 0.65, x, y - 8, 13, i % 2 ? c.beak : c.trail);
      }
      ctx.shadowBlur = 0;
      if (bird === "phoenix" && !pose.crashed) for (let i = 0; i < 7; i++) { const age = (pose.time * 0.6 + i / 7) % 1; ctx.globalAlpha = (1 - age) * 0.7; oval(ctx, 180 + i * 27 + Math.sin(i) * 20, -130 - age * 150, 2.5, 5, c.trail); } ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  if (bird === "dragon") {
    oval(ctx, 0, 15, 115, 61, sheen(ctx, c.body, 0, -10, 130)); oval(ctx, 0, -11, 79, 32, sheen(ctx, c.body, 0, -20, 90));
    for (const x of [-42, 42]) { oval(ctx, x, -21, 10, 5, tint(c.body, -0.38), x > 0 ? -0.25 : 0.25); oval(ctx, x - 3, -24, 4, 1.5, tint(c.body, 0.25)); }
    for (let i = 0; i < 5; i++) stroke(ctx, [[-24 + i * 12, 8], [-20 + i * 12, 13], [-16 + i * 12, 8]], tint(c.body, -0.15), 1.5);
  } else {
    const tip = bird === "hummingbird" ? -210 : bird === "jay" ? -138 : bird === "phoenix" ? -145 : bird === "owl" ? -70 : -100;
    const spread = bird === "hummingbird" ? 12 : bird === "jay" ? 43 : bird === "owl" ? 44 : 61;
    ctx.beginPath(); ctx.moveTo(-spread, 28); ctx.quadraticCurveTo(-spread * 0.55, tip * 0.62, 0, tip); ctx.quadraticCurveTo(spread * 0.6, tip * 0.52, spread, 28); ctx.closePath(); finish(ctx, sheen(ctx, c.beak, -5, tip * 0.3, 170), tint(c.beak, -0.25), 1);
    ctx.beginPath(); ctx.moveTo(0, tip + 5); ctx.quadraticCurveTo(4, tip * 0.4, 3, 26); ctx.strokeStyle = tint(c.beak, 0.4); ctx.lineWidth = bird === "hummingbird" ? 1 : 3; ctx.stroke();
    if (bird === "owl" || bird === "phoenix") { ctx.beginPath(); ctx.moveTo(0, tip); ctx.quadraticCurveTo(27, tip + 8, 12, tip + 45); ctx.quadraticCurveTo(8, tip + 20, -2, tip + 18); finish(ctx, tint(c.beak, -0.15)); }
  }
  ctx.restore();
}
