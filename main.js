'use strict';

let startOpen  = false;
let toastTimer = null;
let charmsTimer= null;

/* ════════════════════════════════════════════════════════════
   LOCK SCREEN WALLPAPER SLIDESHOW
   Wallpapers: assets/81.jpg → assets/90.jpg
   Crossfades every 5 seconds using two background layers (A/B)
   ════════════════════════════════════════════════════════════ */
const LOCK_WALLPAPERS = [
  'assets/81.jpg','assets/82.jpg','assets/83.jpg','assets/84.jpg','assets/85.jpg',
  'assets/86.jpg','assets/87.jpg','assets/88.jpg','assets/89.jpg','assets/90.jpg',
];
let lockWpIndex  = 0;
let lockWpLayerA = true; /* true = layer A is front */

function lockInitWallpaper() {
  const bgA = document.getElementById('lockBgA');
  const bgB = document.getElementById('lockBgB');
  if (!bgA || !bgB) return;

  /* layer A = first wallpaper, fully visible */
  bgA.style.backgroundImage = `url('${LOCK_WALLPAPERS[0]}')`;
  bgA.style.opacity  = '1';
  bgB.style.opacity  = '0';
  lockWpLayerA = true;

  /* cycle every 5 seconds */
  setInterval(lockNextWallpaper, 5000);
}

function lockNextWallpaper() {
  const bgA = document.getElementById('lockBgA');
  const bgB = document.getElementById('lockBgB');
  if (!bgA || !bgB) return;

  lockWpIndex = (lockWpIndex + 1) % LOCK_WALLPAPERS.length;
  const nextUrl = `url('${LOCK_WALLPAPERS[lockWpIndex]}')`;

  if (lockWpLayerA) {
    /* load next onto B, crossfade B in, hide A */
    bgB.style.backgroundImage = nextUrl;
    bgB.style.opacity = '1';
    bgA.style.opacity = '0';
    lockWpLayerA = false;
  } else {
    /* load onto A, crossfade A in, hide B */
    bgA.style.backgroundImage = nextUrl;
    bgA.style.opacity = '1';
    bgB.style.opacity = '0';
    lockWpLayerA = true;
  }
}

/* called from settings when user picks a lock screen wallpaper */
function setLockWallpaperOverride(url) {
  const bgA = document.getElementById('lockBgA');
  const bgB = document.getElementById('lockBgB');
  if (!bgA || !bgB) return;
  bgA.style.backgroundImage = `url('${url}')`;
  bgA.style.opacity = '1';
  bgB.style.opacity = '0';
  lockWpLayerA = true;
}

/* ── WINDOWS BOOT (runs AFTER bios:complete) ── */
function runWindowsBoot() {
  const boot = document.getElementById('bootScreen');
  if (!boot) return;
  /* kick off the lock screen wallpaper slideshow immediately */
  lockInitWallpaper();
  /* boot screen runs for 2.6s then fades out */
  setTimeout(() => {
    boot.style.transition = 'opacity .5s ease';
    boot.style.opacity    = '0';
    setTimeout(() => boot.remove(), 600);
  }, 2600);
}

/* ════════════════════════════════════════════════════════════
   LOCAL STORAGE PERSISTENCE
   Key: win8web_state
   Saves: wallpaper, accent colour, user pic, password, username
   ════════════════════════════════════════════════════════════ */
const STORE_KEY = 'win8web_state';

