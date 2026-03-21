/* ═══════════════════════════════════════════════════════════
   This PC  ·  thispc.js
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════════════
   DATA  — virtual file system
   ════════════════════════════════════════════════════════════ */
const DRIVES = [
  { id:'C', label:'Windows (C:)',  total:120, used:89,  icon:'icons/drive-system.png' },
  { id:'D', label:'Data (D:)',     total:500, used:210, icon:'icons/drive-hdd.png'    },
  { id:'E', label:'USB Drive (E:)',total:32,  used:5,   icon:'icons/drive-usb.png'    },
  { id:'F', label:'DVD Drive (F:)',total:0,   used:0,   icon:'icons/drive-dvd.png'    },
];

/* virtual folders per location */
const FS = {
  'This PC': [],
  'Desktop': [
    { type:'folder', name:'New Folder' },
    { type:'file',   name:'wallpaper.jpg', icon:'icons/file-image.png' },
    { type:'file',   name:'readme.txt',    icon:'icons/file-text.png'  },
  ],
  'Documents': [
    { type:'folder', name:'Work' },
    { type:'folder', name:'Personal' },
    { type:'file',   name:'resume.docx',   icon:'icons/file-word.png'  },
    { type:'file',   name:'budget.xlsx',   icon:'icons/file-excel.png' },
    { type:'file',   name:'notes.txt',     icon:'icons/file-text.png'  },
  ],
  'Downloads': [
    { type:'file', name:'setup.exe',       icon:'icons/file-exe.png'   },
    { type:'file', name:'photo.jpg',       icon:'icons/file-image.png' },
    { type:'file', name:'song.mp3',        icon:'icons/file-audio.png' },
    { type:'file', name:'video.mp4',       icon:'icons/file-video.png' },
  ],
  'Pictures': [
    { type:'folder', name:'Vacation' },
    { type:'folder', name:'Screenshots' },
    { type:'file',   name:'IMG_001.jpg',   icon:'icons/file-image.png' },
    { type:'file',   name:'IMG_002.jpg',   icon:'icons/file-image.png' },
    { type:'file',   name:'wallpaper.png', icon:'icons/file-image.png' },
  ],
  'Music': [
    { type:'folder', name:'Albums' },
    { type:'file',   name:'track01.mp3',   icon:'icons/file-audio.png' },
    { type:'file',   name:'track02.mp3',   icon:'icons/file-audio.png' },
  ],
  'Videos': [
    { type:'folder', name:'Movies' },
    { type:'file',   name:'clip.mp4',      icon:'icons/file-video.png' },
  ],
  'C:': [
    { type:'folder', name:'Program Files'  },
    { type:'folder', name:'Users'          },
    { type:'folder', name:'Windows'        },
    { type:'file',   name:'pagefile.sys',  icon:'icons/file-sys.png'   },
  ],
  'D:': [
    { type:'folder', name:'Backup'  },
    { type:'folder', name:'Projects'},
    { type:'folder', name:'Media'   },
  ],
  'E:': [
    { type:'folder', name:'Files'   },
    { type:'file',   name:'data.zip', icon:'icons/file-zip.png' },
  ],
};

/* ════════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════════ */
let currentPath   = ['This PC'];
let history       = [['This PC']];
let historyIdx    = 0;
let selectedItem  = null;
let isMinimised   = false;
let isMaximised   = false;
let viewMode      = 'grid';   // 'grid' | 'list'
let activeTab     = 'computer';
let newFolderCount= 0;

/* drag state */
let dragging   = false;
let dragOffX   = 0, dragOffY = 0;
/* resize state */
let resizing   = false;
let resStartX  = 0, resStartY = 0;
let resStartW  = 0, resStartH = 0;

/* ════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════ */
function initThisPC() {
  injectWindow();
  injectTaskbarEntry();
  renderContent();
  setupDrag();
  setupResize();
  setupContextMenu();
  updateNavButtons();
}

/* ════════════════════════════════════════════════════════════
   BUILD WINDOW HTML
   ════════════════════════════════════════════════════════════ */
