// "Delays & perturbers" tab: the time-delay table (likelihood.time_delays), the quasar
// image labels/positions (IMAGE_POSITIONS in run_alpaca.py) and a model-frame perturber
// catalogue (data/perturbers.json).
import { h, fmt, download, toast } from "./dom.js";
import { store, get, set, effective, setRun, subscribe, emit } from "./state.js";

const LETTERS = "ABCDEF";

// ---------------------------------------------------------------- time delays
function tdBlock() {
  return get("likelihood.time_delays") || null;
}

function labelsFromBlock(td) {
  const s = new Set();
  for (const k of Object.keys(td?.delays || {})) for (const c of k) s.add(c.toUpperCase());
  return [...s].sort();
}

export function renderDelays(root) {
  const ui = { n: 4, ref: store.run.REFERENCE_IMAGE || "A", asym: false };
  const td0 = tdBlock();
  if (td0) {
    const labs = labelsFromBlock(td0);
    if (labs.length >= 2) ui.n = Math.max(2, LETTERS.indexOf(labs[labs.length - 1]) + 1);
    if (td0.reference_image) ui.ref = td0.reference_image;
    ui.asym = Object.values(td0.delays || {}).some((v) => Array.isArray(v) && v.length === 3);
  }

  const card = h("section", { class: "cf-card cf-wide" });
  const useSw = h("button", { class: "cf-switch", type: "button", role: "switch" }, h("span"));
  useSw.addEventListener("click", () => {
    const on = !effective("likelihood.use_time_delays");
    set("likelihood.use_time_delays", on);
    if (on && !tdBlock()) writeBlock({});
  });
  const nChips = h("div", { class: "chips" });
  const refChips = h("div", { class: "chips" });
  const convSeg = h("div", { class: "chips" });
  const covSeg = h("div", { class: "chips" });
  const asymBtn = h("button", { class: "chip", type: "button" }, "asymmetric errors (+/−)");
  const table = h("div", { class: "cf-td-table" });
  const timeline = h("div", { class: "cf-timeline" });
  const body = h("div", { class: "cf-td-body" },
    h("div", { class: "cf-row" }, h("div", { class: "cf-row-head" }, h("span", { class: "cf-label" }, "Images")), nChips),
    h("div", { class: "cf-row" }, h("div", { class: "cf-row-head" }, h("span", { class: "cf-label" }, "Reference image"), h("code", { class: "cf-key" }, "REFERENCE_IMAGE")), refChips,
      h("div", { class: "cf-hint" }, "The delays are entered relative to this image (n − 1 of them).")),
    h("div", { class: "cf-row" }, h("div", { class: "cf-row-head" }, h("span", { class: "cf-label" }, "Sign convention"), h("code", { class: "cf-key" }, "convention")), convSeg,
      h("div", { class: "cf-hint" }, "Published delays (COSMOGRAIL, H0LiCOW, TDCOSMO) use Δt_XY = t_X − t_Y: key \"AB\" = t_A − t_B. Copy them as published.")),
    h("div", { class: "cf-row" }, h("div", { class: "cf-row-head" }, h("span", { class: "cf-label" }, "Errors"), h("code", { class: "cf-key" }, "covariance")), covSeg,
      h("div", { class: "cf-hint" }, "independent: each delay has its own error. shared_curves: a full table of all pairs measured from the same light curves.")),
    h("div", { class: "cf-row" }, asymBtn),
    table, timeline);
  card.append(h("header", {}, h("div", {}, h("h3", {}, "Time delays"), h("p", { class: "muted small" }, "Days between the arrivals of the quasar images. They measure the time-delay distance and H₀.")), useSw), body);

  const labels = () => LETTERS.slice(0, ui.n).split("");
  const pairs = () => {
    const L = labels();
    if ((tdBlock()?.covariance || "independent") === "shared_curves") {
      const out = [];
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) out.push(L[i] + L[j]);
      return out;
    }
    return L.filter((x) => x !== ui.ref).map((x) => ui.ref + x);
  };

  function writeBlock(delays) {
    const cur = tdBlock() || {};
    const block = { convention: cur.convention || "t_X - t_Y", delays, covariance: cur.covariance || "independent" };
    if (cur.pair_noise !== undefined) block.pair_noise = cur.pair_noise;
    if (ui.ref !== "A") block.reference_image = ui.ref;
    set("likelihood.time_delays", block);
  }
  function rebuildKeys() {
    const td = tdBlock();
    const old = td?.delays || {};
    const next = {};
    for (const k of pairs()) {
      if (old[k]) next[k] = old[k];
      else if (old[k[1] + k[0]]) next[k] = old[k[1] + k[0]].map((v, i) => (i === 0 ? -v : v));   // flipped pair
      else next[k] = ui.asym ? [0, 1, 1] : [0, 1];
    }
    writeBlock(next);
  }

  for (let n = 2; n <= 6; n++) {
    const b = h("button", { class: "chip", type: "button" }, `${n} (${LETTERS[0]}–${LETTERS[n - 1]})`);
    b.addEventListener("click", () => { ui.n = n; if (!labels().includes(ui.ref)) ui.ref = "A"; setRun("REFERENCE_IMAGE", ui.ref); rebuildKeys(); });
    nChips.append(b);
  }
  for (const [v, label] of [["t_X - t_Y", "t_X − t_Y (published)"], ["t_Y - t_X", "t_Y − t_X"]]) {
    const b = h("button", { class: "chip", type: "button", "data-v": v }, label);
    b.addEventListener("click", () => { const td = tdBlock() || { delays: {} }; set("likelihood.time_delays", { ...td, convention: v }); });
    convSeg.append(b);
  }
  for (const v of ["independent", "shared_curves"]) {
    const b = h("button", { class: "chip", type: "button", "data-v": v }, v);
    b.addEventListener("click", () => { const td = tdBlock() || { delays: {} }; set("likelihood.time_delays", { ...td, covariance: v }); rebuildKeys(); });
    covSeg.append(b);
  }
  asymBtn.addEventListener("click", () => {
    ui.asym = !ui.asym;
    const td = tdBlock();
    if (!td) return;
    const d = {};
    for (const [k, v] of Object.entries(td.delays || {})) d[k] = ui.asym ? [v[0], v[1], v[2] ?? v[1]] : [v[0], v.length === 3 ? +((v[1] + v[2]) / 2).toFixed(4) : v[1]];
    writeBlock(d);
  });

  function drawTable() {
    const td = tdBlock();
    table.replaceChildren();
    if (!td) { table.append(h("p", { class: "muted small" }, "No delays yet — switch time delays on.")); return; }
    const conv = td.convention || "t_X - t_Y";
    table.append(h("div", { class: "cf-td-row head muted small" }, h("span", {}, "pair"), h("span", {}, "meaning"), h("span", {}, "Δt [days]"), h("span", {}, ui.asym ? "+error" : "error"), ui.asym ? h("span", {}, "−error") : null));
    for (const [k, v] of Object.entries(td.delays || {})) {
      const [X, Y] = conv === "t_X - t_Y" ? [k[0], k[1]] : [k[1], k[0]];
      const ins = (ui.asym ? [0, 1, 2] : [0, 1]).map((i) => {
        const inp = h("input", { type: "number", class: "cf-num", step: "0.1", value: v[i] ?? "" });
        inp.addEventListener("change", () => {
          const d = { ...tdBlock().delays };
          const row = [...d[k]];
          row[i] = +inp.value;
          d[k] = row;
          writeBlock(d);
        });
        return inp;
      });
      table.append(h("div", { class: "cf-td-row" }, h("code", {}, `"${k}"`), h("span", { class: "muted small" }, `t_${X} − t_${Y}`), ...ins));
    }
  }

  function drawTimeline() {
    const td = tdBlock();
    timeline.replaceChildren();
    if (!td || (td.covariance || "independent") !== "independent") return;
    const conv = td.convention || "t_X - t_Y";
    // arrival times relative to the reference: t_X - t_ref
    const t = { [ui.ref]: 0 };
    for (const [k, v] of Object.entries(td.delays || {})) {
      if (!Array.isArray(v)) continue;
      const tXY = conv === "t_X - t_Y" ? v[0] : -v[0];      // t_k0 - t_k1
      if (k[0] === ui.ref) t[k[1]] = -tXY;
      else if (k[1] === ui.ref) t[k[0]] = tXY;
    }
    const vals = Object.values(t);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const span = hi - lo || 1;
    const W = 560, pad = 30;
    const svg = [`<svg viewBox="0 0 ${W} 74" width="100%" height="74" role="img" aria-label="arrival order"><line x1="${pad}" y1="40" x2="${W - pad}" y2="40" stroke="currentColor" stroke-width="1"/>`];
    const sorted = Object.entries(t).sort((a, b) => a[1] - b[1]);
    sorted.forEach(([lab, tv], i) => {
      const x = pad + ((tv - lo) / span) * (W - 2 * pad);
      const up = i % 2 === 0;
      svg.push(`<circle cx="${x}" cy="40" r="${lab === ui.ref ? 6 : 4.5}" fill="${lab === ui.ref ? "currentColor" : "var(--bg)"}" stroke="currentColor"/>`);
      svg.push(`<text x="${x}" y="${up ? 24 : 64}" text-anchor="middle" font-size="12">${lab}${lab === ui.ref ? "" : ` ${tv >= 0 ? "+" : ""}${fmt(tv, 3)} d`}</text>`);
    });
    svg.push(`<text x="${W - pad}" y="12" text-anchor="end" font-size="10" fill="var(--muted)">arrives later →</text></svg>`);
    timeline.innerHTML = svg.join("");
  }

  // image positions (IMAGE_POSITIONS)
  const posCard = h("section", { class: "cf-card cf-wide" });
  const posTable = h("div", { class: "cf-td-table" });
  const posClear = h("button", { class: "btn small", type: "button" }, "None (label clockwise from north)");
  posClear.addEventListener("click", () => setRun("IMAGE_POSITIONS", null));
  const posFill = h("button", { class: "btn small", type: "button" }, "Add a row per image");
  posFill.addEventListener("click", () => {
    const cur = { ...(store.run.IMAGE_POSITIONS || {}) };
    for (const l of labels()) if (!cur[l]) cur[l] = [0, 0];
    setRun("IMAGE_POSITIONS", cur);
  });
  posCard.append(h("header", {}, h("div", {}, h("h3", {}, "Quasar image labels"), h("p", { class: "muted small" }, "Approximate positions (arcsec from the frame centre, x = column, y = row) that give the detected images their published labels, so each delay lands on the right pair. Click them in the Data tab with the ★ tool."))),
    posTable, h("div", { class: "cf-btnrow" }, posFill, posClear));
  function drawPos() {
    posTable.replaceChildren();
    const P = store.run.IMAGE_POSITIONS;
    if (!P || !Object.keys(P).length) { posTable.append(h("p", { class: "muted small" }, "IMAGE_POSITIONS = None")); return; }
    posTable.append(h("div", { class: "cf-td-row head muted small" }, h("span", {}, "label"), h("span", {}, ""), h("span", {}, "x [″]"), h("span", {}, "y [″]"), h("span", {}, "")));
    for (const [lab, xy] of Object.entries(P)) {
      const ins = [0, 1].map((i) => {
        const inp = h("input", { type: "number", class: "cf-num", step: "0.001", value: xy[i] });
        inp.addEventListener("change", () => { const n = { ...store.run.IMAGE_POSITIONS }; n[lab] = [...n[lab]]; n[lab][i] = +inp.value; setRun("IMAGE_POSITIONS", n); });
        return inp;
      });
      const del = h("button", { class: "icon-btn", type: "button", title: "remove" }, "×");
      del.addEventListener("click", () => { const n = { ...store.run.IMAGE_POSITIONS }; delete n[lab]; setRun("IMAGE_POSITIONS", Object.keys(n).length ? n : null); });
      posTable.append(h("div", { class: "cf-td-row" }, h("code", {}, lab), h("span", {}, ""), ...ins, del));
    }
  }

  root.append(card, posCard);
  const refresh = () => {
    const on = !!effective("likelihood.use_time_delays");
    useSw.classList.toggle("on", on); useSw.setAttribute("aria-checked", on ? "true" : "false");
    body.classList.toggle("off", !on);
    const td = tdBlock();
    [...nChips.children].forEach((b, i) => b.classList.toggle("on", i + 2 === ui.n));
    refChips.replaceChildren(...labels().map((l) => {
      const b = h("button", { class: "chip" + (l === ui.ref ? " on" : ""), type: "button" }, l);
      b.addEventListener("click", () => { ui.ref = l; setRun("REFERENCE_IMAGE", l); rebuildKeys(); });
      return b;
    }));
    [...convSeg.children].forEach((b) => b.classList.toggle("on", (td?.convention || "t_X - t_Y") === b.dataset.v));
    [...covSeg.children].forEach((b) => b.classList.toggle("on", (td?.covariance || "independent") === b.dataset.v));
    asymBtn.classList.toggle("on", ui.asym);
    drawTable(); drawTimeline(); drawPos();
  };
  subscribe(refresh);
  refresh();
}

