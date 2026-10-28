// TOWER TUMBLE — two stacking towers side by side. Your figure surfs a block that slides back and forth over your
// tower; drop it so it lines up. The overhang is sliced off, a complete miss topples the tower. First to 14 floors wins.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BaseGame } from './base.js';
import { studio, vinyl, mesh, rbox, sharedGeo, cloud, TEAM, PAL } from '../engine.js';
import { sfx } from '../audio.js';
import { rand, pick, clamp } from '../util.js';

const H = 0.32, SIZE = 1.6, AMP = 2.0, GOAL = 14, PERFECT = 0.07, GAP = 0.14, BASE_Y = 0.5;
const TX = [-3, 3];
const SHADES = [['#FF6F59', '#FF8A73', '#F2553E', '#FFA08C'], ['#2EC4B6', '#4FD6C9', '#1FAEA1', '#7FE3D9']];
const FIG = 0.85;
const RIDE = { headX: 0.22 }; // eyes on the tower below

const topOf = n => BASE_Y + (n + 1) * H;            // top surface of floor n (floor 0 = the base block)
const centerOf = n => BASE_Y + n * H + H / 2;

function blockGeo(w, d) { return new RoundedBoxGeometry(w, H, d, 2, 0.05); }

export class TowerTumble extends BaseGame {
  static meta = {
    touch: { button: ['DROP', 'up', 'Drop your block'] },
    id: 'tower', title: 'Tower Tumble', icon: '🧱', color: '#7ED6A5', ink: '#123F28', rounds: 2, hud: ['scores'], figScale: FIG,
    tagline: 'Drop the sliding block. Line it up. First to 14 floors!',
    goal: `You ride a block that slides back and forth over your tower — press UP to drop it. Whatever hangs over the edge gets sliced off, and a complete miss topples your tower. First to ${GOAL} floors wins!`,
    touchGoal: `You ride a block that slides back and forth over your tower — tap DROP to drop it. Whatever hangs over the edge gets sliced off, and a complete miss topples your tower. First to ${GOAL} floors wins!`,
    controls: [['up', 'Drop the block']],
  };

  build() {
    this.lights = studio(this.scene, this.app.engine, { sky: ['#A9DCFF', '#D6EEFF', '#FFF4E6'], fog: '#EAF5FF', fogNear: 30, fogFar: 80, shadow: 9, sun: [2, 18, 6] });
    const ground = mesh(new THREE.CircleGeometry(70, 64), vinyl('#D7F0DD', { rough: 0.9, coat: 0 }), { cast: false });
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    // a pedestal under each tower
    for (const x of TX) {
      const ped = mesh(new THREE.CylinderGeometry(1.75, 1.95, BASE_Y, 48), vinyl('#FFFFFF', { rough: 0.25, coat: 0.8 }));
      ped.position.set(x, BASE_Y / 2, 0);
      const trim = mesh(new THREE.TorusGeometry(1.75, 0.06, 10, 64), vinyl(PAL.mustard, { rough: 0.3, coat: 0.7 }));
      trim.rotation.x = -Math.PI / 2; trim.position.set(x, BASE_Y, 0);
      this.scene.add(ped, trim);
    }
    // toy-block town in the background
    const cols = [PAL.mustard, PAL.lilac, PAL.pink, '#8FD3FF', '#7ED6A5', '#FFFFFF'];
    for (let i = 0; i < 18; i++) {
      const s = rand(1.0, 2.2), x = rand(-22, 22), z = rand(-24, -13);
      const stack = Math.floor(rand(1, 4));
      for (let k = 0; k < stack; k++) {
        const b = mesh(rbox(s, s, s, 0.14, 3), vinyl(pick(cols), { rough: 0.35, coat: 0.6 }));
        b.position.set(x + rand(-0.15, 0.15), s / 2 + k * s, z);
        b.rotation.y = rand(-0.4, 0.4);
        this.scene.add(b);
      }
    }
    for (let i = 0; i < 7; i++) {
      const c = cloud(rand(1.1, 2));
      c.position.set(rand(-20, 20), rand(7, 12), rand(-24, -12));
      this.scene.add(c);
    }
    this.debris = [];
    for (const p of this.players) p.tw = null;
  }

