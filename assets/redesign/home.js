// Home page stage. Scroll position is mapped to a timeline T in [0, 3] (intro, physics, cello).
// The portrait is drawn with WebGL and seen through a gravitational lens (a softened singular
// isothermal sphere, beta = theta - thetaE * theta / |theta|): scrolling grows the Einstein radius
// until the portrait wraps around the lens, then shrinks the source so that the arcs collapse into
// a thin Einstein ring. The ring unrolls into four cello strings (C, G, D, A); they swing with the
// scroll speed, ring out when released and can be plucked with the pointer.

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
// The cut-out portrait (1002 x 1329) and the point on the chest that ends up behind the lens.
const PERSON_ASPECT = 1002 / 1329, CHEST = [.64, .36];

const scenes = [...document.querySelectorAll('[data-scene]')];
const personImage = document.querySelector('.intro-person');
const personCanvas = document.querySelector('.stage-person');
const linesCanvas = document.querySelector('.stage-lines');
const introName = document.querySelector('.intro-name');
const introLines = [...introName.querySelectorAll('.intro-line')];
const introFades = [...document.querySelectorAll('.intro-role, .intro-cue')];
const copies = [...document.querySelectorAll('.scene-physics, .scene-cello')].map((scene, index) => ({
  title: scene.querySelector('.copy-title'),
  rest: [...scene.querySelectorAll('.copy-text, .copy-link, .caption')],
  start: index === 0 ? 1.0 : 2.02
}));
const themeColor = document.querySelector('meta[name="theme-color"]');

/* ---------- Letters ---------- */

function split(element) {
  const text = element.textContent.trim();
  element.setAttribute('aria-label', text);
  element.replaceChildren(...[...text].map((character, i) => {
    const span = document.createElement('span');
    span.className = 'ch';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--i', i);
    span.textContent = character === ' ' ? ' ' : character;
    return span;
  }));
}
document.querySelectorAll('[data-split]').forEach(split);
// The language switch rewrites translated headings; split them again afterwards.
new MutationObserver(() => {
  document.querySelectorAll('[data-split][data-en]').forEach(split);
  lastLetterState.clear(); kick();
}).observe(root, { attributes: true, attributeFilter: ['lang'] });
document.querySelectorAll('.intro-line .ch').forEach((span, i) => span.style.setProperty('--i', i));

const lastLetterState = new Map();
function setLetter(span, transform, opacity) {
  const key = transform + opacity;
  if (lastLetterState.get(span) === key) return;
  lastLetterState.set(span, key);
  span.style.transform = transform;
  span.style.opacity = opacity;
}

/* ---------- Layout ---------- */

let vw = innerWidth, vh = innerHeight, dpr = 1, narrow = false, sceneTops = [], sceneHeights = [];
let center = [0, 0], ringRadius = 0, centerSize = [0, 0], strings = [];

function measure() {
  vw = innerWidth; vh = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 2);
  narrow = vw <= 760 || vw <= vh;
  sceneTops = scenes.map(scene => scene.getBoundingClientRect().top + scrollY);
  sceneHeights = scenes.map(scene => scene.offsetHeight);
  center = narrow ? [vw * .5, vh * .28] : [vw * .66, vh * .5];
  ringRadius = narrow ? Math.min(vw * .24, vh * .12) : Math.min(vw * .17, vh * .23);
  const height = narrow ? Math.min(vh * .3, vw * .8 / PERSON_ASPECT) : vh * .56;
  centerSize = [height * PERSON_ASPECT, height];
  // Four strings seen along the fingerboard: wide at the bridge, converging towards the scroll.
  const top = Math.max(vh * .1, 86), bottom = narrow ? vh * .5 : vh * 1.04;
  const spreadTop = narrow ? vw * .22 : Math.min(vw * .085, 150), spreadBottom = narrow ? vw * .62 : Math.min(vw * .3, 520);
  strings = ['C', 'G', 'D', 'A'].map((name, k) => ({
    name, width: [3.2, 2.5, 1.9, 1.4][k] * (narrow ? .8 : 1),
    top: [center[0] + (k / 3 - .5) * spreadTop, top],
    bottom: [center[0] + (k / 3 - .5) * spreadBottom, bottom],
    frequency: [4.2, 5.1, 6.1, 7.2][k],
    modes: [{ x: 0, v: 0 }, { x: 0, v: 0 }],
    ...(strings[k] ? { modes: strings[k].modes } : {})
  }));
  for (const canvas of [personCanvas, linesCanvas]) {
    const width = Math.round(canvas.clientWidth * dpr), height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  }
}

function targetTime() {
  // Each scene adds its scrolled fraction; scenes are contiguous, so T is continuous.
  let t = 0;
  for (let i = 0; i < scenes.length; i++) t += clamp((scrollY - sceneTops[i]) / sceneHeights[i]);
  return t;
}

/* ---------- Portrait through a gravitational lens (WebGL) ---------- */

