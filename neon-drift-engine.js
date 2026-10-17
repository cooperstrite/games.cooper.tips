export const ROAD = { maxDepth: 160, nearDepth: 4.2, playerDepth: 7.2, laneWidth: 3.2 };

export const DIFFICULTIES = {
  easy: { name: "Easy", start: 0 },
  medium: { name: "Medium", start: 2.5 },
  hard: { name: "Hard", start: 5.5 },
  expert: { name: "Expert", start: 9 },
};

export const ROUTES = {
  expressway: {
    name: "Neon Expressway", subtitle: "Merging traffic under the city lights.",
    twist: "Watch for amber indicators: cars can merge into another lane.",
    lanes: 3, curve: 0, hills: 0, visibility: 160, speed: 1, handling: 1,
    weather: "clear", landscape: "city", merging: true,
    sky: ["#0b1531", "#686084", "#edb29a"], ground: ["#303b4a", "#09151f"],
  },
  country: {
    name: "Country Curves", subtitle: "Two lanes, blind bends, and rolling hills.",
    twist: "Hills and sharp bends hide traffic. Ease off Boost before a blind corner.",
    lanes: 2, curve: 1, hills: 0.9, visibility: 94, speed: 0.9, handling: 1,
    weather: "clear", landscape: "country", merging: false,
    sky: ["#244c69", "#98bfbd", "#f1d8ad"], ground: ["#66744a", "#263f32"],
  },
  alpine: {
    name: "Alpine Pass", subtitle: "Mountain crests and drifting banks of fog.",
    twist: "Fog thickens in waves, and steep crests conceal the road beyond.",
    lanes: 2, curve: 0.65, hills: 1.6, visibility: 96, speed: 0.85, handling: 0.9,
    weather: "fog", landscape: "alpine", merging: false,
    sky: ["#31435d", "#8ca7b6", "#e1e2d5"], ground: ["#6c7e83", "#263d45"],
  },
  rainway: {
    name: "Midnight Rain", subtitle: "Wet asphalt and slower steering response.",
    twist: "The road is slippery. Start lane changes early and leave room to recover.",
    lanes: 3, curve: 0.2, hills: 0.15, visibility: 120, speed: 0.94, handling: 0.57,
    weather: "rain", landscape: "city", merging: false,
    sky: ["#070e24", "#253752", "#69738e"], ground: ["#26394c", "#071422"],
  },
  canyon: {
    name: "Canyon Crosswinds", subtitle: "Heavy trucks and sudden desert gusts.",
    twist: "Crosswinds push your car sideways. Trucks take more space and close quickly.",
    lanes: 3, curve: 0.4, hills: 0.4, visibility: 140, speed: 0.96, handling: 0.9,
    weather: "wind", landscape: "canyon", merging: false,
    sky: ["#41425d", "#c98b76", "#f6c38d"], ground: ["#9e674d", "#493c36"],
  },
};

export const CARS = {
  comet: {
    name: "Comet GT", kind: "sport", speed: 1.04, handling: 1,
    ability: "nitro", abilityName: "Nitro surge", duration: 3, recharge: 13,
    description: "A 3-second burst of extra speed. Recharges in 13 seconds.",
    color: { light: "#c4ffff", body: "#46d8e6", dark: "#157186" },
  },
  sentinel: {
    name: "Sentinel SUV", kind: "suv", speed: 0.94, handling: 0.85,
    ability: "shield", abilityName: "Impact shield", duration: 6, recharge: 18,
    description: "Absorbs one collision within 6 seconds. Recharges in 18 seconds.",
    color: { light: "#ffe9ab", body: "#e0ad4f", dark: "#8d6233" },
  },
  phantom: {
    name: "Phantom Coupe", kind: "sport", speed: 1, handling: 1.15,
    ability: "phase", abilityName: "Ghost phase", duration: 3, recharge: 16,
    description: "Pass through traffic for 3 seconds. Recharges in 16 seconds.",
    color: { light: "#e3d4ff", body: "#a38deb", dark: "#5a498d" },
  },
  rally: {
    name: "Rally RS", kind: "rally", speed: 0.98, handling: 1.35,
    ability: "focus", abilityName: "Rally focus", duration: 4, recharge: 15,
    description: "Slows approaching traffic, sharpens steering, and reveals more road for 4 seconds.",
    color: { light: "#deffc2", body: "#8bc966", dark: "#3f7250" },
  },
};

