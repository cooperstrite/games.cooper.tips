import { spotPicture } from "./spot-clash-engine.js";

export const SPOT_ATLAS = "assets/spot-clash-pictures.png";

// Center each crop on its illustration; the lower atlas rows are slightly closer together.
// The same crop is used on both cards and in results, with no image transformations.
export function spotArt(id) {
  const picture = spotPicture(id);
  if (!picture) return "";
  const x = picture.index % 5, y = Math.floor(picture.index / 5);
  let crop = y === 2 ? .185 : .2, centerX = .1 + x * .2;
  const centerY = [.1, .3, .49, .674, .876][y];
  // Give the wider planet and whale room, and exclude neighboring drop shadows.
  if (id === "planet") { crop = .193; centerX = .31; }
  if (id === "whale") { crop = .205; centerX = .706; }
  if (id === "boat") crop = .188;
  if (id === "key") { crop = .18; centerX = .305; }
  return `<span class="scg-picture" aria-hidden="true" style="background-size:${100 / crop}%;background-position:${(centerX - crop / 2) / (1 - crop) * 100}% ${(centerY - crop / 2) / (1 - crop) * 100}%"></span>`;
}

export function spotAvatar(computer = false) {
  return computer
    ? '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 9V5m-3 0h6"/><rect x="8" y="12" width="32" height="27" rx="10"/><path d="M4 22v9m40-9v9M18 31h12"/><circle cx="17" cy="23" r="2"/><circle cx="31" cy="23" r="2"/></svg>'
    : '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="16" r="8"/><path d="M8 41v-4a16 16 0 0 1 32 0v4"/><path d="m33 7 2-4m4 10 4-1"/></svg>';
}
