/* ═══════════════════════════════════════════════════════════
   Internet Explorer  ·  ie.js
   Windows 8 IE10 style browser with AI-powered search
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════════ */
const IE = {
  tabs       : [],      /* { id, title, url, content, favicon } */
  activeId   : null,
  nextId     : 1,
  history    : [],      /* per-tab nav history */
  isMin      : false,
  isMax      : false,
  zoom       : 100,
  drag       : { on:false, ox:0, oy:0 },
  resize     : { on:false, sx:0, sy:0, sw:0, sh:0 },
  activeMenu : null,
};

/* ════════════════════════════════════════════════════════════
   OPEN
   ════════════════════════════════════════════════════════════ */
function openIE(url) {
  const existing = document.getElementById('ieWindow');
  if (existing) {
    if (IE.isMin) ieRestore();
    if (url) ieNavigate(url);
    return;
  }
  buildIEWindow();
  ieInjectTaskbar();
  ieSetupDrag();
  ieSetupResize();
  ieBuildContextMenus();
  ieNewTab(url || 'home');
}

/* ════════════════════════════════════════════════════════════
   BUILD WINDOW
   ════════════════════════════════════════════════════════════ */
function buildIEWindow() {
  const win = document.createElement('div');
  win.id = 'ieWindow';
  win.innerHTML = `
<!-- Title bar -->
<div class="ie-titlebar" id="ieTitleBar">
  <img class="ie-titlebar-icon" src="icons/ie.png" alt="" onerror="this.style.display='none'">
  <span class="ie-titlebar-text" id="ieTitleText">New Tab — Internet Explorer</span>
  <div class="ie-controls">
    <button class="ie-btn" onclick="ieMinimise()" title="Minimise">&#x2014;</button>
    <button class="ie-btn" id="ieMaxBtn" onclick="ieMaximise()" title="Maximise">&#x2610;</button>
    <button class="ie-btn close" onclick="ieClose()" title="Close">&#x2715;</button>
  </div>
</div>

<!-- Navigation bar -->
<div class="ie-navbar">
  <button class="ie-nav-btn disabled" id="ieBtnBack"    onclick="ieGoBack()"    title="Back">&#x276E;</button>
  <button class="ie-nav-btn disabled" id="ieBtnForward" onclick="ieGoForward()" title="Forward">&#x276F;</button>
  <button class="ie-nav-btn" onclick="ieRefresh()" title="Refresh">&#x21BA;</button>
  <button class="ie-nav-btn" onclick="ieNavigate('home')" title="Home">&#x2302;</button>
  <div class="ie-address-wrap" id="ieAddressWrap">
    <img class="ie-address-icon" id="ieFavicon" src="icons/ie.png" alt=""
         onerror="this.style.display='none'">
    <input class="ie-address-input" id="ieAddressInput"
           placeholder="Search or enter web address"
           onkeydown="ieAddressKey(event)"
           onfocus="this.select()">
    <button class="ie-go-btn" onclick="ieGoFromAddress()" title="Go">&#x276F;</button>
  </div>
</div>

<!-- Tab bar -->
<div class="ie-tabbar" id="ieTabbar">
  <span class="ie-new-tab" onclick="ieNewTab('home')" title="New Tab">&#x2B;</span>
</div>

<!-- Content area -->
<div class="ie-content" id="ieContent">
  <div class="ie-loading-bar" id="ieLoadingBar"></div>
</div>

<!-- Status bar -->
<div class="ie-statusbar">
  <span class="ie-status-text" id="ieStatusText">Done</span>
  <div class="ie-status-right">
    <div class="ie-security">&#x1F512; Internet | Protected Mode: On</div>
    <div class="ie-zoom-level" id="ieZoomLevel" onclick="ieResetZoom()">100%</div>
  </div>
</div>

<!-- Resize handle -->
<div class="ie-resize" id="ieResizeHandle"></div>`;

  document.body.appendChild(win);
  document.getElementById('ieTitleBar').addEventListener('dblclick', ieMaximise);
}

/* ════════════════════════════════════════════════════════════
   TABS
   ════════════════════════════════════════════════════════════ */
