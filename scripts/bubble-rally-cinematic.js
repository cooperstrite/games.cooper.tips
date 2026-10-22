// Asset authoring only: the game plays the exported MP4s with editable HTML names.
import { drawRallyFinishArch } from "../bubble-rally-art.js";

export const CLIP_SECONDS = 7;
export const CLIP_FPS = 60;
export const FINISH_TIME = 3.07;
const COLORS = ["#62e8ff", "#ff819c", "#ffcb66", "#b8a0ff"];
const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function path(t) {
  const u = 1 - t;
  return { x: u ** 3 * -160 + 3 * u * u * t * 440 + 3 * u * t * t * 520 + t ** 3 * 1200,
    y: u ** 3 * 650 + 3 * u * u * t * 650 + 3 * u * t * t * 320 + t ** 3 * 270 };
}

export async function loadCinematicArt() {
  const load = file => new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error(`Missing cinematic art: ${file}`));
    img.src = new URL(`../assets/${file}`, import.meta.url).href;
  });
  const [ocean, bubbles, platform] = await Promise.all(["bubble-rally-ocean.png", "bubble-rally-bubbles.png", "bubble-rally-platform.png"].map(load));
  // Center each orb on its visible silhouette, not its differently padded atlas cell.
  const atlas = document.createElement("canvas"); atlas.width = bubbles.width; atlas.height = bubbles.height;
  const ctx = atlas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(bubbles, 0, 0);
  const pixels = ctx.getImageData(0, 0, atlas.width, atlas.height).data;
  const frames = COLORS.map((_, index) => {
    const x0 = index % 2 * atlas.width / 2, y0 = Math.floor(index / 2) * atlas.height / 2;
    let left = atlas.width, top = atlas.height, right = 0, bottom = 0;
    for (let y = y0; y < y0 + atlas.height / 2; y++) for (let x = x0; x < x0 + atlas.width / 2; x++) {
      if (pixels[(y * atlas.width + x) * 4 + 3] < 100) continue;
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    const size = Math.max(right - left + 1, bottom - top + 1);
    return { x: (left + right + 1 - size) / 2, y: (top + bottom + 1 - size) / 2, size };
  });
  return { ocean, bubbles, platform, frames };
}

