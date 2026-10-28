// TRAIL BLAZERS — a light-cycle duel on hover-scooters. Every cell you ride over becomes a ribbon wall behind you;
// steer so your rival crashes first.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BaseGame } from './base.js';
import { studio, vinyl, mesh, rbox, sharedGeo, cloud, canvasTexture, TEAM, PAL } from '../engine.js';
import { sfx } from '../audio.js';
import { rand } from '../util.js';

const COLS = 26, ROWS = 16, C = 0.6, BLOCK_H = 0.34, HOVER = 0.2;
const X0 = -((COLS - 1) / 2) * C, Z0 = -((ROWS - 1) / 2) * C;
const W = COLS * C, D = ROWS * C;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const START = [{ c: 3, r: 4, d: [1, 0] }, { c: COLS - 4, r: ROWS - 5, d: [-1, 0] }];
const V0 = 6.5, VMAX = 12, ACCEL = 0.2, BOOST = 1.7; // cells per second
const STANCE = { lean: 0.16, ll: -0.28, rl: 0.22, la: -0.75, ra: -0.75, laZ: -0.35, raZ: 0.35, y: -0.02 };

export class TrailBlazers extends BaseGame {
  static meta = {
    touch: { stick: 'Flick to turn', stickPresses: true, button: ['BOOST', 'dash', 'Short speed boost'] },
    id: 'trails', title: 'Trail Blazers', icon: '🌈', color: '#8FD3FF', ink: '#0F3556', rounds: 3, figScale: 1.15,
    tagline: 'Ride, turn, trap. Every cell you cross becomes a wall.',
    goal: 'Your hover-scooter never stops and leaves a ribbon wall behind it. Box your rival in — whoever crashes into a wall or a ribbon first loses the round.',
    controls: [['move', 'Steer'], ['tap2', 'Double-tap = boost']],
  };

