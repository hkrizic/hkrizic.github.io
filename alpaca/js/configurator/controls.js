// The "Model" tab: one card per config section with the settings people actually change,
// as switches, sliders and choices with a one-line explanation each. Everything else is
// in the "Everything" tab.
import { h, icon } from "./dom.js";
import { get, set, shipped, effective, subscribe } from "./state.js";

const LL = ["sersic", "double-sersic", "triple-sersic", "MGE", "MGE+double-sersic", "MGE+triple-sersic"];
const isQuasar = () => effective("light.point_sources.enabled") !== false;
const hasMGE = () => [effective("light.lens.initial"), effective("light.lens.refit.profile")].some((p) => String(p).includes("MGE"));

// kind: toggle | seg | slider | num | text | pair | multi | intlist | autonum | thetaE
export const SECTIONS = [
  {
    id: "run", title: "Run", blurb: "What to run and where the results go.",
    controls: [
      { path: "run.multistart", kind: "toggle", label: "Find the best fit", hint: "Stages 1–3: many random starts, lens-light refit, pixelated source. Minutes on a GPU." },
      { path: "run.sampling", kind: "toggle", label: "Then sample the posterior", hint: "NUTS from the best fit: every parameter gets an uncertainty. Hours on GPUs. Or run with --fit-only first." },
      { path: "run.output_dir", kind: "text", label: "Output folder", hint: "Everything the run writes ends up here." },
      { path: "run.random_seed", kind: "num", label: "Random seed", hint: "Same seed + same config = the same run.", step: 1 },
      { path: "run.resume_from_previous", kind: "toggle", label: "Resume a previous best fit", hint: "Skip the fit and reload it from the folder below." },
      { path: "run.resume_multistart_path", kind: "text", nullable: "none", label: "Previous best-fit folder", hint: "e.g. run/03_multistart", showIf: () => effective("run.resume_from_previous") },
    ],
  },
  {
    id: "data", title: "Data", blurb: "The image grid. The Data tab fills these from your FITS file.",
    controls: [
      { path: "data.pix_scale", kind: "num", label: "Pixel scale", unit: "″/px", step: 0.0001, hint: "Arcseconds per pixel. JWST NIRCam: 0.031 (short wave), 0.063 (long wave).",
        quick: [["NIRCam SW", 0.031228698402951588], ["NIRCam LW", 0.06300817082234353], ["HST WFC3/IR", 0.13], ["HST ACS", 0.05]] },
      { path: "data.cutout_size", kind: "slider", min: 31, max: 501, step: 2, label: "Model cutout", unit: "px", odd: true,
        hint: "Side of the square that is modelled (odd). About 5–6 Einstein radii is plenty.",
        extra: (v) => { const p = effective("data.pix_scale"); return p && v ? `= ${(v * p).toFixed(2)}″` : ""; } },
      { path: "data.source_oversample", kind: "seg", label: "Source supersampling", choices: [1, 2, 3, 4, 5], hint: "Each image pixel is ray-traced n×n times. 3 is a good default." },
      { path: "data.likelihood_mask_path", kind: "text", nullable: "none", label: "Likelihood mask", hint: "FITS with 1 = pixel counts in the fit. Draw it in the Data tab." },
      { path: "data.lens_center_search_radius", kind: "slider", min: 0.05, max: 1.5, step: 0.05, unit: "″", label: "Lens-centre search radius", hint: "How far from LENS_POSITION the lens light peak may be." },
      { path: "data.n_ps_detect", kind: "seg", label: "Number of quasar images", choices: [[null, "auto"], [2, "2"], [4, "4"]], hint: "Auto finds them; fix it if a faint image is missed.", showIf: isQuasar },
      { path: "data.ps_min_peak_frac", kind: "slider", min: 0.01, max: 0.5, step: 0.01, label: "Faintest image", hint: "Peaks fainter than this fraction of the brightest are ignored.", showIf: isQuasar },
      { path: "data.ps_lens_mask_radius", kind: "slider", min: 0, max: 1.5, step: 0.05, unit: "″", label: "No images inside", hint: "Peaks this close to the lens centre are lens light, not images.", showIf: isQuasar },
    ],
  },
  {
    id: "mass", title: "Mass", blurb: "What bends the light: the lens galaxy and its neighbours.",
    controls: [
      { path: "mass.main.profile", kind: "seg", label: "Lens mass profile", choices: [["EPL+Shear", "power law + shear"], ["BPL+Shear", "broken power law + shear"]], hint: "The elliptical power law is the standard choice." },
      { path: "mass.main.theta_E_prior", kind: "thetaE", label: "Einstein-radius guess", hint: "Roughly the ring radius. Needed for galaxy–galaxy lenses; draw it in the Data tab." },
      { path: "mass.main.center_sigma", kind: "num", nullable: "auto", unit: "″", step: 0.01, label: "Lens-centre prior width", hint: "How far the mass centre may move from the light. Auto = the built-in prior." },
      { path: "mass.main.multipoles.orders", kind: "multi", label: "Multipoles", choices: [[1, "m=1 lopsided"], [3, "m=3 triangular"], [4, "m=4 disky / boxy"]], hint: "Angular structure beyond an ellipse. Start without; add m=3+m=4 if arcs demand it." },
      { path: "mass.main.multipoles.sigma_default", kind: "slider", min: 0.005, max: 0.1, step: 0.005, label: "Multipole prior width", hint: "Typical multipole strength allowed.", showIf: () => (effective("mass.main.multipoles.orders") || []).length > 0 },
      { path: "mass.main.flexion.enabled", kind: "toggle", label: "External flexion", hint: "Third-order environment term (gradient of the shear). For crowded fields." },
      { path: "mass.perturbers.path", kind: "text", nullable: "none", label: "Perturber catalogue", hint: "Nearby galaxies that add their own deflection. Build it in Delays & perturbers." },
      { path: "mass.perturbers.mode", kind: "seg", label: "Planes", choices: [["auto", "multi-plane when needed"], ["single_plane", "all in the lens plane"]], hint: "Perturbers at other redshifts are put on their own planes in auto mode.", showIf: () => !!effective("mass.perturbers.path") },
      { path: "mass.perturbers.priors.fix_positions", kind: "toggle", label: "Fix perturber positions", hint: "Recommended: their light gives the position.", showIf: () => !!effective("mass.perturbers.path") },
      { path: "mass.perturbers.priors.theta_E_max_factor", kind: "slider", min: 1, max: 10, step: 0.5, label: "Perturber θE up to", unit: "× catalogue", hint: "Upper bound of each perturber's Einstein radius.", showIf: () => !!effective("mass.perturbers.path") },
    ],
  },
  {
    id: "light", title: "Light", blurb: "What shines: the lens galaxy, the sky and the quasar images.",
    controls: [
      { path: "light.point_sources.enabled", kind: "toggle", label: "Quasar images (point sources)", hint: "On for lensed quasars, off for galaxy–galaxy lenses." },
      { path: "light.point_sources.position_bound_px", kind: "num", nullable: "unbounded", step: 0.5, unit: "px", label: "Image positions may move", hint: "Hard limit around the detected positions. Unbounded = a 1-px Gaussian prior.", showIf: isQuasar },
      { path: "light.lens.initial", kind: "seg", label: "Lens light, first try", choices: LL, hint: "Sérsic profiles; MGE = a stack of Gaussians for complex galaxies." },
      { path: "light.lens.couple_sersic_ellipticities", kind: "toggle", label: "Same shape for all Sérsics", hint: "One ellipticity for every component." },
      { path: "light.lens.couple_sersic_centers", kind: "toggle", label: "Same centre for all Sérsics", hint: "Recommended for a regular elliptical." },
      { path: "light.lens.refit.enabled", kind: "toggle", label: "Lens-light refit (stage 2)", hint: "Refit the lens light on the larger frame, with neighbours masked." },
      { path: "light.lens.refit.profile", kind: "seg", label: "Refit profile", choices: ["same", ...LL], hint: "May be richer than the first try.", showIf: () => effective("light.lens.refit.enabled") },
      { path: "light.lens.refit.mask_path", kind: "text", nullable: "none", label: "Refit mask", hint: "Frame-sized FITS, 1 = use. Draw its holes in the Data tab.", showIf: () => effective("light.lens.refit.enabled") },
      { path: "light.lens.refit.ps_treatment", kind: "seg", label: "Quasar cores in the refit", choices: ["mask", "downweight", "sigma_clip"], hint: "How the bright point images are kept out of the lens-light refit.", showIf: () => effective("light.lens.refit.enabled") && isQuasar() },
      { path: "light.lens.refit.uncouple_centers", kind: "toggle", label: "Refit: components may shift", hint: "Allows lopsided light (small centre offsets between components).", showIf: () => effective("light.lens.refit.enabled") },
      { path: "light.lens.refit.uncouple_ellipticities", kind: "toggle", label: "Refit: components may twist", hint: "Each component gets its own shape (isophote twist).", showIf: () => effective("light.lens.refit.enabled") },
      { path: "light.lens.mge.n_components", kind: "slider", min: 4, max: 40, step: 1, label: "MGE Gaussians", hint: "More = more freedom for the lens light.", showIf: hasMGE },
      { path: "light.sky_background", kind: "toggle", label: "Fit a sky level", hint: "A constant background left over after sky subtraction." },
      { path: "light.sky_background_fixed_amp", kind: "seg", label: "Sky after the refit", choices: [[null, "keep fitting"], ["refit", "fix at the refit value"]], hint: "Fixing it removes a degeneracy with the lens-light wings.", showIf: () => effective("light.sky_background") },
    ],
  },
  {
    id: "stages", title: "Stages", blurb: "How hard the optimiser works. Stage 1 smooth source, stage 3 pixelated source.",
    controls: [
      { path: "stages.gd.source.n_max", kind: "slider", min: 4, max: 30, step: 1, label: "Stage-1 source detail", hint: "Shapelet order of the smooth starting source." },
      { path: "stages.gd.optimizer.halving.keep", kind: "intlist", label: "Random starts kept per round", hint: "Starts are halved each round; the first number is how many survive the first.",
        quick: [["fast", [32, 16, 8, 4, 2]], ["thorough", [64, 32, 16, 8, 4]]] },
      { path: "stages.gd.optimizer.refine.top", kind: "slider", min: 1, max: 10, step: 1, label: "Best starts refined", hint: "How many of the finalists are polished at the end." },
      { path: "stages.cf_warmstart.enabled", kind: "toggle", label: "Stage-2 warm start", hint: "Gentle start of the pixelated source before the joint fit." },
      { path: "stages.cf_joint.enabled", kind: "toggle", label: "Stage 3: pixelated source", hint: "A correlated-field source fitted with everything else. The heart of ALPACA." },
      { path: "stages.cf_joint.lens_light", kind: "seg", label: "Lens light in stage 3", choices: ["free", "fixed"], hint: "Fixed keeps the refit light; free lets it adjust.", showIf: () => effective("stages.cf_joint.enabled") },
      { path: "stages.cf_joint.source.num_pixels", kind: "seg", label: "Source grid", unit: "px", choices: [64, 80, 96, 128, 160, 192, 256], hint: "Pixels per side of the source image.", showIf: () => effective("stages.cf_joint.enabled") },
      { path: "stages.cf_joint.source.loglogavgslope", kind: "pair", labels: ["mean", "width"], label: "Source smoothness (slope)", hint: "Power-spectrum slope: more negative = smoother. Fix it by cross-validation, small width.", showIf: () => effective("stages.cf_joint.enabled") },
      { path: "stages.cf_joint.source.fluctuations", kind: "pair", labels: ["mean", "width"], label: "Source contrast (fluctuations)", hint: "How strongly the source varies around its mean.", showIf: () => effective("stages.cf_joint.enabled") },
      { path: "stages.cf_joint.source.mean_intensity", kind: "num", nullable: "auto", step: 0.001, label: "Source baseline", hint: "Auto = 70th percentile of the image. A dark baseline (~0.1× noise) suits fixed smoothness.", showIf: () => effective("stages.cf_joint.enabled") },
      { path: "stages.cf_joint.source.arc_mask.outer_radius", kind: "autonum", unit: "″", step: 0.1, label: "Arc region, outer radius", hint: "The source is fitted where the arcs are.", showIf: () => effective("stages.cf_joint.enabled") },
      { path: "stages.cf_joint.adam_steps", kind: "slider", log: true, min: 1000, max: 200000, label: "Stage-3 steps", hint: "Upper limit; with convergence on, the stage stops earlier.", showIf: () => effective("stages.cf_joint.enabled") },
      { path: "stages.cf_joint.convergence.enabled", kind: "toggle", label: "Stop when converged", hint: "Ends stage 3 when the loss stops improving.", showIf: () => effective("stages.cf_joint.enabled") },
      { path: "stages.cf_joint.convergence.window", kind: "num", step: 500, label: "Convergence window", unit: "steps", hint: "The loss is compared over this many steps.", showIf: () => effective("stages.cf_joint.enabled") && effective("stages.cf_joint.convergence.enabled") },
      { path: "stages.cf_joint.convergence.abs_tol", kind: "num", step: 0.5, label: "Convergence tolerance", unit: "Δχ²", hint: "Converged when the loss improved less than this over the window.", showIf: () => effective("stages.cf_joint.enabled") && effective("stages.cf_joint.convergence.enabled") },
    ],
  },
  {
    id: "psf", title: "PSF", blurb: "The blur. Built from stars with STARRED (see the PSF tab), refined in the fit.",
    controls: [
      { path: "psf.mode", kind: "seg", label: "PSF mode", choices: [["joint", "joint (fitted with the lens)"], ["fixed", "fixed"], ["iterative", "iterative"]], hint: "Joint is the default and the best." },
      { path: "psf.input.oversample", kind: "seg", label: "PSF supersampling", choices: [1, 2, 3, 4, 5], hint: "STARRED writes 3× supersampled PSFs." },
      { path: "psf.joint.seed_path", kind: "text", nullable: "none", label: "STARRED seed", hint: "psf_starred_seed.npz from STARRED.", showIf: () => effective("psf.mode") === "joint" },
      { path: "psf.input.error_map_path", kind: "text", nullable: "none", label: "PSF error map", hint: "psf_error_map.fits from STARRED." },
      { path: "psf.joint.free", kind: "multi", label: "Fitted PSF parts", choices: [["moffat", "Moffat core"], ["background", "pixel background"]], hint: "Which parts of the PSF move during the fit.", showIf: () => effective("psf.mode") === "joint" },
    ],
  },
  {
    id: "likelihood", title: "Likelihood", blurb: "What counts as a good fit: pixels, image positions, delays.",
    controls: [
      { path: "likelihood.astrometry_mode", kind: "seg", label: "Image-position term", choices: [["image_plane", "image plane (recommended)"], ["source_plane", "source plane"]], hint: "Compare predicted and observed image positions in the image plane." },
      { path: "likelihood.sigma_ast", kind: "num", step: 0.001, unit: "″", label: "Position uncertainty", hint: "Astrometric error of the quasar images.", showIf: isQuasar },
      { path: "likelihood.use_time_delays", kind: "toggle", label: "Time delays", hint: "Use measured delays (quasars). Enter them in Delays & perturbers.", showIf: isQuasar },
      { path: "likelihood.use_rayshoot_consistency", kind: "toggle", label: "Images meet in the source", hint: "The quasar images must trace back to one source position.", showIf: isQuasar },
      { path: "likelihood.noise_model.use_psf_error_map", kind: "toggle", label: "PSF-error term", hint: "Extra noise at the quasar cores for PSF imperfections.", showIf: isQuasar },
      { path: "likelihood.noise_model.psf_error_b_max", kind: "slider", min: 0, max: 1, step: 0.05, label: "PSF-error strength (max)", hint: "Upper limit of the PSF-error amplitude.", showIf: () => isQuasar() && effective("likelihood.noise_model.use_psf_error_map") },
      { path: "likelihood.D_dt_prior.low", kind: "num", step: 100, unit: "Mpc", label: "D_Δt prior, low", hint: "Range of the time-delay distance.", showIf: () => isQuasar() && effective("likelihood.use_time_delays") },
      { path: "likelihood.D_dt_prior.high", kind: "num", step: 100, unit: "Mpc", label: "D_Δt prior, high", hint: "", showIf: () => isQuasar() && effective("likelihood.use_time_delays") },
      { path: "likelihood.use_kinematics", kind: "toggle", label: "Stellar kinematics", hint: "Velocity dispersion of the lens. Set the details under Everything → kinematics." },
      { path: "likelihood.kinematics.observed_sigma", kind: "num", nullable: "none", step: 1, unit: "km/s", label: "Measured velocity dispersion", hint: "", showIf: () => effective("likelihood.use_kinematics") },
      { path: "likelihood.kinematics.sigma_error", kind: "num", nullable: "none", step: 1, unit: "km/s", label: "Its uncertainty", hint: "", showIf: () => effective("likelihood.use_kinematics") },
    ],
  },
  {
    id: "sampling", title: "Sampling", blurb: "The posterior: how long the chains run.",
    controls: [
      { path: "sampling.sampler", kind: "seg", label: "Sampler", choices: [["nifty", "NIFTy (NUTS)"], ["nuts", "NUTS"], ["nautilus", "Nautilus"]], hint: "NIFTy runs NUTS on the full model including the pixelated source." },
      { path: "sampling.nifty.mode", kind: "seg", label: "NIFTy mode", choices: ["nuts_only", "vi+nuts", "vi_only"], hint: "nuts_only is the production setting.", showIf: () => effective("sampling.sampler") === "nifty" },
      { path: "sampling.nifty.nuts.n_warmup", kind: "slider", min: 50, max: 3000, step: 50, label: "Warm-up steps", hint: "Tuning steps per chain (discarded).", showIf: () => effective("sampling.sampler") === "nifty" },
      { path: "sampling.nifty.nuts.n_samples", kind: "slider", min: 50, max: 5000, step: 50, label: "Samples per chain", hint: "Kept draws per chain.", showIf: () => effective("sampling.sampler") === "nifty" },
      { path: "sampling.nifty.nuts.n_chains", kind: "seg", label: "Chains", choices: [1, 2, 4, 8], hint: "One per GPU is ideal; ≥ 2 to check convergence (R̂).", showIf: () => effective("sampling.sampler") === "nifty" },
      { path: "sampling.nifty.nuts.target_accept", kind: "slider", min: 0.6, max: 0.99, step: 0.01, label: "Target acceptance", hint: "Higher = smaller, safer steps, slower.", showIf: () => effective("sampling.sampler") === "nifty" },
      { path: "sampling.nifty.nuts.max_tree_depth", kind: "slider", min: 6, max: 15, step: 1, label: "Max tree depth", hint: "Longest trajectory 2^depth steps.", showIf: () => effective("sampling.sampler") === "nifty" },
    ],
  },
  {
    id: "blinding", title: "Blinding", blurb: "Hide the cosmology while you model, unblind at the end.",
    controls: [
      { path: "blinding.enabled", kind: "toggle", label: "Blind the results", hint: "Offsets hide the absolute γ, D_Δt and H₀ until the collaboration unblinds." },
      { path: "blinding.scenario", kind: "seg", label: "Scenario", choices: [[null, "auto"], ["first", "first analysis"], ["previously_analyzed", "previously analysed"], ["no_delays", "no delays"]], hint: "Which parameters are blinded.", showIf: () => effective("blinding.enabled") },
      { path: "blinding.blind_stored_samples", kind: "toggle", label: "Blind stored samples too", hint: "No file on disk holds an absolute value.", showIf: () => effective("blinding.enabled") },
    ],
  },
  {
    id: "plotting", title: "Plots", blurb: "Figures written by the run.",
    controls: [
      { path: "plotting.save_plots", kind: "toggle", label: "Save figures", hint: "" },
      { path: "plotting.plot_format", kind: "seg", label: "Format", choices: ["png", "pdf", "svg"], hint: "", showIf: () => effective("plotting.save_plots") },
      { path: "plotting.dpi", kind: "seg", label: "Resolution", unit: "dpi", choices: [150, 300, 600], hint: "", showIf: () => effective("plotting.save_plots") },
    ],
  },
];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const roundStep = (v, step) => (step ? +(Math.round(v / step) * step).toFixed(10) : v);

