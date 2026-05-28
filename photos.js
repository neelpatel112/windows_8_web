/* ════════════════════════════════════════════════════════════
   Windows 8 Photos App  ·  photos.js
   Full-screen Metro-style photo viewer with gallery hub
   ════════════════════════════════════════════════════════════ */
'use strict';

/* ── STATE ── */
const PHOTOS = {
  open       : false,
  minimised  : false,
  maximised  : true,   /* Photos opens full-screen by default — authentic Win8 */
  viewMode   : 'hub',  /* 'hub' | 'viewer' */
  library    : [],     /* all photos known to the app */
  currentIdx : 0,      /* index into library currently viewed */
  slideshow  : false,
  slideshowTimer: null,
  zoomLevel  : 1,
  dragX: 0, dragY: 0, dragging: false,
  unsub      : null,
};

/* Built-in photo library — photos/ directory */
const PHOTOS_BUILTIN = Array.from({ length: 10 }, (_, i) => ({
  id    : `builtin-photo-${i+1}`,
  name  : `Photo ${i+1}`,
  src   : `photos/${i+1}.jpg`,
  type  : 'builtin',
  thumb : `photos/${i+1}.jpg`,
}));

/* ── OPEN ── */
function openPhotos(startItem) {
  if (PHOTOS.open) {
    if (PHOTOS.minimised) _photosRestore();
    const win = document.getElementById('photosApp');
    if (win) win.style.zIndex = '420';
    if (startItem) _photosOpenViewer(startItem);
    return;
  }
  PHOTOS.open = true;
  _photosBuildLibrary();
  _photosBuildWindow();
  _photosAttachTaskbar();

  if (startItem) {
    setTimeout(() => _photosOpenViewer(startItem), 50);
  }

  /* subscribe to VFS so new drops appear in gallery */
  PHOTOS.unsub = VFS.subscribe(loc => {
    if (['Desktop','Pictures','Documents','Downloads'].includes(loc)) {
      _photosBuildLibrary();
      if (PHOTOS.viewMode === 'hub') _photosRenderHub();
    }
  });
}

/* ── BUILD LIBRARY (builtin + VFS images) ── */
function _photosBuildLibrary() {
  const IMG_EXTS = ['jpg','jpeg','png','gif','webp','bmp','svg'];
  const vfsImages = [];
  ['Desktop','Pictures','Documents','Downloads','Music','Videos'].forEach(loc => {
    VFS.list(loc).forEach(item => {
      const ext = (item.name||'').split('.').pop().toLowerCase();
      if (!IMG_EXTS.includes(ext)) return;
      vfsImages.push({
        id   : item.id,
        name : item.name,
        src  : item.blobUrl || item.src || `photos/${item.name}`,
        thumb: item.blobUrl || item.src || `photos/${item.name}`,
        type : 'vfs',
        vfsItem: item,
      });
    });
  });
  PHOTOS.library = [...PHOTOS_BUILTIN, ...vfsImages];
}

