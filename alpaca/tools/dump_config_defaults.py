#!/usr/bin/env python3
"""Dump ALPACA's configuration defaults for the browser configurator.

Writes ``js/configurator/defaults.json`` with

* ``shipped``   the ``config.json`` that ships with ALPACA (the quasar baseline);
* ``dataclass`` the code defaults in the same JSON layout (what ALPACA uses for a
                key that is missing from a config file);
* ``knobs``     one entry per leaf key: shipped value, code default, a JSON type and,
                for string options, the accepted values;
* ``presets``   complete configs for the two starting points of the configurator
                (lensed quasar = the shipped config, galaxy-galaxy lens), each checked
                with ``alpaca.utils.load_config_from_json``.

Run in the ALPACA environment::

    source ~/miniforge/etc/profile.d/conda.sh; conda activate alpaca-040
    ALPACA_BACKEND=cpu JAX_PLATFORMS=cpu PYTHONPATH=~/code/Jax-Lensing-Profiles \\
        python tools/dump_config_defaults.py --alpaca ~/alpaca
"""
import argparse
import copy
import datetime
import json
import os
import sys
import tempfile
from dataclasses import asdict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "js", "configurator", "defaults.json")

# Sub-trees edited as one value (dedicated editors in the page).
STRUCTURED = ("likelihood.time_delays", "mass.main.theta_E_prior",
              "stages.cf_joint.perturber_fields")

# Keys the loader accepts that neither the shipped config nor the dataclass
# round trip writes out (config_format.to_runtime_dict / config.py).
EXTRAS = {
    "light.lens.couple_sersic_centers": False,
    "light.lens.ellipticity_max": 0.4,
    "light.sky_background_fixed_amp": None,
    "stages.gd.optimizer.exec_mode": "auto",
    "stages.gd.optimizer.anneal.level_hi": 16.0,
    "stages.gd.optimizer.anneal.level_lo": 1.0,
    "stages.gd.optimizer.anneal.segments": 5,
}

LENS_LIGHT = ["sersic", "double-sersic", "triple-sersic", "MGE",
              "MGE+double-sersic", "MGE+triple-sersic"]
# Accepted values of string options (validators in alpaca/config.py and
# alpaca/utils/config_format.py).
CHOICES = {
    "mass.main.profile": ["EPL+Shear", "BPL+Shear"],
    "mass.main.bpl.deflection": ["series", "quadrature"],
    "mass.perturbers.mode": ["auto", "single_plane"],
    "light.lens.initial": LENS_LIGHT,
    "light.lens.refit.profile": ["same"] + LENS_LIGHT,
    "light.lens.refit.ps_treatment": ["downweight", "mask", "sigma_clip"],
    "light.lens.refit.ps_sigma_clip_within": ["all", "arc", "ps_aperture"],
    "light.lens.refit.simple_source": ["cf", "stage1"],
    "light.sky_psf": ["unconvolved", "convolved"],
    "stages.gd.source.type": ["shapelets", "sersic", "double-sersic", "corr_field"],
    "stages.gd.optimizer.lbfgs.impl": ["optax", "jaxopt"],
    "stages.gd.optimizer.anneal.mode": ["discrete", "continuous", "off"],
    "stages.gd.optimizer.exec_mode": ["auto", "vmap", "sequential", "distributed"],
    "stages.cf_joint.lens_light": ["free", "fixed"],
    "stages.cf_joint.prior": ["seed", "stage1"],
    "stages.cf_joint.source.interpolation_type": ["fast_bilinear", "bilinear", "bicubic"],
    "stages.cf_joint.source.arc_mask.mode": ["auto", "signal", "custom"],
    "psf.mode": ["joint", "fixed", "iterative"],
    "psf.input.error_map_resampling": ["none", "bilinear"],
    "psf.iterative.rotation_mode": ["none", "90", "all"],
    "psf.iterative.masking.smoothing": ["cosine", "hard", "gaussian"],
    "psf.joint.priors.background.type": ["heuristic", "error_map", "scalar"],
    "psf.joint.priors.background.space": ["background", "kernel"],
    "likelihood.astrometry_mode": ["image_plane", "source_plane"],
    "likelihood.D_dt_prior.type": ["uniform", "log_uniform"],
    "likelihood.noise_model.psf_error_b_mode": ["joint", "post_gd_fixed", "post_gd_free"],
    "likelihood.kinematics.mode": ["aperture", "resolved"],
    "likelihood.kinematics.anisotropy_model": ["constant", "om", "gom"],
    "likelihood.kinematics.dynamics": ["spherical", "axisymmetric"],
    "likelihood.kinematics.multipole_mode": ["reject", "m3_monopole", "monopole"],
    "likelihood.kinematics.light_radius_convention": ["major_axis", "circularized"],
    "likelihood.kinematics.axi_precision": ["float64", "float32", "auto"],
    "likelihood.kinematics.axi_derivative": ["analytic", "jvp"],
    "likelihood.kinematics.axi_interp": ["auto", "gather", "dense"],
    "sampling.sampler": ["nifty", "nuts", "nautilus", "default"],
    "sampling.nifty.mode": ["nuts_only", "vi+nuts", "vi_only"],
    "sampling.nifty.vi.algorithm": ["geoVI", "MGVI"],
    "sampling.nifty.nuts.mass_matrix": ["identity", "adaptive_diag", "diag_from_vi",
                                        "block_from_vi"],
    "sampling.nifty.nuts.chain_method": ["auto", "parallel", "vectorized", "sequential"],
    "sampling.nifty.warmstart.polish": ["lbfgs", "off"],
    "blinding.mode": ["absolute", "fractional"],
    "blinding.reference": ["mean", "median"],
    "blinding.scenario": ["first", "previously_analyzed", "no_delays"],
    "plotting.plot_format": ["png", "pdf", "svg"],
}

