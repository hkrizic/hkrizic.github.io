// node test/configurator_fits.mjs [outdir]
// The configurator's FITS writer round-trips through the site's FITS parser
// (js/core/parsers/fits.js), and its multi-HDU reader handles a JWST-like file
// (empty primary, SCI, ERR). With [outdir] the written files are kept for the
// astropy check in test/configurator_check.py.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { parseFits } from "../js/core/parsers/fits.js";
import { writeFits, formatCard, scanHdus, readRegion, readOverview, pixelScale, cropCards, BLOCK } from "../js/configurator/fitsio.js";

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failures++; };
const outdir = process.argv[2];
if (outdir) mkdirSync(outdir, { recursive: true });

const rows = 7, cols = 5;
const img = new Float64Array(rows * cols).map((_, i) => Math.sin(i) * 1e3 + i / 7);
const mask = new Uint8Array(rows * cols).map((_, i) => (i % 3 === 0 ? 0 : 1));

for (const bitpix of [-64, -32]) {
  const u8 = writeFits(img, rows, cols, { bitpix, cards: [formatCard("BUNIT", "DN/s"), formatCard("CRPIX1", 3.5, "", true)] });
  check(u8.length % BLOCK === 0, `BITPIX ${bitpix}: length multiple of 2880`);
  const f = parseFits(u8);
  check(f.shape[0] === rows && f.shape[1] === cols, `BITPIX ${bitpix}: shape [${f.shape}]`);
  const tol = bitpix === -64 ? 0 : 1e-4;
  let maxd = 0;
  for (let i = 0; i < img.length; i++) maxd = Math.max(maxd, Math.abs(f.data[i] - img[i]) / Math.max(1, Math.abs(img[i])));
  check(maxd <= tol, `BITPIX ${bitpix}: values (max rel diff ${maxd.toExponential(2)})`);
  check(f.header.BUNIT === "DN/s" && f.header.CRPIX1 === 3.5, `BITPIX ${bitpix}: header cards`);
  if (outdir) writeFileSync(join(outdir, `image_${-bitpix}.fits`), u8);
}
for (const bitpix of [8, 16]) {
  const u8 = writeFits(mask, rows, cols, { bitpix });
  const f = parseFits(u8);
  check(f.data.every((v, i) => v === mask[i]), `mask BITPIX ${bitpix}: values`);
  if (outdir) writeFileSync(join(outdir, `mask_${bitpix}.fits`), u8);
}

// --- multi-HDU file: empty primary + SCI (float32) + ERR (int16 with BZERO) ------------
function extension(data, r, c, bitpix, extname, extra = []) {
  const prim = writeFits(data, r, c, { bitpix, cards: [formatCard("EXTNAME", extname), ...extra] });
  // turn the primary header into an IMAGE extension header
  const txt = new TextDecoder().decode(prim.subarray(0, 80));
  check(txt.startsWith("SIMPLE"), "writer starts with SIMPLE");
  prim.set(new TextEncoder().encode(formatCard("XTENSION", "IMAGE", "image extension")), 0);
  // EXTEND -> PCOUNT/GCOUNT
  prim.set(new TextEncoder().encode(formatCard("PCOUNT", 0)), 5 * 80);
  return prim;
}
const R = 300, C = 260;
const sci = new Float32Array(R * C).map((_, i) => (i % C) + 1000 * Math.floor(i / C));
sci[5 * C + 7] = NaN;
const err = new Int16Array(R * C).map((_, i) => (i % 97) - 40);
// an empty primary (NAXIS = 0), as in JWST i2d files
const head = [formatCard("SIMPLE", true), formatCard("BITPIX", 8), formatCard("NAXIS", 0), formatCard("EXTEND", true),
  formatCard("TELESCOP", "JWST"), formatCard("FILTER", "F150W"), "END".padEnd(80)];
