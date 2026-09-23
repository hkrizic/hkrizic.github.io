// Client-side decryption of ALPACA's sealed blinding offsets (alpaca-blinding-v1):
// PBKDF2-HMAC-SHA256 -> 64 bytes (enc key | mac key); HMAC-SHA256 CTR keystream;
// encrypt-then-MAC tag over salt||nonce||ciphertext. Everything stays in memory.

function b64d(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(...arrs) {
  const n = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

async function hmac(keyBytes, data) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
}

export function isEncryptedBlob(data) {
  return data && data.scheme === "alpaca-blinding-v1" && "ciphertext" in data;
}

export async function decryptOffsets(blob, passphrase) {
  if (!passphrase) throw new Error("No blinding key provided.");
  if (blob.scheme !== "alpaca-blinding-v1") throw new Error("Unrecognised blinding scheme " + blob.scheme);
  const salt = b64d(blob.salt);
  const nonce = b64d(blob.nonce);
  const ct = b64d(blob.ciphertext);
  const tag = b64d(blob.tag);
  const iterations = blob.iterations || 200000;
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveBits"]);
  const material = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, 512));
  const encKey = material.slice(0, 32);
  const macKey = material.slice(32, 64);
  const expected = await hmac(macKey, concat(salt, nonce, ct));
  let diff = expected.length ^ tag.length;
  for (let i = 0; i < Math.min(expected.length, tag.length); i++) diff |= expected[i] ^ tag[i];
  if (diff !== 0) throw new Error("Blinding key is wrong (MAC check failed).");
  const stream = new Uint8Array(ct.length);
  let counter = 0;
  for (let off = 0; off < ct.length; off += 32) {
    const ctr = new Uint8Array(8);
    new DataView(ctr.buffer).setBigUint64(0, BigInt(counter), false);
    const block = await hmac(encKey, concat(nonce, ctr));
    stream.set(block.subarray(0, Math.min(32, ct.length - off)), off);
    counter++;
  }
  const pt = new Uint8Array(ct.length);
  for (let i = 0; i < ct.length; i++) pt[i] = ct[i] ^ stream[i];
  const payload = JSON.parse(new TextDecoder().decode(pt));
  return { offsets: payload.offsets, mode: payload.mode, reference: payload.reference || "mean" };
}

export function unblindValue(v, offset, mode) {
  return mode === "fractional" ? v * offset + offset : v + offset;
}
