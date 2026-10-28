// The end of a game night: the champion on the top step with a crown and a golden trophy, the runner-up being a
// good sport on the second step, confetti cannons and fireworks over a dusk sky. A tie puts both on top.
import * as THREE from 'three';
import { studio, vinyl, mesh, rbox, sharedGeo, canvasTexture, CameraRig, PAL, TEAM, FONT, disposeTree } from './engine.js';
import { Figure } from './figures.js';
import { FX, CONFETTI } from './fx.js';
import { sfx } from './audio.js';
import { rand, pick, clamp, ease } from './util.js';

const FIRE = ['#FFC145', '#FF6F59', '#2EC4B6', '#A594F9', '#FF8FB1', '#7ED6A5', '#FFFFFF'];
const S = 1.3; // figure scale on the podium

function trophy() {
  const g = new THREE.Group();
  const gold = vinyl('#F4C04A', { rough: 0.2, coat: 0.8, metal: 0.75 });
  const cup = mesh(new THREE.LatheGeometry([[0.04, 0], [0.12, 0.03], [0.2, 0.1], [0.27, 0.24], [0.3, 0.42], [0.31, 0.5], [0.28, 0.5], [0.26, 0.4], [0.2, 0.2], [0.04, 0.08]].map(([x, y]) => new THREE.Vector2(x, y)), 40), gold);
  cup.position.y = 0.34;
  const stem = mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.22, 20), gold);
  stem.position.y = 0.24;
  const knob = mesh(new THREE.SphereGeometry(0.08, 20, 14), gold);
  knob.position.y = 0.2;
  const base = mesh(rbox(0.36, 0.13, 0.36, 0.04, 3), vinyl(PAL.ink, { rough: 0.3, coat: 0.6 }));
  base.position.y = 0.065;
  g.add(cup, stem, knob, base);
  for (const s of [-1, 1]) {
    const h = mesh(new THREE.TorusGeometry(0.11, 0.028, 10, 24, Math.PI * 1.1), gold);
    h.position.set(s * 0.3, 0.68, 0);
    h.rotation.z = s > 0 ? -Math.PI / 2 - 0.2 : Math.PI / 2 + 0.2;
    g.add(h);
  }
  // a star on the front
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.035 : 0.085; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const st = mesh(new THREE.ExtrudeGeometry(star, { depth: 0.02, bevelEnabled: false }), vinyl('#FFFFFF', { rough: 0.2, coat: 0.8, emissive: '#FFF6D8', ei: 0.3 }));
  st.position.set(0, 0.72, 0.26);
  st.rotation.x = -0.15;
  g.add(st);
  return g;
}

export class Ceremony {
  constructor(app, { winner, looks }) {
    this.app = app;
    this.winner = winner;
    this.noLift = true;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, app.engine.aspect, 0.1, 300);
    this.rig = new CameraRig(this.camera);
    this.rig.speed = 2.2;
    this.rig.menu = true;
    const lights = studio(this.scene, app.engine, { sky: ['#2A2556', '#6A4C9E', '#FF9FB6'], fog: '#9A6AA8', fogNear: 26, fogFar: 80, shadow: 6, sun: [3, 10, 8], sunI: 1.5, hemiI: 0.75, env: 0.55 });
    lights.follow(new THREE.Vector3());
    this.fx = new FX(this.scene);
    this.t = 0;
    this.nextRocket = 1.2;
    this.rockets = [];
    const tie = winner == null;

