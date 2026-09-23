import { el, kv, table, badge, fmtSec, section } from "../ui/widgets.js";
import { runOf, runRow, fmtNum } from "./common.js";

function card(title, ...children) { return el("div", { class: "card" }, el("h3", {}, title), ...children); }

export default {
  id: "overview", title: "Run overview", icon: "◎", description: "Configuration, stages, timing, fit quality and sampler diagnostics at a glance.", defaultSize: "l",
  available: () => true,
  create(ctx, state, panel) {
    const render = () => {
      const run = runOf(ctx, state);
      panel.body.innerHTML = "";
      panel.settings.replaceChildren(runRow(ctx, state, render) || el("div", { class: "muted" }, "Single run loaded."));
      const c = run.config || {};
      const grid = el("div", { class: "cards" });
      const stagesFinal = run.stages[run.stages.length - 1];
      const blindBadge = run.features.blinded ? badge(run.offsets ? "BLINDED · key loaded" : "BLINDED · no key", "warn") : badge("not blinded", "ok");
      grid.append(card("Run",
        kv([
          ["Folder", run.name],
          ["Sampler", run.sampler],
          ["Source model", run.sourceType],
          ["Lens mass", c.mass?.main?.profile || c.model?.lens_mass?.profile || "EPL+Shear"],
          ["Lens light", run.stages.find((s) => s.key === "lens_light_refit") ? (c.light?.lens?.refit?.profile || "refit") : (c.light?.lens?.initial || "sersic")],
          ["PSF mode", c.psf?.mode || "?"],
          ["Pixel scale", run.pixScale ? `${run.pixScale.toFixed(5)} "/px` : "–"],
          ["Cutout", c.data?.cutout_size ? `${c.data.cutout_size} px` : "–"],
          ["Posterior", run.posteriorSummary ? `${run.posteriorSummary.nSamples} samples × ${run.posteriorSummary.nParams} params` : "–"],
          ["Blinding", blindBadge],
          ["Perturber catalog", run.catalog ? badge("found: " + run.catalogPath, "ok") : badge("not found (drop the experiment folder incl. data/)", "warn")],
        ])));
      // fit quality
      const q = [];
      for (const s of run.stages) if (s.summary?.chi2_red != null) q.push([`χ²ᵥ (${s.label})`, fmtNum(s.summary.chi2_red, 3)]);
      if (run.bic) { q.push(["BIC", fmtNum(run.bic.bic, 1)], ["log L max", fmtNum(run.bic.log_L_max, 1)], ["n params / n pixels", `${run.bic.n_params} / ${run.bic.n_pixels}`]); }
      if (run.rayTracing) q.push(["Ray-tracing spread", `${fmtNum(run.rayTracing.mean_spread_mas, 2)} mas (${run.rayTracing.quality})`]);
      const flags = run.boundaryFlags.filter((f) => f.status === "FLAG");
      q.push(["Prior-boundary flags", flags.length ? badge(`${flags.length}: ${flags.map((f) => f.name).join(", ")}`, "warn") : badge("none", "ok")]);
      grid.append(card("Fit quality", kv(q)));
      // stages
      if (run.stages.length) {
        grid.append(card("Gradient-descent stages", table(["#", "Stage", "Status", "χ²ᵥ", "Loss", "Time", "PSF"],
          run.stages.map((s, i) => [String(s.summary?.index ?? i + 1), s.label, badge(s.summary?.status || "?", s.summary?.status === "done" ? "ok" : ""), fmtNum(s.summary?.chi2_red, 3), fmtNum(s.summary?.loss, 1), fmtSec(s.summary?.elapsed_s), s.summary?.psf_mode || "–"]))));
      }
      // timing
      if (run.timing) {
        const t = run.timing;
        const parts = [["Total", t.total_runtime_s], ["Multistart / GD", t.multistart_optimization_s], ["Posterior sampling", t.posterior_sampling_s]];
        if (t.staged_joint) for (const [k, v] of Object.entries(t.staged_joint)) parts.push(["  · " + k, v]);
        const max = t.total_runtime_s || 1;
        grid.append(card("Timing", el("div", { class: "bars" }, ...parts.map(([k, v]) => el("div", { class: "bar-row" }, el("span", { class: "bar-label" }, k), el("span", { class: "bar" }, el("span", { class: "bar-fill", style: { width: `${Math.min(100, (100 * (v || 0)) / max)}%` } })), el("span", { class: "bar-val" }, fmtSec(v)))))));
      }
      // sampler diagnostics
      if (run.diagnostics) {
        const d = run.diagnostics;
        const rh = d.r_hat ? Object.entries(d.r_hat).sort((a, b) => b[1] - a[1]) : [];
        const bad = rh.filter(([, v]) => v > 1.1).length;
        grid.append(card("Sampler diagnostics", kv([
          ["Acceptance", d.acceptance_rate != null ? fmtNum(d.acceptance_rate, 3) : "–"],
          ["Divergences", d.divergence_count != null ? `${d.divergence_count} (${fmtNum(100 * (d.divergence_rate || 0), 2)} %)` : "–"],
          ["Max tree depth", d.max_tree_depth != null ? `${d.max_tree_depth} (saturation ${fmtNum(100 * (d.tree_depth_saturation_frac || 0), 0)} %)` : "–"],
          ["R̂ > 1.1", rh.length ? badge(`${bad} of ${rh.length}`, bad ? "warn" : "ok") : "–"],
          ["Worst R̂", rh.slice(0, 6).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(" · ") || "–"],
          ["Runtime", fmtSec(d.runtime)],
        ])));
      }
      // perturbers
      const bf = run.paramSummary.length ? run.paramSummary : [];
      const pertNames = [...new Set(bf.map((r) => (/^(pert\d+)_/.exec(r.name) || [])[1]).filter(Boolean))];
      if (pertNames.length) {
        const zl = run.catalog?.target?.z_lens;
        grid.append(card("Line-of-sight perturbers", table(["Name", "z", "Plane", "θE (median)", "Notes"], pertNames.map((nm) => {
          const id = +nm.slice(4);
          const cat = run.catalog?.perturbers?.find((p) => +p.id === id);
          const z = cat?.redshift?.z ?? null;
          const plane = z == null || zl == null ? "?" : Math.abs(z - zl) <= (run.config?.mass?.perturbers?.z_tolerance ?? 0.01) ? "main" : z < zl ? "foreground" : "background";
          const te = bf.find((r) => r.name === nm + "_theta_E");
          return [nm, z == null ? "–" : z.toFixed(4), plane, te ? fmtNum(te.median, 3) : "–", cat?.notes || ""];
        })), zl != null ? el("div", { class: "muted small" }, `z_lens = ${zl}, z_source = ${run.catalog.target.z_source}`) : null));
      }
      // point sources
      const ps = bf.filter((r) => /^x_image_\d+$/.test(r.name));
      if (ps.length) {
        grid.append(card("Point-source images (posterior medians)", table(["Image", "x [\"]", "y [\"]", "log amp", "Δx", "Δy"], ps.map((r, i) => {
          const g = (n) => bf.find((q) => q.name === n);
          return [String.fromCharCode(65 + i), fmtNum(r.median, 4), fmtNum(g(`y_image_${i}`)?.median, 4), fmtNum(g(`log_ps_amp_${i}`)?.median, 3), fmtNum(g(`offset_x_image_${i}`)?.median, 4), fmtNum(g(`offset_y_image_${i}`)?.median, 4)];
        }))));
      }
      // config
      const pre = el("pre", { class: "json" }, JSON.stringify(c, null, 2));
      grid.append(card("Configuration", el("details", {}, el("summary", {}, "config.json"), pre)));
      panel.body.append(grid);
    };
    render();
    return { destroy() {}, state: () => state, refresh: render };
  },
};