/* ── BUILD WINDOW ── */
function _photosBuildWindow() {
  const win = document.createElement('div');
  win.id = 'photosApp';
  win.className = 'photos-app';
  win.innerHTML = `
    <!-- CHROME BAR (thin, shows on hover) -->
    <div class="pa-chrome" id="paChrome">
      <div class="pa-chrome-left">
        <button class="pa-chrome-btn" id="paBackBtn" onclick="_photosBack()" title="Back">
          <i class="fas fa-arrow-left"></i>
        </button>
        <span class="pa-chrome-title" id="paTitle">Photos</span>
      </div>
      <div class="pa-chrome-right">
        <button class="pa-chrome-btn" onclick="_photosMinimise()" title="Minimise">&#x2014;</button>
        <button class="pa-chrome-btn" onclick="_photosToggleMax()" id="paMaxBtn" title="Restore">&#x2750;</button>
        <button class="pa-chrome-btn pa-close" onclick="_photosClose()" title="Close">&#x2715;</button>
      </div>
    </div>

    <!-- HUB VIEW -->
    <div class="pa-hub" id="paHub">
      <div class="pa-hub-header">
        <h1 class="pa-hub-title">Photos</h1>
        <div class="pa-hub-tabs">
          <div class="pa-hub-tab active" data-tab="collection" onclick="_photosHubTab(this)">Collection</div>
          <div class="pa-hub-tab" data-tab="albums" onclick="_photosHubTab(this)">Albums</div>
        </div>
      </div>
      <div class="pa-hub-grid" id="paHubGrid">
        <!-- filled by _photosRenderHub() -->
      </div>
    </div>

    <!-- VIEWER VIEW -->
    <div class="pa-viewer" id="paViewer" style="display:none">
      <!-- Main image -->
      <div class="pa-img-wrap" id="paImgWrap">
        <img id="paMainImg" src="" alt="" draggable="false"
             ondblclick="_photosToggleZoom()"
             onerror="this.src='icons/file-image.png';this.style.objectFit='contain';this.style.width='80px'">
      </div>

      <!-- Bottom controls bar -->
      <div class="pa-controls" id="paControls">
        <div class="pa-ctrl-left">
          <button class="pa-ctrl-btn" onclick="_photosDelete()" title="Delete">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
        <div class="pa-ctrl-center">
          <button class="pa-ctrl-btn pa-ctrl-nav" onclick="_photosNav(-1)" title="Previous">
            <i class="fas fa-chevron-left"></i>
          </button>
          <button class="pa-ctrl-btn pa-ctrl-play" id="paSlideshowBtn"
                  onclick="_photosToggleSlideshow()" title="Slideshow">
            <i class="fas fa-play" id="paSlideshowIcon"></i>
          </button>
          <button class="pa-ctrl-btn pa-ctrl-nav" onclick="_photosNav(1)" title="Next">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        <div class="pa-ctrl-right">
          <button class="pa-ctrl-btn" onclick="_photosZoomOut()" title="Zoom out">
            <i class="fas fa-search-minus"></i>
          </button>
          <button class="pa-ctrl-btn" onclick="_photosZoomIn()" title="Zoom in">
            <i class="fas fa-search-plus"></i>
          </button>
          <button class="pa-ctrl-btn" onclick="_photosRotate()" title="Rotate">
            <i class="fas fa-redo"></i>
          </button>
          <button class="pa-ctrl-btn" onclick="_photosCrop()" title="Set as wallpaper">
            <i class="fas fa-desktop"></i>
          </button>
          <button class="pa-ctrl-btn" onclick="_photosShare()" title="Share">
            <i class="fas fa-share-alt"></i>
          </button>
        </div>
      </div>

      <!-- Film strip -->
      <div class="pa-filmstrip" id="paFilmstrip">
        <!-- filled by _photosRenderFilmstrip() -->
      </div>

      <!-- Counter -->
      <div class="pa-counter" id="paCounter">1 / 1</div>
    </div>
  `;
  document.body.appendChild(win);

  /* Show chrome on mouse move */
  win.addEventListener('mousemove', _photosShowChrome);
  _photosRenderHub();
}

/* ── TASKBAR ── */
function _photosAttachTaskbar() {
  const tb = document.getElementById('tbRunning');
  if (!tb) return;
  const entry = document.createElement('div');
  entry.className = 'tb-win-entry';
  entry.id = 'tbPhotos';
  entry.innerHTML = `<img src="icons/photos.png" alt="Photos" onerror="this.style.display='none'"><span>Photos</span>`;
  entry.onclick = () => PHOTOS.minimised ? _photosRestore() : _photosMinimise();
  tb.appendChild(entry);
}

