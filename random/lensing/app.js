/* The application: controls built from the parameter table, pointer and keyboard interaction,
   undo and links, exports, and the frame loop that ties rendering to the state. */
(function () {
  'use strict';
  const App = window.LensApp, P = window.LensPhysics, E = App.eng, el = App.el;
  const $ = (id) => document.getElementById(id);
  const clamp = App.clamp;
  const IMG_STEPS = [1.5, 2, 2.5, 3, 4, 5, 6], SRC_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

  /* ---------------------------------------------------------------- frame loop */

  const dirty = { model: false, time: false, hover: false };
  let raf = 0;
  App.invalidate = function (what) {
    dirty[what || 'model'] = true;
    if (!raf) raf = requestAnimationFrame(frame);
  };

  function frame() {
    raf = 0;
    const model = dirty.model, time = dirty.time;
    dirty.model = dirty.time = dirty.hover = false;
    App.compute();
    refreshHover();
    if (model || time) App.drawRasters();
    App.drawOverlays();
    if (model) {
      App.updateRail();
      App.updateDock();
      for (const f of derived) f();
      updateMeta();
    } else if (time && App.S.view === 'delays') App.drawChart();
    updateStatus();
  }

  // While a lens control is being dragged the grid is coarser; it sharpens when the hand lets go.
  let quickTimer = 0;
  function quick() {
    E.quick = true;
    clearTimeout(quickTimer);
    quickTimer = setTimeout(() => { E.quick = false; E.draft = false; App.invalidate('model'); }, 220);
  }

  /* ---------------------------------------------------------------- state changes */

  const widgets = {}, derived = [], conditions = [];

  function setParam(key, v, live) {
    const S = App.S;
    if (key === 'lambda' && S.lambda > 0) {
      // the mass-sheet transform acts on the source plane too: beta -> lambda beta
      const f = v / S.lambda;
      for (const k of ['sx', 'sy', 'reff']) S[k] = +(S[k] * f).toFixed(6);
      for (const k of ['sx', 'sy', 'reff']) widgets[k](S[k]);
    }
    S[key] = v;
    if ((key === 'fwhm' || key === 'pix' || key === 'noise') && S.inst !== 'ideal' && S.inst !== 'custom') { S.inst = 'custom'; widgets.inst('custom'); }
    if (live && App.LENS_KEYS.includes(key)) quick();
    if (live && App.SPIRAL_KEYS.includes(key)) { E.draft = true; quick(); }
    if (widgets[key]) widgets[key](v);
    App.invalidate('model');
  }

  function setOption(key, v) {
    const S = App.S;
    S[key] = v;
    if (key === 'inst') {
      const inst = App.INSTRUMENTS[v];
      for (const k of ['fwhm', 'pix', 'noise']) if (inst[k] != null) { S[k] = inst[k]; widgets[k](S[k]); }
    }
    if (key === 'hostKind' && v === 'image' && !App.tex.image) { S.hostKind = 'sersic'; widgets.hostKind('sersic'); $('fileImage').click(); return; }
    // a spiral needs room to show its arms
    if (key === 'hostKind' && v === 'spiral' && S.reff < 0.25) { S.reff = 0.3; widgets.reff(S.reff); }
    if (key === 'map' && v === 'resid' && !App.ref) { S.map = 'light'; widgets.map('light'); toast('Pin a model first: the residual is taken against it.'); return; }
    if (widgets[key]) widgets[key](v);
    applyConditions();
    App.invalidate('model');
    commit();
  }

  function syncUI() {
    const S = App.S;
    for (const k in widgets) widgets[k](S[k]);
    syncPreset();
    buildPerts();
    applyConditions();
    $('app').dataset.view = S.view;
    for (const b of document.querySelectorAll('.tabs button')) b.setAttribute('aria-pressed', String(b.dataset.view === S.view));
    for (const b of document.querySelectorAll('.seg button')) b.setAttribute('aria-pressed', String(b.dataset.unit === S.lcUnit));
    $('lcAlign').checked = S.lcAlign;
  }
  function applyConditions() { for (const [node, test] of conditions) node.hidden = !test(App.S); }

  /* ---------------------------------------------------------------- undo, redo, link */

  const hist = { stack: [], at: -1 };
  function commit() {
    const s = JSON.stringify(App.S);
    if (hist.stack[hist.at] === s) return;
    hist.stack.length = hist.at + 1;
    hist.stack.push(s);
    if (hist.stack.length > 200) hist.stack.shift();
    hist.at = hist.stack.length - 1;
    afterHistory();
  }
  function travel(step) {
    const to = hist.at + step;
    if (to < 0 || to >= hist.stack.length) return;
    hist.at = to;
    App.S = JSON.parse(hist.stack[to]);
    syncUI(); layout(); afterHistory();
    App.invalidate('model');
  }
  function afterHistory() {
    $('undoBtn').disabled = hist.at <= 0;
    $('redoBtn').disabled = hist.at >= hist.stack.length - 1;
    const hash = App.encode(App.S);
    try { history.replaceState(null, '', location.pathname + location.search + (hash ? '#' + hash : '')); } catch (e) { /* file:// in some browsers */ }
  }

  /* ---------------------------------------------------------------- controls */

  function slider(key, labelHTML, plain) {
    const p = App.PARAMS[key];
    const range = el('input', { type: 'range', id: 'r-' + key, min: p.min, max: p.max, step: p.step, title: 'Double-click to reset' });
    const num = el('input', { class: 'num', id: 'n-' + key, type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': plain || key });
    const row = el('div', { class: 'row' }, el('label', { for: 'r-' + key, html: labelHTML }), el('span', { class: 'val' }, num, el('span', { class: 'unit' }, p.unit)), range);
    const at = p.at != null ? p.at : (p.min < 0 && p.max > 0 ? 0 : p.min);
    const pos = (v) => `calc(${clamp((v - p.min) / (p.max - p.min), 0, 1)} * (100% - 11px) + 5.5px)`;
    widgets[key] = (v) => {
      range.value = v;
      if (document.activeElement !== num) num.value = App.format(key, v);
      range.style.setProperty('--a', pos(Math.min(at, v)));
      range.style.setProperty('--b', pos(Math.max(at, v)));
    };
    range.addEventListener('input', () => setParam(key, +range.value, true));
    range.addEventListener('change', commit);
    range.addEventListener('dblclick', () => { setParam(key, p.d); commit(); });
    const typed = () => {
      const v = parseFloat(num.value.replace('−', '-').replace(',', '.'));
      if (isFinite(v)) setParam(key, clamp(v, p.min, p.max));
      num.value = App.format(key, App.S[key]);
      commit();
    };
    num.addEventListener('change', typed);
    num.addEventListener('focus', () => num.select());
    num.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { num.blur(); }
      else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        const step = p.step * (ev.shiftKey ? 10 : 1) * (ev.key === 'ArrowUp' ? 1 : -1);
        setParam(key, clamp(+(App.S[key] + step).toFixed(6), p.min, p.max));
        num.value = App.format(key, App.S[key]);
      }
    });
    return row;
  }

  function toggle(key, text) {
    const box = el('input', { type: 'checkbox', id: 'c-' + key });
    widgets[key] = (v) => { box.checked = !!v; };
    box.addEventListener('change', () => setOption(key, box.checked));
    return el('label', { class: 'check' }, box, text);
  }

  function choice(key, text, options) {
    const sel = el('select', { id: 's-' + key });
    for (const [v, t] of options) sel.append(el('option', { value: v }, t));
    widgets[key] = (v) => { sel.value = String(v); };
    sel.addEventListener('change', () => {
      const raw = sel.value, p = App.PARAMS[key];
      if (p) { setParam(key, +raw); commit(); } else setOption(key, raw);
    });
    return el('div', { class: 'field' }, el('label', { for: 's-' + key }, text), sel);
  }

  function info(update) {
    const a = el('span'), b = el('span');
    derived.push(() => update(a, b));
    return el('div', { class: 'row derived' }, a, b);
  }
  const when = (node, test) => { conditions.push([node, test]); return node; };
  const note = (html) => el('p', { class: 'note', html });
  const sub = (text) => el('p', { class: 'sub' }, text);

  let openState = {};
  try { openState = JSON.parse(localStorage.getItem('lens.sections') || '{}'); } catch (e) { /* private mode */ }
  function section(id, title, open, kids) {
    const d = el('details', { class: 'sec', id: 'sec-' + id }, el('summary', { html: title }), el('div', { class: 'sec-body' }, ...kids));
    d.open = id in openState ? openState[id] : open;
    d.addEventListener('toggle', () => {
      openState[id] = d.open;
      try { localStorage.setItem('lens.sections', JSON.stringify(openState)); } catch (e) { /* ignore */ }
    });
    return d;
  }

  let presetId = 'cross', syncPreset = () => {};
  function buildControls() {
    const root = $('controls');

    // presets
    const sel = el('select', { id: 'preset', 'aria-label': 'Preset' });
    const custom = el('option', { value: '' }, 'A configuration from a link or file');
    custom.hidden = true;
    sel.append(custom);
    let group = null;
    for (const p of App.PRESETS) {
      if (p.group) { group = el('optgroup', { label: p.group }); sel.append(group); } else group.append(el('option', { value: p.id }, p.name));
    }
    const presetNote = el('p', { class: 'note', id: 'presetNote' });
    sel.addEventListener('change', () => loadPreset(sel.value));
    syncPreset = () => {
      const p = App.PRESETS.find((q) => q.id === presetId);
      sel.value = p ? presetId : '';
      presetNote.textContent = p ? p.note : 'Choose a preset to start again from a known configuration.';
    };
    root.append(section('preset', 'Start from', true, [sel, presetNote]));

    root.append(section('lens', 'Main lens <small>elliptical power law</small>', true, [
      slider('thetaE', 'Einstein radius <i>θ</i><sub>E</sub>', 'Einstein radius'),
      slider('gamma', 'Density slope <i>γ</i>', 'Density slope'),
      slider('e1', 'Ellipticity <i>e</i><sub>1</sub>', 'Ellipticity e1'),
      slider('e2', 'Ellipticity <i>e</i><sub>2</sub>', 'Ellipticity e2'),
      info((a, b) => { a.textContent = 'axis ratio, angle'; b.textContent = `${E.M.q.toFixed(2)} at ${(E.M.phi / P.DEG).toFixed(0).replace('-', '−')}°`; }),
      slider('cx', 'Centre <i>x</i>', 'Lens centre x'),
      slider('cy', 'Centre <i>y</i>', 'Lens centre y'),
    ]));

    root.append(section('env', 'Environment', true, [
      slider('gext', 'External shear <i>γ</i><sub>ext</sub>', 'External shear'),
      slider('phiExt', 'Shear angle', 'Shear angle'),
      slider('lambda', 'Mass sheet <i>λ</i>', 'Mass-sheet factor lambda'),
      info((a, b) => { a.textContent = 'external convergence 1 − λ'; b.textContent = (1 - App.S.lambda).toFixed(3).replace('-', '−'); }),
      note('κ → λκ + (1 − λ), with the source rescaled by λ. The images do not move; the delays and the inferred H<sub>0</sub> scale with λ.'),
    ]));

    root.append(section('perts', 'Perturbers', true, [
      el('div', { id: 'pertList' }),
      el('div', { class: 'btn-row' }, el('button', { class: 'btn', id: 'addPert' }, 'Add a perturber')),
      note('Singular isothermal spheres in the lens plane, such as satellites or nearby galaxies. Drag them in the image plane; shift-click there to add one.'),
    ]));

    const hostOnly = (n) => when(n, (s) => s.hostKind === 'sersic');
    const spiralOnly = (n) => when(n, (s) => s.hostKind === 'spiral');
    root.append(section('source', 'Source', true, [
      toggle('qsoOn', 'Quasar (point source)'),
      when(slider('qsoFlux', 'Quasar flux', 'Quasar flux'), (s) => s.qsoOn),
      toggle('hostOn', 'Host galaxy (extended)'),
      choice('hostKind', 'Shown as', [['sersic', 'Sérsic galaxy'], ['spiral', 'Spiral galaxy'], ['pattern', 'Test pattern'], ['image', 'Your own image…']]),
      slider('reff', 'Size <i>R</i><sub>eff</sub>', 'Effective radius'),
      hostOnly(slider('sersicN', 'Sérsic index <i>n</i>', 'Sersic index')),
      when(slider('qs', 'Axis ratio', 'Source axis ratio'), (s) => s.hostKind === 'sersic' || s.hostKind === 'spiral'),
      slider('pa', 'Position angle', 'Source position angle'),
      slider('ie', 'Surface brightness', 'Source surface brightness'),
      spiralOnly(slider('spArms', 'Spiral arms', 'Number of spiral arms')),
      spiralOnly(slider('spPitch', 'Pitch angle', 'Pitch angle of the arms')),
      spiralOnly(slider('spContrast', 'Arm contrast', 'Arm contrast')),
      spiralOnly(slider('spBulge', 'Bulge', 'Bulge brightness')),
      spiralOnly(slider('spClumps', 'Star-forming clumps', 'Star-forming clumps')),
      spiralOnly(el('div', { class: 'btn-row' }, el('button', { class: 'btn', id: 'respiral' }, 'Another galaxy'))),
      sub('Position'),
      slider('sx', '<i>β</i><sub>x</sub>', 'Source x'),
      slider('sy', '<i>β</i><sub>y</sub>', 'Source y'),
    ]));

    root.append(section('cosmo', 'Cosmology <small>flat ΛCDM</small>', false, [
      slider('H0', 'Hubble constant <i>H</i><sub>0</sub>', 'Hubble constant'),
      slider('Om', 'Matter density <i>Ω</i><sub>m</sub>', 'Matter density'),
      slider('zl', 'Lens redshift', 'Lens redshift'),
      slider('zs', 'Source redshift', 'Source redshift'),
      info((a, b) => { a.textContent = 'time-delay distance'; b.textContent = E.cosmo.ok ? E.cosmo.Ddt.toFixed(0) + ' Mpc' : 'source in front of lens'; }),
    ]));

    const timeSec = section('time', 'Variability and monitoring', true, [
      choice('lcType', 'The quasar varies as', [['drw', 'Damped random walk'], ['sine', 'Sinusoid'], ['transient', 'Single transient']]),
      slider('lcSigma', 'Amplitude', 'Variability amplitude'),
      when(slider('lcTau', 'Correlation time', 'Correlation time'), (s) => s.lcType === 'drw'),
      when(slider('lcPeriod', 'Period', 'Period'), (s) => s.lcType === 'sine'),
      slider('lcDur', 'Campaign length', 'Campaign length'),
      when(el('div', { class: 'btn-row' }, el('button', { class: 'btn', id: 'reseed' }, 'Another realisation')), (s) => s.lcType === 'drw'),
      sub('Monitoring campaign'),
      toggle('monOn', 'Observe the light curves'),
      when(slider('cadence', 'One visit every', 'Cadence'), (s) => s.monOn),
      when(slider('photNoise', 'Photometric error', 'Photometric error'), (s) => s.monOn),
      when(slider('season', 'Visible per year', 'Months visible per year'), (s) => s.monOn),
      toggle('microOn', 'Microlensing by stars in the lens'),
      when(slider('microAmp', 'Microlensing amplitude', 'Microlensing amplitude'), (s) => s.microOn),
    ]);
    root.append(when(timeSec, (s) => s.view === 'delays'));

    const teleOnly = (n) => when(n, (s) => s.inst !== 'ideal');
    root.append(section('tele', 'Telescope', false, [
      choice('inst', 'Observed with', Object.keys(App.INSTRUMENTS).map((k) => [k, App.INSTRUMENTS[k].label])),
      teleOnly(slider('fwhm', 'Point-spread function, FWHM', 'PSF width')),
      teleOnly(slider('pix', 'Pixel size', 'Pixel size')),
      teleOnly(slider('noise', 'Background noise', 'Background noise')),
      toggle('lensLight', 'Light of the lens galaxy'),
      when(slider('lensFlux', 'Lens brightness', 'Lens brightness'), (s) => s.lensLight),
    ]));

    root.append(section('display', 'Display', false, [
      el('div', { class: 'checks' },
        toggle('showCrit', 'Critical curves'), toggle('showTau', 'Arrival-time contours'),
        toggle('showMarkers', 'Image markers'), toggle('showGrid', 'Grid')),
      choice('map', 'Image plane shows', [['light', 'Light'], ['kappa', 'Convergence'], ['mu', 'Magnification'], ['tau', 'Arrival time'], ['resid', 'Residual against pinned']]),
      toggle('srcMap', 'Magnification map in the source plane'),
      choice('palette', 'Colours', [['composite', 'By component'], ['gray', 'Greyscale'], ['heat', 'Heat']]),
      slider('stretch', 'Exposure', 'Exposure'),
      choice('res', 'Ray-tracing grid', [['240', '240 × 240'], ['360', '360 × 360'], ['480', '480 × 480'], ['720', '720 × 720']]),
      choice('order', 'Label images by', [['bright', 'Brightness (A is brightest)'], ['arrival', 'Arrival (A is first)']]),
    ]));

    root.append(section('multipoles', 'Angular structure <small>multipoles</small>', false, [
      slider('a4', 'Octupole <i>a</i><sub>4</sub>', 'Multipole amplitude a4'),
      slider('phi4', 'Angle from the major axis', 'Multipole angle 4'),
      slider('a3', 'Sextupole <i>a</i><sub>3</sub>', 'Multipole amplitude a3'),
      slider('phi3', 'Angle from the major axis', 'Multipole angle 3'),
      note('Departures from an ellipse: κ<sub>m</sub> = a<sub>m</sub>/(2r) cos m(φ − φ<sub>m</sub>). With its angle at zero, positive a<sub>4</sub> is disky and negative is boxy. A per cent or two is typical, and enough to shift flux ratios and H<sub>0</sub>.'),
    ]));

    $('addPert').addEventListener('click', () => {
      const n = App.S.perts.length, a = 0.9 + 2.4 * n;
      addPert(1.6 * Math.cos(a), 1.6 * Math.sin(a));
    });
    $('reseed').addEventListener('click', () => { setParam('lcSeed', App.S.lcSeed % 9999 + 1); commit(); });
    $('respiral').addEventListener('click', () => { setParam('spSeed', App.S.spSeed % 9999 + 1); commit(); });
  }

  function buildPerts() {
    const S = App.S, list = $('pertList');
    list.textContent = '';
    S.perts.forEach((p, i) => {
      const on = el('input', { type: 'checkbox', 'aria-label': `G${i + 1} on` });
      on.checked = p.on !== false;
      const del = el('button', { class: 'pert-del', title: 'Remove', 'aria-label': `Remove G${i + 1}` }, '×');
      const range = el('input', { type: 'range', min: 0.005, max: 0.8, step: 0.005, 'aria-label': `G${i + 1} Einstein radius` });
      const val = el('span', { class: 'val' });
      const paint = () => {
        range.value = p.thetaE; val.textContent = p.thetaE.toFixed(3) + '″';
        range.style.setProperty('--a', '5.5px');
        range.style.setProperty('--b', `calc(${(p.thetaE - 0.005) / 0.795} * (100% - 11px) + 5.5px)`);
      };
      paint();
      const card = el('div', { class: 'pert' + (p.on === false ? ' off' : '') },
        el('div', { class: 'pert-head' }, on, el('b', null, 'G' + (i + 1)), el('span', { id: 'pertPos' + i }, pertPos(p)), del),
        el('div', { class: 'row' }, el('label', { html: 'Einstein radius' }), val, range));
      range.addEventListener('input', () => { p.thetaE = +range.value; paint(); quick(); App.invalidate('model'); });
      range.addEventListener('change', commit);
      on.addEventListener('change', () => { p.on = on.checked; card.classList.toggle('off', !p.on); App.invalidate('model'); commit(); });
      del.addEventListener('click', () => { S.perts.splice(i, 1); buildPerts(); App.invalidate('model'); commit(); });
      list.append(card);
    });
  }
  const pertPos = (p) => `at (${p.x.toFixed(2)}, ${p.y.toFixed(2)})″`.replace(/-/g, '−');

  function addPert(x, y) {
    if (App.S.perts.length >= 12) return -1;
    App.S.perts.push({ x: +x.toFixed(3), y: +y.toFixed(3), thetaE: 0.15, on: true });
    buildPerts(); App.invalidate('model'); commit();
    return App.S.perts.length - 1;
  }

  function loadPreset(id) {
    const preset = App.applyPreset(id);
    if (!preset) return;
    presetId = id;
    App.unpin();
    if (App.S.hostKind === 'image' && !App.tex.image) App.S.hostKind = 'sersic';
    syncUI(); layout();
    if (preset.pin) { E.quick = false; App.pin(); }
    App.invalidate('model');
    commit();
  }

  /* ---------------------------------------------------------------- plates: pointer interaction */

  App.hover = null;
  let drag = null;

  function skyAt(pl, ev) {
    const r = pl.overlay.getBoundingClientRect();
    return App.toSky(pl, (ev.clientX - r.left) * pl.size / r.width, (ev.clientY - r.top) * pl.size / r.height);
  }
  function moveSource(p) {
    const S = App.S, lim = App.PARAMS.sx.max;
    S.sx = clamp(+p.x.toFixed(4), -lim, lim); S.sy = clamp(+p.y.toFixed(4), -lim, lim);
    widgets.sx(S.sx); widgets.sy(S.sy);
    App.invalidate('model');
  }
  function hit(p) {
    const S = App.S, pl = App.plates.img, tol = 11 * (2 * pl.half()) / pl.size;
    for (let i = S.perts.length - 1; i >= 0; i--) if (Math.hypot(S.perts[i].x - p.x, S.perts[i].y - p.y) < tol) return { kind: 'pert', i };
    if (Math.hypot(S.cx - p.x, S.cy - p.y) < tol) return { kind: 'lens' };
    return null;
  }
  function endDrag() {
    if (!drag) return;
    drag = null;
    clearTimeout(quickTimer);
    if (E.quick) { E.quick = false; E.draft = false; App.invalidate('model'); }
    commit();
  }

  function bindPlates() {
    const src = App.plates.src, img = App.plates.img;

    src.overlay.addEventListener('pointerdown', (ev) => {
      if (ev.button) return;
      src.overlay.setPointerCapture(ev.pointerId);
      drag = { kind: 'source' }; App.hover = null;
      moveSource(skyAt(src, ev));
    });
    src.overlay.addEventListener('pointermove', (ev) => {
      const p = skyAt(src, ev);
      if (drag && drag.kind === 'source') moveSource(p);
      else if (!drag) { App.hover = { plane: 'src', x: p.x, y: p.y }; App.invalidate('hover'); }
    });

    img.overlay.addEventListener('pointerdown', (ev) => {
      if (ev.button) return;
      img.overlay.setPointerCapture(ev.pointerId);
      const p = skyAt(img, ev), h = hit(p);
      App.hover = null;
      if (h) drag = h;
      else if (ev.shiftKey) { const i = addPert(p.x, p.y); if (i >= 0) drag = { kind: 'pert', i }; }
      else { drag = { kind: 'image' }; moveSource(P.beta(E.M, p.x, p.y)); }
      img.overlay.style.cursor = drag && drag.kind !== 'image' ? 'grabbing' : 'crosshair';
    });
    img.overlay.addEventListener('pointermove', (ev) => {
      const S = App.S, p = skyAt(img, ev);
      if (!drag) {
        App.hover = { plane: 'img', x: p.x, y: p.y };
        img.overlay.style.cursor = hit(p) ? 'grab' : 'crosshair';
        App.invalidate('hover');
      } else if (drag.kind === 'image') moveSource(P.beta(E.M, p.x, p.y));
      else if (drag.kind === 'lens') {
        S.cx = clamp(+p.x.toFixed(3), -1, 1); S.cy = clamp(+p.y.toFixed(3), -1, 1);
        widgets.cx(S.cx); widgets.cy(S.cy);
        quick(); App.invalidate('model');
      } else if (drag.kind === 'pert') {
        const q = S.perts[drag.i];
        if (!q) return;
        q.x = +p.x.toFixed(3); q.y = +p.y.toFixed(3);
        const t = $('pertPos' + drag.i);
        if (t) t.textContent = pertPos(q);
        quick(); App.invalidate('model');
      }
    });
    img.overlay.addEventListener('dblclick', (ev) => {
      const h = hit(skyAt(img, ev));
      if (h && h.kind === 'pert') { App.S.perts.splice(h.i, 1); buildPerts(); App.invalidate('model'); commit(); }
    });

    for (const pl of [src, img]) {
      pl.overlay.addEventListener('pointerup', () => { endDrag(); pl.overlay.style.cursor = 'crosshair'; });
      pl.overlay.addEventListener('pointercancel', endDrag);
      pl.overlay.addEventListener('pointerleave', () => { if (!drag) { App.hover = null; App.invalidate('hover'); } });
      let acc = 0;
      pl.overlay.addEventListener('wheel', (ev) => {
        ev.preventDefault();
        acc += ev.deltaY;
        if (Math.abs(acc) < 50) return;
        zoom(pl === src ? 'src' : 'img', acc > 0 ? 1 : -1);
        acc = 0;
      }, { passive: false });
    }
    for (const b of document.querySelectorAll('[data-zoom]')) {
      b.addEventListener('click', () => { const [which, dir] = b.dataset.zoom.split('-'); zoom(which, dir === 'out' ? 1 : -1); commit(); });
    }

    // drop a picture on the image plane to lens it
    const box = $('plateImg'), hint = $('dropHint');
    const isFile = (ev) => ev.dataTransfer && Array.from(ev.dataTransfer.types || []).includes('Files');
    box.addEventListener('dragover', (ev) => { if (isFile(ev)) { ev.preventDefault(); hint.hidden = false; } });
    box.addEventListener('dragleave', () => { hint.hidden = true; });
    box.addEventListener('drop', (ev) => {
      if (!isFile(ev)) return;
      ev.preventDefault(); hint.hidden = true;
      useImageFile(ev.dataTransfer.files[0]);
    });
    $('fileImage').addEventListener('change', (ev) => { useImageFile(ev.target.files[0]); ev.target.value = ''; });
  }

  function useImageFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast('That is not an image file.'); return; }
    createImageBitmap(file).then((bmp) => {
      App.setImageTexture(bmp);
      const S = App.S;
      S.hostKind = 'image'; S.hostOn = true;
      if (S.reff < 0.2) S.reff = 0.25;
      syncUI(); App.invalidate('model'); commit();
    }, () => toast('That image could not be read.'));
  }

  function zoom(which, dir) {
    const key = which === 'src' ? 'halfSrc' : 'halfImg', steps = which === 'src' ? SRC_STEPS : IMG_STEPS;
    let i = steps.findIndex((v) => v >= App.S[key] - 1e-9);
    if (i < 0) i = steps.length - 1;
    const j = clamp(i + dir, 0, steps.length - 1);
    if (steps[j] === App.S[key]) return;
    App.S[key] = steps[j];
    App.invalidate('model');
  }

  function refreshHover() {
    const h = App.hover, S = App.S;
    if (!h) return;
    if (h.plane === 'img') h.local = P.local(E.M, h.x, h.y, S.sx, S.sy);
    else h.images = P.findImages(E.M, E.G, h.x, h.y);
  }

  const f3 = (v) => v.toFixed(3).replace('-', '−');
  function updateStatus() {
    const S = App.S, h = App.hover, src = $('srcStatus'), img = $('imgStatus');
    if (h && h.plane === 'src') {
      const n = h.images.length;
      src.textContent = `β = (${f3(h.x)}, ${f3(h.y)})″: a source here has ${n} image${n === 1 ? '' : 's'}`;
    } else src.textContent = `Source at β = (${f3(S.sx)}, ${f3(S.sy)})″. Drag to move it.`;
    if (h && h.plane === 'img' && h.local) {
      const q = h.local, first = E.images.length ? E.images[E.first].tau : NaN;
      let t = `θ = (${f3(h.x)}, ${f3(h.y)})″   κ ${q.kappa.toFixed(2)}   γ ${q.shear.toFixed(2)}   μ ${Math.abs(q.mu) > 999 ? (q.mu > 0 ? '> 999' : '< −999') : q.mu.toFixed(1).replace('-', '−')}`;
      if (E.cosmo.ok && isFinite(first)) { const d = (q.tau - first) * E.cosmo.tdScale; t += `   arrival ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} d`; }
      img.textContent = t;
    } else img.textContent = 'Drag to place an image. Hover for κ, γ, μ and the arrival time.';
  }

  function updateMeta() {
    const S = App.S;
    $('srcMeta').textContent = `${2 * S.halfSrc}″ across`;
    $('imgMeta').textContent = `${2 * S.halfImg}″ across` + (E.quick ? '' : `, ${E.G.N} px grid`);
  }

  /* ---------------------------------------------------------------- layout */

  function layout() {
    const stage = $('stage'), cs = getComputedStyle(stage);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const gap = parseFloat(cs.columnGap) || 0, chrome = 26 + 22;
    const top = document.querySelector('.top').offsetHeight;
    let size = Math.floor((stage.clientWidth - padX - gap) / 2);
    if (window.innerWidth > 1320) size = Math.min(size, Math.floor(stage.clientHeight - padY - chrome));
    else if (window.innerWidth > 900) size = Math.min(size, Math.floor(window.innerHeight - top - padY - chrome - 8));
    else size = Math.min(size, Math.floor(0.4 * window.innerHeight));
    size = clamp(size, 140, 820);
    document.documentElement.style.setProperty('--plate-size', size + 'px');
    App.resizePlates(size);
  }

  /* ---------------------------------------------------------------- workspace, playback */

  function setView(view) {
    if (App.S.view === view) return;
    App.S.view = view;
    if (view !== 'delays') stop();
    syncUI(); layout();
    App.invalidate('model');
    commit();
  }

  let lastTick = 0;
  function tick(ts) {
    if (!App.time.playing) return;
    const dt = lastTick ? Math.min(0.1, (ts - lastTick) / 1000) : 0;
    lastTick = ts;
    // the whole campaign in 24 seconds at normal speed
    App.time.t += dt * App.S.lcDur / 24 * App.time.speed;
    if (App.time.t > App.S.lcDur) App.time.t = 0;
    App.invalidate('time');
    requestAnimationFrame(tick);
  }
  function play() { App.time.playing = true; lastTick = 0; $('playBtn').textContent = 'Pause'; requestAnimationFrame(tick); }
  function stop() { App.time.playing = false; $('playBtn').textContent = 'Play'; }

  /* ---------------------------------------------------------------- exports */

  let toastTimer = 0;
  function toast(text) {
    const t = $('toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }
  function download(blob, name) {
    const a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function copy(text, done) {
    const ok = () => toast(done);
    const fallback = () => {
      const ta = el('textarea', { style: 'position:fixed;opacity:0' });
      ta.value = text; document.body.append(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast('Copying is blocked in this browser.'); }
      ta.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  }

  /* The image plane as observed, as a single-band FITS image (mean of the colour channels). */
  function fitsBlob() {
    const fr = E.frame, S = App.S;
    if (!fr) return null;
    const n = fr.n, pix = 2 * fr.half / n, cards = [];
    const card = (k, v, c) => {
      let s = k.padEnd(8) + '= ';
      if (typeof v === 'boolean') s += (v ? 'T' : 'F').padStart(20);
      else if (typeof v === 'number') s += String(v).padStart(20);
      else s += ("'" + String(v).padEnd(8) + "'").padEnd(20);
      if (c) s += ' / ' + c;
      cards.push(s.slice(0, 80).padEnd(80));
    };
    const comment = (t) => cards.push(('COMMENT ' + t).slice(0, 80).padEnd(80));
    card('SIMPLE', true, 'written by the strong lensing simulator');
    card('BITPIX', -32); card('NAXIS', 2); card('NAXIS1', n); card('NAXIS2', n);
    card('PIXSCALE', +pix.toFixed(6), 'arcsec per pixel');
    for (const a of [1, 2]) {
      card('CTYPE' + a, 'LINEAR'); card('CUNIT' + a, 'arcsec'); card('CRPIX' + a, (n + 1) / 2);
      card('CRVAL' + a, 0); card('CDELT' + a, +pix.toFixed(6));
    }
    card('BUNIT', 'arbitrary', 'surface brightness');
    card('INSTRUME', fr.instrument);
    if (fr.instrument !== 'ideal') { card('PSFFWHM', S.fwhm, 'arcsec, Gaussian'); card('SKYSIG', S.noise, 'background noise per pixel'); }
    card('ZLENS', S.zl); card('ZSOURCE', S.zs); card('H0', S.H0, 'km/s/Mpc');
    comment('Lens: EPL + shear + multipoles + SIS perturbers, lenstronomy conventions');
    comment(`theta_E=${S.thetaE} gamma=${S.gamma} e1=${S.e1} e2=${S.e2} center=(${S.cx},${S.cy})`);
    comment(`shear=${S.gext} at ${S.phiExt} deg, mass-sheet lambda=${S.lambda}`);
    comment(`a3=${S.a3} a4=${S.a4}; ${S.perts.filter((p) => p.on !== false).length} perturber(s)`);
    comment(`source at (${S.sx},${S.sy}), R_eff=${+S.reff.toFixed(4)}, n=${S.sersicN}`);
    cards.push('END'.padEnd(80));
    while (cards.length % 36) cards.push(''.padEnd(80));
    const head = new TextEncoder().encode(cards.join(''));
    const bytes = Math.ceil(n * n * 4 / 2880) * 2880, data = new DataView(new ArrayBuffer(bytes));
    for (let j = 0; j < n; j++) {
      const row = n - 1 - j;                       // FITS rows start at the bottom
      for (let i = 0; i < n; i++) {
        const k = 3 * (row * n + i);
        data.setFloat32(4 * (j * n + i), (fr.buf[k] + fr.buf[k + 1] + fr.buf[k + 2]) / 3, false);
      }
    }
    return new Blob([head, data.buffer], { type: 'application/fits' });
  }

  function pythonSnippet() {
    const S = App.S, M = E.M, l = S.lambda, r = (v) => +(+v).toFixed(6), sh = S.phiExt * P.DEG;
    const e = P.clampEllipticity(S.e1, S.e2);
    const names = ["'EPL'", "'SHEAR'"], kw = [];
    const d = (o) => '{' + Object.keys(o).map((k) => `'${k}': ${o[k]}`).join(', ') + '}';
    // a mass sheet lambda scales every component; for a power law that is a change of theta_E
    kw.push(d({ theta_E: r(S.thetaE * Math.pow(l, 1 / (S.gamma - 1))), gamma: r(S.gamma), e1: r(e.e1), e2: r(e.e2), center_x: r(S.cx), center_y: r(S.cy) }));
    kw.push(d({ gamma1: r(l * S.gext * Math.cos(2 * sh)), gamma2: r(l * S.gext * Math.sin(2 * sh)), ra_0: r(S.cx), dec_0: r(S.cy) }));
    for (const m of [3, 4]) {
      if (!S['a' + m]) continue;
      names.push("'MULTIPOLE'");
      kw.push(d({ m, a_m: r(l * S['a' + m]), phi_m: r(M.phi + S['phi' + m] * P.DEG), center_x: r(S.cx), center_y: r(S.cy) }));
    }
    for (const p of S.perts) {
      if (p.on === false || !(p.thetaE > 0)) continue;
      names.push("'SIS'");
      kw.push(d({ theta_E: r(l * p.thetaE), center_x: r(p.x), center_y: r(p.y) }));
    }
    if (l !== 1) { names.push("'CONVERGENCE'"); kw.push(d({ kappa: r(1 - l), ra_0: 0, dec_0: 0 })); }
    const ims = E.images;
    return [
      '# Lens model from the strong lensing simulator. Angles in arcsec, lenstronomy / herculens conventions.',
      '# Multipole and convergence keywords differ between versions of these packages: check yours.',
      `lens_model_list = [${names.join(', ')}]`,
      'kwargs_lens = [',
      ...kw.map((k) => '    ' + k + ','),
      ']',
      `kwargs_ps = [{'ra_source': ${r(S.sx)}, 'dec_source': ${r(S.sy)}}]   # point source in the source plane`,
      `z_lens, z_source = ${r(S.zl)}, ${r(S.zs)}`,
      `H0, Om0 = ${r(S.H0)}, ${r(S.Om)}   # flat LCDM`,
      '',
      '# For checking: what the simulator finds for this model',
      `x_image = [${ims.map((i) => r(i.x)).join(', ')}]`,
      `y_image = [${ims.map((i) => r(i.y)).join(', ')}]`,
      `magnification = [${ims.map((i) => r(i.mu)).join(', ')}]`,
      `arrival_time_days = [${ims.map((i) => r(i.dt)).join(', ')}]   # after the first image`,
      '',
    ].join('\n');
  }

  /* Read a saved configuration: the same validation as a link. */
  function loadJSON(text) {
    let o;
    try { o = JSON.parse(text); } catch (e) { toast('That file is not valid JSON.'); return; }
    if (!o || typeof o !== 'object') { toast('That file does not hold a configuration.'); return; }
    const parts = [];
    for (const k in o) {
      if (k === 'perts' && Array.isArray(o.perts)) parts.push('perts=' + o.perts.map((p) => [p.x, p.y, p.thetaE, p.on === false ? 0 : 1].join('_')).join('~'));
      else if (typeof o[k] === 'boolean') parts.push(k + '=' + (o[k] ? 1 : 0));
      else if (typeof o[k] === 'number' || typeof o[k] === 'string') parts.push(k + '=' + encodeURIComponent(o[k]));
    }
    App.S = App.decode(parts.join('&'));
    App.unpin();
    syncUI(); layout(); App.invalidate('model'); commit();
    toast('Configuration loaded.');
  }

  function doExport(kind) {
    if (kind === 'png-image' || kind === 'png-source') {
      const which = kind === 'png-image' ? 'img' : 'src';
      App.platePNG(which, (blob) => download(blob, which === 'img' ? 'lens-image-plane.png' : 'lens-source-plane.png'));
    } else if (kind === 'fits') {
      const blob = fitsBlob();
      if (blob) download(blob, 'lens-image.fits'); else toast('Set the image plane to show light first (Display).');
    } else if (kind === 'csv') {
      if (!E.images.length) { toast('There are no images to export.'); return; }
      download(new Blob([App.lightCurveCSV()], { type: 'text/csv' }), 'lens-light-curves.csv');
    } else if (kind === 'python') copy(pythonSnippet(), 'Lens model copied as Python.');
    else if (kind === 'json') download(new Blob([JSON.stringify(App.S, null, 2)], { type: 'application/json' }), 'lens-configuration.json');
    else if (kind === 'load') $('fileJSON').click();
  }

  /* ---------------------------------------------------------------- top bar, dock, keyboard */

  function bindChrome() {
    for (const b of document.querySelectorAll('.tabs button')) b.addEventListener('click', () => setView(b.dataset.view));
    $('undoBtn').addEventListener('click', () => travel(-1));
    $('redoBtn').addEventListener('click', () => travel(1));
    $('shareBtn').addEventListener('click', () => { commit(); copy(location.href, 'Link copied.'); });
    $('helpBtn').addEventListener('click', () => $('help').showModal());
    $('help').addEventListener('click', (ev) => { if (ev.target === $('help')) $('help').close(); });

    const theme = $('themeBtn'), root = document.documentElement;
    const label = () => { theme.textContent = root.dataset.theme === 'dark' ? 'Light' : 'Dark'; };
    label();
    theme.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('lens.theme', root.dataset.theme); } catch (e) { /* ignore */ }
      label(); App.invalidate('model');
    });

    const menu = $('exportMenu'), btn = $('exportBtn');
    const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (ev) => { ev.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); });
    menu.addEventListener('click', (ev) => { const k = ev.target.dataset.export; if (k) { close(); doExport(k); } });
    document.addEventListener('click', close);
    $('fileJSON').addEventListener('change', (ev) => {
      const f = ev.target.files[0];
      if (f) f.text().then(loadJSON);
      ev.target.value = '';
    });

    // pinned model
    $('pinBtn').addEventListener('click', () => { E.quick = false; App.pin(); App.invalidate('model'); });
    $('unpinBtn').addEventListener('click', () => { App.unpin(); widgets.map(App.S.map); App.invalidate('model'); });
    $('refitBtn').addEventListener('click', refit);

    // dock
    $('playBtn').addEventListener('click', () => (App.time.playing ? stop() : play()));
    $('lcSpeed').addEventListener('input', (ev) => { App.time.speed = +ev.target.value; });
    for (const b of document.querySelectorAll('.seg button')) b.addEventListener('click', () => { setOption('lcUnit', b.dataset.unit); syncUI(); });
    $('lcAlign').addEventListener('change', (ev) => setOption('lcAlign', ev.target.checked));
    $('measureBtn').addEventListener('click', () => {
      const S = App.S;
      if (!S.monOn) { S.monOn = true; widgets.monOn(true); applyConditions(); App.compute(); }
      $('measureBtn').textContent = 'Measuring…';
      setTimeout(() => {
        const ok = App.measure();
        $('measureBtn').textContent = 'Measure from the data';
        if (!ok) toast('Two images and a source behind the lens are needed.');
        App.invalidate('model'); commit();
      }, 30);
    });

    document.addEventListener('keydown', (ev) => {
      const tag = ev.target.tagName, typing = tag === 'INPUT' && ev.target.type !== 'range' && ev.target.type !== 'checkbox' || tag === 'SELECT' || tag === 'TEXTAREA';
      if (ev.key === 'Escape') close();
      if ($('help').open) return;
      const mod = ev.metaKey || ev.ctrlKey;
      if (mod && ev.key.toLowerCase() === 'z' && !typing) { ev.preventDefault(); travel(ev.shiftKey ? 1 : -1); return; }
      if (typing || mod || ev.altKey) return;
      const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
      if (arrows[ev.key] && tag !== 'INPUT') {
        ev.preventDefault();
        const s = ev.shiftKey ? 0.05 : 0.005, S = App.S;
        moveSource({ x: S.sx + s * arrows[ev.key][0], y: S.sy + s * arrows[ev.key][1] });
        clearTimeout(nudgeTimer); nudgeTimer = setTimeout(commit, 400);
      } else if (ev.key === ' ' && App.S.view === 'delays' && tag !== 'BUTTON' && tag !== 'INPUT' && tag !== 'SUMMARY') {
        ev.preventDefault();
        if (App.time.playing) stop(); else play();
      } else if (ev.key === '?') $('help').showModal();
    });
  }
  let nudgeTimer = 0;

  /* Refit the main lens to the pinned image positions. */
  function refit() {
    const ref = App.ref, S = App.S;
    if (!ref) return;
    const targets = ref.images.filter((im) => im.absMu >= 1).map((im) => ({ x: im.x, y: im.y }));
    if (targets.length < 2) { toast('The pinned model needs at least two bright images.'); return; }
    $('refitBtn').textContent = 'Fitting…';
    setTimeout(() => {
      const fit = P.fitToImages(App.lensOf(S), targets, { x: S.sx, y: S.sy }, { fitSlope: $('fitSlope').checked, half: S.halfImg });
      $('refitBtn').textContent = 'Refit to pinned images';
      if (!fit) { toast('The fit did not converge.'); return; }
      for (const k of ['thetaE', 'gamma', 'e1', 'e2', 'cx', 'cy', 'gext', 'phiExt']) S[k] = +fit.L[k].toFixed(5);
      S.sx = +fit.source.x.toFixed(5); S.sy = +fit.source.y.toFixed(5);
      syncUI(); App.invalidate('model'); commit();
      toast(fit.rms < 3e-3 ? 'Refit: the pinned positions are reproduced.' : `Refit: best match is ${(fit.rms * 1000).toFixed(0)} mas rms. This model cannot reach the pinned positions.`);
    }, 30);
  }

  /* ---------------------------------------------------------------- start */

  function boot() {
    const hash = location.hash.length > 1 ? location.hash : '';
    if (hash) { App.S = App.decode(hash); presetId = App.matchPreset(App.S); } else App.applyPreset('cross');
    buildControls();
    bindChrome();
    bindPlates();
    App.initChart();
    syncUI();
    layout();
    commit();
    App.invalidate('model');
    window.addEventListener('resize', () => { layout(); App.invalidate('model'); });
    if (window.ResizeObserver) new ResizeObserver(() => { layout(); App.invalidate('hover'); }).observe($('stage'));
    // canvas text and the test pattern use the web font once it has arrived
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { App.tex.pattern = null; App.tex.version++; App.invalidate('model'); });
  }
  boot();
})();
