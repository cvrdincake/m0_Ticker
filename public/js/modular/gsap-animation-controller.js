/**
 * GSAP Animation Controller for Widget Text Materialization
 * Handles sophisticated text and panel animations using GSAP
 */

class GSAPAnimationController {
  constructor() {
    this.timelines = new Map();
    this.isGSAPReady = false;
    this.animationQueue = [];
    
    this.init();
  }

  init() {
    // Wait for GSAP to be ready
    if (typeof gsap !== 'undefined' && typeof SplitText !== 'undefined') {
      this.isGSAPReady = true;
      this.setupGSAPDefaults();
      this.processQueue();
    } else {
      // Retry after a short delay
      setTimeout(() => this.init(), 100);
    }
  }

  setupGSAPDefaults() {
    // Set GSAP defaults for smooth animations
    gsap.defaults({
      duration: 0.8,
      ease: "power2.out"
    });

    // Register custom eases
    gsap.registerEase("materialEase", "power2.inOut");
    gsap.registerEase("elasticOut", "elastic.out(1, 0.75)");
    gsap.registerEase("backOut", "back.out(1.7)");

    console.log('[GSAP] Animation controller initialized');
  }

  processQueue() {
    // Process any queued animations
    while (this.animationQueue.length > 0) {
      const animation = this.animationQueue.shift();
      animation();
    }
  }

  queueAnimation(animationFn) {
    if (this.isGSAPReady) {
      animationFn();
    } else {
      this.animationQueue.push(animationFn);
    }
  }

  /**
   * Animate text materialization with panel scaling
   * @param {Element} container - The widget container
   * @param {string} text - Text to animate
   * @param {Object} options - Animation options
   */
  animateTextMaterialization(container, text, options = {}) {
    const config = {
      duration: 1.2,
      stagger: 0.03,
      panelScale: true,
      typewriter: false,
      scramble: false,
      elastic: false,
      glow: true,
      ...options
    };

    this.queueAnimation(() => {
      this._executeTextMaterialization(container, text, config);
    });
  }

  _executeTextMaterialization(container, text, config) {
    if (!container) return;

    // Create timeline for coordinated animations
    const tl = gsap.timeline({
      onComplete: () => {
        console.log('[GSAP] Text materialization complete');
        if (config.onComplete) config.onComplete();
      }
    });

    // Find or create text element
    let textElement = container.querySelector('.animated-text') || 
                     container.querySelector('.popup-text') ||
                     container.querySelector('.brb-text') ||
                     container.querySelector('.slate-content');

    if (!textElement) {
      textElement = document.createElement('div');
      textElement.className = 'animated-text';
      container.appendChild(textElement);
    }

    // Set initial text and styles
    textElement.innerHTML = text;
    
    // Initial state: container scaled down, text invisible
    gsap.set(container, {
      scaleX: 0.3,
      scaleY: 0.8,
      opacity: 0,
      transformOrigin: "center left"
    });

    // Phase 1: Panel scale in
    if (config.panelScale) {
      tl.to(container, {
        duration: 0.6,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        ease: "back.out(1.7)",
        transformOrigin: "center left"
      });
    }

    // Phase 2: Text materialization
    if (config.typewriter) {
      this._addTypewriterEffect(tl, textElement, text, config);
    } else if (config.scramble) {
      this._addScrambleEffect(tl, textElement, text, config);
    } else {
      this._addCharacterReveal(tl, textElement, config);
    }

    // Phase 3: Sophisticated panel width adjustment
    if (config.panelScale) {
      // Measure the final text width
      const finalWidth = this._measureTextWidth(textElement, text);
      const startWidth = parseInt(getComputedStyle(container).width) || 50;
      
      console.log(`[GSAP] Panel scaling from ${startWidth}px to ${finalWidth}px`);
      
      tl.to(container, {
        duration: 0.6,
        width: `${finalWidth + 40}px`, // Add padding
        ease: "elastic.out(1, 0.8)",
        onStart: () => {
          container.style.overflow = 'hidden';
          container.classList.add('widget-container--scaling');
        },
        onComplete: () => {
          container.style.width = 'auto';
          container.style.minWidth = 'max-content';
          container.classList.remove('widget-container--scaling');
        }
      }, "-=0.4");
    }

    // Phase 4: Glow effect
    if (config.glow) {
      tl.to(textElement, {
        duration: 0.5,
        textShadow: "0 0 20px var(--accent-primary), 0 0 30px var(--accent-primary)",
        ease: "power2.inOut",
        yoyo: true,
        repeat: 1
      }, "-=0.2");
    }

    // Store timeline for potential cleanup
    this.timelines.set(container, tl);

    return tl;
  }