function injectWindow() {
  const win = document.createElement('div');
  win.id = 'thispcWindow';
  win.innerHTML = `
<!-- Title bar -->
<div class="win-titlebar" id="pcTitleBar">
  <img class="win-titlebar-icon" src="icons/computer.png" alt="">
  <span class="win-titlebar-text" id="pcTitleText">This PC</span>
  <div class="win-controls">
    <button class="win-btn" onclick="minimisePC()" title="Minimise">&#x2014;</button>
    <button class="win-btn" id="maxBtn" onclick="maximisePC()" title="Maximise">&#x2610;</button>
    <button class="win-btn close" onclick="closePC()" title="Close">&#x2715;</button>
  </div>
</div>

<!-- Ribbon -->
<div class="win-ribbon">
  <div class="ribbon-tabs">
    <div class="ribbon-tab active" onclick="setTab('computer')" id="tab-computer">Computer</div>
    <div class="ribbon-tab" onclick="setTab('view')" id="tab-view">View</div>
  </div>
  <div class="ribbon-bar" id="ribbonBar">
    <!-- populated by setTab() -->
  </div>
</div>

<!-- Address bar -->
<div class="win-addressbar">
  <div class="addr-nav" id="btnBack"    onclick="navBack()"    title="Back">&#x276E;</div>
  <div class="addr-nav" id="btnForward" onclick="navForward()" title="Forward">&#x276F;</div>
  <div class="addr-nav" onclick="navUp()" title="Up">&#x2191;</div>
  <div class="addr-path" id="addrPath" onclick="focusSearch()">
    <img class="addr-path-icon" src="icons/computer.png" alt="" id="addrIcon">
    <span class="addr-path-text" id="addrText">This PC</span>
  </div>
  <div class="addr-search">
    <span style="color:#aaa;font-size:13px">&#x1F50D;</span>
    <input type="text" id="pcSearch" placeholder="Search This PC" oninput="doSearch(this.value)">
  </div>
</div>

<!-- Body -->
<div class="win-body">
  <!-- Sidebar nav -->
  <div class="win-nav" id="pcNav">
    <div class="nav-section-label">Favourites</div>
    <div class="nav-item" onclick="navTo(['Desktop'])"   id="nav-Desktop">
      <img src="icons/computer.png" alt="">Desktop
    </div>
    <div class="nav-item" onclick="navTo(['Downloads'])" id="nav-Downloads">
      <img src="icons/folder.png" alt="">Downloads
    </div>
    <div class="nav-item active" onclick="navTo(['This PC'])" id="nav-ThisPC">
      <img src="icons/computer.png" alt="">This PC
    </div>

    <div class="nav-section-label" style="margin-top:8px">This PC</div>
    <div class="nav-item" onclick="navTo(['Documents'])" id="nav-Documents">
      <img src="icons/folder.png" alt="">Documents
    </div>
    <div class="nav-item" onclick="navTo(['Pictures'])"  id="nav-Pictures">
      <img src="icons/folder.png" alt="">Pictures
    </div>
    <div class="nav-item" onclick="navTo(['Music'])"     id="nav-Music">
      <img src="icons/folder.png" alt="">Music
    </div>
    <div class="nav-item" onclick="navTo(['Videos'])"    id="nav-Videos">
      <img src="icons/folder.png" alt="">Videos
    </div>

    <div class="nav-section-label" style="margin-top:8px">Devices</div>
    <div class="nav-item" onclick="navTo(['C:'])" id="nav-C">
      <img src="icons/drive-system.png" alt="">Windows (C:)
    </div>
    <div class="nav-item" onclick="navTo(['D:'])" id="nav-D">
      <img src="icons/drive-hdd.png" alt="">Data (D:)
    </div>
    <div class="nav-item" onclick="navTo(['E:'])" id="nav-E">
      <img src="icons/drive-usb.png" alt="">USB Drive (E:)
    </div>
  </div>

  <!-- Content -->
  <div class="win-content" id="pcContent"
       oncontextmenu="showCtx(event)"
       onclick="deselectAll(event)">
  </div>
</div>

<!-- Status bar -->
<div class="win-statusbar">
  <span id="pcStatus">0 items</span>
  <div class="statusbar-right">
    <div class="view-btn active" id="vbGrid" onclick="setView('grid')" title="Icon view">&#x22A6;&#x22A6;</div>
    <div class="view-btn" id="vbList" onclick="setView('list')" title="List view">&#x2261;</div>
  </div>
</div>

<!-- Resize handle -->
<div class="win-resize" id="pcResize"></div>`;
  document.body.appendChild(win);

  // set initial tab
  setTab('computer');

  // close context menu on window click
  win.addEventListener('click', () => hideCtx());
}

