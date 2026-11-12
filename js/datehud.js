/* Bottom date HUD: current month, month-to-month jumps, and a photo counter. */

import { groupForIndex } from "./data.js";

export function createDateHud({ data, elements, gallery, onNavigate }) {
  const { hud, year, month, counter, prev, next } = elements;
  let currentGroup = null;
  let pendingIndex = null;
  let pendingTimer = 0;
  let suppressUntil = 0;

  function setDisplay(image) {
    if (!image) return;
    year.textContent = String(image.year || "----");
    month.textContent = String(image.month || "--").padStart(2, "0");
    counter.textContent = `${String(image.index + 1).padStart(5, "0")} / ${String(
      data.total
    ).padStart(5, "0")}`;
    currentGroup = groupForIndex(data.months, image.index);
    const groupIndex = data.months.indexOf(currentGroup);
    prev.disabled = groupIndex <= 0;
    next.disabled = groupIndex < 0 || groupIndex >= data.months.length - 1;
    hud.dataset.group = currentGroup ? currentGroup.key : "";
  }

  function update(image, force = false) {
    if (!image) return;
    // A month-jump writes the requested month immediately. Ignore the stream
    // of intermediate scroll updates until that smooth scroll settles,
    // otherwise the label can flicker back to an older month.
    if (!force && performance.now() < suppressUntil) return;
    setDisplay(image);
    const groupIndex = data.months.indexOf(currentGroup);
    if (pendingIndex != null && groupIndex === pendingIndex) {
      pendingIndex = null;
      window.clearTimeout(pendingTimer);
    }
  }

  function jump(direction) {
    if (!currentGroup) return;
    const groupIndex = data.months.indexOf(currentGroup);
    if (groupIndex < 0) return;

    // Base rapid clicks on the last requested month rather than on the month
    // currently under the HUD; clicks made during the smooth scroll would
    // otherwise all target the same month.
    const base = pendingIndex != null ? pendingIndex : groupIndex;
    const targetIndex = base + direction;
    const target = data.months[targetIndex];
    if (!target) return;

    pendingIndex = targetIndex;
    suppressUntil = performance.now() + 1800;
    window.clearTimeout(pendingTimer);
    pendingTimer = window.setTimeout(() => {
      pendingIndex = null;
    }, 1500);

    // Respond immediately, even if the scroll is eventually clamped at the
    // far right (the outro occupies the last viewport, so the oldest month
    // cannot always be aligned to the left edge).
    setDisplay(data.images[target.anchor]);

    gallery.scrollToIndex(target.anchor, {
      behavior: "smooth",
      align: "left",
      offset: 0,
    });
    if (typeof onNavigate === "function") onNavigate(target);
  }

  prev.addEventListener("click", () => jump(-1));
  next.addEventListener("click", () => jump(1));

  return { update };
}
