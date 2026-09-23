// Web Worker: heavy parsing and forward-model rendering off the UI thread.
import { parseFits } from "./parsers/fits.js";
import { parseNpz, listNpz } from "./parsers/npy.js";
import { ForwardModel } from "../physics/render.js";
import { buildGeometry, singlePlaneGeometry } from "../physics/multiplane.js";
import { lensingMaps, findImages, betaGrid } from "../physics/lensing.js";

const models = new Map();

function transferables(obj, out = new Set()) {
  if (!obj || typeof obj !== "object") return [...out];
  if (ArrayBuffer.isView(obj)) { out.add(obj.buffer); return [...out]; }
  if (obj instanceof ArrayBuffer) { out.add(obj); return [...out]; }
  for (const v of Object.values(obj)) transferables(v, out);
  return [...out];
}

function buildModel(spec) {
  const geo = spec.geo.isMultiplane
    ? buildGeometry({ zLens: spec.geo.zLens, zSource: spec.geo.zSource, perturbers: spec.geo.perturbers, cosmo: spec.geo.cosmo })
    : singlePlaneGeometry({ zLens: spec.geo.zLens, zSource: spec.geo.zSource, perturbers: spec.geo.perturbers, cosmo: spec.geo.cosmo });
  return new ForwardModel({ ...spec, geo });
}

const ops = {
  fits({ buffer }) {
    const r = parseFits(buffer);
    return { shape: r.shape, data: r.data, header: r.header };
  },
  npz({ buffer, only }) {
    const r = parseNpz(new Uint8Array(buffer), { only: only || null });
    const out = {};
    for (const [k, v] of Object.entries(r)) out[k] = { dtype: v.dtype, shape: v.shape, data: v.data };
    return out;
  },
  npzList({ buffer }) { return listNpz(new Uint8Array(buffer)); },
  posterior({ buffer }) {
    const r = parseNpz(new Uint8Array(buffer));
    const names = r.param_names.data;
    const samples = r.samples.data;
    const [nS, nP] = r.samples.shape;
    const scalarIdx = [];
    const pixelIdx = [];
    names.forEach((nm, i) => (/^source_pixels_\d+$/.test(nm) ? pixelIdx : scalarIdx).push(i));
    const columns = {};
    for (const i of scalarIdx) {
      const col = new Float64Array(nS);
      for (let s = 0; s < nS; s++) col[s] = samples[s * nP + i];
      columns[names[i]] = col;
    }
    // per-pixel posterior mean/std of the source (kept as arrays for the source-maps applet)
    let pixMean = null, pixStd = null;
    if (pixelIdx.length) {
      pixMean = new Float64Array(pixelIdx.length);
      pixStd = new Float64Array(pixelIdx.length);
      for (let k = 0; k < pixelIdx.length; k++) {
        const i = pixelIdx[k];
        let m = 0;
        for (let s = 0; s < nS; s++) m += samples[s * nP + i];
        m /= nS;
        let v = 0;
        for (let s = 0; s < nS; s++) { const d = samples[s * nP + i] - m; v += d * d; }
        pixMean[k] = m;
        pixStd[k] = Math.sqrt(v / Math.max(1, nS - 1));
      }
    }
    return {
      names: Array.from(names), nSamples: nS, nParams: nP, scalarNames: scalarIdx.map((i) => names[i]),
      columns, logL: r.log_likelihood ? r.log_likelihood.data : null,
      pixelIdx: Int32Array.from(pixelIdx), pixMean, pixStd, samples,
    };
  },
  // Extract one flat posterior row (scalars + source pixels) from the sample matrix kept in the worker? No: the
  // matrix is transferred back to the main thread; rows are sliced there.
  fmInit({ runId, spec }) {
    models.set(runId, buildModel(spec));
    return { ok: true };
  },
  fmRender({ runId, params, sourcePixels, opts }) {
    const fm = models.get(runId);
    if (!fm) throw new Error("forward model not initialised");
    const r = fm.render(params, sourcePixels, opts || {});
    const out = { total: r.total, source: r.source, lensLight: r.lensLight, ps: r.ps, sourceGrid: r.sourceGrid, timings: r.timings };
    if (opts?.keepSS) { out.sourceSS = r.sourceSS; out.lensLightSS = r.lensLightSS; }
    return out;
  },
  fmLensing({ runId, params, opts }) {
    const fm = models.get(runId);
    if (!fm) throw new Error("forward model not initialised");
    return lensingMaps(fm, params, opts || {});
  },
  fmFindImages({ runId, params, bx, by, opts }) {
    const fm = models.get(runId);
    if (!fm) throw new Error("forward model not initialised");
    const key = JSON.stringify(params);
    if (!fm._betaCache || fm._betaCache.key !== key) fm._betaCache = { key, grid: betaGrid(fm, params) };
    return { images: findImages(fm, params, bx, by, { grid: fm._betaCache.grid, ...(opts || {}) }) };
  },
  fmRayShoot({ runId, params, x, y }) {
    const fm = models.get(runId);
    if (!fm) throw new Error("forward model not initialised");
    const { xs, ys } = fm.rayShootPoints(params, x, y);
    return { bx: xs[fm.geo.nPlanes], by: ys[fm.geo.nPlanes], xs, ys };
  },
};

self.onmessage = async (e) => {
  const { id, op, payload } = e.data;
  try {
    const result = await ops[op](payload);
    self.postMessage({ id, ok: true, result }, transferables(result));
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.stack ? err.stack : err) });
  }
};
