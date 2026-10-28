// WASD vs ARROW — app flow: loading → fighter select → game menu → how-to → play → results.
import * as THREE from 'three';
import { Engine, TEAM, studio } from './engine.js';
import { Input } from './input.js';
import { TouchControls } from './touch.js';
import { loadKit, ROSTER, randomLook, Figure } from './figures.js';
import { Showroom } from './showroom.js';
import { UI } from './ui.js';
import { sfx, music, unlockAudio, settings, setMusic, setSfx } from './audio.js';
import { updateTweens, store, wait, clamp } from './util.js';
import { CakeClash } from './games/cake.js';
import { PaintPanic } from './games/paint.js';
import { HurdleHustle } from './games/hurdles.js';
import { HotPotato } from './games/potato.js';
import { GoalRush } from './games/goal.js';
import { BeachBonk } from './games/volley.js';
import { KartKerfuffle } from './games/kart.js';
import { QuickDraw } from './games/quickdraw.js';
import { SnowballShowdown } from './games/snowball.js';
import { TrailBlazers } from './games/trails.js';
import { ChocoDrop } from './games/choco.js';
import { TowerTumble } from './games/tower.js';
import { SpinCycle } from './games/spin.js';
import { DanceDuel } from './games/dance.js';

export const GAMES = [
  CakeClash, PaintPanic, HurdleHustle, HotPotato, GoalRush, BeachBonk, KartKerfuffle,
  QuickDraw, SnowballShowdown, TrailBlazers, ChocoDrop, TowerTumble, SpinCycle, DanceDuel,
];
const PARTY = GAMES.length; // menu index of the party card
const PARTY_SIZE = Math.min(5, GAMES.length);
// a fresh party: PARTY_SIZE different games in random order
const newParty = () => ({ order: GAMES.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, PARTY_SIZE), index: 0, wins: [0, 0], champion: null });

class App {
  constructor() {
    this.engine = new Engine(document.getElementById('gl'));
    this.input = new Input();
    this.touch = new TouchControls(this.input);
    this.ui = new UI(this);
    this.mouse = { x: 0, y: 0 };
    this.time = 0;
    this.paused = false;
    this.state = 'loading';
    this.cursor = 0;
    this.series = store.get('series', [0, 0]);
    const saved = store.get('looks', null);
    this.looks = Array.isArray(saved) && saved.length === 2 && saved.every(l => l?.torso) ? saved : [ROSTER[0], ROSTER[1]];
    this.ready = [false, false];
    this.portraits = [null, null];
    this.thumbs = [];
    this.thumbKey = '';
    this.party = null;
    this.input.on(ev => this.onInput(ev));
    addEventListener('pointermove', e => { this.mouse.x = (e.clientX / innerWidth) * 2 - 1; this.mouse.y = (e.clientY / innerHeight) * 2 - 1; });
    // iOS only lets audio start inside a real tap, and suspends it in the background: retry on every touch
    for (const ev of ['pointerdown', 'touchend', 'click']) addEventListener(ev, () => unlockAudio(), { passive: true });
    document.addEventListener('gesturestart', e => e.preventDefault()); // no pinch-zoom on iPad
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play') this.pause(); });
    addEventListener('blur', () => { if (this.state === 'play' && ['countdown', 'play'].includes(this.game?.state)) this.pause(); });
    this.ui.setCorner(settings);
  }

  async init() {
    const fonts = Promise.race([
      Promise.all([document.fonts.load(`800 40px "Bricolage Grotesque"`), document.fonts.load('40px Pacifico')]),
      new Promise(r => setTimeout(r, 2500)),
    ]);
    await Promise.all([loadKit(f => this.ui.loading(f * 0.8)), fonts]);
    this.showroom = new Showroom(this);
    for (const t of [0, 1]) this.showroom.setFigure(t, this.looks[t], false);
    this.ui.loading(0.9);
    this.engine.setView(this.showroom);
    this.ui.buildMenu(GAMES, [], PARTY_SIZE);
    this.last = performance.now();
    requestAnimationFrame(t => this.loop(t));
    const sleep = ms => new Promise(r => setTimeout(r, ms)); // wall-clock: works even before the first frame
    await sleep(300);
    this.ui.loading(1);
    await sleep(250);
    this.toMode();
  }

