// The expanding universe on the research page. Galaxies sit at fixed comoving positions; proper
// distances are the scale factor a times the comoving ones, so from every galaxy the others recede
// with v = H0 d (Hubble's law). Scrolling through the figure grows a; the pointer (or a tap) picks the
// galaxy we watch from. A Hubble diagram plots v against d for the same galaxies.
import { clamp, seg, LIGHT, motion } from './mono.js?v=4';

const HALF_WIDTH_MPC = 200;          // comoving half-width of the field
const PLANCK = 67.4, SHOES = 73.0;   // km/s/Mpc: Planck 2018; SH0ES (Riess et al. 2022)
const GYR = 977.79;                  // 1/H0 in Gyr for H0 in km/s/Mpc
const ink = alpha => `rgba(${LIGHT}, ${alpha})`;
const root = document.documentElement;
const german = () => root.lang === 'de';
// Number formatters are cached: creating one per call (toLocaleString) is slow in an animation loop.
const formats = new Map();
const number = (value, digits = 0) => {
  const key = `${german() ? 'de' : 'en'}${digits}`;
  if (!formats.has(key)) formats.set(key, new Intl.NumberFormat(german() ? 'de-CH' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  return formats.get(key).format(value);
};

// A deterministic random field, so the picture is the same on every visit.
function random(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; }; }
function makeGalaxies(count) {
  const rnd = random(20260927), galaxies = [];
  for (let tries = 0; galaxies.length < count && tries < count * 40; tries++) {
    const x = rnd() * 2.6 - 1.3, y = rnd() * 2.6 - 1.3;
    if (galaxies.some(g => Math.hypot(g.x - x, g.y - y) < .085)) continue;
    const big = rnd() < .12;
    galaxies.push({
      x, y, size: big ? 2.4 + rnd() * 1.6 : .8 + rnd() * 1.4, shape: .35 + rnd() * .65, angle: rnd() * Math.PI,
      brightness: .45 + rnd() * .55, phase: rnd(), peculiar: (rnd() + rnd() + rnd() - 1.5) * 380
    });
  }
  return galaxies;
}

export function initExpansion(figure) {
  const stage = figure.querySelector('.expansion-canvas'), chart = figure.querySelector('.hubble-canvas');
  const slider = figure.querySelector('#h0'), output = figure.querySelector('#h0-value'), readout = figure.querySelector('#h0-readout');
  const presets = [...figure.querySelectorAll('[data-h0]')];
  const galaxies = makeGalaxies(230);
  // Start from the galaxy nearest the centre.
  let reference = galaxies.reduce((best, g, i) => Math.hypot(g.x, g.y) < Math.hypot(galaxies[best].x, galaxies[best].y) ? i : best, 0);
  const camera = { x: galaxies[reference].x, y: galaxies[reference].y };
  let h0 = Number(slider.value), shownH0 = h0, visible = false, frame = 0, last = 0, clock = 0, dpr = 1, chartKey = '';

  // Canvas sizes are measured when they change (ResizeObserver), not on every frame.
  const sizes = new Map();
  const measure = canvas => sizes.set(canvas, [canvas.clientWidth, canvas.clientHeight]);
  const sized = canvas => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    if (!sizes.has(canvas)) measure(canvas);
    const [w, h] = sizes.get(canvas);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const context = canvas.getContext('2d');
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, w, h);
    return { context, w, h };
  };

  // Scale factor from the scroll position: the universe grows as the figure moves up the screen.
  function scaleFactor() {
    const rect = figure.getBoundingClientRect(), progress = seg(rect.top + rect.height / 2, innerHeight * 1.1, -innerHeight * .1);
    return Math.exp((shownH0 / 70) * .42 * (progress - .5) * 2);
  }

  function drawStage(a) {
    const { context: c, w, h } = sized(stage);
    const pixelsPerUnit = Math.min(w, h) / 2 / .9, cx = w / 2, cy = h / 2;
    const toScreen = g => [cx + (g.x - camera.x) * a * pixelsPerUnit, cy + (g.y - camera.y) * a * pixelsPerUnit];
    const ref = galaxies[reference], [rx, ry] = toScreen(ref);
    const mpc = pixelsPerUnit * a / HALF_WIDTH_MPC;            // screen px per proper Mpc
    // Distance rings around the galaxy we watch from.
    c.lineWidth = 1;
    for (const d of [50, 100, 150, 200]) {
      c.strokeStyle = ink(d === 100 ? .28 : .12);
      c.setLineDash(d === 100 ? [] : [3, 5]);
      c.beginPath(); c.arc(rx, ry, d * mpc, 0, Math.PI * 2); c.stroke();
    }
    c.setLineDash([]);
    c.fillStyle = ink(.62); c.font = `500 11px "Mona Sans", system-ui, sans-serif`; c.textAlign = 'left';
    const label = `100 Mpc  ·  ${number(shownH0 * 100)} km/s`;
    const labelX = Math.min(rx + 100 * mpc * Math.cos(-.62) + 6, w - c.measureText(label).width - 10);
    c.fillText(label, labelX, Math.max(18, ry + 100 * mpc * Math.sin(-.62) - 6));
    // Velocity arrows, proportional to distance, with pulses running outward along them. Shapes are
    // collected into one path per brightness level (a few dozen draw calls instead of about 1,100).
    const LEVELS = 10, bucket = alpha => Math.max(0, Math.min(LEVELS - 1, Math.round(alpha * (LEVELS - 1))));
    const lines = Array.from({ length: LEVELS }, () => new Path2D()), heads = Array.from({ length: LEVELS }, () => new Path2D());
    const pulses = Array.from({ length: LEVELS }, () => new Path2D());
    const arrowScale = .2 * shownH0 / 70, pulseSpeed = .35 + .35 * shownH0 / 70;
    for (let i = 0; i < galaxies.length; i++) {
      if (i === reference) continue;
      const g = galaxies[i], [x, y] = toScreen(g), dx = x - rx, dy = y - ry, dist = Math.hypot(dx, dy);
      if (x < -40 || y < -40 || x > w + 40 || y > h + 40 || dist < 1) continue;
      const ux = dx / dist, uy = dy / dist, length = Math.min(dist * arrowScale, 90), fade = clamp(1.25 - dist / (Math.min(w, h) * .75), .15, 1);
      const level = bucket(fade), ex = x + ux * length, ey = y + uy * length;
      lines[level].moveTo(x, y); lines[level].lineTo(ex, ey);
      heads[level].moveTo(ex, ey);
      heads[level].lineTo(x + ux * (length - 4) - uy * 2.4, y + uy * (length - 4) + ux * 2.4);
      heads[level].lineTo(x + ux * (length - 4) + uy * 2.4, y + uy * (length - 4) - ux * 2.4);
      heads[level].closePath();
      if (!motion.reduced) {
        const t = (clock * pulseSpeed + g.phase) % 1, px = x + ux * length * t, py = y + uy * length * t;
        const pulse = pulses[bucket(fade * Math.sin(Math.PI * t))];
        pulse.moveTo(px + 1.3, py); pulse.arc(px, py, 1.3, 0, Math.PI * 2);
      }
    }
    c.lineWidth = 1;
    for (let k = 0; k < LEVELS; k++) {
      const alpha = k / (LEVELS - 1);
      c.strokeStyle = ink(.22 * alpha); c.stroke(lines[k]);
      c.fillStyle = ink(.3 * alpha); c.fill(heads[k]);
      if (k) { c.fillStyle = ink(.55 * alpha); c.fill(pulses[k]); }
    }
    // Galaxies: small ellipses, the brighter ones with a faint halo (also one path per level).
    const cores = Array.from({ length: LEVELS }, () => new Path2D()), halos = Array.from({ length: LEVELS }, () => new Path2D());
    const growth = clamp(Math.sqrt(a), .8, 1.25);
    for (let i = 0; i < galaxies.length; i++) {
      const g = galaxies[i], [x, y] = toScreen(g);
      if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
      const size = g.size * growth, level = bucket(g.brightness);
      if (g.size > 2.4) { halos[level].moveTo(x + size * 3 * Math.cos(g.angle), y + size * 3 * Math.sin(g.angle)); halos[level].ellipse(x, y, size * 3, size * 3 * g.shape, g.angle, 0, Math.PI * 2); }
      cores[level].moveTo(x + size * Math.cos(g.angle), y + size * Math.sin(g.angle));
      cores[level].ellipse(x, y, size, size * g.shape, g.angle, 0, Math.PI * 2);
    }
    for (let k = 0; k < LEVELS; k++) {
      const alpha = k / (LEVELS - 1);
      c.fillStyle = ink(.08 * alpha); c.fill(halos[k]);
      c.fillStyle = ink(alpha); c.fill(cores[k]);
    }
    // The galaxy we watch from.
    c.strokeStyle = ink(.9); c.lineWidth = 1.2;
    c.beginPath(); c.arc(rx, ry, 9, 0, Math.PI * 2); c.stroke();
    for (const [sx, sy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.moveTo(rx + sx * 13, ry + sy * 13); c.lineTo(rx + sx * 19, ry + sy * 19); c.stroke(); }
    c.fillStyle = ink(.85); c.font = `600 11px "Mona Sans", system-ui, sans-serif`;
    c.fillText(german() ? 'Von hier aus' : 'Seen from here', rx + 16, ry + 26);
  }

  function drawChart(a) {
    const { context: c, w, h } = sized(chart);
    const plot = { left: 50, right: w - 14, top: 16, bottom: h - 40 }, dMax = 300, vMax = 26000;
    const px = d => plot.left + d / dMax * (plot.right - plot.left), py = v => plot.bottom - v / vMax * (plot.bottom - plot.top);
    c.font = `500 11px "Mona Sans", system-ui, sans-serif`; c.lineWidth = 1;
    c.strokeStyle = ink(.14); c.fillStyle = ink(.55);
    for (const v of [0, 10000, 20000]) { c.beginPath(); c.moveTo(plot.left, py(v)); c.lineTo(plot.right, py(v)); c.stroke(); c.textAlign = 'right'; c.fillText(v ? number(v / 1000) + 'k' : '0', plot.left - 8, py(v) + 4); }
    for (const d of [0, 100, 200, 300]) { c.textAlign = 'center'; c.fillText(String(d), px(d), plot.bottom + 17); }
    c.textAlign = 'center'; c.fillText(german() ? 'Entfernung (Mpc)' : 'Distance (Mpc)', (plot.left + plot.right) / 2, h - 5);
    c.save(); c.translate(12, (plot.top + plot.bottom) / 2); c.rotate(-Math.PI / 2); c.fillText(german() ? 'Geschwindigkeit (km/s)' : 'Velocity (km/s)', 0, 0); c.restore();
    // Reference lines: the early-universe and local measurements.
    const references = [[PLANCK, [5, 4], 'Planck'], [SHOES, [1.5, 3.5], 'SH0ES']];
    for (const [value, dash] of references) {
      c.strokeStyle = ink(.4); c.setLineDash(dash);
      c.beginPath(); c.moveTo(px(0), py(0)); c.lineTo(px(dMax), py(value * dMax)); c.stroke();
    }
    c.setLineDash([]);
    // Legend, top left, clear of the data.
    const legend = [[[], .95, 1.6, `H₀ = ${number(shownH0, 1)}`], ...references.map(([value, dash, name]) => [dash, .5, 1, `${name} ${number(value, 1)}`])];
    legend.forEach(([dash, alpha, width, text], k) => {
      const y = plot.top + 8 + k * 17;
      c.strokeStyle = ink(alpha); c.lineWidth = width; c.setLineDash(dash);
      c.beginPath(); c.moveTo(plot.left + 10, y); c.lineTo(plot.left + 34, y); c.stroke();
      c.setLineDash([]); c.fillStyle = ink(alpha === .95 ? .9 : .6); c.textAlign = 'left';
      c.fillText(text, plot.left + 42, y + 4);
    });
    c.lineWidth = 1;
    // The galaxies: proper distance from the reference galaxy and their velocity (with a little
    // peculiar motion), on the line v = H0 d.
    const ref = galaxies[reference];
    for (let i = 0; i < galaxies.length; i++) {
      if (i === reference) continue;
      const g = galaxies[i], d = Math.hypot(g.x - ref.x, g.y - ref.y) * a * HALF_WIDTH_MPC;
      if (d > dMax) continue;
      const v = shownH0 * d + g.peculiar;
      c.fillStyle = ink(.75); c.beginPath(); c.arc(px(d), py(Math.max(0, v)), 1.8, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = ink(.95); c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(px(0), py(0)); c.lineTo(px(dMax), py(Math.min(vMax, shownH0 * dMax))); c.stroke();
  }

  function describe() {
    output.textContent = `${number(h0, 1)} km/s/Mpc`;
    const age = number(GYR / h0, 1);
    readout.textContent = german()
      ? `Eine Galaxie in 100 Mpc Entfernung entfernt sich mit ${number(h0 * 100)} km/s. Die Hubble-Zeit 1/H₀ beträgt ${age} Milliarden Jahre.`
      : `A galaxy 100 Mpc away recedes at ${number(h0 * 100)} km/s. The Hubble time 1/H₀ is ${age} billion years.`;
    for (const button of presets) button.setAttribute('aria-pressed', String(Math.abs(Number(button.dataset.h0) - h0) < .05));
  }

  function draw(now) {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now; clock += dt;
    const follow = motion.reduced ? 1 : 1 - Math.exp(-dt * 5);
    const target = galaxies[reference];
    camera.x += (target.x - camera.x) * follow; camera.y += (target.y - camera.y) * follow;
    shownH0 += (h0 - shownH0) * (motion.reduced ? 1 : 1 - Math.exp(-dt * 8));
    const a = scaleFactor();
    drawStage(a);
    const key = `${a.toFixed(4)}|${shownH0.toFixed(2)}|${reference}|${root.lang}`;
    if (key !== chartKey) { chartKey = key; drawChart(a); }
    const settling = Math.abs(target.x - camera.x) + Math.abs(target.y - camera.y) > 1e-4 || Math.abs(h0 - shownH0) > .01;
    if (visible && !document.hidden && (!motion.reduced || settling)) frame = requestAnimationFrame(draw);
    else last = 0;
  }
  const request = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw); };

  // Pointer or tap: watch from the galaxy nearest to it.
  function pick(event) {
    const rect = stage.getBoundingClientRect(), a = scaleFactor(), pixelsPerUnit = Math.min(rect.width, rect.height) / 2 / .9;
    const x = camera.x + (event.clientX - rect.left - rect.width / 2) / (a * pixelsPerUnit);
    const y = camera.y + (event.clientY - rect.top - rect.height / 2) / (a * pixelsPerUnit);
    let best = reference, bestDistance = Infinity;
    galaxies.forEach((g, i) => { const d = Math.hypot(g.x - x, g.y - y); if (d < bestDistance) { best = i; bestDistance = d; } });
    if (best !== reference && bestDistance * a * pixelsPerUnit < 40) { reference = best; request(); }
  }
  stage.addEventListener('pointermove', event => { if (event.pointerType === 'mouse') pick(event); });
  stage.addEventListener('pointerdown', pick);

  slider.addEventListener('input', () => { h0 = Number(slider.value); describe(); request(); });
  for (const button of presets) button.addEventListener('click', () => { h0 = Number(button.dataset.h0); slider.value = String(h0); describe(); request(); });
  new MutationObserver(() => { describe(); request(); }).observe(root, { attributes: true, attributeFilter: ['lang'] });
  addEventListener('scroll', request, { passive: true });
  const resized = new ResizeObserver(entries => { for (const entry of entries) measure(entry.target); chartKey = ''; request(); });
  resized.observe(stage); resized.observe(chart);
  document.addEventListener('visibilitychange', request);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) request(); }, { rootMargin: '100px' }).observe(figure);
  describe();
}
