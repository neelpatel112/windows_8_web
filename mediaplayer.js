/* ════════════════════════════════════════════════════════════
   Windows Media Player  ·  mediaplayer.js
   Classic WMP 12 dark desktop style + Now Playing pane
   ════════════════════════════════════════════════════════════ */
'use strict';

/* ── STATE ── */
const WMP = {
  open      : false,
  minimised : false,
  maximised : false,
  view      : 'library', /* 'library' | 'nowplaying' */
  playlist  : [],
  queueIdx  : 0,
  shuffle   : false,
  repeat    : false,  /* 'none' | 'one' | 'all' */
  dragging  : false,
  dragX: 0, dragY: 0,
  resizing  : false,
  rsX:0, rsY:0, rsW:0, rsH:0,
  libTab    : 'videos',  /* 'videos' | 'music' | 'playlists' */
  unsub     : null,
};

/* Built-in video library */
const WMP_BUILTIN_VIDEOS = Array.from({ length: 5 }, (_, i) => ({
  id   : `builtin-vid-${i+1}`,
  name : `Video ${i+1}`,
  src  : `videos/${i+1}.mp4`,
  type : 'builtin',
  kind : 'video',
  duration: null,
}));

/* Built-in music stubs (no actual audio files — shown as placeholders) */
const WMP_BUILTIN_MUSIC = [
  { id:'bm1', name:'Windows Startup Sound', src:'sound/winstrt.mp3', kind:'audio', artist:'Microsoft' },
  { id:'bm2', name:'Fan Noise',             src:'sound/fan.mp3',     kind:'audio', artist:'System' },
];

/* ── OPEN ── */
function openMediaPlayer(startItem) {
  if (WMP.open) {
    if (WMP.minimised) _wmpRestore();
    const win = document.getElementById('wmpWindow');
    if (win) win.style.zIndex = '415';
    if (startItem) _wmpPlayItem(startItem);
    return;
  }
  WMP.open = true;
  _wmpBuildPlaylist();
  _wmpBuildWindow();
  _wmpAttachTaskbar();
  _wmpSetupDrag();
  _wmpSetupResize();

  if (startItem) setTimeout(() => _wmpPlayItem(startItem), 60);

  WMP.unsub = VFS.subscribe(loc => {
    if (['Desktop','Downloads','Videos','Music'].includes(loc)) {
      _wmpBuildPlaylist();
      _wmpRenderLibrary();
    }
  });
}

/* ── BUILD PLAYLIST ── */
function _wmpBuildPlaylist() {
  const VID_EXTS  = ['mp4','webm','mkv','avi','mov','ogv'];
  const AUD_EXTS  = ['mp3','wav','ogg','flac','aac','wma','opus'];
  const vfsMedia  = [];
  ['Desktop','Downloads','Videos','Music','Documents'].forEach(loc => {
    VFS.list(loc).forEach(item => {
      const ext = (item.name||'').split('.').pop().toLowerCase();
      const kind = VID_EXTS.includes(ext) ? 'video' : AUD_EXTS.includes(ext) ? 'audio' : null;
      if (!kind) return;
      vfsMedia.push({
        id      : item.id,
        name    : item.name,
        src     : item.blobUrl || `videos/${item.name}`,
        kind,
        artist  : item.artist || '—',
        type    : 'vfs',
        vfsItem : item,
      });
    });
  });

  const allVideos = [...WMP_BUILTIN_VIDEOS, ...vfsMedia.filter(i => i.kind === 'video')];
  const allAudio  = [...WMP_BUILTIN_MUSIC,  ...vfsMedia.filter(i => i.kind === 'audio')];
  WMP.allVideos   = allVideos;
  WMP.allAudio    = allAudio;

  if (WMP.playlist.length === 0) {
    WMP.playlist = [...allVideos, ...allAudio];
  }
}

