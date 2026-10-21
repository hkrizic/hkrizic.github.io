// Progress storage: cookies (as requested) mirrored to localStorage.
// Safari caps script-written cookies at 7 days, so every visit re-writes them,
// and on load the newer of the two copies wins. Code drafts live only in
// localStorage (they are large and not precious).

const LS_KEY = 'pydojo.state.v1';
const COOKIE = 'pd';            // pd0, pd1, ... + pdn (chunk count)
const CHUNK = 3800;
const COOKIE_DAYS = 400;

const DEFAULTS = () => ({
  v: 1,
  t: 0,                 // last save (ms)
  xp: 0,
  streak: { n: 0, last: null, best: 0 },
  daily: { d: null, xp: 0 },
  goal: 50,
  lessons: {},          // lessonId -> { c: completions, b: best accuracy %, t: last day }
  exams: {},            // examId -> { b: best %, g: grade, n: attempts, t: day }
  review: {},           // stepKey -> { w: wrong count, s: success streak, due: day number }
  solved: {},           // lessonId/examId -> bitmask of step indexes answered correctly at least once
  days: {},             // 'YYYY-MM-DD' -> xp (last 14 days, for the activity chart)
  settings: { theme: 'auto', sound: true, haptics: true, keyclick: false, kbDesktop: false, font: 15, onboarded: false },
});

// ------------------------------------------------------------ encoding
const b64e = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(bin);
};
const b64d = (s) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

const COOKIE_PATH = location.pathname.replace(/[^/]*$/, '') || '/';

function cookieJar() {
  return Object.fromEntries(document.cookie.split(/;\s*/).filter(Boolean).map((kv) => {
    const i = kv.indexOf('=');
    return [kv.slice(0, i), kv.slice(i + 1)];
  }));
}

async function inflate(b64) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}
async function deflate(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(bin);
}
const canZip = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

async function readCookies() {
  try {
    const jar = cookieJar();
    const n = parseInt(jar[`${COOKIE}n`], 10);
    if (!n) return null;
    let s = '';
    for (let i = 0; i < n; i++) {
      if (jar[COOKIE + i] === undefined) return null;
      s += jar[COOKIE + i];
    }
    return JSON.parse(jar[`${COOKIE}z`] === '1' ? await inflate(s) : b64d(s));
  } catch { return null; }
}

let cookieTimer = 0;
function writeCookies(st) {
  clearTimeout(cookieTimer);
  cookieTimer = setTimeout(async () => {
    try {
      const json = JSON.stringify(st);
      const zipped = canZip;
      const data = zipped ? await deflate(json) : b64e(json);
      const parts = [];
      for (let i = 0; i < data.length; i += CHUNK) parts.push(data.slice(i, i + CHUNK));
      const exp = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString();
      const tail = `; expires=${exp}; path=${COOKIE_PATH}; SameSite=Lax`;
      const old = parseInt(cookieJar()[`${COOKIE}n`], 10) || 0;
      parts.forEach((p, i) => { document.cookie = `${COOKIE}${i}=${p}${tail}`; });
      document.cookie = `${COOKIE}n=${parts.length}${tail}`;
      document.cookie = `${COOKIE}z=${zipped ? 1 : 0}${tail}`;
      for (let i = parts.length; i < old; i++) document.cookie = `${COOKIE}${i}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${COOKIE_PATH}`;
    } catch { /* cookies unavailable */ }
  }, 250);
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch { return null; }
}

function merge(base) {
  const out = DEFAULTS();
  for (const k of Object.keys(out)) if (base && base[k] !== undefined) out[k] = base[k];
  out.settings = { ...DEFAULTS().settings, ...(base && base.settings) };
  // older format: solved was { stepKey: 1 }
  for (const [k, v] of Object.entries(out.solved)) {
    if (v === 1 && /\.\d+$/.test(k)) {
      delete out.solved[k];
      const cut = k.lastIndexOf('.');
      out.solved[k.slice(0, cut)] = (out.solved[k.slice(0, cut)] || 0) | (2 ** +k.slice(cut + 1));
    }
  }
  return out;
}

// ------------------------------------------------------------ state
const listeners = new Set();
let state;
state = merge(readLocal());

export const dayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dayNum = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5);

