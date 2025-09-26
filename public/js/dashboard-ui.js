(function () {
const utils = window.TickerDashboardUtils || {};
const sync = window.TickerDashboardSync || {};

const {
  normaliseThemeList,
  generateClientId,
  normaliseOverlayData,
  normalisePopupData,
  normaliseSlateNotesList,
  normaliseSlateData,
  normaliseSceneEntry,
  sanitiseMessages,
  clampScaleValue,
  clampPopupScaleValue,
  sharedNormaliseMode,
  sharedNormalisePosition,
  sharedNormaliseTheme,
  clampDuration,
  clampMinutesValue,
  formatMinutesValue,
  formatDurationSeconds,
  parseCountdownTarget,
  formatCountdownLabel,
  formatDatetimeLocal,
  secondsToMinutes,
  minutesToSeconds,
  parseHexForPicker,
  isSafeColour,
  clampSlateRotation,
  computeSlateGapMs,
  computeSlateVisibleSeconds,
  serialiseSlateState,
  deriveSlateCardsForPreview,
  normaliseBrbData,
  formatMessage,
  createTextAnimator,
  buildSceneOverlayPayload,
  normaliseHighlightInput
} = utils;

const sharedConfigWindow = window.SharedConfig || {};
const sharedModule = window.TickerShared || {};
const OVERLAY_THEMES = sharedModule.OVERLAY_THEMES;

const normaliserExports = window.TickerClientNormalisers || {};
const {
  DEFAULT_OVERLAY: BASE_DEFAULT_OVERLAY,
  DEFAULT_POPUP: BASE_DEFAULT_POPUP,
  DEFAULT_SLATE: BASE_DEFAULT_SLATE,
  DEFAULT_HIGHLIGHTS: BASE_DEFAULT_HIGHLIGHTS,
  DEFAULT_HIGHLIGHT_STRING: BASE_DEFAULT_HIGHLIGHT_STRING,
  THEME_OPTIONS: BASE_THEME_OPTIONS,
  MAX_MESSAGES: EXPORTED_MAX_MESSAGES,
  MAX_MESSAGE_LENGTH: EXPORTED_MAX_MESSAGE_LENGTH,
  MAX_POPUP_SECONDS: EXPORTED_MAX_POPUP_SECONDS,
  MAX_SLATE_TITLE_LENGTH: EXPORTED_MAX_SLATE_TITLE_LENGTH,
  MAX_SLATE_TEXT_LENGTH: EXPORTED_MAX_SLATE_TEXT_LENGTH,
  MAX_SLATE_NOTES: EXPORTED_MAX_SLATE_NOTES
} = normaliserExports;



const STORAGE_KEY = 'ticker-dashboard-v3';
const MAX_MESSAGES = EXPORTED_MAX_MESSAGES || 50;
const MAX_MESSAGE_LENGTH = EXPORTED_MAX_MESSAGE_LENGTH || 280;
const MAX_POPUP_SECONDS = EXPORTED_MAX_POPUP_SECONDS || 600;
const MAX_SLATE_TITLE_LENGTH = EXPORTED_MAX_SLATE_TITLE_LENGTH || 64;
const MAX_SLATE_TEXT_LENGTH = EXPORTED_MAX_SLATE_TEXT_LENGTH || 200;
const MAX_SLATE_NOTES = EXPORTED_MAX_SLATE_NOTES || 6;
const MAX_HIGHLIGHT_LENGTH = 512;
const HIGHLIGHT_WARNING_THRESHOLD = 32;
const MAX_BRB_LENGTH = 280;
const MESSAGE_PLACEHOLDER = 'Add a ticker message…';
const THEME_OPTIONS = Array.isArray(BASE_THEME_OPTIONS) && BASE_THEME_OPTIONS.length
    ? BASE_THEME_OPTIONS.slice()
    : (Array.isArray(OVERLAY_THEMES) && OVERLAY_THEMES.length
        ? OVERLAY_THEMES.slice()
        : normaliseThemeList(sharedConfigWindow.OVERLAY_THEMES));
const THEME_CLASSNAMES = THEME_OPTIONS.map(theme => `ticker--${theme}`);
const MAX_PRESET_NAME_LENGTH = 80;
const MAX_SCENE_NAME_LENGTH = 80;

const SCENE_OVERLAY_KEYS = [
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
const sceneOverlayOptions = { overlayKeys: SCENE_OVERLAY_KEYS, includeEmptyStrings: false };
const slateSerialiseOptions = {
  normaliseSlateData,
  clampRotation: value => clampSlateRotation(value, DEFAULT_SLATE.rotationSeconds || 12),
  maxSlateNotes: MAX_SLATE_NOTES
};

const sharedConfig = window.SharedConfig || {};
const DEFAULT_HIGHLIGHTS = Array.isArray(BASE_DEFAULT_HIGHLIGHTS) && BASE_DEFAULT_HIGHLIGHTS.length
  ? BASE_DEFAULT_HIGHLIGHTS.slice()
  : (Array.isArray(sharedConfig.DEFAULT_HIGHLIGHTS) && sharedConfig.DEFAULT_HIGHLIGHTS.length
      ? sharedConfig.DEFAULT_HIGHLIGHTS.slice()
      : ['live', 'breaking', 'alert', 'update', 'tonight', 'today']);
const DEFAULT_HIGHLIGHT_STRING = typeof BASE_DEFAULT_HIGHLIGHT_STRING === 'string' && BASE_DEFAULT_HIGHLIGHT_STRING.trim()
  ? BASE_DEFAULT_HIGHLIGHT_STRING
  : (typeof sharedConfig.DEFAULT_HIGHLIGHT_STRING === 'string' && sharedConfig.DEFAULT_HIGHLIGHT_STRING.trim()
      ? sharedConfig.DEFAULT_HIGHLIGHT_STRING
      : DEFAULT_HIGHLIGHTS.join(', '));

const DEFAULT_OVERLAY = {
  label: 'LIVE',
  accent: '#38bdf8',
  accentSecondary: '#f472b6',
  highlight: DEFAULT_HIGHLIGHT_STRING,
  scale: 1.75,
  popupScale: 1,
  position: 'bottom',
  mode: 'auto',
  accentAnim: true,
  sparkle: true,
  theme: 'midnight-glass',
  ...(BASE_DEFAULT_OVERLAY || {}),
  ...(sharedConfig.DEFAULT_OVERLAY || {})
};
if (!DEFAULT_OVERLAY.highlight) {
  DEFAULT_OVERLAY.highlight = DEFAULT_HIGHLIGHT_STRING;
}

const DEFAULT_ACCENT = DEFAULT_OVERLAY.accent && DEFAULT_OVERLAY.accent.trim()
  ? DEFAULT_OVERLAY.accent.trim()
  : '#38bdf8';
const DEFAULT_ACCENT_SECONDARY = DEFAULT_OVERLAY.accentSecondary && DEFAULT_OVERLAY.accentSecondary.trim()
  ? DEFAULT_OVERLAY.accentSecondary.trim()
  : '';
const ACCENT_FALLBACK_HEX = parseHexForPicker(DEFAULT_ACCENT) || '#38bdf8';
const ACCENT_SECONDARY_FALLBACK_HEX = DEFAULT_ACCENT_SECONDARY
  ? (parseHexForPicker(DEFAULT_ACCENT_SECONDARY) || ACCENT_FALLBACK_HEX)
  : ACCENT_FALLBACK_HEX;
const ACCENT_HINT_DEFAULT = 'Accepts hex (#ff0000), rgb(a), hsl(a), or named colours.';
const ACCENT_SECONDARY_HINT_DEFAULT = 'Optional second highlight used by Duotone Fusion and blended gradients.';
const ACCENT_MAX_LENGTH = 64;
const PRESET_NAME_HINT = 'Preset names can be up to 80 characters.';

const DEFAULT_STATE = {
  isActive: false,
  messages: [],
  displayDuration: 5,
  intervalMinutes: 0,
  updatedAt: null
};

const DEFAULT_POPUP = {
  text: '',
  isActive: false,
  durationSeconds: null,
  countdownEnabled: false,
  countdownTarget: null,
  ...(BASE_DEFAULT_POPUP || {}),
  ...(sharedConfig.DEFAULT_POPUP || {}),
  updatedAt: null
};

const DEFAULT_SLATE_TEMPLATE = {
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
  ...(BASE_DEFAULT_SLATE || {}),
  ...(sharedConfig.DEFAULT_SLATE || {})
};

const DEFAULT_SLATE_NORMALISED = normaliseSlateData(DEFAULT_SLATE_TEMPLATE);
const DEFAULT_SLATE = {
  ...DEFAULT_SLATE_NORMALISED,
  notes: Array.isArray(DEFAULT_SLATE_NORMALISED.notes) ? [...DEFAULT_SLATE_NORMALISED.notes] : [],
  updatedAt: null
};

const DEFAULT_BRB = {
  text: 'Be Right Back',
  isActive: false,
  updatedAt: null
};



let state = { ...DEFAULT_STATE };
let overlayPrefs = { ...DEFAULT_OVERLAY };
let popupState = { ...DEFAULT_POPUP };
let slateState = { ...DEFAULT_SLATE };
let brbState = { ...DEFAULT_BRB };
let presets = [];
let scenes = [];
let editingIndex = -1;
let editingDraft = '';
let pendingPresetMessage = null;
let lastPreviewUrl = '';
let previewUpdateTimer = null;

const el = {
  overlayChip: document.getElementById('overlayUrlChip'),
  overlayText: document.getElementById('overlayUrlText'),
  serverUrl: document.getElementById('serverUrl'),
  stateExport: document.getElementById('exportState'),
  stateImport: document.getElementById('importState'),
  stateImportInput: document.getElementById('importStateInput'),
  statusServer: document.getElementById('statusServer'),
  statusActive: document.getElementById('statusActive'),
  statusActiveText: document.getElementById('statusActiveText'),
  statusCount: document.getElementById('statusMessageCount'),
  statusUpdated: document.getElementById('statusUpdated'),
  autoStart: document.getElementById('autoStart'),
  duration: document.getElementById('displayDuration'),
  interval: document.getElementById('intervalMinutes'),
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  overlayLabel: document.getElementById('overlayLabel'),
  overlayAccent: document.getElementById('overlayAccent'),
  overlayAccentPicker: document.getElementById('overlayAccentPicker'),
  overlayAccentGroup: document.getElementById('overlayAccentGroup'),
  overlayAccentHint: document.getElementById('overlayAccentHint'),
  overlayAccentSecondary: document.getElementById('overlayAccentSecondary'),
  overlayAccentSecondaryPicker: document.getElementById('overlayAccentSecondaryPicker'),
  overlayAccentSecondaryGroup: document.getElementById('overlayAccentSecondaryGroup'),
  overlayAccentSecondaryHint: document.getElementById('overlayAccentSecondaryHint'),
  highlightWords: document.getElementById('highlightWords'),
  highlightWordsHint: document.getElementById('highlightWordsHint'),
  scaleRange: document.getElementById('scaleRange'),
  scaleNumber: document.getElementById('scaleNumber'),
  popupScaleRange: document.getElementById('popupScaleRange'),
  popupScaleNumber: document.getElementById('popupScaleNumber'),
  positionButtons: document.getElementById('positionButtons'),
  modeButtons: document.getElementById('modeButtons'),
  themeButtons: document.getElementById('themeButtons'),
  accentAnim: document.getElementById('accentAnimToggle'),
  sparkle: document.getElementById('sparkleToggle'),
  openOverlay: document.getElementById('openOverlay'),
  copyOverlay: document.getElementById('copyOverlay'),
  reloadPreview: document.getElementById('reloadPreview'),
  previewFrame: document.getElementById('overlayPreview'),
  messageForm: document.getElementById('messageForm'),
  newMessage: document.getElementById('newMessage'),
  addMessageButton: document.getElementById('addMessageButton'),
  clearMessages: document.getElementById('clearMessages'),
  exportMessages: document.getElementById('exportMessages'),
  importMessages: document.getElementById('importMessages'),
  messageList: document.getElementById('messageList'),
  presetName: document.getElementById('presetName'),
  savePreset: document.getElementById('savePreset'),
  presetList: document.getElementById('presetList'),
  sceneName: document.getElementById('sceneName'),
  saveScene: document.getElementById('saveScene'),
  sceneList: document.getElementById('sceneList'),
  toast: document.getElementById('toast'),
  popupText: document.getElementById('popupText'),
  popupActive: document.getElementById('popupActive'),
  popupPreview: document.getElementById('popupPreview'),
  popupMeta: document.getElementById('popupMeta'),
  popupDuration: document.getElementById('popupDuration'),
  popupCountdownEnabled: document.getElementById('popupCountdownEnabled'),
  popupCountdownTarget: document.getElementById('popupCountdownTarget'),
  popupPanel: document.getElementById('popupPanel'),
  popupActiveLabel: document.querySelector('#popupPanel .popup-toggle'),
  savePopup: document.getElementById('savePopup'),
  clearPopup: document.getElementById('clearPopup'),
  slateEnabled: document.getElementById('slateEnabled'),
  slateShowClock: document.getElementById('slateShowClock'),
  slateRotation: document.getElementById('slateRotation'),
  slateRotationNumber: document.getElementById('slateRotationNumber'),
  slateClockLabel: document.getElementById('slateClockLabel'),
  slateClockSubtitle: document.getElementById('slateClockSubtitle'),
  slateNextLabel: document.getElementById('slateNextLabel'),
  slateNextTitle: document.getElementById('slateNextTitle'),
  slateNextSubtitle: document.getElementById('slateNextSubtitle'),
  slateSponsorLabel: document.getElementById('slateSponsorLabel'),
  slateSponsorName: document.getElementById('slateSponsorName'),
  slateSponsorTagline: document.getElementById('slateSponsorTagline'),
  slateNotesLabel: document.getElementById('slateNotesLabel'),
  slateNotes: document.getElementById('slateNotes'),
  slateNotesHint: document.getElementById('slateNotesHint'),
  slatePreview: document.getElementById('slatePreview'),
  slatePreviewDots: document.getElementById('slatePreviewDots'),
  slatePreviewContent: document.getElementById('slatePreviewContent'),
  slatePreviewPill: document.querySelector('#slatePreviewContent .slate-preview-pill'),
  slatePreviewTitle: document.querySelector('#slatePreviewContent .slate-preview-title'),
  slatePreviewSubtitle: document.querySelector('#slatePreviewContent .slate-preview-subtitle'),
  slatePreviewMeta: document.querySelector('#slatePreviewContent .slate-preview-meta'),
  brbText: document.getElementById('brbText'),
  brbActive: document.getElementById('brbActive'),
  brbSave: document.getElementById('brbSave'),
  brbClear: document.getElementById('brbClear'),
  brbStatus: document.getElementById('brbStatus'),
  brbPanel: document.getElementById('brbPanel'),
  brbActiveLabel: document.querySelector('#brbPanel .brb-toggle'),
  statusBrb: document.getElementById('statusBrb'),
  statusBrbDot: document.getElementById('statusBrbDot'),
  presetModal: document.getElementById('presetMessageModal'),
  presetModalName: document.getElementById('presetModalName'),
  presetModalPreview: document.getElementById('presetModalPreview'),
  presetModalHint: document.getElementById('presetModalHint'),
  presetModalSave: document.getElementById('presetModalSave'),
  presetModalCancel: document.getElementById('presetModalCancel')
};

const compositeSlateNotesLimit = MAX_SLATE_NOTES * MAX_SLATE_TEXT_LENGTH;

if (el.slateClockLabel) el.slateClockLabel.maxLength = MAX_SLATE_TITLE_LENGTH;
if (el.slateClockSubtitle) el.slateClockSubtitle.maxLength = MAX_SLATE_TEXT_LENGTH;
if (el.slateNextLabel) el.slateNextLabel.maxLength = MAX_SLATE_TITLE_LENGTH;
if (el.slateNextTitle) el.slateNextTitle.maxLength = MAX_SLATE_TITLE_LENGTH;
if (el.slateNextSubtitle) el.slateNextSubtitle.maxLength = MAX_SLATE_TEXT_LENGTH;
if (el.slateSponsorLabel) el.slateSponsorLabel.maxLength = MAX_SLATE_TITLE_LENGTH;
if (el.slateSponsorName) el.slateSponsorName.maxLength = MAX_SLATE_TITLE_LENGTH;
if (el.slateSponsorTagline) el.slateSponsorTagline.maxLength = MAX_SLATE_TEXT_LENGTH;
if (el.slateNotesLabel) el.slateNotesLabel.maxLength = MAX_SLATE_TITLE_LENGTH;
if (el.slateNotes) el.slateNotes.maxLength = compositeSlateNotesLimit;
if (el.slateNotesHint) {
  el.slateNotesHint.textContent = `Up to ${MAX_SLATE_NOTES} lines (${MAX_SLATE_TEXT_LENGTH} characters each) rotate alongside the clock card.`;
}
if (el.sceneName) el.sceneName.maxLength = MAX_SCENE_NAME_LENGTH;

let saveTimer = null;
let overlaySaveTimer = null;
let overlaySaveInFlight = false;
let pendingOverlayPayload = null;
let popupSaveTimer = null;
let popupSaveInFlight = false;
let slateSaveTimer = null;
let slateSaveInFlight = false;
let pendingSlatePayload = null;
let slatePreviewTimer = null;
let slatePreviewDisplayTimer = null;
let slatePreviewClockTimer = null;
let slatePreviewIndex = 0;
let slatePreviewCards = [];
let popupPreviewCountdownTimer = null;
let popupPreviewCountdownTarget = null;
let popupPreviewAnimator = null;
let popupPreviewLastText = '';
let slatePreviewAnimator = null;
let brbSaveTimer = null;
let brbSaveInFlight = false;
let scenesSaveInFlight = false;
let pendingSceneMessage = null;
let highlightRegex = null;

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('show');
  clearTimeout(el.toast._hideTimer);
  el.toast._hideTimer = setTimeout(() => el.toast.classList.remove('show'), 1800);
}

function serverBase() {
  const value = (el.serverUrl.value || 'http://127.0.0.1:3000').trim();
  return value.replace(/\/?$/, '');
}

function setServerStatus(label, colour) {
  if (!el.statusServer) return;
  el.statusServer.textContent = label;
  if (colour) {
    el.statusServer.style.color = colour;
  }
}





















function clearSlatePreviewTimers() {
  if (slatePreviewTimer) {
    clearTimeout(slatePreviewTimer);
    slatePreviewTimer = null;
  }
  if (slatePreviewDisplayTimer) {
    clearTimeout(slatePreviewDisplayTimer);
    slatePreviewDisplayTimer = null;
  }
  stopSlatePreviewClock();
}

function startSlatePreviewClock(card) {
  stopSlatePreviewClock();
  if (!card || card.type !== 'clock') return;
  slatePreviewClockTimer = setInterval(() => {
    const cards = deriveSlateCardsForPreview(slateState, {
      normaliseSlateData,
      maxTitleLength: MAX_SLATE_TITLE_LENGTH,
      maxTextLength: MAX_SLATE_TEXT_LENGTH
    });
    slatePreviewCards = cards;
    if (!slateState.isEnabled || !cards.length) {
      updateSlatePreview();
      return;
    }
    if (slatePreviewIndex >= cards.length) {
      slatePreviewIndex = 0;
    }
    applySlatePreviewCard(cards[slatePreviewIndex], { updateDots: true, animate: false });
  }, 1000);
}

function stopSlatePreviewClock() {
  if (slatePreviewClockTimer) {
    clearInterval(slatePreviewClockTimer);
    slatePreviewClockTimer = null;
  }
}

function renderSlatePreviewDots() {
  if (!el.slatePreviewDots) return;
  if (!slateState.isEnabled || slatePreviewCards.length <= 1) {
    el.slatePreviewDots.innerHTML = '';
    return;
  }
  const dots = slatePreviewCards.map((_, index) => {
    const active = index === slatePreviewIndex ? ' is-active' : '';
    return `<button type="button" class="slate-preview-dot${active}" data-index="${index}" aria-label="Show slate card ${index + 1}"></button>`;
  }).join('');
  el.slatePreviewDots.innerHTML = dots;
}

function showSlatePreview() {
  if (el.slatePreview) {
    el.slatePreview.classList.add('is-visible');
  }
}

function hideSlatePreview() {
  if (el.slatePreview) {
    el.slatePreview.classList.remove('is-visible');
  }
  destroySlatePreviewAnimator();
}

function applySlatePreviewCard(card, { updateDots = true, animate = true } = {}) {
  if (!el.slatePreview || !el.slatePreviewContent || !card) return;
  destroySlatePreviewAnimator();
  el.slatePreview.classList.remove('is-empty');
  el.slatePreview.dataset.type = card.type || '';
  el.slatePreviewContent.dataset.type = card.type || '';
  if (el.slatePreviewPill) el.slatePreviewPill.textContent = card.pill || 'Slate';
  if (el.slatePreviewTitle) el.slatePreviewTitle.textContent = card.title || '';
  if (el.slatePreviewSubtitle) {
    if (card.subtitle) {
      el.slatePreviewSubtitle.textContent = card.subtitle;
      el.slatePreviewSubtitle.classList.remove('is-hidden');
    } else {
      el.slatePreviewSubtitle.textContent = '';
      el.slatePreviewSubtitle.classList.add('is-hidden');
    }
  }
  if (el.slatePreviewMeta) {
    if (card.meta) {
      el.slatePreviewMeta.textContent = card.meta;
      el.slatePreviewMeta.classList.remove('is-hidden');
    } else {
      el.slatePreviewMeta.textContent = '';
      el.slatePreviewMeta.classList.add('is-hidden');
    }
  }
  if (animate && el.slatePreviewContent) {
    el.slatePreviewContent.classList.remove('refresh');
    if (el.slatePreviewContent._refreshTimer) {
      clearTimeout(el.slatePreviewContent._refreshTimer);
      el.slatePreviewContent._refreshTimer = null;
    }
    void el.slatePreviewContent.offsetWidth;
    el.slatePreviewContent.classList.add('refresh');
    el.slatePreviewContent._refreshTimer = setTimeout(() => {
      el.slatePreviewContent.classList.remove('refresh');
      el.slatePreviewContent._refreshTimer = null;
    }, 400);
  }
  stopSlatePreviewClock();
  if (updateDots) {
    renderSlatePreviewDots();
  }
  if (card.type === 'clock') {
    startSlatePreviewClock(card);
  }
  if (animate && card.type !== 'clock') {
    const headerEl = el.slatePreviewTitle && el.slatePreviewTitle.textContent.trim() ? el.slatePreviewTitle : null;
    const bodyTargets = [];
    if (el.slatePreviewSubtitle && !el.slatePreviewSubtitle.classList.contains('is-hidden') && el.slatePreviewSubtitle.textContent.trim()) {
      bodyTargets.push(el.slatePreviewSubtitle);
    }
    if (el.slatePreviewMeta && !el.slatePreviewMeta.classList.contains('is-hidden') && el.slatePreviewMeta.textContent.trim()) {
      bodyTargets.push(el.slatePreviewMeta);
    }
    if (headerEl) {
      const animator = createTextAnimator(headerEl, bodyTargets);
      if (animator) {
        slatePreviewAnimator = animator;
        animator.playIn().catch(() => destroySlatePreviewAnimator());
      }
    }
  }
}

function playSlatePreviewCard(index = slatePreviewIndex, { animate = true, updateDots = true } = {}) {
  if (!slatePreviewCards.length) return;
  const rotationSeconds = clampSlateRotation(slateState.rotationSeconds);
  clearSlatePreviewTimers();
  const nextIndex = index % slatePreviewCards.length;
  slatePreviewIndex = nextIndex < 0 ? slatePreviewCards.length - 1 : nextIndex;
  applySlatePreviewCard(slatePreviewCards[slatePreviewIndex], { updateDots, animate });
  showSlatePreview();
  const visibleSeconds = computeSlateVisibleSeconds(rotationSeconds);
  if (visibleSeconds <= 0) {
    scheduleSlatePreviewNext(rotationSeconds);
    return;
  }
  slatePreviewDisplayTimer = setTimeout(() => {
    slatePreviewDisplayTimer = null;
    stopSlatePreviewClock();
    hideSlatePreview();
    scheduleSlatePreviewNext(rotationSeconds);
  }, visibleSeconds * 1000);
}

function scheduleSlatePreviewNext(rotationSeconds = clampSlateRotation(slateState.rotationSeconds)) {
  if (!slateState.isEnabled || slatePreviewCards.length === 0) return;
  const gapMs = computeSlateGapMs(rotationSeconds);
  slatePreviewTimer = setTimeout(() => {
    slatePreviewTimer = null;
    if (!slateState.isEnabled || slatePreviewCards.length === 0) return;
    slatePreviewIndex = (slatePreviewIndex + 1) % slatePreviewCards.length;
    playSlatePreviewCard(slatePreviewIndex, { animate: true, updateDots: true });
  }, gapMs > 0 ? gapMs : 1000);
}

function updateSlatePreview() {
  if (!el.slatePreview) return;
  clearSlatePreviewTimers();
  destroySlatePreviewAnimator();
  slatePreviewCards = deriveSlateCardsForPreview(slateState, {
    normaliseSlateData,
    maxTitleLength: MAX_SLATE_TITLE_LENGTH,
    maxTextLength: MAX_SLATE_TEXT_LENGTH
  });
  if (!slateState.isEnabled) {
    el.slatePreview.classList.add('is-disabled', 'is-empty');
    if (el.slatePreviewPill) el.slatePreviewPill.textContent = 'Slate disabled';
    if (el.slatePreviewTitle) el.slatePreviewTitle.textContent = 'Enable the segment slate to show rotating cards.';
    if (el.slatePreviewSubtitle) {
      el.slatePreviewSubtitle.textContent = 'Use the toggles above to reactivate the slate.';
      el.slatePreviewSubtitle.classList.remove('is-hidden');
    }
    if (el.slatePreviewMeta) {
      el.slatePreviewMeta.textContent = '';
      el.slatePreviewMeta.classList.add('is-hidden');
    }
    renderSlatePreviewDots();
    showSlatePreview();
    return;
  }
  el.slatePreview.classList.remove('is-disabled');
  if (!slatePreviewCards.length) {
    el.slatePreview.classList.add('is-empty');
    if (el.slatePreviewPill) el.slatePreviewPill.textContent = 'Segment slate';
    if (el.slatePreviewTitle) el.slatePreviewTitle.textContent = 'Add headline, sponsor, or spotlight notes to preview cards.';
    if (el.slatePreviewSubtitle) {
      el.slatePreviewSubtitle.textContent = 'Clock and highlight cards appear automatically when enabled.';
      el.slatePreviewSubtitle.classList.remove('is-hidden');
    }
    if (el.slatePreviewMeta) {
      el.slatePreviewMeta.textContent = 'Rotation preview';
      el.slatePreviewMeta.classList.remove('is-hidden');
    }
    renderSlatePreviewDots();
    showSlatePreview();
    return;
  }
  el.slatePreview.classList.remove('is-empty');
  if (slatePreviewIndex >= slatePreviewCards.length) {
    slatePreviewIndex = 0;
  }
  playSlatePreviewCard(slatePreviewIndex, { animate: false, updateDots: true });
}

function renderSlateControls() {
  if (el.slateEnabled) el.slateEnabled.checked = !!slateState.isEnabled;
  if (el.slateShowClock) el.slateShowClock.checked = !!slateState.showClock;
  const rotation = clampSlateRotation(slateState.rotationSeconds);
  if (el.slateRotation) el.slateRotation.value = rotation;
  if (el.slateRotationNumber) el.slateRotationNumber.value = rotation;
  if (el.slateClockLabel) el.slateClockLabel.value = slateState.clockLabel || '';
  if (el.slateClockSubtitle) el.slateClockSubtitle.value = slateState.clockSubtitle || '';
  if (el.slateNextLabel) el.slateNextLabel.value = slateState.nextLabel || '';
  if (el.slateNextTitle) el.slateNextTitle.value = slateState.nextTitle || '';
  if (el.slateNextSubtitle) el.slateNextSubtitle.value = slateState.nextSubtitle || '';
  if (el.slateSponsorLabel) el.slateSponsorLabel.value = slateState.sponsorLabel || '';
  if (el.slateSponsorName) el.slateSponsorName.value = slateState.sponsorName || '';
  if (el.slateSponsorTagline) el.slateSponsorTagline.value = slateState.sponsorTagline || '';
  if (el.slateNotesLabel) el.slateNotesLabel.value = slateState.notesLabel || '';
  if (el.slateNotes) el.slateNotes.value = Array.isArray(slateState.notes) ? slateState.notes.join('\n') : '';
  updateSlatePreview();
}

function updateSlateBoolean(key, value) {
  const next = !!value;
  if (slateState[key] === next) return;
  slateState = {
    ...slateState,
    [key]: next,
    updatedAt: Date.now()
  };
  updateSlatePreview();
  queueSlateSave();
}

function updateSlateRotationInput(value) {
  const clamped = clampSlateRotation(value);
  if (el.slateRotation && Number(el.slateRotation.value) !== clamped) {
    el.slateRotation.value = clamped;
  }
  if (el.slateRotationNumber && Number(el.slateRotationNumber.value) !== clamped) {
    el.slateRotationNumber.value = clamped;
  }
  if (slateState.rotationSeconds === clamped) return;
  slateState = {
    ...slateState,
    rotationSeconds: clamped,
    updatedAt: Date.now()
  };
  updateSlatePreview();
  queueSlateSave();
}

function updateSlateTextField(key, rawValue, limit) {
  const source = typeof rawValue === 'string' ? rawValue : '';
  const clipped = source.slice(0, limit);
  const trimmed = clipped.trim();
  if (slateState[key] === trimmed) {
    return trimmed;
  }
  slateState = {
    ...slateState,
    [key]: trimmed,
    updatedAt: Date.now()
  };
  updateSlatePreview();
  queueSlateSave();
  return trimmed;
}

function updateSlateNotes(rawValue) {
  const notes = normaliseSlateNotesList(rawValue);
  const previous = Array.isArray(slateState.notes) ? slateState.notes : [];
  const changed = notes.length !== previous.length || notes.some((note, index) => note !== previous[index]);
  if (!changed) return notes;
  slateState = {
    ...slateState,
    notes,
    updatedAt: Date.now()
  };
  updateSlatePreview();
  queueSlateSave();
  return notes;
}



function updateHighlightRegex() {
  const custom = (overlayPrefs.highlight || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const merged = Array.from(new Set([...DEFAULT_HIGHLIGHTS, ...custom]));
  const tokens = merged
    .map(entry => entry.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (!tokens.length) {
    highlightRegex = null;
    return;
  }
  const escaped = tokens
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const boundaryClass = '[\\p{L}\\p{N}_]';
  highlightRegex = escaped
    ? new RegExp(`(?<!${boundaryClass})(${escaped})(?!${boundaryClass})`, 'giu')
    : null;
}

















function updateOverlayChip() {
  const url = buildOverlayUrl();
  el.overlayText.textContent = url;
  el.overlayText.dataset.url = url;
  if (url !== lastPreviewUrl) {
    lastPreviewUrl = url;
    schedulePreviewUpdate(url);
  }
}

function buildOverlayUrl() {
  const basePath = `${location.origin}${location.pathname.replace(/index\.html$/, '')}output.html`;
  const params = new URLSearchParams();
  params.set('server', serverBase());
  params.set('label', overlayPrefs.label || 'LIVE');
  if (overlayPrefs.accent && isSafeColour(overlayPrefs.accent)) params.set('accent', overlayPrefs.accent);
  if (overlayPrefs.accentSecondary && isSafeColour(overlayPrefs.accentSecondary)) {
    params.set('accentSecondary', overlayPrefs.accentSecondary);
  }
  const highlights = (overlayPrefs.highlight || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .join(',');
  if (highlights) params.set('hl', highlights);
  params.set('scale', String(overlayPrefs.scale));
  params.set('popupScale', String(overlayPrefs.popupScale));
  params.set('position', overlayPrefs.position);
  params.set('mode', overlayPrefs.mode);
  params.set('theme', overlayPrefs.theme);
  if (!overlayPrefs.accentAnim) params.set('accentAnim', '0');
  if (!overlayPrefs.sparkle) params.set('sparkle', '0');
  return `${basePath}?${params.toString()}`;
}

function saveLocal() {
  const payload = {
    overlay: overlayPrefs,
    autoStart: el.autoStart.checked,
    serverUrl: el.serverUrl.value
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to save local preferences', err);
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.overlay) overlayPrefs = normaliseOverlayData({ ...overlayPrefs, ...parsed.overlay });
    if (typeof parsed.autoStart === 'boolean') el.autoStart.checked = parsed.autoStart;
    if (typeof parsed.serverUrl === 'string') el.serverUrl.value = parsed.serverUrl;
  } catch (err) {
    console.warn('Failed to read local preferences', err);
  }
}

function clearEditing() {
  editingIndex = -1;
  editingDraft = '';
}















function schedulePreviewUpdate(url) {
  if (!el.previewFrame) return;
  if (previewUpdateTimer) clearTimeout(previewUpdateTimer);
  previewUpdateTimer = setTimeout(() => {
    previewUpdateTimer = null;
    try {
      if (el.previewFrame.src !== url) {
        el.previewFrame.src = url;
      } else if (el.previewFrame.contentWindow) {
        el.previewFrame.contentWindow.location.replace(url);
      }
    } catch (err) {
      // Ignore navigation errors (cross-origin etc.) and fall back silently.
    }
  }, 180);
}

function renderTicker() {
  el.duration.value = state.displayDuration;
  el.interval.value = formatMinutesValue(state.intervalMinutes);
  el.statusActive.classList.toggle('active', state.isActive);
  el.statusActiveText.textContent = state.isActive ? 'Active' : 'Inactive';
  el.statusActiveText.classList.toggle('is-active', state.isActive);
  el.statusActiveText.classList.toggle('is-inactive', !state.isActive);
  const count = state.messages.length;
  const queueFull = count >= MAX_MESSAGES;
  el.statusCount.textContent = `${count}/${MAX_MESSAGES}`;
  el.statusCount.classList.toggle('is-full', queueFull);
  el.statusUpdated.textContent = state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString() : '–';
  updateQueueControls(queueFull);
}

function updateQueueControls(queueFull = state.messages.length >= MAX_MESSAGES) {
  if (el.newMessage) {
    el.newMessage.disabled = queueFull;
    el.newMessage.placeholder = queueFull
      ? `Queue full — max ${MAX_MESSAGES} messages`
      : MESSAGE_PLACEHOLDER;
  }
  if (el.addMessageButton) {
    el.addMessageButton.disabled = queueFull;
  }
}

function updateAccentInputsFromPrefs() {
  const accent = overlayPrefs.accent || '';
  if (el.overlayAccent) {
    el.overlayAccent.value = accent;
  }
  if (el.overlayAccentPicker) {
    el.overlayAccentPicker.value = parseHexForPicker(accent) || ACCENT_FALLBACK_HEX;
  }
  const secondary = overlayPrefs.accentSecondary || '';
  if (el.overlayAccentSecondary) {
    el.overlayAccentSecondary.value = secondary;
  }
  if (el.overlayAccentSecondaryPicker) {
    el.overlayAccentSecondaryPicker.value = parseHexForPicker(secondary) || ACCENT_SECONDARY_FALLBACK_HEX;
  }
}

function setAccentError(message) {
  const hasError = Boolean(message);
  if (el.overlayAccentGroup) {
    el.overlayAccentGroup.classList.toggle('has-error', hasError);
  }
  if (el.overlayAccentHint) {
    el.overlayAccentHint.textContent = hasError ? message : ACCENT_HINT_DEFAULT;
    el.overlayAccentHint.classList.toggle('is-error', hasError);
  }
}

function setAccentSecondaryError(message) {
  const hasError = Boolean(message);
  if (el.overlayAccentSecondaryGroup) {
    el.overlayAccentSecondaryGroup.classList.toggle('has-error', hasError);
  }
  if (el.overlayAccentSecondaryHint) {
    el.overlayAccentSecondaryHint.textContent = hasError ? message : ACCENT_SECONDARY_HINT_DEFAULT;
    el.overlayAccentSecondaryHint.classList.toggle('is-error', hasError);
  }
}

function updateHighlightHint(value) {
  if (!el.highlightWordsHint) return;
  const raw = typeof value === 'string'
    ? value
    : (el.highlightWords ? el.highlightWords.value : '');
  const remaining = Math.max(0, MAX_HIGHLIGHT_LENGTH - raw.length);
  const message = remaining === 0
    ? `Highlight words can be up to ${MAX_HIGHLIGHT_LENGTH} characters. Limit reached.`
    : `Highlight words can be up to ${MAX_HIGHLIGHT_LENGTH} characters. ${remaining} characters remaining.`;
  el.highlightWordsHint.textContent = message;
  el.highlightWordsHint.classList.toggle('is-warning', remaining <= HIGHLIGHT_WARNING_THRESHOLD);
}

function applyPreviewTheme() {
  if (!el.popupPreview) return;
  const theme = overlayPrefs.theme && THEME_OPTIONS.includes(overlayPrefs.theme)
    ? overlayPrefs.theme
    : THEME_OPTIONS[0];
  el.popupPreview.classList.remove(...THEME_CLASSNAMES);
  if (theme) {
    el.popupPreview.classList.add(`ticker--${theme}`);
  }
  if (overlayPrefs.accent && isSafeColour(overlayPrefs.accent)) {
    el.popupPreview.style.setProperty('--preview-accent', overlayPrefs.accent);
  } else {
    el.popupPreview.style.removeProperty('--preview-accent');
  }
  if (overlayPrefs.accentSecondary && isSafeColour(overlayPrefs.accentSecondary)) {
    el.popupPreview.style.setProperty('--preview-accent-secondary', overlayPrefs.accentSecondary);
  } else {
    el.popupPreview.style.removeProperty('--preview-accent-secondary');
  }
}

function renderOverlayControls() {
  el.overlayLabel.value = overlayPrefs.label;
  updateAccentInputsFromPrefs();
  setAccentError('');
  setAccentSecondaryError('');
  el.highlightWords.value = overlayPrefs.highlight;
  updateHighlightHint(overlayPrefs.highlight);
  el.scaleRange.value = overlayPrefs.scale;
  el.scaleNumber.value = overlayPrefs.scale;
  if (el.popupScaleRange) el.popupScaleRange.value = overlayPrefs.popupScale;
  if (el.popupScaleNumber) el.popupScaleNumber.value = overlayPrefs.popupScale;
  el.accentAnim.checked = overlayPrefs.accentAnim;
  el.sparkle.checked = overlayPrefs.sparkle;
  Array.from(el.positionButtons.querySelectorAll('.segment-button')).forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.position === overlayPrefs.position);
  });
  Array.from(el.modeButtons.querySelectorAll('.segment-button')).forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mode === overlayPrefs.mode);
  });
  if (el.themeButtons) {
    Array.from(el.themeButtons.querySelectorAll('.segment-button')).forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.theme === overlayPrefs.theme);
    });
  }
  applyPreviewTheme();
  renderPopupPreviewScale();
}

