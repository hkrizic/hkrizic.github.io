// Renderer, palette, studio lighting, shared vinyl materials, the camera rig and canvas-drawn textures.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp } from './util.js';

export const PAL = {
  paper: '#FFFDF9', cream: '#FFF4E4', ink: '#232B45', coral: '#FF6F59', mustard: '#FFC145', teal: '#2EC4B6',
  lilac: '#A594F9', pink: '#FF8FB1', mint: '#7ED6A5', sky: '#BFE3FF', orange: '#FF9F45', white: '#FFFFFF',
};

export const TEAM = [
  { id: 0, name: 'WASD', long: 'Team WASD', color: '#FF6F59', dark: '#D9482F', light: '#FFD9D0', keys: ['W', 'A', 'S', 'D'], dirs: { up: 'W', left: 'A', down: 'S', right: 'D' } },
  { id: 1, name: 'ARROWS', long: 'Team ARROWS', color: '#2EC4B6', dark: '#16968A', light: '#C9F2EC', keys: ['↑', '←', '↓', '→'], dirs: { up: '↑', left: '←', down: '↓', right: '→' } },
];

export class Engine {
  constructor(canvas) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    r.setPixelRatio(this.dpr);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping; // keeps the candy palette true
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap; // soft via shadow.radius (PCFSoft was removed in r18x)
    const pm = new THREE.PMREMGenerator(r);
    this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    this.view = null;
    addEventListener('resize', () => this.resize());
    this.resize();
  }
  setView(view) {
    this.view = view;
    this.resize();
  }
  get aspect() { return innerWidth / Math.max(1, innerHeight); }
  // Touch screens: a little lighter on pixels, and game scenes sit higher so the on-screen controls in the
  // bottom corners cover less of the action.
  setTouch(on) {
    this.touch = on;
    this.dpr = Math.min(window.devicePixelRatio || 1, on ? 1.5 : 1.75);
    this.renderer.setPixelRatio(this.dpr);
    CameraRig.touchFit = on ? 1.13 : 1; // and pulled back a little, so arenas fit between the HUD and the controls
    this.resize();
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    if (this.view) {
      const cam = this.view.camera, w = innerWidth, h = innerHeight;
      cam.aspect = this.aspect;
      // touch: game scenes sit a touch higher so the controls in the bottom corners cover less of the action
      const lift = this.touch && !this.view.noLift ? this.view.touchLift ?? 0.03 : 0;
      if (lift) cam.setViewOffset(w, h, 0, Math.round(h * lift), w, h);
      else cam.clearViewOffset();
      cam.updateProjectionMatrix();
    }
  }
  render() {
    if (this.view) this.renderer.render(this.view.scene, this.view.camera);
  }
  // Render a scene once at a fixed size and hand back a PNG data URL (menu thumbnails, HUD portraits).
  snapshot(scene, camera, w, h, type = 'image/png') {
    const r = this.renderer;
    r.setPixelRatio(1);
    r.setSize(w, h, false);
    const aspect = camera.aspect;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    r.render(scene, camera);
    const url = r.domElement.toDataURL(type, 0.9);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    r.setPixelRatio(this.dpr);
    this.resize();
    return url;
  }
}

// ---------- scene dressing ----------
export function gradientTexture(stops, h = 512) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = h;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, h);
  stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s));
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Bright, soft studio light — the way vinyl toys are photographed.
export function studio(scene, engine, { sky = ['#CDE9FF', '#FFF1E6'], fog = null, fogNear = 30, fogFar = 80, shadow = 10, sun = [6, 14, 8], sunI = 2.1, hemiI = 1.0, env = 0.5 } = {}) {
  scene.background = gradientTexture(sky);
  scene.environment = engine.env;
  scene.environmentIntensity = env;
  if (fog) scene.fog = new THREE.Fog(fog, fogNear, fogFar);
  const hemi = new THREE.HemisphereLight('#FFFFFF', '#E9D3C2', hemiI);
  const sunL = new THREE.DirectionalLight('#FFF2E0', sunI);
  sunL.position.set(...sun);
  sunL.castShadow = true;
  sunL.shadow.mapSize.set(2048, 2048);
  const c = sunL.shadow.camera;
  c.left = c.bottom = -shadow; c.right = c.top = shadow; c.near = 0.5; c.far = 80;
  sunL.shadow.bias = -0.0004;
  sunL.shadow.normalBias = 0.025;
  sunL.shadow.radius = 3;
  sunL.userData.offset = new THREE.Vector3(...sun);
  scene.add(hemi, sunL, sunL.target);
  // keep the sun (and its shadow box) centred on whatever the camera is watching
  const follow = p => { sunL.target.position.copy(p); sunL.position.copy(p).add(sunL.userData.offset); };
  return { hemi, sun: sunL, follow };
}

// ---------- shared materials + geometry (never disposed) ----------
const mats = new Map();
export function vinyl(color, { rough = 0.36, coat = 0.55, metal = 0, emissive = null, ei = 0, side = THREE.FrontSide } = {}) {
  const key = `v:${color}:${rough}:${coat}:${metal}:${emissive}:${ei}:${side}`;
  if (!mats.has(key)) {
    const m = new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: metal, clearcoat: coat, clearcoatRoughness: 0.16, side });
    if (emissive) { m.emissive.set(emissive); m.emissiveIntensity = ei; }
    m.userData.shared = true;
    mats.set(key, m);
  }
  return mats.get(key);
}
export function matte(color, { rough = 0.8, side = THREE.FrontSide } = {}) {
  const key = `m:${color}:${rough}:${side}`;
  if (!mats.has(key)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, side });
    m.userData.shared = true;
    mats.set(key, m);
  }
  return mats.get(key);
}
const geos = new Map();
export function rbox(w, h, d, r = 0.08, seg = 3) {
  const key = `rb:${w}:${h}:${d}:${r}:${seg}`;
  if (!geos.has(key)) { const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)); g.userData.shared = true; geos.set(key, g); }
  return geos.get(key);
}
export function sharedGeo(key, make) {
  if (!geos.has(key)) { const g = make(); g.userData.shared = true; geos.set(key, g); }
  return geos.get(key);
}
export function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