function saveState() {
  try {
    const data = {
      desktopWallpaper : (typeof state !== 'undefined' ? state.desktopWallpaper : '67.jpg'),
      lockWallpaper    : (typeof state !== 'undefined' ? state.lockWallpaper    : '67.jpg'),
      accentColour     : (typeof state !== 'undefined' ? state.accentColour     : '#008299'),
      userName         : (typeof state !== 'undefined' ? state.userName         : 'Neel Patel'),
      userPic          : (typeof state !== 'undefined' ? state.userPic          : 'user.png'),
      lockPassword     : lockPassword,
      savedAt          : Date.now(),
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch(e) { /* localStorage may be unavailable in some environments */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) { return null; }
}

function applyLoadedState(data) {
  if (!data) return;

  /* restore password */
  if (data.lockPassword) lockPassword = data.lockPassword;

  /* restore wallpaper + accent — settings.js state object */
  /* we call these after a short delay to ensure settings.js is loaded */
  setTimeout(() => {
    if (typeof state === 'undefined') return;
    if (data.desktopWallpaper) {
      state.desktopWallpaper = data.desktopWallpaper;
      const desktop = document.getElementById('desktop');
      if (desktop && data.desktopWallpaper !== '67.jpg') {
        desktop.style.backgroundImage = `url('${data.desktopWallpaper}')`;
      }
    }
    if (data.lockWallpaper) {
      state.lockWallpaper = data.lockWallpaper;
      if (data.lockWallpaper !== '67.jpg' && typeof setLockWallpaperOverride === 'function') {
        setLockWallpaperOverride(data.lockWallpaper);
      }
    }
    if (data.accentColour) {
      state.accentColour = data.accentColour;
      document.documentElement.style.setProperty('--accent-live', data.accentColour);
    }
    if (data.userName) {
      state.userName = data.userName;
      const nameEl = document.getElementById('lockUserName');
      if (nameEl) nameEl.textContent = data.userName;
    }
    if (data.userPic) {
      state.userPic = data.userPic;
      if (typeof applyUserPic === 'function') applyUserPic();
    }
  }, 200);
}

/* ════════════════════════════════════════════════════════════
   LOCK SCREEN + PASSWORD SYSTEM
   ════════════════════════════════════════════════════════════ */
let lockPassword    = '';         /* '' means no password — press Enter to unlock */
let lockPanelOpen   = false;
let lockDone        = false;      /* once unlocked, stays unlocked until re-locked */
let lockWrongCount  = 0;

/* Called from Settings to set/change/remove password */
function setLockPassword(newPass) {
  lockPassword = newPass || '';
  saveState();
  if (typeof notify === 'function') {
    notify(newPass ? 'Password set successfully' : 'Password removed', 'Account');
  }
}

/* Show password panel (called on first click of lock screen) */
function lockShowPassPanel() {
  if (lockDone) return;
  const lock  = document.getElementById('lockScreen');
  const panel = document.getElementById('lockPassPanel');
  if (!lock || !panel) return;

  lockPanelOpen = true;
  lock.classList.add('pass-mode');
  panel.classList.add('visible');

  /* update avatar + name from settings state */
  const avatar = document.getElementById('lockAvatar');
  const nameEl = document.getElementById('lockUserName');
  if (avatar && typeof state !== 'undefined') avatar.src = state.userPic || 'user.png';
  if (nameEl && typeof state !== 'undefined') nameEl.textContent = state.userName || 'Neel Patel';

  /* hint: tell user if there's no password */
  const hint = document.getElementById('lockPassHint');
  if (hint) hint.textContent = lockPassword
    ? `Sign in as ${typeof state !== 'undefined' ? state.userName : 'Neel Patel'}`
    : 'No password set — press Enter or ➜ to sign in';

  setTimeout(() => {
    const inp = document.getElementById('lockPassInput');
    if (inp) inp.focus();
  }, 350);
}

/* Try to unlock with typed password */
function lockTryPass() {
  if (lockDone) return;
  const inp = document.getElementById('lockPassInput');
  const err = document.getElementById('lockPassError');
  if (!inp) return;

  const typed = inp.value;

  /* if no password is set — any input (including blank) unlocks */
  if (!lockPassword || typed === lockPassword) {
    lockDoUnlock(inp);
  } else {
    /* wrong password */
    lockWrongCount++;
    inp.classList.remove('wrong');
    void inp.offsetWidth; /* force reflow for re-trigger */
    inp.classList.add('wrong');
    inp.value = '';
    if (err) {
      err.textContent = lockWrongCount >= 3
        ? `Incorrect password. (${lockWrongCount} attempts)`
        : 'The password is incorrect. Try again.';
    }
    setTimeout(() => inp.classList.remove('wrong'), 450);
    inp.focus();
  }
}

function lockPassKey(e) {
  if (e.key === 'Enter') lockTryPass();
  if (e.key === 'Escape') lockHidePassPanel();
}

function lockHidePassPanel() {
  const lock  = document.getElementById('lockScreen');
  const panel = document.getElementById('lockPassPanel');
  const inp   = document.getElementById('lockPassInput');
  const err   = document.getElementById('lockPassError');
  if (!lock || !panel) return;
  lockPanelOpen = false;
  lock.classList.remove('pass-mode');
  panel.classList.remove('visible');
  if (inp) inp.value = '';
  if (err) err.textContent = '';
}

function lockToggleEye() {
  const inp = document.getElementById('lockPassInput');
  const eye = document.getElementById('lockPassEye');
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  if (eye) eye.textContent = inp.type === 'password' ? '👁' : '🙈';
}

function lockDoUnlock(inp) {
  lockDone = true;
  lockWrongCount = 0;
  const lock = document.getElementById('lockScreen');
  if (!lock) return;

  /* slide everything up and away */
  lock.classList.remove('pass-mode');
  lock.style.transition = 'transform .9s cubic-bezier(.32,0,.18,1), opacity .4s ease';
  lock.style.transform  = 'translateY(-100%)';
  lock.style.opacity    = '0';
  lock.style.pointerEvents = 'none';

  setTimeout(() => {
    lock.style.display = 'none';
    if (typeof notify === 'function') {
      const name = (typeof state !== 'undefined' ? state.userName : null) || 'Neel Patel';
      notify(`Welcome back, ${name}`, 'Windows 8');
    }
  }, 600);
}

/* Re-lock the screen (called from Start > Lock) */
function reLockScreen() {
  lockDone       = false;
  lockPanelOpen  = false;
  lockWrongCount = 0;
  const lock = document.getElementById('lockScreen');
  const panel= document.getElementById('lockPassPanel');
  const inp  = document.getElementById('lockPassInput');
  const err  = document.getElementById('lockPassError');
  if (!lock) return;

  /* reset all transform/styles */
  lock.style.cssText = '';
  lock.style.display = '';
  lock.classList.remove('pass-mode', 'touched', 'unlock');
  if (panel) panel.classList.remove('visible');
  if (inp)   inp.value = '';
  if (err)   err.textContent = '';
}

/* Wire click/touch to lock screen */
(function() {
  const lock = document.getElementById('lockScreen');
  if (!lock) return;

  function onLockClick(e) {
    if (lockDone) return;
    /* if panel already open — don't re-trigger on panel itself */
    if (lockPanelOpen && e.target.closest('#lockPassPanel')) return;
    if (lockPanelOpen) {
      /* clicking outside panel hides it */
      if (!e.target.closest('#lockPassPanel')) lockHidePassPanel();
      return;
    }
    /* first click — nudge then show password panel */
    lock.classList.add('touched');
    setTimeout(() => {
      lock.classList.remove('touched');
      lockShowPassPanel();
    }, 190);
  }

  lock.addEventListener('click', onLockClick);
  lock.addEventListener('touchend', (e) => { e.preventDefault(); onLockClick(e); }, { passive: false });
})();

/* ── BOOT ── */
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
  if (e.key === 'Escape') {
    if (startOpen) toggleStart();
    hideShutdown();
    hideAllCtx();
    /* close settings if open */
    const sw = document.getElementById('settingsWindow');
    if (sw && sw.classList.contains('open')) closeSettings();
  }
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

function desktopNewFolder() {
  hideAllCtx();
  notify('New folder created on Desktop', 'Desktop');
}

/* ── DESKTOP ICON RIGHT-CLICK ── */
function showIconCtx(e, type) {
  e.preventDefault();
  e.stopPropagation();
  if      (type === 'thispc')    openCtx('thisPcIconCtx',    e.clientX, e.clientY);
  else if (type === 'notepad')   openCtx('notepadIconCtx',   e.clientX, e.clientY);
  else if (type === 'terminal')  openCtx('terminalIconCtx',  e.clientX, e.clientY);
  else if (type === 'ie')        openCtx('ieIconCtx',        e.clientX, e.clientY);
  else if (type === 'weather')   openCtx('weatherIconCtx',   e.clientX, e.clientY);
  else if (type === 'maps')      openCtx('mapsIconCtx',       e.clientX, e.clientY);
  /* other icons — suppress browser default */
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

/* ════════════════════════════════════════════════════════════
   FS PERSISTENCE  — save virtual file system to localStorage
   ════════════════════════════════════════════════════════════ */
const FS_KEY = 'win8web_fs';

function saveFS() {
  try {
    if (typeof FS === 'undefined') return;
    /* only save text-editable files — skip large blobs */
    const saveable = {};
    Object.keys(FS).forEach(dir => {
      saveable[dir] = (FS[dir] || []).map(item => {
        if (item.type === 'file' && item.content && item.content.length > 50000) {
          return { ...item, content: item.content.slice(0, 50000) };
        }
        return item;
      });
    });
    localStorage.setItem(FS_KEY, JSON.stringify(saveable));
  } catch(e) {}
}

function loadFS() {
  try {
    const raw = localStorage.getItem(FS_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (typeof FS === 'undefined') return;
    /* merge saved files into FS — don't overwrite everything, only add saved ones */
    Object.keys(saved).forEach(dir => {
      if (!FS[dir]) FS[dir] = [];
      saved[dir].forEach(savedItem => {
        const exists = FS[dir].find(f => f.name === savedItem.name);
        if (!exists) {
          FS[dir].push(savedItem);
        } else if (savedItem.content !== undefined) {
          exists.content = savedItem.content;
        }
      });
    });
  } catch(e) {}
}

/* Auto-save FS every 10 seconds if FS exists */
setInterval(() => {
  if (typeof FS !== 'undefined') saveFS();
}, 10000);

/* Load FS on boot */
window.addEventListener('load', () => {
  setTimeout(() => {
    loadFS();
    const saved = loadState ? loadState() : null;
    if (saved && typeof applyLoadedState === 'function') applyLoadedState(saved);
  }, 300);
});

/* ════════════════════════════════════════════════════════════
   DESKTOP ICON SYSTEM
   • Snap-to-grid positioning
   • Drag to reposition (single or multi)
   • Rubber-band multi-select
   • Click to select / Ctrl+click multi-select
   • Double-click to open
   • Right-click context menu
   • F2 rename
   • Delete key
   • Positions saved to localStorage
   ════════════════════════════════════════════════════════════ */

const DI = {
  CELL_W   : 90,    /* grid cell width  (icon 80px + 10px gap) */
  CELL_H   : 96,    /* grid cell height (icon ~86px + 10px gap) */
  PAD_TOP  : 8,     /* top padding from desktop edge */
  PAD_LEFT : 8,     /* left padding */
  PAD_BOT  : 54,    /* bottom: leave room for taskbar */
  selected : new Set(),   /* Set of icon element ids */
  dragging : false,
  dragTarget: null,
  dragGroup : [],   /* [{el, startX, startY}] for multi-drag */
  dragOriginX: 0, dragOriginY: 0,
  hasMoved  : false,
  rubber    : { active:false, x0:0, y0:0 },
  positions : {},   /* { id: {col, row} } saved positions */
  STORE_KEY : 'win8web_desktop_icons',
};

/* ── INITIALISE ── */
function diInit() {
  diLoadPositions();
  diLayoutAll();
  diAttachAll();
  diAttachDesktop();
}

/* ── GRID HELPERS ── */
function diColRowToXY(col, row) {
  return {
    x: DI.PAD_LEFT + col * DI.CELL_W,
    y: DI.PAD_TOP  + row * DI.CELL_H,
  };
}

function diXYToColRow(x, y) {
  const desktop = document.getElementById('desktop');
  const dh = (desktop ? desktop.offsetHeight : window.innerHeight) - DI.PAD_BOT;
  const maxRows = Math.floor((dh - DI.PAD_TOP) / DI.CELL_H);
  const col = Math.max(0, Math.round((x - DI.PAD_LEFT) / DI.CELL_W));
  const row = Math.max(0, Math.min(maxRows - 1, Math.round((y - DI.PAD_TOP) / DI.CELL_H)));
  return { col, row };
}

function diIsOccupied(col, row, excludeId) {
  return Object.entries(DI.positions).some(([id, pos]) =>
    id !== excludeId && pos.col === col && pos.row === row
  );
}

function diFindFreeCell(preferCol, preferRow, excludeId) {
  /* spiral search from preferred cell */
  const desktop = document.getElementById('desktop');
  const dh = (desktop ? desktop.offsetHeight : window.innerHeight) - DI.PAD_BOT;
  const maxRows = Math.floor((dh - DI.PAD_TOP) / DI.CELL_H);
  const maxCols = 20;

  for (let radius = 0; radius < 20; radius++) {
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;
        const col = preferCol + dc;
        const row = preferRow + dr;
        if (col >= 0 && row >= 0 && row < maxRows && col < maxCols) {
          if (!diIsOccupied(col, row, excludeId)) return { col, row };
        }
      }
    }
  }
  return { col: preferCol, row: preferRow };
}

/* ── LAYOUT ICONS ── */
function diLayoutAll() {
  document.querySelectorAll('.d-icon').forEach(el => {
    const id  = el.id;
    let pos   = DI.positions[id];
    if (!pos) {
      /* use data-col / data-row as default */
      const dc = parseInt(el.dataset.col) || 0;
      const dr = parseInt(el.dataset.row) || 0;
      pos = diFindFreeCell(dc, dr, id);
      DI.positions[id] = pos;
    }
    diPlaceIcon(el, pos.col, pos.row);
  });
}

function diPlaceIcon(el, col, row, animate) {
  const { x, y } = diColRowToXY(col, row);
  if (animate) {
    el.style.transition = 'left .15s ease, top .15s ease';
    setTimeout(() => { el.style.transition = ''; }, 160);
  }
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  DI.positions[el.id] = { col, row };
}

/* ── ATTACH HANDLERS TO ALL ICONS ── */
function diAttachAll() {
  document.querySelectorAll('.d-icon').forEach(el => diAttachIcon(el));
}

function diAttachIcon(el) {
  if (el._diAttached) return;
  el._diAttached = true;

  let clickTimer = null;
  let downX = 0, downY = 0;

  el.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.stopPropagation();

    downX = e.clientX; downY = e.clientY;

    /* selection logic */
    if (e.ctrlKey || e.metaKey) {
      /* ctrl+click toggles this icon in selection */
      if (DI.selected.has(el.id)) {
        DI.selected.delete(el.id);
        el.classList.remove('selected');
      } else {
        DI.selected.add(el.id);
        el.classList.add('selected');
      }
    } else if (!DI.selected.has(el.id)) {
      /* click on unselected — clear others, select this */
      diClearSelection();
      DI.selected.add(el.id);
      el.classList.add('selected');
    }
    /* if already selected and no ctrl — keep group, may drag */

    /* prepare drag */
    DI.dragging    = false;
    DI.dragTarget  = el;
    DI.hasMoved    = false;
    DI.dragOriginX = e.clientX;
    DI.dragOriginY = e.clientY;

    /* record start positions for all selected icons */
    DI.dragGroup = [];
    DI.selected.forEach(id => {
      const icon = document.getElementById(id);
      if (!icon) return;
      DI.dragGroup.push({
        el,
        icon,
        startLeft: parseInt(icon.style.left) || 0,
        startTop : parseInt(icon.style.top)  || 0,
      });
    });
  });

  el.addEventListener('dblclick', e => {
    e.stopPropagation();
    /* dblclick is handled by inline ondblclick — nothing extra needed */
  });

  el.addEventListener('contextmenu', e => {
    e.preventDefault(); e.stopPropagation();
    /* select this icon if not already in selection */
    if (!DI.selected.has(el.id)) {
      diClearSelection();
      DI.selected.add(el.id);
      el.classList.add('selected');
    }
    const ctx = el.dataset.ctx || 'generic';
    showIconCtx(e, ctx);
  });
}

