export function createDriveAudio(preferences = {}) {
  let context = null;
  let musicBus = null;
  let effectsBus = null;
  let engine = null;
  let engineGain = null;
  let noise = null;
  let timer = null;
  let running = false;
  let step = 0;
  let nextBeat = 0;
  let route = "expressway";
  let musicEnabled = preferences.music !== false;
  let effectsEnabled = preferences.effects !== false;
  let disposed = false;

  function ensureContext() {
    if (disposed) return false;
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      context = new AudioContextClass();
      musicBus = context.createGain();
      musicBus.gain.value = 0;
      effectsBus = context.createGain();
      effectsBus.gain.value = effectsEnabled ? 0.22 : 0;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -18;
      limiter.ratio.value = 6;
      musicBus.connect(limiter);
      effectsBus.connect(limiter);
      limiter.connect(context.destination);
      noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
      engine = context.createOscillator();
      engine.type = "sawtooth";
      engine.frequency.value = 42;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 220;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engine.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(effectsBus);
      engine.start();
    }
    context.resume().catch(() => {});
    return true;
  }

  function tone(frequency, time, duration, volume, type = "sine", bus = musicBus, endFrequency = frequency) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(12, endFrequency), time + duration);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + Math.min(0.015, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(gain);
    gain.connect(bus);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  function hiss(time, duration, volume, frequency, bus = effectsBus, pan = 0) {
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(frequency, time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(100, frequency * 0.2), time + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    let panner = null;
    if (context.createStereoPanner) {
      panner = context.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      panner.connect(bus);
    } else gain.connect(bus);
    source.start(time);
    source.stop(time + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); panner?.disconnect(); };
  }

  function scheduleMusic() {
    if (!context || !running || !musicEnabled || disposed) return;
    const beatLength = 60 / (route === "country" ? 104 : route === "alpine" ? 96 : 118) / 2;
    if (nextBeat < context.currentTime) nextBeat = context.currentTime + 0.04;
    const bass = [55, 55, 65.41, 65.41, 43.65, 43.65, 49, 49];
    const melody = [220, 0, 329.63, 293.66, 0, 261.63, 329.63, 0, 196, 0, 261.63, 293.66, 0, 220, 196, 0];
    while (nextBeat < context.currentTime + 0.22) {
      const index = step % 16;
      const root = bass[Math.floor(index / 2)];
      tone(root, nextBeat, beatLength * 0.9, 0.22, "triangle");
      if (melody[index]) tone(melody[index], nextBeat, beatLength * 1.8, 0.055, "triangle");
      if (index % 4 === 0) tone(110, nextBeat, 0.16, 0.25, "sine", musicBus, 35);
      if (index % 4 === 2) hiss(nextBeat, 0.09, 0.1, 1800, musicBus);
      hiss(nextBeat, 0.035, 0.025, 6500, musicBus);
      step += 1;
      nextBeat += beatLength;
    }
  }

  function start(routeId) {
    if (!ensureContext()) return;
    running = true;
    route = routeId;
    step = 0;
    nextBeat = context.currentTime + 0.05;
    musicBus.gain.setTargetAtTime(musicEnabled ? 0.3 : 0, context.currentTime, 0.1);
    if (!timer) timer = window.setInterval(scheduleMusic, 90);
    scheduleMusic();
  }

  function stop() {
    running = false;
    if (timer) window.clearInterval(timer);
    timer = null;
    if (!context) return;
    musicBus.gain.setTargetAtTime(0, context.currentTime, 0.15);
    engineGain.gain.setTargetAtTime(0, context.currentTime, 0.1);
  }

  function effect(kind, pan = 0) {
    if (!effectsEnabled || !context || disposed) return;
    const now = context.currentTime;
    if (kind === "crash") {
      hiss(now, 0.95, 0.9, 1400);
      tone(100, now, 0.85, 0.65, "sine", effectsBus, 18);
      hiss(now + 0.06, 0.45, 0.3, 5000);
    } else if (kind === "boost" || kind === "nitro") {
      hiss(now, kind === "nitro" ? 0.8 : 0.4, 0.22, 3300);
      tone(90, now, 0.3, 0.12, "triangle", effectsBus, 280);
    } else if (kind === "pass") {
      hiss(now, 0.35, 0.12, 2200, effectsBus, pan);
    } else if (kind === "finish") {
      [261.63, 329.63, 392, 523.25].forEach((note, i) => tone(note, now + i * 0.13, 0.5, 0.18, "triangle", effectsBus));
    } else {
      const descending = kind === "phase";
      [330, 440, 660].forEach((note, i) => tone(note, now + i * 0.07, 0.3, 0.1, "sine", effectsBus, descending ? note / 2 : note * 1.15));
    }
  }

  return {
    start, stop, effect,
    update(speed, boosting) {
      if (!context || !running) return;
      engine.frequency.setTargetAtTime(35 + speed * 1.5, context.currentTime, 0.12);
      engineGain.gain.setTargetAtTime(effectsEnabled ? boosting ? 0.12 : 0.065 : 0, context.currentTime, 0.1);
    },
    setMusic(enabled) {
      musicEnabled = Boolean(enabled);
      if (!context) return;
      musicBus.gain.setTargetAtTime(running && musicEnabled ? 0.3 : 0, context.currentTime, 0.05);
      if (running && musicEnabled) { ensureContext(); nextBeat = context.currentTime + 0.04; scheduleMusic(); }
    },
    setEffects(enabled) {
      effectsEnabled = Boolean(enabled);
      if (context) effectsBus.gain.setTargetAtTime(effectsEnabled ? 0.22 : 0, context.currentTime, 0.03);
    },
    dispose() {
      stop();
      disposed = true;
      if (context) { engine.stop(); context.close().catch(() => {}); }
    },
  };
}
