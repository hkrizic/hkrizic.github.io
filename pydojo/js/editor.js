// A small code editor that renders its own caret and selection.
//
// On touch devices nothing focusable is ever focused, so the native iOS
// keyboard never appears; the PyKeyboard drives the editor instead.
// On desktop a hidden textarea receives physical-keyboard input (including
// dead keys / IME composition and native copy/cut/paste).
import { highlightLines, tokenizePython } from './highlight.js';
import { h, copyText, isTouch, haptic, modal } from './ui.js';

const INDENT = '    ';
const OPEN = { '(': ')', '[': ']', '{': '}' };
const CLOSE = new Set([')', ']', '}']);
const QUOTES = new Set(['"', "'"]);
const WORD = /[\wÀ-￿]/;

let active = null;
const activeListeners = new Set();

export class Editor {
  static get active() { return active; }
  static onActive(fn) { activeListeners.add(fn); return () => activeListeners.delete(fn); }

  constructor(opts = {}) {
    this.opts = { lang: 'python', placeholder: '', fontSize: 15, onChange: null, onFocus: null, onSubmit: null, onRun: null, ...opts };
    this.lang = this.opts.lang;
    this.text = normalize(opts.value || '');
    this.lines = this.text.split('\n');
    this.history = [];
    this.future = [];
    this.lastKind = null;
    this.lastTime = 0;
    this.goalCol = null;
    this.focused = false;
    this.errLine = 0;
    this.sel = this.initialSelection();
    this.build();
    this.render();
  }

  initialSelection() {
    const m = /^([ \t]*)pass[ \t]*$/m.exec(this.text);
    if (m) { const a = m.index + m[1].length; return { a, b: a + 4 }; }
    const end = this.text.replace(/\n+$/, '').length;
    return { a: end, b: end };
  }

