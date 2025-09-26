const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const { setTimeout: delay } = require('node:timers/promises');

const ROOT_DIR = path.join(__dirname, '..');
const HOST = '127.0.0.1';
const TEST_PORT = 3202;
const BASE_URL = `http://${HOST}:${TEST_PORT}`;

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const res = await fetch(`${BASE_URL}/health`, { cache: 'no-store' });
      if (res.ok) return;
    } catch (err) {
      // ignore until the server is ready
    }
    await delay(100);
  }
  throw new Error('Server did not become ready in time');
}

async function gracefulShutdown(child) {
  if (!child) return;
  child.kill();
  try {
    await once(child, 'exit');
  } catch (err) {
    // ignore errors closing the child process
  }
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  }
  if (!res.ok) {
    const message = data && (data.error || data.message);
    throw new Error(message || `HTTP ${res.status}`);
  }
  return data;
}

test('ticker state export/import round-trips through the API', async t => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ticker-state-'));
  const stateFile = path.join(tempDir, 'state.json');

  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      TICKER_STATE_FILE: stateFile,
      HTTP_PORT: String(TEST_PORT),
      HTTP_HOST: HOST
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});

  t.after(async () => {
    await gracefulShutdown(child);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await waitForServer();

  const overlayLabel = 'Overlay label length check '.padEnd(48, 'x');

  const tickerPayload = {
    isActive: true,
    messages: ['Alpha', 'Beta', 'Gamma'],
    displayDuration: 12,
    intervalBetween: 180
  };
  await fetchJson(`${BASE_URL}/ticker/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tickerPayload)
  });

  await fetchJson(`${BASE_URL}/popup/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Breaking update',
      isActive: true,
      durationSeconds: 25,
      countdownEnabled: false
    })
  });

  await fetchJson(`${BASE_URL}/ticker/overlay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      label: overlayLabel,
      accent: '#ff00ff',
      accentSecondary: 'rgba(0, 255, 255, 0.8)',
      highlight: 'alpha,beta',
      scale: 1.2,
      popupScale: 1.05,
      position: 'top',
      mode: 'chunk',
      accentAnim: false,
      sparkle: false,
      theme: 'nexus-grid'
    })
  });

  await fetchJson(`${BASE_URL}/slate/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isEnabled: true,
      rotationSeconds: 30,
      showClock: false,
      clockLabel: 'UTC',
      nextTitle: 'Next Guest',
      sponsorName: 'Void Corp',
      notes: ['Bring lower thirds', 'Roll highlights']
    })
  });

  await fetchJson(`${BASE_URL}/brb/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isActive: true,
      text: 'Back soon'
    })
  });

  await fetchJson(`${BASE_URL}/ticker/presets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      presets: [
        {
          id: 'preset-1',
          name: 'Evening rundown',
          messages: ['Segment A', 'Segment B'],
          updatedAt: Date.now()
        }
      ]
    })
  });

  await fetchJson(`${BASE_URL}/ticker/scenes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenes: [
        {
          id: 'scene-1',
          name: 'Prime time',
          ticker: {
            messages: ['Scene ticker message'],
            isActive: true,
            displayDuration: 10,
            intervalBetween: 90
          },
          popup: {
            text: 'Scene popup',
            isActive: true,
            durationSeconds: 15
          },
          overlay: {
            accentSecondary: '#ffe066',
            theme: 'duotone-fusion'
          },
          slate: {
            notes: ['Scene note one']
          },
          updatedAt: Date.now()
        }
      ]
    })
  });

  const exportResponse = await fetch(`${BASE_URL}/ticker/state/export`, { cache: 'no-store' });
  assert.ok(exportResponse.ok, 'export endpoint should respond with 200');
  const exportedState = await exportResponse.json();
  assert.ok(exportedState && typeof exportedState === 'object', 'export should return JSON');
  assert.equal(exportedState.overlay.label, overlayLabel, 'overlay label should retain 48 characters');

  // Mutate the state so the import has to overwrite everything
  await fetchJson(`${BASE_URL}/ticker/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isActive: false,
      messages: ['Zeta'],
      displayDuration: 4,
      intervalBetween: 30
    })
  });
  await fetchJson(`${BASE_URL}/popup/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: '', isActive: false })
  });
  await fetchJson(`${BASE_URL}/ticker/overlay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: 'ALT', accent: '#00ff00' })
  });
  await fetchJson(`${BASE_URL}/slate/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: [] })
  });
  await fetchJson(`${BASE_URL}/brb/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive: false, text: 'Changed' })
  });
  await fetchJson(`${BASE_URL}/ticker/presets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ presets: [] })
  });
  await fetchJson(`${BASE_URL}/ticker/scenes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenes: [] })
  });

  const importResponse = await fetchJson(`${BASE_URL}/ticker/state/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exportedState)
  });
  assert.equal(importResponse.ok, true, 'import endpoint should return ok true');

  const tickerState = await fetchJson(`${BASE_URL}/ticker/state`);
  assert.deepEqual(tickerState, exportedState.ticker, 'ticker state should match exported payload');

  const popupState = await fetchJson(`${BASE_URL}/popup/state`);
  assert.deepEqual(popupState, exportedState.popup, 'popup state should match exported payload');

  const overlayState = await fetchJson(`${BASE_URL}/ticker/overlay`);
  assert.deepEqual(overlayState, exportedState.overlay, 'overlay state should match exported payload');

  const slateState = await fetchJson(`${BASE_URL}/slate/state`);
  assert.deepEqual(slateState, exportedState.slate, 'slate state should match exported payload');

  const brbState = await fetchJson(`${BASE_URL}/brb/state`);
  assert.deepEqual(brbState, exportedState.brb, 'brb state should match exported payload');

  const presetState = await fetchJson(`${BASE_URL}/ticker/presets`);
  assert.deepEqual(presetState.presets, exportedState.presets, 'presets should match exported payload');

  const sceneState = await fetchJson(`${BASE_URL}/ticker/scenes`);
  assert.deepEqual(sceneState.scenes, exportedState.scenes, 'scenes should match exported payload');
});
