// Node test: compare the JS forward model against reference arrays dumped by
// tools/dump_reference.py (Python/JAX/herculens).
//   node test/verify_physics.mjs <refDir> <runDir>
import fs from "node:fs";
import path from "node:path";
import { parseNpz } from "../js/core/parsers/npy.js";
import { parseFits } from "../js/core/parsers/fits.js";
import { buildGeometry } from "../js/physics/multiplane.js";
import { ForwardModel } from "../js/physics/render.js";

const refDir = process.argv[2];
const runDir = process.argv[3];
const tag = process.argv[4] || "map";

const meta = JSON.parse(fs.readFileSync(path.join(refDir, "meta.json"), "utf8"));
const params = JSON.parse(fs.readFileSync(path.join(refDir, `${tag}_params.json`), "utf8"));
const kwargsRef = JSON.parse(fs.readFileSync(path.join(refDir, `${tag}_kwargs.json`), "utf8"));
const ref = parseNpz(new Uint8Array(fs.readFileSync(path.join(refDir, `${tag}.npz`))));
// per-image point-source arrays are dropped from the scalar params dump; restore from kwargs
if (params.x_image_0 === undefined && kwargsRef.kwargs_point_source?.length) {
  const ps = kwargsRef.kwargs_point_source[0];
  ps.ra.forEach((v, i) => { params["x_image_" + i] = v; params["y_image_" + i] = ps.dec[i]; params["ps_amp_" + i] = ps.amp[i]; });
}

function stats(name, a, b, scaleRef = null) {
  let maxd = 0, sum2 = 0, maxv = 0, imax = -1;
  const n = a.length;
  for (let i = 0; i < n; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > maxd) { maxd = d; imax = i; }
    sum2 += d * d;
    maxv = Math.max(maxv, Math.abs(b[i]));
  }
  const rms = Math.sqrt(sum2 / n);
  const rel = scaleRef ? maxd / scaleRef : maxd / (maxv || 1);
  console.log(`${name.padEnd(22)} max|d|=${maxd.toExponential(3)}  rms=${rms.toExponential(3)}  max|ref|=${maxv.toExponential(3)}  rel=${rel.toExponential(2)}  @${imax}`);
  return { maxd, rms, rel };
}

// ---- geometry
const perts = meta.perturbers_for_kwargs.map((p) => ({ name: p.name, z: p.z, plane: p.plane, profiles: [p.mass_model || "SIS"] }));
const zLens = meta.plane_redshifts[meta.main_plane_index];
const geo = buildGeometry({ zLens, zSource: meta.z_source, perturbers: perts });
console.log("planes", geo.planeRedshifts, "main", geo.mainIdx, "slots", JSON.stringify(geo.planeSlots));
stats("eta_flat", geo.etaFlat, meta.eta_flat);
stats("defl_scales", geo.deflScales, meta.defl_scales);
console.log("D_dt_fid", geo.DdtFid, "ref", meta.D_dt_fid);

// ---- model
const arc = parseFits(fs.readFileSync(path.join(runDir, "01_input/fits/arc_mask.fits")));
const psf = ref.psf_static_hr;
const fm = new ForwardModel({
  nx: meta.num_pixel_axes[0], pix: meta.pixel_width, ssf: meta.supersampling_factor,
  psfHr: { data: psf.data, rows: psf.shape[0], cols: psf.shape[1] },
  arcMask: arc.data, geo, perturbers: perts, nSrc: meta.num_pixels_source, sourceGridScale: 0.5,
  nSersic: meta.use_triple_sersic_lens ? 3 : meta.use_double_sersic_lens ? 2 : 1, useSky: meta.use_sky_background,
  nPs: meta.x0s.length,
});
console.log("ra0", fm.ra0, "ref", meta.radec_at_xy_0[0]);

// grids
const gN = fm.gridNative();
stats("x_img", gN.x, ref.x_img.data);
stats("y_img", gN.y, ref.y_img.data);
const gS = fm.gridSS();
stats("ra_ss", gS.x, ref.ra_ss.data);
stats("dec_ss", gS.y, ref.dec_ss.data);

// split kwargs
const split = fm.planeKwargs(params);
split.forEach((pl, j) => pl.forEach((p, k) => {
  const r = kwargsRef.kwargs_lens_split[j][k];
  for (const key of Object.keys(r)) {
    const d = Math.abs(p.kw[key] - r[key]);
    if (d > 1e-9) console.log(`  split mismatch plane ${j} prof ${k} ${key}: ${p.kw[key]} vs ${r[key]}`);
  }
}));

// ray shooting on native grid
let t = performance.now();
const rsN = fm.rayShootNative(params);
console.log("rayshoot native ms", (performance.now() - t).toFixed(1));
stats("beta_x", rsN.xs[geo.nPlanes], ref.beta_x.data);
stats("beta_y", rsN.ys[geo.nPlanes], ref.beta_y.data);

// full render
t = performance.now();
const src = ref.source_pixels.data;
const out = fm.render(params, src);
console.log("render ms", (performance.now() - t).toFixed(1), out.timings);
console.log("source grid", out.sourceGrid.x0, out.sourceGrid.x1, "ref", ref.src_x.data[0], ref.src_x.data[127], "| y", out.sourceGrid.y0, out.sourceGrid.y1, "ref", ref.src_y.data[0], ref.src_y.data[127]);
stats("lens_light_ss", out.lensLightSS, ref.lens_light_ss.data);
stats("source_ss", out.sourceSS, ref.source_ss.data);
stats("lens_light_only", out.lensLight, ref.lens_light_only.data);
stats("source_only", out.source, ref.source_only.data);
stats("ps_only", out.ps, ref.ps_only.data);
stats("total", out.total, ref.model_total.data);
const un = fm.render(params, src, { unconvolved: true, pointSources: false });
stats("lens_light_unconv", un.lensLight, ref.lens_light_unconv.data);
stats("source_unconv", un.source, ref.source_unconv.data);
const saved = parseFits(fs.readFileSync(path.join(runDir, "03_multistart/model_image.fits")));
if (tag === "map") stats("total vs saved fits", out.total, saved.data);
const noiseEff = fm.effectiveNoise(parseFits(fs.readFileSync(path.join(runDir, "01_input/fits/noise_map.fits"))).data, out.ps, params.psf_error_b ?? 0, meta.psf_error_exponent);
stats("noise_eff", noiseEff, ref.noise_eff.data);
