// Drive PyDojo in the iOS Simulator's real Mobile Safari via safaridriver.
//   safaridriver -p 4444 &   (then)   node tests/sim.mjs <scenario> <outDir>
import { execFileSync } from 'node:child_process';

const UDID = process.env.UDID || 'AFFA2FDF-4843-4C9E-8F5D-46FB30986DA5';
const WD = 'http://localhost:4444';
const scenario = process.argv[2] || 'home';
const out = process.argv[3] || '/tmp';
const j = async (method, path, body) => {
  const r = await fetch(WD + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.json();
  if (t.value && t.value.error) throw new Error(`${path}: ${t.value.error} ${t.value.message}`);
  return t.value;
};
const sess = await j('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'safari', platformName: 'iOS', 'safari:useSimulator': true, 'safari:deviceUDID': UDID } } });
const sid = sess.sessionId;
const S = (p) => `/session/${sid}${p}`;
const exec = (fn, ...args) => j('POST', S('/execute/sync'), { script: `return (${fn}).apply(null, arguments)`, args });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => { execFileSync('xcrun', ['simctl', 'io', UDID, 'screenshot', `${out}/${name}.png`], { stdio: 'ignore' }); console.log('shot', name); };
const rect = (sel, i = 0) => exec((s, k) => { const el = document.querySelectorAll(s)[k]; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel, i);
async function tapXY(x, y) {
  await j('POST', S('/actions'), { actions: [{ type: 'pointer', id: 'finger', parameters: { pointerType: 'touch' }, actions: [
    { type: 'pointerMove', duration: 0, x: Math.round(x), y: Math.round(y), origin: 'viewport' }, { type: 'pointerDown', button: 0 }, { type: 'pause', duration: 60 }, { type: 'pointerUp', button: 0 }] }] });
  await j('DELETE', S('/actions'));
}
async function tap(sel, i = 0) { const r = await rect(sel, i); if (!r) throw new Error(`no ${sel}`); await tapXY(r.x, r.y); await wait(120); }
async function key(label) {
  const r = await exec((l) => { const k = [...document.querySelectorAll('.kb-key')].find((e) => (e.querySelector('.kb-label')?.textContent || '') === l); if (!k) return null; const b = k.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, label);
  if (!r) throw new Error(`no key ${label}`);
  await tapXY(r.x, r.y);
}
const base = `http://localhost:8765/?nosw&t=${Date.now()}`;
async function until(sel, ms = 15000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await exec((s) => !!document.querySelector(s), sel)) return; await wait(250); } throw new Error(`timeout waiting for ${sel}`); }
try {
  if (scenario === 'home') {
    await j('POST', S('/url'), { url: `${base}#/learn` }); await wait(2500); shot('sim-home');
  } else if (scenario === 'lesson') {
    await j('POST', S('/url'), { url: `${base}#/lesson/u01-l1` }); await until('.code-card'); await wait(500); shot('sim-learn');
    await tap('.code-card .btn.blue');
    const t0 = Date.now(); await until('.code-card .console:not(:has(.c-dim))', 60000); console.log('first run took', Date.now() - t0, 'ms');
    shot('sim-run');
    console.log('output:', await exec(() => document.querySelector('.code-card .console').innerText));
    await tap('.lesson-foot .btn.primary'); await wait(600);
    await tap('.opt', 1); await wait(200); await tap('.lesson-foot .btn.primary'); await wait(800); shot('sim-feedback');
  } else if (scenario === 'pandas') {
    await j('POST', S('/url'), { url: `${base}#/lesson/u13-l1/2` }); await until('.code-card');
    await tap('.code-card .btn.blue');
    await until('.code-card .console:not(:has(.c-dim))', 90000); await wait(400);
    shot('sim-pandas');
  } else if (scenario === 'code') {
    await j('POST', S('/url'), { url: `${base}#/lesson/u01-l1/9` }); await until('.ed-host');
    const r = await rect('.ed-host .ed-scroll'); await tapXY(r.x, r.y); await wait(700); shot('sim-kb');
    for (const ch of 'pri') await key(ch);
    await wait(300); shot('sim-chips');
    await tap('.kb-chip'); await key('"');
    for (const ch of 'hi') await key(ch);
    await wait(300); shot('sim-typed');
    const info = await exec(() => ({ vh: innerHeight, vv: visualViewport.height, dock: document.querySelector('.dock').getBoundingClientRect().bottom, active: document.activeElement.tagName, code: document.querySelector('.ed-host .ed-lines').innerText }));
    console.log(JSON.stringify(info));
  } else if (scenario === 'chars') {
    // long-press variants, the #+= layer and the globe key (system keyboard) in real Mobile Safari
    await j('POST', S('/url'), { url: `${base}#/lesson/u01-l1/9` }); await until('.ed-host'); await wait(800);
    await exec(() => { const ed = window.__pd.view.editor; ed.setValue(''); ed.focus(); }); await wait(600);
    const hold = async (label, dx = 0) => {
      const r = await exec((l) => { const k = [...document.querySelectorAll('.kb-key')].find((e) => (e.querySelector('.kb-label')?.textContent || '') === l); const b = k.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, label);
      await j('POST', S('/actions'), { actions: [{ type: 'pointer', id: 'finger', parameters: { pointerType: 'touch' }, actions: [
        { type: 'pointerMove', duration: 0, x: Math.round(r.x), y: Math.round(r.y), origin: 'viewport' }, { type: 'pointerDown', button: 0 }, { type: 'pause', duration: 650 },
        { type: 'pointerMove', duration: 120, x: Math.round(r.x + dx), y: Math.round(r.y - 50), origin: 'viewport' }, { type: 'pause', duration: 100 }, { type: 'pointerUp', button: 0 }] }] });
      await j('DELETE', S('/actions')); await wait(150);
    };
    await hold('e', 40); await hold('c'); await hold('u', 40);
    await key('123'); await wait(100); await key('#+='); await wait(150); shot('sim-sym');
    await key('€'); await key('°'); await key('123'); await key('abc');
    const text = () => exec(() => window.__pd.view.editor.text);
    console.log('typed on Python keyboard:', JSON.stringify(await text()));
    await tap('.kb-key[aria-label="iPhone keyboard"]'); await wait(1500);
    const st = await exec(() => ({ active: document.activeElement.className, native: document.querySelector('.kb')?.classList.contains('native'), vvh: visualViewport.height, vvt: visualViewport.offsetTop, ih: innerHeight, sy: scrollY,
      dockBottom: document.querySelector('.dock').getBoundingClientRect().bottom, edBottom: document.querySelector('.ed-host').getBoundingClientRect().bottom, root: document.querySelector('.lesson').getBoundingClientRect().toJSON() }));
    console.log('native:', JSON.stringify(st));
    shot('sim-native');
    // type into the focused field like the system keyboard would
    const ta = await j('POST', S('/element'), { using: 'css selector', value: '.ed-native' });
    const eid = Object.values(ta)[0];
    await j('POST', S(`/element/${eid}/value`), { text: ' = "Grüezi 👋"' }); await wait(300);
    console.log('after system typing:', JSON.stringify(await text()));
    shot('sim-native-typed');
    await tap('.kb-pykey'); await wait(1200);
    console.log('back:', JSON.stringify(await exec(() => ({ active: document.activeElement.tagName, native: document.querySelector('.kb')?.classList.contains('native'), focused: window.__pd.view.editor.focused, vvh: visualViewport.height }))));
    shot('sim-back');
  }
} catch (e) { console.log('ERROR', e.message); shot('sim-error'); }
await j('DELETE', S(''));
