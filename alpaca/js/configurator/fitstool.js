// "Data" tab: open a FITS file (any HDU), find the lens, place the frame and the model
// cutout, draw the masks with circles, and export ALPACA's input files.
//
// Coordinates: full-resolution pixels of the chosen HDU, x = column, y = row, pixel
// centres at integers, row 0 at the bottom of the display (like ds9).
import { h, toast, download, fmt } from "./dom.js";
import { getLut, CMAP_NAMES } from "../core/colormaps.js";
import { scanHdus, readRegion, readOverview, pixelScale, cropCards, writeFits, formatCard, commentCard } from "./fitsio.js";
import { store, get, setMany, setRun, effective, subscribe, emit } from "./state.js";
import { addPerturber } from "./delays.js";

const FULL_LOAD_MAX = 16e6;     // pixels; bigger images get an overview + full-res region
const odd = (v) => { v = Math.round(v); return v % 2 ? v : v + 1; };
const LABELS = "ABCDEF";

const F = {
  file: null, name: "", hdus: [], sci: -1, err: -1,
  pix: null, bunit: "", photmjsr: null, convert: false, skysub: true, maskBits: 8,
  view: null, region: null, sample: null,
  lens: null, cx: null, cy: null, N: 0, M: 0,
  shapes: [], qso: [], sel: null, nextId: 1,
  stretch: "asinh", cmap: "gray", loPct: 1, hiPct: 99.7, soft: 0.03, lo: 0, hi: 1,
  preview: true, tool: "move",
};
store.fits = F;

let canvas, ctx, wrap, W = 600, H = 480, dpr = 1;
const cam = { x: 0, y: 0, zoom: 1, user: false, fit: null };
let viewCanvas = null, regionCanvas = null, maskCanvas = null;
let ui = {};

const w2s = (x, y) => [W / 2 + (x - cam.x) * cam.zoom, H / 2 - (y - cam.y) * cam.zoom];
const s2w = (sx, sy) => [cam.x + (sx - W / 2) / cam.zoom, cam.y - (sy - H / 2) / cam.zoom];
const pixScale = () => (F.pix ? F.pix.scale : effective("data.pix_scale"));
const isQuasar = () => effective("light.point_sources.enabled") !== false;
const hasFrame = () => F.view && F.cx !== null;

// ---------------------------------------------------------------- loading
async function openFile(file) {
  try {
    ui.status.textContent = `reading ${file.name}…`;
    const hdus = await scanHdus(file);
    const imgs = hdus.filter((u) => u.isImage);
    if (!imgs.length) throw new Error("no 2-D image in this file");
    F.file = file; F.name = file.name; F.hdus = hdus;
    F.sci = (imgs.find((u) => u.extname === "SCI") || imgs[0]).index;
    const err = imgs.find((u) => ["ERR", "RMS", "NOISE", "SIGMA"].includes(u.extname.toUpperCase()));
    F.err = err ? err.index : -1;
    F.shapes = []; F.qso = []; F.sel = null; F.lens = null; F.cx = null;
    drawHduChips();
    await loadSci();
  } catch (e) {
    ui.status.textContent = "";
    toast("Could not read the file: " + e.message, "bad");
    console.error(e);
  }
}

async function loadSci() {
  const hdu = F.hdus[F.sci], prim = F.hdus[0];
  F.pix = pixelScale(hdu.header) || pixelScale(prim.header);
  F.bunit = String(hdu.header.BUNIT ?? prim.header.BUNIT ?? "").trim();
  F.photmjsr = hdu.header.PHOTMJSR ?? prim.header.PHOTMJSR ?? null;
  F.convert = /mjy\/sr/i.test(F.bunit) && F.photmjsr > 0;
  F.region = null;
  const npx = hdu.rows * hdu.cols;
  if (npx <= FULL_LOAD_MAX) {
    ui.status.textContent = `loading ${hdu.cols}×${hdu.rows}…`;
    const data = await readRegion(F.file, hdu, 0, hdu.rows, 0, hdu.cols);
    F.view = { data, rows: hdu.rows, cols: hdu.cols, f: 1, ox: 0, oy: 0 };
  } else {
    const f = Math.ceil(Math.max(hdu.rows, hdu.cols) / 2000);
    const ov = await readOverview(F.file, hdu, f, (p) => { ui.status.textContent = `overview of a ${hdu.cols}×${hdu.rows} mosaic… ${Math.round(p * 100)}%`; });
    F.view = { data: ov.data, rows: ov.rows, cols: ov.cols, f: ov.factor, ox: 0, oy: 0 };
  }
  ui.status.textContent = "";
  const cut = effective("data.cutout_size");
  if (Math.max(hdu.rows, hdu.cols) <= 1001) {
    // a cutout already: the whole image is the frame
    F.N = odd(Math.min(hdu.rows, hdu.cols) - 1);
    F.cx = Math.floor((hdu.cols - 1) / 2); F.cy = Math.floor((hdu.rows - 1) / 2);
    F.M = cut && cut % 2 && cut <= F.N ? cut : odd(F.N / 2.2);
    setTool("lens");
    toast("Loaded. Click the lens galaxy to centre on it.");
  } else {
    F.M = cut && cut % 2 ? cut : 219;
    F.N = odd(Math.min(2.2 * F.M, hdu.rows - 2, hdu.cols - 2));
    F.cx = null;
    setTool("lens");
    toast("Big mosaic: click the lens galaxy (zoom with the wheel or the + button).");
  }
  computeLevels();
  rebuildImages();
  ui.empty.hidden = true;
  ui.main.hidden = false;
  cam.user = false; cam.fit = null;
  resize();
  if (F.pix) setMany([["data.pix_scale", F.pix.scale]], "fits");
  syncConfig();
  drawSizes(); drawShapes(); drawSelection();
}

async function ensureRegion() {
  if (!F.view || F.view.f === 1 || F.cx === null) return;
  const half = (F.N - 1) / 2 + 60;
  const R = F.region;
  if (R && F.cx - half >= R.ox && F.cx + half < R.ox + R.cols && F.cy - half >= R.oy && F.cy + half < R.oy + R.rows) return;
  const S = Math.min(2501, Math.max(F.N + 300, 801));
  const ox = F.cx - (S - 1) / 2, oy = F.cy - (S - 1) / 2;
  ui.status.textContent = "loading full resolution…";
  const data = await readRegion(F.file, F.hdus[F.sci], oy, oy + S, ox, ox + S);
  F.region = { data, rows: S, cols: S, f: 1, ox, oy };
  ui.status.textContent = "";
  computeLevels(F.region);
  rebuildImages();
  draw();
}

// ---------------------------------------------------------------- display
function computeLevels(src) {
  src = src || F.region || F.view;
  if (!src) return;
  // levels from the frame when it is known, else from the whole image
  let vals = [];
  const d = src.data;
  if (hasFrame() && src.f === 1) {
    const half = (F.N - 1) / 2;
    for (let y = Math.max(0, F.cy - half - src.oy); y <= Math.min(src.rows - 1, F.cy + half - src.oy); y += 1)
      for (let x = Math.max(0, F.cx - half - src.ox); x <= Math.min(src.cols - 1, F.cx + half - src.ox); x += 1) {
        const v = d[y * src.cols + x]; if (v === v) vals.push(v);
      }
  }
  if (vals.length < 100) {
    vals = [];
    const step = Math.max(1, Math.floor(d.length / 250000));
    for (let i = 0; i < d.length; i += step) { const v = d[i]; if (v === v) vals.push(v); }
  }
  if (vals.length > 250000) { const st = Math.ceil(vals.length / 250000); vals = vals.filter((_, i) => i % st === 0); }
  F.sample = Float32Array.from(vals).sort();
  applyLevels();
}

function applyLevels() {
  const s = F.sample;
  if (!s || !s.length) return;
  const q = (p) => s[Math.min(s.length - 1, Math.max(0, Math.floor((p / 100) * (s.length - 1))))];
  F.lo = q(F.loPct); F.hi = q(F.hiPct);
  if (!(F.hi > F.lo)) F.hi = F.lo + 1;
}

function stretchFn() {
  const lo = F.lo, span = F.hi - F.lo, soft = F.soft;
  const as = Math.asinh(1 / soft);
  switch (F.stretch) {
    case "linear": return (v) => (v - lo) / span;
    case "sqrt": return (v) => Math.sqrt(Math.max(0, (v - lo) / span));
    case "log": return (v) => Math.log10(1 + 1000 * Math.max(0, (v - lo) / span)) / 3;
    default: return (v) => Math.asinh((v - lo) / span / soft) / as;
  }
}

