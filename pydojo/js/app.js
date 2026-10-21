// PyDojo — app shell, router and screens.
import { loadCourse, course, TRACKS, stepKey, lessonExerciseCount, estMinutes, isExercise } from './course.js';
import { store, beltFor, dayStr, drafts } from './store.js';
import { Py } from './runner.js';
import { runSession } from './lesson.js';
import { runExam, activeExamSession, gradeClass, pointsOf, examIcon } from './exam.js';
import { Editor } from './editor.js';
import { getKeyboard } from './kbhost.js';
import { renderConsole } from './steps.js';
import { md } from './md.js';
import { DATA_FILES } from './pycore.js';
import { h, icon, mascot, modal, toast, confirmModal, isTouch, shuffle, copyText, clear } from './ui.js';

const app = document.getElementById('app');
const TABS = [
  { id: 'learn', label: 'Learn', icon: 'path' },
  { id: 'practice', label: 'Practice', icon: 'dumbbell' },
  { id: 'exams', label: 'Exams', icon: 'trophy' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];
let lastTab = 'learn';
let overlay = null; // { route, close }
let openedInApp = false;
let pathScroll = 0;

// ------------------------------------------------------------------ theme
function applyTheme() {
  const t = store.s.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', dark ? '#0D121B' : '#F3F5FA');
}

// ------------------------------------------------------------------ router
function parse() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name: parts[0] || 'learn', arg: parts.slice(1).join('/') };
}
export function go(route) { openedInApp = true; location.hash = `#/${route}`; }

function route() {
  const r = parse();
  const isOverlay = ['lesson', 'exam', 'review', 'drill', 'playground'].includes(r.name);
  if (overlay && overlay.route !== location.hash) { const o = overlay; overlay = null; o.close(); }
  if (isOverlay) {
    if (!overlay) {
      if (!app.firstChild) renderTab(lastTab);
      openOverlay(r);
    }
    return;
  }
  lastTab = TABS.some((t) => t.id === r.name) ? r.name : 'learn';
  renderTab(lastTab);
}

function closeOverlayRoute() {
  overlay = null;
  if (openedInApp && history.length > 1) { openedInApp = false; history.back(); } else location.replace(`#/${lastTab}`);
}

function openOverlay(r) {
  const hash = location.hash;
  const done = () => { if (overlay && overlay.route === hash) closeOverlayRoute(); renderTab(lastTab, true); };
  let handle = null;
  if (r.name === 'lesson') {
    const [id, at] = r.arg.split('/');
    const entry = course.lessons.get(id);
    if (!entry) { toast('Lesson not found'); return location.replace('#/learn'); }
    handle = startLesson(entry, done, parseInt(at, 10) || 0);
  } else if (r.name === 'exam') {
    const entry = course.exams.get(r.arg);
    if (!entry) { toast('Exam not found'); return location.replace('#/exams'); }
    handle = runExam({ entry, onExit: done });
  } else if (r.name === 'review') handle = startReview(done);
  else if (r.name === 'drill') handle = startDrill(r.arg, done);
  else if (r.name === 'playground') handle = openPlayground(done);
  if (!handle) return location.replace(`#/${lastTab}`);
  overlay = { route: hash, close: handle.close };
}

// ------------------------------------------------------------------ sessions
function lessonItems(lesson) {
  return lesson.steps.map((step, i) => ({ step, key: stepKey(lesson.id, i) }));
}
function nextLessonAfter(id) {
  const all = course.units.flatMap((u) => u.lessons);
  const i = all.findIndex((l) => l.id === id);
  return all[i + 1] || null;
}
function startLesson({ lesson, unit }, onExit, startAt = 0) {
  const nxt = nextLessonAfter(lesson.id);
  return runSession({
    title: lesson.title, items: lessonItems(lesson), mode: 'lesson', lessonId: lesson.id, color: unit.color, startAt,
    next: nxt ? () => setTimeout(() => { openedInApp = true; location.replace(`#/lesson/${nxt.id}`); }, 30) : null,
    onExit,
  });
}
function startReview(onExit) {
  const keys = store.dueReviews().filter((k) => course.steps.has(k)).slice(0, 15);
  if (!keys.length) { toast('Nothing to review right now 🎉', 'good'); return null; }
  const items = shuffle(keys).map((key) => ({ key, step: course.steps.get(key).step }));
  return runSession({ title: 'Mistake review', items, mode: 'review', color: '#F04D58', onExit });
}
function startDrill(arg, onExit) {
  let pool;
  if (arg === 'smart' || !arg) {
    const doneLessons = new Set(Object.keys(store.s.lessons));
    pool = [...course.steps.entries()].filter(([k, v]) => isExercise(v.step) && (doneLessons.size === 0 || doneLessons.has(v.lesson.id)));
  } else {
    pool = [...course.steps.entries()].filter(([, v]) => isExercise(v.step) && v.unit.id === arg);
  }
  if (!pool.length) { toast('No exercises found'); return null; }
  const wrong = pool.filter(([k]) => store.s.review[k]);
  const code = shuffle(pool.filter(([, v]) => v.step.type === 'code')).slice(0, 3);
  const rest = shuffle(pool.filter(([, v]) => v.step.type !== 'code'));
  const picked = [...new Map([...shuffle(wrong).slice(0, 3), ...code, ...rest].map((e) => [e[0], e])).values()].slice(0, 10);
  const unit = course.units.find((u) => u.id === arg);
  return runSession({ title: unit ? `${unit.title} drill` : 'Smart drill', items: shuffle(picked).map(([key, v]) => ({ key, step: v.step })), mode: 'drill', color: unit?.color || '#2F7BF6', onExit });
}

