// Progress storage: cookie size at full progress + restore after localStorage is wiped.
import { webkit } from '../tools/node_modules/playwright/index.mjs';
const browser = await webkit.launch();
const page = await (await browser.newContext()).newPage();
await page.goto('http://localhost:8765/?nosw#/profile');
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  const { store } = await import('/js/store.js');
  const { course } = await import('/js/course.js');
  for (const [id] of course.lessons) store.lessonDone(id, 93);
  for (const [id] of course.exams) store.examDone(id, 88.5, 'B+');
  for (const [key] of course.steps) store.markResult(key, true);
  let i = 0;
  for (const [key] of course.steps) { if (i++ % 8 === 0) store.markResult(key, false); }
  store.activity(4000);
  await new Promise((res) => setTimeout(res, 800));
  return { cookieBytes: document.cookie.length, solved: store.solvedCount(), reviews: Object.keys(store.s.review).length, xp: store.s.xp };
});
console.log('full progress:', r);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(1500);
const after = await page.evaluate(async () => { const { store } = await import('/js/store.js'); return { xp: store.s.xp, lessons: Object.keys(store.s.lessons).length, solved: store.solvedCount() }; });
console.log('after wiping localStorage (restored from cookies):', after);
await browser.close();
