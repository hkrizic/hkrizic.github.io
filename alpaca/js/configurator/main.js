// ALPACA configurator: boot, tabs, presets, import, and the draft kept in this browser.
import { h, $, toast } from "./dom.js";
import { store, loadPreset, clone, emit, subscribe, leaves, setPath } from "./state.js";
import { renderCards } from "./controls.js";
import { renderEverything } from "./everything.js";
import { renderDelays, renderPerturbers } from "./delays.js";
import { renderFitsTool } from "./fitstool.js";
import { renderPsf } from "./psf.js";
import { renderExport } from "./export.js";
import { renderPreview } from "./preview.js";
import { openWizard } from "./wizard.js";

const SECTION_ORDER = ["run", "data", "mass", "light", "stages", "psf", "likelihood", "sampling", "plotting", "blinding"];
const DRAFT_KEY = "alpaca-configurator-draft-v1";
const TABS = [
  ["start", "Start"],
  ["data", "Data"],
  ["model", "Model"],
  ["delays", "Delays & perturbers"],
  ["psf", "PSF"],
  ["everything", "Everything"],
  ["export", "Export"],
];

async function loadJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

function buildKnobs(defaults, docs) {
  const doc = new Map((docs?.knobs || []).map((k) => [k.key, k]));
  const list = defaults.knobs.map((k) => {
    const d = doc.get(k.key);
    return d ? { ...k, level: d.level, curated_html: d.curated_html, code_doc: d.code_doc, doc_type: d.type } : { ...k };
  });
  const rank = (s) => { const i = SECTION_ORDER.indexOf(s); return i < 0 ? 99 : i; };
  list.sort((a, b) => rank(a.section) - rank(b.section));   // stable within a section
  store.knobs = new Map(list.map((k) => [k.key, k]));
}

// ---------------------------------------------------------------- draft (this browser only)
let saveTimer = null;
function saveDraft() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ cfg: store.cfg, run: store.run, preset: store.preset, perturbers: store.perturbers, t: Date.now() })); } catch { /* private mode */ }
  }, 400);
}
function readDraft() {
  try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); return d && d.cfg ? d : null; } catch { return null; }
}

// ---------------------------------------------------------------- import
function isCurrentLayout(d) {
  return d && typeof d === "object" && ("stages" in d || "light" in d || "mass" in d);
}

async function importConfig(file) {
  try {
    const d = JSON.parse(await file.text());
    if (!isCurrentLayout(d)) throw new Error("this looks like a legacy (pre-0.5) config — load it once with ALPACA (it saves the current layout into the run folder) and import that copy");
    delete d.config_version;
    store.cfg = d;
    store.preset = "imported";
    const flat = leaves(d), ship = leaves(store.defaults.shipped);
    const missing = Object.keys(ship).filter((k) => !(k in flat));
    emit("import");
    showTab("model");
    toast(`Imported ${file.name}${missing.length ? ` — ${missing.length} key(s) not set (ALPACA uses its code defaults)` : ""}`);
    renderImportNote(missing);
  } catch (e) {
    toast("Could not import: " + e.message, "bad");
  }
}

function renderImportNote(missing) {
  const box = $("#cf-import-note");
  box.replaceChildren();
  if (!missing.length) return;
  const fill = h("button", { class: "btn small", type: "button" }, "Fill them from the shipped config");
  fill.addEventListener("click", () => {
    for (const k of missing) setPath(store.cfg, k, clone(k.split(".").reduce((o, p) => o?.[p], store.defaults.shipped)));
    emit("import");
    box.replaceChildren();
    toast(`${missing.length} key(s) filled from the shipped config`);
  });
  box.append(h("div", { class: "cf-msg info" }, h("span", { class: "cf-msg-k" }, "note"),
    h("span", {}, `The imported config leaves ${missing.length} key(s) of the shipped config unset; ALPACA then uses its code defaults (Everything → "changed only" lists them). `), fill));
}

