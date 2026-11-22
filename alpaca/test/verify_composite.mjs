// Node test: the composite main deflector (js/physics/composite.js), its multi-plane rescaling, the sampled-Om
// geometry and the multiband stellar-light views against reference values from Python
// (tools/dump_composite_reference.py, ALPACA >= 0.6.2):
//   PYTHONPATH=<alpaca repo> python tools/dump_composite_reference.py /tmp/composite_ref.json
//   node test/verify_composite.mjs /tmp/composite_ref.json
import fs from "node:fs";
import {
  COMPOSITE_CHAM, COMPOSITE_SERSIC, compositeMassKwargs, compositeDeflection, compositeKappa, compositeComponents,
  chameleonLight, chameleonLightKwargs, mainProfileOf, compositeRadialProfile, cseEnclosed,
} from "../js/physics/composite.js";
import { deflectProfile } from "../js/physics/profiles.js";
import { buildGeometry, geometryAtOm, flatKwargsLens, splitKwargs, rayShoot } from "../js/physics/multiplane.js";
import { H0FromDdt } from "../js/physics/cosmology.js";
import { projectBand, viewParams } from "../js/core/mbview.js";

const ref = JSON.parse(fs.readFileSync(process.argv[2] || "/tmp/composite_ref.json", "utf8"));
const x = Float64Array.from(ref.x), y = Float64Array.from(ref.y);
let failed = 0;

