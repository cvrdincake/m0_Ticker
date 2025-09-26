(function (root, factory) {
  const exports = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root && typeof root === 'object') {
    root.TickerShared = exports;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function (root) {
  const sharedConfig = (() => {
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      try {
        return require('./shared-config.js');
      } catch (error) {
        // Fallback to any global configuration when the module loader is unavailable.
      }
    }
    if (root && typeof root === 'object' && root.SharedConfig) {
      return root.SharedConfig;
    }
    return {};
  })();

  const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const RGB_COLOR_RE = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|0?\.\d+|1(?:\.0+)?))?\s*\)$/i;
  const HSL_COLOR_RE = /^hsla?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*(0|0?\.\d+|1(?:\.0+)?))?\s*\)$/i;

  const MAX_TICKER_MESSAGES = 50;
  const MAX_TICKER_MESSAGE_LENGTH = 280;
  const MAX_POPUP_DURATION_SECONDS = 600;
  const MAX_SCENE_NAME_LENGTH = 80;
  const MAX_SLATE_TITLE_LENGTH = 64;
  const MAX_SLATE_TEXT_LENGTH = 200;
  const MAX_SLATE_NOTES = 6;

  const SAFE_COLOR_KEYWORDS = new Set([
    'white', 'black', 'silver', 'gray', 'grey', 'maroon', 'red', 'purple', 'fuchsia',
    'green', 'lime', 'olive', 'yellow', 'navy', 'blue', 'teal', 'aqua', 'orange',
    'gold', 'indigo', 'violet', 'pink', 'plum', 'salmon', 'coral', 'turquoise',
    'cyan', 'magenta', 'brown', 'chocolate', 'tan', 'beige', 'crimson',
    'tomato', 'mintcream', 'honeydew', 'lavender', 'rebeccapurple', 'transparent'
  ]);

  const OVERLAY_THEMES = (() => {
    const rawThemes = Array.isArray(sharedConfig.OVERLAY_THEMES)
      ? sharedConfig.OVERLAY_THEMES
      : [];

    const seen = new Set();
    const normalised = [];

    for (const entry of rawThemes) {
      if (typeof entry !== 'string') continue;
      const trimmed = entry.trim().toLowerCase();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      normalised.push(trimmed);
    }

    return Object.freeze(normalised);
  })();

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
      const trimmedEntry = String(entry ?? '').trim();
      if (!trimmedEntry) continue;
      const trimmed = trimmedEntry.slice(0, maxLength);
      if (!trimmed) continue;
      notes.push(trimmed);
      if (notes.length >= limit) break;
    }
    return notes;
  }

  function normaliseServerBase(value, fallbackOrigin) {
    const defaultFallback = (() => {
      if (typeof fallbackOrigin === 'string' && fallbackOrigin.trim()) {
        return fallbackOrigin.trim();
      }
      if (root && root.location && typeof root.location.origin === 'string') {
        return root.location.origin;
      }
      return 'http://127.0.0.1:3000';
    })();

    const sanitiseLooseBase = raw => {
      if (typeof raw !== 'string') return '';
      const trimmed = raw.trim();
      if (!trimmed) return '';
      return trimmed
        .replace(/\/ticker\/?$/i, '')
        .replace(/\/+$/, '');
    };

    const sanitisePathname = pathname => {
      if (typeof pathname !== 'string') return '';
      if (!pathname || pathname === '/') return '';
      let trimmed = pathname;
      if (!trimmed.startsWith('/')) {
        trimmed = `/${trimmed}`;
      }
      trimmed = trimmed.replace(/\/+$/, '');
      if (trimmed.toLowerCase().endsWith('/ticker')) {
        trimmed = trimmed.slice(0, -'/ticker'.length);
      }
      trimmed = trimmed.replace(/\/+$/, '');
      if (trimmed === '/' || trimmed === '') {
        return '';
      }
      return trimmed;
    };

    const fromUrl = url => {
      if (!url || typeof url.origin !== 'string') return null;
      const path = sanitisePathname(url.pathname || '');
      return path ? `${url.origin}${path}` : url.origin;
    };

    const attemptNormalise = raw => {
      if (!raw) return null;
      try {
        const parsed = new URL(raw, defaultFallback);
        return fromUrl(parsed);
      } catch (error) {
        return null;
      }
    };

    const input = typeof value === 'string' ? value.trim() : '';
    const candidate = input || defaultFallback;

    const normalised = attemptNormalise(candidate) || attemptNormalise(defaultFallback);
    if (normalised) {
      return normalised;
    }

    const fallbackClean = sanitiseLooseBase(defaultFallback);
    return fallbackClean || 'http://127.0.0.1:3000';
  }

  function sanitiseMessages(list, options = {}) {
    const includeMeta = !!options.includeMeta;
    if (!Array.isArray(list)) {
      return includeMeta ? { messages: [], trimmed: 0, truncated: 0 } : [];
    }

    const {
      strict = false,
      maxMessages = MAX_TICKER_MESSAGES,
      maxLength = MAX_TICKER_MESSAGE_LENGTH
    } = options;

    const cleaned = [];
    let trimmedCount = 0;
    let truncatedCount = 0;

    for (const entry of list) {
      let text = String(entry ?? '').trim();
      if (!text) continue;

      if (cleaned.length >= maxMessages) {
        if (strict) {
          throw new Error(`Too many ticker messages (maximum ${maxMessages}).`);
        }
        if (includeMeta) {
          truncatedCount += 1;
          continue;
        }
        break;
      }

      if (text.length > maxLength) {
        if (strict) {
          throw new Error(`Ticker messages must be ${maxLength} characters or fewer.`);
        }
        text = text.slice(0, maxLength);
        trimmedCount += 1;
      }

      cleaned.push(text);
    }

    if (includeMeta) {
      return { messages: cleaned, trimmed: trimmedCount, truncated: truncatedCount };
    }
    return cleaned;
  }

  return {
    OVERLAY_THEMES,
    MAX_TICKER_MESSAGES,
    MAX_TICKER_MESSAGE_LENGTH,
    MAX_POPUP_DURATION_SECONDS,
    MAX_SCENE_NAME_LENGTH,
    MAX_SLATE_TITLE_LENGTH,
    MAX_SLATE_TEXT_LENGTH,
    MAX_SLATE_NOTES,
    sanitiseMessages,
    normaliseServerBase,
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
