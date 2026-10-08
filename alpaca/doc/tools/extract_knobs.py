"""Extract every ALPACA configuration knob (JSON layout) with type, default and documentation.

Run inside an environment where `alpaca` imports (the version being documented):

    ALPACA_BACKEND=cpu python extract_knobs.py <alpaca repo> <curated reference html> <out knobs.json>

Sources, in order of precedence for the explanation text:
  1. the curated ALPACA configuration reference (hand-written explanations, warnings, related keys);
  2. the numpy-style docstrings of the dataclasses in alpaca/config.py;
  3. comments next to the field definitions in alpaca/config.py.
Types and defaults always come from the code / the shipped config.json of the documented version.
"""
import dataclasses
import html
import inspect
import json
import os
import re
import sys
import typing

REPO, REF_HTML, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
sys.path.insert(0, REPO)
import alpaca  # noqa: E402
import alpaca.config as C  # noqa: E402

SHIPPED = json.load(open(os.path.join(REPO, "config.json")))
SRC = inspect.getsource(C)

# ------------------------------------------------------------------ docstrings + comments
def parse_doc(cls):
    out = {}
    doc = inspect.getdoc(cls) or ""
    m = re.search(r"(Parameters|Attributes)\n-+\n(.*)", doc, re.S)
    if m or re.search(r"^\w[\w, ]*\s:\s", doc, re.M):
        body = m.group(2) if m else doc   # some classes list "name : type" entries without a heading
        cur = None
        for line in body.splitlines():
            if re.match(r"^\w[\w, ]*\s*:", line) and not line.startswith(" "):
                cur = line.split(":")[0].strip()
                for name in cur.split(","):
                    out[name.strip()] = ""
                cur = [n.strip() for n in cur.split(",")]
            elif re.match(r"^[A-Z][a-z]+\n?$", line.strip()) and line.strip() in ("Notes", "Examples", "References"):
                cur = None
            elif cur and line.startswith(" "):
                for name in cur:
                    out[name] = (out[name] + " " + line.strip()).strip()
    return out, doc


def field_comments(cls):
    """Comment lines directly above / beside each field in the class body."""
    try:
        src = inspect.getsource(cls)
    except Exception:
        return {}
    out, pending = {}, []
    for line in src.splitlines():
        s = line.strip()
        if s.startswith("#"):
            pending.append(s.lstrip("# ").strip())
            continue
        m = re.match(r"^(\w+)\s*:\s*[^=]+(=.*)?$", s)
        if m and not s.startswith(("def ", "class ", "return")):
            inline = s.split("#", 1)[1].strip() if "#" in s else ""
            txt = " ".join(pending + ([inline] if inline else [])).strip()
            if txt:
                out[m.group(1)] = txt
            pending = []
        elif s:
            pending = []
    return out


def type_str(t):
    s = str(t).replace("typing.", "")
    s = re.sub(r"<class '(\w+)'>", r"\1", s)
    s = s.replace("NoneType", "null").replace("Optional[", "").replace("Literal", "one of ")
    return s


def default_of(f):
    if f.default is not dataclasses.MISSING:
        return f.default
    if f.default_factory is not dataclasses.MISSING:
        try:
            v = f.default_factory()
            return v if not dataclasses.is_dataclass(v) else "{…}"
        except Exception:
            return None
    return None


KNOBS = {}


def add(path, typ, default, doc, cls_name=None, field=None, extra=None):
    k = KNOBS.setdefault(path, {"key": path})
    k.setdefault("type", typ)
    k.setdefault("default", default)
    if doc and not k.get("code_doc"):
        k["code_doc"] = doc
    if cls_name:
        k["runtime"] = f"{cls_name}.{field}" if field else cls_name
    if extra:
        k.update(extra)


