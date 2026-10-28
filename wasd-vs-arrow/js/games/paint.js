// PAINT PANIC — run over tiles to paint them your colour. Power-ups: splat bomb, speed bolt, big brush.
import * as THREE from 'three';
import { BaseGame } from './base.js';
import { studio, vinyl, mesh, rbox, sharedGeo, TEAM, PAL } from '../engine.js';
import { sfx } from '../audio.js';
import { rand, pick, clamp } from '../util.js';

const COLS = 15, ROWS = 10, S = 1.0, TIME = 45;
const X0 = -((COLS - 1) / 2) * S, Z0 = -((ROWS - 1) / 2) * S;
const NEUTRAL = ['#F4ECDF', '#ECE2D2'];
const POWERS = ['bomb', 'speed', 'brush'];

export class PaintPanic extends BaseGame {
  static meta = {
    touch: { stick: 'Run & paint (push further = faster)', button: ['DASH', 'dash', 'Quick burst of speed'] },
    id: 'paint', title: 'Paint Panic', icon: '🎨', color: '#FFC145', ink: '#5C3D00', rounds: 1, hud: ['timer', 'bar'], figScale: 1.3,
    tagline: 'Cover the floor in your colour. Most tiles wins!',
    goal: 'Run over tiles to paint them. Grab power-ups: 💣 splat, ⚡ speed, 🖌️ big brush. Most tiles after 45 s wins!',
    controls: [['move', 'Run & paint'], ['tap2', 'Double-tap = dash']],
  };

