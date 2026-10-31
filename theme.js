/* Runs before styles load so direct game links use the saved theme immediately. */
(() => {
  const storageKey = "cooper-arcade-theme-v1";
  const valid = (value) => value === "light" || value === "dark";
  const readPreference = () => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  };
  let theme = "dark";

  function syncFrame(frame) {
    // Only same-origin embedded games receive preferences, never third-party frames.
    try {
      if (new URL(frame.src, document.baseURI).origin === location.origin) {
        frame.contentWindow?.postMessage({ type: "arcade-theme", theme }, location.origin);
      }
    } catch { /* A frame may have been removed or may not be ready yet. */ }
  }

  function apply(value, persist = false) {
    theme = valid(value) ? value : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content", theme === "dark" ? "#0e101c" : "#f3f6fb"
    );
    document.querySelectorAll("[data-arcade-theme]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.arcadeTheme === theme));
    });
    if (persist) {
      try { localStorage.setItem(storageKey, theme); } catch { /* Still works this visit. */ }
    }
    document.querySelectorAll("iframe").forEach(syncFrame);
  }

  apply(readPreference());
  document.addEventListener("DOMContentLoaded", () => {
    apply(theme);
    // Keep keyboard activation of appearance controls out of game key handlers.
    document.querySelectorAll(".theme-switch").forEach((group) => {
      for (const type of ["keydown", "keyup"]) {
        group.addEventListener(type, (event) => event.stopPropagation());
      }
    });
  }, { once: true });
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("button[data-arcade-theme]");
    if (button && valid(button.dataset.arcadeTheme)) apply(button.dataset.arcadeTheme, true);
  });
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey || event.key === null) apply(readPreference());
  });
  document.addEventListener("load", (event) => {
    if (event.target.tagName === "IFRAME") syncFrame(event.target);
  }, true);
  window.addEventListener("message", (event) => {
    if (window.parent !== window && event.source === window.parent &&
        event.origin === location.origin && event.data?.type === "arcade-theme" &&
        valid(event.data.theme)) apply(event.data.theme);
  });
})();
