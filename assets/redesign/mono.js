// Shared pieces of the site's design: easing helpers, the top bar's menu, section titles whose
// letters flip in, a name cut out of the page (with a photograph behind it) that can be zoomed
// through, and a small WebGL gravitational lens (singular isothermal sphere plus external shear).

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const mix = (a, b, t) => a + (b - a) * t;
export const ease = x => x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
export const easeOut = x => 1 - (1 - x) ** 3;

export const LIGHT = [235, 235, 232], DARK = [11, 11, 11];
export const FONT = '"Mona Sans", system-ui, sans-serif';

const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
export const motion = { reduced: reducedQuery.matches };
reducedQuery.addEventListener('change', event => { motion.reduced = event.matches; });

/* ---------- Top bar ---------- */

export function initBar() {
  const button = document.querySelector('.bar-menu');
  if (!button) return;
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    button.setAttribute('aria-expanded', String(open));
    document.querySelector('main').inert = open;
  };
  button.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  document.querySelector('.bar-nav').addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); button.focus(); }
  });
  matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) setMenu(false); });
}

/* ---------- Titles whose letters flip in ---------- */

const letterState = new WeakMap();

export function split(element) {
  const text = element.textContent.trim();
  element.setAttribute('aria-label', text);
  // Letters are grouped in words, so long titles still wrap between words.
  const parts = [];
  text.split(/\s+/).forEach((word, i) => {
    if (i) parts.push(document.createTextNode(' '));
    const group = document.createElement('span');
    group.className = 'word';
    group.setAttribute('aria-hidden', 'true');
    for (const character of word) {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = character;
      group.append(span);
    }
    parts.push(group);
  });
  element.replaceChildren(...parts);
  letterState.delete(element);
}