  // ---------- tower state ----------
  newTower(p) {
    if (p.tw) {
      for (const b of p.tw.blocks) { b.mesh.removeFromParent(); b.mesh.geometry.dispose(); }
      if (p.tw.mov) { p.tw.mov.mesh.removeFromParent(); p.tw.mov.mesh.geometry.dispose(); }
    }
    const x = TX[p.id];
    p.tw = { blocks: [], top: { x, z: 0, w: SIZE, d: SIZE }, floors: 0, mov: null, drop: null, streak: 0, toppled: false, done: false, axis: 'z' };
    this.placeBlock(p, { x, z: 0, w: SIZE, d: SIZE }, 0);
    this.spawnMover(p);
  }
  color(p, n) { const s = SHADES[p.id]; return s[n % s.length]; }
  placeBlock(p, b, n) {
    const m = mesh(blockGeo(b.w, b.d), vinyl(this.color(p, n), { rough: 0.3, coat: 0.7 }));
    m.position.set(b.x, centerOf(n), b.z);
    this.scene.add(m);
    p.tw.blocks.push({ ...b, mesh: m, n });
    p.tw.top = { x: b.x, z: b.z, w: b.w, d: b.d };
    return m;
  }
  spawnMover(p) {
    const tw = p.tw;
    tw.axis = tw.axis === 'x' ? 'z' : 'x';
    const n = tw.floors + 1;
    const m = mesh(blockGeo(tw.top.w, tw.top.d), vinyl(this.color(p, n), { rough: 0.3, coat: 0.7 }));
    // blocks enter from alternating sides, like a shuttle
    const side = n % 4 < 2 ? -1 : 1;
    tw.mov = { mesh: m, off: side * AMP, dir: -side, w: tw.top.w, d: tw.top.d, n };
    this.scene.add(m);
    this.positionMover(p);
  }
  positionMover(p) {
    const { mov, top, floors } = p.tw;
    const y = centerOf(floors + 1) + GAP;
    mov.mesh.position.set(top.x + (p.tw.axis === 'x' ? mov.off : 0), y, top.z + (p.tw.axis === 'z' ? mov.off : 0));
  }
  speed(p) { return Math.min(5.2, 2.4 + p.tw.floors * 0.22); } // slide extent > block size, so a bad drop can miss outright

  resetRound() {
    for (const d of this.debris) { d.mesh.removeFromParent(); d.mesh.geometry.dispose(); }
    this.debris = [];
    this.players.forEach(p => {
      this.newTower(p);
      p.out = false; p.vy = 0; p.air = false; p.falling = false;
      p.pos.set(TX[p.id], topOf(0), 0);
      p.fig.tumble.rotation.set(0, 0, 0);
      p.fig.pose = 'auto';
      p.fig.speed = 0;
      p.fig.custom = RIDE;
      p.fig.face(p.id ? -0.25 : 0.25, true);
    });
    this.finishers = [];
    if (!this.preview) this.ui.hudScores(`0/${GOAL}`, `0/${GOAL}`);
  }
  onCountdown() { this.ui.hudScores(`0/${GOAL}`, `0/${GOAL}`); }

  onPress(p, action) {
    if (action !== 'up' && action !== 'down') return;
    const tw = p.tw;
    if (tw.toppled || tw.done || tw.drop || !tw.mov || p.air) return;
    // freeze the slide and drop the block (with the figure riding it) onto the tower
    tw.drop = { vy: -1.5, target: centerOf(tw.mov.n) };
  }

