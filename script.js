// Global variables
let options = [];
let selectedResult = '';
let deferredPrompt;

// Initialize app when page loads
window.onload = function() {
    loadSavedData();
    setupEventListeners();
    updateDisplay();
    initializePWA();
};

// Load saved data from localStorage
function loadSavedData() {
    const saved = localStorage.getItem('decisionJarOptions');
    if (saved) {
        try {
            options = JSON.parse(saved);
        } catch (error) {
            console.error('Error loading saved data:', error);
            options = [];
        }
    }
}

// Save data to localStorage
function saveData() {
    try {
        localStorage.setItem('decisionJarOptions', JSON.stringify(options));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Enter key support for input
    document.getElementById('optionInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addOption();
        }
    });

    // PWA install prompt handling
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        document.getElementById('installPrompt').style.display = 'block';
    });
}

// Add new option
function addOption() {
    const input = document.getElementById('optionInput');
    const text = input.value.trim();
    
    if (text && !options.includes(text)) {
        options.push(text);
        input.value = '';
        saveData();
        updateDisplay();
        
        // Provide haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    } else if (options.includes(text)) {
        // Shake input if duplicate
        input.style.animation = 'shake 0.3s';
        setTimeout(() => {
            input.style.animation = '';
        }, 300);
    }
}

// Remove option by index
function removeOption(index) {
    if (index >= 0 && index < options.length) {
        options.splice(index, 1);
        saveData();
        updateDisplay();
        
        // Provide haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Hide result if no options left
        if (options.length === 0) {
            document.getElementById('resultCard').style.display = 'none';
        }
    }
}

// Clear all options
function clearAll() {
    if (confirm('Are you sure you want to clear all options?')) {
        options = [];
        saveData();
        updateDisplay();
        document.getElementById('resultCard').style.display = 'none';
        
        // Provide haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }
    }
}

// Update the display with current options
function updateDisplay() {
    updateOptionsList();
    updateCountersAndButtons();
    updateJarDisplay();
}

// Update the options list in the DOM
function updateOptionsList() {
    const optionsList = document.getElementById('optionsList');
    optionsList.innerHTML = '';
    
    options.forEach((option, index) => {
        const div = document.createElement('div');
        div.className = 'option-item';
        div.innerHTML = `
            <span class="option-text">${escapeHtml(option)}</span>
            <button class="remove-btn" onclick="removeOption(${index})" title="Remove option">×</button>
        `;
        optionsList.appendChild(div);
    });
}

// Update counters and button states
function updateCountersAndButtons() {
    const optionCount = document.getElementById('optionCount');
    const pickBtn = document.getElementById('pickBtn');
    const emptyState = document.getElementById('emptyState');
    const clearAllBtn = document.getElementById('clearAllBtn');

    // Update option count
    optionCount.textContent = `${options.length} option${options.length !== 1 ? 's' : ''}`;
    
    // Update button states
    pickBtn.disabled = options.length === 0;
    emptyState.style.display = options.length === 0 ? 'block' : 'none';
    clearAllBtn.style.display = options.length > 0 ? 'block' : 'none';
}

// Update jar display
function updateJarDisplay() {
    const jarText = document.getElementById('jarText');
    jarText.textContent = options.length > 0 ? `${options.length} options` : 'Empty';
}

// Pick a random option
function pickOption() {
    if (options.length === 0) return;

    const jar = document.getElementById('jar');
    const resultCard = document.getElementById('resultCard');
    const resultText = document.getElementById('resultText');
    const pickBtn = document.getElementById('pickBtn');

    // Start the selection process
    startSelectionAnimation(jar, pickBtn);
    
    // Provide haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
    }

    // Wait for animation, then show result
    setTimeout(() => {
        const result = selectRandomOption();
        showResult(jar, resultCard, resultText, pickBtn, result);
    }, 1500);
}

// Start the selection animation
function startSelectionAnimation(jar, pickBtn) {
    jar.classList.add('shaking');
    pickBtn.textContent = '🎲 Deciding...';
    pickBtn.disabled = true;
}

// Select a random option from the array
function selectRandomOption() {
    const randomIndex = Math.floor(Math.random() * options.length);
    return options[randomIndex];
}

// Show the selection result
function showResult(jar, resultCard, resultText, pickBtn, result) {
    selectedResult = result;
    
    // Stop animation
    jar.classList.remove('shaking');
    
    // Show result
    resultText.textContent = result;
    resultCard.style.display = 'block';
    
    // Reset button
    pickBtn.textContent = '🎲 Pick for Me!';
    pickBtn.disabled = false;

    // Announce result
    announceResult(result);
    
    // Success haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }
}

// Announce the result using speech synthesis
function announceResult(result) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(result);
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        speechSynthesis.speak(utterance);
    }
}

// Share the result
function shareResult() {
    if (!selectedResult) return;
    
    const text = `The Decision Jar chose: ${selectedResult} 🎯`;
    const title = 'Decision Jar Result';
    
    if (navigator.share) {
        // Use native sharing if available
        navigator.share({
            title: title,
            text: text,
            url: window.location.href
        }).catch(error => {
            console.error('Error sharing:', error);
            fallbackShare(text);
        });
    } else {
        fallbackShare(text);
    }
}

// Fallback sharing method
function fallbackShare(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Result copied to clipboard! 📋');
        }).catch(() => {
            legacyCopyToClipboard(text);
        });
    } else {
        legacyCopyToClipboard(text);
    }
}

// Legacy clipboard copy method
function legacyCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('Result copied! 📋');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Unable to copy result');
    }
    
    document.body.removeChild(textArea);
}

// Show toast message
function showToast(message) {
    // Simple alert for now - could be enhanced with a proper toast
    alert(message);
}

// Install PWA
function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                document.getElementById('installPrompt').style.display = 'none';
                showToast('App installed successfully! 🎉');
            }
            deferredPrompt = null;
        });
    }
}

// Initialize PWA features
function initializePWA() {
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
        // Simple service worker for caching
        const swCode = `
            const CACHE_NAME = 'decision-jar-v1';
            const urlsToCache = [
                '/',
                '/index.html',
                '/styles.css',
                '/script.js'
            ];
            
            self.addEventListener('install', (event) => {
                event.waitUntil(
                    caches.open(CACHE_NAME)
                        .then((cache) => cache.addAll(urlsToCache))
                );
            });
            
            self.addEventListener('fetch', (event) => {
                event.respondWith(
                    caches.match(event.request)
                        .then((response) => response || fetch(event.request))
                );
            });
        `;
        
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        navigator.serviceWorker.register(swUrl)
            .then(() => console.log('Service Worker registered'))
            .catch(error => console.log('Service Worker registration failed:', error));
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add CSS animation for input shake
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);
