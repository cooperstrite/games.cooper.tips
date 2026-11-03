import { LINE_STAGES, productionRates, productionFilling } from './cookie-line-engine.js';

// A tray keeps its process position when the building expands. Only the
// drawing's floor plan changes; this module never credits baked cookies.
export function factoryLayout(upgrades = {}) {
  const automatic = productionRates(upgrades).cps > 0;
  const tier = upgrades.packing || upgrades.tunnel ? 3 : upgrades.factory || upgrades.conveyor || upgrades.rotary || upgrades.depositor ? 2 : automatic ? 1 : 0;
  const plans = [
    [1270, 100, 250, 365, 485, 650, 810, 970, 1150],
    [1570, 110, 300, 455, 620, 835, 1040, 1250, 1450],
    [1890, 120, 340, 530, 740, 995, 1230, 1510, 1750],
    [2160, 135, 370, 595, 820, 1090, 1370, 1710, 2010],
  ];
  const [width, ...positions] = plans[tier], stages = Object.fromEntries(LINE_STAGES.map((stage, i) => [stage.id, positions[i]]));
  return { width, stages, tier, automatic, name: ['The corner kitchen', 'The neighborhood bakery', 'The busy bakehouse', 'The cookie warehouse'][tier],
    machineFill: !!(upgrades.piping || upgrades.factory || upgrades.depositor), machineCut: !!upgrades.factory,
    machineRoll: automatic && !!upgrades['rolling-pin'], machinePack: !!upgrades.packing, returnBelt: !!upgrades.conveyor,
    signature: `${tier}:${Object.entries(upgrades).filter(([, count]) => count > 0).map(([id]) => id).sort().join(',')}` };
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
    { id: 'mix', title: 'Ingredients become dough', text: upgrades.mixer ? 'Flour and liquid arrive in separate supply pipes. The mixer folds them into dough, then a slow screw pushes measured portions through the outlet. Watch the dough enter each tray.' : 'Your baker measures the ingredients, stirs the bowl, and spoons dough onto a reusable tray. A stand mixer adds powered mixing; a dough depositor adds a metered feed.' },
    { id: 'roll', title: 'An even sheet', text: plan.machineRoll ? 'The powered rollers press each portion to an even thickness. The turn of the rollers and the passing trays stay in step as you improve the line.' : 'The chef rolls the dough by hand on the preparation bench. The rolling pin passes over the dough instead of leaving it in a lump. Hand-tool upgrades also improve every tap.' },
    { id: 'cut', title: 'Shape each cookie', text: plan.machineCut ? 'A timed press lowers only when dough reaches it. Its cutting rings make a tray of cookie shapes; offcuts go into the recovery bin for the next mix.' : 'The baker stamps out the cookies with hand cutters. Buy Cookie factory to install the timed cutting press. Until then, shaping stays a hands-on job.' },
    { id: 'fill', title: filling.kind === 'none' ? 'A recipe without filling' : `Add ${filling.label.toLowerCase()}`, text: filling.kind === 'none' ? 'This recipe bypasses filling. The ingredient tank, delivery tube, and nozzles stay idle; they wake up when you choose a recipe with chips, oats, or jam.' : plan.machineFill ? (filling.kind === 'jam' ? 'A supply tank pumps berry filling along the clear pipe, through a valve, and into the dosing head. The nozzles open over each cookie, leaving a glossy center.' : 'A storage hopper supplies the clear ingredient tube. Chips or oats travel to a small buffer hopper, then a gate meters them over the cookies. The feed and dispenser run together.') : 'The baker adds toppings or filling by hand from the ingredient jar. A pastry press, factory, or depositor installs the connected supply tank and filling head.' },
    { id: 'bake', title: 'Pale dough turns golden', text: upgrades.tunnel ? 'Trays pass through the long heated tunnel. Look through its glass to see the cookies brown gradually before they reach the cooling belt.' : upgrades.convection ? 'The convection fan circulates warm air around the trays. Cookies turn golden as they bake. Deck, rotary, and tunnel ovens add visible equipment and more output.' : 'The small oven does the baking. Watch the warm window and the gradual change in the cookies. Your first convection oven adds automatic production and expands the kitchen.' },
    { id: 'cool', title: 'Cool before packing', text: upgrades.conveyor ? 'Fans move air across the warm cookies as trays travel along the cooling conveyor. Empty trays later loop underneath and rise back to the start.' : 'Fresh cookies rest on the cooling rack before packing. A cooling conveyor adds fans and the return belt that carries empty trays back underneath the line.' },
    { id: 'pack', title: 'Lift, lower, fold, tape', text: plan.machinePack ? 'The packing head lifts a batch off its tray and lowers it into an open carton. Guides fold the flaps, a tape roller seals the seam, and a label marks it ready to ship.' : 'Your packing chef lifts the cooled cookies into a carton and closes it at the tape stand. The Packing line replaces this work with a moving pickup head and sealing station.' },
    { id: 'ship', title: 'Off to the loading dock', text: plan.tier ? 'Sealed cartons travel into the delivery truck at the end of the line. The warehouse view above shows every purchased line working at once. Switching lines or taking this tour never pauses baking.' : 'The finished boxes go to the collection cart, ready for local deliveries. As your bakery grows, this becomes a loading dock with a delivery truck. This tour leaves your baking running.' },
  ];
}
