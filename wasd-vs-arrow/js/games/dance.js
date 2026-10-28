// DANCE DUEL — a rhythm battle on a light-up disco floor. Notes scroll up two highways (one per player); hit them on the
// beat. The game plays its own groove, driven by game time, so the chart and the music stay locked (and pause together).
import * as THREE from 'three';
import { BaseGame } from './base.js';
import { studio, vinyl, mesh, rbox, sharedGeo, canvasTexture, TEAM, PAL } from '../engine.js';
import { sfx, N, musicTone, musicNoise, music } from '../audio.js';
import { seeded, rand, clamp, injectCSS, el } from '../util.js';

const BPM = 120, BEAT = 60 / BPM, STEP = BEAT / 2;
const LANES = ['left', 'down', 'up', 'right'];
const GLYPH = { left: '←', down: '↓', up: '↑', right: '→' };
const LANE_COL = ['#A594F9', '#7ED6A5', '#FFC145', '#FF8FB1'];
const LEAD = 1.7;                          // seconds a note is on screen before it must be hit
const WIN = { perfect: 0.05, great: 0.11, miss: 0.17 };
const END_BEAT = 86;
const PROG = [[45, [57, 60, 64]], [41, [57, 60, 65]], [48, [55, 60, 64]], [43, [55, 59, 62]]]; // Am F C G
const S = 1.35;

const CSS = `
.dd-hw { position: absolute; top: 104px; bottom: 66px; width: min(250px, 21vw); border-radius: 28px; overflow: hidden;
  background: linear-gradient(rgba(35,43,69,.62), rgba(35,43,69,.38)); box-shadow: inset 0 0 0 4px var(--c), 0 20px 40px -16px rgba(35,43,69,.6);
  --c: var(--coral); transition: box-shadow .12s, opacity .4s; }
.dd-hw.t1 { --c: var(--teal); }
.dd-hw.t0 { left: 3vw; } .dd-hw.t1 { right: 3vw; }
.dd-hw.beat { box-shadow: inset 0 0 0 6px var(--c), 0 0 34px -4px var(--c); }
.dd-hw.done { opacity: 0; }
.dd-lane { position: absolute; top: 0; bottom: 0; width: 25%; border-right: 1px dashed rgba(255,255,255,.12); }
.dd-rec { position: absolute; top: 14px; left: 8%; width: 84%; aspect-ratio: 1; border-radius: 26%; display: grid; place-items: center;
  border: 3px solid rgba(255,255,255,.75); color: #fff; font: 800 clamp(16px, 1.6vw, 24px) var(--font); background: rgba(255,255,255,.08); transition: transform .08s, background .08s; }
.dd-rec.press { transform: scale(.88); background: rgba(255,255,255,.35); }
.dd-rec.hit { background: var(--lc); border-color: #fff; }
.dd-note { position: absolute; top: 14px; left: 8%; width: 84%; aspect-ratio: 1; border-radius: 26%; display: grid; place-items: center; will-change: transform;
  background: var(--lc); color: #fff; font: 800 clamp(18px, 1.8vw, 28px) var(--font); -webkit-text-stroke: 4px rgba(35,43,69,.55); paint-order: stroke fill;
  box-shadow: 0 5px 0 rgba(35,43,69,.35), inset 0 3px 0 rgba(255,255,255,.45); }
.dd-note.gone { animation: ddhit .22s ease-out forwards; }
.dd-note.missed { filter: grayscale(.8) brightness(.8); opacity: .5; }
@keyframes ddhit { to { transform: translateY(0) scale(1.5); opacity: 0; } }
.dd-judge { position: absolute; left: 0; right: 0; top: 34%; text-align: center; font: 800 32px var(--font); color: #fff; -webkit-text-stroke: 7px var(--ink); paint-order: stroke fill; opacity: 0; }
.dd-judge.on { animation: ddjudge .5s var(--bounce) forwards; }
.dd-judge.perfect { color: var(--mustard); } .dd-judge.great { color: #9EF0C4; } .dd-judge.miss { color: #C9CEDA; }
/* touch: the highway flips so notes fall onto a hit line right above each player's pads */
.dd-hw.touch { scale: 1 -1; width: 372px; top: 96px; bottom: calc(max(18px, env(safe-area-inset-bottom)) + 120px); }
.dd-hw.touch.t0 { left: max(20px, env(safe-area-inset-left)); }
.dd-hw.touch.t1 { right: max(20px, env(safe-area-inset-right)); }
.dd-hw.touch .dd-note, .dd-hw.touch .dd-rec, .dd-hw.touch .dd-judge, .dd-hw.touch .dd-combo { scale: 1 -1; }
@media (max-width: 1000px) { .dd-hw.touch { width: 305px; bottom: calc(max(18px, env(safe-area-inset-bottom)) + 100px); } }
/* facing each other: the highway lives in the player's turned strip, right above their pads */
.dd-hw.touch.facing.t0, .dd-hw.touch.facing.t1 { left: calc(50% - 171px); right: auto; width: 342px; top: 150px; bottom: 124px; }
@keyframes ddjudge { 0% { opacity: 0; transform: scale(.4); } 25% { opacity: 1; transform: scale(1.12); } 80% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: translateY(-14px); } }
.dd-combo { position: absolute; left: 0; right: 0; top: calc(34% + 44px); text-align: center; font: 800 18px var(--font); color: #fff; opacity: .9; }
.dd-combo b { font-size: 30px; display: block; line-height: 1; }
.dd-combo i { font-style: normal; color: var(--mustard); }
`;

