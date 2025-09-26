const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_HIGHLIGHTS } = require('../public/js/shared-config');

const boundaryClass = '[\\p{L}\\p{N}_]';

function escapeToken(token) {
  return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildDashboardRegex(custom = []) {
  const merged = Array.from(new Set([...DEFAULT_HIGHLIGHTS, ...custom]));
  const tokens = merged
    .map(entry => entry.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (!tokens.length) return null;
  const escaped = tokens.map(escapeToken).join('|');
  if (!escaped) return null;
  return new RegExp(`(?<!${boundaryClass})(${escaped})(?!${boundaryClass})`, 'giu');
}

function buildOverlayRegex(custom = []) {
  const merged = new Set(DEFAULT_HIGHLIGHTS);
  for (const token of custom) {
    const trimmed = token.trim();
    if (trimmed) merged.add(trimmed.toLowerCase());
  }
  if (!merged.size) return null;
  const tokens = Array.from(merged)
    .map(entry => entry.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (!tokens.length) return null;
  const escaped = tokens.map(escapeToken).join('|');
  if (!escaped) return null;
  return new RegExp(`(?<!${boundaryClass})(${escaped})(?!${boundaryClass})`, 'giu');
}

test('dashboard highlights include accented and CJK words', () => {
  const regex = buildDashboardRegex(['café', '東京']);
  const sample = 'Tonight from the café in 東京, live coverage.';
  const highlighted = sample.replace(regex, '<span class="highlight">$1</span>');
  assert.match(highlighted, /<span class="highlight">café<\/span>/);
  assert.match(highlighted, /<span class="highlight">東京<\/span>/);
});

test('overlay highlights include accented and CJK words', () => {
  const regex = buildOverlayRegex(['café', '東京']);
  const sample = 'Breaking: CAFÉ festival opens in 東京!';
  const highlighted = sample.replace(regex, '<mark>$1</mark>');
  assert.match(highlighted, /<mark>CAFÉ<\/mark>/);
  assert.match(highlighted, /<mark>東京<\/mark>/);
});

test('unicode-aware boundaries avoid matching inside longer words', () => {
  const regex = buildDashboardRegex(['café', '東京']);
  const sample = 'decaféinated beans from 東京湾 are popular';
  assert.ok(!regex.test(sample));
});
