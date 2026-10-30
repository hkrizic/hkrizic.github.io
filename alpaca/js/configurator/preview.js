// The live config.json preview (changes vs the shipped config highlighted) and the
// validation messages, in the right-hand column.
import { h, download, copyText } from "./dom.js";
import { store, jsonLines, configText, diffVsShipped, leaves, subscribe } from "./state.js";
import { validate } from "./validate.js";

export function renderPreview(root, { jump }) {
  const count = h("span", { class: "muted small" });
  const onlyChanged = h("button", { class: "chip", type: "button", title: "show only the changed lines" }, "changes only");
  const pre = h("pre", { class: "cf-json-pre", tabindex: 0, "aria-label": "config.json preview" });
  const msgs = h("div", { class: "cf-msgs" });
  const dl = h("button", { class: "btn primary small", type: "button" }, "Download config.json");
  const cp = h("button", { class: "btn small", type: "button" }, "Copy");
  dl.addEventListener("click", () => download("config.json", configText(), "application/json"));
  cp.addEventListener("click", () => copyText(configText()));
  let changedOnly = false;
  onlyChanged.addEventListener("click", () => { changedOnly = !changedOnly; onlyChanged.classList.toggle("on", changedOnly); refresh(); });

  root.append(
    h("div", { class: "cf-prev-head" }, h("div", {}, h("div", { class: "cf-prev-title" }, "config.json"), count), h("div", { class: "cf-btnrow" }, cp, dl)),
    msgs,
    h("div", { class: "cf-prev-tools" }, onlyChanged, h("span", { class: "muted small" }, h("span", { class: "cf-swatch chg" }), " changed ", h("span", { class: "cf-swatch add" }), " new / not set")),
    pre);

  pre.addEventListener("click", (e) => {
    const line = e.target.closest("[data-path]");
    if (line) jump(line.dataset.path);
  });
  msgs.addEventListener("click", (e) => {
    const m = e.target.closest("[data-path]");
    if (m) jump(m.dataset.path);
  });

  function refresh() {
    const { changed, added, missing } = diffVsShipped();
    const chg = new Set(changed), add = new Set(added);
    pre.replaceChildren();
    if (changedOnly) {
      // a flat list: key, value, shipped value
      const flat = leaves(store.cfg), ship = leaves(store.defaults.shipped);
      for (const p of [...changed, ...added]) {
        const was = p in ship ? `   (shipped ${JSON.stringify(ship[p])})` : "   (new)";
        pre.append(h("span", { class: "cf-line " + (chg.has(p) ? "chg" : "add"), "data-path": p }, `${p}: ${JSON.stringify(flat[p])}${was}\n`));
      }
      for (const p of missing) pre.append(h("span", { class: "cf-line add", "data-path": p }, `${p}: not set (code default)\n`));
      if (!changed.length && !added.length && !missing.length) pre.append("identical to the shipped config\n");
    } else {
      for (const l of jsonLines(store.cfg)) {
        const mark = l.path ? (chg.has(l.path) ? "chg" : add.has(l.path) ? "add" : "") : "";
        pre.append(h("span", { class: "cf-line " + mark, "data-path": l.path || null }, l.text + "\n"));
      }
    }
    const n = changed.length + added.length;
    const name = { imported: "imported config", galaxy: "galaxy–galaxy preset", quasar: "lensed-quasar preset" }[store.preset] || store.preset;
    count.textContent = `${name} · ${n} change${n === 1 ? "" : "s"} vs shipped${missing.length ? ` · ${missing.length} shipped key(s) not set` : ""}`;
    const v = validate(store.fits && store.fits.cx !== null ? store.fits : null);
    msgs.replaceChildren(...v.map((m) => h("div", { class: "cf-msg " + m.level, "data-path": m.path || null },
      h("span", { class: "cf-msg-k" }, m.level === "error" ? "fix" : m.level === "warn" ? "check" : "note"), h("span", {}, m.msg))));
    if (!v.some((m) => m.level === "error")) msgs.prepend(h("div", { class: "cf-msg ok" }, h("span", { class: "cf-msg-k" }, "ok"), h("span", {}, "Valid — ready to export.")));
  }
  subscribe(refresh);
  refresh();
}