export class DanceDuel extends BaseGame {
  static meta = {
    touch: { pads: { left: '◀', down: '▼', up: '▲', right: '▶' }, layout: 'row', tip: 'Tap the pad as its note hits the line' },
    id: 'dance', title: 'Dance Duel', icon: '🕺', color: '#C792EA', ink: '#3A1760', rounds: 1, hud: ['scores'], figScale: S,
    tagline: 'Hit the notes on the beat. Best groove wins!',
    goal: 'Notes scroll up your highway — press the matching key just as it reaches the top row. Perfect timing scores big, streaks multiply your points (×2 at 10, ×3 at 25). Random mashing breaks your streak!',
    touchGoal: 'Notes fall down your highway — tap the matching pad just as a note reaches the hit line above it. Perfect timing scores big, streaks multiply your points (×2 at 10, ×3 at 25). Random tapping breaks your streak!',
    controls: [['any', 'Hit the notes on the beat'], ['any', 'Streak 10 = ×2, 25 = ×3']],
  };

  build() {
    this.lights = studio(this.scene, this.app.engine, { sky: ['#9C86F2', '#D7BCFF', '#FFD9EC'], fog: '#EBD3FF', fogNear: 22, fogFar: 60, shadow: 7, sun: [3, 12, 9], sunI: 1.8, hemiI: 1.1 });
    this.lights.follow(new THREE.Vector3(0, 0, 0));
    // stage base + light-up floor (instanced tiles, colours pulse on the beat)
    const base = mesh(rbox(11.4, 0.5, 6.2, 0.22, 3), vinyl('#7C6BD6', { rough: 0.35, coat: 0.6 }));
    base.position.set(0, -0.26, 0.2);
    this.scene.add(base);
    const ground = mesh(new THREE.CircleGeometry(60, 48), vinyl('#E7D6FF', { rough: 0.9, coat: 0 }), { cast: false });
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5;
    this.scene.add(ground);
    this.COLS = 10; this.ROWS = 5;
    this.floor = new THREE.InstancedMesh(rbox(1.0, 0.1, 1.0, 0.08, 2), new THREE.MeshBasicMaterial(), this.COLS * this.ROWS);
    const m = new THREE.Matrix4();
    this.tileBase = [];
    for (let r = 0; r < this.ROWS; r++) for (let c = 0; c < this.COLS; c++) {
      const i = r * this.COLS + c;
      m.makeTranslation((c - (this.COLS - 1) / 2) * 1.08, -0.02, (r - (this.ROWS - 1) / 2) * 1.08 + 0.2);
      this.floor.setMatrixAt(i, m);
      this.tileBase.push(new THREE.Color([PAL.lilac, PAL.pink, PAL.mustard, PAL.mint, '#8EC9FF'][(c + r * 2) % 5]));
      this.floor.setColorAt(i, this.tileBase[i]);
    }
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    this.tmpC = new THREE.Color();
    this.dim = new THREE.Color('#5B4C93');
    // backdrop: rounded arch with marquee bulbs
    const back = mesh(rbox(12.5, 6.2, 0.5, 0.6, 4), vinyl('#B9A4FF', { rough: 0.45, coat: 0.3 }), { cast: false });
    back.position.set(0, 2.8, -3.3);
    this.scene.add(back);
    const arch = mesh(new THREE.TorusGeometry(3.6, 0.22, 16, 64, Math.PI), vinyl('#FFFFFF', { rough: 0.25, coat: 0.8 }), { cast: false });
    arch.position.set(0, 1.2, -2.95);
    this.scene.add(arch);
    this.bulbs = [];
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI;
      const b = new THREE.Mesh(sharedGeo('dd:bulb', () => new THREE.SphereGeometry(0.11, 12, 10)), new THREE.MeshBasicMaterial({ color: '#FFF3C4' }));
      b.position.set(Math.cos(a) * 3.6, 1.2 + Math.sin(a) * 3.6, -2.7);
      this.scene.add(b);
      this.bulbs.push(b);
    }
    const signTex = canvasTexture(512, 128, (g, w, h) => {
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 50); g.fill();
      g.fillStyle = '#3A1760'; g.font = '84px Pacifico, cursive'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Disco!', w / 2, h / 2 + 4);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
    sign.position.set(0, 2.25, -2.7);
    this.scene.add(sign);
    // speakers
    for (const sx of [-4.6, 4.6]) {
      const g = new THREE.Group();
      const box = mesh(rbox(1.3, 2.4, 1.0, 0.18, 3), vinyl('#3B3566', { rough: 0.4, coat: 0.5 }));
      box.position.y = 1.2;
      g.add(box);
      for (const [y, r] of [[1.75, 0.34], [0.82, 0.46]]) {
        const cone = mesh(new THREE.CylinderGeometry(r, r * 0.7, 0.12, 28), vinyl('#9C8CF0', { rough: 0.3, coat: 0.7 }));
        cone.rotation.x = Math.PI / 2;
        cone.position.set(0, y, 0.52);
        g.add(cone);
        (this.cones ||= []).push(cone);
      }
      g.position.set(sx, 0, -1.6);
      g.rotation.y = sx < 0 ? 0.35 : -0.35;
      this.scene.add(g);
    }
    // mirror ball
    const ballTex = canvasTexture(256, 128, (g, w, h) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
        const v = 170 + ((x * 37 + y * 91) % 70);
        g.fillStyle = `rgb(${v},${v},${v + 10})`;
        g.fillRect(x * 8, y * 8, 7, 7);
      }
    });
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 20), new THREE.MeshStandardMaterial({ map: ballTex, metalness: 0.9, roughness: 0.18 }));
    this.ball.position.set(0, 3.95, -0.8);
    const string = mesh(sharedGeo('dd:string', () => new THREE.CylinderGeometry(0.015, 0.015, 3, 6)), vinyl('#FFFFFF'), { cast: false });
    string.position.set(0, 5.95, -0.8);
    this.scene.add(this.ball, string);
    // sweeping spotlight beams (additive cones)
    this.beams = [];
    for (const [x, c] of [[-4.8, '#FFC9F0'], [4.8, '#C9F0FF'], [0, '#FFF1B8']]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 6.2, 1.2);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 6.5, 32, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      cone.position.y = -3.25;
      pivot.add(cone);
      this.scene.add(pivot);
      this.beams.push(pivot);
    }
    this.chart = this.makeChart(1234);
    this.song = 0;
  }

  // ---------- the chart: same for both players ----------
  makeChart(seed) {
    const r = seeded(seed), notes = [];
    let last = -1, last2 = -1;
    const lane = () => { let l; do l = Math.floor(r() * 4); while (l === last && l === last2); last2 = last; last = l; return l; };
    const add = (beat, l = lane()) => notes.push({ t: beat * BEAT, lane: l });
    const jump = beat => { const a = lane(); let c; do c = Math.floor(r() * 4); while (c === a); add(beat, a); add(beat, c); };
    for (let b = 4; b < 20; b++) add(b);
    for (let b = 20; b < 36; b++) { add(b); if (r() < 0.45) add(b + 0.5); }
    for (let b = 36; b < 44; b += 0.5) add(b);                                  // burst
    for (let b = 44; b < 52; b++) b % 2 === 0 ? jump(b) : add(b);                // jumps
    for (let b = 52; b < 68; b += 2) {                                            // staircases
      const up = r() < 0.5, o = Math.floor(r() * 4);
      for (let k = 0; k < 4; k++) add(b + k * 0.5, (o + (up ? k : 4 - k)) % 4);
    }
    for (let b = 68; b < 76; b += 0.5) add(b);                                  // second burst
    for (let b = 76; b < 84; b++) b % 2 === 0 ? jump(b) : add(b);
    notes.push({ t: 84 * BEAT, lane: 0 }, { t: 84 * BEAT, lane: 3 });            // big finish
    notes.sort((a, b) => a.t - b.t);
    this.songEnd = END_BEAT * BEAT;
    return notes;
  }

  resetRound() {
    this.song = 0;
    this.nextStep = 0;
    this.lastBeat = -1;
    this.chart = this.makeChart(1234 + this.round * 7);
    this.players.forEach((p, i) => {
      p.pos.set(i ? 1.45 : -1.45, 0.05, 0.7);
      p.fig.face(i ? -0.2 : 0.2, true);
      p.fig.pose = 'auto';
      p.fig.custom = null;
      p.fig.dizzy = 0;
      p.poseT = 0;
      p.dd = { notes: this.chart.map(n => ({ ...n, judged: null, el: null })), first: 0, score: 0, combo: 0, best: 0 };
    });
    if (this.dom) this.resetDom();
  }

  // keyboard: each player's own keys; touch: arrows that match the pads
  glyph(p, dir) { return this.input.mode === 'touch' ? GLYPH[dir] : TEAM[p.id].dirs[dir]; }

  // ---------- DOM highways ----------
  ensureDom() {
    if (this.dom || this.preview) return;
    injectCSS('dd-css', CSS);
    this.dom = this.players.map(p => {
      const hw = el('div', `dd-hw t${p.id}${this.input.mode === 'touch' ? ' touch' : ''}`);
      const lanes = LANES.map((dir, k) => {
        const lane = el('div', 'dd-lane');
        lane.style.left = `${k * 25}%`;
        lane.style.setProperty('--lc', LANE_COL[k]);
        const rec = el('div', 'dd-rec', this.glyph(p, dir));
        lane.append(rec);
        hw.append(lane);
        return { lane, rec };
      });
      const judge = el('div', 'dd-judge'), combo = el('div', 'dd-combo');
      hw.append(judge, combo);
      this.ui.layer.append(hw);
      return { hw, lanes, judge, combo };
    });
  }
  resetDom() {
    for (const d of this.dom) {
      d.hw.classList.remove('done');
      d.hw.querySelectorAll('.dd-note').forEach(n => n.remove());
      d.combo.innerHTML = '';
    }
  }
  noteEl(p, n) {
    const e = el('div', 'dd-note', this.glyph(p, LANES[n.lane]));
    e.style.setProperty('--lc', LANE_COL[n.lane]);
    this.dom[p.id].lanes[n.lane].lane.append(e);
    return e;
  }
  judge(p, kind) {
    if (!this.dom) return;
    const d = this.dom[p.id];
    d.judge.className = 'dd-judge';
    void d.judge.offsetWidth;
    d.judge.className = `dd-judge on ${kind}`;
    d.judge.textContent = { perfect: 'PERFECT!', great: 'GREAT', miss: 'MISS' }[kind];
    const s = p.dd, mult = this.mult(s.combo);
    d.combo.innerHTML = s.combo >= 3 ? `<b>${s.combo}</b>STREAK${mult > 1 ? ` <i>×${mult}</i>` : ''}` : '';
  }
  mult(c) { return c >= 25 ? 3 : c >= 10 ? 2 : 1; }

  // ---------- play ----------
  // touch + facing each other: each highway moves into its player's turned control strip; otherwise the overlay
  onTouchLayout() {
    if (!this.dom) return;
    const facing = this.input.mode === 'touch' && this.app.touch.facing;
    for (const d of this.dom) {
      const t = d.hw.classList.contains('t1') ? 1 : 0;
      d.hw.classList.toggle('facing', facing);
      (facing ? this.app.touch.sides[t] : this.ui.layer).append(d.hw);
    }
  }
  onCountdown() {
    this.ensureDom();
    this.onTouchLayout();
    this.ui.hudScores(0, 0);
    music.setMuted(true);
  }

  onPress(p, action) {
    const lane = LANES.indexOf(action), s = p.dd, t = this.song;
    if (this.dom) {
      const rec = this.dom[p.id].lanes[lane].rec;
      rec.classList.add('press');
      setTimeout(() => rec.classList.remove('press'), 90);
    }
    let best = null, bd = 9;
    for (let i = s.first; i < s.notes.length; i++) {
      const n = s.notes[i];
      if (n.t - t > WIN.miss) break;
      if (n.judged || n.lane !== lane) continue;
      const d = Math.abs(n.t - t);
      if (d < bd) { bd = d; best = n; }
    }
    if (!best || bd > WIN.great) {
      // a press with nothing to hit (or way off) costs your streak
      if (best && bd <= WIN.miss) { best.judged = 'miss'; best.el?.classList.add('missed'); }
      if (s.combo > 0 || best) this.miss(p);
      return;
    }
    const kind = bd <= WIN.perfect ? 'perfect' : 'great';
    best.judged = kind;
    s.score += (kind === 'perfect' ? 300 : 120) * this.mult(s.combo);
    s.combo++;
    s.best = Math.max(s.best, s.combo);
    if (best.el) { best.el.style.transform = 'translateY(0)'; best.el.classList.add('gone'); const e = best.el; setTimeout(() => e.remove(), 240); best.el = null; }
    if (this.dom) {
      const rec = this.dom[p.id].lanes[lane].rec;
      rec.classList.add('hit');
      setTimeout(() => rec.classList.remove('hit'), 140);
    }
    this.judge(p, kind);
    this.ui.hudScores(this.players[0].dd.score, this.players[1].dd.score);
    this.hitPose(p, lane);
    if (s.combo === 10 || s.combo === 25) { sfx.chime(); this.ui.toast(`${this.name(p.id)}: ×${this.mult(s.combo)} STREAK!`, `team${p.id}`); }
    if (s.combo > 0 && s.combo % 25 === 0) this.fx.confetti(p.pos.clone().setY(2.6), { n: 30, spread: 0.6, up: 4 });
  }
  miss(p) {
    const s = p.dd;
    s.combo = 0;
    this.judge(p, 'miss');
    p.fig.custom = null;
    p.fig.dizzy = 0.35;
    p.poseT = 0;
  }
  hitPose(p, lane) {
    // facing the camera, the figure's right arm is on screen-left
    const f = p.fig;
    f.custom = [
      { ra: -0.2, raZ: -1.55, la: 0.15, laZ: -0.1, sway: 0.12, headY: -0.35 },   // ←
      { lean: 0.42, ll: -0.55, rl: 0.45, la: 0.55, ra: 0.55, laZ: 0.2, raZ: -0.2, y: -0.07, headX: 0.2 }, // ↓
      { la: -2.7, ra: -2.7, laZ: 0.8, raZ: -0.8, y: 0.12, headX: -0.15 },        // ↑
      { la: -0.2, laZ: 1.55, ra: 0.15, raZ: 0.1, sway: -0.12, headY: 0.35 },      // →
    ][lane];
    p.poseT = 0.24;
  }

  // the groove: four-on-the-floor, hats on the off-beats, octave bass, stabs, and a lead in the busy sections
  playStep(i, at) {
    const beat = i / 2, bar = Math.floor(beat / 4) % 4, onBeat = i % 2 === 0;
    const [root, chord] = PROG[bar];
    const o = { at };
    if (beat >= END_BEAT) {
      if (beat === END_BEAT) { musicTone(N(root), { ...o, dur: 1.2, vol: 0.3, type: 'triangle' }); chord.forEach(n => musicTone(N(n + 12), { ...o, dur: 1.4, vol: 0.06, type: 'square' })); }
      return;
    }
    if (onBeat) musicTone(150, { ...o, dur: 0.16, slide: -100, vol: 0.5 });
    else musicNoise({ ...o, dur: 0.07, vol: 0.09, from: 7000, to: 9000, q: 1, type: 'highpass' });
    if (onBeat && (beat % 4 === 1 || beat % 4 === 3)) musicNoise({ ...o, dur: 0.16, vol: 0.16, from: 1900, to: 900, q: 0.7 });
    musicTone(N(root + (i % 2 ? 12 : 0)), { ...o, dur: STEP * 0.9, vol: 0.24, type: 'triangle' });
    if (!onBeat && beat % 2 === 1.5) chord.forEach(n => musicTone(N(n + 12), { ...o, dur: STEP * 0.8, vol: 0.045, type: 'square' }));
    if ((beat >= 36 && beat < 52) || beat >= 68) {
      const arp = [0, 1, 2, 1, 0, 2, 1, 2][i % 8];
      musicTone(N(chord[arp] + 24), { ...o, dur: 0.18, vol: 0.05, type: 'sine' });
    }
  }

  tick(dt) {
    if (this.live) {
      this.song += dt;
      while (this.nextStep * STEP < this.song + 0.1) { this.playStep(this.nextStep, Math.max(0, this.nextStep * STEP - this.song)); this.nextStep++; }
      // notes that slid past the window are misses
      for (const p of this.players) {
        const s = p.dd;
        while (s.first < s.notes.length) {
          const n = s.notes[s.first];
          if (n.judged) { s.first++; continue; }
          if (this.song - n.t > WIN.great) { n.judged = 'miss'; n.el?.classList.add('missed'); this.miss(p); s.first++; continue; }
          break;
        }
      }
      if (this.song > this.songEnd) {
        const [a, b] = this.players.map(p => p.dd.score);
        if (this.dom) this.dom.forEach(d => d.hw.classList.add('done'));
        if (a === b) this.endRound(null, 'TIE! DANCE AGAIN');
        else this.endRound(a > b ? 0 : 1, `${this.name(a > b ? 0 : 1)} WINS ${Math.max(a, b)}!`);
      }
    }
    for (const p of this.players) {
      if (p.poseT > 0) { p.poseT -= dt; if (p.poseT <= 0) p.fig.custom = null; }
      if (this.state !== 'play') continue;
      if (p.poseT <= 0) {
        // bob along to the beat; a hot streak turns into real dancing
        if (p.dd.combo >= 10) { p.fig.pose = 'dance'; p.fig.custom = null; }
        else {
          p.fig.pose = 'auto';
          const ph = (this.song / BEAT) % 1;
          p.fig.custom = { y: Math.abs(Math.sin(ph * Math.PI)) * 0.05, headX: Math.sin(ph * Math.PI * 2) * 0.12, sway: Math.sin(this.song / BEAT * Math.PI) * 0.05 };
        }
      }
    }
  }

  animate(dt) {
    const t = this.app.time, song = this.song;
    const beatF = song / BEAT, beat = Math.floor(beatF), ph = beatF - beat;
    const playing = this.state === 'play';
    // light-up floor: a different pattern every bar
    const pat = Math.floor(beat / 4) % 4, flash = playing ? Math.pow(1 - ph, 2) : 0.35 + Math.sin(t * 2) * 0.15;
    for (let r = 0; r < this.ROWS; r++) for (let c = 0; c < this.COLS; c++) {
      const i = r * this.COLS + c;
      const on = pat === 0 ? (c + r + beat) % 2 === 0 : pat === 1 ? Math.abs(c - 4.5) <= (beat % 5) + 0.5 : pat === 2 ? (c + beat) % 3 === 0 : (r + beat) % 2 === 0;
      const k = on ? 0.45 + flash * 0.55 : 0.18;
      this.tmpC.copy(this.dim).lerp(this.tileBase[i], k);
      this.floor.setColorAt(i, this.tmpC);
    }
    this.floor.instanceColor.needsUpdate = true;
    // mirror ball, beams, bulbs, speaker thump
    this.ball.rotation.y += dt * 0.8;
    this.beams.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.9 + i * 2.1) * 0.55; b.rotation.x = Math.cos(t * 0.7 + i) * 0.25; });
    this.bulbs.forEach((b, i) => b.material.color.set((i + beat) % 3 === 0 ? '#FFF3C4' : '#FFB7E0'));
    for (const c of this.cones ?? []) c.scale.set(1 + (playing ? Math.pow(1 - ph, 4) * 0.12 : 0), 1, 1 + (playing ? Math.pow(1 - ph, 4) * 0.12 : 0));
    if (playing && beat !== this.lastBeat) {
      this.lastBeat = beat;
      if (beat % 2 === 0) this.fx.burst(this.ball.position.clone().add(new THREE.Vector3(rand(-0.5, 0.5), -0.3, 0.5)), '#FFFFFF', { n: 2, geo: 'star', size: 0.05, speed: 1.4, up: 0.5, life: 0.6, gravity: -2 });
      if (this.dom) for (const d of this.dom) { d.hw.classList.add('beat'); setTimeout(() => d.hw.classList.remove('beat'), 110); }
    }
    // scroll the notes
    if (this.dom) {
      for (const p of this.players) {
        const s = p.dd, d = this.dom[p.id];
        const H = d.hw.clientHeight - 40;
        for (let i = Math.max(0, s.first - 6); i < s.notes.length; i++) {
          const n = s.notes[i];
          const dtN = n.t - song;
          if (dtN > LEAD) break;
          if (n.judged && n.judged !== 'miss') continue;
          if (n.judged === 'miss' && dtN < -0.35) { if (n.el) { n.el.remove(); n.el = null; } continue; }
          if (!n.el && !n.gone) n.el = this.noteEl(p, n);
          if (n.el) n.el.style.transform = `translateY(${Math.round((dtN / LEAD) * H)}px)`;
          if (n.judged === 'miss' && dtN < -0.34) n.gone = true;
        }
      }
    }
  }

  updateCamera(dt, instant) {
    if (this.winnerCam(instant)) return;
    const ph = (this.song / BEAT) % 1, pulse = this.state === 'play' ? Math.pow(1 - ph, 3) * 0.12 : 0;
    this.rig.to(new THREE.Vector3(0, 2.2, 8.6 - pulse), new THREE.Vector3(0, 1.15, 0), instant);
  }

  previewPose() {
    const [a, b] = this.players;
    this.hitPose(a, 2);
    this.hitPose(b, 0);
    a.fig.face(0.25, true); b.fig.face(-0.25, true);
    this.song = 3 * BEAT;
    this.state = 'play';
    this.animate(0);
    this.state = 'intro';
    this.rig.to(new THREE.Vector3(0, 2.0, 6.4), new THREE.Vector3(0, 1.25, 0), true);
  }
}
