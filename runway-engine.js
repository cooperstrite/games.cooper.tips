// Shared, renderer-independent flight and landing rules. Distances are meters;
// speeds are meters/second, angles degrees. No random or frame-rate dependencies.
export const DEG = Math.PI / 180;
export const KNOTS = 1.94384;
export const FEET = 3.28084;
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const approach = (n, target, rate, dt) => n + (target - n) * (1 - Math.exp(-rate * dt));

export const AIRCRAFT = Object.freeze({
  passenger: {
    id: "passenger", name: "Aster 180", type: "Passenger jet", badge: "PRECISION", color: "#26b8c5",
    description: "Keep the cabin comfortable. A gentle flare and a very soft touchdown earn the best score.",
    target: 71, stall: 51, max: 110, pitchRate: 5.4, rollRate: 20, response: 1.45, spool: .5,
    thrust: 13, trim: .48, aoa: 5.8, trimPitch: 2.8, sink: 1.25, hardSink: 3.8,
    minPitch: -1, maxPitch: 10, maxBank: 9, brake: 3.8, span: 34, length: 36, clearance: 3.4,
    landing: "Aim for less than 250 ft/min at touchdown. Keep wings level and gently raise the nose.",
  },
  cargo: {
    id: "cargo", name: "Atlas C-40", type: "Heavy cargo", badge: "HEAVY", color: "#e5aa4e",
    description: "Four turboprops and a heavy load. Slow control and engine response reward planning ahead.",
    target: 64, stall: 46, max: 98, pitchRate: 3.5, rollRate: 13, response: .7, spool: .23,
    thrust: 9, trim: .56, aoa: 6.2, trimPitch: 3.2, sink: 1.8, hardSink: 4.3,
    minPitch: -1, maxPitch: 11, maxBank: 9, brake: 2.9, span: 39, length: 34, clearance: 3.7,
    landing: "Make corrections early. Reduce power before touchdown and allow extra stopping distance.",
  },
  bush: {
    id: "bush", name: "Kestrel STOL", type: "Bush plane", badge: "SHORT FIELD", color: "#ef6948",
    description: "Light, agile, and sensitive to gusts. Fixed landing gear stays down. Settle the main wheels and tailwheel together.",
    fixedGear: true,
    target: 25, stall: 17, max: 47, pitchRate: 8, rollRate: 32, response: 2, spool: 1.3,
    thrust: 9, trim: .42, aoa: 9.6, trimPitch: 6.6, sink: .9, hardSink: 2.8,
    minPitch: 5, maxPitch: 13, maxBank: 5, brake: 2.5, span: 11, length: 8.5, clearance: 1.65,
    landing: "Three-point touchdown: nose 5-13 degrees up, bank below 5 degrees, and almost no sideways drift.",
  },
  military: {
    id: "military", name: "Viper F/A-27", type: "Military jet", badge: "HIGH SPEED", color: "#9fbdce",
    description: "Fast approach, quick controls. Manage energy precisely and lower the hook for a carrier trap.",
    target: 84, stall: 62, max: 155, pitchRate: 7, rollRate: 28, response: 1.7, spool: .75,
    thrust: 24, trim: .46, aoa: 8.5, trimPitch: 5.5, sink: 2.1, hardSink: 5.7,
    minPitch: 1, maxPitch: 13, maxBank: 9, brake: 5, span: 13, length: 18, clearance: 2.1,
    landing: "Fly the approach at 163 knots. On the carrier, catch a wire with the tailhook and keep power ready.",
  },
});

