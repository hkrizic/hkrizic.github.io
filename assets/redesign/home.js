// Home page stage. Scroll position is mapped to a timeline T in [0, 3] (intro, physics, cello).
// Intro: the page is a light surface with the name cut out of it; the portrait lies behind, so it
// is seen through the letters. Scrolling zooms into the stem of the "I" until the whole photograph
// fills the screen. Physics: a small source drifts behind a lens galaxy (singular isothermal sphere
// plus external shear, drawn in WebGL) and is seen as two, then four images, then an Einstein
// ring. The ring opens into a light disc and unrolls into four cello strings (C, G, D, A) that swing
// with the scroll speed, ring out when released and can be plucked with the pointer.

const root = document.documentElement;
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reducedQuery.matches;
reducedQuery.addEventListener('change', event => { reduced = event.matches; kick(); });

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const mix = (a, b, t) => a + (b - a) * t;
const ease = x => x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
const easeOut = x => 1 - (1 - x) ** 3;

const LIGHT = [235, 235, 232], DARK = [11, 11, 11];
// The Einstein ring opens into a light disc that fills the screen between these times.
const PORTAL = [1.83, 1.97];
const FONT = '"Mona Sans", system-ui, sans-serif';

const scenes = [...document.querySelectorAll('[data-scene]')];
const photo = document.querySelector('.stage-photo');
const coverCanvas = document.querySelector('.stage-cover');
const lensCanvas = document.querySelector('.stage-lens');
const linesCanvas = document.querySelector('.stage-lines');
const introRole = document.querySelector('.intro-role'), introCue = document.querySelector('.intro-cue');
const copies = [...document.querySelectorAll('.scene-physics, .scene-cello')].map((scene, index) => ({
  title: scene.querySelector('.copy-title'),
  rest: [...scene.querySelectorAll('.copy-text, .copy-link, .caption')],
  start: index === 0 ? 1.0 : 2.02
}));
const themeColor = document.querySelector('meta[name="theme-color"]');

/* ---------- Letters of the section titles ---------- */

function split(element) {
  const text = element.textContent.trim();
  element.setAttribute('aria-label', text);
  element.replaceChildren(...[...text].map(character => {
    const span = document.createElement('span');
    span.className = 'ch';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = character;
    return span;
  }));
}
const lastLetterState = new Map();
document.querySelectorAll('[data-split]').forEach(split);
// The language switch rewrites translated titles; split them again afterwards.
new MutationObserver(() => {
  document.querySelectorAll('[data-split][data-en]').forEach(split);
  lastLetterState.clear(); kick();
}).observe(root, { attributes: true, attributeFilter: ['lang'] });

function setLetter(span, transform, opacity) {
  const key = transform + opacity;
  if (lastLetterState.get(span) === key) return;
  lastLetterState.set(span, key);
  span.style.transform = transform;
  span.style.opacity = opacity;
}

/* ---------- Layout ---------- */

let vw = innerWidth, vh = innerHeight, dpr = 1, narrow = false, sceneTops = [], sceneHeights = [];
let center = [0, 0], ringRadius = 0, strings = [], name = null;

function measure() {
  vw = innerWidth; vh = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 2);
  narrow = vw <= 760 || vw <= vh;
  sceneTops = scenes.map(scene => scene.getBoundingClientRect().top + scrollY);
  sceneHeights = scenes.map(scene => scene.offsetHeight);
  center = narrow ? [vw * .5, vh * .3] : [vw * .66, vh * .5];
  ringRadius = narrow ? Math.min(vw * .3, vh * .15) : Math.min(vw * .17, vh * .25);
  // Four strings seen along the fingerboard: wide at the bridge, converging towards the scroll.
  const top = Math.max(vh * .1, 86), bottom = narrow ? vh * .5 : vh * 1.04;
  const spreadTop = narrow ? vw * .22 : Math.min(vw * .085, 150), spreadBottom = narrow ? vw * .62 : Math.min(vw * .3, 520);
  strings = ['C', 'G', 'D', 'A'].map((label, k) => ({
    name: label, width: [3.2, 2.5, 1.9, 1.4][k] * (narrow ? .8 : 1),
    top: [center[0] + (k / 3 - .5) * spreadTop, top],
    bottom: [center[0] + (k / 3 - .5) * spreadBottom, bottom],
    frequency: [4.2, 5.1, 6.1, 7.2][k],
    modes: strings[k]?.modes ?? [{ x: 0, v: 0 }, { x: 0, v: 0 }]
  }));
  for (const canvas of [coverCanvas, lensCanvas, linesCanvas]) {
    const width = Math.round(canvas.clientWidth * dpr), height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  }
  name = layoutName();
}

