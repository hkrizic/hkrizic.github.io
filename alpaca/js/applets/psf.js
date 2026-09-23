import { el, section, row, select, cmapSelect, stretchSelect, checkbox, button, downloadPNG } from "../ui/widgets.js";
import { ImageView } from "../ui/imagecanvas.js";
import { Plot } from "../ui/plot.js";
import { runOf, runRow, busy, errorBox, fmtNum } from "./common.js";
import { series } from "../ui/theme.js";

function radialProfile(f, nbins = 60) {
  const { rows, cols, data } = f;
  const cy = (rows - 1) / 2, cx = (cols - 1) / 2;
  const rmax = Math.min(cx, cy);
  const sum = new Float64Array(nbins), cnt = new Float64Array(nbins);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const d = Math.hypot(r - cy, c - cx); const b = Math.floor((d / rmax) * nbins); if (b < nbins) { sum[b] += data[r * cols + c]; cnt[b]++; } }
  const xs = Float64Array.from(sum, (_, i) => ((i + 0.5) / nbins) * rmax);
  const ys = Float64Array.from(sum, (v, i) => v / (cnt[i] || 1));
  return { xs, ys };
}

function fwhm(f) {
  const { rows, cols, data } = f;
  let max = -Infinity, imax = 0;
  for (let i = 0; i < data.length; i++) if (data[i] > max) { max = data[i]; imax = i; }
  const r0 = Math.floor(imax / cols), c0 = imax % cols;
  const half = max / 2;
  let left = c0, right = c0;
  while (left > 0 && data[r0 * cols + left] > half) left--;
  while (right < cols - 1 && data[r0 * cols + right] > half) right++;
  let up = r0, down = r0;
  while (up > 0 && data[up * cols + c0] > half) up--;
  while (down < rows - 1 && data[down * cols + c0] > half) down++;
  return { x: right - left, y: down - up };
}

export default {
  id: "psf", title: "PSF", icon: "✱", description: "Input versus recovered PSF kernels (per stage), their difference, radial profiles and FWHM.", defaultSize: "l",
  available: (run) => run.fitsLayers().some((p) => /psf/i.test(p)),
  create(ctx, state, panel) {
    Object.assign(state, { a: state.a || null, b: state.b || null, cmap: state.cmap || "magma", stretch: state.stretch || "log" });
    const grid = el("div", { class: "view-grid three" });
    const plotWrap = el("div", { class: "plot-wrap small" });
    panel.body.append(grid, plotWrap);
    let views = [], plot = null;
    const load = () => busy(panel, "loading kernels", async () => {
      const run = runOf(ctx, state);
      const kernels = run.fitsLayers().filter((p) => /psf/i.test(p) && !/error/i.test(p));
      if (!kernels.length) { panel.body.replaceChildren(errorBox("No PSF kernels.")); return; }
      if (!kernels.includes(state.a)) state.a = kernels.find((p) => /01_input/.test(p)) || kernels[0];
      if (!kernels.includes(state.b)) state.b = kernels.filter((p) => p !== state.a).reverse()[0] || kernels[0];
      const [A, B] = await Promise.all([run.fits(state.a), run.fits(state.b)]);
      views.forEach((v) => v.destroy()); views = []; grid.innerHTML = "";
      const os = (p) => (/supersampled|01_input/.test(p) ? (run.config?.psf?.input?.oversample || 3) : 1);
      const ext = (f, p) => { const pix = (run.pixScale || 1) / os(p); const h = (f.cols * pix) / 2; return [-h, h, -h, h]; };
      const norm = (f) => { let s = 0; for (const v of f.data) s += v; return Float64Array.from(f.data, (v) => v / (s || 1)); };
      const a = norm(A), b = norm(B);
      const mk = (label, data, f, p, opts = {}) => { const cell = el("div", { class: "view-cell" }); grid.append(cell); const v = new ImageView(cell, { cmap: state.cmap, stretch: state.stretch, pmin: 0, pmax: 100, label, group: "psf", ...opts }); v.setImage({ data, rows: f.rows, cols: f.cols, extent: ext(f, p) }); views.push(v); };
      mk("A: " + state.a.replace(/.*\//, ""), a, A, state.a);
      mk("B: " + state.b.replace(/.*\//, ""), b, B, state.b);
      if (A.rows === B.rows && A.cols === B.cols) { const d = Float64Array.from(a, (v, i) => v - b[i]); mk("A − B (normalised)", d, A, state.a, { cmap: "RdBu_r", stretch: "linear", symmetric: true, pmin: 0.5, pmax: 99.5 }); }
      const fa = fwhm(A), fb = fwhm(B);
      panel.setStatus(`FWHM A ≈ ${(fa.x * (run.pixScale || 1) / os(state.a)).toFixed(3)}" × ${(fa.y * (run.pixScale || 1) / os(state.a)).toFixed(3)}" · B ≈ ${(fb.x * (run.pixScale || 1) / os(state.b)).toFixed(3)}" × ${(fb.y * (run.pixScale || 1) / os(state.b)).toFixed(3)}"`);
      if (plot) plot.destroy();
      plot = new Plot(plotWrap, { xlabel: "r [arcsec]", ylabel: "log10 PSF" });
      const pa = radialProfile({ ...A, data: a }), pb = radialProfile({ ...B, data: b });
      const sa = (run.pixScale || 1) / os(state.a), sb = (run.pixScale || 1) / os(state.b);
      plot.render = (p) => {
        const ya = Float64Array.from(pa.ys, (v) => Math.log10(Math.max(1e-9, v))), yb = Float64Array.from(pb.ys, (v) => Math.log10(Math.max(1e-9, v)));
        const xa = Float64Array.from(pa.xs, (v) => v * sa), xb = Float64Array.from(pb.xs, (v) => v * sb);
        p.setRange(0, Math.max(xa[xa.length - 1], xb[xb.length - 1]), Math.min(...ya, ...yb), Math.max(...ya, ...yb) + 0.2); p.clip();
        p.line(xa, ya, { color: series(0) }); p.line(xb, yb, { color: series(1) }); p.unclip(); p.axes({ grid: true }); p.legend([{ color: series(0), label: "A" }, { color: series(1), label: "B" }]);
      };
      plot.draw();
      settings(kernels);
    });
    const settings = (kernels = []) => {
      panel.settings.replaceChildren(
        runRow(ctx, state, load) || "",
        section("Kernels",
          row("A", select(kernels, state.a, (v) => { state.a = v; load(); })),
          row("B", select(kernels, state.b, (v) => { state.b = v; load(); })),
        ),
        section("Display",
          row("Colormap", cmapSelect(state.cmap, (v) => { state.cmap = v; views.slice(0, 2).forEach((vw) => vw.setOptions({ cmap: v })); })),
          row("Stretch", stretchSelect(state.stretch, (v) => { state.stretch = v; views.slice(0, 2).forEach((vw) => vw.setOptions({ stretch: v })); })),
          el("div", { class: "ctl-row" }, button("Export PNGs", () => views.forEach((v, i) => downloadPNG(v.toPNG(), `psf_${i}.png`)), { small: true })),
        ),
      );
    };
    settings();
    load();
    return { destroy() { views.forEach((v) => v.destroy()); plot && plot.destroy(); }, state: () => state, refresh: load };
  },
};
