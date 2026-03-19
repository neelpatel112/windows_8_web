// Windows 8 Web OS - Main JavaScript

// State management
let isStartScreenOpen = false;
let currentTime = new Date();
let notificationTimeout = null;

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    setInterval(updateTime, 1000);
    setupEventListeners();
    showNotification('Welcome to Windows 8 Web OS');
});

// Setup event listeners
function setupEventListeners() {
    // Click outside to close start screen
    document.addEventListener('click', function(event) {
        const startScreen = document.getElementById('startScreen');
        const startButton = document.getElementById('startButton');
        
        if (isStartScreenOpen && 
            !startScreen.contains(event.target) && 
            !startButton.contains(event.target)) {
            toggleStartScreen();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && isStartScreenOpen) {
            toggleStartScreen();
        }
    });
}

// Update time and date
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
    });
    const dateString = now.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
    });
    
    document.getElementById('currentTime').textContent = timeString;
    document.getElementById('currentDate').textContent = dateString;
}

// Toggle start screen with animation
function toggleStartScreen() {
    const startScreen = document.getElementById('startScreen');
    const startButton = document.querySelector('.start-button i');
    
    isStartScreenOpen = !isStartScreenOpen;
    
    if (isStartScreenOpen) {
        startScreen.classList.add('active');
        startButton.style.transform = 'rotate(10deg)';
        
        // Animate tiles with delay
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach((tile, index) => {
            tile.style.animation = `tileAppear 0.5s ease-out ${index * 0.03}s forwards`;
            tile.style.opacity = '0';
        });
    } else {
        startScreen.classList.remove('active');
        startButton.style.transform = 'rotate(0deg)';
    }
}

// Open app with Windows 8 style animation
function openApp(appName) {
    const tile = event.currentTarget;
    tile.classList.add('opening');
    
    showNotification(`Opening ${appName}...`);
    
    setTimeout(() => {
        tile.classList.remove('opening');
        
        // Simulate app opening
        switch(appName) {
            case 'ie':
                window.open('https://www.bing.com', '_blank');
                break;
            case 'store':
                showNotification('Windows Store is not available in this demo');
                break;
            case 'mail':
                showNotification('Mail app demo - Check back later');
                break;
            default:
                showNotification(`${appName} app demo`);
        }
        
        // Close start screen after opening app
        if (isStartScreenOpen) {
            toggleStartScreen();
        }
    }, 300);
}

// Show notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    
    notificationMessage.textContent = message;
    notification.classList.add('show');
    
    notificationTimeout = setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Focus on app in taskbar
function focusApp(appName) {
    showNotification(`Switched to ${appName}`);
    
    // Highlight active app
    const taskbarApps = document.querySelectorAll('.taskbar-app');
    taskbarApps.forEach(app => app.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// Show shutdown dialog
function showShutdown() {
    document.getElementById('shutdownDialog').classList.add('active');
    if (isStartScreenOpen) {
        toggleStartScreen();
    }
}

// Hide shutdown dialog
function hideShutdown() {
    document.getElementById('shutdownDialog').classList.remove('active');
}

// Shutdown actions
function shutdown(action) {
    showNotification(`${action}...`);
    hideShutdown();
    
    switch(action) {
        case 'shutdown':
            setTimeout(() => {
                document.body.style.background = '#000';
                document.querySelector('.desktop').innerHTML = '<div style="color:white; text-align:center; margin-top:50vh;">Windows is shutting down...</div>';
            }, 1000);
            break;
        case 'restart':
            setTimeout(() => {
                location.reload();
            }, 1500);
            break;
        case 'sleep':
            document.body.style.filter = 'brightness(0.5)';
            setTimeout(() => {
                document.body.style.filter = 'brightness(1)';
            }, 3000);
            break;
    }
}

// Double-click desktop icons
function openAppFromDesktop(appName) {
    showNotification(`Opening ${appName} from desktop`);
    
    // If it's Internet Explorer, open Bing
    if (appName === 'ie') {
        window.open('https://www.bing.com', '_blank');
    }
}

// Touch support for mobile
document.addEventListener('touchstart', function(event) {
    // Prevent zoom on double tap
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}, { passive: false });

// Swipe down to open start screen (mobile)
let touchStartY = 0;
document.addEventListener('touchstart', function(event) {
    touchStartY = event.touches[0].clientY;
});

document.addEventListener('touchmove', function(event) {
    if (!isStartScreenOpen && event.touches[0].clientY - touchStartY > 100) {
        toggleStartScreen();
    }
});

// Make it feel more like Windows 8
function simulateWindows8Sounds() {
    // This is just for nostalgia - sounds are muted in browsers
    console.log('Windows 8 startup sound would play here');
}

// Handle window resize
window.addEventListener('resize', function() {
    // Adjust UI for different screen sizes
    const width = window.innerWidth;
    const tilesContainer = document.querySelector('.tiles-container');
    
    if (width < 768) {
        tilesContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
    } else {
        tilesContainer.style.gridTemplateColumns = 'repeat(6, 1fr)';
    }
}); 
