// Composite main deflector of ALPACA >= 0.6.1 (alpaca.models.composite), ported 1:1 in float64:
// stars tied to the lens light with a mass-to-light gradient, plus an elliptical NFW halo, every component a sum of
// cored steep ellipsoids (CSE; Keeton & Kochanek 1998, Oguri 2021).
//
//   COMPOSITE_CHAM_NFW    (mass.main.composite_light = "chameleon", default): the stars follow the double-chameleon
//                         lens light, kappa_i = K_* I_i(R) ((R^2 + s_c,i^2) / R_ref^2)^(-eta/2), one group per
//                         light component, everything at the mass centre.
//   COMPOSITE_SERSIC_NFW  (composite_light = "sersic", 0.6.2): the stars follow the 1-3 Sersic components of the lens
//                         light, kappa_* = K_* sum_k I_k(R) ((R^2 + s_ML^2) / R_ref^2)^(-eta/2), one group at the
//                         light centre; the halo stays at the mass centre.
//
// theta_E: the masses inside the product-average radius theta_E add up to pi theta_E^2; the stars carry f_b of it.
// The stellar CSE amplitudes come from the same weighted least-squares fit as ALPACA (40 scales, 400 nodes, ridge
// 1e-10, Cholesky), solved per parameter set; the halo is ALPACA's 27-term CSE fit of the NFW (data/nfw_cse27.json).
// ALPACA's "fast" numerics sum the image grid in float32 (deflection ~1e-7 of itself); this port is the "exact"
// float64 expression. test/verify_composite.mjs checks it against Python.

export const COMPOSITE_CHAM = "COMPOSITE_CHAM_NFW";
export const COMPOSITE_SERSIC = "COMPOSITE_SERSIC_NFW";
export const isCompositeProfile = (name) => typeof name === "string" && name.startsWith("COMPOSITE_");

const R_REF = 1.0;
const ML_CORE = 0.05;
const SERSIC_FLOOR = 1e-8;
const STAR_RIDGE = 1e-10;
const geomspace = (a, b, n) => Float64Array.from({ length: n }, (_, i) => (i === 0 ? a : i === n - 1 ? b : a * Math.pow(b / a, i / (n - 1))));
export const STAR_SCALES = geomspace(2e-4, 300.0, 40);
const STAR_NODES = geomspace(5e-5, 60.0, 400);
const NK = STAR_SCALES.length, NN = STAR_NODES.length;
// _B[node, scale] = 1 / (2 (S^2 + R^2)^1.5)
const B = new Float64Array(NN * NK);
for (let i = 0; i < NN; i++) for (let k = 0; k < NK; k++) B[i * NK + k] = 1 / (2 * Math.pow(STAR_SCALES[k] ** 2 + STAR_NODES[i] ** 2, 1.5));

// NFW: kappa(u) = sum a / (2 (s^2 + u^2)^1.5) = 2 (1 - F(u)) / (u^2 - 1), u = R / r_s (alpaca/models/data/nfw_cse27.json)
const NFW_A = [1.4068019033962583e-18, 5.176298057199921e-19, 1.7335462201133876e-17, 1.1395687134065294e-16, 8.088208777234413e-16, 5.705683529509722e-15, 4.02732666106067e-14, 2.842917982442426e-13, 2.0062907195717976e-12, 1.4164280392468141e-11, 9.994635573662769e-11, 7.057273360128624e-10, 4.978778643368244e-09, 3.516388460508022e-08, 2.4799876028551284e-07, 1.7520618078048657e-06, 1.2349600260097705e-05, 8.722202126313139e-05, 0.0006129644517593553, 0.004290378747580688, 0.029140589126178864, 0.18213209053379303, 0.8970835634008815, 3.027580203381261, 7.119341109855346, 17.243455625988105, 203.5368523667909];
const NFW_S = [5.000000000000001e-07, 9.59115022605406e-07, 1.839803253174737e-06, 3.5291658775163752e-06, 6.769752020784692e-06, 1.2985941724895807e-05, 2.4910023582051856e-05, 4.778315566200173e-05, 9.165908484583684e-05, 0.00017582321046781128, 0.00033726936496477976, 0.0006469602292046115, 0.0012410185497167593, 0.0023805590687306357, 0.004566459930038176, 0.008759520638050492, 0.016802775669552638, 0.03223158913227309, 0.061827602678416534, 0.11859956508109508, 0.22750124908749167, 0.4363997313226154, 0.8371150763449668, 1.6057792907438582, 3.080254081482177, 5.908635925982345, 21.74145519689489];

