// SPIN CYCLE — two candy bars sweep round a funfair platform: jump the low one, duck the high one.
// Three hearts each; the bars spin faster and sometimes flip direction.
import * as THREE from 'three';
import { BaseGame } from './base.js';
import { studio, vinyl, mesh, rbox, sharedGeo, canvasTexture, cloud, PAL, TEAM } from '../engine.js';
import { sfx } from '../audio.js';
import { rand, pick, clamp, wrapAngle } from '../util.js';

const S = 1.25;
const SPOT_R = 3.1;                      // where the players stand
const PLAT_R = 4.3, ARM_LEN = 4.6;
const LOW_Y = 0.3, HIGH_Y = 1.05;        // arm heights (centre)
const ARM_R = 0.15;
const HIT_ANGLE = (ARM_R + 0.22) / SPOT_R; // angular half-width of a contact
const JUMP = 6.6, GRAV = 22, CLEAR = 0.5;
const HEARTS = 3;
const DUCK = { lean: 0.7, ll: -1.25, rl: -1.25, y: -0.26, la: -2.7, ra: -2.7, laZ: -0.7, raZ: 0.7, headX: 0.35 };

function stripes(a, b, n = 10, vertical = false) {
  const t = canvasTexture(256, 64, (g, w, h) => {
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; vertical ? g.fillRect(0, (i * h) / n, w, h / n + 1) : g.fillRect((i * w) / n, 0, w / n + 1, h); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export class SpinCycle extends BaseGame {
  static meta = {
    touch: { pads: { up: 'JUMP', down: 'DUCK' }, layout: 'col', tip: 'Jump the low bar, hold DUCK for the high bar' },
    id: 'spin', title: 'Spin Cycle', icon: '🌀', color: '#B8F0C9', ink: '#145A32', rounds: 2, figScale: S,
    tagline: 'Jump the low bar, duck the high bar. Faster… and faster!',
    goal: 'Two candy bars sweep round the platform. JUMP the low pink one, hold DOWN to duck the yellow high one. Each hit costs a heart — last figure with hearts wins the round.',
    touchGoal: 'Two candy bars sweep round the platform. Tap JUMP for the low pink one, hold DUCK for the yellow high one. Each hit costs a heart — last figure with hearts wins the round.',
    controls: [['up', 'Jump the low bar'], ['down', 'Hold: duck the high bar']],
  };

  build() {
    this.lights = studio(this.scene, this.app.engine, { sky: ['#8E7BEF', '#E7A6D6', '#FFE2C2'], fog: '#F4D6E6', fogNear: 26, fogFar: 70, shadow: 8, sun: [4, 13, 8], sunI: 2.1 });
    this.lights.follow(new THREE.Vector3(0, 0, 0));
    const ground = mesh(new THREE.CircleGeometry(60, 64), vinyl('#F3E7FA', { rough: 0.85, coat: 0 }), { cast: false });
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.45;
    this.scene.add(ground);

    // platform: a striped turntable with a bulb-studded rim
    const topTex = canvasTexture(512, 512, (g, w, h) => {
      g.translate(w / 2, h / 2);
      for (let i = 0; i < 24; i++) {
        g.fillStyle = i % 2 ? '#FFFFFF' : '#CFF5DB';
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, w / 2, (i / 24) * Math.PI * 2, ((i + 1) / 24) * Math.PI * 2); g.closePath(); g.fill();
      }
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(0, 0, 60, 0, 7); g.fill();
    });
    const plat = mesh(new THREE.CylinderGeometry(PLAT_R, PLAT_R + 0.1, 0.45, 72), [vinyl(PAL.lilac, { rough: 0.3, coat: 0.7 }), new THREE.MeshPhysicalMaterial({ map: topTex, roughness: 0.35, clearcoat: 0.6 }), vinyl(PAL.lilac)]);
    plat.position.y = -0.225;
    this.scene.add(plat);
    const rim = mesh(new THREE.TorusGeometry(PLAT_R + 0.02, 0.08, 12, 96), vinyl('#FFFFFF', { rough: 0.25, coat: 0.8 }));
    rim.rotation.x = -Math.PI / 2;
    this.scene.add(rim);
    this.bulbs = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const m = new THREE.MeshStandardMaterial({ color: '#FFF4D0', emissive: '#FFD27A', emissiveIntensity: 1.2, roughness: 0.3 });
      const b = new THREE.Mesh(sharedGeo('sp:bulb', () => new THREE.SphereGeometry(0.07, 12, 8)), m);
      b.position.set(Math.cos(a) * (PLAT_R + 0.02), -0.25, Math.sin(a) * (PLAT_R + 0.02));
      this.scene.add(b);
      this.bulbs.push(b);
    }
    // spots where the players stand
    for (const team of [0, 1]) {
      const pad = mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 40), vinyl(TEAM[team].light, { rough: 0.35, coat: 0.6 }), { cast: false });
      pad.position.set(team ? SPOT_R : -SPOT_R, 0.02, 0);
      this.scene.add(pad);
    }

    // the spinner: a candy pillar with a carousel roof, and two arms
    this.spinner = new THREE.Group();
    const pillarTex = stripes('#FFFFFF', '#FF8FB1', 12, true);
    pillarTex.repeat.set(1, 1);
    const pillar = mesh(new THREE.CylinderGeometry(0.42, 0.5, 2.0, 32), new THREE.MeshPhysicalMaterial({ map: pillarTex, roughness: 0.3, clearcoat: 0.8 }));
    pillar.position.y = 1.0;
    const roofTex = stripes('#FFFFFF', PAL.mustard, 16);
    const roof = mesh(new THREE.ConeGeometry(1.0, 0.7, 32), new THREE.MeshPhysicalMaterial({ map: roofTex, roughness: 0.3, clearcoat: 0.7 }));
    roof.position.y = 2.35;
    const knob = mesh(sharedGeo('sp:knob', () => new THREE.SphereGeometry(0.16, 16, 12)), vinyl(PAL.mustard, { rough: 0.2, coat: 1 }));
    knob.position.y = 2.75;
    const hub = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.18, 32), vinyl('#FFFFFF', { rough: 0.25, coat: 0.8 }));
    hub.position.y = 0.09;
    this.spinner.add(pillar, roof, knob, hub);
    this.arms = [this.makeArm('low', '#FF7EB6'), this.makeArm('high', '#FFD84D')];
    this.scene.add(this.spinner);

    // funfair backdrop: striped tents, a ferris wheel, string lights
    for (const [x, z, s, c] of [[-11, -7, 1.3, '#FF8FB1'], [-6.5, -11, 1.0, PAL.mustard], [7.5, -10, 1.15, PAL.lilac], [12, -6, 1.2, '#7ED6A5']]) this.scene.add(tent(x, z, s, c));
    this.wheel = ferrisWheel();
    this.wheel.position.set(2, 0, -18);
    this.scene.add(this.wheel);
    this.lightsStr = [];
    const poles = [[-9, -4.5], [-3, -6.5], [3, -6.5], [9, -4.5]];
    for (const [x, z] of poles) {
      const pole = mesh(sharedGeo('sp:pole', () => new THREE.CylinderGeometry(0.05, 0.06, 4, 8)), vinyl('#FFFFFF'));
      pole.position.set(x, 1.55, z);
      this.scene.add(pole);
    }
    const bulbCols = ['#FFE07A', '#FF9CC8', '#9EE6C0', '#C9B6FF'];
    for (let k = 0; k < poles.length - 1; k++) {
      const [x0, z0] = poles[k], [x1, z1] = poles[k + 1];
      for (let i = 1; i < 12; i++) {
        const u = i / 12;
        const m = new THREE.MeshStandardMaterial({ color: bulbCols[i % 4], emissive: bulbCols[i % 4], emissiveIntensity: 0.9, roughness: 0.3 });
        const b = new THREE.Mesh(sharedGeo('sp:bulb2', () => new THREE.SphereGeometry(0.09, 10, 8)), m);
        b.position.set(x0 + (x1 - x0) * u, 3.5 - Math.sin(u * Math.PI) * 0.7, z0 + (z1 - z0) * u);
        this.scene.add(b);
        this.lightsStr.push(b);
      }
    }
    for (const [x, y, z, s] of [[-14, 9, -24, 2.4], [13, 10, -26, 2.8], [-3, 12, -30, 2]]) { const c = cloud(s, '#FFF6FB'); c.position.set(x, y, z); this.scene.add(c); }

    // floating hearts above each player
    const heartGeo = sharedGeo('sp:heart', () => {
      const s = new THREE.Shape();
      s.moveTo(0, -0.5);
      s.bezierCurveTo(-0.15, -0.35, -0.6, -0.1, -0.6, 0.2);
      s.bezierCurveTo(-0.6, 0.48, -0.32, 0.6, -0.15, 0.55);
      s.bezierCurveTo(-0.06, 0.52, 0, 0.42, 0, 0.36);
      s.bezierCurveTo(0, 0.42, 0.06, 0.52, 0.15, 0.55);
      s.bezierCurveTo(0.32, 0.6, 0.6, 0.48, 0.6, 0.2);
      s.bezierCurveTo(0.6, -0.1, 0.15, -0.35, 0, -0.5);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 3, curveSegments: 16 });
      g.center();
      return g;
    });
    this.heartRows = this.players.map(() => {
      const row = new THREE.Group();
      row.userData.hearts = Array.from({ length: HEARTS }, (_, i) => {
        const h = mesh(heartGeo, vinyl('#FF4D6D', { rough: 0.2, coat: 1 }), { cast: false });
        h.scale.setScalar(0.17);
        h.position.x = (i - (HEARTS - 1) / 2) * 0.3;
        row.add(h);
        return h;
      });
      this.scene.add(row);
      return row;
    });
    this.angle = 0;
    this.omega = 1.0;
    this.dir = 1;
  }

  makeArm(kind, color) {
    const g = new THREE.Group();
    const tex = stripes('#FFFFFF', color, 14);
    tex.repeat.set(1, 1);
    const bar = mesh(new THREE.CylinderGeometry(ARM_R, ARM_R, ARM_LEN - 0.4, 20), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.25, clearcoat: 0.9 }));
    bar.rotation.z = Math.PI / 2;
    bar.position.x = 0.4 + (ARM_LEN - 0.4) / 2;
    const tipMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.3 });
    const tip = mesh(sharedGeo('sp:tip', () => new THREE.SphereGeometry(0.24, 20, 14)), tipMat);
    tip.position.x = ARM_LEN;
    g.add(bar, tip);
    if (kind === 'high') {
      // the high bar hangs from a strut on the pillar
      const strut = mesh(sharedGeo('sp:strut', () => new THREE.CylinderGeometry(0.06, 0.06, 0.8, 10)), vinyl('#FFFFFF', { rough: 0.3 }));
      strut.position.set(0.45, 0.4, 0);
      g.add(strut);
    }
    g.position.y = kind === 'low' ? LOW_Y : HIGH_Y;
    g.userData = { kind, tip, tipMat, offset: kind === 'low' ? 0 : (2 * Math.PI) / 3 };
    this.spinner.add(g);
    return g;
  }

  armAngle(arm) { return this.angle + arm.userData.offset; }
  spotAngle(p) { return p.id ? 0 : Math.PI; } // angle measured the same way as arm rotation (x = cos, z = -sin)

  resetRound() {
    this.angle = (2 * Math.PI) / 3; // both arms start a third of a turn away from either spot
    this.omega = 1.05;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.flip = null;
    this.nextFlip = rand(8, 12);
    this.players.forEach((p, i) => {
      p.hearts = HEARTS;
      p.pos.set(i ? SPOT_R : -SPOT_R, 0, 0);
      p.vy = 0; p.ground = true; p.duck = false; p.inv = 0; p.knock = 0;
      p.fig.pose = 'auto';
      p.fig.custom = null;
      p.fig.root.visible = true;
      p.fig.tumble.rotation.set(0, 0, 0);
      p.fig.face(i ? -0.6 : 0.6, true);
      this.heartRows[i].userData.hearts.forEach(h => { h.visible = true; h.scale.setScalar(0.17); });
    });
    this.applySpinner();
  }
  applySpinner() {
    for (const a of this.arms) a.rotation.y = this.armAngle(a);
  }

  onGo() { if (!this.preview && this.round === 1) this.ui.toast('🌀 Jump the pink bar, duck the yellow one!'); }

  onPress(p, action) {
    if (action === 'up' && p.ground && p.knock <= 0 && !p.duck) {
      p.vy = JUMP;
      p.ground = false;
      sfx.jump();
    }
  }

  tick(dt) {
    // spin: speeds up, and every so often slows to a stop and flips direction
    if (this.live) {
      // speeds up to a cap; after 45 s the cap keeps creeping up so long rounds still end
      this.omega = Math.min(3.0 + Math.max(0, this.roundTime - 45) * 0.06, this.omega + dt * 0.045);
      this.nextFlip -= dt;
      if (!this.flip && this.nextFlip < 1.1 && this.nextFlip > 0) {
        this.flip = { t: 0 };
        this.ui.toast('↺ Reverse incoming!');
        sfx.honk();
      }
      if (this.flip) {
        this.flip.t += dt;
        if (this.flip.t >= 1.1 && !this.flip.done) { this.flip.done = true; this.dir *= -1; }
        if (this.flip.t >= 1.7) { this.flip = null; this.nextFlip = rand(7, 12); }
      }
    }
    // during a flip the bars brake hard, then swing back the other way
    const brake = this.flip ? clamp(Math.abs(this.flip.t - 1.1) / 0.6, 0.15, 1) : 1;
    const w = this.state === 'play' ? this.omega * brake * this.dir : 0.6 * this.dir;
    const prev = this.angle;
    this.angle += w * dt;
    this.applySpinner();

    for (const p of this.players) {
      p.inv = Math.max(0, p.inv - dt);
      const f = p.fig;
      if (p.knock > 0) {
        // knocked off the spot: fly back in an arc, then hop home
        p.knock -= dt;
        const k = 1 - Math.max(0, p.knock) / 1.0;
        const out = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 1.1;
        p.pos.x = (p.id ? 1 : -1) * (SPOT_R + out);
        p.pos.y = Math.max(0, Math.sin(Math.min(1, k * 1.6) * Math.PI) * 1.1);
        f.tumble.rotation.z = (p.id ? -1 : 1) * Math.min(1, k * 1.6) * Math.PI * 2;
        if (p.knock <= 0) {
          p.pos.set(p.id ? SPOT_R : -SPOT_R, 0, 0);
          f.tumble.rotation.set(0, 0, 0);
          f.land(0.8);
          f.pose = p.hearts > 0 ? 'auto' : 'sad';
          if (p.hearts > 0) f.dizzy = 0.5;
        }
      } else if (!p.ground) {
        p.vy -= GRAV * dt;
        p.pos.y += p.vy * dt;
        if (p.pos.y <= 0) { p.pos.y = 0; p.vy = 0; p.ground = true; f.land(0.6); sfx.land(); }
      }
      p.duck = this.live && p.ground && p.knock <= 0 && p.hearts > 0 && this.input.isHeld(p.id, 'down');
      if (p.duck && !p.wasDuck) sfx.duck();
      p.wasDuck = p.duck;
      if (p.knock <= 0) {
        f.custom = p.duck ? DUCK : null;
        if (this.state === 'play') f.pose = !p.ground ? 'air' : p.hearts > 0 ? 'auto' : 'sad';
        else if (f.pose === 'air' && p.ground) f.pose = 'auto';
      }
      // blink while invulnerable
      f.root.visible = p.inv > 0 && p.knock <= 0 ? Math.floor(p.inv * 12) % 2 === 0 : true;

      // contact with either bar sweeping past this spot
      if (this.live && p.inv <= 0 && p.knock <= 0 && p.hearts > 0) {
        for (const a of this.arms) {
          const spot = this.spotAngle(p);
          const before = wrapAngle(prev + a.userData.offset - spot), now = wrapAngle(this.angle + a.userData.offset - spot);
          const swept = Math.abs(now) < HIT_ANGLE || (Math.sign(before) !== Math.sign(now) && Math.abs(before) < 1 && Math.abs(now) < 1);
          if (!swept) continue;
          const safe = a.userData.kind === 'low' ? p.pos.y > CLEAR : p.duck;
          if (!safe) { this.hit(p, a); break; }
        }
      }
    }
    // hearts follow the heads
    this.players.forEach((p, i) => {
      const row = this.heartRows[i];
      row.position.set(p.pos.x, p.pos.y + 2.05 + (p.duck ? -0.35 : 0), p.pos.z + 0.2);
      row.quaternion.copy(this.camera.quaternion);
      row.userData.hearts.forEach((h, k) => { h.rotation.y = Math.sin(this.app.time * 2 + k) * 0.3; });
    });
    if (this.live) {
      const [a, b] = this.players;
      if (a.hearts <= 0 && b.hearts <= 0) this.endRound(null, 'DOUBLE KNOCKOUT!');
      else if (a.hearts <= 0) this.endRound(1, `${this.name(1)} OUTLASTS!`);
      else if (b.hearts <= 0) this.endRound(0, `${this.name(0)} OUTLASTS!`);
    }
  }

  hit(p, arm) {
    p.hearts--;
    p.inv = 1.6;
    p.knock = 1.0;
    p.vy = 0; p.ground = true;
    p.fig.custom = null;
    p.fig.pose = 'blasted';
    sfx.bonk();
    this.rig.shake(0.25, 0.3);
    const at = p.pos.clone().setY(arm.userData.kind === 'low' ? 0.4 : 1.2);
    this.fx.stars(at, 6);
    this.fx.burst(at, arm.userData.kind === 'low' ? '#FF7EB6' : '#FFD84D', { n: 10, speed: 3, up: 3, size: 0.08 });
    const h = this.heartRows[p.id].userData.hearts[p.hearts];
    if (h) {
      h.visible = false;
      this.fx.burst(h.getWorldPosition(new THREE.Vector3()), '#FF4D6D', { n: 8, speed: 2, up: 2, size: 0.07 });
    }
  }

  animate(dt) {
    const t = this.app.time;
    this.bulbs.forEach((b, i) => { b.material.emissiveIntensity = 0.5 + (Math.sin(t * 6 - i * 0.6) > 0.3 ? 1.1 : 0.1); });
    this.lightsStr.forEach((b, i) => { b.material.emissiveIntensity = 0.5 + 0.5 * Math.sin(t * 3 + i); });
    for (const a of this.arms) a.userData.tipMat.emissiveIntensity = 0.7 + Math.sin(t * 8) * 0.3;
    this.wheel.userData.ring.rotation.z = t * 0.15;
  }

  updateCamera(dt, instant) {
    if (this.winnerCam(instant)) return;
    this.rig.to(new THREE.Vector3(0, 6.2, 10.4), new THREE.Vector3(0, 0.45, 0), instant);
  }

  previewPose() {
    const [a, b] = this.players;
    // low bar sweeping under a jumping P1, high bar over a ducking P2
    this.angle = Math.PI - 0.05;
    this.arms[1].userData.offset = Math.PI + 0.05; // just for the snapshot: high arm points at P2
    this.applySpinner();
    a.pos.set(-SPOT_R, 0.75, 0); a.fig.pose = 'air'; a.fig.face(0.6, true);
    b.duck = true; b.fig.custom = DUCK; b.fig.face(-0.6, true);
    this.heartRows.forEach((row, i) => { row.position.set(this.players[i].pos.x, this.players[i].pos.y + 2.0, 0.2); });
    this.heartRows[1].userData.hearts[2].visible = false;
    this.rig.to(new THREE.Vector3(0, 3.6, 7.4), new THREE.Vector3(0, 0.7, 0), true);
  }
}

