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
    // Check if HTML structure already exists, if not create it
    let wrapper = this.container.querySelector('.ticker-content');
    let content = this.container.querySelector('.ticker-text') || this.container.querySelector('.ticker-content');
    
    if (!wrapper) {
      // Create structure if it doesn't exist
      this.container.innerHTML = `
        <div class="ticker-wrapper">
          <div class="ticker-content"></div>
        </div>
      `;
      this.wrapper = this.container.querySelector('.ticker-wrapper');
      this.content = this.container.querySelector('.ticker-content');
      this.setupStyles();
    } else {
      // Use existing structure
      this.wrapper = wrapper.parentElement || this.container;
      this.content = content;
    }
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
    console.log('🎬 Ticker updateConfig called with:', config);
    
    if (config.messages) {
      console.log('📝 Setting messages:', config.messages);
      this.messages = config.messages;
    }
    if (config.speed) this.speed = config.speed;
    if (config.color) {
      this.color = config.color;
      this.content.style.color = this.color;
    }
    if (config.isActive !== undefined) {
      console.log('🔄 Setting isActive:', config.isActive);
      this.isActive = config.isActive;
      if (this.isActive) {
        console.log('✅ Adding active class and starting ticker');
        this.container.classList.add('active');
        this.start();
      } else {
        console.log('❌ Removing active class and stopping ticker');
        this.container.classList.remove('active');
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
    const containerWidth = this.container.offsetWidth || window.innerWidth;
    const contentWidth = this.content.scrollWidth || this.content.offsetWidth;
    const duration = (contentWidth + containerWidth) / this.speed;
    
    // Create GSAP animation if available, otherwise use CSS animation
    if (typeof gsap !== 'undefined') {
      this.animation = gsap.fromTo(this.content, 
        { x: '100%' },
        {
          x: `-${contentWidth}px`,
          duration: duration,
          ease: 'none',
          repeat: -1,
          repeatDelay: 0
        }
      );
    } else {
      // Fallback to CSS animation
      this.content.style.animation = `scroll-left ${duration}s linear infinite`;
    }
  }
}
