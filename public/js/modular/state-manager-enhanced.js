/**
 * Modular Ticker State Manager
 * Extracted from the monolithic output.html for better maintainability
 */

class ModularStateManager {
  constructor() {
    this.subscribers = new Map();
    this.state = this.getInitialState();
    this.debugMode = false;
  }

  getInitialState() {
    return {
      ticker: {
        messages: [],
        isActive: false,
        displayDuration: 5,
        intervalBetween: 0,
        lastUpdated: null
      },
      overlay: {
        label: 'LIVE',
        accent: '#38bdf8',
        accentSecondary: '#f472b6',
        scale: 1.75,
        popupScale: 1,
        position: 'bottom',
        mode: 'auto',
        theme: 'midnight-glass'
      },
      popup: {
        text: '',
        isActive: false,
        durationSeconds: null,
        countdownEnabled: false,
        countdownTarget: null
      },
      brb: {
        isActive: false,
        text: 'Be Right Back'
      },
      slate: {
        isEnabled: true,
        rotationSeconds: 12,
        showClock: true,
        clockLabel: 'UK TIME'
      }
    };
  }

  // Subscribe to state changes
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);
    
    // Return unsubscribe function
    return () => this.subscribers.get(key)?.delete(callback);
  }

  // Notify all subscribers of state changes
  notify(key, data) {
    if (this.debugMode) {
      console.log(`[StateManager] Notifying ${key}:`, data);
    }
    
    if (this.subscribers.has(key)) {
      this.subscribers.get(key).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[StateManager] Subscriber error for ${key}:`, error);
        }
      });
    }
  }

  // Update state and notify subscribers
  updateState(key, data) {
    const previousState = this.state[key];
    this.state[key] = { ...this.state[key], ...data };
    
    if (this.debugMode) {
      console.log(`[StateManager] State updated ${key}:`, {
        previous: previousState,
        current: this.state[key]
      });
    }
    
    this.notify(key, this.state[key]);
    return this.state[key];
  }

  // Get current state
  getState(key) {
    return key ? this.state[key] : this.state;
  }

  // Enable debug mode
  enableDebug() {
    this.debugMode = true;
    console.log('[StateManager] Debug mode enabled');
  }

  // Validate state structure
  validateState(key, data) {
    const validators = {
      ticker: (data) => {
        return typeof data === 'object' && 
               Array.isArray(data.messages || []) &&
               typeof data.isActive === 'boolean';
      },
      overlay: (data) => {
        return typeof data === 'object' &&
               typeof data.label === 'string';
      }
    };

    return validators[key] ? validators[key](data) : true;
  }

  // Reset state to initial values
  reset(key) {
    if (key) {
      this.state[key] = this.getInitialState()[key];
      this.notify(key, this.state[key]);
    } else {
      this.state = this.getInitialState();
      Object.keys(this.state).forEach(k => this.notify(k, this.state[k]));
    }
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModularStateManager;
} else {
  window.ModularStateManager = ModularStateManager;
}