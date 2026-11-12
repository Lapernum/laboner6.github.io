/* The sliding "about" panel that lives in the left-hand title column. */

export function initIntro({ intro, toggle, panel, closeButton }) {
  let open = false;
  let lastFocus = null;

  function setOpen(next, { updateHash = true } = {}) {
    if (next === open) return;
    open = next;
    intro.classList.toggle("is-about-open", open);
    document.body.classList.toggle("about-open", open);
    document.documentElement.classList.toggle("about-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    panel.setAttribute("aria-hidden", String(!open));
    panel.inert = !open;
    if (open) {
      lastFocus = document.activeElement;
      requestAnimationFrame(() => {
        panel.classList.add("is-visible");
        closeButton.focus({ preventScroll: true });
      });
      if (updateHash && location.hash !== "#about") {
        history.replaceState(
          null,
          "",
          `${location.pathname}${location.search}#about`
        );
      }
    } else {
      panel.classList.remove("is-visible");
      if (updateHash && location.hash === "#about") {
        history.replaceState(
          null,
          "",
          `${location.pathname}${location.search}`
        );
      }
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus({ preventScroll: true });
      }
    }
  }

  toggle.addEventListener("click", () => setOpen(!open));
  closeButton.addEventListener("click", () => setOpen(false));
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  });

  panel.setAttribute("aria-hidden", "true");
  panel.inert = true;

  if (location.hash === "#about") {
    setOpen(true, { updateHash: false });
  }

  return {
    get isOpen() {
      return open;
    },
    open: () => setOpen(true),
    close: () => setOpen(false),
  };
}
