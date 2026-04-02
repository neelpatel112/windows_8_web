/* ═══════════════════════════════════════════════════════════
   Task Manager  ·  taskmanager.js
   Processes tab + Performance tab with live charts
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════════ */
const TM = {
  open       : false,
  isMin      : false,
  isMax      : false,
  activeTab  : 'processes',
  selectedRow: null,        /* selected process name */
  sortCol    : 'cpu',
  sortAsc    : false,
  updateTimer: null,
  perfTimer  : null,
  drag       : { on:false, ox:0, oy:0 },
  resize     : { on:false, sx:0, sy:0, sw:0, sh:0 },
  /* performance chart history (60 points) */
  history    : {
    cpu : new Array(60).fill(0),
    mem : new Array(60).fill(0),
    disk: new Array(60).fill(0),
    net : new Array(60).fill(0),
    gpu : new Array(60).fill(0),
  },
  activePerfResource: 'cpu',
  /* which apps are currently open — synced with real windows */
  openApps   : [],
};

/* ════════════════════════════════════════════════════════════
   PROCESS DEFINITIONS
   Static background processes + dynamic app processes
   ════════════════════════════════════════════════════════════ */
const BG_PROCESSES = [
  /* Windows system processes */
  { name:'System',                  desc:'NT Kernel & System',            icon:'icons/computer.png',   baseCpu:.2,  baseMem:5.2,  disk:.1, net:0,    type:'windows', pid:4    },
  { name:'System Idle Process',     desc:'',                              icon:'icons/computer.png',   baseCpu:80,  baseMem:.1,   disk:0,  net:0,    type:'windows', pid:0    },
  { name:'smss.exe',                desc:'Windows Session Manager',       icon:'icons/computer.png',   baseCpu:.1,  baseMem:1.2,  disk:0,  net:0,    type:'windows', pid:352  },
  { name:'csrss.exe',               desc:'Client Server Runtime Process', icon:'icons/computer.png',   baseCpu:.3,  baseMem:3.8,  disk:0,  net:.1,   type:'windows', pid:460  },
  { name:'winlogon.exe',            desc:'Windows Logon Application',     icon:'icons/computer.png',   baseCpu:.1,  baseMem:4.2,  disk:0,  net:0,    type:'windows', pid:504  },
  { name:'services.exe',            desc:'Services and Controller App',   icon:'icons/computer.png',   baseCpu:.2,  baseMem:5.6,  disk:.2, net:0,    type:'windows', pid:612  },
  { name:'lsass.exe',               desc:'Local Security Authority',      icon:'icons/computer.png',   baseCpu:.4,  baseMem:8.4,  disk:.1, net:.2,   type:'windows', pid:640  },
  { name:'svchost.exe (netsvcs)',   desc:'Host Process for Windows Svcs', icon:'icons/computer.png',   baseCpu:.8,  baseMem:18.4, disk:.3, net:.4,   type:'windows', pid:788  },
  { name:'svchost.exe (LocalSvc)',  desc:'Host Process for Windows Svcs', icon:'icons/computer.png',   baseCpu:.3,  baseMem:9.2,  disk:.1, net:.1,   type:'windows', pid:856  },
  { name:'svchost.exe (RPCSvc)',    desc:'Host Process for Windows Svcs', icon:'icons/computer.png',   baseCpu:.2,  baseMem:7.1,  disk:0,  net:0,    type:'windows', pid:912  },
  { name:'dwm.exe',                 desc:'Desktop Window Manager',        icon:'icons/computer.png',   baseCpu:1.2, baseMem:28.4, disk:.2, net:0,    type:'windows', pid:1024 },
  { name:'explorer.exe',            desc:'Windows Explorer',              icon:'icons/explorer.png',   baseCpu:.8,  baseMem:42.8, disk:.4, net:.2,   type:'background', pid:2048 },
  { name:'WmiPrvSE.exe',            desc:'WMI Provider Host',             icon:'icons/computer.png',   baseCpu:.3,  baseMem:6.8,  disk:.1, net:0,    type:'background', pid:2156 },
  { name:'SearchIndexer.exe',       desc:'Microsoft Windows Search',      icon:'icons/computer.png',   baseCpu:.6,  baseMem:12.4, disk:2.4,net:0,    type:'background', pid:2248 },
  { name:'MsMpEng.exe',             desc:'Antimalware Service Executable',icon:'icons/computer.png',   baseCpu:.9,  baseMem:88.2, disk:1.2,net:.1,   type:'background', pid:2312 },
  { name:'spoolsv.exe',             desc:'Print Spooler',                 icon:'icons/computer.png',   baseCpu:.1,  baseMem:7.6,  disk:.1, net:0,    type:'background', pid:2408 },
  { name:'taskhost.exe',            desc:'Host Process for Windows Tasks',icon:'icons/computer.png',   baseCpu:.2,  baseMem:5.2,  disk:0,  net:0,    type:'background', pid:2504 },
  { name:'RuntimeBroker.exe',       desc:'Runtime Broker',               icon:'icons/computer.png',   baseCpu:.4,  baseMem:14.2, disk:.1, net:0,    type:'background', pid:2612 },
  { name:'audiodg.exe',             desc:'Windows Audio Device Graph',    icon:'icons/computer.png',   baseCpu:.5,  baseMem:22.6, disk:0,  net:0,    type:'background', pid:2716 },
  { name:'chrome.exe',              desc:'Google Chrome',                 icon:'icons/ie.png',         baseCpu:2.4, baseMem:184.6,disk:.8, net:2.4,  type:'background', pid:3124 },
];

