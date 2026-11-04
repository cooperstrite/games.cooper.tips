const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => { const t = clamp(n); return t * t * (3 - 2 * t); };

// A fixed crew receives and passes trays. Each hand reaches only into its own
// nearby workspace, so busy kitchens never create a crowd of walking clones.
export function chefHandoffHands(home, hands, transfers) {
  return hands.map((rest, side) => {
    let weight = 0, x = 0, y = 0;
    for (const tray of transfers) {
      const relative = tray.x - home;
      const facing = ease((relative + 25) / 50);
      const reach = relative + (side ? -23 : 23);
      const near = 1 - ease((Math.abs(reach) - 70) / 50);
      const grip = ease(tray.walk / .2) * ease((1 - tray.walk) / .2);
      const amount = grip * near * (side ? facing : 1 - facing);
      weight += amount; x += reach * amount; y += (337 - tray.lift) * amount;
    }
    if (!weight) return [...rest];
    const blend = Math.min(1, weight);
    return [rest[0] + (x / weight - rest[0]) * blend, rest[1] + (y / weight - rest[1]) * blend];
  });
}

// Jointed arms ease toward the tool or tray without abrupt pose changes.
export function bindCookieChef(element) {
  const arms = ['left', 'right'].map(side => element.querySelector(`[data-chef-arm="${side}"]`));
  const hands = ['left', 'right'].map(side => element.querySelector(`[data-chef-hand="${side}"]`));
  let current = null;
  return {
    task: element.dataset.chef, offset: Number(element.dataset.chefOffset),
    pose(left, right, seconds = 0) {
      const target = [left, right], blend = !current || seconds <= 0 ? 1 : 1 - Math.exp(-28 * seconds);
      current = target.map((point, i) => point.map((value, j) => (current?.[i][j] ?? value) + (value - (current?.[i][j] ?? value)) * blend));
      current.forEach(([x, y], i) => {
        const shoulder = i ? 30 : -30;
        arms[i].setAttribute('d', `M${shoulder} 247Q${shoulder + (x - shoulder) * .65} ${Math.min(305, Math.max(265, y - 9))} ${x} ${y}`);
        hands[i].setAttribute('cx', x); hands[i].setAttribute('cy', y);
      });
    },
  };
}
