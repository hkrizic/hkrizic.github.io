// Render icons/icon.svg into the PNG sizes the PWA, iOS and the Mac launcher need.
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(path.join(root, 'icons/icon.svg'), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
async function render(size, out, { flat = false } = {}) {
  const body = flat ? svg.replace('rx="112"', 'rx="0"') : svg;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${body.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}
await render(192, path.join(root, 'icons/icon-192.png'));
await render(512, path.join(root, 'icons/icon-512.png'));
await render(512, path.join(root, 'icons/icon-maskable-512.png'), { flat: true });
await render(180, path.join(root, 'icons/apple-touch-icon.png'), { flat: true });
// macOS .icns for PyDojo.app
const set = path.join(root, 'tools/.PyDojo.iconset');
await mkdir(set, { recursive: true });
for (const s of [16, 32, 128, 256, 512]) {
  await render(s, path.join(set, `icon_${s}x${s}.png`));
  await render(s * 2, path.join(set, `icon_${s}x${s}@2x.png`));
}
await browser.close();
execFileSync('iconutil', ['-c', 'icns', set, '-o', path.join(root, 'icons/PyDojo.icns')]);
console.log('icons written');
