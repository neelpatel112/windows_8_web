/* ══════════════════════════════════════════════════════════════
   Windows 8 Web — main.js
   ══════════════════════════════════════════════════════════════ */

'use strict';

// ── STATE ────────────────────────────────────────────────────
let startOpen   = false;
let toastTimer  = null;
let charmsTimer = null;

// ── BOOT → LOCK ──────────────────────────────────────────────
window.addEventListener('load', () => {
  const boot = document.getElementById('bootScreen');
  // hide boot screen after 2.3 s
  setTimeout(() => {
    boot.style.transition = 'opacity 0.5s ease';
    boot.style.opacity    = '0';
    setTimeout(() => boot.remove(), 600);
  }, 2300);
});

// ── LOCK SCREEN UNLOCK ───────────────────────────────────────
(function setupLock() {
  const lock = document.getElementById('lockScreen');
  if (!lock) return;

  let touching = false;

  function startTouch() {
    if (touching) return;
    touching = true;
    // Stage 1 — tiny nudge upward so user feels responsiveness
    lock.classList.add('touched');
  }

  function endTouch() {
    if (!touching) return;
    // Small delay so the nudge is visible before the full slide
    setTimeout(() => {
      lock.classList.remove('touched');
      // Stage 2 — full slow slide up (~900 ms, see CSS)
      lock.classList.add('unlock');
      setTimeout(() => {
        notify('Welcome back, User', 'Windows 8');
      }, 500);
    }, 180);
  }

  lock.addEventListener('click',      endTouch);
  lock.addEventListener('touchstart', startTouch, { passive: true });
  lock.addEventListener('touchend',   endTouch,   { passive: true });
})();

// ── CLOCK ────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();

  const hm = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateShort = now.toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric'
  });
  const dateLong = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  // taskbar
  const tbTime = document.getElementById('tbTime');
  const tbDate = document.getElementById('tbDate');
  if (tbTime) tbTime.textContent = hm;
  if (tbDate) tbDate.textContent = dateShort;

  // lock screen
  const lockTime = document.getElementById('lockTime');
  const lockDate = document.getElementById('lockDate');
  if (lockTime) lockTime.textContent = hm;
  if (lockDate) lockDate.textContent = dateLong;

  // charms
  const charmTime = document.getElementById('charmTime');
  if (charmTime) charmTime.textContent = hm;

  // calendar live tile back
  const calDay   = document.getElementById('calDay');
  const calMonth = document.getElementById('calMonth');
  if (calDay)   calDay.textContent   = now.getDate();
  if (calMonth) calMonth.textContent = now.toLocaleDateString('en-US', { month: 'long' });
}

updateClock();
setInterval(updateClock, 1000);

// ── TOAST NOTIFICATION ───────────────────────────────────────
function notify(msg, title) {
  const toast    = document.getElementById('toast');
  const msgEl    = document.getElementById('toastMsg');
  const titleEl  = document.querySelector('.toast-title');
  if (!toast || !msgEl) return;

  msgEl.textContent  = msg;
  if (titleEl) titleEl.textContent = title || 'Windows 8';

  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ── START SCREEN ─────────────────────────────────────────────
function toggleStart() {
  startOpen = !startOpen;
  const ss  = document.getElementById('startScreen');
  const btn = document.getElementById('startBtn');

  if (startOpen) {
    ss.classList.add('active');
    btn.classList.add('active');
    // Focus search
    const inp = document.getElementById('searchInput');
    if (inp) setTimeout(() => inp.focus(), 350);
  } else {
    ss.classList.remove('active');
    btn.classList.remove('active');
  }
}

// close on ESC or click on desktop
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && startOpen) toggleStart();
});
document.getElementById('desktop').addEventListener('click', () => {
  if (startOpen) toggleStart();
});

