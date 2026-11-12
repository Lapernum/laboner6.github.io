/* Easter egg: each click on the intro mark spins the rings faster. At the
 * cap, clicks do nothing; three seconds later the rings ease back to their
 * base speed. Clicks during the slow-down add speed again. */

const BASE_DURATIONS = [8, 16, 32, 64];
const MAX_RATE = 24;
const HOLD_MS = 3000;
const DECEL_MS = 3000;

export function initLogoEgg(element) {
  if (!element) return null;
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return null;
  }

  let rate = 1;
  let decaying = false;
  let decelFrom = 1;
  let decelStart = 0;
  let decelFrame = 0;
  let holdTimer = 0;
  let pokeTimer = 0;

  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", "点击加速旋转 Logo");

  function apply(value) {
    element.dataset.spinRate = value.toFixed(2);
    for (let i = 0; i < BASE_DURATIONS.length; i += 1) {
      element.style.setProperty(
        `--arc${i}-duration`,
        `${(BASE_DURATIONS[i] / value).toFixed(4)}s`
      );
    }
  }

  function pulse() {
    element.classList.remove("is-poked");
    void element.offsetWidth;
    element.classList.add("is-poked");
    window.clearTimeout(pokeTimer);
    pokeTimer = window.setTimeout(() => {
      element.classList.remove("is-poked");
    }, 520);
  }

  function cancelDecel() {
    if (decelFrame) cancelAnimationFrame(decelFrame);
    decelFrame = 0;
    decaying = false;
  }

  function scheduleSlowDown() {
    window.clearTimeout(holdTimer);
    holdTimer = window.setTimeout(() => {
      holdTimer = 0;
      startDecel();
    }, HOLD_MS);
  }

  function startDecel() {
    if (rate <= 1.01) return;
    decaying = true;
    decelFrom = rate;
    decelStart = performance.now();

    const tick = (now) => {
      if (!decaying) return;
      const t = Math.min(1, (now - decelStart) / DECEL_MS);
      const eased =
        t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const value = 1 + (decelFrom - 1) * (1 - eased);
      rate = value;
      apply(value);
      if (t < 1) {
        decelFrame = requestAnimationFrame(tick);
      } else {
        rate = 1;
        decaying = false;
        decelFrame = 0;
        apply(1);
      }
    };
    decelFrame = requestAnimationFrame(tick);
  }

  function poke() {
    if (rate >= MAX_RATE - 0.05) return;

    pulse();

    if (decaying) {
      rate = Math.min(MAX_RATE, Math.max(rate * 1.5, rate + 1.2));
      apply(rate);
      // Restart the slow-down from the newly boosted speed.
      decelFrom = rate;
      decelStart = performance.now();
      if (rate >= MAX_RATE - 0.05) {
        cancelDecel();
        rate = MAX_RATE;
        apply(rate);
        scheduleSlowDown();
      }
      return;
    }

    rate = Math.min(MAX_RATE, rate * 2);
    apply(rate);
    if (rate >= MAX_RATE - 0.05) scheduleSlowDown();
  }

  element.addEventListener("click", (event) => {
    event.preventDefault();
    poke();
  });
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      poke();
    }
  });

  return {
    get rate() {
      return rate;
    },
    poke,
  };
}
