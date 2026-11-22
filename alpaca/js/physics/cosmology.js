// Flat LambdaCDM distances (no radiation, matching astropy FlatLambdaCDM with Tcmb0=0).

export const C_KMS = 299792.458;

function simpson(f, a, b, n = 2048) {
  if (b <= a) return 0;
  if (n % 2) n++;
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

export function comovingDistance(z, { H0 = 70, Om = 0.3 } = {}) {
  const OL = 1 - Om;
  const E = (zz) => 1 / Math.sqrt(Om * Math.pow(1 + zz, 3) + OL);
  return (C_KMS / H0) * simpson(E, 0, z);
}

// Angular diameter distance between z1 and z2 (z1 = 0 gives the usual D_A).
export function angularDiameterDistance(z1, z2, cosmo) {
  if (z2 === undefined) { z2 = z1; z1 = 0; }
  const d = comovingDistance(z2, cosmo) - comovingDistance(z1, cosmo);
  return d / (1 + z2);
}

export function timeDelayDistance(zl, zs, cosmo) {
  const Dl = angularDiameterDistance(0, zl, cosmo);
  const Ds = angularDiameterDistance(0, zs, cosmo);
  const Dls = angularDiameterDistance(zl, zs, cosmo);
  return ((1 + zl) * Dl * Ds) / Dls;
}

// Gauss-Legendre nodes and weights on [-1, 1] (Newton on P_n).
function gaussLegendre(n) {
  const x = new Float64Array(n), w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5)), pp = 1;
    for (let it = 0; it < 100; it++) {
      let p1 = 1, p2 = 0;
      for (let j = 1; j <= n; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j; }
      pp = (n * (z * p1 - p2)) / (z * z - 1);
      const dz = p1 / pp;
      z -= dz;
      if (Math.abs(dz) < 1e-16) break;
    }
    x[i] = z;
    w[i] = 2 / ((1 - z * z) * pp * pp);
  }
  return { x, w };
}
let GL64 = null;

// Comoving distance by 64-point Gauss-Legendre, as alpaca.models.multiplane._comoving_mpc (the sampled-Om geometry).
export function comovingDistanceGL(z, { H0 = 70, Om = 0.3 } = {}) {
  const { x, w } = (GL64 ||= gaussLegendre(64));
  let s = 0;
  for (let i = 0; i < x.length; i++) { const zz = 0.5 * z * (x[i] + 1); s += w[i] / Math.sqrt(Om * (1 + zz) ** 3 + (1 - Om)); }
  return (C_KMS / H0) * 0.5 * z * s;
}

export function timeDelayDistanceGL(zl, zs, cosmo) {
  const cl = comovingDistanceGL(zl, cosmo), cs = comovingDistanceGL(zs, cosmo);
  return ((1 + zl) * (cl / (1 + zl)) * (cs / (1 + zs))) / ((cs - cl) / (1 + zs));
}

// D_dt scales exactly as 1/H0 at fixed Om, so H0 = H0_ref * D_dt(H0_ref) / D_dt. Ddt: a number or an array of draws
// (returns a Float64Array); Om: a number, or one value per draw (sampled cosmo_Om0) for an array Ddt.
export function H0FromDdt(Ddt, zl, zs, Om = 0.3) {
  if (typeof Ddt === "number") return (70 * timeDelayDistance(zl, zs, { H0: 70, Om })) / Ddt;
  const out = new Float64Array(Ddt.length);
  if (typeof Om === "number") {
    const ref = timeDelayDistance(zl, zs, { H0: 70, Om });
    for (let i = 0; i < out.length; i++) out[i] = (70 * ref) / Ddt[i];
  } else {
    for (let i = 0; i < out.length; i++) out[i] = (70 * timeDelayDistanceGL(zl, zs, { H0: 70, Om: Om[i] })) / Ddt[i];
  }
  return out;
}

// Herculens 'standard' eta matrix for redshifts [z_0 ... z_{N-1}, z_source].
// Returns the full (N+1)x(N+1) matrix (eye(k=1) base + eta_ij for j >= i+2)
// plus the flat upper-triangular (k=2) list in herculens order.
export function etaMatrix(redshifts, cosmo) {
  const n = redshifts.length;
  const eta = [];
  for (let i = 0; i < n; i++) {
    eta.push(new Float64Array(n));
    if (i + 1 < n) eta[i][i + 1] = 1;
  }
  const flat = [];
  const D = redshifts.map((z) => angularDiameterDistance(0, z, cosmo));
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      const Dij = angularDiameterDistance(redshifts[i], redshifts[j], cosmo);
      const Diip1 = angularDiameterDistance(redshifts[i], redshifts[i + 1], cosmo);
      const v = (Dij * D[i + 1]) / (D[j] * Diip1);
      eta[i][j] = v;
      flat.push(v);
    }
  }
  return { eta, flat };
}