function check(name, got, want, tol) {
  let maxd = 0, maxv = 0;
  for (let i = 0; i < want.length; i++) { maxd = Math.max(maxd, Math.abs(got[i] - want[i])); maxv = Math.max(maxv, Math.abs(want[i])); }
  const rel = maxd / (maxv || 1);
  const ok = rel <= tol && Number.isFinite(rel);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(44)} max|d| = ${maxd.toExponential(2)}  rel = ${rel.toExponential(2)}  (tol ${tol})`);
}
const scalar = (name, a, b, tol) => check(name, [a], [b], tol);

// ---------------------------------------------------------------- composite cases
for (const c of ref.cases) {
  const prof = c.light === "sersic" ? COMPOSITE_SERSIC : COMPOSITE_CHAM;
  if (mainProfileOf(c.params) !== prof) { failed++; console.log(`FAIL ${c.name}: mainProfileOf = ${mainProfileOf(c.params)}`); }
  const kw = compositeMassKwargs(prof, c.params);
  const keys = Object.keys(c.kwargs);
  check(`${c.name}: mass kwargs from params`, keys.map((k) => kw[k]), keys.map((k) => c.kwargs[k]), 1e-14);
  const comp = compositeComponents(prof, kw);
  scalar(`${c.name}: k_star`, comp.kStar, c.k_star, 1e-8);
  scalar(`${c.name}: kappa_s`, comp.kappaS, c.kappa_s, 1e-12);
  const ax = new Float64Array(x.length), ay = new Float64Array(x.length);
  deflectProfile(prof, x, y, kw, ax, ay);
  check(`${c.name}: deflection x`, ax, c.ax, 1e-9);
  check(`${c.name}: deflection y`, ay, c.ay, 1e-9);
  const bx = new Float64Array(x.length), by = new Float64Array(x.length);
  compositeDeflection(prof, x, y, { ...kw, norm_scale: 0.73 }, bx, by);
  check(`${c.name}: deflection, norm_scale 0.73`, [...bx, ...by], [...c.ax_ns, ...c.ay_ns], 1e-9);
  const k = compositeKappa(prof, x, y, kw);
  check(`${c.name}: kappa stars`, k.stars, c.kappa_stars, 1e-9);
  check(`${c.name}: kappa halo`, k.halo, c.kappa_halo, 1e-12);
  // normalisation: the circularised masses inside theta_E add up to pi theta_E^2
  let m = 0;
  for (const gr of comp.groups) m += cseEnclosed(gr.A, gr.S, kw.theta_E);
  scalar(`${c.name}: M(<theta_E) = pi theta_E^2`, m, Math.PI * kw.theta_E ** 2, 1e-12);
  const rp = compositeRadialProfile(prof, kw, Float64Array.of(0.5 * kw.theta_E, kw.theta_E, 2 * kw.theta_E));
  if (!rp.total.every((v) => v > 0 && Number.isFinite(v))) { failed++; console.log(`FAIL ${c.name}: radial profile ${rp.total}`); }
  if (c.light === "chameleon") {
    const lk = chameleonLightKwargs(c.params);
    lk.forEach((l, i) => { const out = new Float64Array(x.length); chameleonLight(x, y, l, out); check(`${c.name}: chameleon light L${i + 1}`, out, c.light[i], 1e-12); });
  }
}

// ---------------------------------------------------------------- multiband: stars follow the reference light
{
  const s = ref.stellar;
  const kw = compositeMassKwargs(COMPOSITE_CHAM, s.params);
  const keys = Object.keys(s.kwargs);
  check("stellar: mass kwargs of another band", keys.map((k) => kw[k]), keys.map((k) => s.kwargs[k]), 1e-14);
  if (!s.same_as_reference) { failed++; console.log("FAIL reference: the band's stellar mass should equal the reference band's"); }
}

// ---------------------------------------------------------------- sampled Om geometry
{
  const g = ref.geometry;
  const geo = buildGeometry({ zLens: g.redshifts[g.main], zSource: g.redshifts[g.redshifts.length - 1], perturbers: [{ name: "pert1", z: g.redshifts[1], plane: "background", profiles: ["SIS"] }], cosmo: { H0: g.H0, Om: 0.3 }, mainProfile: COMPOSITE_CHAM });
  for (const r of g.by_om) {
    const go = geometryAtOm(geo, r.Om);
    check(`geometry Om=${r.Om}: eta_flat`, go.etaFlat, r.eta_flat, 1e-9);
    check(`geometry Om=${r.Om}: defl_scales`, go.deflScales, r.defl_scales, 1e-9);
    scalar(`geometry Om=${r.Om}: D_dt_fid`, go.DdtFid, r.D_dt_fid, 1e-9);
  }
  // the composite on a non-terminal plane is rescaled by norm_scale (deflection linear in its normalisation)
  const p = ref.cases[0].params;
  const flat = flatKwargsLens({ ...p, lens_gamma1: 0.01, lens_gamma2: -0.02, pert1_theta_E: 0.1, pert1_center_x: 1, pert1_center_y: 1 }, geo.perturbers || [{ name: "pert1", profiles: ["SIS"] }], COMPOSITE_CHAM);
  const planes = splitKwargs(flat, geo);
  const main = planes[geo.mainIdx][0];
  scalar("multi-plane: composite norm_scale = defl scale", main.kw.norm_scale, geo.deflScales[geo.mainIdx], 1e-15);
  // H0 per draw at its own Om (64-point Gauss-Legendre) = the fixed-Om conversion (Simpson) at that Om
  const ddt = Float64Array.of(2500, 3100, 4000);
  const oms = Float64Array.of(0.25, 0.3, 0.4);
  const per = H0FromDdt(ddt, 0.3, 1.7, oms);
  check("H0 per draw (sampled Om)", per, Array.from(ddt, (d, i) => H0FromDdt(d, 0.3, 1.7, oms[i])), 1e-10);
}

// ---------------------------------------------------------------- full multi-plane ray shooting (alpaca facade)
for (const r of ref.raytrace || []) {
  const prof = r.light === "sersic" ? COMPOSITE_SERSIC : COMPOSITE_CHAM;
  const perts = r.planes.perturbers.map((p) => ({ ...p, profiles: ["SIS"] }));
  const geo = buildGeometry({ zLens: r.planes.z_lens, zSource: r.planes.z_source, perturbers: perts, cosmo: { H0: 70, Om: 0.3 }, mainProfile: prof });
  const g = geometryAtOm(geo, r.params.cosmo_Om0);
  const sh = rayShoot(g, splitKwargs(flatKwargsLens(r.params, perts, prof), g), Float64Array.from(x), Float64Array.from(y));
  // 5e-8: herculens' SIS perturbers are NIEs with a fixed e1 = e2 = 1e-8 (alpaca.compat.herculens_isothermal), the
  // browser's SIS is exactly round; the same ~1e-8 as test/verify_physics.mjs on EPL runs (~2e-8 arcsec here)
  check(`${r.name}: source-plane positions`, [...sh.xs[g.nPlanes], ...sh.ys[g.nPlanes]], [...r.bx, ...r.by], 5e-8);
}

// ---------------------------------------------------------------- multiband band views
{
  const names = ["lens_theta_E", "lens_f_b", "lens_center_x", "F150W/log_light_amp_L", "F150W/light_lwc_L", "F200W/log_light_amp_L", "F200W/light_lwc_L", "F200W/frame_dx", "F200W/frame_dy"];
  const row = [1.1, 0.4, 0.01, 2.0, -3.0, 2.5, -2.8, 0.002, -0.001];
  const v = projectBand(names, Float64Array.from(row), 1, names.length, { band: "F200W", reference: "F150W", sep: "/" });
  const get = (n) => v.samples[v.names.indexOf(n)];
  const want = { log_light_amp_L: 2.5, light_lwc_L: -2.8, "stellar:log_light_amp_L": 2.0, "stellar:light_lwc_L": -3.0, lens_center_x: 0.012 };
  check("projectBand: band light + stellar copies", Object.keys(want).map(get), Object.values(want), 1e-14);
  const r = projectBand(names, Float64Array.from(row), 1, names.length, { band: "F150W", reference: "F150W", sep: "/" });
  if (r.names.some((n) => n.startsWith("stellar:"))) { failed++; console.log("FAIL projectBand: the reference band needs no stellar copies"); }
  const mp = Object.fromEntries(names.map((n, i) => [n.replace("/", "__"), row[i]]));
  const vp = viewParams(mp, { band: "F200W", reference: "F150W", sep: "__" }).params;
  check("viewParams: stellar copies (joint MAP)", [vp["stellar:log_light_amp_L"], vp["stellar:light_lwc_L"]], [2.0, -3.0], 1e-14);
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nall composite checks passed");
process.exit(failed ? 1 : 0);