  // ---------- keyboard or touch ----------
  // Every launch starts here; the likely choice (touch screen or not) is pre-selected.
  toMode() {
    this.state = 'mode';
    this.disposeGame();
    this.touch.show(false);
    const guess = store.get('mode', null) ?? (navigator.maxTouchPoints > 1 && matchMedia('(pointer: coarse)').matches ? 'touch' : 'keys');
    document.querySelectorAll('.mode-card').forEach(c => c.classList.toggle('sel', c.dataset.mode === guess));
    this.ui.show('mode');
  }
  chooseMode(mode) {
    if (this.state !== 'mode') return;
    this.input.mode = mode;
    document.body.classList.toggle('touch', mode === 'touch');
    this.engine.setTouch(mode === 'touch');
    store.set('mode', mode);
    sfx.ready();
    this.toSelect();
  }

  loop(now) {
    requestAnimationFrame(t => this.loop(t));
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused) {
      this.time += dt;
      updateTweens(dt);
      this.engine.view?.update(dt);
    }
    if (this.state === 'select') this.placePicks();
    if (this.state === 'menu' && this.thumbQueue?.length) this.renderThumb(this.thumbQueue.shift());
    this.engine.render();
  }

  // the pick panels sit right under each box
  placePicks() {
    const cam = this.showroom.camera, v = new THREE.Vector3();
    for (const t of [0, 1]) {
      this.showroom.boxes[t].group.localToWorld(v.set(0, 0, 0.5));
      v.project(cam);
      const x = clamp((v.x * 0.5 + 0.5) * innerWidth, 160, innerWidth - 160);
      const y = (-v.y * 0.5 + 0.5) * innerHeight + 22;
      this.ui.placePick(t, x, y);
    }
  }

  // ---------- screens ----------
  toSelect() {
    this.state = 'select';
    this.disposeGame();
    this.touch.show(false);
    this.engine.setView(this.showroom);
    for (const t of [0, 1]) { this.ready[t] = false; this.showroom.setReady(t, false); this.ui.updatePick(t, this.looks[t], false); }
    this.showroom.setMode('select');
    this.ui.clearTransient();
    this.ui.show('select');
    music.setIntensity(0);
  }
  changeLook(t, dir) {
    if (this.ready[t]) return;
    let look;
    if (dir === 0) look = randomLook();
    else {
      const i = ROSTER.findIndex(r => r.no === this.looks[t].no);
      look = ROSTER[((i < 0 ? 0 : i + dir) + ROSTER.length) % ROSTER.length];
    }
    this.looks[t] = look;
    store.set('looks', this.looks);
    this.portraits[t] = null;
    this.showroom.setFigure(t, look);
    this.ui.updatePick(t, look, false);
  }
  setReady(t, on) {
    if (this.ready[t] === on) return;
    this.ready[t] = on;
    this.showroom.setReady(t, on);
    this.ui.updatePick(t, this.looks[t], on);
    on ? sfx.ready() : sfx.unready();
    if (this.ready[0] && this.ready[1]) {
      wait(1.1).then(() => { if (this.state === 'select' && this.ready[0] && this.ready[1]) this.toMenu(); });
    }
  }

  toMenu() {
    this.state = 'menu';
    this.party = null;
    this.disposeGame();
    this.touch.show(false);
    this.engine.setView(this.showroom);
    for (const t of [0, 1]) if (!this.ready[t]) { this.ready[t] = true; this.showroom.setReady(t, true); }
    this.showroom.setMode('menu');
    this.makeThumbs();
    this.makePortraits();
    this.ui.series(this.series, this.looks);
    this.menuCursor(this.cursor, true);
    this.ui.clearTransient();
    this.ui.show('menu');
    music.setIntensity(0);
  }
  menuCursor(i, quiet = false) {
    this.cursor = (i + GAMES.length + 1) % (GAMES.length + 1);
    this.ui.menuCursor(this.cursor);
    if (!quiet) { sfx.move(); this.showroom.cheer(); }
  }
  menuSelect() {
    sfx.ready();
    if (this.cursor === PARTY) {
      this.party = newParty();
      this.startGame(this.party.order[0]);
    } else this.startGame(this.cursor);
  }

  // g: index into GAMES, or a game class (dev tools)
  startGame(g, opts = {}) {
    this.disposeGame();
    const G = typeof g === 'number' ? GAMES[g] : g;
    this.gameClass = G;
    this.game = new G(this, opts);
    this.engine.setView(this.game);
    this.state = 'intro';
    this.introReady = [false, false];
    this.makePortraits();
    this.ui.setupHud(G.meta, this.looks, this.portraits, this.game.rounds);
    this.ui.hudWins([0, 0]);
    this.ui.showIntro(G.meta, this.looks, this.party);
    this.ui.clearTransient();
    this.ui.show('intro');
  }
  setIntroReady(t) {
    if (this.introReady[t]) return;
    this.introReady[t] = true;
    this.ui.introReady(t);
    sfx.ready();
    this.game.players[t].fig.pose = 'wave';
    if (this.introReady[0] && this.introReady[1]) wait(0.45).then(() => { if (this.state === 'intro') this.beginGame(); });
  }
  beginGame() {
    this.state = 'play';
    for (const p of this.game.players) p.fig.pose = 'auto';
    this.ui.show('hud');
    if (this.input.mode === 'touch') { this.touch.setLayout(this.gameClass.meta.touch); this.touch.show(true); }
    music.setIntensity(1);
    this.game.begin();
  }

  onMatchOver(winner, game) {
    if (game !== this.game) return;
    if (winner != null && !this.dev) { this.series[winner]++; store.set('series', this.series); } // dev runs don't count
    const party = this.party;
    if (party) {
      if (winner != null) party.wins[winner]++;
      party.index++;
      if (party.index >= party.order.length && party.wins[0] !== party.wins[1]) party.champion = party.wins[0] > party.wins[1] ? 0 : 1;
    }
    wait(1.4).then(() => {
      if (this.game !== game) return;
      this.state = 'results';
      this.touch.show(false);
      this.ui.showResults({ winner, looks: this.looks, portraits: this.portraits, score: game.wins, meta: game.meta, series: this.series, party });
      this.ui.show('results', 'hud');
      music.setIntensity(0);
    });
  }
  resultsAction(action) {
    if (action === 'up') {
      const p = this.party;
      if (p && p.index < p.order.length) this.startGame(p.order[p.index]);
      else if (p && p.champion == null) { // a tie after four games: one sudden-death round
        p.order.push(Math.floor(Math.random() * GAMES.length));
        this.ui.toast('⚡ Sudden death!');
        this.startGame(p.order[p.index], { rounds: 1 });
      } else if (p) { this.party = newParty(); this.startGame(this.party.order[0]); }
      else this.startGame(this.gameClass);
    } else if (action === 'down') this.toMenu();
  }

  pause() {
    if (this.paused || this.state !== 'play') return;
    this.paused = true;
    this.input.reset();
    this.touch.show(false);
    this.ui.showPause();
    this.ui.show('pause', 'hud');
  }
  pauseAction(a) {
    if (a === 'resume') { this.paused = false; this.ui.show('hud'); this.last = performance.now(); this.touch.show(this.input.mode === 'touch'); }
    if (a === 'music' || a === 'sfx') this.corner(a);
    if (a === 'restart') { this.paused = false; this.startGame(this.gameClass, { rounds: this.game.rounds }); }
    if (a === 'quit') { this.paused = false; this.toMenu(); }
  }

  disposeGame() {
    if (!this.game) return;
    this.game.dispose();
    this.game = null;
    this.ui.clearLayer();
    music.setMuted(false);
  }

  // dev: __app.devPlay('./games/goal.js') jumps straight into a game module, skipping the menus
  async devPlay(path, opts = {}) {
    const m = await import(`${path}?t=${Date.now()}`);
    const G = Object.values(m).find(v => v?.meta?.id);
    this.dev = true;
    for (const t of [0, 1]) if (!this.ready[t]) { this.ready[t] = true; this.showroom.setReady(t, true); }
    this.makePortraits();
    this.startGame(G, opts);
    this.setIntroReady(0);
    this.setIntroReady(1);
    return G.meta.id;
  }

  // ---------- input routing ----------
  onInput(ev) {
    unlockAudio();
    if (ev.type === 'key') return this.onKey(ev.code);
    if (this.state === 'mode') return ev.touch || ev.mouse ? undefined : this.chooseMode('keys');
    const { player: t, action } = ev;
    if (this.paused) return;
    switch (this.state) {
      case 'select':
        if (action === 'left') this.changeLook(t, -1);
        else if (action === 'right') this.changeLook(t, 1);
        else if (action === 'down') { if (this.ready[t]) this.setReady(t, false); else this.changeLook(t, 0); }
        else if (action === 'up') this.setReady(t, !this.ready[t]);
        break;
      case 'menu':
        if (action === 'left') this.menuCursor(this.cursor - 1);
        else if (action === 'right') this.menuCursor(this.cursor + 1);
        else if (action === 'up') this.menuSelect();
        else if (action === 'down') { sfx.unready(); this.toSelect(); }
        break;
      case 'intro':
        if (action === 'up') this.setIntroReady(t);
        break;
      case 'play':
        this.game?.onInput(ev);
        break;
      case 'results':
        this.resultsAction(action);
        break;
    }
  }
  onKey(code) {
    if (this.state === 'mode') return this.chooseMode('keys'); // any key on the start screen = keyboard
    if (code === 'KeyM') return this.corner('music');
    if (code === 'KeyF') return this.corner('full');
    if (this.paused) {
      if (code === 'Escape' || code === 'Enter' || code === 'Space') this.pauseAction('resume');
      if (code === 'KeyR') this.pauseAction('restart');
      if (code === 'KeyQ') this.pauseAction('quit');
      return;
    }
    const confirm = code === 'Enter' || code === 'Space';
    switch (this.state) {
      case 'select':
        if (confirm) { this.setReady(0, true); this.setReady(1, true); }
        break;
      case 'menu':
        if (confirm) this.menuSelect();
        if (code === 'Escape') this.toSelect();
        break;
      case 'intro':
        if (confirm) this.beginGame();
        if (code === 'Escape') this.toMenu();
        break;
      case 'play':
        if (code === 'Escape' || code === 'KeyP') this.pause();
        break;
      case 'results':
        if (confirm) this.resultsAction('up');
        if (code === 'Escape') this.resultsAction('down');
        break;
    }
  }
  corner(btn) {
    if (btn === 'music') setMusic(!settings.music);
    if (btn === 'sfx') setSfx(!settings.sfx);
    if (btn === 'full') {
      const d = document, root = d.documentElement;
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen ?? d.webkitExitFullscreen)?.call(d);
      else (root.requestFullscreen ?? root.webkitRequestFullscreen)?.call(root)?.catch?.(() => {});
    }
    if (btn === 'mode' && this.state !== 'play') return this.toMode();
    this.ui.setCorner(settings);
    sfx.click();
  }

  // ---------- rendered images: menu thumbnails (with your figures in them) + HUD portraits ----------
  // Thumbnails are rendered one per frame (selected card first) so opening the menu never stalls.
  makeThumbs() {
    const key = this.looks.map(l => l.name + l.top + l.hair).join('|');
    if (key !== this.thumbKey) { this.thumbKey = key; this.thumbs = []; }
    const todo = GAMES.map((_, i) => i).filter(i => !this.thumbs[i]);
    this.thumbQueue = todo.sort((a, b) => Math.abs(a - this.cursor) - Math.abs(b - this.cursor));
  }
  renderThumb(i) {
    const g = new GAMES[i](this, { preview: true });
    g.previewPose();
    for (let k = 0; k < 24; k++) g.update(1 / 30);
    this.thumbs[i] = this.engine.snapshot(g.scene, g.camera, 640, 400, 'image/jpeg');
    g.dispose();
    this.engine.render();
    this.ui.updateThumb(i, this.thumbs[i]);
  }
  makePortraits() {
    for (const t of [0, 1]) {
      if (this.portraits[t]) continue;
      const scene = new THREE.Scene();
      studio(scene, this.engine, { sky: [TEAM[t].light, TEAM[t].light], shadow: 2, sun: [2, 4, 5] });
      const fig = new Figure(this.looks[t]);
      fig.face(t ? -0.35 : 0.35, true);
      fig.update(0.016);
      scene.add(fig.root);
      const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
      cam.position.set(0, 0.84, 2.1);
      cam.lookAt(0, 0.7, 0);
      this.portraits[t] = this.engine.snapshot(scene, cam, 192, 192);
      scene.background.dispose();
    }
    this.engine.render();
  }
}

