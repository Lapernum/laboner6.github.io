/* Bottom date HUD: current month, month-to-month jumps, and a photo counter. */

import { groupForIndex } from "./data.js";

export function createDateHud({ data, elements, gallery, onNavigate }) {
  const { hud, year, month, counter, prev, next } = elements;
  let currentGroup = null;

  function update(image) {
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

  function jump(direction) {
    if (!currentGroup) return;
    const groupIndex = data.months.indexOf(currentGroup);
    const targetIndex = groupIndex + direction;
    const target = data.months[targetIndex];
    if (!target) return;
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
