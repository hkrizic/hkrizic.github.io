"""Dump reference arrays from the Python (JAX/herculens) forward model.

Used only to validate the JavaScript port in js/physics against the exact
model ALPACA sampled. Writes to the directory given as argv[1].
"""
import json
import os
import sys

import numpy as np

RUN = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

from alpaca.utils.postprocess import (  # noqa: E402
    rebuild_prob_model, load_best_fit, load_posterior, reconstruct_sample_params,
    best_sample_index, source_plane_extent,
)

built = rebuild_prob_model(RUN, verbose=False) if 'verbose' in rebuild_prob_model.__code__.co_varnames else rebuild_prob_model(RUN)
pm = built["prob_model"]
li = pm.lens_image
facade = li.MassModel
geo = facade.geometry
mp = li.MPLensImage

meta = {
    "plane_redshifts": [float(z) for z in geo.plane_redshifts],
    "z_source": float(geo.z_source),
    "main_plane_index": int(geo.main_plane_index),
    "plane_slots": geo.plane_slots,
    "profile_lists": geo.profile_lists,
    "eta_flat": [float(v) for v in np.asarray(geo.eta_flat)],
    "defl_scales": [float(v) for v in np.asarray(geo.defl_scales)],
    "D_dt_fid": float(geo.D_dt_fid),
    "td_prefactors_days": [float(v) for v in np.asarray(geo.td_prefactors_days)],
    "supersampling_factor": int(li.ImageNumerics.grid_supersampling_factor),
    "pixel_width": float(li.Grid.pixel_width),
    "pixel_area": float(li.Grid.pixel_area),
    "num_pixel_axes": [int(v) for v in li.Grid.num_pixel_axes],
    "radec_at_xy_0": [float(v) for v in li.Grid.radec_at_xy_0],
    "final_stage": built.get("final_stage"),
    "psf_supersampling_factor": int(built.get("psf_supersampling_factor", 1) or 1),
    "perturbers_for_kwargs": [
        {k: (v if isinstance(v, (str, int, float, bool, list)) or v is None else str(v))
         for k, v in p.items()} for p in pm.perturbers_for_kwargs],
    "x0s": [float(v) for v in np.asarray(pm.x0s)],
    "y0s": [float(v) for v in np.asarray(pm.y0s)],
    "use_sky_background": bool(getattr(pm, "use_sky_background", False)),
    "use_triple_sersic_lens": bool(getattr(pm, "use_triple_sersic_lens", False)),
    "use_double_sersic_lens": bool(getattr(pm, "use_double_sersic_lens", False)),
    "num_pixels_source": int(getattr(pm, "num_pixels", 0)),
    "psf_error_b_fixed": getattr(pm, "psf_error_b_fixed", None),
    "psf_error_exponent": float(getattr(pm, "psf_error_exponent", 1.0)),
    "use_psf_error_map": bool(getattr(pm, "use_psf_error_map", False)),
}
print(json.dumps({k: v for k, v in meta.items() if k not in ("perturbers_for_kwargs",)}, indent=1))
print("perturbers:", json.dumps(meta["perturbers_for_kwargs"], indent=1))

x_img, y_img = li.Grid.pixel_coordinates
ra_ss, dec_ss = li.ImageNumerics.coordinates_evaluate
kp = pm._kwargs_psf_from_params(load_best_fit(RUN))
print("kwargs_psf keys:", None if kp is None else {k: np.asarray(v).shape for k, v in kp.items()})


