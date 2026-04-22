/* ═══════════════════════════════════════════════════════════
   PC Settings  ·  settings.js
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════════════
   WALLPAPER CATALOGUE
   All files live in  wallpapers/  folder.
   Tell the user these filenames to upload.
   ════════════════════════════════════════════════════════════ */
const WALLPAPERS = [
  { id:'wp1',  file:'wallpapers/wp1.jpg',  label:'Mountain Lake'   },
  { id:'wp2',  file:'wallpapers/wp2.jpg',  label:'City Lights'     },
  { id:'wp3',  file:'wallpapers/wp3.jpg',  label:'Forest Path'     },
  { id:'wp4',  file:'wallpapers/wp4.jpg',  label:'Ocean Sunset'    },
  { id:'wp5',  file:'wallpapers/wp5.jpg',  label:'Desert Dunes'    },
  { id:'wp6',  file:'wallpapers/wp6.jpg',  label:'Snow Peaks'      },
  { id:'wp7',  file:'wallpapers/wp7.jpg',  label:'Autumn Leaves'   },
  { id:'wp8',  file:'wallpapers/wp8.jpg',  label:'Night Sky'       },
  { id:'wp9',  file:'wallpapers/wp9.jpg',  label:'Tropical Beach'  },
  { id:'wp10', file:'wallpapers/wp10.jpg', label:'Abstract Blue'   },
  /* your existing wallpaper — always in the list */
  { id:'wp0',  file:'67.jpg',              label:'Default'         },
];

/* ════════════════════════════════════════════════════════════
   START SCREEN ACCENT COLOURS
   ════════════════════════════════════════════════════════════ */
const ACCENT_COLOURS = [
  '#008299','#0078d7','#004e8c','#7700cc','#e3008c',
  '#e81123','#fa6800','#ffb900','#00a300','#99b433',
  '#2d89ef','#1ba1e2','#006672','#2d2d30','#525252',
  '#4a154b','#bf5af2','#32d74b','#ff9f0a','#ff453a',
];

/* ════════════════════════════════════════════════════════════
   APP STATE
   ════════════════════════════════════════════════════════════ */
const state = {
  desktopWallpaper : '67.jpg',
  lockWallpaper    : '67.jpg',
  accentColour     : '#008299',
  userName         : 'Neel Patel',
  userPic          : 'user.png',
  notifications    : { lock:true, apps:true, sounds:true },
  brightness       : 80,
  activePage       : 'personalise',
  persTab          : 'lock',          /* lock | start | account */
};

/* ════════════════════════════════════════════════════════════
   OPEN / CLOSE
   ════════════════════════════════════════════════════════════ */
function openSettings(startPage) {
  const win = document.getElementById('settingsWindow');
  if (!win) { buildSettingsWindow(); }

  document.getElementById('settingsWindow').classList.add('open');
  switchPage(startPage || 'personalise');
  applyUserPic();     /* make sure avatar always reflects state */
}

function closeSettings() {
  const win = document.getElementById('settingsWindow');
  if (!win) return;
  win.classList.remove('open');
  win.classList.add('closing');
  setTimeout(() => {
    win.classList.remove('closing');
    win.style.display = 'none';
  }, 260);
}

/* ════════════════════════════════════════════════════════════
   BUILD WINDOW DOM  (once)
   ════════════════════════════════════════════════════════════ */
