        // server.js - Enhanced OBS Luxury Widgets Server v2.0
// Full implementation with all critical features

require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { z } = require('zod');

const env = {
  port: parseInt(process.env.PORT || '4155', 10),
  host: process.env.HOST || '0.0.0.0',
  dbPath: process.env.STATE_DB_PATH || path.join(__dirname, 'db', 'state.json'),
  analyticsIntervalMs: parseInt(process.env.ANALYTICS_INTERVAL_MS || '15000', 10),
  logLevel: (process.env.LOG_LEVEL || 'info').toLowerCase()
};

const config = Object.freeze({
  PORT: env.port,
  HOST: env.host,
  DB_PATH: env.dbPath,
  ANALYTICS_INTERVAL_MS: env.analyticsIntervalMs,
  STATE_VERSION: '2.1.0',
  LOG_LEVEL: env.logLevel
});

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const MIN_LOG_LEVEL = LOG_LEVELS[config.LOG_LEVEL] ?? LOG_LEVELS.info;

const serializeError = err => {
  if (!err) return undefined;
  return {
    name: err.name,
    message: err.message,
    stack: err.stack
  };
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

const formatTime = timestamp => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
};

const formatMeta = meta => {
  if (!meta || Object.keys(meta).length === 0) return '';

  const parts = [];
  for (const [key, value] of Object.entries(meta)) {
    if (key === 'error' && value instanceof Error) {
      parts.push(`${colors.dim}${key}=${colors.red}${value.message}${colors.reset}`);
    } else if (typeof value === 'string') {
      parts.push(`${colors.dim}${key}=${colors.cyan}${value}${colors.reset}`);
    } else if (typeof value === 'number') {
      parts.push(`${colors.dim}${key}=${colors.yellow}${value}${colors.reset}`);
    } else {
      parts.push(`${colors.dim}${key}=${colors.white}${JSON.stringify(value)}${colors.reset}`);
    }
  }
  const separator = ` ${colors.gray}•${colors.reset} `;
  return parts.length > 0
    ? ` ${colors.gray}│${colors.reset} ${parts.join(separator)}`
    : '';
};

const writeLog = (level, message, meta = {}) => {
  if (LOG_LEVELS[level] > MIN_LOG_LEVEL) return;

  const timestamp = new Date().toISOString();

  // Serialize full payload for machine parsing (can be piped to file)
  const payload = {
    level,
    timestamp,
    message,
    ...meta
  };

  if (payload.error instanceof Error) {
    payload.error = serializeError(payload.error);
  }

  // Check if output is TTY (terminal) for pretty formatting
  const isTTY = process.stdout.isTTY;

  if (isTTY) {
    // Pretty format for terminal
    let levelIcon, levelColor, levelLabel;

    switch (level) {
      case 'error':
        levelIcon = '✗';
        levelColor = colors.red;
        levelLabel = 'ERROR';
        break;
      case 'warn':
        levelIcon = '⚠';
        levelColor = colors.yellow;
        levelLabel = 'WARN ';
        break;
      case 'info':
        levelIcon = '✓';
        levelColor = colors.green;
        levelLabel = 'INFO ';
        break;
      case 'debug':
        levelIcon = '●';
        levelColor = colors.blue;
        levelLabel = 'DEBUG';
        break;
      default:
        levelIcon = '•';
        levelColor = colors.white;
        levelLabel = level.toUpperCase().padEnd(5);
    }

    const time = formatTime(timestamp);
    const metaStr = formatMeta(meta);

    const levelPart = `${levelColor}${levelIcon} ${levelLabel}${colors.reset}`;
    const msgPart = `${colors.bright}${message}${colors.reset}`;
    const output = `${colors.dim}${time}${colors.reset} ${levelPart} ${msgPart}${metaStr}`;

    if (level === 'error') console.error(output);
    else if (level === 'warn') console.warn(output);
    else console.log(output);
  } else {
    // JSON format for non-TTY (pipes, logs, etc.)
    const serialized = JSON.stringify(payload);
    if (level === 'error') console.error(serialized);
    else if (level === 'warn') console.warn(serialized);
    else console.log(serialized);
  }
};

const logger = {
  info: (msg, meta) => writeLog('info', msg, meta),
  warn: (msg, meta) => writeLog('warn', msg, meta),
  error: (msg, meta) => writeLog('error', msg, meta),
  debug: (msg, meta) => writeLog('debug', msg, meta)
};

const { PORT, HOST, DB_PATH, ANALYTICS_INTERVAL_MS, STATE_VERSION } = config;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const ASSETS_DIR = path.join(__dirname, 'assets');
const PUBLIC_INDEX = path.join(__dirname, 'index.html');
const OVERLAY_INDEX = path.join(__dirname, 'output.html');

app.use('/assets', express.static(ASSETS_DIR));
app.use(express.json()); // Parse JSON request bodies

app.get('/', (req, res) => {
  res.sendFile(PUBLIC_INDEX);
});

app.get('/overlay', (req, res) => {
  const filePath = fs.existsSync(OVERLAY_INDEX) ? OVERLAY_INDEX : PUBLIC_INDEX;
  res.sendFile(filePath);
});

// Debug and analytics endpoints
app.get('/debug/state', (req, res) => {
  res.json(state);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: STATE_VERSION,
    uptime: process.uptime(),
    connections: wss.clients.size,
    messagesProcessed: metrics.messagesProcessed || 0
  });
});

app.get('/metrics', (req, res) => {
  res.json(metrics);
});

app.get('/analytics', (req, res) => {
  res.json(getAnalyticsPayload());
});

