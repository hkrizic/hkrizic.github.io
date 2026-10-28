// On-screen controls for touch screens. Each player owns one half of the screen: a stick (any angle, analog)
// and/or buttons, laid out per game from its meta.touch. They feed Input exactly like keys do.
//
// meta.touch = {
//   stick: 'Run around',                   // describes the stick (omit → no stick)
//   button: ['SHOVE', 'dash', 'Dash into your rival'], // label, action (dash/up/down/left/right/toward/away), hint
//   pads: { up: 'JUMP', down: 'DUCK' },    // arrow pads instead of a stick; layout 'cross' | 'row' | 'col'
//   stickPresses: true,                    // stick flicks also count as direction presses
// }
import { el } from './util.js';

export const DEFAULT_TOUCH = { stick: 'Move', button: ['DASH', 'dash', 'Dash'] };
const ARROW = { up: '▲', down: '▼', left: '◀', right: '▶' };
// 'toward' / 'away' mean the direction pointing at / away from the rival (P1 plays on the left)
export const resolveAction = (action, team) => (action === 'toward' ? (team ? 'left' : 'right') : action === 'away' ? (team ? 'right' : 'left') : action);

export class TouchControls {
  constructor(input) {
    this.input = input;
    this.root = document.getElementById('touch');
    this.sides = [0, 1].map(t => { const s = el('div', `tc-side s${t}`); this.root.append(s); return s; });
    this.cfg = null;
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
  setLayout(cfg) {
    this.cfg = cfg ?? DEFAULT_TOUCH;
    this.input.stickPresses = !!this.cfg.stickPresses;
    for (const t of [0, 1]) this.build(t);
  }

  build(t) {
    const cfg = this.cfg, side = this.sides[t];
    side.innerHTML = '';
    side.className = `tc-side s${t}${cfg.stick ? ' has-stick' : ''}${cfg.button ? ' has-btn' : ''}${cfg.pads ? ' has-pads' : ''}`;
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
        pads.append(this.button(t, only ? ARROW[dir] : `<small>${ARROW[dir]}</small>${label}`, dir, `tc-btn pad ${dir}${only ? ' glyph' : ''}`));
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
    const move = e => {
      const R = radius();
      let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      knob.style.transform = `translate(${dx * R}px, ${dy * R}px)`;
      this.input.setStick(t, dx, dy);
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
      const z = zone.getBoundingClientRect();
      cx = e.clientX; cy = e.clientY;
      stick.style.left = `${cx - z.left}px`;
      stick.style.top = `${cy - z.top}px`;
      stick.classList.add('live');
      move(e);
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === id) { e.preventDefault(); move(e); } });
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', end);
  }
}
