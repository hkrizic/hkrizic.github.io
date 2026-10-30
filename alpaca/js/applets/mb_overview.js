// Multiband run at a glance (ALPACA >= 0.6.0 run_multiband.py): which parameters are shared and which are per band,
// how well each band is fitted alone and jointly (chi2 per band and image region), the joint polish and sampling,
// how far each band ALONE would put the lens from the joint solution (in joint posterior sd), and ALPACA's own joint
// figures. Everything here is blinding-safe: shifts and widths only, D_dt never appears.
import { el, table, badge, kv, fmtSec, section, row, select, button } from "../ui/widgets.js";
import { Plot } from "../ui/plot.js";
import { runOf, runRow, busy, fmtNum } from "./common.js";
import { summarize } from "../core/stats.js";
import { THEME, alpha } from "../ui/theme.js";

const card = (title, ...children) => el("div", { class: "card" }, el("h3", {}, title), ...children);
const MASS_LABEL = { lens_theta_E: "θ_E", lens_gamma: "γ (slope)", lens_e1: "e1", lens_e2: "e2", lens_gamma1: "γ_ext,1", lens_gamma2: "γ_ext,2", lens_center_x: "centre x", lens_center_y: "centre y" };
// grey levels per band (monochrome theme), darkest = longest wavelength
const bandColor = (i, n) => (n <= 1 ? THEME.fg : `rgb(${Math.round(170 * (1 - i / (n - 1)))},${Math.round(170 * (1 - i / (n - 1)))},${Math.round(170 * (1 - i / (n - 1)))})`);
const MARKERS = ["circle", "square", "diamond", "triangle"];

function marker(p, x, y, kind, color, r = 4.5) { markerPx(p.ctx, p.X(x), p.Y(y), kind, color, r); }

function markerPx(ctx, X, Y, kind, color, r = 4.5) {
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = THEME.fg; ctx.lineWidth = 0.8; ctx.beginPath();
  if (kind === "square") ctx.rect(X - r, Y - r, 2 * r, 2 * r);
  else if (kind === "diamond") { ctx.moveTo(X, Y - r * 1.3); ctx.lineTo(X + r * 1.3, Y); ctx.lineTo(X, Y + r * 1.3); ctx.lineTo(X - r * 1.3, Y); ctx.closePath(); }
  else if (kind === "triangle") { ctx.moveTo(X, Y - r * 1.3); ctx.lineTo(X + r * 1.2, Y + r); ctx.lineTo(X - r * 1.2, Y + r); ctx.closePath(); }
  else ctx.arc(X, Y, r, 0, 2 * Math.PI);
  ctx.fill(); ctx.stroke(); ctx.restore();
}

// "group mode sites description" rows of sharing.txt -> {group: sites}
function sharingCounts(txt) {
  const out = {};
  for (const line of (txt || "").split("\n")) { const m = /^(\w+)\s+(shared|per_band)\s+(\d+)\s/.exec(line); if (m) out[m[1]] = +m[3]; }
  return out;
}

function bandGeometry(mb, band) {
  const b = mb.config?.multiband?.bands;
  const e = Array.isArray(b) ? b.find((x) => x.name === band) : b?.[band];
  return { pix: e?.pix_scale ?? null, cutout: e?.cutout_size ?? null };
}

