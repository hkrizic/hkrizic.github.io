import { el, section, row, select, checkbox, cmapSelect, button, downloadPNG, number } from "../ui/widgets.js";
import { ImageView } from "../ui/imagecanvas.js";
import { runOf, runRow, paramSourceControls, resolveParams, NeedsKeyError, unblindUI, busy, errorBox, pointSourcePositions, fmtNum } from "./common.js";

const MAPS = [
  { value: "kappa", label: "Convergence κ (effective)", cmap: "magma", stretch: "log" },
  { value: "mu", label: "Magnification μ", cmap: "seismic", stretch: "linear", symmetric: true, clip: 20 },
  { value: "detA", label: "det A (1/μ)", cmap: "RdBu_r", stretch: "linear", symmetric: true },
  { value: "gamma", label: "Shear |γ|", cmap: "viridis", stretch: "sqrt" },
  { value: "gamma1", label: "Shear γ₁", cmap: "coolwarm", stretch: "linear", symmetric: true },
  { value: "gamma2", label: "Shear γ₂", cmap: "coolwarm", stretch: "linear", symmetric: true },
  { value: "alpha", label: "Deflection |α|", cmap: "cividis", stretch: "linear" },
  { value: "alphaX", label: "Deflection αₓ", cmap: "BrBG", stretch: "linear", symmetric: true },
  { value: "alphaY", label: "Deflection αᵧ", cmap: "BrBG", stretch: "linear", symmetric: true },
];