function choiceList(c) { return c.choices.map((x) => (Array.isArray(x) ? x : [x, String(x)])); }

// Build the input element(s) of one control; returns {el, refresh}.
function input(c) {
  const val = () => effective(c.path);
  switch (c.kind) {
    case "toggle": {
      const b = h("button", { class: "cf-switch", type: "button", role: "switch", onclick: () => set(c.path, !val(), c.path) }, h("span"));
      return { el: b, refresh: () => { b.setAttribute("aria-checked", val() ? "true" : "false"); b.classList.toggle("on", !!val()); } };
    }
    case "seg":
    case "multi": {
      const wrap = h("div", { class: "chips cf-seg" });
      const btns = choiceList(c).map(([v, label]) => {
        const b = h("button", { class: "chip", type: "button" }, label);
        b.addEventListener("click", () => {
          if (c.kind === "seg") set(c.path, v, c.path);
          else {
            const cur = Array.isArray(val()) ? [...val()] : [];
            const i = cur.findIndex((x) => same(x, v));
            if (i >= 0) cur.splice(i, 1); else cur.push(v);
            const order = choiceList(c).map(([x]) => JSON.stringify(x));
            cur.sort((a, b) => order.indexOf(JSON.stringify(a)) - order.indexOf(JSON.stringify(b)));
            set(c.path, cur, c.path);
          }
        });
        wrap.append(b);
        return [v, b];
      });
      return {
        el: wrap,
        refresh: () => {
          const cur = val();
          for (const [v, b] of btns) b.classList.toggle("on", c.kind === "seg" ? same(cur ?? null, v) : Array.isArray(cur) && cur.some((x) => same(x, v)));
        },
      };
    }
    case "slider": {
      const toS = (v) => (c.log ? Math.log10(v) : v);
      const fromS = (s) => (c.log ? Math.round(10 ** s / 1000) * 1000 || 10 ** s : s);
      const r = h("input", { type: "range", min: toS(c.min), max: toS(c.max), step: c.log ? 0.01 : c.step });
      const n = h("input", { type: "number", class: "cf-num", step: c.step || "any" });
      const extra = h("span", { class: "muted small cf-extra" });
      const commit = (v) => {
        if (!Number.isFinite(v)) return;
        if (c.odd) { v = Math.round(v); if (v % 2 === 0) v += 1; }
        else v = roundStep(v, c.step);
        set(c.path, v, c.path);
      };
      r.addEventListener("input", () => commit(fromS(+r.value)));
      n.addEventListener("change", () => commit(+n.value));
      return {
        el: h("div", { class: "cf-slider" }, r, n, c.unit ? h("span", { class: "muted small" }, c.unit) : null, extra),
        refresh: () => {
          const v = val();
          if (typeof v === "number") { r.value = toS(Math.min(c.max, Math.max(c.min, v))); if (document.activeElement !== n) n.value = v; }
          else n.value = "";
          extra.textContent = c.extra ? c.extra(v) : "";
        },
      };
    }
    case "num":
    case "text":
    case "autonum": {
      const isNum = c.kind !== "text";
      const nullLabel = c.kind === "autonum" ? "auto" : c.nullable;
      const nullValue = c.kind === "autonum" ? "auto" : null;
      const inp = h("input", { type: isNum ? "number" : "text", class: isNum ? "cf-num" : "cf-text", step: c.step || "any", spellcheck: "false" });
      const nb = nullLabel ? h("button", { class: "chip", type: "button" }, nullLabel) : null;
      inp.addEventListener("change", () => {
        if (inp.value === "" && nullLabel) return set(c.path, nullValue, c.path);
        set(c.path, isNum ? +inp.value : inp.value, c.path);
      });
      if (nb) nb.addEventListener("click", () => {
        const isNull = same(val(), nullValue) || val() === null;
        if (!isNull) set(c.path, nullValue, c.path);
        else {
          const s = shipped(c.path);
          set(c.path, s !== null && s !== undefined && !same(s, nullValue) ? s : (isNum ? 0 : ""), c.path);
        }
      });
      return {
        el: h("div", { class: "cf-inline" }, inp, c.unit ? h("span", { class: "muted small" }, c.unit) : null, nb),
        refresh: () => {
          const v = val();
          const isNull = v === null || v === undefined || same(v, nullValue);
          if (nb) nb.classList.toggle("on", isNull);
          inp.disabled = isNull && !!nb;
          if (document.activeElement !== inp) inp.value = isNull ? "" : v;
          inp.placeholder = isNull ? (nullLabel || "") : "";
        },
      };
    }
    case "pair": {
      const a = h("input", { type: "number", class: "cf-num", step: "any" });
      const b = h("input", { type: "number", class: "cf-num", step: "any" });
      const commit = () => set(c.path, [+a.value, +b.value], c.path);
      a.addEventListener("change", commit); b.addEventListener("change", commit);
      return {
        el: h("div", { class: "cf-inline" }, h("span", { class: "muted small" }, c.labels[0]), a, h("span", { class: "muted small" }, c.labels[1]), b),
        refresh: () => { const v = val() || [0, 0]; if (document.activeElement !== a) a.value = v[0]; if (document.activeElement !== b) b.value = v[1]; },
      };
    }
    case "intlist": {
      const inp = h("input", { type: "text", class: "cf-text", spellcheck: "false" });
      inp.addEventListener("change", () => {
        const v = inp.value.split(/[\s,]+/).filter(Boolean).map(Number);
        if (v.every((x) => Number.isInteger(x) && x > 0)) set(c.path, v, c.path);
      });
      return { el: h("div", { class: "cf-inline" }, inp), refresh: () => { if (document.activeElement !== inp) inp.value = (val() || []).join(", "); } };
    }
    case "thetaE": {
      const on = h("button", { class: "cf-switch", type: "button", role: "switch" }, h("span"));
      const r = h("input", { type: "range", min: 0.1, max: 4, step: 0.01 });
      const n = h("input", { type: "number", class: "cf-num", step: 0.01, min: 0.01 });
      const s = h("input", { type: "number", class: "cf-num", step: 0.1, min: 0.01 });
      const cur = () => get(c.path);
      on.addEventListener("click", () => set(c.path, cur() ? null : { center: 1.0, sigma: 10.0 }, c.path));
      const setC = (v) => { if (v > 0) set(c.path, { ...(cur() || { sigma: 10.0 }), center: roundStep(v, 0.001) }, c.path); };
      r.addEventListener("input", () => setC(+r.value));
      n.addEventListener("change", () => setC(+n.value));
      s.addEventListener("change", () => { if (+s.value > 0) set(c.path, { ...(cur() || { center: 1.0 }), sigma: +s.value }, c.path); });
      const body = h("div", { class: "cf-slider" }, r, n, h("span", { class: "muted small" }, "″  ± "), s, h("span", { class: "muted small" }, "″"));
      return {
        el: h("div", { class: "cf-thetae" }, on, body),
        refresh: () => {
          const v = cur();
          on.classList.toggle("on", !!v); on.setAttribute("aria-checked", v ? "true" : "false");
          body.classList.toggle("off", !v);
          for (const x of [r, n, s]) x.disabled = !v;
          if (v) {
            r.value = v.center ?? 1;
            if (document.activeElement !== n) n.value = v.center ?? "";
            if (document.activeElement !== s) s.value = v.sigma ?? "";
          }
        },
      };
    }
  }
  throw new Error("unknown control kind " + c.kind);
}