app.get('/export', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="obs-config-${Date.now()}.json"`);
  res.json(state);
});

// Webhook endpoints for external integrations (Stream Deck, Touch Portal, etc.)
app.get('/hook/ticker/show', (req, res) => {
  try {
    // Clear existing timers to prevent conflicts
    if (autoRotateTimer) {
      clearTimeout(autoRotateTimer);
      autoRotateTimer = null;
    }
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      autoHideTimer = null;
    }

    state.ticker.enabled = true;
    broadcastToOverlays({ type: 'ticker:show', ts: Date.now() });
    broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
    saveState();

    // FIXED: If auto-rotate is enabled, schedule auto-hide and resume rotation
    if (state.ticker.settings.autoRotate && state.ticker.settings.intervalMin > 0) {
      const durationMs = state.ticker.settings.durationSec * 1000;
      logger.info('Webhook show with auto-rotation enabled - scheduling auto-hide', {
        durationSec: state.ticker.settings.durationSec
      });

      autoHideTimer = setTimeout(() => {
        state.ticker.enabled = false;
        broadcastToOverlays({ type: 'ticker:hide', ts: Date.now() });
        broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
        autoHideTimer = null;

        logger.info('Webhook show auto-hide complete - resuming rotation cycle');
        startAutoRotation();
      }, durationMs);
    }

    res.json({ success: true, message: 'Ticker shown' });
  } catch (err) {
    logger.error('Webhook error: ticker/show', { error: err });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/hook/ticker/hide', (req, res) => {
  try {
    // Clear existing timers
    if (autoRotateTimer) {
      clearTimeout(autoRotateTimer);
      autoRotateTimer = null;
    }
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      autoHideTimer = null;
    }

    state.ticker.enabled = false;
    broadcastToOverlays({ type: 'ticker:hide', ts: Date.now() });
    broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
    saveState();

    // FIXED: If auto-rotate is enabled, restart rotation cycle
    if (state.ticker.settings.autoRotate && state.ticker.settings.intervalMin > 0) {
      logger.info('Webhook hide with auto-rotation enabled - restarting rotation cycle');
      startAutoRotation();
    }

    res.json({ success: true, message: 'Ticker hidden' });
  } catch (err) {
    logger.error('Webhook error: ticker/hide', { error: err });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/hook/message/add', (req, res) => {
  try {
    const { text, category, priority, accentWords, insertNow } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }

    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      category: category || 'general',
      priority: priority || 1,
      accentWords: accentWords || '',
      enabled: true,
      sortIndex: state.ticker.messages.length,
      createdAt: Date.now()
    };

    state.ticker.messages.push(newMessage);
    saveState();
    broadcastToAll({ type: 'state', ts: Date.now(), payload: state });

    // FIXED: insertNow respects auto-rotation
    if (insertNow && !state.ticker.enabled) {
      // Clear existing timers
      if (autoRotateTimer) {
        clearTimeout(autoRotateTimer);
        autoRotateTimer = null;
      }
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        autoHideTimer = null;
      }

      state.ticker.enabled = true;
      broadcastToOverlays({ type: 'ticker:show', ts: Date.now() });

      // If auto-rotate enabled, schedule auto-hide and resume rotation
      if (state.ticker.settings.autoRotate && state.ticker.settings.intervalMin > 0) {
        const durationMs = state.ticker.settings.durationSec * 1000;
        autoHideTimer = setTimeout(() => {
          state.ticker.enabled = false;
          broadcastToOverlays({ type: 'ticker:hide', ts: Date.now() });
          broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
          autoHideTimer = null;
          startAutoRotation();
        }, durationMs);
      }
    }

    res.json({ success: true, message: newMessage });
  } catch (err) {
    logger.error('Webhook error: message/add', { error: err });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/hook/popup/queue', (req, res) => {
  try {
    const { message, duration, variant, position } = req.query;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message parameter is required' });
    }

    if (!state.popupQueue) state.popupQueue = [];

    const queuedPopup = {
      id: `popup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      autoDismissSec: parseInt(duration) || 10,
      variant: variant || 'standard',
      position: position || 'top-left',
      queuedAt: Date.now()
    };

    state.popupQueue.push(queuedPopup);
    saveState();
    broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });

    res.json({ success: true, popup: queuedPopup });
  } catch (err) {
    logger.error('Webhook error: popup/queue', { error: err });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/hook/scene/apply', (req, res) => {
  try {
    const { name, id } = req.query;

    if (!name && !id) {
      return res.status(400).json({ success: false, error: 'Scene name or id is required' });
    }

    const scene = state.scenes?.find(s => s.name === name || s.id === id);

    if (!scene) {
      return res.status(404).json({ success: false, error: 'Scene not found' });
    }

    state.ticker = { ...state.ticker, ...JSON.parse(JSON.stringify(scene.ticker)) };
    state.popup = { ...state.popup, ...JSON.parse(JSON.stringify(scene.popup)) };
    state.theme = { ...state.theme, ...JSON.parse(JSON.stringify(scene.theme)) };
    saveState();
    broadcastToAll({ type: 'state', ts: Date.now(), payload: state });

    res.json({ success: true, scene: scene.name });
  } catch (err) {
    logger.error('Webhook error: scene/apply', { error: err });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/hook/popup', (req, res) => {
  try {
    const popupData = req.body;

    if (!popupData.message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    state.popup = {
      ...state.popup,
      ...popupData,
      visible: true
    };
    saveState();
    broadcastToOverlays({ type: 'popup:show', ts: Date.now(), payload: state.popup });
    broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });

    res.json({ success: true, popup: state.popup });
  } catch (err) {
    logger.error('Webhook error: popup', { error: err });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Ensure db directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Default state with all new features
const DEFAULT_STATE = {
  _version: STATE_VERSION,
  ticker: {
    enabled: true,
    messages: [],
    settings: {
      intervalMin: 0,
      durationSec: 10,
      speed: 60,
      mode: 'continuous', // 'continuous' | 'sequential' | 'random' | 'weighted'
      autoRotate: true,
      easingOnWrap: true,
      rotationIndex: 0,
      fontSize: 18,
      opacity: 0.95
    },
    schedule: {
      enabled: false,
      times: [], // Array of { hour, minute, duration }
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    }
  },
  popup: {
    visible: false,
    message: '',
    ctaLabel: '',
    ctaUrl: '',
    autoDismissSec: 0,
    pinned: false,
    position: 'top-left', // 9-grid positioning
    variant: 'standard', // 'minimal' | 'standard' | 'elevated' | 'alert' | 'success'
    animationType: 'spring', // 'spring' | 'fade' | 'slide' | 'bounce'
    fontSize: 17,
    opacity: 0.95
  },
  popupQueue: [], // Multi-popup support
  theme: {
    preset: 'midnight-luxe',
    accentPrimary: '#d4af37',
    accentSecondary: '#e5e4e2',
    overlayScale: 1.75,
    popupScale: 1,
    position: 'bottom', // 'bottom' | 'top'
    glassIntensity: 20,
    particleDensity: 500,
    opacity: 0.95,
    edgeLighting: true,
    accentShimmer: true,
    sparkleEffects: true
  },
  scenes: [],
  presets: [],
  templates: {},
  bulkConfigs: [],
  history: [],
  metadata: {
    lastSaved: Date.now(),
    changeHistory: [], // User-visible change log
    safeZonesVisible: false
  },
  analytics: {
    totalTickerShows: 0,
    totalTickerMessagesServed: 0,
    messageViews: {},
    popupShows: 0,
    popupDismissed: 0,
    lastUpdated: null
  }
};

function getDefaultAnalytics() {
  return {
    totalTickerShows: 0,
    totalTickerMessagesServed: 0,
    messageViews: {},
    popupShows: 0,
    popupDismissed: 0,
    lastUpdated: null
  };
}

let state = { ...DEFAULT_STATE };
let autoRotateTimer = null;
let autoHideTimer = null; // CRITICAL FIX: Store hide timeout to allow cleanup
let scheduleTimer = null;
let analyticsInterval = null;
const saveQueue = [];
let isSaving = false;
const MAX_SAVE_RETRIES = 3;
const RETRY_DELAY_MS = 150;

function __setState(nextState) {
  state = nextState;
}

function __getState() {
  return state;
}

function ensureFallbackState() {
  if (!state.ticker) {
    state.ticker = JSON.parse(JSON.stringify(DEFAULT_STATE.ticker));
  }
  ensureTemplateState();
  ensureBulkConfigState();
  ensureMetadataState();
}

function ensureAnalyticsState() {
  if (!state.analytics) {
    state.analytics = getDefaultAnalytics();
  }
  if (!state.analytics.messageViews) {
    state.analytics.messageViews = {};
  }
}

function ensureTemplateState() {
  if (!state.templates) {
    state.templates = {};
  }
}

function ensureBulkConfigState() {
  if (!Array.isArray(state.bulkConfigs)) {
    state.bulkConfigs = [];
  }
}

function ensureMetadataState() {
  if (!state.metadata) {
    state.metadata = JSON.parse(JSON.stringify(DEFAULT_STATE.metadata));
  }

  if (!Array.isArray(state.metadata.changeHistory)) {
    state.metadata.changeHistory = [];
  }

  if (typeof state.metadata.safeZonesVisible !== 'boolean') {
    state.metadata.safeZonesVisible = false;
  }
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
}

function reindexMessages() {
  if (!Array.isArray(state.ticker?.messages)) return;
  state.ticker.messages.forEach((message, index) => {
    if (message) {
      message.sortIndex = index;
    }
  });
}

function buildTickerMessage(base = {}) {
  const priorityValue = parseInt(base.priority, 10);
  return {
    id: generateId('msg'),
    text: base.text || '',
    category: base.category || 'general',
    accentWords: base.accentWords || '',
    priority: Number.isNaN(priorityValue) ? 1 : priorityValue,
    enabled: true,
    characterCount: (base.text || '').length,
    sortIndex: Array.isArray(state.ticker?.messages) ? state.ticker.messages.length : 0,
    createdAt: Date.now()
  };
}

function appendTickerMessage(message, insertNow = false) {
  if (!state.ticker) {
    state.ticker = JSON.parse(JSON.stringify(DEFAULT_STATE.ticker));
  }
  if (!Array.isArray(state.ticker.messages)) {
    state.ticker.messages = [];
  }

  if (insertNow) {
    state.ticker.messages.unshift(message);
  } else {
    state.ticker.messages.push(message);
  }

  reindexMessages();
}

function executeBulkAction(operation, options = {}) {
  ensureBulkConfigState();
  if (!state.ticker) {
    state.ticker = JSON.parse(JSON.stringify(DEFAULT_STATE.ticker));
  }
  if (!Array.isArray(state.ticker.messages)) {
    state.ticker.messages = [];
  }

  const matchFilter = msg => {
    if (!options.filter) return true;
    return msg.category === options.filter;
  };

  let changed = false;
  let description = '';
  const messages = state.ticker.messages;

  switch (operation) {
    case 'enableAll': {
      messages.forEach(msg => {
        if (msg && matchFilter(msg) && msg.enabled === false) {
          msg.enabled = true;
          changed = true;
        }
      });
      if (changed) {
        description = `Enabled${options.filter ? ` ${options.filter}` : ''} messages`;
      }
      break;
    }
    case 'disableAll': {
      messages.forEach(msg => {
        if (msg && matchFilter(msg) && msg.enabled !== false) {
          msg.enabled = false;
          changed = true;
        }
      });
      if (changed) {
        description = `Disabled${options.filter ? ` ${options.filter}` : ''} messages`;
      }
      break;
    }
    case 'deleteDisabled': {
      const before = messages.length;
      state.ticker.messages = messages.filter(msg => {
        if (!msg) return false;
        if (!matchFilter(msg)) return true;
        return msg.enabled !== false;
      });
      if (state.ticker.messages.length !== before) {
        changed = true;
        description = `Deleted disabled${options.filter ? ` ${options.filter}` : ''} messages`;
      }
      break;
    }
    case 'applyPreset': {
      if (!options.presetId) break;
      const preset = state.presets.find(p => p.id === options.presetId);
      if (!preset) break;
      state.ticker.messages = JSON.parse(JSON.stringify(preset.messages || []));
      changed = true;
      description = `Loaded preset: "${preset.name}"`;
      break;
    }
    case 'applyConfig': {
      if (!options.config && !options.configId) break;
      const config = options.config || state.bulkConfigs.find(c => c.id === options.configId);
      if (!config || config.operation === 'applyConfig') break;
      const nested = executeBulkAction(config.operation, {
        filter: config.filter,
        presetId: config.presetId,
        config
      });
      if (nested.changed) {
        changed = true;
        description = nested.description || `Applied bulk config: "${config.name}"`;
      }
      break;
    }
    default:
      break;
  }

  return { changed, description };
}

function syncMessageAnalytics() {
  ensureAnalyticsState();
  const messages = Array.isArray(state.ticker?.messages) ? state.ticker.messages : [];
  const currentIds = new Set();
  messages.forEach(msg => {
    if (msg && msg.id) {
      currentIds.add(msg.id);
      if (state.analytics.messageViews[msg.id] === undefined) {
        state.analytics.messageViews[msg.id] = 0;
      }
    }
  });
  Object.keys(state.analytics.messageViews).forEach(id => {
    if (!currentIds.has(id)) {
      delete state.analytics.messageViews[id];
    }
  });
}

function recordTickerShow(messages) {
  const list = Array.isArray(messages) ? messages.filter(m => m && m.enabled !== false) : [];
  if (list.length === 0) return;
  ensureAnalyticsState();
  syncMessageAnalytics();
  state.analytics.totalTickerShows = (state.analytics.totalTickerShows || 0) + 1;
  list.forEach(msg => {
    if (!msg.id) return;
    state.analytics.messageViews[msg.id] = (state.analytics.messageViews[msg.id] || 0) + 1;
  });
  state.analytics.totalTickerMessagesServed =
    (state.analytics.totalTickerMessagesServed || 0) + list.length;
  state.analytics.lastUpdated = Date.now();
}

function getAnalyticsPayload() {
  ensureAnalyticsState();
  return {
    totalShows: state.analytics.totalTickerShows || 0,
    totalViews: state.analytics.totalTickerMessagesServed || 0,
    messageViews: state.analytics.messageViews || {},
    popupStats: {
      shown: state.analytics.popupShows || 0,
      dismissed: state.analytics.popupDismissed || 0,
      queued: state.popupQueue ? state.popupQueue.length : 0
    },
    lastUpdated: state.analytics.lastUpdated || Date.now()
  };
}

function broadcastAnalytics() {
  const payload = getAnalyticsPayload();
  broadcastToDashboards({ type: 'analytics', ts: Date.now(), payload });
}

const basicString = z.string().trim().min(1);
const optionalString = z.string().trim().max(500).optional();

const tickerSettingsSchema = z.object({
  intervalMin: z.number().int().min(0).max(1440).optional(),
  durationSec: z.number().int().min(1).max(3600).optional(),
  speed: z.number().int().min(10).max(300).optional(),
  mode: z.enum(['continuous', 'sequential', 'random', 'weighted']).optional(),
  autoRotate: z.boolean().optional(),
  easingOnWrap: z.boolean().optional(),
  rotationIndex: z.number().int().min(0).optional(),
  fontSize: z.number().int().min(8).max(96).optional(),
  opacity: z.number().min(0).max(1).optional()
});

const templateSchema = z.object({
  id: basicString.max(64),
  template: z.object({
    text: z.string().max(500).default(''),
    category: z.enum(['general', 'breaking', 'update', 'sponsor', 'event']).optional(),
    priority: z.number().int().min(1).max(5).optional(),
    accentWords: z.string().max(200).optional()
  })
});

const deleteTemplateSchema = z.object({ id: basicString });

const addMessageSchema = z.object({
  text: z.string().trim().min(1).max(500),
  category: z.enum(['general', 'breaking', 'update', 'sponsor', 'event']).optional(),
  accentWords: z.string().max(200).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  insertNow: z.boolean().optional()
});

const updateMessageSchema = z.object({
  id: basicString,
  updates: z.object({
    text: z.string().trim().min(1).max(500).optional(),
    category: z.enum(['general', 'breaking', 'update', 'sponsor', 'event']).optional(),
    accentWords: z.string().max(200).optional(),
    priority: z.number().int().min(1).max(5).optional(),
    enabled: z.boolean().optional()
  }).refine(payload => Object.keys(payload).length > 0, { message: 'Updates payload cannot be empty' })
});

const idOnlySchema = z.object({ id: basicString });

const reorderMessagesSchema = z.object({
  messages: z.array(z.object({
    id: basicString,
    text: z.string().max(500),
    category: z.enum(['general', 'breaking', 'update', 'sponsor', 'event']).optional(),
    accentWords: z.string().max(200).optional(),
    priority: z.number().int().min(1).max(5).optional(),
    enabled: z.boolean().optional(),
    sortIndex: z.number().int().optional()
  }))
});

const toggleMessageSchema = z.object({ id: basicString });

const controlTickerShowSchema = z.object({
  source: z.string().trim().max(64).optional()
});

const controlTickerHideSchema = z.object({
  source: z.string().trim().max(64).optional()
});

const controlPopupToggleSchema = z.object({
  visible: z.boolean()
});

const controlOverlaySafeZonesSchema = z.object({
  visible: z.boolean()
});

const setPopupSchema = z.object({
  message: z.string().trim().max(300).optional(),
  ctaLabel: optionalString,
  ctaUrl: optionalString,
  autoDismissSec: z.number().int().min(0).max(3600).optional(),
  pinned: z.boolean().optional(),
  position: z.enum([
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right'
  ]).optional(),
  variant: z.enum(['minimal', 'standard', 'elevated', 'alert', 'success']).optional(),
  popupScale: z.number().min(0.5).max(2).optional()
});

const togglePopupSchema = z.object({ visible: z.boolean() });

const queuePopupSchema = z.object({
  message: z.string().trim().min(1).max(300),
  ctaLabel: optionalString,
  ctaUrl: optionalString,
  autoDismissSec: z.number().int().min(0).max(3600).optional(),
  variant: z.enum(['minimal', 'standard', 'elevated', 'alert', 'success']).optional()
});

const themeSchema = z.object({
  preset: z.string().max(100).optional(),
  accentPrimary: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Invalid hex color').optional(),
  accentSecondary: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/).optional(),
  overlayScale: z.number().min(0.5).max(3).optional(),
  popupScale: z.number().min(0.5).max(2).optional(),
  position: z.enum(['bottom', 'top']).optional(),
  glassIntensity: z.number().int().min(0).max(40).optional(),
  particleDensity: z.number().int().min(0).max(2000).optional(),
  opacity: z.number().min(0.5).max(1).optional(),
  edgeLighting: z.boolean().optional(),
  accentShimmer: z.boolean().optional(),
  sparkleEffects: z.boolean().optional()
});

const saveSceneSchema = z.object({
  name: basicString.max(120),
  thumbnail: z.string().url().nullable().optional()
});

const applySceneSchema = z.object({
  id: basicString.optional(),
  name: basicString.optional()
}).refine(data => data.id || data.name, {
  message: 'Either id or name must be provided'
});

const savePresetSchema = z.object({ name: basicString.max(120) });
const loadPresetSchema = z.object({ id: basicString, mode: z.enum(['replace', 'append']).optional() });

const bulkActionSchema = z.object({
  operation: z.enum(['enableAll', 'disableAll', 'deleteDisabled', 'applyPreset', 'applyConfig']),
  filter: z.enum(['general', 'breaking', 'update', 'sponsor', 'event']).optional(),
  presetId: basicString.optional(),
  configId: basicString.optional()
});

const schemaByType = {
  'setTickerSettings': tickerSettingsSchema,
  'saveTemplate': templateSchema,
  'deleteTemplate': deleteTemplateSchema,
  'addMessage': addMessageSchema,
  'addFromTemplate': z.object({ templateId: basicString, insertNow: z.boolean().optional() }),
  'updateMessage': updateMessageSchema,
  'deleteMessage': idOnlySchema,
  'reorderMessages': reorderMessagesSchema,
  'toggleMessageEnabled': toggleMessageSchema,
  'clearMessages': z.object({}).optional(),
  'bulk:execute': bulkActionSchema,
  'ticker:show': z.object({}).optional(),
  'ticker:hide': z.object({}).optional(),
  'ticker:pause': z.object({}).optional(),
  'ticker:resume': z.object({}).optional(),
  'setPopup': setPopupSchema,
  'togglePopup': togglePopupSchema,
  'queuePopup': queuePopupSchema,
  'showQueuedPopup': idOnlySchema,
  'deleteQueuedPopup': idOnlySchema,
  'clearPopupQueue': z.object({}).optional(),
  'setTheme': themeSchema,
  'theme:update': themeSchema,
  'saveScene': saveSceneSchema,
  'applyScene': applySceneSchema,
  'deleteScene': idOnlySchema,
  'savePreset': savePresetSchema,
  'loadPreset': loadPresetSchema,
  'deletePreset': idOnlySchema,
  'undo': z.object({}).optional(),
  'getState': z.object({}).optional(),
  'control:ticker-show': controlTickerShowSchema,
  'control:ticker-hide': controlTickerHideSchema,
  'control:popup-toggle': controlPopupToggleSchema,
  'control:overlay-safe-zones': controlOverlaySafeZonesSchema
};

function validateMessagePayload(type, payload) {
  const schema = schemaByType[type];
  if (!schema) {
    return {
      success: false,
      error: {
        code: 'UNHANDLED_TYPE',
        message: `Unsupported message type: ${type}`
      }
    };
  }
  const result = schema.safeParse(payload ?? {});
  if (!result.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid payload',
        details: result.error.flatten()
      }
    };
  }
  return { success: true, data: result.data };
}

