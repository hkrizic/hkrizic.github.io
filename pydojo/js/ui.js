// DOM helpers, icons, sound, haptics, confetti, toasts and modals.
import { store } from './store.js';

/** h('div.card#id', {onclick, class, style, html}, ...children) */
export function h(sel, attrs, ...kids) {
  const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
  const el = document.createElement(m[1] || 'div');
  for (const part of (m[2] || '').match(/[.#][\w-]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
  }
  if (attrs !== undefined && attrs !== null && attrs !== false && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className += ` ${v}`;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    }
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
export const clear = (el) => { while (el.firstChild) el.firstChild.remove(); return el; };

// ------------------------------------------------------------ icons
const P = {
  path: '<path d="M12 3c3 0 5 2 5 4.5S15 11 12 11s-5 1.5-5 4 2 4.5 5 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="3.5" r="2.2" fill="currentColor"/><circle cx="12" cy="20.5" r="2.2" fill="currentColor"/>',
  dumbbell: '<path d="M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  user: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  flame: '<path d="M12 2c1 3.5 5 5.5 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5 .3 2 1.3 3 2.3 3-.8-3 .2-6.5.2-9z" fill="currentColor"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 10h1M10 10h1M14 10h1M18 10h0M7 14h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  chevronR: '<path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  chevronL: '<path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  chevronD: '<path d="m5 9 7 7 7-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  star: '<path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="currentColor"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor"/>',
  clock: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="m7 9 3 3-3 3M12 15h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="2"/>',
  gear: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  undo: '<path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -3)"/>',
  redo: '<path d="m15 7 5 5-5 5M20 12H10a6 6 0 0 0 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -3)"/>',
  target: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
  data: '<ellipse cx="12" cy="5.5" rx="8" ry="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" fill="none" stroke="currentColor" stroke-width="2"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 18.5h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  more: '<circle cx="5.5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="18.5" cy="12" r="2" fill="currentColor"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
};
export function icon(name, size = 22, cls = '') {
  const span = document.createElement('span');
  span.className = `ic ${cls}`;
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${P[name] || ''}</svg>`;
  return span;
}

// The mascot: "Py", a friendly snake wearing a dojo headband.
export function mascot(size = 120, mood = 'happy', belt = '#14161C') {
  const mouth = mood === 'sad' ? 'M50 76 q10 -7 20 0' : mood === 'wow' ? 'M56 74 a4 5 0 1 0 8 0 a4 5 0 1 0 -8 0' : 'M48 72 q12 12 24 0';
  const el = document.createElement('span');
  el.className = 'mascot';
  el.innerHTML = `<svg viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true">
    <ellipse cx="60" cy="112" rx="34" ry="5" fill="rgba(0,0,0,.12)"/>
    <path d="M30 104c-14-2-16-16-4-20 14-5 36 4 50-2 10-4 12-14 6-20" fill="none" stroke="#2BB673" stroke-width="20" stroke-linecap="round"/>
    <path d="M30 104c-14-2-16-16-4-20 14-5 36 4 50-2 10-4 12-14 6-20" fill="none" stroke="#FFD43B" stroke-width="5" stroke-dasharray="2 12" stroke-linecap="round"/>
    <circle cx="60" cy="52" r="34" fill="#2BB673"/>
    <ellipse cx="60" cy="64" rx="24" ry="17" fill="#7EDDA8"/>
    <rect x="26" y="30" width="68" height="10" rx="5" fill="${belt}"/>
    <path d="M90 34l14-6-4 10 6 6-15-3z" fill="${belt}"/>
    <circle cx="48" cy="52" r="7.5" fill="#fff"/><circle cx="72" cy="52" r="7.5" fill="#fff"/>
    <circle cx="49.5" cy="53" r="4" fill="#14161C"/><circle cx="73.5" cy="53" r="4" fill="#14161C"/>
    <circle cx="51" cy="51" r="1.4" fill="#fff"/><circle cx="75" cy="51" r="1.4" fill="#fff"/>
    <path d="${mouth}" fill="${mood === 'wow' ? '#14161C' : 'none'}" stroke="#14161C" stroke-width="3" stroke-linecap="round"/>
    <path d="M60 84v8l-4 4M60 92l4 4" fill="none" stroke="#F04D58" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
  return el;
}

// ------------------------------------------------------------ sound (WebAudio, synthesized)
let actx = null;
function ac() {
  if (!actx) {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'ambient'; // respect the iPhone silent switch
      actx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return null; }
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, start, dur, type = 'sine', gain = 0.15) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start); o.stop(a.currentTime + start + dur + 0.02);
}
export const sound = {
  correct() { if (!store.s.settings.sound) return; tone(880, 0, 0.12); tone(1318.5, 0.09, 0.22); },
  wrong() { if (!store.s.settings.sound) return; tone(220, 0, 0.16, 'square', 0.06); tone(185, 0.12, 0.22, 'square', 0.06); },
  done() { if (!store.s.settings.sound) return; [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.12)); },
  tick() { if (!store.s.settings.keyclick) return; tone(1800, 0, 0.025, 'square', 0.025); },
};

