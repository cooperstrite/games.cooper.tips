import { createRunwayAudio } from "./runway-audio.js";

export function createFreeFlightAudio({ effects = true } = {}) {
  const flight = createRunwayAudio({ voice: false, effects });
  let context = null, disposed = false;
  const active = new Set();
  function start() {
    flight.start();
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!context && Audio) context = new Audio();
      if (context?.state === "suspended") context.resume().catch(() => {});
    } catch { /* Audio is optional. */ }
  }
  function stopCrash() { for (const source of active) { try { source.stop(); } catch { /* Already finished. */ } } active.clear(); }
  function crash() {
    if (!context || !effects || disposed) return;
    stopCrash();
    const duration = 1.5, buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate), data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / context.sampleRate, noise = Math.random() * 2 - 1;
      last = (last + noise * .3) / 1.3;
      const crack = Math.exp(-t * 55) * .5, scatter = [.16, .31, .5, .72].reduce((sum, at) => sum + Math.exp(-Math.pow((t - at) * 60, 2)) * .08, 0);
      data[i] = last * Math.pow(1 - i / data.length, 1.5) + noise * (crack + scatter);
    }
    const source = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
    source.buffer = buffer; filter.type = "lowpass"; filter.frequency.setValueAtTime(4800, context.currentTime); filter.frequency.exponentialRampToValueAtTime(180, context.currentTime + duration);
    gain.gain.setValueAtTime(.3, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
    source.connect(filter); filter.connect(gain); gain.connect(context.destination); source.start(); active.add(source);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); active.delete(source); };
    const boom = context.createOscillator(), bass = context.createGain(); boom.frequency.setValueAtTime(65, context.currentTime); boom.frequency.exponentialRampToValueAtTime(24, context.currentTime + .6);
    bass.gain.setValueAtTime(.18, context.currentTime); bass.gain.exponentialRampToValueAtTime(.001, context.currentTime + .8);
    boom.connect(bass); bass.connect(context.destination); boom.start(); boom.stop(context.currentTime + .85); active.add(boom);
    boom.onended = () => { boom.disconnect(); bass.disconnect(); active.delete(boom); };
  }
  return { start, crash, effect: flight.effect,
    update(state) { flight.update(state.phase === "parked" ? { ...state, phase: "rollout" } : state); },
    setEffects(value) { effects = value; flight.setEffects(value); if (!value) stopCrash(); },
    pause() { flight.pause(); if (context?.state === "running") context.suspend().catch(() => {}); },
    dispose() { disposed = true; stopCrash(); flight.dispose(); if (context && context.state !== "closed") context.close().catch(() => {}); },
  };
}
