export const AVATAR_STYLES = { ranger: "Trail ranger", scout: "Woodland scout", knight: "Aurora knight" };
export const BOW_STYLES = { longbow: "Woodland longbow", recurve: "Swift recurve", crystal: "Aurora crystal" };
export const HAIR_STYLES = { short: "Short waves", bob: "Long bob", ponytail: "Ponytail", braids: "Braids", curls: "Curly", bun: "High bun", bald: "Bald" };
export const FACIAL_HAIR = { none: "Clean shaven", stubble: "Stubble", mustache: "Mustache", goatee: "Goatee", beard: "Short beard", full: "Full beard" };
export const HEADWEAR = { none: "No headwear", hood: "Ranger hood", headband: "Scout headband", helmet: "Knight helmet", cap: "Feathered cap" };
export const FACE_SHAPES = { oval: "Oval", round: "Round", angular: "Angular" };
export const FACE_DETAILS = { none: "None", freckles: "Freckles", scar: "Adventure scar" };
export const ACCESSORIES = { none: "None", glasses: "Round glasses", eyepatch: "Eye patch", earring: "Hoop earring" };
export const HAIR_COLORS = [
  { name: "Black", value: "#302a2c" }, { name: "Chestnut", value: "#604634" },
  { name: "Copper", value: "#b56842" }, { name: "Blond", value: "#e2c575" },
  { name: "Silver", value: "#d0d5d5" }, { name: "Lilac", value: "#9e82c7" },
];
export const EYE_COLORS = [
  { name: "Brown", value: "#79502e" }, { name: "Blue", value: "#4e9ddd" },
  { name: "Green", value: "#4a9f72" }, { name: "Hazel", value: "#b0a050" },
  { name: "Gray", value: "#9baab9" }, { name: "Violet", value: "#a380cf" },
];
export const BOOT_COLORS = [
  { name: "Charcoal", value: "#2b3839" }, { name: "Brown leather", value: "#87633f" },
  { name: "Silver gray", value: "#a3b5c3" },
];
export const OUTFIT_COLORS = [
  { name: "Forest", value: "#40756a" }, { name: "Ocean", value: "#3d7fba" },
  { name: "Ember", value: "#b65b55" }, { name: "Sunflower", value: "#b5913d" },
  { name: "Violet", value: "#9271b7" }, { name: "Berry", value: "#b65e91" },
];
export const SKIN_TONES = [
  { name: "Porcelain", value: "#f4d7bf" }, { name: "Sand", value: "#dfae88" },
  { name: "Golden", value: "#c88f5c" }, { name: "Bronze", value: "#a66d49" },
  { name: "Umber", value: "#805039" }, { name: "Espresso", value: "#56382f" },
];
export const BOW_COLORS = [
  { name: "Oak gold", value: "#d4b47b" }, { name: "Evergreen", value: "#75c99d" },
  { name: "Glacier", value: "#82c8f5" }, { name: "Coral", value: "#ef927d" },
  { name: "Amethyst", value: "#b89aee" }, { name: "Silver", value: "#c7d9df" },
];
export const GRIP_COLORS = [
  { name: "Brown leather", value: "#87633f" }, { name: "Midnight wrap", value: "#283f4f" },
  { name: "Ivory wrap", value: "#ede3c4" },
];

