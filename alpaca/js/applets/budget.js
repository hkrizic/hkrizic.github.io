// What limits D_Δt: a linear variance decomposition of one posterior quantity (D_Δt by default, any sampled
// scalar on request) over groups of the other parameters. For a group G, R²_G is the share of the target's
// posterior variance that its parameters explain linearly (from the posterior correlation matrix), so
// σ·√(1 − R²_G) is the width the target would keep if G were known exactly; the unique share
// R²_all − R²_(all but G) is what only G explains. The pixelated source enters through per-draw summaries
// (flux, centroid, size). Blinding-safe: absolute blinding is a constant shift (fractional a constant scale),
// which leaves correlations and R² unchanged; fractional precisions need the true values (key).
import { el, section, row, select, checkbox, button, downloadPNG, badge, table } from "../ui/widgets.js";
import { Plot } from "../ui/plot.js";
import { runOf, runRow, busy, errorBox } from "./common.js";
import { paramGroup, GROUP_ORDER } from "../core/run.js";
import { THEME, alpha } from "../ui/theme.js";

function cholesky(A, p) {
  const Lm = new Float64Array(p * p);
  for (let i = 0; i < p; i++) for (let j = 0; j <= i; j++) {
    let s = A[i * p + j];
    for (let k = 0; k < j; k++) s -= Lm[i * p + k] * Lm[j * p + k];
    if (i === j) { if (!(s > 0)) return null; Lm[i * p + i] = Math.sqrt(s); } else Lm[i * p + j] = s / Lm[j * p + j];
  }
  return Lm;
}

function cholSolve(Lm, p, b) {
  const y = new Float64Array(p), x = new Float64Array(p);
  for (let i = 0; i < p; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= Lm[i * p + k] * y[k]; y[i] = s / Lm[i * p + i]; }
  for (let i = p - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < p; k++) s -= Lm[k * p + i] * x[k]; x[i] = s / Lm[i * p + i]; }
  return x;
}

// Standardised regression of the target on predictors S (indices into the correlation matrix C, size P):
// coefficients β = C_SS⁻¹ r_S and R² = r_Sᵀ β, with a small ridge against collinear parameters.
function regress(C, r, P, S) {
  const p = S.length;
  if (!p) return { r2: 0, beta: new Float64Array(0) };
  for (let ridge = 1e-8; ridge < 1; ridge *= 10) {
    const A = new Float64Array(p * p);
    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) A[i * p + j] = C[S[i] * P + S[j]] + (i === j ? ridge : 0);
    const Lm = cholesky(A, p);
    if (!Lm) continue;
    const b = Float64Array.from(S, (k) => r[k]);
    const beta = cholSolve(Lm, p, b);
    let r2 = 0;
    for (let i = 0; i < p; i++) r2 += b[i] * beta[i];
    return { r2: Math.min(1, Math.max(0, r2)), beta };
  }
  return { r2: NaN, beta: new Float64Array(p) };
}

// Fractional precision the measured delays alone give D_Δt for a fixed lens model (D_Δt ∝ Δt / Δφ):
// 1 / √(Δtᵀ C⁻¹ Δt) with the config's delays and covariance (diagonal from the quoted errors without one).
function timeDelayFloor(lik) {
  const td = lik?.use_time_delays ? lik.time_delays : null;
  const d = td?.delays ? Object.values(td.delays) : [];
  if (!d.length) return null;
  const w = Float64Array.from(d, (v) => (Array.isArray(v) ? v[0] : v));
  const k = w.length, C = new Float64Array(k * k);
  if (Array.isArray(td.covariance) && td.covariance.length === k) td.covariance.forEach((r, i) => r.forEach((v, j) => { C[i * k + j] = v; }));
  else d.forEach((v, i) => { C[i * k + i] = (Array.isArray(v) ? v[1] : NaN) ** 2; });
  const Lm = cholesky(C, k);
  if (!Lm) return null;
  const x = cholSolve(Lm, k, w);
  let I = 0;
  for (let i = 0; i < k; i++) I += w[i] * x[i];
  return I > 0 ? { frac: 1 / Math.sqrt(I), n: k } : null;
}

function standardise(col) {
  const n = col.length;
  let m = 0; for (const v of col) m += v; m /= n;
  let s = 0; for (const v of col) s += (v - m) ** 2;
  s = Math.sqrt(s / Math.max(1, n - 1));
  return { m, s, z: s > 0 && Number.isFinite(s) ? Float64Array.from(col, (v) => (v - m) / s) : null };
}

