// Mass and light profiles, ported 1:1 from herculens (+ ALPACA's patches).
// All functions operate on flat Float64Arrays and ADD into the outputs.

export function ellipticity2phiq(e1, e2) {
  const phi = Math.atan2(e2, e1) / 2;
  let c = Math.sqrt(e1 * e1 + e2 * e2);
  c = Math.min(c, 0.9999);
  const q = (1 - c) / (1 + c);
  return { phi, q };
}

// ---------------------------------------------------------------- EPL
// Tessore & Metcalf (2015) series, 20 terms, Horner evaluation (alpaca.models.epl).
const EPL_NMAX = 20;

export function eplDeflection(x, y, kw, ax, ay) {
  const { theta_E, e1, e2, gamma } = kw;
  const cx = kw.center_x || 0;
  const cy = kw.center_y || 0;
  const { phi, q } = ellipticity2phiq(e1, e2);
  const thetaEconv = theta_E / Math.sqrt((1 + q * q) / (2 * q));
  const b = thetaEconv * Math.sqrt((1 + q * q) / 2);
  const t = gamma - 1;
  const f = (1 - q) / (1 + q);
  const coef = new Float64Array(EPL_NMAX);
  coef[0] = 1;
  for (let n = 1; n < EPL_NMAX; n++) {
    coef[n] = coef[n - 1] * ((2 * n + t - 2) / (2 * n - t + 2));
  }
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);
  const pref0 = 2 / (1 + q);
  const n = x.length;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - cx;
    const dy = y[i] - cy;
    const xr = dx * cosP + dy * sinP;
    const yr = -dx * sinP + dy * cosP;
    const zr = q * xr;
    const zi = yr;
    const R2 = zr * zr + zi * zi;
    if (R2 === 0) continue;
    const R = Math.sqrt(R2);
    // w = -f z / conj(z) = -f z^2 / |z|^2
    const wr = (-f * (zr * zr - zi * zi)) / R2;
    const wi = (-f * (2 * zr * zi)) / R2;
    let vr = coef[EPL_NMAX - 1];
    let vi = 0;
    for (let k = EPL_NMAX - 2; k >= 0; k--) {
      const tr = coef[k] + (wr * vr - wi * vi);
      const ti = wr * vi + wi * vr;
      vr = tr;
      vi = ti;
    }
    const ror = zr * vr - zi * vi;
    const roi = zr * vi + zi * vr;
    const pref = pref0 * Math.pow(b / R, t);
    const fx = pref * ror;
    const fy = pref * roi;
    ax[i] += fx * cosP - fy * sinP;
    ay[i] += fx * sinP + fy * cosP;
  }
}

// Deflection in the major-axis frame (used by tests).
export function eplMajorAxisDeflection(X, Y, b, t, q, ax, ay) {
  const f = (1 - q) / (1 + q);
  const coef = new Float64Array(EPL_NMAX);
  coef[0] = 1;
  for (let n = 1; n < EPL_NMAX; n++) coef[n] = coef[n - 1] * ((2 * n + t - 2) / (2 * n - t + 2));
  const zr = q * X;
  const zi = Y;
  const R2 = zr * zr + zi * zi;
  if (R2 === 0) return;
  const R = Math.sqrt(R2);
  const wr = (-f * (zr * zr - zi * zi)) / R2;
  const wi = (-f * (2 * zr * zi)) / R2;
  let vr = coef[EPL_NMAX - 1];
  let vi = 0;
  for (let k = EPL_NMAX - 2; k >= 0; k--) {
    const tr = coef[k] + (wr * vr - wi * vi);
    const ti = wr * vi + wi * vr;
    vr = tr;
    vi = ti;
  }
  const pref = (2 / (1 + q)) * Math.pow(b / R, t);
  ax[0] += pref * (zr * vr - zi * vi);
  ay[0] += pref * (zr * vi + zi * vr);
}

// ---------------------------------------------------------------- SHEAR
export function shearDeflection(x, y, kw, ax, ay) {
  const { gamma1, gamma2 } = kw;
  const x0 = kw.ra_0 || 0;
  const y0 = kw.dec_0 || 0;
  const n = x.length;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - x0;
    const dy = y[i] - y0;
    ax[i] += gamma1 * dx + gamma2 * dy;
    ay[i] += gamma2 * dx - gamma1 * dy;
  }
}

