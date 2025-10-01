/**
 * Scene Normaliser for M0 Ticker
 * Functions to normalize broadcast scene data and streaming configurations
 */

/**
 * Normalizes scene configuration for broadcast output
 * @param {Object} sceneConfig - Raw scene configuration
 * @returns {Object} Normalized scene configuration
 */
function normaliseSceneConfig(sceneConfig) {
    const defaultConfig = {
        name: 'Default Scene',
        width: 1920,
        height: 1080,
        framerate: 30,
        layout: 'standard',
        components: {
            ticker: { enabled: true, position: 'bottom' },
            popup: { enabled: true, position: 'center' },
            brb: { enabled: true, position: 'fullscreen' }
        }
    };
    
    if (!sceneConfig || typeof sceneConfig !== 'object') {
        return defaultConfig;
    }
    
    return {
        name: String(sceneConfig.name || defaultConfig.name).substring(0, 50),
        width: validateDimension(sceneConfig.width, defaultConfig.width),
        height: validateDimension(sceneConfig.height, defaultConfig.height),
        framerate: validateFramerate(sceneConfig.framerate, defaultConfig.framerate),
        layout: validateLayout(sceneConfig.layout, defaultConfig.layout),
        components: normaliseComponents(sceneConfig.components || defaultConfig.components)
    };
}

/**
 * Normalizes broadcast layout configuration
 * @param {Object} layoutConfig - Raw layout configuration
 * @returns {Object} Normalized layout configuration
 */
function normaliseBroadcastLayout(layoutConfig) {
    const defaultConfig = {
        type: 'overlay',
        transparency: true,
        chromaKey: false,
        chromaKeyColor: '#00ff00',
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        safeArea: { top: 50, right: 50, bottom: 50, left: 50 }
    };
    
    if (!layoutConfig || typeof layoutConfig !== 'object') {
        return defaultConfig;
    }
    
    return {
        type: ['overlay', 'fullscreen', 'windowed'].includes(layoutConfig.type) ? layoutConfig.type : defaultConfig.type,
        transparency: Boolean(layoutConfig.transparency),
        chromaKey: Boolean(layoutConfig.chromaKey),
        chromaKeyColor: validateColor(layoutConfig.chromaKeyColor) ? layoutConfig.chromaKeyColor : defaultConfig.chromaKeyColor,
        margins: normaliseMargins(layoutConfig.margins || defaultConfig.margins),
        safeArea: normaliseMargins(layoutConfig.safeArea || defaultConfig.safeArea)
    };
}

/**
 * Normalizes streaming platform configuration
 * @param {Object} platformConfig - Raw platform configuration
 * @returns {Object} Normalized platform configuration
 */
function normaliseStreamingPlatform(platformConfig) {
    const defaultConfig = {
        platform: 'generic',
        resolution: '1920x1080',
        bitrate: 6000,
        keyframe: 2,
        preset: 'veryfast',
        profile: 'main'
    };
    
    if (!platformConfig || typeof platformConfig !== 'object') {
        return defaultConfig;
    }
    
    const validPlatforms = ['twitch', 'youtube', 'facebook', 'tiktok', 'generic'];
    const validResolutions = ['1920x1080', '1280x720', '1024x576', '854x480'];
    const validPresets = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow'];
    
    return {
        platform: validPlatforms.includes(platformConfig.platform) ? platformConfig.platform : defaultConfig.platform,
        resolution: validResolutions.includes(platformConfig.resolution) ? platformConfig.resolution : defaultConfig.resolution,
        bitrate: Math.max(1000, Math.min(50000, Number(platformConfig.bitrate) || defaultConfig.bitrate)),
        keyframe: Math.max(1, Math.min(10, Number(platformConfig.keyframe) || defaultConfig.keyframe)),
        preset: validPresets.includes(platformConfig.preset) ? platformConfig.preset : defaultConfig.preset,
        profile: ['baseline', 'main', 'high'].includes(platformConfig.profile) ? platformConfig.profile : defaultConfig.profile
    };
}

/**
 * Normalizes component positions and properties
 * @param {Object} components - Raw components configuration
 * @returns {Object} Normalized components configuration
 */
function normaliseComponents(components) {
    const defaultComponents = {
        ticker: { enabled: true, position: 'bottom', zIndex: 100 },
        popup: { enabled: true, position: 'center', zIndex: 200 },
        brb: { enabled: true, position: 'fullscreen', zIndex: 300 }
    };
    
    if (!components || typeof components !== 'object') {
        return defaultComponents;
    }
    
    const validPositions = ['top', 'bottom', 'left', 'right', 'center', 'fullscreen', 'custom'];
    
    const normalised = {};
    Object.keys(defaultComponents).forEach(key => {
        const component = components[key] || defaultComponents[key];
        normalised[key] = {
            enabled: Boolean(component.enabled),
            position: validPositions.includes(component.position) ? component.position : defaultComponents[key].position,
            zIndex: Math.max(1, Math.min(1000, Number(component.zIndex) || defaultComponents[key].zIndex))
        };
    });
    
    return normalised;
}

/**
 * Helper function to validate dimensions
 * @param {number} dimension - Dimension to validate
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Valid dimension
 */
function validateDimension(dimension, defaultValue) {
    const num = Number(dimension);
    return isNaN(num) || num < 100 || num > 7680 ? defaultValue : num;
}

/**
 * Helper function to validate framerate
 * @param {number} framerate - Framerate to validate
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Valid framerate
 */
function validateFramerate(framerate, defaultValue) {
    const num = Number(framerate);
    const validRates = [24, 25, 30, 50, 60];
    return validRates.includes(num) ? num : defaultValue;
}

/**
 * Helper function to validate layout type
 * @param {string} layout - Layout to validate
 * @param {string} defaultValue - Default value if invalid
 * @returns {string} Valid layout
 */
function validateLayout(layout, defaultValue) {
    const validLayouts = ['standard', 'minimal', 'gaming', 'professional', 'custom'];
    return validLayouts.includes(layout) ? layout : defaultValue;
}

/**
 * Helper function to normalize margins/padding
 * @param {Object} margins - Margins object to normalize
 * @returns {Object} Normalized margins
 */
function normaliseMargins(margins) {
    if (!margins || typeof margins !== 'object') {
        return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    
    return {
        top: Math.max(0, Math.min(500, Number(margins.top) || 0)),
        right: Math.max(0, Math.min(500, Number(margins.right) || 0)),
        bottom: Math.max(0, Math.min(500, Number(margins.bottom) || 0)),
        left: Math.max(0, Math.min(500, Number(margins.left) || 0))
    };
}

/**
 * Helper function to validate color strings
 * @param {string} color - Color string to validate
 * @returns {boolean} True if valid color
 */
function validateColor(color) {
    if (!color || typeof color !== 'string') {
        return false;
    }
    
    // Test hex colors
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
        return true;
    }
    
    // Test rgb/rgba
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/.test(color)) {
        return true;
    }
    
    return false;
}

// Export for Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normaliseSceneConfig,
        normaliseBroadcastLayout,
        normaliseStreamingPlatform,
        normaliseComponents,
        validateDimension,
        validateFramerate,
        validateLayout,
        normaliseMargins,
        validateColor
    };
} else if (typeof window !== 'undefined') {
    window.SceneNormaliser = {
        normaliseSceneConfig,
        normaliseBroadcastLayout,
        normaliseStreamingPlatform,
        normaliseComponents,
        validateDimension,
        validateFramerate,
        validateLayout,
        normaliseMargins,
        validateColor
    };
}