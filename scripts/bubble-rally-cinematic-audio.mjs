// Original, synthesized stereo effects for the seven-second finish films.
// Usage: node scripts/bubble-rally-cinematic-audio.mjs /tmp/rally-finish.wav
import { writeFileSync } from "node:fs";
const sampleRate = 44100, seconds = 7, finish = 3.07, count = sampleRate * seconds;
const left = new Float32Array(count), right = new Float32Array(count);
let seed = 42831, water = 0;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; }
const clamp = t => Math.max(0, Math.min(1, t));
function add(index, value, pan = 0) {
  left[index] += value * Math.sqrt((1 - pan) / 2); right[index] += value * Math.sqrt((1 + pan) / 2);
}
// Quiet moving water throughout, with a gentle fade at both ends.
for (let i = 0; i < count; i++) {
  const t = i / sampleRate, noise = random(); water += (noise - water) * 0.045;
  const fade = clamp(t / 0.25) * clamp((seconds - t) / 0.7);
  add(i, water * 0.16 * (0.75 + Math.sin(t * 2.1) * 0.2) * fade, Math.sin(t * 0.8) * 0.25);
  if (t < 3.45) {
    const fadeRoll = clamp(t / 0.1) * clamp((3.45 - t) / 0.4);
    const phase = Math.max(0, (t - 0.25) / 0.47) % 1;
    const contact = phase < 0.18 || phase > 0.82 ? 1 : 0.18;
    add(i, (Math.sin(t * Math.PI * 2 * 83) * 0.018 + noise * 0.018) * fadeRoll * contact, -0.5 + clamp(t / finish));
  }
}
function tone(at, duration, frequency, amplitude, pan = 0, slide = 1) {
  const start = Math.round(at * sampleRate), length = Math.round(duration * sampleRate);
  for (let n = 0; n < length && start + n < count; n++) {
    const t = n / sampleRate, phase = 2 * Math.PI * frequency * (t + (slide - 1) * t * t / (2 * duration));
    const envelope = clamp(t / 0.008) * Math.exp(-t / (duration * 0.23)) * clamp((duration - t) / 0.03);
    add(start + n, (Math.sin(phase) + 0.22 * Math.sin(phase * 2.01)) * envelope * amplitude, pan);
  }
}
for (let hop = 0; hop < 6; hop++) {
  const launch = 0.25 + (hop + 0.18) * 0.47, landing = 0.25 + (hop + 0.82) * 0.47, pan = -0.55 + hop * 0.2;
  tone(launch, 0.24, 290 + hop * 23, 0.037, pan, 1.5);
  tone(landing, 0.22, 170 + hop * 11, 0.12, pan, 0.65);
  tone(landing, 0.37, 1050 + hop * 80, 0.055, pan);
  const start = Math.round(launch * sampleRate);
  for (let n = 0; n < sampleRate * 0.28; n++) {
    const envelope = Math.sin(n / (sampleRate * 0.28) * Math.PI) ** 2;
    add(start + n, random() * envelope * 0.018, pan);
  }
}
// The first fanfare note coincides with the ball crossing the actual finish arch.
[523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => tone(finish + i * 0.11, 1.6, frequency, 0.18, (i - 1.5) * 0.2));
[523.25, 659.25, 783.99].forEach((frequency, i) => tone(finish + 0.55, 1.8, frequency / 2, 0.075, (i - 1) * 0.4));
for (let i = 0; i < 16; i++) tone(finish + 0.12 + i * 0.13, 0.7, [1568, 2093, 2637, 3136][i % 4], 0.024 * (1 - i / 22), Math.sin(i * 2.4) * 0.7);
let peak = 0; for (let i = 0; i < count; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const gain = Math.min(1.8, 0.72 / peak), wav = Buffer.alloc(44 + count * 4);
wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 4, 28);
wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(count * 4, 40);
for (let i = 0; i < count; i++) { wav.writeInt16LE(Math.round(left[i] * gain * 32767), 44 + i * 4); wav.writeInt16LE(Math.round(right[i] * gain * 32767), 46 + i * 4); }
const destination = process.argv[2] || "/tmp/bubble-rally-finish.wav";
writeFileSync(destination, wav); console.log(`Wrote ${seconds}s stereo soundtrack to ${destination}`);
