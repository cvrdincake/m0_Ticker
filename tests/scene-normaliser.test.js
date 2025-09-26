const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normaliseSceneEntry,
  serialiseOverlayForScene
} = require('../public/js/scene-normaliser.js');

const OVERLAY_KEYS = [
  'label',
  'accent',
  'highlight',
  'scale',
  'popupScale',
  'position',
  'mode',
  'accentAnim',
  'sparkle',
  'theme'
];

const BASE_OVERLAY = {
  label: 'LIVE',
  accent: '#ef4444',
  highlight: 'live,alert',
  scale: 1.75,
  popupScale: 1,
  position: 'bottom',
  mode: 'auto',
  accentAnim: true,
  sparkle: true,
  theme: 'monotone'
};

function stubNormaliseOverlayData(data = {}) {
  const result = { ...BASE_OVERLAY };
  for (const key of OVERLAY_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    const value = data[key];
    if (typeof value === 'string') {
      result[key] = value.trim();
    } else {
      result[key] = value;
    }
  }
  return result;
}

const sceneOptions = {
  maxNameLength: 80,
  sanitiseMessages: list => Array.isArray(list) ? list.map(item => String(item || '').trim()).filter(Boolean) : [],
  clampDuration: value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 5;
    return Math.min(Math.max(Math.round(numeric), 2), 90);
  },
  clampIntervalSeconds: (value, fallback) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.min(3600, Math.round(numeric)));
  },
  minutesToSeconds: minutes => {
    const numeric = Number(minutes);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(3600, Math.round(numeric * 60)));
  },
  getDisplayDuration: () => 5,
  getIntervalMinutes: () => 0,
  normalisePopupData: popup => ({
    text: typeof popup.text === 'string' ? popup.text : '',
    isActive: !!popup.isActive,
    durationSeconds: popup.durationSeconds ?? null,
    countdownEnabled: !!popup.countdownEnabled,
    countdownTarget: popup.countdownTarget ?? null
  }),
  normaliseSlateData: slate => ({
    ...slate,
    notes: Array.isArray(slate?.notes) ? slate.notes.slice() : []
  }),
  clampSlateRotation: value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 12;
    return Math.min(Math.max(Math.round(numeric), 4), 900);
  },
  maxSlateNotes: 6,
  generateId: () => 'generated-scene',
  normaliseOverlayData: stubNormaliseOverlayData,
  overlayKeys: OVERLAY_KEYS,
  includeEmptyStrings: true,
  now: () => 1234
};

test('overlay fields survive scene round trip', () => {
  const overlayPrefs = {
    label: ' ALERT ',
    accent: ' #123123 ',
    highlight: ' focus,alert ',
    scale: 1.2,
    popupScale: 0.9,
    position: 'top',
    mode: 'chunk',
    accentAnim: false,
    sparkle: false,
    theme: 'neural'
  };

  const overlayPayload = serialiseOverlayForScene(overlayPrefs, {
    normaliseOverlayData: stubNormaliseOverlayData,
    overlayKeys: OVERLAY_KEYS,
    includeEmptyStrings: true
  });

  assert.ok(overlayPayload, 'overlay payload should be created');

  const builtScene = {
    id: 'scene-1',
    name: 'Overlay test',
    ticker: {
      messages: ['hello'],
      displayDuration: 5,
      intervalBetween: 30,
      isActive: true
    },
    popup: {
      text: 'popup',
      isActive: true,
      durationSeconds: 10,
      countdownEnabled: false,
      countdownTarget: null
    },
    overlay: overlayPayload,
    updatedAt: 5000
  };

  const persistedScene = JSON.parse(JSON.stringify(builtScene));
  const reloadedScene = normaliseSceneEntry(persistedScene, sceneOptions);

  assert.deepEqual(
    reloadedScene.overlay,
    overlayPayload,
    'overlay configuration should round trip without losing fields'
  );
});