export const APPROACHES = Object.freeze([
  { id: "training", name: "First approach", location: "Greenhaven Bay / Runway 09", level: "TRAINING", scenery: "coast", runway: "09", length: 3000, width: 65, aim: 150, headwind: 2, crosswind: 0, gust: 0, visibility: 16000, wet: false, traffic: "none", allowed: ["passenger", "cargo", "bush", "military"], tip: "Clear coastal skies, a wide runway, and calm air. Learn to align, flare, and brake." },
  { id: "coast", name: "Coastal connection", location: "Azure Bay / Runway 27", level: "MODERATE", scenery: "coast", runway: "27", length: 2800, width: 55, aim: 160, headwind: 4, crosswind: 3.5, gust: 1.2, visibility: 14000, traffic: "departure", allowed: ["passenger", "cargo", "bush", "military"], tip: "Crab into the crosswind. A departing jet must clear the runway before you land." },
  { id: "freight", name: "Heavy arrival", location: "Port Meridian / Runway 18", level: "MODERATE", scenery: "industrial", runway: "18", length: 3600, width: 60, aim: 180, headwind: 3, crosswind: -2, gust: 1, visibility: 11000, traffic: "departure", allowed: ["passenger", "cargo", "military"], preferred: "cargo", tip: "A busy freight airport. Anticipate heavy-aircraft response and watch traffic climb out ahead." },
  { id: "forest", name: "Pine Valley", location: "Pine Valley / Grass 04", level: "TECHNICAL", scenery: "forest", runway: "04", length: 620, width: 30, aim: 65, headwind: 3, crosswind: 1.8, gust: 1.1, visibility: 9000, traffic: "crossing", allowed: ["bush"], tip: "A short grass strip between the trees. Touch down on all three wheels and stop promptly." },
  { id: "night", name: "After hours", location: "Northlight / Runway 32", level: "HARD", scenery: "night", runway: "32", length: 2900, width: 50, aim: 160, headwind: 5, crosswind: -3, gust: 2, visibility: 6000, traffic: "crossing", allowed: ["passenger", "cargo", "bush", "military"], tip: "Follow the approach lights. Two red and two white PAPI lights mean you are on the glide path." },
  { id: "storm", name: "Storm front", location: "Greywater / Runway 16", level: "EXPERT", scenery: "storm", runway: "16", length: 3200, width: 55, aim: 180, headwind: 8, crosswind: 5, gust: 4, visibility: 3600, wet: true, traffic: "crossing", allowed: ["passenger", "cargo", "military"], tip: "Rain, shifting gusts, and a wet runway. Make small corrections and leave room to brake." },
  { id: "alpine", name: "Alpine pocket", location: "Summit Lodge / Gravel 21", level: "EXPERT", scenery: "alpine", runway: "21", length: 510, width: 26, aim: 50, headwind: 4, crosswind: -2.5, gust: 2.5, visibility: 7000, traffic: "none", allowed: ["bush"], tip: "A narrow mountain approach with valley gusts. Stay inside the approach corridor and land early." },
  { id: "carrier", name: "Carrier trap", location: "CV-72 Resolute / Landing deck", level: "EXTREME", scenery: "carrier", runway: "72", length: 330, width: 48, aim: 75, headwind: 12, crosswind: 2.5, gust: 2.8, visibility: 10000, wet: true, traffic: "carrier", allowed: ["military"], tip: "A moving deck at sea. Lower your hook, touch down before the last wire, and catch an arresting cable. A missed wire is a bolter: go around." },
]);
export const getApproach = id => APPROACHES.find(level => level.id === id) || APPROACHES[0];

export function windAt(level, time) {
  return {
    cross: level.crosswind + level.gust * (Math.sin(time * .71) * .65 + Math.sin(time * 1.83 + .6) * .35),
    head: level.headwind + level.gust * .32 * Math.sin(time * .43),
  };
}

export function deckAt(level, time, z = 100) {
  if (level.id !== "carrier") return { x: 0, height: 0, pitch: 0, roll: 0, velocity: 0 };
  const pitch = Math.sin(time * .47) * .7;
  const height = 12 + Math.sin(time * .62) * .7 + Math.sin(pitch * DEG) * (z - 165);
  return { x: Math.sin(time * .27) * 1.2, height, pitch, roll: Math.sin(time * .39) * .55,
    velocity: Math.cos(time * .62) * .434 + Math.cos(time * .47) * .47 * .7 * DEG * (z - 165) };
}

export function createFlight(aircraftId = "passenger", approachId = "training", assist = true) {
  const level = getApproach(approachId);
  const aircraft = AIRCRAFT[level.allowed.includes(aircraftId) ? aircraftId : level.allowed[0]];
  const distance = Math.max(850, aircraft.target * 27);
  const wind = windAt(level, 0);
  return {
    aircraft, level, assist, phase: "ready", time: 0, x: 0, y: (distance + level.aim) * Math.tan(3 * DEG) + (level.id === "carrier" ? 12 : 0), z: -distance,
    speed: aircraft.target, verticalSpeed: -(aircraft.target - wind.head) * Math.tan(3 * DEG),
    lateralSpeed: 0, heading: -Math.asin(clamp(wind.cross / aircraft.target, -.5, .5)) / DEG,
    pitch: aircraft.trimPitch, bank: 0, pitchVelocity: 0, rollVelocity: 0,
    throttle: aircraft.trim, power: aircraft.trim, flaps: 2, gear: true, hook: false,
    braking: false, touchdown: null, result: null, wire: null, events: [],
    goAroundTime: 0, attempts: 1, distance, trail: [],
  };
}

