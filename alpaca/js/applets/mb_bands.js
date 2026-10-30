// Every band of a multiband run side by side, rendered from ONE joint parameter set (the same joint posterior draw, or
// the joint MAP, seen by each band: shared lens + the band's own light, source and frame offset): data, model,
// normalised residual and source per band, chi2 per image region per band, and colour composites (Lupton asinh) of
// the data, the model and the source reconstructions, resampled onto one grid with the fitted frame offsets.
import { el, section, row, select, checkbox, number, range, button, downloadPNG, table, badge } from "../ui/widgets.js";
import { ImageView } from "../ui/imagecanvas.js";
import { Plot } from "../ui/plot.js";
import { runOf, runRow, busy, errorBox, residualNorm, maskFrom, chi2Reduced, fmtNum, unblindUI, NeedsKeyError } from "./common.js";
import { percentiles } from "../core/stats.js";
import { THEME } from "../ui/theme.js";

const SOURCES = [{ value: "best", label: "joint posterior · best log-L draw" }, { value: "draw", label: "joint posterior · draw #" }, { value: "map", label: "joint MAP" }];
const REGIONS = ["quasar cores (<0.1\")", "PSF wings (0.1–0.4\")", "lens centre (<0.5\")", "arcs (arc mask)", "rest"];
const numeric = (p) => Object.fromEntries(Object.entries(p).filter(([, v]) => typeof v === "number"));

// chi2 per pixel by region, in the order of REGIONS (first match wins), on the likelihood mask.
function regionChi2(resid, cols, rows, ext, params, arc) {
  const pts = [];
  for (let i = 0; params[`x_image_${i}`] !== undefined; i++) pts.push([params[`x_image_${i}`], params[`y_image_${i}`]]);
  const cx = params.lens_center_x ?? 0, cy = params.lens_center_y ?? 0;
  const sx = (ext[1] - ext[0]) / cols, sy = (ext[3] - ext[2]) / rows;
  const sum = new Float64Array(REGIONS.length), cnt = new Float64Array(REGIONS.length);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = r * cols + c, v = resid[k];
    if (!Number.isFinite(v)) continue;
    const x = ext[0] + (c + 0.5) * sx, y = ext[2] + (r + 0.5) * sy;
    let d = Infinity;
    for (const [px, py] of pts) d = Math.min(d, Math.hypot(x - px, y - py));
    const g = d < 0.1 ? 0 : d < 0.4 ? 1 : Math.hypot(x - cx, y - cy) < 0.5 ? 2 : arc && arc[k] ? 3 : 4;
    sum[g] += v * v; cnt[g]++;
  }
  return REGIONS.map((name, g) => ({ name, chi2: cnt[g] ? sum[g] / cnt[g] : NaN, n: cnt[g] }));
}

// Bilinear sample of an image {data, rows, cols, extent} at world (x, y); NaN outside.
function sampler(img) {
  const [x0, x1, y0, y1] = img.extent, { rows, cols, data } = img;
  const fx = cols / (x1 - x0), fy = rows / (y1 - y0);
  return (x, y) => {
    const c = (x - x0) * fx - 0.5, r = (y - y0) * fy - 0.5;
    if (c < 0 || r < 0 || c > cols - 1 || r > rows - 1) return NaN;
    const c0 = Math.floor(c), r0 = Math.floor(r), c1 = Math.min(cols - 1, c0 + 1), r1 = Math.min(rows - 1, r0 + 1), tc = c - c0, tr = r - r0;
    return (1 - tr) * ((1 - tc) * data[r0 * cols + c0] + tc * data[r0 * cols + c1]) + tr * ((1 - tc) * data[r1 * cols + c0] + tc * data[r1 * cols + c1]);
  };
}

// Channel per band by wavelength: 1 band grey; 2 bands B = short, R = long, G = their mean; 3+ B / G / R = shortest /
// middle / longest. Returns [{band, ch: [wR, wG, wB]}].
function channels(bands) {
  if (bands.length === 1) return [{ band: bands[0], ch: [1, 1, 1] }];
  if (bands.length === 2) return [{ band: bands[0], ch: [0, 0.5, 1] }, { band: bands[1], ch: [1, 0.5, 0] }];
  const mid = bands[Math.floor(bands.length / 2)];
  return [{ band: bands[0], ch: [0, 0, 1] }, { band: mid, ch: [0, 1, 0] }, { band: bands[bands.length - 1], ch: [1, 0, 0] }];
}

