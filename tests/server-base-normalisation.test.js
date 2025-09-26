const test = require('node:test');
const assert = require('node:assert/strict');

const { normaliseServerBaseUrl } = require('../public/js/shared-utils.js');

const DEFAULT_INPUT = 'http://void.host:5678/ticker';

function assertNoDuplicateTicker(urls) {
  for (const url of urls) {
    assert.ok(!/\/ticker\/ticker/i.test(url), `duplicate ticker segment in ${url}`);
  }
}

test('dashboard and overlay normalise server base with trailing /ticker', () => {
  const dashboardBase = normaliseServerBaseUrl(DEFAULT_INPUT);
  const overlayBase = normaliseServerBaseUrl(DEFAULT_INPUT);

  assert.equal(dashboardBase, 'http://void.host:5678');
  assert.equal(overlayBase, 'http://void.host:5678');
  assert.equal(normaliseServerBaseUrl(`${dashboardBase}/ticker`), 'http://void.host:5678');

  assertNoDuplicateTicker([
    `${dashboardBase}/ticker/state`,
    `${dashboardBase}/ticker/overlay`,
    `${dashboardBase}/ticker/presets`
  ]);

  assertNoDuplicateTicker([
    `${overlayBase}/ticker/state`,
    `${overlayBase}/ticker/overlay`,
    `${overlayBase}/ticker/stream`
  ]);
});