/* ── MOUSE MOVE — drag ── */
document.addEventListener('mousemove', e => {
  if (!DI.dragTarget) return;
  const dx = e.clientX - DI.dragOriginX;
  const dy = e.clientY - DI.dragOriginY;

  if (!DI.dragging && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
    DI.dragging = true;
    DI.hasMoved = true;
    DI.dragGroup.forEach(g => g.icon.classList.add('dragging'));
  }

  if (DI.dragging) {
    DI.dragGroup.forEach(g => {
      const x = g.startLeft + dx;
      const y = g.startTop  + dy;
      const desktop = document.getElementById('desktop');
      const dw = desktop ? desktop.offsetWidth  : window.innerWidth;
      const dh = desktop ? desktop.offsetHeight - DI.PAD_BOT : window.innerHeight - DI.PAD_BOT;
      g.icon.style.left = Math.max(0, Math.min(dw - 80, x)) + 'px';
      g.icon.style.top  = Math.max(0, Math.min(dh - 86, y)) + 'px';
    });
  }
});

/* ── MOUSE UP — snap to grid ── */
document.addEventListener('mouseup', e => {
  if (!DI.dragTarget) return;

  if (DI.dragging) {
    /* snap all dragged icons to nearest grid cells */
    const occupied = new Set();

    DI.dragGroup.forEach(g => {
      g.icon.classList.remove('dragging');
      const x   = parseInt(g.icon.style.left) || 0;
      const y   = parseInt(g.icon.style.top)  || 0;
      let { col, row } = diXYToColRow(x + 40, y + 40); /* snap from centre */

      /* avoid collision with non-dragged icons */
      const excludeIds = new Set(DI.selected);
      let attempts = 0;
      while ((diIsOccupied(col, row, g.icon.id) || occupied.has(`${col},${row}`)) && attempts < 50) {
        const found = diFindFreeCell(col, row, g.icon.id);
        col = found.col; row = found.row;
        attempts++;
      }
      occupied.add(`${col},${row}`);
      diPlaceIcon(g.icon, col, row, true);
    });

    diSavePositions();
  } else if (!DI.hasMoved && e.button === 0) {
    /* it was a plain click — selection already handled in mousedown */
  }

  DI.dragging   = false;
  DI.dragTarget = null;
  DI.dragGroup  = [];
  DI.hasMoved   = false;
});