  _addCharacterReveal(timeline, textElement, config) {
    // Split text into characters
    const splitText = new SplitText(textElement, {
      type: "chars",
      charsClass: "char-reveal"
    });

    // Set initial state for characters
    gsap.set(splitText.chars, {
      opacity: 0,
      y: 30,
      rotationX: -90,
      transformOrigin: "50% 50% -50px"
    });

    // Animate characters in sequence
    timeline.to(splitText.chars, {
      duration: 0.8,
      opacity: 1,
      y: 0,
      rotationX: 0,
      ease: "back.out(1.7)",
      stagger: {
        amount: config.stagger * splitText.chars.length,
        from: "start"
      }
    }, "-=0.3");

    return splitText;
  }

  _addTypewriterEffect(timeline, textElement, text, config) {
    // Clear text initially
    textElement.innerHTML = '';
    
    // Add cursor
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    cursor.innerHTML = '|';
    cursor.style.animation = 'blink 1s infinite';
    textElement.appendChild(cursor);

    // Type characters one by one
    timeline.to({}, {
      duration: config.duration * 0.7,
      ease: "none",
      onUpdate: function() {
        const progress = this.progress();
        const currentLength = Math.floor(progress * text.length);
        const currentText = text.substring(0, currentLength);
        
        textElement.innerHTML = currentText + '<span class="typewriter-cursor">|</span>';
      },
      onComplete: () => {
        // Remove cursor after typing
        const cursor = textElement.querySelector('.typewriter-cursor');
        if (cursor) {
          gsap.to(cursor, {
            duration: 0.3,
            opacity: 0,
            onComplete: () => cursor.remove()
          });
        }
      }
    });
  }

  _addScrambleEffect(timeline, textElement, text, config) {
    // Use GSAP ScrambleText plugin
    timeline.to(textElement, {
      duration: config.duration * 0.8,
      scrambleText: {
        text: text,
        chars: "XO01",
        revealDelay: 0.5,
        speed: 0.3,
        newClass: "scrambled-char"
      },
      ease: "none"
    });
  }

  /**
   * Animate popup appearance with sophisticated effects
   */
  animatePopupAppearance(popupContainer, text, options = {}) {
    const config = {
      effect: 'scale', // 'scale', 'slide', 'elastic'
      typewriter: true,
      glow: true,
      duration: 1.5,
      ...options
    };

    this.animateTextMaterialization(popupContainer, text, {
      ...config,
      panelScale: true,
      onComplete: () => {
        // Add subtle floating animation
        this._addFloatingAnimation(popupContainer);
      }
    });
  }

  /**
   * Animate BRB overlay with dramatic effect
   */
  animateBRBAppearance(brbContainer, text, options = {}) {
    const config = {
      effect: 'dramatic',
      scramble: true,
      elastic: true,
      glow: true,
      duration: 2.0,
      ...options
    };

    // Full-screen dramatic entrance
    this.queueAnimation(() => {
      const tl = gsap.timeline();

      // Initial state
      gsap.set(brbContainer, {
        scale: 0,
        rotation: -10,
        opacity: 0
      });

      // Dramatic entrance
      tl.to(brbContainer, {
        duration: 1.0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        ease: "elastic.out(1, 0.75)"
      });

      // Text materialization
      this.animateTextMaterialization(brbContainer, text, {
        ...config,
        panelScale: false
      });

      // Add screen shake effect
      tl.to('body', {
        duration: 0.1,
        x: '+=5',
        yoyo: true,
        repeat: 3,
        ease: "power2.inOut"
      }, "-=0.5");
    });
  }