function renderMessages() {
  if (editingIndex >= state.messages.length) clearEditing();
  if (!state.messages.length) {
    clearEditing();
    el.messageList.innerHTML = '<div class="empty-state">No messages yet — add a line above or load a preset.</div>';
    return;
  }
  const rows = state.messages.map((msg, index) => {
    if (index === editingIndex) {
      const editorValue = editingDraft;
      const preview = formatMessage(editorValue, { highlightRegex });
      const previewHtml = preview || '<span class="small">Preview updates as you type.</span>';
      return `<div class="message-item is-editing" data-index="${index}">
        <div class="message-editor">
          <textarea class="message-edit-input" data-role="editor">${escapeHtml(editorValue)}</textarea>
          <div class="message-preview">${previewHtml}</div>
        </div>
        <div class="message-actions">
          <button type="button" data-action="save">Save</button>
          <button type="button" data-action="cancel">Cancel</button>
        </div>
      </div>`;
    }
    const formatted = formatMessage(msg, { highlightRegex });
    return `<div class="message-item" data-index="${index}">
      <div class="message-preview">${formatted}</div>
      <div class="message-actions">
        <button type="button" data-action="edit" title="Edit">Edit</button>
        <button type="button" data-action="save-preset" title="Save to presets">Save preset</button>
        <button type="button" data-action="up" title="Move up">↑</button>
        <button type="button" data-action="down" title="Move down">↓</button>
        <button type="button" data-action="delete" title="Remove">Delete</button>
      </div>
    </div>`;
  }).join('');
  el.messageList.innerHTML = rows;
  updateQueueControls();
}

