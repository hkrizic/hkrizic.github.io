// Forward model of an ALPACA run in the browser: lens light + pixelated
// (correlated-field) source + point sources, supersampled rendering, PSF
// convolution on the supersampled grid, average pooling. Mirrors
// herculens' MPLensImage / Numerics with ALPACA's patches.
import { flatKwargsLens, splitKwargs, rayShoot } from "./multiplane.js";
import { sersicLight, uniformLight } from "./profiles.js";
import { Convolver } from "./fft.js";

export function blockMean(img, rows, cols, f) {
  const R = rows / f;
  const C = cols / f;
  const out = new Float64Array(R * C);
  const inv = 1 / (f * f);
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      let s = 0;
      for (let i = 0; i < f; i++) {
        const base = (r * f + i) * cols + c * f;
        for (let j = 0; j < f; j++) s += img[base + j];
      }
      out[r * C + c] = s * inv;
    }
  }
  return out;
}

// Bilinear sampling with zero outside the grid (jax map_coordinates, mode='constant', cval=0).
// values: rows x cols (row index = y), px/py: fractional pixel coordinates.
function sampleBilinear(values, rows, cols, px, py) {
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const fx = px - x0;
  const fy = py - y0;
  const get = (r, c) => (r < 0 || r >= rows || c < 0 || c >= cols ? 0 : values[r * cols + c]);
  return (
    get(y0, x0) * (1 - fx) * (1 - fy) +
    get(y0, x0 + 1) * fx * (1 - fy) +
    get(y0 + 1, x0) * (1 - fx) * fy +
    get(y0 + 1, x0 + 1) * fx * fy
  );
}

export class ForwardModel {
  /**
   * @param {object} spec
   *  nx: image size (square), pix: pixel scale (arcsec), ssf: supersampling factor,
   *  psfHr: {data, rows, cols} supersampled PSF kernel (odd size),
   *  arcMask: Uint8Array/Float64Array (nx*nx) or null,
   *  geo: geometry from multiplane.js, perturbers: [{name, profiles}],
   *  nSrc: source grid size, sourceGridScale: float,
   *  nSersic: number of lens-light Sersic components (1..3), sky: bool,
   *  nPs: number of point-source images, useSky
   */
  constructor(spec) {
    Object.assign(this, spec);
    const { nx, pix, ssf } = spec;
    this.half = (nx * pix) / 2;
    this.ra0 = -this.half + pix / 2;
    this.nxs = nx * ssf;
    this.pixs = pix / ssf;
    this.ra0s = this.ra0 - (0.5 * (ssf - 1) * pix) / ssf;
    this.pixArea = pix * pix;
    this._conv = null;
    this._cache = new Map();
  }

  gridNative() {
    if (this._gridN) return this._gridN;
    const { nx, pix, ra0 } = this;
    const x = new Float64Array(nx * nx);
    const y = new Float64Array(nx * nx);
    for (let r = 0; r < nx; r++) for (let c = 0; c < nx; c++) { x[r * nx + c] = ra0 + c * pix; y[r * nx + c] = ra0 + r * pix; }
    this._gridN = { x, y };
    return this._gridN;
  }

  gridSS() {
    if (this._gridS) return this._gridS;
    const { nxs, pixs, ra0s } = this;
    const x = new Float64Array(nxs * nxs);
    const y = new Float64Array(nxs * nxs);
    for (let r = 0; r < nxs; r++) for (let c = 0; c < nxs; c++) { x[r * nxs + c] = ra0s + c * pixs; y[r * nxs + c] = ra0s + r * pixs; }
    this._gridS = { x, y };
    return this._gridS;
  }

  // Arc mask on the supersampled grid (kron with ones(f,f)).
  arcMaskSS() {
    if (this._maskS !== undefined) return this._maskS;
    if (!this.arcMask) { this._maskS = null; return null; }
    const { nx, ssf, nxs } = this;
    const m = new Uint8Array(nxs * nxs);
    for (let r = 0; r < nxs; r++) for (let c = 0; c < nxs; c++) m[r * nxs + c] = this.arcMask[Math.floor(r / ssf) * nx + Math.floor(c / ssf)] ? 1 : 0;
    this._maskS = m;
    return m;
  }

  planeKwargs(params) {
    return splitKwargs(flatKwargsLens(params, this.perturbers), this.geo);
  }

  // Ray-shoot the supersampled grid through all planes.
  rayShootSS(params) {
    const { x, y } = this.gridSS();
    return rayShoot(this.geo, this.planeKwargs(params), x, y);
  }

