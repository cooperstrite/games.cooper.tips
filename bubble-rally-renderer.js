import { createCanvasSurface, createFrameLoop } from "./arcade/runtime.js";
import { rallyCourse, tileAt } from "./bubble-rally-model.js";

const TILE_COLORS = { normal: "#6584b3", start: "#62e8ff", charge: "#62f3bc", boost: "#68dfff", storm: "#ff87b7", checkpoint: "#c4a1ff", finish: "#ffe29a" };
const TILE_LABELS = { start: "START", charge: "+2", boost: ">>", storm: "!", checkpoint: "SAFE", finish: "FINISH" };
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => value < 0.5 ? 2 * value * value : 1 - (-2 * value + 2) ** 2 / 2;

export function createRallyRenderer(canvas, { getState, getPreview, isPaused, isRolling }) {
  const surface = createCanvasSurface(canvas);
  const ctx = surface.context;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ocean = new Image(); ocean.src = new URL("./assets/bubble-rally-ocean.png", import.meta.url).href;
  const bubbles = new Image(); bubbles.src = new URL("./assets/bubble-rally-bubbles.png", import.meta.url).href;
  const platform = new Image(); platform.src = new URL("./assets/bubble-rally-platform.png", import.meta.url).href;
  let width = 1000, height = 590, time = 0, animation = null;
  const resize = () => { const size = surface.resize(); width = size.width; height = size.height; };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();

  function layout(count) {
    const columns = width < 520 ? 4 : 8;
    const rows = Math.ceil(count / columns);
    const marginX = width < 520 ? 44 : 67;
    const top = width < 520 ? 54 : 85, bottom = width < 520 ? 62 : 82;
    const gapX = (width - marginX * 2) / (columns - 1);
    const gapY = (height - top - bottom) / (rows - 1);
    const radius = Math.min(gapX * 0.39, gapY * 0.36, 41);
    return { radius, points: Array.from({ length: count }, (_, i) => {
      const row = Math.floor(i / columns), column = i % columns;
      const across = row % 2 ? columns - 1 - column : column;
      const depth = width < 520 ? 1 : 1 - row * 0.025;
      return { x: width / 2 + (marginX + across * gapX - width / 2) * depth,
        y: height - bottom - row * gapY + Math.sin(across / (columns - 1) * Math.PI * 2 + row * 0.7) * (width < 520 ? 3 : 11), row, depth };
    }) };
  }
  function ellipse(x, y, rx, ry, fill) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  }
  function line(points) {
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1], to = points[i];
      if (from.row !== to.row) {
        const bend = from.x > width / 2 ? 30 : -30;
        ctx.bezierCurveTo(from.x + bend, from.y, to.x + bend, to.y, to.x, to.y);
      } else ctx.lineTo(to.x, to.y);
    }
  }
  function pointAt(points, position) {
    const index = Math.floor(position), fraction = position - index;
    const from = points[Math.max(0, Math.min(points.length - 1, index))];
    const to = points[Math.min(points.length - 1, index + 1)];
    return { x: from.x + (to.x - from.x) * fraction + (from.row !== to.row ? Math.sin(fraction * Math.PI) * (from.x > width / 2 ? 22 : -22) : 0),
      y: from.y + (to.y - from.y) * fraction };
  }
  function bubble(x, y, radius, color, number, shield, active) {
    ellipse(x, y + radius * 1.1, radius * 1.1, radius * 0.35, "#020a2290");
    if (bubbles.complete && bubbles.naturalWidth) {
      const cellW = bubbles.naturalWidth / 2, cellH = bubbles.naturalHeight / 2;
      const sx = ((number - 1) % 2) * cellW, sy = Math.floor((number - 1) / 2) * cellH;
      const size = radius * 2.3;
      ctx.save(); ctx.translate(x, y + radius * 1.18); ctx.scale(1, -0.25); ctx.globalAlpha = 0.22;
      ctx.drawImage(bubbles, sx, sy, cellW, cellH, -size / 2, -size / 2, size, size); ctx.restore();
      ctx.shadowBlur = active ? 16 : 6; ctx.shadowColor = color;
      ctx.drawImage(bubbles, sx, sy, cellW, cellH, x - size / 2, y - size / 2, size, size); ctx.shadowBlur = 0;
      const badgeX = x + radius * 0.65, badgeY = y + radius * 0.60, badgeR = Math.max(7, radius * 0.27);
      ellipse(badgeX, badgeY, badgeR, badgeR, "#071728e8"); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = `800 ${Math.max(9, radius * 0.38)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(number), badgeX, badgeY);
      if (shield) {
        ctx.shadowBlur = 9; ctx.shadowColor = "#adffe8";
        ctx.beginPath(); ctx.arc(x, y, radius + 5, 0, Math.PI * 2); ctx.strokeStyle = "#adffe8"; ctx.lineWidth = 2; ctx.stroke();
        ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.arc(x, y, radius + 9, time, time + Math.PI * 2); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
      }
      return;
    }
    const glass = ctx.createRadialGradient(x - radius * 0.32, y - radius * 0.42, radius * 0.06, x + radius * 0.12, y + radius * 0.2, radius * 1.1);
    glass.addColorStop(0, "#efffffca"); glass.addColorStop(0.2, color + "7a");
    glass.addColorStop(0.55, color + "24"); glass.addColorStop(0.82, color + "92"); glass.addColorStop(1, "#f4c9ff");
    ctx.shadowBlur = active ? radius * 0.9 : radius * 0.35; ctx.shadowColor = color;
    ellipse(x, y, radius, radius, glass); ctx.shadowBlur = 0;
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, radius * 0.87, Math.PI * 1.03, Math.PI * 1.7); ctx.strokeStyle = "#f4ffffdf"; ctx.lineWidth = radius * 0.11; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, radius * 0.88, 0.25, Math.PI * 0.78); ctx.strokeStyle = "#f5adffad"; ctx.lineWidth = radius * 0.10; ctx.stroke();
    ellipse(x - radius * 0.28, y - radius * 0.45, radius * 0.25, radius * 0.10, "#ffffffd9");
    ctx.fillStyle = "#fff"; ctx.shadowBlur = 4; ctx.shadowColor = "#021932";
    ctx.font = `800 ${Math.max(12, radius * 0.9)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(number), x, y + radius * 0.12); ctx.shadowBlur = 0;
    if (shield) {
      ctx.beginPath(); ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = "#adffe8"; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function draw(_, delta) {
    const state = getState(); if (!state || !width || !height) return;
    if (!isPaused() && !reducedMotion) time += delta;
    if (animation && !isPaused()) animation.elapsed += delta * 1000;
    const course = rallyCourse(state.course);
    const { radius, points } = layout(course.finish + 1);
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#070c25"); bg.addColorStop(0.5, course.id === "tempest" ? "#201331" : "#0c2943"); bg.addColorStop(1, "#08152a");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    if (ocean.complete && ocean.naturalWidth) {
      const scale = Math.max(width / ocean.naturalWidth, height / ocean.naturalHeight);
      ctx.drawImage(ocean, (width - ocean.naturalWidth * scale) / 2, (height - ocean.naturalHeight * scale) / 2, ocean.naturalWidth * scale, ocean.naturalHeight * scale);
      ctx.fillStyle = course.id === "tempest" ? "#160c2d5c" : "#06152b35"; ctx.fillRect(0, 0, width, height);
    }
    const glow = ctx.createRadialGradient(width * 0.7, height * 0.38, 5, width * 0.7, height * 0.38, width * 0.65);
    glow.addColorStop(0, "#417a9828"); glow.addColorStop(1, "#417a9800"); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
    // A quiet water surface with drifting caustics and depth beneath the track.
    for (let i = 0; i < 50; i++) {
      const y = (i * 71.3) % height, x = (Math.sin(i * 63.17) * 0.5 + 0.5) * width;
      ctx.strokeStyle = i % 3 ? "#6cbacb0b" : "#77e9e918"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x + Math.sin(time * 0.25 + i) * 14, y, 18 + i % 36, 1.5, -0.1, 0, Math.PI * 2); ctx.stroke();
      if (i % 4 === 0) ellipse(x, y + Math.sin(time * 0.6 + i) * 8, 1.1, 1.1, "#bceaff70");
    }
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.save(); ctx.translate(0, 18); line(points); ctx.strokeStyle = "#03091b88"; ctx.lineWidth = radius * 0.8; ctx.stroke(); ctx.restore();
    line(points); ctx.strokeStyle = "#e4f9ffba"; ctx.lineWidth = radius * 0.58; ctx.shadowColor = "#6be9ff"; ctx.shadowBlur = 9; ctx.stroke(); ctx.shadowBlur = 0;
    const rail = ctx.createLinearGradient(0, height, width, 0); rail.addColorStop(0, "#176899d9"); rail.addColorStop(0.4, "#54b6dcc0"); rail.addColorStop(0.7, "#7e83cbd9"); rail.addColorStop(1, "#e5b86bd0");
    line(points); ctx.strokeStyle = rail; ctx.lineWidth = radius * 0.48; ctx.stroke();
    line(points); ctx.strokeStyle = "#c2f5ffb0"; ctx.lineWidth = 1; ctx.stroke();
    line(points); ctx.strokeStyle = "#ffdc96d0"; ctx.lineWidth = 2; ctx.setLineDash([2, 27]); ctx.lineDashOffset = -time * 12; ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    const preview = getPreview();
    if (preview) {
      line(points.slice(state.players[state.active].position, preview.last.landing + 1));
      ctx.strokeStyle = state.players[state.active].color + "c0"; ctx.lineWidth = 4; ctx.setLineDash([3, 7]); ctx.stroke(); ctx.setLineDash([]);
    }
    points.map((point, index) => ({ ...point, index })).sort((a, b) => a.y - b.y).forEach(point => {
      const index = point.index, type = tileAt(course, index), color = TILE_COLORS[type];
      const tileRadius = radius * point.depth;
      if (platform.complete && platform.naturalWidth) {
        const size = tileRadius * 2.8;
        ctx.drawImage(platform, point.x - size / 2, point.y - size * 0.35, size, size);
        ellipse(point.x, point.y, tileRadius * 0.97, tileRadius * 0.49, type === "normal" ? "#082c5338" : color + "45");
        ctx.strokeStyle = type === "normal" ? "#c5eaffaf" : color; ctx.lineWidth = 1.7; ctx.shadowColor = color; ctx.shadowBlur = type === "normal" ? 0 : 12; ctx.stroke(); ctx.shadowBlur = 0;
      } else {
      ellipse(point.x, point.y + 12, radius * 1.05, radius * 0.6, "#03091bc0");
      const side = ctx.createLinearGradient(0, point.y, 0, point.y + 10);
      side.addColorStop(0, color + "99"); side.addColorStop(1, "#0c1a35");
      ellipse(point.x, point.y + 6, radius, radius * 0.72, side);
      const top = ctx.createLinearGradient(0, point.y - radius, 0, point.y + radius);
      top.addColorStop(0, color + "77"); top.addColorStop(1, "#0c233bf5");
      ctx.shadowBlur = type === "normal" ? 0 : 14; ctx.shadowColor = color + "70";
      ellipse(point.x, point.y, radius, radius * 0.72, top); ctx.shadowBlur = 0;
      ctx.strokeStyle = type === "normal" ? "#98b3d16a" : color; ctx.lineWidth = type === "normal" ? 1 : 1.6; ctx.stroke();
      }
      ctx.fillStyle = type === "normal" ? "#c7dae7" : color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `800 ${type === "checkpoint" || type === "finish" || type === "start" ? Math.max(8, radius * 0.30) : Math.max(11, radius * 0.43)}px system-ui`;
      ctx.shadowBlur = 5; ctx.shadowColor = "#031024";
      ctx.fillText(TILE_LABELS[type] || String(index), point.x, point.y);
      ctx.shadowBlur = 0;
      if (type !== "normal" && type !== "start" && type !== "finish") {
        ctx.font = "10px system-ui"; ctx.fillStyle = "#f1fbff"; ctx.shadowColor = "#041223"; ctx.shadowBlur = 4; ctx.fillText(String(index), point.x, point.y + radius * 0.77); ctx.shadowBlur = 0;
      }
      if (preview?.last.to === index) {
        ctx.beginPath(); ctx.ellipse(point.x, point.y, radius + 6, radius * 0.53 + 5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
      }
    });
    const finish = points[points.length - 1], archRadius = radius * 1.03;
    ctx.beginPath(); ctx.moveTo(finish.x - archRadius, finish.y - 5);
    ctx.lineTo(finish.x - archRadius, finish.y - archRadius * 0.65);
    ctx.bezierCurveTo(finish.x - archRadius, finish.y - archRadius * 2.2, finish.x + archRadius, finish.y - archRadius * 2.2, finish.x + archRadius, finish.y - archRadius * 0.65);
    ctx.lineTo(finish.x + archRadius, finish.y - 5);
    ctx.strokeStyle = "#ffce7f"; ctx.lineWidth = width < 520 ? 6 : 9; ctx.shadowColor = "#ffc868"; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.strokeStyle = "#fff6d9"; ctx.lineWidth = width < 520 ? 4 : 6; ctx.stroke();
    ctx.strokeStyle = "#15203a"; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
    const progress = animation ? clamp(animation.elapsed / animation.duration) : 1;
    state.players.forEach((player, index) => {
      let position = player.position;
      if (animation && progress < 1) {
        const from = animation.before.players[index].position;
        if (index === state.last?.player) {
          const landed = state.last.landing, split = landed !== player.position ? 0.7 : 1;
          position = progress < split ? from + (landed - from) * ease(progress / split) : landed + (player.position - landed) * ease((progress - split) / (1 - split));
        } else position = from + (player.position - from) * ease(clamp((progress - 0.65) / 0.35));
      }
      const p = pointAt(points, position);
      const sharing = state.players.filter(other => other.position === player.position);
      const slot = sharing.findIndex(other => other.id === player.id);
      const offset = sharing.length > 1 ? (sharing.length === 3 && slot === 2 ? 0 : slot % 2 ? 1 : -1) * radius * 0.63 : 0;
      const stack = sharing.length > 2 ? (Math.floor(slot / 2) * 1.14 - 0.9) * radius : 0;
      const r = radius * (sharing.length > 1 ? 0.57 : 0.91);
      const bob = reducedMotion ? 0 : Math.sin(time * 2 + index) * 1.8;
      bubble(p.x + offset, p.y - r * 0.86 + stack + bob - (progress < 1 ? Math.sin(progress * Math.PI) * 9 : 0), r, player.color, index + 1, player.shield, state.active === index);
    });
    if (animation && progress > 0.65 && progress < 1) {
      for (const event of state.last?.events || []) {
        if (event.type !== "pop") continue;
        const p = points[event.from], burst = (progress - 0.65) / 0.35;
        for (let i = 0; i < 16; i++) {
          const angle = i * Math.PI / 8, spread = radius * 2.6 * burst;
          ctx.globalAlpha = 1 - burst;
          ellipse(p.x + Math.cos(angle) * spread, p.y + Math.sin(angle) * spread * 0.7 - 12, 2.8, 2.8, state.players[event.player].color);
        }
        ctx.globalAlpha = 1;
      }
    }
    if (animation && progress === 1) animation = null;
    if (isRolling()) {
      const p = points[state.players[state.active].position];
      ctx.beginPath(); ctx.arc(p.x, p.y - radius, radius + 12, time * 8, time * 8 + Math.PI * 1.4); ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  const loop = createFrameLoop(draw);
  const visibility = () => { if (document.hidden) loop.stop(); else loop.start(); };
  document.addEventListener("visibilitychange", visibility); visibility();
  return {
    animate(before, after) {
      const duration = reducedMotion ? 0 : 1050;
      animation = duration ? { before, elapsed: 0, duration } : null;
      return duration;
    },
    reset() { animation = null; },
    dispose() { loop.stop(); observer.disconnect(); document.removeEventListener("visibilitychange", visibility); surface.dispose(); },
  };
}