def walk_dataclass(cls, prefix, skip=(), rename=None, nested=None):
    """Document every field of `cls` under JSON `prefix`; nested dataclasses recurse via `nested`."""
    rename = rename or {}
    nested = nested or {}
    docs, _ = parse_doc(cls)
    comments = field_comments(cls)
    for f in dataclasses.fields(cls):
        if f.name.startswith("_") or f.name in skip:
            continue
        jname = rename.get(f.name, f.name)
        path = f"{prefix}.{jname}" if prefix else jname
        if f.name in nested:
            sub_cls, sub_prefix = nested[f.name]
            walk_dataclass(sub_cls, sub_prefix or path)
            continue
        ft = f.type if not isinstance(f.type, str) else f.type
        d = default_of(f)
        if dataclasses.is_dataclass(d) or d == "{…}":
            continue
        add(path, type_str(ft), d, docs.get(f.name) or comments.get(f.name), cls.__name__, f.name)


# ------------------------------------------------------------------ the JSON layout -> dataclasses
walk_dataclass(C.DataConfig, "data")
walk_dataclass(C.LikelihoodConfig, "likelihood", nested={"noise_model": (C.NoiseModelConfig, "likelihood.noise_model")})
walk_dataclass(C.NoiseModelConfig, "likelihood.noise_model")
walk_dataclass(C.PSFConfig, "psf", nested={"input": (C.PSFInputConfig, "psf.input"),
                                          "iterative": (C.IterativePSFConfig, "psf.iterative"),
                                          "joint": (C.JointPSFConfig, "psf.joint")})
walk_dataclass(C.IterativePSFConfig, "psf.iterative", nested={
    "masking": (C.PSFMaskingConfig, "psf.iterative.masking"),
    "error_map_during_recon": (C.PSFReconErrorMapConfig, "psf.iterative.error_map_during_recon")})
walk_dataclass(C.JointPSFConfig, "psf.joint", skip=("stages",), nested={
    "priors": (C.JointPriorsConfig, "psf.joint.priors"),
    "regularization": (C.JointRegularizationConfig, "psf.joint.regularization")})
walk_dataclass(C.JointPriorsConfig, "psf.joint.priors", nested={
    "background": (C.JointBackgroundPriorConfig, "psf.joint.priors.background")})
walk_dataclass(C.SamplerConfig, "sampling", rename={"nifty_mode": "nifty.mode"}, nested={
    "nifty_vi": (C.NIFTyVIConfig, "sampling.nifty.vi"), "nifty_nuts": (C.NIFTyNUTSConfig, "sampling.nifty.nuts"),
    "nifty_warmstart": (C.NIFTyWarmstartConfig, "sampling.nifty.warmstart"),
    "nuts": (C.NUTSConfig, "sampling.nuts"), "nautilus": (C.NautilusConfig, "sampling.nautilus")})
walk_dataclass(C.PlottingConfig, "plotting")
walk_dataclass(C.BlindingConfig, "blinding")
walk_dataclass(C.LensMassConfig, "mass.main", nested={
    "multipoles": (C.MultipoleConfig, "mass.main.multipoles"), "bpl": (C.BrokenPowerLawConfig, "mass.main.bpl")})
walk_dataclass(C.PerturbersConfig, "mass.perturbers", nested={
    "priors": (C.PerturberPriorConfig, "mass.perturbers.priors"),
    "cosmology": (C.PerturbersCosmologyConfig, "mass.perturbers.cosmology")})
walk_dataclass(C.LensLightRefitConfig, "light.lens.refit", skip=("freeze_in_cf_joint",),
               rename={"lens_light": "profile"})
walk_dataclass(C.CorrFieldConfig, "stages.cf_joint.source", nested={
    "arc_mask": (C.ArcMaskConfig, "stages.cf_joint.source.arc_mask")})

