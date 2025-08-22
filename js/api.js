// CineBrain API Client - Real Data Only
class CineBrainAPI {
    constructor() {
        this.baseURL = CONFIG.BASE_URL;
        this.cache = new Map();
        this.requestQueue = new Map();
        this.retryCount = new Map();
        this.init();
    }

    init() {
        this.setupServiceWorker();
        this.preloadCriticalEndpoints();
    }

    async setupServiceWorker() {
        if (!CONFIG.FEATURES.SERVICE_WORKER) return;
        
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('ServiceWorker registered:', registration);
        } catch (error) {
            console.warn('ServiceWorker registration failed:', error);
        }
    }

    preloadCriticalEndpoints() {
        setTimeout(() => {
            this.get(CONFIG.API_ENDPOINTS.TRENDING, { limit: 10 });
            this.get(CONFIG.API_ENDPOINTS.NEW_RELEASES, { limit: 10 });
            this.get(CONFIG.API_ENDPOINTS.CRITICS_CHOICE, { limit: 10 });
        }, CONFIG.PERFORMANCE.PRELOAD_DELAY);
    }

    getCacheKey(url, params) {
        const paramString = params ? new URLSearchParams(params).toString() : '';
        return `${url}${paramString ? '?' + paramString : ''}`;
    }

    isInCache(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (!cached) return false;
        
        const isExpired = Date.now() - cached.timestamp > CONFIG.PERFORMANCE.CACHE_DURATION;
        if (isExpired) {
            this.cache.delete(cacheKey);
            return false;
        }
        return true;
    }

    async request(method, endpoint, data = null, params = null) {
        const url = `${this.baseURL}${endpoint}`;
        const cacheKey = this.getCacheKey(url, params);
        
        // Check cache for GET requests
        if (method === 'GET' && this.isInCache(cacheKey)) {
            return this.cache.get(cacheKey).data;
        }

        // Deduplicate concurrent requests
        if (this.requestQueue.has(cacheKey)) {
            return this.requestQueue.get(cacheKey);
        }

        const requestPromise = this.executeRequest(method, url, data, params, cacheKey);
        this.requestQueue.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.requestQueue.delete(cacheKey);
        }
    }

    async executeRequest(method, url, data, params, cacheKey) {
        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders()
            },
            timeout: CONFIG.PERFORMANCE.REQUEST_TIMEOUT
        };

        if (data) {
            requestOptions.body = JSON.stringify(data);
        }

        if (params && method === 'GET') {
            url += '?' + new URLSearchParams(params).toString();
        }

        let attempt = 0;
        const maxRetries = CONFIG.PERFORMANCE.RETRY_ATTEMPTS;

        while (attempt <= maxRetries) {
            try {
                const response = await this.fetchWithTimeout(url, requestOptions);
                
                if (!response.ok) {
                    if (response.status >= 500 && attempt < maxRetries) {
                        attempt++;
                        await this.delay(CONFIG.PERFORMANCE.RETRY_DELAY * attempt);
                        continue;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                
                // Cache successful GET requests
                if (method === 'GET') {
                    this.cache.set(cacheKey, {
                        data: result,
                        timestamp: Date.now()
                    });
                }

                this.retryCount.delete(cacheKey);
                return result;

            } catch (error) {
                if (attempt === maxRetries) {
                    this.retryCount.set(cacheKey, (this.retryCount.get(cacheKey) || 0) + 1);
                    throw error;
                }
                attempt++;
                await this.delay(CONFIG.PERFORMANCE.RETRY_DELAY * attempt);
            }
        }
    }

    async fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getAuthHeaders() {
        const token = Auth.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // HTTP Methods
    async get(endpoint, params = null) {
        return this.request('GET', endpoint, null, params);
    }

    async post(endpoint, data) {
        return this.request('POST', endpoint, data);
    }

    async put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    }

    async delete(endpoint) {
        return this.request('DELETE', endpoint);
    }

    // Content APIs
    async searchContent(query, type = 'multi', page = 1) {
        return this.get(CONFIG.API_ENDPOINTS.SEARCH, { query, type, page });
    }

    async getContentDetails(contentId) {
        return this.get(`${CONFIG.API_ENDPOINTS.CONTENT_DETAILS}/${contentId}`);
    }

    // Recommendation APIs
    async getTrending(type = 'all', limit = 20) {
        return this.get(CONFIG.API_ENDPOINTS.TRENDING, { type, limit });
    }

    async getNewReleases(language = null, type = 'movie', limit = 20) {
        const params = { type, limit };
        if (language) params.language = language;
        return this.get(CONFIG.API_ENDPOINTS.NEW_RELEASES, params);
    }

    async getCriticsChoice(type = 'movie', limit = 20) {
        return this.get(CONFIG.API_ENDPOINTS.CRITICS_CHOICE, { type, limit });
    }

    async getGenreRecommendations(genre, type = 'movie', limit = 20) {
        return this.get(`${CONFIG.API_ENDPOINTS.GENRE}/${genre}`, { type, limit });
    }

    async getRegionalRecommendations(language, type = 'movie', limit = 20) {
        return this.get(`${CONFIG.API_ENDPOINTS.REGIONAL}/${language}`, { type, limit });
    }

    async getAnimeRecommendations(genre = null, limit = 20) {
        const params = { limit };
        if (genre) params.genre = genre;
        return this.get(CONFIG.API_ENDPOINTS.ANIME, params);
    }

    async getSimilarRecommendations(contentId, limit = 20) {
        return this.get(`${CONFIG.API_ENDPOINTS.SIMILAR}/${contentId}`, { limit });
    }

    async getPersonalizedRecommendations(limit = 20) {
        return this.get(CONFIG.API_ENDPOINTS.PERSONALIZED, { limit });
    }

    async getMLPersonalizedRecommendations(limit = 20) {
        return this.get(CONFIG.API_ENDPOINTS.ML_PERSONALIZED, { limit });
    }

    async getAnonymousRecommendations(limit = 20) {
        return this.get(CONFIG.API_ENDPOINTS.ANONYMOUS, { limit });
    }

    async getAdminChoiceRecommendations(type = 'admin_choice', limit = 20) {
        return this.get(CONFIG.API_ENDPOINTS.ADMIN_CHOICE, { type, limit });
    }

    // User APIs
    async getWatchlist() {
        return this.get(CONFIG.API_ENDPOINTS.USER_WATCHLIST);
    }

    async getFavorites() {
        return this.get(CONFIG.API_ENDPOINTS.USER_FAVORITES);
    }

    async recordInteraction(contentId, type, rating = null) {
        const data = { content_id: contentId, interaction_type: type };
        if (rating !== null) data.rating = rating;
        return this.post(CONFIG.API_ENDPOINTS.INTERACTIONS, data);
    }

    // Admin APIs
    async adminSearch(query, source = 'tmdb', page = 1) {
        return this.get(CONFIG.API_ENDPOINTS.ADMIN_SEARCH, { query, source, page });
    }

    async saveExternalContent(contentData) {
        return this.post(CONFIG.API_ENDPOINTS.ADMIN_CONTENT, contentData);
    }

    async createAdminRecommendation(contentId, type, description) {
        return this.post(CONFIG.API_ENDPOINTS.ADMIN_RECOMMENDATIONS, {
            content_id: contentId,
            recommendation_type: type,
            description
        });
    }

    async getAdminRecommendations(page = 1, perPage = 20) {
        return this.get(CONFIG.API_ENDPOINTS.ADMIN_RECOMMENDATIONS, { page, per_page: perPage });
    }

    async getAnalytics() {
        return this.get(CONFIG.API_ENDPOINTS.ADMIN_ANALYTICS);
    }

    async checkMLService() {
        return this.get(CONFIG.API_ENDPOINTS.ADMIN_ML_CHECK);
    }

    async updateMLService() {
        return this.post(CONFIG.API_ENDPOINTS.ADMIN_ML_UPDATE, {});
    }

    async getMLStats() {
        return this.get(CONFIG.API_ENDPOINTS.ADMIN_ML_STATS);
    }

    // Utility Methods
    buildPosterURL(path, size = 'MEDIUM') {
        if (!path) return '/images/placeholder-poster.jpg';
        if (path.startsWith('http')) return path;
        return `${CONFIG.CDN_BASE}${CONFIG.POSTER_SIZES[size]}${path}`;
    }

    buildBackdropURL(path, size = 'MEDIUM') {
        if (!path) return '/images/placeholder-backdrop.jpg';
        if (path.startsWith('http')) return path;
        return `${CONFIG.CDN_BASE}${CONFIG.BACKDROP_SIZES[size]}${path}`;
    }

    buildYouTubeURL(videoId) {
        if (!videoId) return null;
        return `${CONFIG.YOUTUBE_BASE}${videoId}`;
    }

    // Cache Management
    clearCache() {
        this.cache.clear();
        this.retryCount.clear();
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            hitRate: this.calculateHitRate(),
            retryCount: Array.from(this.retryCount.values()).reduce((a, b) => a + b, 0)
        };
    }

    calculateHitRate() {
        // This would need to be tracked during actual usage
        return 0.85; // Placeholder for now
    }
}

// Global API instance
const api = new CineBrainAPI();