  build() {
    this.lights = studio(this.scene, this.app.engine, { sky: ['#BDB4FF', '#E2DCFF', '#FFF0F6'], fog: '#F1ECFF', fogNear: 30, fogFar: 80, shadow: 11, sun: [-4, 15, 8] });
    const ground = mesh(new THREE.CircleGeometry(70, 64), vinyl('#ECE6FF', { rough: 0.9, coat: 0 }), { cast: false });
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.62;
    this.scene.add(ground);
    // the board: a lilac slab with a cream grid floor on top
    const slab = mesh(rbox(W + 1.2, 0.6, D + 1.2, 0.25, 4), vinyl(PAL.lilac, { rough: 0.35, coat: 0.6 }));
    slab.position.y = -0.31;
    this.scene.add(slab);
    const grid = canvasTexture(COLS * 40, ROWS * 40, (g, w, h) => {
      g.fillStyle = '#FFF8EC'; g.fillRect(0, 0, w, h);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if ((r + c) % 2) { g.fillStyle = '#FBF0DF'; g.fillRect(c * 40, r * 40, 40, 40); }
      }
      g.strokeStyle = '#EBDDC6'; g.lineWidth = 2;
      for (let c = 0; c <= COLS; c++) { g.beginPath(); g.moveTo(c * 40, 0); g.lineTo(c * 40, h); g.stroke(); }
      for (let r = 0; r <= ROWS; r++) { g.beginPath(); g.moveTo(0, r * 40); g.lineTo(w, r * 40); g.stroke(); }
    });
    const floor = mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: grid, roughness: 0.55 }), { cast: false });
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.002;
    this.scene.add(floor);
    // low rails + corner posts
    const rail = vinyl('#FFFFFF', { rough: 0.25, coat: 0.8 });
    for (const [w, d, x, z] of [[W + 0.7, 0.34, 0, -(D / 2 + 0.17)], [W + 0.7, 0.34, 0, D / 2 + 0.17], [0.34, D + 0.7, -(W / 2 + 0.17), 0], [0.34, D + 0.7, W / 2 + 0.17, 0]]) {
      const r = mesh(rbox(w, 0.4, d, 0.15, 3), rail);
      r.position.set(x, 0.12, z);
      this.scene.add(r);
    }
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const post = mesh(sharedGeo('post', () => new THREE.SphereGeometry(0.42, 28, 18)), vinyl(PAL.mustard, { rough: 0.25, coat: 0.8 }));
      post.position.set(x * (W / 2 + 0.17), 0.32, z * (D / 2 + 0.17));
      this.scene.add(post);
    }
    // a rainbow arching over the back of the arena, with a cloud at each foot
    const bands = ['#FF8FB1', '#FFC145', '#7ED6A5', '#8FD3FF', '#A594F9'];
    bands.forEach((c, i) => {
      const arc = mesh(new THREE.TorusGeometry(10.5 - i * 0.62, 0.32, 14, 80, Math.PI), vinyl(c, { rough: 0.3, coat: 0.6 }), { cast: false });
      arc.position.set(0, -0.6, -D / 2 - 2.4);
      this.scene.add(arc);
    });
    for (const x of [-10.2, 10.2]) {
      const cl = cloud(1.9);
      cl.position.set(x, 0.2, -D / 2 - 2.1);
      this.scene.add(cl);
    }
    for (let i = 0; i < 6; i++) {
      const cl = cloud(rand(1, 1.8));
      cl.position.set(rand(-22, 22), rand(4, 9), rand(-26, -14));
      this.scene.add(cl);
    }

    // one instanced ribbon per team
    this.grid = new Int8Array(COLS * ROWS);
    this.m4 = new THREE.Matrix4();
    this.trails = [0, 1].map(id => {
      const mat = new THREE.MeshPhysicalMaterial({ color: TEAM[id].color, roughness: 0.26, clearcoat: 0.9, clearcoatRoughness: 0.12, emissive: TEAM[id].color, emissiveIntensity: 0.1 });
      const im = new THREE.InstancedMesh(new RoundedBoxGeometry(C * 0.94, BLOCK_H, C * 0.94, 2, 0.08), mat, COLS * ROWS);
      im.count = 0;
      im.frustumCulled = false;
      im.castShadow = im.receiveShadow = true;
      this.scene.add(im);
      return im;
    });
    this.pops = [];

    // hover-scooters
    for (const p of this.players) {
      const T = TEAM[p.id];
      const board = new THREE.Group();
      board.rotation.order = 'YXZ';
      const deck = mesh(rbox(0.5, 0.09, 0.86, 0.045, 3), vinyl('#FFFFFF', { rough: 0.2, coat: 0.9 }));
      const stripe = mesh(rbox(0.2, 0.03, 0.88, 0.015, 2), vinyl(T.color, { rough: 0.25, coat: 0.9 }));
      stripe.position.y = 0.05;
      board.add(deck, stripe);
      const podMat = vinyl('#FFF6D8', { emissive: T.light, ei: 1.6, rough: 0.2 });
      for (const z of [-0.28, 0.28]) {
        const pod = mesh(sharedGeo('pod', () => new THREE.SphereGeometry(0.09, 16, 12)), podMat, { cast: false });
        pod.position.set(0, -0.07, z);
        pod.scale.set(1.4, 0.6, 1.4);
        board.add(pod);
      }
      const glow = new THREE.Mesh(sharedGeo('glowDisc', () => new THREE.CircleGeometry(0.5, 32)), new THREE.MeshBasicMaterial({ color: T.color, transparent: true, opacity: 0.28, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = -0.09; // just above the floor once the board hovers (scaled 1.12)
      board.add(glow);
      board.userData.glow = glow;
      board.scale.setScalar(1.12);
      this.scene.add(board);
      p.board = board;
      p.fig.ring.visible = false; // the board carries the team colour
    }
  }

  cellPos(c, r, out = new THREE.Vector3()) { return out.set(X0 + c * C, 0, Z0 + r * C); }

  resetRound() {
    this.grid.fill(-1);
    for (const im of this.trails) im.count = 0;
    this.pops = [];
    this.players.forEach((p, i) => {
      const s = START[i];
      Object.assign(p, { c: s.c, r: s.r, d: s.d, t: 0, q: [], speed: V0, crashed: false, out: false, boost: 0, boostCd: 0, vy: 0, bank: 0 });
      p.fly = new THREE.Vector3();
      this.grid[s.r * COLS + s.c] = i;
      p.fig.tumble.rotation.set(0, 0, 0);
      p.fig.pose = 'auto';
      p.fig.speed = 0;
      p.fig.custom = STANCE;
      p.fig.face(Math.atan2(s.d[0], s.d[1]), true);
      p.board.rotation.set(0, p.fig.facing, 0);
      this.placeRider(p, 0);
    });
  }

  placeRider(p, t) {
    if (p.crashed) return;
    p.pos.set(X0 + (p.c + p.d[0] * p.t) * C, HOVER + Math.sin(t * 5 + p.id * 2) * 0.03, Z0 + (p.r + p.d[1] * p.t) * C);
    p.board.position.set(p.pos.x, p.pos.y - 0.06, p.pos.z);
  }

  addBlock(id, c, r, instant = false) {
    const im = this.trails[id];
    const i = im.count++;
    const v = this.cellPos(c, r);
    this.m4.makeScale(1, instant ? 1 : 0.01, 1);
    this.m4.setPosition(v.x, BLOCK_H / 2 + 0.005, v.z);
    im.setMatrixAt(i, this.m4);
    im.instanceMatrix.needsUpdate = true;
    if (!instant) this.pops.push({ im, i, x: v.x, z: v.z, age: 0 });
  }

  onPress(p, action) {
    if (p.crashed) return;
    const d = DIRS[action];
    // a turn right after passing a cell centre happens at once (snappier); otherwise it waits for the next centre
    if (p.t < 0.14 && !p.q.length && this.validTurn(p, d)) { this.turn(p, d); p.t = 0; return; }
    p.q.push(d);
    if (p.q.length > 2) p.q.shift();
  }
  validTurn(p, d) { return !(d[0] === p.d[0] && d[1] === p.d[1]) && !(d[0] === -p.d[0] && d[1] === -p.d[1]); }
  turn(p, d) {
    const cross = p.d[0] * d[1] - p.d[1] * d[0];
    p.d = d;
    p.bank = -cross * 0.4;
    p.fig.face(Math.atan2(d[0], d[1]));
    sfx.click();
  }

  tick(dt) {
    if (this.live) {
      for (const p of this.players) {
        p.speed = Math.min(VMAX, p.speed + ACCEL * dt);
        p.boostCd = Math.max(0, p.boostCd - dt);
        p.boost = Math.max(0, p.boost - dt);
        if (this.input.takeDash(p.id) && p.boostCd <= 0 && !p.crashed) {
          p.boost = 0.7; p.boostCd = 3;
          sfx.dash();
          this.fx.puff(p.pos.clone().setY(0.15), { n: 6, color: TEAM[p.id].light, size: 0.2, speed: 1.5 });
        }
      }
      // sub-steps: never more than ~0.4 of a cell per step, so nobody tunnels through a ribbon
      const n = Math.max(1, Math.ceil((VMAX * BOOST * dt) / 0.4));
      const sdt = dt / n;
      for (let s = 0; s < n && this.live; s++) this.advance(sdt);
    }
    // crashed riders fly off their boards
    for (const p of this.players) {
      if (!p.crashed) continue;
      if (p.pos.y > 0 || p.vy > 0) {
        p.vy -= 20 * dt;
        p.pos.y = Math.max(0, p.pos.y + p.vy * dt);
        p.pos.x += p.fly.x * dt; p.pos.z += p.fly.z * dt;
        p.fig.tumble.rotation.x += dt * 9;
        p.board.rotation.z += dt * 12;
        p.board.position.y = Math.max(0.06, p.board.position.y + (p.vy * 0.5 - 2) * dt);
        if (p.pos.y <= 0) {
          p.vy = 0;
          p.fig.tumble.rotation.set(0, 0, 0);
          p.fig.pose = 'dizzy';
          p.fig.land(1);
          sfx.thud();
          this.fx.puff(p.pos.clone().setY(0.1), { n: 6, size: 0.18 });
        }
      }
    }
    for (const p of this.players) {
      if (p.crashed) continue;
      // riding stance only while riding; round-end poses (celebrate/sad) need their joints back
      p.fig.custom = this.state === 'play' || this.state === 'countdown' ? STANCE : null;
    }
  }

  advance(sdt) {
    const arrivals = [];
    for (const p of this.players) {
      if (p.crashed) continue;
      p.t += p.speed * (p.boost > 0 ? BOOST : 1) * sdt;
      if (p.t >= 1) arrivals.push(p);
    }
    if (!arrivals.length) return;
    const target = p => [p.c + p.d[0], p.r + p.d[1]];
    const crashed = arrivals.filter(p => {
      const [c, r] = target(p);
      return c < 0 || r < 0 || c >= COLS || r >= ROWS || this.grid[r * COLS + c] >= 0;
    });
    if (arrivals.length === 2) {
      const [a, b] = arrivals.map(target);
      if (a[0] === b[0] && a[1] === b[1]) { for (const p of arrivals) if (!crashed.includes(p)) crashed.push(p); }
    }
    for (const p of arrivals) {
      if (crashed.includes(p)) continue;
      this.addBlock(p.id, p.c, p.r);
      [p.c, p.r] = target(p);
      this.grid[p.r * COLS + p.c] = p.id;
      p.t -= 1;
      while (p.q.length) {
        const d = p.q.shift();
        if (this.validTurn(p, d)) { this.turn(p, d); break; }
      }
    }
    if (!crashed.length) return;
    for (const p of crashed) this.crash(p);
    if (crashed.length === 2) this.endRound(null, 'DOUBLE CRASH!');
    else this.endRound(1 - crashed[0].id, `${this.name(1 - crashed[0].id)} SCORES!`);
  }

  crash(p) {
    p.crashed = true;
    p.out = true;
    p.t = Math.min(p.t, 0.55); // stop at the wall's face
    this.placeRiderNow(p);
    p.vy = 6.5;
    p.fly.set(-p.d[0] * 2.4, 0, -p.d[1] * 2.4);
    p.fig.custom = null;
    p.fig.pose = 'blasted';
    const at = p.pos.clone().setY(0.5);
    sfx.crack();
    sfx.bonk();
    this.rig.shake(0.4, 0.35);
    this.fx.burst(at, TEAM[p.id].color, { n: 16, speed: 4.5, up: 4, size: 0.1, geo: 'box' });
    this.fx.puff(at, { n: 10, size: 0.3, speed: 2.5 });
    this.fx.stars(at, 6);
    this.fx.shockwave(at.clone().setY(0.05), '#FFFFFF', { size: 2.4 });
  }
  placeRiderNow(p) {
    p.pos.set(X0 + (p.c + p.d[0] * p.t) * C, p.pos.y, Z0 + (p.r + p.d[1] * p.t) * C);
  }

  animate(dt) {
    const t = this.app.time;
    for (const p of this.players) {
      this.placeRider(p, t);
      p.bank *= Math.exp(-6 * dt);
      if (!p.crashed) {
        p.board.rotation.y = p.fig.facing;
        p.board.rotation.z = p.bank;
        p.board.rotation.x = -0.05;
      }
      p.board.userData.glow.material.opacity = p.crashed ? 0 : 0.22 + (p.boost > 0 ? 0.25 : 0) + Math.sin(t * 8 + p.id) * 0.04;
      if (p.boost > 0 && !p.crashed && Math.random() < 0.5) this.fx.puff(p.pos.clone().setY(0.12), { n: 1, color: TEAM[p.id].light, size: 0.12, speed: 0.3, life: 0.35 });
    }
    // new ribbon blocks pop up with a little overshoot
    for (let k = this.pops.length - 1; k >= 0; k--) {
      const b = this.pops[k];
      b.age += dt;
      const u = Math.min(1, b.age / 0.28);
      const s = u < 1 ? 1 + Math.sin(u * Math.PI) * 0.25 - (1 - u) * 0.9 : 1;
      this.m4.makeScale(1, Math.max(0.01, s), 1);
      this.m4.setPosition(b.x, (BLOCK_H * Math.max(0.01, s)) / 2 + 0.005, b.z);
      b.im.setMatrixAt(b.i, this.m4);
      b.im.instanceMatrix.needsUpdate = true;
      if (u >= 1) this.pops.splice(k, 1);
    }
  }

  updateCamera(dt, instant) {
    if (this.winnerCam(instant)) return;
    this.rig.to(new THREE.Vector3(0, 13.4, 11.2), new THREE.Vector3(0, -0.5, 1.0), instant);
  }

  previewPose() {
    const draw = (id, cells) => { for (const [c, r] of cells) { this.grid[r * COLS + c] = id; this.addBlock(id, c, r, true); } };
    const run = (c0, r0, c1, r1) => {
      const out = [];
      const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
      for (let c = c0, r = r0; ; c += dc, r += dr) { out.push([c, r]); if (c === c1 && r === r1) break; }
      return out;
    };
    draw(0, [...run(4, 6, 10, 6), ...run(10, 7, 10, 9)]);
    draw(1, [...run(19, 3, 15, 3), ...run(15, 4, 15, 7)]);
    const [a, b] = this.players;
    Object.assign(a, { c: 11, r: 9, d: [1, 0], t: 0.25 });
    Object.assign(b, { c: 15, r: 8, d: [0, 1], t: 0.3 });
    a.fig.face(Math.atan2(1, 0), true);
    b.fig.face(Math.atan2(0, 1), true);
    for (const p of this.players) { p.fig.custom = STANCE; p.board.rotation.y = p.fig.facing; }
    a.bank = 0.3;
    this.rig.to(new THREE.Vector3(0.4, 4.4, 6.2), new THREE.Vector3(0.3, 0.1, -0.5), true);
  }
}
