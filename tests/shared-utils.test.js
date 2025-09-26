const test = require('node:test');
const assert = require('node:assert/strict');

const utils = require('../public/js/shared-utils.js');

const {
  clampDurationSeconds,
  clampIntervalSeconds,
  clampScaleValue,
  isSafeCssColor,
  normaliseHighlightList,
  sanitiseMessages,
  MAX_TICKER_MESSAGES,
  MAX_TICKER_MESSAGE_LENGTH
} = utils;

test('clampDurationSeconds enforces bounds and rounding', () => {
  assert.equal(clampDurationSeconds(1, 10), 2, 'values below minimum clamp to 2 seconds');
  assert.equal(clampDurationSeconds(120, 10), 90, 'values above maximum clamp to 90 seconds');
  assert.equal(clampDurationSeconds(undefined, 6), 6, 'undefined values fall back to provided default');
  assert.equal(clampDurationSeconds('5.6', 10), 6, 'fractional values are rounded to the nearest second');
});

test('clampIntervalSeconds covers 0-3600 second window', () => {
  assert.equal(clampIntervalSeconds(-5, 20), 0, 'intervals less than zero clamp to zero');
  assert.equal(clampIntervalSeconds(7200, 20), 3600, 'intervals greater than one hour clamp to 3600 seconds');
  assert.equal(clampIntervalSeconds('abc', 15), 15, 'non-numeric input returns fallback');
  assert.equal(clampIntervalSeconds(59.4, 20), 59, 'values are rounded to whole seconds');
});

test('clampScaleValue keeps overlay scale within safe bounds', () => {
  assert.equal(clampScaleValue(0.2, 1.5), 0.75, 'scale below minimum clamps to 0.75');
  assert.equal(clampScaleValue(5, 1.5), 2.5, 'scale above maximum clamps to 2.5');
  assert.equal(clampScaleValue(undefined, 1.25), 1.25, 'missing scale falls back to provided default');
  assert.equal(clampScaleValue(1.234, 1.0), 1.23, 'scale retains two decimal places of precision');
});

test('isSafeCssColor accepts known-safe formats', () => {
  assert.ok(isSafeCssColor('#abc'), 'short hex accepted');
  assert.ok(isSafeCssColor('#A1B2C3'), 'long hex is case-insensitive');
  assert.ok(isSafeCssColor('rgb(10, 20, 30)'), 'rgb() notation accepted');
  assert.ok(isSafeCssColor('rgba(10, 20, 30, 0.5)'), 'rgba() with alpha accepted');
  assert.ok(isSafeCssColor('hsl(120, 50%, 50%)'), 'hsl() notation accepted');
  assert.ok(isSafeCssColor('hsla(240, 100%, 50%, 1)'), 'hsla() notation accepted');
  assert.ok(isSafeCssColor('orange'), 'keyword colours allowed');
});

test('isSafeCssColor rejects malformed or unsafe input', () => {
  assert.equal(isSafeCssColor(''), false, 'empty string rejected');
  assert.equal(isSafeCssColor('not-a-colour'), false, 'unknown keywords rejected');
  assert.equal(isSafeCssColor('rgb(500, 0, 0)'), false, 'component overflow rejected');
  assert.equal(isSafeCssColor('rgba(0, 0, 0, 1.2)'), false, 'alpha outside 0-1 rejected');
  assert.equal(isSafeCssColor('url(javascript:alert(1))'), false, 'css injections rejected');
});

test('normaliseHighlightList trims whitespace and drops empty entries', () => {
  assert.equal(normaliseHighlightList(' one, two , ,three '), 'one, two, three');
  assert.equal(normaliseHighlightList(['alpha', ' beta ', ' '].join(',')), 'alpha, beta');
  assert.equal(normaliseHighlightList('Silent Hill f'), 'Silent Hill f', 'internal spaces are preserved');
  assert.equal(normaliseHighlightList(null), '', 'null input normalises to empty string');
});

test('sanitiseMessages enforces limits, supports metadata, and strict errors', () => {
  const overlong = 'A'.repeat(MAX_TICKER_MESSAGE_LENGTH + 10);
  const input = ['  Hello  ', '', overlong, 'Third', 'Fourth'];

  const metaResult = sanitiseMessages(input, { includeMeta: true, maxMessages: 2 });
  assert.deepStrictEqual(metaResult.messages, ['Hello', 'A'.repeat(MAX_TICKER_MESSAGE_LENGTH)]);
  assert.equal(metaResult.trimmed, 1);
  assert.equal(metaResult.truncated, 2);

  assert.throws(
    () => sanitiseMessages(['One', 'Two'], { strict: true, maxMessages: 1 }),
    /Too many ticker messages/
  );

  assert.throws(
    () => sanitiseMessages(['B'.repeat(MAX_TICKER_MESSAGE_LENGTH + 1)], { strict: true }),
    /Ticker messages must be/,
    'strict length overflow should throw'
  );
});
