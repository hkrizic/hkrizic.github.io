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

// D_dt scales exactly as 1/H0 at fixed Om, so H0 = H0_ref * D_dt(H0_ref) / D_dt.
export function H0FromDdt(Ddt, zl, zs, Om = 0.3) {
  const ref = timeDelayDistance(zl, zs, { H0: 70, Om });
  return (70 * ref) / Ddt;
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
