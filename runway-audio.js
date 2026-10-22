// Browser-native tower speech and locally synthesized aircraft/radio sounds.
// Captions live in the game controller and never depend on voice availability.
import { chooseTowerVoice, naturalVoices, createTowerDelivery } from "./runway-voices.js";

export function createRunwayAudio({ voice = true, effects = true, towerVoice = "auto" } = {}) {
  let context = null, master, engineGain, engineFilter, engine, harmonic, windGain, windSource;
  let disposed = false, suspended = true;
  const speech = globalThis.speechSynthesis;
  const voiceAvailable = Boolean(speech && globalThis.SpeechSynthesisUtterance);
  const delivery = createTowerDelivery({ speech, Utterance: globalThis.SpeechSynthesisUtterance, selectedVoice: () => chooseTowerVoice(speech?.getVoices() || [], towerVoice) });
  async function start() {
    if (disposed) return;
    suspended = false;
    try {
      if (!context) {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) return;
        context = new Audio();
        master = context.createGain(); master.gain.value = effects ? .34 : 0; master.connect(context.destination);
        engineGain = context.createGain(); engineGain.gain.value = 0;
        engineFilter = context.createBiquadFilter(); engineFilter.type = "lowpass"; engineFilter.frequency.value = 450;
        engineFilter.connect(engineGain); engineGain.connect(master);
        engine = context.createOscillator(); engine.type = "sawtooth"; engine.frequency.value = 65; engine.connect(engineFilter); engine.start();
        harmonic = context.createOscillator(); harmonic.type = "sine"; harmonic.frequency.value = 120; harmonic.connect(engineFilter); harmonic.start();
        const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate), data = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < data.length; i++) { last = (last + (Math.random() * 2 - 1) * .08) / 1.08; data[i] = last * 4; }
        windSource = context.createBufferSource(); windSource.buffer = buffer; windSource.loop = true;
        const windFilter = context.createBiquadFilter(); windFilter.type = "lowpass"; windFilter.frequency.value = 1200;
        windGain = context.createGain(); windGain.gain.value = 0; windSource.connect(windFilter); windFilter.connect(windGain); windGain.connect(master); windSource.start();
      }
      if (context.state === "suspended") await context.resume();
    } catch { /* Gameplay and captions remain available if audio is blocked. */ }
  }
  function tone(frequency, delay = 0, duration = .12, volume = .15, end = frequency) {
    if (!context || !effects || suspended || disposed) return;
    const now = context.currentTime + delay, osc = context.createOscillator(), gain = context.createGain();
    osc.type = "sine"; osc.frequency.setValueAtTime(frequency, now); osc.frequency.exponentialRampToValueAtTime(Math.max(20,end), now+duration);
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(volume, now+.01); gain.gain.exponentialRampToValueAtTime(.001, now+duration);
    osc.connect(gain); gain.connect(master); osc.start(now); osc.stop(now+duration+.03); osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  function speak(text, { urgent = false } = {}) {
    if (disposed || suspended || !voice || !voiceAvailable) return;
    if (delivery.speak(text, { urgent })) tone(920, 0, .04, .035, 760);
  }
  function update(state) {
    if (!context || disposed || suspended) return;
    const t=context.currentTime, prop=["bush","cargo"].includes(state.aircraft.id), running=["flying","rollout","goaround"].includes(state.phase);
    engine.frequency.setTargetAtTime(prop?35+state.power*60:65+state.power*140,t,.15);
    harmonic.frequency.setTargetAtTime(prop?70+state.power*120:130+state.power*280,t,.15);
    engineFilter.frequency.setTargetAtTime(prop?280+state.power*220:350+state.power*650,t,.2);
    const duck = delivery.active ? .38 : 1;
    engineGain.gain.setTargetAtTime(running?(.07+state.power*.09)*duck:0,t,delivery.active?.1:.4);
    windGain.gain.setTargetAtTime(running?Math.min(.23,state.speed*.002)*duck:0,t,delivery.active?.1:.4);
  }
  function effect(name) {
    if(name==="touchdown"){tone(740,0,.35,.23,115);tone(82,.02,.3,.35,35);}
    if(name==="wire"){tone(170,0,.5,.4,40);tone(950,0,.15,.15,200);}
    if(name==="gear") {tone(120,0,.15,.2,80);tone(100,.15,.13,.16,70);}
    if(name==="warning") {tone(680,0,.2,.18);tone(680,.35,.2,.18);}
    if(name==="complete") {tone(440,0,.3,.15);tone(554,.15,.3,.15);tone(660,.3,.6,.15);}
    if(name==="failed") {tone(70,0,.6,.3,25);tone(160,.05,.3,.15,35);}
  }
  function pause() { suspended = true; delivery.cancel(); if(context?.state==="running")context.suspend().catch(()=>{}); }
  return {
    start, speak, effect, update, pause, voiceAvailable,
    voices:()=>naturalVoices(speech?.getVoices()||[]),
    selectedVoice:()=>chooseTowerVoice(speech?.getVoices()||[],towerVoice)?.name||"Browser default",
    setTowerVoice(name) { towerVoice=name;delivery.cancel(); },
    setVoice(enabled) { voice=enabled;if(!voice)delivery.cancel(); },
    setEffects(enabled) { effects=enabled;if(master&&context)master.gain.setTargetAtTime(effects?.34:0,context.currentTime,.03); },
    dispose() { if(disposed)return;pause();disposed=true;engine?.stop();harmonic?.stop();windSource?.stop();if(context&&context.state!=="closed")context.close().catch(()=>{}); },
  };
}
