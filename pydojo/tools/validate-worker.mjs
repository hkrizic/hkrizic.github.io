// Worker thread for validate.mjs: hosts one Pyodide + PyCore, answers jobs.
import { parentPort } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadPyodide } from 'pyodide';
import { PyCore } from '../js/pycore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const py = await loadPyodide();
const core = new PyCore(py, { readData: (name) => readFile(path.join(root, 'data', name), 'utf8') });
await core.init();
parentPort.postMessage({ type: 'ready' });

parentPort.on('message', async ({ id, op, code = '', setup = '', spec }) => {
  try {
    let result;
    if (op === 'run') {
      await core.ensure(`${setup}\n${code}`);
      result = core.run(code, setup);
    } else {
      await core.ensure(PyCore.checkSource(spec, code));
      result = core.check(spec, code);
    }
    parentPort.postMessage({ id, result });
  } catch (err) {
    parentPort.postMessage({ id, error: String(err && err.stack || err) });
  }
});
