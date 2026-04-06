/* ═══════════════════════════════════════════════════════════
   Maps App  ·  maps.js
   Windows 8 Bing Maps style — Leaflet.js powered
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════════ */
const MP = {
  isMin     : false,
  isMax     : false,
  map       : null,
  tileLayer : null,
  markers   : [],
  routeLayer: null,
  currentView: 'road',   /* road | satellite | terrain */
  routeMode  : 'drive',  /* drive | walk | transit */
  sidebarOpen: true,
  routePanelOpen: false,
  drag  : { on:false, ox:0, oy:0 },
  resize: { on:false, sx:0, sy:0, sw:0, sh:0 },
};

/* tile layer URLs */
const MP_TILES = {
  road: {
    url  : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr : '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    maxZ : 19,
  },
  satellite: {
    url  : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr : '&copy; Esri, Maxar, Earthstar Geographics',
    maxZ : 18,
  },
  terrain: {
    url  : 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attr : '&copy; OpenTopoMap contributors',
    maxZ : 17,
  },
};

/* Favourite/notable places for sidebar */
const MP_PLACES = [
  { name:'New York City',    desc:'United States',  lat:40.7128,  lng:-74.0060,  icon:'🗽', color:'red'    },
  { name:'London',           desc:'United Kingdom', lat:51.5074,  lng:-0.1278,   icon:'🎡', color:'blue'   },
  { name:'Tokyo',            desc:'Japan',          lat:35.6762,  lng:139.6503,  icon:'🗼', color:'red'    },
  { name:'Paris',            desc:'France',         lat:48.8566,  lng:2.3522,    icon:'🗼', color:'orange' },
  { name:'Sydney',           desc:'Australia',      lat:-33.8688, lng:151.2093,  icon:'🏄', color:'blue'   },
  { name:'Dubai',            desc:'UAE',            lat:25.2048,  lng:55.2708,   icon:'🏙', color:'orange' },
  { name:'Mumbai',           desc:'India',          lat:19.0760,  lng:72.8777,   icon:'🌊', color:'blue'   },
  { name:'Rio de Janeiro',   desc:'Brazil',         lat:-22.9068, lng:-43.1729,  icon:'🏔', color:'green'  },
  { name:'Cairo',            desc:'Egypt',          lat:30.0444,  lng:31.2357,   icon:'🏛', color:'orange' },
  { name:'Moscow',           desc:'Russia',         lat:55.7558,  lng:37.6176,   icon:'❄', color:'blue'   },
];

/* ════════════════════════════════════════════════════════════
   OPEN
   ════════════════════════════════════════════════════════════ */
function openMaps() {
  const existing = document.getElementById('mapsWindow');
  if (existing) { if (MP.isMin) mpRestore(); return; }
  mpBuildWindow();
  mpInjectTaskbar();
  mpSetupDrag();
  mpSetupResize();
  /* init Leaflet after the DOM is painted */
  requestAnimationFrame(() => requestAnimationFrame(() => mpInitMap()));
}

/* ════════════════════════════════════════════════════════════
   BUILD WINDOW DOM
   ════════════════════════════════════════════════════════════ */
