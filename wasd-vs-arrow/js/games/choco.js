// CHOCO DROP — a chocolate bar floating in a giant mug of cocoa. Every square you stand on crumbles; last one standing wins.
import * as THREE from 'three';
import { BaseGame } from './base.js';
import { studio, vinyl, mesh, rbox, sharedGeo, PAL } from '../engine.js';
import { sfx } from '../audio.js';
import { rand, pick } from '../util.js';

const COLS = 9, ROWS = 7, S = 1.2, X0 = -((COLS - 1) / 2) * S, Z0 = -((ROWS - 1) / 2) * S;
const N = COLS * ROWS, CRUMBLE = 0.7, LAKE_Y = -1.35;
const SOLID = 0, CRUMBLING = 1, FALLING = 2, GONE = 3;
const FLAVOURS = [['#7A4A2B', '#8A5735'], ['#83512F', '#935D39'], ['#F2E3C6', '#FBF0DA'], ['#F3A0B5', '#F8B8C8']];

export class ChocoDrop extends BaseGame {
  static meta = {
    touch: { stick: 'Run (keep moving!)', button: ['SHOVE', 'dash', 'Dash into your rival'] },
    id: 'choco', title: 'Choco Drop', icon: '🍫', color: '#B07A52', ink: '#FFFFFF', accent: '#7A4A2B', rounds: 3, figScale: 1.25,
    tagline: 'Every chocolate square you step on crumbles. Last one standing!',
    goal: 'Each square crumbles a moment after you step on it — keep moving! Shove your rival onto crumbling chocolate. Whoever drops into the cocoa loses the round.',
    controls: [['move', 'Run'], ['tap2', 'Double-tap = dash shove']],
  };

