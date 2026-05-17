/* ═══════════════════════════════════════════════════════════
   Windows 8 Store  ·  store.js
   Loads win8store.vercel.app inside a proper Win8 window
   ═══════════════════════════════════════════════════════════ */
'use strict';

const STORE_URL = 'https://macostahoeweb.vercel.app/';

const ST = {
  isMin  : false,
  isMax  : false,
  drag   : { on:false, ox:0, oy:0 },
  resize : { on:false, sx:0, sy:0, sw:0, sh:0 },
};

/* ════════════════════════════════════════════════════════════
   OPEN
   ════════════════════════════════════════════════════════════ */
function openStore() {
  const existing = document.getElementById('storeWindow');
  if (existing) { if (ST.isMin) stRestore(); return; }
  stBuildWindow();
  stInjectTaskbar();
  stSetupDrag();
  stSetupResize();
}

/* ════════════════════════════════════════════════════════════
   BUILD WINDOW
   ════════════════════════════════════════════════════════════ */
function stBuildWindow() {
  const win = document.createElement('div');
  win.id = 'storeWindow';
  win.style.cssText = `
    position:fixed; top:24px; left:80px;
    width:980px; height:620px;
    min-width:520px; min-height:380px;
    z-index:442;
    display:flex; flex-direction:column;
    background:#000;
    box-shadow:0 10px 48px rgba(0,0,0,.65), 0 2px 8px rgba(0,0,0,.4);
    border:1px solid rgba(255,255,255,.07);
    transform-origin:center bottom;
    animation:stOpen .22s cubic-bezier(.16,1,.3,1) both;
    font-family:'Segoe UI',Tahoma,sans-serif;
  `;

  win.innerHTML = `
    <style>
      @keyframes stOpen {
        from { opacity:0; transform:scale(.94) translateY(14px); }
        to   { opacity:1; transform:scale(1) translateY(0); }
      }
      @keyframes stMin {
        from { opacity:1; transform:scale(1) translateY(0); }
        to   { opacity:0; transform:scale(.4) translateY(100vh); }
      }
      #storeWindow.minimising { animation:stMin .2s cubic-bezier(.4,0,1,1) both; pointer-events:none; }
      #storeWindow.restoring  { animation:stOpen .22s cubic-bezier(.16,1,.3,1) both; }
      #storeWindow.maximised  { top:0!important;left:0!important;width:100vw!important;height:calc(100vh - 44px)!important;border:none; }

      /* ── Title bar ── */
      .st-titlebar {
        height:34px; flex-shrink:0;
        background:linear-gradient(to bottom, #1a1a2e, #0f0f1a);
        display:flex; align-items:center; padding:0 0 0 10px;
        cursor:default; gap:8px;
        border-bottom:1px solid rgba(255,255,255,.06);
      }
      .st-title-icon { font-size:16px; flex-shrink:0; }
      .st-title-text {
        font-size:13px; color:rgba(255,255,255,.85);
        font-weight:600; flex:1; letter-spacing:.5px;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }
      .st-title-sub {
        font-size:10px; color:rgba(255,255,255,.4);
        letter-spacing:1px; text-transform:uppercase; margin-right:4px;
      }
      .st-controls { display:flex; height:100%; }
      .st-btn {
        width:44px; height:100%;
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; font-size:15px; color:rgba(255,255,255,.65);
        border:none; background:transparent;
        font-family:'Segoe UI',Arial,sans-serif; line-height:1;
        transition:background .12s, color .12s;
      }
      .st-btn:hover       { background:rgba(255,255,255,.1); color:#fff; }
      .st-btn.close:hover { background:#e81123; color:#fff; }

      /* ── Nav bar ── */
      .st-navbar {
        height:40px; flex-shrink:0;
        background:#1a1a2e;
        border-bottom:1px solid rgba(255,255,255,.06);
        display:flex; align-items:center; padding:0 10px; gap:6px;
      }
      .st-nav-btn {
        height:28px; padding:0 8px;
        background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.1);
        color:rgba(255,255,255,.6); font-size:14px; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        border-radius:2px; transition:all .12s; flex-shrink:0;
        font-family:'Segoe UI',Arial,sans-serif; line-height:1;
      }
      .st-nav-btn:hover { background:rgba(255,255,255,.15); color:#fff; }
      .st-nav-btn.disabled { opacity:.3; pointer-events:none; }
      .st-url-bar {
        flex:1; display:flex; align-items:center;
        background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.1);
        height:28px; padding:0 10px; gap:6px;
        font-size:12px; color:rgba(255,255,255,.5);
        overflow:hidden; white-space:nowrap; text-overflow:ellipsis;
      }
      .st-url-icon { font-size:12px; opacity:.5; flex-shrink:0; }
      .st-open-btn {
        height:28px; padding:0 12px;
        background:#00a300; border:none; color:#fff;
        font-size:11px; cursor:pointer; font-family:inherit;
        transition:background .12s; flex-shrink:0; letter-spacing:.3px;
      }
      .st-open-btn:hover { background:#007a00; }

      /* ── iframe area ── */
      .st-content { flex:1; position:relative; background:#000; overflow:hidden; }
      .st-iframe  { width:100%; height:100%; border:none; display:block; }

      /* loading overlay */
      .st-loading {
        position:absolute; inset:0; z-index:5;
        display:flex; flex-direction:column;
        align-items:center; justify-content:center;
        background:#0a0a1a; gap:16px;
      }
      .st-spinner {
        width:36px; height:36px;
        border:3px solid rgba(255,255,255,.1);
        border-top-color:#00a300; border-radius:50%;
        animation:stSpin .8s linear infinite;
      }
      @keyframes stSpin { to { transform:rotate(360deg); } }
      .st-loading-text { font-size:13px; color:rgba(255,255,255,.45); }
      .st-loading-url  { font-size:11px; color:rgba(255,255,255,.25); }

      /* status bar */
      .st-statusbar {
        height:22px; flex-shrink:0;
        background:#0f0f1a; border-top:1px solid rgba(255,255,255,.05);
        display:flex; align-items:center; padding:0 12px; gap:16px;
      }
      .st-status-item { font-size:10px; color:rgba(255,255,255,.3); letter-spacing:.3px; }
      .st-status-dot  { width:6px; height:6px; border-radius:50%; background:#00a300; display:inline-block; margin-right:5px; }

      /* resize handle */
      .st-resize {
        position:absolute; bottom:0; right:0;
        width:16px; height:16px; cursor:se-resize; z-index:10;
      }
      .st-resize::after {
        content:''; position:absolute; bottom:3px; right:3px;
        width:8px; height:8px;
        border-right:2px solid rgba(255,255,255,.15);
        border-bottom:2px solid rgba(255,255,255,.15);
      }
    </style>

    <!-- Title bar -->
    <div class="st-titlebar" id="stTitleBar">
      <span class="st-title-icon">🛒</span>
      <span class="st-title-text">Windows Store</span>
      <span class="st-title-sub">Beta</span>
      <div class="st-controls">
        <button class="st-btn" onclick="stMinimise()" title="Minimise">&#x2014;</button>
        <button class="st-btn" id="stMaxBtn" onclick="stMaximise()" title="Maximise">&#x2610;</button>
        <button class="st-btn close" onclick="stClose()" title="Close">&#x2715;</button>
      </div>
    </div>

    <!-- Navigation bar -->
    <div class="st-navbar">
      <button class="st-nav-btn disabled" id="stBtnBack"    title="Back">&#x276E;</button>
      <button class="st-nav-btn disabled" id="stBtnForward" title="Forward">&#x276F;</button>
      <button class="st-nav-btn" onclick="stReload()" title="Reload">&#x21BA;</button>
      <div class="st-url-bar">
        <span class="st-url-icon">&#x1F512;</span>
        <span>${STORE_URL}</span>
      </div>
      <button class="st-open-btn" onclick="window.open('${STORE_URL}','_blank')" title="Open in new tab">
        Open in browser &#x2197;
      </button>
    </div>

    <!-- Content -->
    <div class="st-content">
      <!-- Loading overlay -->
      <div class="st-loading" id="stLoading">
        <div class="st-spinner"></div>
        <div class="st-loading-text">Loading Windows Store…</div>
        <div class="st-loading-url">${STORE_URL}</div>
      </div>
      <!-- The iframe -->
      <iframe
        class="st-iframe"
        id="stIframe"
        src="${STORE_URL}"
        title="Windows Store"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
        onload="stOnLoad()"
        onerror="stOnError()">
      </iframe>
    </div>

    <!-- Status bar -->
    <div class="st-statusbar">
      <span class="st-status-item"><span class="st-status-dot"></span>Connected</span>
      <span class="st-status-item" id="stStatusText">Loading…</span>
      <span class="st-status-item" style="margin-left:auto">Windows Store · Beta · by nx4real</span>
    </div>

    <!-- Resize handle -->
    <div class="st-resize" id="stResizeHandle"></div>`;

  document.body.appendChild(win);
  win.querySelector('#stTitleBar').addEventListener('dblclick', stMaximise);
}

