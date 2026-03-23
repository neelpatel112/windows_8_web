/* ═══════════════════════════════════════════════════════════
   Terminal / CMD  ·  terminal.js
   Full Windows CMD + Java Compiler & Runtime (browser-based)
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════════ */
const TERM = {
  cwd      : 'C:\\Users\\nx4real',   /* current working directory */
  cwdPath  : ['C:'],                  /* virtual FS path array     */
  history  : [],                      /* command history           */
  histIdx  : -1,
  isMin    : false,
  isMax    : false,
  drag     : { on:false, ox:0, oy:0 },
  resize   : { on:false, sx:0, sy:0, sw:0, sh:0 },
  activeMenu: null,
  /* java compiler state */
  compiledClasses: {},  /* { className: { fields, methods, ... } } */
  /* env variables */
  env      : { PATH: 'C:\\Windows\\System32;C:\\Program Files\\Java\\bin', JAVA_HOME: 'C:\\Program Files\\Java' },
};

/* path display string */
function termCwdStr() { return TERM.cwd; }

/* ════════════════════════════════════════════════════════════
   OPEN
   ════════════════════════════════════════════════════════════ */
function openTerminal(startPath) {
  const existing = document.getElementById('termWindow');
  if (existing) { if (TERM.isMin) termRestore(); return; }
  buildTermWindow();
  termInjectTaskbar();
  termSetupDrag();
  termSetupResize();
  termBuildContextMenus();

  if (startPath) {
    TERM.cwd = startPath;
  }

  termPrint('Microsoft Windows [Version 6.2.9200]', 'term-white');
  termPrint('(c) 2013 Microsoft Corporation. All rights reserved.\n', 'term-grey');
  termPrint('Java(TM) SE Runtime Environment (build 1.8.0_web)', 'term-cyan');
  termPrint('javac and java commands available\n', 'term-grey');
  termShowPrompt();
}

/* ════════════════════════════════════════════════════════════
   BUILD DOM
   ════════════════════════════════════════════════════════════ */
function buildTermWindow() {
  const win = document.createElement('div');
  win.id = 'termWindow';
  win.innerHTML = `
<div class="term-titlebar" id="termTitleBar">
  <img class="term-titlebar-icon" src="icons/terminal.png"
       onerror="this.style.display='none'" alt="">
  <span class="term-titlebar-text">Command Prompt</span>
  <div class="term-controls">
    <button class="term-btn" onclick="termMinimise()" title="Minimise">&#x2014;</button>
    <button class="term-btn" id="termMaxBtn" onclick="termMaximise()" title="Maximise">&#x2610;</button>
    <button class="term-btn close" onclick="termClose()" title="Close">&#x2715;</button>
  </div>
</div>

<div class="term-menubar" id="termMenubar">
  <div class="term-menu" id="tmenu-file">
    <div class="term-menu-label" onclick="termToggleMenu('file')">File</div>
    <div class="term-dropdown">
      <div class="term-dd-item" onclick="termRunCmd('cls')">Clear screen</div>
      <div class="term-dd-sep"></div>
      <div class="term-dd-item" onclick="termClose()">Exit</div>
    </div>
  </div>
  <div class="term-menu" id="tmenu-edit">
    <div class="term-menu-label" onclick="termToggleMenu('edit')">Edit</div>
    <div class="term-dropdown">
      <div class="term-dd-item" onclick="termCopy()">Copy<span class="term-dd-shortcut">Ctrl+C</span></div>
      <div class="term-dd-item" onclick="termPasteToInput()">Paste<span class="term-dd-shortcut">Ctrl+V</span></div>
      <div class="term-dd-sep"></div>
      <div class="term-dd-item" onclick="termSelectAll()">Select All</div>
      <div class="term-dd-sep"></div>
      <div class="term-dd-item" onclick="termRunCmd('cls')">Clear output</div>
    </div>
  </div>
  <div class="term-menu" id="tmenu-view">
    <div class="term-menu-label" onclick="termToggleMenu('view')">View</div>
    <div class="term-dropdown">
      <div class="term-dd-item" onclick="termChangeFontSize(2)">Zoom In</div>
      <div class="term-dd-item" onclick="termChangeFontSize(-2)">Zoom Out</div>
      <div class="term-dd-item" onclick="termChangeFontSize(0)">Reset Zoom</div>
    </div>
  </div>
  <div class="term-menu" id="tmenu-help">
    <div class="term-menu-label" onclick="termToggleMenu('help')">Help</div>
    <div class="term-dropdown">
      <div class="term-dd-item" onclick="termRunCmd('help')">Commands list</div>
      <div class="term-dd-sep"></div>
      <div class="term-dd-item" onclick="termAbout()">About</div>
    </div>
  </div>
</div>

<div class="term-body" id="termBody" onclick="termFocusInput()">
  <div class="term-output" id="termOutput"></div>
  <div class="term-input-row">
    <span class="term-prompt" id="termPrompt">${termCwdStr()}&gt; </span>
    <input class="term-input" id="termInput" autocomplete="off" autocorrect="off"
           spellcheck="false" autocapitalize="none"
           onkeydown="termInputKey(event)">
  </div>
</div>

<div class="term-statusbar">
  <span class="term-status-item" id="termStatusCwd">${termCwdStr()}</span>
  <span class="term-status-item" id="termStatusJava">&#x2615; Java 8</span>
</div>

<div class="term-resize" id="termResize"></div>`;
  document.body.appendChild(win);
  document.addEventListener('click', termCloseMenus);
  document.getElementById('termInput').focus();
}

/* ════════════════════════════════════════════════════════════
   OUTPUT HELPERS
   ════════════════════════════════════════════════════════════ */
function termPrint(text, cls) {
  const out = document.getElementById('termOutput');
  if (!out) return;
  const line = document.createElement('div');
  line.className = cls || 'term-grey';
  line.textContent = text;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

function termPrintHTML(html, cls) {
  const out = document.getElementById('termOutput');
  if (!out) return;
  const line = document.createElement('div');
  line.className = cls || 'term-grey';
  line.innerHTML  = html;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

function termShowPrompt() {
  const p = document.getElementById('termPrompt');
  if (p) p.textContent = termCwdStr() + '> ';
  const s = document.getElementById('termStatusCwd');
  if (s) s.textContent = termCwdStr();
}

function termFocusInput() {
  const inp = document.getElementById('termInput');
  if (inp) inp.focus();
}

/* ════════════════════════════════════════════════════════════
   INPUT HANDLING
   ════════════════════════════════════════════════════════════ */
function termInputKey(e) {
  const inp = document.getElementById('termInput');
  if (!inp) return;

  if (e.key === 'Enter') {
    const cmd = inp.value.trim();
    inp.value = '';
    /* echo command */
    termPrint(termCwdStr() + '> ' + cmd, 'term-white');
    if (cmd) {
      TERM.history.unshift(cmd);
      TERM.histIdx = -1;
      termRunCmd(cmd);
    }
    termShowPrompt();
    return;
  }

  /* history navigation */
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (TERM.histIdx < TERM.history.length - 1) TERM.histIdx++;
    inp.value = TERM.history[TERM.histIdx] || '';
    setTimeout(() => inp.setSelectionRange(inp.value.length, inp.value.length), 0);
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (TERM.histIdx > 0) TERM.histIdx--;
    else { TERM.histIdx = -1; inp.value = ''; return; }
    inp.value = TERM.history[TERM.histIdx] || '';
    return;
  }

  /* Tab autocomplete */
  if (e.key === 'Tab') {
    e.preventDefault();
    termAutocomplete(inp);
    return;
  }

  /* Ctrl+C — interrupt */
  if (e.ctrlKey && e.key === 'c') {
    termPrint('^C', 'term-red');
    inp.value = '';
    termShowPrompt();
    return;
  }
  /* Ctrl+L — clear */
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    termRunCmd('cls');
  }
}

/* Tab autocomplete from FS */
function termAutocomplete(inp) {
  const parts = inp.value.split(' ');
  const last  = parts[parts.length - 1];
  const dir   = TERM.cwdPath.join('/') || 'C:';
  const items = (typeof FS !== 'undefined' && FS[fsKey(TERM.cwdPath)]) || [];
  const match = items.find(i => i.name.toLowerCase().startsWith(last.toLowerCase()));
  if (match) {
    parts[parts.length - 1] = match.name;
    inp.value = parts.join(' ');
  }
}

/* ════════════════════════════════════════════════════════════
   COMMAND ROUTER
   ════════════════════════════════════════════════════════════ */
function termRunCmd(raw) {
  termCloseMenus();
  const parts   = raw.trim().split(/\s+/);
  const cmd     = parts[0].toLowerCase();
  const args    = parts.slice(1);
  const argStr  = args.join(' ');

  switch (cmd) {
    case '':       break;
    case 'cls':    case 'clear': cmdCls();           break;
    case 'help':   case '/?':    cmdHelp();           break;
    case 'echo':   cmdEcho(argStr);                   break;
    case 'dir':    cmdDir(args);                      break;
    case 'ls':     cmdDir(args);                      break;
    case 'cd':     cmdCd(argStr);                     break;
    case 'mkdir':  case 'md':    cmdMkdir(argStr);    break;
    case 'del':    case 'rm':    cmdDel(argStr);      break;
    case 'type':   case 'cat':   cmdType(argStr);     break;
    case 'copy':   cmdCopy(args);                     break;
    case 'move':   cmdMove(args);                     break;
    case 'ren':    case 'rename':cmdRename(args);     break;
    case 'set':    cmdSet(argStr);                    break;
    case 'date':   termPrint(new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}), 'term-white'); break;
    case 'time':   termPrint(new Date().toLocaleTimeString(), 'term-white'); break;
    case 'ver':    termPrint('Microsoft Windows [Version 6.2.9200]', 'term-white'); break;
    case 'whoami': termPrint('nx4real-pc\\nx4real', 'term-white'); break;
    case 'hostname':termPrint('NX4REAL-PC', 'term-white'); break;
    case 'ipconfig':cmdIpconfig(); break;
    case 'ping':   cmdPing(argStr); break;
    case 'tree':   cmdTree(); break;
    case 'tasklist':cmdTasklist(); break;
    case 'systeminfo':cmdSysteminfo(); break;
    case 'path':   termPrint(TERM.env.PATH, 'term-white'); break;
    case 'exit':   termClose(); break;
    /* ── JAVA ── */
    case 'javac':  cmdJavac(argStr); break;
    case 'java':   cmdJava(argStr, args); break;
    case 'java':   cmdJava(argStr, args); break;
    default:
      termPrint(`'${parts[0]}' is not recognized as an internal or external command,`, 'term-red');
      termPrint('operable program or batch file.', 'term-red');
  }
}

