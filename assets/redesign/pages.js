// Research and cello pages. Shared with the home page (mono.js): the top bar, titles whose letters
// flip in, the name cut out of the page and the WebGL lens. Here they drive:
// - research: a hero where the pointer moves a source behind a lens; scrolling aligns it into an
//   Einstein ring, which opens into the page;
// - cello: CELLO cut out of the page over the concert photograph, zoomed through on scroll;
// - both: titles flip in and blocks rise as they scroll into view, pictures tilt towards the
//   pointer, and the lines between concerts ring like plucked strings.
import { clamp, seg, mix, ease, easeOut, LIGHT, DARK, motion, viewport, pagePad, initBar, splitTitles, flipIn, createCover, createLensLayer, drawPortal } from './mono.js?v=4';

const root = document.documentElement;
let vw = innerWidth, vh = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
const pointer = { x: vw / 2, y: vh / 2, active: false };

initBar();
splitTitles(() => { fitTitles(); tracked.forEach(item => { if (item.title) item.value = -1; }); refresh(true); });

// Big titles shrink until their longest word fits (German words can be long).
function fitTitles() {
  for (const title of document.querySelectorAll('.hero-title, .block-title')) {
    title.style.fontSize = '';
    const widest = Math.max(0, ...[...title.querySelectorAll('.word')].map(word => word.offsetWidth));
    if (widest > title.clientWidth) title.style.fontSize = `${parseFloat(getComputedStyle(title).fontSize) * title.clientWidth / widest * .98}px`;
  }
}
fitTitles();
document.fonts?.ready.then(fitTitles);
addEventListener('resize', fitTitles);

/* ---------- Titles and blocks as they scroll into view ---------- */

// The teaching page's title flips in when the page loads; the others as they scroll into view.
const introTitle = document.querySelector('.teach-hero [data-split]');
const titles = [...document.querySelectorAll('.block [data-split]')].filter(title => title !== introTitle);
const risers = [...document.querySelectorAll([
  '.current-project', '.publication-feature', '.study-project', '.lensing-intro>p', '.lensing-applet', '.quasar-simulator',
  '.cosmography-explanation', '.concert-list>.event-row', '.concert-archive', '.biography-grid figure', '.biography-prose',
  '.biography-grid .text-link', '.performance', '.audio-recording', '.press-photo', '.teach-lead', '.choice', '.book-figure', '.book-copy>p'
].join(','))];
const book = document.querySelector('.book-figure .book3d-body');
risers.forEach(element => element.setAttribute('data-rise', ''));

// Only elements near the screen are measured while scrolling (an IntersectionObserver keeps that set);
// the rest keep their final state. Each frame first reads every position, then writes only the
// values that changed, so the browser never recalculates styles in between.
const tracked = new Map([...titles.map(el => [el, { el, title: true, value: -1 }]), ...risers.map(el => [el, { el, title: false, value: -1 }])]);
const near = new Set();

function apply(item, value) {
  if (Math.abs(value - item.value) < .001) return;
  item.value = value;
  if (item.title) { flipIn(item.el, value); return; }
  item.el.style.setProperty('--in', value.toFixed(3));
  // Not clickable while (nearly) invisible.
  item.el.style.pointerEvents = value < .5 ? 'none' : '';
}
const target = (item, top) => item.title ? seg(top, vh * .94, vh * .58) : motion.reduced ? 1 : easeOut(seg(top, vh * 1.02, vh * .78));

function refresh(all = false) {
  const items = all ? [...tracked.values()] : [...near];
  const tops = items.map(item => item.el.getBoundingClientRect().top);
  const bookTop = book && !motion.reduced ? book.getBoundingClientRect() : null;
  items.forEach((item, k) => apply(item, target(item, tops[k])));
  // The book turns towards the reader as it scrolls up the screen.
  if (bookTop) book.style.setProperty('--turn', mix(-38, 14, seg(bookTop.top, vh, -bookTop.height * .4)).toFixed(2));
}
const watcher = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const item = tracked.get(entry.target);
    if (entry.isIntersecting) near.add(item);
    else { near.delete(item); apply(item, target(item, entry.boundingClientRect.top)); }
  }
  queueRefresh();
}, { rootMargin: '30% 0px 30% 0px' });
tracked.forEach((_, el) => watcher.observe(el));

