// SNOWBALL SHOWDOWN — each player holds one side of a snowy field. Slide up and down your lane, press toward
// your rival to throw, hold away to duck. Your snow forts soak up incoming throws until they crumble.
import * as THREE from 'three';
import { BaseGame } from './base.js';
import { studio, vinyl, mesh, rbox, sharedGeo, PAL, TEAM } from '../engine.js';
import { sfx } from '../audio.js';
import { rand, clamp } from '../util.js';

const S = 1.25;
const LANE_X = 6.2, ZMAX = 3.9, FORT_X = 3.5, FORT_HALF = 0.85;
const BALL_SPEED = 13, COOLDOWN = 0.55;
const SNOW = '#F7FAFF';

export class SnowballShowdown extends BaseGame {
  static meta = {
    touch: { stick: 'Up & down to move · pull back to duck', button: ['THROW', 'toward', 'Throw a snowball'] },
    id: 'snowball', title: 'Snowball Showdown', icon: '❄️', color: '#CFE6FF', ink: '#1F3A66', rounds: 5, quick: true, figScale: S,
    tagline: 'Throw, duck, hide behind your fort. First to 5 hits!',
    goal: 'Slide up and down your lane. Press TOWARD your rival to throw a snowball, hold AWAY to duck. Your forts block throws until they crumble. First to 5 hits!',
    touchGoal: 'Slide up and down your lane with the stick. Tap THROW to fling a snowball, pull the stick back (away from your rival) to duck. Your forts block throws until they crumble. First to 5 hits!',
    controls: [['ud', 'Move'], ['toward', 'Throw'], ['away', 'Hold: duck']],
  };

