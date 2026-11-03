// Temporary testing shortcut. Remove this connector to retire the cookie grant.
export const COOKIE_TEST_LIMIT = 1_000_000_000_000;

export function parseCookieTestAmount(value) {
  const text = String(value ?? '').trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(text)) return null;
  const amount = Number(text.replaceAll(',', ''));
  return Number.isSafeInteger(amount) && amount > 0 && amount <= COOKIE_TEST_LIMIT ? amount : null;
}

let serial = 0;
export function connectCookieTesting(wrapper, { canOpen, grant, announce = () => {} }) {
  const doc = wrapper.ownerDocument, id = `cc-testing-${++serial}`;
  const dialog = doc.createElement('dialog');
  dialog.className = 'cc-testing-dialog';
  dialog.setAttribute('aria-labelledby', `${id}-title`);
  dialog.setAttribute('aria-describedby', `${id}-description`);
  dialog.innerHTML = `<form novalidate>
    <span class="cc-eyebrow">TEMPORARY TESTING</span>
    <h3 id="${id}-title">Add testing cookies</h3>
    <p id="${id}-description">Give this bakery cookies to spend on equipment and production lines. This shortcut does not award arcade coins.</p>
    <label for="${id}-amount">Cookies to add</label>
    <input id="${id}-amount" name="amount" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" value="10000" aria-describedby="${id}-hint ${id}-error">
    <small id="${id}-hint">Enter a whole number from 1 to 1,000,000,000,000.</small>
    <p id="${id}-error" class="cc-testing-error" role="alert"></p>
    <div class="cc-testing-actions"><button type="button" data-testing-cancel>Cancel</button><button type="submit">Add cookies</button></div>
  </form>`;
  wrapper.append(dialog);
  const form = dialog.querySelector('form'), input = dialog.querySelector('input');
  const error = dialog.querySelector('.cc-testing-error'), cancel = dialog.querySelector('[data-testing-cancel]');
  const submitButton = dialog.querySelector('[type="submit"]');
  let returnFocus = null, disposed = false, submitting = false;

  function clearError() { error.textContent = ''; input.removeAttribute('aria-invalid'); }
  function fail(message) { error.textContent = message; input.setAttribute('aria-invalid', 'true'); input.focus(); }
  function restoreFocus() {
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }
  function close() { if (dialog.open) dialog.close(); restoreFocus(); }
  function open(event) {
    if (disposed || dialog.open || event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.key?.toLowerCase() !== 'p') return;
    const target = event.composedPath?.()[0] || event.target;
    if (target?.isContentEditable || target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (doc.hidden || !wrapper.isConnected || !canOpen()) return;
    event.preventDefault();
    returnFocus = doc.activeElement;
    clearError();
    try { dialog.showModal(); input.focus(); input.select(); }
    catch { returnFocus = null; announce('The testing panel could not open. Try leaving fullscreen and pressing P again.'); }
  }
  function submit(event) {
    event.preventDefault();
    if (disposed || !dialog.open || submitting) return;
    if (doc.hidden || !canOpen()) { fail('This bakery is not active. Return to the active bakery and try again.'); return; }
    const amount = parseCookieTestAmount(input.value);
    if (amount === null) { fail('Enter a positive whole number, up to 1,000,000,000,000 cookies.'); return; }
    submitting = true; submitButton.disabled = true;
    try {
      const added = grant(amount);
      if (!Number.isFinite(added) || added <= 0) { fail('No cookies were added. The bakery may already be at its limit.'); return; }
      close();
      announce(`Testing: added ${Math.floor(added).toLocaleString('en-US')} cookies. No arcade coins awarded.`);
    } catch { fail('The testing cookies could not be added. Please try again.'); }
    finally { submitting = false; submitButton.disabled = false; }
  }
  function cancelDialog(event) { event.preventDefault(); event.stopPropagation(); close(); }
  // Prevent a game's own Escape listener from also closing fullscreen or tours.
  function keydown(event) { if (event.key === 'Escape') event.stopPropagation(); }

  doc.addEventListener('keydown', open);
  form.addEventListener('submit', submit);
  cancel.addEventListener('click', close);
  input.addEventListener('input', clearError);
  dialog.addEventListener('cancel', cancelDialog);
  dialog.addEventListener('close', restoreFocus);
  dialog.addEventListener('keydown', keydown);
  return () => {
    disposed = true;
    doc.removeEventListener('keydown', open);
    form.removeEventListener('submit', submit);
    cancel.removeEventListener('click', close);
    input.removeEventListener('input', clearError);
    dialog.removeEventListener('cancel', cancelDialog);
    dialog.removeEventListener('close', restoreFocus);
    dialog.removeEventListener('keydown', keydown);
    returnFocus = null;
    if (dialog.open) dialog.close();
    dialog.remove();
  };
}