/* ── BUILD WINDOW ── */
function _wmpBuildWindow() {
  const win = document.createElement('div');
  win.id = 'wmpWindow';
  win.innerHTML = `
<!-- Title bar -->
<div class="wmp-titlebar" id="wmpTitleBar">
  <div class="wmp-tb-left">
    <img class="wmp-tb-icon" src="icons/mediaplayer.png" alt="" onerror="this.style.display='none'">
    <span class="wmp-tb-title" id="wmpTbTitle">Windows Media Player</span>
  </div>
  <div class="wmp-tb-right">
    <div class="wmp-tb-menus">
      <span class="wmp-tb-menu">File</span>
      <span class="wmp-tb-menu">View</span>
      <span class="wmp-tb-menu">Play</span>
      <span class="wmp-tb-menu">Tools</span>
      <span class="wmp-tb-menu">Help</span>
    </div>
    <div class="wmp-win-controls">
      <button class="wmp-win-btn" onclick="_wmpMinimise()">&#x2014;</button>
      <button class="wmp-win-btn" id="wmpMaxBtn" onclick="_wmpMaximise()">&#x2610;</button>
      <button class="wmp-win-btn wmp-close" onclick="_wmpClose()">&#x2715;</button>
    </div>
  </div>
</div>

<!-- Navigation tabs -->
<div class="wmp-nav">
  <div class="wmp-nav-tab active" id="wmpTabLib" onclick="_wmpSwitchView('library')">
    <i class="fas fa-th-list"></i> Library
  </div>
  <div class="wmp-nav-tab" id="wmpTabNow" onclick="_wmpSwitchView('nowplaying')">
    <i class="fas fa-play-circle"></i> Now Playing
  </div>
  <div class="wmp-nav-search">
    <i class="fas fa-search"></i>
    <input type="text" id="wmpSearch" placeholder="Search library…" oninput="_wmpSearch(this.value)">
  </div>
</div>

<!-- Main body -->
<div class="wmp-body">

  <!-- LEFT: Navigation tree -->
  <div class="wmp-sidebar" id="wmpSidebar">
    <div class="wmp-sb-section">Playlists</div>
    <div class="wmp-sb-item" onclick="_wmpLibTab('playlists')">
      <i class="fas fa-list"></i> My playlist
    </div>
    <div class="wmp-sb-section">Library</div>
    <div class="wmp-sb-item ${WMP.libTab==='videos'?'active':''}" onclick="_wmpLibTab('videos')" id="wmpSbVideos">
      <i class="fas fa-film"></i> Videos
    </div>
    <div class="wmp-sb-item" onclick="_wmpLibTab('music')" id="wmpSbMusic">
      <i class="fas fa-music"></i> Music
    </div>
    <div class="wmp-sb-section">Other media</div>
    <div class="wmp-sb-item" onclick="_wmpLibTab('recorded')">
      <i class="fas fa-tv"></i> Recorded TV
    </div>
    <div class="wmp-sb-sep"></div>
    <div class="wmp-sb-item" onclick="_wmpLibTab('playlists')">
      <i class="fas fa-plus"></i> Create playlist
    </div>
  </div>

  <!-- CENTRE: Library / Now Playing -->
  <div class="wmp-main" id="wmpMain">

    <!-- LIBRARY pane -->
    <div id="wmpLibPane">
      <div class="wmp-lib-header" id="wmpLibHeader">Videos</div>
      <div class="wmp-lib-cols">
        <div class="wmp-lib-col-hdr" style="flex:1">Title</div>
        <div class="wmp-lib-col-hdr" style="width:80px">Duration</div>
        <div class="wmp-lib-col-hdr" style="width:100px">Type</div>
      </div>
      <div class="wmp-lib-list" id="wmpLibList">
        <!-- rows filled by _wmpRenderLibrary() -->
      </div>
    </div>

    <!-- NOW PLAYING pane -->
    <div id="wmpNowPane" style="display:none">
      <div class="wmp-video-wrap">
        <video id="wmpVideo" preload="metadata"
               onended="_wmpOnEnded()"
               ontimeupdate="_wmpOnTimeUpdate()"
               onloadedmetadata="_wmpOnMeta()"
               onerror="_wmpOnError()">
        </video>
        <div class="wmp-video-overlay" id="wmpVideoOverlay">
          <i class="fas fa-play" style="font-size:48px;opacity:.4"></i>
        </div>
        <!-- album art for audio -->
        <div class="wmp-album-art" id="wmpAlbumArt" style="display:none">
          <img src="icons/mediaplayer.png" alt="" onerror="this.src='icons/file-audio.png'">
          <div class="wmp-album-title" id="wmpAlbumTitle">—</div>
          <div class="wmp-album-artist" id="wmpAlbumArtist">—</div>
        </div>
      </div>
    </div>

  </div>

  <!-- RIGHT: Now Playing queue -->
  <div class="wmp-queue" id="wmpQueue">
    <div class="wmp-queue-header">Now Playing</div>
    <div class="wmp-queue-list" id="wmpQueueList">
      <!-- filled by _wmpRenderQueue() -->
    </div>
  </div>

</div>

<!-- Player controls bar -->
<div class="wmp-controls-bar">
  <!-- Seek bar -->
  <div class="wmp-seek-wrap">
    <span class="wmp-time" id="wmpTimeCur">0:00</span>
    <div class="wmp-seek-track" id="wmpSeekTrack" onclick="_wmpSeekClick(event)">
      <div class="wmp-seek-fill" id="wmpSeekFill"></div>
      <div class="wmp-seek-thumb" id="wmpSeekThumb"></div>
    </div>
    <span class="wmp-time" id="wmpTimeDur">0:00</span>
  </div>

  <!-- Controls row -->
  <div class="wmp-ctrl-row">
    <div class="wmp-ctrl-left">
      <!-- Volume -->
      <button class="wmp-ctrl-btn" onclick="_wmpToggleMute()" id="wmpMuteBtn" title="Mute">
        <i class="fas fa-volume-up" id="wmpVolIcon"></i>
      </button>
      <div class="wmp-vol-track" id="wmpVolTrack" onclick="_wmpVolClick(event)">
        <div class="wmp-vol-fill" id="wmpVolFill" style="width:80%"></div>
      </div>
    </div>

    <div class="wmp-ctrl-center">
      <button class="wmp-ctrl-btn" onclick="_wmpShuffle()" id="wmpShuffleBtn" title="Shuffle">
        <i class="fas fa-random"></i>
      </button>
      <button class="wmp-ctrl-btn wmp-ctrl-prev" onclick="_wmpPrev()" title="Previous">
        <i class="fas fa-step-backward"></i>
      </button>
      <button class="wmp-ctrl-btn wmp-ctrl-playpause" id="wmpPlayBtn" onclick="_wmpTogglePlay()" title="Play/Pause">
        <i class="fas fa-play" id="wmpPlayIcon"></i>
      </button>
      <button class="wmp-ctrl-btn wmp-ctrl-prev" onclick="_wmpNext()" title="Next">
        <i class="fas fa-step-forward"></i>
      </button>
      <button class="wmp-ctrl-btn" onclick="_wmpRepeat()" id="wmpRepeatBtn" title="Repeat">
        <i class="fas fa-redo"></i>
      </button>
    </div>

    <div class="wmp-ctrl-right">
      <button class="wmp-ctrl-btn" onclick="_wmpSwitchView('nowplaying')" title="Switch to Now Playing">
        <i class="fas fa-tv"></i>
      </button>
      <button class="wmp-ctrl-btn" onclick="_wmpToggleFullscreen()" title="Full screen">
        <i class="fas fa-expand"></i>
      </button>
    </div>
  </div>
</div>

<!-- Resize handle -->
<div class="wmp-resize" id="wmpResize"></div>
`;
  document.body.appendChild(win);
  _wmpRenderLibrary();
  _wmpRenderQueue();
}

