/* Entry point. Wires the rebuilt gallery together and keeps it framework-free. */

import {
  $,
  prefersReducedMotion,
  rafThrottle,
} from "./config.js";
import { insertArcs } from "./logo.js";
import {
  findImageIndexByTarget,
  loadGalleryData,
} from "./data.js";
import { createGallery } from "./gallery.js";
import { createProgress } from "./progress.js";
import { createDateHud } from "./datehud.js";
import { createLightbox } from "./lightbox.js";
import { initIntro } from "./intro.js";
import { initLanguage, t } from "./i18n.js";
import { initLogoEgg } from "./logo-egg.js?v=20261113-1";
import { initTheme } from "./theme.js";
import { initAdminLink } from "./admin.js";
import { readTargetFromUrl, toast } from "./ui.js";

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const els = {
  boot: $("#boot"),
  bootArcs: $("#bootArcs"),
  bootText: $("#bootText"),
  bootError: $("#bootError"),
  themeBtn: $("#themeBtn"),
  adminOpen: $("#adminOpen"),
  rail: $("#rail"),
  railThumb: $("#railThumb"),
  railTip: $("#railTip"),
  intro: $("#intro"),
  aboutToggle: $("#aboutToggle"),
  aboutPanel: $("#aboutPanel"),
  aboutClose: $("#aboutClose"),
  gallery: $("#gallery"),
  flow1: $("#flow1"),
  flow2: $("#flow2"),
  dateHud: $("#dateHud"),
  dateYear: $("#dateYear"),
  dateMonth: $("#dateMonth"),
  datePrev: $("#datePrev"),
  dateNext: $("#dateNext"),
  counter: $("#counter"),
  backToStart: $("#backToStart"),
  lightbox: $("#lightbox"),
  lbImage: $("#lbImage"),
  lbLoader: $("#lbLoader"),
  lbError: $("#lbError"),
  lbErrorLink: $("#lbErrorLink"),
  lbDate: $("#lbDate"),
  lbTime: $("#lbTime"),
  lbResolution: $("#lbResolution"),
  lbRatio: $("#lbRatio"),
  lbName: $("#lbName"),
  lbDownload: $("#lbDownload"),
  lbOpen: $("#lbOpen"),
  lbShare: $("#lbShare"),
  lbClose: $("#lbClose"),
  lbPrev: $("#lbPrev"),
  lbNext: $("#lbNext"),
  lbStage: $("#lbStage"),
  lbArcs: $("#lbArcs"),
};

insertArcs(els.bootArcs, "arcs");
const introArcs = $("#introArcs");
insertArcs(introArcs, "arcs");
insertArcs($("#outroArcs"), "arcs");
insertArcs(els.lbArcs, "arcs");
initLogoEgg(introArcs);

initTheme(els.themeBtn);
initLanguage();
const intro = initIntro({
  intro: els.intro,
  toggle: els.aboutToggle,
  panel: els.aboutPanel,
  closeButton: els.aboutClose,
});

let admin = null;
initAdminLink(els.adminOpen).then((result) => {
  admin = result;
});

let data = null;
let gallery = null;
let hud = null;
let progress = null;
let lightbox = null;

boot().catch((error) => {
  console.error(error);
  els.bootText.textContent = t(
    "作品数据加载失败",
    "COULD NOT LOAD THE ARCHIVE"
  );
  els.bootError.hidden = false;
  els.bootError.innerHTML =
    t(
      "无法读取 <code>ImageInfo.json</code>。请确认文件存在并刷新重试。",
      "Could not read <code>ImageInfo.json</code>. Check the file and reload."
    ) +
    '<br><a href="">' +
    t("重新加载", "Reload") +
    "</a>";
  document.body.classList.add("has-error");
});