// Free everything a game/scene created itself; shared + kit resources stay.
export function disposeTree(root) {
  root.traverse(o => {
    if (o.geometry && !o.isSprite && !o.geometry.userData.shared && !o.userData.kit) o.geometry.dispose();
    const list = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of list) {
      if (m.userData.shared) continue;
      if (m.map && !m.map.userData.shared) m.map.dispose();
      m.dispose();
    }
  });
  if (root.background?.isTexture) root.background.dispose();
}

// ---------- the camera rig: smooth follow, fits wide/narrow windows, screen shake ----------
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3(0, 6, 10);
    this.look = new THREE.Vector3();
    this.tPos = this.pos.clone();
    this.tLook = this.look.clone();
    this.speed = 4;
    this.shakeT = 0; this.shakeDur = 1; this.shakeA = 0;
    this.designAspect = 16 / 9;
  }
  to(pos, look, instant = false) {
    this.tPos.copy(pos);
    this.tLook.copy(look);
    if (instant) { this.pos.copy(pos); this.look.copy(look); }
  }
  shake(a = 0.25, dur = 0.35) {
    if (a >= this.shakeA * (this.shakeT / this.shakeDur)) { this.shakeA = a; this.shakeT = this.shakeDur = dur; }
  }
  update(dt) {
    const k = 1 - Math.exp(-this.speed * dt);
    this.pos.lerp(this.tPos, k);
    this.look.lerp(this.tLook, k);
    // narrow windows: back the camera off so the arena still fits
    const fit = clamp(this.designAspect / this.camera.aspect, 1, 2.2) * (this.menu ? 1 : CameraRig.touchFit ?? 1);
    const cam = this.camera;
    cam.position.copy(this.pos).sub(this.look).multiplyScalar(fit).add(this.look);
    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt);
      const a = this.shakeA * (this.shakeT / this.shakeDur);
      cam.position.x += (Math.random() - 0.5) * a;
      cam.position.y += (Math.random() - 0.5) * a;
      cam.position.z += (Math.random() - 0.5) * a * 0.5;
    }
    cam.lookAt(this.look);
  }
}

// ---------- canvas textures ----------
export const FONT = '"Bricolage Grotesque", "Avenir Next", "Segoe UI", system-ui, sans-serif';
export const SCRIPT = 'Pacifico, "Brush Script MT", cursive';

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.canvas = c;
  t.userData.redraw = fn => { g.clearRect(0, 0, w, h); fn(g, w, h); t.needsUpdate = true; };
  return t;
}
export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

// A keyboard key cap (the brand mark): chunky body, softer top, legend printed on top.
const legendCache = new Map();
function legendTexture(label, color) {
  const key = `${label}:${color}`;
  if (!legendCache.has(key)) {
    const t = canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = color;
      g.font = `800 ${label.length > 1 ? 120 : 168}px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, w / 2, h / 2 + 10);
    });
    t.userData.shared = true;
    legendCache.set(key, t);
  }
  return legendCache.get(key);
}
export function keycap(label, { body = '#FFFFFF', top = null, legend = PAL.ink, size = 1 } = {}) {
  const g = new THREE.Group();
  const s = size;
  const base = mesh(rbox(1, 0.52, 1, 0.14, 4), vinyl(body, { rough: 0.32, coat: 0.7 }));
  base.position.y = 0.26;
  const cap = mesh(rbox(0.8, 0.2, 0.8, 0.09, 4), vinyl(top ?? body, { rough: 0.3, coat: 0.75 }));
  cap.position.y = 0.56;
  const lmat = new THREE.MeshBasicMaterial({ map: legendTexture(label, legend), transparent: true, depthWrite: false, toneMapped: false });
  lmat.userData.shared = true;
  const leg = new THREE.Mesh(sharedGeo('legend', () => new THREE.PlaneGeometry(0.72, 0.72)), lmat);
  leg.rotation.x = -Math.PI / 2;
  leg.position.y = 0.665;
  leg.renderOrder = 2;
  g.add(base, cap, leg);
  g.scale.setScalar(s);
  return g;
}

// Puffy vinyl cloud
export function cloud(scale = 1, color = '#FFFFFF') {
  const g = new THREE.Group();
  const m = vinyl(color, { rough: 0.55, coat: 0.2 });
  const geo = sharedGeo('sphere32', () => new THREE.SphereGeometry(1, 32, 20));
  for (const [x, y, z, r] of [[0, 0, 0, 1], [1.1, -0.2, 0.1, 0.75], [-1.1, -0.25, 0, 0.72], [0.45, 0.45, -0.2, 0.7], [-0.5, 0.3, 0.2, 0.62], [1.8, -0.4, 0, 0.45], [-1.8, -0.45, 0.1, 0.42]]) {
    const s = mesh(geo, m, { cast: false });
    s.position.set(x, y, z);
    s.scale.set(r, r * 0.86, r);
    g.add(s);
  }
  g.scale.setScalar(scale);
  return g;
}