/* ── HUB ── */
function _photosRenderHub() {
  const grid = document.getElementById('paHubGrid');
  if (!grid) return;
  grid.innerHTML = '';
  PHOTOS.library.forEach((photo, idx) => {
    const tile = document.createElement('div');
    tile.className = 'pa-tile';
    tile.style.animationDelay = Math.min(idx * 30, 400) + 'ms';
    tile.innerHTML = `
      <img src="${photo.src}" alt="${_phEsc(photo.name)}"
           onerror="this.src='icons/file-image.png';this.style.objectFit='contain';this.style.padding='20px'">
      <div class="pa-tile-overlay">
        <span class="pa-tile-name">${_phEsc(photo.name)}</span>
      </div>`;
    tile.onclick = () => _photosOpenViewer(photo);
    grid.appendChild(tile);
  });

  if (PHOTOS.library.length === 0) {
    grid.innerHTML = `
      <div class="pa-empty">
        <i class="fas fa-images" style="font-size:64px;opacity:.15;margin-bottom:20px"></i>
        <div>No photos found</div>
        <div style="font-size:14px;opacity:.45;margin-top:8px">
          Drop images onto the desktop or add them to Pictures
        </div>
      </div>`;
  }
}

function _photosHubTab(tabEl) {
  document.querySelectorAll('.pa-hub-tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');
  _photosRenderHub(); /* albums mode would show grouped view; for now same */
}

/* ── VIEWER ── */
function _photosOpenViewer(photoOrItem) {
  /* Accepts either a PHOTOS.library entry or a VFS item */
  let photo = photoOrItem;
  if (photoOrItem.blobUrl || photoOrItem.src === undefined) {
    /* it's a VFS item — wrap it */
    photo = {
      id   : photoOrItem.id,
      name : photoOrItem.name,
      src  : photoOrItem.blobUrl || `photos/${photoOrItem.name}`,
      thumb: photoOrItem.blobUrl || `photos/${photoOrItem.name}`,
      type : 'vfs',
      vfsItem: photoOrItem,
    };
    /* ensure it's in library */
    if (!PHOTOS.library.find(p => p.id === photo.id)) {
      PHOTOS.library.push(photo);
    }
  }

  const idx = PHOTOS.library.findIndex(p => p.id === photo.id);
  PHOTOS.currentIdx = idx >= 0 ? idx : 0;
  PHOTOS.viewMode   = 'viewer';
  PHOTOS.zoomLevel  = 1;

  document.getElementById('paHub').style.display    = 'none';
  document.getElementById('paViewer').style.display = 'flex';
  document.getElementById('paBackBtn').style.display = '';
  document.getElementById('paTitle').textContent = photo.name;

  _photosLoadImage(PHOTOS.currentIdx);
  _photosRenderFilmstrip();
}

function _photosLoadImage(idx) {
  const photo = PHOTOS.library[idx];
  if (!photo) return;
  PHOTOS.currentIdx = idx;

  const img = document.getElementById('paMainImg');
  if (img) {
    img.style.transition = 'opacity .18s ease';
    img.style.opacity = '0';
    img.onload = () => { img.style.opacity = '1'; };
    img.src = photo.src;
    img.style.transform = `scale(${PHOTOS.zoomLevel}) rotate(0deg)`;
    img._rotation = 0;
  }

  const counter = document.getElementById('paCounter');
  if (counter) counter.textContent = `${idx + 1} / ${PHOTOS.library.length}`;

  const title = document.getElementById('paTitle');
  if (title) title.textContent = photo.name;

  /* highlight filmstrip */
  document.querySelectorAll('.pa-film-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === idx);
    if (i === idx) t.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
  });
}

function _photosRenderFilmstrip() {
  const strip = document.getElementById('paFilmstrip');
  if (!strip) return;
  strip.innerHTML = '';
  PHOTOS.library.forEach((photo, idx) => {
    const thumb = document.createElement('div');
    thumb.className = 'pa-film-thumb' + (idx === PHOTOS.currentIdx ? ' active' : '');
    thumb.innerHTML = `<img src="${photo.thumb}" alt="" onerror="this.src='icons/file-image.png'">`;
    thumb.onclick = () => { PHOTOS.zoomLevel = 1; _photosLoadImage(idx); };
    strip.appendChild(thumb);
  });
}

