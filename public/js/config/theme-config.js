/**
 * Theme Configuration
 * Centralized theme and styling configuration
 */

const ThemeConfig = {
    // Base theme definitions
    themes: {
        professional: {
            name: 'Professional',
            description: 'Clean, modern design for professional broadcasting',
            colors: {
                primary: '#00ff88',
                primaryRgb: '0, 255, 136',
                background: '#0a0a0a',
                backgroundRgb: '10, 10, 10',
                surface: '#1a1a1a',
                surfaceRgb: '26, 26, 26',
                text: '#ffffff',
                textRgb: '255, 255, 255',
                textSecondary: '#a0a0a0',
                textSecondaryRgb: '160, 160, 160',
                border: '#333333',
                borderRgb: '51, 51, 51',
                success: '#00ff88',
                warning: '#ffaa00',
                error: '#ff4444',
                info: '#00aaff'
            },
            glass: {
                blur: '12px',
                opacity: 0.1,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdrop: 'blur(12px) saturate(180%)'
            },
            shadows: {
                small: '0 2px 8px rgba(0, 0, 0, 0.3)',
                medium: '0 4px 16px rgba(0, 0, 0, 0.4)',
                large: '0 8px 32px rgba(0, 0, 0, 0.5)',
                accent: '0 0 20px rgba(0, 255, 136, 0.3)'
            },
            typography: {
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSizes: {
                    xs: '0.75rem',
                    sm: '0.875rem',
                    base: '1rem',
                    lg: '1.125rem',
                    xl: '1.25rem',
                    '2xl': '1.5rem',
                    '3xl': '1.875rem'
                },
                fontWeights: {
                    light: '300',
                    normal: '400',
                    medium: '500',
                    semibold: '600',
                    bold: '700'
                }
            }
        },
        
        minimal: {
            name: 'Minimal',
            description: 'Clean, distraction-free interface',
            colors: {
                primary: '#ffffff',
                primaryRgb: '255, 255, 255',
                background: '#000000',
                backgroundRgb: '0, 0, 0',
                surface: '#111111',
                surfaceRgb: '17, 17, 17',
                text: '#ffffff',
                textRgb: '255, 255, 255',
                textSecondary: '#888888',
                textSecondaryRgb: '136, 136, 136',
                border: '#222222',
                borderRgb: '34, 34, 34',
                success: '#22c55e',
                warning: '#f59e0b',
                error: '#ef4444',
                info: '#3b82f6'
            },
            glass: {
                blur: '8px',
                opacity: 0.05,
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdrop: 'blur(8px)'
            },
            shadows: {
                small: '0 1px 4px rgba(0, 0, 0, 0.5)',
                medium: '0 2px 8px rgba(0, 0, 0, 0.6)',
                large: '0 4px 16px rgba(0, 0, 0, 0.7)',
                accent: '0 0 10px rgba(255, 255, 255, 0.2)'
            },
            typography: {
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSizes: {
                    xs: '0.75rem',
                    sm: '0.875rem',
                    base: '1rem',
                    lg: '1.125rem',
                    xl: '1.25rem',
                    '2xl': '1.5rem',
                    '3xl': '1.875rem'
                },
                fontWeights: {
                    light: '300',
                    normal: '400',
                    medium: '500',
                    semibold: '600',
                    bold: '700'
                }
            }
        },
        
        gaming: {
            name: 'Gaming',
            description: 'High-energy design for gaming streams',
            colors: {
                primary: '#ff6b35',
                primaryRgb: '255, 107, 53',
                background: '#0f0f23',
                backgroundRgb: '15, 15, 35',
                surface: '#1a1a3a',
                surfaceRgb: '26, 26, 58',
                text: '#ffffff',
                textRgb: '255, 255, 255',
                textSecondary: '#a0a0ff',
                textSecondaryRgb: '160, 160, 255',
                border: '#404080',
                borderRgb: '64, 64, 128',
                success: '#00ff41',
                warning: '#ffa500',
                error: '#ff1744',
                info: '#2196f3'
            },
            glass: {
                blur: '16px',
                opacity: 0.15,
                border: '1px solid rgba(255, 107, 53, 0.2)',
                backdrop: 'blur(16px) saturate(200%)'
            },
            shadows: {
                small: '0 2px 8px rgba(255, 107, 53, 0.2)',
                medium: '0 4px 16px rgba(255, 107, 53, 0.3)',
                large: '0 8px 32px rgba(255, 107, 53, 0.4)',
                accent: '0 0 30px rgba(255, 107, 53, 0.5)'
            },
            typography: {
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSizes: {
                    xs: '0.75rem',
                    sm: '0.875rem',
                    base: '1rem',
                    lg: '1.125rem',
                    xl: '1.25rem',
                    '2xl': '1.5rem',
                    '3xl': '1.875rem'
                },
                fontWeights: {
                    light: '300',
                    normal: '400',
                    medium: '500',
                    semibold: '600',
                    bold: '700'
                }
            }
        }
    },
    
    // Current theme state
    current: {
        name: 'professional',
        customizations: {
            accentColor: '#00ff88',
            backgroundOpacity: 80,
            blurIntensity: 12,
            animationSpeed: 300
        }
    },
    
    // Animation presets
    animations: {
        transitions: {
            fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
            normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
            slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
            bounce: '400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        },
        
        keyframes: {
            fadeIn: {
                from: { opacity: 0 },
                to: { opacity: 1 }
            },
            fadeOut: {
                from: { opacity: 1 },
                to: { opacity: 0 }
            },
            slideInUp: {
                from: { transform: 'translateY(20px)', opacity: 0 },
                to: { transform: 'translateY(0)', opacity: 1 }
            },
            slideOutDown: {
                from: { transform: 'translateY(0)', opacity: 1 },
                to: { transform: 'translateY(20px)', opacity: 0 }
            },
            scaleIn: {
                from: { transform: 'scale(0.9)', opacity: 0 },
                to: { transform: 'scale(1)', opacity: 1 }
            },
            scaleOut: {
                from: { transform: 'scale(1)', opacity: 1 },
                to: { transform: 'scale(0.9)', opacity: 0 }
            },
            pulse: {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 }
            },
            spin: {
                from: { transform: 'rotate(0deg)' },
                to: { transform: 'rotate(360deg)' }
            }
        }
    },
    
    // Component-specific styling
    components: {
        dashboard: {
            maxWidth: '1200px',
            padding: '20px',
            gap: '20px'
        },
        
        widget: {
            borderRadius: '12px',
            padding: '20px',
            minHeight: '200px'
        },
        
        button: {
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '500'
        },
        
        input: {
            borderRadius: '6px',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid'
        },
        
        ticker: {
            height: '60px',
            borderRadius: '8px',
            padding: '0 20px'
        },
        
        popup: {
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '500px'
        },
        
        brb: {
            borderRadius: '0',
            padding: '60px'
        }
    },
    
    // Responsive breakpoints
    breakpoints: {
        mobile: '768px',
        tablet: '1024px',
        desktop: '1440px'
    },
    
    // Utility functions
    utils: {
        /**
         * Get theme colors with customizations applied
         */
        getColors(themeName = null, customizations = null) {
            const theme = themeName ? this.themes[themeName] : this.themes[this.current.name];
            const custom = customizations || this.current.customizations;
            
            if (!theme) return this.themes.professional.colors;
            
            const colors = { ...theme.colors };
            
            // Apply accent color customization
            if (custom.accentColor) {
                colors.primary = custom.accentColor;
                colors.primaryRgb = this.hexToRgb(custom.accentColor);
            }
            
            return colors;
        },
        
        /**
         * Convert hex color to RGB string
         */
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? 
                `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
                '0, 0, 0';
        },
        
        /**
         * Generate CSS custom properties for a theme
         */
        generateCSSProperties(themeName = null, customizations = null) {
            const theme = themeName ? this.themes[themeName] : this.themes[this.current.name];
            const custom = customizations || this.current.customizations;
            const colors = this.getColors(themeName, customizations);
            
            const properties = {};
            
            // Color properties
            Object.entries(colors).forEach(([key, value]) => {
                properties[`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value;
            });
            
            // Glass properties
            properties['--glass-blur'] = theme.glass.blur;
            properties['--glass-opacity'] = theme.glass.opacity;
            properties['--glass-border'] = theme.glass.border;
            properties['--glass-backdrop'] = theme.glass.backdrop;
            
            // Custom properties
            if (custom.backgroundOpacity !== undefined) {
                properties['--bg-opacity'] = custom.backgroundOpacity / 100;
            }
            
            if (custom.blurIntensity !== undefined) {
                properties['--blur-intensity'] = `${custom.blurIntensity}px`;
            }
            
            return properties;
        }
    }
};

// Bind utils to config object
Object.keys(ThemeConfig.utils).forEach(key => {
    ThemeConfig.utils[key] = ThemeConfig.utils[key].bind(ThemeConfig);
});

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeConfig;
} else if (typeof window !== 'undefined') {
    window.ThemeConfig = ThemeConfig;
}