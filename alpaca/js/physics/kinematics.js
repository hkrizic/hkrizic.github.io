// Spherical Jeans aperture velocity dispersion: a port of alpaca.kinematics (spherical.py, likelihood.py,
// lensmass.py) for likelihood.kinematics.mode = "aperture". EPL main deflector (circularised theta_E, optional
// dynamics_gamma_offset / inner break), circularised Sersic tracer components, constant anisotropy
// beta = 1 - ratio^2, PSF-convolved square / rectangular / circular aperture, mass scaled by
// lambda_int (1 - kappa_ext). Same fixed-grid quadratures as ALPACA, so draws agree to ~1e-6.

export const G = 0.004301; // pc (km/s)^2 / Msun, JAMpy's value as in ALPACA
export const ARCSEC_RAD = Math.PI / 648000;
export const C_KMS = 299792.458;

// KinematicsConfig defaults (ALPACA 0.5.x); saved configs omit keys left at their default.
export const KIN_DEFAULTS = {
  observed_sigma: 220.1, sigma_error: 4.2, aperture_kind: "square", aperture_width: 0.55, aperture_height: null, aperture_radius: 0.275,
  psf_sigma: [0.05], psf_weight: [1.0], distance_mpc: 1200, ds_over_dds: null, anisotropy_ratio_range: [0.93, 1.06], anisotropy_ratio_fixed: null,
  kappa_ext: 0, sample_lambda_int: true, lambda_int_range: [0.5, 1.5], lambda_int: 1, light_radius_convention: "major_axis", multipole_mode: "reject",
  radial_min: 1e-9, radial_max: 1000, radial_intervals: 256, angular_nodes: 128, abel_nodes: 64, mode: "aperture", dynamics: "spherical",
  covariance_scale: 1, dynamics_gamma_offset: 0, dynamics_inner_break: [], inner_dgamma_range: [], inner_break_radius: 0.5, tracer_exclude: [],
};

// ------------------------------------------------------------------ special functions
const legCache = new Map();
// Gauss-Legendre nodes and weights mapped to [0, 1] (numpy leggauss, (x + 1) / 2 and w / 2).
export function legendre(n) {
  if (legCache.has(n)) return legCache.get(n);
  const x = new Float64Array(n), w = new Float64Array(n);
  const m = (n + 1) >> 1;
  for (let i = 0; i < m; i++) {
    let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5)), pp = 0;
    for (let it = 0; it < 100; it++) {
      let p1 = 1, p2 = 0;
      for (let j = 1; j <= n; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j; }
      pp = (n * (z * p1 - p2)) / (z * z - 1);
      const dz = p1 / pp;
      z -= dz;
      if (Math.abs(dz) < 1e-16) break;
    }
    const wi = 2 / ((1 - z * z) * pp * pp);
    x[i] = -z; x[n - 1 - i] = z; w[i] = wi; w[n - 1 - i] = wi;
  }
  const out = { x: x.map((v) => (v + 1) / 2), w: w.map((v) => v / 2) };
  legCache.set(n, out);
  return out;
}

