// API Client with Caching, Retry Logic, and Service Worker Integration
class APIClient {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.retryConfig = {
            maxRetries: 3,
            retryDelay: 1000,
            backoffMultiplier: 2
        };
    }

    // Get auth token from localStorage
    getAuthToken() {
        return localStorage.getItem('auth_token');
    }

    // Build full URL
    buildUrl(endpoint, params = {}) {
        const url = new URL(CONFIG.API_BASE_URL + endpoint);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });
        return url.toString();
    }

    // Cache key generator
    getCacheKey(url, options = {}) {
        return `${url}:${JSON.stringify(options)}`;
    }

    // Check if cache is valid
    isCacheValid(cachedData, duration) {
        return cachedData && (Date.now() - cachedData.timestamp < duration);
    }

    // Main request method with caching and retry
    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            params = {},
            body = null,
            cache = true,
            cacheDuration = CONFIG.CACHE_DURATION.CONTENT,
            retry = true
        } = options;

        const url = this.buildUrl(endpoint, method === 'GET' ? params : {});
        const cacheKey = this.getCacheKey(url, { method, body });

        // Check cache for GET requests
        if (method === 'GET' && cache) {
            const cachedData = this.cache.get(cacheKey);
            if (this.isCacheValid(cachedData, cacheDuration)) {
                return cachedData.data;
            }
        }

        // Prevent duplicate requests
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        // Create request promise
        const requestPromise = this.executeRequest(url, {
            method,
            headers: this.buildHeaders(),
            body: body ? JSON.stringify(body) : null
        }, retry);

        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const data = await requestPromise;

            // Cache successful GET requests
            if (method === 'GET' && cache && data) {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }

            return data;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    // Execute request with retry logic
    async executeRequest(url, options, retry = true, retryCount = 0) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                if (response.status === 401) {
                    // Handle token refresh
                    await this.handleTokenRefresh();
                    // Retry with new token
                    options.headers = this.buildHeaders();
                    return this.executeRequest(url, options, false);
                }

                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (retry && retryCount < this.retryConfig.maxRetries) {
                const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.executeRequest(url, options, retry, retryCount + 1);
            }
            throw error;
        }
    }

    // Build request headers
    buildHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // Handle token refresh
    async handleTokenRefresh() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                throw new Error('No refresh token');
            }

            const response = await fetch(this.buildUrl(CONFIG.API_ENDPOINTS.REFRESH_TOKEN), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('auth_token', data.token);
                if (data.refresh_token) {
                    localStorage.setItem('refresh_token', data.refresh_token);
                }
            } else {
                // Redirect to login
                window.location.href = '/auth/login.html';
            }
        } catch (error) {
            window.location.href = '/auth/login.html';
        }
    }

    // Convenience methods
    get(endpoint, params = {}, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET', params });
    }

    post(endpoint, body = {}, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body });
    }

    put(endpoint, body = {}, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body });
    }

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // Prefetch data
    async prefetch(endpoints) {
        const promises = endpoints.map(endpoint =>
            this.get(endpoint).catch(err => console.warn(`Prefetch failed for ${endpoint}:`, err))
        );
        await Promise.allSettled(promises);
    }

    // Service Worker integration
    async syncWithServiceWorker() {
        if ('serviceWorker' in navigator && CONFIG.FEATURES.SERVICE_WORKER) {
            try {
                const registration = await navigator.serviceWorker.ready;
                if (registration.sync) {
                    await registration.sync.register('sync-data');
                }
            } catch (error) {
                console.warn('Service Worker sync failed:', error);
            }
        }
    }
}

// Export singleton instance
const apiClient = new APIClient();