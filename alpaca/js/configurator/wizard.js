// Guided setup: five questions, then a preset with the answers applied.
import { h, toast } from "./dom.js";
import { store, loadPreset, setMany, setRun, get } from "./state.js";
import { newCatalogue } from "./delays.js";

const ART = {
  quasar: '<svg viewBox="0 0 120 90" width="120" height="90" fill="none" stroke="currentColor" stroke-width="1.3"><ellipse cx="60" cy="45" rx="7" ry="5.5" fill="currentColor" opacity=".85"/><path d="M28 50a34 30 0 0 1 22-32M70 15a34 30 0 0 1 22 28M90 58a34 30 0 0 1-24 20M50 77a34 30 0 0 1-22-18" stroke-width="2.4" opacity=".55"/><circle cx="31" cy="38" r="4" fill="currentColor"/><circle cx="84" cy="24" r="4" fill="currentColor"/><circle cx="92" cy="57" r="3.2" fill="currentColor"/><circle cx="46" cy="76" r="3.6" fill="currentColor"/></svg>',
  galaxy: '<svg viewBox="0 0 120 90" width="120" height="90" fill="none" stroke="currentColor" stroke-width="1.3"><ellipse cx="60" cy="45" rx="7" ry="5.5" fill="currentColor" opacity=".85"/><path d="M27 52a34 31 0 0 1 9-27M44 18a34 31 0 0 1 40 2M93 40a34 31 0 0 1-14 33M68 77a34 31 0 0 1-30-8" stroke-width="5" stroke-linecap="round" opacity=".6"/></svg>',
};

const BANDS = [
  ["NIRCam short wave", "F070W–F212N", 0.031228698402951588],
  ["NIRCam long wave", "F250M–F480M", 0.06300817082234353],
  ["HST WFC3/IR", "drizzled 0.08″", 0.08],
  ["HST ACS / WFC3-UVIS", "0.04–0.05″", 0.05],
];
const odd = (v) => { v = Math.round(v); return v % 2 ? v : v + 1; };

