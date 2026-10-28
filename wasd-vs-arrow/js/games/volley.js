// BEACH BONK — side-on beach volleyball. Move, jump, and bonk the ball over the net with your head.
import * as THREE from 'three';
import { BaseGame } from './base.js';
import { studio, vinyl, matte, mesh, rbox, sharedGeo, canvasTexture, cloud, PAL } from '../engine.js';
import { CONFETTI } from '../fx.js';
import { sfx } from '../audio.js';
import { rand, pick, clamp } from '../util.js';

const S = 1.3;                  // figure scale
const NET_H = 1.75, NET_R = 0.07;
const BR = 0.38;                // ball radius
const PR = 0.6 * S, PY = 0.75 * S; // player bonk circle: radius + height of its centre above the feet
const WALL = 8.5, GRAV = 9.5, VMAX = 11.5;
const RUN = 6.8, JUMP = 7.4, PGRAV = 22;

export class BeachBonk extends BaseGame {
  static meta = {
    touch: { stick: 'Move left & right', button: ['JUMP', 'up', 'Jump & bonk the ball'] },
    id: 'volley', title: 'Beach Bonk', icon: '🏐', color: '#FFB37A', ink: '#6B2E06', rounds: 5, quick: true, figScale: S,
    tagline: 'Bonk the beach ball over the net. Don\'t let it land!',
    goal: 'Move and jump to bonk the ball over the net with your head. If it lands on your side of the sand, your rival scores. First to 5!',
    controls: [['lr', 'Move'], ['up', 'Jump & bonk']],
  };