function mpBuildWindow() {
  const win = document.createElement('div');
  win.id = 'mapsWindow';

  const placesHTML = MP_PLACES.map((p, i) => `
    <div class="mp-place-item" onclick="mpFlyTo(${p.lat},${p.lng},12,'${p.name.replace(/'/g,"\\'")}','${p.icon}')" id="mpPlace-${i}">
      <div class="mp-place-pin ${p.color}">${p.icon}</div>
      <div class="mp-place-info">
        <div class="mp-place-name">${p.name}</div>
        <div class="mp-place-desc">${p.desc}</div>
      </div>
    </div>`).join('');

  win.innerHTML = `
<!-- Title bar -->
<div class="mp-titlebar" id="mpTitleBar">
  <img class="mp-titlebar-icon" src="icons/maps.png" alt="" onerror="this.style.display='none'">
  <span class="mp-titlebar-text">Maps</span>
  <div class="mp-controls">
    <button class="mp-btn" onclick="mpMinimise()" title="Minimise">&#x2014;</button>
    <button class="mp-btn" id="mpMaxBtn" onclick="mpMaximise()" title="Maximise">&#x2610;</button>
    <button class="mp-btn close" onclick="mpClose()" title="Close">&#x2715;</button>
  </div>
</div>

<!-- Search bar -->
<div class="mp-searchbar">
  <div style="position:relative;flex:1;max-width:420px">
    <div class="mp-search-wrap">
      <span class="mp-search-icon">&#x1F50D;</span>
      <input class="mp-search-input" id="mpSearchInput"
             placeholder="Search for a place, address or coordinates…"
             autocomplete="off" autocorrect="off" spellcheck="false"
             oninput="mpOnSearchInput(this.value)"
             onkeydown="mpSearchKey(event)">
      <span class="mp-search-clear" id="mpSearchClear" onclick="mpClearSearch()">&#x2715;</span>
    </div>
    <div class="mp-suggestions" id="mpSuggestions"></div>
  </div>
  <button class="mp-search-btn" onclick="mpDoSearch()">Search</button>

  <!-- View mode buttons -->
  <div class="mp-view-group">
    <button class="mp-view-btn active" id="mpViewRoad"      onclick="mpSetView('road')">Road</button>
    <button class="mp-view-btn"        id="mpViewSatellite" onclick="mpSetView('satellite')">Aerial</button>
    <button class="mp-view-btn"        id="mpViewTerrain"   onclick="mpSetView('terrain')">Terrain</button>
  </div>

  <!-- Right tools -->
  <div class="mp-toolbar-right">
    <button class="mp-tool-btn" onclick="mpToggleRoute()" title="Directions">&#x27A1;</button>
    <button class="mp-tool-btn" id="mpTrafficBtn" onclick="mpToggleTraffic()" title="Traffic">&#x1F6A6;</button>
    <button class="mp-tool-btn" id="mpLayerBtn"   onclick="mpToggleLayerPicker()" title="Layers">&#x1F5FA;</button>
  </div>
</div>

<!-- Layer picker popup -->
<div class="mp-layer-popup" id="mpLayerPopup">
  <div class="mp-layer-item active" id="mpLayerRoad"      onclick="mpSetView('road');mpToggleLayerPicker()">
    <span class="mp-layer-check">&#x25CF;</span>Road map
  </div>
  <div class="mp-layer-item" id="mpLayerSatellite" onclick="mpSetView('satellite');mpToggleLayerPicker()">
    <span class="mp-layer-check"></span>Aerial / Satellite
  </div>
  <div class="mp-layer-item" id="mpLayerTerrain"   onclick="mpSetView('terrain');mpToggleLayerPicker()">
    <span class="mp-layer-check"></span>Terrain
  </div>
</div>

<!-- Body -->
<div class="mp-body">

  <!-- Left sidebar -->
  <div class="mp-sidebar" id="mpSidebar">
    <div class="mp-sidebar-title">Favourite Places</div>
    <div class="mp-place-list">${placesHTML}</div>
  </div>

  <!-- Route panel (slides over sidebar) -->
  <div class="mp-route-panel" id="mpRoutePanel">
    <div class="mp-route-header">
      <span class="mp-route-title">Get Directions</span>
      <span class="mp-route-close" onclick="mpToggleRoute()">&#x2715;</span>
    </div>
    <div class="mp-route-inputs">
      <div class="mp-route-input-wrap">
        <div class="mp-route-dot" style="background:#55ff55"></div>
        <input class="mp-route-input" id="mpRouteFrom" placeholder="Starting point…" autocomplete="off">
      </div>
      <div class="mp-route-input-wrap">
        <div class="mp-route-dot" style="background:#e81123"></div>
        <input class="mp-route-input" id="mpRouteTo" placeholder="Destination…" autocomplete="off">
      </div>
      <button class="mp-route-go-btn" onclick="mpGetRoute()">Get Directions</button>
    </div>
    <div class="mp-route-mode-bar">
      <button class="mp-mode-btn active" id="mpModeDrive"   onclick="mpSetRouteMode('drive')"   title="Driving">&#x1F697;</button>
      <button class="mp-mode-btn"        id="mpModeWalk"    onclick="mpSetRouteMode('walk')"    title="Walking">&#x1F6B6;</button>
      <button class="mp-mode-btn"        id="mpModeTransit" onclick="mpSetRouteMode('transit')" title="Transit">&#x1F68C;</button>
    </div>
    <div class="mp-route-steps" id="mpRouteSteps">
      <div style="padding:20px 16px;font-size:13px;color:rgba(255,255,255,.35);text-align:center">
        Enter a starting point and destination to get directions.
      </div>
    </div>
    <div class="mp-route-summary" id="mpRouteSummary" style="display:none">
      <div class="mp-route-stat">
        <div class="mp-route-stat-val" id="mpRouteDist">—</div>
        <div class="mp-route-stat-label">DISTANCE</div>
      </div>
      <div class="mp-route-stat">
        <div class="mp-route-stat-val" id="mpRouteTime">—</div>
        <div class="mp-route-stat-label">EST. TIME</div>
      </div>
    </div>
  </div>

  <!-- Leaflet map -->
  <div id="mpLeaflet"></div>

  <!-- Custom controls -->
  <div class="mp-compass" onclick="mpResetBearing()" title="Reset North">&#x1F9ED;</div>
  <div class="mp-3d-badge" id="mp3dBadge" onclick="mpToggle3D()" title="Toggle perspective">3D</div>

  <div class="mp-locate-btn" id="mpLocateBtn" onclick="mpLocateMe()" title="My location">&#x1F4CD;</div>

  <div class="mp-zoom-controls">
    <div class="mp-zoom-btn" onclick="MP.map&&MP.map.zoomIn()" title="Zoom in">+</div>
    <div class="mp-zoom-btn" onclick="MP.map&&MP.map.zoomOut()" title="Zoom out">&#x2212;</div>
  </div>

  <div class="mp-scale" id="mpScale"></div>

</div>

<!-- Status bar -->
<div class="mp-statusbar">
  <span class="mp-status-item" id="mpCoords">Lat: 20.000°  Lng: 0.000°</span>
  <span class="mp-status-item" id="mpZoomLevel">Zoom: 3</span>
  <span class="mp-status-item" id="mpViewLabel">Road Map</span>
  <span class="mp-status-item" style="margin-left:auto">Powered by OpenStreetMap · CARTO</span>
</div>

<!-- Resize -->
<div class="mp-resize" id="mpResizeHandle"></div>`;

  document.body.appendChild(win);
  win.querySelector('#mpTitleBar').addEventListener('dblclick', mpMaximise);
}