/* ════════════════════════════════════════════════════════════
   IFRAME EVENTS
   ════════════════════════════════════════════════════════════ */
function stOnLoad() {
  const loading = document.getElementById('stLoading');
  const status  = document.getElementById('stStatusText');
  if (loading) loading.style.display = 'none';
  if (status)  status.textContent    = 'Windows Store loaded';
  if (typeof notify === 'function') notify('Windows Store is ready', 'Store');
}

function stOnError() {
  const loading = document.getElementById('stLoading');
  if (loading) {
    loading.innerHTML = `
      <div style="font-size:36px">🛒</div>
      <div style="font-size:15px;color:rgba(255,255,255,.7);font-weight:300">Could not load Windows Store</div>
      <div style="font-size:12px;color:rgba(255,255,255,.35);margin-top:4px;text-align:center;max-width:320px;line-height:1.6">
        The Store requires an internet connection.<br>
        <a href="${STORE_URL}" target="_blank"
           style="color:#00a300;text-decoration:none">${STORE_URL}</a>
      </div>
      <button onclick="stReload()"
        style="margin-top:14px;padding:7px 22px;background:#00a300;border:none;color:#fff;
               font-size:13px;cursor:pointer;font-family:'Segoe UI',Tahoma,sans-serif">
        Try again
      </button>`;
  }
}

