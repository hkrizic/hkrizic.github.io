// Run every code exercise's reference solution through the real app engine
// inside iOS Simulator Safari (safaridriver must be running on :4444).
//   node tests/sim-solutions.mjs u01 u02 ...   (unit ids, or "iv" for interviews)
const WD = 'http://localhost:4444';
const UDID = process.env.UDID || 'AFFA2FDF-4843-4C9E-8F5D-46FB30986DA5';
const j = async (m, p, b) => { const r = await fetch(WD + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); const t = await r.json(); if (t.value && t.value.error) throw new Error(t.value.message); return t.value; };
const units = process.argv.slice(2);
const { sessionId: sid } = await j('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'safari', platformName: 'iOS', 'safari:useSimulator': true, 'safari:deviceUDID': UDID } } });
const S = (p) => `/session/${sid}${p}`;
await j('POST', S('/timeouts'), { script: 1800000 });
let bad = 0; let total = 0;
try {
  await j('POST', S('/url'), { url: `http://localhost:8765/?nosw&t=${Date.now()}#/profile` });
  await new Promise((r) => setTimeout(r, 3000));
  for (const u of units) {
    const res = await j('POST', S('/execute/async'), { script: `const done = arguments[arguments.length - 1];
      (async () => {
        const { course } = await import('/js/course.js');
        const { Py } = await import('/js/runner.js');
        const want = arguments[0];
        for (let k = 0; k < 100 && course.units.length < 18; k++) await new Promise((r) => setTimeout(r, 200));
        const items = [];
        if (want === 'iv') for (const iv of course.interviews) iv.questions.forEach((q, i) => items.push([iv.id + '.' + i, q]));
        else {
          const unit = course.units.find((x) => x.id === want);
          if (!unit) return done({ n: 0, fails: ['not loaded; units = ' + course.units.map((x) => x.id).join(',') + ' errors = ' + course.errors.join(',')], secs: 0 });
          for (const l of unit.lessons) l.steps.forEach((s, i) => items.push([l.id + '.' + i, s]));
          if (unit.exam) unit.exam.questions.forEach((q, i) => items.push([unit.exam.id + '.' + i, q]));
        }
        const fails = []; let n = 0; const t0 = Date.now(); let slowest = [0, ''];
        for (const [key, s] of items) {
          if (s.type !== 'code') continue;
          n++;
          const t1 = Date.now();
          const r = await Py.check({ setup: s.setup || '', solution: s.solution, tests: s.tests, require: s.require, forbid: s.forbid }, s.solution, { timeoutMs: 60000 });
          const ms = Date.now() - t1; if (ms > slowest[0]) slowest = [ms, key];
          if (!r.passed) fails.push(key + ': ' + (r.error ? r.error.type + ' ' + (r.error.msg || '').slice(0, 120) : (r.tests || []).filter((t) => !t.ok).map((t) => t.name + ' → ' + (t.msg || '') + ' got=' + (t.got || '').slice(0, 60)).join(' | ')));
        }
        done({ n, fails, secs: Math.round((Date.now() - t0) / 1000), slowest });
      })().catch((e) => done({ n: 0, fails: ['SCRIPT ' + e], secs: 0 }));`, args: [u] });
    total += res.n; bad += res.fails.length;
    console.log(`${u}: ${res.n} code exercises, ${res.fails.length} failing in Safari (${res.secs}s, slowest ${res.slowest?.[0]}ms ${res.slowest?.[1]})`);
    for (const f of res.fails) console.log('   ✗', f);
  }
} finally { await j('DELETE', S('')); }
console.log(`TOTAL ${total} code exercises, ${bad} failing`);
