// Step views: one renderer per exercise type, shared by lessons and exams.
//
// createStep(step, opts) → view
//   view.el            DOM node
//   view.fill          true when the body should use the full-height layout
//   view.ready()       an answer has been given
//   view.check()       → Promise<{ correct, score, correctText?, detail?, note? }>
//   view.reveal(res)   mark right/wrong in the UI after checking
//   view.answer()      serialisable answer (exams)
//   view.editor        the Editor, when there is one
import { md } from './md.js';
import { highlight, esc } from './highlight.js';
import { Editor } from './editor.js';
import { Py } from './runner.js';
import { normOut } from './pycore.js';
import { drafts, store } from './store.js';
import { h, icon, shuffle, copyText, toast, modal } from './ui.js';

const KIND_LABEL = {
  learn: ['book', 'New concept'], choice: ['target', 'Choose the answer'], output: ['terminal', 'Predict the output'],
  blanks: ['code', 'Fill in the blanks'], order: ['code', 'Arrange the code'], code: ['code', 'Write the code'],
};

function kindHead(step) {
  let [ic, label] = KIND_LABEL[step.type];
  if (step.type === 'code' && step.kind === 'fix') { ic = 'bulb'; label = 'Fix the bug'; }
  return h(`div.step-kind.${step.type === 'learn' ? 'learn' : step.kind === 'fix' ? 'fix' : 'x'}`, icon(ic, 16), label);
}

const prose = (src, cls = '') => h(`div.prose${cls ? `.${cls}` : ''}`, { html: md(src) });
const codeBlock = (code, lang = 'python') => h('pre.codeblock', { html: highlight(code, lang) });
const seedOf = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const fontSize = () => store.s.settings.font || 15;

/** Render a run's output segments into a console element. */
export function renderConsole(out = [], error = null) {
  const el = h('div.console');
  for (const seg of out) {
    if (seg.t === 'text') el.append(seg.v);
    else if (seg.t === 'err') el.append(h('span.c-warn', seg.v));
    else if (seg.t === 'html') el.append(h('div.c-html', { html: seg.v.replace(/<style[\s\S]*?<\/style>/g, '') }));
    else if (seg.t === 'img') el.append(h('img', { src: `data:image/png;base64,${seg.v}`, alt: 'chart' }));
  }
  if (error) {
    if (el.childNodes.length && !/\n$/.test(el.textContent)) el.append('\n');
    el.append(h('span.c-err', error.tb || `${error.type}: ${error.msg}`));
    if (error.hint) el.append(h('span.c-hint', '💡 ', error.hint));
  }
  return el;
}

export function createStep(step, opts = {}) {
  const fn = { learn: learnView, choice: choiceView, output: outputView, blanks: blanksView, order: orderView, code: codeView }[step.type];
  const view = fn(step, opts);
  view.step = step;
  view.kind = step.type;
  return view;
}

// ------------------------------------------------------------------ learn
function learnView(step, opts) {
  const el = h('div.step', kindHead(step), h('h2', step.title), prose(step.body));
  const view = { el, ready: () => true, check: async () => ({ correct: true, score: 1 }), answer: () => null, destroy() { view.editor?.destroy(); } };
  if (step.code) {
    const card = h('div.code-card');
    let pre = codeBlock(step.code);
    let out = null;
    const runBtn = h('button.btn.small.blue', icon('play', 16), 'Run');
    const editBtn = h('button.btn.small.ghost', icon('code', 16), 'Edit');
    const resetBtn = h('button.btn.small.flat.hidden', icon('reset', 16), 'Reset');
    const bar = h('div.bar', runBtn, editBtn, h('span.spacer'), resetBtn);
    card.append(pre, bar);
    const current = () => (view.editor ? view.editor.value : step.code);
    runBtn.onclick = async () => {
      view.editor?.blur();
      runBtn.disabled = true;
      const spin = h('div.console', h('span.c-dim', 'Running…'));
      if (out) out.replaceWith(spin); else card.append(spin);
      out = spin;
      const r = await Py.run(current(), { setup: step.setup || '' });
      const c = renderConsole(r.out, r.error);
      out.replaceWith(c); out = c;
      if (view.editor) view.editor.markError(r.error?.line || 0);
      runBtn.disabled = false;
      opts.onRun?.();
    };
    editBtn.onclick = () => {
      if (view.editor) return;
      const ed = new Editor({ value: step.code, fontSize: fontSize(), onRun: () => runBtn.click() });
      ed.el.style.minHeight = `${Math.min(14, step.code.split('\n').length + 2) * Math.round(fontSize() * 1.6) + 20}px`;
      pre.replaceWith(ed.el);
      requestAnimationFrame(() => { ed.measure(true); ed.renderSel(); ed.focus(); });
      view.editor = ed;
      editBtn.classList.add('hidden');
      resetBtn.classList.remove('hidden');
      opts.onEditor?.(ed);
    };
    resetBtn.onclick = () => { view.editor?.setValue(step.code); };
    el.append(card);
    Py.warm(`${step.setup || ''}\n${step.code}`);
  }
  return view;
}