/* ── ATTACH DESKTOP HANDLERS ── */
function diAttachDesktop() {
  const desktop = document.getElementById('desktop');
  if (!desktop) return;

  desktop.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (e.target.closest('.d-icon')) return; /* clicking an icon */

    /* start rubber band */
    DI.rubber.active = true;
    DI.rubber.x0 = e.clientX;
    DI.rubber.y0 = e.clientY;

    const band = document.getElementById('desktopRubberBand');
    if (band) {
      band.style.left   = e.clientX + 'px';
      band.style.top    = e.clientY + 'px';
      band.style.width  = '0px';
      band.style.height = '0px';
      band.classList.add('active');
    }

    /* clear selection unless ctrl */
    if (!e.ctrlKey) diClearSelection();
  });

  document.addEventListener('mousemove', e => {
    if (!DI.rubber.active) return;

    const x0 = DI.rubber.x0, y0 = DI.rubber.y0;
    const x1 = e.clientX,    y1 = e.clientY;

    const left   = Math.min(x0, x1);
    const top    = Math.min(y0, y1);
    const width  = Math.abs(x1 - x0);
    const height = Math.abs(y1 - y0);

    const band = document.getElementById('desktopRubberBand');
    if (band) {
      band.style.left   = left   + 'px';
      band.style.top    = top    + 'px';
      band.style.width  = width  + 'px';
      band.style.height = height + 'px';
    }

    /* select all icons whose rect intersects the rubber band */
    const selRect = { left, top, right: left+width, bottom: top+height };
    document.querySelectorAll('.d-icon').forEach(icon => {
      const r = icon.getBoundingClientRect();
      const hit = r.left < selRect.right  && r.right  > selRect.left &&
                  r.top  < selRect.bottom && r.bottom > selRect.top;
      if (hit) {
        DI.selected.add(icon.id);
        icon.classList.add('selected');
      } else if (!e.ctrlKey) {
        DI.selected.delete(icon.id);
        icon.classList.remove('selected');
      }
    });
  });

  document.addEventListener('mouseup', e => {
    if (!DI.rubber.active) return;
    DI.rubber.active = false;
    const band = document.getElementById('desktopRubberBand');
    if (band) band.classList.remove('active');
  });

  /* click on empty desktop — clear selection */
  desktop.addEventListener('click', e => {
    if (!e.target.closest('.d-icon')) diClearSelection();
  });
}

