// A loaded ALPACA run: feature detection + lazy, cached access to every product.
import { findCatalog } from "./files.js";
import { decryptOffsets, isEncryptedBlob, unblindValue } from "./blinding.js";
import { summarize } from "./stats.js";
import { H0FromDdt } from "../physics/cosmology.js";
import { keyStore, catalogStore } from "./prefs.js";
import { perturberPositions, detectLensCenter } from "../physics/catalog.js";

const STAGE_LABELS = { shapelets: "Shapelets multistart", lens_light_refit: "Lens-light refit", cf_joint: "Joint CF + PSF", cf_warmstart: "CF warm-start" };

function parseParamSummary(txt) {
  const rows = [];
  for (const line of txt.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 6) continue;
    const [name, median, up, lo, mean, std] = parts;
    if (/^source_pixels_\d+$/.test(name)) continue; // pixel columns are handled by the source applets
    rows.push({ name, median: +median, up: +up, lo: +lo, mean: +mean, std: +std });
  }
  return rows;
}

function parseBoundaryFlags(txt) {
  const rows = [];
  for (const line of txt.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) continue;
    rows.push({ status: parts[0], name: parts[1], boundary: parts[2], distBulk: parts[3], distTail: parts[4], pileLo: parts[5], pileHi: parts[6], why: parts.slice(7).join(" ") });
  }
  return rows;
}

function parsePriorSummary(txt) {
  const rows = [];
  for (const line of txt.split("\n")) {
    const m = /^(\S+)\s+(\S+)\s+(.*)$/.exec(line.trim());
    if (!m || m[1] === "Parameter" || m[1].startsWith("-")) continue;
    const info = m[3];
    let lo = null, hi = null;
    const r = /\[(-?[\d.eE+-]+),\s*(-?[\d.eE+-]+)\]/.exec(info);
    if (r) { lo = +r[1]; hi = +r[2]; }
    const mean = /mean=(-?[\d.eE+-]+)/.exec(info);
    const std = /std=(-?[\d.eE+-]+)/.exec(info);
    rows.push({ name: m[1], type: m[2], info, lo, hi, mean: mean ? +mean[1] : null, std: std ? +std[1] : null });
  }
  return rows;
}

export function paramGroup(name) {
  if (/^lens_(theta_E|gamma$|e1|e2|center)/.test(name) || name === "lens_gamma") return "Lens mass";
  if (/^lens_gamma[12]$/.test(name)) return "External shear";
  if (/^lens_/.test(name)) return "Lens mass";
  if (/^(log_)?light_.*_L\d?$/.test(name) || /^log_mge/.test(name)) return "Lens light";
  if (/_S$/.test(name) || /^source_|^shapelets/.test(name)) return "Source light";
  if (/^(x_image|y_image|log_ps_amp|ps_amp)/.test(name)) return "Point sources";
  if (/^offset_[xy]_image/.test(name)) return "Astrometric offsets";
  if (/^pert\d+_/.test(name)) return "Perturbers";
  if (/^psf_/.test(name)) return "PSF";
  if (/^(D_dt|H0|D_d|log_sigma_rayshoot)/.test(name)) return "Cosmography";
  if (/^sky/.test(name)) return "Sky";
  return "Other";
}

export const GROUP_ORDER = ["Cosmography", "Lens mass", "External shear", "Perturbers", "Lens light", "Source light", "Point sources", "Astrometric offsets", "PSF", "Sky", "Other"];

export class Run {
  constructor(index, root, worker, label = "A") {
    this.index = index;
    this.root = root || "";
    this.worker = worker;
    this.label = label;
    this.id = "run_" + Math.random().toString(36).slice(2, 9);
    this._cache = new Map();
    this.offsets = null; // in-memory unblinding offsets (never persisted)
    this.name = index.rootName + (this.root ? "/" + this.root.replace(/\/$/, "") : "");
  }

  p(rel) { return this.root + rel; }
  has(rel) { return this.index.has(this.p(rel)); }
  list(prefix, opts) { return this.index.list(this.p(prefix), opts).map((x) => x.slice(this.root.length)); }
  async json(rel, fallback = null) { try { return this.has(rel) ? await this.index.json(this.p(rel)) : fallback; } catch (e) { console.warn("json", rel, e); return fallback; } }
  async text(rel, fallback = null) { return this.has(rel) ? await this.index.text(this.p(rel)) : fallback; }
  async url(rel) { return this.index.url(this.p(rel)); }

