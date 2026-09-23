// Radix-2 FFT and 2-D "same" convolution (scipy.signal.fftconvolve mode='same' semantics).

export function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

class FFT1D {
  constructor(n) {
    this.n = n;
    this.rev = new Uint32Array(n);
    let bits = 0;
    while ((1 << bits) < n) bits++;
    for (let i = 0; i < n; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.rev[i] = r;
    }
    this.cos = new Float64Array(n / 2);
    this.sin = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      this.cos[i] = Math.cos((-2 * Math.PI * i) / n);
      this.sin[i] = Math.sin((-2 * Math.PI * i) / n);
    }
  }

  // in-place, re/im Float64Array of length n; inverse flag conjugates twiddles (no 1/n scaling)
  transform(re, im, inverse = false) {
    const n = this.n;
    const rev = this.rev;
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    const sgn = inverse ? -1 : 1;
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let start = 0; start < n; start += size) {
        for (let k = 0; k < half; k++) {
          const wr = this.cos[k * step];
          const wi = sgn * this.sin[k * step];
          const a = start + k;
          const b = a + half;
          const tr = re[b] * wr - im[b] * wi;
          const ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
  }
}

const fftCache = new Map();
function getFFT(n) {
  if (!fftCache.has(n)) fftCache.set(n, new FFT1D(n));
  return fftCache.get(n);
}

// 2-D FFT of a real image placed in a P x Q zero-padded complex array (row-major).
function fft2(re, im, P, Q, inverse) {
  const fq = getFFT(Q);
  const fp = getFFT(P);
  const rowRe = new Float64Array(Q);
  const rowIm = new Float64Array(Q);
  for (let r = 0; r < P; r++) {
    const off = r * Q;
    for (let c = 0; c < Q; c++) { rowRe[c] = re[off + c]; rowIm[c] = im[off + c]; }
    fq.transform(rowRe, rowIm, inverse);
    for (let c = 0; c < Q; c++) { re[off + c] = rowRe[c]; im[off + c] = rowIm[c]; }
  }
  const colRe = new Float64Array(P);
  const colIm = new Float64Array(P);
  for (let c = 0; c < Q; c++) {
    for (let r = 0; r < P; r++) { colRe[r] = re[r * Q + c]; colIm[r] = im[r * Q + c]; }
    fp.transform(colRe, colIm, inverse);
    for (let r = 0; r < P; r++) { re[r * Q + c] = colRe[r]; im[r * Q + c] = colIm[r]; }
  }
}

// Precomputed kernel spectrum for repeated convolutions of same-size images.
export class Convolver {
  constructor(kernel, kRows, kCols, imgRows, imgCols) {
    this.kRows = kRows;
    this.kCols = kCols;
    this.imgRows = imgRows;
    this.imgCols = imgCols;
    this.P = nextPow2(imgRows + kRows - 1);
    this.Q = nextPow2(imgCols + kCols - 1);
    const { P, Q } = this;
    this.kre = new Float64Array(P * Q);
    this.kim = new Float64Array(P * Q);
    for (let r = 0; r < kRows; r++) for (let c = 0; c < kCols; c++) this.kre[r * Q + c] = kernel[r * kCols + c];
    fft2(this.kre, this.kim, P, Q, false);
  }

  // Returns Float64Array(imgRows*imgCols): scipy 'same' convolution centered on the image.
  convolveSame(img) {
    const { P, Q, imgRows, imgCols, kRows, kCols } = this;
    const re = new Float64Array(P * Q);
    const im = new Float64Array(P * Q);
    for (let r = 0; r < imgRows; r++) for (let c = 0; c < imgCols; c++) re[r * Q + c] = img[r * imgCols + c];
    fft2(re, im, P, Q, false);
    for (let i = 0; i < P * Q; i++) {
      const a = re[i]; const b = im[i];
      const c = this.kre[i]; const d = this.kim[i];
      re[i] = a * c - b * d;
      im[i] = a * d + b * c;
    }
    fft2(re, im, P, Q, true);
    const norm = 1 / (P * Q);
    const r0 = (kRows - 1) >> 1;
    const c0 = (kCols - 1) >> 1;
    const out = new Float64Array(imgRows * imgCols);
    for (let r = 0; r < imgRows; r++) {
      for (let c = 0; c < imgCols; c++) out[r * imgCols + c] = re[(r + r0) * Q + (c + c0)] * norm;
    }
    return out;
  }
}
