// CAKE CLASH — sumo on a giant floating birthday cake. Bump your rival off the edge; the cake shrinks.
import * as THREE from 'three';
import { BaseGame } from './base.js';
import { studio, vinyl, mesh, cloud, sharedGeo } from '../engine.js';
import { CONFETTI } from '../fx.js';
import { sfx } from '../audio.js';
import { rand, pick, tween, ease, clamp } from '../util.js';

const R0 = 4.6, RMIN = 1.8, SHRINK_FROM = 6, SHRINK_TO = 34;

export class CakeClash extends BaseGame {
  static meta = {
    touch: { stick: 'Run around', button: ['SHOVE', 'dash', 'Dash into your rival'] },
    id: 'cake', title: 'Cake Clash', icon: '🎂', color: '#FF8FB1', ink: '#6E1F3B', rounds: 3, figScale: 1.2,
    tagline: 'Shove your rival off a shrinking birthday cake.',
    goal: 'Bump your rival off the cake. It gets smaller every second — stay near the middle!',
    controls: [['move', 'Run around'], ['tap2', 'Double-tap = dash shove']],
  };

  build() {
    this.lights = studio(this.scene, this.app.engine, { sky: ['#8FCBFF', '#C9E7FF', '#FFE3EE'], fog: '#E3F0FF', fogNear: 28, fogFar: 70, shadow: 8, sun: [5, 14, 7], sunI: 2.2 });
    this.R = R0;
    const cake = this.cake = new THREE.Group();
    const frost = vinyl('#FFF6EC', { rough: 0.32, coat: 0.6 });
    const sponge = vinyl('#FF9EBB', { rough: 0.55, coat: 0.15 });
    const top = mesh(new THREE.CylinderGeometry(R0, R0, 0.32, 96), frost);
    top.position.y = -0.16;
    const layer1 = mesh(new THREE.CylinderGeometry(R0 - 0.1, R0 - 0.1, 0.95, 96), sponge);
    layer1.position.y = -0.32 - 0.475;
    const fill = mesh(new THREE.CylinderGeometry(R0 - 0.04, R0 - 0.04, 0.16, 96), frost);
    fill.position.y = -1.35;
    const layer2 = mesh(new THREE.CylinderGeometry(R0 - 0.1, R0 - 0.1, 0.95, 96), sponge);
    layer2.position.y = -1.43 - 0.475;
    cake.add(top, layer1, fill, layer2);
    // frosting drips down the side
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + rand(-0.03, 0.03), len = rand(0.15, 0.75);
      const d = mesh(sharedGeo(`drip${Math.round(len * 20)}`, () => new THREE.CapsuleGeometry(0.12, Math.round(len * 20) / 20, 4, 10)), frost);
      d.position.set(Math.cos(a) * (R0 - 0.06), -0.3 - Math.round(len * 20) / 40, Math.sin(a) * (R0 - 0.06));
      cake.add(d);
    }
    // piped frosting ring around the filling
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const b = mesh(sharedGeo('blob12', () => new THREE.SphereGeometry(0.13, 14, 10)), frost, { cast: false });
      b.position.set(Math.cos(a) * (R0 + 0.02), -1.35, Math.sin(a) * (R0 + 0.02));
      cake.add(b);
    }
    // sprinkles: one instanced mesh, per-sprinkle colour
    const N = 320;
    const spr = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.035, 0.12, 2, 6), new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.8 }), N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < N; i++) {
      const r = Math.sqrt(Math.random()) * (R0 - 0.25), a = rand(0, Math.PI * 2);
      e.set(Math.PI / 2, 0, rand(0, Math.PI * 2));
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(Math.cos(a) * r, 0.01, Math.sin(a) * r), q, new THREE.Vector3(1, 1, 1));
      spr.setMatrixAt(i, m);
      spr.setColorAt(i, new THREE.Color(pick(CONFETTI.slice(0, 6))));
    }
    spr.receiveShadow = true;
    cake.add(spr);
    // cake stand
    const plate = mesh(new THREE.CylinderGeometry(R0 + 0.75, R0 + 0.55, 0.16, 96), vinyl('#FFFFFF', { rough: 0.2, coat: 0.9 }));
    plate.position.y = -2.47;
    const rim = mesh(new THREE.TorusGeometry(R0 + 0.75, 0.08, 10, 96), vinyl('#FFFFFF', { rough: 0.2, coat: 0.9 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = -2.4;
    cake.add(plate, rim);
    this.scene.add(cake);
    const stem = mesh(new THREE.CylinderGeometry(0.6, 1.1, 2.2, 40), vinyl('#7ED6A5', { rough: 0.3, coat: 0.7 }));
    stem.position.y = -3.65;
    const foot = mesh(new THREE.CylinderGeometry(2.0, 2.3, 0.3, 48), vinyl('#7ED6A5', { rough: 0.3, coat: 0.7 }));
    foot.position.y = -4.85;
    this.scene.add(stem, foot);
    // a big cherry on a candle-free cake looks lonely — candles stand on the plate instead
    for (const [a, c] of [[0.6, '#FFC145'], [2.3, '#A594F9'], [3.9, '#2EC4B6'], [5.4, '#FF6F59']]) {
      const g = new THREE.Group();
      const stick = mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.5, 20), vinyl(c, { rough: 0.3, coat: 0.6 }));
      stick.position.y = 0.75;
      const flame = new THREE.Mesh(sharedGeo('flame', () => new THREE.SphereGeometry(0.12, 16, 12)), vinyl('#FFE08A', { emissive: '#FFB547', ei: 2.2 }));
      flame.scale.set(1, 1.7, 1); flame.position.y = 1.68;
      g.add(stick, flame);
      g.position.set(Math.cos(a) * (R0 + 0.45), -2.39, Math.sin(a) * (R0 + 0.45));
      g.userData.flame = flame;
      cake.add(g);
    }

    // sky full of clouds, above and below
    this.clouds = [];
    for (let i = 0; i < 16; i++) {
      const c = cloud(rand(0.9, 2.2));
      const a = rand(0, Math.PI * 2), d = rand(11, 26);
      c.position.set(Math.cos(a) * d, rand(-9, 3), Math.sin(a) * d - 4);
      c.rotation.y = rand(0, 3);
      c.userData.v = rand(0.2, 0.6);
      this.scene.add(c);
      this.clouds.push(c);
    }
    const below = cloud(5);
    below.position.set(0, -14, 0);
    this.scene.add(below);
  }

  resetRound() {
    const from = this.cake.scale.x;
    if (from < 0.999 && this.round > 0) tween(0.7, k => this.cake.scale.set(from + (1 - from) * k, 1, from + (1 - from) * k), { ease: ease.outBack });
    else this.cake.scale.set(1, 1, 1);
    this.R = R0;
    this.warned = false;
    this.players.forEach((p, i) => {
      p.pos.set(i ? 2.2 : -2.2, 0, 0.3);
      p.vel.set(0, 0, 0);
      p.vy = 0; p.out = false; p.stun = 0; p.dashCd = 0; p.dashT = 0; p.splashed = false;
      p.fig.root.visible = true;
      p.fig.tumble.rotation.set(0, 0, 0);
      p.fig.pose = 'auto';
      p.fig.speed = 0;
      p.fig.face(i ? -Math.PI / 2 : Math.PI / 2, true);
    });
  }

  tick(dt) {
    if (this.live) {
      const t = this.roundTime;
      this.R = t < SHRINK_FROM ? R0 : R0 - (R0 - RMIN) * clamp((t - SHRINK_FROM) / (SHRINK_TO - SHRINK_FROM), 0, 1);
      this.cake.scale.set(this.R / R0, 1, this.R / R0);
      if (!this.warned && t > SHRINK_FROM - 0.5) { this.warned = true; this.ui.toast('🎂 The cake is shrinking!'); }
    }
    for (const p of this.players) {
      if (p.out) {
        p.vy -= 24 * dt;
        p.pos.y += p.vy * dt;
        p.pos.x += p.vel.x * dt * 0.8;
        p.pos.z += p.vel.z * dt * 0.8;
        p.fig.tumble.rotation.x += dt * 5 * p.spinX;
        p.fig.tumble.rotation.z += dt * 4 * p.spinZ;
        if (!p.splashed && p.pos.y < -10) {
          p.splashed = true;
          sfx.splashdown();
          this.fx.puff(p.pos.clone(), { n: 12, size: 0.6, speed: 3, up: 2, life: 0.9 });
        }
        if (p.pos.y < -18) p.fig.root.visible = false;
        continue;
      }
      this.timers(p, dt);
      this.tryDash(p, { power: 11.5, cd: 1.2 });
      this.moveTopDown(p, dt, { accel: 30, max: 5.2, drag: 3.4, grip: 2.2 });
      const r = Math.hypot(p.pos.x, p.pos.z);
      if (r > this.R + 0.12 && this.state !== 'over') {
        p.out = true;
        p.vy = 2.5;
        p.spinX = rand(0.6, 1.2); p.spinZ = rand(-1, 1);
        p.fig.pose = 'fall';
        sfx.fall();
        this.fx.burst(p.pos.clone().setY(0.1), '#FFF6EC', { n: 10, speed: 2.5, up: 3, size: 0.1 });
      } else p.fig.pose = this.state === 'play' && r > this.R - 0.5 ? 'teeter' : this.state === 'play' ? 'auto' : p.fig.pose;
    }
    const [a, b] = this.players;
    if (!a.out && !b.out) {
      const hit = this.bump(a, b, { radius: 0.48, e: 0.95, kick: 1.6 });
      if (hit > 1.5) this.fx.burst(new THREE.Vector3((a.pos.x + b.pos.x) / 2, 0.4, (a.pos.z + b.pos.z) / 2), pick(CONFETTI), { n: 6, speed: 3, up: 3, size: 0.05, geo: 'drop' });
    }
    if (this.live) {
      if (a.out && b.out) this.endRound(null, 'DOUBLE DROP!');
      else if (a.out) this.endRound(1);
      else if (b.out) this.endRound(0);
      else if (this.roundTime > 50) this.endRound(null, 'TIME! DRAW');
    }
  }

  animate(dt) {
    const t = this.app.time;
    for (const c of this.clouds) { c.position.x += c.userData.v * dt; if (c.position.x > 30) c.position.x = -30; }
    for (const g of this.cake.children) if (g.userData.flame) g.userData.flame.scale.set(1 + Math.sin(t * 13 + g.position.x) * 0.1, 1.7 + Math.sin(t * 9 + g.position.z) * 0.25, 1);
  }

  updateCamera(dt, instant) {
    const alive = this.players.filter(p => !p.out);
    const mid = new THREE.Vector3();
    for (const p of alive) mid.add(p.pos);
    if (alive.length) mid.divideScalar(alive.length);
    mid.multiplyScalar(0.35).setY(0);
    if (this.winnerCam(instant)) return;
    // zoom in while the two are close together, out when they spread
    const [a, b] = this.players;
    const z = clamp(0.78 + Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) * 0.05, 0.8, 1.0);
    this.rig.to(new THREE.Vector3(mid.x, -0.5 + 8.4 * z, mid.z + 0.5 + 8.2 * z), new THREE.Vector3(mid.x, -0.5, mid.z + 0.5), instant);
  }

  previewPose() {
    const [a, b] = this.players;
    a.pos.set(-0.55, 0, 0.9); a.fig.face(Math.PI / 2 - 0.2, true); a.fig.speed = 5; a.fig.push = 9;
    b.pos.set(1.0, 0, 0.7); b.fig.face(-Math.PI / 2, true); b.fig.pose = 'teeter';
    this.fx.stars(new THREE.Vector3(0.25, 0.8, 0.8), 6);
    this.rig.to(new THREE.Vector3(0.5, 2.6, 4.4), new THREE.Vector3(0.25, 0.45, 0.7), true);
  }
}