function formatPresetMeta(preset) {
  const date = new Date(preset.updatedAt);
  const count = Array.isArray(preset.messages) ? preset.messages.length : 0;
  const parts = [];
  parts.push(count === 1 ? 'Single message' : `${count} messages`);
  parts.push(date.toLocaleString());
  return parts.join(' • ');
}

function renderPresets() {
  if (!presets.length) {
    el.presetList.innerHTML = '<div class="empty-state">No presets saved yet.</div>';
    return;
  }
  const cards = presets.map(preset => {
    return `<div class="preset-card" data-id="${preset.id}">
      <div>
        <div class="preset-title">${escapeHtml(preset.name)}</div>
        <div class="preset-meta">${formatPresetMeta(preset)}</div>
      </div>
      <div class="preset-actions">
        <button type="button" data-action="load">Load</button>
        <button type="button" data-action="append">Append</button>
        <button type="button" data-action="delete">Delete</button>
      </div>
      <div class="preset-hint">Ticker stays idle unless Auto-start is enabled or you press Start.</div>
    </div>`;
  }).join('');
  el.presetList.innerHTML = cards;
}

function formatSceneMeta(scene) {
  const parts = [];
  const messageCount = Array.isArray(scene?.ticker?.messages) ? scene.ticker.messages.length : 0;
  parts.push(`${messageCount} message${messageCount === 1 ? '' : 's'}`);
  if (typeof scene?.ticker?.displayDuration === 'number') {
    parts.push(`${scene.ticker.displayDuration}s on`);
  }
  if (typeof scene?.ticker?.intervalBetween === 'number') {
    const minutes = secondsToMinutes(scene.ticker.intervalBetween);
    parts.push(minutes ? `${formatMinutesValue(minutes)}m interval` : 'loop');
  }
  const popupText = scene?.popup?.text || '';
  if (popupText) {
    parts.push(scene.popup.isActive ? 'popup active' : 'popup ready');
  }
  if (scene?.overlay) {
    const overlayLabel = typeof scene.overlay.label === 'string'
      ? scene.overlay.label.trim()
      : '';
    if (overlayLabel) {
      parts.push(`label: ${overlayLabel}`);
    }
    if (scene.overlay.theme) {
      parts.push(`theme: ${scene.overlay.theme}`);
    }
    if (typeof scene.overlay.scale === 'number' && Number.isFinite(scene.overlay.scale)
      && scene.overlay.scale !== DEFAULT_OVERLAY.scale) {
      parts.push(`scale ${scene.overlay.scale}×`);
    }
    if (typeof scene.overlay.popupScale === 'number' && Number.isFinite(scene.overlay.popupScale)
      && scene.overlay.popupScale !== DEFAULT_OVERLAY.popupScale) {
      parts.push(`popup ${scene.overlay.popupScale}×`);
    }
    if (scene.overlay.mode && scene.overlay.mode !== DEFAULT_OVERLAY.mode) {
      parts.push(`mode: ${scene.overlay.mode}`);
    }
    if (scene.overlay.position && scene.overlay.position !== DEFAULT_OVERLAY.position) {
      parts.push(`${scene.overlay.position} overlay`);
    }
  }
  if (scene?.slate) {
    if (scene.slate.isEnabled) {
      parts.push('slate on');
      if (scene.slate.nextTitle) {
        const nextSummary = scene.slate.nextTitle.length > 32
          ? `${scene.slate.nextTitle.slice(0, 32)}…`
          : scene.slate.nextTitle;
        parts.push(`next: ${nextSummary}`);
      } else if (scene.slate.showClock) {
        parts.push('clock card');
      }
      if (scene.slate.sponsorName) {
        const sponsorSummary = scene.slate.sponsorName.length > 28
          ? `${scene.slate.sponsorName.slice(0, 28)}…`
          : scene.slate.sponsorName;
        parts.push(`sponsor: ${sponsorSummary}`);
      }
    } else {
      parts.push('slate off');
    }
  }
  const updatedAt = Number(scene?.updatedAt);
  if (Number.isFinite(updatedAt)) {
    parts.push(new Date(updatedAt).toLocaleString());
  }
  return parts.join(' • ');
}

