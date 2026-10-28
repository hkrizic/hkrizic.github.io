// KART KERFUFFLE — a three-lap kart race around a stadium track. Up = gas, down = brake/reverse, left/right = steer.
import * as THREE from 'three';
import { BaseGame } from './base.js';
import { studio, vinyl, matte, mesh, rbox, sharedGeo, keycap, canvasTexture, TEAM, PAL } from '../engine.js';
import { sfx } from '../audio.js';
import { rand, pick, clamp } from '../util.js';

const L = 5.5, R = 4.6, HW = 2.0, VERGE = 0.9, KR = 0.62, LAPS = 3, KS = 1.15;
const P = 4 * L + 2 * Math.PI * R; // centerline length
const START = L; // start line: x = 0 on the bottom straight
const PADS = [[2.9, R], [-2.9, -R]];

// signed offset from the centerline (o > 0 = outside) + the outward normal
function trackAt(x, z) {
  const cx = clamp(x, -L, L), dx = x - cx, d = Math.hypot(dx, z) || 1e-6;
  return { o: d - R, nx: dx / d, nz: z / d };
}
// distance along the centerline, racing direction: bottom straight → right bend → top straight → left bend
function progress(x, z) {
  if (x >= -L && x <= L) return z >= 0 ? x + L : 2 * L + Math.PI * R + (L - x);
  if (x > L) return 2 * L + (Math.PI / 2 - Math.atan2(z, x - L)) * R;
  let phi = Math.atan2(z, x + L);
  if (phi < 0) phi += Math.PI * 2;
  return 4 * L + Math.PI * R + (1.5 * Math.PI - phi) * R;
}
// a point + racing-direction tangent on a stadium of radius r, t ∈ [0, 1)
function stadiumPoint(r, t) {
  let s = t * (4 * L + 2 * Math.PI * r);
  if (s < 2 * L) return [-L + s, r, 1, 0];
  s -= 2 * L;
  if (s < Math.PI * r) { const a = Math.PI / 2 - s / r; return [L + Math.cos(a) * r, Math.sin(a) * r, Math.sin(a), -Math.cos(a)]; }
  s -= Math.PI * r;
  if (s < 2 * L) return [L - s, -r, -1, 0];
  s -= 2 * L;
  const a = 1.5 * Math.PI - s / r;
  return [-L + Math.cos(a) * r, Math.sin(a) * r, Math.sin(a), -Math.cos(a)];
}
// rotation about y that lines a box's long (x) axis up with a tangent
const alongY = (tx, tz) => Math.atan2(-tz, tx);
function stadiumShape(r, shape = new THREE.Shape()) {
  shape.moveTo(-L, -r);
  shape.lineTo(L, -r);
  shape.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-L, r);
  shape.absarc(-L, 0, r, Math.PI / 2, 1.5 * Math.PI, false);
  return shape;
}
function ring(rOut, rIn) {
  const s = stadiumShape(rOut);
  s.holes.push(stadiumShape(rIn, new THREE.Path()));
  const g = new THREE.ShapeGeometry(s, 40);
  g.rotateX(Math.PI / 2); // shape y → world z (stadium is symmetric, so the flip doesn't matter)
  return g;
}

export class KartKerfuffle extends BaseGame {
  static meta = {
    touch: { stick: 'Point where you want to drive — push further to go faster', tip: 'Let go to brake' },
    id: 'kart', title: 'Kart Kerfuffle', icon: '🏎️', color: '#5B8DEF', ink: '#FFFFFF', rounds: 1, figScale: KS, hud: ['scores'],
    tagline: 'Three laps, two karts, one very bumpy track.',
    goal: 'Race three laps around the track. Hit the glowing boost pads, stay on the asphalt (grass slows you down) and bump your rival into the wall!',
    touchGoal: 'Race three laps. Point your stick where you want to drive — push it further to go faster, let go to brake. Hit the glowing boost pads and stay on the asphalt!',
    controls: [['up', 'Gas'], ['down', 'Brake / reverse'], ['lr', 'Steer']],
  };

