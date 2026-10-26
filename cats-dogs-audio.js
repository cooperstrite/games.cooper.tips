export function createTugAudio() {
  let context, enabled = true, music = false, disposed = false;
  const nodes = new Set();
  function unlock() {
    if (disposed || (!enabled && !music)) return;
    try { context ||= new (window.AudioContext || window.webkitAudioContext)(); context.resume().catch(() => {}); } catch {}
  }
  function tone(frequency, duration, volume = .07, type = "sine", offset = 0, slide = 0) {
    if (!context || disposed || context.state !== "running") return;
    const oscillator = context.createOscillator(), gain = context.createGain(), at = context.currentTime + offset;
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, at);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(slide, at + duration);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + .012); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(gain); gain.connect(context.destination); nodes.add(oscillator);
    oscillator.onended = () => { nodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(at); oscillator.stop(at + duration + .03);
  }
  function stop() { for (const node of nodes) { try { node.stop(); } catch {} } nodes.clear(); }
  return {
    unlock, stop,
    configure(soundOn, musicOn) { enabled = soundOn; music = musicOn; stop(); },
    play(kind) {
      if (!enabled) return;
      if (kind === "beat") { tone(690, .07, .035, "sine"); return; }
      if (kind === "gadget") { tone(420,.18,.055,"triangle",0,1100);tone(980,.12,.035,"sine",.12,240);return; }
      if (kind === "pull") { tone(185, .12, .06, "triangle", 0, 92); return; }
      if (kind === "perfect") { tone(660, .12, .055); tone(990, .16, .04, "sine", .045); return; }
      if (kind === "burst") { [523,659,784,1046].forEach((f,i) => tone(f,.22,.045,"triangle",i*.055)); return; }
      if (kind === "win") { [523,659,784,1046,784,1046].forEach((f,i) => tone(f,.27,.075,"triangle",i*.14)); return; }
      if (kind === "lose") { [440,370,294].forEach((f,i) => tone(f,.25,.055,"triangle",i*.16)); return; }
      tone(330,.1,.04,"triangle");
    },
    beat(index) { if (music) { const notes = [196,247,294,247,220,262,330,262]; tone(notes[index % notes.length],.4,.025,"triangle"); tone(notes[index % notes.length]*2,.22,.018,"sine",.18); } },
    dispose() { disposed = true; stop(); context?.close().catch(() => {}); },
  };
}
