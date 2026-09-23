import fs from "node:fs"; import path from "node:path";
import { launch, sleep } from "./cdp.mjs";
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const c = await launch({ width: 1600, height: 1100 });
try {
  await c.navigate(`http://127.0.0.1:8765/?run=${encodeURIComponent("/mnt/alpaca/")}`);
  for (let i = 0; i < 200; i++) { if (await c.evaluate("!!(window.app && window.app.runs.length)")) break; await sleep(250); }
  await c.evaluate("window.app.clearPanels(); window.app.addPanel('rayshoot', {paramSource:'map:final'}, 'xl')");
  for (let i = 0; i < 120; i++) { if (!(await c.evaluate("document.querySelectorAll('.panel.busy').length")) && i > 6) break; await sleep(250); }
  await sleep(500);
  // click on point-source image A in the image plane and on a source-plane point
  const pos = await c.evaluate(`(() => { const p = window.app.panels[0]; const cv = p.panel.el.querySelectorAll('canvas'); const bf = ${'{'}${'}'}; return null; })()`);
  void pos;
  const clickWorld = async (which, wx, wy) => {
    const r = await c.evaluate(`(() => { const cv = window.app.panels[0].panel.el.querySelectorAll('canvas')[${which}]; const b = cv.getBoundingClientRect(); const pr = { x: b.left, y: b.top }; return { b: [b.left, b.top, b.width, b.height] }; })()`);
    // world->screen via the view object is internal; approximate through a temporary global hook
    const s = await c.evaluate(`(() => { const cv = window.app.panels[0].panel.el.querySelectorAll('canvas')[${which}]; const b = cv.getBoundingClientRect(); const v = cv.__view; return v ? v.worldToScreen(${wx}, ${wy}).map((q, i) => q + (i ? b.top : b.left)) : null; })()`);
    if (!s) throw new Error("no __view hook");
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await c.send("Input.dispatchMouseEvent", { type, x: s[0], y: s[1], button: "left", clickCount: 1 });
    void r;
    for (let i = 0; i < 60; i++) { if (!(await c.evaluate("document.querySelectorAll('.panel.busy').length"))) break; await sleep(150); }
    await sleep(300);
    return c.evaluate("window.app.panels[0].panel.el.querySelector('.readout').textContent");
  };
  console.log("click A:", await clickWorld(0, -0.9148, -0.9349));
  console.log("click residual feature:", await clickWorld(0, 0.35, 1.25));
  console.log("click source plane:", await clickWorld(1, 0.35, 0.55));
  const h = await c.evaluate("document.documentElement.scrollHeight");
  await c.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: Math.min(1400, h + 20), deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  await c.screenshot(path.join(out, "page.png"), { fullPage: true });
  const errs = c.errors().filter((e) => !/manifest\.json/.test(e.text));
  console.log("errors:", errs.length, errs.slice(0, 5).map((e) => e.text.slice(0, 300)));
} finally { c.close(); }