function toCanvas(img) {
  const c = document.createElement("canvas");
  c.width = img.cols; c.height = img.rows;
  const cx2 = c.getContext("2d");
  const id = cx2.createImageData(img.cols, img.rows);
  const lut = getLut(F.cmap);
  const fn = stretchFn();
  const px = id.data, d = img.data;
  for (let r = 0; r < img.rows; r++) {
    const dst = (img.rows - 1 - r) * img.cols;   // row 0 at the bottom
    for (let col = 0; col < img.cols; col++) {
      const v = d[r * img.cols + col];
      const o = 4 * (dst + col);
      if (v !== v) { px[o] = 255; px[o + 1] = 255; px[o + 2] = 255; px[o + 3] = 0; continue; }
      let t = fn(v);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const k = 3 * Math.round(t * 255);
      px[o] = lut[k]; px[o + 1] = lut[k + 1]; px[o + 2] = lut[k + 2]; px[o + 3] = 255;
    }
  }
  cx2.putImageData(id, 0, 0);
  return c;
}

function rebuildImages() {
  viewCanvas = F.view ? toCanvas(F.view) : null;
  regionCanvas = F.region ? toCanvas(F.region) : null;
  rebuildMask();
}

function drawImg(c, img) {
  const [sx, sy] = w2s(img.ox - 0.5, img.oy + img.rows * img.f - 0.5);
  ctx.drawImage(c, sx, sy, img.cols * img.f * cam.zoom, img.rows * img.f * cam.zoom);
}

// Masks of the current shapes. bad: optional Uint8Array (N*N) of unusable pixels.
function computeMasks(bad) {
  const N = F.N, M = F.M;
  const c0 = F.cx - (N - 1) / 2, r0 = F.cy - (N - 1) / 2;
  const aps = F.shapes.filter((s) => s.kind === "aperture");
  const holesL = F.shapes.filter((s) => s.kind === "hole" && s.applies !== "refit");
  const holesR = F.shapes.filter((s) => s.kind === "hole" && s.applies !== "likelihood");
  const inside = (list, x, y) => list.some((s) => (x - s.x) ** 2 + (y - s.y) ** 2 <= s.r * s.r);
  const refit = new Uint8Array(N * N);
  const likeFull = new Uint8Array(N * N);
  for (let i = 0; i < N; i++) {
    const y = r0 + i;
    for (let j = 0; j < N; j++) {
      const x = c0 + j, k = i * N + j;
      const b = bad ? bad[k] : 0;
      refit[k] = b || inside(holesR, x, y) ? 0 : 1;
      likeFull[k] = !b && (aps.length ? inside(aps, x, y) : true) && !inside(holesL, x, y) ? 1 : 0;
    }
  }
  const off = (N - M) / 2;
  const like = new Uint8Array(M * M);
  for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) like[i * M + j] = likeFull[(i + off) * N + j + off];
  return { refit, like, likeFull };
}

function rebuildMask() {
  maskCanvas = null;
  if (!F.preview || !hasFrame() || F.N > 1601) return;
  const { refit, likeFull } = computeMasks();
  const N = F.N, M = F.M, off = (N - M) / 2;
  const c = document.createElement("canvas");
  c.width = N; c.height = N;
  const cx2 = c.getContext("2d");
  const id = cx2.createImageData(N, N);
  for (let i = 0; i < N; i++) {
    const dst = (N - 1 - i) * N;
    const inCutRow = i >= off && i < off + M;
    for (let j = 0; j < N; j++) {
      const k = i * N + j, o = 4 * (dst + j);
      const inCut = inCutRow && j >= off && j < off + M;
      // a white veil over what the fit does not see: strong inside the cutout, light in the frame
      const a = inCut ? (likeFull[k] ? 0 : 140) : (refit[k] ? 60 : 140);
      id.data[o] = id.data[o + 1] = id.data[o + 2] = 255;
      id.data[o + 3] = a;
    }
  }
  cx2.putImageData(id, 0, 0);
  maskCanvas = c;
}

let drawQueued = false;
function draw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => { drawQueued = false; drawNow(); });
}

function haloPath(fn, { dash = [], width = 1.5 } = {}) {
  ctx.save();
  ctx.setLineDash(dash);
  ctx.lineWidth = width + 2.2; ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.beginPath(); fn(); ctx.stroke();
  ctx.lineWidth = width; ctx.strokeStyle = "#fff";
  ctx.beginPath(); fn(); ctx.stroke();
  ctx.restore();
}

function tag(text, sx, sy, { inverse = false } = {}) {
  ctx.save();
  ctx.font = "11px Jost, Helvetica, Arial, sans-serif";
  const w = ctx.measureText(text).width + 8;
  ctx.fillStyle = inverse ? "#000" : "#fff";
  ctx.fillRect(sx, sy - 13, w, 15);
  ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy - 12.5, w - 1, 14);
  ctx.fillStyle = inverse ? "#fff" : "#000";
  ctx.fillText(text, sx + 4, sy - 2);
  ctx.restore();
}

function drawNow() {
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#f6f6f6";
  ctx.fillRect(0, 0, W, H);
  if (!F.view) return;
  ctx.imageSmoothingEnabled = false;
  if (viewCanvas) drawImg(viewCanvas, F.view);
  if (regionCanvas) drawImg(regionCanvas, F.region);
  const ps = pixScale();
  if (hasFrame()) {
    const hN = F.N / 2, hM = F.M / 2;
    if (maskCanvas) {
      const [sx, sy] = w2s(F.cx - hN, F.cy + hN);
      ctx.drawImage(maskCanvas, sx, sy, F.N * cam.zoom, F.N * cam.zoom);
    }
    const sq = (half) => () => { const [a, b] = w2s(F.cx - half, F.cy + half); ctx.rect(a, b, 2 * half * cam.zoom, 2 * half * cam.zoom); };
    haloPath(sq(hN), { width: 1.5 });
    haloPath(sq(hM), { width: 1.5, dash: [7, 4] });
    for (const [hx, cls] of [[hN, "N"], [hM, "M"]]) {
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const [a, b] = w2s(F.cx + dx * hx, F.cy + dy * hx);
        ctx.fillStyle = cls === "N" ? "#000" : "#fff"; ctx.strokeStyle = cls === "N" ? "#fff" : "#000";
        ctx.fillRect(a - 4, b - 4, 8, 8); ctx.strokeRect(a - 4.5, b - 4.5, 9, 9);
      }
    }
    const [nx, ny] = w2s(F.cx - hN, F.cy + hN);
    tag(`frame ${F.N} px${ps ? ` · ${(F.N * ps).toFixed(1)}″` : ""}`, nx, ny - 3, { inverse: true });
    const [mx, my] = w2s(F.cx - hM, F.cy + hM);
    tag(`cutout ${F.M} px${ps ? ` · ${(F.M * ps).toFixed(1)}″` : ""}`, mx, my - 3);
  }
  for (const s of F.shapes) {
    const [sx, sy] = w2s(s.x, s.y);
    const r = s.r * cam.zoom;
    const dash = s.kind === "hole" ? [4, 3] : s.kind === "thetaE" ? [1.5, 3] : [];
    haloPath(() => ctx.arc(sx, sy, r, 0, 2 * Math.PI), { dash, width: s === F.sel ? 2.5 : 1.5 });
    if (s.kind === "hole") haloPath(() => { const q = r * 0.5; ctx.moveTo(sx - q, sy - q); ctx.lineTo(sx + q, sy + q); ctx.moveTo(sx + q, sy - q); ctx.lineTo(sx - q, sy + q); }, { width: 1 });
    if (s === F.sel || s.kind === "thetaE") {
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#000";
      ctx.fillRect(sx + r - 4, sy - 4, 8, 8); ctx.strokeRect(sx + r - 4.5, sy - 4.5, 9, 9);
    }
    if (s.kind === "thetaE") tag(`θE ${ps ? (s.r * ps).toFixed(2) + "″" : s.r.toFixed(1) + " px"}`, sx + r * 0.72 + 6, sy - r * 0.72);
    else if (s === F.sel) tag(s.kind === "aperture" ? "likelihood aperture" : `hole · ${s.applies || "both"}`, sx + r * 0.72 + 6, sy - r * 0.72);
  }
  for (const q of F.qso) {
    const [sx, sy] = w2s(q.x, q.y);
    haloPath(() => { ctx.moveTo(sx - 9, sy); ctx.lineTo(sx - 3, sy); ctx.moveTo(sx + 3, sy); ctx.lineTo(sx + 9, sy); ctx.moveTo(sx, sy - 9); ctx.lineTo(sx, sy - 3); ctx.moveTo(sx, sy + 3); ctx.lineTo(sx, sy + 9); }, { width: q === F.sel ? 2.4 : 1.5 });
    tag(q.label, sx + 8, sy - 6, { inverse: true });
  }
  if (store.perturbers && hasFrame()) {
    const c0 = F.cx - (F.N - 1) / 2, r0 = F.cy - (F.N - 1) / 2;
    for (const p of store.perturbers.perturbers) {
      const [sx, sy] = w2s(c0 + p.pixel_xy[0], r0 + p.pixel_xy[1]);
      haloPath(() => { for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 4; ctx.moveTo(sx - 8 * Math.cos(a), sy - 8 * Math.sin(a)); ctx.lineTo(sx + 8 * Math.cos(a), sy + 8 * Math.sin(a)); } }, { width: p === F.sel ? 2.4 : 1.3 });
      tag(`pert ${p.id}`, sx + 8, sy - 6);
    }
  }
  if (F.lens) {
    const [sx, sy] = w2s(F.lens.x, F.lens.y);
    haloPath(() => { ctx.arc(sx, sy, 6, 0, 2 * Math.PI); ctx.moveTo(sx - 13, sy); ctx.lineTo(sx - 6, sy); ctx.moveTo(sx + 6, sy); ctx.lineTo(sx + 13, sy); ctx.moveTo(sx, sy - 13); ctx.lineTo(sx, sy - 6); ctx.moveTo(sx, sy + 6); ctx.lineTo(sx, sy + 13); }, { width: F.sel === "lens" ? 2.4 : 1.5 });
  }
}

