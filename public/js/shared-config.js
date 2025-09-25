(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root && typeof root === 'object') {
    root.SharedConfig = exports;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  const DEFAULT_HIGHLIGHTS = Object.freeze([
    'live',
    'breaking',
    'alert',
    'update',
    'tonight',
    'today'
  ]);

  const DEFAULT_HIGHLIGHT_STRING = DEFAULT_HIGHLIGHTS.join(',');

  const DEFAULT_OVERLAY = Object.freeze({
    label: 'LIVE',
    accent: '#ef4444',
    highlight: DEFAULT_HIGHLIGHT_STRING,
    scale: 1.75,
    popupScale: 1,
    position: 'bottom',
    mode: 'auto',
    accentAnim: true,
    sparkle: true,
    theme: 'monotone'
  });

  const DEFAULT_POPUP = Object.freeze({
    text: '',
    isActive: false,
    durationSeconds: null,
    countdownEnabled: false,
    countdownTarget: null
  });

  const DEFAULT_SLATE = Object.freeze({
    isEnabled: true,
    rotationSeconds: 12,
    showClock: true,
    clockLabel: 'UK TIME',
    nextLabel: 'Next up',
    nextTitle: '',
    nextSubtitle: '',
    sponsorName: '',
    sponsorTagline: '',
    sponsorLabel: 'Sponsor',
    notesLabel: 'Spotlight',
    notes: Object.freeze([])
  });

  return {
    DEFAULT_OVERLAY,
    DEFAULT_POPUP,
    DEFAULT_SLATE,
    DEFAULT_HIGHLIGHTS,
    DEFAULT_HIGHLIGHT_STRING
  };
});