function renderScenes() {
  if (!scenes.length) {
    el.sceneList.innerHTML = '<div class="empty-state">No scenes saved yet.</div>';
    return;
  }
  const cards = scenes.map(scene => {
    return `<div class="scene-card" data-id="${scene.id}">
      <div>
        <div class="scene-title">${escapeHtml(scene.name)}</div>
        <div class="scene-meta">${escapeHtml(formatSceneMeta(scene))}</div>
      </div>
      <div class="scene-actions">
        <button type="button" data-action="activate">Activate</button>
        <button type="button" data-action="replace">Replace</button>
        <button type="button" data-action="delete">Delete</button>
      </div>
    </div>`;
  }).join('');
  el.sceneList.innerHTML = cards;
}

function stopPopupPreviewCountdown() {
  if (popupPreviewCountdownTimer) {
    clearInterval(popupPreviewCountdownTimer);
    popupPreviewCountdownTimer = null;
  }
}

function refreshPopupPreviewCountdown() {
  if (!el.popupPreview) return true;
  const countdownEl = el.popupPreview.querySelector('[data-popup-countdown]');
  if (!countdownEl) return true;
  if (!Number.isFinite(popupPreviewCountdownTarget)) {
    countdownEl.textContent = '';
    return true;
  }
  const label = formatCountdownLabel(popupPreviewCountdownTarget);
  countdownEl.textContent = label;
  return label === 'now';
}

function startPopupPreviewCountdown() {
  stopPopupPreviewCountdown();
  if (!Number.isFinite(popupPreviewCountdownTarget)) return;
  const finished = refreshPopupPreviewCountdown();
  if (popupState.countdownEnabled) {
    updatePopupMeta();
  }
  if (finished) return;
  popupPreviewCountdownTimer = setInterval(() => {
    const done = refreshPopupPreviewCountdown();
    if (popupState.countdownEnabled) {
      updatePopupMeta();
    }
    if (done) {
      stopPopupPreviewCountdown();
      if (popupState.countdownEnabled) {
        updatePopupMeta();
      }
    }
  }, 1000);
}

function destroyPopupPreviewAnimator() {
  if (popupPreviewAnimator && typeof popupPreviewAnimator.kill === 'function') {
    try {
      popupPreviewAnimator.kill();
    } catch (err) {
      console.warn('[dashboard] popup preview animation cleanup failed', err);
    }
  }
  popupPreviewAnimator = null;
}

function destroySlatePreviewAnimator() {
  if (slatePreviewAnimator && typeof slatePreviewAnimator.kill === 'function') {
    try {
      slatePreviewAnimator.kill();
    } catch (err) {
      console.warn('[dashboard] slate preview animation cleanup failed', err);
    }
  }
  slatePreviewAnimator = null;
}

function updatePopupPreview() {
  if (!el.popupPreview) return;
  destroyPopupPreviewAnimator();
  stopPopupPreviewCountdown();
  popupPreviewCountdownTarget = null;
  const text = el.popupText.value.trim();
  const previous = popupPreviewLastText;
  let messageNode = null;
  let shouldAnimate = false;
  if (text) {
    el.popupPreview.innerHTML = '';
    el.popupPreview.classList.remove('is-empty');
    messageNode = document.createElement('div');
    messageNode.className = 'popup-preview-message';
    messageNode.innerHTML = formatMessage(text, { highlightRegex });
    el.popupPreview.appendChild(messageNode);
    shouldAnimate = text !== previous;
    if (el.popupCountdownEnabled && el.popupCountdownEnabled.checked) {
      const target = el.popupCountdownTarget ? parseCountdownTarget(el.popupCountdownTarget.value) : null;
      if (Number.isFinite(target)) {
        popupPreviewCountdownTarget = target;
        const countdownChip = document.createElement('span');
        countdownChip.className = 'popup-countdown-chip';
        countdownChip.dataset.popupCountdown = 'true';
        el.popupPreview.appendChild(countdownChip);
        startPopupPreviewCountdown();
      }
    }
    popupPreviewLastText = text;
  } else {
    popupPreviewLastText = '';
    el.popupPreview.textContent = 'Popup preview';
    el.popupPreview.classList.add('is-empty');
    if (el.popupCountdownEnabled) {
      el.popupCountdownEnabled.checked = false;
    }
    if (el.popupCountdownTarget) {
      el.popupCountdownTarget.disabled = true;
    }
  }
  if (el.popupCountdownTarget && el.popupCountdownEnabled) {
    const countdownActive = el.popupCountdownEnabled.checked;
    el.popupCountdownTarget.disabled = popupSaveInFlight || !countdownActive;
  }
  if (shouldAnimate && messageNode) {
    const animator = createTextAnimator(messageNode);
    if (animator) {
      popupPreviewAnimator = animator;
      animator.playIn().catch(() => destroyPopupPreviewAnimator());
    }
  }
}

function updatePopupMeta() {
  if (!el.popupMeta) return;
  const status = popupState.isActive && popupState.text ? 'Popup live' : 'Popup hidden';
  const durationLabel = formatDurationSeconds(popupState.durationSeconds, MAX_POPUP_SECONDS);
  const parts = [status];
  if (durationLabel) {
    parts.push(`Auto-hide ${durationLabel}`);
  }
  if (popupState.countdownEnabled && Number.isFinite(popupState.countdownTarget)) {
    parts.push(`Countdown ${formatCountdownLabel(popupState.countdownTarget)}`);
  }
  if (popupState.updatedAt) {
    parts.push(`Updated ${new Date(popupState.updatedAt).toLocaleTimeString()}`);
  }
  el.popupMeta.textContent = parts.join(' • ');
}

function renderPopupPreviewScale() {
  if (!el.popupPreview) return;
  el.popupPreview.style.setProperty('--popup-scale', String(overlayPrefs.popupScale));
  document.documentElement.style.setProperty('--popup-scale', String(overlayPrefs.popupScale));
}

