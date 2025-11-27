import { ACTIONS, dispatch, getState, selectors, subscribe } from './state.js';
import { createTransport } from './transport.js';
import { mountOverlay } from './ui/overlay.js';
import { mountTicker } from './ui/ticker.js';
import { mountSettings } from './ui/settings.js';
import { setConnectionStatus, showToast, initializeTabSwitching } from './ui/common.js';

function setupConnectionToasts() {
  let lastStatus = null;
  return status => {
    if (lastStatus === status) return;

    if (status === 'connected') {
      showToast('Connected to server', 'success', 1800);
    } else if (status === 'error') {
      showToast('Connection error. Retrying…', 'error', 4000);
    } else if (status === 'disconnected' && lastStatus && lastStatus !== 'connecting') {
      showToast('Disconnected from server', 'warn', 3000);
    }

    lastStatus = status;
  };
}

export function initializeDashboard() {
  const overlayRoot = document.querySelector('[data-module="overlay"]');
  const tickerRoot = document.querySelector('#tab-ticker');
  const connectionStatusHandler = setupConnectionToasts();

  // Initialize tab switching
  initializeTabSwitching();

  const transport = createTransport({
    dispatch,
    onState: state => dispatch({ type: ACTIONS.HYDRATE_STATE, payload: state }),
    onAnalytics: payload => dispatch({ type: ACTIONS.PATCH_STATE, payload: { analytics: payload } }),
    onError: payload => {
      if (payload?.message) {
        showToast(payload.message, 'error', 4000);
      }
    },
    onConnectionChange: status => {
      connectionStatusHandler(status);
    }
  });

  subscribe(selectors.connectionStatus, status => setConnectionStatus(status));

  if (overlayRoot) {
    mountOverlay({
      root: overlayRoot,
      transport,
      dispatch,
      getState,
      selectors,
      subscribe
    });
  }

  if (tickerRoot) {
    mountTicker({
      root: tickerRoot,
      transport,
      dispatch,
      getState,
      selectors,
      subscribe
    });
  }

  // Mount settings handlers (global functions for forms)
  mountSettings({
    transport,
    getState,
    selectors,
    subscribe
  });

  transport.connect();
}
