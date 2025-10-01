/**
 * Shared Configuration for M0 Ticker
 * Contains constants and configuration used across client and server
 */

// Default highlight patterns for text processing
const DEFAULT_HIGHLIGHTS = {
    // Social media handles
    mentions: /@\w+/g,
    hashtags: /#\w+/g,
    
    // URLs and links
    urls: /https?:\/\/[^\s]+/g,
    
    // Special characters and emojis
    emojis: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu,
    
    // Time stamps
    timestamps: /\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?/gi,
    
    // Numbers and currency
    currency: /\$\d+(?:\.\d{2})?/g,
    numbers: /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g
};

// WebSocket configuration
const WEBSOCKET_CONFIG = {
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    connectionTimeout: 5000
};

// Animation timing constants
const ANIMATION_CONFIG = {
    tickerSpeed: {
        min: 10,
        max: 100,
        default: 50
    },
    transitions: {
        fast: 150,
        normal: 300,
        slow: 500
    },
    easing: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        linear: 'linear'
    }
};

// Theme configuration
const THEME_CONFIG = {
    colors: {
        accent: '#00ff88',
        background: '#0a0a0a',
        surface: '#1a1a1a',
        text: '#ffffff',
        textSecondary: '#a0a0a0'
    },
    blur: {
        light: 'blur(8px)',
        medium: 'blur(12px)',
        heavy: 'blur(20px)'
    }
};

// Export for Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEFAULT_HIGHLIGHTS,
        WEBSOCKET_CONFIG,
        ANIMATION_CONFIG,
        THEME_CONFIG
    };
} else if (typeof window !== 'undefined') {
    window.SharedConfig = {
        DEFAULT_HIGHLIGHTS,
        WEBSOCKET_CONFIG,
        ANIMATION_CONFIG,
        THEME_CONFIG
    };
}