function renderPopupControls() {
  if (!el.popupText) return;
  const isLive = popupState.isActive && !!popupState.text;
  if (el.popupPanel) el.popupPanel.classList.toggle('is-live', isLive);
  if (el.popupActiveLabel) el.popupActiveLabel.classList.toggle('is-live', isLive);
  el.popupText.value = popupState.text;
  el.popupActive.checked = isLive;
  if (el.popupDuration) {
    el.popupDuration.value = popupState.durationSeconds ? String(popupState.durationSeconds) : '';
  }
  if (el.popupCountdownEnabled) {
    const hasCountdown = popupState.countdownEnabled && Number.isFinite(popupState.countdownTarget);
    el.popupCountdownEnabled.checked = hasCountdown && !!popupState.text;
  }
  if (el.popupCountdownTarget) {
    el.popupCountdownTarget.value = popupState.countdownEnabled && Number.isFinite(popupState.countdownTarget)
      ? formatDatetimeLocal(popupState.countdownTarget)
      : '';
  }
  updatePopupPreview();
  updatePopupMeta();
  renderPopupPreviewScale();
  const disabled = popupSaveInFlight;
  el.popupText.disabled = disabled;
  el.popupActive.disabled = disabled;
  if (el.popupDuration) el.popupDuration.disabled = disabled;
  if (el.popupCountdownEnabled) el.popupCountdownEnabled.disabled = disabled;
  if (el.popupCountdownTarget) {
    const countdownEnabled = el.popupCountdownEnabled && el.popupCountdownEnabled.checked;
    el.popupCountdownTarget.disabled = disabled || !countdownEnabled;
  }
  if (el.savePopup) el.savePopup.disabled = disabled;
  if (el.clearPopup) el.clearPopup.disabled = disabled;
}

function renderBrbControls() {
  const isLive = brbState.isActive && !!brbState.text;
  if (el.brbPanel) el.brbPanel.classList.toggle('is-live', isLive);
  if (el.brbActiveLabel) el.brbActiveLabel.classList.toggle('is-live', isLive);
  if (el.brbText) {
    el.brbText.value = brbState.text;
    el.brbText.disabled = brbSaveInFlight;
  }
  if (el.brbActive) {
    el.brbActive.checked = isLive;
    el.brbActive.disabled = brbSaveInFlight;
  }
  if (el.brbSave) el.brbSave.disabled = brbSaveInFlight;
  if (el.brbClear) el.brbClear.disabled = brbSaveInFlight;

  if (el.brbStatus) {
    const parts = [];
    parts.push(isLive ? 'BRB live' : 'BRB hidden');
    if (brbState.updatedAt) {
      parts.push(`Updated ${new Date(brbState.updatedAt).toLocaleTimeString()}`);
    }
    el.brbStatus.textContent = parts.join(' • ');
  }

  const brbActive = isLive;
  if (el.statusBrb) {
    el.statusBrb.textContent = brbActive ? 'Active' : 'Hidden';
  }
  if (el.statusBrbDot) {
    el.statusBrbDot.classList.toggle('active', brbActive);
  }
}

function renderAll() {
  renderTicker();
  renderOverlayControls();
  updateHighlightRegex();
  renderPopupControls();
  renderBrbControls();
  renderMessages();
  renderPresets();
  updateOverlayChip();
  saveLocal();
}

function applyTickerData(payload) {
  if (!payload || typeof payload !== 'object') return;
  const nextStampRaw = Number(payload._updatedAt ?? payload.updatedAt);
  const hasStamp = Number.isFinite(nextStampRaw);
  if (hasStamp && typeof state.updatedAt === 'number' && state.updatedAt === nextStampRaw) {
    return;
  }

  const messages = sanitiseMessages(payload.messages || []);
  const messagesChanged = JSON.stringify(state.messages) !== JSON.stringify(messages);
  state.messages = messages;
  state.isActive = !!payload.isActive && state.messages.length > 0;
  state.displayDuration = clampDuration(payload.displayDuration ?? state.displayDuration);
  const incomingIntervalSeconds = Number.isFinite(payload.intervalBetween)
    ? payload.intervalBetween
    : minutesToSeconds(state.intervalMinutes);
  state.intervalMinutes = secondsToMinutes(incomingIntervalSeconds);
  state.updatedAt = hasStamp ? nextStampRaw : Date.now();
  if (!state.messages.length) state.isActive = false;
  if (messagesChanged) {
    clearEditing();
    renderMessages();
  }
  renderTicker();
}

function flushPendingOverlayPayload() {
  if (!pendingOverlayPayload || overlaySaveTimer || overlaySaveInFlight) return;
  const latest = pendingOverlayPayload;
  pendingOverlayPayload = null;
  applyOverlayData(latest);
}

function applyOverlayData(payload) {
  if (!payload || typeof payload !== 'object') return;
  if (overlaySaveTimer || overlaySaveInFlight) {
    pendingOverlayPayload = payload;
    return;
  }
  pendingOverlayPayload = null;
  overlayPrefs = normaliseOverlayData(payload);
  renderOverlayControls();
  updateHighlightRegex();
  renderSlateControls();
  renderMessages();
  renderPopupControls();
  updateOverlayChip();
  saveLocal();
}

function flushPendingSlatePayload() {
  if (!pendingSlatePayload || slateSaveTimer || slateSaveInFlight) return;
  const latest = pendingSlatePayload;
  pendingSlatePayload = null;
  applySlateData(latest);
}

function applySlateData(payload) {
  if (!payload || typeof payload !== 'object') return;
  if (slateSaveTimer || slateSaveInFlight) {
    pendingSlatePayload = payload;
    return;
  }
  pendingSlatePayload = null;
  const next = normaliseSlateData(payload);
  const stamp = Number(payload._updatedAt ?? payload.updatedAt);
  if (Number.isFinite(stamp) && Number.isFinite(slateState.updatedAt) && slateState.updatedAt === stamp) {
    return;
  }
  slateState = { ...next };
  renderSlateControls();
}

function applyPopupData(payload) {
  if (!payload || typeof payload !== 'object') return;
  popupState = normalisePopupData(payload);
  renderPopupControls();
}

function applyBrbData(payload) {
  if (!payload || typeof payload !== 'object') return;
  brbState = normaliseBrbData(payload);
  renderBrbControls();
}

function applyPresetsData(list) {
  if (!Array.isArray(list)) return;
  presets = list.map(entry => ({
    id: String(entry.id || generateClientId('preset')),
    name: String(entry.name || 'Preset'),
    messages: sanitiseMessages(entry.messages || []),
    updatedAt: Number(entry.updatedAt) || Date.now()
  }));
  renderPresets();
}

function applyScenesData(list) {
  if (!Array.isArray(list)) return;
  const mapped = [];
  for (const entry of list) {
    const normalised = normaliseSceneEntry(entry, {
      fallbackDisplayDuration: state.displayDuration,
      fallbackIntervalSeconds: minutesToSeconds(state.intervalMinutes),
      maxMessages: MAX_MESSAGES,
      maxMessageLength: MAX_MESSAGE_LENGTH
    });
    if (normalised) mapped.push(normalised);
  }
  scenes = mapped;
  renderScenes();
}

function handleAfterStateFetch({ silent }) {
  if (!silent) {
    renderOverlayControls();
    updateOverlayChip();
  }
}

sync.init({
  getServerBase: serverBase,
  setServerStatus,
  toast,
  applyTickerData,
  applyOverlayData,
  applyPopupData,
  applyBrbData,
  applySlateData,
  applyPresetsData,
  applyScenesData,
  afterStateFetch: handleAfterStateFetch
});

function fetchState({ silent = false } = {}) {
  return sync.fetchState({ silent });
}

function persistState() {
  const payload = {
    isActive: state.isActive,
    messages: state.messages,
    displayDuration: state.displayDuration,
    intervalBetween: minutesToSeconds(state.intervalMinutes)
  };
  return sync.persistState(payload);
}

function persistPresets(options = {}) {
  sync.persistPresets(presets, options);
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persistState();
  }, 250);
}

function queuePopupSave() {
  clearTimeout(popupSaveTimer);
  popupSaveTimer = setTimeout(() => {
    popupSaveTimer = null;
    void persistPopup();
  }, 220);
}

async function persistPopup() {
  const raw = el.popupText.value || '';
  const text = raw.trim().slice(0, 280);
  if (raw !== text) {
    el.popupText.value = text;
  }
  const isActive = el.popupActive.checked && !!text;
  el.popupActive.checked = isActive;

  let durationSeconds = popupState.durationSeconds;
  if (el.popupDuration) {
    const rawDuration = el.popupDuration.value.trim();
    if (!rawDuration) {
      durationSeconds = null;
    } else {
      const numeric = Number(rawDuration);
      if (Number.isFinite(numeric)) {
        const rounded = Math.round(numeric);
        const clamped = Math.max(0, Math.min(MAX_POPUP_SECONDS, rounded));
        durationSeconds = clamped > 0 ? clamped : null;
      } else {
        durationSeconds = null;
      }
    }
    const displayValue = durationSeconds ? String(durationSeconds) : '';
    if (el.popupDuration.value !== displayValue) {
      el.popupDuration.value = displayValue;
    }
  }

  let countdownEnabled = el.popupCountdownEnabled ? el.popupCountdownEnabled.checked : false;
  if (!text) {
    countdownEnabled = false;
  }
  let countdownTarget = popupState.countdownTarget;
  if (countdownEnabled) {
    const rawCountdown = el.popupCountdownTarget ? el.popupCountdownTarget.value : '';
    if (rawCountdown) {
      const parsedCountdown = parseCountdownTarget(rawCountdown);
      if (Number.isFinite(parsedCountdown)) {
        countdownTarget = parsedCountdown;
        if (el.popupCountdownTarget) {
          const formatted = formatDatetimeLocal(parsedCountdown);
          if (formatted) {
            el.popupCountdownTarget.value = formatted;
          }
        }
      } else {
        countdownEnabled = false;
        countdownTarget = null;
        toast('Enter a valid countdown target');
      }
    } else if (!Number.isFinite(countdownTarget)) {
      countdownEnabled = false;
      countdownTarget = null;
      toast('Select a countdown target time');
    }
  } else {
    countdownTarget = null;
  }
  if (el.popupCountdownEnabled && !countdownEnabled) {
    el.popupCountdownEnabled.checked = false;
  }

  const nextState = {
    ...popupState,
    text,
    isActive,
    durationSeconds,
    countdownEnabled,
    countdownTarget
  };

  const changed =
    popupState.text !== nextState.text ||
    popupState.isActive !== nextState.isActive ||
    popupState.durationSeconds !== nextState.durationSeconds ||
    popupState.countdownEnabled !== nextState.countdownEnabled ||
    popupState.countdownTarget !== nextState.countdownTarget;

  popupState = {
    ...nextState,
    updatedAt: changed ? Date.now() : popupState.updatedAt
  };

  updatePopupPreview();
  updatePopupMeta();
  if (!changed) {
    return;
  }

  popupSaveInFlight = true;
  renderPopupControls();
  try {
    await sync.persistPopup({
      text: popupState.text,
      isActive: popupState.isActive,
      durationSeconds: popupState.durationSeconds,
      countdownEnabled: popupState.countdownEnabled,
      countdownTarget: popupState.countdownTarget
    });
  } finally {
    popupSaveInFlight = false;
    renderPopupControls();
  }
}

function queueBrbSave() {
  clearTimeout(brbSaveTimer);
  brbSaveTimer = setTimeout(() => {
    brbSaveTimer = null;
    void persistBrb();
  }, 220);
}

async function persistBrb() {
  const raw = el.brbText ? el.brbText.value || '' : '';
  const text = raw.trim().slice(0, MAX_BRB_LENGTH);
  if (el.brbText && raw !== text) {
    el.brbText.value = text;
  }
  const isActive = el.brbActive && el.brbActive.checked && !!text;
  if (el.brbActive) {
    el.brbActive.checked = isActive;
  }

  const payload = { text, isActive };
  brbSaveInFlight = true;
  renderBrbControls();
  brbState = { ...brbState, text, isActive, updatedAt: Date.now() };
  try {
    await sync.persistBrb(payload);
  } finally {
    brbSaveInFlight = false;
    renderBrbControls();
  }
}

function connectStream() {
  sync.connectStream();
}

function disconnectStream() {
  sync.disconnectStream();
}







function persistOverlay() {
  const payload = {
    label: overlayPrefs.label,
    accent: overlayPrefs.accent,
    accentSecondary: overlayPrefs.accentSecondary,
    highlight: overlayPrefs.highlight,
    scale: overlayPrefs.scale,
    popupScale: overlayPrefs.popupScale,
    position: overlayPrefs.position,
    mode: overlayPrefs.mode,
    accentAnim: overlayPrefs.accentAnim,
    sparkle: overlayPrefs.sparkle,
    theme: overlayPrefs.theme
  };
  overlaySaveInFlight = true;
  sync.persistOverlay(payload).finally(() => {
    overlaySaveInFlight = false;
    flushPendingOverlayPayload();
  });
}

