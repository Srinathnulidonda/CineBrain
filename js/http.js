// HTTP Client
class HttpClient {
    constructor() {
        this.baseURL = CONFIG.API_BASE;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    // Get authorization header
    getAuthHeader() {
        const token = storage.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    // Generic request method
    async request(url, options = {}) {
        const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

        const config = {
            ...options,
            headers: {
                ...this.defaultHeaders,
                ...this.getAuthHeader(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(fullUrl, config);

            // Handle unauthorized
            if (response.status === 401) {
                storage.removeToken();
                storage.removeUser();
                window.location.href = CONFIG.ROUTES.LOGIN;
                throw new Error('Unauthorized');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('HTTP Error:', error);
            throw error;
        }
    }

    // GET request
    async get(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const urlWithParams = queryString ? `${url}?${queryString}` : url;

        // Check cache for GET requests
        const cacheKey = `GET:${urlWithParams}`;
        const cached = storage.getCachedData(cacheKey);
        if (cached) {
            return cached;
        }

        const data = await this.request(urlWithParams, {
            method: 'GET'
        });

        // Cache successful GET requests
        storage.setCachedData(cacheKey, data);
        return data;
    }

    // POST request
    async post(url, body = {}) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    // PUT request
    async put(url, body = {}) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    // DELETE request
    async delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    }

    // Auth endpoints
    async login(username, password) {
        const data = await this.post('/login', { username, password });
        if (data.token) {
            storage.setToken(data.token);
            storage.setUser(data.user);
        }
        return data;
    }

    async register(userData) {
        const data = await this.post('/register', userData);
        if (data.token) {
            storage.setToken(data.token);
            storage.setUser(data.user);
        }
        return data;
    }

    async logout() {
        storage.removeToken();
        storage.removeUser();
        storage.clearCache();
        window.location.href = CONFIG.ROUTES.LOGIN;
    }

    // Content endpoints
    async search(query, type = 'multi', page = 1) {
        return this.get('/search', { query, type, page });
    }

    async getContentDetails(contentId) {
        return this.get(`/content/${contentId}`);
    }

    async getRecommendations(type, params = {}) {
        return this.get(`/recommendations/${type}`, params);
    }

    async getTrending(params = {}) {
        return this.get('/recommendations/trending', params);
    }

    async getNewReleases(params = {}) {
        return this.get('/recommendations/new-releases', params);
    }

    async getCriticsChoice(params = {}) {
        return this.get('/recommendations/critics-choice', params);
    }

    async getGenreRecommendations(genre, params = {}) {
        return this.get(`/recommendations/genre/${genre}`, params);
    }

    async getRegionalRecommendations(language, params = {}) {
        return this.get(`/recommendations/regional/${language}`, params);
    }

    async getAnimeRecommendations(params = {}) {
        return this.get('/recommendations/anime', params);
    }

    async getSimilarContent(contentId, params = {}) {
        return this.get(`/recommendations/similar/${contentId}`, params);
    }

    async getAdminChoice(params = {}) {
        return this.get('/recommendations/admin-choice', params);
    }

    // User endpoints
    async recordInteraction(contentId, interactionType, rating = null) {
        return this.post('/interactions', {
            content_id: contentId,
            interaction_type: interactionType,
            rating
        });
    }

    async getWatchlist() {
        return this.get('/user/watchlist');
    }

    async getFavorites() {
        return this.get('/user/favorites');
    }

    async addToWatchlist(contentId) {
        return this.recordInteraction(contentId, 'watchlist');
    }

    async addToFavorites(contentId) {
        return this.recordInteraction(contentId, 'favorite');
    }

    // Admin endpoints
    async adminSearch(query, source = 'tmdb', page = 1) {
        return this.get('/admin/search', { query, source, page });
    }

    async saveAdminContent(contentData) {
        return this.post('/admin/content', contentData);
    }

    async createAdminRecommendation(recommendationData) {
        return this.post('/admin/recommendations', recommendationData);
    }

    async getAdminRecommendations(page = 1, perPage = 20) {
        return this.get('/admin/recommendations', { page, per_page: perPage });
    }

    async getAnalytics() {
        return this.get('/admin/analytics');
    }

    async checkMLService() {
        return this.get('/admin/ml-service-check');
    }

    async updateMLService() {
        return this.post('/admin/ml-service-update');
    }

    async getMLStats() {
        return this.get('/admin/ml-stats');
    }
}

// Create global instance
window.api = new HttpClient();