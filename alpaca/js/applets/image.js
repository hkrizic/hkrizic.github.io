import { el, section, row, select, checkbox, number, cmapSelect, stretchSelect, button, textInput, range, downloadPNG } from "../ui/widgets.js";
import { ImageView } from "../ui/imagecanvas.js";
import { runOf, runRow, imageLayer, residualNorm, maskFrom, pointSourcePositions, busy, errorBox, chi2Reduced, fmtNum } from "./common.js";
import { marchingSquares, mapPolylines } from "../core/contours.js";

// Layers derived from the run's products.
function layerOptions(run) {
  const o = [];
  if (run.features.image) o.push({ value: "data", label: "Data" });
  if (run.features.modelImage || run.features.posterior) o.push({ value: "model", label: "Model" }, { value: "resid", label: "(data − model) / σ" }, { value: "residraw", label: "data − model" }, { value: "chi2", label: "χ² per pixel" });
  if (run.has("01_input/fits/noise_map.fits")) o.push({ value: "noise", label: "Noise map" });
  if (run.has("03_multistart/noise_map_effective.fits")) o.push({ value: "noiseeff", label: "Effective noise (PSF error)" });
  for (const p of run.fitsLayers()) {
    if (/01_input\/fits\/(image|noise_map)\.fits$/.test(p) || /03_multistart\/(model_image|noise_map_effective)\.fits$/.test(p)) continue;
    o.push({ value: "fits:" + p, label: p.replace(/\.fits$/, "") });
  }
  return o;
}

async function loadLayer(run, key, modelSource = "best", psfBoost = true) {
  if (key === "data") return { img: imageLayer(await run.image(), run), kind: "flux" };
  if (key === "noise") return { img: imageLayer(await run.noise(), run), kind: "flux" };
  if (key === "noiseeff") return { img: imageLayer(await run.noiseEff(), run), kind: "flux" };
  if (key === "model" || key === "resid" || key === "residraw" || key === "chi2") {
    const d = await run.image();
    const m = await run.defaultModel({ prefer: modelSource });
    const ext = run.extent(d.cols);
    if (key === "model") return { img: { data: m.total, rows: d.rows, cols: d.cols, extent: ext }, kind: "flux", model: m };
    const mask = maskFrom(await run.likelihoodMask());
    const sigma = psfBoost ? m.sigma : m.sigmaPlain;
    const bNote = psfBoost ? (m.b ? `b=${m.b.toFixed(3)} (${m.bSource})` : "b=0") : "no boost";
    let data;
    if (key === "residraw") { data = new Float64Array(d.data.length); for (let i = 0; i < data.length; i++) data[i] = mask && !mask[i] ? NaN : d.data[i] - m.total[i]; }
    else { data = residualNorm(d.data, m.total, sigma, mask); if (key === "chi2") for (let i = 0; i < data.length; i++) data[i] *= data[i]; }
    const c2 = chi2Reduced(d.data, m.total, sigma, mask);
    return { img: { data, rows: d.rows, cols: d.cols, extent: ext }, kind: key === "chi2" ? "chi2" : "resid", chi2: c2, model: m, bNote };
  }
  if (key.startsWith("fits:")) {
    const p = key.slice(5);
    const f = await run.fits(p);
    // source-plane and PSF products are not on the image grid: use pixel units
    const isImagePlane = f.cols === (run.config?.data?.cutout_size || f.cols) && f.rows === f.cols && !/psf|source/i.test(p);
    let extent;
    if (isImagePlane) extent = run.extent(f.cols);
    else if (/psf/i.test(p) && run.pixScale) { const os = /supersampled|psf_kernel/.test(p) ? (run.config?.psf?.input?.oversample || 3) : 1; const h = (f.cols * run.pixScale) / os / 2; extent = [-h, h, -h, h]; }
    else extent = [0, f.cols, 0, f.rows];
    return { img: { data: f.data, rows: f.rows, cols: f.cols, extent }, kind: /mask/i.test(p) ? "mask" : "flux", units: isImagePlane || /psf/i.test(p) ? "arcsec" : "pixel" };
  }
  throw new Error("unknown layer " + key);
}