function buildSettingsWindow() {

  const NAV_ITEMS = [
    { id:'personalise',    label:'Personalise'       },
    { id:'notifications',  label:'Notifications'     },
    { id:'search',         label:'Search'            },
    { id:'share',          label:'Share'             },
    { id:'general',        label:'General'           },
    { id:'privacy',        label:'Privacy'           },
    { id:'devices',        label:'Devices'           },
    { id:'wireless',       label:'Wireless'          },
    { id:'easeofaccess',   label:'Ease of Access'    },
    { id:'sync',           label:'Sync your settings'},
    { id:'homegroup',      label:'HomeGroup'         },
    { id:'windowsupdate',  label:'Windows Update'    },
  ];

  const navHTML = NAV_ITEMS.map(n =>
    `<div class="pcs-nav-item" id="nav-${n.id}" onclick="switchPage('${n.id}')">${n.label}</div>`
  ).join('');

  const win = document.createElement('div');
  win.id = 'settingsWindow';
  win.innerHTML = `
    <!-- Sidebar -->
    <div class="pcs-sidebar">
      <div class="pcs-title">PC settings</div>
      ${navHTML}
    </div>

    <!-- Close button -->
    <div class="pcs-close" onclick="closeSettings()" title="Close">&#x2715;</div>

    <!-- Content -->
    <div class="pcs-content" id="pcsContent">

      <!-- ══ PERSONALISE ══ -->
      <div class="pcs-page" id="page-personalise">
        <div class="pers-tabs">
          <div class="pers-tab active" id="ptab-lock"    onclick="persSwitchTab('lock')">Lock screen</div>
          <div class="pers-tab"        id="ptab-start"   onclick="persSwitchTab('start')">Start screen</div>
          <div class="pers-tab"        id="ptab-account" onclick="persSwitchTab('account')">Account picture</div>
        </div>

        <!-- LOCK SCREEN TAB -->
        <div id="persTab-lock">
          <div style="display:flex;gap:32px;flex-wrap:wrap;align-items:flex-start">
            <div>
              <div class="pers-preview-wrap" id="lockPreviewWrap">
                <img class="pers-preview-img" id="lockPreviewImg" src="${state.lockWallpaper}" alt="Lock wallpaper">
                <div class="pers-preview-overlay">
                  <div class="pers-preview-time" id="persLockTime">16:55</div>
                  <div class="pers-preview-date" id="persLockDate">Friday, 9 November</div>
                </div>
              </div>
            </div>
            <div style="flex:1;min-width:200px">
              <div class="pers-wp-label">Choose a photo</div>
              <div class="pers-wp-strip" id="lockWpStrip"></div>
              <button class="pers-browse-btn" onclick="browseWallpaper('lock')">Browse</button>
            </div>
          </div>

          <div class="pers-section-title">Lock screen apps</div>
          <div class="pers-section-sub">Choose apps to run in the background and show quick status<br>and notifications, even when your screen is locked.</div>
          <div class="pers-lock-apps" id="lockApps">
            <div class="pers-lock-app"><img src="icons/mail.png" alt="Mail"></div>
            <div class="pers-lock-app"><img src="icons/calendar.png" alt="Calendar"></div>
            <div class="pers-lock-app"><img src="icons/messaging.png" alt="Messaging"></div>
            <div class="pers-lock-app">&#x2B;</div>
          </div>
        </div>

        <!-- START SCREEN TAB -->
        <div id="persTab-start" style="display:none">
          <div class="pers-wp-label">Background colour</div>
          <div class="pers-start-preview" id="startPreviewBox">
            <div class="pers-start-tiles-demo" id="startTilesDemo">
              <div class="pers-demo-tile w2" style="background:rgba(255,255,255,.25)"></div>
              <div class="pers-demo-tile" style="background:rgba(255,255,255,.18)"></div>
              <div class="pers-demo-tile" style="background:rgba(255,255,255,.18)"></div>
              <div class="pers-demo-tile" style="background:rgba(255,255,255,.14)"></div>
              <div class="pers-demo-tile" style="background:rgba(255,255,255,.14)"></div>
              <div class="pers-demo-tile w2" style="background:rgba(255,255,255,.2)"></div>
              <div class="pers-demo-tile" style="background:rgba(255,255,255,.22)"></div>
              <div class="pers-demo-tile" style="background:rgba(255,255,255,.22)"></div>
            </div>
          </div>

          <div class="pers-wp-label">Accent colour</div>
          <div class="pers-colour-grid" id="accentGrid"></div>

          <div class="pers-wp-label" style="margin-top:16px">Start screen wallpaper</div>
          <div class="pers-wp-strip" id="startWpStrip"></div>
          <button class="pers-browse-btn" onclick="browseWallpaper('start')">Browse</button>
        </div>

        <!-- ACCOUNT PICTURE TAB -->
        <div id="persTab-account" style="display:none">
          <div class="pers-account-wrap">
            <div class="pers-account-current">
              <img class="pers-account-pic" id="accountPicImg" src="${state.userPic}" alt="Account picture"
                   onerror="this.src='icons/computer.png'">
              <div class="pers-account-name" id="accountNameLabel">${state.userName}</div>
              <div class="pers-account-sub">Local Account</div>
            </div>
            <div class="pers-account-options">
              <button class="pers-account-opt-btn" onclick="browseAccountPic()">Browse for a photo</button>
              <button class="pers-account-opt-btn" onclick="notify('Camera not available in web','Camera')">Take a photo</button>
              <button class="pers-account-opt-btn" onclick="notify('Crop tool coming soon','Account')">Crop picture</button>
            </div>
          </div>

          <!-- ── PASSWORD SECTION ── -->
          <div style="margin-top:28px;padding-top:20px;border-top:1px solid #d0d0d0">
            <div class="pcs-section-label" style="font-size:14px;font-weight:600;color:#333;margin-bottom:16px;text-transform:none;letter-spacing:0;border:none;padding:0">Sign-in options</div>

            <div class="pcs-setting-row">
              <div>
                <div class="pcs-setting-label">Password</div>
                <div class="pcs-setting-sub" id="pwStatusLabel">
                  ${typeof lockPassword !== 'undefined' && lockPassword ? 'Password is set' : 'No password — anyone can sign in'}
                </div>
              </div>
              <button class="pers-browse-btn" onclick="settingsChangePassword()">Change</button>
            </div>

            <!-- inline password form (hidden by default) -->
            <div id="settingsPwForm" style="display:none;flex-direction:column;gap:10px;margin-top:12px;padding:16px;background:#f8f8f8;border:1px solid #e0e0e0">
              <div style="font-size:13px;color:#555;margin-bottom:4px">Change your password</div>

              <div style="display:flex;align-items:center;gap:10px">
                <label style="font-size:12px;color:#555;width:140px;flex-shrink:0">Current password</label>
                <input id="pwCurrent" type="password" placeholder="Leave blank if none"
                       style="flex:1;padding:6px 10px;font-size:13px;border:1px solid #ccc;outline:none;font-family:inherit">
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <label style="font-size:12px;color:#555;width:140px;flex-shrink:0">New password</label>
                <input id="pwNew" type="password" placeholder="Leave blank to remove password"
                       style="flex:1;padding:6px 10px;font-size:13px;border:1px solid #ccc;outline:none;font-family:inherit">
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <label style="font-size:12px;color:#555;width:140px;flex-shrink:0">Confirm new password</label>
                <input id="pwConfirm" type="password" placeholder="Re-enter new password"
                       style="flex:1;padding:6px 10px;font-size:13px;border:1px solid #ccc;outline:none;font-family:inherit">
              </div>
              <div id="pwError" style="font-size:12px;color:#e81123;min-height:16px"></div>
              <div style="display:flex;gap:8px;justify-content:flex-end">
                <button class="pers-browse-btn" onclick="settingsCancelPassword()">Cancel</button>
                <button class="pers-account-opt-btn" style="padding:6px 20px" onclick="settingsSavePassword()">Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ NOTIFICATIONS ══ -->
      <div class="pcs-page" id="page-notifications">
        <div class="pcs-page-title">Notifications</div>
        ${buildToggleRow('Show app notifications','notiApps',true)}
        ${buildToggleRow('Show notifications on the lock screen','notiLock',true)}
        ${buildToggleRow('Play a sound when a notification arrives','notiSound',true)}
        ${buildToggleRow('Show notification banners','notiBanner',true)}
        ${buildToggleRow('Show notification count on taskbar','notiCount',false)}
      </div>

      <!-- ══ SEARCH ══ -->
      <div class="pcs-page" id="page-search">
        <div class="pcs-page-title">Search</div>
        ${buildToggleRow('Let Windows save my searches to improve future searches','srchSave',true)}
        ${buildToggleRow('Use Bing to search online','srchBing',true)}
        ${buildToggleRow('Get search suggestions and web results from Bing','srchSugg',true)}
        <div class="pcs-setting-row">
          <div><div class="pcs-setting-label">SafeSearch</div>
          <div class="pcs-setting-sub">Filter adult content from search results</div></div>
          <select style="padding:4px 8px;font-size:13px;border:1px solid #ccc">
            <option>Moderate</option><option>Strict</option><option>Off</option>
          </select>
        </div>
      </div>

      <!-- ══ GENERAL ══ -->
      <div class="pcs-page" id="page-general">
        <div class="pcs-page-title">General</div>
        ${buildToggleRow('Automatic updates for apps','genUpdates',true)}
        ${buildToggleRow('Use the Windows key to search from anywhere','genWinKey',true)}
        ${buildToggleRow('Show the clock on the lock screen','genClock',true)}
        <div class="pcs-setting-row">
          <div><div class="pcs-setting-label">Screen brightness</div>
          <div class="pcs-setting-sub">Adjust the screen brightness</div></div>
          <input type="range" class="pcs-slider" min="10" max="100" value="80"
                 oninput="adjustBrightness(this.value)">
        </div>
        ${buildToggleRow('Autocorrect misspellings','genSpell',false)}
      </div>

      <!-- ══ PRIVACY ══ -->
      <div class="pcs-page" id="page-privacy">
        <div class="pcs-page-title">Privacy</div>
        ${buildToggleRow('Let apps use my location','privLoc',false)}
        ${buildToggleRow('Let apps use my name and account picture','privName',true)}
        ${buildToggleRow('Let Windows and apps request my feedback','privFeed',true)}
        ${buildToggleRow('Send Microsoft info to help improve Windows','privDiag',false)}
      </div>

      <!-- ══ DEVICES ══ -->
      <div class="pcs-page" id="page-devices">
        <div class="pcs-page-title">Devices</div>
        <div class="pcs-setting-row"><div><div class="pcs-setting-label">&#x1F5A8; Printer</div><div class="pcs-setting-sub">No printer connected</div></div><button class="pers-browse-btn" onclick="notify('Add device…','Devices')">Add a device</button></div>
        <div class="pcs-setting-row"><div><div class="pcs-setting-label">&#x1F3A7; Bluetooth</div><div class="pcs-setting-sub">No paired devices</div></div><button class="pers-browse-btn" onclick="notify('Searching for Bluetooth…','Devices')">Search</button></div>
        <div class="pcs-setting-row"><div><div class="pcs-setting-label">&#x1F4F1; Mobile device</div><div class="pcs-setting-sub">No device connected</div></div><button class="pers-browse-btn" onclick="notify('Connect device…','Devices')">Connect</button></div>
      </div>

      <!-- ══ WIRELESS ══ -->
      <div class="pcs-page" id="page-wireless">
        <div class="pcs-page-title">Wireless</div>
        ${buildToggleRow('Wi-Fi','wifiOn',true)}
        ${buildToggleRow('Bluetooth','btOn',false)}
        ${buildToggleRow('Airplane mode','airplaneMode',false)}
      </div>

      <!-- ══ EASE OF ACCESS ══ -->
      <div class="pcs-page" id="page-easeofaccess">
        <div class="pcs-page-title">Ease of Access</div>
        ${buildToggleRow('High contrast','eaHighContrast',false)}
        ${buildToggleRow('Make text larger','eaLargeText',false)}
        ${buildToggleRow('Narrator','eaNarrator',false)}
        ${buildToggleRow('Keyboard shortcuts','eaKeyboard',true)}
      </div>

      <!-- ══ SYNC ══ -->
      <div class="pcs-page" id="page-sync">
        <div class="pcs-page-title">Sync your settings</div>
        ${buildToggleRow('Sync settings on this PC','syncAll',true)}
        ${buildToggleRow('Personalisation','syncPers',true)}
        ${buildToggleRow('Passwords','syncPass',false)}
        ${buildToggleRow('Language preferences','syncLang',true)}
        ${buildToggleRow('Ease of Access','syncEase',true)}
      </div>

      <!-- ══ HOMEGROUP ══ -->
      <div class="pcs-page" id="page-homegroup">
        <div class="pcs-page-title">HomeGroup</div>
        <div class="pcs-setting-row"><div class="pcs-setting-label">Status</div><span style="color:#008299;font-weight:600">Not connected</span></div>
        <div style="margin-top:16px"><button class="pers-browse-btn" onclick="notify('Creating HomeGroup…','HomeGroup')">Create a homegroup</button></div>
      </div>

      <!-- ══ WINDOWS UPDATE ══ -->
      <div class="pcs-page" id="page-windowsupdate">
        <div class="pcs-page-title">Windows Update</div>
        <div class="pcs-setting-row"><div class="pcs-setting-label">Status</div><span style="color:#107c10;font-weight:600">&#x2705; Windows is up to date</span></div>
        <div class="pcs-setting-row"><div class="pcs-setting-label">Last checked</div><span id="wuLastCheck" style="color:#555"></span></div>
        ${buildToggleRow('Install updates automatically','wuAuto',true)}
        <div style="margin-top:16px"><button class="pers-browse-btn" onclick="notify('Checking for updates…','Windows Update')">Check for updates</button></div>
      </div>

      <!-- ══ SHARE ══ -->
      <div class="pcs-page" id="page-share">
        <div class="pcs-page-title">Share</div>
        ${buildToggleRow('Share content with nearby apps','shareNearby',true)}
        ${buildToggleRow('Show apps I use most often at top of share list','shareTop',true)}
      </div>

    </div><!-- /pcs-content -->
  `;
  document.body.appendChild(win);

  /* stamp today's date on Windows Update */
  const wuDate = document.getElementById('wuLastCheck');
  if (wuDate) wuDate.textContent = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});

  /* build wallpaper strips */
  buildWpStrip('lockWpStrip',  'lock');
  buildWpStrip('startWpStrip', 'start');

  /* build accent colour grid */
  buildAccentGrid();

  /* live preview clock tick */
  setInterval(updatePersPreviewClock, 1000);
  updatePersPreviewClock();
}

