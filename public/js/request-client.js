/**
 * Request Client for M0 Ticker
 * HTTP client wrapper for API communication matching test expectations
 */

/**
 * Custom Request Error class
 */
class RequestError extends Error {
    constructor(message, code, cause = null) {
        super(message);
        this.name = 'RequestError';
        this.code = code;
        this.cause = cause;
    }
}

/**
 * Request Client Class
 */
class RequestClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || '';
        this.defaultTimeout = options.timeout || 10000;
    }
    
    /**
     * Generic request method
     * @param {string} url - URL to request
     * @param {Object} options - Request options
     * @returns {Promise<Response>} Response object
     */
    async request(url, options = {}) {
        const {
            method = 'GET',
            headers = {},
            body,
            timeoutMs = this.defaultTimeout,
            ...fetchOptions
        } = options;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
                ...fetchOptions
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new RequestError('Request timeout', 'timeout', error);
            }
            
            throw new RequestError('Network error', 'network', error);
        }
    }
    
    /**
     * Request JSON data
     * @param {string} url - URL to request
     * @param {Object} options - Request options
     * @returns {Promise<any>} Parsed JSON response
     */
    async requestJson(url, options = {}) {
        try {
            const response = await this.request(url, options);
            
            if (!response.ok) {
                throw new RequestError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    'http',
                    null
                );
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new RequestError('Invalid response format', 'invalid_response', null);
            }
            
            return await response.json();
        } catch (error) {
            if (error instanceof RequestError) {
                throw error;
            }
            
            throw new RequestError('Request failed', 'unknown', error);
        }
    }
    
    /**
     * GET request
     * @param {string} url - URL to request
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async get(url, options = {}) {
        return this.requestJson(url, { ...options, method: 'GET' });
    }
    
    /**
     * POST request
     * @param {string} url - URL to request
     * @param {Object} data - Request data
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async post(url, data = {}, options = {}) {
        return this.requestJson(url, { ...options, method: 'POST', body: data });
    }
    
    /**
     * PUT request
     * @param {string} url - URL to request
     * @param {Object} data - Request data
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async put(url, data = {}, options = {}) {
        return this.requestJson(url, { ...options, method: 'PUT', body: data });
    }
    
    /**
     * DELETE request
     * @param {string} url - URL to request
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async delete(url, options = {}) {
        return this.requestJson(url, { ...options, method: 'DELETE' });
    }
}

/**
 * Creates a new request client instance
 * @param {Object} options - Client options
 * @returns {RequestClient} New client instance
 */
function create(options = {}) {
    return new RequestClient(options);
}

/**
 * Default request client instance
 */
const defaultClient = create();

/**
 * Convenience functions using default client
 */
const get = (url, options) => defaultClient.get(url, options);
const post = (url, data, options) => defaultClient.post(url, data, options);
const put = (url, data, options) => defaultClient.put(url, data, options);
const del = (url, options) => defaultClient.delete(url, options);

// Export for Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        RequestClient,
        RequestError,
        create,
        defaultClient,
        get,
        post,
        put,
        delete: del
    };
} else if (typeof window !== 'undefined') {
    window.RequestClient = RequestClient;
    window.RequestError = RequestError;
    window.ApiClient = {
        RequestClient,
        RequestError,
        create,
        defaultClient,
        get,
        post,
        put,
        delete: del
    };
}