// ------------------------------------------------------------------ shell
function renderTab(tab, keepScroll = false) {
  const prevPage = app.querySelector('.page');
  if (prevPage && tab === 'learn' && document.body.dataset.tab === 'learn') pathScroll = prevPage.scrollTop;
  document.body.dataset.tab = tab;
  const reviews = store.dueReviews().filter((k) => course.steps.has(k)).length;
  const side = h('nav.sidebar',
    h('div.brand', mascot(34), h('span', 'Py', h('b', 'Dojo'))),
    TABS.map((t) => h(`button.side-tab${t.id === tab ? '.on' : ''}`, { onclick: () => go(t.id) }, icon(t.icon, 26), t.label,
      t.id === 'practice' && reviews ? h('span.badge', reviews) : null)));
  const page = h('div.page');
  const main = h('div.main', topbar(), page,
    h('nav.tabbar', TABS.map((t) => h(`button.tab${t.id === tab ? '.on' : ''}`, { onclick: () => go(t.id) }, icon(t.icon, 26), t.label,
      t.id === 'practice' && reviews ? h('span.badge', reviews) : null))));
  clear(app).append(h('div.shell', side, main));
  ({ learn: learnScreen, practice: practiceScreen, exams: examsScreen, profile: profileScreen }[tab])(page);
  if (tab === 'learn' && keepScroll) page.scrollTop = pathScroll;
  else if (tab === 'learn') {
    requestAnimationFrame(() => {
      const nxt = page.querySelector('.node.next');
      if (nxt && Object.keys(store.s.lessons).length) page.scrollTop = Math.max(0, nxt.getBoundingClientRect().top - page.getBoundingClientRect().top - page.clientHeight * 0.4);
    });
  }
}

function topbar() {
  const s = store.s;
  const streak = store.streak();
  const belt = beltFor(s.xp);
  const today = store.todayXp();
  return h('header.topbar',
    h('div.brand', mascot(30), h('span', 'Py', h('b', 'Dojo'))),
    h('div.spacer'),
    h(`span.stat-chip.flame${streak ? '' : '.off'}`, { title: 'Day streak' }, icon('flame', 20), streak),
    h('span.stat-chip.xp', { title: `Today: ${today} / ${s.goal} XP` }, icon('bolt', 20), s.xp),
    h('span.stat-chip', { title: `${belt.name} belt` }, beltIcon(belt.color)));
}

function beltIcon(color) {
  const el = h('span.belt');
  el.innerHTML = `<svg viewBox="0 0 34 22" width="34" height="22" aria-hidden="true"><path d="M2 6h30v6H2z" fill="${color}" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/><path d="M14 9l-5 12M20 9l5 12" stroke="rgba(0,0,0,.35)" stroke-width="5.2" stroke-linecap="round"/><path d="M14 9l-5 12M20 9l5 12" stroke="${color}" stroke-width="3.4" stroke-linecap="round"/><rect x="12" y="4" width="10" height="10" rx="2.5" fill="${color}" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/></svg>`;
  return el;
}

