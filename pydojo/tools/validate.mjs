#!/usr/bin/env node
// PyDojo content validator.
//
//   node tools/validate.mjs                      # every content file
//   node tools/validate.mjs content/u03-*.js     # selected files
//   node tools/validate.mjs --schema-only ...    # skip running Python
//
// Checks the schema of every step, then runs the real grading engine
// (Pyodide + js/pyharness.js) to prove that: reference solutions pass,
// starters and listed wrong solutions fail, predicted outputs are right,
// learn-card examples run, fill-in/ordering answers produce working code.
import { Worker } from 'node:worker_threads';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normOut, outText } from '../js/pycore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const schemaOnly = args.includes('--schema-only');
const verbose = args.includes('--verbose');
let files = args.filter((a) => !a.startsWith('--'));
if (!files.length) {
  files = readdirSync(path.join(root, 'content')).filter((f) => /^(u\d\d-.*|interviews)\.js$/.test(f)).sort()
    .map((f) => path.join('content', f));
}

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`✗ ${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`! ${where}: ${msg}`);

// ------------------------------------------------------------ python worker
let worker; let ready; let jobSeq = 0; const jobs = new Map();
function boot() {
  worker = new Worker(path.join(root, 'tools', 'validate-worker.mjs'));
  ready = new Promise((res) => worker.once('message', res));
  worker.on('message', (m) => {
    const j = jobs.get(m.id);
    if (!j) return;
    jobs.delete(m.id);
    clearTimeout(j.timer);
    if (m.error) {
      // a crashed interpreter is unusable: start a fresh one for the next job
      if (/fatal|call stack/i.test(m.error)) { const w = worker; worker = null; w.terminate(); }
      j.reject(new Error(m.error));
    } else j.resolve(m.result);
  });
}
async function py(op, payload, timeoutMs = 20000) {
  if (!worker) boot();
  await ready;
  const id = ++jobSeq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(async () => {
      jobs.delete(id);
      await worker.terminate();
      worker = null;
      reject(new Error(`TIMEOUT after ${timeoutMs / 1000}s (infinite loop?)`));
    }, timeoutMs);
    jobs.set(id, { resolve, reject, timer });
    worker.postMessage({ id, op, ...payload });
  });
}

// ------------------------------------------------------------ schema
const STEP_TYPES = ['learn', 'choice', 'output', 'blanks', 'order', 'code'];
const isStr = (v) => typeof v === 'string';
const isStrArr = (v) => Array.isArray(v) && v.every(isStr);
const TEST_KEYS = ['call', 'var', 'stdout', 'assert', 'code'];
const TEST_FIELDS = new Set([...TEST_KEYS, 'expect', 'raises', 'name', 'hidden', 'unordered', 'tol', 'maxMs', 'fail', 'given']);

function checkStepSchema(s, where, inExam) {
  if (!s || typeof s !== 'object') return err(where, 'step is not an object');
  if (!STEP_TYPES.includes(s.type)) return err(where, `unknown step type ${JSON.stringify(s.type)}`);
  if (inExam && s.type === 'learn') err(where, 'learn cards are not allowed in exams');
  const need = (k, test, what) => { if (!test(s[k])) err(where, `${s.type}.${k} must be ${what}`); };
  const opt = (k, test, what) => { if (s[k] !== undefined && !test(s[k])) err(where, `${s.type}.${k} must be ${what}`); };
  opt('setup', isStr, 'a string');
  opt('points', (v) => Number.isFinite(v) && v > 0, 'a positive number');
  opt('explain', isStr, 'a string');
  switch (s.type) {
    case 'learn':
      need('title', isStr, 'a string');
      need('body', isStr, 'a string');
      opt('code', isStr, 'a string');
      opt('run', (v) => typeof v === 'boolean', 'boolean');
      break;
    case 'choice':
      need('prompt', isStr, 'a string');
      need('options', (v) => isStrArr(v) && v.length >= 2 && v.length <= 6, 'an array of 2-6 strings');
      need('answer', (v) => Number.isInteger(v) && v >= 0 && v < (s.options || []).length, 'a valid option index');
      opt('code', isStr, 'a string');
      if (Array.isArray(s.options) && new Set(s.options).size !== s.options.length) err(where, 'duplicate options');
      if (!s.explain) warn(where, 'choice without explain');
      break;
    case 'output':
      need('code', isStr, 'a string');
      need('answer', isStr, 'a string');
      opt('prompt', isStr, 'a string');
      break;
    case 'blanks': {
      need('prompt', isStr, 'a string');
      need('code', isStr, 'a string');
      need('bank', isStrArr, 'an array of strings');
      const n = isStr(s.code) ? s.code.split('___').length - 1 : 0;
      if (!n) err(where, 'blanks.code has no ___ placeholder');
      need('answer', (v) => isStrArr(v) && v.length === n, `an array of ${n} strings (one per ___)`);
      if (isStrArr(s.answer) && isStrArr(s.bank)) {
        const bank = [...s.bank];
        for (const a of s.answer) {
          const i = bank.indexOf(a);
          if (i < 0) err(where, `answer token ${JSON.stringify(a)} is not in the bank (or used more times than it appears)`);
          else bank.splice(i, 1);
        }
        if (s.bank.length < s.answer.length + 2) warn(where, 'bank should have at least 2 distractors');
      }
      opt('accept', (v) => Array.isArray(v) && v.every(isStrArr), 'an array of alternative answer arrays');
      opt('tests', Array.isArray, 'an array');
      break;
    }
    case 'order':
      need('prompt', isStr, 'a string');
      need('lines', (v) => isStrArr(v) && v.length >= 3 && v.length <= 12, 'an array of 3-12 strings');
      opt('distractors', isStrArr, 'an array of strings');
      opt('tests', Array.isArray, 'an array');
      if (isStrArr(s.lines) && new Set(s.lines).size !== s.lines.length) err(where, 'duplicate lines make the order ambiguous');
      if (isStrArr(s.lines) && isStrArr(s.distractors) && s.distractors.some((d) => s.lines.includes(d))) err(where, 'a distractor is identical to a real line');
      break;
    case 'code':
      need('prompt', isStr, 'a string');
      need('starter', isStr, 'a string');
      need('solution', isStr, 'a string');
      need('tests', (v) => Array.isArray(v) && v.length >= 1, 'a non-empty array');
      opt('hints', isStrArr, 'an array of strings');
      opt('require', isStrArr, 'an array of strings');
      opt('forbid', isStrArr, 'an array of strings');
      opt('wrong', isStrArr, 'an array of strings');
      opt('kind', (v) => ['write', 'fix'].includes(v), '"write" or "fix"');
      opt('title', isStr, 'a string');
      if (!s.explain) warn(where, 'code exercise without explain');
      if (!inExam && (!s.hints || !s.hints.length)) warn(where, 'code exercise without hints');
      break;
  }
  for (const [i, t] of (s.tests || []).entries()) {
    const w = `${where} test#${i + 1}`;
    const kinds = TEST_KEYS.filter((k) => t[k] !== undefined);
    if (kinds.length !== 1) err(w, `test needs exactly one of ${TEST_KEYS.join('/')} (has ${kinds.join(',') || 'none'})`);
    for (const k of Object.keys(t)) if (!TEST_FIELDS.has(k)) err(w, `unknown test field "${k}"`);
    if (t.stdout !== undefined && t.stdout !== true && !isStr(t.stdout)) err(w, 'stdout must be a string or true');
    if (t.given !== undefined && !isStr(t.given)) err(w, 'given must be a string of Python assignments');
    if (t.given !== undefined && isStr(t.stdout)) warn(w, 'given + literal stdout: use stdout: true so the expected output follows the given values');
  }
}

