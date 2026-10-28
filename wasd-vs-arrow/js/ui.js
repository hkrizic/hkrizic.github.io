// Everything drawn in HTML over the 3D canvas: logo, fighter pick panels, game cards, how-to card, HUD,
// big countdown text, toasts, results, pause, the game-night scoreboard and the finale.
//
// Seating "facing each other" (tablet flat between two players at its short ends): every screen is drawn twice,
// once in each player's half and turned toward them (.ff.f0 / .ff.f1 frames), so nobody reads sideways.
// The ordinary upright copy is marked .solo; CSS shows one set or the other (body.facing).
import { $, $$, el } from './util.js';
import { TEAM } from './engine.js';
import { controlKeys } from './games/base.js';
import { DEFAULT_TOUCH } from './touch.js';

const kc = (label, team, cls = '') => `<kbd class="k${team} ${cls}">${label}</kbd>`;
const kb = html => `<span class="kb">${html}</span>`; // keyboard-only bits (hidden in touch mode)
const tch = html => `<span class="tch">${html}</span>`; // touch-only bits
// Buttons react on press, not click: on a shared tablet two players tap at the same moment, and iOS drops a
// synthesized click when another finger lands. (Pressing also feels snappier in a game.)
// A tap right after a screen switch is ignored: iOS can deliver the rest of the tap that opened a screen (or a
// quick second tap) to whatever the new screen shows at that spot.
let shownAt = 0;
const settled = () => performance.now() - shownAt > 250;
const press = (node, fn) => node.addEventListener('pointerdown', e => { if (e.button > 0 || !settled()) return; fn(e); });
export const logoHTML = () =>
  `<span class="lw">${'WASD'.split('').map((c, i) => `<kbd class="k0" style="--i:${i}">${c}</kbd>`).join('')}</span>` +
  `<span class="vs">vs</span>` +
  `<span class="lw">${'ARROW'.split('').map((c, i) => `<kbd class="k1" style="--i:${i + 4}">${c}</kbd>`).join('')}</span>`;
// long names shrink to fit the name field (it's one line)
const measure = document.createElement('canvas').getContext('2d');
function fitName(nm, name) {
  measure.font = `800 27px ${getComputedStyle(document.body).fontFamily}`;
  const w = measure.measureText(name.toUpperCase()).width, room = Math.max(120, (nm.clientWidth || 160) - 26);
  nm.style.fontSize = `${Math.max(14, Math.min(27, Math.floor(27 * room / w)))}px`;
}
// one upright copy, plus one copy per player (turned toward them) for facing seats; make(t) gets the
// viewer: null for the upright copy, 0/1 for a player's own copy
const frames = (make, cls = '') => `<div class="solo">${make(null)}</div>` + [0, 1].map(t => `<div class="ff f${t} ${cls}"><div class="ff-in">${make(t)}</div></div>`).join('');