/* ════════════════════════════════════════════════════════════
   TASKBAR ENTRY
   ════════════════════════════════════════════════════════════ */
function injectTaskbarEntry() {
  const tbLeft = document.querySelector('.tb-left');
  if (!tbLeft) return;
  const entry = document.createElement('div');
  entry.className = 'tb-win-entry';
  entry.id = 'tbThisPC';
  entry.title = 'This PC';
  entry.innerHTML = `<img src="icons/computer.png" alt="This PC"><span>This PC</span>`;
  entry.onclick = toggleFromTaskbar;
  tbLeft.appendChild(entry);
}

/* ════════════════════════════════════════════════════════════
   WINDOW CONTROLS
   ════════════════════════════════════════════════════════════ */
function closePC() {
  const win = document.getElementById('thispcWindow');
  const tb  = document.getElementById('tbThisPC');
  win.style.animation = 'winMin .2s cubic-bezier(.4,0,1,1) both';
  setTimeout(() => { win.remove(); if (tb) tb.remove(); }, 200);
}

function minimisePC() {
  const win = document.getElementById('thispcWindow');
  const tb  = document.getElementById('tbThisPC');
  isMinimised = true;
  win.classList.add('minimising');
  setTimeout(() => {
    win.style.display = 'none';
    win.classList.remove('minimising');
    if (tb) tb.classList.add('minimised');
  }, 220);
}

function maximisePC() {
  const win    = document.getElementById('thispcWindow');
  const btn    = document.getElementById('maxBtn');
  const icon   = btn.querySelector('i');
  isMaximised  = !isMaximised;
  if (isMaximised) {
    win.classList.add('maximised');
    icon.textContent = '\u29C9';
  } else {
    win.classList.remove('maximised');
    icon.textContent = '\u2610';
  }
}

function toggleFromTaskbar() {
  const win = document.getElementById('thispcWindow');
  const tb  = document.getElementById('tbThisPC');
  if (isMinimised) {
    win.style.display = 'flex';
    win.classList.add('restoring');
    setTimeout(() => win.classList.remove('restoring'), 220);
    isMinimised = false;
    if (tb) tb.classList.remove('minimised');
  } else {
    minimisePC();
  }
}

/* double-click titlebar to maximise */
document.addEventListener('DOMContentLoaded', () => {
  const tb = document.getElementById('pcTitleBar');
  if (tb) tb.addEventListener('dblclick', maximisePC);
});

/* ════════════════════════════════════════════════════════════
   DRAG (move window)
   ════════════════════════════════════════════════════════════ */
function setupDrag() {
  const titlebar = document.getElementById('pcTitleBar');
  if (!titlebar) return;

  titlebar.addEventListener('mousedown', e => {
    if (e.target.closest('.win-controls') || isMaximised) return;
    dragging = true;
    const win = document.getElementById('thispcWindow');
    const rect = win.getBoundingClientRect();
    dragOffX = e.clientX - rect.left;
    dragOffY = e.clientY - rect.top;
    win.style.transition = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const win = document.getElementById('thispcWindow');
    let x = e.clientX - dragOffX;
    let y = e.clientY - dragOffY;
    // clamp so titlebar stays on screen
    x = Math.max(-win.offsetWidth + 60, Math.min(window.innerWidth - 60, x));
    y = Math.max(0, Math.min(window.innerHeight - 32, y));
    win.style.left = x + 'px';
    win.style.top  = y + 'px';
  });

  document.addEventListener('mouseup', () => { dragging = false; });
}

/* ════════════════════════════════════════════════════════════
   RESIZE
   ════════════════════════════════════════════════════════════ */
