/* ═══════════════════════════════════════════════════════════
   Notepad  ·  notepad.js
   Full-featured Windows Notepad — save/open/find/replace/font
   Notes are stored in the virtual FS (Documents folder)
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════════ */
const NP = {
  tabs       : [],       /* array of { id, name, content, saved, path } */
  activeId   : null,
  nextId     : 1,
  wordWrap   : true,
  statusBar  : true,
  font       : { family:'Courier New', size:14, style:'normal' },
  isMin      : false,
  isMax      : false,
  drag       : { on:false, ox:0, oy:0 },
  resize     : { on:false, sx:0, sy:0, sw:0, sh:0 },
  find       : { text:'', matchCase:false, wholeWord:false, lastIdx:-1 },
  activeMenu : null,
};

/* ════════════════════════════════════════════════════════════
   OPEN / INIT
   ════════════════════════════════════════════════════════════ */
function openNotepad(fileName, fileContent) {
  const existing = document.getElementById('notepadWindow');
  if (existing) {
    /* restore if minimised */
    if (NP.isMin) npRestore();
    /* if a file is passed, open it in a new tab */
    if (fileName) npOpenFile(fileName, fileContent || '');
    return;
  }
  buildNotepadWindow();
  /* open with a file or a blank untitled tab */
  if (fileName) {
    npOpenFile(fileName, fileContent || '');
  } else {
    npNewTab();
  }
  npInjectTaskbar();
  npSetupDrag();
  npSetupResize();
}

/* ════════════════════════════════════════════════════════════
   BUILD DOM
   ════════════════════════════════════════════════════════════ */
function buildNotepadWindow() {
  const win = document.createElement('div');
  win.id = 'notepadWindow';
  win.innerHTML = `
<!-- Title bar -->
<div class="np-titlebar" id="npTitleBar">
  <img class="np-titlebar-icon" src="icons/notepad.png" alt="">
  <span class="np-titlebar-text" id="npTitleText">Untitled — Notepad</span>
  <div class="np-controls">
    <button class="np-btn" onclick="npMinimise()" title="Minimise">&#x2014;</button>
    <button class="np-btn" id="npMaxBtn" onclick="npMaximise()" title="Maximise">&#x2610;</button>
    <button class="np-btn close" onclick="npClose()" title="Close">&#x2715;</button>
  </div>
</div>

<!-- Menu bar -->
<div class="np-menubar" id="npMenubar">
  <div class="np-menu" id="menu-file">
    <div class="np-menu-label" onclick="npToggleMenu('file')">File</div>
    <div class="np-dropdown">
      <div class="np-dd-item" onclick="npNewTab()">New<span class="np-dd-shortcut">Ctrl+N</span></div>
      <div class="np-dd-sep"></div>
      <div class="np-dd-item" onclick="npOpenDialog()">Open…<span class="np-dd-shortcut">Ctrl+O</span></div>
      <div class="np-dd-sep"></div>
      <div class="np-dd-item" onclick="npSave()">Save<span class="np-dd-shortcut">Ctrl+S</span></div>
      <div class="np-dd-item" onclick="npSaveAs()">Save As…<span class="np-dd-shortcut">Ctrl+Shift+S</span></div>
      <div class="np-dd-item" onclick="npDownload()">Download file</div>
      <div class="np-dd-sep"></div>
      <div class="np-dd-item" onclick="npClose()">Exit<span class="np-dd-shortcut">Alt+F4</span></div>
    </div>
  </div>
  <div class="np-menu" id="menu-edit">
    <div class="np-menu-label" onclick="npToggleMenu('edit')">Edit</div>
    <div class="np-dropdown">
      <div class="np-dd-item" onclick="npUndo()">Undo<span class="np-dd-shortcut">Ctrl+Z</span></div>
      <div class="np-dd-sep"></div>
      <div class="np-dd-item" onclick="npCut()">Cut<span class="np-dd-shortcut">Ctrl+X</span></div>
      <div class="np-dd-item" onclick="npCopy()">Copy<span class="np-dd-shortcut">Ctrl+C</span></div>
      <div class="np-dd-item" onclick="npPaste()">Paste<span class="np-dd-shortcut">Ctrl+V</span></div>
      <div class="np-dd-item" onclick="npDelete()">Delete<span class="np-dd-shortcut">Del</span></div>
      <div class="np-dd-sep"></div>
      <div class="np-dd-item" onclick="npFind()">Find…<span class="np-dd-shortcut">Ctrl+F</span></div>
      <div class="np-dd-item" onclick="npFindNext()">Find Next<span class="np-dd-shortcut">F3</span></div>
      <div class="np-dd-item" onclick="npReplace()">Replace…<span class="np-dd-shortcut">Ctrl+H</span></div>
      <div class="np-dd-item" onclick="npGoToLine()">Go To…<span class="np-dd-shortcut">Ctrl+G</span></div>
      <div class="np-dd-sep"></div>
      <div class="np-dd-item" onclick="npSelectAll()">Select All<span class="np-dd-shortcut">Ctrl+A</span></div>
      <div class="np-dd-item" onclick="npInsertDateTime()">Date/Time<span class="np-dd-shortcut">F5</span></div>
    </div>
  </div>
  <div class="np-menu" id="menu-format">
    <div class="np-menu-label" onclick="npToggleMenu('format')">Format</div>
    <div class="np-dropdown">
      <div class="np-dd-item" id="ddWordWrap" onclick="npToggleWordWrap()">
        ${NP.wordWrap ? '&#x2713; ' : ''}Word Wrap
      </div>
      <div class="np-dd-item" onclick="npOpenFontDialog()">Font…</div>
    </div>
  </div>
  <div class="np-menu" id="menu-view">
    <div class="np-menu-label" onclick="npToggleMenu('view')">View</div>
    <div class="np-dropdown">
      <div class="np-dd-item" id="ddStatusBar" onclick="npToggleStatusBar()">
        ${NP.statusBar ? '&#x2713; ' : ''}Status Bar
      </div>
      <div class="np-dd-sep"></div>
      <div class="np-dd-item" onclick="npZoom(1)">Zoom In<span class="np-dd-shortcut">Ctrl++</span></div>
      <div class="np-dd-item" onclick="npZoom(-1)">Zoom Out<span class="np-dd-shortcut">Ctrl+−</span></div>
      <div class="np-dd-item" onclick="npZoom(0)">Restore Default Zoom<span class="np-dd-shortcut">Ctrl+0</span></div>
    </div>
  </div>
  <div class="np-menu" id="menu-help">
    <div class="np-menu-label" onclick="npToggleMenu('help')">Help</div>
    <div class="np-dropdown">
      <div class="np-dd-item" onclick="npAbout()">About Notepad</div>
    </div>
  </div>
</div>

<!-- Find/Replace bar -->
<div class="np-findbar" id="npFindbar">
  <span class="np-find-label" id="npFindLabel">Find:</span>
  <input class="np-find-input" id="npFindInput" placeholder="Search…"
         oninput="npFindHighlight()" onkeydown="npFindKey(event)">
  <input class="np-find-input" id="npReplaceInput" placeholder="Replace with…"
         style="display:none" onkeydown="npFindKey(event)">
  <button class="np-find-btn" onclick="npFindNext()">Find Next</button>
  <button class="np-find-btn" id="npReplaceBtn" style="display:none" onclick="npDoReplace()">Replace</button>
  <button class="np-find-btn" id="npReplaceAllBtn" style="display:none" onclick="npDoReplaceAll()">Replace All</button>
  <span class="np-find-notfound" id="npNotFound" style="display:none">Not found</span>
  <span class="np-find-close" onclick="npCloseFindbar()">&#x2715;</span>
</div>

<!-- Body: sidebar + editor -->
<div style="display:flex;flex:1;overflow:hidden">
  <!-- Saved files sidebar -->
  <div class="np-sidebar" id="npSidebar">
    <div class="np-sidebar-title">Saved Notes</div>
    <div class="np-files-list" id="npFilesList"></div>
    <div class="np-sidebar-new">
      <button class="np-sidebar-new-btn" onclick="npNewTab()">+ New Note</button>
    </div>
  </div>

  <!-- Editor -->
  <textarea class="np-editor wordwrap" id="npEditor"
    spellcheck="true"
    oninput="npOnInput()"
    onkeydown="npEditorKeydown(event)"
  ></textarea>
</div>

<!-- Status bar -->
<div class="np-statusbar" id="npStatusbar">
  <span class="np-status-item" id="npStatusPos">Ln 1, Col 1</span>
  <div class="np-status-sep"></div>
  <span class="np-status-item" id="npStatusWords">0 words</span>
  <div class="np-status-sep"></div>
  <span class="np-status-item" id="npStatusChars">0 chars</span>
  <div class="np-status-sep"></div>
  <span class="np-status-item" id="npStatusEnc">UTF-8</span>
</div>

<!-- Resize handle -->
<div class="np-resize" id="npResize"></div>`;

  document.body.appendChild(win);

  /* close menus on outside click */
  document.addEventListener('click', npCloseMenus);
  /* editor cursor tracking */
  const ed = document.getElementById('npEditor');
  ed.addEventListener('keyup',   npUpdateStatus);
  ed.addEventListener('mouseup', npUpdateStatus);
  ed.addEventListener('click',   npUpdateStatus);
}