/* ── TASKBAR ── */
function _wmpAttachTaskbar() {
  const tb = document.getElementById('tbRunning');
  if (!tb) return;
  const entry = document.createElement('div');
  entry.className = 'tb-win-entry';
  entry.id = 'tbWMP';
  entry.innerHTML = `<img src="icons/mediaplayer.png" alt="Media Player" onerror="this.style.display='none'"><span>Media Player</span>`;
  entry.onclick = () => WMP.minimised ? _wmpRestore() : _wmpMinimise();
  tb.appendChild(entry);
}

/* ── RENDER LIBRARY ── */
function _wmpRenderLibrary() {
  const list   = document.getElementById('wmpLibList');
  const header = document.getElementById('wmpLibHeader');
  if (!list) return;

  let items = [];
  if (WMP.libTab === 'videos') {
    items = WMP.allVideos || [];
    if (header) header.textContent = 'Videos';
  } else if (WMP.libTab === 'music') {
    items = WMP.allAudio || [];
    if (header) header.textContent = 'Music';
  } else {
    items = WMP.playlist || [];
    if (header) header.textContent = 'My Playlist';
  }

  if (WMP._searchQ) {
    const q = WMP._searchQ.toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(q));
  }

  list.innerHTML = '';
  if (items.length === 0) {
    list.innerHTML = `<div class="wmp-empty">No media files found.<br><small>Drop video or audio files onto the desktop.</small></div>`;
    return;
  }

  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'wmp-lib-row' + (idx === WMP.queueIdx && _wmpCurrentSrc() === item.src ? ' playing' : '');
    row.dataset.idx = idx;
    row.innerHTML = `
      <div style="flex:1;display:flex;align-items:center;gap:10px;min-width:0;overflow:hidden">
        <i class="fas ${item.kind === 'video' ? 'fa-film' : 'fa-music'}" style="flex-shrink:0;color:#0078d7;font-size:13px"></i>
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px">${_wmpEsc(item.name)}</span>
      </div>
      <span style="width:80px;font-size:12px;color:#888">${item.duration ? _wmpFmtTime(item.duration) : '—'}</span>
      <span style="width:100px;font-size:12px;color:#888;text-transform:uppercase">${(item.name.split('.').pop()||'').slice(0,4)}</span>`;
    row.ondblclick = () => _wmpPlayItem(item);
    row.onclick    = () => {
      document.querySelectorAll('.wmp-lib-row').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
    };
    list.appendChild(row);
  });
}