let refreshQueued = false;
const queueRefresh = () => { if (!refreshQueued) { refreshQueued = true; requestAnimationFrame(() => { refreshQueued = false; refresh(); }); } };
addEventListener('scroll', queueRefresh, { passive: true });
addEventListener('resize', () => { vw = innerWidth; vh = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2); refresh(true); });
document.fonts?.ready.then(() => refresh(true));
refresh(true);

// Scroll progress through a sticky hero: 0 at the top, 1 when it lets go. As on the home page, the
// scroll only sets a target and the progress eases towards it every frame, so the animation glides
// between the steps of a mouse wheel instead of jumping with them. The hero is measured on resize
// only, so a frame reads no layout.
function heroTimeline(section) {
  let top = 0, height = 0, value = null;
  const timeline = {
    measure() { top = section.getBoundingClientRect().top + scrollY; height = section.offsetHeight; },
    get target() { return clamp((scrollY - top) / Math.max(1, height - vh)); },
    get visible() { return scrollY < top + height; },
    get settled() { return value === timeline.target; },
    // Advance by dt seconds and return the eased progress (off screen it jumps to the target).
    step(dt) {
      const target = timeline.target;
      value = value === null || motion.reduced || !timeline.visible ? target : value + (target - value) * (1 - Math.exp(-dt * 7.5));
      if (Math.abs(target - value) < 1e-4) value = target;
      return value;
    }
  };
  timeline.measure();
  return timeline;
}
function whileVisible(element, start) {
  new IntersectionObserver(entries => { if (entries[0].isIntersecting) start(); }).observe(element);
}

/* ---------- Pointer ---------- */

addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true;
}, { passive: true });
document.documentElement.addEventListener('mouseleave', () => { pointer.active = false; });

// Pictures tilt towards the pointer.
const tilting = [['.publication-preview', '.publication-paper'], ['.biography-grid figure', 'img'], ['.press-photo', '.press-photo-frame'], ['.choice', null], ['.book-figure', '.book3d-body']];
for (const [selector, inner] of tilting) for (const element of document.querySelectorAll(selector)) {
  const host = inner ? element.querySelector(inner) : element;
  element.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || motion.reduced) return;
    const rect = element.getBoundingClientRect();
    host.style.setProperty('--tx', ((event.clientX - rect.left) / rect.width * 2 - 1).toFixed(3));
    host.style.setProperty('--ty', ((event.clientY - rect.top) / rect.height * 2 - 1).toFixed(3));
  });
  element.addEventListener('pointerleave', () => { host.style.removeProperty('--tx'); host.style.removeProperty('--ty'); });
}

if (introTitle) {
  const start = performance.now();
  const step = now => {
    const t = motion.reduced ? 1 : clamp((now - start) / 1300);
    flipIn(introTitle, easeOut(t));
    if (t < 1) requestAnimationFrame(step);
  };
  flipIn(introTitle, 0);
  requestAnimationFrame(step);
}

/* ---------- Recordings load only when played ---------- */