// State migrations
const migrations = {
  '1.0.0': s => s,
  '1.1.0': s => ({
    ...s,
    ticker: {
      ...s.ticker,
      messages: s.ticker.messages.map(m => ({
        ...m,
        category: m.category || 'general',
        priority: m.priority || 1,
        enabled: m.enabled !== undefined ? m.enabled : true,
        characterCount: m.text ? m.text.length : 0
      }))
    }
  }),
  '2.0.0': s => ({
    ...s,
    ticker: {
      ...s.ticker,
      settings: {
        ...s.ticker.settings,
        fontSize: s.ticker.settings.fontSize || 18,
        opacity: s.ticker.settings.opacity || 0.95
      },
      schedule: s.ticker.schedule || DEFAULT_STATE.ticker.schedule
    },
    popup: {
      ...s.popup,
      animationType: s.popup.animationType || 'spring',
      fontSize: s.popup.fontSize || 17,
      opacity: s.popup.opacity || 0.95
    },
    popupQueue: s.popupQueue || [],
    templates: s.templates || {},
    bulkConfigs: s.bulkConfigs || [],
    metadata: s.metadata || DEFAULT_STATE.metadata,
    analytics: s.analytics || getDefaultAnalytics()
  })
};

function migrateState(oldState) {
  let currentVersion = oldState._version || '1.0.0';
  let migratedState = { ...oldState };

  const versions = Object.keys(migrations).sort();
  for (const version of versions) {
    if (version > currentVersion) {
      logger.info('Migrating state version', { from: currentVersion, to: version });
      migratedState = migrations[version](migratedState);
      currentVersion = version;
    }
  }

  migratedState._version = STATE_VERSION;
  return migratedState;
}