/* ════════════════════════════════════════════════════════════
   FILESYSTEM HELPERS
   ════════════════════════════════════════════════════════════ */
function fsKey(pathArr) {
  if (!pathArr || pathArr.length === 0) return 'This PC';
  if (pathArr.length === 1) return pathArr[0];
  return pathArr[pathArr.length - 1];
}

function fsCurrentDir() {
  if (typeof FS === 'undefined') return [];
  const key = fsKey(TERM.cwdPath);
  return FS[key] || [];
}

function fsFind(name) {
  return fsCurrentDir().find(i => i.name.toLowerCase() === name.toLowerCase());
}

function fsFindFile(name) {
  const item = fsFind(name);
  return (item && item.type === 'file') ? item : null;
}

function fsFindFolder(name) {
  const item = fsFind(name);
  return (item && item.type === 'folder') ? item : null;
}

/* convert cwdPath to display string */
function pathArrToStr(arr) {
  if (!arr || arr.length === 0) return 'C:';
  if (arr.length === 1) return arr[0] + '\\';
  const drive = arr[0];
  const rest  = arr.slice(1);
  return drive + '\\Users\\nx4real' + (rest.length ? '\\' + rest.join('\\') : '');
}

/* ════════════════════════════════════════════════════════════
   BUILT-IN COMMANDS
   ════════════════════════════════════════════════════════════ */
function cmdCls() {
  const out = document.getElementById('termOutput');
  if (out) out.innerHTML = '';
}

function cmdHelp() {
  const cmds = [
    ['cls / clear',   'Clear the screen'],
    ['dir / ls',      'List directory contents'],
    ['cd <path>',     'Change directory'],
    ['mkdir <name>',  'Create a new folder'],
    ['del <file>',    'Delete a file'],
    ['type <file>',   'Display file contents'],
    ['copy <src> <dst>','Copy a file'],
    ['echo <text>',   'Print text'],
    ['set',           'Show environment variables'],
    ['date',          'Show current date'],
    ['time',          'Show current time'],
    ['ver',           'Show Windows version'],
    ['whoami',        'Show current user'],
    ['ipconfig',      'Network information'],
    ['ping <host>',   'Ping a host'],
    ['tree',          'Show directory tree'],
    ['tasklist',      'List running processes'],
    ['systeminfo',    'System information'],
    ['exit',          'Close the terminal'],
    ['─────',         '────────────────────'],
    ['javac <file.java>', 'Compile a Java source file'],
    ['java <ClassName>',  'Run a compiled Java class'],
  ];
  termPrint('', '');
  cmds.forEach(([c, d]) => {
    const line = (c + '              ').slice(0, 22) + d;
    termPrint(line, c.startsWith('javac') || c.startsWith('java ') ? 'term-cyan' : 'term-white');
  });
  termPrint('', '');
}

function cmdEcho(text) {
  if (!text || text === 'on' || text === 'off') {
    termPrint('ECHO is on.', 'term-white');
  } else {
    termPrint(text, 'term-white');
  }
}

function cmdDir(args) {
  const items  = fsCurrentDir();
  const now    = new Date();
  const dStr   = now.toLocaleDateString('en-US');
  const tStr   = now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});

  termPrint('', '');
  termPrint(' Directory of ' + termCwdStr(), 'term-white');
  termPrint('', '');

  let fileCount = 0, folderCount = 0, totalBytes = 0;

  items.forEach(item => {
    if (item.type === 'folder') {
      folderCount++;
      termPrint(`${dStr}  ${tStr}    <DIR>          ${item.name}`, 'term-blue');
    } else {
      fileCount++;
      const size = item.content ? item.content.length : Math.floor(Math.random()*8000+200);
      totalBytes += size;
      const sizeStr = String(size).padStart(14);
      termPrint(`${dStr}  ${tStr}  ${sizeStr} ${item.name}`, 'term-white');
    }
  });

  termPrint('', '');
  termPrint(`            ${fileCount} File(s)    ${totalBytes.toLocaleString()} bytes`, 'term-white');
  termPrint(`            ${folderCount} Dir(s)  238,412,947,456 bytes free`, 'term-white');
  termPrint('', '');
}

function cmdCd(arg) {
  if (!arg || arg === '.') return;

  if (arg === '..') {
    if (TERM.cwdPath.length > 1) {
      TERM.cwdPath.pop();
      TERM.cwd = pathArrToStr(TERM.cwdPath);
    } else {
      termPrint('Already at root.', 'term-yellow');
    }
    termShowPrompt();
    return;
  }

  /* absolute path like C: or C:\Users */
  if (arg.includes(':')) {
    const drive = arg.split('\\')[0];
    TERM.cwdPath = [drive];
    TERM.cwd = pathArrToStr(TERM.cwdPath);
    termShowPrompt();
    return;
  }

  /* special shortcuts */
  const lower = arg.toLowerCase();
  if (lower === 'documents' || lower === '\\users\\nx4real\\documents') {
    TERM.cwdPath = ['C:', 'Documents'];
    TERM.cwd = 'C:\\Users\\nx4real\\Documents';
    termShowPrompt();
    return;
  }
  if (lower === 'desktop') {
    TERM.cwdPath = ['C:', 'Desktop'];
    TERM.cwd = 'C:\\Users\\nx4real\\Desktop';
    termShowPrompt();
    return;
  }
  if (lower === 'downloads') {
    TERM.cwdPath = ['C:', 'Downloads'];
    TERM.cwd = 'C:\\Users\\nx4real\\Downloads';
    termShowPrompt();
    return;
  }

  /* check FS for folder */
  const folder = fsFindFolder(arg);
  if (folder) {
    TERM.cwdPath.push(folder.name);
    TERM.cwd = pathArrToStr(TERM.cwdPath);
    termShowPrompt();
  } else {
    termPrint(`The system cannot find the path specified: '${arg}'`, 'term-red');
  }
}

function cmdMkdir(name) {
  if (!name) { termPrint('The syntax of the command is incorrect.', 'term-red'); return; }
  if (typeof FS === 'undefined') return;
  const key = fsKey(TERM.cwdPath);
  if (!FS[key]) FS[key] = [];
  if (FS[key].find(i => i.name === name)) {
    termPrint(`A subdirectory or file ${name} already exists.`, 'term-red'); return;
  }
  FS[key].push({ type:'folder', name });
  termPrint('', '');
}

function cmdDel(name) {
  if (!name) { termPrint('The syntax of the command is incorrect.', 'term-red'); return; }
  if (typeof FS === 'undefined') return;
  const key   = fsKey(TERM.cwdPath);
  const items = FS[key] || [];
  const idx   = items.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
  if (idx === -1) {
    termPrint(`Could Not Find ${termCwdStr()}\\${name}`, 'term-red'); return;
  }
  items.splice(idx, 1);
}

function cmdType(name) {
  if (!name) { termPrint('The syntax of the command is incorrect.', 'term-red'); return; }
  const file = fsFindFile(name);
  if (!file) { termPrint(`The system cannot find the file specified: '${name}'`, 'term-red'); return; }
  termPrint('', '');
  if (file.content) {
    file.content.split('\n').forEach(line => termPrint(line, 'term-white'));
  } else {
    termPrint('[Empty file]', 'term-grey');
  }
  termPrint('', '');
}

function cmdCopy(args) {
  if (args.length < 2) { termPrint('The syntax of the command is incorrect.', 'term-red'); return; }
  const src  = fsFindFile(args[0]);
  if (!src) { termPrint(`The system cannot find the file: '${args[0]}'`, 'term-red'); return; }
  const key  = fsKey(TERM.cwdPath);
  if (typeof FS === 'undefined') return;
  if (!FS[key]) FS[key] = [];
  FS[key].push({ ...src, name: args[1] });
  termPrint('        1 file(s) copied.', 'term-white');
}

function cmdMove(args) {
  if (args.length < 2) { termPrint('The syntax of the command is incorrect.', 'term-red'); return; }
  cmdCopy(args);
  cmdDel(args[0]);
}

function cmdRename(args) {
  if (args.length < 2) { termPrint('The syntax of the command is incorrect.', 'term-red'); return; }
  const item = fsFind(args[0]);
  if (!item) { termPrint(`The system cannot find: '${args[0]}'`, 'term-red'); return; }
  item.name = args[1];
}

function cmdSet(arg) {
  if (!arg) {
    Object.entries(TERM.env).forEach(([k,v]) => termPrint(`${k}=${v}`, 'term-white'));
  } else if (arg.includes('=')) {
    const [k, v] = arg.split('=');
    TERM.env[k.trim()] = v.trim();
  } else {
    const val = TERM.env[arg.toUpperCase()];
    if (val) termPrint(`${arg.toUpperCase()}=${val}`, 'term-white');
    else termPrint(`Environment variable '${arg}' not defined`, 'term-red');
  }
}

function cmdIpconfig() {
  termPrint('', '');
  termPrint('Windows IP Configuration', 'term-white');
  termPrint('', '');
  termPrint('Ethernet adapter Local Area Connection:', 'term-white');
  termPrint('   Connection-specific DNS Suffix  . :', 'term-grey');
  termPrint('   IPv4 Address. . . . . . . . . . : 192.168.1.105', 'term-white');
  termPrint('   Subnet Mask . . . . . . . . . . : 255.255.255.0', 'term-white');
  termPrint('   Default Gateway . . . . . . . . : 192.168.1.1', 'term-white');
  termPrint('', '');
  termPrint('Wireless LAN adapter Wi-Fi:', 'term-white');
  termPrint('   IPv4 Address. . . . . . . . . . : 192.168.1.108', 'term-white');
  termPrint('   Subnet Mask . . . . . . . . . . : 255.255.255.0', 'term-white');
  termPrint('   Default Gateway . . . . . . . . : 192.168.1.1', 'term-white');
  termPrint('', '');
}

