/**
 * Live Theme Customizer - Real-time theme editing with live preview
 * Features: Color picker, presets, animations, fonts, export/import
 */

class ThemeCustomizer {
  constructor() {
    this.isOpen = false;
    this.currentTheme = this.loadTheme();
    this.presets = this.getThemePresets();
    this.fonts = this.getAvailableFonts();
    
    this.init();
  }

  init() {
    this.createCustomizerUI();
    this.attachEventListeners();
    this.applyCurrentTheme();
    this.createToggleButton();
    
    // Auto-save theme changes
    this.setupAutoSave();
    
    console.log('Theme Customizer initialized');
  }

  // ===== UI CREATION =====
  
  createCustomizerUI() {
    const customizer = document.createElement('div');
    customizer.id = 'themeCustomizer';
    customizer.className = 'theme-customizer';
    
    customizer.innerHTML = `
      <div class="theme-customizer-header">
        <h2 class="theme-customizer-title">
          <i class="ph-palette ph-bold"></i>
          Theme Customizer
        </h2>
        <button class="btn btn-ghost btn-icon-only" id="closeCustomizer">
          <i class="ph-x ph-bold"></i>
        </button>
      </div>
      
      <div class="theme-customizer-body">
        <!-- Preset Themes -->
        <div class="customizer-section">
          <h3 class="customizer-section-title">
            <i class="ph-swatches ph-bold"></i>
            Preset Themes
          </h3>
          <div class="preset-themes" id="presetThemes">
            ${this.renderPresetThemes()}
          </div>
        </div>

        <!-- Color Customization -->
        <div class="customizer-section">
          <h3 class="customizer-section-title">
            <i class="ph-eyedropper ph-bold"></i>
            Colors
          </h3>
          <div class="color-picker-group">
            ${this.renderColorPickers()}
          </div>
        </div>

        <!-- Typography -->
        <div class="customizer-section">
          <h3 class="customizer-section-title">
            <i class="ph-text-aa ph-bold"></i>
            Typography
          </h3>
          <div class="form-group">
            <label class="form-label">Font Family</label>
            <select class="form-select" id="fontFamily">
              ${this.renderFontOptions()}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Font Size Scale</label>
            <input type="range" class="range-input" id="fontScale" 
                   min="0.8" max="1.4" step="0.1" value="1.0">
            <div class="range-value" id="fontScaleValue">1.0x</div>
          </div>
        </div>

        <!-- Animation Controls -->
        <div class="customizer-section">
          <h3 class="customizer-section-title">
            <i class="ph-play ph-bold"></i>
            Animations
          </h3>
          <div class="animation-controls">
            <div class="range-control">
              <div class="range-label">
                <span>Animation Speed</span>
                <span class="range-value" id="animationSpeedValue">1.0x</span>
              </div>
              <input type="range" class="range-input" id="animationSpeed" 
                     min="0.5" max="3.0" step="0.1" value="1.0">
            </div>
            
            <div class="range-control">
              <div class="range-label">
                <span>Transition Duration</span>
                <span class="range-value" id="transitionValue">300ms</span>
              </div>
              <input type="range" class="range-input" id="transitionDuration" 
                     min="100" max="1000" step="50" value="300">
            </div>
            
            <div class="form-group">
              <label class="form-label">Animation Style</label>
              <select class="form-select" id="animationStyle">
                <option value="smooth">Smooth</option>
                <option value="bouncy">Bouncy</option>
                <option value="elastic">Elastic</option>
                <option value="sharp">Sharp</option>
              </select>
            </div>
            
            <div class="form-group">
              <div class="form-checkbox">
                <input type="checkbox" id="particleEffects" class="checkbox">
                <label for="particleEffects" class="checkbox-label">
                  <i class="ph-sparkle ph-bold"></i>
                  Particle Effects
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Layout & Spacing -->
        <div class="customizer-section">
          <h3 class="customizer-section-title">
            <i class="ph-layout ph-bold"></i>
            Layout
          </h3>
          <div class="range-control">
            <div class="range-label">
              <span>Border Radius</span>
              <span class="range-value" id="radiusValue">8px</span>
            </div>
            <input type="range" class="range-input" id="borderRadius" 
                   min="0" max="20" step="1" value="8">
          </div>
          
          <div class="range-control">
            <div class="range-label">
              <span>Shadow Intensity</span>
              <span class="range-value" id="shadowValue">Medium</span>
            </div>
            <input type="range" class="range-input" id="shadowIntensity" 
                   min="0" max="3" step="1" value="1">
          </div>
          
          <div class="form-group">
            <div class="form-checkbox">
              <input type="checkbox" id="glassmorphism" class="checkbox">
              <label for="glassmorphism" class="checkbox-label">
                <i class="ph-cube-transparent ph-bold"></i>
                Glassmorphism Effects
              </label>
            </div>
          </div>
        </div>

        <!-- Export/Import -->
        <div class="customizer-section">
          <h3 class="customizer-section-title">
            <i class="ph-download ph-bold"></i>
            Theme Management
          </h3>
          <div class="flex gap-3">
            <button class="btn btn-secondary btn-sm" id="exportTheme">
              <i class="ph-export ph-bold"></i>
              Export
            </button>
            <button class="btn btn-secondary btn-sm" id="importTheme">
              <i class="ph-upload ph-bold"></i>
              Import
            </button>
            <button class="btn btn-error btn-sm" id="resetTheme">
              <i class="ph-arrow-clockwise ph-bold"></i>
              Reset
            </button>
          </div>
          <input type="file" id="themeFileInput" accept=".json" style="display: none;">
        </div>

        <!-- Live Preview Toggle -->
        <div class="customizer-section">
          <div class="form-checkbox">
            <input type="checkbox" id="livePreview" class="checkbox" checked>
            <label for="livePreview" class="checkbox-label">
              <i class="ph-eye ph-bold"></i>
              Live Preview
            </label>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(customizer);
  }

  createToggleButton() {
    const toggle = document.createElement('button');
    toggle.className = 'customizer-toggle';
    toggle.id = 'customizerToggle';
    toggle.innerHTML = '<i class="ph-palette ph-bold"></i>';
    toggle.title = 'Open Theme Customizer';
    
    document.body.appendChild(toggle);
  }

  // ===== THEME PRESETS =====
  
  getThemePresets() {
    return {
      dark: {
        name: 'Dark Pro',
        description: 'Professional dark theme',
        colors: {
          primary: '#000000',
          secondary: '#121212',
          surface: '#1e1e1e',
          accent: '#3b82f6',
          text: '#ffffff',
          textSecondary: '#a3a3a3',
          success: '#22c55e',
          error: '#ef4444',
          warning: '#f59e0b'
        }
      },
      
      gaming: {
        name: 'Gaming RGB',
        description: 'Vibrant gaming theme',
        colors: {
          primary: '#0d1117',
          secondary: '#161b22',
          surface: '#21262d',
          accent: '#00ff88',
          text: '#ffffff',
          textSecondary: '#7d8590',
          success: '#00ff88',
          error: '#ff0080',
          warning: '#ffaa00'
        }
      },
      
      business: {
        name: 'Business Elite',
        description: 'Corporate professional',
        colors: {
          primary: '#1a1a1a',
          secondary: '#2d2d2d',
          surface: '#404040',
          accent: '#0066cc',
          text: '#ffffff',
          textSecondary: '#b3b3b3',
          success: '#28a745',
          error: '#dc3545',
          warning: '#ffc107'
        }
      },
      
      neon: {
        name: 'Neon City',
        description: 'Cyberpunk vibes',
        colors: {
          primary: '#000011',
          secondary: '#001122',
          surface: '#002244',
          accent: '#00ffff',
          text: '#ffffff',
          textSecondary: '#88aaff',
          success: '#00ff88',
          error: '#ff0088',
          warning: '#ffff00'
        }
      },
      
      sunset: {
        name: 'Sunset Glow',
        description: 'Warm sunset colors',
        colors: {
          primary: '#1a1a2e',
          secondary: '#16213e',
          surface: '#0f3460',
          accent: '#e94560',
          text: '#ffffff',
          textSecondary: '#a8b2d1',
          success: '#27ae60',
          error: '#e74c3c',
          warning: '#f39c12'
        }
      },
      
      forest: {
        name: 'Forest Deep',
        description: 'Nature inspired',
        colors: {
          primary: '#0d1b0d',
          secondary: '#1a331a',
          surface: '#264d26',
          accent: '#66ff66',
          text: '#ffffff',
          textSecondary: '#99cc99',
          success: '#00cc44',
          error: '#cc4400',
          warning: '#ffaa00'
        }
      }
    };
  }

  // ===== FONT OPTIONS =====
  
  getAvailableFonts() {
    return {
      'Inter': 'Inter, sans-serif',
      'Roboto': 'Roboto, sans-serif',
      'Poppins': 'Poppins, sans-serif',
      'JetBrains Mono': 'JetBrains Mono, monospace',
      'Fira Code': 'Fira Code, monospace',
      'Space Grotesk': 'Space Grotesk, sans-serif',
      'IBM Plex Sans': 'IBM Plex Sans, sans-serif',
      'Orbitron': 'Orbitron, monospace',
      'Rajdhani': 'Rajdhani, sans-serif'
    };
  }

  // ===== RENDERING METHODS =====
  
  renderPresetThemes() {
    return Object.entries(this.presets).map(([key, preset]) => `
      <div class="preset-theme" data-theme="${key}">
        <div class="preset-theme-name">${preset.name}</div>
        <div class="preset-theme-preview">
          <div class="preview-color" style="background-color: ${preset.colors.primary}"></div>
          <div class="preview-color" style="background-color: ${preset.colors.secondary}"></div>
          <div class="preview-color" style="background-color: ${preset.colors.surface}"></div>
          <div class="preview-color" style="background-color: ${preset.colors.accent}"></div>
        </div>
        <div class="preset-theme-description">${preset.description}</div>
      </div>
    `).join('');
  }

  renderColorPickers() {
    const colorProperties = [
      { key: 'primary', label: 'Primary Background', var: '--bg-primary' },
      { key: 'secondary', label: 'Secondary Background', var: '--bg-secondary' },
      { key: 'surface', label: 'Surface Color', var: '--surface' },
      { key: 'accent', label: 'Accent Color', var: '--accent-primary' },
      { key: 'text', label: 'Primary Text', var: '--text-primary' },
      { key: 'textSecondary', label: 'Secondary Text', var: '--text-secondary' },
      { key: 'success', label: 'Success Color', var: '--success' },
      { key: 'error', label: 'Error Color', var: '--error' },
      { key: 'warning', label: 'Warning Color', var: '--warning' }
    ];

    return colorProperties.map(prop => `
      <div class="color-picker-item">
        <label class="color-picker-label">${prop.label}</label>
        <input type="color" class="color-picker" 
               data-property="${prop.key}" 
               data-css-var="${prop.var}"
               value="${this.currentTheme.colors[prop.key] || '#000000'}">
      </div>
    `).join('');
  }

  renderFontOptions() {
    return Object.entries(this.fonts).map(([name, family]) => `
      <option value="${family}">${name}</option>
    `).join('');
  }

  // ===== EVENT HANDLERS =====
  
  attachEventListeners() {
    // Toggle customizer
    document.getElementById('customizerToggle').addEventListener('click', () => {
      this.toggle();
    });

    document.getElementById('closeCustomizer').addEventListener('click', () => {
      this.close();
    });

    // Preset theme selection
    document.getElementById('presetThemes').addEventListener('click', (e) => {
      const themeElement = e.target.closest('.preset-theme');
      if (themeElement) {
        const themeKey = themeElement.dataset.theme;
        this.applyPreset(themeKey);
      }
    });

    // Color pickers
    document.querySelectorAll('.color-picker').forEach(picker => {
      picker.addEventListener('input', (e) => {
        const property = e.target.dataset.property;
        const cssVar = e.target.dataset.cssVar;
        const value = e.target.value;
        
        this.updateThemeProperty('colors', property, value);
        
        if (document.getElementById('livePreview').checked) {
          this.applyCSSVariable(cssVar, value);
        }
      });
    });

    // Font controls
    document.getElementById('fontFamily').addEventListener('change', (e) => {
      this.updateThemeProperty('typography', 'fontFamily', e.target.value);
      if (document.getElementById('livePreview').checked) {
        this.applyCSSVariable('--font-sans', e.target.value);
      }
    });

    // Range controls
    this.setupRangeControls();

    // Animation controls
    document.getElementById('animationStyle').addEventListener('change', (e) => {
      this.updateThemeProperty('animations', 'style', e.target.value);
      if (document.getElementById('livePreview').checked) {
        this.applyAnimationStyle(e.target.value);
      }
    });

    // Checkboxes
    document.getElementById('particleEffects').addEventListener('change', (e) => {
      this.updateThemeProperty('effects', 'particles', e.target.checked);
      if (document.getElementById('livePreview').checked) {
        this.toggleParticleEffects(e.target.checked);
      }
    });

    document.getElementById('glassmorphism').addEventListener('change', (e) => {
      this.updateThemeProperty('effects', 'glassmorphism', e.target.checked);
      if (document.getElementById('livePreview').checked) {
        this.toggleGlassmorphism(e.target.checked);
      }
    });

    // Theme management
    document.getElementById('exportTheme').addEventListener('click', () => {
      this.exportTheme();
    });

    document.getElementById('importTheme').addEventListener('click', () => {
      document.getElementById('themeFileInput').click();
    });

    document.getElementById('themeFileInput').addEventListener('change', (e) => {
      this.importTheme(e.target.files[0]);
    });

    document.getElementById('resetTheme').addEventListener('click', () => {
      this.resetTheme();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  setupRangeControls() {
    const ranges = [
      { id: 'fontScale', property: ['typography', 'scale'], cssVar: '--font-scale', suffix: 'x' },
      { id: 'animationSpeed', property: ['animations', 'speed'], cssVar: '--animation-speed', suffix: 'x' },
      { id: 'transitionDuration', property: ['animations', 'duration'], cssVar: '--transition-duration', suffix: 'ms' },
      { id: 'borderRadius', property: ['layout', 'radius'], cssVar: '--radius', suffix: 'px' },
      { id: 'shadowIntensity', property: ['layout', 'shadow'], cssVar: '--shadow-intensity' }
    ];

    ranges.forEach(({ id, property, cssVar, suffix = '' }) => {
      const input = document.getElementById(id);
      const valueDisplay = document.getElementById(id + 'Value');

      input.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        let displayValue = value;
        
        if (id === 'shadowIntensity') {
          const levels = ['None', 'Light', 'Medium', 'Heavy'];
          displayValue = levels[value] || 'Medium';
        } else {
          displayValue = value + suffix;
        }
        
        valueDisplay.textContent = displayValue;
        
        this.updateThemeProperty(property[0], property[1], value);
        
        if (document.getElementById('livePreview').checked) {
          this.applyCSSVariable(cssVar, value + (suffix === 'x' ? '' : suffix));
        }
      });
    });
  }

  // ===== THEME MANAGEMENT =====
  
  loadTheme() {
    const saved = localStorage.getItem('ticker-theme');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved theme:', e);
      }
    }
    
    return this.getDefaultTheme();
  }

  getDefaultTheme() {
    return {
      name: 'Custom',
      colors: {
        primary: '#000000',
        secondary: '#121212',
        surface: '#1e1e1e',
        accent: '#3b82f6',
        text: '#ffffff',
        textSecondary: '#a3a3a3',
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b'
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        scale: 1.0
      },
      animations: {
        speed: 1.0,
        duration: 300,
        style: 'smooth'
      },
      layout: {
        radius: 8,
        shadow: 1
      },
      effects: {
        particles: false,
        glassmorphism: true
      }
    };
  }

  saveTheme() {
    localStorage.setItem('ticker-theme', JSON.stringify(this.currentTheme));
  }

  updateThemeProperty(category, property, value) {
    if (!this.currentTheme[category]) {
      this.currentTheme[category] = {};
    }
    this.currentTheme[category][property] = value;
  }

  // ===== THEME APPLICATION =====
  
  applyCurrentTheme() {
    this.applyTheme(this.currentTheme);
  }

  applyTheme(theme) {
    // Apply colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVarMap = {
        primary: '--bg-primary',
        secondary: '--bg-secondary',
        surface: '--surface',
        accent: '--accent-primary',
        text: '--text-primary',
        textSecondary: '--text-secondary',
        success: '--success',
        error: '--error',
        warning: '--warning'
      };
      
      if (cssVarMap[key]) {
        this.applyCSSVariable(cssVarMap[key], value);
      }
    });

    // Apply typography
    if (theme.typography) {
      if (theme.typography.fontFamily) {
        this.applyCSSVariable('--font-sans', theme.typography.fontFamily);
      }
      if (theme.typography.scale) {
        this.applyCSSVariable('--font-scale', theme.typography.scale);
      }
    }

    // Apply animations
    if (theme.animations) {
      if (theme.animations.speed) {
        this.applyCSSVariable('--animation-speed', theme.animations.speed);
      }
      if (theme.animations.duration) {
        this.applyCSSVariable('--transition-duration', theme.animations.duration + 'ms');
      }
      if (theme.animations.style) {
        this.applyAnimationStyle(theme.animations.style);
      }
    }

    // Apply layout
    if (theme.layout) {
      if (theme.layout.radius) {
        this.applyCSSVariable('--radius', theme.layout.radius + 'px');
      }
      if (theme.layout.shadow !== undefined) {
        this.applyShadowIntensity(theme.layout.shadow);
      }
    }

    // Apply effects
    if (theme.effects) {
      if (theme.effects.particles) {
        this.toggleParticleEffects(theme.effects.particles);
      }
      if (theme.effects.glassmorphism !== undefined) {
        this.toggleGlassmorphism(theme.effects.glassmorphism);
      }
    }

    this.currentTheme = { ...theme };
    this.updateUI();
  }

  applyPreset(presetKey) {
    const preset = this.presets[presetKey];
    if (!preset) return;

    const theme = {
      ...this.getDefaultTheme(),
      name: preset.name,
      colors: { ...preset.colors }
    };

    this.applyTheme(theme);
    this.markActivePreset(presetKey);
    
    this.showToast(`Applied ${preset.name} theme`, 'success');
  }

  applyCSSVariable(variable, value) {
    document.documentElement.style.setProperty(variable, value);
  }

  applyAnimationStyle(style) {
    const root = document.documentElement;
    const styles = {
      smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      bouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
      sharp: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    };
    
    root.style.setProperty('--transition-timing', styles[style] || styles.smooth);
  }

  applyShadowIntensity(level) {
    const shadows = [
      'none',
      '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
      '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
      '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)'
    ];
    
    this.applyCSSVariable('--shadow', shadows[level] || shadows[1]);
  }

  toggleParticleEffects(enabled) {
    if (enabled) {
      this.createParticleSystem();
    } else {
      this.removeParticleSystem();
    }
  }

  toggleGlassmorphism(enabled) {
    document.documentElement.style.setProperty('--backdrop-blur', enabled ? 'blur(20px)' : 'none');
    document.documentElement.style.setProperty('--glass-opacity', enabled ? '0.1' : '0');
  }

  // ===== PARTICLE SYSTEM =====
  
  createParticleSystem() {
    if (document.getElementById('particleContainer')) return;

    const container = document.createElement('div');
    container.id = 'particleContainer';
    container.className = 'particle-container';
    
    // Create particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 3 + 's';
      particle.style.animationDuration = (3 + Math.random() * 2) + 's';
      container.appendChild(particle);
    }
    
    document.body.appendChild(container);
  }

  removeParticleSystem() {
    const container = document.getElementById('particleContainer');
    if (container) {
      container.remove();
    }
  }

  // ===== UI UPDATES =====
  
  updateUI() {
    // Update color pickers
    document.querySelectorAll('.color-picker').forEach(picker => {
      const property = picker.dataset.property;
      if (this.currentTheme.colors[property]) {
        picker.value = this.currentTheme.colors[property];
      }
    });

    // Update other controls
    const fontSelect = document.getElementById('fontFamily');
    if (fontSelect && this.currentTheme.typography?.fontFamily) {
      fontSelect.value = this.currentTheme.typography.fontFamily;
    }

    // Update range inputs
    const ranges = ['fontScale', 'animationSpeed', 'transitionDuration', 'borderRadius', 'shadowIntensity'];
    ranges.forEach(id => {
      const input = document.getElementById(id);
      const valueDisplay = document.getElementById(id + 'Value');
      
      if (input && this.currentTheme[this.getRangeCategory(id)]) {
        const value = this.currentTheme[this.getRangeCategory(id)][this.getRangeProperty(id)];
        if (value !== undefined) {
          input.value = value;
          if (valueDisplay) {
            valueDisplay.textContent = this.formatRangeValue(id, value);
          }
        }
      }
    });
  }

  getRangeCategory(id) {
    const map = {
      fontScale: 'typography',
      animationSpeed: 'animations',
      transitionDuration: 'animations',
      borderRadius: 'layout',
      shadowIntensity: 'layout'
    };
    return map[id];
  }

  getRangeProperty(id) {
    const map = {
      fontScale: 'scale',
      animationSpeed: 'speed',
      transitionDuration: 'duration',
      borderRadius: 'radius',
      shadowIntensity: 'shadow'
    };
    return map[id];
  }

  formatRangeValue(id, value) {
    if (id === 'shadowIntensity') {
      const levels = ['None', 'Light', 'Medium', 'Heavy'];
      return levels[value] || 'Medium';
    } else if (id === 'fontScale' || id === 'animationSpeed') {
      return value + 'x';
    } else if (id === 'transitionDuration') {
      return value + 'ms';
    } else if (id === 'borderRadius') {
      return value + 'px';
    }
    return value;
  }

  markActivePreset(presetKey) {
    document.querySelectorAll('.preset-theme').forEach(el => {
      el.classList.remove('active');
    });
    
    const activePreset = document.querySelector(`.preset-theme[data-theme="${presetKey}"]`);
    if (activePreset) {
      activePreset.classList.add('active');
    }
  }

  // ===== IMPORT/EXPORT =====
  
  exportTheme() {
    const themeData = {
      ...this.currentTheme,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(themeData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticker-theme-${this.currentTheme.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast('Theme exported successfully', 'success');
  }

  async importTheme(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const themeData = JSON.parse(text);
      
      // Validate theme structure
      if (!this.validateTheme(themeData)) {
        throw new Error('Invalid theme file format');
      }

      this.applyTheme(themeData);
      this.showToast('Theme imported successfully', 'success');
      
    } catch (error) {
      console.error('Failed to import theme:', error);
      this.showToast('Failed to import theme: ' + error.message, 'error');
    }
  }

  validateTheme(theme) {
    return theme && 
           typeof theme === 'object' &&
           theme.colors &&
           typeof theme.colors === 'object';
  }

  resetTheme() {
    if (confirm('Reset to default theme? This will lose all customizations.')) {
      const defaultTheme = this.getDefaultTheme();
      this.applyTheme(defaultTheme);
      this.showToast('Theme reset to default', 'success');
    }
  }

  // ===== AUTO-SAVE =====
  
  setupAutoSave() {
    let saveTimeout;
    
    const autoSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        this.saveTheme();
      }, 1000);
    };

    // Save on any change
    const observer = new MutationObserver(autoSave);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });
  }

  // ===== UTILITY METHODS =====
  
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    document.getElementById('themeCustomizer').classList.add('open');
    this.isOpen = true;
    
    // Add keyboard listener for escape
    this.escapeListener = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escapeListener);
  }

  close() {
    document.getElementById('themeCustomizer').classList.remove('open');
    this.isOpen = false;
    
    if (this.escapeListener) {
      document.removeEventListener('keydown', this.escapeListener);
    }
  }

  showToast(message, type = 'info') {
    // Use existing toast system if available
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      console.log(`[Theme Customizer] ${message}`);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.themeCustomizer = new ThemeCustomizer();
  });
} else {
  window.themeCustomizer = new ThemeCustomizer();
}