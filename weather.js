/* ═══════════════════════════════════════════════════════════
   Weather App  ·  weather.js
   Windows 8 Bing Weather — vanilla JS conversion of WeatherApp.tsx   ═══════════════════════════════════════════════════════════ */
'use strict';

const WX_API_KEY = 'bc2ac4aba65cc65356b7047ffacc1b83';
const WX_CITY    = 'New York';

/* ════════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════════ */
const WX = {
  isMin : false,
  isMax : false,
  drag  : { on:false, ox:0, oy:0 },
  resize: { on:false, sx:0, sy:0, sw:0, sh:0 },
  data  : null,
  city  : WX_CITY,
};

/* ════════════════════════════════════════════════════════════
   MOCK DATA (fallback if API fails or offline)
   ════════════════════════════════════════════════════════════ */
const WX_MOCK = {
  location : 'NEW YORK, US',
  current  : { temp:68, condition:'Partly Cloudy', feelsLike:64, wind:'E 11 mph', visibility:'6 mi', humidity:'62 %', barometer:'30.12 in', iconCode:'02d' },
  forecast : [
    { day:'MON', date:'7',  high:70, low:58, condition:'Partly Cloudy', precip:20, iconCode:'02d' },
    { day:'TUE', date:'8',  high:65, low:55, condition:'Light Rain',    precip:70, iconCode:'10d' },
    { day:'WED', date:'9',  high:60, low:50, condition:'Cloudy',        precip:40, iconCode:'04d' },
    { day:'THU', date:'10', high:72, low:56, condition:'Sunny',         precip:5,  iconCode:'01d' },
    { day:'FRI', date:'11', high:75, low:60, condition:'Sunny',         precip:5,  iconCode:'01d' },
  ],
  hourly : [
    { time:'12:00 PM', temp:68, iconCode:'02d' },
    { time:'1:00 PM',  temp:70, iconCode:'02d' },
    { time:'2:00 PM',  temp:71, iconCode:'03d' },
    { time:'3:00 PM',  temp:70, iconCode:'10d' },
    { time:'4:00 PM',  temp:68, iconCode:'10d' },
    { time:'5:00 PM',  temp:65, iconCode:'10d' },
    { time:'6:00 PM',  temp:63, iconCode:'04d' },
    { time:'7:00 PM',  temp:61, iconCode:'04n' },
    { time:'8:00 PM',  temp:60, iconCode:'04n' },
    { time:'9:00 PM',  temp:59, iconCode:'03n' },
    { time:'10:00 PM', temp:58, iconCode:'03n' },
  ],
  providers: [
    { name:'AccuWeather', data:[
      { high:71, low:59, precip:25, iconCode:'02d' },
      { high:66, low:54, precip:75, iconCode:'10d' },
      { high:61, low:51, precip:45, iconCode:'04d' },
      { high:73, low:57, precip:8,  iconCode:'01d' },
      { high:76, low:61, precip:5,  iconCode:'01d' },
    ]},
    { name:'Foreca', data:[
      { high:69, low:57, precip:18, iconCode:'02d' },
      { high:64, low:53, precip:80, iconCode:'10d' },
      { high:59, low:49, precip:50, iconCode:'04d' },
      { high:71, low:55, precip:10, iconCode:'01d' },
      { high:74, low:59, precip:6,  iconCode:'01d' },
    ]},
  ],
  updated: 'Last updated ' + new Date().toLocaleString(),
};

/* ════════════════════════════════════════════════════════════
   SVG ICON GENERATOR
   Converts OpenWeather icon codes to inline SVG
   ════════════════════════════════════════════════════════════ */
