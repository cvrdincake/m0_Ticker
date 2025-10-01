class PopupComponent {
  constructor(container) {
    this.container = container;
    this.isVisible = false;
    this.title = '';
    this.message = '';
    this.duration = 5000;
    this.hideTimeout = null;
    
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="popup-overlay">
        <div class="popup-content">
          <div class="popup-header">
            <h3 class="popup-title"></h3>
            <button class="popup-close">&times;</button>
          </div>
          <div class="popup-body">
            <p class="popup-message"></p>
          </div>
        </div>
      </div>
    `;
    
    this.overlay = this.container.querySelector('.popup-overlay');
    this.popup = this.container.querySelector('.popup-content');
    this.titleEl = this.container.querySelector('.popup-title');
    this.messageEl = this.container.querySelector('.popup-message');
    this.closeBtn = this.container.querySelector('.popup-close');
    
    this.setupStyles();
    this.setupEvents();
    this.hide();
  }

  setupStyles() {
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
    `;
    
    this.popup.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
      transform: scale(0.8);
      transition: all 0.3s ease;
    `;
    
    this.closeBtn.style.cssText = `
      background: none;
      border: none;
      color: #ffffff;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.3s ease;
    `;
    
    this.titleEl.style.cssText = `
      margin: 0;
      color: #ffffff;
      font-size: 1.25rem;
      font-weight: 600;
    `;
    
    this.messageEl.style.cssText = `
      margin: 0;
      color: #b3b3b3;
      font-size: 1rem;
      line-height: 1.5;
    `;
  }

  setupEvents() {
    this.closeBtn.addEventListener('click', () => this.hide());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
  }

  show(title, message, duration = 5000) {
    this.title = title;
    this.message = message;
    this.duration = duration;
    this.isVisible = true;
    
    this.titleEl.textContent = title;
    this.messageEl.textContent = message;
    
    // Clear existing timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    
    // Show popup by adding active class
    this.container.classList.add('active');
    
    // Auto-hide after duration
    if (duration > 0) {
      this.hideTimeout = setTimeout(() => this.hide(), duration);
    }
  }

  hide() {
    this.isVisible = false;
    
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    
    // Hide popup by removing active class
    this.container.classList.remove('active');
  }

  updateConfig(config) {
    if (config.isVisible && !this.isVisible) {
      this.show(config.title || this.title, config.message || this.message, config.duration || this.duration);
    } else if (!config.isVisible && this.isVisible) {
      this.hide();
    }
  }
}
