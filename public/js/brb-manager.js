class BRBManager {
  constructor(wsConnection, stateManager) {
    this.ws = wsConnection;
    this.stateManager = stateManager;
    this.elements = {
      brbText: document.getElementById('brbText'),
      brbSave: document.getElementById('brbSave'),
      brbClear: document.getElementById('brbClear'),
      brbStatus: document.getElementById('brbStatus'),
      brbPanel: document.getElementById('brbPanel'),
      brbActiveLabel: document.querySelector('#brbPanel .brb-toggle'),
      statusBrb: document.getElementById('statusBrb'),
      statusBrbDot: document.getElementById('statusBrbDot')
    };

    this.initialize();
  }

  initialize() {
    // Subscribe to BRB state changes
    this.ws.subscribe('brb', (data) => {
      this.stateManager.state.brb = data;
      this.updateUI(data);
    });

    // Set up event listeners
    if (this.elements.brbSave) {
      this.elements.brbSave.addEventListener('click', () => this.saveBRB());
    }

    if (this.elements.brbClear) {
      this.elements.brbClear.addEventListener('click', () => this.clearBRB());
    }
  }

  updateUI(data) {
    if (!data) return;

    if (this.elements.brbText) {
      this.elements.brbText.value = data.text || '';
    }

    if (this.elements.brbStatus) {
      this.elements.brbStatus.textContent = data.isActive ? 'Active' : 'Inactive';
      this.elements.brbStatus.className = `status-label ${data.isActive ? 'is-active' : ''}`;
    }

    if (this.elements.brbPanel) {
      this.elements.brbPanel.classList.toggle('is-active', data.isActive);
    }

    if (this.elements.brbActiveLabel) {
      this.elements.brbActiveLabel.classList.toggle('is-active', data.isActive);
    }

    if (this.elements.statusBrb) {
      this.elements.statusBrb.textContent = data.isActive ? 'BRB Active' : 'BRB Inactive';
    }

    if (this.elements.statusBrbDot) {
      this.elements.statusBrbDot.classList.toggle('status-dot--active', data.isActive);
    }
  }

  saveBRB() {
    const payload = {
      text: this.elements.brbText.value.trim(),
      isActive: true,
      updatedAt: Date.now()
    };

    this.ws.send('brb', payload);
  }

  clearBRB() {
    const payload = {
      text: '',
      isActive: false,
      updatedAt: Date.now()
    };

    this.ws.send('brb', payload);
  }
}

// Export for both module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BRBManager;
} else {
  window.BRBManager = BRBManager;
}