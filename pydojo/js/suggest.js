// Context-aware suggestions for the Python keyboard's top bar.
// suggest(ctx) → [{ label, insert, kind, replace }]
//   insert: text to insert, `|` marks the caret; replace: chars before caret to replace.
import { KEYWORDS, BUILTINS } from './highlight.js';
import { DATA_FILES } from './pycore.js';

const KW_SNIP = {
  def: 'def |', class: 'class |', if: 'if |', elif: 'elif |', else: 'else:', while: 'while |', for: 'for |',
  in: 'in |', return: 'return |', import: 'import |', from: 'from |', try: 'try:', except: 'except |',
  finally: 'finally:', with: 'with |', as: 'as |', lambda: 'lambda |', not: 'not |', and: 'and |', or: 'or |',
  is: 'is |', yield: 'yield |', raise: 'raise |', global: 'global |', nonlocal: 'nonlocal |', assert: 'assert |',
  del: 'del |', pass: 'pass', break: 'break', continue: 'continue', True: 'True', False: 'False', None: 'None',
  async: 'async |', await: 'await |', match: 'match |', case: 'case |',
};
const PROPS = new Set(['shape', 'columns', 'dtypes', 'index', 'values', 'T', 'size', 'ndim', 'dtype', 'str', 'dt',
  'pi', 'e', 'inf', 'nan', 'real', 'imag', 'IGNORECASE', 'random', 'loc', 'iloc', 'at', 'iat', 'empty']);
const BRACKET = new Set(['loc', 'iloc', 'at', 'iat']);
const CLASSES = new Set(['Counter', 'defaultdict', 'deque', 'namedtuple', 'OrderedDict', 'DataFrame', 'Series',
  'datetime', 'date', 'timedelta', 'DictReader', 'DictWriter']);

const M = {
  str: 'split join strip replace lower upper startswith endswith find count format isdigit isalpha isalnum title lstrip rstrip index splitlines capitalize zfill partition isspace casefold removeprefix removesuffix ljust rjust center encode',
  list: 'append pop sort extend insert remove index count reverse copy clear',
  dict: 'get items keys values setdefault update pop copy popitem clear',
  set: 'add discard remove union intersection difference issubset issuperset update symmetric_difference copy',
  df: 'groupby head loc iloc sort_values merge agg reset_index value_counts query assign shape columns isna fillna dropna drop rename apply describe info astype mean sum count min max nunique unique pivot_table set_index tail copy duplicated drop_duplicates to_dict nlargest nsmallest cumsum rolling resample shift pct_change rank transform filter size median std str dt map isin between where melt sample corr iterrows itertuples to_list first values index plot',
  np: 'array arange linspace zeros ones full mean sum std min max argmax argmin where sqrt log exp abs round sort unique concatenate stack reshape random dot cumsum percentile median clip isnan nan inf diff vstack hstack allclose',
  arr: 'sum mean std min max reshape shape argmax argmin astype tolist cumsum round sort copy T dtype ndim size flatten clip any all',
  pd: 'read_csv DataFrame Series merge concat to_datetime pivot_table crosstab cut qcut isna date_range read_sql_query get_dummies notna',
  math: 'sqrt floor ceil pi e log exp isclose inf gcd factorial comb prod fsum hypot log2 log10 erf',
  random: 'seed randint choice choices sample shuffle random uniform gauss',
  re: 'search findall sub match finditer compile split fullmatch IGNORECASE escape',
  json: 'loads dumps load dump',
  csv: 'reader DictReader writer DictWriter',
  collections: 'Counter defaultdict deque namedtuple OrderedDict',
  itertools: 'chain islice groupby accumulate combinations permutations product count cycle zip_longest pairwise batched repeat',
  heapq: 'heappush heappop heapify nlargest nsmallest merge heappushpop heapreplace',
  functools: 'lru_cache cache reduce partial wraps total_ordering',
  statistics: 'mean median mode stdev pstdev variance quantiles',
  datetime: 'datetime date timedelta strptime strftime fromisoformat',
  sqlite3: 'connect Row',
  conn: 'execute executemany cursor commit close',
  cur: 'execute fetchall fetchone fetchmany',
  plt: 'plot bar hist scatter show title xlabel ylabel legend figure subplots grid xticks tight_layout',
  match: 'group groups start end span',
  counter: 'most_common elements update items keys values get total',
  deque: 'append appendleft pop popleft extend rotate clear',
  gen: 'send close',
};
const SPLIT = Object.fromEntries(Object.entries(M).map(([k, v]) => [k, v.split(' ')]));
const MODULES = ['math', 'random', 're', 'json', 'csv', 'collections', 'itertools', 'heapq', 'functools', 'statistics',
  'datetime', 'sqlite3', 'pandas', 'numpy', 'string', 'time', 'bisect', 'dataclasses', 'typing', 'zlib', 'hashlib', 'io', 'os', 'sys', 'contextlib'];
