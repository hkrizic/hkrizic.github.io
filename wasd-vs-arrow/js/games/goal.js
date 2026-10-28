// GOAL RUSH — top-down mini soccer with a giant beach ball. Bump it into the rival's goal; double-tap for a power kick.
import * as THREE from 'three';
import { BaseGame } from './base.js';
import { studio, vinyl, matte, mesh, rbox, sharedGeo, canvasTexture, TEAM, PAL, FONT, SCRIPT } from '../engine.js';
import { sfx } from '../audio.js';
import { rand, pick, clamp, tween, ease } from '../util.js';

const W = 16, D = 10, MOUTH = 1.6, DEPTH = 1.1, BR = 0.42, PR = 0.5, POST = 0.08, BAR_H = 1.35;

export class GoalRush extends BaseGame {
  static meta = {
    touch: { stick: 'Run & dribble', button: ['KICK', 'dash', 'Power kick where you run'] },
    id: 'goal', title: 'Goal Rush', icon: '⚽', color: '#7ED6A5', ink: '#123D27', rounds: 3, quick: true, figScale: 1.3, hud: ['scores'],
    tagline: 'Mini soccer with a giant beach ball. First to 3 goals!',
    goal: 'Run into the ball to dribble it toward your rival’s goal. Double-tap a direction for a power kick. First to 3 goals wins!',
    touchGoal: 'Run into the ball to dribble it toward your rival’s goal. Tap KICK for a power shot. First to 3 goals wins!',
    controls: [['move', 'Run & dribble'], ['tap2', 'Double-tap = power kick']],
  };