/* App processes — built from currently open windows */
const APP_ICON_MAP = {
  'This PC'           : 'icons/computer.png',
  'Notepad'           : 'icons/notepad.png',
  'Command Prompt'    : 'icons/terminal.png',
  'Internet Explorer' : 'icons/ie.png',
  'PC Settings'       : 'icons/settings.png',
  'Task Manager'      : 'icons/computer.png',
};
const APP_EXE_MAP = {
  'This PC'           : 'explorer.exe',
  'Notepad'           : 'notepad.exe',
  'Command Prompt'    : 'cmd.exe',
  'Internet Explorer' : 'iexplore.exe',
  'PC Settings'       : 'SystemSettings.exe',
  'Task Manager'      : 'Taskmgr.exe',
};

/* ════════════════════════════════════════════════════════════
   DETECT OPEN APPS
   ════════════════════════════════════════════════════════════ */
function tmDetectOpenApps() {
  const apps = [];
  if (document.getElementById('thispcWindow')  && document.getElementById('thispcWindow').style.display !== 'none')  apps.push('This PC');
  if (document.getElementById('notepadWindow') && document.getElementById('notepadWindow').style.display !== 'none') apps.push('Notepad');
  if (document.getElementById('termWindow')    && document.getElementById('termWindow').style.display !== 'none')    apps.push('Command Prompt');
  if (document.getElementById('ieWindow')      && document.getElementById('ieWindow').style.display !== 'none')      apps.push('Internet Explorer');
  if (document.getElementById('settingsWindow')&& document.getElementById('settingsWindow').classList.contains('open')) apps.push('PC Settings');
  apps.push('Task Manager'); /* always include self */
  TM.openApps = apps;
  return apps;
}

function tmBuildAppProcesses() {
  return tmDetectOpenApps().map((name, i) => ({
    name : APP_EXE_MAP[name] || name.toLowerCase().replace(/ /g,'.') + '.exe',
    desc : name,
    icon : APP_ICON_MAP[name] || 'icons/computer.png',
    baseCpu  : name === 'Internet Explorer' ? 3.2 : name === 'Command Prompt' ? 1.8 : 0.8 + i * 0.3,
    baseMem  : name === 'Internet Explorer' ? 96.4 : name === 'This PC' ? 44.2 : 28.4 + i * 8,
    disk     : 0.2 + i * 0.1,
    net      : name === 'Internet Explorer' ? 1.2 : 0,
    type     : 'app',
    pid      : 3200 + i * 80,
    appName  : name,
  }));
}

/* ════════════════════════════════════════════════════════════
   OPEN / CLOSE
   ════════════════════════════════════════════════════════════ */
function openTaskManager() {
  const existing = document.getElementById('tmWindow');
  if (existing) {
    if (TM.isMin) tmRestore();
    return;
  }
  TM.open = true;
  buildTMWindow();
  tmInjectTaskbar();
  tmSetupDrag();
  tmSetupResize();
  tmBuildProcessCtx();
  tmSwitchTab('processes');
  TM.updateTimer = setInterval(tmUpdateProcesses, 1500);
}

function tmClose() {
  TM.open = false;
  clearInterval(TM.updateTimer);
  clearInterval(TM.perfTimer);
  const win = document.getElementById('tmWindow');
  const tb  = document.getElementById('tbTaskMgr');
  if (!win) return;
  win.style.animation = 'tmMin .2s cubic-bezier(.4,0,1,1) both';
  setTimeout(() => { win.remove(); if(tb) tb.remove(); }, 200);
}

function tmMinimise() {
  const win = document.getElementById('tmWindow');
  const tb  = document.getElementById('tbTaskMgr');
  TM.isMin  = true;
  win.classList.add('minimising');
  setTimeout(() => {
    win.style.display = 'none';
    win.classList.remove('minimising');
    if (tb) tb.classList.add('minimised');
  }, 220);
}

function tmRestore() {
  const win = document.getElementById('tmWindow');
  const tb  = document.getElementById('tbTaskMgr');
  win.style.display = 'flex';
  win.classList.add('restoring');
  setTimeout(() => win.classList.remove('restoring'), 220);
  TM.isMin = false;
  if (tb) tb.classList.remove('minimised');
}

function tmMaximise() {
  const win = document.getElementById('tmWindow');
  const btn = document.getElementById('tmMaxBtn');
  TM.isMax  = !TM.isMax;
  win.classList.toggle('maximised', TM.isMax);
  if (btn) btn.textContent = TM.isMax ? '\u29C9' : '\u2610';
}

function tmToggleFromTaskbar() { if (TM.isMin) tmRestore(); else tmMinimise(); }