// ---------------------------------------------------------------- tabs
const panes = {};
let fitsTool = null;
function showTab(id, push = true) {
  if (!panes[id]) id = "start";
  for (const [k, el] of Object.entries(panes)) el.hidden = k !== id;
  for (const b of document.querySelectorAll(".cf-tab")) b.classList.toggle("on", b.dataset.tab === id);
  if (push && location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  if (id === "data" && fitsTool) requestAnimationFrame(() => fitsTool.resize());
  document.body.dataset.tab = id;
}

let everything = null;
function jump(path) {
  if (!path) return;
  const row = document.querySelector(`#pane-model .cf-row[data-path="${CSS.escape(path)}"]`);
  if (row && !row.hidden) {
    showTab("model");
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.add("flash");
    setTimeout(() => row.classList.remove("flash"), 1400);
    return;
  }
  if (path.startsWith("likelihood.time_delays") || path === "likelihood.use_time_delays") return showTab("delays");
  if (path.startsWith("psf.")) { showTab("psf"); return; }
  showTab("everything");
  everything.focus(path);
}

function renderStart(root) {
  const tile = (k, t, d, onClick) => {
    const b = h("button", { class: "choice-tile cf-tile", type: "button" }, h("span", { class: "k" }, k), h("div", { class: "t" }, t), h("div", { class: "d" }, d), h("span", { class: "arrow" }, "→"));
    b.addEventListener("click", onClick);
    return b;
  };
  const imp = h("input", { type: "file", accept: ".json,application/json", hidden: true });
  imp.addEventListener("change", () => { if (imp.files[0]) importConfig(imp.files[0]); imp.value = ""; });
  root.append(
    h("div", { class: "cf-hero" },
      h("h1", {}, "Build an ALPACA config"),
      h("p", { class: "lead" }, "Pick a starting point, cut and mask your image, flip a few switches, take the files home. Every default is ALPACA's own; everything stays in your browser."),
      h("div", { class: "cf-btnrow cf-hero-btns" },
        h("button", { class: "btn primary", type: "button", onclick: () => openWizard({ onDone: () => showTab("data") }) }, "Guided setup — 5 questions"),
        h("span", { class: "muted small" }, "or start from a preset:"))),
    h("div", { class: "choices cf-choices" },
      tile("Four or two bright images", "Lensed quasar", "The config that ships with ALPACA (HE0435−1223): point images, time delays, the PSF-error term, blinding.", () => { loadPreset("quasar"); showTab("data"); toast("Lensed-quasar preset loaded"); }),
      tile("Arcs or a ring", "Galaxy–galaxy lens", "No point images or delays; a first guess of the Einstein radius; more random starts and a longer stage 3 that stops when it has converged.", () => { loadPreset("galaxy"); showTab("data"); toast("Galaxy–galaxy preset loaded"); }),
      tile("Continue a model", "Import config.json", "Load an existing config (ALPACA ≥ 0.5 layout) and change it here.", () => imp.click())),
    imp,
    h("div", { id: "cf-import-note" }),
    h("ol", { class: "cf-steps" },
      h("li", {}, h("b", {}, "Data"), h("span", { class: "muted" }, " — drop your FITS, click the lens, size the frame and cutout, draw the masks.")),
      h("li", {}, h("b", {}, "Model"), h("span", { class: "muted" }, " — switches and sliders, each with a one-line explanation; ", h("i", {}, "Everything"), " has all 350+ settings.")),
      h("li", {}, h("b", {}, "Delays, perturbers, PSF"), h("span", { class: "muted" }, " — the delay table, nearby galaxies, and the PSF from STARRED.")),
      h("li", {}, h("b", {}, "Export"), h("span", { class: "muted" }, " — config.json, the run_alpaca.py lines and the data as one zip."))));
}

async function boot() {
  const app = $("#cf-app");
  try {
    store.defaults = await loadJson("js/configurator/defaults.json");
  } catch (e) {
    app.replaceChildren(h("div", { class: "error" }, "Could not load js/configurator/defaults.json (", e.message, "). Serve the site over http, e.g. ", h("code", {}, "python tools/serve.py"), "."));
    return;
  }
  let docs = null;
  try { docs = await loadJson("doc/data/knobs.json"); } catch { /* descriptions are optional */ }
  buildKnobs(store.defaults, docs);
  $("#cf-version").textContent = `ALPACA ${store.defaults.alpaca_version} defaults`;

  const draft = readDraft();
  if (draft) {
    store.cfg = draft.cfg; store.preset = draft.preset || "imported";
    Object.assign(store.run, draft.run || {});
    store.perturbers = draft.perturbers || null;
  } else loadPreset("quasar");

  const tabs = h("nav", { class: "cf-tabs", "aria-label": "configurator sections" }, TABS.map(([id, label], i) =>
    h("button", { class: "cf-tab", type: "button", "data-tab": id, onclick: () => showTab(id) }, h("span", { class: "cf-tab-n" }, i ? String(i) : "·"), label)));
  const main = h("div", { class: "cf-main" });
  for (const [id] of TABS) { panes[id] = h("div", { class: "cf-pane", id: "pane-" + id, hidden: true }); main.append(panes[id]); }
  const side = h("aside", { class: "cf-side" });
  app.replaceChildren(tabs, h("div", { class: "cf-layout" }, main, side));

  renderStart(panes.start);
  fitsTool = renderFitsTool(panes.data);
  renderCards(panes.model);
  renderDelays(panes.delays);
  renderPerturbers(panes.delays);
  renderPsf(panes.psf);
  everything = renderEverything(panes.everything);
  renderExport(panes.export);
  renderPreview(side, { jump });

  const reset = $("#cf-reset");
  reset.addEventListener("click", () => {
    if (!confirm("Start over from the lensed-quasar preset? Your current settings in this browser are replaced.")) return;
    store.perturbers = null;
    Object.assign(store.run, { IMAGE_POSITIONS: null, REFERENCE_IMAGE: "A", LENS_POSITION: [0, 0] });
    loadPreset("quasar");
    showTab("start");
  });
  subscribe(saveDraft);
  showTab((location.hash || "#start").slice(1), false);
  if (draft) toast("Welcome back — your last settings are restored (Start over to reset).");
  window.addEventListener("hashchange", () => showTab(location.hash.slice(1), false));
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    if (/\.json$/i.test(f.name)) importConfig(f);
    else if (/\.(fits?|fts)$/i.test(f.name) && document.body.dataset.tab !== "data") { showTab("data"); toast("Drop it on the image area to open it."); }
  });
}

boot();
