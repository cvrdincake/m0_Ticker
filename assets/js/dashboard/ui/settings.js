/* global confirm, Blob */
import { showToast } from './common.js';

/**
 * Settings UI Module
 * Handles all form submissions and settings management for ticker, popup, scenes, and themes
 */
export function mountSettings({ transport, getState, selectors, subscribe }) {
  // Initialize form listeners and state sync
  initializeTickerSettings(transport, getState);
  initializePopupSettings(transport, getState);
  initializeSceneSettings(transport, getState);
  initializeThemeSettings(transport, getState);
  initializePresetSettings(transport, getState);
  initializeSystemSettings(transport, getState);

  // Sync UI with server state on load
  subscribe(selectors.serverState, state => {
    if (state) {
      syncTickerUI(state);
      syncPopupUI(state);
    }
  });

  // Return cleanup function
  return () => {
    cleanupGlobalHandlers();
  };
}

// ============================================================================
// TICKER SETTINGS
// ============================================================================

function initializeTickerSettings(transport) {
  const speedSlider = document.getElementById('tickerSpeed');
  const speedValue = document.getElementById('tickerSpeedValue');
  const durationInput = document.getElementById('tickerDuration');
  const intervalInput = document.getElementById('tickerInterval');
  const autoRotateToggle = document.getElementById('autoRotate');
  const easingToggle = document.getElementById('easingOnWrap');

  // Update speed display
  if (speedSlider && speedValue) {
    speedSlider.addEventListener('input', () => {
      speedValue.textContent = `${speedSlider.value} px/s`;
    });
  }

  // Global handler for save button
  window.saveTickerSettings = async function() {
    try {
      const settings = {
        speed: parseInt(speedSlider?.value || 60),
        durationSec: parseInt(durationInput?.value || 10),
        intervalMin: parseInt(intervalInput?.value || 5),
        mode: getSelectedRotationMode(),
        autoRotate: autoRotateToggle?.classList.contains('active') || false,
        easingOnWrap: easingToggle?.classList.contains('active') || false
      };

      // Validate settings
      if (settings.speed < 10 || settings.speed > 300) {
        throw new Error('Speed must be between 10 and 300 px/s');
      }
      if (settings.durationSec < 1 || settings.durationSec > 3600) {
        throw new Error('Duration must be between 1 and 3600 seconds');
      }
      if (settings.intervalMin < 0 || settings.intervalMin > 1440) {
        throw new Error('Interval must be between 0 and 1440 minutes');
      }

      await transport.send('setTickerSettings', settings);
      showToast('Ticker settings saved', 'success', 2000);
    } catch (err) {
      console.error('Failed to save ticker settings:', err);
      showToast(err.message || 'Failed to save ticker settings', 'error', 3000);
    }
  };

  // Global handler for rotation mode
  window.setRotationMode = function(element) {
    const pills = document.querySelectorAll('#tickerRotationPills .pill');
    pills.forEach(pill => pill.classList.remove('active'));
    element.classList.add('active');
  };

  // Global handler for auto-rotate toggle
  window.toggleAutoRotate = function(element) {
    element.classList.toggle('active');
  };

  // Global handler for easing toggle
  window.toggleEasing = function(element) {
    element.classList.toggle('active');
  };
}

function getSelectedRotationMode() {
  const activePill = document.querySelector('#tickerRotationPills .pill.active');
  return activePill?.dataset.mode || 'continuous';
}