function cmdPing(host) {
  if (!host) { termPrint('Usage: ping <hostname>', 'term-red'); return; }
  termPrint('', '');
  termPrint(`Pinging ${host} with 32 bytes of data:`, 'term-white');
  const times = [12, 14, 11, 13];
  times.forEach(t => termPrint(`Reply from 142.250.80.46: bytes=32 time=${t}ms TTL=118`, 'term-green'));
  termPrint('', '');
  termPrint(`Ping statistics for ${host}:`, 'term-white');
  termPrint('    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)', 'term-white');
  const avg = Math.round(times.reduce((a,b)=>a+b)/times.length);
  termPrint(`Approximate round trip times in milli-seconds: Minimum = ${Math.min(...times)}ms, Maximum = ${Math.max(...times)}ms, Average = ${avg}ms`, 'term-white');
  termPrint('', '');
}

function cmdTree() {
  termPrint('', '');
  termPrint('Folder PATH listing', 'term-white');
  termPrint(termCwdStr(), 'term-blue');
  const items = fsCurrentDir();
  items.forEach((item, i) => {
    const isLast = i === items.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    termPrint(prefix + item.name, item.type === 'folder' ? 'term-blue' : 'term-white');
  });
  termPrint('', '');
}

function cmdTasklist() {
  termPrint('', '');
  termPrint('Image Name                   PID  Session Name  Session#  Mem Usage', 'term-white');
  termPrint('========================== ===== ============== ======== ============', 'term-grey');
  const procs = [
    ['System Idle Process','0','Services','0','24 K'],
    ['System','4','Services','0','3,208 K'],
    ['smss.exe','352','Services','0','1,052 K'],
    ['explorer.exe','2048','Console','1','48,312 K'],
    ['notepad.exe','3124','Console','1','8,904 K'],
    ['cmd.exe','4096','Console','1','4,212 K'],
    ['java.exe','5000','Console','1','32,048 K'],
  ];
  procs.forEach(([name,pid,sess,num,mem]) => {
    const line = (name+'                          ').slice(0,27) +
                 (pid+'     ').slice(0,6) +
                 (sess+'              ').slice(0,15) +
                 (num+'        ').slice(0,9) + mem;
    termPrint(line, 'term-white');
  });
  termPrint('', '');
}

function cmdSysteminfo() {
  termPrint('', '');
  const rows = [
    ['Host Name',          'NX4REAL-PC'],
    ['OS Name',            'Microsoft Windows 8'],
    ['OS Version',         '6.2.9200 Build 9200'],
    ['OS Manufacturer',    'Microsoft Corporation'],
    ['System Manufacturer','Web Browser Inc.'],
    ['Processor',          'Intel(R) Core(TM) i7 CPU @ 2.40GHz'],
    ['Total Physical RAM', '8,192 MB'],
    ['Available RAM',      '5,120 MB'],
    ['System Drive',       'C:'],
    ['Windows Dir',        'C:\\Windows'],
    ['Registered Owner',   'Neel Patel'],
    ['Registered Org',     'nx4real'],
    ['Java Home',          TERM.env.JAVA_HOME],
  ];
  rows.forEach(([k,v]) => {
    const line = (k + ':                        ').slice(0,30) + v;
    termPrint(line, 'term-white');
  });
  termPrint('', '');
}

function termAbout() {
  termPrint('', '');
  termPrint('Windows Command Processor — Windows 8 Web', 'term-cyan');
  termPrint('Version 6.2.9200 (web edition)', 'term-white');
  termPrint('Built-in Java 8 compiler and runtime', 'term-green');
  termPrint('', '');
}

/* ════════════════════════════════════════════════════════════
   ████████████████████████████████████████████████████████
   JAVA COMPILER & RUNTIME ENGINE
   Full Java interpreter — parses & executes real Java code
   ████████████████████████████████████████████████████████
   ════════════════════════════════════════════════════════════ */

/* ── JAVAC: compile ── */
function cmdJavac(filename) {
  filename = filename.trim();
  if (!filename) {
    termPrint("Usage: javac <filename.java>", 'term-red');
    termPrint("Example: javac hello.java", 'term-yellow');
    return;
  }
  if (!filename.endsWith('.java')) {
    termPrint(`error: '${filename}' is not a .java file`, 'term-red');
    termPrint(`Tip: Make sure you saved the file with a .java extension in Notepad`, 'term-yellow');
    return;
  }

  /* find the file — first in current dir, then in Documents as fallback */
  let file = fsFindFile(filename);

  if (!file && typeof FS !== 'undefined') {
    /* fallback: search Documents */
    const docs = FS['Documents'] || [];
    const found = docs.find(f => f.name.toLowerCase() === filename.toLowerCase() && f.type === 'file');
    if (found) {
      file = found;
      termPrint(`Note: Found '${filename}' in Documents folder`, 'term-yellow');
      termPrint(`Tip: Use 'cd documents' to navigate there directly\n`, 'term-grey');
    }
  }

  if (!file) {
    termPrint(`error: file not found: ${filename}`, 'term-red');
    termPrint(``, 'term-grey');
    termPrint(`Current directory: ${termCwdStr()}`, 'term-yellow');
    termPrint(`Files here: ${fsCurrentDir().map(f=>f.name).join(', ') || '(empty)'}`, 'term-yellow');
    termPrint(``, 'term-grey');
    termPrint(`Did you save it in Notepad? Files are saved to Documents.`, 'term-yellow');
    termPrint(`Try: cd documents`, 'term-cyan');
    termPrint(`Then: javac ${filename}`, 'term-cyan');
    return;
  }

  const source = file.content || '';

  /* quick check: make sure it's actually Java code */
  if (!source.includes('class') && !source.includes('interface')) {
    termPrint(`error: ${filename}: no class or interface found`, 'term-red');
    return;
  }

  termPrint('', '');
  termPrint(`Compiling ${filename}...`, 'term-orange');

  try {
    const result = javaCompile(source, filename);
    if (result.errors.length > 0) {
      result.errors.forEach(e => {
        termPrint(`${filename}:${e.line}: error: ${e.msg}`, 'term-red');
      });
      termPrint('', '');
      termPrint(`${result.errors.length} error(s)`, 'term-red');
    } else {
      TERM.compiledClasses = result.classes;
      termPrint(`✔ Compilation successful — ${Object.keys(result.classes).length} class(es) compiled`, 'term-green');
      termPrint(`  ${Object.keys(result.classes).map(c => c + '.class').join(', ')}`, 'term-grey');

      /* add .class files to current FS dir */
      const fsKey2 = fsKey(TERM.cwdPath);
      if (typeof FS !== 'undefined') {
        if (!FS[fsKey2]) FS[fsKey2] = [];
        Object.keys(result.classes).forEach(cls => {
          const classFile = cls + '.class';
          if (!FS[fsKey2].find(f => f.name === classFile)) {
            FS[fsKey2].push({ type:'file', name:classFile, icon:'icons/file-exe.png', content:'[compiled bytecode]' });
          }
        });
        /* also write to Documents if file was found there */
        if (FS[fsKey2] !== FS['Documents'] && FS['Documents']) {
          Object.keys(result.classes).forEach(cls => {
            const classFile = cls + '.class';
            if (!FS['Documents'].find(f => f.name === classFile)) {
              FS['Documents'].push({ type:'file', name:classFile, icon:'icons/file-exe.png', content:'[compiled bytecode]' });
            }
          });
        }
      }
      /* print next step hint */
      const mainClass = Object.values(result.classes).find(c => c.mainMethod);
      if (mainClass) {
        termPrint('', '');
        termPrint(`Run it with: java ${mainClass.name}`, 'term-cyan');
      }
    }
  } catch(err) {
    termPrint(`Compiler internal error: ${err.message}`, 'term-red');
  }
  termPrint('', '');
}

/* ── JAVA: run ── */
function cmdJava(className, args) {
  className = className.trim();
  if (!className) { termPrint('Usage: java <ClassName>', 'term-red'); return; }

  const cls = TERM.compiledClasses[className];
  if (!cls) {
    /* check if .class file exists but not compiled yet */
    const classFile = fsFindFile(className + '.class');
    if (classFile) {
      termPrint(`Error: Class '${className}' was compiled but not loaded.`, 'term-red');
      termPrint(`Please run: javac ${className}.java  first in this terminal session.`, 'term-yellow');
    } else {
      termPrint(`Error: Could not find or load main class ${className}`, 'term-red');
      termPrint(`Caused by: java.lang.ClassNotFoundException: ${className}`, 'term-red');
    }
    return;
  }

  if (!cls.mainMethod) {
    termPrint(`Error: Main method not found in class ${className}`, 'term-red');
    termPrint('Please define the main method as: public static void main(String[] args)', 'term-yellow');
    return;
  }

  termPrint('', '');
  try {
    const rt = new JavaRuntime(TERM.compiledClasses);
    rt.runMain(className, args.slice(1)); /* skip classname, pass rest as args */
    rt.output.forEach(line => termPrint(line, 'term-green'));
    if (rt.errors.length > 0) {
      rt.errors.forEach(e => termPrint('Exception: ' + e, 'term-red'));
    }
  } catch(e) {
    termPrint('Runtime Exception: ' + e.message, 'term-red');
  }
  termPrint('', '');
}

/* ════════════════════════════════════════════════════════════
   JAVA COMPILER  (parser → AST → class table)
   ════════════════════════════════════════════════════════════ */
