// Initialize state manager and WebSocket connection
const stateManager = new StateManager();
const wsConnection = new TickerWebSocket(window.location.origin);

// Utility functions
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Dashboard Elements
const el = {
  messageForm: document.querySelector('form.message-form'),
  newMessage: document.getElementById('newMessage'),
  messageQueue: document.getElementById('messageQueue'),
  messageList: document.getElementById('messageQueue'),
  messageInput: document.getElementById('newMessage'),
  addMessageButton: document.getElementById('addMessageButton'),
  addMessageBtn: document.getElementById('addMessageButton'),
  clearMessages: document.getElementById('clearMessages'),
  exportMessages: document.getElementById('exportMessages'),
  importMessages: document.getElementById('importMessages'),
  
  startButton: document.getElementById('startTickerButton'),
  startBtn: document.getElementById('startTickerButton'),
  stopButton: document.getElementById('stopTickerButton'),
  stopBtn: document.getElementById('stopTickerButton'),
  refreshButton: document.getElementById('refreshStateButton'),
  
  displayDuration: document.getElementById('displayDuration'),
  intervalMinutes: document.getElementById('intervalMinutes'),
  autoStart: document.getElementById('autoStart'),
  
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
    el.connectionStatus.textContent = 'Connected';
    el.connectionDot.classList.remove('status-dot--error');
    el.connectionDot.classList.add('status-dot--success');
  } else {
    el.connectionStatus.textContent = 'Disconnected';
    el.connectionDot.classList.remove('status-dot--success');
    el.connectionDot.classList.add('status-dot--error');
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
if (el.newMessage && el.addMessageButton) {
  el.newMessage.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = el.newMessage.value;
      if (text.trim()) {
        addMessage(text);
        el.newMessage.value = '';
      }
    }
  });

  el.addMessageButton.addEventListener('click', () => {
    const text = el.newMessage.value;
    if (text.trim()) {
      addMessage(text);
      el.newMessage.value = '';
    }
  });
}

// UI Rendering
function renderMessages(messages = []) {
  if (!el.messageList) return;
  
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
  
  el.messageList.innerHTML = messageHtml;

  // Add click handlers for message actions
  el.messageList.addEventListener('click', (e) => {
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

  el.messageList.innerHTML = messageHtml;
}

function updateTickerControls(data) {
  if (!el.startBtn || !el.stopBtn) return;
  el.startBtn.disabled = data.isActive;
  el.stopBtn.disabled = !data.isActive;
  el.displayDuration.value = data.displayDuration || 5;
  el.intervalMinutes.value = data.intervalBetween || 0;
  el.autoStart.checked = data.autoStart || false;
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
  setupPanelToggles();
  
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

// Message form event listeners setup is handled in setupMessageForm()

el.messageList?.addEventListener('click', (event) => {
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

el.startBtn?.addEventListener('click', () => {
  wsConnection.send('ticker', {
    ...stateManager.getState('ticker'),
    isActive: true
  });
});

el.stopBtn?.addEventListener('click', () => {
  wsConnection.send('ticker', {
    ...stateManager.getState('ticker'),
    isActive: false
  });
});

el.refreshBtn?.addEventListener('click', () => {
  location.reload();
});

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Managers are initialized as needed within their respective panels

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