// CineScope HTTP Client with Enhanced Error Handling and Caching
class HTTPClient {
    constructor() {
        this.baseURL = CONFIG.API_BASE;
        this.timeout = CONFIG.API_TIMEOUT;
        this.retryAttempts = CONFIG.PERFORMANCE.RETRY_ATTEMPTS;
        this.retryDelay = CONFIG.PERFORMANCE.RETRY_DELAY;
        this.requestQueue = new Map();
        this.activeRequests = new Set();
        this.abortControllers = new Map();

        // Initialize request interceptors
        this.initInterceptors();
    }

    // Initialize request and response interceptors
    initInterceptors() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            this.handleOffline();
        });
    }

    // Handle online event
    handleOnline() {
        console.log('Connection restored. Retrying failed requests...');
        // Retry queued requests
        this.retryQueuedRequests();
    }

    // Handle offline event
    handleOffline() {
        console.log('Connection lost. Requests will be queued.');
        // Abort active requests
        this.abortActiveRequests();
    }

    // Retry queued requests
    async retryQueuedRequests() {
        const queuedRequests = Array.from(this.requestQueue.values());
        this.requestQueue.clear();

        for (const request of queuedRequests) {
            try {
                await this.executeRequest(request.config);
            } catch (error) {
                console.warn('Failed to retry request:', error);
            }
        }
    }

    // Abort active requests
    abortActiveRequests() {
        this.abortControllers.forEach((controller, requestId) => {
            controller.abort();
            this.abortControllers.delete(requestId);
        });
        this.activeRequests.clear();
    }

    // Generate request ID
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get auth headers
    getAuthHeaders() {
        const token = Storage.getAuthToken();
        if (token) {
            return {
                'Authorization': `Bearer ${token}`
            };
        }
        return {};
    }

    // Get default headers
    getDefaultHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-Requested-With': 'CineScope',
            'X-Client-Version': CONFIG.APP_VERSION,
            ...this.getAuthHeaders()
        };
    }

    // Create abort controller
    createAbortController(timeout = this.timeout) {
        const controller = new AbortController();

        // Set timeout
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeout);

        // Clean up timeout when request completes
        controller.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
        });

        return controller;
    }

    // Execute HTTP request with retry logic
    async executeRequest(config, attempt = 1) {
        const requestId = this.generateRequestId();

        try {
            // Check if we're offline
            if (!navigator.onLine) {
                throw new Error('OFFLINE');
            }

            // Check cache first for GET requests
            if (config.method === 'GET' && config.cache !== false) {
                const cacheKey = this.getCacheKey(config);
                const cachedData = Storage.getCache(cacheKey);
                if (cachedData) {
                    return { data: cachedData, cached: true };
                }
            }

            // Create abort controller
            const controller = this.createAbortController(config.timeout || this.timeout);
            this.abortControllers.set(requestId, controller);
            this.activeRequests.add(requestId);

            // Prepare fetch options
            const fetchOptions = {
                method: config.method || 'GET',
                headers: { ...this.getDefaultHeaders(), ...(config.headers || {}) },
                signal: controller.signal
            };

            // Add body for non-GET requests
            if (config.data && fetchOptions.method !== 'GET') {
                fetchOptions.body = JSON.stringify(config.data);
            }

            // Build URL with query parameters
            const url = this.buildURL(config.url, config.params);

            // Execute fetch
            const response = await fetch(url, fetchOptions);

            // Clean up
            this.abortControllers.delete(requestId);
            this.activeRequests.delete(requestId);

            // Handle response
            const result = await this.handleResponse(response, config);

            // Cache successful GET requests
            if (config.method === 'GET' && config.cache !== false && result.data) {
                const cacheKey = this.getCacheKey(config);
                Storage.setCache(cacheKey, result.data, config.cacheTTL);
            }

            return result;

        } catch (error) {
            // Clean up
            this.abortControllers.delete(requestId);
            this.activeRequests.delete(requestId);

            // Handle specific errors
            if (error.name === 'AbortError') {
                throw new Error('REQUEST_TIMEOUT');
            }

            if (error.message === 'OFFLINE') {
                // Queue request for retry when online
                this.requestQueue.set(requestId, { config, attempt });
                throw new Error('NETWORK_OFFLINE');
            }

            // Retry logic for network errors
            if (this.shouldRetry(error, attempt)) {
                console.log(`Retrying request (${attempt}/${this.retryAttempts}):`, config.url);
                await this.delay(this.retryDelay * attempt);
                return this.executeRequest(config, attempt + 1);
            }

            throw this.normalizeError(error);
        }
    }

    // Handle HTTP response
    async handleResponse(response, config) {
        const result = {
            status: response.status,
            statusText: response.statusText,
            headers: this.parseHeaders(response.headers),
            cached: false
        };

        // Handle different response types
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            result.data = await response.json();
        } else if (contentType.includes('text/')) {
            result.data = await response.text();
        } else {
            result.data = await response.blob();
        }

        // Check if response is successful
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.data = result.data;
            throw error;
        }

        return result;
    }

    // Parse response headers
    parseHeaders(headers) {
        const parsed = {};
        headers.forEach((value, key) => {
            parsed[key] = value;
        });
        return parsed;
    }

    // Build URL with query parameters
    buildURL(endpoint, params = {}) {
        let url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

        if (Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    searchParams.append(key, value);
                }
            });

            const queryString = searchParams.toString();
            if (queryString) {
                url += (url.includes('?') ? '&' : '?') + queryString;
            }
        }

        return url;
    }

    // Generate cache key
    getCacheKey(config) {
        const url = this.buildURL(config.url, config.params);
        return `http_${btoa(url).replace(/[+/=]/g, '')}`;
    }

    // Check if request should be retried
    shouldRetry(error, attempt) {
        if (attempt >= this.retryAttempts) {
            return false;
        }

        // Retry on network errors and 5xx server errors
        return (
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            (error.status >= 500 && error.status < 600)
        );
    }

    // Normalize error messages
    normalizeError(error) {
        const normalizedError = new Error();
        normalizedError.originalError = error;

        if (error.message === 'NETWORK_OFFLINE') {
            normalizedError.message = CONFIG.ERROR_MESSAGES.OFFLINE;
            normalizedError.code = 'OFFLINE';
        } else if (error.message === 'REQUEST_TIMEOUT') {
            normalizedError.message = CONFIG.ERROR_MESSAGES.TIMEOUT;
            normalizedError.code = 'TIMEOUT';
        } else if (error.status === 401) {
            normalizedError.message = CONFIG.ERROR_MESSAGES.AUTH_REQUIRED;
            normalizedError.code = 'UNAUTHORIZED';
            this.handleAuthError();
        } else if (error.status === 403) {
            normalizedError.message = CONFIG.ERROR_MESSAGES.ACCESS_DENIED;
            normalizedError.code = 'FORBIDDEN';
        } else if (error.status === 404) {
            normalizedError.message = CONFIG.ERROR_MESSAGES.NOT_FOUND;
            normalizedError.code = 'NOT_FOUND';
        } else if (error.status === 429) {
            normalizedError.message = CONFIG.ERROR_MESSAGES.RATE_LIMIT;
            normalizedError.code = 'RATE_LIMIT';
        } else if (error.status >= 500) {
            normalizedError.message = CONFIG.ERROR_MESSAGES.SERVER_ERROR;
            normalizedError.code = 'SERVER_ERROR';
        } else {
            normalizedError.message = CONFIG.ERROR_MESSAGES.NETWORK_ERROR;
            normalizedError.code = 'NETWORK_ERROR';
        }

        normalizedError.status = error.status;
        normalizedError.data = error.data;

        return normalizedError;
    }

    // Handle authentication errors
    handleAuthError() {
        Storage.handleLogout();
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/auth/login')) {
            window.location.href = '/auth/login.html';
        }
    }

    // Delay utility
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // HTTP methods
    async get(url, params = {}, options = {}) {
        return this.executeRequest({
            method: 'GET',
            url: url,
            params: params,
            ...options
        });
    }

    async post(url, data = {}, options = {}) {
        return this.executeRequest({
            method: 'POST',
            url: url,
            data: data,
            ...options
        });
    }

    async put(url, data = {}, options = {}) {
        return this.executeRequest({
            method: 'PUT',
            url: url,
            data: data,
            ...options
        });
    }

    async patch(url, data = {}, options = {}) {
        return this.executeRequest({
            method: 'PATCH',
            url: url,
            data: data,
            ...options
        });
    }

    async delete(url, options = {}) {
        return this.executeRequest({
            method: 'DELETE',
            url: url,
            ...options
        });
    }

    // Cancel all requests
    cancelAllRequests() {
        this.abortActiveRequests();
        this.requestQueue.clear();
    }

    // Cancel specific request
    cancelRequest(requestId) {
        const controller = this.abortControllers.get(requestId);
        if (controller) {
            controller.abort();
            this.abortControllers.delete(requestId);
        }
        this.activeRequests.delete(requestId);
        this.requestQueue.delete(requestId);
    }

    // Get request statistics
    getStats() {
        return {
            activeRequests: this.activeRequests.size,
            queuedRequests: this.requestQueue.size,
            isOnline: navigator.onLine
        };
    }
}

