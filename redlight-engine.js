// One clock and rules model for both renderers. Distances are meters; time is seconds.
export const REDLIGHT_COURSES = Object.freeze({
  sprint: { label: "Sprint 50m", distance: 50 },
  dash: { label: "Dash 100m", distance: 100 },
  circuit: { label: "Circuit 150m", distance: 150 },
  marathon: { label: "Marathon 200m", distance: 200 },
  ultra: { label: "Ultra 300m", distance: 300 },
  endless: { label: "Endless run", distance: Infinity },
});
export const RUN_SPEED = 18;

export class RedlightRace {
  constructor({ course = "dash", random = Math.random } = {}) {
    this.random = random;
    this.reset(course);
  }
  reset(course = this.course) {
    this.course = Object.hasOwn(REDLIGHT_COURSES, course) ? course : "dash";
    this.target = REDLIGHT_COURSES[this.course].distance;
    this.phase = "idle"; this.remaining = 0; this.distance = 0; this.elapsed = 0;
    this.held = false; this.paused = false; this.stride = 0;
  }
  get active() { return ["countdown", "green", "red"].includes(this.phase); }
  get running() { return this.phase === "green" && this.held && !this.paused; }
  get signal() {
    if (this.phase === "countdown") return "amber";
    if (this.phase === "green") return this.remaining <= .5 + 1e-9 ? "amber" : "green";
    if (this.phase === "caught" || this.phase === "red") return "red";
    return this.phase === "finished" ? "green" : "idle";
  }
  start() { this.reset(); this.phase = "countdown"; this.remaining = 3; }
  hold(held) {
    if (!held) { this.held = false; return; }
    if (this.paused || !["green", "red"].includes(this.phase)) return;
    this.held = true;
    if (this.phase === "red") this.catch();
  }
  catch() { this.phase = "caught"; this.held = false; this.remaining = 0; }
  pause() { if (this.active) { this.paused = true; this.held = false; } }
  resume() { this.held = false; this.paused = false; }
  nextPhase() {
    if (this.phase === "countdown" || this.phase === "red") {
      this.phase = "green"; this.remaining = 1.5 + this.random() * 2;
    } else {
      this.phase = "red"; this.remaining = .9 + this.random() * 1.3;
      if (this.held) this.catch();
    }
  }
  step(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0 || this.paused) return;
    // Split at every signal boundary, so low frame rates cannot skip a red light
    // or move the runner past the finish before the stop rule is checked.
    let left = seconds;
    while (left > 1e-9 && this.active) {
      const finishIn = this.running ? Math.max(0, this.target - this.distance) / RUN_SPEED : Infinity;
      const chunk = Math.min(left, this.remaining, finishIn);
      if (this.phase !== "countdown") this.elapsed += chunk;
      if (this.running) { this.distance += chunk * RUN_SPEED; this.stride += chunk * 13; }
      this.remaining -= chunk; left -= chunk;
      if (this.running && this.distance >= this.target - 1e-8) {
        this.distance = this.target; this.phase = "finished"; this.held = false; this.remaining = 0;
      } else if (this.remaining <= 1e-9) this.nextPhase();
    }
  }
}