function tmInjectTaskbar() {
  const tbLeft = document.querySelector('.tb-left');
  if (!tbLeft || document.getElementById('tbTaskMgr')) return;
  const el = document.createElement('div');
  el.id    = 'tbTaskMgr';
  el.title = 'Task Manager';
  el.innerHTML = `<span>Task Manager</span>`;
  el.onclick = tmToggleFromTaskbar;
  el.oncontextmenu = e => {
    e.preventDefault(); e.stopPropagation();
    if (typeof showTaskbarAppCtx === 'function') showTaskbarAppCtx(e, 'Task Manager', false);
  };
  tbLeft.appendChild(el);
}

/* ════════════════════════════════════════════════════════════
   BUILD DOM
   ════════════════════════════════════════════════════════════ */
function buildTMWindow() {
  const win = document.createElement('div');
  win.id = 'tmWindow';
  win.innerHTML = `
<div class="tm-titlebar" id="tmTitleBar">
  <span class="tm-titlebar-text">Task Manager</span>
  <div class="tm-controls">
    <button class="tm-btn" onclick="tmMinimise()" title="Minimise">&#x2014;</button>
    <button class="tm-btn" id="tmMaxBtn" onclick="tmMaximise()" title="Maximise">&#x2610;</button>
    <button class="tm-btn close" onclick="tmClose()" title="Close">&#x2715;</button>
  </div>
</div>

<div class="tm-menubar">
  <div class="tm-menu-item" onclick="tmClose()">File</div>
  <div class="tm-menu-item">Options</div>
  <div class="tm-menu-item">View</div>
</div>

<div class="tm-tabbar">
  <div class="tm-tab active" id="tmTab-processes"   onclick="tmSwitchTab('processes')">Processes</div>
  <div class="tm-tab"        id="tmTab-performance" onclick="tmSwitchTab('performance')">Performance</div>
</div>

<div class="tm-content" id="tmContent"></div>

<div class="tm-statusbar" id="tmStatusbar">
  <div class="tm-status-item">
    <div class="tm-status-dot green"></div>
    <span id="tmStatusProcs">0 processes</span>
  </div>
  <div class="tm-status-item">CPU Usage: <span id="tmStatusCPU">0%</span></div>
  <div class="tm-status-item">Memory: <span id="tmStatusMem">0 MB</span></div>
</div>

<div class="tm-resize" id="tmResizeHandle"></div>`;
  document.body.appendChild(win);
  document.getElementById('tmTitleBar').addEventListener('dblclick', tmMaximise);
}

/* ════════════════════════════════════════════════════════════
   TAB SWITCHING
   ════════════════════════════════════════════════════════════ */
function tmSwitchTab(tab) {
  TM.activeTab = tab;
  document.querySelectorAll('.tm-tab').forEach(t => t.classList.remove('active'));
  const tabEl = document.getElementById('tmTab-' + tab);
  if (tabEl) tabEl.classList.add('active');

  clearInterval(TM.perfTimer);

  if (tab === 'processes') {
    tmRenderProcesses();
    TM.updateTimer = TM.updateTimer || setInterval(tmUpdateProcesses, 1500);
  } else {
    clearInterval(TM.updateTimer);
    TM.updateTimer = null;
    tmRenderPerformance();
    tmStartPerfLoop();
  }
}

/* ════════════════════════════════════════════════════════════
   ██████████████████████████████████
   PROCESSES TAB
   ██████████████████████████████████
   ════════════════════════════════════════════════════════════ */
function tmRenderProcesses() {
  const content = document.getElementById('tmContent');
  if (!content) return;

  content.innerHTML = `
  <div id="tmProcessPage">
    <div class="tm-proc-header">
      <div class="tm-proc-header-cell sorted" id="tmHdr-name" onclick="tmSort('name')">
        Name <span class="tm-col-arrow" id="tmArrow-name">&#x2193;</span>
      </div>
      <div class="tm-proc-header-cell" id="tmHdr-cpu" onclick="tmSort('cpu')">
        CPU <span class="tm-col-arrow" id="tmArrow-cpu"></span>
      </div>
      <div class="tm-proc-header-cell" id="tmHdr-mem" onclick="tmSort('mem')">
        Memory <span class="tm-col-arrow" id="tmArrow-mem"></span>
      </div>
      <div class="tm-proc-header-cell" id="tmHdr-disk" onclick="tmSort('disk')">
        Disk <span class="tm-col-arrow" id="tmArrow-disk"></span>
      </div>
      <div class="tm-proc-header-cell" id="tmHdr-net" onclick="tmSort('net')">
        Network <span class="tm-col-arrow" id="tmArrow-net"></span>
      </div>
    </div>
    <div class="tm-proc-list" id="tmProcList"></div>
  </div>
  <button class="tm-end-task-btn" id="tmEndTaskBtn" disabled onclick="tmEndSelected()">End Task</button>`;

  tmPopulateProcessList();
}

function tmGetAllProcesses() {
  const apps = tmBuildAppProcesses();
  return [...apps, ...BG_PROCESSES];
}

function tmFlicker(base, variance) {
  return Math.max(0, base + (Math.random() - 0.5) * variance).toFixed(1);
}