function javaCompile(source, filename) {
  const errors  = [];
  const classes = {};

  /* ── TOKENIZER ── */
  function tokenize(src) {
    const tokens = [];
    let i = 0;
    const keywords = new Set([
      'class','public','private','protected','static','void','int','long',
      'double','float','boolean','char','String','byte','short',
      'if','else','for','while','do','return','new','this','super',
      'extends','implements','interface','abstract','final','null',
      'true','false','import','package','try','catch','finally','throw',
      'throws','instanceof','break','continue','switch','case','default',
    ]);

    while (i < src.length) {
      /* skip whitespace */
      if (/\s/.test(src[i])) { i++; continue; }

      /* single-line comment */
      if (src[i]==='/' && src[i+1]==='/') {
        while (i < src.length && src[i] !== '\n') i++;
        continue;
      }
      /* multi-line comment */
      if (src[i]==='/' && src[i+1]==='*') {
        i += 2;
        while (i < src.length && !(src[i]==='*' && src[i+1]==='/')) i++;
        i += 2; continue;
      }
      /* string literal */
      if (src[i] === '"') {
        let s = '';
        i++;
        while (i < src.length && src[i] !== '"') {
          if (src[i]==='\\') { i++; s += ({n:'\n',t:'\t',r:'\r','\\':'\\','"':'"'}[src[i]] || src[i]); }
          else s += src[i];
          i++;
        }
        i++;
        tokens.push({ type:'STRING', value:s });
        continue;
      }
      /* char literal — if more than one char treat as String (common mistake) */
      if (src[i] === "'") {
        let s = '';
        i++;
        while (i < src.length && src[i] !== "'") {
          if (src[i] === '\\') {
            i++;
            s += ({ n:'\n', t:'\t', r:'\r', '\\':'\\', "'":"'" }[src[i]] || src[i]);
          } else {
            s += src[i];
          }
          i++;
        }
        i++; /* closing ' */
        /* if single char → CHAR, else treat as STRING so println works */
        tokens.push({ type: s.length === 1 ? 'CHAR' : 'STRING', value: s });
        continue;
      }
      /* number */
      if (/[0-9]/.test(src[i]) || (src[i]==='-' && /[0-9]/.test(src[i+1]) && tokens.length && ['OP','PUNCT'].includes(tokens[tokens.length-1]?.type))) {
        let num = '';
        if (src[i]==='-') { num='-'; i++; }
        while (i < src.length && /[0-9._]/.test(src[i])) { num += src[i]; i++; }
        if (src[i]==='L' || src[i]==='l') i++;
        if (src[i]==='d' || src[i]==='D' || src[i]==='f' || src[i]==='F') i++;
        tokens.push({ type:'NUMBER', value: parseFloat(num.replace(/_/g,'')) }); continue;
      }
      /* identifier / keyword */
      if (/[a-zA-Z_$]/.test(src[i])) {
        let id = '';
        while (i < src.length && /[a-zA-Z0-9_$]/.test(src[i])) { id += src[i]; i++; }
        tokens.push({ type: keywords.has(id) ? 'KW' : 'ID', value: id }); continue;
      }
      /* operators & punctuation */
      const two = src[i] + (src[i+1]||'');
      if (['++','--','==','!=','<=','>=','&&','||','+=','-=','*=','/=','%='].includes(two)) {
        tokens.push({ type:'OP', value:two }); i+=2; continue;
      }
      if ('+-*/%<>=!&|^~'.includes(src[i])) {
        tokens.push({ type:'OP', value:src[i] }); i++; continue;
      }
      if ('{}()[];,.:'.includes(src[i])) {
        tokens.push({ type:'PUNCT', value:src[i] }); i++; continue;
      }
      i++; /* skip unknown */
    }
    return tokens;
  }

  /* ── PARSER ── */
  function parse(tokens) {
    let pos = 0;
    const classMap = {};

    function peek(offset) { return tokens[pos + (offset||0)]; }
    function eat(val) {
      const t = tokens[pos];
      if (val && t?.value !== val) throw { line:0, msg:`Expected '${val}' but got '${t?.value}'` };
      pos++;
      return t;
    }
    function eatType(type) {
      const t = tokens[pos];
      if (t?.type !== type) throw { line:0, msg:`Expected ${type} but got '${t?.value}'` };
      pos++;
      return t;
    }
    function check(val) { return tokens[pos]?.value === val; }
    function checkType(type) { return tokens[pos]?.type === type; }

    /* skip package / import */
    while (pos < tokens.length && (check('package') || check('import'))) {
      while (pos < tokens.length && !check(';')) pos++;
      pos++;
    }

    /* parse class definitions */
    while (pos < tokens.length) {
      const modifiers = [];
      while (['public','private','protected','abstract','final','static'].includes(peek()?.value)) {
        modifiers.push(eat()); 
      }
      if (!check('class') && !check('interface')) { pos++; continue; }
      eat(); /* class / interface */
      const className = eatType('ID').value;
      const cls = { name: className, fields:{}, methods:{}, constructor:null, superClass:'Object' };

      if (check('extends')) { eat(); cls.superClass = eatType('ID').value; }
      if (check('implements')) { eat(); while(!check('{')) pos++; }

      eat('{'); /* class body open */

      /* parse class members */
      while (!check('}') && pos < tokens.length) {
        const mods = [];
        while (['public','private','protected','static','final','abstract','synchronized'].includes(peek()?.value)) {
          mods.push(eat().value);
        }
        if (check('}')) break;

        /* return type or field type */
        const typeToken = peek();
        let retType = '';
        if (['void','int','long','double','float','boolean','char','String','byte','short'].includes(typeToken?.value) || typeToken?.type==='ID') {
          retType = eat().value;
          /* array type */
          if (check('[')) { eat('['); eat(']'); retType += '[]'; }
        } else { pos++; continue; }

        const nameToken = peek();
        if (nameToken?.type !== 'ID') { pos++; continue; }
        const memberName = eat().value;

        if (check('(')) {
          /* METHOD */
          eat('(');
          const params = [];
          while (!check(')') && pos < tokens.length) {
            const pType = eat().value + (check('[')?(eat(),eat(),']'):'');
            if (check(')') || check(',')) {
              if (check(',')) eat();
              continue;
            }
            const pName = checkType('ID') ? eat().value : '_p';
            params.push({ type:pType, name:pName });
            if (check(',')) eat();
          }
          eat(')');
          if (check('throws')) { eat(); while(!check('{') && !check(';')) pos++; }

          let body = null;
          if (check('{')) {
            body = parseBlock();
          } else if (check(';')) { eat(); }

          const isMain = memberName==='main' && mods.includes('static') && mods.includes('public');
          const method = { name:memberName, params, body, modifiers:mods, returnType:retType };
          cls.methods[memberName] = method;
          if (isMain) cls.mainMethod = method;

          /* constructor */
          if (memberName === className) cls.constructor = method;

        } else if (check('=') || check(';')) {
          /* FIELD */
          let initVal = null;
          if (check('=')) {
            eat('=');
            initVal = parseExpression();
          }
          if (check(';')) eat(';');
          cls.fields[memberName] = { type:retType, value:initVal, modifiers:mods };
        } else {
          pos++;
        }
      }
      eat('}'); /* class body close */
      classMap[className] = cls;
    }

    /* ── expression parser ── */
    function parseExpression() {
      return parseAssignment();
    }

    function parseAssignment() {
      let left = parseTernary();
      if (['=','+=','-=','*=','/=','%='].includes(peek()?.value)) {
        const op = eat().value;
        const right = parseAssignment();
        return { type:'assign', op, left, right };
      }
      return left;
    }

    function parseTernary() {
      let cond = parseOr();
      if (check('?')) {
        eat('?'); const t = parseExpression();
        eat(':'); const f = parseExpression();
        return { type:'ternary', cond, then:t, else:f };
      }
      return cond;
    }

    function parseOr()  { let l=parseAnd();  while(check('||')){ eat(); l={type:'binop',op:'||',left:l,right:parseAnd()};  } return l; }
    function parseAnd() { let l=parseEq();   while(check('&&')){ eat(); l={type:'binop',op:'&&',left:l,right:parseEq()};   } return l; }
    function parseEq()  { let l=parseRel();  while(['==','!='].includes(peek()?.value)){ const op=eat().value; l={type:'binop',op,left:l,right:parseRel()}; } return l; }
    function parseRel() { let l=parseAdd();  while(['<','>','<=','>='].includes(peek()?.value)&&peek(1)?.value!='>'){ const op=eat().value; l={type:'binop',op,left:l,right:parseAdd()}; } return l; }
    function parseAdd() { let l=parseMul();  while(['+','-'].includes(peek()?.value)){ const op=eat().value; l={type:'binop',op,left:l,right:parseMul()}; } return l; }
    function parseMul() { let l=parseUnary();while(['*','/','%'].includes(peek()?.value)){ const op=eat().value; l={type:'binop',op,left:l,right:parseUnary()}; } return l; }

    function parseUnary() {
      if (check('!'))  { eat(); return { type:'unary', op:'!',  expr:parseUnary() }; }
      if (check('-'))  { eat(); return { type:'unary', op:'-',  expr:parseUnary() }; }
      if (check('++')) { eat(); return { type:'unary', op:'pre++', expr:parseUnary() }; }
      if (check('--')) { eat(); return { type:'unary', op:'pre--', expr:parseUnary() }; }
      return parsePostfix();
    }

    function parsePostfix() {
      let expr = parsePrimary();
      while (true) {
        if (check('++')) { eat(); expr={type:'unary',op:'post++',expr}; }
        else if (check('--')) { eat(); expr={type:'unary',op:'post--',expr}; }
        else if (check('.')) {
          eat('.');
          const member = eatType('ID').value;
          if (check('(')) {
            eat('(');
            const margs = parseArgList();
            eat(')');
            expr = { type:'methodcall', object:expr, method:member, args:margs };
          } else {
            expr = { type:'fieldaccess', object:expr, field:member };
          }
        } else if (check('[')) {
          eat('[');
          const idx = parseExpression();
          eat(']');
          expr = { type:'arrayaccess', array:expr, index:idx };
        } else break;
      }
      return expr;
    }

    function parsePrimary() {
      const t = peek();
      if (!t) return { type:'literal', value:null };

      /* literals */
      if (t.type==='NUMBER') { eat(); return { type:'literal', value:t.value }; }
      if (t.type==='STRING') { eat(); return { type:'literal', value:t.value }; }
      if (t.type==='CHAR')   { eat(); return { type:'literal', value:t.value }; }
      if (t.value==='true')  { eat(); return { type:'literal', value:true }; }
      if (t.value==='false') { eat(); return { type:'literal', value:false }; }
      if (t.value==='null')  { eat(); return { type:'literal', value:null }; }

      /* parenthesised */
      if (t.value==='(') {
        eat('(');
        const e = parseExpression();
        eat(')');
        return e;
      }

      /* new */
      if (t.value==='new') {
        eat('new');
        const className2 = eatType('ID').value;
        if (check('[')) {
          eat('['); const size = parseExpression(); eat(']');
          return { type:'newarray', elementType:className2, size };
        }
        eat('(');
        const cargs = parseArgList();
        eat(')');
        /* object initialiser body optional */
        if (check('{')) parseBlock();
        return { type:'newobj', className:className2, args:cargs };
      }

      /* identifier — variable / method call */
      if (t.type==='ID' || t.type==='KW') {
        eat();
        if (check('(')) {
          eat('(');
          const cargs = parseArgList();
          eat(')');
          return { type:'call', name:t.value, args:cargs };
        }
        return { type:'var', name:t.value };
      }

      eat(); /* skip unknown */
      return { type:'literal', value:undefined };
    }

    function parseArgList() {
      const args = [];
      while (!check(')') && pos < tokens.length) {
        args.push(parseExpression());
        if (check(',')) eat();
      }
      return args;
    }

    /* ── block parser ── */
    function parseBlock() {
      eat('{');
      const stmts = [];
      while (!check('}') && pos < tokens.length) {
        const s = parseStatement();
        if (s) stmts.push(s);
      }
      eat('}');
      return { type:'block', stmts };
    }

    function parseStatement() {
      const t = peek();
      if (!t || t.value==='}') return null;

      /* block */
      if (t.value==='{') return parseBlock();

      /* if */
      if (t.value==='if') {
        eat('if'); eat('(');
        const cond = parseExpression(); eat(')');
        const then = parseStatement();
        let els = null;
        if (check('else')) { eat('else'); els = parseStatement(); }
        return { type:'if', cond, then, else:els };
      }

      /* while */
      if (t.value==='while') {
        eat('while'); eat('(');
        const cond = parseExpression(); eat(')');
        const body = parseStatement();
        return { type:'while', cond, body };
      }

      /* for */
      if (t.value==='for') {
        eat('for'); eat('(');
        /* init */
        let init = null;
        if (!check(';')) {
          init = parseStatement();
          if (!['vardecl','exprstmt'].includes(init?.type)) init = { type:'exprstmt', expr:init };
        } else eat(';');
        /* condition */
        let cond = null;
        if (!check(';')) cond = parseExpression();
        eat(';');
        /* update */
        let update = null;
        if (!check(')')) update = parseExpression();
        eat(')');
        const body = parseStatement();
        return { type:'for', init, cond, update, body };
      }

      /* do-while */
      if (t.value==='do') {
        eat('do');
        const body = parseStatement();
        eat('while'); eat('(');
        const cond = parseExpression(); eat(')'); eat(';');
        return { type:'dowhile', body, cond };
      }

      /* return */
      if (t.value==='return') {
        eat('return');
        let val = null;
        if (!check(';')) val = parseExpression();
        if (check(';')) eat(';');
        return { type:'return', value:val };
      }

      /* break / continue */
      if (t.value==='break')    { eat(); if(check(';'))eat(';'); return { type:'break' }; }
      if (t.value==='continue') { eat(); if(check(';'))eat(';'); return { type:'continue' }; }

      /* throw */
      if (t.value==='throw') {
        eat('throw');
        const val = parseExpression();
        if (check(';')) eat(';');
        return { type:'throw', value:val };
      }

      /* try-catch */
      if (t.value==='try') {
        eat('try');
        const tryBlock = parseBlock();
        const catches = [];
        while (check('catch')) {
          eat('catch'); eat('(');
          while(!check(')')) pos++; eat(')');
          catches.push(parseBlock());
        }
        let fin = null;
        if (check('finally')) { eat('finally'); fin = parseBlock(); }
        return { type:'trycatch', tryBlock, catches, finally:fin };
      }

      /* switch */
      if (t.value==='switch') {
        eat('switch'); eat('(');
        const val = parseExpression(); eat(')'); eat('{');
        const cases = [];
        while (!check('}') && pos < tokens.length) {
          if (check('case')) {
            eat('case');
            const cval = parseExpression(); eat(':');
            const stmts = [];
            while (!check('case') && !check('default') && !check('}')) {
              const s = parseStatement(); if(s) stmts.push(s);
            }
            cases.push({ value:cval, stmts });
          } else if (check('default')) {
            eat('default'); eat(':');
            const stmts = [];
            while (!check('}')) { const s = parseStatement(); if(s) stmts.push(s); }
            cases.push({ value:null, stmts });
          } else pos++;
        }
        eat('}');
        return { type:'switch', value:val, cases };
      }

      /* variable declaration: type name [= expr]; */
      const isType = ['int','long','double','float','boolean','char','String','byte','short','var']
        .includes(t.value) || (t.type==='ID' && peek(1)?.type==='ID' && peek(1)?.value!=='(');
      if (isType && peek(1)?.type==='ID') {
        const varType = eat().value + (check('[')?(eat(),eat(),']'):'');
        const varName = eatType('ID').value;
        let initVal = null;
        if (check('=')) { eat('='); initVal = parseExpression(); }
        if (check(';')) eat(';');
        return { type:'vardecl', varType, varName, init:initVal };
      }

      /* expression statement */
      const expr = parseExpression();
      if (check(';')) eat(';');
      return { type:'exprstmt', expr };
    }

    return classMap;
  }

  /* run tokenizer + parser */
  try {
    const tokens  = tokenize(source);
    const classes2= parse(tokens);
    /* validate: filename must match public class name */
    const publicClasses = Object.values(classes2).filter(c =>
      Object.values(c.fields || {}).length >= 0); /* all are valid */
    const expectedName = filename.replace('.java','');
    if (classes2[expectedName] === undefined && Object.keys(classes2).length > 0) {
      /* not an error unless there's a class with a different name */
    }
    return { errors, classes: classes2 };
  } catch(e) {
    errors.push({ line:1, msg: e.message || String(e) });
    return { errors, classes:{} };
  }
}

