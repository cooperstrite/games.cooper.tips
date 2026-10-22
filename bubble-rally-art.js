// Shared finish artwork keeps the board and its victory clips consistent.
export function drawRallyFinishArch(ctx, point, radius, { lineWidth = 9, highlightWidth = 6, dash = 5, glow = 12 } = {}) {
  const archRadius = radius * 1.03;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(point.x - archRadius, point.y - 5);
  ctx.lineTo(point.x - archRadius, point.y - archRadius * 0.65);
  ctx.bezierCurveTo(point.x - archRadius, point.y - archRadius * 2.2, point.x + archRadius, point.y - archRadius * 2.2, point.x + archRadius, point.y - archRadius * 0.65);
  ctx.lineTo(point.x + archRadius, point.y - 5);
  ctx.strokeStyle = "#ffce7f"; ctx.lineWidth = lineWidth;
  ctx.shadowColor = "#ffc868"; ctx.shadowBlur = glow; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.strokeStyle = "#fff6d9"; ctx.lineWidth = highlightWidth; ctx.stroke();
  ctx.strokeStyle = "#15203a"; ctx.setLineDash([dash, dash]); ctx.stroke();
  ctx.restore();
}
