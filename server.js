'use strict';

const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const express = require('express');
const cors = require('cors');
const expressWs = require('express-ws');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const fsp = fs.promises;

const sharedUtils = require('./public/js/shared-utils.js');
const sharedConfig = require('./public/js/shared-config.js');
const clientNormalisers = require('./public/js/client-normalisers.js');

const DEFAULT_ASSET_DIR = path.resolve(__dirname, 'public');
const assetDir = process.env.TICKER_DIR
  ? path.resolve(process.env.TICKER_DIR)
  : DEFAULT_ASSET_DIR;

const {
  sanitiseMessages,
  clampDurationSeconds,
  clampIntervalSeconds,
  clampScaleValue,
  clampPopupScaleValue,
  clampSlateRotationSeconds
} = sharedUtils;

const {
  normaliseOverlayData,
  normalisePopupData,
  normaliseSlateData,
  normaliseSceneEntry,
  DEFAULT_OVERLAY: CLIENT_DEFAULT_OVERLAY,
  DEFAULT_POPUP: CLIENT_DEFAULT_POPUP,
  DEFAULT_SLATE: CLIENT_DEFAULT_SLATE,
  DEFAULT_HIGHLIGHTS: CLIENT_DEFAULT_HIGHLIGHTS,
  DEFAULT_HIGHLIGHT_STRING: CLIENT_DEFAULT_HIGHLIGHT_STRING,
  MAX_MESSAGES: CLIENT_MAX_MESSAGES,
  MAX_MESSAGE_LENGTH: CLIENT_MAX_MESSAGE_LENGTH,
  MAX_POPUP_SECONDS: CLIENT_MAX_POPUP_SECONDS,
  MAX_SLATE_NOTES: CLIENT_MAX_SLATE_NOTES
} = clientNormalisers || {};

const DEFAULT_HIGHLIGHTS = Array.isArray(CLIENT_DEFAULT_HIGHLIGHTS)
  ? CLIENT_DEFAULT_HIGHLIGHTS.slice()
  : Array.isArray(sharedConfig?.DEFAULT_HIGHLIGHTS)
    ? sharedConfig.DEFAULT_HIGHLIGHTS.slice()
    : ['live', 'breaking', 'alert', 'update', 'tonight', 'today'];

const DEFAULT_HIGHLIGHT_STRING =
  typeof (CLIENT_DEFAULT_HIGHLIGHT_STRING || sharedConfig?.DEFAULT_HIGHLIGHT_STRING) === 'string' &&
  (CLIENT_DEFAULT_HIGHLIGHT_STRING || sharedConfig.DEFAULT_HIGHLIGHT_STRING)
    ? (CLIENT_DEFAULT_HIGHLIGHT_STRING || sharedConfig.DEFAULT_HIGHLIGHT_STRING)
    : DEFAULT_HIGHLIGHTS.join(', ');