  cached(key, fn) {
    if (!this._cache.has(key)) this._cache.set(key, fn().catch((e) => { this._cache.delete(key); throw e; }));
    return this._cache.get(key);
  }

  // ------------------------------------------------------------ init / feature detection
  async init() {
    const first = async (...cands) => { for (const c of cands) { const v = await this.json(c); if (v) return v; } return null; };
    const [config, timing, bic, rayTracing, blinding, postSummary] = await Promise.all([
      first("config/config.json", "config.json"),
      first("timing.json", "config/timing.json"),
      this.json("05_posterior/samples/bic.json"),
      this.json("05_posterior/samples/ray_tracing_summary.json"),
      this.json("05_posterior/samples/blinding_manifest.json"),
      this.json("05_posterior/samples/posterior_summary.json"),
    ]);
    this.config = config || {};
    this.timing = timing;
    this.bic = bic;
    this.rayTracing = rayTracing;
    this.blinding = blinding;
    this.posteriorSummary = postSummary ? { engine: postSummary.engine, nSamples: postSummary.n_samples, nParams: postSummary.n_params } : null;

    // stages
    const stageDirs = new Set();
    for (const p of this.list("03_multistart/")) {
      const m = /^03_multistart\/(stage\d+_[^/]+)\//.exec(p);
      if (m) stageDirs.add(m[1]);
    }
    this.stages = [];
    for (const d of [...stageDirs].sort()) {
      const summary = await this.json(`03_multistart/${d}/stage_summary.json`, {});
      const key = d.replace(/^stage\d+_/, "");
      this.stages.push({ dir: d, key, label: STAGE_LABELS[key] || key, summary: summary || {}, hasParams: this.has(`03_multistart/${d}/best_fit_params.json`) || this.has(`03_multistart/${d}/physical_params.json`) || this.has(`03_multistart/${d}/best_fit_params_full.npz`) });
    }
    this.finalStageKey = this.stages.length ? this.stages[this.stages.length - 1].key : null;

    // text summaries
    const [ps, bf, pr] = await Promise.all([
      this.text("05_posterior/samples/parameter_summary.txt"),
      this.text("05_posterior/samples/boundary_flags.txt"),
      this.text("01_input/priors/prior_summary.txt"),
    ]);
    this.paramSummary = ps ? parseParamSummary(ps) : [];
    this.boundaryFlags = bf ? parseBoundaryFlags(bf) : [];
    this.priorSummary = pr ? parsePriorSummary(pr) : [];

    // sampler diagnostics
    this.diagnostics = null;
    for (const p of this.list("04_sampling/")) {
      if (/_diagnostics\.json$/.test(p)) { this.diagnostics = { path: p, ...(await this.json(p, {})) }; break; }
    }

    // gallery
    this.pngs = this.list("").filter((p) => /\.png$/i.test(p));
    this.pdfs = this.list("").filter((p) => /\.pdf$/i.test(p));

    // perturber catalog (outside the run folder in general); remembered catalogs fill in when missing
    this.catalogPath = findCatalog(this.index, this.config?.mass?.perturbers?.path || null);
    this.catalog = this.catalogPath ? await this.index.json(this.catalogPath).catch(() => null) : null;
    this.catalogRestored = false;
    if (this.catalog) catalogStore.remember(this.catalog, this.name);
    else {
      const pertIds = [...new Set(this.paramSummary.map((r) => (/^pert(\d+)_/.exec(r.name) || [])[1]).filter(Boolean).map(Number))];
      if (pertIds.length) {
        const c = catalogStore.find(pertIds);
        if (c) { this.catalog = c.json; this.catalogPath = `remembered (${c.label || c.savedAt.slice(0, 10)})`; this.catalogRestored = true; }
      }
    }

    // point sources / lens-light structure from the final best fit
    this.features = {
      posterior: this.has("05_posterior/samples/posterior_samples.npz"),
      priors: this.has("01_input/priors/prior_samples.npz"),
      map: this.has("03_multistart/best_fit_params.json") || this.has("03_multistart/best_fit_params_full.npz"),
      modelImage: this.has("03_multistart/model_image.fits"),
      image: this.has("01_input/fits/image.fits"),
      blinded: !!(blinding && blinding.blinded),
      keyFile: this.has("05_posterior/samples/blinding_secret.key"),
      sealed: this.has("05_posterior/samples/blinding_key.json"),
      catalog: !!this.catalog,
      lossCurve: this.stages.some((s) => this.has(`03_multistart/${s.dir}/loss_curve.npy`)),
      refit: this.has("03_multistart/stage2_lens_light_refit/refit.json"),
      nutsDiag: !!this.diagnostics,
    };
    this.pixScale = this.config?.data?.pix_scale ?? null;
    // Blinding key found next to the samples: load it silently. It is used only
    // to evaluate the forward model and derived widths; no blinded value is shown.
    this.keySource = null;
    if (this.features.blinded && this.features.keyFile) {
      try { await this.unblind(await this.keyFileContents()); this.keySource = "run folder (blinding_secret.key)"; }
      catch (e) { console.warn("blinding key file could not be used", e); }
    }
    // campaign key remembered in this browser (session or device)
    if (this.features.blinded && !this.offsets && this.features.sealed) {
      const k = keyStore.get();
      if (k) { try { await this.unblind(k); this.keySource = keyStore.rememberedOnDevice() ? "campaign key (this device)" : "campaign key (this session)"; } catch (e) { /* not this campaign's key */ } }
    }
    return this;
  }

