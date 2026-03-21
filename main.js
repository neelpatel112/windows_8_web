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

  // 4 rows + 3 gaps of 5px each must fit
  const sz = Math.floor((avail - 3 * 5 - 20) / 4); // 20px bottom breathing room
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

/* ── WELCOME ── */
setTimeout(() => notify('Welcome to Windows 8 Web', 'Windows 8'), 2900);
 