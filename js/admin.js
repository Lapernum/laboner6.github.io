/* The upload studio runs from a local Node helper, never from the public site.
 * Only show the entry point when this page itself is served by that helper
 * (http://127.0.0.1:8787 or localhost). */

export async function initAdminLink(button) {
  const host = location.hostname;
  const isLocal =
    host === "127.0.0.1" || host === "localhost" || host === "[::1]";
  if (!isLocal) return null;

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 1200);
    const response = await fetch("/api/health", {
      cache: "no-store",
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!response.ok) return null;
    const health = await response.json();
    if (!health || health.ok !== true) return null;

    button.hidden = false;
    document.body.classList.add("has-admin");
    const open = () => {
      window.open("/admin/", "_blank", "noopener");
    };
    button.addEventListener("click", open);
    return { open, health };
  } catch (error) {
    return null;
  }
}
