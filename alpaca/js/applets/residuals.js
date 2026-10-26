// Residual statistics: is what the model leaves behind consistent with the noise? Normalised residuals
// (data − model) / σ inside the likelihood mask, for the viewers' default model (best log-L draw, else the
// MAP), with or without the PSF-error term b in σ: their distribution against N(0, 1) and its tails, χ² in
// annuli around the lens (units of θ_E) and against the distance to the nearest point-source image (a PSF
// mismatch signature), the mean residual against angle in the arc annulus, and the spatial autocorrelation
// in the lens region against the empty sky (r > 2 θ_E). The sky carries the noise's own correlation (e.g.
// from drizzling), so structure the model missed shows up as correlation in excess of the sky's.
import { el, section, row, select, number, checkbox, button, downloadPNG, badge } from "../ui/widgets.js";
import { Plot } from "../ui/plot.js";
import { ImageView } from "../ui/imagecanvas.js";
import { runOf, runRow, busy, maskFrom, pointSourcePositions } from "./common.js";
import { histogram } from "../core/stats.js";
import { THEME, series, alpha } from "../ui/theme.js";

// standard normal CDF (erfc of Numerical Recipes, |error| < 1.2e-7) and quantile function (Acklam)
function Phi(x) {
  const z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.5 * z);
  const erfc = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? 1 - erfc / 2 : erfc / 2;
}
function PhiInv(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const tail = (q) => (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  if (p < 0.02425) return tail(Math.sqrt(-2 * Math.log(p)));
  if (p > 1 - 0.02425) return -tail(Math.sqrt(-2 * Math.log(1 - p)));
  const q = p - 0.5, r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function moments(v) {
  const n = v.length;
  let m = 0; for (const x of v) m += x; m /= n;
  let m2 = 0, m3 = 0, m4 = 0;
  for (const x of v) { const d = x - m, d2 = d * d; m2 += d2; m3 += d2 * d; m4 += d2 * d2; }
  m2 /= n; m3 /= n; m4 /= n;
  let chi2 = 0; for (const x of v) chi2 += x * x;
  return { n, mean: m, std: Math.sqrt(m2), skew: m3 / m2 ** 1.5, kurt: m4 / (m2 * m2) - 3, chi2: chi2 / n };
}

// χ² per bin of a per-pixel coordinate (NaN where the bin is empty).
function binnedChi2(res, coord, idx, lo, hi, nb) {
  const s = new Float64Array(nb), c = new Float64Array(nb), w = (hi - lo) / nb;
  for (const i of idx) { const b = Math.floor((coord[i] - lo) / w); if (b >= 0 && b < nb) { s[b] += res[i] * res[i]; c[b]++; } }
  return { xs: Float64Array.from(s, (_, b) => lo + (b + 0.5) * w), ys: Float64Array.from(s, (v, b) => (c[b] ? v / c[b] : NaN)), n: c };
}

// Autocorrelation of residuals over pixel lags |dx|, |dy| <= L, using only pixel pairs inside `region`.
function autocorr(res, region, nx, ny, L) {
  let m = 0, n = 0;
  for (let i = 0; i < res.length; i++) if (region[i]) { m += res[i]; n++; }
  m /= Math.max(1, n);
  const v = new Float64Array(res.length);
  let var0 = 0;
  for (let i = 0; i < res.length; i++) if (region[i]) { v[i] = res[i] - m; var0 += v[i] * v[i]; }
  var0 /= Math.max(1, n);
  const W = 2 * L + 1, rho = new Float64Array(W * W);
  for (let dy = -L; dy <= L; dy++) for (let dx = -L; dx <= L; dx++) {
    let s = 0, c = 0;
    for (let r = Math.max(0, -dy); r < Math.min(ny, ny - dy); r++) {
      const o = r * nx, o2 = (r + dy) * nx + dx;
      for (let col = Math.max(0, -dx); col < Math.min(nx, nx - dx); col++) if (region[o + col] && region[o2 + col]) { s += v[o + col] * v[o2 + col]; c++; }
    }
    rho[(dy + L) * W + dx + L] = c ? s / c / var0 : NaN;
  }
  const prof = new Float64Array(L + 1), pc = new Float64Array(L + 1);
  for (let dy = -L; dy <= L; dy++) for (let dx = -L; dx <= L; dx++) { const k = Math.round(Math.hypot(dx, dy)); const val = rho[(dy + L) * W + dx + L]; if (k <= L && Number.isFinite(val)) { prof[k] += val; pc[k]++; } }
  return { rho, W, n, profile: Float64Array.from(prof, (s, k) => (pc[k] ? s / pc[k] : NaN)) };
}

// A χ²_red-per-bin plot with the 1 ± sqrt(2/n) expectation; bins above the cap are drawn at the cap and labelled.
function chi2Plot(p, b, { cap = 4, shade = null }) {
  const fin = [...b.ys].filter(Number.isFinite);
  const top = Math.min(cap, Math.max(1.5, ...fin)) * 1.08;
  p.setRange(b.xs[0] - (b.xs[1] - b.xs[0]) / 2, b.xs[b.xs.length - 1] + (b.xs[1] - b.xs[0]) / 2, 0, top);
  p.clip();
  if (shade) p.band(shade[0], shade[1], { color: alpha(THEME.fg, 0.05) });
  const up = Float64Array.from(b.n, (c) => (c ? 1 + Math.sqrt(2 / c) : NaN)), dn = Float64Array.from(b.n, (c) => (c ? Math.max(0, 1 - Math.sqrt(2 / c)) : NaN));
  p.line(b.xs, up, { color: THEME.faint, dash: [3, 3], width: 1 }); p.line(b.xs, dn, { color: THEME.faint, dash: [3, 3], width: 1 });
  p.hline(1, { color: THEME.muted });
  p.line(b.xs, Float64Array.from(b.ys, (v) => Math.min(v, top)), { color: THEME.fg, width: 1.6 });
  p.scatter(b.xs.filter((_, i) => Number.isFinite(b.ys[i])), b.ys.filter(Number.isFinite).map((v) => Math.min(v, top)), { radius: 2 });
  p.unclip();
  let lastPx = -Infinity; // label clipped bins, skipping labels that would overlap the previous one
  b.ys.forEach((v, i) => { if (v > top && p.X(b.xs[i]) - lastPx > 30) { p.text(b.xs[i], top, v.toFixed(1), { align: "center", baseline: "bottom", color: THEME.muted }); lastPx = p.X(b.xs[i]); } });
  p.axes({ grid: true });
}

export default {
  id: "residuals", title: "Residual statistics", icon: "≈", description: "Are the residuals noise? Normalised-residual distribution and tails against N(0, 1), χ² against radius and against distance to the quasar images (PSF mismatch), azimuthal structure in the arc annulus, and residual autocorrelation in the lens region versus the empty sky.", defaultSize: "xl",
  available: (run) => run.features.image && (run.features.posterior || run.features.modelImage),
  create(ctx, state, panel) {
    Object.assign(state, { model: state.model || "best", boost: state.boost ?? true, dr: state.dr ?? 0.1, lag: state.lag ?? 8, logHist: state.logHist ?? true, annulus: state.annulus || [0.7, 1.3] });
    const body = el("div");
    panel.body.append(body);
    let plots = [], views = [];
    const addPlot = (grid, title, caption, opts) => {
      const wrap = el("div", { class: "plot-wrap" });
      const cap = el("div", { class: "muted small" }, caption);
      grid.append(el("div", { class: "plot-cell" }, el("h3", {}, title), wrap, cap));
      const p = new Plot(wrap, { margin: { l: 52, r: 14, t: 12, b: 38 }, ...opts });
      plots.push(p);
      return p;
    };

    const load = () => busy(panel, "computing residual statistics", async () => {
      plots.forEach((p) => p.destroy()); views.forEach((v) => v.destroy()); plots = []; views = [];
      body.innerHTML = "";
      const run = runOf(ctx, state);
      const [d, m, lmask] = await Promise.all([run.image(), run.defaultModel({ prefer: state.model }), run.likelihoodMask()]);
      const nx = d.cols, ny = d.rows, pix = run.pixScale ?? run.config?.data?.pix_scale ?? 1;
      const sigma = state.boost ? m.sigma : m.sigmaPlain;
      const mask = maskFrom(lmask);
      const params = m.params || Object.fromEntries(Object.entries((await run.bestFit("final").catch(() => ({ params: {} }))).params).filter(([, v]) => typeof v === "number"));
      const thetaE = params.lens_theta_E ?? run.paramSummary.find((r) => r.name === "lens_theta_E")?.median ?? 1;
      const xc = params.lens_center_x ?? 0, yc = params.lens_center_y ?? 0;
      const imgs = pointSourcePositions(params);

      // normalised residuals and per-pixel geometry (pixel centres as in the renderer)
      const ra0 = -(nx * pix) / 2 + pix / 2;
      const res = new Float64Array(nx * ny).fill(NaN), R = new Float64Array(nx * ny), Dps = new Float64Array(nx * ny), ang = new Float64Array(nx * ny);
      const idx = [];
      for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) {
        const i = r * nx + c, x = ra0 + c * pix, y = ra0 + r * pix;
        R[i] = Math.hypot(x - xc, y - yc) / thetaE;
        ang[i] = (Math.atan2(y - yc, x - xc) * 180) / Math.PI;
        Dps[i] = imgs.length ? Math.min(...imgs.map(([px, py]) => Math.hypot(x - px, y - py))) : Infinity;
        if (mask && !mask[i]) continue;
        const v = (d.data[i] - m.total[i]) / sigma[i];
        if (Number.isFinite(v)) { res[i] = v; idx.push(i); }
      }
      if (!idx.length) { body.append(el("div", { class: "error" }, "No pixels inside the likelihood mask.")); return; }
      const vals = Float64Array.from(idx, (i) => res[i]);
      const mo = moments(vals);
      const sortedV = Float64Array.from(vals).sort();
      let ks = 0;
      for (let k = 0; k < sortedV.length; k++) { const F = Phi(sortedV[k]); ks = Math.max(ks, Math.abs((k + 1) / sortedV.length - F), Math.abs(F - k / sortedV.length)); }
      let n3 = 0, n5 = 0;
      for (const v of vals) { if (Math.abs(v) > 3) n3++; if (Math.abs(v) > 5) n5++; }

      // regions: lens (r < 2 θ_E) against empty sky
      const lensReg = new Uint8Array(nx * ny), skyReg = new Uint8Array(nx * ny);
      for (const i of idx) { if (R[i] < 2) lensReg[i] = 1; else skyReg[i] = 1; }
      const regChi2 = (reg) => { let s = 0, c = 0; for (const i of idx) if (reg[i]) { s += res[i] * res[i]; c++; } return { red: c ? s / c : NaN, n: c }; };
      const cl = regChi2(lensReg), cs = regChi2(skyReg);
      const L = Math.max(2, Math.min(20, Math.round(state.lag)));
      const acL = autocorr(res, lensReg, nx, ny, L), acS = cs.n > 50 ? autocorr(res, skyReg, nx, ny, L) : null;

      let rMax = 0;
      for (const i of idx) if (R[i] > rMax) rMax = R[i];
      const byR = binnedChi2(res, R, idx, 0, Math.min(rMax, 4), Math.max(4, Math.round(Math.min(rMax, 4) / state.dr)));
      const dMax = Math.min(1.2, 6 * thetaE);
      const byD = imgs.length ? binnedChi2(res, Dps, idx, 0, dMax, Math.max(6, Math.round(dMax / pix))) : null;
      const [a0, a1] = state.annulus;
      const annIdx = idx.filter((i) => R[i] >= a0 && R[i] < a1);
      const nAz = 36, azS = new Float64Array(nAz), azS2 = new Float64Array(nAz), azC = new Float64Array(nAz);
      for (const i of annIdx) { const b = Math.min(nAz - 1, Math.floor(((ang[i] + 180) / 360) * nAz)); azS[b] += res[i]; azS2[b] += res[i] * res[i]; azC[b]++; }
      const azX = Float64Array.from(azS, (_, b) => -180 + (b + 0.5) * (360 / nAz));
      const azM = Float64Array.from(azS, (s, b) => (azC[b] ? s / azC[b] : NaN));
      const azE = Float64Array.from(azS, (s, b) => (azC[b] > 1 ? Math.sqrt(Math.max(0, azS2[b] / azC[b] - (s / azC[b]) ** 2) / azC[b]) : NaN));

      // ------------------------------------------------------------ cards
      const worst = [...byR.ys.keys()].filter((b) => Number.isFinite(byR.ys[b])).sort((a, b) => byR.ys[b] - byR.ys[a]).slice(0, 3);
      const rho1 = (ac) => ac.profile[1];
      const excess = acS ? rho1(acL) - rho1(acS) : null;
      const cards = el("div", { class: "cards" });
      cards.append(
        el("div", { class: "card" }, el("h3", {}, "(data − model) / σ", badge(state.boost && m.b ? `b = ${m.b.toFixed(3)}` : "plain σ")),
          el("div", { class: "big" }, `χ²_red = ${mo.chi2.toFixed(3)}`),
          el("div", { class: "muted small" }, `${mo.n} pixels · mean ${mo.mean >= 0 ? "+" : ""}${mo.mean.toFixed(3)} · std ${mo.std.toFixed(3)} · skewness ${mo.skew.toFixed(2)} · excess kurtosis ${mo.kurt.toFixed(2)} · KS distance to N(0, 1) ${ks.toFixed(3)}`),
          el("div", { class: "muted small" }, `|r| > 3: ${((100 * n3) / mo.n).toFixed(2)} % (Gaussian 0.27 %) · |r| > 5: ${n5} pixels (Gaussian ≈ ${(mo.n * 5.7e-7).toFixed(2)})`)),
        el("div", { class: "card" }, el("h3", {}, "Where the χ² is"),
          el("div", { class: "big" }, `${cl.red.toFixed(2)} vs ${cs.red.toFixed(2)}`),
          el("div", { class: "muted small" }, `χ²_red inside 2 θ_E (${cl.n} px) vs the empty sky beyond (${cs.n} px). Worst annuli: ${worst.map((b) => `${(byR.xs[b] - state.dr / 2).toFixed(1)}–${(byR.xs[b] + state.dr / 2).toFixed(1)} θ_E (${byR.ys[b].toFixed(1)})`).join(", ")}.`)),
        el("div", { class: "card" }, el("h3", {}, "Correlated residuals"),
          el("div", { class: "big" }, `ρ(1 px) = ${rho1(acL).toFixed(3)}${acS ? ` vs ${rho1(acS).toFixed(3)}` : ""}`),
          el("div", { class: "muted small" }, `Neighbour correlation of the residuals in the lens region${acS ? " vs the empty sky (the noise's own correlation)" : ""}. ${excess == null ? "" : excess > 3 / Math.sqrt(acL.n) ? `Excess ${excess.toFixed(3)} (> 3/√N): structure the model misses (or a PSF / source-resolution limit).` : "No significant excess over the sky: the residuals look like noise."}`)),
      );
      body.append(cards);

      const grid = el("div", { class: "plot-grid" });
      body.append(grid);

      // 1. histogram vs N(0,1)
      {
        const p = addPlot(grid, "Distribution", `Normalised residuals inside the likelihood mask; line: N(0, 1).${state.logHist ? " Log density shows the tails." : ""}`, { xlabel: "(data − model) / σ", ylabel: state.logHist ? "log₁₀ density" : "density" });
        const h = histogram(vals, { bins: 120, range: [-6, 6], density: true });
        const gx = Float64Array.from({ length: 241 }, (_, i) => -6 + i * 0.05), gy = Float64Array.from(gx, (x) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI));
        const tr = (v) => (state.logHist ? (v > 0 ? Math.log10(v) : NaN) : v);
        p.render = (q) => {
          const ys = Float64Array.from(h.counts, tr), gys = Float64Array.from(gy, tr);
          const fin = [...ys, ...gys].filter(Number.isFinite);
          const yMin = state.logHist ? Math.max(Math.min(...fin), -6) : 0;
          q.setRange(-6, 6, yMin, Math.max(...fin) + (state.logHist ? 0.2 : 0.02));
          q.clip();
          if (state.logHist) { const cx = Float64Array.from(h.counts, (_, i) => (h.edges[i] + h.edges[i + 1]) / 2); q.line(cx, ys, { color: series(1), width: 2 }); }
          else q.bars(h.edges, ys, { color: alpha(THEME.fg, 0.25) });
          q.line(gx, gys, { color: THEME.fg, width: 1.2, dash: [4, 3] });
          q.unclip(); q.axes({ grid: true });
        };
      }
      // 2. Q-Q plot
      {
        const p = addPlot(grid, "Q–Q against N(0, 1)", "Ordered residuals against Gaussian quantiles; heavy tails bend away from the diagonal.", { xlabel: "N(0, 1) quantile", ylabel: "residual quantile" });
        const N = sortedV.length, K = Math.min(1500, N);
        const qx = new Float64Array(K), qy = new Float64Array(K);
        for (let j = 0; j < K; j++) { const k = Math.round((j / (K - 1)) * (N - 1)); qx[j] = PhiInv((k + 0.5) / N); qy[j] = sortedV[k]; }
        p.render = (q) => {
          const lim = Math.max(4.5, Math.min(12, Math.max(Math.abs(qy[0]), Math.abs(qy[K - 1])) * 1.05));
          q.setRange(-4.6, 4.6, -lim, lim); q.clip();
          q.line([-5, 5], [-5, 5], { color: THEME.muted, dash: [4, 3], width: 1 });
          q.scatter(qx, Float64Array.from(qy, (v) => Math.max(-lim, Math.min(lim, v))), { radius: 1.6, alpha: 0.7 });
          q.unclip(); q.axes({ grid: true });
        };
      }
      // 3. chi2 vs radius
      {
        const p = addPlot(grid, "χ²_red against radius", `Annuli of ${state.dr} θ_E around the lens centre (θ_E = ${thetaE.toFixed(3)}″); dashed: 1 ± √(2/n). Shaded: the arc annulus.`, { xlabel: "r / θ_E", ylabel: "χ²_red" });
        p.render = (q) => chi2Plot(q, byR, { shade: state.annulus });
      }
      // 4. chi2 vs distance to the nearest image
      if (byD) {
        const p = addPlot(grid, "χ²_red against distance to the nearest image", "One-pixel bins around the point-source images: a χ² bump within a few PSF FWHM is the signature of PSF mismatch (what b absorbs).", { xlabel: "distance to nearest image [arcsec]", ylabel: "χ²_red" });
        p.render = (q) => chi2Plot(q, byD, {});
      }
      // 5. azimuthal residual in the arc annulus
      {
        const p = addPlot(grid, `Mean residual around the arc (${a0}–${a1} θ_E)`, "Mean (data − model)/σ in 10° sectors, ± its standard error; images marked. Coherent swings mean the arc's surface brightness or position is mis-modelled there.", { xlabel: "angle from +x [deg]", ylabel: "mean residual" });
        const imgAng = imgs.map(([x, y, lab]) => [(Math.atan2(y - yc, x - xc) * 180) / Math.PI, lab]);
        p.render = (q) => {
          const fin = [...azM].map((v, i) => [v - (azE[i] || 0), v + (azE[i] || 0)]).flat().filter(Number.isFinite);
          const lim = Math.max(0.3, ...fin.map(Math.abs)) * 1.1;
          q.setRange(-180, 180, -lim, lim); q.clip();
          q.hline(0, { color: THEME.muted });
          for (const [a, lab] of imgAng) { q.vline(a, { color: THEME.faint }); q.text(a, lim, ` ${lab}`, { color: THEME.muted }); }
          azX.forEach((x, i) => { if (Number.isFinite(azE[i])) q.line([x, x], [azM[i] - azE[i], azM[i] + azE[i]], { color: THEME.muted, width: 1 }); });
          q.line(azX, azM, { color: THEME.fg, width: 1.6 });
          q.unclip(); q.axes({ grid: true });
        };
      }
      // 6. autocorrelation profile + map
      {
        const p = addPlot(grid, "Residual autocorrelation", `Mean correlation at lag |δ| (pixels): lens region${acS ? " vs empty sky" : ""}; band ±2/√N for white noise.`, { xlabel: "lag [pixels]", ylabel: "ρ" });
        const ks2 = Float64Array.from({ length: L }, (_, k) => k + 1);
        p.render = (q) => {
          const ys = [...acL.profile.slice(1), ...(acS ? acS.profile.slice(1) : [])].filter(Number.isFinite);
          const hi = Math.max(0.1, ...ys) * 1.15, lo = Math.min(-0.05, ...ys) * 1.15;
          q.setRange(0.5, L + 0.5, lo, hi); q.clip();
          const band = 2 / Math.sqrt(acL.n);
          q.fill([0.5, L + 0.5], [band, band], { color: alpha(THEME.fg, 0.06), baseline: -band });
          q.hline(0, { color: THEME.muted });
          q.line(ks2, acL.profile.slice(1), { color: series(0), width: 2 }); q.scatter(ks2, acL.profile.slice(1), { color: series(0), radius: 2.5 });
          if (acS) { q.line(ks2, acS.profile.slice(1), { color: series(1), width: 2, dash: [5, 3] }); q.scatter(ks2, acS.profile.slice(1), { color: series(1), radius: 2.5 }); }
          q.unclip(); q.axes({ grid: true });
          q.legend([{ color: series(0), label: "lens region (< 2 θ_E)" }, ...(acS ? [{ color: series(1), label: "empty sky" }] : [])], { x: q.rect.x + q.rect.w - 150 });
        };
        const cell = el("div", { class: "view-cell" });
        grid.append(el("div", { class: "plot-cell" }, el("h3", {}, "Autocorrelation map (lens region)"), cell, el("div", { class: "muted small" }, "ρ(δx, δy) of the residuals; the zero lag (≡ 1) is left blank. Elongated structure points to a direction-dependent mismatch (PSF wings, arc thickness).")));
        const map = Float64Array.from(acL.rho);
        map[L * acL.W + L] = NaN;
        const v = new ImageView(cell, { cmap: "RdBu_r", stretch: "linear", symmetric: true, pmin: 0.5, pmax: 99.5, label: "ρ", units: "lag [pixels]" });
        v.setImage({ data: map, rows: acL.W, cols: acL.W, extent: [-L - 0.5, L + 0.5, -L - 0.5, L + 0.5] });
        views.push(v);
      }
      plots.forEach((p) => p.draw());
      panel.setStatus(`${m.label}${m.note ? ` · ${m.note}` : ""} · ${state.boost ? (m.b ? `σ_eff with b = ${m.b.toFixed(3)} (${m.bSource})` : "b = 0") : "plain noise map"} · ${mo.n} px`);
      settings();
    });

    const settings = () => {
      const run = runOf(ctx, state);
      panel.settings.replaceChildren(
        runRow(ctx, state, load) || "",
        section("Model",
          row("Model", select([{ value: "best", label: "best log-L posterior draw" }, { value: "map", label: "MAP (model_image.fits)" }], state.model, (v) => { state.model = v; load(); })),
          checkbox("PSF-error term b in σ", state.boost, (v) => { state.boost = v; load(); }),
          run.needsKey ? el("div", { class: "muted small" }, "Blinded without key: the posterior draw cannot be rendered, the MAP is used.") : "",
        ),
        section("Binning",
          row("Annulus width", number(state.dr, (v) => { state.dr = Math.max(0.02, v || 0.1); load(); }, { step: 0.05, width: 70 }), el("span", { class: "muted small" }, "θ_E")),
          row("Arc annulus", number(state.annulus[0], (v) => { state.annulus = [v ?? 0.7, state.annulus[1]]; load(); }, { step: 0.05, width: 60 }), number(state.annulus[1], (v) => { state.annulus = [state.annulus[0], v ?? 1.3]; load(); }, { step: 0.05, width: 60 }), el("span", { class: "muted small" }, "θ_E")),
          row("Max lag", number(state.lag, (v) => { state.lag = v || 8; load(); }, { min: 2, max: 20, step: 1, width: 60 }), el("span", { class: "muted small" }, "px")),
          checkbox("Log density in the histogram", state.logHist, (v) => { state.logHist = v; load(); }),
        ),
        section("Export", el("div", { class: "ctl-row" }, button("Export plots (PNG)", () => plots.forEach((p, i) => downloadPNG(p.toPNG(), `residuals_${i + 1}.png`)), { small: true }))),
      );
    };
    settings();
    load();
    return { destroy() { plots.forEach((p) => p.destroy()); views.forEach((v) => v.destroy()); }, state: () => state, refresh: load };
  },
};