function targetTime() {
  // Each scene adds its scrolled fraction; scenes are contiguous, so T is continuous.
  let t = 0;
  for (let i = 0; i < scenes.length; i++) t += clamp((scrollY - sceneTops[i]) / sceneHeights[i]);
  return t;
}

/* ---------- Intro: the name cut out of the page ---------- */

const cover = coverCanvas.getContext('2d');

function setNameFont(context, size, upright = true) {
  context.font = `800 ${size}px ${FONT}`;
  if ('fontStretch' in context) context.fontStretch = upright ? 'expanded' : 'condensed';
  if ('letterSpacing' in context) context.letterSpacing = `${-.02 * size}px`;
}

// Two lines as large as the screen allows. On tall screens they run upwards, side by side.
function layoutName() {
  const lines = ['HRVOJE', 'KRIZIC'], rotate = vh > vw * 1.15, pad = Math.max(18, Math.min(vw * .04, 64));
  setNameFont(cover, 100, !rotate);
  const widest = Math.max(...lines.map(line => cover.measureText(line).width));
  const capHeight = cover.measureText('H').actualBoundingBoxAscent / 100;
  // Upright lines span the width; upward lines leave room for the bar and the caption.
  const length = rotate ? vh - 2 * pad - 150 : vw - 2 * pad;
  const size = Math.min(length / widest * 100, (rotate ? vw - 2 * pad : vh * .62) / (capHeight * 2.12));
  setNameFont(cover, size, !rotate);
  const cap = capHeight * size, gap = cap * .12, block = cap * 2 + gap;
  // Text space: x along the line, y down; baselines at cap and 2 cap + gap.
  const baselines = [cap, cap * 2 + gap];
  const origin = rotate ? [(vw - block) / 2, vh - pad - 76] : [pad, (vh - block) / 2 - vh * .03];
  const toScreen = ([x, y]) => rotate ? [origin[0] + y, origin[1] - x] : [origin[0] + x, origin[1] + y];
  // The zoom goes into the stem of the "I" in KRIZIC.
  const before = cover.measureText('KR').width, stem = cover.measureText('I').width;
  const focus = toScreen([before + stem * .45, baselines[1] - cap / 2]);
  const reach = Math.max(...[[0, 0], [vw, 0], [0, vh], [vw, vh]].map(([x, y]) => Math.hypot(x - focus[0], y - focus[1])));
  return { lines, rotate, size, baselines, origin, focus, maxScale: reach / (stem * .22) * 1.1 };
}

// Until the web font is ready the page stays blank; then the photograph fades in through the letters.
let coverReadyAt = 0;

function drawCover(t, now, shiftX, shiftY) {
  cover.setTransform(dpr, 0, 0, dpr, 0, 0);
  cover.clearRect(0, 0, vw, vh);
  const zoom = reduced ? 0 : seg(t, .05, .5);
  const alpha = reduced ? 1 - seg(t, .1, .4) : zoom < 1 ? 1 : 0;
  if (alpha <= 0 || !name) return;
  cover.globalAlpha = alpha;
  cover.fillStyle = `rgb(${LIGHT})`;
  cover.fillRect(0, 0, vw, vh);
  if (!coverReadyAt) return;
  cover.globalCompositeOperation = 'destination-out';
  cover.globalAlpha = reduced ? 1 : easeOut(clamp((now - coverReadyAt) / 1100));
  // The letters sit slightly in front of the photograph: they shift against it with the pointer.
  cover.translate(shiftX, shiftY);
  const scale = Math.exp(Math.log(name.maxScale) * zoom ** 2.4);
  const [fx, fy] = name.focus;
  cover.translate(fx, fy); cover.scale(scale, scale); cover.translate(-fx, -fy);
  cover.translate(...name.origin);
  if (name.rotate) cover.rotate(-Math.PI / 2);
  setNameFont(cover, name.size, !name.rotate);
  cover.textBaseline = 'alphabetic';
  name.lines.forEach((line, i) => cover.fillText(line, 0, name.baselines[i]));
  cover.globalCompositeOperation = 'source-over';
}

/* ---------- Physics: a source behind a gravitational lens (WebGL) ---------- */