/* ── RENDER QUEUE ── */
function _wmpRenderQueue() {
  const ql = document.getElementById('wmpQueueList');
  if (!ql) return;
  ql.innerHTML = '';
  WMP.playlist.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'wmp-queue-row' + (idx === WMP.queueIdx ? ' active' : '');
    row.innerHTML = `
      <i class="fas ${item.kind === 'video' ? 'fa-film' : 'fa-music'}"
         style="font-size:11px;color:#0078d7;flex-shrink:0;width:14px"></i>
      <span class="wmp-queue-name">${_wmpEsc(item.name)}</span>
      ${idx === WMP.queueIdx ? '<i class="fas fa-volume-up" style="font-size:10px;color:#0078d7;margin-left:auto"></i>' : ''}`;
    row.ondblclick = () => { WMP.queueIdx = idx; _wmpLoadCurrent(); };
    ql.appendChild(row);
  });
}

/* ── PLAY ── */
function _wmpPlayItem(item) {
  /* Add to playlist if not there */
  let idx = WMP.playlist.findIndex(i => i.id === item.id);
  if (idx === -1) {
    WMP.playlist.unshift(item);
    idx = 0;
  }
  WMP.queueIdx = idx;
  _wmpSwitchView('nowplaying');
  _wmpLoadCurrent();
}

function _wmpLoadCurrent() {
  const item = WMP.playlist[WMP.queueIdx];
  if (!item) return;

  const video    = document.getElementById('wmpVideo');
  const overlay  = document.getElementById('wmpVideoOverlay');
  const albumArt = document.getElementById('wmpAlbumArt');
  const tbTitle  = document.getElementById('wmpTbTitle');

  if (tbTitle) tbTitle.textContent = item.name + ' — Windows Media Player';

  if (item.kind === 'audio') {
    if (video)    { video.src = item.src; video.style.display = 'none'; }
    if (albumArt) {
      albumArt.style.display = 'flex';
      document.getElementById('wmpAlbumTitle').textContent  = item.name;
      document.getElementById('wmpAlbumArtist').textContent = item.artist || '—';
    }
    if (overlay) overlay.style.display = 'none';
  } else {
    if (video)    { video.src = item.src; video.style.display = ''; }
    if (albumArt) albumArt.style.display = 'none';
    if (overlay) overlay.style.display = '';
  }

  if (video) {
    video.load();
    video.play().catch(() => {});
  }

  _wmpUpdatePlayBtn(false);
  _wmpRenderQueue();
  _wmpRenderLibrary();

  if (typeof notify === 'function') notify('Now playing: ' + item.name, 'Media Player');
}

