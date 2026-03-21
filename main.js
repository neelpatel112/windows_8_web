'use strict';

let startOpen  = false;
let toastTimer = null;
let charmsTimer= null;

/* ── BOOT ── */
window.addEventListener('load', () => {
  const boot = document.getElementById('bootScreen');
  setTimeout(() => {
    boot.style.transition = 'opacity .5s ease';
    boot.style.opacity    = '0';
    setTimeout(() => boot.remove(), 600);
  }, 2300);
});

/* ── LOCK ── */
(function() {
  const lock = document.getElementById('lockScreen');
  if (!lock) return;
  let used = false;
  function unlock() {
    if (used) return; used = true;
    lock.classList.add('touched');
    setTimeout(() => {
      lock.classList.remove('touched');
      lock.classList.add('unlock');
      setTimeout(() => notify('Welcome back, User', 'Windows 8'), 500);
    }, 190);
  }
  lock.addEventListener('click',      unlock);
  lock.addEventListener('touchstart', () => lock.classList.add('touched'), { passive: true });
  lock.addEventListener('touchend',   unlock, { passive: true });
})();

/* ── CLOCK ── */
function q(sel) { return document.querySelector(sel); }

function tick() {
  const now = new Date();
  const hm  = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const ds  = now.toLocaleDateString('en-US',  { month: 'numeric', day: 'numeric', year: 'numeric' });
  const dl  = now.toLocaleDateString('en-US',  { weekday: 'long', month: 'long', day: 'numeric' });
  if (q('#tbTime'))   q('#tbTime').textContent   = hm;
  if (q('#tbDate'))   q('#tbDate').textContent   = ds;
  if (q('#lockTime')) q('#lockTime').textContent = hm;
  if (q('#lockDate')) q('#lockDate').textContent = dl;
  if (q('#charmTime'))q('#charmTime').textContent= hm;
  if (q('#calDay'))   q('#calDay').textContent   = now.getDate();
  if (q('#calMonth')) q('#calMonth').textContent = now.toLocaleDateString('en-US', { month: 'long' });
}
tick();
setInterval(tick, 1000);

/* ── TOAST ── */
function notify(msg, title) {
  const toast = q('#toast');
  const msgEl = q('#toastMsg');
  const titEl = q('.toast-title');
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  if (titEl) titEl.textContent = title || 'Windows 8';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ═══════════════════════════════════════════════════════════
   TILE SIZING
   Calculates a unit size (sz) from the actual available height
   of the metro area, then stamps real pixel values onto every
   grid and tile. No CSS variables, no min(), no calc() tricks.
   ═══════════════════════════════════════════════════════════ */
function sizeTiles() {
  const metro = q('#ssMetro');
  if (!metro) return;

  // available height = metro's own clientHeight
  const avail = metro.clientHeight;

  // 4 rows + 3 gaps of 5px each — divide by 5.2 to get medium sized tiles
  const sz = Math.floor((avail - 3 * 5 - 20) / 5.2);
  const g  = 5;

  // stamp sizes on every .tg-grid and its tiles
  // Grid A: 2 cols × 2 rows → Mail 2x2
  setGrid('gridA', 2, 2, sz, g);
  // Grid B: 4 cols × 4 rows
  setGrid('gridB', 4, 4, sz, g);
  // Grid C: 4 cols × 4 rows
  setGrid('gridC', 4, 4, sz, g);
  // Grid D: 2 cols × 4 rows
  setGrid('gridD', 2, 4, sz, g);
  // Grid E: 2 cols × 4 rows
  setGrid('gridE', 2, 4, sz, g);

  // also size the big weather + bing icons
  const wxIcon   = document.getElementById('wxIcon');
  const bingIcon = document.getElementById('bingIcon');
  if (wxIcon)   { wxIcon.style.width   = Math.round(sz * .42) + 'px'; wxIcon.style.height   = wxIcon.style.width; }
  if (bingIcon) { bingIcon.style.width = Math.round(sz * .42) + 'px'; bingIcon.style.height = bingIcon.style.width; }

  // size tile-icon images by tile size
  document.querySelectorAll('.tg-grid .tile-icon img').forEach(img => {
    const tile = img.closest('.tile');
    if (!tile) return;
    const w = tile.offsetWidth;
    const s = Math.round(w > sz * 1.5 ? sz * .42 : sz * .28);
    img.style.width  = s + 'px';
    img.style.height = s + 'px';
  });
}

function setGrid(id, cols, rows, sz, g) {
  const grid = document.getElementById(id);
  if (!grid) return;
  const colW = sz;
  const rowH = sz;
  grid.style.gridTemplateColumns = `repeat(${cols}, ${colW}px)`;
  grid.style.gridTemplateRows    = `repeat(${rows}, ${rowH}px)`;
}

/* ── START SCREEN ── */
function toggleStart() {
  startOpen = !startOpen;
  const ss  = q('#startScreen');
  const btn = q('#startBtn');

  if (startOpen) {
    ss.classList.add('active');
    btn && btn.classList.add('active');
    closeAllPanels();
    // size tiles after the screen is visible
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        sizeTiles();
        // stagger columns in
        const cols = ss.querySelectorAll('.tg');
        cols.forEach((col, i) => {
          col.classList.remove('tg-in');
          col.style.transitionDelay = '0ms';
          requestAnimationFrame(() => requestAnimationFrame(() => {
            col.style.transitionDelay = (i * 80) + 'ms';
            col.classList.add('tg-in');
          }));
        });
      });
    });
  } else {
    ss.classList.remove('active');
    btn && btn.classList.remove('active');
    closePowerMenu();
    const cols = ss.querySelectorAll('.tg');
    cols.forEach(col => {
      col.classList.remove('tg-in');
      col.style.transitionDelay = '0ms';
    });
  }
}

