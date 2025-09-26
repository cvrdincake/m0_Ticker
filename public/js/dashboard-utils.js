(function () {
  const {
    clampDurationSeconds,
    clampIntervalSeconds,
    clampScaleValue,
    clampPopupScaleValue,
    clampSlateRotationSeconds,
    normaliseMode: sharedNormaliseMode,
    normalisePosition: sharedNormalisePosition,
    normaliseTheme: sharedNormaliseTheme,
    isSafeCssColor: sharedIsSafeCssColor
  } = window.TickerShared || {};

  const normaliserExports = window.TickerClientNormalisers || {};
  const {
    normaliseHighlightInput,
    normaliseOverlayData,
    normalisePopupData,
    normaliseSlateNotesList,
    normaliseSlateData,
    normaliseSceneEntry,
    sanitiseMessages
  } = normaliserExports;

  const ScenesModule = window.TickerScenes || {};
  const serialiseOverlayForSceneImpl = typeof ScenesModule.serialiseOverlayForScene === 'function'
    ? ScenesModule.serialiseOverlayForScene
    : null;

  const hasRandomUUID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';

  const SPECIAL_MAP = {
    '~~': 'rainbow',
    '%%': 'sparkle',
    '^^': 'bounce',
    '==': 'neon',
    '!!': 'glitch'
  };

  function normaliseThemeList(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const normalised = [];
    for (const entry of list) {
      if (typeof entry !== 'string') continue;
      const trimmed = entry.trim().toLowerCase();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      normalised.push(trimmed);
    }
    return normalised;
  }

  function generateClientId(prefix) {
    const base = hasRandomUUID
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    return prefix ? `${prefix}-${base}` : base;
  }

  function secondsToMinutes(seconds) {
    return Math.max(0, Math.min(60, Math.round((Number(seconds) || 0) * 100 / 60) / 100));
  }

  function minutesToSeconds(minutes) {
    const numeric = Number(minutes);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(3600, Math.round(numeric * 60)));
  }

  function isSafeColour(value) {
    if (typeof sharedIsSafeCssColor === 'function') {
      return sharedIsSafeCssColor(value);
    }
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(value || ''));
  }

  function parseHexForPicker(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    const match = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (!match) return null;
    const hex = match[1];
    if (hex.length === 3) {
      return `#${hex.split('').map(ch => `${ch}${ch}`).join('').toLowerCase()}`;
    }
    if (hex.length === 4) {
      const rgb = hex.slice(0, 3).split('').map(ch => `${ch}${ch}`).join('');
      return `#${rgb.toLowerCase()}`;
    }
    if (hex.length === 6) {
      return `#${hex.toLowerCase()}`;
    }
    if (hex.length === 8) {
      return `#${hex.slice(0, 6).toLowerCase()}`;
    }
    return null;
  }

  function clampSlateRotation(value, fallback = 12) {
    if (typeof clampSlateRotationSeconds === 'function') {
      return clampSlateRotationSeconds(value, fallback);
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(Math.max(Math.round(numeric), 4), 900);
  }

  function computeSlateVisibleSeconds(rotationSeconds, fallback = 12) {
    const rotation = clampSlateRotation(rotationSeconds, fallback);
    if (!Number.isFinite(rotation) || rotation <= 0) return 0;
    const candidate = rotation - 1;
    return Math.min(6, Math.max(2, candidate));
  }

  function computeSlateGapMs(rotationSeconds, fallback = 12) {
    const rotation = clampSlateRotation(rotationSeconds, fallback);
    if (!Number.isFinite(rotation) || rotation <= 0) return 0;
    const visibleSeconds = computeSlateVisibleSeconds(rotation, fallback);
    const totalMs = rotation * 1000;
    const visibleMs = visibleSeconds * 1000;
    return Math.max(1000, totalMs - visibleMs);
  }

  function serialiseSlateState(source, options = {}) {
    const {
      clampRotation = clampSlateRotation,
      maxSlateNotes = 6
    } = options;
    const normalise = options.normaliseSlateData || normaliseSlateData;
    const normalised = normalise(source);
    return {
      isEnabled: !!normalised.isEnabled,
      rotationSeconds: clampRotation(normalised.rotationSeconds, source?.rotationSeconds || 12),
      showClock: !!normalised.showClock,
      clockLabel: normalised.clockLabel || '',
      clockSubtitle: normalised.clockSubtitle || '',
      nextLabel: normalised.nextLabel || '',
      nextTitle: normalised.nextTitle || '',
      nextSubtitle: normalised.nextSubtitle || '',
      sponsorLabel: normalised.sponsorLabel || '',
      sponsorName: normalised.sponsorName || '',
      sponsorTagline: normalised.sponsorTagline || '',
      notesLabel: normalised.notesLabel || '',
      notes: Array.isArray(normalised.notes) ? normalised.notes.slice(0, maxSlateNotes) : []
    };
  }

  function buildSceneOverlayPayload(source, options = {}) {
    if (!source || typeof source !== 'object') return null;
    const normalise = options.normaliseOverlayData || normaliseOverlayData;
    const overlayKeys = Array.isArray(options.overlayKeys) && options.overlayKeys.length
      ? options.overlayKeys
      : ['label', 'accent', 'accentSecondary', 'highlight', 'scale', 'popupScale', 'position', 'mode', 'accentAnim', 'sparkle', 'theme'];
    const serialise = options.serialiseOverlayForScene || serialiseOverlayForSceneImpl;
    const includeEmptyStrings = options.includeEmptyStrings === true;

    if (serialise) {
      return serialise(source, {
        normaliseOverlayData: normalise,
        overlayKeys,
        includeEmptyStrings
      });
    }

    const normalised = normalise(source);
    const result = {};
    let hasValue = false;

    for (const key of overlayKeys) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      if (!(key in normalised)) continue;
      const value = normalised[key];
      if (value === undefined) continue;
      if (!includeEmptyStrings && value === '') continue;
      result[key] = value;
      hasValue = true;
    }

    if (!hasValue && Object.prototype.hasOwnProperty.call(source, 'theme')) {
      const themeOnly = normalise({ theme: source.theme });
      if (themeOnly && typeof themeOnly.theme === 'string' && themeOnly.theme) {
        result.theme = themeOnly.theme;
        hasValue = true;
      }
    }

    return hasValue ? result : null;
  }

  function deriveSlateCardsForPreview(slate, options = {}) {
    const normalise = options.normaliseSlateData || normaliseSlateData;
    const maxTitleLength = options.maxTitleLength || 64;
    const maxTextLength = options.maxTextLength || 200;
    const clockLabel = options.clockLabel || 'UK TIME';
    const clockSubtitle = options.clockSubtitle || 'UK time';
    const notesLabel = options.notesLabel || 'Spotlight';

    const cards = [];
    const activeSlate = normalise(slate);

    const pushCard = (type, pill, title, subtitle = '') => {
      const safeTitle = typeof title === 'string' ? title.trim().slice(0, maxTitleLength) : '';
      const safeSubtitle = typeof subtitle === 'string' ? subtitle.trim().slice(0, maxTextLength) : '';
      if (!safeTitle && !safeSubtitle) return;
      cards.push({
        type,
        pill: pill && typeof pill === 'string' ? pill.trim() : '',
        title: safeTitle,
        subtitle: safeSubtitle,
        meta: ''
      });
    };

    if (activeSlate.showClock) {
      const now = new Date();
      const time = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Europe/London'
      });
      cards.push({
        type: 'clock',
        pill: (activeSlate.clockLabel || clockLabel).trim(),
        title: time,
        subtitle: (activeSlate.clockSubtitle || clockSubtitle).trim(),
        meta: ''
      });
    }

    if (activeSlate.nextTitle || activeSlate.nextSubtitle) {
      pushCard(
        'next',
        activeSlate.nextLabel || 'Next up',
        activeSlate.nextTitle || activeSlate.nextLabel || 'Next up',
        activeSlate.nextSubtitle || ''
      );
    }

    if (activeSlate.sponsorName) {
      pushCard(
        'sponsor',
        activeSlate.sponsorLabel || 'Sponsor',
        activeSlate.sponsorName,
        activeSlate.sponsorTagline || ''
      );
    }

    if (Array.isArray(activeSlate.notes)) {
      for (const note of activeSlate.notes) {
        pushCard('note', activeSlate.notesLabel || notesLabel, note, '');
      }
    }

    return cards;
  }

  function normaliseBrbData(data, maxLength = 280) {
    const raw = typeof data?.text === 'string' ? data.text : '';
    const text = raw.trim().slice(0, maxLength);
    const isActive = !!data?.isActive && !!text;
    const updatedAtRaw = Number(data?._updatedAt ?? data?.updatedAt);
    return {
      text,
      isActive,
      updatedAt: Number.isFinite(updatedAtRaw) ? updatedAtRaw : null
    };
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, match => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[match]);
  }

  function applyEmphasis(html) {
    return html
      .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, (match, prefix, inner) => `${prefix}<em>${inner}</em>`);
  }

  function applyHighlights(html, highlightRegex) {
    if (!highlightRegex) return html;
    return html.replace(highlightRegex, '<span class="highlight">$1</span>');
  }

  function buildLetters(text) {
    let index = 0;
    let result = '';
    for (const char of text) {
      if (/\s/.test(char)) {
        result += escapeHtml(char);
      } else {
        result += `<span class="fx-letter" style="--i:${index++}">${escapeHtml(char)}</span>`;
      }
    }
    return result;
  }

  function renderSegment(type, text, highlightRegex) {
    const clean = escapeHtml(text);
    switch (type) {
      case 'rainbow':
        return `<span class="fx fx-rainbow">${buildLetters(text)}</span>`;
      case 'sparkle':
        return `<span class="fx fx-sparkle">${buildLetters(text)}</span>`;
      case 'bounce':
        return `<span class="fx fx-bounce">${clean}</span>`;
      case 'neon':
        return `<span class="fx fx-neon">${clean}</span>`;
      case 'glitch':
        return `<span class="fx fx-glitch" data-text="${clean}">${clean}</span>`;
      default: {
        const emphasised = applyEmphasis(clean);
        return applyHighlights(emphasised, highlightRegex);
      }
    }
  }

  function formatMessage(raw, options = {}) {
    const { highlightRegex = null, specialMap = SPECIAL_MAP } = options;
    const str = String(raw || '').trim();
    if (!str) return '';
    const segments = [];
    const regex = /(%%|~~|\^\^|==|!!)([\s\S]+?)\1/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(str))) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', text: str.slice(lastIndex, match.index) });
      }
      const mapped = specialMap[match[1]] || 'text';
      segments.push({ type: mapped, text: match[2] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < str.length) {
      segments.push({ type: 'text', text: str.slice(lastIndex) });
    }
    return segments.map(seg => renderSegment(seg.type, seg.text, highlightRegex)).join('');
  }

  function registerTextAnimationPlugins() {
    if (typeof window === 'undefined' || typeof gsap === 'undefined' || typeof SplitText === 'undefined') {
      return false;
    }
    if (!registerTextAnimationPlugins._registered) {
      const plugins = [SplitText];
      if (typeof ScrambleTextPlugin !== 'undefined') {
        plugins.push(ScrambleTextPlugin);
      }
      if (plugins.length) {
        gsap.registerPlugin(...plugins);
      }
      registerTextAnimationPlugins._registered = true;
    }
    return true;
  }

  function createTextAnimator(headerEl, bodyEls = []) {
    if (!headerEl) return null;
    if (!registerTextAnimationPlugins()) return null;
    const groups = Array.isArray(bodyEls) ? bodyEls : [bodyEls];
    const activeBodies = groups.filter(el => el && typeof el.textContent === 'string' && el.textContent.trim().length);
    let headerSplit;
    let bodySplit;
    try {
      headerSplit = SplitText.create(headerEl, { type: 'chars', mask: 'chars' });
      if (activeBodies.length) {
        bodySplit = SplitText.create(activeBodies, { type: 'lines', mask: 'lines' });
      }
    } catch (err) {
      console.warn('[dashboard] text animation setup failed', err);
      return null;
    }

    const headerChars = Array.isArray(headerSplit?.chars) ? headerSplit.chars : [];
    const bodyLines = Array.isArray(bodySplit?.lines) ? bodySplit.lines : [];
    const timeline = gsap.timeline({ paused: true });
    const scrambleConfig = typeof ScrambleTextPlugin !== 'undefined' ? { text: '#', speed: 0.15 } : null;

    timeline.from(headerChars, {
      filter: 'blur(6px)',
      y: '-15%',
      opacity: 0,
      scale: 0.95,
      duration: 1.2,
      ease: 'power2.out',
      ...(scrambleConfig ? { scrambleText: scrambleConfig } : {}),
      stagger: { each: 0.3, from: 'left' }
    });

    if (bodyLines.length) {
      timeline.from(bodyLines, {
        filter: 'blur(10px)',
        delay: 0.55,
        opacity: 0,
        scale: 0.95,
        y: '100%',
        duration: 0.55,
        ease: 'power1.out'
      }, '-=0.9');
    }

    timeline.to(headerChars, {
      opacity: 1,
      y: '0%',
      duration: 0.2
    });

    const playIn = () => new Promise(resolve => {
      timeline.eventCallback('onComplete', () => {
        timeline.eventCallback('onComplete', null);
        resolve();
      });
      timeline.play(0);
    });

    const playOut = () => new Promise(resolve => {
      const outTimeline = gsap.timeline({
        defaults: { ease: 'power2.in', duration: 0.45 },
        onComplete: resolve
      });
      outTimeline.to(headerChars, {
        filter: 'blur(6px)',
        y: '-15%',
        opacity: 0,
        scale: 0.95,
        stagger: { each: 0.12, from: 'right' }
      });
      if (bodyLines.length) {
        outTimeline.to(bodyLines, {
          filter: 'blur(10px)',
          opacity: 0,
          y: '100%',
          duration: 0.4
        }, '<');
      }
    });

    const revert = () => {
      try {
        bodySplit?.revert();
        headerSplit?.revert();
      } catch (err) {
        console.warn('[dashboard] text animation revert failed', err);
      }
    };

    return {
      playIn() {
        return playIn();
      },
      playOut() {
        timeline.pause(0);
        timeline.kill();
        return playOut().finally(() => {
          revert();
        });
      },
      kill() {
        timeline.kill();
        revert();
      }
    };
  }

  function clampDuration(value, fallback) {
    if (typeof clampDurationSeconds === 'function') {
      return clampDurationSeconds(value, fallback);
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(Math.max(Math.round(numeric), 2), 90);
  }

  function clampMinutesValue(value, currentValue) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return currentValue;
    if (typeof clampIntervalSeconds === 'function') {
      const seconds = clampIntervalSeconds(minutesToSeconds(numeric), minutesToSeconds(currentValue));
      return secondsToMinutes(seconds);
    }
    return Math.max(0, Math.min(60, Math.round(numeric * 100) / 100));
  }

  function formatMinutesValue(value, currentValue) {
    const numeric = clampMinutesValue(value, currentValue);
    if (numeric === 0) return '0';
    const fixed = numeric.toFixed(2);
    return fixed.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  }

  function formatDurationSeconds(value, maxSeconds = 600) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return '';
    const seconds = Math.max(1, Math.min(maxSeconds, Math.round(numeric)));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }

  function parseCountdownTarget(value) {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.round(numeric);
    }
    const parsed = new Date(raw);
    const ms = parsed.getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  function formatCountdownLabel(targetMs) {
    const numeric = Number(targetMs);
    if (!Number.isFinite(numeric)) return '';
    const diff = Math.round(numeric - Date.now());
    if (diff <= 0) return 'now';
    const seconds = Math.floor(diff / 1000);
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} min${minutes === 1 ? '' : 's'}`;
    }
    const clampedSeconds = Math.max(1, seconds);
    return `${clampedSeconds}s`;
  }

  function formatDatetimeLocal(timestamp) {
    const numeric = Number(timestamp);
    if (!Number.isFinite(numeric)) return '';
    const date = new Date(numeric);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  window.TickerDashboardUtils = {
    SPECIAL_MAP,
    normaliseThemeList,
    generateClientId,
    secondsToMinutes,
    minutesToSeconds,
    isSafeColour,
    parseHexForPicker,
    clampSlateRotation,
    computeSlateVisibleSeconds,
    computeSlateGapMs,
    serialiseSlateState,
    buildSceneOverlayPayload,
    deriveSlateCardsForPreview,
    normaliseBrbData,
    escapeHtml,
    formatMessage,
    createTextAnimator,
    clampDuration,
    clampMinutesValue,
    formatMinutesValue,
    formatDurationSeconds,
    parseCountdownTarget,
    formatCountdownLabel,
    formatDatetimeLocal,
    normaliseOverlayData,
    normalisePopupData,
    normaliseSlateNotesList,
    normaliseSlateData,
    normaliseSceneEntry,
    normaliseHighlightInput,
    sanitiseMessages,
    clampScaleValue,
    clampPopupScaleValue,
    sharedNormaliseMode,
    sharedNormalisePosition,
    sharedNormaliseTheme
  };
})();