function setupResize() {
  const handle = document.getElementById('pcResize');
  if (!handle) return;

  handle.addEventListener('mousedown', e => {
    if (isMaximised) return;
    resizing  = true;
    const win = document.getElementById('thispcWindow');
    resStartX = e.clientX;
    resStartY = e.clientY;
    resStartW = win.offsetWidth;
    resStartH = win.offsetHeight;
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mousemove', e => {
    if (!resizing) return;
    const win = document.getElementById('thispcWindow');
    const w   = Math.max(480, resStartW + (e.clientX - resStartX));
    const h   = Math.max(320, resStartH + (e.clientY - resStartY));
    win.style.width  = w + 'px';
    win.style.height = h + 'px';
  });

  document.addEventListener('mouseup', () => { resizing = false; });
}

/* ════════════════════════════════════════════════════════════
   RIBBON TABS
   ════════════════════════════════════════════════════════════ */
function setTab(tab) {
  activeTab = tab;
  ['computer','view'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });

  const bar = document.getElementById('ribbonBar');
  if (!bar) return;

  if (tab === 'computer') {
    bar.innerHTML = `
      <div class="rib-btn" onclick="newFolder()" title="New Folder">
        <img src="icons/folder.png" alt=""><span>New folder</span>
      </div>
      <div class="rib-sep"></div>
      <div class="rib-btn" onclick="ribbonOpen()" title="Open">
        <img src="icons/folder.png" alt=""><span>Open</span>
      </div>
      <div class="rib-btn" onclick="ribbonRename()" title="Rename">
        <span style="font-size:18px;color:#0078d7;line-height:1">T</span><span>Rename</span>
      </div>
      <div class="rib-btn" onclick="ribbonDelete()" title="Delete">
        <span style="font-size:18px;color:#e81123;line-height:1">&#x2715;</span><span>Delete</span>
      </div>
      <div class="rib-sep"></div>
      <div class="rib-btn" onclick="ribbonProperties()" title="Properties">
        <span style="font-size:18px;color:#0078d7;line-height:1">&#x2139;</span><span>Properties</span>
      </div>
    `;
  } else {
    bar.innerHTML = `
      <div class="rib-btn ${viewMode==='grid'?'active':''}" onclick="setView('grid')" title="Large icons">
        <span style="font-size:18px;color:#0078d7;line-height:1">&#x22A6;&#x22A6;</span><span>Large icons</span>
      </div>
      <div class="rib-btn ${viewMode==='list'?'active':''}" onclick="setView('list')" title="List">
        <span style="font-size:18px;color:#0078d7;line-height:1">&#x2261;</span><span>List</span>
      </div>
      <div class="rib-sep"></div>
      <div class="rib-btn" onclick="sortItems('name')" title="Sort by name">
        <span style="font-size:18px;color:#0078d7;line-height:1">A&#x2193;</span><span>Sort by name</span>
      </div>
      <div class="rib-btn" onclick="sortItems('type')" title="Sort by type">
        <span style="font-size:18px;color:#0078d7;line-height:1">&#x21C5;</span><span>Sort by type</span>
      </div>
    `;
  }
}

/* ════════════════════════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════════════════════════ */
function navTo(path) {
  // trim forward history
  history = history.slice(0, historyIdx + 1);
  history.push(path);
  historyIdx = history.length - 1;
  currentPath = path;
  renderContent();
  updateNavButtons();
  updateNavHighlight();
}

function navBack() {
  if (historyIdx <= 0) return;
  historyIdx--;
  currentPath = history[historyIdx];
  renderContent();
  updateNavButtons();
  updateNavHighlight();
}

function navForward() {
  if (historyIdx >= history.length - 1) return;
  historyIdx++;
  currentPath = history[historyIdx];
  renderContent();
  updateNavButtons();
  updateNavHighlight();
}

function navUp() {
  if (currentPath.length <= 1) return;
  navTo(currentPath.slice(0, -1));
}

function updateNavButtons() {
  const back = document.getElementById('btnBack');
  const fwd  = document.getElementById('btnForward');
  if (back) back.classList.toggle('disabled', historyIdx <= 0);
  if (fwd)  fwd.classList.toggle('disabled', historyIdx >= history.length - 1);
}

function updateNavHighlight() {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const loc = currentPath[currentPath.length - 1];
  const target = document.getElementById('nav-' + loc.replace(' ','').replace(':',''));
  if (target) target.classList.add('active');
}

/* ════════════════════════════════════════════════════════════
   ADDRESS BAR
   ════════════════════════════════════════════════════════════ */
