/* ═══════════════════════════════════════════════════════════
   PDF Viewer  ·  pdfviewer.js
   Windows 8 Reader style — powered by PDF.js
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════════ */
const PDF = {
  isMin      : false,
  isMax      : false,
  pdfDoc     : null,       /* PDF.js document object */
  fileName   : '',
  filePath   : '',         /* path in virtual FS or blob URL */
  totalPages : 0,
  currentPage: 1,
  zoom       : 1.2,        /* scale factor */
  rotation   : 0,          /* 0 | 90 | 180 | 270 */
  renderTask : null,
  thumbsOpen : true,
  twoPageMode: false,
  drag       : { on:false, ox:0, oy:0 },
  resize     : { on:false, sx:0, sy:0, sw:0, sh:0 },
  searchText : '',
};

const PDF_ZOOM_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];

/* ════════════════════════════════════════════════════════════
   OPEN
   ════════════════════════════════════════════════════════════ */
function openPDFViewer(fileName, filePath, fileData) {
  const existing = document.getElementById('pdfWindow');
  if (existing) {
    if (PDF.isMin) pdfRestore();
    if (fileName && fileName !== PDF.fileName) {
      PDF.fileName = fileName;
      PDF.filePath = filePath || '';
      pdfLoad(fileData || filePath);
    }
    return;
  }

  PDF.fileName   = fileName  || 'document.pdf';
  PDF.filePath   = filePath  || '';
  PDF.currentPage= 1;
  PDF.zoom       = 1.2;
  PDF.rotation   = 0;

  pdfBuildWindow();
  pdfInjectTaskbar();
  pdfSetupDrag();
  pdfSetupResize();

  /* load PDF.js from CDN, then load file */
  pdfLoadLibrary(() => pdfLoad(fileData || filePath));
}

/* ════════════════════════════════════════════════════════════
   LOAD PDF.JS LIBRARY
   ════════════════════════════════════════════════════════════ */
function pdfLoadLibrary(callback) {
  if (window.pdfjsLib) { callback(); return; }

  const script  = document.createElement('script');
  script.src    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  script.onload = () => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    callback();
  };
  script.onerror = () => pdfShowError('PDF.js library could not be loaded.', 'Check your internet connection and try again.');
  document.head.appendChild(script);
}

/* ════════════════════════════════════════════════════════════
   LOAD PDF FILE
   ════════════════════════════════════════════════════════════ */
async function pdfLoad(source) {
  pdfShowLoading('Loading ' + PDF.fileName + '…');

  try {
    let loadingTask;

    if (!source) {
      /* No source — try to load from project root by filename */
      loadingTask = pdfjsLib.getDocument(PDF.fileName);
    } else if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
      loadingTask = pdfjsLib.getDocument({ data: source });
    } else if (typeof source === 'string' && source.startsWith('blob:')) {
      loadingTask = pdfjsLib.getDocument(source);
    } else if (typeof source === 'string' && (source.startsWith('http') || source.startsWith('/'))) {
      loadingTask = pdfjsLib.getDocument(source);
    } else {
      /* treat as relative path in project */
      loadingTask = pdfjsLib.getDocument(source || PDF.fileName);
    }

    PDF.pdfDoc    = await loadingTask.promise;
    PDF.totalPages= PDF.pdfDoc.numPages;
    PDF.currentPage = 1;

    pdfHideStates();
    pdfUpdateTitleBar();
    pdfUpdatePageNav();
    pdfUpdateStatus();

    await pdfRenderAll();
    await pdfRenderThumbs();

  } catch (err) {
    console.warn('[PDF Viewer]', err);
    pdfShowError(
      'Could not open "' + PDF.fileName + '"',
      'Make sure the file exists in the project root directory.\n\nError: ' + err.message
    );
  }
}

/* ════════════════════════════════════════════════════════════
   BUILD WINDOW DOM
   ════════════════════════════════════════════════════════════ */