function _wmpCurrentSrc() {
  const v = document.getElementById('wmpVideo');
  return v ? v.src : '';
}

/* ── TRANSPORT ── */
function _wmpTogglePlay() {
  const video = document.getElementById('wmpVideo');
  if (!video) return;
  if (video.paused) {
    video.play().catch(() => {});
    _wmpUpdatePlayBtn(false);
    const overlay = document.getElementById('wmpVideoOverlay');
    if (overlay) overlay.style.display = 'none';
  } else {
    video.pause();
    _wmpUpdatePlayBtn(true);
  }
}

function _wmpPrev() {
  if (WMP.playlist.length === 0) return;
  const video = document.getElementById('wmpVideo');
  if (video && video.currentTime > 3) { video.currentTime = 0; return; }
  WMP.queueIdx = ((WMP.queueIdx - 1) + WMP.playlist.length) % WMP.playlist.length;
  _wmpLoadCurrent();
}

function _wmpNext() {
  if (WMP.playlist.length === 0) return;
  if (WMP.shuffle) {
    WMP.queueIdx = Math.floor(Math.random() * WMP.playlist.length);
  } else {
    WMP.queueIdx = (WMP.queueIdx + 1) % WMP.playlist.length;
  }
  _wmpLoadCurrent();
}

function _wmpOnEnded() {
  if (WMP.repeat === 'one') {
    const video = document.getElementById('wmpVideo');
    if (video) { video.currentTime = 0; video.play().catch(() => {}); }
  } else if (WMP.repeat === 'all' || WMP.queueIdx < WMP.playlist.length - 1) {
    _wmpNext();
  } else {
    _wmpUpdatePlayBtn(true);
    const overlay = document.getElementById('wmpVideoOverlay');
    if (overlay) overlay.style.display = '';
  }
}

function _wmpUpdatePlayBtn(paused) {
  const icon = document.getElementById('wmpPlayIcon');
  if (icon) icon.className = paused ? 'fas fa-play' : 'fas fa-pause';
}

/* ── SEEK ── */
function _wmpOnTimeUpdate() {
  const video = document.getElementById('wmpVideo');
  if (!video || !video.duration) return;
  const pct = (video.currentTime / video.duration) * 100;
  const fill  = document.getElementById('wmpSeekFill');
  const thumb = document.getElementById('wmpSeekThumb');
  const cur   = document.getElementById('wmpTimeCur');
  if (fill)  fill.style.width  = pct + '%';
  if (thumb) thumb.style.left  = pct + '%';
  if (cur)   cur.textContent   = _wmpFmtTime(video.currentTime);
}

function _wmpOnMeta() {
  const video = document.getElementById('wmpVideo');
  if (!video) return;
  const dur = document.getElementById('wmpTimeDur');
  if (dur) dur.textContent = _wmpFmtTime(video.duration);
  /* update duration in playlist item */
  const item = WMP.playlist[WMP.queueIdx];
  if (item) item.duration = video.duration;
}

function _wmpOnError() {
  if (typeof notify === 'function') notify('Media Player: cannot play this file', 'Media Player');
  const overlay = document.getElementById('wmpVideoOverlay');
  if (overlay) { overlay.style.display = ''; overlay.innerHTML = '<i class="fas fa-exclamation-triangle" style="font-size:36px;color:#e81123;opacity:.6"></i>'; }
}

function _wmpSeekClick(e) {
  const video = document.getElementById('wmpVideo');
  if (!video || !video.duration) return;
  const track = document.getElementById('wmpSeekTrack');
  const r = track.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  video.currentTime = pct * video.duration;
}

