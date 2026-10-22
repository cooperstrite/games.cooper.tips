import test from "node:test";
import assert from "node:assert/strict";
import { towerPhrases, createTowerDelivery } from "../runway-voices.js";

function radio(name = "Daniel") {
  const calls = [], timers = new Map(); let cancelled = 0, id = 0;
  const voice = { name, lang: "en-GB" };
  const delivery = createTowerDelivery({
    speech: { speak: line => calls.push(line), cancel: () => cancelled++ },
    Utterance: class { constructor(text) { this.text = text; } }, selectedVoice: () => voice,
    schedule: (callback, delay) => { timers.set(++id, { callback, delay }); return id; },
    unschedule: id => timers.delete(id),
  });
  const next = () => { const [id, timer] = timers.entries().next().value; timers.delete(id); timer.callback(); };
  return { delivery, calls, timers, next, get cancelled() { return cancelled; } };
}
const briefing = "Glide One, welcome to Azure Bay. You're cleared to land, runway 27. A little wind from the left. Take your time... looking good.";

test("tower keeps related thoughts intact and pronounces runway numbers without ellipsis artifacts", () => {
  const phrases = towerPhrases(briefing);
  assert.equal(phrases.length, 2);
  assert.match(phrases[0], /runway two seven/);
  assert.match(phrases[1], /Take your time, looking good/);
  assert.ok(phrases.every(p => p.split(/\s+/).length >= 9));
  assert.deepEqual(towerPhrases(""), []);
});
test("tower pauses between complete thoughts and retains the chosen voice's natural pitch", () => {
  const r = radio(); assert.equal(r.delivery.speak(briefing), true);
  assert.equal(r.calls.length, 1); assert.equal(r.delivery.active, true);
  assert.equal(r.calls[0].voice.name, "Daniel"); assert.equal(r.calls[0].pitch, 1);
  assert.ok(r.calls[0].rate >= 1 && r.calls[0].rate <= 1.05);
  r.calls[0].onend(); assert.equal(r.calls.length, 1); assert.equal(r.delivery.active, true);
  assert.ok([...r.timers.values()][0].delay >= 100);
  r.next(); assert.equal(r.calls.length, 2); r.calls[1].onend(); assert.equal(r.delivery.active, false);
});
test("muting or pausing between phrases cancels queued speech", () => {
  const r = radio(); r.delivery.speak(briefing); r.calls[0].onend();
  const late = [...r.timers.values()][0].callback;
  r.delivery.cancel(); assert.equal(r.timers.size, 0); assert.equal(r.delivery.active, false);
  late(); assert.equal(r.calls.length, 1); assert.equal(r.cancelled, 1);
});
test("an urgent instruction replaces the old transmission and stale callbacks cannot resume it", () => {
  const r = radio(); r.delivery.speak(briefing); const old = r.calls[0];
  assert.equal(r.delivery.speak("Routine update."), false);
  assert.equal(r.delivery.speak("Go around. Full power and climb away.", { urgent: true }), true);
  assert.equal(r.cancelled, 1); old.onend(); assert.equal(r.timers.size, 0);
  assert.equal(r.delivery.active, true); r.calls[1].onend(); assert.equal(r.delivery.active, false);
});
test("speech failures release the channel and enhanced voices keep their native rate", () => {
  const r = radio("Microsoft Ava Online (Natural)"); r.delivery.speak(briefing);
  assert.equal(r.calls[0].rate, 1); r.calls[0].onerror(); assert.equal(r.delivery.active, false);
  assert.equal(r.delivery.speak("Wings level."), true); r.delivery.cancel();
  assert.equal(createTowerDelivery({ selectedVoice: () => null }).speak("No speech engine."), false);
});
