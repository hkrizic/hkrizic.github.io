/* Time domain for the simulator: the quasar's intrinsic variability, what a monitoring campaign
   would record of each lensed image, and a delay estimate from those records. Pure functions.
   Magnitudes throughout: smaller is brighter. Times are observer-frame days. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LensTime = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const YEAR = 365.25;
  const LEAD = 2600;          // days of signal generated before t = 0, so delayed images have a past
  const SPAN = 3400;          // and after it

  const DEFAULTS = {
    type: 'drw',              // drw | sine | transient
    sigma: 0.15,              // drw: rms (mag); sine: rms (mag); transient: peak brightening (mag)
    tau: 150,                 // drw correlation time (days)
    period: 120,              // sine period (days)
    duration: 1200,           // length of the campaign (days)
    seed: 1,
    cadence: 4,               // days between visits
    noise: 0.015,             // photometric error of the brightest image (mag)
    season: 8,                // months per year in which the object can be observed
    micro: false, microAmp: 0.05,
  };

  function mulberry32(seed) {
    let a = (seed | 0) + 0x6D2B79F5;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussian(rand) {
    const u = Math.max(rand(), 1e-12), v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* Ornstein-Uhlenbeck process sampled every dt: the damped random walk used to describe quasar
     variability (Kelly, Bechtold & Siemiginowska 2009). sigma is the stationary rms. */
  function ouSeries(n, dt, tau, sigma, seed) {
    const rand = mulberry32(seed), x = new Float32Array(n);
    const keep = Math.exp(-dt / tau), kick = sigma * Math.sqrt(1 - keep * keep);
    let v = sigma * gaussian(rand);
    for (let i = 0; i < n; i++) { x[i] = v; v = v * keep + kick * gaussian(rand); }
    return x;
  }

  function seriesAt(x, t0, dt, t) {
    const f = Math.min(Math.max((t - t0) / dt, 0), x.length - 1.001);
    const i = Math.floor(f), w = f - i;
    return x[i] * (1 - w) + x[i + 1] * w;
  }

  /* The intrinsic light curve, as a magnitude offset from the mean, plus a slow independent
     microlensing drift for each image. */
  function makeSignal(cfg) {
    let mag;
    if (cfg.type === 'sine') {
      const amp = cfg.sigma * Math.SQRT2;
      mag = (t) => amp * Math.sin(2 * Math.PI * t / cfg.period);
    } else if (cfg.type === 'transient') {
      // fast rise, slow decline (Bazin et al. 2009 shape), normalised to the peak
      const rise = 8, fall = 45, t0 = 80;
      const shape = (t) => Math.exp(-(t - t0) / fall) / (1 + Math.exp(-(t - t0) / rise));
      const peak = shape(t0 + rise * Math.log(fall / rise - 1));
      mag = (t) => (t - t0 < -40 * rise ? 0 : -cfg.sigma * shape(t) / peak);
    } else {
      const x = ouSeries(LEAD + SPAN, 1, cfg.tau, cfg.sigma, cfg.seed * 7919 + 13);
      mag = (t) => seriesAt(x, -LEAD, 1, t);
    }
    const drifts = new Map();
    const micro = (i, t) => {
      if (!cfg.micro || !(cfg.microAmp > 0)) return 0;
      let x = drifts.get(i);
      if (!x) drifts.set(i, x = ouSeries((LEAD + SPAN) / 10, 10, 700, cfg.microAmp, cfg.seed * 104729 + 977 * (i + 1)));
      return seriesAt(x, -LEAD, 10, t);
    };
    return { mag, micro };
  }

  /* Magnitude of image i at time t. images[i] = { dt (days after the first image), absMu }. */
  function imageMag(model, images, i, t) {
    return model.mag(t - images[i].dt) - 2.5 * Math.log10(images[i].absMu) + model.micro(i, t);
  }

  /* Nights on which the campaign observes: a regular cadence with some jitter, inside the yearly
     visibility window. */
  function epochs(cfg) {
    const rand = mulberry32(cfg.seed * 31 + 5), t = [];
    const open = Math.min(Math.max(cfg.season, 1), 12) / 12 * YEAR;
    for (let k = 0; k * cfg.cadence <= cfg.duration; k++) {
      const tk = k * cfg.cadence + (rand() - 0.5) * 0.5 * cfg.cadence;
      if (tk < 0 || tk > cfg.duration) continue;
      if (cfg.season < 12 && (tk % YEAR) > open) continue;
      t.push(tk);
    }
    return Float64Array.from(t);
  }

  /* What the campaign records: one light curve per image, with photometric noise that grows for
     the fainter images. Returns [{ t, m, err }]. */
  function sample(model, cfg, images, noiseSeed) {
    const t = epochs(cfg);
    const brightest = images.reduce((m, im) => Math.max(m, im.absMu), 0) || 1;
    return images.map((im, i) => {
      const rand = mulberry32((noiseSeed || 1) * 65537 + i * 257 + 11);
      const err = Math.min(cfg.noise * Math.sqrt(brightest / im.absMu), 8 * cfg.noise);
      const m = new Float64Array(t.length);
      for (let k = 0; k < t.length; k++) m[k] = imageMag(model, images, i, t[k]) + err * gaussian(rand);
      return { t, m, err };
    });
  }

  /* Delay of curve b behind curve a, by minimising the dispersion between one curve and the other
     shifted in time and interpolated (in both directions), with a free magnitude offset.
     Returns { delay, offset, chi2 }; delay > 0 means b lags a. */
  function estimateDelay(a, b, opts) {
    opts = opts || {};
    const maxLag = opts.maxLag || 150, step = opts.step || 1;
    const gap = opts.maxGap || 2.5 * medianStep(a.t);
    const minOverlap = Math.max(12, 0.2 * (a.t.length + b.t.length));
    const wa = 1 / (a.err * a.err + b.err * b.err);

    const score = (d) => {
      let n = 0, s = 0, s2 = 0;
      let j = 0;
      for (let k = 0; k < b.t.length; k++) {          // b against a, interpolated
        const tq = b.t[k] - d;
        while (j + 1 < a.t.length && a.t[j + 1] < tq) j++;
        if (tq < a.t[j] || j + 1 >= a.t.length || a.t[j + 1] - a.t[j] > gap) continue;
        const w = (tq - a.t[j]) / (a.t[j + 1] - a.t[j]);
        const diff = b.m[k] - (a.m[j] * (1 - w) + a.m[j + 1] * w);
        n++; s += diff; s2 += diff * diff;
      }
      j = 0;
      for (let k = 0; k < a.t.length; k++) {          // a against b, interpolated
        const tq = a.t[k] + d;
        while (j + 1 < b.t.length && b.t[j + 1] < tq) j++;
        if (tq < b.t[j] || j + 1 >= b.t.length || b.t[j + 1] - b.t[j] > gap) continue;
        const w = (tq - b.t[j]) / (b.t[j + 1] - b.t[j]);
        const diff = (b.m[j] * (1 - w) + b.m[j + 1] * w) - a.m[k];
        n++; s += diff; s2 += diff * diff;
      }
      if (n < minOverlap) return null;
      const mean = s / n;
      return { chi2: (s2 - n * mean * mean) * wa / (n - 1), offset: mean };
    };

    let best = null;
    const lo = opts.minLag == null ? -maxLag : opts.minLag;
    for (let d = lo; d <= maxLag + 1e-9; d += step) {
      const r = score(d);
      if (r && (!best || r.chi2 < best.chi2)) best = { delay: d, chi2: r.chi2, offset: r.offset };
    }
    if (!best) return { delay: NaN, offset: NaN, chi2: NaN };
    // refine with a parabola through the minimum and its neighbours
    const l = score(best.delay - step), r = score(best.delay + step);
    if (l && r) {
      const curv = l.chi2 - 2 * best.chi2 + r.chi2;
      if (curv > 0) {
        const shift = 0.5 * (l.chi2 - r.chi2) / curv;
        if (Math.abs(shift) <= 1) {
          const fine = score(best.delay + shift * step);
          if (fine) best = { delay: best.delay + shift * step, chi2: fine.chi2, offset: fine.offset };
        }
      }
    }
    return best;
  }

  function medianStep(t) {
    if (t.length < 2) return 1;
    const d = [];
    for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
    d.sort((x, y) => x - y);
    return d[Math.floor(d.length / 2)];
  }

  /* Delays of every image relative to image `ref`, from the recorded curves, with the scatter over
     fresh noise realisations as the uncertainty. That scatter covers photometric noise only:
     microlensing and the gaps bias the estimate without widening it. */
  function measureDelays(model, cfg, images, ref, opts) {
    opts = opts || {};
    const nReal = opts.realisations || 24;
    const span = images.reduce((m, im) => Math.max(m, Math.abs(im.dt - images[ref].dt)), 0);
    const search = { maxLag: opts.maxLag || Math.max(40, Math.min(1.5 * span + 30, 0.45 * cfg.duration)), step: 1 };
    const run = (seed) => {
      const data = sample(model, cfg, images, seed);
      return images.map((im, i) => (i === ref ? { delay: 0, offset: 0 } : estimateDelay(data[ref], data[i], search)));
    };
    const first = run(opts.noiseSeed || 1);
    const draws = [];
    for (let r = 0; r < nReal; r++) draws.push(run(5000 + r * 17));
    return images.map((im, i) => {
      if (i === ref) return { delay: 0, sigma: 0, offset: 0, ref: true };
      const v = draws.map(d => d[i].delay).filter(isFinite);
      if (v.length < 3 || !isFinite(first[i].delay)) return { delay: NaN, sigma: NaN, offset: NaN };
      const mean = v.reduce((s, x) => s + x, 0) / v.length;
      const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (v.length - 1));
      return { delay: first[i].delay, sigma: Math.max(sd, 0.05), offset: first[i].offset };
    });
  }

  return { YEAR, DEFAULTS, mulberry32, gaussian, ouSeries, makeSignal, imageMag, epochs, sample, estimateDelay, measureDelays };
});