const MODULE_SNIP = { pandas: 'pandas as pd', numpy: 'numpy as np', 'matplotlib.pyplot': 'matplotlib.pyplot as plt' };

const NAME_TYPES = [
  [/^(df|data|orders|users|events|frame|sales|ab|weather|stocks|customers|emp|employees|dept|grouped|g|merged|result|res|out|report|cohort|pivot|daily|monthly)\w*$/, 'df'],
  [/^(s|text|line|word|name|email|string|msg|label|title|path|url|key|word_?\w*|line_?\w*|.*_str|.*_text|.*_name)$/, 'str'],
  [/^(nums|arr|items|xs|ys|lst|values|records|rows|lines|words|names|result|scores|prices|stack|queue|path|out|res|parts|pairs|chunks|batch|\w+s)$/, 'list'],
  [/^(d|counts|freq|mapping|cache|memo|index|lookup|by_\w+|groups|totals|config|params|seen_map|\w+_by_\w+|\w+_map|\w+_dict)$/, 'dict'],
  [/^(seen|visited|uniq|unique|\w+_set)$/, 'set'],
  [/^(conn|con|db)$/, 'conn'],
  [/^(cur|cursor)$/, 'cur'],
  [/^(m|match|mo)$/, 'match'],
  [/^(c|cnt|counter)$/, 'counter'],
  [/^(q|dq)$/, 'deque'],
];

