// FITS for the configurator: every HDU of a file (JWST i2d: empty primary, SCI, ERR, ...),
// read lazily from a Blob so a 1 GB mosaic never sits in memory at once, and a small
// writer for the ALPACA inputs (2-D images and masks).
//
// Pixel convention everywhere: data[row * cols + col], row 0 = first row in the file
// (astropy's fits.getdata), x = column, y = row, pixel centres at integers.

export const BLOCK = 2880;

function cardValue(raw) {
  const s = raw.trim();
  if (s.startsWith("'")) {
    let out = "";
    let i = 1;
    while (i < s.length) {
      if (s[i] === "'") {
        if (s[i + 1] === "'") { out += "'"; i += 2; continue; }
        break;
      }
      out += s[i++];
    }
    return out.trimEnd();
  }
  const body = s.split("/")[0].trim();
  if (body === "T") return true;
  if (body === "F") return false;
  if (body === "") return null;
  const num = Number(body.replace(/D/i, "E"));
  return Number.isNaN(num) ? body : num;
}

// Parse header cards from bytes that start at a header. Returns null until the END card
// is inside `u8` (the caller then reads more blocks).
export function parseHeader(u8) {
  const header = {};
  const cards = [];
  for (let pos = 0; pos + 80 <= u8.length; pos += 80) {
    let card = "";
    for (let k = 0; k < 80; k++) card += String.fromCharCode(u8[pos + k]);
    const key = card.slice(0, 8).trim();
    if (key === "END") {
      const used = pos + 80;
      return { header, cards, headerBytes: Math.ceil(used / BLOCK) * BLOCK };
    }
    cards.push(card);
    if (card[8] === "=" && key !== "COMMENT" && key !== "HISTORY") header[key] = cardValue(card.slice(10));
  }
  return null;
}

async function readBytes(blob, start, end) {
  return new Uint8Array(await blob.slice(start, end).arrayBuffer());
}

function hduShape(h) {
  const naxis = h.NAXIS || 0;
  const dims = [];
  for (let n = 1; n <= naxis; n++) dims.push(h["NAXIS" + n] || 0);
  return dims;   // FITS order: NAXIS1 (columns) first
}

function dataBytes(h) {
  const dims = hduShape(h);
  if (!dims.length) return 0;
  const bytes = Math.abs(h.BITPIX) / 8;
  const gcount = h.GCOUNT ?? 1;
  const pcount = h.PCOUNT ?? 0;
  return bytes * gcount * (pcount + dims.reduce((a, b) => a * b, 1));
}

// List every HDU: header, where its data start and how big it is.
export async function scanHdus(blob, { maxHdus = 64 } = {}) {
  const hdus = [];
  let pos = 0;
  while (pos < blob.size && hdus.length < maxHdus) {
    let nblocks = 4;
    let parsed = null;
    while (!parsed) {
      const end = Math.min(blob.size, pos + nblocks * BLOCK);
      const u8 = await readBytes(blob, pos, end);
      parsed = parseHeader(u8);
      if (!parsed) {
        if (end >= blob.size) throw new Error(`FITS header ${hdus.length} has no END card`);
        nblocks *= 2;
      }
    }
    const h = parsed.header;
    if (hdus.length === 0 && h.SIMPLE === undefined) throw new Error("not a FITS file (no SIMPLE card)");
    const dims = hduShape(h);
    const nbytes = dataBytes(h);
    const xt = String(h.XTENSION || (hdus.length === 0 ? "PRIMARY" : "")).trim();
    const isImage = (xt === "PRIMARY" || xt === "IMAGE") && dims.length >= 2 && dims[0] > 1 && dims[1] > 1;
    hdus.push({
      index: hdus.length,
      header: h,
      cards: parsed.cards,
      headerStart: pos,
      dataStart: pos + parsed.headerBytes,
      dataBytes: nbytes,
      bitpix: h.BITPIX,
      xtension: xt,
      extname: String(h.EXTNAME || (hdus.length === 0 ? "PRIMARY" : "")).trim(),
      dims,
      rows: dims[1] || 0,
      cols: dims[0] || 0,
      isImage,
    });
    pos += parsed.headerBytes + Math.ceil(nbytes / BLOCK) * BLOCK;
  }
  return hdus;
}

