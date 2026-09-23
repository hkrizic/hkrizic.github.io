import { el, section, row, select, cmapSelect, stretchSelect, checkbox, button, downloadPNG } from "../ui/widgets.js";
import { ImageView } from "../ui/imagecanvas.js";
import { runOf, runRow, busy, errorBox, infoBox } from "./common.js";

const MAPS = [
  { value: "mean", label: "Posterior mean" },
  { value: "std", label: "Posterior std" },
  { value: "snr", label: "Mean / std (S/N)" },
  { value: "best", label: "Best log-L draw" },
  { value: "map", label: "MAP (final stage)" },
];

export default {
  id: "sourcemaps", title: "Source posterior", icon: "✺", description: "Pixelated-source posterior: mean, standard deviation and S/N maps next to the MAP and the best draw (linked views).", defaultSize: "l",
  available: (run) => run.features.posterior,
  create(ctx, state, panel) {
    Object.assign(state, { maps: state.maps || ["mean", "std", "snr"], cmap: state.cmap || "magma", stretch: state.stretch || "log", useExtent: state.useExtent ?? true });
    const grid = el("div", { class: "view-grid" });
    panel.body.append(grid);
    let views = [];
    const load = () => busy(panel, "loading posterior", async () => {
      const run = runOf(ctx, state);
      const post = await run.posterior();
      if (!post.pixelIdx.length) { panel.body.replaceChildren(errorBox("No pixelated source in the posterior.")); return; }
      const n = Math.round(Math.sqrt(post.pixelIdx.length));
      let extent = [0, n, 0, n];
      let units = "pixel";
      if (state.useExtent && (run.offsets || !run.features.blinded) && run.features.map) {
        try {
          const bf = await run.bestFit("final");
          const params = Object.fromEntries(Object.entries(bf.params).filter(([, v]) => typeof v === "number"));
          if (params.lens_gamma !== undefined) {
            const r = await run.render("final", params, bf.source, { lensLight: false, pointSources: false, source: true, unconvolved: true });
            if (r.sourceGrid) { const g = r.sourceGrid; const h = g.step / 2; extent = [g.x0 - h, g.x1 + h, g.y0 - h, g.y1 + h]; units = "arcsec"; }
          }
        } catch (e) { console.warn("source extent", e); }
      }
      views.forEach((v) => v.destroy()); views = []; grid.innerHTML = "";
      const mapData = async (key) => {
        if (key === "mean") return post.pixMean;
        if (key === "std") return post.pixStd;
        if (key === "snr") { const o = new Float64Array(post.pixMean.length); for (let i = 0; i < o.length; i++) o[i] = post.pixMean[i] / (post.pixStd[i] || NaN); return o; }
        if (key === "best") return (await run.drawParams(run.bestDrawIndex(post), { unblind: false })).source.data;
        if (key === "map") { const bf = await run.bestFit("final"); return bf.source ? bf.source.data : null; }
        return null;
      };
      for (const key of state.maps) {
        const data = await mapData(key);
        if (!data) continue;
        const cell = el("div", { class: "view-cell" });
        grid.append(cell);
        const v = new ImageView(cell, { cmap: key === "snr" ? "viridis" : state.cmap, stretch: key === "snr" ? "linear" : state.stretch, pmin: 0.5, pmax: 99.8, group: "source", label: MAPS.find((m) => m.value === key).label, units, showColorbar: true });
        v.setImage({ data, rows: n, cols: n, extent });
        views.push(v);
      }
      panel.setStatus(`${n}×${n} source pixels · ${post.nSamples} samples` + (units === "pixel" ? " · extent in pixels (unblind or MAP render needed for arcsec)" : ""));
    });
    const settings = () => {
      panel.settings.replaceChildren(
        runRow(ctx, state, load) || "",
        section("Maps", ...MAPS.map((m) => checkbox(m.label, state.maps.includes(m.value), (on) => { state.maps = MAPS.map((x) => x.value).filter((k) => (k === m.value ? on : state.maps.includes(k))); load(); }))),
        section("Display",
          row("Colormap", cmapSelect(state.cmap, (v) => { state.cmap = v; views.forEach((vw) => vw.opts.label.includes("S/N") || vw.setOptions({ cmap: v })); })),
          row("Stretch", stretchSelect(state.stretch, (v) => { state.stretch = v; views.forEach((vw) => vw.opts.label.includes("S/N") || vw.setOptions({ stretch: v })); })),
          checkbox("Arcsec extent from MAP source grid", state.useExtent, (v) => { state.useExtent = v; load(); }),
          el("div", { class: "ctl-row" }, button("Export PNGs", () => views.forEach((v, i) => downloadPNG(v.toPNG(), `source_${state.maps[i]}.png`)), { small: true })),
        ),
      );
    };
    settings();
    load();
    return { destroy() { views.forEach((v) => v.destroy()); }, state: () => state, refresh: load };
  },
};
