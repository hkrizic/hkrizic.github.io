// The configurator's single source of truth: the config being edited (ALPACA's JSON
// layout), the run_alpaca.py settings, and change notifications.

export const store = {
  defaults: null,         // js/configurator/defaults.json
  knobs: new Map(),       // key -> knob (defaults.json, plus docs text when available)
  cfg: {},                // the config being edited
  preset: "quasar",
  run: {
    IMAGE_PATH: "./data/image.fits",
    PSF_PATH: "./data/psf_supersampled.fits",
    NOISE_MAP_PATH: "./data/noise_map.fits",
    IMAGE_POSITIONS: null,     // {A: [x, y], ...} arcsec, frame-centre origin
    REFERENCE_IMAGE: "A",
    LENS_POSITION: [0, 0],
  },
  perturbers: null,       // model-frame catalogue {target, perturbers} or null
  listeners: new Set(),
};

export const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

export function getPath(obj, path) {
  let o = obj;
  for (const k of path.split(".")) {
    if (o === null || typeof o !== "object" || !(k in o)) return undefined;
    o = o[k];
  }
  return o;
}

export function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (const k of keys.slice(0, -1)) {
    if (o[k] === null || typeof o[k] !== "object" || Array.isArray(o[k])) o[k] = {};
    o = o[k];
  }
  o[keys[keys.length - 1]] = value;
}

export function delPath(obj, path) {
  const keys = path.split(".");
  const parent = getPath(obj, keys.slice(0, -1).join(".")) ?? (keys.length === 1 ? obj : undefined);
  if (parent && typeof parent === "object") delete parent[keys[keys.length - 1]];
}

export const get = (path) => getPath(store.cfg, path);
export const shipped = (path) => getPath(store.defaults.shipped, path);
export const codeDefault = (path) => getPath(store.defaults.dataclass, path);
// What ALPACA uses for a key: the config value, else the code default.
export const effective = (path) => { const v = get(path); return v === undefined ? codeDefault(path) : v; };

// Listeners run once per microtask with the Set of everything that changed
// (setting paths, or tags such as "preset", "import", "fits", "perturbers").
let pending = null;
export function emit(origin = "?") {
  if (pending) { pending.add(origin); return; }
  pending = new Set([origin]);
  queueMicrotask(() => { const o = pending; pending = null; for (const f of store.listeners) f(o); });
}
export function set(path, value, origin) { setPath(store.cfg, path, value); emit(origin); }
export function setMany(entries, origin) { for (const [p, v] of entries) setPath(store.cfg, p, v); emit(origin); }
export function setRun(key, value) { store.run[key] = value; emit("run"); }
export function subscribe(f) { store.listeners.add(f); return () => store.listeners.delete(f); }

export function loadPreset(name) {
  store.preset = name;
  store.cfg = clone(store.defaults.presets[name]);
  if (name === "galaxy") store.run.IMAGE_POSITIONS = null;
  emit("preset");
}

// --- flatten / diff --------------------------------------------------------------------
const STRUCTURED = new Set(["likelihood.time_delays", "mass.main.theta_E_prior", "stages.cf_joint.perturber_fields"]);

export function leaves(obj, prefix = "", out = {}) {
  if (obj && typeof obj === "object" && !Array.isArray(obj) && Object.keys(obj).length && !STRUCTURED.has(prefix)) {
    for (const [k, v] of Object.entries(obj)) leaves(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (prefix) out[prefix] = obj;
  return out;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Keys whose value differs from the shipped config (added, changed, missing).
export function diffVsShipped(cfg = store.cfg) {
  const a = leaves(cfg), b = leaves(store.defaults.shipped);
  const changed = [], added = [], missing = [];
  for (const k of Object.keys(a)) {
    if (!(k in b)) added.push(k);
    else if (!same(a[k], b[k])) changed.push(k);
  }
  for (const k of Object.keys(b)) if (!(k in a)) missing.push(k);
  return { changed, added, missing };
}

// --- JSON writer -------------------------------------------------------------------------
// Like JSON.stringify(cfg, null, 2), but short lists of numbers/strings stay on one line,
// and values ALPACA declares as floats keep their ".0" (JSON.parse in the browser drops it).
function floatPath(path) {
  const k = store.knobs.get(path);
  return k && (k.type === "float" || k.elem_type === "float");
}

function fmtScalar(v, isFloat) {
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "null";
    if (isFloat && Number.isInteger(v) && Math.abs(v) < 1e16) return v.toFixed(1);
    return String(v);
  }
  return JSON.stringify(v);
}

// Emits [{text, path}] lines; `path` marks the line that holds a leaf value.
export function jsonLines(value, path = "", indent = "", key = null, last = true) {
  const pre = indent + (key === null ? "" : JSON.stringify(key) + ": ");
  const comma = last ? "" : ",";
  const isF = floatPath(path);
  if (Array.isArray(value)) {
    const flat = value.every((x) => x === null || typeof x !== "object");
    const one = "[" + value.map((x) => fmtScalar(x, isF)).join(", ") + "]";
    if (flat && one.length + pre.length <= 96) return [{ text: pre + one + comma, path }];
    const lines = [{ text: pre + "[", path: null }];
    value.forEach((x, i) => lines.push(...jsonLines(x, path, indent + "  ", null, i === value.length - 1)));
    lines.push({ text: indent + "]" + comma, path: null });
    lines[0].path = path;
    return lines;
  }
  if (value && typeof value === "object") {
    const ks = Object.keys(value);
    if (!ks.length) return [{ text: pre + "{}" + comma, path }];
    const lines = [{ text: pre + "{", path: STRUCTURED.has(path) ? path : null }];
    ks.forEach((k, i) => lines.push(...jsonLines(value[k], path ? `${path}.${k}` : k, indent + "  ", k, i === ks.length - 1)));
    lines.push({ text: indent + "}" + comma, path: null });
    return lines;
  }
  return [{ text: pre + fmtScalar(value, isF) + comma, path }];
}

export function configText(cfg = store.cfg) {
  return jsonLines(cfg).map((l) => l.text).join("\n") + "\n";
}