// Decode big-endian samples into a Float32Array, applying BSCALE/BZERO and BLANK -> NaN.
function decode(u8, hdu, out, outOffset, count) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const h = hdu.header;
  const bscale = h.BSCALE ?? 1;
  const bzero = h.BZERO ?? 0;
  const blank = h.BLANK;
  const scaled = bscale !== 1 || bzero !== 0;
  switch (hdu.bitpix) {
    case 8:
      for (let i = 0; i < count; i++) { const v = u8[i]; out[outOffset + i] = v === blank ? NaN : v * bscale + bzero; }
      break;
    case 16:
      for (let i = 0; i < count; i++) { const v = dv.getInt16(2 * i); out[outOffset + i] = v === blank ? NaN : v * bscale + bzero; }
      break;
    case 32:
      for (let i = 0; i < count; i++) { const v = dv.getInt32(4 * i); out[outOffset + i] = v === blank ? NaN : v * bscale + bzero; }
      break;
    case 64:
      for (let i = 0; i < count; i++) {
        const v = dv.getBigInt64(8 * i);
        out[outOffset + i] = (blank !== undefined && v === BigInt(blank)) ? NaN : Number(v) * bscale + bzero;
      }
      break;
    case -32:
      if (scaled) for (let i = 0; i < count; i++) out[outOffset + i] = dv.getFloat32(4 * i) * bscale + bzero;
      else for (let i = 0; i < count; i++) out[outOffset + i] = dv.getFloat32(4 * i);
      break;
    case -64:
      if (scaled) for (let i = 0; i < count; i++) out[outOffset + i] = dv.getFloat64(8 * i) * bscale + bzero;
      else for (let i = 0; i < count; i++) out[outOffset + i] = dv.getFloat64(8 * i);
      break;
    default:
      throw new Error(`unsupported BITPIX ${hdu.bitpix}`);
  }
}

// Read rows [r0, r1) x columns [c0, c1) of a 2-D image HDU. Pixels outside the image are NaN.
// Returns a Float32Array of (r1 - r0) * (c1 - c0) values, row-major.
export async function readRegion(blob, hdu, r0, r1, c0, c1) {
  const { rows, cols } = hdu;
  const bpp = Math.abs(hdu.bitpix) / 8;
  const w = c1 - c0;
  const out = new Float32Array((r1 - r0) * w).fill(NaN);
  const rr0 = Math.max(0, r0), rr1 = Math.min(rows, r1);
  const cc0 = Math.max(0, c0), cc1 = Math.min(cols, c1);
  if (rr1 <= rr0 || cc1 <= cc0) return out;
  const n = cc1 - cc0;
  const rowBytes = cols * bpp;
  // one slice for the whole row band when it is small enough, else row by row
  const band = (rr1 - rr0) * rowBytes;
  if (band <= 96 * 1024 * 1024) {
    const u8 = await readBytes(blob, hdu.dataStart + rr0 * rowBytes, hdu.dataStart + rr1 * rowBytes);
    for (let r = rr0; r < rr1; r++) {
      const off = (r - rr0) * rowBytes + cc0 * bpp;
      decode(u8.subarray(off, off + n * bpp), hdu, out, (r - r0) * w + (cc0 - c0), n);
    }
  } else {
    for (let r = rr0; r < rr1; r++) {
      const start = hdu.dataStart + r * rowBytes + cc0 * bpp;
      const u8 = await readBytes(blob, start, start + n * bpp);
      decode(u8, hdu, out, (r - r0) * w + (cc0 - c0), n);
    }
  }
  return out;
}