  build() {
    this.lights = studio(this.scene, this.app.engine, { sky: ['#FFE2B8', '#FFF0DA', '#FFF8EE'], fog: '#FFF1DE', fogNear: 30, fogFar: 70, shadow: 10, sun: [-5, 14, 8] });
    // ground with old paint splats
    const ground = mesh(new THREE.CircleGeometry(60, 64), vinyl('#FFE6C4', { rough: 0.85, coat: 0 }), { cast: false });
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.62;
    this.scene.add(ground);
    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2), d = rand(10.5, 20);
      const s = mesh(sharedGeo('splat', () => new THREE.SphereGeometry(1, 24, 10)), vinyl(pick([PAL.coral, PAL.teal, PAL.lilac, PAL.mustard, PAL.pink]), { rough: 0.3, coat: 0.7 }), { cast: false });
      s.scale.set(rand(0.4, 1.3), 0.05, rand(0.4, 1.3));
      s.position.set(Math.cos(a) * d, -0.6, Math.sin(a) * d * 0.7);
      this.scene.add(s);
    }
    // the board
    const base = mesh(rbox(COLS * S + 1.3, 0.7, ROWS * S + 1.3, 0.25, 4), vinyl(PAL.lilac, { rough: 0.35, coat: 0.6 }));
    base.position.y = -0.48;
    this.scene.add(base);
    const tileGeo = rbox(0.9, 0.24, 0.9, 0.08, 3);
    this.tiles = new THREE.InstancedMesh(tileGeo, new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.15 }), COLS * ROWS);
    this.tiles.receiveShadow = true;
    this.tiles.castShadow = true;
    this.scene.add(this.tiles);
    this.owner = new Int8Array(COLS * ROWS);
    this.pop = new Float32Array(COLS * ROWS);
    this.anim = new Set();
    this.m4 = new THREE.Matrix4();
    // rails around the board
    const rail = vinyl('#FFFFFF', { rough: 0.25, coat: 0.8 });
    for (const [w, d, x, z] of [[COLS * S + 1.3, 0.34, 0, -(ROWS * S + 1.3) / 2], [COLS * S + 1.3, 0.34, 0, (ROWS * S + 1.3) / 2], [0.34, ROWS * S + 1.3, -(COLS * S + 1.3) / 2, 0], [0.34, ROWS * S + 1.3, (COLS * S + 1.3) / 2, 0]]) {
      const r = mesh(rbox(w, 0.42, d, 0.16, 3), rail);
      r.position.set(x, 0.05, z);
      this.scene.add(r);
    }
    for (const [x, z, c] of [[-1, -1, PAL.coral], [1, -1, PAL.teal], [-1, 1, PAL.coral], [1, 1, PAL.teal]]) {
      const post = mesh(sharedGeo('post', () => new THREE.SphereGeometry(0.42, 28, 18)), vinyl(c, { rough: 0.25, coat: 0.8 }));
      post.position.set(x * (COLS * S + 1.3) / 2, 0.3, z * (ROWS * S + 1.3) / 2);
      this.scene.add(post);
    }
    // tipped-over paint buckets with puddles, one per team on each side
    for (const [x, z, team, rot] of [[-10.2, -2.5, 0, 0.4], [-10.6, 3.2, 0, -0.5], [10.2, -2.8, 1, 2.6], [10.5, 3.0, 1, -2.4]]) {
      const c = TEAM[team].color;
      const g = new THREE.Group();
      const bucket = mesh(new THREE.CylinderGeometry(0.55, 0.45, 1.0, 32, 1, true), vinyl('#E9EEF5', { rough: 0.25, coat: 0.6, metal: 0.3, side: THREE.DoubleSide }));
      bucket.rotation.z = Math.PI / 2 - 0.15;
      bucket.position.set(0, 0.5, 0);
      const bottom = mesh(new THREE.CircleGeometry(0.45, 32), vinyl('#E9EEF5', { rough: 0.25, coat: 0.6, metal: 0.3, side: THREE.DoubleSide }));
      bottom.rotation.y = Math.PI / 2; bottom.position.set(-0.5, 0.42, 0);
      const handle = mesh(new THREE.TorusGeometry(0.5, 0.03, 8, 32, Math.PI), vinyl('#9AA3AF', { rough: 0.3, metal: 0.6 }));
      handle.position.set(0, 0.5, 0); handle.rotation.y = Math.PI / 2;
      const puddle = mesh(sharedGeo('splat', () => new THREE.SphereGeometry(1, 24, 10)), vinyl(c, { rough: 0.15, coat: 1 }), { cast: false });
      puddle.scale.set(1.5, 0.06, 1.0); puddle.position.set(1.3, 0.02, 0.1);
      g.add(bucket, bottom, handle, puddle);
      g.position.set(x, -0.6, z);
      g.rotation.y = rot;
      this.scene.add(g);
    }
    this.powerups = [];
    this.pending = []; // delayed paint (bomb ripples)
  }

  tileColor(i, owner) {
    if (owner < 0) return NEUTRAL[(i % COLS + Math.floor(i / COLS)) % 2];
    const c = new THREE.Color(TEAM[owner].color);
    const hsl = {}; c.getHSL(hsl);
    return c.setHSL(hsl.h, hsl.s, clamp(hsl.l + ((i * 7919) % 11 - 5) * 0.006, 0, 1));
  }
  setTileMatrix(i, b = 0) {
    const x = X0 + (i % COLS) * S, z = Z0 + Math.floor(i / COLS) * S;
    this.m4.makeScale(1 + b * 0.12, 1 + b * 0.9, 1 + b * 0.12);
    this.m4.setPosition(x, -0.12 + b * 0.16, z);
    this.tiles.setMatrixAt(i, this.m4);
  }

  resetRound() {
    this.owner.fill(-1);
    this.counts = [0, 0];
    this.anim.clear();
    this.pending = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      this.setTileMatrix(i);
      this.tiles.setColorAt(i, new THREE.Color(this.tileColor(i, -1)));
    }
    this.tiles.instanceMatrix.needsUpdate = true;
    this.tiles.instanceColor.needsUpdate = true;
    for (const pu of this.powerups) pu.group.removeFromParent();
    this.powerups = [];
    this.spawnT = 3;
    this.timeLeft = TIME;
    this.lastBeep = 99;
    this.players.forEach((p, i) => {
      p.pos.set(i ? 5.5 : -5.5, 0, 0);
      p.vel.set(0, 0, 0);
      p.stun = 0; p.dashCd = 0; p.speedMul = 1; p.boostT = 0; p.brushT = 0;
      p.fig.pose = 'auto';
      p.fig.face(i ? -Math.PI / 2 : Math.PI / 2, true);
    });
    this.ui?.hudBar?.(0, 0);
  }
  onCountdown() { this.ui.hudTimer(TIME); this.ui.hudBar(0, 0); }

  tileAt(x, z) {
    const c = Math.round((x - X0) / S), r = Math.round((z - Z0) / S);
    return c < 0 || r < 0 || c >= COLS || r >= ROWS ? -1 : r * COLS + c;
  }
  paint(i, id, quiet = false) {
    if (i < 0 || this.owner[i] === id) return false;
    if (this.owner[i] >= 0) this.counts[this.owner[i]]--;
    this.owner[i] = id;
    this.counts[id]++;
    this.tiles.setColorAt(i, this.tileColor(i, id));
    this.tiles.instanceColor.needsUpdate = true;
    this.pop[i] = 1;
    this.anim.add(i);
    if (!quiet) sfx.paint();
    return true;
  }

  tick(dt) {
    if (this.live) {
      this.timeLeft -= dt;
      this.ui.hudTimer(Math.max(0, this.timeLeft));
      const sec = Math.ceil(this.timeLeft);
      if (sec <= 5 && sec < this.lastBeep && sec > 0) { this.lastBeep = sec; sfx.beep(); this.ui.big(String(sec), 'num small'); }
    }
    const hx = (COLS * S) / 2 - 0.32, hz = (ROWS * S) / 2 - 0.32;
    for (const p of this.players) {
      this.timers(p, dt);
      if (p.brushT > 0) p.brushT -= dt;
      this.tryDash(p, { power: 10, cd: 1.2 });
      this.moveTopDown(p, dt, { accel: 34, max: 5.0, drag: 9, grip: 4 });
      if (Math.abs(p.pos.x) > hx) { p.pos.x = Math.sign(p.pos.x) * hx; p.vel.x *= -0.3; }
      if (Math.abs(p.pos.z) > hz) { p.pos.z = Math.sign(p.pos.z) * hz; p.vel.z *= -0.3; }
      if (this.state === 'play') {
        const i = this.tileAt(p.pos.x, p.pos.z);
        if (i >= 0) {
          if (p.brushT > 0) {
            const c = i % COLS, r = Math.floor(i / COLS);
            for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
              const cc = c + dx, rr = r + dz;
              if (cc >= 0 && rr >= 0 && cc < COLS && rr < ROWS) this.paint(rr * COLS + cc, p.id, !(dx === 0 && dz === 0));
            }
          } else if (this.paint(i, p.id) && Math.random() < 0.25) {
            this.fx.burst(p.pos.clone().setY(0.1), TEAM[p.id].color, { n: 3, speed: 1.5, up: 2, size: 0.07, geo: 'drop' });
          }
        }
        if (p.boostT > 0 && Math.random() < 0.4) this.fx.puff(p.pos.clone().setY(0.15), { n: 1, color: '#FFE08A', size: 0.12, speed: 0.4, life: 0.4 });
      }
      if (this.state === 'over' || this.state === 'roundEnd') p.fig.pose = p.fig.pose === 'auto' ? 'auto' : p.fig.pose;
    }
    this.bump(this.players[0], this.players[1], { radius: 0.5, e: 0.7, kick: 1.4 });

    // delayed bomb ripples
    for (let k = this.pending.length - 1; k >= 0; k--) {
      const pd = this.pending[k];
      pd.t -= dt;
      if (pd.t <= 0) { this.paint(pd.i, pd.id, true); this.pending.splice(k, 1); }
    }
    // power-ups
    if (this.live) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.powerups.length < 2) { this.spawnPower(); this.spawnT = rand(4.5, 7); }
      for (let k = this.powerups.length - 1; k >= 0; k--) {
        const pu = this.powerups[k];
        for (const p of this.players) {
          if (Math.hypot(p.pos.x - pu.x, p.pos.z - pu.z) < 0.65) { this.collect(p, pu); this.powerups.splice(k, 1); break; }
        }
      }
    }
    this.ui.hudBar(this.counts[0] / (COLS * ROWS), this.counts[1] / (COLS * ROWS));
    if (this.live && this.timeLeft <= 0) {
      const [a, b] = this.counts, total = COLS * ROWS;
      const pa = Math.round((a / total) * 100), pb = Math.round((b / total) * 100);
      sfx.whistle();
      if (a === b) this.endRound(null, `TIE! ${pa}% – ${pb}%`);
      else this.endRound(a > b ? 0 : 1, `${this.name(a > b ? 0 : 1)} WINS ${Math.max(pa, pb)}%!`);
    }
  }

  spawnPower() {
    const kind = pick(POWERS);
    let x, z, tries = 0;
    do {
      x = X0 + Math.floor(rand(1, COLS - 1)) * S;
      z = Z0 + Math.floor(rand(1, ROWS - 1)) * S;
      tries++;
    } while (tries < 20 && this.players.some(p => Math.hypot(p.pos.x - x, p.pos.z - z) < 2.5));
    const group = new THREE.Group();
    const item = makePower(kind);
    item.position.y = 0.75;
    const halo = new THREE.Mesh(sharedGeo('halo', () => new THREE.RingGeometry(0.34, 0.5, 40)), (PaintPanic.haloMat ||= Object.assign(new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.75, depthWrite: false }), { userData: { shared: true } })));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.02;
    group.add(item, halo);
    group.position.set(x, 0, z);
    group.scale.setScalar(0.01);
    this.scene.add(group);
    this.powerups.push({ kind, x, z, group, item, born: this.app.time });
    sfx.pop();
  }
  collect(p, pu) {
    pu.group.removeFromParent();
    sfx.pickup();
    this.fx.burst(new THREE.Vector3(pu.x, 0.7, pu.z), '#FFFFFF', { n: 10, geo: 'star', size: 0.06, speed: 3, up: 3 });
    const label = { bomb: '💣 SPLAT!', speed: '⚡ SPEED!', brush: '🖌️ BIG BRUSH!' }[pu.kind];
    this.ui.toast(`${this.name(p.id)}: ${label}`, `team${p.id}`);
    if (pu.kind === 'bomb') {
      sfx.bigSplat();
      this.rig.shake(0.25, 0.3);
      const at = p.pos.clone().setY(0.2);
      this.fx.burst(at, TEAM[p.id].color, { n: 26, speed: 6, up: 5, size: 0.14, geo: 'drop' });
      this.fx.shockwave(at, TEAM[p.id].color, { size: 3.2 });
      for (let i = 0; i < COLS * ROWS; i++) {
        const x = X0 + (i % COLS) * S, z = Z0 + Math.floor(i / COLS) * S;
        const d = Math.hypot(x - p.pos.x, z - p.pos.z);
        if (d < 2.6) this.pending.push({ i, id: p.id, t: d * 0.07 });
      }
    } else if (pu.kind === 'speed') {
      sfx.speed();
      p.speedMul = 1.55; p.boostT = 4.5;
    } else {
      p.brushT = 5;
    }
  }

  animate(dt) {
    const t = this.app.time;
    for (const i of this.anim) {
      this.pop[i] = Math.max(0, this.pop[i] - dt * 3.2);
      const k = this.pop[i];
      this.setTileMatrix(i, Math.sin((1 - k) * Math.PI) * k);
      if (k <= 0) this.anim.delete(i);
    }
    if (this.anim.size || this.dirty) { this.tiles.instanceMatrix.needsUpdate = true; this.dirty = this.anim.size > 0; }
    for (const pu of this.powerups) {
      const age = t - pu.born;
      pu.group.scale.setScalar(Math.min(1, age * 4) * (1 + Math.sin(Math.min(1, age * 4) * Math.PI) * 0.3));
      pu.item.position.y = 0.75 + Math.sin(t * 3 + pu.x) * 0.12;
      pu.item.rotation.y = t * 2;
    }
    for (const p of this.players) {
      if (p.brushT > 0) p.fig.push = Math.max(p.fig.push, 0.05);
    }
  }

  updateCamera(dt, instant) {
    if (this.winnerCam(instant)) return;
    const mx = (this.players[0].pos.x + this.players[1].pos.x) * 0.06;
    this.rig.to(new THREE.Vector3(mx, 13.6, 11.4), new THREE.Vector3(mx, -0.4, 1.0), instant);
  }

  previewPose() {
    const r = (a, b) => Math.floor(rand(a, b));
    for (let k = 0; k < 70; k++) this.paint(r(0, 7) + r(0, ROWS) * COLS, 0, true);
    for (let k = 0; k < 70; k++) this.paint(r(8, COLS) + r(0, ROWS) * COLS, 1, true);
    for (let i = 0; i < COLS * ROWS; i++) this.pop[i] = 0;
    this.anim.clear();
    for (let i = 0; i < COLS * ROWS; i++) this.setTileMatrix(i);
    this.tiles.instanceMatrix.needsUpdate = true;
    const [a, b] = this.players;
    a.pos.set(-1.4, 0, 0.6); a.fig.face(0.9, true); a.fig.speed = 5;
    b.pos.set(1.6, 0, -0.4); b.fig.face(-2.2, true); b.fig.speed = 5;
    this.spawnPower();
    const pu = this.powerups[0];
    pu.group.position.set(0.2, 0, 1.8); pu.x = 0.2; pu.z = 1.8; pu.born = -10;
    this.rig.to(new THREE.Vector3(0, 4.3, 5.4), new THREE.Vector3(0, 0.2, 0.6), true);
  }
}

