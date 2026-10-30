#!/usr/bin/env python3
"""Check what the configurator writes, with astropy and ALPACA itself.

    node test/configurator_fits.mjs OUT          # writer test files
    (export configs / FITS from the page into OUT, e.g. with a headless browser)
    python test/configurator_check.py OUT

* every ``config*.json`` in OUT loads with ``alpaca.utils.load_config_from_json``
  and keeps ``likelihood.astrometry_mode = image_plane``;
* the files of test/configurator_fits.mjs open in astropy with the right shape,
  dtype and values;
* exported inputs (image.fits, noise_map.fits, mask_likelihood.fits,
  mask_lens_only.fits) are consistent and load with ALPACA's mask loader.
"""
import glob
import json
import os
import sys
import tempfile

import numpy as np
from astropy.io import fits
from astropy.wcs import WCS

failures = 0


def check(ok, msg):
    global failures
    print(("ok   " if ok else "FAIL ") + msg)
    if not ok:
        failures += 1


def check_configs(d):
    from alpaca.utils import load_config_from_json
    for path in sorted(glob.glob(os.path.join(d, "config*.json"))):
        raw = json.load(open(path))
        with tempfile.TemporaryDirectory() as tmp:
            try:
                cfg = load_config_from_json(path, output_dir=os.path.join(tmp, "run"))
            except Exception as e:  # noqa: BLE001
                check(False, f"{os.path.basename(path)} loads: {e}")
                continue
        check(cfg.likelihood.astrometry_mode == "image_plane",
              f"{os.path.basename(path)} loads; astrometry_mode={cfg.likelihood.astrometry_mode}, "
              f"cutout={cfg.data.cutout_size}, point sources={cfg.model.use_point_sources}, "
              f"theta_E prior={raw['mass']['main'].get('theta_E_prior')}")


def check_writer_files(d):
    img = np.array([np.sin(i) * 1e3 + i / 7 for i in range(35)]).reshape(7, 5)
    mask = np.array([0 if i % 3 == 0 else 1 for i in range(35)]).reshape(7, 5)
    # the reference is recomputed with numpy's sin (may differ from JavaScript's in the last bit)
    for bits, dt, tol in ((64, ">f8", 1e-13), (32, ">f4", 1e-4)):
        p = os.path.join(d, f"image_{bits}.fits")
        if not os.path.exists(p):
            continue
        with fits.open(p) as h:
            a = h[0].data
            check(a.shape == (7, 5) and a.dtype == np.dtype(dt), f"image_{bits}.fits shape {a.shape} dtype {a.dtype}")
            check(np.allclose(a, img, rtol=tol, atol=0), f"image_{bits}.fits values")
            check(h[0].header["BUNIT"] == "DN/s" and h[0].header["CRPIX1"] == 3.5, f"image_{bits}.fits header")
    for bits, dt in ((8, np.uint8), (16, ">i2")):
        p = os.path.join(d, f"mask_{bits}.fits")
        if os.path.exists(p):
            a = fits.getdata(p)
            check(a.dtype == np.dtype(dt) and np.array_equal(a, mask), f"mask_{bits}.fits dtype {a.dtype} values")
    p = os.path.join(d, "multi_hdu.fits")
    if os.path.exists(p):
        with fits.open(p) as h:
            check(len(h) == 3 and h[0].data is None, "multi_hdu.fits: empty primary + 2 extensions")
            sci, err = h["SCI"].data, h["ERR"].data
            R, C = 300, 260
            ref = (np.arange(R * C) % C + 1000 * (np.arange(R * C) // C)).reshape(R, C).astype(np.float32)
            ref[5, 7] = np.nan
            check(np.array_equal(sci, ref, equal_nan=True), "multi_hdu.fits SCI values")
            check(np.array_equal(err, ((np.arange(R * C) % 97) - 40 + 100).reshape(R, C)), "multi_hdu.fits ERR (int16 + BZERO)")
    p = os.path.join(d, "crop_wcs.fits")
    if os.path.exists(p):
        h = fits.getheader(p)
        w = WCS(h)
        check(h["CRPIX1"] == 30.0 and h["CRPIX2"] == 30.0 and w.has_celestial, "crop_wcs.fits: shifted CRPIX, valid WCS")
        scale = np.sqrt(abs(np.linalg.det(w.pixel_scale_matrix))) * 3600
        check(abs(scale - 0.0312286) < 1e-5, f"crop_wcs.fits pixel scale {scale:.6f}")


def check_exports(d):
    p = os.path.join(d, "image.fits")
    if not os.path.exists(p):
        return
    from alpaca.data.masks import load_custom_arc_mask
    with fits.open(p) as h:
        img, hdr = h[0].data, h[0].header
    N = img.shape[0]
    check(img.shape == (N, N) and N % 2 == 1 and img.dtype == np.dtype(">f8"), f"image.fits {img.shape} {img.dtype}")
    check(np.all(np.isfinite(img)), "image.fits has no NaN")
    check(WCS(hdr).has_celestial, "image.fits WCS")
    M = hdr["CUTOUT"]
    pn = os.path.join(d, "noise_map.fits")
    if os.path.exists(pn):
        noise = fits.getdata(pn)
        check(noise.shape == img.shape and np.all(np.isfinite(noise)) and np.all(noise > 0), "noise_map.fits finite and > 0")
    like = fits.getdata(os.path.join(d, "mask_likelihood.fits"))
    lens = fits.getdata(os.path.join(d, "mask_lens_only.fits"))
    check(like.shape == (M, M) and like.dtype == np.uint8 and set(np.unique(like)) <= {0, 1},
          f"mask_likelihood.fits {like.shape} {like.dtype}, {like.mean():.2%} used")
    check(lens.shape == (N, N) and lens.dtype == np.uint8 and set(np.unique(lens)) <= {0, 1},
          f"mask_lens_only.fits {lens.shape} {lens.dtype}, {lens.mean():.2%} used")
    m1 = load_custom_arc_mask(os.path.join(d, "mask_likelihood.fits"), (M, M))
    m2 = load_custom_arc_mask(os.path.join(d, "mask_lens_only.fits"), (N, N))
    check(m1.dtype == bool and m2.dtype == bool, "both masks load with alpaca.data.masks.load_custom_arc_mask")
    print(f"     frame {N}, cutout {M}, LENSDX {hdr.get('LENSDX')}, LENSDY {hdr.get('LENSDY')}, SKYSUB {hdr.get('SKYSUB'):.4g}")


if __name__ == "__main__":
    d = sys.argv[1] if len(sys.argv) > 1 else "."
    check_writer_files(d)
    check_exports(d)
    check_configs(d)
    print(f"{failures} FAILED" if failures else "all passed")
    sys.exit(1 if failures else 0)
