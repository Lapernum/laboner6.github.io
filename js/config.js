/* Global configuration and tiny shared helpers. No dependencies. */

export const CONFIG = Object.freeze({
  imageBase: "https://img.lapernum.site",
  canonicalSite: "https://lapernum.site/",
  thumbDir: "jpg",
  fullDir: "png",
  newestFirst: true,
});

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

export const clamp = (value, min, max) =>
  value < min ? min : value > max ? max : value;

export const rafThrottle = (fn) => {
  let queued = false;
  let lastArgs = null;
  return (...args) => {
    lastArgs = args;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn(...lastArgs);
    });
  };
};

export function resolveAsset(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return path;
  return `${CONFIG.imageBase}/${path.replace(/^\/+/, "")}`;
}

export function thumbUrl(image) {
  if (image.thumbPath) return resolveAsset(image.thumbPath);
  return `${CONFIG.imageBase}/${CONFIG.thumbDir}/${encodeURIComponent(
    image.name
  )}.jpg`;
}

export function fullUrl(image) {
  if (image.fullPath) return resolveAsset(image.fullPath);
  return `${CONFIG.imageBase}/${CONFIG.fullDir}/${encodeURIComponent(
    image.name
  )}.png`;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2})-(\d{2})-(\d{2})/;

export function parseImageDate(value) {
  if (!value) return null;
  const match = DATE_RE.exec(String(value));
  if (!match) {
    const fallback = new Date(value);
    if (Number.isNaN(fallback.getTime())) return null;
    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth() + 1,
      day: fallback.getDate(),
      hour: fallback.getHours(),
      minute: fallback.getMinutes(),
      second: fallback.getSeconds(),
    };
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6]),
  };
}

export const pad2 = (n) => String(n).padStart(2, "0");

export function formatDateParts(parts) {
  if (!parts) return { date: "----.--.--", time: "--:--", month: "---- --" };
  return {
    date: `${parts.year}.${pad2(parts.month)}.${pad2(parts.day)}`,
    time: `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`,
    month: `${parts.year} ${pad2(parts.month)}`,
  };
}

export function ratioLabel(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) return "";
  const known = [
    [0.5625, "9:16"],
    [0.75, "3:4"],
    [1, "1:1"],
    [1.3333, "4:3"],
    [1.7778, "16:9"],
    [2.3704, "21:9"],
    [3.5556, "32:9"],
  ];
  const hit = known.find(([v]) => Math.abs(v - ratio) < 0.03);
  return hit ? hit[1] : `${ratio.toFixed(2)}:1`;
}

export function prefersReducedMotion() {
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
