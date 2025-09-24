// server.js — unified HTTP server for BRB + Ticker
// Save at: B:\m0_scripts\m0_PopUps\server.js
// State persists in: B:\m0_scripts\m0_PopUps\ticker-state.json
// Run:     npm i express cors && node server.js

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const fsp = fs.promises;

const HTTP_HOST = '127.0.0.1';
const HTTP_PORT = 3000;

// Adjust this if you move the folder. Can be overridden via TICKER_DIR env var.
const DEFAULT_TICKER_DIR = 'B:\\m0_scripts\\m0_Ticker';
const TICKER_DIR_INPUT = process.env.TICKER_DIR || DEFAULT_TICKER_DIR;
const PUBLIC_TICKER = path.resolve(TICKER_DIR_INPUT);
const STATE_FILE = path.join(__dirname, 'ticker-state.json');

const PERSIST_DEBOUNCE_MS = 150;

const DEFAULT_OVERLAY = {
  label: 'LIVE',
  accent: '#ef4444',
  highlight: 'YouTube,Twitch,Discord,Patreon,breaking,update,tonight,today',
  scale: 1.75,
  position: 'bottom',
  mode: 'auto',
  accentAnim: true,
  sparkle: true,
  _updatedAt: Date.now()
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

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
  overlay: { ...DEFAULT_OVERLAY }
};

// ---- Health
app.get('/health', (req, res) => {
  res.json({ ok: true, t: Date.now() });
});

// ---- Ticker API
app.get('/ticker/state', (req, res) => {
  res.json(state.ticker);
});

app.post('/ticker/state', (req, res) => {
  try {
    const { isActive, messages, displayDuration, intervalBetween } = req.body || {};
    if (Array.isArray(messages)) state.ticker.messages = sanitiseMessages(messages);
    if (typeof isActive === 'boolean') state.ticker.isActive = isActive;
    if (Number.isFinite(displayDuration)) state.ticker.displayDuration = clampDuration(displayDuration);
    if (Number.isFinite(intervalBetween)) state.ticker.intervalBetween = clampInterval(intervalBetween);
    if (!state.ticker.messages.length) state.ticker.isActive = false;
    state.ticker._updatedAt = Date.now();
    schedulePersist();
    res.json({ ok: true, state: state.ticker });
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
    const overlay = sanitiseOverlayInput(req.body || {});
    state.overlay = { ...state.overlay, ...overlay, _updatedAt: Date.now() };
    schedulePersist();
    res.json({ ok: true, overlay: state.overlay });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
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
    if (typeof text === 'string') state.brb.text = text;
    state.brb._updatedAt = Date.now();
    schedulePersist();
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
    state.presets = sanitisePresetList(presets);
    schedulePersist();
    res.json({ ok: true, presets: state.presets });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ---- Static files: /ticker/index.html and /ticker/output.html
app.use('/ticker', express.static(PUBLIC_TICKER, {
  etag: false,
  lastModified: false,
  cacheControl: false,
  maxAge: 0
}));

// ---- State persistence helpers
function sanitiseMessages(list) {
  if (!Array.isArray(list)) return [];
  const cleaned = [];
  for (const entry of list) {
    const trimmed = String(entry).trim();
    if (trimmed) cleaned.push(trimmed);
  }
  return cleaned;
}

function generatePresetId() {
  return 'preset-' + Math.random().toString(36).slice(2, 7) + Date.now().toString(36);
}

function sanitisePresetEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const name = String(entry.name || '').trim();
  if (!name) return null;
  const messages = sanitiseMessages(entry.messages);
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

function sanitisePresetList(list) {
  if (!Array.isArray(list)) return [];
  const cleaned = [];
  for (const entry of list) {
    const normalised = sanitisePresetEntry(entry);
    if (normalised) cleaned.push(normalised);
  }
  return cleaned;
}

function clampDuration(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return state.ticker.displayDuration;
  return Math.min(Math.max(Math.round(numeric), 2), 90);
}

function clampInterval(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return state.ticker.intervalBetween;
  return Math.min(Math.max(Math.round(numeric), 0), 3600);
}

function clampScale(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return state.overlay.scale;
  return Math.min(Math.max(Math.round(numeric * 100) / 100, 0.75), 2.5);
}

function normaliseHighlightString(value) {
  return String(value || '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .join(',');
}

function normalisePosition(value) {
  const lower = String(value || '').toLowerCase();
  return lower === 'top' ? 'top' : 'bottom';
}

function normaliseMode(value) {
  const lower = String(value || '').toLowerCase();
  return ['auto', 'marquee', 'chunk'].includes(lower) ? lower : 'auto';
}

function sanitiseOverlayInput(input) {
  const result = {};
  if (typeof input.label === 'string') {
    const trimmed = input.label.trim().slice(0, 48);
    if (trimmed) result.label = trimmed;
  }
  if (typeof input.accent === 'string') {
    result.accent = input.accent.trim().slice(0, 48);
  }
  if (typeof input.highlight === 'string') {
    result.highlight = normaliseHighlightString(input.highlight).slice(0, 512);
  }
  if (Number.isFinite(input.scale)) {
    result.scale = clampScale(input.scale);
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
  return result;
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
    state.presets = sanitisePresetList(partial.presets);
  }
  if (partial.overlay && typeof partial.overlay === 'object') {
    const overlay = sanitiseOverlayInput(partial.overlay);
    state.overlay = {
      ...state.overlay,
      ...overlay,
      _updatedAt: Number.isFinite(partial.overlay._updatedAt) ? partial.overlay._updatedAt : Date.now()
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
  await fsp.writeFile(STATE_FILE, payload, 'utf8');
}

loadStateFromDisk().finally(() => {
  console.log('[state] persistence initialised');
  console.log(`[http] serving static files from ${PUBLIC_TICKER}`);
  app.listen(HTTP_PORT, HTTP_HOST, () => {
    console.log(`[http] listening on http://${HTTP_HOST}:${HTTP_PORT}`);
    console.log(`[http] ticker files at http://${HTTP_HOST}:${HTTP_PORT}/ticker/`);
  });
});