def dump(tag, params):
    kw = pm.params2kwargs(params)
    kwargs_psf = pm._kwargs_psf_from_params(params)
    common = dict(kw, kwargs_psf=kwargs_psf)
    out = {}
    out["model_total"] = np.asarray(li.model(**common))
    out["lens_light_only"] = np.asarray(li.model(**common, source_add=False, point_source_add=False))
    out["source_only"] = np.asarray(li.model(**common, lens_light_add=False, point_source_add=False))
    out["ps_only"] = np.asarray(li.model(**common, lens_light_add=False, source_add=False))
    out["lens_light_unconv"] = np.asarray(li.model(**common, source_add=False, point_source_add=False, unconvolved=True))
    out["source_unconv"] = np.asarray(li.model(**common, lens_light_add=False, point_source_add=False, unconvolved=True))
    # supersampled (unconvolved, un-normalised) light planes
    out["source_ss"] = np.asarray(li.model(**common, lens_light_add=False, point_source_add=False, supersampled=True))
    out["lens_light_ss"] = np.asarray(li.model(**common, source_add=False, point_source_add=False, supersampled=True))
    bx, by = facade.ray_shooting(np.asarray(x_img).ravel(), np.asarray(y_img).ravel(), kw["kwargs_lens"])
    out["beta_x"] = np.asarray(bx).reshape(np.asarray(x_img).shape)
    out["beta_y"] = np.asarray(by).reshape(np.asarray(x_img).shape)
    split = facade.split_kwargs(kw["kwargs_lens"])
    xs, ys, ext = mp.get_source_coordinates(li._eta, split)
    out["src_x"] = np.asarray(xs[-1])
    out["src_y"] = np.asarray(ys[-1])
    out["source_pixels"] = np.asarray(kw["kwargs_source"][0]["pixels"])
    out["noise_eff"] = np.asarray(pm.noise_map_effective(params))
    if kwargs_psf is not None:
        for k, v in kwargs_psf.items():
            out["psf_" + k] = np.asarray(v)
    try:
        out["psf_static_hr"] = np.asarray(li.PSF.kernel_point_source_supersampled(meta["supersampling_factor"]))
        out["psf_static_native"] = np.asarray(li.PSF.kernel_point_source)
    except Exception as e:
        print("psf dump failed", e)
    scal = {k: (float(v) if np.ndim(v) == 0 else None) for k, v in dict(params).items()}
    scal = {k: v for k, v in scal.items() if v is not None}
    with open(os.path.join(OUT, f"{tag}_params.json"), "w") as f:
        json.dump(scal, f, indent=1)
    with open(os.path.join(OUT, f"{tag}_kwargs.json"), "w") as f:
        json.dump({
            "kwargs_lens": [{k: float(v) for k, v in d.items()} for d in kw["kwargs_lens"]],
            "kwargs_lens_split": [[{k: float(v) for k, v in d.items()} for d in plane] for plane in split],
            "kwargs_lens_light": [{k: float(v) for k, v in d.items()} for d in kw["kwargs_lens_light"]],
            "kwargs_point_source": [{k: [float(x) for x in np.atleast_1d(v)] for k, v in d.items()} for d in (kw["kwargs_point_source"] or [])],
            "source_extent": source_plane_extent(pm, params),
        }, f, indent=1)
    np.savez(os.path.join(OUT, f"{tag}.npz"), x_img=np.asarray(x_img), y_img=np.asarray(y_img),
             ra_ss=np.asarray(ra_ss), dec_ss=np.asarray(dec_ss), **out)
    print(tag, {k: v.shape for k, v in out.items()})
    return out


best = load_best_fit(RUN)
o = dump("map", best)
from astropy.io import fits
saved = fits.getdata(os.path.join(RUN, "03_multistart", "model_image.fits"))
d = np.abs(o["model_total"] - saved)
print("MAP total vs saved model_image.fits: max|diff| =", d.max(), " rms =", np.sqrt((d**2).mean()), " max|model| =", np.abs(saved).max())

post = load_posterior(RUN)
idx = best_sample_index(post)
p = reconstruct_sample_params(post, idx)
meta["draw_index"] = int(idx)
dump("draw", p)
with open(os.path.join(OUT, "meta.json"), "w") as f:
    json.dump(meta, f, indent=1)
print("DONE")
