// Interactive applets of the ALPACA tutorials (doc/tutorial-*.html).
//   <div data-applet="lens-playground"></div>
//   <div data-applet="blink" data-base="data/applets/spt0418" data-pix="0.063008"></div>
//   <div data-applet="stages" data-images="a.png|b.png|c.png" data-captions="..|..|.."></div>
//   <div data-applet="config" data-config="files/spt0418_config.json" data-shipped="files/shipped_config.json"></div>
// The lensing maths is the site's own port of ALPACA's profiles (js/physics/profiles.js).
import { eplDeflection, shearDeflection, sersicLight } from "../js/physics/profiles.js";
import { getLut } from "../js/core/colormaps.js";
import { parseNpy } from "../js/core/parsers/npy.js";

const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const k of kids) e.append(k);
  return e;
};

function paint(canvas, values, n, { cmap = "magma", vmin, vmax, mask = null, maskAlpha = 0.65 } = {}) {
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(n, n);
  const lut = getLut(cmap);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const i = r * n + c;
      const o = ((n - 1 - r) * n + c) * 4;           // origin="lower"
      let t = (values[i] - vmin) / (vmax - vmin);
      t = Math.max(0, Math.min(1, t));
      const k = Math.round(t * 255) * 3;
      let R = lut[k], G = lut[k + 1], B = lut[k + 2];
      if (mask && !mask[i]) {
        R = R * (1 - maskAlpha) + 210 * maskAlpha;
        G = G * (1 - maskAlpha) + 210 * maskAlpha;
        B = B * (1 - maskAlpha) + 210 * maskAlpha;
      }
      img.data[o] = R; img.data[o + 1] = G; img.data[o + 2] = B; img.data[o + 3] = 255;
    }
  }
  const tmp = document.createElement("canvas");
  tmp.width = n; tmp.height = n;
  tmp.getContext("2d").putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
}

function slider(label, min, max, step, value, fmt, onInput) {
  const out = el("span", { class: "val" }, fmt(value));
  const inp = el("input", { type: "range", min, max, step, value });
  inp.addEventListener("input", () => { out.textContent = fmt(+inp.value); onInput(+inp.value); });
  return { node: el("label", { class: "sl" }, el("span", { class: "lab" }, label), inp, out), input: inp, out };
}