function tmPopulateProcessList() {
  const list = document.getElementById('tmProcList');
  if (!list) return;

  const all   = tmGetAllProcesses();
  const apps  = all.filter(p => p.type === 'app');
  const bg    = all.filter(p => p.type === 'background');
  const win   = all.filter(p => p.type === 'windows');

  let totalCPU = 0, totalMem = 0;
  all.forEach(p => { totalCPU += parseFloat(p.baseCpu); totalMem += p.baseMem; });

  list.innerHTML = '';
  tmRenderGroup(list, 'Apps', apps, true);
  tmRenderGroup(list, 'Background processes', bg, false);
  tmRenderGroup(list, 'Windows processes', win, false);

  /* update status bar */
  const statusProcs = document.getElementById('tmStatusProcs');
  const statusCPU   = document.getElementById('tmStatusCPU');
  const statusMem   = document.getElementById('tmStatusMem');
  if (statusProcs) statusProcs.textContent = `${all.length} processes`;
  if (statusCPU)   statusCPU.textContent   = Math.min(99, totalCPU).toFixed(1) + '%';
  if (statusMem)   statusMem.textContent   = (totalMem / 1024).toFixed(1) + ' GB';
}

function tmRenderGroup(container, label, procs, expanded) {
  if (!procs.length) return;

  const groupId = 'tmGroup-' + label.replace(/ /g, '_');
  const grp = document.createElement('div');
  grp.className = 'tm-proc-group';
  grp.id = groupId;
  grp.innerHTML = `<span class="tm-group-arrow ${expanded ? '' : 'collapsed'}" id="${groupId}-arrow">&#x25BC;</span> ${label} (${procs.length})`;
  grp.onclick = () => tmToggleGroup(groupId);
  container.appendChild(grp);

  const rows = document.createElement('div');
  rows.id = groupId + '-rows';
  rows.style.display = expanded ? '' : 'none';

  procs.forEach(p => {
    const cpu  = parseFloat(tmFlicker(p.baseCpu,  p.baseCpu  * .4));
    const mem  = parseFloat(tmFlicker(p.baseMem,  p.baseMem  * .05));
    const disk = parseFloat(tmFlicker(p.disk,     p.disk     * .5));
    const net  = parseFloat(tmFlicker(p.net,      p.net      * .6));

    const cpuPct  = Math.min(100, cpu).toFixed(1);
    const memMB   = mem.toFixed(1);
    const diskMBs = disk.toFixed(1);
    const netMBs  = net.toFixed(1);

    const cpuClass  = cpu > 20  ? 'high' : cpu > 5   ? 'medium' : '';
    const memClass  = mem > 500 ? 'high' : mem > 200 ? 'medium' : '';

    const row = document.createElement('div');
    row.className  = 'tm-proc-row';
    row.dataset.name = p.name;
    row.dataset.app  = p.appName || '';
    row.dataset.pid  = p.pid;

    row.innerHTML = `
      <div class="tm-proc-cell">
        <img class="tm-proc-icon" src="${p.icon}" onerror="this.style.display='none'" alt="">
        <div>
          <div class="tm-proc-name">${p.name}</div>
          ${p.desc ? `<div class="tm-proc-desc">${p.desc}</div>` : ''}
        </div>
      </div>
      <div class="tm-proc-cell">
        <div class="tm-usage-cell">
          <span class="tm-usage-val ${cpuClass}">${cpuPct}%</span>
          <div class="tm-usage-bar-wrap"><div class="tm-usage-bar tm-bar-cpu" style="width:${Math.min(100,cpu*2)}%"></div></div>
        </div>
      </div>
      <div class="tm-proc-cell">
        <div class="tm-usage-cell">
          <span class="tm-usage-val ${memClass}">${memMB} MB</span>
          <div class="tm-usage-bar-wrap"><div class="tm-usage-bar tm-bar-mem" style="width:${Math.min(100,mem/2048*100)}%"></div></div>
        </div>
      </div>
      <div class="tm-proc-cell">
        <div class="tm-usage-cell">
          <span class="tm-usage-val">${diskMBs} MB/s</span>
          <div class="tm-usage-bar-wrap"><div class="tm-usage-bar tm-bar-disk" style="width:${Math.min(100,disk*10)}%"></div></div>
        </div>
      </div>
      <div class="tm-proc-cell">
        <div class="tm-usage-cell">
          <span class="tm-usage-val">${netMBs} Mbps</span>
          <div class="tm-usage-bar-wrap"><div class="tm-usage-bar tm-bar-net" style="width:${Math.min(100,net*15)}%"></div></div>
        </div>
      </div>`;

    row.onclick = (e) => tmSelectRow(row, p);
    row.oncontextmenu = (e) => {
      e.preventDefault(); e.stopPropagation();
      tmSelectRow(row, p);
      tmShowProcCtx(e.clientX, e.clientY, p);
    };
    rows.appendChild(row);
  });
  container.appendChild(rows);
}

function tmToggleGroup(groupId) {
  const rows  = document.getElementById(groupId + '-rows');
  const arrow = document.getElementById(groupId + '-arrow');
  if (!rows) return;
  const collapsed = rows.style.display === 'none';
  rows.style.display  = collapsed ? '' : 'none';
  if (arrow) arrow.classList.toggle('collapsed', !collapsed);
}

function tmSelectRow(row, proc) {
  document.querySelectorAll('.tm-proc-row.selected').forEach(r => r.classList.remove('selected'));
  row.classList.add('selected');
  TM.selectedRow = proc;
  const btn = document.getElementById('tmEndTaskBtn');
  if (btn) btn.disabled = false;
}