/* ════════════════════════════════════════════════════════════
   TABS  (each open note is a "tab" tracked in NP.tabs)
   ════════════════════════════════════════════════════════════ */
function npNewTab(name, content) {
  const id  = NP.nextId++;
  const tab = {
    id,
    name    : name || 'Untitled',
    content : content || '',
    saved   : !!name,
    path    : name ? ['Documents'] : null,
  };
  NP.tabs.push(tab);
  npActivateTab(id);
  npRefreshSidebar();
  return tab;
}

function npActivateTab(id) {
  /* save current editor content to old tab */
  if (NP.activeId) {
    const old = NP.tabs.find(t => t.id === NP.activeId);
    const ed  = document.getElementById('npEditor');
    if (old && ed) old.content = ed.value;
  }
  NP.activeId = id;
  const tab = NP.tabs.find(t => t.id === id);
  if (!tab) return;

  const ed = document.getElementById('npEditor');
  if (ed) {
    ed.value = tab.content;
    ed.focus();
  }
  npUpdateTitle();
  npUpdateStatus();
  npRefreshSidebar();
}

function npRefreshSidebar() {
  const list = document.getElementById('npFilesList');
  if (!list) return;
  list.innerHTML = '';

  /* show all notes saved in Documents + any open unsaved tabs */
  const shown = new Set();

  /* saved files from virtual FS Documents */
  const docs = (typeof FS !== 'undefined' && FS['Documents']) ? FS['Documents'] : [];
  const txtFiles = docs.filter(f => f.type === 'file' && f.name.endsWith('.txt'));

  txtFiles.forEach(f => {
    shown.add(f.name);
    const tab = NP.tabs.find(t => t.name === f.name);
    const el  = document.createElement('div');
    el.className = 'np-file-entry' + (tab && tab.id === NP.activeId ? ' active' : '');
    el.innerHTML = `
      <img src="icons/file-text.png" onerror="this.style.display='none'" alt="">
      <span class="np-file-name-text" title="${f.name}">${f.name}</span>
      <span class="np-file-dot ${tab && tab.saved ? 'saved' : ''}"></span>`;
    el.onclick = () => {
      if (tab) { npActivateTab(tab.id); }
      else     { npOpenFile(f.name, f.content || ''); }
    };
    list.appendChild(el);
  });

  /* unsaved / new open tabs not yet in FS */
  NP.tabs.forEach(tab => {
    if (shown.has(tab.name)) return;
    const el = document.createElement('div');
    el.className = 'np-file-entry' + (tab.id === NP.activeId ? ' active' : '');
    el.innerHTML = `
      <img src="icons/file-text.png" onerror="this.style.display='none'" alt="">
      <span class="np-file-name-text" title="${tab.name}">${tab.name}</span>
      <span class="np-file-dot ${tab.saved ? 'saved' : ''}"></span>`;
    el.onclick = () => npActivateTab(tab.id);
    list.appendChild(el);
  });
}

