import { drawBirdPreview } from "../flappy-appearance.js";
import { drawArcherPreview, drawBowPreview, drawArrow } from "../archery-appearance.js";

// The studio uses the same painters/SVG as gameplay, with no game world or input.
export function createCharacterPortrait(root) {
  let gameId, appearance, focus = "body", canvas;
  function draw(time = 0) {
    if (!appearance) return;
    if (gameId === "flappy") drawBirdPreview(canvas, appearance, time);
    else if (gameId === "archery") {
      if (focus === "equipment") {
        drawBowPreview(canvas, appearance);
        const context = canvas.getContext("2d"), ratio = canvas.width / 300;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        drawArrow(context, 245, 163, 0, appearance, 1.4);
      } else drawArcherPreview(canvas, appearance, focus === "face" ? "face" : "body");
    }
  }
  return {
    update(id, next, nextFocus) {
      gameId = id; appearance = next; focus = nextFocus;
      root.replaceChildren(); canvas = null;
      root.dataset.game = id;
      if (id === "flappy" || id === "archery") {
        canvas = document.createElement("canvas");
        canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", "Your customized character in the game's original 2D artwork");
        root.append(canvas); draw();
      } else next.portrait2D(root, focus);
    },
    animate(time) { if (gameId === "flappy") draw(time); },
  };
}
