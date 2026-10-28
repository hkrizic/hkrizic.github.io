// HURDLE HUSTLE — a side-on sprint. Alternate left/right to run, UP to jump hurdles, hold DOWN to limbo under bars.
import * as THREE from 'three';
import { BaseGame } from './base.js';
import { studio, vinyl, matte, mesh, rbox, sharedGeo, canvasTexture, cloud, TEAM, PAL, FONT, SCRIPT } from '../engine.js';
import { CONFETTI } from '../fx.js';
import { sfx } from '../audio.js';
import { rand, pick, seeded, clamp, tween, ease } from '../util.js';

const LEN = 72, LANE = [-1.05, 1.05], VMAX = 11.5, G = 22, JUMP = 6.4;
const HURDLE_H = 0.56, BAR_Y = 1.08;

function stripeTex(a, b, n = 6) {
  const t = canvasTexture(256, 32, (g, w, h) => {
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect((i * w) / n, 0, w / n + 1, h); }
  });
  t.userData.shared = true;
  return t;
}
let STRIPE_H = null, STRIPE_B = null;

export class HurdleHustle extends BaseGame {
  static meta = {
    touch: { pads: { up: 'JUMP', left: 'RUN', right: 'RUN', down: 'DUCK' }, layout: 'cross', tip: 'Tap the two RUN pads one after the other to sprint' },
    id: 'hurdles', title: 'Hurdle Hustle', icon: '🏃', color: '#A594F9', ink: '#271D63', rounds: 2, hud: ['track'], figScale: 1.2,
    tagline: 'Mash left-right to sprint. Jump hurdles, limbo under bars!',
    goal: 'Alternate LEFT and RIGHT as fast as you can to run. Jump over hurdles, hold DOWN to limbo under the high bars. First to the finish wins the heat — win 2 heats!',
    touchGoal: 'Tap your two RUN pads one after the other as fast as you can. JUMP over hurdles, hold DUCK to limbo under the high bars. First to the finish wins the heat — win 2 heats!',
    controls: [['lr', 'Alternate to sprint'], ['up', 'Jump hurdles'], ['down', 'Hold: limbo under bars']],
  };

