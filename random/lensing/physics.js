/* Strong-lensing model behind the simulator. Pure functions, no DOM.
   Loaded as a classic script by the page (global LensPhysics) and by Node for the tests.

   Deflector: elliptical power law (EPL) + external shear + m = 3, 4 multipoles + singular isothermal
   perturbers, all in one lens plane, with an optional mass-sheet transform applied to the sum.

   Conventions follow lenstronomy / herculens (and therefore ALPACA):
     kappa_EPL(x, y) = (3 - gamma)/2 * (theta_E * sqrt(q) / R)^(gamma - 1),  R^2 = q^2 x^2 + y^2
     e1 = (1-q)/(1+q) cos 2phi,  e2 = (1-q)/(1+q) sin 2phi
     shear:      alpha = (g1 x + g2 y, g2 x - g1 y)
     multipole:  psi = a_m / (1 - m^2) * r cos(m (phi - phi_m))
   Angles are in arcseconds, x to the right and y up. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LensPhysics = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEG = Math.PI / 180;
  const ARCSEC = Math.PI / 648000;
  const E_MAX = 0.7;          // largest ellipticity modulus, q >= 0.176
  const SOFT2 = 1e-10;        // perturber softening (arcsec^2): numerical only
  const MU_MIN = 1e-4;        // images fainter than this are not reported

  const scratch = new Float64Array(6);

  function clampEllipticity(e1, e2) {
    const e = Math.hypot(e1, e2);
    if (e <= E_MAX) return { e1, e2, e };
    return { e1: e1 * E_MAX / e, e2: e2 * E_MAX / e, e: E_MAX };
  }

  function qphiFromE(e1, e2) {
    const c = clampEllipticity(e1, e2);
    return { q: (1 - c.e) / (1 + c.e), phi: c.e > 1e-12 ? 0.5 * Math.atan2(c.e2, c.e1) : 0 };
  }

  function eFromQPhi(q, phiRad) {
    const e = (1 - q) / (1 + q);
    return { e1: e * Math.cos(2 * phiRad), e2: e * Math.sin(2 * phiRad) };
  }

  /* Turn a parameter set into the constants the evaluation needs. */
  function compile(L) {
    const { q, phi } = qphiFromE(L.e1 || 0, L.e2 || 0);
    const t = L.gamma - 1;
    const f = (1 - q) / (1 + q);
    // Tessore & Metcalf (2015): the angular part is 2F1(1, t/2; 2 - t/2; -f e^{2i phi}), a power
    // series in f. Take enough terms for f^n < 1e-11.
    const nTerms = f < 1e-12 ? 1 : Math.min(160, Math.max(6, Math.ceil(-25 / Math.log(f))));
    const coef = new Float64Array(nTerms);
    coef[0] = 1;
    for (let n = 1; n < nTerms; n++) coef[n] = coef[n - 1] * (2 * n + t - 2) / (2 * n - t + 2);

    const sh = (L.phiExt || 0) * DEG;
    const multipoles = [];
    for (const m of [3, 4]) {
      const a = L['a' + m] || 0;
      if (a !== 0) multipoles.push({ m, a, c: a / (1 - m * m), phi: phi + (L['phi' + m] || 0) * DEG });
    }
    const perts = [];
    for (const p of L.perts || []) {
      if (p.on !== false && p.thetaE > 0) perts.push({ x: p.x, y: p.y, b: p.thetaE });
    }
    return {
      thetaE: L.thetaE, gamma: L.gamma, q, phi, t, f, nTerms, coef,
      b: L.thetaE * Math.sqrt(q),
      pref0: 2 / (1 + q),
      cos: Math.cos(phi), sin: Math.sin(phi), cos2: Math.cos(2 * phi), sin2: Math.sin(2 * phi),
      cx: L.cx || 0, cy: L.cy || 0,
      g1: (L.gext || 0) * Math.cos(2 * sh), g2: (L.gext || 0) * Math.sin(2 * sh),
      multipoles, perts,
      lambda: L.lambda == null ? 1 : L.lambda,
    };
  }

  /* Deflection, potential and Hessian at one point.
     o = [alpha_x, alpha_y, psi, psi_xx, psi_xy, psi_yy] */
  function evalAll(M, x, y, o) {
    let ax = 0, ay = 0, psi = 0, hxx = 0, hxy = 0, hyy = 0;
    const dx = x - M.cx, dy = y - M.cy;

    if (M.b > 0) {
      const X = M.cos * dx + M.sin * dy, Y = -M.sin * dx + M.cos * dy;
      const zr = M.q * X, zi = Y, R2 = zr * zr + zi * zi;
      if (R2 > 1e-24) {
        let vr = 1, vi = 0;
        if (M.nTerms > 1) {
          const wr = -M.f * (zr * zr - zi * zi) / R2, wi = -M.f * 2 * zr * zi / R2;
          const c = M.coef;
          vr = c[M.nTerms - 1];
          for (let k = M.nTerms - 2; k >= 0; k--) {
            const tr = c[k] + wr * vr - wi * vi;
            vi = wr * vi + wi * vr;
            vr = tr;
          }
        }
        const pw = Math.pow(M.b * M.b / R2, 0.5 * M.t);
        const pref = M.pref0 * pw;
        const aX = pref * (zr * vr - zi * vi), aY = pref * (zr * vi + zi * vr);
        const kap = 0.5 * (2 - M.t) * pw;
        // The deflection is homogeneous of degree 1 - t, so Euler's relation gives the complex
        // shear from alpha and kappa: gamma = ((1 - t) alpha - kappa z) / conj(z).
        const r2 = X * X + Y * Y;
        const nr = (1 - M.t) * aX - kap * X, ni = (1 - M.t) * aY - kap * Y;
        const G1 = (nr * X - ni * Y) / r2, G2 = (nr * Y + ni * X) / r2;
        const g1 = G1 * M.cos2 - G2 * M.sin2, g2 = G1 * M.sin2 + G2 * M.cos2;
        ax += aX * M.cos - aY * M.sin;
        ay += aX * M.sin + aY * M.cos;
        psi += (X * aX + Y * aY) / (2 - M.t);
        hxx += kap + g1; hyy += kap - g1; hxy += g2;
      }
    }

    if (M.g1 !== 0 || M.g2 !== 0) {
      ax += M.g1 * dx + M.g2 * dy;
      ay += M.g2 * dx - M.g1 * dy;
      psi += 0.5 * M.g1 * (dx * dx - dy * dy) + M.g2 * dx * dy;
      hxx += M.g1; hyy -= M.g1; hxy += M.g2;
    }

    for (let k = 0; k < M.multipoles.length; k++) {
      const mp = M.multipoles[k];
      const r = Math.hypot(dx, dy);
      if (r < 1e-12) continue;
      const cp = dx / r, sp = dy / r;
      const d = mp.m * (Math.atan2(dy, dx) - mp.phi);
      const cs = Math.cos(d), sn = Math.sin(d);
      const ar = mp.c * cs, at = -mp.m * mp.c * sn;
      ax += ar * cp - at * sp;
      ay += ar * sp + at * cp;
      psi += mp.c * r * cs;
      const k2 = mp.a * cs / r;                     // 2 kappa
      hxx += k2 * sp * sp; hyy += k2 * cp * cp; hxy -= k2 * sp * cp;
    }

    for (let k = 0; k < M.perts.length; k++) {
      const p = M.perts[k];
      const px = x - p.x, py = y - p.y;
      const r2 = px * px + py * py + SOFT2, r = Math.sqrt(r2), r3 = r2 * r;
      ax += p.b * px / r;
      ay += p.b * py / r;
      psi += p.b * r;
      hxx += p.b * (py * py + SOFT2) / r3;
      hyy += p.b * (px * px + SOFT2) / r3;
      hxy -= p.b * px * py / r3;
    }

    // Mass-sheet transform: kappa -> lambda kappa + (1 - lambda)
    if (M.lambda !== 1) {
      const l = M.lambda, s = 1 - l;
      ax = l * ax + s * x; ay = l * ay + s * y;
      psi = l * psi + 0.5 * s * (x * x + y * y);
      hxx = l * hxx + s; hyy = l * hyy + s; hxy = l * hxy;
    }

    o[0] = ax; o[1] = ay; o[2] = psi; o[3] = hxx; o[4] = hxy; o[5] = hyy;
    return o;
  }

  function deflect(M, x, y) { evalAll(M, x, y, scratch); return { ax: scratch[0], ay: scratch[1] }; }
  function beta(M, x, y) { evalAll(M, x, y, scratch); return { x: x - scratch[0], y: y - scratch[1] }; }
  function potential(M, x, y) { return evalAll(M, x, y, scratch)[2]; }

  /* Local lensing quantities at a point; (sx, sy) is the source position used for the arrival time. */
  function local(M, x, y, sx, sy) {
    evalAll(M, x, y, scratch);
    const ax = scratch[0], ay = scratch[1], psi = scratch[2];
    const hxx = scratch[3], hxy = scratch[4], hyy = scratch[5];
    const kappa = 0.5 * (hxx + hyy);
    const g1 = 0.5 * (hxx - hyy), g2 = hxy;
    const g = Math.hypot(g1, g2);
    const det = (1 - hxx) * (1 - hyy) - hxy * hxy;
    const bx = x - ax, by = y - ay;
    const out = { x, y, bx, by, psi, kappa, g1, g2, shear: g, det, mu: 1 / det, lt: 1 - kappa - g, lr: 1 - kappa + g };
    if (sx != null) out.tau = 0.5 * ((x - sx) * (x - sx) + (y - sy) * (y - sy)) - psi;
    return out;
  }

  /* Sample the lens mapping on an N x N grid of pixel centres covering [-half, half]^2.
     Row 0 is the top of the field (y = +half), as in an image. */
  function buildGrid(M, half, N) {
    const n2 = N * N;
    const G = {
      N, half, h: 2 * half / N,
      bx: new Float32Array(n2), by: new Float32Array(n2), psi: new Float32Array(n2),
      lt: new Float32Array(n2), lr: new Float32Array(n2), kappa: new Float32Array(n2),
    };
    const o = scratch, h = G.h;
    for (let j = 0, k = 0; j < N; j++) {
      const y = half - (j + 0.5) * h;
      for (let i = 0; i < N; i++, k++) {
        const x = -half + (i + 0.5) * h;
        evalAll(M, x, y, o);
        const kap = 0.5 * (o[3] + o[5]);
        const g = Math.hypot(0.5 * (o[3] - o[5]), o[4]);
        G.bx[k] = x - o[0]; G.by[k] = y - o[1]; G.psi[k] = o[2];
        G.kappa[k] = kap; G.lt[k] = 1 - kap - g; G.lr[k] = 1 - kap + g;
      }
    }
    return G;
  }

  const gridX = (G, i) => -G.half + (i + 0.5) * G.h;
  const gridY = (G, j) => G.half - (j + 0.5) * G.h;

  /* ------------------------------------------------------------------ images of a point source */

  function newton(M, x, y, sx, sy) {
    const o = scratch;
    let res = Infinity;
    for (let it = 0; it < 60; it++) {
      evalAll(M, x, y, o);
      const fx = x - o[0] - sx, fy = y - o[1] - sy;
      res = Math.hypot(fx, fy);
      if (res < 1e-13) break;
      const a11 = 1 - o[3], a12 = -o[4], a22 = 1 - o[5];
      const det = a11 * a22 - a12 * a12;
      if (Math.abs(det) < 1e-14) break;
      let ux = (a22 * fx - a12 * fy) / det, uy = (-a12 * fx + a11 * fy) / det;
      const len = Math.hypot(ux, uy);
      if (len > 0.3) { ux *= 0.3 / len; uy *= 0.3 / len; }
      x -= ux; y -= uy;
    }
    return res < 1e-9 ? { x, y } : null;
  }

  /* All images of a point source at (sx, sy) inside the grid's field. The grid cells are split into
     triangles and mapped to the source plane; every triangle that covers the source seeds a Newton
     iteration on the exact lens equation. Cells crossed by a critical curve seed one as well, so a
     close pair near a fold is not lost to the piecewise-linear mapping. */
  function findImages(M, G, sx, sy, opts) {
    const N = G.N, bx = G.bx, by = G.by, lt = G.lt, lr = G.lr;
    const seeds = [];
    for (let j = 0; j < N - 1; j++) {
      const y0 = gridY(G, j), y1 = gridY(G, j + 1);
      for (let i = 0; i < N - 1; i++) {
        const k00 = j * N + i, k10 = k00 + 1, k01 = k00 + N, k11 = k01 + 1;
        const ax = bx[k00], bxx = bx[k10], cx = bx[k01], dx = bx[k11];
        let lo = ax < bxx ? ax : bxx, hi = ax > bxx ? ax : bxx;
        if (cx < lo) lo = cx; else if (cx > hi) hi = cx;
        if (dx < lo) lo = dx; else if (dx > hi) hi = dx;
        const padx = hi - lo;
        if (sx < lo - padx || sx > hi + padx) continue;
        const ay = by[k00], byy = by[k10], cy = by[k01], dy = by[k11];
        let lo2 = ay < byy ? ay : byy, hi2 = ay > byy ? ay : byy;
        if (cy < lo2) lo2 = cy; else if (cy > hi2) hi2 = cy;
        if (dy < lo2) lo2 = dy; else if (dy > hi2) hi2 = dy;
        const pady = hi2 - lo2;
        if (sy < lo2 - pady || sy > hi2 + pady) continue;

        const x0 = gridX(G, i), x1 = gridX(G, i + 1);
        const inside = sx >= lo && sx <= hi && sy >= lo2 && sy <= hi2;
        if (inside) {
          triSeed(seeds, sx, sy, ax, ay, x0, y0, bxx, byy, x1, y0, cx, cy, x0, y1);
          triSeed(seeds, sx, sy, dx, dy, x1, y1, cx, cy, x0, y1, bxx, byy, x1, y0);
        }
        const d00 = lt[k00] * lr[k00], d10 = lt[k10] * lr[k10], d01 = lt[k01] * lr[k01], d11 = lt[k11] * lr[k11];
        if ((d00 > 0) !== (d10 > 0) || (d00 > 0) !== (d01 > 0) || (d00 > 0) !== (d11 > 0)) {
          seeds.push(x0, y0, x1, y0, x0, y1, x1, y1);
        }
      }
    }

    const half = G.half, images = [];
    const mergeTol = (opts && opts.mergeTol) || 2e-5;
    for (let s = 0; s < seeds.length; s += 2) {
      const r = newton(M, seeds[s], seeds[s + 1], sx, sy);
      if (!r || Math.abs(r.x) > half || Math.abs(r.y) > half) continue;
      // the centre of the power law is singular (or infinitely demagnified), never an image
      if (Math.hypot(r.x - M.cx, r.y - M.cy) < 1e-7) continue;
      let dup = false;
      for (const im of images) if (Math.hypot(im.x - r.x, im.y - r.y) < mergeTol) { dup = true; break; }
      if (dup) continue;
      const q = local(M, r.x, r.y, sx, sy);
      if (!isFinite(q.mu) || Math.abs(q.mu) < MU_MIN) continue;
      const trace = 2 * (1 - q.kappa);
      images.push({
        x: r.x, y: r.y, mu: q.mu, absMu: Math.abs(q.mu), tau: q.tau, kappa: q.kappa, shear: q.shear,
        type: q.det < 0 ? 'saddle' : trace > 0 ? 'min' : 'max',
      });
    }
    return images;
  }

  function triSeed(seeds, px, py, ax, ay, tax, tay, bx, by, tbx, tby, cx, cy, tcx, tcy) {
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(d) < 1e-300) return;
    const u = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d;
    const v = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
    const w = 1 - u - v;
    if (u < -1e-9 || v < -1e-9 || w < -1e-9) return;
    seeds.push(u * tax + v * tbx + w * tcx, u * tay + v * tby + w * tcy);
  }

  /* ------------------------------------------------------------------ contours (marching squares) */

  /* Level set of a field sampled on an N x N grid. Returns polylines in grid coordinates
     (fractional column, fractional row); closed curves repeat their first point. `step` > 1 uses
     every step-th sample. */
  function contour(field, N, level, step) {
    step = step || 1;
    const n = Math.floor((N - 1) / step) + 1;
    const at = (i, j) => field[j * step * N + i * step] - level;
    // Crossings live on grid edges. Edge id: 2 * (j * n + i) for the edge to the right of node
    // (i, j), + 1 for the edge below it.
    const pts = new Map();
    const link = new Map();
    const addPoint = (id, i, j, horizontal) => {
      if (pts.has(id)) return;
      const a = at(i, j), b = horizontal ? at(i + 1, j) : at(i, j + 1);
      const s = a / (a - b);
      pts.set(id, horizontal ? [(i + s) * step, j * step] : [i * step, (j + s) * step]);
    };
    const join = (a, b) => {
      let la = link.get(a); if (!la) link.set(a, la = []); la.push(b);
      let lb = link.get(b); if (!lb) link.set(b, lb = []); lb.push(a);
    };
    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < n - 1; i++) {
        const v0 = at(i, j), v1 = at(i + 1, j), v2 = at(i + 1, j + 1), v3 = at(i, j + 1);
        if (!(isFinite(v0) && isFinite(v1) && isFinite(v2) && isFinite(v3))) continue;
        const code = (v0 > 0 ? 1 : 0) | (v1 > 0 ? 2 : 0) | (v2 > 0 ? 4 : 0) | (v3 > 0 ? 8 : 0);
        if (code === 0 || code === 15) continue;
        const top = 2 * (j * n + i), left = top + 1, bottom = 2 * ((j + 1) * n + i), right = 2 * (j * n + i + 1) + 1;
        const seg = (e1, e2) => {
          for (const e of [e1, e2]) {
            if (e === top) addPoint(e, i, j, true);
            else if (e === bottom) addPoint(e, i, j + 1, true);
            else if (e === left) addPoint(e, i, j, false);
            else addPoint(e, i + 1, j, false);
          }
          join(e1, e2);
        };
        switch (code) {
          case 1: case 14: seg(top, left); break;
          case 2: case 13: seg(top, right); break;
          case 3: case 12: seg(left, right); break;
          case 4: case 11: seg(right, bottom); break;
          case 6: case 9: seg(top, bottom); break;
          case 7: case 8: seg(left, bottom); break;
          case 5: case 10: {
            const centre = 0.25 * (v0 + v1 + v2 + v3);
            if ((centre > 0) === (code === 5)) { seg(top, right); seg(left, bottom); }
            else { seg(top, left); seg(right, bottom); }
            break;
          }
        }
      }
    }
    // Walk the links into polylines, open ones first so they start at an end.
    const lines = [];
    const used = new Set();
    const walk = (start) => {
      const line = [pts.get(start)];
      used.add(start);
      let cur = start;
      for (;;) {
        const next = (link.get(cur) || []).find(e => !used.has(e));
        if (next === undefined) break;
        used.add(next); line.push(pts.get(next)); cur = next;
      }
      const ends = link.get(cur) || [];
      if (line.length > 2 && ends.includes(start) && (link.get(start) || []).length === 2) line.push(line[0]);
      return line;
    };
    for (const [id, l] of link) if (l.length === 1 && !used.has(id)) lines.push(walk(id));
    for (const id of link.keys()) if (!used.has(id)) lines.push(walk(id));
    return lines;
  }

  /* Critical curves (image plane) and caustics (source plane), split into tangential and radial.
     Each curve is a flat array [x0, y0, x1, y1, ...] in arcseconds. */
  function criticalCurves(M, G) {
    const out = { tan: [], rad: [], tanCaustic: [], radCaustic: [] };
    const o = scratch;
    for (const [field, crit, caus] of [[G.lt, out.tan, out.tanCaustic], [G.lr, out.rad, out.radCaustic]]) {
      for (const line of contour(field, G.N, 0, 1)) {
        if (line.length < 3) continue;
        const c = new Float32Array(line.length * 2), s = new Float32Array(line.length * 2);
        for (let k = 0; k < line.length; k++) {
          const x = -G.half + (line[k][0] + 0.5) * G.h, y = G.half - (line[k][1] + 0.5) * G.h;
          evalAll(M, x, y, o);
          c[2 * k] = x; c[2 * k + 1] = y;
          s[2 * k] = x - o[0]; s[2 * k + 1] = y - o[1];
        }
        crit.push(c); caus.push(s);
      }
    }
    return out;
  }

  /* Total magnification as a function of source position, by inverse ray shooting from the grid.
     Returns an Mpix x Mpix map over [-halfS, halfS]^2 (row 0 at the top). Rays are jittered inside
     their sub-cells, because a regular lattice of rays beats against the pixel grid, and each ray
     is shared between the four nearest pixels to keep the map smooth. */
  function magnificationMap(G, halfS, Mpix, sub) {
    sub = sub || 3;
    const map = new Float32Array(Mpix * Mpix);
    const N = G.N, bx = G.bx, by = G.by;
    const scale = Mpix / (2 * halfS);
    const w = (G.h / sub) * (G.h / sub) * scale * scale;   // ray area in source pixels
    let seed = 12345;
    for (let j = 0; j < N - 1; j++) {
      for (let i = 0; i < N - 1; i++) {
        const k = j * N + i;
        const x00 = bx[k], x10 = bx[k + 1], x01 = bx[k + N], x11 = bx[k + N + 1];
        const y00 = by[k], y10 = by[k + 1], y01 = by[k + N], y11 = by[k + N + 1];
        for (let b = 0; b < sub; b++) {
          for (let a = 0; a < sub; a++) {
            seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
            const u = (a + ((seed >>> 8) & 0xfff) / 4096) / sub;
            const v = (b + ((seed >>> 20) & 0xfff) / 4096) / sub;
            const sx = (1 - u) * (1 - v) * x00 + u * (1 - v) * x10 + (1 - u) * v * x01 + u * v * x11;
            const sy = (1 - u) * (1 - v) * y00 + u * (1 - v) * y10 + (1 - u) * v * y01 + u * v * y11;
            const fx = (sx + halfS) * scale - 0.5, fy = (halfS - sy) * scale - 0.5;
            const px = Math.floor(fx), py = Math.floor(fy);
            if (px < 0 || py < 0 || px >= Mpix - 1 || py >= Mpix - 1) continue;
            const dx = fx - px, dy = fy - py, p = py * Mpix + px;
            map[p] += w * (1 - dx) * (1 - dy); map[p + 1] += w * dx * (1 - dy);
            map[p + Mpix] += w * (1 - dx) * dy; map[p + Mpix + 1] += w * dx * dy;
          }
        }
      }
    }
    // the outermost pixels only received part of their rays: repeat their neighbours
    const last = Mpix - 1;
    for (let k = 0; k < Mpix; k++) {
      map[k] = map[Mpix + k]; map[last * Mpix + k] = map[(last - 1) * Mpix + k];
    }
    for (let k = 0; k < Mpix; k++) {
      map[k * Mpix] = map[k * Mpix + 1]; map[k * Mpix + last] = map[k * Mpix + last - 1];
    }
    return map;
  }

  /* ------------------------------------------------------------------ cosmology (flat LCDM) */

  const C_KMS = 299792.458;
  const MPC_KM = 3.0856775814913673e19;
  const MPC_M = MPC_KM * 1e3, KPC_M = MPC_M / 1e3;
  const G_SI = 6.6743e-11, MSUN = 1.98847e30;

  function comovingDistance(z, H0, Om) {
    // Simpson's rule on 1/E(z); Mpc.
    const n = 200, h = z / n;
    const f = (x) => 1 / Math.sqrt(Om * Math.pow(1 + x, 3) + 1 - Om);
    let s = f(0) + f(z);
    for (let i = 1; i < n; i++) s += f(i * h) * (i % 2 ? 4 : 2);
    return (C_KMS / H0) * s * h / 3;
  }

  function cosmology(H0, Om, zl, zs) {
    const ok = zs > zl + 1e-3;
    const dcl = comovingDistance(zl, H0, Om), dcs = comovingDistance(Math.max(zs, zl + 1e-3), H0, Om);
    const Dl = dcl / (1 + zl), Ds = dcs / (1 + zs), Dls = (dcs - dcl) / (1 + zs);
    const Ddt = (1 + zl) * Dl * Ds / Dls;
    return {
      ok, Dl, Ds, Dls, Ddt,
      // days per arcsec^2 of Fermat potential
      tdScale: ok ? Ddt * MPC_KM / C_KMS * ARCSEC * ARCSEC / 86400 : 0,
      kpcPerArcsecLens: Dl * 1000 * ARCSEC,
      kpcPerArcsecSource: Ds * 1000 * ARCSEC,
      // critical surface density, Msun / kpc^2
      sigmaCrit: ok ? (C_KMS * 1e3) ** 2 / (4 * Math.PI * G_SI) * Ds / (Dl * Dls) / MPC_M * KPC_M * KPC_M / MSUN : NaN,
    };
  }

  /* Mass inside the Einstein radius (Msun) and the velocity dispersion of the isothermal sphere
     with the same Einstein radius (km/s). */
  function einsteinMass(thetaE, cosmo) {
    const th = thetaE * ARCSEC, c = C_KMS * 1e3;
    return c * c / (4 * G_SI) * th * th * cosmo.Dl * cosmo.Ds / cosmo.Dls * MPC_M / MSUN;
  }
  function sigmaSIS(thetaE, cosmo) {
    return C_KMS * Math.sqrt(thetaE * ARCSEC * cosmo.Ds / (4 * Math.PI * cosmo.Dls));
  }

  /* ------------------------------------------------------------------ refit to image positions */

  /* Adjust the main lens (theta_E, e1, e2, centre, external shear, optionally the slope) and the
     source so that the model reproduces the target image positions, with multipoles, perturbers and
     the mass sheet held fixed. Minimises the source-plane mismatch mapped back to the image plane,
     sum_i |A_i^-1 (beta(theta_i) - beta_s)|^2, with Levenberg-Marquardt from several starts.
     Positions alone leave the model under-determined (a quad gives 8 numbers for 9 parameters), so
     a very weak pull towards the starting model picks, among all models that fit, the one that
     changes the lens least. Its effect on the fit is far below a microarcsecond. */
  function fitToImages(L0, targets, source0, opts) {
    opts = opts || {};
    const fitSlope = !!opts.fitSlope;
    const sh0 = (L0.phiExt || 0) * DEG;
    const lo = [0.3, -E_MAX, -E_MAX, -1, -1, -0.3, -0.3, -4, -4, 1.3];
    const hi = [2.5, E_MAX, E_MAX, 1, 1, 0.3, 0.3, 4, 4, 2.7];
    const np = fitSlope ? 10 : 9;

    const toL = (p) => {
      const c = clampEllipticity(p[1], p[2]);
      const g = Math.min(Math.hypot(p[5], p[6]), 0.3);
      return Object.assign({}, L0, {
        thetaE: p[0], e1: c.e1, e2: c.e2, cx: p[3], cy: p[4],
        gext: g, phiExt: g > 1e-9 ? 0.5 * Math.atan2(p[6], p[5]) / DEG : 0,
        gamma: fitSlope ? p[9] : L0.gamma,
      });
    };
    const e0 = clampEllipticity(L0.e1 || 0, L0.e2 || 0);
    const p0 = [L0.thetaE, e0.e1, e0.e2, L0.cx || 0, L0.cy || 0,
      (L0.gext || 0) * Math.cos(2 * sh0), (L0.gext || 0) * Math.sin(2 * sh0), source0.x, source0.y, L0.gamma];
    const PULL = 1e-4;                               // weight of the pull towards p0 (lens only)
    const pulled = fitSlope ? [0, 1, 2, 3, 4, 5, 6, 9] : [0, 1, 2, 3, 4, 5, 6];
    const nPos = 2 * targets.length, nr = nPos + pulled.length;

    const o = new Float64Array(6);
    const residuals = (p, r) => {
      const M = compile(toL(p));
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        evalAll(M, t.x, t.y, o);
        const dbx = t.x - o[0] - p[7], dby = t.y - o[1] - p[8];
        const a11 = 1 - o[3], a12 = -o[4], a22 = 1 - o[5];
        const det = a11 * a22 - a12 * a12;
        if (Math.abs(det) < 1e-5) { r[2 * i] = 10 * dbx; r[2 * i + 1] = 10 * dby; continue; }
        r[2 * i] = (a22 * dbx - a12 * dby) / det;
        r[2 * i + 1] = (-a12 * dbx + a11 * dby) / det;
      }
      for (let k = 0; k < pulled.length; k++) r[nPos + k] = PULL * (p[pulled[k]] - p0[pulled[k]]);
      let s = 0;
      for (let i = 0; i < nr; i++) s += r[i] * r[i];
      return s;
    };
    const clip = (p) => { for (let k = 0; k < np; k++) p[k] = Math.min(hi[k], Math.max(lo[k], p[k])); return p; };

    const lm = (start) => {
      let p = clip(start.slice(0, np)), r = new Float64Array(nr), cost = residuals(p, r);
      let damp = 1e-3;
      const J = new Float64Array(nr * np), r2 = new Float64Array(nr);
      for (let it = 0; it < 200; it++) {
        for (let k = 0; k < np; k++) {
          const q = p.slice(), hstep = 1e-6;
          q[k] += hstep;
          residuals(q, r2);
          for (let i = 0; i < nr; i++) J[i * np + k] = (r2[i] - r[i]) / hstep;
        }
        const A = new Float64Array(np * np), g = new Float64Array(np);
        for (let i = 0; i < nr; i++) for (let a = 0; a < np; a++) {
          g[a] += J[i * np + a] * r[i];
          for (let b = a; b < np; b++) A[a * np + b] += J[i * np + a] * J[i * np + b];
        }
        for (let a = 0; a < np; a++) for (let b = 0; b < a; b++) A[a * np + b] = A[b * np + a];
        let improved = false, gain = 0;
        for (let tries = 0; tries < 14; tries++) {
          const B = A.slice();
          for (let a = 0; a < np; a++) B[a * np + a] += damp * (A[a * np + a] + 1e-12);
          const step = solve(B, g, np);
          if (step) {
            const q = p.map((v, k) => v - step[k]);
            clip(q);
            const c2 = residuals(q, r2);
            if (c2 < cost) { gain = cost - c2; p = q; cost = c2; r.set(r2); damp = Math.max(damp / 5, 1e-9); improved = true; break; }
          }
          damp *= 6;
        }
        if (!improved || gain < 1e-18 + 1e-10 * cost) break;
      }
      let pos = 0;
      for (let i = 0; i < nPos; i++) pos += r[i] * r[i];
      return { p, cost, pos };
    };

    const starts = [p0.slice()];
    const n = targets.length;
    const gx = targets.reduce((a, t) => a + t.x, 0) / n, gy = targets.reduce((a, t) => a + t.y, 0) / n;
    const rMean = targets.reduce((a, t) => a + Math.hypot(t.x - gx, t.y - gy), 0) / n;
    for (const [e1, e2] of [[0, 0], [0.15, 0], [0, 0.15], [-0.15, 0], [0, -0.15]]) {
      const st = [rMean, e1, e2, gx, gy, 0, 0, 0, 0, L0.gamma];
      const M = compile(toL(clip(st)));
      let bx = 0, by = 0;
      for (const t of targets) { const b = beta(M, t.x, t.y); bx += b.x / n; by += b.y / n; }
      st[7] = bx; st[8] = by;
      starts.push(st);
    }

    // Judge each start by the images its model actually produces: a small source-plane mismatch
    // can still hide a different image count. Among equals, the smaller change of the lens wins.
    let best = null;
    const half = opts.half || 3, Nfit = opts.gridN || 140;
    for (const st of starts) {
      const fit = lm(st);
      if (!isFinite(fit.cost)) continue;
      const L = toL(fit.p), M = compile(L);
      const images = findImages(M, buildGrid(M, half, Nfit), fit.p[7], fit.p[8]);
      let rms = 0;
      for (const t of targets) {
        let d = 1;
        for (const im of images) d = Math.min(d, Math.hypot(im.x - t.x, im.y - t.y));
        rms += d * d;
      }
      rms = Math.sqrt(rms / n);
      const bright = images.filter(im => im.absMu >= 1).length;
      const score = Math.max(rms, 1e-6) + 0.5 * Math.abs(bright - n) + 1e-3 * Math.sqrt(Math.max(fit.cost - fit.pos, 0)) / PULL;
      if (!best || score < best.score) best = { score, rms, L, source: { x: fit.p[7], y: fit.p[8] }, cost: fit.cost };
    }
    return best;
  }

  /* Solve A x = b for a small symmetric positive-definite system (Gaussian elimination with
     partial pivoting). Returns null if singular. */
  function solve(A, b, n) {
    const a = A.slice(), x = b.slice();
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(a[r * n + c]) > Math.abs(a[piv * n + c])) piv = r;
      if (Math.abs(a[piv * n + c]) < 1e-300) return null;
      if (piv !== c) {
        for (let k = 0; k < n; k++) { const t = a[c * n + k]; a[c * n + k] = a[piv * n + k]; a[piv * n + k] = t; }
        const t = x[c]; x[c] = x[piv]; x[piv] = t;
      }
      for (let r = c + 1; r < n; r++) {
        const m = a[r * n + c] / a[c * n + c];
        if (m === 0) continue;
        for (let k = c; k < n; k++) a[r * n + k] -= m * a[c * n + k];
        x[r] -= m * x[c];
      }
    }
    for (let c = n - 1; c >= 0; c--) {
      let s = x[c];
      for (let k = c + 1; k < n; k++) s -= a[c * n + k] * x[k];
      x[c] = s / a[c * n + c];
    }
    return x;
  }

  /* ------------------------------------------------------------------ light profiles */

  function sersicB(n) {
    return 2 * n - 1 / 3 + 4 / (405 * n) + 46 / (25515 * n * n);
  }

  const SPIRAL_EXTENT = 3.2;      // half-width of the spiral-galaxy texture, in effective radii

  function hash2(ix, iy, seed) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /* Smooth noise in [0, 1] on an n x n grid: a few octaves of interpolated lattice values, the
     coarsest with `periods` cells across the grid. */
  function noiseField(n, periods, octaves, seed) {
    const f = new Float32Array(n * n);
    let norm = 0;
    for (let o = 0, amp = 1, freq = periods; o < octaves; o++, amp *= 0.5, freq *= 2) {
      norm += amp;
      for (let j = 0; j < n; j++) {
        const y = j / n * freq, y0 = Math.floor(y), ty = y - y0, sy = ty * ty * (3 - 2 * ty);
        for (let i = 0; i < n; i++) {
          const x = i / n * freq, x0 = Math.floor(x), tx = x - x0, sx = tx * tx * (3 - 2 * tx);
          const a = hash2(x0, y0, seed + o), b = hash2(x0 + 1, y0, seed + o);
          const c = hash2(x0, y0 + 1, seed + o), d = hash2(x0 + 1, y0 + 1, seed + o);
          f[j * n + i] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
        }
      }
    }
    for (let k = 0; k < f.length; k++) f[k] /= norm;
    return f;
  }

  /* A face-on spiral galaxy to use as the source: an exponential disc of old stars, a bulge,
     logarithmic arms of young stars with dust lanes along one edge, and star-forming regions strung
     along the arms. Noise makes the arms patchy and bends them, so no two are alike.

     Returns { w, h, data, extent }: RGBA float texture spanning +-extent effective radii, in units
     of the disc's surface brightness at the effective radius (so it follows a Sersic n = 1 host
     with the same size and brightness when the arms, bulge and clumps are switched off).
     o = { arms, pitch (degrees), contrast, bulge, clumps, seed, size }. */
  function spiralGalaxy(o) {
    const n = o.size || 720, ext = SPIRAL_EXTENT;
    const m = Math.max(1, Math.round(o.arms == null ? 2 : o.arms));
    const wind = 1 / Math.tan((o.pitch == null ? 18 : o.pitch) * DEG);
    const c = o.contrast == null ? 0.8 : o.contrast, bulge = o.bulge == null ? 1 : o.bulge;
    const clumps = o.clumps == null ? 0.6 : o.clumps, seed = (o.seed || 1) | 0;
    const data = new Float32Array(n * n * 4);

    const nn = 256, patchy = noiseField(nn, 14, 3, seed * 3 + 1), bend = noiseField(nn, 5, 2, seed * 5 + 2);
    const sample = (f, u, v) => {
      const x = Math.min(nn - 1.001, Math.max(0, u * nn - 0.5)), y = Math.min(nn - 1.001, Math.max(0, v * nn - 0.5));
      const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j, k = j * nn + i;
      return (f[k] * (1 - a) + f[k + 1] * a) * (1 - b) + (f[k + nn] * (1 - a) + f[k + nn + 1] * a) * b;
    };
    const step = (lo, hi, x) => { const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
    const phase = 2 * Math.PI * hash2(seed, 17, 99), BEND = 2.4;

    for (let j = 0; j < n; j++) {
      const y = ext - (j + 0.5) / n * 2 * ext;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) / n * 2 * ext - ext, r = Math.hypot(x, y);
        if (r >= ext) continue;
        const u = (i + 0.5) / n, v = (j + 0.5) / n;
        const fl = sample(patchy, u, v), wb = sample(bend, u, v) - 0.5;
        // the arms begin outside the bulge; everything fades out before the edge of the texture
        const ce = c * step(0.12, 0.55, r), edge = 1 - step(2.6, 3.15, r);
        const psi = m * (Math.atan2(y, x) - wind * Math.log(r + 0.06)) + phase + BEND * wb;
        const arm = Math.exp(2.6 * (Math.cos(psi) - 1));
        const lane = Math.exp(7 * (Math.cos(psi + 0.9) - 1));
        const disc = Math.exp(-1.678 * (r - 1));
        const old = disc * (1 - 0.42 * Math.min(ce, 1));
        const young = 1.7 * disc * ce * arm * (0.35 + 1.5 * fl);
        const dust = Math.min(0.8, 0.75 * ce * lane * (0.4 + 1.2 * fl));
        const core = 9 * bulge * Math.exp(-Math.pow(r / 0.1, 0.8));
        const p = 4 * (j * n + i);
        // old stars are yellow, young ones blue; dust takes out blue light first
        data[p] = ((old * 1.0 + young * 0.62) * (1 - 0.55 * dust) + core * 1.0) * edge;
        data[p + 1] = ((old * 0.89 + young * 0.8) * (1 - 0.75 * dust) + core * 0.8) * edge;
        data[p + 2] = ((old * 0.76 + young * 1.0) * (1 - 0.92 * dust) + core * 0.56) * edge;
        data[p + 3] = 1;
      }
    }

    // star-forming regions: compact knots along the arms, most of them blue, some pink
    let state = (seed * 9781 + 7) | 0;
    const rnd = () => { state = (Math.imul(state, 1664525) + 1013904223) | 0; return (state >>> 0) / 4294967296; };
    const count = Math.round(170 * clumps * Math.sqrt(m / 2)), px = n / (2 * ext);
    for (let q = 0; q < count; q++) {
      const r = 0.3 - 0.8 * Math.log(1 - 0.955 * rnd());
      let phi = wind * Math.log(r + 0.06) - phase / m + 2 * Math.PI * Math.floor(rnd() * m) / m + 0.5 * (rnd() + rnd() - 1) / m;
      const wb = sample(bend, (r * Math.cos(phi) + ext) / (2 * ext), (ext - r * Math.sin(phi)) / (2 * ext)) - 0.5;
      phi -= BEND * wb / m;
      const cx = (r * Math.cos(phi) + ext) * px, cy = (ext - r * Math.sin(phi)) * px;
      const sig = (0.012 + 0.03 * rnd() * rnd()) * px;
      const amp = Math.exp(-1.678 * (r - 1)) * (1.2 + 4 * rnd()) * Math.min(c + 0.3, 1.3) * (1 - step(2.6, 3.15, r));
      const pink = rnd() < 0.25, cr = pink ? 1.0 : 0.7, cg = pink ? 0.6 : 0.85, cb = pink ? 0.68 : 1.0;
      const R = Math.ceil(3 * sig), k2 = 1 / (2 * sig * sig);
      for (let j = Math.max(0, Math.floor(cy - R)); j <= Math.min(n - 1, Math.ceil(cy + R)); j++) {
        for (let i = Math.max(0, Math.floor(cx - R)); i <= Math.min(n - 1, Math.ceil(cx + R)); i++) {
          const w = amp * Math.exp(-((i + 0.5 - cx) * (i + 0.5 - cx) + (j + 0.5 - cy) * (j + 0.5 - cy)) * k2), p = 4 * (j * n + i);
          data[p] += cr * w; data[p + 1] += cg * w; data[p + 2] += cb * w;
        }
      }
    }
    return { w: n, h: n, data, extent: ext };
  }

  return {
    DEG, ARCSEC, E_MAX, MU_MIN,
    clampEllipticity, qphiFromE, eFromQPhi,
    compile, evalAll, deflect, beta, potential, local,
    buildGrid, gridX, gridY, findImages, contour, criticalCurves, magnificationMap,
    comovingDistance, cosmology, einsteinMass, sigmaSIS,
    fitToImages, solve, sersicB, spiralGalaxy, SPIRAL_EXTENT,
  };
});
