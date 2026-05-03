/* ═══════════════════════════════════════════════════════════
   Task Manager  ·  taskmanager.js  v2.0
   Fully upgraded — 5 tabs, search, startup, users, details
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════════ */
const TM = {
  open        : false,
  isMin       : false,
  isMax       : false,
  activeTab   : 'processes',
  selectedRow : null,
  sortCol     : 'cpu',
  sortAsc     : false,
  updateTimer : null,
  perfTimer   : null,
  uptimeStart : Date.now(),
  drag        : { on:false, ox:0, oy:0 },
  resize      : { on:false, sx:0, sy:0, sw:0, sh:0 },
  history     : {
    cpu : new Array(60).fill(0),
    mem : new Array(60).fill(0),
    disk: new Array(60).fill(0),
    net : new Array(60).fill(0),
    gpu : new Array(60).fill(0),
  },
  live        : { cpu:18, mem:4.2, disk:3, net:2.4, gpu:12 },
  activePerfResource: 'cpu',
  filterText  : '',
  suspendedPids: new Set(),
};

/* ════════════════════════════════════════════════════════════
   PROCESS TABLE — all apps including new ones
   ════════════════════════════════════════════════════════════ */
const APP_ICON_MAP = {
  'This PC'           : 'icons/computer.png',
  'Notepad'           : 'icons/notepad.png',
  'Command Prompt'    : 'icons/terminal.png',
  'Internet Explorer' : 'icons/ie.png',
  'PC Settings'       : 'icons/settings.png',
  'Weather'           : 'icons/weather.png',
  'Maps'              : 'icons/maps.png',
  'PDF Viewer'        : 'icons/file-text.png',
  'Task Manager'      : 'icons/computer.png',
};
const APP_EXE_MAP = {
  'This PC'           : 'explorer.exe',
  'Notepad'           : 'notepad.exe',
  'Command Prompt'    : 'cmd.exe',
  'Internet Explorer' : 'iexplore.exe',
  'PC Settings'       : 'SystemSettings.exe',
  'Weather'           : 'weather.exe',
  'Maps'              : 'maps.exe',
  'PDF Viewer'        : 'AcroRd32.exe',
  'Task Manager'      : 'Taskmgr.exe',
};
const APP_CPU_MAP = {
  'Internet Explorer':3.8, 'Command Prompt':1.8, 'Maps':4.2,
  'Weather':1.2, 'PDF Viewer':2.1, 'This PC':0.9, 'Notepad':0.4,
  'PC Settings':0.6, 'Task Manager':0.8,
};
const APP_MEM_MAP = {
  'Internet Explorer':128.4, 'Maps':96.2, 'Weather':64.8,
  'PDF Viewer':88.4, 'This PC':44.2, 'Notepad':32.6,
  'Command Prompt':22.4, 'PC Settings':48.2, 'Task Manager':36.8,
};

const BG_PROCESSES = [
  { name:'System Idle Process',    desc:'',                               icon:'icons/computer.png', baseCpu:72,  baseMem:.1,   disk:0,   net:0,   type:'windows',    pid:0,    status:'Running' },
  { name:'System',                 desc:'NT Kernel & System',             icon:'icons/computer.png', baseCpu:.3,  baseMem:5.2,  disk:.2,  net:0,   type:'windows',    pid:4,    status:'Running' },
  { name:'smss.exe',               desc:'Windows Session Manager',        icon:'icons/computer.png', baseCpu:.1,  baseMem:1.2,  disk:0,   net:0,   type:'windows',    pid:352,  status:'Running' },
  { name:'csrss.exe',              desc:'Client Server Runtime Process',  icon:'icons/computer.png', baseCpu:.3,  baseMem:3.8,  disk:0,   net:.1,  type:'windows',    pid:460,  status:'Running' },
  { name:'winlogon.exe',           desc:'Windows Logon Application',      icon:'icons/computer.png', baseCpu:.1,  baseMem:4.2,  disk:0,   net:0,   type:'windows',    pid:504,  status:'Running' },
  { name:'services.exe',           desc:'Services and Controller App',    icon:'icons/computer.png', baseCpu:.2,  baseMem:5.6,  disk:.2,  net:0,   type:'windows',    pid:612,  status:'Running' },
  { name:'lsass.exe',              desc:'Local Security Authority',       icon:'icons/computer.png', baseCpu:.4,  baseMem:8.4,  disk:.1,  net:.2,  type:'windows',    pid:640,  status:'Running' },
  { name:'dwm.exe',                desc:'Desktop Window Manager',         icon:'icons/computer.png', baseCpu:1.4, baseMem:28.4, disk:.2,  net:0,   type:'windows',    pid:1024, status:'Running' },
  { name:'svchost.exe (netsvcs)',  desc:'Host Process for Windows Svcs',  icon:'icons/computer.png', baseCpu:.8,  baseMem:18.4, disk:.3,  net:.4,  type:'windows',    pid:788,  status:'Running' },
  { name:'svchost.exe (LocalSvc)', desc:'Host Process for Windows Svcs',  icon:'icons/computer.png', baseCpu:.3,  baseMem:9.2,  disk:.1,  net:.1,  type:'windows',    pid:856,  status:'Running' },
  { name:'svchost.exe (RPCSvc)',   desc:'Host Process for Windows Svcs',  icon:'icons/computer.png', baseCpu:.2,  baseMem:7.1,  disk:0,   net:0,   type:'windows',    pid:912,  status:'Running' },
  { name:'explorer.exe',           desc:'Windows Explorer',               icon:'icons/explorer.png', baseCpu:.8,  baseMem:42.8, disk:.4,  net:.2,  type:'background', pid:2048, status:'Running' },
  { name:'MsMpEng.exe',           desc:'Antimalware Service Executable',  icon:'icons/computer.png', baseCpu:.9,  baseMem:88.2, disk:1.2, net:.1,  type:'background', pid:2312, status:'Running' },
  { name:'SearchIndexer.exe',      desc:'Microsoft Windows Search',       icon:'icons/computer.png', baseCpu:.6,  baseMem:12.4, disk:2.4, net:0,   type:'background', pid:2248, status:'Running' },
  { name:'RuntimeBroker.exe',      desc:'Runtime Broker',                 icon:'icons/computer.png', baseCpu:.4,  baseMem:14.2, disk:.1,  net:0,   type:'background', pid:2612, status:'Running' },
  { name:'audiodg.exe',            desc:'Windows Audio Device Graph',     icon:'icons/computer.png', baseCpu:.5,  baseMem:22.6, disk:0,   net:0,   type:'background', pid:2716, status:'Running' },
  { name:'WmiPrvSE.exe',           desc:'WMI Provider Host',              icon:'icons/computer.png', baseCpu:.3,  baseMem:6.8,  disk:.1,  net:0,   type:'background', pid:2156, status:'Running' },
  { name:'taskhost.exe',           desc:'Host Process for Windows Tasks', icon:'icons/computer.png', baseCpu:.2,  baseMem:5.2,  disk:0,   net:0,   type:'background', pid:2504, status:'Running' },
  { name:'spoolsv.exe',            desc:'Print Spooler',                  icon:'icons/computer.png', baseCpu:.1,  baseMem:7.6,  disk:.1,  net:0,   type:'background', pid:2408, status:'Running' },
  { name:'wininit.exe',            desc:'Windows Start-Up Application',   icon:'icons/computer.png', baseCpu:.1,  baseMem:2.2,  disk:0,   net:0,   type:'windows',    pid:396,  status:'Running' },
];

