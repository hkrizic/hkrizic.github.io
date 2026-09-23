// Headless check of panel resizing: drag the corner handle of the second panel with real mouse events.
import fs from "node:fs";
import path from "node:path";
import { launch, sleep } from "./cdp.mjs";
const out = process.argv[2] || "/tmp/smoke_resize";
fs.mkdirSync(out, { recursive: true });
const c = await launch({ width: 1600, height: 1100 });
try {
  await c.navigate(`http://127.0.0.1:8765/?run=${encodeURIComponent(process.env.RUN || "/mnt/alpaca/")}`);
  for (let i = 0; i < 200; i++) { if (await c.evaluate("!!(window.app && window.app.runs.length && window.app.panels.length)")) break; await sleep(250); }
  await sleep(2500);
  const before = await c.evaluate("JSON.stringify(window.app.panels[1].panel.size)");
  const r = await c.evaluate("(() => { const h = window.app.panels[1].panel.el.querySelector('.panel-resize.c'); const b = h.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()");
  const mouse = (type, x, y, extra = {}) => c.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: 1, ...extra });
  await mouse("mouseMoved", r.x, r.y, { buttons: 0 });
  await mouse("mousePressed", r.x, r.y, { clickCount: 1 });
  for (let k = 1; k <= 10; k++) { await mouse("mouseMoved", r.x + 30 * k, r.y + 22 * k); await sleep(30); }
  await mouse("mouseReleased", r.x + 300, r.y + 220, { clickCount: 1 });
  await sleep(800);
  const after = await c.evaluate("JSON.stringify(window.app.panels[1].panel.size)");
  const saved = await c.evaluate("JSON.parse(localStorage.getItem('alpaca-analysis.layout.v1'))[1].size");
  console.log("size before", before, "after", after, "saved", JSON.stringify(saved));
  const canvas = await c.evaluate("(() => { const cv = window.app.panels[1].panel.el.querySelector('canvas'); return cv ? [cv.clientWidth, cv.clientHeight] : null; })()");
  console.log("canvas size after resize", canvas);
  const h = await c.evaluate("document.documentElement.scrollHeight");
  await c.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: Math.min(2400, h + 20), deviceScaleFactor: 1, mobile: false });
  await sleep(500);
  await c.screenshot(path.join(out, "page.png"), { fullPage: true });
  const errs = c.errors().filter((e) => !/manifest\.json/.test(e.text));
  console.log("errors:", errs.length, errs.slice(0, 5).map((e) => e.text.slice(0, 200)));
} finally { c.close(); }
