import { el, table, badge, checkbox, chips, textInput, section, row } from "../ui/widgets.js";
import { runOf, runRow, otherRun, fmtNum } from "./common.js";
import { paramGroup, GROUP_ORDER } from "../core/run.js";
import { summarize } from "../core/stats.js";

async function summaryRows(run) {
  if (run.paramSummary.length) return run.paramSummary;
  if (!run.features.posterior) return [];
  const post = await run.posterior();
  return post.scalarNames.map((n) => { const s = summarize(post.columns[n]); return { name: n, median: s.median, up: s.hi68 - s.median, lo: s.median - s.lo68, mean: s.mean, std: s.std }; });
}

export default {
  id: "params", title: "Parameter table", icon: "≡", description: "Posterior medians with asymmetric errors, priors, boundary flags and R̂; deltas against a second run.", defaultSize: "l",
  available: (run) => run.paramSummary.length > 0 || run.features.posterior,
  create(ctx, state, panel) {
    state.groups = state.groups || GROUP_ORDER.slice();
    state.query = state.query || "";
    state.flaggedOnly = !!state.flaggedOnly;
    state.compare = state.compare ?? true;
    let rowsA = [], rowsB = [];
    const render = async () => {
      const run = runOf(ctx, state);
      const other = otherRun(ctx, run);
      panel.setBusy(true, "loading");
      rowsA = await summaryRows(run);
      rowsB = other && state.compare ? await summaryRows(other) : [];
      panel.setBusy(false);
      const flags = new Map(run.boundaryFlags.map((f) => [f.name, f]));
      const priors = new Map(run.priorSummary.map((p) => [p.name, p]));
      const rhat = run.diagnostics?.r_hat || {};
      const bMap = new Map(rowsB.map((r) => [r.name, r]));
      const q = state.query.toLowerCase();
      const gset = new Set(state.groups);
      const rows = rowsA.filter((r) => gset.has(paramGroup(r.name)) && (!q || r.name.toLowerCase().includes(q)) && (!state.flaggedOnly || flags.get(r.name)?.status === "FLAG"));
      rows.sort((a, b) => GROUP_ORDER.indexOf(paramGroup(a.name)) - GROUP_ORDER.indexOf(paramGroup(b.name)) || a.name.localeCompare(b.name));
      const blinded = new Set(run.blinding?.blinded_columns || []);
      const headers = ["Parameter", "Group", "Median", "+", "−", "Mean", "Std", "Prior", "Flag", "R̂"];
      if (rowsB.length) headers.push("B median", "Δ(A−B)/σ");
      const body = rows.map((r) => {
        const f = flags.get(r.name);
        const p = priors.get(r.name);
        const pr = p ? (p.lo != null ? `${p.type} [${fmtNum(p.lo, 3)}, ${fmtNum(p.hi, 3)}]` : `${p.type} μ=${fmtNum(p.mean, 3)} σ=${fmtNum(p.std, 3)}`) : "–";
        const rh = rhat[r.name];
        const cells = [
          el("span", { class: "mono" }, r.name, blinded.has(r.name) ? badge("Δ", "warn") : null),
          el("span", { class: "muted" }, paramGroup(r.name)),
          el("b", {}, fmtNum(r.median, 5)), "+" + fmtNum(r.up, 4), "−" + fmtNum(r.lo, 4), fmtNum(r.mean, 5), fmtNum(r.std, 4),
          el("span", { class: "muted small" }, pr),
          f ? (f.status === "FLAG" ? badge(f.boundary + " " + f.why, "warn") : badge("ok", "ok")) : "–",
          rh != null ? el("span", { class: rh > 1.1 ? "bad" : rh > 1.05 ? "meh" : "" }, rh.toFixed(3)) : "–",
        ];
        if (rowsB.length) {
          const b = bMap.get(r.name);
          if (b) {
            const sig = Math.sqrt(r.std * r.std + b.std * b.std) || 1;
            const d = (r.median - b.median) / sig;
            cells.push(fmtNum(b.median, 5), el("span", { class: Math.abs(d) > 2 ? "bad" : Math.abs(d) > 1 ? "meh" : "" }, (d >= 0 ? "+" : "") + d.toFixed(2) + " σ"));
          } else cells.push("–", "–");
        }
        return cells;
      });
      panel.body.replaceChildren(el("div", { class: "table-wrap" }, table(headers, body, { class: "params" })));
      panel.setStatus(`${rows.length} parameters` + (rowsB.length ? ` · compared with ${other.label}` : ""));
    };
    const settings = () => {
      panel.settings.replaceChildren(
        runRow(ctx, state, render) || "",
        section("Filter",
          row("Search", textInput(state.query, (v) => { state.query = v; render(); }, { placeholder: "name…", width: 150 })),
          checkbox("Flagged only", state.flaggedOnly, (v) => { state.flaggedOnly = v; render(); }),
          ctx.app.runs.length > 1 ? checkbox("Compare with other run", state.compare, (v) => { state.compare = v; render(); }) : "",
        ),
        section("Groups", chips(GROUP_ORDER, state.groups, (g, on) => { const s = new Set(state.groups); if (on) s.add(g); else s.delete(g); state.groups = [...s]; render(); })),
      );
    };
    settings();
    render();
    return { destroy() {}, state: () => state, refresh: () => { settings(); render(); } };
  },
};