// ------------------------------------------------------------ haptics
// iOS Safari has no vibrate(); toggling a <input switch> gives a system haptic (iOS 18+).
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let hapticLabel = null;
export function haptic() {
  if (!store.s.settings.haptics) return;
  if (navigator.vibrate && !isIOS) { try { navigator.vibrate(8); } catch { /* ignore */ } return; }
  if (!isIOS) return;
  // Clicking the switch moves focus to it, which would close the iPhone keyboard.
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'TEXTAREA' || (ae.tagName === 'INPUT' && ae.type !== 'checkbox'))) return;
  if (!hapticLabel) {
    hapticLabel = document.createElement('label');
    hapticLabel.setAttribute('aria-hidden', 'true');
    hapticLabel.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
    const inp = document.createElement('input');
    inp.type = 'checkbox'; inp.setAttribute('switch', ''); inp.tabIndex = -1;
    hapticLabel.append(inp);
    document.body.append(hapticLabel);
  }
  hapticLabel.click();
}

// ------------------------------------------------------------ confetti
export function confetti(n = 120) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = h('canvas.confetti');
  document.body.append(c);
  const dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const colors = ['#2BB673', '#FFD43B', '#2F7BF6', '#F04D58', '#8B5CF6', '#FF9F1C'];
  const parts = Array.from({ length: n }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 13, vy: -Math.random() * 13 - 4, r: Math.random() * 6 + 4,
    a: Math.random() * 6.3, va: (Math.random() - 0.5) * 0.4, col: colors[(Math.random() * colors.length) | 0],
  }));
  const t0 = performance.now();
  (function frame(t) {
    const dt = Math.min(2, (t - (frame.last || t)) / 16.7); frame.last = t;
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.35 * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.col; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore();
    }
    if (t - t0 < 2600) requestAnimationFrame(frame); else c.remove();
  })(t0);
}

// ------------------------------------------------------------ toast & modal
export function toast(text, kind = '') {
  const t = h(`div.toast${kind ? `.${kind}` : ''}`, text);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
}

/** modal({title, body: Node|string, actions:[{label, kind, onClick}]}) → close() */
export function modal({ title, body, actions = [], dismissable = true }) {
  const close = () => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 220); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape' && dismissable) close(); };
  const box = h('div.modal',
    title && h('h3', title),
    typeof body === 'string' ? h('div.modal-body', { html: body }) : h('div.modal-body', body),
    h('div.modal-actions', actions.map((a) => h(`button.btn.${a.kind || 'ghost'}`, { onclick: () => { if (a.onClick?.() !== false) close(); } }, a.label))));
  const wrap = h('div.modal-wrap', { onclick: (e) => { if (e.target === wrap && dismissable) close(); } }, box);
  document.body.append(wrap);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => wrap.classList.add('show'));
  return close;
}

export function confirmModal(title, text, okLabel = 'OK', kind = 'primary') {
  return new Promise((resolve) => {
    modal({ title, body: h('p', text), actions: [
      { label: 'Cancel', kind: 'ghost', onClick: () => resolve(false) },
      { label: okLabel, kind, onClick: () => resolve(true) },
    ] });
  });
}

export const fmtTime = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60); const s = sec % 60;
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

export const isTouch = () => matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;

export function shuffle(arr, seed) {
  const a = [...arr];
  let x = seed ?? Math.floor(Math.random() * 2 ** 31);
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text) {
  const ta = h('textarea', { style: { position: 'fixed', left: '-1000px', top: '0', opacity: '0' }, readonly: true });
  ta.value = text;
  document.body.append(ta);
  ta.select(); ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}