  build() {
    this.lights = studio(this.scene, this.app.engine, { sky: ['#BFE6FF', '#E4F4FF', '#F4FBEA'], fog: '#EAF6EC', fogNear: 30, fogFar: 75, shadow: 11, sun: [4, 16, 9] });
    // surroundings
    const ground = mesh(new THREE.CircleGeometry(70, 64), vinyl('#CFEBC0', { rough: 0.9, coat: 0 }), { cast: false });
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02;
    this.scene.add(ground);
    // the pitch: mowed stripes + chalk lines
    const grassTex = canvasTexture(512, 64, (g, w, h) => {
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#86CF6E' : '#97D97E'; g.fillRect((i * w) / 8, 0, w / 8 + 1, h); }
    });
    const pitch = mesh(new THREE.PlaneGeometry(W + 1.2, D + 1.2), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.85 }), { cast: false });
    pitch.rotation.x = -Math.PI / 2;
    this.scene.add(pitch);
    const chalk = vinyl('#FFFFFF', { rough: 0.6, coat: 0 });
    const line = (w, d, x, z) => { const l = mesh(new THREE.BoxGeometry(w, 0.02, d), chalk, { cast: false }); l.position.set(x, 0.012, z); this.scene.add(l); };
    line(W, 0.08, 0, -D / 2); line(W, 0.08, 0, D / 2); line(0.08, D, -W / 2, 0); line(0.08, D, W / 2, 0); line(0.08, D, 0, 0);
    for (const s of [-1, 1]) { line(2.4, 0.08, s * (W / 2 - 1.2), -2.6); line(2.4, 0.08, s * (W / 2 - 1.2), 2.6); line(0.08, 5.2, s * (W / 2 - 2.4), 0); }
    const circle = mesh(new THREE.RingGeometry(1.72, 1.8, 64), chalk, { cast: false });
    circle.rotation.x = -Math.PI / 2; circle.position.y = 0.013;
    const spot = mesh(new THREE.CircleGeometry(0.12, 20), chalk, { cast: false });
    spot.rotation.x = -Math.PI / 2; spot.position.y = 0.014;
    this.scene.add(circle, spot);
    // rails around everything except the goal mouths
    const railMat = vinyl('#FFFFFF', { rough: 0.25, coat: 0.8 }), capMat = vinyl(PAL.lilac, { rough: 0.3, coat: 0.7 });
    const rail = (w, d, x, z) => {
      const r = mesh(rbox(w, 0.42, d, 0.16, 3), railMat); r.position.set(x, 0.21, z);
      const c = mesh(rbox(w + 0.03, 0.1, d + 0.03, 0.05, 2), capMat); c.position.set(x, 0.44, z);
      this.scene.add(r, c);
    };
    rail(W + 0.8, 0.34, 0, -(D / 2 + 0.2)); rail(W + 0.8, 0.34, 0, D / 2 + 0.2);
    const sideLen = D / 2 - MOUTH - 0.05;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) rail(0.34, sideLen, sx * (W / 2 + 0.2), sz * (MOUTH + 0.05 + sideLen / 2));
    // corner flags
    for (const [x, z, c] of [[-1, -1, PAL.mustard], [1, -1, PAL.lilac], [-1, 1, PAL.lilac], [1, 1, PAL.mustard]]) {
      const pole = mesh(sharedGeo('flagpole', () => new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8)), vinyl('#FFFFFF'));
      pole.position.set(x * (W / 2 - 0.15), 0.6, z * (D / 2 - 0.15));
      const flag = mesh(sharedGeo('cflag', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.42, -0.14); s.lineTo(0, -0.28); s.closePath(); return new THREE.ShapeGeometry(s); }), vinyl(c, { side: THREE.DoubleSide, rough: 0.4 }));
      flag.position.set(x * (W / 2 - 0.15), 1.18, z * (D / 2 - 0.15));
      flag.rotation.y = x > 0 ? Math.PI : 0;
      this.scene.add(pole, flag);
    }
    // goals with nets
    const netTex = canvasTexture(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 7;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); }
    });
    netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
    netTex.repeat.set(6, 2.4);
    const netMat = new THREE.MeshStandardMaterial({ map: netTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6 });
    const frame = vinyl('#FFFFFF', { rough: 0.2, coat: 0.9 });
    this.nets = [];
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      for (const z of [-MOUTH, MOUTH]) {
        const post = mesh(sharedGeo('gpost', () => new THREE.CylinderGeometry(POST, POST, BAR_H, 14)), frame);
        post.position.set(0, BAR_H / 2, z);
        const back = mesh(sharedGeo('gback', () => new THREE.CylinderGeometry(0.05, 0.05, 0.9, 10)), frame);
        back.position.set(s * DEPTH, 0.45, z);
        g.add(post, back);
      }
      const bar = mesh(sharedGeo('gbar', () => new THREE.CylinderGeometry(POST, POST, MOUTH * 2 + POST * 2, 14)), frame);
      bar.rotation.x = Math.PI / 2; bar.position.set(0, BAR_H, 0);
      g.add(bar);
      // the net: back wall + roof + sides; the back panel bulges on a goal
      const net = new THREE.Group();
      const backNet = new THREE.Mesh(new THREE.PlaneGeometry(MOUTH * 2, 0.9), netMat);
      backNet.rotation.y = Math.PI / 2; backNet.position.set(s * DEPTH, 0.45, 0);
      const roofLen = Math.hypot(DEPTH, BAR_H - 0.9);
      const roof = new THREE.Mesh(new THREE.PlaneGeometry(roofLen, MOUTH * 2), netMat);
      roof.rotation.x = -Math.PI / 2;
      const roofPivot = new THREE.Group(); // slopes down from the crossbar to the back bar
      roofPivot.rotation.z = -s * Math.atan2(BAR_H - 0.9, DEPTH);
      roofPivot.position.set(s * DEPTH / 2, (BAR_H + 0.9) / 2, 0);
      roofPivot.add(roof);
      net.add(backNet, roofPivot);
      for (const z of [-MOUTH, MOUTH]) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(s * DEPTH, 0); shape.lineTo(s * DEPTH, 0.9); shape.lineTo(0, BAR_H); shape.closePath();
        const side = new THREE.Mesh(new THREE.ShapeGeometry(shape), netMat);
        side.position.z = z;
        net.add(side);
      }
      g.add(net);
      g.position.x = s * W / 2;
      this.scene.add(g);
      this.nets.push(net); // [0] = left goal (P2 scores here), [1] = right goal
    }
    // ad boards + a little crowd along the far side
    const ads = [['GOAL RUSH', PAL.mustard], ['WASD vs ARROW', PAL.lilac], ['KICK IT!', PAL.pink], ['GOAL RUSH', PAL.mint]];
    ads.forEach(([txt, c], i) => {
      const t = canvasTexture(512, 96, (g, w, h) => {
        g.fillStyle = c; g.fillRect(0, 0, w, h);
        g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
        if (txt === 'WASD vs ARROW') {
          g.font = `800 54px ${FONT}`; g.fillText('WASD', 125, h / 2 + 4); g.fillText('ARROW', 385, h / 2 + 4);
          g.fillStyle = PAL.ink; g.font = `48px ${SCRIPT}`; g.fillText('vs', 254, h / 2);
        } else { g.font = `800 60px ${FONT}`; g.fillText(txt, w / 2, h / 2 + 4); }
      });
      const board = mesh(new THREE.BoxGeometry(4.3, 0.75, 0.12), [matte(c), matte(c), matte(c), matte(c), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }), matte(c)]);
      board.position.set(-6.6 + i * 4.4, 0.4, -(D / 2 + 1.0));
      this.scene.add(board);
    });
    const bench = mesh(new THREE.BoxGeometry(W + 6, 0.6, 1.4), vinyl('#FFFFFF', { rough: 0.4, coat: 0.3 }));
    bench.position.set(0, 0.3, -(D / 2 + 2.3));
    const bench2 = mesh(new THREE.BoxGeometry(W + 6, 1.2, 1.2), vinyl('#E4EBF7', { rough: 0.4, coat: 0.3 }));
    bench2.position.set(0, 0.6, -(D / 2 + 3.5));
    this.scene.add(bench, bench2);
    const COUNT = 2 * 30;
    this.crowdBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.22, 4, 10), new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6 }), COUNT);
    this.crowdHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6 }), COUNT);
    this.crowd = [];
    const skins = ['#FBE3D1', '#EFC19E', '#C68A62', '#8A5536', '#F6D5BC'];
    for (let i = 0; i < COUNT; i++) {
      const row = i % 2, col = Math.floor(i / 2);
      this.crowd.push({ x: -(W / 2 + 2.6) + col * ((W + 5.2) / 30) + rand(-0.15, 0.15), y: 0.6 + row * 0.6, z: -(D / 2 + 2.3) - row * 1.2, ph: rand(0, 6), amp: rand(0.05, 0.12) });
      this.crowdBody.setColorAt(i, new THREE.Color(pick([PAL.coral, PAL.teal, PAL.mustard, PAL.lilac, PAL.pink, PAL.mint, '#FFFFFF', PAL.ink])));
      this.crowdHead.setColorAt(i, new THREE.Color(pick(skins)));
    }
    this.crowdBody.castShadow = this.crowdHead.castShadow = true;
    this.crowdBody.frustumCulled = this.crowdHead.frustumCulled = false;
    this.scene.add(this.crowdBody, this.crowdHead);
    this.excite = 0.2;
    this.m4 = new THREE.Matrix4();

    // the beach ball
    const ballTex = canvasTexture(512, 256, (g, w, h) => {
      const cols = [PAL.mustard, '#FFFFFF', PAL.lilac, '#FFFFFF', PAL.pink, '#FFFFFF'];
      cols.forEach((c, i) => { g.fillStyle = c; g.fillRect((i * w) / 6, 0, w / 6 + 1, h); });
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h * 0.1); g.fillRect(0, h * 0.9, w, h * 0.1);
    });
    this.ball = mesh(new THREE.SphereGeometry(BR, 36, 24), new THREE.MeshPhysicalMaterial({ map: ballTex, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }));
    this.scene.add(this.ball);
    this.ballShadow = new THREE.Mesh(sharedGeo('ballShadow', () => new THREE.CircleGeometry(BR, 28)), new THREE.MeshBasicMaterial({ color: '#1F3A1A', transparent: true, opacity: 0.22, depthWrite: false }));
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.ballShadow.position.y = 0.02;
    this.scene.add(this.ballShadow);
    this.b = { x: 0, z: 0, h: 0, vx: 0, vz: 0, vh: 0, stuck: 0 };
    this.kickCd = 0;
    this.q = new THREE.Quaternion();
    this.axis = new THREE.Vector3();
  }

  resetRound() {
    Object.assign(this.b, { x: 0, z: 0, h: 0, vx: 0, vz: 0, vh: 0, stuck: 0 });
    this.ball.quaternion.identity();
    this.placeBall();
    this.scored = false;
    for (const n of this.nets) { n.position.x = 0; n.scale.set(1, 1, 1); }
    this.players.forEach((p, i) => {
      p.pos.set(i ? 4 : -4, 0, 0);
      p.vel.set(0, 0, 0);
      p.stun = 0; p.dashCd = 0; p.dashT = 0;
      p.fig.pose = 'auto';
      p.fig.speed = 0;
      p.fig.face(i ? -Math.PI / 2 : Math.PI / 2, true);
    });
  }
  onCountdown() { if (!this.preview) this.ui.hudScores(this.wins[0], this.wins[1]); }

  placeBall() {
    const b = this.b;
    this.ball.position.set(b.x, BR + b.h, b.z);
    this.ballShadow.position.set(b.x, 0.02, b.z);
    const s = 1 / (1 + b.h * 0.6);
    this.ballShadow.scale.setScalar(s);
    this.ballShadow.material.opacity = 0.22 * s;
  }

  tick(dt) {
    const hx = W / 2 - 0.3, hz = D / 2 - 0.3;
    for (const p of this.players) {
      this.timers(p, dt);
      this.tryDash(p, { power: 11, cd: 1.1 });
      this.moveTopDown(p, dt, { accel: 34, max: 5.4, drag: 8, grip: 4 });
      if (Math.abs(p.pos.x) > hx) { p.pos.x = Math.sign(p.pos.x) * hx; p.vel.x *= -0.3; }
      if (Math.abs(p.pos.z) > hz) { p.pos.z = Math.sign(p.pos.z) * hz; p.vel.z *= -0.3; }
    }
    this.bump(this.players[0], this.players[1], { radius: PR, e: 0.6, kick: 1.2 });
    this.kickCd = Math.max(0, this.kickCd - dt);
    this.stepBall(dt);
  }

  stepBall(dt) {
    const b = this.b;
    // players touch the ball (only while it's low)
    for (const p of this.players) {
      const dx = b.x - p.pos.x, dz = b.z - p.pos.z, d = Math.hypot(dx, dz), min = PR + BR;
      if (d >= min || b.h > 0.9) continue;
      const nx = d > 1e-4 ? dx / d : (p.id ? -1 : 1), nz = d > 1e-4 ? dz / d : 0;
      // the ball is solid: it mostly gets shoved, but a pinned ball also holds the player back
      const over = min - d;
      b.x += nx * over * 0.75; b.z += nz * over * 0.75;
      p.pos.x -= nx * over * 0.25; p.pos.z -= nz * over * 0.25;
      const bv = b.vx * nx + b.vz * nz;
      const pv = p.vel.x * nx + p.vel.z * nz;
      if (p.dashT > 0 && this.live) {
        // power kick: mostly along the dash, a little along the contact
        const ps = Math.hypot(p.vel.x, p.vel.z) || 1;
        let kx = nx * 0.4 + (p.vel.x / ps) * 0.6, kz = nz * 0.4 + (p.vel.z / ps) * 0.6;
        const kl = Math.hypot(kx, kz) || 1; kx /= kl; kz /= kl;
        if (b.vx * kx + b.vz * kz < 13) {
          b.vx = kx * 14; b.vz = kz * 14; b.vh = 3.2;
          p.dashT = 0;
          sfx.kick(1);
          this.rig.shake(0.18, 0.2);
          this.fx.shockwave(new THREE.Vector3(b.x, 0.05, b.z), '#FFFFFF', { size: 1.6 });
          this.fx.burst(new THREE.Vector3(b.x, 0.3, b.z), '#B9E8A5', { n: 8, speed: 3, up: 3, size: 0.06 });
          this.excite = Math.max(this.excite, 0.8);
        }
      } else {
        const target = Math.max(0, pv) * 1.3 + 1.2;
        if (bv < target) {
          b.vx += nx * (target - bv); b.vz += nz * (target - bv);
          if (target - bv > 2.5 && this.kickCd <= 0) { sfx.kick(Math.min(1, (target - bv) / 9)); this.kickCd = 0.15; }
        }
      }
    }
    // flight + rolling friction
    if (b.h > 0 || b.vh > 0) {
      b.vh -= 20 * dt;
      b.h += b.vh * dt;
      if (b.h <= 0) { b.h = 0; b.vh = Math.abs(b.vh) > 2 ? -b.vh * 0.45 : 0; if (b.vh) sfx.thud(); }
    }
    const k = Math.exp(-(b.h > 0 ? 0.15 : 0.75) * dt);
    b.vx *= k; b.vz *= k;
    const sp = Math.hypot(b.vx, b.vz);
    if (sp > 16) { b.vx *= 16 / sp; b.vz *= 16 / sp; }
    const ox = b.x, oz = b.z;
    b.x += b.vx * dt; b.z += b.vz * dt;
    // walls, posts and goal boxes
    const inMouth = Math.abs(b.z) < MOUTH - BR * 0.3;
    if (Math.abs(b.x) <= W / 2) {
      if (Math.abs(b.z) > D / 2 - BR) { b.z = Math.sign(b.z) * (D / 2 - BR); b.vz = -b.vz * 0.75; this.wallHit(Math.abs(b.vz)); }
      if (!inMouth && Math.abs(b.x) > W / 2 - BR) { b.x = Math.sign(b.x) * (W / 2 - BR); b.vx = -b.vx * 0.75; this.wallHit(Math.abs(b.vx)); }
    } else {
      // inside a goal box: side nets + back net soak up the ball
      if (Math.abs(b.z) > MOUTH - BR) { b.z = Math.sign(b.z) * (MOUTH - BR); b.vz = -b.vz * 0.3; }
      if (Math.abs(b.x) > W / 2 + DEPTH - BR) { b.x = Math.sign(b.x) * (W / 2 + DEPTH - BR); b.vx = -b.vx * 0.2; b.vz *= 0.5; }
      if (Math.abs(ox) <= W / 2 && !inMouth) { b.x = Math.sign(b.x) * (W / 2 - BR); b.vx = -b.vx * 0.75; }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = sx * W / 2, pz = sz * MOUTH;
      const dx = b.x - px, dz = b.z - pz, d = Math.hypot(dx, dz), min = BR + POST;
      if (d < min && d > 1e-4 && b.h < BAR_H) {
        const nx = dx / d, nz = dz / d;
        b.x = px + nx * min; b.z = pz + nz * min;
        const vn = b.vx * nx + b.vz * nz;
        if (vn < 0) { b.vx -= 1.7 * vn * nx; b.vz -= 1.7 * vn * nz; if (vn < -3) { sfx.bonk(); this.rig.shake(0.15, 0.2); } }
      }
    }
    // roll the ball by the distance it travelled
    const dist = Math.hypot(b.x - ox, b.z - oz);
    if (dist > 1e-5) {
      this.axis.set(b.z - oz, 0, -(b.x - ox)).normalize();
      this.q.setFromAxisAngle(this.axis, dist / BR);
      this.ball.quaternion.premultiply(this.q);
    }
    this.placeBall();
    // goal!
    if (this.live && !this.scored && Math.abs(b.x) > W / 2 + BR && Math.abs(b.z) < MOUTH) {
      this.scored = true;
      const scorer = b.x > 0 ? 0 : 1;
      const net = this.nets[b.x > 0 ? 1 : 0], s = b.x > 0 ? 1 : -1;
      tween(0.6, k2 => { const bulge = Math.sin(k2 * Math.PI) * (1 - k2 * 0.4); net.position.x = s * bulge * 0.35; net.scale.set(1, 1, 1 + bulge * 0.08); }, { ease: ease.linear });
      sfx.goal();
      this.excite = 2;
      this.rig.shake(0.3, 0.35);
      this.fx.confetti(new THREE.Vector3(s * (W / 2 + 0.4), 1.2, 0), { n: 70, spread: 1.2, colors: [TEAM[scorer].color, TEAM[scorer].light, '#FFFFFF', PAL.mustard] });
      this.endRound(scorer, 'GOAL!');
      this.ui.hudScores(this.wins[0], this.wins[1]);
    }
    // anti-stalemate: a ball parked against a wall or in a corner gets nudged back into play
    if (this.live) {
      const nearWall = Math.abs(b.z) > D / 2 - 1.1 || Math.abs(b.x) > W / 2 - 1.1;
      b.stuck = nearWall && Math.hypot(b.vx, b.vz) < 1.6 ? b.stuck + dt : 0;
      if (b.stuck > 4) {
        b.stuck = 0;
        const l = Math.hypot(b.x, b.z) || 1;
        b.vx = (-b.x / l) * 5.5; b.vz = (-b.z / l) * 5.5; b.vh = 4;
        sfx.pop();
        this.fx.puff(new THREE.Vector3(b.x, 0.1, b.z), { n: 6, size: 0.18 });
      }
    }
  }
  wallHit(v) { if (v > 4) sfx.thud(); }

  animate(dt) {
    const t = this.app.time;
    this.excite = Math.max(0.2, this.excite - dt * 0.6);
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
    const fx = clamp(this.b.x, -W / 2, W / 2) * 0.1;
    this.rig.to(new THREE.Vector3(fx, 15.6, 13.6), new THREE.Vector3(fx, -0.6, 1.25), instant);
  }

  previewPose() {
    const [a, b] = this.players;
    a.pos.set(3.4, 0, 0.9); a.fig.face(Math.PI / 2 + 0.3, true); a.fig.speed = 6; a.fig.push = 9;
    b.pos.set(6.4, 0, -0.6); b.fig.face(-Math.PI / 2 - 0.4, true); b.fig.pose = 'teeter';
    Object.assign(this.b, { x: 4.3, z: 0.6, h: 0.35 });
    this.placeBall();
    this.rig.to(new THREE.Vector3(4.6, 3.2, 5.6), new THREE.Vector3(5.0, 0.5, 0.3), true);
  }
}