function wxIcon(code, size) {
  size = size || 48;
  const s = size;
  const sw = Math.max(1, s / 30); /* stroke width scales with size */

  /* sunny */
  if (code.includes('01')) return `
    <svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="color:#fbbf24">
      <circle cx="24" cy="24" r="10" stroke="#fbbf24" stroke-width="${sw}" fill="none"/>
      ${[0,45,90,135,180,225,270,315].map(a => {
        const r = a * Math.PI / 180;
        const x1 = 24 + 14*Math.cos(r), y1 = 24 + 14*Math.sin(r);
        const x2 = 24 + 18*Math.cos(r), y2 = 24 + 18*Math.sin(r);
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#fbbf24" stroke-width="${sw}"/>`;
      }).join('')}
    </svg>`;

  /* partly cloudy */
  if (code.includes('02')) return `
    <svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="20" r="8" stroke="#fbbf24" stroke-width="${sw}" fill="none"/>
      ${[0,60,120,180,240,300].map(a => {
        const r = a * Math.PI / 180;
        const x1 = 16 + 10*Math.cos(r), y1 = 20 + 10*Math.sin(r);
        const x2 = 16 + 13*Math.cos(r), y2 = 20 + 13*Math.sin(r);
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#fbbf24" stroke-width="${sw}"/>`;
      }).join('')}
      <path d="M22 30 Q22 22 30 22 Q38 22 38 30 Q38 36 32 36 L20 36 Q14 36 14 30 Q14 26 18 25 Q18 18 24 20" stroke="rgba(255,255,255,0.9)" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
    </svg>`;

  /* cloudy / overcast */
  if (code.includes('03') || code.includes('04')) return `
    <svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 30 Q10 20 20 20 Q22 14 30 14 Q40 14 40 24 Q46 24 46 32 Q46 40 38 40 L12 40 Q4 40 4 32 Q4 26 10 26" stroke="rgba(255,255,255,0.8)" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
    </svg>`;

  /* rain */
  if (code.includes('09') || code.includes('10')) return `
    <svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 24 Q8 14 18 14 Q20 8 28 8 Q38 8 38 18 Q44 18 44 26 Q44 32 38 32 L10 32 Q4 32 4 26 Q4 22 8 22" stroke="rgba(255,255,255,0.8)" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
      <line x1="16" y1="36" x2="14" y2="44" stroke="#93c5fd" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="24" y1="36" x2="22" y2="44" stroke="#93c5fd" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="32" y1="36" x2="30" y2="44" stroke="#93c5fd" stroke-width="${sw}" stroke-linecap="round"/>
    </svg>`;

  /* snow */
  if (code.includes('13')) return `
    <svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 22 Q8 12 18 12 Q20 6 28 6 Q38 6 38 16 Q44 16 44 24 Q44 30 38 30 L10 30 Q4 30 4 24 Q4 20 8 20" stroke="rgba(255,255,255,0.8)" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
      <circle cx="16" cy="38" r="2.5" stroke="#e0f2fe" stroke-width="${sw}" fill="none"/>
      <circle cx="24" cy="42" r="2.5" stroke="#e0f2fe" stroke-width="${sw}" fill="none"/>
      <circle cx="32" cy="38" r="2.5" stroke="#e0f2fe" stroke-width="${sw}" fill="none"/>
    </svg>`;

  /* default cloud */
  return `
    <svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 30 Q10 20 20 20 Q22 14 30 14 Q40 14 40 24 Q46 24 46 32 Q46 40 38 40 L12 40 Q4 40 4 32 Q4 26 10 26" stroke="rgba(255,255,255,0.8)" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
    </svg>`;
}

/* umbrella mini icon */
function wxUmbrellaIcon() {
  return `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 12a11 11 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"/></svg>`;
}

/* ════════════════════════════════════════════════════════════
   FETCH FROM OPENWEATHER API
   ════════════════════════════════════════════════════════════ */