export class UI {
  constructor(app) {
    this.app = app;
    this.root = $('#ui');
    const size = () => { document.documentElement.style.setProperty('--vw', `${innerWidth}px`); document.documentElement.style.setProperty('--vh', `${innerHeight}px`); };
    addEventListener('resize', size);
    size();
    $('#logo').innerHTML = logoHTML();
    $('#loading .logo').innerHTML = logoHTML();
    $('#mode .logo').innerHTML = logoHTML();
    press($('#mode'), e => {
      const c = e.target.closest('[data-mode]'), seat = e.target.closest('[data-seat]');
      if (c) app.chooseMode(c.dataset.mode);
      if (seat) app.chooseSeat(seat.dataset.seat);
    });
    press($('#intro'), e => {
      if (e.target.closest('.ic-back')) return app.toMenu();
      const r = e.target.closest('.ic-ready');
      if (r) app.onInput({ type: 'press', player: r.closest('.t1') ? 1 : 0, action: 'up', mouse: true });
    });
    press($('#results'), e => {
      const b = e.target.closest('[data-act]');
      if (b) app.onInput({ type: 'press', player: 0, action: b.dataset.act, mouse: true });
    });
    press($('#pause'), e => {
      const b = e.target.closest('[data-act]');
      if (b) app.pauseAction(b.dataset.act);
    });
    press($('#board'), e => {
      const b = e.target.closest('[data-act]');
      if (b) app.boardAction(b.dataset.act);
    });
    press($('#finale'), e => {
      const b = e.target.closest('[data-act]');
      if (b) app.finaleAction(b.dataset.act);
    });
    press($('#menu'), e => {
      if (e.target.closest('.menu-back')) app.onInput({ type: 'press', player: 0, action: 'down', mouse: true });
      if (e.target.closest('.series')) app.openBoard();
    });
    press($('#hud'), e => { if (e.target.closest('.hud-pause')) app.pause(); });

    // fighter pick: the upright panels (placed under the boxes) and one per player for facing seats
    const hint = $('#select .select-hint').innerHTML;
    for (const t of [0, 1]) $('#select').insertAdjacentHTML('beforeend', `<div class="ff f${t}"><div class="pick" data-team="${t}"></div><p class="select-hint">${hint}</p></div>`);
    for (const p of $$('#select .pick')) {
      const t = +p.dataset.team, T = TEAM[t], d = T.dirs;
      p.innerHTML = `
        <div class="pick-team">${T.long}</div>
        <div class="pick-name"><button class="arr" data-act="left">${kb(kc(d.left, t))}${tch('◀')}</button><label class="nm-wrap"><input class="nm" maxlength="12" spellcheck="false" autocomplete="off" autocorrect="off" enterkeyhint="done" aria-label="Your name"><i class="nm-edit">✎</i></label><button class="arr" data-act="right">${kb(kc(d.right, t))}${tch('▶')}</button></div>
        <div class="pick-no"></div>
        <div class="pick-keys">
          <button data-act="down">${kb(kc(d.down, t))}${tch('🎲')} shuffle</button>
          <button data-act="up" class="go">${kb(kc(d.up, t))}${tch('✓')} ready!</button>
        </div>
        <div class="pick-ready">READY!</div>`;
      press(p, e => {
        const b = e.target.closest('[data-act]');
        if (b) app.onInput({ type: 'press', player: t, action: b.dataset.act, mouse: true });
      });
      // the name is a real text field: tap it to type your own (empty = the figure's own name)
      const nm = $('.nm', p);
      nm.addEventListener('focus', () => { nm.select(); p.classList.add('editing'); nm.style.fontSize = '22px'; });
      nm.addEventListener('keydown', e => {
        if (e.key === 'Enter') nm.blur();
        if (e.key === 'Escape') { nm.value = nm.dataset.was ?? ''; nm.blur(); }
        e.stopPropagation();
      });
      nm.addEventListener('blur', () => {
        p.classList.remove('editing');
        if (nm.value.trim().toUpperCase() !== (nm.dataset.was ?? '')) app.setName(t, nm.value);
        else fitName(nm, nm.value);
      });
    }
    // HUD: each player's badge and the scores, along their own edge
    const mid = $('#hud .hud-mid');
    for (const t of [0, 1]) {
      const f = el('div', `ff f${t}`, `<div class="hud-face"><div class="hud-p p${t}"></div></div>`);
      const m = mid.cloneNode(true);
      m.classList.remove('solo');
      $('.hud-face', f).append(m);
      $('#hud').append(f);
    }
    for (const id of ['big', 'toasts']) $(`#${id}`).innerHTML = frames(() => '<div class="tx"></div>');
    press($('#install'), e => {
      const b = e.target.closest('[data-act]');
      if (b) app.installAction(b.dataset.act);
      else if (e.target === $('#install')) app.installAction('close');
    });
    press($('#mode .install-pill'), () => app.openInstall());
    press($('#corner'), e => {
      const b = e.target.closest('button');
      if (b) app.corner(b.dataset.btn);
    });
  }

