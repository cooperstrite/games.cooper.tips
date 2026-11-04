// Jointed SVG arms keep each hand attached to the tool or tray it is using.
export function bindCookieChef(element) {
  const arms = ['left', 'right'].map(side => element.querySelector(`[data-chef-arm="${side}"]`));
  const hands = ['left', 'right'].map(side => element.querySelector(`[data-chef-hand="${side}"]`));
  const legs = element.querySelector('[data-chef-legs]'), shoes = element.querySelector('[data-chef-shoes]');
  return {
    task: element.dataset.chef, offset: Number(element.dataset.chefOffset),
    pose(left, right, stride = null) {
      [left, right].forEach(([x, y], i) => {
        const shoulder = i ? 30 : -30;
        arms[i].setAttribute('d', `M${shoulder} 247Q${shoulder + (x - shoulder) * .65} ${Math.min(305, Math.max(265, y - 9))} ${x} ${y}`);
        hands[i].setAttribute('cx', x); hands[i].setAttribute('cy', y);
      });
      if (stride !== null) {
        const step = Math.sin(stride * Math.PI * 6) * 9;
        legs.setAttribute('d', `M-24 309l${-5 + step} 79h21l${9 - step}-63 ${9 - step} 63h21l${-6 + step}-79Z`);
        shoes?.setAttribute('d', `M${-30 + step} 385h22v14h-33q-3-10 11-14M${10 - step} 385h22l11 14H${10 - step}Z`);
      }
    },
  };
}
