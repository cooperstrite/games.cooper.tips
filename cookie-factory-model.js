import { LINE_STAGES, productionRates, productionFilling } from './cookie-line-engine.js';

// A tray keeps its process position when the building expands. Only the
// drawing's floor plan changes; this module never credits baked cookies.
export function factoryLayout(upgrades = {}) {
  const automatic = productionRates(upgrades).cps > 0;
  const tier = upgrades.packing || upgrades.tunnel ? 3 : upgrades.factory || upgrades.conveyor || upgrades.rotary || upgrades.depositor ? 2 : automatic ? 1 : 0;
  const plans = [
    [1450, 110, 275, 440, 605, 820, 985, 1160, 1320],
    [1700, 120, 330, 535, 745, 990, 1210, 1430, 1570],
    [1960, 120, 350, 555, 775, 1035, 1270, 1570, 1820],
    [2240, 135, 390, 615, 850, 1130, 1420, 1780, 2080],
  ];
  const [width, ...positions] = plans[tier], stages = Object.fromEntries(LINE_STAGES.map((stage, i) => [stage.id, positions[i]]));
  return { width, stages, tier, automatic, name: ['The corner kitchen', 'The neighborhood bakery', 'The busy bakehouse', 'The cookie warehouse'][tier],
    machineMix: !!(upgrades.mixer || upgrades.depositor), machinePortion: !!upgrades.depositor,
    transportBelt: !!(upgrades.conveyor || upgrades.tunnel), tunnel: !!upgrades.tunnel, upgradedOven: !!(upgrades.convection || upgrades.deck || upgrades.rotary || upgrades.tunnel),
    machineFill: !!(upgrades.piping || upgrades.factory || upgrades.depositor), machineCut: !!upgrades.factory,
    machineRoll: automatic && !!upgrades['rolling-pin'], machinePack: !!upgrades.packing, returnBelt: !!upgrades.conveyor,
    signature: `${tier}:${Object.entries(upgrades).filter(([, count]) => count > 0).map(([id]) => id).sort().join(',')}` };
}

// Station chefs pass each tray along the worktop. Smooth acceleration and lift
// settle to zero at the workbenches; no extra walking chef is needed per tray.
export function manualBatchPose(distance, plan) {
  if (plan.transportBelt) return { x: distance, carry: false, lift: 0, walk: 0 };
  const stops = [100, 280, 450, 630, 890, 1155, 1252, 1375, 1610];
  const work = x => x === 1252 || x === 1375 ? 24 : 40;
  for (let i = 0; i < stops.length; i++) {
    const x = stops[i], end = x + work(x), next = stops[i + 1] ?? 1715;
    if (distance <= end) return { x, carry: false, lift: x === 890 ? 22 : 0, walk: 0 };
    const startNext = next - (i === stops.length - 1 ? 0 : work(next));
    if (distance < startNext) {
      const t = (distance - end) / (startNext - end), eased = t * t * t * (t * (t * 6 - 15) + 10);
      const lift = (x === 890 ? 22 * (1 - eased) : 0) + (next === 890 ? 22 * eased : 0);
      return { x: x + (next - x) * eased, carry: true, lift: lift + 5 * Math.sin(eased * Math.PI) ** 2, walk: t };
    }
  }
  return { x: 1715, carry: false, lift: 0, walk: 0 };
}

export function factoryX(layout, distance) {
  const knots = [[0, 0], ...LINE_STAGES.map(stage => [stage.x, layout.stages[stage.id]]), [1715, layout.width - 35]];
  const x = Math.max(0, Math.min(1715, distance));
  for (let i = 1; i < knots.length; i++) if (x <= knots[i][0]) {
    const [a, px] = knots[i - 1], [b, qx] = knots[i];
    return px + (qx - px) * (x - a) / (b - a);
  }
  return layout.width - 35;
}

export function packingPose(x) {
  const t = Math.max(0, Math.min(1, (x - 1195) / 105));
  return { lift: Math.sin(t * Math.PI) * 48, gripping: x >= 1200 && x <= 1290, boxReady: Math.max(0, Math.min(1, (x - 1190) / 35)) };
}

