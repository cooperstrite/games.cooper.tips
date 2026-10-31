// One set of measurements drives the museum, floor plan, and solid hitboxes.
export const HEIGHT = 5.8;
export const START = Object.freeze({ x: 0, y: .04, z: 11, yaw: 0 });
// Shared by the visible runners and the sound of shoes crossing them.
export const RUGS = [[0,9,4.4,8],[0,0,4.4,7.4],[0,-8,7,7],[24,-3,5,10]];
export const ROOMS = [
  { id: "gallery", name: "Main Gallery", x: 0, z: -8, w: 24, d: 8, color: "#9d7b57" },
  { id: "corridor", name: "Central Corridor", x: 0, z: 0, w: 24, d: 8, color: "#7e8275" },
  { id: "entrance", name: "Entrance Hall", x: 0, z: 9.5, w: 24, d: 11, color: "#8a846e" },
  { id: "security", name: "Security Office", x: -18, z: 0, w: 12, d: 16, color: "#61777a" },
  { id: "east", name: "East Wing Storage", x: 24, z: -3, w: 24, d: 18, color: "#796f61" },
];
const box = (id, x, y, z, w, h, d, kind = "wall") => ({ id, x, y, z, w, h, d, kind });
export const WALLS = [
  box("gallery-back", 0, HEIGHT/2, -12, 24.4, HEIGHT, .4),
  box("entrance-back", 0, HEIGHT/2, 15, 24.4, HEIGHT, .4),
  box("west-outer", -24, HEIGHT/2, 0, .4, HEIGHT, 16.4),
  box("west-north", -18, HEIGHT/2, -8, 12, HEIGHT, .4),
  box("west-south", -18, HEIGHT/2, 8, 12, HEIGHT, .4),
  box("east-outer", 36, HEIGHT/2, -3, .4, HEIGHT, 18.4),
  box("east-north", 24, HEIGHT/2, -12, 24, HEIGHT, .4),
  box("east-south", 24, HEIGHT/2, 6, 24, HEIGHT, .4),
  ...[-12, 12].flatMap(x => [
    box(`side-${x}-north`, x, HEIGHT/2, -7, .4, HEIGHT, 10),
    box(`side-${x}-south`, x, HEIGHT/2, 8.5, .4, HEIGHT, 13),
    box(`side-${x}-lintel`, x, 4.8, 0, .4, 2, 4),
  ]),
  ...[-4, 4].flatMap(z => [
    box(`cross-${z}-left`, -7.6, HEIGHT/2, z, 8.8, HEIGHT, .4),
    box(`cross-${z}-right`, 7.6, HEIGHT/2, z, 8.8, HEIGHT, .4),
    box(`cross-${z}-lintel`, 0, 4.8, z, 6.4, 2, .4),
  ]),
];
export const FURNITURE = [
  box("reception", 6.4, .54, 12.1, 4, 1.08, 1.5, "desk"),
  box("security-desk", -20.5, .43, -2.8, 2.5, .86, 1.5, "desk"),
  box("security-cabinet", -23.1, 1, 4, 1.2, 2, 2.2, "cabinet"),
  box("bench-west", -6, .34, 7.8, 3.2, .68, .82, "bench"),
  box("bench-east", 6, .34, 7.8, 3.2, .68, .82, "bench"),
  box("gallery-bench", 5.4, .34, -6.7, 3.1, .68, .82, "bench"),
  box("plinth-west", -7.5, .64, -8.8, 1.25, 1.28, 1.25, "plinth"),
  box("plinth-east", 7.5, .64, -8.8, 1.25, 1.28, 1.25, "plinth"),
  box("hall-plinth", -5.5, .64, 0, 1.3, 1.28, 1.3, "plinth"),
  box("entrance-planter", -8.7, .46, 10.4, 1, .92, 1, "planter"),
  box("east-planter", 10.3, .46, 12, 1, .92, 1, "planter"),
  box("security-bin", -19, .28, -3, .48, .56, .48, "bin"),
  box("storage-rack", 32, 1.2, -10.6, 5.5, 2.4, 1.4, "rack"),
  box("storage-table", 25.5, .45, -5, 3.2, .9, 1.4, "desk"),
  box("storage-crate", 29, .55, 2.4, 1.8, 1.1, 1.25, "crate"),
];
export const MOVABLES = [box("packing-box-a", 28, .44, -.5, .88, .88, .88, "movable"), box("packing-box-b", 29.2, .36, -.2, .72, .72, .72, "movable")];
export const COLUMNS = [-4,4].flatMap(z => [-3.25,3.25].map(x => box(`column-${x}-${z}`,x,1.9,z,.68,3.8,.68,"column")));
export const CLUES = [
  { id: "footprint1", name: "Muddy Footprint", room: "Main Gallery", x: -1, y: .025, z: -10.5, radius: .22, description: "A size 10 boot print with distinctive tread pattern near the Mona Lisa's frame. The mud appears fresh and contains traces of garden soil." },
  { id: "scratches", name: "Wall Scratches", room: "Main Gallery", x: -2, y: 2, z: -11.76, radius: .25, description: "Fresh scratches on the wall where the frame was removed. The marks suggest the use of a crowbar or similar tool." },
  { id: "droplet", name: "Paint Droplet", room: "Main Gallery", x: 1.5, y: .025, z: -9, radius: .14, description: "A small droplet of white paint on the floor, likely from touching the frame while it was still wet from recent restoration." },
  { id: "fabric", name: "Torn Fabric", room: "Entrance Hall", x: 0, y: 3.5, z: 6, radius: .25, description: "A small piece of dark fabric caught on a security camera mount. Appears to be from a maintenance worker's uniform." },
  { id: "keycard", name: "Access Keycard", room: "Entrance Hall", x: -8.2, y: .045, z: 10, radius: .18, description: "A staff keycard found behind a plant. Belongs to 'J. Smith' from the maintenance department. Last used at 2:47 AM." },
  { id: "glove", name: "Latex Glove", room: "Security Office", x: -19, y: .58, z: -3, radius: .22, description: "A single latex glove found in the trash bin. No fingerprints inside, but contains traces of the frame's gold gilding." },
  { id: "note", name: "Cryptic Note", room: "Security Office", x: -20.2, y: .88, z: -2.15, radius: .24, description: "A hastily written note that reads: 'The smile will see the sunrise from the east wing storage.' Written in pencil on museum stationery." },
  { id: "camera", name: "Security Camera Footage", room: "East Wing Storage", x: 16, y: 3.7, z: -3, radius: .3, description: "Timestamp shows camera was disabled at 2:15 AM. Last frame shows a figure in maintenance clothes approaching the Mona Lisa." },
];
export function roomAt(x, z) { return ROOMS.find(r => Math.abs(x-r.x) <= r.w/2 && Math.abs(z-r.z) <= r.d/2)?.name || "Museum grounds"; }
export const MUSEUM_MODES=Object.freeze({
  easy:{label:'Easy',description:'Bouncing red exclamation marks highlight clues. Both maps show every clue.'},
  normal:{label:'Normal',description:'The original investigation. Both maps show clues; look closely to find the evidence.'},
  hard:{label:'Hard',description:'Find the evidence yourself. Clues appear on your maps only after you collect them.'},
});
export const museumMode=value=>Object.hasOwn(MUSEUM_MODES,value)?value:'normal';
export function newCase(mode='normal') { return { found: [], solved: false, seconds: 0, mode:museumMode(mode) }; }
export function mapClues(state){return CLUES.filter(c=>museumMode(state.mode)!=='hard'||state.found.includes(c.id));}
export function clueHintVisible(state,id){return museumMode(state.mode)==='easy'&&!state.found.includes(id);}
export function collectEvidence(state, id) {
  if (!CLUES.some(c => c.id === id) || state.found.includes(id)) return false;
  state.found.push(id); state.solved = state.found.length === CLUES.length; return true;
}
// Slab intersection is shared with tests; it prevents picking evidence through walls.
export function segmentHitsBox(a, b, box) {
  let near = 0, far = 1;
  for (const [axis, size] of [["x", "w"], ["y", "h"], ["z", "d"]]) {
    const lo = box[axis]-box[size]/2, hi = box[axis]+box[size]/2, delta = b[axis]-a[axis];
    if (Math.abs(delta) < 1e-8) { if (a[axis] < lo || a[axis] > hi) return false; }
    else { const t1 = (lo-a[axis])/delta, t2 = (hi-a[axis])/delta; near = Math.max(near, Math.min(t1,t2)); far = Math.min(far, Math.max(t1,t2)); if (near > far) return false; }
  }
  return far >= 0 && near < .995;
}