// ------------------------------------------------------------ python checks
const tasks = [];
const fill = (code, answer) => { let i = 0; return code.replace(/___/g, () => answer[i++]); };

function planStep(s, where) {
  const setup = s.setup || '';
  const push = tasks.push.bind(tasks);
  const tasksPush = (fn) => { fn.where = where; push(fn); };
  if (s.type === 'learn' && s.code && s.run !== false) {
    tasksPush(async () => {
      const r = await py('run', { code: s.code, setup });
      if (r.error && !s.expectError) err(where, `learn example raised ${r.error.type}: ${r.error.msg}\n${r.error.tb}`);
    });
  }
  if (s.type === 'choice' && s.code && s.checkOutput) {
    tasksPush(async () => {
      const r = await py('run', { code: s.code, setup });
      const got = r.error ? `${r.error.type}: ${r.error.msg}` : normOut(outText(r.out));
      const want = normOut(s.options[s.answer]);
      if (got !== want) err(where, `checkOutput: option ${s.answer} is ${JSON.stringify(want)} but the code prints ${JSON.stringify(got)}`);
      const dupes = s.options.filter((o, i) => i !== s.answer && normOut(o) === got);
      if (dupes.length) err(where, 'another option equals the real output');
    });
  }
  if (s.type === 'output') {
    tasksPush(async () => {
      const r = await py('run', { code: s.code, setup });
      if (r.error) return err(where, `output step code raised ${r.error.type}: ${r.error.msg}`);
      const got = normOut(outText(r.out));
      if (got !== normOut(s.answer)) err(where, `answer is ${JSON.stringify(s.answer)} but the code prints ${JSON.stringify(got)}`);
    });
  }
  if (s.type === 'blanks' || s.type === 'order') {
    const variants = s.type === 'blanks'
      ? [s.answer, ...(s.accept || [])].map((a) => fill(s.code, a))
      : [s.lines.join('\n')];
    for (const program of variants) {
      tasksPush(async () => {
        if (s.tests && s.tests.length) {
          const r = await py('check', { spec: { setup, solution: program, tests: s.tests }, code: program });
          reportCheck(r, where, 'correct answer', true);
        } else {
          const r = await py('run', { code: program, setup });
          if (r.error) err(where, `correct ${s.type} program raised ${r.error.type}: ${r.error.msg}\n---\n${program}`);
        }
      });
    }
  }
  if (s.type === 'code') {
    const spec = { setup, solution: s.solution, tests: s.tests, require: s.require, forbid: s.forbid };
    tasksPush(async () => {
      const t0 = Date.now();
      const r = await py('check', { spec, code: s.solution });
      const ms = Date.now() - t0;
      reportCheck(r, where, 'solution', true);
      if (ms > 4000) warn(where, `solution check took ${ms} ms in Node — may be slow on phones`);
      if (verbose) console.log(`  ${where} solution ok (${ms}ms)`);
    });
    tasksPush(async () => {
      const r = await py('check', { spec, code: s.starter });
      if (r.passed) err(where, 'the starter code already passes all tests — tests are too weak or the starter is a solution');
    });
    for (const [i, wrong] of (s.wrong || []).entries()) {
      tasksPush(async () => {
        try {
          const r = await py('check', { spec, code: wrong }, 15000);
          if (r.passed) err(where, `wrong solution #${i + 1} passes all tests — add a test that catches it:\n${wrong}`);
        } catch (e) {
          if (!/TIMEOUT/.test(e.message)) throw e; // a wrong answer that times out still fails, fine
        }
      });
    }
  }
}