// ── TILE OPEN ────────────────────────────────────────────────
function tileOpen(tile, name) {
  // brief brightness flash
  tile.style.filter = 'brightness(1.6)';
  setTimeout(() => { tile.style.filter = ''; }, 130);

  notify(`Opening ${name}…`, name);

  // close start screen a moment after the flash
  if (startOpen) setTimeout(toggleStart, 220);
}

// ── LIVE TILE FLIP ───────────────────────────────────────────
/**
 * id          — id of the .tile-flip-inner element
 * firstDelay  — ms before first flip
 * interval    — ms between flips
 */
function scheduleLiveFlip(id, firstDelay, interval) {
  const inner = document.getElementById(id);
  if (!inner) return;

  const tile = inner.closest('.tile');
  if (!tile) return;

  function doFlip() {
    tile.classList.add('flipped');
    // flip back a bit before next cycle
    setTimeout(() => tile.classList.remove('flipped'), interval - 1200);
  }

  setTimeout(() => {
    doFlip();
    setInterval(doFlip, interval);
  }, firstDelay);
}

// stagger them so they don't all flip simultaneously
scheduleLiveFlip('mailFlip',  3200,  6500);
scheduleLiveFlip('calFlip',   5000,  8000);
scheduleLiveFlip('wxFlip',    7200, 10000);
scheduleLiveFlip('musicFlip', 4100,  7200);
scheduleLiveFlip('newsFlip',  6000,  9500);

// ── CHARMS BAR — right-edge hover ───────────────────────────
document.addEventListener('mousemove', e => {
  const charms = document.getElementById('charms');
  if (!charms) return;

  if (e.clientX >= window.innerWidth - 5) {
    clearTimeout(charmsTimer);
    charms.classList.add('open');
  } else if (e.clientX < window.innerWidth - 80) {
    charmsTimer = setTimeout(() => charms.classList.remove('open'), 350);
  }
});

// ── SHUTDOWN ─────────────────────────────────────────────────
function showShutdown() {
  if (startOpen) toggleStart();
  document.getElementById('shutdownOverlay').classList.add('show');
}

function hideShutdown() {
  document.getElementById('shutdownOverlay').classList.remove('show');
}

function doShutdown(action) {
  hideShutdown();

  if (action === 'shutdown') {
    notify('Shutting down…');
    setTimeout(() => {
      document.body.innerHTML =
        '<div style="background:#000;color:#fff;height:100vh;display:flex;flex-direction:column;'+
        'align-items:center;justify-content:center;font-family:Segoe UI,sans-serif;gap:28px">'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;width:60px;height:60px">'+
        '<span style="background:#f34f1c;border-radius:1px"></span>'+
        '<span style="background:#7fba00;border-radius:1px"></span>'+
        '<span style="background:#01a6f0;border-radius:1px"></span>'+
        '<span style="background:#ffba01;border-radius:1px"></span></div>'+
        '<p style="font-weight:200;font-size:18px;letter-spacing:1px">Shutting down…</p></div>';
    }, 900);

  } else if (action === 'restart') {
    notify('Restarting…');
    setTimeout(() => location.reload(), 1600);

  } else { // sleep
    notify('Going to sleep… click anywhere to wake.');
    const body = document.body;
    body.style.transition = 'filter 1.2s ease';
    body.style.filter     = 'brightness(0)';
    document.addEventListener('click', () => {
      body.style.filter = 'brightness(1)';
      setTimeout(() => { body.style.transition = ''; body.style.filter = ''; }, 1300);
    }, { once: true });
  }
}

// ── SWIPE UP to open Start (mobile) ─────────────────────────
let touchStartY = 0;
document.addEventListener('touchstart', e => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
  const dy = touchStartY - e.changedTouches[0].clientY;
  if (dy > 80 && !startOpen) toggleStart();
}, { passive: true });

// ── WELCOME ──────────────────────────────────────────────────
setTimeout(() => notify('Welcome to Windows 8 Web', 'Windows 8'), 2900);
 