const test = require('node:test');
const assert = require('node:assert/strict');

const normalisers = require('../public/js/client-normalisers.js');

const {
  normaliseOverlayData,
  normalisePopupData,
  normaliseSlateData,
  normaliseSceneEntry
} = normalisers;

test('normaliseOverlayData clamps values and is idempotent', () => {
  const input = {
    label: '  Breaking News  ',
    accent: '  #ABCDEF  ',
    highlight: 'Alpha, Beta,, ,Gamma',
    scale: 9.9,
    popupScale: 0.12,
    position: 'Top',
    mode: 'Chunk',
    accentAnim: false,
    sparkle: false,
    theme: 'Aurora-Night'
  };

  const result = normaliseOverlayData(input);
  assert.equal(result.label, 'Breaking News');
  assert.equal(result.accent, '#ABCDEF');
  assert.equal(result.highlight, 'Alpha, Beta, Gamma');
  assert.equal(result.scale, 2.5);
  assert.equal(result.popupScale, 0.6);
  assert.equal(result.position, 'top');
  assert.equal(result.mode, 'chunk');
  assert.equal(result.accentAnim, false);
  assert.equal(result.sparkle, false);
  assert.equal(result.theme, 'aurora-night');

  assert.deepStrictEqual(normaliseOverlayData(result), result);
});

test('normalisePopupData enforces countdown invariants and is idempotent', () => {
  const input = {
    text: '   Hello there   ',
    isActive: true,
    durationSeconds: 0.4,
    countdownEnabled: true,
    countdownTarget: '42.2'
  };

  const result = normalisePopupData(input);
  assert.equal(result.text, 'Hello there');
  assert.equal(result.isActive, true);
  assert.equal(result.durationSeconds, 1);
  assert.equal(result.countdownTarget, 42);
  assert.equal(result.countdownEnabled, true);
  assert.ok(Number.isFinite(result.updatedAt));

  assert.deepStrictEqual(normalisePopupData(result), result);
});

test('normaliseSlateData trims fields, limits notes, and is idempotent', () => {
  const input = {
    rotationSeconds: 3,
    clockLabel: '  MAIN CLOCK  ',
    clockSubtitle: '  Subtitle that is longer than allowed '.padEnd(220, '!'),
    nextLabel: '  Next ',
    nextTitle: '  Title '.repeat(40),
    sponsorName: '  Sponsor ',
    sponsorTagline: ' Tag '.repeat(80),
    notesLabel: ' Notes ',
    notes: [' first ', '', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh']
  };

  const result = normaliseSlateData(input);
  assert.equal(result.rotationSeconds, 4);
  assert.equal(result.clockLabel, 'MAIN CLOCK');
  assert.ok(result.clockSubtitle.length <= 200);
  assert.equal(result.nextLabel, 'Next');
  assert.ok(result.nextTitle.length <= 64);
  assert.notEqual(result.nextTitle[0], ' ');
  assert.equal(result.sponsorName, 'Sponsor');
  assert.ok(result.sponsorTagline.length <= 200);
  assert.notEqual(result.sponsorTagline[0], ' ');
  assert.equal(result.notesLabel, 'Notes');
  assert.deepStrictEqual(result.notes, ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']);

  assert.deepStrictEqual(normaliseSlateData(result), result);
});

test('normaliseSceneEntry rejects empty payloads and preserves round-trip data', () => {
  assert.equal(normaliseSceneEntry({ name: 'Empty scene' }), null);

  const entry = {
    id: 'scene-custom',
    name: '  Showcase  ',
    messages: ['  Hello  ', '', 'World', 'A'.repeat(400)],
    displayDuration: 1,
    intervalBetween: 7200,
    isActive: true,
    overlay: { theme: 'Aurora-Night' },
    popup: { text: '   ' },
    slate: {
      rotationSeconds: 3,
      notes: [' alpha ', '', 'beta']
    }
  };

  const result = normaliseSceneEntry(entry);
  assert.ok(result);
  assert.equal(result.name, 'Showcase');
  assert.deepStrictEqual(result.ticker.messages, ['Hello', 'World', 'A'.repeat(280)]);
  assert.equal(result.ticker.displayDuration, 2);
  assert.equal(result.ticker.intervalBetween, 3600);
  assert.equal(result.ticker.isActive, true);
  assert.equal(result.popup.text, '');
  assert.equal(result.popup.isActive, false);
  assert.equal(result.slate.rotationSeconds, 4);
  assert.deepStrictEqual(result.slate.notes, ['alpha', 'beta']);
  assert.deepStrictEqual(result.overlay, { theme: 'aurora-night' });
  assert.ok(Number.isFinite(result.updatedAt));

  assert.deepStrictEqual(normaliseSceneEntry(result), result);
});