function ieNewTab(url) {
  const id  = IE.nextId++;
  const tab = { id, title:'New Tab', url:url||'home', history:['home'], histIdx:0 };
  IE.tabs.push(tab);
  ieActivateTab(id);
  ieRenderTabbar();
  ieLoadPage(url || 'home');
}

function ieActivateTab(id) {
  IE.activeId = id;
  ieRenderTabbar();
  const tab = IE.tabs.find(t => t.id === id);
  if (tab) {
    document.getElementById('ieAddressInput').value = tab.url === 'home' ? '' : tab.url;
    document.getElementById('ieTitleText').textContent = tab.title + ' — Internet Explorer';
    ieLoadPage(tab.url);
    ieUpdateNavButtons();
  }
}

function ieCloseTab(id, e) {
  e && e.stopPropagation();
  const idx = IE.tabs.findIndex(t => t.id === id);
  if (idx === -1) return;
  IE.tabs.splice(idx, 1);
  if (IE.tabs.length === 0) { ieClose(); return; }
  if (IE.activeId === id) {
    const newTab = IE.tabs[Math.max(0, idx - 1)];
    ieActivateTab(newTab.id);
  }
  ieRenderTabbar();
}

function ieRenderTabbar() {
  const bar = document.getElementById('ieTabbar');
  if (!bar) return;
  bar.innerHTML = '';

  IE.tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'ie-tab' + (tab.id === IE.activeId ? ' active' : '');
    el.title = tab.title;
    el.innerHTML = `
      <img src="${tab.favicon || 'icons/ie.png'}" onerror="this.src='icons/ie.png'" alt="">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis">${tab.title}</span>
      <span class="ie-tab-close" onclick="ieCloseTab(${tab.id},event)">&#x2715;</span>`;
    el.onclick = () => ieActivateTab(tab.id);
    bar.appendChild(el);
  });

  const newBtn = document.createElement('span');
  newBtn.className = 'ie-new-tab';
  newBtn.textContent = '+';
  newBtn.title = 'New Tab';
  newBtn.onclick = () => ieNewTab('home');
  bar.appendChild(newBtn);
}

/* ════════════════════════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════════════════════════ */
function ieNavigate(url) {
  const tab = IE.tabs.find(t => t.id === IE.activeId);
  if (!tab) return;
  /* add to tab history */
  tab.history = tab.history.slice(0, tab.histIdx + 1);
  tab.history.push(url);
  tab.histIdx = tab.history.length - 1;
  tab.url = url;
  document.getElementById('ieAddressInput').value = url === 'home' ? '' : url;
  ieLoadPage(url);
  ieUpdateNavButtons();
}

function ieGoBack() {
  const tab = IE.tabs.find(t => t.id === IE.activeId);
  if (!tab || tab.histIdx <= 0) return;
  tab.histIdx--;
  tab.url = tab.history[tab.histIdx];
  document.getElementById('ieAddressInput').value = tab.url === 'home' ? '' : tab.url;
  ieLoadPage(tab.url);
  ieUpdateNavButtons();
}

function ieGoForward() {
  const tab = IE.tabs.find(t => t.id === IE.activeId);
  if (!tab || tab.histIdx >= tab.history.length - 1) return;
  tab.histIdx++;
  tab.url = tab.history[tab.histIdx];
  document.getElementById('ieAddressInput').value = tab.url === 'home' ? '' : tab.url;
  ieLoadPage(tab.url);
  ieUpdateNavButtons();
}

function ieRefresh() {
  const tab = IE.tabs.find(t => t.id === IE.activeId);
  if (tab) ieLoadPage(tab.url, true);
}

function ieUpdateNavButtons() {
  const tab = IE.tabs.find(t => t.id === IE.activeId);
  const back = document.getElementById('ieBtnBack');
  const fwd  = document.getElementById('ieBtnForward');
  if (back) back.classList.toggle('disabled', !tab || tab.histIdx <= 0);
  if (fwd)  fwd.classList.toggle('disabled', !tab || tab.histIdx >= (tab.history?.length||1) - 1);
}