function fitView(target) {
  if (!F.view) return;
  cam.user = false; cam.fit = target;
  let x0, x1, y0, y1;
  if (target === "frame" && hasFrame()) {
    const hN = F.N / 2;
    x0 = F.cx - hN; x1 = F.cx + hN; y0 = F.cy - hN; y1 = F.cy + hN;
  } else {
    x0 = -0.5; x1 = F.view.cols * F.view.f - 0.5; y0 = -0.5; y1 = F.view.rows * F.view.f - 0.5;
  }
  // room for the labels above the frame
  cam.zoom = Math.min((W - 24) / (x1 - x0), (H - 44) / (y1 - y0));
  cam.x = (x0 + x1) / 2; cam.y = (y0 + y1) / 2 + 10 / cam.zoom;
  draw();
}

function zoomAt(factor, sx = W / 2, sy = H / 2) {
  const [wx, wy] = s2w(sx, sy);
  cam.zoom = Math.min(64, Math.max(0.002, cam.zoom * factor));
  cam.user = true;
  cam.x = wx - (sx - W / 2) / cam.zoom;
  cam.y = wy + (sy - H / 2) / cam.zoom;
  draw();
}

function resize() {
  if (!wrap) return;
  const r = wrap.getBoundingClientRect();
  W = Math.max(200, r.width);
  H = Math.max(260, Math.min(window.innerHeight * 0.72, W * 0.82));
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  if (!cam.user) fitView(cam.fit); else draw();
}

// canvas position (CSS px, relative to the canvas) of image pixel (x, y); for tests
export function toScreen(x, y) { return w2s(x, y); }

// ---------------------------------------------------------------- values
function valueAt(x, y) {
  const xi = Math.round(x), yi = Math.round(y);
  for (const img of [F.region, F.view]) {
    if (!img) continue;
    const c = Math.floor((xi - img.ox + 0.5) / img.f), r = Math.floor((yi - img.oy + 0.5) / img.f);
    if (c >= 0 && r >= 0 && c < img.cols && r < img.rows) return img.data[r * img.cols + c];
  }
  return NaN;
}

function median(a) {
  const s = Float64Array.from(a).sort();
  return s.length ? s[s.length >> 1] : 0;
}

// Light-weighted centroid near (x, y): brightest pixel in a 7x7 box, then iterated
// first moments of the background-subtracted light in a 15x15 box.
async function centroid(x, y) {
  const hdu = F.hdus[F.sci];
  let cx = Math.round(x), cy = Math.round(y);
  const box = async (bx, by, b) => ({ d: await readRegion(F.file, hdu, by - b, by + b + 1, bx - b, bx + b + 1), n: 2 * b + 1 });
  let { d, n } = await box(cx, cy, 3);
  let best = -Infinity, bi = -1;
  d.forEach((v, i) => { if (v > best) { best = v; bi = i; } });
  if (bi >= 0) { cx += (bi % n) - 3; cy += Math.floor(bi / n) - 3; }
  let fx = cx, fy = cy;
  for (let it = 0; it < 4; it++) {
    ({ d, n } = await box(Math.round(fx), Math.round(fy), 7));
    const fin = [...d].filter((v) => v === v);
    if (!fin.length) break;
    const bg = median(fin);
    let s = 0, sx = 0, sy = 0;
    for (let i = 0; i < d.length; i++) {
      const v = d[i] - bg;
      if (!(v > 0)) continue;
      s += v; sx += v * (i % n); sy += v * Math.floor(i / n);
    }
    if (!(s > 0)) break;
    const nx = Math.round(fx) - 7 + sx / s, ny = Math.round(fy) - 7 + sy / s;
    const moved = Math.hypot(nx - fx, ny - fy);
    fx = nx; fy = ny;
    if (moved < 0.01) break;
  }
  return Math.hypot(fx - x, fy - y) < 8 ? [fx, fy] : [x, y];
}

async function setLens(x, y, refine = true) {
  let [lx, ly] = [x, y];
  if (refine && ui.refine.checked) {
    try { [lx, ly] = await centroid(x, y); } catch (e) { console.warn(e); }
  }
  F.lens = { x: lx, y: ly };
  const first = F.cx === null;
  F.cx = Math.round(lx); F.cy = Math.round(ly);
  clampFrame();
  const hdu = F.hdus[F.sci];
  const fitN = 2 * Math.min(F.cx, F.cy, hdu.cols - 1 - F.cx, hdu.rows - 1 - F.cy) + 1;
  let note = "";
  if (F.N > fitN && fitN >= 15) {
    F.N = fitN; clampFrame(); drawSizes();
    note = ` · frame reduced to ${F.N} px to stay inside the image`;
  }
  const th = F.shapes.find((s) => s.kind === "thetaE");
  if (th) { th.x = lx; th.y = ly; }
  await ensureRegion();
  if (first || F.view.f === 1) computeLevels();
  rebuildImages();
  if (first) fitView("frame"); else draw();
  syncConfig();
  const ps = pixScale();
  toast(`Lens at x ${lx.toFixed(2)}, y ${ly.toFixed(2)} px${refine && ui.refine.checked ? " (centroid)" : ""} → LENS_POSITION (${((lx - F.cx) * ps).toFixed(4)}, ${((ly - F.cy) * ps).toFixed(4)})″${note}`);
  if (F.tool === "lens") setTool("move");
}

function clampFrame() {
  const hdu = F.hdus[F.sci];
  if (!hdu || F.cx === null) return;
  F.N = odd(Math.max(15, Math.min(F.N, 4001)));
  F.M = odd(Math.max(11, Math.min(F.M, F.N)));
  // the frame may stick out of the image (padded, masked); keep its centre on the image
  F.cx = Math.min(hdu.cols - 1, Math.max(0, F.cx));
  F.cy = Math.min(hdu.rows - 1, Math.max(0, F.cy));
}

// ---------------------------------------------------------------- config sync
function syncConfig() {
  if (!F.view) return;
  const ps = pixScale();
  const entries = [["data.likelihood_mask_path", "data/mask_likelihood.fits"], ["light.lens.refit.mask_path", "data/mask_lens_only.fits"]];
  if (hasFrame()) entries.push(["data.cutout_size", F.M]);
  const th = F.shapes.find((s) => s.kind === "thetaE");
  if (th && ps) {
    const cur = get("mass.main.theta_E_prior") || {};
    entries.push(["mass.main.theta_E_prior", { center: +(th.r * ps).toFixed(3), sigma: cur.sigma ?? 10.0 }]);
  }
  setMany(entries, "fits");
  if (hasFrame() && ps) {
    const ref = F.lens || { x: F.cx, y: F.cy };
    setRun("LENS_POSITION", [+((ref.x - F.cx) * ps).toFixed(4), +((ref.y - F.cy) * ps).toFixed(4)]);
    if (F.qso.length) {
      const P = {};
      for (const q of [...F.qso].sort((a, b) => a.label.localeCompare(b.label))) P[q.label] = [+((q.x - F.cx) * ps).toFixed(3), +((q.y - F.cy) * ps).toFixed(3)];
      setRun("IMAGE_POSITIONS", P);
    }
  }
  if (store.perturbers && hasFrame()) {
    store.perturbers.target.npix = F.N;
    if (ps) store.perturbers.target.pix_scale_arcsec = ps;
    emit("perturbers");
  }
  drawInfo();
}

