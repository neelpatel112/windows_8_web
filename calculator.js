'use strict';
/* ═══════════════════════════════════════════════════════════
   CALCULATOR PRO — Windows 8 Web
   Standard + Scientific modes, history, keyboard support
   ═══════════════════════════════════════════════════════════ */

var Calc = (function() {

  // ── STATE ──
  var display    = '';      // what's shown in result area
  var expression = '';      // top line expression
  var justEvaled = false;   // after = pressed
  var memory     = 0;
  var history    = [];
  var sciMode    = false;
  var histOpen   = false;
  var degMode    = true;    // degrees vs radians

  // ── DOM refs ──
  var win, result, exprEl, histList;

  function init() {
    win     = document.getElementById('calcWindow');
    result  = document.getElementById('calcResult');
    exprEl  = document.getElementById('calcExpression');
    histList= document.getElementById('calcHistoryList');
    if (!win) return;

    // make draggable
    var tb = win.querySelector('.calc-titlebar');
    if (tb) makeDraggable(win, tb);

    display    = '0';
    expression = '';
    render();
  }

  // ── RENDER ──
  function render() {
    if (!result) return;
    result.textContent = display || '0';
    // auto-shrink font for long numbers
    var len = (display || '0').length;
    result.className = 'calc-result' +
      (len > 14 ? ' xsmall' : len > 10 ? ' small' : '');
    if (exprEl) exprEl.textContent = expression;
  }

  // ── INPUT: DIGIT ──
  function digit(d) {
    if (justEvaled) { display = ''; expression = ''; justEvaled = false; }
    if (d === '.' && display.includes('.')) return;
    if (display === '0' && d !== '.') display = d;
    else display += d;
    render();
  }

  // ── INPUT: OPERATOR ──
  function op(o) {
    var sym = { '*':'×', '/':'÷' }[o] || o;
    if (justEvaled) {
      expression = display + ' ' + sym + ' ';
      justEvaled = false;
    } else {
      // allow chaining: if expression ends with operator, replace it
      if (expression && /[+\-×÷]\s$/.test(expression)) {
        expression = expression.replace(/[+\-×÷]\s$/, sym + ' ');
      } else {
        expression += (display || '0') + ' ' + sym + ' ';
        display = '';
      }
    }
    render();
  }

  // ── EVALUATE ──
  function equals() {
    var fullExpr = expression + (display || '0');
    if (!fullExpr.trim()) return;

    // replace display symbols with JS operators
    var jsExpr = fullExpr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');

    var res;
    try {
      // safe eval: only allow digits, operators, dots, parens, spaces
      if (!/^[0-9+\-*/().e\s]+$/.test(jsExpr)) throw new Error('Invalid');
      /* eslint-disable no-new-func */
      res = Function('"use strict"; return (' + jsExpr + ')')();
    } catch(e) {
      display    = 'Error';
      expression = '';
      justEvaled = true;
      render();
      return;
    }

    // handle Infinity / NaN
    if (!isFinite(res)) {
      display    = isNaN(res) ? 'Error' : (res > 0 ? '∞' : '-∞');
      expression = '';
      justEvaled = true;
      render();
      return;
    }

    // round to avoid float junk like 0.1+0.2 = 0.30000000001
    res = +parseFloat(res.toPrecision(14));

    // history
    addHistory(fullExpr, res);

    expression = fullExpr + ' =';
    display    = String(res);
    justEvaled = true;
    render();
  }

  // ── CLEAR ──
  function clear() {
    display    = '0';
    expression = '';
    justEvaled = false;
    render();
  }

  function clearEntry() {
    if (display && display !== '0') {
      display = display.length > 1 ? display.slice(0, -1) : '0';
    } else {
      display = '0';
    }
    render();
  }

  // ── SIGN ──
  function toggleSign() {
    if (!display || display === '0') return;
    display = display.startsWith('-') ? display.slice(1) : '-' + display;
    render();
  }

  // ── PERCENT ──
  function percent() {
    var n = parseFloat(display);
    if (isNaN(n)) return;
    // if there's an expression, treat as percent of that value
    var match = expression.match(/([0-9.]+)\s[+\-×÷]\s$/);
    if (match) {
      var base = parseFloat(match[1]);
      display = String(base * n / 100);
    } else {
      display = String(n / 100);
    }
    render();
  }

  // ── SCIENTIFIC FUNCTIONS ──
  function sciFunc(fn) {
    var n = parseFloat(display);
    if (isNaN(n)) return;
    var r;
    var rad = degMode ? n * Math.PI / 180 : n;

    switch(fn) {
      case 'sin':  r = Math.sin(rad); break;
      case 'cos':  r = Math.cos(rad); break;
      case 'tan':  r = Math.tan(rad); break;
      case 'asin': r = Math.asin(n) * (degMode ? 180/Math.PI : 1); break;
      case 'acos': r = Math.acos(n) * (degMode ? 180/Math.PI : 1); break;
      case 'atan': r = Math.atan(n) * (degMode ? 180/Math.PI : 1); break;
      case 'log':  r = Math.log10(n); break;
      case 'ln':   r = Math.log(n); break;
      case 'sqrt': r = Math.sqrt(n); break;
      case 'sq':   r = n * n; break;
      case 'cube': r = n * n * n; break;
      case 'inv':  r = 1 / n; break;
      case 'exp':  r = Math.exp(n); break;
      case 'abs':  r = Math.abs(n); break;
      case 'fact': r = factorial(n); break;
      case 'pi':   display = String(Math.PI); render(); return;
      case 'e':    display = String(Math.E);  render(); return;
      case 'pow10': r = Math.pow(10, n); break;
      default: return;
    }

    if (!isFinite(r) || isNaN(r)) { display = 'Error'; render(); return; }
    r = +parseFloat(r.toPrecision(12));
    expression = fn + '(' + n + ') =';
    display    = String(r);
    justEvaled = true;
    addHistory(fn + '(' + n + ')', r);
    render();
  }

  function factorial(n) {
    n = Math.floor(n);
    if (n < 0 || n > 170) return Infinity;
    if (n <= 1) return 1;
    var r = 1;
    for (var i = 2; i <= n; i++) r *= i;
    return r;
  }

  function toggleDeg() {
    degMode = !degMode;
    var btn = document.getElementById('calcDegBtn');
    if (btn) btn.textContent = degMode ? 'DEG' : 'RAD';
  }

  // ── MEMORY ──
  function memStore()  { memory = parseFloat(display) || 0; notify('M = ' + memory, 'Calculator'); }
  function memRecall() { display = String(memory); render(); }
  function memClear()  { memory = 0; }
  function memAdd()    { memory += parseFloat(display) || 0; notify('M = ' + memory, 'Calculator'); }

  // ── HISTORY ──
  function addHistory(expr, val) {
    history.unshift({ expr: expr, val: val });
    if (history.length > 30) history.pop();
    renderHistory();
  }

  function renderHistory() {
    if (!histList) return;
    histList.innerHTML = '';
    if (history.length === 0) {
      histList.innerHTML = '<div style="padding:10px 14px;color:rgba(255,255,255,0.3);font-size:12px;">No history yet</div>';
      return;
    }
    history.forEach(function(h) {
      var item = document.createElement('div');
      item.className = 'calc-history-item';
      item.innerHTML =
        '<span class="hist-expr">' + h.expr + '</span>' +
        '<span class="hist-val">'  + h.val  + '</span>';
      item.addEventListener('click', function() {
        display    = String(h.val);
        justEvaled = true;
        render();
      });
      histList.appendChild(item);
    });
  }

  function clearHistory() {
    history = [];
    renderHistory();
  }

  function toggleHistory() {
    histOpen = !histOpen;
    var panel = document.getElementById('calcHistoryPanel');
    var btn   = document.getElementById('calcHistToggle');
    if (panel) panel.classList.toggle('open', histOpen);
    if (btn)   btn.textContent = histOpen ? '▲ History' : '▼ History';
  }

  // ── MODE SWITCH ──
  function setMode(mode) {
    sciMode = (mode === 'scientific');
    var w = document.getElementById('calcWindow');
    var sciPanel = document.getElementById('calcSciButtons');
    if (w)        w.classList.toggle('calc-scientific', sciMode);
    if (sciPanel) sciPanel.style.display = sciMode ? 'grid' : 'none';

    document.querySelectorAll('.calc-mode-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.mode === mode);
    });
  }

  // ── KEYBOARD ──
  function handleKey(e) {
    if (!win || win.style.display === 'none') return;
    var k = e.key;

    if (k >= '0' && k <= '9') { e.preventDefault(); digit(k); return; }
    if (k === '.') { e.preventDefault(); digit('.'); return; }
    if (k === '+') { e.preventDefault(); op('+'); return; }
    if (k === '-') { e.preventDefault(); op('-'); return; }
    if (k === '*') { e.preventDefault(); op('*'); return; }
    if (k === '/') { e.preventDefault(); op('/'); return; }
    if (k === 'Enter' || k === '=') { e.preventDefault(); equals(); return; }
    if (k === 'Backspace') { e.preventDefault(); clearEntry(); return; }
    if (k === 'Escape') { e.preventDefault(); clear(); return; }
    if (k === '%') { e.preventDefault(); percent(); return; }
  }

  // ── DRAGGABLE ──
  function makeDraggable(win, handle) {
    if (handle._calcDrag) return;
    handle._calcDrag = true;
    var dx = 0, dy = 0, dragging = false;

    handle.addEventListener('mousedown', function(e) {
      if (e.target.closest('.calc-win-controls')) return;
      dragging = true;
      // if still transform-centered, resolve to px first
      if (win.style.transform !== 'none' && win.style.left === '50%') {
        var r = win.getBoundingClientRect();
        win.style.left      = r.left + 'px';
        win.style.top       = r.top  + 'px';
        win.style.transform = 'none';
      }
      var r2 = win.getBoundingClientRect();
      dx = e.clientX - r2.left;
      dy = e.clientY - r2.top;
      win.style.transition = 'none';
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      win.style.left = (e.clientX - dx) + 'px';
      win.style.top  = (e.clientY - dy) + 'px';
    });
    document.addEventListener('mouseup', function() { dragging = false; });
  }

  // ── BRING TO FRONT ──
  function bringToFront() {
    if (win) win.style.zIndex = 5000;
  }

  // ── PUBLIC ──
  return {
    init        : init,
    digit       : digit,
    op          : op,
    equals      : equals,
    clear       : clear,
    clearEntry  : clearEntry,
    toggleSign  : toggleSign,
    percent     : percent,
    sciFunc     : sciFunc,
    toggleDeg   : toggleDeg,
    memStore    : memStore,
    memRecall   : memRecall,
    memClear    : memClear,
    memAdd      : memAdd,
    clearHistory: clearHistory,
    toggleHistory:toggleHistory,
    setMode     : setMode,
    handleKey   : handleKey,
    bringToFront: bringToFront,
  };
})();

