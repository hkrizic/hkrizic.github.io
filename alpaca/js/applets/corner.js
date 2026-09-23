import { el, section, row, select, checkbox, paramPicker, range, button, downloadPNG, number } from "../ui/widgets.js";
import { runOf, runRow, otherRun, busy, errorBox, fmtNum } from "./common.js";
import { paramGroup } from "../core/run.js";
import { kde1d, kde2d, massLevels, summarize, histogram } from "../core/stats.js";
import { marchingSquares, mapPolylines } from "../core/contours.js";
import { niceTicks, formatTick } from "../ui/imagecanvas.js";
import { THEME } from "../ui/theme.js";
import { observeStable } from "../ui/resize.js";

const DEFAULT = ["lens_theta_E", "lens_gamma", "lens_e1", "lens_e2", "lens_gamma1", "lens_gamma2", "D_dt"];
const COLORS = THEME.series;

function fillColor(hex, a) { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return `rgba(${r},${g},${b},${a})`; }

export default {
  id: "corner", title: "Corner plot", icon: "◩", description: "2-D posterior contours (68/95 %) and 1-D marginals for any parameter subset, with priors and a second run overlaid.", defaultSize: "l",
  available: (run) => run.features.posterior,
  create(ctx, state, panel) {
    Object.assign(state, { params: state.params || null, style: state.style || "contours", priors: !!state.priors, compare: state.compare ?? true, bw: state.bw ?? 1, grid: state.grid ?? 64, showStats: state.showStats ?? true, cellSize: state.cellSize ?? null, rangeZoom: state.rangeZoom ?? 1 });
    const canvas = el("canvas", { class: "corner" });
    const wrap = el("div", { class: "canvas-wrap" }, canvas);
    const status = el("div", { class: "readout muted" }, "");
    panel.body.append(wrap, status);
    const ctx2 = canvas.getContext("2d");
    let data = null; // {sets:[{label,color,cols:{name:arr}}], names}
    let layout = null;

    const load = () => busy(panel, "loading posterior", async () => {
      const run = runOf(ctx, state);
      const post = await run.posterior();
      const names = post.scalarNames;
      if (!state.params) state.params = DEFAULT.filter((n) => names.includes(n));
      if (!state.params.length) state.params = names.slice(0, 5);
      const sets = [{ label: `${run.label}: ${run.name}`, color: COLORS[0], cols: post.columns, alpha: 1 }];
      const other = otherRun(ctx, run);
      if (other && state.compare && other.features.posterior) {
        const p2 = await other.posterior();
        sets.push({ label: `${other.label}: ${other.name}`, color: COLORS[1], cols: p2.columns, alpha: 1 });
      }
      if (state.priors && run.features.priors) {
        const pr = await run.priors();
        const cols = {};
        for (const [k, v] of Object.entries(pr.columns)) if (!post.blindedColumns.includes(k)) cols[k] = v;
        sets.push({ label: "prior", color: THEME.prior, cols, alpha: 0.9, prior: true });
      }
      data = { sets, names, blinded: new Set(post.blindedColumns) };
      settings();
      draw();
    });

    const draw = () => {
      if (!data) return;
      const params = state.params.filter((p) => data.names.includes(p));
      const n = params.length;
      const Wavail = wrap.clientWidth || 600;
      const left = 58, top = 10, bottom = 54;
      const autoCell = Math.max(52, Math.min(210, Math.floor((Wavail - left - 12) / Math.max(1, n))));
      const cell = Math.max(36, Math.min(420, Math.round(state.cellSize || autoCell)));
      const W = Math.max(Wavail, left + n * cell + 14);
      const small = cell < 110;
      const tickFont = small ? `9px ${THEME.font}` : `10px ${THEME.font}`;
      const H = top + n * cell + bottom;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2.clearRect(0, 0, W, H);
      // ranges: union over sets (posterior only) with padding
      const ranges = {};
      const fullRanges = {};
      for (const p of params) {
        let lo = Infinity, hi = -Infinity;
        for (const s of data.sets) { if (s.prior) continue; const c = s.cols[p]; if (!c) continue; const st = summarize(c); lo = Math.min(lo, st.lo95 - 1.2 * (st.median - st.lo95)); hi = Math.max(hi, st.hi95 + 1.2 * (st.hi95 - st.median)); }
        if (!(hi > lo)) { lo -= 1; hi += 1; }
        // range zoom about the centre (1 = default extent, <1 zooms in); KDEs are evaluated on the
        // wider of the two so contours close outside the visible window instead of being chopped.
        const mid = 0.5 * (lo + hi), half = 0.5 * (hi - lo) * (state.rangeZoom || 1);
        ranges[p] = [mid - half, mid + half];
        fullRanges[p] = half > 0.5 * (hi - lo) ? ranges[p] : [lo, hi];
      }
      layout = { params, cell, left, top, ranges };
      ctx2.font = `10px ${THEME.font}`;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
          const x = left + j * cell, y = top + i * cell;
          ctx2.strokeStyle = THEME.border;
          ctx2.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
          const px = params[j], py = params[i];
          const [x0, x1] = ranges[px];
          const [y0, y1] = ranges[py];
          const X = (v) => x + ((v - x0) / (x1 - x0)) * cell;
          const Y = (v) => y + cell - ((v - y0) / (y1 - y0)) * cell;
          ctx2.save(); ctx2.beginPath(); ctx2.rect(x, y, cell, cell); ctx2.clip();
          if (i === j) {
            // 1-D marginal
            let ymax = 0;
            const curves = [];
            for (const s of data.sets) {
              const c = s.cols[px]; if (!c) continue;
              if (s.prior) continue;
              const k = kde1d(c, { n: 160, range: [x0, x1], bw: null });
              if (state.bw !== 1) { const k2 = kde1d(c, { n: 160, range: [x0, x1], bw: k.bw * state.bw }); curves.push({ s, k: k2 }); ymax = Math.max(ymax, ...k2.ys); }
              else { curves.push({ s, k }); ymax = Math.max(ymax, ...k.ys); }
            }
            // prior: evaluated on its own full range and scaled so its peak matches the posterior peak
            for (const s of data.sets) {
              const c = s.cols[px]; if (!s.prior || !c) continue;
              const k = kde1d(c, { n: 400 });
              const pk = Math.max(...k.ys) || 1;
              curves.push({ s, k: { xs: k.xs, ys: Float64Array.from(k.ys, (v) => (v / pk) * ymax * 0.85) } });
            }
            for (const { s, k } of curves) {
              ctx2.beginPath();
              for (let t = 0; t < k.xs.length; t++) { const X2 = X(k.xs[t]); const Y2 = y + cell - (k.ys[t] / ymax) * (cell - 6); if (t) ctx2.lineTo(X2, Y2); else ctx2.moveTo(X2, Y2); }
              ctx2.strokeStyle = s.color; ctx2.lineWidth = s.prior ? 1 : 1.5; if (s.prior) ctx2.setLineDash([3, 3]); ctx2.globalAlpha = s.alpha; ctx2.stroke(); ctx2.setLineDash([]);
              if (!s.prior) { ctx2.lineTo(X(k.xs[k.xs.length - 1]), y + cell); ctx2.lineTo(X(k.xs[0]), y + cell); ctx2.closePath(); ctx2.fillStyle = fillColor(s.color, 0.12); ctx2.fill(); }
              ctx2.globalAlpha = 1;
            }
            if (state.showStats) {
              const s0 = data.sets[0]; const st = summarize(s0.cols[px]);
              ctx2.strokeStyle = "rgba(0,0,0,0.5)"; ctx2.setLineDash([3, 3]);
              for (const v of [st.lo68, st.median, st.hi68]) { ctx2.beginPath(); ctx2.moveTo(X(v), y); ctx2.lineTo(X(v), y + cell); ctx2.stroke(); }
              ctx2.setLineDash([]);
              const d = Math.max(0, Math.min(6, 2 - Math.floor(Math.log10(Math.max(1e-12, st.hi68 - st.lo68)))));
              const txt = cell >= 150 ? `${st.median.toFixed(d)} +${(st.hi68 - st.median).toFixed(d)} −${(st.median - st.lo68).toFixed(d)}` : cell >= 80 ? `${st.median.toFixed(d)}` : "";
              if (txt) { ctx2.fillStyle = THEME.fg; ctx2.textAlign = "center"; ctx2.textBaseline = "top"; ctx2.font = tickFont; ctx2.fillText(txt, x + cell / 2, y + 3); }
            }
          } else {
            for (const s of [...data.sets].reverse()) {
              const cx = s.cols[px], cy = s.cols[py]; if (!cx || !cy) continue;
              if (state.style === "scatter") {
                ctx2.fillStyle = fillColor(s.color, 0.5);
                const step = Math.max(1, Math.floor(cx.length / 4000));
                for (let t = 0; t < cx.length; t += step) { ctx2.fillRect(X(cx[t]) - 1, Y(cy[t]) - 1, 2, 2); }
                continue;
              }
              let [fx0, fx1] = fullRanges[px], [fy0, fy1] = fullRanges[py];
              let nGrid = Math.min(200, Math.round(state.grid * Math.max(1, Math.max((fx1 - fx0) / (x1 - x0), (fy1 - fy0) / (y1 - y0)))));
              if (s.prior) {
                let a = Infinity, b = -Infinity, c2 = Infinity, d2 = -Infinity;
                for (const v of cx) { if (v < a) a = v; if (v > b) b = v; }
                for (const v of cy) { if (v < c2) c2 = v; if (v > d2) d2 = v; }
                const px2 = (b - a) * 0.05, py2 = (d2 - c2) * 0.05;
                fx0 = a - px2; fx1 = b + px2; fy0 = c2 - py2; fy1 = d2 + py2; nGrid = 96;
              }
              const g = kde2d(cx, cy, { n: nGrid, rangeX: [fx0, fx1], rangeY: [fy0, fy1], bwScale: s.prior ? 1 : state.bw });
              if (state.style === "heat") {
                let m = 0; for (const v of g.grid) m = Math.max(m, v);
                const id = ctx2.createImageData(g.n, g.n);
                const r = parseInt(s.color.slice(1, 3), 16), gg = parseInt(s.color.slice(3, 5), 16), b = parseInt(s.color.slice(5, 7), 16);
                for (let jj = 0; jj < g.n; jj++) for (let ii = 0; ii < g.n; ii++) { const o = ((g.n - 1 - jj) * g.n + ii) * 4; const t = g.grid[jj * g.n + ii] / m; id.data[o] = r; id.data[o + 1] = gg; id.data[o + 2] = b; id.data[o + 3] = Math.round(220 * Math.sqrt(t)); }
                const tmp = document.createElement("canvas"); tmp.width = g.n; tmp.height = g.n; tmp.getContext("2d").putImageData(id, 0, 0);
                ctx2.imageSmoothingEnabled = true; ctx2.drawImage(tmp, x, y, cell, cell);
              } else {
                const levels = massLevels(g.grid, [0.95, 0.68], g.dx * g.dy);
                levels.forEach((lv, li) => {
                  const lines = mapPolylines(marchingSquares(g.grid, g.n, g.n, lv), (c) => X(g.x0 + c * g.dx), (r) => Y(g.y0 + r * g.dy));
                  ctx2.beginPath();
                  for (const line of lines) { line.forEach(([a, b], t) => (t ? ctx2.lineTo(a, b) : ctx2.moveTo(a, b))); ctx2.closePath(); }
                  ctx2.fillStyle = fillColor(s.color, s.prior ? 0.06 : li === 0 ? 0.16 : 0.42); ctx2.fill();
                  ctx2.strokeStyle = s.color; ctx2.lineWidth = 1; ctx2.globalAlpha = s.alpha; ctx2.stroke(); ctx2.globalAlpha = 1;
                });
              }
            }
          }
          ctx2.restore();
          // ticks
          ctx2.fillStyle = THEME.fg; ctx2.strokeStyle = THEME.fg;
          ctx2.font = tickFont;
          if (i === n - 1) {
            const ticks = niceTicks(x0, x1, small ? 2 : 3);
            for (const t of ticks) {
              ctx2.beginPath(); ctx2.moveTo(X(t), y + cell); ctx2.lineTo(X(t), y + cell + 4); ctx2.stroke();
              ctx2.save(); ctx2.translate(X(t), y + cell + 6); if (small) { ctx2.rotate(-Math.PI / 4); ctx2.textAlign = "right"; ctx2.textBaseline = "middle"; } else { ctx2.textAlign = "center"; ctx2.textBaseline = "top"; }
              ctx2.fillText(formatTick(t), 0, 0); ctx2.restore();
            }
            ctx2.save(); ctx2.fillStyle = THEME.fg; ctx2.font = (small ? "10px " : "11px ") + THEME.font; ctx2.textAlign = "center"; ctx2.textBaseline = "top";
            ctx2.fillText(px + (data.blinded.has(px) ? " (Δ)" : ""), x + cell / 2, y + cell + (small ? 34 : 22)); ctx2.restore();
          }
          if (j === 0 && i > 0) {
            ctx2.textAlign = "right"; ctx2.textBaseline = "middle";
            for (const t of niceTicks(y0, y1, small ? 2 : 3)) { ctx2.beginPath(); ctx2.moveTo(x - 4, Y(t)); ctx2.lineTo(x, Y(t)); ctx2.stroke(); ctx2.fillText(formatTick(t), x - 6, Y(t)); }
            ctx2.save(); ctx2.translate(11, y + cell / 2); ctx2.rotate(-Math.PI / 2); ctx2.textAlign = "center"; ctx2.textBaseline = "middle"; ctx2.fillStyle = THEME.fg; ctx2.font = (small ? "10px " : "11px ") + THEME.font; ctx2.fillText(py + (data.blinded.has(py) ? " (Δ)" : ""), 0, 0); ctx2.restore();
          }
        }
      }
      // legend
      ctx2.font = `11px ${THEME.font}`; ctx2.textAlign = "left"; ctx2.textBaseline = "middle";
      data.sets.forEach((s, k) => { const lx = left + Math.max(1, n - 2) * cell + 10, ly = top + 12 + k * 16; ctx2.fillStyle = s.color; ctx2.fillRect(lx, ly - 4, 14, 8); ctx2.fillStyle = THEME.fg; ctx2.fillText(s.label, lx + 20, ly); });
      status.textContent = (data.blinded.size ? `Δ = blinded parameter shown as deviation from its posterior mean (${[...data.blinded].join(", ")})` : "") + (state.priors && data.blinded.size ? " · priors are not overlaid for blinded parameters" : "");
    };

    canvas.addEventListener("mousemove", (e) => {
      if (!layout || !data) return;
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const j = Math.floor((mx - layout.left) / layout.cell), i = Math.floor((my - layout.top) / layout.cell);
      if (j < 0 || i < 0 || j > i || i >= layout.params.length) { status.textContent = ""; return; }
      const px = layout.params[j], py = layout.params[i];
      const [x0, x1] = layout.ranges[px]; const [y0, y1] = layout.ranges[py];
      const vx = x0 + ((mx - layout.left - j * layout.cell) / layout.cell) * (x1 - x0);
      const vy = y1 - ((my - layout.top - i * layout.cell) / layout.cell) * (y1 - y0);
      status.textContent = i === j ? `${px} = ${fmtNum(vx, 5)}` : `${px} = ${fmtNum(vx, 5)}   ${py} = ${fmtNum(vy, 5)}`;
    });
    const ro = observeStable(wrap, () => draw());
    // zoom: ctrl/cmd + wheel (or pinch) scales the plot; shift + wheel zooms the parameter ranges
    canvas.addEventListener("wheel", (e) => {
      if (!(e.ctrlKey || e.metaKey || e.shiftKey)) return;
      e.preventDefault();
      const f = Math.exp(-e.deltaY * 0.002);
      if (e.shiftKey) state.rangeZoom = Math.max(0.2, Math.min(4, (state.rangeZoom || 1) / f));
      else state.cellSize = Math.max(36, Math.min(420, (state.cellSize || layout?.cell || 120) * f));
      draw(); syncZoomControls();
    }, { passive: false });
    let syncZoomControls = () => {};

    syncZoomControls = () => {
      const c = panel.settings.querySelector('input[data-zoom="cell"]'); if (c) c.value = state.cellSize || layout?.cell || 120;
      const r = panel.settings.querySelector('input[data-zoom="range"]'); if (r) r.value = state.rangeZoom;
    };
    const settings = () => {
      const run = runOf(ctx, state);
      panel.settings.replaceChildren(
        runRow(ctx, state, load) || "",
        section("Style",
          row("Density", select([{ value: "contours", label: "KDE contours 68/95 %" }, { value: "heat", label: "KDE heat map" }, { value: "scatter", label: "Samples" }], state.style, (v) => { state.style = v; draw(); })),
          row("Bandwidth ×", range(state.bw, (v) => { state.bw = v; draw(); }, { min: 0.3, max: 3, step: 0.1, live: false })),
          row("KDE grid", number(state.grid, (v) => { state.grid = Math.max(24, Math.min(160, v)); draw(); }, { min: 24, max: 160, step: 8, width: 70 })),
          checkbox("Median ± 68 % on diagonals", state.showStats, (v) => { state.showStats = v; draw(); }),
        ),
        section("Zoom",
          row("Plot size", (() => { const r = range(state.cellSize || layout?.cell || 120, (v) => { state.cellSize = v; draw(); }, { min: 36, max: 420, step: 2 }); r.dataset.zoom = "cell"; return r; })(), button("fit", () => { state.cellSize = null; draw(); syncZoomControls(); }, { small: true })),
          row("Range", (() => { const r = range(state.rangeZoom, (v) => { state.rangeZoom = v; draw(); }, { min: 0.2, max: 4, step: 0.05 }); r.dataset.zoom = "range"; return r; })(), button("reset", () => { state.rangeZoom = 1; draw(); syncZoomControls(); }, { small: true })),
          el("div", { class: "muted small" }, "Ctrl/⌘ + wheel (or pinch) scales the plot; Shift + wheel zooms the ranges in and out."),
          run.features.priors ? checkbox("Overlay prior samples", state.priors, (v) => { state.priors = v; load(); }) : "",
          ctx.app.runs.length > 1 ? checkbox("Overlay other run", state.compare, (v) => { state.compare = v; load(); }) : "",
          el("div", { class: "ctl-row" }, button("Export PNG", () => downloadPNG(canvas.toDataURL("image/png"), "corner.png"), { small: true })),
        ),
        section("Parameters", data ? paramPicker(data.names, state.params, (sel) => { state.params = sel; draw(); }, { groupOf: paramGroup, max: 14, title: "up to 14" }) : ""),
      );
    };
    load();
    return { destroy() { ro.disconnect(); }, state: () => state, refresh: load };
  },
};