// erf to ~1e-15: positive series below 3, continued fraction for erfc above.
export function erf(x) {
  const ax = Math.abs(x);
  if (ax > 6) return Math.sign(x);
  if (ax < 3) {
    const x2 = x * x;
    let term = x, sum = x;
    for (let n = 1; n < 200; n++) { term *= (2 * x2) / (2 * n + 1); sum += term; if (Math.abs(term) < 1e-17 * Math.abs(sum)) break; }
    return (2 / Math.sqrt(Math.PI)) * Math.exp(-x2) * sum;
  }
  // erfc(x) = exp(-x^2)/sqrt(pi) / (x + 1/2 / (x + 1 / (x + 3/2 / (x + 2 / ...)))), modified Lentz
  const tiny = 1e-300;
  let f = ax, Cc = ax, D = 0;
  for (let k = 1; k < 300; k++) {
    const a = k / 2;
    D = ax + a * D; D = Math.abs(D) < tiny ? tiny : D; D = 1 / D;
    Cc = ax + a / Cc; Cc = Math.abs(Cc) < tiny ? tiny : Cc;
    const delta = Cc * D;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  const erfc = Math.exp(-ax * ax) / Math.sqrt(Math.PI) / f;
  return Math.sign(x) * (1 - erfc);
}

const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
export function lgamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = LANCZOS[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// CDF of the noncentral chi-square with 2 degrees of freedom: Poisson(nc/2) mixture of
// central chi-square(2 + 2j) CDFs, summed outwards from the Poisson mode.
function ncx2cdf2(x, nc) {
  const y = x / 2, lam = nc / 2;
  if (lam === 0) return 1 - Math.exp(-y);
  const P = (j) => { let term = Math.exp(-y), s = term; for (let i = 1; i <= j; i++) { term *= y / i; s += term; } return Math.max(0, 1 - s); };
  const j0 = Math.floor(lam);
  const logw0 = -lam + j0 * Math.log(lam) - lgamma(j0 + 1);
  let total = 0, w = Math.exp(logw0);
  for (let j = j0; j < j0 + 2000; j++) { if (j > j0) w *= lam / j; total += w * P(j); if (w < 1e-18 && j > lam) break; }
  w = Math.exp(logw0);
  for (let j = j0 - 1; j >= 0; j--) { w *= (j + 1) / lam; total += w * P(j); if (w < 1e-18) break; }
  return total;
}

// ------------------------------------------------------------------ aperture and solver
export class Aperture {
  constructor({ kind = "square", width = 0.55, height = null, radius = 0.275, psfSigma = [0.05], psfWeight = [1] } = {}) {
    if (!["square", "rectangle", "circle"].includes(kind)) throw new Error("Aperture kind must be square, rectangle or circle");
    Object.assign(this, { kind, width, height, radius, psfSigma, psfWeight });
  }

  // Azimuthal mean of (aperture mask * PSF) at true projected radius R.
  radialAcceptance(R) {
    const { x: u, w } = legendre(64);
    const a = this.width / 2;
    const b = (this.kind === "square" || this.height == null ? this.width : this.height) / 2;
    let out = 0;
    for (let k = 0; k < this.psfSigma.length; k++) {
      const s = this.psfSigma[k], f = this.psfWeight[k];
      let val;
      if (this.kind === "circle") val = s === 0 ? (R <= this.radius ? 1 : 0) : ncx2cdf2((this.radius / s) ** 2, (R / s) ** 2);
      else if (s === 0) {
        const r = Math.max(R, 1e-300);
        const lo = Math.acos(Math.min(1, Math.max(0, a / r))), hi = Math.asin(Math.min(1, Math.max(0, b / r)));
        val = (Math.max(hi - lo, 0) * 2) / Math.PI;
      } else {
        const d = Math.SQRT2 * s;
        val = 0;
        for (let i = 0; i < u.length; i++) {
          const phi = 0.5 * Math.PI * u[i], x = R * Math.cos(phi), y = R * Math.sin(phi);
          val += 0.5 * (erf((a - x) / d) + erf((a + x) / d)) * 0.5 * (erf((b - y) / d) + erf((b + y) / d)) * w[i];
        }
      }
      out += f * val;
    }
    return out;
  }
}

export class SphericalJeans {
  constructor(aperture, { rMin = 1e-9, rMax = 1000, nRadial = 256, nAngular = 128, nAbel = 64 } = {}) {
    this.aperture = aperture;
    this.nAbel = nAbel;
    const N = 4 * nRadial + 1, l0 = Math.log(rMin), l1 = Math.log(rMax);
    this.radius = Float64Array.from({ length: N }, (_, i) => (i === 0 ? rMin : i === N - 1 ? rMax : Math.exp(l0 + ((l1 - l0) * i) / (N - 1))));
    this.half = Float64Array.from({ length: 2 * nRadial + 1 }, (_, i) => this.radius[2 * i]);
    this.logStep = Math.log(this.radius[1] / this.radius[0]);
    // aperture weights per half-grid radius, integrated in projected radius (see spherical.py)
    const { x: u, w } = legendre(nAngular);
    const ap = aperture;
    const maxAp = ap.kind === "circle" ? ap.radius : Math.hypot(ap.width, ap.height || ap.width) / 2;
    const maxProj = maxAp + 9 * Math.max(...ap.psfSigma);
    const H = this.half.length;
    this.a0 = new Float64Array(H); this.a2 = new Float64Array(H);
    for (let k = 0; k < H; k++) {
      const thMax = Math.asin(Math.min(maxProj / this.half[k], 1));
      let s0 = 0, s2 = 0;
      for (let j = 0; j < u.length; j++) {
        const th = thMax * u[j], sn = Math.sin(th);
        const dmu = sn * thMax * w[j] * ap.radialAcceptance(this.half[k] * sn);
        s0 += dmu; s2 += dmu * sn * sn;
      }
      this.a0[k] = s0; this.a2[k] = s2;
    }
  }

  simpson(v) {
    let s = 0;
    for (let i = 0; i + 2 < v.length; i += 2) s += v[i] + 4 * v[i + 1] + v[i + 2];
    return ((2 * this.logStep) / 3) * s;
  }

  // nu sigma_r^2 on the half grid (reverse cumulative Simpson of the Jeans equation)
  pressure(density, mass, beta, distanceMpc) {
    const r = this.radius, H = this.half.length;
    const f = new Float64Array(r.length);
    for (let i = 0; i < r.length; i++) f[i] = density[i] * mass[i] * Math.pow(r[i], 2 * beta - 1);
    const out = new Float64Array(H);
    let acc = 0;
    for (let k = H - 2; k >= 0; k--) { acc += (this.logStep / 3) * (f[2 * k] + 4 * f[2 * k + 1] + f[2 * k + 2]); out[k] = acc; }
    const g = G / (distanceMpc * 1e6 * ARCSEC_RAD);
    for (let k = 0; k < H; k++) out[k] *= g * Math.pow(this.half[k], -2 * beta);
    return out;
  }

  apertureFromDensity(density, mass, beta, distanceMpc) {
    const p = this.pressure(density, mass, beta, distanceMpc);
    const H = this.half.length, num = new Float64Array(H), den = new Float64Array(H);
    for (let k = 0; k < H; k++) { const r3 = this.half[k] ** 3; num[k] = p[k] * r3 * (this.a0[k] - beta * this.a2[k]); den[k] = density[2 * k] * r3 * this.a0[k]; }
    return Math.sqrt(this.simpson(num) / this.simpson(den));
  }
}

// Abel deprojection of circular Sersic profiles (amplitude = I(R_eff), b_n = 1.9992 n - 0.3271), summed.
export function sersicDensity(radius, amps, res, ns, nAbel = 64) {
  const { x: u, w } = legendre(nAbel);
  const out = new Float64Array(radius.length);
  for (let c = 0; c < amps.length; c++) {
    const amp = amps[c], re = res[c], n = ns[c];
    if (!amp) continue;
    const b = 1.9992 * n - 0.3271;
    const cutoff = re * Math.pow(Math.max(80, b + 60) / b, n);
    const pref = (amp * b) / (Math.PI * n * re);
    for (let i = 0; i < radius.length; i++) {
      const ratio = cutoff / radius[i];
      if (!(ratio > 1)) continue;
      const tmax = Math.acosh(Math.max(ratio, 1 + 1e-14));
      const lr = Math.log(radius[i] / re);
      let s = 0;
      for (let k = 0; k < u.length; k++) {
        const t = tmax * u[k];
        const logx = lr + Math.log(Math.cosh(t));
        s += Math.exp(b - b * Math.exp(logx / n) + (1 / n - 1) * logx) * w[k];
      }
      out[i] += pref * tmax * s;
    }
  }
  return out;
}

// 3-D enclosed mass [Msun] of kappa = (3 - gamma)/2 (theta_E / R)^(gamma - 1); optional steeper inner core
// inner = [delta_gamma_in, r_break / theta_E] keeping the projected mass inside theta_E.
export function powerlawEnclosedMass(radiusPc, thetaE, gamma, distanceMpc, dsOverDds, inner = null) {
  const ddPc = distanceMpc * 1e6;
  const rePc = thetaE * ddPc * ARCSEC_RAD;
  const sigmaCrit = ((C_KMS * C_KMS) / (4 * Math.PI * G)) * (dsOverDds / ddPc);
  const coeff = 2 * Math.sqrt(Math.PI) * Math.exp(lgamma(gamma / 2) - lgamma((gamma - 1) / 2));
  const amplitude = coeff * sigmaCrit * Math.pow(rePc, gamma - 1);
  const out = Float64Array.from(radiusPc, (r) => amplitude * Math.pow(r, 3 - gamma));
  if (!inner) return out;
  const [dg, frac] = inner;
  const rb = frac * rePc, gin = gamma + dg;
  const mIn = (amplitude * Math.pow(rb, 3 - gamma) * (3 - gamma)) / (3 - gin);
  const excess = mIn - amplitude * Math.pow(rb, 3 - gamma);
  const rescale = (Math.PI * rePc * rePc * sigmaCrit) / (Math.PI * rePc * rePc * sigmaCrit + excess);
  for (let i = 0; i < out.length; i++) out[i] = rescale * (radiusPc[i] < rb ? mIn * Math.pow(Math.max(radiusPc[i], 1e-300) / rb, 3 - gin) : out[i] + excess);
  return out;
}

const axisRatio = (e1, e2) => { const e = Math.min(Math.sqrt(e1 * e1 + e2 * e2 + 1e-24), 0.9999); return (1 - e) / (1 + e); };

// Why a run's kinematics cannot be predicted here (null when they can).
export function unsupportedReason(config) {
  const lik = config?.likelihood || {};
  const kc = { ...KIN_DEFAULTS, ...(lik.kinematics || {}) };
  if (!lik.use_kinematics) return "the run has no kinematics";
  if (kc.mode !== "aperture") return "resolved (IFU) kinematics need the binned IFU data file and its PSF, which are not in the run folder";
  if (kc.dynamics !== "spherical") return `${kc.dynamics} dynamics are not ported`;
  if (kc.ds_over_dds == null) return "likelihood.kinematics.ds_over_dds is missing";
  const main = config?.mass?.main || {};
  if (/bpl/i.test(main.profile || "")) return "broken power-law main deflectors are not ported";
  const orders = main.multipoles?.orders || [];
  if (orders.some((m) => m % 2 === 0)) return "even multipoles enter the dynamics as a monopole, which is not ported";
  if (/mge/i.test(config?.light?.lens?.refit?.profile || "") || config?.light?.lens?.use_mge) return "MGE lens light is not supported by the kinematics";
  return null;
}

// Aperture prediction for posterior draws: one solver plan per run, predict(params) per draw.
export class ApertureKinematics {
  constructor(kinConfig) {
    const c = { ...KIN_DEFAULTS, ...(kinConfig || {}) };
    this.config = c;
    const aperture = new Aperture({ kind: c.aperture_kind, width: c.aperture_width, height: c.aperture_height, radius: c.aperture_radius, psfSigma: c.psf_sigma, psfWeight: c.psf_weight });
    this.solver = new SphericalJeans(aperture, { rMin: c.radial_min, rMax: c.radial_max, nRadial: c.radial_intervals, nAngular: c.angular_nodes, nAbel: c.abel_nodes });
    this.observed = c.observed_sigma;
    this.error = c.covariance_scale * c.sigma_error;
  }

  // params: ALPACA posterior names with TRUE values (lens_theta_E, lens_gamma, light_*_L{,2,3}, kin_*).
  // lambdaOverride replaces kin_lambda_int (e.g. 1 for the lens model alone).
  predict(params, { lambdaOverride = null } = {}) {
    const c = this.config;
    const amps = [], res = [], ns = [];
    const exclude = new Set(c.tracer_exclude || []);
    ["L", "L2", "L3"].forEach((sfx, i) => {
      if (params[`light_Re_${sfx}`] === undefined) return;
      const e1 = params[`light_e1_${sfx}`] ?? params.light_e1_L, e2 = params[`light_e2_${sfx}`] ?? params.light_e2_L;
      amps.push(exclude.has(i) ? 0 : Math.exp(params[`log_light_amp_${sfx}`]));
      res.push(params[`light_Re_${sfx}`] * (c.light_radius_convention === "major_axis" ? Math.sqrt(axisRatio(e1, e2)) : 1));
      ns.push(params[`light_n_${sfx}`]);
    });
    if (!amps.length) throw new Error("no Sersic lens-light components in the parameters");
    const ratio = params.kin_anisotropy_ratio ?? (c.anisotropy_ratio_fixed == null ? 1 : c.anisotropy_ratio_fixed);
    const lam = lambdaOverride ?? params.kin_lambda_int ?? c.lambda_int;
    const inner = (c.inner_dgamma_range || []).length ? [params.kin_inner_dgamma ?? 0, c.inner_break_radius] : (c.dynamics_inner_break || []).length ? c.dynamics_inner_break : null;
    const s = this.solver;
    const density = sersicDensity(s.radius, amps, res, ns, s.nAbel);
    const scale = c.distance_mpc * 1e6 * ARCSEC_RAD;
    const mass = powerlawEnclosedMass(Float64Array.from(s.radius, (r) => r * scale), params.lens_theta_E, params.lens_gamma + (c.dynamics_gamma_offset || 0), c.distance_mpc, c.ds_over_dds, inner);
    const ms = lam * (1 - c.kappa_ext);
    for (let i = 0; i < mass.length; i++) mass[i] *= ms;
    return s.apertureFromDensity(density, mass, 1 - ratio * ratio, c.distance_mpc);
  }
}
