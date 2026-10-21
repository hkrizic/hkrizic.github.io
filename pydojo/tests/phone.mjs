// Drive PyDojo in WebKit with iPhone 17 Pro Max metrics (440x956 @3x, touch).
// node tests/phone.mjs <scenario> [outDir]
import { webkit, chromium } from '../tools/node_modules/playwright/index.mjs';

const scenario = process.argv[2] || 'home';
const out = process.argv[3] || '/tmp';
const desktop = scenario.startsWith('mac');
const browser = await (process.env.ENGINE === 'chromium' ? chromium : webkit).launch();
const ctx = await browser.newContext(desktop ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } : {
  viewport: { width: 440, height: 956 - 90 }, screen: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: process.env.DARK ? 'dark' : 'light',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
});
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack}`));
const base = 'http://localhost:8765/?nosw';
const shot = async (name) => { await page.screenshot({ path: `${out}/${name}.png` }); console.log('shot', name); };
const wait = (ms) => page.waitForTimeout(ms);
const tap = async (sel) => { const el = page.locator(sel).first(); await el.scrollIntoViewIfNeeded(); const b = await el.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
const key = async (label) => { // tap a keyboard key by its label text
  const el = page.locator('.kb-key').filter({ has: page.locator('.kb-label', { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).first();
  const b = await el.boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
};
const typeKb = async (text) => { for (const ch of text) { if (ch === ' ') await tap('.kb-key.space'); else await key(ch); } };

const LAYER123 = new Set([...'0123456789+-*/%<>!&|#@\\^~;?$']);
async function typeChar(ch) {
  if (ch === ' ') return tap('.kb-key.space');
  if (ch === '\n') return tap('.kb-key.accent');
  if (/[A-Z]/.test(ch)) { const b = await page.locator('.kb-key.fn').first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); return key(ch); }
  if (LAYER123.has(ch)) { await key('123'); await key(ch); await key('abc'); return; }
  return key(ch);
}
const edState = () => page.evaluate(() => { const ed = window.__pd.view.editor; const { from } = ed.range(); const ls = ed.lineStart(from); return { before: ed.text.slice(ls, from), text: ed.text }; });
async function typeCode(code) {
  const lines = code.replace(/\n+$/, '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const want = lines[i].match(/^ */)[0].length;
    let st = await edState();
    let have = st.before.match(/^ */)[0].length;
    if (st.before.trim() === '') {
      while (have > want) { await tap('.kb-key.fn:last-of-type'); st = await edState(); const h2 = st.before.length; if (h2 === have) break; have = h2; }
      while (have < want) { await tap('.kb-key.fn:nth-child(2)'); have += 4; }
    }
    for (const ch of lines[i].trimStart()) await typeChar(ch);
    if (i < lines.length - 1) { await typeChar('\n'); }
  }
}
async function backspaceKey() { const el = page.locator('.kb-key.fn').filter({ has: page.locator('svg') }).nth(1); const b = await el.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); }

const S = {
  async welcome() { await page.goto(base); await wait(1500); await shot('welcome'); },
  async home() { await page.goto(base); await wait(1500); await shot('home'); await page.mouse.wheel(0, 900); await wait(300); await shot('home-scrolled'); },
  async lesson() {
    await page.goto(`${base}#/lesson/u01-l1`); await wait(1200); await shot('l-learn');
    await tap('.lesson-foot .btn.primary'); await wait(400); await shot('l-choice');
    await tap('.opt'); await wait(200); await tap('.lesson-foot .btn.primary'); await wait(600); await shot('l-feedback');
  },
  async code() {
    await page.goto(`${base}#/lesson/u01-l1/9`); await wait(1200);
    await shot('c-code');
    const eb = await page.locator('.ed-host .ed-scroll').boundingBox();
    await page.touchscreen.tap(eb.x + eb.width / 2, eb.y + eb.height / 2); await wait(500); await shot('c-kb');
    // type: print("Hello, World!") using a chip, the symbol row and shift
    await typeKb('pri'); await wait(150); await shot('c-chips');
    await tap('.kb-chip'); await key('"');
    await tap('.kb-key .kb-label >> text=/^\\S$/'); 
  },
  async type() {
    await page.goto(`${base}#/lesson/u01-l1/9`); await wait(1200);
    const eb = await page.locator('.ed-host .ed-scroll').boundingBox();
    await page.touchscreen.tap(eb.x + eb.width / 2, eb.y + eb.height / 2); await wait(400);
    const shiftTap = async () => { const b = await page.locator('.kb-key.fn').first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
    const say = async (text) => { for (const ch of text) {
      if (ch === ' ') await tap('.kb-key.space');
      else if (/[A-Z]/.test(ch)) { await shiftTap(); await key(ch); }
      else if (/[a-z"(),:.=_\[\]{}']/.test(ch)) await key(ch);
      else if (/[0-9+\-*\/%<>!&|#@^~;?$]/.test(ch)) { await key('123'); await key(ch); await key('abc'); }
      else if (ch === '\n') await tap('.kb-key.accent');
      else throw new Error('no key for ' + ch);
    } };
    await say('pri'); await wait(100); await shot('t-chips');
    await tap('.kb-chip.fn'); await key('"'); await say('Hello, World!'); await tap('.kb-navkey[aria-label=right]'); await tap('.kb-navkey[aria-label=right]');
    await tap('.kb-key.accent');
    await say('print("I am learning Python.")'); await tap('.kb-key.accent');
    await say('print("Goal: big data")');
    await wait(200); await shot('t-typed');
    console.log('CODE:', JSON.stringify(await page.evaluate(() => document.querySelector('.ed-host .ed-lines').innerText)));
    await tap('.lesson-foot .btn.primary'); await wait(8000); await shot('t-checked');
  },
  async full() {
    const lesson = process.argv[4] || 'u01-l2';
    await page.goto(`${base}#/lesson/${lesson}`); await wait(1500);
    let wrongOnce = true; let n = 0;
    while (n++ < 60) {
      if (await page.locator('.done-screen').count()) { await shot('full-done'); console.log('lesson complete'); break; }
      if (await page.locator('.sheet.show').count()) { if (process.env.VERBOSE) console.log('  sheet', await page.locator('.sheet.show').getAttribute('class')); await tap('.sheet.show .actions .btn:last-child'); await wait(450); continue; }
      const st = await page.evaluate(() => { const s = window.__pd.step; return { type: s.type, s }; });
      const s = st.s;
      if (process.env.VERBOSE) console.log(n, st.type, (s.prompt || s.title || '').slice(0, 50).replace(/\n/g, ' '));
      if (st.type === 'learn') { await tap('.lesson-foot .btn.primary'); await wait(350); continue; }
      if (st.type === 'choice') {
        const target = wrongOnce ? (s.answer + 1) % s.options.length : s.answer; wrongOnce = false;
        const texts = await page.locator('.opt .txt').allInnerTexts();
        const idx = texts.findIndex((t) => t.trim() === s.options[target].replace(/^`|`$/g, '').trim());
        await tap(`.opt >> nth=${idx < 0 ? 0 : idx}`);
      } else if (st.type === 'blanks') {
        for (const a of s.answer) { const toks = await page.locator('.tok').allInnerTexts(); const used = await page.locator('.tok').evaluateAll((els) => els.map((e) => e.classList.contains('used'))); const i = toks.findIndex((t, k) => t === a && !used[k]); await tap(`.tok >> nth=${i}`); }
      } else if (st.type === 'order') {
        for (const line of s.lines) { const i = await page.locator('.line-bank .line-tok').evaluateAll((els, l) => els.findIndex((e) => !e.classList.contains('used') && e.innerText === l), line); await tap(`.line-bank .line-tok >> nth=${i}`); }
      } else if (st.type === 'output') {
        const eb = await page.locator('.answer-ed .ed-scroll').boundingBox(); await page.touchscreen.tap(eb.x + 20, eb.y + 15); await wait(150);
        for (const ch of s.answer) await typeChar(ch);
      } else if (st.type === 'code') {
        const eb = await page.locator('.ed-host .ed-scroll').boundingBox(); await page.touchscreen.tap(eb.x + 30, eb.y + 12); await wait(200);
        await page.evaluate(() => { const ed = window.__pd.view.editor; ed.setCaret(0); ed.sel = { a: 0, b: ed.text.length }; ed.renderSel(); });
        await backspaceKey();
        await typeCode(s.solution);
        const typed = await page.evaluate(() => window.__pd.view.editor.text);
        if (typed.trimEnd() !== s.solution.trimEnd()) console.log('TYPED MISMATCH\n--- typed\n' + typed + '\n--- want\n' + s.solution);
        await shot(`full-code-${n}`);
      }
      await wait(150);
      await tap('.lesson-foot .btn.primary');
      await wait(st.type === 'code' ? 5000 : 500);
      if (st.type === 'code' && !(await page.locator('.sheet.show').count())) { console.log('code step not accepted'); await shot(`full-fail-${n}`); break; }
    }
  },
  async dark() {
    await page.goto(base); await wait(1200); await shot('dark-home');
    await page.goto(`${base}#/lesson/u03-l1`); await wait(800);
    for (let i = 0; i < 40; i++) { const t = await page.evaluate(() => window.__pd.step.type); if (t === 'code') break; await page.evaluate(() => { location.hash = location.hash; }); 
      const idx = await page.evaluate(() => [...document.querySelectorAll('.progress')].length); break; }
    await page.goto(`${base}#/lesson/u03-l1/${process.env.STEP || 6}`); await wait(1000);
    const t = await page.evaluate(() => window.__pd.step.type); console.log('step type', t);
    const eb = await page.locator('.ed-scroll').first().boundingBox(); await page.touchscreen.tap(eb.x + 30, eb.y + 12); await wait(300);
    await shot('dark-kb');
    await tap('.lesson-foot .btn.primary'); await wait(5000); await shot('dark-checked');
  },
  async interview() {
    await page.goto(`${base}#/exams`); await wait(1200); await shot('iv-list');
    await page.goto(`${base}#/exam/${process.env.EXAM || 'iv-phone'}`); await wait(1200); await shot('iv-intro');
    await tap('.lesson-foot .btn'); await wait(800); await shot('iv-q1');
    for (let i = 0; i < 2; i++) { await tap('.lesson-foot .btn.blue'); await wait(500); }
    await shot('iv-q3');
    const eb = await page.locator('.ed-scroll').first().boundingBox(); if (eb) { await page.touchscreen.tap(eb.x + 30, eb.y + 12); await wait(400); await shot('iv-q3-kb'); }
  },
  async progress() {
    await page.goto(base); await wait(1000);
    await page.evaluate(async () => { const { store } = await import('/js/store.js'); for (const id of ['u01-l1', 'u01-l2', 'u01-l3', 'u01-l4', 'u01-l5', 'u02-l1']) store.lessonDone(id, id === 'u01-l2' ? 100 : 85); store.examDone('u01-exam', 91, 'A-'); store.markResult('u01-l1.1', false); store.activity(180); });
    await page.goto(`${base}&r=1#/learn`); await wait(1500); await shot('prog-home');
    await page.goto(`${base}&r=2#/profile`); await wait(1200); await shot('prog-profile');
  },
  async chart() {
    await page.goto(base); await wait(800);
    await page.evaluate(() => localStorage.setItem('pydojo.draft.playground', 'import pandas as pd\nimport matplotlib.pyplot as plt\n\nw = pd.read_csv("data/weather.csv", parse_dates=["date"])\nfor city, g in w.groupby("city"):\n    m = g.set_index("date").temp_c.resample("ME").mean()\n    plt.plot(m.index.month, m.values, label=city)\nplt.legend(); plt.title("Avg temp by month")\nplt.show()\nprint(w.groupby("city").temp_c.mean().round(1))'));
    await page.goto(`${base}&x=1#/playground`); await wait(1500); await tap('.lesson-top .btn.primary'); await wait(15000); await shot('chart');
  },
  async tabs() {
    for (const t of ['practice', 'exams', 'profile']) { await page.goto(`${base}#/${t}`); await wait(1200); await shot(`tab-${t}`); }
    await page.goto(`${base}#/playground`); await wait(1500); await tap('.lesson-top .btn.primary'); await wait(9000); await shot('playground');
  },
  async 'mac-home'() { await page.goto(base); await wait(1500); await shot('mac-home'); },
  async 'mac-code'() {
    await page.goto(`${base}#/lesson/u01-l3/10`); await wait(1500); await shot('mac-code');
    await page.keyboard.type('hours = seconds // 3600\nminutes = (seconds % 3600) // 60\nsecs = seconds % 60\nprint(f"{hours}h {minutes}m {secs}s")');
    await wait(200); await shot('mac-typed');
    await page.keyboard.press('Meta+Enter'); await wait(7000); await shot('mac-checked');
    console.log(await page.evaluate(() => document.querySelector('.ed-host .ed-lines').innerText));
  },
  async 'mac-exam'() {
    await page.goto(`${base}#/exam/u01-exam`); await wait(1500); await shot('mac-exam-intro');
    await page.click('.lesson-foot .btn'); await wait(800); await shot('mac-exam-q1');
    await page.keyboard.press('1'); await page.click('.lesson-foot .btn.blue'); await wait(300);
    for (let i = 0; i < 7; i++) { await page.click('.lesson-foot .btn.blue, .lesson-foot .btn.unit'); await wait(250); }
    await shot('mac-exam-last');
    await page.click('.lesson-top .btn.blue'); await wait(500); await page.click('.modal .btn.primary'); await wait(12000); await shot('mac-exam-result');
  },
};
try { await S[scenario](); } catch (e) { console.log('SCENARIO ERROR', e.message); await shot('error'); }
console.log(errors.join('\n') || 'no console errors');
await browser.close();