/* ────────────────────────────────────────────────
   Helper: build a toggle-switch setting row
   ──────────────────────────────────────────────── */
function buildToggleRow(label, id, defaultOn) {
  return `
  <div class="pcs-setting-row">
    <div class="pcs-setting-label">${label}</div>
    <label class="pcs-toggle">
      <input type="checkbox" id="tog-${id}" ${defaultOn?'checked':''}>
      <div class="pcs-toggle-track"></div>
      <div class="pcs-toggle-thumb"></div>
    </label>
  </div>`;
}

/* ════════════════════════════════════════════════════════════
   PAGE SWITCHING
   ════════════════════════════════════════════════════════════ */
function switchPage(id) {
  state.activePage = id;

  document.querySelectorAll('.pcs-nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById('nav-' + id);
  if (navEl) navEl.classList.add('active');

  document.querySelectorAll('.pcs-page').forEach(el => el.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
}

/* ════════════════════════════════════════════════════════════
   PERSONALISE SUB-TABS
   ════════════════════════════════════════════════════════════ */
function persSwitchTab(tab) {
  state.persTab = tab;
  ['lock','start','account'].forEach(t => {
    const tabEl = document.getElementById('ptab-' + t);
    const panEl = document.getElementById('persTab-' + t);
    if (tabEl) tabEl.classList.toggle('active', t === tab);
    if (panEl) panEl.style.display = (t === tab) ? '' : 'none';
  });
}

/* ════════════════════════════════════════════════════════════
   WALLPAPER STRIP
   ════════════════════════════════════════════════════════════ */
function buildWpStrip(containerId, target) {
  const strip = document.getElementById(containerId);
  if (!strip) return;
  strip.innerHTML = '';

  WALLPAPERS.forEach(wp => {
    const img = document.createElement('img');
    img.className  = 'pers-wp-thumb';
    img.src        = wp.file;
    img.alt        = wp.label;
    img.title      = wp.label;
    img.dataset.id = wp.id;
    img.onerror    = function() { this.style.display='none'; };

    const currentWp = target === 'lock' ? state.lockWallpaper : state.desktopWallpaper;
    if (wp.file === currentWp) img.classList.add('active');

    img.onclick = () => applyWallpaper(wp.file, target, img, containerId);
    strip.appendChild(img);
  });
}

/* ════════════════════════════════════════════════════════════
   APPLY WALLPAPER  — live, instant change
   ════════════════════════════════════════════════════════════ */
function applyWallpaper(file, target, thumbEl, stripId) {
  /* update active thumb */
  document.querySelectorAll(`#${stripId} .pers-wp-thumb`).forEach(t => t.classList.remove('active'));
  if (thumbEl) thumbEl.classList.add('active');

  if (target === 'lock') {
    state.lockWallpaper = file;

    /* update lock screen background via layer system */
    if (typeof setLockWallpaperOverride === 'function') {
      setLockWallpaperOverride(file);
    } else {
      const lock = document.getElementById('lockScreen');
      if (lock) lock.style.backgroundImage = `url('${file}')`;
    }

    /* update preview */
    const prev = document.getElementById('lockPreviewImg');
    if (prev) {
      prev.style.opacity = '0';
      setTimeout(() => { prev.src = file; prev.style.opacity = '1'; }, 200);
    }

  } else {
    state.desktopWallpaper = file;

    /* update desktop background LIVE */
    const desktop = document.getElementById('desktop');
    if (desktop) {
      desktop.style.backgroundImage = `url('${file}')`;
    }

    /* update start screen background LIVE */
    const ss = document.getElementById('startScreen');
    if (ss) {
      ss.style.backgroundImage =
        `linear-gradient(to bottom, rgba(20,26,30,.92), rgba(18,22,26,.90)), url('${file}')`;
    }
  }

  if (typeof notify === 'function') notify(`Wallpaper applied`, 'Personalise');
}

/* ════════════════════════════════════════════════════════════
   BROWSE — file picker (upload from device)
   ════════════════════════════════════════════════════════════ */
function browseWallpaper(target) {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = 'image/*';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    applyWallpaper(url, target, null, target==='lock'?'lockWpStrip':'startWpStrip');
  };
  input.click();
}

function browseAccountPic() {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = 'image/*';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    state.userPic = url;
    applyUserPic();
    if (typeof notify === 'function') notify('Account picture updated', 'Account');
  };
  input.click();
}