function updateAddressBar() {
  const addrText = document.getElementById('addrText');
  const addrIcon = document.getElementById('addrIcon');
  const titleText= document.getElementById('pcTitleText');
  if (!addrText) return;

  const label = currentPath.join(' › ');
  addrText.textContent = label;
  if (titleText) titleText.textContent = currentPath[currentPath.length - 1];

  // icon
  const loc = currentPath[currentPath.length - 1];
  const iconMap = {
    'This PC':'icons/computer.png', 'Desktop':'icons/folder.png',
    'Documents':'icons/folder.png', 'Downloads':'icons/folder.png',
    'Pictures':'icons/folder.png',  'Music':'icons/folder.png',
    'Videos':'icons/folder.png',    'C:':'icons/drive-system.png',
    'D:':'icons/drive-hdd.png',     'E:':'icons/drive-usb.png',
    'F:':'icons/drive-dvd.png',
  };
  if (addrIcon) addrIcon.src = iconMap[loc] || 'icons/folder.png';
}

function focusSearch() {
  const s = document.getElementById('pcSearch');
  if (s) s.focus();
}

/* ════════════════════════════════════════════════════════════
   SEARCH
   ════════════════════════════════════════════════════════════ */
function doSearch(q) {
  if (!q.trim()) { renderContent(); return; }
  const loc   = currentPath[currentPath.length - 1];
  const items = FS[loc] || [];
  const found = items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()));
  renderItems(found, true);
  updateStatus(found.length);
}

/* ════════════════════════════════════════════════════════════
   RENDER
   ════════════════════════════════════════════════════════════ */
function renderContent() {
  updateAddressBar();
  const content = document.getElementById('pcContent');
  if (!content) return;
  content.innerHTML = '';
  selectedItem = null;

  const loc = currentPath[currentPath.length - 1];

  if (loc === 'This PC') {
    renderThisPC(content);
  } else {
    const items = FS[loc] || [];
    renderItems(items, false);
    updateStatus(items.length);
  }
}

function renderThisPC(content) {
  // Devices section
  const h1 = document.createElement('div');
  h1.className = 'section-heading'; h1.textContent = 'Devices and drives';
  content.appendChild(h1);

  const grid = document.createElement('div');
  grid.className = 'drives-grid';

  DRIVES.forEach(d => {
    const pct = d.total > 0 ? Math.round((d.used / d.total) * 100) : 0;
    const freeGB = (d.total - d.used).toFixed(0);
    const cls = pct > 85 ? 'low' : pct > 60 ? 'medium' : 'ok';

    const el = document.createElement('div');
    el.className = 'drive-item';
    el.dataset.drive = d.id;
    el.innerHTML = `
      <img class="drive-icon" src="${d.icon}" onerror="this.style.display='none'">
      <div class="drive-info">
        <div class="drive-name">${d.label}</div>
        ${d.total > 0 ? `
        <div class="drive-free">${freeGB} GB free of ${d.total} GB</div>
        <div class="drive-bar-wrap">
          <div class="drive-bar-fill ${cls}" style="width:${pct}%"></div>
        </div>` : `<div class="drive-free">Empty</div>`}
      </div>`;
    el.ondblclick = () => navTo([d.id + ':']);
    el.onclick    = (e) => { e.stopPropagation(); selectDrive(el); };
    grid.appendChild(el);
  });
  content.appendChild(grid);

  // Folders section
  const h2 = document.createElement('div');
  h2.className = 'section-heading';
  h2.textContent = 'Folders';
  h2.style.marginTop = '16px';
  content.appendChild(h2);

  const folders = ['Desktop','Documents','Downloads','Music','Pictures','Videos'];
  renderItems(folders.map(n => ({ type:'folder', name:n })), false);
  updateStatus(DRIVES.length + folders.length);
}