function pdfBuildWindow() {
  const win = document.createElement('div');
  win.id = 'pdfWindow';
  win.innerHTML = `
<!-- Title bar -->
<div class="pdf-titlebar" id="pdfTitleBar">
  <span class="pdf-titlebar-icon">📄</span>
  <span class="pdf-titlebar-text" id="pdfTitleText">PDF Viewer</span>
  <div class="pdf-controls">
    <button class="pdf-btn" onclick="pdfMinimise()" title="Minimise">&#x2014;</button>
    <button class="pdf-btn" id="pdfMaxBtn" onclick="pdfMaximise()" title="Maximise">&#x2610;</button>
    <button class="pdf-btn close" onclick="pdfClose()" title="Close">&#x2715;</button>
  </div>
</div>

<!-- Toolbar -->
<div class="pdf-toolbar">

  <!-- Thumbnail toggle -->
  <button class="pdf-tool-btn active" id="pdfThumbBtn" onclick="pdfToggleThumbs()" title="Thumbnails">&#x1F5BC;</button>

  <div class="pdf-tool-sep"></div>

  <!-- Navigation -->
  <button class="pdf-tool-btn" id="pdfBtnFirst" onclick="pdfGoTo(1)" title="First page">&#x23EE;</button>
  <button class="pdf-tool-btn" id="pdfBtnPrev"  onclick="pdfPrevPage()" title="Previous page">&#x276E;</button>

  <div class="pdf-page-nav">
    <input class="pdf-page-input" id="pdfPageInput" type="number" min="1" value="1"
           onkeydown="if(event.key==='Enter')pdfGoToInput()"
           onblur="pdfGoToInput()">
    <span class="pdf-page-total" id="pdfPageTotal">/ 1</span>
  </div>

  <button class="pdf-tool-btn" id="pdfBtnNext"  onclick="pdfNextPage()" title="Next page">&#x276F;</button>
  <button class="pdf-tool-btn" id="pdfBtnLast"  onclick="pdfGoTo(PDF.totalPages)" title="Last page">&#x23ED;</button>

  <div class="pdf-tool-sep"></div>

  <!-- Zoom -->
  <button class="pdf-tool-btn" onclick="pdfZoomOut()" title="Zoom out">&#x2212;</button>

  <input class="pdf-zoom-input" id="pdfZoomInput" type="text" value="120%"
         onkeydown="if(event.key==='Enter')pdfZoomFromInput()"
         onblur="pdfZoomFromInput()" title="Zoom level">

  <button class="pdf-tool-btn" onclick="pdfZoomIn()" title="Zoom in">+</button>

  <select class="pdf-zoom-select" id="pdfZoomSelect" onchange="pdfZoomPreset(this.value)" title="Zoom preset">
    <option value="0.5">50%</option>
    <option value="0.75">75%</option>
    <option value="1.0">100%</option>
    <option value="1.25">125%</option>
    <option value="1.5" selected>150%</option>
    <option value="2.0">200%</option>
    <option value="fit-width">Fit Width</option>
    <option value="fit-page">Fit Page</option>
  </select>

  <div class="pdf-tool-sep"></div>

  <!-- Rotate -->
  <button class="pdf-tool-btn" onclick="pdfRotate(-90)" title="Rotate left">&#x21BA;</button>
  <button class="pdf-tool-btn" onclick="pdfRotate(90)"  title="Rotate right">&#x21BB;</button>

  <div class="pdf-tool-sep"></div>

  <!-- View modes -->
  <button class="pdf-tool-btn" id="pdfTwoPageBtn" onclick="pdfToggleTwoPage()" title="Two-page view">&#x1F4F0;</button>
  <button class="pdf-tool-btn" onclick="pdfFullscreen()" title="Fullscreen">&#x26F6;</button>

  <div class="pdf-tool-sep"></div>

  <!-- Download -->
  <button class="pdf-tool-btn" onclick="pdfDownload()" title="Download PDF">&#x2913;</button>
  <button class="pdf-tool-btn" onclick="pdfPrint()" title="Print">&#x1F5A8;</button>

  <!-- Search -->
  <div class="pdf-search-wrap">
    <span style="font-size:12px;opacity:.5">&#x1F50D;</span>
    <input id="pdfSearchInput" type="text" placeholder="Search in document…"
           onkeydown="pdfSearchKey(event)"
           oninput="pdfSearchLive(this.value)">
  </div>

  <span class="pdf-filename-label" id="pdfFileLabel"></span>
</div>

<!-- Body -->
<div class="pdf-body">

  <!-- Thumbnail sidebar -->
  <div class="pdf-thumbs" id="pdfThumbs"></div>

  <!-- Canvas scroll area -->
  <div class="pdf-canvas-area" id="pdfCanvasArea"></div>

</div>

<!-- Status bar -->
<div class="pdf-statusbar">
  <span class="pdf-status-item" id="pdfStatusPage">Page 1 of 1</span>
  <span class="pdf-status-item" id="pdfStatusZoom">Zoom: 120%</span>
  <span class="pdf-status-item" id="pdfStatusSize">—</span>
  <span class="pdf-status-item" style="margin-left:auto">PDF Viewer · Powered by PDF.js</span>
</div>

<!-- Resize -->
<div class="pdf-resize" id="pdfResizeHandle"></div>`;

  document.body.appendChild(win);
  document.getElementById('pdfTitleBar').addEventListener('dblclick', pdfMaximise);

  /* keyboard shortcuts */
  document.addEventListener('keydown', pdfKeyHandler);
}