  build() {
    this.lights = studio(this.scene, this.app.engine, { sky: ['#FFD9C2', '#FFEBDD', '#FFF6EE'], fog: '#FFEFE3', fogNear: 30, fogFar: 70, shadow: 8, sun: [5, 15, 7] });
    // a table, a giant mug, a lake of cocoa
    const table = mesh(new THREE.CircleGeometry(70, 64), vinyl('#F4DCC0', { rough: 0.7, coat: 0.1 }), { cast: false });
    table.rotation.x = -Math.PI / 2; table.position.y = -4.6;
    this.scene.add(table);
    const mugMat = vinyl('#FFFFFF', { rough: 0.22, coat: 0.9, side: THREE.DoubleSide });
    const wall = mesh(new THREE.CylinderGeometry(10.9, 10.4, 4.0, 96, 1, true), mugMat, { cast: false });
    wall.position.y = -2.6;
    const rim = mesh(new THREE.TorusGeometry(10.9, 0.28, 16, 120), mugMat, { cast: false });
    rim.rotation.x = Math.PI / 2; rim.position.y = -0.6;
    const band = mesh(new THREE.CylinderGeometry(10.93, 10.85, 0.6, 96, 1, true), vinyl(PAL.lilac, { rough: 0.3, coat: 0.7 }), { cast: false });
    band.position.y = -1.3;
    const handle = mesh(new THREE.TorusGeometry(2.0, 0.55, 18, 48, Math.PI * 1.2), mugMat);
    handle.position.set(11.4, -2.5, 0); handle.rotation.z = -Math.PI * 0.6;
    this.scene.add(wall, rim, band, handle);
    const cocoa = mesh(new THREE.CircleGeometry(10.75, 96), vinyl('#5B331E', { rough: 0.12, coat: 1 }), { cast: false });
    cocoa.rotation.x = -Math.PI / 2; cocoa.position.y = LAKE_Y;
    this.scene.add(cocoa);
    // marshmallows bobbing in the cocoa
    this.mallows = [];
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2), d = rand(6.6, 9.6);
      const m = mesh(rbox(0.62, 0.5, 0.62, 0.2, 3), vinyl(pick(['#FFFFFF', '#FFFFFF', '#FFE1EA', '#E9F7EF']), { rough: 0.55, coat: 0.2 }));
      m.position.set(Math.cos(a) * d, LAKE_Y + 0.08, Math.sin(a) * d * 0.85);
      m.rotation.set(rand(-0.2, 0.2), rand(0, 3), rand(-0.2, 0.2));
      m.userData = { ph: rand(0, 6), y: m.position.y, spin: rand(-0.2, 0.2) };
      this.scene.add(m);
      this.mallows.push(m);
    }
    // the chocolate bar: one instanced mesh for the squares, one for their raised pads
    const mat = () => new THREE.MeshPhysicalMaterial({ roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.2 });
    this.base = new THREE.InstancedMesh(rbox(1.12, 0.34, 1.12, 0.07, 3), mat(), N);
    this.pad = new THREE.InstancedMesh(rbox(0.82, 0.12, 0.82, 0.05, 2), mat(), N);
    for (const im of [this.base, this.pad]) { im.castShadow = im.receiveShadow = true; im.frustumCulled = false; this.scene.add(im); }
    this.tState = new Int8Array(N); // per-square state (BaseGame already owns .state)
    this.tT = new Float32Array(N);
    this.tSpin = new Float32Array(N * 2);
    this.splashed = new Uint8Array(N);
    this.active = new Set();
    this.m4 = new THREE.Matrix4(); this.m4b = new THREE.Matrix4(); this.padOff = new THREE.Matrix4().makeTranslation(0, 0.2, 0);
    this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.v = new THREE.Vector3(); this.sc = new THREE.Vector3();
    this.crackCd = 0;
  }

  tilePos(i) { return [X0 + (i % COLS) * S, Z0 + Math.floor(i / COLS) * S]; }
  tileAt(x, z) {
    const c = Math.round((x - X0) / S), r = Math.round((z - Z0) / S);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return -1;
    const [tx, tz] = this.tilePos(r * COLS + c);
    return Math.abs(x - tx) < S / 2 + 0.04 && Math.abs(z - tz) < S / 2 + 0.04 ? r * COLS + c : -1;
  }
  setTile(i) {
    const st = this.tState[i], t = this.tT[i];
    const [x, z] = this.tilePos(i);
    let dy = 0, rx = 0, rz = 0, s = 1;
    if (st === CRUMBLING) {
      const k = t / CRUMBLE;
      rx = Math.sin(t * 46 + i) * 0.05 * k; rz = Math.cos(t * 41 + i) * 0.05 * k; dy = -k * 0.06;
    } else if (st === FALLING) {
      dy = -7 * t * t; rx = this.tSpin[i * 2] * t; rz = this.tSpin[i * 2 + 1] * t;
    } else if (st === GONE) s = 0.0001;
    this.q.setFromEuler(this.e.set(rx, 0, rz));
    this.m4.compose(this.v.set(x, -0.21 + dy, z), this.q, this.sc.set(s, s, s));
    this.base.setMatrixAt(i, this.m4);
    this.m4b.multiplyMatrices(this.m4, this.padOff);
    this.pad.setMatrixAt(i, this.m4b);
  }

  resetRound() {
    this.active.clear();
    this.tState.fill(SOLID);
    this.tT.fill(0);
    this.splashed.fill(0);
    for (let i = 0; i < N; i++) {
      const r = Math.random(), f = r < 0.08 ? 2 : r < 0.16 ? 3 : (i % COLS + Math.floor(i / COLS)) % 2;
      this.base.setColorAt(i, new THREE.Color(FLAVOURS[f][0]));
      this.pad.setColorAt(i, new THREE.Color(FLAVOURS[f][1]));
      this.setTile(i);
    }
    for (const im of [this.base, this.pad]) { im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; }
    this.autoT = 0;
    this.players.forEach((p, i) => {
      p.pos.set(i ? 2.4 : -2.4, 0, 0);
      p.vel.set(0, 0, 0);
      p.vy = 0; p.out = false; p.stun = 0; p.dashCd = 0; p.dashT = 0; p.splashed = false;
      p.fig.root.visible = true;
      p.fig.tumble.rotation.set(0, 0, 0);
      p.fig.pose = 'auto';
      p.fig.speed = 0;
      p.fig.setSoot(0);
      p.fig.face(i ? -Math.PI / 2 : Math.PI / 2, true);
    });
  }

  crumble(i) {
    if (i < 0 || this.tState[i] !== SOLID) return;
    this.tState[i] = CRUMBLING;
    this.tT[i] = 0;
    this.active.add(i);
  }

  tick(dt) {
    this.crackCd = Math.max(0, this.crackCd - dt);
    // tiles: wobble → fall → splash → gone
    for (const i of this.active) {
      this.tT[i] += dt;
      if (this.tState[i] === CRUMBLING && this.tT[i] >= CRUMBLE) {
        this.tState[i] = FALLING; this.tT[i] = 0;
        this.tSpin[i * 2] = rand(-3, 3); this.tSpin[i * 2 + 1] = rand(-3, 3);
        const [x, z] = this.tilePos(i);
        if (!this.preview) {
          if (this.crackCd <= 0) { sfx.crack(); this.crackCd = 0.08; }
          this.fx.burst(new THREE.Vector3(x, 0, z), '#6B3F24', { n: 5, speed: 1.6, up: 1.5, size: 0.07, geo: 'box' });
        }
      } else if (this.tState[i] === FALLING) {
        const [x, z] = this.tilePos(i);
        if (!this.splashed[i] && -0.21 - 7 * this.tT[i] ** 2 < LAKE_Y) {
          this.splashed[i] = 1;
          this.fx.burst(new THREE.Vector3(x, LAKE_Y + 0.05, z), '#6E3E24', { n: 8, speed: 2.2, up: 3.5, size: 0.08, geo: 'drop' });
          this.fx.shockwave(new THREE.Vector3(x, LAKE_Y + 0.02, z), '#A26D4A', { size: 1.6, life: 0.5 });
        }
        if (this.tT[i] > 0.85) { this.tState[i] = GONE; this.active.delete(i); }
      }
      this.setTile(i);
    }
    if (this.active.size || this.dirty) { this.base.instanceMatrix.needsUpdate = this.pad.instanceMatrix.needsUpdate = true; this.dirty = this.active.size > 0; }

    // sudden death: after 15 s random squares start going by themselves
    if (this.live && this.roundTime > 15) {
      this.autoT -= dt;
      if (this.autoT <= 0) {
        this.autoT = Math.max(0.2, 0.8 - (this.roundTime - 15) * 0.04);
        const solid = [];
        for (let i = 0; i < N; i++) if (this.tState[i] === SOLID) solid.push(i);
        if (solid.length) this.crumble(pick(solid));
      }
    }

    let fell = 0;
    for (const p of this.players) {
      if (p.out) {
        p.vy -= 20 * dt;
        if (p.splashed) p.vy = Math.max(p.vy, -1.2); // sinking slowly in the cocoa
        p.pos.y += p.vy * dt;
        p.pos.x += p.vel.x * dt * (p.splashed ? 0.2 : 0.7);
        p.pos.z += p.vel.z * dt * (p.splashed ? 0.2 : 0.7);
        if (!p.splashed) { p.fig.tumble.rotation.x += dt * 4 * p.spinX; p.fig.tumble.rotation.z += dt * 3 * p.spinZ; }
        if (!p.splashed && p.pos.y < LAKE_Y - 0.2) {
          p.splashed = true;
          sfx.splashdown();
          const at = new THREE.Vector3(p.pos.x, LAKE_Y + 0.05, p.pos.z);
          this.fx.burst(at, '#6E3E24', { n: 18, speed: 3.5, up: 5, size: 0.11, geo: 'drop' });
          this.fx.shockwave(at, '#A26D4A', { size: 2.6 });
          p.fig.setSoot(0.55);
        }
        if (p.pos.y < LAKE_Y - 2.5) p.fig.root.visible = false;
        continue;
      }
      this.timers(p, dt);
      this.tryDash(p, { power: 10.5, cd: 1.3 });
      this.moveTopDown(p, dt, { accel: 32, max: 4.8, drag: 7, grip: 3 });
      const i = this.tileAt(p.pos.x, p.pos.z);
      const st = i < 0 ? GONE : this.tState[i];
      if (this.live) this.crumble(i);
      // unsupported: the square has dropped away (or you ran off the bar)
      if (st === GONE || (st === FALLING && this.tT[i] > 0.12)) {
        if (this.state === 'over') continue;
        p.out = true;
        p.vy = st === FALLING ? -2 : 1.5;
        p.spinX = rand(0.6, 1.2); p.spinZ = rand(-1, 1);
        p.fig.pose = 'fall';
        sfx.fall();
        fell++;
      } else if (this.live) {
        // near a hole: wobble
        const edge = [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].some(([dx, dz]) => { const j = this.tileAt(p.pos.x + dx, p.pos.z + dz); return j < 0 || this.tState[j] >= FALLING; });
        p.fig.pose = edge && p.fig.speed < 1.5 ? 'teeter' : 'auto';
      }
    }
    const [a, b] = this.players;
    if (!a.out && !b.out) this.bump(a, b, { radius: 0.46, e: 0.9, kick: 1.6 });
    if (this.live && fell) {
      if (a.out && b.out) this.endRound(null, 'DOUBLE DUNK!');
      else if (a.out) this.endRound(1);
      else if (b.out) this.endRound(0);
    }
  }

  animate(dt) {
    const t = this.app.time;
    for (const m of this.mallows) {
      const u = m.userData;
      m.position.y = u.y + Math.sin(t * 1.3 + u.ph) * 0.05;
      m.rotation.y += u.spin * dt;
    }
    // the cocoa bubbles now and then
    if (!this.preview && Math.random() < dt * 2) {
      const a = rand(0, Math.PI * 2), d = rand(6.2, 10);
      this.fx.burst(new THREE.Vector3(Math.cos(a) * d, LAKE_Y, Math.sin(a) * d * 0.85), '#7A4A2E', { n: 2, speed: 0.4, up: 1.2, size: 0.07, life: 0.5, gravity: -6 });
    }
  }

  updateCamera(dt, instant) {
    if (this.winnerCam(instant)) return;
    const alive = this.players.filter(p => !p.out);
    let mx = 0, mz = 0;
    for (const p of alive) { mx += p.pos.x; mz += p.pos.z; }
    if (alive.length) { mx /= alive.length; mz /= alive.length; }
    this.rig.to(new THREE.Vector3(mx * 0.12, 11.0, 9.6 + mz * 0.08), new THREE.Vector3(mx * 0.12, -0.7, 0.7 + mz * 0.08), instant);
  }

  previewPose() {
    for (const i of [1, 2, 10, 11, 19, 28, 29, 37, 47, 48, 55, 56, 57]) { this.tState[i] = GONE; this.setTile(i); }
    for (const i of [20, 38, 46]) { this.tState[i] = CRUMBLING; this.tT[i] = 0.5; this.setTile(i); }
    this.tState[30] = FALLING; this.tT[30] = 0.25; this.tSpin[60] = 1.5; this.tSpin[61] = -2; this.setTile(30);
    this.base.instanceMatrix.needsUpdate = this.pad.instanceMatrix.needsUpdate = true;
    const [a, b] = this.players;
    a.pos.set(-1.0, 0, 0.4); a.fig.face(Math.PI / 2 + 0.2, true); a.fig.speed = 6; a.fig.push = 9;
    b.pos.set(0.6, 0, 0.1); b.fig.face(-Math.PI / 2, true); b.fig.pose = 'teeter';
    this.rig.to(new THREE.Vector3(-0.2, 3.6, 5.2), new THREE.Vector3(0, 0.1, 0.2), true);
  }
}