  show(...names) {
    if (names[0] !== this.root.dataset.screen) shownAt = performance.now();
    for (const s of $$('.screen')) s.classList.toggle('on', names.includes(s.id));
    this.root.dataset.screen = names[0] ?? '';
  }
  // seating changed: copies that were hidden have never been measured, so lay the carousels out again
  applyFacing(on) {
    document.body.classList.toggle('facing', on);
    this.menuCursor(this.app.cursor);
  }
  loading(f) { $('#loading .bar i').style.width = `${Math.round(f * 100)}%`; }
  setCorner(settings) {
    $('#corner [data-btn="music"]').classList.toggle('off', !settings.music);
    $('#corner [data-btn="sfx"]').classList.toggle('off', !settings.sfx);
  }

  // ---------- fighter select ----------
  updatePick(t, look, ready) {
    for (const p of $$(`#select .pick[data-team="${t}"]`)) {
      const nm = $('.nm', p);
      if (document.activeElement !== nm) nm.value = look.name;
      fitName(nm, look.name);
      nm.dataset.was = look.name;
      const fig = look.no ? `No. ${String(look.no).padStart(2, '0')} of ${this.app.rosterSize}` : 'One-of-a-kind figure';
      $('.pick-no', p).textContent = look.figName && look.figName !== look.name ? `${look.figName} · ${fig}` : fig;
      p.classList.toggle('ready', !!ready);
      $('.nm', p).classList.remove('pop'); void p.offsetWidth; $('.nm', p).classList.add('pop');
    }
  }
  // step 1: keyboard or touch · step 2 (touch): how the players sit
  modeStep(step, seat) {
    $('#mode').classList.toggle('step2', step === 2);
    $$('#mode [data-seat]').forEach(c => c.classList.toggle('sel', c.dataset.seat === seat));
  }
  // the upright panels sit right under each box
  placePick(t, x, y) {
    const p = $(`#select .pick.solo[data-team="${t}"]`);
    p.style.left = `${x}px`;
    p.style.top = `${Math.min(y, innerHeight - p.offsetHeight - 72)}px`; // keep clear of the hint at the bottom
  }

