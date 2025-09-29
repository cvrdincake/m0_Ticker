/**
 * Modular Theme Engine
 * Extracted theme management for better maintainability and extensibility
 */

class ModularThemeEngine {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.currentTheme = null;
    this.themes = new Map();
    this.animations = new Map();
    this.customProperties = new Map();
    
    this.init();
  }

  init() {
    this.registerBuiltInThemes();
    this.registerBuiltInAnimations();
    this.subscribeToState();
    this.loadSavedTheme();
  }

  subscribeToState() {
    this.stateManager.subscribe('overlay', (state) => {
      if (state.theme && state.theme !== this.currentTheme?.name) {
        this.applyTheme(state.theme);
      }

      // Handle other overlay properties that affect theming
      this.updateThemeProperties({
        accent: state.accent,
        accentSecondary: state.accentSecondary,
        scale: state.scale
      });
    });
  }

  registerBuiltInThemes() {
    // Midnight Glass Theme
    this.registerTheme('midnight-glass', {
      name: 'midnight-glass',
      displayName: 'Midnight Glass',
      category: 'dark',
      variables: {
        '--background-primary': 'rgba(15, 23, 42, 0.95)',
        '--background-secondary': 'rgba(30, 41, 59, 0.8)',
        '--text-primary': '#f8fafc',
        '--text-secondary': '#cbd5e1',
        '--accent-primary': '#00ff88',
        '--accent-secondary': '#ff0080',
        '--border-color': 'rgba(100, 116, 139, 0.3)',
        '--shadow-color': 'rgba(0, 0, 0, 0.5)',
        '--glow-color': 'rgba(0, 255, 136, 0.3)'
      },
      animations: ['glow-pulse', 'glass-sweep'],
      effects: ['backdrop-blur', 'particle-system']
    });

    // Cyberpunk Neon Theme
    this.registerTheme('cyberpunk-neon', {
      name: 'cyberpunk-neon',
      displayName: 'Cyberpunk Neon',
      category: 'dark',
      variables: {
        '--background-primary': 'rgba(10, 10, 23, 0.95)',
        '--background-secondary': 'rgba(30, 20, 60, 0.8)',
        '--text-primary': '#00ffff',
        '--text-secondary': '#ff00ff',
        '--accent-primary': '#ff0080',
        '--accent-secondary': '#00ff88',
        '--border-color': 'rgba(255, 0, 128, 0.5)',
        '--shadow-color': 'rgba(255, 0, 128, 0.3)',
        '--glow-color': 'rgba(255, 0, 128, 0.6)'
      },
      animations: ['neon-flicker', 'cyber-pulse'],
      effects: ['scanlines', 'chromatic-aberration']
    });

    // Minimal Dark Theme
    this.registerTheme('minimal-dark', {
      name: 'minimal-dark',
      displayName: 'Minimal Dark',
      category: 'dark',
      variables: {
        '--background-primary': 'rgba(17, 24, 39, 0.95)',
        '--background-secondary': 'rgba(31, 41, 55, 0.8)',
        '--text-primary': '#f9fafb',
        '--text-secondary': '#d1d5db',
        '--accent-primary': '#3b82f6',
        '--accent-secondary': '#8b5cf6',
        '--border-color': 'rgba(75, 85, 99, 0.3)',
        '--shadow-color': 'rgba(0, 0, 0, 0.3)',
        '--glow-color': 'rgba(59, 130, 246, 0.2)'
      },
      animations: ['fade-smooth'],
      effects: ['minimal-shadow']
    });
  }

  registerBuiltInAnimations() {
    // Glow Pulse Animation
    this.registerAnimation('glow-pulse', {
      keyframes: `
        @keyframes glow-pulse {
          0%, 100% { 
            text-shadow: 0 0 20px var(--glow-color);
            filter: brightness(1);
          }
          50% { 
            text-shadow: 0 0 30px var(--glow-color), 0 0 40px var(--accent-primary);
            filter: brightness(1.2);
          }
        }
      `,
      usage: '.glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }'
    });

    // Glass Sweep Animation
    this.registerAnimation('glass-sweep', {
      keyframes: `
        @keyframes glass-sweep {
          0%, 100% { 
            background-position: -200% 50%;
            filter: brightness(1);
          }
          50% { 
            background-position: 200% 50%;
            filter: brightness(1.1);
          }
        }
      `,
      usage: '.glass-sweep { animation: glass-sweep 4s ease-in-out infinite; }'
    });

    // Neon Flicker Animation
    this.registerAnimation('neon-flicker', {
      keyframes: `
        @keyframes neon-flicker {
          0%, 100% { opacity: 1; }
          2% { opacity: 0.8; }
          4% { opacity: 1; }
          8% { opacity: 0.9; }
          10% { opacity: 1; }
          12% { opacity: 0.7; }
          14% { opacity: 1; }
        }
      `,
      usage: '.neon-flicker { animation: neon-flicker 3s infinite; }'
    });
  }

  registerTheme(name, theme) {
    this.themes.set(name, {
      ...theme,
      name,
      registeredAt: new Date()
    });
    console.log(`[ThemeEngine] Registered theme: ${name}`);
  }

  registerAnimation(name, animation) {
    this.animations.set(name, {
      ...animation,
      name,
      registeredAt: new Date()
    });
    console.log(`[ThemeEngine] Registered animation: ${name}`);
  }

  applyTheme(themeName) {
    const theme = this.themes.get(themeName);
    if (!theme) {
      console.warn(`[ThemeEngine] Theme not found: ${themeName}`);
      return false;
    }

    // Remove previous theme
    if (this.currentTheme) {
      this.removeTheme(this.currentTheme);
    }

    // Apply new theme variables
    Object.entries(theme.variables).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });

    // Apply theme animations
    this.applyThemeAnimations(theme.animations);

    // Apply theme effects
    this.applyThemeEffects(theme.effects);

    // Update body class for theme-specific styles
    document.body.className = document.body.className
      .replace(/theme--\w+/g, '')
      .trim();
    document.body.classList.add(`theme--${themeName}`);

    this.currentTheme = theme;
    this.saveTheme(themeName);

    console.log(`[ThemeEngine] Applied theme: ${themeName}`);
    return true;
  }

  removeTheme(theme) {
    // Remove theme variables
    Object.keys(theme.variables).forEach(property => {
      document.documentElement.style.removeProperty(property);
    });

    // Remove theme-specific classes
    document.body.classList.remove(`theme--${theme.name}`);
  }

  applyThemeAnimations(animations = []) {
    // Remove existing animation styles
    const existingAnimationStyle = document.getElementById('theme-animations');
    if (existingAnimationStyle) {
      existingAnimationStyle.remove();
    }

    if (!animations.length) return;

    // Create new animation styles
    const style = document.createElement('style');
    style.id = 'theme-animations';
    
    let css = '';
    animations.forEach(animationName => {
      const animation = this.animations.get(animationName);
      if (animation) {
        css += animation.keyframes + '\n' + animation.usage + '\n';
      }
    });

    style.textContent = css;
    document.head.appendChild(style);
  }

  applyThemeEffects(effects = []) {
    // Apply backdrop blur
    if (effects.includes('backdrop-blur')) {
      document.documentElement.style.setProperty('--backdrop-filter', 'blur(10px)');
    }

    // Apply particle system
    if (effects.includes('particle-system')) {
      this.enableParticleSystem();
    } else {
      this.disableParticleSystem();
    }

    // Apply scanlines effect
    if (effects.includes('scanlines')) {
      document.body.classList.add('effect--scanlines');
    } else {
      document.body.classList.remove('effect--scanlines');
    }
  }

  updateThemeProperties(properties) {
    Object.entries(properties).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const cssProperty = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        document.documentElement.style.setProperty(cssProperty, value);
        this.customProperties.set(cssProperty, value);
      }
    });
  }

  enableParticleSystem() {
    if (document.getElementById('particle-container')) return;

    const container = document.createElement('div');
    container.id = 'particle-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      opacity: 0.6;
    `;

    // Create particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'theme-particle';
      particle.style.cssText = `
        position: absolute;
        width: 2px;
        height: 2px;
        background: var(--accent-primary, #00ff88);
        border-radius: 50%;
        animation: particle-float ${4 + Math.random() * 4}s linear infinite;
        animation-delay: ${Math.random() * 4}s;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        box-shadow: 0 0 10px var(--accent-primary, #00ff88);
      `;
      container.appendChild(particle);
    }

    document.body.appendChild(container);
  }

  disableParticleSystem() {
    const container = document.getElementById('particle-container');
    if (container) {
      container.remove();
    }
  }

  getAvailableThemes() {
    return Array.from(this.themes.values()).map(theme => ({
      name: theme.name,
      displayName: theme.displayName,
      category: theme.category
    }));
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  saveTheme(themeName) {
    try {
      localStorage.setItem('ticker-theme', themeName);
    } catch (error) {
      console.warn('[ThemeEngine] Failed to save theme:', error);
    }
  }

  loadSavedTheme() {
    try {
      const saved = localStorage.getItem('ticker-theme');
      if (saved && this.themes.has(saved)) {
        this.applyTheme(saved);
      } else {
        this.applyTheme('midnight-glass'); // Default theme
      }
    } catch (error) {
      console.warn('[ThemeEngine] Failed to load saved theme:', error);
      this.applyTheme('midnight-glass');
    }
  }

  // Create custom theme
  createCustomTheme(name, config) {
    const customTheme = {
      name: `custom-${name}`,
      displayName: config.displayName || name,
      category: 'custom',
      variables: config.variables || {},
      animations: config.animations || [],
      effects: config.effects || []
    };

    this.registerTheme(customTheme.name, customTheme);
    return customTheme.name;
  }

  getDebugInfo() {
    return {
      currentTheme: this.currentTheme?.name,
      availableThemes: this.themes.size,
      registeredAnimations: this.animations.size,
      customProperties: Object.fromEntries(this.customProperties)
    };
  }

  destroy() {
    // Remove all theme styles
    if (this.currentTheme) {
      this.removeTheme(this.currentTheme);
    }

    // Remove animation styles
    const animationStyle = document.getElementById('theme-animations');
    if (animationStyle) {
      animationStyle.remove();
    }

    // Disable effects
    this.disableParticleSystem();

    this.themes.clear();
    this.animations.clear();
    this.customProperties.clear();
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModularThemeEngine;
} else {
  window.ModularThemeEngine = ModularThemeEngine;
}