function ieAddressKey(e) {
  if (e.key === 'Enter') ieGoFromAddress();
}

function ieGoFromAddress() {
  const val = document.getElementById('ieAddressInput').value.trim();
  if (!val) return;
  /* decide if it's a URL or a search query */
  const isUrl = /^https?:\/\//.test(val) || /^www\./.test(val) || val.includes('.com') || val.includes('.org') || val.includes('.net');
  if (isUrl) {
    ieNavigate(val.startsWith('http') ? val : 'https://' + val);
  } else {
    ieNavigate('search:' + val);
  }
}

/* ════════════════════════════════════════════════════════════
   PAGE LOADER
   ════════════════════════════════════════════════════════════ */
function ieLoadPage(url, isRefresh) {
  ieSetStatus('Loading...');
  ieShowLoadingBar();

  const content = document.getElementById('ieContent');
  if (!content) return;

  /* remove old page content (keep loading bar) */
  Array.from(content.children).forEach(c => {
    if (!c.classList.contains('ie-loading-bar')) c.remove();
  });

  if (url === 'home' || !url) {
    ieHideLoadingBar();
    ieRenderHomePage(content);
    ieSetPageTitle('New Tab');
    ieSetStatus('Done');
    return;
  }

  if (url.startsWith('search:')) {
    const query = url.slice(7);
    ieRenderSearchLoading(content, query);
    ieDoAISearch(query, content);
    return;
  }

  /* external URL — show a "site preview" page */
  ieHideLoadingBar();
  ieRenderExternalPage(content, url);
  ieSetPageTitle(url);
  ieSetStatus('Done');
}

/* ════════════════════════════════════════════════════════════
   HOME PAGE
   ════════════════════════════════════════════════════════════ */
function ieRenderHomePage(container) {
  const div = document.createElement('div');
  div.className = 'ie-newtab';
  div.innerHTML = `
    <div class="ie-newtab-logo">
      <img src="icons/ie.png" onerror="this.style.display='none'" alt="IE">
      <div class="ie-newtab-logo-text">Internet Explorer</div>
      <div class="ie-newtab-logo-sub">Windows 8 Web Edition &nbsp;·&nbsp; Powered by AI Search</div>
    </div>

    <div class="ie-search-box">
      <span style="font-size:18px;color:#aaa">&#x1F50D;</span>
      <input id="ieHomeSearch" type="text" placeholder="Search Google or enter address"
             onkeydown="if(event.key==='Enter')ieHomeSearch()"
             style="flex:1;border:none;outline:none;font-size:15px;font-family:'Segoe UI',Tahoma,sans-serif">
      <button onclick="ieHomeSearch()">Search</button>
    </div>

    <div class="ie-quick-links">
      <div class="ie-quick-link" onclick="ieNavigate('search:YouTube')">
        <span class="ie-quick-link-icon">&#x25B6;</span>
        <span class="ie-quick-link-label">YouTube</span>
      </div>
      <div class="ie-quick-link" onclick="ieNavigate('search:Wikipedia')">
        <span class="ie-quick-link-icon">&#x1F4D6;</span>
        <span class="ie-quick-link-label">Wikipedia</span>
      </div>
      <div class="ie-quick-link" onclick="ieNavigate('search:Gmail')">
        <span class="ie-quick-link-icon">&#x2709;</span>
        <span class="ie-quick-link-label">Gmail</span>
      </div>
      <div class="ie-quick-link" onclick="ieNavigate('search:GitHub')">
        <span class="ie-quick-link-icon">&#x2699;</span>
        <span class="ie-quick-link-label">GitHub</span>
      </div>
      <div class="ie-quick-link" onclick="ieNavigate('search:Twitter')">
        <span class="ie-quick-link-icon">&#x1F426;</span>
        <span class="ie-quick-link-label">Twitter</span>
      </div>
      <div class="ie-quick-link" onclick="ieNavigate('search:Amazon')">
        <span class="ie-quick-link-icon">&#x1F6D2;</span>
        <span class="ie-quick-link-label">Amazon</span>
      </div>
    </div>`;
  container.appendChild(div);
  setTimeout(() => document.getElementById('ieHomeSearch')?.focus(), 100);
}

