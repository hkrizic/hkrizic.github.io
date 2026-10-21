// Small Python (and SQL) tokenizer for syntax highlighting.

export const KEYWORDS = ['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
  'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda',
  'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield', 'match', 'case'];
const KW = new Set(KEYWORDS);
export const BUILTINS = ['print', 'len', 'range', 'int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple', 'sum',
  'min', 'max', 'abs', 'round', 'sorted', 'reversed', 'enumerate', 'zip', 'map', 'filter', 'any', 'all', 'open',
  'type', 'isinstance', 'iter', 'next', 'super', 'object', 'repr', 'ord', 'chr', 'divmod', 'pow', 'hash', 'id',
  'dir', 'format', 'frozenset', 'bytes', 'callable', 'getattr', 'setattr', 'hasattr', 'vars', 'display',
  'Exception', 'ValueError', 'TypeError', 'KeyError', 'IndexError', 'ZeroDivisionError', 'StopIteration',
  'RuntimeError', 'NotImplementedError', 'AttributeError', 'NameError', 'ArithmeticError', 'LookupError',
  'staticmethod', 'classmethod', 'property'];
const BI = new Set(BUILTINS);

const SQL_KW = new Set(('select from where group by order having limit offset join left right inner outer full cross on as and or not ' +
  'in is null like between case when then else end with over partition rows range preceding following current row ' +
  'insert into values update set delete create table view index drop distinct union all exists asc desc count sum avg ' +
  'min max round coalesce cast primary key integer text real lag lead rank dense_rank row_number ntile strftime date julianday ' +
  'first_value last_value iif nullif ifnull replace substr length lower upper trim abs total group_concat if').split(' '));