function renderItems(items, isSearch) {
  const content = document.getElementById('pcContent');
  if (!content) return;
  if (!isSearch) {
    // clear any existing files grid only
    const existing = content.querySelector('.files-grid');
    if (existing) existing.remove();
  } else {
    content.innerHTML = '';
  }

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:40px;text-align:center;color:#999;font-size:13px';
    empty.textContent = 'This folder is empty.';
    content.appendChild(empty);
    return;
  }

  const grid = document.createElement('div');
  grid.className = viewMode === 'list' ? 'files-grid' : 'files-grid';
  grid.id = 'filesGrid';

  // sort: folders first, then files
  const sorted = [...items].sort((a,b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'folder' ? -1 : 1;
  });

  sorted.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'file-item';
    el.dataset.name = item.name;
    el.dataset.type = item.type;

    if (item.type === 'folder') {
      el.innerHTML = `
        <img src="icons/folder.png" alt="${item.name}" style="width:40px;height:40px;object-fit:contain">
        <span class="file-name">${item.name}</span>`;
      el.ondblclick = () => navTo([...currentPath, item.name]);
    } else {
      const icon = item.icon || 'icons/file-text.png';
      el.innerHTML = `
        <img src="${icon}" onerror="this.src='icons/file-text.png'" alt="${item.name}">
        <span class="file-name">${item.name}</span>`;
      el.ondblclick = () => openFile(item);
    }

    el.onclick = (e) => { e.stopPropagation(); selectFile(el, item, idx); };
    grid.appendChild(el);
  });

  content.appendChild(grid);
}

/* ════════════════════════════════════════════════════════════
   SELECTION
   ════════════════════════════════════════════════════════════ */
function selectFile(el, item, idx) {
  deselectAll();
  el.classList.add('active');
  selectedItem = { el, item, idx };
  updateStatus();
}

function selectDrive(el) {
  document.querySelectorAll('.drive-item').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
}

function deselectAll(e) {
  if (e && e.target.closest('.file-item, .drive-item')) return;
  document.querySelectorAll('.file-item, .drive-item').forEach(el => el.classList.remove('active'));
  selectedItem = null;
  updateStatus();
}

function updateStatus(count) {
  const el = document.getElementById('pcStatus');
  if (!el) return;
  if (count !== undefined) {
    el.textContent = count + ' item' + (count !== 1 ? 's' : '');
  } else if (selectedItem) {
    el.textContent = '1 item selected';
  } else {
    const loc = currentPath[currentPath.length - 1];
    const n   = (FS[loc] || []).length;
    el.textContent = n + ' item' + (n !== 1 ? 's' : '');
  }
}

/* ════════════════════════════════════════════════════════════
   FILE OPERATIONS
   ════════════════════════════════════════════════════════════ */
function newFolder() {
  const loc = currentPath[currentPath.length - 1];
  if (!FS[loc]) FS[loc] = [];

  newFolderCount++;
  const baseName = 'New Folder';
  let name = baseName;
  let n = 1;
  while (FS[loc].some(i => i.name === name)) {
    name = `${baseName} (${n++})`;
  }

  const item = { type: 'folder', name };
  FS[loc].push(item);
  renderContent();

  // find the new element and start rename immediately
  const grid = document.getElementById('filesGrid');
  if (!grid) return;
  const newEl = Array.from(grid.querySelectorAll('.file-item'))
    .find(el => el.dataset.name === name);
  if (newEl) {
    newEl.classList.add('new-item');
    selectFile(newEl, item, FS[loc].length - 1);
    startRename(newEl, item);
  }
}

function openFile(item) {
  if (typeof notify === 'function') notify('Opening ' + item.name + '…', item.name);
}

function deleteSelected() {
  if (!selectedItem) return;
  const loc  = currentPath[currentPath.length - 1];
  const name = selectedItem.item.name;
  if (!FS[loc]) return;
  const idx = FS[loc].findIndex(i => i.name === name);
  if (idx > -1) FS[loc].splice(idx, 1);
  selectedItem = null;
  renderContent();
}

function startRename(el, item) {
  const nameEl = el.querySelector('.file-name');
  if (!nameEl) return;
  const oldName = item.name;

  const input = document.createElement('input');
  input.className = 'rename-input';
  input.value = oldName;
  nameEl.replaceWith(input);
  input.select();

  function commit() {
    const newName = input.value.trim() || oldName;
    const loc = currentPath[currentPath.length - 1];
    if (FS[loc]) {
      const entry = FS[loc].find(i => i.name === oldName);
      if (entry) entry.name = newName;
    }
    renderContent();
  }

  input.addEventListener('blur',   commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape'){ input.value = oldName; input.blur(); }
    e.stopPropagation();
  });
  input.addEventListener('click', e => e.stopPropagation());
}

