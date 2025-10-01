class DashboardController {
  constructor() {
    this.wsClient = null;
    this.state = {
      ticker: { messages: [], isActive: false, speed: 100, color: '#ffffff' },
      popup: { isVisible: false, title: '', message: '', duration: 5000 },
      brb: { isActive: false, message: 'Be Right Back' },
      theme: { current: 'dark', accent: '#00ff88' }
    };
    
    this.init();
  }

  init() {
    this.initializeWebSocket();
    this.setupEventListeners();
    this.updateUI();
    this.loadState();
  }

  initializeWebSocket() {
    this.wsClient = window.wsClient;
    
    if (this.wsClient) {
      this.wsClient.on('connected', () => {
        this.updateConnectionStatus(true);
        console.log('🔌 Dashboard connected to server');
      });

      this.wsClient.on('disconnected', () => {
        this.updateConnectionStatus(false);
        console.log('🔌 Dashboard disconnected from server');
      });

      this.wsClient.on('state_sync', (state) => {
        this.state = { ...this.state, ...state };
        this.updateUI();
        console.log('📥 Received state sync:', state);
      });
    }
  }

  setupEventListeners() {
    // Ticker controls
    document.getElementById('tickerStart').addEventListener('click', () => this.startTicker());
    document.getElementById('tickerStop').addEventListener('click', () => this.stopTicker());
    document.getElementById('tickerSpeed').addEventListener('input', (e) => this.updateTickerSpeed(e.target.value));
    document.getElementById('tickerColor').addEventListener('change', (e) => this.updateTickerColor(e.target.value));
    document.getElementById('tickerMessages').addEventListener('input', (e) => this.updateTickerMessages(e.target.value));

    // Popup controls
    document.getElementById('popupShow').addEventListener('click', () => this.showPopup());
    document.getElementById('popupHide').addEventListener('click', () => this.hidePopup());
    document.getElementById('popupDuration').addEventListener('input', (e) => this.updatePopupDuration(e.target.value));

    // BRB controls
    document.getElementById('brbToggle').addEventListener('click', () => this.toggleBRB());
    document.getElementById('brbMessage').addEventListener('input', (e) => this.updateBRBMessage(e.target.value));

    // Theme controls
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.changeTheme(e.target.dataset.theme));
    });
    document.getElementById('themeAccent').addEventListener('change', (e) => this.updateAccentColor(e.target.value));

    // State management
    document.getElementById('stateSave').addEventListener('click', () => this.saveState());
    document.getElementById('stateLoad').addEventListener('click', () => this.loadState());
    document.getElementById('stateReset').addEventListener('click', () => this.resetState());

    // Range value updates
    document.getElementById('tickerSpeed').addEventListener('input', (e) => {
      document.getElementById('tickerSpeedValue').textContent = e.target.value;
    });
    document.getElementById('popupDuration').addEventListener('input', (e) => {
      document.getElementById('popupDurationValue').textContent = e.target.value;
    });
  }

  startTicker() {
    const messages = document.getElementById('tickerMessages').value.split('\n').filter(m => m.trim());
    if (messages.length === 0) {
      alert('Please enter at least one ticker message');
      return;
    }

    this.state.ticker.messages = messages;
    this.state.ticker.isActive = true;
    
    this.sendUpdate('ticker_update', this.state.ticker);
    this.updateTickerStatus(true);
  }

  stopTicker() {
    this.state.ticker.isActive = false;
    this.sendUpdate('ticker_update', this.state.ticker);
    this.updateTickerStatus(false);
  }

  updateTickerSpeed(speed) {
    this.state.ticker.speed = parseInt(speed);
    if (this.state.ticker.isActive) {
      this.sendUpdate('ticker_update', this.state.ticker);
    }
  }

  updateTickerColor(color) {
    this.state.ticker.color = color;
    if (this.state.ticker.isActive) {
      this.sendUpdate('ticker_update', this.state.ticker);
    }
  }

  updateTickerMessages(text) {
    // Update messages but don't send until start is clicked
    this.state.ticker.messages = text.split('\n').filter(m => m.trim());
  }

  showPopup() {
    const title = document.getElementById('popupTitle').value;
    const message = document.getElementById('popupMessage').value;
    const duration = parseInt(document.getElementById('popupDuration').value) * 1000;

    if (!title && !message) {
      alert('Please enter a title or message for the popup');
      return;
    }

    this.state.popup = { title, message, duration, isVisible: true };
    this.sendUpdate('popup_show', this.state.popup);
    this.updatePopupStatus(true);
  }

  hidePopup() {
    this.state.popup.isVisible = false;
    this.sendUpdate('popup_hide', this.state.popup);
    this.updatePopupStatus(false);
  }

  updatePopupDuration(duration) {
    this.state.popup.duration = parseInt(duration) * 1000;
  }

  toggleBRB() {
    this.state.brb.isActive = !this.state.brb.isActive;
    this.state.brb.message = document.getElementById('brbMessage').value || 'Be Right Back';
    
    this.sendUpdate('brb_update', this.state.brb);
    this.updateBRBStatus(this.state.brb.isActive);
  }

  updateBRBMessage(message) {
    this.state.brb.message = message;
  }

  changeTheme(theme) {
    this.state.theme.current = theme;
    this.sendUpdate('theme_change', this.state.theme);
    this.applyTheme(theme);
  }

  updateAccentColor(color) {
    this.state.theme.accent = color;
    this.sendUpdate('theme_change', this.state.theme);
    document.documentElement.style.setProperty('--accent-color', color);
  }

  applyTheme(theme) {
    const root = document.documentElement;
    
    switch(theme) {
      case 'light':
        root.style.setProperty('--primary-bg', '#f5f5f5');
        root.style.setProperty('--secondary-bg', '#ffffff');
        root.style.setProperty('--text-primary', '#333333');
        root.style.setProperty('--text-secondary', '#666666');
        break;
      case 'blue':
        root.style.setProperty('--primary-bg', '#0f1729');
        root.style.setProperty('--secondary-bg', '#1e3a8a');
        root.style.setProperty('--accent-color', '#3b82f6');
        break;
      case 'purple':
        root.style.setProperty('--primary-bg', '#1a0f2e');
        root.style.setProperty('--secondary-bg', '#7c3aed');
        root.style.setProperty('--accent-color', '#a855f7');
        break;
      default: // dark
        root.style.setProperty('--primary-bg', '#0a0a0f');
        root.style.setProperty('--secondary-bg', '#1a1a2e');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--text-secondary', '#b3b3b3');
        root.style.setProperty('--accent-color', '#00ff88');
    }
  }

  saveState() {
    localStorage.setItem('m0-ticker-state', JSON.stringify(this.state));
    alert('Configuration saved successfully!');
  }

  loadState() {
    const saved = localStorage.getItem('m0-ticker-state');
    if (saved) {
      this.state = JSON.parse(saved);
      this.updateUI();
      this.sendUpdate('state_sync', this.state);
      alert('Configuration loaded successfully!');
    } else {
      alert('No saved configuration found');
    }
  }

  resetState() {
    if (confirm('Are you sure you want to reset all settings?')) {
      this.state = {
        ticker: { messages: [], isActive: false, speed: 100, color: '#ffffff' },
        popup: { isVisible: false, title: '', message: '', duration: 5000 },
        brb: { isActive: false, message: 'Be Right Back' },
        theme: { current: 'dark', accent: '#00ff88' }
      };
      
      this.updateUI();
      this.sendUpdate('state_sync', this.state);
      localStorage.removeItem('m0-ticker-state');
      alert('All settings have been reset!');
    }
  }

  updateUI() {
    // Update ticker UI
    document.getElementById('tickerMessages').value = this.state.ticker.messages.join('\n');
    document.getElementById('tickerSpeed').value = this.state.ticker.speed;
    document.getElementById('tickerSpeedValue').textContent = this.state.ticker.speed;
    document.getElementById('tickerColor').value = this.state.ticker.color;
    this.updateTickerStatus(this.state.ticker.isActive);

    // Update popup UI
    document.getElementById('popupTitle').value = this.state.popup.title || '';
    document.getElementById('popupMessage').value = this.state.popup.message || '';
    document.getElementById('popupDuration').value = (this.state.popup.duration || 5000) / 1000;
    document.getElementById('popupDurationValue').textContent = (this.state.popup.duration || 5000) / 1000;
    this.updatePopupStatus(this.state.popup.isVisible);

    // Update BRB UI
    document.getElementById('brbMessage').value = this.state.brb.message || 'Be Right Back';
    this.updateBRBStatus(this.state.brb.isActive);

    // Update theme UI
    document.getElementById('themeAccent').value = this.state.theme.accent || '#00ff88';
    this.applyTheme(this.state.theme.current || 'dark');
  }

  updateTickerStatus(active) {
    const status = document.getElementById('tickerStatus');
    if (status) {
      status.className = `status-indicator ${active ? 'status-active' : 'status-inactive'}`;
    }
  }

  updatePopupStatus(visible) {
    const status = document.getElementById('popupStatus');
    if (status) {
      status.className = `status-indicator ${visible ? 'status-active' : 'status-inactive'}`;
    }
  }

  updateBRBStatus(active) {
    const status = document.getElementById('brbStatus');
    if (status) {
      status.className = `status-indicator ${active ? 'status-active' : 'status-inactive'}`;
    }
  }

  updateConnectionStatus(connected) {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    
    if (indicator && text) {
      indicator.className = `status-indicator ${connected ? 'status-active' : 'status-inactive'}`;
      text.textContent = connected ? 'Connected' : 'Disconnected';
    }

    const serverStatus = document.querySelector('#serverStatus span:last-child');
    if (serverStatus) {
      serverStatus.textContent = connected ? 'Connected' : 'Disconnected';
    }
    
    const serverIndicator = document.querySelector('#serverStatus .status-indicator');
    if (serverIndicator) {
      serverIndicator.className = `status-indicator ${connected ? 'status-active' : 'status-inactive'}`;
    }
  }

  sendUpdate(event, data) {
    if (this.wsClient) {
      this.wsClient.send(event, data);
    }
  }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
  new DashboardController();
});