const BASE_DEFAULT_OVERLAY = {
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

Object.assign(
  BASE_DEFAULT_OVERLAY,
  CLIENT_DEFAULT_OVERLAY || {},
  sharedConfig?.DEFAULT_OVERLAY || {}
);

if (!BASE_DEFAULT_OVERLAY.highlight) {
  BASE_DEFAULT_OVERLAY.highlight = DEFAULT_HIGHLIGHT_STRING;
}

const BASE_DEFAULT_POPUP = {
  text: '',
  isActive: false,
  durationSeconds: null,
  countdownEnabled: false,
  countdownTarget: null
};

Object.assign(
  BASE_DEFAULT_POPUP,
  CLIENT_DEFAULT_POPUP || {},
  sharedConfig?.DEFAULT_POPUP || {}
);

const BASE_DEFAULT_SLATE = {
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

Object.assign(
  BASE_DEFAULT_SLATE,
  CLIENT_DEFAULT_SLATE || {},
  sharedConfig?.DEFAULT_SLATE || {}
);

const DEFAULT_TICKER_STATE = Object.freeze({
  isActive: false,
  messages: [],
  displayDuration: 5,
  intervalBetween: 0,
  updatedAt: null
});

const DEFAULT_OVERLAY_STATE = Object.freeze({
  ...BASE_DEFAULT_OVERLAY,
  highlight: BASE_DEFAULT_OVERLAY.highlight || DEFAULT_HIGHLIGHT_STRING,
  updatedAt: null
});

const DEFAULT_POPUP_STATE = (() => {
  const maxDuration = Number.isFinite(CLIENT_MAX_POPUP_SECONDS)
    ? CLIENT_MAX_POPUP_SECONDS
    : sharedUtils.MAX_POPUP_DURATION_SECONDS || 600;
  const normalised = typeof normalisePopupData === 'function'
    ? normalisePopupData({}, BASE_DEFAULT_POPUP, { maxDurationSeconds: maxDuration })
    : { ...BASE_DEFAULT_POPUP };
  return Object.freeze({
    ...normalised,
    updatedAt: null
  });
})();

const DEFAULT_SLATE_STATE = (() => {
  const normalised = typeof normaliseSlateData === 'function'
    ? normaliseSlateData(BASE_DEFAULT_SLATE, BASE_DEFAULT_SLATE)
    : { ...BASE_DEFAULT_SLATE };
  return Object.freeze({
    ...normalised,
    notes: Array.isArray(normalised.notes) ? normalised.notes.slice() : [],
    updatedAt: null
  });
})();

const DEFAULT_BRB_STATE = Object.freeze({
  text: 'Be Right Back',
  isActive: false,
  updatedAt: null
});

const MAX_MESSAGES = Number.isFinite(CLIENT_MAX_MESSAGES)
  ? CLIENT_MAX_MESSAGES
  : sharedUtils.MAX_TICKER_MESSAGES || 50;
const MAX_MESSAGE_LENGTH = Number.isFinite(CLIENT_MAX_MESSAGE_LENGTH)
  ? CLIENT_MAX_MESSAGE_LENGTH
  : sharedUtils.MAX_TICKER_MESSAGE_LENGTH || 280;
const MAX_POPUP_SECONDS = Number.isFinite(CLIENT_MAX_POPUP_SECONDS)
  ? CLIENT_MAX_POPUP_SECONDS
  : sharedUtils.MAX_POPUP_DURATION_SECONDS || 600;
const MAX_NOTES = Number.isFinite(CLIENT_MAX_SLATE_NOTES)
  ? CLIENT_MAX_SLATE_NOTES
  : sharedUtils.MAX_SLATE_NOTES || 6;
const MAX_PRESET_NAME_LENGTH = 80;
const BRB_MAX_LENGTH = 500;

function createDefaultTickerState() {
  return {
    isActive: DEFAULT_TICKER_STATE.isActive,
    messages: [],
    displayDuration: DEFAULT_TICKER_STATE.displayDuration,
    intervalBetween: DEFAULT_TICKER_STATE.intervalBetween,
    updatedAt: DEFAULT_TICKER_STATE.updatedAt
  };
}

function createDefaultOverlayState() {
  return { ...DEFAULT_OVERLAY_STATE };
}

function createDefaultPopupState() {
  return { ...DEFAULT_POPUP_STATE };
}

function createDefaultSlateState() {
  return {
    ...DEFAULT_SLATE_STATE,
    notes: Array.isArray(DEFAULT_SLATE_STATE.notes) ? [...DEFAULT_SLATE_STATE.notes] : []
  };
}

function createDefaultBrbState() {
  return { ...DEFAULT_BRB_STATE };
}

const state = {
  ticker: createDefaultTickerState(),
  overlay: createDefaultOverlayState(),
  popup: createDefaultPopupState(),
  slate: createDefaultSlateState(),
  brb: createDefaultBrbState(),
  presets: [],
  scenes: []
};

const SSE_HEARTBEAT_INTERVAL = 25000;

const stateFilePath = (() => {
  const custom = process.env.TICKER_STATE_FILE;
  if (custom) {
    return path.resolve(process.cwd(), custom);
  }
  return path.join(__dirname, 'ticker-state.json');
})();

let writePromise = Promise.resolve();
const sseClients = new Set();
let heartbeatTimer = null;

function resolveTimestamp(source) {
  if (!source || typeof source !== 'object') {
    return null;
  }
  const candidate = Number(source.updatedAt ?? source._updatedAt);
  return Number.isFinite(candidate) ? candidate : null;
}

function computeUpdateTimestamp(currentState) {
  const currentStamp = resolveTimestamp(currentState);
  const now = Date.now();
  if (!Number.isFinite(currentStamp)) {
    return now;
  }
  return now > currentStamp ? now : currentStamp + 1;
}

function isStaleUpdate(payload, currentState) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const incomingStamp = resolveTimestamp(payload);
  if (!Number.isFinite(incomingStamp)) {
    return false;
  }
  const currentStamp = resolveTimestamp(currentState);
  if (!Number.isFinite(currentStamp)) {
    return false;
  }
  return incomingStamp < currentStamp;
}

function respondConflict(res, key, latest, message) {
  res.status(409).json({
    ok: false,
    error: message || 'State update rejected; newer data available on server.',
    [key]: latest
  });
}

function cloneTickerState() {
  return {
    ...state.ticker,
    messages: cloneMessages(state.ticker.messages)
  };
}

function cloneOverlayState() {
  return { ...state.overlay };
}

function clonePopupState() {
  return { ...state.popup };
}

function cloneSlateState() {
  return {
    ...state.slate,
    notes: Array.isArray(state.slate.notes) ? state.slate.notes.slice(0, MAX_NOTES) : []
  };
}

function scheduleHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    broadcastEvent('heartbeat', Date.now());
  }, SSE_HEARTBEAT_INTERVAL);
}

function clearHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function cloneMessages(list) {
  return Array.isArray(list) ? list.slice() : [];
}

function normaliseTickerStateImpl(input = {}, base = state.ticker, options = {}) {
  const { preserveTimestamp = false, timestamp = Date.now() } = options;
  const baseMessages = Array.isArray(base?.messages) ? base.messages : [];
  const result = {
    ...DEFAULT_TICKER_STATE,
    ...(base || {}),
    messages: sanitiseMessages(baseMessages)
  };

  if (Array.isArray(input?.messages)) {
    result.messages = sanitiseMessages(input.messages);
  } else if (Object.prototype.hasOwnProperty.call(input || {}, 'messages')) {
    const list = Array.isArray(input.messages) ? input.messages : [input.messages];
    result.messages = sanitiseMessages(list);
  }

  const displayFallback = Number.isFinite(result.displayDuration)
    ? result.displayDuration
    : DEFAULT_TICKER_STATE.displayDuration;
  if (Object.prototype.hasOwnProperty.call(input || {}, 'displayDuration')) {
    result.displayDuration = clampDurationSeconds(input.displayDuration, displayFallback);
  } else {
    result.displayDuration = clampDurationSeconds(result.displayDuration, DEFAULT_TICKER_STATE.displayDuration);
  }

  const intervalFallback = Number.isFinite(result.intervalBetween)
    ? result.intervalBetween
    : DEFAULT_TICKER_STATE.intervalBetween;
  if (Object.prototype.hasOwnProperty.call(input || {}, 'intervalBetween')) {
    result.intervalBetween = clampIntervalSeconds(input.intervalBetween, intervalFallback);
  } else {
    result.intervalBetween = clampIntervalSeconds(result.intervalBetween, DEFAULT_TICKER_STATE.intervalBetween);
  }

  if (Object.prototype.hasOwnProperty.call(input || {}, 'isActive')) {
    result.isActive = !!input.isActive;
  } else {
    result.isActive = !!result.isActive;
  }

  result.isActive = result.isActive && result.messages.length > 0;

  const updatedAtCandidate = Number(input?.updatedAt ?? input?._updatedAt);
  result.updatedAt = preserveTimestamp && Number.isFinite(updatedAtCandidate)
    ? updatedAtCandidate
    : timestamp;

  result.messages = cloneMessages(result.messages);

  return result;
}

function normaliseOverlayStateImpl(input = {}, base = state.overlay, options = {}) {
  const { preserveTimestamp = false, timestamp = Date.now() } = options;
  const defaults = {
    ...DEFAULT_OVERLAY_STATE,
    ...(base || {})
  };
  const source = input && typeof input === 'object' ? input : {};
  const normalised = typeof normaliseOverlayData === 'function'
    ? normaliseOverlayData(source, defaults)
    : { ...defaults, ...source };
  const updatedAtCandidate = Number(source.updatedAt ?? source._updatedAt);
  const overlay = {
    ...defaults,
    ...normalised,
    updatedAt: preserveTimestamp && Number.isFinite(updatedAtCandidate)
      ? updatedAtCandidate
      : timestamp
  };
  if (typeof overlay.scale === 'number') {
    overlay.scale = clampScaleValue(overlay.scale, DEFAULT_OVERLAY_STATE.scale);
  }
  if (typeof overlay.popupScale === 'number') {
    overlay.popupScale = clampPopupScaleValue(overlay.popupScale, DEFAULT_OVERLAY_STATE.popupScale);
  }
  if (!overlay.highlight) {
    overlay.highlight = DEFAULT_OVERLAY_STATE.highlight || DEFAULT_HIGHLIGHT_STRING;
  }
  if (!overlay.position) overlay.position = 'bottom';
  if (!overlay.mode) overlay.mode = 'auto';
  return overlay;
}

