// Marching squares: iso-lines of a scalar grid (row-major, value[row*cols+col]).
// Returns an array of polylines in (col, row) fractional index coordinates.

export function marchingSquares(values, rows, cols, level, mask = null) {
  const segs = [];
  const at = (r, c) => values[r * cols + c];
  const ok = (r, c) => !mask || mask[r * cols + c];
  const interp = (r1, c1, r2, c2) => {
    const v1 = at(r1, c1) - level;
    const v2 = at(r2, c2) - level;
    const t = v1 === v2 ? 0.5 : v1 / (v1 - v2);
    return [c1 + (c2 - c1) * t, r1 + (r2 - r1) * t];
  };
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (!(ok(r, c) && ok(r, c + 1) && ok(r + 1, c) && ok(r + 1, c + 1))) continue;
      const tl = at(r, c), tr = at(r, c + 1), bl = at(r + 1, c), br = at(r + 1, c + 1);
      if (!Number.isFinite(tl + tr + bl + br)) continue;
      const idx = (tl >= level ? 8 : 0) | (tr >= level ? 4 : 0) | (br >= level ? 2 : 0) | (bl >= level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const top = () => interp(r, c, r, c + 1);
      const right = () => interp(r, c + 1, r + 1, c + 1);
      const bottom = () => interp(r + 1, c, r + 1, c + 1);
      const left = () => interp(r, c, r + 1, c);
      const push = (a, b) => segs.push([a, b]);
      switch (idx) {
        case 1: case 14: push(left(), bottom()); break;
        case 2: case 13: push(bottom(), right()); break;
        case 3: case 12: push(left(), right()); break;
        case 4: case 11: push(top(), right()); break;
        case 5: { const center = (tl + tr + bl + br) / 4; if (center >= level) { push(left(), top()); push(bottom(), right()); } else { push(left(), bottom()); push(top(), right()); } break; }
        case 6: case 9: push(top(), bottom()); break;
        case 7: case 8: push(left(), top()); break;
        case 10: { const center = (tl + tr + bl + br) / 4; if (center >= level) { push(top(), right()); push(left(), bottom()); } else { push(left(), top()); push(bottom(), right()); } break; }
        default: break;
      }
    }
  }
  return joinSegments(segs);
}

function key(p) { return (Math.round(p[0] * 1e4)) + "," + (Math.round(p[1] * 1e4)); }

function joinSegments(segs) {
  const byStart = new Map();
  const used = new Uint8Array(segs.length);
  segs.forEach((s, i) => {
    for (const k of [key(s[0]), key(s[1])]) {
      if (!byStart.has(k)) byStart.set(k, []);
      byStart.get(k).push(i);
    }
  });
  const lines = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    let line = [segs[i][0], segs[i][1]];
    // extend forward
    for (const dir of [1, -1]) {
      let guard = 0;
      while (guard++ < segs.length) {
        const end = dir === 1 ? line[line.length - 1] : line[0];
        const cands = byStart.get(key(end)) || [];
        let next = -1;
        for (const j of cands) if (!used[j]) { next = j; break; }
        if (next < 0) break;
        used[next] = 1;
        const s = segs[next];
        const other = key(s[0]) === key(end) ? s[1] : s[0];
        if (dir === 1) line.push(other); else line.unshift(other);
      }
    }
    lines.push(line);
  }
  return lines;
}

// Map polyline index coordinates to world coordinates given axis mapping functions.
export function mapPolylines(lines, fx, fy) {
  return lines.map((l) => l.map(([c, r]) => [fx(c), fy(r)]));
}
