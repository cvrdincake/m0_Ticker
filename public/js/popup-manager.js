class PopupManager {
  constructor(wsConnection, stateManager) {
    this.ws = wsConnection;
    this.stateManager = stateManager;
    this.elements = {
      popupText: document.getElementById('popupText'),
      popupDuration: document.getElementById('popupDuration'),
      popupCountdownEnabled: document.getElementById('popupCountdownEnabled'),
      popupCountdownTarget: document.getElementById('popupCountdownTarget'),
      savePopup: document.getElementById('savePopup'),
      clearPopup: document.getElementById('clearPopup'),
      popupPreview: document.getElementById('popupPreview'),
      popupPanel: document.getElementById('popupPanel'),
      popupActiveLabel: document.querySelector('#popupPanel .popup-toggle')
    };
    
    this.initialize();
  }

  initialize() {
    // Subscribe to popup state changes
    this.ws.subscribe('popup', (data) => {
      this.stateManager.state.popup = data;
      this.updateUI(data);
    });

    // Set up event listeners
    if (this.elements.savePopup) {
      this.elements.savePopup.addEventListener('click', () => this.savePopup());
    }

    if (this.elements.clearPopup) {
      this.elements.clearPopup.addEventListener('click', () => this.clearPopup());
    }

    if (this.elements.popupCountdownEnabled) {
      this.elements.popupCountdownEnabled.addEventListener('change', () => {
        this.elements.popupCountdownTarget.disabled = !this.elements.popupCountdownEnabled.checked;
      });
    }
  }

  updateUI(data) {
    if (!this.elements.popupText || !data) return;

    this.elements.popupText.value = data.text || '';
    this.elements.popupDuration.value = data.durationSeconds || '';
    
    if (this.elements.popupCountdownEnabled) {
      this.elements.popupCountdownEnabled.checked = data.countdownEnabled || false;
    }
    
    if (this.elements.popupCountdownTarget) {
      this.elements.popupCountdownTarget.value = data.countdownTarget || '';
      this.elements.popupCountdownTarget.disabled = !data.countdownEnabled;
    }

    if (this.elements.popupActiveLabel) {
      this.elements.popupActiveLabel.classList.toggle('is-active', data.isActive);
    }

    if (this.elements.popupPanel) {
      this.elements.popupPanel.classList.toggle('is-active', data.isActive);
    }

    this.updatePreview(data);
  }

  updatePreview(data) {
    if (!this.elements.popupPreview) return;

    if (data.isActive && data.text) {
      let previewText = data.text;
      if (data.countdownEnabled && data.countdownTarget) {
        const targetTime = new Date(data.countdownTarget).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        previewText += ` (${minutes}:${seconds.toString().padStart(2, '0')})`;
      }
      this.elements.popupPreview.textContent = previewText;
      this.elements.popupPreview.style.display = 'block';
    } else {
      this.elements.popupPreview.style.display = 'none';
    }
  }

  savePopup() {
    const payload = {
      text: this.elements.popupText.value.trim(),
      isActive: true,
      durationSeconds: parseInt(this.elements.popupDuration.value, 10) || null,
      countdownEnabled: this.elements.popupCountdownEnabled.checked,
      countdownTarget: this.elements.popupCountdownEnabled.checked ? 
        this.elements.popupCountdownTarget.value : null
    };

    this.ws.send('popup', payload);
  }

  clearPopup() {
    const payload = {
      text: '',
      isActive: false,
      durationSeconds: null,
      countdownEnabled: false,
      countdownTarget: null
    };

    this.ws.send('popup', payload);
  }
}

// Export for both module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PopupManager;
} else {
  window.PopupManager = PopupManager;
}