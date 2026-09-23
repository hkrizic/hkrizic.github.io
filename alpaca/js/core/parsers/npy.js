// NumPy .npy / .npz reader (browser + Node). Uses fflate for the zip layer.
import { unzipSync } from "../../vendor/fflate.js";

function latin1(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return s;
}

function parseDescr(descr) {
  // e.g. '<f8', '|b1', '<U22', '|O'
  const m = /^([<>|=])([a-zA-Z])(\d*)$/.exec(descr);
  if (!m) throw new Error("Unsupported dtype " + descr);
  return { endian: m[1], kind: m[2], size: m[3] ? parseInt(m[3], 10) : 0 };
}

export function parseNpy(u8) {
  if (!(u8[0] === 0x93 && latin1(u8.subarray(1, 6)) === "NUMPY")) {
    throw new Error("Not an .npy file");
  }
  const major = u8[6];
  let hlen;
  let off;
  if (major === 1) {
    hlen = u8[8] | (u8[9] << 8);
    off = 10;
  } else {
    hlen = (u8[8] | (u8[9] << 8) | (u8[10] << 16) | (u8[11] << 24)) >>> 0;
    off = 12;
  }
  const header = latin1(u8.subarray(off, off + hlen));
  const descr = /'descr':\s*'([^']+)'/.exec(header)[1];
  const fortran = /'fortran_order':\s*(True|False)/.exec(header)[1] === "True";
  const shapeStr = /'shape':\s*\(([^)]*)\)/.exec(header)[1];
  const shape = shapeStr.split(",").map((s) => s.trim()).filter((s) => s.length).map((s) => parseInt(s, 10));
  const count = shape.reduce((a, b) => a * b, 1);
  const dataOff = off + hlen;
  const { endian, kind, size } = parseDescr(descr);
  const little = endian === "<" || endian === "|" || endian === "=";
  const byteOffset = u8.byteOffset + dataOff;
  const buf = u8.buffer;

  let data;
  const aligned = (n) => byteOffset % n === 0;
  const view = () => new DataView(buf, byteOffset);

  if (kind === "f" && size === 8) {
    if (little && aligned(8)) data = new Float64Array(buf, byteOffset, count);
    else { const dv = view(); data = new Float64Array(count); for (let i = 0; i < count; i++) data[i] = dv.getFloat64(i * 8, little); }
  } else if (kind === "f" && size === 4) {
    if (little && aligned(4)) data = new Float32Array(buf, byteOffset, count);
    else { const dv = view(); data = new Float32Array(count); for (let i = 0; i < count; i++) data[i] = dv.getFloat32(i * 4, little); }
  } else if (kind === "i" && size === 8) {
    const dv = view(); data = new Float64Array(count); for (let i = 0; i < count; i++) data[i] = Number(dv.getBigInt64(i * 8, little));
  } else if (kind === "u" && size === 8) {
    const dv = view(); data = new Float64Array(count); for (let i = 0; i < count; i++) data[i] = Number(dv.getBigUint64(i * 8, little));
  } else if (kind === "i" && size === 4) {
    const dv = view(); data = new Int32Array(count); for (let i = 0; i < count; i++) data[i] = dv.getInt32(i * 4, little);
  } else if (kind === "u" && size === 4) {
    const dv = view(); data = new Uint32Array(count); for (let i = 0; i < count; i++) data[i] = dv.getUint32(i * 4, little);
  } else if (kind === "i" && size === 2) {
    const dv = view(); data = new Int16Array(count); for (let i = 0; i < count; i++) data[i] = dv.getInt16(i * 2, little);
  } else if (kind === "u" && size === 2) {
    const dv = view(); data = new Uint16Array(count); for (let i = 0; i < count; i++) data[i] = dv.getUint16(i * 2, little);
  } else if ((kind === "i" || kind === "u" || kind === "b") && size === 1) {
    data = kind === "i" ? new Int8Array(buf, byteOffset, count) : new Uint8Array(buf, byteOffset, count);
  } else if (kind === "U") {
    // fixed-width UTF-32 strings
    const dv = view();
    data = new Array(count);
    for (let i = 0; i < count; i++) {
      let s = "";
      for (let k = 0; k < size; k++) {
        const cp = dv.getUint32((i * size + k) * 4, little);
        if (cp === 0) break;
        s += String.fromCodePoint(cp);
      }
      data[i] = s;
    }
  } else if (kind === "S") {
    data = new Array(count);
    for (let i = 0; i < count; i++) {
      const bytes = u8.subarray(dataOff + i * size, dataOff + (i + 1) * size);
      let end = bytes.indexOf(0);
      if (end < 0) end = size;
      data[i] = latin1(bytes.subarray(0, end));
    }
  } else if (kind === "O") {
    throw new Error("Pickled object arrays are not supported");
  } else {
    throw new Error("Unsupported dtype " + descr);
  }

  if (fortran && shape.length === 2) {
    const [r, c] = shape;
    const out = new data.constructor(count);
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) out[i * c + j] = data[j * r + i];
    data = out;
  } else if (fortran && shape.length > 2) {
    throw new Error("Fortran-ordered arrays with ndim > 2 are not supported");
  }
  return { dtype: descr, shape, data };
}

// Parse a .npz archive (stored or deflated) into { name: {dtype, shape, data} }.
export function parseNpz(u8, { only = null } = {}) {
  const filter = only ? (f) => only.includes(f.name.replace(/\.npy$/, "")) : undefined;
  const files = unzipSync(u8, filter ? { filter } : undefined);
  const out = {};
  for (const [name, bytes] of Object.entries(files)) {
    if (!name.endsWith(".npy")) continue;
    out[name.slice(0, -4)] = parseNpy(bytes);
  }
  return out;
}

// List entry names of a .npz without inflating anything (reads the central directory).
export function listNpz(u8) {
  // Find end-of-central-directory record.
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) { eocd = i; break; }
  }
  if (eocd < 0) return [];
  const dv = new DataView(u8.buffer, u8.byteOffset);
  const n = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const names = [];
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const uncompressed = dv.getUint32(p + 24, true);
    const name = latin1(u8.subarray(p + 46, p + 46 + nameLen));
    names.push({ name: name.replace(/\.npy$/, ""), size: uncompressed });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}
