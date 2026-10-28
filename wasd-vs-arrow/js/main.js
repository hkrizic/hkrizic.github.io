// WASD vs ARROW — app flow: loading → fighter select → game menu → how-to → play → results.
import * as THREE from 'three';
import { Engine, TEAM, studio, CameraRig } from './engine.js';
import { Input } from './input.js';
import { TouchControls } from './touch.js';
import { loadKit, ROSTER, randomLook, Figure } from './figures.js';
import { Showroom } from './showroom.js';
import { Ceremony } from './ceremony.js';
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
// game-night numbers for the scoreboard and the finale
function nightStats(history, champion) {
  const draws = history.filter(h => h.w == null).length;
  let streak = null, run = 0, who = null;
  for (const h of history) {
    if (h.w != null && h.w === who) run++;
    else { who = h.w; run = h.w == null ? 0 : 1; }
    if (who != null && run > 1 && run > (streak?.n ?? 0)) streak = { t: who, n: run };
  }
  const wins = {};
  for (const h of history) if (champion != null && h.w === champion) (wins[h.id] ||= { icon: h.icon, title: h.title, n: 0 }).n++;
  const fav = Object.values(wins).sort((a, b) => b.n - a.n)[0] ?? null;
  return { games: history.length, draws, streak, fav };
}
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
    this.history = store.get('history', []); // tonight's games: { id, icon, title, w: winner or null, s: score }
    const saved = store.get('looks', null);
    this.names = store.get('names', [null, null]); // names the players typed (null = the figure's own name)
    this.rosterSize = ROSTER.length;
    this.looks = (Array.isArray(saved) && saved.length === 2 && saved.every(l => l?.torso) ? saved : [ROSTER[0], ROSTER[1]]).map((l, t) => this.named(t, l));
    this.ready = [false, false];
    this.seat = store.get('seat', 'facing'); // touch screens: 'facing' each other (default) or 'side' by side
    this.picker = 0; // facing each other: who picks the next game (alternates)
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
    // home-screen app: launched from the icon there's no browser chrome, so no install or fullscreen buttons
    const standalone = navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
    document.body.classList.toggle('standalone', !!standalone);
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.installPrompt = e; });
    addEventListener('appinstalled', () => { this.installPrompt = null; this.ui.hideInstall(); document.body.classList.add('standalone'); });
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
    this.disposeCeremony();
    this.state = 'mode';
    this.modeStepTwo = false;
    this.disposeGame();
    this.touch.show(false);
    const guess = store.get('mode', null) ?? (navigator.maxTouchPoints > 1 && matchMedia('(pointer: coarse)').matches ? 'touch' : 'keys');
    document.querySelectorAll('.mode-card').forEach(c => c.classList.toggle('sel', c.dataset.mode === guess));
    this.ui.modeStep(1);
    this.ui.show('mode');
  }
  chooseMode(mode) {
    if (this.state !== 'mode' || this.modeStepTwo) return;
    this.input.mode = mode;
    document.body.classList.toggle('touch', mode === 'touch');
    this.engine.setTouch(mode === 'touch');
    store.set('mode', mode);
    sfx.ready();
    if (mode === 'touch') { this.modeStepTwo = performance.now(); this.ui.modeStep(2, this.seat); return; } // then: how do you sit?
    this.applySeat();
    this.toSelect();
  }
  chooseSeat(seat) {
    if (this.state !== 'mode' || !this.modeStepTwo) return;
    // the seat cards sit where the mode cards were: ignore a double-tap that lands on them by accident
    if (performance.now() - this.modeStepTwo < 500) return;
    this.modeStepTwo = false;
    this.seat = seat;
    store.set('seat', seat);
    this.applySeat();
    sfx.ready();
    this.toSelect();
  }
  // seating only matters on touch screens: turned control strips, badges and pick panels when facing
  applySeat() {
    const facing = this.input.mode === 'touch' && this.seat === 'facing';
    document.body.classList.toggle('facing', facing);
    this.touch.setSeat(this.seat);
    this.engine.facing = facing;
    CameraRig.facing = facing;
    this.ui.applyFacing(facing);
    this.engine.resize();
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
    this.disposeCeremony();
    this.touch.show(false);
    this.engine.setView(this.showroom);
    for (const t of [0, 1]) { this.ready[t] = false; this.showroom.setReady(t, false); this.ui.updatePick(t, this.looks[t], false); }
    this.showroom.setMode('select');
    this.ui.clearTransient();
    this.ui.show('select');
    music.setIntensity(0);
  }
  // a look wearing the player's own name, if they typed one
  named(t, look) {
    const figName = look.figName ?? look.name;
    return { ...look, figName, name: this.names[t] ?? figName };
  }
  setName(t, raw) {
    const name = [...raw.trim().replace(/\s+/g, ' ')].slice(0, 12).join('').toUpperCase();
    this.names[t] = name || null;
    store.set('names', this.names);
    this.looks[t] = this.named(t, this.looks[t]);
    store.set('looks', this.looks);
    this.showroom.renameFigure(t, this.looks[t]);
    this.ui.updatePick(t, this.looks[t], this.ready[t]);
    sfx.pop();
  }
  changeLook(t, dir) {
    if (this.ready[t]) return;
    let look;
    if (dir === 0) look = randomLook();
    else {
      const i = ROSTER.findIndex(r => r.no === this.looks[t].no);
      look = ROSTER[((i < 0 ? 0 : i + dir) + ROSTER.length) % ROSTER.length];
    }
    this.looks[t] = look = this.named(t, look);
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
    this.disposeCeremony();
    this.touch.show(false);
    this.engine.setView(this.showroom);
    for (const t of [0, 1]) if (!this.ready[t]) { this.ready[t] = true; this.showroom.setReady(t, true); }
    this.showroom.setMode('menu');
    this.makeThumbs();
    this.makePortraits();
    this.ui.series(this.series, this.looks);
    this.ui.menuPicker(this.picker, this.looks);
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
    this.picker = 1 - this.picker; // the other player picks next time
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
    if (this.input.mode === 'touch') { this.touch.setLayout(this.gameClass.meta.touch); this.touch.show(true); this.game.onTouchLayout?.(); }
    music.setIntensity(1);
    this.game.begin();
  }

  onMatchOver(winner, game) {
    if (game !== this.game) return;
    if (!this.dev) { // dev runs don't count
      if (winner != null) this.series[winner]++;
      this.history.push({ id: game.meta.id, icon: game.meta.icon, title: game.meta.title, w: winner, s: game.wins.slice() });
      if (this.history.length > 80) this.history.shift();
      store.set('series', this.series);
      store.set('history', this.history);
    }
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
    if (action === 'board') return this.openBoard();
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
    if (a === 'seat') {
      this.seat = this.seat === 'facing' ? 'side' : 'facing';
      store.set('seat', this.seat);
      this.applySeat();
      this.game?.onTouchLayout?.();
      this.ui.showPause();
    }
    if (a === 'board') return this.openBoard();
    if (a === 'restart') { this.paused = false; this.startGame(this.gameClass, { rounds: this.game.rounds }); }
    if (a === 'quit') { this.paused = false; this.toMenu(); }
  }

  // ---------- add to home screen ----------
  openInstall() { this.ui.showInstall({ canPrompt: !!this.installPrompt }); sfx.door(); }
  async installAction(a) {
    if (a === 'close') { this.ui.hideInstall(); sfx.click(); }
    if (a === 'prompt' && this.installPrompt) {
      this.installPrompt.prompt();
      await this.installPrompt.userChoice.catch(() => {});
      this.installPrompt = null;
      this.ui.hideInstall();
    }
  }

  // ---------- game night: the scoreboard, and ending the night with a ceremony ----------
  openBoard() {
    if (this.boardOpen || !['menu', 'results', 'play'].includes(this.state) || (this.state === 'play' && !this.paused)) return;
    this.boardOpen = true;
    this.boardSel = 0;
    this.resetArmed = false;
    this.makePortraits();
    this.ui.showBoard({ looks: this.looks, portraits: this.portraits, series: this.series, history: this.history, stats: nightStats(this.history) });
    this.ui.boardFocus(this.boardSel);
    sfx.door();
  }
  closeBoard() {
    if (!this.boardOpen) return;
    this.boardOpen = false;
    clearTimeout(this.resetTimer);
    this.ui.hideBoard();
    sfx.click();
  }
  // keyboard: ◀ ▶ choose a button, ▲ press it, ▼ back
  boardInput(action) {
    const acts = ['close', 'reset', 'end'];
    if (action === 'left' || action === 'right') {
      this.boardSel = (this.boardSel + (action === 'left' ? 2 : 1)) % 3;
      if (acts[this.boardSel] === 'end' && !this.history.length) this.boardSel = (this.boardSel + (action === 'left' ? 2 : 1)) % 3;
      this.ui.boardFocus(this.boardSel);
      sfx.move();
    }
    if (action === 'up') this.boardAction(acts[this.boardSel]);
    if (action === 'down') this.closeBoard();
  }
  boardAction(a) {
    if (a === 'close') return this.closeBoard();
    if (a === 'reset') {
      // two taps, so nobody wipes the night by accident
      if (!this.resetArmed) {
        this.resetArmed = true;
        this.ui.armReset(true);
        clearTimeout(this.resetTimer);
        this.resetTimer = setTimeout(() => { this.resetArmed = false; this.ui.armReset(false); }, 2600);
        sfx.beep();
        return;
      }
      this.resetNight();
      this.boardOpen = false;
      this.openBoard();
      this.ui.toast('↺ New game night: 0 – 0');
      return;
    }
    if (a === 'end' && this.history.length) { this.boardOpen = false; this.ui.hideBoard(); this.finale(); }
  }
  resetNight() {
    this.series = [0, 0];
    this.history = [];
    store.set('series', this.series);
    store.set('history', this.history);
    this.ui.series(this.series, this.looks);
  }
  finale() {
    this.paused = false;
    this.party = null;
    this.disposeGame();
    this.touch.show(false);
    this.makePortraits();
    const s = this.series.slice(), h = this.history.slice();
    const winner = s[0] === s[1] ? null : s[0] > s[1] ? 0 : 1;
    this.ceremony = new Ceremony(this, { winner, looks: this.looks });
    this.engine.setView(this.ceremony);
    this.state = 'finale';
    this.finaleReadyAt = performance.now() + 2600;
    this.ui.clearTransient();
    this.ui.showFinale({ winner, looks: this.looks, series: s, stats: nightStats(h, winner) });
    this.ui.show('finale');
    music.setIntensity(1);
    this.resetNight(); // the next night starts at 0 – 0
  }
  finaleAction(a) {
    if (this.state !== 'finale') return;
    sfx.ready();
    if (a === 'again') this.toMenu();
    if (a === 'figures') this.toSelect();
  }
  disposeCeremony() {
    if (!this.ceremony) return;
    this.ceremony.dispose();
    this.ceremony = null;
  }

  disposeGame() {
    if (!this.game) return;
    this.game.dispose();
    this.game = null;
    this.ui.clearLayer();
    this.touch.clear(); // games may have parked overlays in the control strips
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
    if (this.boardOpen) return this.boardInput(ev.action);
    if (this.state === 'finale') {
      if (performance.now() < this.finaleReadyAt) return;
      if (ev.action === 'up') this.finaleAction('again');
      if (ev.action === 'down') this.finaleAction('figures');
      return;
    }
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
    if (code === 'Escape' && document.getElementById('install').classList.contains('on')) return this.installAction('close');
    if (this.state === 'mode' && this.modeStepTwo) { if (code === 'Escape') { this.modeStepTwo = false; this.ui.modeStep(1); } return; }
    if (this.state === 'mode') return this.chooseMode('keys'); // any key on the start screen = keyboard
    if (this.boardOpen) {
      if (code === 'Escape' || code === 'KeyB') this.boardAction('close');
      if (code === 'KeyR') this.boardAction('reset');
      if (code === 'KeyE') this.boardAction('end');
      if (code === 'Enter' || code === 'Space') this.boardInput('up');
      return;
    }
    if (this.state === 'finale') {
      if (performance.now() < this.finaleReadyAt) return;
      if (code === 'Enter' || code === 'Space') this.finaleAction('again');
      if (code === 'Escape') this.finaleAction('figures');
      return;
    }
    if (code === 'KeyB' && (this.state === 'menu' || this.state === 'results' || this.paused)) return this.openBoard();
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
    if (btn === 'install') return this.openInstall();
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
  for (const t of [0, 1]) if (q.has(`name${t}`)) A.setName(t, q.get(`name${t}`));
  if (q.has('fig0')) { A.looks[0] = A.named(0, ROSTER[+q.get('fig0')]); A.showroom.setFigure(0, A.looks[0], false); }
  if (q.has('fig1')) { A.looks[1] = A.named(1, ROSTER[+q.get('fig1')]); A.showroom.setFigure(1, A.looks[1], false); }
  if (q.has('touch')) { A.state = 'mode'; A.chooseMode('touch'); A.modeStepTwo = 1; A.chooseSeat(q.get('seat') || 'facing'); }
  const id = q.get('shot');
  if (q.has('pre')) { A.history = [{ id: 'cake', icon: '🎂', title: 'Cake Clash', w: 0, s: [3, 1] }, { id: 'goal', icon: '⚽', title: 'Goal Rush', w: 1, s: [2, 3] }]; A.series = [1, 1]; }
  if (id === 'thumbs') {
    A.toMenu();
    GAMES.forEach((_, i) => A.renderThumb(i));
    document.body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:6px;background:#333">${A.thumbs.map(u => `<img src="${u}" style="width:100%">`).join('')}</div>`;
  } else if (id === 'pause') {
    A.startGame(GAMES.find(g => g.meta.id === (q.get('game') || 'cake')));
    A.setIntroReady(0); A.setIntroReady(1);
    await step(0.6); await step(1);
    A.pause();
    await new Promise(r => setTimeout(r, 600));
  } else if (id === 'install') {
    if (q.has('touch')) { /* already in touch mode */ } else A.toMode();
    await new Promise(r => setTimeout(r, 400));
    A.openInstall();
    await new Promise(r => setTimeout(r, 600));
  } else if (id === 'icon') {
    // the home-screen icon: BLAZE vs DJ NOODLE on a split coral/teal tile (render once, saved by tools/make-icons.sh)
    document.body.innerHTML = '';
    const url = await renderIcon(+(q.get('size') || 1024), q);
    document.body.style.cssText = 'margin:0;background:#000';
    document.body.innerHTML = `<img src="${url}" style="display:block;width:100vw;height:100vh">`;
    await new Promise(r => setTimeout(r, 300));
  } else if (id === 'results') {
    A.startGame(GAMES.find(g => g.meta.id === (q.get('game') || 'cake')));
    A.setIntroReady(0); A.setIntroReady(1);
    await step(0.6); await step(3.4);
    const g = A.game;
    g.lastWinner = 0; g.wins[0] = g.rounds; g.finishMatch();
    await step(2);
    await new Promise(r => setTimeout(r, 1800));
    A.engine.render();
  } else if (id === 'board' || id === 'finale') {
    // a pretend game night so there is something to show
    const ids = ['cake', 'goal', 'kart', 'paint', 'volley', 'dance', 'cake', 'tower'];
    A.history = ids.map((g, i) => { const G = GAMES.find(x => x.meta.id === g); return { id: g, icon: G.meta.icon, title: G.meta.title, w: i === 5 ? null : i % 3 === 2 ? 1 : 0, s: [3, 1] }; });
    A.series = [A.history.filter(h => h.w === 0).length, A.history.filter(h => h.w === 1).length];
    A.toMenu();
    await step(1);
    if (id === 'board') A.openBoard(); else A.finale();
    await step(+q.get('t') || 0.5);
    await new Promise(r => setTimeout(r, 3000));
    A.engine.render();
  } else if (id === 'mode') {
    A.toMode();
    if (q.get('step') === '2') A.chooseMode('touch');
    await new Promise(r => setTimeout(r, 600));
  } else if (id === 'select') {
    A.toSelect();
    await step(1);
    await new Promise(r => setTimeout(r, 600));
  } else if (id === 'intro') {
    A.startGame(GAMES.find(g => g.meta.id === (q.get('game') || 'cake')));
    await new Promise(r => setTimeout(r, 700));
  } else if (id === 'menu') {
    A.picker = +(q.get('picker') || 0);
    A.toMenu();
    GAMES.forEach((_, i) => A.renderThumb(i));
    await step(2);
    A.menuCursor(+q.get('i') || 0, true);
    await new Promise(r => setTimeout(r, 900));
  } else {
    A.startGame(GAMES.find(g => g.meta.id === id));
    A.setIntroReady(0); A.setIntroReady(1);
    await step(0.6); await step(q.has('cd') ? +q.get('cd') : 3.3);
    for (const k of (q.get('keys') || '').split(',').filter(Boolean)) dispatchEvent(new KeyboardEvent('keydown', { code: k }));
    for (const t of [0, 1]) if (q.has(`stick${t}`)) { const [x, z] = q.get(`stick${t}`).split(',').map(Number); A.input.setStick(t, x, z); }
    await step(+q.get('t') || 1);
    A.paused = true;
    A.engine.render();
  }
  document.title = 'DONE';
}
async function renderIcon(S, q) {
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(S, S, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.NeutralToneMapping;
  r.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  scene.add(new THREE.HemisphereLight('#FFFFFF', '#E9D3C2', 1.15));
  const sun = new THREE.DirectionalLight('#FFF2E0', 2.3);
  sun.position.set(2, 5, 6);
  scene.add(sun);
  const rim = new THREE.DirectionalLight('#FFFFFF', 1.2);
  rim.position.set(0, 3, -4);
  scene.add(rim);
  const X = +(q.get('x') || 0.47), turn = +(q.get('turn') || 0.75);
  const figs = [0, 1].map(t => {
    const f = new Figure(ROSTER[t]);
    f.root.position.set(t ? X : -X, 0, 0);
    f.face(t ? -turn : turn, true);
    f.pose = 'auto';
    // fists up, leaning in: ready to rumble
    f.custom = { la: -1.45, ra: -1.25, laZ: -0.32, raZ: 0.32, lean: 0.16, headX: -0.04, headZ: t ? 0.07 : -0.07, ll: -0.25, rl: 0.18 };
    for (let i = 0; i < 60; i++) f.update(1 / 60);
    f.nextBlink = 99;
    for (const e of f.eyes) e.scale.y = 1;
    scene.add(f.root);
    return f;
  });
  void figs;
  const cam = new THREE.PerspectiveCamera(+(q.get('fov') || 30), 1, 0.1, 50);
  cam.position.set(0, +(q.get('cy') || 0.9), +(q.get('cz') || 3.45));
  cam.lookAt(0, +(q.get('ly') || 0.6), 0);
  r.render(scene, cam);

  const c = Object.assign(document.createElement('canvas'), { width: S, height: S });
  const g = c.getContext('2d');
  // split background: coral on the left, teal on the right, a white lightning seam between
  const half = (color, light, pts) => {
    const gr = g.createLinearGradient(0, 0, 0, S);
    gr.addColorStop(0, light); gr.addColorStop(1, color);
    g.fillStyle = gr;
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * S, y * S) : g.moveTo(x * S, y * S))); g.closePath(); g.fill();
  };
  const seam = [[0.6, 0], [0.47, 0.42], [0.56, 0.47], [0.4, 1]];
  half('#F04E37', '#FF8A73', [[0, 0], ...seam, [0, 1]]);
  half('#16A89B', '#4FD9CB', [...seam, [1, 1], [1, 0]]);
  g.lineJoin = 'round';
  g.strokeStyle = '#FFFFFF'; g.lineWidth = S * 0.028;
  g.beginPath(); seam.forEach(([x, y], i) => (i ? g.lineTo(x * S, y * S) : g.moveTo(x * S, y * S))); g.stroke();
  // soft spotlight + confetti dots
  const spot = g.createRadialGradient(S / 2, S * 0.45, S * 0.05, S / 2, S * 0.45, S * 0.6);
  spot.addColorStop(0, 'rgba(255,255,255,0.28)'); spot.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = spot; g.fillRect(0, 0, S, S);
  const dots = [[0.12, 0.14, '#FFC145'], [0.86, 0.1, '#FFFFFF'], [0.08, 0.5, '#FFFFFF'], [0.92, 0.55, '#FFC145'], [0.2, 0.86, '#A594F9'], [0.83, 0.88, '#FF8FB1'], [0.3, 0.08, '#FFFFFF'], [0.7, 0.22, '#A594F9']];
  for (const [x, y, col] of dots) { g.fillStyle = col; g.beginPath(); g.arc(x * S, y * S, S * 0.018, 0, 7); g.fill(); }
  // floor shadow under the figures
  const sh = g.createRadialGradient(S / 2, S * 0.9, 0, S / 2, S * 0.9, S * 0.42);
  sh.addColorStop(0, 'rgba(35,43,69,0.28)'); sh.addColorStop(1, 'rgba(35,43,69,0)');
  g.save(); g.scale(1, 0.3); g.fillStyle = sh; g.fillRect(0, S * 2.2, S, S * 1.2); g.restore();
  g.drawImage(r.domElement, 0, 0);
  // the "vs"
  const vy = +(q.get('vy') || 0.47) * S;
  g.font = `${S * 0.25}px Pacifico`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.translate(S / 2, vy); g.rotate(-0.12);
  g.lineJoin = 'round';
  g.fillStyle = '#232B45'; g.fillText('vs', S * 0.012, S * 0.03);
  g.strokeStyle = '#232B45'; g.lineWidth = S * 0.05; g.strokeText('vs', S * 0.012, S * 0.03);
  g.strokeStyle = '#FFFFFF'; g.lineWidth = S * 0.04; g.strokeText('vs', 0, 0);
  g.fillStyle = '#FFC145'; g.fillText('vs', 0, 0);
  g.restore();
  r.dispose();
  return c.toDataURL('image/png');
}