  build() {
    this.lights = studio(this.scene, this.app.engine, { sky: ['#AEDBFF', '#DCEFFF', '#F2FAEC'], fog: '#E6F4EA', fogNear: 40, fogFar: 95, shadow: 16, sun: [6, 22, 12] });
    const grass = mesh(new THREE.CircleGeometry(90, 64), vinyl('#9BD67F', { rough: 0.9, coat: 0 }), { cast: false });
    grass.rotation.x = -Math.PI / 2; grass.position.y = -0.02;
    this.scene.add(grass);
    // asphalt, edge lines, centre dashes
    const asphalt = mesh(ring(R + HW, R - HW), vinyl('#5C6080', { rough: 0.75, coat: 0.05, side: THREE.DoubleSide }), { cast: false });
    asphalt.position.y = 0.01;
    const lineMat = vinyl('#FFFFFF', { rough: 0.5, coat: 0.1, side: THREE.DoubleSide });
    const edgeO = mesh(ring(R + HW - 0.06, R + HW - 0.16), lineMat, { cast: false });
    const edgeI = mesh(ring(R - HW + 0.16, R - HW + 0.06), lineMat, { cast: false });
    edgeO.position.y = edgeI.position.y = 0.02;
    this.scene.add(asphalt, edgeO, edgeI);
    const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.01, 0.08), vinyl('#FFFFFF', { rough: 0.5 }), 40);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < 40; i++) {
      const [x, z, tx, tz] = stadiumPoint(R, i / 40);
      q.setFromAxisAngle(up, alongY(tx, tz));
      dashes.setMatrixAt(i, m.compose(new THREE.Vector3(x, 0.025, z), q, one));
    }
    this.scene.add(dashes);
    // curbs on the bends (mustard/white), tyre-wall barriers on both sides
    const placeAlong = (r, count, geo, colors, y, onlyBends = false) => {
      const items = [];
      for (let i = 0; i < count; i++) {
        const [x, z, tx, tz] = stadiumPoint(r, i / count);
        if (onlyBends && Math.abs(x) <= L + 0.05) continue;
        items.push([x, z, alongY(tx, tz)]);
      }
      const im = new THREE.InstancedMesh(geo, new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.7 }), items.length);
      items.forEach(([x, z, a], i) => {
        q.setFromAxisAngle(up, a);
        im.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), q, one));
        im.setColorAt(i, new THREE.Color(colors[i % colors.length]));
      });
      im.castShadow = im.receiveShadow = true;
      this.scene.add(im);
    };
    placeAlong(R + HW + 0.17, 96, rbox(0.46, 0.08, 0.3, 0.04, 2), [PAL.mustard, '#FFFFFF'], 0.04, true);
    placeAlong(R - HW - 0.17, 60, rbox(0.46, 0.08, 0.3, 0.04, 2), [PAL.mustard, '#FFFFFF'], 0.04, true);
    placeAlong(R + HW + VERGE + 0.18, 74, rbox(0.86, 0.5, 0.36, 0.16, 3), ['#FFFFFF', PAL.lilac], 0.25);
    placeAlong(R - HW - VERGE - 0.18, 30, rbox(0.8, 0.5, 0.36, 0.16, 3), ['#FFFFFF', PAL.lilac], 0.25);
    // the island: a hedge bed with a giant trophy
    const bed = mesh(rbox(2 * L + 2.4, 0.3, 2.4, 0.15, 3), vinyl('#6FBF5E', { rough: 0.7, coat: 0.1 }));
    bed.position.y = 0.15;
    this.scene.add(bed);
    const gold = vinyl('#E9B949', { rough: 0.2, coat: 0.9, metal: 0.6 });
    const trophy = new THREE.Group();
    const foot = mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 32), vinyl(PAL.ink, { rough: 0.3, coat: 0.6 }));
    foot.position.y = 0.45;
    const stem = mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.5, 20), gold); stem.position.y = 0.85;
    const cup = mesh(new THREE.SphereGeometry(0.55, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), gold); cup.rotation.x = Math.PI; cup.position.y = 1.55;
    const lip = mesh(new THREE.TorusGeometry(0.55, 0.06, 12, 40), gold); lip.rotation.x = Math.PI / 2; lip.position.y = 1.55;
    trophy.add(foot, stem, cup, lip);
    for (const s of [-1, 1]) { const h = mesh(new THREE.TorusGeometry(0.22, 0.05, 10, 24), gold); h.position.set(s * 0.6, 1.35, 0); trophy.add(h); }
    this.trophy = trophy;
    this.scene.add(trophy);
    for (const x of [-4.2, -2.6, 2.6, 4.2]) {
      const bush = mesh(sharedGeo('bush', () => new THREE.SphereGeometry(0.5, 20, 14)), vinyl('#4FA95A', { rough: 0.6, coat: 0.2 }));
      bush.scale.set(1, 0.8, 1); bush.position.set(x, 0.55, 0);
      this.scene.add(bush);
    }
    // start/finish: chequered strip + two flag posts
    const checker = canvasTexture(64, 512, (g, w, h) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? PAL.ink : '#FFFFFF'; g.fillRect(x * 32, y * 32, 32, 32); }
    });
    const startLine = mesh(new THREE.PlaneGeometry(0.5, HW * 2), new THREE.MeshStandardMaterial({ map: checker, roughness: 0.6 }), { cast: false });
    startLine.rotation.x = -Math.PI / 2; startLine.position.set(0, 0.03, R);
    this.scene.add(startLine);
    for (const z of [R - HW - 0.55, R + HW + 0.55]) {
      const pole = mesh(sharedGeo('sfpole', () => new THREE.CylinderGeometry(0.05, 0.05, 1.8, 10)), vinyl('#FFFFFF'));
      pole.position.set(0, 0.9, z);
      const flag = mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshStandardMaterial({ map: checker, roughness: 0.5, side: THREE.DoubleSide }));
      flag.position.set(0.32, 1.55, z);
      this.scene.add(pole, flag);
    }
    // glowing boost pads with chevrons
    const chev = canvasTexture(256, 160, (g, w, h) => {
      g.fillStyle = PAL.mustard; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 22; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const x of [55, 125, 195]) { g.beginPath(); g.moveTo(x - 25, 30); g.lineTo(x + 20, h / 2); g.lineTo(x - 25, h - 30); g.stroke(); }
    });
    this.padMat = new THREE.MeshPhysicalMaterial({ map: chev, roughness: 0.3, clearcoat: 0.8, emissive: '#FFB300', emissiveIntensity: 0.2 });
    for (const [x, z] of PADS) {
      const pad = mesh(new THREE.BoxGeometry(1.6, 0.05, 1.2), [matte(PAL.mustard), matte(PAL.mustard), this.padMat, matte(PAL.mustard), matte(PAL.mustard), matte(PAL.mustard)], { cast: false });
      pad.position.set(x, 0.035, z);
      if (z < 0) pad.rotation.y = Math.PI; // chevrons point the racing way
      this.scene.add(pad);
    }
    // grandstand + crowd along the far side, a few trees
    const standZ = -(R + HW + VERGE + 1.7);
    for (let row = 0; row < 2; row++) {
      const b = mesh(new THREE.BoxGeometry(2 * L + 6, 0.5 + row * 0.6, 1.2), vinyl(row ? '#E4EBF7' : '#FFFFFF', { rough: 0.4, coat: 0.3 }));
      b.position.set(0, (0.5 + row * 0.6) / 2, standZ - row * 1.2);
      this.scene.add(b);
    }
    const COUNT = 2 * 28;
    this.crowdBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.22, 4, 10), new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6 }), COUNT);
    this.crowdHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6 }), COUNT);
    this.crowd = [];
    for (let i = 0; i < COUNT; i++) {
      const row = i % 2, col = Math.floor(i / 2);
      this.crowd.push({ x: -(L + 2.6) + col * ((2 * L + 5.2) / 28) + rand(-0.12, 0.12), y: 0.5 + row * 0.6, z: standZ - row * 1.2, ph: rand(0, 6), amp: rand(0.05, 0.12) });
      this.crowdBody.setColorAt(i, new THREE.Color(pick([PAL.coral, PAL.teal, PAL.mustard, PAL.lilac, PAL.pink, PAL.mint, '#FFFFFF', PAL.ink])));
      this.crowdHead.setColorAt(i, new THREE.Color(pick(['#FBE3D1', '#EFC19E', '#C68A62', '#8A5536', '#F6D5BC'])));
    }
    this.crowdBody.castShadow = this.crowdHead.castShadow = true;
    this.crowdBody.frustumCulled = this.crowdHead.frustumCulled = false;
    this.scene.add(this.crowdBody, this.crowdHead);
    for (const [x, z, s] of [[-15.5, -3, 1.2], [-15, 4.5, 1], [15.6, -2, 1.3], [15, 4, 0.9], [-12.5, -8.4, 1], [12.8, -8.6, 1.1]]) {
      const trunk = mesh(sharedGeo('trunk', () => new THREE.CylinderGeometry(0.14, 0.18, 0.9, 10)), vinyl('#B98352', { rough: 0.6 }));
      trunk.position.set(x, 0.45 * s, z); trunk.scale.setScalar(s);
      const crown = mesh(sharedGeo('crown', () => new THREE.SphereGeometry(0.8, 22, 16)), vinyl(pick(['#5CB86A', '#7ACB72', '#4FA95A']), { rough: 0.5, coat: 0.3 }));
      crown.position.set(x, 1.4 * s, z); crown.scale.setScalar(s);
      this.scene.add(trunk, crown);
    }
    this.excite = 0.2;
    this.m4 = new THREE.Matrix4();
    // the karts
    for (const p of this.players) {
      p.kart = this.makeKart(p.id);
      this.scene.add(p.kart.group);
      p.fig.turnRate = 30;
    }
  }

  makeKart(team) {
    const T = TEAM[team];
    const g = new THREE.Group();
    const paint = vinyl(T.color, { rough: 0.25, coat: 0.9 }), dark = vinyl(T.dark, { rough: 0.3, coat: 0.8 }), white = vinyl('#FFFFFF', { rough: 0.25, coat: 0.8 });
    const body = mesh(rbox(0.95, 0.28, 1.5, 0.12, 3), paint); body.position.y = 0.3;
    const nose = mesh(rbox(0.72, 0.2, 0.42, 0.08, 3), white); nose.position.set(0, 0.28, 0.72);
    const seat = mesh(rbox(0.62, 0.48, 0.14, 0.06, 2), dark); seat.position.set(0, 0.56, -0.32);
    const col = mesh(sharedGeo('kcol', () => new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8)), white);
    col.position.set(0, 0.5, 0.38); col.rotation.x = 0.7;
    const wheel = mesh(sharedGeo('kwheel', () => new THREE.TorusGeometry(0.13, 0.03, 8, 24)), vinyl(PAL.ink, { rough: 0.3 }));
    wheel.position.set(0, 0.64, 0.3); wheel.rotation.x = -0.9;
    const wing = mesh(rbox(1.05, 0.06, 0.26, 0.03, 2), dark); wing.position.set(0, 0.74, -0.72);
    g.add(body, nose, seat, col, wheel, wing);
    for (const s of [-1, 1]) { const post = mesh(rbox(0.05, 0.3, 0.08, 0.02, 2), dark); post.position.set(s * 0.32, 0.58, -0.72); g.add(post); }
    const cap = keycap(T.dirs.up, { body: '#FFFFFF', legend: T.color, size: 0.24 });
    cap.position.set(0, 0.38, 0.72);
    g.add(cap);
    const wheels = [];
    for (const [x, z] of [[-0.54, 0.5], [0.54, 0.5], [-0.54, -0.5], [0.54, -0.5]]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.2, z);
      const tyre = mesh(sharedGeo('ktyre', () => new THREE.CylinderGeometry(0.2, 0.2, 0.17, 20)), vinyl('#2B2F3F', { rough: 0.6, coat: 0.2 }));
      tyre.rotation.z = Math.PI / 2;
      const hub = mesh(sharedGeo('khub', () => new THREE.CylinderGeometry(0.09, 0.09, 0.18, 14)), white);
      hub.rotation.z = Math.PI / 2;
      const spin = new THREE.Group();
      spin.add(tyre, hub);
      pivot.add(spin);
      g.add(pivot);
      wheels.push({ pivot, spin, front: z > 0 });
    }
    g.scale.setScalar(KS);
    return { group: g, wheels };
  }

  resetRound() {
    this.winner = null;
    this.players.forEach((p, i) => {
      p.heading = Math.PI / 2;
      p.vel.set(0, 0, 0);
      p.pos.set(-1.5, 0.3 * KS, R + (i ? 0.85 : -0.85));
      p.lap = 0; p.cp = false; p.boostT = 0; p.steer = 0; p.finished = false;
      p.lastRel = this.rel(p);
      p.fig.pose = 'drive';
      p.fig.steer = 0;
      p.fig.speed = 0;
      p.fig.face(p.heading, true);
      this.placeKart(p);
    });
  }
  onCountdown() { if (!this.preview) this.ui.hudScores(`1/${LAPS}`, `1/${LAPS}`); }
  onGo() { sfx.honk(); this.excite = 1; }

  rel(p) { return (((progress(p.pos.x, p.pos.z) - START) % P) + P) % P; }

  placeKart(p) {
    const k = p.kart;
    k.group.position.set(p.pos.x, 0, p.pos.z);
    k.group.rotation.y = p.heading;
  }

  tick(dt) {
    for (const p of this.players) this.drive(p, dt);
    const [a, b] = this.players;
    this.bump(a, b, { radius: KR, e: 0.5, kick: 1.0 });
    for (const p of this.players) { this.walls(p); this.placeKart(p); this.laps(p); }
    if (this.live) this.ui.hudScores(`${Math.min(a.lap + 1, LAPS)}/${LAPS}`, `${Math.min(b.lap + 1, LAPS)}/${LAPS}`);
  }

  drive(p, dt) {
    const ctl = this.live && !p.finished;
    let gas = ctl && this.input.isHeld(p.id, 'up');
    let brake = ctl && this.input.isHeld(p.id, 'down');
    let steerIn = ctl ? (this.input.isHeld(p.id, 'left') ? 1 : 0) - (this.input.isHeld(p.id, 'right') ? 1 : 0) : 0;
    let throttle = 1;
    const st = this.input.mode === 'touch' && ctl ? this.input.stick(p.id) : null;
    if (st) {
      // touch: the stick points where you want to go (screen = top-down track); the kart turns toward it
      const mag = Math.hypot(st.x, st.z);
      if (mag > 0.05) {
        const want = Math.atan2(st.x, st.z);
        const diff = Math.atan2(Math.sin(want - p.heading), Math.cos(want - p.heading));
        const away = Math.abs(diff) > 2.2; // pointing behind you: back up while turning
        const fwd = p.vel.x * Math.sin(p.heading) + p.vel.z * Math.cos(p.heading);
        steerIn = clamp(diff * 2.2, -1, 1) * (fwd < -0.2 ? -1 : 1); // reversing flips the steering
        gas = !away; brake = away;
        throttle = clamp(mag * 1.15, 0.35, 1);
      } else { gas = false; brake = Math.hypot(p.vel.x, p.vel.z) > 0.5; }
    }
    p.steer += (steerIn - p.steer) * Math.min(1, dt * 10);
    const on = Math.abs(trackAt(p.pos.x, p.pos.z).o) <= HW;
    if (p.boostT > 0) p.boostT -= dt;
    // steer first, then split the velocity along the new heading: what was forward becomes sideways → a little drift
    let f = [Math.sin(p.heading), Math.cos(p.heading)];
    let fs = p.vel.x * f[0] + p.vel.z * f[1];
    p.heading += p.steer * 2.7 * clamp(Math.abs(fs) / 3.5, 0, 1) * Math.sign(fs || 1) * dt;
    f = [Math.sin(p.heading), Math.cos(p.heading)];
    const r = [Math.cos(p.heading), -Math.sin(p.heading)];
    fs = p.vel.x * f[0] + p.vel.z * f[1];
    let ls = p.vel.x * r[0] + p.vel.z * r[1];
    const maxF = p.boostT > 0 ? 11.5 : on ? 8.2 : 3.8;
    if (gas) fs += (fs < 0 ? 18 : 8.5 * throttle) * dt;
    else if (brake) fs = Math.max(-3.5, fs - (fs > 0.3 ? 16 : 6) * dt);
    else fs *= Math.exp(-0.9 * dt);
    if (p.boostT > 0 && ctl) fs = Math.max(fs, 10.5);
    const cap = maxF * (st && p.boostT <= 0 ? throttle : 1);
    if (fs > cap) fs = cap + (fs - cap) * Math.exp(-3 * dt);
    if (!on) fs *= Math.exp(-1.0 * dt);
    ls *= Math.exp(-(on ? 6 : 4) * dt);
    p.vel.x = f[0] * fs + r[0] * ls;
    p.vel.z = f[1] * fs + r[1] * ls;
    p.pos.x += p.vel.x * dt;
    p.pos.z += p.vel.z * dt;
    // boost pads
    if (ctl) for (const [x, z] of PADS) {
      if (Math.abs(p.pos.x - x) < 0.9 && Math.abs(p.pos.z - z) < 0.75 && p.boostT < 0.6) {
        p.boostT = 1.0;
        sfx.speed();
        this.fx.puff(p.pos.clone().setY(0.2), { n: 6, color: '#FFE08A', size: 0.2, speed: 1.5 });
      }
    }
    if (p.boostT > 0 && Math.random() < 0.6) this.fx.puff(new THREE.Vector3(p.pos.x - f[0] * 0.9, 0.25, p.pos.z - f[1] * 0.9), { n: 1, color: '#FFE08A', size: 0.14, speed: 0.3, life: 0.35 });
    else if (!on && Math.abs(fs) > 3 && Math.random() < 0.3) this.fx.puff(new THREE.Vector3(p.pos.x - f[0] * 0.8, 0.12, p.pos.z - f[1] * 0.8), { n: 1, color: '#B7E39F', size: 0.12, speed: 0.4, life: 0.4 });
    // figure + wheels
    p.fig.pose = this.state === 'over' && p.id === this.lastWinner ? 'dance' : 'drive';
    p.fig.steer = p.steer;
    if (this.state !== 'over') p.fig.face(p.heading);
    for (const w of p.kart.wheels) {
      w.spin.rotation.x += (fs * dt) / (0.2 * KS);
      if (w.front) w.pivot.rotation.y = p.steer * 0.45;
    }
    p.fs = fs;
  }

  walls(p) {
    const t = trackAt(p.pos.x, p.pos.z);
    const outer = HW + VERGE - KR, inner = -(HW + VERGE) + KR;
    let hit = 0;
    if (t.o > outer) {
      p.pos.x -= t.nx * (t.o - outer); p.pos.z -= t.nz * (t.o - outer);
      const vn = p.vel.x * t.nx + p.vel.z * t.nz;
      if (vn > 0) { p.vel.x -= t.nx * vn * 1.5; p.vel.z -= t.nz * vn * 1.5; hit = vn; }
    } else if (t.o < inner) {
      p.pos.x += t.nx * (inner - t.o); p.pos.z += t.nz * (inner - t.o);
      const vn = p.vel.x * t.nx + p.vel.z * t.nz;
      if (vn < 0) { p.vel.x -= t.nx * vn * 1.5; p.vel.z -= t.nz * vn * 1.5; hit = -vn; }
    }
    if (hit > 2.5) {
      p.vel.multiplyScalar(0.8);
      sfx.thud();
      if (hit > 5) { this.rig.shake(0.15, 0.2); this.fx.stars(p.pos.clone().setY(1), 4); }
    }
  }

  laps(p) {
    const rel = this.rel(p);
    if (rel > P * 0.4 && rel < P * 0.6) p.cp = true;
    if (p.lastRel > P * 0.75 && rel < P * 0.25 && p.cp) {
      p.cp = false;
      p.lap++;
      if (this.live && !p.finished) {
        if (p.lap >= LAPS) this.finish(p);
        else {
          sfx.lap();
          if (p.lap === LAPS - 1) this.ui.toast(`🏁 ${this.name(p.id)}: FINAL LAP!`, `team${p.id}`);
        }
      }
    }
    p.lastRel = rel;
  }

  finish(p) {
    p.finished = true;
    this.excite = 2;
    sfx.finish();
    this.fx.confetti(p.pos.clone().setY(2.5), { n: 80, spread: 1.6, colors: [TEAM[p.id].color, TEAM[p.id].light, '#FFFFFF', PAL.mustard, PAL.lilac] });
    this.endRound(p.id, `${this.name(p.id)} WINS THE RACE!`);
  }

  animate(dt) {
    const t = this.app.time;
    this.excite = Math.max(0.2, this.excite - dt * 0.5);
    this.padMat.emissiveIntensity = 0.25 + Math.max(0, Math.sin(t * 6)) * 0.5;
    this.trophy.rotation.y = t * 0.6;
    const q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    for (let i = 0; i < this.crowd.length; i++) {
      const c = this.crowd[i];
      const hop = Math.max(0, Math.sin(t * (6 + this.excite * 4) + c.ph)) * c.amp * (0.4 + this.excite);
      this.m4.compose(v.set(c.x, c.y + 0.2 + hop, c.z), q, s);
      this.crowdBody.setMatrixAt(i, this.m4);
      this.m4.compose(v.set(c.x, c.y + 0.62 + hop, c.z), q, s);
      this.crowdHead.setMatrixAt(i, this.m4);
    }
    this.crowdBody.instanceMatrix.needsUpdate = true;
    this.crowdHead.instanceMatrix.needsUpdate = true;
  }

  updateCamera(dt, instant) {
    if (this.winnerCam(instant)) return;
    const [a, b] = this.players;
    const mx = (a.pos.x + b.pos.x) * 0.04, mz = (a.pos.z + b.pos.z) * 0.03;
    this.rig.to(new THREE.Vector3(mx, 22.5, 17.6 + mz), new THREE.Vector3(mx, -1.0, 1.3 + mz), instant);
  }

  previewPose() {
    const [a, b] = this.players;
    a.heading = b.heading = Math.PI / 2 - 0.25;
    a.pos.set(L + 0.6, 0.3 * KS, R - 0.5); b.pos.set(L - 0.6, 0.3 * KS, R + 0.6);
    for (const p of this.players) {
      p.steer = 0.7; p.fig.steer = 0.7; p.fig.pose = 'drive'; p.fig.face(p.heading, true);
      for (const w of p.kart.wheels) if (w.front) w.pivot.rotation.y = 0.35;
      this.placeKart(p);
    }
    this.rig.to(new THREE.Vector3(L - 1.4, 3.3, R + 5.0), new THREE.Vector3(L + 0.4, 0.4, R), true);
  }
}