export const TRAFFIC = {
  sedan: { name: "Sedan", width: 1.9, height: 1.28, length: 4.4, cruise: 20 },
  sport: { name: "Sports car", width: 1.85, height: 1.1, length: 4.2, cruise: 25 },
  suv: { name: "SUV", width: 2.06, height: 1.65, length: 4.8, cruise: 19 },
  van: { name: "Van", width: 2.1, height: 1.95, length: 5.5, cruise: 17 },
  truck: { name: "Truck", width: 2.35, height: 2.6, length: 8, cruise: 14 },
  bike: { name: "Motorbike", width: 0.72, height: 1.45, length: 2.2, cruise: 26 },
  rally: { name: "Rally car", width: 1.85, height: 1.3, length: 4.1, cruise: 23 },
};

export const LENGTHS = {
  sprint: { name: "Short - 1 km", distance: 1000 },
  standard: { name: "Standard - 3 km", distance: 3000 },
  tour: { name: "Long - 8 km", distance: 8000 },
  endless: { name: "Endless", distance: Infinity },
};

export function normalizeSettings(settings = {}) {
  if (!settings || typeof settings !== "object") settings = {};
  return {
    difficulty: Object.hasOwn(DIFFICULTIES, settings.difficulty) ? settings.difficulty : "medium",
    route: Object.hasOwn(ROUTES, settings.route) ? settings.route : "expressway",
    car: Object.hasOwn(CARS, settings.car) ? settings.car : "comet",
    length: Object.hasOwn(LENGTHS, settings.length) ? settings.length : "standard",
  };
}

export function getPace(settings, distance) {
  const heat = DIFFICULTIES[settings.difficulty].start + Math.max(0, distance) / 550;
  const pressure = Math.min(heat, 20);
  return {
    heat,
    tier: Math.floor(heat) + 1,
    cruise: (25 + pressure * 2.2) * ROUTES[settings.route].speed * CARS[settings.car].speed,
    spawnInterval: Math.max(0.52, 1.9 / (1 + pressure * 0.11)),
    doubleChance: Math.min(0.65, pressure * 0.045),
  };
}

export function getRoadGeometry(settings, distance, depth) {
  const route = ROUTES[settings.route];
  const ahead = depth - ROAD.playerDepth;
  const curve = (s) => Math.sin(s / 105) * 36 + Math.sin(s / 48) * 10;
  const curveSlope = Math.cos(distance / 105) * 36 / 105 + Math.cos(distance / 48) * 10 / 48;
  const hill = (s) => Math.sin(s / 95) * 4 + Math.sin(s / 44) * 1.4;
  const hillSlope = Math.cos(distance / 95) * 4 / 95 + Math.cos(distance / 44) * 1.4 / 44;
  return {
    offset: route.curve * (curve(distance + ahead) - curve(distance) - curveSlope * ahead),
    elevation: route.hills * (hill(distance + ahead) - hill(distance) - hillSlope * ahead),
  };
}

export function getVisibility(settings, distance, focused = false) {
  const route = ROUTES[settings.route];
  let visibility = route.visibility;
  if (settings.route === "country") visibility -= Math.abs(Math.sin(distance / 110)) * 25;
  if (route.weather === "fog") visibility -= (Math.sin(distance / 120) + 1) * 20;
  return Math.min(ROAD.maxDepth, visibility + (focused ? 35 : 0));
}

