// Helpers shared by applets.
import { el, select, row, button, number, textInput, badge } from "../ui/widgets.js";
import { summarize } from "../core/stats.js";
import { keyStore } from "../core/prefs.js";
import { emit } from "../core/bus.js";

export function runOf(ctx, state) {
  const runs = ctx.app.runs;
  return runs.find((r) => r.label === (state.runLabel || "A")) || runs[0];
}

export function runRow(ctx, state, onChange, label = "Run") {
  if (ctx.app.runs.length < 2) return null;
  return row(label, select(ctx.app.runs.map((r) => ({ value: r.label, label: `${r.label}: ${r.name}` })), state.runLabel || "A", (v) => { state.runLabel = v; onChange(); }));
}

export function otherRun(ctx, run) { return ctx.app.runs.find((r) => r !== run) || null; }

export function imageLayer(f, run, extent = null) {
  return { data: f.data, rows: f.rows, cols: f.cols, extent: extent || run.extent(f.cols) };
}

export function errorBox(msg) { return el("div", { class: "error" }, String(msg)); }
export function infoBox(msg) { return el("div", { class: "info" }, msg); }

export async function busy(panel, text, fn) {
  panel.setBusy(true, text);
  try { return await fn(); } finally { panel.setBusy(false); }
}

// ---------------------------------------------------------------- parameter sources
export function paramSourceOptions(run) {
  const opts = [];
  if (run.features.map) opts.push({ value: "map:final", label: "MAP · final GD stage" });
  for (const s of run.stages) if (s.hasParams && s.key !== "lens_light_refit") opts.push({ value: "map:" + s.key, label: "MAP · " + s.label });
  if (run.features.posterior) {
    opts.push({ value: "post:best", label: "Posterior · best log-L draw" });
    opts.push({ value: "post:draw", label: "Posterior · draw #" });
    opts.push({ value: "post:median", label: "Posterior · median + mean source" });
  }
  return opts;
}

export function paramSourceControls(run, state, onChange) {
  if (!state.paramSource) state.paramSource = run.features.posterior && !run.needsKey ? "post:best" : (paramSourceOptions(run)[0]?.value || "map:final");
  const wrap = el("div");
  const sel = select(paramSourceOptions(run), state.paramSource, (v) => { state.paramSource = v; rebuild(); onChange(); });
  const rebuild = () => {
    wrap.innerHTML = "";
    wrap.append(row("Parameters", sel));
    if (state.paramSource === "post:draw") {
      wrap.append(row("Draw index", number(state.drawIndex ?? 0, (v) => { state.drawIndex = Math.max(0, Math.round(v || 0)); onChange(); }, { min: 0, step: 1, width: 90 })));
    }
  };
  rebuild();
  return wrap;
}

export class NeedsKeyError extends Error {}

export async function resolveParams(run, state) {
  const src = state.paramSource || "map:final";
  if (src.startsWith("map:")) {
    const key = src.slice(4);
    const bf = await run.bestFit(key);
    const params = {};
    for (const [k, v] of Object.entries(bf.params)) if (typeof v === "number") params[k] = v;
    const missing = (run.blinding?.blinded_columns || []).filter((c) => params[c] === undefined);
    return {
      params, source: bf.source, label: `MAP (${key})`, stageKey: key === "final" ? "final" : key,
      blindedKeys: bf.blindedKeys, unblinded: bf.full || !run.features.blinded,
      note: missing.length ? `Blinded parameters ${missing.join(", ")} are absent from the JSON best fit (no *_full.npz sidecar); rendering is not possible.` : null,
      renderable: missing.length === 0,
    };
  }
  if (!run.features.posterior) throw new Error("This run has no posterior samples.");
  if (run.needsKey) throw new NeedsKeyError("Rendering a posterior draw needs the true values of the blinded parameters. Provide the blinding key (used for computations only).");
  const post = await run.posterior();
  if (src === "post:best") {
    const i = run.bestDrawIndex(post);
    const d = await run.drawParams(i);
    return { ...d, label: `posterior draw #${i} (best log-L)`, stageKey: "final", renderable: true };
  }
  if (src === "post:draw") {
    const i = Math.min(post.nSamples - 1, Math.max(0, state.drawIndex ?? 0));
    const d = await run.drawParams(i);
    return { ...d, label: `posterior draw #${i}`, stageKey: "final", renderable: true };
  }
  // median
  const params = {};
  for (const nm of post.scalarNames) params[nm] = summarize(post.columns[nm]).median;
  if (run.offsets) for (const c of post.blindedColumns) if (c in run.offsets) params[c] = run.offsetsMode === "fractional" ? params[c] * run.offsets[c] + run.offsets[c] : params[c] + run.offsets[c];
  const n = Math.round(Math.sqrt(post.pixelIdx.length));
  const source = post.pixMean ? { n, data: post.pixMean } : null;
  return { params, source, label: "posterior median (scalars) + mean source", stageKey: "final", blindedKeys: post.blindedColumns, unblinded: true, renderable: true, note: "Medians of scalar parameters are not a joint sample; use for illustration only." };
}