// Load state from disk
async function loadState() {
  try {
    const exists = await fsPromises.access(DB_PATH).then(() => true).catch(() => false);
    if (exists) {
      const data = await fsPromises.readFile(DB_PATH, 'utf8');
      const loadedState = JSON.parse(data);
      state = migrateState({ ...DEFAULT_STATE, ...loadedState });
      ensureAnalyticsState();
      syncMessageAnalytics();
      ensureFallbackState();
      logger.info('State loaded', { version: state._version, path: DB_PATH });
    } else {
      state = { ...DEFAULT_STATE };
      ensureAnalyticsState();
      syncMessageAnalytics();
      ensureFallbackState();
      logger.info('State initialized with defaults');
    }
  } catch (err) {
    logger.error('Failed to load state', { error: err });
    state = { ...DEFAULT_STATE };
    ensureAnalyticsState();
    syncMessageAnalytics();
    ensureFallbackState();
  }
}

async function processSaveQueue() {
  if (isSaving || saveQueue.length === 0) return;
  isSaving = true;
  const job = saveQueue.shift();
  const attemptSave = async (attempt = 1) => {
    try {
      const backupPath = `${DB_PATH}.backup`;
      const exists = await fsPromises.access(DB_PATH).then(() => true).catch(() => false);
      if (exists) {
        await fsPromises.copyFile(DB_PATH, backupPath);
      }
      await fsPromises.mkdir(path.dirname(DB_PATH), { recursive: true });
      await fsPromises.writeFile(DB_PATH, job.contents, 'utf8');
      logger.debug('State saved', { attempt });
      return { success: true, attempts: attempt };
    } catch (err) {
      if (attempt < MAX_SAVE_RETRIES) {
        logger.warn('Retrying state save', { attempt, error: err.message });
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        return attemptSave(attempt + 1);
      }
      logger.error('Failed to save state', { error: err });
      return { success: false, attempts: attempt, error: err };
    }
  };

  const result = await attemptSave();
  if (job.resolve) {
    job.resolve(result);
  }
  isSaving = false;
  processSaveQueue();
}

