// Rendering adapters never advance a game's rules model themselves.
export function createCanvasSurface(canvas, { pixelRatio = () => Math.min(globalThis.devicePixelRatio || 1, 2) } = {}) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  let width = 0, height = 0;
  return {
    kind: "canvas2d", canvas, context,
    resize() {
      const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return { width, height };
      width = rect.width; height = rect.height; const ratio = pixelRatio();
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); context.setTransform(ratio, 0, 0, ratio, 0, 0);
      return { width, height };
    },
    dispose() {},
  };
}

export function createFrameLoop(onFrame, { request = callback => requestAnimationFrame(callback), cancel = id => cancelAnimationFrame(id), maxDelta = 0.05 } = {}) {
  let frame = null, previous = null, running = false;
  function tick(time) {
    if (!running) return;
    const delta = previous === null ? 0 : Math.max(0, Math.min(maxDelta, (time - previous) / 1000)); previous = time;
    onFrame(time, delta);
    if (running) frame = request(tick);
  }
  return {
    start() { if (running) return; running = true; previous = null; frame = request(tick); },
    stop() { running = false; previous = null; if (frame !== null) cancel(frame); frame = null; },
    get running() { return running; },
  };
}
