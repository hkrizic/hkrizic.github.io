// Every sound is synthesized with Web Audio — no audio files. A tiny step sequencer plays the bouncy music loop.
import { store } from './util.js';

let ctx = null, master, sfxBus, musicBus, noiseBuf;
export const settings = { sfx: store.get('sfx', true), music: store.get('music', true) };
const MUSIC_VOL = 0.26;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    const soft = ctx.createBiquadFilter();
    soft.type = 'lowpass'; soft.frequency.value = 3200;
    musicBus = ctx.createGain();
    musicBus.gain.value = settings.music ? MUSIC_VOL : 0;
    musicBus.connect(soft).connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
// Browsers only allow sound after a gesture.
export function unlockAudio() { ac(); music.start(); }

export const N = n => 440 * Math.pow(2, (n - 69) / 12);

export function tone(freq, { at = 0, dur = 0.12, type = 'sine', vol = 0.2, slide = 0, attack = 0.005, bus = null, when = null, pan = 0 } = {}) {
  if (!bus && !settings.sfx) return;
  const c = ac(), t = (when ?? c.currentTime) + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let out = g;
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
  o.connect(g);
  out.connect(bus ?? sfxBus);
  o.start(t); o.stop(t + dur + 0.05);
}
export function noise({ at = 0, dur = 0.3, vol = 0.15, from = 800, to = 3000, q = 1, type = 'bandpass', bus = null, when = null, attack = null } = {}) {
  if (!bus && !settings.sfx) return;
  const c = ac(), t = (when ?? c.currentTime) + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + (attack ?? dur * 0.15));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(bus ?? sfxBus);
  src.start(t, Math.random() * Math.max(0, 1.9 - dur));
  src.stop(t + dur + 0.05);
}