function _photosBack() {
  if (PHOTOS.viewMode === 'viewer') {
    _photosStopSlideshow();
    PHOTOS.viewMode = 'hub';
    document.getElementById('paHub').style.display    = '';
    document.getElementById('paViewer').style.display = 'none';
    document.getElementById('paBackBtn').style.display = 'none';
    document.getElementById('paTitle').textContent = 'Photos';
  }
}

/* ── NAVIGATION ── */
function _photosNav(dir) {
  const n   = PHOTOS.library.length;
  if (n === 0) return;
  PHOTOS.zoomLevel = 1;
  const idx = ((PHOTOS.currentIdx + dir) % n + n) % n;
  _photosLoadImage(idx);
}

/* ── ZOOM ── */
function _photosZoomIn()  { PHOTOS.zoomLevel = Math.min(5, PHOTOS.zoomLevel + 0.5); _photosApplyZoom(); }
function _photosZoomOut() { PHOTOS.zoomLevel = Math.max(0.25, PHOTOS.zoomLevel - 0.5); _photosApplyZoom(); }
function _photosToggleZoom() {
  PHOTOS.zoomLevel = PHOTOS.zoomLevel > 1 ? 1 : 2;
  _photosApplyZoom();
}
function _photosApplyZoom() {
  const img = document.getElementById('paMainImg');
  if (img) {
    img.style.transition = 'transform .2s cubic-bezier(.22,1,.36,1)';
    const rot = img._rotation || 0;
    img.style.transform = `scale(${PHOTOS.zoomLevel}) rotate(${rot}deg)`;
  }
}

/* ── ROTATE ── */
function _photosRotate() {
  const img = document.getElementById('paMainImg');
  if (!img) return;
  img._rotation = ((img._rotation || 0) + 90) % 360;
  img.style.transition = 'transform .3s cubic-bezier(.22,1,.36,1)';
  img.style.transform = `scale(${PHOTOS.zoomLevel}) rotate(${img._rotation}deg)`;
}

/* ── SLIDESHOW ── */
function _photosToggleSlideshow() {
  if (PHOTOS.slideshow) _photosStopSlideshow();
  else _photosStartSlideshow();
}
function _photosStartSlideshow() {
  PHOTOS.slideshow = true;
  const icon = document.getElementById('paSlideshowIcon');
  if (icon) { icon.className = 'fas fa-pause'; }
  PHOTOS.slideshowTimer = setInterval(() => _photosNav(1), 3500);
}
function _photosStopSlideshow() {
  PHOTOS.slideshow = false;
  clearInterval(PHOTOS.slideshowTimer);
  const icon = document.getElementById('paSlideshowIcon');
  if (icon) icon.className = 'fas fa-play';
}

/* ── SET AS WALLPAPER ── */
function _photosCrop() {
  const photo = PHOTOS.library[PHOTOS.currentIdx];
  if (!photo) return;
  /* Set as desktop wallpaper via the main.js wallpaper system */
  const desktop = document.getElementById('desktop');
  if (desktop) {
    desktop.style.backgroundImage = `url('${photo.src}')`;
    if (typeof notify === 'function') notify(`"${photo.name}" set as wallpaper`, 'Photos');
  }
}

/* ── SHARE ── */
function _photosShare() {
  const photo = PHOTOS.library[PHOTOS.currentIdx];
  if (!photo) return;
  if (typeof notify === 'function') notify(`Sharing "${photo.name}"…`, 'Photos');
}