// API wrapper with specific endpoints
class CineScopeAPI {
    constructor() {
        this.http = new HTTPClient();
    }

    // Authentication endpoints
    async login(credentials) {
        const response = await this.http.post('/login', credentials);
        if (response.data.token) {
            Storage.setAuthToken(response.data.token);
            Storage.setUserData(response.data.user);
        }
        return response.data;
    }

    async register(userData) {
        const response = await this.http.post('/register', userData);
        if (response.data.token) {
            Storage.setAuthToken(response.data.token);
            Storage.setUserData(response.data.user);
        }
        return response.data;
    }

    async logout() {
        try {
            await this.http.post('/logout');
        } catch (error) {
            // Even if logout fails, clear local data
            console.warn('Logout request failed:', error);
        } finally {
            Storage.handleLogout();
        }
    }

    // Content discovery endpoints
    async searchContent(query, filters = {}) {
        const params = {
            query: query,
            ...filters
        };
        const response = await this.http.get('/search', params);
        return response.data;
    }

    async getContentDetails(contentId) {
        const response = await this.http.get(`/content/${contentId}`);
        return response.data;
    }

    // Recommendation endpoints
    async getTrending(params = {}) {
        const response = await this.http.get('/recommendations/trending', params);
        return response.data;
    }

    async getNewReleases(params = {}) {
        const response = await this.http.get('/recommendations/new-releases', params);
        return response.data;
    }

