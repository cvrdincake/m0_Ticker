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
    });

    ws.on('ticker_state_change', (tickerState) => {
        updateTicker(tickerState);
    });

    ws.on('popup_state_change', (popupState) => {
        updatePopup(popupState);
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

    console.log('Professional Output Controller Ready.');
});