function stReload() {
  const iframe  = document.getElementById('stIframe');
  const loading = document.getElementById('stLoading');
  const status  = document.getElementById('stStatusText');
  if (loading) {
    loading.style.display = 'flex';
    loading.innerHTML = `
      <div class="st-spinner" style="width:36px;height:36px;border:3px solid rgba(255,255,255,.1);border-top-color:#00a300;border-radius:50%;animation:stSpin .8s linear infinite"></div>
      <div class="st-loading-text" style="font-size:13px;color:rgba(255,255,255,.45)">Reloading…</div>`;
  }
  if (status) status.textContent = 'Loading…';
  if (iframe) iframe.src = STORE_URL + '?r=' + Date.now(); /* cache bust */
}

/* ════════════════════════════════════════════════════════════
   WINDOW CONTROLS
   ════════════════════════════════════════════════════════════ */
function stClose() {
  const win = document.getElementById('storeWindow');
  const tb  = document.getElementById('tbStore');
  if (!win) return;
  win.style.animation = 'stMin .2s cubic-bezier(.4,0,1,1) both';
  setTimeout(() => { win.remove(); if (tb) tb.remove(); }, 200);
}

function stMinimise() {
  const win = document.getElementById('storeWindow');
  const tb  = document.getElementById('tbStore');
  ST.isMin  = true;
  win.classList.add('minimising');
  setTimeout(() => {
    win.style.display = 'none';
    win.classList.remove('minimising');
    if (tb) tb.classList.add('minimised');
  }, 220);
}

function stRestore() {
  const win = document.getElementById('storeWindow');
  const tb  = document.getElementById('tbStore');
  win.style.display = 'flex';
  win.classList.add('restoring');
  setTimeout(() => win.classList.remove('restoring'), 220);
  ST.isMin = false;
  if (tb) tb.classList.remove('minimised');
}

