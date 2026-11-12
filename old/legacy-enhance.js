/* Classic-version compatibility layer.
 *  - adds the one-click switch back to the rebuilt site
 *  - makes the top progress rail draggable (the 1.3 rail only reported position)
 * The original index.js / module.js are untouched apart from asset paths.
 */
(function () {
  "use strict";

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  var SWITCH_HTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6 3.4 7.3v9.4L12 21.4l8.6-4.7V7.3L12 2.6Zm0 1.9 6.9 3.8-6.9 3.8-6.9-3.8L12 4.5Zm-6.9 5.4 6.2 3.4v6.4l-6.2-3.4V9.9Zm7.8 9.8v-6.4l6.2-3.4v6.4l-6.2 3.4Z"/></svg>' +
    "<span>新版 v2.0</span>";

  function addSwitch() {
    if (document.querySelector(".legacy-switch")) return;
    var a = document.createElement("a");
    a.className = "legacy-switch";
    a.href = "../";
    a.title = "切换到重写的新版网站 / Open the rebuilt site";
    a.setAttribute("aria-label", "切换到新版网站");
    a.innerHTML = SWITCH_HTML;
    document.body.appendChild(a);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        a.classList.add("legacy-switch-visible");
      });
    });
  }

  function addDrag() {
    var bar = document.getElementById("scrollbar");
    var thumb = document.getElementById("scrollbarInside");
    if (!bar || !thumb || bar.dataset.legacyDrag === "1") return;
    bar.dataset.legacyDrag = "1";
    bar.setAttribute("title", "拖动以浏览 / Drag to explore");
    bar.setAttribute("role", "slider");
    bar.setAttribute("aria-label", "浏览进度");
    bar.setAttribute("aria-valuemin", "0");

    var dragging = false;
    var moved = false;
    var startX = 0;
    var startScroll = 0;
    var metric = null;

    function measure() {
      var rect = bar.getBoundingClientRect();
      var scrollMax = Math.max(
        0,
        document.documentElement.scrollWidth - window.innerWidth
      );
      metric = {
        left: rect.left,
        track: rect.width,
        thumb: thumb.offsetWidth,
        max: scrollMax,
      };
      bar.setAttribute("aria-valuemax", String(Math.round(scrollMax)));
    }

    function scrollToRatio(ratio) {
      if (!metric) return;
      ratio = Math.max(0, Math.min(1, ratio));
      window.scrollTo(ratio * metric.max, 0);
    }

    function ratioFromScroll() {
      if (!metric || metric.max <= 0) return 0;
      return Math.max(0, Math.min(1, window.scrollX / metric.max));
    }

    bar.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      measure();
      if (!metric || metric.max <= 0) return;
      e.preventDefault();
      dragging = true;
      moved = false;
      bar.classList.add("legacy-dragging");
      try {
        bar.setPointerCapture(e.pointerId);
      } catch (err) {}
      if (e.target === thumb) {
        startX = e.clientX;
        startScroll = window.scrollX;
      } else {
        var travel = Math.max(1, metric.track - metric.thumb);
        scrollToRatio((e.clientX - metric.left - metric.thumb / 2) / travel);
        startX = e.clientX;
        startScroll = window.scrollX;
      }
      document.body.style.userSelect = "none";
    });

    bar.addEventListener("pointermove", function (e) {
      if (!dragging || !metric) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 2) moved = true;
      var travel = Math.max(1, metric.track - metric.thumb);
      window.scrollTo(startScroll + (dx / travel) * metric.max, 0);
    });

    function finish(e) {
      if (!dragging) return;
      dragging = false;
      bar.classList.remove("legacy-dragging");
      document.body.style.userSelect = "";
      try {
        bar.releasePointerCapture(e.pointerId);
      } catch (err) {}
      if (e.type === "pointerup" && !moved && e.target !== thumb) {
        // A plain click on the rail has already jumped; nothing else to do.
      }
    }
    bar.addEventListener("pointerup", finish);
    bar.addEventListener("pointercancel", finish);

    bar.addEventListener("keydown", function (e) {
      measure();
      if (!metric) return;
      var step = Math.max(120, window.innerWidth * 0.18);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        window.scrollBy({ left: step, behavior: "smooth" });
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        window.scrollBy({ left: -step, behavior: "smooth" });
      } else if (e.key === "Home") {
        e.preventDefault();
        window.scrollTo({ left: 0, behavior: "smooth" });
      } else if (e.key === "End") {
        e.preventDefault();
        window.scrollTo({ left: metric.max, behavior: "smooth" });
      }
    });
    if (!bar.hasAttribute("tabindex")) bar.setAttribute("tabindex", "0");

    function sync() {
      if (metric && metric.max > 0) {
        bar.setAttribute("aria-valuenow", String(Math.round(window.scrollX)));
      }
      var ratio = metric ? ratioFromScroll() : 0;
      bar.setAttribute("aria-valuetext", Math.round(ratio * 100) + "%");
    }
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", measure);
    measure();
    sync();
  }

  function boot() {
    addSwitch();
    addDrag();
  }

  if (document.readyState === "complete") {
    setTimeout(boot, 100);
  } else {
    window.addEventListener("load", function () {
      setTimeout(boot, 100);
    });
  }
})();