/* ── DELETE ── */
function _photosDelete() {
  const photo = PHOTOS.library[PHOTOS.currentIdx];
  if (!photo) return;
  if (!confirm(`Move "${photo.name}" to Recycle Bin?`)) return;
  if (photo.vfsItem && photo.vfsItem.id) {
    /* find which location it's in */
    const locs = ['Desktop','Pictures','Documents','Downloads'];
    for (const loc of locs) {
      const list = VFS.list(loc);
      if (list.find(i => i.id === photo.vfsItem.id)) {
        VFS.delete(loc, photo.vfsItem.id);
        break;
      }
    }
  }
  PHOTOS.library.splice(PHOTOS.currentIdx, 1);
  if (PHOTOS.library.length === 0) { _photosBack(); return; }
  PHOTOS.currentIdx = Math.min(PHOTOS.currentIdx, PHOTOS.library.length - 1);
  _photosLoadImage(PHOTOS.currentIdx);
  _photosRenderFilmstrip();
  if (typeof notify === 'function') notify(`"${photo.name}" moved to Recycle Bin`, 'Photos');
}

/* ── CHROME AUTOHIDE ── */
let _photosHideTimer = null;
function _photosShowChrome() {
  const chrome   = document.getElementById('paChrome');
  const controls = document.getElementById('paControls');
  const counter  = document.getElementById('paCounter');
  const strip    = document.getElementById('paFilmstrip');
  [chrome, controls, counter, strip].forEach(el => { if (el) el.classList.add('visible'); });
  clearTimeout(_photosHideTimer);
  _photosHideTimer = setTimeout(() => {
    [chrome, controls, counter, strip].forEach(el => { if (el) el.classList.remove('visible'); });
  }, 3000);
}

/* ── WINDOW CONTROLS ── */
function _photosClose() {
  _photosStopSlideshow();
  if (PHOTOS.unsub) { PHOTOS.unsub(); PHOTOS.unsub = null; }
  const win = document.getElementById('photosApp');
  const tb  = document.getElementById('tbPhotos');
  if (win) win.remove();
  if (tb) tb.remove();
  PHOTOS.open = false; PHOTOS.minimised = false;
}

function _photosMinimise() {
  const win = document.getElementById('photosApp');
  const tb  = document.getElementById('tbPhotos');
  PHOTOS.minimised = true;
  if (win) { win.style.opacity = '0'; win.style.transform = 'scale(.94) translateY(20px)'; win.style.pointerEvents = 'none'; }
  if (tb) tb.classList.add('minimised');
}

function _photosRestore() {
  const win = document.getElementById('photosApp');
  const tb  = document.getElementById('tbPhotos');
  PHOTOS.minimised = false;
  if (win) { win.style.opacity = '1'; win.style.transform = ''; win.style.pointerEvents = ''; win.style.zIndex = '420'; }
  if (tb) tb.classList.remove('minimised');
}

function _photosToggleMax() {
  PHOTOS.maximised = !PHOTOS.maximised;
  const win = document.getElementById('photosApp');
  if (win) win.classList.toggle('photos-windowed', !PHOTOS.maximised);
  const btn = document.getElementById('paMaxBtn');
  if (btn) btn.innerHTML = PHOTOS.maximised ? '&#x2750;' : '&#x2610;';
}

/* ── KEYBOARD ── */
document.addEventListener('keydown', e => {
  if (!PHOTOS.open || PHOTOS.minimised) return;
  if (PHOTOS.viewMode !== 'viewer') return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); _photosNav(1); }
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); _photosNav(-1); }
  if (e.key === 'Escape')  _photosBack();
  if (e.key === '+' || e.key === '=') _photosZoomIn();
  if (e.key === '-') _photosZoomOut();
  if (e.key === 'r' || e.key === 'R') _photosRotate();
  if (e.key === ' ') { e.preventDefault(); _photosToggleSlideshow(); }
  if (e.key === 'Delete') _photosDelete();
});

/* ── MOUSE WHEEL ZOOM ── */
document.addEventListener('wheel', e => {
  if (!PHOTOS.open || PHOTOS.minimised || PHOTOS.viewMode !== 'viewer') return;
  const wrap = document.getElementById('paImgWrap');
  if (!wrap || !wrap.contains(e.target)) return;
  e.preventDefault();
  if (e.deltaY < 0) _photosZoomIn(); else _photosZoomOut();
}, { passive: false });

/* ── HELPERS ── */
function _phEsc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
 