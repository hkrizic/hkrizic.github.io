// The showroom: a sunny toy-store stage with the two collector boxes, floating key caps and confetti shapes.
// It is the backdrop for picking fighters and choosing games.
import * as THREE from 'three';
import { studio, vinyl, matte, mesh, keycap, rbox, sharedGeo, CameraRig, PAL, TEAM } from './engine.js';
import { CollectorBox, BOX } from './box.js';
import { Figure } from './figures.js';
import { FX } from './fx.js';
import { tween, ease, rand } from './util.js';
import { sfx } from './audio.js';

const BOX_X = 1.55;

export class Showroom {
  constructor(app) {
    this.app = app;
    this.noLift = true; // menus stay centred in touch mode
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 200);
    this.rig = new CameraRig(this.camera);
    this.rig.speed = 2.6;
    this.rig.menu = true; // menus keep their framing in touch mode
    const lights = studio(this.scene, app.engine, { sky: ['#FFD6C9', '#FFE9DC', '#FFF6EA'], fog: '#FFF1E4', fogNear: 18, fogFar: 46, shadow: 7, sun: [4, 10, 7], sunI: 2.0, env: 0.55 });
    lights.follow(new THREE.Vector3(0, 0, 0));
    this.fx = new FX(this.scene);
    this.mode = 'select';

