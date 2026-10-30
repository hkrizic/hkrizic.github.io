// Multiband runs (ALPACA >= 0.6.0, run_multiband.py): one shared lens model fitted jointly to several bands.
//
// Output folder (README_MULTIBAND.md):
//   <root>/multiband_config_used.json (or config_mb.json)  the multiband config (bands, reference, sharing, joint)
//   <root>/bands/<band>/                                  every band: an ordinary single-band ALPACA run folder
//   <root>/<joint>/joint_summary.json, sharing.txt, REPORT.md, figures/, joint_map_params_full.npz,
//   <root>/<joint>/posterior/ (with joint sampling)      blinded joint samples + manifest + sealed offsets
//
// A Multiband object holds the joint products; each band is a BandRun, a Run on bands/<band>/ whose posterior is the
// band's VIEW of the joint posterior (mbview.js: its own "<band>/" sites + the shared sites, positions shifted by the
// band's frame offset) and whose "joint" MAP is the same view of joint_map_params_full.npz. Every existing applet
// then works on any band; the multiband applets read the joint products directly.
import { Run, SEALED_NPZ_KEY } from "./run.js";
import { viewParams, bandWavelength } from "./mbview.js";
import { summarize } from "./stats.js";

const POST = "05_posterior/samples/";

// Multiband roots in an index: { root, joints: [joint folder names] } for every folder holding bands/<b>/ runs and at
// least one <joint>/joint_summary.json (or a multiband config).
export function findMultibandRoots(index) {
  const roots = new Map();
  for (const p of index.paths) {
    const m = /^(.*?)([^/]+)\/joint_summary\.json$/.exec(p);
    if (m && index.paths.some((q) => q.startsWith(m[1] + "bands/"))) {
      if (!roots.has(m[1])) roots.set(m[1], new Set());
      roots.get(m[1]).add(m[2]);
    }
  }
  for (const p of index.paths) {
    const m = /^(.*?)(?:multiband_config_used|config_mb)\.json$/.exec(p);
    if (m && !roots.has(m[1]) && index.paths.some((q) => q.startsWith(m[1] + "bands/"))) roots.set(m[1], new Set());
  }
  return [...roots].map(([root, joints]) => ({ root, joints: [...joints].sort((a, b) => (a === "joint" ? -1 : b === "joint" ? 1 : a.localeCompare(b))) }))
    .sort((a, b) => a.root.length - b.root.length);
}

export class Multiband {
  constructor(index, root, jointName, worker) {
    this.index = index;
    this.root = root || "";
    this.jointName = jointName || "joint";
    this.worker = worker;
    this.jointDir = this.root + this.jointName + "/";
    this.name = (index.rootName + (this.root ? "/" + this.root.replace(/\/$/, "") : "")) || "multiband run";
    this.bandRuns = new Map();
    this._cache = new Map();
  }

  has(p) { return this.index.has(p); }
  async json(p, fallback = null) { try { return this.index.has(p) ? await this.index.json(p) : fallback; } catch (e) { console.warn("json", p, e); return fallback; } }
  async text(p, fallback = null) { return this.index.has(p) ? this.index.text(p) : fallback; }
  cached(key, fn) {
    if (!this._cache.has(key)) this._cache.set(key, fn().catch((e) => { this._cache.delete(key); throw e; }));
    return this._cache.get(key);
  }