function sidePanel() {
  const s = store.s;
  const today = store.todayXp();
  const pct = Math.min(100, Math.round((today / s.goal) * 100));
  const belt = beltFor(s.xp);
  const reviews = store.dueReviews().filter((k) => course.steps.has(k)).length;
  return h('aside.side-panel',
    h('div.card', h('div.goal-ring', h('div.ring', { style: { '--p': pct } }, h('div', `${pct}%`)),
      h('div', h('h3', 'Daily goal'), h('p', `${today} / ${s.goal} XP today`)))),
    h('div.card', h('div.belt-card', mascot(54, 'happy', belt.color), h('div', { style: { flex: 1 } }, h('h3', `${belt.name} belt`),
      h('p', belt.next ? `${belt.next.xp - s.xp} XP to ${belt.next.name}` : 'Highest rank. Respect!'), h('div.belt-bar', h('i', { style: { width: `${belt.pct * 100}%` } }))))),
    reviews ? h('div.card', h('h3', `${reviews} mistakes to review`), h('p', { style: { marginBottom: '10px' } }, 'Spaced repetition makes it stick.'), h('button.btn.small.danger', { onclick: () => go('review') }, 'Review now')) : null,
    h('div.card', h('h3', 'Tip'), h('p', 'On the Mac: Cmd+Enter checks code, Shift+Enter runs it, and number keys pick answers.')));
}

// ------------------------------------------------------------------ learn (path)
function nextLessonId() {
  for (const u of course.units) for (const l of u.lessons) if (!store.s.lessons[l.id]) return l.id;
  return null;
}