const STARTUP_ITEMS = [
  { name:'Windows Defender',   publisher:'Microsoft Corporation', status:'Enabled',  impact:'Low',    icon:'icons/computer.png' },
  { name:'Windows 8 Web OS',   publisher:'nx4real / Neel Patel',  status:'Enabled',  impact:'High',   icon:'icons/computer.png' },
  { name:'Search Indexer',     publisher:'Microsoft Corporation', status:'Enabled',  impact:'Medium', icon:'icons/computer.png' },
  { name:'Adobe Reader',       publisher:'Adobe Systems',         status:'Disabled', impact:'High',   icon:'icons/file-text.png' },
  { name:'Skype',              publisher:'Microsoft Corporation', status:'Disabled', impact:'Medium', icon:'icons/skype.png' },
  { name:'OneDrive',           publisher:'Microsoft Corporation', status:'Disabled', impact:'Low',    icon:'icons/skydrive.png' },
];

/* ════════════════════════════════════════════════════════════
   DETECT OPEN APPS — now detects all apps
   ════════════════════════════════════════════════════════════ */
function tmDetectOpenApps() {
  const checks = [
    ['This PC',           () => !!(document.getElementById('thispcWindow')   && document.getElementById('thispcWindow').style.display   !== 'none')],
    ['Notepad',           () => !!(document.getElementById('notepadWindow')  && document.getElementById('notepadWindow').style.display  !== 'none')],
    ['Command Prompt',    () => !!(document.getElementById('termWindow')     && document.getElementById('termWindow').style.display     !== 'none')],
    ['Internet Explorer', () => !!(document.getElementById('ieWindow')       && document.getElementById('ieWindow').style.display       !== 'none')],
    ['PC Settings',       () => !!(document.getElementById('settingsWindow') && document.getElementById('settingsWindow').classList.contains('open'))],
    ['Weather',           () => !!(document.getElementById('weatherWindow')  && document.getElementById('weatherWindow').style.display  !== 'none')],
    ['Maps',              () => !!(document.getElementById('mapsWindow')     && document.getElementById('mapsWindow').style.display     !== 'none')],
    ['PDF Viewer',        () => !!(document.getElementById('pdfWindow')      && document.getElementById('pdfWindow').style.display      !== 'none')],
  ];
  const apps = checks.filter(([, fn]) => fn()).map(([name]) => name);
  apps.push('Task Manager');
  TM.openApps = apps;
  return apps;
}

function tmBuildAppProcesses() {
  return tmDetectOpenApps().map((name, i) => ({
    name    : APP_EXE_MAP[name]  || (name.toLowerCase().replace(/ /g,'') + '.exe'),
    desc    : name,
    icon    : APP_ICON_MAP[name] || 'icons/computer.png',
    baseCpu : APP_CPU_MAP[name]  || (0.5 + i * 0.2),
    baseMem : APP_MEM_MAP[name]  || (24 + i * 8),
    disk    : parseFloat((Math.random() * 0.8).toFixed(1)),
    net     : name === 'Internet Explorer' || name === 'Maps' || name === 'Weather' ? parseFloat((Math.random()*2+0.5).toFixed(1)) : 0,
    type    : 'app',
    pid     : 3200 + i * 80,
    appName : name,
    status  : TM.suspendedPids.has(3200 + i * 80) ? 'Suspended' : 'Running',
  }));
}

function tmGetAllProcesses() {
  return [...tmBuildAppProcesses(), ...BG_PROCESSES];
}

function tmFlicker(base, variance) {
  return Math.max(0, base + (Math.random() - 0.5) * variance);
}

/* ════════════════════════════════════════════════════════════
   OPEN / CLOSE
   ════════════════════════════════════════════════════════════ */
function openTaskManager() {
  const existing = document.getElementById('tmWindow');
  if (existing) { if (TM.isMin) tmRestore(); return; }
  TM.open = true;
  TM.uptimeStart = Date.now() - Math.floor(Math.random() * 3600000);
  buildTMWindow();
  tmInjectTaskbar();
  tmSetupDrag();
  tmSetupResize();
  tmBuildProcessCtx();
  tmSwitchTab('processes');
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
  el.id = 'tbTaskMgr'; el.title = 'Task Manager';
  el.innerHTML = `<span>⚙ Task Manager</span>`;
  el.onclick = tmToggleFromTaskbar;
  el.oncontextmenu = e => {
    e.preventDefault(); e.stopPropagation();
    if (typeof showTaskbarAppCtx === 'function') showTaskbarAppCtx(e, 'Task Manager', false);
  };
  tbLeft.appendChild(el);
}

/* ════════════════════════════════════════════════════════════
   BUILD WINDOW DOM
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
  <div class="tm-menu-item" onclick="notify('Always on top','Task Manager')">Options</div>
  <div class="tm-menu-item" onclick="tmSwitchTab(TM.activeTab)">View</div>
</div>
<div class="tm-tabbar">
  <div class="tm-tab active" id="tmTab-processes"   onclick="tmSwitchTab('processes')">Processes</div>
  <div class="tm-tab"        id="tmTab-performance" onclick="tmSwitchTab('performance')">Performance</div>
  <div class="tm-tab"        id="tmTab-details"     onclick="tmSwitchTab('details')">App details</div>
  <div class="tm-tab"        id="tmTab-startup"     onclick="tmSwitchTab('startup')">Startup</div>
  <div class="tm-tab"        id="tmTab-users"       onclick="tmSwitchTab('users')">Users</div>
</div>
<div class="tm-content" id="tmContent"></div>
<div class="tm-statusbar" id="tmStatusbar">
  <div class="tm-status-item"><div class="tm-status-dot green"></div><span id="tmStatusProcs">0 processes</span></div>
  <div class="tm-status-item">CPU: <span id="tmStatusCPU">0%</span></div>
  <div class="tm-status-item">Memory: <span id="tmStatusMem">0 GB</span></div>
  <div class="tm-status-item">Uptime: <span id="tmStatusUptime">0:00:00</span></div>
</div>
<div class="tm-resize" id="tmResizeHandle"></div>`;
  document.body.appendChild(win);
  document.getElementById('tmTitleBar').addEventListener('dblclick', tmMaximise);

  /* Ctrl+Shift+Esc to open/focus */
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'Escape') { e.preventDefault(); openTaskManager(); }
  });

  /* uptime ticker */
  setInterval(tmTickUptime, 1000);
}

