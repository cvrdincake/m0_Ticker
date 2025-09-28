const test = require('node:test');
const assert = require('node:assert');

const { create, RequestError } = require('../public/js/request-client.js');

function withMockedFetch(t, implementation) {
  const originalFetch = global.fetch;
  global.fetch = implementation;
  t.after(() => {
    global.fetch = originalFetch;
  });
}

test('request client wraps network failures with RequestError metadata', async t => {
  const client = create();
  const networkError = new Error('network down');
  withMockedFetch(t, async () => {
    throw networkError;
  });

  await assert.rejects(
    client.requestJson('https://example.com/data'),
    err => {
      assert(err instanceof RequestError);
      assert.strictEqual(err.code, 'network');
      assert.strictEqual(err.cause, networkError);
      return true;
    }
  );
});

test('request client enforces timeouts via abort signals', async t => {
  const client = create();
  withMockedFetch(t, (url, init = {}) => new Promise((resolve, reject) => {
    if (init && init.signal) {
      init.signal.addEventListener('abort', () => {
        const abortErr = new Error('Aborted');
        abortErr.name = 'AbortError';
        reject(abortErr);
      });
    }
  }));

  await assert.rejects(
    client.requestJson('https://example.com/slow', { timeoutMs: 10 }),
    err => {
      assert(err instanceof RequestError);
      assert.strictEqual(err.code, 'timeout');
      return true;
    }
  );
});

test('queueKey serialises rapid successive calls', async t => {
  const client = create();
  let active = 0;
  let maxConcurrent = 0;

  withMockedFetch(t, async () => {
    active += 1;
    maxConcurrent = Math.max(maxConcurrent, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active -= 1;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  });

  await Promise.all([
    client.requestJson('https://example.com/a', { queueKey: 'serial' }),
    client.requestJson('https://example.com/b', { queueKey: 'serial' }),
    client.requestJson('https://example.com/c', { queueKey: 'serial' })
  ]);

  assert.strictEqual(active, 0);
  assert.strictEqual(maxConcurrent, 1);
});

test('response validation failures raise invalid_response errors', async t => {
  const client = create();
  withMockedFetch(t, async () => new Response(JSON.stringify({ ok: false }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  }));

  await assert.rejects(
    client.requestJson('https://example.com/data', {
      validate: payload => (payload.ok ? true : 'Payload missing ok flag')
    }),
    err => {
      assert(err instanceof RequestError);
      assert.strictEqual(err.code, 'invalid_response');
      assert.strictEqual(err.message, 'Payload missing ok flag');
      return true;
    }
  );
});