export function flightInstruments(s) {
  const deck = deckAt(s.level, s.time, s.z);
  const altitude = Math.max(0, s.y - deck.height);
  const expectedAltitude = Math.max(0, (s.level.aim - s.z) * Math.tan(3 * DEG));
  const wind = windAt(s.level, s.time);
  const groundspeed = Math.max(1, s.speed * Math.cos(s.heading * DEG) - wind.head);
  return { altitude, expectedAltitude, glideError: altitude - expectedAltitude, centerError: s.x - deck.x,
    distance: Math.max(0, -s.z), wind, groundspeed, knots: s.speed * KNOTS,
    altitudeFeet: altitude * FEET, sinkFeet: s.verticalSpeed * FEET * 60,
    targetKnots: s.aircraft.target * KNOTS, targetHeading: -Math.asin(clamp(wind.cross / s.speed, -.8, .8)) / DEG,
    runwayClear: s.level.traffic !== "departure" || s.time > 16,
    flare: altitude < (s.aircraft.id === "bush" ? 5 : 13) && s.z > -260,
  };
}

function fail(s, reason) {
  s.phase = "crashed";
  s.result = { success: false, title: "Approach ended", reason, score: 0 };
  s.events.push({ type: "failed", reason });
}

export function assessTouchdown(s, impact = -s.verticalSpeed) {
  const { aircraft: a, level: l } = s;
  const deck = deckAt(l, s.time, s.z);
  const offset = Math.abs(s.x - deck.x);
  const reasons = [];
  if (s.z < 0 || s.z > l.length || offset > l.width / 2 - Math.min(4, a.span * .1)) reasons.push("Missed the landing surface. Keep the runway centerline under the aircraft and cross the threshold before touching down.");
  if (!a.fixedGear && !s.gear) reasons.push("Landing gear was retracted. Press G to lower it before the final approach.");
  if (s.level.traffic === "departure" && s.time <= 16) reasons.push("The runway was still occupied. Go around when tower has not cleared you to land.");
  if (impact > (l.id === "carrier" ? 7 : a.hardSink)) reasons.push("The descent was too steep at touchdown. Gently raise the nose sooner to reduce the sink rate.");
  if (Math.abs(s.bank - deck.roll) > a.maxBank) reasons.push("A wing struck the ground. Level the wings before touchdown.");
  if (s.pitch - deck.pitch < a.minPitch || s.pitch - deck.pitch > a.maxPitch) reasons.push(a.id === "bush" ? "The wheels were not aligned for a three-point landing. Touch down with the nose 5-13 degrees up." : "The landing attitude was too steep. Keep the nose gently raised without striking the tail.");
  if (s.speed < a.stall * .9 || s.speed > a.target * 1.4) reasons.push("Touchdown speed was outside the safe range. Use the throttle to stay near the target speed.");
  if (Math.abs(s.lateralSpeed) > (a.id === "bush" ? 2.4 : 6)) reasons.push("Too much sideways motion at touchdown. Use small bank and rudder corrections to cancel the wind drift.");
  const softness = clamp(1 - Math.max(0, impact - a.sink * .35) / (a.hardSink - a.sink * .35), 0, 1);
  const alignment = clamp(1 - offset / (l.width / 2), 0, 1);
  const speed = clamp(1 - Math.abs(s.speed - a.target) / (a.target * .3), 0, 1);
  const zone = clamp(1 - Math.abs(s.z - l.aim) / (l.id === "carrier" ? 180 : Math.min(700, l.length * .6)), 0, 1);
  const score = Math.round((softness * (a.id === "passenger" ? .5 : .35) + alignment * .25 + speed * .15 + zone * (a.id === "passenger" ? .1 : .25)) * 100);
  return { safe: !reasons.length, reason: reasons[0] || "", score, impact, offset, speed: s.speed, pitch: s.pitch, bank: s.bank, z: s.z,
    smooth: impact <= a.sink, metrics: { softness, alignment, speed, zone } };
}

