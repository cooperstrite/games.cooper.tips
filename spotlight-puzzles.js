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
      detail("print-leaf", "The middle leaf in the botanical print", 1377, 113, 62, 143, "extra"),
      detail("basket-cloth", "The basket's checked cloth", 0, 681, 189, 245, "extra"),
      detail("drawer-handle", "The middle drawer's handle", 739, 580, 65, 49, "extra"),
      detail("fern-pot", "The fern pot's floral pattern", 1035, 735, 124, 131, "extra"),
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
      detail("butterfly-spots", "The upper butterfly's wing pattern", 367, 171, 38, 36, "extra"),
      detail("ginkgo-edge", "The edge of the fan-shaped leaf", 1423, 125, 67, 49, "extra"),
      detail("glove-leaves", "Leaves embroidered on the glove", 1214, 915, 48, 36, "extra"),
      detail("red-book-moon", "The red book's gold ornament", 1007, 456, 118, 27, "extra"),
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
      detail("wall-lantern", "The wall lantern's finish", 161, 20, 175, 273, "extra"),
      detail("flower-pot", "The pink flowers' pot", 684, 524, 125, 76, "extra"),
      detail("lemon-crate", "The lemon crate's front panel", 999, 533, 96, 71, "extra"),
      detail("lighthouse-roof", "The lighthouse's roof", 486, 297, 28, 31, "extra"),
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
      detail("plate-flower", "A blue flower on the plate's rim", 132, 795, 61, 49, "extra"),
      detail("sugar-leaf", "A leaf on the sugar bowl", 232, 702, 49, 48, "extra"),
      detail("cup-handle", "The bottom of the cup's handle", 602, 750, 47, 43, "extra"),
      detail("lantern-finial", "The lantern's small top ornament", 244, 48, 40, 36, "extra"),
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
      detail("lamp-shade", "The desk lamp's shade", 983, 370, 147, 88, "extra"),
      detail("ink-bottle", "The glass ink bottle's color", 1155, 604, 72, 73, "extra"),
      detail("telescope", "The telescope's metal finish", 150, 158, 312, 192, "extra"),
      detail("planet-print", "The planet in the framed picture", 1127, 61, 142, 154, "extra"),
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
      detail("clock-numeral", "The bottom numeral on the clock", 110, 155, 31, 33, "extra"),
      detail("book-star", "The small ornament at the foot of a book", 1464, 633, 30, 33, "extra"),
      detail("pen", "The slanted writing instrument", 1146, 525, 35, 65, "extra"),
      detail("cushion-star", "A small star on the cushion", 398, 707, 38, 39, "extra"),
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
      detail("copper-pan", "The large hanging saucepan", 869, 40, 123, 147, "extra"),
      detail("milk", "The milk in the glass bottle", 1208, 430, 78, 133, "extra"),
      detail("flower-pitcher", "The flower pitcher's decoration", 54, 415, 107, 117, "extra"),
      detail("jam-label", "The middle jam jar's fruit label", 1276, 101, 58, 55, "extra"),
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
      detail("window-handle", "The window handle's finish", 590, 265, 24, 55, "extra"),
      detail("pepper-button", "The pepper mill's top button", 1377, 440, 26, 25, "extra"),
      detail("jar-knob", "The large white jar's lid knob", 1458, 386, 48, 40, "extra"),
      detail("tiny-jam-fruit", "The tiny fruit on the jam label", 1276, 101, 58, 55, "extra"),
    ],
  },
});
// Stable challenge identities keep saved coin receipts meaningful. Play order is
// shuffled separately, and challenge zero preserves each original puzzle.
export const SPOTLIGHT_CHALLENGE_SETS = Object.freeze({
  easy: [[0,1,2,3], [0,1,8,9], [1,2,8,10], [0,3,9,11], [0,2,9,10], [1,3,8,10], [2,3,8,9], [0,1,10,11], [1,3,9,11], [0,2,8,11]],
  medium: [[4,5,6,7,2,3], [4,5,6,7,8,10], [4,5,6,8,9,11], [4,5,7,9,10,11], [4,6,7,8,10,11], [5,6,7,8,9,10], [4,5,7,2,9,11], [4,6,7,3,8,10], [5,6,7,2,8,11], [4,5,6,3,9,10]],
  hard: [[0,1,2,3,4,5], [0,1,2,4,8,9], [0,1,3,5,8,10], [0,2,3,4,9,11], [1,2,4,5,8,11], [0,3,4,5,9,10], [1,2,3,5,10,11], [0,1,4,8,9,11], [0,2,5,8,10,11], [1,3,4,8,9,10]],
  expert: [[0,1,2,3,4,5,6,7], [0,1,2,6,7,8,9,10], [0,3,4,6,7,8,10,11], [1,2,5,6,7,8,9,11], [2,3,4,6,7,9,10,11], [0,1,5,6,7,9,10,11], [1,3,5,6,7,8,9,10], [0,2,4,6,7,8,9,11], [2,4,5,6,7,8,10,11], [0,3,5,6,7,8,9,10]],
});
export function spotlightTargets(scene, difficulty, challenge = 0) {
  const puzzle = SPOTLIGHT_PUZZLES[scene] || SPOTLIGHT_PUZZLES.glasshouse;
  const key = Object.hasOwn(SPOTLIGHT_LEVELS, difficulty) ? difficulty : "easy", level = SPOTLIGHT_LEVELS[key];
  const pool = puzzle[level.layer], sets = SPOTLIGHT_CHALLENGE_SETS[key];
  const indices = sets[Number.isInteger(challenge) && challenge >= 0 && challenge < sets.length ? challenge : 0];
  return indices.map(i => ({ ...pool[i], source: pool[i].source || level.layer }));
}