function syncTickerUI(state) {
  if (!state.ticker?.settings) return;

  const settings = state.ticker.settings;
  const speedSlider = document.getElementById('tickerSpeed');
  const speedValue = document.getElementById('tickerSpeedValue');
  const durationInput = document.getElementById('tickerDuration');
  const intervalInput = document.getElementById('tickerInterval');
  const autoRotateToggle = document.getElementById('autoRotate');
  const easingToggle = document.getElementById('easingOnWrap');

  if (speedSlider && settings.speed !== undefined) {
    speedSlider.value = settings.speed;
    if (speedValue) speedValue.textContent = `${settings.speed} px/s`;
  }

  if (durationInput && settings.durationSec !== undefined) {
    durationInput.value = settings.durationSec;
  }

  if (intervalInput && settings.intervalMin !== undefined) {
    intervalInput.value = settings.intervalMin;
  }

  if (autoRotateToggle && settings.autoRotate !== undefined) {
    autoRotateToggle.classList.toggle('active', settings.autoRotate);
  }

  if (easingToggle && settings.easingOnWrap !== undefined) {
    easingToggle.classList.toggle('active', settings.easingOnWrap);
  }

  // Sync rotation mode pills
  if (settings.mode) {
    const pills = document.querySelectorAll('#tickerRotationPills .pill');
    pills.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.mode === settings.mode);
    });
  }
}

// ============================================================================
// POPUP SETTINGS
// ============================================================================

function initializePopupSettings(transport) {
  const messageTextarea = document.getElementById('popupMessage');
  const charCounter = document.getElementById('popupCharCounter');
  const autoDismissInput = document.getElementById('popupAutoDismiss');
  const scaleSlider = document.getElementById('popupScale');
  const scaleValue = document.getElementById('popupScaleValue');
  const pinnedToggle = document.getElementById('popupPinned');
  const ctaLabelInput = document.getElementById('popupCtaLabel');
  const ctaUrlInput = document.getElementById('popupCtaUrl');

  // Update character counter
  if (messageTextarea && charCounter) {
    messageTextarea.addEventListener('input', () => {
      const length = messageTextarea.value.length;
      charCounter.textContent = `${length} / 300`;
      if (length > 270) {
        charCounter.classList.add('warning');
      } else {
        charCounter.classList.remove('warning');
      }
    });
  }

  // Update scale display
  if (scaleSlider && scaleValue) {
    scaleSlider.addEventListener('input', () => {
      scaleValue.textContent = `${parseFloat(scaleSlider.value).toFixed(1)}x`;
    });
  }

  // Global handler for save and show
  window.saveAndShowPopup = async function() {
    try {
      const message = messageTextarea?.value.trim();
      if (!message) {
        showToast('Please enter a popup message', 'warn', 2000);
        return;
      }

      const popupData = {
        message,
        position: getSelectedPopupPosition(),
        variant: getSelectedPopupVariant(),
        autoDismissSec: parseInt(autoDismissInput?.value || 0),
        pinned: pinnedToggle?.classList.contains('active') || false,
        visible: true
      };

      // Add CTA if provided
      if (ctaLabelInput?.value.trim() && ctaUrlInput?.value.trim()) {
        popupData.ctaLabel = ctaLabelInput.value.trim();
        popupData.ctaUrl = ctaUrlInput.value.trim();
      }

      // Get popup scale from theme if available
      const scale = parseFloat(scaleSlider?.value || 1);
      if (scale !== 1) {
        await transport.send('theme:update', { popupScale: scale });
      }

      await transport.send('setPopup', popupData);
      await transport.send('control:popup-toggle', { visible: true });
      showToast('Popup shown', 'success', 2000);
    } catch (err) {
      console.error('Failed to show popup:', err);
      showToast(err.message || 'Failed to show popup', 'error', 3000);
    }
  };

  // Global handler for hide popup
  window.hidePopup = async function() {
    try {
      await transport.send('control:popup-toggle', { visible: false });
      showToast('Popup hidden', 'info', 2000);
    } catch (err) {
      console.error('Failed to hide popup:', err);
      showToast(err.message || 'Failed to hide popup', 'error', 3000);
    }
  };

  // Global handler for queue popup
  window.queuePopup = async function() {
    try {
      const message = messageTextarea?.value.trim();
      if (!message) {
        showToast('Please enter a popup message', 'warn', 2000);
        return;
      }

      const popupData = {
        message,
        position: getSelectedPopupPosition(),
        variant: getSelectedPopupVariant(),
        autoDismissSec: parseInt(autoDismissInput?.value || 0),
        pinned: pinnedToggle?.classList.contains('active') || false,
        visible: false
      };

      await transport.send('setPopup', popupData);
      showToast('Popup queued for later', 'success', 2000);
    } catch (err) {
      console.error('Failed to queue popup:', err);
      showToast(err.message || 'Failed to queue popup', 'error', 3000);
    }
  };

  // Global handler for position selection
  window.setPopupPosition = function(element) {
    const pills = element.parentElement.querySelectorAll('.pill');
    pills.forEach(pill => pill.classList.remove('active'));
    element.classList.add('active');
  };

  // Global handler for variant selection
  window.setPopupVariant = function(element) {
    const pills = element.parentElement.querySelectorAll('.pill');
    pills.forEach(pill => pill.classList.remove('active'));
    element.classList.add('active');
  };

  // Global handler for pin toggle
  window.togglePin = function(element) {
    element.classList.toggle('active');
  };

  // Global handler for template loading
  window.loadPopupTemplate = function(templateName) {
    const templates = {
      'coming-up': {
        message: 'Coming Up Next: Special Segment',
        variant: 'standard',
        autoDismiss: 10
      },
      'breaking': {
        message: 'BREAKING: Important Update',
        variant: 'alert',
        autoDismiss: 15
      },
      'sponsor': {
        message: 'This stream is sponsored by...',
        variant: 'elevated',
        autoDismiss: 8
      },
      'social': {
        message: 'Follow us on social media @yourhandle',
        variant: 'standard',
        autoDismiss: 10
      },
      'giveaway': {
        message: 'GIVEAWAY ALERT! Check chat for details!',
        variant: 'success',
        autoDismiss: 0
      },
      'intermission': {
        message: 'Be right back! Taking a short break',
        variant: 'minimal',
        autoDismiss: 0
      }
    };

    const template = templates[templateName];
    if (!template) return;

    if (messageTextarea) messageTextarea.value = template.message;
    if (charCounter) charCounter.textContent = `${template.message.length} / 300`;
    if (autoDismissInput) autoDismissInput.value = template.autoDismiss;

    // Set variant
    const variantPills = document.querySelectorAll('[data-variant]');
    variantPills.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.variant === template.variant);
    });

    showToast(`Loaded ${templateName} template`, 'success', 1500);
  };
}