/* ════════════════════════════════════════════════════════════
   TITLE + STATUS
   ════════════════════════════════════════════════════════════ */
function npUpdateTitle() {
  const tab  = NP.tabs.find(t => t.id === NP.activeId);
  const name = tab ? tab.name : 'Untitled';
  const mark = (tab && !tab.saved) ? '• ' : '';
  const el   = document.getElementById('npTitleText');
  if (el) el.innerHTML = `${mark}${name} — Notepad`;

  /* taskbar */
  const tb = document.getElementById('tbNotepadLabel');
  if (tb) tb.textContent = name;
}

function npUpdateStatus() {
  const ed = document.getElementById('npEditor');
  if (!ed) return;
  const val  = ed.value;
  const pos  = ed.selectionStart;
  const lines= val.slice(0, pos).split('\n');
  const ln   = lines.length;
  const col  = lines[lines.length - 1].length + 1;
  const words= val.trim() === '' ? 0 : val.trim().split(/\s+/).length;

  const posEl  = document.getElementById('npStatusPos');
  const wEl    = document.getElementById('npStatusWords');
  const chEl   = document.getElementById('npStatusChars');
  if (posEl)  posEl.textContent  = `Ln ${ln}, Col ${col}`;
  if (wEl)    wEl.textContent    = `${words} word${words !== 1 ? 's' : ''}`;
  if (chEl)   chEl.textContent   = `${val.length} char${val.length !== 1 ? 's' : ''}`;
}

function npOnInput() {
  const tab = NP.tabs.find(t => t.id === NP.activeId);
  if (tab) { tab.saved = false; tab.content = document.getElementById('npEditor').value; }
  npUpdateTitle();
  npUpdateStatus();
}

/* ════════════════════════════════════════════════════════════
   FILE OPERATIONS
   ════════════════════════════════════════════════════════════ */
/* Save — writes to virtual FS Documents */
function npSave() {
  const tab = NP.tabs.find(t => t.id === NP.activeId);
  if (!tab) return;

  /* if new/untitled ask for name */
  if (tab.name === 'Untitled' || !tab.name) {
    const name = prompt('Save as:', 'note.txt');
    if (!name) return;
    tab.name = name.endsWith('.txt') ? name : name + '.txt';
  }

  tab.saved   = true;
  tab.content = document.getElementById('npEditor').value;

  /* write to virtual FS */
  if (typeof FS !== 'undefined') {
    if (!FS['Documents']) FS['Documents'] = [];
    const existing = FS['Documents'].find(f => f.name === tab.name);
    if (existing) {
      existing.content = tab.content;
    } else {
      FS['Documents'].push({
        type   : 'file',
        name   : tab.name,
        content: tab.content,
        icon   : 'icons/file-text.png',
      });
    }
  }

  npUpdateTitle();
  npRefreshSidebar();
  if (typeof notify === 'function') notify(`"${tab.name}" saved to Documents`, 'Notepad');
}

/* Save As — always prompts */
function npSaveAs() {
  const tab = NP.tabs.find(t => t.id === NP.activeId);
  if (!tab) return;
  const name = prompt('Save as:', tab.name || 'note.txt');
  if (!name) return;
  tab.name  = name.endsWith('.txt') ? name : name + '.txt';
  tab.saved = false;
  npSave();
}

/* Download the file to the user's real device */
function npDownload() {
  const tab = NP.tabs.find(t => t.id === NP.activeId);
  const ed  = document.getElementById('npEditor');
  if (!tab || !ed) return;
  const blob = new Blob([ed.value], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = tab.name.endsWith('.txt') ? tab.name : tab.name + '.txt';
  a.click();
  URL.revokeObjectURL(url);
  if (typeof notify === 'function') notify('File downloaded', 'Notepad');
}

/* Open dialog — reads from FS or file input */
function npOpenDialog() {
  npCloseMenus();

  /* build a simple open dialog using a modal overlay */
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:950;display:flex;align-items:center;justify-content:center';

  const docs = (typeof FS !== 'undefined' && FS['Documents'])
    ? FS['Documents'].filter(f => f.type === 'file' && f.name.endsWith('.txt'))
    : [];

  const listHTML = docs.length
    ? docs.map(f => `
        <div class="np-file-entry" style="padding:8px 14px;cursor:pointer"
             onclick="npPickFile('${f.name}',this.closest('.npOpenModal'))">
          <img src="icons/file-text.png" style="width:16px;height:16px;object-fit:contain" onerror="this.style.display='none'" alt="">
          <span style="font-size:13px;flex:1">${f.name}</span>
        </div>`).join('')
    : '<div style="padding:16px;font-size:13px;color:#888">No saved notes in Documents.</div>';

  overlay.innerHTML = `
    <div class="npOpenModal" style="background:#fff;width:360px;box-shadow:0 8px 32px rgba(0,0,0,.4);display:flex;flex-direction:column">
      <div style="height:30px;background:linear-gradient(#3c3c3c,#2d2d2d);display:flex;align-items:center;padding:0 10px;justify-content:space-between">
        <span style="font-size:12px;color:rgba(255,255,255,.85)">Open</span>
        <span style="cursor:pointer;color:rgba(255,255,255,.7);font-size:14px" onclick="this.closest('.npOverlay')? this.closest('.npOverlay').remove() : this.closest('[style]').remove()">&#x2715;</span>
      </div>
      <div style="padding:10px 0;max-height:260px;overflow-y:auto;border-bottom:1px solid #e0e0e0">${listHTML}</div>
      <div style="padding:10px 14px;display:flex;gap:8px;align-items:center">
        <span style="font-size:12px;color:#555">Or open from device:</span>
        <button class="np-find-btn" onclick="npBrowseFile()">Browse…</button>
        <button class="np-find-btn" style="margin-left:auto" onclick="this.closest('[style*=inset]').remove()">Cancel</button>
      </div>
    </div>`;
  overlay.className = 'npOverlay';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

function npPickFile(name, modal) {
  if (modal) modal.closest('.npOverlay').remove();
  const docs = (typeof FS !== 'undefined' && FS['Documents']) ? FS['Documents'] : [];
  const file = docs.find(f => f.name === name);
  if (file) npOpenFile(file.name, file.content || '');
}

function npOpenFile(name, content) {
  /* check if already open in a tab */
  const existing = NP.tabs.find(t => t.name === name);
  if (existing) { npActivateTab(existing.id); return; }
  npNewTab(name, content);
}

/* Browse for file on real device */
function npBrowseFile() {
  const input  = document.createElement('input');
  input.type   = 'file';
  input.accept = '.txt,text/plain';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => npOpenFile(file.name, ev.target.result);
    reader.readAsText(file);
  };
  input.click();
}

/* ════════════════════════════════════════════════════════════
   EDIT OPERATIONS
   ════════════════════════════════════════════════════════════ */
function npGetEditor() { return document.getElementById('npEditor'); }

function npUndo()      { npGetEditor().focus(); document.execCommand('undo'); }
function npCut()       { npGetEditor().focus(); document.execCommand('cut'); }
function npCopy()      { npGetEditor().focus(); document.execCommand('copy'); }
function npPaste()     { npGetEditor().focus(); document.execCommand('paste'); }
function npDelete()    {
  const ed = npGetEditor(); if (!ed) return;
  const s = ed.selectionStart, e2 = ed.selectionEnd;
  if (s === e2) return;
  ed.value = ed.value.slice(0, s) + ed.value.slice(e2);
  ed.selectionStart = ed.selectionEnd = s;
  npOnInput();
}
function npSelectAll() { const ed = npGetEditor(); if (ed) { ed.focus(); ed.select(); } }

function npInsertDateTime() {
  const ed = npGetEditor(); if (!ed) return;
  const now = new Date();
  const txt = now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) + ' ' +
              now.toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'});
  const s   = ed.selectionStart;
  ed.value  = ed.value.slice(0, s) + txt + ed.value.slice(ed.selectionEnd);
  ed.selectionStart = ed.selectionEnd = s + txt.length;
  npOnInput();
}

