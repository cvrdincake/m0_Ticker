/**
 * Popup Widget Component
 * Manages popup overlay configuration and controls
 */
class PopupWidgetComponent {
    constructor(wsClient) {
        this.wsClient = wsClient;
        this.state = {
            isVisible: false,
            title: '',
            message: ''
        };
        
        this.elements = {
            popupWidget: document.getElementById('popupWidget'),
            popupForm: document.getElementById('popupForm'),
            popupTitle: document.getElementById('popupTitle'),
            popupMessage: document.getElementById('popupMessage'),
            showPopup: document.getElementById('showPopup'),
            hidePopup: document.getElementById('hidePopup'),
            popupStatusBadge: document.getElementById('popupStatusBadge'),
            popupStatusText: document.getElementById('popupStatusText')
        };
        
        this.init();
    }
    
    init() {
        if (!this.elements.popupWidget) return;
        
        this.bindEvents();
        this.bindWebSocketEvents();
        this.updateUI();
        
        console.log('💬 Popup Widget Component initialized');
    }
    
    bindEvents() {
        // Show popup button
        if (this.elements.showPopup) {
            this.elements.showPopup.addEventListener('click', () => {
                this.showPopup();
            });
        }
        
        // Hide popup button
        if (this.elements.hidePopup) {
            this.elements.hidePopup.addEventListener('click', () => {
                this.hidePopup();
            });
        }
        
        // Form submission
        if (this.elements.popupForm) {
            this.elements.popupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.showPopup();
            });
        }
        
        // Input validation
        if (this.elements.popupTitle) {
            this.elements.popupTitle.addEventListener('input', (e) => {
                this.validateTitle(e.target.value);
            });
        }
        
        if (this.elements.popupMessage) {
            this.elements.popupMessage.addEventListener('input', (e) => {
                this.validateMessage(e.target.value);
            });
        }
    }
    
    bindWebSocketEvents() {
        this.wsClient.on('popup_state_change', (data) => {
            this.updateState(data);
        });
        
        this.wsClient.on('state_update', (data) => {
            if (data.popup) {
                this.updateState(data.popup);
            }
        });
    }
    
    showPopup() {
        if (!this.elements.popupTitle || !this.elements.popupMessage) return;
        
        const title = this.elements.popupTitle.value.trim();
        const message = this.elements.popupMessage.value.trim();
        
        if (!title && !message) {
            this.showError('Please enter either a title or message');
            return;
        }
        
        const popupData = {
            title,
            message
        };
        
        this.wsClient.send('popup_show', popupData);
        console.log('💬 Showing popup with:', popupData);
    }
    
    hidePopup() {
        this.wsClient.send('popup_hide');
        console.log('💬 Hiding popup');
    }
    
    updateState(newState) {
        this.state = { ...this.state, ...newState };
        this.updateUI();
    }
    
    updateUI() {
        // Update status badge
        if (this.elements.popupStatusBadge && this.elements.popupStatusText) {
            this.elements.popupStatusBadge.className = 
                `status-badge ${this.state.isVisible ? 'active' : 'inactive'}`;
            this.elements.popupStatusText.textContent = 
                this.state.isVisible ? 'Visible' : 'Hidden';
        }
        
        // Update form fields
        if (this.elements.popupTitle) {
            this.elements.popupTitle.value = this.state.title;
        }
        
        if (this.elements.popupMessage) {
            this.elements.popupMessage.value = this.state.message;
        }
        
        // Update button states
        if (this.elements.showPopup && this.elements.hidePopup) {
            this.elements.showPopup.disabled = this.state.isVisible;
            this.elements.hidePopup.disabled = !this.state.isVisible;
        }
    }
    
    validateTitle(title) {
        const maxLength = 100;
        if (title.length > maxLength) {
            this.showWarning(`Title too long (${title.length}/${maxLength} characters)`);
            return false;
        }
        return true;
    }
    
    validateMessage(message) {
        const maxLength = 500;
        if (message.length > maxLength) {
            this.showWarning(`Message too long (${message.length}/${maxLength} characters)`);
            return false;
        }
        return true;
    }
    
    showError(message) {
        console.error('Popup Error:', message);
        alert(message); // Temporary - replace with better UX
    }
    
    showWarning(message) {
        console.warn('Popup Warning:', message);
        // Could show a toast notification here
    }
    
    getState() {
        return { ...this.state };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PopupWidgetComponent;
} else if (typeof window !== 'undefined') {
    window.PopupWidgetComponent = PopupWidgetComponent;
}