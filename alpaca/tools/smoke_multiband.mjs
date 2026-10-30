// Headless smoke test of a multiband run: load it, open the multiband preset plus the standard viewers, switch band,
// check the joint-MAP render per band against ALPACA's chi2_red (joint_summary.json), screenshot each state.
//   SITE=http://127.0.0.1:8765/ RUN=/mnt/mb/<run folder>/ node tools/smoke_multiband.mjs <outDir>
// Prints panel statuses, errors and chi2 comparisons only (blinded values are never read out).
import fs from "node:fs";
import path from "node:path";
import { launch, sleep } from "./cdp.mjs";

const out = process.argv[2] || "/tmp/smoke_mb";
fs.mkdirSync(out, { recursive: true });
const base = process.env.SITE || "http://127.0.0.1:8765/";
const runUrl = process.env.RUN;
const c = await launch({ width: 1600, height: 1100 });

const waitIdle = async (maxS = 240) => { for (let i = 0; i < maxS * 4; i++) { const busy = await c.evaluate("[...document.querySelectorAll('.panel.busy')].length"); if (!busy && i > 8) break; await sleep(250); } await sleep(500); };
const report = async (tag) => {
  const st = await c.evaluate("[...document.querySelectorAll('.panel')].map(p => (p.querySelector('.panel-title').textContent + ' | ' + p.querySelector('.panel-status').textContent + ' | err=' + [...p.querySelectorAll('.error')].map(e => e.textContent).join(';')))");
  console.log(`--- ${tag}\n` + st.join("\n"));
  const h = await c.evaluate("document.documentElement.scrollHeight");
  await c.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: Math.min(9000, h + 20), deviceScaleFactor: 1, mobile: false });
  await sleep(800);
  await c.screenshot(path.join(out, `${tag}.png`), { fullPage: true });
  await c.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false });
};
try {
  await c.navigate(`${base}?run=${encodeURIComponent(runUrl)}`);
  let ok = false;
  for (let i = 0; i < 1200; i++) { ok = await c.evaluate("!!(window.app && window.app.runs.length)"); if (ok) break; await sleep(250); }
  console.log("run loaded:", ok, await c.evaluate("(() => { const r = window.app.runs[0]; return r ? `${r.name} | band ${r.band} | mb ${!!r.mb} | bands ${r.mb?.bands} | posterior ${r.features.posterior} | blinded ${r.features.blinded} | key ${r.hasKey} | jointMap ${r.features.jointMap} | catalog ${!!r.catalog}` : 'none'; })()"));
  await waitIdle();
  await report("1_multiband_preset");
  await c.evaluate("window.app.clearPanels(); for (const [id, st] of [['image', {layer:'data', group:'g'}], ['image', {layer:'model', group:'g'}], ['image', {layer:'resid', group:'g'}], ['params', {}], ['sourcemaps', {}], ['fluxratios', {}], ['overview', {}]]) window.app.addPanel(id, st, 'l');");
  await waitIdle();
  await report("2_standard_F200W");
  await c.evaluate("window.app.setBand('A', 'F356W')");
  for (let i = 0; i < 400; i++) { if (await c.evaluate("window.app.runs[0].band === 'F356W'")) break; await sleep(250); }
  await waitIdle();
  await report("3_standard_F356W");
  // joint MAP rendered per band vs ALPACA's chi2_red (likelihood mask, sigma_eff with the band's b)
  const chi = await c.evaluate(`(async () => { const r = window.app.runs[0]; const o = {}; for (const b of r.mb.bands) { const br = await r.mb.bandRun(b, 'T' + b, r._passphrase || null); const bf = await br.bestFit('joint'); const p = Object.fromEntries(Object.entries(bf.params).filter(([, v]) => typeof v === 'number')); const { spec } = await br.ensureForwardModel('joint'); const m = await br.render('joint', p, bf.source, { lensLight: true, includeSky: true, source: !!bf.source, pointSources: spec.nPs > 0 }); const img = await br.image(); const nz = (await br.noise()).data; const mk = await br.likelihoodMask(); const bb = p.psf_error_b || 0; let s = 0, n = 0; for (let k = 0; k < img.data.length; k++) { if (mk && !(mk.data[k] > 0)) continue; const sg = Math.sqrt(nz[k] ** 2 + bb * bb * (m.ps ? m.ps[k] : 0) ** 2); const q = (img.data[k] - m.total[k]) / sg; if (Number.isFinite(q)) { s += q * q; n++; } } o[b] = { browser: +(s / n).toFixed(4), n, alpaca: +r.mb.summary.joint_map.chi2_red[b].toFixed(4), alpacaN: r.mb.summary.joint_map.n_pix[b], approxPlanes: spec.approxPlanes, frame: bf.frame ? [+(1000 * bf.frame.dx).toFixed(2), +(1000 * bf.frame.dy).toFixed(2)] : null }; } return JSON.stringify(o); })()`);
  console.log("joint MAP chi2_red, browser vs ALPACA:", chi);
  await c.evaluate("window.app.clearPanels(); window.app.applyPreset('multiband');");
  await waitIdle();
  await report("4_multiband_preset_F356W");
  const errs = c.errors();
  console.log("console errors/warnings:", errs.length);
  for (const e of errs.slice(0, 40)) console.log("  [" + e.type + "] " + e.text.slice(0, 400));
} finally {
  c.close();
}