  build() {
    this.lights = studio(this.scene, this.app.engine, { sky: ['#9CC2EA', '#CFE2F6', '#EEF4FC'], fog: '#DCE7F5', fogNear: 26, fogFar: 64, shadow: 10, sun: [-5, 13, 9], sunI: 1.8, hemiI: 0.85, env: 0.35 });
    this.lights.follow(new THREE.Vector3(0, 0, 0));
    const snow = vinyl(SNOW, { rough: 0.75, coat: 0.15 });
    // the field is a cool blue-white so the bright snowballs and forts pop against it
    const ground = mesh(new THREE.CircleGeometry(60, 64), vinyl('#D7E2F2', { rough: 0.85, coat: 0.05 }), { cast: false });
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    // soft drifts to break up the flat field
    for (let i = 0; i < 30; i++) {
      const d = mesh(sharedGeo('sb:drift', () => new THREE.SphereGeometry(1, 24, 12)), snow, { cast: false });
      // drifts only behind and beside the field, never between it and the camera
      const a = rand(Math.PI * 1.05, Math.PI * 1.95), r = rand(10, 22);
      d.scale.set(rand(1, 2.4), rand(0.25, 0.6), rand(0.8, 1.6));
      d.position.set(Math.cos(a) * r * 1.2, 0, Math.sin(a) * r * 0.6 - 2);
      this.scene.add(d);
    }
    // the low ridge down the middle
    // packed-snow lanes in pale team colours
    for (const team of [0, 1]) {
      const lane = mesh(rbox(1.5, 0.06, ZMAX * 2 + 1.6, 0.03, 2), vinyl(TEAM[team].light, { rough: 0.7, coat: 0.1 }), { cast: false });
      lane.position.set(team ? LANE_X : -LANE_X, 0.03, 0);
      this.scene.add(lane);
    }
    const ridge = mesh(new THREE.CapsuleGeometry(0.35, ZMAX * 2 + 1, 8, 16), snow);
    ridge.rotation.x = Math.PI / 2;
    ridge.scale.set(1.8, 1, 0.4);
    ridge.position.set(0, 0.05, 0);
    this.scene.add(ridge);
    // lane edges: little flag poles in team colours at both ends of each lane
    for (const team of [0, 1]) {
      for (const z of [-ZMAX - 0.6, ZMAX + 0.6]) {
        const pole = mesh(sharedGeo('sb:pole', () => new THREE.CylinderGeometry(0.035, 0.035, 1.4, 8)), vinyl('#FFFFFF'));
        pole.position.set(team ? LANE_X : -LANE_X, 0.7, z);
        const flag = mesh(sharedGeo('sb:flag', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.42, -0.14); s.lineTo(0, -0.28); s.closePath(); return new THREE.ShapeGeometry(s); }), vinyl(TEAM[team].color, { side: THREE.DoubleSide }), { cast: false });
        flag.position.set(team ? LANE_X : -LANE_X, 1.38, z);
        flag.rotation.y = team ? Math.PI : 0;
        this.scene.add(pole, flag);
      }
    }
    // pine trees
    for (const [x, z, s] of [[-10, -6, 1.3], [-12.5, -2, 1.0], [-11.5, 3.5, 0.9], [10.5, -6.5, 1.4], [12.5, -1.5, 1.0], [12, 3, 1.1], [-4, -9, 1.2], [3, -10, 1.5], [0, -8.2, 0.9], [-16, 1, 1.4], [16, 0, 1.3]]) {
      this.scene.add(pine(x, z, s));
    }
    const sm = snowman();
    sm.position.set(-9.2, 0, 1.8);
    sm.rotation.y = 0.6;
    this.scene.add(sm);
    const sm2 = snowman('#5B8DEF');
    sm2.position.set(9.4, 0, 2.6);
    sm2.rotation.y = -0.6;
    sm2.scale.setScalar(0.8);
    this.scene.add(sm2);

    // forts: two per side, rebuilt every point
    this.forts = [];
    for (const team of [0, 1]) for (const z of [-1.9, 1.9]) {
      const g = new THREE.Group();
      const blocks = [];
      for (let row = 0; row < 3; row++) for (let c = 0; c < (row === 2 ? 2 : 3); c++) {
        const b = mesh(rbox(0.55, 0.42, 0.55, 0.16, 3), snow);
        const off = row === 2 ? (c - 0.5) * 0.58 : (c - 1) * 0.58;
        b.position.set(0, 0.21 + row * 0.4, off + (row % 2 ? 0.1 : 0));
        b.rotation.y = rand(-0.15, 0.15);
        b.userData.row = row;
        g.add(b);
        blocks.push(b);
      }
      g.position.set(team ? FORT_X : -FORT_X, 0, z);
      this.scene.add(g);
      this.forts.push({ team, z, g, blocks, hp: 3 });
    }

    // snowfall: one instanced mesh that drifts forever
    const N = 220;
    this.flakes = new THREE.InstancedMesh(sharedGeo('sb:flake', () => new THREE.SphereGeometry(0.05, 6, 4)), vinyl('#FFFFFF', { rough: 0.6, coat: 0 }), N);
    this.flakes.frustumCulled = false;
    this.flakeData = Array.from({ length: N }, () => ({ x: rand(-16, 16), y: rand(0, 12), z: rand(-10, 8), v: rand(0.5, 1.2), ph: rand(0, 6) }));
    this.scene.add(this.flakes);
    this.m4 = new THREE.Matrix4();
    this.balls = [];
  }

  resetRound() {
    for (const b of this.balls ?? []) b.mesh.removeFromParent();
    this.balls = [];
    for (const f of this.forts) {
      f.hp = 3;
      f.g.visible = true;
      for (const b of f.blocks) { b.visible = true; b.scale.setScalar(1); }
    }
    this.players.forEach((p, i) => {
      p.pos.set(i ? LANE_X : -LANE_X, 0, 0);
      p.vel.set(0, 0, 0);
      p.cd = 0; p.duck = false; p.hitT = 0;
      p.fig.pose = 'auto';
      p.fig.custom = null;
      p.fig.speed = 0;
      p.fig.face(this.facing(p), true);
    });
  }
  facing(p) { return p.id ? -Math.PI / 2 : Math.PI / 2; }
  toward(p) { return p.id ? 'left' : 'right'; }
  away(p) { return p.id ? 'right' : 'left'; }

  onPress(p, action) {
    if (action !== this.toward(p) || p.duck || p.cd > 0 || p.hitT > 0) return;
    this.throw(p);
  }
  throw(p) {
    p.cd = COOLDOWN;
    p.fig.pose = 'throw';
    p.fig.throwT = 0;
    p.throwPose = 0.45;
    sfx.throw();
    const dir = p.id ? -1 : 1;
    const m = mesh(sharedGeo('sb:ball', () => new THREE.SphereGeometry(0.17, 16, 12)), vinyl('#FFFFFF', { rough: 0.55, coat: 0.2 }));
    const x0 = p.pos.x + dir * 0.45;
    m.position.set(x0, 1.35, p.pos.z);
    this.scene.add(m);
    this.balls.push({ mesh: m, owner: p.id, dir, x0, z: p.pos.z, dist: Math.abs(-dir * LANE_X - x0) + LANE_X + 1.5 });
  }

  tick(dt) {
    for (const p of this.players) {
      p.cd = Math.max(0, p.cd - dt);
      p.hitT = Math.max(0, p.hitT - dt);
      const f = p.fig;
      p.duck = this.live && p.hitT <= 0 && this.input.isHeld(p.id, this.away(p));
      let dz = 0;
      if (this.live && !p.duck && p.hitT <= 0) dz = clamp(this.input.axis(p.id).z, -1, 1);
      p.vel.z += (dz * 5.2 - p.vel.z) * (1 - Math.exp(-(dz ? 12 : 14) * dt));
      p.pos.z = clamp(p.pos.z + p.vel.z * dt, -ZMAX, ZMAX);
      if (Math.abs(p.pos.z) >= ZMAX) p.vel.z = 0;
      // poses: duck = a deep squat with arms over the head
      if (p.throwPose > 0) p.throwPose -= dt;
      if (p.duck) {
        f.pose = 'auto'; f.speed = 0;
        f.custom = { lean: 0.7, ll: -1.25, rl: -1.25, y: -0.24, la: -2.7, ra: -2.7, laZ: -0.7, raZ: 0.7, headX: 0.35 };
      } else {
        f.custom = null;
        if (this.state === 'play') {
          if (p.throwPose > 0) f.pose = 'throw';
          else if (p.hitT > 0) f.pose = 'dizzy';
          else { f.pose = 'auto'; f.speed = Math.abs(p.vel.z) * 1.2; }
        }
      }
      // sideways shuffle: keep facing the rival, lean into the slide
      f.face(this.facing(p) + clamp(-p.vel.z * 0.08, -0.35, 0.35) * (p.id ? -1 : 1));
    }

    // snowballs: a lob that peaks early, then a straight-ish run at the rival
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i], m = b.mesh;
      const prevX = m.position.x;
      m.position.x += b.dir * BALL_SPEED * dt;
      const travelled = Math.abs(m.position.x - b.x0), k = clamp(travelled / (2 * LANE_X), 0, 1.4);
      m.position.y = 1.35 + Math.sin(Math.min(1, k * 1.25) * Math.PI) * 0.55 - k * 0.5;
      m.rotation.x += dt * 8;
      let gone = false;
      // forts of the side being attacked catch the ball
      for (const f of this.forts) {
        if (f.hp <= 0 || f.team === b.owner) continue;
        const fx = f.g.position.x;
        if ((prevX - fx) * (m.position.x - fx) <= 0 && Math.abs(b.z - f.z) < FORT_HALF + 0.12) {
          this.hitFort(f, m.position);
          gone = true;
          break;
        }
      }
      // the rival
      if (!gone) {
        const t = this.players[1 - b.owner];
        if ((prevX - t.pos.x) * (m.position.x - t.pos.x) <= 0 && Math.abs(b.z - t.pos.z) < 0.5) {
          if (!t.duck && t.hitT <= 0 && this.live) { this.hitPlayer(t, b); gone = true; }
          else if (t.duck) this.fx.puff(m.position.clone(), { n: 2, size: 0.1, speed: 0.6 });
        }
      }
      // snowball vs snowball: both burst
      if (!gone) for (const o of this.balls) {
        if (o === b || o.owner === b.owner || o.dead) continue;
        if (m.position.distanceTo(o.mesh.position) < 0.38) {
          o.dead = true; gone = true;
          sfx.splat();
          this.fx.burst(m.position.clone().lerp(o.mesh.position, 0.5), '#FFFFFF', { n: 12, speed: 3, up: 2.5, size: 0.08 });
          break;
        }
      }
      if (!gone && (m.position.y < 0.1 || Math.abs(m.position.x) > LANE_X + 2.5)) {
        gone = true;
        this.fx.puff(m.position.clone().setY(Math.max(0.1, m.position.y)), { n: 4, size: 0.14, speed: 1 });
      }
      if (gone || b.dead) {
        m.removeFromParent();
        this.balls.splice(i, 1);
      }
    }
  }

  hitFort(f, at) {
    f.hp--;
    sfx.crack();
    this.fx.burst(at.clone(), '#FFFFFF', { n: 10, speed: 2.5, up: 2.5, size: 0.08 });
    // knock off the top row each hit
    const row = f.hp; // hp 2 → row 2 goes, hp 1 → row 1, hp 0 → everything
    for (const b of f.blocks) {
      if (b.userData.row >= row && b.visible) {
        b.visible = false;
        this.fx.burst(f.g.position.clone().setY(0.3 + b.userData.row * 0.4).add(new THREE.Vector3(0, 0, b.position.z)), SNOW, { n: 5, speed: 2, up: 3, size: 0.12, geo: 'box' });
      }
    }
    if (f.hp <= 0) { f.g.visible = false; this.fx.puff(f.g.position.clone().setY(0.3), { n: 8, size: 0.3, speed: 1.6 }); }
  }

  hitPlayer(t, b) {
    t.hitT = 0.9;
    t.fig.pose = 'dizzy';
    t.fig.dizzy = 1.2;
    t.fig.land(0.8);
    t.vel.z = 0;
    sfx.splat();
    sfx.bump(0.8);
    const at = t.pos.clone().setY(1.2);
    this.fx.burst(at, '#FFFFFF', { n: 18, speed: 4, up: 3.5, size: 0.1 });
    this.fx.stars(at.clone().setY(1.7), 5);
    this.rig.shake(0.18, 0.25);
    this.endRound(b.owner, `${this.name(b.owner)} HITS!`);
  }

  animate(dt) {
    const q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    const t = this.app.time;
    this.flakeData.forEach((f, i) => {
      f.y -= f.v * dt;
      if (f.y < 0) { f.y = 12; f.x = rand(-16, 16); }
      this.m4.compose(v.set(f.x + Math.sin(t * 0.8 + f.ph) * 0.4, f.y, f.z), q, s);
      this.flakes.setMatrixAt(i, this.m4);
    });
    this.flakes.instanceMatrix.needsUpdate = true;
  }

  updateCamera(dt, instant) {
    if (this.winnerCam(instant)) return;
    this.rig.to(new THREE.Vector3(0, 9.4, 13.0), new THREE.Vector3(0, 0.4, 0.5), instant);
  }

  previewPose() {
    const [a, b] = this.players;
    a.pos.set(-2.6, 0, 0.4); a.fig.pose = 'throw'; a.fig.throwT = 0.2; a.fig.face(Math.PI / 2 - 0.3, true);
    b.pos.set(2.2, 0, -0.2); b.duck = true;
    b.fig.custom = { lean: 0.7, ll: -1.25, rl: -1.25, y: -0.24, la: -2.7, ra: -2.7, laZ: -0.7, raZ: 0.7, headX: 0.35 };
    b.fig.face(-Math.PI / 2 + 0.4, true);
    for (const f of this.forts) f.g.visible = false;
    const m = mesh(sharedGeo('sb:ball', () => new THREE.SphereGeometry(0.17, 16, 12)), vinyl('#FFFFFF', { rough: 0.55, coat: 0.2 }));
    m.position.set(-0.4, 1.75, 0.1);
    this.scene.add(m);
    this.fx.puff(new THREE.Vector3(-1.0, 1.7, 0.2), { n: 3, size: 0.08, speed: 0.4 });
    this.rig.to(new THREE.Vector3(0, 3.6, 6.4), new THREE.Vector3(0, 0.9, 0), true);
  }
}