  get sampler() { return this.posteriorSummary?.engine || this.config?.sampling?.sampler || "?"; }
  get sourceType() { return this.config?.stages?.cf_joint?.source?.type || this.config?.model?.source_type || (this.stages.length ? this.stages[this.stages.length - 1].key : "?"); }

  // ------------------------------------------------------------ arrays
  async fits(rel) {
    return this.cached("fits:" + rel, async () => {
      const u8 = await this.index.bytes(this.p(rel));
      const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      const r = await this.worker.call("fits", { buffer: buf }, [buf]);
      return { rows: r.shape[0], cols: r.shape[1], data: r.data, header: r.header, path: rel };
    });
  }

  async npz(rel, only = null) {
    return this.cached("npz:" + rel + ":" + (only ? only.join(",") : "*"), async () => {
      const u8 = await this.index.bytes(this.p(rel));
      const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      return this.worker.call("npz", { buffer: buf, only }, [buf]);
    });
  }

  async npy(rel) {
    return this.cached("npy:" + rel, async () => {
      const { parseNpy } = await import("./parsers/npy.js");
      return parseNpy(await this.index.bytes(this.p(rel)));
    });
  }

  // image-plane products
  image() { return this.fits("01_input/fits/image.fits"); }
  noise() { return this.fits("01_input/fits/noise_map.fits"); }
  noiseEff() { return this.has("03_multistart/noise_map_effective.fits") ? this.fits("03_multistart/noise_map_effective.fits") : this.noise(); }
  modelImage() { return this.fits("03_multistart/model_image.fits"); }
  arcMask() { return this.has("01_input/fits/arc_mask.fits") ? this.fits("01_input/fits/arc_mask.fits") : null; }
  likelihoodMask() { return this.has("01_input/fits/likelihood_mask.fits") ? this.fits("01_input/fits/likelihood_mask.fits") : null; }
  psfInput() { return this.has("01_input/fits/psf_kernel.fits") ? this.fits("01_input/fits/psf_kernel.fits") : null; }

  // all FITS layers available for the image viewer
  fitsLayers() {
    const out = [];
    for (const p of this.list("")) if (/\.fits$/i.test(p)) out.push(p);
    return out;
  }

  stageDir(key) {
    if (!key || key === "final") return this.stages.length ? `03_multistart/${this.stages[this.stages.length - 1].dir}` : "03_multistart";
    const s = this.stages.find((x) => x.key === key || x.dir === key);
    return s ? `03_multistart/${s.dir}` : null;
  }

  // Recovered supersampled PSF for a stage (falls back to the input kernel).
  async psfKernelHr(stageKey = "final") {
    const dir = this.stageDir(stageKey);
    const cands = [dir && `${dir}/psf_recovered_supersampled.fits`, "02_psf_reconstruction/fits/psf_kernel_supersampled.fits", "01_input/fits/psf_kernel.fits"];
    for (const c of cands) if (c && this.has(c)) return this.fits(c);
    const any = this.fitsLayers().find((p) => /psf/i.test(p));
    return any ? this.fits(any) : null;
  }