export function drawFinishFrame(canvas, art, racer, seconds) {
  const ctx = canvas.getContext("2d"), t = Math.min(CLIP_SECONDS, Math.max(0, seconds));
  const color = COLORS[racer], progress = clamp((t - 0.25) / 2.82);
  const travel = lerp(2 / 9, 8 / 9, progress), center = path(travel), gate = path(8 / 9);
  center.x -= 20 * (1 - smooth(t / 0.25));
  center.x += 24 * smooth((t - FINISH_TIME) / 0.4); center.y -= 5 * smooth((t - FINISH_TIME) / 0.4);
  const phase = (progress * 6) % 1;
  const airborne = progress > 0 && progress < 1 ? clamp((phase - 0.18) / 0.64) : 0;
  // A fixed circular silhouette follows a continuous arc, without squash or bobbing.
  const hop = Math.sin(airborne * Math.PI) ** 2 * lerp(42, 29, progress);
  const radius = lerp(66, 48, progress), ballY = center.y - radius - hop;
  const zoomIn = smooth((t - 3.5) / 1.4), zoom = lerp(1, 1.65, zoomIn);
  const ellipse = (x, y, rx, ry, fill) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };
  ctx.save(); ctx.scale(canvas.width / 1280, canvas.height / 720);
  const bgScale = Math.max(1280 / art.ocean.width, 720 / art.ocean.height) * 1.025;
  const bgX = (1280 - art.ocean.width * bgScale) / 2 - Math.sin(t * 0.23) * 5;
  const bgY = (720 - art.ocean.height * bgScale) / 2 + Math.sin(t * 0.2) * 3;
  ctx.drawImage(art.ocean, bgX, bgY, art.ocean.width * bgScale, art.ocean.height * bgScale);
  // Refract the central water, leaving the sky and the existing island silhouettes intact.
  ctx.save(); ctx.beginPath(); ctx.moveTo(190, 190); ctx.lineTo(1130, 190); ctx.lineTo(1120, 720); ctx.lineTo(120, 720); ctx.closePath(); ctx.clip();
  for (let y = 190; y < 720; y += 4) {
    const shift = Math.sin(t * 1.6 + y * 0.024) * (1.4 + y * 0.0025);
    ctx.drawImage(art.ocean, 0, (y - bgY) / bgScale, art.ocean.width, 4 / bgScale, bgX + shift, y, art.ocean.width * bgScale, 4.2);
  }
  for (let i = 0; i < 65; i++) {
    const y = 215 + ((i * 89 + t * (9 + i % 4)) % 510), x = 150 + (i * 137 % 1000) + Math.sin(t + i) * 12;
    ctx.globalAlpha = 0.07 + (Math.sin(t * 1.4 + i) + 1) * 0.07;
    ellipse(x, y, 5 + (y - 190) * 0.018, 0.55, "#b9fbff");
  }
  ctx.restore();
  const shade = ctx.createLinearGradient(0, 0, 0, 720); shade.addColorStop(0, "#030c290d"); shade.addColorStop(0.6, "#04102700"); shade.addColorStop(1, "#020b2580");
  ctx.fillStyle = shade; ctx.fillRect(0, 0, 1280, 720);
  // Keep the camera still for the jumps, then move in gently after the finish.
  ctx.save(); ctx.translate((640 - (gate.x + 24) * zoom) * zoomIn, (335 - (gate.y - 53) * zoom) * zoomIn); ctx.scale(zoom, zoom);
  // These are the original landings under the former road, using the board's exact asset.
  for (let i = 8; i >= 0; i--) {
    const p = i / 9, point = path(p), size = lerp(310, 180, p);
    ctx.drawImage(art.platform, point.x - size / 2, point.y - size * 0.35, size, size);
    ctx.save();
    for (let k = 0; k < 9; k++) {
      const flow = (t * 0.85 + k / 9 + i * 0.13) % 1;
      ctx.globalAlpha = 0.35 * (1 - flow);
      for (const side of [-1, 1]) {
        ctx.strokeStyle = "#d4ffff"; ctx.lineWidth = 1.3; ctx.beginPath();
        const x = point.x + side * size * (0.28 + Math.sin(k * 2.8) * 0.025);
        const y = point.y + size * (0.08 + flow * 0.42);
        ctx.moveTo(x, y); ctx.lineTo(x + side * 2, y + 7 + flow * 11); ctx.stroke();
      }
    }
    ctx.restore();
    if (i >= 2) {
      ctx.save(); ctx.translate(point.x, point.y + 5); ctx.scale(1, 0.64);
      ctx.font = `900 ${i === 8 ? 22 : 20}px system-ui`; ctx.textAlign = "center";
      ctx.fillStyle = i === 8 ? "#fff2c2" : "#e4faffb0"; ctx.shadowColor = "#042338"; ctx.shadowBlur = 4;
      ctx.fillText(i === 8 ? "FINISH" : String(i + 23), 0, 0); ctx.restore();
    }
    const impactAge = t - (0.25 + (i - 2) * 0.47);
    if (i >= 3 && impactAge > 0 && impactAge < 0.4) {
      ctx.save(); ctx.globalAlpha = (1 - impactAge / 0.4) * 0.7;
      ctx.beginPath(); ctx.ellipse(point.x, point.y, 25 + impactAge * 100, 7 + impactAge * 24, 0, 0, Math.PI * 2);
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
  }
  const arch = () => drawRallyFinishArch(ctx, gate, lerp(310, 180, 8 / 9) / 2.8, { lineWidth: 15, highlightWidth: 10, dash: 8, glow: 18 });
  if (t < FINISH_TIME) arch();
  ellipse(center.x, center.y + 3, radius * (1.05 - hop / 220), radius * 0.22, "#04142c80");
  const frame = art.frames[racer], rotation = (center.x - path(2 / 9).x) / 65;
  ctx.save(); ctx.translate(center.x, ballY);
  ctx.shadowColor = color; ctx.shadowBlur = 17;
  ellipse(0, 0, radius, radius, color + "4a"); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.clip(); ctx.rotate(rotation);
  ctx.drawImage(art.bubbles, frame.x, frame.y, frame.size, frame.size, -radius, -radius, radius * 2, radius * 2); ctx.restore();
  ctx.beginPath(); ctx.arc(center.x, ballY, radius, 0, Math.PI * 2); ctx.lineWidth = 1.6; ctx.strokeStyle = color + "c0"; ctx.stroke();
  ctx.beginPath(); ctx.arc(center.x, ballY, radius * 0.87, Math.PI * 1.09, Math.PI * 1.58); ctx.lineWidth = 2.2; ctx.strokeStyle = "#ffffff9c"; ctx.stroke();
  // The near edge of the same game arch passes in front as the winner crosses it.
  if (t >= FINISH_TIME) arch();
  const burstAge = t - FINISH_TIME;
  if (burstAge > 0) {
    const palette = [color, "#fff0bb", "#e8fcff"];
    for (let i = 0; i < 100; i++) {
      const age = burstAge - (i % 10) * 0.035; if (age < 0) continue;
      const angle = i * 2.39996, speed = 48 + i % 9 * 11;
      ctx.save(); ctx.globalAlpha = clamp(1 - age / 3.3);
      ctx.translate(gate.x + Math.cos(angle) * age * speed, gate.y - 85 - Math.abs(Math.sin(angle)) * age * 130 + age * age * 42);
      ctx.rotate(i + age * 3); ctx.fillStyle = palette[i % palette.length]; ctx.fillRect(-2, -4, Math.cos(age * 4 + i) * 5, 8); ctx.restore();
    }
  }
  if (t > 4) {
    ctx.save(); ctx.globalAlpha = smooth((t - 4) / 0.45); ctx.translate(center.x, ballY - radius - 15); ctx.scale(0.8, 0.8);
    ctx.beginPath(); ctx.moveTo(-29, 0); ctx.lineTo(-35, -30); ctx.lineTo(-14, -17); ctx.lineTo(0, -40); ctx.lineTo(14, -17); ctx.lineTo(35, -30); ctx.lineTo(29, 0); ctx.closePath();
    const gold = ctx.createLinearGradient(0, -40, 0, 0); gold.addColorStop(0, "#fff4c8"); gold.addColorStop(1, "#e6ad48");
    ctx.fillStyle = gold; ctx.shadowColor = "#ffe8a2"; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
    for (const x of [-18, 0, 18]) ellipse(x, -8, 3.2, 3.2, color); ctx.restore();
  }
  ctx.restore();
  const lower = ctx.createLinearGradient(0, 480, 0, 720); lower.addColorStop(0, "#020b2000"); lower.addColorStop(1, "#020b20ed");
  ctx.fillStyle = lower; ctx.fillRect(0, 480, 1280, 240); ctx.restore();
}