export default {
  id: "image", title: "Image viewer", icon: "▣", description: "Any image-plane or source-plane product with colormap, stretch, zoom and overlays. Duplicate panels and link them.", defaultSize: "m",
  available: (run) => run.features.image || run.fitsLayers().length > 0,
  create(ctx, state, panel) {
    Object.assign(state, { layer: state.layer || "data", modelSource: state.modelSource || "best", psfBoost: state.psfBoost ?? true, cmap: state.cmap || "magma", stretch: state.stretch || "log", pmin: state.pmin ?? 0.5, pmax: state.pmax ?? 99.8, auto: state.auto ?? true, vmin: state.vmin ?? null, vmax: state.vmax ?? null, group: state.group ?? "main", overlays: state.overlays || { ps: true, masks: false, center: false, curves: false } });
    const viewWrap = el("div", { class: "view-wrap" });
    const readout = el("div", { class: "readout muted" }, "hover for readout");
    panel.body.append(viewWrap, readout);
    const view = new ImageView(viewWrap, { cmap: state.cmap, stretch: state.stretch, pmin: state.pmin, pmax: state.pmax, auto: state.auto, vmin: state.vmin, vmax: state.vmax, group: state.group || null });
    let current = null;
    const idle = () => current?.model ? `model: ${current.model.label}` + (current.chi2 ? ` · χ²ᵥ (likelihood mask) = ${current.chi2.red.toFixed(3)} over ${current.chi2.n} px · σ: ${current.bNote}` : "") + (current.model.note ? ` · ${current.model.note}` : "") : "hover for readout";
    view.onReadout = (h) => { readout.textContent = h ? `x = ${h.x.toFixed(3)}  y = ${h.y.toFixed(3)}  [${h.col}, ${h.row}]  value = ${fmtNum(h.value, 5)}` : idle(); };

    const applyOverlays = async () => {
      const run = runOf(ctx, state);
      const ovs = [];
      if (!current || current.units === "pixel") { view.setOverlays(ovs); return; }
      try {
        if (state.overlays.ps || state.overlays.center) {
          const bf = run.features.map ? await run.bestFit("final") : null;
          const params = bf ? Object.fromEntries(Object.entries(bf.params).filter(([, v]) => typeof v === "number")) : null;
          if (params && state.overlays.ps) ovs.push({ type: "points", points: pointSourcePositions(params), marker: "circle", radius: 6 });
          if (params && state.overlays.center && params.lens_center_x !== undefined) ovs.push({ type: "points", points: [[params.lens_center_x, params.lens_center_y, "lens"]], marker: "cross", radius: 6 });
        }
        if (state.overlays.masks) {
          for (const [p, col] of [["01_input/fits/arc_mask.fits", "#ffffff"], ["01_input/fits/likelihood_mask.fits", "#ffffff"]]) {
            if (!run.has(p)) continue;
            const f = await run.fits(p);
            const [x0, x1, y0, y1] = run.extent(f.cols);
            const lines = mapPolylines(marchingSquares(f.data, f.rows, f.cols, 0.5), (c) => x0 + ((c + 0.5) / f.cols) * (x1 - x0), (r) => y0 + ((r + 0.5) / f.rows) * (y1 - y0));
            ovs.push({ type: "polylines", lines, color: col, width: 1, dash: p.includes("likelihood") ? [4, 3] : null });
          }
        }
        if (state.overlays.curves) {
          const bf = await run.bestFit("final");
          const params = Object.fromEntries(Object.entries(bf.params).filter(([, v]) => typeof v === "number"));
          if (params.lens_gamma !== undefined) {
            const L = await run.lensing("final", params, { oversample: 1 });
            ovs.push({ type: "polylines", lines: L.critical, width: 1.3 });
          }
        }
      } catch (e) { console.warn("overlay", e); }
      view.setOverlays(ovs);
    };

    const load = () => busy(panel, "loading layer (rendering the best draw on first use)", async () => {
      const run = runOf(ctx, state);
      const opts = layerOptions(run);
      if (!opts.some((o) => o.value === state.layer)) state.layer = opts[0]?.value;
      if (!state.layer) { panel.body.replaceChildren(errorBox("No image products in this run.")); return; }
      try {
        current = await loadLayer(run, state.layer, state.modelSource, state.psfBoost);
      } catch (e) { panel.body.prepend(errorBox(e.message)); return; }
      const diverging = current.kind === "resid";
      if (state.autoStyle !== false) {
        if (diverging) { state.cmap = "RdBu_r"; state.stretch = "linear"; state.symmetric = true; state.pmin = 1; state.pmax = 99; }
        else if (current.kind === "chi2") { state.cmap = "inferno"; state.stretch = "sqrt"; state.symmetric = false; }
        else if (current.kind === "mask") { state.cmap = "gray"; state.stretch = "linear"; state.symmetric = false; }
        else if (state.layer === "data" || state.layer === "model") { state.cmap = state.cmap === "RdBu_r" || state.cmap === "gray" || state.cmap === "inferno" ? "magma" : state.cmap; state.stretch = state.stretch === "linear" && state.symmetric ? "log" : state.stretch; state.symmetric = false; }
        else { state.symmetric = false; }
      }
      view.opts.units = current.units || "arcsec";
      view.setOptions({ cmap: state.cmap, stretch: state.stretch, pmin: state.pmin, pmax: state.pmax, auto: state.auto, vmin: state.vmin, vmax: state.vmax, symmetric: !!state.symmetric, overlayDark: diverging || current.kind === "mask", label: (opts.find((o) => o.value === state.layer)?.label || "") + (current.model ? ` · ${current.model.source === "best" ? "best draw" : "MAP"}` : "") });
      view.setImage(current.img, { keepView: current.units !== "pixel" });
      readout.textContent = idle();
      panel.setStatus(`${current.img.cols}×${current.img.rows}` + (current.model ? ` · ${current.model.source === "best" ? "best draw" : "MAP"}` : "") + (current.chi2 ? ` · χ²ᵥ=${current.chi2.red.toFixed(3)}` : ""));
      settings();
      applyOverlays();
    });

    const settings = () => {
      const run = runOf(ctx, state);
      const ov = state.overlays;
      panel.settings.replaceChildren(
        runRow(ctx, state, load) || "",
        section("Layer", row("Show", select(layerOptions(run), state.layer, (v) => { state.layer = v; load(); })),
          run.features.posterior ? row("Model", select([{ value: "best", label: "best log-L draw after sampling" }, { value: "map", label: "MAP (model_image.fits)" }], state.modelSource, (v) => { state.modelSource = v; load(); })) : "",
          checkbox("PSF-error boost b in σ (residual, χ²)", state.psfBoost, (v) => { state.psfBoost = v; load(); })),
        section("Display",
          row("Colormap", cmapSelect(state.cmap, (v) => { state.cmap = v; state.autoStyle = false; view.setOptions({ cmap: v }); })),
          row("Stretch", stretchSelect(state.stretch, (v) => { state.stretch = v; state.autoStyle = false; view.setOptions({ stretch: v }); })),
          checkbox("Auto range (percentiles)", state.auto, (v) => { state.auto = v; view.setOptions({ auto: v, vmin: state.vmin, vmax: state.vmax }); settings(); }),
          state.auto ? row("Percentiles", number(state.pmin, (v) => { state.pmin = v; view.setOptions({ pmin: v }); }, { min: 0, max: 100, width: 60 }), " – ", number(state.pmax, (v) => { state.pmax = v; view.setOptions({ pmax: v }); }, { min: 0, max: 100, width: 60 }))
            : row("vmin / vmax", number(state.vmin ?? view.range.vmin, (v) => { state.vmin = v; view.setOptions({ vmin: v }); }, { width: 80 }), number(state.vmax ?? view.range.vmax, (v) => { state.vmax = v; view.setOptions({ vmax: v }); }, { width: 80 })),
          checkbox("Symmetric about 0", !!state.symmetric, (v) => { state.symmetric = v; state.autoStyle = false; view.setOptions({ symmetric: v }); }),
          state.stretch === "asinh" ? row("asinh a", range(view.opts.asinhA, (v) => view.setOptions({ asinhA: v }), { min: 1, max: 100, step: 1 })) : "",
          state.stretch === "power" ? row("γ", range(view.opts.gamma, (v) => view.setOptions({ gamma: v }), { min: 0.1, max: 3, step: 0.05 })) : "",
        ),
        section("Overlays",
          checkbox("Point-source images", ov.ps, (v) => { ov.ps = v; applyOverlays(); }),
          checkbox("Lens centre", ov.center, (v) => { ov.center = v; applyOverlays(); }),
          checkbox("Mask outlines (arc / likelihood)", ov.masks, (v) => { ov.masks = v; applyOverlays(); }),
          checkbox("Critical curves (MAP)", ov.curves, (v) => { ov.curves = v; applyOverlays(); }),
        ),
        section("View",
          row("Link group", textInput(state.group, (v) => { state.group = v; view.opts.group = v || null; }, { width: 100, placeholder: "none" })),
          el("div", { class: "ctl-row" }, button("Reset zoom", () => view.resetView(), { small: true }), button("Export PNG", () => downloadPNG(view.toPNG(), `${state.layer.replace(/[^\w]+/g, "_")}.png`), { small: true })),
        ),
      );
    };
    load();
    return { destroy() { view.destroy(); }, state: () => state, refresh: load };
  },
};