  async init() {
    const [cfg, cfgIn, summary, sharing, report] = await Promise.all([
      this.json(this.root + "multiband_config_used.json"), this.json(this.root + "config_mb.json"),
      this.json(this.jointDir + "joint_summary.json"), this.text(this.jointDir + "sharing.txt"), this.text(this.jointDir + "REPORT.md"),
    ]);
    this.config = cfg || cfgIn || {};
    this.summary = summary;
    this.sharingTxt = sharing;
    this.report = report;
    const mbc = this.config.multiband || {};
    const dirs = [...new Set(this.index.list(this.root + "bands/").map((p) => p.slice((this.root + "bands/").length).split("/")[0]))];
    const listed = summary?.bands || (Array.isArray(mbc.bands) ? mbc.bands.map((b) => b.name || b) : Object.keys(mbc.bands || {}));
    this.bands = (listed.length ? listed : dirs).filter((b) => dirs.includes(b));
    if (!this.bands.length) throw new Error("No band run folders under bands/.");
    this.reference = summary?.reference_band || mbc.reference_band || this.bands[0];
    this.frameOffsets = summary?.frame_offsets?.enabled ?? mbc.frame_offsets?.enabled ?? true;
    this.frameSigma = summary?.frame_offsets?.sigma_arcsec ?? mbc.frame_offsets?.sigma_arcsec ?? null;
    this.sharing = summary?.sharing || mbc.sharing || null;
    this.postDir = this.has(this.jointDir + "posterior/posterior_samples.npz") ? this.jointDir + "posterior/" : null;
    this.mapPath = this.has(this.jointDir + "joint_map_params_full.npz") ? this.jointDir + "joint_map_params_full.npz" : null;
    this.manifest = this.postDir ? await this.json(this.postDir + "blinding_manifest.json") : null;
    this.figures = this.index.list(this.jointDir + "figures/").filter((p) => /\.png$/i.test(p));
    return this;
  }

  // Bands ordered by wavelength (unknown last), the reference first among equals.
  get bandsByWavelength() {
    return this.bands.slice().sort((a, b) => (bandWavelength(a) ?? 1e9) - (bandWavelength(b) ?? 1e9) || (a === this.reference ? -1 : b === this.reference ? 1 : 0));
  }

  wavelength(band) { return bandWavelength(band); }

  // The Run of one band in the app's run slot `label` (created and initialised once per band and slot, so the same
  // band can be run A and B without sharing state).
  async bandRun(band, label = "A", keyHint = null) {
    if (!this.bands.includes(band)) throw new Error(`no band ${band} in this run (${this.bands.join(", ")})`);
    const k = band + "|" + label;
    if (!this.bandRuns.has(k)) {
      const r = new BandRun(this, band, label);
      this.bandRuns.set(k, r.init(keyHint).then(() => r).catch((e) => { this.bandRuns.delete(k); throw e; }));
    }
    return this.bandRuns.get(k);
  }

  // Joint scalar columns (every band, shared + "<band>/<site>", no source pixels). Stored blinded values: the
  // blinded columns are deviations from their mean (re-centred when an ALPACA 0.6.0 file stored them twice-blinded).
  async jointScalars() {
    if (!this.postDir) return null;
    return this.cached("scalars", async () => {
      const u8 = await this.index.bytes(this.postDir + "posterior_samples.npz");
      const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      const r = await this.worker.call("posteriorScalars", { buffer: buf }, [buf]);
      const blinded = (this.manifest?.blinded ? this.manifest.blinded_columns || [] : []);
      r.blindedColumns = r.names.filter((n) => blinded.includes(n) || blinded.includes(n.split("/").pop()));
      r.recentred = recentre(r.columns, r.blindedColumns);
      return r;
    });
  }

  // Raw entries of joint_map_params_full.npz ({name: number | {shape, data}}; the sealed blob kept aside).
  async jointMapRaw() {
    if (!this.mapPath) return null;
    return this.cached("mapraw", async () => {
      const u8 = await this.index.bytes(this.mapPath);
      const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      const z = await this.worker.call("npz", { buffer: buf, only: null }, [buf]);
      const params = {};
      let sealed = null;
      for (const [k, v] of Object.entries(z)) {
        if (k === SEALED_NPZ_KEY) { sealed = v; continue; }
        params[k] = v.shape.length === 0 || (v.shape.length === 1 && v.shape[0] === 1) ? Number(v.data[0]) : v;
      }
      return { params, sealed };
    });
  }