export function openWizard({ onDone }) {
  const a = { kind: null, pix: null, thetaE: 1.0, delays: false, nImages: 4, perturbers: false };
  let step = 0;
  const dlg = h("dialog", { class: "cf-wizard", "aria-label": "guided setup" });
  const body = h("div", { class: "cf-wiz-body" });
  const dots = h("div", { class: "cf-wiz-dots" });
  const back = h("button", { class: "btn", type: "button" }, "Back");
  const next = h("button", { class: "btn primary", type: "button" }, "Next");
  const close = h("button", { class: "icon-btn cf-wiz-close", type: "button", "aria-label": "close" }, "×");
  dlg.append(close, dots, body, h("div", { class: "cf-btnrow cf-wiz-nav" }, back, next));
  document.body.append(dlg);
  close.addEventListener("click", () => { dlg.close(); dlg.remove(); });
  dlg.addEventListener("cancel", () => dlg.remove());

  const steps = () => [
    {
      q: "What do you see around the lens galaxy?",
      ok: () => a.kind,
      render: () => h("div", { class: "cf-wiz-tiles" }, [["quasar", "Bright dots (2 or 4) on top of arcs", "a lensed quasar"], ["galaxy", "Arcs or a ring, no bright dots", "a galaxy–galaxy lens"]].map(([k, t, d]) => {
        const b = h("button", { class: "cf-wiz-tile" + (a.kind === k ? " on" : ""), type: "button" }, h("span", { html: ART[k] }), h("b", {}, t), h("span", { class: "muted small" }, d));
        b.addEventListener("click", () => { a.kind = k; draw(); });
        return b;
      })),
    },
    {
      q: "Which camera and band?",
      ok: () => a.pix > 0,
      render: () => {
        const inp = h("input", { type: "number", class: "cf-num", step: 0.0001, value: a.pix ?? "" });
        inp.addEventListener("change", () => { a.pix = +inp.value; draw(); });
        return h("div", {},
          h("div", { class: "cf-wiz-list" }, BANDS.map(([n, d, p]) => {
            const b = h("button", { class: "chip" + (a.pix === p ? " on" : ""), type: "button" }, `${n} · ${d} · ${p.toFixed(3)}″`);
            b.addEventListener("click", () => { a.pix = p; draw(); });
            return b;
          })),
          h("label", { class: "cf-inline" }, h("span", { class: "muted small" }, "or the pixel scale of your image:"), inp, h("span", { class: "muted small" }, "″/px")),
          h("p", { class: "muted small" }, store.fits?.pix ? `Your FITS file says ${store.fits.pix.scale.toFixed(6)}″ (from ${store.fits.pix.source}); that value is kept.` : "The Data tab reads it from the FITS header anyway."));
      },
    },
    {
      q: "Roughly how big is the Einstein radius?",
      ok: () => a.thetaE > 0,
      render: () => {
        const out = h("b", {});
        const sug = h("p", { class: "muted small" });
        const r = h("input", { type: "range", min: 0.3, max: 3.5, step: 0.05, value: a.thetaE, "aria-label": "Einstein radius" });
        const pic = h("div", { class: "cf-wiz-ring" });
        const upd = () => {
          out.textContent = `θE ≈ ${a.thetaE.toFixed(2)}″`;
          const M = odd(Math.max(4, 5.5 * a.thetaE) / a.pix);
          sug.textContent = `→ model cutout ${M} px (${(M * a.pix).toFixed(1)}″), frame for the lens-light refit about ${odd(2.2 * M)} px. Half the distance between opposite images or the ring radius is fine.`;
          const R = 12 + 9 * a.thetaE;
          pic.innerHTML = `<svg viewBox="0 0 120 90" width="120" height="90" fill="none" stroke="currentColor"><ellipse cx="60" cy="45" rx="5" ry="4" fill="currentColor"/><circle cx="60" cy="45" r="${R}" stroke-dasharray="2 3"/><path d="M60 45h${R}" /></svg>`;
        };
        r.addEventListener("input", () => { a.thetaE = +r.value; upd(); });
        upd();
        return h("div", { class: "cf-wiz-te" }, pic, h("div", {}, out, r, sug));
      },
    },
    ...(a.kind === "quasar" ? [{
      q: "Are time delays measured for this quasar?",
      ok: () => true,
      render: () => h("div", { class: "cf-wiz-list" },
        [[false, "No (or not yet)"], [true, "Yes — I will type them in"]].map(([v, t]) => {
          const b = h("button", { class: "chip" + (a.delays === v ? " on" : ""), type: "button" }, t);
          b.addEventListener("click", () => { a.delays = v; draw(); });
          return b;
        }),
        h("span", { class: "muted small" }, "How many images?"),
        [2, 4].map((n) => {
          const b = h("button", { class: "chip" + (a.nImages === n ? " on" : ""), type: "button" }, `${n} images`);
          b.addEventListener("click", () => { a.nImages = n; draw(); });
          return b;
        })),
    }] : []),
    {
      q: "Other galaxies within ~10″ of the lens?",
      ok: () => true,
      render: () => h("div", { class: "cf-wiz-list" },
        [[false, "No, it is alone"], [true, "Yes — they may deflect light too"]].map(([v, t]) => {
          const b = h("button", { class: "chip" + (a.perturbers === v ? " on" : ""), type: "button" }, t);
          b.addEventListener("click", () => { a.perturbers = v; draw(); });
          return b;
        }),
        h("p", { class: "muted small" }, "You will click them in the Data tab; their light goes into the mask, their mass into a perturber catalogue.")),
    },
  ];

  function finish() {
    loadPreset(a.kind);
    const ps = store.fits?.pix?.scale || a.pix;     // a loaded image has the last word
    const M = odd(Math.max(4, 5.5 * a.thetaE) / ps);
    const entries = [["data.pix_scale", a.pix], ["data.cutout_size", M], ["likelihood.astrometry_mode", "image_plane"]];
    if (a.kind === "galaxy" || get("mass.main.theta_E_prior")) entries.push(["mass.main.theta_E_prior", { center: +a.thetaE.toFixed(2), sigma: 10.0 }]);
    if (a.kind === "quasar") {
      entries.push(["likelihood.use_time_delays", a.delays]);
      if (a.delays) {
        const L = "ABCD".slice(0, a.nImages).split("");
        const d = {};
        for (const x of L.slice(1)) d["A" + x] = [0, 1];
        entries.push(["likelihood.time_delays", { convention: "t_X - t_Y", delays: d, covariance: "independent" }]);
      } else entries.push(["likelihood.time_delays", null]);
    }
    if (!a.perturbers) entries.push(["mass.perturbers.path", null]);
    setMany(entries, "preset");
    setRun("IMAGE_POSITIONS", null);
    setRun("REFERENCE_IMAGE", "A");
    store.perturbers = null;
    if (a.perturbers) { setMany([["mass.perturbers.path", "data/perturbers.json"]], "preset"); store.perturbers = newCatalogue(); }
    dlg.close(); dlg.remove();
    toast(`Set up for ${a.kind === "quasar" ? "a lensed quasar" : "a galaxy–galaxy lens"}. Next: load your FITS.`);
    onDone && onDone(a);
  }

  function draw() {
    const S = steps();
    step = Math.min(step, S.length - 1);
    const s = S[step];
    dots.replaceChildren(...S.map((_, i) => h("span", { class: i === step ? "on" : i < step ? "done" : "" })));
    body.replaceChildren(h("div", { class: "cf-wiz-k" }, `question ${step + 1} of ${S.length}`), h("h2", {}, s.q), s.render());
    back.disabled = step === 0;
    next.textContent = step === S.length - 1 ? "Build my config" : "Next";
    next.disabled = !s.ok();
  }
  back.addEventListener("click", () => { step = Math.max(0, step - 1); draw(); });
  next.addEventListener("click", () => {
    const S = steps();
    if (!S[step].ok()) return;
    if (step === 1 && !a.pix) return;
    if (step === S.length - 1) finish(); else { step++; draw(); }
  });
  a.pix = store.fits?.pix?.scale || get("data.pix_scale") || BANDS[0][2];
  draw();
  dlg.showModal();
}