# keys mapped explicitly in alpaca/utils/config_format.py::to_runtime_dict
GD = C.GDConfig
gd_docs, _ = parse_doc(GD)
gd_comments = field_comments(GD)
explicit = {
    "run.output_dir": ("str", "run/", "Directory for all outputs of this run. A new directory per model variant: "
                       "re-running into an existing directory resumes it.", "output_dir"),
    "run.random_seed": ("int", 42, "Seed for every random choice (multistart draws, perturbations, sampler).", "random_seed"),
    "run.verbose": ("bool", True, "Print progress to stdout.", "verbose"),
    "run.multistart": ("bool", True, "Run the gradient-descent stages (MAP).", "run_multistart"),
    "run.sampling": ("bool", True, "Run posterior sampling after the GD stages.", "run_sampling"),
    "run.resume_from_previous": ("bool", False, "Skip GD and load a previous MAP (for sampling only).", "resume_from_previous"),
    "run.resume_multistart_path": ("str | null", None, "Folder of the previous 03_multistart to load when resuming.", "resume_multistart_path"),
    "config_version": ("int", 2, "Layout version of the file; written automatically.", None),
    "light.lens.initial": ("str", "sersic", "Lens-light model of the GD stage 1 (e.g. 'sersic', 'double-sersic', 'triple-sersic', 'MGE+double-sersic').", None),
    "light.lens.couple_sersic_ellipticities": ("bool", False, "Share one ellipticity between the Sérsic components.", None),
    "light.lens.couple_sersic_centers": ("bool", False, "Share one centre between the Sérsic components.", None),
    "light.lens.ellipticity_max": ("float | null", None, "Upper bound on the lens-light ellipticity components.", None),
    "light.lens.mge.n_components": ("int", 20, "Number of Gaussians in the MGE lens-light model.", None),
    "light.lens.mge.sigma_min": ("float", 0.03, "Smallest MGE width (arcsec).", None),
    "light.lens.mge.sigma_max": ("float", 2.5, "Largest MGE width (arcsec).", None),
    "light.sky_background": ("bool", False, "Fit a constant sky level.", "model.use_sky_background"),
    "light.sky_background_fixed_amp": ("float | null", None, "Fix the sky at this value (model units) instead of fitting it.", "model.sky_background_fixed_amp"),
    "light.point_sources.enabled": ("bool", True, "Lensed point sources (quasar images). false = galaxy-galaxy mode.", "model.use_point_sources"),
    "light.point_sources.fft_rendering": ("bool", False, "Render point sources by FFT convolution instead of direct PSF placement.", "model.ps_fft_rendering"),
    "mass.main.theta_E_prior": ("object | null", None, "{center, sigma} in arcsec: TruncatedNormal prior on the Einstein radius. Required for galaxy-galaxy lenses.", "model.lens_theta_E_prior"),
    "stages.gd.source.type": ("str", "shapelets", "Source model of the GD stage: shapelets | sersic | double-sersic | corr_field. 'shapelets' is required for the staged CorrField pipeline.", None),
    "stages.gd.source.n_max": ("int", 16, "Maximum shapelet order of the stage-1 source.", "model.shapelets_n_max"),
    "stages.cf_warmstart.enabled": ("bool", True, "Grow the CorrField source with everything else pinned before the joint fit (phase A of stage 3).", None),
    "stages.cf_warmstart.adam_steps": ("int", 3000, "Adam steps of the CorrField source warm-up.", "psf.joint.stages.stage2.adam_steps"),
    "stages.cf_warmstart.adam_lr": ("float", 1e-3, "Learning rate of the source warm-up.", "psf.joint.stages.stage2.adam_lr"),
    "stages.cf_warmstart.patience": ("int", 200, "Early-stopping patience (steps) of the source warm-up.", "psf.joint.stages.stage2.patience"),
    "stages.cf_joint.enabled": ("bool", True, "Run the CorrField joint stage (stage 3): source, lens, lens light and PSF fitted together.", None),
    "stages.cf_joint.lens_light": ("str", "fixed", "'free' or 'fixed': whether the lens light from the refit stays free in stage 3.", "refit.freeze_in_cf_joint"),
    "stages.cf_joint.source.type": ("str", "corr_field", "Must be 'corr_field'.", None),
    "stages.cf_joint.adam_steps": ("int", 4000, "Adam steps of the joint CorrField stage.", "psf.joint.stages.stage3.adam_steps"),
    "stages.cf_joint.adam_lr": ("float", 1e-3, "Learning rate of the joint stage.", "psf.joint.stages.stage3.adam_lr"),
    "stages.cf_joint.lbfgs_maxiter": ("int", 0, "Optional L-BFGS polish after the joint Adam (0 = off).", "psf.joint.stages.stage3.lbfgs_maxiter"),
    "stages.cf_joint.prior": ("str", "seed", "Prior centre of the live PSF in stage 3: 'seed' (STARRED seed) or 'stage1'.", "psf.joint.stages.stage3.prior"),
}
gd_map = {
    "starts": "n_starts_initial", "adam.steps": "adam_steps_initial", "adam.lr": "adam_lr",
    "adam.warmup_fraction": "adam_warmup_fraction", "adam.grad_clip": "adam_grad_clip",
    "adam.cosine_decay": "adam_use_cosine_decay", "lbfgs.maxiter": "lbfgs_maxiter_initial", "lbfgs.tol": "lbfgs_tol",
    "lbfgs.impl": "lbfgs_impl", "anneal.levels": "anneal_levels", "anneal.adam_steps": "anneal_adam_steps",
    "anneal.lbfgs_maxiter": "anneal_lbfgs_maxiter", "anneal.mode": "anneal_mode", "anneal.level_hi": "anneal_level_hi",
    "anneal.level_lo": "anneal_level_lo", "anneal.segments": "anneal_segments", "anneal.ramp": "anneal_ramp",
    "halving.keep": "halving_keep", "refine.top": "n_top_for_refinement",
    "refine.perturbations_per_top": "n_perturbations_per_top", "refine.perturbation_scale": "phase2_perturbation_scale",
    "refine.adam_steps": "adam_steps_refinement", "refine.lbfgs_maxiter": "lbfgs_maxiter_refinement",
    "mean_init.enabled": "use_mean_init", "mean_init.sigma": "mean_init_sigma", "mean_init.fraction": "mean_init_fraction",
    "retry.max_iterations": "max_retry_iterations", "retry.chi2_red_threshold": "chi2_red_threshold",
    "save_phase_results": "save_phase_results", "exec_mode": "exec_mode", "vmap_chunk_sizes": "vmap_chunk_sizes",
}
gd_fields = {f.name: f for f in dataclasses.fields(GD)}
for jkey, fname in gd_map.items():
    f = gd_fields.get(fname)
    add("stages.gd.optimizer." + jkey, type_str(f.type) if f else "", default_of(f) if f else None,
        (gd_docs.get(fname) or gd_comments.get(fname)) if f else None, "GDConfig", fname)