  build() {
    this.touchLift = 0.1; // the track sits higher on touch screens, above the pads
    this.lights = studio(this.scene, this.app.engine, { sky: ['#9CD2FF', '#D4ECFF', '#FFF2E2'], fog: '#E9F4FF', fogNear: 35, fogFar: 95, shadow: 12, sun: [4, 16, 9] });
    STRIPE_H ||= stripeTex('#FFFFFF', PAL.coral, 6);
    STRIPE_B ||= stripeTex(PAL.ink, PAL.mustard, 8);
    // grass with mowing stripes
    const grassTex = canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#9BD67F'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#8CCB71'; g.fillRect(0, 0, w / 2, h);
    });
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(30, 12);
    const grass = mesh(new THREE.PlaneGeometry(240, 80), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 }), { cast: false });
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(LEN / 2, -0.01, 0);
    this.scene.add(grass);
    // the track
    const track = mesh(new THREE.BoxGeometry(LEN + 40, 0.1, 4.6), vinyl('#8C7BEA', { rough: 0.7, coat: 0.1 }), { cast: false });
    track.position.set(LEN / 2, 0.0, 0);
    this.scene.add(track);
    const line = vinyl('#FFFFFF', { rough: 0.5, coat: 0.2 });
    for (const z of [-2.1, 0, 2.1]) {
      const l = mesh(new THREE.BoxGeometry(LEN + 40, 0.02, 0.07), line, { cast: false });
      l.position.set(LEN / 2, 0.06, z);
      this.scene.add(l);
    }
    const start = mesh(new THREE.BoxGeometry(0.12, 0.02, 4.2), line, { cast: false });
    start.position.set(0, 0.06, 0);
    this.scene.add(start);
    const checker = canvasTexture(64, 512, (g, w, h) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? PAL.ink : '#FFFFFF'; g.fillRect(x * 32, y * 32, 32, 32); }
    });
    const fin = mesh(new THREE.PlaneGeometry(0.5, 4.2), new THREE.MeshStandardMaterial({ map: checker, roughness: 0.6 }), { cast: false });
    fin.rotation.x = -Math.PI / 2;
    fin.position.set(LEN, 0.065, 0);
    this.scene.add(fin);
    // lane numbers painted on the track
    for (const team of [0, 1]) {
      const t = canvasTexture(256, 128, (g, w, h) => {
        g.fillStyle = '#FFFFFF'; g.font = `800 92px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(team ? '↑←↓→' : 'WASD', w / 2, h / 2 + 4);
      });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.85, depthWrite: false }));
      p.rotation.x = -Math.PI / 2; p.rotation.z = -Math.PI / 2;
      p.position.set(-1.6, 0.07, LANE[team]);
      this.scene.add(p);
    }
    // finish arch
    const arch = new THREE.Group();
    for (const z of [-2.75, 2.75]) {
      const post = mesh(rbox(0.32, 3.6, 0.32, 0.12, 3), vinyl(PAL.mustard, { rough: 0.3, coat: 0.7 }));
      post.position.set(0, 1.8, z);
      const ball = mesh(sharedGeo('balloon', () => new THREE.SphereGeometry(0.34, 24, 16)), vinyl(z < 0 ? PAL.coral : PAL.teal, { rough: 0.2, coat: 1 }));
      ball.scale.set(1, 1.18, 1);
      ball.position.set(0, 4.0, z);
      arch.add(post, ball);
    }
    const bannerTex = canvasTexture(1024, 160, (g, w, h) => {
      g.fillStyle = PAL.ink; g.beginPath(); g.roundRect(0, 0, w, h, 40); g.fill();
      g.fillStyle = '#FFFFFF'; g.font = `800 104px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('F I N I S H', w / 2, h / 2 + 6);
    });
    const banner = mesh(new THREE.BoxGeometry(5.9, 0.92, 0.12), [matte(PAL.ink), matte(PAL.ink), matte(PAL.ink), matte(PAL.ink), new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.5 }), new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.5 })]);
    banner.position.set(0, 3.25, 0);
    banner.rotation.y = Math.PI / 2;
    arch.add(banner);
    arch.position.x = LEN;
    this.scene.add(arch);
    // distance signs + ad boards along the far side
    const ads = ['WASD vs ARROW', 'JUMP!', 'SPRINT!', 'LIMBO!', 'GO GO GO', 'NO TRIPPING'];
    const adCols = [PAL.coral, PAL.teal, PAL.mustard, PAL.lilac, PAL.pink, PAL.mint];
    for (let x = -6, i = 0; x < LEN + 12; x += 7, i++) {
      const c = adCols[i % adCols.length], txt = ads[i % ads.length];
      const t = canvasTexture(512, 96, (g, w, h) => {
        g.fillStyle = c; g.fillRect(0, 0, w, h);
        g.fillStyle = '#FFFFFF';
        if (txt === 'WASD vs ARROW') {
          g.font = `800 56px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText('WASD', 120, h / 2 + 4); g.fillText('ARROW', 380, h / 2 + 4);
          g.fillStyle = PAL.ink; g.font = `50px ${SCRIPT}`; g.fillText('vs', 250, h / 2);
        } else { g.font = `800 60px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 4); }
      });
      const board = mesh(new THREE.BoxGeometry(6.6, 0.85, 0.12), [matte(c), matte(c), matte(c), matte(c), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }), matte(c)]);
      board.position.set(x + 3.3, 0.48, -3.2);
      this.scene.add(board);
    }
    for (let d = 10; d < LEN; d += 10) {
      const t = canvasTexture(128, 128, (g, w, h) => {
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
        g.fillStyle = PAL.ink; g.font = `800 56px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(d), 64, 68);
      });
      const sign = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
      sign.position.set(d, 1.4, -3.14);
      const pole = mesh(sharedGeo('pole', () => new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8)), vinyl('#FFFFFF'));
      pole.position.set(d, 0.9, -3.2);
      this.scene.add(sign, pole);
    }
    // bleachers + a bouncing crowd (instanced blobs)
    const benchMat = vinyl('#FFFFFF', { rough: 0.4, coat: 0.3 });
    for (let row = 0; row < 3; row++) {
      const b = mesh(new THREE.BoxGeometry(LEN + 30, 0.5 + row * 0.6, 1.2), row % 2 ? benchMat : vinyl('#DCE6F7', { rough: 0.4, coat: 0.3 }));
      b.position.set(LEN / 2, (0.5 + row * 0.6) / 2, -4.4 - row * 1.2);
      this.scene.add(b);
    }
    const COUNT = 3 * 64;
    this.crowdBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.22, 4, 10), new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6 }), COUNT);
    this.crowdHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6 }), COUNT);
    this.crowd = [];
    const skins = ['#FBE3D1', '#EFC19E', '#C68A62', '#8A5536', '#F6D5BC'];
    for (let i = 0; i < COUNT; i++) {
      const row = i % 3, col = Math.floor(i / 3);
      const x = -12 + col * ((LEN + 24) / 64) + rand(-0.25, 0.25);
      const y = 0.5 + row * 0.6 + 0.3, z = -4.4 - row * 1.2 + rand(-0.15, 0.15);
      this.crowd.push({ x, y, z, ph: rand(0, 6), amp: rand(0.05, 0.12) });
      this.crowdBody.setColorAt(i, new THREE.Color(pick([PAL.coral, PAL.teal, PAL.mustard, PAL.lilac, PAL.pink, PAL.mint, '#FFFFFF', PAL.ink])));
      this.crowdHead.setColorAt(i, new THREE.Color(pick(skins)));
    }
    this.crowdBody.castShadow = this.crowdHead.castShadow = true;
    this.crowdBody.frustumCulled = this.crowdHead.frustumCulled = false; // instances move every frame
    this.scene.add(this.crowdBody, this.crowdHead);
    this.excite = 0;
    this.m4 = new THREE.Matrix4();
    // bunting
    for (let x = -8; x < LEN + 14; x += 0.9) {
      const f = mesh(sharedGeo('flag', () => { const s = new THREE.Shape(); s.moveTo(-0.22, 0); s.lineTo(0.22, 0); s.lineTo(0, -0.36); s.closePath(); return new THREE.ShapeGeometry(s); }), vinyl(pick(CONFETTI.slice(0, 6)), { side: THREE.DoubleSide, rough: 0.5, coat: 0.2 }), { cast: false });
      f.position.set(x, 3.6 + Math.sin(x * 0.7) * 0.06, -7.1);
      this.scene.add(f);
    }
    // clouds
    for (let i = 0; i < 9; i++) {
      const c = cloud(rand(1.4, 2.6));
      c.position.set(rand(-10, LEN + 20), rand(8, 13), rand(-30, -18));
      this.scene.add(c);
    }
    this.obstacles = [];
    this.tapes = [];
    this.heatSeed = Math.floor(Math.random() * 1e6);
  }

  makeObstacle(type) {
    const g = new THREE.Group();
    if (type === 'hurdle') {
      const legMat = vinyl('#FFFFFF', { rough: 0.3, coat: 0.6 });
      for (const z of [-0.72, 0.72]) {
        const leg = mesh(sharedGeo('hleg', () => new THREE.CylinderGeometry(0.04, 0.04, HURDLE_H, 10)), legMat);
        leg.position.set(0, HURDLE_H / 2, z);
        const foot = mesh(rbox(0.5, 0.06, 0.08, 0.03, 2), legMat);
        foot.position.set(-0.15, 0.03, z);
        g.add(leg, foot);
      }
      const board = mesh(sharedGeo('hboard', () => new THREE.BoxGeometry(0.06, 0.16, 1.6)), (HurdleHustle.hMat ||= Object.assign(new THREE.MeshStandardMaterial({ map: STRIPE_H, roughness: 0.4 }), { userData: { shared: true } })));
      board.position.set(0, HURDLE_H - 0.06, 0);
      board.rotation.x = 0;
      g.add(board);
    } else {
      const postMat = vinyl(PAL.ink, { rough: 0.3, coat: 0.6 });
      for (const z of [-0.85, 0.85]) {
        const post = mesh(sharedGeo('bpost', () => new THREE.CylinderGeometry(0.06, 0.07, 1.5, 12)), postMat);
        post.position.set(0, 0.75, z);
        const base = mesh(sharedGeo('bbase', () => new THREE.CylinderGeometry(0.2, 0.24, 0.08, 20)), postMat);
        base.position.set(0, 0.04, z);
        g.add(post, base);
      }
      const bar = new THREE.Group();
      const rod = mesh(sharedGeo('brod', () => new THREE.CylinderGeometry(0.07, 0.07, 1.75, 16)), (HurdleHustle.bMat ||= Object.assign(new THREE.MeshStandardMaterial({ map: STRIPE_B, roughness: 0.35 }), { userData: { shared: true } })));
      rod.rotation.x = Math.PI / 2;
      bar.add(rod);
      // a little hanging sign
      const sign = mesh(rbox(0.5, 0.26, 0.04, 0.05, 2), vinyl(PAL.mustard, { rough: 0.3, coat: 0.6 }));
      sign.position.y = -0.22;
      bar.add(sign);
      bar.position.y = BAR_Y + 0.07;
      g.add(bar);
      g.userData.bar = bar;
    }
    return g;
  }

  resetRound() {
    for (const o of this.obstacles) for (const m of o.meshes) m.removeFromParent();
    this.obstacles = [];
    const r = seeded(this.heatSeed + this.round * 977);
    for (let x = 11 + r() * 3; x < LEN - 7; x += 6.5 + r() * 4) {
      const type = r() < 0.64 ? 'hurdle' : 'bar';
      const o = { x, type, knocked: [false, false], meshes: [] };
      for (const lane of [0, 1]) {
        const m = this.makeObstacle(type);
        m.position.set(x, 0.05, LANE[lane]);
        this.scene.add(m);
        o.meshes.push(m);
      }
      this.obstacles.push(o);
    }
    for (const t of this.tapes) t.removeFromParent();
    this.tapes = [0, 1].map(lane => {
      const tape = mesh(new THREE.BoxGeometry(0.03, 0.05, 2.0), vinyl(PAL.mustard, { rough: 0.4 }));
      tape.position.set(LEN, 0.9, LANE[lane]);
      this.scene.add(tape);
      return tape;
    });
    this.winner = null;
    this.finishT = 0;
    this.players.forEach((p, i) => {
      p.pos.set(0, 0, LANE[i]);
      p.v = 0; p.vy = 0; p.ground = true; p.stun = 0; p.duck = false; p.lastStep = null; p.finished = false;
      p.fig.pose = 'crouch';
      p.fig.speed = 0;
      p.fig.face(Math.PI / 2, true);
      p.fig.turnRate = 20;
    });
  }
  onGo() { for (const p of this.players) p.fig.pose = 'auto'; this.excite = 1; }

  onPress(p, action) {
    if (p.finished || p.stun > 0) return;
    if (action === 'left' || action === 'right') {
      if (!p.ground || p.duck) return;
      if (action !== p.lastStep) {
        p.v = Math.min(VMAX, p.v + 0.2 + 1.3 * (1 - p.v / VMAX));
        p.lastStep = action;
        sfx.step();
      } else {
        p.v *= 0.82; // same foot twice = stumble
        p.fig.dizzy = 0.15;
      }
    } else if (action === 'up' && p.ground) {
      p.vy = JUMP;
      p.ground = false;
      sfx.jump();
    }
  }

  trip(p, o) {
    o.knocked[p.id] = true;
    p.stun = 1.0;
    p.v = 0.6;
    p.vy = 0; p.pos.y = 0; p.ground = true;
    p.fig.pose = 'flat';
    sfx.trip();
    this.rig.shake(0.18, 0.25);
    this.fx.stars(new THREE.Vector3(p.pos.x + 0.6, 0.6, p.pos.z), 5);
    this.fx.puff(new THREE.Vector3(p.pos.x + 0.4, 0.1, p.pos.z), { n: 6, size: 0.2 });
    const m = o.meshes[p.id];
    if (o.type === 'hurdle') tween(0.35, k => { m.rotation.z = -k * Math.PI / 2; m.position.y = 0.05 + Math.sin(k * Math.PI) * 0.2; }, { ease: ease.outCubic });
    else { const bar = m.userData.bar; tween(0.6, k => { bar.rotation.x = Math.sin(k * Math.PI * 3) * (1 - k) * 0.6; bar.position.y = BAR_Y + 0.07 - k * (BAR_Y - 0.1); }, { ease: ease.outCubic }); }
  }

  tick(dt) {
    for (const p of this.players) {
      const prevX = p.pos.x;
      p.stun = Math.max(0, p.stun - dt);
      const control = this.live && !p.finished;
      p.duck = control && p.ground && p.stun <= 0 && this.input.isHeld(p.id, 'down');
      if (p.duck && !p.wasDuck) sfx.duck();
      p.wasDuck = p.duck;
      if (p.ground) {
        const decay = p.finished || !this.live ? 1.4 : p.duck ? 1.5 : 0.6;
        p.v *= Math.exp(-decay * dt);
        p.v = Math.max(0, p.v - 0.45 * dt);
      } else {
        p.vy -= G * dt;
        p.pos.y += p.vy * dt;
        if (p.pos.y <= 0) { p.pos.y = 0; p.vy = 0; p.ground = true; p.fig.land(0.7); sfx.land(); }
      }
      p.pos.x += p.v * dt;
      // obstacles
      for (const o of this.obstacles) {
        if (o.knocked[p.id] || p.stun > 0) continue;
        if (prevX < o.x + 0.25 && p.pos.x > o.x - 0.25) {
          if (o.type === 'hurdle' && p.pos.y < 0.42) this.trip(p, o);
          else if (o.type === 'bar' && !p.duck) this.trip(p, o);
          else if (prevX < o.x && p.pos.x >= o.x) { this.excite = Math.max(this.excite, 0.6); }
        }
      }
      // finish
      if (!p.finished && p.pos.x >= LEN) {
        p.finished = true;
        const tape = this.tapes[p.id];
        tween(0.5, k => { tape.scale.z = 1 - k; tape.position.x = LEN + k * 0.6; tape.position.y = 0.9 - k * 0.8; }, { ease: ease.outCubic });
        if (this.winner == null && this.live) {
          this.winner = p.id;
          this.finishT = 0;
          sfx.finish();
          this.excite = 2;
          this.fx.confetti(new THREE.Vector3(LEN + 1, 3, 0), { n: 80, spread: 2 });
        }
      }
      // pose
      const f = p.fig;
      if (p.stun > 0) f.pose = 'flat';
      else if (f.pose === 'flat') { f.pose = 'auto'; f.dizzy = 0.6; }
      else if (this.state === 'countdown') f.pose = 'crouch';
      else if (!p.ground) f.pose = 'air';
      else if (p.duck) f.pose = 'limbo';
      else if (f.pose === 'air' || f.pose === 'limbo' || f.pose === 'crouch') f.pose = 'auto';
      f.speed = p.v;
      if (this.state !== 'over') f.face(Math.PI / 2);
    }
    if (this.winner != null && this.live) {
      this.finishT += dt;
      const other = this.players[1 - this.winner];
      if (this.finishT > 1.2 || other.finished) this.endRound(this.winner, `${this.name(this.winner)} TAKES THE HEAT!`);
    }
    if (this.live) this.ui.hudTrack(this.players[0].pos.x / LEN, this.players[1].pos.x / LEN);
  }

  animate(dt) {
    const t = this.app.time;
    this.excite = Math.max(0.15, this.excite - dt * 0.6);
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
    const [a, b] = this.players;
    if (this.winnerCam(instant)) return;
    const mid = (a.pos.x + b.pos.x) / 2, spread = Math.abs(a.pos.x - b.pos.x);
    const D = clamp(9.5 + spread * 0.5, 9.5, 21);
    // touch: runners nearer the middle, clear of the pads in the bottom corners
    const ahead = this.input.mode === 'touch' ? 0.9 : 2.2;
    const look = new THREE.Vector3(mid + ahead, 0.9, -0.8);
    this.rig.to(new THREE.Vector3(mid + ahead - 0.8, 2.6 + D * 0.2, D), look, instant);
    this.lights.follow(new THREE.Vector3(mid + 3, 0, 0));
  }

  previewPose() {
    const [a, b] = this.players;
    const o = this.obstacles[0];
    a.pos.set(o.x - 0.1, 0.62, LANE[0]); a.fig.pose = 'air'; a.fig.face(Math.PI / 2, true);
    b.pos.set(o.x - 2.4, 0, LANE[1]); b.fig.speed = 9; b.fig.face(Math.PI / 2, true);
    this.lights.follow(new THREE.Vector3(o.x, 0, 0));
    this.rig.to(new THREE.Vector3(o.x - 0.6, 2.4, 6.8), new THREE.Vector3(o.x - 0.8, 0.7, 0), true);
  }
}
