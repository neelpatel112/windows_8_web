/* ════════════════════════════════════════════════════════════
   VFS.js — Virtual File System
   Single source of truth for all files across:
   Desktop, This PC, Recycle Bin, Documents
   ════════════════════════════════════════════════════════════ */
'use strict';

/* ── STORE KEY ── */
const VFS_KEY = 'win8web_vfs_v2';

/* ── DEFAULT FILESYSTEM ── */
const VFS_DEFAULTS = {
  'Desktop'   : [],
  'Documents' : [
    { id:'doc-1', type:'folder', name:'Work',     icon:'icons/folder.png' },
    { id:'doc-2', type:'folder', name:'Personal', icon:'icons/folder.png' },
    { id:'doc-3', type:'file',   name:'resume.pdf',  icon:'icons/file-pdf.png',   path:'resume.pdf' },
    { id:'doc-4', type:'file',   name:'notes.txt',   icon:'icons/file-text.png',  content:'' },
    { id:'doc-5', type:'file',   name:'budget.xlsx', icon:'icons/file-excel.png', content:'' },
  ],
  'Downloads' : [
    { id:'dl-1', type:'file', name:'setup.exe',  icon:'icons/file-exe.png'   },
    { id:'dl-2', type:'file', name:'photo.jpg',  icon:'icons/file-image.png' },
    { id:'dl-3', type:'file', name:'song.mp3',   icon:'icons/file-audio.png' },
  ],
  'Pictures'  : [
    { id:'pic-1', type:'folder', name:'Vacation',     icon:'icons/folder.png' },
    { id:'pic-2', type:'folder', name:'Screenshots',  icon:'icons/folder.png' },
    { id:'pic-3', type:'file',   name:'IMG_001.jpg',  icon:'icons/file-image.png' },
  ],
  'Music'     : [
    { id:'mus-1', type:'folder', name:'Albums',       icon:'icons/folder.png' },
    { id:'mus-2', type:'file',   name:'track01.mp3',  icon:'icons/file-audio.png' },
  ],
  'Videos'    : [
    { id:'vid-1', type:'folder', name:'Movies',  icon:'icons/folder.png' },
    { id:'vid-2', type:'file',   name:'clip.mp4',icon:'icons/file-video.png' },
  ],
  'C:'        : [
    { id:'c-1', type:'folder', name:'Program Files', icon:'icons/folder.png' },
    { id:'c-2', type:'folder', name:'Users',          icon:'icons/folder.png' },
    { id:'c-3', type:'folder', name:'Windows',        icon:'icons/folder.png' },
    { id:'c-4', type:'file',   name:'pagefile.sys',   icon:'icons/file-sys.png' },
  ],
  'D:'        : [
    { id:'d-1', type:'folder', name:'Backup',   icon:'icons/folder.png' },
    { id:'d-2', type:'folder', name:'Projects', icon:'icons/folder.png' },
  ],
  'E:'        : [
    { id:'e-1', type:'folder', name:'Files',    icon:'icons/folder.png' },
    { id:'e-2', type:'file',   name:'data.zip', icon:'icons/file-zip.png' },
  ],
  '__recycle__': [],   /* Recycle Bin items */
};