/* ── SELECTION HELPERS ── */
function diClearSelection() {
  DI.selected.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('selected');
  });
  DI.selected.clear();
}

/* ── KEYBOARD SHORTCUTS ── */
document.addEventListener('keydown', e => {
  /* only on desktop, not when typing in an input */
  if (document.activeElement && ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (!startOpen && DI.selected.size > 0) {
    /* F2 — rename selected icon */
    if (e.key === 'F2' && DI.selected.size === 1) {
      const id = [...DI.selected][0];
      const el = document.getElementById(id);
      if (el) diStartRename(el);
      e.preventDefault();
    }
    /* Delete — remove selected desktop icon(s) */
    if (e.key === 'Delete') {
      DI.selected.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          delete DI.positions[id];
          el.remove();
        }
      });
      DI.selected.clear();
      diSavePositions();
    }
    /* Escape — clear selection */
    if (e.key === 'Escape') diClearSelection();
  }
  /* Ctrl+A — select all desktop icons */
  if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !startOpen) {
    if (!document.activeElement || !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      document.querySelectorAll('.d-icon').forEach(icon => {
        DI.selected.add(icon.id);
        icon.classList.add('selected');
      });
      e.preventDefault();
    }
  }
});

/* ── RENAME ── */
function diStartRename(el) {
  const spanEl = el.querySelector('span');
  if (!spanEl) return;
  const oldName = spanEl.textContent;

  const input = document.createElement('input');
  input.className = 'd-rename-input';
  input.value     = oldName;
  spanEl.replaceWith(input);
  input.focus(); input.select();

  function commit() {
    const newName = input.value.trim() || oldName;
    const newSpan = document.createElement('span');
    newSpan.textContent = newName;
    input.replaceWith(newSpan);
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e2 => {
    if (e2.key === 'Enter')  { e2.preventDefault(); input.blur(); }
    if (e2.key === 'Escape') { input.value = oldName; input.blur(); }
    e2.stopPropagation();
  });
  input.addEventListener('click', e2 => e2.stopPropagation());
  input.addEventListener('mousedown', e2 => e2.stopPropagation());
}