const chanName = ([r, g, b]) => (r && g && b ? "grey" : r ? "red" : b ? "blue" : "green");

// Lupton et al. (2004) asinh colour composite of per-band images already on one grid (n x n), each scaled by its own
// normalisation. RGBA bytes, row 0 = bottom (flipped when drawn).
function lupton(layers, n, { Q = 8, soft = 0.05 } = {}) {
  const R = new Float64Array(n * n), G = new Float64Array(n * n), B = new Float64Array(n * n);
  for (const L of layers) for (let k = 0; k < n * n; k++) { const v = L.data[k]; if (!Number.isFinite(v)) continue; R[k] += L.ch[0] * v; G[k] += L.ch[1] * v; B[k] += L.ch[2] * v; }
  const out = new Uint8ClampedArray(n * n * 4);
  const f = (I) => Math.asinh((Q * I) / soft) / Q;
  const top = f(1);
  for (let k = 0; k < n * n; k++) {
    const I = (Math.max(0, R[k]) + Math.max(0, G[k]) + Math.max(0, B[k])) / 3;
    const s = I > 0 ? f(I) / I / top : 0;
    let r = Math.max(0, R[k]) * s, g = Math.max(0, G[k]) * s, b = Math.max(0, B[k]) * s;
    const m = Math.max(r, g, b, 1);
    r /= m; g /= m; b /= m;
    const row = n - 1 - Math.floor(k / n), col = k % n, o = (row * n + col) * 4;
    out[o] = 255 * r; out[o + 1] = 255 * g; out[o + 2] = 255 * b; out[o + 3] = 255;
  }
  return out;
}