export function readArcheryAppearance(saved) {
  const color = (choices, value, fallback = choices[0].value, custom = true) => typeof value === "string" && (choices.some(choice => choice.value === value) || custom && /^#[0-9a-f]{6}$/i.test(value)) ? value.toLowerCase() : fallback;
  const option = (choices, value, fallback) => typeof value === "string" && Object.hasOwn(choices, value) ? value : fallback;
  const avatarStyle = option(AVATAR_STYLES, saved.avatarStyle, "ranger");
  const outfitColor = color(OUTFIT_COLORS, saved.outfitColor);
  return {
    avatarStyle,
    outfitColor,
    accentColor: color(BOW_COLORS, saved.accentColor),
    skinTone: color(SKIN_TONES, saved.skinTone, SKIN_TONES[1].value),
    faceShape: option(FACE_SHAPES, saved.faceShape, "oval"),
    faceDetail: option(FACE_DETAILS, saved.faceDetail, "none"),
    eyeColor: color(EYE_COLORS, saved.eyeColor),
    hairStyle: option(HAIR_STYLES, saved.hairStyle, "short"),
    hairColor: color(HAIR_COLORS, saved.hairColor, HAIR_COLORS[1].value),
    facialHair: option(FACIAL_HAIR, saved.facialHair, "none"),
    facialHairColor: color(HAIR_COLORS, saved.facialHairColor, HAIR_COLORS[1].value),
    headwear: option(HEADWEAR, saved.headwear, { ranger: "hood", scout: "headband", knight: "helmet" }[avatarStyle]),
    headwearColor: color(OUTFIT_COLORS, saved.headwearColor, outfitColor),
    accessory: option(ACCESSORIES, saved.accessory, "none"),
    bootColor: color(BOOT_COLORS, saved.bootColor, BOOT_COLORS[0].value, false),
    bowStyle: option(BOW_STYLES, saved.bowStyle, "longbow"),
    bowColor: color(BOW_COLORS, saved.bowColor),
    gripColor: color(GRIP_COLORS, saved.gripColor, GRIP_COLORS[0].value, false),
  };
}

const TAU = Math.PI * 2;
function shade(color, amount) {
  const channels = color.slice(1).match(/../g).map(channel => parseInt(channel, 16));
  return `rgb(${channels.map(channel => Math.round(amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount)).join(",")})`;
}
function line(ctx, points, color, width = 2) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
}

export function drawArrow(ctx, x, y, angle, gear, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  const crystal = gear.design === "aurora";
  const steel = gear.design === "moonsteel";
  if (crystal) { ctx.shadowColor = gear.color; ctx.shadowBlur = 13; }
  line(ctx, [[-55, 0], [-3, 0]], steel ? "#b6d0dc" : crystal ? "#d1fff0" : "#caa16a", 3);
  line(ctx, [[-48, -0.8], [-6, -0.8]], "#fff4cf", 0.7);
  ctx.fillStyle = gear.color;
  ctx.beginPath(); ctx.moveTo(-43, -1); ctx.lineTo(-54, -9); ctx.lineTo(-59, -8); ctx.lineTo(-53, 0); ctx.lineTo(-59, 8); ctx.lineTo(-54, 9); ctx.lineTo(-43, 1); ctx.closePath(); ctx.fill();
  line(ctx, [[-55, -6], [-47, -1], [-55, 6]], "rgba(255,255,255,0.5)", 0.8);
  ctx.fillStyle = crystal ? gear.color : steel ? "#e8f1f3" : "#c0d6d8";
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(steel ? -9 : -4, steel ? -7 : -4); ctx.lineTo(crystal ? -10 : -2, 0); ctx.lineTo(steel ? -9 : -4, steel ? 7 : 4); ctx.closePath(); ctx.fill();
  line(ctx, [[7, 0], [-5, 0]], "rgba(255,255,255,0.8)", 0.8);
  if (steel) line(ctx, [[-26, -1], [-30, 1], [-34, -1]], "#6a97b6", 1.2);
  ctx.restore();
}