function normalisePopupStateImpl(input = {}, base = state.popup, options = {}) {
  const { preserveTimestamp = false, timestamp = Date.now() } = options;
  const defaults = {
    ...DEFAULT_POPUP_STATE,
    ...(base || {})
  };
  const source = input && typeof input === 'object' ? input : {};
  const normalised = typeof normalisePopupData === 'function'
    ? normalisePopupData(source, defaults, { maxDurationSeconds: MAX_POPUP_SECONDS })
    : { ...defaults, ...source };
  if (source && source.countdownTarget == null) {
    normalised.countdownTarget = null;
  }
  const updatedAtCandidate = Number(source.updatedAt ?? source._updatedAt);
  normalised.updatedAt = preserveTimestamp && Number.isFinite(updatedAtCandidate)
    ? updatedAtCandidate
    : timestamp;
  if (!Number.isFinite(normalised.updatedAt)) {
    normalised.updatedAt = timestamp;
  }
  if (!normalised.text) {
    normalised.text = '';
    normalised.isActive = false;
    normalised.countdownEnabled = false;
    normalised.countdownTarget = null;
  } else if (normalised.countdownTarget == null) {
    normalised.countdownEnabled = false;
    normalised.countdownTarget = null;
  }
  return normalised;
}

function normaliseSlateStateImpl(input = {}, base = state.slate, options = {}) {
  const { preserveTimestamp = false, timestamp = Date.now() } = options;
  const defaults = {
    ...DEFAULT_SLATE_STATE,
    ...(base || {}),
    notes: Array.isArray(base?.notes)
      ? base.notes.slice(0, MAX_NOTES)
      : Array.isArray(DEFAULT_SLATE_STATE.notes)
        ? DEFAULT_SLATE_STATE.notes.slice()
        : []
  };
  const source = input && typeof input === 'object' ? input : {};
  const normalised = typeof normaliseSlateData === 'function'
    ? normaliseSlateData(source, defaults)
    : { ...defaults, ...source };
  const result = {
    ...defaults,
    ...normalised,
    notes: Array.isArray(normalised.notes)
      ? normalised.notes.slice(0, MAX_NOTES)
      : []
  };
  if (Number.isFinite(result.rotationSeconds)) {
    result.rotationSeconds = clampSlateRotationSeconds(result.rotationSeconds, DEFAULT_SLATE_STATE.rotationSeconds);
  }
  const updatedAtCandidate = Number(source.updatedAt ?? source._updatedAt);
  result.updatedAt = preserveTimestamp && Number.isFinite(updatedAtCandidate)
    ? updatedAtCandidate
    : timestamp;
  return result;
}

function normaliseBrbStateImpl(input = {}, base = state.brb, options = {}) {
  const { preserveTimestamp = false, timestamp = Date.now() } = options;
  const defaults = {
    ...DEFAULT_BRB_STATE,
    ...(base || {})
  };
  const source = input && typeof input === 'object' ? input : {};
  let text = defaults.text || '';
  if (typeof source.text === 'string') {
    text = source.text.trim().slice(0, BRB_MAX_LENGTH);
  }
  let isActive = Object.prototype.hasOwnProperty.call(source, 'isActive')
    ? !!source.isActive
    : !!defaults.isActive;
  if (!text) {
    text = '';
    isActive = false;
  }
  const updatedAtCandidate = Number(source.updatedAt ?? source._updatedAt);
  return {
    text,
    isActive: isActive && !!text,
    updatedAt: preserveTimestamp && Number.isFinite(updatedAtCandidate)
      ? updatedAtCandidate
      : timestamp
  };
}

function normalisePresetListImpl(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const idRaw = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : null;
    const id = idRaw || randomUUID();
    if (seen.has(id)) continue;
    seen.add(id);
    const name = String(entry.name || '').trim().slice(0, MAX_PRESET_NAME_LENGTH) || 'Preset';
    const messages = sanitiseMessages(entry.messages || []);
    const updatedAt = Number.isFinite(Number(entry.updatedAt ?? entry._updatedAt))
      ? Number(entry.updatedAt ?? entry._updatedAt)
      : Date.now();
    result.push({ id, name, messages, updatedAt });
  }
  return result;
}