  build() {
    this.lights = studio(this.scene, this.app.engine, { sky: ['#6FC6FF', '#B9E6FF', '#FFF0D2'], fog: '#E8F6FF', fogNear: 40, fogFar: 110, shadow: 11, sun: [4, 14, 9], sunI: 2.3 });
    this.lights.follow(new THREE.Vector3(0, 0, 0));
    // sand + the sea behind it
    const sandTex = canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#F6DDA8'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(214,176,112,0.35)' : 'rgba(255,248,226,0.6)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    });
    sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
    sandTex.repeat.set(20, 8);
    const sand = mesh(new THREE.PlaneGeometry(90, 34), new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.95 }), { cast: false });
    sand.rotation.x = -Math.PI / 2;
    sand.position.z = 3;
    this.scene.add(sand);
    const sea = mesh(new THREE.PlaneGeometry(200, 80), vinyl('#3FB6E0', { rough: 0.12, coat: 1 }), { cast: false });
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.06, -54);
    this.scene.add(sea);
    this.foam = [];
    for (let i = 0; i < 3; i++) {
      const f = mesh(rbox(90, 0.06, 0.5 - i * 0.12, 0.03, 2), vinyl('#FFFFFF', { rough: 0.4, coat: 0.3 }), { cast: false });
      f.position.set(0, -0.02, -14 - i * 1.4);
      this.scene.add(f);
      this.foam.push(f);
    }
    // a big low sun on the horizon
    const sun = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 20), new THREE.MeshBasicMaterial({ color: '#FFE7A0', fog: false }));
    sun.position.set(-18, 4, -90);
    this.scene.add(sun);
    for (const [x, y, z, s] of [[-22, 12, -50, 3], [16, 14, -60, 3.6], [34, 10, -55, 2.4], [-40, 9, -70, 3]]) {
      const c = cloud(s); c.position.set(x, y, z); this.scene.add(c);
    }

    // court lines (rope on the sand)
    const rope = vinyl('#FFFFFF', { rough: 0.5, coat: 0.2 });
    for (const [w, d, x, z] of [[14.2, 0.07, 0, -1.7], [14.2, 0.07, 0, 1.7], [0.07, 3.4, -7.1, 0], [0.07, 3.4, 7.1, 0]]) {
      const l = mesh(new THREE.BoxGeometry(w, 0.03, d), rope, { cast: false });
      l.position.set(x, 0.015, z);
      this.scene.add(l);
    }
    // the net: two striped posts, a top tape and a mesh panel
    const postTex = canvasTexture(32, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#FFFFFF' : PAL.mustard; g.fillRect(0, (i * h) / 8, w, h / 8 + 1); } });
    const postMat = new THREE.MeshStandardMaterial({ map: postTex, roughness: 0.35 });
    for (const z of [-1.9, 1.9]) {
      const post = mesh(new THREE.CylinderGeometry(0.09, 0.1, NET_H + 0.35, 16), postMat);
      post.position.set(0, (NET_H + 0.35) / 2, z);
      const cap = mesh(sharedGeo('vb:cap', () => new THREE.SphereGeometry(0.13, 16, 12)), vinyl(PAL.mustard, { rough: 0.25, coat: 0.8 }));
      cap.position.set(0, NET_H + 0.38, z);
      this.scene.add(post, cap);
    }
    const tape = mesh(new THREE.BoxGeometry(0.1, 0.12, 3.8), vinyl('#FFFFFF', { rough: 0.35, coat: 0.5 }));
    tape.position.set(0, NET_H - 0.06, 0);
    this.scene.add(tape);
    const netTex = canvasTexture(256, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(35,43,69,0.75)'; g.lineWidth = 3;
      for (let x = 0; x <= w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y <= h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    });
    const net = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.9), new THREE.MeshStandardMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, roughness: 0.6, depthWrite: false }));
    net.rotation.y = Math.PI / 2;
    net.position.set(0, NET_H - 0.55, 0);
    this.scene.add(net);

    // beach props: palms, umbrella + towel, a little sandcastle
    for (const [x, z, h, lean] of [[-10.5, -4.5, 5.2, 0.25], [11, -5.5, 6, -0.3], [-14, -8, 4.4, 0.4], [15.5, -3, 4.8, -0.2]]) this.scene.add(palm(x, z, h, lean));
    this.scene.add(umbrella(-9.8, 2.6, '#FF8FB1'));
    this.scene.add(umbrella(10.2, 3.4, PAL.lilac));
    const towel = mesh(rbox(1.2, 0.04, 2.2, 0.02, 2), new THREE.MeshStandardMaterial({ map: canvasTexture(64, 128, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#FFFFFF' : PAL.lilac; g.fillRect(0, (i * h) / 8, w, h / 8 + 1); } }), roughness: 0.8 }), { cast: false });
    towel.position.set(9.3, 0.02, 4.4); towel.rotation.y = 0.3;
    this.scene.add(towel);
    const castle = new THREE.Group();
    const sandMat = vinyl('#E9C98A', { rough: 0.85, coat: 0 });
    for (const [x, z, h] of [[-0.35, 0, 0.55], [0.35, 0, 0.55], [0, 0, 0.8]]) {
      const tower = mesh(new THREE.CylinderGeometry(0.22, 0.28, h, 14), sandMat);
      tower.position.set(x, h / 2, z);
      const top = mesh(new THREE.ConeGeometry(0.26, 0.3, 14), sandMat);
      top.position.set(x, h + 0.15, z);
      castle.add(tower, top);
    }
    const flag = mesh(sharedGeo('vb:flag', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.3, -0.1); s.lineTo(0, -0.2); s.closePath(); return new THREE.ShapeGeometry(s); }), vinyl(PAL.mustard, { side: THREE.DoubleSide }), { cast: false });
    flag.position.set(0, 1.35, 0);
    castle.add(flag);
    castle.position.set(-8.6, 0, 4.6);
    this.scene.add(castle);

    // the ball: classic segments + a white cap, and its shadow on the sand
    const ballTex = canvasTexture(512, 256, (g, w, h) => {
      const cols = ['#FFFFFF', PAL.mustard, '#FFFFFF', '#5B8DEF', '#FFFFFF', PAL.lilac];
      cols.forEach((c, i) => { g.fillStyle = c; g.fillRect((i * w) / 6, 0, w / 6 + 1, h); });
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, 22); g.fillRect(0, h - 22, w, 22);
    });
    this.ball = mesh(new THREE.SphereGeometry(BR, 32, 22), new THREE.MeshPhysicalMaterial({ map: ballTex, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }));
    this.scene.add(this.ball);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(BR, 28), new THREE.MeshBasicMaterial({ color: '#7A5B2A', transparent: true, opacity: 0.3, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.scene.add(this.shadow);
    this.bv = new THREE.Vector2();
    this.server = Math.random() < 0.5 ? 0 : 1;
  }

  resetRound() {
    // the side that lost the last point serves
    if (this.round > 1 && this.lastWinner != null) this.server = 1 - this.lastWinner;
    this.players.forEach((p, i) => {
      p.pos.set(i ? 4 : -4, 0, 0);
      p.vel.set(0, 0, 0);
      p.vy = 0; p.ground = true; p.hitCd = 0;
      p.fig.pose = 'auto';
      p.fig.speed = 0;
      p.fig.face(i ? -0.5 : 0.5, true);
    });
    const sx = this.players[this.server].pos.x;
    this.ball.position.set(sx + (this.server ? -0.6 : 0.6), 3.3, 0); // a touch toward the net, so a standing bonk serves over
    this.bv.set(0, 0);
    this.served = false;
    this.landed = false;
    this.spin = 0;
  }
  onGo() { this.served = true; }

  onPress(p, action) {
    if (action === 'up' && p.ground) {
      p.vy = JUMP;
      p.ground = false;
      sfx.jump();
    }
  }

  tick(dt) {
    for (const p of this.players) {
      p.hitCd = Math.max(0, p.hitCd - dt);
      const dir = this.live ? clamp(this.input.axis(p.id).x, -1, 1) : 0; // keys: ±1, stick: anything in between
      // snappy beach feet: fast accel, quick stop
      const target = dir * RUN;
      p.vel.x += (target - p.vel.x) * (1 - Math.exp(-(dir ? 14 : 10) * dt));
      p.pos.x += p.vel.x * dt;
      const lo = p.id ? 0.45 : -8, hi = p.id ? 8 : -0.45;
      if (p.pos.x < lo) { p.pos.x = lo; p.vel.x = 0; }
      if (p.pos.x > hi) { p.pos.x = hi; p.vel.x = 0; }
      if (!p.ground) {
        p.vy -= PGRAV * dt;
        p.pos.y += p.vy * dt;
        if (p.pos.y <= 0) {
          p.pos.y = 0; p.vy = 0; p.ground = true;
          p.fig.land(0.6); sfx.land();
          this.fx.puff(p.pos.clone().setY(0.05), { n: 4, color: '#F6DDA8', size: 0.16, speed: 1.2, up: 0.4 });
        }
      }
      const f = p.fig;
      if (this.state === 'play' || this.state === 'countdown') {
        f.pose = p.ground ? 'auto' : 'air';
        f.speed = Math.abs(p.vel.x);
        if (Math.abs(p.vel.x) > 0.5) f.face(p.vel.x > 0 ? Math.PI / 2 : -Math.PI / 2);
        else f.face(p.id ? -0.5 : 0.5);
      } else if (f.pose === 'air' && p.ground) f.pose = 'auto';
      if (this.state !== 'play') f.speed = Math.abs(p.vel.x);
    }
    this.ballPhysics(dt);
  }

  ballPhysics(dt) {
    const b = this.ball.position, v = this.bv;
    if (!this.served) { this.shadowUpdate(); return; }
    // substeps keep fast spikes from tunnelling through heads and the net
    const n = 3, h = dt / n;
    for (let s = 0; s < n; s++) {
      v.y -= GRAV * h;
      b.x += v.x * h;
      b.y += v.y * h;
      // walls
      if (b.x < -WALL + BR) { b.x = -WALL + BR; v.x = Math.abs(v.x) * 0.8; }
      if (b.x > WALL - BR) { b.x = WALL - BR; v.x = -Math.abs(v.x) * 0.8; }
      // net: a capsule from the sand to the tape
      const ny = clamp(b.y, 0, NET_H), dx = b.x, dy = b.y - ny, d = Math.hypot(dx, dy);
      if (d < BR + NET_R) {
        const nx = d > 1e-4 ? dx / d : Math.sign(v.x || 1) * -1, nyy = d > 1e-4 ? dy / d : 0;
        b.x = nx * (BR + NET_R); b.y = ny + nyy * (BR + NET_R);
        const vn = v.x * nx + v.y * nyy;
        if (vn < 0) { v.x -= 1.6 * vn * nx; v.y -= 1.6 * vn * nyy; }
        if (this.live && Math.abs(vn) > 2) sfx.thud();
      }
      // heads and bodies
      if (!this.landed) for (const p of this.players) {
        const cx = p.pos.x, cy = p.pos.y + PY;
        const ex = b.x - cx, ey = b.y - cy, dd = Math.hypot(ex, ey);
        if (dd >= BR + PR || dd < 1e-4) continue;
        const nx = ex / dd, ny2 = ey / dd;
        b.x = cx + nx * (BR + PR); b.y = cy + ny2 * (BR + PR);
        const pvx = p.vel.x, pvy = p.ground ? 0 : p.vy;
        const rx = v.x - pvx, ry = v.y - pvy, vn = rx * nx + ry * ny2;
        if (vn < 0) {
          v.x -= 1.5 * vn * nx; v.y -= 1.5 * vn * ny2;
          v.x += pvx * 0.4; v.y += Math.max(0, pvy) * 0.4;
          if (ny2 > 0.15) v.y = Math.max(v.y, 5.6); // a bonk always pops the ball up
          v.y = Math.min(v.y, 9.2); // …but never out of the sky
          // gently steer toward the rival's side so rallies keep moving
          v.x += (p.id ? -1 : 1) * 1.6;
          const sp = Math.hypot(v.x, v.y);
          if (sp > VMAX) { v.x *= VMAX / sp; v.y *= VMAX / sp; }
          if (p.hitCd <= 0) {
            p.hitCd = 0.12;
            p.fig.push = 0.15;
            p.fig.land(0.3);
            const hard = sp > 9;
            hard ? sfx.bonk() : sfx.kick(0.7);
            this.fx.burst(new THREE.Vector3(b.x - nx * BR, b.y - ny2 * BR, 0), '#FFFFFF', { n: hard ? 8 : 4, speed: 2.5, up: 2, size: 0.06 });
            if (hard) this.fx.stars(new THREE.Vector3(cx, cy + PR, 0), 4);
            this.spin = v.x * 2;
          }
        }
      }
      // the sand
      if (b.y <= BR) {
        b.y = BR;
        if (!this.landed && this.live) {
          this.landed = true;
          const scorer = b.x < 0 ? 1 : 0;
          sfx.thud();
          this.fx.puff(new THREE.Vector3(b.x, 0.1, 0), { n: 10, color: '#F6DDA8', size: 0.28, speed: 2.4, up: 1.4 });
          this.fx.burst(new THREE.Vector3(b.x, 0.2, 0), '#E9C98A', { n: 10, speed: 3, up: 3, size: 0.07 });
          this.fx.confetti(this.players[scorer].pos.clone().setY(3), { n: 40, spread: 1, colors: [scorer ? PAL.teal : PAL.coral, '#FFFFFF', PAL.mustard] });
          this.endRound(scorer, pick([`${this.name(scorer)} SCORES!`, 'BONK! POINT!', `POINT ${this.name(scorer)}!`]));
        }
        v.y = Math.abs(v.y) * 0.45;
        v.x *= 0.7;
        if (v.y < 0.6) v.y = 0;
      }
    }
    this.ball.rotation.z -= this.spin * dt;
    this.spin *= Math.exp(-0.4 * dt);
    this.shadowUpdate();
  }
  shadowUpdate() {
    const b = this.ball.position;
    this.shadow.position.x = b.x;
    const k = clamp(1 - b.y / 7, 0.25, 1);
    this.shadow.scale.setScalar(0.6 + k * 0.6);
    this.shadow.material.opacity = 0.12 + k * 0.25;
  }

  animate(dt) {
    const t = this.app.time;
    this.foam.forEach((f, i) => { f.position.z = -14 - i * 1.4 + Math.sin(t * 0.8 + i) * 0.5; });
    if (!this.served && this.state !== 'over') this.ball.position.y = 3.3 + Math.sin(t * 3) * 0.08;
  }

  updateCamera(dt, instant) {
    if (this.winnerCam(instant)) return;
    const b = this.ball.position;
    // a little off-axis so the net reads as a net, not a pole
    this.rig.to(new THREE.Vector3(b.x * 0.12 + 2.6, 3.5, 14.0), new THREE.Vector3(b.x * 0.15 + 0.3, 2.3 + Math.max(0, b.y - 4.5) * 0.3, 0), instant);
  }

  previewPose() {
    const [a, b] = this.players;
    a.pos.set(-1.6, 0.75, 0); a.fig.pose = 'air'; a.fig.face(Math.PI / 2 - 0.4, true);
    b.pos.set(2.4, 0, 0); b.fig.speed = 5; b.fig.face(-Math.PI / 2 + 0.3, true);
    this.served = true; // so animate() leaves the ball where we put it
    this.ball.position.set(-1.35, 0.75 + PY + PR + BR + 0.05, 0);
    this.shadowUpdate();
    this.fx.burst(new THREE.Vector3(-1.4, 2.5, 0), '#FFFFFF', { n: 6, speed: 2, up: 2, size: 0.06 });
    this.rig.to(new THREE.Vector3(0.2, 2.6, 7.6), new THREE.Vector3(0, 1.6, 0), true);
  }
}

function palm(x, z, h, lean) {
  const g = new THREE.Group();
  const bark = vinyl('#C48A55', { rough: 0.6, coat: 0.2 });
  const segs = 7;
  let px = 0, py = 0;
  for (let i = 0; i < segs; i++) {
    const s = mesh(sharedGeo('vb:trunk', () => new THREE.CylinderGeometry(0.17, 0.22, 0.85, 12)), bark);
    const k = i / segs;
    px = Math.sin(k * 1.2) * lean * h * 0.5;
    py = (i + 0.5) * (h / segs);
    s.position.set(px, py, 0);
    s.rotation.z = -lean * Math.cos(k * 1.2) * 0.6;
    s.scale.set(1 - k * 0.3, h / segs / 0.85, 1 - k * 0.3);
    g.add(s);
  }
  const top = new THREE.Vector3(px, h, 0);
  const leaf = vinyl('#4FB86A', { rough: 0.4, coat: 0.5 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const l = mesh(sharedGeo('vb:leaf', () => new THREE.SphereGeometry(1, 16, 8)), leaf);
    l.scale.set(1.25, 0.08, 0.32);
    l.position.copy(top).add(new THREE.Vector3(Math.cos(a) * 1.0, -0.25, Math.sin(a) * 1.0));
    l.rotation.set(0, -a, -0.45);
    g.add(l);
  }
  for (let i = 0; i < 3; i++) {
    const c = mesh(sharedGeo('vb:nut', () => new THREE.SphereGeometry(0.16, 14, 10)), vinyl('#7A4E2A', { rough: 0.5 }));
    c.position.copy(top).add(new THREE.Vector3(Math.cos(i * 2.1) * 0.22, -0.25, Math.sin(i * 2.1) * 0.22));
    g.add(c);
  }
  g.position.set(x, 0, z);
  return g;
}

function umbrella(x, z, color) {
  const g = new THREE.Group();
  const pole = mesh(sharedGeo('vb:pole', () => new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8)), vinyl('#FFFFFF', { rough: 0.3 }));
  pole.position.y = 1.2;
  const tex = canvasTexture(256, 32, (gg, w, h) => { for (let i = 0; i < 8; i++) { gg.fillStyle = i % 2 ? '#FFFFFF' : color; gg.fillRect((i * w) / 8, 0, w / 8 + 1, h); } });
  const canopy = mesh(new THREE.ConeGeometry(1.5, 0.6, 16, 1, true), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, side: THREE.DoubleSide }));
  canopy.position.y = 2.45;
  const knob = mesh(sharedGeo('vb:knob', () => new THREE.SphereGeometry(0.08, 10, 8)), vinyl('#FFFFFF'));
  knob.position.y = 2.78;
  g.add(pole, canopy, knob);
  g.position.set(x, 0, z);
  g.rotation.z = 0.12;
  return g;
}
