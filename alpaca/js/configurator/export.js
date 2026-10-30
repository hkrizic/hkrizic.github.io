// "Export" tab: config.json, the top of run_alpaca.py, and one zip with everything.
import { h, download, copyText, toast } from "./dom.js";
import { store, configText, effective, subscribe } from "./state.js";
import { validate } from "./validate.js";
import { catalogueText } from "./delays.js";
import { buildFitsProducts } from "./fitstool.js";

const py = (v) => (v === null || v === undefined ? "None" : typeof v === "string" ? JSON.stringify(v) : String(v));
const tuple = (xy) => `(${xy.map((x) => (Number.isInteger(x) ? x.toFixed(1) : String(x))).join(", ")})`;

export function runSnippet() {
  const r = store.run;
  const quasar = effective("light.point_sources.enabled") !== false;
  const lines = [
    "# --- top of run_alpaca.py (written by the ALPACA configurator) ---",
    `IMAGE_PATH = ${py(r.IMAGE_PATH)}`,
    `PSF_PATH = ${py(r.PSF_PATH)}        # STARRED, ${effective("psf.input.oversample") ?? 3}x supersampled`,
    `NOISE_MAP_PATH = ${py(r.NOISE_MAP_PATH)}`,
    "",
  ];
  if (quasar && r.IMAGE_POSITIONS && Object.keys(r.IMAGE_POSITIONS).length) {
    lines.push("IMAGE_POSITIONS = {   # arcsec from the frame centre (x = column, y = row)");
    for (const [k, xy] of Object.entries(r.IMAGE_POSITIONS)) lines.push(`    ${JSON.stringify(k)}: ${tuple(xy)},`);
    lines.push("}");
  } else {
    lines.push(`IMAGE_POSITIONS = None${quasar ? "   # images labelled clockwise from north" : "   # galaxy-galaxy lens: not used"}`);
  }
  lines.push(`REFERENCE_IMAGE = ${py(r.REFERENCE_IMAGE || "A")}`);
  lines.push("");
  lines.push(`LENS_POSITION = ${tuple(r.LENS_POSITION || [0, 0])}   # arcsec, lens - frame centre`);
  lines.push("");
  lines.push("TIME_DELAYS = None   # the delays live in config.json (likelihood.time_delays)");
  return lines.join("\n") + "\n";
}

function readme(hasFits) {
  return `# ALPACA run folder (from the configurator)

    config.json                 every modelling choice
    run_alpaca_settings.py      paste over the matching lines at the top of run_alpaca.py
${hasFits ? `    data/image.fits             the frame (${store.fits.N} px)
    data/noise_map.fits         its noise (if an ERR extension was chosen)
    data/mask_likelihood.fits   1 = pixel used in the fit (${store.fits.M} px cutout)
    data/mask_lens_only.fits    1 = pixel used in the lens-light refit (frame)
` : ""}${store.perturbers ? "    data/perturbers.json        nearby galaxies (model-frame catalogue)\n" : ""}
Still needed: the PSF. Build it from stars with the STARRED GUI from COSMOGRAIL
(https://gitlab.com/cosmograil/starred) and put into data/:

    psf_supersampled.fits   3x supersampled PSF, sum 1        -> PSF_PATH
    psf_starred_seed.npz    the STARRED fit (Moffat + background) -> psf.joint.seed_path
    psf_error_map.fits      per-pixel PSF uncertainty          -> psf.input.error_map_path

Then:

    python run_alpaca.py config.json --fit-only    # the best fit
    python run_alpaca.py config.json               # same folder: reloads the fit, then samples
`;
}

async function exportAll() {
  try {
    const { zipSync, strToU8 } = await import("../vendor/fflate.js");
    const z = {
      "alpaca_run/config.json": strToU8(configText()),
      "alpaca_run/run_alpaca_settings.py": strToU8(runSnippet()),
    };
    const hasFits = !!(store.fits && store.fits.cx !== null && store.fits.view);
    if (hasFits) {
      const { files, notes } = await buildFitsProducts();
      for (const [k, v] of Object.entries(files)) z["alpaca_run/data/" + k] = v;
      toast(notes.join(" · "));
    }
    if (store.perturbers) z["alpaca_run/data/perturbers.json"] = strToU8(catalogueText());
    z["alpaca_run/README.md"] = strToU8(readme(hasFits));
    download("alpaca_run.zip", zipSync(z, { level: 6 }), "application/zip");
  } catch (e) { toast(e.message, "bad"); console.error(e); }
}