function createLensLayer(canvas) {
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
    draw({ source, shear, radius, opacity }) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (opacity <= 0) return;
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.dpr, canvas.width / canvas.clientWidth);
      gl.uniform2f(uniforms.center, ...center);
      gl.uniform2f(uniforms.source, ...source);
      gl.uniform1f(uniforms.thetaE, ringRadius);
      gl.uniform1f(uniforms.shear, shear);
      gl.uniform1f(uniforms.shearAngle, .35);
      gl.uniform1f(uniforms.radius, radius);
      gl.uniform1f(uniforms.opacity, opacity);
      gl.uniform3f(uniforms.ink, ...LIGHT.map(c => c / 255));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  };
}
const lensLayer = createLensLayer(lensCanvas);

/* ---------- Ring and strings (2D canvas) ---------- */

const lines = linesCanvas.getContext('2d');
const SAMPLES = 48;

function ringPoint(angle, radius, tiltX, tiltY, spin) {
  const x = Math.cos(angle + spin) * radius, y = Math.sin(angle + spin) * radius;
  return [center[0] + x * Math.cos(tiltY), center[1] + y * Math.cos(tiltX) + x * Math.sin(tiltY) * Math.sin(tiltX) * .35];
}

function stepStrings(dt, drive) {
  for (const string of strings) {
    string.modes.forEach((mode, index) => {
      // Exact update of a damped oscillator around a (scroll-driven) equilibrium.
      const n = index + 1, omega = 2 * Math.PI * string.frequency * n, gamma = 1.25 + .9 * index;
      const rest = index === 0 ? drive : 0, x0 = mode.x - rest, v0 = mode.v;
      const omegaD = Math.sqrt(Math.max(1, omega * omega - gamma * gamma)), decay = Math.exp(-gamma * dt);
      const a = x0, b = (v0 + gamma * x0) / omegaD, c = Math.cos(omegaD * dt), s = Math.sin(omegaD * dt);
      mode.x = rest + decay * (a * c + b * s);
      mode.v = decay * ((-gamma * a + omegaD * b) * c + (-gamma * b - omegaD * a) * s);
    });
  }
}
function pluck(string, position, amplitude) {
  string.modes.forEach((mode, index) => { const n = index + 1; mode.x += amplitude * Math.sin(n * Math.PI * position) / (n * n); });
}
function stringEnergy() {
  return strings.reduce((sum, string) => sum + string.modes.reduce((s, mode) => s + Math.abs(mode.x) + Math.abs(mode.v) * .02, 0), 0);
}
function stringX(string, y) {
  const s = clamp((y - string.top[1]) / (string.bottom[1] - string.top[1]));
  return [mix(string.top[0], string.bottom[0], s), s];
}

function drawLines(t, time, ink) {
  lines.setTransform(dpr, 0, 0, dpr, 0, 0);
  lines.clearRect(0, 0, vw, vh);
  const ringAlpha = seg(t, 1.64, 1.7);
  const alpha = ringAlpha * (1 - seg(t, 2.8, 2.98));
  if (alpha <= 0) return;
  const tilt = reduced ? 0 : seg(t, 1.68, 1.8) * (1 - seg(t, 1.9, 2.02));
  const tiltX = tilt * (.55 + pointer.y * .45 + Math.sin(time * .31) * .12);
  const tiltY = tilt * (pointer.x * .5 + Math.sin(time * .23) * .15);
  const spin = reduced ? 0 : time * .08 + t * 1.6;
  // Portal: a light disc grows from the centre of the ring until it covers the screen.
  const portal = reduced ? 0 : seg(t, PORTAL[0], PORTAL[1]);
  const discRadius = portal ** 2.2 * Math.hypot(vw, vh);
  if (portal > 0 && portal < 1) {
    lines.globalAlpha = 1;
    lines.fillStyle = `rgb(${LIGHT})`;
    lines.beginPath(); lines.arc(center[0], center[1], discRadius, 0, Math.PI * 2); lines.fill();
  }
  if (portal > 0 && discRadius > ringRadius * .8) ink = `rgb(${DARK})`;
  lines.strokeStyle = lines.fillStyle = ink;
  lines.lineCap = 'round';
  strings.forEach((string, k) => {
    const morph = reduced ? (t > 2.05 ? 1 : 0) : ease(seg(t, 1.98 + .035 * k, 2.24 + .035 * k));
    const fade = reduced ? (t > 2.05 ? seg(t, 2.05, 2.2) : 1 - seg(t, 1.95, 2.05)) : 1;
    lines.globalAlpha = alpha * fade;
    lines.lineWidth = mix(1.4, string.width, morph);
    lines.beginPath();
    for (let i = 0; i <= SAMPLES; i++) {
      const s = i / SAMPLES;
      const ring = ringPoint(-Math.PI / 2 + (k + s) * Math.PI / 2, ringRadius, tiltX, tiltY, spin);
      const offset = string.modes.reduce((sum, mode, index) => sum + mode.x * Math.sin((index + 1) * Math.PI * s), 0);
      const line = [mix(string.top[0], string.bottom[0], s) + offset, mix(string.top[1], string.bottom[1], s)];
      const x = mix(ring[0], line[0], morph), y = mix(ring[1], line[1], morph);
      if (i) lines.lineTo(x, y); else lines.moveTo(x, y);
    }
    lines.stroke();
    if (morph > .6) {
      lines.globalAlpha = alpha * fade * seg(morph, .6, 1) * .6;
      lines.font = `500 ${narrow ? 11 : 12}px ${FONT}`;
      lines.textAlign = 'center';
      lines.fillText(string.name, string.top[0], string.top[1] - 14);
    }
  });
  lines.globalAlpha = 1;
}

