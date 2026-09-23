import overview from "./overview.js";
import image from "./image.js";
import model from "./model.js";
import params from "./params.js";
import corner from "./corner.js";
import marginals from "./marginals.js";
import sourcemaps from "./sourcemaps.js";
import lensing from "./lensing.js";
import rayshoot from "./rayshoot.js";
import h0 from "./h0.js";
import stages from "./stages.js";
import psf from "./psf.js";
import diagnostics from "./diagnostics.js";
import gallery from "./gallery.js";
import compare from "./compare.js";

export const APPLETS = [overview, image, model, rayshoot, params, corner, marginals, sourcemaps, lensing, h0, stages, psf, diagnostics, gallery, compare];
export const APPLET_MAP = Object.fromEntries(APPLETS.map((a) => [a.id, a]));

// Multi-panel presets
export const PRESETS = [
  { id: "default", title: "Standard workspace", panels: [["overview", {}, "l"], ["image", { layer: "data" }, "s"], ["image", { layer: "model" }, "s"], ["image", { layer: "resid" }, "s"], ["params", {}, "m"], ["corner", {}, "l"]] },
  { id: "triptych", title: "Data · model · residual (linked)", panels: [["image", { layer: "data", group: "main" }, "s"], ["image", { layer: "model", group: "main" }, "s"], ["image", { layer: "resid", group: "main" }, "s"]] },
  { id: "posterior", title: "Posterior deep-dive", panels: [["corner", {}, "l"], ["marginals", {}, "m"], ["diagnostics", {}, "m"], ["h0", {}, "m"], ["sourcemaps", {}, "l"]] },
  { id: "model", title: "Model lab + lensing", panels: [["model", { output: "model" }, "m"], ["model", { output: "resid" }, "m"], ["model", { output: "source" }, "m"], ["lensing", {}, "l"]] },
  { id: "rayshoot", title: "Ray-shooting lab", panels: [["rayshoot", {}, "xl"]] },
];
