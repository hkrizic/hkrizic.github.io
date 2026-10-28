// QUICK DRAW — a sunset standoff on main street. Wait for the sign, then press the arrow it shows on your own keys.
// Too early, wrong key or fooled by a fake sign = locked out of that duel. Fastest cork wins the point.
import * as THREE from 'three';
import { BaseGame } from './base.js';
import { studio, vinyl, matte, mesh, rbox, sharedGeo, canvasTexture, TEAM, PAL, FONT } from '../engine.js';
import { sfx, tone, N } from '../audio.js';
import { rand, pick, tween, ease, injectCSS, el } from '../util.js';

const DIRS = ['up', 'left', 'down', 'right'];
const GLYPH = { up: '↑', left: '←', down: '↓', right: '→' };
const FAKES = ['🐔', '🌵', 'DRAW?', '🐴', '🍩'];
const X = 3.2, S = 1.3;

const CSS = `
.qd-sign { position: absolute; left: 50%; top: 13vh; width: 270px; height: 210px; margin-left: -135px; perspective: 700px; }
.qd-sign::before, .qd-sign::after { content: ''; position: absolute; top: -13vh; width: 4px; height: 13vh; background: #8A5A36; border-radius: 2px; }
.qd-sign::before { left: 46px; } .qd-sign::after { right: 46px; }
.qd-board {
  position: absolute; inset: 0; border-radius: 24px; display: grid; place-items: center; text-align: center;
  background: repeating-linear-gradient(0deg, #E8AE73 0 50px, #DFA266 50px 52px); border: 7px solid #B5763F;
  box-shadow: 0 8px 0 #96602F, 0 24px 40px -12px rgba(90, 42, 10, .55); color: #5A2A0A; font-family: var(--font);
  transform-origin: 50% 0; transition: transform .1s;
}
.qd-board.flip { animation: qdflip .32s var(--bounce); }
@keyframes qdflip { 0% { transform: rotateX(-80deg); } 100% { transform: rotateX(0); } }
.qd-board .wait { font-weight: 800; font-size: 25px; letter-spacing: .08em; line-height: 1.1; }
.qd-board .wait b { display: block; font-size: 56px; letter-spacing: .1em; animation: qdpulse 1s ease-in-out infinite; }
@keyframes qdpulse { 50% { opacity: .35; } }
.qd-board .arrow { width: 150px; height: 150px; border-radius: 50%; background: var(--mustard); display: grid; place-items: center;
  font-size: 118px; font-weight: 800; line-height: 1; color: #fff; -webkit-text-stroke: 9px var(--ink); paint-order: stroke fill;
  box-shadow: 0 6px 0 var(--mustard-d), inset 0 0 0 6px #fff; animation: pop .35s var(--bounce); }
.qd-board .keys { position: absolute; bottom: -26px; left: -14px; right: -14px; display: flex; justify-content: space-between; font-size: 30px; }
.qd-board .keys kbd { font-size: 1em; }
.qd-board .fake { font-size: 104px; line-height: 1; animation: qdshake .5s ease-in-out infinite; }
.qd-board .fake.word { font-size: 64px; font-weight: 800; }
@keyframes qdshake { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
.qd-board.bang { background: #FFF4D6; border-color: var(--mustard-d); }
.qd-board .bang { font-size: 70px; font-weight: 800; color: var(--ink); line-height: 1; animation: pop .3s var(--bounce); }
.qd-board .bang small { display: block; font-size: 22px; color: #8A5A36; margin-top: 6px; }
.qd-tag { position: absolute; transform: translate(-50%, -100%); padding: 8px 14px; border-radius: 14px; background: var(--ink); color: #fff;
  font: 800 18px var(--font); white-space: nowrap; box-shadow: 0 4px 0 rgba(0,0,0,.2); opacity: 0; transition: opacity .2s; }
.qd-tag.on { opacity: 1; animation: pop .35s var(--bounce); }
.qd-tag b { color: #FF8A7A; margin-right: 6px; }
.qd-tag.t1 b { color: #7DE3D9; }
`;

