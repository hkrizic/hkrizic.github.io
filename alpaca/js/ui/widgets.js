// Small DOM helpers and form controls used by applets.
import { CMAP_NAMES, getLut } from "../core/colormaps.js";
import { STRETCHES } from "./imagecanvas.js";

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") e.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(e.dataset, v);
    else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return e;
}

export function section(title, ...children) {
  return el("div", { class: "ctl-section" }, el("div", { class: "ctl-title" }, title), ...children);
}

export function row(label, ...controls) {
  return el("label", { class: "ctl-row" }, el("span", { class: "ctl-label" }, label), el("span", { class: "ctl-ctl" }, ...controls));
}

export function select(options, value, onChange, attrs = {}) {
  const s = el("select", attrs);
  for (const o of options) {
    const opt = typeof o === "string" ? { value: o, label: o } : o;
    const e = el("option", { value: opt.value }, opt.label ?? opt.value);
    if (opt.value === value) e.selected = true;
    s.append(e);
  }
  s.addEventListener("change", () => onChange(s.value, s));
  return s;
}

export function number(value, onChange, { min = null, max = null, step = "any", width = 80, placeholder = "" } = {}) {
  const i = el("input", { type: "number", value: value ?? "", step, placeholder, style: { width: width + "px" } });
  if (min !== null) i.min = min;
  if (max !== null) i.max = max;
  i.addEventListener("change", () => onChange(i.value === "" ? null : +i.value, i));
  return i;
}

export function range(value, onChange, { min = 0, max = 1, step = 0.01, live = true } = {}) {
  const i = el("input", { type: "range", min, max, step, value });
  i.addEventListener(live ? "input" : "change", () => onChange(+i.value, i));
  return i;
}

export function checkbox(label, checked, onChange, attrs = {}) {
  const i = el("input", { type: "checkbox", ...attrs });
  i.checked = !!checked;
  i.addEventListener("change", () => onChange(i.checked, i));
  return el("label", { class: "ctl-check" }, i, el("span", {}, label));
}

export function button(label, onClick, { kind = "", title = "", small = false } = {}) {
  return el("button", { class: `btn ${kind} ${small ? "small" : ""}`.trim(), title, onClick }, label);
}

export function textInput(value, onChange, { placeholder = "", width = 160, type = "text" } = {}) {
  const i = el("input", { type, value: value ?? "", placeholder, style: { width: width + "px" } });
  i.addEventListener("change", () => onChange(i.value, i));
  return i;
}

// Toggle chips (multi-select)
export function chips(items, selected, onToggle) {
  const wrap = el("div", { class: "chips" });
  const set = new Set(selected);
  for (const it of items) {
    const item = typeof it === "string" ? { value: it, label: it } : it;
    const c = el("button", { class: "chip" + (set.has(item.value) ? " on" : ""), title: item.title || "" }, item.label);
    if (item.color) c.style.setProperty("--chip", item.color);
    c.addEventListener("click", () => { const now = c.classList.toggle("on"); onToggle(item.value, now); });
    wrap.append(c);
  }
  return wrap;
}

// Colormap selector with gradient previews.
export function cmapSelect(value, onChange) {
  const s = select(CMAP_NAMES.map((n) => ({ value: n, label: n })), value, onChange, { class: "cmap-select" });
  const preview = el("span", { class: "cmap-preview" });
  const paint = (name) => { const lut = getLut(name); const stops = []; for (let i = 0; i <= 10; i++) { const k = Math.round((i / 10) * 255) * 3; stops.push(`rgb(${lut[k]},${lut[k + 1]},${lut[k + 2]}) ${i * 10}%`); } preview.style.background = `linear-gradient(90deg, ${stops.join(",")})`; };
  paint(value);
  s.addEventListener("change", () => paint(s.value));
  return el("span", { class: "cmap-wrap" }, s, preview);
}

export function stretchSelect(value, onChange) { return select(STRETCHES, value, onChange); }

// Searchable multi-select of parameter names, grouped.
export function paramPicker(names, selected, onChange, { groupOf = null, max = null, title = "Parameters" } = {}) {
  const sel = new Set(selected);
  const wrap = el("div", { class: "param-picker" });
  const search = el("input", { type: "search", placeholder: "filter…", class: "param-search" });
  const list = el("div", { class: "param-list" });
  const count = el("span", { class: "muted" });
  const header = el("div", { class: "param-head" }, el("span", {}, title), count);
  const build = () => {
    list.innerHTML = "";
    const q = search.value.toLowerCase();
    const groups = new Map();
    for (const n of names) {
      if (q && !n.toLowerCase().includes(q)) continue;
      const g = groupOf ? groupOf(n) : "";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(n);
    }
    for (const [g, arr] of groups) {
      if (g) {
        const all = arr.every((n) => sel.has(n));
        const gh = el("div", { class: "param-group" }, el("span", {}, g), el("a", { href: "#", class: "muted small" }, all ? "none" : "all"));
        gh.querySelector("a").addEventListener("click", (e) => { e.preventDefault(); for (const n of arr) { if (all) sel.delete(n); else if (!max || sel.size < max) sel.add(n); } build(); onChange([...sel]); });
        list.append(gh);
      }
      for (const n of arr) {
        const cb = el("input", { type: "checkbox" });
        cb.checked = sel.has(n);
        cb.addEventListener("change", () => {
          if (cb.checked) { if (max && sel.size >= max) { cb.checked = false; return; } sel.add(n); } else sel.delete(n);
          count.textContent = `${sel.size} selected`;
          onChange([...sel]);
        });
        list.append(el("label", { class: "param-item" }, cb, el("span", {}, n)));
      }
    }
    count.textContent = `${sel.size} selected`;
  };
  search.addEventListener("input", build);
  build();
  wrap.append(header, search, list);
  wrap.setSelected = (arr) => { sel.clear(); arr.forEach((n) => sel.add(n)); build(); };
  return wrap;
}

export function table(headers, rows, { class: cls = "" } = {}) {
  const t = el("table", { class: "tbl " + cls });
  t.append(el("thead", {}, el("tr", {}, ...headers.map((h) => el("th", {}, h)))));
  const tb = el("tbody");
  for (const r of rows) tb.append(el("tr", {}, ...r.map((c) => (c instanceof Node ? el("td", {}, c) : el("td", {}, c ?? "–")))));
  t.append(tb);
  return t;
}

export function kv(pairs) {
  return el("dl", { class: "kv" }, ...pairs.flatMap(([k, v]) => [el("dt", {}, k), el("dd", {}, v instanceof Node ? v : String(v ?? "–"))]));
}

export function badge(text, kind = "") { return el("span", { class: "badge " + kind }, text); }

export function spinner(text = "loading…") { return el("div", { class: "spinner" }, el("span", { class: "dot" }), text); }

export function downloadPNG(dataUrl, name) {
  const a = el("a", { href: dataUrl, download: name });
  document.body.append(a); a.click(); a.remove();
}

export function fmtSec(s) {
  if (s == null) return "–";
  if (s < 90) return s.toFixed(1) + " s";
  if (s < 5400) return (s / 60).toFixed(1) + " min";
  return (s / 3600).toFixed(2) + " h";
}
