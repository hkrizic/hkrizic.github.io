// ALPACA analysis workbench: app shell, run loading, workspace of applet panels.
import { WorkerClient } from "./core/workerclient.js";
import { FileIndex, findRunRoots } from "./core/files.js";
import { Run } from "./core/run.js";
import { APPLETS, APPLET_MAP, PRESETS } from "./applets/registry.js";
import { createPanel } from "./ui/panel.js";
import { el, button, badge, select } from "./ui/widgets.js";
import { unblindUI } from "./applets/common.js";
import { openUnblindScreen } from "./ui/unblindscreen.js";
import { emit, on } from "./core/bus.js";
import { keyStore } from "./core/prefs.js";

const LS_LAYOUT = "alpaca-analysis.layout.v1";

class App {
  constructor() {
    this.worker = new WorkerClient();
    this.runs = [];
    this.panels = [];
    this.seq = 0;
    this.grid = document.getElementById("workspace");
    this.sidebar = document.getElementById("sidebar");
    this.status = document.getElementById("status");
    this.ctx = { app: this };
    this.bindHeader();
    this.bindDrop();
    this.renderSidebar();
    on("key:loaded", async ({ key }) => {
      let n = 0;
      for (const r of this.runs) if (r.needsKey && r.features.sealed) { try { await r.unblind(key); r.keySource = "campaign key"; n++; } catch (e) { /* different campaign */ } }
      this.renderSidebar();
      this.refreshAll();
      if (n) this.toast(`Campaign key applied to ${n} other run(s).`);
    });
    const url = new URLSearchParams(location.search).get("run");
    if (url) this.loadUrl(url, "A");
    else this.showWelcome();
  }

  // ------------------------------------------------------------ UI plumbing
  toast(msg, kind = "") {
    const t = el("div", { class: "toast " + kind }, msg);
    document.getElementById("toasts").append(t);
    setTimeout(() => t.remove(), 6000);
  }

  setStatus(msg) { this.status.textContent = msg || ""; }

  bindHeader() {
    document.getElementById("btn-open").addEventListener("click", () => this.openFolder("A"));
    document.getElementById("btn-add-b").addEventListener("click", () => this.openFolder("B"));
    document.getElementById("btn-url").addEventListener("click", () => {
      const u = prompt("URL of a run folder served over HTTP (directory listing or manifest.json):", this.runs[0]?.index.baseUrl || "");
      if (u) this.loadUrl(u, this.runs.length ? "B" : "A");
    });
    document.getElementById("btn-reset").addEventListener("click", () => { this.clearPanels(); this.applyPreset("default"); });
    const input = document.getElementById("dir-input");
    input.addEventListener("change", () => { if (input.files.length) this.loadIndex(FileIndex.fromFileList(input.files), input.dataset.label || "A"); input.value = ""; });
    const presetSel = document.getElementById("preset-select");
    for (const p of PRESETS) presetSel.append(el("option", { value: p.id }, p.title));
    presetSel.value = "";
    presetSel.addEventListener("change", () => { if (presetSel.value) { this.applyPreset(presetSel.value, { append: true }); presetSel.value = ""; } });
  }