// ---------------------------------------------------------------- export
function sigmaClippedMedian(vals, nsig = 3, iters = 5) {
  let v = Float64Array.from(vals).sort();
  for (let it = 0; it < iters && v.length > 10; it++) {
    const med = v[v.length >> 1];
    let ss = 0;
    for (const x of v) ss += (x - med) ** 2;
    const sd = Math.sqrt(ss / v.length);
    const nv = v.filter((x) => Math.abs(x - med) <= nsig * sd);
    if (nv.length === v.length) break;
    v = nv;
  }
  return v.length ? v[v.length >> 1] : 0;
}

// Build the four input files from the full-resolution data of the file.
export async function buildFitsProducts() {
  if (!hasFrame()) throw new Error("load a FITS file and click the lens first");
  const N = F.N, M = F.M, ps = pixScale();
  const c0 = F.cx - (N - 1) / 2, r0 = F.cy - (N - 1) / 2;
  const hdu = F.hdus[F.sci];
  const sci = Float64Array.from(await readRegion(F.file, hdu, r0, r0 + N, c0, c0 + N));
  const err = F.err >= 0 ? Float64Array.from(await readRegion(F.file, F.hdus[F.err], r0, r0 + N, c0, c0 + N)) : null;
  const conv = F.convert && F.photmjsr > 0 ? F.photmjsr : 1;
  const bad = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) {
    sci[i] /= conv;
    if (err) err[i] /= conv;
    bad[i] = !Number.isFinite(sci[i]) || (err && !(Number.isFinite(err[i]) && err[i] > 0)) ? 1 : 0;
  }
  const { refit, like } = computeMasks(bad);
  let sky = 0;
  if (F.skysub) {
    const rr = ((M - 1) / 2) ** 2, half = (N - 1) / 2, vals = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const k = i * N + j;
      if (refit[k] && (i - half) ** 2 + (j - half) ** 2 > rr) vals.push(sci[k]);
    }
    if (vals.length > 50) sky = sigmaClippedMedian(vals);
  }
  let maxErr = 0, nbad = 0;
  for (let i = 0; i < N * N; i++) {
    if (bad[i]) { nbad++; continue; }
    sci[i] -= sky;
    if (err && err[i] > maxErr) maxErr = err[i];
  }
  for (let i = 0; i < N * N; i++) if (bad[i]) { sci[i] = 0; if (err) err[i] = 1e6 * (maxErr || 1); }

  const lens = F.lens || { x: F.cx, y: F.cy };
  const cards = [
    ...cropCards([hdu, F.hdus[0]], c0, r0, { bunit: conv !== 1 ? "DN/s" : undefined }),
    ps ? formatCard("PIXSCALE", ps, "arcsec/pixel (ALPACA data.pix_scale)", true) : null,
    formatCard("CUTOUT", M, "ALPACA data.cutout_size (px)"),
    ps ? formatCard("LENSDX", +((lens.x - F.cx) * ps).toFixed(5), "lens - frame centre, arcsec (x = column)", true) : null,
    ps ? formatCard("LENSDY", +((lens.y - F.cy) * ps).toFixed(5), "lens - frame centre, arcsec (y = row)", true) : null,
    formatCard("SKYSUB", sky, conv !== 1 ? "sky subtracted (DN/s)" : "sky subtracted", true),
    conv !== 1 ? formatCard("PHOTCONV", conv, "divided by PHOTMJSR (MJy/sr -> DN/s)", true) : null,
    commentCard("HISTORY", ` ALPACA configurator: ${N}x${N} frame of ${F.name.slice(0, 30)}[${F.sci}]`),
    commentCard("HISTORY", ` origin x=${c0} y=${r0} (0-based); bad pixels: image 0, noise 1e6*max`),
  ].filter(Boolean);
  const files = {
    "image.fits": writeFits(sci, N, N, { bitpix: -64, cards }),
    "mask_likelihood.fits": writeFits(like, M, M, { bitpix: F.maskBits, cards: [commentCard("COMMENT", " 1 = pixel used in the likelihood (ALPACA data.likelihood_mask_path)")] }),
    "mask_lens_only.fits": writeFits(refit, N, N, { bitpix: F.maskBits, cards: [commentCard("COMMENT", " 1 = pixel used in the lens-light refit (light.lens.refit.mask_path)")] }),
  };
  if (err) files["noise_map.fits"] = writeFits(err, N, N, { bitpix: -64, cards });
  const notes = [`${N}×${N} frame, cutout ${M}`, `${nbad} bad pixel(s)`];
  if (F.skysub) notes.push(`sky ${fmt(sky, 3)} subtracted`);
  if (conv !== 1) notes.push(`÷ PHOTMJSR ${fmt(conv, 4)}`);
  if (!err) notes.push("no noise map (no ERR extension chosen)");
  return { files, notes };
}

async function exportOne(name) {
  try {
    const { files, notes } = await buildFitsProducts();
    if (!files[name]) throw new Error(`${name} needs an ERR extension`);
    download(name, files[name], "application/fits");
    toast(`${name}: ${notes.join(" · ")}`);
  } catch (e) { toast(e.message, "bad"); }
}

async function exportZip() {
  try {
    const { zipSync } = await import("../vendor/fflate.js");
    const { files, notes } = await buildFitsProducts();
    const z = {};
    for (const [k, v] of Object.entries(files)) z["data/" + k] = v;
    download("alpaca_data.zip", zipSync(z, { level: 6 }), "application/zip");
    toast(notes.join(" · "));
  } catch (e) { toast(e.message, "bad"); }
}

// ---------------------------------------------------------------- interaction
const HIT = 8;
function hitTest(sx, sy) {
  const near = (wx, wy, tol = HIT) => { const [a, b] = w2s(wx, wy); return Math.hypot(a - sx, b - sy) <= tol; };
  if (F.lens && near(F.lens.x, F.lens.y, 9)) return { type: "lens" };
  for (const q of F.qso) if (near(q.x, q.y, 9)) return { type: "qso", obj: q };
  if (store.perturbers && hasFrame()) {
    const c0 = F.cx - (F.N - 1) / 2, r0 = F.cy - (F.N - 1) / 2;
    for (const p of store.perturbers.perturbers) if (near(c0 + p.pixel_xy[0], r0 + p.pixel_xy[1], 9)) return { type: "pert", obj: p };
  }
  const order = [...F.shapes].sort((a, b) => (a === F.sel ? -1 : b === F.sel ? 1 : a.r - b.r));
  for (const s of order) {
    const [a, b] = w2s(s.x, s.y);
    const d = Math.hypot(a - sx, b - sy), r = s.r * cam.zoom;
    if (Math.abs(sx - (a + r)) <= 6 && Math.abs(sy - b) <= 6) return { type: "resize", obj: s };
    if (Math.abs(d - r) <= 5) return { type: "resize", obj: s };
  }
  if (hasFrame()) {
    for (const [hx, which] of [[F.M / 2, "M"], [F.N / 2, "N"]]) {
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) if (near(F.cx + dx * hx, F.cy + dy * hx, 8)) return { type: "size", which };
    }
  }
  for (const s of order) {
    const [a, b] = w2s(s.x, s.y);
    if (s.kind !== "thetaE" && Math.hypot(a - sx, b - sy) < s.r * cam.zoom) return { type: "move", obj: s };
  }
  if (hasFrame()) {
    const [wx, wy] = s2w(sx, sy);
    const dN = Math.max(Math.abs(wx - F.cx), Math.abs(wy - F.cy)) - F.N / 2;
    if (Math.abs(dN * cam.zoom) <= 5) return { type: "frame" };
  }
  return null;
}

let drag = null;
const pointers = new Map();