function tmTickUptime() {
  const el = document.getElementById('tmStatusUptime');
  if (!el) return;
  const s   = Math.floor((Date.now() - TM.uptimeStart) / 1000);
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  el.textContent = `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

/* ════════════════════════════════════════════════════════════
   TAB SWITCHING
   ════════════════════════════════════════════════════════════ */
function tmSwitchTab(tab) {
  TM.activeTab = tab;
  document.querySelectorAll('.tm-tab').forEach(t => t.classList.remove('active'));
  const tabEl = document.getElementById('tmTab-' + tab);
  if (tabEl) tabEl.classList.add('active');
  clearInterval(TM.updateTimer);
  clearInterval(TM.perfTimer);
  TM.updateTimer = null; TM.perfTimer = null;

  if      (tab === 'processes')   { tmRenderProcesses();   TM.updateTimer = setInterval(tmUpdateProcesses, 1500); }
  else if (tab === 'performance') { tmRenderPerformance(); tmStartPerfLoop(); }
  else if (tab === 'details')     { tmRenderDetails();     TM.updateTimer = setInterval(tmUpdateDetails, 2000); }
  else if (tab === 'startup')     { tmRenderStartup(); }
  else if (tab === 'users')       { tmRenderUsers(); }
}

/* ════════════════════════════════════════════════════════════
   ██████  PROCESSES TAB  ██████
   ════════════════════════════════════════════════════════════ */
function tmRenderProcesses() {
  const content = document.getElementById('tmContent');
  if (!content) return;
  content.innerHTML = `
  <div id="tmProcessPage">
    <!-- Search / filter bar -->
    <div style="padding:6px 10px;background:#f8f8f8;border-bottom:1px solid #e0e0e0;display:flex;align-items:center;gap:8px">
      <span style="font-size:13px;color:#888">&#x1F50D;</span>
      <input id="tmFilter" type="text" placeholder="Filter processes…"
             style="flex:1;border:1px solid #ccc;padding:3px 8px;font-size:12px;outline:none;font-family:inherit"
             oninput="tmApplyFilter(this.value)">
      <span id="tmFilterClear" style="cursor:pointer;font-size:14px;color:#aaa;display:none"
            onclick="tmClearFilter()">&#x2715;</span>
    </div>
    <!-- Column headers -->
    <div class="tm-proc-header" style="grid-template-columns:1fr 70px 90px 70px 80px 80px">
      <div class="tm-proc-header-cell sorted" id="tmHdr-name"   onclick="tmSort('name')">Name<span class="tm-col-arrow" id="tmArrow-name">&#x2193;</span></div>
      <div class="tm-proc-header-cell"        id="tmHdr-status" onclick="tmSort('status')">Status<span class="tm-col-arrow" id="tmArrow-status"></span></div>
      <div class="tm-proc-header-cell"        id="tmHdr-cpu"    onclick="tmSort('cpu')">CPU<span class="tm-col-arrow" id="tmArrow-cpu"></span></div>
      <div class="tm-proc-header-cell"        id="tmHdr-mem"    onclick="tmSort('mem')">Memory<span class="tm-col-arrow" id="tmArrow-mem"></span></div>
      <div class="tm-proc-header-cell"        id="tmHdr-disk"   onclick="tmSort('disk')">Disk<span class="tm-col-arrow" id="tmArrow-disk"></span></div>
      <div class="tm-proc-header-cell"        id="tmHdr-net"    onclick="tmSort('net')">Network<span class="tm-col-arrow" id="tmArrow-net"></span></div>
    </div>
    <div class="tm-proc-list" id="tmProcList"></div>
  </div>
  <button class="tm-end-task-btn" id="tmEndTaskBtn" disabled onclick="tmEndSelected()">End Task</button>`;
  tmPopulateProcessList();
}

function tmApplyFilter(val) {
  TM.filterText = val.toLowerCase();
  const clearBtn = document.getElementById('tmFilterClear');
  if (clearBtn) clearBtn.style.display = val ? '' : 'none';
  tmPopulateProcessList();
}

function tmClearFilter() {
  TM.filterText = '';
  const inp = document.getElementById('tmFilter');
  if (inp) inp.value = '';
  const clearBtn = document.getElementById('tmFilterClear');
  if (clearBtn) clearBtn.style.display = 'none';
  tmPopulateProcessList();
}

function tmPopulateProcessList() {
  const list = document.getElementById('tmProcList');
  if (!list) return;
  const all  = tmGetAllProcesses();
  const apps = all.filter(p => p.type === 'app');
  const bg   = all.filter(p => p.type === 'background');
  const win  = all.filter(p => p.type === 'windows');

  let totalCPU = 0, totalMem = 0;
  all.forEach(p => { totalCPU += parseFloat(p.baseCpu); totalMem += p.baseMem; });

  list.innerHTML = '';
  const filter = TM.filterText;
  tmRenderGroup(list, 'Apps', apps.filter(p => !filter || p.name.toLowerCase().includes(filter) || p.desc.toLowerCase().includes(filter)), true);
  tmRenderGroup(list, 'Background processes', bg.filter(p => !filter || p.name.toLowerCase().includes(filter) || p.desc.toLowerCase().includes(filter)), false);
  tmRenderGroup(list, 'Windows processes', win.filter(p => !filter || p.name.toLowerCase().includes(filter) || p.desc.toLowerCase().includes(filter)), false);

  const sCPU = document.getElementById('tmStatusCPU');
  const sMem = document.getElementById('tmStatusMem');
  const sProcs = document.getElementById('tmStatusProcs');
  if (sCPU)   sCPU.textContent   = Math.min(99, totalCPU).toFixed(1) + '%';
  if (sMem)   sMem.textContent   = (totalMem / 1024).toFixed(1) + ' GB';
  if (sProcs) sProcs.textContent = all.length + ' processes';
}

function tmRenderGroup(container, label, procs, expanded) {
  if (!procs.length) return;
  const groupId = 'tmGroup-' + label.replace(/ /g,'_');
  const grp = document.createElement('div');
  grp.className = 'tm-proc-group';
  grp.id = groupId;
  grp.innerHTML = `<span class="tm-group-arrow ${expanded?'':'collapsed'}" id="${groupId}-arrow">&#x25BC;</span>${label} (${procs.length})`;
  grp.onclick = () => tmToggleGroup(groupId);
  container.appendChild(grp);

  const rows = document.createElement('div');
  rows.id = groupId + '-rows';
  rows.style.display = expanded ? '' : 'none';

  procs.forEach(p => {
    const isSuspended = TM.suspendedPids.has(p.pid);
    const cpu  = isSuspended ? 0 : parseFloat(tmFlicker(p.baseCpu,  p.baseCpu  * .4).toFixed(1));
    const mem  = parseFloat(tmFlicker(p.baseMem,  p.baseMem  * .04).toFixed(1));
    const disk = parseFloat(tmFlicker(p.disk,     p.disk     * .5 ).toFixed(1));
    const net  = parseFloat(tmFlicker(p.net,      p.net      * .6 ).toFixed(1));
    const cpuCls = cpu > 20 ? 'high' : cpu > 5 ? 'medium' : '';
    const memCls = mem > 400 ? 'high' : mem > 150 ? 'medium' : '';
    const status = isSuspended ? 'Suspended' : 'Running';
    const statusColor = isSuspended ? '#e07000' : '#00a300';

    const row = document.createElement('div');
    row.className = 'tm-proc-row';
    row.style.gridTemplateColumns = '1fr 70px 90px 70px 80px 80px';
    row.dataset.name = p.name;
    row.dataset.pid  = p.pid;
    row.dataset.app  = p.appName || '';
    if (isSuspended) row.style.opacity = '.6';

    row.innerHTML = `
      <div class="tm-proc-cell">
        <img class="tm-proc-icon" src="${p.icon}" onerror="this.style.display='none'" alt="">
        <div><div class="tm-proc-name">${p.name}</div>${p.desc?`<div class="tm-proc-desc">${p.desc}</div>`:''}</div>
      </div>
      <div class="tm-proc-cell" style="font-size:11px;color:${statusColor}">${status}</div>
      <div class="tm-proc-cell">
        <div class="tm-usage-cell">
          <span class="tm-usage-val ${cpuCls}">${cpu.toFixed(1)}%</span>
          <div class="tm-usage-bar-wrap"><div class="tm-usage-bar tm-bar-cpu" style="width:${Math.min(100,cpu*2)}%"></div></div>
        </div>
      </div>
      <div class="tm-proc-cell">
        <div class="tm-usage-cell">
          <span class="tm-usage-val ${memCls}">${mem.toFixed(1)} MB</span>
          <div class="tm-usage-bar-wrap"><div class="tm-usage-bar tm-bar-mem" style="width:${Math.min(100,mem/2048*100)}%"></div></div>
        </div>
      </div>
      <div class="tm-proc-cell">
        <div class="tm-usage-cell">
          <span class="tm-usage-val">${disk.toFixed(1)} MB/s</span>
          <div class="tm-usage-bar-wrap"><div class="tm-usage-bar tm-bar-disk" style="width:${Math.min(100,disk*10)}%"></div></div>
        </div>
      </div>
      <div class="tm-proc-cell">
        <div class="tm-usage-cell">
          <span class="tm-usage-val">${net.toFixed(1)} Mbps</span>
          <div class="tm-usage-bar-wrap"><div class="tm-usage-bar tm-bar-net" style="width:${Math.min(100,net*15)}%"></div></div>
        </div>
      </div>`;

    row.onclick = e => tmSelectRow(row, p);
    row.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); tmSelectRow(row, p); tmShowProcCtx(e.clientX, e.clientY, p); };
    rows.appendChild(row);
  });
  container.appendChild(rows);
}

