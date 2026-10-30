// Multiband views (js/core/mbview.js) against ALPACA's JointModel.view, on a real joint run.
//   python test/multiband_reference.py <multiband run folder> <out.npz>    (needs ALPACA)
//   node test/verify_multiband.mjs <multiband run folder> <out.npz>
// Compares, for every band and a few draws, the band view of the joint posterior and of the joint MAP. Prints only
// differences (the run may be blinded).
import fs from "node:fs";
import { parseNpz } from "../js/core/parsers/npy.js";
import { projectBand, viewParams, bandsIn } from "../js/core/mbview.js";

const [run, refPath] = process.argv.slice(2);
const joint = parseNpz(new Uint8Array(fs.readFileSync(`${run}/joint/posterior/posterior_samples.npz`)));
const ref = parseNpz(new Uint8Array(fs.readFileSync(refPath)));
const summary = JSON.parse(fs.readFileSync(`${run}/joint/joint_summary.json`, "utf8"));
const names = joint.param_names.data;
const [nS, nP] = joint.samples.shape;
const bands = bandsIn(names);
const draws = Array.from(ref.draws.data, Number);
let worst = 0, fails = 0;
for (const band of bands) {
  const v = projectBand(names, joint.samples.data, nS, nP, { band, reference: summary.reference_band, sep: "/" });
  const refNames = ref[`names_${band}`].data;
  const refVals = ref[`post_${band}`].data; // draws x refNames
  const missing = refNames.filter((n) => !v.names.includes(n));
  const extra = v.names.filter((n) => !refNames.includes(n) && !/^frame_d[xy]$/.test(n));
  if (missing.length || extra.length) { fails++; console.log(`${band}: names differ: missing ${missing.slice(0, 5)} extra ${extra.slice(0, 5)}`); }
  let m = 0;
  draws.forEach((s, di) => refNames.forEach((n, j) => { const k = v.names.indexOf(n); if (k >= 0) m = Math.max(m, Math.abs(v.samples[s * v.nP + k] - refVals[di * refNames.length + j])); }));
  console.log(`${band}: posterior view ${v.names.length} columns (${v.shifted.length} shifted by the frame offset), max |JS - ALPACA| over ${draws.length} draws = ${m.toExponential(2)}`);
  worst = Math.max(worst, m);
}
// joint MAP
const mapZ = parseNpz(new Uint8Array(fs.readFileSync(`${run}/joint/joint_map_params_full.npz`)));
const mapParams = {};
for (const [k, a] of Object.entries(mapZ)) if (k !== "__sealed_blinded__") mapParams[k] = a.shape.length === 0 || (a.shape.length === 1 && a.shape[0] === 1) ? Number(a.data[0]) : a;
for (const band of bands) {
  const { params } = viewParams(mapParams, { band, reference: summary.reference_band, sep: "__" });
  const refNames = ref[`mapnames_${band}`].data, refVals = ref[`map_${band}`].data;
  let m = 0, miss = 0;
  refNames.forEach((n, j) => { if (typeof params[n] !== "number") { miss++; return; } m = Math.max(m, Math.abs(params[n] - refVals[j])); });
  console.log(`${band}: MAP view, ${refNames.length} scalars (${miss} missing), max |JS - ALPACA| = ${m.toExponential(2)}`);
  worst = Math.max(worst, m); if (miss) fails++;
}
console.log(worst < 1e-12 && !fails ? "PASS" : `FAIL (worst ${worst}, ${fails} name mismatches)`);
