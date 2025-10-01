/**
 * Theme Widget Component
 * Manages theme customization and controls
 */
class ThemeWidgetComponent {
    constructor(wsClient) {
        this.wsClient = wsClient;
        this.state = {
            accentColor: '#00ff88',
            backgroundOpacity: 80
        };
        
        this.elements = {
            themeWidget: document.getElementById('themeWidget'),
            themeForm: document.getElementById('themeForm'),
            accentColor: document.getElementById('accentColor'),
            backgroundOpacity: document.getElementById('backgroundOpacity'),
            backgroundOpacityValue: document.getElementById('backgroundOpacityValue'),
            applyTheme: document.getElementById('applyTheme')
        };
        
        this.init();
    }
    
    init() {
        if (!this.elements.themeWidget) return;
        
        this.bindEvents();
        this.bindWebSocketEvents();
        this.updateUI();
        
        console.log('🎨 Theme Widget Component initialized');
    }
    
    bindEvents() {
        // Accent color picker
        if (this.elements.accentColor) {
            this.elements.accentColor.addEventListener('change', (e) => {
                this.state.accentColor = e.target.value;
                this.previewTheme();
            });
            
            this.elements.accentColor.addEventListener('input', (e) => {
                this.state.accentColor = e.target.value;
                this.previewTheme();
            });
        }
        
        // Background opacity slider
        if (this.elements.backgroundOpacity) {
            this.elements.backgroundOpacity.addEventListener('input', (e) => {
                const opacity = parseInt(e.target.value);
                this.state.backgroundOpacity = opacity;
                if (this.elements.backgroundOpacityValue) {
                    this.elements.backgroundOpacityValue.textContent = `${opacity}%`;
                }
                this.previewTheme();
            });
        }
        
        // Apply theme button
        if (this.elements.applyTheme) {
            this.elements.applyTheme.addEventListener('click', () => {
                this.applyTheme();
            });
        }
        
        // Form submission
        if (this.elements.themeForm) {
            this.elements.themeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.applyTheme();
            });
        }
    }
    
    bindWebSocketEvents() {
        this.wsClient.on('theme_change', (data) => {
            this.updateState(data);
        });
        
        this.wsClient.on('state_update', (data) => {
            if (data.theme) {
                this.updateState(data.theme);
            }
        });
    }
    
    applyTheme() {
        const themeData = {
            accentColor: this.state.accentColor,
            backgroundOpacity: this.state.backgroundOpacity
        };
        
        this.wsClient.send('theme_change', themeData);
        this.applyLocalTheme(themeData);
        
        console.log('🎨 Applying theme:', themeData);
        this.showSuccess('Theme applied successfully!');
    }
    
    previewTheme() {
        // Apply theme preview locally without sending to server
        this.applyLocalTheme({
            accentColor: this.state.accentColor,
            backgroundOpacity: this.state.backgroundOpacity
        });
    }
    
    applyLocalTheme(theme) {
        // Update CSS custom properties for live preview
        const root = document.documentElement;
        
        if (theme.accentColor) {
            root.style.setProperty('--accent-color', theme.accentColor);
            root.style.setProperty('--accent-color-rgb', this.hexToRgb(theme.accentColor));
        }
        
        if (theme.backgroundOpacity !== undefined) {
            root.style.setProperty('--bg-opacity', theme.backgroundOpacity / 100);
        }
    }
    
    updateState(newState) {
        this.state = { ...this.state, ...newState };
        this.updateUI();
        this.applyLocalTheme(this.state);
    }
    
    updateUI() {
        // Update form fields
        if (this.elements.accentColor) {
            this.elements.accentColor.value = this.state.accentColor;
        }
        
        if (this.elements.backgroundOpacity) {
            this.elements.backgroundOpacity.value = this.state.backgroundOpacity;
        }
        
        if (this.elements.backgroundOpacityValue) {
            this.elements.backgroundOpacityValue.textContent = `${this.state.backgroundOpacity}%`;
        }
    }
    
    hexToRgb(hex) {
        // Convert hex color to RGB values for CSS rgba usage
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
            '0, 255, 136'; // Default green RGB
    }
    
    showSuccess(message) {
        console.log('Theme Success:', message);
        // Could show a toast notification here
        
        // Temporary visual feedback
        if (this.elements.applyTheme) {
            const originalText = this.elements.applyTheme.textContent;
            this.elements.applyTheme.textContent = '✅ Applied!';
            this.elements.applyTheme.disabled = true;
            
            setTimeout(() => {
                this.elements.applyTheme.textContent = originalText;
                this.elements.applyTheme.disabled = false;
            }, 2000);
        }
    }
    
    resetToDefaults() {
        const defaultTheme = {
            accentColor: '#00ff88',
            backgroundOpacity: 80
        };
        
        this.updateState(defaultTheme);
        this.applyTheme();
    }
    
    getState() {
        return { ...this.state };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeWidgetComponent;
} else if (typeof window !== 'undefined') {
    window.ThemeWidgetComponent = ThemeWidgetComponent;
}