// ------------------------------------------------------------------ 1. lens playground
function lensPlayground(root) {
  const N = 150, FOV = 4.4;                         // image plane: 150 px over 4.4"
  const NS = 150, FOVS = 2.2;                       // source plane
  const p = { theta_E: 1.2, gamma: 2.0, q: 0.8, phi: 30, shear: 0.05, shear_phi: 120,
              sx: 0.08, sy: 0.04, R: 0.12, lens: true };
  const x = new Float64Array(N * N), y = new Float64Array(N * N);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    x[r * N + c] = (c - (N - 1) / 2) * FOV / N; y[r * N + c] = (r - (N - 1) / 2) * FOV / N;
  }
  const xs = new Float64Array(NS * NS), ys = new Float64Array(NS * NS);
  for (let r = 0; r < NS; r++) for (let c = 0; c < NS; c++) {
    xs[r * NS + c] = (c - (NS - 1) / 2) * FOVS / NS; ys[r * NS + c] = (r - (NS - 1) / 2) * FOVS / NS;
  }
  const cImg = el("canvas", { width: 300, height: 300, class: "pg-canvas" });
  const cSrc = el("canvas", { width: 300, height: 300, class: "pg-canvas grab" });
  const info = el("div", { class: "pg-info" });
  const e12 = () => {
    const c = (1 - p.q) / (1 + p.q), a = 2 * p.phi * Math.PI / 180;
    return [c * Math.cos(a), c * Math.sin(a)];
  };
  const g12 = () => { const a = 2 * p.shear_phi * Math.PI / 180; return [p.shear * Math.cos(a), p.shear * Math.sin(a)]; };
  let pending = false;
  const draw = () => {
    pending = false;
    const [e1, e2] = e12(), [g1, g2] = g12();
    const ax = new Float64Array(N * N), ay = new Float64Array(N * N);
    eplDeflection(x, y, { theta_E: p.theta_E, e1, e2, gamma: p.gamma, center_x: 0, center_y: 0 }, ax, ay);
    shearDeflection(x, y, { gamma1: g1, gamma2: g2 }, ax, ay);
    const bx = new Float64Array(N * N), by = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) { bx[i] = x[i] - ax[i]; by[i] = y[i] - ay[i]; }
    const src = { amp: 1, R_sersic: p.R, n_sersic: 1.0, e1: 0.15, e2: -0.1, center_x: p.sx, center_y: p.sy };
    const im = new Float64Array(N * N);
    sersicLight(bx, by, src, im);
    if (p.lens) sersicLight(x, y, { amp: 0.6, R_sersic: 0.5, n_sersic: 3, e1: e1 * 0.6, e2: e2 * 0.6 }, im);
    const disp = im.map((v) => Math.asinh(v / 0.02));
    let vmax = 0;
    for (const v of disp) vmax = Math.max(vmax, v);
    paint(cImg, disp, N, { cmap: "magma", vmin: 0, vmax: vmax * 0.95 });
    // critical curve: sign change of det(A) on the grid (A = d(beta)/d(theta))
    const h = FOV / N;
    const det = new Float64Array(N * N);
    for (let r = 1; r < N - 1; r++) for (let c = 1; c < N - 1; c++) {
      const i = r * N + c;
      const dbxdx = (bx[i + 1] - bx[i - 1]) / (2 * h), dbxdy = (bx[i + N] - bx[i - N]) / (2 * h);
      const dbydx = (by[i + 1] - by[i - 1]) / (2 * h), dbydy = (by[i + N] - by[i - N]) / (2 * h);
      det[i] = dbxdx * dbydy - dbxdy * dbydx;
    }
    const ctxI = cImg.getContext("2d"), crit = [];
    ctxI.fillStyle = "#6495ED";
    const sc = cImg.width / N;
    for (let r = 2; r < N - 2; r++) for (let c = 2; c < N - 2; c++) {
      const i = r * N + c;
      if (det[i] * det[i + 1] < 0 || det[i] * det[i + N] < 0) {
        ctxI.fillRect(c * sc, (N - 1 - r) * sc, 1.6, 1.6);
        crit.push(i);
      }
    }
    // source plane: the source and the caustic (the critical curve mapped back)
    const sim = new Float64Array(NS * NS);
    sersicLight(xs, ys, src, sim);
    const sdisp = sim.map((v) => Math.asinh(v / 0.02));
    let smax = 0;
    for (const v of sdisp) smax = Math.max(smax, v);
    paint(cSrc, sdisp, NS, { cmap: "magma", vmin: 0, vmax: smax * 0.95 });
    const ctxS = cSrc.getContext("2d"), ss = cSrc.width / FOVS;
    ctxS.fillStyle = "#D6336C";
    for (const i of crit) {
      const u = (bx[i] + FOVS / 2) * ss, v = (FOVS / 2 - by[i]) * ss;
      if (u >= 0 && v >= 0 && u < cSrc.width && v < cSrc.height) ctxS.fillRect(u, v, 1.6, 1.6);
    }
    info.innerHTML = `Einstein radius <b>${p.theta_E.toFixed(2)}″</b> · slope γ <b>${p.gamma.toFixed(2)}</b> · axis ratio q <b>${p.q.toFixed(2)}</b> · shear <b>${p.shear.toFixed(2)}</b>. ` +
      `Blue: critical curve (image plane); red: caustic (source plane). Drag the source on the right.`;
  };
  const redraw = () => { if (!pending) { pending = true; requestAnimationFrame(draw); } };
  const S = (lab, k, a, b, st, f) => slider(lab, a, b, st, p[k], f, (v) => { p[k] = v; redraw(); }).node;
  const controls = el("div", { class: "pg-controls" },
    S("Einstein radius θE", "theta_E", 0.3, 1.8, 0.01, (v) => v.toFixed(2) + "″"),
    S("slope γ", "gamma", 1.5, 2.6, 0.01, (v) => v.toFixed(2)),
    S("axis ratio q", "q", 0.4, 1.0, 0.01, (v) => v.toFixed(2)),
    S("mass angle", "phi", 0, 180, 1, (v) => v.toFixed(0) + "°"),
    S("external shear", "shear", 0, 0.25, 0.005, (v) => v.toFixed(3)),
    S("shear angle", "shear_phi", 0, 180, 1, (v) => v.toFixed(0) + "°"),
    S("source size", "R", 0.02, 0.4, 0.005, (v) => v.toFixed(3) + "″"));
  const cb = el("input", { type: "checkbox", checked: "" });
  cb.addEventListener("change", () => { p.lens = cb.checked; redraw(); });
  controls.append(el("label", { class: "sl cbx" }, cb, el("span", {}, " show the lens galaxy's light")));
  const presets = el("div", { class: "pg-presets" }, el("span", { class: "lab" }, "try: "));
  for (const [name, set] of [
    ["Einstein ring", { sx: 0.0, sy: 0.0, q: 0.95, shear: 0.0 }],
    ["four images (quad)", { sx: 0.05, sy: 0.04, q: 0.7, shear: 0.06, R: 0.03 }],
    ["two images (double)", { sx: 0.35, sy: 0.2, q: 0.8, R: 0.03 }],
    ["two arcs", { sx: 0.1, sy: -0.02, q: 0.6, R: 0.15 }]]) {
    presets.append(el("button", { class: "btn small", onclick: () => {
      Object.assign(p, set);
      syncSliders(); redraw();
    } }, name));
  }
  const syncSliders = () => {
    const keys = ["theta_E", "gamma", "q", "phi", "shear", "shear_phi", "R"];
    controls.querySelectorAll("label.sl").forEach((lab, j) => {
      const inp = lab.querySelector("input[type=range]");
      if (!inp) return;
      inp.value = p[keys[j]];
      inp.dispatchEvent(new Event("input"));
    });
  };
  let drag = false;
  const move = (ev) => {
    const b = cSrc.getBoundingClientRect();
    const t = ev.touches ? ev.touches[0] : ev;
    p.sx = ((t.clientX - b.left) / b.width - 0.5) * FOVS;
    p.sy = (0.5 - (t.clientY - b.top) / b.height) * FOVS;
    redraw();
  };
  cSrc.addEventListener("mousedown", (e) => { drag = true; move(e); });
  window.addEventListener("mousemove", (e) => { if (drag) move(e); });
  window.addEventListener("mouseup", () => { drag = false; });
  cSrc.addEventListener("touchstart", (e) => { drag = true; move(e); e.preventDefault(); }, { passive: false });
  cSrc.addEventListener("touchmove", (e) => { if (drag) { move(e); e.preventDefault(); } }, { passive: false });
  cSrc.addEventListener("touchend", () => { drag = false; });
  root.append(el("div", { class: "pg" },
    el("div", { class: "pg-panels" },
      el("figure", { class: "pg-fig" }, cImg, el("figcaption", {}, `what the telescope sees (${FOV}″)`)),
      el("figure", { class: "pg-fig" }, cSrc, el("figcaption", {}, `the source without the lens (${FOVS}″) — drag it`))),
    controls, presets, info));
  draw();
}