function onDown(e) {
  if (!F.view) return;
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, [e.offsetX, e.offsetY]);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    drag = { type: "pinch", d0: Math.hypot(a[0] - b[0], a[1] - b[1]), z0: cam.zoom };
    return;
  }
  const sx = e.offsetX, sy = e.offsetY;
  const [wx, wy] = s2w(sx, sy);
  canvas.focus({ preventScroll: true });
  let hit = hitTest(sx, sy);
  // with a drawing tool, clicks inside shapes or on the frame edge draw instead of moving
  const keep = { lens: ["lens"], qso: ["qso"], pert: ["pert"] }[F.tool] || [];
  if (hit && F.tool !== "move" && !["resize", "size", ...keep].includes(hit.type)) hit = null;
  if (hit && e.button !== 1) {
    drag = { ...hit, sx, sy, wx, wy, cx: F.cx, cy: F.cy, moved: false };
    if (hit.obj) { drag.ox = hit.obj.x ?? hit.obj.pixel_xy?.[0]; drag.oy = hit.obj.y ?? hit.obj.pixel_xy?.[1]; }
    if (hit.type === "lens") { drag.ox = F.lens.x; drag.oy = F.lens.y; F.sel = "lens"; }
    else if (hit.obj) F.sel = hit.obj;
    drawSelection(); draw();
    return;
  }
  const t = e.button === 1 ? "move" : F.tool;
  if (t === "move") { drag = { type: "pan", sx, sy, camx: cam.x, camy: cam.y, moved: false }; F.sel = null; drawSelection(); draw(); return; }
  if (t === "lens") { drag = { type: "click-lens", sx, sy, wx, wy }; return; }
  if (t === "aperture" || t === "hole") {
    if (!hasFrame()) return toast("Click the lens first (⊕).");
    const s = { id: F.nextId++, kind: t, x: wx, y: wy, r: 0, applies: "both" };
    F.shapes.push(s); F.sel = s;
    drag = { type: "draw", obj: s, sx, sy, moved: false };
    draw(); return;
  }
  if (t === "thetaE") {
    if (!hasFrame()) return toast("Click the lens first (⊕).");
    const c = F.lens || { x: F.cx, y: F.cy };
    let s = F.shapes.find((x) => x.kind === "thetaE");
    if (!s) { s = { id: F.nextId++, kind: "thetaE", x: c.x, y: c.y, r: 1 }; F.shapes.push(s); }
    s.r = Math.max(1, Math.hypot(wx - s.x, wy - s.y));
    F.sel = s;
    drag = { type: "resize", obj: s, moved: true };
    draw(); return;
  }
  if (t === "qso") {
    if (!hasFrame()) return toast("Click the lens first (⊕).");
    const used = new Set(F.qso.map((q) => q.label));
    const label = [...LABELS].find((l) => !used.has(l));
    if (!label) return toast("Six images is the maximum.");
    const q = { label, x: wx, y: wy };
    F.qso.push(q); F.sel = q;
    drag = { type: "qso", obj: q, sx, sy, ox: wx, oy: wy, wx, wy, moved: false };
    drawSelection(); draw(); syncConfig(); return;
  }
  if (t === "pert") {
    if (!hasFrame()) return toast("Click the lens first (⊕).");
    const c0 = F.cx - (F.N - 1) / 2, r0 = F.cy - (F.N - 1) / 2;
    const id = addPerturber(wx - c0, wy - r0);
    store.perturbers.target.npix = F.N;
    if (pixScale()) store.perturbers.target.pix_scale_arcsec = pixScale();
    toast(`Perturber ${id} added — set its redshift and θE in Delays & perturbers`);
    emit("perturbers"); draw();
  }
}

function onMove(e) {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [e.offsetX, e.offsetY]);
  const sx = e.offsetX, sy = e.offsetY;
  const [wx, wy] = s2w(sx, sy);
  if (F.view) {
    const v = valueAt(wx, wy);
    const ps = pixScale();
    const ref = F.lens || (hasFrame() ? { x: F.cx, y: F.cy } : null);
    ui.readout.textContent = `x ${wx.toFixed(1)}  y ${wy.toFixed(1)}  ·  ${Number.isFinite(v) ? fmt(v, 4) : "—"}` +
      (ref && ps ? `  ·  ${(Math.hypot(wx - ref.x, wy - ref.y) * ps).toFixed(2)}″ from the ${F.lens ? "lens" : "centre"}` : "");
  }
  if (!drag) {
    if (F.view) {
      const hit = hitTest(sx, sy);
      canvas.style.cursor = hit ? (hit.type === "resize" || hit.type === "size" ? "nwse-resize" : "move") : F.tool === "move" ? "grab" : "crosshair";
    }
    return;
  }
  drag.moved = drag.moved || Math.hypot(sx - (drag.sx ?? sx), sy - (drag.sy ?? sy)) > 3;
  switch (drag.type) {
    case "pinch": {
      const [a, b] = [...pointers.values()];
      cam.zoom = Math.min(64, Math.max(0.002, drag.z0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / drag.d0));
      cam.user = true;
      break;
    }
    case "pan":
      cam.user = true;
      cam.x = drag.camx - (sx - drag.sx) / cam.zoom;
      cam.y = drag.camy + (sy - drag.sy) / cam.zoom;
      break;
    case "draw":
    case "resize":
      drag.obj.r = Math.max(0.5, Math.hypot(wx - drag.obj.x, wy - drag.obj.y));
      break;
    case "move":
    case "qso":
      drag.obj.x = drag.ox + (wx - drag.wx);
      drag.obj.y = drag.oy + (wy - drag.wy);
      break;
    case "pert":
      drag.obj.pixel_xy = [+(drag.ox + (wx - drag.wx)).toFixed(2), +(drag.oy + (wy - drag.wy)).toFixed(2)];
      break;
    case "lens":
      F.lens = { x: drag.ox + (wx - drag.wx), y: drag.oy + (wy - drag.wy) };
      break;
    case "frame":
      F.cx = Math.round(drag.cx + (wx - drag.wx));
      F.cy = Math.round(drag.cy + (wy - drag.wy));
      clampFrame();
      break;
    case "size": {
      const half = Math.max(Math.abs(wx - F.cx), Math.abs(wy - F.cy));
      if (drag.which === "N") F.N = odd(2 * half); else F.M = odd(2 * half);
      if (drag.which === "N" && F.M > F.N) F.M = F.N;
      clampFrame();
      drawSizes();
      break;
    }
  }
  draw();
}

async function onUp(e) {
  pointers.delete(e.pointerId);
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.type === "click-lens") { if (Math.hypot(e.offsetX - d.sx, e.offsetY - d.sy) < 6) await setLens(d.wx, d.wy); return; }
  if (d.type === "draw" && !d.moved) {
    // a click: a sensible default size
    d.obj.r = d.obj.kind === "aperture" ? (F.M - 1) / 2 * 0.9 : Math.max(4, F.M / 30);
  }
  if (d.type === "draw" && d.obj.r < 1) d.obj.r = 1;
  if (d.type === "lens" && d.moved) {
    F.cx = Math.round(F.lens.x); F.cy = Math.round(F.lens.y); clampFrame();
  }
  if (["frame", "size", "lens"].includes(d.type)) await ensureRegion();
  if (d.type === "pert") emit("perturbers");
  if (d.type !== "pan" && d.type !== "pinch") { rebuildMask(); syncConfig(); }
  drawSelection(); drawSizes(); drawShapes(); draw();
}

function onWheel(e) {
  if (!F.view) return;
  e.preventDefault();
  zoomAt(Math.exp(-e.deltaY * 0.0015), e.offsetX, e.offsetY);
}

function deleteSelected() {
  const s = F.sel;
  if (!s) return;
  if (s === "lens") return;
  if (F.shapes.includes(s)) F.shapes.splice(F.shapes.indexOf(s), 1);
  else if (F.qso.includes(s)) { F.qso.splice(F.qso.indexOf(s), 1); if (!F.qso.length) setRun("IMAGE_POSITIONS", null); }
  else if (store.perturbers?.perturbers.includes(s)) { store.perturbers.perturbers.splice(store.perturbers.perturbers.indexOf(s), 1); emit("perturbers"); }
  F.sel = null;
  rebuildMask(); syncConfig(); drawSelection(); drawShapes(); draw();
}

// ---------------------------------------------------------------- panels
const TOOLS = [
  ["move", "✥", "Move / select", "V"],
  ["lens", "⊕", "Lens centre", "L"],
  ["aperture", "◯", "Likelihood aperture", "A"],
  ["hole", "⊘", "Mask hole", "H"],
  ["thetaE", "θ", "Einstein radius", "E"],
  ["qso", "★", "Quasar image", "Q"],
  ["pert", "✦", "Perturber", "P"],
];
const TOOL_HELP = {
  move: "Drag to pan, wheel or pinch to zoom. Drag shapes, corners and the frame edge.",
  lens: "Click on the lens galaxy. The centroid is refined, the frame centred on it.",
  aperture: "Press and drag: the circle of pixels the model is fitted to. Click for a default size.",
  hole: "Press and drag over a neighbour, a star or an artefact: those pixels are left out.",
  thetaE: "Drag out to the ring / the quasar images: sets the Einstein-radius guess.",
  qso: "Click each quasar image in the order of its published label (A, B, C, D).",
  pert: "Click a nearby galaxy that may deflect the light: adds it to the perturber catalogue.",
};