// resize tiles if window resizes while start screen is open
window.addEventListener('resize', () => { if (startOpen) sizeTiles(); });

// close start on Escape or desktop click
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (startOpen) toggleStart(); hideShutdown(); }
});
document.getElementById('desktop').addEventListener('click', () => {
  if (startOpen) toggleStart();
});

/* ── POWER DROPDOWN ── */
function togglePowerMenu(e) {
  e.stopPropagation();
  q('#powerMenu').classList.toggle('open');
}
function closePowerMenu() {
  const m = q('#powerMenu');
  if (m) m.classList.remove('open');
}
document.addEventListener('click', e => {
  const m = q('#powerMenu');
  if (m && m.classList.contains('open')) {
    if (!m.contains(e.target) && !q('.ss-user').contains(e.target)) {
      m.classList.remove('open');
    }
  }
});

/* ── TILE OPEN ── */
function tileOpen(tile, name) {
  tile.style.filter = 'brightness(1.7)';
  setTimeout(() => { tile.style.filter = ''; }, 120);
  notify('Opening ' + name + '…', name);
  if (startOpen) setTimeout(toggleStart, 220);
}

/* ── LIVE TILE FLIPS ── */
function liveTile(wrapperId, firstMs, cycleMs) {
  const wrap = document.getElementById(wrapperId);
  if (!wrap) return;
  const tile = wrap.closest('.tile');
  if (!tile) return;
  function flip() {
    tile.classList.add('flipped');
    setTimeout(() => tile.classList.remove('flipped'), cycleMs - 1200);
  }
  setTimeout(() => { flip(); setInterval(flip, cycleMs); }, firstMs);
}
liveTile('mailFlip',  3200, 6500);
liveTile('calFlip',   5000, 8200);
liveTile('wxFlip',    7000, 10000);
liveTile('musicFlip', 4200, 7400);
liveTile('newsFlip',  6200, 9600);
liveTile('bingFlip',  8000, 11000);

/* ── CHARMS ── */
document.addEventListener('mousemove', e => {
  const ch = q('#charms');
  if (!ch) return;
  if (e.clientX >= window.innerWidth - 4) {
    clearTimeout(charmsTimer); ch.classList.add('open');
  } else if (e.clientX < window.innerWidth - 80) {
    charmsTimer = setTimeout(() => ch.classList.remove('open'), 350);
  }
});

/* ── SHUTDOWN ── */
function showShutdown() {
  closePowerMenu();
  if (startOpen) toggleStart();
  q('#shutdownOverlay').classList.add('show');
}
function hideShutdown() { q('#shutdownOverlay').classList.remove('show'); }
function doShutdown(action) {
  hideShutdown();
  if (action === 'shutdown') {
    notify('Shutting down…');
    setTimeout(() => {
      document.body.innerHTML =
        '<div style="background:#000;color:#fff;height:100vh;display:flex;flex-direction:column;'+
        'align-items:center;justify-content:center;font-family:Segoe UI,sans-serif;gap:28px">'+
        '<img src="logo.png" style="width:56px;height:56px;object-fit:contain;opacity:.9">'+
        '<p style="font-weight:200;font-size:18px;letter-spacing:1px">Shutting down\u2026</p></div>';
    }, 900);
  } else if (action === 'restart') {
    notify('Restarting…');
    setTimeout(() => location.reload(), 1600);
  } else {
    notify('Going to sleep… click to wake.');
    document.body.style.transition = 'filter 1.2s ease';
    document.body.style.filter     = 'brightness(0)';
    document.addEventListener('click', () => {
      document.body.style.filter = 'brightness(1)';
      setTimeout(() => { document.body.style.transition = ''; document.body.style.filter = ''; }, 1300);
    }, { once: true });
  }
}