function normaliseSceneListImpl(list, options = {}) {
  if (!Array.isArray(list)) return [];
  const fallbackDisplay = Number.isFinite(options.fallbackDisplayDuration)
    ? options.fallbackDisplayDuration
    : Number.isFinite(state.ticker?.displayDuration)
      ? state.ticker.displayDuration
      : DEFAULT_TICKER_STATE.displayDuration;
  const fallbackInterval = Number.isFinite(options.fallbackIntervalSeconds)
    ? options.fallbackIntervalSeconds
    : Number.isFinite(state.ticker?.intervalBetween)
      ? state.ticker.intervalBetween
      : DEFAULT_TICKER_STATE.intervalBetween;
  const seen = new Set();
  const result = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const normalised = typeof normaliseSceneEntry === 'function'
      ? normaliseSceneEntry(entry, {
          fallbackDisplayDuration: fallbackDisplay,
          fallbackIntervalSeconds: fallbackInterval,
          maxMessages: MAX_MESSAGES,
          maxMessageLength: MAX_MESSAGE_LENGTH
        })
      : null;
    if (!normalised) continue;
    const id = String(normalised.id || entry.id || randomUUID());
    if (seen.has(id)) continue;
    seen.add(id);
    const updatedAt = Number.isFinite(Number(entry.updatedAt ?? normalised.updatedAt))
      ? Number(entry.updatedAt ?? normalised.updatedAt)
      : Date.now();
    const originalPopup = entry && typeof entry.popup === 'object' ? entry.popup : {};
    const popupState = normalised.popup
      ? { ...normalised.popup }
      : normalisePopupStateImpl({}, undefined, { timestamp: updatedAt });
    if (originalPopup && originalPopup.countdownTarget == null) {
      popupState.countdownTarget = null;
    }
    if (!popupState.text || !popupState.countdownEnabled || popupState.countdownTarget == null) {
      popupState.countdownEnabled = false;
      popupState.countdownTarget = null;
    }
    result.push({
      id,
      name: normalised.name,
      ticker: {
        ...normalised.ticker,
        messages: cloneMessages(normalised.ticker?.messages)
      },
      popup: popupState,
      overlay: normalised.overlay ? { ...normalised.overlay } : null,
      slate: normalised.slate
        ? {
            ...normalised.slate,
            notes: Array.isArray(normalised.slate.notes) ? normalised.slate.notes.slice(0, MAX_NOTES) : []
          }
        : null,
      updatedAt
    });
  }
  return result;
}

function applyTickerUpdate(input, options = {}) {
  const next = normaliseTickerStateImpl(input, options.base || state.ticker, options);
  state.ticker = next;
  return state.ticker;
}

function applyOverlayUpdate(input, options = {}) {
  const next = normaliseOverlayStateImpl(input, options.base || state.overlay, options);
  state.overlay = next;
  return state.overlay;
}

function applyPopupUpdate(input, options = {}) {
  const next = normalisePopupStateImpl(input, options.base || state.popup, options);
  state.popup = next;
  return state.popup;
}

function applySlateUpdate(input, options = {}) {
  const next = normaliseSlateStateImpl(input, options.base || state.slate, options);
  state.slate = next;
  return state.slate;
}

function applyBrbUpdate(input, options = {}) {
  const next = normaliseBrbStateImpl(input, options.base || state.brb, options);
  state.brb = next;
  return state.brb;
}

function applyPresetsUpdate(list) {
  state.presets = normalisePresetListImpl(list).map(preset => ({
    ...preset,
    messages: cloneMessages(preset.messages)
  }));
  return state.presets;
}

function applyScenesUpdate(list, options = {}) {
  state.scenes = normaliseSceneListImpl(list, options).map(scene => ({
    ...scene,
    ticker: {
      ...scene.ticker,
      messages: cloneMessages(scene.ticker?.messages)
    },
    popup: { ...scene.popup },
    overlay: scene.overlay ? { ...scene.overlay } : null,
    slate: scene.slate
      ? { ...scene.slate, notes: Array.isArray(scene.slate.notes) ? scene.slate.notes.slice(0, MAX_NOTES) : [] }
      : null
  }));
  return state.scenes;
}

function exportStateSnapshot() {
  return {
    ticker: {
      ...state.ticker,
      messages: cloneMessages(state.ticker.messages)
    },
    overlay: { ...state.overlay },
    popup: { ...state.popup },
    slate: {
      ...state.slate,
      notes: Array.isArray(state.slate.notes) ? state.slate.notes.slice(0, MAX_NOTES) : []
    },
    brb: { ...state.brb },
    presets: state.presets.map(preset => ({
      ...preset,
      messages: cloneMessages(preset.messages)
    })),
    scenes: state.scenes.map(scene => ({
      ...scene,
      ticker: {
        ...scene.ticker,
        messages: cloneMessages(scene.ticker?.messages)
      },
      popup: { ...scene.popup },
      overlay: scene.overlay ? { ...scene.overlay } : null,
      slate: scene.slate
        ? { ...scene.slate, notes: Array.isArray(scene.slate.notes) ? scene.slate.notes.slice(0, MAX_NOTES) : [] }
        : null,
      updatedAt: scene.updatedAt
    }))
  };
}

async function persistState() {
  const snapshot = exportStateSnapshot();
  const payload = JSON.stringify(snapshot, null, 2);
  writePromise = writePromise
    .then(() => fsp.mkdir(path.dirname(stateFilePath), { recursive: true }))
    .then(() => fsp.writeFile(stateFilePath, payload, 'utf8'))
    .catch(error => {
      console.error('[ticker] Failed to persist state file', error);
    });
  await writePromise;
}