function saveState() {
  state.metadata.lastSaved = Date.now();
  const serialized = JSON.stringify(state, null, 2);
  return new Promise(resolve => {
    saveQueue.push({ contents: serialized, resolve });
    processSaveQueue();
  });
}

async function flushSaveQueue() {
  while (isSaving || saveQueue.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

// Add to change history for user visibility
function addChangeHistory(description) {
  if (!state.metadata.changeHistory) {
    state.metadata.changeHistory = [];
  }
  if (state.metadata.changeHistory.length >= 50) {
    state.metadata.changeHistory.shift();
  }
  state.metadata.changeHistory.push({
    description,
    timestamp: Date.now()
  });
}

// Add to undo history
function addToHistory(action, oldState) {
  if (state.history.length >= 20) {
    state.history.shift();
  }
  const snapshot = JSON.parse(JSON.stringify(oldState));
  snapshot.history = [];
  state.history.push({
    action,
    state: snapshot,
    timestamp: Date.now()
  });
}

// Load initial state
loadState();

// Auto-rotation scheduler
function startAutoRotation() {
  // CRITICAL FIX: Clear BOTH timers to prevent orphaned timeouts
  if (autoRotateTimer) {
    clearTimeout(autoRotateTimer);
    autoRotateTimer = null;
  }
  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }

  if (!state.ticker.settings.autoRotate || state.ticker.settings.intervalMin === 0) {
    return;
  }

  const intervalMs = state.ticker.settings.intervalMin * 60 * 1000;
  const durationMs = state.ticker.settings.durationSec * 1000;

  autoRotateTimer = setTimeout(() => {
    // Show ticker
    state.ticker.enabled = true;
    recordTickerShow(state.ticker.messages);
    saveState();
    broadcastAnalytics();
    broadcastToOverlays({ type: 'ticker:show', ts: Date.now() });
    broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });

    // Advance rotation index
    if (state.ticker.settings.mode === 'sequential') {
      state.ticker.settings.rotationIndex =
        (state.ticker.settings.rotationIndex + 1) % state.ticker.messages.length;
      saveState();
    }

    // CRITICAL FIX: Store hide timeout so it can be cleared if needed
    autoHideTimer = setTimeout(() => {
      state.ticker.enabled = false;
      broadcastToOverlays({ type: 'ticker:hide', ts: Date.now() });
      broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });

      autoHideTimer = null; // Clear reference
      // Schedule next rotation
      startAutoRotation();
    }, durationMs);
  }, intervalMs);
}

function formatTimeComponent(value) {
  return value.toString().padStart(2, '0');
}

// Schedule checker (runs every minute)
function checkSchedule() {
  if (!state.ticker.schedule.enabled) return;

  const now = new Date();
  const currentHour = formatTimeComponent(now.getHours());
  const currentMinute = formatTimeComponent(now.getMinutes());
  const currentTime = `${currentHour}:${currentMinute}`;

  // Check quiet hours
  if (state.ticker.schedule.quietHours.enabled) {
    const { start, end } = state.ticker.schedule.quietHours;
    if (isInQuietHours(currentTime, start, end)) {
      return; // Don't show during quiet hours
    }
  }

  // Check scheduled times
  state.ticker.schedule.times.forEach(scheduled => {
    const scheduledHour = formatTimeComponent(scheduled.hour);
    const scheduledMinute = formatTimeComponent(scheduled.minute);
    const scheduledTime = `${scheduledHour}:${scheduledMinute}`;
    if (currentTime === scheduledTime) {
      // FIXED: Clear auto-rotation timers to prevent conflicts
      if (autoRotateTimer) {
        clearTimeout(autoRotateTimer);
        autoRotateTimer = null;
      }
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        autoHideTimer = null;
      }

      state.ticker.enabled = true;
      recordTickerShow(state.ticker.messages);
      saveState();
      broadcastAnalytics();
      broadcastToOverlays({ type: 'ticker:show', ts: Date.now() });

      // Auto-hide after duration
      const hideTimeout = setTimeout(() => {
        state.ticker.enabled = false;
        broadcastToOverlays({ type: 'ticker:hide', ts: Date.now() });

        // FIXED: Resume auto-rotation after scheduled show completes
        if (state.ticker.settings.autoRotate && state.ticker.settings.intervalMin > 0) {
          logger.info('Scheduled show complete - resuming auto-rotation cycle');
          startAutoRotation();
        }
      }, (scheduled.duration || state.ticker.settings.durationSec) * 1000);

      // Store timeout reference (optional - for potential future cleanup)
      if (!state.ticker.schedule.activeTimeouts) {
        state.ticker.schedule.activeTimeouts = [];
      }
      state.ticker.schedule.activeTimeouts.push(hideTimeout);
    }
  });
}

