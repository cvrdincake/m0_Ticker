/**
 * BRB Widget Component
 * Manages Be Right Back overlay configuration and controls
 */
class BrbWidgetComponent {
    constructor(wsClient) {
        this.wsClient = wsClient;
        this.state = {
            isVisible: false,
            message: 'Be Right Back'
        };
        
        this.elements = {
            brbWidget: document.getElementById('brbWidget'),
            brbForm: document.getElementById('brbForm'),
            brbMessage: document.getElementById('brbMessage'),
            brbPreview: document.getElementById('brbPreview'),
            showBrb: document.getElementById('showBrb'),
            hideBrb: document.getElementById('hideBrb'),
            brbStatusBadge: document.getElementById('brbStatusBadge'),
            brbStatusText: document.getElementById('brbStatusText')
        };
        
        this.init();
    }
    
    init() {
        if (!this.elements.brbWidget) return;
        
        this.bindEvents();
        this.bindWebSocketEvents();
        this.updateUI();
        
        console.log('⏸️ BRB Widget Component initialized');
    }
    
    bindEvents() {
        // Message input
        if (this.elements.brbMessage) {
            this.elements.brbMessage.addEventListener('input', (e) => {
                const message = e.target.value;
                this.updatePreview(message);
                this.validateMessage(message);
            });
        }
        
        // Show BRB button
        if (this.elements.showBrb) {
            this.elements.showBrb.addEventListener('click', () => {
                this.showBrb();
            });
        }
        
        // Hide BRB button
        if (this.elements.hideBrb) {
            this.elements.hideBrb.addEventListener('click', () => {
                this.hideBrb();
            });
        }
        
        // Form submission
        if (this.elements.brbForm) {
            this.elements.brbForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.showBrb();
            });
        }
    }
    
    bindWebSocketEvents() {
        this.wsClient.on('brb_state_change', (data) => {
            this.updateState(data);
        });
        
        this.wsClient.on('state_update', (data) => {
            if (data.brb) {
                this.updateState(data.brb);
            }
        });
    }
    
    showBrb() {
        if (!this.elements.brbMessage) return;
        
        const message = this.elements.brbMessage.value.trim();
        if (!message) {
            this.showError('Please enter a BRB message');
            return;
        }
        
        const brbData = {
            message
        };
        
        this.wsClient.send('brb_show', brbData);
        console.log('⏸️ Showing BRB with:', brbData);
    }
    
    hideBrb() {
        this.wsClient.send('brb_hide');
        console.log('⏸️ Hiding BRB');
    }
    
    updateState(newState) {
        this.state = { ...this.state, ...newState };
        this.updateUI();
    }
    
    updateUI() {
        // Update status badge
        if (this.elements.brbStatusBadge && this.elements.brbStatusText) {
            this.elements.brbStatusBadge.className = 
                `status-badge ${this.state.isVisible ? 'active' : 'inactive'}`;
            this.elements.brbStatusText.textContent = 
                this.state.isVisible ? 'Visible' : 'Hidden';
        }
        
        // Update form fields
        if (this.elements.brbMessage) {
            this.elements.brbMessage.value = this.state.message;
        }
        
        // Update preview
        this.updatePreview(this.state.message);
        
        // Update button states
        if (this.elements.showBrb && this.elements.hideBrb) {
            this.elements.showBrb.disabled = this.state.isVisible;
            this.elements.hideBrb.disabled = !this.state.isVisible;
        }
    }
    
    updatePreview(message) {
        if (this.elements.brbPreview) {
            this.elements.brbPreview.textContent = `Preview: ${message || 'Be Right Back'}`;
        }
    }
    
    validateMessage(message) {
        const maxLength = 200;
        if (message.length > maxLength) {
            this.showWarning(`Message too long (${message.length}/${maxLength} characters)`);
            return false;
        }
        return true;
    }
    
    showError(message) {
        console.error('BRB Error:', message);
        alert(message); // Temporary - replace with better UX
    }
    
    showWarning(message) {
        console.warn('BRB Warning:', message);
        // Could show a toast notification here
    }
    
    getState() {
        return { ...this.state };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrbWidgetComponent;
} else if (typeof window !== 'undefined') {
    window.BrbWidgetComponent = BrbWidgetComponent;
}