export function renderExport(root) {
  const status = h("div", { class: "cf-export-status" });
  const snippet = h("pre", { class: "cf-snippet" });
  const files = h("ul", { class: "cf-filelist" });
  const big = h("button", { class: "btn primary cf-big", type: "button" }, "Download everything (.zip)");
  big.addEventListener("click", exportAll);
  const cfgBtn = h("button", { class: "btn", type: "button", onclick: () => download("config.json", configText(), "application/json") }, "config.json");
  const runBtn = h("button", { class: "btn", type: "button", onclick: () => download("run_alpaca_settings.py", runSnippet(), "text/x-python") }, "run_alpaca_settings.py");
  const pertBtn = h("button", { class: "btn", type: "button", onclick: () => download("perturbers.json", catalogueText(), "application/json") }, "perturbers.json");
  const copyRun = h("button", { class: "copy", type: "button", onclick: () => copyText(runSnippet()) }, "copy");

  root.append(
    h("section", { class: "cf-card cf-wide" },
      h("header", {}, h("div", {}, h("h3", {}, "Take it home"), h("p", { class: "muted small" }, "One zip with the config, the run settings, the data you cut in the Data tab and a README with the next steps."))),
      status, h("div", { class: "cf-btnrow" }, big, cfgBtn, runBtn, pertBtn), files),
    h("section", { class: "cf-card cf-wide" },
      h("header", {}, h("div", {}, h("h3", {}, "run_alpaca.py"), h("p", { class: "muted small" }, "File paths and positions live at the top of the run script, not in the config. Replace the matching lines."))),
      h("div", { class: "cf-pre-wrap" }, snippet, copyRun)),
    h("section", { class: "cf-card cf-wide" },
      h("header", {}, h("div", {}, h("h3", {}, "Run it"))),
      h("pre", {}, h("code", {}, "python run_alpaca.py config.json --fit-only     # the best fit (stages 1–3)\npython run_alpaca.py config.json                # same folder: reloads the fit, then samples\nalpaca-device                                   # which CPU / GPU will be used")),
      h("p", { class: "muted small" }, "Options: ", h("code", {}, "--backend cpu|gpu|cuda|mps"), " ", h("code", {}, "--precision float32|float64"), " ", h("code", {}, "--output DIR"), ". Judge the best fit before sampling: ", h("a", { href: "doc/tutorial.html" }, "the tutorials"), " show how.")));

  const refresh = () => {
    snippet.textContent = runSnippet();
    const v = validate(store.fits && store.fits.cx !== null ? store.fits : null);
    const errs = v.filter((m) => m.level === "error");
    status.replaceChildren(errs.length
      ? h("div", { class: "cf-msg error" }, h("span", { class: "cf-msg-k" }, "fix"), h("span", {}, `${errs.length} problem(s) first — see the list next to the preview. You can still download.`))
      : h("div", { class: "cf-msg ok" }, h("span", { class: "cf-msg-k" }, "ok"), h("span", {}, "The config passes the checks.")));
    pertBtn.hidden = !store.perturbers;
    const hasFits = !!(store.fits && store.fits.cx !== null && store.fits.view);
    const li = (name, ok, note) => h("li", { class: ok ? "" : "muted" }, h("span", { class: "cf-tick" }, ok ? "✓" : "–"), h("code", {}, name), note ? h("span", { class: "muted small" }, " " + note) : null);
    files.replaceChildren(
      li("config.json", true), li("run_alpaca_settings.py", true),
      li("data/image.fits", hasFits, hasFits ? "" : "load a FITS file in the Data tab"),
      li("data/noise_map.fits", hasFits && store.fits.err >= 0, hasFits && store.fits.err < 0 ? "no ERR extension chosen" : ""),
      li("data/mask_likelihood.fits", hasFits), li("data/mask_lens_only.fits", hasFits),
      li("data/perturbers.json", !!store.perturbers, store.perturbers ? "" : "optional"),
      li("data/psf_supersampled.fits · psf_starred_seed.npz · psf_error_map.fits", false, "from STARRED — see the PSF tab"));
  };
  subscribe(refresh);
  refresh();
  return { refresh };
}