function save() {
  state.t = Date.now();
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* private mode */ }
  writeCookies(state);
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get s() { return state; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  save,
  touch() { save(); }, // refresh cookie expiry

  /** Record XP-earning activity; updates daily goal + streak. Returns {streakUp}. */
  activity(xp) {
    const today = dayStr();
    if (state.daily.d !== today) state.daily = { d: today, xp: 0 };
    state.daily.xp += xp;
    state.xp += xp;
    state.days[today] = (state.days[today] || 0) + xp;
    const keys = Object.keys(state.days).sort();
    while (keys.length > 14) delete state.days[keys.shift()];
    let streakUp = false;
    if (state.streak.last !== today) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      state.streak.n = state.streak.last === dayStr(y) ? state.streak.n + 1 : 1;
      state.streak.last = today;
      state.streak.best = Math.max(state.streak.best || 0, state.streak.n);
      streakUp = true;
    }
    save();
    return { streakUp };
  },

  /** Current streak (0 if broken). */
  streak() {
    const { n, last } = state.streak;
    if (!last) return 0;
    const y = new Date(); y.setDate(y.getDate() - 1);
    return last === dayStr() || last === dayStr(y) ? n : 0;
  },
  todayXp() { return state.daily.d === dayStr() ? state.daily.xp : 0; },

  lessonDone(id, accuracy) {
    const l = state.lessons[id] || { c: 0, b: 0 };
    l.c += 1;
    l.b = Math.max(l.b, Math.round(accuracy));
    l.t = dayNum();
    state.lessons[id] = l;
    save();
  },

  examDone(id, pct, grade) {
    const e = state.exams[id] || { b: -1, n: 0 };
    e.n += 1;
    if (pct > e.b) { e.b = Math.round(pct * 10) / 10; e.g = grade; }
    e.last = Math.round(pct * 10) / 10;
    e.t = dayNum();
    state.exams[id] = e;
    save();
  },

  /** Spaced repetition bookkeeping for exercises. */
  markResult(stepKey, correct, { inReview = false } = {}) {
    const today = dayNum();
    const r = state.review[stepKey];
    if (correct) {
      const cut = stepKey.lastIndexOf('.');
      const id = stepKey.slice(0, cut); const idx = +stepKey.slice(cut + 1);
      state.solved[id] = (state.solved[id] || 0) | (2 ** idx);
      if (r && inReview) {
        r.s += 1;
        if (r.s >= 3) delete state.review[stepKey];
        else r.due = today + [1, 3, 7][r.s] ;
      }
    } else {
      state.review[stepKey] = { w: (r ? r.w : 0) + 1, s: 0, due: today };
      const keys = Object.keys(state.review);
      if (keys.length > 150) {
        keys.sort((a, b) => state.review[b].due - state.review[a].due);
        delete state.review[keys[keys.length - 1]];
      }
    }
  },
  dueReviews() {
    const today = dayNum();
    return Object.entries(state.review).filter(([, r]) => r.due <= today).map(([k]) => k);
  },

  solvedCount() {
    let n = 0;
    for (const v of Object.values(state.solved)) { let x = typeof v === 'number' ? v : 0; while (x) { n += x % 2; x = Math.floor(x / 2); } }
    return n;
  },

  /** Restore from cookies if they are newer than localStorage (e.g. Safari wiped site data). */
  async restoreFromCookies() {
    const c = await readCookies();
    if (c && c.v === 1 && (c.t || 0) > (state.t || 0)) {
      state = merge(c);
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* ignore */ }
      listeners.forEach((fn) => fn(state));
      return true;
    }
    return false;
  },

  setting(k, v) { state.settings[k] = v; save(); },

  exportCode() { return b64e(JSON.stringify(state)); },
  importCode(code) {
    const obj = JSON.parse(b64d(code.trim()));
    if (!obj || obj.v !== 1) throw new Error('Not a PyDojo backup');
    state = merge(obj);
    save();
  },
  reset() {
    const settings = state.settings;
    state = DEFAULTS();
    state.settings = settings;
    save();
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('pydojo.draft.') || k === 'pydojo.exam').forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
  },
};

// ------------------------------------------------------------ drafts
export const drafts = {
  get(key) { try { return localStorage.getItem(`pydojo.draft.${key}`); } catch { return null; } },
  set(key, code) { try { localStorage.setItem(`pydojo.draft.${key}`, code); } catch { /* full */ } },
  clear(key) { try { localStorage.removeItem(`pydojo.draft.${key}`); } catch { /* ignore */ } },
};

export const BELTS = [
  { name: 'White', xp: 0, color: '#F1F3F7', ink: '#1B2333' },
  { name: 'Yellow', xp: 150, color: '#FFD43B', ink: '#1B2333' },
  { name: 'Orange', xp: 400, color: '#FF9F1C', ink: '#1B2333' },
  { name: 'Green', xp: 800, color: '#2BB673', ink: '#fff' },
  { name: 'Blue', xp: 1400, color: '#2F7BF6', ink: '#fff' },
  { name: 'Purple', xp: 2200, color: '#8B5CF6', ink: '#fff' },
  { name: 'Brown', xp: 3300, color: '#8D5B3C', ink: '#fff' },
  { name: 'Red', xp: 4700, color: '#E5383B', ink: '#fff' },
  { name: 'Black', xp: 6500, color: '#14161C', ink: '#fff' },
];
export function beltFor(xp) {
  let i = 0;
  while (i + 1 < BELTS.length && xp >= BELTS[i + 1].xp) i++;
  const cur = BELTS[i];
  const next = BELTS[i + 1] || null;
  const pct = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { ...cur, index: i, next, pct };
}
