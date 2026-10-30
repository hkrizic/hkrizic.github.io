// Checks run on every change. Errors mirror what ALPACA's loader rejects (or what
// makes a run pointless); warnings are choices worth a second look.
import { store, get, effective } from "./state.js";

const STRICT = {
  "light.point_sources": ["enabled", "fft_rendering", "position_bound_px"],
  "sampling.nifty.warmstart": ["polish", "maxiter", "gtol", "stop_after"],
  "likelihood.D_dt_prior": ["type", "low", "high"],
  "likelihood.kappa_ext_prior": ["mean", "sigma"],
  "stages.cf_joint.convergence": ["enabled", "window", "abs_tol", "rel_tol", "min_steps"],
};

export function validate(fits) {
  const out = [];
  const err = (msg, path) => out.push({ level: "error", msg, path });
  const warn = (msg, path) => out.push({ level: "warn", msg, path });
  const info = (msg, path) => out.push({ level: "info", msg, path });

  const cut = effective("data.cutout_size");
  if (cut !== null && cut !== undefined) {
    if (!Number.isInteger(cut) || cut % 2 === 0) err(`data.cutout_size = ${cut} must be an odd whole number (the lens sits on the centre pixel)`, "data.cutout_size");
    if (fits && fits.N && cut > fits.N) err(`cutout (${cut} px) is larger than the exported frame (${fits.N} px)`, "data.cutout_size");
  }
  const ps = effective("data.pix_scale");
  if (!(typeof ps === "number" && ps > 0)) err("data.pix_scale must be a positive number (arcsec per pixel)", "data.pix_scale");

  const quasar = effective("light.point_sources.enabled") !== false;
  const tE = get("mass.main.theta_E_prior");
  if (!quasar && !(tE && typeof tE.center === "number" && tE.center > 0)) {
    err("galaxy–galaxy lens: give a rough Einstein radius (mass.main.theta_E_prior.center) — without point images ALPACA has no other first guess", "mass.main.theta_E_prior");
  }
  if (tE && !(typeof tE.sigma === "number" && tE.sigma > 0)) err("mass.main.theta_E_prior needs a positive sigma", "mass.main.theta_E_prior");

  if (effective("likelihood.use_time_delays")) {
    const td = get("likelihood.time_delays");
    const n = td && td.delays ? Object.keys(td.delays).length : 0;
    if (!n) err("likelihood.use_time_delays is on but likelihood.time_delays has no delays — fill the delay table or switch delays off", "likelihood.time_delays");
    if (!quasar) err("time delays need point images: switch light.point_sources.enabled on (or delays off)", "likelihood.use_time_delays");
    if (td && td.delays) {
      for (const [k, v] of Object.entries(td.delays)) {
        if (!/^[A-Z][A-Z]$/i.test(k)) err(`delay key "${k}" must be two image labels, e.g. "AB"`, "likelihood.time_delays");
        if (!Array.isArray(v) || v.length < 2 || v.some((x) => typeof x !== "number" || !Number.isFinite(x))) err(`delay "${k}" must be [value, error] or [value, +error, −error] in days`, "likelihood.time_delays");
        else if (v.slice(1).some((x) => x <= 0)) err(`delay "${k}": errors must be positive`, "likelihood.time_delays");
      }
    }
  }
  if (effective("likelihood.astrometry_mode") !== "image_plane") {
    warn(get("likelihood.astrometry_mode") === undefined
      ? "likelihood.astrometry_mode is not set: the code default is source_plane — set image_plane (recommended)"
      : "likelihood.astrometry_mode: image_plane is the recommended default", "likelihood.astrometry_mode");
  }

  const gdType = effective("stages.gd.source.type");
  if (!["shapelets", "sersic", "double-sersic", "corr_field"].includes(gdType)) err(`stages.gd.source.type "${gdType}" is not one of shapelets, sersic, double-sersic, corr_field`, "stages.gd.source.type");
  if (effective("stages.cf_joint.enabled")) {
    if (gdType !== "shapelets") err("stages.cf_joint needs stages.gd.source.type = shapelets", "stages.gd.source.type");
    const t = effective("stages.cf_joint.source.type");
    if (t !== undefined && t !== "corr_field") err("stages.cf_joint.source.type must be corr_field", "stages.cf_joint.source.type");
    if (!["fixed", "free"].includes(effective("stages.cf_joint.lens_light"))) err("stages.cf_joint.lens_light must be fixed or free", "stages.cf_joint.lens_light");
  }
  for (const [block, allowed] of Object.entries(STRICT)) {
    const b = get(block);
    if (b && typeof b === "object") {
      const bad = Object.keys(b).filter((k) => !allowed.includes(k));
      if (bad.length) err(`${block}: unknown key(s) ${bad.join(", ")} (valid: ${allowed.join(", ")})`, block);
    }
  }
  const nifty = effective("sampling.sampler") === "nifty";
  if (effective("run.sampling") && nifty) {
    for (const k of ["n_warmup", "n_samples"]) {
      const v = effective(`sampling.nifty.nuts.${k}`);
      if (!(Number.isInteger(v) && v > 0)) err(`sampling.nifty.nuts.${k} must be a positive integer`, `sampling.nifty.nuts.${k}`);
    }
    const ta = effective("sampling.nifty.nuts.target_accept");
    if (!(ta > 0 && ta < 1)) err("sampling.nifty.nuts.target_accept must be between 0 and 1", "sampling.nifty.nuts.target_accept");
  }
  if (effective("psf.mode") === "joint" && !effective("psf.joint.seed_path")) warn("psf.mode = joint without psf.joint.seed_path: the joint PSF starts from a plain Moffat (make a STARRED seed, see the PSF tab)", "psf.joint.seed_path");
  if (effective("likelihood.noise_model.use_psf_error_map") && !effective("psf.input.error_map_path")) warn("use_psf_error_map is on but psf.input.error_map_path is empty", "psf.input.error_map_path");
  if (effective("light.lens.refit.enabled") && !effective("light.lens.refit.mask_path")) warn("the lens-light refit runs without a mask (light.lens.refit.mask_path): neighbours and bad pixels enter the fit", "light.lens.refit.mask_path");
  if (!effective("data.likelihood_mask_path")) info("no likelihood mask: every pixel of the cutout counts", "data.likelihood_mask_path");
  if (effective("mass.perturbers.path") && !store.perturbers) info(`mass.perturbers.path = ${effective("mass.perturbers.path")}: put that catalogue next to config.json (or build one in the Delays & perturbers tab)`, "mass.perturbers.path");
  if (quasar && !store.run.IMAGE_POSITIONS && effective("likelihood.use_time_delays")) warn("no IMAGE_POSITIONS: images are labelled clockwise from north, which may not match the published labels of the delays", "likelihood.time_delays");
  if (effective("blinding.enabled") && !effective("likelihood.use_time_delays")) info("blinding is on without time delays — fine, but usually only needed for cosmography", "blinding.enabled");
  return out;
}