  // ------------------------------------------------------------ parameters
  // MAP parameters of a stage (true values when the *_full.npz sidecar exists).
  async bestFit(stageKey = "final") {
    return this.cached("bestfit:" + stageKey, async () => {
      const dir = stageKey === "final" ? "03_multistart" : this.stageDir(stageKey);
      if (!dir) throw new Error("unknown stage " + stageKey);
      const jsonName = this.has(`${dir}/best_fit_params.json`) ? "best_fit_params" : this.has(`${dir}/physical_params.json`) ? "physical_params" : null;
      let params = {};
      let full = false;
      const fullPath = jsonName ? `${dir}/${jsonName}_full.npz` : null;
      if (fullPath && this.has(fullPath)) {
        const z = await this.npz(fullPath);
        for (const [k, v] of Object.entries(z)) {
          if (v.shape.length === 0 || (v.shape.length === 1 && v.shape[0] === 1)) params[k] = Number(v.data[0]);
          else params[k] = v; // arrays kept as {shape,data}
        }
        full = true;
      } else if (jsonName) {
        const j = await this.json(`${dir}/${jsonName}.json`, {});
        for (const [k, v] of Object.entries(j)) params[k] = Array.isArray(v) ? { shape: [v.length], data: v } : v;
      } else {
        throw new Error("no best-fit parameters for stage " + stageKey);
      }
      // source pixels (physical) for pixelated sources
      let source = null;
      for (const c of [`${dir}/best_source_pixels.fits`]) if (this.has(c)) { const f = await this.fits(c); source = { n: f.rows, data: f.data }; }
      const blindedKeys = (this.blinding?.blinded_columns || []).filter((k) => k in params);
      return { params, source, full, blindedKeys, stage: stageKey, dir };
    });
  }

  // Full posterior (parsed in the worker). Columns are the stored (possibly blinded) values.
  async posterior() {
    return this.cached("posterior", async () => {
      const u8 = await this.index.bytes(this.p("05_posterior/samples/posterior_samples.npz"));
      const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      const r = await this.worker.call("posterior", { buffer: buf }, [buf]);
      r.blindedColumns = (this.blinding?.blinded_columns || []).filter((c) => c in r.columns);
      r.summaries = {};
      return r;
    });
  }

  async priors() {
    return this.cached("priors", async () => {
      const z = await this.npz("01_input/priors/prior_samples.npz");
      const columns = {};
      for (const [k, v] of Object.entries(z)) if (v.shape.length === 1) columns[k] = v.data;
      return { columns, names: Object.keys(columns) };
    });
  }

  async posteriorSummaryOf(name) {
    const post = await this.posterior();
    if (!post.summaries[name] && post.columns[name]) post.summaries[name] = summarize(post.columns[name]);
    return post.summaries[name];
  }

  // Scalar params of one posterior draw + its source pixels. Blinded columns are
  // unblinded in memory when offsets are available (needed for rendering).
  async drawParams(i, { unblind = true } = {}) {
    const post = await this.posterior();
    const params = {};
    for (const nm of post.scalarNames) params[nm] = post.columns[nm][i];
    if (unblind && this.offsets) {
      for (const c of post.blindedColumns) if (c in this.offsets) params[c] = unblindValue(params[c], this.offsets[c], this.offsetsMode);
    }
    let source = null;
    if (post.pixelIdx.length) {
      const n = Math.round(Math.sqrt(post.pixelIdx.length));
      const data = new Float64Array(post.pixelIdx.length);
      const nP = post.nParams;
      for (let k = 0; k < post.pixelIdx.length; k++) data[k] = post.samples[i * nP + post.pixelIdx[k]];
      source = { n, data };
    }
    return { params, source, index: i, unblinded: !!(this.offsets) || !this.features.blinded, blindedKeys: post.blindedColumns };
  }

  bestDrawIndex(post) {
    if (!post.logL) return 0;
    let b = 0;
    for (let i = 1; i < post.logL.length; i++) if (post.logL[i] > post.logL[b]) b = i;
    return b;
  }

  // Fitted PSF-error noise-inflation parameter b of a stage (psf_error_b_fit.json), or null.
  async psfErrorB(stageKey = "final") {
    const dirs = [this.stageDir(stageKey), "03_multistart"].filter(Boolean);
    for (const d of dirs) { const j = await this.json(`${d}/psf_error_b_fit.json`); if (j && j.b_fit != null) return j.b_fit; }
    for (const st of this.stages) { const j = await this.json(`03_multistart/${st.dir}/psf_error_b_fit.json`); if (j && j.b_fit != null) return j.b_fit; }
    return null;
  }

