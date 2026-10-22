// Avoid novelty/robot voices even when a browser lists them first. Prefer an
// installed natural/enhanced English voice, then the best standard voice.
const novelty = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Grandma|Grandpa|Jester|Junior|Kathy|Organ|Ralph|Rocko|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred/i;
export function voiceScore(voice) {
  if (!/^en(?:[-_]|$)/i.test(voice.lang) || novelty.test(voice.name)) return -1000;
  let score = 0;
  if (/natural|neural|premium|enhanced|online/i.test(voice.name)) score += 100;
  if (/Ava|Andrew|Emma|Brian|Aria|Jenny|Guy|Siri|Serena|Alex/i.test(voice.name)) score += 70;
  if (/Google.*English|Google US/i.test(voice.name)) score += 65;
  if (/Daniel/i.test(voice.name)) score += 55;
  if (/Samantha/i.test(voice.name)) score += 50;
  if (/Karen|Moira|Tessa/i.test(voice.name)) score += 40;
  if (voice.default) score += 5;
  return score;
}
export function naturalVoices(voices) { return voices.filter(v=>voiceScore(v)>-1000).sort((a,b)=>voiceScore(b)-voiceScore(a)||a.name.localeCompare(b.name)); }
export function chooseTowerVoice(voices, preferred="auto") {
  const usable=naturalVoices(voices);
  return usable.find(v=>v.name===preferred)||usable[0]||null;
}
export function radioLine(text) {
  return text.replace(/Press G to lower your wheels\./g,"Lower your landing gear.")
    .replace(/Press H before reaching the carrier\./g,"Lower your hook before the deck.")
    .replace(/Hold B or the brake button to stop on the runway\./g,"Apply the brakes and bring her to a stop.")
    .replace(/runway (\d)(\d)/gi,(_,a,b)=>`runway ${["zero","one","two","three","four","five","six","seven","eight","nine"][+a]} ${["zero","one","two","three","four","five","six","seven","eight","nine"][+b]}`);
}

// Keep related clauses together so the voice retains its own intonation.
// Brief pauses between complete thoughts sound better than slowing every word
// or making the synthesizer read literal ellipses.
export function towerPhrases(text) {
  const normalized = radioLine(text).replace(/\.{2,}\s*/g, ", ").replace(/\s+,/g, ",").trim();
  const sentences = normalized.match(/[^.!?]+(?:[.!?]+|$)/g) || [];
  const phrases = [];
  let thought = "";
  for (const sentence of sentences) {
    thought += `${thought ? " " : ""}${sentence.trim()}`;
    if (thought.split(/\s+/).length >= 9) { phrases.push(thought); thought = ""; }
  }
  if (thought) {
    if (thought.split(/\s+/).length < 5 && phrases.length) phrases[phrases.length - 1] += ` ${thought}`;
    else phrases.push(thought);
  }
  return phrases;
}

export function createTowerDelivery({ speech, Utterance, selectedVoice, schedule = setTimeout, unschedule = clearTimeout }) {
  let generation = 0, active = false, current = null, timer = null;
  function finish() { active = false; current = null; timer = null; }
  function cancel() {
    generation++;
    if (timer !== null) unschedule(timer);
    if (active) speech?.cancel();
    finish();
  }
  function speak(text, { urgent = false } = {}) {
    if (!speech || !Utterance || (active && !urgent)) return false;
    if (urgent) cancel();
    const phrases = towerPhrases(text), voice = selectedVoice();
    if (!phrases.length) return false;
    const token = ++generation;
    active = true;
    function deliver(index) {
      if (token !== generation) return;
      timer = null;
      try {
        const line = new Utterance(phrases[index]); current = line;
        line.voice = voice; line.lang = voice?.lang || "en-US";
        // Preserve the voice's native pitch. Standard system voices benefit
        // from conversational speed instead of a stretched, mechanical drawl.
        const enhanced = /natural|neural|premium|enhanced|online/i.test(voice?.name || "");
        line.rate = enhanced ? 1 : index === phrases.length - 1 ? 1.01 : 1.04;
        line.pitch = 1; line.volume = .94;
        line.onend = () => {
          if (token !== generation || current !== line) return;
          current = null;
          if (index + 1 < phrases.length) timer = schedule(() => deliver(index + 1), urgent ? 130 : 185);
          else finish();
        };
        line.onerror = () => { if (token === generation && current === line) finish(); };
        speech.speak(line);
      } catch { if (token === generation) finish(); }
    }
    deliver(0); return true;
  }
  return { speak, cancel, get active() { return active; } };
}