function queueOverlaySave() {
  clearTimeout(overlaySaveTimer);
  overlaySaveTimer = setTimeout(() => {
    overlaySaveTimer = null;
    persistOverlay();
  }, 200);
}

function persistSlate() {
  const payload = serialiseSlateState(slateState, slateSerialiseOptions);
  slateSaveInFlight = true;
  sync.persistSlate(payload).finally(() => {
    slateSaveInFlight = false;
    flushPendingSlatePayload();
  });
}

function queueSlateSave() {
  clearTimeout(slateSaveTimer);
  slateSaveTimer = setTimeout(() => {
    slateSaveTimer = null;
    persistSlate();
  }, 220);
}

function beginEdit(index) {
  if (index < 0 || index >= state.messages.length) return;
  editingIndex = index;
  editingDraft = state.messages[index];
  renderMessages();
  const editor = el.messageList.querySelector('.message-item.is-editing .message-edit-input');
  if (editor) {
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(editor.value.length, editor.value.length);
    });
  }
}

function commitEdit(index) {
  if (index < 0 || index >= state.messages.length) return;
  const trimmed = editingDraft.trim();
  if (!trimmed) {
    toast('Message cannot be empty');
    return;
  }
  let finalText = trimmed;
  if (finalText.length > MAX_MESSAGE_LENGTH) {
    finalText = finalText.slice(0, MAX_MESSAGE_LENGTH);
    toast(`Message trimmed to ${MAX_MESSAGE_LENGTH} characters`);
  }
  const changed = state.messages[index] !== finalText;
  state.messages[index] = finalText;
  clearEditing();
  renderMessages();
  if (changed) {
    renderTicker();
    queueSave();
  }
}

function cancelEdit() {
  clearEditing();
  renderMessages();
}

function addMessage(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return;
  if (state.messages.length >= MAX_MESSAGES) {
    toast(`Queue is full (max ${MAX_MESSAGES} messages)`);
    return;
  }
  let finalText = trimmed;
  if (finalText.length > MAX_MESSAGE_LENGTH) {
    finalText = finalText.slice(0, MAX_MESSAGE_LENGTH);
    toast(`Message trimmed to ${MAX_MESSAGE_LENGTH} characters`);
  }
  state.messages.push(finalText);
  if (el.autoStart.checked) state.isActive = true;
  clearEditing();
  renderMessages();
  renderTicker();
  queueSave();
}

function removeMessage(index) {
  if (index < 0 || index >= state.messages.length) return;
  state.messages.splice(index, 1);
  if (!state.messages.length) state.isActive = false;
  if (editingIndex === index) {
    clearEditing();
  }
  renderMessages();
  renderTicker();
  queueSave();
}

function moveMessage(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= state.messages.length) return;
  const [item] = state.messages.splice(index, 1);
  state.messages.splice(target, 0, item);
  clearEditing();
  renderMessages();
  queueSave();
}

function isPresetModalOpen() {
  return el.presetModal && el.presetModal.classList.contains('is-visible');
}

function updatePresetModalError(message) {
  const hasError = Boolean(message);
  if (el.presetModalHint) {
    el.presetModalHint.textContent = hasError ? message : PRESET_NAME_HINT;
    el.presetModalHint.classList.toggle('is-error', hasError);
  }
  if (el.presetModalName) {
    el.presetModalName.classList.toggle('has-error', hasError);
  }
}

function openPresetModal(index, triggerButton) {
  if (!el.presetModal || typeof index !== 'number') return;
  const message = state.messages[index];
  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (!trimmed) {
    toast('Message is empty');
    return;
  }
  const defaultName = trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
  pendingPresetMessage = {
    index,
    message,
    trigger: triggerButton || null
  };
  if (el.presetModalPreview) {
    const previewHtml = formatMessage(message, { highlightRegex }) || '<span class="small">Message will be sanitised before saving.</span>';
    el.presetModalPreview.innerHTML = previewHtml;
  }
  if (el.presetModalName) {
    el.presetModalName.value = defaultName || 'Message preset';
    requestAnimationFrame(() => {
      try {
        el.presetModalName.focus();
        el.presetModalName.select();
      } catch (err) {
        // ignore focus errors
      }
    });
  }
  updatePresetModalError('');
  el.presetModal.classList.add('is-visible');
  el.presetModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-modal-open');
}

function closePresetModal(options = {}) {
  const { restoreFocus = false } = options;
  const trigger = pendingPresetMessage && pendingPresetMessage.trigger;
  pendingPresetMessage = null;
  if (el.presetModal) {
    el.presetModal.classList.remove('is-visible');
    el.presetModal.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('is-modal-open');
  if (el.presetModalName) {
    el.presetModalName.value = '';
    el.presetModalName.classList.remove('has-error');
  }
  if (el.presetModalPreview) {
    el.presetModalPreview.innerHTML = '<span class="small">Select a message to begin.</span>';
  }
  updatePresetModalError('');
  if (restoreFocus && trigger && typeof trigger.focus === 'function') {
    requestAnimationFrame(() => {
      try {
        trigger.focus();
      } catch (err) {
        // ignore focus errors
      }
    });
  }
}

function confirmPresetModal() {
  if (!pendingPresetMessage || !el.presetModalName) return;
  const name = el.presetModalName.value.trim();
  if (!name) {
    updatePresetModalError('Enter a preset name');
    el.presetModalName.focus();
    return;
  }
  if (name.length > MAX_PRESET_NAME_LENGTH) {
    updatePresetModalError(`Preset names must be ${MAX_PRESET_NAME_LENGTH} characters or fewer.`);
    el.presetModalName.focus();
    return;
  }
  const { index, message: fallback } = pendingPresetMessage;
  let source = typeof index === 'number' && index >= 0 && index < state.messages.length
    ? state.messages[index]
    : fallback;
  const sanitised = sanitiseMessages([source], { includeMeta: true });
  if (!sanitised.messages.length) {
    updatePresetModalError('Message is empty after sanitising');
    return;
  }
  const payload = {
    id: generateClientId('preset'),
    name,
    messages: sanitised.messages,
    updatedAt: Date.now()
  };
  const existingIndex = presets.findIndex(item => item.name.toLowerCase() === name.toLowerCase());
  if (existingIndex >= 0) {
    payload.id = presets[existingIndex].id;
    presets.splice(existingIndex, 1, payload);
  } else {
    presets.unshift(payload);
  }
  renderPresets();
  void persistPresets({ notify: false });
  toast(`Saved “${name}” to presets`);
  closePresetModal({ restoreFocus: true });
}

function handleMessageAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const row = button.closest('.message-item');
  if (!row) return;
  const index = Number(row.dataset.index);
  switch (button.dataset.action) {
    case 'delete':
      removeMessage(index);
      break;
    case 'up':
      moveMessage(index, -1);
      break;
    case 'down':
      moveMessage(index, 1);
      break;
    case 'edit':
      beginEdit(index);
      break;
    case 'save-preset':
      openPresetModal(index, button);
      break;
    case 'save': {
      const input = row.querySelector('.message-edit-input');
      if (input) editingDraft = input.value;
      commitEdit(index);
      break;
    }
    case 'cancel':
      cancelEdit();
      break;
  }
}

function setMode(value) {
  const mode = typeof sharedNormaliseMode === 'function'
    ? sharedNormaliseMode(value)
    : (['auto', 'marquee', 'chunk'].includes(String(value).toLowerCase()) ? String(value).toLowerCase() : null);
  if (!mode) return;
  overlayPrefs.mode = mode;
  renderOverlayControls();
  updateOverlayChip();
  saveLocal();
  queueOverlaySave();
}

function setPosition(value) {
  const position = typeof sharedNormalisePosition === 'function'
    ? sharedNormalisePosition(value)
    : (String(value).toLowerCase() === 'top' ? 'top' : 'bottom');
  overlayPrefs.position = position;
  renderOverlayControls();
  updateOverlayChip();
  saveLocal();
  queueOverlaySave();
}

function setTheme(value) {
  if (!THEME_OPTIONS.includes(value)) return;
  overlayPrefs.theme = value;
  renderOverlayControls();
  updateOverlayChip();
  saveLocal();
  queueOverlaySave();
}

function updateScale(value) {
  const next = typeof clampScaleValue === 'function'
    ? clampScaleValue(value, overlayPrefs.scale)
    : (() => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return overlayPrefs.scale;
        return Math.max(0.75, Math.min(2.5, Math.round(numeric * 100) / 100));
      })();
  overlayPrefs.scale = next;
  el.scaleRange.value = overlayPrefs.scale;
  el.scaleNumber.value = overlayPrefs.scale;
  updateOverlayChip();
  saveLocal();
  queueOverlaySave();
}

function updatePopupScale(value) {
  const next = typeof clampPopupScaleValue === 'function'
    ? clampPopupScaleValue(value, overlayPrefs.popupScale)
    : (() => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return overlayPrefs.popupScale;
        return Math.max(0.6, Math.min(1.5, Math.round(numeric * 100) / 100));
      })();
  overlayPrefs.popupScale = next;
  if (el.popupScaleRange) el.popupScaleRange.value = overlayPrefs.popupScale;
  if (el.popupScaleNumber) el.popupScaleNumber.value = overlayPrefs.popupScale;
  updateOverlayChip();
  saveLocal();
  renderPopupPreviewScale();
  queueOverlaySave();
}

function handlePresetAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const card = button.closest('.preset-card');
  if (!card) return;
  const id = card.dataset.id;
  const preset = presets.find(item => item.id === id);
  if (!preset) return;
  switch (button.dataset.action) {
    case 'load':
      const loadResult = sanitiseMessages(preset.messages, { includeMeta: true });
      state.messages = [...loadResult.messages];
      if (state.messages.length) {
        state.isActive = state.isActive || el.autoStart.checked;
      } else {
        state.isActive = false;
      }
      renderMessages();
      renderTicker();
      queueSave();
      {
        const notes = [];
        if (loadResult.truncated) notes.push(`limited to ${MAX_MESSAGES}`);
        if (loadResult.trimmed) notes.push(`trimmed to ${MAX_MESSAGE_LENGTH} chars`);
        const summary = `Loaded preset “${preset.name}”`;
        toast(notes.length ? `${summary} • ${notes.join('; ')}` : summary);
      }
      break;
    case 'append':
      if (state.messages.length >= MAX_MESSAGES) {
        toast(`Queue is full (max ${MAX_MESSAGES} messages)`);
        return;
      }
      const appendResult = sanitiseMessages(preset.messages, { includeMeta: true });
      const available = MAX_MESSAGES - state.messages.length;
      const additions = appendResult.messages.slice(0, available);
      if (!additions.length) {
        toast(`Queue is full (max ${MAX_MESSAGES} messages)`);
        return;
      }
      state.messages.push(...additions);
      if (el.autoStart.checked && state.messages.length) state.isActive = true;
      renderMessages();
      renderTicker();
      queueSave();
      {
        const skippedForQueue = appendResult.messages.length - additions.length;
        const notes = [];
        if (skippedForQueue > 0) notes.push(`skipped ${skippedForQueue} (queue full)`);
        if (appendResult.truncated) notes.push(`preset limited to ${MAX_MESSAGES}`);
        if (appendResult.trimmed) notes.push(`trimmed to ${MAX_MESSAGE_LENGTH} chars`);
        const summary = `Appended ${additions.length} message${additions.length === 1 ? '' : 's'}`;
        toast(notes.length ? `${summary} • ${notes.join('; ')}` : summary);
      }
      break;
    case 'delete':
      presets = presets.filter(item => item.id !== id);
      renderPresets();
      persistPresets();
      break;
  }
}



function buildScenePayload(name, existingId, fallbackName = '') {
  const baseName = String(name || fallbackName || '').trim();
  if (!baseName) {
    toast('Enter a scene name');
    return null;
  }
  const trimmedName = baseName.slice(0, MAX_SCENE_NAME_LENGTH);
  const tickerResult = sanitiseMessages(state.messages, { includeMeta: true });
  const messages = tickerResult.messages;
  const popup = normalisePopupData(popupState);
  if (!messages.length && !popup.text) {
    toast('Add messages or popup text before saving a scene');
    return null;
  }
  if (tickerResult.trimmed || tickerResult.truncated) {
    const notes = [];
    if (tickerResult.trimmed) notes.push(`trimmed ${tickerResult.trimmed}`);
    if (tickerResult.truncated) notes.push(`skipped ${tickerResult.truncated}`);
    if (notes.length) toast(`Scene adjusted • ${notes.join('; ')}`);
  }
  const overlay = buildSceneOverlayPayload(overlayPrefs, sceneOverlayOptions);
  const payload = {
    id: existingId || generateClientId('scene'),
    name: trimmedName,
    ticker: {
      messages,
      displayDuration: state.displayDuration,
      intervalBetween: minutesToSeconds(state.intervalMinutes),
      isActive: state.isActive && messages.length > 0
    },
    popup: {
      text: popup.text,
      isActive: popup.isActive,
      durationSeconds: popup.durationSeconds,
      countdownEnabled: popup.countdownEnabled,
      countdownTarget: popup.countdownTarget
    },
    slate: serialiseSlateState(slateState, slateSerialiseOptions),
    updatedAt: Date.now()
  };
  if (overlay) {
    payload.overlay = overlay;
  }
  return payload;
}

