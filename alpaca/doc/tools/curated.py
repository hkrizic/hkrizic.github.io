"""Hand-written explanations for configuration keys, applied by extract_knobs.py on top of the code docstrings.

CURATED[key] = dict(html=..., warnings=[...], related=[...]); every field is optional and REPLACES what the
code docstrings or the previous build said. Write rules, not anecdotes: say what a key does, its default, when to
change it, and what it interacts with.
"""

_TD_EXAMPLE = """<pre><code>"time_delays": {
  "convention": "t_X - t_Y",
  "delays": {"AB": [-9.0, 0.8], "AC": [-0.8, 0.7], "AD": [-13.8, 0.8]},
  "covariance": "independent"
}</code></pre>"""

CURATED = {
    # ------------------------------------------------------------------ config file
    "config_version": dict(
        html="<p>Optional layout stamp: <code>2</code> = the current layout (<code>run</code>, <code>data</code>, "
             "<code>mass</code>, <code>light</code>, <code>stages</code>, <code>psf</code>, <code>likelihood</code>, "
             "<code>sampling</code>, <code>plotting</code>, <code>blinding</code>), <code>1</code> = the legacy flat "
             "layout. You do not need it: ALPACA detects the layout from the keys, and the copy written to "
             "<code>&lt;run&gt;/config/config.json</code> no longer carries it.</p>"),

    # ------------------------------------------------------------------ data
    "data.n_ps_detect": dict(
        html="<p>Number of point images to detect automatically. <code>null</code> (default) detects 4; images "
             "that are not found are then recovered near the approximate positions you supply "
             "(<code>IMAGE_POSITIONS</code>). Set it for other image counts, e.g. <code>2</code> for a double, or "
             "more than 4 for a system with extra images.</p>",
        related=["data.ps_min_peak_frac", "data.ps_min_sep", "light.point_sources.position_bound_px"]),

    # ------------------------------------------------------------------ mass
    "mass.main.center_sigma": dict(
        html="<p>Width (arcsec) of the Normal prior of the mass centre around the lens-light centre. "
             "<code>null</code> (default) chooses by mode: 0.3″ when point images anchor the mass (quasars), "
             "0.05″ without them (galaxy–galaxy), where nothing else ties the mass to the lens galaxy and a "
             "multistart could otherwise place a small \"lens\" on an arc.</p>",
        related=["mass.main.theta_E_prior", "light.point_sources.enabled"]),
    "mass.main.flexion.enabled": dict(
        html="<p>Add a free external flexion to the main deflector: the cubic term of an external lens potential, "
             "centred on the lens, one order beyond the external shear. It absorbs the gradient of the "
             "environment's convergence and shear across the lens. Four sampled parameters "
             "<code>lens_flex_g1</code> … <code>lens_flex_g4</code> (1/arcsec), each "
             "TruncatedNormal(0, <code>sigma</code>; ±<code>max</code>). Off by default.</p>",
        related=["mass.main.flexion.sigma", "mass.main.flexion.max", "mass.main.profile"]),
    "mass.main.flexion.sigma": dict(
        html="<p>Width of the TruncatedNormal prior of each flexion component (1/arcsec, default 0.05). Must be "
             "positive.</p>"),
    "mass.main.flexion.max": dict(
        html="<p>Truncation of each flexion component at ±max (1/arcsec, default 0.5). A component at this bound "
             "is a warning sign, as for any prior bound.</p>"),
    "mass.main.bpl.deflection": dict(
        html="<p>How the broken-power-law deflection is evaluated: <code>\"series\"</code> (default), a "
             "closed-form homoeoid / Legendre series, more accurate and about 3× cheaper than the quadrature; "
             "<code>\"quadrature\"</code>, the original two-panel Gauss–Legendre evaluation.</p>"),
    "mass.perturbers.path": dict(
        html="<p>The perturber catalogue (JSON: a <code>target</code> block and a list of "
             "<code>perturbers</code>; format in the guide, <a href=\"#perturbers\">Perturbers</a>). "
             "<code>null</code> = no perturbers: the model is then exactly the single-plane pipeline. Each "
             "perturber gets the mass profile declared in its entry, and optionally a light model; perturbers "
             "outside <code>z_tolerance</code> of the lens redshift get their own planes, which switches the "
             "forward model to multi-plane lensing.</p><p><code>PERTURBERS_PATH</code> in "
             "<code>run_alpaca.py</code>, when not <code>None</code>, overrides this. Relative paths are relative "
             "to the working directory; use absolute paths.</p>",
        warnings=["A perturber's light is modelled only when its catalogue entry has a lens_light block. Mask "
                  "every other galaxy in data.likelihood_mask_path, or its flux biases the fit."],
        related=["mass.perturbers.mode", "mass.perturbers.z_tolerance", "mass.perturbers.priors.fix_positions",
                 "stages.cf_joint.perturber_fields.pertN.num_pixels"]),

    # ------------------------------------------------------------------ light
    "light.lens.initial": dict(
        html="<p>Lens-light model of the multistart (stage 1) and, unless the refit changes it, of stage 3:</p>"
             "<ul><li><code>\"sersic\"</code>: one Sérsic profile;</li>"
             "<li><code>\"double-sersic\"</code>: bulge + envelope;</li>"
             "<li><code>\"triple-sersic\"</code>: a third component for the core;</li>"
             "<li><code>\"MGE\"</code>: a multi-Gaussian expansion replaces the Sérsics;</li>"
             "<li><code>\"MGE+double-sersic\"</code> / <code>\"MGE+triple-sersic\"</code>: the Sérsics carry the "
             "profile, a small Gaussian stack absorbs core structure.</li></ul>"
             "<p><code>null</code> derives the model from the legacy booleans (<code>use_double_sersic_lens</code>, "
             "<code>use_triple_sersic_lens</code>, <code>use_mge_lens_light</code>, <code>mge_as_correction</code>), "
             "still accepted in old configs. The number of MGE components is set in <code>light.lens.mge</code>.</p>",
        related=["light.lens.refit.profile", "light.lens.mge.n_components"]),
    "light.lens.refit.arc_mask_inner_radius": dict(
        html="<p>Inner radius (arcsec, about the main-deflector centre) of an arc annulus used ONLY by the "
             "lens-light refit, with <code>mask_arc</code> or <code>ps_sigma_clip_within: \"arc\"</code>. "
             "<code>null</code> for both radii (default) builds the annulus automatically from the image radii "
             "of the current solution: [min r<sub>i</sub> − w, max r<sub>i</sub> + w] with w = 0.2 × mean "
             "r<sub>i</sub>. Without point-image positions the refit falls back to the correlated-field arc "
             "mask.</p><p>Do not reuse the correlated-field arc mask for the light fit: it is sized for the source "
             "and much too wide, and removing that whole band deletes the region where the Sérsic effective "
             "radius is constrained. A narrow annulus around the ring removes the arc flux without that "
             "damage.</p>",
        related=["light.lens.refit.arc_mask_outer_radius", "light.lens.refit.mask_arc"]),
    "light.lens.refit.arc_mask_outer_radius": dict(
        html="<p>Outer radius (arcsec) of the refit-only arc annulus; must exceed "
             "<code>arc_mask_inner_radius</code>. <code>null</code> = automatic (see there).</p>",
        related=["light.lens.refit.arc_mask_inner_radius"]),
    "light.lens.refit.mask_arc": dict(
        html="<p>Give the arc region zero weight in the light-only refit (default <code>true</code>). The refit "
             "target, data − (source + point images), still contains arc flux that the smooth stage-1 source "
             "could not reproduce; the lens-light profile must not chase it. The arc is removed by position (an "
             "annulus), not by a residual clip, so the selection does not depend on the current model.</p>"
             "<p>The annulus is <code>arc_mask_inner_radius</code> / <code>arc_mask_outer_radius</code>, automatic "
             "when both are <code>null</code>. Without an annulus or an arc mask the refit warns and fits "
             "unmasked.</p>",
        related=["light.lens.refit.arc_mask_inner_radius", "light.lens.refit.simple_source"]),
    "light.lens.refit.init_cf_joint": dict(
        html="<p>With the lens light free in stage 3 (<code>stages.cf_joint.lens_light: \"free\"</code>), start "
             "stage 3's lens-light and sky parameters from the refit (default <code>true</code>): that is the "
             "purpose of the refit, a light profile fitted on the full frame. The refit's components are matched "
             "to the stage-3 model's components by the assignment that needs the least clipping of R<sub>e</sub> "
             "and n into their priors. <code>false</code> = the legacy start from the stage-1 light (the refit "
             "result is then computed but not used).</p>",
        related=["stages.cf_joint.lens_light", "light.lens.refit.enabled"]),
    "light.lens.refit.distinct_n_init": dict(
        html="<p>Start the Sérsic indices of the refit components at different values (2.5 / 1 / 4) instead of "
             "all at 3. <code>null</code> (default) follows <code>smooth_bounds</code>.</p>",
        related=["light.lens.refit.smooth_bounds"]),
    "light.lens.refit.n_sersic_max": dict(
        html="<p>Upper bound of the Sérsic index n of every refit component (default 8); pairs with "
             "<code>n_sersic_min</code>. A component at either bound is a warning sign.</p>"),
    "light.lens.refit.smooth_bounds": dict(
        html="<p>Bound the Sérsic index and the ellipticities of the refit components with smooth bijections "
             "(n = 0.5 + 7.5·sigmoid, e = 0.4·tanh) instead of a hard clip. Default <code>false</code>. A hard "
             "clip has zero gradient beyond its bound, so a parameter pushed past it cannot come back: with "
             "<code>false</code>, check that no component sits exactly at a bound of n or e. <code>true</code> "
             "also starts the Sérsic indices at different values (see <code>distinct_n_init</code>).</p>",
        related=["light.lens.refit.distinct_n_init", "light.lens.refit.n_sersic_min"]),
    "light.sky_background_fixed_amp": dict(
        html="<p>Hold the uniform sky fixed instead of fitting it:</p><ul>"
             "<li><code>null</code> (default): the sky amplitude <code>sky_amp</code> is a free parameter (when "
             "<code>light.sky_background</code> is on);</li>"
             "<li>a number: the sky is fixed at that value (model units, per arcsec²) everywhere;</li>"
             "<li><code>\"refit\"</code>: the sky is fitted by the full-frame lens-light refit and then held at "
             "that value in stage 3 and in sampling. On the full frame the refit separates sky and lens light; "
             "on the small modelling grid alone the sky trades off against an extended light envelope.</li></ul>",
        warnings=["\"refit\" needs light.lens.refit.enabled; without the refit ALPACA warns and the sky stays "
                  "free."],
        related=["light.sky_background", "light.sky_psf", "light.lens.refit.sky_anchor"]),
    "light.sky_psf": dict(
        html="<p>How the uniform sky enters the model: <code>\"unconvolved\"</code> (default) adds it after the "
             "PSF convolution, as a real sky pedestal; <code>\"convolved\"</code> (legacy) puts it inside the "
             "convolution, where the zero-padded convolution darkens the sky towards the frame edges.</p>",
        related=["light.sky_background", "light.sky_background_fixed_amp"]),
    "light.point_sources.enabled": dict(
        html="<p>Whether the lens has point images (lensed quasar or supernova). <code>false</code> = "
             "galaxy–galaxy mode: no point-image detection, no image positions or fluxes, no time delays, "
             "astrometry or ray-shooting terms, no point-image overlays. The joint PSF and the staged workflow "
             "(refit, correlated-field source) still run; the PSF is then constrained by the STARRED seed, its "
             "priors and the extended light.</p>",
        warnings=["With point sources off, validation switches off (one grouped message in the log): "
                  "likelihood.use_time_delays, use_rayshoot_consistency, use_image_pos_offsets, "
                  "noise_model.noise_boost and noise_model.use_psf_error_map; psf.mode \"iterative\" becomes "
                  "\"fixed\" (it needs point images). likelihood.astrometry_mode can stay \"image_plane\": "
                  "without two point images no astrometry term is built."],
        related=["mass.main.theta_E_prior", "mass.main.center_sigma", "likelihood.astrometry_mode"]),
    "light.point_sources.position_bound_px": dict(
        html="<p>Bound the fitted position of every point image to ± this many pixels around its detected "
             "position: a TruncatedNormal(detected, 1 px) instead of the default unbounded Normal(detected, "
             "1 px). It applies in GD, in the warm start and in sampling. Use it when a faint image sits next to "
             "bright extended light and could wander onto it. <code>null</code> (default) = unbounded.</p>",
        warnings=["A GD value exactly on the bound cannot be transferred to the sampler; the warm start then "
                  "stops with an error. Widen the bound."],
        related=["data.n_ps_detect", "likelihood.sigma_ast"]),

    # ------------------------------------------------------------------ stages
    "stages.cf_joint.lens_light": dict(
        html="<p>Whether the lens light is <code>\"free\"</code> (default) in stage 3 or <code>\"fixed\"</code> at "
             "the refit result. Free: the light is fitted together with the source, the mass and the PSF, "
             "starting from the refit when <code>light.lens.refit.init_cf_joint</code> is true (default). Fixed: "
             "stage 3 fits against the frozen refit light (foreground perturbers are then frozen too, see "
             "<code>light.lens.refit.freeze_foreground_perts</code>).</p>",
        warnings=[],
        related=["light.lens.refit.init_cf_joint", "light.lens.refit.enabled", "stages.cf_joint.enabled"]),
    "stages.cf_joint.source.mean_intensity": dict(
        html="<p>Prior mean intensity of the correlated-field source (the field is exponentiated, so this sets "
             "its log-mean). <code>null</code> (default) uses the 70th percentile of the image.</p>",
        warnings=["Together with a tight offset_std (shipped: [0.1, 0.001]) the mean intensity pins the source's "
                  "log-mean. Once the smoothness hyperparameters are fixed, the default can leave a faint "
                  "pedestal across the whole source grid (a dark-source residual pattern). Set it to about 0.1 × "
                  "the noise level so the source is dark where there is no flux."],
        related=["stages.cf_joint.source.offset_std", "stages.cf_joint.source.loglogavgslope"]),
    "stages.cf_joint.convergence.enabled": dict(
        html="<p>Stop stage 3 on a plateau instead of a fixed budget. The best loss (−log posterior in nats) is "
             "sampled every 200 steps; stage 3 stops at step t once "
             "best(t − window) − best(t) ≤ max(<code>abs_tol</code>, <code>rel_tol</code> · max(1, |best(t)|)) and "
             "t ≥ max(<code>window</code>, <code>min_steps</code>). <code>stages.cf_joint.adam_steps</code> stays "
             "the maximum.</p><p>With <code>false</code> (default) stage 3 runs its full budget, but the same "
             "improvement over the last window is still measured, written to "
             "<code>stage3_cf_joint/stage_summary.json</code> (<code>optimizer</code>: stop reason, steps run, "
             "best step, convergence) and a WARNING is printed when stage 3 ended on its budget while still "
             "improving.</p>",
        related=["stages.cf_joint.adam_steps", "stages.cf_joint.convergence.window",
                 "stages.cf_joint.convergence.abs_tol"]),
    "stages.cf_joint.convergence.window": dict(
        html="<p>Steps over which the improvement is measured (default 4000, at least 200).</p>"),
    "stages.cf_joint.convergence.abs_tol": dict(
        html="<p>Absolute plateau tolerance in nats over one window (default 1.0).</p>"),
    "stages.cf_joint.convergence.rel_tol": dict(
        html="<p>Relative plateau tolerance, a fraction of |best loss| (default 0 = off). The larger of "
             "<code>abs_tol</code> and <code>rel_tol</code>·|loss| is used.</p>"),
    "stages.cf_joint.convergence.min_steps": dict(
        html="<p>Never stop before this many steps (default 0; the window itself is always a minimum).</p>"),
    "stages.cf_joint.perturber_fields.pertN.num_pixels": dict(
        html="<p><code>stages.cf_joint.perturber_fields</code> gives a perturber's light a correlated field of "
             "its own, on a pixel grid in the perturber's own plane, exactly like the source field. "
             "<code>pertN</code> stands for the perturber's model name, <code>pert</code> + its catalogue "
             "<code>id</code> (e.g. <code>pert1</code>). The perturber must sit on its own (not the main) plane, "
             "with lensed light and a light model in the catalogue; two fields cannot share a plane. Needs "
             "<code>stages.cf_joint.enabled</code>.</p><p>Stage 1 keeps the catalogue (analytic) light as a "
             "proxy, which sets the field's grid and amplitude; every correlated-field model (stage 3, warm "
             "start, sampling) uses the field alone, never field + analytic light.</p><p>This key: grid size "
             "per side (default 64, at least 4).</p>",
        related=["mass.perturbers.path", "stages.cf_joint.perturber_fields.pertN.grid.mode",
                 "stages.cf_joint.source.num_pixels"]),
    "stages.cf_joint.perturber_fields.pertN.loglogavgslope": dict(
        html="<p>(mean, std) prior of the amplitude-spectrum slope of the field, as for the source field "
             "(default [−3.0, 0.5]). A std far below |mean| fixes it; choose fixed values by cross-validation "
             "(<code>alpaca.diagnostics.cf_cv --field pertN</code>).</p>"),
    "stages.cf_joint.perturber_fields.pertN.fluctuations": dict(
        html="<p>(mean, std) prior of the field's fluctuation amplitude (default [1.0, 0.5]).</p>"),
    "stages.cf_joint.perturber_fields.pertN.offset_std": dict(
        html="<p>(mean, std) prior of the zero-mode standard deviation (default [2.0, 0.001]).</p>"),
    "stages.cf_joint.perturber_fields.pertN.offset_mean": dict(
        html="<p>Log mean intensity of the field. <code>\"auto\"</code> (default) = ln(level) + "
             "<code>offset_mean_shift</code>, where level is the 90th percentile of the stage-1 light of that "
             "plane inside the grid mask (counts per pixel). Or a number.</p>"),
    "stages.cf_joint.perturber_fields.pertN.offset_mean_shift": dict(
        html="<p>Shift added to ln(level) by <code>offset_mean: \"auto\"</code> (default −6: the field starts "
             "flat at 0.25 % of the level and grows together with the source in the source-only phase of "
             "stage 3).</p>"),
    "stages.cf_joint.perturber_fields.pertN.flexibility": dict(
        html="<p>Optional (mean, std) prior of the spectrum's flexibility; <code>null</code> = off.</p>"),
    "stages.cf_joint.perturber_fields.pertN.asperity": dict(
        html="<p>Optional (mean, std) prior of the spectrum's asperity; needs <code>flexibility</code>.</p>"),
    "stages.cf_joint.perturber_fields.pertN.cropped_border_size": dict(
        html="<p>Padding (pixels) of the field grid that is cropped away to avoid periodic-boundary artefacts "
             "(default 10).</p>"),
    "stages.cf_joint.perturber_fields.pertN.interpolation_type": dict(
        html="<p>Interpolation of the field grid onto ray-traced positions: <code>\"fast_bilinear\"</code> "
             "(default), <code>\"bilinear\"</code> or <code>\"bicubic\"</code>.</p>"),
    "stages.cf_joint.perturber_fields.pertN.grid.mode": dict(
        html="<p>The image-plane mask whose outline, ray-traced to the perturber's plane with the current mass, "
             "sets the field's grid extent (the mask does not clip the field):</p><ul>"
             "<li><code>\"model\"</code> (default): the stage-1 light of that plane, unconvolved, above "
             "<code>frac</code> × its peak, dilated by <code>dilate_pix</code>;</li>"
             "<li><code>\"circles\"</code>: the union of <code>circles</code>;</li>"
             "<li><code>\"file\"</code>: a boolean image <code>path</code> on the model grid.</li></ul>"
             "<p><code>circles</code> given with another mode are added to it.</p>"),
    "stages.cf_joint.perturber_fields.pertN.grid.frac": dict(
        html="<p><code>\"model\"</code> mode: threshold as a fraction of the peak of the stage-1 plane light "
             "(default 0.02; between 0 and 1).</p>"),
    "stages.cf_joint.perturber_fields.pertN.grid.dilate_pix": dict(
        html="<p>Dilation of the mask in pixels (default 3).</p>"),
    "stages.cf_joint.perturber_fields.pertN.grid.circles": dict(
        html="<p>List of circles <code>[[x, y, r], …]</code> in arcsec (model frame); required for "
             "<code>\"circles\"</code> mode, added to the mask in the other modes.</p>"),
    "stages.cf_joint.perturber_fields.pertN.grid.path": dict(
        html="<p>Boolean mask (<code>.fits</code> / <code>.npy</code>) on the model grid for <code>\"file\"</code> "
             "mode.</p>"),
    "stages.cf_joint.perturber_fields.pertN.grid.scale": dict(
        html="<p>Factor applied to the grid extent derived from the traced mask (default 1).</p>"),
    "stages.gd.optimizer.anneal.mode": dict(
        html="<p>Noise annealing of the multistart: the likelihood noise is inflated at first and brought down "
             "to the real noise, so starts can cross between basins.</p><ul>"
             "<li><code>\"discrete\"</code>: the ladder <code>anneal.levels</code>, a fixed noise factor per rung "
             "(default when levels are set);</li>"
             "<li><code>\"continuous\"</code>: the factor decays exponentially from <code>level_hi</code> to "
             "<code>level_lo</code> over <code>segments</code> segments; compiles once for the whole "
             "schedule;</li>"
             "<li><code>\"off\"</code>: no annealing.</li></ul>"
             "<p><code>null</code> resolves to <code>\"discrete\"</code> when levels are set, <code>\"off\"</code> "
             "otherwise.</p>",
        related=["stages.gd.optimizer.anneal.levels", "stages.gd.optimizer.halving.keep"]),
    "stages.gd.optimizer.exec_mode": dict(
        html="<p>How the multistart runs its starts: <code>\"auto\"</code> (default) spreads them over several "
             "devices with pmap when there is more than one device, otherwise runs them one after another; "
             "<code>\"sequential\"</code> / <code>\"distributed\"</code> force one of the two; <code>\"vmap\"</code> "
             "is the old batched path, kept to reproduce older runs. One start already saturates a GPU, so "
             "batching starts on one device does not make them faster.</p>"),
    "stages.gd.optimizer.lbfgs.impl": dict(
        html="<p>L-BFGS implementation: <code>\"optax\"</code> (default) uses a zoom line search with Wolfe "
             "conditions and stops on the gradient norm; <code>\"jaxopt\"</code> always runs "
             "<code>maxiter</code> iterations and is unmaintained, kept to reproduce older runs.</p>"),

    # ------------------------------------------------------------------ psf
    "psf.input.error_map_path": dict(
        html="<p>Per-pixel 1σ map of the input PSF (<code>.npy</code> / <code>.npz</code> / FITS), on the grid of "
             "the seed's background. In joint mode with <code>psf.joint.priors.background.type: "
             "\"error_map\"</code> it sets the prior width of every free PSF pixel: about 1–10 % of the kernel. "
             "Too loose and the PSF fits noise around bright images; too tight and it cannot correct the seed. "
             "<code>PSF_ERROR_MAP_PATH</code> in <code>run_alpaca.py</code>, when not <code>None</code>, overrides "
             "it.</p>",
        related=["psf.joint.priors.background.type", "psf.input.error_map_resampling", "psf.joint.seed_path"]),
    "psf.input.oversample": dict(
        html="<p>Supersampling factor of the PSF file relative to the image pixels: 1 = the PSF is sampled like "
             "the data; N &gt; 1 = N× finer (usually 3). With N &gt; 1 the model is convolved at the fine "
             "resolution. <code>PSF_OVERSAMPLE</code> in <code>run_alpaca.py</code>, when not <code>None</code>, "
             "overrides it.</p>"),
    "psf.joint.seed_path": dict(
        html="<p>The STARRED seed (<code>.npz</code> with <code>kwargs_moffat</code>, the analytic core, and "
             "<code>kwargs_background</code>, the pixel grid) from a PSF fit to field stars. Required in joint "
             "mode: the live PSF is built from this seed, not from the kernel file, so the two must agree (the "
             "seed's full PSF reproduces the kernel to better than 1 % of the peak). "
             "<code>PSF_STARRED_KWARGS_PATH</code> in <code>run_alpaca.py</code>, when not <code>None</code>, "
             "overrides it.</p>",
        related=["psf.input.error_map_path", "psf.joint.free", "psf.mode"]),

    # ------------------------------------------------------------------ likelihood
    "likelihood.use_time_delays": dict(
        html="<p>Include the time-delay likelihood: the model's delays (Fermat-potential differences × "
             "D<sub>Δt</sub>) against the measured delays in <code>likelihood.time_delays</code>. "
             "<code>true</code> makes the run a D<sub>Δt</sub> / H<sub>0</sub> inference; <code>false</code> "
             "for imaging-only fits.</p><p><code>run_alpaca.py</code> stops with an error when this is "
             "<code>true</code>, point sources are on and no delays are given. It is switched off automatically "
             "in galaxy–galaxy mode.</p>",
        related=["likelihood.time_delays", "likelihood.D_dt_prior.type", "blinding.enabled"]),
    "likelihood.time_delays": dict(
        html="<p>The measured time delays in days, pasted as published. <code>null</code> = no delays. The block "
             "has the keys <code>delays</code>, <code>convention</code>, <code>covariance</code>, and optionally "
             "<code>pair_noise</code> and <code>reference_image</code>:</p>" + _TD_EXAMPLE +
             "<p>Every likelihood (GD, NumPyro NUTS, NIFTy, Nautilus) uses the n−1 delays relative to the "
             "reference image. The run log prints the pair table, which image arrives later, and the delays and "
             "errors actually used: check it once for every lens. <code>TIME_DELAYS</code> in "
             "<code>run_alpaca.py</code>, when not <code>None</code>, overrides this block.</p>",
        related=["likelihood.time_delays.delays", "likelihood.time_delays.convention",
                 "likelihood.time_delays.covariance", "likelihood.use_time_delays"]),
    "likelihood.time_delays.delays": dict(
        html="<p>The delays, keyed by image pair, <code>\"AB\"</code> or <code>\"A-B\"</code>; each value is "
             "<code>[value, σ]</code> or <code>[value, +σ, −σ]</code> (asymmetric errors are symmetrised, with a "
             "note in the log). The labels are the run's image labels (<code>IMAGE_POSITIONS</code> in "
             "<code>run_alpaca.py</code>, or <code>multiband.image_positions</code>).</p><p>Give the n−1 "
             "independent delays relative to one image (three for a quad). With <code>covariance: "
             "\"independent\"</code> a redundant table (e.g. all six pairs of a quad) is refused, because the pairs "
             "share light curves; use <code>\"shared_curves\"</code> or a matrix for such tables.</p><p>Legacy form "
             "(ALPACA ≤ 0.5.1), still accepted: single labels, <code>{\"B\": [t_B − t_ref, σ], …}</code>. Its sign "
             "is the opposite of the published Δt<sub>AB</sub> = t<sub>A</sub> − t<sub>B</sub>.</p>",
        warnings=["Paste COSMOGRAIL / H0LiCOW / TDCOSMO delays with their published signs: the default convention "
                  "\"t_X - t_Y\" is theirs. Do not flip them."],
        related=["likelihood.time_delays.convention", "likelihood.time_delays.covariance"]),
    "likelihood.time_delays.convention": dict(
        html="<p>What the value of key <code>\"XY\"</code> means: <code>\"t_X - t_Y\"</code> (default; the "
             "convention of the COSMOGRAIL, H0LiCOW and TDCOSMO tables) or <code>\"t_Y - t_X\"</code>. A positive "
             "t<sub>X</sub> − t<sub>Y</sub> means that X arrives after Y.</p>"),
    "likelihood.time_delays.covariance": dict(
        html="<ul><li><code>\"independent\"</code> (default): each listed delay has its own error; at most n−1 "
             "delays without a cycle;</li>"
             "<li><code>\"shared_curves\"</code>: every pair is measured from two light curves; a timing error "
             "per curve is fitted to the published pair errors, so pairs that share an image are correlated. "
             "Needs a redundant table (each image in at least two pairs, with a triangle), e.g. all six pairs of "
             "a quad;</li>"
             "<li>a matrix: the covariance of the listed delays in days², rows in the order of "
             "<code>delays</code>; or the path of a <code>.npy</code> / <code>.txt</code> / <code>.csv</code> / "
             "<code>.json</code> file holding it;</li>"
             "<li><code>{\"correlation\": R}</code>: a correlation matrix, combined with the listed errors.</li></ul>"
             "<p>Redundant tables are combined exactly into the n−1 delays relative to the reference. With "
             "<code>\"shared_curves\"</code> the listed delays must close (t<sub>XY</sub> + t<sub>YZ</sub> = "
             "t<sub>XZ</sub>) to within 1.5 × the largest pair error; a larger violation is a sign or label error "
             "and stops the run (add <code>pair_noise</code> for measured pairs that genuinely do not close).</p>"),
    "likelihood.time_delays.pair_noise": dict(
        html="<p>An independent per-pair error (days) on top of the per-curve timing errors; only with "
             "<code>covariance: \"shared_curves\"</code>. Must be smaller than every listed pair error.</p>"),
    "likelihood.time_delays.reference_image": dict(
        html="<p>Label of the image the delays are taken relative to (the anchor of the likelihood). Overrides "
             "<code>REFERENCE_IMAGE</code> in <code>run_alpaca.py</code>. With a full covariance the likelihood "
             "does not depend on this choice.</p>"),
    "likelihood.astrometry_mode": dict(
        html="<p>How the measured positions of the point images constrain the mass model.</p><ul>"
             "<li><code>\"image_plane\"</code> (default since 0.6.0; the shipped <code>config.json</code> and the "
             "tutorials write it explicitly): one common source. The measured positions may differ from the "
             "model's images by a Gaussian of width <code>sigma_ast</code> in the image plane (mapped through each "
             "image's inverse magnification matrix); the common source is the magnification-weighted mean, and "
             "all time delays are evaluated for it. This likelihood is invariant under a mass-sheet "
             "transformation. In GD stage 1, with <code>rayshoot_against_source_pos: true</code>, the common source "
             "is the centre of the analytic host model, i.e. the quasar sits on its host's nucleus.</li>"
             "<li><code>\"source_plane\"</code> (the default up to 0.5.x, kept for comparisons): the back-traced "
             "source positions scatter around their mean with <code>rayshoot_sigma</code> plus the optional free "
             "floor <code>use_rayshoot_sys_error</code>. A fixed source-plane width scales with a mass sheet, so "
             "this term carries artificial mass-sheet information.</li></ul>"
             "<p><code>\"image_plane\"</code> requires <code>use_rayshoot_sys_error</code> off (its default "
             "<code>null</code> does that) and <code>use_image_pos_offsets: false</code>. A config without the key "
             "prints a one-line notice. Galaxy–galaxy lenses keep <code>\"image_plane\"</code>: with fewer than "
             "two point images no astrometry term is built, in GD and in sampling.</p>",
        warnings=["Runs written before 0.6.0 (no config/alpaca_provenance.json) and legacy-layout configs are "
                  "reloaded with the old defaults (source_plane, sigma_ast 0.003) for keys they omit, so an old "
                  "run keeps its meaning. Write the key explicitly in every config.",
                  "sampler \"nautilus\" refuses image_plane astrometry (it has only the source-plane terms)."],
        related=["likelihood.sigma_ast", "likelihood.use_rayshoot_sys_error", "likelihood.use_image_pos_offsets",
                 "likelihood.rayshoot_against_source_pos", "likelihood.td_common_source"]),
    "likelihood.sigma_ast": dict(
        html="<p>Width (arcsec) of the image-plane Gaussian between measured and model image positions in "
             "<code>astrometry_mode: \"image_plane\"</code>; must be positive. Default 0.005 (5 mas), about the "
             "image-position scatter a smooth lens model leaves on a JWST quad; 0.003, the default up to 0.5.x, "
             "is too tight. Smaller values tie the mass model more tightly to the image positions.</p>",
        related=["likelihood.astrometry_mode"]),
    "likelihood.td_common_source": dict(
        html="<p>Only for <code>astrometry_mode: \"source_plane\"</code> (<code>\"image_plane\"</code> always uses "
             "one source). <code>true</code> (default): all time delays are evaluated for ONE source position, the "
             "sampled centre of an analytic source when <code>rayshoot_against_source_pos</code> is set, otherwise "
             "the magnification-weighted common source. <code>false</code> uses each image's own back-traced "
             "position (ALPACA ≤ 0.5.0), which is physically inconsistent and adds first-order errors to the "
             "Fermat potential. Use <code>false</code> only to reproduce old runs.</p>"),
    "likelihood.use_rayshoot_sys_error": dict(
        html="<p>Sample a free systematic floor (arcsec, within <code>rayshoot_sys_error_range</code>) added to "
             "<code>rayshoot_sigma</code> in the source-plane astrometry. <code>null</code> (default) resolves to "
             "<code>true</code> for <code>astrometry_mode: \"source_plane\"</code> (its historical default) and "
             "<code>false</code> for <code>\"image_plane\"</code>, where <code>sigma_ast</code> replaces the floor. "
             "<code>true</code> together with <code>\"image_plane\"</code> is refused.</p>",
        related=["likelihood.astrometry_mode", "likelihood.rayshoot_sys_error_range", "likelihood.rayshoot_sigma"]),
    "likelihood.use_image_pos_offsets": dict(
        warnings=["Must be false with astrometry_mode \"image_plane\"."]),
    "likelihood.D_dt_prior.type": dict(
        html="<p>Prior of the time-delay distance D<sub>Δt</sub> (Mpc): <code>\"uniform\"</code> (default) or "
             "<code>\"log_uniform\"</code> between <code>low</code> and <code>high</code>. The same distribution "
             "is the <code>D_dt</code> parameter of every model: GD, NumPyro NUTS, NIFTy, Nautilus and the "
             "prior-bound report all use it.</p>",
        related=["likelihood.D_dt_prior.low", "likelihood.D_dt_prior.high", "likelihood.use_time_delays"]),
    "likelihood.D_dt_prior.low": dict(
        html="<p>Lower bound in Mpc (default 500, must be positive). Lower it for low-redshift lenses; check "
             "<code>boundary_flags.txt</code> for D_dt at a bound.</p>"),
    "likelihood.D_dt_prior.high": dict(
        html="<p>Upper bound in Mpc (default 10000); must exceed <code>low</code>.</p>"),
    "likelihood.kappa_ext_prior.mean": dict(
        html="<p>Mean of a Gaussian prior on the external convergence κ<sub>ext</sub> (truncated below 1). The "
             "default (mean 0, sigma 0) means no external convergence. κ<sub>ext</sub> enters the physical "
             "distance D<sub>Δt</sub><sup>phys</sup> = D<sub>Δt</sub> / (λ<sub>int</sub> (1 − κ<sub>ext</sub>)) "
             "and, with kinematics, the predicted velocity dispersions.</p><ul>"
             "<li>Without kinematics κ<sub>ext</sub> does not depend on the data: it is drawn per posterior "
             "sample into derived <code>kappa_ext</code> and <code>D_dt_physical</code> columns, and only when "
             "the distance is not blinded.</li>"
             "<li>With kinematics and sigma &gt; 0 it is a sampled parameter <code>kin_kappa_ext</code>, blinded "
             "like <code>kin_lambda_int</code>; sigma = 0 fixes it at the mean.</li></ul>"
             "<p>mean + 5·sigma must stay below 1. Set this or <code>likelihood.kinematics.kappa_ext</code>, not "
             "both.</p>",
        related=["likelihood.kappa_ext_prior.sigma", "likelihood.use_kinematics"]),
    "likelihood.kappa_ext_prior.sigma": dict(
        html="<p>Width of the κ<sub>ext</sub> prior (≥ 0; 0 = fixed at the mean). Not supported by the "
             "kinematics importance sampler (<code>kinematics.importance_sample</code>); use the joint "
             "likelihood.</p>"),
    "likelihood.noise_model.psf_error_b_mode": dict(
        html="<p>When the PSF-error amplitude b (σ<sup>2</sup><sub>eff</sub> = σ² + b²·PS²) is fitted:</p><ul>"
             "<li><code>\"post_gd_free\"</code> (default): b = 0 through GD stages 1–3, then an exact 1-D fit of "
             "b at the stage-3 optimum; sampling keeps b free, starting at that value;</li>"
             "<li><code>\"post_gd_fixed\"</code>: the same, but sampling holds b at the fitted value;</li>"
             "<li><code>\"joint\"</code>: b free in GD and in sampling (legacy).</li></ul>",
        related=["likelihood.noise_model.use_psf_error_map", "likelihood.noise_model.psf_error_b_max"]),
    "likelihood.noise_model.psf_error_exponent": dict(
        html="<p>Flux exponent p of the PSF-error term. 1 (default): σ<sup>2</sup><sub>eff</sub> = σ² + b²·PS². "
             "p &lt; 1: σ² + b²·PS<sub>peak</sub>²·(PS/PS<sub>peak</sub>)<sup>2p</sup>, which flattens the flux "
             "scaling so the PSF wings get relatively more weight reduction while the term stays confined to the "
             "point images. Nautilus supports only p = 1.</p>",
        related=["likelihood.noise_model.psf_error_b_mode", "likelihood.noise_model.psf_error_b_max"]),
    "likelihood.use_kinematics": dict(
        html="<p>Add a stellar-kinematics likelihood (off by default; nothing else changes while it is off), "
             "configured in <code>likelihood.kinematics</code>: one aperture velocity dispersion "
             "(<code>mode: \"aperture\"</code>, spherical Jeans) or binned IFU V<sub>rms</sub> (<code>mode: "
             "\"resolved\"</code>, spherical Jeans or axisymmetric JAM). Requires "
             "<code>kinematics.ds_over_dds</code> and Sérsic lens-light components, which are the kinematic "
             "tracer. The internal mass-sheet parameter λ<sub>int</sub> is sampled by default and is always "
             "blinded when blinding is on.</p>",
        related=["likelihood.kinematics.mode", "likelihood.kinematics.ds_over_dds", "likelihood.kappa_ext_prior.mean",
                 "multiband.kinematics.tracer_band"]),
    "likelihood.kinematics.observed_sigma": dict(
        html="<p>Aperture mode: the measured luminosity-weighted line-of-sight velocity dispersion (km/s). The "
             "default is only a placeholder; always set your own value.</p>"),
    "likelihood.kinematics.sigma_error": dict(
        html="<p>Aperture mode: 1σ error of <code>observed_sigma</code> (km/s), multiplied by "
             "<code>covariance_scale</code>.</p>"),
    "likelihood.kinematics.aperture_kind": dict(
        html="<p>Aperture shape: <code>\"square\"</code> (default, side <code>aperture_width</code>), "
             "<code>\"rectangle\"</code> (<code>aperture_width</code> × <code>aperture_height</code>) or "
             "<code>\"circle\"</code> (radius <code>aperture_radius</code>); all centred on the lens.</p>"),
    "likelihood.kinematics.aperture_width": dict(
        html="<p>Full width of a square or rectangular aperture (arcsec, default 0.55).</p>"),
    "likelihood.kinematics.aperture_height": dict(
        html="<p>Full height of a rectangular aperture (arcsec).</p>"),
    "likelihood.kinematics.aperture_radius": dict(
        html="<p>Radius of a circular aperture (arcsec, default 0.275).</p>"),
    "likelihood.kinematics.psf_sigma": dict(
        html="<p>Seeing of the spectroscopy as a mixture of circular Gaussians: their σ in arcsec (default "
             "[0.05]).</p>"),
    "likelihood.kinematics.psf_weight": dict(
        html="<p>Weights of the Gaussians in <code>psf_sigma</code> (normalised; default [1.0]).</p>"),
    "likelihood.kinematics.distance_mpc": dict(
        html="<p>Distance normalisation of the dynamical model (Mpc). At fixed <code>ds_over_dds</code> it "
             "cancels for lensing-normalised power laws: it is NOT an external distance or H<sub>0</sub> "
             "prior.</p>"),
    "likelihood.kinematics.ds_over_dds": dict(
        html="<p>The distance ratio D<sub>s</sub>/D<sub>ds</sub> of the lens. No default: it must be set when "
             "<code>use_kinematics</code> is on (validation stops otherwise). Compute it for your redshifts at a "
             "fiducial cosmology.</p>"),
    "likelihood.kinematics.anisotropy_ratio_range": dict(
        html="<p>Uniform prior range of σ<sub>t</sub>/σ<sub>r</sub> for constant anisotropy, β = 1 − "
             "ratio² (default [0.93, 1.06]). For <code>anisotropy_model: \"gom\"</code> it sets the inner "
             "β<sub>0</sub>.</p>"),
    "likelihood.kinematics.anisotropy_ratio_fixed": dict(
        html="<p>Fix σ<sub>t</sub>/σ<sub>r</sub> at this value instead of sampling it (<code>null</code> = "
             "sampled).</p>"),
    "likelihood.kinematics.kappa_ext": dict(
        html="<p>Fixed external convergence for the kinematics (the older knob). Prefer "
             "<code>likelihood.kappa_ext_prior</code>; set one of the two, not both.</p>"),
    "likelihood.kinematics.sample_lambda_int": dict(
        html="<p>Sample the internal mass-sheet parameter λ<sub>int</sub> uniformly on "
             "<code>lambda_int_range</code> (default <code>true</code>). This is the large-core internal "
             "mass-sheet approximation: σ² scales with λ<sub>int</sub>(1 − κ<sub>ext</sub>), while D<sub>Δt</sub> "
             "stays the lens-model distance. λ<sub>int</sub> is blinded whenever blinding is on.</p>"),
    "likelihood.kinematics.lambda_int_range": dict(
        html="<p>Uniform prior range of λ<sub>int</sub> (default [0.5, 1.5]).</p>"),
    "likelihood.kinematics.lambda_int": dict(
        html="<p>Fixed λ<sub>int</sub> when <code>sample_lambda_int</code> is false (1 = no internal mass "
             "sheet).</p>"),
    "likelihood.kinematics.light_radius_convention": dict(
        html="<p>How the Sérsic R<sub>e</sub> of the lens light is read for the spherical tracer: "
             "<code>\"major_axis\"</code> (default; converted to the circularised radius √q·R<sub>e</sub>) or "
             "<code>\"circularized\"</code> (used as is).</p>"),
    "likelihood.kinematics.ifu_file": dict(
        html="<p>Resolved mode: the binned V<sub>rms</sub> data as HDF5 (TDCOSMO / NIRSpec layout, read by "
             "<code>alpaca.kinematics.ifu</code>). The aperture keys are unused in this mode.</p>"),
    "likelihood.kinematics.center_offset_sigma": dict(
        html="<p>Resolved mode: prior width (arcsec) of the IFU centre offset <code>kin_center_dx/dy</code> "
             "(east / north) about the IFU origin.</p>"),
    "likelihood.kinematics.center_offset_max": dict(
        html="<p>Resolved mode: truncation (arcsec) of the IFU centre offset.</p>"),
    "likelihood.kinematics.exclude_bins": dict(
        html="<p>Resolved mode: IFU bin indices dropped from the data, the covariance and the bin kernels.</p>"),
    "likelihood.kinematics.importance_error_scales": dict(
        html="<p>Importance mode: <code>[lo, hi, n]</code>, a log-uniform grid for a free error scale s "
             "(likelihood N(y | f, s²C)) marginalised in the importance update; empty = off. Joint sampling "
             "uses the fixed <code>covariance_scale</code> only.</p>"),
    "likelihood.kinematics.a_ani_range": dict(
        html="<p>Osipkov–Merritt (<code>\"om\"</code> / <code>\"gom\"</code>) anisotropy: uniform prior range of "
             "a<sub>ani</sub>, with anisotropy radius r<sub>a</sub> = a<sub>ani</sub> θ<sub>E</sub>.</p>"),
    "likelihood.kinematics.beta_inf_range": dict(
        html="<p>Generalised Osipkov–Merritt (<code>\"gom\"</code>): uniform prior range of the outer anisotropy "
             "β<sub>∞</sub>.</p>"),
    "likelihood.kinematics.inner_break_radius": dict(
        html="<p>With <code>inner_dgamma_range</code>: the break radius of the free inner slope, in units of "
             "θ<sub>E</sub> (default 0.5).</p>"),
    "likelihood.kinematics.radial_intervals": dict(
        html="<p>Aperture solver: number of radial quadrature intervals (default 256). Numerical; keep the "
             "default.</p>"),
    "likelihood.kinematics.radial_max": dict(
        html="<p>Aperture solver: outer radius of the radial integrals (arcsec, default 1000). Numerical.</p>"),
    "likelihood.kinematics.angular_nodes": dict(
        html="<p>Aperture solver: angular quadrature nodes (default 128). Numerical.</p>"),
    "likelihood.kinematics.abel_nodes": dict(
        html="<p>Aperture solver: Sérsic deprojection nodes (default 64). Numerical.</p>"),
    "likelihood.kinematics.resolved_radial_nodes": dict(
        html="<p>Resolved spherical solver: radial nodes (default 96). Numerical.</p>"),
    "likelihood.kinematics.resolved_los_nodes": dict(
        html="<p>Resolved spherical solver: line-of-sight nodes (default 128). Numerical.</p>"),
    "likelihood.kinematics.axi_polar_radial": dict(
        html="<p>Axisymmetric solver: radial nodes of the galaxy-frame sky grid on which "
             "⟨v<sub>los</sub>²⟩ is projected (default 48). Numerical.</p>"),
    "likelihood.kinematics.axi_polar_angular": dict(
        html="<p>Axisymmetric solver: angular nodes of that sky grid (default 11). Numerical.</p>"),
    "likelihood.kinematics.axi_derivative": dict(
        html="<p>Axisymmetric solver: d⟨v<sub>r</sub>²⟩/d ln r along the characteristics, "
             "<code>\"analytic\"</code> (default) or <code>\"jvp\"</code> (for testing).</p>"),
    "likelihood.kinematics.covariance_scale": dict(
        html="<p>Fixed rescaling s of the kinematic errors, C → s²C (aperture mode: <code>sigma_error</code> → "
             "s·<code>sigma_error</code>). Default 1.</p>"),
    "likelihood.kinematics.importance_ratio_nodes": dict(
        html="<p>Importance mode: grid nodes over σ<sub>t</sub>/σ<sub>r</sub> (default 16).</p>"),
    "likelihood.kinematics.importance_lambda_nodes": dict(
        html="<p>Importance mode: grid nodes over λ<sub>int</sub> (default 128).</p>"),
    "likelihood.kinematics.importance_offset_nodes": dict(
        html="<p>Importance mode: grid nodes per axis over the IFU centre offset (default 7).</p>"),
    "likelihood.kinematics.importance_inclination_nodes": dict(
        html="<p>Importance mode, axisymmetric dynamics: grid nodes over the inclination (default 8).</p>"),
    "likelihood.kinematics.importance_a_ani_nodes": dict(
        html="<p>Importance mode, OM / gOM anisotropy: grid nodes over a<sub>ani</sub> (default 24).</p>"),
    "likelihood.kinematics.importance_beta_inf_nodes": dict(
        html="<p>Importance mode, gOM anisotropy: grid nodes over β<sub>∞</sub> (default 8).</p>"),
    "likelihood.kinematics.importance_inner_nodes": dict(
        html="<p>Importance mode, free inner slope: grid nodes over Δγ<sub>in</sub> (default 9).</p>"),

    # ------------------------------------------------------------------ run / sampling
    "run.resume_from_previous": dict(
        warnings=["The loaded best fit must come from a compatible model. The staged flow fingerprints the "
                  "configuration and ALPACA's code, and recomputes (archiving the old folder as "
                  "stage…stale-<time>) every stage whose objective changed, e.g. after new time delays."]),
    "sampling.nifty.warmstart.polish": dict(
        html="<p>After the exact transfer of the GD optimum into the sampler's latent space: "
             "<code>\"lbfgs\"</code> (default) polishes the posterior energy U = −log L + ½|ξ|² with L-BFGS until "
             "|∇U| &lt; <code>gtol</code> or <code>maxiter</code> iterations, and keeps the result only if U "
             "decreased and stayed finite; <code>\"off\"</code> uses the bare transfer.</p>",
        related=["sampling.nifty.warmstart.gtol", "sampling.nifty.warmstart.maxiter",
                 "sampling.nifty.warmstart.stop_after"]),
    "sampling.nifty.warmstart.stop_after": dict(
        html="<p><code>true</code>: end the run right after the NIFTy warm start: exact transfer, polish, the "
             "energy U and the warm-start figures and <code>04_sampling/warmstart/warmstart_summary.json</code> "
             "(with <code>\"stopped_after_warmstart\": true</code>) are written; no geoVI, no NUTS, no posterior. "
             "Use it to compare model variants by U on the same data, mask and noise model. Default "
             "<code>false</code>.</p>",
        warnings=["sampling.nifty.warmstart rejects unknown keys, so a typo here stops the run instead of "
                  "silently sampling for hours."],
        related=["sampling.nifty.warmstart.polish", "run.sampling"]),

    "stages.gd.optimizer.retry.max_iterations": dict(
        html="<p>Number of GD passes (≥ 1; 1 = a single pass, no retry; 0 is refused). With more than one, the "
             "multistart is repeated while χ²<sub>red</sub> exceeds <code>retry.chi2_red_threshold</code>. A "
             "shapelet stage 1 of a quasar lens often ends above 2 even in the right solution, so do not rely on "
             "the retry: check the stage-1 and final χ² yourself.</p>",
        related=["stages.gd.optimizer.retry.chi2_red_threshold"]),

    "run.output_dir": dict(
        html="<p>Directory for all outputs of this run (inputs as figures, multistart, sampling, posterior, "
             "timing). The token <code>{date}</code> is replaced by a <code>YYYY-MM-DD_HH-MM</code> timestamp. "
             "With <code>run_alpaca.py</code> an omitted key gives <code>./results/run_{date}/</code>; "
             "<code>--output DIR</code> overrides the config. Use one directory per model variant: re-running a "
             "config into an existing directory resumes it.</p>",
        warnings=["Resume keys off the stage folders inside output_dir: reuse the same directory (no {date} "
                  "token) when a rerun should skip finished stages, and never reuse one directory for another "
                  "variant."]),
    "stages.gd.optimizer.starts": dict(
        html="<p>Size of the initial pool of random starts. It is the same number as "
             "<code>halving.keep[0]</code>: set one or the other (two different values are refused). "
             "<code>null</code> (default) takes <code>halving.keep[0]</code>; without a halving ladder, 32 with "
             "annealing and 50 for a flat multistart. A <code>starts</code> without a ladder derives one by "
             "halving at every anneal level.</p>",
        related=["stages.gd.optimizer.halving.keep", "stages.gd.optimizer.anneal.levels"]),
    "blinding.key": dict(
        html="<p>The secret that encrypts the blinding offsets. Order of lookup: this key, then the environment "
             "variable named by <code>key_env_var</code> (<code>ALPACA_BLINDING_KEY</code>), then a "
             "<code>blinding_secret.key</code> already in <code>05_posterior/samples/</code>; otherwise a new key "
             "is generated at the start of the run and written there (unless <code>write_key_file</code> is "
             "false). The same key seals the posterior and the blinded entries of the GD sidecars "
             "(<code>best_fit_params_full.npz</code>).</p>",
        warnings=["Do not put the key in the config: the config is copied into every run folder. Use the "
                  "environment variable, set inside the job script."],
        related=["blinding.key_env_var", "blinding.write_key_file", "blinding.encrypt"]),
    "blinding.write_key_file": dict(
        html="<p>When a key is generated (none given in <code>key</code> or the environment), write it to "
             "<code>05_posterior/samples/blinding_secret.key</code> at the start of the run, so the sealed GD "
             "sidecars can be read on resume and the posterior is sealed with the same key. A key you supply is "
             "never written to disk.</p>",
        warnings=["blinding_secret.key IS the secret: move it out of the run folder (to whoever decides on "
                  "unblinding), or anyone with access to the folder can unblind."]),
    "sampling.sampler": dict(
        html="<p>Posterior sampler:</p><ul>"
             "<li><code>\"nifty\"</code> (default): NIFTy inference in the whitened latent space ξ, NUTS and/or "
             "geoVI (<code>sampling.nifty.mode</code>). Required for correlated-field sources; also the backend "
             "for PSF marginalisation, and the one used by multiband joint sampling;</li>"
             "<li><code>\"nuts\"</code>: NumPyro NUTS on the physical parameters, for shapelet / Sérsic sources "
             "of moderate dimension;</li>"
             "<li><code>\"nautilus\"</code>: nested sampling with its own legacy likelihood and MAP-centred "
             "empirical priors (restrictions below);</li>"
             "<li><code>\"default\"</code>: NIFTy for correlated fields, Nautilus for ≤ 50 parameters, NUTS "
             "otherwise.</li></ul>",
        warnings=["\"nautilus\" refuses configurations it cannot reproduce: image-plane astrometry (the "
                  "default), td_common_source true with delays, psf_error_exponent ≠ 1, kinematics, perturbers "
                  "and a sky background. Its log-evidence uses MAP-centred priors and is not comparable with "
                  "other engines."],
        related=["sampling.nifty.mode", "sampling.nifty.nuts.target_accept"]),
    "mass.main.theta_E_prior": dict(
        html="<p>Optional prior on the main-lens Einstein radius, <code>{\"center\": θ, \"sigma\": σ}</code> in "
             "arcsec: a TruncatedNormal within the physical bounds. <code>null</code> keeps the wide uniform prior "
             "set by the detected image positions (quasars). Only <code>center</code> and <code>sigma</code> are "
             "accepted.</p>",
        warnings=["Galaxy–galaxy lenses: always set it (e.g. the ring radius, σ ≈ 0.1–0.2″). Without point "
                  "images ALPACA takes the θE scale, the arc annulus and the R_eff bounds from "
                  "theta_E_prior.center and warns when it is missing; without it θE can run to about twice the "
                  "true value."],
        related=["mass.main.center_sigma", "light.point_sources.enabled"]),
    "stages.cf_joint.source.loglogavgslope": dict(
        html="<p>(mean, std) prior of the average slope of the source field's amplitude spectrum: the smoothness "
             "dial (the power-spectrum slope is twice it). More negative = smoother: about −3 for typical hosts, "
             "down to −5 or −6 for very smooth sources. The std sets how far the fit may move it.</p>",
        warnings=["Free hyperparameters run to rough fields in a joint MAP fit (the railing report "
                  "cf_hyperparameters.json flags |z| > 3). Choose the smoothness by cross-validation "
                  "(python -m alpaca.diagnostics.cf_cv) and fix it with a tiny std, e.g. [-2.5, 0.001]."],
        related=["stages.cf_joint.source.fluctuations", "stages.cf_joint.source.offset_std",
                 "stages.cf_joint.source.mean_intensity"]),
    "stages.cf_joint.source.fluctuations": dict(
        html="<p>(mean, std) prior of the fluctuation amplitude of the source field around its mean: how much "
             "power goes into structure. Raise it for clumpy, high-contrast sources; lower it if the field starts "
             "absorbing noise or lens-light residuals. Fix it together with the slope by cross-validation.</p>",
        related=["stages.cf_joint.source.loglogavgslope"]),
    # ------------------------------------------------------------------ multiband
    "multiband.reference_band": dict(
        html="<p>The band whose priors are used for shared parameters, which carries the time delays, and "
             "whose frame defines the positions (default: the first band listed). Its <code>pix_scale</code> and "
             "<code>cutout_size</code> may come from the template's <code>data</code> block.</p>",
        related=["multiband.bands", "multiband.frame_offsets.enabled"]),
    "multiband.bands": dict(
        html="<p>One entry per band, keyed by its name (e.g. <code>\"F150W\"</code>). Short form: "
             "<code>{\"data_dir\": \"data/F150W\"}</code>; full form: the file keys below. Each band runs the "
             "ordinary single-band pipeline in <code>&lt;run.output_dir&gt;/bands/&lt;band&gt;/</code>, with the "
             "rest of the config as its template.</p><pre><code>\"multiband\": {\n  \"reference_band\": \"F150W\",\n"
             "  \"bands\": {\"F150W\": {\"data_dir\": \"data/F150W\"},\n"
             "            \"F356W\": {\"data_dir\": \"data/F356W\",\n"
             "                      \"overrides\": {\"stages.cf_joint.source.num_pixels\": 64}}},\n"
             "  \"image_positions\": {\"A\": [-0.906, -0.937], \"B\": [-0.999, 0.656],\n"
             "                      \"C\": [0.406, 1.249], \"D\": [0.906, -0.531]}\n}</code></pre>"
             "<p>Unknown keys in a band are refused; everything that is not a data key goes into "
             "<code>overrides</code>.</p>",
        related=["multiband.bands.BAND.data_dir", "multiband.bands.BAND.overrides", "multiband.reference_band"]),
    "multiband.bands.BAND.data_dir": dict(
        html="<p>A folder with the standard file names: <code>image.fits</code>, <code>noise_map.fits</code>, "
             "<code>psf_supersampled.fits</code>, <code>psf_starred_seed.npz</code>, <code>psf_error_map.fits</code>, "
             "<code>mask_likelihood.fits</code>, <code>mask_lens_only.fits</code>. Files you name explicitly win. "
             "<code>pix_scale</code> then comes from the image header (<code>PIXSCALE</code> or the WCS) and "
             "<code>cutout_size</code> covers the reference band's field (odd). <code>--check</code> lists what "
             "was filled in and from where. Paths are relative to the config file.</p>"),
    "multiband.bands.BAND.image": dict(
        html="<p>The band's image (required unless found by <code>data_dir</code>).</p>"),
    "multiband.bands.BAND.noise_map": dict(
        html="<p>The band's noise map (required unless found by <code>data_dir</code>).</p>"),
    "multiband.bands.BAND.psf": dict(
        html="<p>The band's PSF kernel (required unless found by <code>data_dir</code>).</p>"),
    "multiband.bands.BAND.psf_seed": dict(html="<p>The band's STARRED seed (sets <code>psf.joint.seed_path</code>).</p>"),
    "multiband.bands.BAND.psf_error_map": dict(
        html="<p>The band's PSF error map (sets <code>psf.input.error_map_path</code>).</p>"),
    "multiband.bands.BAND.likelihood_mask": dict(
        html="<p>The band's likelihood mask (sets <code>data.likelihood_mask_path</code>).</p>"),
    "multiband.bands.BAND.lens_light_mask": dict(
        html="<p>The band's lens-only mask for the refit (sets <code>light.lens.refit.mask_path</code>).</p>"),
    "multiband.bands.BAND.pix_scale": dict(
        html="<p>Pixel scale (arcsec/px); default from the image header, or from the template for the reference "
             "band.</p>"),
    "multiband.bands.BAND.cutout_size": dict(
        html="<p>Model cutout in pixels; default from the template for the reference band, otherwise the same "
             "field as the reference band at this pixel scale (odd).</p>"),
    "multiband.bands.BAND.overrides": dict(
        html="<p>Config changes for this band only, as dotted keys (<code>\"stages.cf_joint.source.num_pixels\": "
             "64</code>) or nested dicts, applied after the data keys. Typical: a coarser source grid or another "
             "lens-light profile in a long-wavelength band.</p>"),
    "multiband.image_positions": dict(
        html="<p>Approximate image positions <code>{label: [x, y]}</code> (arcsec, relative to the lens), with the "
             "same labels in every band, so that shared positions and the delays line up. Required with more than "
             "one band when point sources are on; galaxy–galaxy lenses need none.</p>"),
    "multiband.reference_image": dict(
        html="<p>Reference image of the time delays (default: the first label of "
             "<code>image_positions</code>).</p>"),
    "multiband.lens_position": dict(
        html="<p>Approximate lens centre (arcsec from the frame centre), as <code>LENS_POSITION</code> in "
             "<code>run_alpaca.py</code>.</p>"),
    "multiband.sharing.preset": dict(
        html="<p>Which parameter groups are common to all bands (<code>\"shared\"</code>: one value, sampled once "
             "with the reference band's prior) and which are free per band (<code>\"per_band\"</code>, named "
             "<code>&lt;band&gt;/&lt;parameter&gt;</code>):</p><ul>"
             "<li><code>\"lensing\"</code> (default): mass, perturber mass, D<sub>Δt</sub>, image positions and "
             "kinematic nuisances shared; every photometric group per band;</li>"
             "<li><code>\"achromatic_lens_light\"</code>: lensing + one lens-light geometry for all bands "
             "(amplitudes per band);</li>"
             "<li><code>\"independent\"</code>: nothing shared, one separate lens per band, as a consistency "
             "check.</li></ul>",
        related=["multiband.sharing.GROUP", "multiband.frame_offsets.enabled"]),
    "multiband.sharing.GROUP": dict(
        html="<p>Override one group after the preset, e.g. <code>\"sharing\": {\"preset\": \"lensing\", "
             "\"lens_light_shape\": \"shared\"}</code>. Groups: <code>mass</code>, <code>perturber_mass</code>, "
             "<code>cosmology</code>, <code>kinematics</code>, <code>image_positions</code>, "
             "<code>ps_amplitudes</code>, <code>lens_light_shape</code>, <code>lens_light_amplitude</code>, "
             "<code>sky</code>, <code>source</code>, <code>perturber_light</code>, <code>noise_model</code>, "
             "<code>psf</code>; each <code>\"shared\"</code> or <code>\"per_band\"</code>. Parameters that match no "
             "group stay per band and are listed in the log. The source is always per band in this version.</p>"),
    "multiband.frame_offsets.enabled": dict(
        html="<p>A free registration offset (dx, dy) for every band except the reference (default "
             "<code>true</code>). Every shared position (mass centre, image positions, shared light centres) is "
             "read in band b as value + (dx<sub>b</sub>, dy<sub>b</sub>). All bands must already share one sky "
             "frame (same orientation and centre): resample rotated mosaics first.</p>"),
    "multiband.frame_offsets.sigma_arcsec": dict(
        html="<p>Width of the Normal prior of each offset (arcsec, default 0.05); the offsets start from the "
             "mean image-position offset.</p>"),
    "multiband.kinematics.tracer_band": dict(
        html="<p>With <code>likelihood.use_kinematics</code>: the band whose lens light is the kinematic tracer "
             "(default: the reference band). Only that band keeps kinematics on; the kinematic nuisances are "
             "shared and the kinematic likelihood is counted once. Choose the band that covers the wavelengths "
             "of the spectrum; the choice is a systematic worth testing. <code>importance_sample</code> is not "
             "supported in multiband.</p>"),
    "multiband.joint.name": dict(
        html="<p>Output sub-folder of the joint fit (default <code>joint</code>). Several sharing variants can "
             "reuse the same band fits, each under its own name; <code>--compare</code> puts them side by "
             "side.</p>"),
    "multiband.joint.polish.maxiter": dict(
        html="<p>L-BFGS iterations of the joint MAP polish of U = −log L + ½|ξ|² (default 3000; 0 skips the "
             "polish, e.g. to sample a saved joint MAP).</p>"),
    "multiband.joint.polish.gtol": dict(html="<p>Stop the polish when |∇U| falls below this (default 1).</p>"),
    "multiband.joint.init_from": dict(
        html="<p>Continue from a saved <code>joint_map_latent.npz</code> (e.g. to sample a finished joint MAP); "
             "<code>null</code> = start from the band fits.</p>"),
    "multiband.joint.sampling": dict(
        html="<p>Sample the joint posterior with NIFTy-NUTS after the polish (default <code>false</code>). Blinded "
             "samples go to <code>&lt;joint.name&gt;/posterior/</code>; per-band copies of blinded parameters are "
             "blinded too. NIFTy latent space only, no geoVI.</p>"),
    "multiband.joint.nuts.n_warmup": dict(html="<p>Joint NUTS warm-up steps per chain (default 300).</p>"),
    "multiband.joint.nuts.n_samples": dict(html="<p>Joint NUTS samples per chain (default 500).</p>"),
    "multiband.joint.nuts.n_chains": dict(html="<p>Joint NUTS chains (default 2).</p>"),
    "multiband.joint.nuts.max_tree_depth": dict(html="<p>Joint NUTS maximum tree depth (default 11).</p>"),
    "multiband.joint.nuts.target_accept": dict(html="<p>Joint NUTS target acceptance (default 0.95).</p>"),
    "multiband.joint.nuts.mass_matrix": dict(html="<p>Joint NUTS mass matrix (default <code>\"adaptive_diag\"</code>).</p>"),
}