/* ════════════════════════════════════════════════════════════
   INIT LEAFLET MAP
   ════════════════════════════════════════════════════════════ */
function mpInitMap() {
  /* Load Leaflet CSS + JS dynamically */
  if (!document.getElementById('leafletCSS')) {
    const link = document.createElement('link');
    link.id   = 'leafletCSS';
    link.rel  = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);
  }

  if (typeof L !== 'undefined') {
    mpCreateMap();
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  script.onload = mpCreateMap;
  script.onerror = () => {
    const el = document.getElementById('mpLeaflet');
    if (el) el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,.4);gap:12px;font-family:'Segoe UI',Tahoma,sans-serif">
        <div style="font-size:40px">🗺</div>
        <div style="font-size:14px">Map could not load</div>
        <div style="font-size:12px;opacity:.6">Check your internet connection</div>
      </div>`;
  };
  document.head.appendChild(script);
}

function mpCreateMap() {
  const container = document.getElementById('mpLeaflet');
  if (!container || !window.L) return;

  /* create map — start at world view */
  MP.map = L.map('mpLeaflet', {
    center     : [20, 0],
    zoom       : 3,
    zoomControl: false,   /* we use custom zoom buttons */
    attributionControl: true,
  });

  /* set initial tile layer */
  mpApplyTileLayer('road');

  /* track mouse position → update status bar */
  MP.map.on('mousemove', e => {
    const coord = document.getElementById('mpCoords');
    if (coord) coord.textContent = `Lat: ${e.latlng.lat.toFixed(4)}°  Lng: ${e.latlng.lng.toFixed(4)}°`;
  });

  /* zoom change → update status */
  MP.map.on('zoomend', () => {
    const zEl = document.getElementById('mpZoomLevel');
    if (zEl) zEl.textContent = `Zoom: ${MP.map.getZoom()}`;
    mpUpdateScale();
  });

  /* click on map → show popup with coordinates */
  MP.map.on('click', e => {
    const lat = e.latlng.lat.toFixed(5);
    const lng = e.latlng.lng.toFixed(5);
    L.popup({ className:'mp-leaflet-popup' })
      .setLatLng(e.latlng)
      .setContent(`
        <div style="font-family:'Segoe UI',Tahoma,sans-serif;color:#fff;min-width:160px">
          <div style="font-size:13px;font-weight:600;margin-bottom:6px">📍 Location</div>
          <div style="font-size:11px;opacity:.7;margin-bottom:4px">${lat}°, ${lng}°</div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button onclick="mpSetRoutePoint('to','${lat},${lng}')"
              style="flex:1;padding:4px 8px;background:#0078d7;border:none;color:#fff;font-size:11px;cursor:pointer;font-family:'Segoe UI',Tahoma,sans-serif">
              Directions here
            </button>
          </div>
        </div>`)
      .openOn(MP.map);
  });

  mpUpdateScale();

  /* add default markers for famous landmarks */
  mpAddDefaultMarkers();
}

function mpApplyTileLayer(view) {
  if (!MP.map) return;
  if (MP.tileLayer) { MP.map.removeLayer(MP.tileLayer); }

  const cfg = MP_TILES[view] || MP_TILES.road;
  MP.tileLayer = L.tileLayer(cfg.url, {
    attribution: cfg.attr,
    maxZoom    : cfg.maxZ,
    subdomains : 'abcd',
  }).addTo(MP.map);

  /* update view label */
  const labels = { road:'Road Map', satellite:'Aerial / Satellite', terrain:'Terrain' };
  const lbl = document.getElementById('mpViewLabel');
  if (lbl) lbl.textContent = labels[view] || 'Map';

  /* update layer picker checkmarks */
  ['Road','Satellite','Terrain'].forEach(v => {
    const el = document.getElementById('mpLayer' + v);
    if (el) {
      const dot = el.querySelector('.mp-layer-check');
      el.classList.toggle('active', view === v.toLowerCase());
      if (dot) dot.textContent = view === v.toLowerCase() ? '●' : '';
    }
  });
}

function mpAddDefaultMarkers() {
  const landmarks = [
    { lat:40.6892,  lng:-74.0445,  label:'Statue of Liberty',   icon:'🗽' },
    { lat:48.8584,  lng:2.2945,    label:'Eiffel Tower',         icon:'🗼' },
    { lat:35.6586,  lng:139.7454,  label:'Tokyo Tower',          icon:'📡' },
    { lat:51.5007,  lng:-0.1246,   label:'Big Ben',              icon:'🕰' },
    { lat:-33.8568, lng:151.2153,  label:'Sydney Opera House',   icon:'🎭' },
    { lat:27.1751,  lng:78.0421,   label:'Taj Mahal',            icon:'🕌' },
    { lat:30.0444,  lng:31.2357,   label:'Great Pyramid of Giza',icon:'🔺' },
    { lat:37.8199,  lng:-122.4783, label:'Golden Gate Bridge',   icon:'🌉' },
    { lat:41.9029,  lng:12.4545,   label:'Colosseum',            icon:'🏛' },
    { lat:27.9881,  lng:86.9250,   label:'Mount Everest',        icon:'🏔' },
  ];

  landmarks.forEach(lm => {
    const icon = L.divIcon({
      className : '',
      html      : `<div style="font-size:20px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8));cursor:pointer" title="${lm.label}">${lm.icon}</div>`,
      iconSize  : [28, 28],
      iconAnchor: [14, 14],
    });
    const marker = L.marker([lm.lat, lm.lng], { icon }).addTo(MP.map);
    marker.bindPopup(`
      <div style="font-family:'Segoe UI',Tahoma,sans-serif;color:#fff">
        <div style="font-size:24px;margin-bottom:6px">${lm.icon}</div>
        <div style="font-size:14px;font-weight:600">${lm.label}</div>
        <div style="font-size:11px;opacity:.6;margin-top:4px">${lm.lat.toFixed(4)}°, ${lm.lng.toFixed(4)}°</div>
      </div>`);
    MP.markers.push(marker);
  });
}

/* ════════════════════════════════════════════════════════════
   MAP CONTROLS
   ════════════════════════════════════════════════════════════ */
function mpSetView(view) {
  MP.currentView = view;
  mpApplyTileLayer(view);

  /* update view buttons */
  ['Road','Satellite','Terrain'].forEach(v => {
    const btn = document.getElementById('mpView' + v);
    if (btn) btn.classList.toggle('active', view === v.toLowerCase());
  });

  mpToggleLayerPicker(true); /* close picker */
}

function mpFlyTo(lat, lng, zoom, name, icon) {
  if (!MP.map) return;
  MP.map.flyTo([lat, lng], zoom || 13, { animate:true, duration:1.2 });

  /* highlight active sidebar item */
  document.querySelectorAll('.mp-place-item').forEach(el => el.classList.remove('active'));
  const idx = MP_PLACES.findIndex(p => p.name === name);
  if (idx >= 0) {
    const el = document.getElementById(`mpPlace-${idx}`);
    if (el) el.classList.add('active');
  }

  /* drop a pin and open popup */
  setTimeout(() => {
    if (!MP.map) return;
    const pinIcon = L.divIcon({
      className:'', iconSize:[32,40], iconAnchor:[16,40],
      html:`<div style="text-align:center">
        <div style="font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.7))">${icon || '📍'}</div>
        <div style="width:2px;height:12px;background:#e81123;margin:0 auto"></div>
      </div>`
    });
    const m = L.marker([lat, lng], { icon:pinIcon }).addTo(MP.map);
    m.bindPopup(`
      <div style="font-family:'Segoe UI',Tahoma,sans-serif;color:#fff;min-width:140px">
        <div style="font-size:22px;margin-bottom:6px">${icon || '📍'}</div>
        <div style="font-size:14px;font-weight:600">${name || 'Location'}</div>
        <div style="font-size:11px;opacity:.6;margin-top:4px">${parseFloat(lat).toFixed(4)}°, ${parseFloat(lng).toFixed(4)}°</div>
        <div style="margin-top:10px">
          <button onclick="mpSetRoutePoint('to','${lat},${lng}')"
            style="width:100%;padding:5px 10px;background:#0078d7;border:none;color:#fff;font-size:11px;cursor:pointer;font-family:'Segoe UI',Tahoma,sans-serif">
            Get directions here
          </button>
        </div>
      </div>`).openPopup();
    MP.markers.push(m);
  }, 800);
}

/* ── SEARCH ── */
let mpSearchTimer = null;
function mpOnSearchInput(val) {
  const clear = document.getElementById('mpSearchClear');
  if (clear) clear.classList.toggle('visible', val.length > 0);

  clearTimeout(mpSearchTimer);
  if (val.length < 2) { mpCloseSuggestions(); return; }
  mpSearchTimer = setTimeout(() => mpFetchSuggestions(val), 350);
}

async function mpFetchSuggestions(query) {
  try {
    const url  = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`;
    const res  = await fetch(url, { headers:{ 'Accept-Language':'en' } });
    const data = await res.json();
    mpRenderSuggestions(data, query);
  } catch(e) {
    /* fail silently — just no suggestions */
  }
}