function tmToggleGroup(groupId) {
  const rows  = document.getElementById(groupId + '-rows');
  const arrow = document.getElementById(groupId + '-arrow');
  if (!rows) return;
  const collapsed = rows.style.display === 'none';
  rows.style.display = collapsed ? '' : 'none';
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
  tmPopulateProcessList();
  if (TM.selectedRow) {
    const row = document.querySelector(`.tm-proc-row[data-pid="${TM.selectedRow.pid}"]`);
    if (row) { row.classList.add('selected'); const btn = document.getElementById('tmEndTaskBtn'); if (btn) btn.disabled = false; }
  }
}

function tmEndSelected() {
  if (!TM.selectedRow) return;
  const proc = TM.selectedRow;
  const row  = document.querySelector(`.tm-proc-row[data-pid="${proc.pid}"]`);
  if (row) { row.classList.add('terminating'); setTimeout(() => row.remove(), 400); }

  const appName = proc.appName || proc.desc;
  setTimeout(() => {
    if (appName === 'This PC'            && typeof closePC          === 'function') closePC();
    if (appName === 'Notepad'            && typeof npClose          === 'function') npClose();
    if (appName === 'Command Prompt'     && typeof termClose        === 'function') termClose();
    if (appName === 'Internet Explorer'  && typeof ieClose          === 'function') ieClose();
    if (appName === 'PC Settings'        && typeof closeSettings    === 'function') closeSettings();
    if (appName === 'Weather'            && typeof wxClose          === 'function') wxClose();
    if (appName === 'Maps'               && typeof mpClose          === 'function') mpClose();
    if (appName === 'PDF Viewer'         && typeof pdfClose         === 'function') pdfClose();
    if (appName === 'Task Manager')                                                  tmClose();
  }, 450);

  TM.selectedRow = null;
  const btn = document.getElementById('tmEndTaskBtn');
  if (btn) btn.disabled = true;
  if (typeof notify === 'function') notify(`"${proc.name}" terminated`, 'Task Manager');
}

/* ════════════════════════════════════════════════════════════
   ██████  APP DETAILS TAB  ██████
   ════════════════════════════════════════════════════════════ */
function tmRenderDetails() {
  const content = document.getElementById('tmContent');
  if (!content) return;
  content.innerHTML = `
  <div style="height:100%;display:flex;flex-direction:column;overflow:hidden">
    <div style="display:grid;grid-template-columns:1fr 80px 90px 70px 80px 80px 70px;background:#f5f5f5;border-bottom:1px solid #ddd;flex-shrink:0">
      ${['Name','PID','CPU','Memory','Disk','Network','Status'].map(h =>
        `<div class="tm-proc-header-cell" style="font-size:11px">${h}</div>`).join('')}
    </div>
    <div style="flex:1;overflow-y:auto" id="tmDetailsList"></div>
  </div>`;
  tmPopulateDetails();
}

