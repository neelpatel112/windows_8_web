/**
 * AMIBIOS Boot Sequence — Full Enhanced Engine
 * Reads from window.BIOS_CONFIG (config.js)
 * Sounds from window.BiosAudio (audio.js)
 */
(function () {
  'use strict';

  const CFG = window.BIOS_CONFIG;
  const SFX = window.BiosAudio;
  const FX  = CFG.effects;
  const T   = CFG.timing;

  /* ── Utilities ─────────────────────────────────────── */
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const rand  = (a, b) => Math.random() * (b - a) + a;
  const pick  = arr => arr[Math.floor(Math.random() * arr.length)];

  async function typeText(el, text, charDelay = 16) {
    el.textContent = '';
    for (const ch of text) {
      el.textContent += ch;
      if (FX.typewriterSound && ch.trim()) SFX.tick();
      await delay(charDelay + rand(-4, 4));
    }
  }

  function showPhase(id) {
    document.querySelectorAll('.phase').forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });
    const el = document.getElementById(id);
    el.style.display = 'block';
    void el.offsetWidth;
    el.classList.add('active');
  }

  /* ── CRT Effects ───────────────────────────────────── */
  let flickerInt = null, jitterInt = null, glitchInt = null;

  function startCRT(screenEl) {
    if (!screenEl) return;
    if (FX.crtFlicker) {
      flickerInt = setInterval(() => {
        if (Math.random() < 0.06) {
          screenEl.style.filter = `brightness(${rand(0.82, 0.96)})`;
          setTimeout(() => { screenEl.style.filter = ''; }, rand(30, 80));
        }
      }, 180);
    }
    if (FX.screenJitter) {
      jitterInt = setInterval(() => {
        if (Math.random() < 0.04) {
          screenEl.style.transform = `translateX(${rand(-3,3)}px)`;
          setTimeout(() => { screenEl.style.transform = ''; }, 55);
        }
      }, 250);
    }
    if (FX.glitchLines) {
      glitchInt = setInterval(() => {
        if (Math.random() < 0.07) spawnGlitch(screenEl);
      }, 600);
    }
  }

  function stopCRT() {
    clearInterval(flickerInt);
    clearInterval(jitterInt);
    clearInterval(glitchInt);
  }

  const GCHARS = '█▓▒░▄▀■□XXXXXXXXX////\\\\';
  function spawnGlitch(parent) {
    const g = document.createElement('div');
    g.className = 'glitch-line';
    const len = Math.floor(rand(6, 38));
    g.textContent = Array.from({length: len}, () => pick(GCHARS.split(''))).join('');
    g.style.top   = Math.floor(rand(10, 90)) + '%';
    g.style.left  = Math.floor(rand(0, 55)) + '%';
    g.style.color = pick(['#ff5555','#ffff54','#55ff55','#aaaaff','#fff']);
    parent.appendChild(g);
    setTimeout(() => g.remove(), rand(55, 175));
  }

  /* ── POST Lines data ───────────────────────────────── */
  const POST_LINES = [
    { label: 'AMIBIOS(C)2011 American Megatrends Inc.',        status: '',                              cls: 'status-ok',   ms: 200,  hd: false },
    { label: 'Initializing Intel(R) Boot Agent GE v1.3.43',   status: '',                              cls: 'status-ok',   ms: 310,  hd: false },
    { label: 'PXE-MOF: Exiting Intel Boot Agent.',             status: '',                              cls: 'status-ok',   ms: 240,  hd: false },
    { label: 'Verifying DMI Pool Data',                         status: '......Update Success!',        cls: 'status-ok',   ms: 820,  hd: false },
    { label: 'SATA Port 0: ST3500418AS',                        status: 'Ultra DMA Mode-5, S.M.A.R.T. OK', cls: 'status-ok', ms: 360, hd: true  },
    { label: 'SATA Port 1:',                                    status: 'Not Detected',                 cls: 'status-warn', ms: 185,  hd: false },
    { label: 'SATA Port 2:',                                    status: 'Not Detected',                 cls: 'status-warn', ms: 185,  hd: false },
    { label: 'SATA Port 3:',                                    status: 'Not Detected',                 cls: 'status-warn', ms: 185,  hd: false },
    { label: 'USB Device(s):',                                  status: '1 Keyboard, 1 Mouse, 1 Hub',   cls: 'status-ok',   ms: 400,  hd: false },
    { label: 'Auto-detecting USB Mass Storage..',               status: '1 Device Found',               cls: 'status-ok',   ms: 570,  hd: false },
    { label: 'Checking NVRAM..',                                status: 'OK',                            cls: 'status-ok',   ms: 255,  hd: false },
    { label: 'Loading Setup Defaults..',                        status: 'Done',                         cls: 'status-ok',   ms: 295,  hd: false },
  ];

  function addPostLine(label, status, cls) {
    const wrap = document.getElementById('post-lines');
    const row  = document.createElement('div');
    row.className = 'post-line';
    row.innerHTML = `<span class="label">${label}</span><span class="${cls || 'status-ok'}">${status || ''}</span>`;
    wrap.appendChild(row);
  }

  /* ── Fake Error Easter Egg ─────────────────────────── */
  async function maybeFakeError() {
    if (Math.random() > CFG.easterEggs.failChance) return;
    SFX.errorBeep();
    addPostLine('!! CMOS Checksum Error — Defaults Loaded !!', '', 'status-fail');
    await delay(1100);
    addPostLine('Press F1 to Run SETUP, F2 to Load Defaults', '', 'status-warn');
    await delay(2100);
    addPostLine('Continuing with defaults...', '', 'status-ok');
    await delay(700);
  }

  /* ── Phase 0 — Black flash ─────────────────────────── */
  async function phaseBlack() {
    showPhase('phase-black');
    await delay(T.blackFlash);
    SFX.crtOn();
    await delay(130);
  }

  /* ── Phase 1 — POST ────────────────────────────────── */
  async function phasePost() {
    showPhase('phase-post');
    const screen = document.querySelector('#phase-post .bios-screen');
    startCRT(screen);

    await delay(280);
    if (FX.postBeep) SFX.postBeep();

    await typeText(document.getElementById('cpu-line'), CFG.cpu, 13);
    await delay(180);

    // Memory counter
    const memLine = document.getElementById('mem-test-line');
    memLine.innerHTML = '<span>Testing Memory: </span>';
    const countEl = document.createElement('span');
    countEl.className = 'mem-count';
    memLine.appendChild(countEl);
    const barOut = document.createElement('span');
    barOut.className = 'mem-bar-outer';
    const barIn = document.createElement('span');
    barIn.className = 'mem-bar-inner';
    barOut.appendChild(barIn);
    memLine.appendChild(barOut);

    const totalKB = CFG.ramMB * 1024;
    const steps   = 220;
    const step    = Math.floor(totalKB / steps);
    let cur = 0, tc = 0;
    while (cur < totalKB) {
      cur = Math.min(cur + step, totalKB);
      countEl.textContent = cur.toLocaleString() + 'K';
      barIn.style.width   = ((cur / totalKB) * 100).toFixed(1) + '%';
      tc++;
      if (FX.typewriterSound && tc % 8 === 0) SFX.memTick();
      await delay(T.memCountDuration / steps);
    }

    await delay(120);
    memLine.style.display = 'none';
    const okEl = document.getElementById('mem-ok-line');
    okEl.style.display = 'block';
    SFX.beep(1200, 0.08, 0.2);
    await delay(280);

    for (const item of POST_LINES) {
      await delay(item.ms + rand(-40, 60));
      if (item.hd && FX.hdSeekSound) SFX.hdSeek();
      addPostLine(item.label, item.status, item.cls);
    }

    await delay(400);
    await maybeFakeError();
    await delay(500);
    stopCRT();
  }

  /* ── Phase 2 — Summary ─────────────────────────────── */
  async function phaseSummary() {
    // Inject config values
    document.getElementById('sum-cpu').textContent     = CFG.cpu;
    document.getElementById('sum-speed').textContent   = CFG.cpuSpeed;
    document.getElementById('sum-ram').textContent     = CFG.ramMB + ' MB';
    document.getElementById('sum-ramfreq').textContent = CFG.ramFrequency;
    document.getElementById('sum-pri-m').textContent   = CFG.drives.priMaster;
    document.getElementById('sum-pri-s').textContent   = CFG.drives.priSlave;
    document.getElementById('sum-sec-m').textContent   = CFG.drives.secMaster;
    document.getElementById('sum-sec-s').textContent   = CFG.drives.secSlave;

    const boEl = document.getElementById('boot-order-list');
    boEl.innerHTML = '';
    CFG.bootOrder.forEach((b, i) => {
      const d = document.createElement('div');
      d.className = 'boot-order-item';
      d.textContent = `${i + 1}. ${b}`;
      boEl.appendChild(d);
    });

    showPhase('phase-summary');
    startCRT(document.querySelector('#phase-summary .bios-screen'));
    await delay(T.summaryHold);
    stopCRT();
  }

  /* ── Phase 3 — Handoff ─────────────────────────────── */
  async function phaseHandoff() {
    SFX.crtOff();
    const s = document.querySelector('#phase-summary .bios-screen');
    if (s) s.classList.add('crt-off');
    await delay(280);
    showPhase('phase-handoff');
    await delay(T.handoffDelay);
    window.dispatchEvent(new CustomEvent('bios:complete', { bubbles: true }));
  }

  /* ── Fake BIOS Setup Menu (DEL) ────────────────────── */
  const SM = {
    tabs: ['Main', 'Advanced', 'Boot', 'Security', 'Exit'],
    tab: 0, row: 0, visible: false,
    items: {
      Main:     [['System Time','[ 12:00:00]'],['System Date','[04/05/2026]'],['SATA Config','Enhanced'],['ACPI Settings',''],['USB Config','']],
      Advanced: [['CPU Config',''],['Chipset',''],['Onboard Devices',''],['PCIPnP','']],
      Boot:     [['1st Boot Device','[Hard Drive]'],['2nd Boot Device','[USB Drive]'],['3rd Boot Device','[CDROM]'],['Boot Settings','']],
      Security: [['Supervisor Password','Not Installed'],['User Password','Not Installed'],['HDD Password','Not Installed']],
      Exit:     [['Save & Exit',''],['Discard & Exit',''],['Load Defaults',''],['Save Changes','']],
    },
    help: {
      Main:     ['Set the system time.','Set the system date.','Configure SATA mode.','Configure ACPI settings.','Configure USB devices.'],
      Advanced: ['Configure CPU settings.','Configure chipset.','Configure onboard devices.','Configure PnP settings.'],
      Boot:     ['First boot device priority.','Second boot device.','Third boot device.','Configure boot behavior.'],
      Security: ['Set supervisor password.','Set user password.','HDD password status.'],
      Exit:     ['Save all changes and exit.','Exit without saving.','Load factory defaults.','Save without exiting.'],
    },
  };

  function renderSetup() {
    const o = document.getElementById('setup-overlay');
    const tab   = SM.tabs[SM.tab];
    const items = SM.items[tab];
    o.innerHTML = `
      <div class="setup-box">
        <div class="setup-title">BIOS SETUP UTILITY</div>
        <div class="setup-tabs">${SM.tabs.map((t,i) => `<span class="stab ${i===SM.tab?'active':''}">${t}</span>`).join('')}</div>
        <div class="setup-content">
          <div class="setup-items">${items.map(([l,v],i)=>`<div class="sitem ${i===SM.row?'sel':''}">${l}<span class="sval">${v}</span></div>`).join('')}</div>
          <div class="setup-helpbox"><div class="shelp-title">Item Help</div><div class="shelp-text">${(SM.help[tab]||[])[SM.row]||''}</div></div>
        </div>
        <div class="setup-footer">←→ Tab &nbsp; ↑↓ Row &nbsp; F10 Save+Exit &nbsp; ESC Exit</div>
      </div>`;
    o.style.display = 'flex';
    SM.visible = true;
  }

  function closeSetup() { document.getElementById('setup-overlay').style.display='none'; SM.visible=false; SFX.navBeep('back'); }

  /* ── F8 Boot Menu ──────────────────────────────────── */
  const BM = { items: [...CFG.bootOrder, 'Enter Setup'], sel: 0, visible: false };

  function renderBootMenu() {
    const o = document.getElementById('bootmenu-overlay');
    o.innerHTML = `
      <div class="bootmenu-box">
        <div class="bm-title">Please select boot device:</div>
        <div class="bm-list">${BM.items.map((it,i)=>`<div class="bm-item ${i===BM.sel?'sel':''}">${it}</div>`).join('')}</div>
        <div class="bm-footer">↑↓ Select &nbsp; ENTER Confirm &nbsp; ESC Cancel</div>
      </div>`;
    o.style.display = 'flex';
    BM.visible = true;
  }

  function closeBootMenu() { document.getElementById('bootmenu-overlay').style.display='none'; BM.visible=false; SFX.navBeep('back'); }

  /* ── Konami Easter Egg ─────────────────────────────── */
  const KC = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let ki = 0;

  function checkKonami(k) {
    if (!CFG.easterEggs.konamiUnlock) return;
    ki = (k === KC[ki]) ? ki + 1 : 0;
    if (ki === KC.length) {
      ki = 0;
      [440,523,659,880].forEach((f,i) => setTimeout(() => SFX.beep(f,0.1,0.3), i*110));
      const el = document.createElement('div');
      el.className = 'konami-msg';
      el.textContent = '★  KONAMI CODE — +30 LIVES ACTIVATED  ★';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }
  }

  /* ── Keyboard Handler ──────────────────────────────── */
  let running = true;

  document.addEventListener('keydown', e => {
    checkKonami(e.key);

    if (SM.visible) {
      const tab = SM.tabs[SM.tab]; const items = SM.items[tab];
      if (e.key==='ArrowDown')  { SM.row=(SM.row+1)%items.length; SFX.navBeep('move'); renderSetup(); }
      else if (e.key==='ArrowUp') { SM.row=(SM.row-1+items.length)%items.length; SFX.navBeep('move'); renderSetup(); }
      else if (e.key==='ArrowRight') { SM.tab=(SM.tab+1)%SM.tabs.length; SM.row=0; SFX.navBeep('move'); renderSetup(); }
      else if (e.key==='ArrowLeft')  { SM.tab=(SM.tab-1+SM.tabs.length)%SM.tabs.length; SM.row=0; SFX.navBeep('move'); renderSetup(); }
      else if (e.key==='Escape'||e.key==='F10') closeSetup();
      e.preventDefault(); return;
    }

    if (BM.visible) {
      if (e.key==='ArrowDown')  { BM.sel=(BM.sel+1)%BM.items.length; SFX.navBeep('move'); renderBootMenu(); }
      else if (e.key==='ArrowUp') { BM.sel=(BM.sel-1+BM.items.length)%BM.items.length; SFX.navBeep('move'); renderBootMenu(); }
      else if (e.key==='Enter') { SFX.navBeep('select'); closeBootMenu(); }
      else if (e.key==='Escape') closeBootMenu();
      e.preventDefault(); return;
    }

    if (e.key==='Delete' && running) { SFX.navBeep('select'); renderSetup(); }
    if (e.key==='F8'     && running) { SFX.navBeep('select'); renderBootMenu(); }
  });

  /* ── Run ───────────────────────────────────────────── */
  async function run() {
    try {
      await phaseBlack();
      await phasePost();
      await phaseSummary();
      running = false;
      await phaseHandoff();
    } catch(err) {
      console.error('[BIOS]', err);
      window.dispatchEvent(new CustomEvent('bios:complete'));
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', run)
    : run();

})();
  