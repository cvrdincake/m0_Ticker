/**
 * Shared Utilities for M0 Ticker
 * Common utility functions used across client and server matching test expectations
 */

// Constants
const MAX_TICKER_MESSAGE_LENGTH = 500;

/**
 * Normalizes server base URL for consistent API calls
 * @param {string} serverBase - Base server URL
 * @returns {string} Normalized URL
 */
function normaliseServerBase(serverBase) {
    if (!serverBase || typeof serverBase !== 'string') {
        return 'http://localhost:3000';
    }
    
    // Remove trailing slash
    let normalized = serverBase.replace(/\/$/, '');
    
    // Remove /ticker suffix if present
    normalized = normalized.replace(/\/ticker$/, '');
    
    // Add protocol if missing
    if (!normalized.match(/^https?:\/\//)) {
        normalized = `http://${normalized}`;
    }
    
    return normalized;
}

/**
 * Clamps duration to safe bounds and rounds to nearest second
 * @param {number} duration - Duration to clamp
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Clamped duration in seconds
 */
function clampDurationSeconds(duration, defaultValue) {
    const num = parseFloat(duration);
    if (isNaN(num) || duration === undefined) {
        return defaultValue;
    }
    
    // Clamp to 2-90 seconds range and round to nearest second
    return Math.round(Math.max(2, Math.min(90, num)));
}

/**
 * Clamps interval to 0-3600 second window
 * @param {number} interval - Interval to clamp
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Clamped interval in seconds
 */
function clampIntervalSeconds(interval, defaultValue) {
    const num = parseFloat(interval);
    if (isNaN(num) || interval === undefined) {
        return defaultValue;
    }
    
    return Math.max(0, Math.min(3600, num));
}

/**
 * Keeps overlay scale within safe bounds
 * @param {number} scale - Scale value to clamp
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Clamped scale value
 */
function clampScaleValue(scale, defaultValue = 1.0) {
    const num = parseFloat(scale);
    if (isNaN(num)) return defaultValue;
    
    return Math.max(0.1, Math.min(5.0, num));
}

/**
 * Validates CSS color format for safety
 * @param {string} color - Color string to validate
 * @returns {boolean} True if safe CSS color
 */
function isSafeCssColor(color) {
    if (!color || typeof color !== 'string') {
        return false;
    }
    
    // Test hex colors
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
        return true;
    }
    
    // Test rgb/rgba
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/.test(color)) {
        return true;
    }
    
    // Test hsl/hsla
    if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(?:,\s*[\d.]+\s*)?\)$/.test(color)) {
        return true;
    }
    
    // Test named colors (basic set)
    const namedColors = ['black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gray', 'transparent'];
    if (namedColors.includes(color.toLowerCase())) {
        return true;
    }
    
    return false;
}

/**
 * Normalizes highlight list by trimming whitespace and dropping empty entries
 * @param {string|Array} highlights - Highlight data
 * @returns {Array} Normalized highlight array
 */
function normaliseHighlightList(highlights) {
    if (!highlights) return [];
    
    if (typeof highlights === 'string') {
        return highlights
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0);
    }
    
    if (Array.isArray(highlights)) {
        return highlights
            .map(item => String(item || '').trim())
            .filter(item => item.length > 0);
    }
    
    return [];
}

/**
 * Sanitizes messages by enforcing limits and supporting metadata
 * @param {Array} messages - Array of message objects
 * @param {Object} options - Sanitization options
 * @returns {Array} Sanitized messages
 */
function sanitiseMessages(messages, options = {}) {
    const {
        maxLength = MAX_TICKER_MESSAGE_LENGTH,
        maxCount = 50,
        strict = false
    } = options;
    
    if (!Array.isArray(messages)) {
        if (strict) {
            throw new Error('Messages must be an array');
        }
        return [];
    }
    
    return messages
        .slice(0, maxCount)
        .map(msg => {
            if (typeof msg === 'string') {
                return {
                    text: msg.substring(0, maxLength),
                    metadata: {}
                };
            }
            
            if (msg && typeof msg === 'object') {
                return {
                    text: String(msg.text || '').substring(0, maxLength),
                    metadata: msg.metadata && typeof msg.metadata === 'object' ? msg.metadata : {}
                };
            }
            
            if (strict) {
                throw new Error('Invalid message format');
            }
            
            return {
                text: '',
                metadata: {}
            };
        })
        .filter(msg => msg.text.length > 0);
}

// Export for Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normaliseServerBase,
        clampDurationSeconds,
        clampIntervalSeconds,
        clampScaleValue,
        isSafeCssColor,
        normaliseHighlightList,
        sanitiseMessages,
        MAX_TICKER_MESSAGE_LENGTH
    };
} else if (typeof window !== 'undefined') {
    window.SharedUtils = {
        normaliseServerBase,
        clampDurationSeconds,
        clampIntervalSeconds,
        clampScaleValue,
        isSafeCssColor,
        normaliseHighlightList,
        sanitiseMessages,
        MAX_TICKER_MESSAGE_LENGTH
    };
}