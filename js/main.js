// Windows 8 Web OS - Main JavaScript

// State management
let isStartScreenOpen = false;
let currentTime = new Date();
let notificationTimeout = null;

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Windows 8 Web OS loaded!');
    updateTime();
    setInterval(updateTime, 1000);
    setupEventListeners();
    showNotification('Welcome to Windows 8 Web OS');
});

// Setup event listeners
function setupEventListeners() {
    // Get the start button
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', function(event) {
            event.stopPropagation();
            toggleStartScreen();
        });
    }
    
    // Click outside to close start screen
    document.addEventListener('click', function(event) {
        const startScreen = document.getElementById('startScreen');
        const startButton = document.getElementById('startButton');
        
        if (isStartScreenOpen && 
            startScreen && 
            !startScreen.contains(event.target) && 
            startButton && 
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
    
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');
    
    if (timeElement) timeElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
}

// Toggle start screen with animation
function toggleStartScreen() {
    const startScreen = document.getElementById('startScreen');
    const startButton = document.querySelector('.start-button i');
    
    if (!startScreen) return;
    
    isStartScreenOpen = !isStartScreenOpen;
    
    if (isStartScreenOpen) {
        startScreen.classList.add('active');
        if (startButton) {
            startButton.style.transform = 'rotate(10deg)';
            startButton.style.transition = 'transform 0.3s ease';
        }
        
        // Animate tiles with delay for that live tile feel
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach((tile, index) => {
            tile.style.animation = 'none';
            tile.offsetHeight; // Trigger reflow
            tile.style.animation = `tileAppear 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.03}s forwards`;
            tile.style.opacity = '0';
        });
        
        showNotification('Start screen opened');
    } else {
        startScreen.classList.remove('active');
        if (startButton) {
            startButton.style.transform = 'rotate(0deg)';
        }
    }
}

// Update the openApp function to handle photos
function openApp(appName) {
    // Get the clicked element
    const tile = event.currentTarget;
    if (!tile) return;
    
    tile.classList.add('opening');
    
    showNotification(`Opening ${appName}...`);
    
    setTimeout(() => {
        tile.classList.remove('opening');
        
        // Handle different apps
        switch(appName) {
            case 'ie':
            case 'Internet Explorer':
                window.open('https://www.bing.com', '_blank');
                break;
            case 'photos':
                // Open photos app in new window
                window.location.href = 'photos.html';
                break;
            case 'store':
                showNotification('📱 Windows Store - Coming soon to web!');
                break;
            case 'mail':
                showNotification('📧 Mail app - Check your inbox');
                break;
            case 'weather':
                showNotification('☀️ Weather: 72° and sunny');
                break;
            case 'music':
                showNotification('🎵 Now Playing: Windows 8 Nostalgia Mix');
                break;
            case 'games':
                showNotification('🎮 Loading games...');
                break;
            case 'settings':
                showNotification('⚙️ Windows Settings');
                break;
            default:
                showNotification(`${appName} app opening...`);
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
    
    if (!notification || !notificationMessage) return;
    
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
    
    // Add active class to clicked app
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// Show shutdown dialog
function showShutdown() {
    const dialog = document.getElementById('shutdownDialog');
    if (dialog) {
        dialog.classList.add('active');
        if (isStartScreenOpen) {
            toggleStartScreen();
        }
    }
}

// Hide shutdown dialog
function hideShutdown() {
    const dialog = document.getElementById('shutdownDialog');
    if (dialog) {
        dialog.classList.remove('active');
    }
}

// Shutdown actions
function shutdown(action) {
    showNotification(`${action}...`);
    hideShutdown();
    
    switch(action) {
        case 'shutdown':
            setTimeout(() => {
                document.body.style.background = '#000';
                document.body.innerHTML = '<div style="color:white; text-align:center; margin-top:50vh; font-family: \'Segoe UI\';"><i class="fas fa-power-off" style="font-size: 48px; margin-bottom: 20px;"></i><br>Windows is shutting down...</div>';
            }, 1000);
            break;
        case 'restart':
            setTimeout(() => {
                location.reload();
            }, 1500);
            break;
        case 'sleep':
            document.body.style.filter = 'brightness(0.5)';
            showNotification('💤 Going to sleep... tap to wake');
            setTimeout(() => {
                document.body.style.filter = 'brightness(1)';
            }, 3000);
            break;
    }
}

// Double-click desktop icons
function openApp(appName) {
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

// Add live tile effect (optional - makes tiles pulse slightly)
function addLiveTileEffect() {
    const tiles = document.querySelectorAll('.tile:not(.tile-small)');
    tiles.forEach((tile, index) => {
        setInterval(() => {
            if (Math.random() > 0.7) { // 30% chance every interval
                tile.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    tile.style.transform = 'scale(1)';
                }, 200);
            }
        }, 3000 + (index * 500)); // Stagger the intervals
    });
}

// Call this after start screen opens
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addLiveTileEffect, 2000);
});

// Handle window resize
window.addEventListener('resize', function() {
    // Adjust UI for different screen sizes
    const width = window.innerWidth;
    const tilesContainer = document.querySelector('.tiles-container');
    
    if (tilesContainer) {
        if (width < 768) {
            tilesContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
        } else {
            tilesContainer.style.gridTemplateColumns = 'repeat(6, 1fr)';
        }
    }
});