function setTool(t) {
  F.tool = t;
  if (ui.tools) for (const b of ui.tools.children) b.classList.toggle("on", b.dataset.tool === t);
  if (ui.help) ui.help.textContent = TOOL_HELP[t];
  if (canvas) canvas.style.cursor = t === "move" ? "grab" : "crosshair";
}

function drawHduChips() {
  ui.hdus.replaceChildren();
  const label = (u) => `${u.index} ${u.extname || u.xtension}${u.isImage ? ` ${u.cols}×${u.rows}` : u.dims.length ? ` ${u.xtension.toLowerCase()}` : " (empty)"}`;
  const sel = (name, cur, allowNone, onPick) => {
    const s = h("select", { class: "btn small cf-select", "aria-label": name },
      allowNone ? h("option", { value: -1 }, "none") : null,
      F.hdus.filter((u) => u.isImage).map((u) => h("option", { value: u.index }, label(u))));
    s.value = cur;
    s.addEventListener("change", () => onPick(+s.value));
    return s;
  };
  ui.hdus.append(
    h("label", {}, h("span", { class: "muted small" }, "image HDU"), sel("image HDU", F.sci, false, async (v) => { F.sci = v; F.lens = null; F.cx = null; await loadSci(); })),
    h("label", {}, h("span", { class: "muted small" }, "noise (ERR) HDU"), sel("noise HDU", F.err, true, (v) => { F.err = v; drawInfo(); })),
    h("span", { class: "muted small" }, `${F.hdus.length} HDU${F.hdus.length > 1 ? "s" : ""}: ${F.hdus.map(label).join(" · ")}`));
}

function drawInfo() {
  if (!ui.info) return;
  const hdu = F.hdus[F.sci];
  const ph = F.hdus[0]?.header || {};
  const hd = hdu?.header || {};
  const rows = [];
  rows.push(["file", F.name]);
  if (hdu) rows.push(["image", `${hdu.cols} × ${hdu.rows} px, BITPIX ${hdu.bitpix}${F.view && F.view.f > 1 ? `, shown ${F.view.f}× binned` : ""}`]);
  const inst = [hd.TELESCOP ?? ph.TELESCOP, hd.INSTRUME ?? ph.INSTRUME, hd.FILTER ?? ph.FILTER, hd.PUPIL ?? ph.PUPIL].filter((x) => x && x !== "CLEAR").join(" · ");
  if (inst) rows.push(["instrument", inst]);
  rows.push(["pixel scale", F.pix ? `${F.pix.scale.toFixed(6)}″ (from ${F.pix.source}) → data.pix_scale` : "not in the header — set data.pix_scale by hand"]);
  rows.push(["units", F.bunit || "BUNIT not set"]);
  if (F.photmjsr) rows.push(["PHOTMJSR", `${fmt(F.photmjsr, 6)} (MJy/sr per DN/s)`]);
  rows.push(["noise map", F.err >= 0 ? `from HDU ${F.err} (${F.hdus[F.err].extname})` : "none chosen — noise_map.fits will not be written"]);
  if (hasFrame()) {
    const ps = pixScale();
    const lp = store.run.LENS_POSITION;
    rows.push(["frame", `${F.N} px centred on x ${F.cx}, y ${F.cy}${ps ? ` (${(F.N * ps).toFixed(2)}″)` : ""}`]);
    rows.push(["cutout", `${F.M} px${ps ? ` (${(F.M * ps).toFixed(2)}″)` : ""} → data.cutout_size`]);
    if (F.lens) rows.push(["LENS_POSITION", `(${lp[0]}, ${lp[1]})″`]);
  }
  ui.info.replaceChildren(...rows.map(([k, v]) => h("div", { class: "cf-kv" }, h("span", { class: "muted small" }, k), h("span", {}, v))));
  ui.convert.parentElement.hidden = !F.photmjsr;
  ui.convert.checked = F.convert;
  ui.convertLbl.textContent = F.photmjsr ? `Divide image and noise by PHOTMJSR = ${fmt(F.photmjsr, 5)} (MJy/sr → DN/s, as in the tutorials)` : "";
}

function drawSizes() {
  if (!ui.nRange) return;
  const hdu = F.hdus[F.sci];
  const maxN = hdu ? odd(Math.min(2001, Math.max(hdu.rows, hdu.cols))) : 1001;
  ui.nRange.max = maxN; ui.mRange.max = F.N || 501;
  ui.nRange.value = F.N; ui.mRange.value = F.M;
  if (document.activeElement !== ui.nNum) ui.nNum.value = F.N;
  if (document.activeElement !== ui.mNum) ui.mNum.value = F.M;
  const ps = pixScale();
  ui.nArc.textContent = ps ? `${(F.N * ps).toFixed(2)}″` : "";
  ui.mArc.textContent = ps ? `${(F.M * ps).toFixed(2)}″` : "";
}

function drawShapes() {
  if (!ui.shapes) return;
  ui.shapes.replaceChildren();
  const ps = pixScale();
  const items = [
    ...F.shapes.map((s) => [s, s.kind === "aperture" ? "◯ aperture" : s.kind === "hole" ? "⊘ hole" : "θ Einstein radius", `r ${s.r.toFixed(1)} px${ps ? ` = ${(s.r * ps).toFixed(2)}″` : ""}`]),
    ...F.qso.map((q) => [q, `★ image ${q.label}`, ps && hasFrame() ? `(${((q.x - F.cx) * ps).toFixed(3)}, ${((q.y - F.cy) * ps).toFixed(3)})″` : ""]),
  ];
  if (!items.length) { ui.shapes.append(h("p", { class: "muted small" }, "No shapes yet. Without an aperture the whole cutout is fitted.")); return; }
  for (const [obj, name, desc] of items) {
    const b = h("button", { class: "cf-shape" + (obj === F.sel ? " on" : ""), type: "button" }, h("span", {}, name), h("span", { class: "muted small" }, desc));
    b.addEventListener("click", () => { F.sel = obj; drawSelection(); drawShapes(); draw(); });
    ui.shapes.append(b);
  }
}

function drawSelection() {
  if (!ui.sel) return;
  const s = F.sel;
  ui.sel.replaceChildren();
  if (!s || s === "lens") { ui.sel.hidden = true; return; }
  ui.sel.hidden = false;
  const num = (label, get_, set_, step = 0.1) => {
    const inp = h("input", { type: "number", class: "cf-num", step, value: +get_().toFixed(2) });
    inp.addEventListener("change", () => { set_(+inp.value); rebuildMask(); syncConfig(); drawShapes(); draw(); });
    return h("label", {}, h("span", { class: "muted small" }, label), inp);
  };
  const del = h("button", { class: "btn small", type: "button" }, "Delete");
  del.addEventListener("click", deleteSelected);
  if (F.shapes.includes(s)) {
    ui.sel.append(num("x", () => s.x, (v) => { s.x = v; }), num("y", () => s.y, (v) => { s.y = v; }), num("r px", () => s.r, (v) => { s.r = Math.max(0.5, v); }));
    if (s.kind === "hole") {
      const seg = h("div", { class: "chips" }, ["both", "likelihood", "refit"].map((a) => {
        const b = h("button", { class: "chip" + ((s.applies || "both") === a ? " on" : ""), type: "button" }, a === "both" ? "both masks" : a === "likelihood" ? "likelihood only" : "refit only");
        b.addEventListener("click", () => { s.applies = a; rebuildMask(); drawSelection(); draw(); });
        return b;
      }));
      ui.sel.append(seg);
    }
  } else if (F.qso.includes(s)) {
    const lab = h("select", { class: "btn small cf-select" }, [...LABELS].map((l) => h("option", { value: l }, l)));
    lab.value = s.label;
    lab.addEventListener("change", () => {
      const other = F.qso.find((q) => q !== s && q.label === lab.value);
      if (other) other.label = s.label;
      s.label = lab.value; syncConfig(); drawShapes(); draw();
    });
    ui.sel.append(h("label", {}, h("span", { class: "muted small" }, "label"), lab), num("x", () => s.x, (v) => { s.x = v; }), num("y", () => s.y, (v) => { s.y = v; }));
  } else {
    ui.sel.append(h("span", { class: "small" }, `perturber ${s.id} — edit it in Delays & perturbers`));
  }
  ui.sel.append(del);
}