// ── OPEN / CLOSE ──
function openCalculator() {
  var win = document.getElementById('calcWindow');
  if (!win) return;
  win.style.display = 'flex';
  Calc.init();
  addTaskbarEntry('calc', '🧮', 'Calculator', 'openCalculator()', 'closeCalculator()');
  bringWindowToFront('calcWindow');
}

function closeCalculator() {
  var win = document.getElementById('calcWindow');
  if (!win) return;
  win.style.transition = 'opacity 0.15s';
  win.style.opacity    = '0';
  setTimeout(function() {
    win.style.display  = 'none';
    win.style.opacity  = '1';
    win.style.transition = '';
  }, 150);
  removeTaskbarEntry('calc');
}

function minimizeCalculator() {
  var win = document.getElementById('calcWindow');
  if (win) win.style.display = 'none';
}

// ── KEYBOARD GLOBAL HOOK ──
document.addEventListener('keydown', function(e) {
  Calc.handleKey(e);
});

// ── TASKBAR HELPERS (use your OS's existing system) ──
function addTaskbarEntry(id, icon, label, openExpr, closeExpr) {
  var running = document.getElementById('tbRunning');
  if (!running) return;
  if (document.getElementById('tb-' + id)) return;

  var btn = document.createElement('div');
  btn.className = 'tb-app tb-running';
  btn.id        = 'tb-' + id;
  btn.title     = label;
  btn.innerHTML = '<span style="font-size:18px">' + icon + '</span>';
  btn.onclick   = function() {
    var w = document.getElementById('calcWindow');
    if (w && w.style.display !== 'none') { minimizeCalculator(); }
    else { openCalculator(); }
  };
  running.appendChild(btn);
}

function removeTaskbarEntry(id) {
  var el = document.getElementById('tb-' + id);
  if (el) el.remove();
}

function bringWindowToFront(winId) {
  // increment z-index so this window is on top
  var allWins = document.querySelectorAll(
    '#calcWindow, #thisPCWindow, #notepadWindow, #terminalWindow, ' +
    '#settingsWindow, #weatherWindow, #mapsWindow, #storeWindow'
  );
  var maxZ = 3000;
  allWins.forEach(function(w) {
    var z = parseInt(w.style.zIndex) || 3000;
    if (z > maxZ) maxZ = z;
  });
  var w = document.getElementById(winId);
  if (w) w.style.zIndex = maxZ + 1;
}