/* ════════════════════════════════════════════════════════════
   RIBBON ACTIONS
   ════════════════════════════════════════════════════════════ */
function ribbonOpen() {
  if (!selectedItem) return;
  const item = selectedItem.item;
  if (item.type === 'folder') navTo([...currentPath, item.name]);
  else openFile(item);
}

function ribbonRename() {
  if (!selectedItem) return;
  startRename(selectedItem.el, selectedItem.item);
}

function ribbonDelete() {
  if (!selectedItem) return;
  deleteSelected();
}

function ribbonProperties() {
  if (!selectedItem) return;
  const item = selectedItem.item;
  if (typeof notify === 'function') notify(item.name + ' · ' + item.type, 'Properties');
}

function sortItems(by) {
  const loc = currentPath[currentPath.length - 1];
  if (!FS[loc]) return;
  FS[loc].sort((a, b) => {
    if (by === 'type') {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  renderContent();
}

/* ════════════════════════════════════════════════════════════
   VIEW MODE
   ════════════════════════════════════════════════════════════ */
function setView(mode) {
  viewMode = mode;
  document.getElementById('vbGrid').classList.toggle('active', mode === 'grid');
  document.getElementById('vbList').classList.toggle('active', mode === 'list');
  renderContent();
  if (activeTab === 'view') setTab('view');
}

/* ════════════════════════════════════════════════════════════
   CONTEXT MENU
   ════════════════════════════════════════════════════════════ */
function setupContextMenu() {
  const menu = document.createElement('div');
  menu.id = 'pcContextMenu';
  menu.innerHTML = `
    <div class="ctx-item" onclick="newFolder()"><img src="icons/folder.png" style="width:16px;height:16px;object-fit:contain" alt="">New folder</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" onclick="ribbonOpen()" id="ctxOpen"><img src="icons/folder.png" style="width:16px;height:16px;object-fit:contain" alt="">Open</div>
    <div class="ctx-item" onclick="ribbonRename()" id="ctxRename"><span style="width:16px;text-align:center;font-size:13px;color:#0078d7">T</span>Rename</div>
    <div class="ctx-item" onclick="ribbonDelete()" id="ctxDelete"><span style="width:16px;text-align:center;font-size:13px;color:#e81123">&#x2715;</span>Delete</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" onclick="ribbonProperties()" id="ctxProps"><span style="width:16px;text-align:center;font-size:13px;color:#0078d7">&#x2139;</span>Properties</div>`;
  document.body.appendChild(menu);
}

function showCtx(e) {
  e.preventDefault();
  e.stopPropagation();
  const menu = document.getElementById('pcContextMenu');
  if (!menu) return;

  const hasSel = !!selectedItem;
  ['ctxOpen','ctxRename','ctxDelete','ctxProps'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('disabled', !hasSel);
  });

  let x = e.clientX, y = e.clientY;
  if (x + 190 > window.innerWidth)  x = window.innerWidth  - 194;
  if (y + 200 > window.innerHeight) y = window.innerHeight - 204;
  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';
  menu.classList.add('open');
}

function hideCtx() {
  const menu = document.getElementById('pcContextMenu');
  if (menu) menu.classList.remove('open');
}

document.addEventListener('click', () => hideCtx());
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideCtx(); });

/* keyboard shortcuts */
document.addEventListener('keydown', e => {
  const win = document.getElementById('thispcWindow');
  if (!win || win.style.display === 'none') return;
  if (e.key === 'F2' && selectedItem) startRename(selectedItem.el, selectedItem.item);
  if (e.key === 'Delete' && selectedItem) deleteSelected();
  if (e.key === 'Backspace') navBack();
});

/* ════════════════════════════════════════════════════════════
   OPEN — called from desktop icon
   ════════════════════════════════════════════════════════════ */
function openThisPC() {
  const existing = document.getElementById('thispcWindow');
  if (existing) {
    // restore if minimised
    if (isMinimised) toggleFromTaskbar();
    return;
  }
  // fresh open
  currentPath  = ['This PC'];
  history      = [['This PC']];
  historyIdx   = 0;
  selectedItem = null;
  isMinimised  = false;
  isMaximised  = false;
  initThisPC();
}
 