function mpRenderSuggestions(results, query) {
  const box = document.getElementById('mpSuggestions');
  if (!box) return;
  if (!results.length) { mpCloseSuggestions(); return; }

  box.innerHTML = results.map(r => {
    const name   = r.display_name.split(',')[0];
    const region = r.display_name.split(',').slice(1, 3).join(',').trim();
    const icons  = { city:'🏙', town:'🏘', village:'🏡', country:'🌍', state:'📍', default:'📌' };
    const icon   = icons[r.type] || icons[r.addresstype] || icons.default;
    return `
      <div class="mp-suggestion-item"
           onclick="mpPickSuggestion(${r.lat},${r.lon},'${name.replace(/'/g,"\\'")}')">
        <span class="mp-suggestion-icon">${icon}</span>
        <div>
          <div class="mp-suggestion-name">${name}</div>
          <div class="mp-suggestion-region">${region}</div>
        </div>
      </div>`;
  }).join('');
  box.classList.add('open');
}

function mpPickSuggestion(lat, lng, name) {
  const inp = document.getElementById('mpSearchInput');
  if (inp) inp.value = name;
  mpCloseSuggestions();
  mpFlyTo(lat, lng, 14, name, '📍');
}

function mpCloseSuggestions() {
  const box = document.getElementById('mpSuggestions');
  if (box) { box.classList.remove('open'); box.innerHTML = ''; }
}

