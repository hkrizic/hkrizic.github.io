/* Rendering: the quantities derived from the current state (memoised), the two rasters and the
   vector overlays drawn on top of them. */
(function () {
  'use strict';
  const App = window.LensApp, P = window.LensPhysics;
  const $ = (id) => document.getElementById(id);

  const E = App.eng = { quick: false, lensVersion: 0, images: [] };
  const QUICK_N = 200;             // grid while a lens control is being dragged
  const QSO_UNIT = 0.05;           // unlensed quasar flux at "flux = 1", in surface-brightness units x arcsec^2
  const IDEAL_FWHM = 0.05;         // point sources in the ideal image still need some width
  const SOFT = 0.06, WHITE = 4;    // asinh stretch: softening and white point (surface-brightness units)
  const HOST_RGB = [0.72, 0.84, 1.0], LENS_RGB = [1.0, 0.8, 0.56], QSO_RGB = [0.9, 0.95, 1.0];
  const CURVE = '#f0b93a';         // critical curves and caustics
  const LABELS = 'ABCDEFGH';
  // image identities on the black plates (the dark-surface steps of the palette in style.css)
  App.PLATE_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'];
  App.plateColor = (i) => App.PLATE_COLORS[i] || '#9a9a94';

  /* ---------------------------------------------------------------- derived quantities */

  App.compute = function () {
    const S = App.S;
    const N = E.quick ? Math.min(S.res, QUICK_N) : S.res;
    const L = App.lensOf(S);
    const lensKey = JSON.stringify(L) + '|' + S.halfImg + '|' + N;
    if (lensKey !== E.lensKey) {
      E.lensKey = lensKey;
      E.M = P.compile(L);
      E.G = P.buildGrid(E.M, S.halfImg, N);
      E.curves = P.criticalCurves(E.M, E.G);
      addCut(E.M, E.curves);
      E.lensVersion++;
    }
    const cosmoKey = [S.H0, S.Om, S.zl, S.zs].join();
    if (cosmoKey !== E.cosmoKey) { E.cosmoKey = cosmoKey; E.cosmo = P.cosmology(S.H0, S.Om, S.zl, S.zs); }

    const imKey = E.lensVersion + '|' + S.sx + '|' + S.sy + '|' + S.order;
    if (imKey !== E.imKey) {
      E.imKey = imKey;
      const list = P.findImages(E.M, E.G, S.sx, S.sy);
      list.sort(S.order === 'arrival' ? (a, b) => a.tau - b.tau : (a, b) => b.absMu - a.absMu);
      list.forEach((im, i) => { im.i = i; im.label = LABELS[i] || String(i + 1); });
      E.images = list;
    }
    let first = -1;
    E.images.forEach((im, i) => { if (first < 0 || im.tau < E.images[first].tau) first = i; });
    E.first = first;
    for (const im of E.images) {
      im.dtau = im.tau - E.images[first].tau;
      im.dt = im.dtau * E.cosmo.tdScale;
    }
    return E;
  };

  /* A singular isothermal centre has no radial caustic, but the source-plane curve it maps to (the
     cut) plays the same role: a source crossing it gains or loses an image at that centre. Drawn
     for the main lens when its slope is exactly isothermal, and for every perturber. */
  function addCut(M, curves) {
    const centres = M.perts.map((p) => [p.x, p.y]);
    if (Math.abs(M.t - 1) < 1e-6 && M.b > 0) centres.push([M.cx, M.cy]);
    const n = 361, o = new Float64Array(6), eps = 2e-5;
    for (const [x0, y0] of centres) {
      const c = new Float32Array(2 * n);
      for (let k = 0; k < n; k++) {
        const a = 2 * Math.PI * k / (n - 1);
        const x = x0 + eps * Math.cos(a), y = y0 + eps * Math.sin(a);
        P.evalAll(M, x, y, o);
        c[2 * k] = x - o[0]; c[2 * k + 1] = y - o[1];
      }
      curves.radCaustic.push(c);
    }
  }

  /* ---------------------------------------------------------------- plates */

  const plates = App.plates = {
    img: { raster: $('imgRaster'), overlay: $('imgOverlay'), half: () => App.S.halfImg, size: 360, dpr: 1 },
    src: { raster: $('srcRaster'), overlay: $('srcOverlay'), half: () => App.S.halfSrc, size: 360, dpr: 1 },
  };

  App.resizePlates = function (size) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    for (const pl of [plates.img, plates.src]) {
      pl.size = size; pl.dpr = dpr;
      const px = Math.round(size * dpr);
      if (pl.overlay.width !== px) { pl.overlay.width = px; pl.overlay.height = px; }
    }
  };
  const toPx = App.toPx = (pl, x, y) => {
    const h = pl.half(), s = pl.size / (2 * h);
    return [(x + h) * s, (h - y) * s];
  };
  App.toSky = (pl, px, py) => {
    const h = pl.half(), s = (2 * h) / pl.size;
    return { x: px * s - h, y: h - py * s };
  };

  /* ---------------------------------------------------------------- the source */

  App.tex = { pattern: null, image: null, version: 0 };

  /* Pixel values as fractions, premultiplied by alpha. They are used as surface brightness as they
     are, so a picture keeps its colours through the stretch. */
  function readTexture(canvas) {
    const w = canvas.width, h = canvas.height;
    const d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    const out = new Float32Array(w * h * 4);
    for (let i = 0; i < w * h * 4; i += 4) {
      const a = d[i + 3] / 255;
      out[i] = d[i] / 255 * a;
      out[i + 1] = d[i + 1] / 255 * a;
      out[i + 2] = d[i + 2] / 255 * a;
      out[i + 3] = a;
    }
    return { w, h, data: out };
  }

  /* A source whose handedness is obvious: four coloured quadrants and a letter. Images with
     negative parity show it mirrored. */
  function patternTexture() {
    const n = 256, c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d'), r = n * 0.47, m = n / 2;
    const quad = ['#3987e5', '#d95926', '#c98500', '#199e70'];
    for (let k = 0; k < 4; k++) {
      g.beginPath(); g.moveTo(m, m); g.arc(m, m, r, -Math.PI / 2 * (k + 1), -Math.PI / 2 * k); g.closePath();
      g.fillStyle = quad[k]; g.fill();
    }
    g.fillStyle = '#fff';
    g.font = "800 " + Math.round(n * 0.5) + "px 'Mona Sans', system-ui, sans-serif";
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('R', m, m + n * 0.03);
    return readTexture(c);
  }

  App.setImageTexture = function (bitmap) {
    const n = 320, c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    const s = Math.max(n / bitmap.width, n / bitmap.height);
    g.drawImage(bitmap, (n - bitmap.width * s) / 2, (n - bitmap.height * s) / 2, bitmap.width * s, bitmap.height * s);
    App.tex.image = readTexture(c);
    App.tex.version++;
  };

  /* The spiral host for a given set of its parameters. Generated once and kept, at lower
     resolution while one of its sliders is being dragged. */
  const spirals = new Map();
  function spiralTexture(s) {
    const size = E.draft ? 480 : 960;
    const key = App.SPIRAL_KEYS.map((k) => s[k]).join('|') + '|' + size;
    let tex = spirals.get(key);
    if (!tex) {
      tex = P.spiralGalaxy({ arms: s.spArms, pitch: s.spPitch, contrast: s.spContrast, bulge: s.spBulge, clumps: s.spClumps, seed: s.spSeed, size });
      spirals.set(key, tex);
      if (spirals.size > 4) spirals.delete(spirals.keys().next().value);
    }
    return tex;
  }

  /* Returns paint(dx, dy, out, k): adds the host's RGB surface brightness at an offset from the
     source centre into out[k..k+2]. `soft` rounds the core over about a pixel. */
  function hostPainter(s, soft) {
    if (!s.hostOn || !(s.ie > 0)) return null;
    const pa = s.pa * P.DEG, c = Math.cos(pa), sn = Math.sin(pa);
    if (s.hostKind !== 'sersic') {
      let tex, W, gain, squash = 1;
      if (s.hostKind === 'spiral') {
        // a disc seen at an angle: the axis ratio is the inclination
        tex = spiralTexture(s); W = tex.extent * s.reff; gain = s.ie; squash = s.qs;
      } else {
        if (!App.tex.pattern) App.tex.pattern = patternTexture();
        tex = (s.hostKind === 'image' && App.tex.image) || App.tex.pattern;
        W = 3 * s.reff; gain = 3 * s.ie;
      }
      const tw = tex.w, th = tex.h, d = tex.data;
      return (dx, dy, out, k) => {
        const u = ((c * dx + sn * dy) / (2 * W) + 0.5) * (tw - 1);
        const v = (0.5 - (-sn * dx + c * dy) / squash / (2 * W)) * (th - 1);
        if (u < 0 || v < 0 || u >= tw - 1 || v >= th - 1) return;
        const i0 = Math.floor(u), j0 = Math.floor(v), fu = u - i0, fv = v - j0;
        const a = (j0 * tw + i0) * 4, b = a + 4, e = a + tw * 4, f = e + 4;
        const w00 = (1 - fu) * (1 - fv), w10 = fu * (1 - fv), w01 = (1 - fu) * fv, w11 = fu * fv;
        out[k] += gain * (w00 * d[a] + w10 * d[b] + w01 * d[e] + w11 * d[f]);
        out[k + 1] += gain * (w00 * d[a + 1] + w10 * d[b + 1] + w01 * d[e + 1] + w11 * d[f + 1]);
        out[k + 2] += gain * (w00 * d[a + 2] + w10 * d[b + 2] + w01 * d[e + 2] + w11 * d[f + 2]);
      };
    }
    const bn = P.sersicB(s.sersicN), inv = 1 / s.sersicN, qs = s.qs, reff = s.reff, ie = s.ie, soft2 = soft * soft;
    return (dx, dy, out, k) => {
      const u = c * dx + sn * dy, v = (-sn * dx + c * dy) / qs;
      const r = Math.sqrt(u * u + v * v + soft2);
      const I = ie * Math.exp(-bn * (Math.pow(r / reff, inv) - 1));
      out[k] += HOST_RGB[0] * I; out[k + 1] += HOST_RGB[1] * I; out[k + 2] += HOST_RGB[2] * I;
    };
  }

  const hostKey = (s) => [s.sx, s.sy, s.reff, s.sersicN, s.qs, s.pa, s.ie, s.hostOn, s.hostKind, App.tex.version,
    s.hostKind === 'spiral' ? App.SPIRAL_KEYS.map((k) => s[k]).join(',') + (E.draft ? 'd' : '') : ''].join('|');

  /* Lensed host (and optionally the lens galaxy's own light) on the grid: RGB, before any PSF. */
  function extendedLayer() {
    const S = App.S, G = E.G, N = G.N;
    const key = [E.lensVersion, N, hostKey(S), S.lensLight, S.lensFlux].join('|');
    if (E.layerKey === key) return E.layer;
    const out = new Float32Array(3 * N * N);
    const paint = hostPainter(S, 0.3 * G.h);
    if (paint) {
      const bx = G.bx, by = G.by, sx = S.sx, sy = S.sy;
      for (let k = 0, n = N * N; k < n; k++) paint(bx[k] - sx, by[k] - sy, out, 3 * k);
    }
    if (S.lensLight && S.lensFlux > 0) {
      // de Vaucouleurs-like light that follows the mass: same centre, axis ratio and orientation
      const M = E.M, n = 3, bn = P.sersicB(n), re = 0.6 * M.thetaE, amp = 0.25 * S.lensFlux, soft2 = 0.25 * G.h * G.h;
      for (let j = 0, k = 0; j < N; j++) {
        const y = P.gridY(G, j) - M.cy;
        for (let i = 0; i < N; i++, k++) {
          const x = P.gridX(G, i) - M.cx;
          const X = M.cos * x + M.sin * y, Y = -M.sin * x + M.cos * y;
          const r = Math.sqrt(M.q * X * X + Y * Y / M.q + soft2);
          const I = amp * Math.exp(-bn * (Math.pow(r / re, 1 / n) - 1));
          out[3 * k] += LENS_RGB[0] * I; out[3 * k + 1] += LENS_RGB[1] * I; out[3 * k + 2] += LENS_RGB[2] * I;
        }
      }
    }
    E.layerKey = key; E.layer = out;
    return out;
  }

  /* Host surface brightness (one number per pixel) for any model: used for the residual map. */
  function hostLuminance(M, G, s) {
    const N = G.N, lum = new Float32Array(N * N), tmp = new Float32Array(3);
    const paint = hostPainter(s, 0.3 * G.h);
    if (!paint) return lum;
    for (let k = 0, n = N * N; k < n; k++) {
      tmp[0] = tmp[1] = tmp[2] = 0;
      paint(G.bx[k] - s.sx, G.by[k] - s.sy, tmp, 0);
      lum[k] = (tmp[0] + tmp[1] + tmp[2]) / 3;
    }
    return lum;
  }

  /* ---------------------------------------------------------------- image processing */

  function boxSizes(sigma) {
    const n = 3, ideal = Math.sqrt(12 * sigma * sigma / n + 1);
    let wl = Math.floor(ideal);
    if (wl % 2 === 0) wl--;
    const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
    return [0, 1, 2].map(i => ((i < m ? wl : wl + 2) - 1) / 2);
  }
  function boxPass(src, dst, N, r, stride, lineStride) {
    const inv = 1 / (2 * r + 1);
    for (let line = 0; line < N; line++) {
      for (let c = 0; c < 3; c++) {
        const base = line * lineStride + c;
        let acc = 0;
        for (let k = -r; k <= r; k++) acc += src[base + stride * Math.min(N - 1, Math.max(0, k))];
        for (let i = 0; i < N; i++) {
          dst[base + stride * i] = acc * inv;
          acc += src[base + stride * Math.min(N - 1, i + r + 1)] - src[base + stride * Math.max(0, i - r)];
        }
      }
    }
  }
  /* Gaussian blur of an interleaved RGB image by three box blurs in each direction. */
  function blurRGB(src, N, sigmaPx) {
    let a = Float32Array.from(src), b = new Float32Array(src.length);
    if (sigmaPx < 0.4) return a;
    for (const r of boxSizes(sigmaPx)) {
      if (r < 1) continue;
      boxPass(a, b, N, r, 3, 3 * N);
      boxPass(b, a, N, r, 3 * N, 3);
    }
    return a;
  }

  function stampPointSources(buf, N, G, sigma) {
    const S = App.S;
    if (!S.qsoOn || !(S.qsoFlux > 0)) return;
    const sp = Math.max(sigma / G.h, 0.8), sig = sp * G.h;
    const R = Math.ceil(4 * sp) + 1, k2 = 1 / (2 * sp * sp);
    for (const im of E.images) {
      const amp = QSO_UNIT * S.qsoFlux * im.absMu * App.fluxFactor(im) / (2 * Math.PI * sig * sig);
      const cx = (im.x + G.half) / G.h - 0.5, cy = (G.half - im.y) / G.h - 0.5;
      const i0 = Math.max(0, Math.floor(cx - R)), i1 = Math.min(N - 1, Math.ceil(cx + R));
      const j0 = Math.max(0, Math.floor(cy - R)), j1 = Math.min(N - 1, Math.ceil(cy + R));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const v = amp * Math.exp(-((i - cx) * (i - cx) + (j - cy) * (j - cy)) * k2), k = 3 * (j * N + i);
        buf[k] += QSO_RGB[0] * v; buf[k + 1] += QSO_RGB[1] * v; buf[k + 2] += QSO_RGB[2] * v;
      }
    }
  }

  function rebin(buf, N, M) {
    const out = new Float32Array(3 * M * M), cnt = new Uint16Array(M);
    for (let i = 0; i < N; i++) cnt[Math.min(M - 1, Math.floor((i + 0.5) * M / N))]++;
    for (let j = 0; j < N; j++) {
      const J = Math.min(M - 1, Math.floor((j + 0.5) * M / N));
      for (let i = 0; i < N; i++) {
        const I = Math.min(M - 1, Math.floor((i + 0.5) * M / N));
        const a = 3 * (j * N + i), b = 3 * (J * M + I), w = 1 / (cnt[I] * cnt[J]);
        out[b] += buf[a] * w; out[b + 1] += buf[a + 1] * w; out[b + 2] += buf[a + 2] * w;
      }
    }
    return out;
  }

  function addNoise(buf, n, sigma, seed) {
    const rand = window.LensTime.mulberry32(seed), gauss = window.LensTime.gaussian;
    for (let k = 0; k < 3 * n * n; k += 3) {
      const lum = Math.max(0, (buf[k] + buf[k + 1] + buf[k + 2]) / 3);
      const v = Math.sqrt(sigma * sigma + 0.5 * sigma * lum) * gauss(rand);   // sky plus a shot-noise term
      buf[k] += v; buf[k + 1] += v; buf[k + 2] += v;
    }
  }

  function ramp(stops) {
    const lut = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const f = i / 255 * (stops.length - 1), a = Math.min(stops.length - 2, Math.floor(f)), w = f - a;
      for (let c = 0; c < 3; c++) lut[3 * i + c] = stops[a][c] * (1 - w) + stops[a + 1][c] * w;
    }
    return lut;
  }
  const HEAT = ramp([[0, 0, 4], [28, 16, 68], [79, 18, 123], [129, 37, 129], [181, 54, 122], [229, 80, 100], [251, 135, 97], [254, 194, 135], [252, 253, 191]]);
  const BLUES = ramp([[4, 4, 5], [10, 30, 62], [16, 66, 129], [37, 106, 191], [85, 152, 231], [183, 211, 246], [244, 249, 255]]);
  const DEEP = ramp([[4, 4, 5], [8, 22, 46], [12, 44, 88], [18, 66, 129], [30, 92, 170], [46, 118, 206]]);
  const POLE_POS = ramp([[38, 38, 40], [120, 44, 44], [208, 59, 59], [240, 140, 130], [255, 226, 220]]);
  const POLE_NEG = ramp([[38, 38, 40], [22, 60, 110], [37, 106, 191], [120, 170, 236], [222, 236, 255]]);

  const images = new WeakMap();
  function imageData(canvas, n) {
    if (canvas.width !== n || canvas.height !== n) { canvas.width = n; canvas.height = n; }
    let img = images.get(canvas);
    if (!img || img.width !== n) { img = canvas.getContext('2d').createImageData(n, n); images.set(canvas, img); }
    return img;
  }

  /* Float RGB surface brightness to the screen: an asinh stretch of the luminance that keeps the
     colour (Lupton et al. 2004). The scale is absolute, so brightness sliders do what they say and
     the source and its images are shown at the same surface brightness. */
  function paintRGB(buf, n, canvas, pedestal) {
    const S = App.S, img = imageData(canvas, n), d = img.data;
    const ex = Math.pow(10, S.stretch), norm = 1 / Math.asinh(WHITE / SOFT), mode = S.palette;
    for (let p = 0, k = 0, o = 0; p < n * n; p++, k += 3, o += 4) {
      let r = buf[k] * ex + pedestal, g = buf[k + 1] * ex + pedestal, b = buf[k + 2] * ex + pedestal;
      const lum = (r + g + b) / 3;
      const f = lum > 0 ? Math.asinh(lum / SOFT) * norm : 0;
      if (mode === 'composite') {
        const sc = lum > 1e-9 ? f / lum : 0;
        r = Math.max(0, r * sc); g = Math.max(0, g * sc); b = Math.max(0, b * sc);
        const m = Math.max(r, g, b);
        if (m > 1) { r /= m; g /= m; b /= m; }
        d[o] = 255 * r; d[o + 1] = 255 * g; d[o + 2] = 255 * b;
      } else if (mode === 'heat') {
        const i = 3 * Math.min(255, Math.round(255 * f));
        d[o] = HEAT[i]; d[o + 1] = HEAT[i + 1]; d[o + 2] = HEAT[i + 2];
      } else {
        d[o] = d[o + 1] = d[o + 2] = 255 * Math.min(1, f);
      }
      d[o + 3] = 255;
    }
    canvas.getContext('2d').putImageData(img, 0, 0);
  }

  function paintScalar(n, canvas, colour) {
    const img = imageData(canvas, n), d = img.data;
    for (let p = 0, o = 0; p < n * n; p++, o += 4) { colour(p, d, o); d[o + 3] = 255; }
    canvas.getContext('2d').putImageData(img, 0, 0);
  }

  /* ---------------------------------------------------------------- image-plane raster */

  function drawImageRaster() {
    const S = App.S, G = E.G, N = G.N, canvas = plates.img.raster;
    E.mapLegend = null; E.frame = null;
    if (S.map !== 'light' && !(S.map === 'resid' && !App.ref)) return drawImageMap();

    const layer = extendedLayer();
    const tele = S.inst !== 'ideal';
    const sigma = (tele ? S.fwhm : IDEAL_FWHM) / 2.3548;
    let buf;
    if (tele) {
      const key = E.layerKey + '|' + S.fwhm;
      if (E.blurKey !== key) { E.blurKey = key; E.blurred = blurRGB(layer, N, sigma / G.h); }
      buf = Float32Array.from(E.blurred);
    } else buf = Float32Array.from(layer);
    stampPointSources(buf, N, G, sigma);

    let n = N;
    if (tele && S.pix > 1.05 * G.h) { n = Math.max(8, Math.round(2 * G.half / S.pix)); buf = rebin(buf, N, n); }
    let pedestal = 0;
    if (tele && S.noise > 0) { addNoise(buf, n, S.noise, 1 + App.noiseEpoch()); pedestal = 1.5 * S.noise * Math.pow(10, S.stretch); }
    canvas.classList.toggle('pixelated', tele && n < N);
    canvas.style.imageRendering = tele && n < N ? 'pixelated' : 'auto';
    paintRGB(buf, n, canvas, pedestal);
    E.frame = { buf, n, half: G.half, instrument: tele ? S.inst : 'ideal' };
  }

  function drawImageMap() {
    const S = App.S, G = E.G, N = G.N, canvas = plates.img.raster;
    canvas.style.imageRendering = 'auto';
    if (S.map === 'kappa') {
      paintScalar(N, canvas, (p, d, o) => {
        const t = Math.min(1, Math.max(0, (Math.log10(Math.max(G.kappa[p], 1e-6)) + 1) / 2));
        const i = 3 * Math.round(255 * t);
        d[o] = BLUES[i]; d[o + 1] = BLUES[i + 1]; d[o + 2] = BLUES[i + 2];
      });
      E.mapLegend = { title: 'Convergence κ', lut: [BLUES], ticks: ['0.1', '1', '10'] };
    } else if (S.map === 'mu') {
      paintScalar(N, canvas, (p, d, o) => {
        const det = G.lt[p] * G.lr[p];
        const t = Math.min(1, Math.max(0, -Math.log10(Math.abs(det) + 1e-9) / 2));
        const lut = det >= 0 ? POLE_POS : POLE_NEG, i = 3 * Math.round(255 * t);
        d[o] = lut[i]; d[o + 1] = lut[i + 1]; d[o + 2] = lut[i + 2];
      });
      E.mapLegend = { title: 'Magnification |μ|', lut: [POLE_NEG, POLE_POS], ticks: ['100', '≤ 1', '100'], ends: ['mirrored', 'upright'] };
    } else if (S.map === 'tau') {
      const tau0 = E.images.length ? E.images[E.first].tau : 0;
      const spanImg = E.images.reduce((m, im) => Math.max(m, im.dtau), 0);
      const span = Math.max(3 * spanImg, 0.25 * E.M.thetaE * E.M.thetaE);
      const sx = S.sx, sy = S.sy;
      paintScalar(N, canvas, (p, d, o) => {
        const x = P.gridX(G, p % N), y = P.gridY(G, (p / N) | 0);
        const tau = 0.5 * ((x - sx) * (x - sx) + (y - sy) * (y - sy)) - G.psi[p];
        const t = Math.min(1, Math.sqrt(Math.max(0, tau - tau0) / span));
        const i = 3 * Math.round(255 * t);
        d[o] = DEEP[i]; d[o + 1] = DEEP[i + 1]; d[o + 2] = DEEP[i + 2];
      });
      const top = span * E.cosmo.tdScale;
      E.mapLegend = { title: 'Arrival time after the first image', lut: [DEEP], ticks: ['0', '', (top >= 10 ? top.toFixed(0) : top.toFixed(1)) + ' d'] };
    } else {
      const ref = App.ref;
      const key = [ref.id, N, G.half].join('|');
      if (E.refLumKey !== key) {
        E.refLumKey = key;
        const Mr = P.compile(App.lensOf(ref.state));
        E.refLum = hostLuminance(Mr, P.buildGrid(Mr, G.half, N), ref.state);
      }
      const now = hostLuminance(E.M, G, S), was = E.refLum;
      const scale = Math.max(1.2 * ref.state.ie, 0.05);
      paintScalar(N, canvas, (p, d, o) => {
        const v = (now[p] - was[p]) / scale, t = Math.min(1, Math.abs(v));
        const lut = v >= 0 ? POLE_POS : POLE_NEG, i = 3 * Math.round(255 * t);
        d[o] = lut[i]; d[o + 1] = lut[i + 1]; d[o + 2] = lut[i + 2];
      });
      E.mapLegend = { title: 'Host light, same source: this model − pinned', lut: [POLE_NEG, POLE_POS], ticks: ['fainter', '0', 'brighter'] };
    }
  }

  /* ---------------------------------------------------------------- source-plane raster */

  function drawSourceRaster() {
    const S = App.S, n = 300, half = S.halfSrc, h = 2 * half / n, canvas = plates.src.raster;
    if (S.srcMap) {
      const nm = 200, key = E.lensVersion + '|' + half;
      if (E.magKey !== key) { E.magKey = key; E.magMap = P.magnificationMap(E.G, half, nm, 4); }
      const map = E.magMap;
      canvas.style.imageRendering = 'auto';
      paintScalar(nm, canvas, (p, d, o) => {
        const t = Math.min(1, Math.max(0, Math.log10(Math.max(map[p], 1e-3)) / 2));
        const i = 3 * Math.round(255 * t);
        d[o] = BLUES[i]; d[o + 1] = BLUES[i + 1]; d[o + 2] = BLUES[i + 2];
      });
      E.srcLegend = { title: 'Total magnification of a source here', lut: [BLUES], ticks: ['1', '10', '100'] };
      return;
    }
    E.srcLegend = null;
    const key = [hostKey(S), half, S.qsoOn, S.qsoFlux, S.stretch, S.palette].join('|');
    if (E.srcKey === key) return;
    E.srcKey = key;
    const buf = new Float32Array(3 * n * n);
    const paint = hostPainter(S, 0.3 * h);
    if (paint) {
      for (let j = 0, k = 0; j < n; j++) {
        const y = half - (j + 0.5) * h - S.sy;
        for (let i = 0; i < n; i++, k += 3) paint(-half + (i + 0.5) * h - S.sx, y, buf, k);
      }
    }
    if (S.qsoOn && S.qsoFlux > 0) {
      const sp = Math.max(IDEAL_FWHM / 2.3548 / h, 0.9), sig = sp * h, amp = QSO_UNIT * S.qsoFlux / (2 * Math.PI * sig * sig);
      const cx = (S.sx + half) / h - 0.5, cy = (half - S.sy) / h - 0.5, R = Math.ceil(4 * sp) + 1;
      for (let j = Math.max(0, Math.floor(cy - R)); j <= Math.min(n - 1, Math.ceil(cy + R)); j++) {
        for (let i = Math.max(0, Math.floor(cx - R)); i <= Math.min(n - 1, Math.ceil(cx + R)); i++) {
          const v = amp * Math.exp(-((i - cx) ** 2 + (j - cy) ** 2) / (2 * sp * sp)), k = 3 * (j * n + i);
          buf[k] += QSO_RGB[0] * v; buf[k + 1] += QSO_RGB[1] * v; buf[k + 2] += QSO_RGB[2] * v;
        }
      }
    }
    paintRGB(buf, n, canvas, 0);
  }

  App.drawRasters = function () {
    drawImageRaster();
    // the source raster is memoised on its inputs, except when it shows the magnification map
    if (App.S.srcMap) E.srcKey = null;
    drawSourceRaster();
  };

  /* ---------------------------------------------------------------- overlays */

  const FONT = "500 11px 'Mona Sans', system-ui, sans-serif";

  function begin(pl) {
    const ctx = pl.overlay.getContext('2d');
    ctx.setTransform(pl.dpr, 0, 0, pl.dpr, 0, 0);
    ctx.clearRect(0, 0, pl.size, pl.size);
    ctx.lineJoin = 'round'; ctx.lineCap = 'butt'; ctx.setLineDash([]);
    return ctx;
  }

  function strokeCurves(ctx, pl, curves, colour, width, dash) {
    const h = pl.half(), s = pl.size / (2 * h);
    ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath();
    for (const c of curves) {
      for (let k = 0; k < c.length; k += 2) {
        const x = (c[k] + h) * s, y = (h - c[k + 1]) * s;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function label(ctx, text, x, y, align, colour) {
    ctx.font = FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(text, x, y);
    ctx.fillStyle = colour || '#fff'; ctx.fillText(text, x, y);
  }

  function niceStep(x) {
    const p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
  }

  function drawGrid(ctx, pl) {
    const h = pl.half(), s = pl.size / (2 * h);
    const step = [0.1, 0.25, 0.5, 1, 2].find(v => v * s >= 44) || 2;
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.075)';
    ctx.beginPath();
    for (let v = Math.ceil(-h / step) * step; v <= h + 1e-9; v += step) {
      const p = Math.round((v + h) * s) + 0.5;
      ctx.moveTo(p, 0); ctx.lineTo(p, pl.size); ctx.moveTo(0, p); ctx.lineTo(pl.size, p);
    }
    ctx.stroke();
    if (pl.size < 250) return;                       // no room for tick labels on a phone
    ctx.font = "400 10px 'Mona Sans', system-ui, sans-serif"; ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.textBaseline = 'alphabetic';
    for (let v = Math.ceil(-h / step) * step; v <= h + 1e-9; v += step) {
      if (Math.abs(v) < 1e-9 || Math.abs(Math.abs(v) - h) < 0.3 * step) continue;
      const t = (+v.toFixed(2)).toString().replace('-', '−') + '″';
      ctx.textAlign = 'center'; ctx.fillText(t, (v + h) * s, pl.size - 5);
      ctx.textAlign = 'left'; ctx.fillText(t, 5, (h - v) * s - 3);
    }
  }

  function scaleBar(ctx, pl, kpcPerArcsec) {
    const s = pl.size / (2 * pl.half());
    const len = [5, 2, 1, 0.5, 0.2, 0.1, 0.05].find(v => v * s <= 0.28 * pl.size) || 0.05;
    const x1 = pl.size - 12, x0 = x1 - len * s, y = 16;
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.moveTo(x0, y - 3); ctx.lineTo(x0, y + 3); ctx.moveTo(x1, y - 3); ctx.lineTo(x1, y + 3); ctx.stroke();
    let text = len + '″';
    if (isFinite(kpcPerArcsec) && pl.size >= 250) {
      const kpc = len * kpcPerArcsec;
      text += '  ' + (kpc >= 10 ? kpc.toFixed(0) : kpc.toFixed(1)) + ' kpc';
    }
    label(ctx, text, x1, y + 12, 'right', 'rgba(255,255,255,.85)');
  }

  function legendBar(ctx, pl, L) {
    if (!L || pl.size < 250) return;
    const w = 132, x = 12, y = 30, n = L.lut.length;
    ctx.font = FONT;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(x - 7, y - 21, Math.max(w, ctx.measureText(L.title).width) + 14, 48);
    label(ctx, L.title, x, y - 10, 'left', 'rgba(255,255,255,.9)');
    for (let i = 0; i < w; i++) {
      const f = i / (w - 1);
      let lut = L.lut[0], t = f;
      if (n === 2) { lut = f < 0.5 ? L.lut[0] : L.lut[1]; t = Math.abs(f - 0.5) * 2; }
      const k = 3 * Math.round(255 * t);
      ctx.fillStyle = `rgb(${lut[k]},${lut[k + 1]},${lut[k + 2]})`;
      ctx.fillRect(x + i, y, 1.5, 5);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, w + 1, 6);
    const pos = ['left', 'center', 'right'];
    L.ticks.forEach((t, i) => { if (t) label(ctx, t, x + (w * i) / 2, y + 14, pos[i], 'rgba(255,255,255,.7)'); });
  }

  function markerPath(ctx, x, y, type, r) {
    ctx.beginPath();
    if (type === 'saddle') {
      const d = r * 1.2;
      ctx.moveTo(x, y - d); ctx.lineTo(x + d, y); ctx.lineTo(x, y + d); ctx.lineTo(x - d, y); ctx.closePath();
    } else if (type === 'max') {
      const d = r * 1.25;
      ctx.moveTo(x, y - d); ctx.lineTo(x + d * 0.92, y + d * 0.7); ctx.lineTo(x - d * 0.92, y + d * 0.7); ctx.closePath();
    } else ctx.arc(x, y, r, 0, 2 * Math.PI);
  }
  function marker(ctx, x, y, type, r, colour, width) {
    markerPath(ctx, x, y, type, r);
    ctx.lineWidth = (width || 1.75) + 2.5; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.stroke();
    ctx.lineWidth = width || 1.75; ctx.strokeStyle = colour; ctx.stroke();
  }

  /* Contours of the arrival-time surface: evenly spaced in days after the first image, plus the
     contour through each saddle point, which is where the surface pinches. */
  function arrivalContours() {
    const S = App.S, G = E.G, N = G.N;
    const key = E.imKey + '|' + E.cosmoKey + '|' + N;
    if (E.tauKey === key) return E.tauLines;
    E.tauKey = key;
    const out = E.tauLines = { regular: [], saddle: [], stepDays: 0 };
    if (!E.images.length) return out;
    const tau = new Float32Array(N * N), sx = S.sx, sy = S.sy;
    for (let j = 0, k = 0; j < N; j++) {
      const y = P.gridY(G, j);
      for (let i = 0; i < N; i++, k++) {
        const x = P.gridX(G, i);
        tau[k] = 0.5 * ((x - sx) * (x - sx) + (y - sy) * (y - sy)) - G.psi[k];
      }
    }
    const tau0 = E.images[E.first].tau;
    const spanImg = E.images.reduce((m, im) => Math.max(m, im.dtau), 0);
    const span = Math.max(2.6 * spanImg, 0.12 * E.M.thetaE * E.M.thetaE);
    const scale = E.cosmo.tdScale > 0 ? E.cosmo.tdScale : 1;
    const stepDays = niceStep(span * scale / 13);
    out.stepDays = E.cosmo.tdScale > 0 ? stepDays : 0;
    const step = stepDays / scale, stride = N > 320 ? 2 : 1;
    const sky = (lines) => lines.filter(l => l.length > 2).map(l => {
      const c = new Float32Array(2 * l.length);
      for (let k = 0; k < l.length; k++) { c[2 * k] = -G.half + (l[k][0] + 0.5) * G.h; c[2 * k + 1] = G.half - (l[k][1] + 0.5) * G.h; }
      return c;
    });
    for (let k = 1; k * step <= span && k <= 40; k++) out.regular.push(...sky(P.contour(tau, N, tau0 + k * step, stride)));
    for (const im of E.images) if (im.type === 'saddle') out.saddle.push(...sky(P.contour(tau, N, im.tau, stride)));
    return out;
  }

  function drawImageOverlay() {
    const S = App.S, pl = plates.img, ctx = begin(pl);
    if (S.showGrid) drawGrid(ctx, pl);

    if (S.showTau) {
      const t = arrivalContours();
      strokeCurves(ctx, pl, t.regular, 'rgba(255,255,255,.26)', 1);
      strokeCurves(ctx, pl, t.saddle, 'rgba(255,255,255,.7)', 1.1);
    }

    const ref = App.ref;
    if (ref && S.showCrit) {
      strokeCurves(ctx, pl, ref.curves.tan, 'rgba(255,255,255,.4)', 1);
      strokeCurves(ctx, pl, ref.curves.rad, 'rgba(255,255,255,.4)', 1, [4, 4]);
    }
    if (S.showCrit) {
      strokeCurves(ctx, pl, E.curves.tan, CURVE, 1.4);
      strokeCurves(ctx, pl, E.curves.rad, CURVE, 1.4, [5, 4]);
    }

    // deflectors: G is the main lens, G1, G2, ... the perturbers
    const [gx, gy] = toPx(pl, S.cx, S.cy);
    ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(gx - 6, gy); ctx.lineTo(gx + 6, gy); ctx.moveTo(gx, gy - 6); ctx.lineTo(gx, gy + 6); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    label(ctx, 'G', gx + 9, gy - 9);
    const s = pl.size / (2 * pl.half());
    S.perts.forEach((p, i) => {
      const [px, py] = toPx(pl, p.x, p.y), on = p.on !== false;
      ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.strokeStyle = on ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.arc(px, py, Math.max(p.thetaE * s, 2), 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.rect(px - 3.5, py - 3.5, 7, 7);
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.stroke();
      if (on) { ctx.fillStyle = '#fff'; ctx.fill(); } else { ctx.lineWidth = 1.25; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke(); }
      label(ctx, 'G' + (i + 1), px + 9, py - 9, 'left', on ? '#fff' : 'rgba(255,255,255,.6)');
    });

    if (ref) {
      for (const im of ref.images) {
        const [x, y] = toPx(pl, im.x, im.y);
        markerPath(ctx, x, y, im.type, 11);
        ctx.setLineDash([3, 3]); ctx.lineWidth = 1.25; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke(); ctx.setLineDash([]);
      }
    }

    if (S.showMarkers) {
      for (const im of E.images) {
        const [x, y] = toPx(pl, im.x, im.y), colour = App.plateColor(im.i);
        const r = 5 + 1.5 * Math.sqrt(Math.min(im.absMu, 40));
        marker(ctx, x, y, im.type, r, colour);
        if (App.S.view === 'delays') {
          // the dot's area follows the image's brightness at the playhead
          const f = App.fluxFactor(im);
          ctx.beginPath(); ctx.arc(x, y, Math.min(r - 1.5, 1 + 2.4 * Math.sqrt(f)), 0, 2 * Math.PI);
          ctx.fillStyle = colour; ctx.fill();
        }
        let ux = im.x - S.cx, uy = im.y - S.cy;
        const d = Math.hypot(ux, uy) || 1;
        ux /= d; uy /= d;
        ctx.font = "650 12px 'Mona Sans', system-ui, sans-serif";
        const lx = x + ux * (r + 11), ly = y - uy * (r + 11);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(im.label, lx, ly);
        ctx.fillStyle = '#fff'; ctx.fillText(im.label, lx, ly);
      }
    }

    const hv = App.hover;
    if (hv && hv.plane === 'src' && hv.images) {
      for (const im of hv.images) {
        const [x, y] = toPx(pl, im.x, im.y);
        marker(ctx, x, y, im.type, 4.5, 'rgba(255,255,255,.95)', 1.25);
      }
    }
    if (hv && hv.plane === 'img' && hv.local) {
      // how a small round source seen at this point is stretched: 1/|1-kappa-gamma| along the shear
      const q = hv.local, [x, y] = toPx(pl, q.x, q.y), rho = 5, cap = 64;
      const a = Math.min(cap, rho / Math.max(Math.abs(q.lt), 1e-3)), b = Math.min(cap, rho / Math.max(Math.abs(q.lr), 1e-3));
      ctx.beginPath(); ctx.ellipse(x, y, a, b, -0.5 * Math.atan2(q.g2, q.g1), 0, 2 * Math.PI);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
    }

    scaleBar(ctx, pl, E.cosmo.ok ? E.cosmo.kpcPerArcsecLens : NaN);
    legendBar(ctx, pl, E.mapLegend);
  }

  function drawSourceOverlay() {
    const S = App.S, pl = plates.src, ctx = begin(pl);
    if (S.showGrid) drawGrid(ctx, pl);
    const ref = App.ref;
    if (S.showCrit) {
      if (ref) {
        strokeCurves(ctx, pl, ref.curves.tanCaustic, 'rgba(255,255,255,.4)', 1);
        strokeCurves(ctx, pl, ref.curves.radCaustic, 'rgba(255,255,255,.4)', 1, [4, 4]);
      }
      strokeCurves(ctx, pl, E.curves.tanCaustic, CURVE, 1.4);
      strokeCurves(ctx, pl, E.curves.radCaustic, CURVE, 1.4, [5, 4]);
    }
    if (ref) {
      const [x, y] = toPx(pl, ref.state.sx, ref.state.sy);
      ctx.setLineDash([3, 3]); ctx.lineWidth = 1.25; ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    }
    // the source: a reticle that leaves the centre visible
    const [sx, sy] = toPx(pl, S.sx, S.sy);
    for (const [w, c] of [[4, 'rgba(0,0,0,.7)'], [1.5, '#fff']]) {
      ctx.lineWidth = w; ctx.strokeStyle = c;
      ctx.beginPath();
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(sx + 5 * ax, sy + 5 * ay); ctx.lineTo(sx + 12 * ax, sy + 12 * ay); }
      ctx.stroke();
    }
    const hv = App.hover;
    if (hv && hv.plane === 'img' && hv.local) {
      const [x, y] = toPx(pl, hv.local.bx, hv.local.by);
      if (x > -20 && y > -20 && x < pl.size + 20 && y < pl.size + 20) {
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fill();
      }
    }
    scaleBar(ctx, pl, E.cosmo.ok ? E.cosmo.kpcPerArcsecSource : NaN);
    legendBar(ctx, pl, E.srcLegend);
  }

  App.drawOverlays = function () { drawImageOverlay(); drawSourceOverlay(); };

  /* A plate as it appears on screen (raster and overlay), as a PNG blob. */
  App.platePNG = function (which, done) {
    const pl = plates[which], px = pl.overlay.width, c = document.createElement('canvas');
    c.width = c.height = px;
    const g = c.getContext('2d');
    g.fillStyle = '#040405'; g.fillRect(0, 0, px, px);
    g.imageSmoothingEnabled = pl.raster.style.imageRendering !== 'pixelated';
    g.imageSmoothingQuality = 'high';
    g.drawImage(pl.raster, 0, 0, px, px);
    g.drawImage(pl.overlay, 0, 0);
    c.toBlob(done, 'image/png');
  };

  App.arrivalStepDays = () => (App.S.showTau && E.tauLines ? E.tauLines.stepDays : 0);
})();