function broadcastEvent(event, data) {
  const serialised = typeof data === 'string' ? data : JSON.stringify(data);
  for (const client of sseClients) {
    try {
      client.write(`event: ${event}\ndata: ${serialised}\n\n`);
    } catch (error) {
      sseClients.delete(client);
      try {
        client.end();
      } catch (endError) {
        console.warn('[ticker] Failed to close SSE client', endError);
      }
    }
  }
  if (!sseClients.size) {
    clearHeartbeat();
  }
}

function sendFullState(res) {
  const snapshot = exportStateSnapshot();
  res.write(`event: ticker\ndata: ${JSON.stringify(snapshot.ticker)}\n\n`);
  res.write(`event: overlay\ndata: ${JSON.stringify(snapshot.overlay)}\n\n`);
  res.write(`event: popup\ndata: ${JSON.stringify(snapshot.popup)}\n\n`);
  res.write(`event: slate\ndata: ${JSON.stringify(snapshot.slate)}\n\n`);
  res.write(`event: brb\ndata: ${JSON.stringify(snapshot.brb)}\n\n`);
  res.write(`event: presets\ndata: ${JSON.stringify(snapshot.presets)}\n\n`);
  res.write(`event: scenes\ndata: ${JSON.stringify(snapshot.scenes)}\n\n`);
}

async function loadStateFromDisk() {
  try {
    const raw = await fsp.readFile(stateFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    const now = Date.now();
    if (parsed && typeof parsed === 'object') {
      if (parsed.ticker) {
        applyTickerUpdate(parsed.ticker, { preserveTimestamp: true, base: parsed.ticker, timestamp: now });
      }
      if (parsed.overlay) {
        applyOverlayUpdate(parsed.overlay, { preserveTimestamp: true, base: parsed.overlay, timestamp: now });
      }
      if (parsed.popup) {
        applyPopupUpdate(parsed.popup, { preserveTimestamp: true, base: parsed.popup, timestamp: now });
      }
      if (parsed.slate) {
        applySlateUpdate(parsed.slate, { preserveTimestamp: true, base: parsed.slate, timestamp: now });
      }
      if (parsed.brb) {
        applyBrbUpdate(parsed.brb, { preserveTimestamp: true, base: parsed.brb, timestamp: now });
      }
      if (Array.isArray(parsed.presets)) {
        applyPresetsUpdate(parsed.presets);
      }
      if (Array.isArray(parsed.scenes)) {
        applyScenesUpdate(parsed.scenes, {
          fallbackDisplayDuration: parsed.ticker?.displayDuration,
          fallbackIntervalSeconds: parsed.ticker?.intervalBetween
        });
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[ticker] Failed to load state file', error);
    }
  }
}

function applySceneActivation(sceneId) {
  const targetId = String(sceneId || '').trim();
  if (!targetId) {
    const err = new Error('Scene ID is required');
    err.status = 400;
    throw err;
  }
  const scene = state.scenes.find(entry => entry.id === targetId);
  if (!scene) {
    const err = new Error('Scene not found');
    err.status = 404;
    throw err;
  }
  const timestamp = Date.now();
  applyTickerUpdate(scene.ticker || {}, { preserveTimestamp: false, base: scene.ticker, timestamp });
  applyPopupUpdate(scene.popup || {}, { preserveTimestamp: false, base: scene.popup, timestamp });
  if (scene.overlay) {
    applyOverlayUpdate(scene.overlay, { preserveTimestamp: false, base: scene.overlay, timestamp });
  }
  if (scene.slate) {
    applySlateUpdate(scene.slate, { preserveTimestamp: false, base: scene.slate, timestamp });
  }
  return scene;
}

function respondError(res, status, message) {
  res.status(status).json({ ok: false, error: message || 'Request failed' });
}

function respondOk(res, body = {}) {
  res.json({ ok: true, ...body });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

app.get('/ticker/state', (req, res) => {
  res.json({
    ...state.ticker,
    messages: cloneMessages(state.ticker.messages)
  });
});

app.post('/ticker/state', async (req, res) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    if (isStaleUpdate(payload, state.ticker)) {
      respondConflict(res, 'state', cloneTickerState(), 'Ticker state is newer on the server.');
      return;
    }
    applyTickerUpdate(payload, { preserveTimestamp: false, timestamp: computeUpdateTimestamp(state.ticker) });
    await persistState();
    broadcastEvent('ticker', state.ticker);
    respondOk(res, { state: state.ticker });
  } catch (error) {
    respondError(res, 400, error.message || 'Invalid ticker payload');
  }
});

app.get('/ticker/overlay', (req, res) => {
  res.json({ ...state.overlay });
});

app.post('/ticker/overlay', async (req, res) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    if (isStaleUpdate(payload, state.overlay)) {
      respondConflict(res, 'overlay', cloneOverlayState(), 'Overlay preferences were updated elsewhere.');
      return;
    }
    applyOverlayUpdate(payload, { preserveTimestamp: false, timestamp: computeUpdateTimestamp(state.overlay) });
    await persistState();
    broadcastEvent('overlay', state.overlay);
    respondOk(res, { overlay: state.overlay });
  } catch (error) {
    respondError(res, 400, error.message || 'Invalid overlay payload');
  }
});

