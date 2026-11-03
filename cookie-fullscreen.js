// Keep the same live bakery and cookie button mounted when expanding the view.
export function connectCookieFullscreen(wrapper) {
  const enter = wrapper.querySelector('.cc-fullscreen');
  const exit = wrapper.querySelector('.cc-exit-fullscreen');
  const controls = wrapper.querySelector('.cc-focus-controls');
  let active = false, disposed = false, pending = false, oldOverflow = '', outside = [];
  function layout(enabled, restoreFocus = true) {
    if (active === enabled) return;
    active = enabled;
    wrapper.classList.toggle('cc-focus', enabled);
    enter.setAttribute('aria-expanded', String(enabled));
    controls.hidden = !enabled;
    if (enabled) {
      oldOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      for (let branch = wrapper; branch.parentElement; branch = branch.parentElement) {
        for (const sibling of branch.parentElement.children) {
          if (sibling !== branch && sibling instanceof HTMLElement) {
            outside.push([sibling, sibling.inert]); sibling.inert = true;
          }
        }
        if (branch.parentElement === document.body) break;
      }
      exit.focus({ preventScroll: true });
    } else {
      document.body.style.overflow = oldOverflow;
      for (const [node, inert] of outside) node.inert = inert;
      outside = [];
      if (restoreFocus && !disposed && enter.isConnected) enter.focus({ preventScroll: true });
    }
    window.dispatchEvent(new Event('resize'));
  }
  async function open() {
    if (disposed || active || pending) return;
    layout(true);
    if (!wrapper.requestFullscreen) return; // Full-window fallback on phones.
    pending = true;
    try {
      await wrapper.requestFullscreen();
      if (disposed || !active) await document.exitFullscreen?.();
    } catch { /* Keep the full-window layout when native fullscreen is unavailable. */ }
    finally { pending = false; }
  }
  function close(restoreFocus = true) {
    layout(false, restoreFocus);
    if (document.fullscreenElement === wrapper) document.exitFullscreen?.().catch(() => {});
  }
  function changed() {
    if (document.fullscreenElement === wrapper) { if (!disposed) layout(true); }
    else if (active) layout(false);
  }
  function keydown(event) {
    if (event.key === 'Escape' && active && !wrapper.querySelector('dialog[open]')) {
      event.preventDefault(); close();
    }
  }
  function route() { if (location.hash !== '#cookieclicker') close(false); }
  enter.addEventListener('click', open);
  exit.addEventListener('click', close);
  document.addEventListener('fullscreenchange', changed);
  window.addEventListener('keydown', keydown);
  window.addEventListener('hashchange', route);
  return () => {
    disposed = true; close(false);
    enter.removeEventListener('click', open);
    exit.removeEventListener('click', close);
    document.removeEventListener('fullscreenchange', changed);
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('hashchange', route);
  };
}
