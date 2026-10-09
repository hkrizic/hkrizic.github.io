import { el, section, row, number, checkbox, button, downloadPNG, badge, select } from "../ui/widgets.js";
import { Plot } from "../ui/plot.js";
import { runOf, runRow, otherRun, busy, errorBox, unblindUI } from "./common.js";
import { H0FromDdt, timeDelayDistance } from "../physics/cosmology.js";
import { histogram, kde1d, summarize } from "../core/stats.js";
import { series } from "../ui/theme.js";

// Blinding policy: H0 is computed from the TRUE D_dt samples (needs the key) and then
// blinded by subtracting its own posterior reference (TDCOSMO). Only widths/shapes are shown.
// Kinematics runs: the sampled D_dt is the lens-model distance; the physical distance is
// D_dt / (lambda_int (1 - kappa_ext)) and is the default here (alpaca.kinematics).

// D_dt (true values) of one run in the requested coordinate, plus what is shown on screen.
async function distanceSet(run, post, physical) {
  const blindedRun = post.blindedColumns.includes("D_dt") || (physical && post.blindedColumns.includes("kin_lambda_int"));
  const model = await run.trueColumn(post, "D_dt");
  let f = null, note = null;
  if (physical && run.massSheet.kinematics) {
    try { f = await run.massSheetFactor(post); } catch (e) { note = e.message; }
  }
  const usePhys = !!f;
  const ddt = model && f ? Float64Array.from(model, (d, i) => d / f.lamTot[i]) : model;
  // shown: absolute for unblinded runs, otherwise deviation from the posterior mean
  let shown = null;
  if (!blindedRun) shown = ddt || post.columns.D_dt;
  else if (ddt) shown = run.blindDerived(ddt).values;
  else if (!usePhys) shown = post.columns.D_dt; // stored column is already the blinded deviation
  return { ddt, shown, physical: usePhys, blindedRun, note, lam: f?.lam || null };
}

