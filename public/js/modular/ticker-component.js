/**
 * Modular Ticker Component
 * Extracted ticker logic for better maintainability and testing
 */

class ModularTickerComponent {
  constructor(container, stateManager) {
    this.container = container;
    this.stateManager = stateManager;
    this.messages = [];
    this.isActive = false;
    this.currentIndex = 0;
    this.animationId = null;
    this.marqueeOffset = 0;
    this.contentNode = null;
    this.animationController = null;
    
    this.init();
  }

  init() {
    this.setupDOM();
    this.bindEvents();
    this.subscribeToState();
    this.initAnimationController();
  }

  initAnimationController() {
    // Use shared GSAP animation controller from window
    if (window.gsapAnimations) {
      this.animationController = window.gsapAnimations;
      console.log('[TickerComponent] Using shared GSAP controller');
    } else {
      console.warn('[TickerComponent] GSAP controller not available yet');
      // Try again after a short delay
      setTimeout(() => {
        if (window.gsapAnimations) {
          this.animationController = window.gsapAnimations;
          console.log('[TickerComponent] GSAP controller connected on retry');
        }
      }, 100);
    }
  }

  setupDOM() {
    if (!this.container) return;
    
    this.contentNode = this.container.querySelector('#tickerContent') || 
                      this.container.querySelector('.ticker-content');
    
    if (!this.contentNode) {
      console.warn('[TickerComponent] Content node not found');
    }
  }

  bindEvents() {
    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  subscribeToState() {
    // Subscribe to ticker state changes
    this.stateManager.subscribe('ticker', (state) => {
      this.handleStateUpdate(state);
    });
  }

  handleStateUpdate(state) {
    const messagesChanged = JSON.stringify(this.messages) !== JSON.stringify(state.messages);
    const activeChanged = this.isActive !== state.isActive;

    this.messages = state.messages || [];
    this.isActive = state.isActive && this.messages.length > 0;

    if (messagesChanged || activeChanged) {
      this.update();
    }
  }

  update() {
    if (!this.contentNode) return;

    if (!this.isActive || !this.messages.length) {
      this.hide();
      return;
    }

    this.show();
    this.renderContent();
    this.startAnimation();
  }

  renderContent() {
    if (!this.contentNode || !this.messages.length) return;

    const formatted = this.messages.map(msg => this.formatMessage(msg));
    const separator = '<span class="message-separator">•</span>';
    
    // Duplicate content for seamless looping
    const content = formatted.join(separator);
    const duplicatedContent = `${content}${separator}${content}`;
    
    this.contentNode.innerHTML = duplicatedContent;

    // Apply GSAP animations to new messages if available
    if (this.animationController) {
      this.animationController.animateTickerMessages(this.contentNode, this.messages, {
        stagger: 0.1,
        wave: true,
        glow: true
      });
    }
  }

  formatMessage(message) {
    if (typeof message === 'string') {
      return `<span class="ticker-message">${this.escapeHtml(message)}</span>`;
    }
    
    // Handle message objects with additional properties
    if (message && typeof message === 'object') {
      const type = message.type || 'normal';
      const text = message.text || message.message || '';
      const className = `ticker-message ticker-message--${type}`;
      
      return `<span class="${className}">${this.escapeHtml(text)}</span>`;
    }
    
    return '';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  startAnimation() {
    this.stopAnimation();
    
    if (!this.contentNode) return;
    
    const animate = () => {
      this.marqueeOffset += 2; // Adjust speed as needed
      const maxOffset = this.contentNode.scrollWidth / 2;
      
      if (this.marqueeOffset >= maxOffset) {
        this.marqueeOffset = 0;
      }
      
      this.contentNode.style.transform = `translateX(-${this.marqueeOffset}px)`;
      this.animationId = requestAnimationFrame(animate);
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  show() {
    if (this.container) {
      this.container.classList.add('ticker--active');
      this.container.style.opacity = '1';
      this.container.style.visibility = 'visible';
    }
  }

  hide() {
    if (this.container) {
      this.container.classList.remove('ticker--active');
      this.container.style.opacity = '0';
      this.container.style.visibility = 'hidden';
    }
    this.stopAnimation();
  }

  pause() {
    this.stopAnimation();
  }

  resume() {
    if (this.isActive && this.messages.length > 0) {
      this.startAnimation();
    }
  }

  // Add test messages for development
  addTestMessages() {
    const testMessages = [
      { type: 'breaking', text: 'Breaking: Modular architecture implemented successfully!' },
      { type: 'normal', text: 'System stability improved with component separation' },
      { type: 'update', text: 'Enhanced ticker performance with optimized animations' }
    ];
    
    this.stateManager.updateState('ticker', {
      messages: testMessages,
      isActive: true
    });
  }

  // Debug information
  getDebugInfo() {
    return {
      isActive: this.isActive,
      messageCount: this.messages.length,
      currentOffset: this.marqueeOffset,
      hasContentNode: !!this.contentNode,
      animationRunning: !!this.animationId
    };
  }

  // Cleanup
  destroy() {
    this.stopAnimation();
    this.stateManager = null;
    this.container = null;
    this.contentNode = null;
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModularTickerComponent;
} else {
  window.ModularTickerComponent = ModularTickerComponent;
}