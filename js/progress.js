/* Draggable progress rail. Replaces the old position-only indicator. */

import { clamp } from "./config.js";
import { t } from "./i18n.js";

export function createProgress({ rail, thumb, tip, onSeek }) {
  let dragging = false;
  let pointerId = null;
  let metrics = {
    trackLeft: 0,
    trackWidth: 0,
    thumbWidth: 0,
    maxScroll: 0,
    scrollWidth: 0,
  };
  let grabOffset = 0;
  let moved = false;

  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function measure() {
    const rect = rail.getBoundingClientRect();
    const viewport = window.innerWidth;
    const docWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth
    );
    const maxScroll = Math.max(0, docWidth - viewport);
    const ratio = docWidth > 0 ? viewport / docWidth : 1;
    const thumbWidth = clamp(
      rect.width * ratio,
      Math.min(26, rect.width * 0.4),
      rect.width
    );
    metrics = {
      trackLeft: rect.left,
      trackWidth: rect.width,
      thumbWidth,
      maxScroll,
      scrollWidth: docWidth,
    };
    thumb.style.width = `${thumbWidth}px`;
    rail.setAttribute("aria-valuemax", String(Math.round(maxScroll)));
    update();
  }

  function maxThumbLeft() {
    return Math.max(0, metrics.trackWidth - metrics.thumbWidth);
  }

  function scrollToThumbLeft(left) {
    const travel = maxThumbLeft();
    const ratio = travel === 0 ? 0 : clamp(left / travel, 0, 1);
    onSeek(ratio * metrics.maxScroll);
  }

  function update() {
    const travel = maxThumbLeft();
    const ratio =
      metrics.maxScroll > 0
        ? clamp(window.scrollX / metrics.maxScroll, 0, 1)
        : 0;
    const left = ratio * travel;
    thumb.style.transform = `translate3d(${left}px, 0, 0)`;
    rail.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    rail.setAttribute(
      "aria-valuetext",
      t(
        `${Math.round(ratio * 100)}%，${metrics.scrollWidth} 像素宽`,
        `${Math.round(ratio * 100)}%, ${metrics.scrollWidth}px wide`
      )
    );
    rail.classList.toggle("is-at-start", ratio <= 0.0001);
    rail.classList.toggle("is-at-end", ratio >= 0.9999);
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (metrics.maxScroll <= 0) return;
    event.preventDefault();
    dragging = true;
    moved = false;
    pointerId = event.pointerId;
    measure();
    const rect = rail.getBoundingClientRect();
    metrics.trackLeft = rect.left;

    const thumbRect = thumb.getBoundingClientRect();
    const onThumb =
      event.clientX >= thumbRect.left - 4 &&
      event.clientX <= thumbRect.right + 4;

    if (onThumb) {
      grabOffset = event.clientX - thumbRect.left;
    } else {
      grabOffset = metrics.thumbWidth / 2;
      const left = event.clientX - metrics.trackLeft - grabOffset;
      scrollToThumbLeft(left);
    }

    rail.classList.add("is-dragging");
    document.documentElement.classList.add("rail-dragging");
    try {
      rail.setPointerCapture(pointerId);
    } catch (error) {
      /* pointer capture is an enhancement */
    }
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(event) {
    if (!dragging) return;
    if (Math.abs(event.clientX - (metrics.trackLeft + grabOffset)) > 0) {
      moved = true;
    }
    event.preventDefault();
    const left = event.clientX - metrics.trackLeft - grabOffset;
    scrollToThumbLeft(left);
  }

  function onPointerUp(event) {
    if (!dragging) return;
    dragging = false;
    rail.classList.remove("is-dragging");
    document.documentElement.classList.remove("rail-dragging");
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    try {
      rail.releasePointerCapture(event.pointerId);
    } catch (error) {
      /* already released */
    }
    if (!moved && tip) {
      tip.classList.add("is-dismissed");
    }
    pointerId = null;
  }

  function onKeyDown(event) {
    if (metrics.maxScroll <= 0) return;
    const step = Math.max(180, window.innerWidth * 0.18);
    let handled = true;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        window.scrollBy({ left: step, top: 0, behavior: prefersReduced ? "auto" : "smooth" });
        break;
      case "ArrowLeft":
      case "ArrowUp":
        window.scrollBy({ left: -step, top: 0, behavior: prefersReduced ? "auto" : "smooth" });
        break;
      case "PageDown":
        window.scrollBy({ left: window.innerWidth * 0.8, top: 0, behavior: "smooth" });
        break;
      case "PageUp":
        window.scrollBy({ left: -window.innerWidth * 0.8, top: 0, behavior: "smooth" });
        break;
      case "Home":
        window.scrollTo({ left: 0, top: 0, behavior: "smooth" });
        break;
      case "End":
        window.scrollTo({ left: metrics.maxScroll, top: 0, behavior: "smooth" });
        break;
      default:
        handled = false;
    }
    if (handled) event.preventDefault();
  }

  rail.addEventListener("pointerdown", onPointerDown);
  rail.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", measure);

  // The first paint runs before fonts settle; measure again next frame.
  requestAnimationFrame(measure);

  return {
    update,
    measure,
    get isDragging() {
      return dragging;
    },
  };
}