// herculens param_util.ellipticity2phi_q
function phiQ(e1, e2) {
  const phi = Math.atan2(e2, e1) / 2;
  const c = Math.min(Math.sqrt(e1 * e1 + e2 * e2), 0.9999);
  return { phi, q: (1 - c) / (1 + c) };
}

// ------------------------------------------------------------------------------------------------ chameleon
const g = (w) => 1 / (Math.sqrt(w * w + 1) + w);

// lenstronomy's Chameleon.param_convert: (amp_n, s_c, s_t)
export function chameleonConvert(amp, wc, wt, q) {
  const fx = (wt - wc) * (1 + (wt + wc) / (Math.sqrt(wt * wt + 1) + Math.sqrt(wc * wc + 1))) * g(wc) * g(wt);
  return { ampN: amp / fx, s1: (2 * wc) / (1 + q), s2: (2 * wt) / (1 + q) };
}

// (s1^2 + R^2)^-1/2 - (s2^2 + R^2)^-1/2 without cancellation
function chameleonShape(R2, s1, s2) {
  const a = Math.sqrt(s1 * s1 + R2), b = Math.sqrt(s2 * s2 + R2);
  return ((s2 - s1) * (s2 + s1)) / (a * b * (a + b));
}

// CHAMELEON light profile (alpaca.models.composite.ChameleonLight), added into out.
export function chameleonLight(x, y, kw, out) {
  const { phi, q } = phiQ(kw.e1, kw.e2);
  const { ampN, s1, s2 } = chameleonConvert(kw.amp, kw.w_c, kw.w_t, q);
  const cx = kw.center_x || 0, cy = kw.center_y || 0;
  const c = Math.cos(phi), s = Math.sin(phi);
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - cx, dy = y[i] - cy;
    const xt = c * dx + s * dy, yt = -s * dx + c * dy;
    out[i] += 0.5 * ampN * chameleonShape(q * xt * xt + (yt * yt) / q, s1, s2);
  }
}

// ------------------------------------------------------------------------------------------------ stellar CSE fit
// Weighted least squares of a profile f on STAR_NODES by product-average CSEs on STAR_SCALES: residuals relative to
// w, column-normalised design matrix, ridge STAR_RIDGE * tr(G) / n, Cholesky; returns the amplitudes.
function cseFit(f, w, rhsRel) {
  const M = new Float64Array(NN * NK);
  const cn = new Float64Array(NK);
  for (let i = 0; i < NN; i++) for (let k = 0; k < NK; k++) { const v = B[i * NK + k] / w[i]; M[i * NK + k] = v; cn[k] += v * v; }
  for (let k = 0; k < NK; k++) cn[k] = Math.sqrt(cn[k]);
  for (let i = 0; i < NN; i++) for (let k = 0; k < NK; k++) M[i * NK + k] /= cn[k];
  const G = new Float64Array(NK * NK);
  for (let a = 0; a < NK; a++) for (let b = a; b < NK; b++) { let s = 0; for (let i = 0; i < NN; i++) s += M[i * NK + a] * M[i * NK + b]; G[a * NK + b] = s; G[b * NK + a] = s; }
  let tr = 0;
  for (let k = 0; k < NK; k++) tr += G[k * NK + k];
  const ridge = (STAR_RIDGE * tr) / NK;
  for (let k = 0; k < NK; k++) G[k * NK + k] += ridge;
  const rhs = new Float64Array(NK);
  for (let k = 0; k < NK; k++) { let s = 0; for (let i = 0; i < NN; i++) s += M[i * NK + k] * rhsRel[i]; rhs[k] = s; }
  const x = choleskySolve(G, rhs, NK);
  for (let k = 0; k < NK; k++) x[k] /= cn[k];
  return x;
}

