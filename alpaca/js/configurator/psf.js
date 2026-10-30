// "PSF" tab: where the PSF comes from (STARRED), which file goes where, and a quick
// check of a PSF file dropped on the page.
import { h, toast, fmt } from "./dom.js";
import { store, setMany, setRun, effective, subscribe } from "./state.js";
import { scanHdus, readRegion } from "./fitsio.js";
import { getLut } from "../core/colormaps.js";

const STARRED = "https://gitlab.com/cosmograil/starred";

async function checkPsf(file, out) {
  out.replaceChildren(h("p", { class: "muted small" }, `reading ${file.name}…`));
  try {
    const hdus = await scanHdus(file);
    const hdu = hdus.find((u) => u.isImage);
    if (!hdu) throw new Error("no 2-D image in this file");
    const { rows, cols } = hdu;
    const d = await readRegion(file, hdu, 0, rows, 0, cols);
    let sum = 0, peak = -Infinity, pi = 0, neg = 0, negSum = 0, nan = 0;
    d.forEach((v, i) => {
      if (v !== v) { nan++; return; }
      sum += v;
      if (v > peak) { peak = v; pi = i; }
      if (v < 0) { neg++; negSum += v; }
    });
    const py = Math.floor(pi / cols), px = pi % cols;
    // FWHM from the area above half maximum
    let above = 0;
    d.forEach((v) => { if (v >= peak / 2) above++; });
    const fwhm = 2 * Math.sqrt(above / Math.PI);
    const os = effective("psf.input.oversample") || 1;
    const checks = [
      [rows === cols, `square: ${cols} × ${rows}`],
      [rows % 2 === 1 && cols % 2 === 1, `odd size, so the peak can sit on the centre pixel`],
      [Math.abs(px - (cols - 1) / 2) <= 1 && Math.abs(py - (rows - 1) / 2) <= 1, `peak at (${px}, ${py}), centre (${(cols - 1) / 2}, ${(rows - 1) / 2})`],
      [Math.abs(sum - 1) < 0.02, `sum ${fmt(sum, 5)} (should be 1)`],
      [nan === 0, `${nan} NaN pixel(s)`],
      [negSum > -0.05 * sum, `${neg} negative pixel(s), ${fmt((100 * -negSum) / (sum || 1), 3)} % of the flux`],
    ];
    const canvas = h("canvas", { width: cols, height: rows, class: "cf-psf-img" });
    const c2 = canvas.getContext("2d");
    const id = c2.createImageData(cols, rows);
    const lut = getLut("magma");
    const soft = peak * 1e-3;
    const as = Math.asinh(peak / soft);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const v = d[r * cols + c];
      const t = v === v ? Math.max(0, Math.min(1, Math.asinh(Math.max(0, v) / soft) / as)) : 0;
      const k = 3 * Math.round(t * 255), o = 4 * ((rows - 1 - r) * cols + c);
      id.data[o] = lut[k]; id.data[o + 1] = lut[k + 1]; id.data[o + 2] = lut[k + 2]; id.data[o + 3] = 255;
    }
    c2.putImageData(id, 0, 0);
    out.replaceChildren(
      h("div", { class: "cf-psf-check" }, canvas,
        h("div", {},
          h("div", { class: "cf-label" }, file.name + (hdu.extname && hdu.extname !== "PRIMARY" ? ` [${hdu.extname}]` : "")),
          h("ul", { class: "cf-filelist" }, checks.map(([ok, msg]) => h("li", {}, h("span", { class: "cf-tick" }, ok ? "✓" : "!"), msg))),
          h("p", { class: "muted small" }, `FWHM ≈ ${fwhm.toFixed(1)} PSF pixels = ${(fwhm / os).toFixed(2)} image pixels with psf.input.oversample = ${os}. A NIRCam PSF is about 2 image pixels wide; if this looks ${os}× too wide or narrow, check the oversampling.`))));
    if (checks.every(([ok]) => ok)) toast("PSF looks good");
  } catch (e) {
    out.replaceChildren(h("p", { class: "bad small" }, "Could not read it: " + e.message));
  }
}

export function renderPsf(root) {
  const use = h("button", { class: "btn primary", type: "button" }, "Use these file names");
  use.addEventListener("click", () => {
    setMany([
      ["psf.mode", "joint"],
      ["psf.input.oversample", 3],
      ["psf.joint.seed_path", "data/psf_starred_seed.npz"],
      ["psf.input.error_map_path", "data/psf_error_map.fits"],
    ], "psf");
    setRun("PSF_PATH", "./data/psf_supersampled.fits");
    toast("PSF paths set");
  });
  const table = h("div", { class: "cf-psf-map" });
  const pick = h("input", { type: "file", accept: ".fits,.fit,application/fits", hidden: true });
  const out = h("div", {});
  pick.addEventListener("change", () => { if (pick.files[0]) checkPsf(pick.files[0], out); pick.value = ""; });
  const drop = h("div", { class: "cf-drop small-drop" },
    h("div", { class: "cf-drop-t" }, "Check a PSF file"),
    h("p", { class: "muted small" }, "Drop psf_supersampled.fits here: size, centring, normalisation and width at a glance."),
    h("button", { class: "btn small", type: "button", onclick: () => pick.click() }, "Choose a file"), pick);
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("dragging"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); e.stopPropagation(); drop.classList.remove("dragging"); if (e.dataTransfer.files[0]) checkPsf(e.dataTransfer.files[0], out); });

  root.append(
    h("section", { class: "cf-card cf-wide cf-starred" },
      h("header", {}, h("div", {}, h("h3", {}, "Make the PSF with STARRED"),
        h("p", { class: "muted small" }, "The point-spread function is measured on stars in the same image."))),
      h("p", {}, "Use the ", h("b", {}, "STARRED GUI"), " from the COSMOGRAIL GitLab: ", h("a", { href: STARRED, target: "_blank", rel: "noopener" }, "gitlab.com/cosmograil/starred"),
        ". Give it a few isolated, unsaturated stars from the same mosaic (with their noise), reconstruct the PSF 3× supersampled, and save the three files below into ", h("code", {}, "data/"), ". ALPACA starts from that PSF and refines it during the fit."),
      table,
      h("div", { class: "cf-btnrow" }, use)),
    h("section", { class: "cf-card cf-wide" }, drop, out));

  const refresh = () => {
    const rows = [
      ["psf_supersampled.fits", "the PSF, 3× supersampled, sum = 1", "PSF_PATH (run_alpaca.py)", store.run.PSF_PATH],
      ["psf_starred_seed.npz", "the STARRED fit (Moffat + pixel background)", "psf.joint.seed_path", effective("psf.joint.seed_path")],
      ["psf_error_map.fits", "per-pixel uncertainty of the PSF", "psf.input.error_map_path", effective("psf.input.error_map_path")],
      ["3× supersampling", "PSF pixels per image pixel", "psf.input.oversample", effective("psf.input.oversample")],
    ];
    table.replaceChildren(h("div", { class: "cf-psf-row head muted small" }, h("span", {}, "STARRED gives"), h("span", {}, "what it is"), h("span", {}, "goes to"), h("span", {}, "now")),
      ...rows.map(([f, what, where, now]) => h("div", { class: "cf-psf-row" }, h("code", {}, f), h("span", { class: "small" }, what), h("code", {}, where), h("span", { class: "mono small" }, fmt(now)))));
  };
  subscribe(refresh);
  refresh();
}