for k, (t, d, doc, rt) in explicit.items():
    add(k, t, d, doc)
    if rt:
        KNOBS[k]["runtime"] = rt

# ------------------------------------------------------------------ shipped config: values + keys we missed
def leaves(d, p=""):
    for k, v in d.items():
        path = f"{p}.{k}" if p else k
        if isinstance(v, dict) and v and not path.endswith("theta_E_prior"):
            yield from leaves(v, path)
        else:
            yield path, v


for path, v in leaves(SHIPPED):
    if path.startswith("psf.joint.stages"):
        continue
    if path not in KNOBS:
        add(path, type(v).__name__ if v is not None else "null", v, None)
        KNOBS[path]["only_in_shipped_config"] = True
    KNOBS[path]["shipped"] = v

# ------------------------------------------------------------------ curated explanations
cur = open(REF_HTML).read()
for art in re.findall(r'<article class="opt"[^>]*>.*?</article>', cur, re.S):
    key = re.search(r'<span class="kpre">([^<]*)</span><span class="kleaf">([^<]*)</span>', art)
    if not key:
        continue
    k = key.group(1) + key.group(2)
    desc = re.search(r'<div class="odesc">(.*?)</div>', art, re.S)
    notes = re.findall(r'<div class="onote">.*?<div>(.*?)</div></div>', art, re.S)
    rel = re.findall(r'class="rchip" href="#k-[^"]*">([^<]+)</a>', art)
    entry = KNOBS.get(k)
    if entry is None:
        continue   # documented key no longer exists in this version
    if desc:
        entry["curated_html"] = desc.group(1).strip()
    if notes:
        entry["warnings"] = [html.unescape(re.sub("<[^>]+>", "", n)).strip() for n in notes]
    if rel:
        entry["related"] = rel