// Split every [data-split] title, and again after the language switch rewrites translated ones.
export function splitTitles(onChange) {
  document.querySelectorAll('[data-split]').forEach(split);
  new MutationObserver(() => {
    document.querySelectorAll('[data-split][data-en]').forEach(split);
    onChange?.();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}

// progress 0: letters folded back below the line; 1: in place. Staggered from the first letter.
export function flipIn(element, progress) {
  const key = motion.reduced ? `r${progress.toFixed(3)}` : progress.toFixed(3);
  if (letterState.get(element) === key) return;
  letterState.set(element, key);
  const letters = element.querySelectorAll('.ch'), n = letters.length, spread = Math.min(.5, .045 * n);
  for (let i = 0; i < n; i++) {
    const start = n > 1 ? i / (n - 1) * spread : 0;
    const q = ease(seg(progress, start, start + 1 - spread));
    const style = letters[i].style;
    if (q >= 1) { style.transform = ''; style.opacity = ''; }
    else if (motion.reduced) { style.transform = ''; style.opacity = String(q); }
    else { style.transform = `translate3d(0, ${(1 - q) * .45}em, 0) rotateX(${(1 - q) * 95}deg)`; style.opacity = String(q ** 1.6); }
  }
}

/* ---------- The visible screen ---------- */

// On phones the browser's toolbars grow and shrink while scrolling. Layouts use the small viewport
// (the area that stays visible with the toolbars shown), so nothing jumps when they change.
const probe = document.createElement('div');
probe.setAttribute('aria-hidden', 'true');
probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
document.documentElement.append(probe);
export function viewport() {
  return { width: document.documentElement.clientWidth || innerWidth, height: probe.offsetHeight || innerHeight };
}
export const pagePad = width => Math.max(18, Math.min(width * .04, 64));

/* ---------- A name cut out of the page ---------- */

// Mona Sans is a variable font; these families pin its width, because Safari's canvas ignores
// fontStretch. Both are declared in mono.css over the same font file.
const WIDE = '"Mona Sans Wide", "Mona Sans", system-ui, sans-serif', NARROW = '"Mona Sans Narrow", "Mona Sans", system-ui, sans-serif';
const nameFont = (size, upright) => `800 ${size}px ${upright ? WIDE : NARROW}`;

// lines: the words, one per line. focus: [line, letter, fraction across the letter] of the stem the
// zoom goes into. The lines are justified to the same length and fill the page between its margins;
// letters are placed one by one (with the font's kerning), so no canvas letterSpacing is needed.
// On tall screens the lines run upwards, side by side, in condensed type. insets(): the space
// [top, bottom] kept free for the top bar and the caption. The canvas may reach beyond the screen
// (it does on phones, under the browser's toolbars); the name is laid out on the visible screen.
export function createCover(canvas, { lines, focus, insets = () => [76, 84], heightShare = .62 }) {
  const context = canvas.getContext('2d');
  let layout = null, dpr = 1, readyAt = 0, offset = [0, 0];
  function measure() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    // Canvas position relative to the screen, when it is fixed and reaches beyond it.
    offset = getComputedStyle(canvas).position === 'fixed' ? [-canvas.offsetLeft, -canvas.offsetTop] : [0, 0];
    const { width, height } = viewport(), [top, bottom] = insets(), pad = pagePad(width);
    const rotate = height > width * 1.15, n = lines.length;
    context.font = nameFont(100, !rotate);
    const tracking = -2, prefix = line => [...line].map((_, i) => context.measureText(line.slice(0, i)).width + tracking * i);
    const natural = lines.map(line => context.measureText(line).width + tracking * (line.length - 1));
    const widest = Math.max(...natural) / 100, capRatio = context.measureText('H').actualBoundingBoxAscent / 100;
    const thickness = capRatio * (n + (n - 1) * .12);
    // along: room in the reading direction; across: room for the stacked lines.
    const along = rotate ? height - top - bottom : width - 2 * pad;
    const across = rotate ? width - 2 * pad : Math.min(height * heightShare, height - top - bottom);
    // The block fills the room across; a gentle stretch along (at most 12 %) fills the other way.
    let size = across / thickness, stretch = along / (widest * size);
    if (stretch < 1) { size = along / widest; stretch = 1; }
    stretch = Math.min(stretch, 1.12);
    const cap = capRatio * size, gap = cap * .12, block = n * cap + (n - 1) * gap, length = widest * size * stretch;
    const baselines = lines.map((_, i) => cap + i * (cap + gap));
    // Shorter lines are widened (up to 15 %) and then spaced to the length of the longest one.
    const widths = lines.map((_, i) => Math.min(1.15, widest * 100 / natural[i]));
    const positions = lines.map((line, i) => {
      const extra = line.length > 1 ? (widest * 100 - natural[i] * widths[i]) / (line.length - 1) : 0;
      return prefix(line).map((x, k) => (x * widths[i] + extra * k) * size / 100);
    });
    // Text space: x along the line (before the stretch), y down. Screen: centred in the free room.
    const origin = rotate
      ? [(width - block) / 2, height - bottom - (along - length) / 2]
      : [pad, top + (height - top - bottom - block) / 2];
    const toScreen = ([x, y]) => rotate ? [origin[0] + y, origin[1] - x * stretch] : [origin[0] + x * stretch, origin[1] + y];
    const [lineIndex, letterIndex, fraction] = focus;
    context.font = nameFont(size, !rotate);
    const letter = context.measureText(lines[lineIndex][letterIndex]).width * widths[lineIndex];
    const point = toScreen([positions[lineIndex][letterIndex] + letter * fraction, baselines[lineIndex] - cap / 2]);
    const corners = [[-offset[0], -offset[1]], [canvas.clientWidth - offset[0], canvas.clientHeight - offset[1]]];
    const reach = Math.max(...[0, 1].flatMap(a => [0, 1].map(b => Math.hypot(corners[a][0] - point[0], corners[b][1] - point[1]))));
    const halfStem = context.measureText('I').width * .22 * stretch * widths[lineIndex];
    layout = { rotate, size, stretch, widths, baselines, positions, origin, point, maxScale: reach / halfStem * 1.1 };
  }
  return {
    measure,
    get ready() { return readyAt > 0; },
    // The point the zoom goes into, in screen (CSS px) coordinates.
    get point() { if (!layout) measure(); return layout.point; },
    get fading() { return readyAt > 0 && performance.now() - readyAt < 1200; },
    // Lay out again once the web fonts are ready (or after a timeout), then fade the letters in.
    whenFontReady(callback) {
      const fonts = document.fonts ? Promise.all([WIDE, NARROW].map(family => document.fonts.load(`800 100px ${family}`))) : null;
      Promise.race([fonts, new Promise(resolve => setTimeout(resolve, 2500))])
        .catch(() => {}).then(() => { measure(); readyAt = performance.now(); callback?.(); });
    },
    // zoom 0..1 into the focus stem; alpha of the page; shift: parallax of the letters in px;
    // shade 0..1 darkens what is seen through the letters (towards the dark colour).
    draw({ zoom = 0, alpha = 1, shift = [0, 0], color = LIGHT, shade = 0 }) {
      if (!layout) measure();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (alpha > 0 && zoom < 1) {
        context.globalAlpha = alpha;
        context.fillStyle = `rgb(${color})`;
        context.fillRect(0, 0, canvas.width, canvas.height);
        if (readyAt) {
          context.setTransform(dpr, 0, 0, dpr, dpr * offset[0], dpr * offset[1]);
          context.globalCompositeOperation = 'destination-out';
          context.globalAlpha = motion.reduced ? 1 : easeOut(clamp((performance.now() - readyAt) / 1100));
          context.translate(...shift);
          const scale = Math.exp(Math.log(layout.maxScale) * zoom ** 2.4), [fx, fy] = layout.point;
          context.translate(fx, fy); context.scale(scale, scale); context.translate(-fx, -fy);
          context.translate(...layout.origin);
          if (layout.rotate) context.rotate(-Math.PI / 2);
          context.scale(layout.stretch, 1);
          context.font = nameFont(layout.size, !layout.rotate);
          context.textBaseline = 'alphabetic';
          lines.forEach((line, i) => [...line].forEach((character, k) => {
            context.save();
            context.translate(layout.positions[i][k], layout.baselines[i]);
            context.scale(layout.widths[i], 1);
            context.fillText(character, 0, 0);
            context.restore();
          }));
        }
      }
      if (shade > 0) {
        // Behind what is already drawn: only the holes (the letters) get darker.
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalCompositeOperation = 'destination-over';
        context.globalAlpha = 1;
        context.fillStyle = `rgba(${DARK}, ${shade})`;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1;
    }
  };
}

/* ---------- A source behind a gravitational lens (WebGL) ---------- */

export function createLensLayer(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const vertex = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
  const fragment = `precision highp float;
uniform vec2 resolution;uniform float dpr;
uniform vec2 center,source;uniform float thetaE,shear,shearAngle,radius,opacity;uniform vec3 ink;
// Singular isothermal sphere plus external shear; returns the source-plane position.
vec2 lensMap(vec2 theta){
 float r=max(length(theta),1e-3);
 float c=cos(2.*shearAngle),s=sin(2.*shearAngle);
 vec2 gammaTheta=shear*vec2(c*theta.x+s*theta.y,s*theta.x-c*theta.y);
 return theta-thetaE*theta/r-gammaTheta;
}
float brightness(vec2 theta){
 float d=length(lensMap(theta)-source);
 return smoothstep(radius,radius*.55,d)+.14*exp(-d*d/(radius*radius*7.));
}
void main(){
 vec2 p=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y)/dpr-center;
 // On high-density screens every CSS pixel already has several device pixels: one sample is enough.
 // On standard screens four samples smooth the thin arcs.
 float b;
 if(dpr>1.4)b=brightness(p);
 else{float o=.25/dpr;b=.25*(brightness(p+vec2(-o,-o))+brightness(p+vec2(o,-o))+brightness(p+vec2(-o,o))+brightness(p+vec2(o,o)));}
 b=min(1.,b);
 // The lens galaxy itself: a faint point at the centre.
 b=max(b,.35*exp(-dot(p,p)/(thetaE*thetaE*.0025)));
 gl_FragColor=vec4(ink*b,b)*opacity;
}`;
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['resolution', 'dpr', 'center', 'source', 'thetaE', 'shear', 'shearAngle', 'radius', 'opacity', 'ink']
    .map(key => [key, gl.getUniformLocation(program, key)]));
  let lost = false;
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; });
  return {
    get lost() { return lost; },
    resize(dpr) {
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    },
    // center and source in CSS px (source relative to the lens), thetaE and radius in CSS px.
    draw({ center, thetaE, source, shear = 0, shearAngle = .35, radius, opacity = 1 }) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (opacity <= 0 || lost) return;
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.dpr, canvas.width / canvas.clientWidth);
      gl.uniform2f(uniforms.center, ...center);
      gl.uniform2f(uniforms.source, ...source);
      gl.uniform1f(uniforms.thetaE, thetaE);
      gl.uniform1f(uniforms.shear, shear);
      gl.uniform1f(uniforms.shearAngle, shearAngle);
      gl.uniform1f(uniforms.radius, radius);
      gl.uniform1f(uniforms.opacity, opacity);
      gl.uniform3f(uniforms.ink, ...LIGHT.map(c => c / 255));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  };
}

// A light disc growing from a point until it covers the screen (progress 0..1).
export function drawPortal(context, center, progress, width, height, color = LIGHT) {
  if (progress <= 0 || progress >= 1) return 0;
  const radius = progress ** 2.2 * Math.hypot(width, height);
  context.fillStyle = `rgb(${color})`;
  context.beginPath(); context.arc(center[0], center[1], radius, 0, Math.PI * 2); context.fill();
  return radius;
}