function drawBow(ctx, gear, pull) {
  const crystal = gear.bowStyle === "crystal";
  const recurve = gear.bowStyle === "recurve";
  const length = crystal || recurve ? 45 : 40;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(-5, -length);
  if (crystal) {
    [[-13, -31], [13, -14], [8, 0], [13, 14], [-13, 31], [-5, length]].forEach(([x, y]) => ctx.lineTo(x, y));
  } else if (recurve) {
    ctx.bezierCurveTo(-14, -29, 20, -33, 8, -8);
    ctx.quadraticCurveTo(4, 0, 8, 8); ctx.bezierCurveTo(20, 33, -14, 29, -5, length);
  } else ctx.quadraticCurveTo(23, 0, -5, length);
  ctx.strokeStyle = shade(gear.bowColor, -0.32); ctx.lineWidth = crystal ? 8 : recurve ? 6 : 5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
  if (crystal) { ctx.shadowColor = gear.bowColor; ctx.shadowBlur = 9; }
  ctx.strokeStyle = gear.bowColor; ctx.lineWidth = crystal ? 5 : recurve ? 3.5 : 3; ctx.stroke();
  ctx.shadowBlur = 0;
  line(ctx, [[-5, -length], [-pull, 0], [-5, length]], "#e4dcc0", 0.9);
  line(ctx, [[8, -7], [8, 7]], gear.gripColor, 6);
  for (let y = -5; y <= 5; y += 4) line(ctx, [[6, y - 1], [10, y + 1]], "rgba(255,247,219,0.4)", 0.8);
  if (crystal) {
    [-25, 25].forEach(y => {
      ctx.fillStyle = shade(gear.bowColor, 0.65);
      ctx.beginPath(); ctx.moveTo(0, y - 5); ctx.lineTo(4, y); ctx.lineTo(0, y + 5); ctx.lineTo(-4, y); ctx.closePath(); ctx.fill();
    });
  } else {
    line(ctx, [[-5, -length], [-4, -length + 4]], "#f1d694", 2);
    line(ctx, [[-5, length], [-4, length - 4]], "#f1d694", 2);
  }
  ctx.restore();
}

