import { launch, sleep } from "./cdp.mjs";
const c = await launch({ width: 1400, height: 1000 });
try {
  await c.navigate(`http://127.0.0.1:8765/?run=${encodeURIComponent("/mnt/alpaca/")}`);
  for (let i = 0; i < 200; i++) { if (await c.evaluate("!!(window.app && window.app.runs.length)")) break; await sleep(250); }
  await c.evaluate("window.app.clearPanels(); window.app.addPanel('corner', {}, 'm'); window.app.addPanel('model', {paramSource:'map:final'}, 'm'); window.app.addPanel('marginals', {}, 'm')");
  for (let i = 0; i < 120; i++) { if (!(await c.evaluate("document.querySelectorAll('.panel.busy').length")) && i > 6) break; await sleep(250); }
  await c.evaluate("window.app.panels.forEach(p => p.panel.openSettings(true))");
  await sleep(600);
  // count layout changes over 2 s: sample sizes of all canvases 20 times
  const samples = await c.evaluate(`(async () => { const out = []; for (let k = 0; k < 20; k++) { out.push([...document.querySelectorAll('canvas')].map(cv => cv.clientWidth + 'x' + cv.clientHeight).join(',')); await new Promise(r => setTimeout(r, 100)); } return out; })()`);
  const distinct = new Set(samples);
  console.log("distinct canvas size states over 2 s (1 = stable):", distinct.size);
  // resize a panel with settings open and check again
  await c.evaluate("window.app.panels[1].panel.setSize({span: 8, height: 560})");
  await sleep(800);
  const samples2 = await c.evaluate(`(async () => { const out = []; for (let k = 0; k < 15; k++) { out.push([...document.querySelectorAll('canvas')].map(cv => cv.clientWidth + 'x' + cv.clientHeight).join(',')); await new Promise(r => setTimeout(r, 100)); } return out; })()`);
  console.log("after resize, distinct states:", new Set(samples2).size);
  const errs = c.errors().filter((e) => !/manifest\.json/.test(e.text));
  console.log("errors:", errs.length);
} finally { c.close(); }