  bindDrop() {
    const overlay = document.getElementById("drop-overlay");
    let hideTimer = null;
    const isFileDrag = (e) => e.dataTransfer && [...(e.dataTransfer.types || [])].includes("Files");
    const show = () => { overlay.classList.add("on"); clearTimeout(hideTimer); hideTimer = setTimeout(() => overlay.classList.remove("on"), 300); };
    const hide = () => { clearTimeout(hideTimer); overlay.classList.remove("on"); };
    // Only external file drags show the overlay; it hides by itself when dragover events stop
    // (panel reordering uses its own drag type and never triggers it).
    document.addEventListener("dragenter", (e) => { if (isFileDrag(e)) { e.preventDefault(); show(); } });
    document.addEventListener("dragover", (e) => { if (isFileDrag(e)) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; show(); } });
    document.addEventListener("dragleave", (e) => { if (e.relatedTarget === null) hide(); });
    document.addEventListener("dragend", hide);
    window.addEventListener("drop", (e) => { if (!isFileDrag(e)) return; e.preventDefault(); hide(); this.handleFileDrop(e); }, true);
    window.addEventListener("blur", hide);
  }

  async handleFileDrop(e) {
    const items = [...e.dataTransfer.items].filter((it) => it.kind === "file");
    if (!items.length) return;
    this.setStatus("indexing dropped folder…");
    try {
      const idx = await FileIndex.fromDataTransferItems(items);
      await this.loadIndex(idx, this.runs.length && !e.shiftKey ? "B" : "A");
    } catch (err) { this.toast("Could not read the dropped folder: " + err.message, "error"); this.setStatus(""); }
  }

  async openFolder(label) {
    if (window.showDirectoryPicker) {
      try {
        const h = await window.showDirectoryPicker({ mode: "read" }); // write permission is requested only when unblinding into the folder
        this.setStatus("indexing folder…");
        const idx = await FileIndex.fromDirectoryHandle(h);
        await this.loadIndex(idx, label);
      } catch (e) { if (e.name !== "AbortError") this.toast(e.message, "error"); }
    } else {
      const input = document.getElementById("dir-input");
      input.dataset.label = label;
      input.click();
    }
  }

  async loadUrl(url, label) {
    this.setStatus("fetching directory listing…");
    try {
      const idx = await FileIndex.fromUrl(url);
      await this.loadIndex(idx, label);
    } catch (e) { this.toast("Could not load run from URL: " + e.message, "error"); this.setStatus(""); }
  }

  async loadIndex(index, label) {
    const roots = findRunRoots(index);
    if (!roots.length) { this.toast("No ALPACA run found in that folder (looked for config/config.json, 03_multistart/…, 05_posterior/…).", "error"); this.setStatus(""); return; }
    let root = roots[0];
    if (roots.length > 1) {
      root = await this.chooseRoot(roots);
      if (root === null) { this.setStatus(""); return; }
    }
    this.setStatus(`reading run ${root || "/"} …`);
    const run = new Run(index, root, this.worker, label);
    try { await run.init(); }
    catch (e) { console.error(e); this.toast("Failed to read run: " + e.message, "error"); this.setStatus(""); return; }
    const existing = this.runs.findIndex((r) => r.label === label);
    if (existing >= 0) { this.runs[existing].index.dispose(); this.runs[existing] = run; } else this.runs.push(run);
    this.runs.sort((a, b) => a.label.localeCompare(b.label));
    this.setStatus("");
    this.toast(`Loaded run ${label}: ${run.name} (${index.paths.length} files)`);
    this.renderSidebar();
    document.getElementById("welcome")?.remove();
    if (this.panels.length === 0) {
      const saved = this.loadLayout();
      if (saved && saved.length) this.restoreLayout(saved); else this.applyPreset("default");
    } else this.refreshAll();
  }

  chooseRoot(roots) {
    return new Promise((resolve) => {
      const modal = el("div", { class: "modal" }, el("div", { class: "modal-box" }, el("h3", {}, "Several runs found — pick one"),
        ...roots.map((r) => button(r || "(folder root)", () => { modal.remove(); resolve(r); }, { kind: "block" })),
        button("Cancel", () => { modal.remove(); resolve(null); }, { small: true })));
      document.body.append(modal);
    });
  }

  removeRun(label) {
    const i = this.runs.findIndex((r) => r.label === label);
    if (i < 0) return;
    this.runs[i].index.dispose();
    this.runs.splice(i, 1);
    if (!this.runs.length) { this.clearPanels(); this.showWelcome(); }
    else { if (this.runs.length === 1) this.runs[0].label = "A"; this.refreshAll(); }
    this.renderSidebar();
  }

  showWelcome() {
    if (document.getElementById("welcome")) return;
    const w = el("div", { id: "welcome", class: "welcome" },
      el("img", { src: "assets/logo.png", alt: "ALPACA" }),
      el("h2", {}, "Drop a run folder here"),
      el("p", {}, "Everything runs in your browser — nothing is uploaded. Drop the run folder (the one containing ", el("code", {}, "config/"), ", ", el("code", {}, "03_multistart/"), ", ", el("code", {}, "05_posterior/"), "…) or the whole experiment folder including ", el("code", {}, "data/"), " so the perturber catalog is found."),
      el("div", { class: "ctl-row" }, button("Open run folder…", () => this.openFolder("A"), { kind: "primary" }), button("Load from URL…", () => document.getElementById("btn-url").click())),
      el("p", { class: "muted small" }, "Chrome / Edge: folder picker and drag & drop. Firefox / Safari: drag & drop or the folder picker fallback. Blinded runs stay blinded on screen: the blinding key (file in the run folder, or typed in) is used only inside the forward model and to derive posterior widths."),
    );
    this.grid.append(w);
  }

  // ------------------------------------------------------------ sidebar
  renderSidebar() {
    const sb = this.sidebar;
    sb.innerHTML = "";
    const runsBox = el("div", { class: "sb-section" }, el("h4", {}, "Runs"));
    if (!this.runs.length) runsBox.append(el("div", { class: "muted small" }, "No run loaded."));
    for (const r of this.runs) {
      const card = el("div", { class: "run-card" },
        el("div", { class: "run-title" }, badge(r.label, "label"), el("span", { class: "run-name", title: r.name }, r.name), el("span", { class: "spacer" }), el("button", { class: "icon-btn danger", title: "Remove run", onClick: () => this.removeRun(r.label) }, "✕")),
        el("div", { class: "muted small" }, `${r.sampler} · ${r.sourceType} · ${r.stages.length} GD stage${r.stages.length === 1 ? "" : "s"}` + (r.posteriorSummary ? ` · ${r.posteriorSummary.nSamples} samples` : "")),
        el("div", { class: "run-badges" },
          r.features.posterior ? badge("posterior", "ok") : badge("no posterior", "warn"),
          r.unblinded ? badge("UNBLINDED · " + (r.unblindWritten ? "written to folder" : "this session"), "warn") : r.features.blinded ? badge(r.offsets ? "blinded · key loaded" : "blinded · no key", "warn") : null,
          r.catalog ? badge(r.catalogRestored ? "catalog · remembered" : "catalog", "ok") : badge("no perturber catalog", "warn"),
        ),
        r.features.blinded && !r.offsets ? button("Load blinding key…", () => this.unblindModal(r), { small: true, title: "Needed to evaluate the forward model; displayed values stay blinded" }) : null,
        r.features.blinded && !r.unblinded ? button("Unblind run…", () => openUnblindScreen(this, r), { kind: "primary", small: true, title: "Lift the blinding: reveal H0 and show absolute values" }) : null,
        !r.catalog ? button("Attach perturbers.json…", () => this.attachCatalog(r), { small: true, title: "Perturber catalog with redshifts (data/perturbers.json)" }) : null,
      );
      runsBox.append(card);
    }
    if (this.runs.length === 1) runsBox.append(el("div", { class: "muted small" }, "Drop a second folder (or use “Add run B”) to compare runs."));
    if (keyStore.get()) runsBox.append(el("div", { class: "ctl-row" }, el("span", { class: "muted small" }, keyStore.rememberedOnDevice() ? "Campaign key remembered on this device." : "Campaign key held for this session."), button("forget key", () => { keyStore.forget(); this.toast("Campaign key forgotten (already-loaded runs keep it until reload)."); this.renderSidebar(); }, { small: true })));
    sb.append(runsBox);
    const pal = el("div", { class: "sb-section" }, el("h4", {}, "Applets"));
    const run = this.runs[0];
    for (const a of APPLETS) {
      const avail = run ? a.available(run) : false;
      const item = el("div", { class: "palette-item" + (avail ? "" : " disabled"), title: a.description, onClick: () => { if (avail) this.addPanel(a.id, {}, a.defaultSize, { focus: true }); } },
        el("span", { class: "palette-icon" }, a.icon), el("span", {}, el("div", { class: "palette-title" }, a.title), el("div", { class: "muted small" }, a.description)));
      pal.append(item);
    }
    sb.append(pal);
  }

  afterUnblind(run) {
    this.toast(`Run ${run.label} is unblinded ${run.unblindWritten ? "and the files were written" : "for this session"}. All panels now show absolute values.`);
    this.renderSidebar();
    this.refreshAll();
  }

  attachCatalog(run) {
    const input = el("input", { type: "file", accept: ".json,application/json", hidden: true });
    input.addEventListener("change", async () => {
      const f = input.files[0];
      if (!f) return;
      try { run.setCatalog(JSON.parse(await f.text()), f.name); this.toast(`Catalog attached to run ${run.label}: ${f.name}`); this.renderSidebar(); this.refreshAll(); }
      catch (e) { this.toast("Not a valid catalog JSON: " + e.message, "error"); }
      input.remove();
    });
    document.body.append(input);
    input.click();
  }

  unblindModal(run) {
    const modal = el("div", { class: "modal" });
    const box = el("div", { class: "modal-box" }, el("h3", {}, `Blinding key for run ${run.label}`), unblindUI(run, () => { setTimeout(() => modal.remove(), 1500); this.renderSidebar(); this.refreshAll(); }), button("Close", () => modal.remove(), { small: true }));
    modal.append(box);
    document.body.append(modal);
  }

  // ------------------------------------------------------------ panels
  addPanel(appletId, state = {}, size = null, { focus = false, before = null } = {}) {
    const applet = APPLET_MAP[appletId];
    if (!applet) return null;
    const id = "p" + (++this.seq);
    const entry = { id, appletId, state: { ...state } };
    const panel = createPanel({
      title: applet.title, icon: applet.icon, size: size || applet.defaultSize || "m",
      onClose: () => this.removePanel(id), onDuplicate: () => this.duplicatePanel(id), onSizeChange: () => this.saveLayout(),
    });
    entry.panel = panel;
    panel.el.dataset.panelId = id;
    this.setupDrag(panel, id);
    try { entry.instance = applet.create(this.ctx, entry.state, panel); }
    catch (e) { console.error(e); panel.body.append(el("div", { class: "error" }, String(e.message || e))); entry.instance = { destroy() {}, state: () => entry.state }; }
    if (before) this.grid.insertBefore(panel.el, before); else this.grid.append(panel.el);
    this.panels.push(entry);
    if (focus) panel.el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    this.saveLayout();
    return entry;
  }

  removePanel(id) {
    const i = this.panels.findIndex((p) => p.id === id);
    if (i < 0) return;
    const p = this.panels[i];
    try { p.instance.destroy(); } catch (e) { console.warn(e); }
    p.panel.el.remove();
    this.panels.splice(i, 1);
    this.saveLayout();
  }

  duplicatePanel(id) {
    const p = this.panels.find((x) => x.id === id);
    if (!p) return;
    const st = JSON.parse(JSON.stringify(p.instance.state ? p.instance.state() : p.state));
    this.addPanel(p.appletId, st, p.panel.size, { before: p.panel.el.nextSibling });
  }

  clearPanels() { for (const p of [...this.panels]) this.removePanel(p.id); }

  refreshAll() { for (const p of this.panels) { try { p.instance.refresh && p.instance.refresh(); } catch (e) { console.warn(e); } } }

  applyPreset(id, { append = false } = {}) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    if (!append) this.clearPanels();
    const run = this.runs[0];
    for (const [appletId, state, size] of preset.panels) {
      const a = APPLET_MAP[appletId];
      if (run && a && !a.available(run)) continue;
      this.addPanel(appletId, state, size);
    }
  }

  saveLayout() {
    try {
      const layout = this.panels.map((p) => ({ appletId: p.appletId, state: p.instance.state ? p.instance.state() : p.state, size: p.panel.size }));
      localStorage.setItem(LS_LAYOUT, JSON.stringify(layout));
    } catch (e) { /* ignore quota / private mode */ }
  }

  loadLayout() { try { return JSON.parse(localStorage.getItem(LS_LAYOUT) || "null"); } catch (e) { return null; } }

  restoreLayout(layout) {
    const run = this.runs[0];
    for (const it of layout) {
      const a = APPLET_MAP[it.appletId];
      if (!a || (run && !a.available(run))) continue;
      this.addPanel(it.appletId, it.state || {}, it.size);
    }
    if (!this.panels.length) this.applyPreset("default");
  }

  setupDrag(panel, id) {
    const handle = panel.dragHandle;
    handle.draggable = true;
    handle.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/panel", id); e.dataTransfer.effectAllowed = "move"; panel.el.classList.add("dragging"); });
    handle.addEventListener("dragend", () => panel.el.classList.remove("dragging"));
    panel.el.addEventListener("dragover", (e) => { if (e.dataTransfer.types.includes("text/panel")) { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move"; panel.el.classList.add("drop-target"); } });
    panel.el.addEventListener("dragleave", () => panel.el.classList.remove("drop-target"));
    panel.el.addEventListener("drop", (e) => {
      if (e.dataTransfer.types.includes("Files")) return; // handled by the window listener
      const src = e.dataTransfer.getData("text/panel");
      if (!src) return;
      e.preventDefault(); e.stopPropagation();
      panel.el.classList.remove("drop-target");
      const srcEl = this.grid.querySelector(`[data-panel-id="${src}"]`);
      if (!srcEl || srcEl === panel.el) return;
      const rect = panel.el.getBoundingClientRect();
      const after = e.clientX > rect.left + rect.width / 2;
      this.grid.insertBefore(srcEl, after ? panel.el.nextSibling : panel.el);
      const order = [...this.grid.querySelectorAll("[data-panel-id]")].map((x) => x.dataset.panelId);
      this.panels.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      this.saveLayout();
      emit("layout:changed");
    });
  }
}

window.app = new App();
