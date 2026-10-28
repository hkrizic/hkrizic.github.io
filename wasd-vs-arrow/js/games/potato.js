// HOT POTATO — bomb tag in a playroom full of giant key caps. Touch your rival to pass the bomb; don't hold it at BOOM.
import * as THREE from 'three';
import { BaseGame } from './base.js';
import { studio, vinyl, matte, mesh, rbox, sharedGeo, keycap, canvasTexture, TEAM, PAL, FONT } from '../engine.js';
import { sfx } from '../audio.js';
import { rand, pick, clamp } from '../util.js';

const AW = 14, AD = 9, PR = 0.5, CAP = 0.68;

export class HotPotato extends BaseGame {
  static meta = {
    touch: { stick: 'Run & tag', button: ['DASH', 'dash', 'Dash to catch or escape'] },
    id: 'potato', title: 'Hot Potato', icon: '💣', color: '#232B45', ink: '#FFFFFF', accent: '#FF9F45', rounds: 3, figScale: 1.35,
    tagline: 'Tag your rival to pass the bomb before it blows!',
    goal: 'Got the bomb? Touch your rival to pass it. Whoever holds it when the fuse runs out goes BOOM.',
    controls: [['move', 'Run & tag'], ['tap2', 'Double-tap = dash']],
  };

  build() {
    this.lights = studio(this.scene, this.app.engine, { sky: ['#FFC9A8', '#FFE4CF', '#FFF3E6'], fog: '#FFEBDA', fogNear: 30, fogFar: 70, shadow: 10, sun: [5, 15, 8] });
    const ground = mesh(new THREE.CircleGeometry(60, 64), vinyl('#FFDCC0', { rough: 0.9, coat: 0 }), { cast: false });
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.4;
    this.scene.add(ground);
    // play mat
    const matTex = canvasTexture(1400, 900, (g, w, h) => {
      const s = 100;
      for (let y = 0; y < h / s; y++) for (let x = 0; x < w / s; x++) { g.fillStyle = (x + y) % 2 ? '#FFF4E2' : '#FFE9CC'; g.fillRect(x * s, y * s, s, s); }
      g.strokeStyle = 'rgba(255,111,89,0.25)'; g.lineWidth = 14;
      g.beginPath(); g.arc(w / 2, h / 2, 150, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    });
    // rounded-box UVs span each face, so the mat texture fits the top exactly
    const floor = mesh(rbox(AW + 0.2, 0.4, AD + 0.2, 0.12, 3), new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.7 }));
    floor.position.y = -0.2;
    this.scene.add(floor);
    // walls with a mustard cap
    const wallMat = vinyl(PAL.ink, { rough: 0.35, coat: 0.5 }), capMat = vinyl(PAL.mustard, { rough: 0.3, coat: 0.7 });
    for (const [w, d, x, z] of [[AW + 1.0, 0.5, 0, -(AD + 0.5) / 2], [AW + 1.0, 0.5, 0, (AD + 0.5) / 2], [0.5, AD + 1.0, -(AW + 0.5) / 2, 0], [0.5, AD + 1.0, (AW + 0.5) / 2, 0]]) {
      const wall = mesh(rbox(w, 0.55, d, 0.15, 3), wallMat);
      wall.position.set(x, 0.07, z);
      const cap = mesh(rbox(w + 0.04, 0.12, d + 0.04, 0.06, 3), capMat);
      cap.position.set(x, 0.38, z);
      this.scene.add(wall, cap);
    }
    // giant key caps as obstacles
    this.caps = [];
    for (const [label, team, x, z] of [['W', 0, -4.2, -2.0], ['S', 0, -4.2, 2.0], ['↑', 1, 4.2, -2.0], ['↓', 1, 4.2, 2.0], ['A', 0, -0.9, 0.2], ['→', 1, 0.9, -0.2]]) {
      const k = keycap(label, { body: '#FFFFFF', top: '#FFFFFF', legend: TEAM[team].color, size: 1.36 });
      k.position.set(x, 0, z);
      k.rotation.y = rand(-0.06, 0.06);
      this.scene.add(k);
      this.caps.push({ x, z });
    }
    // corner toys: block stacks + balloons
    const letters = ['W', 'A', 'S', 'D', '↑', '↓'];
    for (const [x, z, n] of [[-9.0, -3.2, 3], [9.2, 3.0, 2], [-9.3, 3.4, 1], [9.0, -3.6, 2]]) {
      for (let i = 0; i < n; i++) {
        const b = keycap(letters[(i + Math.abs(x | 0)) % 6], { body: pick([PAL.coral, PAL.teal, PAL.mustard, PAL.lilac, PAL.pink]), top: '#FFFFFF', legend: PAL.ink, size: 0.9 });
        b.position.set(x + rand(-0.1, 0.1), -0.4 + i * 0.58, z + rand(-0.1, 0.1));
        b.rotation.y = rand(-0.5, 0.5);
        this.scene.add(b);
      }
    }
    for (const [x, z, c] of [[-8.6, 0.2, PAL.coral], [8.7, -0.4, PAL.teal]]) {
      const ball = mesh(sharedGeo('balloonP', () => new THREE.SphereGeometry(0.55, 28, 20)), vinyl(c, { rough: 0.15, coat: 1 }));
      ball.scale.set(1, 1.18, 1);
      ball.position.set(x, 2.6, z);
      const str = mesh(sharedGeo('string', () => new THREE.CylinderGeometry(0.012, 0.012, 2.4, 6)), matte('#FFFFFF'));
      str.position.set(x, 0.85, z);
      ball.userData.base = ball.position.clone();
      this.scene.add(ball, str);
      (this.balloons ||= []).push(ball);
    }

