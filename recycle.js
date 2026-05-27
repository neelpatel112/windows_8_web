/* ════════════════════════════════════════════════════════════
   Recycle Bin  ·  recycle.js
   ════════════════════════════════════════════════════════════ */
'use strict';

/* ── STATE ── */
let _rbOpen       = false;
let _rbMinimised  = false;
let _rbMaximised  = false;
let _rbSelected   = null;   /* { id, el } */
let _rbDragX = 0, _rbDragY = 0, _rbDragging = false;
let _rbResizing   = false;
let _rbRsX = 0, _rbRsY = 0, _rbRsW = 0, _rbRsH = 0;
let _rbUnsub      = null;

/* ── OPEN ── */
function openRecycleBin() {
  if (_rbOpen) {
    if (_rbMinimised) _rbRestoreWindow();
    const win = document.getElementById('rbWindow');
    if (win) win.style.zIndex = '410';
    return;
  }
  _rbOpen = true;
  _rbBuildWindow();
  _rbBuildTaskbarEntry();
  _rbRenderContent();
  _rbSetupDrag();
  _rbSetupResize();
  /* subscribe to VFS changes */
  _rbUnsub = VFS.subscribe(loc => {
    if (loc === '__recycle__') _rbRenderContent();
  });
}

/* ── BUILD WINDOW ── */
function _rbBuildWindow() {
  const win = document.createElement('div');
  win.id = 'rbWindow';
  win.innerHTML = `
<!-- Title bar -->
<div class="rb-titlebar" id="rbTitleBar">
  <img class="rb-tb-icon" src="icons/recycle.png" alt="" onerror="this.style.display='none'">
  <span class="rb-tb-text">Recycle Bin</span>
  <div class="rb-controls">
    <button class="rb-btn" onclick="_rbMinimiseWindow()" title="Minimise">&#x2014;</button>
    <button class="rb-btn" id="rbMaxBtn" onclick="_rbMaximiseWindow()" title="Maximise">&#x2610;</button>
    <button class="rb-btn rb-close" onclick="_rbCloseWindow()" title="Close">&#x2715;</button>
  </div>
</div>

<!-- Ribbon -->
<div class="rb-ribbon">
  <div class="rb-ribbon-tabs">
    <div class="rb-rtab active">Recycle Bin Tools</div>
    <div class="rb-rtab">View</div>
  </div>
  <div class="rb-ribbon-bar">
    <div class="rb-rib-btn" onclick="_rbEmptyBin()" title="Empty Recycle Bin">
      <i class="fas fa-trash-alt" style="color:#e81123;font-size:18px"></i>
      <span>Empty Recycle Bin</span>
    </div>
    <div class="rb-rib-sep"></div>
    <div class="rb-rib-btn" onclick="_rbRestoreSelected()" title="Restore selected">
      <i class="fas fa-undo" style="color:#0078d7;font-size:18px"></i>
      <span>Restore</span>
    </div>
    <div class="rb-rib-btn" onclick="_rbRestoreAll()" title="Restore all items">
      <i class="fas fa-undo-alt" style="color:#0078d7;font-size:18px"></i>
      <span>Restore all</span>
    </div>
    <div class="rb-rib-sep"></div>
    <div class="rb-rib-btn" onclick="_rbDeleteSelected()" title="Delete permanently">
      <i class="fas fa-times" style="color:#e81123;font-size:18px"></i>
      <span>Delete</span>
    </div>
  </div>
</div>

<!-- Address bar -->
<div class="rb-addressbar">
  <div class="rb-addr-path">
    <img src="icons/recycle.png" alt="" style="width:14px;height:14px;margin-right:6px;flex-shrink:0" onerror="this.style.display='none'">
    <span>Recycle Bin</span>
  </div>
  <div class="rb-addr-search">
    <i class="fas fa-search" style="color:#aaa;font-size:11px"></i>
    <input type="text" placeholder="Search Recycle Bin" oninput="_rbSearch(this.value)">
  </div>
</div>

<!-- Body -->
<div class="rb-body">
  <!-- Sidebar -->
  <div class="rb-sidebar">
    <div class="rb-nav-label">Recycle Bin</div>
    <div class="rb-nav-item active">
      <img src="icons/recycle.png" alt="" onerror="this.style.display='none'">
      Recycle Bin
    </div>
    <div class="rb-nav-sep"></div>
    <div class="rb-nav-label">Tasks</div>
    <div class="rb-nav-item" onclick="_rbEmptyBin()">
      <i class="fas fa-trash-alt" style="color:#e81123"></i>
      Empty Bin
    </div>
    <div class="rb-nav-item" onclick="_rbRestoreAll()">
      <i class="fas fa-undo" style="color:#0078d7"></i>
      Restore all
    </div>
  </div>

  <!-- Content -->
  <div class="rb-content" id="rbContent"
       oncontextmenu="_rbCtxMenu(event)"
       onclick="_rbDeselectAll(event)">
    <!-- filled by _rbRenderContent() -->
  </div>
</div>

<!-- Status bar -->
<div class="rb-statusbar">
  <span id="rbStatus">Empty</span>
  <div class="rb-status-right">
    <div class="rb-view-btn active" onclick="_rbSetView('grid')" title="Icons" id="rbVBGrid">&#x22A6;&#x22A6;</div>
    <div class="rb-view-btn"       onclick="_rbSetView('list')" title="Details" id="rbVBList">&#x2261;</div>
  </div>
</div>

<!-- Resize handle -->
<div class="rb-resize-handle" id="rbResize"></div>

<!-- Context menu -->
<div id="rbCtxMenu" class="rb-ctx-menu">
  <div class="rb-ctx-item" onclick="_rbRestoreSelected()">
    <i class="fas fa-undo"></i> Restore
  </div>
  <div class="rb-ctx-item" onclick="_rbDeleteSelected()">
    <i class="fas fa-times" style="color:#e81123"></i> Delete permanently
  </div>
  <div class="rb-ctx-sep"></div>
  <div class="rb-ctx-item" onclick="_rbProperties()">
    <i class="fas fa-info-circle"></i> Properties
  </div>
</div>
`;
  document.body.appendChild(win);
}