// A mock lens to play with: lens galaxy, a lensed source, four quasar images, a neighbour.
function mockLens() {
  const n = 301, ps = 0.031228698402951588, c = 150.3, d = 149.6;
  const tE = 1.1, g1 = 0.06, g2 = 0.035;
  const sci = new Float32Array(n * n), err = new Float32Array(n * n);
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const beta = (x, y) => { const r = Math.hypot(x, y) + 1e-9; return [x - tE * x / r - (g1 * x + g2 * y), y - tE * y / r - (g2 * x - g1 * y)]; };
  const qs = [0.035, 0.02];
  const dmap = new Float32Array(n * n);
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
    const x = (k - c) * ps, y = (r - d) * ps;
    const q = 0.8, rr = Math.hypot(x, y / q);
    let v = 2.2 * Math.exp(-7.67 * ((rr / 0.8) ** 0.25 - 1));                     // de Vaucouleurs lens
    const [bx, by] = beta(x, y);
    v += 1.4 * Math.exp(-(((bx + 0.12) ** 2 + (by - 0.08) ** 2) / (2 * 0.09 ** 2))); // host galaxy
    v += 3.0 * Math.exp(-(((x - 2.3) ** 2 + (y - 1.5) ** 2) / (2 * 0.18 ** 2)));   // neighbour
    dmap[r * n + k] = Math.hypot(bx - qs[0], by - qs[1]);
    sci[r * n + k] = v;
  }
  for (let r = 1; r < n - 1; r++) for (let k = 1; k < n - 1; k++) {
    const i = r * n + k, v = dmap[i];
    if (v < 0.02 && v <= dmap[i - 1] && v <= dmap[i + 1] && v <= dmap[i - n] && v <= dmap[i + n]) {
      for (let rr = -6; rr <= 6; rr++) for (let kk = -6; kk <= 6; kk++) sci[i + rr * n + kk] += 60 * Math.exp(-(rr * rr + kk * kk) / (2 * 1.3 ** 2));
    }
  }
  for (let i = 0; i < n * n; i++) { const s = Math.sqrt(0.02 ** 2 + Math.max(0, sci[i]) * 0.002); err[i] = s; sci[i] += s * gauss() + 0.05; }
  const wcs = [formatCard("CRPIX1", 151.0, "", true), formatCard("CRPIX2", 151.0, "", true), formatCard("CRVAL1", 150.0, "", true), formatCard("CRVAL2", 2.0, "", true),
    formatCard("CTYPE1", "RA---TAN"), formatCard("CTYPE2", "DEC--TAN"), formatCard("CD1_1", -ps / 3600, "", true), formatCard("CD1_2", 0.0, "", true),
    formatCard("CD2_1", 0.0, "", true), formatCard("CD2_2", ps / 3600, "", true), formatCard("BUNIT", "MJy/sr"), formatCard("PHOTMJSR", 1.0, "", true)];
  const ext = (data, name, extra) => {
    const u8 = writeFits(data, n, n, { bitpix: -32, cards: [formatCard("EXTNAME", name), ...extra] });
    u8.set(new TextEncoder().encode(formatCard("XTENSION", "IMAGE")), 0);
    u8.set(new TextEncoder().encode(formatCard("PCOUNT", 0)), 5 * 80);
    return u8;
  };
  const prim = new Uint8Array(2880).fill(32);
  [formatCard("SIMPLE", true), formatCard("BITPIX", 8), formatCard("NAXIS", 0), formatCard("EXTEND", true),
    formatCard("TELESCOP", "MOCK"), formatCard("FILTER", "F150W"), "END".padEnd(80)].forEach((cd, k) => prim.set(new TextEncoder().encode(cd), k * 80));
  const parts = [prim, ext(sci, "SCI", wcs), ext(err, "ERR", [formatCard("BUNIT", "MJy/sr")])];
  return new File(parts, "mock_lens_i2d.fits", { type: "application/fits" });
}

