/* Results: the image table and lens facts, the comparison with a pinned model, and the time-delay
   workspace (light curves, measured delays, the Hubble constant they imply). */
(function () {
  'use strict';
  const App = window.LensApp, P = window.LensPhysics, T = window.LensTime, E = App.eng;
  const $ = (id) => document.getElementById(id);
  const PLANCK = { name: 'Planck', h: 67.4, s: 0.5 }, SHOES = { name: 'SH0ES', h: 73.04, s: 1.04 };

  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) for (const k in props) {
      if (k === 'class') n.className = props[k];
      else if (k === 'style') n.style.cssText = props[k];
      else if (k === 'html') n.innerHTML = props[k];
      else n.setAttribute(k, props[k]);
    }
    for (const kid of kids) if (kid != null) n.append(kid);
    return n;
  }
  App.el = el;
  const minus = (s) => String(s).replace('-', '−');
  const signed = (v, dp) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(dp);
  const imgVar = (i) => (i < 6 ? `var(--img-${i})` : 'var(--muted)');
  const typeName = { min: 'minimum', saddle: 'saddle', max: 'maximum' };

  function key(i, type) {
    return el('i', { class: 'key ' + (type || ''), style: 'background:' + imgVar(i) });
  }
  function table(head, rows) {
    const t = el('table'), tr = el('tr');
    head.forEach((h, i) => {
      const left = typeof h === 'object' || i === 0;       // { text } marks a left-aligned text column
      tr.append(el('th', left ? { class: 'txt' } : null, typeof h === 'object' ? h.text : h));
    });
    t.append(el('thead', null, tr));
    const body = el('tbody');
    for (const r of rows) {
      const row = el('tr');
      r.forEach((c) => row.append(c instanceof Node && c.tagName === 'TD' ? c : el('td', null, c)));
      body.append(row);
    }
    t.append(body);
    return t;
  }
  const fmtMu = (mu) => minus(Math.abs(mu) >= 100 ? mu.toFixed(0) : Math.abs(mu) >= 10 ? mu.toFixed(1) : mu.toFixed(2));
  const fmtDays = (d) => (Math.abs(d) >= 100 ? d.toFixed(0) : d.toFixed(1));

  /* ---------------------------------------------------------------- rail */

  function updateImages() {
    const S = App.S, ims = E.images, box = $('imagesTable');
    box.textContent = '';
    if (!ims.length) {
      box.append(el('p', { class: 'note' }, 'No image inside the field. Move the source closer to the lens or widen the image plane.'));
      $('imagesNote').textContent = '';
      return;
    }
    const rows = ims.map((im) => [
      el('td', null, key(im.i, im.type), el('span', { class: 'lab' }, im.label)),
      minus(im.x.toFixed(3)), minus(im.y.toFixed(3)), fmtMu(im.mu),
      el('td', { class: 'txt' }, typeName[im.type]),
      !E.cosmo.ok ? '–' : im.i === E.first ? 'first' : '+' + fmtDays(im.dt) + ' d',
    ]);
    box.append(table(['', 'x (″)', 'y (″)', 'μ', { text: 'arrival time' }, 'delay'], rows));
    const total = ims.reduce((s, im) => s + im.absMu, 0);
    let note = `Total magnification ${total >= 100 ? total.toFixed(0) : total.toFixed(1)}. Labelled by ${S.order === 'arrival' ? 'arrival time' : 'brightness'}; negative μ means a mirrored image.`;
    const step = App.arrivalStepDays();
    if (step) note += ` Arrival-time contours every ${step >= 1 ? step : step.toPrecision(1)} d; brighter ones pass through the saddle points.`;
    $('imagesNote').textContent = note;
  }

  function updateFacts() {
    const S = App.S, M = E.M, c = E.cosmo, dl = $('lensFacts');
    dl.textContent = '';
    const add = (k, v) => dl.append(el('dt', { html: k }), el('dd', { html: v }));
    add('Axis ratio, angle', `${M.q.toFixed(2)} at ${minus((M.phi / P.DEG).toFixed(0))}°`);
    if (S.lambda !== 1) add('External convergence 1 − λ', minus((1 - S.lambda).toFixed(3)));
    if (!c.ok) { add('Distances', 'source must lie behind the lens'); return; }
    const m = P.einsteinMass(S.thetaE, c), ex = Math.floor(Math.log10(m));
    add('Mass inside θ<sub>E</sub>', `${(m / Math.pow(10, ex)).toFixed(2)} × 10<sup>${ex}</sup> M<sub>☉</sub>`);
    add('Isothermal dispersion', `${P.sigmaSIS(S.thetaE, c).toFixed(0)} km/s`);
    add('1″ at the lens, source', `${c.kpcPerArcsecLens.toFixed(2)}, ${c.kpcPerArcsecSource.toFixed(2)} kpc`);
    add('D<sub>d</sub>, D<sub>s</sub>, D<sub>ds</sub> (Mpc)', `${c.Dl.toFixed(0)}, ${c.Ds.toFixed(0)}, ${c.Dls.toFixed(0)}`);
    add('Time-delay distance D<sub>Δt</sub>', `${c.Ddt.toFixed(0)} Mpc`);
    add('Delay per arcsec² of Δτ', `${c.tdScale.toFixed(1)} d`);
  }

  /* ---------------------------------------------------------------- pinned model */

  let refCount = 0;
  App.ref = null;

  App.pin = function () {
    App.compute();
    App.ref = {
      id: ++refCount,
      state: JSON.parse(JSON.stringify(App.S)),
      images: E.images.map((im) => Object.assign({}, im)),
      first: E.first,
      curves: E.curves,
      tdScale: E.cosmo.tdScale,
    };
  };
  App.unpin = function () {
    App.ref = null;
    if (App.S.map === 'resid') App.S.map = 'light';
  };

  /* Match the pinned images to the current ones and compare what could be observed. */
  App.compareWithRef = function () {
    const ref = App.ref;
    if (!ref) return null;
    const now = E.images, used = new Set();
    const order = ref.images.slice().sort((a, b) => b.absMu - a.absMu);
    const match = new Map();
    for (const r of order) {
      let best = -1, bd = 0.5;
      now.forEach((im, k) => { const d = Math.hypot(im.x - r.x, im.y - r.y); if (!used.has(k) && d < bd) { bd = d; best = k; } });
      if (best >= 0) { used.add(best); match.set(r, { im: now[best], d: bd }); }
    }
    const bright = ref.images.filter((r) => r.absMu >= 1);
    const matched = bright.filter((r) => match.has(r));
    const nowBright = now.filter((im) => im.absMu >= 1).length;
    const out = { rows: [], countRef: bright.length, countNow: nowBright, complete: matched.length === bright.length && nowBright === bright.length };
    out.rms = matched.length ? Math.sqrt(matched.reduce((s, r) => s + match.get(r).d ** 2, 0) / matched.length) * 1000 : NaN;

    // flux ratios relative to the brightest pinned image
    const top = order[0], topNow = match.get(top);
    let fr = 0, nf = 0;
    // delays relative to the first pinned image
    const firstRef = ref.images[ref.first], firstNow = match.get(firstRef);
    let num = 0, den = 0;
    for (const r of ref.images) {
      const m = match.get(r), row = { ref: r, now: m ? m.im : null, d: m ? m.d * 1000 : NaN };
      row.fRef = r.absMu / top.absMu;
      row.fNow = m && topNow ? m.im.absMu / topNow.im.absMu : NaN;
      if (r !== top && r.absMu >= 1 && isFinite(row.fNow)) { fr += (row.fNow / row.fRef - 1) ** 2; nf++; }
      row.dtRef = (r.tau - firstRef.tau) * ref.tdScale;
      row.dtNow = m && firstNow ? (m.im.tau - firstNow.im.tau) * E.cosmo.tdScale : NaN;
      if (r !== firstRef && r.absMu >= 1 && isFinite(row.dtNow)) { num += row.dtRef * row.dtNow; den += row.dtRef * row.dtRef; }
      out.rows.push(row);
    }
    out.fluxRms = nf ? Math.sqrt(fr / nf) : NaN;
    // The pinned delays are what would be measured. A model whose delays are larger by a factor
    // needs a smaller universe, so a larger H0, by the same factor.
    out.h0Factor = den > 1e-12 ? num / den : NaN;
    out.h0 = App.S.H0 * out.h0Factor;
    return out;
  };

  function updateRef() {
    const ref = App.ref, cmp = App.compareWithRef();
    $('unpinBtn').hidden = $('refitBtn').hidden = $('fitSlopeRow').hidden = !ref;
    $('pinBtn').textContent = ref ? 'Pin again' : 'Pin this model';
    $('refIntro').hidden = !!ref;
    const v = $('refVerdict'), t = $('refTable');
    v.textContent = ''; t.textContent = '';
    if (!ref) return;
    const box = el('div', { class: 'verdict' });
    const line = (ok, text) => box.append(el('p', null, el('span', { class: ok ? 'good' : 'bad' }, ok ? 'Agree. ' : 'Differ. '), text));
    if (!cmp.complete) {
      box.append(el('p', null, el('span', { class: 'bad' }, 'Different image configuration. '), `${cmp.countRef} bright images pinned, ${cmp.countNow} now.`));
    } else {
      line(cmp.rms < 3, `Positions: rms ${cmp.rms < 0.05 ? '< 0.05' : cmp.rms.toFixed(cmp.rms < 10 ? 1 : 0)} mas.`);
      if (isFinite(cmp.fluxRms)) line(cmp.fluxRms < 0.05, `Flux ratios: rms ${(100 * cmp.fluxRms).toFixed(cmp.fluxRms < 0.1 ? 1 : 0)}%.`);
      if (isFinite(cmp.h0Factor)) {
        const off = 100 * (cmp.h0Factor - 1);
        line(Math.abs(off) < 1, `Delays: ${Math.abs(off) < 0.05 ? 'unchanged' : signed(off, 1) + '%'}.`);
        box.append(el('p', { style: 'margin-top:10px' }, 'Fitting the pinned delays with this model gives'));
        box.append(el('p', { class: 'big' }, `H₀ = ${cmp.h0.toFixed(1)}`, el('span', { style: 'font-size:12px;font-weight:400;color:var(--muted)' }, ` km/s/Mpc, true ${App.S.H0.toFixed(1)}`)));
      }
    }
    v.append(box);
    const rows = cmp.rows.map((r) => [
      el('td', null, el('span', { class: 'lab' }, r.ref.label + '′')),
      r.now ? (r.d < 0.05 ? '0.0' : r.d.toFixed(r.d < 100 ? 1 : 0)) : 'missing',
      r.now && isFinite(r.fNow) ? `${r.fRef.toFixed(2)} → ${r.fNow.toFixed(2)}` : r.fRef.toFixed(2),
      r.now && isFinite(r.dtNow) ? `${fmtDays(r.dtRef)} → ${fmtDays(r.dtNow)}` : fmtDays(r.dtRef),
    ]);
    t.append(table(['', 'Δθ (mas)', 'flux ratio', 'Δt (d)'], rows));
    t.append(el('p', { class: 'note' }, 'Pinned → now. Dashed outlines in the planes are the pinned images, source and curves.'));
  }

  App.updateRail = function () { updateImages(); updateFacts(); updateRef(); };

  /* ---------------------------------------------------------------- time domain */

  App.time = { t: 0, playing: false, speed: 1 };
  App.meas = null;

  function timeCfg() {
    const S = App.S;
    return {
      type: S.lcType, sigma: S.lcSigma, tau: S.lcTau, period: S.lcPeriod, duration: S.lcDur, seed: S.lcSeed,
      cadence: S.cadence, noise: S.photNoise, season: S.season, micro: S.microOn, microAmp: S.microAmp,
    };
  }
  let sigKey = '', sig = null;
  function signal() {
    const c = timeCfg(), k = [c.type, c.sigma, c.tau, c.period, c.seed, c.micro, c.microAmp].join('|');
    if (k !== sigKey) { sigKey = k; sig = T.makeSignal(c); }
    return sig;
  }
  const lcImages = () => E.images.map((im) => ({ dt: im.dt, absMu: im.absMu }));
  const dataKey = () => JSON.stringify(timeCfg()) + '|' + E.images.map((im) => im.dt.toFixed(3) + ',' + im.absMu.toFixed(3)).join(';');

  let mockKey = '', mock = null;
  function mockData() {
    if (!App.S.monOn || !E.images.length) return null;
    const k = dataKey();
    if (k !== mockKey) { mockKey = k; mock = T.sample(signal(), timeCfg(), lcImages(), 1); }
    return mock;
  }

  /* Brightness of an image at the playhead relative to its mean: 1 in the imaging workspace. */
  App.fluxFactor = function (im) {
    if (App.S.view !== 'delays') return 1;
    const s = signal(), t = App.time.t;
    return Math.pow(10, -0.4 * (s.mag(t - im.dt) + s.micro(im.i, t)));
  };
  // a new noise realisation for each visit while the light curves play
  App.noiseEpoch = () => (App.S.view === 'delays' ? Math.floor(App.time.t / Math.max(App.S.cadence, 2)) : 0);

  App.measure = function () {
    if (E.images.length < 2 || !E.cosmo.ok) return false;
    const rows = T.measureDelays(signal(), timeCfg(), lcImages(), E.first, { realisations: 24 });
    App.meas = { key: dataKey(), rows };
    return true;
  };
  const validMeas = () => (App.meas && App.S.monOn && App.meas.key === dataKey() ? App.meas : null);

  /* H0 from the measured delays and the lens model on screen, and from the pinned comparison. */
  function inferH0() {
    const S = App.S, meas = validMeas(), cmp = App.compareWithRef();
    const out = { h0: S.H0, sigma: NaN, perImage: [], measured: false, factor: 1 };
    if (cmp && cmp.complete && isFinite(cmp.h0Factor)) out.factor = cmp.h0Factor;
    if (meas) {
      let sw = 0, swh = 0;
      E.images.forEach((im, i) => {
        const m = meas.rows[i];
        if (i === E.first || !m || !isFinite(m.delay) || Math.abs(m.delay) < 0.5 || im.dt < 0.5) { out.perImage[i] = null; return; }
        const h = S.H0 * im.dt / m.delay, s = Math.abs(h * m.sigma / m.delay);
        out.perImage[i] = { h: h * out.factor, s: s * out.factor };
        sw += 1 / (s * s); swh += h / (s * s);
      });
      if (sw > 0) { out.h0 = swh / sw; out.sigma = Math.sqrt(1 / sw) * out.factor; out.measured = true; }
    }
    out.h0 *= out.factor;
    return out;
  }

  /* ---------------------------------------------------------------- light-curve chart */

  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const chart = { geom: null, hoverT: null };

  function seriesValue(s, ims, i, t) {
    const S = App.S;
    let m;
    if (i < 0) m = s.mag(t);
    else if (S.lcAlign) m = s.mag(t) + s.micro(i, t + ims[i].dt);
    else m = s.mag(t - ims[i].dt) + s.micro(i, t) - 2.5 * Math.log10(ims[i].absMu);
    return S.lcUnit === 'mag' ? m : Math.pow(10, -0.4 * m);
  }

  function ticks(lo, hi, target) {
    const raw = (hi - lo) / target, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    const step = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p, out = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9 * step; v += step) out.push(Math.abs(v) < 1e-12 ? 0 : v);
    return { step, values: out };
  }

  function drawChart() {
    const S = App.S, canvas = $('lcCanvas'), rect = canvas.parentElement.getBoundingClientRect();
    const W = Math.max(240, rect.width), H = Math.max(120, rect.height), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const fg = css('--fg'), muted = css('--muted'), line = css('--line'), wash = css('--wash');
    const ims = E.images, s = signal(), m = { l: 48, r: 26, t: 16, b: 24 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b, t1 = S.lcDur, mag = S.lcUnit === 'mag';
    const X = (t) => m.l + pw * t / t1;

    // sample every series, find the vertical range
    const n = Math.max(60, Math.min(900, Math.round(pw / 1.5)));
    // the unlensed quasar cannot be observed; it is drawn only once the delays are undone,
    // when every image should fall on it
    const ids = (S.lcAlign ? [-1] : []).concat(ims.map((_, i) => i)), curves = new Map();
    let lo = Infinity, hi = -Infinity;
    for (const id of ids) {
      const a = new Float32Array(n);
      for (let k = 0; k < n; k++) { const v = seriesValue(s, ims, id, t1 * k / (n - 1)); a[k] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
      curves.set(id, a);
    }
    const data = mockData(), points = [];
    if (data) {
      data.forEach((d, i) => {
        const im = ims[i], shift = S.lcAlign ? im.dt : 0, off = S.lcAlign ? 2.5 * Math.log10(im.absMu) : 0;
        const pts = [];
        for (let k = 0; k < d.t.length; k++) {
          const t = d.t[k] - shift;
          if (t < 0 || t > t1) continue;
          const v = mag ? d.m[k] + off : Math.pow(10, -0.4 * (d.m[k] + off));
          pts.push(t, v);
          if (v < lo) lo = v; if (v > hi) hi = v;
        }
        points.push(pts);
      });
    }
    if (!(hi > lo)) { hi = lo + 1; }
    const pad = 0.07 * (hi - lo);
    lo -= pad; hi += pad;
    const Y = (v) => (mag ? m.t + ph * (v - lo) / (hi - lo) : m.t + ph * (1 - (v - lo) / (hi - lo)));
    chart.geom = { m, pw, ph, t1, W, H };

    // unobservable part of each year
    if (S.monOn && S.season < 12) {
      ctx.fillStyle = wash;
      const open = S.season / 12 * T.YEAR;
      for (let y0 = 0; y0 < t1; y0 += T.YEAR) {
        const a = y0 + open, b = Math.min(y0 + T.YEAR, t1);
        if (a < t1) ctx.fillRect(X(a), m.t, X(b) - X(a), ph);
      }
    }
    // axes
    ctx.font = "400 10.5px 'Mona Sans', system-ui, sans-serif"; ctx.fillStyle = muted; ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    const yt = ticks(lo, hi, Math.max(2, Math.floor(ph / 34)));
    ctx.beginPath();
    for (const v of yt.values) {
      const y = Math.round(Y(v)) + 0.5;
      ctx.moveTo(m.l, y); ctx.lineTo(m.l + pw, y);
      ctx.fillText(minus(v.toFixed(yt.step < 0.1 ? 2 : yt.step < 1 ? 1 : 0)), m.l - 7, y);
    }
    ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const xt = ticks(0, t1, Math.max(3, Math.floor(pw / 110))).values;
    xt.forEach((v, k) => ctx.fillText(k === xt.length - 1 ? `day ${v.toFixed(0)}` : v.toFixed(0), X(v), H - 7));
    ctx.save(); ctx.translate(11, m.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center';
    ctx.fillText(mag ? (S.lcAlign ? 'magnitude, delays and magnifications removed' : 'magnitude (brighter is up)') : (S.lcAlign ? 'flux, delays and magnifications removed' : 'flux, unlensed mean = 1'), 0, 0);
    ctx.restore();

    // curves: the intrinsic signal dashed, then one line per image
    const path = (a) => {
      ctx.beginPath();
      for (let k = 0; k < n; k++) { const x = m.l + pw * k / (n - 1), y = Y(a[k]); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
    };
    ctx.save();
    ctx.beginPath(); ctx.rect(m.l, m.t - 4, pw, ph + 8); ctx.clip();
    ctx.lineJoin = 'round';
    if (curves.has(-1)) { ctx.setLineDash([4, 4]); ctx.lineWidth = 1.25; ctx.strokeStyle = fg; path(curves.get(-1)); ctx.setLineDash([]); }
    const faint = !!data;
    ims.forEach((im, i) => {
      ctx.strokeStyle = css('--img-' + i) || muted; ctx.lineWidth = faint ? 1.25 : 2; ctx.globalAlpha = faint ? 0.55 : 1;
      path(curves.get(i));
    });
    ctx.globalAlpha = 1;
    if (data) points.forEach((pts, i) => {
      ctx.fillStyle = css('--img-' + i) || muted;
      for (let k = 0; k < pts.length; k += 2) { ctx.beginPath(); ctx.arc(X(pts[k]), Y(pts[k + 1]), 1.9, 0, 2 * Math.PI); ctx.fill(); }
    });
    ctx.restore();

    // direct labels at the right-hand end, nudged apart
    const ends = ims.map((im, i) => ({ i, label: im.label, y: Y(curves.get(i)[n - 1]) })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 12) ends[k].y = ends[k - 1].y + 12;
    ctx.font = "650 11px 'Mona Sans', system-ui, sans-serif"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = fg;
    for (const e of ends) ctx.fillText(e.label, m.l + pw + 8, Math.min(Math.max(e.y, m.t + 4), m.t + ph - 2));

    // playhead and hover line
    const tp = App.time.t;
    ctx.strokeStyle = fg; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Math.round(X(tp)) + 0.5, m.t - 4); ctx.lineTo(Math.round(X(tp)) + 0.5, m.t + ph); ctx.stroke();
    ctx.font = "500 10.5px 'Mona Sans', system-ui, sans-serif"; ctx.fillStyle = fg; ctx.textBaseline = 'alphabetic';
    ctx.textAlign = X(tp) > m.l + pw - 70 ? 'right' : 'left';
    ctx.fillText(`day ${tp.toFixed(0)}`, X(tp) + (ctx.textAlign === 'right' ? -5 : 5), m.t - 5);
    if (chart.hoverT != null) {
      const x = Math.round(X(chart.hoverT)) + 0.5;
      ctx.strokeStyle = muted; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(x, m.t); ctx.lineTo(x, m.t + ph); ctx.stroke(); ctx.setLineDash([]);
      for (const id of ids) {
        const v = seriesValue(s, ims, id, chart.hoverT);
        ctx.beginPath(); ctx.arc(x, Y(v), 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = id < 0 ? muted : (css('--img-' + id) || muted); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = css('--bg'); ctx.stroke();
      }
    }
  }

  function chartTime(ev) {
    const g = chart.geom, r = $('lcCanvas').getBoundingClientRect();
    if (!g) return null;
    return Math.min(g.t1, Math.max(0, (ev.clientX - r.left - g.m.l) / g.pw * g.t1));
  }

  function showTip(ev) {
    const tip = $('lcTip'), S = App.S, t = chart.hoverT, ims = E.images, s = signal();
    if (t == null) { tip.hidden = true; return; }
    tip.textContent = '';
    tip.append(el('div', { class: 't' }, `day ${t.toFixed(0)}`));
    const dp = S.lcUnit === 'mag' ? 2 : 2;
    ims.forEach((im, i) => tip.append(el('div', null, el('i', { class: 'key line', style: 'background:' + imgVar(i) }), im.label, el('b', null, minus(seriesValue(s, ims, i, t).toFixed(dp))))));
    if (S.lcAlign) tip.append(el('div', null, el('i', { class: 'key dash' }), 'unlensed', el('b', null, minus(seriesValue(s, ims, -1, t).toFixed(dp)))));
    tip.hidden = false;
    const box = $('lcCanvas').getBoundingClientRect(), w = tip.offsetWidth;
    let x = ev.clientX - box.left + 14;
    if (x + w > box.width - 4) x = ev.clientX - box.left - w - 14;
    tip.style.left = x + 'px'; tip.style.top = '18px';
  }

  App.initChart = function () {
    const c = $('lcCanvas');
    let scrubbing = false;
    c.addEventListener('pointerdown', (ev) => {
      scrubbing = true; c.setPointerCapture(ev.pointerId);
      const t = chartTime(ev); if (t != null) { App.time.t = t; App.invalidate('time'); }
    });
    c.addEventListener('pointermove', (ev) => {
      const t = chartTime(ev);
      chart.hoverT = t;
      if (scrubbing && t != null) { App.time.t = t; App.invalidate('time'); } else drawChart();
      showTip(ev);
    });
    const end = () => { scrubbing = false; };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => { chart.hoverT = null; $('lcTip').hidden = true; drawChart(); });
    if (window.ResizeObserver) new ResizeObserver(() => { if (App.S.view === 'delays') drawChart(); }).observe(c.parentElement);
  };

  /* ---------------------------------------------------------------- delays and H0 */

  function updateLegend() {
    const box = $('lcLegend');
    box.textContent = '';
    for (const im of E.images) box.append(el('span', null, el('i', { class: 'key line', style: 'background:' + imgVar(im.i) }), im.label));
    if (App.S.lcAlign) box.append(el('span', null, el('i', { class: 'key dash' }), 'unlensed'));
    if (App.S.monOn) box.append(el('span', null, 'dots: data'));
  }

  function updateDelays() {
    const S = App.S, box = $('delayTable'), meas = validMeas(), inf = inferH0();
    box.textContent = '';
    if (!E.cosmo.ok) { box.append(el('p', { class: 'note' }, 'The source must lie behind the lens for delays to exist.')); return inf; }
    if (E.images.length < 2) { box.append(el('p', { class: 'note' }, 'One image, so there is no delay to measure.')); return inf; }
    const order = E.images.slice().sort((a, b) => a.tau - b.tau), first = E.images[E.first];
    const rows = order.map((im) => {
      const m = meas && meas.rows[im.i], h = inf.perImage[im.i];
      return [
        el('td', null, key(im.i, im.type), el('span', { class: 'lab' }, im.i === E.first ? im.label : `${im.label} − ${first.label}`)),
        im.i === E.first ? 'first' : fmtDays(im.dt),
        im.i === E.first ? '' : !m ? '–' : isFinite(m.delay) ? `${fmtDays(m.delay)} ± ${m.sigma.toFixed(m.sigma < 10 ? 1 : 0)}` : 'failed',
        h ? `${h.h.toFixed(1)} ± ${h.s.toFixed(1)}` : im.i === E.first ? '' : '–',
      ];
    });
    box.append(table(['', 'model Δt (d)', 'measured', 'H₀'], rows));
    return inf;
  }

  function drawH0(inf) {
    const S = App.S, host = $('h0Strip');
    const lo0 = Math.min(S.H0, inf.h0 - (isFinite(inf.sigma) ? inf.sigma : 0), 62);
    const hi0 = Math.max(S.H0, inf.h0 + (isFinite(inf.sigma) ? inf.sigma : 0), 78);
    const lo = Math.max(20, Math.floor((lo0 - 2) / 5) * 5), hi = Math.min(160, Math.ceil((hi0 + 2) / 5) * 5);
    const W = 300, x0 = 6, x1 = W - 6, X = (h) => x0 + (x1 - x0) * (Math.min(hi, Math.max(lo, h)) - lo) / (hi - lo);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} 92`); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Hubble constant: true value ${S.H0.toFixed(1)}, inferred ${inf.h0.toFixed(1)}${isFinite(inf.sigma) ? ' plus or minus ' + inf.sigma.toFixed(1) : ''} kilometres per second per megaparsec.`);
    const add = (tag, attrs, text) => {
      const n = document.createElementNS(ns, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (text != null) n.textContent = text;
      svg.append(n);
      return n;
    };
    // the two measurements the tension is about, as bands
    for (const b of [PLANCK, SHOES]) {
      if (b.h + b.s < lo || b.h - b.s > hi) continue;
      add('rect', { x: X(b.h - b.s), y: 24, width: Math.max(1.5, X(b.h + b.s) - X(b.h - b.s)), height: 34, fill: 'currentColor', opacity: 0.16 });
      add('text', { x: X(b.h), y: 18, 'text-anchor': 'middle' }, b.name);
    }
    add('line', { x1: x0, x2: x1, y1: 58.5, y2: 58.5, stroke: 'currentColor', 'stroke-width': 1 });
    const step = hi - lo > 60 ? 20 : hi - lo > 30 ? 10 : 5;
    for (let h = Math.ceil(lo / step) * step; h <= hi; h += step) {
      add('line', { x1: X(h), x2: X(h), y1: 58, y2: 62, stroke: 'currentColor', 'stroke-width': 1 });
      add('text', { x: X(h), y: 73, 'text-anchor': 'middle' }, h);
    }
    // true value: an open tick; inferred: a dot with its error bar
    add('line', { x1: X(S.H0), x2: X(S.H0), y1: 30, y2: 58, stroke: 'currentColor', 'stroke-width': 1, 'stroke-dasharray': '2 2' });
    add('text', { x: X(S.H0), y: 88, 'text-anchor': X(S.H0) > W - 40 ? 'end' : X(S.H0) < 40 ? 'start' : 'middle', class: 'strong' }, `true ${S.H0.toFixed(1)}`);
    if (isFinite(inf.sigma)) {
      add('line', { x1: X(inf.h0 - inf.sigma), x2: X(inf.h0 + inf.sigma), y1: 41, y2: 41, stroke: 'currentColor', 'stroke-width': 2 });
    }
    add('circle', { cx: X(inf.h0), cy: 41, r: 4.5, fill: 'currentColor', stroke: 'var(--bg)', 'stroke-width': 2 });
    host.textContent = '';
    host.append(svg);

    const note = $('h0Note');
    note.textContent = '';
    note.append(el('span', { class: 'verdict' }, el('span', { class: 'big', style: 'color:var(--fg)' },
      `H₀ = ${inf.h0.toFixed(1)}${isFinite(inf.sigma) ? ' ± ' + inf.sigma.toFixed(1) : ''}`)), el('br'));
    let text;
    if (inf.measured) {
      text = 'From the measured delays and the lens model on screen. The error bar is the scatter over photometric noise only';
      text += S.microOn ? '; microlensing shifts the result without widening it.' : '.';
    } else if (S.monOn) text = 'Press Measure to estimate the delays from the monitoring data.';
    else text = 'With exact delays the model returns the true value. Turn on monitoring to see what a real campaign could measure.';
    if (inf.factor !== 1) text += ` The pinned model sets the delays, and this model's are ${signed(100 * (inf.factor - 1), 1)}% different, so H₀ moves by the same amount.`;
    note.append(text);
  }

  App.updateDock = function () {
    if (App.S.view !== 'delays') return;
    updateLegend();
    drawChart();
    drawH0(updateDelays());
    $('measureBtn').disabled = E.images.length < 2 || !E.cosmo.ok;
  };
  App.drawChart = drawChart;

  /* ---------------------------------------------------------------- export helpers */

  /* Light curves as CSV: the monitoring data if there are any, otherwise the model sampled daily. */
  App.lightCurveCSV = function () {
    const S = App.S, ims = E.images, s = signal(), data = mockData(), lines = [];
    lines.push('# Strong lensing simulator, light curves in magnitudes (smaller is brighter)');
    lines.push('# model delays after the first image (days): ' + ims.map((im) => `${im.label}=${im.dt.toFixed(3)}`).join(', '));
    lines.push('# magnifications: ' + ims.map((im) => `${im.label}=${im.mu.toFixed(4)}`).join(', '));
    if (data) {
      lines.push('day,' + ims.map((im) => `mag_${im.label},err_${im.label}`).join(','));
      for (let k = 0; k < data[0].t.length; k++) {
        lines.push(data[0].t[k].toFixed(3) + ',' + data.map((d) => `${d.m[k].toFixed(4)},${d.err.toFixed(4)}`).join(','));
      }
    } else {
      lines.push('day,intrinsic,' + ims.map((im) => `mag_${im.label}`).join(','));
      const L = lcImages();
      for (let t = 0; t <= S.lcDur; t++) lines.push(`${t},${s.mag(t).toFixed(4)},` + ims.map((im, i) => T.imageMag(s, L, i, t).toFixed(4)).join(','));
    }
    return lines.join('\n') + '\n';
  };
})();
