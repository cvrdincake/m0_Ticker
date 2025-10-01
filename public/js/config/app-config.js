/**
 * Application Configuration
 * Main configuration file for M0 Ticker application
 */

const AppConfig = {
    // Application metadata
    app: {
        name: 'M0 Ticker',
        version: '2.0.0',
        description: 'Professional Broadcast Widget Management',
        author: 'M0 Productions'
    },
    
    // API configuration
    api: {
        baseUrl: typeof window !== 'undefined' ? 
            `${window.location.protocol}//${window.location.host}` : 
            'http://localhost:3000',
        endpoints: {
            status: '/api/status',
            state: '/api/state',
            health: '/api/health'
        },
        timeout: 10000,
        retries: 3
    },
    
    // UI configuration
    ui: {
        theme: {
            default: 'professional',
            available: ['professional', 'minimal', 'gaming'],
            customization: {
                accentColor: '#00ff88',
                backgroundOpacity: 80,
                blurIntensity: 12,
                animationSpeed: 300
            }
        },
        
        animations: {
            enabled: true,
            reducedMotion: false, // Will be auto-detected
            duration: {
                fast: 150,
                normal: 300,
                slow: 500
            },
            easing: {
                smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
                bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                linear: 'linear'
            }
        },
        
        responsive: {
            breakpoints: {
                mobile: 768,
                tablet: 1024,
                desktop: 1440
            },
            design: {
                mobile: 'stacked',
                tablet: 'grid',
                desktop: 'sidebar'
            }
        }
    },
    
    // Widget defaults
    widgets: {
        ticker: {
            speed: {
                min: 10,
                max: 100,
                default: 50,
                step: 5
            },
            text: {
                maxLength: 1000,
                maxLines: 10,
                defaultColor: '#ffffff',
                defaultBackground: 'transparent'
            },
            animation: {
                type: 'scroll',
                direction: 'left',
                smooth: true
            }
        },
        
        popup: {
            title: {
                maxLength: 100,
                required: false
            },
            message: {
                maxLength: 500,
                required: true
            },
            display: {
                duration: 0, // 0 = manual dismissal
                position: 'center',
                modal: true
            }
        },
        
        brb: {
            message: {
                maxLength: 200,
                default: 'Be Right Back',
                placeholder: 'Stream will resume shortly'
            },
            display: {
                fullscreen: true,
                showTimer: false,
                backgroundEffect: 'particles'
            }
        }
    },
    
    // Performance settings
    performance: {
        updateThrottle: 16, // ~60fps
        renderBatch: 5,
        memoryLimit: 50 * 1024 * 1024, // 50MB
        cacheTimeout: 5 * 60 * 1000, // 5 minutes
        
        optimization: {
            lazyLoad: true,
            virtualScrolling: false,
            preloadImages: true,
            compressData: false
        }
    },
    
    // Security settings
    security: {
        sanitizeInput: true,
        validateMessages: true,
        rateLimiting: {
            enabled: true,
            windowMs: 60000, // 1 minute
            maxRequests: 100
        },
        contentSecurity: {
            allowInlineStyles: true,
            allowInlineScripts: false,
            allowEval: false
        }
    },
    
    // Storage configuration
    storage: {
        type: 'localStorage', // 'localStorage', 'sessionStorage', 'indexedDB'
        prefix: 'm0_ticker_',
        encryption: false,
        compression: false,
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        
        keys: {
            userSettings: 'user_settings',
            dashboardState: 'dashboard_state',
            themeConfig: 'theme_config',
            widgetData: 'widget_data'
        }
    },
    
    // Logging configuration
    logging: {
        enabled: true,
        level: 'info', // 'debug', 'info', 'warn', 'error'
        console: true,
        remote: false,
        maxEntries: 1000,
        
        categories: {
            websocket: true,
            components: true,
            performance: false,
            security: true
        }
    },
    
    // Feature flags
    features: {
        betaFeatures: false,
        experimentalMode: false,
        debugMode: typeof window !== 'undefined' && 
            (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')),
        
        widgets: {
            ticker: true,
            popup: true,
            brb: true,
            chat: false, // Future feature
            alerts: false // Future feature
        },
        
        integrations: {
            obs: false, // Future OBS integration
            streamlabs: false, // Future Streamlabs integration
            discord: false // Future Discord integration
        }
    },
    
    // Development settings
    development: {
        hotReload: false,
        mockData: false,
        testMode: false,
        bypassAuth: false,
        
        debugging: {
            showComponentBounds: false,
            logStateChanges: true,
            performanceMonitor: false,
            memoryUsage: false
        }
    }
};

// Auto-detect user preferences
if (typeof window !== 'undefined') {
    // Detect reduced motion preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        AppConfig.ui.animations.reducedMotion = true;
        AppConfig.ui.animations.enabled = false;
    }
    
    // Detect high contrast preference
    if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
        AppConfig.ui.theme.customization.accentColor = '#ffffff';
    }
    
    // Detect dark mode preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        // Already using dark theme by default
    }
}

// Environment-specific overrides
if (typeof process !== 'undefined' && process.env) {
    if (process.env.NODE_ENV === 'development') {
        AppConfig.logging.level = 'debug';
        AppConfig.features.debugMode = true;
        AppConfig.development.hotReload = true;
    }
    
    if (process.env.NODE_ENV === 'production') {
        AppConfig.logging.level = 'warn';
        AppConfig.features.debugMode = false;
        AppConfig.performance.optimization.compressData = true;
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
} else if (typeof window !== 'undefined') {
    window.AppConfig = AppConfig;
}