function tmPopulateDetails() {
  const list = document.getElementById('tmDetailsList');
  if (!list) return;
  const all = tmGetAllProcesses();
  list.innerHTML = all.map(p => {
    const isSusp = TM.suspendedPids.has(p.pid);
    const cpu    = isSusp ? 0 : tmFlicker(p.baseCpu, p.baseCpu*.4).toFixed(1);
    const mem    = tmFlicker(p.baseMem, p.baseMem*.03).toFixed(1);
    const disk   = tmFlicker(p.disk, p.disk*.5).toFixed(1);
    const net    = tmFlicker(p.net,  p.net*.6 ).toFixed(1);
    const sc     = isSusp ? '#e07000' : '#222';
    return `<div style="display:grid;grid-template-columns:1fr 80px 90px 70px 80px 80px 70px;border-bottom:1px solid #f5f5f5;cursor:pointer;transition:background .1s"
                 onmouseover="this.style.background='#e8f4fc'" onmouseout="this.style.background=''">
      <div class="tm-proc-cell" style="gap:6px">
        <img src="${p.icon}" style="width:14px;height:14px;object-fit:contain" onerror="this.style.display='none'">
        <span style="font-size:12px;color:#222">${p.name}</span>
      </div>
      <div class="tm-proc-cell"><span style="font-size:11px;color:#888">${p.pid}</span></div>
      <div class="tm-proc-cell"><span style="font-size:12px;color:${parseFloat(cpu)>20?'#e81123':parseFloat(cpu)>5?'#d08000':'#222'}">${cpu}%</span></div>
      <div class="tm-proc-cell"><span style="font-size:12px;color:#222">${mem} MB</span></div>
      <div class="tm-proc-cell"><span style="font-size:12px;color:#222">${disk} MB/s</span></div>
      <div class="tm-proc-cell"><span style="font-size:12px;color:#222">${net} Mbps</span></div>
      <div class="tm-proc-cell"><span style="font-size:11px;color:${sc}">${isSusp?'Suspended':'Running'}</span></div>
    </div>`;
  }).join('');
}

function tmUpdateDetails() {
  if (TM.activeTab !== 'details') return;
  tmPopulateDetails();
}

/* ════════════════════════════════════════════════════════════
   ██████  STARTUP TAB  ██████
   ════════════════════════════════════════════════════════════ */
function tmRenderStartup() {
  const content = document.getElementById('tmContent');
  if (!content) return;

  const impactColor = { High:'#e81123', Medium:'#d08000', Low:'#00a300' };

  content.innerHTML = `
  <div style="height:100%;display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:8px 12px;font-size:12px;color:#666;background:#f9f9f9;border-bottom:1px solid #e0e0e0;flex-shrink:0">
      These programs run automatically when Windows starts. Disabling startup items can improve boot time.
      <span style="color:#0078d7;cursor:pointer;margin-left:8px" onclick="notify('Last BIOS time: 3.2s','Startup')">Last BIOS time: 3.2s</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 160px 80px 80px;background:#f5f5f5;border-bottom:1px solid #ddd;flex-shrink:0">
      ${['Name','Publisher','Status','Startup impact'].map(h =>
        `<div class="tm-proc-header-cell" style="font-size:11px">${h}</div>`).join('')}
    </div>
    <div style="flex:1;overflow-y:auto">
      ${STARTUP_ITEMS.map((item, i) => `
        <div style="display:grid;grid-template-columns:1fr 160px 80px 80px;border-bottom:1px solid #f0f0f0;cursor:pointer;transition:background .1s"
             onmouseover="this.style.background='#e8f4fc'" onmouseout="this.style.background=''"
             oncontextmenu="event.preventDefault();tmStartupCtx(event,${i})">
          <div class="tm-proc-cell" style="gap:8px">
            <img src="${item.icon}" style="width:16px;height:16px;object-fit:contain" onerror="this.style.display='none'">
            <span style="font-size:13px;color:#222">${item.name}</span>
          </div>
          <div class="tm-proc-cell"><span style="font-size:12px;color:#555">${item.publisher}</span></div>
          <div class="tm-proc-cell">
            <span style="font-size:12px;font-weight:600;color:${item.status==='Enabled'?'#00a300':'#888'}">${item.status}</span>
          </div>
          <div class="tm-proc-cell">
            <span style="font-size:12px;color:${impactColor[item.impact]||'#555'}">${item.impact}</span>
          </div>
        </div>`).join('')}
    </div>
  </div>`;
}

function tmStartupCtx(e, idx) {
  const item = STARTUP_ITEMS[idx];
  if (!item) return;
  const isEnabled = item.status === 'Enabled';
  if (typeof notify === 'function') {
    const msg = isEnabled ? `"${item.name}" disabled` : `"${item.name}" enabled`;
    item.status = isEnabled ? 'Disabled' : 'Enabled';
    notify(msg + ' (takes effect on next boot)', 'Startup');
    tmRenderStartup();
  }
}

/* ════════════════════════════════════════════════════════════
   ██████  USERS TAB  ██████
   ════════════════════════════════════════════════════════════ */