  // Frame offset of a band in mas: joint MAP and (with a posterior) median / 68 % / samples.
  async frameOffset(band) {
    const out = { band, map: null, post: null };
    const mas = this.summary?.joint_map?.frame_offsets_mas?.[band];
    if (Array.isArray(mas)) out.map = { dx: mas[0], dy: mas[1] };
    const s = await this.jointScalars().catch(() => null);
    const cx = s?.columns[`${band}/frame_dx`], cy = s?.columns[`${band}/frame_dy`];
    if (cx && cy) out.post = { dx: Float64Array.from(cx, (v) => 1000 * v), dy: Float64Array.from(cy, (v) => 1000 * v) };
    return out;
  }
}

// Re-centre blinded columns whose stored mean is far from zero. A posterior blinded once with reference "mean" stores
// value - mean (mean 0 to rounding); ALPACA 0.6.0's joint NUTS stored value - 2 x mean, whose mean is minus the true
// mean: shown as it is, that would expose the absolute value. Re-centring restores the once-blinded column exactly.
function recentre(columns, names, samples = null, allNames = null, nP = 0) {
  const fixed = [];
  for (const c of names) {
    const col = columns[c];
    if (!col) continue;
    const st = summarize(col);
    if (!(Math.abs(st.mean) > 0.5 * st.std)) continue;
    for (let i = 0; i < col.length; i++) col[i] -= st.mean;
    if (samples && allNames) { const j = allNames.indexOf(c); if (j >= 0) for (let s = 0; s < col.length; s++) samples[s * nP + j] -= st.mean; }
    fixed.push(c);
  }
  return fixed;
}

// One band of a multiband run, seen as an ordinary run: bands/<band>/ for data, config, PSF, stages and the band's
// own GD fit; the joint posterior (05_posterior/samples/* is read from <joint>/posterior/) projected onto the band.
export class BandRun extends Run {
  constructor(mb, band, label = "A") {
    super(mb.index, mb.root + "bands/" + band + "/", mb.worker, label);
    this.mb = mb;
    this.band = band;
    this.name = `${mb.name} · ${band}`;
  }

  p(rel) {
    if (this.mb.postDir && rel.startsWith(POST)) return this.mb.postDir + rel.slice(POST.length);
    return this.root + rel;
  }

  async init(keyHint = null) {
    // a key already accepted for another band of this run opens this band too (same sealed offsets)
    if (keyHint) this._keyHint = keyHint;
    await super.init();
    if (this._keyHint && this.features.blinded && this.features.sealed && !this.offsets) { try { await this.unblind(this._keyHint); this.keySource = "key of the other band"; } catch (e) { /* not this run's key */ } }
    this.features.multiband = true;
    this.features.jointMap = !!this.mb.mapPath;
    // the band's own sampled posterior, if any, is replaced by the joint one: no band-level summary files apply
    this.boundaryFlags = [];
    if (this.features.posterior) {
      const post = await this.posterior();
      const sm = this.mb.summary?.sampling || {};
      this.posteriorSummary = { engine: `NIFTy-NUTS (joint ${this.mb.bands.join(" + ")})`, nSamples: post.nSamples, nParams: post.nParams, divergenceRate: sm.divergence_rate, acceptance: sm.acceptance };
      this.paramSummary = post.scalarNames.map((n) => { const s = summarize(post.columns[n]); return { name: n, median: s.median, up: s.hi68 - s.median, lo: s.median - s.lo68, mean: s.mean, std: s.std }; });
    }
    if (this.features.jointMap) this.stages.push({ dir: this.stages.length ? this.stages[this.stages.length - 1].dir : "", key: "joint", label: "joint fit (multiband polish)", summary: { chi2_red: this.mb.summary?.joint_map?.chi2_red?.[this.band] ?? null, status: "done" }, hasParams: true, joint: true });
    return this;
  }

  // The final GD stage stays the band's own last stage (the joint pseudo-stage reuses its PSF and noise).
  get finalStage() { return this.stages.filter((s) => !s.joint).pop() || null; }

