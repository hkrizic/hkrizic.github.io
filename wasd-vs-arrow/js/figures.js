// Vinyl collectible figures, assembled from the parts kit modelled in Blender (tools/blender/build_pop_kit.py →
// assets/models/pop_kit.glb). Every part's origin sits on its joint (neck, shoulder, hip), so the toy swings
// rigid parts like a real vinyl figure. Materials are cloned and recoloured per figure.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { TEAM, vinyl, sharedGeo, canvasTexture, FONT } from './engine.js';
import { seeded, wrapAngle } from './util.js';

let KIT = null;
export async function loadKit(onProgress) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const g = await loader.loadAsync('assets/models/pop_kit.glb', e => onProgress?.(e.loaded / (e.total || 920000)));
  KIT = g.scene;
}

const SKIN = ['#FBE3D1', '#F6D5BC', '#EFC19E', '#E0A77E', '#C68A62', '#A86B48', '#8A5536', '#5E3A26'];

// The collection. Numbers are printed on the boxes like real collectibles.
export const ROSTER = [
  { no: 1, name: 'BLAZE', skin: SKIN[1], hair: '#D9482F', hairStyle: 'spiky', torso: 'hoodie', sleeves: 'long', top: '#FF6F59', accent2: '#FFC145', pants: '#232B45', legs: 'LegSneaker', shoes: '#FFFFFF', face: ['Brows_thick'] },
  { no: 2, name: 'DJ NOODLE', skin: SKIN[6], hair: '#1E1A18', hairStyle: 'afro', torso: 'stripes', sleeves: 'short', top: '#A594F9', accent2: '#FFFFFF', pants: '#2C3E5C', legs: 'LegSneaker', shoes: '#FFC145', face: ['Brows_thin'], extra: 'Headphones', accent: '#FF5CA8' },
  { no: 3, name: 'CPT. WAFFLE', skin: SKIN[2], hair: '#6B4423', hairStyle: 'short', torso: 'tee', sleeves: 'short', top: '#FFC145', accent2: '#FFFFFF', pants: '#3F5E8C', legs: 'LegBoot', shoes: '#8B5A3C', face: ['Brows_thick'], extra: 'Cap', accentHat: '#E4572E', cape: '#E4572E' },
  { no: 4, name: 'PROF. PIXEL', skin: SKIN[0], hair: '#E9E6E1', hairStyle: 'sidepart', torso: 'sweater', sleeves: 'long', top: '#2EC4B6', accent2: '#FFFFFF', pants: '#6B7280', legs: 'Leg', shoes: '#23252B', face: ['Brows_arch', 'Moustache'], extra: 'Glasses' },
  { no: 5, name: 'LUNA', skin: SKIN[3], hair: '#A594F9', hairStyle: 'long', torso: 'overalls', sleeves: 'short', top: '#7FB3E6', accent2: '#FFFFFF', pants: '#3F5E8C', legs: 'LegSneaker', shoes: '#FF8FB1', face: ['Brows_thin', 'Blush'], extra: 'Flower', accent: '#FFC145' },
  { no: 6, name: 'ROCKO', skin: SKIN[4], hair: '#2B211C', hairStyle: 'short', torso: 'jacket', sleeves: 'long', top: '#6B7045', accent2: '#E0C9A6', pants: '#23252B', legs: 'LegBoot', shoes: '#6E4B34', face: ['Brows_thick', 'Beard'], extra: 'Beanie', accentHat: '#FF6F59' },
  { no: 7, name: 'MOCHI', skin: SKIN[1], hair: '#F28FB8', hairStyle: 'puffs', torso: 'tee', sleeves: 'short', top: '#FFFFFF', accent2: '#FF8FB1', pants: '#A594F9', legs: 'LegShorts', shoes: '#FFFFFF', face: ['Brows_thin', 'Blush'] },
  { no: 8, name: 'AGENT ZERO', skin: SKIN[5], hair: '#1E1A18', hairStyle: 'swoop', torso: 'suit', sleeves: 'long', top: '#232B45', accent2: '#FFFFFF', pants: '#232B45', legs: 'Leg', shoes: '#1C1E24', face: ['Brows_thick'], extra: 'Sunglasses', accent: '#FF6F59' },
  { no: 9, name: 'SUNNY', skin: SKIN[2], hair: '#E8D3A0', hairStyle: 'bob', torso: 'polo', sleeves: 'short', top: '#FFC145', accent2: '#FFFFFF', pants: '#FFFFFF', legs: 'LegShorts', shoes: '#2EC4B6', face: ['Brows_arch', 'Earrings'], extra: 'Visor', accentHat: '#2EC4B6' },
  { no: 10, name: 'KOJI', skin: SKIN[3], hair: '#1E1A18', hairStyle: 'topknot', torso: 'vest', sleeves: 'long', top: '#232B45', accent2: '#FF6F59', pants: '#C2A878', legs: 'LegSneaker', shoes: '#FF6F59', face: ['Brows_thick', 'Goatee'] },
  { no: 11, name: 'BIBI', skin: SKIN[7], hair: '#3B2A20', hairStyle: 'braid', torso: 'shirt', sleeves: 'long', top: '#FF8FB1', accent2: '#FFFFFF', pants: '#2C3E5C', legs: 'LegSneaker', shoes: '#FFFFFF', face: ['Brows_arch'], extra: 'BucketHat', accentHat: '#FFC145' },
  { no: 12, name: 'TURBO', skin: SKIN[2], hair: '#2EC4B6', hairStyle: 'mohawk', torso: 'jacket', sleeves: 'long', top: '#232B45', accent2: '#FFC145', pants: '#4A505C', legs: 'LegBoot', shoes: '#23252B', face: ['Brows_thick', 'Earrings'] },
];