  rayShootNative(params) {
    const { x, y } = this.gridNative();
    return rayShoot(this.geo, this.planeKwargs(params), x, y);
  }

  // Ray-shoot arbitrary image-plane points (flat arrays) to every plane.
  rayShootPoints(params, x, y) {
    return rayShoot(this.geo, this.planeKwargs(params), Float64Array.from(x), Float64Array.from(y));
  }

  // Adaptive source grid from the ray-traced arc mask (herculens MPLensImage.mask_extent).
  sourceGrid(bx, by) {
    const m = this.arcMaskSS();
    let xl = Infinity, xr = -Infinity, yb = Infinity, yt = -Infinity;
    for (let i = 0; i < bx.length; i++) {
      if (m && !m[i]) continue;
      const X = bx[i]; const Y = by[i];
      if (X < xl) xl = X; if (X > xr) xr = X; if (Y < yb) yb = Y; if (Y > yt) yt = Y;
    }
    const cx = 0.5 * (xl + xr);
    const cy = 0.5 * (yb + yt);
    const half = this.sourceGridScale * 0.5 * Math.max(yt - yb, xr - xl);
    const n = this.nSrc;
    return { x0: cx - half, x1: cx + half, y0: cy - half, y1: cy + half, n, step: (2 * half) / (n - 1), cx, cy, half };
  }

  // Source surface brightness (per data pixel area) on the supersampled grid.
  evalSource(pixels, grid, bx, by) {
    const n = grid.n;
    const out = new Float64Array(bx.length);
    const sx = (n - 1) / (grid.x1 - grid.x0);
    const sy = (n - 1) / (grid.y1 - grid.y0);
    const inv = 1 / this.pixArea;
    for (let i = 0; i < bx.length; i++) {
      const px = (bx[i] - grid.x0) * sx;
      const py = (by[i] - grid.y0) * sy;
      if (px < -1 || px > n || py < -1 || py > n) continue;
      out[i] = sampleBilinear(pixels, n, n, px, py) * inv;
    }
    return out;
  }

  lensLightKwargs(params) {
    const comps = [];
    const suffixes = ["L", "L2", "L3"].slice(0, this.nSersic);
    for (const sfx of suffixes) {
      comps.push({
        amp: Math.exp(params["log_light_amp_" + sfx]),
        R_sersic: params["light_Re_" + sfx],
        n_sersic: params["light_n_" + sfx],
        e1: params["light_e1_" + sfx] ?? params.light_e1_L,
        e2: params["light_e2_" + sfx] ?? params.light_e2_L,
        center_x: params["light_center_x_" + sfx] ?? params.light_center_x_L,
        center_y: params["light_center_y_" + sfx] ?? params.light_center_y_L,
      });
    }
    return comps;
  }

  evalLensLight(params, x, y, { components = null, includeSky = true } = {}) {
    const out = new Float64Array(x.length);
    const comps = this.lensLightKwargs(params);
    comps.forEach((kw, i) => { if (!components || components[i]) sersicLight(x, y, kw, out); });
    if (includeSky && this.useSky && params.sky_amp !== undefined) uniformLight(params.sky_amp, out);
    return out;
  }

  convolver() {
    if (!this._conv) {
      const k = this.psfHr;
      this._conv = new Convolver(k.data, k.rows, k.cols, this.nxs, this.nxs);
    }
    return this._conv;
  }

  // Supersampled SB -> native convolved counts/pixel (or unconvolved).
  toNative(ssImage, { unconvolved = false } = {}) {
    const { nxs, ssf, pixArea } = this;
    const conv = unconvolved ? ssImage : this.convolver().convolveSame(ssImage);
    const out = blockMean(conv, nxs, nxs, ssf);
    for (let i = 0; i < out.length; i++) out[i] *= pixArea;
    return out;
  }

  pointSourceKwargs(params) {
    const n = this.nPs;
    const ra = [], dec = [], amp = [];
    for (let i = 0; i < n; i++) {
      ra.push(params["x_image_" + i]);
      dec.push(params["y_image_" + i]);
      amp.push(params["log_ps_amp_" + i] !== undefined ? Math.exp(params["log_ps_amp_" + i]) : params["ps_amp_" + i]);
    }
    return { ra, dec, amp };
  }

