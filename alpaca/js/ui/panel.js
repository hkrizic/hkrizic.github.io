// Panel chrome for applets in the workspace grid, with free resizing:
// width snaps to the 12-column grid (drag the right edge), height is free (drag the bottom edge),
// the corner does both. Double-click the bottom edge to return to automatic height.
import { el } from "./widgets.js";

export const SIZES = ["s", "m", "l", "xl"];
const SPAN_OF = { s: 4, m: 6, l: 8, xl: 12 };
const COLS = 12;

function normalizeSize(size) {
  if (!size) return { span: 6, height: null };
  if (typeof size === "string") return { span: SPAN_OF[size] || 6, height: null };
  return { span: Math.max(2, Math.min(COLS, Math.round(size.span || 6))), height: size.height ? Math.max(160, Math.round(size.height)) : null };
}

export function createPanel({ title, icon = "", size = "m", onClose, onDuplicate, onSizeChange }) {
  const panel = el("section", { class: "panel" });
  const titleEl = el("span", { class: "panel-title" }, title);
  const statusEl = el("span", { class: "panel-status muted" });
  const settings = el("aside", { class: "panel-settings" });
  const body = el("div", { class: "panel-body" });
  const main = el("div", { class: "panel-main" }, settings, body);
  let cur = normalizeSize(size);

  const apply = () => {
    panel.style.gridColumn = `span ${cur.span}`;
    if (cur.height) { panel.style.height = cur.height + "px"; panel.classList.add("sized"); }
    else { panel.style.height = ""; panel.classList.remove("sized"); }
  };
  const commit = () => { apply(); onSizeChange && onSizeChange({ ...cur }); };

  const sizeBtn = el("button", { class: "icon-btn", title: "Cycle width (or drag the panel edges)" }, "⤢");
  sizeBtn.addEventListener("click", () => {
    const steps = [4, 6, 8, 12];
    const next = steps.find((s) => s > cur.span) ?? steps[0];
    cur.span = next;
    commit();
  });
  const gearBtn = el("button", { class: "icon-btn", title: "Settings" }, "⚙");
  gearBtn.addEventListener("click", () => panel.classList.toggle("settings-open"));
  const dupBtn = el("button", { class: "icon-btn", title: "Duplicate" }, "⧉");
  dupBtn.addEventListener("click", () => onDuplicate && onDuplicate());
  const closeBtn = el("button", { class: "icon-btn danger", title: "Close" }, "✕");
  closeBtn.addEventListener("click", () => onClose && onClose());
  const drag = el("span", { class: "drag-handle", title: "Drag to reorder" }, "⋮⋮");
  const header = el("header", { class: "panel-header" }, drag, el("span", { class: "panel-icon" }, icon), titleEl, statusEl, el("span", { class: "spacer" }), gearBtn, dupBtn, sizeBtn, closeBtn);
  panel.append(header, main);
  const busy = el("div", { class: "panel-busy" }, el("span", { class: "dot" }), el("span", { class: "busy-text" }, "working…"));
  panel.append(busy);

  // ------------------------------------------------------------ resize handles
  const mkHandle = (cls, title) => { const h = el("div", { class: "panel-resize " + cls, title }); panel.append(h); return h; };
  const hR = mkHandle("r", "Drag to change width");
  const hB = mkHandle("b", "Drag to change height (double-click: automatic height)");
  const hC = mkHandle("c", "Drag to resize");
  const startResize = (mode) => (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const grid = panel.parentElement;
    const gs = getComputedStyle(grid);
    const gap = parseFloat(gs.columnGap) || 0;
    const inner = grid.clientWidth - parseFloat(gs.paddingLeft) - parseFloat(gs.paddingRight);
    const colW = (inner - (COLS - 1) * gap) / COLS;
    const rect = panel.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, span: cur.span, height: rect.height, left: rect.left, top: rect.top };
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    panel.classList.add("resizing");
    document.body.classList.add("resizing");
    const move = (ev) => {
      if (mode !== "b") {
        const w = ev.clientX - start.left;
        cur.span = Math.max(2, Math.min(COLS, Math.round((w + gap / 2) / (colW + gap))));
      }
      if (mode !== "r") {
        cur.height = Math.max(160, Math.round(start.height + (ev.clientY - start.y)));
      }
      apply();
    };
    const up = (ev) => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
      try { target.releasePointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
      panel.classList.remove("resizing");
      document.body.classList.remove("resizing");
      commit();
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };
  hR.addEventListener("pointerdown", startResize("r"));
  hB.addEventListener("pointerdown", startResize("b"));
  hC.addEventListener("pointerdown", startResize("c"));
  hB.addEventListener("dblclick", () => { cur.height = null; commit(); });
  hC.addEventListener("dblclick", () => { cur.height = null; commit(); });
  apply();

  return {
    el: panel, body, settings, header, dragHandle: drag,
    setTitle(t) { titleEl.textContent = t; },
    setStatus(t) { statusEl.textContent = t || ""; },
    setBusy(b, text = "working…") { panel.classList.toggle("busy", !!b); busy.querySelector(".busy-text").textContent = text; },
    openSettings(open = true) { panel.classList.toggle("settings-open", open); },
    get size() { return { ...cur }; },
    setSize(s) { cur = normalizeSize(s); commit(); },
  };
}
