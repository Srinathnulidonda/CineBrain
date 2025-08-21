// api.js - HTTP client with real backend integration, caching, and service worker hooks
class APIClient {
    constructor() {
        this.cache = new Map();
        this.requestQueue = new Map();
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    // Build full URL from endpoint
    buildUrl(endpoint, params = {}) {
        const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });
        return url.toString();
    }

    // Get cache key
    getCacheKey(url, options = {}) {
        return `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || {})}`;
    }

    // Check if cached data is still valid
    isCacheValid(cachedData, duration) {
        return cachedData && (Date.now() - cachedData.timestamp < duration);
    }

    // Intelligent retry with exponential backoff
    async retryRequest(requestFn, attempts = this.retryAttempts) {
        for (let i = 0; i < attempts; i++) {
            try {
                return await requestFn();
            } catch (error) {
                if (i === attempts - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, i)));
            }
        }
    }

    // Core request method with caching and retry logic
    async request(endpoint, options = {}) {
        const url = this.buildUrl(endpoint, options.params);
        const cacheKey = this.getCacheKey(url, options);
        const cacheDuration = options.cache || CONFIG.CACHE_DURATION.DYNAMIC;

        // Check cache first
        if (options.method === 'GET' || !options.method) {
            const cachedData = this.cache.get(cacheKey);
            if (this.isCacheValid(cachedData, cacheDuration)) {
                return cachedData.data;
            }
        }

        // Deduplicate concurrent requests
        if (this.requestQueue.has(cacheKey)) {
            return this.requestQueue.get(cacheKey);
        }

        // Make the actual request
        const requestPromise = this.retryRequest(async () => {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': Auth.getToken() ? `Bearer ${Auth.getToken()}` : '',
                    ...options.headers
                },
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired, try to refresh
                    if (await Auth.refreshToken()) {
                        // Retry with new token
                        return this.request(endpoint, options);
                    } else {
                        Auth.logout();
                        throw new Error('Authentication failed');
                    }
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Cache successful GET requests
            if (options.method === 'GET' || !options.method) {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }

            return data;
        });

        this.requestQueue.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.requestQueue.delete(cacheKey);
        }
    }

    // Convenience methods
    async get(endpoint, params = {}, options = {}) {
        return this.request(endpoint, { ...options, params, method: 'GET' });
    }

    async post(endpoint, body = {}, options = {}) {
        return this.request(endpoint, { ...options, body, method: 'POST' });
    }

    async put(endpoint, body = {}, options = {}) {
        return this.request(endpoint, { ...options, body, method: 'PUT' });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    // Clear cache
    clearCache(pattern = null) {
        if (pattern) {
            for (const [key] of this.cache) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    // Prefetch data for better performance
    async prefetch(endpoints) {
        const promises = endpoints.map(endpoint =>
            this.get(endpoint.url, endpoint.params).catch(() => null)
        );
        await Promise.all(promises);
    }
}

// Content-specific API methods
class ContentAPI {
    constructor(client) {
        this.client = client;
    }

    async getTrending(params = {}) {
        return this.client.get(CONFIG.API_ENDPOINTS.TRENDING, {
            limit: params.limit || 20,
            type: params.type || 'all',
            region: params.region
        });
    }

    async getNewReleases(params = {}) {
        return this.client.get(CONFIG.API_ENDPOINTS.NEW_RELEASES, {
            limit: params.limit || 20,
            language: params.language,
            type: params.type || 'movie'
        });
    }

    async getCriticsChoice(params = {}) {
        return this.client.get(CONFIG.API_ENDPOINTS.TOP_RATED, {
            limit: params.limit || 20,
            type: params.type || 'movie'
        });
    }

    async getGenreContent(genre, params = {}) {
        return this.client.get(`${CONFIG.API_ENDPOINTS.GENRES}/${genre}`, {
            limit: params.limit || 20,
            type: params.type || 'movie',
            region: params.region
        });
    }

    async getRegionalContent(language, params = {}) {
        return this.client.get(`${CONFIG.API_ENDPOINTS.REGIONAL}/${language}`, {
            limit: params.limit || 20,
            type: params.type || 'movie'
        });
    }

    async getAnimeContent(params = {}) {
        return this.client.get(CONFIG.API_ENDPOINTS.ANIME, {
            limit: params.limit || 20,
            genre: params.genre
        });
    }

    async search(query, params = {}) {
        return this.client.get(CONFIG.API_ENDPOINTS.SEARCH, {
            query,
            type: params.type || 'multi',
            page: params.page || 1
        });
    }

    async getDetails(contentId) {
        return this.client.get(`${CONFIG.API_ENDPOINTS.CONTENT_DETAILS}/${contentId}`);
    }

    async getSimilar(contentId, params = {}) {
        return this.client.get(`${CONFIG.API_ENDPOINTS.SIMILAR}/${contentId}`, {
            limit: params.limit || 20
        });
    }

    async getAdminChoice(params = {}) {
        return this.client.get(CONFIG.API_ENDPOINTS.ADMIN_CHOICE, {
            limit: params.limit || 20,
            type: params.type || 'admin_choice'
        });
    }
}

// User-specific API methods
class UserAPI {
    constructor(client) {
        this.client = client;
    }

    async getRecommendations(params = {}) {
        if (!Auth.isAuthenticated()) {
            return this.client.get(CONFIG.API_ENDPOINTS.ANONYMOUS_RECOMMENDATIONS, {
                limit: params.limit || 20
            });
        }

        if (CONFIG.FEATURES.ML_RECOMMENDATIONS) {
            try {
                return await this.client.get(CONFIG.API_ENDPOINTS.ML_RECOMMENDATIONS, {
                    limit: params.limit || 20
                });
            } catch (error) {
                // Fallback to regular recommendations
                return this.client.get(CONFIG.API_ENDPOINTS.RECOMMENDATIONS, {
                    limit: params.limit || 20
                });
            }
        }

        return this.client.get(CONFIG.API_ENDPOINTS.RECOMMENDATIONS, {
            limit: params.limit || 20
        });
    }

    async getWatchlist() {
        return this.client.get(CONFIG.API_ENDPOINTS.WATCHLIST);
    }

    async getFavorites() {
        return this.client.get(CONFIG.API_ENDPOINTS.FAVORITES);
    }

    async recordInteraction(contentId, interactionType, rating = null) {
        return this.client.post(CONFIG.API_ENDPOINTS.INTERACTIONS, {
            content_id: contentId,
            interaction_type: interactionType,
            rating
        });
    }

    async addToWatchlist(contentId) {
        return this.recordInteraction(contentId, 'watchlist');
    }

    async addToFavorites(contentId) {
        return this.recordInteraction(contentId, 'favorite');
    }

    async rateContent(contentId, rating) {
        return this.recordInteraction(contentId, 'rating', rating);
    }
}

// Admin API methods
class AdminAPI {
    constructor(client) {
        this.client = client;
    }

    async searchExternal(query, source = 'tmdb', page = 1) {
        return this.client.get(CONFIG.API_ENDPOINTS.ADMIN_SEARCH, {
            query,
            source,
            page
        });
    }

    async saveContent(contentData) {
        return this.client.post(CONFIG.API_ENDPOINTS.ADMIN_CONTENT, contentData);
    }

    async createRecommendation(data) {
        return this.client.post(CONFIG.API_ENDPOINTS.ADMIN_RECOMMENDATIONS, data);
    }

    async getRecommendations(params = {}) {
        return this.client.get(CONFIG.API_ENDPOINTS.ADMIN_RECOMMENDATIONS, {
            page: params.page || 1,
            per_page: params.per_page || 20
        });
    }

    async getAnalytics() {
        return this.client.get(CONFIG.API_ENDPOINTS.ADMIN_ANALYTICS);
    }

    async checkMLService() {
        return this.client.get(CONFIG.API_ENDPOINTS.ADMIN_ML_CHECK);
    }

    async updateMLService() {
        return this.client.post(CONFIG.API_ENDPOINTS.ADMIN_ML_UPDATE);
    }

    async getMLStats() {
        return this.client.get(CONFIG.API_ENDPOINTS.ADMIN_ML_STATS);
    }
}

// Initialize API clients
const apiClient = new APIClient();
const API = {
    content: new ContentAPI(apiClient),
    user: new UserAPI(apiClient),
    admin: new AdminAPI(apiClient),
    client: apiClient
};

// Service Worker integration
if ('serviceWorker' in navigator && CONFIG.FEATURES.OFFLINE_MODE) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => { });
    });
}