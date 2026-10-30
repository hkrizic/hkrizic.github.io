// The "Everything" tab: every key ALPACA reads, searchable, with the shipped value, the
// code default and (when the documentation is present) what it does.
import { h, fmt } from "./dom.js";
import { store, get, set, shipped, codeDefault, subscribe, delPath, emit } from "./state.js";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SECTION_NAMES = { run: "Run", data: "Data", mass: "Mass", light: "Light", stages: "Stages", psf: "PSF", likelihood: "Likelihood", sampling: "Sampling", plotting: "Plots", blinding: "Blinding" };

// Editor kind from the dump's JSON type, refined by the documentation's type string.
function kindOf(k) {
  if (k.choices) return "choice";
  let t = k.type;
  const doc = (k.doc_type || "").toLowerCase();
  if (t === "any" && doc) {
    const parts = doc.split("|").map((s) => s.trim()).filter((s) => s !== "none" && s !== "null");
    if (parts.length === 1) t = { float: "float", int: "int", bool: "bool", str: "str" }[parts[0]] || t;
  }
  if (t === "bool") return "bool";
  if (t === "int" || t === "float") return "num";
  if (t === "str") return "str";
  return "json";
}

function plainText(html) {
  const d = document.createElement("div");
  d.innerHTML = html || "";
  return d.textContent || "";
}