function choleskySolve(G, b, n) {
  const L = new Float64Array(n * n);
  for (let j = 0; j < n; j++) {
    let d = G[j * n + j];
    for (let k = 0; k < j; k++) d -= L[j * n + k] * L[j * n + k];
    if (!(d > 0)) throw new Error("composite: stellar CSE fit is not positive definite");
    const ljj = Math.sqrt(d);
    L[j * n + j] = ljj;
    for (let i = j + 1; i < n; i++) {
      let s = G[i * n + j];
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      L[i * n + j] = s / ljj;
    }
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i * n + k] * y[k]; y[i] = s / L[i * n + i]; }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k * n + i] * x[k]; x[i] = s / L[i * n + i]; }
  return x;
}

const ONES = new Float64Array(NN).fill(1);

// stellar_cse_amplitudes: one chameleon component with the M/L gradient
function chameleonStarAmplitudes(s1, s2, eta) {
  const f = Float64Array.from(STAR_NODES, (R) => { const R2 = R * R; return chameleonShape(R2, s1, s2) * Math.pow((R2 + s1 * s1) / (R_REF * R_REF), -0.5 * eta); });
  return cseFit(f, f, ONES);
}

const sersicB = (n) => 1.9992 * n - 0.3271;

// sersic_kappa_shape at R^2 (product-average radius; re_pa product-average)
function sersicKappaShape(R2, amps, rePa, ns, eta) {
  const lr = 0.5 * Math.log(Math.max(R2, 1e-30));
  let s = 0;
  for (let k = 0; k < amps.length; k++) s += amps[k] * Math.exp(-sersicB(ns[k]) * (Math.exp((lr - Math.log(rePa[k])) / ns[k]) - 1));
  return s * Math.pow((R2 + ML_CORE * ML_CORE) / (R_REF * R_REF), -0.5 * eta);
}

function sersicStarAmplitudes(amps, rePa, ns, eta) {
  const f = Float64Array.from(STAR_NODES, (R) => sersicKappaShape(R * R, amps, rePa, ns, eta));
  let fmax = 0;
  for (const v of f) if (v > fmax) fmax = v;
  const w = Float64Array.from(f, (v) => Math.max(v, SERSIC_FLOOR * fmax));
  return cseFit(f, w, Float64Array.from(f, (v, i) => v / w[i]));
}

// Mass inside the product-average radius R of a product-average CSE sum
export function cseEnclosed(A, S, R) {
  let m = 0;
  for (let k = 0; k < A.length; k++) { const t = Math.sqrt(S[k] * S[k] + R * R); m += (A[k] * R * R) / (S[k] * t * (S[k] + t)); }
  return Math.PI * m;
}

// ------------------------------------------------------------------------------------------------ components
// { groups: [{A, S, q, phi, cx, cy, kind}], kStar, kappaS, ... } for one set of mass kwargs (see massKwargs below).
// The stellar fits cost ~1 ms, so the last few parameter sets are cached (ray shooting calls this once per plane
// and per finite-difference shift with the same kwargs).
const CACHE = new Map();
const COMP_KEYS = ["theta_E", "f_b", "eta", "r_s", "e1", "e2", "center_x", "center_y", "amp_1", "w_c_1", "w_t_1", "e1_1", "e2_1", "amp_2", "w_c_2", "w_t_2", "e1_2", "e2_2",
  "e1_star", "e2_star", "center_x_star", "center_y_star", "R_sersic_1", "n_sersic_1", "amp_3", "R_sersic_2", "n_sersic_2", "R_sersic_3", "n_sersic_3"];

