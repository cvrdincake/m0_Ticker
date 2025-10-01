/**
 * Client Normalisers for M0 Ticker
 * Functions to normalize and validate client-side data matching test expectations
 */

/**
 * Normalizes overlay data for broadcast display
 * @param {Object} overlayData - Raw overlay data
 * @returns {Object} Normalized overlay data
 */
function normaliseOverlayData(overlayData) {
    const defaultData = {
        label: '',
        accent: '#ffffff',
        highlight: [],
        scale: 1.0,
        popupScale: 1.0,
        position: 'bottom',
        mode: 'scroll',
        accentAnim: false,
        sparkle: false,
        theme: 'default'
    };
    
    if (!overlayData || typeof overlayData !== 'object') {
        return defaultData;
    }
    
    return {
        label: String(overlayData.label || '').trim().substring(0, 48),
        accent: String(overlayData.accent || defaultData.accent).trim(),
        highlight: normaliseHighlightList(overlayData.highlight),
        scale: clampScaleValue(overlayData.scale, defaultData.scale),
        popupScale: clampScaleValue(overlayData.popupScale, defaultData.popupScale),
        position: ['top', 'bottom', 'left', 'right'].includes(overlayData.position) ? overlayData.position : defaultData.position,
        mode: ['scroll', 'chunk', 'fade'].includes(overlayData.mode) ? overlayData.mode : defaultData.mode,
        accentAnim: Boolean(overlayData.accentAnim),
        sparkle: Boolean(overlayData.sparkle),
        theme: String(overlayData.theme || defaultData.theme)
    };
}

/**
 * Normalizes popup data
 * @param {Object} popupData - Raw popup data
 * @returns {Object} Normalized popup data
 */
function normalisePopupData(popupData) {
    const defaultData = {
        title: '',
        message: '',
        countdown: 0,
        type: 'info'
    };
    
    if (!popupData || typeof popupData !== 'object') {
        return defaultData;
    }
    
    return {
        title: String(popupData.title || '').trim().substring(0, 100),
        message: String(popupData.message || '').trim().substring(0, 500),
        countdown: Math.max(0, parseInt(popupData.countdown) || 0),
        type: ['info', 'warning', 'error', 'success'].includes(popupData.type) ? popupData.type : defaultData.type
    };
}

/**
 * Normalizes slate data
 * @param {Object} slateData - Raw slate data
 * @returns {Object} Normalized slate data
 */
function normaliseSlateData(slateData) {
    const defaultData = {
        title: '',
        notes: [],
        maxNotes: 6
    };
    
    if (!slateData || typeof slateData !== 'object') {
        return defaultData;
    }
    
    return {
        title: String(slateData.title || '').trim().substring(0, 100),
        notes: normaliseSlateNotesList(slateData.notes || []),
        maxNotes: Math.max(1, Math.min(10, parseInt(slateData.maxNotes) || defaultData.maxNotes))
    };
}

/**
 * Normalizes slate notes list
 * @param {Array} notesList - Raw notes list
 * @returns {Array} Normalized notes list
 */
function normaliseSlateNotesList(notesList) {
    if (!Array.isArray(notesList)) {
        return [];
    }
    
    return notesList
        .slice(0, 6) // Max 6 notes
        .map(note => String(note || '').trim())
        .filter(note => note.length > 0)
        .map(note => note.substring(0, 200)); // Max 200 chars per note
}

/**
 * Normalizes scene entry data
 * @param {Object} sceneEntry - Raw scene entry
 * @returns {Object} Normalized scene entry
 */
function normaliseSceneEntry(sceneEntry) {
    if (!sceneEntry || typeof sceneEntry !== 'object') {
        throw new Error('Scene entry cannot be empty');
    }
    
    const defaultEntry = {
        id: '',
        name: '',
        type: 'standard',
        data: {}
    };
    
    return {
        id: String(sceneEntry.id || '').trim(),
        name: String(sceneEntry.name || '').trim().substring(0, 100),
        type: ['standard', 'overlay', 'fullscreen'].includes(sceneEntry.type) ? sceneEntry.type : defaultEntry.type,
        data: sceneEntry.data && typeof sceneEntry.data === 'object' ? sceneEntry.data : defaultEntry.data
    };
}

/**
 * Helper function to normalize highlight lists
 * @param {string|Array} highlights - Highlight data
 * @returns {Array} Normalized highlight array
 */
function normaliseHighlightList(highlights) {
    if (!highlights) return [];
    
    if (typeof highlights === 'string') {
        return highlights
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0);
    }
    
    if (Array.isArray(highlights)) {
        return highlights
            .map(item => String(item || '').trim())
            .filter(item => item.length > 0);
    }
    
    return [];
}

/**
 * Helper function to clamp scale values
 * @param {number} value - Scale value to clamp
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Clamped scale value
 */
function clampScaleValue(value, defaultValue = 1.0) {
    const num = parseFloat(value);
    if (isNaN(num)) return defaultValue;
    return Math.max(0.1, Math.min(5.0, num));
}

// Export for Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normaliseOverlayData,
        normalisePopupData,
        normaliseSlateData,
        normaliseSlateNotesList,
        normaliseSceneEntry,
        normaliseHighlightList,
        clampScaleValue
    };
} else if (typeof window !== 'undefined') {
    window.ClientNormalisers = {
        normaliseOverlayData,
        normalisePopupData,
        normaliseSlateData,
        normaliseSlateNotesList,
        normaliseSceneEntry,
        normaliseHighlightList,
        clampScaleValue
    };
}