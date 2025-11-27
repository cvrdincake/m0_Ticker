import { ACTIONS } from './state.js';

const DEFAULT_RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000];

export function createTransport(options = {}) {
  const config = {
    retryDelays: DEFAULT_RETRY_DELAYS,
    dispatch: null,
    onState: null,
    onAnalytics: null,
    onError: null,
    onConnectionChange: null,
    onReconnectScheduled: null,
    onMessage: null,
    ...options
  };

  let socket = null;
  let shouldReconnect = true;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  const sendQueue = [];
  const listeners = new Map();

  function getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  function updateConnectionStatus(status, error = null) {
    if (config.dispatch) {
      config.dispatch({
        type: ACTIONS.SET_CONNECTION_STATUS,
        payload: {
          status,
          retries: reconnectAttempts,
          error
        }
      });
    }
    config.onConnectionChange?.(status, { retries: reconnectAttempts, error });
  }

  function notify(event, payload) {
    const callbacks = listeners.get(event);
    if (!callbacks) return;
    callbacks.forEach(cb => {
      try {
        cb(payload);
      } catch (err) {
        console.error('Transport listener error', err);
      }
    });
  }

  function flushQueue() {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    while (sendQueue.length > 0) {
      const item = sendQueue.shift();
      try {
        socket.send(item.message);
        item.resolve();
      } catch (err) {
        item.reject(err);
        break;
      }
    }
  }

  function scheduleReconnect(reason) {
    if (!shouldReconnect) {
      updateConnectionStatus('disconnected', reason);
      return;
    }

    reconnectAttempts += 1;
    const delays = config.retryDelays ?? DEFAULT_RETRY_DELAYS;
    const index = Math.min(reconnectAttempts - 1, delays.length - 1);
    const delay = delays[index] ?? delays[delays.length - 1] ?? 5000;
    config.onReconnectScheduled?.(delay, reconnectAttempts, reason);
    updateConnectionStatus('connecting', reason);
    clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(connect, delay);
  }

  function handleMessage(event) {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (err) {
      console.warn('Failed to parse message', err, event.data);
      return;
    }

    switch (message.type) {
      case 'state':
        config.onState?.(message.payload);
        break;
      case 'analytics':
        config.onAnalytics?.(message.payload);
        break;
      case 'error':
        config.onError?.(message.payload);
        notify('error', message.payload);
        break;
      default:
        config.onMessage?.(message);
        notify(message.type, message.payload ?? message);
        break;
    }
  }

  function connect() {
    shouldReconnect = true;
    clearTimeout(reconnectTimer);

    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    updateConnectionStatus('connecting');

    try {
      socket = new WebSocket(getWebSocketUrl());
    } catch (err) {
      console.error('WebSocket connection error', err);
      scheduleReconnect(err);
      return;
    }

    socket.addEventListener('open', () => {
      reconnectAttempts = 0;
      updateConnectionStatus('connected');
      try {
        socket.send(JSON.stringify({ type: 'identify', clientType: 'dashboard' }));
      } catch (err) {
        console.error('Failed to send identify message', err);
      }
      flushQueue();
    });

    socket.addEventListener('message', handleMessage);

    socket.addEventListener('error', event => {
      const error = event?.error ?? new Error('WebSocket error');
      console.error('WebSocket error', error);
      updateConnectionStatus('error', error);
      config.onError?.({ message: error.message });
    });

    socket.addEventListener('close', event => {
      socket = null;
      if (event.wasClean) {
        updateConnectionStatus('disconnected');
      }
      scheduleReconnect(event);
    });
  }

  function disconnect() {
    shouldReconnect = false;
    clearTimeout(reconnectTimer);
    if (socket) {
      try {
        socket.close();
      } catch (err) {
        console.error('Error closing socket', err);
      }
      socket = null;
    }
    updateConnectionStatus('disconnected');
  }

  function send(type, payload = {}) {
    const message = JSON.stringify({ type, payload });
    return new Promise((resolve, reject) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(message);
          resolve();
        } catch (err) {
          reject(err);
        }
      } else {
        sendQueue.push({ message, resolve, reject });
        if (!socket || socket.readyState === WebSocket.CLOSED) {
          connect();
        }
      }
    });
  }

  function on(event, callback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    const callbacks = listeners.get(event);
    callbacks.add(callback);
    return () => callbacks.delete(callback);
  }

  return {
    connect,
    disconnect,
    send,
    on
  };
}
