// Loads all content modules (each unit is its own file; a missing or broken
// file is skipped so the rest of the course still works).

const FILES = [
  'u01-first-steps.js', 'u02-decisions-loops.js', 'u03-functions.js', 'u04-strings.js', 'u05-lists.js',
  'u06-dicts-sets.js', 'u07-functional.js', 'u08-errors-files.js', 'u09-oop.js', 'u10-advanced-functions.js',
  'u11-numpy.js', 'u12-pandas-basics.js', 'u13-pandas-analysis.js', 'u14-statistics.js', 'u15-sql.js',
  'u16-patterns.js', 'u17-algorithms.js', 'u18-big-data.js',
];

export const TRACKS = [
  { id: 'foundations', title: 'Python Foundations', short: 'Foundations', icon: '🐍', blurb: 'From your first print() to decorators and generators.' },
  { id: 'data', title: 'Data Science', short: 'Data Science', icon: '📊', blurb: 'NumPy, pandas, statistics, A/B tests and SQL.' },
  { id: 'interview', title: 'Interview Prep', short: 'Interviews', icon: '🎯', blurb: 'Algorithms, patterns and big-data engineering.' },
];

export const course = {
  units: [],
  interviews: [],
  lessons: new Map(),   // lessonId -> { lesson, unit, index }
  exams: new Map(),     // examId -> { exam, unit|null, interview: bool }
  steps: new Map(),     // stepKey -> { step, lesson, unit }
  errors: [],
};

export const stepKey = (lessonId, i) => `${lessonId}.${i}`;

export async function loadCourse() {
  const bust = `?v=${window.PYDOJO_VERSION || '1'}`;
  const mods = await Promise.allSettled([
    ...FILES.map((f) => import(`../content/${f}${bust}`)),
    import(`../content/interviews.js${bust}`),
  ]);
  mods.forEach((m, i) => {
    const file = FILES[i] || 'interviews.js';
    if (m.status === 'rejected') {
      if (!/Failed to fetch|Importing a module script failed|error loading dynamically/i.test(String(m.reason))) console.error(file, m.reason);
      course.errors.push(file);
      return;
    }
    const mod = m.value.default;
    if (!mod) return;
    if (Array.isArray(mod.interviews)) course.interviews = mod.interviews;
    else course.units.push(mod);
  });
  course.units.sort((a, b) => a.order - b.order);
  for (const unit of course.units) {
    unit.lessons.forEach((lesson, index) => {
      course.lessons.set(lesson.id, { lesson, unit, index });
      lesson.steps.forEach((step, i) => course.steps.set(stepKey(lesson.id, i), { step, lesson, unit }));
    });
    if (unit.exam) course.exams.set(unit.exam.id, { exam: unit.exam, unit, interview: false });
  }
  for (const iv of course.interviews) course.exams.set(iv.id, { exam: iv, unit: null, interview: true });
  return course;
}

export const isExercise = (step) => step.type !== 'learn';
export const lessonExerciseCount = (lesson) => lesson.steps.filter(isExercise).length;
export const estMinutes = (lesson) => Math.max(3, Math.round(lesson.steps.reduce((m, s) => m + (s.type === 'code' ? 2.5 : s.type === 'learn' ? 0.8 : 0.6), 0)));