async function boot() {
  data = await loadGalleryData("./ImageInfo.json");
  if (!data.total) throw new Error("ImageInfo.json contains no images");

  gallery = createGallery({
    data,
    flow1: els.flow1,
    flow2: els.flow2,
    onCurrentChange: (image) => {
      if (hud) hud.update(image);
      if (gallery) gallery.preloadAround(image.index, 2);
    },
  });

  hud = createDateHud({
    data,
    elements: {
      hud: els.dateHud,
      year: els.dateYear,
      month: els.dateMonth,
      counter: els.counter,
      prev: els.datePrev,
      next: els.dateNext,
    },
    gallery,
  });

  progress = createProgress({
    rail: els.rail,
    thumb: els.railThumb,
    tip: els.railTip,
    onSeek: (x) => {
      window.scrollTo(x, 0);
    },
  });

  lightbox = createLightbox({
    data,
    elements: {
      root: els.lightbox,
      img: els.lbImage,
      loader: els.lbLoader,
      error: els.lbError,
      date: els.lbDate,
      time: els.lbTime,
      resolution: els.lbResolution,
      ratio: els.lbRatio,
      name: els.lbName,
      download: els.lbDownload,
      open: els.lbOpen,
      share: els.lbShare,
      close: els.lbClose,
      prev: els.lbPrev,
      next: els.lbNext,
      stage: els.lbStage,
    },
    onOpen: (index) => {
      const image = data.images[index];
      hud.update(image, true);
      gallery.preloadAround(index, 2);
      document.body.classList.add("lightbox-open");
    },
    onClose: (lastIndex) => {
      document.body.classList.remove("lightbox-open");
      if (lastIndex !== gallery.currentIndex) {
        gallery.scrollToIndex(lastIndex, {
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          align: "left",
          offset: 0,
        });
      }
    },
    onNavigate: (index) => {
      hud.update(data.images[index], true);
      gallery.preloadAround(index, 2);
    },
  });

  els.lbErrorLink.addEventListener("click", (event) => {
    event.preventDefault();
    if (lightbox && lightbox.index >= 0) {
      window.open(data.images[lightbox.index].full, "_blank", "noopener");
    }
  });

  const initialIndex = gallery.currentIndex >= 0 ? gallery.currentIndex : data.total - 1;
  hud.update(data.images[initialIndex]);

  wireInteractions();

  document.body.classList.remove("is-booting");
  requestAnimationFrame(() => {
    document.body.classList.add("is-ready");
    requestAnimationFrame(() => {
      gallery.measure();
      progress.measure();
      hud.update(data.images[gallery.currentIndex >= 0 ? gallery.currentIndex : initialIndex]);
      handleDeepLink();
    });
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      gallery.measure();
      progress.measure();
    });
  }
}