/* ════════════════════════════════════════════════════════════
   APPLY USER PICTURE  — updates everywhere
   ════════════════════════════════════════════════════════════ */
function applyUserPic() {
  /* settings account tab */
  const accImg = document.getElementById('accountPicImg');
  if (accImg) accImg.src = state.userPic;

  /* start screen avatar */
  const avatar = document.querySelector('.ss-avatar');
  if (avatar) {
    avatar.innerHTML = `<img src="${state.userPic}" alt="User"
      onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>'">`;
  }
}

/* ════════════════════════════════════════════════════════════
   ACCENT COLOUR GRID
   ════════════════════════════════════════════════════════════ */
function buildAccentGrid() {
  const grid = document.getElementById('accentGrid');
  if (!grid) return;
  grid.innerHTML = '';

  ACCENT_COLOURS.forEach(colour => {
    const sw = document.createElement('div');
    sw.className = 'pers-colour-swatch';
    sw.style.background = colour;
    sw.title = colour;
    if (colour === state.accentColour) sw.classList.add('active');
    sw.onclick = () => applyAccent(colour, sw);
    grid.appendChild(sw);
  });

  updateStartPreview();
}

function applyAccent(colour, swatchEl) {
  state.accentColour = colour;

  document.querySelectorAll('.pers-colour-swatch').forEach(s => s.classList.remove('active'));
  if (swatchEl) swatchEl.classList.add('active');

  /* apply to start screen preview box */
  updateStartPreview();

  /* live: update CSS variable used across the whole app */
  document.documentElement.style.setProperty('--accent-live', colour);

  /* tint the start screen nav active item */
  const navActive = document.querySelector('.pcs-nav-item.active');
  if (navActive) navActive.style.background = colour;

  if (typeof notify === 'function') notify('Accent colour applied', 'Personalise');
}