function mpDoSearch() {
  const inp = document.getElementById('mpSearchInput');
  if (!inp || !inp.value.trim()) return;
  mpFetchSuggestions(inp.value.trim()).then(() => {
    /* if only 1 result, go there */
    const items = document.querySelectorAll('.mp-suggestion-item');
    if (items.length === 1) items[0].click();
  });
}

function mpSearchKey(e) {
  if (e.key === 'Enter') mpDoSearch();
  if (e.key === 'Escape') { mpClearSearch(); mpCloseSuggestions(); }
}

function mpClearSearch() {
  const inp   = document.getElementById('mpSearchInput');
  const clear = document.getElementById('mpSearchClear');
  if (inp)   inp.value = '';
  if (clear) clear.classList.remove('visible');
  mpCloseSuggestions();
}

/* ── LOCATE ME ── */
function mpLocateMe() {
  if (!MP.map) return;
  const btn = document.getElementById('mpLocateBtn');
  if (btn) btn.classList.add('locating');
  if (typeof notify === 'function') notify('Getting your location…', 'Maps');

  navigator.geolocation.getCurrentPosition(
    pos => {
      if (btn) btn.classList.remove('locating');
      const { latitude:lat, longitude:lng } = pos.coords;
      MP.map.flyTo([lat, lng], 15, { animate:true, duration:1.5 });

      /* pulse circle for user location */
      const circle = L.circle([lat, lng], {
        radius:80, color:'#4fc3f7', fillColor:'#4fc3f7', fillOpacity:.25, weight:2
      }).addTo(MP.map);

      const dotIcon = L.divIcon({
        className:'', iconSize:[14,14], iconAnchor:[7,7],
        html:`<div style="width:14px;height:14px;border-radius:50%;background:#4fc3f7;border:2px solid #fff;box-shadow:0 0 8px rgba(79,195,247,.8)"></div>`
      });
      L.marker([lat, lng], { icon:dotIcon }).addTo(MP.map)
        .bindPopup('<div style="color:#fff;font-family:Segoe UI,sans-serif;font-size:13px">📍 You are here</div>').openPopup();

      MP.markers.push(circle);
      if (typeof notify === 'function') notify('Location found', 'Maps');
    },
    err => {
      if (btn) btn.classList.remove('locating');
      if (typeof notify === 'function') notify('Could not get location — ' + err.message, 'Maps');
    },
    { timeout:8000, enableHighAccuracy:true }
  );
}