async function wxFetch(city) {
  const base = 'https://api.openweathermap.org/data/2.5';
  const key  = WX_API_KEY;

  const [curRes, fcRes] = await Promise.all([
    fetch(`${base}/weather?q=${encodeURIComponent(city)}&units=imperial&appid=${key}`),
    fetch(`${base}/forecast?q=${encodeURIComponent(city)}&units=imperial&appid=${key}`)
  ]);

  if (!curRes.ok) throw new Error('City not found');

  const cur = await curRes.json();
  const fc  = await fcRes.json();

  const location = `${cur.name}, ${cur.sys.country}`.toUpperCase();

  const current = {
    temp      : Math.round(cur.main.temp),
    condition : cur.weather[0].main,
    feelsLike : Math.round(cur.main.feels_like),
    wind      : `${Math.round(cur.wind.speed)} mph`,
    visibility: `${(cur.visibility / 1609).toFixed(1)} mi`,
    humidity  : `${cur.main.humidity} %`,
    barometer : `${(cur.main.pressure * 0.02953).toFixed(2)} in`,
    iconCode  : cur.weather[0].icon,
  };

  /* hourly — first 11 3-hour slots */
  const hourly = fc.list.slice(0, 11).map(item => {
    const d  = new Date(item.dt * 1000);
    const h  = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = ((h % 12) || 12);
    return {
      time    : `${h12}:00 ${ampm}`,
      temp    : Math.round(item.main.temp),
      iconCode: item.weather[0].icon,
    };
  });

  /* daily — group by day, take first 5 unique days */
  const dayMap = {};
  fc.list.forEach(item => {
    const d = new Date(item.dt * 1000);
    const dayKey = d.toDateString();
    if (!dayMap[dayKey]) {
      dayMap[dayKey] = {
        day     : d.toLocaleDateString('en-US', { weekday:'short' }).toUpperCase(),
        date    : String(d.getDate()),
        high    : Math.round(item.main.temp),
        low     : Math.round(item.main.temp),
        condition: item.weather[0].main,
        precip  : Math.round((item.pop || 0) * 100),
        iconCode: item.weather[0].icon,
      };
    } else {
      dayMap[dayKey].high = Math.max(dayMap[dayKey].high, Math.round(item.main.temp));
      dayMap[dayKey].low  = Math.min(dayMap[dayKey].low,  Math.round(item.main.temp));
    }
  });
  const forecast = Object.values(dayMap).slice(0, 5);

  return { location, current, forecast, hourly, providers: WX_MOCK.providers, updated: `Last updated ${new Date().toLocaleString()}` };
}

/* ════════════════════════════════════════════════════════════
   RENDER
   ════════════════════════════════════════════════════════════ */
function wxRender(data) {
  const content = document.getElementById('wxContent');
  if (!content) return;

  const d = data;

  /* forecast days HTML */
  const forecastHTML = (d.forecast || []).map(day => `
    <div class="wx-day">
      <div class="wx-day-label">${day.day} ${day.date}</div>
      <div class="wx-day-icon">${wxIcon(day.iconCode, 44)}</div>
      <div class="wx-day-temps">${day.high}°<span class="low">/${day.low}°</span></div>
      <div class="wx-day-cond">${day.condition}</div>
      <div class="wx-day-precip">${wxUmbrellaIcon()} ${day.precip}%</div>
    </div>`).join('');

  /* providers HTML */
  const numDays = (d.forecast || []).length;
  let providersHTML = '';
  for (let col = 0; col < numDays; col++) {
    providersHTML += `<div class="wx-provider-col">`;
    (d.providers || []).forEach(prov => {
      const pd = prov.data[col] || {};
      providersHTML += `
        <div class="wx-prow">
          <div class="wx-prow-icon">${wxIcon(pd.iconCode || '03d', 20)}</div>
          <div class="wx-prow-data">
            <div class="wx-prow-temps">${pd.high || '--'}°<span class="low">/${pd.low || '--'}°</span></div>
            <div class="wx-prow-precip">${wxUmbrellaIcon()} ${pd.precip || 0}%</div>
          </div>
        </div>`;
    });
    providersHTML += `</div>`;
  }
  const providerLabelsHTML = (d.providers || []).map(p =>
    `<div class="wx-provider-name">${p.name}</div>`).join('');

  /* hourly sidebar HTML */
  const hourlyHTML = (d.hourly || []).map((h, i) => `
    <div class="wx-hour-row ${i === 0 ? 'active' : ''}">
      <div class="wx-hour-time">${h.time}</div>
      <div class="wx-hour-right">
        <div class="wx-hour-icon">${wxIcon(h.iconCode, 18)}</div>
        <div class="wx-hour-temp">${h.temp}°</div>
      </div>
    </div>`).join('');

  content.innerHTML = `
    <!-- Background -->
    <div class="wx-bg"></div>

    <!-- Title bar -->
    <div class="wx-titlebar" id="wxTitleBar">
      <div class="wx-title-left">
        <div class="wx-title-icon">W</div>
        <span class="wx-title-text">Weather</span>
      </div>
      <div class="wx-controls">
        <button class="wx-btn" onclick="wxMinimise()" title="Minimise">&#x2014;</button>
        <button class="wx-btn" id="wxMaxBtn" onclick="wxMaximise()" title="Maximise">&#x2610;</button>
        <button class="wx-btn close" onclick="wxClose()" title="Close">&#x2715;</button>
      </div>
    </div>

    <!-- Main body -->
    <div class="wx-body">

      <!-- Left content -->
      <div class="wx-left">

        <!-- Header -->
        <div class="wx-header">
          <div class="wx-back-btn" onclick="wxClose()" title="Close">&#x276E;</div>
          <div>
            <div class="wx-location">${d.location}</div>
            <div class="wx-app-name">Bing Weather</div>
          </div>
        </div>

        <!-- Current weather -->
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:8px">
          <div class="wx-temp-big">
            <span class="wx-temp-num">${d.current.temp}</span>
            <span class="wx-temp-unit">°F</span>
          </div>
          <div class="wx-current-icon">${wxIcon(d.current.iconCode, 64)}</div>
        </div>

        <div class="wx-condition">${d.current.condition}</div>
        <div class="wx-feels">Feels Like ${d.current.feelsLike}°</div>

        <!-- Details grid -->
        <div class="wx-details">
          <div><div class="wx-detail-label">Wind</div><div class="wx-detail-val">${d.current.wind}</div></div>
          <div><div class="wx-detail-label">Visibility</div><div class="wx-detail-val">${d.current.visibility}</div></div>
          <div><div class="wx-detail-label">Humidity</div><div class="wx-detail-val">${d.current.humidity}</div></div>
          <div><div class="wx-detail-label">Barometer</div><div class="wx-detail-val">${d.current.barometer}</div></div>
        </div>

      </div>

      <!-- Middle — Forecast + Providers -->
      <div class="wx-forecast-area">

        <!-- 5-day forecast -->
        <div class="wx-forecast-days">
          ${forecastHTML}
        </div>

        <!-- Provider comparison -->
        <div class="wx-providers">
          <div class="wx-provider-labels">${providerLabelsHTML}</div>
          ${providersHTML}
        </div>

      </div>

      <!-- Right sidebar — hourly -->
      <div class="wx-sidebar">
        <div class="wx-sidebar-header">
          <div class="wx-hourly-title">Hourly Forecast</div>
          <div class="wx-hourly-col-labels"><span>Time</span><span>Temp</span></div>
        </div>
        <div class="wx-hourly-list">${hourlyHTML}</div>
      </div>

    </div>

    <!-- Footer -->
    <div class="wx-footer">${d.updated}</div>

    <!-- Resize handle -->
    <div class="wx-resize" id="wxResizeHandle"></div>`;

  /* setup title bar drag after render */
  wxSetupDrag();
  wxSetupResize();
  document.getElementById('wxTitleBar')?.addEventListener('dblclick', wxMaximise);
}

