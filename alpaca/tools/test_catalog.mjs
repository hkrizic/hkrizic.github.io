// Verify catalog->frame positions against the prior means of the alpaca run (positions were free there).
import fs from "node:fs";
import { parseFits } from "../js/core/parsers/fits.js";
import { parseNpz } from "../js/core/parsers/npy.js";
import { perturberPositions, detectLensCenter } from "../js/physics/catalog.js";
const R = "/Users/hrvojekrizic/GitHub/alpaca/run";
const cat = JSON.parse(fs.readFileSync("/Users/hrvojekrizic/GitHub/alpaca/data/perturbers.json", "utf8"));
const img = parseFits(fs.readFileSync(R + "/01_input/fits/image.fits"));
const cfg = JSON.parse(fs.readFileSync(R + "/config/config.json", "utf8"));
const bf = parseNpz(new Uint8Array(fs.readFileSync(R + "/03_multistart/best_fit_params_full.npz")));
const pix = cfg.data.pix_scale;
let ax = 0, ay = 0; for (let i = 0; i < 4; i++) { ax += bf[`x_image_${i}`].data[0]; ay += bf[`y_image_${i}`].data[0]; } ax /= 4; ay /= 4;
const center = detectLensCenter(img.data, img.shape[1], pix, [ax, ay], cfg.data.lens_center_search_radius);
console.log("detected lens centre", center.map((v) => v.toFixed(4)), "(PS barycentre", ax.toFixed(3), ay.toFixed(3), ")");
const pos = perturberPositions(cat, cat.perturbers, center, { imageNpix: img.shape[1] });
const prior = {}; for (const line of fs.readFileSync(R + "/01_input/priors/prior_summary.txt", "utf8").split("\n")) { const m = /^(pert\d+_center_[xy])\s+\S+\s+mean=(-?[\d.]+)/.exec(line); if (m) prior[m[1]] = +m[2]; }
for (const [id, [x, y]] of pos) console.log(`pert${id}: (${x.toFixed(4)}, ${y.toFixed(4)})  prior mean (${prior[`pert${id}_center_x`]}, ${prior[`pert${id}_center_y`]})  diff (${(x - prior[`pert${id}_center_x`]).toFixed(4)}, ${(y - prior[`pert${id}_center_y`]).toFixed(4)})`);
