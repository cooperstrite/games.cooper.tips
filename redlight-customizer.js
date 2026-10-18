import { RUNNER_OPTIONS, RUNNER_COLOR_LABELS, DEFAULT_RUNNER, loadRunnerAppearance, readRunnerAppearance, saveRunnerAppearance } from "./redlight-appearance.js";

export function createRunnerCustomizer(root, onAppearanceChange = () => {}) {
  const wrapper = document.createElement("section"); wrapper.className = "rlgl-customizer";
  const labels = { runner: "Outfit", build: "Body build", hair: "Hair style", facialHair: "Facial hair", headwear: "Headwear", eyewear: "Eyewear", wristwear: "Wrist accessories" };
  wrapper.innerHTML = `<p class="arcade-eyebrow">YOUR RUNNER</p><h3>Ready, set, style.</h3><p class="help-text">Every look is free. Your runner appears in both game views. Outfits, hair, and colors can all be changed independently.</p>
    <fieldset><legend>Outfit &amp; appearance</legend><div class="rlgl-customizer-grid">${Object.entries(RUNNER_OPTIONS).map(([slot, choices]) => `<label>${labels[slot]}<select aria-label="${labels[slot]}" data-slot="${slot}">${Object.entries(choices).map(([value,label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>`).join("")}</div></fieldset>
    <fieldset><legend>Individual colors</legend><div class="rlgl-color-grid">${Object.entries(RUNNER_COLOR_LABELS).map(([slot,label]) => `<label><span>${label}</span><input type="color" aria-label="${label}" data-color="${slot}"></label>`).join("")}</div></fieldset>
    <div class="rlgl-customizer-footer"><button type="button" class="ghost-btn">Reset runner</button><p role="status">Saved automatically on this device.</p></div>`;
  root.append(wrapper);
  let appearance = loadRunnerAppearance();
  const status=wrapper.querySelector("[role=status]");
  function sync() {
    wrapper.querySelectorAll("[data-slot]").forEach(input => { input.value = appearance[input.dataset.slot]; });
    wrapper.querySelectorAll("[data-color]").forEach(input => { input.value = appearance.colors[input.dataset.color]; });
    onAppearanceChange(readRunnerAppearance(appearance));
  }
  function save() {
    status.textContent = saveRunnerAppearance(appearance) ? "Saved automatically on this device." : "This browser could not save the look. Your preview still works.";
    onAppearanceChange(readRunnerAppearance(appearance));
  }
  wrapper.addEventListener("input", event => {
    const input=event.target;
    if (input.dataset.slot) appearance[input.dataset.slot]=input.value;
    else if (input.dataset.color) appearance.colors[input.dataset.color]=input.value;
    else return;
    save();
  });
  wrapper.querySelector("button").addEventListener("click", () => { appearance=readRunnerAppearance(DEFAULT_RUNNER); sync(); save(); });
  sync();
  return () => wrapper.remove();
}
