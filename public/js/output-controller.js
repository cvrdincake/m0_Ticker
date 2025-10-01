class OutputController {
  constructor() {
    this.ticker = null;
    this.popup = null;
    this.brb = null;
    
    this.init();
  }

  init() {
    this.initializeComponents();
    this.setupWebSocketHandlers();
  }

  initializeComponents() {
    // Initialize Ticker Component
    const tickerContainer = document.getElementById('ticker-container');
    this.ticker = new TickerComponent(tickerContainer);

    // Initialize Popup Component
    const popupContainer = document.getElementById('popup-container');
    this.popup = new PopupComponent(popupContainer);

    // Initialize BRB Component
    const brbContainer = document.getElementById('brb-container');
    this.brb = new BRBComponent(brbContainer);

    console.log('🎬 Output overlay components initialized');
  }

  setupWebSocketHandlers() {
    window.wsClient.on('connected', () => {
      console.log('🔌 Output overlay connected to server');
    });

    window.wsClient.on('disconnected', () => {
      console.log('🔌 Output overlay disconnected from server');
    });

    // Handle state synchronization
    window.wsClient.on('state_sync', (state) => {
      console.log('📥 Received state sync:', state);
      this.updateAllComponents(state);
    });

    // Handle individual widget updates
    window.wsClient.on('ticker_update', (data) => {
      console.log('📰 Ticker update received:', data);
      if (this.ticker) {
        console.log('📰 Updating ticker component with:', data);
        this.ticker.updateConfig(data);
      } else {
        console.error('❌ Ticker component not found!');
      }
    });

    window.wsClient.on('popup_show', (data) => {
      console.log('💬 Popup show:', data);
      if (this.popup) {
        this.popup.show(data.title, data.message, data.duration);
      }
    });

    window.wsClient.on('popup_hide', (data) => {
      console.log('💬 Popup hide');
      if (this.popup) {
        this.popup.hide();
      }
    });

    window.wsClient.on('brb_update', (data) => {
      console.log('⏸️ BRB update:', data);
      if (this.brb) {
        this.brb.updateConfig(data);
      }
    });

    window.wsClient.on('theme_change', (data) => {
      console.log('🎨 Theme change:', data);
      this.applyTheme(data);
    });
  }

  updateAllComponents(state) {
    // Update ticker
    if (state.ticker && this.ticker) {
      this.ticker.updateConfig(state.ticker);
    }

    // Update popup
    if (state.popup && this.popup) {
      this.popup.updateConfig(state.popup);
    }

    // Update BRB
    if (state.brb && this.brb) {
      this.brb.updateConfig(state.brb);
    }

    // Update theme
    if (state.theme) {
      this.applyTheme(state.theme);
    }
  }

  applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme.accent) {
      root.style.setProperty('--accent-color', theme.accent);
    }

    // Apply theme-specific styles
    switch(theme.current) {
      case 'light':
        root.style.setProperty('--primary-bg', '#f5f5f5');
        root.style.setProperty('--text-primary', '#333333');
        root.style.setProperty('--text-secondary', '#666666');
        break;
      case 'blue':
        root.style.setProperty('--secondary-bg', '#1e3a8a');
        root.style.setProperty('--accent-color', '#3b82f6');
        break;
      case 'purple':
        root.style.setProperty('--secondary-bg', '#7c3aed');
        root.style.setProperty('--accent-color', '#a855f7');
        break;
      default: // dark
        root.style.setProperty('--primary-bg', '#0a0a0f');
        root.style.setProperty('--secondary-bg', '#1a1a2e');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--text-secondary', '#b3b3b3');
    }
  }
}

// Initialize output controller when page loads
document.addEventListener('DOMContentLoaded', () => {
  new OutputController();
});