function learnScreen(page) {
  const grid = h('div.wide-grid');
  const col = h('div.col-main');
  grid.append(col, sidePanel());
  page.append(grid);
  if (!course.units.length) { col.append(h('div.card', h('h3', 'No lessons found'), h('p', 'The course content could not be loaded.'))); return; }
  const tabs = h('div.track-tabs', TRACKS.map((t) => h('button.track-tab', { onclick: () => {
    const el = document.getElementById(`track-${t.id}`);
    if (el) page.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
  } }, t.icon, t.short)));
  col.append(tabs);
  const nextId = nextLessonId();
  const anyDone = Object.keys(store.s.lessons).length > 0;
  if (nextId && anyDone) {
    const { lesson, unit } = course.lessons.get(nextId);
    const reviews = store.dueReviews().filter((k) => course.steps.has(k)).length;
    col.append(h('div.continue-card', { style: { '--uc': unit.color } },
      h('div.lic', unit.icon),
      h('div.lbody', h('div.kicker', `Up next · Unit ${unit.order}`), h('div.ltitle', lesson.title),
        reviews ? h('div.lsub', `${reviews} mistake${reviews === 1 ? '' : 's'} waiting in Practice`) : null),
      h('button.btn.small.unit', { onclick: () => go(`lesson/${nextId}`) }, 'Go')));
  }
  let popEl = null;
  for (const track of TRACKS) {
    const units = course.units.filter((u) => u.track === track.id);
    if (!units.length) continue;
    col.append(h(`div.track-head#track-${track.id}`, h('h2', `${track.icon} ${track.title}`), h('span', track.blurb)));
    for (const unit of units) {
      const doneN = unit.lessons.filter((l) => store.s.lessons[l.id]).length;
      const ex = unit.exam && store.s.exams[unit.exam.id];
      const u = h('section.unit');
      u.style.setProperty('--uc', unit.color);
      u.append(h('div.unit-banner',
        h('div.meta', h('div.kicker', `Unit ${unit.order} · ${doneN}/${unit.lessons.length} lessons`), h('h3', unit.title), h('p', unit.subtitle),
          h('div.unit-progress', h('i', { style: { width: `${(doneN / unit.lessons.length) * 100}%` } }))),
        h('div.uicon', unit.icon)));
      const path = h('div.path');
      const offs = [0, 54, 80, 54, 0, -54, -80, -54];
      const nodes = unit.lessons.map((lesson, i) => ({ kind: 'lesson', lesson, i }));
      if (unit.exam) nodes.push({ kind: 'exam', i: nodes.length });
      nodes.forEach((n, k) => {
        const off = offs[k % offs.length];
        const wrap = h('div.node-wrap', { style: { transform: `translateX(${off}px)` } });
        let btn;
        if (n.kind === 'lesson') {
          const rec = store.s.lessons[n.lesson.id];
          const isNext = n.lesson.id === nextId;
          btn = h(`button.node${rec ? '.done' : ''}${isNext ? '.next' : ''}`, { 'aria-label': n.lesson.title },
            rec ? icon('check', 34) : h('span', { style: { fontSize: '25px', fontWeight: 900 } }, String(n.i + 1)),
            rec && rec.b === 100 ? h('span.crown', icon('crown', 24)) : null);
          if (isNext) { wrap.classList.add('has-bubble'); wrap.append(h('div.start-bubble', doneN ? 'NEXT' : 'START')); }
          wrap.append(btn, h('div.node-label', n.lesson.title));
          btn.onclick = () => togglePop(wrap, () => lessonPop(unit, n.lesson, rec));
        } else {
          btn = h(`button.node.exam${ex ? '.done' : ''}`, { 'aria-label': 'Unit exam' }, icon('trophy', 34));
          wrap.append(btn, h('div.node-label', ex ? `Exam · ${ex.g} (${ex.b}%)` : 'Unit exam'));
          btn.onclick = () => togglePop(wrap, () => examPop(unit));
        }
        path.append(wrap);
      });
      u.append(path);
      col.append(u);
    }
  }
  col.append(h('div', { style: { textAlign: 'center', padding: '20px 0 30px' } }, mascot(90), h('p.muted', 'Every lesson is unlocked. Jump in anywhere!')));

  function togglePop(wrap, build) {
    const had = popEl && popEl.parentNode === wrap;
    popEl?.remove();
    popEl = null;
    if (had) return;
    popEl = build();
    popEl.style.transform = `translateX(${-parseFloat(wrap.style.transform.replace(/[^-\d.]/g, '')) || 0}px)`;
    wrap.append(popEl);
    setTimeout(() => popEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
  }
  page.addEventListener('click', (e) => { if (popEl && !e.target.closest('.node-wrap')) { popEl.remove(); popEl = null; } });
}

function lessonPop(unit, lesson, rec) {
  return h('div.popover', h('h4', lesson.title), h('p', lesson.summary || ''),
    h('div.meta', h('span', `${lessonExerciseCount(lesson)} exercises`), h('span', `~${estMinutes(lesson)} min`), rec ? h('span', `best ${rec.b}%`) : null),
    h('button.btn.wide', { onclick: () => go(`lesson/${lesson.id}`) }, rec ? 'Practice again' : 'Start lesson'));
}
function examPop(unit) {
  const ex = store.s.exams[unit.exam.id];
  return h('div.popover', h('h4', unit.exam.title), h('p', unit.exam.intro || 'Test everything from this unit.'),
    h('div.meta', h('span', `${unit.exam.questions.length} questions`), h('span', `${unit.exam.minutes} min`), ex ? h('span', `best ${ex.g}`) : null),
    h('button.btn.wide', { onclick: () => go(`exam/${unit.exam.id}`) }, ex ? 'Retake exam' : 'Take the exam'));
}

// ------------------------------------------------------------------ practice
function practiceScreen(page) {
  const inner = h('div.page-inner');
  page.append(inner);
  const reviews = store.dueReviews().filter((k) => course.steps.has(k)).length;
  const totalMistakes = Object.keys(store.s.review).length;
  inner.append(h('h1.page-title', 'Practice'));
  inner.append(h('div.list',
    h('button.lcard', { onclick: () => (reviews ? go('review') : toast('No reviews due. Come back tomorrow!')) },
      h('div.lic', { style: { background: 'var(--bad)' } }, icon('reset', 26)),
      h('div.lbody', h('div.ltitle', 'Review mistakes'), h('div.lsub', reviews ? `${reviews} due now · spaced repetition` : totalMistakes ? `${totalMistakes} scheduled · none due today` : 'Mistakes you make show up here')),
      reviews ? h('span.grade', { style: { background: 'var(--bad)' } }, reviews) : null),
    h('button.lcard', { onclick: () => go('drill/smart') },
      h('div.lic', { style: { background: 'var(--accent)' } }, icon('brain', 26)),
      h('div.lbody', h('div.ltitle', 'Smart drill'), h('div.lsub', '10 mixed exercises from lessons you finished'))),
    h('button.lcard', { onclick: () => go('playground') },
      h('div.lic', { style: { background: '#14161C' } }, icon('terminal', 26)),
      h('div.lbody', h('div.ltitle', 'Playground'), h('div.lsub', 'Free Python editor with pandas, NumPy & the datasets')))));
  inner.append(h('div.section-title', 'Drill a unit'));
  inner.append(h('div.list', course.units.map((u) => {
    const done = u.lessons.filter((l) => store.s.lessons[l.id]).length;
    return h('button.lcard', { style: { '--uc': u.color }, onclick: () => go(`drill/${u.id}`) },
      h('div.lic', u.icon), h('div.lbody', h('div.ltitle', u.title), h('div.lsub', `${done}/${u.lessons.length} lessons done · ${u.lessons.reduce((s, l) => s + lessonExerciseCount(l), 0)} exercises`)), icon('chevronR', 20, 'muted'));
  })));
}

// ------------------------------------------------------------------ exams
function examsScreen(page) {
  const inner = h('div.page-inner');
  page.append(inner);
  inner.append(h('h1.page-title', 'Exams & Interviews'));
  const sess = activeExamSession();
  if (sess && course.exams.has(sess.id)) {
    const e = course.exams.get(sess.id).exam;
    const left = Math.max(0, Math.round((sess.deadline - Date.now()) / 60000));
    inner.append(h('button.lcard', { style: { borderColor: 'var(--accent)' }, onclick: () => go(`exam/${sess.id}`) },
      h('div.lic', { style: { background: 'var(--accent)' } }, icon('clock', 26)),
      h('div.lbody', h('div.ltitle', `Resume: ${e.title}`), h('div.lsub', left > 0 ? `${left} min left` : 'Time is up: open to see your grade')), icon('chevronR', 20)));
  }
  const card = (entry) => {
    const { exam, unit, interview } = entry;
    const best = store.s.exams[exam.id];
    const pts = exam.questions.reduce((s, q) => s + pointsOf(q), 0);
    return h('button.lcard', { style: { '--uc': unit ? unit.color : '#8B5CF6' }, onclick: () => go(`exam/${exam.id}`) },
      h('div.lic', examIcon(exam, unit)),
      h('div.lbody', h('div.ltitle', interview ? exam.title : `${exam.title}`),
        h('div.lsub', interview ? `${exam.level || ''} · ${exam.minutes} min · ${exam.questions.length} questions` : `Unit ${unit.order} · ${exam.minutes} min · ${exam.questions.length} questions · ${pts} pts`)),
      best ? h(`span.grade.${gradeClass(best.g)}`, best.g) : h('span.grade.none', '–'));
  };
  if (course.interviews.length) {
    inner.append(h('div.section-title', '💼 Interview simulator'));
    inner.append(h('p.muted.small', { style: { margin: '-4px 4px 12px' } }, 'Timed mock interview rounds like at big-tech and data companies. Graded on hidden tests, with a hiring verdict.'));
    inner.append(h('div.list', course.interviews.map((iv) => card(course.exams.get(iv.id)))));
  }
  for (const t of TRACKS) {
    const units = course.units.filter((u) => u.track === t.id && u.exam);
    if (!units.length) continue;
    inner.append(h('div.section-title', `${t.icon} ${t.title}`));
    inner.append(h('div.list', units.map((u) => card(course.exams.get(u.exam.id)))));
  }
}

// ------------------------------------------------------------------ profile
function profileScreen(page) {
  const s = store.s;
  const inner = h('div.page-inner');
  page.append(inner);
  const belt = beltFor(s.xp);
  const totalLessons = course.units.reduce((n, u) => n + u.lessons.length, 0);
  const doneLessons = Object.keys(s.lessons).filter((id) => course.lessons.has(id)).length;
  const examRecs = Object.values(s.exams);
  const passed = examRecs.filter((e) => e.b >= 60).length;
  inner.append(h('h1.page-title', 'Profile'));
  inner.append(h('div.card', h('div.belt-card', mascot(76, 'happy', belt.color),
    h('div', { style: { flex: 1, minWidth: 0 } }, h('h3', `${belt.name} belt`), h('p', `${s.xp} XP${belt.next ? ` · ${belt.next.xp - s.xp} to ${belt.next.name}` : ''}`),
      h('div.belt-bar', h('i', { style: { width: `${belt.pct * 100}%` } }))))));
  inner.append(h('div.section-title', 'Stats'));
  const stat = (ic, val, label, color) => { const e = h('div.stat', icon(ic, 26), h('div', h('b', val), h('span', label))); e.style.setProperty('--sc', color); return e; };
  inner.append(h('div.stats-grid',
    stat('flame', store.streak(), 'day streak', 'var(--flame)'),
    stat('star', s.streak.best || 0, 'best streak', 'var(--gold)'),
    stat('book', `${doneLessons}/${totalLessons}`, 'lessons done', 'var(--good)'),
    stat('check', store.solvedCount(), 'exercises solved', 'var(--accent)'),
    stat('trophy', `${passed}/${course.exams.size}`, 'exams passed', 'var(--xp)'),
    stat('bolt', s.xp, 'total XP', 'var(--gold)')));
  // activity
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(s.days[dayStr(d)] || 0); }
  const mx = Math.max(10, ...days);
  inner.append(h('div.section-title', 'Last 14 days'));
  inner.append(h('div.card', h('div.activity', days.map((v) => h(`i${v ? '' : '.zero'}`, { style: { height: `${Math.max(4, (v / mx) * 100)}%` }, title: `${v} XP` })))));

  inner.append(h('div.section-title', 'Daily goal'));
  const goalSeg = seg([[20, 'Casual'], [50, 'Regular'], [100, 'Serious'], [200, 'Intense']], s.goal, (v) => { s.goal = v; store.save(); renderTab('profile'); });
  inner.append(h('div.card', h('div.setting', h('div.sl', h('b', `${s.goal} XP per day`), h('span', 'A lesson is about 25–40 XP')), goalSeg)));

  inner.append(h('div.section-title', 'Settings'));
  const st = s.settings;
  const sw = (key, onChange) => { const b = h(`button.switch${st[key] ? '.on' : ''}`, { 'aria-pressed': String(!!st[key]) }); b.onclick = () => { store.setting(key, !st[key]); b.classList.toggle('on', !!st[key]); onChange?.(); }; return b; };
  inner.append(h('div.card',
    h('div.setting', h('div.sl', h('b', 'Theme')), seg([['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']], st.theme, (v) => { store.setting('theme', v); applyTheme(); renderTab('profile'); })),
    h('div.setting', h('div.sl', h('b', 'Sound effects'), h('span', 'Correct / wrong / complete')), sw('sound')),
    h('div.setting', h('div.sl', h('b', 'Key clicks'), h('span', 'Tiny click when typing')), sw('keyclick')),
    h('div.setting', h('div.sl', h('b', 'Haptics'), h('span', 'Vibration on key press (iPhone)')), sw('haptics')),
    h('div.setting', h('div.sl', h('b', 'Python keyboard on Mac'), h('span', 'Show the on-screen keyboard with a physical one')), sw('kbDesktop')),
    h('div.setting', h('div.sl', h('b', 'Code font size'), h('span', `${st.font}px`)),
      seg([[13, 'S'], [15, 'M'], [17, 'L']], st.font, (v) => { store.setting('font', v); renderTab('profile'); }))));

  inner.append(h('div.section-title', 'Use on iPhone'));
  const phoneCard = h('div.card', h('p', 'Loading…'));
  inner.append(phoneCard);
  fillPhoneCard(phoneCard);

  inner.append(h('div.section-title', 'Your data'));
  inner.append(h('div.card',
    h('p', { style: { marginBottom: '12px' } }, 'Progress is saved on this device in cookies (mirrored to local storage). No account, no server. To move it to another device, export a backup code and import it there.'),
    h('div.row', { style: { flexWrap: 'wrap' } },
      h('button.btn.small.ghost', { onclick: exportProgress }, icon('copy', 16), 'Export'),
      h('button.btn.small.ghost', { onclick: importProgress }, 'Import'),
      h('button.btn.small.danger', { onclick: async () => {
        if (await confirmModal('Reset all progress?', 'XP, streaks, lessons, exam grades and drafts on this device will be deleted. This can\'t be undone.', 'Reset', 'danger')) { store.reset(); toast('Progress reset'); renderTab('profile'); }
      } }, 'Reset'))));
  const ver = Py.state.version ? `Python ${Py.state.version.split(' ')[0]} (Pyodide)` : 'Python loads in the background';
  inner.append(h('p.muted.small', { style: { textAlign: 'center', margin: '24px 0 0' } }, `PyDojo · ${ver}`));
}