# ------------------------------------------------------------------ hand-written explanations (read from the code)
MANUAL = {
    "light.lens.refit.arc_mask_inner_radius": "Inner radius (arcsec, about the Einstein-ring centre) of an arc annulus used ONLY by the lens-light refit. Set it together with `arc_mask_outer_radius` whenever `mask_arc` or `ps_sigma_clip_within: \"arc\"` is used: the CorrField arc mask is sized for source reconstruction and is far too wide for a light fit (removing a 0.7–2.8″ band deleted the region where the Sérsic R_e lives and raised the GD χ² from 1.26 to 1.88 in tests). A narrow annulus bracketing the ring removes the arc flux without that damage. `null` reuses the CorrField arc mask.",
    "light.lens.refit.arc_mask_outer_radius": "Outer radius (arcsec) of the refit-only arc annulus; must exceed `arc_mask_inner_radius`. See there.",
    "light.lens.refit.center_shift_sigma": "Width (arcsec) of the Gaussian prior on the per-component centre offsets of the refit light (lopsidedness). Only used when `uncouple_centers` is true. Default 0.05″.",
    "light.lens.refit.freeze_foreground_perts": "If true (default), perturbers in FRONT of the lens plane are frozen at their stage-2 values during stage 3 while the refit light is frozen. Foreground masses deflect the grid the main-plane light is evaluated on; letting them move drags the frozen light render sub-pixel and prints a core dipole.",
    "light.lens.refit.n_sersic_max": "Upper bound of the Sérsic index n of every refit component (default 8). Pairs with `n_sersic_min`; a component at either bound is a warning sign (guide §9.3).",
    "light.lens.refit.ps_sigma_clip_grow": "Binary-dilate the sigma-clipped pixel set by this many pixels (default 1). A bare threshold removes the PSF core but leaves the wings just below it, which the Sérsic would then absorb; one ring of growth removes them. 0 disables the growth.",
    "light.lens.refit.ps_sigma_clip_within": "Where the residual sigma-clip may reject pixels: `\"all\"` (default), `\"arc\"` (only inside the arc annulus) or `\"ps_aperture\"` (around the point sources). An unrestricted clip also deletes lens-light pixels wherever the profile fits badly (typically the core), the opposite of its purpose.",
    "likelihood.noise_model.noise_boost_kwargs.f_max": "Factor the noise is multiplied by at the centre of each point-source image when `noise_boost` is on; it falls linearly to 1 at the boost radius (overlapping regions keep the maximum).",
    "likelihood.noise_model.noise_boost_kwargs.radius": "Boost radius in arcsec. `null` (default) derives it from the image configuration: `frac_min_sep` × the smallest pairwise image separation, clipped to [`min_npix`, `max_npix`] pixels.",
    "likelihood.noise_model.noise_boost_kwargs.frac_min_sep": "Fraction of the minimum separation between point-source images used as the automatic boost radius (when `radius` is null). Default 0.4.",
    "likelihood.noise_model.noise_boost_kwargs.min_npix": "Lower limit (pixels) of the automatic boost radius. Default 2.5.",
    "likelihood.noise_model.noise_boost_kwargs.max_npix": "Upper limit (pixels) of the automatic boost radius. Default 6.",
    "mass.main.bpl.gamma_in.loc": "Centre of the TruncatedNormal prior on the INNER slope γ_in of the broken power law (default 2.0). The BPL priors are deliberately wider than the EPL's: the single, well-constrained lensing slope is split between two parameters.",
    "mass.main.bpl.gamma_in.scale": "Width of the TruncatedNormal prior on γ_in (default 0.3; the EPL uses 0.15).",
    "mass.main.bpl.gamma_in.low": "Lower truncation of the γ_in prior (default 1.3).",
    "mass.main.bpl.gamma_in.high": "Upper truncation of the γ_in prior (default 2.7).",
    "mass.main.bpl.gamma_out.loc": "Centre of the TruncatedNormal prior on the OUTER slope γ_out (default 2.0). γ_in = γ_out reproduces the EPL exactly.",
    "mass.main.bpl.gamma_out.scale": "Width of the γ_out prior (default 0.3).",
    "mass.main.bpl.gamma_out.low": "Lower truncation of the γ_out prior (default 1.3).",
    "mass.main.bpl.gamma_out.high": "Upper truncation of the γ_out prior (default 2.7).",
    "psf.input.error_map_resampling": "How a PSF error map on a different grid is matched to the PSF prior grid: `\"none\"` (default) requires the map on exactly that grid and raises an error otherwise; `\"bilinear\"` interpolates it (legacy behaviour, opt-in). Supplying the map on the right grid (STARRED, `high_res=True`, same stamp) is the clean option.",
    "stages.gd.optimizer.anneal.level_hi": "Start noise-inflation level of the `\"continuous\"` anneal mode (default 16): the likelihood noise is multiplied by this factor at the start and decays exponentially to `level_lo`. Needs level_hi > level_lo ≥ 1. Unused by the `\"discrete\"` ladder.",
    "stages.gd.optimizer.anneal.level_lo": "Final noise level of the continuous anneal (default 1 = the real noise).",
    "stages.gd.optimizer.anneal.segments": "Number of segments of the continuous anneal schedule (default 5). The level is a traced argument, so the whole schedule compiles once instead of once per rung.",
}
for k, txt in MANUAL.items():
    if k in KNOBS and not KNOBS[k].get("curated_html") and not KNOBS[k].get("code_doc"):
        KNOBS[k]["code_doc"] = txt