/* ════════════════════════════════════════════════════════════
   FIND & REPLACE
   ════════════════════════════════════════════════════════════ */
function npFind(replaceMode) {
  npCloseMenus();
  const bar     = document.getElementById('npFindbar');
  const repIn   = document.getElementById('npReplaceInput');
  const repBtn  = document.getElementById('npReplaceBtn');
  const repAll  = document.getElementById('npReplaceAllBtn');
  const label   = document.getElementById('npFindLabel');
  if (!bar) return;

  const isReplace = !!replaceMode;
  bar.classList.add('open');
  repIn.style.display    = isReplace ? '' : 'none';
  repBtn.style.display   = isReplace ? '' : 'none';
  repAll.style.display   = isReplace ? '' : 'none';
  if (label) label.textContent = isReplace ? 'Find:' : 'Find:';
  document.getElementById('npFindInput').focus();
  document.getElementById('npFindInput').select();
}

function npReplace() { npFind(true); }

function npCloseFindbar() {
  const bar = document.getElementById('npFindbar');
  if (bar) bar.classList.remove('open');
  document.getElementById('npNotFound').style.display = 'none';
}

function npFindKey(e) {
  if (e.key === 'Enter') npFindNext();
  if (e.key === 'Escape') npCloseFindbar();
}

function npFindHighlight() {
  document.getElementById('npNotFound').style.display = 'none';
}

function npFindNext() {
  const ed    = npGetEditor(); if (!ed) return;
  const query = document.getElementById('npFindInput').value;
  if (!query) return;

  const text  = ed.value;
  const start = ed.selectionEnd || 0;
  const idx   = text.toLowerCase().indexOf(query.toLowerCase(), start);

  if (idx === -1) {
    /* wrap around */
    const idxWrap = text.toLowerCase().indexOf(query.toLowerCase(), 0);
    if (idxWrap === -1) {
      document.getElementById('npNotFound').style.display = '';
      return;
    }
    ed.focus();
    ed.setSelectionRange(idxWrap, idxWrap + query.length);
  } else {
    document.getElementById('npNotFound').style.display = 'none';
    ed.focus();
    ed.setSelectionRange(idx, idx + query.length);
  }
  /* scroll into view */
  const linesBefore = ed.value.slice(0, ed.selectionStart).split('\n').length;
  ed.scrollTop = (linesBefore - 3) * parseInt(getComputedStyle(ed).lineHeight);
}

function npDoReplace() {
  const ed  = npGetEditor(); if (!ed) return;
  const q   = document.getElementById('npFindInput').value;
  const rep = document.getElementById('npReplaceInput').value;
  if (!q) return;
  const s = ed.selectionStart, e2 = ed.selectionEnd;
  if (ed.value.slice(s, e2).toLowerCase() === q.toLowerCase()) {
    ed.value = ed.value.slice(0, s) + rep + ed.value.slice(e2);
    ed.setSelectionRange(s, s + rep.length);
    npOnInput();
  }
  npFindNext();
}

function npDoReplaceAll() {
  const ed  = npGetEditor(); if (!ed) return;
  const q   = document.getElementById('npFindInput').value;
  const rep = document.getElementById('npReplaceInput').value;
  if (!q) return;
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const count = (ed.value.match(regex) || []).length;
  ed.value = ed.value.replace(regex, rep);
  npOnInput();
  if (typeof notify === 'function') notify(`Replaced ${count} occurrence${count!==1?'s':''}`, 'Notepad');
}

function npGoToLine() {
  const ed = npGetEditor(); if (!ed) return;
  const lines = ed.value.split('\n').length;
  const ln = parseInt(prompt(`Go to line (1 – ${lines}):`, '1'));
  if (isNaN(ln) || ln < 1 || ln > lines) return;
  const idx = ed.value.split('\n').slice(0, ln - 1).join('\n').length + (ln > 1 ? 1 : 0);
  ed.focus();
  ed.setSelectionRange(idx, idx);
  npUpdateStatus();
}

/* ════════════════════════════════════════════════════════════
   FORMAT
   ════════════════════════════════════════════════════════════ */