function tmRenderUsers() {
  const content = document.getElementById('tmContent');
  if (!content) return;
  const all = tmGetAllProcesses();
  const appCount = all.filter(p => p.type === 'app').length;

  content.innerHTML = `
  <div style="height:100%;display:flex;flex-direction:column;overflow-y:auto">
    <!-- User row -->
    <div style="display:flex;align-items:center;gap:14px;padding:16px;border-bottom:1px solid #e0e0e0;background:#fafafa">
      <img src="user.png" onerror="this.src='icons/computer.png'"
           style="width:48px;height:48px;border-radius:2px;object-fit:cover;border:2px solid #e0e0e0">
      <div style="flex:1">
        <div style="font-size:15px;font-weight:600;color:#222">Neel Patel</div>
        <div style="font-size:12px;color:#888;margin-top:2px">nx4real · Local Account · Administrator</div>
        <div style="font-size:11px;color:#0078d7;margin-top:4px">${appCount} app${appCount!==1?'s':''} running · Connected</div>
      </div>
      <button onclick="notify('User already active','Users')"
        style="padding:5px 14px;background:#0078d7;border:none;color:#fff;font-size:12px;cursor:pointer;font-family:inherit">
        Disconnect
      </button>
    </div>

    <!-- Resource stats for user -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px;border-bottom:1px solid #e0e0e0">
      ${[
        ['CPU',     TM.live.cpu.toFixed(1)+'%',  '#0078d7'],
        ['Memory',  TM.live.mem.toFixed(1)+' GB','#7700cc'],
        ['Disk',    TM.live.disk.toFixed(0)+'%', '#00b050'],
        ['Network', TM.live.net.toFixed(1)+' Mbps','#e07000'],
      ].map(([label, val, color]) => `
        <div style="background:#f8f8f8;border:1px solid #e0e0e0;padding:12px">
          <div style="font-size:11px;color:#888;margin-bottom:4px">${label}</div>
          <div style="font-size:20px;font-weight:200;color:${color}">${val}</div>
        </div>`).join('')}
    </div>

    <!-- Open apps list for this user -->
    <div style="padding:12px 16px">
      <div style="font-size:11px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">
        Running Applications (${appCount})
      </div>
      ${all.filter(p => p.type==='app').map(p => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f5">
          <img src="${p.icon}" style="width:18px;height:18px;object-fit:contain" onerror="this.style.display='none'">
          <div style="flex:1">
            <div style="font-size:13px;color:#222">${p.desc || p.name}</div>
            <div style="font-size:11px;color:#888">${p.name} · PID ${p.pid}</div>
          </div>
          <span style="font-size:11px;color:#00a300">Running</span>
        </div>`).join('')}
    </div>

    <!-- Session info -->
    <div style="padding:12px 16px;margin-top:auto;border-top:1px solid #e0e0e0;background:#f8f8f8">
      <div style="font-size:11px;color:#888;line-height:1.8">
        Session: Console &nbsp;·&nbsp; Logon time: ${new Date(TM.uptimeStart).toLocaleTimeString()} &nbsp;·&nbsp;
        Session ID: 1 &nbsp;·&nbsp; Domain: NX4REAL-PC
      </div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════════════════════════
   ██████  PERFORMANCE TAB  ██████
   ════════════════════════════════════════════════════════════ */
function tmRenderPerformance() {
  const content = document.getElementById('tmContent');
  if (!content) return;
  content.innerHTML = `
  <div id="tmPerfPage">
    <div class="tm-perf-sidebar" id="tmPerfSidebar">
      ${tmPerfSidebarItem('cpu',  'CPU',    '0%',       'Intel Core i7 @ 3.4GHz')}
      ${tmPerfSidebarItem('mem',  'Memory', '0 GB',     '8.0 GB DDR3-1600')}
      ${tmPerfSidebarItem('disk', 'Disk 0', '0%',       'Samsung SSD 120GB')}
      ${tmPerfSidebarItem('net',  'Wi-Fi',  '0 Mbps',   '802.11ac · 5GHz')}
      ${tmPerfSidebarItem('gpu',  'GPU',    '0%',       'Intel HD Graphics 4000')}
    </div>
    <div class="tm-perf-panel" id="tmPerfPanel"></div>
  </div>`;

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
  document.querySelectorAll('.tm-perf-item').forEach(el => el.classList.remove('active'));
  const sideEl = document.getElementById('tmPerfItem-' + resource);
  if (sideEl) sideEl.classList.add('active');

  const panel = document.getElementById('tmPerfPanel');
  if (!panel) return;

  const cfg = {
    cpu  : { title:'CPU',        subtitle:'Intel(R) Core(TM) i7 CPU @ 3.40GHz · 4 Cores · 8 Logical Processors', color:'#0078d7',
             stats:['Utilisation','Speed','Processes','Threads','Handles','Up time'],
             statIds:['cpu-util','cpu-speed','cpu-procs','cpu-threads','cpu-handles','cpu-uptime'] },
    mem  : { title:'Memory',     subtitle:'8.0 GB DDR3 · 2 Slots · 1600 MHz', color:'#7700cc',
             stats:['In use','Available','Committed','Cached','Non-paged pool','Page pool'],
             statIds:['mem-use','mem-avail','mem-commit','mem-cache','mem-npool','mem-ppool'] },
    disk : { title:'Disk 0 (C:)','subtitle':'Samsung SSD 850 EVO 120GB · SATA', color:'#00b050',
             stats:['Active time','Avg response time','Read speed','Write speed','Capacity','Formatted'],
             statIds:['disk-act','disk-resp','disk-read','disk-write','disk-cap','disk-fmt'] },
    net  : { title:'Wi-Fi',      subtitle:'Intel Wireless-AC 7260 · 802.11ac · 5GHz', color:'#e07000',
             stats:['Send','Receive','Total','Signal strength','Connection type','IPv4'],
             statIds:['net-send','net-recv','net-total','net-signal','net-type','net-ip'] },
    gpu  : { title:'GPU',        subtitle:'Intel HD Graphics 4000 · Driver 10.18.10.4252', color:'#c42b1c',
             stats:['GPU utilisation','Dedicated memory','Shared memory','GPU temp','Driver','DirectX'],
             statIds:['gpu-util','gpu-dmem','gpu-smem','gpu-temp','gpu-drv','gpu-dx'] },
  };

  const c = cfg[resource];
  panel.innerHTML = `
    <div>
      <div class="tm-perf-title">${c.title}</div>
      <div class="tm-perf-subtitle">${c.subtitle}</div>
    </div>
    <div class="tm-chart-wrap">
      <canvas id="tmMainChart"></canvas>
      <div class="tm-chart-label-tl">100%</div>
      <div class="tm-chart-label-bl">0%</div>
      <div class="tm-chart-label-tr">60 seconds</div>
    </div>
    <div class="tm-stats-grid">
      ${c.stats.map((s,i) => `
        <div class="tm-stat-box">
          <div class="tm-stat-label">${s}</div>
          <div class="tm-stat-value" id="${c.statIds[i]}">—</div>
        </div>`).join('')}
    </div>`;

  tmDrawMainChart(resource, c.color, 100);
}

