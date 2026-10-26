// Free-flight handling uses Runway Glide's aircraft data without changing its
// approach simulator. No mission boundaries, automatic resets, or forced landing.
import { AIRCRAFT, DEG, KNOTS, FEET, clamp, windAt } from "./runway-engine.js";
import { HOME_AIRFIELDS, WEATHER, heading360, headingDifference, airfieldsNear, fieldPosition, terrainHeight, surfaceAt, navigationTo } from "./free-flight-world.js";

const approach = (n, target, rate, dt) => n + (target - n) * (1 - Math.exp(-rate * dt));
const active = s => ["flying", "rollout", "parked"].includes(s.phase);
export function flightAngle(s) {
  const a = s.aircraft;
  return (a.aoa + (2 - s.flaps) * 1.8) * Math.pow(a.target / Math.max(s.speed, a.stall), 1.6);
}
export function createFreeFlight({ aircraft = "passenger", location = "azure", departure = "airborne", weather = "breeze", assist = true } = {}) {
  const a = AIRCRAFT[aircraft] || AIRCRAFT.passenger, field = HOME_AIRFIELDS.find(f => f.id === location) || HOME_AIRFIELDS[0];
  const onGround = departure === "runway", point = fieldPosition(field, 0, onGround ? -field.length / 2 + 90 : -4200);
  const s = { aircraft: a, field, weather: WEATHER[weather] || WEATHER.breeze, assist, phase: "ready", time: 0,
    x: point.x, y: onGround ? field.elevation : Math.max(field.elevation + 650, terrainHeight(point.x, point.z) + 650), z: point.z,
    speed: onGround ? 0 : a.target * 1.3, verticalSpeed: 0, lateralSpeed: 0, heading: field.heading, pitch: 0, bank: 0, pitchVelocity: 0, rollVelocity: 0,
    throttle: onGround ? 0 : a.trim + .08, power: onGround ? 0 : a.trim + .08, flaps: onGround ? 1 : 0, gear: onGround || Boolean(a.fixedGear), hook: false,
    braking: false, departure: onGround ? "runway" : "airborne", distance: 0, landings: 0, visited: [], events: [], result: null, touchdown: null, crashTime: 0 };
  s.pitch = onGround ? a.id === "bush" ? 8 : 0 : flightAngle(s);
  return s;
}
export function beginFreeFlight(s) { if (s.phase !== "ready") return false; s.phase = s.departure === "runway" ? "parked" : "flying"; return true; }
function crash(s, reason, water = false) {
  if (s.phase === "crashed") return;
  s.phase = "crashed"; s.crashTime = s.time; s.throttle = 0; s.braking = false;
  s.result = { reason, water }; s.events.push({ type: "crash", reason, water });
}
export function assessFreeTouchdown(s, surface, impact = Math.max(0, -s.verticalSpeed)) {
  const a = s.aircraft, field = surface.field;
  if (!field) return { safe: false, reason: surface.water ? "The aircraft touched the water. Keep clear of the sea or use a runway to land." : "The aircraft struck the terrain. Watch your height above the ground when crossing hills." };
  if (!a.fixedGear && !s.gear) return { safe: false, reason: "The landing gear was up. Lower it with G before touching down." };
  if (impact > a.hardSink) return { safe: false, reason: "The touchdown was too hard. Raise the nose gently to reduce your descent before the wheels touch." };
  if (Math.abs(s.bank) > a.maxBank) return { safe: false, reason: "A wing struck the runway. Level the wings before touching down." };
  if (s.pitch < a.minPitch || s.pitch > a.maxPitch) return { safe: false, reason: a.id === "bush" ? "Align the bush plane's three wheels: touch down with the nose 5-13 degrees up." : "The nose or tail struck the ground. Touch down with the nose gently raised." };
  if (s.speed < a.stall * .9 || s.speed > a.target * 1.4) return { safe: false, reason: "Touchdown speed was outside the safe range. Slow toward the aircraft's landing speed." };
  const angle = Math.min(Math.abs(headingDifference(s.heading, field.heading)), Math.abs(headingDifference(s.heading, field.heading + 180)));
  const wind = windAt(s.weather, s.time), side = Math.sin(headingDifference(s.heading, field.heading) * DEG) * s.speed + wind.cross * Math.cos(field.heading * DEG) + wind.head * Math.sin(field.heading * DEG);
  if (angle > 18 || Math.abs(side) > (a.id === "bush" ? 2.4 : 6)) return { safe: false, reason: "Too much sideways motion. Line up with either end of the runway and cancel the wind drift." };
  if (Math.abs(surface.across) > field.width / 2 - Math.min(4, a.span * .1)) return { safe: false, reason: "The wheels missed the edge of the runway. Aim nearer its centerline." };
  return { safe: true, impact, smooth: impact <= a.sink, field: field.id };
}
function step(s, input, dt) {
  const a = s.aircraft; s.time += dt;
  s.throttle = clamp(s.throttle + (input.throttle || 0) * dt * .22, 0, 1);
  s.power = approach(s.power, s.throttle, a.spool, dt);
  const fields = airfieldsNear(s.x, s.z, 6000), ground = surfaceAt(s.x, s.z, fields), wind = windAt(s.weather, s.time);
  const pitchInput = clamp(input.pitch || 0, -1, 1), rollInput = clamp(input.roll || 0, -1, 1), rudder = clamp(input.rudder || 0, -1, 1);
  const oldX = s.x, oldZ = s.z;
  if (s.phase === "parked" || s.phase === "rollout") {
    s.braking = Boolean(input.brake);
    const resistance = .38 + s.speed * s.speed * .00013 + (ground.field?.surface === "grass" ? .18 : 0);
    s.speed = Math.max(0, s.speed + (s.power * a.thrust * .3 - resistance - (s.braking ? a.brake : 0)) * dt);
    const steer = rudder || rollInput;
    s.heading = heading360(s.heading + steer * Math.min(24, 180 / Math.max(8, s.speed)) * Math.min(1, s.speed / 3) * dt);
    s.bank = approach(s.bank, 0, 4, dt);
    s.pitch = approach(s.pitch, pitchInput > 0 ? Math.min(12, a.maxPitch) : a.id === "bush" ? 8 : 0, a.response, dt);
    const canLift = s.speed > a.target * .98 && pitchInput > .1 && s.pitch > flightAngle(s) + .4;
    if (canLift) { s.phase = "flying"; s.verticalSpeed = Math.max(1, s.speed * .035); s.y += .1; s.events.push({ type: "takeoff" }); }
    else {
      s.x += Math.sin(s.heading * DEG) * s.speed * dt; s.z += Math.cos(s.heading * DEG) * s.speed * dt;
      const next = surfaceAt(s.x, s.z, fields);
      if (!next.field) { crash(s, next.water ? "The aircraft rolled into the water." : "The aircraft left the runway. Brake earlier or build takeoff speed before the end.", next.water); return; }
      s.y = next.height; s.verticalSpeed = 0; s.phase = s.speed < .5 ? "parked" : "rollout";
    }
  } else {
    s.braking = false;
    s.pitchVelocity = approach(s.pitchVelocity, pitchInput * a.pitchRate, a.response * 2, dt);
    s.rollVelocity = approach(s.rollVelocity, rollInput * a.rollRate, a.response * 2, dt);
    s.pitch += s.pitchVelocity * dt; s.bank += s.rollVelocity * dt;
    if (s.assist) {
      if (!pitchInput && s.y - ground.height > 16) s.pitch = approach(s.pitch, flightAngle(s), .18, dt);
      if (!rollInput) s.bank = approach(s.bank, 0, .85, dt);
    }
    s.bank += Math.sin(s.time * 2.1) * s.weather.gust * (a.id === "bush" ? .28 : .11) * dt;
    s.pitch = clamp(s.pitch, -35, 45); s.bank = clamp(s.bank, -68, 68);
    const drag = (s.flaps - 2) * .48 + (s.gear && !a.fixedGear ? .6 : 0);
    const density = Math.exp(-Math.max(0, s.y) / 24000);
    const accel = (s.power * density - a.trim) * a.thrust - (s.speed - a.target) * .065 - drag - (s.pitch - a.trimPitch) * .06;
    s.speed = clamp(s.speed + accel * dt, a.stall * .45, a.max);
    const sink = Math.sin((s.pitch - flightAngle(s)) * DEG) * s.speed - Math.abs(s.bank) * .014 - Math.max(0, a.stall * 1.07 - s.speed) * .48;
    s.verticalSpeed = approach(s.verticalSpeed, sink, a.response, dt);
    s.heading = heading360(s.heading + (9.81 * Math.tan(s.bank * DEG) / Math.max(s.speed, 12) / DEG + rudder * (a.id === "bush" ? 6 : 3)) * dt);
    s.lateralSpeed = s.speed * Math.sin(s.heading * DEG) + wind.cross;
    s.x += s.lateralSpeed * dt; s.z += (s.speed * Math.cos(s.heading * DEG) - wind.head) * dt; s.y += s.verticalSpeed * dt;
    const surface = surfaceAt(s.x, s.z, fields);
    if (s.y <= surface.height) {
      s.touchdown = assessFreeTouchdown(s, surface);
      if (!s.touchdown.safe) { s.y = surface.height; crash(s, s.touchdown.reason, surface.water); return; }
      s.y = surface.height; s.phase = "rollout"; s.verticalSpeed = 0; s.landings++;
      if (!s.visited.includes(surface.field.id)) s.visited.push(surface.field.id);
      if (s.assist) s.throttle = 0;
      s.events.push({ type: "touchdown", field: surface.field, smooth: s.touchdown.smooth });
    } else if (s.y - surface.height < a.span) {
      for (const side of [-1, 1]) {
        const offset = a.span * .45 * side, x = s.x + Math.cos(s.heading * DEG) * offset, z = s.z - Math.sin(s.heading * DEG) * offset;
        if (s.y + a.clearance - Math.sin(s.bank * DEG) * offset < Math.max(0, terrainHeight(x, z, fields))) { crash(s, "A wing struck the hillside. Give the aircraft more clearance over uneven terrain."); break; }
      }
    }
  }
  s.distance += Math.hypot(s.x - oldX, s.z - oldZ);
}
export function advanceFreeFlight(s, input = {}, seconds = 0) {
  if (s.aircraft.fixedGear) s.gear = true;
  let remaining = clamp(Number(seconds) || 0, 0, .25);
  while (remaining > .000001 && active(s)) { const dt = Math.min(remaining, 1 / 120); step(s, input, dt); remaining -= dt; }
  return s;
}
export function freeFlightInstruments(s, selected = null) {
  const fields = airfieldsNear(s.x, s.z), surface = surfaceAt(s.x, s.z, fields), a = s.aircraft;
  const target = selected || fields[0];
  return { knots: s.speed * KNOTS, altitudeFeet: s.y * FEET, heightFeet: Math.max(0, s.y - surface.height) * FEET,
    sinkFeet: s.verticalSpeed * FEET * 60, wind: windAt(s.weather, s.time), heading: heading360(s.heading),
    stall: s.phase === "flying" && s.speed < a.stall * 1.12, nearby: fields.slice(0, 5), navigation: target ? navigationTo(s, target) : null,
    surface, landingKnots: a.target * KNOTS, rotateKnots: a.target * KNOTS };
}