export default {
  id: "h0", title: "H₀ from D_Δt", icon: "H₀", description: "Time-delay distance posterior converted to H₀ (flat ΛCDM), including the mass sheet λ_int (1 − κ_ext) of kinematics runs. Blinded runs show H₀ and D_Δt as deviations from their posterior mean.", defaultSize: "m",
  available: (run) => run.features.posterior,
  create(ctx, state, panel) {
    Object.assign(state, { Om: state.Om ?? 0.3, bins: state.bins ?? 40, kde: state.kde ?? true, compare: state.compare ?? true, quantity: state.quantity || "h0", coordinate: state.coordinate || "physical" });
    const plotWrap = el("div", { class: "plot-wrap" });
    const info = el("div", { class: "cards" });
    panel.body.append(plotWrap, info);
    const plot = new Plot(plotWrap, { xlabel: "", ylabel: "density" });
    let sets = [];

    const load = () => busy(panel, "loading posterior", async () => {
      const run = runOf(ctx, state);
      const src = state.src && run.posteriorSources().some((s) => s.value === state.src) ? state.src : run.massSheetSource;
      const post = await run.posterior(src);
      if (!post.columns.D_dt) { panel.body.replaceChildren(errorBox("No D_dt column in the posterior (no time delays?).")); return; }
      const zl = state.zLens ?? run.catalog?.target?.z_lens ?? null;
      const zs = state.zSource ?? run.catalog?.target?.z_source ?? null;
      state.zLens = zl; state.zSource = zs;
      const physical = state.coordinate === "physical";
      const runs = [run];
      const other = otherRun(ctx, run);
      if (other && state.compare && other.features.posterior) runs.push(other);
      sets = [];
      for (const r of runs) {
        const p = r === run ? post : await r.posterior(r.massSheetSource);
        if (!p.columns.D_dt) continue;
        const d = await distanceSet(r, p, physical);
        const ddtStats = d.shown ? summarize(d.shown) : null;
        let h0Shown = null, h0Stats = null, h0Frac = null, h0Mode = null;
        if (d.ddt && zl != null && zs != null) {
          const h0 = Float64Array.from(d.ddt, (x) => H0FromDdt(x, zl, zs, state.Om));
          const st = summarize(h0);
          h0Frac = st.std / st.mean;
          if (d.blindedRun) { const b = r.blindDerived(h0); h0Shown = b.values; h0Mode = b.mode; }
          else h0Shown = h0;
          h0Stats = summarize(h0Shown);
        }
        // fractional precision: sigma / true mean (the mean itself is never shown for blinded runs)
        let ddtFrac = null;
        if (d.ddt) { const st = summarize(d.ddt); ddtFrac = st.std / st.mean; }
        // H0 precision (sigma of 1/D_dt over its mean, independent of the redshifts) without and with the mass sheet
        let modelFrac = null, physFrac = null;
        if (d.physical) {
          const inv = (arr) => { const st = summarize(Float64Array.from(arr, (x) => 1 / x)); return st.std / st.mean; };
          const m = await r.trueColumn(p, "D_dt");
          if (m) { modelFrac = inv(m); physFrac = inv(d.ddt); }
        }
        sets.push({ run: r, ...d, hasKey: !!d.ddt, ddtStats, ddtFrac, modelFrac, physFrac, h0Shown, h0Stats, h0Frac, h0Mode, src: p.src, color: r === run ? series(0) : series(1) });
      }
      const s0 = sets[0];
      info.innerHTML = "";
      const cards = [];
      const fmtPm = (st, d) => `+${(st.hi68 - st.median).toFixed(d)} −${(st.median - st.lo68).toFixed(d)}`;
      const ms = run.massSheet;
      const coordTag = s0.physical ? "physical" : ms.applies ? "lens model, λ = 1" : null;
      const msLine = s0.physical ? ` · D_Δt / [λ_int (1 − κ_ext)], κ_ext = ${ms.kappaExt}${ms.sampleLambda ? ", λ_int sampled" : `, λ_int = ${ms.lambdaFixed}`}` + (s0.modelFrac != null ? ` · H₀ precision ${(100 * s0.modelFrac).toFixed(2)} % for the lens model alone → ${(100 * s0.physFrac).toFixed(2)} % with the mass sheet` : "") : "";
      if (s0.h0Stats) {
        const st = s0.h0Stats;
        if (s0.blindedRun) {
          const unit = s0.h0Mode === "fractional" ? "" : " km/s/Mpc";
          cards.push(el("div", { class: "card" }, el("h3", {}, "H₀ (blinded)", badge(s0.h0Mode === "fractional" ? "fractional Δ" : "Δ from posterior mean", "warn"), coordTag ? badge(coordTag) : null),
            el("div", { class: "big" }, `σ = ${st.std.toFixed(s0.h0Mode === "fractional" ? 4 : 2)}${unit}`),
            el("div", { class: "muted small" }, `68 % interval ${fmtPm(st, s0.h0Mode === "fractional" ? 4 : 2)}${unit} · precision σ/H₀ = ${(100 * s0.h0Frac).toFixed(2)} % · flat ΛCDM Ωm=${state.Om}, z_l=${zl}, z_s=${zs}. Computed from the true values with the key; the absolute value is never shown.${msLine}`)));
        } else {
          cards.push(el("div", { class: "card" }, el("h3", {}, "H₀", coordTag ? badge(coordTag) : null), el("div", { class: "big" }, `${st.median.toFixed(2)} `, el("span", { class: "muted" }, fmtPm(st, 2))), el("div", { class: "muted small" }, `km/s/Mpc · flat ΛCDM Ωm=${state.Om} · z_l=${zl}, z_s=${zs} · ${(100 * s0.h0Frac).toFixed(2)} % precision (run not blinded)${msLine}`)));
        }
      } else if (s0.blindedRun && !s0.hasKey) {
        cards.push(el("div", { class: "card" }, el("h3", {}, "H₀ needs the blinding key"), el("div", { class: "muted small" }, `D_Δt${ms.sampleLambda && ms.kinematics ? " and λ_int are" : " is"} stored as a deviation from the mean, so H₀ cannot be derived without the key. The key is used only in the computation; H₀ will be shown as a blinded deviation too.`), unblindUI(run, load)));
      }
      if (s0.note && s0.hasKey) cards.push(el("div", { class: "card" }, el("h3", {}, "Physical distance unavailable"), el("div", { class: "muted small" }, s0.note + " Showing the lens-model distance (λ = 1).")));
      const sd = s0.ddtStats;
      if (sd) cards.push(el("div", { class: "card" }, el("h3", {}, s0.blindedRun ? "D_Δt (blinded)" : "D_Δt", s0.blindedRun ? badge("Δ from posterior mean", "warn") : null, coordTag ? badge(coordTag) : null),
        el("div", { class: "big" }, s0.blindedRun ? `σ = ${sd.std.toFixed(1)} Mpc` : `${sd.median.toFixed(1)} `, s0.blindedRun ? null : el("span", { class: "muted" }, `${fmtPm(sd, 1)} Mpc`)),
        el("div", { class: "muted small" }, `68 % interval ${fmtPm(sd, 1)} Mpc` + (s0.ddtFrac != null ? ` · precision σ/D_Δt = ${(100 * s0.ddtFrac).toFixed(2)} %` : (zl != null && zs != null ? ` · for H₀ ≈ 70 this is ≈ ${(100 * sd.std / timeDelayDistance(zl, zs, { H0: 70, Om: state.Om })).toFixed(2)} %` : "")))));
      if (zl == null || zs == null) cards.push(el("div", { class: "card" }, el("h3", {}, "Redshifts needed"), el("div", { class: "muted small" }, "No perturber catalog found: enter z_lens and z_source in the settings to convert D_Δt to H₀.")));
      info.append(...cards);

      const useH0 = state.quantity === "h0" && sets.some((s) => s.h0Shown);
      const blindedAny = sets.some((s) => s.blindedRun);
      const tag = s0.physical ? " physical" : "";
      plot.opts.xlabel = useH0 ? (blindedAny ? (s0.h0Mode === "fractional" ? `(H₀ − ⟨H₀⟩) / ⟨H₀⟩${tag} (blinded)` : `H₀ − ⟨H₀⟩ [km/s/Mpc]${tag} (blinded)`) : `H₀${tag} [km/s/Mpc]`) : (blindedAny ? `D_Δt − ⟨D_Δt⟩ [Mpc]${tag} (blinded)` : `D_Δt${tag} [Mpc]`);
      plot.render = (p) => {
        const items = [];
        let lo = Infinity, hi = -Infinity, ymax = 0;
        for (const s of sets) { const arr = useH0 ? s.h0Shown : s.shown; if (!arr) continue; const st = summarize(arr); lo = Math.min(lo, st.min); hi = Math.max(hi, st.max); }
        if (!(hi > lo)) return;
        const pad = (hi - lo) * 0.05; lo -= pad; hi += pad;
        for (const s of sets) {
          const arr = useH0 ? s.h0Shown : s.shown; if (!arr) continue;
          const hg = histogram(arr, { bins: state.bins, range: [lo, hi], density: true });
          const k = state.kde ? kde1d(arr, { range: [lo, hi] }) : null;
          ymax = Math.max(ymax, ...hg.counts, ...(k ? k.ys : [0]));
          items.push({ s, hg, k, st: summarize(arr) });
        }
        p.setRange(lo, hi, 0, ymax * 1.1);
        p.clip();
        for (const it of items) { p.bars(it.hg.edges, it.hg.counts, { color: it.s.color + "66" }); if (it.k) p.line(it.k.xs, it.k.ys, { color: it.s.color, width: 2 }); p.band(it.st.lo68, it.st.hi68, { color: it.s.color + "22" }); p.vline(it.st.median, { color: it.s.color }); }
        p.unclip();
        p.axes({ grid: true });
        if (sets.length > 1) p.legend(sets.map((s) => ({ color: s.color, label: `${s.run.label}: ${s.run.name}${s.physical ? " (physical)" : ""}` })));
      };
      plot.draw();
      panel.setStatus((s0.blindedRun ? (s0.hasKey ? "blinded · widths from true values" : "blinded · no key") : "not blinded") + (s0.physical ? " · physical distance" : ms.applies ? " · lens-model distance" : ""));
      settings();
    });

    const settings = () => {
      const run = runOf(ctx, state);
      const sources = run.posteriorSources();
      panel.settings.replaceChildren(
        runRow(ctx, state, load) || "",
        sources.length > 1 ? section("Posterior", row("Set", select(sources, state.src || run.massSheetSource, (v) => { state.src = v; load(); }))) : "",
        section("Cosmology",
          row("z_lens", number(state.zLens, (v) => { state.zLens = v; load(); }, { step: 0.0001, width: 90 })),
          row("z_source", number(state.zSource, (v) => { state.zSource = v; load(); }, { step: 0.0001, width: 90 })),
          row("Ωm", number(state.Om, (v) => { state.Om = v; load(); }, { step: 0.01, width: 70 })),
          el("div", { class: "muted small" }, "Flat ΛCDM; D_Δt ∝ 1/H₀ at fixed Ωm."),
        ),
        run.massSheet.kinematics ? section("Mass sheet",
          row("Distance", select([{ value: "physical", label: "physical: D_Δt / [λ_int (1 − κ_ext)]" }, { value: "model", label: "lens model (λ_int = 1, κ_ext = 0)" }], state.coordinate, (v) => { state.coordinate = v; load(); })),
          el("div", { class: "muted small" }, `Kinematics run (${run.massSheet.mode}): the sampled D_dt is the lens-model distance. κ_ext = ${run.massSheet.kappaExt}; ${run.massSheet.sampleLambda ? `λ_int sampled, U[${run.massSheet.lambdaRange.join(", ")}]` : `λ_int fixed at ${run.massSheet.lambdaFixed}`}. See the Mass-sheet applet for the degeneracy itself.`),
        ) : "",
        section("Plot",
          row("Quantity", el("span", {}, checkbox("H₀ (else D_Δt)", state.quantity === "h0", (v) => { state.quantity = v ? "h0" : "ddt"; load(); }))),
          row("Bins", number(state.bins, (v) => { state.bins = v; load(); }, { min: 5, max: 200, step: 5, width: 70 })),
          checkbox("KDE curve", state.kde, (v) => { state.kde = v; load(); }),
          ctx.app.runs.length > 1 ? checkbox("Overlay other run", state.compare, (v) => { state.compare = v; load(); }) : "",
          el("div", { class: "ctl-row" }, button("Export PNG", () => downloadPNG(plot.toPNG(), "H0.png"), { small: true })),
        ),
        run.features.blinded ? section("Blinding", el("div", { class: "muted small" }, run.hasKey ? `Key loaded from ${run.keySource || "input"}. H₀ is computed from the true D_Δt${run.massSheet.sampleLambda && run.massSheet.kinematics ? " and λ_int" : ""} and shown only as a deviation from its posterior mean.` : "D_dt is blinded; load the key (panel body or sidebar) to derive the H₀ width. Nothing unblinded is displayed.")) : "",
      );
    };
    settings();
    load();
    return { destroy() { plot.destroy(); }, state: () => state, refresh: load };
  },
};
