// Headless smoke test: load the app with a run from the dev server, add applets, screenshot.
//   node tools/smoke.mjs <outDir> [appletId ...]
import fs from "node:fs";
import path from "node:path";
import { launch, sleep } from "./cdp.mjs";

const out = process.argv[2] || "/tmp/smoke";
const applets = process.argv.slice(3);
fs.mkdirSync(out, { recursive: true });
const base = process.env.SITE || "http://127.0.0.1:8765/";
const runUrl = process.env.RUN || "/mnt/alpaca/run/";

const c = await launch({ width: 1600, height: 1100 });
try {
  await c.navigate(`${base}?run=${encodeURIComponent(runUrl)}`);
  // wait for the run to load
  let ok = false;
  for (let i = 0; i < 200; i++) { ok = await c.evaluate("!!(window.app && window.app.runs.length)"); if (ok) break; await sleep(250); }
  console.log("run loaded:", ok);
  if (process.env.UNBLIND) { const r = await c.evaluate("window.app.runs[0].keyFileContents().then(k => window.app.runs[0].unblind(k)).then(r => Object.keys(r.offsets))"); console.log("unblinded:", r); }
  if (applets.length) {
    await c.evaluate("window.app.clearPanels()");
    for (const a of applets) {
      const [id, json] = a.split("=");
      await c.evaluate(`window.app.addPanel(${JSON.stringify(id)}, ${json || "{}"}, "l")`);
    }
  }
  // wait until no panel is busy (max 60 s)
  for (let i = 0; i < 240; i++) {
    const busy = await c.evaluate("[...document.querySelectorAll('.panel.busy')].length");
    if (!busy && i > 8) break;
    await sleep(250);
  }
  await sleep(500);
  const statuses = await c.evaluate("[...document.querySelectorAll('.panel')].map(p => (p.querySelector('.panel-title').textContent + ' | ' + p.querySelector('.panel-status').textContent + ' | err=' + [...p.querySelectorAll('.error')].map(e => e.textContent).join(';')))");
  console.log(statuses.join("\n"));
  const h = await c.evaluate("document.documentElement.scrollHeight");
  await c.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: Math.min(4500, h + 20), deviceScaleFactor: 1, mobile: false });
  await sleep(600);
  await c.screenshot(path.join(out, "page.png"), { fullPage: true });
  const errs = c.errors();
  console.log("console errors/warnings:", errs.length);
  for (const e of errs.slice(0, 30)) console.log("  [" + e.type + "] " + e.text.slice(0, 500));
  fs.writeFileSync(path.join(out, "console.json"), JSON.stringify(c.console, null, 1));
} finally {
  c.close();
}
