// markdown-lite: paragraphs, `code`, **bold**, *italic*, lists, ``` fences,
// > callouts, ### headings and | pipe | tables. See CONTENT_GUIDE.md.
import { esc, highlight } from './highlight.js';

function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s)
    .replace(/(^|[^\w*])\*\*(?=[^\s*])([^*]*?[^\s*])\*\*(?!\*)/g, '$1<strong>$2</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
}

export function md(src) {
  if (!src) return '';
  const lines = String(src).replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let para = [];
  const flush = () => { if (para.length) { html.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (fence) {
      flush();
      const lang = fence[1] || 'python';
      const body = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i++]);
      const code = body.join('\n');
      const pyish = /^\s*(def|for|if|while|import|from|class|return|with|try)\b|\w+\s*=\s*\S|\w\(.*\)|^\s*(SELECT|WITH)\b/m;
      const isPlain = lang === 'text' || lang === 'output' || (!fence[1] && !pyish.test(code));
      html.push(`<pre class="md-code${isPlain ? ' plain' : ''}">${isPlain ? esc(code) : highlight(code, lang === 'sql' ? 'sql' : 'python')}</pre>`);
      continue;
    }
    if (/^\s*$/.test(line)) { flush(); continue; }
    if (/^\s*\|/.test(line)) {
      flush();
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      i--;
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const body = rows.filter((r) => !/^\s*\|[\s:|-]+\|\s*$/.test(r));
      const [head, ...rest] = body;
      html.push(`<div class="md-table"><table><thead><tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rest.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flush();
      const tag = ul ? 'ul' : 'ol';
      const items = [];
      const re = ul ? /^\s*[-*]\s+(.*)$/ : /^\s*\d+[.)]\s+(.*)$/;
      while (i < lines.length && re.test(lines[i])) {
        let item = lines[i].match(re)[1];
        while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !re.test(lines[i + 1])) item += ` ${lines[++i].trim()}`;
        items.push(item);
        i++;
      }
      i--;
      html.push(`<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</${tag}>`);
      continue;
    }
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flush();
      const body = [quote[1]];
      while (i + 1 < lines.length && /^\s*>/.test(lines[i + 1])) body.push(lines[++i].replace(/^\s*>\s?/, ''));
      html.push(`<div class="md-tip">${inline(body.join(' '))}</div>`);
      continue;
    }
    const h = line.match(/^\s*(#{2,4})\s+(.*)$/);
    if (h) { flush(); html.push(`<h4>${inline(h[2])}</h4>`); continue; }
    para.push(line.trim());
  }
  flush();
  return html.join('');
}

/** Short plain-text version of markdown (for previews). */
export function mdPlain(src, max = 120) {
  const s = String(src || '').replace(/```[\s\S]*?```/g, ' ').replace(/[`*>#|]/g, '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