/* ── TASKBAR ── */
function _rbBuildTaskbarEntry() {
  const tbLeft = document.getElementById('tbRunning');
  if (!tbLeft) return;
  const entry = document.createElement('div');
  entry.className = 'tb-win-entry';
  entry.id = 'tbRecycleBin';
  entry.title = 'Recycle Bin';
  entry.innerHTML = `<img src="icons/recycle.png" alt="Recycle Bin" onerror="this.style.display='none'"><span>Recycle Bin</span>`;
  entry.onclick = () => {
    if (_rbMinimised) _rbRestoreWindow();
    else _rbMinimiseWindow();
  };
  tbLeft.appendChild(entry);
}

/* ── RENDER CONTENT ── */
let _rbViewMode = 'grid';
let _rbSearchQ  = '';

function _rbRenderContent() {
  const content = document.getElementById('rbContent');
  if (!content) return;
  content.innerHTML = '';
  _rbSelected = null;

  let items = VFS.listRecycle();

  if (_rbSearchQ) {
    const q = _rbSearchQ.toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(q));
  }

  /* update desktop icon appearance */
  _rbUpdateDesktopIcon(items.length);

  if (items.length === 0) {
    content.innerHTML = `
      <div class="rb-empty">
        <img src="icons/recycle.png" alt="" style="width:64px;height:64px;opacity:.25;margin-bottom:16px" onerror="this.style.display='none'">
        <div>Recycle Bin is empty</div>
      </div>`;
    _rbSetStatus('Empty');
    return;
  }

  if (_rbViewMode === 'list') {
    _rbRenderList(content, items);
  } else {
    _rbRenderGrid(content, items);
  }
  _rbSetStatus(`${items.length} item${items.length !== 1 ? 's' : ''}`);
}

function _rbRenderGrid(content, items) {
  const grid = document.createElement('div');
  grid.className = 'rb-files-grid';
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'rb-file-item';
    el.dataset.id = item.id;
    const icon = item.icon || VFS.iconForExt((item.name||'').split('.').pop());
    el.innerHTML = `
      <img src="${icon}" alt="${_rbEsc(item.name)}" onerror="this.src='icons/file-text.png'">
      <span class="rb-file-name">${_rbEsc(item.name)}</span>
      <span class="rb-file-from">Original location: ${_rbEsc(item._deletedFrom || '—')}</span>`;
    el.onclick = e => { e.stopPropagation(); _rbSelectItem(el, item); };
    el.ondblclick = () => _rbRestoreItem(item.id);
    grid.appendChild(el);
  });
  content.appendChild(grid);
}