const RE = {
  ws: /[ \t]+/y,
  nl: /\n/y,
  comment: /#[^\n]*/y,
  triple: /([rRbBfFuU]{0,2})("""|''')/y,
  str: /([rRbBfFuU]{0,2})(["'])/y,
  num: /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?j?)/y,
  ident: /[A-Za-z_À-￿][\wÀ-￿]*/y,
  deco: /@[A-Za-z_][\w.]*/y,
  op: /\*\*=?|\/\/=?|->|:=|[=!<>]=|<<|>>|[+\-*/%&|^~<>=!]=?|[()[\]{}:;,.@]/y,
};

function at(re, s, i) {
  re.lastIndex = i;
  const m = re.exec(s);
  return m;
}

/** Tokenize Python source into [{t, v}] (t: kw, bi, fn, def, cls, str, num, com, op, deco, self, ws, nl, id, err). */
export function tokenizePython(src) {
  const out = [];
  let i = 0;
  let prevSig = '';
  let lineStart = true;
  const n = src.length;
  while (i < n) {
    let m;
    const c = src[i];
    if (c === '\n') { out.push({ t: 'nl', v: '\n' }); i++; lineStart = true; continue; }
    if ((m = at(RE.ws, src, i))) { out.push({ t: 'ws', v: m[0] }); i += m[0].length; continue; }
    if (c === '#') { m = at(RE.comment, src, i); out.push({ t: 'com', v: m[0] }); i += m[0].length; continue; }
    if ((m = at(RE.triple, src, i)) && /^[rRbBfFuU]{0,2}$/.test(m[1])) {
      const q = m[2];
      let j = i + m[0].length;
      while (j < n && src.slice(j, j + 3) !== q) j += src[j] === '\\' ? 2 : 1;
      j = Math.min(n, j + 3);
      pushString(out, src.slice(i, j), /f/i.test(m[1]));
      i = j; prevSig = 'str'; lineStart = false; continue;
    }
    if ((m = at(RE.str, src, i)) && (m[1] === '' || /^[rRbBfFuU]{1,2}$/.test(m[1]))) {
      const q = m[2];
      let j = i + m[0].length;
      while (j < n && src[j] !== q && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      if (src[j] === q) j++;
      pushString(out, src.slice(i, Math.min(j, n)), /f/i.test(m[1]));
      i = j; prevSig = 'str'; lineStart = false; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      m = at(RE.num, src, i);
      if (m && m[0]) { out.push({ t: 'num', v: m[0] }); i += m[0].length; prevSig = 'num'; lineStart = false; continue; }
    }
    if (c === '@' && lineStart && (m = at(RE.deco, src, i))) { out.push({ t: 'deco', v: m[0] }); i += m[0].length; lineStart = false; continue; }
    if ((m = at(RE.ident, src, i))) {
      const w = m[0];
      let t = 'id';
      if (KW.has(w)) t = 'kw';
      else if (prevSig === 'def') t = 'def';
      else if (prevSig === 'class') t = 'cls';
      else if (w === 'self' || w === 'cls') t = 'self';
      else if (BI.has(w) && prevSig !== '.') t = 'bi';
      else if (src[i + w.length] === '(') t = 'fn';
      out.push({ t, v: w });
      prevSig = t === 'kw' ? w : t === 'id' || t === 'fn' || t === 'bi' || t === 'self' ? 'id' : t;
      i += w.length; lineStart = false; continue;
    }
    if ((m = at(RE.op, src, i))) { out.push({ t: 'op', v: m[0] }); prevSig = m[0]; i += m[0].length; lineStart = false; continue; }
    out.push({ t: 'err', v: c }); i++; lineStart = false;
  }
  return out;
}

const SQL_START = /^[rRfF]{0,2}("""|'''|"|')\s*(SELECT|WITH|INSERT|CREATE|UPDATE|DELETE|DROP)\b/i;

function pushString(out, text, isF) {
  if (SQL_START.test(text)) {
    for (const tok of tokenizeSQL(text)) out.push(tok.t === 'plain' ? { t: 'str', v: tok.v } : tok);
    return;
  }
  if (!isF || !text.includes('{')) { out.push({ t: 'str', v: text }); return; }
  // f-string: colour the {expressions} differently
  let buf = '';
  for (let k = 0; k < text.length; k++) {
    const ch = text[k];
    if (ch === '{' && text[k + 1] === '{') { buf += '{{'; k++; continue; }
    if (ch === '{') {
      if (buf) out.push({ t: 'str', v: buf });
      let depth = 1; let j = k + 1;
      while (j < text.length && depth) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
      out.push({ t: 'fexpr', v: text.slice(k, j) });
      buf = ''; k = j - 1; continue;
    }
    buf += ch;
  }
  if (buf) out.push({ t: 'str', v: buf });
}

/** Tokenize SQL (inside a Python string or a ```sql block). */
export function tokenizeSQL(src) {
  const out = [];
  const re = /(--[^\n]*)|('(?:[^']|'')*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w]*)|(\n)|([\s\S])/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1]) out.push({ t: 'com', v: m[1] });
    else if (m[2]) out.push({ t: 'sqlstr', v: m[2] });
    else if (m[3]) out.push({ t: 'num', v: m[3] });
    else if (m[4]) out.push({ t: SQL_KW.has(m[4].toLowerCase()) ? 'sqlkw' : 'plain', v: m[4] });
    else if (m[5]) out.push({ t: 'nl', v: '\n' });
    else out.push({ t: 'plain', v: m[6] });
  }
  return out;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);

/** Highlighted HTML split into lines (array of HTML strings, one per source line). */
export function highlightLines(src, lang = 'python') {
  if (lang === 'text') return src.split('\n').map(esc);
  const toks = lang === 'sql' ? tokenizeSQL(src).map((t) => (t.t === 'plain' ? { t: 'id', v: t.v } : t)) : tokenizePython(src);
  const lines = [''];
  for (const tok of toks) {
    if (tok.t === 'nl') { lines.push(''); continue; }
    const parts = tok.v.split('\n');
    parts.forEach((p, k) => {
      if (k > 0) lines.push('');
      if (!p) return;
      lines[lines.length - 1] += tok.t === 'ws' || tok.t === 'id' ? esc(p) : `<span class="tk-${tok.t}">${esc(p)}</span>`;
    });
  }
  return lines;
}

export function highlight(src, lang = 'python') {
  return highlightLines(src, lang).join('\n');
}
