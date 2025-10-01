class BRBComponent {
  constructor(container) {
    this.container = container;
    this.isActive = false;
    this.message = 'Be Right Back';
    this.customMessage = '';
    
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="brb-overlay">
        <div class="brb-content">
          <div class="brb-icon">⏸️</div>
          <h2 class="brb-title">Be Right Back</h2>
          <p class="brb-message"></p>
          <div class="brb-animation">
            <div class="pulse-ring"></div>
            <div class="pulse-ring"></div>
            <div class="pulse-ring"></div>
          </div>
        </div>
      </div>
    `;
    
    this.overlay = this.container.querySelector('.brb-overlay');
    this.titleEl = this.container.querySelector('.brb-title');
    this.messageEl = this.container.querySelector('.brb-message');
    this.iconEl = this.container.querySelector('.brb-icon');
    this.rings = this.container.querySelectorAll('.pulse-ring');
    
    this.setupStyles();
    this.hide();
  }

  setupStyles() {
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      opacity: 0;
      visibility: hidden;
    `;
    
    this.container.querySelector('.brb-content').style.cssText = `
      text-align: center;
      color: #ffffff;
      transform: scale(0.8);
    `;
    
    this.iconEl.style.cssText = `
      font-size: 4rem;
      margin-bottom: 1rem;
      display: block;
    `;
    
    this.titleEl.style.cssText = `
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #00ff88, #ffffff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    `;
    
    this.messageEl.style.cssText = `
      font-size: 1.25rem;
      color: #b3b3b3;
      margin-bottom: 2rem;
    `;
    
    // Setup pulse animation styles
    this.container.querySelector('.brb-animation').style.cssText = `
      position: relative;
      width: 100px;
      height: 100px;
      margin: 0 auto;
    `;
    
    this.rings.forEach((ring, index) => {
      ring.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        border: 2px solid #00ff88;
        border-radius: 50%;
        opacity: 0;
      `;
    });
  }

  show() {
    this.isActive = true;
    
    // Update message
    const displayMessage = this.customMessage || this.message;
    this.messageEl.textContent = displayMessage;
    
    // Show BRB by adding active class
    this.container.classList.add('active');
  }

  hide() {
    this.isActive = false;
    
    // Hide BRB by removing active class
    this.container.classList.remove('active');
  }

  startPulseAnimation() {
    this.rings.forEach((ring, index) => {
      gsap.fromTo(ring, 
        {
          scale: 0,
          opacity: 1
        },
        {
          scale: 2,
          opacity: 0,
          duration: 2,
          ease: 'power2.out',
          repeat: -1,
          delay: index * 0.4
        }
      );
    });
  }

  stopPulseAnimation() {
    this.rings.forEach(ring => {
      gsap.killTweensOf(ring);
      gsap.set(ring, { opacity: 0 });
    });
  }

  updateConfig(config) {
    if (config.customMessage !== undefined) {
      this.customMessage = config.customMessage;
    }
    
    if (config.isActive !== undefined) {
      if (config.isActive && !this.isActive) {
        this.show();
      } else if (!config.isActive && this.isActive) {
        this.hide();
      }
    }
  }
}