function getSelectedPopupPosition() {
  const activePill = document.querySelector('[data-position].active');
  return activePill?.dataset.position || 'top-left';
}

function getSelectedPopupVariant() {
  const activePill = document.querySelector('[data-variant].active');
  return activePill?.dataset.variant || 'standard';
}

function syncPopupUI(state) {
  if (!state.popup) return;

  const popup = state.popup;
  const messageTextarea = document.getElementById('popupMessage');
  const charCounter = document.getElementById('popupCharCounter');
  const autoDismissInput = document.getElementById('popupAutoDismiss');
  const pinnedToggle = document.getElementById('popupPinned');

  if (messageTextarea && popup.message !== undefined) {
    messageTextarea.value = popup.message;
    if (charCounter) {
      charCounter.textContent = `${popup.message.length} / 300`;
    }
  }

  if (autoDismissInput && popup.autoDismissSec !== undefined) {
    autoDismissInput.value = popup.autoDismissSec;
  }

  if (pinnedToggle && popup.pinned !== undefined) {
    pinnedToggle.classList.toggle('active', popup.pinned);
  }

  // Sync position pills
  if (popup.position) {
    const positionPills = document.querySelectorAll('[data-position]');
    positionPills.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.position === popup.position);
    });
  }

  // Sync variant pills
  if (popup.variant) {
    const variantPills = document.querySelectorAll('[data-variant]');
    variantPills.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.variant === popup.variant);
    });
  }
}

// ============================================================================
// SCENE SETTINGS
// ============================================================================

