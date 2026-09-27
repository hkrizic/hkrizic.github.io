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

/* ---------- A name cut out of the page ---------- */

function setNameFont(context, size, upright) {
  context.font = `800 ${size}px ${FONT}`;
  if ('fontStretch' in context) context.fontStretch = upright ? 'expanded' : 'condensed';
  if ('letterSpacing' in context) context.letterSpacing = `${-.02 * size}px`;
}

// lines: the words, one per line. focus: [line, letter, fraction across the letter] of the stem the
// zoom goes into. On tall screens the lines run upwards, side by side, in condensed type.
export function createCover(canvas, { lines, focus, heightShare = .62, bottomReserve = 76 }) {
  const context = canvas.getContext('2d');
  let layout = null, width = 0, height = 0, dpr = 1, readyAt = 0;
  function measure() {
    width = canvas.clientWidth; height = canvas.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(width * dpr), h = Math.round(height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const rotate = height > width * 1.15, pad = Math.max(18, Math.min(width * .04, 64)), n = lines.length;
    setNameFont(context, 100, !rotate);
    const widest = Math.max(...lines.map(line => context.measureText(line).width));
    const capRatio = context.measureText('H').actualBoundingBoxAscent / 100;
    const length = rotate ? height - 2 * pad - 74 - bottomReserve : width - 2 * pad;
    const across = rotate ? width - 2 * pad : height * heightShare;
    const size = Math.min(length / widest * 100, across / (capRatio * (n + (n - 1) * .12) * 1.02));
    setNameFont(context, size, !rotate);
    const cap = capRatio * size, gap = cap * .12, block = n * cap + (n - 1) * gap;
    const baselines = lines.map((_, i) => cap + i * (cap + gap));
    const origin = rotate ? [(width - block) / 2, height - pad - bottomReserve] : [pad, (height - block) / 2 - height * .03];
    const toScreen = ([x, y]) => rotate ? [origin[0] + y, origin[1] - x] : [origin[0] + x, origin[1] + y];
    const [lineIndex, letterIndex, fraction] = focus, line = lines[lineIndex];
    const before = context.measureText(line.slice(0, letterIndex)).width, letter = context.measureText(line[letterIndex]).width;
    const point = toScreen([before + letter * fraction, baselines[lineIndex] - cap / 2]);
    const reach = Math.max(...[[0, 0], [width, 0], [0, height], [width, height]].map(([x, y]) => Math.hypot(x - point[0], y - point[1])));
    const halfStem = context.measureText('I').width * .22;
    layout = { rotate, size, baselines, origin, point, maxScale: reach / halfStem * 1.1 };
  }
  return {
    measure,
    get ready() { return readyAt > 0; },
    get fading() { return readyAt > 0 && performance.now() - readyAt < 1200; },
    // Lay out again once the web font is ready (or after a timeout), then fade the letters in.
    whenFontReady(callback) {
      Promise.race([document.fonts ? document.fonts.load(`800 100px ${FONT}`) : null, new Promise(resolve => setTimeout(resolve, 2500))])
        .catch(() => {}).then(() => { measure(); readyAt = performance.now(); callback?.(); });
    },
    // zoom 0..1 into the focus stem; alpha of the page; shift: parallax of the letters in px.
    draw({ zoom = 0, alpha = 1, shift = [0, 0], color = LIGHT }) {
      if (!layout) measure();
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      if (alpha <= 0 || zoom >= 1) return;
      context.globalAlpha = alpha;
      context.fillStyle = `rgb(${color})`;
      context.fillRect(0, 0, width, height);
      if (!readyAt) return;
      context.globalCompositeOperation = 'destination-out';
      context.globalAlpha = motion.reduced ? 1 : easeOut(clamp((performance.now() - readyAt) / 1100));
      context.translate(...shift);
      const scale = Math.exp(Math.log(layout.maxScale) * zoom ** 2.4), [fx, fy] = layout.point;
      context.translate(fx, fy); context.scale(scale, scale); context.translate(-fx, -fy);
      context.translate(...layout.origin);
      if (layout.rotate) context.rotate(-Math.PI / 2);
      setNameFont(context, layout.size, !layout.rotate);
      context.textBaseline = 'alphabetic';
      lines.forEach((line, i) => context.fillText(line, 0, layout.baselines[i]));
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
 float o=.25/dpr,b=0.;
 b+=brightness(p+vec2(-o,-o));b+=brightness(p+vec2(o,-o));b+=brightness(p+vec2(-o,o));b+=brightness(p+vec2(o,o));
 b=min(1.,b*.25);
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