function isInQuietHours(current, start, end) {
  if (start < end) {
    return current >= start && current <= end;
  } else {
    // Overnight range (e.g., 22:00 to 08:00)
    return current >= start || current <= end;
  }
}

// Start schedule checker
scheduleTimer = setInterval(checkSchedule, 60000); // Check every minute

function startAnalyticsBroadcast() {
  if (analyticsInterval) {
    clearInterval(analyticsInterval);
  }
  analyticsInterval = setInterval(() => {
    try {
      broadcastAnalytics();
    } catch (err) {
      logger.error('Analytics broadcast error', { error: err });
    }
  }, ANALYTICS_INTERVAL_MS);
  broadcastAnalytics();
}

function stopAnalyticsBroadcast() {
  if (analyticsInterval) {
    clearInterval(analyticsInterval);
    analyticsInterval = null;
  }
}

// Performance metrics
const metrics = {
  connections: 0,
  messagesProcessed: 0,
  stateUpdates: 0,
  errors: 0
};

// Broadcast helpers
function broadcastToOverlays(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.clientType === 'overlay') {
      try {
        client.send(JSON.stringify(message));
      } catch (err) {
        logger.error('Broadcast to overlay failed', { error: err, messageType: message?.type });
        metrics.errors++;
      }
    }
  });
}

function broadcastToDashboards(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.clientType === 'dashboard') {
      try {
        client.send(JSON.stringify(message));
      } catch (err) {
        logger.error('Broadcast to dashboard failed', { error: err, messageType: message?.type });
        metrics.errors++;
      }
    }
  });
}

function broadcastToAll(message) {
  broadcastToOverlays(message);
  broadcastToDashboards(message);
}

// WebSocket connection handler
wss.on('error', err => {
  logger.error('WebSocket server error', { error: err });
  metrics.errors++;
});

