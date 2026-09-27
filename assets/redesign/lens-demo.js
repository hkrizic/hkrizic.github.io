// "Arcs and rings" on the research page: a lensed galaxy rendered like a telescope image
// (lens-sky.mjs), with sliders for the lensing strength and the source alignment. Moving the
// pointer over the section moves the source; left alone, it drifts slowly.
import { createLensSky } from './lens-sky.mjs?v=1';
import { motion } from './mono.js?v=3';

function backgroundOf(element) {
  for (let node = element; node; node = node.parentElement) {
    const channels = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
    if (channels && (channels.length < 4 || Number(channels[3]) > 0)) return channels.slice(0, 3).map(value => value / 255);
  }
  return [0, 0, 0];
}

export function initArcsDemo(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return;
  const renderer = createLensSky(gl, { quad: false, lensAngle: 0, background: backgroundOf(canvas) });
  if (!renderer) return;
  const section = canvas.closest('section') || canvas.parentElement;
  const radiusControl = section.querySelector('[data-lens-radius]'), alignment = section.querySelector('[data-lens-align]');
  const radiusOutput = section.querySelector('[data-radius-output]'), alignmentOutput = section.querySelector('[data-alignment-output]');
  let width = 0, height = 0, x = .035, y = .015, targetX = x, targetY = y, inside = false, visible = false, last = 0, elapsed = 0, frame = 0;
  const showAlignment = () => { if (alignmentOutput) alignmentOutput.textContent = Number(alignment.value).toFixed(3); };
  const requestDraw = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw); };

  new ResizeObserver(() => {
    const bounds = canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 1.5);
    width = Math.round(bounds.width * ratio); height = Math.round(bounds.height * ratio);
    if (!width || !height) return;
    canvas.width = width; canvas.height = height;
    renderer.resize(width, height);
    requestDraw();
  }).observe(canvas);

  section.addEventListener('pointermove', event => {
    if (event.target.closest('a,button,input,label,.lab-intro')) return;
    if (event.pointerType === 'touch' && !event.buttons) return;
    const bounds = canvas.getBoundingClientRect();
    targetX = Math.max(Number(alignment.min), Math.min(Number(alignment.max), ((event.clientX - bounds.left) / bounds.width - .5) * .4));
    targetY = 0; inside = true;
    alignment.value = String(targetX); showAlignment(); requestDraw();
  }, { passive: true });
  radiusControl.addEventListener('input', () => { radiusOutput.textContent = Number(radiusControl.value).toFixed(2); requestDraw(); });
  alignment.addEventListener('input', () => { inside = true; targetX = Number(alignment.value); targetY = 0; showAlignment(); requestDraw(); });
  section.querySelector('[data-lens-reset]')?.addEventListener('click', () => {
    inside = true; targetX = 0; targetY = 0; alignment.value = '0'; showAlignment(); requestDraw();
  });

  function draw(now) {
    frame = 0;
    if (!visible || document.hidden || !width || !height) return;
    const delta = last ? Math.min((now - last) / 1000, .05) : 0;
    last = now;
    if (!motion.reduced) elapsed += delta;
    if (!inside && !motion.reduced) { targetX = Math.sin(elapsed * .19) * .045 + .015; targetY = Math.cos(elapsed * .14) * .035; }
    if (motion.reduced) { x = targetX; y = targetY; } else { x += (targetX - x) * .045; y += (targetY - y) * .045; }
    renderer.render({ source: [x, y], radius: Number(radiusControl.value), shear: .045 });
    canvas.classList.add('ready');
    if (!motion.reduced && (!inside || Math.abs(targetX - x) + Math.abs(targetY - y) > 1e-4)) requestDraw();
  }

  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { last = 0; requestDraw(); } else if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: '60px' }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = 0; requestDraw(); } });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); visible = false; canvas.classList.remove('ready'); });
}
