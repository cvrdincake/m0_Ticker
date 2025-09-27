(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root && typeof root === 'object') {
    root.RequestClient = exports;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  const DEFAULT_TIMEOUT_MS = 8000;

  class RequestError extends Error {
    constructor(message, code, details = {}) {
      super(message || 'Request failed');
      this.name = 'RequestError';
      this.code = code || 'request_error';
      if (details && typeof details === 'object') {
        Object.assign(this, details);
      }
    }
  }

  function createTimeoutController(timeoutMs, upstreamSignal) {
    if (typeof AbortController !== 'function') {
      return { signal: upstreamSignal, cleanup() {} };
    }
    const controller = new AbortController();
    let timeoutId = null;
    let upstreamAbortListener = null;

    if (upstreamSignal) {
      if (upstreamSignal.aborted) {
        controller.abort(upstreamSignal.reason);
      } else {
        upstreamAbortListener = () => controller.abort(upstreamSignal.reason);
        upstreamSignal.addEventListener('abort', upstreamAbortListener, { once: true });
      }
    }

    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      const timeoutError = new Error('Request timed out');
      timeoutError.name = 'TimeoutError';
      timeoutId = setTimeout(() => controller.abort(timeoutError), timeoutMs);
    }

    return {
      signal: controller.signal,
      cleanup() {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (upstreamAbortListener && upstreamSignal) {
          upstreamSignal.removeEventListener('abort', upstreamAbortListener);
          upstreamAbortListener = null;
        }
      }
    };
  }

  function createQueue(options = {}) {
    const concurrency = Math.max(1, Math.floor(options.concurrency || 1));
    const pending = [];
    let active = 0;

    async function run(task, resolve, reject) {
      active++;
      try {
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        active--;
        schedule();
      }
    }

    function schedule() {
      if (!pending.length || active >= concurrency) return;
      const next = pending.shift();
      run(next.task, next.resolve, next.reject);
    }

    function enqueue(task) {
      return new Promise((resolve, reject) => {
        pending.push({ task, resolve, reject });
        schedule();
      });
    }

    function clear(err) {
      while (pending.length) {
        const next = pending.shift();
        if (err) {
          next.reject(err);
        } else {
          next.resolve();
        }
      }
    }

    return { enqueue, clear, get size() { return pending.length; } };
  }

  function create(options = {}) {
    const defaultTimeout = Number.isFinite(options.defaultTimeoutMs)
      ? options.defaultTimeoutMs
      : DEFAULT_TIMEOUT_MS;
    const defaultInit = options.defaultInit && typeof options.defaultInit === 'object'
      ? { ...options.defaultInit }
      : {};
    const queueMap = new Map();
    const inflightRequests = new Map();

    function resolveDedupeKey(url, config) {
      if (!config || config.dedupe === false) return null;
      if (typeof config.dedupeKey === 'string') {
        return config.dedupeKey || null;
      }
      if (typeof config.dedupeKey === 'function') {
        try {
          const resolved = config.dedupeKey({ url, config });
          return typeof resolved === 'string' && resolved ? resolved : null;
        } catch (err) {
          console.warn('[request-client] dedupeKey threw', err);
          return null;
        }
      }
      if (config.dedupe) {
        const method = config.init && typeof config.init.method === 'string'
          ? config.init.method.toUpperCase()
          : 'GET';
        return `${method}:${url}`;
      }
      if (config.dedupe === undefined && (!config.init || !config.init.method || String(config.init.method).toUpperCase() === 'GET')) {
        return `GET:${url}`;
      }
      return null;
    }

    function ensureQueue(key, queueOptions) {
      if (!queueMap.has(key)) {
        queueMap.set(key, createQueue(queueOptions));
      }
      return queueMap.get(key);
    }

    async function execute(url, config = {}) {
      const {
        init = {},
        timeoutMs = defaultTimeout,
        parser = 'json',
        validate,
        queueKey,
        queueOptions
      } = config;

      const task = async () => {
        if (typeof fetch !== 'function') {
          throw new RequestError('Fetch API unavailable', 'unsupported', { url });
        }
        const mergedInit = { ...defaultInit, ...init };
        const controller = createTimeoutController(timeoutMs, mergedInit.signal);
        let response;
        try {
          response = await fetch(url, { ...mergedInit, signal: controller.signal });
        } catch (error) {
          controller.cleanup();
          if (error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
            throw new RequestError('Request timed out', 'timeout', { url });
          }
          throw new RequestError(error?.message || 'Network request failed', 'network', { url, cause: error });
        }

        let payload = null;
        const contentType = (response.headers && response.headers.get && response.headers.get('content-type')) || '';
        const expectsJson = parser === 'json' || /json/i.test(contentType || '');

        if (!response.ok) {
          if (expectsJson) {
            payload = await response.json().catch(() => null);
          } else {
            payload = await response.text().catch(() => null);
          }
          controller.cleanup();
          const message = typeof payload === 'object' && payload && typeof payload.error === 'string'
            ? payload.error
            : `Request failed with status ${response.status}`;
          throw new RequestError(message, 'http_error', {
            url,
            status: response.status,
            response: payload
          });
        }

        try {
          if (parser === 'json') {
            payload = await response.json();
          } else if (parser === 'text') {
            payload = await response.text();
          } else if (parser === 'blob') {
            payload = await response.blob();
          }
        } catch (error) {
          controller.cleanup();
          throw new RequestError('Failed to parse response', 'parse_error', { url, cause: error });
        }

        controller.cleanup();

        if (typeof validate === 'function') {
          const result = validate(payload);
          if (result !== true && result !== undefined) {
            const message = typeof result === 'string'
              ? result
              : (result && typeof result === 'object' && typeof result.message === 'string'
                ? result.message
                : 'Response validation failed');
            throw new RequestError(message, 'invalid_response', { url, response: payload });
          }
        }

        return payload;
      };

      const dedupeKey = resolveDedupeKey(url, config);
      if (dedupeKey && inflightRequests.has(dedupeKey)) {
        return inflightRequests.get(dedupeKey);
      }

      const queueRunner = queueKey
        ? ensureQueue(queueKey, queueOptions).enqueue(task)
        : task();

      if (dedupeKey) {
        const tracked = queueRunner.finally(() => {
          inflightRequests.delete(dedupeKey);
        });
        inflightRequests.set(dedupeKey, tracked);
        return tracked;
      }

      return queueRunner;
    }

    function requestJson(url, config = {}) {
      return execute(url, { ...config, parser: 'json' });
    }

    function requestText(url, config = {}) {
      return execute(url, { ...config, parser: 'text' });
    }

    function queue(key, task, queueOptions) {
      const queueInstance = ensureQueue(key, queueOptions);
      return queueInstance.enqueue(task);
    }

    return {
      request: execute,
      requestJson,
      requestText,
      queue,
      createQueue,
      RequestError
    };
  }

  return { create, createQueue, RequestError };
});