  land(p) {
    const tw = p.tw, mov = tw.mov, top = tw.top;
    tw.drop = null;
    tw.mov = null;
    const ax = tw.axis;
    const c = ax === 'x' ? mov.mesh.position.x : mov.mesh.position.z;
    const tc = ax === 'x' ? top.x : top.z;
    const size = ax === 'x' ? mov.w : mov.d, tsize = ax === 'x' ? top.w : top.d;
    let delta = c - tc;
    const perfect = Math.abs(delta) < PERFECT;
    let lo, hi;
    if (perfect) { lo = tc - Math.min(size, tsize) / 2; hi = tc + Math.min(size, tsize) / 2; delta = 0; }
    else { lo = Math.max(c - size / 2, tc - tsize / 2); hi = Math.min(c + size / 2, tc + tsize / 2); }
    const overlap = hi - lo;
    mov.mesh.removeFromParent();
    mov.mesh.geometry.dispose();
    if (overlap <= 0.04) return this.topple(p, mov);

    const mid = (lo + hi) / 2;
    const b = ax === 'x' ? { x: mid, z: top.z, w: overlap, d: mov.d } : { x: top.x, z: mid, w: mov.w, d: overlap };
    if (perfect) {
      tw.streak++;
      if (tw.streak >= 3) { b.w = Math.min(SIZE, b.w + 0.1); b.d = Math.min(SIZE, b.d + 0.1); }
      if (!this.preview) {
        sfx.chime();
        this.fx.puff(new THREE.Vector3(b.x, topOf(mov.n), b.z), { n: 10, color: '#FFFFFF', size: 0.2, speed: 2.2, up: 0.4 });
        this.fx.shockwave(new THREE.Vector3(b.x, topOf(mov.n) + 0.02, b.z), '#FFFFFF', { size: 2.2 });
        this.ui.toast(tw.streak >= 3 ? `✨ ${this.name(p.id)}: PERFECT ×${tw.streak} — bigger block!` : `✨ ${this.name(p.id)}: PERFECT!`, `team${p.id}`);
      }
    } else {
      tw.streak = 0;
      // the overhang is sliced off and tumbles away
      const ohSize = size - overlap;
      if (ohSize > 0.01) {
        const sign = Math.sign(delta);
        const ohMid = sign > 0 ? hi + ohSize / 2 : lo - ohSize / 2;
        const ob = ax === 'x' ? { x: ohMid, z: top.z, w: ohSize, d: mov.d } : { x: top.x, z: ohMid, w: mov.w, d: ohSize };
        const om = mesh(blockGeo(ob.w, ob.d), vinyl(this.color(p, mov.n), { rough: 0.3, coat: 0.7 }));
        om.position.set(ob.x, centerOf(mov.n), ob.z);
        this.scene.add(om);
        const v = new THREE.Vector3(ax === 'x' ? sign * 1.6 : 0, 1.2, ax === 'z' ? sign * 1.6 : 0);
        const spin = new THREE.Vector3(ax === 'z' ? sign * 4 : rand(-1, 1), rand(-1, 1), ax === 'x' ? -sign * 4 : rand(-1, 1));
        this.debris.push({ mesh: om, v, spin });
      }
      if (!this.preview) sfx.thud();
    }
    this.placeBlock(p, b, mov.n);
    tw.floors = mov.n;
    // hop up onto the next block
    p.vy = 4.6; p.air = true;
    p.fig.pose = 'air';
    if (!this.preview) sfx.jump();
    if (!this.preview) {
      this.ui.hudScores(`${this.players[0].tw.floors}/${GOAL}`, `${this.players[1].tw.floors}/${GOAL}`);
      this.fx.puff(new THREE.Vector3(b.x, topOf(mov.n - 1), b.z), { n: 5, size: 0.14, speed: 1.4, up: 0.2 });
    }
    if (tw.floors >= GOAL) { tw.done = true; this.finishers.push(p.id); }
    else this.spawnMover(p);
  }

  topple(p, mov) {
    const tw = p.tw;
    tw.toppled = true;
    tw.streak = 0;
    // the missed block keeps falling past the tower
    const mm = mesh(blockGeo(mov.w, mov.d), vinyl(this.color(p, mov.n), { rough: 0.3, coat: 0.7 }));
    mm.position.copy(mov.mesh.position);
    this.scene.add(mm);
    this.debris.push({ mesh: mm, v: new THREE.Vector3(rand(-1, 1), -2, rand(0, 1)), spin: new THREE.Vector3(rand(-3, 3), rand(-2, 2), rand(-3, 3)) });
    // every floor scatters (the base stays on the pedestal)
    for (const b of tw.blocks) {
      if (b.n === 0) continue;
      const out = new THREE.Vector3(b.x - TX[p.id], 0, b.z).normalize();
      if (!out.lengthSq()) out.set(rand(-1, 1), 0, rand(-1, 1)).normalize();
      const k = b.n / Math.max(1, tw.floors);
      this.debris.push({ mesh: b.mesh, v: new THREE.Vector3(out.x * 2 + rand(-1.5, 1.5), rand(1, 3) * k, out.z * 2 + rand(0, 2.5)), spin: new THREE.Vector3(rand(-4, 4), rand(-2, 2), rand(-4, 4)), delay: (tw.floors - b.n) * 0.03 });
    }
    tw.blocks = tw.blocks.filter(b => b.n === 0);
    p.falling = true; p.out = true; p.air = true;
    p.vy = 3.5;
    p.fallV = new THREE.Vector3(p.id ? 2.2 : -2.2, 0, 1.4);
    p.fig.custom = null;
    p.fig.pose = 'fall';
    if (!this.preview) {
      sfx.crack();
      sfx.fall();
      this.rig.shake(0.35, 0.4);
      this.ui.toast(`💥 ${this.name(p.id)}'s tower topples!`, `team${p.id}`);
    }
  }

  tick(dt) {
    for (const p of this.players) {
      const tw = p.tw;
      // slide the hovering block (only while playing)
      if (this.live && tw.mov && !tw.drop) {
        tw.mov.off += tw.mov.dir * this.speed(p) * dt;
        if (tw.mov.off > AMP) { tw.mov.off = AMP; tw.mov.dir = -1; }
        if (tw.mov.off < -AMP) { tw.mov.off = -AMP; tw.mov.dir = 1; }
        this.positionMover(p);
      }
      if (tw.drop) {
        tw.drop.vy -= 46 * dt;
        const m = tw.mov.mesh;
        m.position.y += tw.drop.vy * dt;
        if (m.position.y <= tw.drop.target) { m.position.y = tw.drop.target; this.land(p); }
      }
      this.moveFigure(p, dt);
    }
    // a winner once someone reaches the goal (both in the same frame → draw), or the other tower topples
    if (this.live) {
      const [a, b] = this.players;
      if (this.finishers.length === 2) this.endRound(null, 'DEAD HEAT!');
      else if (this.finishers.length === 1) this.endRound(this.finishers[0], `${this.name(this.finishers[0])} TOPS OUT!`);
      else if (a.tw.toppled && b.tw.toppled) this.endRound(null, 'DOUBLE TUMBLE!');
      else if (a.tw.toppled) this.endRound(1);
      else if (b.tw.toppled) this.endRound(0);
    }
    for (const p of this.players) if (!p.falling) p.fig.custom = this.state === 'play' || this.state === 'countdown' ? (p.air ? null : RIDE) : null;
  }