function persistScenes(successMessage = 'Scene saved') {
  if (scenesSaveInFlight) {
    pendingSceneMessage = successMessage;
    return;
  }
  scenesSaveInFlight = true;
  sync.persistScenes(scenes, { successMessage }).finally(() => {
    scenesSaveInFlight = false;
    if (pendingSceneMessage) {
      const message = pendingSceneMessage;
      pendingSceneMessage = null;
      persistScenes(message);
    }
  });
}

async function activateScene(scene) {
  const ok = await sync.activateScene(scene.id);
  if (ok) {
    toast(`Activated scene “${scene.name}”`);
  }
}

function saveScenePreset(existing) {
  const nameInput = el.sceneName ? el.sceneName.value : '';
  const payload = buildScenePayload(nameInput, existing?.id || null, existing?.name || '');
  if (!payload) return;
  if (existing) {
    scenes = scenes.map(scene => (scene.id === existing.id ? payload : scene));
    persistScenes('Scene updated');
  } else {
    scenes.unshift(payload);
    persistScenes('Scene saved');
  }
  renderScenes();
  if (el.sceneName) el.sceneName.value = '';
}

function handleSceneAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const card = button.closest('.scene-card');
  if (!card) return;
  const id = card.dataset.id;
  const scene = scenes.find(item => item.id === id);
  if (!scene) return;
  switch (button.dataset.action) {
    case 'activate':
      void activateScene(scene);
      break;
    case 'replace':
      saveScenePreset(scene);
      break;
    case 'delete':
      scenes = scenes.filter(item => item.id !== id);
      renderScenes();
      persistScenes('Scene removed');
      break;
  }
}

el.overlayChip.addEventListener('click', async () => {
  const url = buildOverlayUrl();
  try {
    await navigator.clipboard.writeText(url);
    toast('Overlay URL copied');
  } catch (err) {
    console.warn('Clipboard copy failed', err);
    toast('Copy failed');
  }
});

el.copyOverlay.addEventListener('click', async () => {
  const url = buildOverlayUrl();
  try {
    await navigator.clipboard.writeText(url);
    toast('Overlay URL copied');
  } catch (err) {
    toast('Copy failed');
  }
});

el.openOverlay.addEventListener('click', () => {
  window.open(buildOverlayUrl(), '_blank');
});

el.reloadPreview.addEventListener('click', () => {
  const url = buildOverlayUrl();
  lastPreviewUrl = url;
  schedulePreviewUpdate(url);
});

el.serverUrl.addEventListener('change', () => {
  saveLocal();
  connectStream();
  fetchState({ silent: true });
  updateOverlayChip();
});

