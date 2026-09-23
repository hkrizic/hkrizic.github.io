import { el, section, row, select, checkbox, chips, cmapSelect, stretchSelect, button, downloadPNG, badge, number } from "../ui/widgets.js";
import { ImageView } from "../ui/imagecanvas.js";
import { runOf, runRow, paramSourceControls, resolveParams, NeedsKeyError, unblindUI, busy, errorBox, infoBox, residualNorm, maskFrom, chi2Reduced, pointSourcePositions, fmtNum, effectiveSigma } from "./common.js";

const OUTPUTS = [
  { value: "model", label: "Model (selected components)" },
  { value: "data", label: "Data" },
  { value: "resid", label: "(data − model) / σ" },
  { value: "residraw", label: "data − model" },
  { value: "source", label: "Source plane (pixelated source)" },
];

export default {
  id: "model", title: "Model lab", icon: "⚗", description: "Re-render the forward model in the browser from MAP or posterior draws; toggle lens-light components, source and individual point sources.", defaultSize: "l",
  available: (run) => run.features.map || run.features.posterior,
  create(ctx, state, panel) {
    Object.assign(state, {
      output: state.output || "model", cmap: state.cmap || "magma", stretch: state.stretch || "log", unconvolved: !!state.unconvolved, group: state.group ?? "main",
      comps: state.comps || ["L1", "L2", "L3", "sky", "source", "ps0", "ps1", "ps2", "ps3", "ps4", "ps5"], showCaustics: state.showCaustics ?? true, showPs: state.showPs ?? true,
      lockScale: state.lockScale ?? true, pmin: state.pmin ?? 0.5, pmax: state.pmax ?? 99.8, psfBoost: state.psfBoost ?? true,
    });
    const viewWrap = el("div", { class: "view-wrap" });
    const info = el("div", { class: "readout muted" }, "");
    panel.body.append(viewWrap, info);
    const view = new ImageView(viewWrap, { cmap: state.cmap, stretch: state.stretch, pmin: 0.5, pmax: 99.8, group: state.group || null });
    view.onReadout = (h) => { if (h) info.textContent = `x = ${h.x.toFixed(3)}  y = ${h.y.toFixed(3)}  value = ${fmtNum(h.value, 5)}`; else info.textContent = lastStatus; };
    let lastStatus = "";
    let cache = null; // {resolved, comps, render, lensing}

    const compItems = (spec, params) => {
      const items = [];
      const n = spec?.nSersic ?? (params.light_Re_L3 !== undefined ? 3 : params.light_Re_L2 !== undefined ? 2 : 1);
      for (let i = 1; i <= n; i++) items.push({ value: "L" + i, label: `Lens light ${i}`, color: "#ffb347" });
      if (params.sky_amp !== undefined) items.push({ value: "sky", label: "Sky", color: "#aaa" });
      items.push({ value: "source", label: "Lensed source", color: "#8fd3ff" });
      for (let i = 0; params[`x_image_${i}`] !== undefined; i++) items.push({ value: "ps" + i, label: `PS ${String.fromCharCode(65 + i)}`, color: "#7CFC00" });
      return items;
    };

    const compute = () => busy(panel, "rendering model", async () => {
      const run = runOf(ctx, state);
      let resolved;
      try { resolved = await resolveParams(run, state); }
      catch (e) {
        if (e instanceof NeedsKeyError) { panel.body.replaceChildren(unblindUI(run, () => { panel.body.replaceChildren(viewWrap, info); compute(); })); return; }
        panel.body.replaceChildren(errorBox(e.message)); return;
      }
      if (!resolved.renderable) { panel.body.replaceChildren(errorBox(resolved.note)); return; }
      if (!viewWrap.isConnected) panel.body.replaceChildren(viewWrap, info);
      const { spec } = await run.ensureForwardModel(resolved.stageKey);
      const items = compItems(spec, resolved.params);
      const sel = new Set(state.comps);
      const nS = items.filter((i) => /^L\d$/.test(i.value)).length;
      const lensLightComponents = Array.from({ length: nS }, (_, i) => sel.has("L" + (i + 1)));
      const psWhich = Array.from({ length: spec.nPs }, (_, i) => sel.has("ps" + i));
      const opts = { lensLight: lensLightComponents.some(Boolean), includeSky: sel.has("sky"), source: sel.has("source") && !!resolved.source, pointSources: psWhich.some(Boolean), unconvolved: state.unconvolved, lensLightComponents, psWhich };
      const t0 = performance.now();
      const r = await run.render(resolved.stageKey, resolved.params, resolved.source, opts);
      const dt = performance.now() - t0;
      // full model (all components, PSF-convolved): reference for the locked colour scale and for chi2
      const isFull = lensLightComponents.every(Boolean) && sel.has("sky") && sel.has("source") && psWhich.every(Boolean) && !state.unconvolved;
      const rFull = isFull ? r : await run.render(resolved.stageKey, resolved.params, resolved.source, { ...opts, lensLight: true, includeSky: true, source: !!resolved.source, pointSources: spec.nPs > 0, lensLightComponents: null, psWhich: null, unconvolved: false });
      const [data, lm] = await Promise.all([run.image(), run.likelihoodMask()]);
      const { sigma, note: sigmaNote } = await effectiveSigma(run, resolved, rFull.ps, { boost: state.psfBoost });
      const mask = maskFrom(lm);
      const c2 = chi2Reduced(data.data, rFull.total, sigma, mask);
      cache = { run, resolved, spec, items, render: r, renderFull: rFull, data, sigma, mask, c2, dt };
      lastStatus = `${resolved.label} · ${opts.unconvolved ? "unconvolved (point sources as sub-pixel deltas)" : "PSF-convolved"} · full-model χ²ᵥ=${c2.red.toFixed(3)} (${c2.n} px, ${sigmaNote}) · ${dt.toFixed(0)} ms` + (spec.approxPlanes ? " · ⚠ no catalog: perturbers on the main plane" : "");
      info.textContent = lastStatus;
      panel.setStatus(`χ²ᵥ = ${c2.red.toFixed(3)}`);
      settings();
      show();
    });

    const show = async () => {
      if (!cache) return;
      const { run, render: r, renderFull: rf, data, sigma, mask, resolved } = cache;
      let img, label = "", ref = null;
      const ext = run.extent(data.cols);
      const nan = (arr) => { if (!mask) return arr; const o = new Float64Array(arr.length); for (let i = 0; i < o.length; i++) o[i] = mask[i] ? arr[i] : NaN; return o; };
      const diff = (m) => { const d = new Float64Array(data.data.length); for (let i = 0; i < d.length; i++) d[i] = data.data[i] - m[i]; return nan(d); };
      let diverging = false;
      if (state.output === "model") { img = { data: r.total, rows: data.rows, cols: data.cols, extent: ext }; label = "model"; ref = rf.total; }
      else if (state.output === "data") { img = { data: data.data, rows: data.rows, cols: data.cols, extent: ext }; label = "data"; ref = rf.total; }
      else if (state.output === "resid") { img = { data: residualNorm(data.data, r.total, sigma, mask), rows: data.rows, cols: data.cols, extent: ext }; label = "(data − model)/σ"; diverging = true; ref = residualNorm(data.data, rf.total, sigma, mask); }
      else if (state.output === "residraw") { img = { data: diff(r.total), rows: data.rows, cols: data.cols, extent: ext }; label = "data − model"; diverging = true; ref = diff(rf.total); }
      else if (state.output === "source") {
        if (!resolved.source) { panel.body.prepend(errorBox("No pixelated source for this parameter set.")); return; }
        const g = r.sourceGrid || rf.sourceGrid;
        const n = resolved.source.n;
        const half = g ? g.step / 2 : 0.5;
        const extent = g ? [g.x0 - half, g.x1 + half, g.y0 - half, g.y1 + half] : [0, n, 0, n];
        img = { data: resolved.source.data, rows: n, cols: n, extent }; label = "source plane"; ref = resolved.source.data;
      }
      const style = diverging ? { cmap: "RdBu_r", stretch: "linear", symmetric: true, pmin: 1, pmax: 99 } : { cmap: state.cmap, stretch: state.stretch, symmetric: false, pmin: state.pmin, pmax: state.pmax };
      if (state.lockScale && ref) {
        // colour scale fixed by the FULL model (all components), so removing components never rescales
        const rg = ImageView.rangeFor(ref, { ...style, auto: true });
        view.setOptions({ ...style, overlayDark: diverging, auto: false, vmin: rg.vmin, vmax: rg.vmax, label, units: "arcsec" });
      } else {
        view.setOptions({ ...style, overlayDark: diverging, auto: true, vmin: null, vmax: null, label, units: "arcsec" });
      }
      view.setImage(img, { keepView: true });
      // overlays
      const ovs = [];
      if (state.output === "source") {
        if (state.showCaustics) {
          const L = await cachedLensing();
          if (L) ovs.push({ type: "polylines", lines: L.caustics, width: 1.2 });
        }
        if (state.showPs) {
          const pts = pointSourcePositions(resolved.params);
          if (pts.length) {
            const rs = await run.rayShoot(resolved.stageKey, resolved.params, pts.map((p) => p[0]), pts.map((p) => p[1]));
            ovs.push({ type: "points", points: pts.map((p, i) => [rs.bx[i], rs.by[i], p[2]]), marker: "star", radius: 6 });
          }
        }
      } else {
        if (state.showPs) ovs.push({ type: "points", points: pointSourcePositions(resolved.params), marker: "circle", radius: 6 });
        if (state.showCaustics) { const L = await cachedLensing(); if (L) ovs.push({ type: "polylines", lines: L.critical, width: 1.2 }); }
      }
      view.setOverlays(ovs);
    };

    const cachedLensing = async () => {
      if (!cache) return null;
      if (!cache.lensing) {
        try { cache.lensing = await cache.run.lensing(cache.resolved.stageKey, cache.resolved.params, { oversample: 1 }); } catch (e) { console.warn(e); return null; }
      }
      return cache.lensing;
    };

    const settings = () => {
      const run = runOf(ctx, state);
      const items = cache ? cache.items : [];
      panel.settings.replaceChildren(
        runRow(ctx, state, compute) || "",
        section("Parameters", paramSourceControls(run, state, compute),
          cache?.resolved?.note ? el("div", { class: "muted small" }, cache.resolved.note) : "",
          cache?.resolved?.blindedKeys?.length ? el("div", { class: "muted small" }, badge("blinded parameters used internally, never shown", "warn")) : ""),
        section("Components", items.length ? chips(items, state.comps, (v, on) => { const s = new Set(state.comps); if (on) s.add(v); else s.delete(v); state.comps = [...s]; compute(); }) : el("div", { class: "muted small" }, "render once to list components"),
          checkbox("Unconvolved (no PSF; point sources as sub-pixel deltas)", state.unconvolved, (v) => { state.unconvolved = v; compute(); }),
          checkbox("PSF-error boost b in σ (residual, χ²)", state.psfBoost, (v) => { state.psfBoost = v; compute(); })),
        section("Output",
          row("Show", select(OUTPUTS, state.output, (v) => { state.output = v; show(); })),
          row("Colormap", cmapSelect(state.cmap, (v) => { state.cmap = v; show(); })),
          row("Stretch", stretchSelect(state.stretch, (v) => { state.stretch = v; show(); })),
          checkbox("Lock colour scale to the full model", state.lockScale, (v) => { state.lockScale = v; show(); }),
          row("Percentiles", number(state.pmin, (v) => { state.pmin = v; show(); }, { min: 0, max: 100, width: 60 }), " – ", number(state.pmax, (v) => { state.pmax = v; show(); }, { min: 0, max: 100, width: 60 })),
          checkbox("Critical curves / caustics", state.showCaustics, (v) => { state.showCaustics = v; show(); }),
          checkbox("Point-source positions", state.showPs, (v) => { state.showPs = v; show(); }),
        ),
        section("Export", el("div", { class: "ctl-row" }, button("PNG", () => downloadPNG(view.toPNG(), `model_${state.output}.png`), { small: true }), button("Reset zoom", () => view.resetView(), { small: true }))),
      );
    };
    settings();
    compute();
    return { destroy() { view.destroy(); }, state: () => state, refresh: compute };
  },
};
