import { el, section, row, select, paramPicker, number, kv, badge, button, downloadPNG } from "../ui/widgets.js";
import { Plot } from "../ui/plot.js";
import { runOf, runRow, busy, errorBox, fmtNum } from "./common.js";
import { paramGroup } from "../core/run.js";
import { mean, std } from "../core/stats.js";
import { THEME } from "../ui/theme.js";

// crude autocorrelation time (Sokal-style window) for a single chain
function autocorrTime(x) {
  const n = x.length, m = mean(x), s = std(x, m);
  if (!(s > 0)) return NaN;
  let tau = 1;
  for (let lag = 1; lag < Math.min(n / 3, 200); lag++) {
    let r = 0;
    for (let i = 0; i + lag < n; i++) r += (x[i] - m) * (x[i + lag] - m);
    r /= (n - lag) * s * s;
    if (r < 0.05) break;
    tau += 2 * r;
  }
  return tau;
}

export default {
  id: "diagnostics", title: "Sampler diagnostics", icon: "∿", description: "R̂ per parameter, acceptance and divergences, trace plots and autocorrelation-based effective sample sizes.", defaultSize: "m",
  available: (run) => run.features.posterior || run.features.nutsDiag,
  create(ctx, state, panel) {
    Object.assign(state, { view: state.view || "rhat", params: state.params || ["lens_theta_E", "lens_gamma", "D_dt"], topN: state.topN ?? 25 });
    const body = el("div", { class: "stack" });
    panel.body.append(body);
    let plots = [];
    let names = [];
    const load = () => busy(panel, "loading", async () => {
      const run = runOf(ctx, state);
      plots.forEach((p) => p.destroy()); plots = []; body.innerHTML = "";
      const d = run.diagnostics;
      if (state.view === "rhat") {
        if (!d) { body.append(errorBox("No sampler diagnostics JSON in this run.")); return; }
        body.append(kv([["Engine", run.sampler], ["Acceptance", fmtNum(d.acceptance_rate, 3)], ["Divergences", `${d.divergence_count ?? "–"} (${fmtNum(100 * (d.divergence_rate || 0), 2)} %)`], ["Max tree depth", `${d.max_tree_depth ?? "–"} · saturation ${fmtNum(100 * (d.tree_depth_saturation_frac || 0), 0)} %`]]));
        const rh = Object.entries(d.r_hat || {}).sort((a, b) => b[1] - a[1]).slice(0, state.topN);
        if (rh.length) {
          const wrap = el("div", { class: "plot-wrap", style: { height: Math.max(220, rh.length * 16 + 50) + "px" } }); body.append(el("h3", {}, `R̂ (worst ${rh.length})`), wrap);
          const plot = new Plot(wrap, { margin: { l: 150, r: 14, t: 10, b: 30 }, xlabel: "R̂" });
          plot.render = (p) => {
            const xmax = Math.max(1.2, ...rh.map((r) => r[1]));
            p.setRange(1, xmax, -0.5, rh.length - 0.5); p.clip();
            rh.forEach(([, v], i) => { const y = rh.length - 1 - i; const c = v > 1.1 ? "#000000" : v > 1.05 ? "#8c8c8c" : "#d4d4d4"; p.ctx.fillStyle = c; p.ctx.fillRect(p.X(1), p.Y(y + 0.35), p.X(v) - p.X(1), p.Y(y - 0.35) - p.Y(y + 0.35)); });
            p.vline(1.1, { color: "rgba(0,0,0,0.7)" }); p.vline(1.05, { color: "rgba(0,0,0,0.3)" }); p.unclip(); p.axes({ yticks: false });
            rh.forEach(([k], i) => p.text(p.rect.x - 6, p.Y(rh.length - 1 - i), k, { align: "right", baseline: "middle", px: true }));
          };
          plot.draw(); plots.push(plot);
        }
      } else if (state.view === "trace") {
        if (!run.features.posterior) { body.append(errorBox("No posterior samples.")); return; }
        const post = await run.posterior();
        names = post.scalarNames;
        state.params = state.params.filter((p) => names.includes(p));
        if (!state.params.length) state.params = names.slice(0, 3);
        for (const nm of state.params) {
          const x = post.columns[nm];
          const tau = autocorrTime(x);
          const wrap = el("div", { class: "plot-wrap small" });
          body.append(el("div", { class: "ctl-row" }, el("b", {}, nm), el("span", { class: "muted small" }, `τ ≈ ${fmtNum(tau, 1)} · ESS ≈ ${fmtNum(x.length / (tau || 1), 0)} of ${x.length}${post.blindedColumns.includes(nm) ? " · Δ (blinded)" : ""}`)), wrap);
          const plot = new Plot(wrap, { xlabel: "sample", ylabel: "" });
          plot.render = (p) => {
            const xs = Float64Array.from(x, (_, i) => i);
            let lo = Infinity, hi = -Infinity; for (const v of x) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
            const pad = (hi - lo) * 0.05 || 1;
            p.setRange(0, x.length, lo - pad, hi + pad); p.clip(); p.line(xs, x, { color: THEME.fg, width: 1 });
            // running mean
            const rm = new Float64Array(x.length); let s = 0; for (let i = 0; i < x.length; i++) { s += x[i]; rm[i] = s / (i + 1); }
            p.line(xs, rm, { color: "#9a9a9a", width: 1.8 }); p.unclip(); p.axes({ grid: true });
          };
          plot.draw(); plots.push(plot);
        }
        // log-likelihood trace
        if (post.logL) {
          const wrap = el("div", { class: "plot-wrap small" });
          body.append(el("div", { class: "ctl-row" }, el("b", {}, "log-likelihood / log-posterior")), wrap);
          const plot = new Plot(wrap, { xlabel: "sample" });
          plot.render = (p) => { const x = post.logL; const xs = Float64Array.from(x, (_, i) => i); let lo = Infinity, hi = -Infinity; for (const v of x) { lo = Math.min(lo, v); hi = Math.max(hi, v); } p.setRange(0, x.length, lo, hi + (hi - lo) * 0.05); p.clip(); p.line(xs, x, { color: THEME.fg, width: 1 }); p.unclip(); p.axes({ grid: true }); };
          plot.draw(); plots.push(plot);
        }
      }
      settings();
    });
    const settings = () => {
      panel.settings.replaceChildren(
        runRow(ctx, state, load) || "",
        section("View", row("Show", select([{ value: "rhat", label: "R̂ & acceptance" }, { value: "trace", label: "Trace plots & ESS" }], state.view, (v) => { state.view = v; load(); })),
          state.view === "rhat" ? row("Top N", number(state.topN, (v) => { state.topN = v; load(); }, { min: 5, max: 100, step: 5, width: 70 })) : ""),
        state.view === "trace" && names.length ? section("Parameters", paramPicker(names, state.params, (sel) => { state.params = sel; load(); }, { groupOf: paramGroup, max: 8 })) : "",
      );
    };
    settings();
    load();
    return { destroy() { plots.forEach((p) => p.destroy()); }, state: () => state, refresh: load };
  },
};
