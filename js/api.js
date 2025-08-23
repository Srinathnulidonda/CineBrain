// CineBrain API Client with Caching, Retries & Service Worker Integration
class APIClient {
    constructor() {
        this.baseURL = CONFIG.API.BASE_URL;
        this.timeout = CONFIG.API.TIMEOUT;
        this.retryAttempts = CONFIG.API.RETRY_ATTEMPTS;
        this.retryDelay = CONFIG.API.RETRY_DELAY;
        this.cache = new Map();
        this.prefetchQueue = new Set();

        // Initialize performance monitoring
        this.performanceMetrics = {
            requests: 0,
            cacheHits: 0,
            errors: 0,
            averageResponseTime: 0
        };

        this.initializeServiceWorker();
    }

    // Initialize Service Worker for caching
    async initializeServiceWorker() {
        if ('serviceWorker' in navigator && CONFIG.PERFORMANCE.SERVICE_WORKER_ENABLED) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully');
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }

    // Generate cache key
    generateCacheKey(endpoint, params = {}) {
        const url = new URL(endpoint, this.baseURL);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });
        return url.toString();
    }

    // Check cache
    getFromCache(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CONFIG.PERFORMANCE.API_CACHE_DURATION) {
            this.performanceMetrics.cacheHits++;
            return cached.data;
        }
        return null;
    }

    // Set cache
    setCache(cacheKey, data) {
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        // Limit cache size
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // HTTP request with retry logic
    async request(endpoint, options = {}) {
        const startTime = performance.now();
        const { method = 'GET', params = {}, data = null, skipCache = false } = options;

        const cacheKey = this.generateCacheKey(endpoint, params);

        // Check cache for GET requests
        if (method === 'GET' && !skipCache) {
            const cachedData = this.getFromCache(cacheKey);
            if (cachedData) {
                return cachedData;
            }
        }

        const url = new URL(endpoint, this.baseURL);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(),
                ...options.headers
            },
            signal: AbortSignal.timeout(this.timeout)
        };

        if (data) {
            requestOptions.body = JSON.stringify(data);
        }

        let lastError;

        for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
            try {
                this.performanceMetrics.requests++;

                const response = await fetch(url.toString(), requestOptions);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();

                // Cache successful GET requests
                if (method === 'GET') {
                    this.setCache(cacheKey, result);
                }

                // Update performance metrics
                const responseTime = performance.now() - startTime;
                this.updatePerformanceMetrics(responseTime);

                return result;

            } catch (error) {
                lastError = error;
                this.performanceMetrics.errors++;

                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
                }
            }
        }

        throw lastError;
    }

    // Get authentication headers
    getAuthHeaders() {
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // Delay utility
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Update performance metrics
    updatePerformanceMetrics(responseTime) {
        const totalRequests = this.performanceMetrics.requests;
        const currentAverage = this.performanceMetrics.averageResponseTime;
        this.performanceMetrics.averageResponseTime =
            (currentAverage * (totalRequests - 1) + responseTime) / totalRequests;
    }

    // Prefetch data
    async prefetch(endpoint, params = {}) {
        const cacheKey = this.generateCacheKey(endpoint, params);

        if (this.prefetchQueue.has(cacheKey) || this.getFromCache(cacheKey)) {
            return;
        }

        this.prefetchQueue.add(cacheKey);

        try {
            await this.request(endpoint, { params });
        } catch (error) {
            console.warn('Prefetch failed:', error);
        } finally {
            this.prefetchQueue.delete(cacheKey);
        }
    }

    // === AUTHENTICATION API ===
    async login(credentials) {
        return this.request(API_ENDPOINTS.LOGIN, {
            method: 'POST',
            data: credentials,
            skipCache: true
        });
    }

    async register(userData) {
        return this.request(API_ENDPOINTS.REGISTER, {
            method: 'POST',
            data: userData,
            skipCache: true
        });
    }

    // === SEARCH API ===
    async search(query, options = {}) {
        const params = {
            query,
            type: options.type || 'multi',
            page: options.page || 1
        };

        return this.request(API_ENDPOINTS.SEARCH, { params });
    }

    // === RECOMMENDATIONS API ===
    async getTrending(options = {}) {
        const params = {
            type: options.type || 'all',
            limit: options.limit || CONFIG.UI.ITEMS_PER_PAGE,
            region: options.region
        };

        return this.request(API_ENDPOINTS.TRENDING, { params });
    }

    async getNewReleases(options = {}) {
        const params = {
            language: options.language,
            type: options.type || 'movie',
            limit: options.limit || CONFIG.UI.ITEMS_PER_PAGE
        };

        return this.request(API_ENDPOINTS.NEW_RELEASES, { params });
    }

    async getCriticsChoice(options = {}) {
        const params = {
            type: options.type || 'movie',
            limit: options.limit || CONFIG.UI.ITEMS_PER_PAGE
        };

        return this.request(API_ENDPOINTS.CRITICS_CHOICE, { params });
    }

    async getGenreRecommendations(genre, options = {}) {
        const params = {
            type: options.type || 'movie',
            limit: options.limit || CONFIG.UI.ITEMS_PER_PAGE,
            region: options.region
        };

        return this.request(`${API_ENDPOINTS.GENRE_RECS}/${genre}`, { params });
    }

    async getRegionalRecommendations(language, options = {}) {
        const params = {
            type: options.type || 'movie',
            limit: options.limit || CONFIG.UI.ITEMS_PER_PAGE
        };

        return this.request(`${API_ENDPOINTS.REGIONAL}/${language}`, { params });
    }

    async getAnimeRecommendations(options = {}) {
        const params = {
            genre: options.genre,
            limit: options.limit || CONFIG.UI.ITEMS_PER_PAGE
        };

        return this.request(API_ENDPOINTS.ANIME, { params });
    }

    async getAdminChoice(options = {}) {
        const params = {
            limit: options.limit || CONFIG.UI.ITEMS_PER_PAGE,
            type: options.type || 'admin_choice'
        };

        return this.request(API_ENDPOINTS.ADMIN_CHOICE, { params });
    }

    async getAnonymousRecommendations(options = {}) {
        const params = {
            limit: options.limit || CONFIG.UI.ITEMS_PER_PAGE
        };

        return this.request(API_ENDPOINTS.ANONYMOUS_RECS, { params });
    }

    async getPersonalizedRecommendations(options = {}) {
        const params = {
            limit: options.limit || CONFIG.UI.ITEMS_PER_PAGE
        };

        return this.request(API_ENDPOINTS.PERSONALIZED, { params });
    }

    async getMLPersonalizedRecommendations(options = {}) {
        const params = {
            limit: options.limit || CONFIG.UI.ITEMS_PER_PAGE
        };

        return this.request(API_ENDPOINTS.ML_PERSONALIZED, { params });
    }

    async getSimilarRecommendations(contentId, options = {}) {
        const params = {
            limit: options.limit || CONFIG.UI.ITEMS_PER_PAGE
        };

        return this.request(`${API_ENDPOINTS.SIMILAR}/${contentId}`, { params });
    }

    // === CONTENT API ===
    async getContentDetails(contentId) {
        return this.request(`${API_ENDPOINTS.CONTENT_DETAILS}/${contentId}`);
    }

    // === USER API ===
    async getWatchlist() {
        return this.request(API_ENDPOINTS.WATCHLIST);
    }

    async getFavorites() {
        return this.request(API_ENDPOINTS.FAVORITES);
    }

    async recordInteraction(interaction) {
        return this.request(API_ENDPOINTS.INTERACTIONS, {
            method: 'POST',
            data: interaction,
            skipCache: true
        });
    }

    // === ADMIN API ===
    async adminSearch(query, options = {}) {
        const params = {
            query,
            source: options.source || 'tmdb',
            page: options.page || 1
        };

        return this.request(API_ENDPOINTS.ADMIN_SEARCH, { params });
    }

    async saveContent(contentData) {
        return this.request(API_ENDPOINTS.ADMIN_CONTENT, {
            method: 'POST',
            data: contentData,
            skipCache: true
        });
    }

    async createAdminRecommendation(recommendation) {
        return this.request(API_ENDPOINTS.ADMIN_RECOMMENDATIONS, {
            method: 'POST',
            data: recommendation,
            skipCache: true
        });
    }

    async getAdminRecommendations(options = {}) {
        const params = {
            page: options.page || 1,
            per_page: options.perPage || 20
        };

        return this.request(API_ENDPOINTS.ADMIN_RECOMMENDATIONS, { params });
    }

    async getAnalytics() {
        return this.request(API_ENDPOINTS.ADMIN_ANALYTICS);
    }

    // === HEALTH CHECK ===
    async healthCheck() {
        return this.request(API_ENDPOINTS.HEALTH);
    }

    // === PERFORMANCE MONITORING ===
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    // === PREFETCH STRATEGIES ===
    async prefetchCriticalData() {
        if (!CONFIG.PERFORMANCE.PREFETCH_ENABLED) return;

        const prefetchPromises = [
            this.prefetch(API_ENDPOINTS.TRENDING, { type: 'all', limit: 10 }),
            this.prefetch(API_ENDPOINTS.NEW_RELEASES, { type: 'movie', limit: 10 }),
            this.prefetch(API_ENDPOINTS.CRITICS_CHOICE, { type: 'movie', limit: 10 })
        ];

        try {
            await Promise.allSettled(prefetchPromises);
        } catch (error) {
            console.warn('Prefetch failed:', error);
        }
    }
}

// Initialize global API client
const api = new APIClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIClient, api };
}