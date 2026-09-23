// Interactive 2-D image view: colormap + stretch, zoom/pan, readout, axes in
// arcsec, colorbar, overlays (polylines/points), and linked views via the bus.
import { getLut } from "../core/colormaps.js";
import { emit, on } from "../core/bus.js";
import { percentiles } from "../core/stats.js";
import { THEME, F } from "./theme.js";
import { observeStable } from "./resize.js";

let viewSeq = 0;

export function niceTicks(lo, hi, n = 5) {
  if (!(hi > lo)) return [];
  const raw = (hi - lo) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-12; v += step) out.push(+v.toFixed(12));
  return out;
}

export const STRETCHES = ["linear", "log", "sqrt", "asinh", "power"];

export class ImageView {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = {
      cmap: "magma", stretch: "log", pmin: 1, pmax: 99.9, vmin: null, vmax: null, auto: true, asinhA: 10, gamma: 0.5,
      showAxes: true, showColorbar: true, group: null, symmetric: false, label: "", units: "", nanColor: [236, 236, 236], logFloor: 1e-4, overlayDark: false,
      ...opts,
    };
    this.id = "view" + (++viewSeq);
    this.canvas = document.createElement("canvas");
    this.canvas.className = "imageview";
    this.canvas.__view = this;
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.off = document.createElement("canvas");
    this.img = null;
    this.overlays = [];
    this.view = null; // {cx, cy, scale}
    this.hover = null;
    this.linkedHover = null;
    this.onReadout = null;
    this.range = { vmin: 0, vmax: 1 };
    this._bind();
    this._ro = observeStable(container, () => this.draw());
    this._unsub = [
      on("view:change", (d) => { if (d.group && d.group === this.opts.group && d.source !== this.id) { this.view = { ...d.view }; this.draw(false); } }),
      on("view:hover", (d) => { if (d.group && d.group === this.opts.group && d.source !== this.id) { this.linkedHover = d.pos; this.draw(false); } }),
    ];
  }

  destroy() { this._ro.disconnect(); this._unsub.forEach((f) => f()); this.canvas.remove(); }

  // img: {data, rows, cols, extent:[x0,x1,y0,y1]}
  setImage(img, { keepView = true } = {}) {
    const first = !this.img;
    const extentChanged = this.img && this.img.extent.some((v, i) => Math.abs(v - img.extent[i]) > 1e-9);
    this.img = img;
    if (!keepView || first || extentChanged) this.view = null;
    this.rebuild();
    this.draw();
  }

  setOptions(partial) {
    Object.assign(this.opts, partial);
    this.rebuild();
    this.draw();
  }

  setOverlays(list) { this.overlays = list || []; this.draw(false); }
  addOverlay(o) { this.overlays.push(o); this.draw(false); }

  // Percentile-based range for any array with the given options (used for locked scales too).
  static rangeFor(data, o) {
    let vmin = o.vmin ?? null, vmax = o.vmax ?? null;
    if (o.auto || vmin === null || vmax === null) {
      const step = Math.max(1, Math.floor(data.length / 200000));
      const vals = [];
      for (let i = 0; i < data.length; i += step) if (Number.isFinite(data[i])) vals.push(data[i]);
      if (!vals.length) vals.push(0, 1);
      const [a, b] = percentiles(vals, [o.pmin ?? 1, o.pmax ?? 99.9]);
      if (o.auto || vmin === null) vmin = a;
      if (o.auto || vmax === null) vmax = b;
    }
    if (o.symmetric) { const m = Math.max(Math.abs(vmin), Math.abs(vmax)); vmin = -m; vmax = m; }
    if (!(vmax > vmin)) vmax = vmin + 1e-12;
    return { vmin, vmax };
  }

  computeRange() {
    this.range = ImageView.rangeFor(this.img.data, this.opts);
    // log stretch: cap the dynamic range at logFloor relative to vmax when auto-ranging
    if (this.opts.stretch === "log" && this.opts.auto && this.opts.logFloor > 0) {
      const floor = this.range.vmax * this.opts.logFloor;
      if (this.range.vmin < floor) this.range.vmin = floor;
    }
  }

  // normalized t in [0,1] for value v
  norm(v) {
    const { vmin, vmax } = this.range;
    const o = this.opts;
    switch (o.stretch) {
      case "log": {
        const lo = vmin > 0 ? vmin : Math.max(vmax * 1e-4, 1e-12);
        const x = Math.max(v, lo);
        return Math.log(x / lo) / Math.log(vmax / lo);
      }
      case "sqrt": return Math.sqrt(Math.max(0, (v - vmin) / (vmax - vmin)));
      case "asinh": { const a = o.asinhA; return Math.asinh(((v - vmin) / (vmax - vmin)) * a) / Math.asinh(a); }
      case "power": return Math.pow(Math.max(0, (v - vmin) / (vmax - vmin)), o.gamma);
      default: return (v - vmin) / (vmax - vmin);
    }
  }

  // inverse of norm for colorbar ticks
  denorm(t) {
    const { vmin, vmax } = this.range;
    const o = this.opts;
    switch (o.stretch) {
      case "log": { const lo = vmin > 0 ? vmin : Math.max(vmax * 1e-4, 1e-12); return lo * Math.pow(vmax / lo, t); }
      case "sqrt": return vmin + t * t * (vmax - vmin);
      case "asinh": { const a = o.asinhA; return vmin + (Math.sinh(t * Math.asinh(a)) / a) * (vmax - vmin); }
      case "power": return vmin + Math.pow(t, 1 / o.gamma) * (vmax - vmin);
      default: return vmin + t * (vmax - vmin);
    }
  }

  rebuild() {
    if (!this.img || this.img.blank) return;
    this.computeRange();
    const { data, rows, cols } = this.img;
    const lut = getLut(this.opts.cmap);
    this.off.width = cols;
    this.off.height = rows;
    const octx = this.off.getContext("2d");
    const id = octx.createImageData(cols, rows);
    const px = id.data;
    const [nr, ng, nb] = this.opts.nanColor;
    for (let r = 0; r < rows; r++) {
      const rr = rows - 1 - r; // flip: row 0 at the bottom
      for (let c = 0; c < cols; c++) {
        const v = data[r * cols + c];
        const o = (rr * cols + c) * 4;
        if (!Number.isFinite(v)) { px[o] = nr; px[o + 1] = ng; px[o + 2] = nb; px[o + 3] = 255; continue; }
        let t = this.norm(v);
        if (!(t >= 0)) t = 0; else if (t > 1) t = 1;
        const k = Math.round(t * 255) * 3;
        px[o] = lut[k]; px[o + 1] = lut[k + 1]; px[o + 2] = lut[k + 2]; px[o + 3] = 255;
      }
    }
    octx.putImageData(id, 0, 0);
  }

  plotRect() {
    const W = this.container.clientWidth, H = this.container.clientHeight;
    const o = this.opts;
    const l = o.showAxes ? 46 : 2, b = o.showAxes ? 28 : 2, t = 6, r = o.showColorbar ? 62 : 6;
    return { x: l, y: t, w: Math.max(10, W - l - r), h: Math.max(10, H - t - b), W, H };
  }

  fitView() {
    const [x0, x1, y0, y1] = this.img.extent;
    const pr = this.plotRect();
    const scale = Math.min(pr.w / (x1 - x0), pr.h / (y1 - y0));
    this.view = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, scale };
  }

  worldToScreen(x, y) {
    const pr = this.plotRect();
    const v = this.view;
    return [pr.x + pr.w / 2 + (x - v.cx) * v.scale, pr.y + pr.h / 2 - (y - v.cy) * v.scale];
  }

  screenToWorld(px, py) {
    const pr = this.plotRect();
    const v = this.view;
    return [v.cx + (px - pr.x - pr.w / 2) / v.scale, v.cy - (py - pr.y - pr.h / 2) / v.scale];
  }

  valueAt(x, y) {
    if (!this.img || this.img.blank) return null;
    const [x0, x1, y0, y1] = this.img.extent;
    const { rows, cols, data } = this.img;
    const c = Math.floor(((x - x0) / (x1 - x0)) * cols);
    const r = Math.floor(((y - y0) / (y1 - y0)) * rows);
    if (c < 0 || c >= cols || r < 0 || r >= rows) return null;
    return { value: data[r * cols + c], row: r, col: c };
  }

  draw(emitChange = true) {
    const dpr = window.devicePixelRatio || 1;
    const W = this.container.clientWidth, H = this.container.clientHeight;
    if (W < 4 || H < 4) return;
    if (this.canvas.width !== Math.round(W * dpr) || this.canvas.height !== Math.round(H * dpr)) {
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!this.img) return;
    if (!this.view) this.fitView();
    const pr = this.plotRect();
    const [x0, x1, y0, y1] = this.img.extent;
    // image
    ctx.save();
    ctx.beginPath();
    ctx.rect(pr.x, pr.y, pr.w, pr.h);
    ctx.clip();
    ctx.fillStyle = THEME.bg;
    ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
    if (!this.img.blank) {
      const [sx0, sy1] = this.worldToScreen(x0, y0);
      const [sx1, sy0] = this.worldToScreen(x1, y1);
      ctx.imageSmoothingEnabled = (sx1 - sx0) < this.img.cols; // smooth when downscaling only
      ctx.drawImage(this.off, sx0, sy0, sx1 - sx0, sy1 - sy0);
    }
    // overlays
    for (const ov of this.overlays) this._drawOverlay(ctx, ov);
    // linked hover crosshair
    if (this.linkedHover) {
      const [hx, hy] = this.worldToScreen(this.linkedHover[0], this.linkedHover[1]);
      ctx.strokeStyle = this.img.blank ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hx - 8, hy); ctx.lineTo(hx + 8, hy); ctx.moveTo(hx, hy - 8); ctx.lineTo(hx, hy + 8); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = THEME.fg;
    ctx.lineWidth = 1;
    ctx.strokeRect(pr.x + 0.5, pr.y + 0.5, pr.w - 1, pr.h - 1);
    if (this.opts.showAxes) this._drawAxes(ctx, pr);
    if (this.opts.showColorbar && !this.img.blank) this._drawColorbar(ctx, pr);
    if (this.opts.label) {
      ctx.font = F.label;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      if (this.img.blank) { ctx.fillStyle = THEME.fg; }
      else if (this.opts.overlayDark) { ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.strokeText(this.opts.label, pr.x + 9, pr.y + 19); ctx.fillStyle = THEME.fg; }
      else { ctx.lineWidth = 3; ctx.strokeStyle = THEME.halo; ctx.strokeText(this.opts.label, pr.x + 9, pr.y + 19); ctx.fillStyle = "#fff"; }
      ctx.fillText(this.opts.label, pr.x + 9, pr.y + 19);
    }
    if (emitChange && this.opts.group) emit("view:change", { group: this.opts.group, source: this.id, view: this.view });
  }

  _drawOverlay(ctx, ov) {
    const blank = !!(this.img && this.img.blank);
    const dark = blank || this.opts.overlayDark;
    const color = ov.color || (dark ? THEME.overlayDark : THEME.overlay);
    const halo = ov.halo === false || blank ? null : (dark ? "rgba(255,255,255,0.75)" : THEME.halo);
    const width = ov.width || 1.2;
    const passes = halo ? [[halo, width + 2.4, true], [color, width, false]] : [[color, width, false]];
    ctx.save();
    if (ov.dash) ctx.setLineDash(ov.dash);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.font = F.small;
    for (const [col, w, isHalo] of passes) {
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = w;
      if (ov.type === "polylines") {
        for (const line of ov.lines) {
          ctx.beginPath();
          line.forEach(([x, y], i) => { const [px, py] = this.worldToScreen(x, y); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
          if (ov.closed) ctx.closePath();
          ctx.stroke();
        }
      } else if (ov.type === "points") {
        const r = ov.radius || 5;
        for (const [x, y, lab] of ov.points) {
          const [px, py] = this.worldToScreen(x, y);
          ctx.beginPath();
          if (ov.marker === "cross") { ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r); ctx.moveTo(px - r, py + r); ctx.lineTo(px + r, py - r); ctx.stroke(); }
          else if (ov.marker === "star") {
            for (let k = 0; k < 10; k++) { const a = (Math.PI * 2 * k) / 10 - Math.PI / 2; const rr = k % 2 ? r * 0.45 : r; const X = px + rr * Math.cos(a), Y = py + rr * Math.sin(a); if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
            ctx.closePath();
            if (isHalo) ctx.stroke(); else ctx.fill();
          } else { ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke(); }
          if (lab !== undefined && lab !== "" && ov.labels !== false) {
            ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
            if (isHalo) { ctx.lineWidth = 3; ctx.strokeText(String(lab), px + r + 3, py - r); ctx.lineWidth = w; }
            else ctx.fillText(String(lab), px + r + 3, py - r);
          }
        }
      } else if (ov.type === "rect") {
        const [a, b] = this.worldToScreen(ov.x0, ov.y1);
        const [c, d] = this.worldToScreen(ov.x1, ov.y0);
        ctx.strokeRect(a, b, c - a, d - b);
      }
    }
    ctx.restore();
  }

  _drawAxes(ctx, pr) {
    const [wx0, wy1] = this.screenToWorld(pr.x, pr.y);
    const [wx1, wy0] = this.screenToWorld(pr.x + pr.w, pr.y + pr.h);
    ctx.font = F.small;
    ctx.fillStyle = THEME.fg;
    ctx.strokeStyle = THEME.fg;
    ctx.lineWidth = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const t of niceTicks(wx0, wx1, Math.max(2, pr.w / 70))) {
      const [px] = this.worldToScreen(t, 0);
      if (px < pr.x || px > pr.x + pr.w) continue;
      ctx.beginPath(); ctx.moveTo(px, pr.y + pr.h); ctx.lineTo(px, pr.y + pr.h + 4); ctx.stroke();
      ctx.fillText(formatTick(t), px, pr.y + pr.h + 6);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const t of niceTicks(wy0, wy1, Math.max(2, pr.h / 60))) {
      const [, py] = this.worldToScreen(0, t);
      if (py < pr.y || py > pr.y + pr.h) continue;
      ctx.beginPath(); ctx.moveTo(pr.x - 4, py); ctx.lineTo(pr.x, py); ctx.stroke();
      ctx.fillText(formatTick(t), pr.x - 6, py);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = THEME.muted;
    ctx.fillText(this.opts.units || "arcsec", pr.x + pr.w / 2, pr.H - 3);
  }

  _drawColorbar(ctx, pr) {
    const x = pr.x + pr.w + 10, w = 12, y = pr.y, h = pr.h;
    const lut = getLut(this.opts.cmap);
    const img = ctx.createImageData(1, 256);
    for (let i = 0; i < 256; i++) { const k = (255 - i) * 3; img.data[i * 4] = lut[k]; img.data[i * 4 + 1] = lut[k + 1]; img.data[i * 4 + 2] = lut[k + 2]; img.data[i * 4 + 3] = 255; }
    const tmp = document.createElement("canvas"); tmp.width = 1; tmp.height = 256; tmp.getContext("2d").putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, x, y, w, h);
    ctx.strokeStyle = THEME.fg;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.font = F.tick;
    ctx.fillStyle = THEME.fg;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const n = Math.max(2, Math.floor(h / 40));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const v = this.denorm(t);
      const py = y + h - t * h;
      ctx.beginPath(); ctx.moveTo(x + w, py); ctx.lineTo(x + w + 3, py); ctx.stroke();
      ctx.fillText(formatTick(v, true), x + w + 5, py);
    }
  }

  _bind() {
    const c = this.canvas;
    let drag = null;
    c.addEventListener("wheel", (e) => {
      if (!this.img) return;
      e.preventDefault();
      const rect = c.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      const [wx, wy] = this.screenToWorld(px, py);
      const f = Math.exp(-e.deltaY * 0.0015);
      const v = this.view;
      const ns = Math.max(v.scale * f, 1e-3);
      // keep world point under the cursor fixed
      const pr = this.plotRect();
      v.cx = wx - (px - pr.x - pr.w / 2) / ns;
      v.cy = wy + (py - pr.y - pr.h / 2) / ns;
      v.scale = ns;
      this.draw();
    }, { passive: false });
    c.addEventListener("pointerdown", (e) => { if (!this.img) return; drag = { x: e.clientX, y: e.clientY, cx: this.view.cx, cy: this.view.cy }; c.setPointerCapture(e.pointerId); });
    c.addEventListener("pointermove", (e) => {
      if (!this.img) return;
      const rect = c.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      if (drag) {
        this.view.cx = drag.cx - (e.clientX - drag.x) / this.view.scale;
        this.view.cy = drag.cy + (e.clientY - drag.y) / this.view.scale;
        this.draw();
        return;
      }
      const [wx, wy] = this.screenToWorld(px, py);
      const v = this.valueAt(wx, wy);
      this.hover = { x: wx, y: wy, ...(v || {}) };
      if (this.onReadout) this.onReadout(v ? this.hover : null);
      if (this.opts.group) emit("view:hover", { group: this.opts.group, source: this.id, pos: [wx, wy] });
    });
    c.addEventListener("pointerup", (e) => { drag = null; try { c.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ } });
    c.addEventListener("pointerleave", () => { drag = null; if (this.onReadout) this.onReadout(null); if (this.opts.group) emit("view:hover", { group: this.opts.group, source: this.id, pos: null }); });
    c.addEventListener("dblclick", () => { this.view = null; this.draw(); });
  }

  resetView() { this.view = null; this.draw(); }

  toPNG() { return this.canvas.toDataURL("image/png"); }
}

export function formatTick(v, compact = false) {
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e4 || a < 1e-3) return v.toExponential(compact ? 1 : 2);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  if (a >= 1) return v.toFixed(2);
  return v.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