export function startGoAround(s, reason = "Go-around requested. Full power; climb away and try the approach again.") {
  if (!["flying", "rollout"].includes(s.phase)) return false;
  s.phase = "goaround"; s.goAroundTime = 0; s.throttle = 1; s.braking = false; s.wire = null;
  s.events.push({ type: "goaround", reason });
  return true;
}

function step(s, input, dt) {
  const a = s.aircraft, l = s.level;
  s.time += dt;
  if (s.phase === "goaround") {
    s.goAroundTime += dt;
    s.pitch = approach(s.pitch, 12, 1, dt); s.bank = approach(s.bank, 0, 2, dt);
    s.speed = approach(s.speed, a.target * 1.18, .4, dt);
    s.verticalSpeed = approach(s.verticalSpeed, a.target * .12, 1.2, dt);
    s.y += s.verticalSpeed * dt; s.z += s.speed * dt;
    if (s.goAroundTime > 6) {
      const next = createFlight(a.id, l.id, s.assist), attempts = s.attempts + 1, hook = s.hook;
      Object.assign(s, next, { phase: "flying", attempts, hook });
      s.events.push({ type: "new-approach" });
    }
    return;
  }
  s.throttle = clamp(s.throttle + (input.throttle || 0) * dt * .22, 0, 1);
  s.power = approach(s.power, s.throttle, a.spool, dt);
  const wind = windAt(l, s.time);
  if (s.phase === "rollout") {
    const previousZ = s.z;
    s.braking = Boolean(input.brake);
    const deceleration = s.wire ? 29 : .4 + (s.braking ? a.brake * (l.wet ? .65 : 1) : 0) - s.power * a.thrust * .23;
    s.speed = Math.max(0, s.speed - deceleration * dt);
    s.heading = approach(s.heading, (input.rudder || input.roll || 0) * 4, 2, dt);
    s.x += Math.sin(s.heading * DEG) * s.speed * dt;
    s.z += Math.cos(s.heading * DEG) * s.speed * dt;
    const deck = deckAt(l, s.time, s.z);
    s.y = deck.height;
    s.bank = approach(s.bank, deck.roll, 5, dt);
    s.pitch = approach(s.pitch, a.id === "bush" ? 8 : deck.pitch, .5, dt);
    if (l.id === "carrier" && !s.wire) {
      for (const z of [108, 132, 156, 180]) {
        if (previousZ < z && s.z >= z && s.hook && Math.abs(s.x - deck.x) < 17) {
          s.wire = [108, 132, 156, 180].indexOf(z) + 1;
          s.events.push({ type: "wire", wire: s.wire });
          break;
        }
      }
      if (s.z > 200 && !s.wire) { startGoAround(s, "Bolter, bolter! No wire caught. Full power; climb away. Lower the hook and touch down earlier on the next approach."); return; }
    }
    if (Math.abs(s.x - deck.x) > l.width / 2 - 2) { fail(s, "Left the runway during rollout. Keep steering gently toward the centerline while braking."); return; }
    if (s.z > l.length - 8) { fail(s, "Ran out of runway. Touch down earlier, reduce the throttle, and hold B to brake."); return; }
    if (s.speed < 2) {
      s.speed = 0; s.phase = "complete";
      const score = Math.max(0, s.touchdown.score - Math.max(0, s.attempts - 1) * 3);
      s.result = { success: true, score, title: s.wire ? `Caught wire ${s.wire}` : score >= 90 ? "Beautiful landing" : score >= 70 ? "Cleared and parked" : "Safe on the ground", reason: s.wire ? "Aircraft secured on the Resolute. Welcome aboard." : s.touchdown.smooth ? "Soft touchdown and a controlled stop. Nicely flown." : "Safe landing. Try a gentler flare next time for an even smoother touchdown." };
      s.events.push({ type: "complete" });
    }
    return;
  }
  const i = flightInstruments(s);
  const pitchInput = clamp(input.pitch || 0, -1, 1), rollInput = clamp(input.roll || 0, -1, 1);
  s.pitchVelocity = approach(s.pitchVelocity, pitchInput * a.pitchRate, a.response * 2, dt);
  s.rollVelocity = approach(s.rollVelocity, rollInput * a.rollRate, a.response * 2, dt);
  s.pitch += s.pitchVelocity * dt;
  s.bank += s.rollVelocity * dt;
  if (s.assist) {
    if (!pitchInput && !i.flare) s.pitch = approach(s.pitch, a.trimPitch, .18, dt);
    if (!rollInput) s.bank = approach(s.bank, 0, .85, dt);
  }
  const turbulence = l.gust * (a.id === "bush" ? .28 : .11);
  s.bank += Math.sin(s.time * 2.1) * turbulence * dt;
  s.pitch = clamp(s.pitch, -14, 24); s.bank = clamp(s.bank, -48, 48);
  const flapDrag = (s.flaps - 2) * .48;
  const accel = (s.power - a.trim) * a.thrust - (s.speed - a.target) * .065 - flapDrag - (s.pitch - a.trimPitch) * .06;
  s.speed = clamp(s.speed + accel * dt, a.stall * .5, a.max);
  const aoa = a.aoa + Math.max(0, a.target - s.speed) * .08 + (2 - s.flaps) * 1.8;
  const desiredSink = Math.sin((s.pitch - aoa) * DEG) * s.speed - Math.abs(s.bank) * .014 - Math.max(0, a.stall * 1.07 - s.speed) * .48;
  s.verticalSpeed = approach(s.verticalSpeed, desiredSink, a.response, dt);
  s.heading += (9.81 * Math.tan(s.bank * DEG) / Math.max(s.speed, 12) / DEG + (input.rudder || 0) * (a.id === "bush" ? 6 : 3)) * dt;
  s.heading = clamp(s.heading, -80, 80);
  s.lateralSpeed = s.speed * Math.sin(s.heading * DEG) + wind.cross;
  s.x += s.lateralSpeed * dt;
  s.z += (s.speed * Math.cos(s.heading * DEG) - wind.head) * dt;
  s.y += s.verticalSpeed * dt;
  for (const other of trafficAt(s)) {
    const otherPlane = AIRCRAFT[other.aircraft];
    if (Math.abs(s.x - other.x) < (a.span + otherPlane.span) * .3 && Math.abs(s.z - other.z) < (a.length + otherPlane.length) * .35 && Math.abs(s.y - other.y) < 7) {
      fail(s, "Traffic conflict. Maintain separation from other aircraft and follow the tower's landing clearance."); return;
    }
  }
  const deck = deckAt(l, s.time, s.z);
  const onDeck = s.z >= 0 && s.z <= l.length && Math.abs(s.x - deck.x) < l.width / 2;
  const floor = l.id === "carrier" && !onDeck ? 0 : deck.height;
  if (s.y <= floor) {
    if(l.id==="carrier"&&onDeck&&s.y<floor-.75){fail(s,"Too low at the stern. Keep enough height to clear the carrier's rear edge before touching down on the deck.");return;}
    s.touchdown = assessTouchdown(s, Math.max(0, -s.verticalSpeed + deck.velocity));
    if (!s.touchdown.safe || (l.id === "carrier" && !onDeck)) {
      fail(s, l.id === "carrier" && !onDeck ? "Missed the flight deck. Follow the landing lights and keep enough altitude to clear the stern." : s.touchdown.reason); return;
    }
    s.y = floor; s.phase = "rollout"; s.verticalSpeed = 0;
    if (s.assist) s.throttle = 0;
    s.events.push({ type: "touchdown" });
    if (l.id === "carrier" && s.z > 180) startGoAround(s, "Bolter! Touchdown was beyond the last wire. Full power and climb away for another approach.");
  } else if (s.z > l.length + 1000 || Math.abs(s.x) > 1400 || s.y > 1400) {
    startGoAround(s, "Outside the approach corridor. Climb away and rejoin the final approach.");
  }
}