    async getCriticsChoice(params = {}) {
        const response = await this.http.get('/recommendations/critics-choice', params);
        return response.data;
    }

    async getGenreRecommendations(genre, params = {}) {
        const response = await this.http.get(`/recommendations/genre/${genre}`, params);
        return response.data;
    }

    async getRegionalRecommendations(language, params = {}) {
        const response = await this.http.get(`/recommendations/regional/${language}`, params);
        return response.data;
    }

    async getAnimeRecommendations(params = {}) {
        const response = await this.http.get('/recommendations/anime', params);
        return response.data;
    }

    async getSimilarRecommendations(contentId, params = {}) {
        const response = await this.http.get(`/recommendations/similar/${contentId}`, params);
        return response.data;
    }

    async getPersonalizedRecommendations(params = {}) {
        const response = await this.http.get('/recommendations/personalized', params);
        return response.data;
    }

    async getAdminChoiceRecommendations(params = {}) {
        const response = await this.http.get('/recommendations/admin-choice', params);
        return response.data;
    }

    // User interaction endpoints
    async recordInteraction(interaction) {
        const response = await this.http.post('/interactions', interaction);
        return response.data;
    }

    async getUserWatchlist() {
        const response = await this.http.get('/user/watchlist');
        return response.data;
    }

    async getUserFavorites() {
        const response = await this.http.get('/user/favorites');
        return response.data;
    }

    // Admin endpoints
    async adminSearch(query, params = {}) {
        const searchParams = {
            query: query,
            ...params
        };
        const response = await this.http.get('/admin/search', searchParams);
        return response.data;
    }

    async saveExternalContent(contentData) {
        const response = await this.http.post('/admin/content', contentData);
        return response.data;
    }

    async createAdminRecommendation(recommendation) {
        const response = await this.http.post('/admin/recommendations', recommendation);
        return response.data;
    }

    async getAdminRecommendations(params = {}) {
        const response = await this.http.get('/admin/recommendations', params);
        return response.data;
    }

    async getAnalytics() {
        const response = await this.http.get('/admin/analytics');
        return response.data;
    }

    async getMLServiceStats() {
        const response = await this.http.get('/admin/ml-stats');
        return response.data;
    }

    async performMLServiceCheck() {
        const response = await this.http.get('/admin/ml-service-check');
        return response.data;
    }

    async forceMLUpdate() {
        const response = await this.http.post('/admin/ml-service-update');
        return response.data;
    }

    // Utility methods
    cancelAllRequests() {
        this.http.cancelAllRequests();
    }

    getRequestStats() {
        return this.http.getStats();
    }
}

// Create global API instance
const API = new CineScopeAPI();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HTTPClient, CineScopeAPI, API };
}

// Global access
window.API = API;
window.HTTPClient = HTTPClient;