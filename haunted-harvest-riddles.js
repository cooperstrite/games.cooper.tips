// Each mode has its own puzzle families. Numbers, symbols, and rune orders vary
// between harvests; a deck is exhausted before a question family repeats.
export const PUZZLE_LEVELS = Object.freeze({
  cozy: { label: "Cozy / gentle logic", runes: 3 },
  eerie: { label: "Eerie / deduction", runes: 4 },
  wicked: { label: "Wicked / expert logic", runes: 5 },
});

function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const choice = (id, prompt, options, correct, explain, hint) => ({ id, type: "choice", prompt, options, answer: [correct], explain, hint });
function number(id, prompt, value, explain, hint, mode) {
  if (mode === "wicked") return { id, type: "number", prompt, value, explain, hint, options: [], answer: [] };
  const patterns = [[-3,-1,2],[1,2,4],[-4,-2,-1],[-5,3,6],[-1,2,7],[-6,-3,4]];
  const hash = [...id].reduce((sum, letter) => sum + letter.charCodeAt(0), value);
  const values = new Set([value, ...patterns[hash % patterns.length].map(offset => value + offset).filter(n => n >= 0)]);
  for (let extra = 1; values.size < 4; extra++) values.add(value + extra);
  const options = [...values].map(String);
  return choice(id, prompt, options, 0, explain, hint);
}
export function permutations(items) {
  if (!items.length) return [[]];
  return items.flatMap((item, i) => permutations(items.filter((_, j) => i !== j)).map(tail => [item, ...tail]));
}
export function obeysClue(order, clue) {
  const a = order.indexOf(clue.a), b = order.indexOf(clue.b), c = order.indexOf(clue.c);
  switch (clue.kind) {
    case "before": return a < b;
    case "gap": return b - a === clue.gap;
    case "next": return Math.abs(a - b) === 1;
    case "apart": return Math.abs(a - b) > 1;
    case "middle": return a > 0 && a < order.length - 1;
    case "between": return a < b && b < c;
    default: return false;
  }
}
function clueText(clue, names) {
  const a = names[clue.a], b = names[clue.b], c = names[clue.c];
  switch (clue.kind) {
    case "before": return `${a} is somewhere to the left of ${b}.`;
    case "gap": return `${b} is exactly ${clue.gap} places to the right of ${a}.`;
    case "next": return `${a} and ${b} are next to each other.`;
    case "apart": return `${a} and ${b} are not next to each other.`;
    case "middle": return `${a} is at neither end.`;
    case "between": return `${b} is somewhere between ${a} on its left and ${c} on its right.`;
  }
}
export function makeRunePuzzle(mode, random = Math.random, variant = 0) {
  const count = PUZZLE_LEVELS[mode].runes;
  const names = shuffled(["Bat", "Moon", "Thorn", "Skull", "Candle", "Moth", "Raven", "Key"], random).slice(0, count);
  const answer = shuffled(names.map((_, i) => i), random), candidates = [];
  for (let a = 0; a < count; a++) {
    if (mode !== "cozy") candidates.push({ kind: "middle", a });
    for (let b = 0; b < count; b++) if (a !== b) {
      candidates.push({ kind: "before", a, b });
      if (mode !== "cozy") {
        candidates.push({ kind: "next", a, b }, { kind: "gap", a, b, gap: 2 });
        if (mode === "wicked") candidates.push({ kind: "apart", a, b }, { kind: "gap", a, b, gap: 3 });
      }
    }
  }
  let remaining = permutations(answer);
  const constraints = [], available = shuffled(candidates.filter(c => obeysClue(answer, c)), random);
  // Prefer indirect clues in harder modes; fall back to relative positions only
  // if needed. Stop only when the displayed clues determine one unique order.
  if (mode !== "cozy") available.sort((a, b) => (a.kind === "before") - (b.kind === "before"));
  for (const clue of available) {
    const kept = remaining.filter(order => obeysClue(order, clue));
    if (kept.length === remaining.length) continue;
    constraints.push(clue); remaining = kept;
    if (remaining.length === 1) break;
  }
  const clues = constraints.map(c => clueText(c, names));
  return { id: `${mode}-runes-${variant}`, type: "order", prompt: `Break the curse: arrange all ${count} runes from left to right.`,
    options: names, answer, clues, constraints, hint: `The first rune is ${names[answer[0]]}. Use the clues to place the others.`,
    explain: `The only order that satisfies every clue is ${answer.map(i => names[i]).join(" > ")}.` };
}

