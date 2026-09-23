import fs from "node:fs"; import path from "node:path";
import { launch, sleep } from "./cdp.mjs";
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const c = await launch({ width: 1500, height: 1000 });
try {
  await c.navigate(`http://127.0.0.1:8765/?run=${encodeURIComponent("/mnt/alpaca/")}`);
  for (let i = 0; i < 200; i++) { if (await c.evaluate("!!(window.app && window.app.runs.length)")) break; await sleep(250); }
  await c.evaluate("window.app.clearPanels(); window.app.addPanel('params', {}, 'm'); window.app.addPanel('h0', {}, 'm')");
  for (let i = 0; i < 120; i++) { if (!(await c.evaluate("document.querySelectorAll('.panel.busy').length")) && i > 6) break; await sleep(250); }
  const before = await c.evaluate("[...document.querySelectorAll('.tbl td')].map(t => t.textContent).slice(0, 4).join(' | ')");
  console.log("params row before:", before);
  await c.evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.startsWith('Unblind run')).click()");
  await sleep(400);
  await c.screenshot(path.join(out, "setup.png"));
  await c.evaluate("[...document.querySelectorAll('.unblind-actions button')].find(b => b.textContent === 'Unblind').click()");
  await sleep(1500);
  await c.screenshot(path.join(out, "spin.png"));
  for (let i = 0; i < 60; i++) { if (await c.evaluate("!!document.querySelector('.unblind-box.revealed')")) break; await sleep(250); }
  await sleep(700);
  await c.screenshot(path.join(out, "reveal.png"));
  console.log("reveal text:", await c.evaluate("document.querySelector('.cer-digits').textContent + ' ' + document.querySelector('.cer-sub').textContent.slice(0, 200)"));
  await c.evaluate("document.querySelector('.cer-close').click()");
  for (let i = 0; i < 60; i++) { if (!(await c.evaluate("document.querySelectorAll('.panel.busy').length")) && i > 4) break; await sleep(250); }
  await sleep(500);
  const after = await c.evaluate("[...document.querySelectorAll('.tbl td')].map(t => t.textContent).slice(0, 4).join(' | ')");
  console.log("params row after:", after);
  console.log("H0 panel:", await c.evaluate("[...document.querySelectorAll('.panel')][1].querySelector('.cards').textContent.slice(0, 220)"));
  console.log("sidebar:", await c.evaluate("document.querySelector('.run-badges').textContent"));
  await c.screenshot(path.join(out, "after.png"));
  const errs = c.errors().filter((e) => !/manifest\.json/.test(e.text));
  console.log("errors:", errs.length, errs.slice(0, 5).map((e) => e.text.slice(0, 300)));
} finally { c.close(); }
