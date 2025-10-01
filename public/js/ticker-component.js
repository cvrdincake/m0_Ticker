class TickerComponent {
  constructor(container) {
    this.container = container;
    this.messages = [];
    this.isActive = false;
    this.speed = 100;
    this.color = '#ffffff';
    this.animation = null;
    
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="ticker-wrapper">
        <div class="ticker-content"></div>
      </div>
    `;
    
    this.wrapper = this.container.querySelector('.ticker-wrapper');
    this.content = this.container.querySelector('.ticker-content');
    
    this.setupStyles();
  }

  setupStyles() {
    this.wrapper.style.cssText = `
      position: relative;
      width: 100%;
      height: 60px;
      overflow: hidden;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 8px;
      display: flex;
      align-items: center;
    `;
    
    this.content.style.cssText = `
      position: absolute;
      white-space: nowrap;
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 1.1rem;
      color: ${this.color};
      transform: translateX(100%);
    `;
  }

  updateConfig(config) {
    if (config.messages) this.messages = config.messages;
    if (config.speed) this.speed = config.speed;
    if (config.color) {
      this.color = config.color;
      this.content.style.color = this.color;
    }
    if (config.isActive !== undefined) {
      this.isActive = config.isActive;
      if (this.isActive) {
        this.start();
      } else {
        this.stop();
      }
    }
  }

  start() {
    if (!this.isActive || this.messages.length === 0) return;
    
    this.displayMessages();
  }

  stop() {
    if (this.animation) {
      this.animation.kill();
      this.animation = null;
    }
    gsap.set(this.content, { x: '100%' });
  }

  displayMessages() {
    if (!this.messages.length) return;
    
    const messageText = this.messages.join(' • ');
    this.content.textContent = messageText;
    
    // Calculate animation duration based on speed
    const duration = (this.content.scrollWidth + this.wrapper.offsetWidth) / this.speed;
    
    // Create GSAP animation
    this.animation = gsap.fromTo(this.content, 
      { x: '100%' },
      {
        x: `-${this.content.scrollWidth}px`,
        duration: duration,
        ease: 'none',
        repeat: -1,
        repeatDelay: 0
      }
    );
  }
}