function ieHomeSearch() {
  const val = document.getElementById('ieHomeSearch')?.value?.trim();
  if (val) ieNavigate('search:' + val);
}

/* ════════════════════════════════════════════════════════════
   SEARCH LOADING STATE
   ════════════════════════════════════════════════════════════ */
function ieRenderSearchLoading(container, query) {
  const div = document.createElement('div');
  div.id = 'ieResultsPage';
  div.className = 'ie-results-page';
  div.innerHTML = `
    ${ieGoogleHeader(query)}
    <div class="ie-result-tabs">
      <div class="ie-result-tab active">All</div>
      <div class="ie-result-tab" onclick="ieNavigate('search:${query} images')">Images</div>
      <div class="ie-result-tab" onclick="ieNavigate('search:${query} news')">News</div>
      <div class="ie-result-tab" onclick="ieNavigate('search:${query} videos')">Videos</div>
    </div>
    <div class="ie-results-count">Searching with AI...</div>
    <div style="padding:20px;display:flex;align-items:center;gap:12px">
      <div class="ie-spinner" style="width:24px;height:24px;border-width:3px"></div>
      <span style="font-size:14px;color:#666;font-family:'Segoe UI',Tahoma,sans-serif">Getting AI-powered results for "<b>${ieEsc(query)}</b>"...</span>
    </div>
    <div id="ieAIResultsArea"></div>`;
  container.appendChild(div);
  ieSetPageTitle(`${query} — Google Search`);
  ieUpdateTabTitle(`${query} - Google`);
}

/* ════════════════════════════════════════════════════════════
   AI SEARCH  — calls Anthropic API
   ════════════════════════════════════════════════════════════ */