/* ---------- Pointer ---------- */

const pointer = { x: 0, y: 0, tx: 0, ty: 0, last: null };
addEventListener('pointermove', event => {
  if (event.pointerType === 'mouse') { pointer.tx = event.clientX / vw * 2 - 1; pointer.ty = event.clientY / vh * 2 - 1; }
  // Crossing a string plucks it, harder for faster movement.
  if (stringsPlayable() && pointer.last) {
    const [x0, y0] = pointer.last, x1 = event.clientX, y1 = event.clientY;
    for (const string of strings) {
      const [sx0] = stringX(string, y0), [sx1, s] = stringX(string, y1);
      if (y1 < string.top[1] || y1 > string.bottom[1]) continue;
      if (Math.sign(x0 - sx0) !== Math.sign(x1 - sx1)) pluck(string, clamp(s, .08, .92), Math.sign(x1 - x0) * clamp(Math.abs(x1 - x0) * .9, 8, 38));
    }
  }
  pointer.last = [event.clientX, event.clientY];
  kick();
}, { passive: true });
addEventListener('pointerdown', event => {
  if (!stringsPlayable()) return;
  let nearest = null, distance = narrow ? 30 : 22;
  for (const string of strings) {
    const [x, s] = stringX(string, event.clientY), d = Math.abs(event.clientX - x);
    if (d < distance && event.clientY >= string.top[1] && event.clientY <= string.bottom[1]) { nearest = [string, s]; distance = d; }
  }
  if (nearest) { pluck(nearest[0], clamp(nearest[1], .08, .92), 26); kick(); }
}, { passive: true });
function stringsPlayable() { return T > 2.2 && T < 2.8; }

/* ---------- Frame ---------- */

let T = 0, running = false, lastFrame = 0, lastScroll = scrollY, scrollSpeed = 0, arrived = false, clock = 0;

