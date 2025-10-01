/* global WebSocketClient */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Professional Output Controller Initializing...');

    const ws = new WebSocketClient();

    // --- DOM Element Cache ---
    const elements = {
        // Ticker
        tickerContainer: document.getElementById('ticker-container-pro'),
        tickerTape: document.getElementById('ticker-tape-pro'),

        // Popup
        popupOverlay: document.getElementById('popup-overlay-pro'),
        popupTitle: document.getElementById('popup-title-pro'),
        popupMessage: document.getElementById('popup-message-pro'),

        // BRB
        brbOverlay: document.getElementById('brb-overlay-pro'),
        brbMessage: document.getElementById('brb-message-display-pro'),
    };

    // --- WebSocket Event Handlers ---

    ws.on('connected', () => {
        console.log('Output overlay connected to server.');
        // Request initial state on connection
        ws.send('state_sync_request', {});
    });

    ws.on('state_update', (state) => {
        console.log('Output received state update:', state);
        updateTicker(state.ticker);
        updatePopup(state.popup);
        updateBrb(state.brb);
        updateTheme(state.theme);
    });

    ws.on('ticker_state_change', (tickerState) => {
        updateTicker(tickerState);
    });

    ws.on('popup_state_change', (popupState) => {
        updatePopup(popupState);
    });

    ws.on('brb_state_change', (brbState) => {
        updateBrb(brbState);
    });

    ws.on('theme_change', (themeState) => {
        updateTheme(themeState);
    });


    // --- UI Update Functions ---

    function updateTicker(tickerState) {
        if (!elements.tickerContainer) return;

        if (tickerState.isRunning && tickerState.messages.length > 0) {
            // Create message elements
            elements.tickerTape.innerHTML = '';
            tickerState.messages.forEach(msg => {
                const item = document.createElement('div');
                item.className = 'ticker-item-pro';
                item.textContent = msg;
                elements.tickerTape.appendChild(item);
            });

            // Apply styles
            elements.tickerTape.style.color = tickerState.textColor || '#ffffff';
            
            // Animation speed
            const speed = tickerState.speed || 50; // Default speed if not provided
            const duration = 150 - speed; // Map speed (1-100) to duration
            elements.tickerTape.style.animationDuration = `${duration}s`;

            // Show ticker
            elements.tickerContainer.classList.add('visible-pro');
            elements.tickerTape.style.animationPlayState = 'running';

        } else {
            // Hide ticker
            elements.tickerContainer.classList.remove('visible-pro');
            elements.tickerTape.style.animationPlayState = 'paused';
        }
    }

    function updatePopup(popupState) {
        if (!elements.popupOverlay) return;

        if (popupState.isVisible) {
            elements.popupTitle.textContent = popupState.title || '';
            elements.popupMessage.textContent = popupState.message || '';
            elements.popupOverlay.classList.add('visible-pro');
        } else {
            elements.popupOverlay.classList.remove('visible-pro');
        }
    }

    function updateBrb(brbState) {
        if (!elements.brbOverlay || !brbState) return;

        if (brbState.isVisible) {
            elements.brbMessage.textContent = brbState.message || 'Be Right Back';
            elements.brbOverlay.classList.add('visible-pro');
        } else {
            elements.brbOverlay.classList.remove('visible-pro');
        }
    }

    function updateTheme(themeState) {
        if (!themeState) return;

        // Apply theme changes to CSS variables
        const root = document.documentElement;
        
        if (themeState.accentColor) {
            root.style.setProperty('--accent-primary', themeState.accentColor);
        }
        
        if (themeState.backgroundOpacity !== undefined) {
            const opacity = themeState.backgroundOpacity / 100;
            root.style.setProperty('--background-opacity', opacity);
            
            // Update glass surface opacity
            root.style.setProperty('--glass-surface-1', `rgba(255, 255, 255, ${0.03 * opacity})`);
            root.style.setProperty('--glass-surface-2', `rgba(255, 255, 255, ${0.06 * opacity})`);
            root.style.setProperty('--glass-surface-3', `rgba(255, 255, 255, ${0.09 * opacity})`);
            root.style.setProperty('--glass-surface-4', `rgba(255, 255, 255, ${0.12 * opacity})`);
        }
    }

    console.log('Professional Output Controller Ready.');
});
