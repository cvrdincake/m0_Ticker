// server.js — unified HTTP server for BRB + Ticker
// Save at: B:\m0_scripts\m0_PopUps\server.js
// State persists in: B:\m0_scripts\m0_PopUps\ticker-state.json (override via TICKER_STATE_FILE)
// Run:     npm i express cors && node server.js

const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const express = require('express');
const cors = require('cors');

const fsp = fs.promises;

const sharedUtils = require('./public/js/shared-utils.js');
const sharedConfig = require('./public/js/shared-config.js');
const {
  OVERLAY_THEMES,
  clampDurationSeconds,
  clampIntervalSeconds,
  clampScaleValue,
  clampPopupScaleValue,
  clampSlateRotationSeconds,
  normaliseHighlightList,
  normalisePosition: sharedNormalisePosition,
  normaliseMode: sharedNormaliseMode,
  normaliseTheme: sharedNormaliseTheme,
  normaliseSlateNotes,
  isSafeCssColor
} = sharedUtils;
const {
  DEFAULT_OVERLAY: CONFIG_DEFAULT_OVERLAY,
  DEFAULT_POPUP: CONFIG_DEFAULT_POPUP,
  DEFAULT_SLATE: CONFIG_DEFAULT_SLATE,
  DEFAULT_HIGHLIGHTS: CONFIG_DEFAULT_HIGHLIGHTS,
  DEFAULT_HIGHLIGHT_STRING: CONFIG_DEFAULT_HIGHLIGHT_STRING
} = sharedConfig || {};
const OVERLAY_THEME_SET = new Set(OVERLAY_THEMES);

const HTTP_HOST = '127.0.0.1';
const HTTP_PORT = 3000;

// Serve only the public UI assets by default. Override via TICKER_DIR when needed.
const DEFAULT_TICKER_DIR = path.join(__dirname, 'public');
const TICKER_DIR_INPUT = process.env.TICKER_DIR || DEFAULT_TICKER_DIR;
const PUBLIC_TICKER = path.resolve(TICKER_DIR_INPUT);

const DEFAULT_STATE_FILE = path.join(__dirname, 'ticker-state.json');
const STATE_FILE_INPUT = process.env.TICKER_STATE_FILE || DEFAULT_STATE_FILE;
const STATE_FILE = path.resolve(STATE_FILE_INPUT);

const PERSIST_DEBOUNCE_MS = 150;
const MAX_TICKER_MESSAGES = 50;
const MAX_TICKER_MESSAGE_LENGTH = 280;
const MAX_POPUP_DURATION_SECONDS = 600;
const MAX_SCENE_NAME_LENGTH = 80;
const MAX_SLATE_TITLE_LENGTH = 64;
const MAX_SLATE_TEXT_LENGTH = 200;
const MAX_SLATE_NOTES = 6;

const FALLBACK_HIGHLIGHTS = ['live', 'breaking', 'alert', 'update', 'tonight', 'today'];
const DEFAULT_HIGHLIGHTS = Array.isArray(CONFIG_DEFAULT_HIGHLIGHTS) && CONFIG_DEFAULT_HIGHLIGHTS.length
  ? CONFIG_DEFAULT_HIGHLIGHTS.slice()
  : FALLBACK_HIGHLIGHTS;
const DEFAULT_HIGHLIGHT_STRING = typeof CONFIG_DEFAULT_HIGHLIGHT_STRING === 'string' && CONFIG_DEFAULT_HIGHLIGHT_STRING.trim()
  ? CONFIG_DEFAULT_HIGHLIGHT_STRING
  : DEFAULT_HIGHLIGHTS.join(',');

const BASE_DEFAULT_OVERLAY = CONFIG_DEFAULT_OVERLAY
  ? { ...CONFIG_DEFAULT_OVERLAY }
  : {
      label: 'LIVE',
      accent: '#ef4444',
      highlight: DEFAULT_HIGHLIGHT_STRING,
      scale: 1.75,
      popupScale: 1,
      position: 'bottom',
      mode: 'auto',
      accentAnim: true,
      sparkle: true,
      theme: 'holographic'
    };

