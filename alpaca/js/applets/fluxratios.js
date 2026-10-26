// Flux ratios and magnifications. For every posterior draw the macro-model magnification and parity of each
// point-source image come from the Jacobian of the full multi-plane lens equation (worker, central
// differences); model flux ratios |μ_i / μ_ref| are compared draw by draw with the fitted point-source
// amplitudes of the imaging, and with external fluxes typed in (mid-IR, radio, narrow lines: little
// microlensing). Flux ratios are invariant under the mass-sheet transformation. Blinded runs use the true
// parameters with the key; |μ| itself scales with the slope and is withheld, ratios and parities are shown.
// ALPACA's time-delay ratios (05_posterior/samples/time_delay_ratios.json, H0-independent) are listed too.
import { el, section, row, select, number, textInput, button, downloadPNG, badge, table } from "../ui/widgets.js";
import { Plot } from "../ui/plot.js";
import { runOf, runRow, busy, unblindUI, lensKey } from "./common.js";
import { summarize, kde1d } from "../core/stats.js";
import { THEME, series, alpha } from "../ui/theme.js";

const L = (i) => String.fromCharCode(65 + i);
const PARITY = { min: "minimum", sad: "saddle", max: "maximum" };
const parityOf = (mu, tr) => (mu < 0 ? "sad" : tr > 0 ? "min" : "max");
const fmtPm = (st, d = 2) => `${st.median.toFixed(d)} +${(st.hi68 - st.median).toFixed(d)} −${(st.median - st.lo68).toFixed(d)}`;
// imaging band from the data paths in the config (e.g. F200W), for labels
const bandOf = (run) => (JSON.stringify(run.config?.data || {}).match(/F\d{3,4}[WMN]{1,2}/) || [])[0] || "imaging";
const DRAWS = [{ value: "250", label: "250 draws" }, { value: "500", label: "500 draws" }, { value: "1000", label: "1000 draws" }, { value: "100000", label: "all draws" }];

// Vertical violin of samples centred on category position x (half-width w in x units).
function violin(p, x, arr, w, { stroke, fill }) {
  const st = summarize(arr);
  if (!(st.max > st.min)) { p.line([x - w, x + w], [st.median, st.median], { color: stroke, width: 2 }); return; }
  const k = kde1d(arr, { range: [st.min, st.max], n: 96 });
  const m = Math.max(...k.ys) || 1;
  const left = [], right = [];
  for (let i = 0; i < k.xs.length; i++) { const d = (k.ys[i] / m) * w; left.push([x - d, k.xs[i]]); right.push([x + d, k.xs[i]]); }
  p.polys([[...left, ...right.reverse()]], { stroke, fill, width: 1 });
  p.line([x - w, x + w], [st.median, st.median], { color: stroke, width: 1.6 });
}

function drawX(p, x, y, r = 4) {
  const X = p.X(x), Y = p.Y(y);
  p.ctx.save(); p.ctx.strokeStyle = THEME.fg; p.ctx.lineWidth = 1.6;
  p.ctx.beginPath(); p.ctx.moveTo(X - r, Y - r); p.ctx.lineTo(X + r, Y + r); p.ctx.moveTo(X - r, Y + r); p.ctx.lineTo(X + r, Y - r); p.ctx.stroke();
  p.ctx.restore();
}

// External fluxes typed for this lens (any normalisation), kept per lens so they never apply to another one.
function extEntry(run, state) {
  state.ext ||= {};
  return (state.ext[lensKey(run)] ||= { label: "mid-IR", f: {} });
}

function externalOf(run, state) {
  const e = state.ext?.[lensKey(run)];
  const f = Object.fromEntries(Object.entries(e?.f || {}).filter(([, v]) => Array.isArray(v) && v[0] > 0));
  return Object.keys(f).length ? { label: e.label || "external", f } : null;
}

