// Numerical checks for the standalone simulator in random/lensing/ (run: node --test tests/).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../random/lensing/physics.js');
const T = require('../random/lensing/timedomain.js');

const near = (a, b, tol = 1e-6, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} vs ${b} (tol ${tol})`);
const base = { thetaE: 1.2, gamma: 2, e1: 0, e2: 0, cx: 0, cy: 0, gext: 0, phiExt: 0, lambda: 1, perts: [] };
const rich = {
  thetaE: 1.3, gamma: 2.15, e1: 0.12, e2: -0.09, cx: 0.07, cy: -0.04, gext: 0.06, phiExt: 35,
  a3: 0.012, phi3: 20, a4: -0.015, phi4: 10, lambda: 0.93,
  perts: [{ x: 0.9, y: 0.6, thetaE: 0.12, on: true }, { x: -1.4, y: 0.3, thetaE: 0.2, on: false }],
};

test('Hessian and deflection are the derivatives of the potential', () => {
  for (const L of [rich, { ...rich, gamma: 1.7, lambda: 1 }, { ...base, e1: 0.3, e2: 0.2 }]) {
    const M = P.compile(L), h = 1e-5, o = new Float64Array(6);
    for (const [x, y] of [[0.8, 0.5], [-1.1, 0.4], [0.3, -1.6], [1.9, 1.2]]) {
      const v = Array.from(P.evalAll(M, x, y, o));
      const at = (dx, dy) => Array.from(P.evalAll(M, x + dx, y + dy, new Float64Array(6)));
      const xp = at(h, 0), xm = at(-h, 0), yp = at(0, h), ym = at(0, -h);
      near(v[0], (xp[2] - xm[2]) / (2 * h), 1e-7, 'alpha_x');
      near(v[1], (yp[2] - ym[2]) / (2 * h), 1e-7, 'alpha_y');
      near(v[3], (xp[0] - xm[0]) / (2 * h), 1e-6, 'psi_xx');
      near(v[5], (yp[1] - ym[1]) / (2 * h), 1e-6, 'psi_yy');
      near(v[4], (yp[0] - ym[0]) / (2 * h), 1e-6, 'psi_xy');
      near(v[4], (xp[1] - xm[1]) / (2 * h), 1e-6, 'curl-free');
    }
  }
});

test('EPL convergence follows the lenstronomy convention', () => {
  for (const gamma of [1.6, 2, 2.4]) for (const q of [0.4, 0.75, 1]) for (const phi of [0, 0.6, -1.1]) {
    const { e1, e2 } = P.eFromQPhi(q, phi);
    const M = P.compile({ ...base, gamma, e1, e2 });
    const x = 0.9, y = -0.7;
    const X = Math.cos(phi) * x + Math.sin(phi) * y, Y = -Math.sin(phi) * x + Math.cos(phi) * y;
    const R = Math.hypot(q * X, Y);
    const expected = (3 - gamma) / 2 * Math.pow(base.thetaE * Math.sqrt(q) / R, gamma - 1);
    near(P.local(M, x, y).kappa, expected, 1e-9, `gamma ${gamma} q ${q}`);
  }
});

test('an isothermal ellipsoid has a critical curve enclosing pi theta_E^2 and no radial curve', () => {
  const { e1, e2 } = P.eFromQPhi(0.6, 0.4);
  const M = P.compile({ ...base, e1, e2 });
  const curves = P.criticalCurves(M, P.buildGrid(M, 3, 400));
  assert.equal(curves.tan.length, 1);
  assert.equal(curves.rad.length, 0);
  const c = curves.tan[0];
  let area = 0;
  for (let k = 0; k + 3 < c.length; k += 2) area += c[k] * c[k + 3] - c[k + 2] * c[k + 1];
  near(Math.abs(area) / 2, Math.PI * 1.2 * 1.2, 2e-3);
  // the caustic of an elliptical isothermal lens is an astroid with four cusps: it stays compact
  const s = curves.tanCaustic[0];
  for (let k = 0; k < s.length; k += 2) assert.ok(Math.hypot(s[k], s[k + 1]) < 0.75);
});

test('a shallow profile has a radial critical curve and a central image', () => {
  const M = P.compile({ ...base, gamma: 1.3, e1: 0.1 });
  const G = P.buildGrid(M, 3, 300);
  assert.equal(P.criticalCurves(M, G).rad.length, 1);
  const images = P.findImages(M, G, 0.03, 0.02);
  assert.equal(images.length, 5);
  assert.equal(images.filter(i => i.type === 'max').length, 1);
  assert.equal(images.filter(i => i.type === 'min').length, 2);
  assert.equal(images.filter(i => i.type === 'saddle').length, 2);
});

test('singular isothermal sphere: positions, magnifications and delay are analytic', () => {
  const M = P.compile(base), G = P.buildGrid(M, 3, 200);
  const u = 0.25, b = base.thetaE;
  const images = P.findImages(M, G, u, 0).sort((a, c) => c.x - a.x);
  assert.equal(images.length, 2);
  near(images[0].x, u + b, 1e-9); near(images[1].x, u - b, 1e-9);
  near(images[0].mu, (u + b) / u, 1e-7); near(images[1].mu, (u - b) / u, 1e-7);
  assert.equal(images[0].type, 'min'); assert.equal(images[1].type, 'saddle');
  near(images[1].tau - images[0].tau, 2 * b * u, 1e-9);
});

test('every image of a quad solves the lens equation, with two minima and two saddles', () => {
  const L = { ...base, thetaE: 1.4, e1: 0.11, e2: 0.19, gext: 0.05, phiExt: 15 };
  const M = P.compile(L), G = P.buildGrid(M, 3, 240);
  for (const [sx, sy] of [[0.05, 0.02], [-0.08, 0.1], [0.0, 0.0], [0.12, -0.05]]) {
    const images = P.findImages(M, G, sx, sy);
    assert.equal(images.length, 4, `source ${sx}, ${sy}`);
    assert.equal(images.filter(i => i.type === 'min').length, 2);
    assert.equal(images.filter(i => i.type === 'saddle').length, 2);
    for (const im of images) {
      const b = P.beta(M, im.x, im.y);
      near(Math.hypot(b.x - sx, b.y - sy), 0, 1e-9);
    }
    // minima arrive before the saddles they are paired with: the earliest image is a minimum
    assert.equal(images.slice().sort((a, c) => a.tau - c.tau)[0].type, 'min');
  }
});

test('image finding does not depend on the grid resolution', () => {
  const L = { ...rich, lambda: 1 }, M = P.compile(L);
  const ref = P.findImages(M, P.buildGrid(M, 3, 480), 0.06, -0.03);
  for (const N of [120, 200, 320]) {
    const images = P.findImages(M, P.buildGrid(M, 3, N), 0.06, -0.03);
    assert.equal(images.length, ref.length, `N = ${N}`);
    for (const r of ref) assert.ok(images.some(i => Math.hypot(i.x - r.x, i.y - r.y) < 1e-7));
  }
});

test('the mass-sheet transform leaves the images alone and rescales delays and magnifications', () => {
  const L = { ...rich, lambda: 1 }, lam = 0.85, sx = 0.07, sy = -0.02;
  const M1 = P.compile(L), M2 = P.compile({ ...L, lambda: lam });
  const a = P.findImages(M1, P.buildGrid(M1, 3, 240), sx, sy).sort((p, q) => p.tau - q.tau);
  const b = P.findImages(M2, P.buildGrid(M2, 3, 240), lam * sx, lam * sy).sort((p, q) => p.tau - q.tau);
  assert.equal(a.length, b.length);
  assert.ok(a.length >= 4);
  a.forEach((im, i) => {
    near(b[i].x, im.x, 1e-8); near(b[i].y, im.y, 1e-8);
    near(b[i].mu * lam * lam, im.mu, 1e-6 * Math.abs(im.mu));
    near(b[i].tau - b[0].tau, lam * (im.tau - a[0].tau), 1e-9);
  });
});

test('contours come back as connected polylines', () => {
  const N = 81, f = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) f[j * N + i] = Math.hypot(i - 40, j - 40);
  const lines = P.contour(f, N, 25.3);
  assert.equal(lines.length, 1);
  const l = lines[0];
  assert.deepEqual(l[0], l[l.length - 1]);
  let len = 0;
  for (let k = 1; k < l.length; k++) len += Math.hypot(l[k][0] - l[k - 1][0], l[k][1] - l[k - 1][1]);
  near(len, 2 * Math.PI * 25.3, 0.2);
  assert.equal(P.contour(f, N, 25.3, 2).length, 1);
  // a level that leaves the grid gives open lines
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) f[j * N + i] = i + 0.3 * j;
  const open = P.contour(f, N, 30.5);
  assert.equal(open.length, 1);
  assert.notDeepEqual(open[0][0], open[0][open[0].length - 1]);
});

test('ray-shot magnification map agrees with the point-image magnifications', () => {
  const L = { ...base, e1: 0.15 }, M = P.compile(L), G = P.buildGrid(M, 4, 500);
  const half = 1, Mpix = 50, map = P.magnificationMap(G, half, Mpix, 3);
  for (const [sx, sy] of [[0.61, 0.33], [-0.45, -0.55], [0.03, 0.05]]) {
    const total = P.findImages(M, G, sx, sy).reduce((s, i) => s + i.absMu, 0);
    const px = Math.floor((sx + half) / (2 * half) * Mpix), py = Math.floor((half - sy) / (2 * half) * Mpix);
    near(map[py * Mpix + px] / total, 1, 0.12, `source ${sx}, ${sy}`);
  }
});

test('flat LCDM distances and the Einstein mass scale', () => {
  near(P.comovingDistance(0.5, 70, 0.3) / 1.5, 1259.1, 1.5);
  near(P.comovingDistance(2, 70, 0.3) / 3, 1726.6, 2);
  const c = P.cosmology(70, 0.3, 0.5, 2);
  near(c.Ddt, 1.5 * c.Dl * c.Ds / c.Dls, 1e-9);
  near(c.tdScale, 83.3, 0.5);                      // days per arcsec^2
  near(P.cosmology(35, 0.3, 0.5, 2).tdScale, 2 * c.tdScale, 1e-6);
  near(c.kpcPerArcsecLens, 6.10, 0.02);
  const sigma = P.sigmaSIS(1, c);
  near(sigma, 233.8, 1);
  // an isothermal sphere encloses M = pi sigma^2 theta_E D_l / G inside its Einstein radius
  const G = 4.30091e-6;                             // kpc (km/s)^2 / Msun
  near(P.einsteinMass(1, c) / (Math.PI * sigma * sigma * c.kpcPerArcsecLens / G), 1, 2e-3);
  near(P.einsteinMass(1, c) / (c.sigmaCrit * Math.PI * c.kpcPerArcsecLens ** 2), 1, 1e-6);
});

test('refitting the main lens reproduces pinned image positions', () => {
  const truth = { ...base, thetaE: 1.35, e1: 0.14, e2: 0.1, gext: 0.06, phiExt: -20, cx: 0.05, cy: 0.02 };
  const Mt = P.compile(truth);
  const targets = P.findImages(Mt, P.buildGrid(Mt, 3, 240), 0.06, 0.03);
  assert.equal(targets.length, 4);
  // start from a clearly different model
  const start = { ...base, thetaE: 1.1, e1: 0, e2: 0.05 };
  const fit = P.fitToImages(start, targets, { x: 0, y: 0 });
  assert.ok(fit.rms < 1e-4, `rms ${fit.rms}`);
  // a different slope reaches the same positions with different delays: the slope-H0 degeneracy
  const steep = P.fitToImages({ ...truth, gamma: 2.2 }, targets, { x: 0.06, y: 0.03 });
  assert.ok(steep.rms < 1e-3, `rms ${steep.rms}`);
  const Ms = P.compile(steep.L);
  const im = P.findImages(Ms, P.buildGrid(Ms, 3, 240), steep.source.x, steep.source.y);
  const span = (list) => Math.max(...list.map(i => i.tau)) - Math.min(...list.map(i => i.tau));
  assert.ok(span(im) / span(targets) > 1.1, `delay ratio ${span(im) / span(targets)}`);
});

/* ---------------------------------------------------------------- time domain */

test('the damped random walk has the requested amplitude and correlation time', () => {
  const sigma = 0.2, tau = 120;
  const x = T.ouSeries(200000, 1, tau, sigma, 7);
  let m = 0, v = 0, c = 0;
  for (const s of x) m += s / x.length;
  for (let i = 0; i < x.length; i++) v += (x[i] - m) ** 2 / x.length;
  for (let i = 0; i + tau < x.length; i++) c += (x[i] - m) * (x[i + tau] - m) / (x.length - tau);
  near(Math.sqrt(v), sigma, 0.03);
  near(c / v, Math.exp(-1), 0.08);
});

test('delays are recovered from sampled, noisy light curves', () => {
  const cfg = { ...T.DEFAULTS, type: 'drw', sigma: 0.18, tau: 150, duration: 1500, seed: 3, cadence: 4, noise: 0.01, season: 8, micro: false };
  const model = T.makeSignal(cfg);
  for (const delay of [14.2, 47.5, 91]) {
    const images = [{ dt: 0, absMu: 4 }, { dt: delay, absMu: 2.5 }];
    const data = T.sample(model, cfg, images, 1);
    assert.ok(data[0].t.length > 150);
    const est = T.estimateDelay(data[0], data[1], { maxLag: 160 });
    near(est.delay, delay, 2.5, `delay ${delay}`);
    // the offset between the curves is the magnitude difference of the magnifications
    near(est.offset, 2.5 * Math.log10(4 / 2.5), 0.03);
  }
});

test('a transient reaches each image after its delay', () => {
  const cfg = { ...T.DEFAULTS, type: 'transient', sigma: 1.2, duration: 600, seed: 1 };
  const model = T.makeSignal(cfg);
  let tPeak = 0, best = Infinity;
  for (let t = 0; t < 600; t += 0.5) { const m = model.mag(t); if (m < best) { best = m; tPeak = t; } }
  near(best, -1.2, 0.02);
  assert.ok(tPeak > 60 && tPeak < 300);
  near(model.mag(-200), 0, 1e-3);
});

/* ---------------------------------------------------------------- presets and links */

const App = require('../random/lensing/state.js');

test('every preset produces the image configuration it describes', () => {
  for (const preset of App.PRESETS) {
    if (!preset.id) continue;
    const s = App.defaults();
    App.applyPreset(preset.id, s);
    const M = P.compile(App.lensOf(s));
    const images = P.findImages(M, P.buildGrid(M, s.halfImg, 300), s.sx, s.sy);
    assert.equal(images.length, preset.images, preset.id);
    assert.ok(P.cosmology(s.H0, s.Om, s.zl, s.zs).ok, preset.id);
    for (const im of images) assert.ok(Math.abs(im.x) < s.halfImg - 0.3 && Math.abs(im.y) < s.halfImg - 0.3, `${preset.id}: image near the edge`);
  }
});

test('a configuration survives the trip through a link', () => {
  const s = App.defaults();
  App.applyPreset('rxj1131', s);
  Object.assign(s, { view: 'delays', lambda: 0.92, a4: -0.012, inst: 'hst', showTau: true, lcType: 'transient', monOn: true, order: 'arrival' });
  s.perts.push({ x: -0.5, y: 1.25, thetaE: 0.07, on: false });
  assert.deepEqual(App.decode('#' + App.encode(s)), s);
  assert.equal(App.encode(App.defaults()), '');
  // the default state is the first preset
  const d = App.defaults();
  App.applyPreset('cross', d);
  assert.deepEqual(d, App.defaults());
  // hostile or broken links fall back to valid values
  const bad = App.decode('#thetaE=1e9&gamma=abc&view=nope&perts=1_2&res=-5&zl=<script>');
  assert.equal(bad.thetaE, App.PARAMS.thetaE.max);
  assert.equal(bad.gamma, 2); assert.equal(bad.view, 'imaging'); assert.equal(bad.perts.length, 0);
  assert.equal(bad.res, App.PARAMS.res.min); assert.equal(bad.zl, 0.5);
});

/* ---------------------------------------------------------------- spiral source */

test('the spiral host reduces to an exponential disc and has as many arms as asked for', () => {
  const ring = (tex, r, f) => {                     // sample f(R, G, B) around a circle of radius r (effective radii)
    const out = [], n = tex.w;
    for (let k = 0; k < 720; k++) {
      const a = 2 * Math.PI * k / 720;
      const i = Math.floor((r * Math.cos(a) + tex.extent) / (2 * tex.extent) * n), j = Math.floor((tex.extent - r * Math.sin(a)) / (2 * tex.extent) * n);
      const p = 4 * (j * n + i);
      out.push(f(tex.data[p], tex.data[p + 1], tex.data[p + 2]));
    }
    return out;
  };
  const lum = (r, g, b) => (r + g + b) / 3;
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

  // without arms, bulge or clumps it is the n = 1 disc: the mean of the old-star colour at R_eff
  const plain = P.spiralGalaxy({ contrast: 0, bulge: 0, clumps: 0, size: 480 });
  near(mean(ring(plain, 1, lum)), (1 + 0.89 + 0.76) / 3, 0.01);
  near(mean(ring(plain, 2, lum)) / mean(ring(plain, 1, lum)), Math.exp(-1.678), 0.01);
  for (const v of plain.data) assert.ok(v >= 0 && Number.isFinite(v));

  // the strongest angular harmonic of the light is the number of arms
  for (const arms of [2, 3, 4]) {
    const tex = P.spiralGalaxy({ arms, contrast: 1, bulge: 1, clumps: 0, seed: 3, size: 480 });
    const power = [];
    for (let h = 1; h <= 8; h++) {
      let total = 0;
      for (const r of [0.9, 1.2, 1.5, 1.8]) {
        const v = ring(tex, r, lum);
        let re = 0, im = 0;
        v.forEach((x, k) => { re += x * Math.cos(2 * Math.PI * h * k / v.length); im += x * Math.sin(2 * Math.PI * h * k / v.length); });
        total += Math.hypot(re, im) / mean(v);
      }
      power.push(total);
    }
    assert.equal(power.indexOf(Math.max(...power)) + 1, arms, `arms = ${arms}: ${power.map(p => p.toFixed(0))}`);
  }

  // arms are bluer than the disc between them, and the same seed gives the same galaxy
  const tex = P.spiralGalaxy({ arms: 2, contrast: 1, clumps: 0, seed: 5, size: 480 });
  const blue = ring(tex, 1.3, (r, g, b) => b / r), light = ring(tex, 1.3, lum);
  const bright = light.map((v, k) => [v, blue[k]]).sort((a, b) => b[0] - a[0]);
  assert.ok(mean(bright.slice(0, 100).map(x => x[1])) > 1.3 * mean(bright.slice(-100).map(x => x[1])));
  assert.deepEqual(P.spiralGalaxy({ seed: 5, size: 96 }).data, P.spiralGalaxy({ seed: 5, size: 96 }).data);
  assert.notDeepEqual(P.spiralGalaxy({ seed: 5, size: 96 }).data, P.spiralGalaxy({ seed: 6, size: 96 }).data);
});