ESSENTIAL = {
    "run.output_dir", "run.sampling", "run.random_seed", "data.pix_scale", "data.cutout_size", "data.likelihood_mask_path",
    "mass.main.profile", "mass.main.theta_E_prior", "mass.main.multipoles.orders", "mass.perturbers.path",
    "light.lens.initial", "light.lens.refit.enabled", "light.lens.refit.profile", "light.lens.refit.mask_path",
    "light.sky_background", "light.point_sources.enabled", "psf.mode", "psf.input.oversample",
    "psf.input.error_map_path", "psf.joint.seed_path", "stages.gd.source.n_max", "stages.cf_joint.enabled",
    "stages.cf_joint.source.loglogavgslope", "stages.cf_joint.source.arc_mask.outer_radius",
    "likelihood.use_time_delays", "likelihood.noise_model.use_psf_error_map", "sampling.sampler", "sampling.nifty.mode",
    "sampling.nifty.nuts.n_warmup", "sampling.nifty.nuts.n_samples", "sampling.nifty.nuts.n_chains",
    "sampling.nifty.nuts.target_accept", "blinding.enabled",
}
COMMON_PREFIXES = ("stages.gd.optimizer.anneal", "stages.gd.optimizer.halving", "stages.gd.optimizer.refine",
                   "stages.cf_joint.adam_steps", "stages.cf_warmstart.adam_steps", "light.lens.refit.adam_steps",
                   "light.lens.couple", "mass.perturbers.priors", "likelihood.noise_model.psf_error_b",
                   "stages.cf_joint.source.num_pixels", "stages.cf_joint.source.adaptive_grid",
                   "stages.cf_joint.source.source_grid_scale", "mass.main.multipoles", "plotting.save_plots",
                   "psf.joint.free", "light.lens.refit.uncouple", "light.lens.refit.simple_source",
                   "blinding.scenario", "sampling.nifty.nuts.max_tree_depth", "sampling.nifty.nuts.mass_matrix")
for k, e in KNOBS.items():
    e["level"] = "essential" if k in ESSENTIAL else ("common" if k.startswith(COMMON_PREFIXES) else "advanced")

# ------------------------------------------------------------------ write
def jsonable(v):
    if isinstance(v, tuple):
        return list(v)
    if isinstance(v, (str, int, float, bool, list, dict)) or v is None:
        return v
    return str(v)


out = []
for k in sorted(KNOBS):
    e = {kk: jsonable(vv) for kk, vv in KNOBS[k].items()}
    e["section"] = k.split(".")[0]
    out.append(e)
json.dump({"alpaca_version": getattr(alpaca, "__version__", "?"), "knobs": out}, open(OUT, "w"), indent=1)
miss = [e["key"] for e in out if not e.get("curated_html") and not e.get("code_doc")]
print(f"{len(out)} knobs; curated {sum(1 for e in out if e.get('curated_html'))}; "
      f"code docs only {sum(1 for e in out if e.get('code_doc') and not e.get('curated_html'))}; "
      f"undocumented {len(miss)}")
print("undocumented:", miss)
