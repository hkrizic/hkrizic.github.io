// The PyDojo Python keyboard: an on-screen keyboard tuned for writing Python
// on a phone. A symbol row is always visible, long-pressing the top row gives
// digits, there are operator keys (== != <= ...), auto-indenting return, a
// space bar trackpad (hold and drag to move the cursor), and a context-aware
// suggestion bar (keywords, methods, your variables).
import { Editor } from './editor.js';
import { suggest } from './suggest.js';
import { h, haptic, sound } from './ui.js';

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
  redo: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="m15 5 5 5-5 5m5-5H9.5a5.5 5.5 0 0 0 0 11H13" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const k = (out, o = {}) => ({ out, label: out, ...o });
const f = (cmd, o = {}) => ({ cmd, fn: true, ...o });
const DIGITS = '1234567890';

const LAYERS = {
  abc: [
    ['(', ')', '[', ']', '{', '}', ':', '=', '"', "'"].map((c) => k(c, { sym: true })),
    'qwertyuiop'.split('').map((c, i) => k(c, { alt: DIGITS[i] })),
    [{ spacer: 0.5 }, ...'asdfghjkl'.split('').map((c) => k(c)), { spacer: 0.5 }],
    [f('shift', { w: 1.45, icon: 'shift' }), ...'zxcvbnm'.split('').map((c) => k(c)), f('backspace', { w: 1.45, icon: 'back', repeat: true })],
    [f('layer:123', { w: 1.35, label: '123' }), f('tab', { w: 1.15, icon: 'tab' }), k('_', { w: 1 }), f('space', { w: 3.5, label: 'space' }), k('.', { w: 1 }), k(',', { w: 1 }), f('enter', { w: 1.55, icon: 'enter', accent: true })],
  ],
  123: [
    DIGITS.split('').map((c) => k(c, { sym: true })),
    ['+', '-', '*', '/', '%', '<', '>', '!', '&', '|'].map((c) => k(c)),
    [{ spacer: 0.5 }, ...['#', '@', '\\', '^', '~', ';', '?', '$'].map((c) => k(c)), f('undo', { icon: 'undo' }), { spacer: 0.5 }],
    [k('==', { w: 1.2 }), k('!=', { w: 1.2 }), k('<=', { w: 1.2 }), k('>=', { w: 1.2 }), k('+=', { w: 1.2 }), k('**', { w: 1.1 }), k('//', { w: 1.1 }), f('backspace', { w: 1.45, icon: 'back', repeat: true })],
    [f('layer:abc', { w: 1.35, label: 'abc' }), f('tab', { w: 1.15, icon: 'tab' }), k('_', { w: 1 }), f('space', { w: 3.5, label: 'space' }), k('.', { w: 1 }), k(',', { w: 1 }), f('enter', { w: 1.55, icon: 'enter', accent: true })],
  ],
};

export class PyKeyboard {
  constructor({ onHide } = {}) {
    this.onHide = onHide;
    this.layer = 'abc';
    this.shift = 0; // 0 off, 1 next letter, 2 caps lock
    this.lastShiftTap = 0;
    this.editor = null;
    this.pointers = new Map();
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
        this.navKey('hide', 'hide')));
    this.rowsEl = h('div.kb-rows');
    this.pop = h('div.kb-pop');
    this.el.append(this.bar, this.rowsEl, this.pop);
    this.renderLayer();
    this.chips.addEventListener('mousedown', (e) => e.preventDefault());
    // keep the page from scrolling/zooming while typing
    this.rowsEl.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.rowsEl.addEventListener('pointerdown', (e) => this.down(e));
    this.rowsEl.addEventListener('pointermove', (e) => this.moveP(e));
    this.rowsEl.addEventListener('pointerup', (e) => this.up(e));
    this.rowsEl.addEventListener('pointercancel', (e) => this.cancel(e));
    this.rowsEl.addEventListener('contextmenu', (e) => e.preventDefault());
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
    this.rowsEl.replaceChildren(...LAYERS[this.layer].map((row, ri) => h(`div.kb-row${ri === 0 ? '.kb-symrow' : ''}`, row.map((key) => {
      if (key.spacer) return h('div.kb-spacer', { style: { flex: key.spacer } });
      const el = h('div.kb-key', { role: 'button', class: [key.fn ? 'fn' : '', key.sym ? 'sym' : '', key.accent ? 'accent' : '', key.cmd === 'space' ? 'space' : ''].filter(Boolean).join(' ') });
      el.style.flex = key.w || 1;
      el._key = key;
      if (key.icon) el.innerHTML = ICON[key.icon];
      else el.append(h('span.kb-label', this.labelFor(key)));
      if (key.alt) el.append(h('span.kb-hint', key.alt));
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
    this.editor = ed;
    this.el.classList.toggle('text-mode', !!ed && ed.lang === 'text');
    if (ed) ed.onUpdate = () => this.scheduleSuggest();
    this.scheduleSuggest();
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
      if (key.alt) p.timer = setTimeout(() => { p.alt = true; this.showPop(el, key.alt, true); haptic(); }, 360);
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
    if (p.key.out && !p.alt) {
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
    if (key.cmd) { this.send(key.cmd); return; }
    if (key.out) {
      this.type(p.alt ? key.alt : this.charFor(key));
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
  hidePop() { this.pop.classList.remove('show'); }

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
