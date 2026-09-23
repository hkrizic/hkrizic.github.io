// Promise wrapper around the parsing/rendering worker.
export class WorkerClient {
  constructor() {
    this.worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    this.pending = new Map();
    this.seq = 0;
    this.worker.onmessage = (e) => {
      const { id, ok, result, error } = e.data;
      const p = this.pending.get(id);
      if (!p) return;
      this.pending.delete(id);
      if (ok) p.resolve(result); else p.reject(new Error(error));
    };
    this.worker.onerror = (e) => { console.error("worker error", e); };
  }

  call(op, payload = {}, transfer = []) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, op, payload }, transfer);
    });
  }
}