function drawHead(ctx, gear) {
  const hair = gear.hairColor;
  const skin = gear.skinTone;
  const trim = shade(gear.headwearColor, 0.45);
  const headwear = gear.headwear;
  const style = gear.hairStyle;
  ctx.fillStyle = hair;
  if (style === "ponytail") {
    ctx.beginPath(); ctx.moveTo(-8, -34); ctx.quadraticCurveTo(-33, -45, -30, -5); ctx.quadraticCurveTo(-19, -13, -14, -13); ctx.closePath(); ctx.fill();
    line(ctx, [[-17, -31], [-23, -29]], trim, 3);
    line(ctx, [[-23, -27], [-26, -14]], shade(hair, 0.2), 1.1);
  } else if (style === "bob") {
    ctx.beginPath(); ctx.moveTo(-13, -33); ctx.bezierCurveTo(-23, -12, -17, -2, -9, -4); ctx.lineTo(8, -12); ctx.lineTo(10, -37); ctx.closePath(); ctx.fill();
  } else if (style === "braids") {
    line(ctx, [[-10, -33], [-16, -16], [-17, 4]], shade(hair, -0.2), 8);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 ? hair : shade(hair, 0.18);
      ctx.beginPath(); ctx.ellipse(-15 + i % 2 * 2, -23 + i * 4.2, 4, 3, i % 2 ? -0.4 : 0.4, 0, TAU); ctx.fill();
    }
    line(ctx, [[-19, 4], [-13, 4]], trim, 2.5);
  } else if (style === "bun") {
    ctx.beginPath(); ctx.arc(-6, -47, 10, 0, TAU); ctx.fill();
    line(ctx, [[-13, -50], [-6, -54], [0, -50]], shade(hair, 0.22), 1.3);
    line(ctx, [[-13, -40], [1, -40]], trim, 2.5);
  } else if (style === "curls") {
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI * (0.45 + i * 0.15);
      ctx.beginPath(); ctx.arc(1 + Math.cos(angle) * 15, -29 - Math.sin(angle) * 14, 6.5, 0, TAU); ctx.fill();
    }
  }
  ctx.fillStyle = skin; ctx.beginPath();
  if (gear.faceShape === "angular") {
    ctx.moveTo(-10, -34); ctx.lineTo(8, -39); ctx.lineTo(15, -29); ctx.lineTo(15, -18); ctx.lineTo(8, -7); ctx.lineTo(-4, -10); ctx.lineTo(-12, -22); ctx.closePath();
  } else ctx.ellipse(2, gear.faceShape === "round" ? -23 : -24, gear.faceShape === "round" ? 15 : 13, gear.faceShape === "round" ? 16 : 17, -0.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = shade(skin, -0.08); ctx.beginPath(); ctx.moveTo(13, -24); ctx.lineTo(18, -20); ctx.lineTo(13, -19); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(skin, -0.12); ctx.beginPath(); ctx.ellipse(-4, -22, 3.5, 4, 0, 0, TAU); ctx.fill();
  line(ctx, [[-5, -24], [-3, -23], [-4, -20]], shade(skin, -0.32), 0.7);
  if (style !== "bald") {
    ctx.fillStyle = hair; ctx.beginPath(); ctx.moveTo(-12, -21);
    ctx.bezierCurveTo(-20, -47, 15, -50, 17, -31);
    ctx.lineTo(style === "bob" ? 7 : 2, -34); ctx.lineTo(-5, -24); ctx.closePath(); ctx.fill();
    if (style === "short") {
      line(ctx, [[-11, -35], [-4, -40], [3, -37], [9, -39]], shade(hair, 0.24), 1.5);
    } else if (style === "curls") {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? hair : shade(hair, 0.1);
        ctx.beginPath(); ctx.arc(-10 + i * 4.5, -36 - Math.sin(i / 5 * Math.PI) * 6, 5, 0, TAU); ctx.fill();
      }
    } else line(ctx, [[-9, -35], [-1, -40], [9, -37]], shade(hair, 0.2), 1.1);
  }
  ctx.fillStyle = "#f4eee1"; ctx.beginPath(); ctx.ellipse(10, -26, 2.5, 1.9, -0.05, 0, TAU); ctx.fill();
  ctx.fillStyle = gear.eyeColor; ctx.beginPath(); ctx.arc(10.8, -26, 1.65, 0, TAU); ctx.fill();
  ctx.fillStyle = "#1c2b32"; ctx.beginPath(); ctx.arc(11.2, -26, 0.7, 0, TAU); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(11.2, -26.6, 0.4, 0, TAU); ctx.fill();
  line(ctx, [[7.5, -30], [12.5, -30.5]], shade(hair, -0.1), 1.3);
  line(ctx, [[9, -16], [13.5, -16.5]], shade(skin, -0.4), 0.8);
  if (gear.faceDetail === "freckles") {
    ctx.fillStyle = shade(skin, -0.4);
    [[6, -21], [10, -21], [8, -19], [13, -22]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 0.65, 0, TAU); ctx.fill(); });
  } else if (gear.faceDetail === "scar") {
    line(ctx, [[7, -33], [12, -23]], shade(skin, -0.22), 1.2);
    line(ctx, [[8, -33], [13, -23]], shade(skin, 0.4), 0.7);
  }
  const beard = gear.facialHairColor;
  ctx.fillStyle = beard;
  if (gear.facialHair === "stubble") {
    ctx.save(); ctx.globalAlpha = 0.65;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath(); ctx.arc(1 + i % 5 * 2.5, -15 + Math.floor(i / 5) * 1.8, 0.45, 0, TAU); ctx.fill();
    }
    ctx.restore();
  } else if (gear.facialHair === "beard" || gear.facialHair === "full") {
    const full = gear.facialHair === "full";
    ctx.beginPath(); ctx.moveTo(-2, -20); ctx.lineTo(4, -15); ctx.lineTo(14, -18); ctx.quadraticCurveTo(18, -4, full ? 5 : 6, full ? 8 : -5); ctx.quadraticCurveTo(-5, full ? 1 : -6, -2, -20); ctx.closePath(); ctx.fill();
    line(ctx, [[2, -11], [5, full ? 3 : -7]], shade(beard, 0.2), 0.8);
  } else if (gear.facialHair === "goatee") {
    ctx.beginPath(); ctx.moveTo(7, -12); ctx.lineTo(14, -13); ctx.quadraticCurveTo(16, -7, 10, -2); ctx.quadraticCurveTo(6, -6, 7, -12); ctx.fill();
  }
  if (["mustache", "goatee", "beard", "full"].includes(gear.facialHair)) {
    ctx.fillStyle = beard; ctx.beginPath(); ctx.moveTo(11, -19); ctx.quadraticCurveTo(5, -21, 4, -15); ctx.quadraticCurveTo(9, -16, 11, -18); ctx.quadraticCurveTo(14, -14, 18, -16); ctx.quadraticCurveTo(16, -20, 11, -19); ctx.fill();
  }
  if (headwear === "headband") {
    line(ctx, [[-12, -31], [14, -34]], gear.headwearColor, 4);
    ctx.fillStyle = trim; ctx.beginPath(); ctx.arc(8, -33, 2, 0, TAU); ctx.fill();
    line(ctx, [[-11, -32], [-20, -27], [-16, -21]], gear.headwearColor, 2);
  } else if (headwear === "helmet") {
    ctx.fillStyle = "#afc4cc"; ctx.beginPath(); ctx.moveTo(-15, -17); ctx.quadraticCurveTo(-20, -46, 1, -46); ctx.quadraticCurveTo(17, -45, 18, -28); ctx.lineTo(3, -31); ctx.lineTo(-4, -14); ctx.closePath(); ctx.fill();
    line(ctx, [[-11, -34], [7, -40]], "#e1eced", 2);
    ctx.fillStyle = trim; ctx.beginPath(); ctx.moveTo(-4, -44); ctx.quadraticCurveTo(-10, -61, -27, -49); ctx.quadraticCurveTo(-12, -49, -9, -40); ctx.closePath(); ctx.fill();
  } else if (headwear === "hood") {
    ctx.fillStyle = shade(gear.headwearColor, -0.4); ctx.beginPath(); ctx.moveTo(-15, -16); ctx.quadraticCurveTo(-20, -47, 5, -45); ctx.quadraticCurveTo(19, -40, 18, -27); ctx.lineTo(5, -32); ctx.lineTo(-4, -14); ctx.closePath(); ctx.fill();
    line(ctx, [[-10, -36], [8, -40]], trim, 1.5);
  } else if (headwear === "cap") {
    ctx.fillStyle = gear.headwearColor; ctx.beginPath(); ctx.moveTo(-16, -32); ctx.quadraticCurveTo(-18, -54, 1, -47); ctx.lineTo(17, -32); ctx.closePath(); ctx.fill();
    line(ctx, [[-19, -31], [22, -31]], shade(gear.headwearColor, -0.3), 4);
    ctx.fillStyle = trim; ctx.beginPath(); ctx.moveTo(-10, -40); ctx.quadraticCurveTo(-30, -49, -23, -63); ctx.quadraticCurveTo(-9, -58, -10, -40); ctx.fill();
    line(ctx, [[-10, -39], [-22, -60]], shade(trim, 0.4), 0.8);
  }
  if (gear.accessory === "glasses") {
    ctx.strokeStyle = "#d6cfac"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(10, -26, 5.3, 4.3, 0, 0, TAU); ctx.stroke();
    line(ctx, [[4.5, -27], [-4, -25]], "#d6cfac", 1.2);
  } else if (gear.accessory === "eyepatch") {
    line(ctx, [[-12, -31], [14, -24]], "#293b42", 1.4);
    ctx.fillStyle = "#293b42"; ctx.beginPath(); ctx.ellipse(10, -26, 4.7, 3.6, 0, 0, TAU); ctx.fill();
  } else if (gear.accessory === "earring") {
    ctx.strokeStyle = trim; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(-4, -17, 2.7, 0, TAU); ctx.stroke();
  }
}