export function renderFitsTool(root) {
  const pick = h("input", { type: "file", accept: ".fits,.fit,.fts,.fits.fz,application/fits", hidden: true });
  pick.addEventListener("change", () => { if (pick.files[0]) openFile(pick.files[0]); pick.value = ""; });
  const status = h("div", { class: "muted small cf-status" });
  const mock = h("button", { class: "btn small", type: "button" }, "or play with a mock lens");
  mock.addEventListener("click", () => openFile(mockLens()));
  const empty = h("div", { class: "cf-drop" },
    h("div", { class: "cf-drop-art", html: '<svg viewBox="0 0 120 80" width="120" height="80" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="10" y="8" width="100" height="64"/><ellipse cx="60" cy="40" rx="5" ry="4" fill="currentColor"/><path d="M38 30a24 22 0 0 1 40-8M84 36a24 22 0 0 1-12 24M54 62a24 22 0 0 1-18-20" stroke-width="2"/><circle cx="35" cy="47" r="2" fill="currentColor"/><circle cx="86" cy="30" r="2" fill="currentColor"/><circle cx="66" cy="16" r="2" fill="currentColor"/><circle cx="58" cy="64" r="2" fill="currentColor"/></svg>' }),
    h("div", { class: "cf-drop-t" }, "Drop a FITS file here"),
    h("p", { class: "muted" }, "A JWST ", h("code", {}, "_i2d.fits"), " mosaic, an HST ", h("code", {}, "_drz.fits"), ", or a cutout. It is read in your browser, in pieces — nothing is uploaded, and a 1 GB mosaic is fine."),
    h("div", { class: "cf-btnrow" }, h("button", { class: "btn primary", type: "button", onclick: () => pick.click() }, "Choose a file"), mock), status, pick);

  ui.status = status; ui.empty = empty;
  ui.tools = h("div", { class: "cf-tools", role: "toolbar" }, TOOLS.map(([t, ic, name, key]) => {
    const b = h("button", { class: "cf-tool", type: "button", "data-tool": t, title: `${name} (${key})` }, h("span", { class: "cf-tool-ic" }, ic), h("span", { class: "cf-tool-name" }, name));
    b.addEventListener("click", () => setTool(t));
    return b;
  }));
  ui.help = h("div", { class: "cf-hint cf-tool-help" });
  canvas = h("canvas", { class: "cf-canvas", tabindex: 0, "aria-label": "image viewer" });
  ctx = canvas.getContext("2d");
  wrap = h("div", { class: "cf-canvas-wrap" }, canvas);
  ui.readout = h("div", { class: "mono small cf-readout" }, "—");
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", (e) => { pointers.delete(e.pointerId); drag = null; });
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("dblclick", (e) => zoomAt(2, e.offsetX, e.offsetY));
  canvas.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    const t = TOOLS.find((x) => x[3].toLowerCase() === k);
    if (t) { setTool(t[0]); e.preventDefault(); }
    else if (k === "delete" || k === "backspace") { deleteSelected(); e.preventDefault(); }
    else if (k === "escape") { F.sel = null; drawSelection(); draw(); }
    else if (k === "+" || k === "=") zoomAt(1.4);
    else if (k === "-") zoomAt(1 / 1.4);
    else if (k === "0") fitView();
    else if (k === "f") fitView("frame");
  });
  new ResizeObserver(resize).observe(wrap);

  // display controls
  const stretchSeg = h("div", { class: "chips" }, ["asinh", "log", "sqrt", "linear"].map((s) => {
    const b = h("button", { class: "chip" + (s === F.stretch ? " on" : ""), type: "button" }, s);
    b.addEventListener("click", () => { F.stretch = s; [...stretchSeg.children].forEach((x) => x.classList.toggle("on", x === b)); rebuildImages(); draw(); });
    return b;
  }));
  const cmap = h("select", { class: "btn small cf-select", "aria-label": "colour map" }, CMAP_NAMES.map((c) => h("option", { value: c }, c)));
  cmap.value = F.cmap;
  cmap.addEventListener("change", () => { F.cmap = cmap.value; rebuildImages(); draw(); });
  const contrast = h("input", { type: "range", min: 95, max: 99.99, step: 0.01, value: F.hiPct, "aria-label": "white level" });
  contrast.addEventListener("input", () => { F.hiPct = +contrast.value; applyLevels(); rebuildImages(); draw(); });
  const soft = h("input", { type: "range", min: -3, max: 0, step: 0.05, value: Math.log10(F.soft), "aria-label": "asinh softening" });
  soft.addEventListener("input", () => { F.soft = 10 ** +soft.value; rebuildImages(); draw(); });
  const zoomBtns = h("div", { class: "cf-btnrow" },
    h("button", { class: "btn small", type: "button", onclick: () => zoomAt(1.4) }, "+"),
    h("button", { class: "btn small", type: "button", onclick: () => zoomAt(1 / 1.4) }, "−"),
    h("button", { class: "btn small", type: "button", onclick: () => fitView() }, "whole image"),
    h("button", { class: "btn small", type: "button", onclick: () => fitView("frame") }, "frame"),
    h("button", { class: "btn small", type: "button", onclick: () => { computeLevels(); rebuildImages(); draw(); } }, "auto levels"));
  const preview = h("input", { type: "checkbox", checked: F.preview });
  preview.addEventListener("change", () => { F.preview = preview.checked; rebuildMask(); draw(); });

  // sizes
  ui.nRange = h("input", { type: "range", min: 15, max: 1001, step: 2 });
  ui.mRange = h("input", { type: "range", min: 11, max: 501, step: 2 });
  ui.nNum = h("input", { type: "number", class: "cf-num", step: 2 });
  ui.mNum = h("input", { type: "number", class: "cf-num", step: 2 });
  ui.nArc = h("span", { class: "muted small" }); ui.mArc = h("span", { class: "muted small" });
  const setN = (v) => { F.N = odd(v); if (F.M > F.N) F.M = F.N; clampFrame(); drawSizes(); rebuildMask(); draw(); };
  const setM = (v) => { F.M = odd(v); clampFrame(); drawSizes(); rebuildMask(); draw(); };
  ui.nRange.addEventListener("input", () => setN(+ui.nRange.value));
  ui.mRange.addEventListener("input", () => setM(+ui.mRange.value));
  for (const el of [ui.nRange, ui.mRange]) el.addEventListener("change", () => { ensureRegion(); syncConfig(); });
  ui.nNum.addEventListener("change", () => { setN(+ui.nNum.value); ensureRegion(); syncConfig(); });
  ui.mNum.addEventListener("change", () => { setM(+ui.mNum.value); syncConfig(); });
  const suggest = h("button", { class: "btn small", type: "button" }, "suggest from θE");
  suggest.addEventListener("click", () => {
    const tE = get("mass.main.theta_E_prior")?.center, ps = pixScale();
    if (!tE || !ps) return toast("Draw the Einstein radius (θ) first.");
    F.M = odd(Math.max(4, 5.5 * tE) / ps); F.N = odd(2.2 * F.M); clampFrame();
    drawSizes(); rebuildMask(); ensureRegion(); syncConfig(); fitView("frame");
    toast(`cutout ${F.M} px ≈ 5.5 θE, frame ${F.N} px ≈ 2.2 × cutout`);
  });
  ui.refine = h("input", { type: "checkbox", checked: true });

  // conversion & export
  ui.convert = h("input", { type: "checkbox" });
  ui.convertLbl = h("span", {});
  ui.convert.addEventListener("change", () => { F.convert = ui.convert.checked; });
  const sky = h("input", { type: "checkbox", checked: F.skysub });
  sky.addEventListener("change", () => { F.skysub = sky.checked; });
  const bits = h("div", { class: "chips" }, [8, 16].map((b) => {
    const el = h("button", { class: "chip" + (b === F.maskBits ? " on" : ""), type: "button" }, `masks BITPIX ${b}`);
    el.addEventListener("click", () => { F.maskBits = b; [...bits.children].forEach((x) => x.classList.toggle("on", x === el)); });
    return el;
  }));
  ui.info = h("div", { class: "cf-info" });
  ui.hdus = h("div", { class: "cf-hdus" });
  ui.shapes = h("div", { class: "cf-shapes" });
  ui.sel = h("div", { class: "cf-sel", hidden: true });
  const another = h("button", { class: "btn small", type: "button", onclick: () => pick.click() }, "Open another file");

  ui.main = h("div", { class: "cf-fits", hidden: true },
    h("div", { class: "cf-fits-view" },
      h("div", { class: "cf-hdus-row" }, ui.hdus, another),
      ui.tools, ui.help, wrap, ui.readout,
      h("div", { class: "cf-display" },
        h("label", {}, h("span", { class: "muted small" }, "stretch"), stretchSeg),
        h("label", {}, h("span", { class: "muted small" }, "colours"), cmap),
        h("label", {}, h("span", { class: "muted small" }, "white level"), contrast),
        h("label", {}, h("span", { class: "muted small" }, "softening"), soft),
        h("label", { class: "cf-check" }, preview, h("span", { class: "small" }, "dim what the fit ignores")),
        zoomBtns)),
    h("div", { class: "cf-fits-side" },
      h("section", { class: "cf-card" }, h("header", {}, h("div", {}, h("h3", {}, "Header"), h("p", { class: "muted small" }, "Read from the file; the pixel scale goes into data.pix_scale."))), ui.info,
        h("label", { class: "cf-check" }, ui.convert, ui.convertLbl)),
      h("section", { class: "cf-card" }, h("header", {}, h("div", {}, h("h3", {}, "Frame & cutout"), h("p", { class: "muted small" }, "Both odd and centred on the lens. The frame is used by the lens-light refit, the cutout by everything else."))),
        h("div", { class: "cf-row" }, h("div", { class: "cf-row-head" }, h("span", { class: "cf-label" }, "Frame N")), h("div", { class: "cf-slider" }, ui.nRange, ui.nNum, ui.nArc)),
        h("div", { class: "cf-row" }, h("div", { class: "cf-row-head" }, h("span", { class: "cf-label" }, "Cutout M"), h("code", { class: "cf-key" }, "data.cutout_size")), h("div", { class: "cf-slider" }, ui.mRange, ui.mNum, ui.mArc)),
        h("div", { class: "cf-btnrow" }, suggest, h("label", { class: "cf-check" }, ui.refine, h("span", { class: "small" }, "refine lens clicks with a centroid")))),
      h("section", { class: "cf-card" }, h("header", {}, h("div", {}, h("h3", {}, "Shapes"), h("p", { class: "muted small" }, "Click one to edit it; Delete removes the selected one."))), ui.sel, ui.shapes),
      h("section", { class: "cf-card" }, h("header", {}, h("div", {}, h("h3", {}, "Export the inputs"), h("p", { class: "muted small" }, "Full resolution, straight from the file. Put them in data/ next to config.json."))),
        h("label", { class: "cf-check" }, sky, h("span", { class: "small" }, "subtract the sky (σ-clipped median outside the cutout; ALPACA still fits a sky level)")),
        bits,
        h("div", { class: "cf-files" }, ["image.fits", "noise_map.fits", "mask_likelihood.fits", "mask_lens_only.fits"].map((n) =>
          h("button", { class: "btn small", type: "button", onclick: () => exportOne(n) }, n))),
        h("button", { class: "btn primary", type: "button", onclick: exportZip }, "All four as a zip"),
        h("p", { class: "muted small" }, "Bad pixels (NaN, no noise) get image 0 and noise 10⁶ × the largest noise, and are left out of both masks."))));

  root.append(empty, ui.main);
  root.addEventListener("dragover", (e) => { e.preventDefault(); root.classList.add("dragging"); });
  root.addEventListener("dragleave", (e) => { if (e.target === root || !root.contains(e.relatedTarget)) root.classList.remove("dragging"); });
  root.addEventListener("drop", (e) => {
    e.preventDefault(); root.classList.remove("dragging");
    const f = e.dataTransfer.files[0];
    if (f) openFile(f);
  });
  setTool("move");
  drawSizes();
  subscribe((o) => {
    const fresh = o.has("preset") || o.has("import");
    if (fresh && F.view) {
      // a new preset / imported config: take its cutout size, keep what the image says
      const c = get("data.cutout_size");
      if (Number.isInteger(c) && c % 2 === 1 && hasFrame()) { F.M = Math.min(c, F.N); clampFrame(); }
      if (F.pix) setMany([["data.pix_scale", F.pix.scale]], "fits");
      rebuildMask(); syncConfig(); drawSizes(); drawShapes();
    }
    if (fresh || o.has("perturbers")) draw();
    if (fresh || o.has("light.point_sources.enabled")) ui.tools.querySelector('[data-tool="qso"]').hidden = !isQuasar();
  });
  ui.tools.querySelector('[data-tool="qso"]').hidden = !isQuasar();
  return { resize, hasData: () => hasFrame() };
}