export function compositeComponents(profile, kw) {
  const key = profile + ":" + COMP_KEYS.map((k) => kw[k]).join(",");
  let c = CACHE.get(key);
  if (c) return c;
  c = profile.startsWith(COMPOSITE_SERSIC) ? sersicComponents(kw) : chameleonComponents(kw);
  CACHE.set(key, c);
  if (CACHE.size > 16) CACHE.delete(CACHE.keys().next().value);
  return c;
}

function haloGroup(kw, area) {
  const { phi, q } = phiQ(kw.e1, kw.e2);
  const S = Float64Array.from(NFW_S, (s) => s * kw.r_s);
  const A0 = Float64Array.from(NFW_A, (a) => a * kw.r_s ** 3);
  const kappaS = ((1 - kw.f_b) * area) / cseEnclosed(A0, S, kw.theta_E);
  return { group: { A: Float64Array.from(A0, (a) => a * kappaS), S, q, phi, cx: kw.center_x || 0, cy: kw.center_y || 0, kind: "halo" }, kappaS };
}

function chameleonComponents(kw) {
  const area = Math.PI * kw.theta_E * kw.theta_E;
  const stars = [];
  let mStar = 0;
  for (const j of [1, 2]) {
    const { phi, q } = phiQ(kw[`e1_${j}`], kw[`e2_${j}`]);
    const { ampN, s1, s2 } = chameleonConvert(kw[`amp_${j}`], kw[`w_c_${j}`], kw[`w_t_${j}`], q);
    const A = chameleonStarAmplitudes(s1, s2, kw.eta);
    for (let k = 0; k < NK; k++) A[k] *= 0.5 * ampN;
    stars.push({ A, q, phi });
    mStar += cseEnclosed(A, STAR_SCALES, kw.theta_E);
  }
  const kStar = (kw.f_b * area) / mStar;
  const { group: halo, kappaS } = haloGroup(kw, area);
  const groups = stars.map((s) => ({ A: Float64Array.from(s.A, (a) => a * kStar), S: STAR_SCALES, q: s.q, phi: s.phi, cx: kw.center_x || 0, cy: kw.center_y || 0, kind: "stars" }));
  groups.push(halo);
  return { groups, kStar, kappaS };
}

function sersicComponents(kw) {
  const area = Math.PI * kw.theta_E * kw.theta_E;
  const { phi, q } = phiQ(kw.e1_star, kw.e2_star);
  const amps = [], rePa = [], ns = [];
  for (let k = 1; k <= 3 && kw[`amp_${k}`] !== undefined; k++) { amps.push(kw[`amp_${k}`]); rePa.push(kw[`R_sersic_${k}`] * Math.sqrt(q)); ns.push(kw[`n_sersic_${k}`]); }
  if (!amps.length) throw new Error("Sersic composite: the mass kwargs need amp_1 [, amp_2 [, amp_3]]");
  const A = sersicStarAmplitudes(amps, rePa, ns, kw.eta);
  const kStar = (kw.f_b * area) / cseEnclosed(A, STAR_SCALES, kw.theta_E);
  const { group: halo, kappaS } = haloGroup(kw, area);
  const stars = { A: Float64Array.from(A, (a) => a * kStar), S: STAR_SCALES, q, phi, cx: kw.center_x_star, cy: kw.center_y_star, kind: "stars" };
  return { groups: [stars, halo], kStar, kappaS };
}