// The game, full-body preview, and portrait share the same character artwork.
export function drawArcher(ctx, gear, { x, y, ground, scale = 1, angle = -0.2, power = 70, release = 1, arrowsLeft = 6, loaded = true, platform = true }) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const body = -49;
  const feet = (ground - y) / scale;
  const outfit = gear.outfitColor;
  const skin = gear.skinTone;
  const trim = gear.accentColor;
  const knight = gear.avatarStyle === "knight";
  const scout = gear.avatarStyle === "scout";
  ctx.fillStyle = "rgba(3,17,25,0.38)"; ctx.beginPath(); ctx.ellipse(body, feet + 5, 46, 11, 0, 0, TAU); ctx.fill();
  if (platform) { ctx.fillStyle = "#6b6551"; ctx.fillRect(body - 52, feet - 3, 102, 9); }
  line(ctx, [[body - 10, feet - 51], [body - 19, feet - 15], [body - 28, feet - 4]], "#384c4c", 13);
  line(ctx, [[body + 8, feet - 50], [body + 15, feet - 24], [body + 25, feet - 5]], "#465f5a", 13);
  if (knight) {
    line(ctx, [[body - 16, feet - 28], [body - 21, feet - 13]], "#a3b5c3", 10);
    line(ctx, [[body + 15, feet - 27], [body + 23, feet - 10]], "#a3b5c3", 10);
  }
  line(ctx, [[body - 27, feet - 5], [body - 12, feet - 5]], gear.bootColor, 9);
  line(ctx, [[body + 21, feet - 5], [body + 35, feet - 5]], gear.bootColor, 9);
  ctx.fillStyle = "#886647"; ctx.beginPath(); ctx.roundRect(body - 31, 4, 13, 37, 3); ctx.fill();
  for (let i = 0; i < Math.min(4, arrowsLeft); i++) {
    line(ctx, [[body - 24 + i * 3, 17], [body - 33 + i * 3, -17]], "#cba675", 1.5);
    line(ctx, [[body - 33 + i * 3, -13], [body - 35 + i * 3, -19]], gear.color, 3);
  }
  ctx.fillStyle = shade(outfit, -0.36);
  ctx.beginPath(); ctx.moveTo(body - 13, -22); ctx.quadraticCurveTo(body - 28, 22, body - (scout ? 24 : 33), feet - (scout ? 62 : 36)); ctx.lineTo(body + 13, feet - (scout ? 65 : 37)); ctx.lineTo(body + 15, 6); ctx.closePath(); ctx.fill();
  line(ctx, [[body - 19, 2], [body - (scout ? 21 : 29), feet - (scout ? 63 : 39)]], trim, 1.5);
  const tunic = ctx.createLinearGradient(body - 14, 0, body + 16, 0);
  tunic.addColorStop(0, shade(outfit, -0.15)); tunic.addColorStop(0.6, outfit); tunic.addColorStop(1, shade(outfit, 0.16));
  ctx.fillStyle = tunic;
  ctx.beginPath(); ctx.moveTo(body - 10, -1); ctx.lineTo(body + 13, 1); ctx.lineTo(body + 16, feet - 43); ctx.lineTo(body - 15, feet - 43); ctx.closePath(); ctx.fill();
  if (knight) {
    ctx.fillStyle = "#afc4cc"; ctx.beginPath(); ctx.moveTo(body - 14, -2); ctx.lineTo(body + 15, 0); ctx.lineTo(body + 10, 23); ctx.lineTo(body, 30); ctx.lineTo(body - 12, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = outfit; ctx.beginPath(); ctx.moveTo(body - 6, 2); ctx.lineTo(body + 8, 3); ctx.lineTo(body + 5, 17); ctx.lineTo(body, 22); ctx.lineTo(body - 6, 16); ctx.closePath(); ctx.fill();
    line(ctx, [[body - 11, 2], [body - 13, 10], [body - 20, 8]], "#d8e5e7", 6);
  } else line(ctx, [[body - 12, -3], [body + 12, feet - 52]], trim, 4);
  line(ctx, [[body - 13, feet - 51], [body + 16, feet - 51]], shade(trim, -0.25), 6);
  ctx.fillStyle = "#e5c68c"; ctx.fillRect(body + 2, feet - 54, 6, 6);
  ctx.save(); ctx.translate(body, 0); drawHead(ctx, gear); ctx.restore();
  line(ctx, [[body + 2, 7], [body + 22, 9], [-3, 0]], shade(outfit, 0.25), 10);
  line(ctx, [[body + 21, 9], [-3, 0]], skin, 6);
  if (knight) line(ctx, [[body + 24, 8], [-10, 3]], "#afc4cc", 7);
  const pull = (9 + power * 0.19) * release;
  const hand = { x: -Math.cos(angle) * pull, y: -Math.sin(angle) * pull };
  line(ctx, [[body - 5, 6], [body - 21, 19], [hand.x, hand.y]], shade(outfit, 0.12), 9);
  line(ctx, [[body - 21, 19], [hand.x, hand.y]], skin, 5);
  if (knight) line(ctx, [[body - 19, 18], [body - 11, 14]], "#afc4cc", 7);
  ctx.save(); ctx.rotate(angle); drawBow(ctx, gear, pull);
  if (loaded) drawArrow(ctx, 7, 0, 0, gear, 0.8);
  ctx.restore(); ctx.restore();
}

