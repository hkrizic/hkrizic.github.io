// Perturber catalog -> ALPACA arcsec frame, mirroring alpaca.models.perturbers
// (_tangent_offsets_arcsec, _pixel_offsets_from_wcs_fit, _model_frame_positions)
// and alpaca.data.detection.detect_lens_center.

function tangentOffsets(target, perts) {
  const cosd = Math.cos((target.dec_deg * Math.PI) / 180);
  return perts.map((p) => [(p.ra_deg - target.ra_deg) * cosd * 3600, (p.dec_deg - target.dec_deg) * 3600]);
}

// least squares for pixel = A (u,v) + b : design (n x 3) -> coeffs (3 x 2)
function lstsq3(design, pix) {
  const n = design.length;
  const ATA = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const ATb = [[0, 0], [0, 0], [0, 0]];
  for (let k = 0; k < n; k++) {
    const d = design[k];
    for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) ATA[i][j] += d[i] * d[j]; ATb[i][0] += d[i] * pix[k][0]; ATb[i][1] += d[i] * pix[k][1]; }
  }
  // solve 3x3 via Gaussian elimination for two right-hand sides
  const M = ATA.map((r, i) => [...r, ATb[i][0], ATb[i][1]]);
  for (let c = 0; c < 3; c++) {
    let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) return null;
    for (let r = 0; r < 3; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; for (let j = c; j < 5; j++) M[r][j] -= f * M[c][j]; }
  }
  return [0, 1, 2].map((i) => [M[i][3] / M[i][i], M[i][4] / M[i][i]]);
}

// Positions (arcsec, ALPACA frame) of the given catalog perturbers, anchored at lensCenter.
export function perturberPositions(catalog, perts, lensCenter, { imageNpix = null } = {}) {
  const t = catalog.target || {};
  const out = new Map();
  const sky = perts.filter((p) => p.ra_deg != null && p.dec_deg != null && t.ra_deg != null && t.dec_deg != null);
  const pixelOnly = perts.filter((p) => !sky.includes(p));
  if (pixelOnly.length) {
    const npix = t.npix ?? imageNpix;
    for (const p of pixelOnly) if (p.pixel_xy && npix) out.set(p.id, [(p.pixel_xy[0] - (npix - 1) / 2) * t.pix_scale_arcsec, (p.pixel_xy[1] - (npix - 1) / 2) * t.pix_scale_arcsec]);
  }
  if (!sky.length) return out;
  const [cx, cy] = lensCenter;
  let offsets = null;
  const withPix = sky.filter((p) => Array.isArray(p.pixel_xy));
  if (withPix.length >= 3) {
    const uv = tangentOffsets(t, withPix);
    const design = uv.map(([u, v]) => [u, v, 1]);
    const pix = withPix.map((p) => p.pixel_xy);
    const coeffs = lstsq3(design, pix);
    if (coeffs) {
      let s2 = 0;
      design.forEach((d, k) => { for (let j = 0; j < 2; j++) { const fit = d[0] * coeffs[0][j] + d[1] * coeffs[1][j] + coeffs[2][j]; s2 += (fit - pix[k][j]) ** 2; } });
      const rms = Math.sqrt(s2 / (2 * design.length));
      if (rms <= 1.0) {
        const targetPix = coeffs[2];
        const uvAll = tangentOffsets(t, sky);
        offsets = sky.map((p, k) => {
          const fitted = Array.isArray(p.pixel_xy) ? p.pixel_xy : [uvAll[k][0] * coeffs[0][0] + uvAll[k][1] * coeffs[1][0] + coeffs[2][0], uvAll[k][0] * coeffs[0][1] + uvAll[k][1] * coeffs[1][1] + coeffs[2][1]];
          return [(fitted[0] - targetPix[0]) * t.pix_scale_arcsec, (fitted[1] - targetPix[1]) * t.pix_scale_arcsec];
        });
      }
    }
  }
  if (!offsets) offsets = tangentOffsets(t, sky).map(([u, v]) => [-u, v]); // North-up / East-left
  sky.forEach((p, k) => out.set(p.id, [cx + offsets[k][0], cy + offsets[k][1]]));
  return out;
}

// Brightest local maximum (5x5, nearest-mode maximum filter) within searchRadius of approx.
export function detectLensCenter(img, nx, pix, approx, searchRadius = 0.35, win = 5) {
  const ra0 = -(nx * pix) / 2 + pix / 2;
  const h = win >> 1;
  let best = null, bestVal = -Infinity, anyMask = false, brightest = null, brightestVal = -Infinity;
  for (let r = 0; r < nx; r++) {
    for (let c = 0; c < nx; c++) {
      const x = ra0 + c * pix, y = ra0 + r * pix;
      if (Math.hypot(x - approx[0], y - approx[1]) > searchRadius) continue;
      anyMask = true;
      const v = img[r * nx + c];
      if (v > brightestVal) { brightestVal = v; brightest = [x, y]; }
      let mx = -Infinity;
      for (let dr = -h; dr <= h; dr++) for (let dc = -h; dc <= h; dc++) {
        const rr = Math.min(nx - 1, Math.max(0, r + dr)), cc = Math.min(nx - 1, Math.max(0, c + dc));
        mx = Math.max(mx, img[rr * nx + cc]);
      }
      if (v === mx && v > bestVal) { bestVal = v; best = [x, y]; }
    }
  }
  if (!anyMask) return approx;
  return best || brightest || approx;
}