function stMaximise() {
  const win = document.getElementById('storeWindow');
  const btn = document.getElementById('stMaxBtn');
  ST.isMax  = !ST.isMax;
  win.classList.toggle('maximised', ST.isMax);
  if (btn) btn.textContent = ST.isMax ? '\u29C9' : '\u2610';
}

function stToggleFromTaskbar() { if (ST.isMin) stRestore(); else stMinimise(); }

function stInjectTaskbar() {
  const tbLeft = document.getElementById('tbRunning');
  if (!tbLeft || document.getElementById('tbStore')) return;
  const el = document.createElement('div');
  el.id    = 'tbStore';
  el.className = 'tb-win-entry';
  el.className = 'tb-win-entry';
  el.title = 'Windows Store';
  el.style.cssText = `
    height:100%; display:flex; align-items:center;
    gap:6px; padding:0 10px; cursor:pointer;
    transition:background .15s; position:relative;
    min-width:100px; max-width:140px; flex-shrink:0;
  `;
  el.innerHTML = `
    <span style="font-size:14px">🛒</span>
    <span style="font-size:12px;color:rgba(255,255,255,.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Store</span>`;
  el.onclick = stToggleFromTaskbar;
  el.oncontextmenu = e => {
    e.preventDefault(); e.stopPropagation();
    if (typeof showTaskbarAppCtx === 'function') showTaskbarAppCtx(e, 'Windows Store', false);
  };
  /* running underline */
  const style = document.createElement('style');
  style.textContent = `
    #tbStore::after { content:''; position:absolute; bottom:0; left:10%; width:80%; height:2px; background:#00a300; }
    #tbStore:hover  { background:rgba(255,255,255,.1); }
    #tbStore.minimised::after { background:rgba(255,255,255,.3); }
  `;
  document.head.appendChild(style);
  tbLeft.appendChild(el);
}

/* ════════════════════════════════════════════════════════════
   DRAG
   ════════════════════════════════════════════════════════════ */
function stSetupDrag() {
  const tb = document.getElementById('stTitleBar');
  if (!tb) return;
  tb.addEventListener('mousedown', e => {
    if (e.target.closest('.st-controls') || ST.isMax) return;
    ST.drag.on = true;
    const win  = document.getElementById('storeWindow');
    const r    = win.getBoundingClientRect();
    ST.drag.ox = e.clientX - r.left;
    ST.drag.oy = e.clientY - r.top;
    win.style.transition = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!ST.drag.on) return;
    const win = document.getElementById('storeWindow');
    if (!win) { ST.drag.on = false; return; }
    let x = e.clientX - ST.drag.ox;
    let y = e.clientY - ST.drag.oy;
    x = Math.max(-win.offsetWidth + 80, Math.min(window.innerWidth - 80, x));
    y = Math.max(0, Math.min(window.innerHeight - 34, y));
    win.style.left = x + 'px';
    win.style.top  = y + 'px';
  });
  document.addEventListener('mouseup', () => { ST.drag.on = false; });
}

/* ════════════════════════════════════════════════════════════
   RESIZE
   ════════════════════════════════════════════════════════════ */
function stSetupResize() {
  const h = document.getElementById('stResizeHandle');
  if (!h) return;
  h.addEventListener('mousedown', e => {
    if (ST.isMax) return;
    ST.resize.on = true;
    const win = document.getElementById('storeWindow');
    ST.resize.sx = e.clientX; ST.resize.sy = e.clientY;
    ST.resize.sw = win.offsetWidth; ST.resize.sh = win.offsetHeight;
    e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('mousemove', e => {
    if (!ST.resize.on) return;
    const win = document.getElementById('storeWindow');
    if (!win) { ST.resize.on = false; return; }
    win.style.width  = Math.max(520, ST.resize.sw + (e.clientX - ST.resize.sx)) + 'px';
    win.style.height = Math.max(380, ST.resize.sh + (e.clientY - ST.resize.sy)) + 'px';
  });
  document.addEventListener('mouseup', () => { ST.resize.on = false; });
}
