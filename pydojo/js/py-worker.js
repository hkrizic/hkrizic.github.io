// Module worker hosting Pyodide, so user code (including infinite loops)
// never freezes the UI. The main thread kills and restarts it on timeout.
import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs';
import { PyCore, PYODIDE_CDN } from './pycore.js';

const post = (m) => self.postMessage(m);
let core;

const ready = (async () => {
  post({ type: 'status', text: 'Starting Python…' });
  const py = await loadPyodide({ indexURL: PYODIDE_CDN });
  core = new PyCore(py, {
    readData: async (name) => {
      const r = await fetch(new URL(`../data/${name}`, import.meta.url));
      if (!r.ok) throw new Error(`could not load data/${name}`);
      return r.text();
    },
    onStatus: (text) => post({ type: 'status', text }),
  });
  await core.init();
  post({ type: 'ready', version: py.version });
})().catch((err) => {
  post({ type: 'fatal', error: String(err && err.message || err) });
  throw err;
});

self.onmessage = async (e) => {
  const { id, op, code = '', setup = '', spec } = e.data;
  try {
    await ready;
    let result;
    if (op === 'warm') {
      await core.ensure(code);
      result = true;
    } else if (op === 'run') {
      await core.ensure(`${setup}\n${code}`);
      post({ type: 'exec', id });
      result = core.run(code, setup);
    } else if (op === 'check') {
      await core.ensure(PyCore.checkSource(spec, code));
      post({ type: 'exec', id });
      result = core.check(spec, code, (i, n) => post({ type: 'progress', id, i, n }));
    } else {
      throw new Error(`unknown op ${op}`);
    }
    post({ type: 'status', text: '' });
    post({ type: 'result', id, result });
  } catch (err) {
    const msg = String(err && err.message || err);
    // Recursion through C code (lru_cache, min(generator), ...) can overflow the
    // browser's native stack before Python's own limit. Report it like Python
    // would, then ask for a fresh interpreter since its state may be damaged.
    const fatal = /fatal error|fatally failed/i.test(msg);
    if ((op === 'run' || op === 'check') && (fatal || /call stack|too much recursion|JSON Parse error|is not valid JSON/i.test(msg))) {
      const error = fatal ? {
        type: 'EngineCrash', msg: 'the Python engine crashed and was restarted',
        tb: 'The Python engine crashed while running your code and has been restarted.',
        hint: 'This usually means extremely deep recursion or a very long chain of linked objects (e.g. a linked list with thousands of nodes). Try a smaller input or an iterative approach.',
      } : {
        type: 'RecursionError', msg: 'maximum recursion depth exceeded',
        tb: 'RecursionError: maximum recursion depth exceeded\n(the browser ran out of stack space)',
        hint: 'Your recursion went too deep for the browser. Recursion through functools.lru_cache can overflow after ~150 levels here. Use an iterative (bottom-up) solution or a manual memo dict.',
      };
      const result = op === 'run' ? { out: [], error } : {
        passed: false, static: [], out: [], error,
        tests: (spec.tests || []).map((t) => ({ name: t.name || t.call || t.var || 'test', hidden: !!t.hidden, ok: false, msg: 'RecursionError: recursion too deep' })),
      };
      post({ type: 'result', id, result });
      post({ type: 'recycle' });
      return;
    }
    post({ type: 'result', id, error: msg });
  }
};