// ------------------------------------------------------------------ 2. data / model / residual viewer
async function loadNpy(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ": " + r.status);
  return parseNpy(new Uint8Array(await r.arrayBuffer()));
}

async function blink(root) {
  const base = root.dataset.base, pix = +root.dataset.pix || 0.031;
  let A;
  try {
    const [d, m, s, k] = await Promise.all(["data", "model", "noise", "mask"].map((n) => loadNpy(`${base}_${n}.npy`)));
    A = { d: d.data, m: m.data, s: s.data, k: k.data, n: d.shape[0] };
  } catch (e) {
    root.append(el("p", { class: "muted small" }, "(interactive viewer: data not available — " + e.message + ")"));
    return;
  }
  const n = A.n, N2 = n * n;
  const res = new Float64Array(N2);
  for (let i = 0; i < N2; i++) res[i] = (A.d[i] - A.m[i]) / A.s[i];
  const sorted = Array.from(A.s).sort((a, b) => a - b);
  const nz = sorted[Math.floor(N2 / 2)];
  const st = (v) => Math.asinh(v / (3 * nz));
  const dD = A.d.map(st), dM = A.m.map(st);
  const vmax = Array.from(dD).sort((a, b) => a - b)[Math.floor(N2 * 0.998)];
  const cv = el("canvas", { width: 420, height: 420, class: "bl-canvas" });
  const readout = el("div", { class: "bl-read" }, "hover over the image");
  let view = "data", showMask = true, box = null;
  const chi = (() => { let s = 0, c = 0; for (let i = 0; i < N2; i++) if (A.k[i]) { s += res[i] * res[i]; c++; } return s / c; })();
  const draw = () => {
    const mask = showMask ? A.k : null;
    if (view === "residual") paint(cv, res, n, { cmap: "RdBu_r", vmin: -4, vmax: 4, mask });
    else paint(cv, view === "data" ? dD : dM, n, { cmap: "magma", vmin: -0.3, vmax, mask });
    if (box) {
      const ctx = cv.getContext("2d"), sc = cv.width / n;
      ctx.strokeStyle = "#10AC84"; ctx.lineWidth = 2;
      ctx.strokeRect(box.c0 * sc, (n - box.r1) * sc, (box.c1 - box.c0) * sc, (box.r1 - box.r0) * sc);
    }
  };
  const tabs = el("div", { class: "seg" });
  for (const [k, lab] of [["data", "data"], ["model", "model"], ["residual", "residual (data − model)/σ"]]) {
    tabs.append(el("button", { class: k === view ? "on" : "", onclick: (ev) => {
      view = k; tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === ev.target)); draw();
    } }, lab));
  }
  const mcb = el("input", { type: "checkbox", checked: "" });
  mcb.addEventListener("change", () => { showMask = mcb.checked; draw(); });
  const boxInfo = el("div", { class: "bl-box" }, "Noise check: drag a box over empty sky.");
  let start = null;
  const px = (ev) => {
    const b = cv.getBoundingClientRect();
    return [Math.floor((ev.clientX - b.left) / b.width * n), n - 1 - Math.floor((ev.clientY - b.top) / b.height * n)];
  };
  cv.addEventListener("mousemove", (ev) => {
    const [c, r] = px(ev);
    if (c < 0 || r < 0 || c >= n || r >= n) return;
    const i = r * n + c;
    readout.textContent = `x ${((c - (n - 1) / 2) * pix).toFixed(2)}″, y ${((r - (n - 1) / 2) * pix).toFixed(2)}″ · data ${A.d[i].toPrecision(3)} · model ${A.m[i].toPrecision(3)} · residual ${res[i].toFixed(2)}σ${A.k[i] ? "" : " (masked)"}`;
    if (start) {
      box = { c0: Math.min(start[0], c), c1: Math.max(start[0], c) + 1, r0: Math.min(start[1], r), r1: Math.max(start[1], r) + 1 };
      draw();
    }
  });
  cv.addEventListener("mousedown", (ev) => { start = px(ev); box = null; });
  window.addEventListener("mouseup", () => {
    if (!start || !box) { start = null; return; }
    start = null;
    let s = 0, s2 = 0, sn = 0, c = 0;
    for (let r = box.r0; r < box.r1; r++) for (let q = box.c0; q < box.c1; q++) {
      const v = A.d[r * n + q]; s += v; s2 += v * v; sn += A.s[r * n + q]; c++;
    }
    if (c < 9) return;
    const mean = s / c, std = Math.sqrt(Math.max(s2 / c - mean * mean, 0));
    boxInfo.innerHTML = `Box of ${c} pixels: std(data) / mean(noise) = <b>${(std / (sn / c)).toFixed(2)}</b> ` +
      `(≈ 0.7 is normal for drizzled JWST mosaics; with the lens or an arc inside the box it is larger).`;
  });
  root.append(el("div", { class: "bl" },
    el("div", { class: "bl-top" }, tabs,
      el("label", { class: "cbx" }, mcb, el("span", {}, " grey out masked pixels"))),
    cv, readout, boxInfo,
    el("div", { class: "muted small" }, `χ²_red inside the likelihood mask: ${chi.toFixed(3)} (residuals between ±1 look white).`)));
  draw();
}

