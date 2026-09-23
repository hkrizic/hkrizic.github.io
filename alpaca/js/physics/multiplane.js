// Multi-plane lensing geometry and ray shooting, mirroring alpaca.models.multiplane
// on top of herculens' MPMassModel conventions.
import { etaMatrix, timeDelayDistance } from "./cosmology.js";
import { deflectProfile } from "./profiles.js";

// perturbers: [{name, z, plane: 'main'|'foreground'|'background', profiles: ['SIS']}] in catalog order.
export function buildGeometry({ zLens, zSource, perturbers = [], cosmo = { H0: 70, Om: 0.3 }, mainProfile = "EPL" }) {
  const off = perturbers.filter((p) => p.plane !== "main");
  const offZs = [...new Set(off.map((p) => Number(p.z)))].sort((a, b) => a - b);
  const planeRedshifts = [...offZs, Number(zLens)].sort((a, b) => a - b);
  const mainIdx = planeRedshifts.indexOf(Number(zLens));
  const planeSlots = planeRedshifts.map(() => []);
  const profileLists = planeRedshifts.map(() => []);
  planeSlots[mainIdx].push(0, 1);
  profileLists[mainIdx].push(mainProfile, "SHEAR");
  let slot = 2;
  for (const p of perturbers) {
    const j = p.plane === "main" ? mainIdx : planeRedshifts.indexOf(Number(p.z));
    for (const prof of p.profiles || ["SIS"]) {
      planeSlots[j].push(slot);
      profileLists[j].push(prof);
      slot++;
    }
  }
  const redshifts = [...planeRedshifts, Number(zSource)];
  const { eta, flat } = etaMatrix(redshifts, cosmo);
  const N = planeRedshifts.length;
  const deflScales = planeRedshifts.map((_, j) => 1 / eta[j][N]);
  const DdtFid = timeDelayDistance(zLens, zSource, cosmo);
  return {
    planeRedshifts, zSource: Number(zSource), mainIdx, planeSlots, profileLists,
    eta, etaFlat: flat, deflScales, nPlanes: N, DdtFid, cosmo, isMultiplane: N > 1,
  };
}

// Single-plane geometry (no off-plane perturbers): one plane, eta trivial.
export function singlePlaneGeometry({ zLens = null, zSource = null, perturbers = [], mainProfile = "EPL", cosmo = { H0: 70, Om: 0.3 } }) {
  const profileLists = [[mainProfile, "SHEAR"]];
  const planeSlots = [[0, 1]];
  let slot = 2;
  for (const p of perturbers) for (const prof of p.profiles || ["SIS"]) { planeSlots[0].push(slot++); profileLists[0].push(prof); }
  const eta = [new Float64Array([0, 1]), new Float64Array([0, 0])];
  return {
    planeRedshifts: [zLens], zSource, mainIdx: 0, planeSlots, profileLists, eta, etaFlat: [],
    deflScales: [1], nPlanes: 1, DdtFid: zLens != null && zSource != null ? timeDelayDistance(zLens, zSource, cosmo) : null,
    cosmo, isMultiplane: false,
  };
}

// Flat kwargs_lens list from a params dict: [main, SHEAR, one chunk per perturber].
export function flatKwargsLens(params, perturbers = []) {
  const out = [
    {
      theta_E: params.lens_theta_E, e1: params.lens_e1, e2: params.lens_e2, gamma: params.lens_gamma,
      center_x: params.lens_center_x, center_y: params.lens_center_y,
    },
    { gamma1: params.lens_gamma1, gamma2: params.lens_gamma2, ra_0: params.lens_center_x, dec_0: params.lens_center_y },
  ];
  for (const p of perturbers) {
    const nm = p.name;
    const cx = params[nm + "_center_x"] ?? p.center_x;
    const cy = params[nm + "_center_y"] ?? p.center_y;
    for (const prof of p.profiles || ["SIS"]) {
      if (prof === "SIS" || prof === "SIE" || prof === "EPL") {
        const kw = { theta_E: params[nm + "_theta_E"], center_x: cx, center_y: cy };
        if (prof !== "SIS") { kw.e1 = params[nm + "_e1"]; kw.e2 = params[nm + "_e2"]; }
        if (prof === "EPL") kw.gamma = params[nm + "_gamma"];
        out.push(kw);
      } else if (prof === "SHEAR") {
        out.push({ gamma1: params[nm + "_gamma1"], gamma2: params[nm + "_gamma2"], ra_0: cx, dec_0: cy });
      } else {
        throw new Error("Unsupported perturber profile " + prof);
      }
    }
  }
  return out;
}

function toNextPlane(profile, kw, s) {
  const out = { ...kw };
  if (profile === "SIS" || profile === "SIE" || profile === "NIE") out.theta_E = kw.theta_E * s;
  else if (profile === "EPL") out.theta_E = kw.theta_E * Math.pow(s, 1 / (kw.gamma - 1));
  else if (profile === "SHEAR") { out.gamma1 = kw.gamma1 * s; out.gamma2 = kw.gamma2 * s; }
  else throw new Error("No deflection rescaling for " + profile);
  return out;
}

// Flat SOURCE-referenced kwargs -> per-plane [{profile, kw}] in herculens' next-plane convention.
export function splitKwargs(flat, geo) {
  return geo.planeSlots.map((slots, j) => {
    const s = geo.deflScales[j];
    return slots.map((slotIdx, k) => {
      const prof = geo.profileLists[j][k];
      const kw = Math.abs(s - 1) < 1e-12 ? flat[slotIdx] : toNextPlane(prof, flat[slotIdx], s);
      return { profile: prof, kw };
    });
  });
}

export function deflectPlane(plane, x, y) {
  const ax = new Float64Array(x.length);
  const ay = new Float64Array(x.length);
  for (const { profile, kw } of plane) deflectProfile(profile, x, y, kw, ax, ay);
  return { ax, ay };
}

// Ray shooting through all planes. Returns positions on every plane (0..N),
// index N being the source plane. Inputs are flat Float64Arrays.
export function rayShoot(geo, planeKwargs, x, y) {
  const N = geo.nPlanes;
  const n = x.length;
  const xs = [];
  const ys = [];
  for (let k = 0; k <= N; k++) { xs.push(Float64Array.from(x)); ys.push(Float64Array.from(y)); }
  for (let j = 0; j < N; j++) {
    const { ax, ay } = deflectPlane(planeKwargs[j], xs[j], ys[j]);
    for (let k = j + 1; k <= N; k++) {
      const e = geo.eta[j][k];
      if (e === 0) continue;
      const xk = xs[k];
      const yk = ys[k];
      for (let i = 0; i < n; i++) { xk[i] -= e * ax[i]; yk[i] -= e * ay[i]; }
    }
  }
  return { xs, ys };
}

// Convenience: image plane -> source plane only.
export function rayShootToSource(geo, planeKwargs, x, y) {
  const { xs, ys } = rayShoot(geo, planeKwargs, x, y);
  return { bx: xs[geo.nPlanes], by: ys[geo.nPlanes] };
}
