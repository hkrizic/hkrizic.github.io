// Engine glue shared by the browser worker (py-worker.js) and the Node
// validator (tools/validate.mjs). Takes a loaded Pyodide instance, installs
// the grading harness and lazily provides datasets + packages.
import { HARNESS } from './pyharness.js';

export const PYODIDE_VERSION = '314.0.7';
export const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// Files under data/ that user code can open as "data/<name>".
export const DATA_FILES = [
  'orders.csv', 'users.csv', 'events.csv', 'ab_test.csv', 'server.log', 'weather.csv',
  'stocks.csv', 'customers_messy.csv', 'departments.csv', 'employees.csv', 'words.txt',
];

const HOME = '/home/pyodide';

export class PyCore {
  /**
   * @param py        loaded Pyodide instance
   * @param readData  async (name) => file text, for DATA_FILES
   * @param onStatus  (text) => void, human-readable loading messages
   */
  constructor(py, { readData, onStatus = () => {} }) {
    this.py = py;
    this.readData = readData;
    this.onStatus = onStatus;
    this.files = new Set();
    this.packagesSeen = new Set();
  }

  async init() {
    const py = this.py;
    const site = py.runPython('import site; site.getsitepackages()[0]');
    py.FS.writeFile(`${site}/_dojo.py`, HARNESS);
    try { py.FS.mkdir(`${HOME}/data`); } catch { /* exists */ }
    py.runPython(`import os; os.chdir(${JSON.stringify(HOME)})`);
    this.dojo = py.pyimport('_dojo');
  }

  /** Make sure data files and packages referenced by `code` are available. */
  async ensure(code) {
    const want = DATA_FILES.filter((f) => code.includes(f) && !this.files.has(f));
    if (want.length) {
      this.onStatus(`Loading ${want.join(', ')}…`);
      await Promise.all(want.map(async (f) => {
        const text = await this.readData(f);
        this.py.FS.writeFile(`${HOME}/data/${f}`, text);
        this.files.add(f);
      }));
    }
    let imports = [];
    try { imports = this.py.pyodide_py.code.find_imports(code).toJs(); } catch { /* syntax error: let Python report it */ }
    const fresh = imports.filter((m) => !this.packagesSeen.has(m));
    if (fresh.length) {
      try {
        await this.py.loadPackagesFromImports(code, {
          messageCallback: (m) => { if (/^Loading /.test(m)) this.onStatus(m.replace(/^Loading /, 'Installing ') + '…'); },
          errorCallback: () => {},
        });
      } catch { /* unknown module: the import will raise a normal ModuleNotFoundError */ }
      fresh.forEach((m) => this.packagesSeen.add(m));
    }
  }

  /** Text that ensure() should scan for a check() call. */
  static checkSource(spec, code) {
    const tests = (spec.tests || []).map((t) => [t.call, t.expect, t.code, t.assert].filter(Boolean).join('\n'));
    return [spec.setup || '', spec.solution || '', code, ...tests].join('\n');
  }

  run(code, setup = '') {
    return JSON.parse(this.dojo.run(code, setup));
  }

  check(spec, code, progress) {
    const payload = JSON.stringify({
      setup: spec.setup || '', solution: spec.solution || '', tests: spec.tests || [],
      require: spec.require || [], forbid: spec.forbid || [],
    });
    return JSON.parse(this.dojo.check(payload, code, progress || null));
  }
}

/** Plain text of a run's stdout segments. */
export function outText(segs) {
  return (segs || []).filter((s) => s.t === 'text').map((s) => s.v).join('');
}

/** Same normalisation the harness uses for stdout comparison. */
export function normOut(s) {
  const lines = String(s).replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/\s+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}
