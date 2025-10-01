class DashboardController {
  constructor() {
    this.currentTheme = 'dark';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupWebSocketHandlers();
    this.updateConnectionStatus();
  }

  setupEventListeners() {
    // Ticker controls
    document.getElementById('ticker-start').addEventListener('click', () => this.startTicker());
    document.getElementById('ticker-stop').addEventListener('click', () => this.stopTicker());
    document.getElementById('ticker-speed').addEventListener('input', (e) => {
      document.getElementById('ticker-speed-value').textContent = e.target.value;
    });

    // Popup controls
    document.getElementById('popup-show').addEventListener('click', () => this.showPopup());
    document.getElementById('popup-hide').addEventListener('click', () => this.hidePopup());
    document.getElementById('popup-duration').addEventListener('input', (e) => {
      document.getElementById('popup-duration-value').textContent = e.target.value;
    });

    // BRB controls
    document.getElementById('brb-show').addEventListener('click', () => this.showBRB());
    document.getElementById('brb-hide').addEventListener('click', () => this.hideBRB());

    // Theme controls
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.selectTheme(e.target.dataset.theme));
    });
    document.getElementById('apply-theme').addEventListener('click', () => this.applyTheme());

    // State management
    document.getElementById('save-state').addEventListener('click', () => this.saveState());
    document.getElementById('load-state').addEventListener('click', () => this.loadState());
    document.getElementById('reset-state').addEventListener('click', () => this.resetState());

    // Connection
    document.getElementById('reconnect').addEventListener('click', () => this.reconnect());
  }

  setupWebSocketHandlers() {
    window.wsClient.on('connected', () => {
      this.updateConnectionStatus('connected');
      console.log('🔌 Dashboard connected to server');
    });

    window.wsClient.on('disconnected', () => {
      this.updateConnectionStatus('disconnected');
      console.log('🔌 Dashboard disconnected from server');
    });

    window.wsClient.on('state_sync', (state) => {
      console.log('📥 Received state sync:', state);
      this.updateUI(state);
    });
  }

  updateConnectionStatus(status = 'disconnected') {
    const statusEl = document.getElementById('connection-status');
    statusEl.textContent = status;
    statusEl.className = `status ${status === 'connected' ? 'active' : 'inactive'}`;
  }

  updateUI(state) {
    // Update ticker UI
    if (state.ticker) {
      document.getElementById('ticker-messages').value = state.ticker.messages.join('\n');
      document.getElementById('ticker-speed').value = state.ticker.speed;
      document.getElementById('ticker-speed-value').textContent = state.ticker.speed;
      document.getElementById('ticker-color').value = state.ticker.color;
      this.updateStatus('ticker', state.ticker.isActive);
    }

    // Update popup UI
    if (state.popup) {
      document.getElementById('popup-title').value = state.popup.title || '';
      document.getElementById('popup-message').value = state.popup.message || '';
      document.getElementById('popup-duration').value = state.popup.duration / 1000;
      document.getElementById('popup-duration-value').textContent = state.popup.duration / 1000;
      this.updateStatus('popup', state.popup.isVisible);
    }

    // Update BRB UI
    if (state.brb) {
      document.getElementById('brb-message').value = state.brb.customMessage || '';
      this.updateStatus('brb', state.brb.isActive);
    }

    // Update theme UI
    if (state.theme) {
      this.currentTheme = state.theme.current;
      document.getElementById('accent-color').value = state.theme.accent;
      this.selectTheme(state.theme.current);
    }
  }

  updateStatus(widget, isActive) {
    const statusEl = document.getElementById(`${widget}-status`);
    statusEl.textContent = isActive ? 'active' : 'inactive';
    statusEl.className = `status ${isActive ? 'active' : 'inactive'}`;
  }

  // Ticker methods
  startTicker() {
    const messages = document.getElementById('ticker-messages').value
      .split('\n')
      .filter(msg => msg.trim())
      .map(msg => msg.trim());
    
    if (messages.length === 0) {
      alert('Please enter at least one ticker message');
      return;
    }

    const tickerData = {
      messages: messages,
      isActive: true,
      speed: parseInt(document.getElementById('ticker-speed').value),
      color: document.getElementById('ticker-color').value
    };

    window.wsClient.send('ticker_update', tickerData);
    this.updateStatus('ticker', true);
  }

  stopTicker() {
    const tickerData = {
      isActive: false
    };

    window.wsClient.send('ticker_update', tickerData);
    this.updateStatus('ticker', false);
  }

  // Popup methods
  showPopup() {
    const title = document.getElementById('popup-title').value.trim();
    const message = document.getElementById('popup-message').value.trim();
    const duration = parseInt(document.getElementById('popup-duration').value) * 1000;

    if (!title || !message) {
      alert('Please enter both title and message for the popup');
      return;
    }

    const popupData = {
      title: title,
      message: message,
      duration: duration,
      isVisible: true
    };

    window.wsClient.send('popup_show', popupData);
    this.updateStatus('popup', true);

    // Auto-hide after duration
    setTimeout(() => {
      this.hidePopup();
    }, duration);
  }

  hidePopup() {
    window.wsClient.send('popup_hide', {});
    this.updateStatus('popup', false);
  }

  // BRB methods
  showBRB() {
    const customMessage = document.getElementById('brb-message').value.trim();
    
    const brbData = {
      isActive: true,
      customMessage: customMessage || 'Taking a quick break...'
    };

    window.wsClient.send('brb_update', brbData);
    this.updateStatus('brb', true);
  }

  hideBRB() {
    const brbData = {
      isActive: false
    };

    window.wsClient.send('brb_update', brbData);
    this.updateStatus('brb', false);
  }

  // Theme methods
  selectTheme(theme) {
    this.currentTheme = theme;
    
    // Update UI
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
  }

  applyTheme() {
    const themeData = {
      current: this.currentTheme,
      accent: document.getElementById('accent-color').value
    };

    window.wsClient.send('theme_change', themeData);
  }

  // State management methods
  saveState() {
    const state = {
      ticker: {
        messages: document.getElementById('ticker-messages').value.split('\n').filter(msg => msg.trim()),
        speed: parseInt(document.getElementById('ticker-speed').value),
        color: document.getElementById('ticker-color').value
      },
      popup: {
        title: document.getElementById('popup-title').value,
        message: document.getElementById('popup-message').value,
        duration: parseInt(document.getElementById('popup-duration').value) * 1000
      },
      brb: {
        customMessage: document.getElementById('brb-message').value
      },
      theme: {
        current: this.currentTheme,
        accent: document.getElementById('accent-color').value
      }
    };

    localStorage.setItem('m0_ticker_state', JSON.stringify(state));
    alert('Configuration saved successfully!');
  }

  loadState() {
    const savedState = localStorage.getItem('m0_ticker_state');
    if (!savedState) {
      alert('No saved configuration found');
      return;
    }

    try {
      const state = JSON.parse(savedState);
      this.updateUI(state);
      alert('Configuration loaded successfully!');
    } catch (error) {
      alert('Error loading configuration');
      console.error('Error loading state:', error);
    }
  }

  resetState() {
    if (!confirm('Are you sure you want to reset all widgets? This will stop all active widgets.')) {
      return;
    }

    // Reset UI
    document.getElementById('ticker-messages').value = '';
    document.getElementById('ticker-speed').value = 100;
    document.getElementById('ticker-speed-value').textContent = '100';
    document.getElementById('ticker-color').value = '#ffffff';

    document.getElementById('popup-title').value = '';
    document.getElementById('popup-message').value = '';
    document.getElementById('popup-duration').value = 5;
    document.getElementById('popup-duration-value').textContent = '5';

    document.getElementById('brb-message').value = '';

    document.getElementById('accent-color').value = '#00ff88';
    this.selectTheme('dark');

    // Stop all widgets
    this.stopTicker();
    this.hidePopup();
    this.hideBRB();

    // Clear saved state
    localStorage.removeItem('m0_ticker_state');

    alert('All widgets have been reset');
  }

  reconnect() {
    window.wsClient.connect();
  }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
  new DashboardController();
});