// Block-averaged overview (NaN-aware) of a large image, read in row bands.
export async function readOverview(blob, hdu, factor, onProgress) {
  const { rows, cols } = hdu;
  const orows = Math.ceil(rows / factor), ocols = Math.ceil(cols / factor);
  const sum = new Float64Array(orows * ocols);
  const cnt = new Uint32Array(orows * ocols);
  const bandRows = factor * Math.max(1, Math.floor(16e6 / (cols * 4 * factor)));
  const line = new Float32Array(cols);
  const bpp = Math.abs(hdu.bitpix) / 8;
  for (let r0 = 0; r0 < rows; r0 += bandRows) {
    const r1 = Math.min(rows, r0 + bandRows);
    const u8 = await readBytes(blob, hdu.dataStart + r0 * cols * bpp, hdu.dataStart + r1 * cols * bpp);
    for (let r = r0; r < r1; r++) {
      const off = (r - r0) * cols * bpp;
      decode(u8.subarray(off, off + cols * bpp), hdu, line, 0, cols);
      const orow = Math.floor(r / factor) * ocols;
      for (let c = 0; c < cols; c++) {
        const v = line[c];
        if (v === v) { const k = orow + Math.floor(c / factor); sum[k] += v; cnt[k]++; }
      }
    }
    if (onProgress) onProgress(r1 / rows);
  }
  const data = new Float32Array(orows * ocols);
  for (let i = 0; i < data.length; i++) data[i] = cnt[i] ? sum[i] / cnt[i] : NaN;
  return { data, rows: orows, cols: ocols, factor };
}

// ---------------------------------------------------------------- header helpers

// Pixel scale in arcsec: PIXSCALE, else sqrt(|det CD|), else CDELT with PC.
export function pixelScale(h) {
  if (typeof h.PIXSCALE === "number" && h.PIXSCALE > 0) return { scale: h.PIXSCALE, source: "PIXSCALE" };
  if (typeof h.CD1_1 === "number" || typeof h.CD2_2 === "number") {
    const a = h.CD1_1 ?? 0, b = h.CD1_2 ?? 0, c = h.CD2_1 ?? 0, d = h.CD2_2 ?? 0;
    const det = Math.abs(a * d - b * c);
    if (det > 0) return { scale: +(Math.sqrt(det) * 3600).toPrecision(15), source: "CD matrix" };
  }
  if (typeof h.CDELT1 === "number" && typeof h.CDELT2 === "number") {
    const a = h.PC1_1 ?? 1, b = h.PC1_2 ?? 0, c = h.PC2_1 ?? 0, d = h.PC2_2 ?? 1;
    const det = Math.abs((a * d - b * c) * h.CDELT1 * h.CDELT2);
    const unit = String(h.CUNIT1 || "deg").trim().toLowerCase();
    const toArcsec = unit === "arcsec" ? 1 : unit === "arcmin" ? 60 : 3600;
    if (det > 0) return { scale: +(Math.sqrt(det) * toArcsec).toPrecision(15), source: "CDELT/PC" };
  }
  return null;
}

const WCS_KEY = /^(WCSAXES|CRPIX[12]|CRVAL[12]|CTYPE[12]|CUNIT[12]|CDELT[12]|CD[12]_[12]|PC[12]_[12]|RADESYS|EQUINOX|LONPOLE|LATPOLE|MJDREF|DATEREF|WCSNAME)$/;
const INFO_KEY = /^(TELESCOP|INSTRUME|DETECTOR|FILTER|PUPIL|TARGNAME|TARGPROP|DATE-OBS|PHOTMJSR|PIXAR_SR|PIXAR_A2)$/;

