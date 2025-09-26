// server.js — unified HTTP server for BRB + Ticker
// Save at: B:\m0_scripts\m0_PopUps\server.js
// State persists in: B:\m0_scripts\m0_PopUps\ticker-state.json (override via TICKER_STATE_FILE)
// Run:     npm i express cors && node server.js

const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { Readable } = require('stream');
const express = require('express');
const cors = require('cors');

const fsp = fs.promises;

const sharedUtils = require('./public/js/shared-utils.js');
const sharedConfig = require('./public/js/shared-config.js');
const {
  OVERLAY_THEMES,
  MAX_TICKER_MESSAGES,
  MAX_TICKER_MESSAGE_LENGTH,
  MAX_POPUP_DURATION_SECONDS,
  MAX_SCENE_NAME_LENGTH,
  MAX_SLATE_TITLE_LENGTH,
  MAX_SLATE_TEXT_LENGTH,
  MAX_SLATE_NOTES,
  sanitiseMessages,
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

const HTTP_HOST = process.env.HTTP_HOST || '127.0.0.1';
const HTTP_PORT = (() => {
  const raw = Number(process.env.HTTP_PORT);
  return Number.isFinite(raw) && raw > 0 ? raw : 3000;
})();

// Serve only the public UI assets by default. Override via TICKER_DIR when needed.
const DEFAULT_TICKER_DIR = path.join(__dirname, 'public');
const TICKER_DIR_INPUT = process.env.TICKER_DIR || DEFAULT_TICKER_DIR;
const PUBLIC_TICKER = path.resolve(TICKER_DIR_INPUT);

const DEFAULT_STATE_FILE = path.join(__dirname, 'ticker-state.json');
const STATE_FILE_INPUT = process.env.TICKER_STATE_FILE || DEFAULT_STATE_FILE;
const STATE_FILE = path.resolve(STATE_FILE_INPUT);

const PERSIST_DEBOUNCE_MS = 150;
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
      accent: '#38bdf8',
      accentSecondary: '#f472b6',
      highlight: DEFAULT_HIGHLIGHT_STRING,
      scale: 1.75,
      popupScale: 1,
      position: 'bottom',
      mode: 'auto',
      accentAnim: true,
      sparkle: true,
      theme: 'midnight-glass'
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
      clockSubtitle: 'UK time',
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

function createInitialState() {
  const now = Date.now();
  return {
    ticker: {
      isActive: false,
      messages: [],
      displayDuration: 5,
      // Interval is clamped to a 60-minute (3600 second) ceiling.
      intervalBetween: 60,
      _updatedAt: now
    },
    brb: {
      isActive: false,
      text: 'Be Right Back',
      _updatedAt: now
    },
    presets: [],
    scenes: [],
    overlay: createDefaultOverlay(),
    popup: createDefaultPopup(),
    slate: createDefaultSlate()
  };
}

const ENABLE_SERVER_LOGS = /^true$/i.test(process.env.TICKER_VERBOSE_LOGS || process.env.ENABLE_TICKER_LOGS || '');

function safeTruncate(value, max = 160) {
  if (typeof value !== 'string') return value;
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function sanitiseForLog(value, depth = 0) {
  if (value === null || value === undefined) return value;
  const type = typeof value;
  if (type === 'string') return safeTruncate(value);
  if (type === 'number' || type === 'boolean') return value;
  if (type === 'function') return '[function]';
  if (Array.isArray(value)) {
    if (depth >= 1) return `Array(${value.length})`;
    return value.slice(0, 5).map(item => sanitiseForLog(item, depth + 1));
  }
  if (type === 'object') {
    if (depth >= 1) return '[Object]';
    const entries = Object.entries(value).slice(0, 10);
    return entries.reduce((acc, [key, val]) => {
      acc[key] = sanitiseForLog(val, depth + 1);
      return acc;
    }, {});
  }
  return `[${type}]`;
}

function logInfo(message, context) {
  if (!ENABLE_SERVER_LOGS) return;
  if (context !== undefined) {
    console.info(message, sanitiseForLog(context));
  } else {
    console.info(message);
  }
}

function logWarning(message, context) {
  if (!ENABLE_SERVER_LOGS) return;
  console.warn(message, sanitiseForLog(context));
}

function logError(message, context) {
  if (!ENABLE_SERVER_LOGS) return;
  console.error(message, sanitiseForLog(context));
}

function sanitiseUserAgent(value) {
  if (typeof value !== 'string') return undefined;
  return safeTruncate(value, 200);
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
const state = createInitialState();

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
  logInfo('[SSE] client connected', {
    ip: req.ip,
    userAgent: sanitiseUserAgent(req.headers['user-agent'])
  });
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
    logInfo('[SSE] client disconnected', {
      ip: req.ip,
      userAgent: sanitiseUserAgent(req.headers['user-agent'])
    });
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
    logInfo('[Ticker] state updated', {
      isActive: state.ticker.isActive,
      messageCount: state.ticker.messages.length,
      displayDuration: state.ticker.displayDuration,
      intervalBetween: state.ticker.intervalBetween
    });
    res.json({ ok: true, state: state.ticker });
  } catch (e) {
    logWarning('[Ticker] state update failed', {
      error: e && e.message,
      payload: req.body
    });
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
    logInfo('[Popup] state updated', {
      isActive: state.popup.isActive,
      countdownEnabled: state.popup.countdownEnabled,
      textPreview: safeTruncate(state.popup.text || '', 80)
    });
    res.json({ ok: true, popup: state.popup });
  } catch (e) {
    logWarning('[Popup] state update failed', {
      error: e && e.message,
      payload: req.body
    });
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
    logInfo('[Overlay] state updated', {
      label: state.overlay.label,
      theme: state.overlay.theme,
      accent: state.overlay.accent
    });
    res.json({ ok: true, overlay: state.overlay });
  } catch (e) {
    logWarning('[Overlay] state update failed', {
      error: e && e.message,
      payload: req.body
    });
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
    logInfo('[Slate] state updated', {
      isEnabled: state.slate.isEnabled,
      rotationSeconds: state.slate.rotationSeconds,
      notesCount: Array.isArray(state.slate.notes) ? state.slate.notes.length : 0,
      nextTitle: safeTruncate(state.slate.nextTitle || '', 80)
    });
    res.json({ ok: true, slate: state.slate });
  } catch (e) {
    logWarning('[Slate] state update failed', {
      error: e && e.message,
      payload: req.body
    });
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
    logInfo('[BRB] state updated', {
      isActive: state.brb.isActive,
      textPreview: safeTruncate(state.brb.text || '', 80)
    });
    res.json({ ok: true, state: state.brb });
  } catch (e) {
    logWarning('[BRB] state update failed', {
      error: e && e.message,
      payload: req.body
    });
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
    logInfo('[Presets] list updated', {
      count: Array.isArray(state.presets) ? state.presets.length : 0
    });
    res.json({ ok: true, presets: state.presets });
  } catch (e) {
    logWarning('[Presets] update failed', {
      error: e && e.message,
      payload: req.body
    });
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
    logInfo('[Scenes] list updated', {
      count: Array.isArray(state.scenes) ? state.scenes.length : 0
    });
    res.json({ ok: true, scenes: state.scenes });
  } catch (e) {
    logWarning('[Scenes] update failed', {
      error: e && e.message,
      payload: req.body
    });
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
    logInfo('[Scenes] apply', { sceneId });
    res.json({ ok: true, sceneId, ...result });
  } catch (e) {
    logWarning('[Scenes] apply failed', {
      error: e && e.message,
      payload: req.body
    });
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.get('/ticker/state/export', (req, res) => {
  const payload = JSON.stringify(state, null, 2);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Disposition', 'attachment; filename="ticker-state.json"');
  Readable.from(payload).pipe(res);
});

app.post('/ticker/state/import', (req, res) => {
  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (parseErr) {
        throw new Error('Uploaded file was not valid JSON.');
      }
    }
    if (!payload || typeof payload !== 'object') {
      throw new Error('Uploaded state must be a JSON object.');
    }

    const nextState = createInitialState();
    hydrateState(payload, nextState, { scheduleTimers: false });
    replaceState(nextState);
    schedulePopupAutoDismiss();
    schedulePersist();

    broadcast('ticker', state.ticker);
    broadcast('overlay', state.overlay);
    broadcast('presets', state.presets);
    broadcast('scenes', state.scenes);
    broadcast('brb', state.brb);
    broadcast('popup', state.popup);
    broadcast('slate', state.slate);

    res.json({ ok: true, state });
  } catch (err) {
    logError('[State] import failed', {
      error: err && err.message,
      payload: req.body
    });
    res.status(400).json({ ok: false, error: err.message || 'Invalid state import payload' });
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
  if (typeof input.accentSecondary === 'string') {
    const trimmedSecondary = input.accentSecondary.trim();
    if (!trimmedSecondary) {
      result.accentSecondary = '';
    } else if (trimmedSecondary.length > 64) {
      if (strict) throw new Error('Secondary accent must be 64 characters or fewer.');
    } else if (isSafeCssColor(trimmedSecondary)) {
      result.accentSecondary = trimmedSecondary;
    } else if (strict) {
      throw new Error('Secondary accent must be a valid CSS colour.');
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

  if (typeof input.clockSubtitle === 'string') {
    result.clockSubtitle = input.clockSubtitle.trim().slice(0, MAX_SLATE_TEXT_LENGTH);
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

function hydrateState(partial, target = state, options = {}) {
  if (!target || typeof target !== 'object') return target;
  const { scheduleTimers = target === state } = options;
  if (!partial || typeof partial !== 'object') {
    if (scheduleTimers) schedulePopupAutoDismiss();
    return target;
  }

  if (partial.ticker && typeof partial.ticker === 'object') {
    const incoming = partial.ticker;
    if (Array.isArray(incoming.messages)) target.ticker.messages = sanitiseMessages(incoming.messages);
    if (typeof incoming.isActive === 'boolean') target.ticker.isActive = incoming.isActive;
    if (Number.isFinite(incoming.displayDuration)) {
      target.ticker.displayDuration = clampDurationSeconds(incoming.displayDuration, target.ticker.displayDuration);
    }
    if (Number.isFinite(incoming.intervalBetween)) {
      target.ticker.intervalBetween = clampIntervalSeconds(incoming.intervalBetween, target.ticker.intervalBetween);
    }
    if (!target.ticker.messages.length) target.ticker.isActive = false;
    target.ticker._updatedAt = Number.isFinite(incoming._updatedAt) ? incoming._updatedAt : Date.now();
  }

  if (partial.brb && typeof partial.brb === 'object') {
    const incoming = partial.brb;
    if (typeof incoming.isActive === 'boolean') target.brb.isActive = incoming.isActive;
    if (typeof incoming.text === 'string') target.brb.text = incoming.text;
    target.brb._updatedAt = Number.isFinite(incoming._updatedAt) ? incoming._updatedAt : Date.now();
  }

  if (Array.isArray(partial.presets)) {
    try {
      target.presets = sanitisePresetList(partial.presets);
    } catch (err) {
      console.warn('[state] ignoring invalid presets from disk:', err.message);
      target.presets = [];
    }
  }

  if (Array.isArray(partial.scenes)) {
    try {
      target.scenes = sanitiseSceneList(partial.scenes);
    } catch (err) {
      console.warn('[state] ignoring invalid scenes from disk:', err.message);
      target.scenes = [];
    }
  }

  if (partial.overlay && typeof partial.overlay === 'object') {
    const overlay = sanitiseOverlayInput(partial.overlay);
    target.overlay = {
      ...target.overlay,
      ...overlay,
      _updatedAt: Number.isFinite(partial.overlay._updatedAt) ? partial.overlay._updatedAt : Date.now()
    };
  }

  if (partial.popup && typeof partial.popup === 'object') {
    const popup = sanitisePopupInput(partial.popup);
    target.popup = {
      ...target.popup,
      ...popup,
      _updatedAt: Number.isFinite(partial.popup._updatedAt) ? partial.popup._updatedAt : Date.now()
    };
    if (!target.popup.text || !target.popup.text.trim()) {
      target.popup.text = '';
      target.popup.isActive = false;
      target.popup.countdownEnabled = false;
      target.popup.countdownTarget = null;
    }
  }

  if (partial.slate && typeof partial.slate === 'object') {
    const slateUpdate = sanitiseSlateInput(partial.slate);
    const notes = Object.prototype.hasOwnProperty.call(slateUpdate, 'notes')
      ? sanitiseSlateNotesInput(slateUpdate.notes)
      : target.slate.notes;
    target.slate = {
      ...target.slate,
      ...slateUpdate,
      notes,
      _updatedAt: Number.isFinite(partial.slate._updatedAt) ? partial.slate._updatedAt : Date.now()
    };
  }

  if (scheduleTimers) {
    schedulePopupAutoDismiss();
  }

  return target;
}

function replaceState(nextState) {
  if (!nextState || typeof nextState !== 'object') return;
  if (nextState.ticker) state.ticker = nextState.ticker;
  if (nextState.brb) state.brb = nextState.brb;
  state.presets = Array.isArray(nextState.presets) ? nextState.presets : [];
  state.scenes = Array.isArray(nextState.scenes) ? nextState.scenes : [];
  if (nextState.overlay) state.overlay = nextState.overlay;
  if (nextState.popup) state.popup = nextState.popup;
  if (nextState.slate) state.slate = nextState.slate;
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
