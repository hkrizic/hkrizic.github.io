// Two players, one device. Keyboard: physical key codes, so WASD sits in the same place on QWERTZ/AZERTY layouts.
// Touch: each player gets an analog stick + buttons (see touch.js) that feed the same API, so games read
// dir() / isHeld() / takeDash() / press events without caring where the input came from.
const MAP = {
  KeyW: [0, 'up'], KeyA: [0, 'left'], KeyS: [0, 'down'], KeyD: [0, 'right'],
  ArrowUp: [1, 'up'], ArrowLeft: [1, 'left'], ArrowDown: [1, 'down'], ArrowRight: [1, 'right'],
};
const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DOUBLE_TAP = 0.26; // seconds
const DEAD = 0.14; // stick dead zone
const ZONE = 0.5; // how far the stick must lean to count as a direction "key"

export class Input {
  constructor() {
    this.mode = 'keys'; // 'keys' | 'touch'
    this.held = [new Set(), new Set()];
    this.touchHeld = [new Set(), new Set()];
    this.stickV = [{ x: 0, z: 0 }, { x: 0, z: 0 }];
    this.stickZone = [null, null];
    this.stickPresses = false; // set per game: stick flicks emit direction presses (e.g. Trail Blazers turns)
    this.lastTap = [{}, {}];
    this.dashes = [null, null];
    this.listeners = new Set();
    addEventListener('keydown', e => this.down(e));
    addEventListener('keyup', e => {
      const m = MAP[e.code];
      if (m) this.held[m[0]].delete(m[1]);
    });
    addEventListener('blur', () => this.reset());
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(ev) { for (const fn of this.listeners) fn(ev); }
  down(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return; // leave browser shortcuts alone
    const m = MAP[e.code];
    if (!m) {
      if (['Space', 'Enter', 'Escape', 'Tab'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.emit({ type: 'key', code: e.code });
      return;
    }
    e.preventDefault(); // arrows must never scroll the page
    const [player, action] = m;
    this.held[player].add(action);
    if (e.repeat) return;
    const now = performance.now() / 1000;
    if (now - (this.lastTap[player][action] ?? -9) < DOUBLE_TAP) {
      this.dashes[player] = { action, at: now };
      this.lastTap[player][action] = -9;
    } else this.lastTap[player][action] = now;
    this.emit({ type: 'press', player, action });
  }
  reset() {
    this.held.forEach(h => h.clear());
    this.touchHeld.forEach(h => h.clear());
    this.stickV = [{ x: 0, z: 0 }, { x: 0, z: 0 }];
    this.stickZone = [null, null];
    this.dashes = [null, null];
  }

  // ---------- touch feeds ----------
  // x → screen right, z → screen down, both -1..1 (length ≤ 1)
  setStick(p, x, z) {
    this.stickV[p] = { x, z };
    const m = Math.hypot(x, z);
    const zone = m < ZONE ? null : Math.abs(x) > Math.abs(z) ? (x > 0 ? 'right' : 'left') : z > 0 ? 'down' : 'up';
    if (zone !== this.stickZone[p]) {
      this.stickZone[p] = zone;
      if (zone && this.stickPresses) this.emit({ type: 'press', player: p, action: zone, touch: true });
    }
  }
  touchDown(p, action) {
    if (action === 'dash') { this.dashes[p] = { action: null, at: performance.now() / 1000 }; return; }
    this.touchHeld[p].add(action);
    this.emit({ type: 'press', player: p, action, touch: true });
  }
  touchUp(p, action) { this.touchHeld[p].delete(action); }

  // ---------- what games read ----------
  isHeld(p, action) { return this.held[p].has(action) || this.touchHeld[p].has(action) || this.stickZone[p] === action; }
  // Movement on the ground plane (x → right, z → toward the camera). Keyboard: a unit vector.
  // Stick: analog — any angle, and its length (0..1) says how hard you push.
  dir(p) {
    const h = this.held[p];
    const x = (h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0);
    const z = (h.has('down') ? 1 : 0) - (h.has('up') ? 1 : 0);
    const l = Math.hypot(x, z);
    if (l) return { x: x / l, z: z / l };
    return this.stick(p);
  }
  // Each axis on its own (-1..1): keys give whole steps, the stick anything in between.
  axis(p) {
    const h = this.held[p];
    const x = (h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0);
    const z = (h.has('down') ? 1 : 0) - (h.has('up') ? 1 : 0);
    const s = this.stick(p);
    return { x: x || s.x, z: z || s.z };
  }
  // The stick with its dead zone removed, rescaled to 0..1.
  stick(p) {
    const s = this.stickV[p], m = Math.hypot(s.x, s.z);
    if (m < DEAD) return { x: 0, z: 0 };
    const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m;
    return { x: s.x * k, z: s.z * k };
  }
  // A dash since the last call (consumed) as a unit vector, or null. Keyboard: a double-tap.
  // Touch: the dash button; it goes where the stick points, else where the figure faces.
  takeDash(p, facing = null) {
    const d = this.dashes[p];
    this.dashes[p] = null;
    if (!d || performance.now() / 1000 - d.at > 0.3) return null;
    const held = this.dir(p), m = Math.hypot(held.x, held.z);
    if (m > 0.2) return { x: held.x / m, z: held.z / m };
    if (d.action) { const [x, z] = VEC[d.action]; return { x, z }; }
    if (facing != null) return { x: Math.sin(facing), z: Math.cos(facing) };
    return { x: 0, z: 1 };
  }
  clearDashes() { this.dashes = [null, null]; }
}