function _rbRenderList(content, items) {
  const table = document.createElement('div');
  table.className = 'rb-list-table';
  table.innerHTML = `
    <div class="rb-list-head">
      <div style="flex:1">Name</div>
      <div style="width:160px">Original Location</div>
      <div style="width:120px">Date Deleted</div>
      <div style="width:80px">Type</div>
    </div>`;
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'rb-list-row';
    row.dataset.id = item.id;
    const icon = item.icon || VFS.iconForExt((item.name||'').split('.').pop());
    const deletedAt = item._deletedAt
      ? new Date(item._deletedAt).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })
      : '—';
    row.innerHTML = `
      <div style="flex:1;display:flex;align-items:center;gap:8px;min-width:0">
        <img src="${icon}" alt="" style="width:16px;height:16px;flex-shrink:0" onerror="this.src='icons/file-text.png'">
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_rbEsc(item.name)}</span>
      </div>
      <div style="width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;color:#555">${_rbEsc(item._deletedFrom || '—')}</div>
      <div style="width:120px;font-size:12px;color:#555">${deletedAt}</div>
      <div style="width:80px;font-size:12px;color:#555">${item.type || 'File'}</div>`;
    row.onclick = e => { e.stopPropagation(); _rbSelectItem(row, item); };
    row.ondblclick = () => _rbRestoreItem(item.id);
    table.appendChild(row);
  });
  content.appendChild(table);
}

function _rbSetView(mode) {
  _rbViewMode = mode;
  document.getElementById('rbVBGrid').classList.toggle('active', mode === 'grid');
  document.getElementById('rbVBList').classList.toggle('active', mode === 'list');
  _rbRenderContent();
}

function _rbSearch(q) {
  _rbSearchQ = q;
  _rbRenderContent();
}

/* ── SELECTION ── */
function _rbSelectItem(el, item) {
  document.querySelectorAll('.rb-file-item.active, .rb-list-row.active')
    .forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  _rbSelected = { id: item.id, item, el };
  _rbSetStatus('1 item selected');
}

function _rbDeselectAll(e) {
  if (e && e.target.closest('.rb-file-item, .rb-list-row')) return;
  document.querySelectorAll('.rb-file-item.active, .rb-list-row.active')
    .forEach(e => e.classList.remove('active'));
  _rbSelected = null;
  const n = VFS.listRecycle().length;
  _rbSetStatus(n === 0 ? 'Empty' : `${n} item${n !== 1 ? 's' : ''}`);
}

function _rbSetStatus(text) {
  const el = document.getElementById('rbStatus');
  if (el) el.textContent = text;
}

/* ── OPERATIONS ── */
function _rbRestoreSelected() {
  if (!_rbSelected) { _rbNotify('Select an item first', 'Recycle Bin'); return; }
  const name = _rbSelected.item.name;
  VFS.restore(_rbSelected.id);
  _rbSelected = null;
  _rbNotify(`"${name}" restored`, 'Recycle Bin');
}

function _rbRestoreItem(id) {
  const item = VFS.listRecycle().find(i => i.id === id);
  if (!item) return;
  VFS.restore(id);
  _rbNotify(`"${item.name}" restored to ${item._deletedFrom || 'Desktop'}`, 'Recycle Bin');
}

function _rbRestoreAll() {
  const items = VFS.listRecycle();
  if (items.length === 0) { _rbNotify('Recycle Bin is already empty', 'Recycle Bin'); return; }
  items.forEach(item => VFS.restore(item.id));
  _rbNotify(`${items.length} item${items.length!==1?'s':''} restored`, 'Recycle Bin');
}

function _rbDeleteSelected() {
  if (!_rbSelected) { _rbNotify('Select an item first', 'Recycle Bin'); return; }
  const name = _rbSelected.item.name;
  if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
  VFS.shred(_rbSelected.id);
  _rbSelected = null;
  _rbNotify(`"${name}" permanently deleted`, 'Recycle Bin');
}

function _rbEmptyBin() {
  const n = VFS.listRecycle().length;
  if (n === 0) { _rbNotify('Recycle Bin is already empty', 'Recycle Bin'); return; }
  if (!confirm(`Permanently delete all ${n} item${n!==1?'s':''}? This cannot be undone.`)) return;
  VFS.emptyRecycle();
  _rbNotify('Recycle Bin emptied', 'Recycle Bin');
}

function _rbProperties() {
  if (!_rbSelected) return;
  const i = _rbSelected.item;
  _rbNotify(`${i.name} · ${i.type} · deleted from ${i._deletedFrom || '—'}`, 'Properties');
}

/* ── DESKTOP ICON APPEARANCE ── */
function _rbUpdateDesktopIcon(count) {
  const el = document.querySelector('#dicon-recycle img');
  if (!el) return;
  /* show full bin icon when items exist */
  if (count > 0) {
    el.src = 'icons/recycle-full.png';
    el.onerror = () => { el.src = 'icons/recycle.png'; };
  } else {
    el.src = 'icons/recycle.png';
  }
}

