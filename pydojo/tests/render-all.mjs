// Render every lesson step and exam question with the real step views (WebKit,
// phone viewport) and report exceptions or leftover markdown syntax.
//   node tests/render-all.mjs
import { webkit } from '../tools/node_modules/playwright/index.mjs';

const browser = await webkit.launch();
const ctx = await browser.newContext({ viewport: { width: 440, height: 866 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://localhost:8765/?nosw#/profile');
await page.waitForTimeout(1500);
const report = await page.evaluate(async () => {
  const { course } = await import('/js/course.js');
  const { createStep } = await import('/js/steps.js');
  const problems = [];
  let n = 0;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;width:440px;height:800px;overflow:auto;z-index:99;background:#fff';
  document.body.append(host);
  const check = (view, where) => {
    const clone = view.el.cloneNode(true);
    clone.querySelectorAll('code, pre, .ed, .codeblock, .md-code, .blank-code, .line-tok, .opt.mono').forEach((c) => c.remove());
    host.append(clone);
    const text = clone.innerText;
    clone.remove();
    if (/\*\*\S/.test(text) || /(^|\s)`[^`\s]/.test(text)) problems.push(`${where}: leftover markdown: ${text.match(/.{0,30}(\*\*|`).{0,30}/)?.[0]}`);
    if (/\bundefined\b(?! behavio| order)|\[object Object\]/.test(text) && !/is undefined|undefined\)/.test(text)) problems.push(`${where}: suspicious text: ${text.match(/.{0,30}(undefined|\[object Object\]|NaN).{0,20}/)?.[0]}`);
    const wide = [...view.el.querySelectorAll('.opt')].find((o) => o.scrollWidth > o.clientWidth + 2);
    if (wide) problems.push(`${where}: option overflows horizontally: ${wide.innerText.slice(0, 40)}`);
  };
  const all = [];
  for (const u of course.units) {
    for (const l of u.lessons) l.steps.forEach((s, i) => all.push([s, `${l.id}.${i}`, 'lesson']));
    if (u.exam) u.exam.questions.forEach((q, i) => all.push([q, `${u.exam.id}.${i}`, 'exam']));
  }
  for (const iv of course.interviews) iv.questions.forEach((q, i) => all.push([q, `${iv.id}.${i}`, 'exam']));
  for (const [step, key, mode] of all) {
    try {
      const view = createStep(step, { mode, key, autoFocus: false });
      host.replaceChildren(view.el);
      check(view, key);
      view.destroy?.();
      n++;
    } catch (e) { problems.push(`${key}: EXCEPTION ${e.message}`); }
  }
  host.remove();
  return { n, units: course.units.length, interviews: course.interviews.length, failed: course.errors, problems };
});
console.log(`rendered ${report.n} steps from ${report.units} units + ${report.interviews} interviews; failed files: ${report.failed.join(', ') || 'none'}`);
for (const p of report.problems) console.log(' -', p);
for (const e of errors) console.log(' !', e);
await browser.close();