  stageDir(key) {
    if (key === "joint" || !key || key === "final") {
      const s = this.finalStage;
      return s ? `03_multistart/${s.dir}` : "03_multistart";
    }
    return super.stageDir(key);
  }

  async posterior(src = "samples") {
    if (src !== "samples") return super.posterior(src);
    return this.cached("posterior", async () => {
      const u8 = await this.index.bytes(this.mb.postDir + "posterior_samples.npz");
      const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      const view = { band: this.band, reference: this.mb.reference, sep: "/", frameOffsets: this.mb.frameOffsets };
      const r = await this.worker.call("posterior", { buffer: buf, view }, [buf]);
      r.src = "samples";
      r.blinding = this.blinding;
      r.blindedColumns = (this.blinding?.blinded ? this.blinding.blinded_columns || [] : []).filter((c) => c in r.columns);
      r.summaries = {};
      r.recentred = recentre(r.columns, r.blindedColumns, r.samples, r.names, r.nParams);
      return r;
    });
  }

  // "joint": the band's view of the joint MAP (true values; blinded entries opened with the key when sealed).
  async bestFit(stageKey = "final") {
    if (stageKey !== "joint") return super.bestFit(stageKey === "final" ? "final" : stageKey);
    return this.cached("bestfit:joint", async () => {
      const raw = await this.mb.jointMapRaw();
      if (!raw) throw new Error("This multiband run has no joint MAP (joint_map_params_full.npz).");
      const all = { ...raw.params };
      if (raw.sealed) Object.assign(all, await this.openSealed(raw.sealed));
      const { params, frame } = viewParams(all, { band: this.band, reference: this.mb.reference, sep: "__", frameOffsets: this.mb.frameOffsets });
      let source = null;
      const sp = params.source_pixels;
      if (sp && sp.shape) { source = { n: sp.shape[0], data: Float64Array.from(sp.data) }; delete params.source_pixels; }
      const blindedKeys = (this.blinding?.blinded_columns || []).filter((k) => k in params);
      return { params, source, full: true, blindedKeys, stage: "joint", dir: this.stageDir("joint"), frame };
    });
  }

  // Default viewer model: the best joint posterior draw when it can be rendered, else the band's view of the joint
  // MAP rendered in the browser, else the band's own GD model image.
  async defaultModel({ prefer = "best" } = {}) {
    if (prefer === "best" && this.features.posterior && !this.needsKey) return super.defaultModel({ prefer });
    if (!this.features.jointMap) return super.defaultModel({ prefer });
    return this.cached("defaultModel:joint", async () => {
      const bf = await this.bestFit("joint");
      const missing = (this.blinding?.blinded_columns || []).filter((c) => bf.params[c] === undefined);
      const fmOk = await this.ensureForwardModel("joint").then((x) => !x.spec.approxPlanes).catch(() => false);
      if (missing.length || !fmOk) {
        const m = await super.defaultModel({ prefer: "map" });
        return { ...m, label: `${this.band} alone: GD model_image.fits`, note: missing.length ? "the joint MAP's blinded entries are sealed and no key is loaded; showing the band's own GD model" : "perturber catalog missing; showing the band's own GD model" };
      }
      const params = Object.fromEntries(Object.entries(bf.params).filter(([, v]) => typeof v === "number"));
      const { spec } = await this.ensureForwardModel("joint");
      const r = await this.render("joint", params, bf.source, { lensLight: true, includeSky: true, source: !!bf.source, pointSources: spec.nPs > 0 });
      const noise = (await this.noise()).data;
      const b = params.psf_error_b ?? 0;
      const sigma = new Float64Array(noise.length);
      for (let k = 0; k < sigma.length; k++) sigma[k] = Math.sqrt(noise[k] ** 2 + b * b * (r.ps ? r.ps[k] : 0) ** 2);
      return { source: "map", label: `joint MAP (${this.band} view, rendered)`, total: r.total, ps: r.ps, sigma, sigmaPlain: noise, b, bSource: "joint MAP", params, sourceGrid: r.sourceGrid };
    });
  }
}