  // Attach a perturber catalog (perturbers.json) after loading; invalidates forward models.
  setCatalog(json, path = "(attached)") {
    this.catalog = json;
    this.catalogPath = path;
    this.catalogRestored = false;
    this.features.catalog = !!json;
    if (json) catalogStore.remember(json, path);
    for (const k of [...this._cache.keys()]) if (/^(fm:|defaultModel:|lensCenter)/.test(k)) this._cache.delete(k);
  }

  // ------------------------------------------------------------ blinding
  async unblind(key) {
    const blob = await this.json("05_posterior/samples/blinding_key.json");
    if (!blob) throw new Error("No sealed blinding_key.json in this run.");
    if (!isEncryptedBlob(blob)) throw new Error("blinding_key.json is not an encrypted blob.");
    const r = await decryptOffsets(blob, key.trim());
    this.offsets = r.offsets;
    this.offsetsMode = r.mode;
    return r;
  }

  async keyFileContents() { return (await this.text("05_posterior/samples/blinding_secret.key", "")).trim(); }

  // ------------------------------------------------------------ real unblinding
  // Restore absolute values everywhere for this session: posterior columns/samples, the
  // parameter summary, and the run's blinding flags. Needs the key (offsets in memory).
  async unblindSession() {
    if (!this.offsets) throw new Error("No blinding key loaded.");
    if (this.unblinded) return;
    const mode = this.offsetsMode || "absolute";
    const un = (v, off) => (mode === "fractional" ? v * off + off : v + off);
    if (this.features.posterior) {
      const post = await this.posterior();
      for (const c of post.blindedColumns) {
        const off = this.offsets[c];
        if (off === undefined) continue;
        const col = post.columns[c];
        for (let i = 0; i < col.length; i++) col[i] = un(col[i], off);
        const j = post.names.indexOf(c);
        if (j >= 0) for (let s = 0; s < post.nSamples; s++) post.samples[s * post.nParams + j] = un(post.samples[s * post.nParams + j], off);
      }
      post.blindedColumns = [];
      post.summaries = {};
    }
    for (const r of this.paramSummary) {
      const off = this.offsets[r.name];
      if (off === undefined) continue;
      if (mode === "fractional") { r.median = un(r.median, off); r.mean = un(r.mean, off); r.up *= off; r.lo *= off; r.std *= off; }
      else { r.median += off; r.mean += off; }
    }
    this.blinding = { ...(this.blinding || {}), blinded: false, blinded_columns: [], unblinded_in_session: true, original_blinded_columns: this.blinding?.blinded_columns || [] };
    this.features.blinded = false;
    this.unblinded = true;
  }

  // H0 samples from the (true) D_dt column; requires the run to be unblinded or not blinded.
  async h0Samples({ zl, zs, Om = 0.3 }) {
    const post = await this.posterior();
    let ddt = post.columns.D_dt;
    if (!ddt) throw new Error("No D_dt column in the posterior.");
    if (post.blindedColumns.includes("D_dt")) {
      if (!this.offsets) throw new Error("D_dt is blinded and no key is loaded.");
      const off = this.offsets.D_dt;
      ddt = Float64Array.from(ddt, (v) => (this.offsetsMode === "fractional" ? v * off + off : v + off));
    }
    return { ddt, samples: Float64Array.from(ddt, (d) => H0FromDdt(d, zl, zs, Om)) };
  }

  async unblindedArtifacts(extra = {}) {
    const { encodeNpz } = await import("./parsers/npywrite.js");
    const post = await this.posterior();
    const arrays = { samples: { data: post.samples, shape: [post.nSamples, post.nParams] }, param_names: { data: post.names, shape: [post.names.length] } };
    if (post.logL) arrays.log_likelihood = { data: post.logL, shape: [post.logL.length] };
    const npz = encodeNpz(arrays, { level: 6 });
    const means = {};
    for (const c of this.blinding?.original_blinded_columns || []) if (post.columns[c]) means[c] = post.columns[c].reduce((a, b) => a + b, 0) / post.columns[c].length;
    const record = {
      source_samples_dir: this.name + "/05_posterior/samples", mode: this.offsetsMode || "absolute", reference: this.blinding?.reference || "mean",
      restored_absolute_means: means, written_by: "alpaca-analysis (browser)", written_at: new Date().toISOString(),
      H0: extra.h0 ? { median: extra.h0.median, lo68: extra.h0.lo68, hi68: extra.h0.hi68, std: extra.h0.std, z_lens: extra.zl, z_source: extra.zs, Om: extra.Om, cosmology: "flat LCDM" } : null,
      D_dt: extra.ddt ? { median: extra.ddt.median, lo68: extra.ddt.lo68, hi68: extra.ddt.hi68, std: extra.ddt.std } : null,
    };
    return { npz, record: new TextEncoder().encode(JSON.stringify(record, null, 2)) };
  }