  /**
   * Animate slate/top-right widget appearance
   */
  animateSlateAppearance(slateContainer, text, options = {}) {
    const config = {
      effect: 'slide-left',
      typewriter: false,
      panelScale: true,
      duration: 1.0,
      ...options
    };

    this.queueAnimation(() => {
      const tl = gsap.timeline();

      // Slide in from right
      gsap.set(slateContainer, {
        x: 100,
        opacity: 0,
        scale: 0.8
      });

      tl.to(slateContainer, {
        duration: 0.8,
        x: 0,
        opacity: 1,
        scale: 1,
        ease: "back.out(1.7)"
      });

      // Text materialization
      this.animateTextMaterialization(slateContainer, text, config);
    });
  }

  _addFloatingAnimation(element) {
    // Subtle floating effect
    gsap.to(element, {
      duration: 3,
      y: "+=10",
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * Animate ticker messages with staggered reveal
   */
  animateTickerMessages(tickerContainer, messages, options = {}) {
    const config = {
      stagger: 0.1,
      wave: true,
      glow: true,
      ...options
    };

    this.queueAnimation(() => {
      const tl = gsap.timeline();

      // Find message elements
      const messageElements = tickerContainer.querySelectorAll('.ticker-message');
      
      if (messageElements.length === 0) return;

      // Initial state
      gsap.set(messageElements, {
        opacity: 0,
        y: 20,
        scale: 0.8
      });

      // Staggered reveal
      tl.to(messageElements, {
        duration: 0.6,
        opacity: 1,
        y: 0,
        scale: 1,
        ease: "back.out(1.7)",
        stagger: config.stagger
      });

      // Wave effect if requested
      if (config.wave) {
        tl.to(messageElements, {
          duration: 0.4,
          y: "-=5",
          ease: "sine.inOut",
          stagger: 0.05,
          yoyo: true,
          repeat: 1
        }, "-=0.3");
      }
    });
  }

  /**
   * Clean up animations for a container
   */
  cleanup(container) {
    const timeline = this.timelines.get(container);
    if (timeline) {
      timeline.kill();
      this.timelines.delete(container);
    }

    // Revert any SplitText
    const splitElements = container.querySelectorAll('[data-splitting]');
    splitElements.forEach(el => {
      if (el.splitText) {
        el.splitText.revert();
      }
    });
  }

  /**
   * Measure the final width of text content
   * @param {HTMLElement} element - The text element
   * @param {string} text - The text content to measure
   * @returns {number} Width in pixels
   */
  _measureTextWidth(element, text) {
    try {
      // Create a temporary element with the same styling
      const temp = document.createElement('span');
      temp.style.visibility = 'hidden';
      temp.style.position = 'absolute';
      temp.style.top = '-9999px';
      temp.style.whiteSpace = 'nowrap';
      
      // Copy computed styles from the original element
      const computedStyle = getComputedStyle(element);
      temp.style.font = computedStyle.font;
      temp.style.fontSize = computedStyle.fontSize;
      temp.style.fontFamily = computedStyle.fontFamily;
      temp.style.fontWeight = computedStyle.fontWeight;
      temp.style.letterSpacing = computedStyle.letterSpacing;
      
      temp.textContent = text;
      document.body.appendChild(temp);
      
      const width = temp.offsetWidth;
      document.body.removeChild(temp);
      
      return width;
    } catch (error) {
      console.warn('[GSAP] Text measurement failed, using fallback', error);
      return text.length * 12; // Fallback estimate
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      isGSAPReady: this.isGSAPReady,
      activeTimelines: this.timelines.size,
      queuedAnimations: this.animationQueue.length,
      gsapVersion: typeof gsap !== 'undefined' ? gsap.version : 'Not loaded'
    };
  }

  /**
   * Destroy the controller
   */
  destroy() {
    // Kill all timelines
    this.timelines.forEach(timeline => timeline.kill());
    this.timelines.clear();
    this.animationQueue = [];
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GSAPAnimationController;
} else {
  window.GSAPAnimationController = GSAPAnimationController;
}