function wxShowLoading() {
  const content = document.getElementById('wxContent');
  if (content) content.innerHTML = `
    <div class="wx-bg"></div>
    <div class="wx-loading">
      <div class="wx-spinner"></div>
      <div class="wx-loading-text">Fetching weather data…</div>
    </div>`;
}

function wxShowError(msg) {
  const content = document.getElementById('wxContent');
  if (content) content.innerHTML = `
    <div class="wx-bg"></div>
    <div class="wx-error">
      <div class="wx-error-icon">⛅</div>
      <div class="wx-error-msg">${msg}</div>
      <div class="wx-error-sub">Showing cached data instead.</div>
    </div>`;
  setTimeout(() => wxRender(WX_MOCK), 1800);
}

/* ════════════════════════════════════════════════════════════
   OPEN
   ════════════════════════════════════════════════════════════ */
async function openWeather() {
  const existing = document.getElementById('weatherWindow');
  if (existing) {
    if (WX.isMin) wxRestore();
    return;
  }

  /* build window shell */
  const win = document.createElement('div');
  win.id = 'weatherWindow';
  win.innerHTML = `<div id="wxContent" style="position:relative;width:100%;height:100%;display:flex;"></div>`;
  document.body.appendChild(win);

  wxInjectTaskbar();

  /* show loading state */
  wxShowLoading();

  /* fetch live data */
  try {
    const data = await wxFetch(WX_CITY);
    WX.data = data;
    wxRender(data);
  } catch (err) {
    console.warn('[Weather] API failed, using mock data:', err.message);
    WX.data = WX_MOCK;
    wxRender(WX_MOCK);
  }
}