/* ════════════════════════════════════════════════════════════
   JAVA RUNTIME ENGINE
   Walks the AST and executes it
   ════════════════════════════════════════════════════════════ */
class JavaRuntime {
  constructor(classes) {
    this.classes = classes;
    this.output  = [];
    this.errors  = [];
    this.callStack = 0;
  }

  runMain(className, programArgs) {
    const cls = this.classes[className];
    if (!cls || !cls.mainMethod) throw new Error(`No main method in ${className}`);
    const env = new Environment(null);
    env.set('args', programArgs || []);
    /* initialise static fields */
    Object.entries(cls.fields || {}).forEach(([k,f]) => {
      if (f.modifiers?.includes('static')) {
        env.set(k, f.value ? this.evalExpr(f.value, env) : this.defaultVal(f.type));
      }
    });
    this.execBlock(cls.mainMethod.body, env);
  }

  execBlock(block, env) {
    if (!block) return;
    if (block.type === 'block') {
      const scope = new Environment(env);
      for (const stmt of (block.stmts || [])) {
        const result = this.execStmt(stmt, scope);
        if (result && (result.type === 'return' || result.type === 'break' || result.type === 'continue')) return result;
      }
    } else {
      return this.execStmt(block, env);
    }
  }

  execStmt(stmt, env) {
    if (!stmt) return;
    if (this.callStack > 500) throw new Error('StackOverflowError');

    switch(stmt.type) {
      case 'block':    return this.execBlock(stmt, env);
      case 'vardecl': {
        const val = stmt.init ? this.evalExpr(stmt.init, env) : this.defaultVal(stmt.varType);
        env.set(stmt.varName, val);
        return;
      }
      case 'exprstmt': this.evalExpr(stmt.expr, env); return;
      case 'return':   return { type:'return', value: stmt.value ? this.evalExpr(stmt.value, env) : null };
      case 'break':    return { type:'break' };
      case 'continue': return { type:'continue' };
      case 'throw':    { const v = this.evalExpr(stmt.value, env); throw new Error(String(v)); }

      case 'if': {
        const cond = this.evalExpr(stmt.cond, env);
        if (cond) return this.execBlock(stmt.then, new Environment(env));
        else if (stmt.else) return this.execBlock(stmt.else, new Environment(env));
        return;
      }
      case 'while': {
        let iter = 0;
        while (this.evalExpr(stmt.cond, env)) {
          if (++iter > 100000) throw new Error('Infinite loop detected (>100000 iterations)');
          const r = this.execBlock(stmt.body, new Environment(env));
          if (r?.type === 'break') break;
          if (r?.type === 'return') return r;
        }
        return;
      }
      case 'dowhile': {
        let iter = 0;
        do {
          if (++iter > 100000) throw new Error('Infinite loop detected');
          const r = this.execBlock(stmt.body, new Environment(env));
          if (r?.type === 'break') break;
          if (r?.type === 'return') return r;
        } while (this.evalExpr(stmt.cond, env));
        return;
      }
      case 'for': {
        const scope = new Environment(env);
        if (stmt.init) this.execStmt(stmt.init, scope);
        let iter = 0;
        while (!stmt.cond || this.evalExpr(stmt.cond, scope)) {
          if (++iter > 100000) throw new Error('Infinite loop detected');
          const r = this.execBlock(stmt.body, new Environment(scope));
          if (r?.type === 'break') break;
          if (r?.type === 'return') return r;
          if (stmt.update) this.evalExpr(stmt.update, scope);
        }
        return;
      }
      case 'switch': {
        const val = this.evalExpr(stmt.value, env);
        let matched = false;
        for (const c of (stmt.cases || [])) {
          if (!matched && c.value !== null) {
            const cv = this.evalExpr(c.value, env);
            if (cv == val) matched = true;
          } else if (c.value === null) matched = true;
          if (matched) {
            for (const s of (c.stmts || [])) {
              const r = this.execStmt(s, env);
              if (r?.type === 'break') return;
              if (r?.type === 'return') return r;
            }
          }
        }
        return;
      }
      case 'trycatch': {
        try { return this.execBlock(stmt.tryBlock, new Environment(env)); }
        catch(e) {
          for (const c of (stmt.catches || [])) {
            this.execBlock(c, new Environment(env));
          }
        } finally {
          if (stmt.finally) this.execBlock(stmt.finally, new Environment(env));
        }
        return;
      }
    }
  }

