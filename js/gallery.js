/* Horizontal, two-row collage. Builds the DOM once, loads thumbnails only when
 * they approach the viewport, and exposes lightweight geometry queries. */

import { clamp, prefersReducedMotion } from "./config.js";
import { insertArcs } from "./logo.js";

const EXPAND_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 5h5v2H7v3H5V5Zm9 0h5v5h-2V7h-3V5ZM5 14h2v3h3v2H5v-5Zm12 0h2v5h-5v-2h3v-3Z"/></svg>';

export function createGallery({ data, flow1, flow2, onCurrentChange }) {
  const items = new Map();
  const flow1Items = [];
  const flow2Items = [];
  const firstVisibleLoaded = [];

  let geometry = {
    flow1: [],
    flow2: [],
    photoHeight: 0,
    gap: 0,
    maxScroll: 0,
    scrollWidth: 0,
  };
  let currentIndex = -1;
  let destroyed = false;

  const observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const item = items.get(Number(entry.target.dataset.index));
              if (item) loadItem(item);
            }
          },
          { root: null, rootMargin: "260px 90% 260px 90%", threshold: 0.01 }
        )
      : null;

  build();
  measure();
  window.addEventListener("resize", measure);
  window.addEventListener("orientationchange", measure);

  function build() {
    const fragment1 = document.createDocumentFragment();
    const fragment2 = document.createDocumentFragment();

    for (let i = data.images.length - 1; i >= 0; i -= 1) {
      const image = data.images[i];
      const anchor = document.createElement("a");
      anchor.className = "photo";
      anchor.href = `?targetId=${image.index}`;
      anchor.dataset.index = String(image.index);
      anchor.style.setProperty("--ratio", String(image.ratio));
      anchor.setAttribute(
        "aria-label",
        `查看作品 ${image.name}，${image.date || "日期未知"}`
      );
      anchor.innerHTML =
        '<span class="photo-media">' +
        '<span class="photo-skeleton" aria-hidden="true"></span>' +
        `<img class="photo-img" alt="Lapernum 的星际公民游戏摄影作品 ${image.index}" decoding="async" draggable="false">` +
        '<span class="photo-fallback" aria-hidden="true"></span>' +
        "</span>" +
        '<span class="photo-ui" aria-hidden="true">' +
        `<span class="photo-caption"><span class="photo-date">${image.date
          .slice(0, 10)
          .replace(/-/g, ".")}</span><span class="photo-name">${image.name}</span></span>` +
        `<span class="photo-expand">${EXPAND_ICON}</span>` +
        "</span>";

      const item = {
        image,
        el: anchor,
        img: anchor.querySelector("img"),
        loaded: false,
        loadPromise: null,
      };
      items.set(image.index, item);
      if (image.flow === 1) {
        fragment1.appendChild(anchor);
        flow1Items.push(item);
      } else {
        fragment2.appendChild(anchor);
        flow2Items.push(item);
      }

      if (!observer) loadItem(item);
      else observer.observe(anchor);
    }

    flow1.appendChild(fragment1);
    flow2.appendChild(fragment2);

    // The newest handful is always worth loading before the observer settles.
    for (let i = data.images.length - 1; i >= Math.max(0, data.images.length - 6); i -= 1) {
      const item = items.get(i);
      if (item) loadItem(item);
    }
    for (const item of flow1Items.slice(0, 3).concat(flow2Items.slice(0, 3))) {
      firstVisibleLoaded.push(loadItem(item));
    }
  }

  function loadItem(item) {
    if (!item || destroyed) return Promise.resolve();
    if (item.loadPromise) return item.loadPromise;
    item.loaded = true;
    if (observer) observer.unobserve(item.el);
    const img = item.img;

    item.loadPromise = new Promise((resolve) => {
      const reveal = () => {
        item.el.classList.add("is-loaded");
      };
      const fail = () => {
        item.el.classList.add("is-error");
        const fallback = item.el.querySelector(".photo-fallback");
        if (fallback) insertArcs(fallback, "arcs arcs-small");
      };
      const done = () => {
        resolve();
      };

      img.addEventListener(
        "load",
        () => {
          if (typeof img.decode === "function") {
            img.decode().then(reveal).catch(reveal);
          } else {
            reveal();
          }
          done();
        },
        { once: true }
      );
      img.addEventListener(
        "error",
        () => {
          fail();
          done();
        },
        { once: true }
      );
      img.src = item.image.thumb;
      if (img.complete && img.naturalWidth > 0) reveal();
    });
    return item.loadPromise;
  }

  function measure() {
    if (destroyed) return;
    const photoHeight = flow1.clientHeight || window.innerHeight * 0.35;
    const styles = getComputedStyle(flow1);
    const gap =
      parseFloat(styles.columnGap || styles.gap) ||
      parseFloat(styles.gap) ||
      window.innerHeight * 0.02;
    const viewportWidth = window.innerWidth;
    const docWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth
    );
    const maxScroll = Math.max(0, docWidth - viewportWidth);

    const flow1X = absoluteLeft(flow1);
    const flow2X = absoluteLeft(flow2);

    geometry = {
      photoHeight,
      gap,
      maxScroll,
      scrollWidth: docWidth,
      flow1: buildAxis(flow1Items, flow1X, photoHeight, gap),
      flow2: buildAxis(flow2Items, flow2X, photoHeight, gap),
    };
    updateCurrent();
  }

  function absoluteLeft(element) {
    return element.getBoundingClientRect().left + window.scrollX;
  }

  function buildAxis(list, startX, photoHeight, gap) {
    const axis = [];
    let x = startX;
    for (const item of list) {
      const width = Math.max(1, item.image.ratio * photoHeight);
      axis.push({
        index: item.image.index,
        item,
        start: x,
        end: x + width,
        width,
      });
      x += width + gap;
    }
    return axis;
  }

  function axisForIndex(index) {
    const item = items.get(index);
    if (!item) return null;
    const axis = item.image.flow === 1 ? geometry.flow1 : geometry.flow2;
    return axis.find((entry) => entry.index === index) || null;
  }

  function indexAt(x) {
    const axis = geometry.flow1.length ? geometry.flow1 : geometry.flow2;
    if (!axis.length) return -1;
    if (x <= axis[0].start) return axis[0].index;
    if (x >= axis[axis.length - 1].end) return axis[axis.length - 1].index;
    let low = 0;
    let high = axis.length - 1;
    let found = 0;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (axis[mid].start <= x) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return axis[found].index;
  }

  function currentIndexAt(offset = null) {
    const focal = offset == null ? clamp(window.innerWidth * 0.06, 24, 120) : offset;
    return indexAt(window.scrollX + focal);
  }

  function updateCurrent(force = false) {
    const next = currentIndexAt();
    if (next === currentIndex || (!force && next < 0)) return currentIndex;
    currentIndex = next;
    const image = data.images[next];
    if (image && typeof onCurrentChange === "function") onCurrentChange(image);
    return currentIndex;
  }

  function scrollToIndex(
    index,
    { behavior = "smooth", align = "left", offset = null } = {}
  ) {
    const entry = axisForIndex(index);
    if (!entry) return false;
    const margin =
      offset != null
        ? offset
        : align === "left"
        ? Math.min(72, window.innerWidth * 0.04)
        : 0;
    let target = entry.start - margin;
    if (align === "center") {
      target = entry.start + entry.width / 2 - window.innerWidth / 2;
    }
    target = clamp(target, 0, geometry.maxScroll);
    window.scrollTo({
      left: target,
      behavior:
        behavior === "smooth" && !prefersReducedMotion() ? "smooth" : "auto",
    });
    // Give the observer a nudge: images around the destination should start
    // decoding even before the smooth scroll arrives.
    const axis = entry.item.image.flow === 1 ? geometry.flow1 : geometry.flow2;
    const position = axis.indexOf(entry);
    for (let offset = -3; offset <= 3; offset += 1) {
      const neighbour = axis[position + offset];
      if (neighbour) loadItem(neighbour.item);
    }
    return true;
  }

  function visibleIndexes(margin = 0) {
    const left = window.scrollX - margin;
    const right = window.scrollX + window.innerWidth + margin;
    const result = [];
    for (const entry of geometry.flow1.concat(geometry.flow2)) {
      if (entry.end >= left && entry.start <= right) result.push(entry.index);
    }
    return result;
  }

  function preloadAround(index, count = 4) {
    for (let offset = -count; offset <= count; offset += 1) {
      const item = items.get(index + offset);
      if (item) loadItem(item);
    }
  }

  function refreshGeometry() {
    measure();
  }

  function destroy() {
    destroyed = true;
    if (observer) observer.disconnect();
    window.removeEventListener("resize", measure);
    window.removeEventListener("orientationchange", measure);
  }

  return {
    items,
    get geometry() {
      return geometry;
    },
    get currentIndex() {
      return currentIndex;
    },
    updateCurrent,
    currentIndexAt,
    scrollToIndex,
    visibleIndexes,
    preloadAround,
    refreshGeometry,
    measure,
    destroy,
    firstVisibleLoaded: Promise.all(firstVisibleLoaded),
  };
}
