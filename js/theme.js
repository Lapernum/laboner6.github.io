/* Light / dark theme. Shares the original localStorage key so the classic
 * version and the rebuilt site stay in the same mode when you switch. */

const STORAGE_KEY = "theme";

export function initTheme(button) {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  let theme = root.dataset.theme === "light" ? "light" : "dark";

  function apply(next, persist) {
    theme = next === "light" ? "light" : "dark";
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (meta) {
      meta.setAttribute(
        "content",
        theme === "light" ? "#eef3f7" : "#15181c"
      );
    }
    button.setAttribute(
      "aria-label",
      theme === "light" ? "切换到深色模式" : "切换到浅色模式"
    );
    button.setAttribute(
      "title",
      theme === "light" ? "深色模式 / Dark" : "浅色模式 / Light"
    );
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (error) {
        /* storage can be unavailable in private mode */
      }
    }
    document.dispatchEvent(
      new CustomEvent("themechange", { detail: { theme } })
    );
  }

  apply(theme, false);
  button.addEventListener("click", () => {
    apply(theme === "light" ? "dark" : "light", true);
    button.classList.remove("is-theme-ticking");
    void button.offsetWidth;
    button.classList.add("is-theme-ticking");
  });

  // Enable colour transitions only after the first paint.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.add("theme-ready"));
  });

  return {
    get theme() {
      return theme;
    },
  };
}