/* ════════════════════════════════════════════════════════════
   RENDER PAGES
   ════════════════════════════════════════════════════════════ */
async function pdfRenderAll() {
  const area = document.getElementById('pdfCanvasArea');
  if (!area || !PDF.pdfDoc) return;
  area.innerHTML = '';

  const pagesToRender = PDF.twoPageMode
    ? [PDF.currentPage, PDF.currentPage + 1].filter(p => p <= PDF.totalPages)
    : Array.from({ length: PDF.totalPages }, (_, i) => i + 1);

  for (const pageNum of pagesToRender) {
    await pdfRenderPage(pageNum, area);
  }

  /* scroll to current page */
  pdfScrollToPage(PDF.currentPage);
}

async function pdfRenderPage(pageNum, container) {
  const page    = await PDF.pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: PDF.zoom, rotation: PDF.rotation });

  const wrap    = document.createElement('div');
  wrap.className = 'pdf-page-wrap';
  wrap.id        = `pdfPageWrap-${pageNum}`;
  wrap.style.width  = viewport.width  + 'px';
  wrap.style.height = viewport.height + 'px';

  const canvas  = document.createElement('canvas');
  canvas.width  = viewport.width;
  canvas.height = viewport.height;
  wrap.appendChild(canvas);

  /* page number badge */
  const badge = document.createElement('div');
  badge.className   = 'pdf-page-num-badge';
  badge.textContent = pageNum;
  wrap.appendChild(badge);

  container.appendChild(wrap);

  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;

  return canvas;
}

/* ════════════════════════════════════════════════════════════
   RENDER THUMBNAILS
   ════════════════════════════════════════════════════════════ */
async function pdfRenderThumbs() {
  const thumbsEl = document.getElementById('pdfThumbs');
  if (!thumbsEl || !PDF.pdfDoc) return;
  thumbsEl.innerHTML = '';

  for (let p = 1; p <= PDF.totalPages; p++) {
    const page     = await PDF.pdfDoc.getPage(p);
    const viewport = page.getViewport({ scale: 0.18 });

    const wrap   = document.createElement('div');
    wrap.className = 'pdf-thumb' + (p === PDF.currentPage ? ' active' : '');
    wrap.id      = `pdfThumb-${p}`;

    const canvas = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    wrap.appendChild(canvas);

    const label = document.createElement('div');
    label.className   = 'pdf-thumb-label';
    label.textContent = p;
    wrap.appendChild(label);

    wrap.onclick = () => pdfGoTo(p);
    thumbsEl.appendChild(wrap);

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
  }
}

function pdfUpdateThumbHighlight() {
  document.querySelectorAll('.pdf-thumb').forEach(t => t.classList.remove('active'));
  const active = document.getElementById(`pdfThumb-${PDF.currentPage}`);
  if (active) {
    active.classList.add('active');
    active.scrollIntoView({ block:'nearest', behavior:'smooth' });
  }
}