// ---------- random figures (the shuffle button) ----------
const HAIR = ['#1E1A18', '#2B211C', '#3B2A20', '#6B4423', '#A0612B', '#C9A36A', '#E8D3A0', '#B5472A', '#9AA0A8', '#E9E6E1', '#F28FB8', '#7FD1C7', '#A594F9', '#FF6F59', '#5B8DEF'];
const TOPS = ['#FF6F59', '#FFC145', '#2EC4B6', '#A594F9', '#FF8FB1', '#7ED6A5', '#232B45', '#FFFFFF', '#5B8DEF', '#F28C28', '#E0C9A6'];
const PANTS = ['#3F5E8C', '#2C3E5C', '#23252B', '#6B7280', '#C2A878', '#6B7045', '#E9E1D0', '#A594F9', '#FF8FB1'];
const SHOES = ['#F4F1EC', '#23252B', '#FF6F59', '#2EC4B6', '#FFC145', '#232B45', '#A594F9'];
const HAT = ['#E8744F', '#2EC4B6', '#FFC145', '#232B45', '#A594F9', '#F6F1EA', '#FF5CA8'];
const HAIRSTYLES = { short: 1, swoop: 0, bun: 0, curly: 0, long: 1, buzz: 1, ponytail: 1, afro: 0, mohawk: 0, bob: 1, puffs: 0, spiky: 0, sidepart: 1, topknot: 0, wavy: 1, braid: 1 };
const OUTFITS = { tee: ['short'], hoodie: ['long'], shirt: ['long', 'short'], sweater: ['long'], jacket: ['long'], overalls: ['short', 'long'], stripes: ['short', 'long'], polo: ['short'], vest: ['long'] };
const SYL_A = ['ZIG', 'POP', 'BUB', 'WIG', 'NOO', 'MO', 'PIX', 'DOO', 'FIZ', 'BOO', 'TOF', 'KIK', 'JEL', 'WOB', 'SQUI', 'TAR', 'GOO', 'MUF'];
const SYL_B = ['GY', 'PY', 'BLES', 'DLE', 'CHI', 'ZY', 'LO', 'BOP', 'MO', 'FIN', 'TO', 'NUT', 'SY', 'KO', 'RIO'];

