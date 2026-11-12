/* Simulator state: every adjustable quantity with its range, the presets, and how a configuration
   is written to and read from a URL. No DOM access here, so Node can load it for the tests. */
(function (root) {
  'use strict';
  const P = root.LensPhysics || (typeof require === 'function' ? require('./physics.js') : null);
  const App = {};

  /* Numeric parameters. `at` is the value a slider's fill is drawn from (zero, or a natural
     reference such as the isothermal slope); `dp` the decimals shown. */
  const num = (d, min, max, step, dp, unit, extra) => Object.assign({ d, min, max, step, dp, unit: unit || '' }, extra);
  App.PARAMS = {
    // main lens
    thetaE: num(1.4, 0.3, 2.5, 0.01, 2, '″'),
    gamma: num(2, 1.2, 2.8, 0.01, 2, '', { at: 2 }),
    e1: num(0.1046, -0.7, 0.7, 0.005, 3),
    e2: num(0.1247, -0.7, 0.7, 0.005, 3),
    cx: num(0, -1, 1, 0.01, 2, '″'),
    cy: num(0, -1, 1, 0.01, 2, '″'),
    // environment
    gext: num(0.04, 0, 0.3, 0.005, 3),
    phiExt: num(-20, -90, 90, 1, 0, '°'),
    lambda: num(1, 0.7, 1.3, 0.005, 3, '', { at: 1 }),
    // angular structure
    a3: num(0, -0.05, 0.05, 0.001, 3),
    phi3: num(0, -60, 60, 1, 0, '°'),
    a4: num(0, -0.05, 0.05, 0.001, 3),
    phi4: num(0, -45, 45, 1, 0, '°'),
    // source
    sx: num(0.04, -3, 3, 0.005, 3, '″'),
    sy: num(0.02, -3, 3, 0.005, 3, '″'),
    qsoFlux: num(1, 0, 10, 0.05, 2),
    reff: num(0.15, 0.02, 0.8, 0.005, 3, '″'),
    sersicN: num(1, 0.5, 6, 0.1, 1),
    qs: num(0.7, 0.1, 1, 0.01, 2),
    pa: num(30, -90, 90, 1, 0, '°'),
    ie: num(0.5, 0, 2, 0.02, 2),
    // spiral host
    spArms: num(2, 2, 6, 1, 0),
    spPitch: num(18, 8, 40, 1, 0, '°'),
    spContrast: num(0.8, 0, 1.5, 0.05, 2),
    spBulge: num(1, 0, 3, 0.05, 2),
    spClumps: num(0.6, 0, 1, 0.05, 2),
    spSeed: num(1, 1, 9999, 1, 0),
    // telescope
    fwhm: num(0.08, 0.03, 1.5, 0.01, 2, '″'),
    pix: num(0.04, 0.02, 0.4, 0.005, 3, '″'),
    noise: num(0.02, 0, 0.3, 0.005, 3),
    lensFlux: num(0.6, 0, 2, 0.02, 2),
    stretch: num(0, -1.5, 1.5, 0.05, 2, 'dex', { at: 0 }),
    // cosmology
    H0: num(70, 50, 100, 0.5, 1),
    Om: num(0.3, 0.1, 0.6, 0.01, 2),
    zl: num(0.5, 0.05, 1.5, 0.005, 3),
    zs: num(2, 0.2, 6, 0.01, 2),
    // variability and monitoring
    lcSigma: num(0.15, 0.02, 1.5, 0.01, 2, 'mag'),
    lcTau: num(150, 20, 800, 10, 0, 'd'),
    lcPeriod: num(120, 20, 600, 5, 0, 'd'),
    lcDur: num(1200, 200, 3000, 50, 0, 'd'),
    cadence: num(4, 1, 30, 1, 0, 'd'),
    photNoise: num(0.015, 0.002, 0.1, 0.001, 3, 'mag'),
    season: num(8, 3, 12, 1, 0, 'mo'),
    microAmp: num(0.05, 0.01, 0.3, 0.01, 2, 'mag'),
    // view
    halfImg: num(3, 1.5, 6, 0.5, 1, '″'),
    halfSrc: num(1.5, 0.25, 3, 0.25, 2, '″'),
    res: num(480, 240, 720, 120, 0),
    lcSeed: num(1, 1, 9999, 1, 0),
  };

  /* Switches and choices, with the values each may take. */
  App.OPTIONS = {
    view: ['imaging', 'delays'],
    qsoOn: true, hostOn: true, lensLight: false,
    hostKind: ['sersic', 'spiral', 'pattern', 'image'],
    inst: ['ideal', 'jwst', 'hst', 'euclid', 'rubin', 'ground', 'custom'],
    showCrit: true, showTau: false, showGrid: true, showMarkers: true, srcMap: false,
    map: ['light', 'kappa', 'mu', 'tau', 'resid'],
    palette: ['composite', 'gray', 'heat'],
    order: ['bright', 'arrival'],
    lcType: ['drw', 'sine', 'transient'],
    monOn: false, microOn: false, lcAlign: false,
    lcUnit: ['mag', 'flux'],
  };

  /* Round numbers for each instrument: PSF width, pixel scale (arcsec) and background noise. */
  App.INSTRUMENTS = {
    ideal: { label: 'None: the ideal image' },
    jwst: { label: 'JWST NIRCam, 2 µm', fwhm: 0.066, pix: 0.031, noise: 0.01 },
    hst: { label: 'HST WFC3/UVIS', fwhm: 0.08, pix: 0.04, noise: 0.02 },
    euclid: { label: 'Euclid VIS', fwhm: 0.17, pix: 0.1, noise: 0.03 },
    rubin: { label: 'Rubin Observatory', fwhm: 0.75, pix: 0.2, noise: 0.03 },
    ground: { label: '1 m telescope, 1.1″ seeing', fwhm: 1.1, pix: 0.2, noise: 0.05 },
    custom: { label: 'Custom' },
  };

  App.LENS_KEYS = ['thetaE', 'gamma', 'e1', 'e2', 'cx', 'cy', 'gext', 'phiExt', 'lambda', 'a3', 'phi3', 'a4', 'phi4'];
  App.SPIRAL_KEYS = ['spArms', 'spPitch', 'spContrast', 'spBulge', 'spClumps', 'spSeed'];
  App.SOURCE_KEYS = ['sx', 'sy', 'qsoFlux', 'reff', 'sersicN', 'qs', 'pa', 'ie'].concat(App.SPIRAL_KEYS);
  App.COSMO_KEYS = ['H0', 'Om', 'zl', 'zs'];
  // what a preset resets before applying its own values
  const MODEL_KEYS = App.LENS_KEYS.concat(App.SOURCE_KEYS, App.COSMO_KEYS, ['halfImg', 'halfSrc', 'qsoOn', 'hostOn', 'hostKind']);

  App.defaults = function () {
    const s = {};
    for (const k in App.PARAMS) s[k] = App.PARAMS[k].d;
    for (const k in App.OPTIONS) s[k] = Array.isArray(App.OPTIONS[k]) ? App.OPTIONS[k][0] : App.OPTIONS[k];
    s.perts = [];
    return s;
  };

  App.S = App.defaults();

  App.lensOf = function (s) {
    const L = {};
    for (const k of App.LENS_KEYS) L[k] = s[k];
    L.perts = s.perts;
    return L;
  };

  /* ---------------------------------------------------------------- presets */

  const shape = (q, phiDeg) => {
    const e = P.eFromQPhi(q, phiDeg * P.DEG);
    return { e1: +e.e1.toFixed(4), e2: +e.e2.toFixed(4) };
  };
  const round = { gext: 0, phiExt: 0 };

  App.PRESETS = [
    { group: 'Image configurations' },
    {
      id: 'cross', name: 'Cross', images: 4,
      note: 'The source sits near the middle of the caustic. Four images form a cross: two minima of the arrival time and two saddle points.',
      set: { thetaE: 1.4, ...shape(0.72, 25), gext: 0.04, phiExt: -20, sx: 0.04, sy: 0.02 },
    },
    {
      id: 'fold', name: 'Fold', images: 4,
      note: 'The source is just inside a fold of the caustic. Two images sit close together across the critical curve, almost equally bright and with opposite parity.',
      set: { thetaE: 1.3, ...shape(0.7, 0), gext: 0.03, phiExt: 40, sx: 0.095, sy: 0.08 },
    },
    {
      id: 'cusp', name: 'Cusp', images: 4,
      note: 'The source is just inside a cusp. Three images crowd together, and the middle one is roughly as bright as the outer two combined.',
      set: { thetaE: 1.3, ...shape(0.6, 0), ...round, sx: 0.43, sy: 0.01 },
    },
    {
      id: 'double', name: 'Double', images: 2,
      note: 'Outside the inner caustic there are two images, on opposite sides of the lens. The one closer to the lens is fainter and arrives later.',
      set: { thetaE: 1.2, ...shape(0.8, -30), ...round, sx: 0.42, sy: 0.25 },
    },
    {
      id: 'ring', name: 'Einstein ring', images: 4,
      note: 'A source directly behind a nearly round lens. The host galaxy is drawn out into a ring; the quasar is switched off so the ring is easy to see.',
      set: { thetaE: 1.3, ...shape(0.96, 0), ...round, sx: 0, sy: 0, reff: 0.1, ie: 1, qsoOn: false },
    },
    {
      id: 'core', name: 'Shallow profile, fifth image', images: 5,
      note: 'A profile much shallower than isothermal has a radial critical curve (dashed). A faint fifth image appears near the centre: a maximum of the arrival time.',
      set: { thetaE: 1.3, gamma: 1.3, ...shape(0.8, 10), ...round, sx: 0.05, sy: 0.03 },
    },
    {
      id: 'spiral', name: 'Quasar in a spiral galaxy', images: 4,
      note: 'A bright quasar in the nucleus of a spiral galaxy, behind the lens of the cross. The disc is drawn out into a ring; arms, dust lanes and star-forming clumps can be followed from one image to the next. Near the two saddle-point images the arms wind the other way.',
      set: { thetaE: 1.4, ...shape(0.72, 25), gext: 0.04, phiExt: -20, sx: 0.04, sy: 0.02, hostKind: 'spiral', reff: 0.32, qs: 0.8, pa: 20, qsoFlux: 2 },
    },
    { group: 'Degeneracies: what the images cannot tell' },
    {
      id: 'sheet', name: 'Mass sheet', images: 4, pin: true,
      note: 'The model is pinned. Move the mass sheet λ under Environment: nothing in the image plane changes, while the delays and the H₀ inferred from them scale with λ.',
      set: { thetaE: 1.4, ...shape(0.72, 25), gext: 0.04, phiExt: -20, sx: 0.04, sy: 0.02 },
    },
    {
      id: 'slope', name: 'Slope and H₀', images: 4, pin: true,
      note: 'The model is pinned. Set the slope γ to 2.2 and press Refit: the quasar images return to exactly where they were, but the delays, and so H₀, come out about 15% too large. Only the arcs differ; the residual map under Display shows where.',
      set: { thetaE: 1.4, ...shape(0.72, 25), gext: 0.04, phiExt: -20, sx: 0.04, sy: 0.02, reff: 0.2 },
    },
    {
      id: 'binary', name: 'Two deflectors', images: 5, pin: true,
      note: 'Two galaxies of comparable mass, pinned; a faint fifth image lies between them. Switch G1 off and press Refit: one elliptical lens with shear puts the four bright images in exactly the same places, with delays about ten times shorter.',
      set: { thetaE: 0.9, ...shape(0.9, 0), ...round, cx: -0.4, sx: 0.08, sy: 0.05, perts: [{ x: 0.75, y: 0.1, thetaE: 0.55, on: true }] },
    },
    {
      id: 'satellite', name: 'Satellite next to an image', images: 4, pin: true,
      note: 'A small satellite beside one image, pinned. Switch G1 off and press Refit: the smooth lens reproduces all four positions, but predicts that image about 60% brighter than it is. Flux-ratio anomalies like this are how dark substructure is looked for.',
      set: { thetaE: 1.4, ...shape(0.72, 25), gext: 0.04, phiExt: -20, sx: 0.04, sy: 0.02, perts: [{ x: 1.22, y: 0.9, thetaE: 0.03, on: true }] },
    },
    { group: 'Modelled on real systems (illustrative)' },
    {
      id: 'rxj1131', name: 'RXJ1131−1231: cusp and satellite', images: 4,
      note: 'The redshifts of RXJ1131−1231 (0.295 and 0.654) with an illustrative mass model: a cusp triplet, a satellite galaxy, and a fourth image that arrives about three months later. The measured delay of that image is about 91 days. As in the real system, the host is a spiral galaxy whose star-forming clumps trace the ring.',
      set: { thetaE: 1.64, gamma: 1.95, ...shape(0.76, 110), gext: 0.07, phiExt: 20, sx: 0.12, sy: -0.34, reff: 0.3, hostKind: 'spiral', spArms: 3, spSeed: 4, zl: 0.295, zs: 0.654, perts: [{ x: -0.1, y: 0.62, thetaE: 0.2, on: true }] },
    },
    {
      id: 'he0435', name: 'HE0435−1223: cross', images: 4,
      note: 'The redshifts of HE0435−1223 (0.455 and 1.693) with an illustrative mass model. A symmetric cross has short delays, here about two weeks at most, which makes them hard to measure to a few per cent.',
      set: { thetaE: 1.18, gamma: 1.93, ...shape(0.8, -15), gext: 0.06, phiExt: 25, sx: 0.03, sy: 0.045, zl: 0.4546, zs: 1.693 },
    },
    {
      id: 'pg1115', name: 'PG1115+080: fold', images: 4,
      note: 'The redshifts of PG1115+080 (0.311 and 1.722) with an illustrative mass model: a bright close pair across the critical curve and strong shear from a nearby group. The delays are one to three weeks.',
      set: { thetaE: 1.1, gamma: 2.17, ...shape(0.9, 60), gext: 0.11, phiExt: 65, sx: 0.06, sy: 0.085, zl: 0.311, zs: 1.722 },
    },
    {
      id: 'sdss1206', name: 'SDSS J1206+4332: double', images: 2,
      note: 'The redshifts of SDSS J1206+4332 (0.745 and 1.789) with an illustrative mass model. The quasar lies just outside the caustic and has two images, a little under four months apart, while its host galaxy reaches across the caustic and forms a ring.',
      set: { thetaE: 1.25, gamma: 1.95, ...shape(0.72, -10), gext: 0.04, phiExt: 30, sx: 0.3, sy: -0.1, reff: 0.25, zl: 0.745, zs: 1.789 },
    },
  ];

  /* Reset the model (lens, source, cosmology) to its defaults and apply a preset. Display,
     telescope and time-domain settings are left alone. Returns the preset. */
  App.applyPreset = function (id, s) {
    const preset = App.PRESETS.find(p => p.id === id);
    if (!preset) return null;
    s = s || App.S;
    const d = App.defaults();
    for (const k of MODEL_KEYS) s[k] = d[k];
    s.perts = [];
    for (const k in preset.set) s[k] = k === 'perts' ? preset.set.perts.map(p => Object.assign({}, p)) : preset.set[k];
    return preset;
  };

  /* The preset a state was started from, if its model is still exactly that preset. */
  App.matchPreset = function (s) {
    for (const preset of App.PRESETS) {
      if (!preset.id) continue;
      const t = App.defaults();
      App.applyPreset(preset.id, t);
      if (MODEL_KEYS.every(k => t[k] === s[k]) && JSON.stringify(t.perts) === JSON.stringify(s.perts)) return preset.id;
    }
    return '';
  };

  /* ---------------------------------------------------------------- URL */

  const fmt = (v) => String(+(+v).toFixed(5));

  App.encode = function (s) {
    const d = App.defaults(), out = [];
    for (const k in d) {
      if (k === 'perts' || s[k] === d[k]) continue;
      const v = s[k];
      out.push(k + '=' + (typeof v === 'number' ? fmt(v) : typeof v === 'boolean' ? (v ? 1 : 0) : v));
    }
    if (s.perts.length) {
      out.push('perts=' + s.perts.map(p => [fmt(p.x), fmt(p.y), fmt(p.thetaE), p.on === false ? 0 : 1].join('_')).join('~'));
    }
    return out.join('&');
  };

  /* Read a configuration from a hash string onto the defaults. Unknown keys and values outside
     their range are ignored or clamped. */
  App.decode = function (hash) {
    const s = App.defaults();
    for (const part of String(hash || '').replace(/^#/, '').split('&')) {
      const eq = part.indexOf('=');
      if (eq < 1) continue;
      const k = part.slice(0, eq), raw = decodeURIComponent(part.slice(eq + 1));
      if (k === 'perts') {
        s.perts = raw.split('~').slice(0, 12).map(t => t.split('_').map(Number))
          .filter(a => a.length >= 3 && a.slice(0, 3).every(isFinite))
          .map(a => ({ x: clamp(a[0], -6, 6), y: clamp(a[1], -6, 6), thetaE: clamp(a[2], 0, 1), on: a[3] !== 0 }));
      } else if (k in App.PARAMS) {
        const v = Number(raw), p = App.PARAMS[k];
        if (isFinite(v)) s[k] = clamp(v, p.min, p.max);
      } else if (k in App.OPTIONS) {
        const o = App.OPTIONS[k];
        if (Array.isArray(o)) { if (o.includes(raw)) s[k] = raw; } else s[k] = raw === '1' || raw === 'true';
      }
    }
    if (s.hostKind === 'image') s.hostKind = 'sersic';     // a dropped picture is not part of a link
    return s;
  };

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  App.clamp = clamp;

  /* Number with the parameter's decimals; a real minus sign for display. */
  App.format = function (key, v) {
    const p = App.PARAMS[key];
    return v.toFixed(p ? p.dp : 2).replace('-', '−');
  };

  root.LensApp = App;
  if (typeof module === 'object' && module.exports) module.exports = App;
})(typeof self !== 'undefined' ? self : globalThis);