function tmSort(col) {
  TM.sortAsc = TM.sortCol === col ? !TM.sortAsc : false;
  TM.sortCol = col;
  document.querySelectorAll('.tm-proc-header-cell').forEach(h => h.classList.remove('sorted'));
  document.querySelectorAll('.tm-col-arrow').forEach(a => a.textContent = '');
  const hdr   = document.getElementById('tmHdr-' + col);
  const arrow = document.getElementById('tmArrow-' + col);
  if (hdr)   hdr.classList.add('sorted');
  if (arrow) arrow.textContent = TM.sortAsc ? '↑' : '↓';
  tmPopulateProcessList();
}

function tmUpdateProcesses() {
  if (TM.activeTab !== 'processes') return;
  /* re-render with fresh flickered values */
  tmPopulateProcessList();

  /* re-select the previously selected row */
  if (TM.selectedRow) {
    const row = document.querySelector(`.tm-proc-row[data-name="${CSS.escape(TM.selectedRow.name)}"]`);
    if (row) {
      row.classList.add('selected');
      const btn = document.getElementById('tmEndTaskBtn');
      if (btn) btn.disabled = false;
    }
  }
}

/* ── END TASK ── */
function tmEndSelected() {
  if (!TM.selectedRow) return;
  const proc = TM.selectedRow;
  const row  = document.querySelector(`.tm-proc-row[data-name="${CSS.escape(proc.name)}"]`);

  if (row) {
    row.classList.add('terminating');
    setTimeout(() => row.remove(), 400);
  }

  /* actually close the corresponding window if it's an app */
  const appName = proc.appName || proc.desc;
  setTimeout(() => {
    if (appName === 'This PC'            && typeof closePC          === 'function') closePC();
    if (appName === 'Notepad'            && typeof npClose          === 'function') npClose();
    if (appName === 'Command Prompt'     && typeof termClose        === 'function') termClose();
    if (appName === 'Internet Explorer'  && typeof ieClose          === 'function') ieClose();
    if (appName === 'PC Settings'        && typeof closeSettings    === 'function') closeSettings();
    if (appName === 'Task Manager')                                                  tmClose();
  }, 450);

  TM.selectedRow = null;
  const btn = document.getElementById('tmEndTaskBtn');
  if (btn) btn.disabled = true;

  if (typeof notify === 'function') notify(`"${proc.name}" terminated`, 'Task Manager');
}

/* ════════════════════════════════════════════════════════════
   ██████████████████████████████████
   PERFORMANCE TAB
   ██████████████████████████████████
   ════════════════════════════════════════════════════════════ */
function tmRenderPerformance() {
  const content = document.getElementById('tmContent');
  if (!content) return;

  content.innerHTML = `
  <div id="tmPerfPage">
    <!-- Left sidebar -->
    <div class="tm-perf-sidebar" id="tmPerfSidebar">
      ${tmPerfSidebarItem('cpu',  'CPU',    '0%',   'Intel Core i7')}
      ${tmPerfSidebarItem('mem',  'Memory', '0 GB', '8.0 GB DDR3')}
      ${tmPerfSidebarItem('disk', 'Disk 0', '0%',   'C: · SSD')}
      ${tmPerfSidebarItem('net',  'Wi-Fi',  '0 Mbps','802.11ac')}
      ${tmPerfSidebarItem('gpu',  'GPU',    '0%',   'Intel HD 4000')}
    </div>
    <!-- Right panel -->
    <div class="tm-perf-panel" id="tmPerfPanel">
      <!-- populated by tmShowPerfResource() -->
    </div>
  </div>`;

  /* attach sidebar click handlers */
  ['cpu','mem','disk','net','gpu'].forEach(r => {
    const el = document.getElementById('tmPerfItem-' + r);
    if (el) el.onclick = () => tmShowPerfResource(r);
  });

  tmShowPerfResource('cpu');
}

function tmPerfSidebarItem(id, name, val, sub) {
  return `
  <div class="tm-perf-item" id="tmPerfItem-${id}">
    <div class="tm-perf-item-name">${name}</div>
    <div class="tm-perf-item-val" id="tmSideVal-${id}">${val}</div>
    <div class="tm-perf-item-sub">${sub}</div>
    <div class="tm-perf-mini"><canvas id="tmMini-${id}" height="28"></canvas></div>
  </div>`;
}