# keys every user sets or checks (shown under "essential")
ESSENTIAL_NEW = {
    "likelihood.time_delays.delays", "likelihood.time_delays.convention", "likelihood.astrometry_mode",
}
# prefixes shown under "common" (in addition to extract_knobs.COMMON_PREFIXES)
COMMON_NEW = (
    "likelihood.time_delays", "likelihood.sigma_ast", "likelihood.D_dt_prior", "likelihood.kappa_ext_prior",
    "likelihood.use_kinematics", "likelihood.kinematics.mode", "likelihood.kinematics.ds_over_dds",
    "likelihood.kinematics.observed_sigma", "likelihood.kinematics.sigma_error", "likelihood.kinematics.ifu_file",
    "likelihood.kinematics.dynamics", "stages.cf_joint.convergence", "stages.cf_joint.lens_light",
    "stages.cf_joint.source.mean_intensity", "stages.cf_joint.perturber_fields.pertN.num_pixels",
    "stages.cf_joint.perturber_fields.pertN.loglogavgslope", "stages.cf_joint.perturber_fields.pertN.fluctuations",
    "stages.cf_joint.perturber_fields.pertN.grid.mode", "mass.main.center_sigma", "mass.main.flexion.enabled",
    "data.n_ps_detect", "light.point_sources.position_bound_px", "light.sky_background_fixed_amp",
    "light.lens.refit.mask_arc", "light.lens.refit.init_cf_joint", "sampling.nifty.warmstart.stop_after",
    "multiband.reference_band", "multiband.bands", "multiband.image_positions", "multiband.sharing",
    "multiband.frame_offsets.enabled", "multiband.kinematics", "multiband.joint.name", "multiband.joint.sampling",
)
