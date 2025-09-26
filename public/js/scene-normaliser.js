(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root && typeof root === 'object') {
    root.TickerScenes = exports;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  const DEFAULT_OVERLAY_KEYS = [
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

  function serialiseOverlayForScene(rawOverlay, options = {}) {
    if (!rawOverlay || typeof rawOverlay !== 'object') return null;

    const normaliseOverlayData = options.normaliseOverlayData;
    const allowedKeys = Array.isArray(options.overlayKeys) && options.overlayKeys.length
      ? options.overlayKeys
      : DEFAULT_OVERLAY_KEYS;
    const includeEmptyStrings = options.includeEmptyStrings !== false;

    const normalised = typeof normaliseOverlayData === 'function'
      ? normaliseOverlayData(rawOverlay)
      : { ...rawOverlay };

    const result = {};
    for (const key of allowedKeys) {
      if (!Object.prototype.hasOwnProperty.call(rawOverlay, key)) continue;
      if (!(key in normalised)) continue;
      const value = normalised[key];
      if (typeof value === 'string') {
        const stringValue = String(value);
        if (!includeEmptyStrings) {
          const trimmed = stringValue.trim();
          if (!trimmed) continue;
          result[key] = trimmed;
        } else {
          result[key] = stringValue;
        }
      } else if (value !== undefined) {
        result[key] = value;
      }
    }

    if (!Object.keys(result).length && Object.prototype.hasOwnProperty.call(rawOverlay, 'theme')) {
      const themeSource = typeof normaliseOverlayData === 'function'
        ? normaliseOverlayData({ theme: rawOverlay.theme })
        : { theme: rawOverlay.theme };
      if (themeSource && typeof themeSource.theme === 'string' && themeSource.theme) {
        result.theme = themeSource.theme;
      }
    }

    return Object.keys(result).length ? result : null;
  }

  function normaliseSceneEntry(entry, options = {}) {
    if (!entry || typeof entry !== 'object') return null;

    const maxNameLength = typeof options.maxNameLength === 'number' ? options.maxNameLength : 80;
    const getDisplayDuration = typeof options.getDisplayDuration === 'function'
      ? options.getDisplayDuration
      : () => options.displayDurationFallback ?? 5;
    const getIntervalMinutes = typeof options.getIntervalMinutes === 'function'
      ? options.getIntervalMinutes
      : () => options.intervalMinutesFallback ?? 0;
    const clampDuration = options.clampDuration;
    const clampIntervalSeconds = options.clampIntervalSeconds;
    const minutesToSeconds = typeof options.minutesToSeconds === 'function'
      ? options.minutesToSeconds
      : (value => Math.max(0, Math.min(3600, Math.round(Number(value || 0) * 60))));
    const sanitiseMessages = typeof options.sanitiseMessages === 'function'
      ? options.sanitiseMessages
      : (list => (Array.isArray(list) ? list.map(item => String(item || '').trim()).filter(Boolean) : []));
    const normalisePopupData = typeof options.normalisePopupData === 'function'
      ? options.normalisePopupData
      : (() => ({}));
    const normaliseSlateData = typeof options.normaliseSlateData === 'function'
      ? options.normaliseSlateData
      : (() => ({}));
    const clampSlateRotation = typeof options.clampSlateRotation === 'function'
      ? options.clampSlateRotation
      : (value => value);
    const maxSlateNotes = typeof options.maxSlateNotes === 'number' ? options.maxSlateNotes : 6;
    const generateId = typeof options.generateId === 'function'
      ? options.generateId
      : (() => 'scene');
    const now = typeof options.now === 'function' ? options.now : () => Date.now();

    const name = String(entry.name || '').trim().slice(0, maxNameLength);
    if (!name) return null;

    const tickerSource = (entry.ticker && typeof entry.ticker === 'object') ? entry.ticker : entry;
    const tickerMessages = sanitiseMessages(tickerSource.messages ?? entry.messages ?? []);

    const displayDurationInput = tickerSource.displayDuration ?? entry.displayDuration ?? getDisplayDuration();
    const displayDuration = typeof clampDuration === 'function'
      ? clampDuration(displayDurationInput)
      : (Number(displayDurationInput) || getDisplayDuration());

    const intervalRaw = tickerSource.intervalBetween ?? entry.intervalBetween;
    const fallbackIntervalSeconds = minutesToSeconds(getIntervalMinutes());
    const intervalSeconds = typeof clampIntervalSeconds === 'function'
      ? clampIntervalSeconds(intervalRaw, fallbackIntervalSeconds)
      : Math.max(0, Math.min(3600, Math.round(Number(intervalRaw ?? fallbackIntervalSeconds) || 0)));

    const ticker = {
      messages: tickerMessages,
      displayDuration,
      intervalBetween: intervalSeconds,
      isActive: !!(tickerSource.isActive ?? entry.isActive) && tickerMessages.length > 0
    };

    const popup = normalisePopupData(entry.popup || {});

    let slate = null;
    if (entry.slate && typeof entry.slate === 'object') {
      const normalisedSlate = normaliseSlateData(entry.slate);
      slate = {
        isEnabled: !!normalisedSlate.isEnabled,
        rotationSeconds: clampSlateRotation(normalisedSlate.rotationSeconds),
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
          ? normalisedSlate.notes.slice(0, maxSlateNotes)
          : []
      };
    }

    const overlay = serialiseOverlayForScene(entry.overlay, options);

    const id = String(entry.id || generateId());
    const updatedAtRaw = Number(entry.updatedAt ?? entry._updatedAt);
    const updatedAt = Number.isFinite(updatedAtRaw) ? updatedAtRaw : now();

    return {
      id,
      name,
      ticker,
      popup,
      overlay,
      slate,
      updatedAt
    };
  }

  return {
    serialiseOverlayForScene,
    normaliseSceneEntry
  };
});