    // stage
    const floor = mesh(new THREE.CircleGeometry(60, 64), vinyl('#4B3C80', { rough: 0.9, coat: 0 }), { cast: false });
    floor.rotation.x = -Math.PI / 2;
    const stage = mesh(new THREE.CylinderGeometry(4.2, 4.3, 0.3, 72), vinyl('#A594F9', { rough: 0.35, coat: 0.6 }));
    stage.position.y = 0.15;
    const lip = mesh(new THREE.TorusGeometry(4.2, 0.07, 12, 96), vinyl('#FFFFFF', { rough: 0.25, coat: 0.8 }));
    lip.rotation.x = -Math.PI / 2; lip.position.y = 0.3;
    this.scene.add(floor, stage, lip);
    this.bulbs = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const b = new THREE.Mesh(sharedGeo('bulb', () => new THREE.SphereGeometry(0.07, 16, 12)), vinyl(i % 2 ? '#FFF6D8' : '#FFD27A', { emissive: i % 2 ? '#FFE7A8' : '#FFB547', ei: 1.6, rough: 0.2 }));
      b.position.set(Math.cos(a) * 4.42, 0.31, Math.sin(a) * 4.42);
      this.scene.add(b);
    }
    // an arch of lights with a banner behind the podium
    const arch = mesh(new THREE.TorusGeometry(3.3, 0.16, 16, 64, Math.PI), vinyl('#FFFFFF', { rough: 0.3, coat: 0.7 }));
    arch.position.set(0, 0.3, -1.6);
    this.scene.add(arch);
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI;
      const b = new THREE.Mesh(sharedGeo('bulb', () => new THREE.SphereGeometry(0.07, 16, 12)), vinyl(pick(FIRE), { emissive: '#FFFFFF', ei: 0.7, rough: 0.2 }));
      b.position.set(Math.cos(a) * 3.3, 0.3 + Math.sin(a) * 3.3, -1.42);
      b.scale.setScalar(1.6);
      this.scene.add(b);
    }
    // twinkling stars far away
    const N = 70;
    this.sky = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: '#FFF6E0' }), N);
    this.sky.frustumCulled = false;
    this.skyStars = Array.from({ length: N }, () => ({ p: new THREE.Vector3(rand(-40, 40), rand(9, 24), rand(-45, -25)), ph: rand(0, 6), s: rand(0.6, 1.4) }));
    this.scene.add(this.sky);
    this.m4 = new THREE.Matrix4();

    // the podium: P1 always on the left, P2 on the right; the champion's step is the tall gold one
    this.figs = [];
    for (const t of [0, 1]) {
      const top = tie || t === winner;
      const h = tie ? 1.0 : top ? 1.3 : 0.7;
      const x = t ? 1.0 : -1.0;
      const block = mesh(rbox(1.6, h, 1.5, 0.12, 4), vinyl(top ? '#FFC145' : '#D9DEE8', { rough: 0.3, coat: 0.7, metal: top ? 0.15 : 0.1 }));
      block.position.set(x, 0.3 + h / 2, 0);
      const band = mesh(rbox(1.66, 0.14, 1.56, 0.06, 3), vinyl(TEAM[t].color, { rough: 0.3, coat: 0.7 }));
      band.position.set(x, 0.3 + h - 0.05, 0);
      const num = canvasTexture(256, 256, (g, w) => {
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(w / 2, w / 2, 112, 0, 7); g.fill();
        g.fillStyle = top ? '#D99A12' : '#7C8496'; g.font = `800 170px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(top ? '1' : '2', w / 2, w / 2 + 10);
      });
      const label = new THREE.Mesh(new THREE.CircleGeometry(0.3, 40), new THREE.MeshStandardMaterial({ map: num, roughness: 0.4, transparent: true, alphaTest: 0.5 }));
      label.position.set(x, 0.3 + h / 2 - 0.04, 0.76);
      this.scene.add(block, band, label);
      const fig = new Figure(looks[t]);
      fig.root.scale.setScalar(S);
      fig.root.position.set(x, 0.3 + h, 0.05);
      fig.face(0, true);
      if (top) fig.addCrown();
      this.scene.add(fig.root);
      this.figs.push({ t, fig, top, h, x });
    }
    // the trophy: overhead in the champion's hands, or on a pedestal between two champions
    this.cup = trophy();
    if (tie) {
      const ped = mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.9, 32), vinyl('#FFFFFF', { rough: 0.3, coat: 0.7 }));
      ped.position.set(0, 0.75, 0.6);
      this.cup.position.set(0, 1.2, 0.6);
      this.cup.scale.setScalar(1.3);
      this.scene.add(ped, this.cup);
    } else {
      const champ = this.figs[winner].fig;
      champ.armsUp = true;
      this.cup.position.set(0, 1.04, 0.02);
      this.cup.scale.setScalar(0.85);
      champ.model.add(this.cup);
    }
    // a warm spotlight on the top step
    const spot = new THREE.SpotLight('#FFE6B8', 40, 20, 0.42, 0.6, 1.2);
    const focus = tie ? new THREE.Vector3(0, 1.3, 0) : new THREE.Vector3(this.figs[winner].x, 1.6, 0);
    spot.position.set(focus.x * 0.6, 8, 4);
    spot.target.position.copy(focus);
    this.scene.add(spot, spot.target);
    this.flash = new THREE.PointLight('#FFFFFF', 0, 30, 1.2);
    this.scene.add(this.flash);
    // sweeping light beams
    this.beams = [-1, 1].map(s => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4, 9, 32, 1, true), new THREE.MeshBasicMaterial({ color: s < 0 ? '#FF8FB1' : '#7FE3D6', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      cone.geometry.translate(0, -4.5, 0);
      const pivot = new THREE.Group();
      pivot.position.set(s * 5, 8.5, -3);
      pivot.add(cone);
      pivot.userData.s = s;
      this.scene.add(pivot);
      return pivot;
    });
    this.cam0 = true;
    sfx.fanfare();
    setTimeout(() => sfx.cheer(), 700);
  }

  launch() {
    const r = {
      p: new THREE.Vector3(rand(-7, 7), 0.5, rand(-10, -5)),
      v: new THREE.Vector3(rand(-0.6, 0.6), rand(9.5, 12), rand(-0.3, 0.3)),
      fuse: rand(0.75, 1.05), color: pick(FIRE),
    };
    r.mesh = new THREE.Mesh(sharedGeo('rocket', () => new THREE.SphereGeometry(0.09, 10, 8)), vinyl('#FFE7B0', { emissive: '#FFD27A', ei: 2 }));
    r.mesh.position.copy(r.p);
    this.scene.add(r.mesh);
    this.rockets.push(r);
    sfx.rocket();
  }
  explode(r) {
    this.scene.remove(r.mesh);
    const glow = c => vinyl(c, { emissive: c, ei: 1.8, rough: 0.3 });
    const geo = Math.random() < 0.5 ? 'star' : 'sphere';
    for (const [n, sp, c] of [[34, 5.5, r.color], [16, 2.6, pick(FIRE)]]) {
      for (let i = 0; i < n; i++) {
        // points on a sphere so the burst is round
        const u = rand(-1, 1), a = rand(0, Math.PI * 2), k = Math.sqrt(1 - u * u);
        const v = new THREE.Vector3(Math.cos(a) * k, u, Math.sin(a) * k).multiplyScalar(sp * rand(0.85, 1.1));
        this.fx.spawn(geo, glow(c), r.p, v, { size: geo === 'star' ? 0.08 : 0.06, life: rand(1.1, 1.6), gravity: -2.2, drag: 1.4, spin: 6 });
      }
    }
    this.fx.blob(r.p, r.color, { size: 2.4, life: 0.35, emissive: true });
    this.flash.position.copy(r.p);
    this.flash.color.set(r.color);
    this.flash.intensity = 60;
    sfx.bang();
  }

  update(dt) {
    const t = (this.t += dt);
    // confetti cannons from both sides of the podium, then a gentle rain
    if (t > 0.35 && !this.cannons) {
      this.cannons = true;
      for (const s of [-1, 1]) this.fx.confetti(new THREE.Vector3(s * 2.6, 0.6, 0.8), { n: 80, spread: 0.3, up: 11 });
    }
    if (t > 3 && (this.rain = (this.rain ?? 0) - dt) <= 0) {
      this.rain = 2.2;
      this.fx.confetti(new THREE.Vector3(0, 7.5, 0), { n: 34, spread: 4, up: 0.5, colors: CONFETTI });
    }
    // fireworks
    this.nextRocket -= dt;
    if (this.nextRocket <= 0) { this.launch(); this.nextRocket = rand(0.45, 1.1); }
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.fuse -= dt;
      r.v.y -= 6 * dt;
      r.p.addScaledVector(r.v, dt);
      r.mesh.position.copy(r.p);
      if (Math.random() < 0.6) this.fx.spawn('sphere', vinyl('#FFE7B0', { emissive: '#FFB547', ei: 1.2 }), r.p, new THREE.Vector3(rand(-0.3, 0.3), -0.5, 0), { size: 0.04, life: 0.4, gravity: -1, drag: 1 });
      if (r.fuse <= 0) { this.explode(r); this.rockets.splice(i, 1); }
    }
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 150);
    // the figures: the champion jumps for joy, then dances with the trophy; the runner-up claps along
    for (const f of this.figs) {
      const { fig } = f;
      if (f.top) fig.pose = t < 1.4 || (t % 7 > 5.6) ? 'celebrate' : 'dance';
      else if (t < 1.8) { fig.pose = 'sad'; }
      else { fig.pose = t % 6 < 3 ? 'cheer' : 'wave'; fig.face(t % 6 < 3 ? 0 : (f.t ? -0.7 : 0.7)); }
      fig.update(dt);
    }
    if (this.winner == null) this.cup.rotation.y = t * 0.8;
    // stars twinkle, beams sweep
    const q = new THREE.Quaternion(), sc = new THREE.Vector3();
    this.skyStars.forEach((s, i) => {
      const k = s.s * (0.6 + 0.4 * Math.sin(t * 2.5 + s.ph));
      this.m4.compose(s.p, q, sc.set(k, k, k));
      this.sky.setMatrixAt(i, this.m4);
    });
    this.sky.instanceMatrix.needsUpdate = true;
    for (const b of this.beams) { b.rotation.z = b.userData.s * (0.35 + Math.sin(t * 0.7 + b.userData.s) * 0.3); b.rotation.x = Math.sin(t * 0.5) * 0.2; }
    // camera: swoops in from far away, then drifts slowly around the podium
    // (framed low, so the title and score sit in the sky above the podium)
    const k = ease.inOutCubic(clamp(t / 3.4, 0, 1));
    const a = Math.sin(t * 0.22) * 0.3 * k;
    const dist = 15 - k * 4.8, y = 5.2 - k * 1.6;
    this.rig.to(new THREE.Vector3(Math.sin(a) * dist, y + Math.sin(t * 0.4) * 0.12, Math.cos(a) * dist), new THREE.Vector3(0, 3.0, 0), this.cam0);
    this.cam0 = false;
    this.rig.update(dt);
    this.fx.update(dt);
  }

  dispose() {
    this.fx.clear();
    for (const r of this.rockets) this.scene.remove(r.mesh);
    disposeTree(this.scene);
  }
}
