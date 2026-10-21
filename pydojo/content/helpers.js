// Authoring helpers for content files.
//
//   code: py`
//     def f(x):
//         return x * 2
//   `
//
// `py` keeps backslashes exactly as written (String.raw), so "\n" inside a
// Python string stays a Python escape. It strips the first newline and the
// common indentation. Avoid `${` inside py`` (JS would interpolate it).
// `md` does the same for markdown text and also turns \` back into `.

function dedent(s) {
  const lines = s.replace(/^[ \t]*\n/, '').replace(/\n[ \t]*$/, '').split('\n');
  const widths = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0].length);
  const cut = widths.length ? Math.min(...widths) : 0;
  return lines.map((l) => l.slice(cut)).join('\n');
}

export function py(strings, ...vals) {
  return dedent(String.raw({ raw: strings.raw }, ...vals));
}

export function md(strings, ...vals) {
  return dedent(String.raw({ raw: strings.raw }, ...vals)).replace(/\\`/g, '`');
}
