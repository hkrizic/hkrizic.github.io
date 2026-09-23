import { el, section, table, badge, checkbox, kv, fmtSec } from "../ui/widgets.js";
import { busy, fmtNum } from "./common.js";
import { paramGroup, GROUP_ORDER } from "../core/run.js";
import { summarize } from "../core/stats.js";

async function rows(run) {
  if (run.paramSummary.length) return new Map(run.paramSummary.map((r) => [r.name, r]));
  if (!run.features.posterior) return new Map();
  const post = await run.posterior();
  return new Map(post.scalarNames.map((n) => { const s = summarize(post.columns[n]); return [n, { name: n, median: s.median, up: s.hi68 - s.median, lo: s.median - s.lo68, std: s.std }]; }));
}

export default {
  id: "compare", title: "Run comparison", icon: "⇄", description: "Side-by-side quality metrics and parameter shifts in units of the combined σ between runs A and B.", defaultSize: "l",
  available: () => true,
  create(ctx, state, panel) {
    Object.assign(state, { onlySig: !!state.onlySig, thresh: state.thresh ?? 1 });
    const body = el("div", { class: "stack" });
    panel.body.append(body);
    const load = () => busy(panel, "comparing", async () => {
      body.innerHTML = "";
      const runs = ctx.app.runs;
      if (runs.length < 2) { body.append(el("div", { class: "info" }, "Load a second run (header → “Add run B”) to compare. Blinded runs compare exactly in widths, shapes and correlations; absolute shifts of blinded parameters are only meaningful if both runs share the blinding offsets.")); return; }
      const [A, B] = runs;
      const q = (r) => [fmtNum(r.stages[r.stages.length - 1]?.summary?.chi2_red, 3), fmtNum(r.bic?.bic, 1), fmtNum(r.bic?.log_L_max, 1), r.posteriorSummary?.nSamples ?? "–", fmtSec(r.timing?.total_runtime_s), r.diagnostics?.r_hat ? fmtNum(Math.max(...Object.values(r.diagnostics.r_hat)), 3) : "–", r.rayTracing ? fmtNum(r.rayTracing.mean_spread_mas, 2) + " mas" : "–", r.features.blinded ? "yes" : "no"];
      body.append(el("h3", {}, "Quality metrics"), table(["", "χ²ᵥ (final GD)", "BIC", "log L max", "samples", "runtime", "max R̂", "ray-trace", "blinded"], [[el("b", {}, `A: ${A.name}`), ...q(A)], [el("b", {}, `B: ${B.name}`), ...q(B)]]));
      const [ra, rb] = await Promise.all([rows(A), rows(B)]);
      const names = [...ra.keys()].filter((n) => rb.has(n)).sort((a, b) => GROUP_ORDER.indexOf(paramGroup(a)) - GROUP_ORDER.indexOf(paramGroup(b)) || a.localeCompare(b));
      const blinded = new Set([...(A.blinding?.blinded_columns || []), ...(B.blinding?.blinded_columns || [])]);
      const trs = [];
      let nSig = 0;
      for (const n of names) {
        const a = ra.get(n), b = rb.get(n);
        const sig = Math.sqrt((a.std || 0) ** 2 + (b.std || 0) ** 2) || NaN;
        const d = (a.median - b.median) / sig;
        const widthRatio = (b.std || NaN) / (a.std || NaN);
        if (Math.abs(d) > state.thresh) nSig++;
        if (state.onlySig && !(Math.abs(d) > state.thresh)) continue;
        trs.push([el("span", { class: "mono" }, n, blinded.has(n) ? badge("Δ", "warn") : null), el("span", { class: "muted" }, paramGroup(n)), fmtNum(a.median, 5), fmtNum(b.median, 5), fmtNum(a.std, 4), fmtNum(b.std, 4), el("span", { class: Math.abs(d) > 2 ? "bad" : Math.abs(d) > 1 ? "meh" : "" }, Number.isFinite(d) ? (d >= 0 ? "+" : "") + d.toFixed(2) + " σ" : "–"), Number.isFinite(widthRatio) ? widthRatio.toFixed(2) : "–"]);
      }
      body.append(el("h3", {}, `Parameter shifts (${nSig} beyond ${state.thresh} σ)`), el("div", { class: "table-wrap" }, table(["Parameter", "Group", "A median", "B median", "σ_A", "σ_B", "(A−B)/σ", "σ_B/σ_A"], trs)));
      panel.setStatus(`${names.length} common parameters`);
    });
    const settings = () => {
      panel.settings.replaceChildren(section("Filter", checkbox("Only significant shifts", state.onlySig, (v) => { state.onlySig = v; load(); }), el("div", { class: "muted small" }, "Threshold: 1 σ (combined)")));
    };
    settings();
    load();
    return { destroy() {}, state: () => state, refresh: load };
  },
};
