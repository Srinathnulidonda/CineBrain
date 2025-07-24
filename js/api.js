// API Client for CineScope
class APIClient {
    constructor() {
        this.baseURL = 'https://backend-app-970m.onrender.com/api';
        this.token = localStorage.getItem('authToken');
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // HTTP Methods
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    async get(endpoint, params = {}, useCache = true) {
        const queryString = new URLSearchParams(params).toString();
        const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        // Check cache
        if (useCache && this.cache.has(fullEndpoint)) {
            const cached = this.cache.get(fullEndpoint);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const data = await this.request(fullEndpoint);
        
        // Cache the response
        if (useCache) {
            this.cache.set(fullEndpoint, {
                data,
                timestamp: Date.now()
            });
        }

        return data;
    }

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // Authentication
    async login(username, password) {
        const response = await this.post('/login', { username, password });
        if (response.token) {
            this.token = response.token;
            localStorage.setItem('authToken', this.token);
        }
        return response;
    }

    async register(userData) {
        const response = await this.post('/register', userData);
        if (response.token) {
            this.token = response.token;
            localStorage.setItem('authToken', this.token);
        }
        return response;
    }

    async validateToken(token) {
        try {
            return await this.request('/user/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            return null;
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('authToken');
        this.cache.clear();
    }

    // Content Discovery
    async search(query, type = 'multi', page = 1) {
        return this.get('/search', { query, type, page });
    }

    async getContentDetails(contentId) {
        return this.get(`/content/${contentId}`);
    }

    // Recommendations
    async getTrending(type = 'all', limit = 20) {
        const response = await this.get('/recommendations/trending', { type, limit });
        return response.recommendations || [];
    }

    async getPopular(type = 'movie', limit = 20) {
        const response = await this.get('/recommendations/trending', { type, limit });
        return response.recommendations || [];
    }

    async getNewReleases(type = 'movie', limit = 20, language = null) {
        const params = { type, limit };
        if (language) params.language = language;
        const response = await this.get('/recommendations/new-releases', params);
        return response.recommendations || [];
    }

    async getCriticsChoice(type = 'movie', limit = 20) {
        const response = await this.get('/recommendations/critics-choice', { type, limit });
        return response.recommendations || [];
    }

    async getGenreRecommendations(genre, type = 'movie', limit = 20) {
        const response = await this.get(`/recommendations/genre/${genre}`, { type, limit });
        return response.recommendations || [];
    }

    async getRegionalContent(language, type = 'movie', limit = 20) {
        const response = await this.get(`/recommendations/regional/${language}`, { type, limit });
        return response.recommendations || [];
    }

    async getAnime(limit = 20, genre = null) {
        const params = { limit };
        if (genre) params.genre = genre;
        const response = await this.get('/recommendations/anime', params);
        return response.recommendations || [];
    }

    async getSimilarContent(contentId, limit = 20) {
        const response = await this.get(`/recommendations/similar/${contentId}`, { limit });
        return response.recommendations || [];
    }

    async getAnonymousRecommendations(limit = 20) {
        const response = await this.get('/recommendations/anonymous', { limit });
        return response.recommendations || [];
    }

    async getPersonalizedRecommendations(limit = 20) {
        const response = await this.get('/recommendations/personalized', { limit });
        return response.recommendations || [];
    }

    async getMLPersonalizedRecommendations(limit = 20) {
        const response = await this.get('/recommendations/ml-personalized', { limit });
        return response.recommendations || [];
    }

    async getAdminRecommendations(limit = 20, type = 'admin_choice') {
        const response = await this.get('/recommendations/admin-choice', { limit, type });
        return response.recommendations || [];
    }

    // User Interactions
    async recordInteraction(contentId, interactionType, rating = null) {
        return this.post('/interactions', {
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

    async getWatchlist() {
        const response = await this.get('/user/watchlist');
        return response.watchlist || [];
    }

    async getFavorites() {
        const response = await this.get('/user/favorites');
        return response.favorites || [];
    }

    // User Profile
    async getUserProfile() {
        return this.get('/user/profile');
    }

    async updateProfile(profileData) {
        return this.put('/user/profile', profileData);
    }

    // Admin Functions
    async adminSearch(query, source = 'tmdb', page = 1) {
        return this.get('/admin/search', { query, source, page });
    }

    async saveExternalContent(contentData) {
        return this.post('/admin/content', contentData);
    }

    async createAdminRecommendation(contentId, type, description) {
        return this.post('/admin/recommendations', {
            content_id: contentId,
            recommendation_type: type,
            description
        });
    }

    async getAdminRecommendationsList(page = 1, perPage = 20) {
        return this.get('/admin/recommendations', { page, per_page: perPage });
    }

    async getAnalytics() {
        return this.get('/admin/analytics');
    }

    async checkMLService() {
        return this.get('/admin/ml-service-check');
    }

    async forceMLUpdate() {
        return this.post('/admin/ml-service-update');
    }

    async getMLStats() {
        return this.get('/admin/ml-stats');
    }

    // Cache Management
    clearCache() {
        this.cache.clear();
    }

    getCacheSize() {
        return this.cache.size;
    }

    getCacheStats() {
        const entries = Array.from(this.cache.entries());
        const totalSize = entries.length;
        const expired = entries.filter(([key, value]) => 
            Date.now() - value.timestamp > this.cacheTimeout
        ).length;

        return {
            total: totalSize,
            expired,
            valid: totalSize - expired
        };
    }

    // Cleanup expired cache entries
    cleanupCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }
}

// Global API instance
window.API = new APIClient();

// Cleanup cache periodically
setInterval(() => {
    window.API.cleanupCache();
}, 60000); // Every minute