function initializeSceneSettings(transport, getState) {
  window.saveScene = async function() {
    const sceneNameInput = document.getElementById('sceneName');
    const name = sceneNameInput?.value.trim();

    if (!name) {
      showToast('Please enter a scene name', 'warn', 2000);
      return;
    }

    try {
      const currentState = getState().serverState;
      const sceneData = {
        name,
        ticker: currentState?.ticker || {},
        popup: currentState?.popup || {},
        theme: currentState?.theme || {}
      };

      await transport.send('saveScene', sceneData);
      showToast(`Scene "${name}" saved`, 'success', 2000);
      if (sceneNameInput) sceneNameInput.value = '';
    } catch (err) {
      console.error('Failed to save scene:', err);
      showToast(err.message || 'Failed to save scene', 'error', 3000);
    }
  };

  window.loadScene = async function(sceneName) {
    if (!sceneName) return;

    try {
      await transport.send('loadScene', { name: sceneName });
      showToast(`Scene "${sceneName}" loaded`, 'success', 2000);
    } catch (err) {
      console.error('Failed to load scene:', err);
      showToast(err.message || 'Failed to load scene', 'error', 3000);
    }
  };

  window.deleteScene = async function(sceneName) {
    if (!sceneName) return;
    if (!confirm(`Delete scene "${sceneName}"? This cannot be undone.`)) return;

    try {
      await transport.send('deleteScene', { name: sceneName });
      showToast(`Scene "${sceneName}" deleted`, 'success', 2000);
    } catch (err) {
      console.error('Failed to delete scene:', err);
      showToast(err.message || 'Failed to delete scene', 'error', 3000);
    }
  };
}

// ============================================================================
// THEME SETTINGS
// ============================================================================

function initializeThemeSettings(transport) {
  window.applyThemePreset = async function(element) {
    const themeName = element?.dataset.theme;
    if (!themeName) return;

    const pills = element.parentElement.querySelectorAll('.pill');
    pills.forEach(pill => pill.classList.remove('active'));
    element.classList.add('active');

    try {
      await transport.send('theme:apply-preset', { preset: themeName });
      showToast(`Theme "${themeName}" applied`, 'success', 2000);
    } catch (err) {
      console.error('Failed to apply theme:', err);
      showToast(err.message || 'Failed to apply theme', 'error', 3000);
    }
  };

  // NEW: Toggle visual effects
  window.toggleEffect = function(element) {
    element.classList.toggle('active');
  };

  // NEW: Set ticker position (top/bottom)
  window.setTickerPosition = function(element) {
    const pills = element.parentElement.querySelectorAll('.pill');
    pills.forEach(pill => pill.classList.remove('active'));
    element.classList.add('active');
  };

  // NEW: Save complete theme
  window.saveTheme = async function() {
    try {
      const themeData = {
        position: getSelectedTickerPosition(),
        edgeLighting: document.getElementById('edgeLighting')?.classList.contains('active'),
        accentShimmer: document.getElementById('accentShimmer')?.classList.contains('active'),
        sparkleEffects: document.getElementById('sparkleEffects')?.classList.contains('active'),
        accentPrimary: document.getElementById('accentPrimary')?.value || '#d4af37'
      };

      await transport.send('theme:update', themeData);
      showToast('Theme saved', 'success', 2000);
    } catch (err) {
      console.error('Failed to save theme:', err);
      showToast(err.message || 'Failed to save theme', 'error', 3000);
    }
  };

  // Color picker handlers
  const accentPrimaryInput = document.getElementById('accentPrimary');
  const accentPrimaryText = document.getElementById('accentPrimaryText');

  if (accentPrimaryInput && accentPrimaryText) {
    accentPrimaryInput.addEventListener('change', () => {
      accentPrimaryText.value = accentPrimaryInput.value;
      updateThemeColors();
    });

    accentPrimaryText.addEventListener('change', () => {
      if (/^#[0-9A-F]{6}$/i.test(accentPrimaryText.value)) {
        accentPrimaryInput.value = accentPrimaryText.value;
        updateThemeColors();
      }
    });
  }

  async function updateThemeColors() {
    try {
      await transport.send('theme:update', {
        accentPrimary: accentPrimaryInput?.value || '#d4af37'
      });
    } catch (err) {
      console.error('Failed to update theme colors:', err);
    }
  }
}

function getSelectedTickerPosition() {
  const activePill = document.querySelector('[data-position="top"].active, [data-position="bottom"].active');
  return activePill?.dataset.position || 'bottom';
}

// ============================================================================
// PRESET SETTINGS
// ============================================================================

