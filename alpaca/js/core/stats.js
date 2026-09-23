// Small statistics toolbox for posterior samples.

export function sorted(arr) {
  const a = Float64Array.from(arr);
  a.sort();
  return a;
}

export function quantileSorted(s, q) {
  if (!s.length) return NaN;
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export function quantile(arr, q) { return quantileSorted(sorted(arr), q); }

export function mean(arr) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

export function std(arr, m = mean(arr)) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) { const d = arr[i] - m; s += d * d; }
  return Math.sqrt(s / Math.max(1, arr.length - 1));
}

export function summarize(arr) {
  const s = sorted(arr);
  const m = mean(s);
  return {
    n: s.length, median: quantileSorted(s, 0.5), lo68: quantileSorted(s, 0.16), hi68: quantileSorted(s, 0.84),
    lo95: quantileSorted(s, 0.025), hi95: quantileSorted(s, 0.975), mean: m, std: std(s, m), min: s[0], max: s[s.length - 1],
  };
}

export function percentiles(arr, ps) { const s = sorted(arr); return ps.map((p) => quantileSorted(s, p / 100)); }

export function histogram(arr, { bins = 40, range = null, density = false } = {}) {
  let lo, hi;
  if (range) [lo, hi] = range; else { lo = Infinity; hi = -Infinity; for (const v of arr) { if (v < lo) lo = v; if (v > hi) hi = v; } }
  if (!(hi > lo)) { hi = lo + 1; }
  const counts = new Float64Array(bins);
  const w = (hi - lo) / bins;
  for (const v of arr) {
    let b = Math.floor((v - lo) / w);
    if (b === bins) b = bins - 1;
    if (b >= 0 && b < bins) counts[b]++;
  }
  if (density) { const norm = 1 / (arr.length * w); for (let i = 0; i < bins; i++) counts[i] *= norm; }
  const edges = new Float64Array(bins + 1);
  for (let i = 0; i <= bins; i++) edges[i] = lo + i * w;
  return { counts, edges, lo, hi, width: w };
}

export function scottBandwidth(arr, d = 1) {
  const n = arr.length;
  const s = std(arr);
  const iqr = quantile(arr, 0.75) - quantile(arr, 0.25);
  const sigma = Math.min(s, iqr / 1.34) || s || 1;
  return sigma * Math.pow(n, -1 / (d + 4));
}

export function kde1d(arr, { n = 256, range = null, bw = null, pad = 0.15 } = {}) {
  const h = bw || scottBandwidth(arr);
  let lo, hi;
  if (range) [lo, hi] = range; else {
    let a = Infinity, b = -Infinity; for (const v of arr) { if (v < a) a = v; if (v > b) b = v; }
    const p = (b - a) * pad + 2 * h; lo = a - p; hi = b + p;
  }
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  const norm = 1 / (arr.length * h * Math.sqrt(2 * Math.PI));
  for (let i = 0; i < n; i++) xs[i] = lo + ((hi - lo) * i) / (n - 1);
  for (const v of arr) {
    // only evaluate within 5 bandwidths
    const i0 = Math.max(0, Math.floor(((v - 5 * h - lo) / (hi - lo)) * (n - 1)));
    const i1 = Math.min(n - 1, Math.ceil(((v + 5 * h - lo) / (hi - lo)) * (n - 1)));
    for (let i = i0; i <= i1; i++) { const u = (xs[i] - v) / h; ys[i] += Math.exp(-0.5 * u * u); }
  }
  for (let i = 0; i < n; i++) ys[i] *= norm;
  return { xs, ys, bw: h, lo, hi };
}

export function kde2d(x, y, { n = 72, rangeX = null, rangeY = null, bwScale = 1, pad = 0.15 } = {}) {
  const hx = scottBandwidth(x, 2) * bwScale;
  const hy = scottBandwidth(y, 2) * bwScale;
  let x0, x1, y0, y1;
  if (rangeX) [x0, x1] = rangeX; else { let a = Infinity, b = -Infinity; for (const v of x) { if (v < a) a = v; if (v > b) b = v; } const p = (b - a) * pad + 2 * hx; x0 = a - p; x1 = b + p; }
  if (rangeY) [y0, y1] = rangeY; else { let a = Infinity, b = -Infinity; for (const v of y) { if (v < a) a = v; if (v > b) b = v; } const p = (b - a) * pad + 2 * hy; y0 = a - p; y1 = b + p; }
  const grid = new Float64Array(n * n);
  const dx = (x1 - x0) / (n - 1);
  const dy = (y1 - y0) / (n - 1);
  const rx = Math.ceil((4 * hx) / dx);
  const ry = Math.ceil((4 * hy) / dy);
  for (let s = 0; s < x.length; s++) {
    const cx = (x[s] - x0) / dx;
    const cy = (y[s] - y0) / dy;
    const i0 = Math.max(0, Math.floor(cx - rx)), i1 = Math.min(n - 1, Math.ceil(cx + rx));
    const j0 = Math.max(0, Math.floor(cy - ry)), j1 = Math.min(n - 1, Math.ceil(cy + ry));
    for (let j = j0; j <= j1; j++) {
      const v = ((y0 + j * dy) - y[s]) / hy;
      const ey = Math.exp(-0.5 * v * v);
      for (let i = i0; i <= i1; i++) {
        const u = ((x0 + i * dx) - x[s]) / hx;
        grid[j * n + i] += ey * Math.exp(-0.5 * u * u);
      }
    }
  }
  const norm = 1 / (x.length * hx * hy * 2 * Math.PI);
  for (let i = 0; i < grid.length; i++) grid[i] *= norm;
  return { grid, n, x0, x1, y0, y1, dx, dy };
}

// Density thresholds enclosing the given probability masses (e.g. [0.68, 0.95]).
export function massLevels(grid, masses, cellArea = 1) {
  const s = sorted(grid);
  const total = s.reduce((a, b) => a + b, 0) * cellArea;
  const out = [];
  for (const m of masses) {
    let acc = 0;
    let level = s[s.length - 1];
    for (let i = s.length - 1; i >= 0; i--) {
      acc += s[i] * cellArea;
      if (acc >= m * total) { level = s[i]; break; }
    }
    out.push(level);
  }
  return out;
}

export function pearson(x, y) {
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxy / Math.sqrt(sxx * syy || 1);
}

export function argmax(arr) { let b = 0; for (let i = 1; i < arr.length; i++) if (arr[i] > arr[b]) b = i; return b; }

// Format a value with asymmetric errors, choosing digits from the error size.
export function fmtErr(med, lo, hi) {
  const err = Math.max(Math.abs(hi - med), Math.abs(med - lo));
  const digits = err > 0 ? Math.max(0, Math.min(6, 2 - Math.floor(Math.log10(err)))) : 3;
  return `${med.toFixed(digits)} +${(hi - med).toFixed(digits)} / -${(med - lo).toFixed(digits)}`;
}

export function fmt(v, digits = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  if (typeof v !== "number") return String(v);
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(Math.max(1, digits - 2));
  return v.toFixed(digits).replace(/\.?0+$/, "");
}
