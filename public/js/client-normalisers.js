(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./shared-utils.js'),
      require('./shared-config.js')
    );
  } else {
    const exports = factory(
      (root && root.TickerShared) || {},
      (root && root.SharedConfig) || {}
    );
    root.TickerClientNormalisers = exports;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function (sharedUtils = {}, sharedConfig = {}) {
  const {
    MAX_TICKER_MESSAGES: SHARED_MAX_TICKER_MESSAGES,
    MAX_TICKER_MESSAGE_LENGTH: SHARED_MAX_MESSAGE_LENGTH,
    MAX_POPUP_DURATION_SECONDS: SHARED_MAX_POPUP_SECONDS,
    MAX_SCENE_NAME_LENGTH: SHARED_MAX_SCENE_NAME_LENGTH,
    MAX_SLATE_TITLE_LENGTH: SHARED_MAX_SLATE_TITLE_LENGTH,
    MAX_SLATE_TEXT_LENGTH: SHARED_MAX_SLATE_TEXT_LENGTH,
    MAX_SLATE_NOTES: SHARED_MAX_SLATE_NOTES,
    sanitiseMessages: sharedSanitiseMessages
  } = sharedUtils || {};

  const MAX_MESSAGES = Number.isFinite(SHARED_MAX_TICKER_MESSAGES)
    ? SHARED_MAX_TICKER_MESSAGES
    : 50;
  const MAX_MESSAGE_LENGTH = Number.isFinite(SHARED_MAX_MESSAGE_LENGTH)
    ? SHARED_MAX_MESSAGE_LENGTH
    : 280;
  const MAX_POPUP_SECONDS = Number.isFinite(SHARED_MAX_POPUP_SECONDS)
    ? SHARED_MAX_POPUP_SECONDS
    : 600;
  const MAX_SCENE_NAME_LENGTH = Number.isFinite(SHARED_MAX_SCENE_NAME_LENGTH)
    ? SHARED_MAX_SCENE_NAME_LENGTH
    : 80;
  const MAX_SLATE_TITLE_LENGTH = Number.isFinite(SHARED_MAX_SLATE_TITLE_LENGTH)
    ? SHARED_MAX_SLATE_TITLE_LENGTH
    : 64;
  const MAX_SLATE_TEXT_LENGTH = Number.isFinite(SHARED_MAX_SLATE_TEXT_LENGTH)
    ? SHARED_MAX_SLATE_TEXT_LENGTH
    : 200;
  const MAX_SLATE_NOTES = Number.isFinite(SHARED_MAX_SLATE_NOTES)
    ? SHARED_MAX_SLATE_NOTES
    : 6;

  const themeOptions = (() => {
    if (Array.isArray(sharedUtils.OVERLAY_THEMES) && sharedUtils.OVERLAY_THEMES.length) {
      return sharedUtils.OVERLAY_THEMES.slice();
    }
    if (Array.isArray(sharedConfig.OVERLAY_THEMES) && sharedConfig.OVERLAY_THEMES.length) {
      const seen = new Set();
      return sharedConfig.OVERLAY_THEMES
        .map(entry => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
        .filter(theme => {
          if (!theme || seen.has(theme)) return false;
          seen.add(theme);
          return true;
        });
    }
    return [];
  })();
  const themeSet = new Set(themeOptions);

  const defaultHighlights = Array.isArray(sharedConfig.DEFAULT_HIGHLIGHTS) && sharedConfig.DEFAULT_HIGHLIGHTS.length
    ? sharedConfig.DEFAULT_HIGHLIGHTS.slice()
    : ['live', 'breaking', 'alert', 'update', 'tonight', 'today'];

  const defaultHighlightString = typeof sharedConfig.DEFAULT_HIGHLIGHT_STRING === 'string'
    && sharedConfig.DEFAULT_HIGHLIGHT_STRING.trim()
      ? sharedConfig.DEFAULT_HIGHLIGHT_STRING.trim()
      : defaultHighlights.join(', ');

  const defaultOverlay = Object.freeze({
    label: 'LIVE',
    accent: '#38bdf8',
    accentSecondary: '#f472b6',
    highlight: defaultHighlightString,
    scale: 1.75,
    popupScale: 1,
    position: 'bottom',
    mode: 'auto',
    accentAnim: true,
    sparkle: true,
    theme: 'midnight-glass',
    ...(sharedConfig.DEFAULT_OVERLAY || {})
  });

  const defaultPopup = Object.freeze({
    text: '',
    isActive: false,
    durationSeconds: null,
    countdownEnabled: false,
    countdownTarget: null,
    ...(sharedConfig.DEFAULT_POPUP || {})
  });

  const defaultSlateSource = {
    isEnabled: true,
    rotationSeconds: 12,
    showClock: true,
    clockLabel: 'UK TIME',
    clockSubtitle: 'UK time',
    nextLabel: 'Next up',
    nextTitle: '',
    nextSubtitle: '',
    sponsorName: '',
    sponsorTagline: '',
    sponsorLabel: 'Sponsor',
    notesLabel: 'Spotlight',
    notes: [],
    ...(sharedConfig.DEFAULT_SLATE || {})
  };

  const normaliseSlateNotesImpl = typeof sharedUtils.normaliseSlateNotes === 'function'
    ? (value, limit = MAX_SLATE_NOTES, maxLength = MAX_SLATE_TEXT_LENGTH) => sharedUtils.normaliseSlateNotes(value, limit, maxLength)
    : function fallbackSlateNotes(value, limit = MAX_SLATE_NOTES, maxLength = MAX_SLATE_TEXT_LENGTH) {
        const list = Array.isArray(value)
          ? value
          : String(value || '')
              .split(/\r?\n|[,;]/)
              .map(entry => entry.trim());
        const cleaned = [];
        for (const entry of list) {
          if (!entry) continue;
          const trimmed = String(entry).trim().slice(0, maxLength);
          if (!trimmed) continue;
          cleaned.push(trimmed);
          if (cleaned.length >= limit) break;
        }
        return cleaned;
      };

  const defaultSlate = Object.freeze({
    ...defaultSlateSource,
    rotationSeconds: clampSlateRotation(defaultSlateSource.rotationSeconds, 12),
    clockSubtitle: typeof defaultSlateSource.clockSubtitle === 'string'
      ? defaultSlateSource.clockSubtitle.trim().slice(0, MAX_SLATE_TEXT_LENGTH)
      : 'UK time',
    notes: normaliseSlateNotesImpl(defaultSlateSource.notes, MAX_SLATE_NOTES, MAX_SLATE_TEXT_LENGTH),
    updatedAt: null
  });

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

  function clampDuration(value, fallback = 5) {
    if (typeof sharedUtils.clampDurationSeconds === 'function') {
      return sharedUtils.clampDurationSeconds(value, fallback);
    }
    return clampNumber(value, 2, 90, fallback, 0);
  }

  function clampInterval(value, fallback = 60) {
    if (typeof sharedUtils.clampIntervalSeconds === 'function') {
      return sharedUtils.clampIntervalSeconds(value, fallback);
    }
    return clampNumber(value, 0, 3600, fallback, 0);
  }

  function clampScale(value, fallback = defaultOverlay.scale || 1.75) {
    if (typeof sharedUtils.clampScaleValue === 'function') {
      return sharedUtils.clampScaleValue(value, fallback);
    }
    return clampNumber(value, 0.75, 2.5, fallback, 2);
  }

  function clampPopupScale(value, fallback = defaultOverlay.popupScale || 1) {
    if (typeof sharedUtils.clampPopupScaleValue === 'function') {
      return sharedUtils.clampPopupScaleValue(value, fallback);
    }
    return clampNumber(value, 0.6, 1.5, fallback, 2);
  }

  function clampSlateRotation(value, fallback = defaultSlate.rotationSeconds || 12) {
    if (typeof sharedUtils.clampSlateRotationSeconds === 'function') {
      return sharedUtils.clampSlateRotationSeconds(value, fallback);
    }
    return clampNumber(value, 4, 900, fallback, 0);
  }

  function isSafeColour(value) {
    if (typeof sharedUtils.isSafeCssColor === 'function') {
      return sharedUtils.isSafeCssColor(value);
    }
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(value || ''));
  }

  function normaliseHighlightInput(value) {
    if (typeof sharedUtils.normaliseHighlightList === 'function') {
      return sharedUtils.normaliseHighlightList(value);
    }
    return String(value || '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .join(', ');
  }

  const sanitiseMessages = typeof sharedSanitiseMessages === 'function'
    ? function sanitiseMessages(list, options = {}) {
        return sharedSanitiseMessages(list, {
          maxMessages: MAX_MESSAGES,
          maxLength: MAX_MESSAGE_LENGTH,
          ...options
        });
      }
    : function sanitiseMessages(list, options = {}) {
        if (!Array.isArray(list)) {
          return options.includeMeta ? { messages: [], trimmed: 0, truncated: 0 } : [];
        }

        const {
          maxMessages = MAX_MESSAGES,
          maxLength = MAX_MESSAGE_LENGTH,
          includeMeta = false
        } = options;

        const cleaned = [];
        let trimmedCount = 0;
        let truncatedCount = 0;

        for (const entry of list) {
          let text = String(entry == null ? '' : entry).trim();
          if (!text) continue;

          if (cleaned.length >= maxMessages) {
            truncatedCount += 1;
            continue;
          }

          if (text.length > maxLength) {
            text = text.slice(0, maxLength);
            trimmedCount += 1;
          }

          cleaned.push(text);
        }

        if (includeMeta) {
          return { messages: cleaned, trimmed: trimmedCount, truncated: truncatedCount };
        }
        return cleaned;
      };

  function normaliseOverlayData(data, defaults = defaultOverlay) {
    const base = {
      ...defaults,
      highlight: defaults.highlight || defaultHighlightString
    };
    const result = { ...base };

    if (!data || typeof data !== 'object') {
      return result;
    }

    if (typeof data.label === 'string') {
      const trimmed = data.label.trim().slice(0, 48);
      if (trimmed) result.label = trimmed;
    }

    if (typeof data.accent === 'string') {
      const trimmed = data.accent.trim();
      if (!trimmed) {
        result.accent = '';
      } else if (trimmed.length <= 64 && isSafeColour(trimmed)) {
        result.accent = trimmed;
      }
    }

    if (typeof data.accentSecondary === 'string') {
      const trimmedSecondary = data.accentSecondary.trim();
      if (!trimmedSecondary) {
        result.accentSecondary = '';
      } else if (trimmedSecondary.length <= 64 && isSafeColour(trimmedSecondary)) {
        result.accentSecondary = trimmedSecondary;
      }
    }

    if (typeof data.highlight === 'string') {
      result.highlight = normaliseHighlightInput(data.highlight).slice(0, 512);
    }

    if (Number.isFinite(data.scale)) {
      result.scale = clampScale(data.scale, result.scale);
    }

    if (Number.isFinite(data.popupScale)) {
      result.popupScale = clampPopupScale(data.popupScale, result.popupScale);
    }

    if (typeof data.position === 'string') {
      result.position = typeof sharedUtils.normalisePosition === 'function'
        ? sharedUtils.normalisePosition(data.position)
        : (String(data.position).toLowerCase() === 'top' ? 'top' : 'bottom');
    }

    if (typeof data.mode === 'string') {
      result.mode = typeof sharedUtils.normaliseMode === 'function'
        ? sharedUtils.normaliseMode(data.mode)
        : (['auto', 'marquee', 'chunk'].includes(String(data.mode).toLowerCase())
            ? String(data.mode).toLowerCase()
            : 'auto');
    }

    if (typeof data.accentAnim === 'boolean') {
      result.accentAnim = data.accentAnim;
    }

    if (typeof data.sparkle === 'boolean') {
      result.sparkle = data.sparkle;
    }

    if (typeof data.theme === 'string') {
      const theme = typeof sharedUtils.normaliseTheme === 'function'
        ? sharedUtils.normaliseTheme(data.theme)
        : String(data.theme).trim().toLowerCase();
      if (theme && themeSet.has(theme)) {
        result.theme = theme;
      }
    }

    return result;
  }

  function normalisePopupData(data, defaults = defaultPopup, options = {}) {
    const { maxDurationSeconds = MAX_POPUP_SECONDS } = options;
    const result = {
      text: '',
      isActive: false,
      durationSeconds: null,
      countdownEnabled: false,
      countdownTarget: null,
      updatedAt: null
    };

    const applyDefaults = defaults && typeof defaults === 'object'
      ? defaults
      : defaultPopup;

    result.text = typeof applyDefaults.text === 'string' ? applyDefaults.text : '';
    result.isActive = !!applyDefaults.isActive && !!result.text;
    if (Number.isFinite(applyDefaults.durationSeconds) && applyDefaults.durationSeconds > 0) {
      result.durationSeconds = clampNumber(applyDefaults.durationSeconds, 1, maxDurationSeconds, null, 0);
    }
    if (Number.isFinite(applyDefaults.countdownTarget)) {
      result.countdownTarget = Math.round(applyDefaults.countdownTarget);
    }
    result.countdownEnabled = !!applyDefaults.countdownEnabled && Number.isFinite(result.countdownTarget) && !!result.text;
    const defaultUpdatedAtSource = applyDefaults && applyDefaults.updatedAt != null
      ? applyDefaults.updatedAt
      : applyDefaults._updatedAt;
    const defaultUpdatedAt = Number(defaultUpdatedAtSource);
    if (Number.isFinite(defaultUpdatedAt)) {
      result.updatedAt = defaultUpdatedAt;
    }

    if (!data || typeof data !== 'object') {
      if (!Number.isFinite(result.updatedAt)) {
        result.updatedAt = Date.now();
      }
      return result;
    }

    if (typeof data.text === 'string') {
      result.text = data.text.trim().slice(0, MAX_MESSAGE_LENGTH);
    }

    if (typeof data.isActive === 'boolean') {
      result.isActive = data.isActive;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'durationSeconds')) {
      const numeric = Number(data.durationSeconds);
      if (Number.isFinite(numeric) && numeric > 0) {
        result.durationSeconds = Math.max(1, Math.min(maxDurationSeconds, Math.round(numeric)));
      } else {
        result.durationSeconds = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(data, 'countdownEnabled')) {
      result.countdownEnabled = !!data.countdownEnabled;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'countdownTarget')) {
      const numeric = Number(data.countdownTarget);
      result.countdownTarget = Number.isFinite(numeric) ? Math.round(numeric) : null;
    }

    if (!result.text) {
      result.isActive = false;
      result.countdownEnabled = false;
      result.countdownTarget = null;
    }

    if (!Number.isFinite(result.countdownTarget)) {
      result.countdownTarget = null;
      result.countdownEnabled = false;
    } else {
      result.countdownEnabled = result.countdownEnabled && !!result.text;
    }

    const updatedAtSource = data.updatedAt != null ? data.updatedAt : data._updatedAt;
    const updatedAt = Number(updatedAtSource);
    result.updatedAt = Number.isFinite(updatedAt)
      ? updatedAt
      : (Number.isFinite(result.updatedAt) ? result.updatedAt : Date.now());

    return result;
  }

  function normaliseSlateNotesList(value) {
    return normaliseSlateNotesImpl(value, MAX_SLATE_NOTES, MAX_SLATE_TEXT_LENGTH);
  }

  function normaliseSlateData(data, defaults = defaultSlate) {
    const base = {
      ...defaults,
      notes: Array.isArray(defaults.notes) ? defaults.notes.slice(0, MAX_SLATE_NOTES) : []
    };

    const result = {
      ...base,
      notes: base.notes.slice()
    };

    if (!data || typeof data !== 'object') {
      return result;
    }

    if (typeof data.isEnabled === 'boolean') {
      result.isEnabled = data.isEnabled;
    }

    if (Number.isFinite(data.rotationSeconds)) {
      result.rotationSeconds = clampSlateRotation(data.rotationSeconds, result.rotationSeconds);
    }

    if (typeof data.showClock === 'boolean') {
      result.showClock = data.showClock;
    }

    if (typeof data.clockLabel === 'string') {
      result.clockLabel = data.clockLabel.trim().slice(0, MAX_SLATE_TITLE_LENGTH).trim();
    }

    if (typeof data.clockSubtitle === 'string') {
      result.clockSubtitle = data.clockSubtitle.trim().slice(0, MAX_SLATE_TEXT_LENGTH).trim();
    }

    if (typeof data.nextLabel === 'string') {
      result.nextLabel = data.nextLabel.trim().slice(0, MAX_SLATE_TITLE_LENGTH).trim();
    }

    if (typeof data.nextTitle === 'string') {
      result.nextTitle = data.nextTitle.trim().slice(0, MAX_SLATE_TITLE_LENGTH).trim();
    }

    if (typeof data.nextSubtitle === 'string') {
      result.nextSubtitle = data.nextSubtitle.trim().slice(0, MAX_SLATE_TEXT_LENGTH).trim();
    }

    if (typeof data.sponsorLabel === 'string') {
      result.sponsorLabel = data.sponsorLabel.trim().slice(0, MAX_SLATE_TITLE_LENGTH).trim();
    }

    if (typeof data.sponsorName === 'string') {
      result.sponsorName = data.sponsorName.trim().slice(0, MAX_SLATE_TITLE_LENGTH).trim();
    }

    if (typeof data.sponsorTagline === 'string') {
      result.sponsorTagline = data.sponsorTagline.trim().slice(0, MAX_SLATE_TEXT_LENGTH).trim();
    }

    if (typeof data.notesLabel === 'string') {
      result.notesLabel = data.notesLabel.trim().slice(0, MAX_SLATE_TITLE_LENGTH).trim();
    }

    if (Array.isArray(data.notes) || typeof data.notes === 'string') {
      result.notes = normaliseSlateNotesList(data.notes);
    }

    const slateUpdatedAtSource = data.updatedAt != null ? data.updatedAt : data._updatedAt;
    const updatedAt = Number(slateUpdatedAtSource);
    if (Number.isFinite(updatedAt)) {
      result.updatedAt = updatedAt;
    }

    return result;
  }

  function normaliseSceneEntry(entry, options = {}) {
    if (!entry || typeof entry !== 'object') return null;

    const {
      fallbackDisplayDuration = 5,
      fallbackIntervalSeconds = 60,
      maxMessages = MAX_MESSAGES,
      maxMessageLength = MAX_MESSAGE_LENGTH
    } = options;

    const name = String(entry.name || '').trim().slice(0, MAX_SCENE_NAME_LENGTH);
    if (!name) return null;

    const tickerSource = (entry.ticker && typeof entry.ticker === 'object') ? entry.ticker : entry;
    const tickerMessages = sanitiseMessages(tickerSource.messages || entry.messages || [], {
      maxMessages,
      maxLength: maxMessageLength
    });

    const displayDuration = clampDuration(
      tickerSource.displayDuration,
      fallbackDisplayDuration
    );

    const intervalBetween = clampInterval(
      tickerSource.intervalBetween,
      fallbackIntervalSeconds
    );

    const ticker = {
      messages: tickerMessages,
      displayDuration,
      intervalBetween,
      isActive: !!((tickerSource.isActive != null ? tickerSource.isActive : entry.isActive)) && tickerMessages.length > 0
    };

    const popup = normalisePopupData(entry.popup || {}, defaultPopup, options);

    let slate = null;
    if (entry.slate && typeof entry.slate === 'object') {
      const normalisedSlate = normaliseSlateData(entry.slate, defaultSlate);
      slate = {
        isEnabled: !!normalisedSlate.isEnabled,
        rotationSeconds: clampSlateRotation(normalisedSlate.rotationSeconds, normalisedSlate.rotationSeconds),
        showClock: !!normalisedSlate.showClock,
        clockLabel: normalisedSlate.clockLabel || '',
        nextLabel: normalisedSlate.nextLabel || '',
        nextTitle: normalisedSlate.nextTitle || '',
        nextSubtitle: normalisedSlate.nextSubtitle || '',
        sponsorLabel: normalisedSlate.sponsorLabel || '',
        sponsorName: normalisedSlate.sponsorName || '',
        sponsorTagline: normalisedSlate.sponsorTagline || '',
        notesLabel: normalisedSlate.notesLabel || '',
        notes: Array.isArray(normalisedSlate.notes)
          ? normalisedSlate.notes.slice(0, MAX_SLATE_NOTES)
          : []
      };
    }

    let overlay = null;
    if (entry.overlay && typeof entry.overlay === 'object') {
      const overlayKeys = [
        'label',
        'accent',
        'accentSecondary',
        'highlight',
        'scale',
        'popupScale',
        'position',
        'mode',
        'accentAnim',
        'sparkle',
        'theme'
      ];

      const normalisedOverlay = normaliseOverlayData(entry.overlay, defaultOverlay);
      for (const key of overlayKeys) {
        if (!Object.prototype.hasOwnProperty.call(entry.overlay, key)) continue;
        if (!(key in normalisedOverlay)) continue;
        const value = normalisedOverlay[key];
        if (value === undefined) continue;
        if (!overlay) overlay = {};
        overlay[key] = value;
      }

      if (!overlay && Object.prototype.hasOwnProperty.call(entry.overlay, 'theme')) {
        const rawTheme = entry.overlay.theme;
        if (typeof rawTheme === 'string') {
          const normalisedTheme = typeof sharedUtils.normaliseTheme === 'function'
            ? sharedUtils.normaliseTheme(rawTheme)
            : rawTheme.trim().toLowerCase();
          if (normalisedTheme && themeSet.has(normalisedTheme)) {
            overlay = { theme: normalisedTheme };
          }
        }
      }
    }

    const hasSlateContent = !!(slate && Object.keys(slate).length);
    if (!ticker.messages.length && !popup.text && !hasSlateContent) {
      return null;
    }

    const id = typeof entry.id === 'string' && entry.id.trim()
      ? entry.id
      : String(entry.id || 'scene');
    const sceneUpdatedAtSource = entry.updatedAt != null ? entry.updatedAt : entry._updatedAt;
    const updatedAtRaw = Number(sceneUpdatedAtSource);
    const updatedAt = Number.isFinite(updatedAtRaw) ? updatedAtRaw : Date.now();

    return { id, name, ticker, popup, overlay, slate, updatedAt };
  }

  return {
    DEFAULT_OVERLAY: defaultOverlay,
    DEFAULT_POPUP: defaultPopup,
    DEFAULT_SLATE: defaultSlate,
    DEFAULT_HIGHLIGHTS: defaultHighlights,
    DEFAULT_HIGHLIGHT_STRING: defaultHighlightString,
    THEME_OPTIONS: themeOptions,
    MAX_MESSAGES,
    MAX_MESSAGE_LENGTH,
    MAX_POPUP_SECONDS,
    MAX_SCENE_NAME_LENGTH,
    MAX_SLATE_TITLE_LENGTH,
    MAX_SLATE_TEXT_LENGTH,
    MAX_SLATE_NOTES,
    normaliseHighlightInput,
    normaliseOverlayData,
    normalisePopupData,
    normaliseSlateNotesList,
    normaliseSlateData,
    normaliseSceneEntry,
    sanitiseMessages,
    isSafeColour,
    clampDuration,
    clampInterval,
    clampSlateRotation
  };
});