  // ---------------------------------------------------------------- DOM
  build() {
    this.el = h('div.ed', { class: this.lang === 'text' ? 'ed-text' : '' });
    this.el.style.setProperty('--ed-font', `${this.opts.fontSize}px`);
    this.el.style.setProperty('--lh', `${Math.round(this.opts.fontSize * 1.6)}px`);
    this.scroller = h('div.ed-scroll');
    this.inner = h('div.ed-inner');
    this.linesEl = h('div.ed-lines');
    this.selEl = h('div.ed-sel');
    this.caret = h('div.ed-caret');
    this.menu = h('div.ed-menu');
    this.inner.append(this.selEl, this.linesEl, this.caret);
    this.scroller.append(this.inner);
    this.el.append(this.scroller, this.menu);
    if (!isTouch()) {
      this.input = h('textarea.ed-input', { autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', tabindex: '0', 'aria-label': 'Code editor' });
      this.el.append(this.input);
      this.bindDesktop();
    }
    this.bindPointer();
  }

  mount(parent) { parent.append(this.el); requestAnimationFrame(() => { this.measure(true); this.renderSel(); }); return this; }

  measure(force) {
    if (this.cw && !force) return;
    const row = this.linesEl.firstElementChild;
    if (!row) return;
    const code = row.querySelector('.ed-code');
    const probe = h('span', { style: { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre' } }, 'x'.repeat(40));
    code.append(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    if (!w) return;
    this.cw = w / 40;
    this.codeLeft = code.offsetLeft;
    this.padTop = this.linesEl.offsetTop;
    this.lh = row.offsetHeight || Math.round(this.opts.fontSize * 1.6);
    const cs = getComputedStyle(code);
    this.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  }

  // ---------------------------------------------------------------- model helpers
  get value() { return this.text; }
  set value(v) { this.setValue(v); }
  setValue(v, { keepHistory = false } = {}) {
    if (!keepHistory) { this.history = []; this.future = []; }
    this.text = normalize(v);
    this.lines = this.text.split('\n');
    this.sel = this.initialSelection();
    this.errLine = 0;
    this.render();
  }
  range() { return { from: Math.min(this.sel.a, this.sel.b), to: Math.max(this.sel.a, this.sel.b) }; }
  lc(off) {
    let line = 0; let start = 0;
    for (; line < this.lines.length; line++) {
      const len = this.lines[line].length;
      if (off <= start + len) break;
      start += len + 1;
    }
    line = Math.min(line, this.lines.length - 1);
    return { line, col: off - start };
  }
  pos(line, col) {
    let off = 0;
    for (let i = 0; i < line; i++) off += this.lines[i].length + 1;
    return off + Math.max(0, Math.min(col, this.lines[line].length));
  }
  lineStart(off) { return this.text.lastIndexOf('\n', off - 1) + 1; }
  lineEnd(off) { const i = this.text.indexOf('\n', off); return i < 0 ? this.text.length : i; }
  selectedText() { const { from, to } = this.range(); return this.text.slice(from, to); }

  // ---------------------------------------------------------------- editing primitive
  replace(from, to, ins, { caret = null, select = null, kind = 'edit' } = {}) {
    const now = Date.now();
    const merge = kind === 'type' && this.lastKind === 'type' && now - this.lastTime < 1200 && !/\s/.test(ins);
    if (!merge) {
      this.history.push({ text: this.text, sel: { ...this.sel } });
      if (this.history.length > 300) this.history.shift();
    }
    this.future = [];
    this.lastKind = kind; this.lastTime = now;
    this.text = this.text.slice(0, from) + ins + this.text.slice(to);
    this.lines = this.text.split('\n');
    if (select) this.sel = { a: select[0], b: select[1] };
    else { const c = caret === null ? from + ins.length : caret; this.sel = { a: c, b: c }; }
    this.goalCol = null;
    this.errLine = 0;
    this.hideMenu();
    this.render();
    this.ensureVisible();
    this.opts.onChange?.(this.text);
  }
  replaceSel(ins, opts) { const { from, to } = this.range(); this.replace(from, to, ins, opts); }

  /** Insert a snippet; `|` in the snippet marks where the caret goes. */
  insertSnippet(snippet, { replaceBefore = 0 } = {}) {
    const { from, to } = this.range();
    const i = snippet.indexOf('|');
    const ins = i >= 0 ? snippet.slice(0, i) + snippet.slice(i + 1) : snippet;
    const start = from - replaceBefore;
    this.replace(start, to, ins, { caret: start + (i >= 0 ? i : ins.length) });
  }

  /** A single typed character with Python niceties (auto-pairs, skip-over). */
  typeChar(ch) {
    const { from, to } = this.range();
    const t = this.text;
    const next = t[to] || '';
    const prev = t[from - 1] || '';
    if (this.lang !== 'python') return this.replaceSel(ch, { kind: 'type' });
    if (from !== to && (OPEN[ch] || QUOTES.has(ch))) {
      const close = OPEN[ch] || ch;
      const inner = t.slice(from, to);
      return this.replace(from, to, ch + inner + close, { select: [from + 1, from + 1 + inner.length] });
    }
    if (from === to) {
      if ((CLOSE.has(ch) || QUOTES.has(ch)) && next === ch) {
        this.sel = { a: from + 1, b: from + 1 };
        this.lastKind = null;
        this.renderSel(); this.ensureVisible();
        return;
      }
      const freeAfter = next === '' || /[\s)\]},:;]/.test(next);
      if (OPEN[ch] && freeAfter) return this.replace(from, to, ch + OPEN[ch], { caret: from + 1, kind: 'type' });
      if (QUOTES.has(ch)) {
        if (t.slice(from - 2, from) === ch + ch && t[from - 3] !== ch) {
          return this.replace(from, to, ch + ch.repeat(3), { caret: from + 1, kind: 'type' });
        }
        if (!WORD.test(prev) && freeAfter) return this.replace(from, to, ch + ch, { caret: from + 1, kind: 'type' });
      }
    }
    this.replaceSel(ch, { kind: 'type' });
  }

  /** Text typed or pasted (may contain several characters). */
  typeText(text) {
    text = normalize(text);
    if (text.length === 1) return this.typeChar(text);
    this.replaceSel(text, { kind: 'paste' });
  }

  enter() {
    const { from, to } = this.range();
    const ls = this.lineStart(from);
    const before = this.text.slice(ls, from);
    const indent = before.match(/^ */)[0];
    if (this.lang !== 'python') return this.replace(from, to, '\n');
    let ni = indent;
    const code = stripComment(before).trimEnd();
    if (/:$/.test(code)) ni = indent + INDENT;
    else if (/[([{]$/.test(code)) ni = indent + INDENT;
    else if (/^\s*(return|pass|break|continue|raise)\b/.test(before)) ni = indent.slice(INDENT.length);
    const pair = this.text[from - 1] + (this.text[to] || '');
    if (from === to && ['()', '[]', '{}'].includes(pair)) {
      const ins = `\n${indent}${INDENT}\n${indent}`;
      return this.replace(from, to, ins, { caret: from + 1 + indent.length + INDENT.length });
    }
    // drop trailing spaces of a whitespace-only line
    if (/^ +$/.test(before) && from === to) return this.replace(ls, from, `\n${ni}`);
    this.replace(from, to, `\n${ni}`);
  }

  backspace() {
    const { from, to } = this.range();
    if (from !== to) return this.replace(from, to, '');
    if (from === 0) return;
    const t = this.text;
    const prev = t[from - 1]; const next = t[from];
    if (this.lang === 'python') {
      if ((OPEN[prev] && OPEN[prev] === next) || (QUOTES.has(prev) && prev === next && t[from - 2] !== prev)) return this.replace(from - 1, from + 1, '');
      const before = t.slice(this.lineStart(from), from);
      if (before.length && /^ +$/.test(before)) {
        const n = before.length % INDENT.length || INDENT.length;
        return this.replace(from - n, from, '');
      }
    }
    const n = /[\uDC00-\uDFFF]/.test(prev) ? 2 : 1;
    this.replace(from - n, from, '', { kind: 'del' });
  }

  deleteForward() {
    const { from, to } = this.range();
    if (from !== to) return this.replace(from, to, '');
    if (to >= this.text.length) return;
    this.replace(from, from + 1, '', { kind: 'del' });
  }

  deleteWordBack() {
    const { from, to } = this.range();
    if (from !== to) return this.replace(from, to, '');
    let i = from;
    while (i > 0 && this.text[i - 1] === ' ') i--;
    if (i > 0 && WORD.test(this.text[i - 1])) while (i > 0 && WORD.test(this.text[i - 1])) i--;
    else if (i === from && i > 0) i--;
    this.replace(i, from, '');
  }

  selectedLines() {
    const { from, to } = this.range();
    const a = this.lc(from).line;
    let b = this.lc(to).line;
    if (to > from && this.lc(to).col === 0 && b > a) b--;
    return [a, b];
  }

  mapLines(fn) {
    const [a, b] = this.selectedLines();
    const { from, to } = this.range();
    const start = this.pos(a, 0);
    const end = this.pos(b, this.lines[b].length);
    const old = this.lines.slice(a, b + 1);
    const neu = old.map(fn);
    const firstDelta = neu[0].length - old[0].length;
    const total = neu.join('\n').length - old.join('\n').length;
    const collapsed = from === to;
    this.replace(start, end, neu.join('\n'), collapsed
      ? { caret: Math.max(start, from + firstDelta) }
      : { select: [Math.max(start, from + firstDelta), to + total] });
  }

  tab() {
    const { from, to } = this.range();
    const [a, b] = this.selectedLines();
    if (from !== to && a !== b) return this.mapLines((l) => INDENT + l);
    const col = this.lc(from).col;
    this.replace(from, to, ' '.repeat(INDENT.length - (col % INDENT.length)));
  }

  dedent() { this.mapLines((l) => l.replace(/^ {1,4}/, '')); }

  toggleComment() {
    const [a, b] = this.selectedLines();
    const ls = this.lines.slice(a, b + 1).filter((l) => l.trim());
    const all = ls.length && ls.every((l) => /^\s*#/.test(l));
    const minInd = Math.min(...ls.map((l) => l.match(/^ */)[0].length), 99);
    this.mapLines((l) => {
      if (!l.trim()) return l;
      if (all) return l.replace(/^(\s*)# ?/, '$1');
      return `${l.slice(0, minInd)}# ${l.slice(minInd)}`;
    });
  }

  undo() {
    const s = this.history.pop();
    if (!s) return;
    this.future.push({ text: this.text, sel: { ...this.sel } });
    this.restore(s);
  }
  redo() {
    const s = this.future.pop();
    if (!s) return;
    this.history.push({ text: this.text, sel: { ...this.sel } });
    this.restore(s);
  }
  restore(s) {
    this.text = s.text; this.lines = this.text.split('\n'); this.sel = { ...s.sel };
    this.lastKind = null;
    this.render(); this.ensureVisible();
    this.opts.onChange?.(this.text);
  }

  // ---------------------------------------------------------------- movement
  setCaret(off, extend = false) {
    off = Math.max(0, Math.min(this.text.length, off));
    this.sel = extend ? { a: this.sel.a, b: off } : { a: off, b: off };
    this.lastKind = null;
    this.hideMenu();
    this.renderSel();
    this.ensureVisible();
  }

  move(dir, extend = false) {
    const { from, to } = this.range();
    const head = this.sel.b;
    if (!extend && from !== to && (dir === 'left' || dir === 'right')) { this.goalCol = null; return this.setCaret(dir === 'left' ? from : to); }
    const { line, col } = this.lc(head);
    let off = head;
    if (dir === 'left') off = head - (/[\uDC00-\uDFFF]/.test(this.text[head - 1] || '') ? 2 : 1);
    else if (dir === 'right') off = head + (/[\uD800-\uDBFF]/.test(this.text[head] || '') ? 2 : 1);
    else if (dir === 'up' || dir === 'down') {
      const goal = this.goalCol ?? col;
      const tl = line + (dir === 'up' ? -1 : 1);
      if (tl < 0) off = 0;
      else if (tl >= this.lines.length) off = this.text.length;
      else off = this.pos(tl, goal);
      this.setCaret(off, extend);
      this.goalCol = goal;
      return;
    } else if (dir === 'home') {
      const ind = this.lines[line].match(/^ */)[0].length;
      off = this.pos(line, col === ind ? 0 : ind);
    } else if (dir === 'end') off = this.pos(line, this.lines[line].length);
    else if (dir === 'docStart') off = 0;
    else if (dir === 'docEnd') off = this.text.length;
    else if (dir === 'wordLeft') {
      off = head;
      while (off > 0 && /\s/.test(this.text[off - 1])) off--;
      if (off > 0 && WORD.test(this.text[off - 1])) while (off > 0 && WORD.test(this.text[off - 1])) off--;
      else if (off > 0) off--;
    } else if (dir === 'wordRight') {
      off = head;
      while (off < this.text.length && /\s/.test(this.text[off])) off++;
      if (off < this.text.length && WORD.test(this.text[off])) while (off < this.text.length && WORD.test(this.text[off])) off++;
      else if (off < this.text.length) off++;
    }
    this.goalCol = null;
    this.setCaret(off, extend);
  }

  moveBy(dx, dy) {
    for (let i = 0; i < Math.abs(dy); i++) this.move(dy < 0 ? 'up' : 'down');
    for (let i = 0; i < Math.abs(dx); i++) this.move(dx < 0 ? 'left' : 'right');
  }

  selectAll() { this.sel = { a: 0, b: this.text.length }; this.renderSel(); }

  wordAt(off) {
    let a = off; let b = off;
    while (a > 0 && WORD.test(this.text[a - 1])) a--;
    while (b < this.text.length && WORD.test(this.text[b])) b++;
    if (a === b && b < this.text.length) b++;
    return [a, b];
  }

  // ---------------------------------------------------------------- commands (keyboard + shortcuts)
  command(name) {
    switch (name) {
      case 'backspace': return this.backspace();
      case 'delete': return this.deleteForward();
      case 'deleteWordBack': return this.deleteWordBack();
      case 'enter': return this.enter();
      case 'tab': return this.tab();
      case 'dedent': return this.dedent();
      case 'comment': return this.toggleComment();
      case 'undo': return this.undo();
      case 'redo': return this.redo();
      case 'selectAll': return this.selectAll();
      case 'copy': return copyText(this.selectedText());
      case 'cut': { const t = this.selectedText(); copyText(t); return this.replaceSel(''); }
      case 'paste': return this.pasteFromClipboard();
      default: return this.move(name);
    }
  }

  async pasteFromClipboard() {
    if (navigator.clipboard && navigator.clipboard.readText && window.isSecureContext) {
      try { const t = await navigator.clipboard.readText(); if (t) this.typeText(t); return; } catch { /* denied → fallback */ }
    }
    const ta = h('textarea.paste-box', { placeholder: 'Long-press here and choose Paste', rows: 5, autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' });
    modal({ title: 'Paste code', body: ta, actions: [
      { label: 'Cancel', kind: 'ghost' },
      { label: 'Insert', kind: 'primary', onClick: () => { if (ta.value) this.typeText(ta.value); } },
    ] });
    setTimeout(() => ta.focus(), 250);
  }

  /** Context for the keyboard's suggestion bar. */
  context() {
    const { from } = this.range();
    const ls = this.lineStart(from);
    const before = this.text.slice(ls, from);
    const m = before.match(/[A-Za-z_][A-Za-z0-9_]*$/);
    const prefix = m ? m[0] : '';
    const rest = before.slice(0, before.length - prefix.length);
    const objM = rest.match(/([A-Za-z_][\w]*(?:\(\))?|\)|\])\s*\.$/);
    let inString = false;
    if (this.lang === 'python') {
      const toks = tokenizePython(this.text.slice(0, from));
      const last = toks[toks.length - 1];
      if (last && (last.t === 'str' || last.t === 'fexpr' || last.t === 'sqlkw' || last.t === 'sqlstr')) {
        const body = last.v.replace(/^[rRbBfFuU]*/, '');
        const q = body.startsWith('"""') || body.startsWith("'''") ? body.slice(0, 3) : body[0];
        inString = !(body.length >= q.length * 2 && body.endsWith(q)) || last.t !== 'str';
        if (last.t === 'fexpr' && !last.v.endsWith('}')) inString = false;
      }
      if (last && last.t === 'com') inString = true;
    }
    return {
      before, prefix, inString, lang: this.lang,
      dot: /\.\s*$/.test(rest) && !/\d\.$/.test(rest),
      obj: objM ? objM[1] : null,
      lineEmpty: before.trim() === '' && prefix === '',
      indent: before.match(/^ */)[0].length,
      text: this.text,
    };
  }

  markError(line) { this.errLine = line || 0; this.render(); if (line) this.scrollToLine(line - 1); }

  scrollToLine(i) {
    this.measure();
    const top = this.padTop + i * this.lh;
    if (top < this.scroller.scrollTop || top > this.scroller.scrollTop + this.scroller.clientHeight - this.lh) this.scroller.scrollTop = Math.max(0, top - this.scroller.clientHeight / 3);
  }

  // ---------------------------------------------------------------- focus
  focus() {
    if (active && active !== this) active.blur();
    active = this;
    if (!this.focused) {
      this.focused = true;
      this.el.classList.add('focused');
      activeListeners.forEach((fn) => fn(this));
      this.opts.onFocus?.(this);
    }
    if (this.input && document.activeElement !== this.input) this.input.focus({ preventScroll: true });
    this.syncInput();
    this.renderSel();
  }
  blur() {
    if (!this.focused) return;
    this.focused = false;
    this.el.classList.remove('focused');
    this.hideMenu();
    if (this.input && document.activeElement === this.input) this.input.blur();
    if (active === this) { active = null; activeListeners.forEach((fn) => fn(null)); }
  }
  destroy() { this.blur(); this.el.remove(); }

  // ---------------------------------------------------------------- rendering
  render() {
    const lines = highlightLines(this.text, this.lang);
    let html = '';
    for (let i = 0; i < lines.length; i++) {
      html += `<div class="ed-row${i === this.errLine - 1 ? ' err' : ''}"><span class="ed-gut">${i + 1}</span><span class="ed-code">${lines[i]}</span></div>`;
    }
    this.linesEl.innerHTML = html;
    this.el.classList.toggle('empty', !this.text);
    if (!this.text && this.opts.placeholder) this.linesEl.firstElementChild.querySelector('.ed-code').innerHTML = `<span class="ed-ph">${this.opts.placeholder}</span>`;
    this.measure();
    this.renderSel();
  }

  xOf(line, col) {
    const prefix = (this.lines[line] || '').slice(0, col);
    if (/^[\x20-\x7e]*$/.test(prefix)) return col * this.cw;
    if (!Editor.ctx) Editor.ctx = document.createElement('canvas').getContext('2d');
    Editor.ctx.font = this.font;
    return Editor.ctx.measureText(prefix).width;
  }
  colAt(line, x) {
    const text = this.lines[line] || '';
    if (/^[\x20-\x7e]*$/.test(text)) return Math.max(0, Math.min(text.length, Math.round(x / this.cw)));
    let best = 0; let bestD = Infinity;
    for (let c = 0; c <= text.length; c++) {
      const d = Math.abs(this.xOf(line, c) - x);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  renderSel() {
    this.measure();
    if (!this.cw) return;
    const { from, to } = this.range();
    const head = this.lc(this.sel.b);
    this.caretX = this.codeLeft + this.xOf(head.line, head.col);
    this.caretY = this.padTop + head.line * this.lh;
    this.caret.style.transform = `translate(${this.caretX}px, ${this.caretY}px)`;
    this.caret.style.height = `${this.lh}px`;
    this.caret.classList.remove('blink'); void this.caret.offsetWidth; this.caret.classList.add('blink');
    let rects = '';
    if (from !== to) {
      const a = this.lc(from); const b = this.lc(to);
      for (let l = a.line; l <= b.line; l++) {
        const x1 = l === a.line ? this.xOf(l, a.col) : 0;
        const x2 = l === b.line ? this.xOf(l, b.col) : this.xOf(l, this.lines[l].length) + this.cw * 0.6;
        rects += `<div style="transform:translate(${this.codeLeft + x1}px,${this.padTop + l * this.lh}px);width:${Math.max(2, x2 - x1)}px;height:${this.lh}px"></div>`;
      }
    }
    this.selEl.innerHTML = rects;
    this.el.classList.toggle('has-sel', from !== to);
    this.syncInput();
    this.onUpdate?.();
  }

  ensureVisible() {
    requestAnimationFrame(() => {
      const sc = this.scroller;
      if (!this.lh) return;
      const top = this.caretY; const bottom = top + this.lh;
      if (top < sc.scrollTop + 2) sc.scrollTop = Math.max(0, top - 6);
      else if (bottom > sc.scrollTop + sc.clientHeight - 2) sc.scrollTop = bottom - sc.clientHeight + 8;
      const x = this.caretX;
      if (x < sc.scrollLeft + this.codeLeft + 2) sc.scrollLeft = Math.max(0, x - this.codeLeft - 24);
      else if (x > sc.scrollLeft + sc.clientWidth - 14) sc.scrollLeft = x - sc.clientWidth + 48;
    });
  }

  pointToOffset(clientX, clientY) {
    this.measure();
    const r = this.inner.getBoundingClientRect();
    const y = clientY - r.top - this.padTop;
    const line = Math.max(0, Math.min(this.lines.length - 1, Math.floor(y / this.lh)));
    const x = clientX - r.left - this.codeLeft;
    return this.pos(line, this.colAt(line, x));
  }

  // ---------------------------------------------------------------- touch / mouse
  bindPointer() {
    const sc = this.scroller;
    let start = null; let longTimer = 0; let lastTap = { t: 0, x: 0, y: 0 }; let dragging = false; let tapEnded = 0;
    sc.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') {
        if (e.button !== 0) return;
        e.preventDefault();
        const off = this.pointToOffset(e.clientX, e.clientY);
        if (e.detail === 2) { const [a, b] = this.wordAt(off); this.sel = { a, b }; this.renderSel(); }
        else if (e.detail >= 3) { const l = this.lc(off).line; this.sel = { a: this.pos(l, 0), b: Math.min(this.text.length, this.pos(l, this.lines[l].length) + 1) }; this.renderSel(); }
        else this.setCaret(off, e.shiftKey);
        dragging = e.detail < 2;
        sc.setPointerCapture(e.pointerId);
        this.focus();
        return;
      }
      start = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false, long: false };
      clearTimeout(longTimer);
      longTimer = setTimeout(() => {
        if (!start || start.moved) return;
        start.long = true;
        const off = this.pointToOffset(start.x, start.y);
        const [a, b] = this.wordAt(off);
        this.sel = { a, b };
        this.focus();
        this.renderSel();
        haptic();
        this.showMenu();
      }, 480);
    });
    sc.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        if (dragging && e.buttons & 1) this.setCaret(this.pointToOffset(e.clientX, e.clientY), true);
        return;
      }
      if (start && (Math.abs(e.clientX - start.x) > 8 || Math.abs(e.clientY - start.y) > 8)) { start.moved = true; clearTimeout(longTimer); }
    });
    const end = (e) => {
      if (e.pointerType === 'mouse') { dragging = false; return; }
      clearTimeout(longTimer);
      if (!start) return;
      const s = start; start = null;
      if (s.moved || s.long || e.type === 'pointercancel') return;
      const off = this.pointToOffset(e.clientX, e.clientY);
      const now = Date.now();
      const dbl = now - lastTap.t < 320 && Math.abs(e.clientX - lastTap.x) < 24 && Math.abs(e.clientY - lastTap.y) < 24;
      lastTap = { t: dbl ? 0 : now, x: e.clientX, y: e.clientY };
      tapEnded = now;
      this.focus();
      if (dbl) { const [a, b] = this.wordAt(off); this.sel = { a, b }; this.renderSel(); this.showMenu(); }
      else if (this.menu.classList.contains('show') || this.range().from === this.range().to || !(off >= this.range().from && off <= this.range().to)) this.setCaret(off);
      else this.showMenu();
    };
    sc.addEventListener('pointerup', end);
    // A tap may open the keyboard and shift the layout; swallow the synthetic
    // click so it can't land on whatever moved under the finger.
    sc.addEventListener('touchend', (e) => { if (Date.now() - tapEnded < 80) e.preventDefault(); }, { passive: false });
    sc.addEventListener('pointercancel', end);
    sc.addEventListener('contextmenu', (e) => { if (isTouch()) e.preventDefault(); });
  }

  showMenu() {
    const has = this.range().from !== this.range().to;
    const items = has
      ? [['Cut', 'cut'], ['Copy', 'copy'], ['Paste', 'paste'], ['Select all', 'selectAll']]
      : [['Paste', 'paste'], ['Select all', 'selectAll']];
    this.menu.replaceChildren(...items.map(([label, cmd]) => h('button', {
      onpointerdown: (e) => e.preventDefault(),
      onclick: (e) => { e.stopPropagation(); this.hideMenu(); this.command(cmd); if (cmd === 'selectAll') this.showMenu(); },
    }, label)));
    const sc = this.scroller.getBoundingClientRect();
    const r = this.inner.getBoundingClientRect();
    const y = Math.max(4, r.top - sc.top + this.caretY - 44);
    const x = Math.min(Math.max(4, r.left - sc.left + this.caretX - 80), sc.width - 230);
    this.menu.style.transform = `translate(${Math.max(4, x)}px, ${y}px)`;
    this.menu.classList.add('show');
  }
  hideMenu() { this.menu?.classList.remove('show'); }

  // ---------------------------------------------------------------- desktop textarea
  syncInput() {
    if (!this.input || this.composing) return;
    const t = this.selectedText();
    if (this.input.value !== t) this.input.value = t;
    if (document.activeElement === this.input) this.input.select();
  }

  bindDesktop() {
    const ta = this.input;
    ta.addEventListener('focus', () => { if (!this.focused) this.focus(); });
    ta.addEventListener('blur', () => this.blur());
    ta.addEventListener('compositionstart', () => { this.composing = true; });
    ta.addEventListener('compositionend', (e) => {
      this.composing = false;
      if (e.data) this.typeText(e.data);
      ta.value = ''; this.syncInput();
    });
    ta.addEventListener('input', (e) => {
      if (this.composing || e.isComposing) return;
      const v = ta.value;
      if (e.inputType === 'deleteByCut') { this.replaceSel(''); return; }
      if (e.inputType && e.inputType.startsWith('delete')) { this.syncInput(); return; }
      if (v) this.typeText(v);
      ta.value = ''; this.syncInput();
    });
    ta.addEventListener('paste', (e) => {
      e.preventDefault();
      const t = e.clipboardData?.getData('text/plain');
      if (t) this.typeText(t);
    });
    ta.addEventListener('copy', (e) => { e.preventDefault(); e.clipboardData.setData('text/plain', this.selectedText()); });
    ta.addEventListener('cut', (e) => { e.preventDefault(); e.clipboardData.setData('text/plain', this.selectedText()); this.replaceSel(''); });
    ta.addEventListener('keydown', (e) => this.onKey(e));
  }

  onKey(e) {
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key;
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    if (e.isComposing || this.composing) return;
    if (mod && k === 'Enter') { stop(); this.opts.onSubmit?.(); return; }
    if (e.shiftKey && k === 'Enter' && this.opts.onRun) { stop(); this.opts.onRun(); return; }
    if (mod && (k === 'z' || k === 'Z')) { stop(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (mod && (k === 'y' || k === 'Y')) { stop(); this.redo(); return; }
    if (mod && (k === 'a' || k === 'A')) { stop(); this.selectAll(); return; }
    if (mod && k === '/') { stop(); this.toggleComment(); return; }
    if (mod && (k === 'c' || k === 'x' || k === 'v' || k === 'C' || k === 'X' || k === 'V')) return; // native copy/cut/paste events
    const ext = e.shiftKey;
    const arrows = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Home: 'home', End: 'end' };
    if (arrows[k]) {
      stop();
      let dir = arrows[k];
      if (e.altKey && (dir === 'left' || dir === 'right')) dir = dir === 'left' ? 'wordLeft' : 'wordRight';
      if (e.metaKey && dir === 'left') dir = 'home';
      if (e.metaKey && dir === 'right') dir = 'end';
      if (e.metaKey && dir === 'up') dir = 'docStart';
      if (e.metaKey && dir === 'down') dir = 'docEnd';
      this.move(dir, ext);
      return;
    }
    if (k === 'Backspace') {
      stop();
      if (e.metaKey && this.range().from === this.range().to) { const p = this.range().from; this.replace(this.lineStart(p), p, ''); } else if (e.altKey) this.deleteWordBack(); else this.backspace();
      return;
    }
    if (k === 'Delete') { stop(); this.deleteForward(); return; }
    if (k === 'Enter') { stop(); this.enter(); return; }
    if (k === 'Tab') { stop(); if (e.shiftKey) this.dedent(); else this.tab(); return; }
    if (k === 'Escape') { stop(); this.blur(); return; }
  }
}

function normalize(s) {
  return String(s).replace(/\r\n?/g, '\n').replace(/\t/g, INDENT);
}

function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; } else if (c === '"' || c === "'") q = c;
    else if (c === '#') return line.slice(0, i);
  }
  return line;
}
