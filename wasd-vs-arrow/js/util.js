// Small helpers shared by every module: maths, easing, a tween list, seeded randomness, DOM shortcuts.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

export const ease = {
  linear: t => t,
  outCubic: t => 1 - (1 - t) ** 3,
  inCubic: t => t * t * t,
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outBack: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; },
  outElastic: t => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
};

// mulberry32: same seed → same sequence (obstacle layouts, random figures)
export function seeded(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : [...String(seed)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tweens run on game time (they freeze while paused). tag lets a screen cancel its own tweens.
const tweens = [];
export function tween(dur, fn, { ease: e = ease.outCubic, delay = 0, tag = null } = {}) {
  return new Promise(resolve => tweens.push({ t: -delay, dur: Math.max(1e-4, dur), fn, e, resolve, tag }));
}
export function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt;
    if (tw.t < 0) continue;
    const k = Math.min(1, tw.t / tw.dur);
    tw.fn(tw.e(k), k);
    if (k >= 1) { tweens.splice(i, 1); tw.resolve(); }
  }
}
export function clearTweens(tag) {
  for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].tag === tag) tweens.splice(i, 1);
}
export const wait = (s, tag) => tween(s, () => {}, { tag });

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function el(tag, cls = '', html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export const store = {
  get(k, fallback) { try { const v = localStorage.getItem(`wva.${k}`); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(`wva.${k}`, JSON.stringify(v)); } catch {} },
};

// game modules ship their own overlay styles
export function injectCSS(id, css) {
  if (document.getElementById(id)) return;
  const st = document.createElement('style');
  st.id = id;
  st.textContent = css;
  document.head.append(st);
}
