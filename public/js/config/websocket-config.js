/**
 * WebSocket Configuration
 * Centralized WebSocket connection settings and retry logic
 */

const WebSocketConfig = {
    // Connection settings
    connection: {
        url: `ws://${window.location.host}/ws`,
        protocols: [],
        timeout: 5000
    },
    
    // Retry configuration
    retry: {
        maxAttempts: 10,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 1.5,
        jitter: true
    },
    
    // Heartbeat/keepalive
    heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        message: { event: 'ping', data: {} }
    },
    
    // Message handling
    messaging: {
        queueSize: 100,
        batchSize: 10,
        timeout: 10000
    },
    
    // Debug and logging
    debug: {
        enabled: process?.env?.NODE_ENV === 'development' || window.location.hostname === 'localhost',
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        logMessages: true,
        logHeartbeat: false
    },
    
    // Feature flags
    features: {
        autoReconnect: true,
        persistentQueue: true,
        messageCompression: false,
        encryption: false
    }
};

// Environment-specific overrides
if (typeof window !== 'undefined') {
    // Browser environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    WebSocketConfig.connection.url = `${protocol}//${window.location.host}/ws`;
    
    // Development overrides
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        WebSocketConfig.debug.enabled = true;
        WebSocketConfig.retry.maxAttempts = 20;
        WebSocketConfig.heartbeat.interval = 15000;
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketConfig;
} else if (typeof window !== 'undefined') {
    window.WebSocketConfig = WebSocketConfig;
}