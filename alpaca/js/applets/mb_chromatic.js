// Chromatic diagnostics of a multiband run. The lens model is shared, so the macro-model flux ratios are the same in
// every band; the fitted point-source amplitudes are free per band. Their ratios f_i / f_ref per band, draw by draw
// from the joint posterior, therefore show what the lens model cannot: chromatic microlensing (smaller emission
// region at shorter wavelength -> larger anomaly), differential dust extinction (stronger in the blue), or a band's
// PSF model leaking flux between the quasar and its host. Next to it the posterior of each band's frame offset (the
// registration of the band onto the reference frame, absorbed by the joint fit) and the PSF-error term b per band.
import { el, section, row, select, button, downloadPNG, table, badge } from "../ui/widgets.js";
import { Plot } from "../ui/plot.js";
import { runOf, runRow, busy, fmtNum } from "./common.js";
import { summarize, kde1d, kde2d, massLevels } from "../core/stats.js";
import { marchingSquares, mapPolylines } from "../core/contours.js";
import { THEME, alpha } from "../ui/theme.js";

const L = (i) => String.fromCharCode(65 + i);
const shade = (i, n) => { const g = n <= 1 ? 0 : Math.round(150 * (i / (n - 1))); return `rgb(${g},${g},${g})`; };

function violin(p, x, arr, w, color) {
  const st = summarize(arr);
  if (!(st.max > st.min)) { p.line([x - w, x + w], [st.median, st.median], { color, width: 2 }); return st; }
  const k = kde1d(arr, { range: [st.lo95 - 0.5 * (st.hi95 - st.lo95), st.hi95 + 0.5 * (st.hi95 - st.lo95)], n: 96 });
  const m = Math.max(...k.ys) || 1;
  const left = [], right = [];
  for (let i = 0; i < k.xs.length; i++) { const d = (k.ys[i] / m) * w; left.push([x - d, k.xs[i]]); right.push([x + d, k.xs[i]]); }
  p.polys([[...left, ...right.reverse()]], { stroke: color, fill: alpha("#000000", 0.08), width: 1 });
  p.line([x - w, x + w], [st.median, st.median], { color, width: 1.8 });
  return st;
}