export function drawArcherPreview(canvas, gear, view = "body") {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 400 * ratio; canvas.height = 340 * ratio;
  const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio);
  const backdrop = ctx.createLinearGradient(0, 0, 0, 340);
  backdrop.addColorStop(0, "#132c3b"); backdrop.addColorStop(1, "#203d3e");
  ctx.fillStyle = backdrop; ctx.fillRect(0, 0, 400, 340);
  const halo = ctx.createRadialGradient(200, 170, 15, 200, 170, 150);
  halo.addColorStop(0, "rgba(151,209,174,0.13)"); halo.addColorStop(1, "rgba(151,209,174,0)");
  ctx.fillStyle = halo; ctx.fillRect(0, 0, 400, 340);
  ctx.strokeStyle = "rgba(163,215,190,0.12)"; ctx.lineWidth = 1;
  [112, 141].forEach(radius => { ctx.beginPath(); ctx.arc(202, 164, radius, 0, TAU); ctx.stroke(); });
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(214,236,224,${0.15 + i % 3 * 0.1})`;
    ctx.beginPath(); ctx.arc(28 + i * 67 % 345, 20 + i * 43 % 233, i % 4 ? 1 : 1.7, 0, TAU); ctx.fill();
  }
  if (view === "face") {
    ctx.save(); ctx.translate(190, 262); ctx.scale(4.1, 4.1);
    ctx.fillStyle = shade(gear.outfitColor, -0.2); ctx.beginPath(); ctx.moveTo(-11, -7); ctx.quadraticCurveTo(-29, -1, -34, 28); ctx.lineTo(32, 28); ctx.quadraticCurveTo(26, 0, 12, -7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = gear.outfitColor; ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(9, -5); ctx.lineTo(19, 28); ctx.lineTo(-14, 28); ctx.closePath(); ctx.fill();
    line(ctx, [[-10, -3], [-22, 26]], gear.accentColor, 1.5);
    line(ctx, [[10, -3], [22, 26]], gear.accentColor, 1.5);
    if (gear.avatarStyle === "knight") line(ctx, [[-16, 2], [-7, -1]], "#afc4cc", 6);
    drawHead(ctx, gear); ctx.restore();
  } else {
    line(ctx, [[36, 304], [364, 304]], "rgba(172,208,185,0.18)", 1);
    drawArcher(ctx, gear, { x: 250, y: 126, ground: 296, scale: 1.85, angle: -0.22, power: 70, platform: false });
  }
}

export function drawBowPreview(canvas, gear) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 300 * ratio; canvas.height = 190 * ratio;
  const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio);
  const backdrop = ctx.createRadialGradient(150, 95, 5, 150, 95, 145);
  backdrop.addColorStop(0, "#294746"); backdrop.addColorStop(1, "#142c37");
  ctx.fillStyle = backdrop; ctx.fillRect(0, 0, 300, 190);
  ctx.strokeStyle = "rgba(181,220,198,0.12)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(150, 95, 113, 75, 0, 0, TAU); ctx.stroke();
  ctx.translate(156, 95); ctx.rotate(-Math.PI / 4); ctx.scale(2.1, 2.1);
  drawBow(ctx, gear, 15);
}