  evalExpr(expr, env) {
    if (!expr) return null;
    switch(expr.type) {
      case 'literal': return expr.value;
      case 'var':     {
        const name = expr.name;
        if (name === 'System') return { _javaSystem: true };
        if (name === 'Math')   return { _javaMath: true };
        if (name === 'Integer') return { _javaInteger: true };
        if (name === 'Double')  return { _javaDouble: true };
        if (name === 'String')  return { _javaString: true };
        if (name === 'Boolean') return { _javaBoolean: true };
        if (name === 'Arrays')  return { _javaArrays: true };
        if (name === 'Collections') return { _javaCollections: true };
        const val = env.get(name);
        return val;
      }
      case 'assign': {
        let val = this.evalExpr(expr.right, env);
        if (expr.op === '+=') val = (env.get(expr.left.name)||0) + val;
        if (expr.op === '-=') val = (env.get(expr.left.name)||0) - val;
        if (expr.op === '*=') val = (env.get(expr.left.name)||0) * val;
        if (expr.op === '/=') val = (env.get(expr.left.name)||0) / val;
        if (expr.op === '%=') val = (env.get(expr.left.name)||0) % val;
        if (expr.left.type === 'var') env.set(expr.left.name, val);
        else if (expr.left.type === 'fieldaccess') {
          const obj = this.evalExpr(expr.left.object, env);
          if (obj && typeof obj === 'object') obj[expr.left.field] = val;
        } else if (expr.left.type === 'arrayaccess') {
          const arr = this.evalExpr(expr.left.array, env);
          const idx = this.evalExpr(expr.left.index, env);
          if (Array.isArray(arr)) arr[idx] = val;
        }
        return val;
      }
      case 'binop': {
        const l = this.evalExpr(expr.left, env);
        const r = this.evalExpr(expr.right, env);
        switch(expr.op) {
          case '+':  return (typeof l==='string'||typeof r==='string') ? String(l)+String(r) : l+r;
          case '-':  return l-r;
          case '*':  return l*r;
          case '/':  if(r===0) throw new Error('ArithmeticException: / by zero'); return l/r;
          case '%':  return l%r;
          case '==': return l==r;
          case '!=': return l!=r;
          case '<':  return l<r;
          case '>':  return l>r;
          case '<=': return l<=r;
          case '>=': return l>=r;
          case '&&': return l&&r;
          case '||': return l||r;
          default:   return null;
        }
      }
      case 'unary': {
        switch(expr.op) {
          case '!':     return !this.evalExpr(expr.expr, env);
          case '-':     return -this.evalExpr(expr.expr, env);
          case 'pre++': { const v=this.evalExpr(expr.expr,env)+1; env.set(expr.expr.name,v); return v; }
          case 'pre--': { const v=this.evalExpr(expr.expr,env)-1; env.set(expr.expr.name,v); return v; }
          case 'post++':{ const v=this.evalExpr(expr.expr,env); env.set(expr.expr.name,v+1); return v; }
          case 'post--':{ const v=this.evalExpr(expr.expr,env); env.set(expr.expr.name,v-1); return v; }
        }
      }
      case 'ternary': return this.evalExpr(expr.cond,env) ? this.evalExpr(expr.then,env) : this.evalExpr(expr.else,env);
      case 'newarray': {
        const size = Math.floor(this.evalExpr(expr.size, env));
        return new Array(size).fill(this.defaultVal(expr.elementType));
      }
      case 'newobj': {
        const cls = this.classes[expr.className];
        if (!cls) {
          /* built-in types */
          if (expr.className === 'StringBuilder' || expr.className === 'StringBuffer') {
            const init = expr.args[0] ? String(this.evalExpr(expr.args[0],env)) : '';
            return { _sb:true, value:init,
              append(v){ this.value+=String(v); return this; },
              toString(){ return this.value; },
              length(){ return this.value.length; },
              charAt(i){ return this.value[i]; },
              reverse(){ this.value=this.value.split('').reverse().join(''); return this; },
              deleteCharAt(i){ this.value=this.value.slice(0,i)+this.value.slice(i+1); return this; },
              insert(i,v){ this.value=this.value.slice(0,i)+String(v)+this.value.slice(i); return this; },
            };
          }
          if (expr.className === 'ArrayList' || expr.className === 'LinkedList') {
            return { _list:true, data:[], add(v){this.data.push(v);return true;}, get(i){return this.data[i];}, size(){return this.data.length;}, remove(i){this.data.splice(i,1);return this;}, contains(v){return this.data.includes(v);}, toString(){return '['+this.data.join(', ')+']';} };
          }
          if (expr.className === 'HashMap' || expr.className === 'TreeMap') {
            return { _map:true, data:{}, put(k,v){this.data[k]=v;return null;}, get(k){return this.data[k]??null;}, containsKey(k){return k in this.data;}, size(){return Object.keys(this.data).length;}, keySet(){return Object.keys(this.data);}, toString(){return JSON.stringify(this.data);} };
          }
          if (expr.className === 'HashSet' || expr.className === 'TreeSet') {
            return { _set:true, data:new Set(), add(v){this.data.add(v);return true;}, contains(v){return this.data.has(v);}, size(){return this.data.size;}, remove(v){return this.data.delete(v);}, toString(){return '['+[...this.data].join(', ')+']';} };
          }
          if (expr.className === 'Scanner') {
            return { _scanner:true, next(){return '';}, nextLine(){return '';}, nextInt(){return 0;}, nextDouble(){return 0.0;} };
          }
          if (expr.className === 'Random') {
            return { nextInt(n){return Math.floor(Math.random()*(n||100));}, nextDouble(){return Math.random();}, nextBoolean(){return Math.random()>.5;} };
          }
          return {};
        }
        /* user-defined class */
        const obj = { _class: expr.className };
        Object.entries(cls.fields||{}).forEach(([k,f]) => {
          obj[k] = f.value ? this.evalExpr(f.value,env) : this.defaultVal(f.type);
        });
        if (cls.constructor) {
          const cenv = new Environment(env);
          cenv.set('this', obj);
          const cargs = expr.args.map(a => this.evalExpr(a,env));
          cls.constructor.params.forEach((p,i) => cenv.set(p.name, cargs[i]));
          this.callStack++;
          this.execBlock(cls.constructor.body, cenv);
          this.callStack--;
        }
        return obj;
      }
      case 'fieldaccess': {
        const obj = this.evalExpr(expr.object, env);
        if (obj === null || obj === undefined) return null;

        /* ── Java built-in static field access ── */
        if (obj && obj._javaSystem) {
          if (expr.field === 'out')  return { _out:true,  _isPrintStream:true };
          if (expr.field === 'err')  return { _err:true,  _isPrintStream:true };
          if (expr.field === 'in')   return { _scanner:true };
          return null;
        }
        if (obj && obj._javaMath) {
          if (expr.field === 'PI')   return Math.PI;
          if (expr.field === 'E')    return Math.E;
          return null;
        }
        if (obj && obj._javaInteger) {
          if (expr.field === 'MAX_VALUE') return 2147483647;
          if (expr.field === 'MIN_VALUE') return -2147483648;
        }
        if (obj && obj._javaDouble) {
          if (expr.field === 'MAX_VALUE') return Number.MAX_VALUE;
          if (expr.field === 'MIN_VALUE') return Number.MIN_VALUE;
          if (expr.field === 'NaN')       return NaN;
        }

        /* string length */
        if (typeof obj === 'string') {
          if (expr.field === 'length') return obj.length;
        }
        /* array length */
        if (Array.isArray(obj)) {
          if (expr.field === 'length') return obj.length;
        }
        /* ArrayList/list size */
        if (obj && obj._list) {
          if (expr.field === 'size') return obj.data.length;
        }
        /* general object field */
        if (typeof obj === 'object' && obj !== null) {
          return obj[expr.field] ?? null;
        }
        return null;
      }
      case 'arrayaccess': {
        const arr = this.evalExpr(expr.array, env);
        const idx = this.evalExpr(expr.index, env);
        if (Array.isArray(arr)) return arr[idx] ?? null;
        if (typeof arr === 'string') return arr[idx] ?? null;
        return null;
      }
      case 'methodcall': {
        const obj  = this.evalExpr(expr.object, env);
        const args = expr.args.map(a => this.evalExpr(a, env));
        return this.callMethod(obj, expr.method, args, env);
      }
      case 'call': {
        /* static / standalone call */
        const args = expr.args.map(a => this.evalExpr(a, env));
        /* check if it's a method on current class */
        const currentCls = Object.values(this.classes)[0];
        if (currentCls && currentCls.methods[expr.name]) {
          return this.invokeMethod(currentCls, expr.name, args, env);
        }
        return null;
      }
    }
    return null;
  }

