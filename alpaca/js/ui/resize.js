// ResizeObserver wrapper that ignores flip-flopping sizes (e.g. a scrollbar toggling on and
// off on every redraw), which would otherwise make canvases redraw in an endless loop.
export function observeStable(el, cb) {
  const hist = [];
  const ro = new ResizeObserver(() => {
    const w = el.clientWidth, h = el.clientHeight, t = performance.now();
    hist.push({ w, h, t });
    if (hist.length > 6) hist.shift();
    const n = hist.length;
    if (n >= 3) {
      const a = hist[n - 3], b = hist[n - 2];
      const flip = a.w === w && a.h === h && (b.w !== w || b.h !== h) && t - a.t < 800;
      if (flip) return;
    }
    cb();
  });
  ro.observe(el);
  return ro;
}