function seg(options, value, onChange) {
  return h('div.seg', options.map(([v, label]) => h(`button${v === value ? '.on' : ''}`, { onclick: () => onChange(v) }, label)));
}

async function fillPhoneCard(card) {
  let info = null;
  try { const r = await fetch('__pydojo/info', { cache: 'no-store' }); if (r.ok) info = await r.json(); } catch { /* static hosting */ }
  const url = info?.lan || location.href.replace(/#.*$/, '');
  const local = /localhost|127\.0\.0\.1/.test(url);
  const qrBox = h('div.qr');
  card.replaceChildren(
    h('p', { style: { marginBottom: '10px' } }, local
      ? 'This copy runs on localhost. Start PyDojo with the launcher on your Mac to get a Wi-Fi address for your iPhone.'
      : info
        ? 'Open this address on your iPhone (same Wi-Fi), then tap Share → Add to Home Screen for a full-screen app:'
        : 'Open this address on your iPhone, then tap Share → Add to Home Screen for a full-screen app:'),
    h('div.row', { style: { alignItems: 'flex-start', flexWrap: 'wrap' } }, qrBox,
      h('div', { style: { flex: 1, minWidth: '160px' } }, h('code', { style: { wordBreak: 'break-all', fontSize: '14px' } }, url),
        h('div', { style: { marginTop: '10px' } }, h('button.btn.small.ghost', { onclick: () => { copyText(url); toast('Link copied'); } }, icon('copy', 16), 'Copy link')))));
  try {
    if (!window.qrcode) await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'; sc.onload = res; sc.onerror = rej; document.head.append(sc); });
    const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
    qrBox.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0 });
  } catch { qrBox.remove(); }
}