/* ════════════════════════════════════════════════════════════
   WINDOW CONTROLS
   ════════════════════════════════════════════════════════════ */
function wxClose() {
  const win = document.getElementById('weatherWindow');
  const tb  = document.getElementById('tbWeather');
  if (!win) return;
  win.style.animation = 'wxMin .2s cubic-bezier(.4,0,1,1) both';
  setTimeout(() => { win.remove(); if(tb) tb.remove(); }, 200);
}

function wxMinimise() {
  const win = document.getElementById('weatherWindow');
  const tb  = document.getElementById('tbWeather');
  WX.isMin  = true;
  win.classList.add('minimising');
  setTimeout(() => {
    win.style.display = 'none';
    win.classList.remove('minimising');
    if (tb) tb.classList.add('minimised');
  }, 220);
}

function wxRestore() {
  const win = document.getElementById('weatherWindow');
  const tb  = document.getElementById('tbWeather');
  win.style.display = 'flex';
  win.classList.add('restoring');
  setTimeout(() => win.classList.remove('restoring'), 220);
  WX.isMin = false;
  if (tb) tb.classList.remove('minimised');
}

function wxMaximise() {
  const win = document.getElementById('weatherWindow');
  const btn = document.getElementById('wxMaxBtn');
  WX.isMax  = !WX.isMax;
  win.classList.toggle('maximised', WX.isMax);
  if (btn) btn.textContent = WX.isMax ? '\u29C9' : '\u2610';
}

function wxToggleFromTaskbar() { if (WX.isMin) wxRestore(); else wxMinimise(); }

function wxInjectTaskbar() {
  const tbLeft = document.querySelector('.tb-left');
  if (!tbLeft || document.getElementById('tbWeather')) return;
  const el = document.createElement('div');
  el.id    = 'tbWeather';
  el.title = 'Weather';
  el.innerHTML = `<span>⛅ Weather</span>`;
  el.onclick = wxToggleFromTaskbar;
  el.oncontextmenu = e => {
    e.preventDefault(); e.stopPropagation();
    if (typeof showTaskbarAppCtx === 'function') showTaskbarAppCtx(e, 'Weather', false);
  };
  tbLeft.appendChild(el);
}

/* ════════════════════════════════════════════════════════════
   DRAG
   ════════════════════════════════════════════════════════════ */
function wxSetupDrag() {
  const tb = document.getElementById('wxTitleBar');
  if (!tb) return;
  tb.addEventListener('mousedown', e => {
    if (e.target.closest('.wx-controls') || WX.isMax) return;
    WX.drag.on = true;
    const win  = document.getElementById('weatherWindow');
    const r    = win.getBoundingClientRect();
    WX.drag.ox = e.clientX - r.left;
    WX.drag.oy = e.clientY - r.top;
    win.style.transition = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!WX.drag.on) return;
    const win = document.getElementById('weatherWindow');
    if (!win) { WX.drag.on = false; return; }
    let x = e.clientX - WX.drag.ox;
    let y = e.clientY - WX.drag.oy;
    x = Math.max(-win.offsetWidth+80, Math.min(window.innerWidth-80, x));
    y = Math.max(0, Math.min(window.innerHeight-32, y));
    win.style.left = x+'px'; win.style.top = y+'px';
  });
  document.addEventListener('mouseup', () => { WX.drag.on = false; });
}

/* ════════════════════════════════════════════════════════════
   RESIZE
   ════════════════════════════════════════════════════════════ */
function wxSetupResize() {
  const h = document.getElementById('wxResizeHandle');
  if (!h) return;
  h.addEventListener('mousedown', e => {
    if (WX.isMax) return;
    WX.resize.on = true;
    const win = document.getElementById('weatherWindow');
    WX.resize.sx=e.clientX; WX.resize.sy=e.clientY;
    WX.resize.sw=win.offsetWidth; WX.resize.sh=win.offsetHeight;
    e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('mousemove', e => {
    if (!WX.resize.on) return;
    const win = document.getElementById('weatherWindow');
    if (!win) { WX.resize.on = false; return; }
    win.style.width  = Math.max(600, WX.resize.sw+(e.clientX-WX.resize.sx))+'px';
    win.style.height = Math.max(400, WX.resize.sh+(e.clientY-WX.resize.sy))+'px';
  });
  document.addEventListener('mouseup', () => { WX.resize.on = false; });
}
 