function tent(x, z, s, color) {
  const g = new THREE.Group();
  const wallTex = stripes('#FFFFFF', color, 16);
  const walls = mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.6, 24, 1, true), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.55, side: THREE.DoubleSide }));
  walls.position.y = 0.8;
  const roof = mesh(new THREE.ConeGeometry(1.9, 1.5, 24), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.5 }));
  roof.position.y = 2.35;
  const flag = mesh(sharedGeo('sp:tflag', () => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.5, -0.15); sh.lineTo(0, -0.3); sh.closePath(); return new THREE.ShapeGeometry(sh); }), vinyl(PAL.mustard, { side: THREE.DoubleSide }), { cast: false });
  flag.position.y = 3.45;
  const stick = mesh(sharedGeo('sp:stick', () => new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6)), vinyl('#FFFFFF'));
  stick.position.y = 3.25;
  g.add(walls, roof, flag, stick);
  g.position.set(x, -0.45, z);
  g.scale.setScalar(s);
  return g;
}

function ferrisWheel() {
  const g = new THREE.Group();
  const ring = new THREE.Group();
  const white = vinyl('#FFFFFF', { rough: 0.3, coat: 0.6 });
  const rimM = mesh(new THREE.TorusGeometry(5, 0.12, 10, 64), white, { cast: false });
  ring.add(rimM);
  const cols = ['#FF8FB1', PAL.mustard, PAL.lilac, '#7ED6A5', '#5B8DEF', '#FFFFFF'];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const spoke = mesh(sharedGeo('sp:spoke', () => new THREE.CylinderGeometry(0.04, 0.04, 5, 6)), white, { cast: false });
    spoke.position.set(Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0);
    spoke.rotation.z = a - Math.PI / 2;
    const cab = mesh(sharedGeo('sp:cab', () => new THREE.SphereGeometry(0.42, 16, 12)), vinyl(cols[i % cols.length], { rough: 0.3, coat: 0.7 }), { cast: false });
    cab.position.set(Math.cos(a) * 5, Math.sin(a) * 5, 0.2);
    ring.add(spoke, cab);
  }
  ring.position.y = 6.2;
  const legs = [-1, 1].map(s => {
    const l = mesh(sharedGeo('sp:leg', () => new THREE.CylinderGeometry(0.12, 0.16, 6.6, 10)), white, { cast: false });
    l.position.set(s * 1.6, 3.0, -0.4);
    l.rotation.z = s * 0.26;
    return l;
  });
  g.add(ring, ...legs);
  g.userData.ring = ring;
  return g;
}