export class QuickDraw extends BaseGame {
  static meta = {
    touch: { pads: { up: '▲', left: '◀', right: '▶', down: '▼' }, layout: 'cross', tip: 'Tap the arrow shown on the sign' },
    id: 'quickdraw', title: 'Quick Draw', icon: '🤠', color: '#FFB86B', ink: '#5A2A0A', rounds: 5, quick: true, figScale: S,
    tagline: 'Wait for the sign… then draw faster than your rival!',
    goal: 'When the sign flips, press the arrow it shows on YOUR keys. Fastest wins the duel. Too early, wrong key or fooled by a fake sign? You’re out of that duel.',
    touchGoal: 'When the sign flips, tap the matching arrow pad on YOUR side. Fastest wins the duel. Too early, wrong arrow or fooled by a fake sign? You’re out of that duel.',
    controls: [['any', 'Press the arrow on the sign'], ['any', 'Too early or wrong = locked out']],
  };

  build() {
    this.touchLift = 0.14; // duelists stand above the arrow pads on touch screens
    this.lights = studio(this.scene, this.app.engine, { sky: ['#FF9A7A', '#FFBE8C', '#FFE3BC'], fog: '#FFD7AE', fogNear: 24, fogFar: 70, shadow: 9, sun: [-9, 6, 6], sunI: 2.1, hemiI: 1.05 });
    this.lights.follow(new THREE.Vector3(0, 0, -1));
    // dusty ground + the street
    const ground = mesh(new THREE.PlaneGeometry(120, 60), vinyl('#F2C48D', { rough: 0.9, coat: 0 }), { cast: false });
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    const street = mesh(new THREE.PlaneGeometry(40, 4.6), vinyl('#E7B17A', { rough: 0.95, coat: 0 }), { cast: false });
    street.rotation.x = -Math.PI / 2; street.position.y = 0.005;
    this.scene.add(street);
    for (let i = 0; i < 40; i++) {
      const p = mesh(sharedGeo('qd:pebble', () => new THREE.SphereGeometry(1, 10, 8)), vinyl(pick(['#D9A06A', '#E9BE8E', '#C98F5E']), { rough: 0.8, coat: 0 }), { cast: false });
      p.scale.set(rand(0.06, 0.16), rand(0.03, 0.06), rand(0.06, 0.16));
      p.position.set(rand(-14, 14), 0.01, rand(-3.5, 4));
      this.scene.add(p);
    }
    // the sun sinking behind the mesas
    const sun = new THREE.Mesh(new THREE.CircleGeometry(4.2, 48), new THREE.MeshBasicMaterial({ color: '#FFF0C8', fog: false, toneMapped: false }));
    sun.position.set(-13, 6.5, -48);
    this.scene.add(sun);
    for (const [x, w, h, c] of [[-26, 10, 5, '#EFA27E'], [-12, 8, 3.4, '#F4B08A'], [6, 12, 4.4, '#EFA27E'], [22, 9, 3, '#F4B08A'], [34, 10, 5.5, '#EFA27E']]) {
      const m = mesh(rbox(w, h, 3, 0.5, 3), vinyl(c, { rough: 0.8, coat: 0 }), { cast: false });
      m.position.set(x, h / 2 - 0.2, -30);
      this.scene.add(m);
    }
    // main street facades
    const fronts = [
      [-11, 4.2, 3.6, PAL.lilac, 'HOTEL'], [-6.4, 4.6, 4.6, PAL.mustard, 'SALOON'], [-1.6, 4.4, 3.4, '#FFF1DC', 'GENERAL STORE'],
      [3.2, 4.6, 4.2, PAL.pink, 'SHERIFF'], [8.0, 4.4, 3.8, PAL.mint, 'BAKERY'], [12.6, 4.2, 4.4, '#C9A0DC', 'BANK'],
    ];
    for (const [x, w, h, c, label] of fronts) this.scene.add(this.facade(x, w, h, c, label));
    // cacti + barrels
    for (const [x, z, s] of [[-8.6, 1.8, 1], [9.4, 2.4, 1.15], [-13.5, 3.6, 0.9], [13.8, 1.2, 0.8], [6.2, -2.6, 0.7]]) this.scene.add(this.cactus(x, z, s));
    for (const [x, z] of [[-4.2, -2.6], [-3.6, -2.9], [10.6, -2.4]]) {
      const b = mesh(sharedGeo('qd:barrel', () => new THREE.CylinderGeometry(0.34, 0.38, 0.8, 20)), vinyl('#B87A4B', { rough: 0.6, coat: 0.2 }));
      b.position.set(x, 0.4, z);
      const hoop = mesh(sharedGeo('qd:hoop', () => new THREE.TorusGeometry(0.36, 0.025, 6, 24)), vinyl('#8B8F99', { rough: 0.4, metal: 0.6 }), { cast: false });
      hoop.rotation.x = Math.PI / 2; hoop.position.set(x, 0.62, z);
      this.scene.add(b, hoop);
    }
    // foreground: a hitching rail, a water trough and tufts of dry grass
    const wood = vinyl('#B87A4B', { rough: 0.6, coat: 0.15 });
    for (const [x, z, r] of [[-7.4, 3.4, 0.2], [7.6, 3.0, -0.25]]) {
      const g = new THREE.Group();
      const rail = mesh(rbox(2.6, 0.14, 0.14, 0.05, 2), wood);
      rail.position.y = 0.85;
      g.add(rail);
      for (const px of [-1.1, 1.1]) {
        const post = mesh(sharedGeo('qd:post2', () => new THREE.CylinderGeometry(0.08, 0.09, 0.95, 10)), wood);
        post.position.set(px, 0.47, 0);
        g.add(post);
      }
      g.position.set(x, 0, z);
      g.rotation.y = r;
      this.scene.add(g);
    }
    const trough = mesh(rbox(1.5, 0.5, 0.6, 0.08, 2), wood);
    trough.position.set(-9.6, 0.25, 1.2);
    const water = mesh(rbox(1.3, 0.05, 0.42, 0.03, 2), vinyl('#8EC9FF', { rough: 0.1, coat: 1 }), { cast: false });
    water.position.set(-9.6, 0.47, 1.2);
    this.scene.add(trough, water);
    for (let i = 0; i < 26; i++) {
      const tuft = mesh(sharedGeo('qd:tuft', () => new THREE.ConeGeometry(0.06, 0.32, 5)), vinyl(pick(['#C9B26A', '#B7A35C', '#D8C27A']), { rough: 0.8, coat: 0 }), { cast: false });
      const x = rand(-13, 13), z = rand(2.6, 6);
      for (let k = 0; k < 3; k++) {
        const t = tuft.clone();
        t.position.set(x + rand(-0.12, 0.12), 0.14, z + rand(-0.1, 0.1));
        t.rotation.set(rand(-0.4, 0.4), 0, rand(-0.4, 0.4));
        this.scene.add(t);
      }
    }
    // tumbleweed
    this.weed = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const r = mesh(sharedGeo('qd:weed', () => new THREE.TorusGeometry(0.34, 0.022, 5, 20)), matte('#C99A5E', { rough: 0.9 }));
      r.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
      this.weed.add(r);
    }
    this.weed.position.set(-30, 0.35, 1.6);
    this.weed.userData = { wait: rand(2, 5), on: false };
    this.scene.add(this.weed);
    // cork pop-guns: P1 holds it in the right hand, P2 in the left — both on the camera side
    this.guns = this.players.map(p => {
      const g = this.makeGun();
      const arm = p.fig.arms[p.id === 0 ? 1 : 0];
      g.position.set(p.id === 0 ? -0.02 : 0.02, -0.2, 0.03);
      arm.add(g);
      return g;
    });
    this.cork = mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 14), vinyl('#D9A766', { rough: 0.7, coat: 0 }));
    this.cork.visible = false;
    this.scene.add(this.cork);
    this.locked = [false, false];
    this.duel = null;
  }

  facade(x, w, h, color, label) {
    const g = new THREE.Group();
    const body = mesh(rbox(w, h, 0.5, 0.12, 3), vinyl(color, { rough: 0.5, coat: 0.25 }));
    body.position.y = h / 2;
    const crown = mesh(rbox(w * 0.62, 0.7, 0.5, 0.12, 3), vinyl(color, { rough: 0.5, coat: 0.25 }));
    crown.position.y = h + 0.3;
    const trim = vinyl('#FFFFFF', { rough: 0.4, coat: 0.4 });
    const cap = mesh(rbox(w + 0.2, 0.16, 0.62, 0.06, 2), trim);
    cap.position.y = h + 0.02;
    g.add(body, crown, cap);
    const tex = canvasTexture(512, 112, (c, cw, ch) => {
      c.fillStyle = '#FFF6E6'; c.beginPath(); c.roundRect(4, 4, cw - 8, ch - 8, 22); c.fill();
      c.strokeStyle = '#8A5A36'; c.lineWidth = 6; c.stroke();
      c.fillStyle = '#5A2A0A'; c.textAlign = 'center'; c.textBaseline = 'middle';
      let s = 66; do { c.font = `800 ${s}px ${FONT}`; s -= 2; } while (c.measureText(label).width > cw - 80);
      c.fillText(label, cw / 2, ch / 2 + 4);
      c.fillStyle = PAL.mustard; c.font = `800 40px ${FONT}`; c.fillText('★', 34, ch / 2 + 2); c.fillText('★', cw - 34, ch / 2 + 2);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.84, w * 0.84 * 112 / 512), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    sign.position.set(0, h - 0.55, 0.27);
    g.add(sign);
    // windows, saloon doors, porch roof on posts
    const glass = vinyl('#4E5A86', { rough: 0.15, coat: 0.9 });
    for (const wx of [-w * 0.3, w * 0.3]) {
      const fr = mesh(rbox(0.9, 1.0, 0.1, 0.06, 2), trim, { cast: false });
      fr.position.set(wx, h * 0.52, 0.27);
      const gl = mesh(rbox(0.72, 0.82, 0.1, 0.05, 2), glass, { cast: false });
      gl.position.set(wx, h * 0.52, 0.3);
      g.add(fr, gl);
    }
    const doorMat = vinyl('#B87A4B', { rough: 0.5, coat: 0.2 });
    for (const dx of [-0.24, 0.24]) {
      const d = mesh(rbox(0.44, 0.7, 0.06, 0.05, 2), doorMat);
      d.position.set(dx, 0.95, 0.32);
      g.add(d);
    }
    const awning = mesh(rbox(w, 0.12, 1.3, 0.05, 2), vinyl('#B87A4B', { rough: 0.6, coat: 0.1 }));
    awning.position.set(0, 1.95, 0.85);
    awning.rotation.x = 0.12;
    g.add(awning);
    for (const px of [-w / 2 + 0.2, w / 2 - 0.2]) {
      const post = mesh(sharedGeo('qd:post', () => new THREE.CylinderGeometry(0.06, 0.06, 1.95, 10)), doorMat);
      post.position.set(px, 0.97, 1.42);
      g.add(post);
    }
    const porch = mesh(rbox(w, 0.16, 1.5, 0.04, 2), vinyl('#C98B5A', { rough: 0.7, coat: 0.1 }));
    porch.position.set(0, 0.08, 0.85);
    g.add(porch);
    g.position.set(x, 0, -4.6);
    return g;
  }
  cactus(x, z, s) {
    const g = new THREE.Group();
    const m = vinyl('#7ED6A5', { rough: 0.45, coat: 0.4 });
    const trunk = mesh(sharedGeo('qd:trunk', () => new THREE.CapsuleGeometry(0.22, 1.2, 6, 14)), m);
    trunk.position.y = 0.82;
    g.add(trunk);
    for (const [side, y, up] of [[-1, 0.8, 0.45], [1, 1.1, 0.35]]) {
      const arm = mesh(sharedGeo('qd:carm', () => new THREE.CapsuleGeometry(0.12, 0.28, 4, 10)), m);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(side * 0.32, y, 0);
      const tip = mesh(sharedGeo('qd:ctip', () => new THREE.CapsuleGeometry(0.12, up, 4, 10)), m);
      tip.position.set(side * 0.48, y + up / 2 + 0.08, 0);
      g.add(arm, tip);
    }
    const flower = mesh(sharedGeo('qd:flower', () => new THREE.SphereGeometry(0.1, 12, 8)), vinyl(PAL.pink, { rough: 0.3, coat: 0.7 }));
    flower.position.y = 1.62;
    g.add(flower);
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    return g;
  }
  makeGun() {
    // held in the mitten; the barrel runs down the arm so it points at the rival when the arm is raised
    const g = new THREE.Group();
    const body = mesh(rbox(0.09, 0.12, 0.1, 0.03, 2), vinyl(PAL.lilac, { rough: 0.3, coat: 0.8 }));
    body.position.y = -0.02;
    const barrel = mesh(sharedGeo('qd:barrel2', () => new THREE.CylinderGeometry(0.032, 0.036, 0.22, 14)), vinyl(PAL.mustard, { rough: 0.25, coat: 0.8 }));
    barrel.position.y = -0.17;
    const tip = mesh(sharedGeo('qd:tip', () => new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14)), vinyl('#FFFFFF', { rough: 0.3, coat: 0.6 }));
    tip.position.y = -0.28;
    g.add(body, barrel, tip);
    g.userData.tip = new THREE.Vector3(0, -0.32, 0);
    return g;
  }

  // ---------- poses ----------
  stance(p) { // hand hovering over the holster
    const r = p.id === 0;
    p.fig.custom = r ? { ra: 0.3, raZ: -0.3, la: 0.1, lean: 0.1 } : { la: 0.3, laZ: 0.3, ra: 0.1, lean: 0.1 };
  }
  aim(p) {
    p.fig.custom = p.id === 0 ? { ra: -1.57, raZ: 0, la: 0.25, laZ: 0.2, lean: -0.04 } : { la: -1.57, laZ: 0, ra: 0.25, raZ: -0.2, lean: -0.04 };
  }

  resetRound() {
    this.duel = null;
    this.locked = [false, false];
    this.cork.visible = false;
    this.players.forEach((p, i) => {
      p.pos.set(i ? X : -X, 0, 0.2);
      p.fig.tumble.rotation.set(0, 0, 0);
      p.fig.pose = 'auto';
      p.fig.speed = 0;
      p.fig.dizzy = 0;
      p.fig.face(i ? -Math.PI / 2 : Math.PI / 2, true);
      this.stance(p);
    });
    if (this.dom) { this.setSign('ready'); this.tag(0, null); this.tag(1, null); }
  }

  // ---------- the sign + lockout tags (DOM) ----------
  ensureDom() {
    if (this.dom || this.preview) return;
    injectCSS('qd-css', CSS);
    const wrap = el('div', 'qd');
    wrap.innerHTML = `<div class="qd-sign"><div class="qd-board"></div></div><div class="qd-tag t0"></div><div class="qd-tag t1"></div>`;
    this.ui.layer.append(wrap);
    this.dom = { board: wrap.querySelector('.qd-board'), tags: [wrap.querySelector('.t0'), wrap.querySelector('.t1')] };
  }
  setSign(kind, arg) {
    if (!this.dom) return;
    const b = this.dom.board;
    b.className = 'qd-board';
    if (kind === 'ready') b.innerHTML = `<div class="wait">STEADY<b>· · ·</b></div>`;
    if (kind === 'wait') b.innerHTML = `<div class="wait">WAIT FOR IT<b>· · ·</b></div>`;
    if (kind === 'fake') b.innerHTML = `<div class="fake ${arg.length > 2 ? 'word' : ''}">${arg}</div>`;
    if (kind === 'go') b.innerHTML = `<div class="arrow">${GLYPH[arg]}</div>${this.input.mode === 'touch' ? '' : `<div class="keys"><kbd class="k0">${TEAM[0].dirs[arg]}</kbd><kbd class="k1">${TEAM[1].dirs[arg]}</kbd></div>`}`;
    if (kind === 'bang') { b.classList.add('bang'); b.innerHTML = `<div class="bang">POP!<small>${arg}</small></div>`; }
    if (kind !== 'ready' && kind !== 'wait') { void b.offsetWidth; b.classList.add('flip'); }
  }
  tag(id, msg) {
    if (!this.dom) return;
    const t = this.dom.tags[id];
    t.classList.toggle('on', !!msg);
    if (msg) t.innerHTML = `<b>✕</b>${msg}`;
  }

  // ---------- duel flow ----------
  onCountdown() { this.ensureDom(); this.setSign('ready'); }
  onGo() { this.newDuel(); }
  newDuel() {
    this.locked = [false, false];
    this.tag(0, null); this.tag(1, null);
    for (const p of this.players) { this.stance(p); p.fig.dizzy = 0; }
    const d = { t: 0, phase: 'wait', at: rand(1.5, 4.5), dir: pick(DIRS), beat: 0, fakeAt: null, fakeShown: false };
    if (Math.random() < 0.25) { d.fakeAt = d.at; d.at += rand(0.9, 1.3); d.fake = pick(FAKES); }
    this.duel = d;
    this.setSign('wait');
  }

  onPress(p, action) {
    const d = this.duel;
    if (!d || d.phase === 'bang' || d.phase === 'restart' || this.locked[p.id]) return;
    if (d.phase === 'wait') return this.lockout(p, d.fakeShown ? 'FOOLED!' : 'TOO EARLY!');
    if (action !== d.dir) return this.lockout(p, this.input.mode === 'touch' ? 'WRONG ARROW!' : 'WRONG KEY!');
    this.shoot(p, d.t - d.shownAt);
  }
  lockout(p, msg) {
    this.locked[p.id] = true;
    sfx.thud();
    this.tag(p.id, msg);
    p.fig.dizzy = 0.8;
    p.fig.custom = { laZ: 0.7, raZ: -0.7, la: -0.35, ra: -0.35, headX: 0.25 }; // sheepish shrug
    if (this.locked[0] && this.locked[1]) {
      const d = this.duel;
      d.phase = 'restart';
      d.rt = 1.5;
      this.ui.toast('Both jumped the gun — again!');
      sfx.draw();
    }
  }
  shoot(p, rt) {
    const d = this.duel;
    d.phase = 'bang';
    const other = p.other;
    this.aim(p);
    p.fig.push = 0;
    sfx.popgun();
    this.rig.shake(0.22, 0.2);
    this.setSign('bang', `${this.name(p.id)} · ${rt.toFixed(2)} s`);
    // the cork flies across the street
    const gun = this.guns[p.id];
    gun.updateWorldMatrix(true, false);
    const from = gun.localToWorld(gun.userData.tip.clone());
    const to = other.pos.clone().add(new THREE.Vector3(0, 0.85 * S, 0));
    this.fx.puff(from, { n: 5, color: '#FFFFFF', size: 0.1, speed: 1.2, life: 0.4 });
    const cork = this.cork;
    cork.visible = true;
    cork.rotation.set(0, 0, Math.PI / 2);
    tween(0.17, k => {
      cork.position.lerpVectors(from, to, k);
      cork.position.y += Math.sin(k * Math.PI) * 0.15;
      cork.rotation.x += 0.6;
    }, { ease: ease.linear }).then(() => {
      if (this.dead) return;
      this.hit(other, to);
      this.endRound(p.id, `${this.name(p.id)} WINS THE DRAW!`);
      tween(0.6, () => {}).then(() => { if (!this.dead && this.state !== 'play') p.fig.custom = null; });
    });
  }
  hit(p, at) {
    sfx.thud();
    this.fx.stars(at, 7);
    this.fx.burst(at, '#FFE7B0', { n: 8, speed: 2.5, up: 2.5, size: 0.06 });
    p.fig.custom = null;
    p.fig.pose = 'blasted';
    const dir = p.id === 0 ? -1 : 1;
    // the cork bounces off and drops in the dust
    const c = this.cork, from = at.clone(), to = at.clone().setY(0.06).add(new THREE.Vector3(-dir * 0.9, 0, 0.6));
    tween(0.5, k => { c.position.lerpVectors(from, to, k); c.position.y += Math.sin(k * Math.PI) * 0.6; c.rotation.z += 0.3; }, { ease: ease.linear });
    tween(0.45, k => { p.fig.tumble.rotation.x = -1.45 * k; }, { ease: ease.inCubic }).then(() => {
      if (this.dead) return;
      p.fig.pose = 'dizzy';
      p.fig.land(0.6);
      this.fx.puff(p.pos.clone().setY(0.1), { n: 8, color: '#F2C48D', size: 0.22 });
    });
  }

  tick(dt) {
    const d = this.duel;
    if (!this.live || !d) return;
    d.t += dt;
    if (d.phase === 'wait') {
      // heartbeat while you wait
      d.beat -= dt;
      if (d.beat <= 0) { d.beat = 0.78; tone(62, { dur: 0.12, vol: 0.16 }); tone(52, { at: 0.15, dur: 0.12, vol: 0.12 }); }
      if (d.fakeAt != null && !d.fakeShown && d.t >= d.fakeAt) { d.fakeShown = true; this.setSign('fake', d.fake); sfx.pop(); }
      if (d.t >= d.at) {
        d.phase = 'draw';
        d.shownAt = d.t;
        this.setSign('go', d.dir);
        tone(N(96), { dur: 0.5, vol: 0.12, type: 'triangle' });
        tone(N(103), { at: 0.04, dur: 0.6, vol: 0.08, type: 'triangle' });
      }
    } else if (d.phase === 'restart') {
      d.rt -= dt;
      if (d.rt <= 0) this.newDuel();
    }
  }

  animate(dt) {
    // tumbleweed rolls through now and then
    const w = this.weed, u = w.userData;
    if (!u.on) { u.wait -= dt; if (u.wait <= 0) { u.on = true; w.position.x = -16; u.dir = Math.random() < 0.5 ? 1 : -1; w.position.x = -16 * u.dir; w.position.z = rand(1.2, 3.2); } }
    else {
      w.position.x += u.dir * 3.4 * dt;
      w.rotation.z -= u.dir * (3.4 / 0.38) * dt;
      w.position.y = 0.36 + Math.abs(Math.sin(w.position.x * 1.4)) * 0.3;
      if (Math.abs(w.position.x) > 17) { u.on = false; u.wait = rand(5, 11); }
    }
    // lockout tags float over the figures' heads
    if (this.dom) {
      const v = new THREE.Vector3();
      for (const p of this.players) {
        v.copy(p.pos).setY(1.8 * S).project(this.camera);
        const t = this.dom.tags[p.id];
        t.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
        t.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
      }
    }
  }

  updateCamera(dt, instant) {
    if (this.winnerCam(instant)) return;
    this.rig.speed = 3;
    // slow push-in while everyone waits for the sign — then snap back on the shot
    const d = this.duel;
    const k = d && this.live && d.phase === 'wait' ? Math.min(1, d.t / 4.5) : 0;
    this.rig.to(new THREE.Vector3(0, 2.3 - k * 0.2, 9.0 - k * 1.5), new THREE.Vector3(0, 1.2 - k * 0.1, 0), instant);
  }

  previewPose() {
    const [a, b] = this.players;
    a.pos.x = -2.3; b.pos.x = 2.3;
    this.aim(a);
    b.fig.custom = null;
    b.fig.pose = 'blasted';
    b.fig.tumble.rotation.x = -0.55;
    this.cork.visible = true;
    this.cork.position.set(0.9, 0.95 * S, 0.2);
    this.cork.rotation.set(0, 0, Math.PI / 2);
    this.fx.stars(new THREE.Vector3(2.0, 1.2 * S, 0.2), 6);
    this.rig.to(new THREE.Vector3(0.1, 1.75, 5.9), new THREE.Vector3(0.1, 1.05, 0), true);
  }

  dispose() {
    this.dead = true;
    super.dispose();
  }
}