    // floor + stage
    const floor = mesh(new THREE.CircleGeometry(60, 64), matte('#FFEBDD', { rough: 0.9 }), { cast: false });
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    const stage = new THREE.Group();
    const top = mesh(new THREE.CylinderGeometry(4.4, 4.5, 0.32, 72), vinyl(PAL.mustard, { rough: 0.3, coat: 0.7 }));
    top.position.y = 0.16;
    const lip = mesh(new THREE.TorusGeometry(4.4, 0.07, 12, 96), vinyl('#FFFFFF', { rough: 0.25, coat: 0.8 }));
    lip.rotation.x = -Math.PI / 2; lip.position.y = 0.32;
    const step = mesh(new THREE.CylinderGeometry(4.9, 5.0, 0.16, 72), vinyl(PAL.coral, { rough: 0.32, coat: 0.6 }));
    step.position.y = 0.08;
    stage.add(step, top, lip);
    // studio lights dotted around the stage rim
    const bulbGeo = sharedGeo('bulb', () => new THREE.SphereGeometry(0.07, 16, 12));
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const b = new THREE.Mesh(bulbGeo, vinyl('#FFF6D8', { emissive: '#FFE7A8', ei: 1.4, rough: 0.2 }));
      b.position.set(Math.cos(a) * 4.62, 0.33, Math.sin(a) * 4.62);
      stage.add(b);
    }
    this.scene.add(stage);
    this.stageY = 0.32;

    // backdrop: big rounded colour blocks, like a toy-store display wall
    const wall = new THREE.Group();
    const blocks = [[-7.5, 3.2, PAL.teal, 4.6, 6.4], [-3.2, 4.4, PAL.lilac, 4.0, 8.8], [1.3, 3.6, PAL.pink, 4.4, 7.2], [5.6, 4.8, PAL.mustard, 4.0, 9.6], [9.6, 3.0, PAL.coral, 4.0, 6]];
    for (const [x, y, c, w, h] of blocks) {
      const b = mesh(rbox(w, h, 0.6, 0.5, 4), vinyl(c, { rough: 0.45, coat: 0.3 }), { cast: false });
      b.position.set(x, y - 0.3, -6.5);
      wall.add(b);
    }
    // arches of white "neon" tubes
    for (const [x, r] of [[-3.2, 1.3], [5.6, 1.2]]) {
      const arc = mesh(new THREE.TorusGeometry(r, 0.09, 12, 48, Math.PI), vinyl('#FFFFFF', { emissive: '#FFFFFF', ei: 0.6, rough: 0.2 }), { cast: false });
      arc.position.set(x, 5.6, -6.1);
      wall.add(arc);
    }
    this.scene.add(wall);

    // floating key caps
    this.floaters = [];
    const caps = [
      ['W', 0, [-5.4, 3.6, -3.2], 0.9], ['A', 0, [-6.6, 1.9, -2.2], 0.75], ['S', 0, [-4.3, 1.2, -1.2], 0.6], ['D', 0, [-3.9, 4.6, -4.4], 0.7],
      ['↑', 1, [5.3, 3.7, -3.0], 0.9], ['←', 1, [3.9, 4.8, -4.6], 0.7], ['↓', 1, [6.5, 2.0, -2.0], 0.75], ['→', 1, [4.4, 1.25, -1.1], 0.6],
    ];
    for (const [label, team, p, s] of caps) {
      const k = keycap(label, { body: TEAM[team].color, top: '#FFFFFF', legend: TEAM[team].color, size: s });
      k.position.set(...p);
      k.rotation.set(rand(-0.6, 0.6) + 0.5, rand(-0.6, 0.6), rand(-0.4, 0.4));
      k.userData = { base: new THREE.Vector3(...p), rot: k.rotation.clone(), ph: rand(0, 6) };
      this.scene.add(k);
      this.floaters.push(k);
    }
    // confetti shapes: rings, balls, stars
    const shapes = [
      [new THREE.TorusGeometry(0.32, 0.12, 16, 40), PAL.lilac, [-2.6, 4.2, -2.8]], [new THREE.SphereGeometry(0.26, 24, 16), PAL.coral, [2.8, 4.6, -2.6]],
      [new THREE.TorusGeometry(0.26, 0.1, 16, 40), PAL.mustard, [3.0, 2.6, -4.6]], [new THREE.SphereGeometry(0.2, 24, 16), PAL.teal, [-2.8, 2.4, -4.5]],
      [new THREE.CapsuleGeometry(0.1, 0.4, 6, 12), PAL.pink, [-7.6, 4.4, -3.4]], [new THREE.CapsuleGeometry(0.1, 0.4, 6, 12), PAL.mint, [7.4, 4.9, -3.5]],
    ];
    for (const [geo, c, p] of shapes) {
      const m = mesh(geo, vinyl(c, { rough: 0.3, coat: 0.7 }), { cast: false });
      m.position.set(...p);
      m.userData = { base: new THREE.Vector3(...p), rot: new THREE.Euler(rand(0, 3), rand(0, 3), 0), ph: rand(0, 6), spin: true };
      this.scene.add(m);
      this.floaters.push(m);
    }

    // the two boxes and their figures
    this.boxes = [0, 1].map(t => {
      const b = new CollectorBox(t);
      b.group.position.set(t ? BOX_X : -BOX_X, this.stageY, 0);
      b.group.rotation.y = t ? -0.2 : 0.2;
      this.scene.add(b.group);
      return b;
    });
    this.figs = [null, null];
    this.ready = [false, false];
    this.out = [false, false];
    this.setCamera(true);
  }

  setFigure(team, look, animate = true) {
    const box = this.boxes[team];
    box.setLook(look);
    const old = this.figs[team];
    const fig = new Figure(look);
    fig.root.scale.setScalar(1.12);
    if (old) {
      // the old figure spins away, the new one pops in
      tween(0.2, k => { old.root.scale.setScalar(1.12 * (1 - k)); old.root.rotation.y += 0.4; }, { ease: ease.inCubic }).then(() => old.root.removeFromParent());
    }
    this.place(team, fig, this.out[team]);
    if (animate) {
      fig.root.scale.setScalar(0.01);
      tween(0.45, k => fig.root.scale.setScalar(Math.max(0.01, 1.12 * k)), { ease: ease.outBack, delay: old ? 0.12 : 0 });
      box.bounce();
      sfx.pop();
    }
    this.figs[team] = fig;
    return fig;
  }
  place(team, fig, out) {
    const box = this.boxes[team];
    if (out) {
      this.scene.add(fig.root);
      fig.root.position.copy(box.frontSpot());
      fig.root.position.y = this.stageY;
      fig.face(team ? -0.25 : 0.25, true);
    } else {
      box.slot.add(fig.root);
      fig.root.position.set(0, 0, 0);
      fig.face(0, true);
    }
  }

  setReady(team, ready) {
    if (this.ready[team] === ready) return;
    this.ready[team] = ready;
    const box = this.boxes[team], fig = this.figs[team];
    box.setOpen(ready);
    if (ready) {
      sfx.door();
      // hop out of the box onto the stage
      const from = new THREE.Vector3(); fig.root.getWorldPosition(from);
      this.scene.attach(fig.root);
      this.out[team] = true;
      const to = box.frontSpot(); to.y = this.stageY;
      fig.pose = 'air';
      tween(0.55, k => {
        fig.root.position.lerpVectors(from, to, k);
        fig.root.position.y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * 0.7;
      }, { ease: ease.linear, delay: 0.15 }).then(() => {
        fig.land(1); sfx.land();
        this.fx.puff(to.clone().setY(this.stageY + 0.05), { n: 7, color: '#FFFFFF', size: 0.16 });
        this.fx.confetti(to.clone().setY(this.stageY + 1.2), { n: 30, spread: 0.4, up: 5 });
        fig.pose = 'wave';
        fig.face(team ? -0.25 : 0.25);
      });
    } else {
      this.out[team] = false;
      fig.pose = 'auto';
      this.place(team, fig, false);
      box.bounce();
    }
  }

  setMode(mode) {
    this.mode = mode;
    this.setCamera(false);
    for (const t of [0, 1]) {
      const f = this.figs[t];
      if (!f) continue;
      if (mode === 'menu') f.pose = 'auto';
    }
  }
  setCamera(instant) {
    if (this.mode === 'menu') this.rig.to(new THREE.Vector3(0, 2.7, 12.4), new THREE.Vector3(0, -0.8, 0), instant);
    else this.rig.to(new THREE.Vector3(0, 1.7, 7.5), new THREE.Vector3(0, 1.1, 0), instant);
  }
  // small cheer from both figures (menu selection feedback)
  cheer(team = null) {
    for (const t of [0, 1]) {
      if (team != null && t !== team) continue;
      const f = this.figs[t];
      if (!f || !this.out[t]) continue;
      f.pose = 'cheer';
      clearTimeout(f._cheer);
      f._cheer = setTimeout(() => { if (f.pose === 'cheer') f.pose = 'auto'; }, 700);
    }
  }

  update(dt) {
    const t = (this.t = (this.t ?? 0) + dt);
    for (const f of this.floaters) {
      const u = f.userData;
      f.position.set(u.base.x + Math.sin(t * 0.5 + u.ph) * 0.12, u.base.y + Math.sin(t * 0.9 + u.ph) * 0.18, u.base.z);
      f.rotation.set(u.rot.x + Math.sin(t * 0.6 + u.ph) * 0.15, u.rot.y + (u.spin ? t * 0.4 : Math.sin(t * 0.4 + u.ph) * 0.3), u.rot.z);
    }
    for (const fig of this.figs) fig?.update(dt);
    // gentle parallax from the mouse
    this.par ??= { x: 0, y: 0 };
    this.par.x += (this.app.mouse.x - this.par.x) * Math.min(1, dt * 3);
    this.par.y += (this.app.mouse.y - this.par.y) * Math.min(1, dt * 3);
    this.rig.update(dt);
    this.camera.position.x += this.par.x * 0.3;
    this.camera.position.y -= this.par.y * 0.15;
    this.camera.lookAt(this.rig.look);
    this.fx.update(dt);
  }
}
export { BOX };