/* ── VOLUME ── */
function _wmpVolClick(e) {
  const track = document.getElementById('wmpVolTrack');
  const r     = track.getBoundingClientRect();
  const pct   = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  const fill  = document.getElementById('wmpVolFill');
  if (fill) fill.style.width = (pct * 100) + '%';
  const video = document.getElementById('wmpVideo');
  if (video) video.volume = pct;
  _wmpUpdateVolIcon(pct);
}

function _wmpToggleMute() {
  const video = document.getElementById('wmpVideo');
  if (!video) return;
  video.muted = !video.muted;
  _wmpUpdateVolIcon(video.muted ? 0 : video.volume);
}

function _wmpUpdateVolIcon(vol) {
  const icon = document.getElementById('wmpVolIcon');
  if (!icon) return;
  if (vol === 0) icon.className = 'fas fa-volume-mute';
  else if (vol < 0.5) icon.className = 'fas fa-volume-down';
  else icon.className = 'fas fa-volume-up';
}

/* ── SHUFFLE / REPEAT ── */
function _wmpShuffle() {
  WMP.shuffle = !WMP.shuffle;
  const btn = document.getElementById('wmpShuffleBtn');
  if (btn) btn.classList.toggle('wmp-ctrl-active', WMP.shuffle);
  if (typeof notify === 'function') notify('Shuffle ' + (WMP.shuffle ? 'on' : 'off'), 'Media Player');
}

function _wmpRepeat() {
  const states = ['none','one','all'];
  const i = states.indexOf(WMP.repeat);
  WMP.repeat = states[(i + 1) % 3];
  const btn  = document.getElementById('wmpRepeatBtn');
  if (btn) {
    btn.classList.toggle('wmp-ctrl-active', WMP.repeat !== 'none');
    const icon = btn.querySelector('i');
    if (icon) icon.className = WMP.repeat === 'one' ? 'fas fa-redo-alt' : 'fas fa-redo';
  }
}

/* ── VIEW SWITCH ── */
function _wmpSwitchView(view) {
  WMP.view = view;
  const lib = document.getElementById('wmpLibPane');
  const now = document.getElementById('wmpNowPane');
  const tabLib = document.getElementById('wmpTabLib');
  const tabNow = document.getElementById('wmpTabNow');
  if (view === 'library') {
    if (lib) lib.style.display = '';
    if (now) now.style.display = 'none';
    if (tabLib) tabLib.classList.add('active');
    if (tabNow) tabNow.classList.remove('active');
  } else {
    if (lib) lib.style.display = 'none';
    if (now) now.style.display = '';
    if (tabLib) tabLib.classList.remove('active');
    if (tabNow) tabNow.classList.add('active');
  }
}

function _wmpLibTab(tab) {
  WMP.libTab = tab;
  ['videos','music','playlists','recorded'].forEach(t => {
    const el = document.getElementById(`wmpSb${t.charAt(0).toUpperCase()+t.slice(1)}`);
    if (el) el.classList.toggle('active', t === tab);
  });
  _wmpSwitchView('library');
  _wmpRenderLibrary();
}

function _wmpSearch(q) {
  WMP._searchQ = q;
  _wmpRenderLibrary();
}

/* ── FULLSCREEN ── */
function _wmpToggleFullscreen() {
  const now = document.getElementById('wmpNowPane');
  const win = document.getElementById('wmpWindow');
  if (!now) return;
  _wmpSwitchView('nowplaying');
  if (!document.fullscreenElement) {
    (now.requestFullscreen || now.webkitRequestFullscreen).call(now).catch(() => {});
  } else {
    document.exitFullscreen && document.exitFullscreen();
  }
}

/* ── WINDOW CONTROLS ── */
function _wmpClose() {
  const video = document.getElementById('wmpVideo');
  if (video) { video.pause(); video.src = ''; }
  if (WMP.unsub) { WMP.unsub(); WMP.unsub = null; }
  const win = document.getElementById('wmpWindow');
  const tb  = document.getElementById('tbWMP');
  if (win) { win.style.animation = 'wmpClose .18s ease both'; setTimeout(() => { win.remove(); if(tb) tb.remove(); }, 200); }
  WMP.open = false; WMP.minimised = false;
}

