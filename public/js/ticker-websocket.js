function TickerWebSocket(serverUrl) {
  if (!(this instanceof TickerWebSocket)) {
    return new TickerWebSocket(serverUrl);
  }
  
  this.serverUrl = serverUrl.replace(/^http/, 'ws') + '/ws';
  this.ws = null;
  this.reconnectAttempts = 0;
  this.maxReconnectAttempts = 5;
  this.reconnectDelay = 1000;
  this.handlers = new Map();
  this.connect();
}

TickerWebSocket.prototype.connect = function() {
  try {
    this.ws = new WebSocket(this.serverUrl);
    var self = this;
    
    this.ws.onopen = function() {
      console.log('[ticker] WebSocket connected');
      self.reconnectAttempts = 0;
      self.notify('connection', { status: 'connected' });
    };

    this.ws.onmessage = function(event) {
      try {
        var data = JSON.parse(event.data);
        var type = data.type;
        var payload = data.payload;
        var error = data.error;

        if (error) {
          console.error('[ticker] Server error:', error);
          self.notify('error', error);
          return;
        }

        if (type && payload) {
          self.notify(type, payload);
        }
      } catch (err) {
        console.error('[ticker] Message parsing error:', err);
      }
    };

    this.ws.onclose = function() {
      console.log('[ticker] WebSocket disconnected');
      self.notify('connection', { status: 'disconnected' });
      self.reconnect();
    };

    this.ws.onerror = function(error) {
      console.error('[ticker] WebSocket error:', error);
      self.notify('error', error);
    };

  } catch (error) {
    console.error('[ticker] WebSocket connection error:', error);
    this.reconnect();
  }
};

TickerWebSocket.prototype.reconnect = function() {
  if (this.reconnectAttempts >= this.maxReconnectAttempts) {
    console.error('[ticker] Max reconnection attempts reached');
    return;
  }

  this.reconnectAttempts++;
  console.log('[ticker] Reconnecting... Attempt ' + this.reconnectAttempts);
  
  var self = this;
  setTimeout(function() {
    self.connect();
  }, this.reconnectDelay * this.reconnectAttempts);
};

TickerWebSocket.prototype.send = function(type, payload) {
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    this.ws.send(JSON.stringify({ type: type, payload: payload }));
  } else {
    console.warn('[ticker] WebSocket not connected, message not sent');
  }
};

TickerWebSocket.prototype.subscribe = function(type, callback) {
  if (!this.handlers.has(type)) {
    this.handlers.set(type, new Set());
  }
  this.handlers.get(type).add(callback);
  var self = this;
  return function() { return self.handlers.get(type).delete(callback); };
};

TickerWebSocket.prototype.notify = function(type, data) {
  if (this.handlers.has(type)) {
    this.handlers.get(type).forEach(function(callback) { callback(data); });
  }
};

TickerWebSocket.prototype.disconnect = function() {
  if (this.ws) {
    this.ws.close();
    this.ws = null;
  }
};

// Specific message sending methods
TickerWebSocket.prototype.sendMessage = function(messageData) {
  console.log('[ticker] Sending message:', messageData);
  this.send('ticker_message', messageData);
};

TickerWebSocket.prototype.sendPopup = function(popupData) {
  console.log('[ticker] Sending popup:', popupData);
  this.send('popup_message', popupData);
};

TickerWebSocket.prototype.updateState = function(stateData) {
  console.log('[ticker] Updating state:', stateData);
  this.send('state_update', stateData);
};

// Export for both module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TickerWebSocket;
} else {
  window.TickerWebSocket = TickerWebSocket;
}