/* Three-language switch: zh / en / both. The choice is stored in localStorage
 * so it survives a refresh, and every static label uses [data-zh]/[data-en]
 * markup so the whole page follows the mode. */

const STORAGE_KEY = "lang";
const MODES = ["zh", "en", "both"];
const TITLES = {
  zh: "影記 · LAPERGRAPHY — 拉邦那的星际公民摄影",
  en: "影記 · LAPERGRAPHY — Star Citizen Photography by Lapernum",
  both:
    "影記 · LAPERGRAPHY — 拉邦那的星际公民摄影 / Star Citizen Photography",
};

export function normalizeLang(value) {
  return MODES.includes(value) ? value : "both";
}

export function getLang() {
  return normalizeLang(document.documentElement.dataset.lang);
}

export function t(zh, en) {
  const lang = getLang();
  if (lang === "zh") return zh;
  if (lang === "en") return en;
  return `${zh} / ${en}`;
}

export function initLanguage() {
  const root = document.documentElement;
  const button = document.getElementById("langBtn");
  const menu = document.getElementById("langMenu");
  if (!button || !menu) return null;

  let savedLang = "both";
  try {
    savedLang = localStorage.getItem(STORAGE_KEY) || "both";
  } catch (error) {
    /* storage can be unavailable */
  }
  let mode = normalizeLang(root.dataset.lang || savedLang);

  function closeMenu() {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");
    const active = menu.querySelector('[aria-selected="true"]');
    if (active) active.focus({ preventScroll: true });
  }

  function apply(next, persist) {
    mode = normalizeLang(next);
    root.dataset.lang = mode;
    root.lang = mode === "en" ? "en" : "zh-CN";
    document.title = TITLES[mode];
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch (error) {
        /* private mode / storage disabled */
      }
    }
    for (const option of menu.querySelectorAll("[data-lang-option]")) {
      const active = option.dataset.langOption === mode;
      option.setAttribute("aria-selected", String(active));
      option.classList.toggle("is-active", active);
    }
    document.dispatchEvent(
      new CustomEvent("langchange", { detail: { lang: mode } })
    );
  }

  apply(mode, false);

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  menu.addEventListener("click", (event) => {
    const option = event.target.closest("[data-lang-option]");
    if (!option) return;
    apply(option.dataset.langOption, true);
    closeMenu();
    button.focus({ preventScroll: true });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#langSwitch")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      closeMenu();
      button.focus({ preventScroll: true });
    }
  });

  return {
    apply,
    get lang() {
      return mode;
    },
  };
}