export function createDriveModel(initialSettings, random = Math.random) {
  let settings = normalizeSettings(initialSettings);
  let nextId = 0;
  let rowId = 0;
  const state = {
    phase: "idle", distance: 0, speed: 0, time: 0, lane: 1, visualLane: 1,
    boost: false, traffic: [], spawnTimer: 0, safeLane: 1,
    abilityRemaining: 0, abilityCooldown: 0, invulnerable: 0,
    best: 0, wind: 0, lastTier: 0, events: [],
  };

  const route = () => ROUTES[settings.route];
  const car = () => CARS[settings.car];
  const active = (ability) => car().ability === ability && state.abilityRemaining > 0;

  function configure(nextSettings) {
    settings = normalizeSettings(nextSettings);
    Object.assign(state, {
      phase: "idle", distance: 0, speed: 0, time: 0, boost: false, traffic: [],
      lane: Math.floor(route().lanes / 2), visualLane: Math.floor(route().lanes / 2),
      abilityRemaining: 0, abilityCooldown: 0, invulnerable: 0, wind: 0, events: [],
    });
  }

  function spawnRow(depth = ROAD.maxDepth) {
    const pace = getPace(settings, state.distance);
    const choices = [state.safeLane - 1, state.safeLane, state.safeLane + 1]
      .filter((lane) => lane >= 0 && lane < route().lanes);
    state.safeLane = choices[Math.floor(random() * choices.length)];
    const blocked = Array.from({ length: route().lanes }, (_, lane) => lane)
      .filter((lane) => lane !== state.safeLane);
    if (random() < 0.5) blocked.reverse();
    const count = route().lanes === 3 && random() < pace.doubleChance ? 2 : 1;
    rowId += 1;
    blocked.slice(0, count).forEach((lane) => {
      const types = route().landscape === "canyon"
        ? ["truck", "truck", "van", "suv", "sedan", "sport"]
        : ["sedan", "sport", "suv", "van", "truck", "bike"];
      const kind = types[Math.floor(random() * types.length)];
      state.traffic.push({
        id: nextId++, row: rowId, lane, visualLane: lane, z: depth, previousZ: depth,
        kind, color: Math.floor(random() * 5),
        cruise: Math.min(pace.cruise - 8, TRAFFIC[kind].cruise + random() * 4),
        wantsMerge: route().merging && pace.heat >= 2 && random() < 0.28,
        indicator: 0, mergeWait: 0, targetLane: lane,
      });
    });
  }

  function start() {
    configure(settings);
    state.phase = "running";
    state.speed = getPace(settings, 0).cruise;
    state.safeLane = state.lane;
    state.spawnTimer = 1;
    state.lastTier = getPace(settings, 0).tier;
    spawnRow(82);
    spawnRow(142);
  }

  function activateAbility() {
    if (state.phase !== "running" || state.abilityCooldown > 0) return false;
    state.abilityRemaining = car().duration;
    state.abilityCooldown = car().recharge;
    return true;
  }

  function changeLane(delta) {
    if (state.phase !== "running") return;
    state.lane = Math.max(0, Math.min(route().lanes - 1, state.lane + delta));
  }

  function end(phase) {
    state.phase = phase;
    state.boost = false;
    state.abilityRemaining = 0;
    state.best = Math.max(state.best, state.distance);
  }

  function step(delta) {
    state.events = [];
    if (state.phase !== "running") return state.events;
    delta = Math.max(0, Math.min(delta, 0.12));
    state.time += delta;
    state.abilityRemaining = Math.max(0, state.abilityRemaining - delta);
    state.abilityCooldown = Math.max(0, state.abilityCooldown - delta);
    state.invulnerable = Math.max(0, state.invulnerable - delta);
    const pace = getPace(settings, state.distance);
    const targetSpeed = pace.cruise + (state.boost ? 15 : 0) + (active("nitro") ? 18 : 0);
    state.speed += (targetSpeed - state.speed) * Math.min(delta * 4, 1);
    state.distance += state.speed * delta;
    const focused = active("focus");
    state.wind = route().weather === "wind"
      ? Math.pow(Math.max(0, Math.sin(state.distance / 70)), 3) * Math.sin(state.distance / 19) * (focused ? 0.04 : 0.25)
      : 0;
    const handling = car().handling * route().handling * (focused ? 2 : 1);
    state.visualLane += (state.lane + state.wind - state.visualLane) * Math.min(delta * 9 * handling, 1);
    if (pace.tier !== state.lastTier) {
      state.lastTier = pace.tier;
      state.events.push({ type: "heat", tier: pace.tier });
    }
    state.spawnTimer -= delta;
    if (state.spawnTimer <= 0) {
      spawnRow();
      state.spawnTimer += pace.spawnInterval;
    }

    state.traffic.forEach((vehicle) => {
      vehicle.previousZ = vehicle.z;
      vehicle.z -= Math.max(6, state.speed - vehicle.cruise) * delta * (focused ? 0.45 : 1);
      if (vehicle.wantsMerge && vehicle.z < 108 && vehicle.z > 45 && !vehicle.indicator) {
        const direction = vehicle.lane === 0 ? 1 : vehicle.lane === route().lanes - 1 ? -1 : random() < 0.5 ? -1 : 1;
        vehicle.targetLane = vehicle.lane + direction;
        vehicle.indicator = direction;
        vehicle.mergeWait = 1.5;
        vehicle.wantsMerge = false;
      }
      if (vehicle.indicator && vehicle.mergeWait > 0) {
        vehicle.mergeWait -= delta;
        if (vehicle.mergeWait <= 0) {
          const clear = !state.traffic.some((other) => other !== vehicle
            && Math.abs(other.visualLane - vehicle.targetLane) < 0.8 && Math.abs(other.z - vehicle.z) < 24);
          if (clear) vehicle.lane = vehicle.targetLane;
          else vehicle.indicator = 0;
        }
      }
      vehicle.visualLane += (vehicle.lane - vehicle.visualLane) * Math.min(delta * 2.5, 1);
      if (vehicle.mergeWait <= 0 && Math.abs(vehicle.visualLane - vehicle.lane) < 0.02) vehicle.indicator = 0;
    });

    // Keep traffic from driving through slower vehicles ahead in the same lane.
    const ahead = new Map();
    state.traffic.sort((a, b) => b.z - a.z).forEach((vehicle) => {
      const leader = ahead.get(vehicle.lane);
      if (leader) {
        const gap = (TRAFFIC[leader.kind].length + TRAFFIC[vehicle.kind].length) / 2 + 5;
        vehicle.z = Math.min(vehicle.z, leader.z - gap);
      }
      ahead.set(vehicle.lane, vehicle);
    });

    for (const vehicle of state.traffic) {
      const body = TRAFFIC[vehicle.kind];
      const playerBody = TRAFFIC[car().kind];
      const depthRadius = (body.length + playerBody.length) * 0.25;
      const sameDepth = vehicle.previousZ >= ROAD.playerDepth - depthRadius && vehicle.z <= ROAD.playerDepth + depthRadius;
      const sameLane = Math.abs(vehicle.visualLane - state.visualLane) * ROAD.laneWidth < (body.width + playerBody.width) * 0.46;
      if (!sameDepth || !sameLane || active("phase") || state.invulnerable > 0 || vehicle.removed) continue;
      if (active("shield")) {
        vehicle.removed = true;
        state.abilityRemaining = 0;
        state.invulnerable = 1.4;
        state.events.push({ type: "shield", lane: state.visualLane, vehicle: { ...vehicle } });
      } else {
        vehicle.wrecked = true;
        end("crashed");
        state.events.push({ type: "crash", lane: state.visualLane, otherLane: vehicle.visualLane, depth: vehicle.z });
        break;
      }
    }
    state.traffic = state.traffic.filter((vehicle) => vehicle.z > ROAD.nearDepth && !vehicle.removed);
    const goal = LENGTHS[settings.length].distance;
    if (state.phase === "running" && Number.isFinite(goal) && state.distance >= goal) {
      state.distance = goal;
      end("finished");
      state.events.push({ type: "finish" });
    }
    return state.events;
  }

  configure(settings);
  return {
    state, get settings() { return settings; }, configure, start, step, changeLane, activateAbility,
    setBoost(value) { state.boost = Boolean(value) && state.phase === "running"; },
    active,
  };
}