function tmShowPerfResource(resource) {
  TM.activePerfResource = resource;

  /* highlight sidebar */
  document.querySelectorAll('.tm-perf-item').forEach(el => el.classList.remove('active'));
  const sideEl = document.getElementById('tmPerfItem-' + resource);
  if (sideEl) sideEl.classList.add('active');

  const panel = document.getElementById('tmPerfPanel');
  if (!panel) return;

  const cfg = {
    cpu  : { title:'CPU',    subtitle:'Intel(R) Core(TM) i7 CPU @ 2.40GHz', color:'#0078d7', unit:'%',   max:100,
             stats:['Utilisation','Speed','Processes','Threads','Handles','Up time'],
             statVals:['0%','2.4 GHz','0','0','0','0:00:00'] },
    mem  : { title:'Memory', subtitle:'8.0 GB DDR3-1600',                   color:'#7700cc', unit:'GB',  max:8,
             stats:['In use','Available','Committed','Cached','Paged pool','Non-paged pool'],
             statVals:['0 GB','0 GB','0 GB','0 GB','0 MB','0 MB'] },
    disk : { title:'Disk 0 (C:)', subtitle:'Samsung SSD 850 EVO 120GB',     color:'#00b050', unit:'%',   max:100,
             stats:['Active time','Avg response','Read speed','Write speed','Capacity','Formatted'],
             statVals:['0%','0 ms','0 MB/s','0 MB/s','119 GB','119 GB'] },
    net  : { title:'Wi-Fi',  subtitle:'Intel Wireless-N 7260 (802.11ac)',   color:'#e07000', unit:'Mbps',max:100,
             stats:['Send','Receive','Total','IPv4','IPv6','Connection type'],
             statVals:['0 Kbps','0 Kbps','0 Kbps','DHCP','N/A','802.11ac'] },
    gpu  : { title:'GPU',    subtitle:'Intel HD Graphics 4000',             color:'#c42b1c', unit:'%',   max:100,
             stats:['Utilisation','Dedicated mem','Shared mem','Driver ver.','DirectX ver.','Resolution'],
             statVals:['0%','128 MB','2.1 GB','10.18.10.4252','DirectX 11','1920×1080'] },
  };

  const c = cfg[resource];
  panel.innerHTML = `
    <div>
      <div class="tm-perf-title">${c.title}</div>
      <div class="tm-perf-subtitle">${c.subtitle}</div>
    </div>

    <!-- Main chart -->
    <div class="tm-chart-wrap">
      <canvas id="tmMainChart" width="560" height="160"></canvas>
      <div class="tm-chart-label-tl">100%</div>
      <div class="tm-chart-label-bl">0%</div>
      <div class="tm-chart-label-tr">60 seconds</div>
    </div>

    <!-- Stat boxes -->
    <div class="tm-stats-grid" id="tmStatGrid">
      ${c.stats.map((s,i) => `
        <div class="tm-stat-box">
          <div class="tm-stat-label">${s}</div>
          <div class="tm-stat-value" id="tmStat-${resource}-${i}">${c.statVals[i]}</div>
        </div>`).join('')}
    </div>`;

  /* draw initial empty chart */
  tmDrawMainChart(resource, c.color, c.max);
}

