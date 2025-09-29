const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const HOST = '127.0.0.1';
const TEST_PORT = 3201;
const BASE_URL = `http://${HOST}:${TEST_PORT}`;
const REPO_ROOT = path.join(__dirname, '..');

let tmpDir;
let serverProcess;

async function waitForServerReady(proc, port = TEST_PORT) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Server did not start in time'));
    }, 5000);

    function cleanup() {
      clearTimeout(timeout);
      proc.stdout?.off('data', onStdout);
      proc.stderr?.off('data', onStderr);
      proc.off('exit', onExit);
      proc.off('error', onError);
    }

    function onStdout(chunk) {
      const text = chunk.toString();
      // Match both 0.0.0.0 and 127.0.0.1 for HOST and the specified port
      if (text.includes(`listening on http://`) && text.includes(`:${port}`)) {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      }
    }

    function onStderr(chunk) {
      const text = chunk.toString();
      if (text.toLowerCase().includes('error') && !settled) {
        settled = true;
        cleanup();
        reject(new Error(text.trim()))
      }
    }

    function onExit(code, signal) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`Server exited before ready (code=${code}, signal=${signal})`));
    }

    function onError(err) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    }

    proc.stdout?.on('data', onStdout);
    proc.stderr?.on('data', onStderr);
    proc.once('exit', onExit);
    proc.once('error', onError);
  });
}

test.before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ticker-integration-'));
  const stateFile = path.join(tmpDir, 'state.json');

  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      TICKER_STATE_FILE: stateFile,
      HTTP_PORT: String(TEST_PORT),
      HTTP_HOST: HOST
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  serverProcess.stdout?.setEncoding('utf8');
  serverProcess.stderr?.setEncoding('utf8');

  await waitForServerReady(serverProcess);
});

test.after(async () => {
  if (serverProcess) {
    serverProcess.kill();
    try {
      await once(serverProcess, 'exit');
    } catch {
      // ignore
    }
  }
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('state mutation endpoints reject stale ticker payloads', async () => {
  const { data: initialTicker } = await getJson('/ticker/state');
  const firstPayload = {
    isActive: true,
    messages: ['Ticker concurrency test'],
    displayDuration: Number(initialTicker.displayDuration) || 5,
    intervalBetween: Number(initialTicker.intervalBetween) || 0,
    updatedAt: Number.isFinite(Number(initialTicker.updatedAt))
      ? Number(initialTicker.updatedAt)
      : null
  };

  const firstResult = await postJson('/ticker/state', firstPayload);
  assert.equal(firstResult.response.status, 200, firstResult.data.error || 'Expected ticker update to succeed');
  assert.equal(firstResult.data.ok, true);
  const latestTicker = firstResult.data.state;
  assert.ok(latestTicker);
  const latestStamp = Number(latestTicker.updatedAt);
  assert.ok(Number.isFinite(latestStamp));

  const stalePayload = {
    ...firstPayload,
    messages: ['Stale ticker payload'],
    updatedAt: Math.max(0, latestStamp - 50)
  };
  const staleResult = await postJson('/ticker/state', stalePayload);
  assert.equal(staleResult.response.status, 409, 'Expected stale ticker payload to be rejected');
  assert.equal(staleResult.data.ok, false);
  assert.ok(staleResult.data.state);
  assert.notDeepEqual(staleResult.data.state.messages, stalePayload.messages);

  const recoveryPayload = {
    ...stalePayload,
    messages: ['Fresh ticker payload'],
    updatedAt: Number(staleResult.data.state.updatedAt)
  };
  const recoveryResult = await postJson('/ticker/state', recoveryPayload);
  assert.equal(recoveryResult.response.status, 200, recoveryResult.data.error || 'Expected recovery payload to succeed');
  assert.equal(recoveryResult.data.ok, true);
  assert.deepEqual(recoveryResult.data.state.messages, ['Fresh ticker payload']);
});

test('overlay mutations surface 409 conflicts with latest state', async () => {
  const { data: initialOverlay } = await getJson('/ticker/overlay');
  const baseOverlay = {
    ...initialOverlay,
    label: 'Overlay concurrency baseline',
    updatedAt: Number(initialOverlay.updatedAt) || null
  };

  const firstResult = await postJson('/ticker/overlay', baseOverlay);
  assert.equal(firstResult.response.status, 200, firstResult.data.error || 'Expected overlay update to succeed');
  assert.equal(firstResult.data.ok, true);
  const latestOverlay = firstResult.data.overlay;
  assert.ok(latestOverlay);
  const latestStamp = Number(latestOverlay.updatedAt);
  assert.ok(Number.isFinite(latestStamp));

  const staleOverlay = {
    ...baseOverlay,
    label: 'Stale overlay label',
    updatedAt: Math.max(0, latestStamp - 25)
  };
  const staleResult = await postJson('/ticker/overlay', staleOverlay);
  assert.equal(staleResult.response.status, 409, 'Expected stale overlay update to be rejected');
  assert.equal(staleResult.data.ok, false);
  assert.ok(staleResult.data.overlay);
  assert.notEqual(staleResult.data.overlay.label, 'Stale overlay label');

  const recoveryOverlay = {
    ...staleOverlay,
    label: 'Recovered overlay label',
    updatedAt: Number(staleResult.data.overlay.updatedAt)
  };
  const recoveryResult = await postJson('/ticker/overlay', recoveryOverlay);
  assert.equal(recoveryResult.response.status, 200, recoveryResult.data.error || 'Expected overlay recovery to succeed');
  assert.equal(recoveryResult.data.ok, true);
  assert.equal(recoveryResult.data.overlay.label, 'Recovered overlay label');
});

async function postJson(pathname, payload) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function getJson(pathname) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function getText(pathname, baseUrl = BASE_URL) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'GET',
    headers: { 'Accept': 'text/html,application/xhtml+xml' }
  });
  const text = await response.text();
  return { response, text };
}