/* ════════════════════════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════════════════════════ */
function pdfGoTo(pageNum) {
  if (!PDF.pdfDoc) return;
  PDF.currentPage = Math.max(1, Math.min(PDF.totalPages, pageNum));
  pdfUpdatePageNav();
  pdfUpdateStatus();
  pdfUpdateThumbHighlight();
  pdfScrollToPage(PDF.currentPage);
}

function pdfScrollToPage(pageNum) {
  const wrap = document.getElementById(`pdfPageWrap-${pageNum}`);
  if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function pdfNextPage() { pdfGoTo(PDF.currentPage + 1); }
function pdfPrevPage() { pdfGoTo(PDF.currentPage - 1); }

function pdfGoToInput() {
  const inp = document.getElementById('pdfPageInput');
  if (!inp) return;
  const val = parseInt(inp.value);
  if (!isNaN(val)) pdfGoTo(val);
}

/* scroll spy — update currentPage as user scrolls */
function pdfAttachScrollSpy() {
  const area = document.getElementById('pdfCanvasArea');
  if (!area) return;
  area.addEventListener('scroll', () => {
    /* find which page wrap is most visible */
    for (let p = 1; p <= PDF.totalPages; p++) {
      const wrap = document.getElementById(`pdfPageWrap-${p}`);
      if (!wrap) continue;
      const r = wrap.getBoundingClientRect();
      const ar = area.getBoundingClientRect();
      if (r.top >= ar.top - 40 && r.top <= ar.top + ar.height / 2) {
        if (PDF.currentPage !== p) {
          PDF.currentPage = p;
          pdfUpdatePageNav();
          pdfUpdateThumbHighlight();
          pdfUpdateStatus();
        }
        break;
      }
    }
  }, { passive:true });
}

/* ════════════════════════════════════════════════════════════
   ZOOM
   ════════════════════════════════════════════════════════════ */
function pdfZoomIn() {
  const idx = PDF_ZOOM_PRESETS.findIndex(z => z >= PDF.zoom);
  const next = idx >= 0 && idx < PDF_ZOOM_PRESETS.length - 1
    ? PDF_ZOOM_PRESETS[idx + 1]
    : Math.min(PDF.zoom + 0.25, 5);
  pdfSetZoom(next);
}

function pdfZoomOut() {
  const idx = PDF_ZOOM_PRESETS.slice().reverse().findIndex(z => z <= PDF.zoom);
  const rIdx = PDF_ZOOM_PRESETS.length - 1 - idx;
  const prev = idx >= 0 && rIdx > 0
    ? PDF_ZOOM_PRESETS[rIdx - 1]
    : Math.max(PDF.zoom - 0.25, 0.1);
  pdfSetZoom(prev);
}

function pdfZoomPreset(val) {
  const area = document.getElementById('pdfCanvasArea');
  if (val === 'fit-width' && area) {
    /* fit to canvas area width */
    PDF.pdfDoc?.getPage(1).then(page => {
      const vp = page.getViewport({ scale: 1 });
      const scale = (area.clientWidth - 40) / vp.width;
      pdfSetZoom(scale);
    });
  } else if (val === 'fit-page' && area) {
    PDF.pdfDoc?.getPage(1).then(page => {
      const vp = page.getViewport({ scale: 1 });
      const scaleW = (area.clientWidth  - 40) / vp.width;
      const scaleH = (area.clientHeight - 40) / vp.height;
      pdfSetZoom(Math.min(scaleW, scaleH));
    });
  } else {
    pdfSetZoom(parseFloat(val));
  }
}

function pdfZoomFromInput() {
  const inp = document.getElementById('pdfZoomInput');
  if (!inp) return;
  const val = parseFloat(inp.value.replace('%','')) / 100;
  if (!isNaN(val) && val > 0) pdfSetZoom(val);
}

async function pdfSetZoom(scale) {
  PDF.zoom = Math.max(0.1, Math.min(5, scale));
  const pct = Math.round(PDF.zoom * 100) + '%';
  const inp = document.getElementById('pdfZoomInput');
  if (inp) inp.value = pct;
  const statusZoom = document.getElementById('pdfStatusZoom');
  if (statusZoom) statusZoom.textContent = 'Zoom: ' + pct;
  /* re-render all pages at new zoom */
  await pdfRenderAll();
}

/* ════════════════════════════════════════════════════════════
   ROTATION
   ════════════════════════════════════════════════════════════ */
async function pdfRotate(delta) {
  PDF.rotation = (PDF.rotation + delta + 360) % 360;
  await pdfRenderAll();
}

/* ════════════════════════════════════════════════════════════
   TWO-PAGE VIEW
   ════════════════════════════════════════════════════════════ */
async function pdfToggleTwoPage() {
  PDF.twoPageMode = !PDF.twoPageMode;
  const btn = document.getElementById('pdfTwoPageBtn');
  if (btn) btn.classList.toggle('active', PDF.twoPageMode);

  const area = document.getElementById('pdfCanvasArea');
  if (area) {
    area.style.flexDirection = PDF.twoPageMode ? 'row' : 'column';
    area.style.flexWrap      = PDF.twoPageMode ? 'wrap' : 'nowrap';
  }
  await pdfRenderAll();
}

/* ════════════════════════════════════════════════════════════
   THUMBNAILS
   ════════════════════════════════════════════════════════════ */
function pdfToggleThumbs() {
  PDF.thumbsOpen = !PDF.thumbsOpen;
  const el  = document.getElementById('pdfThumbs');
  const btn = document.getElementById('pdfThumbBtn');
  if (el)  el.classList.toggle('hidden', !PDF.thumbsOpen);
  if (btn) btn.classList.toggle('active',  PDF.thumbsOpen);
}

/* ════════════════════════════════════════════════════════════
   SEARCH
   ════════════════════════════════════════════════════════════ */
function pdfSearchKey(e) {
  if (e.key === 'Enter')  pdfDoSearch();
  if (e.key === 'Escape') { document.getElementById('pdfSearchInput').value = ''; }
}

function pdfSearchLive(val) {
  PDF.searchText = val;
  /* lightweight live search — just notify if blank */
  if (!val) {
    if (typeof notify === 'function') notify('Search cleared', 'PDF Viewer');
  }
}

async function pdfDoSearch() {
  const query = (document.getElementById('pdfSearchInput')?.value || '').trim();
  if (!query || !PDF.pdfDoc) return;

  /* search through all pages using PDF.js text layer */
  for (let p = 1; p <= PDF.totalPages; p++) {
    const page    = await PDF.pdfDoc.getPage(p);
    const content = await page.getTextContent();
    const text    = content.items.map(i => i.str).join(' ');
    if (text.toLowerCase().includes(query.toLowerCase())) {
      pdfGoTo(p);
      if (typeof notify === 'function') notify(`Found "${query}" on page ${p}`, 'PDF Viewer');
      return;
    }
  }
  if (typeof notify === 'function') notify(`"${query}" not found in document`, 'PDF Viewer');
}

/* ════════════════════════════════════════════════════════════
   DOWNLOAD & PRINT
   ════════════════════════════════════════════════════════════ */
function pdfDownload() {
  if (!PDF.pdfDoc) return;
  /* use the source path if available, otherwise the blob */
  if (PDF.filePath && !PDF.filePath.startsWith('blob:')) {
    const a  = document.createElement('a');
    a.href   = PDF.filePath;
    a.download = PDF.fileName;
    a.click();
  } else {
    if (typeof notify === 'function') notify('Download not available for this file', 'PDF Viewer');
  }
}

function pdfPrint() {
  if (typeof notify === 'function') notify('Printing is not available in web mode', 'PDF Viewer');
}

function pdfFullscreen() {
  const win = document.getElementById('pdfWindow');
  if (win) pdfMaximise();
}

/* ════════════════════════════════════════════════════════════
   UPDATE UI ELEMENTS
   ════════════════════════════════════════════════════════════ */
function pdfUpdateTitleBar() {
  const title = document.getElementById('pdfTitleText');
  const label = document.getElementById('pdfFileLabel');
  if (title) title.textContent = PDF.fileName + ' — PDF Viewer';
  if (label) label.textContent = PDF.fileName;
}

function pdfUpdatePageNav() {
  const inp   = document.getElementById('pdfPageInput');
  const total = document.getElementById('pdfPageTotal');
  const prev  = document.getElementById('pdfBtnPrev');
  const next  = document.getElementById('pdfBtnNext');
  const first = document.getElementById('pdfBtnFirst');
  const last  = document.getElementById('pdfBtnLast');

  if (inp)   inp.value   = PDF.currentPage;
  if (total) total.textContent = '/ ' + PDF.totalPages;
  if (inp)   inp.max     = PDF.totalPages;

  const atFirst = PDF.currentPage <= 1;
  const atLast  = PDF.currentPage >= PDF.totalPages;
  [prev, first].forEach(b => b && b.classList.toggle('disabled', atFirst));
  [next, last ].forEach(b => b && b.classList.toggle('disabled', atLast));
}

function pdfUpdateStatus() {
  const page = document.getElementById('pdfStatusPage');
  const size = document.getElementById('pdfStatusSize');
  if (page) page.textContent = `Page ${PDF.currentPage} of ${PDF.totalPages}`;
  if (size && PDF.pdfDoc) {
    PDF.pdfDoc.getPage(PDF.currentPage).then(p => {
      const vp = p.getViewport({ scale:1 });
      if (size) size.textContent = `${Math.round(vp.width)} × ${Math.round(vp.height)} pt`;
    });
  }
}

/* ════════════════════════════════════════════════════════════
   LOADING / ERROR STATES
   ════════════════════════════════════════════════════════════ */
function pdfShowLoading(msg) {
  const area = document.getElementById('pdfCanvasArea');
  if (!area) return;
  area.innerHTML = `
    <div class="pdf-loading">
      <div class="pdf-spinner"></div>
      <div class="pdf-loading-text">${msg || 'Loading…'}</div>
    </div>`;
}

function pdfHideStates() {
  /* clear loading/error from canvas area — render will replace it */
}

function pdfShowError(title, msg) {
  const area = document.getElementById('pdfCanvasArea');
  if (!area) return;
  area.innerHTML = `
    <div class="pdf-error">
      <div class="pdf-error-icon">📄</div>
      <div class="pdf-error-title">${title}</div>
      <div class="pdf-error-msg">${msg || ''}</div>
      <button class="pdf-error-open-btn" onclick="pdfPickFile()">Open a PDF file…</button>
    </div>`;
}

/* let user pick a local PDF file */
function pdfPickFile() {
  const input   = document.createElement('input');
  input.type    = 'file';
  input.accept  = 'application/pdf,.pdf';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      PDF.fileName = file.name;
      PDF.filePath = '';
      pdfUpdateTitleBar();
      pdfLoad(ev.target.result);
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}

/* ════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
   ════════════════════════════════════════════════════════════ */
function pdfKeyHandler(e) {
  const win = document.getElementById('pdfWindow');
  if (!win || PDF.isMin) return;
  if (document.activeElement && ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (!win.contains(document.activeElement) && document.activeElement !== document.body) return;

  switch(e.key) {
    case 'ArrowRight':
    case 'PageDown':    e.preventDefault(); pdfNextPage(); break;
    case 'ArrowLeft':
    case 'PageUp':      e.preventDefault(); pdfPrevPage(); break;
    case 'Home':        e.preventDefault(); pdfGoTo(1); break;
    case 'End':         e.preventDefault(); pdfGoTo(PDF.totalPages); break;
    case '+':
    case '=':           if(e.ctrlKey){ e.preventDefault(); pdfZoomIn(); }  break;
    case '-':           if(e.ctrlKey){ e.preventDefault(); pdfZoomOut(); } break;
    case '0':           if(e.ctrlKey){ e.preventDefault(); pdfSetZoom(1.2); } break;
    case 'f':
    case 'F':           if(e.ctrlKey){ e.preventDefault(); document.getElementById('pdfSearchInput')?.focus(); } break;
  }
}

/* ════════════════════════════════════════════════════════════
   WINDOW CONTROLS
   ════════════════════════════════════════════════════════════ */
function pdfClose() {
  document.removeEventListener('keydown', pdfKeyHandler);
  const win = document.getElementById('pdfWindow');
  const tb  = document.getElementById('tbPDF');
  if (!win) return;
  win.style.animation = 'pdfMin .2s cubic-bezier(.4,0,1,1) both';
  setTimeout(() => { win.remove(); if(tb) tb.remove(); }, 200);
}

function pdfMinimise() {
  const win = document.getElementById('pdfWindow');
  const tb  = document.getElementById('tbPDF');
  PDF.isMin = true;
  win.classList.add('minimising');
  setTimeout(() => {
    win.style.display = 'none';
    win.classList.remove('minimising');
    if (tb) tb.classList.add('minimised');
  }, 220);
}

function pdfRestore() {
  const win = document.getElementById('pdfWindow');
  const tb  = document.getElementById('tbPDF');
  win.style.display = 'flex';
  win.classList.add('restoring');
  setTimeout(() => win.classList.remove('restoring'), 220);
  PDF.isMin = false;
  if (tb) tb.classList.remove('minimised');
}

function pdfMaximise() {
  const win = document.getElementById('pdfWindow');
  const btn = document.getElementById('pdfMaxBtn');
  PDF.isMax = !PDF.isMax;
  win.classList.toggle('maximised', PDF.isMax);
  if (btn) btn.textContent = PDF.isMax ? '\u29C9' : '\u2610';
}

function pdfToggleFromTaskbar() { if (PDF.isMin) pdfRestore(); else pdfMinimise(); }

function pdfInjectTaskbar() {
  const tbLeft = document.querySelector('.tb-left');
  if (!tbLeft || document.getElementById('tbPDF')) return;
  const el = document.createElement('div');
  el.id    = 'tbPDF';
  el.title = 'PDF Viewer';
  el.innerHTML = `<span>📄 ${PDF.fileName}</span>`;
  el.onclick = pdfToggleFromTaskbar;
  el.oncontextmenu = e => {
    e.preventDefault(); e.stopPropagation();
    if (typeof showTaskbarAppCtx === 'function') showTaskbarAppCtx(e, 'PDF Viewer', false);
  };
  tbLeft.appendChild(el);
}

/* ════════════════════════════════════════════════════════════
   DRAG
   ════════════════════════════════════════════════════════════ */
function pdfSetupDrag() {
  const tb = document.getElementById('pdfTitleBar');
  if (!tb) return;
  tb.addEventListener('mousedown', e => {
    if (e.target.closest('.pdf-controls') || PDF.isMax) return;
    PDF.drag.on = true;
    const win  = document.getElementById('pdfWindow');
    const r    = win.getBoundingClientRect();
    PDF.drag.ox = e.clientX - r.left;
    PDF.drag.oy = e.clientY - r.top;
    win.style.transition = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!PDF.drag.on) return;
    const win = document.getElementById('pdfWindow');
    if (!win) { PDF.drag.on = false; return; }
    let x = e.clientX - PDF.drag.ox;
    let y = e.clientY - PDF.drag.oy;
    x = Math.max(-win.offsetWidth+80, Math.min(window.innerWidth-80, x));
    y = Math.max(0, Math.min(window.innerHeight-32, y));
    win.style.left = x+'px'; win.style.top = y+'px';
  });
  document.addEventListener('mouseup', () => { PDF.drag.on = false; });
}

/* ════════════════════════════════════════════════════════════
   RESIZE
   ════════════════════════════════════════════════════════════ */
function pdfSetupResize() {
  const h = document.getElementById('pdfResizeHandle');
  if (!h) return;
  h.addEventListener('mousedown', e => {
    if (PDF.isMax) return;
    PDF.resize.on = true;
    const win = document.getElementById('pdfWindow');
    PDF.resize.sx=e.clientX; PDF.resize.sy=e.clientY;
    PDF.resize.sw=win.offsetWidth; PDF.resize.sh=win.offsetHeight;
    e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('mousemove', e => {
    if (!PDF.resize.on) return;
    const win = document.getElementById('pdfWindow');
    if (!win) { PDF.resize.on=false; return; }
    win.style.width  = Math.max(480, PDF.resize.sw+(e.clientX-PDF.resize.sx))+'px';
    win.style.height = Math.max(340, PDF.resize.sh+(e.clientY-PDF.resize.sy))+'px';
  });
  document.addEventListener('mouseup', () => { PDF.resize.on = false; });
}