function pine(x, z, s) {
  const g = new THREE.Group();
  const trunk = mesh(sharedGeo('sb:trunk', () => new THREE.CylinderGeometry(0.16, 0.2, 0.7, 10)), vinyl('#8B5A3C', { rough: 0.6 }));
  trunk.position.y = 0.35;
  g.add(trunk);
  const green = vinyl('#3E9E6E', { rough: 0.45, coat: 0.4 }), snowCap = vinyl(SNOW, { rough: 0.6, coat: 0.2 });
  [[1.2, 1.3, 0.9], [0.95, 1.1, 1.65], [0.68, 0.95, 2.35]].forEach(([r, h, y]) => {
    const c = mesh(sharedGeo(`sb:cone${r}`, () => new THREE.ConeGeometry(r, h, 18)), green);
    c.position.y = y;
    const cap = mesh(sharedGeo(`sb:cap${r}`, () => new THREE.ConeGeometry(r * 0.62, h * 0.42, 18)), snowCap);
    cap.position.y = y + h * 0.3;
    g.add(c, cap);
  });
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  return g;
}

function snowman(scarf = PAL.mustard) {
  const g = new THREE.Group();
  const body = vinyl(SNOW, { rough: 0.5, coat: 0.3 });
  const geo = sharedGeo('sb:snowball', () => new THREE.SphereGeometry(1, 28, 18));
  [[0.62, 0.55], [0.45, 1.45], [0.33, 2.1]].forEach(([r, y]) => { const m = mesh(geo, body); m.scale.setScalar(r); m.position.y = y; g.add(m); });
  const coal = vinyl('#232B45', { rough: 0.3, coat: 0.8 });
  for (const x of [-0.11, 0.11]) { const e = mesh(sharedGeo('sb:coal', () => new THREE.SphereGeometry(0.045, 10, 8)), coal); e.position.set(x, 2.18, 0.29); g.add(e); }
  const nose = mesh(sharedGeo('sb:nose', () => new THREE.ConeGeometry(0.06, 0.32, 12)), vinyl(PAL.orange, { rough: 0.4 }));
  nose.rotation.x = Math.PI / 2; nose.position.set(0, 2.1, 0.45);
  const sc = mesh(sharedGeo('sb:scarf', () => new THREE.TorusGeometry(0.34, 0.08, 10, 28)), vinyl(scarf, { rough: 0.5, coat: 0.3 }));
  sc.rotation.x = Math.PI / 2; sc.position.y = 1.82;
  const hat = mesh(sharedGeo('sb:hat', () => new THREE.CylinderGeometry(0.22, 0.22, 0.36, 18)), coal);
  hat.position.y = 2.55;
  const brim = mesh(sharedGeo('sb:brim', () => new THREE.CylinderGeometry(0.34, 0.34, 0.04, 20)), coal);
  brim.position.y = 2.38;
  g.add(nose, sc, hat, brim);
  return g;
}