function docHtml(k) {
  if (k.curated_html) {
    // cross-references point into the documentation page
    return k.curated_html.replace(/href="#k-/g, 'href="doc/documentation.html#k-');
  }
  if (k.code_doc) return "<p>" + k.code_doc.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])).replace(/``([^`]+)``/g, "<code>$1</code>") + "</p>";
  return "";
}

function editor(k) {
  const kind = kindOf(k);
  const val = () => get(k.key);
  const eff = () => (val() === undefined ? codeDefault(k.key) : val());
  if (kind === "bool") {
    const b = h("button", { class: "cf-switch small", type: "button", role: "switch", onclick: () => set(k.key, !eff(), k.key) }, h("span"));
    return { el: b, refresh: () => { b.classList.toggle("on", !!eff()); b.setAttribute("aria-checked", eff() ? "true" : "false"); } };
  }
  if (kind === "choice") {
    const opts = [...k.choices];
    const s = h("select", { class: "btn small cf-select" },
      (k.nullable ? [h("option", { value: "null" }, "null")] : []), opts.map((o) => h("option", { value: JSON.stringify(o) }, String(o))));
    s.addEventListener("change", () => set(k.key, JSON.parse(s.value), k.key));
    return { el: s, refresh: () => { s.value = JSON.stringify(eff() ?? null); } };
  }
  if (kind === "num" || kind === "str") {
    const inp = h("input", { type: kind === "num" ? "number" : "text", class: kind === "num" ? "cf-num" : "cf-text", step: "any", spellcheck: "false" });
    const nb = k.nullable ? h("button", { class: "chip", type: "button", title: "set to null" }, "null") : null;
    inp.addEventListener("change", () => {
      if (inp.value === "" && k.nullable) set(k.key, null, k.key);
      else set(k.key, kind === "num" ? (k.type === "int" ? Math.round(+inp.value) : +inp.value) : inp.value, k.key);
    });
    if (nb) nb.addEventListener("click", () => set(k.key, eff() === null ? (k.shipped ?? k.default ?? (kind === "num" ? 0 : "")) : null, k.key));
    return {
      el: h("div", { class: "cf-inline" }, inp, nb),
      refresh: () => {
        const v = eff();
        if (nb) nb.classList.toggle("on", v === null);
        if (document.activeElement !== inp) inp.value = v === null || v === undefined ? "" : v;
        inp.placeholder = v === null ? "null" : "";
      },
    };
  }
  const inp = h("input", { type: "text", class: "cf-text cf-json", spellcheck: "false" });
  inp.addEventListener("change", () => {
    try { set(k.key, JSON.parse(inp.value), k.key); inp.classList.remove("bad-input"); }
    catch { inp.classList.add("bad-input"); }
  });
  return { el: inp, refresh: () => { if (document.activeElement !== inp) { inp.value = JSON.stringify(eff() ?? null); inp.classList.remove("bad-input"); } } };
}

export function renderEverything(root) {
  const q = h("input", { type: "search", class: "cf-search", placeholder: "Search 350+ settings: a key, a word (e.g. mask, delay, smooth)…", "aria-label": "search settings" });
  const filters = { changed: false, level: "all" };
  const fChanged = h("button", { class: "chip", type: "button" }, "changed only");
  const levelChips = ["all", "essential", "common", "advanced"].map((l) => {
    const b = h("button", { class: "chip" + (l === "all" ? " on" : ""), type: "button" }, l);
    b.addEventListener("click", () => { filters.level = l; levelChips.forEach((x) => x.classList.toggle("on", x === b)); apply(); });
    return b;
  });
  fChanged.addEventListener("click", () => { filters.changed = !filters.changed; fChanged.classList.toggle("on", filters.changed); apply(); });
  const count = h("span", { class: "muted small" });
  const hasLevels = [...store.knobs.values()].some((k) => k.level);
  root.append(h("div", { class: "cf-ev-tools" }, q, h("div", { class: "chips" }, fChanged, hasLevels ? levelChips : null), count));

  const list = h("div", { class: "cf-ev-list" });
  root.append(list);
  const rows = [];
  let section = null;
  for (const k of store.knobs.values()) {
    if (k.section !== section) {
      section = k.section;
      list.append(h("h3", { class: "cf-ev-section", "data-section": section }, SECTION_NAMES[section] || section));
    }
    const { el, refresh } = editor(k);
    const dot = h("span", { class: "cf-dot" });
    const del = h("button", { class: "icon-btn", type: "button", title: "remove the key from the config: ALPACA then uses the code default" }, "×");
    del.addEventListener("click", () => { delPath(store.cfg, k.key); emit(k.key); });
    const docs = docHtml(k);
    const more = docs ? h("button", { class: "icon-btn cf-more", type: "button", title: "what does it do?" }, "?") : null;
    const doc = docs ? h("div", { class: "cf-ev-doc", html: docs, hidden: true }) : null;
    if (more) more.addEventListener("click", () => { doc.hidden = !doc.hidden; more.classList.toggle("on", !doc.hidden); });
    const meta = h("div", { class: "cf-ev-meta muted small" });
    const row = h("div", { class: "cf-ev-row" },
      h("div", { class: "cf-ev-key" }, dot, h("code", {}, k.key), k.level ? h("span", { class: "badge ok" }, k.level) : null, more),
      h("div", { class: "cf-ev-edit" }, el, del),
      meta, doc);
    const text = (k.key + " " + plainText(docs)).toLowerCase();
    rows.push({ k, row, text, refresh: () => {
      refresh();
      const v = get(k.key);
      const changed = !same(v, shipped(k.key));
      row.classList.toggle("changed", changed);
      row.classList.toggle("unset", v === undefined);
      del.hidden = v === undefined;
      meta.textContent = (v === undefined ? "not in the config → code default " + fmt(k.default) + " · " : "") +
        (k.in_shipped ? "shipped " + fmt(k.shipped) : "not in the shipped config") + (k.in_dataclass && !same(k.default, k.shipped) ? " · code default " + fmt(k.default) : "");
    } });
    list.append(row);
  }

  function apply() {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0;
    const shownSections = new Set();
    for (const r of rows) {
      const show = words.every((w) => r.text.includes(w)) &&
        (!filters.changed || r.row.classList.contains("changed")) &&
        (filters.level === "all" || r.k.level === filters.level);
      r.row.hidden = !show;
      if (show) { n++; shownSections.add(r.k.section); }
    }
    for (const s of list.querySelectorAll(".cf-ev-section")) s.hidden = !shownSections.has(s.dataset.section);
    count.textContent = `${n} of ${rows.length}`;
  }
  q.addEventListener("input", apply);
  const refreshAll = () => { rows.forEach((r) => r.refresh()); if (filters.changed) apply(); };
  subscribe(refreshAll);
  refreshAll();
  apply();
  return { focus: (text) => { q.value = text; apply(); q.focus(); } };
}