  callMethod(obj, method, args, env) {
    if (obj === null || obj === undefined) throw new Error('NullPointerException');

    /* System — static methods */
    if (obj && obj._javaSystem) {
      if (method === 'exit')              { this.output.push('[Program exited with code ' + (args[0]??0) + ']'); return null; }
      if (method === 'currentTimeMillis') return Date.now();
      if (method === 'nanoTime')          return Date.now() * 1e6;
      if (method === 'arraycopy')         return null;
      if (method === 'out' || method === 'err') return { _out:true, _isPrintStream:true };
      return null;
    }

    /* PrintStream (System.out / System.err) */
    if (obj && (obj._out || obj._err || obj._isPrintStream)) {
      const text = args.map(a => this.javaToString(a)).join('');
      if (method === 'println') { this.output.push(text); return null; }
      if (method === 'print')   { this.output.push(text); return null; }
      if (method === 'printf' || method === 'format') {
        this.output.push(this.javaFormat(args[0], args.slice(1)));
        return null;
      }
      if (method === 'flush' || method === 'close') return null;
      return null;
    }

    /* Math */
    if (obj && obj._javaMath) {
      const n = args[0]; const n2 = args[1];
      switch(method) {
        case 'abs':   return Math.abs(n);
        case 'sqrt':  return Math.sqrt(n);
        case 'pow':   return Math.pow(n, n2);
        case 'max':   return Math.max(n, n2);
        case 'min':   return Math.min(n, n2);
        case 'floor': return Math.floor(n);
        case 'ceil':  return Math.ceil(n);
        case 'round': return Math.round(n);
        case 'log':   return Math.log(n);
        case 'log10': return Math.log10(n);
        case 'sin':   return Math.sin(n);
        case 'cos':   return Math.cos(n);
        case 'tan':   return Math.tan(n);
        case 'random':return Math.random();
        case 'PI':    return Math.PI;
        case 'E':     return Math.E;
        default: return null;
      }
    }

    /* Math.PI / Math.E as field access */
    if (obj && obj._javaMath && method === 'PI') return Math.PI;

    /* Integer / Double / String class methods */
    if (obj && obj._javaInteger) {
      if (method === 'parseInt')    return parseInt(args[0]);
      if (method === 'toBinaryString') return (args[0]>>>0).toString(2);
      if (method === 'toHexString') return (args[0]>>>0).toString(16);
      if (method === 'MAX_VALUE')   return 2147483647;
      if (method === 'MIN_VALUE')   return -2147483648;
    }
    if (obj && obj._javaDouble) {
      if (method === 'parseDouble') return parseFloat(args[0]);
      if (method === 'isNaN')       return isNaN(args[0]);
    }
    if (obj && obj._javaString) {
      if (method === 'valueOf')     return String(args[0]);
      if (method === 'format')      return this.javaFormat(args[0], args.slice(1));
    }
    if (obj && obj._javaBoolean) {
      if (method === 'parseBoolean') return args[0]==='true';
    }

    /* Arrays */
    if (obj && obj._javaArrays) {
      if (method === 'sort')     { args[0]?.sort((a,b)=>a-b); return null; }
      if (method === 'fill')     { if(Array.isArray(args[0])) args[0].fill(args[1]); return null; }
      if (method === 'toString') { return '['+((args[0]||[]).join(', '))+']'; }
      if (method === 'copyOf')   { return (args[0]||[]).slice(0,args[1]); }
    }

    /* Collections */
    if (obj && obj._javaCollections) {
      if (method === 'sort')    { args[0]?.data?.sort((a,b)=>a<b?-1:a>b?1:0); return null; }
      if (method === 'reverse') { args[0]?.data?.reverse(); return null; }
      if (method === 'max')     { return Math.max(...(args[0]?.data||[])); }
      if (method === 'min')     { return Math.min(...(args[0]?.data||[])); }
    }

    /* String methods */
    if (typeof obj === 'string') {
      switch(method) {
        case 'length':      return obj.length;
        case 'charAt':      return obj[args[0]] ?? '';
        case 'substring':   return args.length>1 ? obj.slice(args[0],args[1]) : obj.slice(args[0]);
        case 'indexOf':     return obj.indexOf(String(args[0]));
        case 'lastIndexOf': return obj.lastIndexOf(String(args[0]));
        case 'contains':    return obj.includes(String(args[0]));
        case 'startsWith':  return obj.startsWith(String(args[0]));
        case 'endsWith':    return obj.endsWith(String(args[0]));
        case 'replace':     return obj.split(String(args[0])).join(String(args[1]));
        case 'replaceAll':  try{ return obj.replace(new RegExp(String(args[0]),'g'),String(args[1])); }catch(e){return obj;}
        case 'toLowerCase': return obj.toLowerCase();
        case 'toUpperCase': return obj.toUpperCase();
        case 'trim':        return obj.trim();
        case 'strip':       return obj.trim();
        case 'split':       return obj.split(new RegExp(String(args[0])));
        case 'toCharArray': return obj.split('');
        case 'equals':      return obj === String(args[0]);
        case 'equalsIgnoreCase': return obj.toLowerCase() === String(args[0]).toLowerCase();
        case 'compareTo':   return obj < args[0] ? -1 : obj > args[0] ? 1 : 0;
        case 'isEmpty':     return obj.length === 0;
        case 'isBlank':     return obj.trim().length === 0;
        case 'concat':      return obj + String(args[0]);
        case 'valueOf':     return String(args[0]);
        case 'toString':    return obj;
        case 'matches':     try{return new RegExp(args[0]).test(obj);}catch(e){return false;}
        case 'format':      return this.javaFormat(obj, args);
        default: return null;
      }
    }

    /* Array methods */
    if (Array.isArray(obj)) {
      if (method === 'clone')   return [...obj];
      if (method === 'length')  return obj.length;
      return null;
    }

    /* ArrayList/LinkedList */
    if (obj && obj._list) {
      if (typeof obj[method] === 'function') return obj[method](...args);
      return null;
    }
    /* HashMap/TreeMap */
    if (obj && obj._map) {
      if (typeof obj[method] === 'function') return obj[method](...args);
      return null;
    }
    /* HashSet/TreeSet */
    if (obj && obj._set) {
      if (typeof obj[method] === 'function') return obj[method](...args);
      return null;
    }
    /* StringBuilder */
    if (obj && obj._sb) {
      if (typeof obj[method] === 'function') return obj[method](...args);
      if (method === 'toString') return obj.value;
      return obj;
    }

    /* user-defined object method */
    if (obj && obj._class) {
      const cls = this.classes[obj._class];
      if (cls && cls.methods[method]) {
        return this.invokeMethod(cls, method, args, env, obj);
      }
    }

    /* out / err as properties of System */
    if (method === 'out' || method === 'err') return { _out:true, _isPrintStream:true };
    if (method === 'exit') { this.output.push('[Program exited with code ' + (args[0]??0) + ']'); return null; }
    if (method === 'currentTimeMillis') return Date.now();
    if (method === 'nanoTime') return Date.now() * 1e6;
    if (method === 'arraycopy') { /* System.arraycopy */ return null; }

    /* toString fallback */
    if (method === 'toString') return this.javaToString(obj, env);
    if (method === 'hashCode') return Math.floor(Math.random()*9999);
    if (method === 'equals')   return obj === args[0];

    return null;
  }

  invokeMethod(cls, methodName, args, callerEnv, thisObj) {
    const method = cls.methods[methodName];
    if (!method || !method.body) return null;
    const env = new Environment(callerEnv);
    if (thisObj) env.set('this', thisObj);
    method.params.forEach((p,i) => env.set(p.name, args[i] ?? null));
    /* copy static fields into env */
    Object.entries(cls.fields||{}).forEach(([k,f]) => {
      if (!env.has(k)) env.set(k, f.value ? this.evalExpr(f.value, callerEnv) : this.defaultVal(f.type));
    });
    this.callStack++;
    const result = this.execBlock(method.body, env);
    this.callStack--;
    return result?.value ?? null;
  }

  javaToString(val, env) {
    if (val === null || val === undefined) return 'null';
    if (val === true) return 'true';
    if (val === false) return 'false';
    if (val && val._sb) return val.value;
    if (val && val._list) return '[' + val.data.join(', ') + ']';
    if (val && val._map) return JSON.stringify(val.data);
    if (val && val._set) return '[' + [...val.data].join(', ') + ']';
    if (Array.isArray(val)) return '[' + val.join(', ') + ']';
    if (val && val._javaSystem) return 'java.lang.System';
    if (typeof val === 'number') {
      if (Number.isInteger(val)) return String(val);
      return parseFloat(val.toFixed(10)).toString();
    }
    if (typeof val === 'object' && val._class) return val._class + '@' + Math.floor(Math.random()*0xffff).toString(16);
    return String(val);
  }

  /* printf / String.format */
  javaFormat(fmt, args) {
    let result = String(fmt);
    let i = 0;
    result = result.replace(/%([+-]?\d*\.?\d*)([dscfboxX%n])/g, (match, spec, type) => {
      if (type === '%') return '%';
      if (type === 'n') return '\n';
      const val = args[i++];
      const width = parseInt(spec) || 0;
      const prec  = spec.includes('.') ? parseInt(spec.split('.')[1]) : -1;
      let out = '';
      switch(type) {
        case 'd': out = String(Math.floor(Number(val))); break;
        case 'f': out = prec >= 0 ? Number(val).toFixed(prec) : Number(val).toFixed(6); break;
        case 's': out = this.javaToString(val); break;
        case 'c': out = typeof val === 'string' ? val[0] : String.fromCharCode(Number(val)); break;
        case 'b': out = String(Boolean(val)); break;
        case 'o': out = (Number(val)>>>0).toString(8); break;
        case 'x': out = (Number(val)>>>0).toString(16); break;
        case 'X': out = (Number(val)>>>0).toString(16).toUpperCase(); break;
        default:  out = match;
      }
      if (width > 0) out = out.padStart(width);
      if (width < 0) out = out.padEnd(-width);
      return out;
    });
    return result.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  }

  defaultVal(type) {
    switch(type) {
      case 'int': case 'long': case 'short': case 'byte': return 0;
      case 'double': case 'float': return 0.0;
      case 'boolean': return false;
      case 'char': return '\0';
      case 'String': return null;
      default: return null;
    }
  }
}

/* ════════════════════════════════════════════════════════════
   ENVIRONMENT  (scoped variable store)
   ════════════════════════════════════════════════════════════ */
class Environment {
  constructor(parent) {
    this.parent = parent;
    this.vars   = {};
  }
  set(name, val) { this.vars[name] = val; }
  has(name)      { return name in this.vars || (this.parent?.has(name) ?? false); }
  get(name) {
    if (name in this.vars) return this.vars[name];
    if (this.parent) return this.parent.get(name);
    return undefined;
  }
}