  // Write into <run>/05_posterior/samples/unblinded/ via the File System Access API.
  async writeUnblinded(extra = {}) {
    const handle = this.index.handle;
    if (!handle) throw new Error("The run folder was not opened with the File System Access API; cannot write.");
    if ((await handle.requestPermission({ mode: "readwrite" })) !== "granted") throw new Error("Write permission to the run folder was denied.");
    const parts = (this.root + "05_posterior/samples/unblinded").split("/").filter(Boolean);
    let dir = handle;
    for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true });
    const { npz, record } = await this.unblindedArtifacts(extra);
    for (const [name, bytes] of [["posterior_samples.npz", npz], ["unblinding_record.json", record]]) {
      const fh = await dir.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write(bytes);
      await w.close();
    }
    this.unblindWritten = true;
    return `${this.root}05_posterior/samples/unblinded/ (posterior_samples.npz, unblinding_record.json)`;
  }

  async downloadUnblinded(extra = {}) {
    const { npz, record } = await this.unblindedArtifacts(extra);
    for (const [name, bytes, type] of [["posterior_samples.npz", npz, "application/zip"], ["unblinding_record.json", record, "application/json"]]) {
      const url = URL.createObjectURL(new Blob([bytes], { type }));
      const a = document.createElement("a"); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
    return "downloaded posterior_samples.npz + unblinding_record.json";
  }

  // Does rendering from the posterior need a key we don't have?
  get needsKey() { return this.features.blinded && !this.offsets; }
  get hasKey() { return !!this.offsets; }

  // Blind an array of derived values (e.g. H0) with the run's convention: values are
  // returned as deviations from their own posterior mean (absolute) or fractional deviations.
  blindDerived(arr) {
    const mode = this.blinding?.mode || this.offsetsMode || "absolute";
    const ref = this.blinding?.reference || "mean";
    let m;
    if (ref === "median") { const s = Float64Array.from(arr).sort(); m = s[Math.floor(s.length / 2)]; }
    else { m = 0; for (const v of arr) m += v; m /= arr.length; }
    const out = Float64Array.from(arr, (v) => (mode === "fractional" ? (v - m) / m : v - m));
    return { values: out, mode, sigmaFrac: (() => { let s2 = 0; for (const v of arr) s2 += (v - m) ** 2; return Math.sqrt(s2 / Math.max(1, arr.length - 1)) / Math.abs(m); })() };
  }

  // ------------------------------------------------------------ forward model spec
  perturbersFromParams(params) {
    const ids = new Set();
    for (const k of Object.keys(params)) { const m = /^pert(\d+)_theta_E$/.exec(k); if (m) ids.add(+m[1]); }
    const cat = this.catalog;
    const zLens = cat?.target?.z_lens ?? null;
    const zTol = this.config?.mass?.perturbers?.z_tolerance ?? 0.01;
    const list = [];
    for (const id of ids) {
      const c = cat?.perturbers?.find((p) => +p.id === id);
      const z = c?.redshift?.z ?? c?.z ?? null;
      let plane = "main";
      if (z != null && zLens != null && Math.abs(z - zLens) > zTol) plane = z < zLens ? "foreground" : "background";
      const prof = params[`pert${id}_gamma`] !== undefined ? "EPL" : params[`pert${id}_e1`] !== undefined ? "SIE" : "SIS";
      list.push({ name: `pert${id}`, id, z, plane, profiles: [prof], notes: c?.notes || c?.name || "" });
    }
    list.sort((a, b) => (a.z ?? 0) - (b.z ?? 0) || a.id - b.id);
    return list;
  }

  // Detected lens centre (the anchor of catalog positions): brightest local maximum near the
  // point-source barycentre (or the flux centroid in galaxy-galaxy mode), as in setup_lens.
  async detectedLensCenter(params) {
    return this.cached("lensCenter", async () => {
      const img = await this.image();
      const nx = img.cols, pix = this.pixScale ?? this.config?.data?.pix_scale;
      let ax = 0, ay = 0, n = 0;
      for (let i = 0; params[`x_image_${i}`] !== undefined; i++) { ax += params[`x_image_${i}`]; ay += params[`y_image_${i}`]; n++; }
      if (!n) {
        let sx = 0, sy = 0, tot = 0;
        const ra0 = -(nx * pix) / 2 + pix / 2;
        for (let r = 0; r < nx; r++) for (let c = 0; c < nx; c++) { const v = Math.max(0, img.data[r * nx + c]); sx += v * (ra0 + c * pix); sy += v * (ra0 + r * pix); tot += v; }
        ax = tot > 0 ? sx / tot : 0; ay = tot > 0 ? sy / tot : 0; n = 1;
      } else { ax /= n; ay /= n; }
      return detectLensCenter(img.data, nx, pix, [ax, ay], this.config?.data?.lens_center_search_radius ?? 0.35);
    });
  }

  // Fill catalog-derived positions for perturbers whose centres are fixed (not sampled).
  async fillPerturberPositions(perturbers, params) {
    const missing = perturbers.filter((p) => params[`${p.name}_center_x`] === undefined);
    if (!missing.length || !this.catalog) return perturbers;
    const cat = this.catalog;
    const entries = missing.map((p) => cat.perturbers.find((c) => +c.id === p.id)).filter(Boolean);
    if (!entries.length) return perturbers;
    const center = await this.detectedLensCenter(params);
    const img = await this.image();
    const pos = perturberPositions(cat, entries, center, { imageNpix: img.cols });
    for (const p of missing) { const xy = pos.get(p.id); if (xy) { p.center_x = xy[0]; p.center_y = xy[1]; p.positionSource = "catalog"; } }
    return perturbers;
  }

  async forwardSpec(stageKey = "final", paramsHint = null) {
    const bf = paramsHint || (await this.bestFit(stageKey)).params;
    const psf = await this.psfKernelHr(stageKey);
    if (!psf) throw new Error("No PSF kernel found in the run.");
    const img = await this.image();
    const nx = img.cols;
    const pix = this.pixScale ?? (this.config?.data?.pix_scale);
    const supersampling = this.config?.data?.source_oversample ?? this.config?.psf?.input?.oversample ?? 3;
    const arc = await this.arcMask();
    const perturbers = await this.fillPerturberPositions(this.perturbersFromParams(bf), bf);
    const unresolved = perturbers.filter((p) => bf[`${p.name}_center_x`] === undefined && p.center_x === undefined);
    const zLens = this.catalog?.target?.z_lens ?? null;
    const zSource = this.catalog?.target?.z_source ?? null;
    const isMultiplane = perturbers.some((p) => p.plane !== "main") && zLens != null && zSource != null;
    const cosmo = { H0: this.config?.mass?.perturbers?.cosmology?.H0_fid ?? 70, Om: this.config?.mass?.perturbers?.cosmology?.Om0 ?? 0.3 };
    const nSersic = bf.light_Re_L3 !== undefined ? 3 : bf.light_Re_L2 !== undefined ? 2 : 1;
    let nPs = 0;
    while (bf[`x_image_${nPs}`] !== undefined) nPs++;
    const src = this.config?.stages?.cf_joint?.source || this.config?.model?.corr_field || {};
    return {
      nx, pix, ssf: supersampling,
      psfHr: { data: psf.data, rows: psf.rows, cols: psf.cols },
      arcMask: arc ? arc.data : null,
      geo: { isMultiplane, zLens, zSource, perturbers, cosmo },
      perturbers,
      nSrc: src.num_pixels ?? 128, sourceGridScale: src.source_grid_scale ?? 1.0,
      nSersic, useSky: bf.sky_amp !== undefined, nPs,
      approxPlanes: perturbers.length > 0 && (!this.catalog || unresolved.length > 0),
      psfPath: psf.path,
    };
  }

  // Initialise the forward model in the worker once per (run, stage).
  async ensureForwardModel(stageKey = "final") {
    return this.cached("fm:" + stageKey, async () => {
      const spec = await this.forwardSpec(stageKey);
      const runId = this.id + ":" + stageKey;
      const s = { ...spec, psfHr: { ...spec.psfHr, data: Float64Array.from(spec.psfHr.data) }, arcMask: spec.arcMask ? Float64Array.from(spec.arcMask) : null };
      await this.worker.call("fmInit", { runId, spec: s }, [s.psfHr.data.buffer, ...(s.arcMask ? [s.arcMask.buffer] : [])]);
      return { runId, spec };
    });
  }

  async render(stageKey, params, source, opts = {}) {
    const { runId } = await this.ensureForwardModel(stageKey);
    const sp = source ? Float64Array.from(source.data) : null;
    return this.worker.call("fmRender", { runId, params, sourcePixels: sp, opts }, sp ? [sp.buffer] : []);
  }

  async lensing(stageKey, params, opts = {}) {
    const { runId } = await this.ensureForwardModel(stageKey);
    return this.worker.call("fmLensing", { runId, params, opts });
  }

  async findImages(stageKey, params, bx, by, opts = {}) {
    const { runId } = await this.ensureForwardModel(stageKey);
    return (await this.worker.call("fmFindImages", { runId, params, bx, by, opts })).images;
  }

  async rayShoot(stageKey, params, x, y) {
    const { runId } = await this.ensureForwardModel(stageKey);
    return this.worker.call("fmRayShoot", { runId, params, x: Float64Array.from(x), y: Float64Array.from(y) });
  }

  // Default "model" for viewers: the forward model of the best log-likelihood posterior draw
  // (rendered once and cached), falling back to the MAP model_image.fits when there is no
  // posterior or the run is blinded without a key. Returns { source, label, total, ps, sigma, index }.
  async defaultModel({ prefer = "best" } = {}) {
    const canRender = this.features.posterior && !this.needsKey && this.features.image;
    // the rendered draw is only trustworthy when the perturber geometry is known
    const trustworthy = canRender && !((await this.ensureForwardModel("final").catch(() => null))?.spec?.approxPlanes);
    if (prefer === "best" && trustworthy) {
      return this.cached("defaultModel:best", async () => {
        const post = await this.posterior();
        const i = this.bestDrawIndex(post);
        const d = await this.drawParams(i);
        const { spec } = await this.ensureForwardModel("final");
        const r = await this.render("final", d.params, d.source, { lensLight: true, includeSky: true, source: !!d.source, pointSources: spec.nPs > 0 });
        const noise = (await this.noise()).data;
        const b = d.params.psf_error_b ?? 0;
        const sigma = new Float64Array(noise.length);
        for (let k = 0; k < sigma.length; k++) sigma[k] = Math.sqrt(noise[k] ** 2 + b * b * (r.ps ? r.ps[k] : 0) ** 2);
        return { source: "best", index: i, label: `best log-L draw #${i}`, total: r.total, ps: r.ps, sigma, sigmaPlain: noise, b, bSource: "sampled", params: d.params, sourceGrid: r.sourceGrid };
      });
    }
    return this.cached("defaultModel:map", async () => {
      if (!this.features.modelImage) throw new Error("No model image in this run.");
      const m = await this.modelImage();
      const noise = (await this.noise()).data;
      const note = !this.features.posterior ? null : this.needsKey ? "posterior draw needs the blinding key; showing MAP" : !trustworthy && prefer === "best" ? "perturber catalog missing (multi-plane geometry unknown); showing MAP" : null;
      // PSF-error boost for the MAP: fitted b with the rendered point-source image (when the geometry is known)
      let ps = null, b = (await this.psfErrorB("final")) ?? 0, sigma = noise;
      const fmOk = await this.ensureForwardModel("final").then((x) => !x.spec.approxPlanes).catch(() => false);
      if (b && fmOk && this.features.map) {
        try {
          const bf = await this.bestFit("final");
          const params = Object.fromEntries(Object.entries(bf.params).filter(([, v]) => typeof v === "number"));
          if (params.lens_gamma !== undefined) {
            ps = (await this.render("final", params, null, { lensLight: false, source: false, pointSources: true })).ps;
            sigma = new Float64Array(noise.length);
            for (let k = 0; k < sigma.length; k++) sigma[k] = Math.sqrt(noise[k] ** 2 + b * b * (ps ? ps[k] : 0) ** 2);
          }
        } catch (e) { console.warn("MAP PSF-boost sigma", e); }
      }
      return { source: "map", label: "MAP (model_image.fits)", total: m.data, ps, sigma, sigmaPlain: noise, b: ps ? b : 0, bSource: "fitted", note };
    });
  }

  // Extent [x0,x1,y0,y1] of the image grid in arcsec (pixel edges).
  extent(nx = null, pix = null) {
    pix = pix ?? this.pixScale ?? 1;
    nx = nx ?? this.config?.data?.cutout_size ?? 219;
    const h = (nx * pix) / 2;
    return [-h, h, -h, h];
  }
}