/* ── SWIPE UP (mobile) ── */
let ty0 = 0;
document.addEventListener('touchstart', e => { ty0 = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchend',   e => {
  if (ty0 - e.changedTouches[0].clientY > 80 && !startOpen) toggleStart();
}, { passive: true });

/* ════════════════════════════════════════════════════════
   TRAY PANELS
   ════════════════════════════════════════════════════════ */
const PANELS = ['calPanel','volPanel','netPanel','actionPanel','langPanel'];
let activePanel = null;

function togglePanel(id) {
  const el = document.getElementById(id);
  if (!el) return;

  if (el.classList.contains('open')) {
    closeAllPanels();
    return;
  }
  closeAllPanels();
  el.classList.add('open');
  activePanel = id;

  if (id === 'calPanel') renderCalendar();
  if (id === 'volPanel') updateVolumeTrack(document.getElementById('volSlider').value);
}

function closeAllPanels() {
  PANELS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
  activePanel = null;
}

// close panels on click outside
document.addEventListener('click', e => {
  if (!activePanel) return;
  const panel = document.getElementById(activePanel);
  // check if click is on a tray button or inside panel
  const inPanel   = panel && panel.contains(e.target);
  const inTrayBtn = e.target.closest('.tray-btn, .tray-clock');
  if (!inPanel && !inTrayBtn) closeAllPanels();
});

// close panels on start screen open
const _origToggleStart = toggleStart;

/* ── CALENDAR ── */
let calViewDate = new Date();

function renderCalendar() {
  const now    = new Date();
  const y      = calViewDate.getFullYear();
  const m      = calViewDate.getMonth();

  const titleEl = document.getElementById('calPanelTitle');
  const daysEl  = document.getElementById('calDays');
  const timeEl  = document.getElementById('calTimeDisplay');
  if (!titleEl || !daysEl) return;

  titleEl.textContent = calViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // first day of month, total days
  const firstDay = new Date(y, m, 1).getDay(); // 0=Sun
  const totalDays= new Date(y, m + 1, 0).getDate();
  const prevTotal= new Date(y, m, 0).getDate();

  let html = '';
  let cellCount = 0;

  // leading days from prev month
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month">${prevTotal - i}</div>`;
    cellCount++;
  }
  // days of this month
  for (let d = 1; d <= totalDays; d++) {
    const isToday   = (d === now.getDate() && m === now.getMonth() && y === now.getFullYear());
    const dow       = new Date(y, m, d).getDay();
    const classes   = ['cal-day'];
    if (isToday)       classes.push('today');
    if (dow === 0)     classes.push('sunday');
    html += `<div class="${classes.join(' ')}">${d}</div>`;
    cellCount++;
  }
  // trailing days from next month
  const remaining = 42 - cellCount;
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-day other-month">${d}</div>`;
  }
  daysEl.innerHTML = html;

  // live clock in calendar
  updateCalTime();
}

function updateCalTime() {
  const el = document.getElementById('calTimeDisplay');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(() => { if (activePanel === 'calPanel') updateCalTime(); }, 1000);

function calMove(dir) {
  calViewDate.setMonth(calViewDate.getMonth() + dir);
  renderCalendar();
}

/* ── VOLUME ── */
function updateVolume(val) {
  document.getElementById('volPct').textContent = val + '%';
  updateVolumeTrack(val);
}

function updateVolumeTrack(val) {
  const slider = document.getElementById('volSlider');
  if (!slider) return;
  slider.value = val;
  slider.style.background = `linear-gradient(to right, #0078d7 ${val}%, rgba(255,255,255,.2) ${val}%)`;
}

/* ── SHOW DESKTOP ── */
function showDesktopBtn() {
  if (startOpen) toggleStart();
  notify('Showing Desktop', 'Windows 8');
}

/* ── WELCOME ── */
/* ════════════════════════════════════════════════════════
   CONTEXT MENU SYSTEM
   ════════════════════════════════════════════════════════ */

let _activeCtx = null;        // currently open menu id
let _taskbarCtxTarget = null; // which app was right-clicked

/* close every context menu */
function hideAllCtx() {
  document.querySelectorAll('.ctx-menu').forEach(m => m.classList.remove('open'));
  _activeCtx = null;
}

/* position + open a menu, clamped to viewport */
function openCtx(menuId, x, y, openUpward) {
  hideAllCtx();
  const menu = document.getElementById(menuId);
  if (!menu) return;
  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';
  menu.classList.add('open');
  _activeCtx = menuId;

  // clamp so it doesn't go off-screen
  const r = menu.getBoundingClientRect();
  if (r.right  > window.innerWidth)  menu.style.left = (x - r.width)  + 'px';
  if (r.bottom > window.innerHeight) menu.style.top  = (y - r.height) + 'px';
}

/* close on any left-click outside */
document.addEventListener('click', () => hideAllCtx());
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideAllCtx(); });