export function factoryTour(upgrades, recipe) {
  const plan = factoryLayout(upgrades), filling = productionFilling(recipe);
  return [
    { id: 'mix', title: 'Ingredients become dough', text: plan.machinePortion ? 'Flour and liquid arrive through supply pipes. The depositor measures dough onto each tray. This is the upgrade that replaces hand portioning.' : plan.machineMix ? 'The mixer stirs the dough, but your chef still scoops each portion onto the tray. Buy a dough depositor on this line to automate portioning.' : 'Your chef measures ingredients, stirs the bowl, and scoops dough onto a tray. The chefs pass trays along the worktop, staying at their stations. A stand mixer automates stirring.' },
    { id: 'roll', title: 'An even sheet', text: plan.machineRoll ? 'The powered rollers press each portion to an even thickness. The turn of the rollers and the passing trays stay in step as you improve the line.' : 'The chef rolls the dough by hand on the preparation bench. The rolling pin passes over the dough instead of leaving it in a lump. Hand-tool upgrades also improve every tap.' },
    { id: 'cut', title: 'Shape each cookie', text: plan.machineCut ? 'A timed press lowers only when dough reaches it. Its cutting rings make a tray of cookie shapes; offcuts go into the recovery bin for the next mix.' : 'The baker stamps out the cookies with hand cutters. Buy Cookie factory to install the timed cutting press. Until then, shaping stays a hands-on job.' },
    { id: 'fill', title: filling.kind === 'none' ? 'A recipe without filling' : `Add ${filling.label.toLowerCase()}`, text: filling.kind === 'none' ? 'This recipe bypasses filling. The ingredient tank, delivery tube, and nozzles stay idle; they wake up when you choose a recipe with chips, oats, or jam.' : plan.machineFill ? (filling.kind === 'jam' ? 'A supply tank pumps berry filling along the clear pipe, through a valve, and into the dosing head. The nozzles open over each cookie, leaving a glossy center.' : 'A storage hopper supplies the clear ingredient tube. Chips or oats travel to a small buffer hopper, then a gate meters them over the cookies. The feed and dispenser run together.') : 'The baker adds toppings or filling by hand from the ingredient jar. A pastry press, factory, or depositor installs the connected supply tank and filling head.' },
    { id: 'bake', title: 'Pale dough turns golden', text: upgrades.tunnel ? 'Trays pass through the long heated tunnel. Look through its glass to see the cookies brown gradually before they reach the cooling belt.' : upgrades.convection ? 'The convection fan circulates warm air around the trays. Cookies turn golden as they bake. Deck, rotary, and tunnel ovens add visible equipment and more output.' : 'The small oven does the baking. Watch the warm window and the gradual change in the cookies. Your first convection oven adds automatic production and expands the kitchen.' },
    { id: 'cool', title: 'Cool before packing', text: upgrades.conveyor ? 'Fans move air across the warm cookies as trays travel along the cooling conveyor. Empty trays later loop underneath and rise back to the start.' : 'Fresh cookies rest on the cooling rack before packing. A cooling conveyor adds fans and the return belt that carries empty trays back underneath the line.' },
    { id: 'pack', title: 'Lift, lower, fold, tape', text: plan.machinePack ? 'The packing head lifts a batch off its tray and lowers it into an open carton. Guides fold the flaps, a tape roller seals the seam, and a label marks it ready to ship.' : 'Your chef lifts cookies into a carton, folds its flaps, and seals it with a handheld tape dispenser. No packing robot or automatic sealer appears until you buy Packing line for this kitchen.' },
    { id: 'ship', title: 'Off to the loading dock', text: plan.tier >= 2 ? 'Finished cartons reach the delivery truck. Each warehouse bay has its own equipment. New lines begin as small manual kitchens; selecting one lets you tap and buy upgrades for that line while the others keep working.' : 'Your chef stacks finished boxes on the collection cart. New lines start here too, with no inherited equipment. Upgrades belong to the selected line. This tour leaves your baking running.' },
  ];
}
