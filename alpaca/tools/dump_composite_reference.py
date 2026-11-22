"""Reference values of ALPACA's composite main deflector (alpaca.models.composite, >= 0.6.1) and of the sampled-Om
multi-plane geometry (alpaca.models.multiplane.mp_geometry_arrays, 0.6.2) for test/verify_composite.mjs.

    PYTHONPATH=<alpaca repo> python tools/dump_composite_reference.py <out.json>

Float64 throughout (the "exact" composite numerics; on CPU both numerics use alpaca's float64 sums for point sets
below composite_cse.GRID_MIN, which is the case here).
"""
import json
import sys
from types import SimpleNamespace

import jax

jax.config.update("jax_enable_x64", True)
import numpy as np  # noqa: E402
import jax.numpy as jnp  # noqa: E402

from alpaca.models import composite as C  # noqa: E402
from alpaca.models.multiplane import mp_geometry_arrays  # noqa: E402

OUT = sys.argv[1]
rng = np.random.default_rng(20261120)

# points: random over the cutout, a ring around theta_E, the centre itself and a few far ones
pts = np.concatenate([
    rng.uniform(-3.5, 3.5, size=(1500, 2)),
    1.2 * np.stack([np.cos(np.linspace(0, 2 * np.pi, 200, endpoint=False)), np.sin(np.linspace(0, 2 * np.pi, 200, endpoint=False))], axis=1),
    rng.normal(0, 0.03, size=(100, 2)),
    np.array([[0.0, 0.0], [1e-6, -2e-6], [6.0, -5.0], [-9.0, 0.5]]),
])
x, y = jnp.asarray(pts[:, 0]), jnp.asarray(pts[:, 1])
assert len(pts) < 4096


def flat(a):
    return [float(v) for v in np.asarray(a).ravel()]


cases = []


def add(name, prof_cls, params, light):
    kw = C.main_kwargs_from_params(params, light)
    kw = {k: float(v) for k, v in kw.items()}
    prof = prof_cls()
    ax, ay = prof.derivatives(x, y, **kw)
    ax2, ay2 = prof.derivatives(x, y, norm_scale=0.73, **kw)
    ks, kh = prof.kappa(x, y, components=True, **kw)
    comp = prof.components(**kw)
    case = dict(name=name, light=light, params={k: float(v) for k, v in params.items()}, kwargs=kw,
                ax=flat(ax), ay=flat(ay), ax_ns=flat(ax2), ay_ns=flat(ay2), kappa_stars=flat(ks), kappa_halo=flat(kh),
                k_star=float(comp["k_star"]), kappa_s=float(comp["kappa_s"]))
    if light == "chameleon":
        cl = C.ChameleonLight()
        lk = C.chameleon_light_kwargs(params, params["lens_center_x"], params["lens_center_y"])
        case["light"] = [flat(cl.function(x, y, **{k: float(v) for k, v in l.items()})) for l in lk]
    cases.append(case)


def chameleon_params(i):
    p = dict(lens_theta_E=rng.uniform(0.6, 1.8), lens_f_b=rng.uniform(0.05, 0.95), lens_eta=rng.uniform(-0.5, 0.5),
             lens_r_s=rng.uniform(4.0, 30.0), lens_e1=rng.uniform(-0.2, 0.2), lens_e2=rng.uniform(-0.2, 0.2),
             lens_center_x=rng.uniform(-0.05, 0.05), lens_center_y=rng.uniform(-0.05, 0.05))
    for s, (wc, dw) in (("", ((0.002, 1.0), (0.01, 10.0))), ("2", ((0.02, 5.0), (0.001, 30.0)))):
        p[f"log_light_amp_L{s}"] = rng.uniform(0, 4)
        p[f"light_lwc_L{s}"] = rng.uniform(np.log(wc[0]), np.log(wc[1]))
        p[f"light_ldw_L{s}"] = rng.uniform(np.log(dw[0]), np.log(dw[1]))
        p[f"light_e1_L{s}"] = rng.uniform(-0.3, 0.3)
        p[f"light_e2_L{s}"] = rng.uniform(-0.3, 0.3)
    return p


def sersic_params(n_comp):
    p = dict(lens_theta_E=rng.uniform(0.6, 1.8), lens_f_b=rng.uniform(0.05, 0.95), lens_eta=rng.uniform(-0.5, 0.5),
             lens_r_s=rng.uniform(4.0, 30.0), lens_e1=rng.uniform(-0.2, 0.2), lens_e2=rng.uniform(-0.2, 0.2),
             lens_center_x=rng.uniform(-0.05, 0.05), lens_center_y=rng.uniform(-0.05, 0.05),
             light_e1_L=rng.uniform(-0.25, 0.25), light_e2_L=rng.uniform(-0.25, 0.25),
             light_center_x_L=rng.uniform(-0.08, 0.08), light_center_y_L=rng.uniform(-0.08, 0.08))
    for s, re, n in (("_L", (0.4, 2.5), (1.5, 5.0)), ("_L2", (0.05, 0.4), (1.0, 3.0)), ("_L3", (2.0, 6.0), (0.8, 2.0)))[:n_comp]:
        p[f"log_light_amp{s}"] = rng.uniform(-1, 3)
        p[f"light_Re{s}"] = rng.uniform(*re)
        p[f"light_n{s}"] = rng.uniform(*n)
    return p