export function randomLook(seed = Math.random()) {
  const r = seeded(Math.floor(seed * 1e9));
  const p = a => a[Math.floor(r() * a.length)];
  let hairStyle = p(Object.keys(HAIRSTYLES));
  const torso = p(Object.keys(OUTFITS));
  const roll = r();
  let extra = roll < 0.18 ? 'Glasses' : roll < 0.3 ? 'Headphones' : roll < 0.38 ? 'Beanie' : roll < 0.46 ? 'Cap' : roll < 0.52 ? 'BucketHat'
    : roll < 0.57 ? 'Headband' : roll < 0.62 ? 'Visor' : roll < 0.67 ? 'Flower' : roll < 0.72 ? 'Sunglasses' : null;
  if (['Beanie', 'Cap', 'BucketHat', 'Visor'].includes(extra) && !HAIRSTYLES[hairStyle]) hairStyle = p(['short', 'buzz', 'long', 'bob', 'sidepart']);
  if (extra === 'Headband' && ['afro', 'mohawk', 'spiky', 'puffs', 'topknot'].includes(hairStyle)) extra = null;
  const face = [p(['Brows_thin', 'Brows_thick', 'Brows_arch'])];
  const f = r();
  if (f < 0.12) face.push('Beard'); else if (f < 0.2) face.push('Moustache'); else if (f < 0.25) face.push('Goatee');
  if (r() < 0.3) face.push('Blush');
  if (r() < 0.2) face.push('Earrings');
  return {
    no: 0, name: p(SYL_A) + p(SYL_B), skin: p(SKIN), hair: p(HAIR), hairStyle, torso, sleeves: p(OUTFITS[torso]),
    top: p(TOPS), accent2: p(['#FFFFFF', '#FFC145', '#2EC4B6', '#FF8FB1', '#232B45', '#A594F9']), pants: p(PANTS),
    legs: p(['LegSneaker', 'LegSneaker', 'Leg', 'LegBoot', 'LegShorts']), shoes: p(SHOES), face, extra,
    accent: p(['#FFFFFF', '#FF5CA8', '#FFC145', '#2EC4B6']), accentHat: p(HAT), cape: r() < 0.15 ? p(HAT) : null, random: true,
  };
}

// ---------- shared bits ----------
const starGeo = () => sharedGeo('star', () => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.42 : 1;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2 });
  g.center();
  return g;
});
export { starGeo };

const badgeCache = new Map();
function badgeTexture(team) {
  if (!badgeCache.has(team)) {
    const T = TEAM[team];
    const t = canvasTexture(256, 96, (g, w, h) => {
      g.fillStyle = T.color;
      g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 40); g.fill();
      g.lineWidth = 6; g.strokeStyle = '#FFFFFF'; g.stroke();
      g.fillStyle = '#FFFFFF';
      g.font = `800 46px ${FONT}`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(team ? '↑←↓→' : 'WASD', w / 2, h / 2 + 3);
    });
    t.userData.shared = true;
    badgeCache.set(team, t);
  }
  return badgeCache.get(team);
}

const SOOT = new THREE.Color('#2A2420');