async function ieDoAISearch(query, container) {
  ieSetStatus(`Searching for "${query}"...`);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are a Google Search AI assistant embedded inside an Internet Explorer browser app running on Windows 8 Web OS.

When a user searches for something, respond with a realistic Google-style search result page in this EXACT JSON format:

{
  "answer": "A clear, helpful 2-4 sentence AI-generated answer to the query. This appears in the featured snippet / AI overview card at the top.",
  "count": "About X,XXX,XXX results (Y seconds)",
  "results": [
    {
      "title": "Page title here",
      "url": "www.example.com/path",
      "snippet": "A relevant 1-2 sentence description of what this page contains, with the <b>search query keywords</b> bolded."
    }
  ],
  "related": ["related search 1", "related search 2", "related search 3", "related search 4"]
}

Generate 4-6 realistic, relevant organic results. Make the URLs, titles and snippets feel authentic and informative. The related searches should be natural follow-up queries.
Respond ONLY with valid JSON. No markdown, no backticks, no extra text.`,
        messages: [{ role: 'user', content: `Search query: ${query}` }]
      })
    });

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';

    let parsed;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch {
      /* try to extract JSON if there's extra text */
      const match = rawText.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    if (!parsed) throw new Error('Could not parse AI response');

    ieRenderSearchResults(query, parsed, container);
    ieHideLoadingBar();
    ieSetStatus('Done');
    ieSetPageTitle(`${query} — Google Search`);

  } catch (err) {
    /* fallback results if API fails */
    ieRenderSearchResults(query, ieGenerateFallbackResults(query), container);
    ieHideLoadingBar();
    ieSetStatus('Done');
  }
}

/* ════════════════════════════════════════════════════════════
   RENDER SEARCH RESULTS
   ════════════════════════════════════════════════════════════ */
function ieRenderSearchResults(query, data, container) {
  const page = container.querySelector('#ieResultsPage') || container;

  /* replace the loading spinner area */
  const resultsArea = page.querySelector('#ieAIResultsArea');
  const countEl     = page.querySelector('.ie-results-count');
  if (countEl) countEl.textContent = data.count || `About ${Math.floor(Math.random()*900+100)},000,000 results (${(Math.random()*.5+.2).toFixed(2)} seconds)`;

  const html = `
    <!-- AI Answer Card -->
    <div class="ie-ai-card">
      <div class="ie-ai-card-header">
        <span class="ie-ai-card-icon">&#x2728;</span>
        <span class="ie-ai-card-label">AI Overview</span>
      </div>
      <div class="ie-ai-answer" id="ieAIAnswer"></div>
    </div>

    <!-- Organic Results -->
    ${(data.results || []).map(r => `
      <div class="ie-result-item" onclick="ieNavigate('${ieEsc(r.url)}')">
        <div class="ie-result-url">&#x1F310; ${ieEsc(r.url)}</div>
        <div class="ie-result-title">${ieEsc(r.title)}</div>
        <div class="ie-result-snippet">${r.snippet || ''}</div>
      </div>`).join('')}

    <!-- Related Searches -->
    ${data.related?.length ? `
    <div class="ie-related">
      <div class="ie-related-title">Related searches</div>
      <div class="ie-related-chips">
        ${data.related.map(r => `
          <div class="ie-related-chip" onclick="ieNavigate('search:${ieEsc(r)}')">${ieEsc(r)}</div>
        `).join('')}
      </div>
    </div>` : ''}`;

  if (resultsArea) {
    resultsArea.innerHTML = html;
  } else {
    const div = document.createElement('div');
    div.innerHTML = html;
    page.appendChild(div);
  }

  /* remove loading spinner */
  const spinner = page.querySelector('[style*="ie-spinner"]') || page.querySelector('.ie-spinner')?.parentElement;
  if (spinner) spinner.remove();

  /* typewriter effect for AI answer */
  const answerEl = page.querySelector('#ieAIAnswer');
  if (answerEl && data.answer) {
    ieTypewriterEffect(answerEl, data.answer);
  }
}

/* Typewriter effect for AI answer */
function ieTypewriterEffect(el, text) {
  el.classList.add('ie-ai-typing');
  el.textContent = '';
  let i = 0;
  const speed = Math.max(8, Math.min(25, Math.floor(1500 / text.length)));
  const timer = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= text.length) {
      clearInterval(timer);
      el.classList.remove('ie-ai-typing');
    }
  }, speed);
}

/* ════════════════════════════════════════════════════════════
   GOOGLE HEADER HTML
   ════════════════════════════════════════════════════════════ */
function ieGoogleHeader(query) {
  return `
    <div class="ie-results-header">
      <div class="ie-results-logo">
        <span class="g">G</span><span class="o1">o</span><span class="o2">o</span><span class="g2">g</span><span class="l">l</span><span class="e">e</span>
      </div>
      <div class="ie-results-searchbar">
        <input value="${ieEsc(query)}" id="ieResultsSearchInput"
               style="flex:1;border:none;outline:none;font-size:16px;font-family:'Segoe UI',Tahoma,sans-serif"
               onkeydown="if(event.key==='Enter'){ieNavigate('search:'+this.value)}">
        <button onclick="ieNavigate('search:'+document.getElementById('ieResultsSearchInput').value)"
                style="background:none;border:none;cursor:pointer;font-size:18px;color:#4285f4">&#x1F50D;</button>
      </div>
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   EXTERNAL URL PAGE
   ════════════════════════════════════════════════════════════ */
function ieRenderExternalPage(container, url) {
  const div = document.createElement('div');
  div.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#f8f9fa;font-family:Segoe UI,Tahoma,sans-serif';
  div.innerHTML = `
    <div style="font-size:48px">&#x1F310;</div>
    <div style="font-size:18px;color:#333;font-weight:300">${ieEsc(url)}</div>
    <div style="font-size:13px;color:#888;text-align:center;max-width:400px">
      This browser runs inside Windows 8 Web and cannot load external sites directly.<br><br>
      Use the Search box to find information about this site using AI.
    </div>
    <button onclick="ieNavigate('search:${ieEsc(url)}')"
            style="padding:8px 24px;background:#0078d7;color:#fff;border:none;font-size:14px;cursor:pointer;font-family:inherit">
      Search for this site
    </button>`;
  container.appendChild(div);
}

/* ════════════════════════════════════════════════════════════
   FALLBACK RESULTS  (when API is unavailable)
   ════════════════════════════════════════════════════════════ */
function ieGenerateFallbackResults(query) {
  return {
    answer: `Here are the top results for "${query}". This information is compiled from various trusted web sources.`,
    count: `About ${Math.floor(Math.random()*900+100)},000,000 results (${(Math.random()*.4+.2).toFixed(2)} seconds)`,
    results: [
      { title:`${query} — Wikipedia`, url:`en.wikipedia.org/wiki/${query.replace(/ /g,'_')}`, snippet:`<b>${query}</b> is a widely discussed topic. Wikipedia provides a comprehensive overview covering its history, applications, and significance in modern context.` },
      { title:`What is ${query}? — Complete Guide`, url:`www.techguide.com/${query.toLowerCase().replace(/ /g,'-')}`, snippet:`A complete beginner's guide to <b>${query}</b>. Learn everything you need to know including key concepts, how it works, and why it matters.` },
      { title:`${query} — Latest News & Updates`, url:`news.google.com/search?q=${encodeURIComponent(query)}`, snippet:`Get the latest news and updates on <b>${query}</b>. Stay informed with breaking news, analysis and expert commentary.` },
      { title:`Learn ${query} — Free Tutorial`, url:`www.w3schools.com/${query.toLowerCase().replace(/ /g,'')}`, snippet:`Free online tutorial on <b>${query}</b>. Practice exercises, quizzes and real-world examples to master the subject step by step.` },
    ],
    related: [`${query} tutorial`, `${query} examples`, `what is ${query}`, `${query} for beginners`]
  };
}

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */
function ieEsc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function ieSetPageTitle(title) {
  const el = document.getElementById('ieTitleText');
  if (el) el.textContent = title + ' — Internet Explorer';
}

function ieUpdateTabTitle(title) {
  const tab = IE.tabs.find(t => t.id === IE.activeId);
  if (tab) { tab.title = title; ieRenderTabbar(); }
}

function ieSetStatus(text) {
  const el = document.getElementById('ieStatusText');
  if (el) el.textContent = text;
}

function ieShowLoadingBar() {
  const bar = document.getElementById('ieLoadingBar');
  if (!bar) return;
  bar.style.width = '0%';
  bar.classList.remove('done');
  bar.style.transition = 'none';
  requestAnimationFrame(() => {
    bar.style.transition = 'width 1.2s ease';
    bar.style.width = '75%';
  });
}

function ieHideLoadingBar() {
  const bar = document.getElementById('ieLoadingBar');
  if (!bar) return;
  bar.style.width = '100%';
  setTimeout(() => bar.classList.add('done'), 200);
  setTimeout(() => { bar.style.width = '0%'; bar.classList.remove('done'); }, 700);
}

function ieResetZoom() {
  IE.zoom = 100;
  document.getElementById('ieZoomLevel').textContent = '100%';
}

/* ════════════════════════════════════════════════════════════
   WINDOW CONTROLS
   ════════════════════════════════════════════════════════════ */
function ieClose() {
  const win = document.getElementById('ieWindow');
  const tb  = document.getElementById('tbIE');
  if (!win) return;
  win.style.animation = 'ieMin .2s cubic-bezier(.4,0,1,1) both';
  setTimeout(() => { win.remove(); if(tb) tb.remove(); }, 200);
}

function ieMinimise() {
  const win = document.getElementById('ieWindow');
  const tb  = document.getElementById('tbIE');
  IE.isMin  = true;
  win.classList.add('minimising');
  setTimeout(() => {
    win.style.display = 'none';
    win.classList.remove('minimising');
    if (tb) tb.classList.add('minimised');
  }, 220);
}

function ieRestore() {
  const win = document.getElementById('ieWindow');
  const tb  = document.getElementById('tbIE');
  win.style.display = 'flex';
  win.classList.add('restoring');
  setTimeout(() => win.classList.remove('restoring'), 220);
  IE.isMin = false;
  if (tb) tb.classList.remove('minimised');
}

function ieMaximise() {
  const win = document.getElementById('ieWindow');
  const btn = document.getElementById('ieMaxBtn');
  IE.isMax  = !IE.isMax;
  win.classList.toggle('maximised', IE.isMax);
  if (btn) btn.textContent = IE.isMax ? '\u29C9' : '\u2610';
}

function ieToggleFromTaskbar() {
  if (IE.isMin) ieRestore(); else ieMinimise();
}

function ieInjectTaskbar() {
  const tbLeft = document.querySelector('.tb-left');
  if (!tbLeft || document.getElementById('tbIE')) return;
  const el  = document.createElement('div');
  el.id     = 'tbIE';
  el.title  = 'Internet Explorer';
  el.innerHTML = `<img src="icons/ie.png" onerror="this.style.display='none'" alt="IE">
                  <span>Internet Explorer</span>`;
  el.onclick = ieToggleFromTaskbar;
  el.oncontextmenu = e => {
    e.preventDefault(); e.stopPropagation();
    if (typeof showTaskbarAppCtx === 'function') showTaskbarAppCtx(e, 'Internet Explorer', false);
  };
  tbLeft.appendChild(el);
}

/* ════════════════════════════════════════════════════════════
   DRAG
   ════════════════════════════════════════════════════════════ */
function ieSetupDrag() {
  const tb = document.getElementById('ieTitleBar');
  if (!tb) return;
  tb.addEventListener('mousedown', e => {
    if (e.target.closest('.ie-controls') || IE.isMax) return;
    IE.drag.on = true;
    const win  = document.getElementById('ieWindow');
    const r    = win.getBoundingClientRect();
    IE.drag.ox = e.clientX - r.left;
    IE.drag.oy = e.clientY - r.top;
    win.style.transition = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!IE.drag.on) return;
    const win = document.getElementById('ieWindow');
    let x = e.clientX - IE.drag.ox;
    let y = e.clientY - IE.drag.oy;
    x = Math.max(-win.offsetWidth+60, Math.min(window.innerWidth-60, x));
    y = Math.max(0, Math.min(window.innerHeight-32, y));
    win.style.left = x+'px'; win.style.top = y+'px';
  });
  document.addEventListener('mouseup', () => { IE.drag.on = false; });
}

