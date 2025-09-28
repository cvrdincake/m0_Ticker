// Initialize state manager and WebSocket connection
const stateManager = new StateManager();
const wsConnection = new TickerWebSocket(window.location.origin);

// Utility functions
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initialize managers
const popupManager = new PopupManager(wsConnection, stateManager);
const brbManager = new BrbManager(wsConnection, stateManager);
const slateManager = new SlateManager(wsConnection, stateManager);

// Dashboard Elements
const el = {
  messageForm: document.querySelector('form.message-form'),
  newMessage: document.getElementById('newMessage'),
  messageQueue: document.getElementById('messageQueue'),
  addMessageButton: document.getElementById('addMessageButton'),
  clearMessages: document.getElementById('clearMessages'),
  exportMessages: document.getElementById('exportMessages'),
  importMessages: document.getElementById('importMessages'),
  
  startButton: document.getElementById('startTickerButton'),
  stopButton: document.getElementById('stopTickerButton'),
  refreshButton: document.getElementById('refreshStateButton'),
  
  overlayTab: document.querySelector('[data-view="overlay"]'),
  slateTab: document.querySelector('[data-view="slate"]'),
  brbTab: document.querySelector('[data-view="brb"]'),
  
  overlayPanel: document.getElementById('overlayPanel'),
  slatePanel: document.getElementById('slatePanel'),
  brbPanel: document.getElementById('brbPanel'),
  
  connectionStatus: document.getElementById('connectionStatus'),
  connectionDot: document.getElementById('connectionDot')
};

// Connection status handling
wsConnection.subscribe('connection', (status) => {
  if (status.status === 'connected') {
    elements.statusServer.textContent = 'Connected';
    elements.statusServerDot.classList.remove('status-dot--error');
    elements.statusServerDot.classList.add('status-dot--success');
  } else {
    elements.statusServer.textContent = 'Disconnected';
    elements.statusServerDot.classList.remove('status-dot--success');
    elements.statusServerDot.classList.add('status-dot--error');
  }
});

// Ticker message handling
wsConnection.subscribe('ticker', (data) => {
  stateManager.state.ticker = data;
  renderMessages(data.messages);
  updateTickerControls(data);
});

// Message composition and management
function addMessage(text) {
  if (!text || !text.trim()) return false;
  
  console.log('[DEBUG] Adding message:', text);
  
  const currentState = stateManager.getState('ticker') || {};
  const messages = Array.isArray(currentState.messages) ? [...currentState.messages] : [];
  
  const newMessage = {
    id: Date.now().toString(),
    text: text.trim(),
    addedAt: Date.now()
  };
  
  messages.push(newMessage);
  
  // Update state and send via WebSocket
  stateManager.state.ticker = {
    ...currentState,
    messages,
    updatedAt: Date.now()
  };
  
  wsConnection.send('ticker', stateManager.state.ticker);
  console.log('[DEBUG] Message added successfully');
  return true;
}

// Message form handling
function setupMessageForm() {
  if (!el.messageForm || !el.newMessage) {
    console.error('[DEBUG] Message form elements not found');
    return;
  }
  
  console.log('[DEBUG] Setting up message form');
  
  el.messageForm.addEventListener('submit', event => {
    event.preventDefault();
    console.log('[DEBUG] Form submitted, adding message:', el.newMessage.value);
    const added = addMessage(el.newMessage.value);
    if (added) {
      el.newMessage.value = '';
    }
    el.newMessage.focus();
  });
  
  // Add button click handler as backup
  if (el.addMessageButton) {
    el.addMessageButton.addEventListener('click', (event) => {
      event.preventDefault();
      console.log('[DEBUG] Add button clicked');
      const added = addMessage(el.newMessage.value);
      if (added) {
        el.newMessage.value = '';
      }
      el.newMessage.focus();
    });
  }
}

function removeMessage(index) {
  const messages = [...stateManager.getState('ticker').messages];
  messages.splice(index, 1);
  
  wsConnection.send('ticker', {
    ...stateManager.getState('ticker'),
    messages
  });
}

function moveMessage(index, direction) {
  const messages = [...stateManager.getState('ticker').messages];
  if (index + direction >= 0 && index + direction < messages.length) {
    const temp = messages[index];
    messages[index] = messages[index + direction];
    messages[index + direction] = temp;
    
    wsConnection.send('ticker', {
      ...stateManager.getState('ticker'),
      messages
    });
  }
}

// Setup message input handlers
if (elements.messageInput && elements.addMessageBtn) {
  elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = elements.messageInput.value;
      if (text.trim()) {
        addMessage(text);
        elements.messageInput.value = '';
      }
    }
  });

  elements.addMessageBtn.addEventListener('click', () => {
    const text = elements.messageInput.value;
    if (text.trim()) {
      addMessage(text);
      elements.messageInput.value = '';
    }
  });
}