test('POST /ticker/scenes sanitises and persists payloads', async () => {
  const payload = {
    scenes: [
      {
        id: 'scene-integration',
        name: '  Integration Scene  ',
        messages: ['  Hello  ', '', 'World  ', 'A'.repeat(280)],
        displayDuration: 1,
        intervalBetween: 7200,
        isActive: true,
        overlay: {
          label: '  Live Now  ',
          accent: 'javascript:alert(1)',
          accentSecondary: '  rgba(255, 0, 255, 0.8)  ',
          highlight: 'Alpha,,Beta',
          scale: 9,
          popupScale: 0,
          position: 'Top',
          mode: 'Chunk',
          accentAnim: false,
          sparkle: false,
          theme: '  Aurora-Night  '
        },
        popup: {
          text: '   Popup message   ',
          isActive: true,
          durationSeconds: 700,
          countdownEnabled: true,
          countdownTarget: 'invalid'
        },
        slate: {
          rotationSeconds: 3,
          notesLabel: '  Label  ',
          notes: [' first ', '', 'second']
        }
      }
    ]
  };

  const { response, data } = await postJson('/ticker/scenes', payload);
  assert.equal(response.status, 200, data.error || JSON.stringify(data));
  assert.equal(data.ok, true);
  assert.ok(Array.isArray(data.scenes));
  assert.equal(data.scenes.length, 1);
  const scene = data.scenes[0];
  assert.equal(scene.name, 'Integration Scene');
  assert.deepStrictEqual(scene.ticker.messages, ['Hello', 'World', 'A'.repeat(280)]);
  assert.equal(scene.ticker.displayDuration, 2);
  assert.equal(scene.ticker.intervalBetween, 3600);
  assert.equal(scene.ticker.isActive, true);
  assert.equal(scene.popup.text, 'Popup message');
  assert.equal(scene.popup.durationSeconds, 600);
  assert.equal(scene.popup.countdownEnabled, false);
  assert.equal(scene.popup.countdownTarget, null);
  assert.equal(scene.overlay.label, 'Live Now');
  assert.equal(scene.overlay.highlight, 'Alpha, Beta');
  assert.equal(scene.overlay.accentSecondary, 'rgba(255, 0, 255, 0.8)');
  assert.equal(scene.overlay.scale, 2.5);
  assert.equal(scene.overlay.popupScale, 0.6);
  assert.equal(scene.overlay.position, 'top');
  assert.equal(scene.overlay.mode, 'chunk');
  assert.equal(scene.overlay.accentAnim, false);
  assert.equal(scene.overlay.sparkle, false);
  assert.equal(scene.overlay.theme, 'aurora-night');
  assert.equal(scene.slate.rotationSeconds, 4);
  assert.deepStrictEqual(scene.slate.notes, ['first', 'second']);
  assert.equal(scene.slate.notesLabel, 'Label');

  const { response: getResponse, data: getData } = await getJson('/ticker/scenes');
  assert.equal(getResponse.status, 200);
  assert.ok(Array.isArray(getData.scenes));
  assert.deepStrictEqual(getData.scenes[0], scene);
});