// ------------------------------------------------------------------------------------------------ lensing
// Deflection of the composite (ALPACA's float64 CSE sums, Oguri 2021 eqs. 19-20), added into ax, ay.
// kw.norm_scale multiplies it (multi-plane next-plane convention).
export function compositeDeflection(profile, x, y, kw, ax, ay) {
  const { groups } = compositeComponents(profile, kw);
  const ns = kw.norm_scale ?? 1;
  const n = x.length;
  for (const gr of groups) {
    const { q, phi } = gr;
    const m = gr.A.length;
    // product-average CSE (A, S) = major-axis CSE (A q^-3/2, S / sqrt(q)); per-term constants hoisted
    const Sm = new Float64Array(m), q2s = new Float64Array(m), q2s2 = new Float64Array(m), wA = new Float64Array(m);
    const q2 = q * q, sq = Math.sqrt(q), qm32 = Math.pow(q, -1.5);
    for (let k = 0; k < m; k++) { const s = gr.S[k] / sq; Sm[k] = s; q2s[k] = q2 * s; q2s2[k] = q2 * s * s; wA[k] = (gr.A[k] * qm32 * q) / s; }
    const c = Math.cos(phi), sn = Math.sin(phi);
    for (let i = 0; i < n; i++) {
      const dx = x[i] - gr.cx, dy = y[i] - gr.cy;
      const X = c * dx + sn * dy, Y = -sn * dx + c * dy;
      const base = q2 * X * X + Y * Y, omq2x2 = (1 - q2) * X * X;
      let sx = 0, sy = 0;
      for (let k = 0; k < m; k++) {
        const psi = Math.sqrt(q2s2[k] + base);
        const ps = psi + Sm[k];
        const w = wA[k] / (psi * (ps * ps + omq2x2));
        sx += w * (psi + q2s[k]);
        sy += w * ps;
      }
      const gx = sx * X * ns, gy = sy * Y * ns;
      ax[i] += gx * c - gy * sn;
      ay[i] += gx * sn + gy * c;
    }
  }
}

// Convergence of the composite at (x, y) (CSE sums): { stars, halo, total } Float64Arrays.
export function compositeKappa(profile, x, y, kw) {
  const { groups } = compositeComponents(profile, kw);
  const ns = kw.norm_scale ?? 1;
  const stars = new Float64Array(x.length), halo = new Float64Array(x.length);
  for (const gr of groups) {
    const out = gr.kind === "halo" ? halo : stars;
    const c = Math.cos(gr.phi), sn = Math.sin(gr.phi), q = gr.q, sq = Math.sqrt(q), qm32 = Math.pow(q, -1.5);
    for (let i = 0; i < x.length; i++) {
      const dx = x[i] - gr.cx, dy = y[i] - gr.cy;
      const X = c * dx + sn * dy, Y = -sn * dx + c * dy;
      const xi2 = X * X + (Y * Y) / (q * q);
      let s = 0;
      for (let k = 0; k < gr.A.length; k++) { const Sm = gr.S[k] / sq; s += (gr.A[k] * qm32) / (2 * Math.pow(Sm * Sm + xi2, 1.5)); }
      out[i] += ns * s;
    }
  }
  return { stars, halo, total: Float64Array.from(stars, (v, i) => v + halo[i]) };
}

// Circularised convergence and enclosed-mass profiles at product-average radii R (arcsec): every CSE group in its own
// product-average radius, kappa(R) = sum A / (2 (S^2 + R^2)^1.5), M(<R) as cseEnclosed (exact for one centre).
export function compositeRadialProfile(profile, kw, R) {
  const { groups } = compositeComponents(profile, kw);
  const stars = new Float64Array(R.length), halo = new Float64Array(R.length);
  for (const gr of groups) {
    const out = gr.kind === "halo" ? halo : stars;
    for (let i = 0; i < R.length; i++) { let s = 0; for (let k = 0; k < gr.A.length; k++) s += gr.A[k] / (2 * Math.pow(gr.S[k] ** 2 + R[i] ** 2, 1.5)); out[i] += s; }
  }
  return { stars, halo, total: Float64Array.from(stars, (v, i) => v + halo[i]) };
}

