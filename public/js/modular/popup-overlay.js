/**
 * Modular Popup Overlay Component
 * Extracted from monolithic output.html for better maintainability
 */

class ModularPopupOverlay {
  constructor(container, stateManager) {
    this.container = container;
    this.stateManager = stateManager;
    this.isActive = false;
    this.currentText = '';
    this.countdownTimer = null;
    this.durationTimer = null;
    this.animationController = null;
    
    this.init();
  }

  init() {
    this.setupDOM();
    this.subscribeToState();
    this.bindEvents();
    this.initAnimationController();
  }

  initAnimationController() {
    // Use shared GSAP animation controller from window
    if (window.gsapAnimations) {
      this.animationController = window.gsapAnimations;
      console.log('[PopupOverlay] Using shared GSAP controller');
    } else {
      console.warn('[PopupOverlay] GSAP controller not available yet');
      // Try again after a short delay
      setTimeout(() => {
        if (window.gsapAnimations) {
          this.animationController = window.gsapAnimations;
          console.log('[PopupOverlay] GSAP controller connected on retry');
        }
      }, 100);
    }
  }

  setupDOM() {
    if (!this.container) {
      console.warn('[PopupOverlay] Container not found');
      return;
    }

    // Ensure required DOM structure exists
    this.textNode = this.container.querySelector('.popup-text') || 
                   this.container.querySelector('#popupContent');
    
    if (!this.textNode) {
      this.textNode = document.createElement('div');
      this.textNode.className = 'popup-text';
      this.container.appendChild(this.textNode);
    }

    this.countdownNode = this.container.querySelector('.popup-countdown');
    if (!this.countdownNode) {
      this.countdownNode = document.createElement('div');
      this.countdownNode.className = 'popup-countdown';
      this.container.appendChild(this.countdownNode);
    }
  }

  subscribeToState() {
    this.stateManager.subscribe('popup', (state) => {
      this.handleStateUpdate(state);
    });
  }

  bindEvents() {
    // Handle escape key to close popup
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isActive) {
        this.hide();
      }
    });

    // Handle click outside to close
    document.addEventListener('click', (event) => {
      if (this.isActive && !this.container.contains(event.target)) {
        this.hide();
      }
    });
  }

  handleStateUpdate(state) {
    const textChanged = this.currentText !== state.text;
    const activeChanged = this.isActive !== state.isActive;

    this.currentText = state.text || '';
    this.isActive = state.isActive && this.currentText.length > 0;

    if (textChanged) {
      this.updateContent();
    }

    if (activeChanged || textChanged) {
      if (this.isActive) {
        this.show(state);
      } else {
        this.hide();
      }
    }
  }

  updateContent() {
    if (!this.textNode) return;

    // Support basic markdown formatting
    const formattedText = this.formatText(this.currentText);
    this.textNode.innerHTML = formattedText;
  }

  formatText(text) {
    if (!text) return '';
    
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  show(state = {}) {
    if (!this.container) return;

    // Use GSAP animation if available, otherwise fallback to CSS
    if (this.animationController) {
      this.animationController.animatePopupAppearance(this.container, this.currentText, {
        effect: state.effect || 'scale',
        typewriter: state.typewriter || true,
        glow: state.glow !== false,
        duration: state.duration || 1.5
      });
    } else {
      // Fallback to CSS animations
      this.container.classList.add('modular-popup--active');
      this.container.style.opacity = '1';
      this.container.style.visibility = 'visible';
      this.container.style.pointerEvents = 'auto';
    }

    // Handle countdown if enabled
    if (state.countdownEnabled && state.countdownTarget) {
      this.startCountdown(state.countdownTarget);
    } else {
      this.hideCountdown();
    }

    // Handle auto-hide duration
    // If durationSeconds is 0 or not set, popup stays until manually dismissed
    // If durationSeconds > 0, popup auto-hides after that duration
    if (state.durationSeconds && state.durationSeconds > 0) {
      this.startDurationTimer(state.durationSeconds);
    } else {
      // Clear any existing timer and let popup stay visible until dismissed
      this.clearDurationTimer();
    }

    // Announce to screen readers
    this.announceToScreenReader(this.currentText);
  }

  hide() {
    if (!this.container) return;

    this.container.classList.remove('modular-popup--active');
    this.container.style.opacity = '0';
    this.container.style.visibility = 'hidden';
    this.container.style.pointerEvents = 'none';

    this.clearTimers();
    this.hideCountdown();

    // Update state to reflect hiding
    this.stateManager.updateState('popup', {
      isActive: false,
      text: ''
    });
  }

  startCountdown(targetDate) {
    this.clearCountdownTimer();
    
    const target = new Date(targetDate);
    if (isNaN(target.getTime())) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = target - now;

      if (diff <= 0) {
        this.hideCountdown();
        this.clearCountdownTimer();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      if (this.countdownNode) {
        this.countdownNode.textContent = timeString;
        this.countdownNode.style.display = 'block';
      }
    };

    updateCountdown();
    this.countdownTimer = setInterval(updateCountdown, 1000);
  }

  hideCountdown() {
    if (this.countdownNode) {
      this.countdownNode.style.display = 'none';
    }
  }

  startDurationTimer(seconds) {
    this.clearDurationTimer();
    
    this.durationTimer = setTimeout(() => {
      this.hide();
    }, seconds * 1000);
  }

  clearTimers() {
    this.clearCountdownTimer();
    this.clearDurationTimer();
  }

  clearCountdownTimer() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  clearDurationTimer() {
    if (this.durationTimer) {
      clearTimeout(this.durationTimer);
      this.durationTimer = null;
    }
  }

  announceToScreenReader(text) {
    // Create temporary element for screen reader announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.textContent = `Popup: ${text}`;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Utility methods for external control
  showMessage(text, options = {}) {
    this.stateManager.updateState('popup', {
      text: text,
      isActive: true,
      durationSeconds: options.duration || null,
      countdownEnabled: options.countdown || false,
      countdownTarget: options.countdownTarget || null
    });
  }

  getDebugInfo() {
    return {
      isActive: this.isActive,
      currentText: this.currentText,
      hasContainer: !!this.container,
      hasTimers: !!(this.countdownTimer || this.durationTimer)
    };
  }

  destroy() {
    this.clearTimers();
    this.container = null;
    this.textNode = null;
    this.countdownNode = null;
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModularPopupOverlay;
} else {
  window.ModularPopupOverlay = ModularPopupOverlay;
}