  // ---------- game menu ----------
  // a carousel: the selected card slides to the middle (one per player when facing each other)
  buildMenu(games, thumbs, partySize) {
    const meta = m => (m.rounds > 1 ? `First to ${m.rounds}` : 'One round');
    const card = (G, i) => {
      const m = G.meta;
      return `<button class="card" data-i="${i}" style="--c:${m.color};--ink:${m.ink}${m.accent ? `;--accent:${m.accent}` : ''}">
        <div class="thumb"><img src="${thumbs[i] ?? ''}" alt=""><span class="icon">${m.icon}</span></div>
        <div class="card-body"><h3>${m.title}</h3><p>${m.tagline}</p><div class="card-meta">${meta(m)}</div></div></button>`;
    };
    const party = `<button class="card party" data-i="${games.length}">
      <div class="thumb"><div class="party-art">${games.slice(0, 9).map(G => `<span>${G.meta.icon}</span>`).join('')}</div></div>
      <div class="card-body"><h3>Party Mode</h3><p>${partySize} random games in a row. Most wins takes the crown!</p><div class="card-meta">${partySize} games · ~${partySize * 2} min</div></div></button>`;
    // facing each other: ONE list, turned toward whoever picks this time (full depth of the table), and a small
    // note at the other player's edge; the pick alternates from game to game
    $('#menu').innerHTML = frames(t => `<div class="menu-in" data-axis="${t == null ? 'x' : t ? '-y' : 'y'}">
      <div class="menu-head"><h2>Choose a game</h2><button class="menu-back">↩ Figures</button><button class="series"></button></div>
      <div class="cards"><div class="track">${games.map(card).join('')}${party}</div><button class="nav prev" aria-label="Previous">‹</button><button class="nav next" aria-label="Next">›</button></div>
      <div class="count"></div>
      <div class="menu-foot tch"><span>Swipe to browse · tap a game · tap it again to play</span></div>
      <div class="menu-foot kb">
        <span><kbd class="k0">A</kbd><kbd class="k0">D</kbd> / <kbd class="k1">←</kbd><kbd class="k1">→</kbd> choose</span>
        <span><kbd class="k0">W</kbd> / <kbd class="k1">↑</kbd> play</span>
        <span><kbd class="k0">S</kbd> / <kbd class="k1">↓</kbd> figures</span>
        <span><kbd>B</kbd> scoreboard</span>
      </div></div>`, 'full') + [0, 1].map(t => `<div class="ff f${t} wait"><div class="menu-wait"><b></b><span>You pick the next game!</span><button class="series"></button></div></div>`).join('');
    for (const menu of $$('#menu .menu-in')) this.bindCarousel(menu);
    addEventListener('resize', () => this.menuCursor(this.app.cursor));
  }
  bindCarousel(menu) {
    const cards = $('.cards', menu), axis = menu.dataset.axis;
    // a turned copy slides along the screen's y axis
    const along = e => (axis === 'x' ? e.clientX : axis === 'y' ? e.clientY : -e.clientY);
    const tapCard = target => {
      const c = target.closest('.card');
      if (!c) return;
      if (+c.dataset.i === this.app.cursor) this.app.menuSelect();
      else this.app.menuCursor(+c.dataset.i);
    };
    press(cards, e => {
      if (e.target.closest('.prev')) this.app.menuCursor(this.app.cursor - 1);
      if (e.target.closest('.next')) this.app.menuCursor(this.app.cursor + 1);
    });
    let wheelAt = 0;
    cards.onwheel = e => {
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 8 || performance.now() - wheelAt < 160) return;
      wheelAt = performance.now();
      this.app.menuCursor(this.app.cursor + Math.sign(d));
    };
    // swipe: drag the track with a finger (or mouse); a short drag still counts as a tap
    let drag = null;
    cards.addEventListener('pointerdown', e => {
      if (e.target.closest('.nav') || !settled()) return;
      drag = { x: along(e), start: this.app.cursor, moved: false, id: e.pointerId, target: e.target };
    });
    cards.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = along(e) - drag.x;
      if (Math.abs(dx) > 12) drag.moved = true;
      const w = ($('.card', menu)?.offsetWidth ?? 220) * 0.7;
      const n = $$('.card', menu).length;
      const target = Math.max(0, Math.min(n - 1, drag.start - Math.round(dx / w)));
      if (drag.moved && target !== this.app.cursor) this.app.menuCursor(target);
    });
    const endDrag = e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved && e.type === 'pointerup' && drag.target) tapCard(drag.target);
      drag = null;
    };
    cards.addEventListener('pointerup', endDrag);
    cards.addEventListener('pointercancel', endDrag);
  }
  updateThumb(i, url) {
    if (!url) return;
    for (const track of $$('#menu .track')) { const img = $$('.card img', track)[i]; if (img) img.src = url; }
  }
  menuCursor(i) {
    for (const menu of $$('#menu .menu-in')) {
      const cards = $$('.card', menu);
      cards.forEach((c, k) => { c.classList.toggle('sel', k === i); c.classList.toggle('far', Math.abs(k - i) > 2); });
      const sel = cards[i], track = $('.track', menu), box = $('.cards', menu);
      if (!sel || !track) continue;
      // centre the selected card (offsetLeft ignores the card's own hover/selected transform)
      track.style.transform = `translateX(${box.clientWidth / 2 - (sel.offsetLeft + sel.offsetWidth / 2)}px)`;
      $('.count', menu).innerHTML = cards.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    }
  }
  // facing each other: whose turn it is to pick
  menuPicker(p, looks) {
    $('#menu').dataset.picker = p;
    for (const t of [0, 1]) {
      $(`#menu .ff.full.f${t} .menu-head h2`).textContent = `🎲 ${looks[t].name}, pick a game!`;
      $(`#menu .ff.wait.f${t} .menu-wait b`).textContent = `${looks[1 - t].name} is picking a game…`;
    }
  }
  series(s, looks) {
    for (const b of $$('#menu .series')) b.innerHTML = `🏆 <b class="t0">${looks[0].name}</b> <span class="sc">${s[0]} – ${s[1]}</span> <b class="t1">${looks[1].name}</b>`;
  }

  // ---------- how-to card ----------
  showIntro(meta, looks, party) {
    const touch = this.app.input.mode === 'touch';
    const tc = meta.touch ?? DEFAULT_TOUCH;
    const ARROWS = { up: '▲', down: '▼', left: '◀', right: '▶' };
    // the controls each player gets on their half of the screen
    const touchRows = () => [
      tc.stick ? `<div class="ic-row"><span class="ic-keys"><i class="ic-stick"></i></span><span>${tc.stick}</span></div>` : '',
      tc.button ? `<div class="ic-row"><span class="ic-keys"><i class="ic-btn">${tc.button[0]}</i></span><span>${tc.button[2] ?? ''}</span></div>` : '',
      tc.pads ? `<div class="ic-row"><span class="ic-keys">${Object.entries(tc.pads).map(([d, l]) => `<i class="ic-pad">${l && l !== ARROWS[d] ? l : ARROWS[d]}</i>`).join('')}</span><span>${tc.tip ?? ''}</span></div>` : '',
      tc.tip && !tc.pads ? `<div class="ic-row ic-tip">${tc.tip}</div>` : '',
    ].join('');
    const col = t => `
      <div class="ic-team t${t}">
        <div class="ic-who">${TEAM[t].long}<b>${looks[t].name}</b></div>
        ${touch ? touchRows() : meta.controls.map(([kind, label]) => `<div class="ic-row"><span class="ic-keys">${controlKeys(kind, t).map(k => kc(k, t)).join('')}</span><span>${label}</span></div>`).join('')}
        <div class="ic-ready">${touch ? 'Tap: ' : kc(TEAM[t].dirs.up, t)} I'm ready!</div>
      </div>`;
    // a player's own copy (facing seats) shows just their controls, and whether the rival is ready yet
    $('#intro').innerHTML = frames(v => `
      <div class="intro-card" style="--c:${meta.color};--ink:${meta.ink}">
        ${party ? `<div class="ic-party">🎉 Party Mode · Game ${party.index + 1} of ${party.order.length}</div>` : ''}
        <div class="ic-head"><span class="ic-icon">${meta.icon}</span><h2>${meta.title}</h2></div>
        <p class="ic-goal">${touch && meta.touchGoal ? meta.touchGoal : meta.goal}</p>
        ${v == null ? `<div class="ic-cols">${col(0)}<div class="ic-vs">vs</div>${col(1)}</div>` : `<div class="ic-cols one">${col(v)}</div>
        <div class="ic-other t${1 - v}">${looks[1 - v].name} <b>is getting ready…</b></div>`}
        <div class="ic-foot">${touch ? `${v == null ? 'Both tap <b>I\'m ready</b> to start · ' : ''}<button class="ic-back">↩ Back to menu</button>` : 'Both press <b>UP</b> to start · <kbd>Esc</kbd> back to menu'}</div>
      </div>`);
  }
  introReady(t) {
    $$(`#intro .ic-team.t${t}`).forEach(e => e.classList.add('ready'));
    $$(`#intro .ic-other.t${t}`).forEach(e => { e.classList.add('ready'); $('b', e).textContent = 'is ready ✓'; });
  }

  // ---------- HUD ----------
  setupHud(meta, looks, portraits, rounds) {
    const side = t => `
      <img class="hp-face" src="${portraits[t] ?? ''}" alt="">
      <div class="hp-txt"><b>${looks[t].name}</b><span>${TEAM[t].long}</span></div>
      <div class="hp-pips">${Array.from({ length: rounds }, () => '<i></i>').join('')}</div>`;
    for (const t of [0, 1]) $$(`#hud .p${t}`).forEach(e => { e.innerHTML = side(t); $('.hp-pips', e).hidden = rounds < 2; });
    for (const m of $$('#hud .hud-mid')) {
      $('.hud-title', m).textContent = `${meta.icon} ${meta.title}`;
      m.dataset.mode = meta.id;
      m.dataset.show = (meta.hud ?? []).join(' ');
      $('.hud-timer', m).textContent = '';
    }
    this.hudScores(0, 0);
    this.hudBar(0, 0);
    this.hudTrack(0, 0);
  }
  hudWins(wins) {
    for (const t of [0, 1]) for (const p of $$(`#hud .p${t}`)) $$('.hp-pips i', p).forEach((i, k) => i.classList.toggle('on', k < wins[t]));
  }
  hudTimer(s) {
    const txt = s > 0 ? String(Math.ceil(s)) : '0';
    for (const e of $$('#hud .hud-timer')) if (e.textContent !== txt) { e.textContent = txt; e.classList.toggle('hurry', s <= 10); }
  }
  hudBar(a, b) {
    for (const bar of $$('#hud .hud-bar')) {
      $('.b0', bar).style.width = `${a * 100}%`;
      $('.b1', bar).style.width = `${b * 100}%`;
      $('.l0', bar).textContent = `${Math.round(a * 100)}%`;
      $('.l1', bar).textContent = `${Math.round(b * 100)}%`;
    }
  }
  // two big numbers (or short strings like "2/3") under the title
  hudScores(a, b) {
    for (const [cls, v] of [['s0', a], ['s1', b]]) {
      for (const e of $$(`#hud .hud-scores .${cls}`)) if (e.textContent !== String(v)) { e.textContent = v; e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
    }
  }
  // a blank overlay for game-specific HTML (cleared when the game ends)
  get layer() { return $('#layer'); }
  clearLayer() { $('#layer').innerHTML = ''; }
  hudTrack(a, b) {
    for (const tr of $$('#hud .hud-track')) {
      $('.r0', tr).style.left = `${Math.min(1, a) * 100}%`;
      $('.r1', tr).style.left = `${Math.min(1, b) * 100}%`;
    }
  }

  // ---------- transient text (a copy for each viewer) ----------
  big(text, kind = '') {
    for (const box of $$('#big .tx')) {
      const b = el('div', `bigtxt ${kind}`, text);
      box.append(b);
      setTimeout(() => b.remove(), kind.startsWith('num') ? 700 : kind === 'round' ? 950 : 1700);
    }
  }
  toast(text, kind = '') {
    for (const box of $$('#toasts .tx')) {
      const t = el('div', `toast ${kind}`, text);
      box.append(t);
      setTimeout(() => t.classList.add('out'), 1800);
      setTimeout(() => t.remove(), 2300);
    }
  }
  clearTransient() { $$('#big .tx, #toasts .tx').forEach(e => { e.innerHTML = ''; }); }

  // ---------- results ----------
  showResults({ winner, looks, portraits, score, meta, series, party }) {
    const w = winner;
    const next = !party ? 'Rematch' : party.index < party.order.length ? 'Next game' : party.champion == null ? 'Sudden death!' : 'Play again';
    let partyHTML = '';
    if (party) {
      partyHTML = `<div class="rs-party"><span class="t0">${looks[0].name} ${'🏆'.repeat(party.wins[0]) || '–'}</span><span class="t1">${'🏆'.repeat(party.wins[1]) || '–'} ${looks[1].name}</span></div>`;
    }
    const champion = party?.champion;
    const title = champion != null ? 'PARTY CHAMPION!' : w == null ? "IT'S A DRAW" : 'WINS!';
    const who = champion != null ? champion : w;
    $('#results').innerHTML = frames(() => `
      <div class="rs-card ${who != null ? `t${who}` : ''}">
        ${who != null ? `<img class="rs-face" src="${portraits[who] ?? ''}" alt="">` : ''}
        <div class="rs-name">${who != null ? looks[who].name : ''}</div>
        <div class="rs-title">${title}</div>
        <div class="rs-score"><span class="t0">${score[0]}</span><i>${meta.icon} ${meta.title}</i><span class="t1">${score[1]}</span></div>
        ${partyHTML}
        <button class="rs-series" data-act="board">🏆 Game night: <b class="t0">${series[0]}</b> – <b class="t1">${series[1]}</b> · scoreboard${kb(' <kbd>B</kbd>')}</button>
        <div class="rs-actions">
          <button data-act="up">${kb(kc('W', 0) + kc('↑', 1))} ${next}</button>
          <button data-act="down">${kb(kc('S', 0) + kc('↓', 1))} Menu</button>
        </div>
      </div>`);
  }

  showPause() {
    $('#pause').innerHTML = frames(() => `
      <div class="pause-card">
        <h2>Paused</h2>
        <button data-act="resume">${kb('<kbd>Esc</kbd>')} ▶ Resume</button>
        <button data-act="restart">${kb('<kbd>R</kbd>')} ↻ Restart game</button>
        <button data-act="quit">${kb('<kbd>Q</kbd>')} ↩ Quit to menu</button>
        <button data-act="board">${kb('<kbd>B</kbd>')} 🏆 Game night scoreboard</button>
        ${this.app.input.mode === 'touch' ? `<button data-act="seat">⇄ Seating: ${this.app.seat === 'facing' ? 'facing each other' : 'side by side'}</button>` : ''}
        <div class="pause-sound"><button data-act="music">♫ Music</button><button data-act="sfx">🔊 Sounds</button></div>
      </div>`);
  }

  // ---------- game night scoreboard ----------
  showBoard({ looks, portraits, series, history, stats }) {
    const lead = series[0] === series[1] ? null : series[0] > series[1] ? 0 : 1;
    const total = Math.max(1, series[0] + series[1]);
    const chips = history.length
      ? history.map(h => `<i class="${h.w == null ? 'd' : `t${h.w}`}" title="${h.title}">${h.icon}</i>`).join('')
      : '<span class="bd-empty">No games yet tonight. Go play one!</span>';
    const streak = stats.streak ? `Best streak: <b class="t${stats.streak.t}">${looks[stats.streak.t].name} ×${stats.streak.n}</b>` : '';
    $('#board').innerHTML = frames(() => `
      <div class="bd-card ${lead != null ? `lead${lead}` : ''}">
        <div class="bd-head"><span>🏆</span><h2>Game night</h2></div>
        <div class="bd-score">
          ${[0, 1].map(t => `<div class="bd-p t${t}"><img src="${portraits[t] ?? ''}" alt=""><b>${looks[t].name}</b>${lead === t ? '<span class="bd-crown">👑</span>' : ''}</div>`).join('<div class="bd-num"><span class="t0">' + series[0] + '</span><i>–</i><span class="t1">' + series[1] + '</span></div>')}
        </div>
        <div class="bd-bar"><i class="b0" style="width:${(series[0] / total) * 100}%"></i><i class="b1" style="width:${(series[1] / total) * 100}%"></i></div>
        <div class="bd-stats">${history.length} game${history.length === 1 ? '' : 's'} played${stats.draws ? ` · ${stats.draws} draw${stats.draws > 1 ? 's' : ''}` : ''}${streak ? ` · ${streak}` : ''}</div>
        <div class="bd-hist">${chips}</div>
        <div class="bd-actions">
          <button data-act="close">▶ Keep playing</button>
          <button data-act="reset">↺ Restart score</button>
          <button data-act="end" class="end"${history.length ? '' : ' disabled'}>🏁 End here · crown the winner</button>
        </div>
        <div class="bd-keys kb"><kbd class="k0">A</kbd><kbd class="k0">D</kbd>/<kbd class="k1">←</kbd><kbd class="k1">→</kbd> choose · <kbd class="k0">W</kbd>/<kbd class="k1">↑</kbd> select · <kbd>Esc</kbd> back</div>
      </div>`);
    $('#board').classList.add('on');
  }
  hideBoard() { $('#board').classList.remove('on'); }
  boardFocus(i) { $$('#board .bd-actions').forEach(a => $$('button', a).forEach((b, k) => b.classList.toggle('focus', k === i))); }
  armReset(on) {
    for (const b of $$('#board [data-act="reset"]')) { b.classList.toggle('armed', on); b.textContent = on ? '⚠ Tap again to reset' : '↺ Restart score'; }
  }

  // ---------- add to home screen ----------
  // iPad/iPhone Safari can't be asked programmatically, so show the two taps; Chrome/Edge/Android get a real
  // install button (beforeinstallprompt). Served from a Mac on the LAN: remind that the Mac must keep serving.
  showInstall({ canPrompt }) {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const macSafari = !ios && /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
    const share = '<svg viewBox="0 0 24 24" class="in-ico"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 11H5.5A1.5 1.5 0 0 0 4 12.5v7A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    const plus = '<svg viewBox="0 0 24 24" class="in-ico"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    let steps;
    if (canPrompt) steps = `<button class="in-go" data-act="prompt">📲 Install WASD vs ARROW</button>`;
    else if (ios) steps = `<ol class="in-steps">
        <li><span class="n">1</span>Tap <b class="in-chip">${share} Share</b> in Safari's toolbar</li>
        <li><span class="n">2</span>Choose <b class="in-chip">${plus} Add to Home Screen</b></li>
        <li><span class="n">3</span>Tap <b>Add</b>. Done!</li></ol>`;
    else if (macSafari) steps = `<ol class="in-steps"><li><span class="n">1</span>In the menu bar choose <b>File → Add to Dock…</b></li><li><span class="n">2</span>Click <b>Add</b></li></ol>`;
    else steps = `<ol class="in-steps"><li><span class="n">1</span>Open the browser menu <b>⋮</b></li><li><span class="n">2</span>Choose <b>Install app</b> or <b>Add to Home screen</b></li></ol>`;
    const host = location.hostname, local = host === 'localhost' || host === '127.0.0.1';
    const lan = /\.local$|^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(host);
    const note = local && !ios ? 'To get it on an iPad: start the game on this Mac with <code>./serve.sh --lan</code> and open the address it prints in Safari on the iPad, then add it there.'
      : lan ? 'The game is served by your Mac: keep <code>./serve.sh --lan</code> running while you play.' : '';
    $('#install').innerHTML = `
      <div class="in-card">
        <button class="in-x" data-act="close" aria-label="Close">✕</button>
        <img class="in-icon" src="assets/icon-512.png" alt="WASD vs ARROW icon">
        <h2>Put it on your home screen</h2>
        <p class="in-sub">It opens full-screen like a real app, with this icon.</p>
        ${steps}
        ${note ? `<p class="in-note">${note}</p>` : ''}
      </div>`;
    $('#install').classList.add('on');
  }
  hideInstall() { $('#install').classList.remove('on'); }

  // ---------- finale: the champion of the night ----------
  showFinale({ winner, looks, series, stats }) {
    const w = winner;
    const fav = stats.fav ? `Favourite win: ${stats.fav.icon} ${stats.fav.title}${stats.fav.n > 1 ? ` ×${stats.fav.n}` : ''}` : '';
    $('#finale').innerHTML = frames(() => `
      <div class="fn ${w != null ? `t${w}` : 'tie'}">
        <div class="fn-kicker">${w != null ? '🏆 Champion of the game night' : '🤝 What a night: it\'s a tie!'}</div>
        <div class="fn-name">${w != null ? looks[w].name : `${looks[0].name} <i>&amp;</i> ${looks[1].name}`}</div>
        <div class="fn-score"><span class="t0" data-to="${series[0]}">0</span><i>–</i><span class="t1" data-to="${series[1]}">0</span></div>
        <div class="fn-stats">${stats.games} games${stats.streak ? ` · best streak ${looks[stats.streak.t].name} ×${stats.streak.n}` : ''}${fav ? ` · ${fav}` : ''}</div>
        <div class="fn-actions">
          <button data-act="again">${kb(kc('W', 0) + kc('↑', 1))} ▶ New game night</button>
          <button data-act="figures">${kb(kc('S', 0) + kc('↓', 1))} ↩ New figures</button>
        </div>
      </div>`);
    // count the final score up
    const t0 = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0 - 900) / 1200);
      for (const s of $$('#finale .fn-score span')) s.textContent = Math.round(Math.max(0, k) * +s.dataset.to);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => $$('#finale .fn').forEach(f => f.classList.add('ready')), 2600);
  }
}