export default {
  id: "mboverview", title: "Multiband: bands & sharing", icon: "◫", description: "Multiband runs: what is shared between bands, χ² per band and image region (alone vs joint), frame offsets, the joint polish and sampling, each band's own lens vs the joint lens in joint-posterior σ, and ALPACA's joint figures.", defaultSize: "xl",
  available: (run) => !!run.mb,
  create(ctx, state, panel) {
    const body = el("div");
    panel.body.append(body);
    let plots = [];
    const addPlot = (parent, h = 230) => { const w = el("div", { class: "plot-wrap", style: { height: h + "px", minHeight: h + "px", flex: "none" } }); parent.append(w); const p = new Plot(w, { margin: { l: 96, r: 16, t: 10, b: 34 } }); plots.push(p); return p; };

    const load = () => busy(panel, "reading the joint products", async () => {
      plots.forEach((p) => p.destroy()); plots = [];
      body.innerHTML = "";
      const run = runOf(ctx, state);
      const mb = run.mb;
      if (!mb) { body.append(el("div", { class: "info" }, "Not a multiband run.")); return; }
      const S = mb.summary || {};
      const J = S.joint_map || {};
      const bands = mb.bandsByWavelength;
      const scal = await mb.jointScalars().catch((e) => { console.warn("joint posterior", e); return null; });
      const counts = sharingCounts(mb.sharingTxt);
      const cards = el("div", { class: "cards" });
      body.append(cards);

      // -------------------------------------------------- bands
      const bRows = bands.map((b) => {
        const g = bandGeometry(mb, b);
        const alone = S.single_band_alone?.[b]?.chi2_red, start = S.start?.chi2_red?.[b], joint = J.chi2_red?.[b];
        const bcol = scal?.columns[`${b}/psf_error_b`];
        const off = J.frame_offsets_mas?.[b];
        return [
          el("b", {}, b), mb.wavelength(b) != null ? mb.wavelength(b).toFixed(2) : "–",
          g.pix ? g.pix.toFixed(4) : "–", g.cutout ?? "–", J.n_pix?.[b] ?? "–",
          b === mb.reference ? badge("reference", "ok") : off ? `(${off[0].toFixed(1)}, ${off[1].toFixed(1)})` : "–",
          fmtNum(alone, 3), fmtNum(start, 3), el("b", {}, fmtNum(joint, 3)),
          alone && joint ? el("span", { class: joint / alone > 1.05 ? "bad" : "" }, (joint / alone).toFixed(3)) : "–",
          bcol ? (() => { const s = summarize(bcol); return `${s.median.toFixed(3)} ± ${s.std.toFixed(3)}`; })() : "–",
        ];
      });
      cards.append(el("div", { class: "card", style: { gridColumn: "1 / -1" } }, el("h3", {}, "Bands", badge(`reference ${mb.reference}`)),
        el("div", { class: "table-wrap" }, table(["band", "λ [µm]", "pixel [\"]", "cutout [px]", "fit pixels", "frame offset [mas]", "χ²ᵥ alone", "χ²ᵥ joint start", "χ²ᵥ joint", "joint / alone", "PSF-error b (posterior)"], bRows)),
        el("div", { class: "muted small" }, `χ²ᵥ with σ_eff on each band's likelihood mask. "alone": the band's own GD fit; "joint start": the band's photometry with the starting (reference) lens; "joint": after the joint polish. A joint/alone ratio near 1 means the shared lens costs the band nothing; > 1.05 is underlined. Frame offset: band frame − reference frame at the joint MAP (prior σ ${mb.frameSigma != null ? (1000 * mb.frameSigma).toFixed(0) + " mas" : "–"}).`)));

      // -------------------------------------------------- sharing
      const groups = S.sharing ? Object.entries(S.sharing) : [];
      if (groups.length) {
        cards.append(card("What is shared",
          table(["group", "mode", "sites"], groups.map(([g, m]) => [g, badge(m === "shared" ? "shared" : "per band", m === "shared" ? "ok" : ""), counts[g] ?? "–"])),
          el("div", { class: "muted small" }, `Shared sites are sampled once (reference-band prior) and read by every band; shared image-plane positions (lens / perturber centres, quasar images) are shifted by each band's frame offset. ${S.n_shared_sites != null ? S.n_shared_sites + " shared sites. " : ""}Likelihood terms: ${(S.terms || []).join(", ") || "–"}.`)));
      }

      // -------------------------------------------------- polish + sampling
      const P = S.polish || {}, Sm = S.sampling || null;
      cards.append(card("Joint polish & sampling", kv([
        ["Start", S.init_from ? el("span", { class: "small mono", title: S.init_from }, S.init_from.split("/").slice(-3).join("/")) : "band GD states"],
        ["U start → joint MAP", `${fmtNum(S.start?.U, 1)} → ${fmtNum(J.U, 1)}`],
        ["L-BFGS polish", P.iterations != null ? `${P.iterations} it · |∇U| ${fmtNum(P.gradnorm_before, 3)} → ${fmtNum(P.gradnorm_after, 3)} · ${P.converged ? "converged" : "not converged"} · ${fmtSec(P.seconds)}` : "–"],
        ["Joint NUTS", Sm ? `${Sm.n_samples} draws · divergences ${fmtNum(100 * (Sm.divergence_rate ?? 0), 2)} % · acceptance ${fmtNum(Sm.acceptance, 3)}${Sm.r_hat_max != null ? ` · R̂max ${fmtNum(Sm.r_hat_max, 3)}` : ""} · ${fmtSec(Sm.seconds)}` : "no joint sampling (MAP only)"],
        ["Posterior here", run.features.posterior ? `${run.posteriorSummary?.nSamples ?? "?"} draws, viewed as band ${run.band}` : "–"],
        ["Blinding", run.features.blinded ? badge(run.offsets ? "BLINDED · key loaded" : "BLINDED · no key", "warn") : badge("not blinded", "ok")],
      ]), scal?.recentred?.length ? el("div", { class: "warn small" }, `Stored ${scal.recentred.join(", ")} were blinded twice (ALPACA 0.6.0 joint NUTS); re-centred in memory to the once-blinded form.`) : ""));

      // -------------------------------------------------- chi2 by region (grouped bars)
      const regions = J.chi2_regions ? [...new Set(Object.values(J.chi2_regions).flatMap((o) => Object.keys(o)))] : [];
      if (regions.length) {
        const c = el("div", { class: "card", style: { gridColumn: "1 / -1" } }, el("h3", {}, "χ² per pixel by image region (joint MAP)"));
        cards.append(c);
        const p = addPlot(c, 240);
        p.opts.margin = { l: 52, r: 16, t: 12, b: 40 };
        p.render = (a) => {
          let hi = 1.5;
          for (const b of bands) for (const r of regions) { const v = J.chi2_regions[b]?.[r]; if (Number.isFinite(v)) hi = Math.max(hi, v); }
          a.setRange(0, regions.length, 0, hi * 1.12);
          a.axes({ xticks: false, grid: true, ylabel: "χ² / pixel" });
          a.hline(1, { color: THEME.muted });
          const w = 0.8 / bands.length;
          regions.forEach((r, i) => {
            bands.forEach((b, k) => {
              const v = J.chi2_regions[b]?.[r];
              if (!Number.isFinite(v)) return;
              const x0 = i + 0.1 + k * w;
              a.bars([x0, x0 + w * 0.92], [v], { color: bandColor(k, bands.length), stroke: THEME.fg });
              a.text(a.X(x0 + w * 0.46), a.Y(v) - 2, v.toFixed(2), { px: true, align: "center", baseline: "bottom" });
            });
            a.text(a.X(i + 0.5), a.rect.y + a.rect.h + 6, r.replace(/\s*\(.*\)/, ""), { px: true, align: "center", baseline: "top" });
          });
          a.legend(bands.map((b, k) => ({ color: bandColor(k, bands.length), label: b })), { x: a.rect.x + a.rect.w - 90 });
        };
        p.draw();
        c.append(el("div", { class: "muted small" }, `Regions as in ALPACA's joint_summary.json: ${regions.join(" · ")}. With σ_eff (PSF-error term b of each band). The dashed line is χ² = 1.`));
      }

      // -------------------------------------------------- each band alone vs joint
      const sh = S.mass_shift_vs_alone || {};
      const shBands = bands.filter((b) => sh[b] && !sh[b].error);
      if (shBands.length) {
        const keys = Object.keys(MASS_LABEL).filter((k) => shBands.some((b) => sh[b][k] !== undefined));
        const sd = {};
        for (const k of keys) if (scal?.columns[k]) sd[k] = summarize(scal.columns[k]).std;
        const inSigma = keys.every((k) => sd[k] > 0);
        const blinded = new Set(mb.manifest?.blinded ? mb.manifest.blinded_columns || [] : []);
        const c = el("div", { class: "card", style: { gridColumn: "1 / -1" } }, el("h3", {}, "Each band alone vs the joint lens", badge(inSigma ? "in joint posterior σ" : "raw differences")));
        cards.append(c);
        if (inSigma) {
          const p = addPlot(c, 34 + 26 * keys.length);
          p.render = (a) => {
            let m = 3;
            for (const b of shBands) for (const k of keys) { const v = sh[b][k] / sd[k]; if (Number.isFinite(v)) m = Math.max(m, Math.abs(v) * 1.1); }
            a.setRange(-m, m, -0.5, keys.length - 0.5);
            a.band(-2, 2, { color: alpha(THEME.fg, 0.05) }); a.band(-1, 1, { color: alpha(THEME.fg, 0.07) });
            a.axes({ yticks: false, grid: false, xlabel: "band alone − joint MAP  [joint posterior σ]" });
            a.vline(0, { color: THEME.muted });
            keys.forEach((k, i) => {
              const y = keys.length - 1 - i;
              a.text(a.rect.x - 8, a.Y(y), MASS_LABEL[k] + (blinded.has(k) ? " (Δ)" : ""), { px: true, align: "right", baseline: "middle" });
              shBands.forEach((b, j) => { const v = sh[b][k] / sd[k]; if (Number.isFinite(v)) marker(a, Math.max(-m, Math.min(m, v)), y + (j - (shBands.length - 1) / 2) * 0.18, MARKERS[j % MARKERS.length], bandColor(bands.indexOf(b), bands.length)); });
            });
            shBands.forEach((b, j) => {
              const px = a.rect.x + a.rect.w - 84, py = a.rect.y + 12 + 16 * j;
              markerPx(a.ctx, px, py, MARKERS[j % MARKERS.length], bandColor(bands.indexOf(b), bands.length), 4);
              a.text(px + 10, py, b, { px: true, baseline: "middle" });
            });
          };
          p.draw();
          c.append(el("div", { class: "muted small" }, `ALPACA's band-alone − joint MAP mass shift (mass_shift_vs_alone; centres corrected for the frame offset), divided by the joint posterior σ of each parameter. Shaded: ±1σ and ±2σ. Where a band alone sits many σ from the joint lens, that band pulls the joint fit; compare with the χ² cost above. Blinded parameters (Δ) are shown only in σ units.`));
        } else {
          c.append(table(["parameter", ...shBands], keys.map((k) => [MASS_LABEL[k], ...shBands.map((b) => (blinded.has(k) ? el("span", { class: "muted" }, "blinded") : fmtNum(sh[b][k], 5)))])),
            el("div", { class: "muted small" }, "Band-alone − joint MAP (raw units). Without a joint posterior the shifts cannot be put in σ; blinded parameters are withheld."));
        }
      }

      // -------------------------------------------------- ALPACA's joint figures + report
      if (mb.figures.length) {
        const grid = el("div", { class: "thumbs" });
        for (const f of mb.figures) {
          const img = el("img", { loading: "lazy", alt: f });
          mb.index.url(f).then((u) => { img.src = u; });
          grid.append(el("figure", { onClick: async () => window.open(await mb.index.url(f), "_blank") }, img, el("figcaption", {}, f.replace(/^.*\//, ""))));
        }
        body.append(el("div", { class: "gallery" }, el("h3", { class: "muted small" }, `ALPACA joint figures (${mb.jointName}/figures, click to open)`), grid));
      }
      if (mb.report) body.append(el("div", { style: { padding: "0 14px 14px" } }, el("details", {}, el("summary", {}, `${mb.jointName}/REPORT.md`), el("pre", { class: "json" }, mb.report))));
      panel.setStatus(`${mb.bands.length} bands · reference ${mb.reference} · ${mb.postDir ? "joint posterior" : "joint MAP only"}`);
    });

    const settings = () => {
      const run = runOf(ctx, state);
      panel.settings.replaceChildren(
        runRow(ctx, state, () => { settings(); load(); }) || "",
        run?.mb ? section("Band shown by the other panels", row("Band", select(run.mb.bandsByWavelength.map((b) => ({ value: b, label: b })), run.band, (v) => ctx.app.setBand(run.label, v)))) : "",
        section("Export", el("div", { class: "ctl-row" }, button("Export plots (PNG)", () => plots.forEach((p, i) => { const a = el("a", { href: p.toPNG(), download: `multiband_overview_${i + 1}.png` }); document.body.append(a); a.click(); a.remove(); }), { small: true }))),
      );
    };
    settings();
    load();
    return { destroy() { plots.forEach((p) => p.destroy()); }, state: () => state, refresh: () => { settings(); load(); } };
  },
};
