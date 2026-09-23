// Lightweight immediate-mode 2-D plotting on canvas (axes, lines, bars, scatter, contours).
import { niceTicks, formatTick } from "./imagecanvas.js";
import { THEME, F } from "./theme.js";
import { observeStable } from "./resize.js";

export class Plot {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = { margin: { l: 52, r: 14, t: 12, b: 36 }, xlabel: "", ylabel: "", ...opts };
    this.canvas = document.createElement("canvas");
    this.canvas.className = "plot";
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.render = null;
    this.onHover = null;
    this.onClick = null;
    this.range = [0, 1, 0, 1];
    this._ro = observeStable(container, () => this.draw());
    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.onHover) return;
      const r = this.canvas.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const [wx, wy] = this.toWorld(px, py);
      this.onHover({ x: wx, y: wy, px, py, inside: this.inside(px, py) }, e);
    });
    this.canvas.addEventListener("pointerleave", () => this.onHover && this.onHover(null));
    this.canvas.addEventListener("click", (e) => {
      if (!this.onClick) return;
      const r = this.canvas.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const [wx, wy] = this.toWorld(px, py);
      this.onClick({ x: wx, y: wy, px, py, inside: this.inside(px, py) }, e);
    });
  }

  destroy() { this._ro.disconnect(); this.canvas.remove(); }

  rect() {
    const m = this.opts.margin;
    const W = this.container.clientWidth, H = this.container.clientHeight;
    return { x: m.l, y: m.t, w: Math.max(4, W - m.l - m.r), h: Math.max(4, H - m.t - m.b), W, H };
  }

  inside(px, py) { const r = this.rect(); return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }

  X(x) { const r = this.rect(); const [x0, x1] = this.range; return r.x + ((x - x0) / (x1 - x0)) * r.w; }
  Y(y) { const r = this.rect(); const [, , y0, y1] = this.range; return r.y + r.h - ((y - y0) / (y1 - y0)) * r.h; }
  toWorld(px, py) {
    const r = this.rect(); const [x0, x1, y0, y1] = this.range;
    return [x0 + ((px - r.x) / r.w) * (x1 - x0), y0 + ((r.y + r.h - py) / r.h) * (y1 - y0)];
  }

  draw() {
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
    if (this.render) this.render(this.api());
  }

  api() {
    const ctx = this.ctx;
    const self = this;
    const r = this.rect();
    const api = {
      ctx, rect: r, X: (x) => self.X(x), Y: (y) => self.Y(y),
      setRange(x0, x1, y0, y1) { self.range = [x0, x1, y0, y1]; },
      clip() { ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); },
      unclip() { ctx.restore(); },
      axes({ xlabel = self.opts.xlabel, ylabel = self.opts.ylabel, xticks = true, yticks = true, grid = false } = {}) {
        const [x0, x1, y0, y1] = self.range;
        ctx.save();
        ctx.strokeStyle = THEME.fg; ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        ctx.font = F.small; ctx.fillStyle = THEME.fg;
        if (xticks) {
          ctx.textAlign = "center"; ctx.textBaseline = "top";
          for (const t of niceTicks(x0, x1, Math.max(2, r.w / 80))) {
            const px = self.X(t); if (px < r.x - 1 || px > r.x + r.w + 1) continue;
            ctx.beginPath(); ctx.moveTo(px, r.y + r.h); ctx.lineTo(px, r.y + r.h + 4); ctx.stroke();
            if (grid) { ctx.save(); ctx.strokeStyle = THEME.grid; ctx.beginPath(); ctx.moveTo(px, r.y); ctx.lineTo(px, r.y + r.h); ctx.stroke(); ctx.restore(); }
            ctx.fillText(formatTick(t), px, r.y + r.h + 6);
          }
        }
        if (yticks) {
          ctx.textAlign = "right"; ctx.textBaseline = "middle";
          for (const t of niceTicks(y0, y1, Math.max(2, r.h / 50))) {
            const py = self.Y(t); if (py < r.y - 1 || py > r.y + r.h + 1) continue;
            ctx.beginPath(); ctx.moveTo(r.x - 4, py); ctx.lineTo(r.x, py); ctx.stroke();
            if (grid) { ctx.save(); ctx.strokeStyle = THEME.grid; ctx.beginPath(); ctx.moveTo(r.x, py); ctx.lineTo(r.x + r.w, py); ctx.stroke(); ctx.restore(); }
            ctx.fillText(formatTick(t), r.x - 6, py);
          }
        }
        ctx.fillStyle = THEME.muted;
        if (xlabel) { ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText(xlabel, r.x + r.w / 2, r.H - 4); }
        if (ylabel) { ctx.save(); ctx.translate(12, r.y + r.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ylabel, 0, 0); ctx.restore(); }
        ctx.restore();
      },
      line(xs, ys, { color = THEME.fg, width = 1.5, dash = null, alpha = 1 } = {}) {
        ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; if (dash) ctx.setLineDash(dash);
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < xs.length; i++) { if (!Number.isFinite(ys[i])) { started = false; continue; } const px = self.X(xs[i]), py = self.Y(ys[i]); if (started) ctx.lineTo(px, py); else { ctx.moveTo(px, py); started = true; } }
        ctx.stroke(); ctx.restore();
      },
      fill(xs, ys, { color = "rgba(0,0,0,0.08)", baseline = 0 } = {}) {
        ctx.save(); ctx.fillStyle = color; ctx.beginPath();
        ctx.moveTo(self.X(xs[0]), self.Y(baseline));
        for (let i = 0; i < xs.length; i++) ctx.lineTo(self.X(xs[i]), self.Y(ys[i]));
        ctx.lineTo(self.X(xs[xs.length - 1]), self.Y(baseline)); ctx.closePath(); ctx.fill(); ctx.restore();
      },
      bars(edges, heights, { color = "rgba(0,0,0,0.22)", stroke = null } = {}) {
        ctx.save(); ctx.fillStyle = color; if (stroke) ctx.strokeStyle = stroke;
        const y0 = self.Y(Math.max(0, self.range[2]));
        for (let i = 0; i < heights.length; i++) {
          const a = self.X(edges[i]), b = self.X(edges[i + 1]); const t = self.Y(heights[i]);
          ctx.fillRect(a, t, Math.max(1, b - a), y0 - t);
          if (stroke) ctx.strokeRect(a, t, b - a, y0 - t);
        }
        ctx.restore();
      },
      scatter(xs, ys, { color = THEME.fg, radius = 2, alpha = 0.8 } = {}) {
        ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = alpha;
        for (let i = 0; i < xs.length; i++) { ctx.beginPath(); ctx.arc(self.X(xs[i]), self.Y(ys[i]), radius, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      },
      polys(polys, { stroke = THEME.fg, fill = null, width = 1.2, close = true } = {}) {
        ctx.save(); ctx.strokeStyle = stroke; ctx.lineWidth = width; if (fill) ctx.fillStyle = fill;
        for (const poly of polys) {
          ctx.beginPath();
          poly.forEach(([x, y], i) => { const px = self.X(x), py = self.Y(y); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
          if (close) ctx.closePath();
          if (fill) ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      },
      vline(x, { color = "rgba(0,0,0,0.5)", dash = [4, 3], width = 1 } = {}) { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(self.X(x), r.y); ctx.lineTo(self.X(x), r.y + r.h); ctx.stroke(); ctx.restore(); },
      hline(y, { color = "rgba(0,0,0,0.5)", dash = [4, 3], width = 1 } = {}) { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(r.x, self.Y(y)); ctx.lineTo(r.x + r.w, self.Y(y)); ctx.stroke(); ctx.restore(); },
      band(x0, x1, { color = "rgba(0,0,0,0.06)" } = {}) { ctx.save(); ctx.fillStyle = color; ctx.fillRect(self.X(x0), r.y, self.X(x1) - self.X(x0), r.h); ctx.restore(); },
      text(x, y, s, { color = THEME.fg, align = "left", baseline = "top", font = F.small, px = false } = {}) {
        ctx.save(); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = baseline; ctx.font = font;
        ctx.fillText(s, px ? x : self.X(x), px ? y : self.Y(y)); ctx.restore();
      },
      legend(items, { x = r.x + 8, y = r.y + 8 } = {}) {
        ctx.save(); ctx.font = F.small; ctx.textBaseline = "middle"; ctx.textAlign = "left";
        items.forEach((it, i) => { const yy = y + i * 16 + 6; ctx.fillStyle = it.color; ctx.fillRect(x, yy - 4, 14, 8); ctx.strokeStyle = THEME.fg; ctx.lineWidth = 0.5; ctx.strokeRect(x + 0.5, yy - 3.5, 13, 7); ctx.fillStyle = THEME.fg; ctx.fillText(it.label, x + 20, yy); });
        ctx.restore();
      },
      heat(grid, n, x0, x1, y0, y1, lut, { alpha = 1, vmax = null } = {}) {
        // draw a small density grid as an image
        const tmp = document.createElement("canvas"); tmp.width = n; tmp.height = n;
        const id = tmp.getContext("2d").createImageData(n, n);
        let m = vmax; if (m === null) { m = 0; for (let i = 0; i < grid.length; i++) m = Math.max(m, grid[i]); }
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const t = Math.min(1, grid[j * n + i] / (m || 1)); const k = Math.round(t * 255) * 3; const o = ((n - 1 - j) * n + i) * 4; id.data[o] = lut[k]; id.data[o + 1] = lut[k + 1]; id.data[o + 2] = lut[k + 2]; id.data[o + 3] = Math.round(255 * alpha); }
        tmp.getContext("2d").putImageData(id, 0, 0);
        ctx.save(); ctx.imageSmoothingEnabled = true;
        const ax = self.X(x0), bx = self.X(x1), ay = self.Y(y1), by = self.Y(y0);
        ctx.drawImage(tmp, ax, ay, bx - ax, by - ay); ctx.restore();
      },
    };
    return api;
  }

  toPNG() { return this.canvas.toDataURL("image/png"); }
}
