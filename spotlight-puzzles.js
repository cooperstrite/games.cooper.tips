import { SPOTLIGHT_LEVELS } from "./spotlight-config.js";

// Coordinates refer to the 1536 x 1024 master artwork. Only these regions from
// an edited image are composited into B; every other pixel uses the original.
const detail = (id, label, x, y, w, h, source) => ({ id, label, x: x / 15.36, y: y / 10.24, w: w / 15.36, h: h / 10.24, ...(source ? { source } : {}) });
export const SPOTLIGHT_PUZZLES = Object.freeze({
  glasshouse: {
    broad: [
      detail("watering", "The watering can's color", 300, 312, 313, 218),
      detail("flowers", "The central flowers", 588, 241, 229, 191),
      detail("fruit", "An apple becomes a pear", 777, 442, 75, 88),
      detail("pitcher", "The polka-dot pitcher's color", 1237, 391, 147, 148),
      detail("butterfly", "The lower butterfly", 429, 229, 43, 48),
      detail("birdhouse", "The birdhouse entrance", 1177, 148, 38, 39),
      detail("book", "The top book's color", 983, 414, 216, 42),
      detail("teacup", "The teacup's pattern", 533, 633, 108, 69),
    ],
    fine: [
      detail("clock-hand", "The clock's minute hand", 168, 94, 69, 46),
      detail("lantern-brace", "A diagonal lantern brace", 984, 124, 63, 72),
      detail("bird-perch", "The birdhouse perch", 1176, 185, 46, 44),
      detail("apple-leaf", "A leaf on the apple", 802, 439, 53, 40),
      detail("book-moon", "The gold book-spine ornament", 1028, 421, 88, 29),
      detail("glove-stripe", "The spacing of the glove stripes", 1320, 862, 68, 83),
      detail("pitcher-diamond", "A dot becomes a diamond", 1284, 488, 26, 28),
      detail("tile-petal", "A petal in the floor tile", 665, 964, 75, 49),
    ],
  },
  harbor: {
    broad: [
      detail("lifebuoy", "The lifebuoy's color", 0, 123, 188, 363),
      detail("fruit", "A lemon becomes an apple", 209, 752, 172, 107),
      detail("chair", "The cafe chair's color", 1108, 560, 428, 464),
      detail("cup", "The stripe on the cup", 482, 727, 137, 42),
      detail("flag", "The big sailboat's flag", 707, 177, 48, 51),
      detail("fish", "The fish in the wall picture", 1397, 261, 102, 70),
      detail("jug", "The jug's leafy pattern", 845, 505, 92, 85),
      detail("daisy", "The rightmost daisy", 434, 567, 70, 86),
    ],
    fine: [
      detail("clock-hand", "The clock's minute hand", 1425, 68, 62, 54),
      detail("lemon-leaf", "The lemon's leaf", 314, 755, 71, 54),
      detail("cup-stripe", "An extra stripe on the cup", 482, 732, 137, 35),
      detail("sugar-knob", "The sugar bowl's lid knob", 263, 649, 33, 36),
      detail("vane-sail", "The weather vane's sail", 1257, 40, 51, 55),
      detail("daisy-petal", "The daisy's petals", 437, 570, 62, 66),
      detail("fish-fin", "The fish's dorsal fin", 1423, 264, 63, 39),
      detail("small-flag", "Stripes on the small pennant", 599, 277, 38, 35),
    ],
  },
  observatory: {
    broad: [
      detail("chair", "The velvet chair's color", 130, 606, 742, 418),
      detail("mug", "The mug's golden motif", 658, 595, 79, 70),
      detail("quill", "The feather quill", 1174, 467, 132, 149),
      detail("sun", "The mobile's glowing sun", 884, 62, 72, 78),
      detail("sand", "The hourglass sand", 958, 544, 31, 58),
      detail("moon", "The moon outside the window", 557, 73, 77, 86),
      detail("cat", "The cat figurine's finish", 1364, 732, 97, 145),
      detail("book", "The book under the cat", 1276, 873, 260, 83),
    ],
    fine: [
      detail("moon-phase", "The moon's phase", 557, 73, 77, 86, "broad"),
      detail("saturn-ring", "The little planet's ring", 897, 150, 127, 61),
      detail("compass-tip", "The compass needle's tip", 1143, 690, 36, 39),
      detail("drawer-ring", "A desk drawer's ring", 828, 772, 46, 51),
      detail("quill-tip", "The end of the quill", 1172, 573, 44, 47),
      detail("book-crescent", "A crescent on a book spine", 1432, 599, 35, 45),
      detail("mug-star", "The small star on the mug", 699, 607, 27, 30),
      detail("sand", "The hourglass sand", 958, 550, 31, 52, "broad"),
    ],
  },
  bakery: {
    broad: [
      detail("teapot", "The teapot's color", 1327, 228, 173, 112),
      detail("mug", "The mug's polka dots", 410, 673, 126, 116),
      detail("fruit", "A lemon becomes an apple", 558, 680, 148, 99),
      detail("bowl", "The mixing bowl's stripes", 1011, 439, 191, 103),
      detail("tree", "The little wooden tree", 939, 337, 69, 132),
      detail("pastry", "A croissant becomes a roll", 649, 472, 133, 81),
      detail("needle", "The scale's needle", 387, 386, 106, 122),
      detail("clock", "The clock's minute hand", 150, 84, 80, 57, "fine"),
    ],
    fine: [
      detail("clock-hand", "The clock's minute hand", 150, 84, 80, 57),
      detail("lemon-leaf", "The lemon's leaf", 639, 694, 66, 76),
      detail("bowl-stripe", "A stripe on the mixing bowl", 1023, 480, 172, 34),
      detail("teapot-knob", "The teapot lid's knob", 1396, 230, 36, 29),
      detail("pie-lattice", "A strip of the pie lattice", 853, 470, 84, 46),
      detail("cabinet-knob", "The small cabinet knob", 946, 650, 43, 49),
      detail("mug-diamond", "A dot becomes a diamond", 458, 702, 27, 28),
      detail("scale-needle", "The scale's little needle", 420, 390, 57, 76, "broad"),
    ],
  },
});
export function spotlightTargets(scene, difficulty) {
  const puzzle = SPOTLIGHT_PUZZLES[scene] || SPOTLIGHT_PUZZLES.glasshouse;
  const level = Object.hasOwn(SPOTLIGHT_LEVELS, difficulty) ? SPOTLIGHT_LEVELS[difficulty] : SPOTLIGHT_LEVELS.easy;
  const pool = puzzle[level.layer], indices = difficulty === "medium" ? [4, 5, 6, 7, 2, 3] : Array.from({ length: level.count }, (_, i) => i);
  return indices.map(i => ({ ...pool[i], source: pool[i].source || level.layer }));
}