/* ── VFS SINGLETON ── */
window.VFS = {
  _fs   : null,
  _subs : [],   /* change subscribers */

  /* ── LOAD / SAVE ── */
  load() {
    try {
      const raw = localStorage.getItem(VFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._fs = { ...VFS_DEFAULTS };
        Object.keys(parsed).forEach(k => { this._fs[k] = parsed[k]; });
      } else {
        this._resetToDefaults();
      }
    } catch(e) {
      this._resetToDefaults();
    }
    return this;
  },

  save() {
    try { localStorage.setItem(VFS_KEY, JSON.stringify(this._fs)); }
    catch(e) { /* storage may be full */ }
    return this;
  },

  _resetToDefaults() {
    this._fs = JSON.parse(JSON.stringify(VFS_DEFAULTS));
  },

  /* ── SUBSCRIBE ── */
  subscribe(fn) {
    this._subs.push(fn);
    return () => { this._subs = this._subs.filter(s => s !== fn); };
  },

  _notify(location) {
    this._subs.forEach(fn => { try { fn(location); } catch(e){} });
  },

  /* ── READ ── */
  list(location) {
    if (!this._fs) this.load();
    return [...(this._fs[location] || [])];
  },

  listRecycle() {
    return this.list('__recycle__');
  },

  /* ── WRITE ── */
  addFile(location, item) {
    if (!this._fs) this.load();
    if (!this._fs[location]) this._fs[location] = [];
    /* generate unique id */
    if (!item.id) item.id = 'vfs-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
    this._fs[location].push(item);
    this.save();
    this._notify(location);
    return item;
  },

  rename(location, id, newName) {
    if (!this._fs) this.load();
    const arr = this._fs[location];
    if (!arr) return;
    const item = arr.find(i => i.id === id);
    if (item) { item.name = newName; this.save(); this._notify(location); }
  },

  /* ── DELETE → Recycle Bin ── */
  delete(location, id) {
    if (!this._fs) this.load();
    const arr = this._fs[location];
    if (!arr) return;
    const idx = arr.findIndex(i => i.id === id);
    if (idx === -1) return;
    const [item] = arr.splice(idx, 1);
    item._deletedFrom = location;
    item._deletedAt   = Date.now();
    if (!this._fs['__recycle__']) this._fs['__recycle__'] = [];
    this._fs['__recycle__'].push(item);
    this.save();
    this._notify(location);
    this._notify('__recycle__');
    return item;
  },

  /* ── RESTORE from Recycle Bin ── */
  restore(id) {
    if (!this._fs) this.load();
    const bin = this._fs['__recycle__'] || [];
    const idx = bin.findIndex(i => i.id === id);
    if (idx === -1) return;
    const [item] = bin.splice(idx, 1);
    const dest = item._deletedFrom || 'Desktop';
    delete item._deletedAt;
    if (!this._fs[dest]) this._fs[dest] = [];
    this._fs[dest].push(item);
    this.save();
    this._notify('__recycle__');
    this._notify(dest);
    return item;
  },

  /* ── PERMANENT DELETE from bin ── */
  shred(id) {
    if (!this._fs) this.load();
    const bin = this._fs['__recycle__'] || [];
    const idx = bin.findIndex(i => i.id === id);
    if (idx === -1) return;
    const [item] = bin.splice(idx, 1);
    /* revoke blob URL if present */
    if (item.blobUrl) { try { URL.revokeObjectURL(item.blobUrl); } catch(e){} }
    this.save();
    this._notify('__recycle__');
    return item;
  },

  /* ── EMPTY BIN ── */
  emptyRecycle() {
    if (!this._fs) this.load();
    (this._fs['__recycle__'] || []).forEach(item => {
      if (item.blobUrl) { try { URL.revokeObjectURL(item.blobUrl); } catch(e){} }
    });
    this._fs['__recycle__'] = [];
    this.save();
    this._notify('__recycle__');
  },

  /* ── CREATE FOLDER ── */
  createFolder(location, name) {
    const item = {
      id  : 'vfs-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
      type: 'folder', name, icon: 'icons/folder.png',
    };
    return this.addFile(location, item);
  },

  /* ── UNIQUE NAME HELPER ── */
  uniqueName(location, baseName) {
    if (!this._fs) this.load();
    const arr = this._fs[location] || [];
    const bin = this._fs['__recycle__'] || [];
    const allNames = new Set([...arr, ...bin].map(i => i.name));
    if (!allNames.has(baseName)) return baseName;
    let n = 2;
    while (allNames.has(`${baseName} (${n})`)) n++;
    return `${baseName} (${n})`;
  },

  /* ── ICON FROM EXTENSION ── */
  iconForExt(ext) {
    const map = {
      pdf:'icons/file-pdf.png', doc:'icons/file-word.png', docx:'icons/file-word.png',
      xls:'icons/file-excel.png', xlsx:'icons/file-excel.png',
      ppt:'icons/file-ppt.png', pptx:'icons/file-ppt.png',
      txt:'icons/file-text.png', md:'icons/file-text.png',
      js:'icons/file-code.png',  ts:'icons/file-code.png',
      html:'icons/file-code.png',css:'icons/file-code.png',
      json:'icons/file-code.png',xml:'icons/file-code.png',
      py:'icons/file-code.png',  java:'icons/file-code.png',
      jpg:'icons/file-image.png',jpeg:'icons/file-image.png',
      png:'icons/file-image.png',gif:'icons/file-image.png',
      webp:'icons/file-image.png',bmp:'icons/file-image.png',
      svg:'icons/file-image.png',
      mp3:'icons/file-audio.png',wav:'icons/file-audio.png',
      ogg:'icons/file-audio.png',flac:'icons/file-audio.png',
      mp4:'icons/file-video.png',mkv:'icons/file-video.png',
      avi:'icons/file-video.png',mov:'icons/file-video.png',
      webm:'icons/file-video.png',
      zip:'icons/file-zip.png',  rar:'icons/file-zip.png',
      '7z':'icons/file-zip.png',
      exe:'icons/file-exe.png',  msi:'icons/file-exe.png',
      sys:'icons/file-sys.png',
    };
    return map[ext] || 'icons/file-text.png';
  },
};

/* Auto-load on script parse */
VFS.load();
 