// ------------------------------------------------------------------ choice
const looksCode = (s) => /[()[\]{}=<>'"_]|^\s*-?\d|\n|^[A-Z]\w+Error/.test(s);
function choiceView(step, opts) {
  const n = step.options.length;
  const fixed = step.options.some((o) => /all of the above|none of the above|both of these/i.test(o));
  const order = fixed ? [...Array(n).keys()] : shuffle([...Array(n).keys()], seedOf(opts.key || step.prompt) + (opts.attempt || 0));
  let sel = opts.restore ?? null;
  const mono = !!step.code || step.options.every(looksCode);
  const btns = [];
  const list = h('div.opts');
  order.forEach((oi, pos) => {
    const txt = step.options[oi].replace(/^`([^`]+)`$/, '$1');
    const b = h(`button.opt${mono ? '.mono' : ''}`, { 'data-i': oi },
      h('span.num', String(pos + 1)),
      h('span.txt', { html: mono ? esc(txt) : md(txt).replace(/^<p>|<\/p>$/g, '') }));
    b.onclick = () => pick(oi);
    btns.push(b);
    list.append(b);
  });
  function pick(oi) {
    sel = oi;
    btns.forEach((b) => b.classList.toggle('sel', +b.dataset.i === oi));
    opts.onChange?.();
  }
  if (sel !== null) pick(sel);
  const el = h('div.step', kindHead(step), prose(step.prompt, 'prompt'), step.code && codeBlock(step.code), list);
  return {
    el,
    ready: () => sel !== null,
    answer: () => sel,
    onKey(e) {
      const d = parseInt(e.key, 10);
      if (d >= 1 && d <= n) { pick(order[d - 1]); return true; }
      return false;
    },
    async check() {
      const correct = sel === step.answer;
      return { correct, score: correct ? 1 : 0, correctText: step.options[step.answer] };
    },
    reveal() {
      list.classList.add('locked');
      btns.forEach((b) => {
        const i = +b.dataset.i;
        b.classList.toggle('right', i === step.answer);
        b.classList.toggle('wrong', i === sel && i !== step.answer);
      });
    },
    destroy() {},
  };
}

// ------------------------------------------------------------------ output
function outputView(step, opts) {
  const ed = new Editor({ lang: 'text', value: opts.restore || '', fontSize: fontSize(), placeholder: 'Type the exact output…', onChange: () => { opts.onChange?.(); } });
  ed.sel = { a: ed.text.length, b: ed.text.length };
  const el = h('div.step', kindHead(step), prose(step.prompt || 'What does this print?', 'prompt'), codeBlock(step.code),
    h('div.answer-label', 'Your answer'), h('div.answer-ed', ed.el));
  setTimeout(() => { ed.measure(true); ed.renderSel(); opts.autoFocus !== false && ed.focus(); }, 60);
  return {
    el, editor: ed,
    ready: () => ed.value.trim().length > 0,
    answer: () => ed.value,
    async check() {
      const got = normOut(ed.value);
      const want = normOut(step.answer);
      if (got === want) return { correct: true, score: 1 };
      const loose = (s) => s.replace(/,\s*/g, ', ').replace(/:\s*/g, ': ').replace(/[ \t]+/g, ' ');
      if (loose(got) === loose(want)) return { correct: true, score: 1, note: 'Almost perfect: watch the exact spacing.', correctText: step.answer };
      return { correct: false, score: 0, correctText: step.answer };
    },
    reveal() {},
    destroy() { ed.destroy(); },
  };
}

// ------------------------------------------------------------------ blanks
function blanksView(step, opts) {
  const parts = step.code.split('___');
  const nBlanks = parts.length - 1;
  const fill = opts.restore ? [...opts.restore] : Array(nBlanks).fill(null); // bank indexes
  let active = fill.indexOf(null);
  const bankOrder = shuffle(step.bank.map((_, i) => i), seedOf(opts.key || step.code));
  const codeEl = h('div.blank-code');
  const slots = [];
  parts.forEach((p, i) => {
    codeEl.append(h('span', { html: highlight(p) }));
    if (i < nBlanks) {
      const s = h('span.blank-slot', { role: 'button' });
      s.onclick = () => { if (fill[i] !== null) { fill[i] = null; active = i; } else active = i; sync(); opts.onChange?.(); };
      slots.push(s);
      codeEl.append(s);
    }
  });
  const toks = bankOrder.map((bi) => {
    const t = h('button.tok', step.bank[bi]);
    t.onclick = () => {
      let target = active >= 0 && fill[active] === null ? active : fill.indexOf(null);
      if (target < 0) return;
      fill[target] = bi;
      active = fill.indexOf(null);
      sync(); opts.onChange?.();
    };
    t._bi = bi;
    return t;
  });
  function sync() {
    slots.forEach((s, i) => {
      s.textContent = fill[i] === null ? '' : step.bank[fill[i]];
      s.classList.toggle('filled', fill[i] !== null);
      s.classList.toggle('active', i === active && fill[i] === null);
    });
    toks.forEach((t) => t.classList.toggle('used', fill.includes(t._bi)));
  }
  sync();
  const el = h('div.step', kindHead(step), prose(step.prompt, 'prompt'), codeEl, h('div.bank', toks));
  const answerTokens = () => fill.map((bi) => (bi === null ? null : step.bank[bi]));
  return {
    el,
    ready: () => fill.every((x) => x !== null),
    answer: () => [...fill],
    onKey(e) {
      const d = parseInt(e.key, 10);
      if (d >= 1 && d <= toks.length) { toks[d - 1].click(); return true; }
      if (e.key === 'Backspace') { const last = fill.map((x, i) => (x !== null ? i : -1)).filter((i) => i >= 0).pop(); if (last !== undefined) { fill[last] = null; active = last; sync(); opts.onChange?.(); } return true; }
      return false;
    },
    async check() {
      const got = answerTokens();
      const ok = [step.answer, ...(step.accept || [])].some((a) => a.every((t, i) => t === got[i]));
      let i = 0;
      return { correct: ok, score: ok ? 1 : 0, correctText: step.code.replace(/___/g, () => step.answer[i++]), lang: 'python' };
    },
    reveal(res) {
      slots.forEach((s, i) => {
        const ok = res.correct || answerTokens()[i] === step.answer[i];
        s.classList.add(ok ? 'right' : 'wrong');
      });
      toks.forEach((t) => { t.disabled = true; });
      slots.forEach((s) => { s.onclick = null; });
    },
    destroy() {},
  };
}

// ------------------------------------------------------------------ order
function orderView(step, opts) {
  const all = [...step.lines.map((l, i) => ({ text: l, real: i })), ...(step.distractors || []).map((l) => ({ text: l, real: -1 }))];
  const bankOrder = shuffle(all.map((_, i) => i), seedOf(opts.key || step.lines.join()));
  const placed = opts.restore ? [...opts.restore] : [];
  const area = h('div.order-area');
  const bank = h('div.line-bank');
  const bankBtns = bankOrder.map((ai) => {
    const b = h('button.line-tok', { html: highlight(all[ai].text) || '&nbsp;' });
    b.onclick = () => { placed.push(ai); sync(); opts.onChange?.(); };
    b._ai = ai;
    return b;
  });
  bank.append(...bankBtns);
  function sync() {
    area.replaceChildren(...placed.map((ai, pos) => {
      const b = h('button.line-tok.placed', { html: highlight(all[ai].text) || '&nbsp;' });
      b.onclick = () => { placed.splice(pos, 1); sync(); opts.onChange?.(); };
      return b;
    }));
    area.classList.toggle('empty', placed.length === 0);
    bankBtns.forEach((b) => b.classList.toggle('used', placed.includes(b._ai)));
  }
  sync();
  const el = h('div.step', kindHead(step), prose(step.prompt, 'prompt'), area, bank);
  const program = () => placed.map((ai) => all[ai].text).join('\n');
  return {
    el,
    ready: () => placed.length === step.lines.length,
    answer: () => [...placed],
    async check() {
      const exact = placed.length === step.lines.length && placed.every((ai, i) => all[ai].real === i);
      let correct = exact;
      if (!exact && step.tests && step.tests.length && placed.every((ai) => all[ai].real >= 0)) {
        const r = await Py.check({ setup: step.setup || '', solution: step.lines.join('\n'), tests: step.tests }, program());
        correct = !!r.passed;
      }
      return { correct, score: correct ? 1 : 0, correctText: step.lines.join('\n'), lang: 'python' };
    },
    reveal(res) {
      [...area.children].forEach((b, i) => b.classList.add(res.correct || all[placed[i]].real === i ? 'right' : 'wrong'));
      bankBtns.forEach((b) => { b.disabled = true; });
      [...area.children].forEach((b) => { b.onclick = null; });
    },
    destroy() {},
  };
}

// ------------------------------------------------------------------ code
function codeView(step, opts) {
  const mode = opts.mode || 'lesson';
  const draftKey = opts.key ? `${mode}.${opts.key}` : null;
  const saved = opts.restore ?? (mode === 'lesson' && draftKey ? drafts.get(draftKey) : null);
  let saveTimer = 0;
  const ed = new Editor({
    value: saved ?? step.starter,
    fontSize: fontSize(),
    onChange: () => {
      opts.onChange?.();
      if (draftKey && mode === 'lesson') { clearTimeout(saveTimer); saveTimer = setTimeout(() => drafts.set(draftKey, ed.value), 400); }
    },
    onSubmit: () => opts.onSubmit?.(),
    onRun: () => view.run(),
    onFocus: () => { collapseResults(true); if (!wide && !pinned && innerHeight < 1000) setCollapsed(true); },
  });

  const wide = matchMedia('(min-width: 900px)').matches;
  const hintsEl = h('div.hints');
  let hintsShown = 0;
  const hintBtn = h('button.task-toggle', icon('bulb', 14), 'Hint');
  const resetBtn = h('button.task-toggle', icon('reset', 14), 'Reset');
  const toggle = h('button.task-toggle', icon('chevronD', 14));
  const taskScroll = h('div.task-scroll', prose(step.prompt), hintsEl);
  const task = h('div.task',
    h('div.task-head', kindHead(step), h('span.spacer'), mode === 'lesson' && (step.hints || []).length ? hintBtn : null, resetBtn, wide ? null : toggle),
    step.title ? h('h2', { style: { fontSize: '18px', margin: '0 0 4px' } }, step.title) : null,
    taskScroll);
  if (step.points && mode !== 'lesson') task.querySelector('.task-head').prepend(h('span.qpoints', `${step.points} pts`));
  hintBtn.onclick = () => {
    const hs = step.hints || [];
    if (hintsShown >= hs.length) return;
    hintsEl.append(h('div.hint', h('div.prose', { html: md(`**Hint ${hintsShown + 1}/${hs.length}:** ${hs[hintsShown]}`) })));
    hintsShown++;
    task.classList.remove('collapsed');
    view.hintsUsed = hintsShown;
    if (hintsShown >= hs.length) hintBtn.disabled = true;
    taskScroll.scrollTop = taskScroll.scrollHeight;
  };
  resetBtn.onclick = () => {
    ed.setValue(step.starter, { keepHistory: true });
    if (draftKey) drafts.clear(draftKey);
    opts.onChange?.();
  };
  let pinned = false;
  toggle.onclick = () => { pinned = task.classList.contains('collapsed'); setCollapsed(!task.classList.contains('collapsed')); };
  function setCollapsed(c) {
    task.classList.toggle('collapsed', c);
    toggle.replaceChildren(icon(c ? 'chevronD' : 'chevronD', 14), c ? 'Task' : '');
    toggle.style.transform = c ? '' : 'rotate(180deg)';
  }

  // results panel
  const results = h('div.results.empty');
  const resHead = h('div.results-head');
  const resBody = h('div.results-body');
  results.append(resHead, resBody);
  resHead.onclick = () => collapseResults(!results.classList.contains('collapsed'));
  function collapseResults(c) { if (!results.classList.contains('empty')) results.classList.toggle('collapsed', c); }
  function showResults(kind, headNodes, bodyNodes) {
    results.className = `results ${kind}`;
    resHead.replaceChildren(h('span.sum', ...headNodes), icon('chevronD', 18));
    resBody.replaceChildren(...bodyNodes.filter(Boolean));
    resBody.scrollTop = 0;
  }

  const edHost = h('div.ed-host', ed.el);
  const codeCol = h('div.code-col', edHost, results);
  const taskCol = h('div.task-col', task);
  const body = h(`div.step-code${wide ? '.split' : ''}`, taskCol, codeCol);
  const el = h('div.step', body);
  if (!wide && (step.prompt.length > 240 || saved)) setCollapsed(!!saved);
  setTimeout(() => { ed.measure(true); ed.renderSel(); }, 50);
  Py.warm(`${step.setup || ''}\n${step.starter}\n${step.solution}`);

  const spec = { setup: step.setup || '', solution: step.solution, tests: step.tests, require: step.require, forbid: step.forbid };
  const view = {
    el, editor: ed, fill: true, split: wide, hintsUsed: 0, attempts: 0,
    ready: () => true,
    answer: () => ed.value,
    async run() {
      ed.blur();
      showResults('run', [h('span.running', h('span.spinner'), 'Running…')], []);
      if (mode !== 'lesson') {
        const sample = { ...spec, tests: (step.tests || []).filter((t) => !t.hidden) };
        const r = await Py.check(sample, ed.value, { timeoutMs: 10000 });
        renderCheck(r, { sample: true });
        return r;
      }
      const r = await Py.run(ed.value, { setup: spec.setup });
      ed.markError(r.error?.line || 0);
      showResults(r.error ? 'bad' : 'run',
        [icon(r.error ? 'x' : 'terminal', 18), r.error ? `${r.error.type}${r.error.line ? ` on line ${r.error.line}` : ''}` : 'Output'],
        [renderConsole(r.out, r.error)]);
      return r;
    },
    async check() {
      ed.blur();
      view.attempts++;
      showResults('run', [h('span.running', h('span.spinner'), 'Checking…')], []);
      const r = await Py.check(spec, ed.value, { timeoutMs: 12000 });
      renderCheck(r);
      return { correct: !!r.passed, score: r.passed ? 1 : fraction(r), detail: r };
    },
    showResults: (r) => renderCheck(r, { final: true }),
    reveal() {},
    showSolution() {
      const box = h('div', h('pre.codeblock', { html: highlight(step.solution) }));
      modal({ title: 'Model solution', body: box, actions: [
        { label: 'Copy', kind: 'ghost', onClick: () => { copyText(step.solution); toast('Copied'); return false; } },
        { label: 'Use this code', kind: 'blue', onClick: () => { ed.setValue(step.solution, { keepHistory: true }); opts.onChange?.(); } },
      ] });
    },
    destroy() { clearTimeout(saveTimer); if (draftKey && mode === 'lesson') drafts.set(draftKey, ed.value); ed.destroy(); },
  };

  function renderCheck(r, { sample = false, final = false } = {}) {
    const tests = r.tests || [];
    const passed = tests.filter((t) => t.ok).length;
    const okAll = r.passed || (sample && passed === tests.length && !r.error && !(r.static || []).length);
    ed.markError(r.error?.line || 0);
    const head = r.error
      ? [icon('x', 18), `${r.error.type}${r.error.line ? ` on line ${r.error.line}` : ''}`]
      : [icon(okAll ? 'check' : 'x', 18), sample ? `Sample tests: ${passed}/${tests.length} passed` : okAll ? (tests.length === 1 ? "Test passed" : `All ${tests.length} tests passed`) : `${passed} of ${tests.length} tests passed`];
    const nodes = [];
    for (const m of r.static || []) nodes.push(h('div.static-msg', m));
    if (r.error) nodes.push(renderConsole([], r.error));
    const showDetail = mode === 'lesson' || final;
    nodes.push(h('div.tests', tests.map((t, i) => {
      const hiddenLabel = t.hidden && !showDetail;
      const name = hiddenLabel ? `Hidden test ${i + 1}` : t.name;
      const det = [];
      if (!t.ok && !hiddenLabel) {
        if (t.msg) det.push(h('div', t.msg));
        if (t.exp !== undefined) det.push(h('div', h('b', 'expected '), t.exp));
        if (t.got !== undefined) det.push(h('div', h('b', 'got '), t.got));
        if (t.printed) det.push(h('div', h('b', 'printed '), t.printed.trimEnd()));
      }
      return h(`div.test.${t.ok ? 'ok' : 'bad'}`, icon(t.ok ? 'check' : 'x', 16),
        h('div', { style: { minWidth: 0 } }, h('div.tname', (t.hidden && showDetail ? '🔒 ' : '') + name), det.length ? h('div.tdet', det) : null));
    })));
    const outText = (r.out || []).some((s) => s.v && s.t !== 'err' ? s.v.trim() : false);
    if (outText) nodes.push(h('div.answer-label', 'Your program printed'), renderConsole(r.out));
    if (mode === 'lesson' && !okAll && view.attempts >= 2) {
      const solBtn = h('button.btn.small.ghost', icon('eye', 16), 'Show solution');
      solBtn.onclick = () => { view.solutionShown = true; view.showSolution(); opts.onSolution?.(); };
      nodes.push(h('div.row', { style: { justifyContent: 'center', paddingTop: '4px' } }, solBtn));
    }
    showResults(okAll ? 'ok' : 'bad', head, nodes);
  }
  return view;
}

function fraction(r) {
  const t = r.tests || [];
  if (!t.length) return 0;
  const base = t.filter((x) => x.ok).length / t.length;
  return (r.static || []).length ? base * 0.5 : base;
}

/** Grade an exam answer for any step type without UI. */
export async function gradeAnswer(step, answer, { onProgress } = {}) {
  if (step.type === 'choice') {
    const ok = answer === step.answer;
    return { correct: ok, score: ok ? 1 : 0 };
  }
  if (step.type === 'output') {
    if (!answer) return { correct: false, score: 0 };
    const loose = (s) => normOut(s).replace(/,\s*/g, ', ').replace(/:\s*/g, ': ').replace(/[ \t]+/g, ' ');
    const ok = loose(answer) === loose(step.answer);
    return { correct: ok, score: ok ? 1 : 0 };
  }
  if (step.type === 'blanks') {
    if (!answer || answer.some((x) => x === null)) return { correct: false, score: 0 };
    const got = answer.map((bi) => step.bank[bi]);
    const ok = [step.answer, ...(step.accept || [])].some((a) => a.every((t, i) => t === got[i]));
    return { correct: ok, score: ok ? 1 : 0 };
  }
  if (step.type === 'order') {
    if (!answer || answer.length !== step.lines.length) return { correct: false, score: 0 };
    const all = [...step.lines.map((l, i) => ({ text: l, real: i })), ...(step.distractors || []).map((l) => ({ text: l, real: -1 }))];
    let ok = answer.every((ai, i) => all[ai].real === i);
    if (!ok && step.tests && step.tests.length && answer.every((ai) => all[ai].real >= 0)) {
      const r = await Py.check({ setup: step.setup || '', solution: step.lines.join('\n'), tests: step.tests }, answer.map((ai) => all[ai].text).join('\n'));
      ok = !!r.passed;
    }
    return { correct: ok, score: ok ? 1 : 0 };
  }
  if (step.type === 'code') {
    const code = answer ?? step.starter;
    if (code.trim() === step.starter.trim()) return { correct: false, score: 0, detail: { tests: [], passed: false, untouched: true } };
    const r = await Py.check({ setup: step.setup || '', solution: step.solution, tests: step.tests, require: step.require, forbid: step.forbid }, code, { timeoutMs: 15000, onProgress });
    return { correct: !!r.passed, score: r.passed ? 1 : fraction(r), detail: r };
  }
  return { correct: false, score: 0 };
}