export const sfx = {
  click: () => tone(1800, { dur: 0.03, vol: 0.06 }),
  move: () => { tone(N(84), { dur: 0.05, vol: 0.06, type: 'triangle' }); },
  pop: () => { tone(520, { dur: 0.12, slide: 700, vol: 0.12, type: 'sine' }); noise({ dur: 0.06, vol: 0.04, from: 3000, to: 6000 }); },
  ready: () => [72, 79, 84].forEach((n, i) => tone(N(n), { at: i * 0.06, dur: 0.18, vol: 0.09, type: 'triangle' })),
  unready: () => [79, 72].forEach((n, i) => tone(N(n), { at: i * 0.06, dur: 0.14, vol: 0.07, type: 'triangle' })),
  door: () => { noise({ dur: 0.25, vol: 0.06, from: 600, to: 2400, q: 0.8 }); tone(220, { dur: 0.12, slide: 120, vol: 0.06, type: 'triangle' }); },
  beep: () => tone(N(81), { dur: 0.16, vol: 0.13, type: 'square' }),
  go: () => { tone(N(93), { dur: 0.45, vol: 0.12, type: 'square' }); tone(N(88), { dur: 0.45, vol: 0.06, type: 'triangle' }); },
  whistle: () => { tone(2900, { dur: 0.35, vol: 0.07, type: 'sine', attack: 0.02 }); tone(3050, { dur: 0.35, vol: 0.05, type: 'sine', attack: 0.02 }); },
  step: () => tone(110 + Math.random() * 30, { dur: 0.04, vol: 0.05 }),
  bump: (k = 1) => { tone(140, { dur: 0.16, slide: -70, vol: 0.18 * k, type: 'sine' }); noise({ dur: 0.1, vol: 0.06 * k, from: 1200, to: 300 }); },
  bonk: () => { tone(320, { dur: 0.22, slide: -220, vol: 0.18, type: 'square' }); tone(90, { dur: 0.25, slide: -40, vol: 0.2 }); noise({ dur: 0.18, vol: 0.1, from: 2500, to: 400 }); },
  dash: () => noise({ dur: 0.3, vol: 0.1, from: 500, to: 4500, q: 0.9 }),
  jump: () => tone(300, { dur: 0.18, slide: 500, vol: 0.12, type: 'triangle' }),
  land: () => tone(120, { dur: 0.08, slide: -40, vol: 0.08 }),
  duck: () => noise({ dur: 0.18, vol: 0.06, from: 2500, to: 800, q: 1.2 }),
  fall: () => { tone(1400, { dur: 1.1, slide: -1150, vol: 0.09, type: 'sine', attack: 0.03 }); },
  splashdown: () => { noise({ dur: 0.6, vol: 0.12, from: 1500, to: 200, q: 0.6 }); tone(90, { dur: 0.3, slide: -30, vol: 0.15 }); },
  trip: () => { tone(200, { dur: 0.25, slide: -140, vol: 0.16, type: 'triangle' }); noise({ at: 0.05, dur: 0.2, vol: 0.09, from: 900, to: 200 }); },
  splat: () => { noise({ dur: 0.16, vol: 0.08, from: 1800, to: 300, q: 1.4 }); tone(260, { dur: 0.1, slide: -120, vol: 0.06, type: 'triangle' }); },
  paint: () => tone(700 + Math.random() * 500, { dur: 0.04, vol: 0.025, type: 'sine' }),
  bigSplat: () => { noise({ dur: 0.5, vol: 0.18, from: 2500, to: 200, q: 0.7 }); tone(180, { dur: 0.3, slide: -100, vol: 0.15 }); },
  pickup: () => [76, 83, 88, 95].forEach((n, i) => tone(N(n), { at: i * 0.045, dur: 0.12, vol: 0.07, type: 'square' })),
  speed: () => { tone(400, { dur: 0.4, slide: 1200, vol: 0.08, type: 'sawtooth' }); },
  tick: (hi = false) => tone(hi ? 1900 : 1500, { dur: 0.03, vol: 0.08, type: 'triangle' }),
  pass: () => { tone(N(79), { dur: 0.08, vol: 0.1, type: 'triangle' }); tone(N(86), { at: 0.06, dur: 0.12, vol: 0.09, type: 'triangle' }); },
  sizzle: () => noise({ dur: 0.12, vol: 0.025, from: 5000, to: 7000, q: 2 }),
  boom: () => { noise({ dur: 1.4, vol: 0.32, from: 1200, to: 60, q: 0.5, type: 'lowpass', attack: 0.005 }); tone(70, { dur: 0.8, slide: -40, vol: 0.35 }); tone(140, { dur: 0.3, slide: -90, vol: 0.2, type: 'square' }); },
  cheer: () => { noise({ dur: 1.6, vol: 0.09, from: 900, to: 1600, q: 0.5, attack: 0.3 }); for (let i = 0; i < 6; i++) tone(N(72 + Math.floor(Math.random() * 12)), { at: 0.1 + Math.random() * 0.8, dur: 0.15, vol: 0.02, type: 'triangle' }); },
  win: () => { [72, 76, 79, 84, 79, 84].forEach((n, i) => tone(N(n), { at: i * 0.11, dur: i === 5 ? 0.7 : 0.16, vol: 0.1, type: 'square' })); [60, 64, 67].forEach(n => tone(N(n), { at: 0.55, dur: 0.8, vol: 0.05, type: 'triangle' })); },
  draw: () => [67, 64, 60].forEach((n, i) => tone(N(n), { at: i * 0.14, dur: 0.22, vol: 0.08, type: 'triangle' })),
  score: () => [79, 84].forEach((n, i) => tone(N(n), { at: i * 0.08, dur: 0.18, vol: 0.09, type: 'square' })),
  finish: () => { sfx.whistle(); sfx.cheer(); },
  kick: (k = 1) => { tone(180, { dur: 0.12, slide: -120, vol: 0.22 * k }); noise({ dur: 0.07, vol: 0.08 * k, from: 3000, to: 900, q: 0.8 }); },
  throw: () => noise({ dur: 0.22, vol: 0.08, from: 900, to: 3800, q: 1.1 }),
  crack: () => { noise({ dur: 0.18, vol: 0.12, from: 2600, to: 500, q: 2 }); tone(260, { dur: 0.08, slide: -150, vol: 0.06, type: 'square' }); },
  chime: () => [88, 95].forEach((n, i) => tone(N(n), { at: i * 0.05, dur: 0.35, vol: 0.07, type: 'sine' })),
  honk: () => { tone(N(64), { dur: 0.25, vol: 0.1, type: 'square' }); tone(N(68), { dur: 0.25, vol: 0.06, type: 'square' }); },
  popgun: () => { noise({ dur: 0.08, vol: 0.25, from: 4000, to: 1500, q: 0.7, attack: 0.002 }); tone(900, { dur: 0.09, slide: -600, vol: 0.12, type: 'square' }); },
  lap: () => [79, 84, 91].forEach((n, i) => tone(N(n), { at: i * 0.07, dur: 0.16, vol: 0.08, type: 'triangle' })),
  thud: () => { tone(110, { dur: 0.14, slide: -50, vol: 0.2 }); noise({ dur: 0.08, vol: 0.05, from: 600, to: 200 }); },
  goal: () => { sfx.cheer(); [72, 76, 79, 84].forEach((n, i) => tone(N(n), { at: 0.05 + i * 0.08, dur: 0.3, vol: 0.09, type: 'square' })); },
};