function tmDrawMainChart(resource, color, max) {
  const canvas = document.getElementById('tmMainChart');
  if (!canvas) return;
  const wrap = canvas.parentElement;
  canvas.width  = wrap.clientWidth  || 520;
  canvas.height = wrap.clientHeight || 160;
  const ctx = canvas.getContext('2d');
  const data = TM.history[resource];
  const W = canvas.width, H = canvas.height, pad = 2;
  const step = (W - pad*2) / (data.length - 1);

  ctx.clearRect(0, 0, W, H);

  /* grid lines */
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) { const y = pad+(H-pad*2)*i/4; ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(W-pad,y); ctx.stroke(); }
  for (let i = 1; i < 12; i++){ const x = pad+(W-pad*2)*i/12; ctx.beginPath(); ctx.moveTo(x,pad); ctx.lineTo(x,H-pad); ctx.stroke(); }

  /* fill */
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, color + 'aa');
  grad.addColorStop(1, color + '11');
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = pad + i * step;
    const y = H - pad - (v / max) * (H - pad*2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad + (data.length-1)*step, H-pad);
  ctx.lineTo(pad, H-pad);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  /* line */
  ctx.beginPath();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  data.forEach((v, i) => {
    const x = pad + i * step;
    const y = H - pad - (v / max) * (H - pad*2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  /* current value label on right */
  const cur = data[data.length-1];
  const curY = H - pad - (cur / max) * (H - pad*2);
  ctx.fillStyle = color;
  ctx.font = 'bold 11px Consolas, monospace';
  ctx.fillText(cur.toFixed(1) + '%', W - 44, Math.max(14, Math.min(H-4, curY - 4)));
}

function tmDrawMini(id, data, color) {
  const canvas = document.getElementById('tmMini-' + id);
  if (!canvas) return;
  canvas.width = canvas.parentElement?.clientWidth || 140;
  canvas.height = 28;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const step = W / (data.length - 1);
  const maxV = Math.max(...data, 1);
  ctx.clearRect(0, 0, W, H);
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  data.forEach((v, i) => { const x = i*step, y = H-(v/maxV)*H; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.stroke();
}

function tmStartPerfLoop() {
  function nextVal(prev, min, max, drift) {
    return Math.max(min, Math.min(max, prev + (Math.random()-.5)*drift));
  }

  TM.perfTimer = setInterval(() => {
    const L = TM.live;
    L.cpu  = nextVal(L.cpu,  2,  95, 9);
    L.mem  = nextVal(L.mem,  2.8, 7.2, .18);
    L.disk = nextVal(L.disk, 0,  85, 14);
    L.net  = nextVal(L.net,  0,  65, 8);
    L.gpu  = nextVal(L.gpu,  4,  75, 12);

    /* push to history */
    ['cpu','mem','disk','net','gpu'].forEach(r => {
      TM.history[r].push(r==='mem' ? L[r] : L[r]);
      TM.history[r].shift();
    });

    /* sidebar values */
    const sideMap = { cpu:`${L.cpu.toFixed(0)}%`, mem:`${L.mem.toFixed(1)} GB`, disk:`${L.disk.toFixed(0)}%`, net:`${L.net.toFixed(1)} Mbps`, gpu:`${L.gpu.toFixed(0)}%` };
    const colorMap = { cpu:'#0078d7', mem:'#7700cc', disk:'#00b050', net:'#e07000', gpu:'#c42b1c' };
    ['cpu','mem','disk','net','gpu'].forEach(r => {
      const el = document.getElementById('tmSideVal-' + r);
      if (el) el.textContent = sideMap[r];
      tmDrawMini(r, TM.history[r].slice(-20), colorMap[r]);
    });

    /* redraw main chart */
    const c = TM.activePerfResource;
    tmDrawMainChart(c, colorMap[c], c==='mem'?8:100);

    /* update stat boxes */
    const all = tmGetAllProcesses();
    const procs = all.length;
    const threads = Math.floor(procs * 12.8);
    const handles = Math.floor(procs * 42);
    const upStr = tmFormatUptime();

    if (c==='cpu') {
      tmSetStat('cpu-util',    L.cpu.toFixed(1)+'%');
      tmSetStat('cpu-speed',   (2.4+L.cpu/100*.8).toFixed(2)+' GHz');
      tmSetStat('cpu-procs',   String(procs));
      tmSetStat('cpu-threads', String(threads));
      tmSetStat('cpu-handles', String(handles));
      tmSetStat('cpu-uptime',  upStr);
    } else if (c==='mem') {
      tmSetStat('mem-use',    L.mem.toFixed(1)+' GB');
      tmSetStat('mem-avail',  (8-L.mem).toFixed(1)+' GB');
      tmSetStat('mem-commit', (L.mem*1.1).toFixed(1)+' GB / 14.2 GB');
      tmSetStat('mem-cache',  (L.mem*.55).toFixed(1)+' GB');
      tmSetStat('mem-npool',  Math.floor(L.mem*12)+'  MB');
      tmSetStat('mem-ppool',  Math.floor(L.mem*6)+' MB');
    } else if (c==='disk') {
      tmSetStat('disk-act',   L.disk.toFixed(0)+'%');
      tmSetStat('disk-resp',  (Math.random()*8+0.5).toFixed(1)+' ms');
      tmSetStat('disk-read',  (L.disk*.9).toFixed(1)+' MB/s');
      tmSetStat('disk-write', (L.disk*.4).toFixed(1)+' MB/s');
      tmSetStat('disk-cap',   '119 GB');
      tmSetStat('disk-fmt',   '118 GB');
    } else if (c==='net') {
      tmSetStat('net-send',   (L.net*.55).toFixed(1)+' Kbps');
      tmSetStat('net-recv',   (L.net*.45).toFixed(1)+' Kbps');
      tmSetStat('net-total',  L.net.toFixed(1)+' Kbps');
      tmSetStat('net-signal', '▂▄▆█ Excellent');
      tmSetStat('net-type',   '802.11ac · 5GHz');
      tmSetStat('net-ip',     '192.168.1.108');
    } else if (c==='gpu') {
      tmSetStat('gpu-util',   L.gpu.toFixed(0)+'%');
      tmSetStat('gpu-dmem',   (128+L.gpu*.6).toFixed(0)+' MB');
      tmSetStat('gpu-smem',   (L.gpu*22).toFixed(0)+' MB');
      tmSetStat('gpu-temp',   (45+L.gpu*.4).toFixed(0)+'°C');
      tmSetStat('gpu-drv',    '10.18.10.4252');
      tmSetStat('gpu-dx',     'DirectX 11');
    }

    /* update status bar */
    const sCPU = document.getElementById('tmStatusCPU');
    const sMem = document.getElementById('tmStatusMem');
    if (sCPU) sCPU.textContent = L.cpu.toFixed(1)+'%';
    if (sMem) sMem.textContent = L.mem.toFixed(1)+' GB';

  }, 1000);
}

function tmSetStat(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }
function tmFormatUptime() {
  const s = Math.floor((Date.now()-TM.uptimeStart)/1000);
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

/* ════════════════════════════════════════════════════════════
   PROCESS CONTEXT MENU — with Suspend/Resume
   ════════════════════════════════════════════════════════════ */
function tmBuildProcessCtx() {
  if (document.getElementById('tmProcessCtx')) return;
  const menu = document.createElement('div');
  menu.id = 'tmProcessCtx';
  menu.innerHTML = `
    <div class="tm-ctx-item" onclick="tmEndSelected();tmHideCtx()">
      <span style="width:18px;text-align:center;font-size:13px;color:#e81123">&#x2715;</span>
      <b>End Task</b>
    </div>
    <div class="tm-ctx-sep"></div>
    <div class="tm-ctx-item" id="tmCtxSuspend" onclick="tmToggleSuspend();tmHideCtx()">
      <span style="width:18px;text-align:center;font-size:13px">&#x23F8;</span>
      <span id="tmCtxSuspendLabel">Suspend</span>
    </div>
    <div class="tm-ctx-sep"></div>
    <div class="tm-ctx-item" onclick="tmCtxOpenLocation()">
      <span style="width:18px;text-align:center;font-size:13px">&#x1F4C2;</span>Open file location
    </div>
    <div class="tm-ctx-item" onclick="tmCtxSearchOnline()">
      <span style="width:18px;text-align:center;font-size:13px">&#x1F50D;</span>Search online
    </div>
    <div class="tm-ctx-item" onclick="tmCtxProperties()">
      <span style="width:18px;text-align:center;font-size:13px">&#x2139;</span>Properties
    </div>`;
  document.body.appendChild(menu);
  document.addEventListener('click', tmHideCtx);
}

let _tmCtxOpen = false;
function tmShowProcCtx(x, y, proc) {
  const menu = document.getElementById('tmProcessCtx');
  if (!menu) return;

  /* update suspend/resume label */
  const label = document.getElementById('tmCtxSuspendLabel');
  if (label) label.textContent = TM.suspendedPids.has(proc.pid) ? 'Resume' : 'Suspend';

  menu.classList.add('open');
  menu.style.left = x+'px'; menu.style.top = y+'px';
  _tmCtxOpen = true;
  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right  > window.innerWidth)  menu.style.left = (x-r.width)+'px';
    if (r.bottom > window.innerHeight) menu.style.top  = (y-r.height)+'px';
  });
}

function tmHideCtx() { const m=document.getElementById('tmProcessCtx'); if(m) m.classList.remove('open'); _tmCtxOpen=false; }

function tmToggleSuspend() {
  if (!TM.selectedRow) return;
  const pid = TM.selectedRow.pid;
  if (TM.suspendedPids.has(pid)) {
    TM.suspendedPids.delete(pid);
    if (typeof notify === 'function') notify(`"${TM.selectedRow.name}" resumed`, 'Task Manager');
  } else {
    TM.suspendedPids.add(pid);
    if (typeof notify === 'function') notify(`"${TM.selectedRow.name}" suspended`, 'Task Manager');
  }
  tmPopulateProcessList();
}

function tmCtxOpenLocation() {
  tmHideCtx();
  const path = TM.selectedRow?.type === 'app' ? 'C:\\Windows8Web\\apps' : 'C:\\Windows\\System32';
  if (typeof notify === 'function') notify(path, 'File Location');
}

function tmCtxSearchOnline() {
  tmHideCtx();
  if (!TM.selectedRow) return;
  if (typeof openIE === 'function') openIE('search:' + TM.selectedRow.name + ' process Windows');
  else if (typeof notify === 'function') notify('Search: ' + TM.selectedRow.name, 'Task Manager');
}

function tmCtxProperties() {
  tmHideCtx();
  if (!TM.selectedRow) return;
  const p = TM.selectedRow;
  if (typeof notify === 'function')
    notify(`${p.name} · PID: ${p.pid} · ${p.desc || 'System Process'}`, 'Properties');
}

/* ════════════════════════════════════════════════════════════
   DRAG + RESIZE + TASKBAR EMPTY CTX
   ════════════════════════════════════════════════════════════ */
function tmSetupDrag() {
  const tb = document.getElementById('tmTitleBar');
  if (!tb) return;
  tb.addEventListener('mousedown', e => {
    if (e.target.closest('.tm-controls') || TM.isMax) return;
    TM.drag.on = true;
    const win = document.getElementById('tmWindow');
    const r   = win.getBoundingClientRect();
    TM.drag.ox = e.clientX - r.left;
    TM.drag.oy = e.clientY - r.top;
    win.style.transform  = 'none';
    win.style.transition = 'none';
    win.style.left = r.left+'px'; win.style.top = r.top+'px';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!TM.drag.on) return;
    const win = document.getElementById('tmWindow');
    let x = e.clientX - TM.drag.ox, y = e.clientY - TM.drag.oy;
    x = Math.max(-win.offsetWidth+60, Math.min(window.innerWidth-60, x));
    y = Math.max(0, Math.min(window.innerHeight-32, y));
    win.style.left = x+'px'; win.style.top = y+'px';
  });
  document.addEventListener('mouseup', () => { TM.drag.on = false; });
}

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
    if (!win) { TM.resize.on=false; return; }
    win.style.width  = Math.max(520, TM.resize.sw+(e.clientX-TM.resize.sx))+'px';
    win.style.height = Math.max(360, TM.resize.sh+(e.clientY-TM.resize.sy))+'px';
    if (TM.activeTab==='performance') tmDrawMainChart(TM.activePerfResource, {cpu:'#0078d7',mem:'#7700cc',disk:'#00b050',net:'#e07000',gpu:'#c42b1c'}[TM.activePerfResource], 100);
  });
  document.addEventListener('mouseup', () => { TM.resize.on = false; });
}