/* ── CHART DRAWING ── */
function tmDrawMainChart(resource, color, max) {
  const canvas = document.getElementById('tmMainChart');
  if (!canvas) return;

  /* fit canvas to its container */
  const wrap = canvas.parentElement;
  canvas.width  = wrap.clientWidth  || 560;
  canvas.height = wrap.clientHeight || 160;

  const ctx    = canvas.getContext('2d');
  const data   = TM.history[resource];
  const W      = canvas.width;
  const H      = canvas.height;
  const pad    = 2;
  const step   = (W - pad * 2) / (data.length - 1);

  ctx.clearRect(0, 0, W, H);

  /* grid lines */
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth   = 1;
  for (let i = 1; i < 4; i++) {
    const y = pad + (H - pad*2) * i / 4;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W-pad, y); ctx.stroke();
  }
  for (let i = 1; i < 12; i++) {
    const x = pad + (W - pad*2) * i / 12;
    ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, H-pad); ctx.stroke();
  }

  /* fill under the line */
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, color + 'aa');
  grad.addColorStop(1, color + '11');
  ctx.beginPath();
  ctx.moveTo(pad, H - pad);
  data.forEach((v, i) => {
    const x = pad + i * step;
    const y = H - pad - (v / max) * (H - pad * 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad + (data.length-1) * step, H - pad);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  /* line */
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  data.forEach((v, i) => {
    const x = pad + i * step;
    const y = H - pad - (v / max) * (H - pad * 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}

/* mini sparkline in sidebar */
function tmDrawMini(id, data, color) {
  const canvas = document.getElementById('tmMini-' + id);
  if (!canvas) return;
  const parent = canvas.parentElement;
  canvas.width  = parent.clientWidth || 140;
  canvas.height = 28;
  const ctx  = canvas.getContext('2d');
  const W    = canvas.width;
  const H    = canvas.height;
  const step = W / (data.length - 1);
  const max  = Math.max(...data, 1);
  ctx.clearRect(0, 0, W, H);
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  data.forEach((v, i) => {
    const x = i * step;
    const y = H - (v / max) * H;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}

/* ── PERFORMANCE LIVE LOOP ── */
function tmStartPerfLoop() {
  /* generate realistic simulated values */
  function nextVal(prev, min, max, drift) {
    const delta = (Math.random() - 0.5) * drift;
    return Math.max(min, Math.min(max, prev + delta));
  }

  /* current live values */
  const live = { cpu:18, mem:4.2, disk:3, net:2.4, gpu:12 };

  TM.perfTimer = setInterval(() => {
    /* advance values */
    live.cpu  = nextVal(live.cpu,  2,  95,  8);
    live.mem  = nextVal(live.mem,  2.8, 7.2, .15);
    live.disk = nextVal(live.disk, 0,  80,  12);
    live.net  = nextVal(live.net,  0,  60,  6);
    live.gpu  = nextVal(live.gpu,  4,  70,  10);

    /* push to history */
    ['cpu','mem','disk','net','gpu'].forEach(r => {
      TM.history[r].push(r === 'mem' ? live[r] : live[r]);
      TM.history[r].shift();
    });

    /* update sidebar values */
    const sideMap = {
      cpu : `${live.cpu.toFixed(0)}%`,
      mem : `${live.mem.toFixed(1)} GB`,
      disk: `${live.disk.toFixed(0)}%`,
      net : `${live.net.toFixed(1)} Mbps`,
      gpu : `${live.gpu.toFixed(0)}%`,
    };
    const colorMap = { cpu:'#0078d7', mem:'#7700cc', disk:'#00b050', net:'#e07000', gpu:'#c42b1c' };

    ['cpu','mem','disk','net','gpu'].forEach(r => {
      const el = document.getElementById('tmSideVal-' + r);
      if (el) el.textContent = sideMap[r];
      tmDrawMini(r, TM.history[r].slice(-20), colorMap[r]);
    });

    /* redraw main chart if visible */
    const c     = TM.activePerfResource;
    const colorM= colorMap[c];
    const maxMap= { cpu:100, mem:8, disk:100, net:100, gpu:100 };
    tmDrawMainChart(c, colorM, maxMap[c]);

    /* update stat values for active resource */
    if (c === 'cpu') {
      tmSetStat(c, 0, `${live.cpu.toFixed(1)}%`);
      tmSetStat(c, 1, `${(2.4 + live.cpu/100 * .8).toFixed(2)} GHz`);
      tmSetStat(c, 2, String(tmGetAllProcesses().length));
      tmSetStat(c, 3, String(Math.floor(tmGetAllProcesses().length * 12.4)));
      tmSetStat(c, 4, String(Math.floor(tmGetAllProcesses().length * 38)));
      tmSetStat(c, 5, tmFormatUptime());
    } else if (c === 'mem') {
      tmSetStat(c, 0, `${live.mem.toFixed(1)} GB`);
      tmSetStat(c, 1, `${(8 - live.mem).toFixed(1)} GB`);
      tmSetStat(c, 2, `${(live.mem * 1.1).toFixed(1)} GB`);
      tmSetStat(c, 3, `${(live.mem * .6).toFixed(1)} GB`);
    } else if (c === 'disk') {
      tmSetStat(c, 0, `${live.disk.toFixed(0)}%`);
      tmSetStat(c, 1, `${(Math.random()*8+1).toFixed(1)} ms`);
      tmSetStat(c, 2, `${(live.disk * .8).toFixed(1)} MB/s`);
      tmSetStat(c, 3, `${(live.disk * .3).toFixed(1)} MB/s`);
    } else if (c === 'net') {
      tmSetStat(c, 0, `${(live.net * .6).toFixed(1)} Kbps`);
      tmSetStat(c, 1, `${(live.net * .4).toFixed(1)} Kbps`);
      tmSetStat(c, 2, `${live.net.toFixed(1)} Kbps`);
    } else if (c === 'gpu') {
      tmSetStat(c, 0, `${live.gpu.toFixed(0)}%`);
      tmSetStat(c, 1, `${(128 + live.gpu * .5).toFixed(0)} MB`);
      tmSetStat(c, 2, `${(live.gpu * 20).toFixed(0)} MB`);
    }

    /* also update status bar */
    const statusCPU = document.getElementById('tmStatusCPU');
    const statusMem = document.getElementById('tmStatusMem');
    if (statusCPU) statusCPU.textContent = live.cpu.toFixed(1) + '%';
    if (statusMem) statusMem.textContent = live.mem.toFixed(1) + ' GB';

  }, 1000);
}

function tmSetStat(resource, idx, val) {
  const el = document.getElementById(`tmStat-${resource}-${idx}`);
  if (el) el.textContent = val;
}

function tmFormatUptime() {
  const s = Math.floor(performance.now() / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

/* ════════════════════════════════════════════════════════════
   PROCESS CONTEXT MENU
   ════════════════════════════════════════════════════════════ */
function tmBuildProcessCtx() {
  if (document.getElementById('tmProcessCtx')) return;
  const menu = document.createElement('div');
  menu.id = 'tmProcessCtx';
  menu.innerHTML = `
    <div class="tm-ctx-item" id="tmCtxEndTask" onclick="tmEndSelected();tmHideCtx()">
      <span style="width:18px;text-align:center;font-size:14px;color:#e81123">&#x2715;</span>
      <b>End Task</b>
    </div>
    <div class="tm-ctx-sep"></div>
    <div class="tm-ctx-item" onclick="tmCtxOpenLocation()">
      <span style="width:18px;text-align:center;font-size:13px">&#x1F4C2;</span>
      Open file location
    </div>
    <div class="tm-ctx-item" onclick="tmCtxProperties()">
      <span style="width:18px;text-align:center;font-size:13px">&#x2139;</span>
      Properties
    </div>
    <div class="tm-ctx-sep"></div>
    <div class="tm-ctx-item disabled">
      <span style="width:18px;text-align:center;font-size:13px">&#x23F8;</span>
      Suspend
    </div>`;
  document.body.appendChild(menu);
  document.addEventListener('click', tmHideCtx);
}

let _tmCtxOpen = false;
function tmShowProcCtx(x, y, proc) {
  const menu = document.getElementById('tmProcessCtx');
  if (!menu) return;
  menu.classList.add('open');
  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';
  _tmCtxOpen = true;
  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right  > window.innerWidth)  menu.style.left = (x - r.width)  + 'px';
    if (r.bottom > window.innerHeight) menu.style.top  = (y - r.height) + 'px';
  });
}
function tmHideCtx() {
  const menu = document.getElementById('tmProcessCtx');
  if (menu) menu.classList.remove('open');
  _tmCtxOpen = false;
}
function tmCtxOpenLocation() {
  tmHideCtx();
  if (typeof notify === 'function') notify('C:\\Windows\\System32', 'File Location');
}
function tmCtxProperties() {
  tmHideCtx();
  if (!TM.selectedRow) return;
  if (typeof notify === 'function') notify(`${TM.selectedRow.name} — PID: ${TM.selectedRow.pid}`, 'Properties');
}

/* ════════════════════════════════════════════════════════════
   DRAG
   ════════════════════════════════════════════════════════════ */
function tmSetupDrag() {
  const tb = document.getElementById('tmTitleBar');
  if (!tb) return;
  tb.addEventListener('mousedown', e => {
    if (e.target.closest('.tm-controls') || TM.isMax) return;
    TM.drag.on = true;
    const win  = document.getElementById('tmWindow');
    const r    = win.getBoundingClientRect();
    TM.drag.ox = e.clientX - r.left;
    TM.drag.oy = e.clientY - r.top;
    win.style.transform  = 'none';
    win.style.transition = 'none';
    win.style.left = r.left + 'px';
    win.style.top  = r.top  + 'px';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!TM.drag.on) return;
    const win = document.getElementById('tmWindow');
    let x = e.clientX - TM.drag.ox;
    let y = e.clientY - TM.drag.oy;
    x = Math.max(-win.offsetWidth+60, Math.min(window.innerWidth-60, x));
    y = Math.max(0, Math.min(window.innerHeight-32, y));
    win.style.left = x+'px'; win.style.top = y+'px';
  });
  document.addEventListener('mouseup', () => { TM.drag.on = false; });
}

/* ════════════════════════════════════════════════════════════
   RESIZE
   ════════════════════════════════════════════════════════════ */
function tmSetupResize() {
  const h = document.getElementById('tmResizeHandle');
  if (!h) return;
  h.addEventListener('mousedown', e => {
    if (TM.isMax) return;
    TM.resize.on = true;
    const win = document.getElementById('tmWindow');
    TM.resize.sx=e.clientX; TM.resize.sy=e.clientY;
    TM.resize.sw=win.offsetWidth; TM.resize.sh=win.offsetHeight;
    e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('mousemove', e => {
    if (!TM.resize.on) return;
    const win = document.getElementById('tmWindow');
    win.style.width  = Math.max(520, TM.resize.sw+(e.clientX-TM.resize.sx))+'px';
    win.style.height = Math.max(360, TM.resize.sh+(e.clientY-TM.resize.sy))+'px';
    if (TM.activeTab === 'performance') tmDrawMainChart(TM.activePerfResource, {cpu:'#0078d7',mem:'#7700cc',disk:'#00b050',net:'#e07000',gpu:'#c42b1c'}[TM.activePerfResource], 100);
  });
  document.addEventListener('mouseup', () => { TM.resize.on = false; });
}

/* ════════════════════════════════════════════════════════════
   TASKBAR EMPTY AREA RIGHT-CLICK MENU
   ════════════════════════════════════════════════════════════ */
function buildTaskbarEmptyCtx() {
  if (document.getElementById('taskbarEmptyCtx')) return;
  const menu = document.createElement('div');
  menu.id = 'taskbarEmptyCtx';
  menu.className = 'ctx-menu ctx-menu-up';
  menu.innerHTML = `
    <div class="ctx-item" onclick="openTaskManager(); hideTaskbarCtx()">
      <span class="ctx-icon">&#x1F4CA;</span><b>Task Manager</b>
    </div>
    <div class="ctx-sep"></div>
    <div class="ctx-item ctx-disabled">
      <span class="ctx-icon">&#x1F4CC;</span>Toolbars
    </div>
    <div class="ctx-item ctx-disabled">
      <span class="ctx-icon">&#x1F5A5;</span>Show the desktop
    </div>
    <div class="ctx-sep"></div>
    <div class="ctx-item ctx-disabled">
      <span class="ctx-icon">&#x1F4CB;</span>Properties
    </div>`;
  document.body.appendChild(menu);
}

function showTaskbarEmptyCtx(e) {
  e.preventDefault();
  e.stopPropagation();
  buildTaskbarEmptyCtx();
  const menu = document.getElementById('taskbarEmptyCtx');
  if (!menu) return;

  /* position above taskbar */
  menu.style.display = 'block';
  menu.style.left    = e.clientX + 'px';
  menu.style.bottom  = '50px';
  menu.style.top     = 'auto';

  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right > window.innerWidth) menu.style.left = (e.clientX - r.width) + 'px';
  });

  document.addEventListener('click', hideTaskbarCtx, { once: true });
}

function hideTaskbarCtx() {
  const menu = document.getElementById('taskbarEmptyCtx');
  if (menu) menu.style.display = 'none';
}
 