// Cards for a crop starting at 0-based (c0, r0): WCS with CRPIX shifted, plus the
// observation keywords. `headers` = [science HDU header, primary header] with their cards.
export function cropCards(hdus, c0, r0, { bunit } = {}) {
  const out = [];
  const seen = new Set();
  for (const hdu of hdus) {
    if (!hdu) continue;
    for (const card of hdu.cards) {
      const key = card.slice(0, 8).trim();
      if (seen.has(key) || card[8] !== "=") continue;
      if (key === "CRPIX1" || key === "CRPIX2") {
        const v = hdu.header[key] - (key === "CRPIX1" ? c0 : r0);
        out.push(formatCard(key, v, "crop of the original frame", true));
        seen.add(key);
      } else if (WCS_KEY.test(key) || INFO_KEY.test(key)) {
        out.push(card);
        seen.add(key);
      } else if (key === "BUNIT" && !bunit) {
        out.push(card);
        seen.add(key);
      }
    }
  }
  if (bunit) out.push(formatCard("BUNIT", bunit, "image units"));
  return out;
}

// ---------------------------------------------------------------- writer

function fmtNumber(v, float) {
  if (!Number.isFinite(v)) throw new Error(`FITS card value ${v} is not finite`);
  let s = String(v).toUpperCase();
  if (float && !/[.E]/.test(s)) s += ".0";
  else if (float && /E/.test(s) && !/\./.test(s.split("E")[0])) s = s.replace("E", ".0E");
  return s;
}

// One 80-character header card. Numbers are written as floats when `float` is true.
export function formatCard(key, value, comment = "", float = undefined) {
  const k = key.toUpperCase().padEnd(8).slice(0, 8);
  let v;
  if (typeof value === "boolean") v = (value ? "T" : "F").padStart(20);
  else if (typeof value === "number") v = fmtNumber(value, float ?? !Number.isInteger(value)).padStart(20);
  else v = "'" + String(value).replace(/'/g, "''").padEnd(8) + "'";
  let card = `${k}= ${v}`;
  if (comment) card += ` / ${comment}`;
  return card.slice(0, 80).padEnd(80);
}

export function commentCard(key, text) {
  return (key.padEnd(8) + text).slice(0, 80).padEnd(80);
}

// Write a 2-D image as a single-HDU FITS file.
// data: array-like of rows * cols values (row-major), bitpix: -64 | -32 | 8 | 16.
export function writeFits(data, rows, cols, { bitpix = -64, cards = [] } = {}) {
  const head = [
    formatCard("SIMPLE", true, "conforms to FITS standard"),
    formatCard("BITPIX", bitpix, "array data type"),
    formatCard("NAXIS", 2, "number of array dimensions"),
    formatCard("NAXIS1", cols),
    formatCard("NAXIS2", rows),
    formatCard("EXTEND", true),
    ...cards.map((c) => c.padEnd(80).slice(0, 80)),
    "END".padEnd(80),
  ];
  const hbytes = Math.ceil((head.length * 80) / BLOCK) * BLOCK;
  const bpp = Math.abs(bitpix) / 8;
  const n = rows * cols;
  const dbytes = Math.ceil((n * bpp) / BLOCK) * BLOCK;
  const u8 = new Uint8Array(hbytes + dbytes);
  u8.fill(32, 0, hbytes);
  let p = 0;
  for (const c of head) for (let i = 0; i < 80; i++) u8[p++] = c.charCodeAt(i) & 0x7f;
  const dv = new DataView(u8.buffer, hbytes);
  switch (bitpix) {
    case -64: for (let i = 0; i < n; i++) dv.setFloat64(8 * i, data[i]); break;
    case -32: for (let i = 0; i < n; i++) dv.setFloat32(4 * i, data[i]); break;
    case 16: for (let i = 0; i < n; i++) dv.setInt16(2 * i, data[i]); break;
    case 8: for (let i = 0; i < n; i++) u8[hbytes + i] = data[i]; break;
    default: throw new Error(`unsupported BITPIX ${bitpix}`);
  }
  return u8;
}