  moveFigure(p, dt) {
    const tw = p.tw;
    if (p.falling) {
      if (p.pos.y > 0 || p.vy > 0) {
        p.vy -= 16 * dt;
        p.pos.y = Math.max(0, p.pos.y + p.vy * dt);
        p.pos.x += p.fallV.x * dt; p.pos.z += p.fallV.z * dt;
        p.fig.tumble.rotation.z += dt * 5 * Math.sign(p.fallV.x);
        if (p.pos.y <= 0) {
          p.vy = 0;
          p.fig.tumble.rotation.set(0, 0, 0);
          p.fig.pose = 'dizzy';
          p.fig.land(1);
          if (!this.preview) { sfx.thud(); this.fx.puff(p.pos.clone().setY(0.1), { n: 8, size: 0.2 }); }
        }
      }
      return;
    }
    // stand on the sliding block (or the finished top)
    const m = tw.mov?.mesh;
    const sx = m ? m.position.x : tw.top.x, sz = m ? m.position.z : tw.top.z;
    const sy = m ? m.position.y + H / 2 : topOf(tw.floors);
    if (p.air) {
      p.vy -= 18 * dt;
      p.pos.y += p.vy * dt;
      p.pos.x += (sx - p.pos.x) * Math.min(1, dt * 9);
      p.pos.z += (sz - p.pos.z) * Math.min(1, dt * 9);
      if (p.pos.y <= sy && p.vy <= 0) {
        p.pos.y = sy; p.vy = 0; p.air = false;
        if (p.fig.pose === 'air') p.fig.pose = 'auto';
        p.fig.land(0.8);
        if (!this.preview) sfx.land();
      }
    } else p.pos.set(sx, sy, sz);
  }

  animate(dt) {
    for (let k = this.debris.length - 1; k >= 0; k--) {
      const d = this.debris[k];
      if (d.delay > 0) { d.delay -= dt; continue; }
      d.v.y -= 16 * dt;
      d.mesh.position.addScaledVector(d.v, dt);
      d.mesh.rotation.x += d.spin.x * dt; d.mesh.rotation.y += d.spin.y * dt; d.mesh.rotation.z += d.spin.z * dt;
      if (d.mesh.position.y < H / 2 && d.v.y < 0) {
        d.mesh.position.y = H / 2;
        d.v.y *= -0.3; d.v.x *= 0.6; d.v.z *= 0.6; d.spin.multiplyScalar(0.5);
        if (Math.abs(d.v.y) < 0.4) { d.v.set(0, 0, 0); d.spin.set(0, 0, 0); d.rest = true; }
      }
      if (d.rest && !d.settled) { d.settled = true; }
    }
  }

  updateCamera(dt, instant) {
    if (this.winnerCam(instant)) return;
    const [a, b] = this.players;
    // frame both riders: aim between the two tops and back off when one tower is far taller
    const ha = topOf(a.tw.floors), hb = topOf(b.tw.floors);
    const look = (ha + hb) / 2 + 0.6, dist = 12.4 + Math.abs(ha - hb) * 0.9;
    this.rig.to(new THREE.Vector3(0, look + 3.6, dist), new THREE.Vector3(0, look, 0), instant);
    this.lights.follow(new THREE.Vector3(0, Math.max(0, look - 2), 0));
  }

  previewPose() {
    for (const [p, floors] of [[this.players[0], 6], [this.players[1], 5]]) {
      for (let i = 0; i < floors; i++) { p.tw.mov.off = rand(-0.2, 0.2); this.positionMover(p); this.land(p); }
      p.tw.mov.off = p.id ? 0.7 : -0.5;
      this.positionMover(p);
      p.air = false; p.vy = 0;
      p.fig.pose = 'auto';
      const m = p.tw.mov.mesh;
      p.pos.set(m.position.x, m.position.y + H / 2, m.position.z);
      p.fig.custom = RIDE;
    }
    this.players[1].fig.pose = 'cheer';
    const h = topOf(6);
    this.rig.to(new THREE.Vector3(0, h + 1.8, 7.8), new THREE.Vector3(0, h - 0.3, 0), true);
  }
}
