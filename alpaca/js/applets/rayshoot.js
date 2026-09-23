import { el, section, row, select, checkbox, cmapSelect, stretchSelect, button, downloadPNG, badge } from "../ui/widgets.js";
import { ImageView } from "../ui/imagecanvas.js";
import { runOf, runRow, paramSourceControls, resolveParams, NeedsKeyError, unblindUI, busy, errorBox, residualNorm, maskFrom, pointSourcePositions, fmtNum, effectiveSigma } from "./common.js";

const LAYERS = [
  { value: "resid", label: "(data − model) / σ" },
  { value: "data", label: "Data" },
  { value: "model", label: "Model" },
  { value: "residraw", label: "data − model" },
];

export default {
  id: "rayshoot", title: "Ray-shooting lab", icon: "⇢", description: "Click a feature in the data, model or residual to trace it to the source reconstruction through the full (multi-plane) lens model; every other image of that source point is found and shown in grey. Click the source plane to find all its images.", defaultSize: "xl",
  available: (run) => run.features.map || run.features.posterior,
  create(ctx, state, panel) {
    Object.assign(state, { layer: state.layer || "resid", cmap: state.cmap || "magma", stretch: state.stretch || "log", showCurves: state.showCurves ?? true, showPs: state.showPs ?? true, counter: state.counter ?? true, srcCmap: state.srcCmap || "magma", srcStretch: state.srcStretch || "log", psfBoost: state.psfBoost ?? true });
    const left = el("div", { class: "view-cell" });
    const right = el("div", { class: "view-cell" });
    const gridEl = el("div", { class: "view-grid two" }, left, right);
    const info = el("div", { class: "readout muted" }, "click a point in the image plane to trace it to the source plane; click the source plane to find all its images");
    panel.body.append(gridEl, info);
    const vImg = new ImageView(left, { cmap: state.cmap, stretch: state.stretch, pmin: 0.5, pmax: 99.8, label: "image plane" });
    const vSrc = new ImageView(right, { cmap: state.srcCmap, stretch: state.srcStretch, pmin: 0.5, pmax: 99.8, label: "source plane" });
    let cache = null; // { run, resolved, render, data, sigma, mask, lensing }
    let points = []; // { label, theta:[x,y] | null, beta:[bx,by], images:[{x,y,mu}] }
    let hoverBeta = null;
    let hoverPending = false;

    const compute = () => busy(panel, "rendering model", async () => {
      const run = runOf(ctx, state);
      let resolved;
      try { resolved = await resolveParams(run, state); }
      catch (e) {
        if (e instanceof NeedsKeyError) { panel.body.replaceChildren(unblindUI(run, () => { panel.body.replaceChildren(gridEl, info); compute(); })); return; }
        panel.body.replaceChildren(errorBox(e.message)); return;
      }
      if (!resolved.renderable) { panel.body.replaceChildren(errorBox(resolved.note)); return; }
      if (!gridEl.isConnected) panel.body.replaceChildren(gridEl, info);
      const { spec } = await run.ensureForwardModel(resolved.stageKey);
      const r = await run.render(resolved.stageKey, resolved.params, resolved.source, { lensLight: true, includeSky: true, source: !!resolved.source, pointSources: spec.nPs > 0 });
      const [data, lm] = await Promise.all([run.image(), run.likelihoodMask()]);
      const { sigma, note: sigmaNote } = await effectiveSigma(run, resolved, r.ps, { boost: state.psfBoost });
      const mask = maskFrom(lm);
      const lensing = await run.lensing(resolved.stageKey, resolved.params, { oversample: 1 });
      cache = { run, resolved, spec, render: r, data, sigma, sigmaNote, mask, lensing };
      points = [];
      panel.setStatus(`${resolved.label}` + (spec.approxPlanes ? " · ⚠ no catalog: perturbers on the main plane" : ` · ${spec.geo.perturbers.length} perturber(s), ${spec.geo.isMultiplane ? "multi-plane" : "single-plane"}`) + ` · ${sigmaNote}`);
      settings();
      showLeft();
      showRight();
    });

    const showLeft = () => {
      if (!cache) return;
      const { run, render: r, data, sigma, mask } = cache;
      const ext = run.extent(data.cols);
      let img, diverging = false;
      if (state.layer === "data") img = data.data;
      else if (state.layer === "model") img = r.total;
      else if (state.layer === "resid") { img = residualNorm(data.data, r.total, sigma, mask); diverging = true; }
      else { img = new Float64Array(data.data.length); for (let i = 0; i < img.length; i++) img[i] = mask && !mask[i] ? NaN : data.data[i] - r.total[i]; diverging = true; }
      const style = diverging ? { cmap: "RdBu_r", stretch: "linear", symmetric: true, pmin: 1, pmax: 99 } : { cmap: state.cmap, stretch: state.stretch, symmetric: false, pmin: 0.5, pmax: 99.8 };
      vImg.setOptions({ ...style, overlayDark: diverging, label: LAYERS.find((l) => l.value === state.layer).label });
      vImg.setImage({ data: img, rows: data.rows, cols: data.cols, extent: ext });
      drawOverlays();
    };

    const showRight = () => {
      if (!cache) return;
      const { resolved, render: r } = cache;
      if (resolved.source && r.sourceGrid) {
        const g = r.sourceGrid, n = resolved.source.n, h = g.step / 2;
        vSrc.setOptions({ cmap: state.srcCmap, stretch: state.srcStretch, label: "source reconstruction" });
        vSrc.setImage({ data: resolved.source.data, rows: n, cols: n, extent: [g.x0 - h, g.x1 + h, g.y0 - h, g.y1 + h] });
      } else {
        const L = cache.lensing;
        const all = L.caustics.flat();
        const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
        const cx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0, cy = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0;
        const half = xs.length ? Math.max(0.3, 0.7 * Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))) : 1;
        vSrc.setOptions({ label: "source plane" });
        vSrc.setImage({ blank: true, rows: 2, cols: 2, extent: [cx - half, cx + half, cy - half, cy + half] });
      }
      drawOverlays();
    };

    const drawOverlays = () => {
      if (!cache) return;
      const { resolved, lensing: L } = cache;
      const ovs = [], srcOvs = [];
      if (state.showCurves) { ovs.push({ type: "polylines", lines: L.critical, width: 1.2 }); srcOvs.push({ type: "polylines", lines: L.caustics, width: 1.2 }); }
      if (state.showPs) {
        const pts = pointSourcePositions(resolved.params);
        ovs.push({ type: "points", points: pts, marker: "circle", radius: 6 });
      }
      for (const p of points) {
        if (p.theta) ovs.push({ type: "points", points: [[p.theta[0], p.theta[1], p.label]], marker: "cross", radius: 7, width: 2 });
        if (state.counter && p.images.length) {
          const others = p.images.filter((im) => !p.theta || Math.hypot(im.x - p.theta[0], im.y - p.theta[1]) > 0.5 * cache.spec.pix);
          ovs.push({ type: "points", points: others.map((im) => [im.x, im.y, `${p.label}′`]), marker: "circle", radius: 7, width: 2, color: "#bfbfbf" });
        }
        srcOvs.push({ type: "points", points: [[p.beta[0], p.beta[1], p.label]], marker: "cross", radius: 7, width: 2 });
      }
      if (hoverBeta) srcOvs.push({ type: "points", points: [[hoverBeta[0], hoverBeta[1], ""]], marker: "cross", radius: 5, width: 1 });
      vImg.setOverlays(ovs);
      vSrc.setOverlays(srcOvs);
    };

    const describe = (p) => {
      const ims = p.images.map((im) => `(${im.x.toFixed(3)}, ${im.y.toFixed(3)}) μ=${fmtNum(im.mu, 2)}`).join("  ");
      return `${p.label}: ${p.theta ? `θ = (${p.theta[0].toFixed(3)}, ${p.theta[1].toFixed(3)}) → ` : ""}β = (${p.beta[0].toFixed(4)}, ${p.beta[1].toFixed(4)})  ·  ${p.images.length} image(s): ${ims}`;
    };

    const addPoint = async ({ theta = null, beta = null }) => {
      const { run, resolved } = cache;
      let b = beta;
      if (theta) { const rs = await run.rayShoot(resolved.stageKey, resolved.params, [theta[0]], [theta[1]]); b = [rs.bx[0], rs.by[0]]; }
      const images = state.counter ? await run.findImages(resolved.stageKey, resolved.params, b[0], b[1]) : [];
      const label = String(points.length + 1);
      points.push({ label, theta, beta: b, images });
      if (points.length > 9) points.shift();
      info.textContent = describe(points[points.length - 1]);
      drawOverlays();
    };

    vImg.canvas.addEventListener("click", async (e) => {
      if (!cache) return;
      const r = vImg.canvas.getBoundingClientRect();
      const [wx, wy] = vImg.screenToWorld(e.clientX - r.left, e.clientY - r.top);
      await busy(panel, "ray shooting", () => addPoint({ theta: [wx, wy] }));
    });
    vSrc.canvas.addEventListener("click", async (e) => {
      if (!cache) return;
      const r = vSrc.canvas.getBoundingClientRect();
      const [bx, by] = vSrc.screenToWorld(e.clientX - r.left, e.clientY - r.top);
      await busy(panel, "finding images", () => addPoint({ beta: [bx, by] }));
    });
    // live hover: trace the cursor to the source plane
    vImg.onReadout = async (h) => {
      if (!cache) return;
      if (!h) { hoverBeta = null; drawOverlays(); return; }
      if (hoverPending) return;
      hoverPending = true;
      try {
        const rs = await cache.run.rayShoot(cache.resolved.stageKey, cache.resolved.params, [h.x], [h.y]);
        hoverBeta = [rs.bx[0], rs.by[0]];
        info.textContent = `θ = (${h.x.toFixed(3)}, ${h.y.toFixed(3)})  value = ${fmtNum(h.value, 4)}  →  β = (${hoverBeta[0].toFixed(4)}, ${hoverBeta[1].toFixed(4)})`;
        drawOverlays();
      } finally { hoverPending = false; }
    };

    const settings = () => {
      const run = runOf(ctx, state);
      panel.settings.replaceChildren(
        runRow(ctx, state, compute) || "",
        section("Parameters", paramSourceControls(run, state, compute),
          cache?.resolved?.blindedKeys?.length ? el("div", { class: "muted small" }, badge("blinded parameters used internally", "warn")) : ""),
        section("Image plane",
          row("Show", select(LAYERS, state.layer, (v) => { state.layer = v; showLeft(); })),
          checkbox("PSF-error boost b in σ", state.psfBoost, (v) => { state.psfBoost = v; compute(); }),
          row("Colormap", cmapSelect(state.cmap, (v) => { state.cmap = v; showLeft(); })),
          row("Stretch", stretchSelect(state.stretch, (v) => { state.stretch = v; showLeft(); })),
        ),
        section("Source plane",
          row("Colormap", cmapSelect(state.srcCmap, (v) => { state.srcCmap = v; showRight(); })),
          row("Stretch", stretchSelect(state.srcStretch, (v) => { state.srcStretch = v; showRight(); })),
        ),
        section("Overlays",
          checkbox("Critical curves & caustics", state.showCurves, (v) => { state.showCurves = v; drawOverlays(); }),
          checkbox("Point-source images", state.showPs, (v) => { state.showPs = v; drawOverlays(); }),
          checkbox("Find counter images (grey)", state.counter, (v) => { state.counter = v; drawOverlays(); }),
          el("div", { class: "ctl-row" }, button("Clear points", () => { points = []; info.textContent = ""; drawOverlays(); }, { small: true }), button("Export PNGs", () => { downloadPNG(vImg.toPNG(), "rayshoot_image.png"); downloadPNG(vSrc.toPNG(), "rayshoot_source.png"); }, { small: true })),
          el("div", { class: "muted small" }, "Counter images are found by Newton iterations on the exact multi-plane mapping; μ is the signed magnification at each image."),
        ),
      );
    };
    settings();
    compute();
    return { destroy() { vImg.destroy(); vSrc.destroy(); }, state: () => state, refresh: compute };
  },
};