/* ── NEW FOLDER on desktop ── */
function desktopNewFolder() {
  hideAllCtx();
  const container = document.getElementById('desktopIconsContainer');
  if (!container) return;

  /* find a free cell */
  const { col, row } = diFindFreeCell(2, 0, 'dicon-newfolder-' + Date.now());
  const id = 'dicon-nf-' + Date.now();

  const el = document.createElement('div');
  el.className = 'd-icon';
  el.id        = id;
  el.dataset.ctx = 'generic';
  el.innerHTML = `<img src="icons/folder.png" alt="New Folder" onerror="this.style.display='none'"><span>New Folder</span>`;
  container.appendChild(el);

  DI.positions[id] = { col, row };
  diPlaceIcon(el, col, row);
  diAttachIcon(el);
  diSavePositions();

  /* immediately start rename */
  DI.selected.clear();
  DI.selected.add(id);
  el.classList.add('selected');
  requestAnimationFrame(() => diStartRename(el));
}

/* patch desktopNewFolder into the context menu action */
/* (already referenced in index.html desktopCtx) */

/* ── DESKTOP AUTO-ARRANGE ── */
function diAutoArrange() {
  hideAllCtx();
  const icons = Array.from(document.querySelectorAll('.d-icon'));
  const desktop = document.getElementById('desktop');
  const dh = (desktop ? desktop.offsetHeight - DI.PAD_BOT : window.innerHeight - DI.PAD_BOT);
  const maxRows = Math.floor((dh - DI.PAD_TOP) / DI.CELL_H);

  DI.positions = {};
  icons.forEach((icon, i) => {
    const col = Math.floor(i / maxRows);
    const row = i % maxRows;
    DI.positions[icon.id] = { col, row };
    diPlaceIcon(icon, col, row, true);
  });
  diSavePositions();
}