const devQuery = new URLSearchParams(location.search);
// ?debug: an on-screen log of input events and screen changes (for touch devices without a console)
if (devQuery.has('debug')) {
  const box = Object.assign(document.createElement('pre'), { style: 'position:fixed;left:50%;top:40%;transform:translate(-50%,-50%) rotate(90deg);z-index:99;background:#000c;color:#0f0;font:11px monospace;padding:6px;pointer-events:none;max-height:40vh;overflow:hidden' });
  document.body.append(box);
  const lines = [], add = t => { lines.push(`${(performance.now() / 1000).toFixed(2)} ${t}`); if (lines.length > 22) lines.shift(); box.textContent = lines.join('\n'); };
  for (const ev of ['pointerdown', 'pointerup', 'click', 'touchend']) addEventListener(ev, e => add(`${ev} ${e.pointerType ?? ''} ${e.target.className || e.target.tagName}`.slice(0, 70)), true);
  let last = '';
  setInterval(() => { const st = `${app.state}/${app.game?.state ?? ''} picker ${app.picker}`; if (st !== last) { last = st; add('STATE ' + st); } }, 50);
}
app.init().then(() => devQuery.has('shot') && devShot(devQuery)).catch(err => {
  console.error(err);
  document.querySelector('#loading p').textContent = `Couldn't start: ${err.message}. Serve the folder over http (see README).`;
});
