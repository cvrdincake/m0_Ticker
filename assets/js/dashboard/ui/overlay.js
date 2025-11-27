import { ACTIONS, selectors as stateSelectors } from '../state.js';
import { showToast, formatScale } from './common.js';

const TICKER_COMMANDS = {
  show: { type: 'control:ticker-show' },
  hide: { type: 'control:ticker-hide' }
};

export function mountOverlay({ root, transport, dispatch, getState, selectors, subscribe }) {
  if (!root) return () => {};

  const scaleSlider = root.querySelector('[data-action="overlay:scale-slider"]');
  const scaleValueLabel = root.querySelector('#globalScaleValue');

  const updateOverlayScaleDisplay = scale => {
    if (scaleSlider) scaleSlider.value = scale;
    if (scaleValueLabel) scaleValueLabel.textContent = formatScale(scale);
  };

  subscribe(selectors.overlayScale, updateOverlayScaleDisplay);
  subscribe(selectors.overlaySafeZones, visible => {
    root.dataset.safeZones = visible ? 'visible' : 'hidden';
  });

  const onClick = async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    try {
      await runAction(button.dataset.action, { root, target: button, transport, dispatch, getState });
    } catch (err) {
      console.error('Overlay action failed', button.dataset.action, err);
      showToast(err?.message ?? 'Unexpected error', 'error', 4000);
    }
  };

  const onInput = event => {
    const target = event.target;
    if (!target.dataset?.action) return;
    runAction(target.dataset.action, { root, target, transport, dispatch, getState });
  };

  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);

  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('input', onInput);
  };

  async function runAction(action, context) {
    switch (action) {
      case 'overlay:set-scale-preset':
        return handleScalePreset(context);
      case 'overlay:scale-slider':
        return handleScaleSlider(context);
      case 'overlay:reload-preview':
        return handleReloadPreview(context);
      case 'overlay:copy-url':
        return handleCopyUrl(context);
      case 'overlay:toggle-safe-zones':
        return handleToggleSafeZones(context);
      case 'overlay:show-ticker':
        return handleShowTicker(context);
      case 'overlay:hide-ticker':
        return handleHideTicker(context);
      case 'overlay:toggle-popup':
        return handleTogglePopup(context);
      default:
        return undefined;
    }
  }

  async function handleScalePreset({ target, dispatch, transport }) {
    const scale = parseFloat(target.dataset.scale);
    if (!Number.isFinite(scale)) return;
    dispatch({ type: ACTIONS.SET_OVERLAY_SCALE, payload: scale });
    try {
      await transport.send('theme:update', { overlayScale: scale });
      showToast(`Scale set to ${formatScale(scale)}`, 'success', 1800);
    } catch (err) {
      showToast('Failed to update scale', 'error', 2000);
      throw err;
    }
  }

  async function handleScaleSlider({ target, dispatch, transport }) {
    const scale = parseFloat(target.value);
    if (!Number.isFinite(scale)) return;
    dispatch({ type: ACTIONS.SET_OVERLAY_SCALE, payload: scale });
    // Debounced server update
    clearTimeout(handleScaleSlider.timeout);
    handleScaleSlider.timeout = setTimeout(async () => {
      try {
        await transport.send('theme:update', { overlayScale: scale });
      } catch (err) {
        console.error('Failed to update scale', err);
      }
    }, 300);
  }

  function handleReloadPreview({ root }) {
    const frame = root.querySelector('[data-overlay-frame]');
    if (!frame) return;
    const url = new window.URL(frame.src || frame.dataset?.src || '/overlay', window.location.origin);
    url.searchParams.set('t', Date.now());
    frame.src = url.toString();
    showToast('Overlay preview reloaded', 'info', 2000);
  }

  async function handleCopyUrl({ getState }) {
    const overlayUrl = stateSelectors.overlaySettings(getState()).url;
    try {
      await navigator.clipboard.writeText(overlayUrl);
      showToast('Overlay URL copied to clipboard', 'success', 2000);
    } catch (err) {
      showToast('Unable to copy overlay URL', 'error', 4000);
      throw err;
    }
  }

  async function handleToggleSafeZones({ dispatch, getState, transport }) {
    const current = stateSelectors.overlaySafeZones(getState());
    const next = !current;
    dispatch({ type: ACTIONS.SET_SAFE_ZONES, payload: next });
    try {
      await transport.send('control:overlay-safe-zones', { visible: next });
      showToast(next ? 'Safe zones enabled' : 'Safe zones hidden', 'info', 2000);
    } catch (err) {
      dispatch({ type: ACTIONS.SET_SAFE_ZONES, payload: current });
      throw err;
    }
  }

  async function handleShowTicker({ transport }) {
    await sendTickerCommand(transport, TICKER_COMMANDS.show);
    showToast('Ticker shown', 'success', 2000);
  }

  async function handleHideTicker({ transport }) {
    await sendTickerCommand(transport, TICKER_COMMANDS.hide);
    showToast('Ticker hidden', 'info', 2000);
  }

  async function handleTogglePopup({ transport, getState }) {
    const visible = stateSelectors.popupVisible(getState());
    const nextVisible = !visible;
    await transport.send('control:popup-toggle', { visible: nextVisible });
    showToast(nextVisible ? 'Popup shown' : 'Popup hidden', 'info', 2000);
  }
}

async function sendTickerCommand(transport, command) {
  await transport.send(command.type, command.payload ?? {});
}