function npToggleWordWrap() {
  NP.wordWrap = !NP.wordWrap;
  const ed = npGetEditor();
  if (ed) ed.classList.toggle('wordwrap', NP.wordWrap);
  const dd = document.getElementById('ddWordWrap');
  if (dd) dd.innerHTML = (NP.wordWrap ? '&#x2713; ' : '') + 'Word Wrap';
  npCloseMenus();
}

function npZoom(dir) {
  npCloseMenus();
  const ed = npGetEditor(); if (!ed) return;
  const cur = parseInt(getComputedStyle(ed).fontSize);
  if (dir === 0)       ed.style.fontSize = '14px';
  else if (dir === 1)  ed.style.fontSize = Math.min(cur + 2, 48) + 'px';
  else                 ed.style.fontSize = Math.max(cur - 2, 8)  + 'px';
}

function npToggleStatusBar() {
  NP.statusBar = !NP.statusBar;
  const sb = document.getElementById('npStatusbar');
  if (sb) sb.style.display = NP.statusBar ? '' : 'none';
  const dd = document.getElementById('ddStatusBar');
  if (dd) dd.innerHTML = (NP.statusBar ? '&#x2713; ' : '') + 'Status Bar';
  npCloseMenus();
}

/* ════════════════════════════════════════════════════════════
   FONT DIALOG
   ════════════════════════════════════════════════════════════ */
function npOpenFontDialog() {
  npCloseMenus();
  let dlg = document.getElementById('npFontDialog');
  if (!dlg) {
    dlg = document.createElement('div');
    dlg.id = 'npFontDialog';
    dlg.innerHTML = `
      <div class="npd-titlebar">
        Font
        <span class="npd-close" onclick="npCloseFontDialog()">&#x2715;</span>
      </div>
      <div class="npd-body">
        <div class="npd-row">
          <span class="npd-label">Font:</span>
          <select class="npd-select" id="npFontFamily" onchange="npFontPreview()">
            ${['Courier New','Consolas','Arial','Times New Roman','Segoe UI','Georgia','Verdana','Trebuchet MS']
              .map(f=>`<option ${f===NP.font.family?'selected':''}>${f}</option>`).join('')}
          </select>
        </div>
        <div class="npd-row">
          <span class="npd-label">Style:</span>
          <select class="npd-select" id="npFontStyle" onchange="npFontPreview()">
            <option>normal</option><option>italic</option><option>bold</option><option>bold italic</option>
          </select>
        </div>
        <div class="npd-row">
          <span class="npd-label">Size:</span>
          <input class="npd-input" type="number" id="npFontSize"
                 min="6" max="72" value="${NP.font.size}" oninput="npFontPreview()" style="width:80px">
        </div>
        <div class="npd-preview" id="npFontPreview">The quick brown fox jumps over the lazy dog.</div>
      </div>
      <div class="npd-footer">
        <button class="npd-btn" onclick="npCloseFontDialog()">Cancel</button>
        <button class="npd-btn primary" onclick="npApplyFont()">OK</button>
      </div>`;
    document.body.appendChild(dlg);
  }
  dlg.classList.add('open');
  npFontPreview();
}

function npFontPreview() {
  const fam  = document.getElementById('npFontFamily').value;
  const sty  = document.getElementById('npFontStyle').value;
  const sz   = document.getElementById('npFontSize').value;
  const prev = document.getElementById('npFontPreview');
  if (prev) {
    prev.style.fontFamily  = fam;
    prev.style.fontStyle   = sty.includes('italic') ? 'italic' : 'normal';
    prev.style.fontWeight  = sty.includes('bold')   ? 'bold'   : 'normal';
    prev.style.fontSize    = sz + 'px';
  }
}

function npApplyFont() {
  const fam = document.getElementById('npFontFamily').value;
  const sty = document.getElementById('npFontStyle').value;
  const sz  = parseInt(document.getElementById('npFontSize').value) || 14;
  NP.font = { family:fam, size:sz, style:sty };
  const ed = npGetEditor();
  if (ed) {
    ed.style.fontFamily  = fam;
    ed.style.fontSize    = sz + 'px';
    ed.style.fontStyle   = sty.includes('italic') ? 'italic' : 'normal';
    ed.style.fontWeight  = sty.includes('bold')   ? 'bold'   : 'normal';
  }
  npCloseFontDialog();
}

function npCloseFontDialog() {
  const dlg = document.getElementById('npFontDialog');
  if (dlg) dlg.classList.remove('open');
}

/* ════════════════════════════════════════════════════════════
   ABOUT
   ════════════════════════════════════════════════════════════ */