for i in range(3):
    add(f"chameleon_{i}", C.CompositeChameleonNFWExact, chameleon_params(i), "chameleon")
for k in (1, 2, 3):
    add(f"sersic_{k}comp", C.CompositeSersicNFWExact, sersic_params(k), "sersic")

# multiband: another band's mass reads the reference band's light through "stellar:" keys
p = chameleon_params(9)
q = dict(p)
for k in C.LIGHT_SITES:
    q[k] = p[k] + rng.normal(0, 0.05)        # the band's own light differs
    q[C.STELLAR_PREFIX + k] = p[k]          # its stars follow the reference light
kw_ref = {k: float(v) for k, v in C.main_kwargs_from_params(p, "chameleon").items()}
kw_band = {k: float(v) for k, v in C.main_kwargs_from_params(q, "chameleon").items()}
stellar = dict(params={k: float(v) for k, v in q.items()}, kwargs=kw_band, same_as_reference=kw_ref == kw_band)

# sampled-Om geometry (J1721-like: main plane, one background plane, source)
geo = SimpleNamespace(redshift_list=[0.184, 1.885, 2.38], H0_fid=70.0, n_planes=2, main_plane_index=0)
oms = [0.1, 0.25, 0.3, 0.35, 0.6]
geom = []
for om in oms:
    g = mp_geometry_arrays(geo, om)
    geom.append(dict(Om=om, eta_flat=flat(g["eta_flat"]), defl_scales=[float(v) for v in g["defl_scales"]],
                     D_dt_fid=float(g["D_dt_fid"])))

# full multi-plane ray shooting: composite + shear on the main plane, SIS perturbers on a foreground, the main and a
# background plane, with the fiducial Om and with a sampled Om (trailing {"cosmo_Om0": Om} dict)
from herculens.MassModel.mass_model_multiplane import MPMassModel  # noqa: E402
from alpaca.models.multiplane import COSMO_KEY, MPMassModelFacade, build_mp_geometry, build_plane_structure  # noqa: E402

Z_LENS, Z_SRC = 0.4546, 1.689
perts = [dict(name=f"pert{pid}", id=pid, plane=plane, z=z, center_x=cx, center_y=cy, theta_E_cat=te, theta_E_max=3 * te,
              position_sigma=0.3, fix_positions=False, notes="")
         for pid, z, plane, cx, cy, te in ((9, 0.4184, "foreground", -1.6, 0.9, 0.28), (3, 0.45653, "main", 1.4, -0.8, 0.24),
                                           (7, 0.782133, "background", 0.9, 0.9, 0.53))]
for prof_name, prof_cls, light, pp in (("COMPOSITE_CHAM_NFW_EXACT", C.CompositeChameleonNFWExact, "chameleon", chameleon_params(5)),
                                       ("COMPOSITE_SERSIC_NFW_EXACT", C.CompositeSersicNFWExact, "sersic", sersic_params(2))):
    mgeo = build_plane_structure(perts, Z_LENS, Z_SRC, main_profile=prof_name)
    mp = MPMassModel(mgeo.profile_lists)
    build_mp_geometry(mgeo, mp, H0_fid=70.0, Om0=0.3)
    fac = MPMassModelFacade(mp, mgeo)
    pp.update(lens_gamma1=0.03, lens_gamma2=-0.015)
    for p_ in perts:
        pp[f"{p_['name']}_theta_E"] = p_["theta_E_cat"]
        pp[f"{p_['name']}_center_x"] = p_["center_x"]
        pp[f"{p_['name']}_center_y"] = p_["center_y"]
    kw_main = {k: float(v) for k, v in C.main_kwargs_from_params(pp, light).items()}
    kwl = [kw_main, dict(gamma1=pp["lens_gamma1"], gamma2=pp["lens_gamma2"], ra_0=pp["lens_center_x"], dec_0=pp["lens_center_y"])]
    kwl += [dict(theta_E=p_["theta_E_cat"], center_x=p_["center_x"], center_y=p_["center_y"]) for p_ in perts]
    for om in (None, 0.36):
        kk = kwl + ([{COSMO_KEY: om}] if om is not None else [])
        bx, by = fac.ray_shooting(x, y, kk)
        rec = dict(name=f"raytrace {light} Om={om or 0.3}", light=light, params={k: float(v) for k, v in pp.items()},
                   Om=om, bx=flat(bx), by=flat(by),
                   planes=dict(z_lens=Z_LENS, z_source=Z_SRC, perturbers=[{k: p_[k] for k in ("name", "id", "z", "plane")} for p_ in perts]))
        if om is not None:
            rec["params"]["cosmo_Om0"] = om
        cases_rt = globals().setdefault("cases_rt", [])
        cases_rt.append(rec)

with open(OUT, "w") as f:
    json.dump(dict(x=flat(x), y=flat(y), cases=cases, stellar=stellar, raytrace=cases_rt,
                   geometry=dict(redshifts=geo.redshift_list, H0=70.0, main=0, by_om=geom)), f)
print(f"wrote {OUT}: {len(cases)} composite cases, {len(pts)} points, {len(geom)} geometries")
