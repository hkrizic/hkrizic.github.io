// Decode a base64 RGB LUT (256*3 bytes) into a Uint8Array.
export function decodeLut(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
