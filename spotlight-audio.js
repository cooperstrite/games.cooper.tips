// Small synthesized cues and a richer curtain-call fanfare; no audio downloads.
export function createSpotlightAudio(isEnabled) {
  let context = null;
  const sources = new Set();
  function stop() {
    for (const source of sources) { try { source.stop(); } catch { /* Already ended. */ } }
    sources.clear();
  }
  function play(kind) {
    if (!isEnabled()) return;
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      context ||= new Audio(); context.resume().catch(() => {});
      const start = context.currentTime + .02;
      function connect(source, at, duration, volume, filter = null) {
        const gain = context.createGain();
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(volume, at + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
        source.connect(filter || gain); if (filter) filter.connect(gain);
        gain.connect(context.destination); sources.add(source);
        source.onended = () => { sources.delete(source); source.disconnect(); filter?.disconnect(); gain.disconnect(); };
        source.start(at); source.stop(at + duration + .03);
      }
      function tone(frequency, delay, duration = .4, volume = .04, type = "sine", endFrequency = frequency) {
        const osc = context.createOscillator(), at = start + delay; osc.type = type;
        osc.frequency.setValueAtTime(frequency, at);
        if (endFrequency !== frequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
        connect(osc, at, duration, volume);
      }
      function shimmer(delay, duration, frequency, volume) {
        const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const source = context.createBufferSource(), filter = context.createBiquadFilter(); source.buffer = buffer;
        filter.type = "bandpass"; filter.frequency.value = frequency; filter.Q.value = .7;
        connect(source, start + delay, duration, volume, filter);
      }
      if (kind === "win") {
        stop();
        [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((frequency, i) => tone(frequency, i * .095, .55, .035));
        [261.63, 329.63, 392, 523.25].forEach(frequency => tone(frequency, .56, 1.55, .023, "triangle"));
        tone(130.81, .56, 1.2, .045); shimmer(.52, .6, 3300, .03);
        [2093, 2637.02, 3135.96].forEach((frequency, i) => tone(frequency, .95 + i * .14, .7, .013));
      } else if (kind === "lose") {
        stop();
        [392, 329.63, 261.63].forEach((frequency, i) => tone(frequency, i * .16, .38, .05, "triangle"));
        tone(196, .44, 1.05, .045, "sine", 130.81);
        tone(293.66, .46, 1.2, .02); shimmer(.2, .65, 900, .035);
      } else {
        const notes = kind === "miss" ? [180] : kind === "hint" ? [440, 554.37] : [659.25, 880];
        notes.forEach((frequency, i) => tone(frequency, i * .095, .28, .05));
      }
    } catch { /* Visual feedback remains available if audio is unavailable. */ }
  }
  return { play, stop, dispose() { stop(); context?.close().catch(() => {}); } };
}