export function advanceFlight(s, input = {}, seconds = 0) {
  if (s.aircraft.fixedGear) s.gear = true;
  if (!["flying", "rollout", "goaround"].includes(s.phase)) return s;
  // Substeps make collision and arresting-wire detection reliable at low frame rates.
  let remaining = clamp(seconds, 0, .25);
  while (remaining > .000001 && ["flying", "rollout", "goaround"].includes(s.phase)) {
    const dt = Math.min(remaining, 1 / 120);
    step(s, input, dt); remaining -= dt;
  }
  return s;
}

export function trafficAt(s) {
  const t = s.time, l = s.level;
  if (l.traffic === "departure") return [{ id: "departing", aircraft: "passenger", x: 0, y: Math.max(0, t - 7) * 8, z: 400 + t * 68, heading: 0, pitch: t > 7 ? 7 : 0 }];
  if (l.traffic === "crossing") return [{ id: "crossing", aircraft: l.allowed.length === 1 ? "bush" : "cargo", x: -950 + t * 42, y: 205 + Math.sin(t * .1) * 6, z: -420, heading: 90, pitch: 0 }];
  if (l.traffic === "carrier") return [{ id: "wingman", aircraft: "military", x: -280 - t * 10, y: 160 + t * 4, z: -100 + t * 105, heading: -8, pitch: 5 }];
  return [];
}

