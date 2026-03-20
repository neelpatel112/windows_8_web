/* ═══════════════════════════════════════════════════════════
   Windows 8 Web  ·  main.js
   ═══════════════════════════════════════════════════════════ */
'use strict';

let startOpen   = false;
let toastTimer  = null;
let charmsTimer = null;

/* ── BOOT ─────────────────────────────────────────────────── */
window.addEventListener('load', () => {
  const boot = document.getElementById('bootScreen');
  setTimeout(() => {
    boot.style.transition = 'opacity .5s ease';
    boot.style.opacity    = '0';
    setTimeout(() => boot.remove(), 600);
  }, 2300);
});

/* ── LOCK SCREEN ─────────────────────────────────────────── */
(function () {
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
  lock.addEventListener('touchstart', () => lock.classList.add('touched'),   { passive:true });
  lock.addEventListener('touchend',   unlock, { passive:true });
})();

/* ── CLOCK ───────────────────────────────────────────────── */
function tick() {
  const now = new Date();
  const hm  = now.toLocaleTimeString('en-US',{ hour:'2-digit', minute:'2-digit' });
  const ds  = now.toLocaleDateString ('en-US',{ month:'numeric', day:'numeric', year:'numeric' });
  const dl  = now.toLocaleDateString ('en-US',{ weekday:'long', month:'long', day:'numeric' });

  q('#tbTime') && (q('#tbTime').textContent = hm);
  q('#tbDate') && (q('#tbDate').textContent = ds);
  q('#lockTime') && (q('#lockTime').textContent = hm);
  q('#lockDate') && (q('#lockDate').textContent = dl);
  q('#charmTime') && (q('#charmTime').textContent = hm);

  // calendar live tile
  q('#calDay')   && (q('#calDay').textContent   = now.getDate());
  q('#calMonth') && (q('#calMonth').textContent =
    now.toLocaleDateString('en-US',{ month:'long' }));
}
function q(sel) { return document.querySelector(sel); }
tick(); setInterval(tick, 1000);

/* ── TOAST ───────────────────────────────────────────────── */
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

/* ── START SCREEN ────────────────────────────────────────── */
function toggleStart() {
  startOpen = !startOpen;
  const ss  = q('#startScreen');
  const btn = q('#startBtn');
  if (startOpen) {
    ss.classList.add('active');
    btn && btn.classList.add('active');
  } else {
    ss.classList.remove('active');
    btn && btn.classList.remove('active');
    closePowerMenu();
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (startOpen) toggleStart();
    hideShutdown();
  }
});
document.getElementById('desktop').addEventListener('click', () => {
  if (startOpen) toggleStart();
});

/* ── POWER DROPDOWN (on user block in start screen) ─────── */
function togglePowerMenu(e) {
  e.stopPropagation();
  const m = q('#powerMenu');
  m.classList.toggle('open');
}
function closePowerMenu() {
  q('#powerMenu') && q('#powerMenu').classList.remove('open');
}
// clicking anywhere inside start screen (but not on the menu) closes it
document.addEventListener('click', e => {
  const m = q('#powerMenu');
  if (m && m.classList.contains('open')) {
    if (!m.contains(e.target) && !q('.ss-user').contains(e.target)) {
      m.classList.remove('open');
    }
  }
});

/* ── TILE OPEN ───────────────────────────────────────────── */
function tileOpen(tile, name) {
  tile.style.filter = 'brightness(1.7)';
  setTimeout(() => { tile.style.filter = ''; }, 120);
  notify('Opening ' + name + '…', name);
  if (startOpen) setTimeout(toggleStart, 220);
}

/* ── LIVE TILE FLIP ──────────────────────────────────────── */
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

liveTile('mailFlip',  3200,  6500);
liveTile('calFlip',   5000,  8200);
liveTile('wxFlip',    7000, 10000);
liveTile('musicFlip', 4200,  7400);
liveTile('newsFlip',  6200,  9600);
liveTile('bingFlip',  8000, 11000);

/* ── CHARMS ──────────────────────────────────────────────── */
document.addEventListener('mousemove', e => {
  const ch = q('#charms');
  if (!ch) return;
  if (e.clientX >= window.innerWidth - 4) {
    clearTimeout(charmsTimer); ch.classList.add('open');
  } else if (e.clientX < window.innerWidth - 80) {
    charmsTimer = setTimeout(() => ch.classList.remove('open'), 350);
  }
});

/* ── SHUTDOWN ────────────────────────────────────────────── */
function showShutdown() {
  closePowerMenu();
  if (startOpen) toggleStart();
  q('#shutdownOverlay').classList.add('show');
}
function hideShutdown() {
  q('#shutdownOverlay').classList.remove('show');
}
function doShutdown(action) {
  hideShutdown();
  if (action === 'shutdown') {
    notify('Shutting down…');
    setTimeout(() => {
      document.body.innerHTML =
        '<div style="background:#000;color:#fff;height:100vh;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;font-family:Segoe UI,sans-serif;gap:28px">' +
        '<img src="logo.png" style="width:56px;height:56px;object-fit:contain;opacity:.9" alt="Windows">' +
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
      setTimeout(() => { document.body.style.transition=''; document.body.style.filter=''; }, 1300);
    }, { once:true });
  }
}

/* ── SWIPE UP → start (mobile) ───────────────────────────── */
let ty0 = 0;
document.addEventListener('touchstart', e => { ty0 = e.touches[0].clientY; }, { passive:true });
document.addEventListener('touchend',   e => {
  if (ty0 - e.changedTouches[0].clientY > 80 && !startOpen) toggleStart();
}, { passive:true });

/* ── WELCOME ─────────────────────────────────────────────── */
setTimeout(() => notify('Welcome to Windows 8 Web', 'Windows 8'), 2900);
 