/* ── TRAFFIC TOGGLE (visual only — colours overlay) ── */
let mpTrafficOn = false;
let mpTrafficLayer = null;
function mpToggleTraffic() {
  if (!MP.map) return;
  mpTrafficOn = !mpTrafficOn;
  const btn = document.getElementById('mpTrafficBtn');
  if (btn) btn.classList.toggle('active', mpTrafficOn);

  if (mpTrafficOn) {
    /* add a subtle coloured SVG overlay as traffic simulation */
    if (typeof notify === 'function') notify('Live traffic data not available in web mode', 'Maps');
    mpTrafficOn = false;
    if (btn) btn.classList.remove('active');
  }
}

/* ── LAYER PICKER ── */
function mpToggleLayerPicker(forceClose) {
  const p = document.getElementById('mpLayerPopup');
  if (!p) return;
  const isOpen = p.classList.contains('open');
  if (forceClose || isOpen) p.classList.remove('open');
  else p.classList.add('open');
}

/* ── ROUTE ── */
function mpToggleRoute() {
  MP.routePanelOpen = !MP.routePanelOpen;
  const panel = document.getElementById('mpRoutePanel');
  if (panel) panel.classList.toggle('open', MP.routePanelOpen);
}

function mpSetRouteMode(mode) {
  MP.routeMode = mode;
  ['Drive','Walk','Transit'].forEach(m => {
    const btn = document.getElementById('mpMode' + m);
    if (btn) btn.classList.toggle('active', mode === m.toLowerCase());
  });
}

function mpSetRoutePoint(which, coords) {
  if (!MP.routePanelOpen) mpToggleRoute();
  const inp = document.getElementById(which === 'to' ? 'mpRouteTo' : 'mpRouteFrom');
  if (inp) { inp.value = coords; }
  MP.map && MP.map.closePopup();
}

