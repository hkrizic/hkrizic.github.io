// Mass-sheet degeneracy: the internal mass sheet lambda_int of kinematics runs (alpaca.kinematics,
// large-core internal MST: D_dt_physical = D_dt / (lambda_int (1 - kappa_ext)), sigma_v^2 scales as
// lambda_int (1 - kappa_ext)), its degeneracies, the H0 error budget and a what-if for external
// lambda_int / kappa_ext priors. Blinded runs: lambda_int, D_dt and gamma are shown only as deviations;
// H0 widths and the what-if use the true values with the key and are displayed relative to their mean.
import { el, section, row, select, number, checkbox, button, downloadPNG, badge, kv, table } from "../ui/widgets.js";
import { Plot } from "../ui/plot.js";
import { runOf, runRow, otherRun, busy, unblindUI, fmtNum } from "./common.js";
import { H0FromDdt } from "../physics/cosmology.js";
import { histogram, kde1d, kde2d, massLevels, summarize, pearson, rng, resampleIndex, quantileSorted } from "../core/stats.js";
import { marchingSquares } from "../core/contours.js";
import { series, alpha, THEME } from "../ui/theme.js";

const SEED = 20261009;
const N_KAPPA = 64; // kappa_ext draws per posterior draw in the what-if weights
const KIN_LABEL = { aperture: "aperture velocity dispersion", resolved: "resolved IFU V_rms" };

const frac = (arr) => { const s = summarize(arr); return s.std / Math.abs(s.mean); };
const pct = (v, d = 2) => (v == null || !Number.isFinite(v) ? "–" : (100 * v).toFixed(d) + " %");
const pm = (s, d) => `${s.median.toFixed(d)} +${(s.hi68 - s.median).toFixed(d)} −${(s.median - s.lo68).toFixed(d)}`;
const digits = (s) => Math.max(0, Math.min(6, 2 - Math.floor(Math.log10(Math.max(1e-12, s.hi68 - s.lo68)))));

// kappa_ext draws for the what-if (truncated below 0.99)
function kappaSampler(kx, run, R) {
  if (kx.mode === "fixed") return () => kx.mu;
  if (kx.mode === "gauss") return () => { for (let t = 0; t < 100; t++) { const k = kx.mu + kx.sigma * R.normal(); if (k < 0.99) return k; } return kx.mu; };
  return () => run;
}

function lambdaSampler(lp, base, R) {
  if (lp.mode === "gauss") return () => { for (let t = 0; t < 100; t++) { const l = lp.mu + lp.sigma * R.normal(); if (l > 0) return l; } return lp.mu; };
  if (lp.mode === "uniform") return () => lp.lo + (lp.hi - lp.lo) * R.uniform();
  return () => base;
}

function describeWhatIf(s, a) {
  const k = s.kext.mode === "gauss" ? `κ_ext ~ N(${s.kext.mu}, ${s.kext.sigma})` : s.kext.mode === "fixed" ? `κ_ext = ${s.kext.mu}` : null;
  const l = a.ms.sampleLambda && a.ms.kinematics ? null : s.lamPrior.mode === "gauss" ? `λ_int ~ N(${s.lamPrior.mu}, ${s.lamPrior.sigma})` : s.lamPrior.mode === "uniform" ? `λ_int ~ U[${s.lamPrior.lo}, ${s.lamPrior.hi}]` : null;
  return [l, k].filter(Boolean).join(", ");
}

// H0 under the what-if priors (true values). Kinematics with a sampled lambda_int constrain the
// product P = lambda_int (1 - kappa_ext) and H0 is proportional to P per draw, so a new kappa_ext prior
// only reweights the draws by the prior it induces on P: E_k[ 1{a <= P/(1-k) <= b} / (1-k) ] for the
// uniform lambda_int prior on [a, b]. Without a sampled lambda_int, both priors multiply the lens-model H0.
function whatIf(a, s) {
  const ms = a.ms, R = rng(SEED);
  const n = a.h0Model.length;
  const desc = describeWhatIf(s, a);
  if (!desc) return null;
  const drawK = kappaSampler(s.kext, ms.kappaExt, R);
  if (ms.kinematics && ms.sampleLambda) {
    if (!a.lamTot || s.kext.mode === "run") return null;
    const [lo, hi] = ms.lambdaRange;
    const w = new Float64Array(n);
    let inside = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < N_KAPPA; j++) { const k = drawK(); const l = a.lamTot[i] / (1 - k); if (l >= lo && l <= hi) { w[i] += 1 / (1 - k); inside++; } }
    }
    const idx = resampleIndex(w, n);
    if (idx[0] < 0) return { h0: null, desc, accept: 0, kind: "reweight" };
    let ess = 0, sw = 0; for (const v of w) { sw += v; ess += v * v; }
    return { h0: Float64Array.from(idx, (i) => a.h0Phys[i]), desc, accept: inside / (n * N_KAPPA), ess: (sw * sw) / ess, kind: "reweight" };
  }
  const drawL = lambdaSampler(s.lamPrior, ms.kinematics ? ms.lambdaFixed : 1, R);
  const lam = new Float64Array(n), kap = new Float64Array(n), h0 = new Float64Array(n);
  for (let i = 0; i < n; i++) { lam[i] = drawL(); kap[i] = drawK(); h0[i] = a.h0Model[i] * lam[i] * (1 - kap[i]); }
  return { h0, lam, kap, desc, kind: "propagate", caveat: ms.kinematics ? "The kinematic likelihood of this run assumed λ_int (1 − κ_ext) = " + fmtNum(ms.lambdaFixed * (1 - ms.kappaExt), 4) + "; changing it here ignores how the kinematics would have responded." : null };
}