export default {
  id: "mbchromatic", title: "Multiband: chromatic flux ratios & registration", icon: "λ", description: "Point-source flux ratios per band from the joint posterior (chromatic microlensing, extinction, PSF leakage) against the achromatic macro model, band-to-band changes with significance, the frame-offset posterior of every band and the PSF-error term per band.", defaultSize: "l",
  available: (run) => !!run.mb,
  create(ctx, state, panel) {
    Object.assign(state, { macro: state.macro ?? "auto" });
    const body = el("div");
    panel.body.append(body);
    let plots = [];
    const addPlot = (parent, title, caption, h = 260, opts = {}) => {
      const wrap = el("div", { class: "plot-wrap", style: { height: h + "px", minHeight: h + "px", flex: "none" } });
      parent.append(el("div", { class: "plot-cell", style: { padding: "0 14px" } }, el("h3", {}, title), wrap, caption ? el("div", { class: "cap" }, caption) : ""));
      const p = new Plot(wrap, opts); plots.push(p); return p;
    };

    const load = () => busy(panel, "reading the joint posterior", async () => {
      plots.forEach((p) => p.destroy()); plots = [];
      body.innerHTML = "";
      const run = runOf(ctx, state);
      const mb = run?.mb;
      if (!mb) { body.append(el("div", { class: "info" }, "Not a multiband run.")); return; }
      const bands = mb.bandsByWavelength;
      const S = await mb.jointScalars();
      if (!S) {
        // MAP only: frame offsets from the summary, nothing per draw
        const rows = bands.filter((b) => b !== mb.reference).map((b) => { const o = mb.summary?.joint_map?.frame_offsets_mas?.[b]; return [b, o ? o[0].toFixed(1) : "–", o ? o[1].toFixed(1) : "–"]; });
        body.append(el("div", { class: "info" }, "No joint posterior in this run (joint sampling off): flux ratios per band need the posterior draws. Frame offsets at the joint MAP:"), el("div", { class: "table-wrap" }, table(["band", "dx [mas]", "dy [mas]"], rows)));
        return;
      }
      let nImg = 0;
      while (bands.every((b) => S.columns[`${b}/log_ps_amp_${nImg}`])) nImg++;
      const ref = Math.min(nImg - 1, state.ref ?? nImg - 1);

      // ------------------------------------------------ flux ratios per band (as magnitudes)
      if (nImg >= 2) {
        const dm = {}; // dm[b][k] = -2.5 log10(f_k / f_ref) per draw
        for (const b of bands) {
          dm[b] = [];
          const a0 = S.columns[`${b}/log_ps_amp_${ref}`];
          for (let k = 0; k < nImg; k++) { const a = S.columns[`${b}/log_ps_amp_${k}`]; dm[b][k] = Float64Array.from(a, (v, i) => (-2.5 / Math.LN10) * (v - a0[i])); }
        }
        // achromatic macro model |mu_k / mu_ref| (shared lens), when the lens equation can be evaluated
        let macro = null, macroNote = "";
        if (state.macro !== "off") {
          if (run.needsKey) macroNote = "Macro model omitted: the magnifications use the true slope (load the blinding key).";
          else {
            try {
              const M = await run.imageMagnifications(500);
              macro = [];
              for (let k = 0; k < nImg; k++) macro[k] = summarize(Float64Array.from({ length: M.n }, (_, i) => -2.5 * Math.log10(Math.abs(M.mu[i * M.nImg + k] / M.mu[i * M.nImg + ref]))));
            } catch (e) { macroNote = "Macro model unavailable: " + e.message; }
          }
        }
        const others = Array.from({ length: nImg }, (_, k) => k).filter((k) => k !== ref);
        const p = addPlot(body, `Flux ratios per band: Δm = −2.5 log₁₀ (f / f_${L(ref)})`,
          `Violins: fitted point-source amplitudes of each band, joint posterior (${S.nSamples} draws), one group per image, bands ordered by wavelength (light → dark grey). Lines join the band medians.${macro ? " Dashed band: the achromatic macro model |μ / μ_" + L(ref) + "| (median ± 68 %, shared lens, " + run.band + " view)." : macroNote ? " " + macroNote : ""} A slope across bands that the macro model does not share is chromatic: microlensing of a disk that grows with wavelength, differential extinction, or PSF leakage between quasar and host in one band.`,
          300, { margin: { l: 56, r: 16, t: 12, b: 34 } });
        p.render = (a) => {
          let lo = Infinity, hi = -Infinity;
          for (const b of bands) for (const k of others) { const s = summarize(dm[b][k]); lo = Math.min(lo, s.lo95); hi = Math.max(hi, s.hi95); }
          if (macro) for (const k of others) { lo = Math.min(lo, macro[k].lo68); hi = Math.max(hi, macro[k].hi68); }
          const pad = 0.12 * (hi - lo || 1);
          a.setRange(0.4, others.length + 0.6, lo - pad, hi + 3 * pad); // headroom for the legend
          a.axes({ xticks: false, grid: true, ylabel: `Δm vs ${L(ref)} [mag] (+ = fainter)` });
          a.clip();
          const w = Math.min(0.32, 0.8 / bands.length);
          others.forEach((k, c) => {
            const x0 = c + 1;
            if (macro) { a.ctx.save(); a.ctx.fillStyle = alpha("#000000", 0.07); a.ctx.fillRect(a.X(x0 - 0.45), a.Y(macro[k].lo68), a.X(x0 + 0.45) - a.X(x0 - 0.45), a.Y(macro[k].hi68) - a.Y(macro[k].lo68)); a.ctx.restore(); a.line([x0 - 0.45, x0 + 0.45], [macro[k].median, macro[k].median], { color: THEME.fg, dash: [5, 3], width: 1.2 }); }
            const med = [], xs = [];
            bands.forEach((b, j) => { const x = x0 + (j - (bands.length - 1) / 2) * w * 1.6; const st = violin(a, x, dm[b][k], w * 0.75, shade(j, bands.length)); med.push(st.median); xs.push(x); });
            a.line(xs, med, { color: THEME.fg, width: 1 });
          });
          a.unclip();
          others.forEach((k, c) => a.text(a.X(c + 1), a.rect.y + a.rect.h + 6, `${L(k)} / ${L(ref)}`, { px: true, align: "center", baseline: "top" }));
          a.legend(bands.map((b, j) => ({ color: shade(j, bands.length), label: `${b}${mb.wavelength(b) ? ` (${mb.wavelength(b).toFixed(2)} µm)` : ""}` })), { x: a.rect.x + a.rect.w - 150 });
        };
        p.draw();

        // band-to-band change of each ratio, draw by draw (shared lens and shared draws cancel)
        const pairs = [];
        for (let j = 1; j < bands.length; j++) pairs.push([bands[j - 1], bands[j]]);
        if (bands.length > 2) pairs.push([bands[0], bands[bands.length - 1]]);
        const rows = others.map((k) => [el("b", {}, `${L(k)} / ${L(ref)}`),
          ...bands.map((b) => { const s = summarize(dm[b][k]); return `${s.median >= 0 ? "+" : ""}${s.median.toFixed(3)} ± ${s.std.toFixed(3)}`; }),
          macro ? `${macro[k].median >= 0 ? "+" : ""}${macro[k].median.toFixed(3)}` : "–",
          ...pairs.map(([b1, b2]) => { const d = Float64Array.from(dm[b2][k], (v, i) => v - dm[b1][k][i]); const s = summarize(d); const z = s.std > 0 ? s.median / s.std : 0; return el("span", { class: Math.abs(z) > 3 ? "bad" : Math.abs(z) > 2 ? "meh" : "" }, `${s.median >= 0 ? "+" : ""}${s.median.toFixed(3)} ± ${s.std.toFixed(3)} (${z >= 0 ? "+" : ""}${z.toFixed(1)}σ)`); })]);
        body.append(el("div", { class: "table-wrap" }, table(["ratio", ...bands.map((b) => `Δm ${b}`), "macro", ...pairs.map(([b1, b2]) => `Δm ${b2} − ${b1}`)], rows)),
          el("div", { class: "muted small", style: { padding: "0 14px 8px" } }, `Δm in magnitudes (positive = fainter than ${L(ref)}), median ± σ over the joint draws; the band-to-band difference is taken draw by draw. Underlined: beyond 2σ / 3σ. Point-source amplitudes measure the unresolved emission of each band; at long wavelength the dusty torus and the host's nucleus add to it.`));
      }

      // ------------------------------------------------ frame offsets
      const nonRef = bands.filter((b) => b !== mb.reference && S.columns[`${b}/frame_dx`]);
      if (nonRef.length) {
        const grid = el("div", { class: "cards" });
        body.append(grid);
        const tRows = [];
        for (const b of nonRef) {
          const dx = Float64Array.from(S.columns[`${b}/frame_dx`], (v) => 1000 * v), dy = Float64Array.from(S.columns[`${b}/frame_dy`], (v) => 1000 * v);
          const sx = summarize(dx), sy = summarize(dy);
          let cxy = 0; for (let i = 0; i < dx.length; i++) cxy += (dx[i] - sx.mean) * (dy[i] - sy.mean); cxy /= Math.max(1, dx.length - 1);
          const mapO = mb.summary?.joint_map?.frame_offsets_mas?.[b];
          tRows.push([b, `${sx.median.toFixed(2)} ± ${sx.std.toFixed(2)}`, `${sy.median.toFixed(2)} ± ${sy.std.toFixed(2)}`, Math.hypot(sx.median, sy.median).toFixed(2), (cxy / (sx.std * sy.std || 1)).toFixed(2), mapO ? `(${mapO[0].toFixed(1)}, ${mapO[1].toFixed(1)})` : "–"]);
          const cell = el("div", { class: "card" });
          grid.append(cell);
          const p = addPlot(cell, `Frame offset ${b} − ${mb.reference} [mas]`, "", 260, { margin: { l: 46, r: 10, t: 8, b: 32 } });
          p.render = (a) => {
            const sig = mb.frameSigma ? 1000 * mb.frameSigma : null;
            const span = Math.max(4 * sx.std, 4 * sy.std, Math.abs(sx.median) + 3 * sx.std, Math.abs(sy.median) + 3 * sy.std, 1);
            const cxm = sx.median, cym = sy.median, r = a.rect, sc = Math.min(r.w, r.h) / (2 * span);
            a.setRange(cxm - r.w / (2 * sc), cxm + r.w / (2 * sc), cym - r.h / (2 * sc), cym + r.h / (2 * sc));
            a.axes({ grid: true, xlabel: "dx [mas]", ylabel: "dy [mas]" });
            a.clip();
            a.vline(0, { color: THEME.faint }); a.hline(0, { color: THEME.faint });
            if (sig) { const pts = []; for (let t = 0; t <= 64; t++) pts.push([sig * Math.cos((2 * Math.PI * t) / 64), sig * Math.sin((2 * Math.PI * t) / 64)]); a.polys([pts], { stroke: THEME.muted, width: 1 }); }
            a.scatter(dx, dy, { color: THEME.muted, radius: 1.3, alpha: 0.35 });
            if (dx.length > 20) {
              const g = kde2d(dx, dy, { n: 64 });
              massLevels(g.grid, [0.95, 0.68], g.dx * g.dy).forEach((lv) => {
                const lines = mapPolylines(marchingSquares(g.grid, g.n, g.n, lv), (c) => g.x0 + c * g.dx, (rr) => g.y0 + rr * g.dy);
                a.polys(lines, { stroke: THEME.fg, width: 1.2, close: false });
              });
            }
            if (mapO) { const X = a.X(mapO[0]), Y = a.Y(mapO[1]); a.ctx.save(); a.ctx.strokeStyle = THEME.fg; a.ctx.lineWidth = 1.6; a.ctx.beginPath(); a.ctx.moveTo(X - 5, Y - 5); a.ctx.lineTo(X + 5, Y + 5); a.ctx.moveTo(X - 5, Y + 5); a.ctx.lineTo(X + 5, Y - 5); a.ctx.stroke(); a.ctx.restore(); }
            a.unclip();
          };
          p.draw();
          cell.append(el("div", { class: "muted small" }, `Joint draws (grey), 68 / 95 % contours, × joint MAP${mb.frameSigma ? `, circle: prior σ = ${(1000 * mb.frameSigma).toFixed(0)} mas` : ""}. The offset absorbs the registration of the ${b} mosaic onto the ${mb.reference} frame; it moves every shared position of ${b} (lens and perturber centres, quasar images) rigidly.`));
        }
        body.append(el("div", { class: "table-wrap" }, table(["band", "dx [mas]", "dy [mas]", "|d| [mas]", "corr", "joint MAP"], tRows)));
      }

      // ------------------------------------------------ PSF-error b per band
      const bRows = bands.filter((b) => S.columns[`${b}/psf_error_b`]).map((b) => { const s = summarize(S.columns[`${b}/psf_error_b`]); return [b, `${s.median.toFixed(4)} +${(s.hi68 - s.median).toFixed(4)} −${(s.median - s.lo68).toFixed(4)}`, el("span", { class: s.hi95 > 0.95 * s.max && s.max > 0.25 ? "meh" : "" }, s.max.toFixed(3))]; });
      if (bRows.length) body.append(el("div", { class: "table-wrap" }, el("h3", { class: "muted small" }, "PSF-error term b per band (σ_eff² = σ² + b² · PS²)"), table(["band", "b (median, 68 %)", "max"], bRows)));
      panel.setStatus(`${bands.length} bands · ${S.nSamples} joint draws · reference image ${L(ref)}`);
      settings(nImg);
    });

    const settings = (nImg = 0) => {
      const run = runOf(ctx, state);
      const ref = Math.min(Math.max(0, nImg - 1), state.ref ?? nImg - 1);
      panel.settings.replaceChildren(
        runRow(ctx, state, load) || "",
        nImg ? section("Ratios", row("Reference image", select(Array.from({ length: nImg }, (_, k) => ({ value: String(k), label: `image ${L(k)}` })), String(ref), (v) => { state.ref = +v; load(); })),
          row("Macro model", select([{ value: "auto", label: "show (needs the lens equation)" }, { value: "off", label: "hide" }], state.macro, (v) => { state.macro = v; load(); }))) : "",
        section("Export", el("div", { class: "ctl-row" }, button("Plots (PNG)", () => plots.forEach((p, i) => downloadPNG(p.toPNG(), `multiband_chromatic_${i + 1}.png`)), { small: true }))),
        run?.mb ? el("div", { class: "muted small" }, `Run ${run.label}: ${run.mb.bands.join(" + ")}, reference ${run.mb.reference}.`) : "",
      );
    };
    settings();
    load();
    return { destroy() { plots.forEach((p) => p.destroy()); }, state: () => state, refresh: load };
  },
};
