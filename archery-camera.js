import { clamp } from "./archery-engine.js";

// World axes: x runs down the range, y is height, and z runs across it.
export function createRangeCamera(width, height, zoom = 1) {
  const focal = height * 1.08 * zoom;
  const horizon = height * 0.43;
  const position = { x: -1.25, y: 2.25, z: 0.28 };
  return {
    focal, horizon, position,
    project({ x, y, z = 0 }) {
      const depth = x - position.x;
      if (depth < 0.12) return null;
      return { x: width / 2 + (z - position.z) * focal / depth, y: horizon - (y - position.y) * focal / depth, depth, scale: focal / depth };
    },
  };
}

export function firstPersonAim(startAngle, startY, currentY, sceneHeight) {
  return clamp(startAngle + (startY - currentY) / Math.max(1, sceneHeight) * 60, 2, 65);
}