export function controlRow(c) {
  const { el, refresh } = input(c);
  const dot = h("span", { class: "cf-dot", title: "changed from the shipped config" });
  const reset = h("button", { class: "icon-btn cf-reset", type: "button", title: "back to the shipped value" }, "↺");
  reset.addEventListener("click", () => set(c.path, structuredClone(shipped(c.path) ?? null), c.path));
  const quick = c.quick ? h("div", { class: "chips cf-quick" }, c.quick.map(([label, v]) => {
    const b = h("button", { class: "chip", type: "button" }, label);
    b.addEventListener("click", () => set(c.path, structuredClone(v), c.path));
    return b;
  })) : null;
  const row = h("div", { class: "cf-row", "data-path": c.path },
    h("div", { class: "cf-row-head" }, dot, h("span", { class: "cf-label" }, c.label), h("code", { class: "cf-key" }, c.path), reset),
    el, quick,
    c.hint ? h("div", { class: "cf-hint" }, c.hint) : null);
  const update = () => {
    const show = !c.showIf || c.showIf();
    row.hidden = !show;
    if (!show) return;
    refresh();
    const changed = !same(get(c.path), shipped(c.path));
    row.classList.toggle("changed", changed);
    reset.hidden = !changed;
  };
  return { row, update };
}

export function renderCards(root) {
  const updaters = [];
  const grid = h("div", { class: "cf-cards" });
  for (const s of SECTIONS) {
    const rows = s.controls.map(controlRow);
    updaters.push(...rows.map((r) => r.update));
    const count = h("span", { class: "badge ok cf-count" });
    updaters.push(() => {
      const n = s.controls.filter((c) => !same(get(c.path), shipped(c.path))).length;
      count.textContent = n ? `${n} changed` : "shipped";
      count.className = "badge cf-count " + (n ? "" : "ok");
    });
    grid.append(h("section", { class: "cf-card", id: "card-" + s.id },
      h("header", {}, icon(s.id), h("div", {}, h("h3", {}, s.title), h("p", { class: "muted small" }, s.blurb)), count),
      rows.map((r) => r.row)));
  }
  root.append(grid);
  const all = () => updaters.forEach((f) => f());
  subscribe(all);
  all();
  return { refresh: all };
}