const app = new App();
window.__app = app; // handy in the console
// deterministic stepping for tests: __app.step(2) runs two seconds of game time at 60 Hz
app.step = (seconds, hz = 60) => { for (let i = 0; i < seconds * hz; i++) { app.time += 1 / hz; updateTweens(1 / hz); app.engine.view?.update(1 / hz); } };
// dev screenshots (headless): ?shot=<gameId>&t=<seconds>&keys=KeyD,ArrowLeft  ·  ?shot=thumbs  ·  ?shot=menu&i=<card>
async function devShot(q) {
  const A = app, tick = () => new Promise(r => setTimeout(r, 0));
  const step = async s => { for (let i = 0; i < s * 10; i++) { A.step(0.1); await tick(); } };
  A.dev = true;
  if (q.has('touch')) { A.state = 'mode'; A.chooseMode('touch'); }
  const id = q.get('shot');
  if (id === 'thumbs') {
    A.toMenu();
    GAMES.forEach((_, i) => A.renderThumb(i));
    document.body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:6px;background:#333">${A.thumbs.map(u => `<img src="${u}" style="width:100%">`).join('')}</div>`;
  } else if (id === 'mode') {
    A.toMode();
    await new Promise(r => setTimeout(r, 600));
  } else if (id === 'select') {
    A.toSelect();
    await step(1);
    await new Promise(r => setTimeout(r, 600));
  } else if (id === 'intro') {
    A.startGame(GAMES.find(g => g.meta.id === (q.get('game') || 'cake')));
    await new Promise(r => setTimeout(r, 700));
  } else if (id === 'menu') {
    A.toMenu();
    GAMES.forEach((_, i) => A.renderThumb(i));
    await step(2);
    A.menuCursor(+q.get('i') || 0, true);
    await new Promise(r => setTimeout(r, 900));
  } else {
    A.startGame(GAMES.find(g => g.meta.id === id));
    A.setIntroReady(0); A.setIntroReady(1);
    await step(0.6); await step(3.3);
    for (const k of (q.get('keys') || '').split(',').filter(Boolean)) dispatchEvent(new KeyboardEvent('keydown', { code: k }));
    for (const t of [0, 1]) if (q.has(`stick${t}`)) { const [x, z] = q.get(`stick${t}`).split(',').map(Number); A.input.setStick(t, x, z); }
    await step(+q.get('t') || 1);
    A.paused = true;
    A.engine.render();
  }
  document.title = 'DONE';
}
const devQuery = new URLSearchParams(location.search);
app.init().then(() => devQuery.has('shot') && devShot(devQuery)).catch(err => {
  console.error(err);
  document.querySelector('#loading p').textContent = `Couldn't start: ${err.message}. Serve the folder over http (see README).`;
});