export default {
  id: "fluxratios", title: "Flux ratios & magnifications", icon: "μ", description: "Macro-model magnification and parity of every image for each posterior draw (exact multi-plane Jacobian), model flux ratios against the fitted point-source amplitudes and external (e.g. mid-IR) fluxes, and ALPACA's H₀-independent time-delay ratios.", defaultSize: "l",
  available: (run) => run.features.posterior && run.paramSummary.some((r) => r.name === "x_image_1"),
  create(ctx, state, panel) {
    Object.assign(state, { draws: state.draws || "1000" });
    const body = el("div");
    panel.body.append(body);
    let plot = null, nImg = 0;

    const load = () => busy(panel, "ray-tracing the images of every draw", async () => {
      plot && plot.destroy(); plot = null;
      body.innerHTML = "";
      const run = runOf(ctx, state);
      const band = bandOf(run);
      const blinded = run.features.blinded;
      const map = await run.mapMagnifications().catch((e) => { console.warn("MAP magnifications", e); return null; });
      if (run.needsKey) {
        body.append(el("div", { class: "cards" }, el("div", { class: "card" }, el("h3", {}, "Posterior magnifications need the blinding key"),
          el("div", { class: "muted small" }, "The Jacobian is evaluated with the true slope; the key is used only in the computation, and |μ| stays hidden while the run is blinded."), unblindUI(run, load))));
        settings();
        return;
      }
      const { spec } = await run.ensureForwardModel("final");
      const M = await run.imageMagnifications(+state.draws);
      nImg = M.nImg;
      const ref = Math.min(nImg - 1, state.ref ?? nImg - 1);
      const n = M.n, step = M.idx.length > 1 ? M.idx[1] - M.idx[0] : 1;
      const at =(arr, k) => Float64Array.from({ length: n }, (_, i) => arr[i * nImg + k]);
      const absMu = Array.from({ length: nImg }, (_, k) => Float64Array.from(at(M.mu, k), Math.abs));
      const amp = Array.from({ length: nImg }, (_, k) => M.columns[`log_ps_amp_${k}`] || null);
      const ext = externalOf(run, state);
      const extRatio = (k) => {
        const a = ext?.f[L(k)], b = ext?.f[L(ref)];
        if (!a || !b) return null;
        const v = a[0] / b[0];
        return { v, s: v * Math.hypot((a[1] || 0) / a[0], (b[1] || 0) / b[0]) };
      };

      // per image: parity, |mu|, model ratio, fitted ratio, their per-draw difference in magnitudes
      const rows = [], plotItems = [];
      let parityAgree = 0;
      const majority = [];
      for (let k = 0; k < nImg; k++) {
        const counts = { min: 0, sad: 0, max: 0 };
        for (let i = 0; i < n; i++) counts[parityOf(M.mu[i * nImg + k], M.trace[i * nImg + k])]++;
        majority[k] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      }
      for (let i = 0; i < n; i++) { let ok = true; for (let k = 0; k < nImg; k++) if (parityOf(M.mu[i * nImg + k], M.trace[i * nImg + k]) !== majority[k][0]) ok = false; if (ok) parityAgree++; }
      for (let k = 0; k < nImg; k++) {
        const isRef = k === ref;
        const model = Float64Array.from(absMu[k], (v, i) => v / absMu[ref][i]);
        const fitted = amp[k] && amp[ref] ? Float64Array.from(amp[k], (v, i) => Math.exp(v - amp[ref][i])) : null;
        const dm = fitted ? Float64Array.from(fitted, (v, i) => -2.5 * Math.log10(v / model[i])) : null;
        const sm = summarize(model), sf = fitted ? summarize(fitted) : null, sd = dm ? summarize(dm) : null;
        const e = isRef ? null : extRatio(k);
        const mapRatio = map ? Math.abs(map.mu[k] / map.mu[ref]) : null;
        const pull = e ? (e.v - sm.median) / Math.hypot(e.s, sm.std) : null;
        const [ptype, pcount] = majority[k];
        rows.push([
          el("b", {}, L(k) + (isRef ? " (ref)" : "")),
          `${PARITY[ptype]}${pcount < n ? ` (${((100 * pcount) / n).toFixed(0)} %)` : ""}${map && parityOf(map.mu[k], map.trace[k]) !== ptype ? " · MAP differs" : ""}`,
          blinded ? el("span", { class: "muted" }, "blinded") : fmtPm(summarize(absMu[k])),
          isRef ? "1" : fmtPm(sm, 3),
          mapRatio == null || isRef ? "–" : mapRatio.toFixed(3),
          isRef || !sf ? "–" : fmtPm(sf, 3),
          isRef || !sd ? "–" : el("span", { class: Math.abs(sd.median) > 2 * sd.std && Math.abs(sd.median) > 0.1 ? "bad" : "" }, `${sd.median >= 0 ? "+" : ""}${sd.median.toFixed(2)} ± ${sd.std.toFixed(2)}`),
          e ? `${e.v.toFixed(3)} ± ${e.s.toFixed(3)}` : "–",
          pull == null ? "–" : el("span", { class: Math.abs(pull) > 3 ? "bad" : "" }, `${pull >= 0 ? "+" : ""}${pull.toFixed(1)} σ`),
        ]);
        if (!isRef) plotItems.push({ k, model, fitted, e, mapRatio });
      }

      // source-plane consistency: rms distance of the images' source positions from their mean, per draw
      const rms = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        let mx = 0, my = 0;
        for (let k = 0; k < nImg; k++) { mx += M.bx[i * nImg + k]; my += M.by[i * nImg + k]; }
        mx /= nImg; my /= nImg;
        let s = 0;
        for (let k = 0; k < nImg; k++) s += (M.bx[i * nImg + k] - mx) ** 2 + (M.by[i * nImg + k] - my) ** 2;
        rms[i] = 1000 * Math.sqrt(s / nImg);
      }
      const srms = summarize(rms);

      const cards = el("div", { class: "cards" });
      body.append(cards);
      cards.append(el("div", { class: "card" }, el("h3", {}, "Parities", badge(`${n} draws`)),
        el("div", { class: "big" }, Array.from({ length: nImg }, (_, k) => `${L(k)} ${majority[k][0] === "sad" ? "−" : "+"}`).join("  ")),
        el("div", { class: "muted small" }, `+ minimum / maximum, − saddle (sign of det A at each image). The same parity set in ${((100 * parityAgree) / n).toFixed(1)} % of the draws. A quad has two minima and two saddles around a smooth lens.`)));
      cards.append(el("div", { class: "card" }, el("h3", {}, "Source-plane consistency"),
        el("div", { class: "big" }, `${srms.median.toFixed(1)} mas`),
        el("div", { class: "muted small" }, `Median over draws of the rms scatter of the images' ray-traced source positions (68 %: ${srms.lo68.toFixed(1)}–${srms.hi68.toFixed(1)} mas)${spec.approxPlanes ? " · perturber geometry approximate (catalog missing)" : ""}.`)));

      // plot: model vs fitted vs external flux ratios
      const wrap = el("div", { class: "plot-wrap" });
      body.append(el("div", { class: "plot-cell", style: { padding: "0 14px" } }, el("h3", {}, `Flux ratios f / f_${L(ref)}`), wrap,
        el("div", { class: "muted small" }, `Black: lens model |μ / μ_${L(ref)}| per posterior draw (× = MAP). Grey: fitted ${band} point-source amplitudes, same draws.${ext ? ` Cross with bar: ${ext.label}.` : " Enter external fluxes (e.g. mid-IR) in the settings to test the macro model where microlensing is small."}`)));
      plot = new Plot(wrap, { ylabel: `f / f_${L(ref)}`, margin: { l: 52, r: 14, t: 12, b: 30 } });
      plot.render = (p) => {
        let lo = Infinity, hi = -Infinity;
        for (const it of plotItems) for (const a of [it.model, it.fitted]) if (a) { const s = summarize(a); lo = Math.min(lo, s.lo95); hi = Math.max(hi, s.hi95); }
        for (const it of plotItems) if (it.e) { lo = Math.min(lo, it.e.v - it.e.s); hi = Math.max(hi, it.e.v + it.e.s); }
        for (const it of plotItems) if (it.mapRatio != null) { lo = Math.min(lo, it.mapRatio); hi = Math.max(hi, it.mapRatio); }
        if (!(hi > lo)) { lo -= 0.5; hi += 0.5; }
        const pad = (hi - lo) * 0.08;
        p.setRange(0.4, plotItems.length + 0.6, Math.max(0, lo - pad), hi + 3.5 * pad); // headroom for the legend
        p.axes({ xticks: false, grid: true });
        p.clip();
        p.hline(1, { color: THEME.faint });
        plotItems.forEach((it, c) => {
          const x = c + 1;
          violin(p, x - 0.17, it.model, 0.15, { stroke: series(0), fill: alpha(THEME.fg, 0.12) });
          if (it.fitted) violin(p, x + 0.17, it.fitted, 0.15, { stroke: series(1), fill: alpha("#8c8c8c", 0.25) });
          if (it.mapRatio != null) drawX(p, x - 0.17, it.mapRatio);
          if (it.e) { p.line([x, x], [it.e.v - it.e.s, it.e.v + it.e.s], { color: THEME.fg, width: 1.5 }); drawX(p, x, it.e.v, 5); }
        });
        p.unclip();
        plotItems.forEach((it, c) => p.text(p.X(c + 1), p.rect.y + p.rect.h + 6, `${L(it.k)} / ${L(ref)}`, { px: true, align: "center", baseline: "top" }));
        p.legend([{ color: alpha(THEME.fg, 0.3), label: "lens model" }, ...(plotItems.some((it) => it.fitted) ? [{ color: alpha("#8c8c8c", 0.5), label: `${band} fit` }] : [])], { x: p.rect.x + p.rect.w - 110 });
      };
      plot.draw();

      const heads = ["image", "parity", "|μ|", `model f/f_${L(ref)}`, "MAP", `${band} fit`, `Δm fit − model [mag]`, ext ? ext.label : "external", "pull"];
      body.append(el("div", { class: "table-wrap" }, table(heads, rows)),
        el("div", { class: "muted small", style: { padding: "0 14px 10px" } }, `68 % intervals over ${n} draws${step > 1 ? ` (1 in ${step} samples)` : ""}. Δm is evaluated draw by draw (joint posterior), so shared model uncertainty cancels; underlined: |Δm| > 0.1 mag at > 2σ, or an external pull beyond 3σ. Macro-model ratios ignore microlensing, millilensing and dust, which mostly affect the optical / near-IR fluxes. Flux ratios are mass-sheet invariant${blinded ? "; |μ| is withheld while the run is blinded (it scales with the slope)" : ""}.`));

      // ALPACA's time-delay ratios (D_dt cancels)
      const td = await run.json("05_posterior/samples/time_delay_ratios.json");
      if (td?.rows?.length) {
        const q = (a) => (Array.isArray(a) ? `${a[1].toFixed(3)} +${(a[2] - a[1]).toFixed(3)} −${(a[1] - a[0]).toFixed(3)}` : "–");
        body.append(el("div", { class: "cards" }, el("div", { class: "card" }, el("h3", {}, `Time-delay ratios Δt / Δt(${td.normalised_by})`, badge("H₀-independent")),
          table(["pair", "measured", "model", "pull"], td.rows.map((r) => [r.pair, q(r.ratio_measured_mc), q(r.ratio_model), el("span", { class: Math.abs(r.pull) > 2 ? "bad" : "" }, `${r.pull >= 0 ? "+" : ""}${r.pull.toFixed(2)}`)]), { class: "wrap" }),
          el("div", { class: "muted small" }, `From ALPACA (${td.n_model_draws} model draws): shape χ² = ${td.chi2_shape?.toFixed(2)} for ${td.dof} dof${td.p_value != null ? `, p = ${td.p_value.toFixed(2)}` : ""}. ${td.note || ""}`))));
      }
      panel.setStatus(`${n} draws · reference ${L(ref)}${map ? " · MAP shown" : ""}${blinded ? " · blinded: |μ| withheld" : ""}`);
      settings();
    });

    const settings = () => {
      const run = runOf(ctx, state);
      const n = nImg || (run.paramSummary.filter((r) => /^x_image_\d+$/.test(r.name)).length);
      const ref = Math.min(n - 1, state.ref ?? n - 1);
      const ext = extEntry(run, state);
      const setF = (k, j) => (v) => { const cur = ext.f[L(k)] || [null, null]; cur[j] = v; ext.f[L(k)] = cur; load(); };
      panel.settings.replaceChildren(
        runRow(ctx, state, load) || "",
        section("Ratios",
          row("Reference", select(Array.from({ length: n }, (_, k) => ({ value: String(k), label: `image ${L(k)}` })), String(ref), (v) => { state.ref = +v; load(); })),
          row("Draws", select(DRAWS, state.draws, (v) => { state.draws = v; load(); })),
        ),
        section("External fluxes",
          row("Data set", textInput(ext.label, (v) => { ext.label = v || "external"; load(); }, { width: 140 })),
          ...Array.from({ length: n }, (_, k) => row(`f_${L(k)} ± σ`, number(ext.f[L(k)]?.[0] ?? null, setF(k, 0), { step: 0.001, width: 80 }), number(ext.f[L(k)]?.[1] ?? null, setF(k, 1), { step: 0.001, width: 70 }))),
          el("div", { class: "muted small" }, "Any normalisation (e.g. B/D, C/D … with D = 1). Stored for this lens only."),
          el("div", { class: "ctl-row" }, button("Clear", () => { ext.f = {}; load(); }, { small: true })),
        ),
        section("Export", el("div", { class: "ctl-row" }, button("Export plot (PNG)", () => plot && downloadPNG(plot.toPNG(), "flux_ratios.png"), { small: true }))),
      );
    };
    settings();
    load();
    return { destroy() { plot && plot.destroy(); }, state: () => state, refresh: load };
  },
};