// ------------------------------------------------------------------------------------------------ parameters
// Main-deflector profile of a flat ALPACA params dict: "EPL", COMPOSITE_CHAM or COMPOSITE_SERSIC (null without a
// main deflector). The Sersic composite has no chameleon light sites (light_lwc_L).
export function mainProfileOf(params, config = null) {
  if (params.lens_f_b !== undefined) {
    const light = config?.mass?.main?.composite_light;
    if (light === "sersic" || (light == null && params.light_lwc_L === undefined && params["stellar:light_lwc_L"] === undefined)) return COMPOSITE_SERSIC;
    return COMPOSITE_CHAM;
  }
  if (params.lens_theta_E !== undefined) return "EPL";
  return null;
}

// Mass kwargs of the composite from a flat params dict (alpaca.models.composite.main_kwargs_from_params). A
// "stellar:<light site>" entry (multiband: the reference band's light) replaces the light site for the mass only.
const LIGHT_SITES = ["log_light_amp_L", "light_lwc_L", "light_ldw_L", "light_e1_L", "light_e2_L", "log_light_amp_L2", "light_lwc_L2", "light_ldw_L2", "light_e1_L2", "light_e2_L2"];
const SERSIC_LIGHT_SITES = ["_L", "_L2", "_L3"].flatMap((s) => ["log_light_amp", "light_Re", "light_n", "light_e1", "light_e2", "light_center_x", "light_center_y"].map((p) => p + s));
export const STELLAR_PREFIX = "stellar:";

export function compositeMassKwargs(profile, params) {
  const cx = params.lens_center_x, cy = params.lens_center_y;
  const kw = { theta_E: params.lens_theta_E, f_b: params.lens_f_b, eta: params.lens_eta, r_s: params.lens_r_s, e1: params.lens_e1, e2: params.lens_e2, center_x: cx, center_y: cy };
  const site = (k) => params[STELLAR_PREFIX + k] ?? params[k];
  if (profile.startsWith(COMPOSITE_SERSIC)) {
    const p = {};
    for (const k of SERSIC_LIGHT_SITES) { const v = site(k); if (v !== undefined && v !== null) p[k] = v; }
    const sfx = ["_L", "_L2", "_L3"];
    for (let k = 0; k < 3 && p[`light_Re${sfx[k]}`] !== undefined; k++) {
      kw[`amp_${k + 1}`] = Math.exp(p[`log_light_amp${sfx[k]}`]);
      kw[`R_sersic_${k + 1}`] = p[`light_Re${sfx[k]}`];
      kw[`n_sersic_${k + 1}`] = p[`light_n${sfx[k]}`];
    }
    // components 2 and 3 share the ellipticity and centre of component 1 (coupled sites)
    kw.e1_star = p.light_e1_L; kw.e2_star = p.light_e2_L; kw.center_x_star = p.light_center_x_L; kw.center_y_star = p.light_center_y_L;
    return kw;
  }
  for (const [j, s] of [[1, ""], [2, "2"]]) {
    const wc = Math.exp(site(`light_lwc_L${s}`));
    kw[`amp_${j}`] = Math.exp(site(`log_light_amp_L${s}`));
    kw[`w_c_${j}`] = wc;
    kw[`w_t_${j}`] = wc + Math.exp(site(`light_ldw_L${s}`));
    kw[`e1_${j}`] = site(`light_e1_L${s}`);
    kw[`e2_${j}`] = site(`light_e2_L${s}`);
  }
  return kw;
}

// The two CHAMELEON lens-light kwargs (the band's own light sites, centred on the mass centre).
export function chameleonLightKwargs(params) {
  return [["", 1], ["2", 2]].map(([s]) => {
    const wc = Math.exp(params[`light_lwc_L${s}`]);
    return { amp: Math.exp(params[`log_light_amp_L${s}`]), w_c: wc, w_t: wc + Math.exp(params[`light_ldw_L${s}`]), e1: params[`light_e1_L${s}`], e2: params[`light_e2_L${s}`], center_x: params.lens_center_x, center_y: params.lens_center_y };
  });
}