// ---------------------------------------------------------------- perturbers
export function newCatalogue() {
  const tE = get("mass.main.theta_E_prior");
  return {
    target: {
      z_lens: 0.5, z_source: 2.0,
      pix_scale_arcsec: effective("data.pix_scale"),
      npix: store.fits?.N ?? effective("data.cutout_size"),
      theta_E_main_arcsec: tE?.center ?? null,
      ra_deg: null, dec_deg: null,
    },
    perturbers: [],
  };
}

export function addPerturber(px, py) {
  if (!store.perturbers) store.perturbers = newCatalogue();
  const ids = store.perturbers.perturbers.map((p) => p.id);
  const id = ids.length ? Math.max(...ids) + 1 : 1;
  store.perturbers.perturbers.push({
    id, ra_deg: null, dec_deg: null,
    pixel_xy: [+px.toFixed(2), +py.toFixed(2)],
    redshift: { z: store.perturbers.target.z_lens, source: "assumed" },
    profile: { mass_model: "SIS", theta_E_arcsec: 0.1 },
    theta_E_prior_sigma: 0.05, theta_E_max_factor: 3.0, fix_positions: true,
    notes: "",
  });
  if (!get("mass.perturbers.path")) set("mass.perturbers.path", "data/perturbers.json");
  emit("perturbers");
  return id;
}