function initializePresetSettings(transport, getState) {
  window.savePreset = async function() {
    const presetNameInput = document.getElementById('presetName');
    const name = presetNameInput?.value.trim();

    if (!name) {
      showToast('Please enter a preset name', 'warn', 2000);
      return;
    }

    try {
      const currentState = getState().serverState;
      const messages = currentState?.ticker?.messages || [];

      await transport.send('savePreset', {
        name,
        messages: messages.map(m => ({
          text: m.text,
          category: m.category,
          accentWords: m.accentWords,
          priority: m.priority
        }))
      });

      showToast(`Preset "${name}" saved`, 'success', 2000);
      if (presetNameInput) presetNameInput.value = '';
    } catch (err) {
      console.error('Failed to save preset:', err);
      showToast(err.message || 'Failed to save preset', 'error', 3000);
    }
  };

  window.loadPreset = async function(presetId) {
    if (!presetId) return;

    try {
      await transport.send('loadPreset', { id: presetId });
      showToast('Preset loaded', 'success', 2000);
    } catch (err) {
      console.error('Failed to load preset:', err);
      showToast(err.message || 'Failed to load preset', 'error', 3000);
    }
  };

  window.deletePreset = async function(presetId) {
    if (!presetId) return;
    if (!confirm('Delete this preset? This cannot be undone.')) return;

    try {
      await transport.send('deletePreset', { id: presetId });
      showToast('Preset deleted', 'success', 2000);
    } catch (err) {
      console.error('Failed to delete preset:', err);
      showToast(err.message || 'Failed to delete preset', 'error', 3000);
    }
  };
}

// ============================================================================
// SYSTEM SETTINGS
// ============================================================================

function initializeSystemSettings(transport, getState) {
  window.exportConfig = function() {
    try {
      const state = getState().serverState;
      const config = JSON.stringify(state, null, 2);
      const blob = new Blob([config], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `obs-dashboard-config-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Configuration exported', 'success', 2000);
    } catch (err) {
      console.error('Failed to export config:', err);
      showToast('Failed to export configuration', 'error', 3000);
    }
  };

  window.importConfig = async function(event) {
    const file = event.target?.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const config = JSON.parse(text);

      if (!confirm('Import this configuration? Current settings will be replaced.')) {
        return;
      }

      await transport.send('importConfig', config);
      showToast('Configuration imported', 'success', 2000);
      event.target.value = ''; // Reset file input
    } catch (err) {
      console.error('Failed to import config:', err);
      showToast('Failed to import configuration', 'error', 3000);
    }
  };

  window.viewAnalytics = function() {
    const analyticsPreview = document.getElementById('analyticsPreview');
    if (!analyticsPreview) return;

    const state = getState();
    const analytics = state.analytics || {};

    analyticsPreview.innerHTML = `
      <div class="panel-subtitle" style="margin: 8px 0;">
        <strong>Total Ticker Shows:</strong> ${analytics.totalShows || 0}<br>
        <strong>Total Popups:</strong> ${analytics.totalPopups || 0}<br>
        <strong>Most Shown Message:</strong> ${analytics.topMessage || 'None'}<br>
      </div>
    `;
  };
}

// ============================================================================
// CLEANUP
// ============================================================================

function cleanupGlobalHandlers() {
  // Remove all global handler functions
  delete window.saveTickerSettings;
  delete window.setRotationMode;
  delete window.toggleAutoRotate;
  delete window.toggleEasing;
  delete window.saveAndShowPopup;
  delete window.hidePopup;
  delete window.queuePopup;
  delete window.setPopupPosition;
  delete window.setPopupVariant;
  delete window.togglePin;
  delete window.loadPopupTemplate;
  delete window.saveScene;
  delete window.loadScene;
  delete window.deleteScene;
  delete window.applyThemePreset;
  delete window.toggleEffect;
  delete window.setTickerPosition;
  delete window.saveTheme;
  delete window.savePreset;
  delete window.loadPreset;
  delete window.deletePreset;
  delete window.exportConfig;
  delete window.importConfig;
  delete window.viewAnalytics;
}
