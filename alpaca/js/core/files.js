// Folder ingestion: File System Access API, <input webkitdirectory>, drag & drop,
// or a URL (directory listing / manifest). Produces a FileIndex with lazy reads.

function normalize(p) {
  return p.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

export class FileIndex {
  constructor(entries, rootName = "") {
    this.entries = entries; // Map path -> {file?, handle?, url?, size}
    this.rootName = rootName;
    this._cache = new Map();
    this._urls = new Map();
  }

  get paths() { return [...this.entries.keys()]; }
  has(p) { return this.entries.has(normalize(p)); }
  size(p) { return this.entries.get(normalize(p))?.size ?? null; }

  list(prefix = "", { recursive = true } = {}) {
    prefix = normalize(prefix);
    if (prefix && !prefix.endsWith("/")) prefix += "/";
    const out = [];
    for (const p of this.entries.keys()) {
      if (!p.startsWith(prefix)) continue;
      const rest = p.slice(prefix.length);
      if (!recursive && rest.includes("/")) continue;
      out.push(p);
    }
    return out.sort();
  }

  find(regex) { return this.paths.filter((p) => regex.test(p)).sort(); }

  async _fileOf(p) {
    const e = this.entries.get(normalize(p));
    if (!e) throw new Error("No such file in run: " + p);
    if (e.file) return e.file;
    if (e.handle) { e.file = await e.handle.getFile(); return e.file; }
    return null;
  }

  async bytes(p) {
    p = normalize(p);
    if (this._cache.has(p)) return this._cache.get(p);
    const e = this.entries.get(p);
    if (!e) throw new Error("No such file in run: " + p);
    let u8;
    if (e.url) {
      const r = await fetch(e.url);
      if (!r.ok) throw new Error(`fetch ${e.url}: ${r.status}`);
      u8 = new Uint8Array(await r.arrayBuffer());
    } else {
      const f = await this._fileOf(p);
      u8 = new Uint8Array(await f.arrayBuffer());
    }
    if (u8.byteLength < 8 * 1024 * 1024) this._cache.set(p, u8);
    return u8;
  }

  async text(p) { return new TextDecoder().decode(await this.bytes(p)); }
  async json(p) { return JSON.parse(await this.text(p)); }

  // Object/remote URL usable in <img>/<iframe>.
  async url(p) {
    p = normalize(p);
    const e = this.entries.get(p);
    if (!e) throw new Error("No such file in run: " + p);
    if (e.url) return e.url;
    if (this._urls.has(p)) return this._urls.get(p);
    const f = await this._fileOf(p);
    const u = URL.createObjectURL(f);
    this._urls.set(p, u);
    return u;
  }

  dispose() { for (const u of this._urls.values()) URL.revokeObjectURL(u); this._urls.clear(); this._cache.clear(); }

  // ---------------------------------------------------------------- builders
  static async fromDirectoryHandle(handle) {
    const entries = new Map();
    async function walk(dir, prefix) {
      for await (const [name, h] of dir.entries()) {
        if (name.startsWith(".")) continue;
        const p = prefix + name;
        if (h.kind === "directory") await walk(h, p + "/");
        else entries.set(p, { handle: h, size: null });
      }
    }
    await walk(handle, "");
    const idx = new FileIndex(entries, handle.name);
    idx.handle = handle;
    return idx;
  }

  static fromFileList(files) {
    const entries = new Map();
    let rootName = "";
    for (const f of files) {
      const rel = normalize(f.webkitRelativePath || f.name);
      const parts = rel.split("/");
      if (parts.length > 1) { rootName = parts[0]; parts.shift(); }
      const p = parts.join("/");
      if (p.split("/").some((s) => s.startsWith("."))) continue;
      entries.set(p, { file: f, size: f.size });
    }
    return new FileIndex(entries, rootName);
  }

  static async fromDataTransferItems(items) {
    const entries = new Map();
    let rootName = "";
    const readEntries = (reader) => new Promise((res, rej) => reader.readEntries(res, rej));
    const fileOf = (entry) => new Promise((res, rej) => entry.file(res, rej));
    async function walk(entry, prefix) {
      if (entry.isFile) {
        if (entry.name.startsWith(".")) return;
        const f = await fileOf(entry);
        entries.set(prefix + entry.name, { file: f, size: f.size });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        let batch;
        do {
          batch = await readEntries(reader);
          for (const e of batch) await walk(e, prefix + entry.name + "/");
        } while (batch.length);
      }
    }
    const roots = [];
    for (const it of items) {
      const entry = it.webkitGetAsEntry ? it.webkitGetAsEntry() : null;
      if (entry) roots.push(entry);
    }
    if (roots.length === 1 && roots[0].isDirectory) {
      rootName = roots[0].name;
      const reader = roots[0].createReader();
      let batch;
      do { batch = await readEntries(reader); for (const e of batch) await walk(e, ""); } while (batch.length);
    } else {
      for (const r of roots) await walk(r, "");
    }
    return new FileIndex(entries, rootName);
  }

  // Load from a base URL: either <base>/manifest.json (array of relative paths)
  // or a python http.server style HTML index, walked recursively.
  static async fromUrl(base) {
    if (!base.endsWith("/")) base += "/";
    const entries = new Map();
    const manifest = await fetch(base + "manifest.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (Array.isArray(manifest)) {
      for (const p of manifest) entries.set(normalize(p), { url: base + p, size: null });
    } else {
      async function walk(url, prefix, depth) {
        if (depth > 8) return;
        const html = await fetch(url).then((r) => (r.ok ? r.text() : ""));
        const doc = new DOMParser().parseFromString(html, "text/html");
        for (const a of doc.querySelectorAll("a[href]")) {
          const href = a.getAttribute("href");
          if (!href || href.startsWith("?") || href.startsWith("/") || href.startsWith("..") || href.startsWith("http")) continue;
          const name = decodeURIComponent(href);
          if (name.startsWith(".")) continue;
          if (name.endsWith("/")) await walk(url + href, prefix + name, depth + 1);
          else entries.set(prefix + name, { url: url + href, size: null });
        }
      }
      await walk(base, "", 0);
    }
    const idx = new FileIndex(entries, base.split("/").filter(Boolean).pop() || "remote");
    idx.baseUrl = base;
    return idx;
  }
}

// Run roots inside an index: prefixes (ending with '/' or '') that contain a run.
export function findRunRoots(index) {
  const roots = new Set();
  for (const p of index.paths) {
    const m = /^(.*?)(?:config\/config\.json|03_multistart\/(?:best_fit_params\.json|multi_start_summary\.json)|05_posterior\/samples\/posterior_samples\.npz)$/.exec(p);
    if (m) roots.add(m[1]);
  }
  return [...roots].sort((a, b) => a.length - b.length);
}

// Locate a perturber catalog anywhere in the index (prefer the config path).
export function findCatalog(index, configPath = null) {
  if (configPath) {
    const cands = index.paths.filter((p) => p.endsWith(normalize(configPath)));
    if (cands.length) return cands[0];
  }
  const c = index.find(/(^|\/)perturbers[^/]*\.json$/);
  return c[0] || null;
}
