/**
 * Connection Status Component
 * Manages WebSocket connection status display and handling
 */
class ConnectionStatusComponent {
    constructor(wsClient) {
        this.wsClient = wsClient;
        this.elements = {
            connectionStatus: document.getElementById('connectionStatus'),
            statusDot: document.getElementById('statusDot'),
            statusText: document.getElementById('statusText')
        };
        this.init();
    }
    
    init() {
        if (!this.elements.connectionStatus) return;
        
        // Bind WebSocket events
        this.wsClient.on('connected', () => this.updateStatus('connected'));
        this.wsClient.on('disconnected', () => this.updateStatus('disconnected'));
        this.wsClient.on('reconnecting', () => this.updateStatus('reconnecting'));
        this.wsClient.on('error', () => this.updateStatus('error'));
        
        console.log('🔌 Connection Status Component initialized');
    }
    
    updateStatus(status) {
        if (!this.elements.statusDot || !this.elements.statusText) return;
        
        // Clear existing status classes
        this.elements.statusDot.className = 'status-dot';
        
        // Apply new status
        switch (status) {
            case 'connected':
                this.elements.statusDot.classList.add('status-connected');
                this.elements.statusText.textContent = 'Connected';
                this.showConnectionPulse();
                break;
                
            case 'disconnected':
                this.elements.statusDot.classList.add('status-disconnected');
                this.elements.statusText.textContent = 'Disconnected';
                break;
                
            case 'reconnecting':
                this.elements.statusDot.classList.add('status-reconnecting');
                this.elements.statusText.textContent = 'Reconnecting...';
                break;
                
            case 'error':
                this.elements.statusDot.classList.add('status-error');
                this.elements.statusText.textContent = 'Connection Error';
                break;
                
            default:
                this.elements.statusText.textContent = 'Unknown Status';
        }
    }
    
    showConnectionPulse() {
        if (!this.elements.statusDot) return;
        
        this.elements.statusDot.classList.add('connection-pulse');
        setTimeout(() => {
            if (this.elements.statusDot) {
                this.elements.statusDot.classList.remove('connection-pulse');
            }
        }, 1000);
    }
    
    getStatus() {
        return {
            isConnected: this.wsClient.isConnected(),
            statusText: this.elements.statusText?.textContent || 'Unknown'
        };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConnectionStatusComponent;
} else if (typeof window !== 'undefined') {
    window.ConnectionStatusComponent = ConnectionStatusComponent;
}