function exportProgress() {
  const code = store.exportCode();
  const ta = h('textarea.textarea', { readonly: true }); ta.value = code;
  modal({ title: 'Your backup code', body: h('div', h('p', 'Copy this code and import it on another device.'), ta), actions: [
    { label: 'Download', kind: 'ghost', onClick: () => { const a = h('a', { href: URL.createObjectURL(new Blob([code], { type: 'text/plain' })), download: `pydojo-backup-${dayStr()}.txt` }); a.click(); return false; } },
    { label: 'Copy', kind: 'blue', onClick: () => { copyText(code); toast('Copied'); } },
  ] });
}
function importProgress() {
  const ta = h('textarea.textarea', { placeholder: 'Paste your backup code here' });
  modal({ title: 'Import progress', body: h('div', h('p', 'This replaces the progress on this device.'), ta), actions: [
    { label: 'Cancel', kind: 'ghost' },
    { label: 'Import', kind: 'blue', onClick: () => { try { store.importCode(ta.value); toast('Progress imported', 'good'); renderTab(lastTab); return true; } catch { toast('That code is not valid'); return false; } } },
  ] });
}

// ------------------------------------------------------------------ playground
const PG_DEFAULT = `import pandas as pd

df = pd.read_csv("data/orders.csv")
df["revenue"] = df.quantity * df.unit_price
top = (df.groupby("category")["revenue"]
         .sum()
         .sort_values(ascending=False))
print(top.round(2))
`;
function openPlayground(onExit) {
  const root = h('div.lesson');
  const kb = getKeyboard();
  const ed = new Editor({ value: drafts.get('playground') ?? PG_DEFAULT, fontSize: store.s.settings.font, onChange: (v) => drafts.set('playground', v), onRun: () => run(), onSubmit: () => run() });
  ed.sel = { a: ed.text.length, b: ed.text.length };
  const out = h('div.console', { style: { flex: 'none', maxHeight: '38vh', overflow: 'auto' } }, h('span.c-dim', 'Output appears here. Tap Run.'));
  const runBtn = h('button.btn.small.primary', { onclick: () => run() }, icon('play', 16), 'Run');
  const dock = h('div.dock');
  const files = h('div.pg-tools', DATA_FILES.map((f) => h('button.chipbtn', { onclick: () => {
    const snip = f.endsWith('.csv') ? `pd.read_csv("data/${f}")` : `open("data/${f}").read()`;
    ed.focus(); ed.insertSnippet(snip);
  } }, f)));
  const body = h('div.lesson-body.fill', h('div.playground', files, h('div.ed-host', ed.el), out));
  root.append(h('div.lesson-top', h('button.iconbtn', { onclick: () => exit(), 'aria-label': 'Close' }, icon('x', 24)), h('b', 'Playground'), h('div.spacer'),
    isTouch() ? null : h('button.iconbtn.kb-toggle', { onclick: () => { store.setting('kbDesktop', !store.s.settings.kbDesktop); upd(); } }, icon('keyboard', 22)),
    h('button.btn.small.ghost', { onclick: () => { ed.setValue(PG_DEFAULT); drafts.set('playground', PG_DEFAULT); } }, icon('reset', 16)), runBtn), body, dock);
  document.body.append(root);
  setTimeout(() => { ed.measure(true); ed.renderSel(); if (!isTouch()) ed.focus(); }, 50);
  const off = Editor.onActive(() => upd());
  kb.onHide = () => { Editor.active?.blur(); upd(); };
  function upd() {
    const show = isTouch() ? !!Editor.active : store.s.settings.kbDesktop;
    if (show) { if (kb.el.parentNode !== dock) dock.append(kb.el); kb.attach(Editor.active || ed); } else if (kb.el.parentNode === dock) kb.el.remove();
    root.classList.toggle('kb-open', show);
  }
  upd();
  async function run() {
    ed.blur(); upd();
    runBtn.disabled = true;
    out.replaceChildren(h('span.c-dim', 'Running…'));
    const r = await Py.run(ed.value, { timeoutMs: 20000 });
    out.replaceWith(Object.assign(renderConsole(r.out, r.error), { style: out.style.cssText }));
    const c = body.querySelector('.console'); c.style.cssText = 'flex:none;max-height:38vh;overflow:auto';
    ed.markError(r.error?.line || 0);
    runBtn.disabled = false;
  }
  function exit() { off(); if (kb.el.parentNode === dock) kb.el.remove(); ed.destroy(); root.remove(); onExit(); }
  return { close: () => { off(); if (kb.el.parentNode === dock) kb.el.remove(); ed.destroy(); root.remove(); } };
}

