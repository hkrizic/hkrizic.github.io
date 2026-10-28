// On-screen controls for touch screens. Each player owns one half of the screen: a stick (any angle, analog)
// and/or buttons, laid out per game from its meta.touch. They feed Input exactly like keys do.
//
// meta.touch = {
//   stick: 'Run around',                   // describes the stick (omit → no stick)
//   button: ['SHOVE', 'dash', 'Dash into your rival'], // label, action (dash/up/down/left/right/toward/away), hint
//   pads: { up: 'JUMP', down: 'DUCK' },    // arrow pads instead of a stick; layout 'cross' | 'row' | 'col'
//   stickPresses: true,                    // stick flicks also count as direction presses
//   spatial: true,                         // arrow pads mean screen directions (Quick Draw's sign), not lanes
// }
//
// Seating: 'facing' (default) — the tablet lies flat between the players, who sit at its two short ends.
// Each player's strip of controls runs along their own edge, turned 90° to face them. 'side' — both sit
// at the long bottom edge, one half of the screen each. Sticks always report screen directions, so pushing
// toward where you want to go on screen works from either seat.
import { el } from './util.js';

export const DEFAULT_TOUCH = { stick: 'Move', button: ['DASH', 'dash', 'Dash'] };
const ARROW = { up: '▲', down: '▼', left: '◀', right: '▶' };
// a pad's local direction → the screen direction it points at when the strip is turned toward its player
const TURNED = [
  { up: 'right', right: 'down', down: 'left', left: 'up' },   // P1 at the left end (strip turned +90°)
  { up: 'left', right: 'up', down: 'right', left: 'down' },   // P2 at the right end (strip turned −90°)
];
// 'toward' / 'away' mean the direction pointing at / away from the rival (P1 plays on the left)
export const resolveAction = (action, team) => (action === 'toward' ? (team ? 'left' : 'right') : action === 'away' ? (team ? 'right' : 'left') : action);

export class TouchControls {
  constructor(input) {
    this.input = input;
    this.root = document.getElementById('touch');
    this.sides = [0, 1].map(t => { const s = el('div', `tc-side s${t}`); this.root.append(s); return s; });
    this.cfg = null;
    this.seat = 'facing';
    const size = () => { this.root.style.setProperty('--vw', `${innerWidth}px`); this.root.style.setProperty('--vh', `${innerHeight}px`); };
    addEventListener('resize', size);
    size();
  }
  get facing() { return this.seat === 'facing'; }
  setSeat(seat) {
    this.seat = seat;
    this.root.classList.toggle('facing', this.facing);
    if (this.cfg) this.setLayout(this.cfg);
  }
  show(on) {
    this.root.classList.toggle('on', on);
    if (!on) this.release();
  }
  release() {
    for (const t of [0, 1]) {
      this.input.setStick(t, 0, 0);
      this.sides[t].querySelectorAll('.on').forEach(b => b.classList.remove('on'));
      this.sides[t].querySelector('.tc-stick')?.classList.remove('live');
    }
    this.input.touchHeld.forEach(h => h.clear());
  }
  clear() {
    this.cfg = null;
    for (const side of this.sides) side.innerHTML = '';
  }
  setLayout(cfg) {
    this.cfg = cfg ?? DEFAULT_TOUCH;
    this.input.stickPresses = !!this.cfg.stickPresses;
    for (const t of [0, 1]) this.build(t);
  }

  build(t) {
    const cfg = this.cfg, side = this.sides[t];
    side.innerHTML = '';
    side.className = `tc-side s${t}${cfg.stick ? ' has-stick' : ''}${cfg.button ? ' has-btn' : ''}${cfg.pads ? ' has-pads' : ''}`;
    document.body.dataset.tlayout = cfg.stick ? 'stick' : cfg.pads ? 'pads' : 'button'; // the HUD badges dodge the controls
    if (cfg.stick) {
      const zone = el('div', 'tc-zone');
      const stick = el('div', 'tc-stick', '<div class="base"><b class="n"></b><b class="e"></b><b class="s"></b><b class="w"></b><i class="knob"></i></div>');
      zone.append(stick);
      side.append(zone);
      this.bindStick(t, zone, stick);
    }
    if (cfg.button) {
      const [label, action] = cfg.button;
      side.append(this.button(t, label, resolveAction(action, t), `tc-btn main${cfg.stick ? '' : ' solo'}`));
    }
    if (cfg.pads) {
      const pads = el('div', `tc-pads ${cfg.layout ?? 'cross'}`);
      for (const [dir, label] of Object.entries(cfg.pads)) {
        const only = label === ARROW[dir] || !label;
        // turned strips: an arrow pad that means a screen direction reports the way it physically points
        const action = cfg.spatial && this.facing ? TURNED[t][dir] : dir;
        pads.append(this.button(t, only ? ARROW[dir] : `<small>${ARROW[dir]}</small>${label}`, action, `tc-btn pad ${dir}${only ? ' glyph' : ''}`));
      }
      side.append(pads);
    }
  }

  button(t, html, action, cls) {
    const b = el('button', cls, `<span>${html}</span>`);
    b.dataset.action = action;
    const up = e => {
      if (!b.classList.contains('on')) return;
      b.classList.remove('on');
      this.input.touchUp(t, action);
      e?.preventDefault();
    };
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      b.setPointerCapture?.(e.pointerId);
      b.classList.add('on');
      this.input.touchDown(t, action);
    });
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
    return b;
  }

  // A floating stick: it rests at its home spot, jumps under your thumb when you touch anywhere on your
  // side, and springs back home when you let go.
  bindStick(t, zone, stick) {
    let id = null, cx = 0, cy = 0;
    const knob = stick.querySelector('.knob');
    const radius = () => stick.offsetWidth * 0.42;
    // screen → the strip's own (possibly turned) coordinates, for drawing the stick under the thumb
    const local = (X, Y) => {
      if (!this.facing) { const z = zone.getBoundingClientRect(); return [X - z.left, Y - z.top]; }
      const H = innerWidth / 2;
      return t ? [innerHeight - Y, X - (innerWidth - H)] : [Y, H - X];
    };
    const localVec = (x, y) => (!this.facing ? [x, y] : t ? [-y, x] : [y, -x]);
    const move = e => {
      const R = radius();
      let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      const [kx, ky] = localVec(dx, dy);
      knob.style.transform = `translate(${kx * R}px, ${ky * R}px)`;
      this.input.setStick(t, dx, dy); // games get screen directions
    };
    const end = e => {
      if (e.pointerId !== id) return;
      id = null;
      stick.classList.remove('live');
      stick.style.left = stick.style.top = '';
      knob.style.transform = '';
      this.input.setStick(t, 0, 0);
    };
    zone.addEventListener('pointerdown', e => {
      if (id != null) return;
      e.preventDefault();
      id = e.pointerId;
      zone.setPointerCapture?.(id);
      cx = e.clientX; cy = e.clientY;
      const [lx, ly] = local(cx, cy);
      stick.style.left = `${lx}px`;
      stick.style.top = `${ly}px`;
      stick.classList.add('live');
      move(e);
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === id) { e.preventDefault(); move(e); } });
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', end);
  }
}
