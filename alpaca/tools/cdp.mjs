// Minimal Chrome DevTools Protocol driver for headless smoke tests (no npm deps).
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function launch({ port = 9333, width = 1600, height = 1100 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cdp-"));
  const proc = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${width},${height}`,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let err = "";
  proc.stderr.on("data", (d) => { err += d; });
  let targets = null;
  for (let i = 0; i < 100; i++) {
    try { targets = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()); if (targets.length) break; } catch (e) { /* retry */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!targets) { proc.kill(); throw new Error("Chrome did not start: " + err); }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const client = new Client(ws);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");
  await client.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  client.close = () => { try { ws.close(); } catch (e) { /* ignore */ } proc.kill(); setTimeout(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* ignore */ } }, 500); };
  return client;
}

class Client {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.console = [];
    this.loaded = false;
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) { const p = this.pending.get(m.id); this.pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
      if (m.method === "Runtime.consoleAPICalled") this.console.push({ type: m.params.type, text: m.params.args.map((a) => a.value ?? a.description ?? "").join(" ") });
      if (m.method === "Runtime.exceptionThrown") this.console.push({ type: "exception", text: m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text });
      if (m.method === "Log.entryAdded") this.console.push({ type: m.params.entry.level, text: m.params.entry.text + (m.params.entry.url ? " @" + m.params.entry.url : "") });
      if (m.method === "Page.loadEventFired") this.loaded = true;
    };
  }
  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  async navigate(url) { this.loaded = false; await this.send("Page.navigate", { url }); for (let i = 0; i < 200 && !this.loaded; i++) await sleep(50); }
  async evaluate(expression, { awaitPromise = true } = {}) {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true });
    if (r.exceptionDetails) throw new Error("evaluate: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
  async screenshot(file, { fullPage = false, clip = null } = {}) {
    const params = { format: "png", captureBeyondViewport: fullPage };
    if (clip) params.clip = { ...clip, scale: 1 };
    const r = await this.send("Page.captureScreenshot", params);
    fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    return file;
  }
  errors() { return this.console.filter((c) => c.type === "error" || c.type === "exception" || c.type === "warning"); }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
