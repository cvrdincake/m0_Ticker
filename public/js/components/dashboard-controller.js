/* global WebSocketClient, ConnectionStatusComponent, TickerWidgetComponent, PopupWidgetComponent, BrbWidgetComponent, ThemeWidgetComponent */

/**
 * Main Dashboard Controller
 * Orchestrates all dashboard components and manages global state
 */
class DashboardController {
    constructor() {
        this.wsClient = null;
        this.components = {};
        this.globalState = {
            ticker: { messages: [], isRunning: false, speed: 50, textColor: '#ffffff' },
            popup: { isVisible: false, title: '', message: '' },
            brb: { isVisible: false, message: 'Be Right Back' },
            theme: { accentColor: '#00ff88', backgroundOpacity: 80 }
        };
        this.init();
    }
    
    async init() {
        console.log('🎛️ Dashboard Controller initializing...');
        
        try {
            await this.initializeWebSocket();
            this.initializeComponents();
            this.bindGlobalEvents();
            
            console.log('✅ Dashboard Controller initialized successfully');
        } catch (error) {
            console.error('❌ Dashboard Controller initialization failed:', error);
            this.showError('Failed to initialize dashboard');
        }
    }
    
    async initializeWebSocket() {
        this.wsClient = new WebSocketClient();
        
        // Global WebSocket event handlers
        this.wsClient.on('connected', () => {
            console.log('🔌 Dashboard connected to server');
        });
        
        this.wsClient.on('disconnected', () => {
            console.log('🔌 Dashboard disconnected from server');
        });
        
        this.wsClient.on('state_update', (data) => {
            this.updateGlobalState(data);
        });
        
        this.wsClient.on('error', (error) => {
            console.error('🔌 WebSocket error:', error);
            this.showError('WebSocket connection error');
        });
        
        // Connect to server
        await this.wsClient.connect();
    }
    
    initializeComponents() {
        console.log('🧩 Initializing dashboard components...');
        
        // Initialize connection status component
        this.components.connectionStatus = new ConnectionStatusComponent(this.wsClient);
        
        // Initialize widget components
        this.components.tickerWidget = new TickerWidgetComponent(this.wsClient);
        this.components.popupWidget = new PopupWidgetComponent(this.wsClient);
        this.components.brbWidget = new BrbWidgetComponent(this.wsClient);
        this.components.themeWidget = new ThemeWidgetComponent(this.wsClient);
        
        console.log('✅ All components initialized');
    }
    
    bindGlobalEvents() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
        
        // Window beforeunload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Global error handler
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.showError('An unexpected error occurred');
        });
    }
    
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Key combinations
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.saveCurrentState();
                    break;
                case 'r':
                    e.preventDefault();
                    this.refreshConnection();
                    break;
            }
        }
        
        // Function keys
        switch (e.key) {
            case 'F1':
                e.preventDefault();
                this.showHelp();
                break;
            case 'F5':
                e.preventDefault();
                this.refreshConnection();
                break;
            case 'Escape':
                this.hideAllOverlays();
                break;
        }
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            console.log('📱 Dashboard hidden - reducing update frequency');
            // Could implement reduced polling here
        } else {
            console.log('📱 Dashboard visible - resuming normal operation');
            this.requestStateSync();
        }
    }
    
    updateGlobalState(newState) {
        this.globalState = { ...this.globalState, ...newState };
        console.log('🔄 Global state updated:', this.globalState);
        
        // Emit custom event for other components
        window.dispatchEvent(new CustomEvent('globalStateUpdate', {
            detail: this.globalState
        }));
    }
    
    requestStateSync() {
        if (this.wsClient && this.wsClient.isConnected()) {
            this.wsClient.send('state_sync_request');
        }
    }
    
    saveCurrentState() {
        const state = this.getCurrentState();
        localStorage.setItem('m0_ticker_dashboard_state', JSON.stringify(state));
        this.showSuccess('Dashboard state saved');
        console.log('💾 Dashboard state saved to localStorage');
    }
    
    loadSavedState() {
        try {
            const saved = localStorage.getItem('m0_ticker_dashboard_state');
            if (saved) {
                const state = JSON.parse(saved);
                this.updateGlobalState(state);
                console.log('📂 Dashboard state loaded from localStorage');
                return true;
            }
        } catch (error) {
            console.error('Failed to load saved state:', error);
        }
        return false;
    }
    
    getCurrentState() {
        return {
            ticker: this.components.tickerWidget?.getState() || this.globalState.ticker,
            popup: this.components.popupWidget?.getState() || this.globalState.popup,
            brb: this.components.brbWidget?.getState() || this.globalState.brb,
            theme: this.components.themeWidget?.getState() || this.globalState.theme,
            timestamp: Date.now()
        };
    }
    
    refreshConnection() {
        console.log('🔄 Refreshing WebSocket connection...');
        if (this.wsClient) {
            this.wsClient.reconnect();
        }
        this.showInfo('Refreshing connection...');
    }
    
    hideAllOverlays() {
        // Hide any visible overlays
        if (this.components.popupWidget && this.globalState.popup.isVisible) {
            this.components.popupWidget.hidePopup();
        }
        
        if (this.components.brbWidget && this.globalState.brb.isVisible) {
            this.components.brbWidget.hideBrb();
        }
    }
    
    showHelp() {
        const helpText = `
M0 Ticker Dashboard Shortcuts:

Ctrl+S - Save current state
Ctrl+R - Refresh connection  
F1 - Show this help
F5 - Refresh connection
Esc - Hide all overlays

Components:
📺 Ticker - Scrolling message display
💬 Popup - Overlay notifications  
⏸️ BRB - Be Right Back screen
🎨 Theme - Visual customization
        `;
        
        alert(helpText); // Temporary - replace with better modal
    }
    
    showError(message) {
        console.error('Dashboard Error:', message);
        // Could implement toast notifications here
        // For now, just log to console
    }
    
    showSuccess(message) {
        console.log('Dashboard Success:', message);
        // Could implement toast notifications here
    }
    
    showInfo(message) {
        console.log('Dashboard Info:', message);
        // Could implement toast notifications here
    }
    
    cleanup() {
        console.log('🧹 Cleaning up dashboard...');
        
        // Disconnect WebSocket
        if (this.wsClient) {
            this.wsClient.disconnect();
        }
        
        // Save state before leaving
        this.saveCurrentState();
    }
    
    // Public API for external access
    getGlobalState() {
        return { ...this.globalState };
    }
    
    getComponent(name) {
        return this.components[name];
    }
    
    isConnected() {
        return this.wsClient && this.wsClient.isConnected();
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardController = new DashboardController();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardController;
} else if (typeof window !== 'undefined') {
    window.DashboardController = DashboardController;
}