// UI Rendering
function renderMessages(messages = []) {
  if (!elements.messageList) return;
  
  const messageHtml = messages.map((msg, index) => {
    return `
      <div class="message-item" data-index="${index}">
        <div class="message-text">${escapeHtml(msg.text)}</div>
        <div class="message-actions">
          <button type="button" class="btn btn-icon" data-action="up" title="Move up" ${index === 0 ? 'disabled' : ''}>
            <span class="icon">↑</span>
          </button>
          <button type="button" class="btn btn-icon" data-action="down" title="Move down" ${index === messages.length - 1 ? 'disabled' : ''}>
            <span class="icon">↓</span>
          </button>
          <button type="button" class="btn btn-icon btn-danger" data-action="delete" title="Delete">
            <span class="icon">×</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  elements.messageList.innerHTML = messageHtml;

  // Add click handlers for message actions
  elements.messageList.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const messageItem = button.closest('.message-item');
    if (!messageItem) return;

    const index = parseInt(messageItem.dataset.index, 10);
    if (isNaN(index)) return;

    switch (action) {
      case 'up':
        moveMessage(index, -1);
        break;
      case 'down':
        moveMessage(index, 1);
        break;
      case 'delete':
        removeMessage(index);
        break;
    }
  });

  elements.messageList.innerHTML = messageHtml;
}

function updateTickerControls(data) {
  if (!elements.startBtn || !elements.stopBtn) return;
  elements.startBtn.disabled = data.isActive;
  elements.stopBtn.disabled = !data.isActive;
  elements.displayDuration.value = data.displayDuration || 5;
  elements.intervalMinutes.value = data.intervalBetween || 0;
  elements.autoStart.checked = data.autoStart || false;
}

// Widget Tab System
function setupWidgetTabs() {
  const tabs = {
    overlay: el.overlayTab,
    slate: el.slateTab,
    brb: el.brbTab
  };

  const panels = {
    overlay: el.overlayPanel,
    slate: el.slatePanel,
    brb: el.brbPanel
  };

  console.log('[DEBUG] Setting up widget tabs');

  // Add click handlers for tabs
  Object.entries(tabs).forEach(([view, tab]) => {
    if (!tab) {
      console.log(`[DEBUG] Tab for ${view} not found`);
      return;
    }

    tab.addEventListener('click', () => {
      console.log(`[DEBUG] Switching to ${view} view`);
      
      // Update tab active states
      Object.values(tabs).forEach(t => {
        if (t) t.classList.remove('active');
      });
      tab.classList.add('active');

      // Show/hide panels
      Object.entries(panels).forEach(([key, panel]) => {
        if (!panel) return;
        if (key === view) {
          console.log(`[DEBUG] Showing ${key} panel`);
          panel.classList.remove('hidden');
        } else {
          console.log(`[DEBUG] Hiding ${key} panel`);
          panel.classList.add('hidden');
        }
      });
    });
  });
}

// Panel Toggle Handlers
function setupPanelToggles() {
  const sections = document.querySelectorAll('.panel-section');
  
  sections.forEach(section => {
    const header = section.querySelector('.panel-header');
    const content = section.querySelector('.panel-content');
    if (!header || !content) return;

    header.addEventListener('click', () => {
      const isExpanded = content.classList.contains('show');
      
      // Close other sections in the same panel
      const panel = section.closest('.widget-panel');
      if (panel) {
        panel.querySelectorAll('.panel-section').forEach(otherSection => {
          if (otherSection !== section) {
            otherSection.querySelector('.panel-content')?.classList.remove('show');
            otherSection.querySelector('.panel-header')?.classList.remove('expanded');
          }
        });
      }

      // Toggle current section
      content.classList.toggle('show', !isExpanded);
      header.classList.toggle('expanded', !isExpanded);
    });
  });
}

// Initialize all UI systems
function initializeUI() {
  console.log('[DEBUG] Initializing UI systems');
  setupMessageForm();
  setupWidgetTabs();
  
  // Set default view to overlay
  if (el.overlayTab) {
    console.log('[DEBUG] Setting default view to overlay');
    el.overlayTab.click();
  }
}

// Initialize everything when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[DEBUG] DOM loaded, initializing dashboard');
  initializeUI();
});

// Message Form Handling
function setupMessageForm() {
  const form = document.querySelector('.message-form');
  if (!form || !elements.messageInput || !elements.addMessageBtn) return;

  // Prevent form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = elements.messageInput.value;
    if (text.trim()) {
      addMessage(text);
    }
  });

  // Add button click handler
  elements.addMessageBtn.addEventListener('click', () => {
    const text = elements.messageInput.value;
    if (text.trim()) {
      addMessage(text);
    }
  });

  // Enter key handler
  elements.messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const text = elements.messageInput.value;
      if (text.trim()) {
        addMessage(text);
      }
    }
  });
}

elements.messageList?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  
  const messageItem = button.closest('.message-item');
  if (!messageItem) return;
  
  const index = parseInt(messageItem.dataset.index, 10);
  
  switch (button.dataset.action) {
    case 'delete':
      removeMessage(index);
      break;
    case 'up':
      moveMessage(index, -1);
      break;
    case 'down':
      moveMessage(index, 1);
      break;
  }
});

elements.startBtn?.addEventListener('click', () => {
  wsConnection.send('ticker', {
    ...stateManager.getState('ticker'),
    isActive: true
  });
});

elements.stopBtn?.addEventListener('click', () => {
  wsConnection.send('ticker', {
    ...stateManager.getState('ticker'),
    isActive: false
  });
});

elements.refreshBtn?.addEventListener('click', () => {
  location.reload();
});

// Helper function for HTML escaping
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Initialize managers
  const popupManager = new PopupManager(wsConnection, stateManager);
  const brbManager = new BRBManager(wsConnection, stateManager);
  const slateManager = new SlateManager(wsConnection, stateManager);

  // Set up WebSocket error handling
  wsConnection.subscribe('error', (error) => {
    console.error('WebSocket error:', error);
    // Show error in the UI
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = 'Connection error. Retrying...';
      toast.style.opacity = 1;
      toast.style.transform = 'translateY(0)';
      setTimeout(() => {
        toast.style.opacity = 0;
        toast.style.transform = 'translateY(12px)';
      }, 3000);
    }
  });

  // Handle initial state
  wsConnection.subscribe('init', (state) => {
    Object.keys(state).forEach(key => {
      stateManager.state[key] = state[key];
      if (key === 'ticker') {
        renderMessages(state[key].messages);
        updateTickerControls(state[key]);
      }
    });
  });
});