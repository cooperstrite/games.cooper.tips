// Small, soft switch clicks and a resolving chime, synthesized entirely in-browser.
export function createLightsAudio(enabled = true) {
  let context, volume, disposed = false;
  const voices = new Set();
  function start() {
    if (!enabled || disposed) return false;
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!context) { if (!Audio) return false; context = new Audio(); volume = context.createGain(); volume.gain.value = .24; volume.connect(context.destination); }
      context.resume().catch(() => {}); return true;
    } catch { return false; }
  }
  function tone(frequency, delay, duration, gain, type = 'sine') {
    const time = context.currentTime + delay, source = context.createOscillator(), envelope = context.createGain();
    source.type = type; source.frequency.setValueAtTime(frequency, time);
    envelope.gain.setValueAtTime(.0001, time); envelope.gain.exponentialRampToValueAtTime(gain, time + .008); envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(envelope); envelope.connect(volume); voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); envelope.disconnect(); };
    source.start(time); source.stop(time + duration + .02);
  }
  function stop() { for (const voice of voices) try { voice.stop(); } catch { /* Already ended. */ } }
  return {
    get enabled() { return enabled; },
    setEnabled(value) { enabled = !!value; if (!enabled) stop(); },
    tap(darker) { if (!start()) return; tone(darker ? 310 : 360, 0, .065, .22, 'triangle'); tone(darker ? 620 : 720, .012, .11, .035); },
    hint() { if (start()) tone(660, 0, .22, .11); },
    win() { if (start()) [392, 523.25, 659.25, 783.99].forEach((note, i) => tone(note, i * .12, .8, .13)); },
    stop,
    dispose() { disposed = true; stop(); context?.close().catch(() => {}); context = null; },
  };
}
