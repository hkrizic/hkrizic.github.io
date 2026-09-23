# ALPACA analysis

A browser-side analysis workbench for [ALPACA](https://github.com/hkrizic/alpaca) lens-modelling runs.
Drop a run folder onto the page and get modular, linkable applets: run overview, parameter tables,
corner plots, image/model/residual viewers, a **forward-model lab that re-renders the lens model in the
browser** (lens-light components, pixelated source, point sources), a **ray-shooting lab** (click a feature in the
data, model or residual to trace it to the source reconstruction through the full multi-plane model, with all
counter images found by Newton iterations on the exact mapping), lensing maps with critical curves and
caustics, H₀ from D_Δt, PSF comparison, optimisation diagnostics, a plot gallery and two-run comparison.

The default *model* in every viewer is the forward model of the best log-likelihood posterior draw (rendered in the
browser); residuals use it too. Every residual view has a switch for the PSF-error noise boost
(σ_eff = √(σ² + b²·PS²) with the sampled b for posterior draws or the fitted b for the MAP) versus the plain noise map. Runs without a posterior, blinded runs without a
key, and runs whose perturber catalog is missing fall back to the MAP `model_image.fits`.

Panels can be added from the sidebar, duplicated, dragged to reorder, and resized by their edges; image views zoom
with the wheel and pan by dragging, the corner plot scales with Ctrl/⌘ + wheel and zooms its ranges with Shift + wheel.

Nothing is uploaded anywhere: files are read with the browser File API and all computation happens
client-side (Web Workers).

**Blinding.** Blinded runs stay blinded on screen, always. The blinding key (`blinding_secret.key` next to the
samples, picked up automatically, or typed in) is used *only inside computations*: to evaluate the forward model
for posterior draws and to derive H₀ from the true D_Δt. H₀ and D_Δt are then shown exclusively as deviations
from their own posterior mean (TDCOSMO convention), so only widths, shapes and correlations are visible.

The key you type is kept as a *campaign key* for the browser session (optionally remembered on the device) and
applied to every run you open afterwards; any perturber catalog that was found or attached once is remembered in
the browser and reused for later runs with the same perturbers, so a bare run folder still gets the multi-plane
geometry and the best-draw model.

To actually lift the blinding, use **Unblind run…** in the sidebar: choose *session only* (absolute values are
restored in memory), *write into the run folder* (produces `05_posterior/samples/unblinded/posterior_samples.npz`
and `unblinding_record.json`, the same files as `python -m alpaca.unblind`; needs the folder opened with the folder
picker so the browser may write) or *download the files*. The reveal screen animates and then shows H₀; close it to
analyse the unblinded results in every panel.

## Launch

The site is static HTML/CSS/JS with no build step.

* **GitHub Pages**: push this folder to a repository, then *Settings → Pages → Deploy from branch → main / (root)*.
* **Locally**: `python tools/serve.py --port 8765` and open <http://127.0.0.1:8765/>.
  To test with a run without using the folder picker: `python tools/serve.py --mount alpaca=/path/to/alpaca`
  and open `http://127.0.0.1:8765/?run=/mnt/alpaca/run/`.

Browsers: Chrome/Edge (folder picker + drag & drop), Firefox/Safari (drag & drop or the folder input).

## What it reads

Everything comes from the run folder (`config/`, `01_input/`, `03_multistart/`, `04_sampling/`, `05_posterior/`).
FITS (2-D images), NPZ/NPY (posterior, priors, best-fit sidecars), JSON and text summaries are parsed in JS
(`js/core/parsers`). The perturber catalog (`data/perturbers.json`) lives outside the run folder in ALPACA; drop the
experiment folder containing both `data/` and `run/` so multi-plane redshifts and z_lens / z_source are found.

## Forward model

`js/physics` is a port of the exact model ALPACA samples (herculens + ALPACA patches): EPL (Tessore & Metcalf series),
external shear, SIS/SIE perturbers, multi-plane ray shooting with the fiducial eta matrix, adaptive correlated-field
source grid, supersampled rendering, PSF convolution on the supersampled grid and average pooling, sub-pixel point sources.
`test/verify_physics.mjs` compares it against reference arrays dumped from Python (`tools/dump_reference.py`);
on the bundled example run all components agree to ~1e-8 relative.

## Layout

```
index.html            page shell
css/app.css           theme
js/main.js            app: run loading, workspace, panels
js/core/              file ingestion, parsers, worker, run model, blinding, stats, contours, colormaps
js/physics/           cosmology, profiles, multi-plane, FFT, renderer, lensing maps
js/ui/                image canvas, plots, panel chrome, widgets
js/applets/           one module per applet + registry/presets
tools/                dev server, Python reference dump
test/                 Node verification of the physics port
```