function flightGuidance(s) {
  const i = flightInstruments(s), a = s.aircraft;
  if (s.phase === "goaround") return { key: "goaround", text: "Full power. Climb away; tower will bring you back to final." };
  if (s.phase === "rollout") return { key: "brake", text: s.wire ? "Wire caught. Hold position. Welcome aboard." : "Touchdown. Throttle idle. Hold B or the brake button to stop on the runway." };
  if (!s.aircraft.fixedGear && !s.gear && i.altitude < 60) return { key: "gear", text: "Check landing gear. Press G to lower your wheels." };
  if (s.speed < a.stall * 1.15) return { key: "stall", text: "Airspeed low. Add power and gently lower the nose." };
  if (!i.runwayClear) return { key: "traffic", text: "Traffic departing ahead. Continue the approach; landing clearance will follow." };
  if (s.level.id === "carrier" && !s.hook && i.distance < 1200) return { key: "hook", text: "Check your tailhook. Press H before reaching the carrier." };
  if (Math.abs(i.centerError) > s.level.width * .24) return { key: i.centerError > 0 ? "left" : "right", text: `You are ${i.centerError > 0 ? "right" : "left"} of centerline. Bank gently ${i.centerError > 0 ? "left" : "right"}, then level the wings.` };
  if (i.flare) return { key: "flare", text: a.id === "bush" ? "Begin the flare. Raise the nose toward nine degrees; settle all three wheels together." : s.level.id === "carrier" ? "Hold the landing attitude. Aim before the wires; keep the hook down." : "Begin the flare. Gently raise the nose to reduce your descent. Keep the wings level." };
  if (Math.abs(i.glideError) > Math.max(9, i.distance * .012)) return { key: i.glideError > 0 ? "high" : "low", text: i.glideError > 0 ? "Above the glide path. Gently lower the nose to rejoin the approach lights." : "Below the glide path. Raise the nose slightly and add a little power." };
  if (Math.abs(s.speed - a.target) > a.target * .13) return { key: s.speed > a.target ? "fast" : "slow", text: `${s.speed > a.target ? "Too fast. Reduce" : "Too slow. Increase"} throttle toward ${Math.round(a.target * KNOTS)} knots.` };
  return { key: "clear", text: `Glide One, cleared to land ${s.level.id === "carrier" ? "on the Resolute" : `runway ${s.level.runway}`}. Keep the centerline and follow the glide path.` };
}

export function towerGuidance(s) {
  const guidance=flightGuidance(s);
  const spoken={
    goaround:"That's it, full power. Climb away. We'll bring you around for another try.",
    brake:s.wire?"Good catch. You're aboard. Hold your position.":"You're down. Bring the power back... and apply the brakes.",
    gear:"Glide One, check your gear. We need the wheels down.",
    stall:"Watch your airspeed. A little more power, and ease the nose down.",
    traffic:"There's traffic rolling ahead of you. Continue your approach. I'll call you when it's clear.",
    hook:"Glide One, check that hook. Lower it before you reach the deck.",
    left:"A little right of the centerline. Ease left... then level the wings.",
    right:"A little left of the centerline. Ease right... then level the wings.",
    flare:s.aircraft.id==="bush"?"Looking good. Ease the nose up... and let all three wheels settle.":s.level.id==="carrier"?"Hold that attitude. Keep it coming. Aim just ahead of the wires.":"Easy now. Gently raise the nose... let her settle. Wings level.",
    high:"You're a little high. Ease the nose down, back toward the lights.",
    low:"A little low on the approach. Gently raise the nose. A touch more power.",
    fast:"A bit fast. Ease the power back. Give her a moment to slow down.",
    slow:"Bring the power up a little. Let's keep that approach speed.",
    clear:s.level.id==="carrier"?"Resolute to Glide One. You're clear to land. Bring her aboard.":`Glide One, runway ${s.level.runway} is yours. Cleared to land. Looking good.`,
  };
  return {...guidance,spoken:spoken[guidance.key]||guidance.text};
}
