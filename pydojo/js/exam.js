// Timed exams and interview simulations: intro → questions → grading → review.
import { createStep, gradeAnswer, renderConsole } from './steps.js';
import { Editor } from './editor.js';
import { getKeyboard } from './kbhost.js';
import { highlight } from './highlight.js';
import { md, mdPlain } from './md.js';
import { store } from './store.js';
import { h, icon, sound, confetti, confirmModal, isTouch, fmtTime } from './ui.js';

const SESSION_KEY = 'pydojo.exam';
const DEFAULT_POINTS = { choice: 2, output: 3, blanks: 3, order: 3, code: 10 };
export const pointsOf = (q) => q.points || DEFAULT_POINTS[q.type] || 2;

export function gradeLetter(pct) {
  const scale = [[97, 'A+'], [93, 'A'], [90, 'A-'], [87, 'B+'], [83, 'B'], [80, 'B-'], [77, 'C+'], [73, 'C'], [70, 'C-'], [67, 'D+'], [63, 'D'], [60, 'D-']];
  for (const [min, g] of scale) if (pct >= min) return g;
  return 'F';
}
export function hireSignal(pct) {
  if (pct >= 90) return { label: 'Strong Hire', color: 'var(--good)' };
  if (pct >= 78) return { label: 'Hire', color: 'var(--good)' };
  if (pct >= 65) return { label: 'Lean Hire', color: 'var(--gold-dark)' };
  if (pct >= 50) return { label: 'Lean No Hire', color: '#FF8A3D' };
  return { label: 'No Hire', color: 'var(--bad)' };
}
export const gradeClass = (g) => `g-${(g || 'F')[0]}`;
const IV_ICONS = { 'iv-phone': '📞', 'iv-arrays': '🧮', 'iv-algo': '🕸️', 'iv-dataeng': '🏭', 'iv-datasci': '🔬', 'iv-sql': '🗄️', 'iv-final': '🏆' };
export const examIcon = (exam, unit) => (unit ? unit.icon : IV_ICONS[exam.id] || '💼');

const loadSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } };
const saveSession = (s) => { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* ignore */ } };
const clearSession = () => { try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } };
export const activeExamSession = () => loadSession();