  // Point sources rendered on the supersampled grid with the HR kernel, then block-summed.
  renderPointSources(params, { which = null, unconvolved = false } = {}) {
    const { nx, nxs, ssf, pix, ra0 } = this;
    // unconvolved: a 1x1 kernel deposits the flux bilinearly on the four nearest supersampled pixels
    const k = unconvolved ? { data: new Float64Array([1]), rows: 1, cols: 1 } : this.psfHr;
    const { ra, dec, amp } = this.pointSourceKwargs(params);
    const canvas = new Float64Array(nxs * nxs);
    const kh2 = k.rows >> 1;
    const kw2 = k.cols >> 1;
    for (let p = 0; p < ra.length; p++) {
      if (which && !which[p]) continue;
      const xpix = (ra[p] - ra0) / pix;
      const ypix = (dec[p] - ra0) / pix;
      const xs = xpix * ssf + (ssf - 1) / 2;
      const ys = ypix * ssf + (ssf - 1) / 2;
      const a = amp[p];
      // rows/cols of the canvas touched by the kernel
      const rMin = Math.max(0, Math.floor(ys - kh2) - 1);
      const rMax = Math.min(nxs - 1, Math.ceil(ys + kh2) + 1);
      const cMin = Math.max(0, Math.floor(xs - kw2) - 1);
      const cMax = Math.min(nxs - 1, Math.ceil(xs + kw2) + 1);
      for (let r = rMin; r <= rMax; r++) {
        const py = r - ys + kh2;
        for (let c = cMin; c <= cMax; c++) {
          const px = c - xs + kw2;
          canvas[r * nxs + c] += a * sampleBilinear(k.data, k.rows, k.cols, px, py);
        }
      }
    }
    const out = blockMean(canvas, nxs, nxs, ssf);
    const f2 = ssf * ssf;
    for (let i = 0; i < out.length; i++) out[i] *= f2;
    void nx;
    return out;
  }

  /**
   * Render the model. params: flat dict of physical parameters (true values);
   * sourcePixels: Float64Array(nSrc*nSrc) (row = y). Returns native-resolution
   * components and the total.
   */
  render(params, sourcePixels, opts = {}) {
    const {
      lensLight = true, source = true, pointSources = true, unconvolved = false,
      lensLightComponents = null, includeSky = true, psWhich = null,
    } = opts;
    const t0 = performance.now();
    const { xs, ys } = this.rayShootSS(params);
    const N = this.geo.nPlanes;
    const result = { timings: {} };
    result.timings.rayshoot = performance.now() - t0;

    let ssSum = null;
    if (source && sourcePixels) {
      const grid = this.sourceGrid(xs[N], ys[N]);
      result.sourceGrid = grid;
      const sb = this.evalSource(sourcePixels, grid, xs[N], ys[N]);
      result.sourceSS = sb;
      ssSum = sb;
    }
    if (lensLight) {
      const j = this.geo.mainIdx;
      const ll = this.evalLensLight(params, xs[j], ys[j], { components: lensLightComponents, includeSky });
      result.lensLightSS = ll;
      ssSum = ssSum ? ssSum.map((v, i) => v + ll[i]) : ll;
    }
    const t1 = performance.now();
    if (result.sourceSS) result.source = this.toNative(result.sourceSS, { unconvolved });
    if (result.lensLightSS) result.lensLight = this.toNative(result.lensLightSS, { unconvolved });
    result.timings.convolve = performance.now() - t1;
    if (pointSources && this.nPs > 0) result.ps = this.renderPointSources(params, { which: psWhich, unconvolved });
    const n = this.nx * this.nx;
    const total = new Float64Array(n);
    for (const key of ["source", "lensLight", "ps"]) {
      const a = result[key];
      if (!a) continue;
      for (let i = 0; i < n; i++) total[i] += a[i];
    }
    result.total = total;
    result.timings.total = performance.now() - t0;
    return result;
  }

  // Effective noise map with the PSF-error term: sqrt(sigma^2 + b^2 ps^2) (exponent p generalisation).
  effectiveNoise(noise, psImage, b, pExp = 1) {
    const out = new Float64Array(noise.length);
    if (!b || !psImage) { out.set(noise); return out; }
    if (pExp === 1) {
      for (let i = 0; i < noise.length; i++) out[i] = Math.sqrt(noise[i] * noise[i] + b * b * psImage[i] * psImage[i]);
    } else {
      let pk = 0;
      for (let i = 0; i < psImage.length; i++) pk = Math.max(pk, Math.abs(psImage[i]));
      pk += 1e-30;
      for (let i = 0; i < noise.length; i++) out[i] = Math.sqrt(noise[i] * noise[i] + b * b * pk * pk * Math.pow(Math.abs(psImage[i]) / pk, 2 * pExp));
    }
    return out;
  }
}
