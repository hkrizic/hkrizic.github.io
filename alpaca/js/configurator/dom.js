// Tiny DOM helpers shared by the configurator modules.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function download(name, data, type = "application/octet-stream") {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

let toastTimer = null;
export function toast(msg, kind = "") {
  let el = document.getElementById("cf-toast");
  if (!el) { el = h("div", { id: "cf-toast", role: "status", "aria-live": "polite" }); document.body.append(el); }
  el.className = "cf-toast show " + kind;
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

export function fmt(v, digits = 4) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(+v.toPrecision(digits));
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast("Copied to the clipboard"); }
  catch { toast("Copy failed — select the text and copy it by hand", "bad"); }
}

// Line icons for the section cards (stroke = currentColor).
const ICONS = {
  run: '<path d="M8 5l11 7-11 7z"/>',
  data: '<rect x="4" y="4" width="16" height="16"/><path d="M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16"/>',
  mass: '<ellipse cx="12" cy="12" rx="9" ry="6"/><ellipse cx="12" cy="12" rx="5" ry="3.2"/><circle cx="12" cy="12" r="0.9" fill="currentColor"/>',
  light: '<circle cx="12" cy="12" r="3.4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  stages: '<path d="M3 20h5v-5h5v-5h5V5h3"/>',
  psf: '<circle cx="12" cy="12" r="2.2"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/><circle cx="12" cy="12" r="6.5" stroke-dasharray="2 2.4"/>',
  likelihood: '<path d="M3 19c3 0 4-13 9-13s6 13 9 13"/><path d="M3 19h18"/>',
  sampling: '<circle cx="7" cy="14" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="13" cy="13" r="1"/><circle cx="15" cy="8" r="1"/><circle cx="17" cy="12" r="1"/><circle cx="11" cy="16" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="16" r="1"/>',
  blinding: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/><path d="M4 20L20 4"/>',
  plotting: '<path d="M4 20V4M4 20h16"/><path d="M7 16l4-5 3 3 5-7"/>',
  delays: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  perturbers: '<circle cx="12" cy="12" r="3"/><circle cx="4.5" cy="6" r="1.4"/><circle cx="19" cy="7.5" r="1.8"/><circle cx="18" cy="18.5" r="1.2"/>',
};
export function icon(name, size = 22) {
  const span = document.createElement("span");
  span.className = "cf-icon";
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="square">${ICONS[name] || ""}</svg>`;
  return span;
}