function _wmpMinimise() {
  const win = document.getElementById('wmpWindow');
  const tb  = document.getElementById('tbWMP');
  WMP.minimised = true;
  if (win) { win.style.transform = 'translateY(100%) scale(.4)'; win.style.opacity = '0'; setTimeout(() => { win.style.display = 'none'; }, 200); }
  if (tb) tb.classList.add('minimised');
}

function _wmpRestore() {
  const win = document.getElementById('wmpWindow');
  const tb  = document.getElementById('tbWMP');
  WMP.minimised = false;
  if (!win) return;
  win.style.display = 'flex'; win.style.transform = ''; win.style.opacity = '1'; win.style.zIndex = '415';
  if (tb) tb.classList.remove('minimised');
}

function _wmpMaximise() {
  const win = document.getElementById('wmpWindow');
  WMP.maximised = !WMP.maximised;
  win.classList.toggle('wmp-maximised', WMP.maximised);
  const btn = document.getElementById('wmpMaxBtn');
  if (btn) btn.innerHTML = WMP.maximised ? '&#x29C9;' : '&#x2610;';
}

/* ── DRAG ── */
function _wmpSetupDrag() {
  const tb = document.getElementById('wmpTitleBar');
  if (!tb) return;
  tb.addEventListener('dblclick', _wmpMaximise);
  tb.addEventListener('mousedown', e => {
    if (e.target.closest('.wmp-win-controls,.wmp-tb-menus') || WMP.maximised) return;
    WMP.dragging = true;
    const win = document.getElementById('wmpWindow');
    const r = win.getBoundingClientRect();
    WMP.dragX = e.clientX - r.left; WMP.dragY = e.clientY - r.top;
    win.style.transition = 'none'; e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!WMP.dragging) return;
    const win = document.getElementById('wmpWindow');
    if (!win) return;
    win.style.left = Math.max(0, Math.min(window.innerWidth-60, e.clientX - WMP.dragX)) + 'px';
    win.style.top  = Math.max(0, Math.min(window.innerHeight-32, e.clientY - WMP.dragY)) + 'px';
  });
  document.addEventListener('mouseup', () => { WMP.dragging = false; });
}

/* ── RESIZE ── */
function _wmpSetupResize() {
  const h = document.getElementById('wmpResize');
  if (!h) return;
  h.addEventListener('mousedown', e => {
    if (WMP.maximised) return;
    WMP.resizing = true;
    const win = document.getElementById('wmpWindow');
    WMP.rsX = e.clientX; WMP.rsY = e.clientY;
    WMP.rsW = win.offsetWidth; WMP.rsH = win.offsetHeight;
    e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('mousemove', e => {
    if (!WMP.resizing) return;
    const win = document.getElementById('wmpWindow');
    if (!win) return;
    win.style.width  = Math.max(640, WMP.rsW + (e.clientX - WMP.rsX)) + 'px';
    win.style.height = Math.max(420, WMP.rsH + (e.clientY - WMP.rsY)) + 'px';
  });
  document.addEventListener('mouseup', () => { WMP.resizing = false; });
}

/* ── KEYBOARD ── */
document.addEventListener('keydown', e => {
  if (!WMP.open || WMP.minimised) return;
  if (e.target.tagName === 'INPUT') return;
  if (e.key === ' ' && WMP.open) { e.preventDefault(); _wmpTogglePlay(); }
  if (e.key === 'ArrowRight') { const v = document.getElementById('wmpVideo'); if(v) v.currentTime = Math.min(v.duration||0, v.currentTime+5); }
  if (e.key === 'ArrowLeft')  { const v = document.getElementById('wmpVideo'); if(v) v.currentTime = Math.max(0, v.currentTime-5); }
});

/* ── HELPERS ── */
function _wmpFmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2,'0')}`;
}
function _wmpEsc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
 