function preconnect(origin) {
  if (document.querySelector(`link[rel=preconnect][href="${origin}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preconnect'; link.href = origin;
  document.head.append(link);
}
function play(button, src, title) {
  const frame = document.createElement('iframe');
  frame.src = src; frame.title = title;
  frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.allowFullscreen = true;
  if (button.matches('.audio-facade')) { frame.scrolling = 'no'; frame.style.cssText = 'display:block;width:100%;height:166px;border:0'; }
  button.replaceWith(frame);
  frame.focus();
}
for (const button of document.querySelectorAll('[data-youtube]')) {
  // Sharpest thumbnail first (1280 px); not every video has one, so fall back to smaller ones.
  const thumbnail = button.querySelector('img'), id = button.dataset.youtube;
  const fallbacks = [`https://i.ytimg.com/vi/${id}/sddefault.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`];
  thumbnail.addEventListener('error', () => { if (fallbacks.length) thumbnail.src = fallbacks.shift(); });
  // Warm up the connection as soon as the pointer comes close, so the player starts quickly.
  button.addEventListener('pointerenter', () => { preconnect('https://www.youtube-nocookie.com'); preconnect('https://i.ytimg.com'); }, { once: true });
  button.addEventListener('click', () => play(button, `https://www.youtube-nocookie.com/embed/${button.dataset.youtube}?autoplay=1&rel=0`, button.dataset.title));
}
for (const button of document.querySelectorAll('[data-soundcloud]')) {
  button.addEventListener('pointerenter', () => preconnect('https://w.soundcloud.com'), { once: true });
  button.addEventListener('click', () => play(button, button.dataset.soundcloud, button.dataset.title));
}

/* ---------- Concert rows: the line under each one is a string ---------- */

const SVG = 'http://www.w3.org/2000/svg';
for (const row of document.querySelectorAll('.event-row')) {
  const svg = document.createElementNS(SVG, 'svg'), path = document.createElementNS(SVG, 'path');
  svg.setAttribute('class', 'event-string'); svg.setAttribute('viewBox', '0 0 1000 24'); svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  path.setAttribute('d', 'M0 12 L1000 12'); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1'); path.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.append(path); row.append(svg);
  let frame = 0, started = 0, amplitude = 0, position = .5;
  const ring = now => {
    const t = (now - started) / 1000, decay = Math.exp(-t * 3.2), displacement = amplitude * decay * Math.cos(t * 2 * Math.PI * 7);
    path.setAttribute('d', `M0 12 Q${(position * 1000).toFixed(0)} ${(12 + 2 * displacement).toFixed(2)} 1000 12`);
    frame = decay > .02 ? requestAnimationFrame(ring) : 0;
    if (!frame) path.setAttribute('d', 'M0 12 L1000 12');
  };
  // Crossing the line (leaving the row downwards, or entering it from below) plucks it.
  const pluck = (event, direction) => {
    if (motion.reduced || event.pointerType !== 'mouse') return;
    const rect = row.getBoundingClientRect();
    position = clamp((event.clientX - rect.left) / rect.width, .06, .94);
    amplitude = 7 * direction; started = performance.now();
    if (!frame) frame = requestAnimationFrame(ring);
  };
  row.addEventListener('pointerleave', event => { if (event.clientY >= row.getBoundingClientRect().bottom - 2) pluck(event, 1); });
  row.addEventListener('pointerenter', event => { if (event.clientY >= row.getBoundingClientRect().bottom - 8) pluck(event, -1); });
}

/* ---------- Research hero: a source behind a lens ---------- */

const lensHero = document.querySelector('.hero-lens');
if (lensHero) {
  const lensCanvas = lensHero.querySelector('.hero-lens-canvas'), ringCanvas = lensHero.querySelector('.hero-ring-canvas');
  const lens = createLensLayer(lensCanvas), rings = ringCanvas.getContext('2d');
  const title = lensHero.querySelector('.hero-title'), fades = [...lensHero.querySelectorAll('.hero-text, .hero-links, .hero-hint')];
  const pin = lensHero.querySelector('.pin'), loadedAt = performance.now();
  let running = false, last = 0, clock = 0, source = [0, 0], ringsDrawn = true, lensDrawn = true;
  // Sizes are measured on resize only, not every frame. The canvases reach under the phone's
  // toolbars; the lens is placed in the part of the screen that stays visible (H).
  let W = 0, H = 0, fullHeight = 0;
  const timeline = heroTimeline(lensHero);
  function measureHero() {
    W = lensCanvas.clientWidth; H = viewport().height; fullHeight = ringCanvas.clientHeight;
    timeline.measure();
    lens?.resize(dpr);
    const width = Math.round(W * dpr), height = Math.round(fullHeight * dpr);
    if (ringCanvas.width !== width || ringCanvas.height !== height) { ringCanvas.width = width; ringCanvas.height = height; ringsDrawn = true; }
  }
  measureHero();
  // Style writes are skipped when the value has not changed.
  const written = new Map();
  const write = (element, property, value) => {
    const values = written.get(element) || new Map();
    if (values.get(property) === value) return;
    values.set(property, value); written.set(element, values);
    element.style[property] = value;
  };
  const run = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60; last = now; clock += dt;
    const p = timeline.step(dt), visible = timeline.visible;
    const narrow = W <= 760 || W <= H;
    const center = narrow ? [W * .5, H * .32] : [W * .7, H * .42];
    const radius = narrow ? Math.min(W * .27, H * .15) : Math.min(W * .15, H * .24);
    // Where the source wants to be: under the pointer (hovering over the lens lines it up), or
    // slowly orbiting when there is no pointer. Scrolling brings it behind the lens.
    const free = pointer.active && !motion.reduced
      ? [(pointer.x - center[0]) * .55, (pointer.y - center[1]) * .55]
      : motion.reduced ? [radius * .42, radius * .18] : [Math.cos(clock * .32) * radius * .5, Math.sin(clock * .41) * radius * .38];
    const length = Math.hypot(...free), limit = radius * 2.2;
    if (length > limit) { free[0] *= limit / length; free[1] *= limit / length; }
    const align = ease(seg(p, .08, .46)), target = free.map(value => value * (1 - align));
    const follow = motion.reduced ? 1 : 1 - Math.exp(-dt * 6);
    source = source.map((value, i) => value + (target[i] - value) * follow);
    const lensOpacity = 1 - seg(p, .52, .6);
    // Draw while shown, plus once more at zero to clear the canvas.
    if (visible && (lensOpacity > 0 || lensDrawn)) {
      lens?.draw({ center, thetaE: radius, source, shear: .13 * (1 - seg(p, .3, .5)), radius: radius * mix(.08, .02, seg(p, .38, .54)), opacity: lensOpacity });
      lensDrawn = lensOpacity > 0;
    }
    // The ring takes over, then opens into a light disc that fills the screen.
    const portal = seg(p, .62, .9), ringAlpha = seg(p, .5, .58) * (1 - seg(p, .9, .97));
    if (ringAlpha > 0 || (portal > 0 && portal < 1) || ringsDrawn) {
      rings.setTransform(dpr, 0, 0, dpr, 0, 0); rings.clearRect(0, 0, W, fullHeight);
      const disc = drawPortal(rings, center, portal, W, fullHeight);
      if (ringAlpha > 0) {
        rings.globalAlpha = ringAlpha; rings.lineWidth = 1.5;
        rings.strokeStyle = `rgb(${portal >= 1 || disc > radius * .8 ? DARK : LIGHT})`;
        rings.beginPath(); rings.ellipse(center[0], center[1], radius, radius * mix(1, .92, seg(p, .56, .8)), 0, 0, Math.PI * 2); rings.stroke();
        rings.globalAlpha = 1;
      }
      ringsDrawn = ringAlpha > 0 || (portal > 0 && portal < 1);
    }
    write(pin, 'background', portal >= 1 ? 'var(--light)' : '');
    const intro = motion.reduced ? 1 : easeOut(clamp((now - loadedAt) / 1300));
    flipIn(title, intro * (1 - seg(p, .04, .3)));
    const fade = 1 - seg(p, .03, .22);
    for (const element of fades) { write(element, 'opacity', fade.toFixed(3)); write(element, 'pointerEvents', fade < .5 ? 'none' : ''); }
    const tilt = motion.reduced || !pointer.active ? [0, 0] : [(pointer.x / vw - .5) * 2, (pointer.y / vh - .5) * 2];
    write(lensCanvas, 'transform', `perspective(1500px) rotateY(${(tilt[0] * 5).toFixed(2)}deg) rotateX(${(-tilt[1] * 4).toFixed(2)}deg)`);
    const moving = !motion.reduced && (p < .5 || now - loadedAt < 1400);
    if (visible && !document.hidden && (moving || !timeline.settled || Math.abs(target[0] - source[0]) + Math.abs(target[1] - source[1]) > .05)) requestAnimationFrame(frame);
    else { running = false; last = 0; }
  }
  addEventListener('resize', () => { measureHero(); run(); });
  addEventListener('scroll', run, { passive: true });
  addEventListener('pointermove', run, { passive: true });
  document.addEventListener('visibilitychange', run);
  whileVisible(lensHero, run);
  run();
}

/* ---------- Cello hero: CELLO cut out of the page ---------- */

const coverHero = document.querySelector('.hero-cover');
if (coverHero) {
  const canvas = coverHero.querySelector('.hero-cover-canvas'), photo = coverHero.querySelector('.hero-photo');
  // The zoom goes into the stem of the first L.
  const role = coverHero.querySelector('.hero-role');
  const cover = createCover(canvas, {
    lines: ['CELLO'], focus: [0, 2, .26], heightShare: .5,
    insets: () => [document.querySelector('.bar').offsetHeight + 10, pagePad(viewport().width) + role.offsetHeight + 18]
  });
  // The same loop as the home page: the zoom eases towards the scroll position and the letters drift
  // with the pointer, frame by frame, until both have caught up.
  const timeline = heroTimeline(coverHero), shift = [0, 0];
  let running = false, last = 0, transform = '';
  const run = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60; last = now;
    const p = timeline.step(dt), zoom = motion.reduced ? 0 : seg(p, .04, .62);
    const aim = motion.reduced || !pointer.active ? [0, 0] : [(pointer.x / vw - .5) * 20, (pointer.y / vh - .5) * 14];
    const follow = motion.reduced ? 1 : 1 - Math.exp(-dt * 5);
    let drift = 0;
    for (const i of [0, 1]) { shift[i] += (aim[i] - shift[i]) * follow; drift += Math.abs(aim[i] - shift[i]); }
    if (timeline.visible) {
      cover.draw({ zoom, alpha: motion.reduced ? 1 - seg(p, .1, .45) : 1, shift });
      const next = `scale(${(motion.reduced ? 1 : mix(1.14, 1, easeOut(zoom))).toFixed(4)}) translate3d(${(-shift[0] * 1.3).toFixed(2)}px, ${(-shift[1] * 1.3).toFixed(2)}px, 0)`;
      if (next !== transform) photo.style.transform = transform = next;
    }
    if (timeline.visible && !document.hidden && (!timeline.settled || drift > .01 || cover.fading)) requestAnimationFrame(frame);
    else { running = false; last = 0; }
  }
  addEventListener('resize', () => { cover.measure(); timeline.measure(); run(); });
  addEventListener('scroll', run, { passive: true });
  addEventListener('pointermove', run, { passive: true });
  document.documentElement.addEventListener('mouseleave', run);
  document.addEventListener('visibilitychange', run);
  cover.whenFontReady(() => { root.classList.add('cover-ready'); run(); });
  run();
}

/* ---------- Research: the arcs demonstration ---------- */

// The expanding universe loads when it comes near.
const expansion = document.querySelector('.expansion');
if (expansion) new IntersectionObserver((entries, observer) => {
  if (!entries[0].isIntersecting) return;
  observer.disconnect();
  import('./expansion.js?v=3').then(({ initExpansion }) => initExpansion(expansion)).catch(() => {});
}, { rootMargin: '600px' }).observe(expansion);

const arcs = document.querySelector('.lens-canvas');
if (arcs) import('./lens-demo.js?v=4').then(({ initArcsDemo }) => initArcsDemo(arcs)).catch(() => {});