async function mpGetRoute() {
  const from = document.getElementById('mpRouteFrom')?.value.trim();
  const to   = document.getElementById('mpRouteTo')?.value.trim();
  if (!from || !to) {
    if (typeof notify === 'function') notify('Enter both starting point and destination', 'Maps');
    return;
  }

  /* geocode both endpoints via Nominatim */
  try {
    const [fromData, toData] = await Promise.all([
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(from)}&limit=1`).then(r=>r.json()),
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(to)}&limit=1`).then(r=>r.json()),
    ]);

    if (!fromData.length || !toData.length) {
      if (typeof notify === 'function') notify('Could not find one or both locations', 'Maps');
      return;
    }

    const fromLL = [parseFloat(fromData[0].lat), parseFloat(fromData[0].lon)];
    const toLL   = [parseFloat(toData[0].lat),   parseFloat(toData[0].lon)];

    /* get route from OSRM (open source routing) */
    const profile = MP.routeMode === 'walk' ? 'foot' : 'driving';
    const routeUrl = `https://router.project-osrm.org/route/v1/${profile}/${fromLL[1]},${fromLL[0]};${toLL[1]},${toLL[0]}?overview=full&geometries=geojson&steps=true`;
    const routeRes  = await fetch(routeUrl);
    const routeData = await routeRes.json();

    if (!routeData.routes || !routeData.routes.length) {
      if (typeof notify === 'function') notify('No route found', 'Maps');
      return;
    }

    const route = routeData.routes[0];

    /* clear old route */
    if (MP.routeLayer) { MP.map.removeLayer(MP.routeLayer); }

    /* draw route line */
    MP.routeLayer = L.geoJSON(route.geometry, {
      style: { color:'#4fc3f7', weight:5, opacity:.85, lineJoin:'round' }
    }).addTo(MP.map);

    /* fit map to route */
    MP.map.fitBounds(MP.routeLayer.getBounds(), { padding:[30, 30] });

    /* add start/end markers */
    const startIcon = L.divIcon({ className:'', iconSize:[12,12], iconAnchor:[6,6],
      html:`<div style="width:12px;height:12px;border-radius:50%;background:#55ff55;border:2px solid #fff"></div>` });
    const endIcon   = L.divIcon({ className:'', iconSize:[12,12], iconAnchor:[6,6],
      html:`<div style="width:12px;height:12px;border-radius:50%;background:#e81123;border:2px solid #fff"></div>` });
    L.marker(fromLL, { icon:startIcon }).addTo(MP.map);
    L.marker(toLL,   { icon:endIcon   }).addTo(MP.map);

    /* summary */
    const dist = (route.distance / 1000).toFixed(1) + ' km';
    const mins = Math.round(route.duration / 60);
    const time = mins < 60 ? mins + ' min' : Math.floor(mins/60) + 'h ' + (mins%60) + 'm';

    const distEl = document.getElementById('mpRouteDist');
    const timeEl = document.getElementById('mpRouteTime');
    const sumEl  = document.getElementById('mpRouteSummary');
    if (distEl) distEl.textContent = dist;
    if (timeEl) timeEl.textContent = time;
    if (sumEl)  sumEl.style.display = 'flex';

    /* render turn-by-turn steps */
    const steps = route.legs[0]?.steps || [];
    const stepsEl = document.getElementById('mpRouteSteps');
    if (stepsEl) {
      stepsEl.innerHTML = steps.slice(0, 20).map((s, i) => `
        <div class="mp-step">
          <div class="mp-step-num">${i + 1}</div>
          <div>
            <div>${s.maneuver?.instruction || s.name || 'Continue'}</div>
            <div class="mp-step-dist">${(s.distance / 1000).toFixed(1)} km</div>
          </div>
        </div>`).join('');
    }

  } catch(err) {
    if (typeof notify === 'function') notify('Routing failed: ' + err.message, 'Maps');
  }
}

/* ── 3D TOGGLE (pitch simulation via CSS perspective) ── */
let mp3dOn = false;
function mpToggle3D() {
  mp3dOn = !mp3dOn;
  const badge = document.getElementById('mp3dBadge');
  const container = document.getElementById('mpLeaflet');
  if (badge) badge.classList.toggle('active', mp3dOn);
  if (container) {
    container.style.perspective = mp3dOn ? '800px' : '';
    container.style.transform   = mp3dOn ? 'rotateX(12deg)' : '';
    container.style.transformOrigin = 'center bottom';
    container.style.transition  = 'transform .4s ease';
  }
}

/* ── COMPASS / RESET BEARING ── */
function mpResetBearing() {
  /* Leaflet doesn't have built-in bearing, but we reset 3D tilt */
  if (mp3dOn) mpToggle3D();
  if (MP.map) MP.map.flyTo(MP.map.getCenter(), MP.map.getZoom(), { animate:true });
}

/* ── SCALE BAR ── */
function mpUpdateScale() {
  if (!MP.map) return;
  const zoom  = MP.map.getZoom();
  const meters = 156543.03392 * Math.cos(MP.map.getCenter().lat * Math.PI / 180) / Math.pow(2, zoom);
  const km     = (meters * 100 / 1000).toFixed(0);
  const scEl   = document.getElementById('mpScale');
  if (scEl) scEl.textContent = `Scale: ~${km} km / 100px`;
}

/* ════════════════════════════════════════════════════════════
   WINDOW CONTROLS
   ════════════════════════════════════════════════════════════ */
function mpClose() {
  const win = document.getElementById('mapsWindow');
  const tb  = document.getElementById('tbMaps');
  if (!win) return;
  if (MP.map) { MP.map.remove(); MP.map = null; }
  win.style.animation = 'mpMin .2s cubic-bezier(.4,0,1,1) both';
  setTimeout(() => { win.remove(); if(tb) tb.remove(); }, 200);
}

