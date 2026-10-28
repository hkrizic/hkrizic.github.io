// Everything drawn in HTML over the 3D canvas: logo, fighter pick panels, game cards, how-to card, HUD,
// big countdown text, toasts, results and pause screens.
import { $, $$, el } from './util.js';
import { TEAM } from './engine.js';
import { controlKeys } from './games/base.js';
import { DEFAULT_TOUCH } from './touch.js';

const kc = (label, team, cls = '') => `<kbd class="k${team} ${cls}">${label}</kbd>`;
const kb = html => `<span class="kb">${html}</span>`; // keyboard-only bits (hidden in touch mode)
const tch = html => `<span class="tch">${html}</span>`; // touch-only bits
// Buttons react on press, not click: on a shared tablet two players tap at the same moment, and iOS drops a
// synthesized click when another finger lands. (Pressing also feels snappier in a game.)
const press = (node, fn) => node.addEventListener('pointerdown', e => { if (e.button > 0) return; fn(e); });
export const logoHTML = () =>
  `<span class="lw">${'WASD'.split('').map((c, i) => `<kbd class="k0" style="--i:${i}">${c}</kbd>`).join('')}</span>` +
  `<span class="vs">vs</span>` +
  `<span class="lw">${'ARROW'.split('').map((c, i) => `<kbd class="k1" style="--i:${i + 4}">${c}</kbd>`).join('')}</span>`;

