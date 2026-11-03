const TOUCH_KEY = 'cooper-cookie-touch-v1';

// Gesture handling belongs to this cookie, never to the document or viewport.
// Native touchstart is also used on iOS, where cancelling click is too late
// to stop the browser's double-tap gesture.
export function connectCookieInput(root, bake) {
  const button = root.querySelector('.cc-bake'), panel = root.querySelector('.cc-touch-settings');
  const toggle = panel.querySelector('button'), hint = panel.querySelector('p');
  let enabled = true, available = navigator.maxTouchPoints > 0 && matchMedia('(any-pointer: coarse)').matches;
  let suppressClickUntil = 0, feedbackTimer = 0;
  try { enabled = localStorage.getItem(TOUCH_KEY) !== 'off'; } catch { /* Default on for touch. */ }
  function render() {
    panel.hidden = !available;
    root.classList.toggle('cc-touch-ready', available);
    root.classList.toggle('cc-touch-active', available && enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = `Touch gaming: ${enabled ? 'on' : 'off'}`;
    hint.textContent = enabled ? 'Tap fast! Zoom and long-press menus are blocked on the cookie only. Scroll or pinch elsewhere as usual.' : 'Normal touch gestures are restored. Turn on for fast, uninterrupted baking.';
  }
  function reveal(event) {
    if (!available && (event.pointerType === 'touch' || event.type === 'touchstart')) { available = true; render(); }
  }
  function touchStart(event) {
    reveal(event);
    if (!enabled) return;
    event.preventDefault();
    suppressClickUntil = performance.now() + 800;
    if (button.disabled || !event.isTrusted) return;
    bake();
    button.classList.add('cc-touch-pressed');
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => button.classList.remove('cc-touch-pressed'), 120);
  }
  function touchFinish(event) {
    if (!enabled) return;
    event.preventDefault();
    suppressClickUntil = performance.now() + 800;
  }
  function pointerDown(event) {
    if (event.pointerType === 'mouse') suppressClickUntil = 0;
  }
  function click(event) {
    const touchClick = event.pointerType === 'touch' || event.sourceCapabilities?.firesTouchEvents;
    if (enabled && available && (touchClick || (event.detail > 0 && performance.now() < suppressClickUntil))) {
      event.preventDefault(); return;
    }
    if (event.isTrusted && !button.disabled) bake();
  }
  function keyDown(event) {
    // Holding a key should not supply an endless stream of manual coin taps.
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  }
  function contextMenu(event) { if (available && enabled) event.preventDefault(); }
  function changeMode() {
    enabled = !enabled; render();
    try { localStorage.setItem(TOUCH_KEY, enabled ? 'on' : 'off'); } catch { /* Session preference still works. */ }
  }
  root.addEventListener('pointerdown', reveal, { passive: true, capture: true });
  root.addEventListener('touchstart', reveal, { passive: true, capture: true });
  button.addEventListener('pointerdown', pointerDown);
  button.addEventListener('touchstart', touchStart, { passive: false });
  for (const name of ['touchmove', 'touchend', 'touchcancel']) button.addEventListener(name, touchFinish, { passive: false });
  button.addEventListener('click', click);
  button.addEventListener('keydown', keyDown);
  button.addEventListener('contextmenu', contextMenu);
  toggle.addEventListener('click', changeMode);
  render();
  return () => {
    clearTimeout(feedbackTimer);
    root.removeEventListener('pointerdown', reveal, true); root.removeEventListener('touchstart', reveal, true);
    button.removeEventListener('pointerdown', pointerDown); button.removeEventListener('touchstart', touchStart);
    for (const name of ['touchmove', 'touchend', 'touchcancel']) button.removeEventListener(name, touchFinish);
    button.removeEventListener('click', click); button.removeEventListener('keydown', keyDown);
    button.removeEventListener('contextmenu', contextMenu); toggle.removeEventListener('click', changeMode);
  };
}