// ---------------------------------------------------------------- SIS / SIE (NIE with s -> 0)
export function sisDeflection(x, y, kw, ax, ay) {
  const { theta_E } = kw;
  const cx = kw.center_x || 0;
  const cy = kw.center_y || 0;
  const n = x.length;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - cx;
    const dy = y[i] - cy;
    const r = Math.hypot(dx, dy);
    if (r === 0) continue;
    ax[i] += (theta_E * dx) / r;
    ay[i] += (theta_E * dy) / r;
  }
}

// SIE via the non-singular isothermal ellipsoid with a negligible core.
export function sieDeflection(x, y, kw, ax, ay) {
  const { theta_E, e1, e2 } = kw;
  const cx = kw.center_x || 0;
  const cy = kw.center_y || 0;
  const { phi, q: q0 } = ellipticity2phiq(e1, e2);
  const q = Math.min(q0, 0.99999999);
  if (q > 0.999999) return sisDeflection(x, y, kw, ax, ay);
  const thetaEconv = theta_E / Math.sqrt((1 + q * q) / (2 * q));
  const b = thetaEconv * Math.sqrt((1 + q * q) / 2);
  const s = 1e-10;
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);
  const sq = Math.sqrt(1 - q * q);
  const n = x.length;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - cx;
    const dy = y[i] - cy;
    const X = dx * cosP + dy * sinP;
    const Y = -dx * sinP + dy * cosP;
    const psi = Math.sqrt(q * q * (s * s + X * X) + Y * Y);
    const fx = (b / sq) * Math.atan((sq * X) / (psi + s));
    const fy = (b / sq) * Math.atanh((sq * Y) / (psi + q * q * s));
    ax[i] += fx * cosP - fy * sinP;
    ay[i] += fx * sinP + fy * cosP;
  }
}

export function deflectProfile(name, x, y, kw, ax, ay) {
  switch (name) {
    case "EPL": return eplDeflection(x, y, kw, ax, ay);
    case "SHEAR": return shearDeflection(x, y, kw, ax, ay);
    case "SIS": return sisDeflection(x, y, kw, ax, ay);
    case "SIE":
    case "NIE": return sieDeflection(x, y, kw, ax, ay);
    default: throw new Error("Unsupported mass profile " + name);
  }
}

// ---------------------------------------------------------------- Sersic (ALPACA stable form)
const SERSIC_SMOOTHING = 0.00001;
const SERSIC_MAX_R_FRAC = 1000;

export function bn(n) {
  return Math.max(1.9992 * n - 0.3271, 1e-5);
}

export function sersicLight(x, y, kw, out) {
  const { amp, R_sersic, n_sersic, e1, e2 } = kw;
  const cx = kw.center_x || 0;
  const cy = kw.center_y || 0;
  const r = Math.sqrt(e1 * e1 + e2 * e2);
  const scale = r > 0.9999 ? 0.9999 / (r > 0 ? r : 1) : 1;
  const a = e1 * scale;
  const b = e2 * scale;
  const rc = Math.min(r, 0.9999);
  const denom = (1 - rc) * (1 - rc);
  const s2 = SERSIC_SMOOTHING * SERSIC_SMOOTHING;
  const Rs = Math.max(SERSIC_SMOOTHING, Math.max(0, R_sersic));
  const b_n = bn(n_sersic);
  const invn = 1 / n_sersic;
  const n = x.length;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - cx;
    const dy = y[i] - cy;
    const u = (1 - a) * dx - b * dy;
    const v = -b * dx + (1 + a) * dy;
    const radius = Math.sqrt(Math.max((u * u + v * v) / denom, s2));
    const Rfrac = Math.max(SERSIC_SMOOTHING, radius) / Rs;
    if (Rfrac > SERSIC_MAX_R_FRAC) continue;
    out[i] += amp * Math.exp(-b_n * (Math.pow(Rfrac, invn) - 1));
  }
}

export function uniformLight(amp, out) {
  const n = out.length;
  for (let i = 0; i < n; i++) out[i] += amp;
}