/** runExam({ entry: {exam, unit, interview}, onExit }) */
export function runExam({ entry, onExit }) {
  const { exam, unit, interview } = entry;
  const color = unit ? unit.color : '#8B5CF6';
  const root = h('div.lesson');
  root.style.setProperty('--uc', color);
  const top = h('div.lesson-top');
  const qnav = h('div.qnav.hidden');
  const body = h('div.lesson-body');
  const footInner = h('div.foot-inner');
  const foot = h('div.lesson-foot', footInner);
  const dock = h('div.dock');
  root.append(top, qnav, body, foot, dock);
  document.body.append(root);
  const kb = getKeyboard();
  const total = exam.questions.reduce((s, q) => s + pointsOf(q), 0);
  let session = null;
  let view = null;
  let tick = 0;
  let phase = 'intro';
  let saveTimer = 0;

  const offActive = Editor.onActive(() => updateDock());
  kb.onHide = () => { Editor.active?.blur(); updateDock(); };
  function updateDock() {
    const ed = Editor.active;
    const show = phase === 'run' && (isTouch() ? !!ed : store.s.settings.kbDesktop && !!view?.editor);
    if (show) { if (kb.el.parentNode !== dock) dock.append(kb.el); kb.attach(Editor.active); } else if (kb.el.parentNode === dock) kb.el.remove();
    root.classList.toggle('kb-open', show);
  }

  // ---------------------------------------------------------------- intro
  function intro() {
    phase = 'intro';
    const best = store.s.exams[exam.id];
    const saved = loadSession();
    const resumable = saved && saved.id === exam.id;
    top.replaceChildren(h('button.iconbtn', { onclick: () => exit(), 'aria-label': 'Close' }, icon('x', 24)), h('div.spacer'));
    const codeQs = exam.questions.filter((q) => q.type === 'code').length;
    body.classList.remove('fill', 'split');
    body.replaceChildren(h('div.exam-intro',
      h('div.hero', h('div.lic', { style: { background: color } }, examIcon(exam, unit)),
        h('div', h('div.qpoints', interview ? `${exam.style || 'Interview'} · ${exam.level || ''}` : `Unit ${unit.order} exam`), h('h1', exam.title))),
      h('div.facts',
        h('div.fact', h('b', exam.questions.length), h('span', 'questions')),
        h('div.fact', h('b', `${exam.minutes}`), h('span', 'minutes')),
        h('div.fact', h('b', codeQs), h('span', 'coding'))),
      exam.intro ? h('div.card', { style: { marginBottom: '14px' } }, h('div.prose', { html: md(exam.intro) })) : null,
      h('div.card', { style: { marginBottom: '14px' } }, h('div.prose', { html: md(
        `**How grading works.** ${total} points in total. Coding questions are graded on **hidden tests** when you submit, and you get partial credit per passed test. During the exam, **Run** only runs the sample tests. There is no feedback until the end. Grades go from A+ (≥ 97 %) to F (< 60 %)${interview ? ', and you also get a hiring signal' : ''}. The timer keeps running if you leave, and your answers are saved on this device.`) })),
      best ? h('div.row', { style: { marginBottom: '8px' } }, h('span.muted', 'Best result:'), h(`span.grade.${gradeClass(best.g)}`, best.g), h('span.muted', `${best.b}% · ${best.n} attempt${best.n === 1 ? '' : 's'}`)) : null));
    const btns = [];
    if (resumable) {
      btns.push(h('button.btn.ghost', { onclick: async () => { if (await confirmModal('Start over?', 'Your saved answers for this exam will be discarded.', 'Restart', 'danger')) start(true); } }, 'Restart'));
      btns.push(h('button.btn.blue', { onclick: () => start(false) }, 'Resume'));
    } else btns.push(h('button.btn.unit', { onclick: () => start(true) }, interview ? 'Start interview' : 'Start exam'));
    footInner.replaceChildren(...btns);
  }

  // ---------------------------------------------------------------- run
  function start(fresh) {
    const saved = loadSession();
    if (!fresh && saved && saved.id === exam.id) session = saved;
    else {
      session = { id: exam.id, start: Date.now(), deadline: Date.now() + exam.minutes * 60000, answers: {}, idx: 0 };
      saveSession(session);
    }
    if (Date.now() >= session.deadline) { submit(true); return; }
    phase = 'run';
    const timer = h('div.timer', icon('clock', 18), h('span'));
    top.replaceChildren(...[
      h('button.iconbtn', { onclick: () => leave(), 'aria-label': 'Leave' }, icon('x', 24)),
      h('div.spacer'), timer, h('div.spacer'),
      isTouch() ? null : h('button.iconbtn.kb-toggle', { onclick: () => { store.setting('kbDesktop', !store.s.settings.kbDesktop); updateDock(); } }, icon('keyboard', 22)),
      h('button.btn.small.blue', { onclick: () => submit(false) }, 'Submit')].filter(Boolean));
    const upd = () => {
      const left = (session.deadline - Date.now()) / 1000;
      timer.querySelector('span').textContent = fmtTime(left);
      timer.classList.toggle('low', left < 60);
      if (left <= 0) { clearInterval(tick); submit(true); }
    };
    upd();
    tick = setInterval(upd, 1000);
    qnav.classList.remove('hidden');
    showQ(session.idx || 0);
  }

  function renderNav() {
    qnav.replaceChildren(...exam.questions.map((q, i) => {
      const a = session.answers[i];
      const answered = a !== undefined && a !== null && !(q.type === 'code' && a === q.starter) && !(Array.isArray(a) && !a.length);
      return h(`button.qdot${i === session.idx ? '.on' : ''}${answered ? '.answered' : ''}`, { onclick: () => showQ(i) }, String(i + 1));
    }));
    qnav.children[session.idx]?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function persist() {
    if (view) session.answers[session.idx] = view.answer();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveSession(session), 300);
  }

  function showQ(i) {
    if (view) { persist(); view.destroy(); }
    session.idx = i;
    const q = exam.questions[i];
    view = createStep(q, {
      mode: 'exam', key: `${exam.id}.${i}`, restore: session.answers[i] ?? undefined,
      onChange: () => { persist(); renderNav(); },
      onSubmit: () => {}, onEditor: () => updateDock(), autoFocus: !isTouch(),
    });
    const head = h('div.qpoints', { style: { margin: '2px 0 4px' } }, `Question ${i + 1} of ${exam.questions.length} · ${pointsOf(q)} points`);
    if (view.kind !== 'code') view.el.prepend(head);
    body.replaceChildren(view.el);
    body.classList.toggle('fill', !!view.fill);
    body.classList.toggle('split', !!view.split);
    body.scrollTop = 0;
    const btns = [h('button.btn.ghost.icon', { onclick: () => showQ(i - 1), disabled: i === 0, 'aria-label': 'Previous' }, icon('chevronL', 22))];
    if (q.type === 'code') btns.push(h('button.btn.ghost', { onclick: () => view.run(), title: 'Run your code against the sample tests' }, icon('play', 18), 'Run'));
    btns.push(i < exam.questions.length - 1
      ? h('button.btn.blue', { onclick: () => showQ(i + 1) }, 'Next')
      : h('button.btn.unit', { onclick: () => submit(false) }, 'Finish'));
    footInner.replaceChildren(...btns);
    renderNav();
    updateDock();
    saveSession(session);
  }

  async function leave() {
    const ok = await confirmModal('Leave the exam?', 'Your answers are saved and the timer keeps running. Come back to resume from the exam screen.', 'Leave', 'blue');
    if (ok) exit();
  }

  // ---------------------------------------------------------------- grade
  async function submit(timeUp) {
    if (phase === 'grading' || phase === 'results') return;
    if (view) persist();
    if (!timeUp) {
      const unanswered = exam.questions.filter((q, i) => session.answers[i] === undefined).length;
      const ok = await confirmModal('Submit your answers?', unanswered ? `${unanswered} question${unanswered === 1 ? ' is' : 's are'} still unanswered.` : 'You can\'t change your answers after submitting.', 'Submit', 'primary');
      if (!ok) return;
    }
    clearInterval(tick);
    phase = 'grading';
    view?.destroy(); view = null;
    updateDock();
    qnav.classList.add('hidden');
    top.replaceChildren(h('div.spacer'), h('b', timeUp ? 'Time is up!' : 'Grading…'), h('div.spacer'));
    footInner.replaceChildren();
    const status = h('div.running', h('span.spinner'), 'Grading…');
    body.classList.remove('fill', 'split');
    body.replaceChildren(h('div.done-screen', h('div', { style: { fontSize: '56px' } }, '🧑‍⚖️'), h('h1', { style: { color: 'var(--ink)' } }, 'Grading your answers'), status));
    const results = [];
    for (let i = 0; i < exam.questions.length; i++) {
      const q = exam.questions[i];
      status.lastChild.textContent = `Question ${i + 1} of ${exam.questions.length}${q.type === 'code' ? ': running hidden tests…' : ''}`;
      let r;
      try { r = await gradeAnswer(q, session.answers[i]); } catch (err) { r = { correct: false, score: 0, error: String(err) }; }
      results.push(r);
    }
    const got = results.reduce((s, r, i) => s + r.score * pointsOf(exam.questions[i]), 0);
    const pct = Math.round((got / total) * 1000) / 10;
    const grade = gradeLetter(pct);
    const used = Math.min(exam.minutes * 60, (Date.now() - session.start) / 1000);
    store.examDone(exam.id, pct, grade);
    const xp = Math.round((pct / 100) * (interview ? 80 : 40));
    store.activity(Math.max(5, xp));
    for (const [i, r] of results.entries()) store.markResult(`${exam.id}.${i}`, r.correct);
    clearSession();
    showResults({ results, got, pct, grade, used, xp: Math.max(5, xp) });
  }

  function showResults({ results, got, pct, grade, used, xp }) {
    phase = 'results';
    if (pct >= 80) { sound.done(); confetti(); } else if (pct < 60) sound.wrong();
    top.replaceChildren(h('button.iconbtn', { onclick: () => exit(), 'aria-label': 'Close' }, icon('x', 24)), h('div.spacer'), h('b', exam.title), h('div.spacer'));
    const sig = interview ? hireSignal(pct) : null;
    const list = exam.questions.map((q, i) => reviewItem(q, i, results[i]));
    body.replaceChildren(h('div.exam-intro',
      h('div.result-hero',
        h(`div.big-grade.${gradeClass(grade)}`, grade),
        h('div', { style: { fontSize: '22px', fontWeight: 850 } }, `${pct}%`),
        h('div.muted', `${Math.round(got * 10) / 10} / ${total} points · ${fmtTime(used)} used · +${xp} XP`),
        sig ? h('div.verdict', { style: { background: `color-mix(in srgb, ${sig.color} 18%, var(--card))`, color: sig.color } }, `Interviewer verdict: ${sig.label}`) : null,
        h('p.muted.small', { style: { maxWidth: '420px', margin: '10px auto 0' } }, verdictText(pct, interview))),
      h('div.section-title', 'Question review'), list));
    footInner.replaceChildren(
      h('button.btn.ghost', { onclick: () => { intro(); } }, 'Retake'),
      h('button.btn.primary', { onclick: () => exit() }, 'Done'));
  }

  function reviewItem(q, i, r) {
    const pts = pointsOf(q);
    const sc = Math.round(r.score * pts * 10) / 10;
    const cls = r.score >= 0.999 ? 'ok' : r.score > 0 ? 'part' : 'bad';
    const ans = session.answers[i];
    const title = q.title || mdPlain(q.prompt, 70);
    const inner = [h('div.prose', { html: md(q.prompt) })];
    if (q.code) inner.push(h('pre.codeblock', { html: highlight(q.code) }));
    if (q.type === 'choice') {
      inner.push(h('div.answer-label', 'Your answer'), h('div', ans === undefined || ans === null ? '—' : q.options[ans]));
      inner.push(h('div.answer-label', 'Correct answer'), h('div', q.options[q.answer]));
    } else if (q.type === 'output') {
      inner.push(h('div.answer-label', 'Your answer'), h('pre.codeblock', ans || '—'));
      inner.push(h('div.answer-label', 'Correct output'), h('pre.codeblock', q.answer));
    } else if (q.type === 'blanks') {
      let k = 0;
      inner.push(h('div.answer-label', 'Correct code'), h('pre.codeblock', { html: highlight(q.code.replace(/___/g, () => q.answer[k++])) }));
    } else if (q.type === 'order') {
      inner.push(h('div.answer-label', 'Correct order'), h('pre.codeblock', { html: highlight(q.lines.join('\n')) }));
    } else if (q.type === 'code') {
      inner.push(h('div.answer-label', 'Your code'), h('pre.codeblock', { html: highlight(ans ?? q.starter) }));
      const d = r.detail || {};
      if (d.untouched) inner.push(h('p.muted', 'Not attempted.'));
      if (d.error) inner.push(renderConsole([], d.error));
      for (const m of d.static || []) inner.push(h('div.static-msg', m));
      if ((d.tests || []).length) {
        inner.push(h('div.answer-label', `Tests: ${(d.tests || []).filter((t) => t.ok).length}/${d.tests.length} passed`));
        inner.push(h('div.tests', d.tests.map((t) => h(`div.test.${t.ok ? 'ok' : 'bad'}`, icon(t.ok ? 'check' : 'x', 16),
          h('div', { style: { minWidth: 0 } }, h('div.tname', (t.hidden ? '🔒 ' : '') + t.name),
            !t.ok ? h('div.tdet', [t.msg && h('div', t.msg), t.exp !== undefined && h('div', h('b', 'expected '), t.exp), t.got !== undefined && h('div', h('b', 'got '), t.got)]) : null)))));
      }
      inner.push(h('div.answer-label', 'Model solution'), h('pre.codeblock', { html: highlight(q.solution) }));
    }
    if (q.explain) inner.push(h('div.answer-label', 'Explanation'), h('div.prose', { html: md(q.explain) }));
    return h(`details.qreview.${cls}`, h('summary', icon(cls === 'ok' ? 'check' : cls === 'part' ? 'flag' : 'x', 18), h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `${i + 1}. ${title}`), h('span.score', `${sc}/${pts}`)), h('div.qbody', inner));
  }

  function onKey(e) {
    if (phase !== 'run' || !view || (Editor.active && !isTouch()) || document.querySelector('.modal-wrap')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (view.onKey && view.onKey(e)) { e.preventDefault(); return; }
    if (e.key === 'ArrowRight' && session.idx < exam.questions.length - 1) showQ(session.idx + 1);
    else if (e.key === 'ArrowLeft' && session.idx > 0) showQ(session.idx - 1);
  }
  document.addEventListener('keydown', onKey);

  function exit() {
    document.removeEventListener('keydown', onKey);
    clearInterval(tick);
    if (view) { persist(); view.destroy(); }
    offActive();
    if (kb.el.parentNode === dock) kb.el.remove();
    root.remove();
    onExit?.();
  }

  intro();
  return { close: exit };
}

function verdictText(pct, interview) {
  if (pct >= 90) return interview ? 'Outstanding. This would be a strong signal in a real loop. Look at the model solutions for even cleaner approaches.' : 'Excellent! You have mastered this unit.';
  if (pct >= 75) return 'Solid performance. Review the questions you missed: the explanations show what to tighten up.';
  if (pct >= 60) return 'You passed, but there are gaps. Redo the related lessons, then retake this later.';
  return interview ? 'Not there yet, and that is exactly what practice is for. Study the model solutions, drill the topics, and try again in a few days.' : 'Below the passing line. Go back through the lessons (they are all unlocked) and try again.';
}

