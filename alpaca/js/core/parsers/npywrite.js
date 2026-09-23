// NumPy .npy / .npz writers (mirror of the readers) so unblinded products can be written
// in the exact format ALPACA's Python tools produce.
import { zipSync } from "../../vendor/fflate.js";

function headerBytes(descr, shape) {
  const dict = `{'descr': '${descr}', 'fortran_order': False, 'shape': (${shape.length === 1 ? shape[0] + "," : shape.join(", ")}), }`;
  // pad so that (magic 6 + version 2 + len 2 + header) is a multiple of 64
  let pad = 64 - ((10 + dict.length + 1) % 64);
  if (pad === 64) pad = 0;
  const text = dict + " ".repeat(pad) + "\n";
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return bytes;
}

// data: Float64Array/Float32Array/Int32Array or array of strings; dtype optional override.
export function encodeNpy(data, shape, dtype = null) {
  let descr, body;
  if (Array.isArray(data) && typeof data[0] === "string") {
    const width = Math.max(1, ...data.map((s) => [...s].length));
    descr = `<U${width}`;
    body = new Uint8Array(data.length * width * 4);
    const dv = new DataView(body.buffer);
    data.forEach((s, i) => { [...s].forEach((ch, k) => dv.setUint32((i * width + k) * 4, ch.codePointAt(0), true)); });
  } else if (data instanceof Float64Array) { descr = dtype || "<f8"; body = new Uint8Array(data.buffer, data.byteOffset, data.byteLength); }
  else if (data instanceof Float32Array) { descr = dtype || "<f4"; body = new Uint8Array(data.buffer, data.byteOffset, data.byteLength); }
  else if (data instanceof Int32Array) { descr = dtype || "<i4"; body = new Uint8Array(data.buffer, data.byteOffset, data.byteLength); }
  else if (data instanceof Uint8Array) { descr = dtype || "|u1"; body = data; }
  else throw new Error("encodeNpy: unsupported array type");
  const header = headerBytes(descr, shape);
  const out = new Uint8Array(10 + header.length + body.length);
  out.set([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 1, 0, header.length & 0xff, header.length >> 8], 0);
  out.set(header, 10);
  out.set(body, 10 + header.length);
  return out;
}

// arrays: { name: { data, shape, dtype? } } -> Uint8Array of a (deflated) .npz
export function encodeNpz(arrays, { level = 6 } = {}) {
  const files = {};
  for (const [name, a] of Object.entries(arrays)) files[name + ".npy"] = encodeNpy(a.data, a.shape, a.dtype || null);
  return zipSync(files, { level });
}