    // the bomb
    const bomb = this.bomb = new THREE.Group();
    this.bombMat = new THREE.MeshPhysicalMaterial({ color: '#1B1F2E', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, emissive: '#FF3B1F', emissiveIntensity: 0 });
    const ball = mesh(new THREE.SphereGeometry(0.34, 32, 22), this.bombMat);
    const cap = mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 20), vinyl('#9AA3AF', { rough: 0.25, metal: 0.7 }));
    cap.position.y = 0.34;
    const shine = mesh(new THREE.SphereGeometry(0.07, 12, 8), vinyl('#FFFFFF', { rough: 0.1, emissive: '#FFFFFF', ei: 0.6 }), { cast: false });
    shine.position.set(-0.13, 0.16, 0.24); shine.scale.set(1, 0.6, 0.5);
    this.fuseCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.38, 0), new THREE.Vector3(0.05, 0.5, 0), new THREE.Vector3(0.16, 0.58, 0.02), new THREE.Vector3(0.24, 0.55, 0.04), new THREE.Vector3(0.3, 0.62, 0.05)]);
    this.fuse = mesh(new THREE.TubeGeometry(this.fuseCurve, 24, 0.022, 6, false), vinyl('#C9A26B', { rough: 0.7 }));
    this.spark = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: '#FFE27A', toneMapped: false }));
    this.spark.userData.big = true;
    bomb.add(ball, cap, shine, this.fuse, this.spark);
    bomb.scale.setScalar(1.15);
    this.scene.add(bomb);
    this.flash = new THREE.PointLight('#FFB056', 0, 14, 1.4);
    this.scene.add(this.flash);
    this.holder = Math.random() < 0.5 ? 0 : 1;
  }

  resetRound() {
    if (this.round > 1 && this.lastWinner != null) this.holder = this.lastWinner; // the survivor starts with the bomb
    this.fuseTotal = rand(12, 18);
    this.fuseLeft = this.fuseTotal;
    this.passCd = 0.8;
    this.fly = null;
    this.exploded = false;
    this.tickAcc = 0;
    this.pulse = 0;
    this.bomb.visible = true;
    this.flash.intensity = 0;
    this.players.forEach((p, i) => {
      p.pos.set(i ? 5.6 : -5.6, 0, 0);
      p.vel.set(0, 0, 0);
      p.vy = 0; p.stun = 0; p.dashCd = 0; p.dashT = 0; p.speedMul = 1; p.boostT = 0; p.air = false;
      p.fig.setSoot(0);
      p.fig.tumble.rotation.set(0, 0, 0);
      p.fig.pose = 'auto';
      p.fig.dizzy = 0;
      p.fig.armsUp = i === this.holder;
      p.fig.face(i ? -Math.PI / 2 : Math.PI / 2, true);
    });
    this.placeBomb(0);
  }

  bombSpot(p, out = new THREE.Vector3()) { return out.set(p.pos.x, p.pos.y + 1.85, p.pos.z); }
  placeBomb(t) {
    if (this.fly) {
      const f = this.fly;
      const k = clamp(f.t / f.dur, 0, 1);
      const a = this.bombSpot(this.players[f.from]), b = this.bombSpot(this.players[f.to]);
      this.bomb.position.lerpVectors(a, b, k);
      this.bomb.position.y += Math.sin(k * Math.PI) * 1.1;
      this.bomb.rotation.z = -k * Math.PI * 2;
    } else {
      this.bombSpot(this.players[this.holder], this.bomb.position);
      this.bomb.position.y += Math.sin(t * 6) * 0.04;
      this.bomb.rotation.z = Math.sin(t * 3) * 0.12;
    }
  }

  collideArena(p) {
    const hx = AW / 2 - PR, hz = AD / 2 - PR;
    if (Math.abs(p.pos.x) > hx) { p.pos.x = Math.sign(p.pos.x) * hx; p.vel.x *= -0.35; }
    if (Math.abs(p.pos.z) > hz) { p.pos.z = Math.sign(p.pos.z) * hz; p.vel.z *= -0.35; }
    for (const c of this.caps) {
      const dx = p.pos.x - c.x, dz = p.pos.z - c.z;
      const px = CAP + PR - Math.abs(dx), pz = CAP + PR - Math.abs(dz);
      if (px > 0 && pz > 0) {
        if (px < pz) { p.pos.x += Math.sign(dx) * px; p.vel.x *= -0.3; }
        else { p.pos.z += Math.sign(dz) * pz; p.vel.z *= -0.3; }
      }
    }
  }

  tick(dt) {
    const t = this.app.time;
    for (const p of this.players) {
      this.timers(p, dt);
      if (p.air) {
        // blasted into the air
        p.vy -= 22 * dt;
        p.pos.y += p.vy * dt;
        p.pos.x += p.vel.x * dt; p.pos.z += p.vel.z * dt;
        p.fig.tumble.rotation.x += dt * 9;
        this.collideArena(p);
        if (p.pos.y <= 0) {
          p.pos.y = 0; p.air = false; p.vel.set(0, 0, 0);
          p.fig.tumble.rotation.set(0, 0, 0);
          p.fig.pose = 'dizzy'; p.fig.land(1);
          sfx.land();
          this.fx.puff(p.pos.clone().setY(0.1), { n: 8, color: '#8A8A8A', size: 0.25 });
        }
        continue;
      }
      const holder = p.id === this.holder && !this.exploded;
      this.tryDash(p, { power: 10.5, cd: 1.5 });
      this.moveTopDown(p, dt, { accel: 34, max: holder ? 5.5 : 5.0, drag: 9, grip: 4 });
      this.collideArena(p);
    }
    const [a, b] = this.players;
    if (!a.air && !b.air) this.bump(a, b, { radius: PR, e: 0.5, kick: 1.0 });

    if (!this.exploded && this.state !== 'countdown') {
      if (this.fly) {
        this.fly.t += dt;
        if (this.fly.t >= this.fly.dur) this.fly = null;
      }
      if (this.live) {
        this.passCd -= dt;
        const d = Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
        if (d < PR * 2 + 0.12 && this.passCd <= 0 && !this.fly) this.pass();
        this.fuseLeft -= dt;
        const frac = Math.max(0, this.fuseLeft / this.fuseTotal);
        this.tickAcc += dt;
        const interval = 0.12 + frac * 0.75;
        if (this.tickAcc >= interval) { this.tickAcc = 0; sfx.tick(frac < 0.3); }
        if (Math.random() < 0.15) sfx.sizzle();
        if (this.fuseLeft <= 0) this.explode();
      }
    }
    // fuse burns down + spark at the tip
    const frac = clamp(this.fuseLeft / this.fuseTotal, 0, 1);
    this.fuse.geometry.setDrawRange(0, Math.max(1, Math.ceil(frac * 24)) * 6 * 6);
    this.spark.position.copy(this.fuseCurve.getPoint(frac));
    this.spark.scale.setScalar(0.8 + Math.random() * 0.8);
    if (this.live && !this.exploded && Math.random() < 0.5) {
      const w = this.spark.getWorldPosition(new THREE.Vector3());
      this.fx.burst(w, pick(['#FFE27A', '#FFB547', '#FFFFFF']), { n: 1, speed: 1.2, up: 1.5, size: 0.035, life: 0.35, gravity: -4, spin: 0 });
    }
    // pulse faster as time runs out
    this.pulse += dt * (2 + (1 - frac) * 14);
    this.bombMat.emissiveIntensity = this.exploded ? 0 : Math.pow(Math.max(0, Math.sin(this.pulse)), 4) * (0.25 + (1 - frac) * 1.2);
    this.bomb.scale.setScalar(1.15 * (1 + Math.pow(Math.max(0, Math.sin(this.pulse)), 6) * (0.05 + (1 - frac) * 0.1)));
    if (!this.exploded) this.placeBomb(t);
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 120);
  }

  pass() {
    const from = this.holder, to = 1 - from;
    this.fly = { from, to, t: 0, dur: 0.26 };
    this.holder = to;
    this.passCd = 0.85; // no tag-backs
    const giver = this.players[from], taker = this.players[to];
    giver.fig.armsUp = false; taker.fig.armsUp = true;
    giver.speedMul = 1.3; giver.boostT = 0.8; // run!
    taker.stun = 0.12;
    sfx.pass();
    this.fx.burst(this.bombSpot(taker), '#FFB547', { n: 8, geo: 'star', size: 0.06, speed: 2.5, up: 2 });
    this.ui.toast(`${this.name(to)} has the bomb!`, `team${to}`);
  }

  explode() {
    this.exploded = true;
    this.fly = null;
    const p = this.players[this.holder];
    const at = this.bomb.position.clone();
    this.bomb.visible = false;
    sfx.boom();
    this.rig.shake(0.9, 0.7);
    this.flash.position.copy(at);
    this.flash.intensity = 80;
    this.fx.blob(at, '#FFF1A8', { size: 2.4, life: 0.3, emissive: true });
    this.fx.blob(at, '#FF8A3D', { size: 3.4, life: 0.5, emissive: true });
    this.fx.puff(at, { n: 16, color: '#6B6B73', size: 0.5, speed: 4, up: 2.5, life: 1.1 });
    this.fx.burst(at, '#2B2B33', { n: 16, speed: 6, up: 6, size: 0.08, geo: 'box' });
    this.fx.shockwave(new THREE.Vector3(at.x, 0.06, at.z), '#FFB547', { size: 4.5, life: 0.55 });
    p.air = true;
    p.vy = 9.5;
    p.vel.set(rand(-2, 2), 0, rand(-2, 2));
    p.fig.armsUp = false;
    p.fig.pose = 'blasted';
    p.fig.setSoot(1);
    this.endRound(1 - p.id, `💥 BOOM! ${this.name(1 - p.id)} SURVIVES`);
  }

  animate(dt) {
    const t = this.app.time;
    for (const b of this.balloons ?? []) { b.position.y = b.userData.base.y + Math.sin(t * 1.4 + b.position.x) * 0.12; b.rotation.z = Math.sin(t * 1.1 + b.position.x) * 0.08; }
  }

  updateCamera(dt, instant) {
    if (this.winnerCam(instant)) return;
    const h = this.players[this.holder].pos;
    this.rig.to(new THREE.Vector3(h.x * 0.15, 11.0, 9.4 + h.z * 0.1), new THREE.Vector3(h.x * 0.15, -0.4, 0.9 + h.z * 0.1), instant);
  }

  previewPose() {
    const [a, b] = this.players;
    this.holder = 0;
    a.fig.armsUp = true; b.fig.armsUp = false;
    a.pos.set(-1.3, 0, 1.1); a.fig.face(1.2, true); a.fig.speed = 5;
    b.pos.set(0.9, 0, 1.7); b.fig.face(1.9, true); b.fig.speed = 5;
    this.fuseLeft = this.fuseTotal * 0.55;
    this.bombMat.emissiveIntensity = 0.6;
    this.placeBomb(0);
    this.rig.to(new THREE.Vector3(-0.2, 3.0, 5.2), new THREE.Vector3(-0.2, 0.8, 1.3), true);
  }
}