function wireInteractions() {
  const onScroll = rafThrottle(() => {
    if (!gallery) return;
    progress.update();
    gallery.updateCurrent();
    const scrolled = window.scrollX > 18;
    document.body.classList.toggle("is-scrolled", scrolled);
    if (window.scrollX > 90) els.railTip.classList.add("is-dismissed");
    document.body.classList.toggle(
      "is-at-end",
      window.scrollX >= gallery.geometry.maxScroll - 2
    );
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const onResize = rafThrottle(() => {
    if (!gallery) return;
    gallery.measure();
    progress.measure();
    onScroll();
  });
  window.addEventListener("resize", onResize);

  // Vertical wheel gestures drive the horizontal filmstrip. When the About
  // panel is scrollable, let it scroll normally instead.
  window.addEventListener(
    "wheel",
    (event) => {
      if (lightbox && lightbox.isOpen()) return;
      if (event.ctrlKey) return;
      if (event.target instanceof Element) {
        const panel = event.target.closest(".about-panel");
        if (panel) {
          const scroller = panel.querySelector(".about-scroll");
          if (
            scroller &&
            scroller.scrollHeight > scroller.clientHeight + 2
          ) {
            return;
          }
        }
      }
      if (
        Math.abs(event.deltaX) > Math.abs(event.deltaY) &&
        !event.shiftKey
      ) {
        return;
      }
      event.preventDefault();
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
          ? window.innerWidth
          : 1;
      const delta = (event.deltaY + event.deltaX) * unit;
      window.scrollBy({ left: delta, top: 0, behavior: "auto" });
    },
    { passive: false }
  );

  window.addEventListener("keydown", (event) => {
    if (lightbox && lightbox.isOpen()) return;
    const target = event.target;
    if (
      target instanceof Element &&
      (target.closest("input, textarea, select") ||
        target.isContentEditable)
    ) {
      return;
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === "u"
    ) {
      if (admin) {
        event.preventDefault();
        admin.open();
      }
      return;
    }

    if (event.key === "Escape" && intro.isOpen) {
      event.preventDefault();
      intro.close();
      return;
    }
    if (intro.isOpen) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!gallery) return;

    const step = Math.max(260, window.innerWidth * 0.72);
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        window.scrollBy({ left: step, top: 0, behavior });
        break;
      case "ArrowLeft":
        event.preventDefault();
        window.scrollBy({ left: -step, top: 0, behavior });
        break;
      case "PageDown":
        event.preventDefault();
        window.scrollBy({ left: window.innerWidth, top: 0, behavior });
        break;
      case "PageUp":
        event.preventDefault();
        window.scrollBy({ left: -window.innerWidth, top: 0, behavior });
        break;
      case "Home":
        event.preventDefault();
        window.scrollTo({ left: 0, top: 0, behavior });
        break;
      case "End":
        event.preventDefault();
        window.scrollTo({
          left: gallery.geometry.maxScroll,
          top: 0,
          behavior,
        });
        break;
      default:
        break;
    }
  });

  els.gallery.addEventListener("click", (event) => {
    const photo = event.target.closest(".photo");
    if (!photo) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    lightbox.openAt(Number(photo.dataset.index));
  });

  els.backToStart.addEventListener("click", () => {
    window.scrollTo({
      left: 0,
      top: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  });

  const versionLink = $(".version-pill");
  if (versionLink) {
    const updateVersionLink = () => {
      const current =
        lightbox && lightbox.isOpen()
          ? lightbox.index
          : gallery
          ? gallery.currentIndex
          : -1;
      if (current >= 0) versionLink.href = `./old/?pos=${current}`;
    };
    versionLink.addEventListener("click", updateVersionLink);
    versionLink.addEventListener("pointerenter", updateVersionLink);
    // Keep the classic link on the same photograph while browsing. The rAF
    // runs after the scroll handler has refreshed gallery.currentIndex.
    window.addEventListener(
      "scroll",
      () => requestAnimationFrame(updateVersionLink),
      { passive: true }
    );
    updateVersionLink();
  }

  $("#brand").addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({
      left: 0,
      top: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  });

  const outro = $("#outro");
  if (outro) {
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              outro.classList.add("is-visible");
              observer.disconnect();
            }
          }
        },
        { threshold: 0.15 }
      );
      observer.observe(outro);
    } else {
      outro.classList.add("is-visible");
    }
  }

  window.addEventListener("load", () => {
    if (!gallery) return;
    gallery.measure();
    progress.measure();
    onScroll();
  });
}

function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("pos")) {
    const targetIndex = findImageIndexByTarget(data, params.get("pos"));
    if (targetIndex >= 0) {
      gallery.scrollToIndex(targetIndex, {
        behavior: "auto",
        align: "left",
        offset: 0,
      });
      hud.update(data.images[targetIndex], true);
      gallery.updateCurrent();
      return;
    }
  }
  const raw = readTargetFromUrl();
  if (raw == null) return;
  const index = findImageIndexByTarget(data, raw);
  if (index < 0) {
    toast(t("没有找到对应的作品", "Photograph not found"));
    return;
  }
  gallery.scrollToIndex(index, { behavior: "auto", align: "left", offset: 0 });
  hud.update(data.images[index], true);
  window.setTimeout(() => {
    lightbox.openAt(index, { fromHash: true });
  }, 300);
}