async function analyse(run, src, s, cosmo) {
  const ms = run.massSheet;
  const post = await run.posterior(src);
  const a = { run, ms, post, src: post.src, mode: post.blinding?.mode || run.blinding?.mode || "absolute" };
  a.hasLam = !!post.columns.kin_lambda_int;
  a.lamShown = a.hasLam ? post.columns.kin_lambda_int : null;
  a.lamBlinded = post.blindedColumns.includes("kin_lambda_int");
  a.lamTrue = a.hasLam ? await run.trueColumn(post, "kin_lambda_int") : null;
  a.ddtBlinded = post.blindedColumns.includes("D_dt");
  a.blinded = a.ddtBlinded || a.lamBlinded;
  const ddt = post.columns.D_dt ? await run.trueColumn(post, "D_dt") : null;
  a.hasDdt = !!post.columns.D_dt;
  a.hasTrue = !!ddt && (!(ms.kinematics && ms.sampleLambda) || !!a.lamTrue);
  if (ddt) {
    const H = (d) => (cosmo.hasZ ? H0FromDdt(d, cosmo.zl, cosmo.zs, cosmo.Om) : 1e5 / d);
    a.h0Model = Float64Array.from(ddt, H);
    if (ms.kinematics && (a.lamTrue || !ms.sampleLambda)) {
      a.lamTot = a.lamTrue ? Float64Array.from(a.lamTrue, (l) => l * (1 - ms.kappaExt)) : new Float64Array(ddt.length).fill(ms.lambdaFixed * (1 - ms.kappaExt));
      a.h0Phys = Float64Array.from(a.h0Model, (h, i) => h * a.lamTot[i]);
    }
    if (a.hasTrue) a.what = whatIf(a, s);
  }
  if (a.lamTrue) {
    const [lo, hi] = ms.lambdaRange, w = hi - lo;
    let nl = 0, nh = 0;
    for (const l of a.lamTrue) { if (l < lo + 0.02 * w) nl++; if (l > hi - 0.02 * w) nh++; }
    a.edge = { lo: nl / a.lamTrue.length, hi: nh / a.lamTrue.length };
  }
  // strongest correlations with lambda_int (or D_dt without a sampled sheet); offsets do not change them
  const target = a.hasLam ? "kin_lambda_int" : a.hasDdt ? "D_dt" : null;
  a.corrTarget = target;
  if (target) {
    const t = post.columns[target];
    a.corr = post.scalarNames.filter((n) => n !== target && !/^source_pixels_/.test(n)).map((n) => {
      const c = post.columns[n]; let lo = Infinity, hi = -Infinity; for (const v of c) { if (v < lo) lo = v; if (v > hi) hi = v; }
      return hi > lo ? [n, pearson(t, c)] : null;
    }).filter(Boolean).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 8);
  }
  return a;
}

// What to show for an H0 sample set: absolute (unblinded, redshifts known) or relative to its mean.
function displayH0(arr, a, cosmo) {
  if (!arr) return null;
  if (a.blinded) return a.run.blindDerived(arr).values;
  if (!cosmo.hasZ) { const m = summarize(arr).mean; return Float64Array.from(arr, (v) => (v - m) / m); }
  return arr;
}

function contourPolys(x, y, rx, ry, n = 64) {
  const g = kde2d(x, y, { n, rangeX: rx, rangeY: ry });
  return massLevels(g.grid, [0.95, 0.68], g.dx * g.dy).map((lv) => marchingSquares(g.grid, g.n, g.n, lv).map((l) => l.map(([c, r]) => [g.x0 + c * g.dx, g.y0 + r * g.dy])));
}

function rangeOf(arrs, padFrac = 0.06) {
  let lo = Infinity, hi = -Infinity;
  for (const a of arrs) { if (!a) continue; const s = summarize(a); lo = Math.min(lo, s.lo95 - 0.6 * (s.median - s.lo95)); hi = Math.max(hi, s.hi95 + 0.6 * (s.hi95 - s.median)); }
  if (!(hi > lo)) { lo -= 1; hi += 1; }
  const p = (hi - lo) * padFrac;
  return [lo - p, hi + p];
}