function render(now) {
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 1 / 20) : 1 / 60;
  lastFrame = now; clock += dt;
  const target = targetTime();
  T = reduced ? target : T + (target - T) * (1 - Math.exp(-dt * 7.5));
  if (Math.abs(target - T) < 1e-4) T = target;
  pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 5));
  pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 5));
  const px = reduced ? 0 : pointer.x, py = reduced ? 0 : pointer.y;
  const speed = (scrollY - lastScroll) / dt; lastScroll = scrollY;
  scrollSpeed += (speed - scrollSpeed) * (1 - Math.exp(-dt * 10));

  // Colours: light, then dark for the physics, light again for the cello.
  // The light returns through the Einstein ring (see drawLines), so the switch back is a step.
  const darkness = reduced ? seg(T, .7, .9) * (1 - seg(T, 1.9, 2.0)) : T >= PORTAL[1] ? 0 : seg(T, .7, .9);
  const bg = LIGHT.map((c, i) => Math.round(mix(c, DARK[i], darkness)));
  const fg = LIGHT.map((c, i) => Math.round(mix(DARK[i], c, clamp((darkness - .35) / .3))));
  const ink = `rgb(${fg})`;
  root.style.setProperty('--bg', `rgb(${bg})`);
  root.style.setProperty('--fg', ink);
  themeColor?.setAttribute('content', `rgb(${bg})`);

  // Intro: the photograph behind the page. It is seen through the letters, then fills the screen,
  // gains its colour and finally fades to black for the physics.
  const reveal = reduced ? seg(T, .1, .4) : seg(T, .05, .5);
  const photoScale = reduced ? 1 : mix(1.16, 1, easeOut(reveal));
  photo.style.transform = `scale(${photoScale}) translate3d(${-px * 14}px, ${-py * 10}px, 0)`;
  photo.style.filter = `grayscale(${1 - seg(T, .42, .6)}) brightness(${1 - seg(T, .72, .95)})`;
  photo.style.visibility = T > .97 ? 'hidden' : '';
  drawCover(T, now, px * 10, py * 7);
  coverCanvas.style.transform = reduced ? '' : `perspective(1400px) rotateY(${px * 2}deg) rotateX(${-py * 1.6}deg) scale(1.04)`;
  introCue.style.opacity = 1 - seg(T, .02, .12);
  introRole.style.opacity = 1 - seg(T, .7, .85);

  // Copy for physics and cello: the title flips in, the rest follows.
  for (const copy of copies) {
    const letters = [...copy.title.children];
    letters.forEach((span, i) => {
      const q = ease(seg(T, copy.start + i * .018, copy.start + .14 + i * .018));
      if (q >= 1) setLetter(span, '', '');
      else if (reduced) setLetter(span, '', String(q));
      else setLetter(span, `translate3d(0, ${(1 - q) * .45}em, 0) rotateX(${(1 - q) * 95}deg)`, String(q ** 1.6));
    });
    const fade = easeOut(seg(T, copy.start + .1, copy.start + .24));
    for (const element of copy.rest) element.style.setProperty('--in', fade.toFixed(3));
  }

  // Physics: the source spirals in behind the lens: one image, two, four, then a ring.
  if (lensLayer && !lensLayer.lost) {
    const u = seg(T, 1.0, 1.62), path = 1 - ease(u), angle = .75 + 2.4 * ease(u);
    const wobble = reduced ? 0 : (1 - u) * .05 * ringRadius;
    const steer = reduced ? 0 : (1 - u) * .22 * ringRadius;
    const source = [
      Math.cos(angle) * 1.5 * ringRadius * path + px * steer + Math.sin(clock * .6) * wobble,
      Math.sin(angle) * 1.5 * ringRadius * path + py * steer + Math.cos(clock * .45) * wobble
    ];
    const shear = .14 * (1 - seg(u, .72, .95));
    const radius = ringRadius * mix(.075, .018, seg(u, .8, 1));
    const opacity = seg(T, .92, 1.02) * (1 - seg(T, 1.66, 1.72));
    lensLayer.draw({ source, shear, radius, opacity });
    lensCanvas.style.transform = reduced ? '' : `perspective(1600px) rotateY(${px * 6}deg) rotateX(${-py * 5}deg)`;
  }

  // Strings: the fundamental follows the scroll speed while they are on screen.
  const onStrings = seg(T, 2.1, 2.25) * (1 - seg(T, 2.75, 2.9));
  const drive = reduced ? 0 : clamp(-scrollSpeed * .012, -34, 34) * onStrings;
  stepStrings(dt, drive);
  if (!reduced && T > 2.2 && T < 2.7 && !arrived) {
    arrived = true;
    strings.forEach((string, k) => setTimeout(() => { pluck(string, .3, 24); kick(); }, k * 120));
  }
  if (T < 2.05) arrived = false;
  drawLines(T, clock, ink);

  const idle = Math.abs(target - T) < 1e-4 && Math.abs(pointer.tx - pointer.x) + Math.abs(pointer.ty - pointer.y) < 1e-3
    && Math.abs(scrollSpeed) < 1 && stringEnergy() < .05 && (reduced || !(T > .95 && T < 2.1)) && now - coverReadyAt > 1200;
  if (!idle && !document.hidden) requestAnimationFrame(render); else { running = false; lastFrame = 0; }
}

function kick() {
  if (running || document.hidden) return;
  running = true;
  requestAnimationFrame(render);
}

measure();
T = targetTime();
addEventListener('scroll', kick, { passive: true });
addEventListener('resize', () => { measure(); kick(); });
document.addEventListener('visibilitychange', kick);
// The name is drawn with the web font, so lay it out again once the font is ready.
Promise.race([document.fonts ? document.fonts.load(`800 100px ${FONT}`) : null, new Promise(resolve => setTimeout(resolve, 2500))])
  .catch(() => {}).then(() => { measure(); coverReadyAt = performance.now(); root.classList.add('cover-ready'); kick(); });
new ResizeObserver(() => { measure(); kick(); }).observe(document.body);
kick();

/* ---------- Menu (small screens) ---------- */

const menuButton = document.querySelector('.bar-menu');
function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  document.querySelector('main').inert = open;
}
menuButton.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
document.querySelector('.bar-nav').addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
addEventListener('keydown', event => { if (event.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); menuButton.focus(); } });
matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) setMenu(false); });
