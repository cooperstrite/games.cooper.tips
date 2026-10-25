export function createMemoryAudio() {
  let context, disposed = false;
  const voices = new Set();
  function silence() {
    for (const voice of voices) { try { voice.source.stop(); } catch {} voice.source.disconnect(); voice.gain.disconnect(); }
    voices.clear();
  }
  return {
    unlock() {
      if (disposed) return;
      try {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!context && Audio) context = new Audio();
        if (context?.state === "suspended") context.resume().catch(() => {});
      } catch { /* The game is playable without audio. */ }
    },
    play(kind) {
      if (disposed || context?.state !== "running") return;
      const notes = kind === "win" ? [523, 659, 784, 1047] : kind === "match" ? [660, 880] : kind === "miss" ? [220] : [420];
      notes.forEach((note, i) => {
        const source = context.createOscillator(), gain = context.createGain(), voice = { source, gain };
        const at = context.currentTime + i * .1, duration = kind === "flip" ? .065 : .22;
        source.type = "sine"; source.frequency.setValueAtTime(note, at);
        source.frequency.exponentialRampToValueAtTime(kind === "flip" ? 180 : note, at + duration);
        gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.07, at + .008); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
        source.connect(gain); gain.connect(context.destination); voices.add(voice);
        source.onended = () => { source.disconnect(); gain.disconnect(); voices.delete(voice); };
        source.start(at); source.stop(at + duration + .01);
      });
    },
    silence,
    dispose() { disposed = true; silence(); context?.close().catch(() => {}); },
  };
}