function reportCheck(r, where, label, mustPass) {
  const bad = (r.tests || []).filter((t) => !t.ok);
  const internal = (r.tests || []).filter((t) => t.internal);
  if (r.error) err(where, `${label} raised ${r.error.type}: ${r.error.msg}\n${r.error.tb || ''}`);
  for (const t of internal) err(where, `${label}: ${t.name}: ${t.msg}`);
  if (mustPass) {
    for (const t of bad.filter((x) => !x.internal)) err(where, `${label} fails test "${t.name}": ${t.msg} got=${t.got} exp=${t.exp}`);
    for (const m of r.static || []) err(where, `${label} breaks a static rule: ${m}`);
  }
}

// ------------------------------------------------------------ walk files
const ids = new Map();
const uniq = (id, where) => { if (!isStr(id) || !id) return err(where, 'missing id'); if (ids.has(id)) err(where, `duplicate id ${id} (also in ${ids.get(id)})`); ids.set(id, where); };
let stepCount = 0; let lessonCount = 0; let examQ = 0;

function checkExam(ex, where) {
  uniq(ex.id, where);
  if (!isStr(ex.title)) err(where, 'exam.title missing');
  if (!(Number.isFinite(ex.minutes) && ex.minutes > 0)) err(where, 'exam.minutes must be a positive number');
  if (!Array.isArray(ex.questions) || ex.questions.length < 3) return err(where, 'exam needs at least 3 questions');
  ex.questions.forEach((q, i) => {
    const w = `${where} q${i + 1}`;
    examQ++;
    checkStepSchema(q, w, true);
    if (q.type === 'code' && (q.tests || []).some((t) => t.call) && !(q.tests || []).some((t) => t.hidden)) warn(w, 'exam code question without hidden tests');
    planStep(q, w);
  });
}