export class Figure {
  constructor(look) {
    this.look = look;
    this.root = new THREE.Group();     // placed by games (position + facing)
    this.tumble = new THREE.Group();   // free rotation for falls/blasts
    this.model = new THREE.Group();    // animated bob/sway/tilt
    this.root.add(this.tumble);
    this.tumble.add(this.model);
    this.root.userData.figure = this;

    const colors = { skin: look.skin, hair: look.hair, top: look.top, pants: look.pants, shoes: look.shoes, accent: look.accent ?? '#FFFFFF', accent2: look.accent2 ?? '#FFFFFF' };
    const cache = {};
    this.mats = [];
    const recolor = (obj, over = {}) => obj.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.userData.kit = true;
      const role = o.material.name;
      const c = over[role] ?? colors[role];
      if (!c) return;
      const key = `${role}:${c}`;
      if (!cache[key]) {
        const m = o.material.clone();
        m.color.set(c);
        m.userData.base = m.color.clone();
        cache[key] = m;
        this.mats.push(m);
      }
      o.material = cache[key];
    });
    const part = name => {
      const src = KIT.getObjectByName(name);
      const p = src.clone(true);
      p.userData.pivot = src.position.clone();
      return p;
    };
    const attach = (parent, p, parentPivot) => { p.position.copy(p.userData.pivot).sub(parentPivot); parent.add(p); return p; };
    const ORIGIN = new THREE.Vector3();

    this.legs = ['L', 'R'].map(n => { const l = part(look.legs + n); recolor(l); return attach(this.model, l, ORIGIN); });
    this.torso = part(`Torso_${look.torso}`);
    recolor(this.torso);
    attach(this.model, this.torso, ORIGIN);
    const hips = this.torso.userData.pivot;
    const arm = side => (look.sleeves === 'short' ? `ArmShort${side}` : `Arm${side}`);
    this.arms = ['L', 'R'].map(n => { const a = part(arm(n)); recolor(a); return attach(this.torso, a, hips); });
    if (look.cape) { const c = part('Cape'); recolor(c, { accent: look.cape }); attach(this.torso, c, hips); }
    this.head = part('Head');
    recolor(this.head);
    attach(this.torso, this.head, hips);
    const neck = this.head.userData.pivot;
    this.eyes = ['EyeL', 'EyeR'].map(n => { const e = part(n); recolor(e); return attach(this.head, e, neck); });
    if (look.hairStyle && look.hairStyle !== 'none') { const h = part(`Hair_${look.hairStyle}`); recolor(h); attach(this.head, h, neck); }
    for (const f of look.face ?? []) {
      const p = part(f);
      recolor(p);
      attach(this.head, p, neck);
      if (f.startsWith('Brows')) this.brows = p;
    }
    if (look.extra) { const e = part(look.extra); recolor(e, look.accentHat ? { accent: look.accentHat } : {}); attach(this.head, e, neck); }

    // dizzy stars orbit the head
    this.stars = new THREE.Group();
    this.stars.position.y = 1.2;
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(starGeo(), vinyl('#FFC145', { rough: 0.25, coat: 0.8 }));
      s.scale.setScalar(0.07);
      s.userData.a = (i / 3) * Math.PI * 2;
      this.stars.add(s);
    }
    this.stars.visible = false;
    this.model.add(this.stars);

    this.t = Math.random() * 10;
    this.phase = 0;
    this.pose = 'auto';    // auto = idle/run from .speed; or an explicit pose
    this.speed = 0;        // ground speed (m/s), drives the run cycle
    this.armsUp = false;   // carrying something overhead
    this.push = 0;         // >0: arms forward (bump/dash)
    this.squash = 0;
    this.soot = 0;
    this.facing = 0;
    this.targetFacing = 0;
    this.turnRate = 14;
    this.nextBlink = 1 + Math.random() * 3;
    this.dizzy = 0;
    this.steer = 0;        // -1..1 for the 'drive' pose
    this.custom = null;
  }

  // ring under the feet in the team colour + a floating badge so you always know who is who
  setTeam(team) {
    const T = TEAM[team];
    this.team = team;
    const ring = new THREE.Mesh(sharedGeo('teamRing', () => new THREE.TorusGeometry(0.4, 0.04, 10, 48)), vinyl(T.color, { rough: 0.3, coat: 0.8 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    const chevron = new THREE.Mesh(sharedGeo('chevron', () => {
      const s = new THREE.Shape();
      s.moveTo(0, 0.17); s.lineTo(0.13, 0); s.lineTo(-0.13, 0); s.closePath();
      return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false });
    }), vinyl(T.color, { rough: 0.3, coat: 0.8 }));
    chevron.rotation.x = -Math.PI / 2;
    chevron.position.set(0, 0.02, 0.47);
    const blob = new THREE.Mesh(sharedGeo('blob', () => new THREE.CircleGeometry(0.36, 32)), (Figure.blobMat ||= Object.assign(new THREE.MeshBasicMaterial({ color: '#2A2030', transparent: true, opacity: 0.18, depthWrite: false }), { userData: { shared: true } })));
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.012;
    this.ring = new THREE.Group();
    this.ring.add(ring, chevron, blob);
    this.root.add(this.ring);
    const bm = new THREE.SpriteMaterial({ map: badgeTexture(team), depthTest: false, transparent: true });
    this.badge = new THREE.Sprite(bm);
    this.badge.scale.set(0.62, 0.23, 1);
    this.badge.position.y = 1.55;
    this.badge.renderOrder = 10;
    this.root.add(this.badge);
    return this;
  }
  showBadge(on) { if (this.badge) this.badge.visible = on; }

  face(angle, instant = false) {
    this.targetFacing = angle;
    if (instant) { this.facing = angle; this.root.rotation.y = angle; }
  }
  land(k = 1) { this.squash = Math.max(this.squash, k); }
  setSoot(v) {
    this.soot = v;
    for (const m of this.mats) m.color.copy(m.userData.base).lerp(SOOT, v * 0.8);
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    let diff = wrapAngle(this.targetFacing - this.facing);
    this.facing += diff * Math.min(1, dt * this.turnRate);
    this.root.rotation.y = this.facing;

    let y = 0, lean = 0, sway = 0, tiltX = 0, headX = 0, headY = 0, headZ = Math.sin(t * 0.8) * 0.03;
    let la = 0.05, ra = 0.05, laZ = -0.04, raZ = 0.04, ll = 0, rl = 0;
    let pose = this.pose;
    if (pose === 'auto') pose = this.speed > 0.25 ? 'run' : 'idle';
    switch (pose) {
      case 'run': {
        const sp = Math.min(1.4, this.speed / 4.5);
        this.phase += dt * (5 + this.speed * 2.4);
        const w = this.phase;
        const amp = 0.35 + sp * 0.45;
        ll = Math.sin(w) * amp; rl = -ll;
        la = -Math.sin(w) * amp * 1.1; ra = -la;
        y = Math.abs(Math.sin(w)) * (0.03 + sp * 0.04);
        sway = Math.sin(w) * 0.06;
        lean = 0.08 + sp * 0.12;
        headZ = Math.sin(w) * 0.05;
        break;
      }
      case 'air': la = ra = -2.5; laZ = 0.55; raZ = -0.55; ll = -0.7; rl = 0.35; lean = 0.1; headX = -0.15; break;
      case 'teeter': {
        const w = t * 15;
        la = -1.7 + Math.sin(w) * 1.5; ra = -1.7 + Math.sin(w + Math.PI) * 1.5; laZ = 0.7; raZ = -0.7;
        lean = Math.sin(t * 7) * 0.28; headZ = Math.sin(t * 8) * 0.16; sway = Math.sin(t * 7) * 0.08;
        break;
      }
      case 'fall': {
        const w = t * 18;
        la = -2.8 + Math.sin(w) * 0.5; ra = -2.8 + Math.sin(w + 1) * 0.5; laZ = 0.45; raZ = -0.45;
        ll = Math.sin(w) * 0.9; rl = -ll; headX = -0.3;
        break;
      }
      case 'dizzy': headZ = Math.sin(t * 5) * 0.25; headX = Math.sin(t * 3.5) * 0.12; sway = Math.sin(t * 5) * 0.09; la = ra = 0.2; break;
      case 'celebrate': la = ra = -2.9 - Math.sin(t * 12) * 0.25; laZ = 0.45; raZ = -0.45; y = 0.2 * Math.abs(Math.sin(t * 7)); headX = -0.18; break;
      case 'dance': {
        const w = t * 8.5;
        sway = Math.sin(w) * 0.16;
        la = -2.6 + Math.sin(w) * 0.7; ra = -0.4 - Math.sin(w) * 0.5; laZ = 0.3; raZ = -0.3;
        y = 0.06 * Math.abs(Math.sin(w));
        headZ = Math.sin(w) * 0.16; headY = Math.sin(w * 0.5) * 0.3;
        ll = -Math.max(0, Math.sin(w)) * 0.5; rl = -Math.max(0, -Math.sin(w)) * 0.5;
        break;
      }
      case 'sad': headX = 0.5; la = ra = 0.12; lean = 0.18; y = -0.01; laZ = 0.12; raZ = -0.12; break;
      case 'wave': ra = -2.9 + Math.sin(t * 9) * 0.25; raZ = 0.35 + Math.sin(t * 9) * 0.25; headZ = 0.1; la = Math.sin(t * 1.3) * 0.04; break;
      case 'flat': tiltX = Math.PI / 2; y = 0.14; la = ra = -2.9; laZ = 0.6; raZ = -0.6; break;
      case 'limbo': lean = -1.05; ll = rl = -0.55; la = ra = -0.6; laZ = 0.9; raZ = -0.9; headX = -0.25; y = -0.04; break;
      case 'crouch': lean = 0.55; ll = -0.65; rl = 0.45; la = 0.7; ra = -0.7; y = -0.06; headX = -0.35; break;
      case 'blasted': la = ra = -2.6; laZ = 0.9; raZ = -0.9; ll = -0.5; rl = 0.5; headX = -0.3; break;
      case 'cheer': la = ra = -2.7 + Math.sin(t * 10) * 0.3; laZ = 0.3; raZ = -0.3; y = 0.08 * Math.abs(Math.sin(t * 5)); break;
      case 'sit': ll = rl = -Math.PI / 2; la = ra = -0.35; y = 0; break; // legs straight out, like a vinyl figure on a seat
      case 'drive': ll = rl = -Math.PI / 2; la = ra = -1.25; laZ = 0.18; raZ = -0.18; lean = 0.08; headZ = this.steer * -0.12; sway = this.steer * 0.1; break;
      case 'throw': { // wind up and fling with the right arm (set .throwT = 0 to restart)
        const k = Math.min(1, (this.throwT = (this.throwT ?? 1) + dt) / 0.35);
        ra = k < 0.4 ? -2.6 * (k / 0.4) : -2.6 + (k - 0.4) / 0.6 * 3.6; raZ = 0.2; la = -0.6; lean = k < 0.4 ? -0.1 : 0.2; headX = -0.1;
        break;
      }
      default: // idle: breathing + the occasional glance
        la = Math.sin(t * 1.3) * 0.04; ra = -la;
        headY = Math.sin(t * 0.5) * 0.18;
        y = Math.sin(t * 2.2) * 0.006;
    }
    if (this.armsUp && pose !== 'flat' && pose !== 'blasted') { la = ra = -2.95; laZ = -0.25; raZ = 0.25; }
    // games can override single joints: fig.custom = { ra: -1.5, headY: 0.3, ... } (null to clear)
    if (this.custom) ({ la = la, ra = ra, laZ = laZ, raZ = raZ, ll = ll, rl = rl, lean = lean, sway = sway, tiltX = tiltX, y = y, headX = headX, headY = headY, headZ = headZ } = this.custom);
    if (this.push > 0) {
      this.push -= dt;
      la = ra = -1.55; laZ = 0.2; raZ = -0.2; lean += 0.15;
    }
    if (this.dizzy > 0 && pose !== 'dizzy') { this.dizzy -= dt; headZ += Math.sin(t * 6) * 0.2; }

    const k = Math.min(1, dt * 12);
    const L = (a, b) => a + (b - a) * k;
    this.model.position.y = L(this.model.position.y, y);
    this.model.rotation.z = L(this.model.rotation.z, sway);
    this.model.rotation.x = L(this.model.rotation.x, tiltX);
    this.torso.rotation.x = L(this.torso.rotation.x, lean);
    this.head.rotation.x = L(this.head.rotation.x, headX);
    this.head.rotation.y = L(this.head.rotation.y, headY);
    this.head.rotation.z = L(this.head.rotation.z, headZ);
    const [LA, RA] = this.arms, [LL, RL] = this.legs;
    LA.rotation.x = L(LA.rotation.x, la); RA.rotation.x = L(RA.rotation.x, ra);
    LA.rotation.z = L(LA.rotation.z, laZ); RA.rotation.z = L(RA.rotation.z, raZ);
    LL.rotation.x = L(LL.rotation.x, ll); RL.rotation.x = L(RL.rotation.x, rl);

    // squash & stretch on landings — that bouncy vinyl feel
    if (this.squash > 0.001) {
      this.squash *= Math.exp(-9 * dt);
      const s = Math.sin(this.squash * Math.PI) * this.squash;
      this.model.scale.set(1 + s * 0.18, 1 - s * 0.26, 1 + s * 0.18);
    } else this.model.scale.set(1, 1, 1);

    // blink
    this.nextBlink -= dt;
    let eh = 1;
    if (pose === 'dizzy' || pose === 'blasted') eh = 0.35;
    else if (this.nextBlink < 0) { eh = 0.1; if (this.nextBlink < -0.12) this.nextBlink = 2 + Math.random() * 4; }
    for (const e of this.eyes) e.scale.y = eh;
    if (this.brows) {
      this._browY ??= this.brows.position.y;
      const lift = pose === 'sad' ? -0.012 : pose === 'celebrate' || pose === 'fall' || pose === 'teeter' ? 0.016 : this.speed > 4 ? -0.006 : 0;
      this.brows.position.y += (this._browY + lift - this.brows.position.y) * k;
    }

    const showStars = pose === 'dizzy' || this.dizzy > 0;
    this.stars.visible = showStars;
    if (showStars) {
      for (const s of this.stars.children) {
        const a = s.userData.a + t * 4;
        s.position.set(Math.cos(a) * 0.32, Math.sin(t * 6 + s.userData.a) * 0.04, Math.sin(a) * 0.32);
        s.rotation.y = t * 5;
      }
    }
  }
}