// UI to unblind in memory. Calls onDone() after success.
export function unblindUI(run, onDone) {
  const box = el("div", { class: "unblind" });
  const status = el("div", { class: "muted small" });
  const input = textInput("", () => {}, { placeholder: "blinding key (ALPACA_BLINDING_KEY)", width: 260, type: "password" });
  const opts = { session: true, device: false };
  const go = async (key) => {
    status.textContent = "deriving key…";
    try {
      const r = await run.unblind(key);
      status.textContent = "";
      if (opts.session || opts.device) keyStore.set(key, { remember: opts.device });
      run.keySource = opts.device ? "campaign key (this device)" : "input";
      emit("key:loaded", { key, run });
      box.replaceChildren(el("div", { class: "info" }, `Key accepted (covers ${Object.keys(r.offsets).join(", ")}). It is used only inside the forward model and for derived widths; every displayed value stays blinded. Reload the page to forget it.`));
      onDone && onDone();
    } catch (e) { status.textContent = String(e.message || e); }
  };
  box.append(
    el("div", { class: "warn" }, badge("BLINDED", "warn"), " This run is TDCOSMO-blinded. Evaluating the forward model needs the true values of ", el("code", {}, (run.blinding?.blinded_columns || []).join(", ")), ". Provide the blinding key: it is used only inside the computation, and no blinded number is ever displayed (H₀ and D_Δt are shown as deviations from their posterior mean)."),
    el("div", { class: "ctl-row" }, input, button("Load key for computations", () => go(input.value), { kind: "primary" })),
    el("div", { class: "ctl-row" }, el("label", { class: "ctl-check" }, (() => { const c = el("input", { type: "checkbox" }); c.checked = true; c.addEventListener("change", () => { opts.session = c.checked; }); return c; })(), el("span", {}, "use for every run in this browser session (campaign key)")),
      el("label", { class: "ctl-check" }, (() => { const c = el("input", { type: "checkbox" }); c.addEventListener("change", () => { opts.device = c.checked; }); return c; })(), el("span", {}, "remember on this device"), el("span", { class: "muted small" }, " — anyone using this browser profile could then unblind"))),
    run.features.keyFile ? el("div", { class: "ctl-row" }, button("Use blinding_secret.key found in the run folder", async () => go(await run.keyFileContents()))) : null,
    status,
  );
  return box;
}

// Effective noise map consistent with the pipeline: the saved noise_map_effective.fits for MAP
// parameter sets, sqrt(sigma^2 + b^2 ps^2) with the sampled psf_error_b for posterior draws.
// boost=true: sigma_eff = sqrt(noise^2 + b^2 ps^2) with the sampled b (posterior draws) or the
// fitted b from psf_error_b_fit.json (MAP); boost=false: the plain noise map.
export async function effectiveSigma(run, resolved, psImage, { boost = true } = {}) {
  const noise = (await run.noise()).data;
  if (!boost) return { sigma: noise, note: "σ = noise map (no PSF-error boost)", b: 0 };
  let b = resolved.params.psf_error_b;
  let src = "sampled";
  if (b === undefined) { b = (await run.psfErrorB(resolved.stageKey)) ?? 0; src = "fitted"; }
  if (!b || !psImage) return { sigma: noise, note: b ? "σ = noise map (no point-source image for the boost)" : "σ = noise map (b = 0)", b: b || 0 };
  const sigma = new Float64Array(noise.length);
  for (let i = 0; i < sigma.length; i++) sigma[i] = Math.sqrt(noise[i] ** 2 + b * b * (psImage[i] || 0) ** 2);
  return { sigma, note: `σ_eff with b=${(+b).toFixed(3)} (${src})`, b };
}

// (data - model) / sigma, restricted to mask (NaN elsewhere)
export function residualNorm(data, model, sigma, mask = null) {
  const out = new Float64Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = mask && !mask[i] ? NaN : (data[i] - model[i]) / sigma[i];
  return out;
}

export function chi2Reduced(data, model, sigma, mask = null, nParams = 0) {
  let chi2 = 0, n = 0;
  for (let i = 0; i < data.length; i++) {
    if (mask && !mask[i]) continue;
    const r = (data[i] - model[i]) / sigma[i];
    if (!Number.isFinite(r)) continue;
    chi2 += r * r; n++;
  }
  return { chi2, n, red: chi2 / Math.max(1, n - nParams) };
}

export function maskFrom(f) { if (!f) return null; const m = new Uint8Array(f.data.length); for (let i = 0; i < m.length; i++) m[i] = f.data[i] > 0 ? 1 : 0; return m; }

export function pointSourcePositions(params) {
  const pts = [];
  for (let i = 0; params[`x_image_${i}`] !== undefined; i++) pts.push([params[`x_image_${i}`], params[`y_image_${i}`], String.fromCharCode(65 + i)]);
  return pts;
}

export function fmtNum(v, d = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e6)) return v.toExponential(2);
  return (+v.toFixed(d)).toString();
}