function mpMinimise() {
  const win = document.getElementById('mapsWindow');
  const tb  = document.getElementById('tbMaps');
  MP.isMin  = true;
  win.classList.add('minimising');
  setTimeout(() => {
    win.style.display = 'none';
    win.classList.remove('minimising');
    if (tb) tb.classList.add('minimised');
  }, 220);
}

function mpRestore() {
  const win = document.getElementById('mapsWindow');
  const tb  = document.getElementById('tbMaps');
  win.style.display = 'flex';
  win.classList.add('restoring');
  setTimeout(() => { win.classList.remove('restoring'); MP.map?.invalidateSize(); }, 220);
  MP.isMin = false;
  if (tb) tb.classList.remove('minimised');
}

function mpMaximise() {
  const win = document.getElementById('mapsWindow');
  const btn = document.getElementById('mpMaxBtn');
  MP.isMax  = !MP.isMax;
  win.classList.toggle('maximised', MP.isMax);
  if (btn) btn.textContent = MP.isMax ? '\u29C9' : '\u2610';
  setTimeout(() => MP.map?.invalidateSize(), 50);
}

function mpToggleFromTaskbar() { if (MP.isMin) mpRestore(); else mpMinimise(); }

function mpInjectTaskbar() {
  const tbLeft = document.querySelector('.tb-left');
  if (!tbLeft || document.getElementById('tbMaps')) return;
  const el = document.createElement('div');
  el.id    = 'tbMaps';
  el.title = 'Maps';
  el.innerHTML = `<span>🗺 Maps</span>`;
  el.onclick = mpToggleFromTaskbar;
  el.oncontextmenu = e => {
    e.preventDefault(); e.stopPropagation();
    if (typeof showTaskbarAppCtx === 'function') showTaskbarAppCtx(e, 'Maps', false);
  };
  tbLeft.appendChild(el);
}

/* ════════════════════════════════════════════════════════════
   DRAG
   ════════════════════════════════════════════════════════════ */
function mpSetupDrag() {
  const tb = document.getElementById('mpTitleBar');
  if (!tb) return;
  tb.addEventListener('mousedown', e => {
    if (e.target.closest('.mp-controls') || MP.isMax) return;
    MP.drag.on = true;
    const win  = document.getElementById('mapsWindow');
    const r    = win.getBoundingClientRect();
    MP.drag.ox = e.clientX - r.left;
    MP.drag.oy = e.clientY - r.top;
    win.style.transition = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!MP.drag.on) return;
    const win = document.getElementById('mapsWindow');
    if (!win) { MP.drag.on = false; return; }
    let x = e.clientX - MP.drag.ox;
    let y = e.clientY - MP.drag.oy;
    x = Math.max(-win.offsetWidth+80, Math.min(window.innerWidth-80, x));
    y = Math.max(0, Math.min(window.innerHeight-36, y));
    win.style.left = x+'px'; win.style.top = y+'px';
  });
  document.addEventListener('mouseup', () => { MP.drag.on = false; });
}

/* ════════════════════════════════════════════════════════════
   RESIZE
   ════════════════════════════════════════════════════════════ */
function mpSetupResize() {
  const h = document.getElementById('mpResizeHandle');
  if (!h) return;
  h.addEventListener('mousedown', e => {
    if (MP.isMax) return;
    MP.resize.on = true;
    const win = document.getElementById('mapsWindow');
    MP.resize.sx=e.clientX; MP.resize.sy=e.clientY;
    MP.resize.sw=win.offsetWidth; MP.resize.sh=win.offsetHeight;
    e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('mousemove', e => {
    if (!MP.resize.on) return;
    const win = document.getElementById('mapsWindow');
    if (!win) { MP.resize.on=false; return; }
    win.style.width  = Math.max(500, MP.resize.sw+(e.clientX-MP.resize.sx))+'px';
    win.style.height = Math.max(360, MP.resize.sh+(e.clientY-MP.resize.sy))+'px';
    MP.map?.invalidateSize();
  });
  document.addEventListener('mouseup', () => { MP.resize.on = false; });
}

/* close layer picker and suggestions on outside click */
document.addEventListener('click', e => {
  if (!e.target.closest('#mpLayerBtn') && !e.target.closest('#mpLayerPopup')) {
    const p = document.getElementById('mpLayerPopup');
    if (p) p.classList.remove('open');
  }
  if (!e.target.closest('#mpSearchInput') && !e.target.closest('#mpSuggestions')) {
    mpCloseSuggestions();
  }
});
 