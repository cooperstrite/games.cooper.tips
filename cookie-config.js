export const BAKERY_KEY = "cooper-cookie-bakery-v1";
export const COOKIE_STYLE_KEY = "cooper-cookie-style-v1";
export const COOKIE_PRICE_GROWTH = 1.12;
export const COOKIE_UNIT_PRICES = Object.freeze({ click: 15, cps: 90 });
export const COOKIE_DAILY_COINS = 200;
export const COOKIE_COIN_TIERS = Object.freeze([
  { from: 1, to: 20, cookies: 1000, taps: 10 },
  { from: 21, to: 50, cookies: 5000, taps: 20 },
  { from: 51, to: 100, cookies: 25000, taps: 30 },
  { from: 101, to: 200, cookies: 100000, taps: 50 },
].map(Object.freeze));
export const COOKIE_COIN_GUIDE = "Earn up to 200 arcade coins per day. Each coin needs BOTH cookies baked and manual taps: coins 1-20 need 1,000 cookies + 10 taps each; 21-50 need 5,000 + 20; 51-100 need 25,000 + 30; 101-200 need 100,000 + 50. Reaching all 200 takes 11,420,000 cookies and 7,300 taps that day. Machines help with cookies, but cannot supply taps. Spending does not reduce progress. Both counters reset at local midnight. Hidden or closed tabs do not bake, and unused progress does not carry into tomorrow.";
export const COOKIE_UPGRADES = Object.freeze([
  { id: "mitts", name: "Extra mitts", type: "click", value: 1, note: "A second pair of hands for every batch." },
  { id: "rolling-pin", name: "Rolling pin set", type: "click", value: 2, note: "Roll an even sheet of golden dough." },
  { id: "cutters", name: "Cookie cutters", type: "click", value: 5, note: "Stamp more cookies from each sheet." },
  { id: "piping", name: "Pastry press", type: "click", value: 12, note: "Pipe a whole tray with each tap." },
  { id: "convection", name: "Convection oven", type: "cps", value: 1, note: "A spinning fan keeps each tray baking evenly." },
  { id: "mixer", name: "Stand mixer", type: "cps", value: 2, note: "Keep fresh dough turning in the bowl." },
  { id: "bakery", name: "Mini bakery", type: "cps", value: 4, note: "Your own baker works the counter." },
  { id: "deck", name: "Deck oven", type: "cps", value: 8, note: "Three glowing decks, three busy baking trays." },
  { id: "factory", name: "Cookie factory", type: "cps", value: 12, note: "A mechanical press shapes batch after batch." },
  { id: "conveyor", name: "Cooling conveyor", type: "cps", value: 24, note: "Fresh cookies roll out and cool on the belt." },
  { id: "rotary", name: "Rotary oven", type: "cps", value: 60, note: "A carousel of trays turns through the heat." },
  { id: "depositor", name: "Dough depositor", type: "cps", value: 150, note: "Four nozzles drop perfectly portioned dough." },
  { id: "tunnel", name: "Tunnel oven", type: "cps", value: 400, note: "Watch pale dough enter and golden cookies emerge." },
  { id: "packing", name: "Packing line", type: "cps", value: 1000, note: "A finishing line fills boxes with fresh cookies." },
].map(Object.freeze));

