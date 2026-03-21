<div align="center">

<img src="logo.png" alt="Windows 8 Web Logo" width="80" />

# Windows 8 Web

**A pixel-perfect, fully interactive replica of Windows 8 — running entirely in the browser.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-windows8web.vercel.app-0078d7?style=for-the-badge&logo=vercel&logoColor=white)](https://windows8web.vercel.app/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br/>

<img src="https://windows8web.vercel.app/67.jpg" alt="Windows 8 Web Screenshot" width="780" style="border-radius:4px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);" />

<br/><br/>

*No frameworks. No libraries. No build tools. Pure HTML, CSS, and JavaScript.*

</div>

---

## ✨ Overview

**Windows 8 Web** is a browser-based recreation of the Microsoft Windows 8 operating system experience. It faithfully reproduces the look, feel, and interaction patterns of Windows 8 — from the animated boot screen and cinematic lock screen unlock, all the way to the Metro Start Screen with live tile flips, a fully functional system tray, and real working apps like **This PC** with a virtual file system.

The entire project is built with **zero dependencies** — no React, no Vue, no bundler, no framework. Just raw, handcrafted HTML, CSS, and vanilla JavaScript.

---

## 🚀 Live Demo

> **[https://windows8web.vercel.app/](https://windows8web.vercel.app/)**

Open it in your browser. It works on desktop and mobile.

---

## 🎬 Features

### 🖥️ Boot Screen
- Authentic Windows logo (`logo.png`) fades and scales in on a pure black background
- **8-dot circular spinner** — each dot pulses in sequence, matching the exact Windows 8 boot animation
- Smooth 2.3-second boot sequence before transitioning to the lock screen

### 🔒 Lock Screen
- Custom wallpaper (`67.jpg`) with a dark gradient overlay for readability
- **Live clock and date** update every second
- **Two-stage cinematic unlock** — a subtle 18px nudge upward on first click (responsiveness feedback), followed by a slow 900ms slide-up reveal
- Battery and Wi-Fi status icons in the bottom-right corner

### 🖼️ Desktop
- Wallpaper background with radial vignette
- **Desktop icons** — This PC, Documents, Recycle Bin, Internet Explorer, Notepad
- Double-click any icon to open its app
- Clean icon layout with hover highlight states

### 🪟 Start Screen
- Opens with a smooth **slide-up animation** from the taskbar
- **"Start" title** top-left in authentic Windows 8 light-weight font
- **User block** top-right with a **power dropdown** that slides down with `opacity + translateY` animation
- Power dropdown includes: Lock, Sign out, Other user (disabled), Sleep, Shut down, Restart
- **5 tile column groups** — horizontally scrollable, each column **staggers in from the right** with a scale-up animation on open (80ms delay per column)
- **Transparent tile borders** that appear on hover, compress inward on press — matching the original Metro UI feel
- **Wallpaper background** visible behind a dark semi-transparent overlay
- Tile groups: Mail, Calendar, News, People, Finance, Messaging, Desktop, Weather, Store, Internet Explorer, Maps, SkyDrive, Skype, Travel, Bing, Games, Camera, Photos, Music, Video, Settings, OneNote

### 📌 Live Tiles
Six tiles have **live flip animations** — they periodically rotate on the X-axis to reveal live content on the back face:

| Tile | Live Content |
|------|-------------|
| Mail | Unread message count |
| Calendar | Current date and month |
| Weather | Temperature and conditions |
| Music | Now Playing track info |
| News | Breaking headline |
| Bing | Daily photo caption |

### 📋 Taskbar
- **Windows logo button** (`logo.png`) opens/closes the Start Screen
- **Pinned apps** — Internet Explorer, File Explorer, Windows Media Player with running indicators
- **Full system tray** on the right side with working interactive panels:

| Tray Item | Behaviour |
|-----------|-----------|
| 🌐 Language | Dropdown panel — switch input language |
| 📶 Wi-Fi | Network panel — shows connected + nearby networks |
| 🔊 Volume | Slider panel — drag to adjust, live percentage display |
| 🔋 Battery | Hover tooltip only — shows battery percentage |
| 📋 Action Center | Panel — Defender, Windows Update, Mail status |
| 🕐 Clock | Click opens a **full calendar popup** with month navigation, today highlight, live ticking clock |
| ▌ Show Desktop | Sliver button on the far right edge |

### 📅 Calendar Panel
- Full month grid with day-of-week headers
- **Today highlighted in blue** (`#0078d7`)
- Sundays shown in red
- Previous/next month navigation arrows
- **Live ticking clock** displayed below the grid
- Smooth slide-up animation on open, closes on outside click

### 🔊 Volume Panel
- Horizontal range slider with a **live blue fill track** that updates as you drag
- Volume percentage shown in real time

### 🖥️ This PC App
A fully functional File Explorer-style window app:

#### Window System
- **Draggable** — click and drag the title bar to move anywhere on screen
- **Resizable** — drag the bottom-right corner handle to resize
- **Minimise** — smooth shrink-to-taskbar animation; click the taskbar entry to restore
- **Maximise / Restore** — fills the full viewport, button icon toggles between square and clone
- **Close** — removes the window with a fade-out animation
- Window entry appears in the taskbar while open

#### Ribbon Toolbar
- **Computer tab** — New Folder, Open, Rename, Delete, Properties
- **View tab** — Large Icons, List view, Sort by name, Sort by type

#### Navigation
- Back / Forward / Up buttons with full **history stack**
- **Address bar** updates at every navigation step with path breadcrumb and matching icon
- **Live search** — filters items in current folder as you type
- **Sidebar** with Favourites (Desktop, Downloads, This PC) and device shortcuts

#### This PC View
- **4 drive tiles** — Windows (C:), Data (D:), USB Drive (E:), DVD Drive (F:)
- Each drive shows a **storage progress bar** that changes colour by usage:
  - 🔵 Blue — normal (under 60%)
  - 🟡 Yellow — moderate (60–85%)
  - 🔴 Red — critical (above 85%)
- Free space and total capacity displayed below each drive name
- **6 system folder shortcuts** — Desktop, Documents, Downloads, Music, Pictures, Videos

#### File System
- **Virtual file system** — pre-populated with realistic folders and files in every location
- **New Folder** — creates a folder with the name input already selected; duplicate names auto-increment (New Folder, New Folder (1)…)
- **Rename** — double-click name area or press F2; confirm with Enter, cancel with Escape
- **Delete** — Delete key or ribbon button removes selected item
- **Right-click context menu** — New folder, Open, Rename, Delete, Properties
- **Keyboard shortcuts** — F2 (rename), Delete (delete), Backspace (navigate back)

### 🔮 Charms Bar
- Slide in from the **right screen edge** on mouse hover
- Search, Share, Start, Devices, Settings charms
- Live clock displayed at the bottom of the bar

### 🔌 Shutdown
- Triggered from power dropdown in Start Screen
- Full overlay with Sleep, Shut down, Restart options
- Shut down plays a fade-to-black animation with Windows logo

---

## 📁 Project Structure

```
windows8-web/
│
├── index.html          # Main entry point — all screens & UI scaffolding
├── style.css           # Core styles — boot, lock, desktop, start, taskbar, tray panels
├── main.js             # Core logic — boot, lock, clock, start screen, tray, shutdown
│
├── thispc.css          # This PC app — window, ribbon, drives, file grid, context menu
├── thispc.js           # This PC app — virtual FS, navigation, CRUD, drag, resize
│
├── logo.png            # Windows logo — used on boot screen and taskbar start button
├── 67.jpg              # Desktop & lock screen wallpaper
│
└── icons/
    ├── computer.png        # This PC desktop icon
    ├── folder.png          # Documents / generic folder
    ├── recycle.png         # Recycle Bin
    ├── ie.png              # Internet Explorer
    ├── notepad.png         # Notepad
    ├── explorer.png        # File Explorer (taskbar)
    ├── mediaplayer.png     # Windows Media Player (taskbar)
    │
    ├── mail.png            # Mail tile
    ├── calendar.png        # Calendar tile
    ├── news.png            # News tile
    ├── people.png          # People tile
    ├── finance.png         # Finance tile
    ├── messaging.png       # Messaging tile
    ├── weather.png         # Weather tile
    ├── store.png           # Store tile
    ├── maps.png            # Maps tile
    ├── skydrive.png        # SkyDrive tile
    ├── skype.png           # Skype tile
    ├── travel.png          # Travel tile
    ├── bing.png            # Bing tile
    ├── games.png           # Games tile
    ├── camera.png          # Camera tile
    ├── photos.png          # Photos tile
    ├── music.png           # Music tile
    ├── video.png           # Video tile
    ├── settings.png        # Settings tile
    ├── onenote.png         # OneNote tile
    │
    ├── tray-wifi.png       # System tray — Wi-Fi
    ├── tray-volume.png     # System tray — Volume / Speaker
    ├── tray-battery.png    # System tray — Battery
    ├── tray-action.png     # System tray — Action Center
    ├── tray-language.png   # System tray — Language / Input
    │
    ├── drive-system.png    # This PC — C: Windows system drive
    ├── drive-hdd.png       # This PC — D: Hard disk drive
    ├── drive-usb.png       # This PC — E: USB flash drive
    ├── drive-dvd.png       # This PC — F: DVD/optical drive
    │
    ├── file-text.png       # .txt file type icon
    ├── file-image.png      # .jpg / .png file type icon
    ├── file-word.png       # .docx file type icon
    ├── file-excel.png      # .xlsx file type icon
    ├── file-exe.png        # .exe file type icon
    ├── file-audio.png      # .mp3 file type icon
    ├── file-video.png      # .mp4 file type icon
    ├── file-zip.png        # .zip file type icon
    └── file-sys.png        # .sys file type icon
```

---

## 🛠️ Getting Started

### Option 1 — Open directly in browser

No build step needed. Just clone the repo and open `index.html`:

```bash
git clone https://github.com/yourusername/windows8-web.git
cd windows8-web
# Open index.html in your browser
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

### Option 2 — Serve locally (recommended)

To avoid any CORS issues with local assets, serve it with a simple HTTP server:

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code — use the Live Server extension
```

Then open `http://localhost:8080` in your browser.

### Option 3 — Deploy to Vercel

```bash
npm i -g vercel
vercel
```

---

## 🎮 How to Use

| Action | What happens |
|--------|-------------|
| **Click** the lock screen | Cinematic slide-up unlock |
| **Double-click** a desktop icon | Opens the app |
| **Click** the Windows logo | Opens / closes Start Screen |
| **Scroll** the Start Screen | Horizontal tile scrolling |
| **Click** a tile | Opens that app |
| **Hover** right screen edge | Charms bar slides in |
| **Click** clock in taskbar | Opens calendar popup |
| **Click** volume icon | Opens volume slider |
| **Click** Wi-Fi icon | Opens network panel |
| **Hover** battery icon | Shows battery tooltip |
| **Click** Action Center | Opens notification panel |
| **Double-click** This PC | Opens the file explorer window |
| **Drag** window titlebar | Move the window anywhere |
| **Drag** bottom-right corner | Resize the window |
| **Press F2** | Rename selected file/folder |
| **Press Delete** | Delete selected item |
| **Press Backspace** | Navigate back in This PC |
| **Press Escape** | Close Start Screen / panels |

---

## 🏗️ Architecture

The project follows a **per-feature file pattern** — each major feature has its own dedicated CSS and JS file, keeping the codebase clean and easy to extend.

```
Feature           CSS file        JS file
─────────────────────────────────────────
Core UI           style.css       main.js
This PC app       thispc.css      thispc.js
(next app)        nextapp.css     nextapp.js
```

### Key design decisions

**No CSS variables for layout-critical sizes** — tile sizes are calculated in JavaScript from the actual measured `clientHeight` of the metro area and stamped as real pixel values. This guarantees tiles never overflow or leave gaps on any screen size.

**`visibility: hidden` for inactive overlays** — the Start Screen uses `visibility: hidden` + `pointer-events: none` when closed (with a transition delay matching the slide-out duration). This fully prevents off-screen elements from bleeding through on mobile browsers.

**Virtual file system as plain objects** — the This PC file system is a simple JavaScript object (`FS`) mapping location names to arrays of items. No localStorage, no IndexedDB — keeping the app stateless and deployable anywhere.

---

## 🗺️ Roadmap

Planned apps and features for future updates:

- [ ] **Notepad** — text editor with File menu (New, Open, Save), font settings
- [ ] **Internet Explorer** — embedded browser frame with address bar and tabs
- [ ] **Photos** — image gallery viewer with slideshow mode
- [ ] **Settings** — Personalization, Display, Accounts panels
- [ ] **Recycle Bin** — collects deleted files from This PC, restore functionality
- [ ] **Calendar App** — full calendar tile app with event creation
- [ ] **Task Manager** — running apps list, close from list
- [ ] **Multiple window stacking** — z-index focus management, click to bring to front
- [ ] **Start Screen search** — live app search across all tiles
- [ ] **Snap layouts** — drag windows to screen edges to snap side-by-side
- [ ] **Touch / swipe gestures** — full mobile swipe support for all interactions

---

## 🤝 Contributing

Contributions are welcome! If you want to add a new app, fix a bug, or improve the styling:

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/notepad-app`
3. Follow the per-feature file pattern — create `yourapp.css` and `yourapp.js`
4. Keep it dependency-free — no npm packages, no frameworks
5. Open a pull request with a clear description of what you added

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

> **Disclaimer:** This is a fan-made educational project. Windows, the Windows logo, and all related trademarks are the property of Microsoft Corporation. This project is not affiliated with, endorsed by, or connected to Microsoft in any way.

---

## 🙏 Acknowledgements

- **[Font Awesome](https://fontawesome.com/)** — Icons used throughout the UI
- **[Google Fonts — Segoe UI](https://fonts.google.com/)** — Typography matching the original Windows 8 system font
- **Microsoft Windows 8** — The original design that inspired every pixel of this project

---

<div align="center">

Made with ❤️ and a whole lot of nostalgia

**[⭐ Star this repo if you like it](https://github.com/yourusername/windows8-web)**

</div>