# Keys never offered in the page (secrets stay out of config files).
HIDDEN = ("blinding.key",)


def leaves(d, prefix=""):
    out = {}
    if isinstance(d, dict) and d and prefix not in STRUCTURED:
        for k, v in d.items():
            out.update(leaves(v, f"{prefix}.{k}" if prefix else k))
    elif prefix:
        out[prefix] = d
    return out


def json_type(*vals):
    kinds = []
    for v in vals:
        if v is None:
            continue
        if isinstance(v, bool):
            k = "bool"
        elif isinstance(v, int):
            k = "int"
        elif isinstance(v, float):
            k = "float"
        elif isinstance(v, str):
            k = "str"
        elif isinstance(v, (list, tuple)):
            k = "list"
        else:
            k = "dict"
        if k not in kinds:
            kinds.append(k)
    if kinds == ["int", "float"] or kinds == ["float", "int"]:
        kinds = ["float"]
    if not kinds:
        return "any"
    return kinds[0] if len(kinds) == 1 else "any"


def set_path(d, path, value):
    keys = path.split(".")
    for k in keys[:-1]:
        if not isinstance(d.get(k), dict):
            d[k] = {}
        d = d[k]
    d[keys[-1]] = value


def galaxy_preset(shipped):
    """Galaxy-galaxy starting point (the SPT0418-47 tutorial recipe, generic values)."""
    g = copy.deepcopy(shipped)
    set_path(g, "light.point_sources.enabled", False)
    set_path(g, "mass.main.theta_E_prior", {"center": 1.0, "sigma": 10.0})
    set_path(g, "mass.perturbers.path", None)
    set_path(g, "likelihood.use_time_delays", False)
    set_path(g, "likelihood.time_delays", None)
    set_path(g, "likelihood.use_rayshoot_consistency", False)
    set_path(g, "likelihood.noise_model.use_psf_error_map", False)
    set_path(g, "likelihood.astrometry_mode", "image_plane")
    set_path(g, "stages.gd.optimizer.halving.keep", [64, 32, 16, 8, 4])
    set_path(g, "stages.gd.optimizer.refine.top", 4)
    set_path(g, "stages.cf_joint.convergence",
             {"enabled": True, "window": 4000, "abs_tol": 2.0, "rel_tol": 0.0, "min_steps": 0})
    set_path(g, "stages.cf_joint.adam_steps", 80000)
    set_path(g, "sampling.nifty.nuts.n_warmup", 500)
    set_path(g, "sampling.nifty.nuts.n_samples", 500)
    set_path(g, "sampling.nifty.nuts.target_accept", 0.8)
    set_path(g, "sampling.nifty.nuts.max_tree_depth", 12)
    set_path(g, "light.lens.couple_sersic_centers", True)
    set_path(g, "light.lens.refit.uncouple_centers", False)
    set_path(g, "blinding.enabled", False)
    cp = g.get("plotting", {}).get("corner_params")
    if isinstance(cp, list):
        g["plotting"]["corner_params"] = [p for p in cp if p != "D_dt"]
    return g