app.get('/popup/state', (req, res) => {
  res.json({ ...state.popup });
});

app.post('/popup/state', async (req, res) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    if (isStaleUpdate(payload, state.popup)) {
      respondConflict(res, 'popup', clonePopupState(), 'Popup state is newer on the server.');
      return;
    }
    applyPopupUpdate(payload, { preserveTimestamp: false, timestamp: computeUpdateTimestamp(state.popup) });
    await persistState();
    broadcastEvent('popup', state.popup);
    respondOk(res, { popup: state.popup });
  } catch (error) {
    respondError(res, 400, error.message || 'Invalid popup payload');
  }
});

app.get('/slate/state', (req, res) => {
  res.json({
    ...state.slate,
    notes: Array.isArray(state.slate.notes) ? state.slate.notes.slice(0, MAX_NOTES) : []
  });
});

app.post('/slate/state', async (req, res) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    if (isStaleUpdate(payload, state.slate)) {
      respondConflict(res, 'slate', cloneSlateState(), 'Slate state is newer on the server.');
      return;
    }
    applySlateUpdate(payload, { preserveTimestamp: false, timestamp: computeUpdateTimestamp(state.slate) });
    await persistState();
    broadcastEvent('slate', state.slate);
    respondOk(res, { slate: state.slate });
  } catch (error) {
    respondError(res, 400, error.message || 'Invalid slate payload');
  }
});

app.get('/brb/state', (req, res) => {
  res.json({ ...state.brb });
});

app.post('/brb/state', async (req, res) => {
  try {
    applyBrbUpdate(req.body || {}, { preserveTimestamp: false, timestamp: Date.now() });
    await persistState();
    broadcastEvent('brb', state.brb);
    respondOk(res, { state: state.brb });
  } catch (error) {
    respondError(res, 400, error.message || 'Invalid BRB payload');
  }
});

app.get('/ticker/presets', (req, res) => {
  res.json({ presets: state.presets.map(preset => ({
    ...preset,
    messages: cloneMessages(preset.messages)
  })) });
});

app.post('/ticker/presets', async (req, res) => {
  try {
    const presets = Array.isArray(req.body?.presets) ? req.body.presets : [];
    applyPresetsUpdate(presets);
    await persistState();
    broadcastEvent('presets', state.presets);
    respondOk(res, { presets: state.presets });
  } catch (error) {
    respondError(res, 400, error.message || 'Invalid presets payload');
  }
});

app.get('/ticker/scenes', (req, res) => {
  res.json({ scenes: state.scenes.map(scene => ({
    ...scene,
    ticker: {
      ...scene.ticker,
      messages: cloneMessages(scene.ticker?.messages)
    },
    popup: { ...scene.popup },
    overlay: scene.overlay ? { ...scene.overlay } : null,
    slate: scene.slate
      ? { ...scene.slate, notes: Array.isArray(scene.slate.notes) ? scene.slate.notes.slice(0, MAX_NOTES) : [] }
      : null
  })) });
});

app.post('/ticker/scenes', async (req, res) => {
  try {
    const scenes = Array.isArray(req.body?.scenes) ? req.body.scenes : [];
    applyScenesUpdate(scenes, {
      fallbackDisplayDuration: state.ticker.displayDuration,
      fallbackIntervalSeconds: state.ticker.intervalBetween
    });
    await persistState();
    broadcastEvent('scenes', state.scenes);
    respondOk(res, { scenes: state.scenes });
  } catch (error) {
    respondError(res, 400, error.message || 'Invalid scenes payload');
  }
});

app.post('/ticker/scenes/apply', async (req, res) => {
  try {
    const { sceneId } = req.body || {};
    const scene = applySceneActivation(sceneId);
    await persistState();
    broadcastEvent('ticker', state.ticker);
    broadcastEvent('popup', state.popup);
    broadcastEvent('overlay', state.overlay);
    broadcastEvent('slate', state.slate);
    respondOk(res, { sceneId: scene.id });
  } catch (error) {
    respondError(res, error.status || 400, error.message || 'Failed to activate scene');
  }
});

