// The PyDojo Python keyboard: an on-screen keyboard tuned for writing Python
// on a phone. A symbol row is always visible, long-pressing the top row gives
// digits, there are operator keys (== != <= ...), auto-indenting return, a
// space bar trackpad (hold and drag to move the cursor), and a context-aware
// suggestion bar (keywords, methods, your variables).
// Characters beyond that: long-press for accents and variants (é ü č, € £),
// the #+= layer (° µ ² × ≠ → π ...), and the globe key, which switches to the
// iPhone's own keyboard (emoji, any language, dictation).
import { Editor } from './editor.js';
import { suggest } from './suggest.js';
import { h, haptic, sound, isTouch } from './ui.js';

const ICON = {
  shift: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 4 4 12.5h4.5V20h7v-7.5H20z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  shiftOn: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 4 4 12.5h4.5V20h7v-7.5H20z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  shiftLock: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 3 4 11h4.5v5h7v-5H20z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.5 20h7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 5h11a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 19H9l-6.5-7z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="m11.5 9.5 5 5m0-5-5 5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  enter: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M19 5v6a3 3 0 0 1-3 3H6m0 0 4-4m-4 4 4 4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  tab: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 12h14m0 0-4-4m4 4-4 4M20 6v12" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="m14.5 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="m6 14.5 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="m6 9.5 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  hide: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="3" y="3.5" width="18" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 7h1M10 7h1M13.5 7h1M17 7h.5M8 11h8M9 18l3 3 3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>',
  undo: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 5 4 10l5 5M4 10h10.5a5.5 5.5 0 0 1 0 11H11" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  globe: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.6 12h16.8M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6S9.6 5.8 12 3.4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  pykb: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="2.5" y="6" width="19" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M6 10h1M10 10h1M14 10h1M17.5 10h.5M7 14h10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
  redo: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="m15 5 5 5-5 5m5-5H9.5a5.5 5.5 0 0 0 0 11H13" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// Long-press variants, like the iPhone keyboard. The first entry is selected
// when the picker opens (for the top letter row that is the digit).
const ACCENTS = {
  a: 'äàáâãåæāą', c: 'čćç', d: 'đď', e: 'éèêëēęė', g: 'ğ', i: 'íìîïī', l: 'łľ', n: 'ñńň',
  o: 'öóòôõøœō', r: 'ř', s: 'šśşß', t: 'ť', u: 'üúùûūů', y: 'ýÿ', z: 'žźż',
};
const VARIANTS = {
  '"': '“”„«»', "'": '`‘’‚', '=': '≠≈≡', '-': '–—−', '*': '×•·', '/': '÷', '%': '‰', '<': '≤«←', '>': '≥»→',
  '!': '¡', '?': '¿', $: '€£¥¢₹₩₿', '&': '§¶', '^': '°', '~': '≈', '.': '…·',
  0: '°', 1: '¹½¼', 2: '²½', 3: '³¾',
  '€': '₿₩₽₺₪₫', '£': '₤', '°': '℃℉', 'µ': 'μ', '²': '¹½¼', '³': '¾', '`': '´', '±': '∓', '≈': '≅∼', '≠': '≡',
  '→': '⇒↑↓↔', '←': '⇐↑↓', '✓': '✗★☆♥', '…': '⋯', '•': '◦▪', '§': '¶©®™', 'π': 'θφωτ', 'σ': 'αβγερμ',
  'Δ': 'δ∇', 'Σ': '∑∏∫', '«': '‹', '»': '›', '–': '—',
};
const DIGITS = '1234567890';
const k = (out, o = {}) => ({ out, label: out, alts: VARIANTS[out] ? [...VARIANTS[out]] : null, ...o });
const f = (cmd, o = {}) => ({ cmd, fn: true, ...o });
const letter = (c, digit) => k(c, { alts: [...(digit || ''), ...(ACCENTS[c] || '')], hint: digit });
const bottomRow = (to, label) => [
  f(`layer:${to}`, { w: 1.3, label }), f('native', { icon: 'globe', touchOnly: true, aria: 'iPhone keyboard' }), f('tab', { w: 1.1, icon: 'tab' }),
  k('_'), f('space', { w: 3.4, label: 'space' }), k('.'), k(','), f('enter', { w: 1.5, icon: 'enter', accent: true }),
];
const backspace = () => f('backspace', { w: 1.45, icon: 'back', repeat: true });

const LAYERS = {
  abc: [
    ['(', ')', '[', ']', '{', '}', ':', '=', '"', "'"].map((c) => k(c, { sym: true })),
    'qwertyuiop'.split('').map((c, i) => letter(c, DIGITS[i])),
    [{ spacer: 0.5 }, ...'asdfghjkl'.split('').map((c) => letter(c)), { spacer: 0.5 }],
    [f('shift', { w: 1.45, icon: 'shift' }), ...'zxcvbnm'.split('').map((c) => letter(c)), backspace()],
    bottomRow('123', '123'),
  ],
  123: [
    DIGITS.split('').map((c) => k(c, { sym: true })),
    ['+', '-', '*', '/', '%', '<', '>', '!', '&', '|'].map((c) => k(c)),
    [f('layer:sym', { w: 1.25, label: '#+=' }), ...['#', '@', '\\', '^', '~', ';', '?', '$'].map((c) => k(c)), f('undo', { w: 1.25, icon: 'undo' })],
    [k('==', { w: 1.2 }), k('!=', { w: 1.2 }), k('<=', { w: 1.2 }), k('>=', { w: 1.2 }), k('+=', { w: 1.2 }), k('**', { w: 1.1 }), k('//', { w: 1.1 }), backspace()],
    bottomRow('abc', 'abc'),
  ],
  sym: [
    ['€', '£', '¥', '¢', '₹', '°', 'µ', '²', '³', '`'].map((c) => k(c, { sym: true })),
    ['×', '÷', '±', '≈', '≠', '≤', '≥', '→', '←', '✓'].map((c) => k(c)),
    [f('layer:123', { w: 1.25, label: '123' }), ...['«', '»', '“', '”', '‘', '’', '–', '…'].map((c) => k(c)), f('undo', { w: 1.25, icon: 'undo' })],
    [...['π', 'σ', 'λ', 'Δ', 'Σ', '•', '§', '—'].map((c) => k(c, { w: 1.1 })), backspace()],
    bottomRow('abc', 'abc'),
  ],
};
const upper = (c) => (c === 'ß' ? 'ẞ' : c.toUpperCase());

export class PyKeyboard {
  constructor({ onHide } = {}) {
    this.onHide = onHide;
    this.layer = 'abc';
    this.shift = 0; // 0 off, 1 next letter, 2 caps lock
    this.lastShiftTap = 0;
    this.editor = null;
    this.nativeEd = null; // editor currently typed into with the iPhone keyboard
    this.pointers = new Map();
    this.onViewport = () => this.syncViewport();
    this.build();
    Editor.onActive((ed) => this.attach(ed));
    if (Editor.active) this.attach(Editor.active);
  }

  build() {
    this.el = h('div.kb', { 'aria-label': 'Python keyboard' });
    this.chips = h('div.kb-chips');
    this.bar = h('div.kb-bar',
      this.chips,
      h('div.kb-nav',
        this.navKey('left', 'left'), this.navKey('up', 'up'), this.navKey('down', 'down'), this.navKey('right', 'right'),
        this.pyKey(), this.navKey('hide', 'hide')));
    this.rowsEl = h('div.kb-rows');
    this.pop = h('div.kb-pop');
    this.altsEl = h('div.kb-alts');
    this.el.append(this.bar, this.rowsEl, this.pop, this.altsEl);
    this.renderLayer();
    this.chips.addEventListener('mousedown', (e) => e.preventDefault());
    // keep the page from scrolling/zooming while typing
    this.rowsEl.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.rowsEl.addEventListener('pointerdown', (e) => this.down(e));
    this.rowsEl.addEventListener('pointermove', (e) => this.moveP(e));
    this.rowsEl.addEventListener('pointerup', (e) => this.up(e));
    this.rowsEl.addEventListener('pointercancel', (e) => this.cancel(e));
    this.rowsEl.addEventListener('contextmenu', (e) => e.preventDefault());
    // iOS only opens its keyboard for focus() inside a touchend/click handler.
    this.rowsEl.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      if (t && this.keyAt(t.clientX, t.clientY)?._key.cmd === 'native') this.startNative();
    });
  }

  /** Shown while the iPhone keyboard is up: switches back to the Python keyboard. */
  pyKey() {
    const b = h('button.kb-navkey.kb-pykey', { 'aria-label': 'Python keyboard', html: `${ICON.pykb}<span>Python</span>` });
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); haptic(); });
    b.addEventListener('pointerup', () => { b.classList.remove('down'); this.nativeEd?.stopNative(); });
    b.addEventListener('pointercancel', () => b.classList.remove('down'));
    b.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    return b;
  }

  navKey(icon, cmd) {
    const b = h('button.kb-navkey', { 'aria-label': cmd, html: ICON[icon] });
    let timer = 0; let rep = 0;
    const stop = () => { clearTimeout(timer); clearInterval(rep); b.classList.remove('down'); };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.classList.add('down');
      haptic();
      if (cmd === 'hide') return;
      this.send(cmd);
      timer = setTimeout(() => { rep = setInterval(() => this.send(cmd), 60); }, 380);
    });
    b.addEventListener('pointerup', () => { stop(); if (cmd === 'hide') this.onHide?.(); });
    b.addEventListener('pointerleave', stop);
    b.addEventListener('pointercancel', stop);
    b.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    return b;
  }

  renderLayer() {
    const touch = isTouch();
    this.rowsEl.replaceChildren(...LAYERS[this.layer].map((row, ri) => h(`div.kb-row${ri === 0 ? '.kb-symrow' : ''}`, row.filter((key) => touch || !key.touchOnly).map((key) => {
      if (key.spacer) return h('div.kb-spacer', { style: { flex: key.spacer } });
      const el = h('div.kb-key', { role: 'button', 'aria-label': key.aria || key.label || key.cmd, class: [key.fn ? 'fn' : '', key.sym ? 'sym' : '', key.accent ? 'accent' : '', key.cmd === 'space' ? 'space' : ''].filter(Boolean).join(' ') });
      el.style.flex = key.w || 1;
      el._key = key;
      if (key.icon) el.innerHTML = ICON[key.icon];
      else el.append(h('span.kb-label', this.labelFor(key)));
      if (key.hint) el.append(h('span.kb-hint', key.hint));
      if (key.cmd === 'shift') this.shiftEl = el;
      return el;
    }))));
    this.updateShift();
  }

  labelFor(key) {
    if (key.label && key.out && /^[a-z]$/.test(key.out)) return this.shift ? key.out.toUpperCase() : key.out;
    return key.label;
  }

  updateShift() {
    if (this.shiftEl) {
      this.shiftEl.innerHTML = ICON[this.shift === 2 ? 'shiftLock' : this.shift ? 'shiftOn' : 'shift'];
      this.shiftEl.classList.toggle('on', !!this.shift);
    }
    this.rowsEl.querySelectorAll('.kb-key').forEach((el) => {
      const key = el._key;
      if (key.out && /^[a-z]$/.test(key.out)) el.querySelector('.kb-label').textContent = this.shift ? key.out.toUpperCase() : key.out;
    });
  }

  attach(ed) {
    if (this.nativeEd && this.nativeEd !== ed) this.nativeEd.stopNative();
    this.editor = ed;
    this.el.classList.toggle('text-mode', !!ed && ed.lang === 'text');
    if (ed) {
      ed.onUpdate = () => this.scheduleSuggest();
      ed.onNative = (on) => this.nativeUI(on ? ed : null);
    }
    this.scheduleSuggest();
  }

  /** Take the keyboard off screen (also closes the iPhone keyboard if it is up). */
  unmount() {
    this.nativeEd?.stopNative();
    this.el.remove();
  }

  // ---------------------------------------------------------------- iPhone keyboard mode
  startNative() {
    if (!this.editor) return;
    this.cancelAll();
    this.editor.startNative();
  }

  nativeUI(ed) {
    this.nativeEd = ed;
    const on = !!ed;
    this.el.classList.toggle('native', on);
    document.documentElement.classList.toggle('native-kb', on);
    const vv = window.visualViewport;
    if (on) {
      vv?.addEventListener('resize', this.onViewport);
      vv?.addEventListener('scroll', this.onViewport);
      this.syncViewport();
    } else {
      vv?.removeEventListener('resize', this.onViewport);
      vv?.removeEventListener('scroll', this.onViewport);
      document.documentElement.style.removeProperty('--vvh');
      document.documentElement.style.removeProperty('--vvt');
    }
    this.scheduleSuggest();
  }

  // Safari does not shrink the layout for its keyboard; fit the screen to the
  // visible part so the editor and the suggestion bar stay above it.
  syncViewport() {
    const vv = window.visualViewport;
    if (!vv) return;
    const st = document.documentElement.style;
    st.setProperty('--vvh', `${Math.round(vv.height)}px`);
    st.setProperty('--vvt', `${Math.round(vv.offsetTop)}px`);
  }

  // ---------------------------------------------------------------- pointer handling
  keyAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const key = el && el.closest('.kb-key');
    return key && this.rowsEl.contains(key) ? key : null;
  }

  down(e) {
    const el = e.target.closest('.kb-key');
    if (!el) return;
    e.preventDefault();
    try { this.rowsEl.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const key = el._key;
    const p = { el, key, x0: e.clientX, y0: e.clientY, t0: Date.now(), alt: false, track: false, lastX: e.clientX, lastY: e.clientY };
    this.pointers.set(e.pointerId, p);
    el.classList.add('down');
    haptic();
    sound.tick();
    if (key.cmd !== 'shift') this.lastShiftTap = 0; // double-tap = caps lock only for consecutive shift taps
    if (key.cmd === 'shift') {
      const now = Date.now();
      this.shift = now - this.lastShiftTap < 320 ? 2 : this.shift ? 0 : 1;
      this.lastShiftTap = now;
      this.updateShift();
      return;
    }
    if (key.cmd && key.cmd.startsWith('layer:')) {
      this.layer = key.cmd.slice(6);
      this.renderLayer();
      this.pointers.delete(e.pointerId);
      return;
    }
    if (key.repeat) {
      this.send(key.cmd);
      p.timer = setTimeout(() => {
        let n = 0;
        p.rep = setInterval(() => { this.send(n++ > 14 ? 'deleteWordBack' : key.cmd); }, 75);
      }, 420);
      return;
    }
    if (key.cmd === 'space') {
      p.timer = setTimeout(() => { p.track = true; this.el.classList.add('trackpad'); haptic(); }, 320);
      return;
    }
    if (key.out) {
      this.showPop(el, this.charFor(key));
      if (key.alts?.length) p.timer = setTimeout(() => this.openAlts(p), 360);
    }
  }

  moveP(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    if (p.key.cmd === 'space') {
      if (!p.track && Math.abs(e.clientX - p.x0) > 14) { clearTimeout(p.timer); p.track = true; this.el.classList.add('trackpad'); }
      if (p.track) {
        const cw = 9; const lh = 22;
        const dx = Math.trunc((e.clientX - p.lastX) / cw);
        const dy = Math.trunc((e.clientY - p.lastY) / lh);
        if (dx || dy) {
          this.editor?.moveBy(dx, dy);
          p.lastX += dx * cw; p.lastY += dy * lh;
        }
      }
      return;
    }
    if (p.alt) { this.pickAlt(p, e.clientX); return; }
    if (p.key.out) {
      const el = this.keyAt(e.clientX, e.clientY);
      if (el && el !== p.el && el._key.out) {
        p.el.classList.remove('down');
        clearTimeout(p.timer);
        p.el = el; p.key = el._key;
        el.classList.add('down');
        this.showPop(el, this.charFor(p.key));
      }
    }
  }

  up(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    clearTimeout(p.timer); clearInterval(p.rep);
    p.el.classList.remove('down');
    this.hidePop();
    const { key } = p;
    if (key.cmd === 'space') {
      this.el.classList.remove('trackpad');
      if (!p.track) this.type(' ');
      return;
    }
    if (key.repeat || key.cmd === 'shift') return;
    if (key.cmd === 'native') { if (e.pointerType !== 'touch') this.startNative(); return; } // touch: see touchend
    if (key.cmd) { this.send(key.cmd); return; }
    if (key.out) {
      this.type(p.alt ? p.alt.items[p.alt.i] : this.charFor(key));
      if (this.shift === 1 && /^[a-z]$/.test(key.out)) { this.shift = 0; this.updateShift(); }
    }
  }

  cancel(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    clearTimeout(p.timer); clearInterval(p.rep);
    p.el.classList.remove('down');
    this.el.classList.remove('trackpad');
    this.pointers.delete(e.pointerId);
    this.hidePop();
  }

  cancelAll() {
    for (const p of this.pointers.values()) { clearTimeout(p.timer); clearInterval(p.rep); p.el.classList.remove('down'); }
    this.pointers.clear();
    this.el.classList.remove('trackpad');
    this.hidePop();
  }

  charFor(key) { return this.shift && /^[a-z]$/.test(key.out) ? key.out.toUpperCase() : key.out; }

  showPop(el, text, alt = false) {
    if (el._key.fn) return;
    const r = el.getBoundingClientRect();
    const kr = this.el.getBoundingClientRect();
    this.pop.textContent = text;
    this.pop.classList.toggle('alt', alt);
    this.pop.classList.toggle('wide', text.length > 1);
    const w = Math.max(r.width + 16, text.length > 1 ? 30 + text.length * 12 : 0);
    this.pop.style.width = `${w}px`;
    this.pop.style.height = `${r.height + 46}px`;
    let left = r.left - kr.left + r.width / 2 - w / 2;
    left = Math.max(2, Math.min(kr.width - w - 2, left));
    this.pop.style.transform = `translate(${left}px, ${r.top - kr.top - 50}px)`;
    this.pop.classList.add('show');
  }
  hidePop() { this.pop.classList.remove('show'); this.altsEl.classList.remove('show'); }

  // Long-press picker: a row of variants above the key; slide to choose.
  openAlts(p) {
    const { el, key } = p;
    const caps = this.shift && /^[a-z]$/.test(key.out);
    const items = key.alts.map((c) => (caps ? upper(c) : c));
    const r = el.getBoundingClientRect();
    const kr = this.el.getBoundingClientRect();
    const cw = Math.max(r.width, 34); const pad = 4; const n = items.length;
    const w = cw * n + pad * 2;
    // Keys on the right half open to the left, so the first variant is always under the finger.
    const rev = r.left + r.width / 2 > kr.left + kr.width / 2;
    let left = rev ? r.right - kr.left - w + pad : r.left - kr.left - pad;
    left = Math.max(2, Math.min(kr.width - w - 2, left));
    p.alt = { items, i: 0, rev, x0: kr.left + left + pad, cw };
    this.pop.classList.remove('show');
    const order = items.map((_, i) => i);
    if (rev) order.reverse();
    this.altsEl.replaceChildren(...order.map((i) => h('span', { 'data-i': i, style: { width: `${cw}px` } }, items[i])));
    this.altsEl.style.transform = `translate(${left}px, ${r.top - kr.top - r.height - 18}px)`;
    this.altsEl.style.setProperty('--cell-h', `${r.height + 6}px`);
    this.altsEl.classList.add('show');
    this.markAlt(p);
    haptic();
  }

  pickAlt(p, x) {
    const { alt } = p;
    const n = alt.items.length;
    const slot = Math.max(0, Math.min(n - 1, Math.floor((x - alt.x0) / alt.cw)));
    const i = alt.rev ? n - 1 - slot : slot;
    if (i !== alt.i) { alt.i = i; this.markAlt(p); haptic(); }
  }

  markAlt(p) {
    for (const s of this.altsEl.children) s.classList.toggle('sel', Number(s.dataset.i) === p.alt.i);
  }

  // ---------------------------------------------------------------- output
  type(text) {
    const ed = this.editor;
    if (!ed) return;
    if (text.length === 1) ed.typeChar(text);
    else ed.insertSnippet(text);
    this.scheduleSuggest();
  }

  send(cmd) {
    const ed = this.editor;
    if (!ed) return;
    if (cmd === 'undo') ed.undo();
    else ed.command(cmd);
    this.scheduleSuggest();
  }

  scheduleSuggest() {
    if (this.sugTimer) return;
    this.sugTimer = requestAnimationFrame(() => { this.sugTimer = 0; this.renderSuggestions(); });
  }

  renderSuggestions() {
    const ed = this.editor;
    if (!ed) { this.chips.replaceChildren(); return; }
    let items = [];
    try { items = suggest(ed.context()); } catch (err) { console.warn(err); }
    const sig = items.map((i) => i.label + i.kind).join('|');
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.chips.replaceChildren(...items.map((it) => h(`button.kb-chip.${it.kind}`, {
      onclick: () => {
        haptic();
        ed.insertSnippet(it.insert, { replaceBefore: it.replace });
        this.scheduleSuggest();
      },
    }, it.label)));
    this.chips.scrollLeft = 0;
  }
}
