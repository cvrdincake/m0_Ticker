let toastTimer;

const STATUS_LABELS = {
  connected: 'Connected',
  connecting: 'Connecting…',
  error: 'Connection Error',
  disconnected: 'Disconnected'
};

export function showToast(message, variant = 'info', duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) {
    console[variant === 'error' ? 'error' : 'log'](message);
    return;
  }

  toast.textContent = message;
  toast.dataset.variant = variant;
  toast.classList.add('toast--visible');

  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.dataset.variant = '';
  }, duration);
}

export function setConnectionStatus(status) {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const label = STATUS_LABELS[status] ?? status ?? '';

  if (dot) {
    dot.dataset.status = status;
    dot.classList.remove('status-connected', 'status-connecting', 'status-error', 'status-disconnected');
    dot.classList.add(`status-${status}`);
  }

  if (text) {
    text.textContent = label;
  }
}

export function formatScale(scale) {
  if (!Number.isFinite(scale)) return '';
  const rounded = Math.round(scale * 100) / 100;
  const formatted = rounded % 1 === 0
    ? rounded.toFixed(0)
    : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${formatted}x`;
}

export function initializeTabSwitching() {
  const navItems = document.querySelectorAll('.nav-item[data-tab]');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(navItem => {
    navItem.addEventListener('click', () => {
      const targetTab = navItem.dataset.tab;

      // Update nav items
      navItems.forEach(item => item.classList.remove('active'));
      navItem.classList.add('active');

      // Update tab contents
      tabContents.forEach(content => {
        if (content.id === `tab-${targetTab}`) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });

  // Keyboard shortcuts (1-6 for tabs)
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const keyMap = {
      '1': 'overlay',
      '2': 'ticker',
      '3': 'popup',
      '4': 'scenes',
      '5': 'theme',
      '6': 'system'
    };

    if (keyMap[e.key]) {
      e.preventDefault();
      const targetNav = document.querySelector(`.nav-item[data-tab="${keyMap[e.key]}"]`);
      if (targetNav) targetNav.click();
    }
  });
}