/* ── WINDOW CONTROLS ── */
function _rbCloseWindow() {
  const win = document.getElementById('rbWindow');
  const tb  = document.getElementById('tbRecycleBin');
  if (_rbUnsub) { _rbUnsub(); _rbUnsub = null; }
  if (win) {
    win.style.animation = 'rbWinClose .2s ease both';
    setTimeout(() => { win.remove(); if(tb) tb.remove(); }, 200);
  }
  _rbOpen = false; _rbMinimised = false; _rbMaximised = false;
}

function _rbMinimiseWindow() {
  const win = document.getElementById('rbWindow');
  const tb  = document.getElementById('tbRecycleBin');
  _rbMinimised = true;
  win.style.animation = 'rbWinClose .2s ease both';
  setTimeout(() => {
    win.style.display = 'none';
    win.style.animation = '';
    if (tb) tb.classList.add('minimised');
  }, 200);
}

function _rbRestoreWindow() {
  const win = document.getElementById('rbWindow');
  const tb  = document.getElementById('tbRecycleBin');
  if (!win) return;
  win.style.display = 'flex';
  win.style.animation = 'rbWinOpen .22s cubic-bezier(.16,1,.3,1) both';
  _rbMinimised = false;
  if (tb) tb.classList.remove('minimised');
}

function _rbMaximiseWindow() {
  const win = document.getElementById('rbWindow');
  _rbMaximised = !_rbMaximised;
  win.classList.toggle('rb-maximised', _rbMaximised);
  const btn = document.getElementById('rbMaxBtn');
  if (btn) btn.innerHTML = _rbMaximised ? '&#x29C9;' : '&#x2610;';
}

/* ── DRAG WINDOW ── */
function _rbSetupDrag() {
  const tb = document.getElementById('rbTitleBar');
  if (!tb) return;
  tb.addEventListener('dblclick', _rbMaximiseWindow);
  tb.addEventListener('mousedown', e => {
    if (e.target.closest('.rb-controls') || _rbMaximised) return;
    _rbDragging = true;
    const win = document.getElementById('rbWindow');
    const r = win.getBoundingClientRect();
    _rbDragX = e.clientX - r.left;
    _rbDragY = e.clientY - r.top;
    win.style.transition = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!_rbDragging) return;
    const win = document.getElementById('rbWindow');
    if (!win) return;
    let x = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - _rbDragX));
    let y = Math.max(0, Math.min(window.innerHeight - 32, e.clientY - _rbDragY));
    win.style.left = x + 'px'; win.style.top = y + 'px';
  });
  document.addEventListener('mouseup', () => { _rbDragging = false; });
}

/* ── RESIZE ── */
function _rbSetupResize() {
  const handle = document.getElementById('rbResize');
  if (!handle) return;
  handle.addEventListener('mousedown', e => {
    if (_rbMaximised) return;
    _rbResizing = true;
    const win = document.getElementById('rbWindow');
    _rbRsX = e.clientX; _rbRsY = e.clientY;
    _rbRsW = win.offsetWidth; _rbRsH = win.offsetHeight;
    e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('mousemove', e => {
    if (!_rbResizing) return;
    const win = document.getElementById('rbWindow');
    if (!win) return;
    win.style.width  = Math.max(480, _rbRsW + (e.clientX - _rbRsX)) + 'px';
    win.style.height = Math.max(320, _rbRsH + (e.clientY - _rbRsY)) + 'px';
  });
  document.addEventListener('mouseup', () => { _rbResizing = false; });
}

/* ── CONTEXT MENU ── */
function _rbCtxMenu(e) {
  e.preventDefault();
  const menu = document.getElementById('rbCtxMenu');
  if (!menu) return;
  let x = e.clientX, y = e.clientY;
  if (x + 200 > window.innerWidth)  x = window.innerWidth  - 204;
  if (y + 120 > window.innerHeight) y = window.innerHeight - 124;
  menu.style.left = x + 'px'; menu.style.top = y + 'px';
  menu.classList.add('open');
  e.stopPropagation();
}

document.addEventListener('click', () => {
  const m = document.getElementById('rbCtxMenu');
  if (m) m.classList.remove('open');
});

/* ── KEYBOARD ── */
document.addEventListener('keydown', e => {
  const win = document.getElementById('rbWindow');
  if (!win || win.style.display === 'none' || !_rbOpen || _rbMinimised) return;
  if (e.key === 'Delete' && _rbSelected) { _rbDeleteSelected(); }
  if (e.key === 'Escape') { _rbDeselectAll(); }
});

/* ── HELPERS ── */
function _rbEsc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _rbNotify(msg, src) {
  if (typeof notify === 'function') notify(msg, src || 'Recycle Bin');
}