function createPersonLayer(canvas, image) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const vertex = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
  const fragment = `precision highp float;
uniform sampler2D person;uniform vec2 resolution;uniform float dpr;
uniform vec4 rect;uniform vec2 lens;uniform float thetaE,core,opacity,bottomFade;
void main(){
 vec2 p=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y)/dpr;
 vec2 d=p-lens;
 vec2 s=p-thetaE*d/sqrt(dot(d,d)+core*core);
 vec2 uv=(s-rect.xy)/rect.zw;
 if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.){gl_FragColor=vec4(0.);return;}
 vec4 c=texture2D(person,uv);
 c*=1.-bottomFade*smoothstep(.84,1.,uv.y);
 gl_FragColor=vec4(vec3(dot(c.rgb,vec3(.2126,.7152,.0722))),c.a)*opacity;
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
  const uniforms = Object.fromEntries(['resolution', 'dpr', 'rect', 'lens', 'thetaE', 'core', 'opacity', 'bottomFade']
    .map(name => [name, gl.getUniformLocation(program, name)]));
  // A power-of-two copy allows mipmaps, which keep the strongly demagnified parts smooth.
  const size = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), Math.max(screen.width, screen.height) * dpr > 1400 ? 2048 : 1024);
  const pot = document.createElement('canvas');
  pot.width = pot.height = size;
  pot.getContext('2d').drawImage(image, 0, 0, size, size);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pot);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const anisotropy = gl.getExtension('EXT_texture_filter_anisotropic');
  if (anisotropy) gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  let lost = false;
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; root.classList.remove('webgl'); });
  return {
    get lost() { return lost; },
    draw({ rect, lens, thetaE, opacity, bottomFade }) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (opacity <= 0) return;
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.dpr, canvas.width / canvas.clientWidth);
      gl.uniform4f(uniforms.rect, ...rect);
      gl.uniform2f(uniforms.lens, ...lens);
      gl.uniform1f(uniforms.thetaE, thetaE);
      gl.uniform1f(uniforms.core, Math.max(1, thetaE * .05));
      gl.uniform1f(uniforms.opacity, opacity);
      gl.uniform1f(uniforms.bottomFade, bottomFade);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  };
}

let personLayer = null;
const portrait = new Image();
portrait.src = personImage.currentSrc || personImage.src;
portrait.decode().then(() => {
  personLayer = createPersonLayer(personCanvas, portrait);
  kick();
}).catch(() => {});

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
  const ringAlpha = reduced ? seg(t, 1.0, 1.2) : seg(t, 1.62, 1.7);
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
      lines.font = `500 ${narrow ? 11 : 12}px 'Mona Sans', system-ui, sans-serif`;
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
  const darkness = reduced ? seg(T, .45, .9) * (1 - seg(T, 1.9, 2.0)) : T >= PORTAL[1] ? 0 : seg(T, .45, .9);
  const bg = LIGHT.map((c, i) => Math.round(mix(c, DARK[i], darkness)));
  const fg = LIGHT.map((c, i) => Math.round(mix(DARK[i], c, clamp((darkness - .35) / .3))));
  const ink = `rgb(${fg})`;
  root.style.setProperty('--bg', `rgb(${bg})`);
  root.style.setProperty('--fg', ink);
  themeColor?.setAttribute('content', `rgb(${bg})`);

  // Intro: the name peels away letter by letter while the portrait moves to the centre.
  introName.style.transform = reduced ? '' : `translate3d(${-px * 16}px, ${-py * 10}px, 0)`;
  introName.style.fontStretch = `${118 + 7 * easeOut(seg(T, 0, .25))}%`;
  introLines.forEach((line, lineIndex) => {
    const letters = [...line.children];
    letters.forEach((span, i) => {
      const order = lineIndex === 0 ? i : letters.length - 1 - i;
      const q = easeOut(seg(T, .03 + order * .03 + lineIndex * .04, .3 + order * .03 + lineIndex * .04));
      if (q <= 0) setLetter(span, '', '');
      else if (reduced) setLetter(span, '', String(1 - q));
      else setLetter(span, `translate3d(${(lineIndex ? 1 : -1) * q * .12}em, ${-q * .9}em, ${-q * 140}px) rotateX(${q * 82}deg)`, String((1 - q) ** 2));
    });
  });
  for (const element of introFades) element.style.opacity = 1 - seg(T, .02, .15);

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

  // Portrait: from its place in the intro to the centre, then through the lens.
  if (personLayer && !personLayer.lost) {
    const box = personImage.getBoundingClientRect();
    const hero = [box.left, box.top, box.width, box.height];
    const move = ease(seg(T, .08, .92));
    const shrink = reduced ? 1 : mix(1, .012, ease(seg(T, 1.4, 1.66)));
    const w = centerSize[0] * shrink, h = centerSize[1] * shrink;
    const target = [center[0] - CHEST[0] * w, center[1] - CHEST[1] * h, w, h];
    const rect = hero.map((value, i) => mix(value, target[i], move));
    const presence = reduced ? 0 : seg(T, 1.0, 1.15) * (1 - seg(T, 1.3, 1.42));
    const lens = [center[0] + presence * ringRadius * .14 * Math.sin(clock * .7), center[1] + presence * ringRadius * .1 * Math.cos(clock * .53)];
    const thetaE = reduced ? 0 : ringRadius * ease(seg(T, .95, 1.38));
    const opacity = reduced ? 1 - seg(T, .9, 1.1) : 1 - seg(T, 1.64, 1.72);
    personLayer.draw({ rect, lens, thetaE, opacity, bottomFade: seg(T, .1, .6) });
    // The canvas now shows the same portrait as the plain image, which can step aside.
    root.classList.add('webgl');
    const tilt = reduced ? 0 : mix(1, 2.2, seg(T, .8, 1.2));
    personCanvas.style.transform = `perspective(1600px) rotateY(${px * 3 * tilt}deg) rotateX(${-py * 2.2 * tilt}deg) translate3d(${px * 12}px, ${py * 8}px, 0)`;
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
    && Math.abs(scrollSpeed) < 1 && stringEnergy() < .05 && (reduced || !(T > .95 && T < 2.1));
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
document.fonts?.ready.then(() => { measure(); kick(); });
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