function npAbout() {
  npCloseMenus();
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:950;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#fff;width:320px;box-shadow:0 8px 32px rgba(0,0,0,.4)">
      <div style="height:30px;background:linear-gradient(#3c3c3c,#2d2d2d);display:flex;align-items:center;padding:0 10px;justify-content:space-between">
        <span style="font-size:12px;color:rgba(255,255,255,.85)">About Notepad</span>
        <span style="cursor:pointer;color:rgba(255,255,255,.7);font-size:14px" onclick="this.closest('[style*=inset]').remove()">&#x2715;</span>
      </div>
      <div style="padding:24px;text-align:center">
        <img src="icons/notepad.png" style="width:48px;height:48px;object-fit:contain;margin-bottom:12px" onerror="this.style.display='none'">
        <div style="font-size:16px;font-weight:300;margin-bottom:6px">Notepad</div>
        <div style="font-size:12px;color:#555;line-height:1.6">Windows 8 Web<br>Version 6.2.9200<br><br>A plain text editor for Windows 8 Web.</div>
        <button style="margin-top:18px;padding:6px 24px;background:#0078d7;color:#fff;border:none;cursor:pointer;font-family:inherit;font-size:13px" onclick="this.closest('[style*=inset]').remove()">OK</button>
      </div>
    </div>`;
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

/* ════════════════════════════════════════════════════════════
   MENU SYSTEM
   ════════════════════════════════════════════════════════════ */
function npToggleMenu(name) {
  /* stop propagation so document click doesn't immediately close */
  event && event.stopPropagation();
  const isOpen = NP.activeMenu === name;
  npCloseMenus();
  if (!isOpen) {
    NP.activeMenu = name;
    const el = document.getElementById('menu-' + name);
    if (el) el.classList.add('active');
  }
}

function npCloseMenus() {
  NP.activeMenu = null;
  document.querySelectorAll('.np-menu.active').forEach(m => m.classList.remove('active'));
}

/* ════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
   ════════════════════════════════════════════════════════════ */
function npEditorKeydown(e) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 's': e.preventDefault(); e.shiftKey ? npSaveAs() : npSave();     break;
      case 'n': e.preventDefault(); npNewTab();                              break;
      case 'o': e.preventDefault(); npOpenDialog();                          break;
      case 'f': e.preventDefault(); npFind();                                break;
      case 'h': e.preventDefault(); npReplace();                             break;
      case 'g': e.preventDefault(); npGoToLine();                            break;
      case 'a': e.preventDefault(); npSelectAll();                           break;
      case '+':
      case '=': e.preventDefault(); npZoom(1);                               break;
      case '-': e.preventDefault(); npZoom(-1);                              break;
      case '0': e.preventDefault(); npZoom(0);                               break;
    }
  }
  if (e.key === 'F5') { e.preventDefault(); npInsertDateTime(); }
  if (e.key === 'F3') { e.preventDefault(); npFindNext(); }
  /* Tab inserts spaces instead of focusing next element */
  if (e.key === 'Tab') {
    e.preventDefault();
    const ed = npGetEditor();
    const s  = ed.selectionStart;
    ed.value = ed.value.slice(0, s) + '    ' + ed.value.slice(ed.selectionEnd);
    ed.selectionStart = ed.selectionEnd = s + 4;
  }
}

/* global keyboard handler — only active when notepad is open & focused */
document.addEventListener('keydown', e => {
  const win = document.getElementById('notepadWindow');
  if (!win || NP.isMin) return;
  if (!win.contains(document.activeElement) && document.activeElement !== document.getElementById('npEditor')) return;
  /* already handled inside editor */
});

/* ════════════════════════════════════════════════════════════
   WINDOW CONTROLS
   ════════════════════════════════════════════════════════════ */
function npClose() {
  const unsaved = NP.tabs.filter(t => !t.saved);
  if (unsaved.length > 0) {
    const ok = confirm(`You have ${unsaved.length} unsaved note${unsaved.length>1?'s':''}.\nClose without saving?`);
    if (!ok) return;
  }
  const win = document.getElementById('notepadWindow');
  const tb  = document.getElementById('tbNotepad');
  win.style.animation = 'npMin .2s cubic-bezier(.4,0,1,1) both';
  setTimeout(() => {
    win.remove();
    if (tb) tb.remove();
    NP.tabs    = [];
    NP.activeId= null;
    NP.nextId  = 1;
    document.removeEventListener('click', npCloseMenus);
  }, 200);
}

function npMinimise() {
  const win = document.getElementById('notepadWindow');
  const tb  = document.getElementById('tbNotepad');
  NP.isMin  = true;
  win.classList.add('minimising');
  setTimeout(() => {
    win.style.display = 'none';
    win.classList.remove('minimising');
    if (tb) tb.classList.add('minimised');
  }, 220);
}

function npRestore() {
  const win = document.getElementById('notepadWindow');
  const tb  = document.getElementById('tbNotepad');
  win.style.display = 'flex';
  win.classList.add('restoring');
  setTimeout(() => win.classList.remove('restoring'), 220);
  NP.isMin = false;
  if (tb) tb.classList.remove('minimised');
  const ed = npGetEditor(); if (ed) ed.focus();
}

function npMaximise() {
  const win = document.getElementById('notepadWindow');
  const btn = document.getElementById('npMaxBtn');
  NP.isMax  = !NP.isMax;
  win.classList.toggle('maximised', NP.isMax);
  if (btn) btn.textContent = NP.isMax ? '\u29C9' : '\u2610';
}

function npToggleFromTaskbar() {
  if (NP.isMin) npRestore();
  else          npMinimise();
}

function npInjectTaskbar() {
  const tbLeft = document.querySelector('.tb-left');
  if (!tbLeft || document.getElementById('tbNotepad')) return;
  const el  = document.createElement('div');
  el.id     = 'tbNotepad';
  el.title  = 'Notepad';
  el.innerHTML = `<img src="icons/notepad.png" onerror="this.style.display='none'" alt="Notepad">
                  <span id="tbNotepadLabel">Notepad</span>`;
  el.onclick = npToggleFromTaskbar;
  el.oncontextmenu = e => {
    e.preventDefault(); e.stopPropagation();
    if (typeof showTaskbarAppCtx === 'function') showTaskbarAppCtx(e, 'Notepad', false);
  };
  tbLeft.appendChild(el);
}

/* double-click titlebar toggles maximise */
document.addEventListener('DOMContentLoaded', () => {
  const tb = document.getElementById('npTitleBar');
  if (tb) tb.addEventListener('dblclick', npMaximise);
});

/* ════════════════════════════════════════════════════════════
   DRAG
   ════════════════════════════════════════════════════════════ */
function npSetupDrag() {
  const tb = document.getElementById('npTitleBar');
  if (!tb) return;
  tb.addEventListener('mousedown', e => {
    if (e.target.closest('.np-controls') || NP.isMax) return;
    NP.drag.on = true;
    const win  = document.getElementById('notepadWindow');
    const r    = win.getBoundingClientRect();
    NP.drag.ox = e.clientX - r.left;
    NP.drag.oy = e.clientY - r.top;
    win.style.transition = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!NP.drag.on) return;
    const win = document.getElementById('notepadWindow');
    let x = e.clientX - NP.drag.ox;
    let y = e.clientY - NP.drag.oy;
    x = Math.max(-win.offsetWidth + 60, Math.min(window.innerWidth - 60, x));
    y = Math.max(0, Math.min(window.innerHeight - 32, y));
    win.style.left = x + 'px';
    win.style.top  = y + 'px';
  });
  document.addEventListener('mouseup', () => { NP.drag.on = false; });
}

/* ════════════════════════════════════════════════════════════
   RESIZE
   ════════════════════════════════════════════════════════════ */
function npSetupResize() {
  const handle = document.getElementById('npResize');
  if (!handle) return;
  handle.addEventListener('mousedown', e => {
    if (NP.isMax) return;
    NP.resize.on = true;
    const win    = document.getElementById('notepadWindow');
    NP.resize.sx = e.clientX; NP.resize.sy = e.clientY;
    NP.resize.sw = win.offsetWidth; NP.resize.sh = win.offsetHeight;
    e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('mousemove', e => {
    if (!NP.resize.on) return;
    const win = document.getElementById('notepadWindow');
    win.style.width  = Math.max(360, NP.resize.sw + (e.clientX - NP.resize.sx)) + 'px';
    win.style.height = Math.max(240, NP.resize.sh + (e.clientY - NP.resize.sy)) + 'px';
  });
  document.addEventListener('mouseup', () => { NP.resize.on = false; });
}

/* ═══════════════════════════════════════════════════════════
   NOTEPAD CONTEXT MENUS
   Three menus:
     npEditorCtx   — right-click on the textarea
     npSidebarCtx  — right-click on a sidebar file entry
     npTitleCtx    — right-click on the title bar
   ═══════════════════════════════════════════════════════════ */

let _npActiveCtx = null;   /* id of currently open np context menu */
let _npSidebarTarget = null; /* file name right-clicked in sidebar */

/* ── close all np context menus ── */
function npHideAllCtx() {
  document.querySelectorAll('.np-ctx').forEach(m => m.classList.remove('open'));
  _npActiveCtx = null;
}

/* ── open a specific np context menu at cursor position ── */
function npOpenCtx(menuId, x, y) {
  npHideAllCtx();
  const menu = document.getElementById(menuId);
  if (!menu) return;
  menu.classList.add('open');
  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';
  _npActiveCtx = menuId;

  /* clamp to viewport */
  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right  > window.innerWidth)  menu.style.left = (x - r.width)  + 'px';
    if (r.bottom > window.innerHeight) menu.style.top  = (y - r.height) + 'px';
  });
}

/* close on outside click */
document.addEventListener('click', e => {
  if (_npActiveCtx) {
    const m = document.getElementById(_npActiveCtx);
    if (m && !m.contains(e.target)) npHideAllCtx();
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') npHideAllCtx();
});

/* ════════════════════════════════════════════════════════════
   BUILD & INJECT all three context menus (called once on open)
   ════════════════════════════════════════════════════════════ */
function npBuildContextMenus() {
  if (document.getElementById('npEditorCtx')) return; /* already built */

  /* ── 1. EDITOR context menu ── */
  const edCtx = document.createElement('div');
  edCtx.id = 'npEditorCtx';
  edCtx.className = 'np-ctx';
  edCtx.innerHTML = `
    <div class="np-ctx-item" id="npCtxUndo"   onclick="npCtxUndo()">
      Undo <span class="np-ctx-shortcut">Ctrl+Z</span>
    </div>
    <div class="np-ctx-sep"></div>
    <div class="np-ctx-item" id="npCtxCut"    onclick="npCtxCut()">
      Cut <span class="np-ctx-shortcut">Ctrl+X</span>
    </div>
    <div class="np-ctx-item" id="npCtxCopy"   onclick="npCtxCopy()">
      Copy <span class="np-ctx-shortcut">Ctrl+C</span>
    </div>
    <div class="np-ctx-item" id="npCtxPaste"  onclick="npCtxPaste()">
      Paste <span class="np-ctx-shortcut">Ctrl+V</span>
    </div>
    <div class="np-ctx-item" id="npCtxDelete" onclick="npCtxDelete()">
      Delete <span class="np-ctx-shortcut">Del</span>
    </div>
    <div class="np-ctx-sep"></div>
    <div class="np-ctx-item" onclick="npCtxSelectAll()">
      Select All <span class="np-ctx-shortcut">Ctrl+A</span>
    </div>
    <div class="np-ctx-sep"></div>
    <div class="np-ctx-item" onclick="npHideAllCtx();npFind()">
      Find… <span class="np-ctx-shortcut">Ctrl+F</span>
    </div>
    <div class="np-ctx-item" onclick="npHideAllCtx();npReplace()">
      Replace… <span class="np-ctx-shortcut">Ctrl+H</span>
    </div>
    <div class="np-ctx-sep"></div>
    <div class="np-ctx-item" onclick="npHideAllCtx();npOpenFontDialog()">
      Font…
    </div>`;
  document.body.appendChild(edCtx);

  /* ── 2. SIDEBAR FILE context menu ── */
  const sbCtx = document.createElement('div');
  sbCtx.id = 'npSidebarCtx';
  sbCtx.className = 'np-ctx';
  sbCtx.innerHTML = `
    <div class="np-ctx-item" onclick="npSbCtxOpen()">
      Open
    </div>
    <div class="np-ctx-sep"></div>
    <div class="np-ctx-item" onclick="npSbCtxRename()">
      Rename <span class="np-ctx-shortcut">F2</span>
    </div>
    <div class="np-ctx-item" onclick="npSbCtxDelete()">
      Delete <span class="np-ctx-shortcut">Del</span>
    </div>
    <div class="np-ctx-sep"></div>
    <div class="np-ctx-item" onclick="npSbCtxSave()">
      Save <span class="np-ctx-shortcut">Ctrl+S</span>
    </div>`;
  document.body.appendChild(sbCtx);

  /* ── 3. TITLEBAR context menu ── */
  const tbCtx = document.createElement('div');
  tbCtx.id = 'npTitleCtx';
  tbCtx.className = 'np-ctx';
  tbCtx.innerHTML = `
    <div class="np-ctx-item" id="npTcRestore"  onclick="npTcRestore()">
      Restore
    </div>
    <div class="np-ctx-item" onclick="npMinimise(); npHideAllCtx()">
      Minimise
    </div>
    <div class="np-ctx-item" id="npTcMaximise" onclick="npTcMaximise()">
      Maximise
    </div>
    <div class="np-ctx-sep"></div>
    <div class="np-ctx-item" onclick="npHideAllCtx(); npClose()">
      Close <span class="np-ctx-shortcut">Alt+F4</span>
    </div>`;
  document.body.appendChild(tbCtx);
}

/* ════════════════════════════════════════════════════════════
   ATTACH right-click handlers to the live DOM elements
   Called after buildNotepadWindow() finishes
   ════════════════════════════════════════════════════════════ */
function npAttachContextMenus() {
  npBuildContextMenus();

  /* editor textarea */
  const ed = document.getElementById('npEditor');
  if (ed) {
    ed.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();

      /* decide which items to grey out based on selection */
      const hasSel = ed.selectionStart !== ed.selectionEnd;
      const setDis = (id, dis) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('disabled', dis);
      };
      setDis('npCtxCut',    !hasSel);
      setDis('npCtxCopy',   !hasSel);
      setDis('npCtxDelete', !hasSel);

      npOpenCtx('npEditorCtx', e.clientX, e.clientY);
    });
  }

  /* title bar */
  const tb = document.getElementById('npTitleBar');
  if (tb) {
    tb.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();

      /* update Restore / Maximise labels */
      const restoreEl  = document.getElementById('npTcRestore');
      const maxEl      = document.getElementById('npTcMaximise');
      if (restoreEl) restoreEl.classList.toggle('disabled', !NP.isMax);
      if (maxEl)     maxEl.classList.toggle('disabled', NP.isMax);

      npOpenCtx('npTitleCtx', e.clientX, e.clientY);
    });
  }
}

/* refresh sidebar right-click each time sidebar rebuilds */
const _origNpRefreshSidebar = npRefreshSidebar;
npRefreshSidebar = function() {
  _origNpRefreshSidebar();

  /* re-attach context menu to every sidebar entry */
  document.querySelectorAll('#npFilesList .np-file-entry').forEach(el => {
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      _npSidebarTarget = el.querySelector('.np-file-name-text')?.textContent?.trim() || null;
      npOpenCtx('npSidebarCtx', e.clientX, e.clientY);
    });
  });
};

/* ════════════════════════════════════════════════════════════
   EDITOR CTX ACTIONS
   ════════════════════════════════════════════════════════════ */
function npCtxUndo()       { npHideAllCtx(); npUndo(); }
function npCtxCut()        { npHideAllCtx(); npCut(); }
function npCtxCopy()       { npHideAllCtx(); npCopy(); }
function npCtxPaste()      { npHideAllCtx(); npPaste(); }
function npCtxDelete()     { npHideAllCtx(); npDelete(); }
function npCtxSelectAll()  { npHideAllCtx(); npSelectAll(); }

/* ════════════════════════════════════════════════════════════
   SIDEBAR CTX ACTIONS
   ════════════════════════════════════════════════════════════ */
function npSbCtxOpen() {
  npHideAllCtx();
  if (!_npSidebarTarget) return;
  const tab = NP.tabs.find(t => t.name === _npSidebarTarget);
  if (tab) {
    npActivateTab(tab.id);
  } else {
    /* load from FS */
    const docs = (typeof FS !== 'undefined' && FS['Documents']) ? FS['Documents'] : [];
    const file = docs.find(f => f.name === _npSidebarTarget);
    if (file) npOpenFile(file.name, file.content || '');
  }
}

function npSbCtxRename() {
  npHideAllCtx();
  if (!_npSidebarTarget) return;

  const newName = prompt('Rename to:', _npSidebarTarget);
  if (!newName || newName === _npSidebarTarget) return;
  const finalName = newName.endsWith('.txt') ? newName : newName + '.txt';

  /* rename in tabs */
  const tab = NP.tabs.find(t => t.name === _npSidebarTarget);
  if (tab) tab.name = finalName;

  /* rename in FS */
  if (typeof FS !== 'undefined' && FS['Documents']) {
    const entry = FS['Documents'].find(f => f.name === _npSidebarTarget);
    if (entry) entry.name = finalName;
  }

  npUpdateTitle();
  npRefreshSidebar();
  if (typeof notify === 'function') notify(`Renamed to "${finalName}"`, 'Notepad');
}

function npSbCtxDelete() {
  npHideAllCtx();
  if (!_npSidebarTarget) return;

  const ok = confirm(`Delete "${_npSidebarTarget}"?`);
  if (!ok) return;

  /* remove from tabs */
  const tabIdx = NP.tabs.findIndex(t => t.name === _npSidebarTarget);
  if (tabIdx > -1) {
    const wasActive = NP.tabs[tabIdx].id === NP.activeId;
    NP.tabs.splice(tabIdx, 1);
    if (wasActive) {
      /* activate another tab or create blank */
      if (NP.tabs.length > 0) npActivateTab(NP.tabs[0].id);
      else npNewTab();
    }
  }

  /* remove from FS */
  if (typeof FS !== 'undefined' && FS['Documents']) {
    const idx = FS['Documents'].findIndex(f => f.name === _npSidebarTarget);
    if (idx > -1) FS['Documents'].splice(idx, 1);
  }

  npRefreshSidebar();
  if (typeof notify === 'function') notify(`"${_npSidebarTarget}" deleted`, 'Notepad');
}

function npSbCtxSave() {
  npHideAllCtx();
  /* switch to that tab then save */
  const tab = NP.tabs.find(t => t.name === _npSidebarTarget);
  if (tab) npActivateTab(tab.id);
  npSave();
}

/* ════════════════════════════════════════════════════════════
   TITLEBAR CTX ACTIONS
   ════════════════════════════════════════════════════════════ */
function npTcRestore() {
  npHideAllCtx();
  if (NP.isMax) npMaximise(); /* toggles back to normal */
}
function npTcMaximise() {
  npHideAllCtx();
  if (!NP.isMax) npMaximise();
}

/* ════════════════════════════════════════════════════════════
   PATCH openNotepad to call npAttachContextMenus after build
   ════════════════════════════════════════════════════════════ */
const _origOpenNotepad = openNotepad;
openNotepad = function(fileName, fileContent) {
  _origOpenNotepad(fileName, fileContent);
  /* attach after DOM is built — tiny delay for safety */
  setTimeout(npAttachContextMenus, 50);
};
 