def check_loads(cfg, name):
    from alpaca.utils import load_config_from_json
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "config.json")
        with open(path, "w") as f:
            json.dump(cfg, f, indent=2)
        pc = load_config_from_json(path, output_dir=os.path.join(tmp, "run"))
    am = pc.likelihood.astrometry_mode
    if am != "image_plane":
        raise SystemExit(f"preset {name}: astrometry_mode {am!r} (must be image_plane)")
    print(f"  preset {name!r}: loads (astrometry_mode={am})")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--alpaca", default=os.path.expanduser("~/alpaca"),
                    help="ALPACA checkout (its config.json is the shipped config)")
    ap.add_argument("--out", default=OUT)
    args = ap.parse_args()

    sys.path.insert(0, args.alpaca)
    import alpaca
    from alpaca.config import PipelineConfig
    from alpaca.utils.config_format import is_current_format
    from alpaca.utils.old_config import upgrade_legacy

    shipped = json.load(open(os.path.join(args.alpaca, "config.json")))
    dataclass = upgrade_legacy(asdict(PipelineConfig()))
    dataclass.pop("config_version", None)
    assert is_current_format(dataclass)
    dataclass = json.loads(json.dumps(dataclass, default=list))

    ls, ld = leaves(shipped), leaves(dataclass)
    keys = list(ls)
    keys += [k for k in ld if k not in ls]
    keys += [k for k in EXTRAS if k not in ls and k not in ld]
    for s in STRUCTURED:
        if s not in keys:
            keys.append(s)

    knobs = []
    for k in keys:
        if k in HIDDEN:
            continue
        shp = ls.get(k)
        dft = ld.get(k, EXTRAS.get(k))
        entry = {"key": k, "section": k.split(".")[0],
                 "shipped": shp, "in_shipped": k in ls,
                 "default": dft, "in_dataclass": k in ld,
                 "type": "json" if k in STRUCTURED else json_type(shp, dft),
                 "nullable": (shp is None or dft is None)}
        if k in CHOICES:
            entry["choices"] = CHOICES[k]
        if entry["type"] == "float" or entry["type"] == "list":
            # JSON drops the ".0" of floats in the browser; keep it on export
            vals = [v for v in (shp, dft) if isinstance(v, (list, tuple))]
            if entry["type"] == "list" and vals:
                elems = [x for v in vals for x in v]
                if elems and all(isinstance(x, float) for x in elems):
                    entry["elem_type"] = "float"
        knobs.append(entry)

    presets = {"quasar": copy.deepcopy(shipped), "galaxy": galaxy_preset(shipped)}
    print(f"ALPACA {getattr(alpaca, '__version__', '?')}: {len(knobs)} knobs")
    for name, cfg in presets.items():
        check_loads(cfg, name)

    out = {
        "alpaca_version": getattr(alpaca, "__version__", None),
        "generated": datetime.date.today().isoformat(),
        "shipped": shipped,
        "dataclass": dataclass,
        "knobs": knobs,
        "presets": presets,
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(out, f, indent=1)
    print(f"wrote {os.path.relpath(args.out)}")


if __name__ == "__main__":
    main()