const prim0 = new Uint8Array(BLOCK).fill(32);
head.forEach((c, k) => prim0.set(new TextEncoder().encode(c), k * 80));
const wcs = [formatCard("CTYPE1", "RA---TAN"), formatCard("CTYPE2", "DEC--TAN"),
  formatCard("CRVAL1", 69.5622562, "", true), formatCard("CRVAL2", -12.2874206, "", true),
  formatCard("CRPIX1", 130.0, "", true), formatCard("CRPIX2", 150.0, "", true),
  formatCard("CD1_1", -8.6746e-6, "", true), formatCard("CD1_2", 1e-8, "", true),
  formatCard("CD2_1", 1e-8, "", true), formatCard("CD2_2", 8.6746e-6, "", true),
  formatCard("BUNIT", "MJy/sr"), formatCard("PHOTMJSR", 2.5, "", true)];
const extSci = extension(sci, R, C, -32, "SCI", wcs);
const extErr = extension(err, R, C, 16, "ERR", [formatCard("BZERO", 100.0, "", true)]);
const file = new Uint8Array(prim0.length + extSci.length + extErr.length);
file.set(prim0, 0); file.set(extSci, prim0.length); file.set(extErr, prim0.length + extSci.length);
const blob = new Blob([file]);

const hdus = await scanHdus(blob);
check(hdus.length === 3, `scanHdus finds 3 HDUs (${hdus.map((h) => h.extname).join(", ")})`);
check(!hdus[0].isImage && hdus[1].isImage && hdus[2].isImage, "primary is empty, SCI/ERR are images");
check(hdus[1].rows === R && hdus[1].cols === C, "SCI shape");
const ps = pixelScale(hdus[1].header);
check(ps && Math.abs(ps.scale - 0.031228) < 1e-4 && ps.source === "CD matrix", `pixel scale from CD: ${ps && ps.scale.toFixed(6)}`);

// region partly outside the image
const reg = await readRegion(blob, hdus[1], -2, 8, 250, 265);
const w = 15;
check(Number.isNaN(reg[0]) && Number.isNaN(reg[(2) * w + 12]), "outside pixels are NaN");
check(reg[(2 + 3) * w + 0] === 3 * 1000 + 250, "region value at (row 3, col 250)");
const reg2 = await readRegion(blob, hdus[1], 4, 7, 6, 9);
check(Number.isNaN(reg2[1 * 3 + 1]), "NaN pixel survives");
const regE = await readRegion(blob, hdus[2], 10, 11, 0, 5);
check([...regE].every((v, c) => v === ((10 * C + c) % 97) - 40 + 100), "int16 + BZERO decoding");

const ov = await readOverview(blob, hdus[1], 4);
check(ov.rows === Math.ceil(R / 4) && ov.cols === Math.ceil(C / 4), "overview shape");
// block (0,0): rows 0-3, cols 0-3, mean col 1.5, mean row 1.5 -> 1.5 + 1500
check(Math.abs(ov.data[0] - 1501.5) < 1e-3, `overview block mean ${ov.data[0]}`);

const cc = cropCards([hdus[1], hdus[0]], 100, 120, { bunit: "DN/s" });
const ctext = cc.join("\n");
check(/CRPIX1  =\s+30\.0/.test(ctext) && /CRPIX2  =\s+30\.0/.test(ctext), "CRPIX shifted by the crop origin");
check(/TELESCOP= 'JWST/.test(ctext) && /BUNIT   = 'DN\/s/.test(ctext) && !/MJy/.test(ctext), "observation keywords + new BUNIT");
if (outdir) {
  writeFileSync(join(outdir, "multi_hdu.fits"), file);
  const crop = writeFits(await readRegion(blob, hdus[1], 120, 125, 100, 103), 5, 3, { bitpix: -64, cards: cc });
  writeFileSync(join(outdir, "crop_wcs.fits"), crop);
}

console.log(failures ? `${failures} FAILED` : "all passed");
process.exit(failures ? 1 : 0);
