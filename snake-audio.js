export function createSnakeAudio(preferences = {}) {
  let context = null;
  let musicBus = null;
  let effectsBus = null;
  let noise = null;
  let timer = null;
  let playing = false;
  let musicEnabled = preferences.music === true;
  let effectsEnabled = preferences.effects !== false;
  let nextNote = 0;
  let step = 0;
  let disposed = false;
  const voices = new Set();

  function unlock() {
    if (disposed || (!musicEnabled && !effectsEnabled)) return false;
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      try {
        context = new AudioContextClass();
        musicBus = context.createGain();
        musicBus.gain.value = 0;
        effectsBus = context.createGain();
        effectsBus.gain.value = effectsEnabled ? 0.32 : 0;
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.ratio.value = 4;
        musicBus.connect(compressor);
        effectsBus.connect(compressor);
        compressor.connect(context.destination);
        noise = context.createBuffer(1, context.sampleRate * 0.25, context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
      } catch {
        context?.close().catch(() => {});
        context = null;
        return false;
      }
    }
    context.resume().catch(() => {});
    return true;
  }

  function connectVoice(source, gain, bus, duration, time, filter = null) {
    if (filter) { source.connect(filter); filter.connect(gain); }
    else source.connect(gain);
    gain.connect(bus);
    voices.add(source);
    source.onended = () => {
      voices.delete(source);
      source.disconnect();
      gain.disconnect();
      filter?.disconnect();
    };
    source.start(time);
    source.stop(time + duration + 0.02);
  }

  function tone(frequency, time, duration, volume, bus = musicBus, type = "triangle", endFrequency = frequency) {
    const source = context.createOscillator();
    source.type = type;
    source.frequency.setValueAtTime(frequency, time);
    source.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    connectVoice(source, gain, bus, duration, time);
  }

  function crunch(time, duration, volume, frequency) {
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    connectVoice(source, gain, effectsBus, duration, time, filter);
  }

  function scheduleMusic() {
    if (!context || !playing || !musicEnabled || document.hidden || disposed) return;
    const beat = 60 / 100 / 2;
    const melody = [523.25, 0, 659.25, 783.99, 0, 659.25, 587.33, 0,
      440, 0, 523.25, 659.25, 783.99, 0, 659.25, 0,
      587.33, 0, 783.99, 880, 0, 783.99, 659.25, 0,
      523.25, 659.25, 587.33, 0, 392, 0, 523.25, 0];
    const bass = [130.81, 174.61, 196, 130.81];
    if (nextNote < context.currentTime) nextNote = context.currentTime + 0.025;
    while (nextNote < context.currentTime + 0.18) {
      const index = step % melody.length;
      if (melody[index]) {
        tone(melody[index], nextNote, 0.33, 0.12);
        tone(melody[index] * 2, nextNote + 0.015, 0.16, 0.025, musicBus, "sine");
      }
      if (index % 4 === 0) tone(bass[Math.floor(index / 8)], nextNote, 0.7, 0.16, musicBus, "sine");
      if (index % 4 === 2) tone(bass[Math.floor(index / 8)] * 2, nextNote, 0.22, 0.05, musicBus, "sine");
      step += 1;
      nextNote += beat;
    }
  }

  function syncMusic() {
    const audible = playing && musicEnabled && !document.hidden && !disposed;
    if (context) musicBus.gain.setTargetAtTime(audible ? 0.3 : 0, context.currentTime, 0.035);
    if (audible && context && !timer) {
      nextNote = context.currentTime + 0.03;
      timer = window.setInterval(scheduleMusic, 80);
      scheduleMusic();
    } else if (!audible && timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function effect(kind) {
    if (!effectsEnabled || document.hidden || !unlock()) return;
    const now = context.currentTime;
    if (kind === "eat") {
      crunch(now, 0.09, 0.22, 1600);
      crunch(now + 0.06, 0.07, 0.12, 2400);
      tone(659.25, now, 0.12, 0.16, effectsBus, "sine");
      tone(987.77, now + 0.07, 0.19, 0.12, effectsBus, "sine");
    } else if (kind === "crash") {
      crunch(now, 0.2, 0.28, 650);
      tone(180, now, 0.35, 0.28, effectsBus, "triangle", 55);
      tone(130, now + 0.12, 0.35, 0.16, effectsBus, "sine", 45);
    } else if (kind === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((note, index) => tone(note, now + index * 0.12, 0.4, 0.16, effectsBus));
    } else if (kind === "go") {
      tone(523.25, now, 0.18, 0.16, effectsBus, "sine");
      tone(783.99, now + 0.08, 0.25, 0.12, effectsBus, "sine");
    } else if (kind === "count") {
      tone(392, now, 0.12, 0.12, effectsBus, "sine", 330);
    } else if (kind === "turn") {
      tone(440, now, 0.055, 0.035, effectsBus, "sine", 550);
    }
  }

  document.addEventListener("visibilitychange", syncMusic);

  return {
    unlock, effect,
    setPlaying(value) {
      if (playing === Boolean(value)) return;
      playing = Boolean(value);
      syncMusic();
    },
    setMusic(enabled) {
      musicEnabled = Boolean(enabled);
      if (musicEnabled) unlock();
      syncMusic();
    },
    setEffects(enabled) {
      effectsEnabled = Boolean(enabled);
      if (effectsEnabled) unlock();
      if (context) effectsBus.gain.setTargetAtTime(effectsEnabled ? 0.32 : 0, context.currentTime, 0.015);
    },
    dispose() {
      disposed = true;
      playing = false;
      syncMusic();
      document.removeEventListener("visibilitychange", syncMusic);
      voices.forEach((voice) => { try { voice.stop(); } catch { /* Already finished. */ } });
      voices.clear();
      context?.close().catch(() => {});
    },
  };
}