/* ── PERSISTENCE ── */
function diSavePositions() {
  try { localStorage.setItem(DI.STORE_KEY, JSON.stringify(DI.positions)); } catch(e) {}
}

function diLoadPositions() {
  try {
    const raw = localStorage.getItem(DI.STORE_KEY);
    if (raw) DI.positions = JSON.parse(raw);
  } catch(e) { DI.positions = {}; }
}

/* ── BOOT: init after desktop is visible ── */
window.addEventListener('bios:complete', () => setTimeout(diInit, 100));
/* fallback if no BIOS */
window.addEventListener('load', () => {
  if (!document.getElementById('phase-black')) diInit();
});

/* ════════════════════════════════════════════════════════════
   DESKTOP ICON EXTRA FEATURES
   ════════════════════════════════════════════════════════════ */

/* ── ICON SIZE ── */
let diIconSize = 'large'; /* large | medium | small */
const diSizeMap = { large:{ img:40, cell_w:90, cell_h:96, font:11 }, medium:{ img:32, cell_w:80, cell_h:84, font:11 }, small:{ img:24, cell_w:68, cell_h:70, font:10 } };

function diSetIconSize(size) {
  diIconSize = size;
  const cfg = diSizeMap[size] || diSizeMap.large;
  DI.CELL_W = cfg.cell_w;
  DI.CELL_H = cfg.cell_h;

  /* update CSS for all icons */
  document.querySelectorAll('.d-icon').forEach(el => {
    el.style.width = (cfg.cell_w - 10) + 'px';
    const img = el.querySelector('img');
    if (img) { img.style.width = cfg.img + 'px'; img.style.height = cfg.img + 'px'; }
    const span = el.querySelector('span');
    if (span) span.style.fontSize = cfg.font + 'px';
  });

  /* update check marks */
  ['Large','Medium','Small'].forEach(s => {
    const el = document.getElementById('viewCheck' + s);
    if (el) el.textContent = size === s.toLowerCase() ? '●' : '';
  });

  diLayoutAll();
}

