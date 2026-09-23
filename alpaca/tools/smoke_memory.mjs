import fs from "node:fs";
import { launch, sleep } from "./cdp.mjs";
const KEY = fs.readFileSync("/Users/hrvojekrizic/GitHub/alpaca/run/05_posterior/samples/blinding_secret.key", "utf8").trim();
const c = await launch({ width: 1400, height: 1000 });
const waitRun = async () => { for (let i = 0; i < 200; i++) { if (await c.evaluate("!!(window.app && window.app.runs.length)")) break; await sleep(250); } };
const waitIdle = async () => { for (let i = 0; i < 120; i++) { if (!(await c.evaluate("document.querySelectorAll('.panel.busy').length")) && i > 6) break; await sleep(250); } };
try {
  await c.navigate("http://127.0.0.1:8765/?run=%2Fmnt%2Falpaca%2F"); await waitRun(); await waitIdle();
  console.log("alpaca: catalogs remembered =", await c.evaluate("JSON.parse(localStorage.getItem('alpaca-analysis.catalogs.v1')||'[]').length"));
  await c.navigate("http://127.0.0.1:8765/?run=%2Fmnt%2Fnewepl%2F"); await waitRun(); await waitIdle();
  console.log("newepl: root =", await c.evaluate("window.app.runs[0].root"), "| catalogRestored =", await c.evaluate("window.app.runs[0].catalogRestored"), "| needsKey =", await c.evaluate("window.app.runs[0].needsKey"));
  console.log("newepl image viewer status:", await c.evaluate("[...document.querySelectorAll('.panel')].map(p => p.querySelector('.panel-status').textContent).filter(Boolean).join(' || ')"));
  const tryKey = await c.evaluate(`window.app.runs[0].unblind(${JSON.stringify(KEY)}).then(() => 'same campaign key works').catch(e => 'different key: ' + e.message)`);
  console.log("key from alpaca run on newepl:", tryKey);
  if (tryKey.startsWith("same")) {
    await c.evaluate(`sessionStorage.setItem('alpaca-analysis.blindingKey', ${JSON.stringify(KEY)})`);
    await c.navigate("http://127.0.0.1:8765/?run=%2Fmnt%2Fnewepl%2F"); await waitRun(); await waitIdle();
    console.log("after reload: keySource =", await c.evaluate("window.app.runs[0].keySource"), "| needsKey =", await c.evaluate("window.app.runs[0].needsKey"));
    console.log("newepl image viewer status:", await c.evaluate("[...document.querySelectorAll('.panel')].map(p => p.querySelector('.panel-status').textContent).filter(Boolean).join(' || ')"));
    console.log("sidebar badges:", await c.evaluate("document.querySelector('.run-badges').textContent"));
  }
  const errs = c.errors().filter((e) => !/manifest\.json/.test(e.text));
  console.log("errors:", errs.length, errs.slice(0, 5).map((e) => e.text.slice(0, 300)));
} finally { c.close(); }
