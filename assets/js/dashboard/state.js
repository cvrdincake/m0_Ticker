const OVERLAY_PRESETS = [0.8, 1.2, 1.75, 2.5];

export const ACTIONS = {
  SET_CONNECTION_STATUS: 'connection:set-status',
  HYDRATE_STATE: 'state:hydrate',
  PATCH_STATE: 'state:patch',
  SET_OVERLAY_SCALE: 'overlay:set-scale',
  SET_SAFE_ZONES: 'overlay:set-safe-zones',
  SET_TICKER_ENABLED: 'ticker:set-enabled',
  SET_POPUP_VISIBLE: 'popup:set-visible'
};

const initialState = {
  connection: {
    status: 'connecting',
    retries: 0,
    lastError: null
  },
  overlay: {
    scale: 1.75,
    safeZonesVisible: false,
    url: new URL('/overlay', window.location.origin).href
  },
  ticker: {
    enabled: false
  },
  popup: {
    visible: false
  },
  metadata: {
    changeHistory: []
  },
  analytics: {},
  serverState: null
};

let state = structuredClone(initialState);
const listeners = new Set();

export function getState() {
  return state;
}

export function dispatch(action) {
  if (!action || !action.type) return;
  const nextState = reduce(state, action);
  if (nextState !== state) {
    state = nextState;
    notify();
  }
}

export function subscribe(selector, callback) {
  if (typeof selector !== 'function') {
    throw new Error('subscribe requires a selector function');
  }
  const listener = {
    selector,
    callback,
    lastValue: selector(state)
  };
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach(listener => {
    const nextValue = listener.selector(state);
    if (nextValue !== listener.lastValue) {
      listener.lastValue = nextValue;
      listener.callback(nextValue);
    }
  });
}

function reduce(currentState, action) {
  switch (action.type) {
    case ACTIONS.SET_CONNECTION_STATUS: {
      const { status, retries = currentState.connection.retries, error = null } = action.payload ?? {};
      if (!status) return currentState;
      return {
        ...currentState,
        connection: {
          status,
          retries,
          lastError: error
        }
      };
    }

    case ACTIONS.HYDRATE_STATE: {
      const payload = action.payload ?? {};
      const safeZonesVisible = payload.metadata?.safeZonesVisible ?? currentState.overlay.safeZonesVisible;
      const scaleFromState = normalizeScale(payload.metadata?.overlayScale ?? payload.theme?.overlayScale);
      return {
        ...currentState,
        overlay: {
          ...currentState.overlay,
          safeZonesVisible,
          scale: scaleFromState ?? currentState.overlay.scale
        },
        ticker: {
          ...currentState.ticker,
          ...payload.ticker,
          enabled: payload.ticker?.enabled ?? currentState.ticker.enabled
        },
        popup: {
          ...currentState.popup,
          ...payload.popup,
          visible: payload.popup?.visible ?? currentState.popup.visible
        },
        metadata: {
          ...currentState.metadata,
          changeHistory: payload.metadata?.changeHistory ?? currentState.metadata.changeHistory,
          lastSaved: payload.metadata?.lastSaved ?? currentState.metadata.lastSaved
        },
        analytics: payload.analytics ?? currentState.analytics,
        serverState: payload
      };
    }

    case ACTIONS.PATCH_STATE: {
      const patch = action.payload ?? {};
      return {
        ...currentState,
        ...patch
      };
    }

    case ACTIONS.SET_OVERLAY_SCALE: {
      const scale = normalizeScale(action.payload);
      if (!scale) return currentState;
      if (scale === currentState.overlay.scale) return currentState;
      return {
        ...currentState,
        overlay: {
          ...currentState.overlay,
          scale
        }
      };
    }

    case ACTIONS.SET_SAFE_ZONES: {
      const visible = Boolean(action.payload);
      if (visible === currentState.overlay.safeZonesVisible) return currentState;
      return {
        ...currentState,
        overlay: {
          ...currentState.overlay,
          safeZonesVisible: visible
        }
      };
    }

    case ACTIONS.SET_TICKER_ENABLED: {
      const enabled = Boolean(action.payload);
      if (enabled === currentState.ticker.enabled) return currentState;
      return {
        ...currentState,
        ticker: {
          ...currentState.ticker,
          enabled
        }
      };
    }

    case ACTIONS.SET_POPUP_VISIBLE: {
      const visible = Boolean(action.payload);
      if (visible === currentState.popup.visible) return currentState;
      return {
        ...currentState,
        popup: {
          ...currentState.popup,
          visible
        }
      };
    }

    default:
      return currentState;
  }
}

function normalizeScale(value) {
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isFinite(parsed) && parsed >= 0.5 && parsed <= 3) {
    return Math.round(parsed * 100) / 100;
  }
  return null;
}

export const selectors = {
  connectionStatus: s => s.connection.status,
  connectionError: s => s.connection.lastError,
  overlaySettings: s => s.overlay,
  overlaySafeZones: s => s.overlay.safeZonesVisible,
  overlayScale: s => s.overlay.scale,
  tickerEnabled: s => s.ticker.enabled,
  tickerMessages: s => s.ticker.messages || [],
  popupVisible: s => s.popup.visible,
  overlayPresets: () => OVERLAY_PRESETS,
  serverState: s => s.serverState
};

export function resetState() {
  state = structuredClone(initialState);
  notify();
}
