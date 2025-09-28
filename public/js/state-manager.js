function StateManager() {
  if (!(this instanceof StateManager)) {
    return new StateManager();
  }
  
  this.subscribers = new Map();
  this.state = {
    ticker: {
      messages: [],
      isActive: false,
      displayDuration: 5,
      intervalBetween: 0
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
      slate: {
        isEnabled: true,
        rotationSeconds: 12,
        showClock: true,
        clockLabel: 'UK TIME'
      },
      brb: {
        isActive: false,
        text: ''
      }
    };
  }

StateManager.prototype.subscribe = function(key, callback) {
  if (!this.subscribers.has(key)) {
    this.subscribers.set(key, new Set());
  }
  this.subscribers.get(key).add(callback);
  var self = this;
  return function() { return self.subscribers.get(key).delete(callback); };
};

StateManager.prototype.notify = function(key, data) {
  if (this.subscribers.has(key)) {
    this.subscribers.get(key).forEach(function(callback) { callback(data); });
  }
};

StateManager.prototype.updateState = function(key, data) {
  var self = this;
  return fetch('/ticker/' + key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Failed to update ' + key);
    }
    return response.json();
  })
  .then(function(result) {
    self.state[key] = result[key];
    self.notify(key, result[key]);
    return result;
  })
  .catch(function(error) {
    console.error('Error updating ' + key + ':', error);
    throw error;
  });
};

StateManager.prototype.getState = function(key) {
  return this.state[key];
};

// Export for both module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateManager;
} else {
  window.StateManager = StateManager;
}