export function catalogueText() {
  return JSON.stringify(store.perturbers, null, 1) + "\n";
}

export function renderPerturbers(root) {
  const card = h("section", { class: "cf-card cf-wide" });
  const sw = h("button", { class: "cf-switch", type: "button", role: "switch" }, h("span"));
  sw.addEventListener("click", () => {
    if (store.perturbers) { store.perturbers = null; if (get("mass.perturbers.path") === "data/perturbers.json") set("mass.perturbers.path", null); emit("perturbers"); }
    else { store.perturbers = newCatalogue(); set("mass.perturbers.path", "data/perturbers.json"); emit("perturbers"); }
  });
  const tgt = h("div", { class: "cf-pert-target" });
  const list = h("div", { class: "cf-pert-list" });
  const add = h("button", { class: "btn small", type: "button" }, "+ perturber");
  add.addEventListener("click", () => { const n = store.perturbers?.target?.npix || 101; addPerturber((n - 1) / 2 + 20, (n - 1) / 2); });
  const dl = h("button", { class: "btn small", type: "button" }, "Download perturbers.json");
  dl.addEventListener("click", () => download("perturbers.json", catalogueText(), "application/json"));
  const load = h("input", { type: "file", accept: ".json,application/json", hidden: true });
  const loadBtn = h("button", { class: "btn small", type: "button" }, "Load a catalogue…");
  loadBtn.addEventListener("click", () => load.click());
  load.addEventListener("change", async () => {
    try {
      const j = JSON.parse(await load.files[0].text());
      if (!j.target || !Array.isArray(j.perturbers)) throw new Error("needs a target block and a perturbers list");
      store.perturbers = j;
      set("mass.perturbers.path", "data/perturbers.json");
      emit("perturbers");
      toast(`Loaded ${j.perturbers.length} perturber(s)`);
    } catch (e) { toast("Not a perturber catalogue: " + e.message, "bad"); }
    load.value = "";
  });
  const body = h("div", {}, tgt, list, h("div", { class: "cf-btnrow" }, add, loadBtn, load, dl));
  card.append(h("header", {}, h("div", {}, h("h3", {}, "Perturbers"), h("p", { class: "muted small" },
    "Nearby galaxies that deflect light too. Each gets a singular isothermal sphere (SIS) with a rough Einstein radius; positions are pixels of the exported frame (model-frame catalogue: no RA/Dec needed). Click them in the Data tab with the ✦ tool. Mask their light in the likelihood mask.")), sw), body);
  root.append(card);

  const num = (obj, key, step, onSet) => {
    const inp = h("input", { type: "number", class: "cf-num", step, value: obj[key] ?? "" });
    inp.addEventListener("change", () => { obj[key] = inp.value === "" ? null : +inp.value; if (onSet) onSet(); emit("perturbers"); });
    return inp;
  };

  function refresh() {
    const P = store.perturbers;
    sw.classList.toggle("on", !!P); sw.setAttribute("aria-checked", P ? "true" : "false");
    body.hidden = !P;
    if (!P) return;
    const t = P.target;
    tgt.replaceChildren(
      h("label", {}, h("span", { class: "muted small" }, "z lens"), num(t, "z_lens", 0.001)),
      h("label", {}, h("span", { class: "muted small" }, "z source"), num(t, "z_source", 0.001)),
      h("label", {}, h("span", { class: "muted small" }, "pixel scale ″"), num(t, "pix_scale_arcsec", 0.0001)),
      h("label", {}, h("span", { class: "muted small" }, "frame npix"), num(t, "npix", 2)),
      h("label", {}, h("span", { class: "muted small" }, "main θE ″"), num(t, "theta_E_main_arcsec", 0.01)));
    list.replaceChildren();
    if (!P.perturbers.length) list.append(h("p", { class: "muted small" }, "No perturbers yet."));
    else list.append(h("div", { class: "cf-pert-row head muted small" }, ["id", "x px", "y px", "offset", "z", "model", "θE ″", "θE σ", "max ×", "fixed", ""].map((s) => h("span", {}, s))));
    const half = ((t.npix || 1) - 1) / 2;
    for (const p of P.perturbers) {
      const off = h("span", { class: "muted small" });
      const upd = () => {
        const dx = (p.pixel_xy[0] - half) * (t.pix_scale_arcsec || 0), dy = (p.pixel_xy[1] - half) * (t.pix_scale_arcsec || 0);
        off.textContent = `${Math.hypot(dx, dy).toFixed(2)}″`;
      };
      upd();
      const xy = [0, 1].map((i) => {
        const inp = h("input", { type: "number", class: "cf-num", step: 0.1, value: p.pixel_xy[i] });
        inp.addEventListener("change", () => { p.pixel_xy[i] = +inp.value; upd(); emit("perturbers"); });
        return inp;
      });
      p.redshift = p.redshift || { z: t.z_lens };
      p.profile = p.profile || p.SIS_profile || { mass_model: "SIS", theta_E_arcsec: 0.1 };
      const model = h("select", { class: "btn small cf-select" }, ["SIS", "SIE", "EPL"].map((m) => h("option", { value: m }, m)));
      model.value = p.profile.mass_model || "SIS";
      model.addEventListener("change", () => { p.profile.mass_model = model.value; emit("perturbers"); });
      const fix = h("input", { type: "checkbox" });
      fix.checked = p.fix_positions !== false;
      fix.addEventListener("change", () => { p.fix_positions = fix.checked; emit("perturbers"); });
      const del = h("button", { class: "icon-btn", type: "button", title: "remove" }, "×");
      del.addEventListener("click", () => { P.perturbers.splice(P.perturbers.indexOf(p), 1); emit("perturbers"); });
      list.append(h("div", { class: "cf-pert-row" }, h("code", {}, p.id), ...xy, off, num(p.redshift, "z", 0.001),
        model, num(p.profile, "theta_E_arcsec", 0.01), num(p, "theta_E_prior_sigma", 0.01), num(p, "theta_E_max_factor", 0.5), fix, del));
    }
  }
  subscribe((o) => { if (["perturbers", "preset", "import", "fits"].some((x) => o.has(x))) refresh(); });
  refresh();
}
