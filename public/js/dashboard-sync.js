(function (global) {
  const context = {
    getServerBase: () => 'http://127.0.0.1:3000',
    setServerStatus: () => {},
    toast: () => {},
    applyTickerData: () => {},
    applyOverlayData: () => {},
    applyPopupData: () => {},
    applyBrbData: () => {},
    applySlateData: () => {},
    applyPresetsData: () => {},
    applyScenesData: () => {},
    afterStateFetch: () => {}
  };

  let eventSource = null;
  let streamFallbackTimer = null;
  let streamPrimed = false;
  let fetchInFlight = false;
  let fetchPending = false;
  let fetchPendingSilent = true;

  function init(options = {}) {
    Object.assign(context, options);
  }

  function setServerStatus(text, colour) {
    if (typeof context.setServerStatus === 'function') {
      context.setServerStatus(text, colour);
    }
  }

  function showToast(message) {
    if (message && typeof context.toast === 'function') {
      context.toast(message);
    }
  }

  function getServerBase() {
    const base = typeof context.getServerBase === 'function'
      ? context.getServerBase()
      : 'http://127.0.0.1:3000';
    return String(base || '').replace(/\/?$/, '');
  }

  function markStreamPrimed() {
    if (streamPrimed) return;
    streamPrimed = true;
    if (streamFallbackTimer) {
      clearTimeout(streamFallbackTimer);
      streamFallbackTimer = null;
    }
  }

  function disconnectStream() {
    if (eventSource) {
      try {
        eventSource.close();
      } catch (err) {
        console.warn('Failed to close event source', err);
      }
      eventSource = null;
    }
    if (streamFallbackTimer) {
      clearTimeout(streamFallbackTimer);
      streamFallbackTimer = null;
    }
  }

  function connectStream() {
    disconnectStream();
    const base = getServerBase();
    try {
      const url = `${base}/ticker/stream`;
      const source = new EventSource(url);
      eventSource = source;
      setServerStatus('Connecting…', '#facc6b');
      streamPrimed = false;
      if (streamFallbackTimer) clearTimeout(streamFallbackTimer);
      streamFallbackTimer = setTimeout(() => {
        streamFallbackTimer = null;
        if (!streamPrimed) {
          fetchState({ silent: true });
        }
      }, 1500);

      source.addEventListener('open', () => {
        setServerStatus('Online', '#9de2c2');
      });

      source.addEventListener('error', () => {
        setServerStatus('Reconnecting…', '#facc6b');
        if (!streamPrimed) {
          fetchState({ silent: true });
        }
      });

      source.addEventListener('ticker', event => {
        try {
          const data = JSON.parse(event.data);
          context.applyTickerData(data);
          markStreamPrimed();
        } catch (err) {
          console.warn('Failed to parse ticker stream payload', err);
        }
      });

      source.addEventListener('overlay', event => {
        try {
          const data = JSON.parse(event.data);
          context.applyOverlayData(data);
          markStreamPrimed();
        } catch (err) {
          console.warn('Failed to parse overlay stream payload', err);
        }
      });

      source.addEventListener('presets', event => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) {
            context.applyPresetsData(data);
          }
          markStreamPrimed();
        } catch (err) {
          console.warn('Failed to parse presets stream payload', err);
        }
      });

      source.addEventListener('scenes', event => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) {
            context.applyScenesData(data);
          }
          markStreamPrimed();
        } catch (err) {
          console.warn('Failed to parse scenes stream payload', err);
        }
      });

      source.addEventListener('popup', event => {
        try {
          const data = JSON.parse(event.data);
          context.applyPopupData(data);
          markStreamPrimed();
        } catch (err) {
          console.warn('Failed to parse popup stream payload', err);
        }
      });

      source.addEventListener('slate', event => {
        try {
          const data = JSON.parse(event.data);
          context.applySlateData(data);
          markStreamPrimed();
        } catch (err) {
          console.warn('Failed to parse slate stream payload', err);
        }
      });

      source.addEventListener('brb', event => {
        try {
          const data = JSON.parse(event.data);
          context.applyBrbData(data);
          markStreamPrimed();
        } catch (err) {
          console.warn('Failed to parse BRB stream payload', err);
        }
      });
    } catch (err) {
      console.error('Failed to connect to event stream', err);
      setServerStatus('Stream error', '#ff9a9a');
      fetchState({ silent: true });
    }
  }

  async function fetchState({ silent = false } = {}) {
    if (fetchInFlight) {
      fetchPending = true;
      fetchPendingSilent = fetchPendingSilent && silent;
      return;
    }
    fetchInFlight = true;
    fetchPendingSilent = true;
    const base = getServerBase();
    try {
      const [tickerRes, overlayRes, presetRes, sceneRes, popupRes, brbRes, slateRes] = await Promise.all([
        fetch(`${base}/ticker/state`, { cache: 'no-store' }),
        fetch(`${base}/ticker/overlay`, { cache: 'no-store' }),
        fetch(`${base}/ticker/presets`, { cache: 'no-store' }),
        fetch(`${base}/ticker/scenes`, { cache: 'no-store' }),
        fetch(`${base}/popup/state`, { cache: 'no-store' }),
        fetch(`${base}/brb/state`, { cache: 'no-store' }),
        fetch(`${base}/slate/state`, { cache: 'no-store' })
      ]);
      if (!tickerRes.ok) throw new Error(`Ticker HTTP ${tickerRes.status}`);
      const tickerData = await tickerRes.json();
      context.applyTickerData(tickerData);
      if (overlayRes.ok) {
        const overlayData = await overlayRes.json();
        context.applyOverlayData(overlayData);
      }
      if (presetRes.ok) {
        const presetData = await presetRes.json();
        if (Array.isArray(presetData.presets)) {
          context.applyPresetsData(presetData.presets);
        }
      }
      if (sceneRes && sceneRes.ok) {
        const sceneData = await sceneRes.json();
        if (Array.isArray(sceneData.scenes)) {
          context.applyScenesData(sceneData.scenes);
        }
      }
      if (popupRes && popupRes.ok) {
        const popupData = await popupRes.json();
        context.applyPopupData(popupData);
      }
      if (brbRes && brbRes.ok) {
        const brbData = await brbRes.json();
        context.applyBrbData(brbData);
      }
      if (slateRes && slateRes.ok) {
        const slateData = await slateRes.json();
        context.applySlateData(slateData);
      }
      setServerStatus('Online', '#9de2c2');
      if (!silent && typeof context.afterStateFetch === 'function') {
        context.afterStateFetch({ silent });
      }
    } catch (err) {
      console.error('Failed to fetch state', err);
      setServerStatus('Unreachable', '#ff9a9a');
      if (!silent) showToast('Server unreachable');
    } finally {
      fetchInFlight = false;
      if (fetchPending) {
        const shouldBeSilent = fetchPendingSilent;
        fetchPending = false;
        fetchPendingSilent = true;
        void fetchState({ silent: shouldBeSilent });
      }
    }
  }

  async function persistState(payload) {
    const base = getServerBase();
    try {
      const res = await fetch(`${base}/ticker/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        if (res.ok) {
          console.warn('Ticker save returned non-JSON response', parseErr);
        }
      }
      if (!res.ok) {
        const message = data?.error || data?.message || `Save failed (HTTP ${res.status})`;
        throw new Error(message);
      }
      if (data && data.state) {
        context.applyTickerData(data.state);
      }
      setServerStatus('Online', '#9de2c2');
    } catch (err) {
      console.error('Failed to save state', err);
      showToast(err.message || 'Failed to save ticker state');
      setServerStatus('Error', '#ff9a9a');
    }
  }

  async function persistOverlay(payload) {
    const base = getServerBase();
    try {
      const res = await fetch(`${base}/ticker/overlay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        if (res.ok) {
          console.warn('Overlay save returned non-JSON response', parseErr);
        }
      }
      if (!res.ok) {
        const message = data?.error || data?.message || `Save failed (HTTP ${res.status})`;
        throw new Error(message);
      }
      if (data && data.overlay) {
        context.applyOverlayData(data.overlay);
      }
    } catch (err) {
      console.error('Failed to save overlay preferences', err);
      showToast(err.message || 'Failed to save overlay preferences');
    }
  }

  async function persistPopup(payload) {
    const base = getServerBase();
    try {
      const res = await fetch(`${base}/popup/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        if (res.ok) {
          console.warn('Popup save returned non-JSON response', parseErr);
        }
      }
      if (!res.ok) {
        const message = data?.error || data?.message || `Save failed (HTTP ${res.status})`;
        throw new Error(message);
      }
      if (data && data.popup) {
        context.applyPopupData(data.popup);
      }
      showToast(payload.isActive ? 'Popup updated' : 'Popup cleared');
    } catch (err) {
      console.error('Failed to save popup state', err);
      showToast(err.message || 'Failed to update popup');
    }
  }

  async function persistBrb(payload) {
    const base = getServerBase();
    try {
      const res = await fetch(`${base}/brb/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        if (res.ok) {
          console.warn('BRB save returned non-JSON response', parseErr);
        }
      }
      if (!res.ok) {
        const message = data?.error || data?.message || `Save failed (HTTP ${res.status})`;
        throw new Error(message);
      }
      if (data && data.state) {
        context.applyBrbData(data.state);
      }
      showToast(payload.isActive ? 'BRB updated' : 'BRB hidden');
    } catch (err) {
      console.error('Failed to save BRB state', err);
      showToast(err.message || 'Failed to update BRB state');
    }
  }

  async function persistSlate(payload) {
    const base = getServerBase();
    try {
      const res = await fetch(`${base}/slate/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        if (res.ok) {
          console.warn('Slate save returned non-JSON response', parseErr);
        }
      }
      if (!res.ok) {
        const message = data?.error || data?.message || `Save failed (HTTP ${res.status})`;
        throw new Error(message);
      }
      if (data && data.slate) {
        context.applySlateData(data.slate);
      }
    } catch (err) {
      console.error('Failed to save slate state', err);
      showToast(err.message || 'Failed to save slate');
    }
  }

  async function persistPresets(presets, { notify = true } = {}) {
    const base = getServerBase();
    try {
      const res = await fetch(`${base}/ticker/presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presets })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data && Array.isArray(data.presets)) {
        context.applyPresetsData(data.presets);
      }
      if (notify) showToast('Presets saved');
    } catch (err) {
      console.error('Failed to save presets', err);
      if (notify) showToast('Failed to save presets');
    }
  }

  async function persistScenes(scenes, { successMessage = 'Scene saved' } = {}) {
    const base = getServerBase();
    try {
      const res = await fetch(`${base}/ticker/scenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.error || `Failed to save scenes (HTTP ${res.status})`;
        throw new Error(message);
      }
      if (data && Array.isArray(data.scenes)) {
        context.applyScenesData(data.scenes);
      }
      showToast(successMessage);
    } catch (err) {
      console.error('Failed to save scenes', err);
      showToast(err.message || 'Failed to save scenes');
    }
  }

  async function activateScene(sceneId) {
    const base = getServerBase();
    try {
      const res = await fetch(`${base}/ticker/scenes/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.error || `Failed to activate scene (HTTP ${res.status})`;
        throw new Error(message);
      }
      return true;
    } catch (err) {
      console.error('Failed to activate scene', err);
      showToast(err.message || 'Failed to activate scene');
      return false;
    }
  }

  global.TickerDashboardSync = {
    init,
    connectStream,
    disconnectStream,
    fetchState,
    persistState,
    persistOverlay,
    persistPopup,
    persistBrb,
    persistSlate,
    persistPresets,
    persistScenes,
    activateScene
  };
})(window);