function guessType(name, code) {
  if (SPLIT[name] && ['pd', 'np', 'math', 'random', 're', 'json', 'csv', 'collections', 'itertools', 'heapq', 'functools', 'statistics', 'sqlite3', 'plt'].includes(name)) return name;
  if (name === 'datetime') return 'datetime';
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = code.match(new RegExp(`(?:^|\\n)\\s*${esc}\\s*=\\s*([^\\n]+)`, 'g'));
  if (m) {
    const rhs = m[m.length - 1].replace(/^[^=]*=\s*/, '');
    if (/^(pd\.|.*\.(groupby|merge|agg|reset_index|sort_values|query|assign|pivot_table|read_csv|read_sql_query)\()/.test(rhs) || /\bdf\b|\[\[/.test(rhs) && /\]/.test(rhs) && /df/.test(rhs)) return 'df';
    if (/^np\./.test(rhs)) return 'arr';
    if (/^(\[|list\(|sorted\(|.*\.split\()/.test(rhs)) return 'list';
    if (/^(\{\s*\}|dict\(|\{[^}]*:)/.test(rhs)) return 'dict';
    if (/^(set\(|\{[^:}]+\}$)/.test(rhs)) return 'set';
    if (/^(f?["']|str\(|.*\.(strip|lower|upper|replace|join)\()/.test(rhs)) return 'str';
    if (/^Counter\(/.test(rhs)) return 'counter';
    if (/^(deque\(|collections\.deque)/.test(rhs)) return 'deque';
    if (/^(sqlite3\.)?connect\(/.test(rhs)) return 'conn';
    if (/\.cursor\(\)/.test(rhs)) return 'cur';
    if (/^re\.(search|match|fullmatch)\(/.test(rhs)) return 'match';
  }
  for (const [re, t] of NAME_TYPES) if (re.test(name)) return t;
  return null;
}

function identifiers(code) {
  const ids = new Map();
  const add = (n, w = 1) => { if (n && !KW_SNIP[n] && n.length > 1) ids.set(n, (ids.get(n) || 0) + w); };
  for (const m of code.matchAll(/\bdef\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g)) {
    add(m[1], 5);
    for (const p of m[2].split(',')) add(p.replace(/[:=].*$/, '').replace(/^\*+/, '').trim(), 3);
  }
  for (const m of code.matchAll(/\bclass\s+([A-Za-z_]\w*)/g)) add(m[1], 5);
  for (const m of code.matchAll(/(?:^|\n)\s*([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s*(?:=(?!=)|\+=|-=)/g)) for (const n of m[1].split(',')) add(n.trim(), 3);
  for (const m of code.matchAll(/\bfor\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s+in\b/g)) for (const n of m[1].split(',')) add(n.trim(), 3);
  for (const m of code.matchAll(/\bimport\s+([\w.]+)(?:\s+as\s+(\w+))?/g)) add(m[2] || m[1].split('.')[0], 4);
  for (const m of code.matchAll(/\bfrom\s+[\w.]+\s+import\s+([\w, ]+)/g)) for (const n of m[1].split(',')) add(n.trim(), 4);
  for (const m of code.matchAll(/\bas\s+([A-Za-z_]\w*)/g)) add(m[1], 2);
  for (const m of code.matchAll(/\b[A-Za-z_]\w*\b/g)) if (ids.has(m[0])) ids.set(m[0], ids.get(m[0]) + 0.2);
  return [...ids.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

function selfAttrs(code) {
  const out = new Set();
  for (const m of code.matchAll(/self\.([A-Za-z_]\w*)\s*=/g)) out.add(m[1]);
  for (const m of code.matchAll(/\n\s+def\s+([A-Za-z_]\w*)\s*\(\s*self/g)) if (!m[1].startsWith('__')) out.add(`${m[1]}()`);
  return [...out];
}

const fnSnip = (n) => (CLASSES.has(n) || /^[a-z_]/.test(n) ? `${n}(|)` : `${n}(|)`);
const memberSnip = (n) => (n.endsWith('()') ? `${n.slice(0, -2)}(|)` : BRACKET.has(n) ? `${n}[|]` : PROPS.has(n) ? n : `${n}(|)`);

const POPULAR_BI = ['print', 'len', 'range', 'sum', 'sorted', 'max', 'min', 'int', 'str', 'list', 'dict', 'set', 'enumerate', 'zip', 'abs', 'round', 'float', 'isinstance', 'any', 'all', 'map', 'filter', 'tuple', 'open', 'type', 'reversed', 'bool', 'ord', 'chr', 'super', 'next', 'iter', 'divmod', 'repr', 'Exception', 'ValueError', 'TypeError', 'KeyError', 'display'];

export function suggest(ctx) {
  if (ctx.lang === 'text') return TEXT_CHIPS.map((c) => ({ label: c, insert: c, kind: 'sym', replace: 0 }));
  const { before, prefix, dot, obj, text } = ctx;
  const out = [];
  const push = (label, insert, kind, replace = prefix.length) => {
    if (out.length < 24 && !out.some((o) => o.label === label)) out.push({ label, insert, kind, replace });
  };

  if (ctx.inString) {
    const fileCtx = before.match(/(?:read_csv|open|read_table|loadtxt)\(\s*[rf]?["']([\w/.]*)$/);
    if (fileCtx || /["']data\/[\w.]*$/.test(before)) {
      const typed = (before.match(/["']([\w/.]*)$/) || [, ''])[1];
      for (const f of DATA_FILES) if (`data/${f}`.startsWith(typed)) push(`data/${f}`, `data/${f}`, 'str', typed.length);
      return out;
    }
    const inF = /\bf["'][^"']*$/.test(before) || /\bf"""[\s\S]*$/.test(before);
    if (inF) ['{|}', ':.2f', ':,', ':02d', ':.1%', '\\n'].forEach((s) => push(s.replace('|', ''), s, 'sym', 0));
    else ['\\n', '\\t', ', ', ': ', ' '].forEach((s) => push(s === ' ' ? '␣' : s, s, 'sym', 0));
    return out;
  }

  // member access: obj.<prefix>
  if (dot) {
    let names;
    if (obj === 'self') names = selfAttrs(text);
    else {
      const t = obj ? guessType(obj.replace(/\(\)$/, ''), text) : null;
      names = t ? SPLIT[t] : [...new Set([...SPLIT.str.slice(0, 8), ...SPLIT.list.slice(0, 6), ...SPLIT.dict.slice(0, 4), ...SPLIT.df.slice(0, 8)])];
      if (obj === 'str') names = ['str'].includes(obj) ? SPLIT.str : names;
    }
    const p = prefix.toLowerCase();
    for (const n of names) if (n.toLowerCase().startsWith(p) && n !== prefix) push(n.replace(/\(\)$/, ''), memberSnip(n), 'method');
    return out;
  }

  // import lines
  let m;
  if ((m = before.match(/^\s*from\s+([\w.]+)\s+import\s+(?:[\w, ]*,\s*)?(\w*)$/))) {
    const mod = m[1].split('.')[0];
    const mem = SPLIT[mod === 'collections' ? 'collections' : mod] || [];
    for (const n of mem) if (n.startsWith(prefix)) push(n, n, 'fn');
    return out;
  }
  if (/^\s*(import|from)\s+[\w.]*$/.test(before)) {
    for (const n of [...MODULES, 'matplotlib.pyplot']) if (n.startsWith(prefix)) push(MODULE_SNIP[n] || n, MODULE_SNIP[n] && /^\s*import/.test(before) ? MODULE_SNIP[n] : n, 'fn');
    return out;
  }

  if (prefix) {
    const p = prefix;
    const pl = p.toLowerCase();
    const ids = identifiers(text.replace(new RegExp(`\\b${p}\\b(?![\\s\\S]*\\b${p}\\b)`), ''));
    const cands = [];
    for (const k of KEYWORDS) if (k.startsWith(p) && k !== p) cands.push([k, KW_SNIP[k] || `${k} `, 'kw', 0]);
    for (const n of ids) if (n.toLowerCase().startsWith(pl) && n !== p) cands.push([n, n, 'var', 1]);
    for (const b of POPULAR_BI) if (b.startsWith(p) && b !== p) cands.push([b, fnSnip(b), 'fn', 2]);
    for (const b of BUILTINS) if (b.startsWith(p) && b !== p) cands.push([b, fnSnip(b), 'fn', 3]);
    for (const mod of MODULES) if (mod.startsWith(p) && mod !== p) cands.push([mod, mod, 'var', 4]);
    // exact keyword typed → offer the completed snippet (e.g. "else" → "else:")
    if (KW_SNIP[p] && KW_SNIP[p] !== p) cands.unshift([KW_SNIP[p].replace('|', '').trim(), KW_SNIP[p], 'kw', -1]);
    cands.sort((a, b) => (a[0].startsWith(p) === b[0].startsWith(p) ? 0 : a[0].startsWith(p) ? -1 : 1) || a[3] - b[3] || a[0].length - b[0].length);
    for (const [label, ins, kind] of cands) push(kind === 'fn' ? `${label}()` : label, ins, kind);
    return out;
  }

  // no prefix: structural suggestions
  const t = before.trimEnd();
  if (ctx.lineEmpty) {
    const top = ctx.indent === 0;
    const list = top
      ? ['def', 'print()', 'for', 'if', 'import', 'from', 'class', 'while', 'return', 'try', 'with', 'elif', 'else']
      : ['return', 'if', 'for', 'print()', 'else', 'elif', 'while', 'break', 'continue', 'pass', 'try', 'except', 'yield', 'raise', 'with'];
    for (const k of list) {
      if (k === 'print()') push('print()', 'print(|)', 'fn', 0);
      else push(k, KW_SNIP[k] || `${k} `, 'kw', 0);
    }
    return out;
  }
  if (/\bfor\s+[\w, ()]+\s$/.test(before) && !/\bin\b/.test(before.replace(/^.*\bfor\b/, ''))) push('in', 'in |', 'kw', 0);
  if (/\bdef\s+\w+\(.*\)\s*$/.test(t) && !t.endsWith(':')) { push(':', ':', 'sym', 0); push('->', ' -> |', 'sym', 0); }
  if (/\bclass\s+\w+(\(.*\))?\s*$/.test(t) && !t.endsWith(':')) push(':', ':', 'sym', 0);
  if (/=\s$/.test(before) && !/[=!<>]=\s$/.test(before)) {
    ['[|]', '{|}', '"|"', '0', 'None', 'len(|)', 'sum(|)', 'sorted(|)', 'pd.read_csv("data/|")'].forEach((s) => push(s.replace('|', ''), s, 'sym', 0));
    return out;
  }
  if (/^\s*(if|elif|while)\b/.test(t) && !t.endsWith(':')) {
    if (/\s$/.test(before)) ['==', '!=', '>', '<', '>=', '<=', 'in', 'not', 'and', 'or', 'is None'].forEach((s) => push(s, `${s} |`, s.length < 3 ? 'sym' : 'kw', 0));
    push(':', ':', 'sym', 0);
    return out;
  }
  if (/[\w)\]"']\s$/.test(before)) {
    ['==', '+', '-', '*', '/', 'in', 'and', 'or', 'if', 'else', 'for', '%', '//', '**'].forEach((s) => push(s, `${s} |`, /\w/.test(s) ? 'kw' : 'sym', 0));
    return out;
  }
  if (/[\w)\]"']$/.test(before)) {
    ['()', '[]', '.', ':', ' = ', ' == ', ', '].forEach((s) => push(s.trim() || s, s === '()' ? '(|)' : s === '[]' ? '[|]' : s, 'sym', 0));
    return out;
  }
  if (/[([,]\s*$/.test(before)) {
    for (const n of identifiers(text).slice(0, 8)) push(n, n, 'var', 0);
    ['True', 'False', 'None'].forEach((k) => push(k, k, 'kw', 0));
    return out;
  }
  ['True', 'False', 'None', 'not', 'lambda'].forEach((k) => push(k, KW_SNIP[k], 'kw', 0));
  return out;
}

const TEXT_CHIPS = ['True', 'False', 'None', '[', ']', '(', ')', "'", '"', ', ', ': ', '{', '}', '-', '.', "<class '", "'>", 'Error'];
