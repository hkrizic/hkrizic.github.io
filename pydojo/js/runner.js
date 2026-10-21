// Main-thread client for the Python worker: request queue, time limits,
// automatic restart after an infinite loop, and a status feed for the UI.

const listeners = new Set();
let worker = null;
let seq = 0;
const pending = new Map();
let state = { phase: 'idle', text: '' }; // idle | loading | ready | busy | error
let recycleWanted = false;

function emit(patch) {
  state = { ...state, ...patch, waiting: [...pending.values()].some((p) => !p.bg) };
  listeners.forEach((fn) => fn(state));
}

function start() {
  if (worker) return;
  emit({ phase: 'loading', text: 'Starting Python…' });
  worker = new Worker(new URL('./py-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'status') {
      if (m.text) emit({ text: m.text });
      else emit({ text: '' });
    } else if (m.type === 'ready') {
      emit({ phase: pending.size ? 'busy' : 'ready', text: '', version: m.version });
    } else if (m.type === 'fatal') {
      emit({ phase: 'error', text: 'Python could not start. Check your internet connection and reload.' });
      for (const p of pending.values()) p.reject(new Error(m.error));
      pending.clear();
    } else if (m.type === 'recycle') {
      if (!pending.size) restart(); else recycleWanted = true;
    } else if (m.type === 'exec') {
      const p = pending.get(m.id);
      if (p) p.arm();
    } else if (m.type === 'progress') {
      const p = pending.get(m.id);
      if (p && p.onProgress) p.onProgress(m.i, m.n);
    } else if (m.type === 'result') {
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      clearTimeout(p.timer);
      emit(pending.size ? {} : { phase: 'ready', text: '' });
      if (recycleWanted && !pending.size) restart(); // before resolving, so the next request goes to the fresh worker
      if (m.error) p.reject(new Error(m.error));
      else p.resolve(m.result);
    }
  };
  worker.onerror = (e) => {
    emit({ phase: 'error', text: 'Python worker crashed — restarting…' });
    console.error(e);
    restart();
  };
}

function restart() {
  recycleWanted = false;
  if (worker) worker.terminate();
  worker = null;
  for (const p of pending.values()) { clearTimeout(p.timer); p.reject(Object.assign(new Error('restarted'), { restarted: true })); }
  pending.clear();
  start();
}

function call(op, args, { timeoutMs = 8000, onProgress, bg = false } = {}) {
  start();
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const entry = {
      resolve, reject, onProgress, bg, timer: null,
      // the clock starts when Python actually begins executing (not while packages download)
      arm() {
        entry.timer = setTimeout(() => {
          pending.delete(id);
          reject(Object.assign(new Error('timeout'), { timeout: true }));
          emit({ phase: 'loading', text: 'Restarting Python…' });
          restart();
        }, timeoutMs);
      },
    };
    pending.set(id, entry);
    emit(state.phase === 'ready' ? { phase: 'busy' } : {});
    worker.postMessage({ id, op, ...args });
  });
}

export const Py = {
  start,
  get state() { return state; },
  subscribe(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); },
  /** Run code; resolves to {out:[segments], error, ms}. Timeouts resolve to an error result. */
  async run(code, { setup = '', timeoutMs = 8000 } = {}) {
    try {
      return await call('run', { code, setup }, { timeoutMs });
    } catch (err) {
      return failure(err, timeoutMs);
    }
  },
  /** Grade code against a step spec; resolves to the harness result object. */
  async check(spec, code, { timeoutMs = 10000, onProgress } = {}) {
    try {
      return await call('check', { spec, code }, { timeoutMs, onProgress });
    } catch (err) {
      const f = failure(err, timeoutMs);
      return { passed: false, tests: (spec.tests || []).map((t) => ({ name: t.name || t.call || 'test', hidden: !!t.hidden, ok: false, msg: f.error.msg })), static: [], ...f };
    }
  },
  /** Preload packages/datasets for code that is about to be shown. */
  warm(code) { return call('warm', { code }, { timeoutMs: 120000, bg: true }).catch(() => {}); },
};

function failure(err, timeoutMs) {
  if (err.timeout) {
    return { out: [], error: { type: 'TimeoutError', msg: `Stopped after ${timeoutMs / 1000}s`, tb: `TimeoutError: your code ran longer than ${timeoutMs / 1000} seconds and was stopped.`, hint: 'Is there a loop that never ends? Check that the loop condition eventually becomes False — or your algorithm may simply be too slow for this input.' } };
  }
  return { out: [], error: { type: 'EngineError', msg: String(err.message || err), tb: String(err.message || err), hint: 'The Python engine had a problem. Try again.' } };
}