app.get('/ticker/state/export', (req, res) => {
  res.json(exportStateSnapshot());
});

app.post('/ticker/state/import', async (req, res) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const now = Date.now();
    if (payload.ticker) {
      applyTickerUpdate(payload.ticker, { preserveTimestamp: true, base: payload.ticker, timestamp: now });
    } else {
      applyTickerUpdate({}, { preserveTimestamp: false, timestamp: now });
    }
    if (payload.overlay) {
      applyOverlayUpdate(payload.overlay, { preserveTimestamp: true, base: payload.overlay, timestamp: now });
    }
    if (payload.popup) {
      applyPopupUpdate(payload.popup, { preserveTimestamp: true, base: payload.popup, timestamp: now });
    }
    if (payload.slate) {
      applySlateUpdate(payload.slate, { preserveTimestamp: true, base: payload.slate, timestamp: now });
    }
    if (payload.brb) {
      applyBrbUpdate(payload.brb, { preserveTimestamp: true, base: payload.brb, timestamp: now });
    }
    if (Array.isArray(payload.presets)) {
      applyPresetsUpdate(payload.presets);
    }
    if (Array.isArray(payload.scenes)) {
      applyScenesUpdate(payload.scenes, {
        fallbackDisplayDuration: payload.ticker?.displayDuration,
        fallbackIntervalSeconds: payload.ticker?.intervalBetween
      });
    }
    await persistState();
    broadcastEvent('ticker', state.ticker);
    broadcastEvent('overlay', state.overlay);
    broadcastEvent('popup', state.popup);
    broadcastEvent('slate', state.slate);
    broadcastEvent('brb', state.brb);
    broadcastEvent('presets', state.presets);
    broadcastEvent('scenes', state.scenes);
    respondOk(res, { state: state.ticker });
  } catch (error) {
    respondError(res, 400, error.message || 'Failed to import state');
  }
});

app.get('/ticker/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 3000\n\n');
  sseClients.add(res);
  scheduleHeartbeat();
  sendFullState(res);
  req.on('close', () => {
    sseClients.delete(res);
    if (!sseClients.size) {
      clearHeartbeat();
    }
  });
  req.on('error', () => {
    sseClients.delete(res);
    if (!sseClients.size) {
      clearHeartbeat();
    }
  });
});

// Specific route for new dashboard
app.get('/ticker/dashboard', (req, res) => {
  res.sendFile(path.join(assetDir, 'dashboard-new.html'));
});

app.use('/ticker', express.static(assetDir));

if (assetDir === DEFAULT_ASSET_DIR) {
  app.use(express.static(assetDir));
}

async function start() {
  await loadStateFromDisk();
  const host =
    process.env.HTTP_HOST ||
    process.env.HOST ||
    (process.platform === 'win32' ? '127.0.0.1' : '0.0.0.0');
  const port = Number(process.env.HTTP_PORT || process.env.PORT) || 3000;
  
  const server = app.listen(port, host);
  const wsInstance = expressWs(app, server);

  // WebSocket endpoint for real-time communication
  app.ws('/ws', (ws, req) => {
    const clientId = uuidv4();
    ws.clientId = clientId;
    console.log(`[ticker] Client ${clientId} connected`);

    ws.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg);
        const { type, payload } = data;
        
        switch (type) {
          case 'ticker':
            await handleTickerUpdate(payload);
            break;
          case 'overlay':
            await handleOverlayUpdate(payload);
            break;
          case 'popup':
            await handlePopupUpdate(payload);
            break;
          case 'slate':
            await handleSlateUpdate(payload);
            break;
          case 'brb':
            await handleBrbUpdate(payload);
            break;
        }

        broadcastToAllClients({ type, payload: state[type] });
      } catch (error) {
        console.error('[ticker] WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          error: error.message 
        }));
      }
    });

    ws.on('close', () => {
      console.log(`[ticker] Client ${clientId} disconnected`);
    });

    // Send initial state
    ws.send(JSON.stringify({ type: 'init', state }));
  });

  const baseUrl = `http://${host}:${port}`;
  console.log(`[ticker] listening on ${baseUrl}`);
  console.log(`[ticker] dashboard available at ${baseUrl}/ticker/index.html`);
  console.log(`[ticker] NEW dashboard available at ${baseUrl}/ticker/dashboard`);
  console.log(`[ticker] overlay available at ${baseUrl}/ticker/output.html`);
  console.log(`[ticker] WebSocket available at ws://${host}:${port}/ws`);
  const shutdown = () => {
    server.close(() => {
      clearHeartbeat();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(error => {
  console.error('[ticker] Failed to start server', error);
  process.exitCode = 1;
});
