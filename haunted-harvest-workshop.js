import { STENCILS, CARVE_WIDTH, CARVE_HEIGHT, MAX_CUTS, insideFace, facePoint, makeCut, cutAt, carvingStats } from "./haunted-harvest-carving.js";
import { drawCarving } from "./haunted-harvest-art.js";

export function createCarvingWorkshop(root, { practice, onSave, onCancel, sound, reducedMotion = false }) {
  let cuts = [], undo = [], redo = [], draft = [], cursor = null, pointer = null, tool = "draw", zoom = 1, falling = null, disposed = false, dirty = true;
  let panStart = null, notice = "", moving = false;
  root.innerHTML = `
    <div class="hh-dialog-head"><span class="hh-eyebrow">THE LANTERN WORKSHOP</span><span class="hh-time-paused">${practice ? "Free carving / no supplies needed" : "Harvest paused / take your time"}</span></div>
    <h3 id="hh-dialog-title">Draw a shape. Cut it out.</h3>
    <p class="hh-bench-help">Trace an eye or a mouth, then release to remove the enclosed piece. For sharp corners, use <strong>Point to point</strong>. Your design does not have to match a pattern.</p>
    <div class="hh-workshop-layout"><div class="hh-workshop-drawing">
      <div class="hh-carving-toolbar" role="group" aria-label="Carving tools">
        <button type="button" data-tool="draw" aria-pressed="true">Freehand</button><button type="button" data-tool="points" aria-pressed="false">Point to point</button><button type="button" data-tool="patch" aria-pressed="false">Patch</button><button type="button" data-tool="move" aria-pressed="false">Move view</button>
      </div>
      <p class="hh-tool-help" aria-live="polite"></p>
      <div class="hh-carving-viewport"><canvas class="hh-carving-canvas" width="1024" height="832" tabindex="0" aria-label="Pumpkin carving canvas. Draw an outline, or use arrow keys and Space to place points, then Enter to cut."></canvas></div>
      <div class="hh-canvas-controls"><label>Zoom <select class="hh-zoom" aria-label="Carving zoom"><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option></select></label><button type="button" class="hh-undo" disabled>Undo</button><button type="button" class="hh-redo" disabled>Redo</button><button type="button" class="hh-clear">Reset pumpkin</button></div>
      <div class="hh-draft-actions" hidden><span>Dashed line shows where your shape closes.</span><button type="button" class="hh-close-cut hh-primary">Cut out shape</button><button type="button" class="hh-cancel-cut">Cancel shape</button></div>
      <p class="hh-carve-hint" role="status"></p>
    </div><div class="hh-bench-tools">
      <label>Optional face guide<select class="hh-stencil"><option value="free">My own design</option>${Object.entries(STENCILS).filter(([id]) => id !== "free").map(([id, s]) => `<option value="${id}">${s.name}</option>`).join("")}</select></label>
      <label class="hh-guide-toggle"><input type="checkbox" class="hh-show-guide" checked> Show dotted guide</label>
      <label>Candle color<select class="hh-glow"><option value="amber">Golden amber</option><option value="jade">Ghost jade</option><option value="violet">Witch violet</option></select></label>
      <label class="hh-guide-toggle"><input type="checkbox" class="hh-lit-preview" checked> Preview candlelight</label>
      <label>Lantern name<input class="hh-lantern-name" maxlength="24" value="Midnight mischief"></label>
      <div class="hh-workshop-reward"><strong>${practice ? "Make it your own" : "Your lantern earns"}</strong><p>${practice ? "Save your design to your lantern shelf. Try curves, sharp teeth, tiny stars, or a whole scene." : "+3 candy, one ghost shield, and 2 less fright. Lighting it uses 1 pumpkin and 1 wax."}</p></div>
      <details class="hh-carving-keys"><summary>Keyboard controls</summary><p>Arrows move the crosshair. Hold Shift for bigger steps or Alt for half-pixel steps. Space places a corner; Enter cuts the shape. Escape cancels an outline. Ctrl/Cmd+Z undoes; Shift+Ctrl/Cmd+Z redoes.</p></details>
    </div></div>
    <div class="hh-dialog-actions"><button type="button" class="hh-cancel-carve">Back without saving</button><button type="button" class="hh-primary hh-light" disabled>${practice ? "Save lantern" : "Light lantern"}</button></div>`;
  const $ = selector => root.querySelector(selector), work = $(".hh-carving-canvas"), viewport = $(".hh-carving-viewport"), context = work.getContext("2d");
  const draw = () => {
    if (disposed) return;
    const box = work.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(512, Math.round(box.width * dpr)), height = Math.round(width * CARVE_HEIGHT / CARVE_WIDTH);
    if (work.width !== width || work.height !== height) { work.width = width; work.height = height; }
    drawCarving(context, width, height, cuts, $(".hh-stencil").value, $(".hh-glow").value, $(".hh-show-guide").checked, cursor,
      { lit: $(".hh-lit-preview").checked, draft, pointsMode: tool === "points", falling });
    dirty = false;
  };
  function update() {
    const stats = carvingStats(cuts);
    $(".hh-undo").disabled = !undo.length && !draft.length;
    $(".hh-redo").disabled = !redo.length;
    $(".hh-light").disabled = !stats.ready || draft.length > 0;
    $(".hh-close-cut").disabled = draft.length < 3;
    $(".hh-draft-actions").hidden = !draft.length || tool === "draw";
    $(".hh-carve-hint").textContent = notice || (draft.length ? "Finish or cancel this outline before lighting your lantern." : stats.ready ? `${stats.count} cutout${stats.count === 1 ? "" : "s"}. Keep carving, or ${practice ? "save" : "light"} your lantern when you like it.` : "Make an eye-sized opening to light your pumpkin. Face guides are optional.");
    $(".hh-tool-help").textContent = { draw: "Drag an outline and release. The dashed line joins your last point to your first.", points: "Click each corner. Click the first point, double-click, or press Enter to cut out the shape.", patch: "Click an opening to put that piece back. Undo and Redo also repair mistakes.", move: "Drag to pan while zoomed in. Switch back to a carving tool to make cuts." }[tool];
    work.dataset.tool = tool;
    root.querySelectorAll("[data-tool]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tool === tool)));
    dirty = true;
  }
  function remember() { undo.push(cuts.slice()); if (undo.length > 40) undo.shift(); redo = []; }
  function commit() {
    const shape = makeCut(draft);
    if (!shape) { notice = "That outline is too small or flat. Draw a closed shape with some space inside."; draft = []; update(); return; }
    if (cuts.length >= MAX_CUTS) { notice = "This pumpkin has 60 pieces. Patch an opening or undo a cut to make room."; draft = []; update(); return; }
    remember(); cuts = [...cuts, shape]; draft = []; notice = "";
    falling = reducedMotion ? null : { points: shape, progress: 0 }; sound("cut"); update();
  }
  const point = e => { const r = work.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * CARVE_WIDTH, (e.clientY - r.top) / r.height * CARVE_HEIGHT]; };
  function addPoint(p) {
    p = facePoint(...p);
    if (!draft.length || Math.hypot(p[0] - draft.at(-1)[0], p[1] - draft.at(-1)[1]) >= .25) {
      if (draft.length < 8192) draft.push(p);
    }
  }
  function endPointer(e, cancel = false) {
    if (pointer !== e.pointerId) return;
    pointer = null; panStart = null;
    if (tool === "draw" && moving) { if (cancel) { draft = []; update(); } else { addPoint(point(e)); commit(); } }
    moving = false;
  }
  work.onpointerdown = e => {
    if (e.button !== 0 || pointer !== null) return;
    e.preventDefault(); work.focus({ preventScroll: true }); notice = "";
    const p = point(e); cursor = p;
    if (tool === "move") { pointer = e.pointerId; panStart = { x: e.clientX, y: e.clientY, left: viewport.scrollLeft, top: viewport.scrollTop }; work.setPointerCapture(pointer); return; }
    if (!insideFace(p)) { notice = "Start your cut on the orange part of the pumpkin."; update(); return; }
    if (tool === "patch") { const at = cutAt(cuts, p); if (at >= 0) { remember(); cuts = cuts.filter((_, i) => i !== at); falling = null; sound("cut"); } update(); return; }
    if (tool === "points") {
      if (draft.length >= 3 && Math.hypot(p[0] - draft[0][0], p[1] - draft[0][1]) < 7 / zoom) commit();
      else { addPoint(p); update(); } return;
    }
    pointer = e.pointerId; work.setPointerCapture(pointer); draft = []; addPoint(p); moving = true; update();
  };
  work.onpointermove = e => {
    if (tool === "move" && pointer === e.pointerId && panStart) { viewport.scrollLeft = panStart.left - (e.clientX - panStart.x); viewport.scrollTop = panStart.top - (e.clientY - panStart.y); return; }
    cursor = point(e); dirty = true;
    if (pointer !== e.pointerId || !moving) return;
    const samples = e.getCoalescedEvents?.() || [];
    for (const sample of samples.length ? samples : [e]) addPoint(point(sample));
  };
  work.onpointerup = e => endPointer(e);
  work.onpointercancel = e => endPointer(e, true);
  work.onlostpointercapture = e => { if (pointer === e.pointerId) endPointer(e, true); };
  work.onpointerleave = () => { if (pointer === null) { cursor = null; dirty = true; } };
  work.ondblclick = e => { if (tool === "points") { e.preventDefault(); if (draft.length >= 3) commit(); } };
  function undoCut() {
    if (draft.length) { draft = []; notice = "Unfinished outline canceled."; }
    else if (undo.length) { redo.push(cuts); cuts = undo.pop(); notice = "Cut undone."; }
    falling = null; update();
  }
  function redoCut() { if (redo.length) { undo.push(cuts); cuts = redo.pop(); notice = "Cut restored."; draft = []; falling = null; update(); } }
  work.onkeydown = e => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter", "Escape"].includes(e.code)) return;
    e.preventDefault(); e.stopPropagation();
    if (e.code === "Escape") { draft = []; notice = "Unfinished outline canceled."; update(); return; }
    cursor ||= [256, 210]; notice = "";
    if (e.code === "Enter") { commit(); return; }
    if (e.code === "Space") {
      if (tool === "patch") { const at = cutAt(cuts, cursor); if (at >= 0) { remember(); cuts = cuts.filter((_, i) => i !== at); } }
      else { tool = "points"; addPoint(cursor); } update(); return;
    }
    const step = e.altKey ? .5 : e.shiftKey ? 12 : 3;
    cursor = facePoint(cursor[0] + (e.code === "ArrowLeft" ? -step : e.code === "ArrowRight" ? step : 0), cursor[1] + (e.code === "ArrowUp" ? -step : e.code === "ArrowDown" ? step : 0)); dirty = true;
  };
  const keydown = e => { if (!(e.ctrlKey || e.metaKey) || e.code !== "KeyZ" || e.target.closest("input,select,textarea")) return; e.preventDefault(); e.shiftKey ? redoCut() : undoCut(); };
  root.addEventListener("keydown", keydown);
  root.querySelectorAll("button[data-tool]").forEach(b => b.onclick = () => { tool = b.dataset.tool; draft = []; notice = ""; update(); });
  $(".hh-undo").onclick = undoCut; $(".hh-redo").onclick = redoCut;
  $(".hh-clear").onclick = () => { if (cuts.length) remember(); cuts = []; draft = []; falling = null; notice = "Fresh pumpkin. Undo brings your design back."; update(); };
  $(".hh-close-cut").onclick = commit; $(".hh-cancel-cut").onclick = () => { draft = []; notice = ""; update(); };
  for (const input of root.querySelectorAll(".hh-stencil,.hh-glow,.hh-show-guide,.hh-lit-preview")) input.onchange = () => { dirty = true; };
  $(".hh-zoom").onchange = e => {
    const previous = zoom, x = (viewport.scrollLeft + viewport.clientWidth / 2) / previous, y = (viewport.scrollTop + viewport.clientHeight / 2) / previous;
    zoom = Number(e.target.value); work.style.width = `${zoom * 100}%`;
    viewport.scrollLeft = x * zoom - viewport.clientWidth / 2; viewport.scrollTop = y * zoom - viewport.clientHeight / 2;
    notice = zoom > 1 ? "Zoomed in. Use Move view to reach another part of the pumpkin." : ""; update();
  };
  $(".hh-cancel-carve").onclick = onCancel;
  $(".hh-light").onclick = () => {
    if (!carvingStats(cuts).ready || draft.length) return;
    onSave({ version: 3, cuts, stencil: $(".hh-stencil").value, glow: $(".hh-glow").value, name: $(".hh-lantern-name").value.trim().slice(0,24) || "Harvest lantern" });
  };
  const observer = new ResizeObserver(() => { dirty = true; }); observer.observe(viewport);
  update();
  return {
    render(dt) { if (falling) { falling.progress += dt * 2.8; if (falling.progress >= 1) falling = null; dirty = true; } if (dirty) draw(); },
    dispose() { disposed = true; observer.disconnect(); root.removeEventListener("keydown", keydown); },
  };
}
