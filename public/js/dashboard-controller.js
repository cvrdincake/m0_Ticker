class DashboardController {
  constructor() {
    this.currentState = {};
    this.init();
  }

  init() {
    this.setupEventHandlers();
    this.setupWebSocketHandlers();
    this.setupRangeInputs();
  }

  setupEventHandlers() {
    // Ticker controls
    document.getElementById('ticker-start').addEventListener('click', () => {
      this.updateTicker(true);
    });

    document.getElementById('ticker-stop').addEventListener('click', () => {
      this.updateTicker(false);
    });

    // Popup controls
    document.getElementById('popup-show').addEventListener('click', () => {
      this.showPopup();
    });

    document.getElementById('popup-hide').addEventListener('click', () => {
      this.hidePopup();
    });

    // BRB controls
    document.getElementById('brb-toggle').addEventListener('click', () => {
      this.toggleBRB();
    });

    // Theme controls
    document.getElementById('theme-apply').addEventListener('click', () => {
      this.applyTheme();
    });

    // State manager controls
    document.getElementById('state-save').addEventListener('click', () => {
      this.saveState();
    });

    document.getElementById('state-load').addEventListener('click', () => {
      this.loadState();
    });

    document.getElementById('state-reset').addEventListener('click', () => {
      this.resetState();
    });

    // Animation controller
    document.getElementById('test-animations').addEventListener('click', () => {
      this.testAnimations();
    });
  }

  setupWebSocketHandlers() {
    window.wsClient.on('connected', () => {
      this.updateConnectionStatus(true);
    });

    window.wsClient.on('disconnected', () => {
      this.updateConnectionStatus(false);
    });

    window.wsClient.on('state_sync', (state) => {
      this.currentState = state;
      this.updateUIFromState(state);
    });

    window.wsClient.on('ticker_update', (data) => {
      this.currentState.ticker = data;
    });

    window.wsClient.on('brb_update', (data) => {
      this.currentState.brb = data;
      this.updateBRBStatus(data.isActive);
    });
  }

  setupRangeInputs() {
    // Speed slider
    const speedSlider = document.getElementById('ticker-speed');
    const speedValue = document.getElementById('speed-value');
    speedSlider.addEventListener('input', (e) => {
      speedValue.textContent = e.target.value;
    });

    // Animation speed slider
    const animSpeedSlider = document.getElementById('animation-speed');
    const animSpeedValue = document.getElementById('animation-speed-value');
    animSpeedSlider.addEventListener('input', (e) => {
      animSpeedValue.textContent = e.target.value + 'x';
      gsap.globalTimeline.timeScale(parseFloat(e.target.value));
    });
  }

  updateConnectionStatus(isConnected) {
    const statusIndicator = document.getElementById('connection-status');
    const statusText = document.getElementById('connection-text');
    
    if (isConnected) {
      statusIndicator.className = 'status-indicator status-online';
      statusText.textContent = 'Connected';
    } else {
      statusIndicator.className = 'status-indicator status-offline';
      statusText.textContent = 'Disconnected';
    }
  }

  updateUIFromState(state) {
    // Update ticker UI
    if (state.ticker) {
      if (state.ticker.messages) {
        document.getElementById('ticker-messages').value = state.ticker.messages.join('\n');
      }
      if (state.ticker.speed) {
        document.getElementById('ticker-speed').value = state.ticker.speed;
        document.getElementById('speed-value').textContent = state.ticker.speed;
      }
      if (state.ticker.color) {
        document.getElementById('ticker-color').value = state.ticker.color;
      }
    }

    // Update BRB status
    if (state.brb) {
      this.updateBRBStatus(state.brb.isActive);
    }

    // Update theme
    if (state.theme) {
      if (state.theme.current) {
        document.getElementById('theme-select').value = state.theme.current;
      }
      if (state.theme.accent) {
        document.getElementById('accent-color').value = state.theme.accent;
      }
    }

    this.updateLastUpdateTime();
  }

  updateTicker(isActive) {
    const messages = document.getElementById('ticker-messages').value
      .split('\n')
      .filter(msg => msg.trim())
      .map(msg => msg.trim());
    
    const speed = parseInt(document.getElementById('ticker-speed').value);
    const color = document.getElementById('ticker-color').value;

    window.wsClient.updateTicker({
      messages,
      isActive,
      speed,
      color
    });
  }

  showPopup() {
    const title = document.getElementById('popup-title').value.trim();
    const message = document.getElementById('popup-message').value.trim();
    const duration = parseInt(document.getElementById('popup-duration').value) * 1000;

    if (!title || !message) {
      alert('Please enter both title and message for the popup.');
      return;
    }

    window.wsClient.showPopup(title, message, duration);
  }

  hidePopup() {
    window.wsClient.hidePopup();
  }

  toggleBRB() {
    const message = document.getElementById('brb-message').value.trim();
    window.wsClient.toggleBRB(message);
  }

  updateBRBStatus(isActive) {
    const statusEl = document.getElementById('brb-status');
    const toggleBtn = document.getElementById('brb-toggle');
    
    if (isActive) {
      statusEl.textContent = 'Active';
      statusEl.style.color = '#00ff88';
      toggleBtn.textContent = 'Deactivate BRB';
      toggleBtn.className = 'btn btn-danger';
    } else {
      statusEl.textContent = 'Inactive';
      statusEl.style.color = '#b3b3b3';
      toggleBtn.textContent = 'Activate BRB';
      toggleBtn.className = 'btn btn-primary';
    }
  }

  applyTheme() {
    const theme = document.getElementById('theme-select').value;
    const accent = document.getElementById('accent-color').value;

    window.wsClient.changeTheme({
      current: theme,
      accent: accent
    });

    // Apply theme locally for immediate feedback
    this.applyLocalTheme(theme, accent);
  }

  applyLocalTheme(theme, accent) {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', accent);

    // Theme-specific adjustments could be added here
    switch(theme) {
      case 'light':
        root.style.setProperty('--primary-bg', '#f5f5f5');
        root.style.setProperty('--text-primary', '#333333');
        break;
      case 'blue':
        root.style.setProperty('--secondary-bg', '#1e3a8a');
        break;
      case 'purple':
        root.style.setProperty('--secondary-bg', '#7c3aed');
        break;
      default: // dark
        root.style.setProperty('--primary-bg', '#0a0a0f');
        root.style.setProperty('--text-primary', '#ffffff');
    }
  }

  saveState() {
    // In a real implementation, this would save to localStorage or server
    localStorage.setItem('m0-ticker-state', JSON.stringify(this.currentState));
    this.showNotification('State saved successfully!');
  }

  loadState() {
    const savedState = localStorage.getItem('m0-ticker-state');
    if (savedState) {
      const state = JSON.parse(savedState);
      this.updateUIFromState(state);
      this.showNotification('State loaded successfully!');
    } else {
      this.showNotification('No saved state found.');
    }
  }

  resetState() {
    if (confirm('Are you sure you want to reset all widgets to default state?')) {
      // Reset all widgets
      window.wsClient.updateTicker({ messages: [], isActive: false });
      window.wsClient.hidePopup();
      if (this.currentState.brb && this.currentState.brb.isActive) {
        window.wsClient.toggleBRB();
      }
      
      this.showNotification('All widgets reset to default state.');
    }
  }

  testAnimations() {
    // Test animation on all widget cards
    const cards = document.querySelectorAll('.widget-card');
    
    gsap.fromTo(cards, 
      { scale: 1, rotation: 0 },
      { 
        scale: 1.05, 
        rotation: 2,
        duration: 0.3,
        stagger: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut"
      }
    );
    
    this.showNotification('Animation test completed!');
  }

  updateLastUpdateTime() {
    const now = new Date().toLocaleTimeString();
    document.getElementById('last-update').textContent = now;
  }

  showNotification(message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--glass-bg);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem;
      color: var(--text-primary);
      z-index: 10000;
      transform: translateX(100%);
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    gsap.to(notification, {
      x: 0,
      duration: 0.3,
      ease: 'power2.out'
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
      gsap.to(notification, {
        x: '100%',
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => notification.remove()
      });
    }, 3000);
  }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
  new DashboardController();
});