export const COOKIE_LOOKS = Object.freeze({
  recipe: [
    { id: "classic", name: "Chocolate chip", dough: "#d99a50", edge: "#9f592c", chip: "#4c2b25", note: "Golden edges and generous chocolate chunks." },
    { id: "sugar", name: "Vanilla sugar", dough: "#efcd85", edge: "#bc8242", chip: "#fff3d5", note: "A buttery cookie with a sparkle of sugar." },
    { id: "oat", name: "Oat & honey", dough: "#be8846", edge: "#805126", chip: "#ead29b", note: "Toasted oats and a warm honey glaze." },
    { id: "cocoa", name: "Double chocolate", dough: "#633b31", edge: "#35231e", chip: "#c99362", note: "Deep cocoa dough and milk chocolate shards.", cost: 120 },
    { id: "jam", name: "Strawberry thumbprint", dough: "#e8b86f", edge: "#ad693a", chip: "#b93853", note: "A glossy strawberry center in a shortbread ring.", cost: 180 },
    { id: "star", name: "Iced ginger stars", dough: "#b47a44", edge: "#774429", chip: "#f8edd5", note: "Spiced stars traced with delicate icing.", cost: 220 },
    { id: "galaxy", name: "Midnight galaxy", dough: "#62508f", edge: "#362e57", chip: "#e4c4ef", note: "A violet cookie with stars and silver sugar.", cost: 280 },
  ],
  method: [
    { id: "classic", name: "Classic bake", note: "Warm oven light and slow-rising steam." },
    { id: "hearth", name: "Hearth bake", note: "Brick-lined ovens and flickering wood-fire light.", cost: 160 },
    { id: "steam", name: "Steam bake", note: "Copper details and soft curls of steam.", cost: 200 },
    { id: "solar", name: "Sunbeam bake", note: "Golden reflectors and a sunny oven shimmer.", cost: 260 },
  ],
  room: [
    { id: "mint", name: "Mint workshop", wall: "#d9e4d8", tile: "#bdd0c3", note: "Fresh mint tiles and pale oak counters." },
    { id: "cocoa", name: "Cocoa kitchen", wall: "#d7c2a8", tile: "#b99c7d", note: "Warm cream tiles and walnut details." },
    { id: "rose", name: "Rose patisserie", wall: "#ead3d1", tile: "#d4aeb1", note: "Rose tilework and a soft pastry-shop glow.", cost: 150 },
    { id: "night", name: "Midnight bakery", wall: "#414d65", tile: "#303e54", note: "Blue evening tiles with golden task lights.", cost: 240 },
  ],
});
export const COOKIE_ITEMS = Object.freeze(Object.entries(COOKIE_LOOKS).flatMap(([setting, looks]) => looks.filter(look => look.cost).map(look => Object.freeze({
  id: `cookieclicker:${setting}:${look.id}`, name: look.name, cost: look.cost, kind: "cookie", games: ["cookieclicker"], category: "bakery", setting, value: look.id,
  description: `${look.note} A visual change for your bakery; production, prices, and rewards stay the same.`,
}))));
export const ownsCookieLook = (setting, id, owned = []) => COOKIE_LOOKS[setting]?.some(look => look.id === id && (!look.cost || owned.includes(`cookieclicker:${setting}:${id}`))) === true;
export function normalizeCookieStyle(value = {}, owned = []) {
  const style = {};
  for (const setting of Object.keys(COOKIE_LOOKS)) style[setting] = ownsCookieLook(setting, value?.[setting], owned) ? value[setting] : COOKIE_LOOKS[setting][0].id;
  style.accent = /^#[0-9a-f]{6}$/i.test(value?.accent) ? value.accent : "#318c86";
  style.name = typeof value?.name === "string" ? value.name.replace(/[\x00-\x1f]/g, "").trim().slice(0, 28) || "Your little bakery" : "Your little bakery";
  return style;
}
export function readCookieStyle(owned = [], storage) {
  let value; try { value = JSON.parse((storage ?? globalThis.localStorage)?.getItem(COOKIE_STYLE_KEY)); } catch { /* Use the included looks. */ }
  return normalizeCookieStyle(value, owned);
}
export function writeCookieStyle(value, owned = [], storage) {
  try { (storage ?? globalThis.localStorage).setItem(COOKIE_STYLE_KEY, JSON.stringify(normalizeCookieStyle(value, owned))); return true; } catch { return false; }
}
export function cookieDay(now = Date.now()) {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
const coinGoals = [{ baked: 0, taps: 0 }];
for (const tier of COOKIE_COIN_TIERS) for (let i = tier.from; i <= tier.to; i++) {
  const previous = coinGoals.at(-1);
  coinGoals.push(Object.freeze({ baked: previous.baked + tier.cookies, taps: previous.taps + tier.taps }));
}
const counter = value => Number.isFinite(value) && value > 0 ? value : 0;
export const cookieCoinGoal = coins => ({ ...coinGoals[Math.min(COOKIE_DAILY_COINS, Math.floor(counter(coins)))] });
export function cookieRewardTotal({ baked, taps } = {}) {
  let low = 0, high = COOKIE_DAILY_COINS;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2), goal = coinGoals[mid];
    if (counter(baked) >= goal.baked && Math.floor(counter(taps)) >= goal.taps) low = mid;
    else high = mid - 1;
  }
  return low;
}
export function cookieCoinProgress(daily, paid = 0) {
  const earned = Math.min(COOKIE_DAILY_COINS, Math.max(Math.floor(counter(paid)), cookieRewardTotal(daily)));
  const coin = Math.min(COOKIE_DAILY_COINS, earned + 1), goal = cookieCoinGoal(coin), previous = cookieCoinGoal(coin - 1);
  return { earned, coin, complete: earned === COOKIE_DAILY_COINS,
    cookiesLeft: Math.max(0, goal.baked - counter(daily.baked)), tapsLeft: Math.max(0, goal.taps - Math.floor(counter(daily.taps))),
    cookieMax: goal.baked - previous.baked, tapMax: goal.taps - previous.taps,
    cookieValue: Math.max(0, Math.min(goal.baked, counter(daily.baked)) - previous.baked),
    tapValue: Math.max(0, Math.min(goal.taps, Math.floor(counter(daily.taps))) - previous.taps),
  };
}
export const cookieReceipt = day => `bakery-day:${day}`;