// Square RGB panel with arcsec axes (Plot) and optional labelled points.
function rgbPanel(parent, title) {
  const cell = el("div", { class: "view-cell" });
  parent.append(el("div", { class: "plot-cell" }, el("h3", {}, title), cell));
  const plot = new Plot(cell, { margin: { l: 40, r: 8, t: 6, b: 28 } });
  let img = null, ext = null, pts = [];
  const off = document.createElement("canvas");
  plot.render = (a) => {
    if (!img) return;
    const [x0, x1, y0, y1] = ext, r = a.rect;
    const sc = Math.min(r.w / (x1 - x0), r.h / (y1 - y0)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    a.setRange(cx - r.w / (2 * sc), cx + r.w / (2 * sc), cy - r.h / (2 * sc), cy + r.h / (2 * sc));
    a.ctx.save(); a.ctx.imageSmoothingEnabled = false;
    a.ctx.drawImage(off, a.X(x0), a.Y(y1), a.X(x1) - a.X(x0), a.Y(y0) - a.Y(y1));
    a.ctx.restore();
    a.axes({ xlabel: "x [\"]" });
    for (const [x, y, lab] of pts) { a.ctx.save(); a.ctx.strokeStyle = "#ffffff"; a.ctx.lineWidth = 1; a.ctx.beginPath(); a.ctx.arc(a.X(x), a.Y(y), 7, 0, 2 * Math.PI); a.ctx.stroke(); a.ctx.restore(); a.text(a.X(x) + 8, a.Y(y) - 8, lab, { px: true, color: "#ffffff", baseline: "bottom" }); }
  };
  return {
    plot,
    set(rgba, n, extent, points = []) {
      off.width = n; off.height = n;
      off.getContext("2d").putImageData(new ImageData(rgba, n, n), 0, 0);
      img = true; ext = extent; pts = points;
      plot.draw();
    },
    destroy() { plot.destroy(); },
  };
}

export default {
  id: "mbbands", title: "Multiband: band comparison", icon: "▤", description: "Every band rendered from the same joint draw (or the joint MAP): data, model, residual and source per band, χ² by region per band, and colour composites of data, model and source with the fitted frame offsets.", defaultSize: "xl",
  available: (run) => !!run.mb,
  create(ctx, state, panel) {
    Object.assign(state, { src: state.src || "best", drawIndex: state.drawIndex ?? 0, psfBoost: state.psfBoost ?? true, Q: state.Q ?? 8, soft: state.soft ?? 0.05, pct: state.pct ?? 99.5, cmap: state.cmap || "magma" });
    const body = el("div");
    panel.body.append(body);
    let views = [], rgbs = [], last = null;
    const clear = () => { views.forEach((v) => v.destroy()); rgbs.forEach((r) => r.destroy()); views = []; rgbs = []; body.innerHTML = ""; };

    const bandState = async (run, band) => {
      const mb = run.mb;
      const r = band === run.band ? run : await mb.bandRun(band, `${run.label}:${band}`, run._passphrase || null);
      let params, source, stageKey, label, frame = null;
      if (state.src === "map") {
        const bf = await r.bestFit("joint");
        params = numeric(bf.params); source = bf.source; stageKey = "joint"; frame = bf.frame; label = "joint MAP";
      } else {
        if (!r.features.posterior) throw new Error("This multiband run has no joint posterior; choose the joint MAP.");
        if (r.needsKey) throw new NeedsKeyError("Rendering a joint draw needs the true values of the blinded parameters.");
        const post = await r.posterior();
        const i = state.src === "best" ? r.bestDrawIndex(post) : Math.min(post.nSamples - 1, Math.max(0, state.drawIndex));
        const d = await r.drawParams(i);
        params = d.params; source = d.source; stageKey = "final"; label = `joint draw #${i}`;
        if (params.frame_dx !== undefined) frame = { dx: params.frame_dx, dy: params.frame_dy };
      }
      const missing = (r.blinding?.blinded_columns || []).filter((c) => params[c] === undefined);
      if (missing.length) throw new NeedsKeyError(`The joint MAP's blinded entries (${missing.join(", ")}) are sealed; they open with the run's key.`);
      const { spec } = await r.ensureForwardModel(stageKey);
      const m = await r.render(stageKey, params, source, { lensLight: true, includeSky: true, source: !!source, pointSources: spec.nPs > 0 });
      const img = await r.image();
      const noise = (await r.noise()).data;
      const mask = maskFrom(await r.likelihoodMask());
      const arc = maskFrom(await r.arcMask());
      const b = params.psf_error_b ?? 0;
      const sigma = state.psfBoost && b && m.ps ? Float64Array.from(noise, (s, k) => Math.sqrt(s * s + b * b * m.ps[k] ** 2)) : noise;
      const resid = residualNorm(img.data, m.total, sigma, mask);
      const ext = r.extent(img.cols);
      return {
        band, run: r, img, ext, model: m.total, resid, sigma, b, label, params, source, sourceGrid: m.sourceGrid, frame: frame || { dx: 0, dy: 0 },
        chi2: chi2Reduced(img.data, m.total, sigma, mask), regions: regionChi2(resid, img.cols, img.rows, ext, params, arc), pix: r.pixScale,
      };
    };

    const load = () => busy(panel, "rendering every band from the joint parameters", async () => {
      clear();
      const run = runOf(ctx, state);
      const mb = run?.mb;
      if (!mb) { body.append(errorBox("Not a multiband run.")); return; }
      const bands = mb.bandsByWavelength;
      let S;
      try { S = []; for (const b of bands) S.push(await bandState(run, b)); }
      catch (e) {
        if (e instanceof NeedsKeyError) { body.append(el("div", { class: "cards" }, el("div", { class: "card" }, el("h3", {}, "Blinding key needed"), el("div", { class: "muted small" }, e.message + " The key is used only inside the forward model; nothing blinded is shown."), unblindUI(run, load)))); settings(); return; }
        throw e;
      }
      last = S;

      // ------------------------------------------------ colour composites (data / model / source)
      const chans = channels(bands);
      const target = S.slice().sort((a, b) => a.pix - b.pix)[0];
      const n = target.img.cols, [x0, x1, y0, y1] = target.ext, step = (x1 - x0) / n;
      const norm = {};
      for (const s of S) { const v = percentiles(Float64Array.from(s.img.data).filter(Number.isFinite), [state.pct])[0]; norm[s.band] = v > 0 ? 1 / v : 1; }
      // band image (square, ALPACA cutouts and source grids) resampled onto the target grid, at its frame offset
      const onGrid = (s, data, extent, tgtFrame, nn, ex, st) => {
        const side = Math.round(Math.sqrt(data.length));
        const f = sampler({ data, rows: side, cols: side, extent });
        const ddx = s.frame.dx - tgtFrame.dx, ddy = s.frame.dy - tgtFrame.dy;
        const out = new Float64Array(nn * nn);
        for (let r = 0; r < nn; r++) for (let c = 0; c < nn; c++) out[r * nn + c] = f(ex[0] + (c + 0.5) * st + ddx, ex[2] + (r + 0.5) * st + ddy);
        return out;
      };
      const layers = (key) => S.map((s) => {
        const ch = chans.find((c) => c.band === s.band);
        if (!ch) return null;
        const d = onGrid(s, key === "data" ? s.img.data : s.model, s.ext, target.frame, n, target.ext, step);
        for (let k = 0; k < d.length; k++) d[k] *= norm[s.band];
        return { ch: ch.ch, data: d };
      }).filter(Boolean);
      const ps = []; for (let i = 0; target.params[`x_image_${i}`] !== undefined; i++) ps.push([target.params[`x_image_${i}`], target.params[`y_image_${i}`], String.fromCharCode(65 + i)]);
      const compGrid = el("div", { class: "view-grid three" });
      body.append(el("div", { class: "muted small", style: { padding: "8px 14px 0" } }, `Colour composites (Lupton asinh, Q = ${state.Q}): ${chans.map((c) => `${c.band} → ${chanName(c.ch)}`).join(", ")}${bands.length === 2 ? " (green = their mean)" : ""}. Each band is scaled by its own ${state.pct}th data percentile and resampled onto the ${target.band} grid at the fitted frame offsets (${S.filter((s) => s.band !== target.band).map((s) => `${s.band} ${(1000 * (s.frame.dx - target.frame.dx)).toFixed(1)}, ${(1000 * (s.frame.dy - target.frame.dy)).toFixed(1)} mas`).join("; ") || "none"}).`), compGrid);
      const cData = rgbPanel(compGrid, "Data"), cModel = rgbPanel(compGrid, `Model · ${S[0].label}`);
      rgbs.push(cData, cModel);
      cData.set(lupton(layers("data"), n, state), n, target.ext, ps);
      cModel.set(lupton(layers("model"), n, state), n, target.ext, ps);
      // source plane: each band's reconstruction on the finest source grid (source positions shift with the frame too)
      const withSrc = S.filter((s) => s.source && s.sourceGrid);
      if (withSrc.length) {
        const tg = withSrc.slice().sort((a, b) => a.sourceGrid.step - b.sourceGrid.step)[0];
        const g = tg.sourceGrid, sn = g.n, sext = [g.x0 - g.step / 2, g.x1 + g.step / 2, g.y0 - g.step / 2, g.y1 + g.step / 2];
        const sl = withSrc.map((s) => {
          const ch = chans.find((c) => c.band === s.band);
          if (!ch) return null;
          const sg = s.sourceGrid, e = [sg.x0 - sg.step / 2, sg.x1 + sg.step / 2, sg.y0 - sg.step / 2, sg.y1 + sg.step / 2];
          const d = onGrid(s, s.source.data, e, tg.frame, sn, sext, (sext[1] - sext[0]) / sn);
          const v = percentiles(Float64Array.from(s.source.data).filter(Number.isFinite), [state.pct])[0];
          for (let k = 0; k < d.length; k++) d[k] /= v > 0 ? v : 1;
          return { ch: ch.ch, data: d };
        }).filter(Boolean);
        const cSrc = rgbPanel(compGrid, "Source plane");
        rgbs.push(cSrc);
        cSrc.set(lupton(sl, sn, state), sn, sext, []);
      }

      // ------------------------------------------------ per band: data, model, residual, source
      for (const s of S) {
        const head = el("div", { class: "ctl-row", style: { padding: "10px 14px 0", gap: "10px" } }, el("b", {}, s.band), s.band === mb.reference ? badge("reference", "ok") : badge(`frame ${(1000 * s.frame.dx).toFixed(1)}, ${(1000 * s.frame.dy).toFixed(1)} mas`),
          el("span", { class: "muted small" }, `χ²ᵥ = ${s.chi2.red.toFixed(3)} on ${s.chi2.n} px · σ ${state.psfBoost && s.b ? `with b = ${s.b.toFixed(3)}` : "= noise map"} · ${s.label}`));
        const grid = el("div", { class: "view-grid" });
        body.append(head, grid);
        const add = (data, rows, cols, extent, opts, group) => {
          const cell = el("div", { class: "view-cell" });
          grid.append(cell);
          const v = new ImageView(cell, { group, units: "arcsec", ...opts });
          v.setImage({ data, rows, cols, extent });
          views.push(v);
        };
        add(s.img.data, s.img.rows, s.img.cols, s.ext, { cmap: state.cmap, stretch: "log", pmin: 0.5, pmax: 99.8, label: `${s.band} data` }, "mbbands");
        add(s.model, s.img.rows, s.img.cols, s.ext, { cmap: state.cmap, stretch: "log", pmin: 0.5, pmax: 99.8, label: `${s.band} model` }, "mbbands");
        add(s.resid, s.img.rows, s.img.cols, s.ext, { cmap: "RdBu_r", stretch: "linear", symmetric: true, auto: false, vmin: -5, vmax: 5, overlayDark: true, label: `${s.band} (data − model)/σ` }, "mbbands");
        if (s.source && s.sourceGrid) { const g = s.sourceGrid; add(s.source.data, g.n, g.n, [g.x0 - g.step / 2, g.x1 + g.step / 2, g.y0 - g.step / 2, g.y1 + g.step / 2], { cmap: state.cmap, stretch: "log", pmin: 0.5, pmax: 99.8, label: `${s.band} source` }, "mbsource"); }
      }

      // ------------------------------------------------ chi2 by region, all bands
      body.append(el("div", { class: "table-wrap" }, table(["band", "χ²ᵥ (mask)", ...REGIONS], S.map((s) => [el("b", {}, s.band), s.chi2.red.toFixed(3), ...s.regions.map((g) => (g.n ? el("span", { class: g.chi2 > 3 ? "bad" : g.chi2 > 1.5 ? "meh" : "" }, `${g.chi2.toFixed(2)} (${g.n})`) : "–"))]))),
        el("div", { class: "muted small", style: { padding: "0 14px 12px" } }, `χ² per pixel (pixel count) on each band's likelihood mask, first matching region: within 0.1″ / 0.1–0.4″ of a quasar image, within 0.5″ of the lens centre, in the arc mask, elsewhere. One parameter set for all bands: the shared lens is identical, each band has its own light, source, PSF-error term and frame offset. Data and model panels and the residuals share zoom (arcsec); the sources share their own.`));
      panel.setStatus(`${bands.join(" · ")} · ${S[0].label}`);
      settings();
    });

    const settings = () => {
      const run = runOf(ctx, state);
      panel.settings.replaceChildren(
        runRow(ctx, state, load) || "",
        section("Parameters",
          row("From", select(SOURCES.filter((o) => o.value === "map" ? run?.features.jointMap : run?.features.posterior), state.src, (v) => { state.src = v; settings(); load(); })),
          state.src === "draw" ? row("Draw index", number(state.drawIndex, (v) => { state.drawIndex = Math.max(0, Math.round(v || 0)); load(); }, { min: 0, step: 1, width: 90 })) : "",
          checkbox("PSF-error boost b in σ (residuals, χ²)", state.psfBoost, (v) => { state.psfBoost = v; load(); })),
        section("Colour composite",
          row("Q (asinh)", range(state.Q, (v) => { state.Q = v; }, { min: 1, max: 20, step: 1, live: false }), button("apply", () => load(), { small: true })),
          row("Softening", number(state.soft, (v) => { state.soft = v || 0.05; load(); }, { step: 0.01, width: 70 })),
          row("Band scale pct", number(state.pct, (v) => { state.pct = Math.min(100, Math.max(50, v || 99.5)); load(); }, { step: 0.1, width: 70 }))),
        section("Export", el("div", { class: "ctl-row" },
          button("Composites (PNG)", () => rgbs.forEach((r, i) => downloadPNG(r.plot.toPNG(), `multiband_composite_${["data", "model", "source"][i]}.png`)), { small: true }),
          button("Band panels (PNG)", () => views.forEach((v, i) => downloadPNG(v.toPNG(), `multiband_band_${i + 1}.png`)), { small: true }))),
      );
    };
    settings();
    load();
    return { destroy() { clear(); }, state: () => state, refresh: load };
  },
};
