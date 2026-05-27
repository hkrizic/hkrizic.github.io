// MathPDF — PDF reader for mathematicians.
// Features: hyperref-driven hover previews, zoom, page navigation,
// sticky notes with LaTeX (KaTeX) preview, and download of an
// annotated PDF copy (notes baked in via pdf-lib + html2canvas).

(() => {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

  const DEFAULT_SCALE = 1.5;
  const MIN_SCALE = 0.4;
  const MAX_SCALE = 5.0;
  const ZOOM_STEP = 1.2;

  // ---------- State ----------
  const state = {
    pdf: null,
    pages: [], // { pageIdx, canvas, outputScale, viewport, items, annotations, overlay, wrap }
    scale: DEFAULT_SCALE,
    notes: [],
    noteMode: false,
    activeNoteId: null,
    originalBytes: null,
    fileName: '',
    fileFingerprint: null,
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const fileInput = $('fileInput');
  const viewer = $('viewer');
  const statusEl = $('status');
  const tooltip = $('tooltip');
  const toolbar = $('toolbar');
  const prevPageBtn = $('prevPage');
  const nextPageBtn = $('nextPage');
  const pageInput = $('pageInput');
  const pageCountEl = $('pageCount');
  const zoomInBtn = $('zoomIn');
  const zoomOutBtn = $('zoomOut');
  const zoomLevelEl = $('zoomLevel');
  const zoomFitBtn = $('zoomFit');
  const noteBtn = $('noteBtn');
  const downloadBtn = $('downloadBtn');
  const noteEditor = $('noteEditor');
  const noteText = $('noteText');
  const notePreview = $('notePreview');
  const noteDeleteBtn = $('noteDelete');
  const noteCloseBtn = $('noteClose');
  const loadingEl = $('loading');
  const loadingTextEl = $('loadingText');
  const loadingFileEl = $('loadingFile');

  function showLoading(text, fileName) {
    loadingTextEl.textContent = text || 'Loading…';
    if (fileName !== undefined) loadingFileEl.textContent = fileName || '';
    loadingEl.hidden = false;
  }
  function updateLoading(text) {
    loadingTextEl.textContent = text;
  }
  function hideLoading() {
    loadingEl.hidden = true;
  }

  // ---------- File load ----------
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showLoading('Reading file…', file.name);
    const buf = await file.arrayBuffer();
    state.fileName = file.name;
    state.fileFingerprint = `${file.name}|${file.size}`;
    state.originalBytes = new Uint8Array(buf.slice(0));
    state.notes = loadNotesFromStorage(state.fileFingerprint);
    await loadPdf(new Uint8Array(buf));
  });

  async function loadPdf(data) {
    updateLoading('Parsing PDF…');
    try {
      state.pdf = await pdfjsLib.getDocument({ data }).promise;
    } catch (err) {
      hideLoading();
      statusEl.textContent = 'Error: ' + err.message;
      return;
    }
    pageCountEl.textContent = state.pdf.numPages;
    pageInput.max = state.pdf.numPages;
    toolbar.hidden = false;
    closeNoteEditor();
    setNoteMode(false);
    await renderAll();
    pageInput.value = 1;
    hideLoading();
  }

  // ---------- Render ----------
  async function renderAll() {
    viewer.innerHTML = '';
    state.pages.length = 0;
    if (!state.pdf) return;

    for (let i = 1; i <= state.pdf.numPages; i++) {
      updateLoading(`Rendering page ${i} / ${state.pdf.numPages}…`);
      state.pages.push(await renderPage(state.pdf, i));
    }

    updateLoading('Linking references…');
    let refCount = 0;
    for (const p of state.pages) {
      for (const ann of p.annotations) {
        if (ann.subtype !== 'Link' || ann.url) continue;
        const target = await resolveDest(ann);
        if (!target) continue;
        const content = inferContent(target);
        const hot = makeHotspot(ann.rect, p.viewport);
        hot.dataset.targetPage = target.pageIdx;
        hot.dataset.targetY = target.point.y;
        hot.dataset.bbox = JSON.stringify(content.bbox);
        hot.dataset.label = content.label;
        p.overlay.appendChild(hot);
        refCount++;
      }
    }

    renderAllNoteCards();
    updateZoomLabel();

    statusEl.textContent =
      `${state.pdf.numPages} page${state.pdf.numPages > 1 ? 's' : ''} • ` +
      `${refCount} live ref${refCount === 1 ? '' : 's'} • ` +
      `${state.notes.length} note${state.notes.length === 1 ? '' : 's'}`;
    if (refCount === 0) {
      statusEl.textContent +=
        ' (no \\ref links — non-hyperref PDF?)';
    }
  }

  async function renderPage(pdf, pageNum) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: state.scale });

    const wrap = document.createElement('div');
    wrap.className = 'page-wrap';
    const numLabel = document.createElement('div');
    numLabel.className = 'page-num';
    numLabel.textContent = `page ${pageNum}`;
    wrap.appendChild(numLabel);

    const pageDiv = document.createElement('div');
    pageDiv.className = 'page';
    pageDiv.style.width = viewport.width + 'px';
    pageDiv.style.height = viewport.height + 'px';

    const outputScale = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    pageDiv.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const transform =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
    await page.render({
      canvasContext: ctx,
      viewport,
      transform,
    }).promise;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    pageDiv.appendChild(overlay);

    wrap.appendChild(pageDiv);
    viewer.appendChild(wrap);

    const textContent = await page.getTextContent();
    const items = [];
    for (const raw of textContent.items) {
      if (!raw.str) continue;
      const tx = pdfjsLib.Util.transform(viewport.transform, raw.transform);
      const fontHeight = Math.hypot(tx[2], tx[3]);
      items.push({
        str: raw.str,
        fontName: raw.fontName,
        x: tx[4],
        y: tx[5] - fontHeight,
        w: (raw.width || 0) * viewport.scale,
        h: fontHeight,
      });
    }

    const annotations = await page.getAnnotations();
    return {
      pageIdx: pageNum - 1,
      canvas,
      outputScale,
      viewport,
      items,
      annotations,
      overlay,
      wrap,
    };
  }

  // ---------- Annotation resolution & content inference ----------
  async function resolveDest(ann) {
    let dest = ann.dest;
    if (!dest) return null;
    if (typeof dest === 'string') {
      try {
        dest = await state.pdf.getDestination(dest);
      } catch {
        return null;
      }
      if (!dest) return null;
    }
    if (!Array.isArray(dest) || dest.length === 0) return null;
    let pageIdx;
    try {
      pageIdx = await state.pdf.getPageIndex(dest[0]);
    } catch {
      return null;
    }
    if (pageIdx < 0 || pageIdx >= state.pages.length) return null;

    const fit = dest[1] && (dest[1].name || dest[1]);
    let xPdf = null;
    let yPdf = null;
    if (fit === 'XYZ') {
      xPdf = numericOrNull(dest[2]);
      yPdf = numericOrNull(dest[3]);
    } else if (fit === 'FitH' || fit === 'FitBH') {
      yPdf = numericOrNull(dest[2]);
    } else if (fit === 'FitV' || fit === 'FitBV') {
      xPdf = numericOrNull(dest[2]);
    } else if (fit === 'FitR') {
      xPdf = numericOrNull(dest[2]);
      yPdf = numericOrNull(dest[5]);
    }
    const dp = state.pages[pageIdx];
    let vx = 0;
    let vy = 0;
    if (xPdf != null && yPdf != null) {
      [vx, vy] = dp.viewport.convertToViewportPoint(xPdf, yPdf);
    } else if (yPdf != null) {
      [, vy] = dp.viewport.convertToViewportPoint(0, yPdf);
    } else if (xPdf != null) {
      [vx] = dp.viewport.convertToViewportPoint(xPdf, 0);
    }
    return { pageIdx, point: { x: vx, y: vy } };
  }

  function numericOrNull(v) {
    return typeof v === 'number' && isFinite(v) ? v : null;
  }

  function makeHotspot(rect, viewport) {
    const r = viewport.convertToViewportRectangle(rect);
    const x = Math.min(r[0], r[2]);
    const y = Math.min(r[1], r[3]);
    const w = Math.abs(r[2] - r[0]);
    const h = Math.abs(r[3] - r[1]);
    const hot = document.createElement('div');
    hot.className = 'ref';
    hot.style.left = x + 'px';
    hot.style.top = y + 'px';
    hot.style.width = w + 'px';
    hot.style.height = h + 'px';
    return hot;
  }

  function inferContent(target) {
    const p = state.pages[target.pageIdx];
    const { y: dy } = target.point;
    const lines = groupByLine(p.items);
    if (lines.length === 0) {
      return {
        label: '',
        bbox: { x: 0, y: Math.max(0, dy - 20), w: p.viewport.width, h: 80 },
      };
    }
    const lineMetrics = lines.map((line) => {
      const top = Math.min(...line.map((it) => it.y));
      const bottom = Math.max(...line.map((it) => it.y + it.h));
      return { line, top, bottom, mid: (top + bottom) / 2 };
    });

    let idx = lineMetrics.findIndex(
      (m) => dy >= m.top - 4 && dy <= m.bottom + 4
    );
    if (idx < 0) {
      let best = -1;
      let bestDist = Infinity;
      for (let i = 0; i < lineMetrics.length; i++) {
        const m = lineMetrics[i];
        if (m.top < dy - 4) continue;
        const d = m.top - dy;
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      idx = best;
    }
    if (idx < 0) {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < lineMetrics.length; i++) {
        const d = Math.abs(lineMetrics[i].mid - dy);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      idx = best;
    }

    const proseLeft = estimateProseLeft(lineMetrics);
    const targetLine = lineMetrics[idx].line;
    const lineText = lineString(targetLine);
    const viewportW = p.viewport.width;

    const eqLabel = findRightAlignedEqLabel(targetLine, viewportW);
    if (eqLabel) {
      return {
        label: `(${eqLabel.match})`,
        bbox: equationBlock(idx, lineMetrics, proseLeft),
      };
    }
    const lineLeft = Math.min(...targetLine.map((it) => it.x));
    if (lineLeft > proseLeft + 30) {
      return { label: '', bbox: equationBlock(idx, lineMetrics, proseLeft) };
    }
    return { label: extractLabel(lineText), bbox: paragraphBlock(idx, lineMetrics) };
  }

  function findRightAlignedEqLabel(line, pageWidth) {
    for (const it of line) {
      const m = it.str.match(/^\s*\((\d+(?:\.\d+)+[a-z]?)\)\s*$/);
      if (!m) continue;
      if (it.x + it.w > pageWidth * 0.6) return { item: it, match: m[1] };
    }
    return null;
  }

  function lineString(line) {
    return line.slice().sort((a, b) => a.x - b.x).map((it) => it.str).join(' ');
  }

  function extractLabel(text) {
    const t = text.trim();
    const m = t.match(
      /^([A-ZÄÖÜÉÈÊÀÂÔÎÇÑ][\wäöüéèêàâôîßçñÄÖÜ]{2,})\s+(\d+(?:\.\d+)*)/
    );
    if (m) return `${m[1]} ${m[2]}`;
    const eq = t.match(/\((\d+(?:\.\d+)+[a-z]?)\)/);
    if (eq) return `(${eq[1]})`;
    const sec = t.match(/^(\d+(?:\.\d+)*)\s+\S/);
    if (sec) return `§${sec[1]}`;
    return '';
  }

  function looksLikeNewBlockHeader(text) {
    const t = text.trim();
    if (
      /^(Proof|Beweis|D[ée]monstration|Dimostrazione|Demostraci[óo]n|Bewijs)\b/i.test(t)
    ) return true;
    if (
      /^[A-ZÄÖÜÉÈÊÀÂÔÎÇÑ][\wäöüéèêàâôîßçñÄÖÜ]{2,}\s+\d+(?:\.\d+)*\.(\s|$)/.test(t)
    ) return true;
    if (/^\d+(?:\.\d+){0,3}\s+[A-ZÄÖÜÉÈÊ]/.test(t)) return true;
    return false;
  }

  function paragraphBlock(startIdx, lineMetrics) {
    const start = lineMetrics[startIdx];
    let top = start.top;
    let bottom = start.bottom;
    let left = Math.min(...start.line.map((it) => it.x));
    let right = Math.max(...start.line.map((it) => it.x + it.w));
    const lineH = Math.max(start.bottom - start.top, 8);
    let lastBottom = bottom;
    const maxLines = 18;
    for (let i = startIdx + 1; i < lineMetrics.length && i <= startIdx + maxLines; i++) {
      const cur = lineMetrics[i];
      const gap = cur.top - lastBottom;
      if (gap > lineH * 1.4) break;
      const text = lineString(cur.line);
      if (looksLikeNewBlockHeader(text)) break;
      bottom = Math.max(bottom, cur.bottom);
      left = Math.min(left, Math.min(...cur.line.map((it) => it.x)));
      right = Math.max(right, Math.max(...cur.line.map((it) => it.x + it.w)));
      lastBottom = cur.bottom;
    }
    const pad = 6;
    return {
      x: Math.max(0, left - pad),
      y: Math.max(0, top - pad),
      w: right - left + 2 * pad,
      h: bottom - top + 2 * pad,
    };
  }

  function equationBlock(idx, lineMetrics, proseLeft) {
    const start = lineMetrics[idx];
    let top = start.top;
    let bottom = start.bottom;
    let left = Math.min(...start.line.map((it) => it.x));
    let right = Math.max(...start.line.map((it) => it.x + it.w));
    for (let i = idx - 1; i >= 0 && i >= idx - 6; i--) {
      const cur = lineMetrics[i];
      const minX = Math.min(...cur.line.map((it) => it.x));
      if (minX < proseLeft + 30) break;
      top = Math.min(top, cur.top);
      left = Math.min(left, minX);
      right = Math.max(right, Math.max(...cur.line.map((it) => it.x + it.w)));
    }
    for (let i = idx + 1; i < lineMetrics.length && i <= idx + 6; i++) {
      const cur = lineMetrics[i];
      const minX = Math.min(...cur.line.map((it) => it.x));
      if (minX < proseLeft + 30) break;
      bottom = Math.max(bottom, cur.bottom);
      left = Math.min(left, minX);
      right = Math.max(right, Math.max(...cur.line.map((it) => it.x + it.w)));
    }
    const pad = 8;
    return {
      x: Math.max(0, left - pad),
      y: Math.max(0, top - pad),
      w: right - left + 2 * pad,
      h: bottom - top + 2 * pad,
    };
  }

  function estimateProseLeft(lineMetrics) {
    if (!lineMetrics.length) return 0;
    const lefts = lineMetrics.map((m) =>
      Math.min(...m.line.map((it) => it.x))
    );
    return median(lefts);
  }

  function groupByLine(items) {
    if (items.length === 0) return [];
    const sorted = [...items].sort((a, b) => a.y - b.y);
    const lines = [];
    let current = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const it = sorted[i];
      const ref = current[0];
      const tol = Math.max(ref.h, it.h) * 0.6;
      if (Math.abs(it.y - ref.y) <= tol) current.push(it);
      else {
        lines.push(current);
        current = [it];
      }
    }
    lines.push(current);
    return lines;
  }
  function median(arr) {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // ---------- Zoom & navigation ----------
  function updateZoomLabel() {
    zoomLevelEl.textContent = state.scale.toFixed(2).replace(/\.?0+$/, '') + '×';
  }

  function saveViewportPosition() {
    if (!state.pages.length) return null;
    const targetY = window.scrollY + window.innerHeight / 2;
    for (let i = 0; i < state.pages.length; i++) {
      const r = state.pages[i].wrap.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const bottom = top + r.height;
      if (targetY >= top && targetY <= bottom) {
        return { idx: i, frac: (targetY - top) / r.height };
      }
    }
    return { idx: 0, frac: 0 };
  }

  function restoreViewportPosition(pos) {
    if (!pos || !state.pages[pos.idx]) return;
    const r = state.pages[pos.idx].wrap.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const target = top + r.height * pos.frac - window.innerHeight / 2;
    window.scrollTo({ top: Math.max(0, target) });
  }

  async function setZoom(newScale) {
    newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    if (Math.abs(newScale - state.scale) < 0.01) return;
    closeNoteEditor();
    const pos = saveViewportPosition();
    state.scale = newScale;
    showLoading('Re-rendering at new zoom…', state.fileName);
    await renderAll();
    hideLoading();
    restoreViewportPosition(pos);
  }

  async function fitToWidth() {
    if (!state.pdf) return;
    const page = await state.pdf.getPage(1);
    const natural = page.getViewport({ scale: 1 });
    const target = viewer.clientWidth - 60;
    await setZoom(target / natural.width);
  }

  zoomInBtn.addEventListener('click', () => setZoom(state.scale * ZOOM_STEP));
  zoomOutBtn.addEventListener('click', () => setZoom(state.scale / ZOOM_STEP));
  zoomFitBtn.addEventListener('click', fitToWidth);

  function currentVisiblePageNum() {
    const pos = saveViewportPosition();
    return (pos?.idx ?? 0) + 1;
  }

  function goToPage(n) {
    if (!state.pdf) return;
    const clamped = Math.max(1, Math.min(state.pdf.numPages, n));
    const p = state.pages[clamped - 1];
    if (!p) return;
    const r = p.wrap.getBoundingClientRect();
    const top = r.top + window.scrollY - 70;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    pageInput.value = clamped;
  }

  prevPageBtn.addEventListener('click', () => goToPage(currentVisiblePageNum() - 1));
  nextPageBtn.addEventListener('click', () => goToPage(currentVisiblePageNum() + 1));
  pageInput.addEventListener('change', () => goToPage(+pageInput.value));
  pageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      goToPage(+pageInput.value);
      pageInput.blur();
    }
  });

  // Update the page input as user scrolls
  let scrollTimer = null;
  window.addEventListener('scroll', () => {
    if (!state.pdf) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const n = currentVisiblePageNum();
      if (document.activeElement !== pageInput) pageInput.value = n;
    }, 120);
  });

  // ---------- Hover preview (reference popup) ----------
  document.addEventListener('mouseover', (e) => {
    const ref = e.target.closest('.ref');
    if (!ref) return;
    showTooltip(ref);
  });
  document.addEventListener('mouseout', (e) => {
    const ref = e.target.closest('.ref');
    if (!ref) return;
    if (e.relatedTarget && ref.contains(e.relatedTarget)) return;
    tooltip.hidden = true;
  });

  function showTooltip(refEl) {
    const pageIdx = +refEl.dataset.targetPage;
    const p = state.pages[pageIdx];
    if (!p) return;
    let bbox;
    try { bbox = JSON.parse(refEl.dataset.bbox); } catch { return; }
    const { x, y, w, h } = bbox;
    if (w <= 0 || h <= 0) return;
    const s = p.outputScale;
    const out = document.createElement('canvas');
    out.width = Math.round(w * s);
    out.height = Math.round(h * s);
    out.getContext('2d').drawImage(
      p.canvas,
      Math.round(x * s), Math.round(y * s),
      Math.round(w * s), Math.round(h * s),
      0, 0,
      out.width, out.height
    );
    out.style.width = w + 'px';
    out.style.height = h + 'px';

    tooltip.innerHTML = '';
    if (refEl.dataset.label) {
      const labelTag = document.createElement('div');
      labelTag.className = 'tt-label';
      labelTag.textContent = refEl.dataset.label;
      tooltip.appendChild(labelTag);
    }
    tooltip.appendChild(out);

    const maxW = Math.min(720, window.innerWidth * 0.9);
    if (w > maxW - 16) {
      const k = (maxW - 16) / w;
      out.style.width = w * k + 'px';
      out.style.height = h * k + 'px';
    }
    tooltip.hidden = false;
    const refRect = refEl.getBoundingClientRect();
    const ttRect = tooltip.getBoundingClientRect();
    let left = refRect.left + window.scrollX;
    let top = refRect.top + window.scrollY - ttRect.height - 10;
    if (top < window.scrollY + 10) top = refRect.bottom + window.scrollY + 10;
    const maxLeft =
      window.scrollX + document.documentElement.clientWidth - ttRect.width - 12;
    if (left > maxLeft) left = maxLeft;
    if (left < window.scrollX + 8) left = window.scrollX + 8;
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  // ---------- Click routing (note card / note drop / ref jump) ----------
  viewer.addEventListener('click', (e) => {
    // Clicks inside a note card are handled by the card's own buttons.
    if (e.target.closest('.note-card')) return;

    if (state.noteMode) {
      const pageEl = e.target.closest('.page');
      if (!pageEl) return;
      const wrap = pageEl.closest('.page-wrap');
      const pageIdx = state.pages.findIndex((p) => p.wrap === wrap);
      if (pageIdx < 0) return;
      e.preventDefault();
      createNoteAt(pageIdx, e.clientX, e.clientY);
      return;
    }
    const ref = e.target.closest('.ref');
    if (ref) {
      e.preventDefault();
      jumpToRef(ref);
    }
  });

  function jumpToRef(refEl) {
    const pageIdx = +refEl.dataset.targetPage;
    const targetY = +refEl.dataset.targetY;
    const p = state.pages[pageIdx];
    if (!p) return;
    const pageRect = p.wrap.getBoundingClientRect();
    const pageDiv = p.wrap.querySelector('.page');
    const scrollTo =
      window.scrollY + pageRect.top + pageDiv.offsetTop + targetY - 120;
    window.scrollTo({ top: Math.max(0, scrollTo), behavior: 'smooth' });
    pageDiv.classList.remove('flash');
    void pageDiv.offsetWidth;
    pageDiv.classList.add('flash');
  }

  // ---------- Notes ----------
  function setNoteMode(on) {
    state.noteMode = on;
    document.body.classList.toggle('note-mode', on);
    noteBtn.classList.toggle('active', on);
  }
  noteBtn.addEventListener('click', () => setNoteMode(!state.noteMode));

  function createNoteAt(pageIdx, clientX, clientY) {
    const p = state.pages[pageIdx];
    const canvasRect = p.canvas.getBoundingClientRect();
    const vx = clientX - canvasRect.left;
    const vy = clientY - canvasRect.top;
    const [xPdf, yPdf] = p.viewport.convertToPdfPoint(vx, vy);
    const note = {
      id: 'n' + Math.random().toString(36).slice(2, 10),
      pageIdx,
      xPdf,
      yPdf,
      text: '',
    };
    state.notes.push(note);
    saveNotesToStorage();
    placeNoteCard(note);
    openNoteEditor(note.id);
    setNoteMode(false);
    refreshStatusCounts();
  }

  function renderAllNoteCards() {
    for (const note of state.notes) placeNoteCard(note);
  }

  function placeNoteCard(note) {
    const p = state.pages[note.pageIdx];
    if (!p) return;
    const [vx, vy] = p.viewport.convertToViewportPoint(note.xPdf, note.yPdf);
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.noteId = note.id;
    card.style.left = vx + 'px';
    card.style.top = vy + 'px';

    const textEl = document.createElement('div');
    textEl.className = 'note-card-text';
    card.appendChild(textEl);

    const toolbar = document.createElement('div');
    toolbar.className = 'note-card-toolbar';

    const editBtn = document.createElement('button');
    editBtn.className = 'note-card-btn edit';
    editBtn.type = 'button';
    editBtn.title = 'Edit note';
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openNoteEditor(note.id);
    });
    toolbar.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'note-card-btn delete';
    delBtn.type = 'button';
    delBtn.title = 'Delete note';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteNote(note.id);
    });
    toolbar.appendChild(delBtn);

    card.appendChild(toolbar);
    renderCardContent(textEl, note.text);

    if (note.id === state.activeNoteId) card.classList.add('active');
    p.overlay.appendChild(card);
  }

  function renderCardContent(textEl, text) {
    if (!text || !text.trim()) {
      textEl.innerHTML =
        '<span class="note-card-empty">(empty — click ✎ to edit)</span>';
      return;
    }
    textEl.textContent = text;
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(textEl, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
    }
  }

  function cardElement(noteId) {
    return document.querySelector(`.note-card[data-note-id="${noteId}"]`);
  }

  function deleteNote(id) {
    state.notes = state.notes.filter((n) => n.id !== id);
    saveNotesToStorage();
    const card = cardElement(id);
    if (card) card.remove();
    if (state.activeNoteId === id) {
      state.activeNoteId = null;
      noteEditor.hidden = true;
    }
    refreshStatusCounts();
  }

  function openNoteEditor(noteId) {
    const note = state.notes.find((n) => n.id === noteId);
    if (!note) return;
    if (state.activeNoteId && state.activeNoteId !== noteId) {
      closeNoteEditor();
    }
    state.activeNoteId = noteId;
    document
      .querySelectorAll('.note-card.active')
      .forEach((el) => el.classList.remove('active'));
    const card = cardElement(noteId);
    if (card) card.classList.add('active');
    noteText.value = note.text || '';
    updateNotePreview();
    noteEditor.hidden = false;
    positionNoteEditor(card);
    noteText.focus();
  }

  function positionNoteEditor(anchor) {
    if (!anchor) return;
    const ar = anchor.getBoundingClientRect();
    const ne = noteEditor;
    ne.style.left = '0px';
    ne.style.top = '0px';
    const er = ne.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    let left = ar.right + 12;
    let top = ar.top;
    if (left + er.width > vw - 8) left = ar.left - er.width - 12;
    if (left < 8) left = 8;
    if (top + er.height > vh - 8) top = vh - er.height - 8;
    if (top < 8) top = 8;
    ne.style.left = left + window.scrollX + 'px';
    ne.style.top = top + window.scrollY + 'px';
  }

  function closeNoteEditor() {
    if (!state.activeNoteId) {
      noteEditor.hidden = true;
      return;
    }
    const id = state.activeNoteId;
    const note = state.notes.find((n) => n.id === id);
    state.activeNoteId = null;
    noteEditor.hidden = true;
    if (!note) return;
    note.text = noteText.value;
    saveNotesToStorage();
    // Auto-delete notes that ended up empty (e.g. just-created and abandoned).
    if (!note.text.trim()) {
      state.notes = state.notes.filter((n) => n.id !== id);
      saveNotesToStorage();
      const card = cardElement(id);
      if (card) card.remove();
      refreshStatusCounts();
      return;
    }
    const card = cardElement(id);
    if (card) {
      card.classList.remove('active');
      const textEl = card.querySelector('.note-card-text');
      if (textEl) renderCardContent(textEl, note.text);
    }
  }

  function deleteActiveNote() {
    if (!state.activeNoteId) return;
    deleteNote(state.activeNoteId);
  }

  noteDeleteBtn.addEventListener('click', deleteActiveNote);
  noteCloseBtn.addEventListener('click', closeNoteEditor);

  let previewTimer = null;
  noteText.addEventListener('input', () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const note = state.notes.find((n) => n.id === state.activeNoteId);
      if (note) {
        note.text = noteText.value;
        saveNotesToStorage();
        const card = cardElement(note.id);
        if (card) {
          const textEl = card.querySelector('.note-card-text');
          if (textEl) renderCardContent(textEl, note.text);
        }
      }
      updateNotePreview();
    }, 180);
  });

  function updateNotePreview() {
    const text = noteText.value;
    notePreview.textContent = text;
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(notePreview, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
    }
  }

  // close editor on outside click
  document.addEventListener('mousedown', (e) => {
    if (!state.activeNoteId) return;
    if (e.target.closest('.note-editor')) return;
    if (e.target.closest('.note-card')) return;
    closeNoteEditor();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.activeNoteId) closeNoteEditor();
      else if (state.noteMode) setNoteMode(false);
      return;
    }
    const inField =
      e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
    if (inField) return;
    if (e.key === 'ArrowLeft') goToPage(currentVisiblePageNum() - 1);
    else if (e.key === 'ArrowRight') goToPage(currentVisiblePageNum() + 1);
  });

  // ---------- Notes storage ----------
  function storageKey(fp) {
    return 'mathpdf:notes:' + fp;
  }
  function loadNotesFromStorage(fp) {
    try {
      const raw = localStorage.getItem(storageKey(fp));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  function saveNotesToStorage() {
    if (!state.fileFingerprint) return;
    try {
      localStorage.setItem(
        storageKey(state.fileFingerprint),
        JSON.stringify(state.notes)
      );
    } catch {
      /* quota exceeded etc. — ignore */
    }
  }

  function refreshStatusCounts() {
    // Only update the trailing "N notes" segment if a status line exists.
    const m = statusEl.textContent.match(
      /^(.*?)(\s•\s\d+ notes?.*$)?$/
    );
    if (m) {
      const base = m[1];
      statusEl.textContent =
        base + ` • ${state.notes.length} note${state.notes.length === 1 ? '' : 's'}`;
    }
  }

  // ---------- Download annotated PDF ----------
  downloadBtn.addEventListener('click', async () => {
    if (!state.originalBytes) return;
    closeNoteEditor();
    downloadBtn.disabled = true;
    const original = downloadBtn.textContent;
    downloadBtn.textContent = 'Building…';
    try {
      await downloadAnnotatedPdf();
    } catch (err) {
      console.error(err);
      alert('Could not build annotated PDF: ' + err.message);
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = original;
    }
  });

  async function downloadAnnotatedPdf() {
    const { PDFDocument } = window.PDFLib;
    const doc = await PDFDocument.load(state.originalBytes);

    for (const note of state.notes) {
      if (!note.text || !note.text.trim()) continue;
      const pngBytes = await renderNoteToPng(note);
      if (!pngBytes) continue;
      const png = await doc.embedPng(pngBytes);
      const pdfPage = doc.getPage(note.pageIdx);
      const renderScale = 2; // we render at 2x for sharpness
      const w = png.width / renderScale;
      const h = png.height / renderScale;
      pdfPage.drawImage(png, {
        x: note.xPdf,
        y: note.yPdf - h,
        width: w,
        height: h,
      });
    }

    const out = await doc.save();
    const fileName = (state.fileName || 'document.pdf').replace(
      /\.pdf$/i,
      ''
    ) + '_annotated.pdf';
    const blob = new Blob([out], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function renderNoteToPng(note) {
    if (typeof html2canvas !== 'function') return null;
    const div = document.createElement('div');
    div.className = 'note-export';
    div.textContent = note.text;
    document.body.appendChild(div);

    if (typeof renderMathInElement === 'function') {
      renderMathInElement(div, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
    }

    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch {}
    }
    void div.offsetHeight;

    const canvas = await html2canvas(div, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
    });
    div.remove();

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return resolve(null);
        const buf = await blob.arrayBuffer();
        resolve(new Uint8Array(buf));
      }, 'image/png');
    });
  }
})();