const milestone = (metric, target, id, name, description, rank = 1) => Object.freeze({ metric, target, id, name, description, rank });
export const COOKIE_BADGES = Object.freeze([
  ...[[1,"first-click","First crumbs"],[25,"helping-hands","Helping hands"],[100,"steady-hands","Steady hands"],[250,"click-master","Click master"],[1000,"artisan","Artisan hands"],[5000,"master-baker","Master baker"]].map(([n,id,name],i)=>milestone("clicks",n,id,name,`Bake by hand ${n.toLocaleString("en-US")} ${n===1?'time':'times'}.`,1+Math.floor(i/2))),
  ...[[12,"dozen","First dozen"],[100,"century","Century baker"],[1000,"thousand","A thousand treats"],[10000,"ten-thousand","Neighborhood bakery"],[100000,"hundred-thousand","Town favorite"],[1000000,"million","One sweet million"],[10000000,"ten-million","Cookie capital"],[100000000,"hundred-million","Baking legend"]].map(([n,id,name],i)=>milestone("lifetime",n,id,name,`Bake ${n.toLocaleString("en-US")} cookies in total.`,1+Math.floor(i/2))),
  ...[[1,"first-oven","Warm ovens"],[12,"busy-ovens","Busy ovens"],[20,"automation","Automation nation"],[100,"hundred-rate","Full production"],[1000,"thousand-rate","Cookie current"],[10000,"ten-thousand-rate","Endless batches"]].map(([n,id,name],i)=>milestone("cps",n,id,name,`Reach ${n.toLocaleString("en-US")} cookies per second.`,1+Math.floor(i/2))),
  ...[[1,"first-upgrade","Open for business"],[10,"upgrade-fan","Upgrade fanatic"],[25,"expansion","Room to grow"],[50,"empire","Bakery empire"]].map(([n,id,name],i)=>milestone("purchases",n,id,name,`Buy ${n} ${n===1?'upgrade':'upgrades'}.`,i+1)),
  ...[[5,"variety-five","A little of everything"],[10,"variety-ten","Well equipped"],[14,"full-floor","The complete bakery"]].map(([n,id,name],i)=>milestone("varieties",n,id,name,`Own ${n} different upgrade types.`,i+2)),
  milestone("clickPower",50,"golden-touch","Golden touch","Reach 50 cookies per tap.",3),
  milestone("seconds",3600,"long-shift","A good day's baking","Spend an hour baking with the game visible.",3),
  milestone("balanced",5,"balanced","Best of both","Buy at least 5 hand tools and 5 machines.",2),
]);