export function createRiddleDeck(mode = "eerie", night = 0, random = Math.random) {
  if (!PUZZLE_LEVELS[mode]) mode = "eerie";
  const n = 3 + Math.floor(random() * 5) + Math.max(0, Math.min(2, night));
  let sweet;
  if (mode === "cozy") sweet = [
    choice("cozy-shadow", "I follow you through moonlight, stretch without growing, and disappear when every light goes out. What am I?", ["Your shadow", "Your reflection", "Your footsteps", "Your breath"], 0, "A shadow needs light, changes length with the light's angle, and follows the object that blocks it.", "Think about what a lantern casts behind you."),
    choice("cozy-echo", "The empty crypt answers every word, but never speaks first. What answers you?", ["An echo", "A footprint", "A shadow", "A candle"], 0, "An echo repeats a sound after it has been made.", "The answer is something you hear, not a creature."),
    choice("cozy-candle", "Four candles are lit in a sealed room. You blow out two. The others burn completely away. How many candles remain?", ["2", "0", "4", "1"], 0, "The two extinguished candles remain. The two still burning are used up.", "Count the wax candles left, not the flames."),
    number("cozy-baskets", `A witch puts ${n} sweets in each of 3 baskets, then takes 2 sweets from EACH basket. How many sweets remain altogether?`, 3 * (n - 2), `Each basket has ${n - 2} left. Three baskets hold ${3 * (n - 2)} sweets.`, "Subtract two from one basket before multiplying by three.", mode),
    number("cozy-growth", `The gravestones read ${n}, ${n + 3}, ${n + 6}, ${n + 9}. The same amount is added each time. What number comes next?`, n + 12, `Every step adds 3, so ${n + 9} + 3 = ${n + 12}.`, "Compare two neighboring gravestones.", mode),
    choice("cozy-lanterns", "A red lantern stands left of a blue one. A green lantern stands right of the blue one. Which lantern must be in the middle?", ["Blue", "Red", "Green", "There is not enough information"], 0, "The order is red, blue, green.", "Draw three spaces and place the blue lantern between the other two."),
    choice("cozy-bags", "The key is in one of three bags. The red bag is empty. The key is not in the bag with a star. The blue bag has a star; the black bag has a moon. Which bag holds the key?", ["Black", "Blue", "Red", "None of them"], 0, "Red is empty and blue has the forbidden star, leaving black.", "Cross out one bag for each clue."),
    number("cozy-chimes", "A clock takes 4 seconds to chime three times, with equal gaps between chimes. How many seconds does it take to chime six times?", 10, "Three chimes have two gaps, so each gap is 2 seconds. Six chimes have five gaps: 10 seconds.", "Count the gaps between sounds, not the sounds.", mode),
  ];
  else if (mode === "eerie") sweet = [
    number("eerie-cauldrons", `A small cauldron holds ${n} cups. A large one holds twice as much. Three large cauldrons and two small ones are filled, then ${n + 2} cups are used. How many cups remain?`, 7 * n - 2, `The cauldrons hold 8 x ${n} = ${8 * n} cups. Subtract ${n + 2} to leave ${7 * n - 2}.`, "Express every cauldron in small-cauldron units first.", mode),
    number("eerie-sequence", `The runes show ${n}, ${n + 2}, ${n + 6}, ${n + 12}, ${n + 20}. The gaps grow by the same amount. What comes next?`, n + 30, "The gaps are 2, 4, 6, and 8. The next gap is 10.", "Look at the differences, then the differences between those.", mode),
    choice("eerie-statements", "One chest holds a key. Exactly ONE inscription is true. Red says 'The key is in Blue.' Blue says 'The key is not in Blue.' Black says 'The key is not in Red.' Where is the key?", ["Red", "Blue", "Black", "The clues allow two answers"], 0, "Red and Blue's inscriptions contradict, so exactly one is already true. Black's must be false; the key is in Red.", "The first two inscriptions cannot both be true or both be false."),
    number("eerie-wax", `A witch can melt 3 candle stubs into one new candle. She starts with 9 stubs, burns every new candle, and reuses its stub. How many extra candles can she burn?`, 4, "Nine stubs make three candles. Burning those leaves three stubs, which make one more candle.", "A newly burned candle leaves another stub.", mode),
    number("eerie-remainder", "The number of bats is greater than 10 and less than 20. Grouped in threes, TWO are left over. Grouped in fours, TWO are left over. How many bats are there?", 14, "Between 10 and 20, 11, 14, and 17 leave two after division by three. Only 14 also leaves two after division by four.", "List numbers that satisfy one clue, then test the other.", mode),
    choice("eerie-labels", "Three jars are labeled Bats, Spiders, and Mixed. EVERY label is wrong. You draw one creature from the jar labeled Mixed: it is a bat. What is in the jar labeled Spiders?", ["A mixture of bats and spiders", "Only bats", "Only spiders", "It cannot be determined"], 0, "Mixed must contain only bats. The Spiders jar cannot contain spiders and cannot be the bats jar, so it is mixed.", "The jar labeled Mixed cannot actually be mixed."),
    number("eerie-meet", `Two ghosts start ${n * 5} steps apart and move toward one another. One travels 2 steps each second; the other travels 3. After how many seconds do they meet?`, n, `Together they close 5 steps per second. ${n * 5} / 5 = ${n}.`, "Add their speeds because they approach each other.", mode),
    choice("eerie-knock", "A vampire always lies; a witch always tells the truth. Of two strangers, A says 'At least one of us is a vampire.' What are A and B?", ["A is a witch; B is a vampire", "Both are witches", "Both are vampires", "A is a vampire; B is a witch"], 0, "If A were a vampire, the statement would be true because A is a vampire, contradicting the rule. A is a witch, so B must be a vampire.", "Try assuming A is lying and check whether that is possible."),
  ];
  else sweet = [
    number("wicked-inclusion", `At the manor, ${n + 5} guests wear masks, ${n + 3} wear capes, and ${n} wear both. Another 4 wear neither. How many guests are there?`, n + 12, `Count each group, subtract the ${n} counted twice, then add 4: ${n + 5} + ${n + 3} - ${n} + 4 = ${n + 12}.`, "Guests wearing both must only be counted once.", mode),
    number("wicked-clock", "A cursed clock gains 5 minutes for every real hour. It is set correctly at 6:00 PM. When it displays 12:30 AM that night, how many real minutes have passed?", 360, "The clock runs at 65 displayed minutes per 60 real minutes. It displays 390 elapsed minutes, so 390 x 60 / 65 = 360 real minutes.", "First find the number of displayed minutes since 6:00 PM, then scale by 60/65.", mode),
    number("wicked-doors", `There are ${n * n + 3} crypt doors, all closed. On pass 1 every door is toggled, on pass 2 every second door, then every third, and so on through pass ${n * n + 3}. How many doors end open?`, n, `Only perfect squares have an odd number of divisors. There are ${n} squares from 1 through ${n * n + 3}.`, "A door stays open only if it has an odd number of divisors.", mode),
    number("wicked-bridge", "Four travelers take 1, 2, 5, and 10 minutes to cross a haunted bridge. At most two cross at once, at the slower person's pace. The only lantern must accompany EVERY crossing, including returns. What is the minimum total number of minutes?", 17, "1 and 2 cross (2); 1 returns (1); 5 and 10 cross (10); 2 returns (2); 1 and 2 cross (2). Total: 17.", "Let the two fastest travelers ferry the lantern so the slowest two can cross together.", mode),
    number("wicked-code", "A three-digit vault code has no zeroes. Its digits sum to 14. The hundreds digit is twice the ones digit. Reversing the code makes it 297 smaller. What is the code?", 653, "The reversal difference gives hundreds minus ones = 3. Since hundreds is twice ones, they are 6 and 3. The middle digit is 14 - 9 = 5.", "Reversing a three-digit number changes it by 99 times the difference of its outside digits.", mode),
    number("wicked-walk", "Reach the seventh stair of a crypt by taking either one or two stairs per move. How many different sequences of moves can you take?", 21, "The number for a stair is the sum for the previous two: 1, 2, 3, 5, 8, 13, 21.", "Any route to stair 7 last came from stair 6 or stair 5.", mode),
    choice("wicked-truth", "One of four tombs hides a key. Exactly TWO plaques are true. A: 'The key is in B or C.' B: 'The key is in A.' C: 'The key is not in C.' D: 'The key is in D.' Which tomb holds it?", ["A", "B", "C", "D", "The clues do not identify one tomb"], 4, "A makes B and C true. B makes A and C true. D makes C and D true. Multiple placements satisfy exactly two truths, so no unique tomb is identified.", "Check all four possible key locations; do not stop at the first one that works."),
    number("wicked-bells", "Three bells ring together at midnight, then every 6, 8, and 9 minutes respectively. How many minutes pass before all three next ring together?", 72, "The least common multiple of 6, 8, and 9 is 2 cubed x 3 squared = 72.", "Find the smallest positive number divisible by all three intervals.", mode),
  ];
  sweet = sweet.map(q => ({ ...q, mode, level: PUZZLE_LEVELS[mode].label }));
  const cursed = Array.from({ length: 5 }, (_, i) => ({ ...makeRunePuzzle(mode, random, i), mode, level: PUZZLE_LEVELS[mode].label }));
  return { sweet: shuffled(sweet, random), cursed: shuffled(cursed, random) };
}

export function isRiddleAnswer(question, value) {
  if (question.type === "number") return /^\d+$/.test(String(value).trim()) && Number(value) === question.value;
  return Array.isArray(value) && value.length === question.answer.length && value.every((answer, i) => answer === question.answer[i]);
}