/* ════════════════════════════════════════════════════════════
   MENU SYSTEM
   ════════════════════════════════════════════════════════════ */
function termToggleMenu(name) {
  event && event.stopPropagation();
  const isOpen = TERM.activeMenu === name;
  termCloseMenus();
  if (!isOpen) {
    TERM.activeMenu = name;
    const el = document.getElementById('tmenu-' + name);
    if (el) el.classList.add('active');
  }
}
function termCloseMenus() {
  TERM.activeMenu = null;
  document.querySelectorAll('.term-menu.active').forEach(m => m.classList.remove('active'));
}

/* ════════════════════════════════════════════════════════════
   EDIT HELPERS
   ════════════════════════════════════════════════════════════ */
function termCopy() {
  termCloseMenus();
  const out = document.getElementById('termOutput');
  if (!out) return;
  const sel = window.getSelection();
  if (sel && sel.toString()) {
    navigator.clipboard?.writeText(sel.toString());
    if (typeof notify === 'function') notify('Copied to clipboard', 'Terminal');
  }
}
function termPasteToInput() {
  termCloseMenus();
  navigator.clipboard?.readText().then(t => {
    const inp = document.getElementById('termInput');
    if (inp) { inp.value += t; inp.focus(); }
  });
}
function termSelectAll() {
  termCloseMenus();
  const out = document.getElementById('termOutput');
  if (!out) return;
  const range = document.createRange();
  range.selectNodeContents(out);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}
function termChangeFontSize(delta) {
  termCloseMenus();
  const body = document.getElementById('termBody');
  if (!body) return;
  const cur = parseInt(getComputedStyle(body).fontSize) || 14;
  const next = delta === 0 ? 14 : Math.max(8, Math.min(24, cur + delta));
  body.style.fontSize = next + 'px';
}

/* ════════════════════════════════════════════════════════════
   WINDOW CONTROLS
   ════════════════════════════════════════════════════════════ */
function termClose() {
  const win = document.getElementById('termWindow');
  const tb  = document.getElementById('tbTerminal');
  if (!win) return;
  win.style.animation = 'termMin .2s cubic-bezier(.4,0,1,1) both';
  setTimeout(() => { win.remove(); if(tb) tb.remove(); }, 200);
  document.removeEventListener('click', termCloseMenus);
}
function termMinimise() {
  const win = document.getElementById('termWindow');
  const tb  = document.getElementById('tbTerminal');
  TERM.isMin = true;
  win.classList.add('minimising');
  setTimeout(() => { win.style.display='none'; win.classList.remove('minimising'); if(tb)tb.classList.add('minimised'); }, 220);
}
function termRestore() {
  const win = document.getElementById('termWindow');
  const tb  = document.getElementById('tbTerminal');
  win.style.display = 'flex';
  win.classList.add('restoring');
  setTimeout(() => win.classList.remove('restoring'), 220);
  TERM.isMin = false;
  if(tb) tb.classList.remove('minimised');
  document.getElementById('termInput')?.focus();
}
function termMaximise() {
  const win = document.getElementById('termWindow');
  const btn = document.getElementById('termMaxBtn');
  TERM.isMax = !TERM.isMax;
  win.classList.toggle('maximised', TERM.isMax);
  if(btn) btn.textContent = TERM.isMax ? '\u29C9' : '\u2610';
}
function termToggleFromTaskbar() { if(TERM.isMin) termRestore(); else termMinimise(); }
function termInjectTaskbar() {
  const tbLeft = document.querySelector('.tb-left');
  if (!tbLeft || document.getElementById('tbTerminal')) return;
  const el = document.createElement('div');
  el.id    = 'tbTerminal';
  el.title = 'Command Prompt';
  el.innerHTML = `<img src="icons/terminal.png" onerror="this.style.display='none'" alt="">
                  <span>Command Prompt</span>`;
  el.onclick = termToggleFromTaskbar;
  el.oncontextmenu = e => {
    e.preventDefault(); e.stopPropagation();
    if (typeof showTaskbarAppCtx === 'function') showTaskbarAppCtx(e, 'Command Prompt', false);
  };
  tbLeft.appendChild(el);
}

/* titlebar double-click = maximise */
document.addEventListener('DOMContentLoaded', () => {
  const tb = document.getElementById('termTitleBar');
  if (tb) tb.addEventListener('dblclick', termMaximise);
});

/* ════════════════════════════════════════════════════════════
   DRAG
   ════════════════════════════════════════════════════════════ */
function termSetupDrag() {
  const tb = document.getElementById('termTitleBar');
  if (!tb) return;
  tb.addEventListener('mousedown', e => {
    if (e.target.closest('.term-controls') || TERM.isMax) return;
    TERM.drag.on = true;
    const win = document.getElementById('termWindow');
    const r   = win.getBoundingClientRect();
    TERM.drag.ox = e.clientX - r.left;
    TERM.drag.oy = e.clientY - r.top;
    win.style.transition = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!TERM.drag.on) return;
    const win = document.getElementById('termWindow');
    let x = e.clientX - TERM.drag.ox;
    let y = e.clientY - TERM.drag.oy;
    x = Math.max(-win.offsetWidth+60, Math.min(window.innerWidth-60, x));
    y = Math.max(0, Math.min(window.innerHeight-32, y));
    win.style.left = x+'px'; win.style.top = y+'px';
  });
  document.addEventListener('mouseup', () => { TERM.drag.on = false; });
}

/* ════════════════════════════════════════════════════════════
   RESIZE
   ════════════════════════════════════════════════════════════ */
function termSetupResize() {
  const h = document.getElementById('termResize');
  if (!h) return;
  h.addEventListener('mousedown', e => {
    if (TERM.isMax) return;
    TERM.resize.on = true;
    const win = document.getElementById('termWindow');
    TERM.resize.sx=e.clientX; TERM.resize.sy=e.clientY;
    TERM.resize.sw=win.offsetWidth; TERM.resize.sh=win.offsetHeight;
    e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('mousemove', e => {
    if (!TERM.resize.on) return;
    const win = document.getElementById('termWindow');
    win.style.width  = Math.max(400, TERM.resize.sw+(e.clientX-TERM.resize.sx))+'px';
    win.style.height = Math.max(260, TERM.resize.sh+(e.clientY-TERM.resize.sy))+'px';
  });
  document.addEventListener('mouseup', () => { TERM.resize.on = false; });
}

/* ════════════════════════════════════════════════════════════
   CONTEXT MENUS
   ════════════════════════════════════════════════════════════ */
function termBuildContextMenus() {
  /* terminal body right-click */
  if (!document.getElementById('termCtx')) {
    const menu = document.createElement('div');
    menu.id = 'termCtx';
    menu.innerHTML = `
      <div class="term-ctx-item" onclick="termCopy()"><span class="term-ctx-icon">&#x2398;</span>Copy</div>
      <div class="term-ctx-item" onclick="termPasteToInput()"><span class="term-ctx-icon">&#x1F4CB;</span>Paste</div>
      <div class="term-ctx-sep"></div>
      <div class="term-ctx-item" onclick="termSelectAll()"><span class="term-ctx-icon">&#x2630;</span>Select All</div>
      <div class="term-ctx-sep"></div>
      <div class="term-ctx-item" onclick="termRunCmd('cls')"><span class="term-ctx-icon">&#x2205;</span>Clear</div>
      <div class="term-ctx-sep"></div>
      <div class="term-ctx-item" onclick="termClose()"><span class="term-ctx-icon">&#x2715;</span>Close</div>`;
    document.body.appendChild(menu);
  }

  /* desktop icon right-click — injected into index.html via JS */
  const body = document.getElementById('termBody');
  if (body) {
    body.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      termOpenCtx('termCtx', e.clientX, e.clientY);
    });
  }

  /* title bar right-click */
  if (!document.getElementById('termTitleCtx')) {
    const menu = document.createElement('div');
    menu.id = 'termTitleCtx';
    menu.className = 'np-ctx'; /* reuse notepad ctx styles — same look */
    menu.innerHTML = `
      <div class="np-ctx-item" id="termTcRestore" onclick="termTcRestore()">Restore</div>
      <div class="np-ctx-item" onclick="termMinimise();termHideAllCtx()">Minimise</div>
      <div class="np-ctx-item" id="termTcMax" onclick="termTcMax()">Maximise</div>
      <div class="np-ctx-sep"></div>
      <div class="np-ctx-item" onclick="termHideAllCtx();termClose()">Close<span class="np-ctx-shortcut">Alt+F4</span></div>`;
    document.body.appendChild(menu);
  }

  const titleBar = document.getElementById('termTitleBar');
  if (titleBar) {
    titleBar.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      const rEl = document.getElementById('termTcRestore');
      const mEl = document.getElementById('termTcMax');
      if(rEl) rEl.classList.toggle('disabled', !TERM.isMax);
      if(mEl) mEl.classList.toggle('disabled', TERM.isMax);
      termOpenCtx('termTitleCtx', e.clientX, e.clientY);
    });
  }
}

let _termActiveCtx = null;
function termOpenCtx(id, x, y) {
  termHideAllCtx();
  const menu = document.getElementById(id);
  if (!menu) return;
  menu.classList.add('open');
  menu.style.left = x+'px'; menu.style.top = y+'px';
  _termActiveCtx = id;
  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right  > window.innerWidth)  menu.style.left = (x-r.width)+'px';
    if (r.bottom > window.innerHeight) menu.style.top  = (y-r.height)+'px';
  });
}
function termHideAllCtx() {
  ['termCtx','termTitleCtx'].forEach(id => {
    const m = document.getElementById(id);
    if (m) m.classList.remove('open');
  });
  _termActiveCtx = null;
}
function termTcRestore() { termHideAllCtx(); if(TERM.isMax) termMaximise(); }
function termTcMax()     { termHideAllCtx(); if(!TERM.isMax) termMaximise(); }
document.addEventListener('click', () => termHideAllCtx());
 