/**
 * M0_TICKER OPTIMIZED SHARED UTILITIES
 * Consolidated validation, normalization, and utility functions
 * Replaces: shared-utils.js + client-normalisers.js (partial)
 */

(function (root, factory) {
  const exports = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root && typeof root === 'object') {
    root.TickerShared = exports;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {

  // ===== CONSTANTS =====
  const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const RGB_COLOR_RE = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|0?\.\d+|1(?:\.0+)?))?\s*\)$/i;
  const HSL_COLOR_RE = /^hsla?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*(0|0?\.\d+|1(?:\.0+)?))?\s*\)$/i;

  // Configuration constants
  const CONFIG = {
    MAX_TICKER_MESSAGES: 50,
    MAX_TICKER_MESSAGE_LENGTH: 280,
    MAX_POPUP_DURATION_SECONDS: 600,
    MAX_SCENE_NAME_LENGTH: 100,
    MAX_SLATE_TITLE_LENGTH: 120,
    MAX_SLATE_TEXT_LENGTH: 500,
    MAX_SLATE_NOTES: 6,
    MAX_OVERLAY_LABEL_LENGTH: 24,
    MAX_ACCENT_LENGTH: 30,
    MAX_PRESET_NAME_LENGTH: 50,
    OVERLAY_THEMES: ['minimal', 'modern', 'bold', 'neon', 'retro', 'elegant'],
    THEME_OPTIONS: ['minimal', 'modern', 'bold', 'neon', 'retro', 'elegant']
  };

  // ===== CORE UTILITIES =====

  /**
   * Optimized text input sanitization
   * @param {any} value Input value to sanitize
   * @param {Object} options Sanitization options
   * @returns {string} Sanitized text
   */
  function sanitiseTextInput(value, options = {}) {
    const { maxLength = 1000, fallback = '', trim = true } = options;
    
    if (typeof value !== 'string') return fallback;
    
    let result = trim ? value.trim() : value;
    if (result.length > maxLength) {
      result = result.slice(0, maxLength);
    }
    
    return result || fallback;
  }

  /**
   * Optimized color validation
   * @param {any} value Color value to validate
   * @returns {boolean} True if valid color
   */
  function isSafeCssColor(value) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return HEX_COLOR_RE.test(trimmed) || 
           RGB_COLOR_RE.test(trimmed) || 
           HSL_COLOR_RE.test(trimmed);
  }

  /**
   * Clamp numeric values with validation
   * @param {any} value Value to clamp
   * @param {number} min Minimum value
   * @param {number} max Maximum value
   * @param {number} fallback Default value
   * @returns {number} Clamped value
   */
  function clampValue(value, min, max, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, num));
  }

  // ===== SPECIALIZED CLAMP FUNCTIONS =====
  const clampDurationSeconds = (value) => clampValue(value, 1, 120, 5);
  const clampIntervalSeconds = (value) => clampValue(value, 0, 3600, 0);
  const clampScaleValue = (value) => clampValue(value, 0.5, 3.0, 1.0);
  const clampPopupScaleValue = (value) => clampValue(value, 0.3, 5.0, 1.0);
  const clampSlateRotationSeconds = (value) => clampValue(value, 0, 86400, 0);

  // ===== NORMALIZATION FUNCTIONS =====

  /**
   * Normalize position value
   */
  function normalisePosition(value) {
    const str = String(value || '').toLowerCase().trim();
    return str === 'top' ? 'top' : 'bottom';
  }

  /**
   * Normalize mode value
   */
  function normaliseMode(value) {
    const str = String(value || '').toLowerCase().trim();
    return ['auto', 'marquee', 'chunk'].includes(str) ? str : 'auto';
  }

  /**
   * Normalize theme value
   */
  function normaliseTheme(value) {
    const str = String(value || '').toLowerCase().trim();
    return CONFIG.OVERLAY_THEMES.includes(str) ? str : 'modern';
  }

  /**
   * Normalize highlight list
   */
  function normaliseHighlightList(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map(item => sanitiseTextInput(item, { maxLength: 100 }))
      .filter(Boolean)
      .slice(0, 20); // Limit to 20 highlight terms
  }

  /**
   * Normalize server URL
   */
  function normaliseServerBase(value, fallbackOrigin = 'http://127.0.0.1:3000') {
    const url = sanitiseTextInput(value);
    if (!url) return fallbackOrigin;
    
    const cleaned = url
      .replace(/(?:\/ticker)+\/?$/i, '')
      .replace(/\/+$/g, '');
    
    return cleaned || fallbackOrigin;
  }

  /**
   * Optimized message sanitization
   * @param {Array} messages Array of messages to sanitize
   * @param {Object} options Sanitization options
   * @returns {Object} Sanitized result with metadata
   */
  function sanitiseMessages(messages, options = {}) {
    const { includeMeta = false, maxMessages = CONFIG.MAX_TICKER_MESSAGES } = options;
    
    if (!Array.isArray(messages)) {
      return { messages: [], trimmed: false, truncated: false };
    }

    let trimmed = false;
    let truncated = false;

    // Filter and sanitize messages
    const sanitised = messages
      .slice(0, maxMessages + 5) // Allow slight overflow for detection
      .map(msg => {
        const cleaned = sanitiseTextInput(msg, { 
          maxLength: CONFIG.MAX_TICKER_MESSAGE_LENGTH 
        });
        if (cleaned.length < (msg || '').length) {
          trimmed = true;
        }
        return cleaned;
      })
      .filter(Boolean);

    // Check for truncation
    if (sanitised.length > maxMessages) {
      sanitised.splice(maxMessages);
      truncated = true;
    }

    const result = { messages: sanitised };
    if (includeMeta) {
      result.trimmed = trimmed;
      result.truncated = truncated;
    }

    return result;
  }

  /**
   * Normalize overlay data with optimized validation
   */
  function normaliseOverlayData(data, defaults = {}) {
    const overlay = { ...defaults };
    
    if (!data || typeof data !== 'object') return overlay;

    // Normalize string fields
    if (typeof data.label === 'string') {
      overlay.label = sanitiseTextInput(data.label, { 
        maxLength: CONFIG.MAX_OVERLAY_LABEL_LENGTH,
        fallback: 'LIVE' 
      });
    }

    // Normalize color fields
    ['accent', 'accentSecondary'].forEach(field => {
      if (data[field] && isSafeCssColor(data[field])) {
        overlay[field] = data[field].trim();
      }
    });

    // Normalize numeric fields
    if (Number.isFinite(data.scale)) {
      overlay.scale = clampScaleValue(data.scale);
    }
    if (Number.isFinite(data.popupScale)) {
      overlay.popupScale = clampPopupScaleValue(data.popupScale);
    }

    // Normalize enum fields
    if (data.position) overlay.position = normalisePosition(data.position);
    if (data.mode) overlay.mode = normaliseMode(data.mode);
    if (data.theme) overlay.theme = normaliseTheme(data.theme);

    // Normalize boolean fields
    ['accentAnim', 'sparkle'].forEach(field => {
      if (typeof data[field] === 'boolean') {
        overlay[field] = data[field];
      }
    });

    // Normalize highlight array
    if (data.highlight) {
      overlay.highlight = normaliseHighlightList(
        Array.isArray(data.highlight) ? data.highlight : [data.highlight]
      );
    }

    return overlay;
  }

  /**
   * Normalize popup data
   */
  function normalisePopupData(data, defaults = {}) {
    const popup = { ...defaults };
    
    if (!data || typeof data !== 'object') return popup;

    // Text content
    if (typeof data.text === 'string') {
      popup.text = sanitiseTextInput(data.text, { 
        maxLength: CONFIG.MAX_TICKER_MESSAGE_LENGTH 
      });
    }

    // Duration
    if (Number.isFinite(data.durationSeconds)) {
      popup.durationSeconds = clampValue(
        data.durationSeconds, 
        1, 
        CONFIG.MAX_POPUP_DURATION_SECONDS, 
        10
      );
    }

    // Boolean fields
    ['isActive', 'countdownEnabled'].forEach(field => {
      if (typeof data[field] === 'boolean') {
        popup[field] = data[field];
      }
    });

    // Countdown target (timestamp)
    if (Number.isFinite(data.countdownTarget)) {
      popup.countdownTarget = Math.max(0, data.countdownTarget);
    }

    return popup;
  }

  // ===== PUBLIC API =====
  return {
    // Configuration
    ...CONFIG,
    
    // Core utilities
    sanitiseTextInput,
    isSafeCssColor,
    clampValue,
    
    // Specialized clamp functions
    clampDurationSeconds,
    clampIntervalSeconds, 
    clampScaleValue,
    clampPopupScaleValue,
    clampSlateRotationSeconds,
    
    // Normalization functions
    normalisePosition,
    normaliseMode,
    normaliseTheme,
    normaliseHighlightList,
    normaliseServerBase,
    sanitiseMessages,
    normaliseOverlayData,
    normalisePopupData,
    
    // Aliases for backward compatibility
    normaliseServerBaseUrl: normaliseServerBase,
    isSafeColour: isSafeCssColor
  };
});