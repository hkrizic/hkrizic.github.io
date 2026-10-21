// Lesson / review / drill session player (Duolingo-style flow).
import { createStep } from './steps.js';
import { Editor } from './editor.js';
import { getKeyboard } from './kbhost.js';
import { highlight } from './highlight.js';
import { md } from './md.js';
import { store } from './store.js';
import { h, icon, sound, confetti, mascot, confirmModal, isTouch, fmtTime, haptic } from './ui.js';

const PRAISE = ['Nice!', 'Correct!', 'Great job!', 'You got it!', 'Excellent!', 'Nailed it!', 'Spot on!'];
const XP_FOR = { choice: 2, output: 3, blanks: 2, order: 3, code: 6 };

/**
 * runSession({ title, items:[{step,key}], mode:'lesson'|'review'|'drill', lessonId, color, next, onExit })
 */
export function runSession(cfg) {
  const { items, mode = 'lesson', lessonId, onExit } = cfg;
  const root = h('div.lesson');
  root.style.setProperty('--uc', cfg.color || 'var(--good)');
  const bar = h('i');
  const combo = h('div.combo');
  const kbToggle = h('button.iconbtn.kb-toggle', { title: 'Show the Python keyboard', 'aria-label': 'Toggle on-screen keyboard' }, icon('keyboard', 22));
  const top = h('div.lesson-top',
    h('button.iconbtn', { 'aria-label': 'Close', onclick: () => close() }, icon('x', 24)),
    h('div.progress', bar), combo, isTouch() ? null : kbToggle);
  const body = h('div.lesson-body');
  const footInner = h('div.foot-inner');
  const foot = h('div.lesson-foot', footInner);
  const dock = h('div.dock');
  const sheet = h('div.sheet');
  root.append(top, body, foot, dock, sheet);
  document.body.append(root);

  const kb = getKeyboard();
  const queue = items.map((_, i) => i);
  let pos = Math.min(cfg.startAt || 0, items.length - 1);
  let view = null;
  let done = pos;
  let streak = 0;
  let xp = 0;
  let sheetOpen = false;
  let finished = false;
  let busy = false;
  const first = new Map();     // item index -> first-try correct
  const attempts = new Map();
  const t0 = Date.now();
  const exerciseCount = items.filter((it) => it.step.type !== 'learn').length;

  const offActive = Editor.onActive(() => updateDock());
  kbToggle.onclick = () => { store.setting('kbDesktop', !store.s.settings.kbDesktop); updateDock(); };

  function updateDock() {
    const ed = Editor.active;
    const show = !finished && !sheetOpen && (isTouch() ? !!ed : store.s.settings.kbDesktop && !!(view && (view.editor || ed)));
    kbToggle.classList.toggle('on', !!store.s.settings.kbDesktop);
    if (show) {
      if (kb.el.parentNode !== dock) dock.append(kb.el);
      if (!ed && view?.editor) view.editor.focus();
      kb.attach(Editor.active);
    } else if (kb.el.parentNode === dock) kb.el.remove();
    root.classList.toggle('kb-open', show);
  }
  kb.onHide = () => { Editor.active?.blur(); updateDock(); };

  function setProgress() {
    bar.style.width = `${Math.max(3, (done / items.length) * 100)}%`;
    combo.replaceChildren(...(streak >= 3 ? [icon('flame', 18), String(streak)] : []));
  }

  function show() {
    view?.destroy();
    const idx = queue[pos];
    const it = items[idx];
    view = createStep(it.step, {
      mode: 'lesson', key: it.key, attempt: attempts.get(idx) || 0,
      onChange: () => renderFoot(),
      onSubmit: () => primary(),
      onEditor: () => updateDock(),
      autoFocus: !isTouch(),
    });
    body.replaceChildren(view.el);
    window.__pd = { step: it.step, view }; // test hook
    body.classList.toggle('fill', !!view.fill);
    body.classList.toggle('split', !!view.split);
    body.scrollTop = 0;
    renderFoot();
    updateDock();
    if (!isTouch() && view.editor && it.step.type === 'code') setTimeout(() => view.editor.focus(), 80);
  }

  function renderFoot() {
    if (!view) return;
    const t = view.kind;
    const btns = [];
    if (t === 'learn') btns.push(h('button.btn.primary', { onclick: () => primary() }, 'Continue'));
    else if (t === 'code') {
      btns.push(h('button.btn.ghost', { onclick: () => runCode(), disabled: busy }, icon('play', 18), 'Run'));
      btns.push(h('button.btn.primary', { onclick: () => primary(), disabled: busy }, busy ? 'Checking…' : 'Check'));
    } else btns.push(h('button.btn.primary', { onclick: () => primary(), disabled: !view.ready() || busy }, 'Check'));
    footInner.replaceChildren(...btns);
  }

  async function runCode() {
    if (busy) return;
    busy = true; renderFoot();
    try { await view.run(); } finally { busy = false; renderFoot(); updateDock(); }
  }

  async function primary() {
    if (sheetOpen) return advance();
    if (busy || !view) return;
    const idx = queue[pos];
    const it = items[idx];
    if (view.kind === 'learn') { done++; setProgress(); return next(); }
    if (!view.ready()) return;
    busy = true; renderFoot();
    Editor.active?.blur();
    let res;
    try { res = await view.check(); } finally { busy = false; }
    view.reveal?.(res);
    const firstTry = !first.has(idx);
    if (firstTry) {
      first.set(idx, res.correct && !view.solutionShown && !(view.hintsUsed > 1));
      store.markResult(it.key, res.correct, { inReview: mode === 'review' });
    }
    if (view.kind === 'code' && !res.correct) {
      sound.wrong(); haptic();
      streak = 0; setProgress();
      renderFoot(); updateDock();
      return;
    }
    if (res.correct) {
      sound.correct();
      done++; streak++;
      xp += first.get(idx) ? XP_FOR[it.step.type] || 2 : 1;
      store.markResult(it.key, true, { inReview: false });
    } else {
      sound.wrong(); haptic();
      streak = 0;
      attempts.set(idx, (attempts.get(idx) || 0) + 1);
      queue.push(idx);
    }
    setProgress();
    openSheet(res, it.step);
  }

  function openSheet(res, step) {
    sheetOpen = true;
    updateDock();
    const good = res.correct;
    const title = good ? (streak >= 3 && streak % 3 === 0 ? `${streak} in a row!` : PRAISE[Math.floor(Math.random() * PRAISE.length)]) : 'Not quite';
    const parts = [h('div.sheet-title', h('span.badge-ic', icon(good ? 'check' : 'x', 20)), title)];
    if (res.note) parts.push(h('div', { style: { fontWeight: 700, marginBottom: '6px' } }, res.note));
    if (!good && res.correctText !== undefined) {
      parts.push(h('div', { style: { fontWeight: 800 } }, step.type === 'output' ? 'Correct output:' : 'Correct answer:'));
      parts.push(h('div.answer-box', { html: res.lang === 'python' ? highlight(res.correctText) : escapeHtml(res.correctText) }));
    }
    if (step.explain) parts.push(h('div.explain', h('div.prose', { html: md(step.explain) })));
    const cont = h('button.btn', { onclick: () => advance() }, good ? 'Continue' : 'Got it');
    const actions = h('div.actions', cont);
    if (good && step.type === 'code') {
      actions.prepend(h('button.btn.ghost', { onclick: () => view.showSolution() }, icon('eye', 18), 'Solution'));
    }
    parts.push(actions);
    sheet.className = `sheet ${good ? 'good' : 'bad'}`;
    sheet.replaceChildren(h('div.sheet-inner', parts));
    requestAnimationFrame(() => sheet.classList.add('show'));
    footInner.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    setTimeout(() => cont.focus({ preventScroll: true }), 50);
  }

  function advance() {
    sheetOpen = false;
    sheet.classList.remove('show');
    next();
  }

  function next() {
    pos++;
    if (pos >= queue.length) return finish();
    show();
  }

  function finish() {
    finished = true;
    view?.destroy(); view = null;
    updateDock();
    const firstOk = [...first.values()].filter(Boolean).length;
    const acc = exerciseCount ? Math.round((firstOk / exerciseCount) * 100) : 100;
    const prev = lessonId ? store.s.lessons[lessonId] : null;
    let bonus = mode === 'lesson' ? (prev ? 5 : 10) : 5;
    if (acc === 100 && exerciseCount) bonus += 5;
    xp += bonus;
    if (mode === 'lesson' && lessonId) store.lessonDone(lessonId, acc);
    const { streakUp } = store.activity(xp);
    const secs = (Date.now() - t0) / 1000;
    sound.done();
    confetti();
    footInner.replaceChildren(
      ...(cfg.next ? [h('button.btn.ghost', { onclick: () => { exit(); cfg.next(); } }, 'Next lesson')] : []),
      h('button.btn.primary', { onclick: () => exit() }, 'Continue'));
    const msg = mode === 'review' ? 'Review complete!' : mode === 'drill' ? 'Drill complete!' : 'Lesson complete!';
    const tiles = h('div.tiles',
      tile('Total XP', [icon('bolt', 20), `${xp}`], 'var(--gold)'),
      tile(acc >= 90 ? 'Amazing' : acc >= 70 ? 'Good' : 'Accuracy', `${acc}%`, 'var(--good)'),
      tile('Time', [icon('clock', 18), fmtTime(secs)], 'var(--accent)'));
    const streakNote = streakUp ? h('div.pill', { style: { color: 'var(--flame)', borderColor: 'var(--flame)' } }, icon('flame', 16), `${store.streak()} day streak!`) : null;
    body.classList.remove('fill', 'split');
    body.replaceChildren(h('div.done-screen', mascot(150, acc >= 70 ? 'happy' : 'wow'), h('h1', msg),
      h('p.muted', { style: { margin: 0 } }, cfg.title || ''), tiles, streakNote,
      acc < 70 && mode === 'lesson' ? h('p.muted.small', { style: { maxWidth: '320px' } }, 'Tip: mistakes are saved to Practice → Review, so you can drill them later.') : null));
    bar.style.width = '100%';
  }

  function tile(label, value, color) {
    const t = h('div.tile', h('div.tl', label), h('div.tv', value));
    t.style.setProperty('--tc', color);
    return t;
  }

  async function close() {
    if (!finished && done > 0) {
      const ok = await confirmModal('Quit this lesson?', 'Your progress in this lesson will be lost (your saved code drafts stay).', 'Quit', 'danger');
      if (!ok) return;
    }
    exit();
  }

  function onKey(e) {
    if (Editor.active && !isTouch()) return;
    if (document.querySelector('.modal-wrap')) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (finished) return exit();
      primary();
      return;
    }
    if (!sheetOpen && view?.onKey && !e.metaKey && !e.ctrlKey && view.onKey(e)) { e.preventDefault(); renderFoot(); }
  }
  document.addEventListener('keydown', onKey);

  function exit() {
    document.removeEventListener('keydown', onKey);
    offActive();
    view?.destroy();
    if (kb.el.parentNode === dock) kb.el.remove();
    root.remove();
    onExit?.({ finished });
  }

  setProgress();
  show();
  return { close: exit };
}

function escapeHtml(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