/* ════════════════════════════════════════════════════════════
   RESIZE
   ════════════════════════════════════════════════════════════ */
function ieSetupResize() {
  const h = document.getElementById('ieResizeHandle');
  if (!h) return;
  h.addEventListener('mousedown', e => {
    if (IE.isMax) return;
    IE.resize.on = true;
    const win = document.getElementById('ieWindow');
    IE.resize.sx=e.clientX; IE.resize.sy=e.clientY;
    IE.resize.sw=win.offsetWidth; IE.resize.sh=win.offsetHeight;
    e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('mousemove', e => {
    if (!IE.resize.on) return;
    const win = document.getElementById('ieWindow');
    win.style.width  = Math.max(500, IE.resize.sw+(e.clientX-IE.resize.sx))+'px';
    win.style.height = Math.max(340, IE.resize.sh+(e.clientY-IE.resize.sy))+'px';
  });
  document.addEventListener('mouseup', () => { IE.resize.on = false; });
}

/* ════════════════════════════════════════════════════════════
   CONTEXT MENUS
   ════════════════════════════════════════════════════════════ */
function ieBuildContextMenus() {
  /* content area right-click */
  if (!document.getElementById('ieCtx')) {
    const m = document.createElement('div');
    m.id = 'ieCtx';
    m.innerHTML = `
      <div class="ie-ctx-item" onclick="ieCtxBack()"><span class="ie-ctx-icon">&#x276E;</span>Back</div>
      <div class="ie-ctx-item" onclick="ieCtxForward()"><span class="ie-ctx-icon">&#x276F;</span>Forward</div>
      <div class="ie-ctx-item" onclick="ieRefresh()"><span class="ie-ctx-icon">&#x21BA;</span>Refresh</div>
      <div class="ie-ctx-sep"></div>
      <div class="ie-ctx-item" onclick="ieCtxSaveAs()"><span class="ie-ctx-icon">&#x1F4BE;</span>Save as</div>
      <div class="ie-ctx-item" onclick="ieCtxPrint()"><span class="ie-ctx-icon">&#x1F5A8;</span>Print</div>
      <div class="ie-ctx-sep"></div>
      <div class="ie-ctx-item" onclick="ieCtxViewSource()"><span class="ie-ctx-icon">&#x1F4C4;</span>View source</div>
      <div class="ie-ctx-sep"></div>
      <div class="ie-ctx-item" onclick="ieClose()"><span class="ie-ctx-icon">&#x2715;</span>Close</div>`;
    document.body.appendChild(m);
  }

  const content = document.getElementById('ieContent');
  if (content) {
    content.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      ieOpenCtx('ieCtx', e.clientX, e.clientY);
    });
  }

  /* title bar right-click */
  if (!document.getElementById('ieTitleCtx')) {
    const m = document.createElement('div');
    m.id = 'ieTitleCtx';
    m.className = 'ie-ctx-menu np-ctx'; /* reuse notepad ctx styles */
    m.style.cssText = 'position:fixed;z-index:9500;background:#fff;border:1px solid #c0c0c0;box-shadow:2px 4px 18px rgba(0,0,0,.22);min-width:180px;padding:3px 0;display:none;font-family:Segoe UI,Tahoma,sans-serif';
    m.innerHTML = `
      <div class="np-ctx-item" id="ieTcRestore" onclick="ieTcRestore()">Restore</div>
      <div class="np-ctx-item" onclick="ieMinimise();ieHideAllCtx()">Minimise</div>
      <div class="np-ctx-item" id="ieTcMax" onclick="ieTcMax()">Maximise</div>
      <div class="np-ctx-sep"></div>
      <div class="np-ctx-item" onclick="ieHideAllCtx();ieClose()">Close</div>`;
    document.body.appendChild(m);
  }

  const tb = document.getElementById('ieTitleBar');
  if (tb) {
    tb.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      const rEl = document.getElementById('ieTcRestore');
      const mEl = document.getElementById('ieTcMax');
      if(rEl) rEl.classList.toggle('disabled', !IE.isMax);
      if(mEl) mEl.classList.toggle('disabled',  IE.isMax);
      ieOpenCtx('ieTitleCtx', e.clientX, e.clientY);
    });
  }
}

