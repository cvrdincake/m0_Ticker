/**
 * Modular BRB (Be Right Back) Overlay Component
 * Extracted from monolithic output.html for better maintainability
 */

class ModularBRBOverlay {
  constructor(container, stateManager) {
    this.container = container;
    this.stateManager = stateManager;
    this.isActive = false;
    this.currentText = '';
    this.animationElements = [];
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
      console.log('[BRBOverlay] Using shared GSAP controller');
    } else {
      console.warn('[BRBOverlay] GSAP controller not available yet');
      // Try again after a short delay
      setTimeout(() => {
        if (window.gsapAnimations) {
          this.animationController = window.gsapAnimations;
          console.log('[BRBOverlay] GSAP controller connected on retry');
        }
      }, 100);
    }
  }

  setupDOM() {
    if (!this.container) {
      console.warn('[BRBOverlay] Container not found');
      return;
    }

    // Ensure required DOM structure exists
    this.textNode = this.container.querySelector('.brb-text') || 
                   this.container.querySelector('#brbBannerText');
    
    if (!this.textNode) {
      this.textNode = document.createElement('div');
      this.textNode.className = 'brb-text';
      this.container.appendChild(this.textNode);
    }

    // Add animation elements if they don't exist
    this.setupAnimationElements();
  }

  setupAnimationElements() {
    // Create animated background elements
    if (!this.container.querySelector('.brb-bg-animation')) {
      const bgAnimation = document.createElement('div');
      bgAnimation.className = 'brb-bg-animation';
      this.container.appendChild(bgAnimation);
      this.animationElements.push(bgAnimation);
    }

    // Create pulse elements
    for (let i = 0; i < 3; i++) {
      if (!this.container.querySelector(`.brb-pulse-${i}`)) {
        const pulse = document.createElement('div');
        pulse.className = `brb-pulse brb-pulse-${i}`;
        pulse.style.animationDelay = `${i * 0.5}s`;
        this.container.appendChild(pulse);
        this.animationElements.push(pulse);
      }
    }
  }

  subscribeToState() {
    this.stateManager.subscribe('brb', (state) => {
      this.handleStateUpdate(state);
    });
  }

  bindEvents() {
    // Handle keyboard shortcuts for quick BRB toggle
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + B to toggle BRB
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        this.toggle();
      }

      // Escape to hide BRB
      if (event.key === 'Escape' && this.isActive) {
        this.hide();
      }
    });
  }

  handleStateUpdate(state) {
    const textChanged = this.currentText !== state.text;
    const activeChanged = this.isActive !== state.isActive;

    this.currentText = state.text || 'Be Right Back';
    this.isActive = state.isActive;

    if (textChanged) {
      this.updateContent();
    }

    if (activeChanged) {
      if (this.isActive) {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  updateContent() {
    if (!this.textNode) return;

    // Support basic formatting and emojis
    const formattedText = this.formatText(this.currentText);
    this.textNode.innerHTML = formattedText;
  }

  formatText(text) {
    if (!text) return 'Be Right Back';
    
    // Support basic markdown and emoji shortcuts
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/:coffee:/g, '☕')
      .replace(/:clock:/g, '⏰')
      .replace(/:wave:/g, '👋')
      .replace(/:back:/g, '↩️')
      .replace(/\n/g, '<br>');
  }

  show() {
    if (!this.container) return;

    // Use GSAP animation if available, otherwise fallback to CSS
    if (this.animationController) {
      this.animationController.animateBRBAppearance(this.container, this.currentText, {
        effect: 'dramatic',
        scramble: true,
        elastic: true,
        glow: true,
        duration: 2.0
      });
    } else {
      // Fallback to CSS animations
      this.container.classList.add('modular-brb--active');
      this.container.style.opacity = '1';
      this.container.style.visibility = 'visible';
      this.container.style.pointerEvents = 'auto';
      this.container.style.zIndex = '9999';
      
      // Start basic animations
      this.startAnimations();
    }

    // Announce to screen readers
    this.announceToScreenReader(`Be Right Back mode activated: ${this.currentText}`);

    // Set aria attributes for accessibility
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('role', 'banner');
  }

  hide() {
    if (!this.container) return;

    this.container.classList.remove('modular-brb--active');
    this.container.style.opacity = '0';
    this.container.style.visibility = 'hidden';
    this.container.style.pointerEvents = 'none';

    // Stop animations
    this.stopAnimations();

    // Remove aria attributes
    this.container.removeAttribute('aria-live');
    this.container.removeAttribute('role');

    // Update state
    this.stateManager.updateState('brb', {
      isActive: false
    });
  }

  toggle() {
    if (this.isActive) {
      this.hide();
    } else {
      this.stateManager.updateState('brb', {
        isActive: true,
        text: this.currentText || 'Be Right Back'
      });
    }
  }

  startAnimations() {
    // Add CSS animations via classes
    this.animationElements.forEach(element => {
      element.classList.add('brb-animate');
    });

    // Add pulsing effect to main container
    this.container.classList.add('brb-pulse-container');
  }

  stopAnimations() {
    // Remove animation classes
    this.animationElements.forEach(element => {
      element.classList.remove('brb-animate');
    });

    this.container.classList.remove('brb-pulse-container');
  }

  announceToScreenReader(text) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.textContent = text;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Utility methods for external control
  showBRB(text = 'Be Right Back') {
    this.stateManager.updateState('brb', {
      isActive: true,
      text: text
    });
  }

  hideBRB() {
    this.hide();
  }

  updateText(text) {
    this.stateManager.updateState('brb', {
      isActive: this.isActive,
      text: text
    });
  }

  // Preset BRB messages
  showPreset(preset) {
    const presets = {
      'coffee': 'Getting some coffee ☕ - Back in a few minutes!',
      'bathroom': 'Be right back! 🚶‍♂️',
      'technical': 'Technical difficulties - Please stand by ⚙️',
      'break': 'Taking a quick break ⏰ - Back soon!',
      'food': 'Gone for food 🍕 - Be back shortly!',
      'phone': 'Taking a call 📞 - One moment please',
      'setup': 'Setting things up ⚙️ - Just a moment!'
    };

    const message = presets[preset] || presets['break'];
    this.showBRB(message);
  }

  getDebugInfo() {
    return {
      isActive: this.isActive,
      currentText: this.currentText,
      hasContainer: !!this.container,
      animationElementCount: this.animationElements.length
    };
  }

  destroy() {
    this.stopAnimations();
    this.container = null;
    this.textNode = null;
    this.animationElements = [];
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModularBRBOverlay;
} else {
  window.ModularBRBOverlay = ModularBRBOverlay;
}