// Multiband (ALPACA >= 0.6.0, alpaca.multiband) parameter views. Pure functions, shared by the worker and the tests.
//
// A joint run stores every SHARED site once under its own name (lens_*, pert*_theta_E, x_image_i, D_dt, ...) and
// every PER-BAND site as "<band>/<site>" (posterior) or "<band>__<site>" (joint_map_params_full.npz); non-reference
// bands also carry their frame offset "<band>/frame_dx|dy" (arcsec). The parameters band b's model actually sees are
// alpaca.multiband.model.JointModel.view: its own sites without the prefix, plus every shared site, where shared
// image-plane positions (*center_x/_y, x_image_i/y_image_i) are read as value + (frame_dx, frame_dy).

export const POS_X = /(center_x(_|$)|^x_image(_\d+)?$)/;
export const POS_Y = /(center_y(_|$)|^y_image(_\d+)?$)/;

export function positionalAxis(site) { return POS_X.test(site) ? "x" : POS_Y.test(site) ? "y" : null; }

// Band names in a joint parameter list (prefixes before the separator).
export function bandsIn(names, sep = "/") {
  const out = new Set();
  for (const n of names) { const i = n.indexOf(sep); if (i > 0) out.add(n.slice(0, i)); }
  return [...out];
}

// Columns of band `band`'s view of a joint sample matrix (nS x nP, row-major). The frame offset is kept as two extra
// columns frame_dx / frame_dy (arcsec; zero-width for the reference band, which has none) so panels can show it;
// the forward model ignores them. Returns { names, samples, nP, shifted: [shared positional sites], hasOffset }.
export function projectBand(names, samples, nS, nP, { band, reference = null, sep = "/", frameOffsets = true } = {}) {
  const pre = band + sep;
  const keep = []; // [sourceIndex, outName, axis]
  let dxIdx = -1, dyIdx = -1;
  names.forEach((nm, i) => {
    if (nm.startsWith(pre)) {
      const local = nm.slice(pre.length);
      if (local === "frame_dx") { dxIdx = i; return; }
      if (local === "frame_dy") { dyIdx = i; return; }
      keep.push([i, local, null]);
    } else if (!nm.includes(sep)) keep.push([i, nm, positionalAxis(nm)]);
  });
  const hasOffset = frameOffsets && band !== reference && dxIdx >= 0 && dyIdx >= 0;
  const outNames = keep.map((k) => k[1]);
  if (hasOffset) outNames.push("frame_dx", "frame_dy");
  const m = outNames.length;
  const out = new Float64Array(nS * m);
  const shifted = [];
  for (const [, nm, ax] of keep) if (hasOffset && ax) shifted.push(nm);
  for (let s = 0; s < nS; s++) {
    const row = s * nP, o = s * m;
    const dx = hasOffset ? samples[row + dxIdx] : 0, dy = hasOffset ? samples[row + dyIdx] : 0;
    for (let k = 0; k < keep.length; k++) {
      const [i, , ax] = keep[k];
      let v = samples[row + i];
      if (hasOffset && ax) v += ax === "x" ? dx : dy;
      out[o + k] = v;
    }
    if (hasOffset) { out[o + keep.length] = dx; out[o + keep.length + 1] = dy; }
  }
  return { names: outNames, samples: out, nP: m, shifted, hasOffset };
}

// The same view for one parameter dict (joint MAP: { name: number | {shape, data} }, separator "__").
export function viewParams(params, { band, reference = null, sep = "__", frameOffsets = true } = {}) {
  const pre = band + sep;
  const own = {}, shared = {};
  for (const [k, v] of Object.entries(params)) {
    if (k.startsWith(pre)) own[k.slice(pre.length)] = v;
    else if (!k.includes(sep)) shared[k] = v;
  }
  const dx = own.frame_dx, dy = own.frame_dy;
  delete own.frame_dx; delete own.frame_dy;
  const hasOffset = frameOffsets && band !== reference && typeof dx === "number" && typeof dy === "number";
  const out = { ...own };
  for (const [k, v] of Object.entries(shared)) {
    const ax = positionalAxis(k);
    out[k] = hasOffset && ax && typeof v === "number" ? v + (ax === "x" ? dx : dy) : v;
  }
  return { params: out, frame: hasOffset ? { dx, dy } : null };
}

// Nominal wavelength in micron from a filter name, for ordering bands and labelling axes only: NIRCam / NIRISS
// F<3 digits> in units of 10 nm (F200W -> 2.00, F356W -> 3.56), MIRI F<4 digits> (F1500W -> 15.0); 3-digit numbers
// >= 500 are read as HST optical filters in nm (F814W -> 0.814). null without a filter number.
export function bandWavelength(band) {
  const m = /F(\d{3,4})[WMNL]{0,2}/i.exec(band || "");
  if (!m) return null;
  const n = +m[1];
  if (m[1].length === 4) return n / 100;
  if (n >= 500) return n / 1000;
  return n / 100;
}