function updateStartPreview() {
  const box = document.getElementById('startPreviewBox');
  if (box) box.style.background = state.accentColour;
}

/* ════════════════════════════════════════════════════════════
   PERSONALISE PREVIEW CLOCK
   ════════════════════════════════════════════════════════════ */
function updatePersPreviewClock() {
  const now  = new Date();
  const hm   = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false });
  const date = now.toLocaleDateString('en-US',  { weekday:'long', day:'numeric', month:'long' });

  const timeEl = document.getElementById('persLockTime');
  const dateEl = document.getElementById('persLockDate');
  if (timeEl) timeEl.textContent = hm;
  if (dateEl) dateEl.textContent = date;
}

/* ════════════════════════════════════════════════════════════
   BRIGHTNESS
   ════════════════════════════════════════════════════════════ */
function adjustBrightness(val) {
  state.brightness = val;
  /* simulate by adjusting desktop overlay opacity */
  const overlay = document.getElementById('desktopBrightnessOverlay');
  if (overlay) {
    overlay.style.opacity = (1 - (val / 100)) * 0.6;
  }
}

/* inject a brightness overlay onto the desktop when settings first loads */
(function injectBrightnessOverlay() {
  const existing = document.getElementById('desktopBrightnessOverlay');
  if (existing) return;
  const ov = document.createElement('div');
  ov.id = 'desktopBrightnessOverlay';
  ov.style.cssText =
    'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:5;transition:opacity .3s';
  document.body.appendChild(ov);
})();

