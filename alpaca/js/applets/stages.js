import { el, section, row, select, table, badge, fmtSec, kv, button, downloadPNG } from "../ui/widgets.js";
import { Plot } from "../ui/plot.js";
import { runOf, runRow, busy, fmtNum } from "./common.js";
import { THEME, series } from "../ui/theme.js";

export default {
  id: "stages", title: "Optimisation & stages", icon: "↘", description: "Multi-start losses and χ², per-stage loss curves, lens-light refit diagnostics and the PSF-error fit.", defaultSize: "m",
  available: (run) => run.stages.length > 0 || run.has("03_multistart/multi_start_summary.json"),
  create(ctx, state, panel) {
    Object.assign(state, { view: state.view || "loss" });
    const body = el("div", { class: "stack" });
    panel.body.append(body);
    let plots = [];
    const load = () => busy(panel, "loading", async () => {
      const run = runOf(ctx, state);
      plots.forEach((p) => p.destroy()); plots = []; body.innerHTML = "";
      const ms = await run.json("03_multistart/multi_start_summary.json");
      if (state.view === "loss") {
        // loss curves per stage
        const curves = [];
        for (const s of run.stages) {
          const p = `03_multistart/${s.dir}/loss_curve.npy`;
          if (run.has(p)) { const a = await run.npy(p); curves.push({ label: s.label, data: a.data }); }
        }
        if (curves.length) {
          const wrap = el("div", { class: "plot-wrap" }); body.append(el("h3", {}, "Loss curves"), wrap);
          const plot = new Plot(wrap, { xlabel: "step", ylabel: "loss − min" });
          plot.render = (p) => {
            let xmax = 0, ymin = Infinity, ymax = -Infinity;
            const items = curves.map((c, i) => { const mn = Math.min(...c.data); const ys = Float64Array.from(c.data, (v) => Math.log10(Math.max(1e-6, v - mn + 1e-6))); const xs = Float64Array.from(ys, (_, k) => k); xmax = Math.max(xmax, xs.length); for (const v of ys) { ymin = Math.min(ymin, v); ymax = Math.max(ymax, v); } return { c, xs, ys, color: series(i) }; });
            p.setRange(0, xmax, ymin - 0.2, ymax + 0.2); p.clip();
            for (const it of items) p.line(it.xs, it.ys, { color: it.color });
            p.unclip(); p.axes({ ylabel: "log10(loss − min)", grid: true }); p.legend(items.map((it) => ({ color: it.color, label: it.c.label })));
          };
          plot.draw(); plots.push(plot);
        }
        if (ms) {
          const rows = [];
          const push = (label, arr) => { if (Array.isArray(arr) && arr.length) rows.push([label, arr.length, fmtNum(Math.min(...arr), 3), fmtNum(Math.max(...arr), 3)]); };
          push("initial χ²ᵥ", ms.initial_chi2_reds); push("refinement χ²ᵥ", ms.refinement_chi2_reds); push("all χ²ᵥ", ms.chi2_reds); push("initial losses", ms.initial_losses); push("all losses", ms.all_losses);
          body.append(el("h3", {}, "Multi-start summary"), kv([["Starts", ms.n_starts_initial], ["Top for refinement", ms.n_top_for_refinement], ["Total optimisations", ms.total_optimizations], ["Best χ²ᵥ", fmtNum(ms.best_chi2_red, 4)], ["Best loss", fmtNum(ms.best_loss, 2)], ["Best from", `${ms.best_from_phase} (run ${ms.best_run})`], ["Threshold χ²ᵥ", ms.chi2_red_threshold], ["Time", fmtSec(ms.total_time_seconds)]]));
          if (rows.length) body.append(table(["Set", "n", "min", "max"], rows));
          if (Array.isArray(ms.chi2_reds) && ms.chi2_reds.length > 1) {
            const wrap = el("div", { class: "plot-wrap small" }); body.append(wrap);
            const plot = new Plot(wrap, { xlabel: "start #", ylabel: "χ²ᵥ" });
            plot.render = (p) => { const ys = ms.chi2_reds.map(Number); const xs = ys.map((_, i) => i); p.setRange(-0.5, ys.length - 0.5, 0, Math.max(...ys) * 1.1); p.clip(); p.scatter(xs, ys, { color: THEME.fg, radius: 4 }); p.hline(ms.chi2_red_threshold, { color: "rgba(0,0,0,0.5)" }); p.unclip(); p.axes({ grid: true }); };
            plot.draw(); plots.push(plot);
          }
        }
      } else if (state.view === "stages") {
        body.append(table(["Stage", "Status", "χ²ᵥ", "Loss", "Steps", "Time", "PSF", "Init from"], run.stages.map((s) => [s.label, badge(s.summary?.status || "?", s.summary?.status === "done" ? "ok" : "warn"), fmtNum(s.summary?.chi2_red, 3), fmtNum(s.summary?.loss, 1), s.summary?.n_steps ?? "–", fmtSec(s.summary?.elapsed_s), s.summary?.psf_mode || "–", s.summary?.init_from || "–"])));
        const pe = await run.json("03_multistart/stage3_cf_joint/psf_error_b_fit.json") || (await Promise.all(run.stages.map((s) => run.json(`03_multistart/${s.dir}/psf_error_b_fit.json`)))).find(Boolean);
        if (pe) body.append(el("h3", {}, "PSF-error noise inflation"), kv([["b (fit)", fmtNum(pe.b_fit, 4)], ["b max", pe.b_max], ["gain", fmtNum(pe.gain, 1)], ["railed", pe.railed ? badge("yes", "warn") : badge("no", "ok")], ["mode", pe.mode]]));
        for (const s of run.stages) if (s.summary?.lens_shift_flag) body.append(el("div", { class: "warn" }, badge("lens shift flag", "warn"), ` raised in ${s.label}`));
      } else if (state.view === "refit") {
        const dir = run.stages.find((s) => s.key === "lens_light_refit");
        const refit = dir ? await run.json(`03_multistart/${dir.dir}/refit.json`) : null;
        if (!refit) { body.append(el("div", { class: "muted" }, "No lens-light refit stage in this run.")); return; }
        body.append(kv([["Profile", refit.flags?.lens_light], ["Sky background", String(refit.use_sky_background)], ["PS treatment", refit.ps_treatment], ["Fit pixels", refit.n_fit_pixels], ["Loss initial → final", `${fmtNum(refit.loss_initial, 1)} → ${fmtNum(refit.loss_final, 1)}`], ["Railed", (refit.railed_params || []).join(", ") || "none"]]));
        body.append(table(["Component", "amp", "R_sersic", "n", "e1", "e2", "x", "y"], (refit.kwargs_lens_light || []).map((k, i) => [k.R_sersic !== undefined ? `Sersic ${i + 1}` : "sky", fmtNum(k.amp, 3), fmtNum(k.R_sersic, 4), fmtNum(k.n_sersic, 3), fmtNum(k.e1, 4), fmtNum(k.e2, 4), fmtNum(k.center_x, 4), fmtNum(k.center_y, 4)])));
        const rp = `03_multistart/${dir.dir}/radial_profile.npz`;
        if (run.has(rp)) {
          const z = await run.npz(rp);
          const wrap = el("div", { class: "plot-wrap" }); body.append(el("h3", {}, "Radial profile"), wrap);
          const plot = new Plot(wrap, { xlabel: "r [arcsec]", ylabel: "log10 I" });
          plot.render = (p) => {
            const r = z.r.data, I = Float64Array.from(z.I_light.data, (v) => Math.log10(Math.max(1e-6, v))), R = Float64Array.from(z.I_residual.data, (v) => Math.log10(Math.max(1e-6, Math.abs(v))));
            p.setRange(0, Math.max(...r) * 1.05, Math.min(...I, ...R) - 0.2, Math.max(...I) + 0.2); p.clip(); p.line(r, I, { color: THEME.fg }); p.line(r, R, { color: THEME.muted, dash: [4, 3] });
            if (z.arc_band) p.band(z.arc_band.data[0], z.arc_band.data[1], { color: "rgba(255,255,255,0.08)" });
            p.unclip(); p.axes({ grid: true }); p.legend([{ color: THEME.fg, label: "lens light" }, { color: THEME.muted, label: "|residual|" }]);
          };
          plot.draw(); plots.push(plot);
        }
      }
    });
    const settings = () => {
      panel.settings.replaceChildren(
        runRow(ctx, state, load) || "",
        section("View", row("Show", select([{ value: "loss", label: "Loss curves & multi-start" }, { value: "stages", label: "Stage table & PSF error" }, { value: "refit", label: "Lens-light refit" }], state.view, (v) => { state.view = v; load(); }))),
      );
    };
    settings();
    load();
    return { destroy() { plots.forEach((p) => p.destroy()); }, state: () => state, refresh: load };
  },
};