function makePower(kind) {
  const g = new THREE.Group();
  if (kind === 'bomb') {
    const ball = mesh(sharedGeo('pb', () => new THREE.SphereGeometry(0.3, 28, 20)), vinyl('#FFFFFF', { rough: 0.2, coat: 1 }));
    g.add(ball);
    [PAL.coral, PAL.teal, PAL.mustard, PAL.lilac, PAL.pink].forEach((c, i) => {
      const d = mesh(sharedGeo('pbd', () => new THREE.SphereGeometry(0.11, 16, 12)), vinyl(c, { rough: 0.2, coat: 1 }));
      const a = i * 1.26, y = (i % 2 ? 0.1 : -0.12);
      d.position.set(Math.cos(a) * 0.24, y, Math.sin(a) * 0.24);
      d.scale.set(1, 0.6, 1);
      g.add(d);
    });
    const cap = mesh(sharedGeo('pbc', () => new THREE.CylinderGeometry(0.1, 0.12, 0.12, 16)), vinyl('#232B45', { rough: 0.3 }));
    cap.position.y = 0.31;
    g.add(cap);
  } else if (kind === 'speed') {
    const bolt = mesh(sharedGeo('bolt', () => {
      const s = new THREE.Shape();
      s.moveTo(0.05, 0.42); s.lineTo(-0.22, -0.02); s.lineTo(-0.02, -0.02); s.lineTo(-0.1, -0.42); s.lineTo(0.22, 0.06); s.lineTo(0.02, 0.06); s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3 });
      geo.center();
      return geo;
    }), vinyl(PAL.mustard, { rough: 0.2, coat: 1, emissive: '#FFB000', ei: 0.25 }));
    bolt.scale.setScalar(1.2);
    g.add(bolt);
  } else {
    const handle = mesh(sharedGeo('bh', () => new THREE.CylinderGeometry(0.05, 0.06, 0.5, 14)), vinyl('#C98B4F', { rough: 0.5 }));
    handle.position.y = 0.3;
    const ferrule = mesh(sharedGeo('bf', () => new THREE.CylinderGeometry(0.16, 0.12, 0.14, 20)), vinyl('#C9D1DB', { rough: 0.25, metal: 0.7 }));
    ferrule.position.y = 0.02;
    const bristles = mesh(rbox(0.36, 0.3, 0.16, 0.07, 3), vinyl(PAL.pink, { rough: 0.4, coat: 0.5 }));
    bristles.position.y = -0.2;
    g.add(handle, ferrule, bristles);
    g.rotation.z = 0.5;
  }
  return g;
}