// ------------------------------------------------------------------ first run
function welcome() {
  if (store.s.settings.onboarded) return;
  const ios = /iP(hone|od)/.test(navigator.userAgent);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let goal = store.s.goal;
  const goals = h('div.seg', { style: { justifyContent: 'center', marginTop: '6px' } });
  const renderGoals = () => goals.replaceChildren(...[[20, 'Casual'], [50, 'Regular'], [100, 'Serious'], [200, 'Intense']].map(([v, l]) =>
    h(`button${v === goal ? '.on' : ''}`, { onclick: () => { goal = v; renderGoals(); }, style: { flex: '1', lineHeight: '1.25' } }, l, h('br'), h('small', `${v} XP`))));
  renderGoals();
  const body = h('div', { style: { textAlign: 'center' } }, mascot(96),
    h('div.prose', { style: { textAlign: 'left', marginTop: '6px' }, html: md(`
- **Learn by doing.** Short lessons: a concept, then exercises with real Python running in your browser.
- **Everything is unlocked.** Start at the beginning or jump to pandas, SQL or interview prep.
- **Exams & interviews** are timed and graded on hidden tests, like the real thing.
- **On iPhone** the Python keyboard has all the symbols. Hold the space bar and drag to move the cursor.${ios && !standalone ? '\n- Tip: **Share → Add to Home Screen** gives you a full-screen app.' : ''}`) }),
    h('div.answer-label', { style: { textAlign: 'center' } }, 'Your daily goal'), goals);
  modal({ title: 'Welcome to the dojo!', body, dismissable: false, actions: [
    { label: 'Explore', kind: 'ghost', onClick: () => { store.s.goal = goal; store.setting('onboarded', true); } },
    { label: 'Let\'s go', kind: 'primary', onClick: () => { store.s.goal = goal; store.setting('onboarded', true); const first = course.units[0]?.lessons[0]; if (first) go(`lesson/${first.id}`); } },
  ] });
}

// ------------------------------------------------------------------ engine status pill
function engineStatus() {
  const pill = h('div.engine', h('span.spinner'), h('span'));
  document.body.append(pill);
  let timer = 0;
  Py.subscribe((st) => {
    const showIt = (st.phase === 'loading' || st.phase === 'busy') && st.text && st.waiting;
    clearTimeout(timer);
    if (showIt) {
      pill.lastChild.textContent = st.text;
      timer = setTimeout(() => pill.classList.add('show'), 350);
    } else if (st.phase === 'error') {
      pill.lastChild.textContent = st.text; pill.classList.add('show');
    } else pill.classList.remove('show');
  });
}

// ------------------------------------------------------------------ boot
async function boot() {
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  app.append(h('div', { style: { margin: 'auto', textAlign: 'center' } }, mascot(110), h('p.muted', 'Loading the dojo…')));
  await Promise.all([loadCourse(), store.restoreFromCookies()]);
  store.touch();
  engineStatus();
  window.addEventListener('hashchange', route);
  route();
  if (!overlay) welcome();
  setTimeout(() => Py.start(), 900);
  if ('serviceWorker' in navigator && window.isSecureContext && !/[?&]nosw/.test(location.search)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