/* ════════════════════════════════════════════════════════════
   INIT  — apply user.png to avatar on page load
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* swap FA icon in avatar to real user.png */
  applyUserPic();
});

/* ════════════════════════════════════════════════════════════
   PASSWORD MANAGEMENT (in Settings)
   ════════════════════════════════════════════════════════════ */
function settingsChangePassword() {
  const form = document.getElementById('settingsPwForm');
  if (!form) return;
  form.style.display = form.style.display === 'none' ? 'flex' : 'none';
  const err = document.getElementById('pwError');
  if (err) err.textContent = '';
  /* pre-fill hint if no current password */
  const cur = document.getElementById('pwCurrent');
  if (cur && !lockPassword) cur.placeholder = 'No current password — leave blank';
}

function settingsCancelPassword() {
  const form = document.getElementById('settingsPwForm');
  if (form) form.style.display = 'none';
  ['pwCurrent','pwNew','pwConfirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const err = document.getElementById('pwError');
  if (err) err.textContent = '';
}

function settingsSavePassword() {
  const curEl  = document.getElementById('pwCurrent');
  const newEl  = document.getElementById('pwNew');
  const confEl = document.getElementById('pwConfirm');
  const errEl  = document.getElementById('pwError');
  if (!newEl || !confEl) return;

  const cur  = curEl?.value  || '';
  const nw   = newEl.value   || '';
  const conf = confEl.value  || '';

  /* validate current password */
  if (lockPassword && cur !== lockPassword) {
    if (errEl) errEl.textContent = 'Current password is incorrect.';
    curEl?.classList.add('pcs-input-error');
    return;
  }

  /* validate new passwords match */
  if (nw !== conf) {
    if (errEl) errEl.textContent = 'Passwords do not match.';
    return;
  }

  /* save */
  if (typeof setLockPassword === 'function') setLockPassword(nw);
  else lockPassword = nw;

  /* update status label */
  const statusLabel = document.getElementById('pwStatusLabel');
  if (statusLabel) statusLabel.textContent = nw
    ? 'Password is set'
    : 'No password — anyone can sign in';

  settingsCancelPassword();
  if (typeof saveState === 'function') saveState();

  /* success notification */
  if (typeof notify === 'function') {
    notify(nw ? 'Password changed successfully' : 'Password removed', 'Sign-in options');
  }
}

/* ════════════════════════════════════════════════════════════
   HOOK SAVE STATE into all settings changes
   ════════════════════════════════════════════════════════════ */

/* Patch applyWallpaper to also save */
const _origApplyWallpaper = applyWallpaper;
applyWallpaper = function(file, target, thumbEl, stripId) {
  _origApplyWallpaper(file, target, thumbEl, stripId);
  if (typeof saveState === 'function') saveState();
};

/* Patch applyAccent to also save */
const _origApplyAccent = applyAccent;
applyAccent = function(colour, swatchEl) {
  _origApplyAccent(colour, swatchEl);
  if (typeof saveState === 'function') saveState();
};

/* Patch browseAccountPic to also save */
const _origBrowseAccountPic = browseAccountPic;
browseAccountPic = function() {
  _origBrowseAccountPic();
  /* save happens after FileReader loads — patch applyUserPic too */
};

const _origApplyUserPic = applyUserPic;
applyUserPic = function() {
  _origApplyUserPic();
  if (typeof saveState === 'function') saveState();
};

/* ════════════════════════════════════════════════════════════
   LOAD SAVED STATE on DOMContentLoaded
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof loadState === 'function') {
    const saved = loadState();
    if (saved && typeof applyLoadedState === 'function') {
      applyLoadedState(saved);
    }
  }
});
