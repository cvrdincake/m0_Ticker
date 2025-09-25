(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root && typeof root === 'object') {
    root.TickerShared = exports;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const RGB_COLOR_RE = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|0?\.\d+|1(?:\.0+)?))?\s*\)$/i;
  const HSL_COLOR_RE = /^hsla?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*(0|0?\.\d+|1(?:\.0+)?))?\s*\)$/i;

  const SAFE_COLOR_KEYWORDS = new Set([
    'white', 'black', 'silver', 'gray', 'grey', 'maroon', 'red', 'purple', 'fuchsia',
    'green', 'lime', 'olive', 'yellow', 'navy', 'blue', 'teal', 'aqua', 'orange',
    'gold', 'indigo', 'violet', 'pink', 'plum', 'salmon', 'coral', 'turquoise',
    'cyan', 'magenta', 'brown', 'chocolate', 'tan', 'beige', 'crimson',
    'tomato', 'mintcream', 'honeydew', 'lavender', 'rebeccapurple', 'transparent'
  ]);

  const OVERLAY_THEMES = [
    'holographic',
    'liquid-glass',
    'neural',
    'quantum',
    'crystalline',
    'neon-noir',
    'monotone'
  ];

  function clampNumber(value, min, max, fallback, precision) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    const clamped = Math.min(Math.max(numeric, min), max);
    if (typeof precision === 'number') {
      const factor = Math.pow(10, precision);
      return Math.round(clamped * factor) / factor;
    }
    return Math.round(clamped);
  }

  function clampDurationSeconds(value, fallback) {
    return clampNumber(value, 2, 90, fallback, 0);
  }

  function clampIntervalSeconds(value, fallback) {
    return clampNumber(value, 0, 3600, fallback, 0);
  }

  function clampScaleValue(value, fallback) {
    return clampNumber(value, 0.75, 2.5, fallback, 2);
  }

  function clampPopupScaleValue(value, fallback) {
    return clampNumber(value, 0.6, 1.5, fallback, 2);
  }

  function clampSlateRotationSeconds(value, fallback) {
    return clampNumber(value, 4, 900, fallback, 0);
  }

  function normaliseHighlightList(value) {
    return String(value || '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .join(', ');
  }

  function normalisePosition(value) {
    const lower = String(value || '').toLowerCase();
    return lower === 'top' ? 'top' : 'bottom';
  }

  function normaliseMode(value) {
    const lower = String(value || '').toLowerCase();
    return ['auto', 'marquee', 'chunk'].includes(lower) ? lower : 'auto';
  }

  function normaliseTheme(value) {
    if (typeof value !== 'string') return null;
    const lower = value.trim().toLowerCase();
    return OVERLAY_THEMES.includes(lower) ? lower : null;
  }

  function isValidAlpha(value) {
    if (value === undefined) return true;
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1;
  }

  function isSafeCssColor(value) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 64) return false;
    if (HEX_COLOR_RE.test(trimmed)) return true;
    const lower = trimmed.toLowerCase();
    if (SAFE_COLOR_KEYWORDS.has(lower)) return true;

    const rgbMatch = trimmed.match(RGB_COLOR_RE);
    if (rgbMatch) {
      const components = [rgbMatch[1], rgbMatch[2], rgbMatch[3]].map(Number);
      if (components.every(component => Number.isFinite(component) && component >= 0 && component <= 255) && isValidAlpha(rgbMatch[4])) {
        return true;
      }
    }

    const hslMatch = trimmed.match(HSL_COLOR_RE);
    if (hslMatch) {
      const h = Number(hslMatch[1]);
      const s = Number(hslMatch[2]);
      const l = Number(hslMatch[3]);
      if (
        Number.isFinite(h) && h >= 0 && h <= 360 &&
        Number.isFinite(s) && s >= 0 && s <= 100 &&
        Number.isFinite(l) && l >= 0 && l <= 100 &&
        isValidAlpha(hslMatch[4])
      ) {
        return true;
      }
    }

    return false;
  }

  function normaliseSlateNotes(value, limit = 6, maxLength = 160) {
    const raw = Array.isArray(value)
      ? value
      : String(value || '')
          .split(/\r?\n|[,;]/)
          .map(part => part.trim());
    const notes = [];
    for (const entry of raw) {
      if (!entry) continue;
      const trimmed = entry.slice(0, maxLength);
      if (!trimmed) continue;
      notes.push(trimmed);
      if (notes.length >= limit) break;
    }
    return notes;
  }

  return {
    OVERLAY_THEMES,
    clampDurationSeconds,
    clampIntervalSeconds,
    clampScaleValue,
    clampPopupScaleValue,
    clampSlateRotationSeconds,
    normaliseHighlightList,
    normalisePosition,
    normaliseMode,
    normaliseTheme,
    normaliseSlateNotes,
    isSafeCssColor
  };
});