/* ── TASKBAR EMPTY RIGHT-CLICK ── */
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
    <div class="ctx-item ctx-disabled"><span class="ctx-icon">&#x1F4CC;</span>Toolbars</div>
    <div class="ctx-item" onclick="if(typeof diAutoArrange==='function')diAutoArrange();hideTaskbarCtx()">
      <span class="ctx-icon">&#x1F5A5;</span>Show the desktop
    </div>
    <div class="ctx-sep"></div>
    <div class="ctx-item ctx-disabled"><span class="ctx-icon">&#x1F4CB;</span>Properties</div>`;
  document.body.appendChild(menu);
}

function showTaskbarEmptyCtx(e) {
  e.preventDefault(); e.stopPropagation();
  buildTaskbarEmptyCtx();
  const menu = document.getElementById('taskbarEmptyCtx');
  if (!menu) return;
  menu.style.display = 'block';
  menu.style.left    = e.clientX+'px';
  menu.style.bottom  = '50px';
  menu.style.top     = 'auto';
  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right > window.innerWidth) menu.style.left = (e.clientX-r.width)+'px';
  });
  document.addEventListener('click', hideTaskbarCtx, { once:true });
}

function hideTaskbarCtx() {
  const menu = document.getElementById('taskbarEmptyCtx');
  if (menu) menu.style.display = 'none';
}