// Per-draw summaries of the pixelated source: total flux, flux-weighted centroid and rms size (grid pixels).
function sourceSummaries(post) {
  const nPix = post.pixelIdx.length, g = Math.round(Math.sqrt(nPix)), nP = post.nParams;
  const out = { "source flux": new Float64Array(post.nSamples), "source centroid x": new Float64Array(post.nSamples), "source centroid y": new Float64Array(post.nSamples), "source size": new Float64Array(post.nSamples) };
  for (let i = 0; i < post.nSamples; i++) {
    let f = 0, sx = 0, sy = 0, sw = 0;
    for (let k = 0; k < nPix; k++) { const v = post.samples[i * nP + post.pixelIdx[k]]; f += v; const w = Math.max(0, v); sx += w * (k % g); sy += w * Math.floor(k / g); sw += w; }
    const cx = sw ? sx / sw : 0, cy = sw ? sy / sw : 0;
    let s2 = 0;
    for (let k = 0; k < nPix; k++) { const w = Math.max(0, post.samples[i * nP + post.pixelIdx[k]]); s2 += w * ((k % g - cx) ** 2 + (Math.floor(k / g) - cy) ** 2); }
    out["source flux"][i] = f; out["source centroid x"][i] = cx; out["source centroid y"][i] = cy; out["source size"][i] = sw ? Math.sqrt(s2 / sw) : 0;
  }
  return out;
}