export class UI {
  constructor(app) {
    this.app = app;
    this.root = $('#ui');
    $('#logo').innerHTML = logoHTML();
    $('#loading .logo').innerHTML = logoHTML();
    $('#mode .logo').innerHTML = logoHTML();
    press($('#mode'), e => { const c = e.target.closest('[data-mode]'); if (c) app.chooseMode(c.dataset.mode); });
    press($('#hud .hud-pause'), () => app.pause());
    press($('#menu .menu-back'), () => app.onInput({ type: 'press', player: 0, action: 'down', mouse: true }));
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
    // fighter pick panels
    for (const t of [0, 1]) {
      const T = TEAM[t], d = T.dirs;
      const p = $(`.pick[data-team="${t}"]`);
      p.innerHTML = `
        <div class="pick-team">${T.long}</div>
        <div class="pick-name"><button class="arr" data-act="left">${kb(kc(d.left, t))}${tch('◀')}</button><b class="nm"></b><button class="arr" data-act="right">${kb(kc(d.right, t))}${tch('▶')}</button></div>
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
    }
    press($('#corner'), e => {
      const b = e.target.closest('button');
      if (b) app.corner(b.dataset.btn);
    });
    this.big$ = $('#big');
    this.toasts$ = $('#toasts');
  }

  show(...names) {
    for (const s of $$('.screen')) s.classList.toggle('on', names.includes(s.id));
    this.root.dataset.screen = names[0] ?? '';
  }
  loading(f) { $('#loading .bar i').style.width = `${Math.round(f * 100)}%`; }
  setCorner(settings) {
    $('#corner [data-btn="music"]').classList.toggle('off', !settings.music);
    $('#corner [data-btn="sfx"]').classList.toggle('off', !settings.sfx);
  }

  // ---------- fighter select ----------
  updatePick(t, look, ready) {
    const p = $(`.pick[data-team="${t}"]`);
    $('.nm', p).textContent = look.name;
    $('.pick-no', p).textContent = look.no ? `No. ${String(look.no).padStart(2, '0')} of 12` : 'One-of-a-kind custom figure';
    p.classList.toggle('ready', !!ready);
    $('.nm', p).classList.remove('pop'); void p.offsetWidth; $('.nm', p).classList.add('pop');
  }
  placePick(t, x, y) {
    const p = $(`.pick[data-team="${t}"]`);
    p.style.left = `${x}px`;
    p.style.top = `${Math.min(y, innerHeight - p.offsetHeight - 72)}px`; // keep clear of the hint at the bottom
  }

  // ---------- game menu ----------
  // a carousel: the selected card slides to the middle
  buildMenu(games, thumbs, partySize) {
    const cards = $('#menu .cards');
    cards.innerHTML = '<div class="track"></div><button class="nav prev" aria-label="Previous">‹</button><button class="nav next" aria-label="Next">›</button>';
    const track = $('.track', cards);
    const meta = m => (m.rounds > 1 ? `First to ${m.rounds}` : 'One round');
    games.forEach((G, i) => {
      const m = G.meta;
      const c = el('button', 'card', `
        <div class="thumb"><img src="${thumbs[i] ?? ''}" alt=""><span class="icon">${m.icon}</span></div>
        <div class="card-body"><h3>${m.title}</h3><p>${m.tagline}</p>
        <div class="card-meta">${meta(m)}</div></div>`);
      c.style.setProperty('--c', m.color);
      c.style.setProperty('--ink', m.ink);
      if (m.accent) c.style.setProperty('--accent', m.accent);
      c.dataset.i = i;
      track.append(c);
    });
    const party = el('button', 'card party', `
      <div class="thumb"><div class="party-art">${games.slice(0, 9).map(G => `<span>${G.meta.icon}</span>`).join('')}</div></div>
      <div class="card-body"><h3>Party Mode</h3><p>${partySize} random games in a row. Most wins takes the crown!</p><div class="card-meta">${partySize} games · ~${partySize * 2} min</div></div>`);
    party.dataset.i = games.length;
    track.append(party);
    $('#menu .count').textContent = '';
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
      if (e.target.closest('.nav')) return;
      drag = { x: e.clientX, start: this.app.cursor, moved: false, id: e.pointerId, target: e.target };
    });
    cards.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 12) drag.moved = true;
      const w = ($('#menu .card')?.offsetWidth ?? 220) * 0.7;
      const n = $$('#menu .card').length;
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
    addEventListener('resize', () => this.menuCursor(this.app.cursor));
  }
  updateThumb(i, url) { const img = $$('#menu .card img')[i]; if (img && url) img.src = url; }
  menuCursor(i) {
    const cards = $$('#menu .card');
    cards.forEach((c, k) => { c.classList.toggle('sel', k === i); c.classList.toggle('far', Math.abs(k - i) > 2); });
    const sel = cards[i], track = $('#menu .track');
    if (!sel || !track) return;
    // centre the selected card (offsetLeft ignores the card's own hover/selected transform)
    const x = innerWidth / 2 - (sel.offsetLeft + sel.offsetWidth / 2);
    track.style.transform = `translateX(${x}px)`;
    const total = cards.length;
    $('#menu .count').innerHTML = `${cards.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}`;
    $('#menu .count').dataset.n = `${i + 1} / ${total}`;
  }
  series(s, looks) {
    $('#menu .series').innerHTML = `<b class="t0">${looks[0].name}</b> <span class="sc">${s[0]} – ${s[1]}</span> <b class="t1">${looks[1].name}</b>`;
  }

  // ---------- how-to card ----------
  showIntro(meta, looks, party) {
    const touch = this.app.input.mode === 'touch';
    const tc = meta.touch ?? DEFAULT_TOUCH;
    const ARROWS = { up: '▲', down: '▼', left: '◀', right: '▶' };
    // the controls each player gets on their half of the screen
    const touchRows = t => [
      tc.stick ? `<div class="ic-row"><span class="ic-keys"><i class="ic-stick"></i></span><span>${tc.stick}</span></div>` : '',
      tc.button ? `<div class="ic-row"><span class="ic-keys"><i class="ic-btn">${tc.button[0]}</i></span><span>${tc.button[2] ?? ''}</span></div>` : '',
      tc.pads ? `<div class="ic-row"><span class="ic-keys">${Object.entries(tc.pads).map(([d, l]) => `<i class="ic-pad">${l && l !== ARROWS[d] ? l : ARROWS[d]}</i>`).join('')}</span><span>${tc.tip ?? ''}</span></div>` : '',
      tc.tip && !tc.pads ? `<div class="ic-row ic-tip">${tc.tip}</div>` : '',
    ].join('');
    const col = t => `
      <div class="ic-team t${t}">
        <div class="ic-who">${TEAM[t].long}<b>${looks[t].name}</b></div>
        ${touch ? touchRows(t) : meta.controls.map(([kind, label]) => `<div class="ic-row"><span class="ic-keys">${controlKeys(kind, t).map(k => kc(k, t)).join('')}</span><span>${label}</span></div>`).join('')}
        <div class="ic-ready">${touch ? 'Tap: ' : kc(TEAM[t].dirs.up, t)} I'm ready!</div>
      </div>`;
    $('#intro').innerHTML = `
      <div class="intro-card" style="--c:${meta.color};--ink:${meta.ink}">
        ${party ? `<div class="ic-party">🎉 Party Mode · Game ${party.index + 1} of ${party.order.length}</div>` : ''}
        <div class="ic-head"><span class="ic-icon">${meta.icon}</span><h2>${meta.title}</h2></div>
        <p class="ic-goal">${touch && meta.touchGoal ? meta.touchGoal : meta.goal}</p>
        <div class="ic-cols">${col(0)}<div class="ic-vs">vs</div>${col(1)}</div>
        <div class="ic-foot">${touch ? 'Both tap <b>I\'m ready</b> to start · <button class="ic-back">↩ Back to menu</button>' : 'Both press <b>UP</b> to start · <kbd>Esc</kbd> back to menu'}</div>
      </div>`;
  }
  introReady(t) { $(`#intro .ic-team.t${t}`)?.classList.add('ready'); }

  // ---------- HUD ----------
  setupHud(meta, looks, portraits, rounds) {
    const side = t => `
      <img class="hp-face" src="${portraits[t] ?? ''}" alt="">
      <div class="hp-txt"><b>${looks[t].name}</b><span>${TEAM[t].long}</span></div>
      <div class="hp-pips">${Array.from({ length: rounds }, () => '<i></i>').join('')}</div>`;
    $('#hud .p0').innerHTML = side(0);
    $('#hud .p1').innerHTML = side(1);
    $('#hud .hud-title').textContent = `${meta.icon} ${meta.title}`;
    $('#hud .hud-mid').dataset.mode = meta.id;
    $('#hud .hud-mid').dataset.show = (meta.hud ?? []).join(' ');
    this.hudScores(0, 0);
    $('#hud .hud-timer').textContent = '';
    this.hudBar(0, 0);
    this.hudTrack(0, 0);
    $('#hud .p0 .hp-pips').hidden = $('#hud .p1 .hp-pips').hidden = rounds < 2;
  }
  hudWins(wins) {
    for (const t of [0, 1]) $$(`#hud .p${t} .hp-pips i`).forEach((i, k) => i.classList.toggle('on', k < wins[t]));
  }
  hudTimer(s) {
    const e = $('#hud .hud-timer');
    const txt = s >= 10 ? String(Math.ceil(s)) : s > 0 ? Math.ceil(s).toString() : '0';
    if (e.textContent !== txt) { e.textContent = txt; e.classList.toggle('hurry', s <= 10); }
  }
  hudBar(a, b) {
    $('#hud .hud-bar .b0').style.width = `${a * 100}%`;
    $('#hud .hud-bar .b1').style.width = `${b * 100}%`;
    $('#hud .hud-bar .l0').textContent = `${Math.round(a * 100)}%`;
    $('#hud .hud-bar .l1').textContent = `${Math.round(b * 100)}%`;
  }
  // two big numbers (or short strings like "2/3") under the title
  hudScores(a, b) {
    for (const [cls, v] of [['s0', a], ['s1', b]]) {
      const e = $(`#hud .hud-scores .${cls}`);
      if (e.textContent !== String(v)) { e.textContent = v; e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
    }
  }
  // a blank overlay for game-specific HTML (cleared when the game ends)
  get layer() { return $('#layer'); }
  clearLayer() { $('#layer').innerHTML = ''; }
  hudTrack(a, b) {
    $('#hud .hud-track .r0').style.left = `${Math.min(1, a) * 100}%`;
    $('#hud .hud-track .r1').style.left = `${Math.min(1, b) * 100}%`;
  }

  // ---------- transient text ----------
  big(text, kind = '') {
    const b = el('div', `bigtxt ${kind}`, text);
    this.big$.append(b);
    setTimeout(() => b.remove(), kind.startsWith('num') ? 700 : kind === 'round' ? 950 : 1700);
  }
  toast(text, kind = '') {
    const t = el('div', `toast ${kind}`, text);
    this.toasts$.append(t);
    setTimeout(() => t.classList.add('out'), 1800);
    setTimeout(() => t.remove(), 2300);
  }
  clearTransient() { this.big$.innerHTML = ''; this.toasts$.innerHTML = ''; }

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
    $('#results').innerHTML = `
      <div class="rs-card ${who != null ? `t${who}` : ''}">
        ${who != null ? `<img class="rs-face" src="${portraits[who] ?? ''}" alt="">` : ''}
        <div class="rs-name">${who != null ? looks[who].name : ''}</div>
        <div class="rs-title">${title}</div>
        <div class="rs-score"><span class="t0">${score[0]}</span><i>${meta.icon} ${meta.title}</i><span class="t1">${score[1]}</span></div>
        ${partyHTML}
        <div class="rs-series">Today: <b class="t0">${series[0]}</b> – <b class="t1">${series[1]}</b></div>
        <div class="rs-actions">
          <button data-act="up">${kb(kc('W', 0) + kc('↑', 1))} ${next}</button>
          <button data-act="down">${kb(kc('S', 0) + kc('↓', 1))} Menu</button>
        </div>
      </div>`;
  }

  showPause() {
    $('#pause').innerHTML = `
      <div class="pause-card">
        <h2>Paused</h2>
        <button data-act="resume">${kb('<kbd>Esc</kbd>')} ▶ Resume</button>
        <button data-act="restart">${kb('<kbd>R</kbd>')} ↻ Restart game</button>
        <button data-act="quit">${kb('<kbd>Q</kbd>')} ↩ Quit to menu</button>
        <div class="pause-sound"><button data-act="music">♫ Music</button><button data-act="sfx">🔊 Sounds</button></div>
      </div>`;
  }
}