export default {
  id: "msd", title: "Mass-sheet degeneracy", icon: "λ", description: "Internal mass sheet λ_int of kinematics runs: posterior vs prior, degeneracies with γ and D_Δt, the MST family of the convergence profile, the H₀ error budget, and a what-if for external λ_int / κ_ext priors.", defaultSize: "l",
  available: (run) => run.features.posterior,
  create(ctx, state, panel) {
    Object.assign(state, {
      Om: state.Om ?? 0.3, compare: state.compare ?? true,
      kext: state.kext || { mode: "run", mu: 0, sigma: 0.025 },
      lamPrior: state.lamPrior || { mode: "run", mu: 1, sigma: 0.05, lo: 0.9, hi: 1.1 },
    });
    const body = el("div");
    panel.body.append(body);
    let plots = [];
    let loadSeq = 0;

    const addPlot = (grid, title, caption, opts = {}) => {
      const wrap = el("div", { class: "plot-wrap" });
      const cap = el("div", { class: "cap" }, caption || "");
      grid.append(el("div", { class: "plot-cell" }, el("h3", {}, title), wrap, cap));
      const p = new Plot(wrap, { margin: { l: 52, r: 14, t: 12, b: 38 }, ...opts });
      plots.push(p);
      return { plot: p, cap };
    };

    const load = () => busy(panel, "loading posterior", async () => {
      const seq = ++loadSeq;
      plots.forEach((p) => p.destroy()); plots = [];
      body.innerHTML = "";
      const run = runOf(ctx, state);
      const ms = run.massSheet;
      const src = state.src && run.posteriorSources().some((s) => s.value === state.src) ? state.src : run.massSheetSource;
      const zl = state.zLens ?? run.catalog?.target?.z_lens ?? null;
      const zs = state.zSource ?? run.catalog?.target?.z_source ?? null;
      state.zLens = zl; state.zSource = zs;
      const cosmo = { zl, zs, Om: state.Om, hasZ: zl != null && zs != null };
      const A = await analyse(run, src, state, cosmo);
      const other = otherRun(ctx, run);
      const B = other && state.compare && other.features.posterior ? await analyse(other, other.massSheetSource, state, cosmo) : null;
      const post = A.post;
      const lamName = A.blinded && A.lamBlinded ? "Δλ_int" : "λ_int";

      // ------------------------------------------------------------ cards
      const cards = el("div", { class: "cards" });
      body.append(cards);
      const blindBadge = A.blinded ? badge(run.hasKey ? "blinded · key loaded" : "blinded · no key", "warn") : null;
      const sheetRows = [];
      if (!ms.kinematics) {
        sheetRows.push(["Kinematics", "not used"], ["λ_int", "≡ 1 (not modelled)"], ["κ_ext", "≡ 0"]);
      } else {
        sheetRows.push(["Kinematics", `${KIN_LABEL[ms.mode] || ms.mode} · ${ms.dynamics} Jeans${ms.importance ? " · importance update" : " · joint"}`]);
        sheetRows.push(["λ_int prior", ms.sampleLambda ? `uniform [${ms.lambdaRange.join(", ")}]` : `fixed at ${ms.lambdaFixed}`]);
        if (A.hasLam) {
          const st = summarize(A.lamShown);
          sheetRows.push(["λ_int posterior", A.lamBlinded ? el("span", {}, `σ = ${st.std.toFixed(4)} `, badge("Δ only", "warn")) : `${pm(st, digits(st))}`]);
        } else if (ms.sampleLambda) sheetRows.push(["λ_int posterior", ms.importance && src === "samples" ? "lensing-only set (choose the importance update)" : "no kin_lambda_int column"]);
        sheetRows.push(["κ_ext", `${ms.kappaExt} (fixed in the run)`]);
        if (A.edge) sheetRows.push(["λ_int at prior edges", (A.edge.lo + A.edge.hi) > 0.02 ? badge(`${pct(A.edge.lo, 1)} low · ${pct(A.edge.hi, 1)} high`, "warn") : badge(`${pct(A.edge.lo, 1)} · ${pct(A.edge.hi, 1)}`, "ok")]);
        else if (A.hasLam && A.lamBlinded) sheetRows.push(["λ_int at prior edges", "needs the key"]);
        sheetRows.push(["Distances", "sampled D_Δt = lens model; physical = D_Δt / [λ_int (1 − κ_ext)]"]);
        sheetRows.push(["Approximation", ms.approximation]);
      }
      if (run.posteriorSources().length > 1) sheetRows.push(["Posterior set", (run.posteriorSources().find((x) => x.value === src) || {}).label || src]);
      cards.append(el("div", { class: "card" }, el("h3", {}, "Mass sheet in this run", blindBadge), kv(sheetRows)));

      // H0 precision budget
      const budget = (a) => {
        if (!a || !a.hasTrue || !a.h0Model) return null;
        const fm = frac(a.h0Model), fp = a.h0Phys ? frac(a.h0Phys) : null, fw = a.what?.h0 ? frac(a.what.h0) : null;
        return { fm, fp, fw, qp: fp != null ? Math.sqrt(Math.max(0, fp * fp - fm * fm)) : null, qw: fw != null ? Math.sqrt(Math.max(0, fw * fw - (fp ?? fm) ** 2)) : null };
      };
      const bA = budget(A), bB = budget(B);
      if (bA || bB) {
        const rows = [];
        const col = (b, k) => (b ? pct(b[k]) : "–");
        rows.push(["Lens model only (λ_int = 1, κ_ext = 0)", col(bA, "fm"), ...(B ? [col(bB, "fm")] : [])]);
        if (A.h0Phys || B?.h0Phys) {
          rows.push([ms.kinematics && ms.sampleLambda ? `+ λ_int from the kinematics (κ_ext = ${ms.kappaExt})` : `× fixed λ_int (1 − κ_ext) = ${fmtNum(ms.lambdaFixed * (1 - ms.kappaExt), 4)}`, col(bA, "fp"), ...(B ? [col(bB, "fp")] : [])]);
          rows.push([el("span", { class: "muted" }, "  mass-sheet term (in quadrature)"), col(bA, "qp"), ...(B ? [col(bB, "qp")] : [])]);
        }
        if (A.what || B?.what) {
          rows.push([`What-if: ${(A.what || B.what).desc}`, col(bA, "fw"), ...(B ? [col(bB, "fw")] : [])]);
          rows.push([el("span", { class: "muted" }, "  added by the what-if (in quadrature)"), col(bA, "qw"), ...(B ? [col(bB, "qw")] : [])]);
        }
        const heads = ["σ(H₀) / H₀", `run ${run.label}`, ...(B ? [`run ${other.label}`] : [])];
        const notes = [];
        if (A.what?.kind === "reweight") notes.push(`With joint kinematics H₀ ∝ λ_int (1 − κ_ext) per draw, which the kinematics constrain: an external κ_ext prior only moves λ_int = P / (1 − κ_ext) against its prior bounds. ${pct(1 - A.what.accept, 1)} of the (draw, κ_ext) pairs fall outside U[${ms.lambdaRange.join(", ")}] (resampling ESS ${fmtNum(A.what.ess, 0)} of ${A.h0Model.length}).`);
        if (A.what?.caveat) notes.push(A.what.caveat);
        if (!cosmo.hasZ) notes.push("No redshifts: fractional precisions only (σ(H₀)/H₀ = σ(1/D_Δt)/⟨1/D_Δt⟩).");
        cards.append(el("div", { class: "card" }, el("h3", {}, "H₀ precision budget"), table(heads, rows, { class: "wrap" }), B ? el("div", { class: "muted small" }, `A: ${run.name} · B: ${other.name}`) : null, ...notes.map((t) => el("div", { class: "muted small" }, t))));
      } else if (A.hasDdt && !A.hasTrue) {
        cards.append(el("div", { class: "card" }, el("h3", {}, "H₀ precision budget"), el("div", { class: "muted small" }, `D_Δt${A.lamBlinded ? " and λ_int are" : " is"} blinded: the budget needs the key (used only in the computation; every number shown stays a width or a deviation).`), unblindUI(run, load)));
      }

      // what-if controls
      const kOpts = [{ value: "run", label: `run value (${ms.kinematics ? ms.kappaExt : 0})` }, { value: "fixed", label: "fixed value" }, { value: "gauss", label: "Gaussian" }];
      const lOpts = [{ value: "run", label: `run value (${ms.kinematics ? ms.lambdaFixed : 1})` }, { value: "gauss", label: "Gaussian" }, { value: "uniform", label: "uniform" }];
      const upd = (obj, k) => (v) => { if (v != null) { obj[k] = v; load(); } };
      const whatRows = [
        row("κ_ext", select(kOpts, state.kext.mode, (v) => { state.kext.mode = v; load(); }),
          state.kext.mode !== "run" ? number(state.kext.mu, upd(state.kext, "mu"), { step: 0.005, width: 70 }) : null,
          state.kext.mode === "gauss" ? el("span", { class: "muted small" }, "σ") : null,
          state.kext.mode === "gauss" ? number(state.kext.sigma, upd(state.kext, "sigma"), { min: 0, step: 0.005, width: 70 }) : null),
      ];
      if (!(ms.kinematics && ms.sampleLambda)) {
        whatRows.push(row("λ_int", select(lOpts, state.lamPrior.mode, (v) => { state.lamPrior.mode = v; load(); }),
          state.lamPrior.mode === "gauss" ? [number(state.lamPrior.mu, upd(state.lamPrior, "mu"), { step: 0.01, width: 70 }), el("span", { class: "muted small" }, "σ"), number(state.lamPrior.sigma, upd(state.lamPrior, "sigma"), { min: 0, step: 0.01, width: 70 })] : null,
          state.lamPrior.mode === "uniform" ? [number(state.lamPrior.lo, upd(state.lamPrior, "lo"), { step: 0.01, width: 70 }), el("span", { class: "muted small" }, "to"), number(state.lamPrior.hi, upd(state.lamPrior, "hi"), { step: 0.01, width: 70 })] : null));
      }
      const whatText = ms.kinematics && ms.sampleLambda
        ? "λ_int is sampled with the kinematics. Try an external κ_ext prior (e.g. from a line-of-sight study): the kinematics fix λ_int (1 − κ_ext), so H₀ changes only where λ_int would leave its prior range."
        : ms.kinematics ? "λ_int was fixed in this run. Propagate external priors on λ_int and κ_ext onto H₀ = H₀(lens model) · λ_int (1 − κ_ext)."
          : "No kinematics: H₀ assumes λ_int = 1 and κ_ext = 0, i.e. the lens model's radial profile. Propagate external priors on λ_int (e.g. from a population or a kinematic constraint) and κ_ext onto H₀ = H₀(lens model) · λ_int (1 − κ_ext).";
      cards.append(el("div", { class: "card" }, el("h3", {}, "What-if"), el("div", { class: "muted small" }, whatText), ...whatRows, el("div", { class: "muted small" }, `Monte Carlo with a fixed seed; ${ms.kinematics && ms.sampleLambda ? N_KAPPA + " κ_ext draws per posterior draw" : "one prior draw per posterior draw"}. Results enter the budget and the H₀ plot.`)));

      // kinematics / importance
      if (ms.kinematics) {
        const kr = [];
        if (ms.mode === "aperture" && ms.observedSigma != null) kr.push(["Observed σ", `${ms.observedSigma} ± ${ms.sigmaError} km/s` + (ms.covarianceScale !== 1 ? ` (errors × ${ms.covarianceScale})` : "")]);
        if (ms.mode === "aperture" && ms.aperture.kind) kr.push(["Aperture", ms.aperture.kind === "square" ? `square ${ms.aperture.width}″${ms.aperture.height ? " × " + ms.aperture.height + "″" : ""}` : `${ms.aperture.kind} r = ${ms.aperture.radius}″`]);
        if (ms.mode === "resolved") kr.push(["IFU data", (ms.ifuFile || "–").split("/").pop()]);
        kr.push(["Anisotropy", ms.anisotropyFixed != null ? `σ_t/σ_r = ${ms.anisotropyFixed} (fixed)` : `${ms.anisotropyModel}${ms.anisotropyRange ? `, σ_t/σ_r ~ U[${ms.anisotropyRange.join(", ")}]` : ""}`]);
        if (post.columns.kin_anisotropy_ratio) { const st = summarize(post.columns.kin_anisotropy_ratio); kr.push(["σ_t/σ_r posterior", `${pm(st, 3)} (β = 1 − ratio² ≈ ${(1 - st.median ** 2).toFixed(3)})`]); }
        for (const nm of post.scalarNames.filter((n) => /^kin_/.test(n) && !["kin_lambda_int", "kin_anisotropy_ratio"].includes(n))) { const st = summarize(post.columns[nm]); kr.push([nm, `${pm(st, digits(st))}${post.blindedColumns.includes(nm) ? " (Δ)" : ""}`]); }
        const imp = run.kinImportance;
        if (imp) {
          kr.push(["Importance ESS", `${fmtNum(imp.importance_ess, 1)} of ${imp.n_draws}` + (imp.importance_ess < 0.1 * imp.n_draws ? " · low" : "")]);
          kr.push(["Max weight", fmtNum(imp.max_weight, 4)]);
          if (imp.chi2_best_median != null) kr.push(["Best χ² (median)", `${fmtNum(imp.chi2_best_median, 2)} for ${imp.n_obs} data`]);
          if (imp.lambda_edge_fraction) kr.push(["λ_int at prior edges", `${pct(imp.lambda_edge_fraction.lower, 1)} low · ${pct(imp.lambda_edge_fraction.upper, 1)} high`]);
          if (imp.error_scale?.mean != null) kr.push(["Error scale", `${fmtNum(imp.error_scale.mean, 3)} (16/50/84: ${(imp.error_scale.quantiles_16_50_84 || []).map((v) => fmtNum(v, 3)).join(" / ")})`]);
        }
        cards.append(el("div", { class: "card" }, el("h3", {}, "Kinematics"), kv(kr)));
      }

      if (A.corr?.length) {
        cards.append(el("div", { class: "card" }, el("h3", {}, `Strongest correlations with ${A.corrTarget}`),
          table(["Parameter", "r"], A.corr.map(([n, r]) => [el("span", { class: "mono" }, n, post.blindedColumns.includes(n) ? badge("Δ", "warn") : null), el("span", { class: Math.abs(r) > 0.5 ? "bad" : Math.abs(r) > 0.3 ? "meh" : "" }, (r >= 0 ? "+" : "") + r.toFixed(2))])),
          el("div", { class: "muted small" }, A.corrTarget === "kin_lambda_int" ? "λ_int trades against the radial slope γ and the anisotropy through the kinematics; D_Δt (lens model) does not move with it, the physical distance does." : "Without a mass sheet, the radial slope γ is the main handle on D_Δt: a steeper profile gives longer predicted delays.")));
      }

      // ------------------------------------------------------------ plots
      const grid = el("div", { class: "plot-grid" });
      body.append(grid);
      const cA = series(0), cB = series(1);

      // 1. lambda_int posterior vs prior
      {
        const { plot, cap } = addPlot(grid, A.hasLam ? `${lamName} posterior` : A.what?.lam ? "λ_int what-if prior" : "λ_int", "", { xlabel: A.lamBlinded ? "λ_int − ⟨λ_int⟩ (blinded)" : "λ_int", ylabel: "density" });
        const sets = [];
        if (A.hasLam) sets.push({ arr: A.lamShown, color: cA, label: `${run.label}` });
        else if (A.what?.lam) sets.push({ arr: A.what.lam, color: cA, label: "what-if prior", dash: [4, 3] });
        if (B?.hasLam) sets.push({ arr: B.lamShown, color: cB, label: `${other.label}` });
        const [a0, b0] = ms.lambdaRange || [0.5, 1.5];
        const priorDensity = A.hasLam && ms.sampleLambda && A.mode !== "fractional" ? 1 / (b0 - a0) : null;
        plot.render = (p) => {
          if (!sets.length) { p.setRange(0, 1, 0, 1); p.axes({ xticks: false, yticks: false }); p.text(p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h / 2, ms.kinematics ? `λ_int is fixed at ${ms.lambdaFixed} in this run` : "no λ_int in this run (λ_int ≡ 1)", { px: true, align: "center", baseline: "middle", color: THEME.muted }); return; }
          const [lo, hi] = rangeOf(sets.map((s) => s.arr));
          let ymax = 0;
          const ks = sets.map((s) => { const hg = histogram(s.arr, { bins: 40, range: [lo, hi], density: true }); const k = kde1d(s.arr, { range: [lo, hi] }); ymax = Math.max(ymax, ...hg.counts, ...k.ys); return { s, hg, k, st: summarize(s.arr) }; });
          if (priorDensity) ymax = Math.max(ymax, priorDensity * 1.2);
          p.setRange(lo, hi, 0, ymax * 1.1); p.clip();
          for (const { s, hg, k, st } of ks) { p.bars(hg.edges, hg.counts, { color: alpha(s.color, 0.25) }); p.line(k.xs, k.ys, { color: s.color, width: 2, dash: s.dash }); p.band(st.lo68, st.hi68, { color: alpha(s.color, 0.08) }); }
          if (priorDensity) p.hline(priorDensity, { color: THEME.prior, dash: [3, 3] });
          if (!A.lamBlinded && A.hasLam) for (const v of [a0, b0]) if (v > lo && v < hi) p.vline(v, { color: THEME.prior, dash: [2, 3] });
          p.unclip(); p.axes({ grid: true });
          if (sets.length > 1) p.legend(sets.map((s) => ({ color: s.color, label: s.label })));
        };
        plot.draw();
        cap.textContent = A.hasLam
          ? `${A.lamBlinded ? "Deviation from the posterior mean (blinded). " : ""}Prior U[${a0}, ${b0}]${priorDensity ? " (dashed level: its density)" : ""}. The posterior width is set by the ${ms.mode === "resolved" ? "resolved kinematics" : "aperture dispersion"}; the imaging alone leaves λ_int free.`
          : A.what?.lam ? "No sampled λ_int: the what-if prior drawn for the propagation." : "";
      }

      // 2. H0: lens model vs physical vs what-if
      {
        const lbl = A.blinded ? (A.mode === "fractional" || !cosmo.hasZ ? "(H₀ − ⟨H₀⟩) / ⟨H₀⟩ (each relative to its own mean, blinded)" : "H₀ − ⟨H₀⟩ [km/s/Mpc] (each relative to its own mean, blinded)") : cosmo.hasZ ? "H₀ [km/s/Mpc]" : "(H₀ − ⟨H₀⟩) / ⟨H₀⟩";
        const { plot, cap } = addPlot(grid, "H₀: lens model vs mass sheet", "", { xlabel: lbl, ylabel: "density" });
        const curves = [];
        if (A.hasTrue) {
          curves.push({ arr: displayH0(A.h0Model, A, cosmo), color: THEME.muted, dash: [5, 4], label: "lens model (λ = 1)" });
          if (A.h0Phys) curves.push({ arr: displayH0(A.h0Phys, A, cosmo), color: cA, label: ms.sampleLambda ? "with λ_int (kinematics)" : "with fixed λ_int (1 − κ_ext)" });
          if (A.what?.h0) curves.push({ arr: displayH0(A.what.h0, A, cosmo), color: cA, dash: [2, 2], width: 2.4, label: "what-if" });
          if (B?.hasTrue) curves.push({ arr: displayH0(B.h0Phys || B.what?.h0 || B.h0Model, B, cosmo), color: cB, label: `${other.label}: ${B.h0Phys ? "with mass sheet" : "lens model"}` });
        }
        plot.render = (p) => {
          if (!curves.length) { p.setRange(0, 1, 0, 1); p.axes({ xticks: false, yticks: false }); p.text(p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h / 2, !A.hasDdt ? "no D_Δt in this run" : "needs the blinding key", { px: true, align: "center", baseline: "middle", color: THEME.muted }); return; }
          const [lo, hi] = rangeOf(curves.map((c) => c.arr), 0.02);
          let ymax = 0;
          const ks = curves.map((c) => { const k = kde1d(c.arr, { range: [lo, hi] }); ymax = Math.max(ymax, ...k.ys); return { c, k, st: summarize(c.arr) }; });
          p.setRange(lo, hi, 0, ymax * 1.12); p.clip();
          for (const { c, k, st } of ks) { p.line(k.xs, k.ys, { color: c.color, width: c.width || 2, dash: c.dash }); p.vline(st.median, { color: alpha(c.color, 0.6) }); }
          p.unclip(); p.axes({ grid: true });
          p.legend(curves.map((c) => ({ color: c.color, label: c.label })));
        };
        plot.draw();
        cap.textContent = A.hasTrue ? `${A.blinded ? "Every curve is centred on its own mean, so only the widths compare (blinding). " : ""}H₀ ∝ 1/D_Δt; the mass sheet multiplies it by λ_int (1 − κ_ext) draw by draw.` : "";
      }

      // 2b. stellar kinematics: predicted vs observed velocity dispersion (computed in a worker, filled in later)
      if (ms.kinematics) {
        const { plot, cap } = addPlot(grid, "Kinematics: predicted vs observed dispersion", "", { xlabel: ms.mode === "resolved" ? "V_rms [km/s]" : "σ_v [km/s]", ylabel: "density" });
        const message = (t) => { plot.render = (p) => { p.setRange(0, 1, 0, 1); p.axes({ xticks: false, yticks: false }); p.text(p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h / 2, t, { px: true, align: "center", baseline: "middle", color: THEME.muted }); }; plot.draw(); };
        const imp = run.kinImportance;
        const unsupported = run.kinematicsUnsupported;
        if (unsupported && imp?.best_fit?.model_vrms && imp.observed) {
          // resolved / unported dynamics: ALPACA's own best-fit prediction of the importance update, per bin
          const obs = imp.observed, sd = imp.sigma_diag || obs.map(() => 0), mod = imp.best_fit.model_vrms;
          const xs = Float64Array.from(obs, (_, i) => i);
          plot.opts.xlabel = "bin"; plot.opts.ylabel = "V_rms [km/s]";
          plot.render = (p) => {
            let lo = Infinity, hi = -Infinity;
            obs.forEach((v, i) => { lo = Math.min(lo, v - sd[i], mod[i]); hi = Math.max(hi, v + sd[i], mod[i]); });
            const pad = (hi - lo) * 0.08;
            p.setRange(-0.5, obs.length - 0.5, lo - pad, hi + pad); p.clip();
            obs.forEach((v, i) => p.line([i, i], [v - sd[i], v + sd[i]], { color: THEME.muted, width: 1.2 }));
            p.scatter(xs, obs, { color: THEME.muted, radius: 2.5 });
            p.line(xs, mod, { color: THEME.fg, width: 1.6 });
            p.unclip(); p.axes({ grid: true });
            p.legend([{ color: THEME.muted, label: "observed ± σ" }, { color: THEME.fg, label: "best-fit model" }], { x: p.rect.x + p.rect.w - 130 });
          };
          plot.draw();
          cap.textContent = `Highest-weight draw of the importance update (ALPACA's importance_summary.json): χ² = ${fmtNum(imp.best_fit.chi2, 2)} for ${obs.length} bins. Per-draw predictions are not available here: ${unsupported}.`;
        } else if (unsupported) {
          message("not available in the browser");
          cap.textContent = `Not available: ${unsupported}. ALPACA does not store per-draw predictions yet.`;
        } else {
          message("computing the Jeans model for every draw…");
          const lambdaOne = !A.lamBlinded;
          run.kinematicsPrediction(src, { lambdaOne }).then((kp) => {
            if (seq !== loadSeq) return;
            const st = summarize(kp.sigma), z = (st.median - kp.observed) / kp.error;
            const st1 = kp.sigma1 ? summarize(kp.sigma1) : null;
            const sB = Math.sqrt(st.std ** 2 + kp.error ** 2);
            plot.render = (p) => {
              const arrs = [kp.sigma, ...(kp.sigma1 ? [kp.sigma1] : [])];
              let [lo, hi] = rangeOf(arrs, 0.02);
              lo = Math.min(lo, kp.observed - 4 * kp.error); hi = Math.max(hi, kp.observed + 4 * kp.error);
              const kA = kde1d(kp.sigma, { range: [lo, hi] }), k1 = kp.sigma1 ? kde1d(kp.sigma1, { range: [lo, hi] }) : null;
              const xs = kA.xs, obs = Float64Array.from(xs, (x) => Math.exp(-0.5 * ((x - kp.observed) / kp.error) ** 2) / (kp.error * Math.sqrt(2 * Math.PI)));
              const ymax = Math.max(...kA.ys, ...obs, ...(k1 ? k1.ys : [0]));
              p.setRange(lo, hi, 0, ymax * 1.12); p.clip();
              p.fill(xs, obs, { color: alpha("#8c8c8c", 0.25) });
              p.line(xs, obs, { color: "#8c8c8c", width: 1.2 });
              if (k1) p.line(k1.xs, k1.ys, { color: THEME.muted, width: 2, dash: [5, 4] });
              p.line(kA.xs, kA.ys, { color: THEME.fg, width: 2 });
              p.vline(kp.observed, { color: "rgba(0,0,0,0.45)" });
              if (kp.map) p.vline(kp.map.sigma, { color: THEME.fg, dash: [2, 2], width: 1.5 });
              p.unclip(); p.axes({ grid: true });
              p.legend([{ color: "#8c8c8c", label: `observed ${kp.observed} ± ${fmtNum(kp.error, 3)}` }, { color: THEME.fg, label: "posterior prediction" }, ...(k1 ? [{ color: THEME.muted, label: "lens model alone (λ_int = 1)" }] : []), ...(kp.map ? [{ color: THEME.fg, label: "GD MAP (dotted)" }] : [])], { x: p.rect.x + p.rect.w - 190 });
            };
            plot.draw();
            cap.textContent = `Spherical Jeans (port of alpaca.kinematics, same quadratures) for all ${kp.sigma.length} draws: σ_pred = ${pm(st, 1)} km/s vs ${kp.observed} ± ${fmtNum(kp.error, 3)} observed; median offset ${z >= 0 ? "+" : ""}${z.toFixed(2)} σ_obs, ${((st.median - kp.observed) / sB).toFixed(2)} σ including the model spread.` +
              (kp.map ? ` GD MAP: ${kp.map.sigma.toFixed(1)} km/s.` : "") +
              (st1 ? ` At λ_int = 1 the lens model alone predicts ${pm(st1, 1)} km/s; the sampled λ_int (1 − κ_ext) rescales σ² from there (σ ∝ √λ).` : A.lamBlinded ? " The λ_int = 1 prediction is hidden: next to σ_obs it would reveal λ_int." : "");
          }).catch((e) => {
            if (seq !== loadSeq) return;
            message(/blinded/.test(e.message) ? "needs the blinding key" : "could not be computed");
            cap.textContent = /blinded/.test(e.message) ? "The prediction uses the true γ and λ_int: load the key (it is used only in the computation; σ_pred itself carries no H₀ information)." : `Error: ${e.message}`;
          });
        }
      }

      // 3. degeneracy contours
      {
        const names = post.scalarNames;
        const dx = A.hasLam ? "kin_lambda_int" : names.includes("lens_gamma") ? "lens_gamma" : names[0];
        const dy = A.hasLam ? (names.includes("lens_gamma") ? "lens_gamma" : "D_dt") : names.includes("D_dt") ? "D_dt" : names[1];
        const px = names.includes(state.pairX) ? state.pairX : dx, py = names.includes(state.pairY) ? state.pairY : dy;
        const r = pearson(post.columns[px], post.columns[py]);
        const { plot, cap } = addPlot(grid, `Degeneracy: ${px} vs ${py}`, "", { xlabel: px + (post.blindedColumns.includes(px) ? " (Δ)" : ""), ylabel: py + (post.blindedColumns.includes(py) ? " (Δ)" : "") });
        const sets = [{ x: post.columns[px], y: post.columns[py], color: cA }];
        const bp = B?.post;
        if (bp?.columns[px] && bp?.columns[py]) sets.push({ x: bp.columns[px], y: bp.columns[py], color: cB });
        const rx = rangeOf(sets.map((s) => s.x)), ry = rangeOf(sets.map((s) => s.y));
        const polys = sets.map((s) => ({ s, levels: contourPolys(s.x, s.y, rx, ry) }));
        plot.render = (p) => {
          p.setRange(rx[0], rx[1], ry[0], ry[1]); p.clip();
          for (const { s, levels } of [...polys].reverse()) levels.forEach((lines, li) => p.polys(lines, { stroke: s.color, fill: alpha(s.color, li === 0 ? 0.12 : 0.3), width: 1 }));
          p.unclip(); p.axes({ grid: true });
          p.text(p.rect.x + p.rect.w - 6, p.rect.y + 6, `r = ${r.toFixed(2)}`, { px: true, align: "right" });
        };
        plot.draw();
        cap.textContent = "68 / 95 % contours" + (sets.length > 1 ? ` (run ${other.label} grey)` : "") + ". Pick the pair in the settings." + (px === "kin_lambda_int" && py === "lens_gamma" ? " At fixed σ_v a steeper γ needs a smaller λ_int: the kinematics break the MSD only together with the slope." : "");
      }

      // 4. MST family of the convergence profile
      {
        const gShown = post.columns.lens_gamma;
        // blinded gamma / lambda are replaced by an isothermal / unit reference plus their deviations
        const gIll = !!gShown && post.blindedColumns.includes("lens_gamma"), lIll = A.hasLam && A.lamBlinded;
        const illustrative = gIll || lIll;
        const ref = (v, base) => (A.mode === "fractional" ? base * (1 + v) : base + v);
        const n = Math.min(post.nSamples, 500), step = Math.max(1, Math.floor(post.nSamples / n));
        const gam = [], lt = [];
        for (let i = 0; i < post.nSamples; i += step) {
          gam.push(!gShown ? 2 : gIll ? ref(gShown[i], 2) : gShown[i]);
          const l = A.hasLam ? (lIll ? ref(A.lamShown[i], 1) : A.lamShown[i]) : A.what?.lam ? A.what.lam[i] : ms.kinematics ? ms.lambdaFixed : 1;
          const k = A.what?.kap ? A.what.kap[i] : ms.kinematics ? ms.kappaExt : 0;
          lt.push(l * (1 - k));
        }
        const xs = Float64Array.from({ length: 90 }, (_, i) => 0.08 * Math.pow(3.2 / 0.08, i / 89));
        const bands = (fn) => {
          const lo = new Float64Array(xs.length), md = new Float64Array(xs.length), hi = new Float64Array(xs.length);
          const tmp = new Float64Array(gam.length);
          xs.forEach((x, j) => { for (let i = 0; i < gam.length; i++) tmp[i] = fn(gam[i], lt[i], x); const s = Float64Array.from(tmp).sort(); lo[j] = quantileSorted(s, 0.16); md[j] = quantileSorted(s, 0.5); hi[j] = quantileSorted(s, 0.84); });
          return { lo, md, hi };
        };
        const kap = (g, x) => ((3 - g) / 2) * Math.pow(x, 1 - g);
        const model = bands((g, l, x) => kap(g, x));
        const hasSheet = lt.some((v) => Math.abs(v - 1) > 1e-9);
        const phys = hasSheet ? bands((g, l, x) => l * kap(g, x) + (1 - l)) : null;
        const thE = post.columns.lens_theta_E ? summarize(post.columns.lens_theta_E).median : null;
        const apR = ms.kinematics && ms.mode === "aperture" ? (ms.aperture.kind === "square" ? ms.aperture.width / 2 : ms.aperture.radius) : null;
        const { plot, cap } = addPlot(grid, "MST family of the convergence profile", "", { xlabel: "R / θ_E", ylabel: "κ(R)" });
        plot.render = (p) => {
          p.setRange(0, 3.2, 0, 2.6); p.clip();
          const fillBand = (b, color) => p.polys([[...Array.from(xs, (x, j) => [x, b.hi[j]]), ...Array.from(xs, (x, j) => [x, b.lo[j]]).reverse()]], { stroke: "rgba(0,0,0,0)", fill: color, width: 0 });
          fillBand(model, alpha("#8c8c8c", 0.25));
          p.line(xs, model.md, { color: THEME.muted, width: 2, dash: [5, 4] });
          if (phys) { fillBand(phys, alpha("#000000", 0.18)); p.line(xs, phys.md, { color: THEME.fg, width: 2 }); }
          p.hline(1, { color: "rgba(0,0,0,0.35)" }); p.vline(1, { color: "rgba(0,0,0,0.35)" });
          if (apR && thE) p.band(0, apR / thE, { color: "rgba(0,0,0,0.05)" });
          p.unclip(); p.axes({ grid: true });
          p.legend([{ color: "#8c8c8c", label: "lens model" + (gIll ? " (γ = 2 + Δγ)" : "") }, ...(phys ? [{ color: "#000000", label: "λ_tot κ + (1 − λ_tot)" + (lIll ? " (λ = 1 + Δλ)" : "") }] : [])], { x: p.rect.x + p.rect.w - 230 });
        };
        plot.draw();
        cap.textContent = (illustrative ? `Illustrative (blinded): the posterior spread is applied to ${[gIll ? "an isothermal reference, γ = 2 + Δγ" : null, lIll ? "λ_int = 1 + Δλ_int" : null].filter(Boolean).join(" and ")}, so no blinded value is shown. ` : "") +
          "Circularised EPL, κ = (3 − γ)/2 (R/θ_E)^(1−γ); 68 % bands. The internal sheet λ_tot = λ_int (1 − κ_ext) rotates the profile about κ = 1, keeps θ_E and the imaging, and scales every time delay by λ_tot." + (apR && thE ? " Shaded: the kinematic aperture." : "");
      }

      // 5. kinematic nuisances
      const nuis = post.scalarNames.filter((n) => /^kin_/.test(n) && !["kin_lambda_int", "kin_center_dx", "kin_center_dy"].includes(n)).slice(0, 4);
      for (const nm of nuis) {
        const arr = post.columns[nm];
        const blinded = post.blindedColumns.includes(nm);
        const prior = nm === "kin_anisotropy_ratio" && ms.anisotropyRange ? ms.anisotropyRange : null;
        const { plot, cap } = addPlot(grid, nm, "", { xlabel: nm + (blinded ? " (Δ)" : ""), ylabel: "density" });
        const bArr = B?.post?.columns[nm] || null;
        plot.render = (p) => {
          const [lo0, hi0] = rangeOf([arr, bArr]);
          const lo = prior ? Math.min(lo0, prior[0] - 0.05 * (prior[1] - prior[0])) : lo0, hi = prior ? Math.max(hi0, prior[1] + 0.05 * (prior[1] - prior[0])) : hi0;
          const hg = histogram(arr, { bins: 36, range: [lo, hi], density: true });
          const kb = bArr ? kde1d(bArr, { range: [lo, hi] }) : null;
          p.setRange(lo, hi, 0, Math.max(...hg.counts, ...(kb ? kb.ys : [0]), prior ? 1.1 / (prior[1] - prior[0]) : 0) * 1.12); p.clip();
          p.bars(hg.edges, hg.counts, { color: alpha(cA, 0.3) });
          if (kb) p.line(kb.xs, kb.ys, { color: cB, width: 2 });
          if (prior) { for (const v of prior) p.vline(v, { color: THEME.prior, dash: [2, 3] }); p.hline(1 / (prior[1] - prior[0]), { color: THEME.prior, dash: [3, 3] }); }
          p.unclip(); p.axes({ grid: true });
        };
        plot.draw();
        if (nm === "kin_anisotropy_ratio") {
          const st = summarize(arr);
          let edge = "";
          if (prior && !blinded) {
            const w = prior[1] - prior[0];
            const lo = arr.filter((v) => v < prior[0] + 0.05 * w).length / arr.length, hi = arr.filter((v) => v > prior[1] - 0.05 * w).length / arr.length;
            if (Math.max(lo, hi) > 0.15) edge = ` ${pct(Math.max(lo, hi), 0)} of the draws sit in the ${lo > hi ? "lowest" : "highest"} 5 % of the prior: the data push against the ${lo > hi ? "lower" : "upper"} bound, so the prior range shapes λ_int too.`;
          }
          cap.textContent = `σ_t/σ_r with β = 1 − ratio² (median β ≈ ${(1 - st.median ** 2).toFixed(3)}). A posterior filling its prior means the anisotropy is not constrained and widens λ_int through the mass–anisotropy degeneracy.${edge}`;
        }
      }
      if (post.columns.kin_center_dx && post.columns.kin_center_dy) {
        const sx = post.columns.kin_center_dx, sy = post.columns.kin_center_dy;
        const sig = run.config?.likelihood?.kinematics?.center_offset_sigma ?? null;
        const { plot, cap } = addPlot(grid, "IFU centring offset", "", { xlabel: "kin_center_dx (east) [″]", ylabel: "kin_center_dy (north) [″]" });
        const lim = Math.max(sig ? 2.2 * sig : 0, ...[sx, sy].map((a) => { const s = summarize(a); return Math.max(Math.abs(s.lo95), Math.abs(s.hi95)) * 1.4; }));
        const levels = contourPolys(sx, sy, [-lim, lim], [-lim, lim]);
        plot.render = (p) => {
          p.setRange(-lim, lim, -lim, lim); p.clip();
          if (sig) p.polys([Array.from({ length: 73 }, (_, i) => [sig * Math.cos((i * Math.PI) / 36), sig * Math.sin((i * Math.PI) / 36)])], { stroke: THEME.prior, width: 1 });
          levels.forEach((lines, li) => p.polys(lines, { stroke: cA, fill: alpha(cA, li === 0 ? 0.12 : 0.3), width: 1 }));
          p.hline(0, { color: "rgba(0,0,0,0.3)" }); p.vline(0, { color: "rgba(0,0,0,0.3)" });
          p.unclip(); p.axes({ grid: true });
        };
        plot.draw();
        cap.textContent = `Offset of the kinematic centre from the IFU origin, 68 / 95 %${sig ? `; circle: prior σ = ${sig}″` : ""}.`;
      }

      panel.setStatus((A.blinded ? (run.hasKey ? "blinded · widths from true values" : "blinded · no key") : "not blinded") + (ms.kinematics ? (ms.sampleLambda ? " · λ_int free" : ` · λ_int fixed (${ms.lambdaFixed})`) : " · no kinematics") + (A.what ? " · what-if on" : ""));
      settings(A);
    });

    const settings = (A = null) => {
      const run = runOf(ctx, state);
      const sources = run.posteriorSources();
      const names = A?.post?.scalarNames || [];
      const opt = names.map((n) => ({ value: n, label: n }));
      panel.settings.replaceChildren(
        runRow(ctx, state, load) || "",
        sources.length > 1 ? section("Posterior", row("Set", select(sources, state.src || run.massSheetSource, (v) => { state.src = v; load(); }))) : "",
        section("Cosmology",
          row("z_lens", number(state.zLens, (v) => { state.zLens = v; load(); }, { step: 0.0001, width: 90 })),
          row("z_source", number(state.zSource, (v) => { state.zSource = v; load(); }, { step: 0.0001, width: 90 })),
          row("Ωm", number(state.Om, (v) => { state.Om = v; load(); }, { step: 0.01, width: 70 })),
        ),
        names.length ? section("Degeneracy plot",
          row("x", select(opt, names.includes(state.pairX) ? state.pairX : (A.hasLam ? "kin_lambda_int" : "lens_gamma"), (v) => { state.pairX = v; load(); })),
          row("y", select(opt, names.includes(state.pairY) ? state.pairY : (A.hasLam ? "lens_gamma" : "D_dt"), (v) => { state.pairY = v; load(); })),
        ) : "",
        section("Display",
          ctx.app.runs.length > 1 ? checkbox("Overlay / compare the other run", state.compare, (v) => { state.compare = v; load(); }) : el("div", { class: "muted small" }, "Load a second run (e.g. the same lens without kinematics) to compare budgets."),
          el("div", { class: "ctl-row" }, button("Export plots (PNG)", () => plots.forEach((p, i) => downloadPNG(p.toPNG(), `msd_${i + 1}.png`)), { small: true })),
        ),
      );
    };
    settings();
    load();
    return { destroy() { plots.forEach((p) => p.destroy()); }, state: () => state, refresh: load };
  },
};
