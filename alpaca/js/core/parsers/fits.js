// Minimal FITS reader for the plain 2-D image HDUs ALPACA writes.
// Supports BITPIX 8/16/32/64/-32/-64, BZERO/BSCALE, primary HDU only.
// Returns { header, shape: [rows, cols], data: Float64Array } with the same
// row-major layout as astropy's fits.getdata (data[row * cols + col]).

const BLOCK = 2880;

function parseCardValue(raw) {
  const s = raw.trim();
  if (s.startsWith("'")) {
    // string: up to closing quote (quotes are doubled inside strings)
    let out = "";
    let i = 1;
    while (i < s.length) {
      if (s[i] === "'") {
        if (s[i + 1] === "'") { out += "'"; i += 2; continue; }
        break;
      }
      out += s[i];
      i++;
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

export function parseFitsHeader(u8) {
  const header = {};
  let pos = 0;
  let done = false;
  while (!done && pos < u8.length) {
    for (let i = 0; i < 36; i++) {
      const start = pos + i * 80;
      let card = "";
      for (let k = 0; k < 80 && start + k < u8.length; k++) card += String.fromCharCode(u8[start + k]);
      const key = card.slice(0, 8).trim();
      if (key === "END") { done = true; break; }
      if (card[8] === "=" && key !== "COMMENT" && key !== "HISTORY") {
        header[key] = parseCardValue(card.slice(10));
      }
    }
    pos += BLOCK;
  }
  return { header, dataOffset: pos };
}

export function parseFits(buffer) {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const { header, dataOffset } = parseFitsHeader(u8);
  const bitpix = header.BITPIX;
  const naxis = header.NAXIS || 0;
  const shape = [];
  for (let n = naxis; n >= 1; n--) shape.push(header["NAXIS" + n]);
  const count = shape.reduce((a, b) => a * b, 1);
  const bzero = header.BZERO ?? 0;
  const bscale = header.BSCALE ?? 1;
  const dv = new DataView(u8.buffer, u8.byteOffset + dataOffset);
  const data = new Float64Array(count);
  switch (bitpix) {
    case 8:
      for (let i = 0; i < count; i++) data[i] = dv.getUint8(i);
      break;
    case 16:
      for (let i = 0; i < count; i++) data[i] = dv.getInt16(i * 2, false);
      break;
    case 32:
      for (let i = 0; i < count; i++) data[i] = dv.getInt32(i * 4, false);
      break;
    case 64:
      for (let i = 0; i < count; i++) data[i] = Number(dv.getBigInt64(i * 8, false));
      break;
    case -32:
      for (let i = 0; i < count; i++) data[i] = dv.getFloat32(i * 4, false);
      break;
    case -64:
      for (let i = 0; i < count; i++) data[i] = dv.getFloat64(i * 8, false);
      break;
    default:
      throw new Error("Unsupported BITPIX " + bitpix);
  }
  if (bzero !== 0 || bscale !== 1) {
    for (let i = 0; i < count; i++) data[i] = data[i] * bscale + bzero;
  }
  return { header, shape, data };
}
