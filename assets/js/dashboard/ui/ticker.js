/* global confirm, prompt */
import { showToast } from './common.js';

export function mountTicker({ root, transport, getState, selectors, subscribe }) {
  if (!root) return () => {};

  const messagesList = root.querySelector('#messagesList');
  const newMessageInput = root.querySelector('#newMessage');
  const accentWordsInput = root.querySelector('#accentWords');
  const categorySelect = root.querySelector('#messageCategory');
  const prioritySlider = root.querySelector('#messagePriority');
  const priorityValueLabel = root.querySelector('#priorityValue');
  const charCounter = root.querySelector('#charCounter');

  // Update priority label
  if (prioritySlider && priorityValueLabel) {
    prioritySlider.addEventListener('input', () => {
      const value = parseInt(prioritySlider.value);
      const labels = {
        1: 'Normal (1x)',
        2: 'Medium (2x)',
        3: 'High (3x)',
        4: 'Very High (4x)',
        5: 'Critical (5x)'
      };
      priorityValueLabel.textContent = labels[value] || `${value}x`;
    });
  }

  // Update character counter
  if (newMessageInput && charCounter) {
    newMessageInput.addEventListener('input', () => {
      const length = newMessageInput.value.length;
      charCounter.textContent = `${length} / 500`;
      if (length > 450) {
        charCounter.classList.add('warning');
      } else {
        charCounter.classList.remove('warning');
      }
      if (length >= 500) {
        charCounter.classList.add('error');
      } else {
        charCounter.classList.remove('error');
      }
    });
  }

  // Render messages list
  const renderMessages = messages => {
    if (!messagesList) return;

    if (!messages || messages.length === 0) {
      messagesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <p>No messages yet. Add your first ticker message above.</p>
        </div>
      `;
      return;
    }

    messagesList.innerHTML = messages.map(msg => `
      <div class="message-item ${msg.enabled === false ? 'disabled' : ''}" 
        data-message-id="${msg.id}" draggable="true">
        <div class="message-drag-handle">⋮⋮</div>
        <div class="message-content">
          <div class="message-text">${escapeHtml(msg.text || '')}</div>
          <div class="message-meta">
            <span>📁 ${msg.category || 'general'}</span>
            <span>⚡ Priority: ${msg.priority || 1}</span>
            ${msg.accentWords ? `<span>✨ ${msg.accentWords}</span>` : ''}
          </div>
        </div>
        <div class="message-actions">
          <button class="icon-btn" data-action="ticker:toggle-message"
            data-message-id="${msg.id}"
            title="${msg.enabled === false ? 'Enable' : 'Disable'}">
            ${msg.enabled === false ? '▶️' : '⏸️'}
          </button>
          <button class="icon-btn" data-action="ticker:edit-message"
            data-message-id="${msg.id}" title="Edit">
            ✏️
          </button>
          <button class="icon-btn" data-action="ticker:delete-message"
            data-message-id="${msg.id}" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  };

  // Subscribe to ticker messages
  subscribe(selectors.tickerMessages, renderMessages);

  // Initial render with current state
  const initialMessages = selectors.tickerMessages(getState());
  renderMessages(initialMessages);

  // Setup drag and drop for message reordering
  setupDragAndDrop();

  // Event delegation for message actions
  const onClick = async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const messageId = button.dataset.messageId;

    try {
      switch (action) {
        case 'ticker:toggle-message':
          await handleToggleMessage(messageId);
          break;
        case 'ticker:edit-message':
          await handleEditMessage(messageId);
          break;
        case 'ticker:delete-message':
          await handleDeleteMessage(messageId);
          break;
        case 'ticker:add-message':
          await handleAddMessage();
          break;
        case 'ticker:clear-messages':
          await handleClearMessages();
          break;
      }
    } catch (err) {
      console.error('Ticker action failed', action, err);
      showToast(err?.message ?? 'Action failed', 'error', 3000);
    }
  };

  root.addEventListener('click', onClick);

  // Global functions for onclick handlers in HTML
  window.addMessage = async () => {
    await handleAddMessage();
  };

  window.clearMessages = async () => {
    if (!confirm('Are you sure you want to clear all messages?')) return;
    await handleClearMessages();
  };

  window.bulkEnableAll = async category => {
    try {
      await transport.send('bulk:execute', {
        operation: 'enableAll',
        filter: category
      });
      const msg = category ? `Enabled all ${category} messages` : 'Enabled all messages';
      showToast(msg, 'success', 2000);
    } catch {
      showToast('Bulk enable failed', 'error', 3000);
    }
  };

  window.bulkDisableAll = async category => {
    try {
      await transport.send('bulk:execute', {
        operation: 'disableAll',
        filter: category
      });
      const msg = category ? `Disabled all ${category} messages` : 'Disabled all messages';
      showToast(msg, 'success', 2000);
    } catch {
      showToast('Bulk disable failed', 'error', 3000);
    }
  };

  window.bulkDeleteDisabled = async () => {
    if (!confirm('Delete all disabled messages? This cannot be undone.')) return;
    try {
      await transport.send('bulk:execute', {
        operation: 'deleteDisabled'
      });
      showToast('Deleted all disabled messages', 'success', 2000);
    } catch {
      showToast('Bulk delete failed', 'error', 3000);
    }
  };

  async function handleAddMessage() {
    if (!newMessageInput) return;

    const text = newMessageInput.value.trim();
    if (!text) {
      showToast('Please enter a message', 'warn', 2000);
      return;
    }

    try {
      await transport.send('addMessage', {
        text,
        accentWords: accentWordsInput?.value.trim() || '',
        category: categorySelect?.value || 'general',
        priority: parseInt(prioritySlider?.value || '1'),
        enabled: true
      });

      newMessageInput.value = '';
      if (accentWordsInput) accentWordsInput.value = '';
      if (charCounter) charCounter.textContent = '0 / 500';
      showToast('Message added', 'success', 2000);
    } catch (err) {
      showToast('Failed to add message', 'error', 3000);
      throw err;
    }
  }

  async function handleToggleMessage(messageId) {
    try {
      await transport.send('toggleMessageEnabled', { id: messageId });
    } catch (err) {
      showToast('Failed to toggle message', 'error', 3000);
      throw err;
    }
  }

  async function handleEditMessage(messageId) {
    const state = getState();
    const message = state.ticker?.messages?.find(m => m.id === messageId);
    if (!message) return;

    const newText = prompt('Edit message:', message.text);
    if (newText === null || newText.trim() === message.text) return;

    try {
      await transport.send('updateMessage', {
        id: messageId,
        updates: {
          text: newText.trim()
        }
      });
      showToast('Message updated', 'success', 2000);
    } catch (err) {
      showToast('Failed to update message', 'error', 3000);
      throw err;
    }
  }

  async function handleDeleteMessage(messageId) {
    if (!confirm('Delete this message?')) return;

    try {
      await transport.send('deleteMessage', { id: messageId });
      showToast('Message deleted', 'success', 2000);
    } catch (err) {
      showToast('Failed to delete message', 'error', 3000);
      throw err;
    }
  }

  async function handleClearMessages() {
    try {
      await transport.send('clearMessages', {});
      showToast('All messages cleared', 'success', 2000);
    } catch (err) {
      showToast('Failed to clear messages', 'error', 3000);
      throw err;
    }
  }

  function setupDragAndDrop() {
    let draggedElement = null;

    messagesList.addEventListener('dragstart', event => {
      const messageItem = event.target.closest('.message-item');
      if (!messageItem) return;

      draggedElement = messageItem;
      messageItem.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
    });

    messagesList.addEventListener('dragend', event => {
      const messageItem = event.target.closest('.message-item');
      if (messageItem) {
        messageItem.classList.remove('dragging');
      }
      draggedElement = null;
    });

    messagesList.addEventListener('dragover', event => {
      event.preventDefault();
      const messageItem = event.target.closest('.message-item');
      if (!messageItem || messageItem === draggedElement) return;

      const rect = messageItem.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const insertBefore = event.clientY < midpoint;

      if (insertBefore) {
        messagesList.insertBefore(draggedElement, messageItem);
      } else {
        messagesList.insertBefore(draggedElement, messageItem.nextSibling);
      }
    });

    messagesList.addEventListener('drop', async event => {
      event.preventDefault();
      if (!draggedElement) return;

      const newOrder = Array.from(messagesList.children).map(item => {
        const id = item.dataset.messageId;
        const state = getState();
        return state.ticker.messages.find(m => m.id === id);
      }).filter(Boolean);

      try {
        await transport.send('reorderMessages', { messages: newOrder });
        showToast('Messages reordered', 'success', 1500);
      } catch {
        showToast('Failed to reorder messages', 'error', 3000);
        renderMessages(selectors.tickerMessages(getState()));
      }
    });
  }

  return () => {
    root.removeEventListener('click', onClick);
    delete window.addMessage;
    delete window.clearMessages;
    delete window.bulkEnableAll;
    delete window.bulkDisableAll;
    delete window.bulkDeleteDisabled;
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