el.stateExport.addEventListener('click', async () => {
  if (!confirm('Export the full dashboard state as a JSON download?')) {
    return;
  }
  const base = serverBase();
  try {
    const res = await fetch(`${base}/ticker/state/export`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ticker-state.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    toast('State exported');
  } catch (err) {
    console.error('State export failed', err);
    toast('Failed to export state');
  }
});

el.stateImport.addEventListener('click', () => {
  if (!el.stateImportInput) return;
  el.stateImportInput.value = '';
  el.stateImportInput.click();
});

el.stateImportInput.addEventListener('change', async () => {
  const file = el.stateImportInput.files && el.stateImportInput.files[0];
  if (!file) return;
  if (!confirm(`Import "${file.name}" and replace the current dashboard state?`)) {
    el.stateImportInput.value = '';
    return;
  }
  try {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error('Selected file is not valid JSON');
    }
    const base = serverBase();
    const res = await fetch(`${base}/ticker/state/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    });
    let data = null;
    try {
      data = await res.json();
    } catch (err) {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    }
    if (!res.ok || !data || data.ok !== true) {
      const message = data?.error || data?.message || `Import failed (HTTP ${res.status})`;
      throw new Error(message);
    }
    await fetchState({ silent: false });
    toast('State imported');
  } catch (err) {
    console.error('State import failed', err);
    toast(err.message || 'Failed to import state');
  } finally {
    el.stateImportInput.value = '';
  }
});

el.autoStart.addEventListener('change', () => {
  saveLocal();
});

el.duration.addEventListener('change', () => {
  state.displayDuration = clampDuration(el.duration.value);
  renderTicker();
  queueSave();
});

el.interval.addEventListener('change', () => {
  state.intervalMinutes = clampMinutesValue(el.interval.value);
  renderTicker();
  queueSave();
});

el.startBtn.addEventListener('click', () => {
  if (!state.messages.length) {
    toast('Add at least one message first');
    return;
  }
  state.isActive = true;
  renderTicker();
  queueSave();
});

el.stopBtn.addEventListener('click', () => {
  state.isActive = false;
  renderTicker();
  queueSave();
});

el.refreshBtn.addEventListener('click', () => fetchState({ silent: true }));

el.overlayLabel.addEventListener('input', () => {
  overlayPrefs.label = el.overlayLabel.value.trim() || 'LIVE';
  updateOverlayChip();
  saveLocal();
  queueOverlaySave();
});

const ACCENT_LENGTH_ERROR = `Colour values must be ${ACCENT_MAX_LENGTH} characters or fewer.`;
const ACCENT_SECONDARY_LENGTH_ERROR = `Colour values must be ${ACCENT_MAX_LENGTH} characters or fewer. Clear the field to remove this colour.`;

function commitAccentInput(nextValue) {
  if (!el.overlayAccent) return;
  const rawValue = typeof nextValue === 'string' ? nextValue : el.overlayAccent.value;
  const trimmed = rawValue.trim();
  if (!trimmed) {
    const changed = overlayPrefs.accent !== '';
    overlayPrefs.accent = '';
    updateAccentInputsFromPrefs();
    setAccentError('');
    applyPreviewTheme();
    if (changed) {
      updateOverlayChip();
      saveLocal();
      queueOverlaySave();
    }
    return;
  }
  if (trimmed.length > ACCENT_MAX_LENGTH) {
    if (el.overlayAccent) {
      el.overlayAccent.value = trimmed;
    }
    setAccentError(ACCENT_LENGTH_ERROR);
    if (el.overlayAccentPicker) {
      el.overlayAccentPicker.value = parseHexForPicker(overlayPrefs.accent) || ACCENT_FALLBACK_HEX;
    }
    return;
  }
  if (!isSafeColour(trimmed)) {
    if (el.overlayAccent) {
      el.overlayAccent.value = trimmed;
    }
    setAccentError('Enter a valid CSS colour value.');
    if (el.overlayAccentPicker) {
      el.overlayAccentPicker.value = parseHexForPicker(overlayPrefs.accent) || ACCENT_FALLBACK_HEX;
    }
    return;
  }
  setAccentError('');
  const changed = trimmed !== overlayPrefs.accent;
  overlayPrefs.accent = trimmed;
  updateAccentInputsFromPrefs();
  if (changed) {
    updateOverlayChip();
    saveLocal();
    queueOverlaySave();
  }
  applyPreviewTheme();
}

function commitAccentSecondaryInput(nextValue) {
  if (!el.overlayAccentSecondary) return;
  const rawValue = typeof nextValue === 'string' ? nextValue : el.overlayAccentSecondary.value;
  const trimmed = rawValue.trim();
  if (!trimmed) {
    const changed = overlayPrefs.accentSecondary !== '';
    overlayPrefs.accentSecondary = '';
    updateAccentInputsFromPrefs();
    setAccentSecondaryError('');
    applyPreviewTheme();
    if (changed) {
      updateOverlayChip();
      saveLocal();
      queueOverlaySave();
    }
    return;
  }
  if (trimmed.length > ACCENT_MAX_LENGTH) {
    if (el.overlayAccentSecondary) {
      el.overlayAccentSecondary.value = trimmed;
    }
    setAccentSecondaryError(ACCENT_SECONDARY_LENGTH_ERROR);
    if (el.overlayAccentSecondaryPicker) {
      el.overlayAccentSecondaryPicker.value = parseHexForPicker(overlayPrefs.accentSecondary) || ACCENT_SECONDARY_FALLBACK_HEX;
    }
    return;
  }
  if (!isSafeColour(trimmed)) {
    if (el.overlayAccentSecondary) {
      el.overlayAccentSecondary.value = trimmed;
    }
    setAccentSecondaryError('Enter a valid CSS colour value or clear the field.');
    if (el.overlayAccentSecondaryPicker) {
      el.overlayAccentSecondaryPicker.value = parseHexForPicker(overlayPrefs.accentSecondary) || ACCENT_SECONDARY_FALLBACK_HEX;
    }
    return;
  }
  setAccentSecondaryError('');
  const changed = trimmed !== overlayPrefs.accentSecondary;
  overlayPrefs.accentSecondary = trimmed;
  updateAccentInputsFromPrefs();
  if (changed) {
    updateOverlayChip();
    saveLocal();
    queueOverlaySave();
  }
  applyPreviewTheme();
}

if (el.overlayAccent) {
  el.overlayAccent.addEventListener('input', () => commitAccentInput());
  el.overlayAccent.addEventListener('change', () => commitAccentInput());
  el.overlayAccent.addEventListener('blur', () => commitAccentInput());
}
if (el.overlayAccentPicker) {
  el.overlayAccentPicker.addEventListener('input', event => {
    setAccentError('');
    commitAccentInput(event.target.value);
  });
}

if (el.overlayAccentSecondary) {
  el.overlayAccentSecondary.addEventListener('input', () => commitAccentSecondaryInput());
  el.overlayAccentSecondary.addEventListener('change', () => commitAccentSecondaryInput());
  el.overlayAccentSecondary.addEventListener('blur', () => commitAccentSecondaryInput());
}
if (el.overlayAccentSecondaryPicker) {
  el.overlayAccentSecondaryPicker.addEventListener('input', event => {
    setAccentSecondaryError('');
    commitAccentSecondaryInput(event.target.value);
  });
}

el.highlightWords.addEventListener('input', () => {
  const raw = el.highlightWords.value;
  updateHighlightHint(raw);
  const normalised = normaliseHighlightInput(raw);
  const changed = overlayPrefs.highlight !== normalised;
  overlayPrefs.highlight = normalised;
  if (changed) {
    updateHighlightRegex();
    renderMessages();
    renderPopupControls();
    updateOverlayChip();
    saveLocal();
    queueOverlaySave();
  }
});
el.highlightWords.addEventListener('blur', () => {
  el.highlightWords.value = overlayPrefs.highlight;
  updateHighlightHint(overlayPrefs.highlight);
});

if (el.slateEnabled) {
  el.slateEnabled.addEventListener('change', () => {
    updateSlateBoolean('isEnabled', el.slateEnabled.checked);
  });
}
if (el.slateShowClock) {
  el.slateShowClock.addEventListener('change', () => {
    updateSlateBoolean('showClock', el.slateShowClock.checked);
  });
}
if (el.slateRotation) {
  el.slateRotation.addEventListener('input', () => {
    updateSlateRotationInput(el.slateRotation.value);
  });
  el.slateRotation.addEventListener('change', () => {
    updateSlateRotationInput(el.slateRotation.value);
  });
}
if (el.slateRotationNumber) {
  const commitRotationNumber = () => {
    updateSlateRotationInput(el.slateRotationNumber.value);
  };
  el.slateRotationNumber.addEventListener('input', commitRotationNumber);
  el.slateRotationNumber.addEventListener('change', commitRotationNumber);
  el.slateRotationNumber.addEventListener('blur', () => {
    el.slateRotationNumber.value = String(clampSlateRotation(el.slateRotationNumber.value));
  });
}
if (el.slateClockLabel) {
  el.slateClockLabel.addEventListener('input', () => {
    updateSlateTextField('clockLabel', el.slateClockLabel.value, MAX_SLATE_TITLE_LENGTH);
  });
  el.slateClockLabel.addEventListener('blur', () => {
    el.slateClockLabel.value = slateState.clockLabel || '';
  });
}
if (el.slateClockSubtitle) {
  el.slateClockSubtitle.addEventListener('input', () => {
    updateSlateTextField('clockSubtitle', el.slateClockSubtitle.value, MAX_SLATE_TEXT_LENGTH);
  });
  el.slateClockSubtitle.addEventListener('blur', () => {
    el.slateClockSubtitle.value = slateState.clockSubtitle || '';
  });
}
if (el.slateNextLabel) {
  el.slateNextLabel.addEventListener('input', () => {
    updateSlateTextField('nextLabel', el.slateNextLabel.value, MAX_SLATE_TITLE_LENGTH);
  });
  el.slateNextLabel.addEventListener('blur', () => {
    el.slateNextLabel.value = slateState.nextLabel || '';
  });
}
if (el.slateNextTitle) {
  el.slateNextTitle.addEventListener('input', () => {
    updateSlateTextField('nextTitle', el.slateNextTitle.value, MAX_SLATE_TITLE_LENGTH);
  });
  el.slateNextTitle.addEventListener('blur', () => {
    el.slateNextTitle.value = slateState.nextTitle || '';
  });
}
if (el.slateNextSubtitle) {
  el.slateNextSubtitle.addEventListener('input', () => {
    updateSlateTextField('nextSubtitle', el.slateNextSubtitle.value, MAX_SLATE_TEXT_LENGTH);
  });
  el.slateNextSubtitle.addEventListener('blur', () => {
    el.slateNextSubtitle.value = slateState.nextSubtitle || '';
  });
}
if (el.slateSponsorLabel) {
  el.slateSponsorLabel.addEventListener('input', () => {
    updateSlateTextField('sponsorLabel', el.slateSponsorLabel.value, MAX_SLATE_TITLE_LENGTH);
  });
  el.slateSponsorLabel.addEventListener('blur', () => {
    el.slateSponsorLabel.value = slateState.sponsorLabel || '';
  });
}
if (el.slateSponsorName) {
  el.slateSponsorName.addEventListener('input', () => {
    updateSlateTextField('sponsorName', el.slateSponsorName.value, MAX_SLATE_TITLE_LENGTH);
  });
  el.slateSponsorName.addEventListener('blur', () => {
    el.slateSponsorName.value = slateState.sponsorName || '';
  });
}
if (el.slateSponsorTagline) {
  el.slateSponsorTagline.addEventListener('input', () => {
    updateSlateTextField('sponsorTagline', el.slateSponsorTagline.value, MAX_SLATE_TEXT_LENGTH);
  });
  el.slateSponsorTagline.addEventListener('blur', () => {
    el.slateSponsorTagline.value = slateState.sponsorTagline || '';
  });
}
if (el.slateNotesLabel) {
  el.slateNotesLabel.addEventListener('input', () => {
    updateSlateTextField('notesLabel', el.slateNotesLabel.value, MAX_SLATE_TITLE_LENGTH);
  });
  el.slateNotesLabel.addEventListener('blur', () => {
    el.slateNotesLabel.value = slateState.notesLabel || '';
  });
}
if (el.slateNotes) {
  el.slateNotes.addEventListener('input', () => {
    updateSlateNotes(el.slateNotes.value);
  });
  el.slateNotes.addEventListener('blur', () => {
    el.slateNotes.value = Array.isArray(slateState.notes) ? slateState.notes.join('\n') : '';
  });
}
if (el.slatePreviewDots) {
  el.slatePreviewDots.addEventListener('click', event => {
    const dot = event.target.closest('.slate-preview-dot');
    if (!dot) return;
    const index = Number(dot.dataset.index);
    if (!Number.isFinite(index) || index < 0 || index >= slatePreviewCards.length) return;
    slatePreviewIndex = index;
    playSlatePreviewCard(index, { animate: true, updateDots: true });
  });
}

el.popupText.addEventListener('input', () => {
  updatePopupPreview();
  if (!el.popupText.value.trim()) {
    el.popupActive.checked = false;
  }
});

if (el.popupDuration) {
  el.popupDuration.addEventListener('change', () => {
    queuePopupSave();
  });
}

if (el.popupCountdownTarget) {
  el.popupCountdownTarget.addEventListener('input', () => {
    if (el.popupCountdownEnabled && el.popupCountdownEnabled.checked) {
      updatePopupPreview();
    }
  });
  el.popupCountdownTarget.addEventListener('change', () => {
    if (el.popupCountdownEnabled && el.popupCountdownEnabled.checked) {
      queuePopupSave();
    }
  });
}

if (el.popupCountdownEnabled) {
  el.popupCountdownEnabled.addEventListener('change', () => {
    if (el.popupCountdownEnabled.checked) {
      if (!el.popupText.value.trim()) {
        el.popupCountdownEnabled.checked = false;
        toast('Enter popup text before enabling the countdown');
        return;
      }
      if (!el.popupCountdownTarget || !el.popupCountdownTarget.value) {
        toast('Select a countdown target time');
      }
    }
    updatePopupPreview();
    if (el.popupCountdownTarget) {
      el.popupCountdownTarget.disabled = popupSaveInFlight || !el.popupCountdownEnabled.checked;
    }
    const hasTarget = el.popupCountdownTarget && el.popupCountdownTarget.value;
    if (!el.popupCountdownEnabled.checked || hasTarget) {
      queuePopupSave();
    }
  });
}

el.popupActive.addEventListener('change', () => {
  if (el.popupActive.checked && !el.popupText.value.trim()) {
    el.popupActive.checked = false;
    toast('Enter popup text before enabling');
    return;
  }
  queuePopupSave();
});

el.savePopup.addEventListener('click', () => {
  queuePopupSave();
});

el.clearPopup.addEventListener('click', () => {
  if (!el.popupText.value && !popupState.text) {
    el.popupActive.checked = false;
    updatePopupPreview();
    updatePopupMeta();
    return;
  }
  if (!confirm('Clear the popup message?')) {
    return;
  }
  el.popupText.value = '';
  el.popupActive.checked = false;
  updatePopupPreview();
  popupState = {
    ...popupState,
    text: '',
    isActive: false,
    durationSeconds: null,
    countdownEnabled: false,
    countdownTarget: null,
    updatedAt: Date.now()
  };
  updatePopupMeta();
  queuePopupSave();
});

if (el.brbText) {
  el.brbText.addEventListener('input', () => {
    if (!el.brbText.value.trim() && el.brbActive) {
      el.brbActive.checked = false;
    }
  });
}

if (el.brbSave) {
  el.brbSave.addEventListener('click', () => {
    queueBrbSave();
  });
}

if (el.brbClear) {
  el.brbClear.addEventListener('click', () => {
    const hasBrbInput = el.brbText && el.brbText.value.trim().length > 0;
    const hasBrbState = brbState.text && brbState.text.trim().length > 0;
    const brbActive = (el.brbActive && el.brbActive.checked) || brbState.isActive;

    if (hasBrbInput || hasBrbState || brbActive) {
      if (!confirm('Clear the BRB message?')) {
        return;
      }
    }

    if (el.brbText) el.brbText.value = '';
    if (el.brbActive) el.brbActive.checked = false;
    brbState = { ...brbState, text: '', isActive: false, updatedAt: Date.now() };
    renderBrbControls();
    queueBrbSave();
  });
}

if (el.brbActive) {
  el.brbActive.addEventListener('change', () => {
    if (el.brbActive.checked && (!el.brbText || !el.brbText.value.trim())) {
      el.brbActive.checked = false;
      toast('Enter BRB text before enabling');
      return;
    }
    queueBrbSave();
  });
}

el.scaleRange.addEventListener('input', () => updateScale(el.scaleRange.value));
el.scaleNumber.addEventListener('change', () => updateScale(el.scaleNumber.value));
if (el.popupScaleRange) {
  el.popupScaleRange.addEventListener('input', () => updatePopupScale(el.popupScaleRange.value));
}
if (el.popupScaleNumber) {
  el.popupScaleNumber.addEventListener('change', () => updatePopupScale(el.popupScaleNumber.value));
}

el.positionButtons.addEventListener('click', event => {
  const button = event.target.closest('button[data-position]');
  if (!button) return;
  setPosition(button.dataset.position);
});

el.modeButtons.addEventListener('click', event => {
  const button = event.target.closest('button[data-mode]');
  if (!button) return;
  setMode(button.dataset.mode);
});

if (el.themeButtons) {
  el.themeButtons.addEventListener('click', event => {
    const button = event.target.closest('button[data-theme]');
    if (!button) return;
    setTheme(button.dataset.theme);
  });
}

el.accentAnim.addEventListener('change', () => {
  overlayPrefs.accentAnim = el.accentAnim.checked;
  updateOverlayChip();
  saveLocal();
  queueOverlaySave();
});

el.sparkle.addEventListener('change', () => {
  overlayPrefs.sparkle = el.sparkle.checked;
  updateOverlayChip();
  saveLocal();
  queueOverlaySave();
});

el.messageForm.addEventListener('submit', event => {
  event.preventDefault();
  addMessage(el.newMessage.value);
  el.newMessage.value = '';
  el.newMessage.focus();
});

el.clearMessages.addEventListener('click', () => {
  if (!state.messages.length) return;
  if (confirm('Clear all messages?')) {
    state.messages = [];
    state.isActive = false;
    renderMessages();
    renderTicker();
    queueSave();
  }
});

el.exportMessages.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ messages: state.messages }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ticker-messages.json';
  a.click();
  URL.revokeObjectURL(url);
});

el.importMessages.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.messages)) {
        const result = sanitiseMessages(data.messages, { includeMeta: true });
        state.messages = result.messages;
        if (el.autoStart.checked && state.messages.length) state.isActive = true;
        renderMessages();
        renderTicker();
        queueSave();
        const notes = [];
        if (result.truncated) notes.push(`limited to ${MAX_MESSAGES}`);
        if (result.trimmed) notes.push(`trimmed to ${MAX_MESSAGE_LENGTH} chars`);
        const summary = 'Messages imported';
        toast(notes.length ? `${summary} • ${notes.join('; ')}` : summary);
      } else {
        toast('Invalid file format');
      }
    } catch (err) {
      console.error('Failed to import messages', err);
      toast('Import failed');
    }
  };
  input.click();
});

el.messageList.addEventListener('click', handleMessageAction);
el.messageList.addEventListener('input', event => {
  const textarea = event.target.closest('.message-edit-input');
  if (!textarea) return;
  editingDraft = textarea.value;
  const row = textarea.closest('.message-item');
  if (row) {
    const preview = row.querySelector('.message-preview');
    if (preview) {
      const html = formatMessage(editingDraft, { highlightRegex });
      preview.innerHTML = html || '<span class="small">Preview updates as you type.</span>';
    }
  }
});

el.savePreset.addEventListener('click', () => {
  const name = el.presetName.value.trim();
  if (!name) {
    toast('Enter a preset name');
    return;
  }
  if (name.length > MAX_PRESET_NAME_LENGTH) {
    toast(`Preset names must be ${MAX_PRESET_NAME_LENGTH} characters or fewer`);
    return;
  }
  if (!state.messages.length) {
    toast('Nothing to save');
    return;
  }
  const existing = presets.find(p => p.name.toLowerCase() === name.toLowerCase());
  const payload = {
    id: existing ? existing.id : generateClientId('preset'),
    name,
    messages: [...state.messages],
    updatedAt: Date.now()
  };
  if (existing) {
    Object.assign(existing, payload);
  } else {
    presets.unshift(payload);
  }
  el.presetName.value = '';
  renderPresets();
  persistPresets();
});

el.presetList.addEventListener('click', handlePresetAction);

if (el.presetModalCancel) {
  el.presetModalCancel.addEventListener('click', () => closePresetModal({ restoreFocus: true }));
}
if (el.presetModalSave) {
  el.presetModalSave.addEventListener('click', () => confirmPresetModal());
}
if (el.presetModalName) {
  el.presetModalName.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmPresetModal();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closePresetModal({ restoreFocus: true });
    }
  });
  el.presetModalName.addEventListener('input', () => updatePresetModalError(''));
}
if (el.presetModal) {
  el.presetModal.addEventListener('click', event => {
    if (event.target === el.presetModal) {
      closePresetModal({ restoreFocus: true });
    }
  });
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && isPresetModalOpen()) {
    event.preventDefault();
    closePresetModal({ restoreFocus: true });
  }
});

if (el.saveScene) {
  el.saveScene.addEventListener('click', () => {
    saveScenePreset();
  });
}

if (el.sceneName) {
  el.sceneName.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveScenePreset();
    }
  });
}

if (el.sceneList) {
  el.sceneList.addEventListener('click', handleSceneAction);
}

function init() {
  loadLocal();
  renderOverlayControls();
  updateHighlightRegex();
  renderPopupControls();
  renderBrbControls();
  renderMessages();
  renderTicker();
  renderPresets();
  renderScenes();
  updateOverlayChip();
  connectStream();
}

init();
window.addEventListener('beforeunload', disconnectStream);

})();
