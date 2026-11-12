/* Small shared UI helpers: toast, clipboard, URL state. */

import { $ } from "./config.js";

let toastTimer = 0;

export function toast(message, duration = 2400) {
  const node = $("#toast");
  if (!node) return;
  node.textContent = message;
  node.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    node.classList.remove("is-visible");
  }, duration);
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    /* fall through to the legacy path */
  }
  try {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand("copy");
    input.remove();
    return ok;
  } catch (error) {
    return false;
  }
}

export function shareUrlFor(index) {
  const url = new URL(window.location.href);
  url.searchParams.set("targetId", String(index));
  url.hash = "";
  return url.toString();
}

export function readTargetFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("targetId")) return params.get("targetId");
  if (params.has("photo")) return params.get("photo");
  return null;
}

export function setTargetInUrl(index) {
  const url = new URL(window.location.href);
  url.searchParams.delete("photo");
  if (index == null) url.searchParams.delete("targetId");
  else url.searchParams.set("targetId", String(index));
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
