"""Reference band views of a multiband run, with ALPACA's own rule (alpaca.multiband.model.JointModel.view and
alpaca.multiband.sharing.positional_axis), for test/verify_multiband.mjs. Writes values only to the npz.

python test/multiband_reference.py <multiband run folder> <out.npz>
"""
import json
import sys

import numpy as np
from alpaca.multiband.sharing import positional_axis

run, out = sys.argv[1:3]
z = np.load(f"{run}/joint/posterior/posterior_samples.npz", allow_pickle=True)
names = [str(n) for n in z["param_names"]]
samples = np.asarray(z["samples"], float)
ref = json.load(open(f"{run}/joint/joint_summary.json"))["reference_band"]
bands = sorted({n.split("/", 1)[0] for n in names if "/" in n})
draws = np.unique(np.linspace(0, samples.shape[0] - 1, 7).astype(int))


def view(tree, band, sep):
    pre = band + sep
    o = {k[len(pre):]: v for k, v in tree.items() if k.startswith(pre)}
    shift = None
    if band != ref and f"{pre}frame_dx" in tree:
        shift = (tree[f"{pre}frame_dx"], tree[f"{pre}frame_dy"])
        o.pop("frame_dx", None); o.pop("frame_dy", None)
    for k, v in tree.items():
        if sep in k:
            continue
        ax = positional_axis(k)
        o[k] = v + (shift[0] if ax == "x" else shift[1]) if (shift is not None and ax is not None) else v
    return o


res = {"draws": draws}
for b in bands:
    rows = [view(dict(zip(names, samples[s])), b, "/") for s in draws]
    keys = sorted(rows[0])
    res[f"names_{b}"] = np.array(keys)
    res[f"post_{b}"] = np.array([[r[k] for k in keys] for r in rows])
m = np.load(f"{run}/joint/joint_map_params_full.npz", allow_pickle=True)
tree = {k: np.asarray(m[k]) for k in m.files if k != "__sealed_blinded__"}
# the MAP holds true values: leave the blinded parameters out of this file
man = json.load(open(f"{run}/joint/posterior/blinding_manifest.json")) if __import__("os").path.exists(f"{run}/joint/posterior/blinding_manifest.json") else {}
blind = set(man.get("blind_params", [])) | set(man.get("blinded_columns", []))
for b in bands:
    v = view(tree, b, "__")
    keys = sorted(k for k, a in v.items() if np.ndim(a) == 0 and k not in blind)
    res[f"mapnames_{b}"] = np.array(keys)
    res[f"map_{b}"] = np.array([float(v[k]) for k in keys])
np.savez(out, **res)
print("wrote", out, "bands", bands, "draws", list(draws))