/* ── SORT BY ── */
function diSortBy(field) {
  const container = document.getElementById('desktopIconsContainer');
  if (!container) return;
  const icons = Array.from(container.querySelectorAll('.d-icon'));

  icons.sort((a, b) => {
    const nameA = (a.querySelector('span')?.textContent || a.id).toLowerCase();
    const nameB = (b.querySelector('span')?.textContent || b.id).toLowerCase();
    if (field === 'type') {
      const imgA = a.querySelector('img')?.src || '';
      const imgB = b.querySelector('img')?.src || '';
      return imgA.localeCompare(imgB) || nameA.localeCompare(nameB);
    }
    return nameA.localeCompare(nameB);
  });

  /* re-layout sorted icons */
  const desktop = document.getElementById('desktop');
  const dh = (desktop ? desktop.offsetHeight - DI.PAD_BOT : window.innerHeight - DI.PAD_BOT);
  const maxRows = Math.floor((dh - DI.PAD_TOP) / DI.CELL_H);
  DI.positions = {};

  icons.forEach((icon, i) => {
    const col = Math.floor(i / maxRows);
    const row = i % maxRows;
    DI.positions[icon.id] = { col, row };
    diPlaceIcon(icon, col, row, true);
  });

  diSavePositions();
  if (typeof notify === 'function') notify(`Icons sorted by ${field}`, 'Desktop');
}

/* ── ALIGN TO GRID (snap in place without rearranging) ── */
function diAlignToGrid() {
  document.querySelectorAll('.d-icon').forEach(el => {
    const x = parseInt(el.style.left) || 0;
    const y = parseInt(el.style.top)  || 0;
    const { col, row } = diXYToColRow(x + 40, y + 40);
    const free = diFindFreeCell(col, row, el.id);
    DI.positions[el.id] = free;
    diPlaceIcon(el, free.col, free.row, true);
  });
  diSavePositions();
}

/* ── SHOW / HIDE DESKTOP ICONS ── */
let diIconsVisible = true;
function diToggleIconVisibility() {
  diIconsVisible = !diIconsVisible;
  const container = document.getElementById('desktopIconsContainer');
  if (container) container.style.visibility = diIconsVisible ? 'visible' : 'hidden';
  const checkEl = document.getElementById('viewCheckShow');
  if (checkEl) checkEl.textContent = diIconsVisible ? '●' : '';
}

/* ── NEW TEXT FILE on desktop ── */
function desktopNewTextFile() {
  hideAllCtx();
  const container = document.getElementById('desktopIconsContainer');
  if (!container) return;

  const { col, row } = diFindFreeCell(2, 0, 'dicon-ntf-' + Date.now());
  const id = 'dicon-ntf-' + Date.now();

  const el = document.createElement('div');
  el.className   = 'd-icon';
  el.id          = id;
  el.dataset.ctx = 'generic';
  el.ondblclick  = () => openNotepad(el.querySelector('span')?.textContent || 'New Text Document.txt', '');
  el.innerHTML   = `<img src="icons/file-text.png" alt="Text" onerror="this.style.display='none'"><span>New Text Document.txt</span>`;
  container.appendChild(el);

  DI.positions[id] = { col, row };
  diPlaceIcon(el, col, row);
  diAttachIcon(el);
  diSavePositions();

  DI.selected.clear();
  DI.selected.add(id);
  el.classList.add('selected');
  requestAnimationFrame(() => diStartRename(el));
}

/* ── REFRESH ── */
function desktopRefresh() {
  hideAllCtx();
  diClearSelection();
  /* quick blink animation */
  const container = document.getElementById('desktopIconsContainer');
  if (container) {
    container.style.transition = 'opacity .15s';
    container.style.opacity    = '0.5';
    setTimeout(() => { container.style.opacity = '1'; }, 180);
  }
  if (typeof notify === 'function') notify('Desktop refreshed', 'Desktop');
}
