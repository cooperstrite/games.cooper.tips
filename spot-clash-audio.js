export function createSpotAudio() {
  let context, enabled = true, disposed = false;
  const voices = new Set();
  try { enabled = localStorage.getItem("cooper-spot-clash-sound-v1") !== "off"; } catch {}
  function unlock() {
    if (!enabled || disposed) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!context && Audio) context = new Audio();
      if (context?.state === "suspended") context.resume().catch(() => {});
    } catch {}
  }
  function silence() { for (const source of voices) { try { source.stop(); } catch {} } voices.clear(); }
  function play(kind) {
    if (!enabled || disposed || context?.state !== "running") return;
    const notes = { deal: [440], you: [523.25, 783.99], computer: [349.23, 293.66],
      win: [523.25, 659.25, 783.99, 1046.5], lose: [392, 329.63, 261.63] }[kind] || [];
    notes.forEach((hz, index) => {
      const source = context.createOscillator(), gain = context.createGain(), at = context.currentTime + index * .12;
      const duration = kind === "deal" ? .09 : .35;
      source.type = "sine"; source.frequency.setValueAtTime(hz, at);
      gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.065, at + .012); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      source.connect(gain).connect(context.destination); source.start(at); source.stop(at + duration + .03); voices.add(source);
      source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); };
    });
  }
  return { unlock, play, silence, get enabled() { return enabled; },
    toggle() { enabled = !enabled; if (enabled) unlock(); else silence(); try { localStorage.setItem("cooper-spot-clash-sound-v1", enabled ? "on" : "off"); } catch {} },
    dispose() { disposed = true; silence(); context?.close().catch(() => {}); },
  };
}
