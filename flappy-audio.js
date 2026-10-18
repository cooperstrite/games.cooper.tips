export function createFlappyAudio(initiallyEnabled = true) {
  let enabled = initiallyEnabled, paused = false, context = null, master = null, disposed = false;
  const active = new Set();
  function unlock() {
    if (disposed || !enabled) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!context) { context = new Audio(); master = context.createGain(); master.gain.value = 0.45; master.connect(context.destination); }
      if (context.state === "suspended") context.resume().catch(() => {});
    } catch { /* Audio support is optional; flight remains playable. */ }
  }
  function volume() { if (master && context.state !== "closed") { master.gain.cancelScheduledValues(context.currentTime); master.gain.setTargetAtTime(enabled && !paused ? 0.45 : 0, context.currentTime, 0.008); } }
  function tone(start, end, duration, type, gain, delay = 0) {
    if (!enabled || paused || disposed || !context || context.state === "closed") return;
    const oscillator = context.createOscillator(), envelope = context.createGain(), now = context.currentTime + delay;
    oscillator.type = type; oscillator.frequency.setValueAtTime(start, now); oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    envelope.gain.setValueAtTime(0, now); envelope.gain.linearRampToValueAtTime(gain, now + 0.006); envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope); envelope.connect(master); active.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); active.delete(oscillator); };
    oscillator.start(now); oscillator.stop(now + duration + 0.01);
  }
  return {
    unlock,
    setEnabled(value) { enabled = Boolean(value); volume(); },
    setPaused(value) { paused = Boolean(value); volume(); },
    flap() { tone(740, 230, 0.105, "square", 0.09); tone(380, 180, 0.12, "triangle", 0.13); },
    score() { tone(1046, 1046, 0.15, "sine", 0.25); tone(1568, 1568, 0.22, "sine", 0.12, 0.065); },
    crash() { tone(330, 70, 0.45, "triangle", 0.22); tone(125, 40, 0.12, "square", 0.08); },
    purchase() { tone(659, 659, 0.12, "sine", 0.2); tone(880, 880, 0.16, "sine", 0.2, 0.09); tone(1318, 1318, 0.25, "sine", 0.15, 0.18); },
    destroy() { disposed = true; active.forEach(node => { node.onended = null; try { node.stop(); } catch { /* Already ended. */ } node.disconnect(); }); active.clear(); if (context) { master.disconnect(); context.close().catch(() => {}); } context = null; master = null; },
  };
}
