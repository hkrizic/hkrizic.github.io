// The unblinding ceremony: confirm scope, animate, reveal H0, then continue with unblinded results.
import { el, button, number, textInput, badge } from "./widgets.js";
import { summarize } from "../core/stats.js";

const MARK = (size) => el("img", { src: "assets/logo-mark-large.png", alt: "ALPACA", class: "mark", style: { height: size + "px" } });

export function openUnblindScreen(app, run) {
  const overlay = el("div", { class: "unblind-screen" });
  const box = el("div", { class: "unblind-box" });
  overlay.append(box);
  document.body.append(overlay);
  const close = () => { overlay.remove(); window.removeEventListener("keydown", onKey); };
  let revealed = false;
  const onKey = (e) => { if (e.key === "Escape" && (revealed || step === "setup")) { close(); if (revealed) app.afterUnblind(run); } };
  window.addEventListener("keydown", onKey);
  let step = "setup";

  // ------------------------------------------------------------ step 1: setup
  const zl0 = run.catalog?.target?.z_lens ?? null, zs0 = run.catalog?.target?.z_source ?? null;
  const cfg = { zl: zl0, zs: zs0, Om: run.config?.mass?.perturbers?.cosmology?.Om0 ?? 0.3, scope: "session", download: false, key: "" };
  const canWrite = !!run.index.handle;
  const status = el("div", { class: "muted small" });
  const keyRow = run.hasKey ? el("div", { class: "muted small" }, `Blinding key: loaded from ${run.keySource || "input"}.`) : el("div", { class: "ctl-row" }, textInput("", (v) => { cfg.key = v; }, { placeholder: "blinding key (ALPACA_BLINDING_KEY)", width: 300, type: "password" }), run.features.keyFile ? button("use key file in run", async () => { cfg.key = await run.keyFileContents(); status.textContent = "key file read"; }, { small: true }) : null);
  const scopeRadio = (value, label, desc, disabled = false) => {
    const input = el("input", { type: "radio", name: "unblind-scope", value });
    input.checked = cfg.scope === value; input.disabled = disabled;
    input.addEventListener("change", () => { if (input.checked) cfg.scope = value; });
    return el("label", { class: "scope" + (disabled ? " disabled" : "") }, input, el("span", {}, el("b", {}, label), el("div", { class: "muted small" }, desc)));
  };
  box.append(
    el("div", { class: "unblind-head" }, MARK(84), el("div", {}, el("h2", {}, "Unblind run ", badge(run.label, "label"), " ", run.name), el("div", { class: "muted" }, "TDCOSMO blinding will be lifted. Do this only once the collaboration has agreed to unblind."))),
    el("div", { class: "unblind-cols" },
      el("div", {},
        el("h4", {}, "Key"), keyRow,
        el("h4", {}, "Cosmology for H₀"),
        el("div", { class: "ctl-row" }, el("span", { class: "ctl-label" }, "z_lens"), number(cfg.zl, (v) => { cfg.zl = v; }, { step: 0.0001, width: 90 }), el("span", { class: "ctl-label" }, "z_source"), number(cfg.zs, (v) => { cfg.zs = v; }, { step: 0.0001, width: 90 }), el("span", { class: "ctl-label" }, "Ωm"), number(cfg.Om, (v) => { cfg.Om = v; }, { step: 0.01, width: 70 })),
        el("div", { class: "muted small" }, "Flat ΛCDM; D_Δt ∝ 1/H₀ at fixed Ωm."),
      ),
      el("div", {},
        el("h4", {}, "Scope"),
        scopeRadio("session", "This session only", "Absolute values are restored in memory and every panel shows them until you reload. Nothing is written."),
        scopeRadio("folder", "Also write into the run folder", canWrite ? "Writes 05_posterior/samples/unblinded/posterior_samples.npz and unblinding_record.json, exactly like python -m alpaca.unblind." : "Needs the folder to be opened with “Open run folder” (File System Access) so the browser may write into it. Dropped or URL runs cannot be written.", !canWrite),
        scopeRadio("download", "Download the unblinded files", "posterior_samples.npz + unblinding_record.json are saved through the browser; put them into 05_posterior/samples/unblinded/ yourself."),
      ),
    ),
    status,
    el("div", { class: "unblind-actions" }, button("Cancel", close), button("Unblind", () => start(), { kind: "primary" })),
  );

  // ------------------------------------------------------------ step 2: ceremony
  async function start() {
    try {
      if (!run.hasKey) { status.textContent = "checking key…"; await run.unblind(cfg.key); }
    } catch (e) { status.textContent = e.message; return; }
    if (cfg.zl == null || cfg.zs == null) { status.textContent = "z_lens and z_source are needed to compute H₀."; return; }
    step = "ceremony";
    box.innerHTML = "";
    box.classList.add("ceremony");
    const orbit = MARK(230);
    orbit.classList.add("spin");
    const title = el("div", { class: "cer-title" }, "UNBLINDING");
    const digitsEl = el("div", { class: "cer-digits" });
    const unit = el("div", { class: "cer-unit" }, "H₀  km s⁻¹ Mpc⁻¹");
    const sub = el("div", { class: "cer-sub" });
    const bar = el("div", { class: "cer-bar" }, el("span"));
    const closeBtn = el("button", { class: "cer-close", title: "Continue with the unblinded results (Esc)" }, "✕");
    closeBtn.style.display = "none";
    box.append(closeBtn, orbit, title, digitsEl, unit, sub, bar);

    // compute while the animation runs
    const work = (async () => {
      await run.unblindSession();
      const h0 = await run.h0Samples({ zl: cfg.zl, zs: cfg.zs, Om: cfg.Om });
      const st = summarize(h0.samples);
      const dd = summarize(h0.ddt);
      let written = null;
      if (cfg.scope === "folder") written = await run.writeUnblinded({ h0: st, ddt: dd, zl: cfg.zl, zs: cfg.zs, Om: cfg.Om });
      if (cfg.scope === "download") written = await run.downloadUnblinded({ h0: st, ddt: dd, zl: cfg.zl, zs: cfg.zs, Om: cfg.Om });
      return { st, dd, written };
    })();

    const T_SPIN = 3600, T_SETTLE = 1400;
    const t0 = performance.now();
    const template = "00.00";
    let result = null;
    work.then((r) => { result = r; }).catch((e) => { result = { error: e }; });
    const frame = () => {
      const t = performance.now() - t0;
      bar.firstChild.style.width = Math.min(100, (100 * t) / (T_SPIN + T_SETTLE)) + "%";
      if (t < T_SPIN || !result) {
        digitsEl.textContent = template.replace(/\d/g, () => String(Math.floor(Math.random() * 10)));
        requestAnimationFrame(frame);
        return;
      }
      if (result.error) { digitsEl.textContent = "—"; sub.textContent = "Unblinding failed: " + (result.error.message || result.error); closeBtn.style.display = ""; revealed = true; return; }
      const final = result.st.median.toFixed(2);
      const k = Math.min(final.length, Math.floor(((t - T_SPIN) / T_SETTLE) * (final.length + 1)));
      digitsEl.textContent = final.slice(0, k) + final.slice(k).replace(/\d/g, () => String(Math.floor(Math.random() * 10)));
      if (k < final.length) { requestAnimationFrame(frame); return; }
      // revealed
      digitsEl.textContent = final;
      orbit.classList.remove("spin");
      box.classList.add("revealed");
      title.textContent = "UNBLINDED";
      const st = result.st, dd = result.dd;
      sub.append(
        el("div", { class: "cer-err" }, `+${(st.hi68 - st.median).toFixed(2)}  −${(st.median - st.lo68).toFixed(2)}  (68 %)   ·   ${(100 * st.std / st.median).toFixed(2)} % precision`),
        el("div", { class: "cer-line" }, `D_Δt = ${dd.median.toFixed(1)} +${(dd.hi68 - dd.median).toFixed(1)} −${(dd.median - dd.lo68).toFixed(1)} Mpc   ·   z_l = ${cfg.zl}, z_s = ${cfg.zs}, Ωm = ${cfg.Om}`),
        el("div", { class: "cer-line muted" }, result.written ? `Written: ${result.written}` : "Session only — nothing was written."),
        el("div", { class: "cer-line muted" }, "Press ✕ or Esc to analyse the unblinded results."),
      );
      closeBtn.style.display = "";
      revealed = true;
    };
    closeBtn.addEventListener("click", () => { close(); app.afterUnblind(run); });
    requestAnimationFrame(frame);
  }
}
