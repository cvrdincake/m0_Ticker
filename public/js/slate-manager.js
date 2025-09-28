class SlateManager {
  constructor(wsConnection, stateManager) {
    this.ws = wsConnection;
    this.stateManager = stateManager;
    this.elements = {
      slateEnabled: document.getElementById('slateEnabled'),
      slateShowClock: document.getElementById('slateShowClock'),
      slateRotation: document.getElementById('slateRotation'),
      slateRotationNumber: document.getElementById('slateRotationNumber'),
      slateClockLabel: document.getElementById('slateClockLabel'),
      slateClockSubtitle: document.getElementById('slateClockSubtitle'),
      slateNextLabel: document.getElementById('slateNextLabel'),
      slateNextTitle: document.getElementById('slateNextTitle'),
      slateNextSubtitle: document.getElementById('slateNextSubtitle'),
      slateSponsorLabel: document.getElementById('slateSponsorLabel'),
      slateSponsorName: document.getElementById('slateSponsorName'),
      slateSponsorTagline: document.getElementById('slateSponsorTagline'),
      slateNotesLabel: document.getElementById('slateNotesLabel'),
      slateNotes: document.getElementById('slateNotes'),
      slatePreview: document.getElementById('slatePreview'),
      slatePreviewContent: document.getElementById('slatePreviewContent'),
      slatePreviewDots: document.getElementById('slatePreviewDots')
    };

    this.previewTimer = null;
    this.currentPreviewIndex = 0;
    this.previewItems = [];
    this.initialize();
  }

  initialize() {
    // Subscribe to slate state changes
    this.ws.subscribe('slate', (data) => {
      this.stateManager.state.slate = data;
      this.updateUI(data);
      this.updatePreview(data);
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Enable/Disable slate
    this.elements.slateEnabled?.addEventListener('change', () => {
      this.updateSlateState({
        isEnabled: this.elements.slateEnabled.checked
      });
    });

    // Show/Hide clock
    this.elements.slateShowClock?.addEventListener('change', () => {
      this.updateSlateState({
        showClock: this.elements.slateShowClock.checked
      });
    });

    // Rotation interval
    this.elements.slateRotation?.addEventListener('input', () => {
      const value = parseFloat(this.elements.slateRotation.value);
      if (this.elements.slateRotationNumber) {
        this.elements.slateRotationNumber.value = value;
      }
      this.updateSlateState({
        rotationSeconds: value
      });
    });

    this.elements.slateRotationNumber?.addEventListener('input', () => {
      const value = parseFloat(this.elements.slateRotationNumber.value);
      if (this.elements.slateRotation) {
        this.elements.slateRotation.value = value;
      }
      this.updateSlateState({
        rotationSeconds: value
      });
    });

    // Text input fields
    const textFields = [
      { element: 'slateClockLabel', key: 'clockLabel' },
      { element: 'slateClockSubtitle', key: 'clockSubtitle' },
      { element: 'slateNextLabel', key: 'nextLabel' },
      { element: 'slateNextTitle', key: 'nextTitle' },
      { element: 'slateNextSubtitle', key: 'nextSubtitle' },
      { element: 'slateSponsorLabel', key: 'sponsorLabel' },
      { element: 'slateSponsorName', key: 'sponsorName' },
      { element: 'slateSponsorTagline', key: 'sponsorTagline' },
      { element: 'slateNotesLabel', key: 'notesLabel' }
    ];

    textFields.forEach(({ element, key }) => {
      this.elements[element]?.addEventListener('input', () => {
        const update = {};
        update[key] = this.elements[element].value;
        this.updateSlateState(update);
      });
    });

    // Notes textarea
    this.elements.slateNotes?.addEventListener('input', () => {
      const notes = this.elements.slateNotes.value
        .split('\n')
        .map(note => note.trim())
        .filter(note => note);

      this.updateSlateState({
        notes: notes.slice(0, 6) // Limit to 6 notes
      });
    });
  }

  updateSlateState(update) {
    try {
      const currentState = this.stateManager.getState('slate');
      const newState = {
        ...currentState,
        ...update,
        updatedAt: Date.now()
      };

      // Validate before sending
      this.validateSlateState(newState);

      this.ws.send('slate', newState);
    } catch (error) {
      this.showError(error.message);
    }
  }

  validateSlateState(state) {
    const MAX_LENGTH = {
      clockLabel: 48,
      clockSubtitle: 48,
      nextLabel: 48,
      nextTitle: 80,
      nextSubtitle: 120,
      sponsorLabel: 48,
      sponsorName: 80,
      sponsorTagline: 120,
      notesLabel: 48
    };

    // Validate text lengths
    Object.entries(MAX_LENGTH).forEach(([key, maxLength]) => {
      if (state[key] && state[key].length > maxLength) {
        throw new Error(`${key} must be ${maxLength} characters or less`);
      }
    });

    // Validate notes
    if (state.notes) {
      if (!Array.isArray(state.notes)) {
        throw new Error('Notes must be an array');
      }
      if (state.notes.length > 6) {
        throw new Error('Maximum of 6 notes allowed');
      }
      state.notes.forEach(note => {
        if (note.length > 200) {
          throw new Error('Each note must be 200 characters or less');
        }
      });
    }

    // Validate rotation seconds
    if (state.rotationSeconds !== undefined) {
      const rotation = Number(state.rotationSeconds);
      if (isNaN(rotation) || rotation < 4 || rotation > 900) {
        throw new Error('Rotation interval must be between 4 and 900 seconds');
      }
    }

    return true;
  }

  updateUI(data) {
    if (!data) return;

    // Update checkboxes
    this.elements.slateEnabled.checked = data.isEnabled;
    this.elements.slateShowClock.checked = data.showClock;

    // Update rotation inputs
    this.elements.slateRotation.value = data.rotationSeconds;
    this.elements.slateRotationNumber.value = data.rotationSeconds;

    // Update text fields
    const textFields = [
      { element: 'slateClockLabel', key: 'clockLabel' },
      { element: 'slateClockSubtitle', key: 'clockSubtitle' },
      { element: 'slateNextLabel', key: 'nextLabel' },
      { element: 'slateNextTitle', key: 'nextTitle' },
      { element: 'slateNextSubtitle', key: 'nextSubtitle' },
      { element: 'slateSponsorLabel', key: 'sponsorLabel' },
      { element: 'slateSponsorName', key: 'sponsorName' },
      { element: 'slateSponsorTagline', key: 'sponsorTagline' },
      { element: 'slateNotesLabel', key: 'notesLabel' }
    ];

    textFields.forEach(({ element, key }) => {
      if (this.elements[element]) {
        this.elements[element].value = data[key] || '';
      }
    });

    // Update notes
    if (this.elements.slateNotes) {
      this.elements.slateNotes.value = Array.isArray(data.notes) ? data.notes.join('\n') : '';
    }
  }

  updatePreview(data) {
    if (!this.elements.slatePreview) return;

    this.elements.slatePreview.classList.toggle('is-disabled', !data.isEnabled);
    this.elements.slatePreview.classList.toggle('is-empty', !this.hasContent(data));

    // Clear existing preview timer
    if (this.previewTimer) {
      clearInterval(this.previewTimer);
      this.previewTimer = null;
    }

    // Build preview items
    this.previewItems = this.buildPreviewItems(data);
    
    // Update preview content
    if (this.previewItems.length > 0) {
      this.showPreviewItem(0);
      if (this.previewItems.length > 1) {
        this.startPreviewRotation(data.rotationSeconds * 1000);
      }
    }

    // Update preview dots
    this.updatePreviewDots();
  }

  hasContent(data) {
    return data.showClock || data.nextTitle || data.sponsorName || 
           (Array.isArray(data.notes) && data.notes.length > 0);
  }

  buildPreviewItems(data) {
    const items = [];

    // Add clock if enabled
    if (data.showClock) {
      items.push({
        type: 'clock',
        pill: data.clockLabel || 'UK TIME',
        title: this.getCurrentTime(),
        subtitle: data.clockSubtitle || 'UK time'
      });
    }

    // Add next-up if exists
    if (data.nextTitle) {
      items.push({
        type: 'next',
        pill: data.nextLabel || 'Next up',
        title: data.nextTitle,
        subtitle: data.nextSubtitle || ''
      });
    }

    // Add sponsor if exists
    if (data.sponsorName) {
      items.push({
        type: 'sponsor',
        pill: data.sponsorLabel || 'Sponsor',
        title: data.sponsorName,
        subtitle: data.sponsorTagline || ''
      });
    }

    // Add notes
    if (Array.isArray(data.notes)) {
      data.notes.forEach(note => {
        items.push({
          type: 'note',
          pill: data.notesLabel || 'Spotlight',
          title: note
        });
      });
    }

    return items;
  }

  showPreviewItem(index) {
    if (!this.elements.slatePreviewContent || !this.previewItems[index]) return;

    const item = this.previewItems[index];
    this.elements.slatePreviewContent.innerHTML = `
      <div class="slate-preview-row">
        <span class="slate-preview-pill">${this.escapeHtml(item.pill)}</span>
        <div class="slate-preview-title">${this.escapeHtml(item.title)}</div>
        ${item.subtitle ? `<div class="slate-preview-subtitle">${this.escapeHtml(item.subtitle)}</div>` : ''}
      </div>
    `;

    // Update active dot
    this.currentPreviewIndex = index;
    this.updatePreviewDots();

    // Update clock if needed
    if (item.type === 'clock') {
      this.updateClock();
    }
  }

  startPreviewRotation(interval) {
    this.previewTimer = setInterval(() => {
      const nextIndex = (this.currentPreviewIndex + 1) % this.previewItems.length;
      this.showPreviewItem(nextIndex);
    }, interval);
  }

  updatePreviewDots() {
    if (!this.elements.slatePreviewDots) return;

    this.elements.slatePreviewDots.innerHTML = this.previewItems
      .map((_, index) => `
        <div class="slate-preview-dot${index === this.currentPreviewIndex ? ' is-active' : ''}"></div>
      `)
      .join('');
  }

  getCurrentTime() {
    return new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  updateClock() {
    const clockTitle = this.elements.slatePreviewContent?.querySelector('.slate-preview-title');
    if (clockTitle) {
      clockTitle.textContent = this.getCurrentTime();
    }
  }

  showError(message) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.style.opacity = 1;
      toast.style.transform = 'translateY(0)';
      setTimeout(() => {
        toast.style.opacity = 0;
        toast.style.transform = 'translateY(12px)';
      }, 3000);
    }
    console.error('Slate error:', message);
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Export for both module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SlateManager;
} else {
  window.SlateManager = SlateManager;
}