for (const f of files) {
  const abs = path.resolve(root, f);
  let mod;
  try {
    mod = (await import(pathToFileURL(abs).href)).default;
  } catch (e) {
    err(f, `cannot import: ${e.message}`);
    continue;
  }
  if (!mod) { err(f, 'no default export'); continue; }
  if (Array.isArray(mod.interviews)) {
    mod.interviews.forEach((iv, i) => {
      const w = `${path.basename(f)} interview ${iv.id || i}`;
      if (!isStr(iv.level)) warn(w, 'interview without level');
      if (!isStr(iv.intro)) err(w, 'interview.intro missing');
      checkExam(iv, w);
    });
    continue;
  }
  const u = mod;
  const uw = path.basename(f);
  uniq(u.id, uw);
  for (const k of ['title', 'subtitle', 'track', 'icon', 'color']) if (!isStr(u[k])) err(uw, `unit.${k} must be a string`);
  if (!['foundations', 'data', 'interview'].includes(u.track)) err(uw, 'unit.track must be foundations | data | interview');
  if (!Number.isInteger(u.order)) err(uw, 'unit.order must be an integer');
  if (!Array.isArray(u.lessons) || !u.lessons.length) { err(uw, 'unit.lessons missing'); continue; }
  for (const l of u.lessons) {
    const lw = `${uw} ${l.id}`;
    lessonCount++;
    uniq(l.id, lw);
    if (!isStr(l.title)) err(lw, 'lesson.title missing');
    if (!isStr(l.summary)) warn(lw, 'lesson.summary missing');
    if (!Array.isArray(l.steps) || l.steps.length < 4) { err(lw, 'lesson needs at least 4 steps'); continue; }
    if (l.steps[0].type !== 'learn') warn(lw, 'lesson should start with a learn card');
    if (!l.steps.some((s) => s.type === 'code')) warn(lw, 'lesson has no code exercise');
    l.steps.forEach((s, i) => { stepCount++; const w = `${lw} step${i + 1}(${s.type})`; checkStepSchema(s, w, false); planStep(s, w); });
  }
  if (u.exam) checkExam(u.exam, `${uw} exam`); else warn(uw, 'unit has no exam');
}

console.log(`Validating ${files.length} file(s): ${lessonCount} lessons, ${stepCount} steps, ${examQ} exam questions`);
if (!schemaOnly) {
  const t0 = Date.now();
  let done = 0;
  for (const t of tasks) {
    try { await t(); } catch (e) { err(t.where || 'python', e.message); }
    done++;
    if (process.stdout.isTTY && done % 10 === 0) process.stdout.write(`\r  python checks ${done}/${tasks.length}`);
  }
  if (process.stdout.isTTY) process.stdout.write('\r');
  console.log(`Ran ${tasks.length} python checks in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
if (worker) await worker.terminate();
for (const w of warnings) console.log(w);
for (const e of errors) console.log(e);
console.log(errors.length ? `\nFAILED: ${errors.length} error(s), ${warnings.length} warning(s)` : `\nOK — ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