wss.on('connection', ws => {
  metrics.connections++;
  logger.info('Client connected', { connections: metrics.connections });

  ws.on('message', data => {
    try {
      const msg = JSON.parse(data);
      metrics.messagesProcessed++;

      // Client identification
      if (msg.type === 'identify') {
        ws.clientType = msg.clientType;
        ws.send(JSON.stringify({
          type: 'state',
          ts: Date.now(),
          payload: state
        }));
        ws.send(JSON.stringify({
          type: 'analytics',
          ts: Date.now(),
          payload: getAnalyticsPayload()
        }));
        return;
      }

      const validation = validateMessagePayload(msg.type, msg.payload);
      if (!validation.success) {
        logger.warn('Message validation failed', {
          type: msg.type,
          error: validation.error
        });
        ws.send(JSON.stringify({
          type: 'error',
          ts: Date.now(),
          payload: {
            code: validation.error.code,
            message: validation.error.message,
            details: validation.error.details ?? null
          }
        }));
        return;
      }

      const payload = validation.data;

      // Store old state for history
      const oldState = JSON.parse(JSON.stringify(state));

      // Message handlers
      switch (msg.type) {
        case 'setTickerSettings': {
          state.ticker.settings = { ...state.ticker.settings, ...payload };
          addToHistory('setTickerSettings', oldState);
          addChangeHistory('Updated ticker settings');
          saveState();

          // CRITICAL FIX: Restart auto-rotation if ANY timing setting changed
          if (payload.autoRotate !== undefined ||
              payload.intervalMin !== undefined ||
              payload.durationSec !== undefined) {

            // EDGE CASE FIX: If ticker is currently visible when settings change,
            // schedule hide with new duration, then resume rotation
            if (state.ticker.enabled && state.ticker.settings.autoRotate &&
                state.ticker.settings.intervalMin > 0) {
              // Clear existing timers
              if (autoRotateTimer) {
                clearTimeout(autoRotateTimer);
                autoRotateTimer = null;
              }
              if (autoHideTimer) {
                clearTimeout(autoHideTimer);
                autoHideTimer = null;
              }

              // Schedule hide with updated duration
              const durationMs = state.ticker.settings.durationSec * 1000;
              logger.info('Settings changed while ticker visible - applying new duration', {
                durationSec: state.ticker.settings.durationSec
              });

              autoHideTimer = setTimeout(() => {
                state.ticker.enabled = false;
                broadcastToOverlays({ type: 'ticker:hide', ts: Date.now() });
                broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
                autoHideTimer = null;

                logger.info('Settings-triggered hide complete - resuming rotation');
                startAutoRotation();
              }, durationMs);
            } else {
              // Ticker not visible, just restart rotation normally
              startAutoRotation();
            }
          }
          broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'addMessage': {
          ensureFallbackState();
          const newMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: payload.text,
            category: payload.category || 'general',
            accentWords: payload.accentWords || '',
            priority: payload.priority || 1,
            enabled: payload.enabled !== false,
            sortIndex: state.ticker.messages.length,
            createdAt: Date.now()
          };
          state.ticker.messages.push(newMessage);
          addToHistory('addMessage', oldState);
          addChangeHistory(`Added ticker message: "${payload.text.substring(0, 50)}..."`);
          saveState();
          broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'updateMessage': {
          ensureFallbackState();
          const messageIndex = state.ticker.messages.findIndex(m => m.id === payload.id);
          if (messageIndex === -1) {
            logger.warn('Message not found for update', { id: payload.id });
            break;
          }
          state.ticker.messages[messageIndex] = {
            ...state.ticker.messages[messageIndex],
            ...payload.updates
          };
          addToHistory('updateMessage', oldState);
          addChangeHistory(`Updated ticker message: ${payload.id}`);
          saveState();
          broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'deleteMessage': {
          ensureFallbackState();
          const initialLength = state.ticker.messages.length;
          state.ticker.messages = state.ticker.messages.filter(m => m.id !== payload.id);
          if (state.ticker.messages.length < initialLength) {
            addToHistory('deleteMessage', oldState);
            addChangeHistory(`Deleted ticker message: ${payload.id}`);
            saveState();
            broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          } else {
            logger.warn('Message not found for deletion', { id: payload.id });
          }
          break;
        }

        case 'toggleMessageEnabled': {
          ensureFallbackState();
          const message = state.ticker.messages.find(m => m.id === payload.id);
          if (message) {
            message.enabled = !message.enabled;
            addToHistory('toggleMessageEnabled', oldState);
            addChangeHistory(`Toggled message: ${payload.id}`);
            saveState();
            broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          } else {
            logger.warn('Message not found for toggle', { id: payload.id });
          }
          break;
        }

        case 'clearMessages': {
          ensureFallbackState();
          const count = state.ticker.messages.length;
          state.ticker.messages = [];
          addToHistory('clearMessages', oldState);
          addChangeHistory(`Cleared ${count} ticker messages`);
          saveState();
          broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'reorderMessages': {
          ensureFallbackState();
          if (Array.isArray(payload.messages)) {
            state.ticker.messages = payload.messages.map((msg, index) => ({
              ...msg,
              sortIndex: index
            }));
            addToHistory('reorderMessages', oldState);
            addChangeHistory('Reordered ticker messages');
            saveState();
            broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          }
          break;
        }

        case 'control:ticker-show': {
          ensureFallbackState();
          // CRITICAL FIX: Clear auto-rotation timers to prevent conflicts
          if (autoRotateTimer) {
            clearTimeout(autoRotateTimer);
            autoRotateTimer = null;
          }
          if (autoHideTimer) {
            clearTimeout(autoHideTimer);
            autoHideTimer = null;
          }
          state.ticker.enabled = true;
          addToHistory('control:ticker-show', oldState);
          addChangeHistory('Ticker shown via dashboard control');
          saveState();
          broadcastToOverlays({ type: 'ticker:show', ts: Date.now() });
          broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });

          // FIXED: If auto-rotate is enabled, schedule auto-hide and resume rotation cycle
          if (state.ticker.settings.autoRotate && state.ticker.settings.intervalMin > 0) {
            const durationMs = state.ticker.settings.durationSec * 1000;
            logger.info('Manual show with auto-rotation enabled - scheduling auto-hide', {
              durationSec: state.ticker.settings.durationSec
            });

            autoHideTimer = setTimeout(() => {
              state.ticker.enabled = false;
              broadcastToOverlays({ type: 'ticker:hide', ts: Date.now() });
              broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
              autoHideTimer = null;

              // Resume auto-rotation cycle after manual show completes
              logger.info('Manual show auto-hide complete - resuming rotation cycle');
              startAutoRotation();
            }, durationMs);
          }
          break;
        }

        case 'control:ticker-hide': {
          ensureFallbackState();
          // CRITICAL FIX: Clear auto-rotation timers to prevent scheduled reappearance
          if (autoRotateTimer) {
            clearTimeout(autoRotateTimer);
            autoRotateTimer = null;
          }
          if (autoHideTimer) {
            clearTimeout(autoHideTimer);
            autoHideTimer = null;
          }
          state.ticker.enabled = false;
          addToHistory('control:ticker-hide', oldState);
          addChangeHistory('Ticker hidden via dashboard control');
          saveState();
          broadcastToOverlays({ type: 'ticker:hide', ts: Date.now() });
          broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });

          // FIXED: If auto-rotate is enabled, restart the rotation cycle
          if (state.ticker.settings.autoRotate && state.ticker.settings.intervalMin > 0) {
            logger.info('Manual hide with auto-rotation enabled - restarting rotation cycle');
            startAutoRotation();
          }
          break;
        }

        case 'control:popup-toggle': {
          ensureFallbackState();
          state.popup = {
            ...state.popup,
            visible: payload.visible
          };
          addToHistory('control:popup-toggle', oldState);
          const changeMessage = payload.visible
            ? 'Popup shown via dashboard control'
            : 'Popup hidden via dashboard control';
          addChangeHistory(changeMessage);
          saveState();
          const overlayMessage = payload.visible ? 'popup:show' : 'popup:hide';
          broadcastToOverlays({ type: overlayMessage, ts: Date.now(), payload: { ...state.popup } });
          broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'control:overlay-safe-zones': {
          ensureMetadataState();
          state.metadata.safeZonesVisible = payload.visible;
          addToHistory('control:overlay-safe-zones', oldState);
          addChangeHistory(payload.visible ? 'Overlay safe zones enabled' : 'Overlay safe zones hidden');
          saveState();
          broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'saveTemplate': {
          ensureAnalyticsState();
          const { id, template } = payload;
          if (!state.templates) state.templates = {};
          state.templates[id] = {
            text: template.text || '',
            category: template.category || 'general',
            priority: template.priority || 1,
            accentWords: template.accentWords || ''
          };
          addChangeHistory(`Saved template: "${id}"`);
          saveState();
          break;
        }

        case 'deleteQueuedPopup': {
          state.popupQueue = state.popupQueue.filter(p => p.id !== payload.id);
          saveState();
          broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'clearPopupQueue': {
          state.popupQueue = [];
          addChangeHistory('Cleared popup queue');
          saveState();
          broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'setTheme': {
          state.theme = { ...state.theme, ...payload };
          addToHistory('setTheme', oldState);
          addChangeHistory('Updated theme settings');
          saveState();
          broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'control:ticker-settings': {
          ensureFallbackState();
          state.ticker.settings = { ...state.ticker.settings, ...payload };
          addToHistory('control:ticker-settings', oldState);
          addChangeHistory('Updated ticker settings via dashboard control');
          saveState();
          broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'control:popup-settings': {
          ensureFallbackState();
          state.popup = { ...state.popup, ...payload };
          addToHistory('control:popup-settings', oldState);
          addChangeHistory('Updated popup settings via dashboard control');
          saveState();
          broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'control:overlay-settings': {
          ensureMetadataState();
          state.metadata = { ...state.metadata, ...payload };
          addToHistory('control:overlay-settings', oldState);
          addChangeHistory('Updated overlay settings via dashboard control');
          saveState();
          broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'theme:update': {
          if (!state.theme) {
            state.theme = JSON.parse(JSON.stringify(DEFAULT_STATE.theme));
          }
          // Merge theme updates
          Object.assign(state.theme, payload);
          addToHistory('theme:update', oldState);
          const changes = Object.keys(payload).join(', ');
          addChangeHistory(`Updated theme: ${changes}`);
          saveState();
          // Broadcast to all clients including overlays
          broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'setPopup': {
          ensureFallbackState();
          state.popup = { ...state.popup, ...payload };
          addToHistory('setPopup', oldState);
          addChangeHistory('Updated popup configuration');
          saveState();
          broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'queuePopup': {
          if (!state.popupQueue) state.popupQueue = [];
          const queuedPopup = {
            id: `popup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...payload,
            queuedAt: Date.now()
          };
          state.popupQueue.push(queuedPopup);
          addToHistory('queuePopup', oldState);
          addChangeHistory('Queued popup message');
          saveState();
          broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'showQueuedPopup': {
          if (!state.popupQueue || state.popupQueue.length === 0) break;
          const queuedPopup = state.popupQueue.find(p => p.id === payload.id);
          if (queuedPopup) {
            state.popup = { ...queuedPopup, visible: true };
            state.popupQueue = state.popupQueue.filter(p => p.id !== payload.id);
            saveState();
            broadcastToOverlays({ type: 'popup:show', ts: Date.now(), payload: state.popup });
            broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
          }
          break;
        }

        case 'saveScene': {
          if (!state.scenes) state.scenes = [];
          const scene = {
            id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: payload.name,
            ticker: JSON.parse(JSON.stringify(state.ticker)),
            popup: JSON.parse(JSON.stringify(state.popup)),
            theme: JSON.parse(JSON.stringify(state.theme)),
            createdAt: Date.now()
          };
          state.scenes.push(scene);
          addToHistory('saveScene', oldState);
          addChangeHistory(`Saved scene: "${payload.name}"`);
          saveState();
          broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'applyScene': {
          const scene = state.scenes?.find(s => s.id === payload.id || s.name === payload.name);
          if (scene) {
            state.ticker = { ...state.ticker, ...JSON.parse(JSON.stringify(scene.ticker)) };
            state.popup = { ...state.popup, ...JSON.parse(JSON.stringify(scene.popup)) };
            state.theme = { ...state.theme, ...JSON.parse(JSON.stringify(scene.theme)) };
            addToHistory('applyScene', oldState);
            addChangeHistory(`Applied scene: "${scene.name}"`);
            saveState();
            broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          } else {
            logger.warn('Scene not found', { sceneId: payload.id, sceneName: payload.name });
          }
          break;
        }

        case 'deleteScene': {
          if (!state.scenes) break;
          const before = state.scenes.length;
          state.scenes = state.scenes.filter(s => s.id !== payload.id);
          if (state.scenes.length < before) {
            addToHistory('deleteScene', oldState);
            addChangeHistory(`Deleted scene: ${payload.id}`);
            saveState();
            broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
          }
          break;
        }

        case 'savePreset': {
          if (!state.presets) state.presets = [];
          const preset = {
            id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: payload.name,
            messages: payload.messages.map(msg => ({ ...msg })),
            createdAt: Date.now()
          };
          state.presets.push(preset);
          addToHistory('savePreset', oldState);
          addChangeHistory(`Saved preset: "${payload.name}"`);
          saveState();
          broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        case 'loadPreset': {
          const preset = state.presets?.find(p => p.id === payload.id);
          if (preset) {
            state.ticker.messages = preset.messages.map((msg, index) => ({
              ...msg,
              id: `msg_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
              sortIndex: index,
              enabled: true
            }));
            addToHistory('loadPreset', oldState);
            addChangeHistory(`Loaded preset: "${preset.name}"`);
            saveState();
            broadcastToAll({ type: 'state', ts: Date.now(), payload: state });
          } else {
            logger.warn('Preset not found', { presetId: payload.id });
          }
          break;
        }

        case 'deletePreset': {
          if (!state.presets) break;
          const before = state.presets.length;
          state.presets = state.presets.filter(p => p.id !== payload.id);
          if (state.presets.length < before) {
            addToHistory('deletePreset', oldState);
            addChangeHistory(`Deleted preset: ${payload.id}`);
            saveState();
            broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
          }
          break;
        }

        case 'togglePopup': {
          ensureFallbackState();
          state.popup.visible = payload.visible ?? !state.popup.visible;
          addToHistory('togglePopup', oldState);
          addChangeHistory(state.popup.visible ? 'Popup shown' : 'Popup hidden');
          saveState();
          const overlayMsg = state.popup.visible ? 'popup:show' : 'popup:hide';
          broadcastToOverlays({ type: overlayMsg, ts: Date.now(), payload: state.popup });
          broadcastToDashboards({ type: 'state', ts: Date.now(), payload: state });
          break;
        }

        default: {
          logger.warn('Unhandled dashboard message', { type: msg.type });
          break;
        }
      }
    } catch (err) {
      logger.error('Failed to process dashboard message', {
        error: err,
        data: typeof data === 'string' ? data : undefined
      });
      metrics.errors++;
      try {
        ws.send(JSON.stringify({
          type: 'error',
          ts: Date.now(),
          payload: {
            code: 'internal_error',
            message: 'Server failed to process message'
          }
        }));
      } catch (sendErr) {
        logger.error('Failed to send error response', { error: sendErr });
      }
    }
  });

  ws.on('close', () => {
    metrics.connections = Math.max(0, metrics.connections - 1);
    logger.info('Client disconnected', { connections: metrics.connections });
  });

  ws.on('error', err => {
    logger.error('WebSocket client error', { error: err });
    metrics.errors++;
  });
});

// ... (rest of the code remains the same)

function printBanner() {
  if (!process.stdout.isTTY) return;

  const c = colors;
  const line1 = `${c.dim}╭─────────────────────────────────────────────────────────────╮${c.reset}`;
  const title = `OBS Luxury Widgets`;
  const subtitle = `Premium broadcast overlay system`;
  const line2 = `${c.dim}│${c.reset}  ${c.bright}${c.yellow}${title}${c.reset} ` +
    `${c.dim}v${STATE_VERSION}${c.reset}                          ${c.dim}│${c.reset}`;
  const line3 = `${c.dim}│${c.reset}  ${c.gray}${subtitle}${c.reset}` +
    `                    ${c.dim}│${c.reset}`;
  const line4 = `${c.dim}╰─────────────────────────────────────────────────────────────╯${c.reset}`;

  console.log(`\n${line1}\n${line2}\n${line3}\n${line4}\n`);
}

async function start() {
  return new Promise((resolve, reject) => {
    server.listen(PORT, HOST, err => {
      if (err) {
        logger.error('Failed to start server', { error: err });
        return reject(err);
      }

      printBanner();
      logger.info('Server started', { host: HOST, port: PORT });

      // CRITICAL FIX: Start auto-rotation timers after server is ready
      // This ensures interval settings are respected
      if (state.ticker?.settings?.autoRotate) {
        logger.info('Starting ticker auto-rotation', {
          intervalMin: state.ticker.settings.intervalMin,
          durationSec: state.ticker.settings.durationSec
        });
        startAutoRotation();
      } else {
        logger.info('Ticker auto-rotation disabled');
      }

      const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
      const dashboardUrl = `http://${displayHost}:${PORT}/`;
      const overlayUrl = `http://${displayHost}:${PORT}/overlay`;

      if (process.stdout.isTTY) {
        const c = colors;
        console.log(`${c.dim}│${c.reset}`);
        console.log(`${c.dim}│${c.reset} ${c.cyan}Dashboard${c.reset}  ` +
          `${c.bright}${dashboardUrl}${c.reset}`);
        console.log(`${c.dim}│${c.reset} ${c.cyan}Overlay${c.reset}     ` +
          `${c.bright}${overlayUrl}${c.reset}`);
        console.log(`${c.dim}│${c.reset}`);
      } else {
        console.log(`Dashboard available at ${dashboardUrl}`);
      }

      startAnalyticsBroadcast();
      resolve();
    });
  });
}

async function stop() {
  // CRITICAL FIX: Clear both auto-rotation timers
  if (autoRotateTimer) clearTimeout(autoRotateTimer);
  if (autoHideTimer) clearTimeout(autoHideTimer);
  if (scheduleTimer) clearInterval(scheduleTimer);
  stopAnalyticsBroadcast();

  const result = await flushSaveQueue();
  if (!result.success) {
    logger.error('State save failed during shutdown', { error: result.error });
  }

  await new Promise((resolve, reject) => {
    server.close(err => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

module.exports = {
  app,
  start,
  stop,
  server,
  wss,
  __testing: {
    DEFAULT_STATE,
    getDefaultAnalytics,
    ensureAnalyticsState,
    ensureFallbackState,
    ensureTemplateState,
    ensureBulkConfigState,
    syncMessageAnalytics,
    recordTickerShow,
    getAnalyticsPayload,
    executeBulkAction,
    reindexMessages,
    buildTickerMessage,
    appendTickerMessage,
    addChangeHistory,
    addToHistory,
    setState: __setState,
    getState: __getState,
    saveState,
    flushSaveQueue
  }
};

if (require.main === module) {
  start().catch(err => {
    logger.error('Failed to start server', { error: err });
    process.exitCode = 1;
  });
}