test('POST /popup/state sanitises popup payloads', async () => {
  const payload = {
    text: '  Hello popup  ',
    isActive: true,
    durationSeconds: 601,
    countdownEnabled: true,
    countdownTarget: 'not-a-number'
  };

  const { response, data } = await postJson('/popup/state', payload);
  assert.equal(response.status, 200, data.error || JSON.stringify(data));
  assert.equal(data.ok, true);
  assert.equal(data.popup.text, 'Hello popup');
  assert.equal(data.popup.durationSeconds, 600);
  assert.equal(data.popup.countdownEnabled, false);
  assert.equal(data.popup.countdownTarget, null);
  assert.equal(data.popup.isActive, true);

  const { response: getResponse, data: getData } = await getJson('/popup/state');
  assert.equal(getResponse.status, 200);
  assert.equal(getData.text, 'Hello popup');
  assert.equal(getData.durationSeconds, 600);
  assert.equal(getData.countdownEnabled, false);
  assert.equal(getData.countdownTarget, null);
  assert.equal(getData.isActive, true);
});

test('POST /ticker/overlay sanitises overlay payloads', async () => {
  const payload = {
    label: '  BREAKING  ',
    accent: '  rgb(255, 0, 0)  ',
    accentSecondary: '  #ABCDEF  ',
    highlight: 'One,,Two',
    scale: 8,
    popupScale: 0.2,
    position: 'Top',
    mode: 'Chunk',
    sparkle: false,
    accentAnim: false,
    theme: 'Zen-Flow'
  };

  const { response, data } = await postJson('/ticker/overlay', payload);
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  const overlay = data.overlay;
  assert.equal(overlay.label, 'BREAKING');
  assert.equal(overlay.accent, 'rgb(255, 0, 0)');
  assert.equal(overlay.accentSecondary, '#ABCDEF');
  assert.equal(overlay.highlight, 'One, Two');
  assert.equal(overlay.scale, 2.5);
  assert.equal(overlay.popupScale, 0.6);
  assert.equal(overlay.position, 'top');
  assert.equal(overlay.mode, 'chunk');
  assert.equal(overlay.sparkle, false);
  assert.equal(overlay.accentAnim, false);
  assert.equal(overlay.theme, 'zen-flow');

  const { response: getResponse, data: getData } = await getJson('/ticker/overlay');
  assert.equal(getResponse.status, 200);
  assert.deepStrictEqual(getData, overlay);
});

test('serves default static assets at /ticker when TICKER_DIR is unset', async () => {
  const { response: indexResponse, text: indexHtml } = await getText('/ticker/index.html');
  assert.equal(indexResponse.status, 200);
  assert.match(indexHtml, />OBS Ticker Dashboard</);

  const { response: outputResponse, text: outputHtml } = await getText('/ticker/output.html');
  assert.equal(outputResponse.status, 200);
  assert.match(outputHtml, />OBS Ticker Overlay</);
});

test('serves static assets from custom TICKER_DIR', async () => {
  const customDir = await fs.mkdtemp(path.join(tmpDir, 'assets-'));
  const customIndexPath = path.join(customDir, 'index.html');
  const customOutputPath = path.join(customDir, 'output.html');
  await fs.writeFile(customIndexPath, '<!DOCTYPE html><title>Custom Index</title>');
  await fs.writeFile(customOutputPath, '<!DOCTYPE html><title>Custom Output</title>');

  const customPort = 3301;
  const customStateFile = path.join(customDir, 'state.json');
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    TICKER_STATE_FILE: customStateFile,
    HTTP_PORT: String(customPort),
    HTTP_HOST: HOST,
    TICKER_DIR: customDir
  };

  const proc = spawn(process.execPath, ['server.js'], {
    cwd: REPO_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout?.setEncoding('utf8');
  proc.stderr?.setEncoding('utf8');

  const customBaseUrl = `http://${HOST}:${customPort}`;

  try {
    await waitForServerReady(proc, customPort);
    
    // Give server a moment to fully initialize
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const { response: indexResponse, text: indexHtml } = await getText('/ticker/index.html', customBaseUrl);
    assert.equal(indexResponse.status, 200);
    assert.match(indexHtml, />Custom Index</);

    const { response: outputResponse, text: outputHtml } = await getText('/ticker/output.html', customBaseUrl);
    assert.equal(outputResponse.status, 200);
    assert.match(outputHtml, />Custom Output</);
  } finally {
    proc.kill();
    try {
      await once(proc, 'exit');
    } catch {
      // ignore
    }
  }
});