const BASE_DEFAULT_POPUP = CONFIG_DEFAULT_POPUP
  ? { ...CONFIG_DEFAULT_POPUP }
  : {
      text: '',
      isActive: false,
      durationSeconds: null,
      countdownEnabled: false,
      countdownTarget: null
    };

const BASE_DEFAULT_SLATE_SOURCE = CONFIG_DEFAULT_SLATE
  ? { ...CONFIG_DEFAULT_SLATE }
  : {
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
      notes: []
    };

const BASE_DEFAULT_SLATE = {
  ...BASE_DEFAULT_SLATE_SOURCE,
  notes: normaliseSlateNotes(BASE_DEFAULT_SLATE_SOURCE.notes || [], MAX_SLATE_NOTES, MAX_SLATE_TEXT_LENGTH)
};

function createDefaultOverlay() {
  return { ...BASE_DEFAULT_OVERLAY, _updatedAt: Date.now() };
}

function createDefaultPopup() {
  return { ...BASE_DEFAULT_POPUP, _updatedAt: Date.now() };
}

function createDefaultSlate() {
  return {
    ...BASE_DEFAULT_SLATE,
    notes: normaliseSlateNotes(BASE_DEFAULT_SLATE.notes || [], MAX_SLATE_NOTES, MAX_SLATE_TEXT_LENGTH),
    _updatedAt: Date.now()
  };
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

// ---- Server-Sent Events (SSE) client registry
const sseClients = new Set();
let popupAutoDismissTimer = null;

function writeEvent(res, type, payload) {
  try {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch (err) {
    // Drop broken connections.
    sseClients.delete(res);
  }
}

function broadcast(type, payload) {
  for (const client of sseClients) {
    writeEvent(client, type, payload);
  }
}

function sendInitialState(res) {
  writeEvent(res, 'ticker', state.ticker);
  writeEvent(res, 'overlay', state.overlay);
  writeEvent(res, 'presets', state.presets);
  writeEvent(res, 'scenes', state.scenes);
  writeEvent(res, 'brb', state.brb);
  writeEvent(res, 'popup', state.popup);
  writeEvent(res, 'slate', state.slate);
}

// ---- In-memory state (mirrored to STATE_FILE on disk)
const state = {
  ticker: {
    isActive: false,
    messages: [],
    displayDuration: 5,
    // Interval is clamped to a 60-minute (3600 second) ceiling.
    intervalBetween: 60,
    _updatedAt: Date.now()
  },
  brb: {
    isActive: false,
    text: 'Be Right Back',
    _updatedAt: Date.now()
  },
  presets: [],
  scenes: [],
  overlay: createDefaultOverlay(),
  popup: createDefaultPopup(),
  slate: createDefaultSlate()
};

// ---- Health
app.get('/health', (req, res) => {
  res.json({ ok: true, t: Date.now() });
});

// ---- SSE stream
app.get('/ticker/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
  res.write('retry: 2000\n\n');

  sseClients.add(res);
  sendInitialState(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (err) {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// ---- Ticker API
app.get('/ticker/state', (req, res) => {
  res.json(state.ticker);
});

app.post('/ticker/state', (req, res) => {
  try {
    const { isActive, messages, displayDuration, intervalBetween } = req.body || {};
    if (Array.isArray(messages)) state.ticker.messages = sanitiseMessages(messages, { strict: true });
    if (typeof isActive === 'boolean') state.ticker.isActive = isActive;
    if (Number.isFinite(displayDuration)) state.ticker.displayDuration = clampDuration(displayDuration);
    if (Number.isFinite(intervalBetween)) state.ticker.intervalBetween = clampInterval(intervalBetween);
    if (!state.ticker.messages.length) state.ticker.isActive = false;
    state.ticker._updatedAt = Date.now();
    schedulePersist();
    broadcast('ticker', state.ticker);
    res.json({ ok: true, state: state.ticker });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message || 'Invalid ticker payload' });
  }
});

// ---- Popup API
app.get('/popup/state', (req, res) => {
  res.json(state.popup);
});

app.post('/popup/state', (req, res) => {
  try {
    const update = sanitisePopupInput(req.body || {});
    if (typeof update.text === 'string') {
      state.popup.text = update.text;
    }
    if (typeof update.isActive === 'boolean') {
      state.popup.isActive = update.isActive;
    }
    if (Object.prototype.hasOwnProperty.call(update, 'durationSeconds')) {
      state.popup.durationSeconds = update.durationSeconds;
    }
    if (Object.prototype.hasOwnProperty.call(update, 'countdownEnabled')) {
      state.popup.countdownEnabled = update.countdownEnabled;
    }
    if (Object.prototype.hasOwnProperty.call(update, 'countdownTarget')) {
      state.popup.countdownTarget = update.countdownTarget;
    }
    if (!state.popup.text.trim()) {
      state.popup.text = '';
      state.popup.isActive = false;
      state.popup.countdownEnabled = false;
      state.popup.countdownTarget = null;
    }
    if (!state.popup.countdownEnabled || !Number.isFinite(state.popup.countdownTarget)) {
      state.popup.countdownEnabled = false;
      state.popup.countdownTarget = null;
    }
    state.popup._updatedAt = Date.now();
    schedulePopupAutoDismiss();
    schedulePersist();
    broadcast('popup', state.popup);
    res.json({ ok: true, popup: state.popup });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ---- Overlay API
app.get('/ticker/overlay', (req, res) => {
  res.json(state.overlay);
});

app.post('/ticker/overlay', (req, res) => {
  try {
    const overlay = sanitiseOverlayInput(req.body || {}, { strict: true });
    state.overlay = { ...state.overlay, ...overlay, _updatedAt: Date.now() };
    schedulePersist();
    broadcast('overlay', state.overlay);
    res.json({ ok: true, overlay: state.overlay });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ---- Slate API
app.get('/slate/state', (req, res) => {
  res.json(state.slate);
});

app.post('/slate/state', (req, res) => {
  try {
    const update = sanitiseSlateInput(req.body || {}, { strict: true });
    const now = Date.now();
    const nextNotes = Object.prototype.hasOwnProperty.call(update, 'notes')
      ? sanitiseSlateNotesInput(update.notes)
      : state.slate.notes;
    state.slate = {
      ...state.slate,
      ...update,
      notes: nextNotes,
      _updatedAt: now
    };
    schedulePersist();
    broadcast('slate', state.slate);
    res.json({ ok: true, slate: state.slate });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message || 'Invalid slate payload' });
  }
});

// ---- BRB API
app.get('/brb/state', (req, res) => {
  res.json(state.brb);
});

app.post('/brb/state', (req, res) => {
  try {
    const { isActive, text } = req.body || {};
    if (typeof isActive === 'boolean') state.brb.isActive = isActive;
    if (typeof text === 'string') {
      const trimmed = text.trim().slice(0, MAX_TICKER_MESSAGE_LENGTH);
      state.brb.text = trimmed;
      if (!trimmed) {
        state.brb.isActive = false;
      }
    }
    state.brb._updatedAt = Date.now();
    schedulePersist();
    broadcast('brb', state.brb);
    res.json({ ok: true, state: state.brb });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ---- Preset API
app.get('/ticker/presets', (req, res) => {
  res.json({ presets: state.presets });
});

app.post('/ticker/presets', (req, res) => {
  try {
    const { presets } = req.body || {};
    state.presets = sanitisePresetList(presets, { strict: true });
    schedulePersist();
    broadcast('presets', state.presets);
    res.json({ ok: true, presets: state.presets });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ---- Scene API
app.get('/ticker/scenes', (req, res) => {
  res.json({ scenes: state.scenes });
});

app.post('/ticker/scenes', (req, res) => {
  try {
    const { scenes } = req.body || {};
    state.scenes = sanitiseSceneList(scenes, { strict: true });
    schedulePersist();
    broadcast('scenes', state.scenes);
    res.json({ ok: true, scenes: state.scenes });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.post('/ticker/scenes/apply', (req, res) => {
  try {
    const { sceneId } = req.body || {};
    const scene = state.scenes.find(item => item.id === sceneId);
    if (!scene) {
      return res.status(404).json({ ok: false, error: 'Scene not found' });
    }
    const result = applyScene(scene);
    schedulePersist();
    res.json({ ok: true, sceneId, ...result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

const BLOCKED_STATIC_FILES = new Set(['server.js', 'ticker-state.json']);

// ---- Static files: /ticker/index.html and /ticker/output.html
app.use('/ticker', (req, res, next) => {
  const base = path.basename(req.path).toLowerCase();
  if (BLOCKED_STATIC_FILES.has(base)) {
    return res.status(404).end();
  }
  next();
});

app.use('/ticker', express.static(PUBLIC_TICKER, {
  etag: false,
  lastModified: false,
  cacheControl: false,
  maxAge: 0
}));

// ---- State persistence helpers
function sanitiseMessages(list, options = {}) {
  if (!Array.isArray(list)) return [];
  const {
    strict = false,
    maxMessages = MAX_TICKER_MESSAGES,
    maxLength = MAX_TICKER_MESSAGE_LENGTH
  } = options;

  const cleaned = [];
  for (const entry of list) {
    if (cleaned.length >= maxMessages) {
      if (strict) {
        throw new Error(`Too many ticker messages (maximum ${maxMessages}).`);
      }
      break;
    }

    const trimmed = String(entry ?? '').trim();
    if (!trimmed) continue;

    if (trimmed.length > maxLength) {
      if (strict) {
        throw new Error(`Ticker messages must be ${maxLength} characters or fewer.`);
      }
      cleaned.push(trimmed.slice(0, maxLength));
    } else {
      cleaned.push(trimmed);
    }
  }
  return cleaned;
}

function sanitisePopupInput(input) {
  const result = {};
  if (input && typeof input === 'object') {
    if (typeof input.text === 'string') {
      result.text = input.text.trim().slice(0, 280);
    }
    if (typeof input.isActive === 'boolean') {
      result.isActive = input.isActive;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'durationSeconds')) {
      const numeric = Number(input.durationSeconds);
      if (Number.isFinite(numeric) && numeric > 0) {
        const clamped = Math.max(1, Math.min(MAX_POPUP_DURATION_SECONDS, Math.round(numeric)));
        result.durationSeconds = clamped;
      } else {
        result.durationSeconds = null;
      }
    }
    if (Object.prototype.hasOwnProperty.call(input, 'countdownEnabled')) {
      result.countdownEnabled = !!input.countdownEnabled;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'countdownTarget')) {
      result.countdownTarget = normaliseCountdownTarget(input.countdownTarget);
    }
  }
  if (!Number.isFinite(result.countdownTarget)) {
    result.countdownTarget = null;
  }
  if (!result.countdownTarget) {
    result.countdownEnabled = false;
  }
  return result;
}

function normaliseCountdownTarget(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.round(numeric);
  }
  const parsed = new Date(trimmed);
  const ms = parsed.getTime();
  return Number.isNaN(ms) ? null : ms;
}

function clearPopupAutoDismiss() {
  if (popupAutoDismissTimer) {
    clearTimeout(popupAutoDismissTimer);
    popupAutoDismissTimer = null;
  }
}

function schedulePopupAutoDismiss() {
  clearPopupAutoDismiss();
  if (!state.popup.isActive) return;
  const duration = state.popup.durationSeconds;
  if (!Number.isFinite(duration) || duration <= 0) return;
  popupAutoDismissTimer = setTimeout(() => {
    popupAutoDismissTimer = null;
    state.popup.isActive = false;
    state.popup._updatedAt = Date.now();
    schedulePersist();
    broadcast('popup', state.popup);
  }, duration * 1000);
}

function generatePresetId() {
  return `preset-${randomUUID()}`;
}

function sanitisePresetEntry(entry, options = {}) {
  if (!entry || typeof entry !== 'object') return null;
  const name = String(entry.name || '').trim();
  if (!name) return null;

  const { strict = false } = options;
  let messages;
  try {
    messages = sanitiseMessages(entry.messages, { strict });
  } catch (err) {
    throw new Error(`Preset "${name}": ${err.message}`);
  }

  if (!messages.length) return null;
  const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id : generatePresetId();
  const updatedAt = Number(entry.updatedAt);
  return {
    id,
    name,
    messages,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now()
  };
}

function sanitisePresetList(list, options) {
  if (!Array.isArray(list)) return [];
  const cleaned = [];
  for (const entry of list) {
    const normalised = sanitisePresetEntry(entry, options);
    if (normalised) cleaned.push(normalised);
  }
  return cleaned;
}

function generateSceneId() {
  return `scene-${randomUUID()}`;
}

function sanitiseSceneEntry(entry, options = {}) {
  if (!entry || typeof entry !== 'object') return null;
  const { strict = false } = options;
  const name = String(entry.name || '').trim().slice(0, MAX_SCENE_NAME_LENGTH);
  if (!name) return null;

  const tickerSource = (entry.ticker && typeof entry.ticker === 'object') ? entry.ticker : entry;
  let messages = [];
  try {
    messages = sanitiseMessages(tickerSource.messages || entry.messages || [], { strict });
  } catch (err) {
    throw new Error(`Scene "${name}": ${err.message}`);
  }

  const displayDuration = clampDurationSeconds(tickerSource.displayDuration, 5);
  const liveInterval = Number.isFinite(state?.ticker?.intervalBetween)
    ? state.ticker.intervalBetween
    : 60;
  const intervalBetween = clampIntervalSeconds(tickerSource.intervalBetween, liveInterval);
  const isActive = !!(tickerSource.isActive ?? entry.isActive);
  const ticker = {
    messages,
    displayDuration,
    intervalBetween,
    isActive: isActive && messages.length > 0
  };

  const popupInput = (entry.popup && typeof entry.popup === 'object') ? entry.popup : {};
  const popup = sanitisePopupInput(popupInput);
  if (!popup.text) {
    popup.text = '';
    popup.isActive = false;
  }

  let overlay = null;
  if (entry.overlay && typeof entry.overlay === 'object') {
    const overlayUpdate = sanitiseOverlayInput(entry.overlay);
    if (overlayUpdate && Object.keys(overlayUpdate).length) {
      overlay = overlayUpdate;
    }
  }

  let slate = null;
  if (entry.slate && typeof entry.slate === 'object') {
    const slateUpdate = sanitiseSlateInput(entry.slate);
    if (slateUpdate && Object.keys(slateUpdate).length) {
      slate = {
        ...slateUpdate
      };
      if (Array.isArray(slate.notes)) {
        slate.notes = sanitiseSlateNotesInput(slate.notes);
      }
    }
  }

  const hasSlateContent = slate && Object.keys(slate).length > 0;
  if (!ticker.messages.length && !popup.text && !hasSlateContent) {
    if (strict) {
      throw new Error(`Scene "${name}" must include ticker messages or popup text.`);
    }
    return null;
  }

  const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id : generateSceneId();
  const updatedAt = Number.isFinite(entry.updatedAt) ? Number(entry.updatedAt) : Date.now();

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

function sanitiseSceneList(list, options) {
  if (!Array.isArray(list)) return [];
  const cleaned = [];
  for (const entry of list) {
    const normalised = sanitiseSceneEntry(entry, options);
    if (normalised) cleaned.push(normalised);
  }
  return cleaned;
}

function clampDuration(value) {
  return clampDurationSeconds(value, state.ticker.displayDuration);
}

function clampInterval(value) {
  return clampIntervalSeconds(value, state.ticker.intervalBetween);
}

function clampScale(value) {
  return clampScaleValue(value, state.overlay.scale);
}

function clampPopupScale(value) {
  return clampPopupScaleValue(value, state.overlay.popupScale);
}

function normaliseHighlightString(value) {
  return normaliseHighlightList(value);
}

function normalisePosition(value) {
  return sharedNormalisePosition(value);
}

function normaliseMode(value) {
  return sharedNormaliseMode(value);
}

function normaliseTheme(value) {
  const theme = sharedNormaliseTheme(value);
  return theme && OVERLAY_THEME_SET.has(theme) ? theme : null;
}

function sanitiseOverlayInput(input, options = {}) {
  const result = {};
  const { strict = false } = options;
  if (typeof input.label === 'string') {
    const trimmed = input.label.trim().slice(0, 48);
    if (trimmed) result.label = trimmed;
  }
  if (typeof input.accent === 'string') {
    const trimmed = input.accent.trim();
    if (!trimmed) {
      result.accent = '';
    } else if (trimmed.length > 64) {
      if (strict) throw new Error('Accent must be 64 characters or fewer.');
    } else if (isSafeCssColor(trimmed)) {
      result.accent = trimmed;
    } else if (strict) {
      throw new Error('Accent must be a valid CSS colour.');
    }
  }
  if (typeof input.highlight === 'string') {
    result.highlight = normaliseHighlightString(input.highlight).slice(0, 512);
  }
  if (Number.isFinite(input.scale)) {
    result.scale = clampScale(input.scale);
  }
  if (Number.isFinite(input.popupScale)) {
    result.popupScale = clampPopupScale(input.popupScale);
  }
  if (typeof input.position === 'string') {
    result.position = normalisePosition(input.position);
  }
  if (typeof input.mode === 'string') {
    result.mode = normaliseMode(input.mode);
  }
  if (typeof input.accentAnim === 'boolean') {
    result.accentAnim = input.accentAnim;
  }
  if (typeof input.sparkle === 'boolean') {
    result.sparkle = input.sparkle;
  }
  if (typeof input.theme === 'string') {
    const theme = normaliseTheme(input.theme);
    if (theme) {
      result.theme = theme;
    } else if (strict) {
      throw new Error(`Theme must be one of: ${Array.from(OVERLAY_THEMES).join(', ')}`);
    }
  }
  return result;
}

function sanitiseSlateNotesInput(value) {
  return normaliseSlateNotes(value, MAX_SLATE_NOTES, MAX_SLATE_TEXT_LENGTH);
}

function sanitiseSlateInput(input, options = {}) {
  const result = {};
  if (!input || typeof input !== 'object') return result;
  const { strict = false } = options;

  if (typeof input.isEnabled === 'boolean') {
    result.isEnabled = input.isEnabled;
  }

  if (input.rotationSeconds !== undefined) {
    if (!Number.isFinite(input.rotationSeconds)) {
      if (strict) throw new Error('Rotation must be a number of seconds.');
    } else {
      result.rotationSeconds = clampSlateRotationSeconds(input.rotationSeconds, BASE_DEFAULT_SLATE.rotationSeconds);
    }
  }

  if (typeof input.showClock === 'boolean') {
    result.showClock = input.showClock;
  }

  if (typeof input.clockLabel === 'string') {
    result.clockLabel = input.clockLabel.trim().slice(0, MAX_SLATE_TITLE_LENGTH);
  }

  if (typeof input.nextLabel === 'string') {
    result.nextLabel = input.nextLabel.trim().slice(0, MAX_SLATE_TITLE_LENGTH);
  }

  if (typeof input.nextTitle === 'string') {
    result.nextTitle = input.nextTitle.trim().slice(0, MAX_SLATE_TITLE_LENGTH);
  }

  if (typeof input.nextSubtitle === 'string') {
    result.nextSubtitle = input.nextSubtitle.trim().slice(0, MAX_SLATE_TEXT_LENGTH);
  }

  if (typeof input.sponsorName === 'string') {
    result.sponsorName = input.sponsorName.trim().slice(0, MAX_SLATE_TITLE_LENGTH);
  }

  if (typeof input.sponsorTagline === 'string') {
    result.sponsorTagline = input.sponsorTagline.trim().slice(0, MAX_SLATE_TEXT_LENGTH);
  }

  if (typeof input.sponsorLabel === 'string') {
    result.sponsorLabel = input.sponsorLabel.trim().slice(0, MAX_SLATE_TITLE_LENGTH);
  }

  if (typeof input.notesLabel === 'string') {
    result.notesLabel = input.notesLabel.trim().slice(0, MAX_SLATE_TITLE_LENGTH);
  }

  if (Array.isArray(input.notes) || typeof input.notes === 'string') {
    result.notes = sanitiseSlateNotesInput(input.notes);
  }

  return result;
}

function applyScene(scene) {
  const now = Date.now();
  let tickerChanged = false;
  let popupChanged = false;
  let overlayChanged = false;
  let slateChanged = false;

  if (scene.ticker && typeof scene.ticker === 'object') {
    const tickerMessages = sanitiseMessages(scene.ticker.messages || [], {});
    state.ticker.messages = tickerMessages;
    state.ticker.displayDuration = clampDurationSeconds(scene.ticker.displayDuration, state.ticker.displayDuration);
    state.ticker.intervalBetween = clampIntervalSeconds(scene.ticker.intervalBetween, state.ticker.intervalBetween);
    state.ticker.isActive = !!scene.ticker.isActive && tickerMessages.length > 0;
    state.ticker._updatedAt = now;
    tickerChanged = true;
  }

  if (scene.popup && typeof scene.popup === 'object') {
    const popup = sanitisePopupInput(scene.popup);
    state.popup = {
      ...state.popup,
      ...popup,
      _updatedAt: now
    };
    if (!state.popup.text.trim()) {
      state.popup.text = '';
      state.popup.isActive = false;
      state.popup.countdownEnabled = false;
      state.popup.countdownTarget = null;
    }
    schedulePopupAutoDismiss();
    popupChanged = true;
  }

  if (scene.overlay && typeof scene.overlay === 'object') {
    const overlayUpdate = sanitiseOverlayInput(scene.overlay);
    if (overlayUpdate && Object.keys(overlayUpdate).length) {
      state.overlay = {
        ...state.overlay,
        ...overlayUpdate,
        _updatedAt: now
      };
      overlayChanged = true;
    }
  }

  if (scene.slate && typeof scene.slate === 'object') {
    const slateUpdate = sanitiseSlateInput(scene.slate);
    if (slateUpdate && Object.keys(slateUpdate).length) {
      const notes = Object.prototype.hasOwnProperty.call(slateUpdate, 'notes')
        ? sanitiseSlateNotesInput(slateUpdate.notes)
        : state.slate.notes;
      state.slate = {
        ...state.slate,
        ...slateUpdate,
        notes,
        _updatedAt: now
      };
      slateChanged = true;
    }
  }

  if (tickerChanged) {
    broadcast('ticker', state.ticker);
  }
  if (popupChanged) {
    broadcast('popup', state.popup);
  }
  if (overlayChanged) {
    broadcast('overlay', state.overlay);
  }
  if (slateChanged) {
    broadcast('slate', state.slate);
  }

  return {
    ticker: state.ticker,
    popup: state.popup,
    overlay: state.overlay,
    slate: state.slate
  };
}

function hydrateState(partial) {
  if (!partial || typeof partial !== 'object') return;
  if (partial.ticker) {
    const incoming = partial.ticker;
    if (Array.isArray(incoming.messages)) state.ticker.messages = sanitiseMessages(incoming.messages);
    if (typeof incoming.isActive === 'boolean') state.ticker.isActive = incoming.isActive;
    if (Number.isFinite(incoming.displayDuration)) state.ticker.displayDuration = clampDuration(incoming.displayDuration);
    if (Number.isFinite(incoming.intervalBetween)) state.ticker.intervalBetween = clampInterval(incoming.intervalBetween);
    if (!state.ticker.messages.length) state.ticker.isActive = false;
    state.ticker._updatedAt = Number.isFinite(incoming._updatedAt) ? incoming._updatedAt : Date.now();
  }
  if (partial.brb) {
    const incoming = partial.brb;
    if (typeof incoming.isActive === 'boolean') state.brb.isActive = incoming.isActive;
    if (typeof incoming.text === 'string') state.brb.text = incoming.text;
    state.brb._updatedAt = Number.isFinite(incoming._updatedAt) ? incoming._updatedAt : Date.now();
  }
  if (Array.isArray(partial.presets)) {
    try {
      state.presets = sanitisePresetList(partial.presets);
    } catch (err) {
      console.warn('[state] ignoring invalid presets from disk:', err.message);
      state.presets = [];
    }
  }
  if (Array.isArray(partial.scenes)) {
    try {
      state.scenes = sanitiseSceneList(partial.scenes);
    } catch (err) {
      console.warn('[state] ignoring invalid scenes from disk:', err.message);
      state.scenes = [];
    }
  }
  if (partial.overlay && typeof partial.overlay === 'object') {
    const overlay = sanitiseOverlayInput(partial.overlay);
    state.overlay = {
      ...state.overlay,
      ...overlay,
      _updatedAt: Number.isFinite(partial.overlay._updatedAt) ? partial.overlay._updatedAt : Date.now()
    };
  }
  if (partial.popup && typeof partial.popup === 'object') {
    const popup = sanitisePopupInput(partial.popup);
    state.popup = {
      ...state.popup,
      ...popup,
      _updatedAt: Number.isFinite(partial.popup._updatedAt) ? partial.popup._updatedAt : Date.now()
    };
    if (!state.popup.text || !state.popup.text.trim()) {
      state.popup.text = '';
      state.popup.isActive = false;
    }
    schedulePopupAutoDismiss();
  }
  if (partial.slate && typeof partial.slate === 'object') {
    const slateUpdate = sanitiseSlateInput(partial.slate);
    const notes = Object.prototype.hasOwnProperty.call(slateUpdate, 'notes')
      ? sanitiseSlateNotesInput(slateUpdate.notes)
      : state.slate.notes;
    state.slate = {
      ...state.slate,
      ...slateUpdate,
      notes,
      _updatedAt: Number.isFinite(partial.slate._updatedAt) ? partial.slate._updatedAt : Date.now()
    };
  }
}

async function loadStateFromDisk() {
  try {
    const raw = await fsp.readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    hydrateState(parsed);
    console.log(`[state] restored ticker data from ${STATE_FILE}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`[state] no existing state file at ${STATE_FILE}, starting fresh`);
    } else {
      console.error(`[state] failed to read ${STATE_FILE}:`, err);
    }
  }
}

function schedulePersist() {
  if (schedulePersist._timer) clearTimeout(schedulePersist._timer);
  schedulePersist._timer = setTimeout(() => {
    schedulePersist._timer = null;
    writeStateToDisk().catch(err => {
      console.error('[state] failed to persist ticker data:', err);
    });
  }, PERSIST_DEBOUNCE_MS);
}

async function writeStateToDisk() {
  const payload = JSON.stringify(state, null, 2);
  const tmpFile = `${STATE_FILE}.tmp`;
  try {
    await fsp.writeFile(tmpFile, payload, 'utf8');
    await fsp.rename(tmpFile, STATE_FILE);
  } catch (err) {
    try {
      await fsp.unlink(tmpFile);
    } catch (cleanupErr) {
      if (cleanupErr && cleanupErr.code !== 'ENOENT') {
        console.warn(`[state] failed to remove temp file ${tmpFile}:`, cleanupErr);
      }
    }
    throw err;
  }
}

loadStateFromDisk().finally(() => {
  console.log(`[state] persistence initialised (file: ${STATE_FILE})`);
  console.log(`[http] serving static files from ${PUBLIC_TICKER}`);
  if (!fs.existsSync(PUBLIC_TICKER)) {
    console.warn(`[http] warning: static directory not found: ${PUBLIC_TICKER}`);
  }
  app.listen(HTTP_PORT, HTTP_HOST, () => {
    console.log(`[http] listening on http://${HTTP_HOST}:${HTTP_PORT}`);
    console.log(`[http] ticker files at http://${HTTP_HOST}:${HTTP_PORT}/ticker/`);
  });
});
