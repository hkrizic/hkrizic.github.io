// Effective lensing maps (multi-plane aware) from finite differences of the
// image-plane -> source-plane mapping, plus critical curves and caustics.
import { marchingSquares } from "../core/contours.js";

export function lensingMaps(fm, params, { oversample = 1 } = {}) {
  const nx = fm.nx * oversample;
  const pix = fm.pix / oversample;
  const ra0 = -fm.half + pix / 2;
  const n = nx * nx;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  for (let r = 0; r < nx; r++) for (let c = 0; c < nx; c++) { x[r * nx + c] = ra0 + c * pix; y[r * nx + c] = ra0 + r * pix; }
  const h = pix / 4;
  const shoot = (dx, dy) => {
    const xx = new Float64Array(n);
    const yy = new Float64Array(n);
    for (let i = 0; i < n; i++) { xx[i] = x[i] + dx; yy[i] = y[i] + dy; }
    const { xs, ys } = fm.rayShootPoints(params, xx, yy);
    return { bx: xs[fm.geo.nPlanes], by: ys[fm.geo.nPlanes] };
  };
  const c0 = shoot(0, 0);
  const px = shoot(h, 0), mx = shoot(-h, 0), py = shoot(0, h), my = shoot(0, -h);
  const kappa = new Float64Array(n), gamma1 = new Float64Array(n), gamma2 = new Float64Array(n);
  const detA = new Float64Array(n), mu = new Float64Array(n), alphaX = new Float64Array(n), alphaY = new Float64Array(n);
  const inv2h = 1 / (2 * h);
  for (let i = 0; i < n; i++) {
    const a11 = (px.bx[i] - mx.bx[i]) * inv2h;
    const a12 = (py.bx[i] - my.bx[i]) * inv2h;
    const a21 = (px.by[i] - mx.by[i]) * inv2h;
    const a22 = (py.by[i] - my.by[i]) * inv2h;
    kappa[i] = 1 - 0.5 * (a11 + a22);
    gamma1[i] = 0.5 * (a22 - a11);
    gamma2[i] = -0.5 * (a12 + a21);
    const d = a11 * a22 - a12 * a21;
    detA[i] = d;
    mu[i] = 1 / d;
    alphaX[i] = x[i] - c0.bx[i];
    alphaY[i] = y[i] - c0.by[i];
  }
  // critical curves: detA = 0
  const lines = marchingSquares(detA, nx, nx, 0);
  const toWorld = (l) => l.map(([c, r]) => [ra0 + c * pix, ra0 + r * pix]);
  const critical = lines.filter((l) => l.length > 4).map(toWorld);
  const caustics = critical.map((line) => {
    const cx = Float64Array.from(line, (p) => p[0]);
    const cy = Float64Array.from(line, (p) => p[1]);
    const { xs, ys } = fm.rayShootPoints(params, cx, cy);
    const bx = xs[fm.geo.nPlanes], by = ys[fm.geo.nPlanes];
    return line.map((_, k) => [bx[k], by[k]]);
  });
  const extent = [ra0 - pix / 2, ra0 + (nx - 0.5) * pix, ra0 - pix / 2, ra0 + (nx - 0.5) * pix];
  return { nx, pix, extent, kappa, gamma1, gamma2, detA, mu, alphaX, alphaY, betaX: c0.bx, betaY: c0.by, critical, caustics };
}

// ---------------------------------------------------------------------------
// Counter-image finder: all image-plane positions theta with beta(theta) = beta0.
// Candidates are local minima of |beta(theta) - beta0| on the native grid, refined
// with damped Newton iterations using finite-difference Jacobians of the exact
// (multi-plane) ray-shooting map.
export function betaGrid(fm, params) {
  const { xs, ys } = fm.rayShootNative(params);
  return { bx: xs[fm.geo.nPlanes], by: ys[fm.geo.nPlanes] };
}

export function findImages(fm, params, bx0, by0, { grid = null, tol = 1e-4, maxCand = 24, searchRadius = null } = {}) {
  const nx = fm.nx, pix = fm.pix;
  const g = grid || betaGrid(fm, params);
  const { x, y } = fm.gridNative();
  const n = nx * nx;
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) d[i] = Math.hypot(g.bx[i] - bx0, g.by[i] - by0);
  const thr = searchRadius ?? 8 * pix;
  const cands = [];
  for (let r = 1; r < nx - 1; r++) {
    for (let c = 1; c < nx - 1; c++) {
      const i = r * nx + c;
      const v = d[i];
      if (!(v < thr)) continue;
      let isMin = true;
      for (let dr = -1; dr <= 1 && isMin; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; if (d[i + dr * nx + dc] < v) { isMin = false; break; } }
      if (isMin) cands.push({ x: x[i], y: y[i], d: v });
    }
  }
  cands.sort((a, b) => a.d - b.d);
  const pts = cands.slice(0, maxCand).map((c) => ({ x: c.x, y: c.y, ok: false, r: Infinity, mu: NaN }));
  if (!pts.length) return [];
  const h = pix / 8;
  const half = fm.half + pix;
  for (let iter = 0; iter < 25; iter++) {
    const m = pts.length;
    const X = new Float64Array(5 * m), Y = new Float64Array(5 * m);
    pts.forEach((p, k) => { const o = 5 * k; X[o] = p.x; Y[o] = p.y; X[o + 1] = p.x + h; Y[o + 1] = p.y; X[o + 2] = p.x - h; Y[o + 2] = p.y; X[o + 3] = p.x; Y[o + 3] = p.y + h; X[o + 4] = p.x; Y[o + 4] = p.y - h; });
    const { xs, ys } = fm.rayShootPoints(params, X, Y);
    const bx = xs[fm.geo.nPlanes], by = ys[fm.geo.nPlanes];
    let active = 0;
    pts.forEach((p, k) => {
      if (p.ok || p.dead) return;
      const o = 5 * k;
      const rx = bx[o] - bx0, ry = by[o] - by0;
      p.r = Math.hypot(rx, ry);
      const a11 = (bx[o + 1] - bx[o + 2]) / (2 * h), a12 = (bx[o + 3] - bx[o + 4]) / (2 * h);
      const a21 = (by[o + 1] - by[o + 2]) / (2 * h), a22 = (by[o + 3] - by[o + 4]) / (2 * h);
      const det = a11 * a22 - a12 * a21;
      p.mu = 1 / det;
      if (p.r < tol) { p.ok = true; return; }
      if (!Number.isFinite(det) || Math.abs(det) < 1e-9) { p.dead = true; return; }
      let dx = -(a22 * rx - a12 * ry) / det;
      let dy = -(-a21 * rx + a11 * ry) / det;
      const len = Math.hypot(dx, dy);
      const maxStep = 3 * pix;
      if (len > maxStep) { dx *= maxStep / len; dy *= maxStep / len; }
      p.x += dx; p.y += dy;
      if (Math.abs(p.x) > half || Math.abs(p.y) > half) { p.dead = true; return; }
      active++;
    });
    if (!active) break;
  }
  const good = pts.filter((p) => p.ok && !p.dead);
  // deduplicate
  const out = [];
  for (const p of good) if (!out.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 0.5 * pix)) out.push(p);
  out.sort((a, b) => Math.abs(b.mu) - Math.abs(a.mu));
  return out.map((p) => ({ x: p.x, y: p.y, mu: p.mu, residual: p.r }));
}
