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

// ... (rest of the file remains unchanged)