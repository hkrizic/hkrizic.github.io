// Shared game skeleton: two figures, round flow (countdown → play → round end → match end), top-down movement,
// double-tap dashes and figure-vs-figure bumps. Each minigame fills in build(), resetRound(), tick() and camera().
import * as THREE from 'three';
import { CameraRig, disposeTree, TEAM } from '../engine.js';
import { Figure } from '../figures.js';
import { FX } from '../fx.js';
import { sfx } from '../audio.js';

export class BaseGame {
  static meta = {};
  constructor(app, { preview = false, rounds = null } = {}) {
    this.app = app;
    this.preview = preview;
    this.meta = this.constructor.meta;
    this.rounds = rounds ?? this.meta.rounds ?? 3;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 400);
    this.rig = new CameraRig(this.camera);
    this.fx = new FX(this.scene);
    this.wins = [0, 0];
    this.round = 0;
    this.state = 'intro';
    this.roundTime = 0;
    this.lastWinner = null;
    this.players = [0, 1].map(id => this.makePlayer(id));
    this.players[0].other = this.players[1];
    this.players[1].other = this.players[0];
    this.build();
    this.resetRound();
    this.camera.aspect = app.engine.aspect;
    this.camera.updateProjectionMatrix();
    this.updateCamera(1, true);
    this.rig.update(1);
  }
  get input() { return this.app.input; }
  get ui() { return this.app.ui; }
  get live() { return this.state === 'play'; }
  makePlayer(id) {
    const fig = new Figure(this.app.looks[id]).setTeam(id);
    fig.root.scale.setScalar(this.meta.figScale ?? 1);
    fig.showBadge(!this.preview);
    this.scene.add(fig.root);
    return { id, fig, pos: fig.root.position, vel: new THREE.Vector3(), vy: 0, out: false, stun: 0, dashCd: 0, dashT: 0, speedMul: 1, boostT: 0 };
  }
  name(id) { return this.app.looks[id].name; }

  // ---------- flow ----------
  begin() { this.nextRound(); }
  nextRound() {
    this.round++;
    this.fx.clear();
    this.resetRound();
    this.roundTime = 0;
    this.state = 'countdown';
    this.input.clearDashes();
    const steps = [];
    let t = 0;
    if (this.meta.quick && this.round > 1) {
      // point-by-point games (goals, rallies, duels): a short READY…GO between points
      steps.push([0, this.isMatchPoint() ? 'MATCH POINT' : 'READY…', 'round'], [0.85, 'GO!', 'go']);
      this.cd = { t: 0, steps, end: 0.85 };
    } else {
      if (this.rounds > 1) { steps.push([t, this.round === 1 ? (this.meta.quick ? `FIRST TO ${this.rounds}` : 'ROUND 1') : this.isMatchPoint() ? 'MATCH POINT' : `ROUND ${this.round}`, 'round']); t += 1.0; }
      steps.push([t, '3', 'num'], [t + 0.7, '2', 'num'], [t + 1.4, '1', 'num'], [t + 2.1, 'GO!', 'go']);
      this.cd = { t: 0, steps, end: t + 2.1 };
    }
    for (const p of this.players) { p.fig.showBadge(true); }
    this.onCountdown?.();
  }
  isMatchPoint() { return this.wins.some(w => w === this.rounds - 1); }
  tickCountdown(dt) {
    const cd = this.cd;
    cd.t += dt;
    while (cd.steps.length && cd.steps[0][0] <= cd.t) {
      const [, text, kind] = cd.steps.shift();
      this.ui.big(text, kind);
      if (kind === 'num') sfx.beep();
      if (kind === 'go') sfx.go();
      if (kind === 'round') sfx.whistle();
    }
    if (cd.t >= cd.end) {
      this.state = 'play';
      this.badgeT = 1.6;
      this.onGo?.();
    }
  }
  // winner: player id, or null for a draw
  endRound(winner, msg = null) {
    if (this.state !== 'play') return;
    this.state = 'roundEnd';
    this.endT = 0;
    this.lastWinner = winner;
    if (winner != null) this.wins[winner]++;
    this.ui.hudWins(this.wins, this.rounds);
    this.matchOver = winner != null && this.wins[winner] >= this.rounds;
    if (winner == null) { this.ui.big(msg ?? 'DRAW!', 'draw'); sfx.draw(); }
    else {
      this.ui.big(msg ?? `${this.name(winner)} SCORES!`, `team${winner}`);
      sfx.score();
    }
    for (const p of this.players) {
      if (p.out || p.fig.pose === 'flat' || p.fig.pose === 'blasted') continue;
      p.fig.pose = winner == null ? 'auto' : p.id === winner ? 'celebrate' : 'sad';
      p.fig.armsUp = false;
    }
    this.endDelay = this.matchOver ? 1.8 : this.meta.quick ? 1.7 : 2.8;
  }
  finishMatch() {
    this.state = 'over';
    const w = this.lastWinner;
    const wp = this.players[w];
    this.overT = 0;
    for (const p of this.players) {
      p.fig.armsUp = false;
      p.fig.showBadge(false);
      if (!p.out) p.fig.pose = p.id === w ? 'dance' : 'sad';
    }
    if (wp && !wp.out) wp.fig.face(0);
    if (wp && !wp.out) this.fx.confetti(wp.pos.clone().setY(wp.pos.y + 2.5), { n: 90, spread: 1.6 });
    sfx.win();
    sfx.cheer();
    this.app.onMatchOver(w, this);
  }

  // ---------- per frame ----------
  update(dt) {
    if (this.state === 'countdown') this.tickCountdown(dt);
    if (this.state === 'play') this.roundTime += dt;
    if (this.state === 'play' || this.state === 'roundEnd' || this.state === 'over') this.tick(dt);
    if (this.state === 'roundEnd') {
      this.endT += dt;
      if (this.endT >= this.endDelay) this.matchOver ? this.finishMatch() : this.nextRound();
    }
    if (this.badgeT > 0) {
      this.badgeT -= dt;
      if (this.badgeT <= 0) for (const p of this.players) p.fig.showBadge(false);
    }
    this.animate?.(dt);
    for (const p of this.players) p.fig.update(dt);
    this.fx.update(dt);
    if (!this.preview) this.updateCamera(dt, false);
    this.rig.update(dt);
  }
  onInput(ev) {
    if (this.state === 'play' && ev.type === 'press') this.onPress?.(this.players[ev.player], ev.action);
  }

  // match over: the camera swings round to the winner, framed above the results card
  winnerCam(instant) {
    if (this.state !== 'over' || this.lastWinner == null) return false;
    const p = this.players[this.lastWinner];
    if (p.out) return false;
    const w = p.pos, s = this.meta.figScale ?? 1;
    this.rig.to(new THREE.Vector3(w.x, w.y + 1.9 * s, w.z + 5.0 * s), new THREE.Vector3(w.x, w.y - 0.15, w.z), instant);
    this.lights?.follow(w);
    return true;
  }

  // ---------- movement helpers ----------
  timers(p, dt) {
    p.stun = Math.max(0, p.stun - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.dashT = Math.max(0, p.dashT - dt);
    if (p.boostT > 0) { p.boostT -= dt; if (p.boostT <= 0) p.speedMul = 1; }
  }
  moveTopDown(p, dt, { accel = 32, max = 5, drag = 7, grip = 2.5 } = {}) {
    const raw = this.live && p.stun <= 0 ? this.input.dir(p.id) : { x: 0, z: 0 };
    // analog sticks: direction from the angle, top speed from how far it's pushed (keys are always full)
    const mag = Math.min(1, Math.hypot(raw.x, raw.z));
    const moving = mag > 0;
    const d = moving ? { x: raw.x / mag, z: raw.z / mag } : raw;
    const mx = max * p.speedMul * (moving ? 0.25 + 0.75 * mag : 1);
    const sp0 = Math.hypot(p.vel.x, p.vel.z);
    if (moving) {
      // turning grip: bleed sideways velocity so steering feels snappy but knockback still carries
      p.vel.x += d.x * accel * dt;
      p.vel.z += d.z * accel * dt;
      const along = p.vel.x * d.x + p.vel.z * d.z;
      const sx = p.vel.x - d.x * along, sz = p.vel.z - d.z * along;
      const k = 1 - Math.exp(-grip * dt);
      p.vel.x -= sx * k; p.vel.z -= sz * k;
      p.fig.face(Math.atan2(d.x, d.z));
    } else p.vel.multiplyScalar(Math.exp(-drag * dt));
    // running can't push you past max speed; extra speed from shoves and dashes bleeds off
    let sp = Math.hypot(p.vel.x, p.vel.z);
    const cap = Math.max(mx, sp0 * Math.exp(-4 * dt));
    if (sp > cap && p.dashT <= 0) {
      p.vel.x *= cap / sp; p.vel.z *= cap / sp;
      sp = cap;
    }
    p.pos.x += p.vel.x * dt;
    p.pos.z += p.vel.z * dt;
    p.fig.speed = Math.min(sp, mx * 1.3);
  }
  tryDash(p, { power = 10, cd = 1.3 } = {}) {
    if (!this.live) return false;
    const d = this.input.takeDash(p.id, p.fig.facing);
    if (!d || p.dashCd > 0 || p.stun > 0) return false;
    p.vel.x = d.x * power;
    p.vel.z = d.z * power;
    p.dashCd = cd;
    p.dashT = 0.24;
    p.fig.push = 0.3;
    p.fig.face(Math.atan2(d.x, d.z));
    sfx.dash();
    this.fx.puff(p.pos.clone().setY(0.1), { n: 5, size: 0.16, speed: 1.2 });
    return true;
  }
  // circle vs circle; returns the impact speed (0 if they weren't approaching)
  bump(a, b, { radius = 0.4, e = 0.9, kick = 1.5, dashMass = 1.7 } = {}) {
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
    const d = Math.hypot(dx, dz), min = radius * 2;
    if (d >= min || a.out || b.out) return 0;
    const nx = d > 1e-5 ? dx / d : 1, nz = d > 1e-5 ? dz / d : 0;
    const overlap = (min - d) / 2;
    a.pos.x -= nx * overlap; a.pos.z -= nz * overlap;
    b.pos.x += nx * overlap; b.pos.z += nz * overlap;
    const va = a.vel.x * nx + a.vel.z * nz, vb = b.vel.x * nx + b.vel.z * nz;
    const rel = va - vb;
    if (rel <= 0) return 0;
    const ma = a.dashT > 0 ? dashMass : 1, mb = b.dashT > 0 ? dashMass : 1;
    const j = ((1 + e) * rel) / (1 / ma + 1 / mb);
    const ka = kick * (mb / (ma + mb)) * 2, kb = kick * (ma / (ma + mb)) * 2;
    a.vel.x -= (j / ma + ka) * nx; a.vel.z -= (j / ma + ka) * nz;
    b.vel.x += (j / mb + kb) * nx; b.vel.z += (j / mb + kb) * nz;
    a.fig.push = b.fig.push = 0.25;
    const at = new THREE.Vector3((a.pos.x + b.pos.x) / 2, 0.6, (a.pos.z + b.pos.z) / 2);
    if (rel > 5.5) {
      sfx.bonk();
      this.fx.stars(at, 7);
      this.fx.shockwave(at.clone().setY(0.05), '#FFFFFF', { size: 2 });
      this.rig.shake(0.35, 0.35);
    } else if (rel > 1.5) {
      sfx.bump(Math.min(1, rel / 5));
      this.fx.burst(at, '#FFFFFF', { n: 5, speed: 2, up: 2, size: 0.06 });
    }
    return rel;
  }

  // ---------- teardown ----------
  dispose() {
    this.fx.clear();
    disposeTree(this.scene);
  }
}

// labels for the how-to card: which keys each control uses, per team
export function controlKeys(kind, team) {
  const k = TEAM[team].dirs;
  // toward/away: the key pointing at / away from the rival (P1 stands left, P2 right)
  const toward = team ? k.left : k.right, away = team ? k.right : k.left;
  return {
    move: [k.up, k.left, k.down, k.right], any: [k.up, k.left, k.down, k.right], tap2: [`${k.left}${k.left}`],
    lr: [k.left, k.right], ud: [k.up, k.down], up: [k.up], down: [k.down], left: [k.left], right: [k.right], toward: [toward], away: [away],
  }[kind];
}