export default {
  id: "lensing", title: "Lensing maps", icon: "◉", description: "Convergence, shear, magnification and deflection maps with critical curves and caustics; click the image plane to ray-trace to the source plane.", defaultSize: "l",
  available: (run) => run.features.map || run.features.posterior,
  create(ctx, state, panel) {
    Object.assign(state, { map: state.map || "kappa", oversample: state.oversample ?? 1, showCurves: state.showCurves ?? true, showPs: state.showPs ?? true, group: "lensing" });
    const left = el("div", { class: "view-cell" });
    const right = el("div", { class: "view-cell" });
    const gridEl = el("div", { class: "view-grid two" }, left, right);
    const info = el("div", { class: "readout muted" }, "click on the image plane to ray-shoot a point to the source plane");
    panel.body.append(gridEl, info);
    const vImg = new ImageView(left, { cmap: "magma", stretch: "log", pmin: 1, pmax: 99.5, label: "image plane" });
    const vSrc = new ImageView(right, { cmap: "gray", stretch: "linear", label: "source plane", showColorbar: false });
    let L = null, resolved = null, run = null, clicked = [];

    const compute = () => busy(panel, "computing lensing maps", async () => {
      run = runOf(ctx, state);
      try { resolved = await resolveParams(run, state); }
      catch (e) {
        if (e instanceof NeedsKeyError) { panel.body.replaceChildren(unblindUI(run, () => { panel.body.replaceChildren(gridEl, info); compute(); })); return; }
        panel.body.replaceChildren(errorBox(e.message)); return;
      }
      if (!resolved.renderable) { panel.body.replaceChildren(errorBox(resolved.note)); return; }
      if (!gridEl.isConnected) panel.body.replaceChildren(gridEl, info);
      const t0 = performance.now();
      L = await run.lensing(resolved.stageKey, resolved.params, { oversample: state.oversample });
      panel.setStatus(`${L.critical.length} critical curve(s) · ${(performance.now() - t0).toFixed(0)} ms`);
      clicked = [];
      settings();
      show();
    });

    const show = async () => {
      if (!L) return;
      const m = MAPS.find((x) => x.value === state.map);
      let data;
      if (state.map === "gamma") { data = new Float64Array(L.gamma1.length); for (let i = 0; i < data.length; i++) data[i] = Math.hypot(L.gamma1[i], L.gamma2[i]); }
      else if (state.map === "alpha") { data = new Float64Array(L.alphaX.length); for (let i = 0; i < data.length; i++) data[i] = Math.hypot(L.alphaX[i], L.alphaY[i]); }
      else data = L[state.map];
      if (m.clip) { const c = m.clip; data = Float64Array.from(data, (v) => Math.max(-c, Math.min(c, v))); }
      vImg.setOptions({ cmap: m.cmap, stretch: m.stretch, symmetric: !!m.symmetric, label: m.label, auto: true, pmin: m.symmetric ? 2 : 1, pmax: m.symmetric ? 98 : 99.5 });
      vImg.setImage({ data, rows: L.nx, cols: L.nx, extent: L.extent });
      const ovs = [];
      if (state.showCurves) ovs.push({ type: "polylines", lines: L.critical, width: 1.3 });
      const pts = pointSourcePositions(resolved.params);
      if (state.showPs) ovs.push({ type: "points", points: pts, radius: 6 });
      if (resolved.params.lens_center_x !== undefined) ovs.push({ type: "points", points: [[resolved.params.lens_center_x, resolved.params.lens_center_y, ""]], marker: "cross", radius: 5 });
      for (const [k, p] of Object.entries(resolved.params)) { const mm = /^(pert\d+)_center_x$/.exec(k); if (mm) ovs.push({ type: "points", points: [[p, resolved.params[mm[1] + "_center_y"], mm[1]]], marker: "cross", radius: 5, dash: [3, 3] }); }
      if (clicked.length) ovs.push({ type: "points", points: clicked.map((c) => [c.x, c.y, c.label]), marker: "cross", radius: 7, width: 2 });
      vImg.setOverlays(ovs);
      // source plane: caustics + back-traced point sources + source grid box
      const srcOv = [{ type: "polylines", lines: L.caustics, width: 1.3 }];
      let allX = L.caustics.flat().map((p) => p[0]), allY = L.caustics.flat().map((p) => p[1]);
      if (pts.length) {
        const rs = await run.rayShoot(resolved.stageKey, resolved.params, pts.map((p) => p[0]), pts.map((p) => p[1]));
        const bp = pts.map((p, i) => [rs.bx[i], rs.by[i], p[2]]);
        srcOv.push({ type: "points", points: bp, marker: "star", radius: 6 });
        allX.push(...bp.map((p) => p[0])); allY.push(...bp.map((p) => p[1]));
      }
      if (clicked.length) srcOv.push({ type: "points", points: clicked.map((c) => [c.bx, c.by, c.label]), marker: "cross", radius: 7, width: 2 });
      if (!allX.length) { allX = [-1, 1]; allY = [-1, 1]; }
      const cx = (Math.min(...allX) + Math.max(...allX)) / 2, cy = (Math.min(...allY) + Math.max(...allY)) / 2;
      const half = Math.max(0.3, 0.7 * Math.max(Math.max(...allX) - Math.min(...allX), Math.max(...allY) - Math.min(...allY)));
      const n = 8;
      vSrc.setImage({ blank: true, rows: n, cols: n, extent: [cx - half, cx + half, cy - half, cy + half] }, { keepView: false });
      vSrc.setOverlays(srcOv);
    };

    // click-to-ray-trace
    vImg.canvas.addEventListener("click", async (e) => {
      if (!L || !resolved) return;
      const r = vImg.canvas.getBoundingClientRect();
      const [wx, wy] = vImg.screenToWorld(e.clientX - r.left, e.clientY - r.top);
      const rs = await run.rayShoot(resolved.stageKey, resolved.params, [wx], [wy]);
      const label = String(clicked.length + 1);
      clicked.push({ x: wx, y: wy, bx: rs.bx[0], by: rs.by[0], label });
      if (clicked.length > 8) clicked.shift();
      info.textContent = `θ = (${wx.toFixed(3)}, ${wy.toFixed(3)}) → β = (${rs.bx[0].toFixed(4)}, ${rs.by[0].toFixed(4)}) arcsec`;
      show();
    });

    const settings = () => {
      run = runOf(ctx, state);
      panel.settings.replaceChildren(
        runRow(ctx, state, compute) || "",
        section("Parameters", paramSourceControls(run, state, compute)),
        section("Map",
          row("Quantity", select(MAPS, state.map, (v) => { state.map = v; show(); })),
          row("Grid oversample", select([{ value: 1, label: "1× (native)" }, { value: 2, label: "2×" }], state.oversample, (v) => { state.oversample = +v; compute(); })),
          checkbox("Critical curves & caustics", state.showCurves, (v) => { state.showCurves = v; show(); }),
          checkbox("Point-source images", state.showPs, (v) => { state.showPs = v; show(); }),
          el("div", { class: "ctl-row" }, button("Clear clicks", () => { clicked = []; show(); }, { small: true }), button("Export PNG", () => downloadPNG(vImg.toPNG(), `lensing_${state.map}.png`), { small: true })),
        ),
        L ? section("Numbers", el("div", { class: "muted small" }, `θE (main) = ${fmtNum(resolved.params.lens_theta_E, 4)}"` + (resolved.blindedKeys?.length ? ` · ${resolved.blindedKeys.join(", ")} used internally (blinded)` : ""))) : "",
      );
    };
    settings();
    compute();
    return { destroy() { vImg.destroy(); vSrc.destroy(); }, state: () => state, refresh: compute };
  },
};
