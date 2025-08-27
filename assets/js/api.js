// API Client for CineBrain Backend
class ApiClient {
    constructor() {
        this.baseURL = 'https://backend-app-970m.onrender.com/api';
        this.timeout = 15000; // 15 seconds
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second

        // Cache for API responses
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes

        // Request queue for batching
        this.requestQueue = [];
        this.isProcessingQueue = false;
    }

    // Generic API request with retry logic
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const cacheKey = `${url}_${JSON.stringify(options)}`;

        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
            this.cache.delete(cacheKey);
        }

        const requestOptions = {
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        const token = Utils.getStorage('auth_token');
        if (token) {
            requestOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        let lastError;
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(url, {
                    ...requestOptions,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                // Cache successful responses
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });

                return data;
            } catch (error) {
                lastError = error;
                console.warn(`API request attempt ${attempt} failed:`, error.message);

                if (attempt < this.retryAttempts) {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                }
            }
        }

        throw lastError;
    }

    // Authentication APIs
    async login(username, password) {
        const response = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (response.token) {
            Utils.setStorage('auth_token', response.token);
            Utils.setStorage('user_data', response.user);
        }

        return response;
    }

    async register(userData) {
        const response = await this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        if (response.token) {
            Utils.setStorage('auth_token', response.token);
            Utils.setStorage('user_data', response.user);
        }

        return response;
    }

    // Content APIs
    async searchContent(query, type = 'multi', page = 1) {
        const params = new URLSearchParams({
            query,
            type,
            page: page.toString()
        });

        return await this.request(`/search?${params}`);
    }

    async getContentDetails(contentId) {
        return await this.request(`/content/${contentId}`);
    }

    // Recommendation APIs
    async getTrending(type = 'all', limit = 20, region = null) {
        const params = new URLSearchParams({
            type,
            limit: limit.toString()
        });

        if (region) params.append('region', region);

        return await this.request(`/recommendations/trending?${params}`);
    }

    async getNewReleases(language = null, type = 'movie', limit = 20) {
        const params = new URLSearchParams({
            type,
            limit: limit.toString()
        });

        if (language) params.append('language', language);

        return await this.request(`/recommendations/new-releases?${params}`);
    }

    async getCriticsChoice(type = 'movie', limit = 20) {
        const params = new URLSearchParams({
            type,
            limit: limit.toString()
        });

        return await this.request(`/recommendations/critics-choice?${params}`);
    }

    async getGenreRecommendations(genre, type = 'movie', limit = 20, region = null) {
        const params = new URLSearchParams({
            type,
            limit: limit.toString()
        });

        if (region) params.append('region', region);

        return await this.request(`/recommendations/genre/${genre}?${params}`);
    }

    async getRegionalRecommendations(language, type = 'movie', limit = 20) {
        const params = new URLSearchParams({
            type,
            limit: limit.toString()
        });

        return await this.request(`/recommendations/regional/${language}?${params}`);
    }

    async getAnimeRecommendations(genre = null, limit = 20) {
        const params = new URLSearchParams({
            limit: limit.toString()
        });

        if (genre) params.append('genre', genre);

        return await this.request(`/recommendations/anime?${params}`);
    }

    async getSimilarRecommendations(contentId, limit = 20) {
        const params = new URLSearchParams({
            limit: limit.toString()
        });

        return await this.request(`/recommendations/similar/${contentId}?${params}`);
    }

    async getAnonymousRecommendations(limit = 20) {
        const params = new URLSearchParams({
            limit: limit.toString()
        });

        return await this.request(`/recommendations/anonymous?${params}`);
    }

    async getPersonalizedRecommendations(limit = 20) {
        const params = new URLSearchParams({
            limit: limit.toString()
        });

        return await this.request(`/recommendations/personalized?${params}`);
    }

    async getMLPersonalizedRecommendations(limit = 20) {
        const params = new URLSearchParams({
            limit: limit.toString()
        });

        return await this.request(`/recommendations/ml-personalized?${params}`);
    }

    async getAdminChoiceRecommendations(type = 'admin_choice', limit = 20) {
        const params = new URLSearchParams({
            type,
            limit: limit.toString()
        });

        return await this.request(`/recommendations/admin-choice?${params}`);
    }

    // User interaction APIs
    async recordInteraction(contentId, interactionType, rating = null) {
        return await this.request('/interactions', {
            method: 'POST',
            body: JSON.stringify({
                content_id: contentId,
                interaction_type: interactionType,
                rating
            })
        });
    }

    async getWatchlist() {
        return await this.request('/user/watchlist');
    }

    async getFavorites() {
        return await this.request('/user/favorites');
    }

    // Admin APIs
    async adminSearch(query, source = 'tmdb', page = 1) {
        const params = new URLSearchParams({
            query,
            source,
            page: page.toString()
        });

        return await this.request(`/admin/search?${params}`);
    }

    async saveExternalContent(contentData) {
        return await this.request('/admin/content', {
            method: 'POST',
            body: JSON.stringify(contentData)
        });
    }

    async createAdminRecommendation(contentId, recommendationType, description) {
        return await this.request('/admin/recommendations', {
            method: 'POST',
            body: JSON.stringify({
                content_id: contentId,
                recommendation_type: recommendationType,
                description
            })
        });
    }

    async getAdminRecommendations(page = 1, perPage = 20) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString()
        });

        return await this.request(`/admin/recommendations?${params}`);
    }

    async getAnalytics() {
        return await this.request('/admin/analytics');
    }

    async checkMLService() {
        return await this.request('/admin/ml-service-check');
    }

    async updateMLService() {
        return await this.request('/admin/ml-service-update', {
            method: 'POST'
        });
    }

    async getMLStats() {
        return await this.request('/admin/ml-stats');
    }

    // Batch API requests for better performance
    async batchRequests(requests) {
        const promises = requests.map(req => this.request(req.endpoint, req.options));
        return await Promise.allSettled(promises);
    }

    // Preload critical data
    async preloadCriticalData() {
        const criticalRequests = [
            { endpoint: '/recommendations/trending?limit=10' },
            { endpoint: '/recommendations/critics-choice?limit=8' },
            { endpoint: '/recommendations/admin-choice?limit=6' }
        ];

        const results = await this.batchRequests(criticalRequests);

        // Cache results for instant access
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const key = `preload_${criticalRequests[index].endpoint}`;
                Utils.setStorage(key, {
                    data: result.value,
                    timestamp: Date.now()
                });
            }
        });

        return results;
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // Get cache size
    getCacheSize() {
        return this.cache.size;
    }
}

// Global API client instance
window.apiClient = new ApiClient();  