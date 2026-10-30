# ALPACA analysis

A browser-side analysis workbench for [ALPACA](https://github.com/hkrizic/alpaca) lens-modelling runs.
Drop a run folder onto the page and get modular, linkable applets: run overview, parameter tables,
corner plots, image/model/residual viewers, a **forward-model lab that re-renders the lens model in the
browser** (lens-light components, pixelated source, point sources), a **ray-shooting lab** (click a feature in the
data, model or residual to trace it to the source reconstruction through the full multi-plane model, with all
counter images found by Newton iterations on the exact mapping), lensing maps with critical curves and
caustics, H₀ from D_Δt, a **mass-sheet degeneracy** module, three **model checks** (residual statistics, flux ratios &
magnifications, the D_Δt precision budget), PSF comparison, optimisation diagnostics, a plot gallery and two-run
comparison.

The default *model* in every viewer is the forward model of the best log-likelihood posterior draw (rendered in the
browser); residuals use it too. Every residual view has a switch for the PSF-error noise boost
(σ_eff = √(σ² + b²·PS²) with the sampled b for posterior draws or the fitted b for the MAP) versus the plain noise map. Runs without a posterior, blinded runs without a
key, and runs whose perturber catalog is missing fall back to the MAP `model_image.fits`.

Panels can be added from the sidebar, duplicated, dragged to reorder, and resized by their edges; image views zoom
with the wheel and pan by dragging, the corner plot scales with Ctrl/⌘ + wheel and zooms its ranges with Shift + wheel.

Nothing is uploaded anywhere: files are read with the browser File API and all computation happens
client-side (Web Workers).

**Blinding.** Blinded runs stay blinded on screen, always. The blinding key is used *only inside computations*. It is
picked up automatically from any `*.key` file in the opened folder, like the perturber catalog (`blinding*.key` and the
files closest to the run first; the sealed offsets' MAC check decides which one is the run's). You can also type it in, or
drop the `.key` file onto any key box. It is used to evaluate the forward model
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

**Model checks** (preset *Model checks*).
* *Residual statistics* asks whether the residual is noise. It shows normalised residuals inside the likelihood
  mask (with or without the PSF-error term b) against N(0, 1), with tails and a Q–Q plot. It plots χ² against radius
  in units of θ_E and against the distance to the nearest quasar image, which is the PSF-mismatch signature, and the
  mean residual against angle in the arc annulus. Finally it compares the residual autocorrelation in the lens region
  with the empty sky beyond 2 θ_E, which carries the noise's own correlation.
* *Flux ratios & magnifications* evaluates the exact multi-plane Jacobian at every image of every posterior draw (and
  of the MAP). It gives parities, the source-plane scatter and model flux ratios. These are compared draw by draw with
  the fitted point-source amplitudes, and with external fluxes you type in, e.g. mid-IR, stored per lens. It also
  lists ALPACA's H₀-independent time-delay ratios. Absolute |μ| is withheld while a run is blinded.
* *What limits D_Δt* decomposes the posterior variance of D_Δt (or any parameter) over parameter groups. It gives the
  share each group explains, the width left if the group were known exactly, and the strongest single parameters.
  For D_Δt it adds the floor set by the measured delays and their covariance alone. The analysis is blinding-safe,
  because the blinding offsets do not change widths or correlations.

**Kinematics and the mass sheet.** Runs with stellar kinematics (ALPACA ≥ 0.5.1, `likelihood.use_kinematics`) sample
D_dt as the *lens-model* distance; the physical distance is D_dt / [λ_int (1 − κ_ext)] (large-core internal MST), with
λ_int free (`kin_lambda_int`) or fixed. The H₀ applet and the unblinding reveal use the physical distance (the lens-model
H₀ is one switch away), read from `kinematics_metadata.json` or the config. The **Mass-sheet degeneracy** applet shows
the λ_int posterior against its prior, its degeneracies with γ, the anisotropy and D_Δt, the MST family of the
convergence profile, the kinematic nuisances (anisotropy, IFU centring), the H₀ precision budget (lens model alone vs
with the mass sheet) and a what-if that propagates external κ_ext and λ_int priors onto H₀. With joint kinematics the
data constrain λ_int (1 − κ_ext), so an external κ_ext prior only reweights draws against the λ_int prior bounds; without
kinematics both priors multiply the lens-model H₀. Runs that used `importance_sample` get a posterior selector for the
`05_posterior/kinematics_importance/` set (sealed with its own blinding offsets). For aperture kinematics the applet
also predicts the velocity dispersion of every posterior draw and of the GD MAP (`js/physics/kinematics.js`, a port of
ALPACA's spherical Jeans solver with the same quadratures; it matches `SphericalPowerLawKinematics.predict` to ~1e-14)
and plots it against the measured σ; the λ_int = 1 prediction is shown only for unblinded runs. Resolved (IFU) runs
need the IFU data file, which is not in the run folder; with an importance update the per-bin best fit stored by
ALPACA is shown instead. Blinded runs show λ_int and H₀ only as
deviations from their mean; the convergence-profile plot then uses an isothermal reference with the posterior spread.

**Multiband runs** (ALPACA ≥ 0.6.0, `run_multiband.py`). Drop the multiband output folder (the one holding `bands/`,
`joint/` and `multiband_config_used.json`). It opens as one run with a **band switch** in the sidebar. Every band is
shown through the joint fit: its own data, PSF, noise and stages from `bands/<band>/`, and the band's *view* of the
joint posterior (`joint/posterior/`) or of the joint MAP (`joint_map_params_full.npz`). A view is the band's own
`<band>/…` parameters plus every shared one, with shared image-plane positions shifted by the band's frame offset,
exactly as `alpaca.multiband.model.JointModel.view` (checked by `test/verify_multiband.mjs`). So every applet above works
on any band; *other band as B* opens a second band as run B for the two-run panels. The joint MAP is a parameter
source of its own (*MAP · joint fit*); with blinding, its sealed entries (`__sealed_blinded__`) open only with the key.
Three applets are made for multiband runs (preset *Multiband*):
* *Multiband: bands & sharing* — the bands (wavelength, pixel scale, fit pixels, frame offset, sampled b), what is
  shared and what is per band, χ²ᵥ per band alone / at the joint start / joint, χ² per image region and band, the joint
  polish and sampling, how far each band alone would put the lens from the joint solution in joint-posterior σ
  (ALPACA's `mass_shift_vs_alone`), and ALPACA's joint figures and REPORT.md.
* *Multiband: band comparison* — every band rendered from one joint parameter set (the same joint draw, or the joint
  MAP): data, model, normalised residual and source per band (zoom linked in arcsec), χ² per region and band, and Lupton
  asinh colour composites of the data, the model and the source reconstructions, resampled onto one grid at the fitted
  frame offsets.
* *Multiband: chromatic flux ratios & registration* — point-source flux ratios per band (as Δm, joint draws) against
  the achromatic macro model (shared lens), band-to-band changes draw by draw with their significance (chromatic
  microlensing, differential extinction, PSF leakage), the frame-offset posterior of every band with its prior, and the
  PSF-error term b per band.
Blinding is kept as for single-band runs: blinded columns are shown as deviations from their mean. A joint posterior
written by the original ALPACA 0.6.0 joint NUTS (blinded twice: stored mean = minus the true mean) is recognised by
its far-from-zero blinded means and re-centred in memory to the once-blinded form, so nothing absolute is displayed.

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
(`js/core/parsers`). The perturber catalog is read from the run's own copy, `01_input/perturbers.json` (ALPACA ≥ 0.5.1);
for older runs it lives outside the run folder (`data/perturbers.json`), so drop the experiment folder containing both
`data/` and `run/` so multi-plane redshifts and z_lens / z_source are found.

## Forward model

`js/physics` is a port of the exact model ALPACA samples (herculens + ALPACA patches): EPL (Tessore & Metcalf series),
external shear, SIS/SIE perturbers and their Sérsic lens light, multi-plane ray shooting with the fiducial eta matrix, adaptive correlated-field
source grid, supersampled rendering, PSF convolution on the supersampled grid and average pooling, sub-pixel point sources.
`test/verify_physics.mjs` compares it against reference arrays dumped from Python (`tools/dump_reference.py`);
on the bundled example run all components agree to ~1e-8 relative.

## Layout

```
app.html              page shell (index.html is the landing page)
css/app.css           theme
js/main.js            app: run loading, workspace, panels
js/core/              file ingestion, parsers, worker, run model, blinding, stats, contours, colormaps,
                      multiband runs (multiband.js) and band views (mbview.js)
js/physics/           cosmology, profiles, multi-plane, FFT, renderer, lensing maps
js/ui/                image canvas, plots, panel chrome, widgets
js/applets/           one module per applet + registry/presets
tools/                dev server, Python reference dump
test/                 Node verification of the physics port and of the multiband views
                      (multiband_reference.py + verify_multiband.mjs; tools/smoke_multiband.mjs headless)
```