/* ── DESKTOP RIGHT-CLICK ── */
function showDesktopCtx(e) {
  e.preventDefault();
  e.stopPropagation();
  openCtx('desktopCtx', e.clientX, e.clientY);
}

function desktopCtxView() {
  hideAllCtx();
  notify('Large icons selected', 'View');
}

function desktopRefresh() {
  hideAllCtx();
  /* quick flash to simulate refresh */
  const d = document.getElementById('desktop');
  d.style.transition = 'opacity .15s';
  d.style.opacity = '0.6';
  setTimeout(() => { d.style.opacity = '1'; }, 200);
  notify('Refreshed', 'Desktop');
}

function desktopNewFolder() {
  hideAllCtx();
  notify('New folder created on Desktop', 'Desktop');
}

/* ── DESKTOP ICON RIGHT-CLICK ── */
function showIconCtx(e, type) {
  e.preventDefault();
  e.stopPropagation();
  if (type === 'thispc') {
    openCtx('thisPcIconCtx', e.clientX, e.clientY);
  }
  /* other icons — could add more menus later, for now just suppress default */
}

/* ── TASKBAR APP RIGHT-CLICK ── */
function showTaskbarAppCtx(e, appName, pinned) {
  e.preventDefault();
  e.stopPropagation();
  _taskbarCtxTarget = appName;

  const pinBtn = document.getElementById('tbarCtxPin');
  if (pinBtn) pinBtn.textContent = pinned
    ? '📌 Unpin from taskbar'
    : '📌 Pin to taskbar';

  /* open ABOVE the taskbar */
  const menu = document.getElementById('taskbarAppCtx');
  if (!menu) return;
  hideAllCtx();
  menu.style.left   = e.clientX + 'px';
  menu.style.top    = 'auto';
  menu.style.bottom = '50px';
  menu.classList.add('open');
  _activeCtx = 'taskbarAppCtx';

  /* clamp horizontally */
  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right > window.innerWidth) {
      menu.style.left = (e.clientX - r.width) + 'px';
    }
  });
}

function taskbarCtxPin() {
  hideAllCtx();
  notify(_taskbarCtxTarget + ' pinned to taskbar', 'Taskbar');
}

function taskbarCtxClose() {
  hideAllCtx();
  /* if it's the This PC window, actually close it */
  if (_taskbarCtxTarget === 'This PC' && typeof closePC === 'function') {
    closePC();
  } else {
    notify(_taskbarCtxTarget + ' closed', _taskbarCtxTarget);
  }
}

/* ════════════════════════════════════════════════════════
   SYSTEM PROPERTIES WINDOW
   ════════════════════════════════════════════════════════ */
function openSystemProperties() {
  hideAllCtx();
  const win = document.getElementById('sysPropWindow');
  if (!win) return;
  win.style.display = 'flex';
  win.style.animation = 'none';
  void win.offsetWidth; // reflow
  win.style.animation = '';

  /* make it draggable by titlebar */
  const tb = document.getElementById('sysPropTitleBar');
  if (tb && !tb._dragSetup) {
    tb._dragSetup = true;
    let dx = 0, dy = 0, dragging = false;
    tb.addEventListener('mousedown', e => {
      if (e.target.closest('.win-controls')) return;
      dragging = true;
      const r = win.getBoundingClientRect();
      dx = e.clientX - r.left;
      dy = e.clientY - r.top;
      win.style.transition = 'none';
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      win.style.left      = (e.clientX - dx) + 'px';
      win.style.top       = (e.clientY - dy) + 'px';
      win.style.transform = 'none';
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  }
}

function closeSysProp() {
  const win = document.getElementById('sysPropWindow');
  if (!win) return;
  win.style.transition = 'opacity .18s';
  win.style.opacity    = '0';
  setTimeout(() => {
    win.style.display  = 'none';
    win.style.opacity  = '1';
    win.style.transition = '';
  }, 180);
}

/* ── WELCOME ── (keep original below) */
setTimeout(() => notify('Welcome to Windows 8 Web', 'Windows 8'), 2900);
 