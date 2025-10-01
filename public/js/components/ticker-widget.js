/**
 * Ticker Widget Component
 * Manages ticker configuration and controls
 */
class TickerWidgetComponent {
    constructor(wsClient) {
        this.wsClient = wsClient;
        this.state = {
            messages: [],
            isRunning: false,
            speed: 50,
            textColor: '#ffffff'
        };
        
        this.elements = {
            tickerWidget: document.getElementById('tickerWidget'),
            tickerForm: document.getElementById('tickerForm'),
            tickerMessages: document.getElementById('tickerMessages'),
            tickerSpeed: document.getElementById('tickerSpeed'),
            tickerSpeedValue: document.getElementById('tickerSpeedValue'),
            textColor: document.getElementById('textColor'),
            startTicker: document.getElementById('startTicker'),
            stopTicker: document.getElementById('stopTicker'),
            tickerStatusBadge: document.getElementById('tickerStatusBadge'),
            tickerStatusText: document.getElementById('tickerStatusText')
        };
        
        this.init();
    }
    
    init() {
        if (!this.elements.tickerWidget) return;
        
        this.bindEvents();
        this.bindWebSocketEvents();
        this.updateUI();
        
        console.log('📺 Ticker Widget Component initialized');
    }
    
    bindEvents() {
        // Speed slider
        if (this.elements.tickerSpeed) {
            this.elements.tickerSpeed.addEventListener('input', (e) => {
                const speed = parseInt(e.target.value);
                this.state.speed = speed;
                if (this.elements.tickerSpeedValue) {
                    this.elements.tickerSpeedValue.textContent = speed;
                }
            });
        }
        
        // Text color picker
        if (this.elements.textColor) {
            this.elements.textColor.addEventListener('change', (e) => {
                this.state.textColor = e.target.value;
            });
        }
        
        // Start ticker button
        if (this.elements.startTicker) {
            this.elements.startTicker.addEventListener('click', () => {
                this.startTicker();
            });
        }
        
        // Stop ticker button
        if (this.elements.stopTicker) {
            this.elements.stopTicker.addEventListener('click', () => {
                this.stopTicker();
            });
        }
        
        // Form submission
        if (this.elements.tickerForm) {
            this.elements.tickerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.startTicker();
            });
        }
    }
    
    bindWebSocketEvents() {
        this.wsClient.on('ticker_state_change', (data) => {
            this.updateState(data);
        });
        
        this.wsClient.on('state_update', (data) => {
            if (data.ticker) {
                this.updateState(data.ticker);
            }
        });
    }
    
    startTicker() {
        if (!this.elements.tickerMessages) return;
        
        const messagesText = this.elements.tickerMessages.value.trim();
        if (!messagesText) {
            this.showError('Please enter at least one message');
            return;
        }
        
        const messages = messagesText.split('\n').filter(msg => msg.trim());
        if (messages.length === 0) {
            this.showError('Please enter valid messages');
            return;
        }
        
        const tickerData = {
            messages,
            speed: this.state.speed,
            textColor: this.state.textColor
        };
        
        this.wsClient.send('ticker_start', tickerData);
        console.log('📺 Starting ticker with:', tickerData);
    }
    
    stopTicker() {
        this.wsClient.send('ticker_stop');
        console.log('📺 Stopping ticker');
    }
    
    updateState(newState) {
        this.state = { ...this.state, ...newState };
        this.updateUI();
    }
    
    updateUI() {
        // Update status badge
        if (this.elements.tickerStatusBadge && this.elements.tickerStatusText) {
            this.elements.tickerStatusBadge.className = 
                `status-badge ${this.state.isRunning ? 'active' : 'inactive'}`;
            this.elements.tickerStatusText.textContent = 
                this.state.isRunning ? 'Running' : 'Stopped';
        }
        
        // Update form fields
        if (this.elements.tickerSpeed) {
            this.elements.tickerSpeed.value = this.state.speed;
        }
        
        if (this.elements.tickerSpeedValue) {
            this.elements.tickerSpeedValue.textContent = this.state.speed;
        }
        
        if (this.elements.textColor) {
            this.elements.textColor.value = this.state.textColor;
        }
        
        if (this.elements.tickerMessages && this.state.messages.length > 0) {
            this.elements.tickerMessages.value = this.state.messages.join('\n');
        }
        
        // Update button states
        if (this.elements.startTicker && this.elements.stopTicker) {
            this.elements.startTicker.disabled = this.state.isRunning;
            this.elements.stopTicker.disabled = !this.state.isRunning;
        }
    }
    
    showError(message) {
        // Simple error display - could be enhanced with toast notifications
        console.error('Ticker Error:', message);
        alert(message); // Temporary - replace with better UX
    }
    
    getState() {
        return { ...this.state };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TickerWidgetComponent;
} else if (typeof window !== 'undefined') {
    window.TickerWidgetComponent = TickerWidgetComponent;
}