// ------------------------------------------------------------------ 3. stage stepper
function stages(root) {
  const imgs = root.dataset.images.split("|"), caps = (root.dataset.captions || "").split("|");
  const img = el("img", { src: imgs[0], alt: "stage" });
  const cap = el("div", { class: "st-cap" }, caps[0] || "");
  const seg = el("div", { class: "seg" });
  imgs.forEach((src, j) => seg.append(el("button", { class: j === 0 ? "on" : "", onclick: (ev) => {
    img.src = src; cap.textContent = caps[j] || "";
    seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === ev.target));
  } }, `stage ${j + 1}`)));
  root.append(el("div", { class: "st" }, seg, img, cap));
}

// ------------------------------------------------------------------ 4. config explorer
async function configExplorer(root) {
  let cfg, shipped = null, knobs = {};
  try {
    cfg = await (await fetch(root.dataset.config)).json();
    if (root.dataset.shipped) shipped = await (await fetch(root.dataset.shipped)).json();
    const k = await fetch("data/knobs.json");
    if (k.ok) for (const e of (await k.json()).knobs || []) knobs[e.key] = e;
  } catch (e) {
    root.append(el("p", { class: "muted small" }, "(config explorer unavailable: " + e.message + ")"));
    return;
  }
  const get = (o, path) => path.split(".").reduce((a, k) => (a && typeof a === "object" ? a[k] : undefined), o);
  const panel = el("div", { class: "cx-panel" }, el("p", { class: "muted" }, "Click a key on the left to see what it does."));
  const strip = (h) => { const d = document.createElement("div"); d.innerHTML = h || ""; return d.textContent; };
  const show = (path, val) => {
    // sub-keys of a documented dict (e.g. theta_E_prior.center, delays.AB) fall back to their parent's entry
    let kp = path;
    while (kp && !knobs[kp]) kp = kp.includes(".") ? kp.slice(0, kp.lastIndexOf(".")) : "";
    const kb = knobs[kp];
    const sv = shipped ? get(shipped, path) : undefined;
    panel.innerHTML = "";
    panel.append(el("div", { class: "cx-key" }, path));
    panel.append(el("div", { class: "cx-val" }, "this tutorial: ", el("code", {}, JSON.stringify(val))));
    if (shipped) panel.append(el("div", { class: "cx-val" }, "shipped config.json: ", el("code", {}, JSON.stringify(sv))));
    if (kb) {
      if (kp !== path) panel.append(el("div", { class: "cx-val" }, "part of ", el("code", {}, kp)));
      panel.append(el("div", { class: "cx-val" }, "code default: ", el("code", {}, JSON.stringify(kb.default))));
      panel.append(el("p", {}, strip(kb.curated_html || kb.code_doc || "").slice(0, 900)));
      panel.append(el("a", { href: "documentation.html#k-" + kp.replace(/[._]/g, "-").toLowerCase() }, "full reference →"));
    } else panel.append(el("p", { class: "muted" }, "A group of settings: open it on the left."));
  };
  const tree = (obj, prefix, depth) => {
    const ul = el("ul", { class: "cx-tree" });
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? prefix + "." + k : k;
      const changed = shipped && JSON.stringify(get(shipped, path)) !== JSON.stringify(v);
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const det = el("details", depth < 1 ? { open: "" } : {});
        det.append(el("summary", { onclick: () => show(path, v) }, k));
        det.append(tree(v, path, depth + 1));
        ul.append(el("li", {}, det));
      } else {
        ul.append(el("li", {}, el("button", { class: "cx-leaf" + (changed ? " changed" : ""), onclick: () => show(path, v) },
          el("span", {}, k), el("code", {}, JSON.stringify(v)))));
      }
    }
    return ul;
  };
  root.append(el("div", { class: "cx" },
    el("div", { class: "cx-left" }, el("div", { class: "muted small" }, el("span", { style: "color:#D6336C" }, "■"), " = differs from the shipped config.json"), tree(cfg, "", 0)),
    panel));
}

const REG = { "lens-playground": lensPlayground, blink, stages, config: configExplorer };
document.querySelectorAll("[data-applet]").forEach((root) => {
  const f = REG[root.dataset.applet];
  if (f) Promise.resolve(f(root)).catch((e) => root.append(el("p", { class: "muted small" }, String(e))));
});
