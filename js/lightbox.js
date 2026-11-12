/* Accessible full-resolution viewer with keyboard, swipe and deep-link support. */

import { formatDateParts, ratioLabel } from "./config.js";
import { t } from "./i18n.js";
import { copyText, shareUrlFor, toast } from "./ui.js";

const CLOSE_MS = 320;

export function createLightbox({ data, elements, onOpen, onClose, onNavigate }) {
  const {
    root,
    img,
    loader,
    error,
    date,
    time,
    resolution,
    ratio,
    name,
    download,
    open,
    share,
    close,
    prev,
    next,
    stage,
  } = elements;

  let index = -1;
  let openState = false;
  let lastFocus = null;
  let closeTimer = 0;
  let loadToken = 0;
  let swipe = null;

  function isOpen() {
    return openState;
  }

  function openAt(nextIndex, { fromHash = false } = {}) {
    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= data.total) {
      return false;
    }
    index = nextIndex;
    if (!openState) {
      openState = true;
      lastFocus = document.activeElement;
      root.hidden = false;
      root.setAttribute("aria-hidden", "false");
      document.documentElement.classList.add("lb-open");
      requestAnimationFrame(() => {
        root.classList.add("is-open");
      });
      close.focus({ preventScroll: true });
    }
    window.clearTimeout(closeTimer);
    render(index);
    if (typeof onOpen === "function") onOpen(index);
    if (!fromHash) {
      // Keep the viewer's own focus inside the dialog.
      close.focus({ preventScroll: true });
    }
    return true;
  }

  function render(nextIndex) {
    const image = data.images[nextIndex];
    if (!image) return;
    index = nextIndex;
    root.dataset.index = String(nextIndex);
    const parts = formatDateParts(image.parsed);
    date.textContent = parts.date;
    time.textContent = parts.time;
    name.textContent = image.name;
    resolution.textContent = t("读取尺寸…", "Reading size…");
    ratio.textContent = ratioLabel(image.ratio);
    download.href = image.full;
    download.setAttribute("download", image.full.split("/").pop() || image.name);
    open.href = image.full;
    prev.disabled = nextIndex >= data.total - 1;
    next.disabled = nextIndex <= 0;
    error.hidden = true;
    loader.classList.remove("is-hidden");
    img.classList.remove("is-loaded");
    root.classList.remove("is-image-ready");

    const token = ++loadToken;
    const finish = () => {
      if (token !== loadToken) return;
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (!width || !height) return;
      resolution.textContent = `${width} × ${height}`;
      ratio.textContent = ratioLabel(width / height);
      loader.classList.add("is-hidden");
      requestAnimationFrame(() => {
        img.classList.add("is-loaded");
        root.classList.add("is-image-ready");
      });
    };
    img.onload = finish;
    img.onerror = () => {
      if (token !== loadToken) return;
      loader.classList.add("is-hidden");
      error.hidden = false;
      resolution.textContent = t("原图加载失败", "Could not load original");
    };
    img.alt = t(
      `Lapernum 的星际公民摄影作品 ${image.name}，${parts.date}`,
      `Star Citizen photograph ${image.name} by Lapernum, ${parts.date}`
    );
    img.src = image.full;
    if (img.complete && img.naturalWidth > 0) finish();

    // Warm the neighbouring thumbnails, not the multi-megabyte originals.
    for (const offset of [-1, 1]) {
      const neighbour = data.images[nextIndex + offset];
      if (neighbour) {
        const preload = new Image();
        preload.decoding = "async";
        preload.src = neighbour.thumb;
      }
    }
  }

  function go(direction) {
    if (!openState) return;
    const target = index + direction;
    if (target < 0 || target >= data.total) return;
    render(target);
    if (typeof onNavigate === "function") onNavigate(target);
  }

  function closeViewer({ restoreFocus = true } = {}) {
    if (!openState) return;
    openState = false;
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("lb-open");
    if (typeof onClose === "function") onClose(index);
    closeTimer = window.setTimeout(() => {
      root.hidden = true;
      img.removeAttribute("src");
      img.classList.remove("is-loaded");
      root.classList.remove("is-image-ready");
    }, CLOSE_MS);
    if (restoreFocus && lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus({ preventScroll: true });
    }
  }

  async function shareCurrent() {
    if (index < 0) return;
    const url = shareUrlFor(index);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Lapernum · ${data.images[index].name}`, url });
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
    }
    const ok = await copyText(url);
    toast(
      ok
        ? t("分享链接已复制", "Link copied")
        : t("复制失败，请手动复制地址栏", "Copy failed; copy the address bar")
    );
  }

  function trapFocus(event) {
    if (event.key !== "Tab") return;
    const focusables = Array.from(
      root.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((node) => node.getClientRects().length > 0);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]")) {
      closeViewer();
    }
  });
  close.addEventListener("click", () => closeViewer());
  prev.addEventListener("click", () => go(1));
  next.addEventListener("click", () => go(-1));
  share.addEventListener("click", shareCurrent);
  stage.addEventListener("click", (event) => event.stopPropagation());

  document.addEventListener("keydown", (event) => {
    if (!openState) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeViewer();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      if (index !== 0) {
        render(0);
        if (typeof onNavigate === "function") onNavigate(0);
      }
    } else if (event.key === "End") {
      event.preventDefault();
      const last = data.total - 1;
      if (index !== last) {
        render(last);
        if (typeof onNavigate === "function") onNavigate(last);
      }
    } else {
      trapFocus(event);
    }
  });

  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  stage.addEventListener("pointerup", (event) => {
    if (!swipe || swipe.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) go(1);
      else go(-1);
    }
  });
  stage.addEventListener("pointercancel", () => {
    swipe = null;
  });

  return {
    openAt,
    close: closeViewer,
    go,
    isOpen,
    get index() {
      return index;
    },
  };
}
