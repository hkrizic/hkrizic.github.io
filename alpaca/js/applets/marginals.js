import { el, section, row, select, checkbox, paramPicker, number, button, downloadPNG } from "../ui/widgets.js";
import { runOf, runRow, otherRun, busy, fmtNum } from "./common.js";
import { paramGroup } from "../core/run.js";
import { kde1d, summarize, histogram } from "../core/stats.js";
import { niceTicks, formatTick } from "../ui/imagecanvas.js";
import { THEME } from "../ui/theme.js";
import { observeStable } from "../ui/resize.js";

const COLORS = THEME.series;

export default {
  id: "marginals", title: "1-D marginals", icon: "▥", description: "Small-multiple histograms / KDEs of selected parameters with priors and a second run.", defaultSize: "m",
  available: (run) => run.features.posterior,
  create(ctx, state, panel) {
    Object.assign(state, { params: state.params || ["lens_theta_E", "lens_gamma", "lens_e1", "lens_e2", "D_dt", "psf_error_b"], mode: state.mode || "hist", bins: state.bins ?? 40, priors: !!state.priors, compare: state.compare ?? true, cols: state.cols ?? 3 });
    const canvas = el("canvas");
    const wrap = el("div", { class: "canvas-wrap" }, canvas);
    panel.body.append(wrap);
    const c2 = canvas.getContext("2d");
    let data = null;

    const load = () => busy(panel, "loading posterior", async () => {
      const run = runOf(ctx, state);
      const post = await run.posterior();
      const sets = [{ label: run.label, color: COLORS[0], cols: post.columns }];
      const other = otherRun(ctx, run);
      if (other && state.compare && other.features.posterior) sets.push({ label: other.label, color: COLORS[1], cols: (await other.posterior()).columns });
      let prior = null;
      if (state.priors && run.features.priors) prior = (await run.priors()).columns;
      const priorSummary = new Map(run.priorSummary.map((p) => [p.name, p]));
      data = { sets, prior, names: post.scalarNames, priorSummary, blinded: new Set(post.blindedColumns) };
      state.params = state.params.filter((p) => data.names.includes(p));
      if (!state.params.length) state.params = data.names.slice(0, 6);
      settings();
      draw();
    });

    const draw = () => {
      if (!data) return;
      const params = state.params;
      const W = wrap.clientWidth || 600;
      const cols = Math.max(1, Math.min(state.cols, params.length));
      const rows = Math.ceil(params.length / cols);
      const cw = Math.floor(W / cols), ch = 150;
      const H = rows * ch + 4;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px";
      c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.clearRect(0, 0, W, H);
      params.forEach((p, k) => {
        const x = (k % cols) * cw + 36, y = Math.floor(k / cols) * ch + 8, w = cw - 46, h = ch - 40;
        let lo = Infinity, hi = -Infinity;
        for (const s of data.sets) { const c = s.cols[p]; if (!c) continue; const st = summarize(c); lo = Math.min(lo, st.min); hi = Math.max(hi, st.max); }
        const pad = (hi - lo) * 0.05 || 1; lo -= pad; hi += pad;
        const X = (v) => x + ((v - lo) / (hi - lo)) * w;
        c2.strokeStyle = THEME.border; c2.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        let ymax = 0;
        const items = [];
        for (const s of data.sets) {
          const c = s.cols[p]; if (!c) continue;
          if (state.mode === "hist") { const hg = histogram(c, { bins: state.bins, range: [lo, hi], density: true }); items.push({ s, hg }); ymax = Math.max(ymax, ...hg.counts); }
          else { const k2 = kde1d(c, { n: 200, range: [lo, hi] }); items.push({ s, k: k2 }); ymax = Math.max(ymax, ...k2.ys); }
        }
        let priorK = null;
        if (data.prior && data.prior[p] && !data.blinded.has(p)) { const kf = kde1d(data.prior[p], { n: 400 }); const pk = Math.max(...kf.ys) || 1; priorK = { xs: kf.xs, ys: Float64Array.from(kf.ys, (v) => v / pk) }; }
        c2.save(); c2.beginPath(); c2.rect(x, y, w, h); c2.clip();
        for (const it of items) {
          c2.fillStyle = it.s.color + "55"; c2.strokeStyle = it.s.color;
          if (it.hg) { for (let b = 0; b < it.hg.counts.length; b++) { const a = X(it.hg.edges[b]), bb = X(it.hg.edges[b + 1]); const t = y + h - (it.hg.counts[b] / ymax) * (h - 4); c2.fillRect(a, t, Math.max(1, bb - a - 0.5), y + h - t); } }
          else { c2.beginPath(); it.k.xs.forEach((xx, t) => { const X2 = X(xx), Y2 = y + h - (it.k.ys[t] / ymax) * (h - 4); if (t) c2.lineTo(X2, Y2); else c2.moveTo(X2, Y2); }); c2.lineWidth = 1.5; c2.stroke(); }
        }
        if (priorK) { c2.beginPath(); priorK.xs.forEach((xx, t) => { const X2 = X(xx), Y2 = y + h - priorK.ys[t] * (h - 4) * 0.9; if (t) c2.lineTo(X2, Y2); else c2.moveTo(X2, Y2); }); c2.strokeStyle = THEME.prior; c2.setLineDash([3, 3]); c2.lineWidth = 1; c2.stroke(); c2.setLineDash([]); }
        const ps = data.priorSummary.get(p);
        if (ps && ps.lo != null) { c2.strokeStyle = "rgba(0,0,0,0.35)"; c2.setLineDash([2, 3]); for (const v of [ps.lo, ps.hi]) { c2.beginPath(); c2.moveTo(X(v), y); c2.lineTo(X(v), y + h); c2.stroke(); } c2.setLineDash([]); }
        const st = summarize(data.sets[0].cols[p]);
        c2.strokeStyle = "rgba(0,0,0,0.6)"; c2.setLineDash([4, 3]); c2.beginPath(); c2.moveTo(X(st.median), y); c2.lineTo(X(st.median), y + h); c2.stroke(); c2.setLineDash([]);
        c2.fillStyle = "rgba(0,0,0,0.06)"; c2.fillRect(X(st.lo68), y, X(st.hi68) - X(st.lo68), h);
        c2.restore();
        c2.fillStyle = THEME.fg; c2.font = `11px ${THEME.font}`; c2.textAlign = "left"; c2.textBaseline = "top";
        const d = Math.max(0, Math.min(6, 2 - Math.floor(Math.log10(Math.max(1e-12, st.hi68 - st.lo68)))));
        c2.fillText(`${p}${data.blinded.has(p) ? " (Δ)" : ""} = ${st.median.toFixed(d)} +${(st.hi68 - st.median).toFixed(d)} −${(st.median - st.lo68).toFixed(d)}`, x + 4, y + 3);
        c2.fillStyle = THEME.muted; c2.font = `10px ${THEME.font}`; c2.textAlign = "center";
        for (const t of niceTicks(lo, hi, 4)) c2.fillText(formatTick(t), X(t), y + h + 4);
      });
    };
    const ro = observeStable(wrap, draw);

    const settings = () => {
      const run = runOf(ctx, state);
      panel.settings.replaceChildren(
        runRow(ctx, state, load) || "",
        section("Style",
          row("Mode", select([{ value: "hist", label: "Histogram" }, { value: "kde", label: "KDE" }], state.mode, (v) => { state.mode = v; draw(); })),
          row("Bins", number(state.bins, (v) => { state.bins = Math.max(5, v); draw(); }, { min: 5, max: 200, step: 5, width: 70 })),
          row("Columns", number(state.cols, (v) => { state.cols = Math.max(1, v); draw(); }, { min: 1, max: 6, step: 1, width: 60 })),
          run.features.priors ? checkbox("Prior samples (dashed)", state.priors, (v) => { state.priors = v; load(); }) : "",
          ctx.app.runs.length > 1 ? checkbox("Overlay other run", state.compare, (v) => { state.compare = v; load(); }) : "",
          el("div", { class: "ctl-row" }, button("Export PNG", () => downloadPNG(canvas.toDataURL("image/png"), "marginals.png"), { small: true })),
        ),
        section("Parameters", data ? paramPicker(data.names, state.params, (sel) => { state.params = sel; draw(); }, { groupOf: paramGroup }) : ""),
      );
    };
    load();
    return { destroy() { ro.disconnect(); }, state: () => state, refresh: load };
  },
};
