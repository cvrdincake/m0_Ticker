/* global WebSocketClient */
// Dashboard Controller - Pro Version
document.addEventListener('DOMContentLoaded', () => {
    console.log('Professional Dashboard Controller Initializing...');

    const ws = new WebSocketClient();

    // --- DOM Element Cache ---
    const elements = {
        // Connection Status
        connectionStatus: document.getElementById('connectionStatus'),
        statusDot: document.getElementById('statusDot'),
        statusText: document.getElementById('statusText'),

        // Ticker Widget
        tickerWidget: document.getElementById('tickerWidget'),
        tickerForm: document.getElementById('tickerForm'),
        tickerMessages: document.getElementById('tickerMessages'),
        tickerSpeed: document.getElementById('tickerSpeed'),
        tickerSpeedValue: document.getElementById('tickerSpeedValue'),
        textColor: document.getElementById('textColor'),
        startTicker: document.getElementById('startTicker'),
        stopTicker: document.getElementById('stopTicker'),
        tickerStatusBadge: document.getElementById('tickerStatusBadge'),
        tickerStatusText: document.getElementById('tickerStatusText'),

        // Popup Widget
        popupWidget: document.getElementById('popupWidget'),
        popupForm: document.getElementById('popupForm'),
        popupTitle: document.getElementById('popupTitle'),
        popupMessage: document.getElementById('popupMessage'),
        showPopup: document.getElementById('showPopup'),
        hidePopup: document.getElementById('hidePopup'),
        popupStatusBadge: document.getElementById('popupStatusBadge'),
        popupStatusText: document.getElementById('popupStatusText'),

        // BRB Widget
        brbWidget: document.getElementById('brbWidget'),
        brbForm: document.getElementById('brbForm'),
        brbMessage: document.getElementById('brbMessage'),
        brbPreview: document.getElementById('brbPreview'),
        showBrb: document.getElementById('showBrb'),
        hideBrb: document.getElementById('hideBrb'),
        brbStatusBadge: document.getElementById('brbStatusBadge'),
        brbStatusText: document.getElementById('brbStatusText'),

        // Theme Widget
        themeWidget: document.getElementById('themeWidget'),
        themeForm: document.getElementById('themeForm'),
        accentColor: document.getElementById('accentColor'),
        backgroundOpacity: document.getElementById('backgroundOpacity'),
        backgroundOpacityValue: document.getElementById('backgroundOpacityValue'),
        applyTheme: document.getElementById('applyTheme'),
        resetTheme: document.getElementById('resetTheme'),
    };

    // --- State Management ---
    let localState = {
        ticker: {
            messages: [],
            speed: 50,
            textColor: '#ffffff',
            isRunning: false,
        },
        popup: {
            title: '',
            message: '',
            isVisible: false,
        },
        brb: {
            message: 'Be Right Back',
            isVisible: false,
        },
        theme: {
            accentColor: '#00ff88',
            backgroundOpacity: 80,
        }
    };

    // --- WebSocket Event Handlers ---

    ws.on('connected', () => {
        updateConnectionStatus(true);
    });

    ws.on('disconnected', () => {
        updateConnectionStatus(false);
    });

    ws.on('state_update', (serverState) => {
        console.log('Received state update from server:', serverState);
        localState = deepMerge(localState, serverState);
        updateUIFromState();
    });
    
    ws.on('ticker_state_change', (tickerState) => {
        localState.ticker.isRunning = tickerState.isRunning;
        updateTickerStatusUI();
    });

    ws.on('popup_state_change', (popupState) => {
        localState.popup.isVisible = popupState.isVisible;
        updatePopupStatusUI();
    });

    ws.on('brb_state_change', (brbState) => {
        localState.brb = { ...localState.brb, ...brbState };
        updateBrbStatusUI();
    });

    ws.on('theme_change', (themeState) => {
        localState.theme = { ...localState.theme, ...themeState };
        updateThemeUI();
    });


    // --- UI Update Functions ---

    function updateConnectionStatus(isConnected) {
        if (isConnected) {
            elements.connectionStatus.classList.add('connected-pro');
            elements.statusDot.classList.add('connected-pro');
            elements.statusText.textContent = 'Connected';
        } else {
            elements.connectionStatus.classList.remove('connected-pro');
            elements.statusDot.classList.remove('connected-pro');
            elements.statusText.textContent = 'Disconnected';
        }
    }

    function updateTickerStatusUI() {
        if (localState.ticker.isRunning) {
            elements.tickerStatusBadge.classList.add('active-pro');
            elements.tickerStatusText.textContent = 'Active';
        } else {
            elements.tickerStatusBadge.classList.remove('active-pro');
            elements.tickerStatusText.textContent = 'Inactive';
        }
    }

    function updatePopupStatusUI() {
        if (localState.popup.isVisible) {
            elements.popupStatusBadge.classList.add('active-pro');
            elements.popupStatusText.textContent = 'Visible';
        } else {
            elements.popupStatusBadge.classList.remove('active-pro');
            elements.popupStatusText.textContent = 'Inactive';
        }
    }

    function updateBrbStatusUI() {
        if (localState.brb.isVisible) {
            elements.brbStatusBadge.classList.add('active-pro');
            elements.brbStatusText.textContent = 'Active';
        } else {
            elements.brbStatusBadge.classList.remove('active-pro');
            elements.brbStatusText.textContent = 'Inactive';
        }
    }

    function updateThemeUI() {
        if (elements.accentColor) {
            elements.accentColor.value = localState.theme.accentColor;
        }
        if (elements.backgroundOpacity) {
            elements.backgroundOpacity.value = localState.theme.backgroundOpacity;
            elements.backgroundOpacityValue.textContent = localState.theme.backgroundOpacity;
        }
    }

    function updateUIFromState() {
        // Ticker
        elements.tickerMessages.value = localState.ticker.messages.join('\n');
        elements.tickerSpeed.value = localState.ticker.speed;
        elements.tickerSpeedValue.textContent = localState.ticker.speed;
        elements.textColor.value = localState.ticker.textColor;
        updateTickerStatusUI();

        // Popup
        elements.popupTitle.value = localState.popup.title;
        elements.popupMessage.value = localState.popup.message;
        updatePopupStatusUI();

        // BRB
        if (elements.brbMessage) {
            elements.brbMessage.value = localState.brb.message;
            elements.brbPreview.textContent = localState.brb.message;
        }
        updateBrbStatusUI();

        // Theme
        updateThemeUI();
    }


    // --- Event Listeners ---

    // Ticker Controls
    elements.startTicker.addEventListener('click', () => {
        const messages = elements.tickerMessages.value.split('\n').filter(m => m.trim() !== '');
        const tickerData = {
            messages: messages,
            speed: parseInt(elements.tickerSpeed.value, 10),
            textColor: elements.textColor.value,
        };
        ws.send('ticker_start', tickerData);
    });

    elements.stopTicker.addEventListener('click', () => {
        ws.send('ticker_stop');
    });

    elements.tickerSpeed.addEventListener('input', (e) => {
        elements.tickerSpeedValue.textContent = e.target.value;
        // Optional: send live speed updates
        // ws.send('ticker_update_speed', { speed: parseInt(e.target.value, 10) });
    });

    // Popup Controls
    elements.showPopup.addEventListener('click', () => {
        const popupData = {
            title: elements.popupTitle.value,
            message: elements.popupMessage.value,
        };
        ws.send('popup_show', popupData);
    });

    elements.hidePopup.addEventListener('click', () => {
        ws.send('popup_hide');
    });

    // BRB Controls
    if (elements.showBrb) {
        elements.showBrb.addEventListener('click', () => {
            const brbData = {
                message: elements.brbMessage.value,
            };
            ws.send('brb_show', brbData);
        });
    }

    if (elements.hideBrb) {
        elements.hideBrb.addEventListener('click', () => {
            ws.send('brb_hide');
        });
    }

    if (elements.brbMessage) {
        elements.brbMessage.addEventListener('input', (e) => {
            elements.brbPreview.textContent = e.target.value;
        });
    }

    // Theme Controls
    if (elements.applyTheme) {
        elements.applyTheme.addEventListener('click', () => {
            const themeData = {
                accentColor: elements.accentColor.value,
                backgroundOpacity: parseInt(elements.backgroundOpacity.value, 10),
            };
            ws.send('theme_change', themeData);
        });
    }

    if (elements.resetTheme) {
        elements.resetTheme.addEventListener('click', () => {
            const defaultTheme = {
                accentColor: '#00ff88',
                backgroundOpacity: 80,
            };
            ws.send('theme_change', defaultTheme);
        });
    }

    if (elements.backgroundOpacity) {
        elements.backgroundOpacity.addEventListener('input', (e) => {
            elements.backgroundOpacityValue.textContent = e.target.value;
        });
    }


    // --- Utility Functions ---
    function deepMerge(target, source) {
        const output = { ...target };
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key])) {
                    if (!(key in target))
                        Object.assign(output, { [key]: source[key] });
                    else
                        output[key] = deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    function isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    // --- Initial UI Sync ---
    updateUIFromState();
    console.log('Professional Dashboard Controller Ready.');
});