let _ieActiveCtx = null;
function ieOpenCtx(id, x, y) {
  ieHideAllCtx();
  const menu = document.getElementById(id);
  if (!menu) return;
  menu.style.display = 'block';
  menu.style.left = x+'px'; menu.style.top = y+'px';
  _ieActiveCtx = id;
  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right  > window.innerWidth)  menu.style.left = (x-r.width)+'px';
    if (r.bottom > window.innerHeight) menu.style.top  = (y-r.height)+'px';
  });
}
function ieHideAllCtx() {
  ['ieCtx','ieTitleCtx','ieIconCtx'].forEach(id => {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
  });
  _ieActiveCtx = null;
}
document.addEventListener('click', () => ieHideAllCtx());

/* context menu actions */
function ieCtxBack()       { ieHideAllCtx(); ieGoBack(); }
function ieCtxForward()    { ieHideAllCtx(); ieGoForward(); }
function ieCtxSaveAs()     { ieHideAllCtx(); if(typeof notify==='function') notify('Save As — not available in web mode','Internet Explorer'); }
function ieCtxPrint()      { ieHideAllCtx(); window.print(); }
function ieCtxViewSource() {
  ieHideAllCtx();
  const tab = IE.tabs.find(t => t.id === IE.activeId);
  if (typeof openNotepad === 'function') openNotepad('view-source.html', `<!-- Source for: ${tab?.url || ''} -->\n<!-- Internet Explorer cannot display raw source for AI-generated pages -->`);
}
function ieTcRestore() { ieHideAllCtx(); if(IE.isMax) ieMaximise(); }
function ieTcMax()     { ieHideAllCtx(); if(!IE.isMax) ieMaximise(); }
 