export async function recordFinishClip(canvas, art, racer) {
  // Encode every authored frame. Real-time screen capture can drop frames and judder.
  const chunks = []; let failure = null;
  const encoder = new VideoEncoder({
    output(chunk) { const bytes = new Uint8Array(chunk.byteLength); chunk.copyTo(bytes); chunks.push(bytes); },
    error(error) { failure = error; },
  });
  encoder.configure({ codec: "avc1.420020", width: 1280, height: 720, bitrate: 8000000, framerate: CLIP_FPS, avc: { format: "annexb" }, hardwareAcceleration: "prefer-software" });
  try {
    for (let i = 0; i < CLIP_SECONDS * CLIP_FPS; i++) {
      drawFinishFrame(canvas, art, racer, i / CLIP_FPS);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * 1000000 / CLIP_FPS), duration: Math.round(1000000 / CLIP_FPS) });
      encoder.encode(frame, { keyFrame: i % CLIP_FPS === 0 }); frame.close();
      if (i % 20 === 19) await encoder.flush();
      if (failure) throw failure;
    }
    await encoder.flush(); drawFinishFrame(canvas, art, racer, CLIP_SECONDS);
    return URL.createObjectURL(new Blob(chunks, { type: "video/h264" }));
  } finally { if (encoder.state !== "closed") encoder.close(); }
}