// ---------- music: a cheerful 4-chord loop. intensity 0 = menu (soft), 1 = game (drums) ----------
const PROG = [ // root, chord tones
  [36, [60, 64, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]], [43, [55, 59, 62]],
];
const MELODY = [0, null, 2, null, 1, null, 2, 3, null, 2, null, 1, 0, null, null, null];
export const music = {
  playing: false, step: 0, next: 0, intensity: 0, timer: null, muted: false,
  start() {
    if (this.playing || !ctx) return;
    this.playing = true;
    this.next = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  },
  setIntensity(i) { this.intensity = i; },
  // games with their own soundtrack (Dance Duel) silence the loop while they run
  setMuted(on) { this.muted = on; },
  schedule() {
    if (!settings.music || this.muted) { if (ctx) this.next = ctx.currentTime + 0.05; return; }
    const bpm = this.intensity ? 124 : 106;
    const stepDur = 60 / bpm / 4;
    while (this.next < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.next, stepDur);
      this.step = (this.step + 1) % 64;
      this.next += stepDur;
    }
    if (this.next < ctx.currentTime) this.next = ctx.currentTime + 0.05; // tab was asleep
  },
  playStep(s, when, sd) {
    const bus = musicBus, bar = Math.floor(s / 16) % 4, i = s % 16;
    const [root, chord] = PROG[bar];
    // bass: bouncy root + octave
    if ([0, 6, 8, 14].includes(i)) tone(N(root), { when, dur: sd * 1.8, vol: 0.32, type: 'triangle', bus });
    if ([3, 11].includes(i)) tone(N(root + 12), { when, dur: sd * 1.2, vol: 0.2, type: 'triangle', bus });
    // offbeat chord stabs
    if ([2, 6, 10, 14].includes(i)) chord.forEach(n => tone(N(n), { when, dur: sd * 1.3, vol: 0.045, type: 'square', bus }));
    // glockenspiel motif
    const m = MELODY[i];
    if (m != null && (bar % 2 === 0 || i < 8)) tone(N(chord[m % 3] + 12 + (m === 3 ? 12 : 0)), { when, dur: 0.35, vol: 0.06, type: 'sine', bus });
    // drums
    if (i % 2 === 0) noise({ when, dur: 0.04, vol: i % 4 === 2 ? 0.05 : 0.025, from: 7000, to: 9000, q: 1, type: 'highpass', bus });
    if (this.intensity) {
      if (i === 0 || i === 8 || i === 10) tone(150, { when, dur: 0.16, slide: -100, vol: 0.4, bus });
      if (i === 4 || i === 12) noise({ when, dur: 0.14, vol: 0.12, from: 1800, to: 900, q: 0.7, bus });
    }
  },
};

// the game's own track (Dance Duel) goes through the music bus so the music toggle mutes it too
export function musicTone(freq, opts = {}) { if (!settings.music) return; ac(); tone(freq, { ...opts, bus: musicBus }); }
export function musicNoise(opts = {}) { if (!settings.music) return; ac(); noise({ ...opts, bus: musicBus }); }
export const audioTime = () => ac().currentTime;

export function setSfx(on) { settings.sfx = on; store.set('sfx', on); }
export function setMusic(on) {
  settings.music = on;
  store.set('music', on);
  if (!ctx) return;
  musicBus.gain.setTargetAtTime(on ? MUSIC_VOL : 0, ctx.currentTime, 0.1);
  if (on) music.start();
}