export default {
  id: "budget", title: "What limits D_Δt", icon: "σ", description: "Precision budget of D_Δt (or any parameter): how much of its posterior width each parameter group explains, the width left if that group were known exactly, and the single parameters that matter most. Blinding-safe (shifts do not change widths or correlations).", defaultSize: "l",
  available: (run) => run.features.posterior,
  create(ctx, state, panel) {
    Object.assign(state, { source: state.source ?? true });
    const body = el("div");
    panel.body.append(body);
    let plots = [];
    let srcCache = null;

    const load = () => busy(panel, "decomposing the posterior variance", async () => {
      plots.forEach((p) => p.destroy()); plots = [];
      body.innerHTML = "";
      const run = runOf(ctx, state);
      const src = state.src && run.posteriorSources().some((s) => s.value === state.src) ? state.src : run.massSheetSource;
      const post = await run.posterior(src);
      const names = post.scalarNames.filter((nm) => post.columns[nm]);
      const target = names.includes(state.target) ? state.target : names.includes("D_dt") ? "D_dt" : names.includes("lens_gamma") ? "lens_gamma" : names[0];
      state.target = target;
      settings(names);

      // predictors: every other varying scalar, plus the source summaries
      const cols = names.filter((nm) => nm !== target).map((nm) => ({ name: nm, group: paramGroup(nm), data: post.columns[nm] }));
      if (state.source && post.pixelIdx.length) {
        if (!srcCache || srcCache.post !== post) srcCache = { post, s: sourceSummaries(post) };
        for (const [nm, data] of Object.entries(srcCache.s)) cols.push({ name: nm, group: "Source light", data });
      }
      const preds = cols.map((c) => ({ ...c, ...standardise(c.data) })).filter((c) => c.z);
      const ty = standardise(post.columns[target]);
      if (!ty.z) { body.append(errorBox(`${target} does not vary in this posterior.`)); return; }
      const P = preds.length, n = ty.z.length;
      const C = new Float64Array(P * P), r = new Float64Array(P);
      for (let a = 0; a < P; a++) {
        const za = preds[a].z;
        let s = 0; for (let i = 0; i < n; i++) s += za[i] * ty.z[i]; r[a] = s / (n - 1);
        for (let b = 0; b <= a; b++) { const zb = preds[b].z; let t = 0; for (let i = 0; i < n; i++) t += za[i] * zb[i]; C[a * P + b] = C[b * P + a] = t / (n - 1); }
      }
      const all = [...Array(P).keys()];
      const full = regress(C, r, P, all);
      const groups = GROUP_ORDER.filter((g) => preds.some((p) => p.group === g)).map((g) => {
        const S = all.filter((k) => preds[k].group === g);
        const alone = regress(C, r, P, S).r2;
        const without = regress(C, r, P, all.filter((k) => preds[k].group !== g)).r2;
        return { name: g, size: S.length, alone, unique: Math.max(0, full.r2 - without) };
      }).sort((a, b) => b.alone - a.alone);
      const single = preds.map((p, k) => ({ ...p, rho: r[k], alone: r[k] * r[k], unique: Math.max(0, full.r2 - regress(C, r, P, all.filter((j) => j !== k)).r2) }))
        .sort((a, b) => b.alone - a.alone || b.unique - a.unique).slice(0, 15);

      // widths: blinded targets show only widths (absolute blinding: the stored σ is the true σ)
      const blindedT = post.blindedColumns.includes(target);
      const mode = post.blinding?.mode || run.blinding?.mode || "absolute";
      const trueT = await run.trueColumn(post, target);
      const tStats = trueT ? standardise(trueT) : null;
      const sigma = tStats ? tStats.s : !blindedT || mode === "absolute" ? ty.s : null;
      const frac = tStats && tStats.m ? tStats.s / Math.abs(tStats.m) : null;
      const unit = target === "D_dt" ? " Mpc" : "";
      const w = (r2) => Math.sqrt(Math.max(0, 1 - r2));
      const fmtW = (r2) => (frac != null ? `${(100 * frac * w(r2)).toFixed(2)} %` : sigma != null ? `${(sigma * w(r2)).toPrecision(3)}${unit}` : `${(100 * w(r2)).toFixed(0)} % of σ`);
      // the time delays as a pseudo-group: their share of the variance is (floor / precision)², not a regression
      const td = target === "D_dt" && frac != null ? timeDelayFloor(run.config?.likelihood) : null;
      const tdShare = td ? Math.min(1, (td.frac / frac) ** 2) : null;
      if (td) groups.unshift({ name: "Time delays (measured)", size: td.n, alone: tdShare, unique: tdShare, td: true });

      const cards = el("div", { class: "cards" });
      cards.append(
        el("div", { class: "card" }, el("h3", {}, `Width of ${target}`, blindedT ? badge("blinded: width only", "warn") : null),
          el("div", { class: "big" }, frac != null ? `${(100 * frac).toFixed(2)} %` : sigma != null ? `σ = ${sigma.toPrecision(3)}${unit}` : "–"),
          el("div", { class: "muted small" }, `${frac != null && sigma != null ? `σ = ${sigma.toPrecision(3)}${unit}. ` : ""}${target === "D_dt" ? "H₀ ∝ 1/D_Δt, so the fractional precisions carry over to H₀ (lens model alone, before the mass sheet). " : ""}${n} draws, ${P} predictors.${target === "D_dt" && frac == null ? " The time-delay floor needs the true D_Δt (key)." : ""}`)),
        td ? el("div", { class: "card" }, el("h3", {}, "Time delays vs lens model"),
          el("div", { class: "big" }, `${(100 * td.frac).toFixed(2)} % ⊕ ${(100 * frac * w(tdShare)).toFixed(2)} %`),
          el("div", { class: "muted small" }, `The ${td.n} measured delays (config, with covariance) alone give ${(100 * td.frac).toFixed(2)} % for a fixed lens model; the lens model adds ${(100 * frac * w(tdShare)).toFixed(2)} % in quadrature to reach ${(100 * frac).toFixed(2)} %. Better delays shrink the first term, better imaging only the second.`)) : "",
        el("div", { class: "card" }, el("h3", {}, "Explained by the lens model (linear)"),
          el("div", { class: "big" }, `R² = ${full.r2.toFixed(3)}`),
          el("div", { class: "muted small" }, `With every other sampled parameter known exactly the width would drop to ${fmtW(full.r2)}${td ? ` (time-delay floor ${(100 * td.frac).toFixed(2)} %: the remainder is the delay measurement)` : ""}. Also unexplained: non-linear dependence${state.source ? " and source detail beyond the flux / centroid / size summaries" : " and the source pixels (summaries off)"}.`)),
        el("div", { class: "card" }, el("h3", {}, "Dominant lens-model group"),
          el("div", { class: "big" }, groups.find((g) => !g.td)?.name || "–"),
          el("div", { class: "muted small" }, (() => { const g = groups.find((x) => !x.td); return g ? `Explains ${(100 * g.alone).toFixed(1)} % of the variance on its own (${(100 * g.unique).toFixed(1)} % that no other group carries); knowing it would leave ${fmtW(g.alone)}.` : ""; })())),
      );
      body.append(cards);

      const grid = el("div", { class: "plot-grid" });
      body.append(grid);
      // 1. width left if a group were known
      {
        const wrap = el("div", { class: "plot-wrap" });
        grid.append(el("div", { class: "plot-cell" }, el("h3", {}, "Width left if a group were known exactly"), wrap, el("div", { class: "muted small" }, `Grey: the current width. Black: σ √(1 − R²_G) with the group's parameters fixed; the label gives the reduction (and, in brackets, the % of variance only that group explains).${td ? " The time-delay row is the width left with exact delays, √(σ² − σ_Δt²), from the measured delays rather than a regression." : ""}`)));
        const p = new Plot(wrap, { margin: { l: 150, r: 92, t: 10, b: 34 }, xlabel: frac != null ? `${target} precision [%]` : sigma != null ? `σ(${target})${unit}` : "fraction of the current σ" });
        plots.push(p);
        const scale = frac != null ? 100 * frac : sigma ?? 1;
        p.render = (q) => {
          const K = groups.length;
          q.setRange(0, scale * 1.02, 0, K);
          q.axes({ yticks: false, grid: true });
          groups.forEach((g, i) => {
            const y0 = K - i - 0.8, y1 = K - i - 0.2, X0 = q.X(0), Y0 = q.Y(y1), H = q.Y(y0) - q.Y(y1);
            q.ctx.save();
            q.ctx.fillStyle = alpha("#8c8c8c", 0.25); q.ctx.fillRect(X0, Y0, q.X(scale) - X0, H);
            q.ctx.fillStyle = THEME.fg; q.ctx.fillRect(X0, Y0 + H * 0.2, q.X(scale * w(g.alone)) - X0, H * 0.6);
            q.ctx.restore();
            q.text(q.rect.x - 8, (Y0 + Y0 + H) / 2, `${g.name} (${g.size})`, { px: true, align: "right", baseline: "middle" });
            q.text(q.rect.x + q.rect.w + 6, (Y0 + Y0 + H) / 2, `−${(100 * (1 - w(g.alone))).toFixed(1)} % (${(100 * g.unique).toFixed(0)})`, { px: true, baseline: "middle", color: THEME.muted });
          });
        };
      }
      // 2. target vs its best linear prediction
      {
        const wrap = el("div", { class: "plot-wrap" });
        grid.append(el("div", { class: "plot-cell" }, el("h3", {}, "Linearity check"), wrap, el("div", { class: "muted small" }, `${target} (deviation from its mean) against the best linear combination of all predictors. Curvature or fans mean the linear budget understates a parameter's role.`)));
        const p = new Plot(wrap, { xlabel: `linear prediction of Δ${target}`, ylabel: `Δ${target}` });
        plots.push(p);
        const yhat = new Float64Array(n);
        full.beta.forEach((b, k) => { const z = preds[k].z; for (let i = 0; i < n; i++) yhat[i] += b * z[i]; });
        const sc = sigma ?? 1;
        const xs = Float64Array.from(yhat, (v) => v * sc), ys = Float64Array.from(ty.z, (v) => v * sc);
        p.render = (q) => {
          let lo = Infinity, hi = -Infinity;
          for (const v of [...xs, ...ys]) { if (v < lo) lo = v; if (v > hi) hi = v; }
          q.setRange(lo, hi, lo, hi); q.clip();
          q.line([lo, hi], [lo, hi], { color: THEME.muted, dash: [4, 3], width: 1 });
          q.scatter(xs, ys, { radius: 1.4, alpha: 0.35 });
          q.unclip(); q.axes({ grid: true });
        };
      }
      plots.forEach((p) => p.draw());

      const grpRows = groups.map((g) => [g.name, String(g.size), g.alone.toFixed(3), g.unique.toFixed(3), fmtW(g.alone)]);
      const parRows = single.map((s) => [el("code", {}, s.name), s.group, `${s.rho >= 0 ? "+" : ""}${s.rho.toFixed(2)}`, s.alone.toFixed(3), s.unique.toFixed(3), fmtW(s.alone)]);
      body.append(el("div", { class: "cards" },
        el("div", { class: "card" }, el("h3", {}, "Groups"), table(["group", "n", "R² alone", "R² unique", "width if fixed"], grpRows, { class: "wrap" })),
        el("div", { class: "card" }, el("h3", {}, "Strongest single parameters"), table(["parameter", "group", "ρ", "R² alone", "R² unique", "width if fixed"], parRows, { class: "wrap" }),
          el("div", { class: "muted small" }, "ρ: posterior correlation with the target. R² unique: the drop in R² when the parameter is removed from the full regression; small for parameters that share their information with others (e.g. image positions and the lens centre)."))));
      panel.setStatus(`${target} · ${post.src === "samples" ? "lensing posterior" : post.src} · linear, Gaussian approximation`);
    });

    const settings = (names = []) => {
      const run = runOf(ctx, state);
      const sources = run.posteriorSources();
      panel.settings.replaceChildren(
        runRow(ctx, state, () => { srcCache = null; load(); }) || "",
        sources.length > 1 ? section("Posterior", row("Set", select(sources, state.src || run.massSheetSource, (v) => { state.src = v; load(); }))) : "",
        section("Target",
          names.length ? row("Explain", select(names.map((nm) => ({ value: nm, label: nm })), state.target, (v) => { state.target = v; load(); })) : "",
          checkbox("Include source summaries (flux, centroid, size)", state.source, (v) => { state.source = v; load(); }),
        ),
        section("Export", el("div", { class: "ctl-row" }, button("Export plots (PNG)", () => plots.forEach((p, i) => downloadPNG(p.toPNG(), `budget_${i + 1}.png`)), { small: true }))),
      );
    };
    settings();
    load();
    return { destroy() { plots.forEach((p) => p.destroy()); }, state: () => state, refresh: load };
  },
};
