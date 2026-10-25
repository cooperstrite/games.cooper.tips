import { memorySet } from "./memory-config.js";

// All three atlases use identical 4 x 3 cells. Card identities stay in the model.
export function memoryPicture(setId, index) {
  const set = memorySet(setId), cell = Math.max(0, Math.min(11, Math.trunc(index) || 0));
  // An inset keeps the neighboring illustration out of a card's crop.
  return `<span class="ml-picture" aria-hidden="true" style="background-image:url('${set.image}');background-position:${(cell % 4 + .05) * 100 / 3.1}% ${(Math.floor(cell / 4) + .05) * 100 / 2.1}%"></span>`;
}
export function memoryMedallion() {
  return '<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="33"/><circle cx="40" cy="40" r="28"/><path d="M40 40C32 24 12 25 12 40C12 55 32 56 40 40C48 24 68 25 68 40C68 55 48 56 40 40"/><path d="M40 2v9m0 58v9M2 40h9m58 0h9"/></svg>';
}
export function memoryFan(set = "wonders", back = "atlas", backsOnly = false) {
  return `<div class="ml-fan" aria-hidden="true">${[0, 1, 2].map((value, i) => `<div class="ml-sample ${backsOnly || i === 0 ? "ml-pattern" : ""}" data-back="${back}">${backsOnly || i === 0 ? memoryMedallion() : memoryPicture(set, i === 1 ? 0 : 2)}</div>`).join("")}</div>`;
}
export function memoryShopArt(item) {
  return `<div class="ml-shop-art" role="img" aria-label="${item.name} preview">${memoryFan(item.setting === "set" ? item.value : "wonders", item.setting === "back" ? item.value : "atlas", item.setting === "back")}</div>`;
}
