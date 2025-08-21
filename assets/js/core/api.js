// HTTP Client and API Integration
class API {
    constructor() {
        this.baseURL = Config.API_BASE;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    // Set authorization header
    setAuthToken(token) {
        if (token) {
            this.defaultHeaders['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.defaultHeaders['Authorization'];
        }
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.defaultHeaders,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Authentication APIs
    async login(username, password) {
        return this.post(Config.ENDPOINTS.LOGIN, { username, password });
    }

    async register(userData) {
        return this.post(Config.ENDPOINTS.REGISTER, userData);
    }

    // Content APIs
    async search(query, type = 'multi', page = 1) {
        return this.get(Config.ENDPOINTS.SEARCH, { query, type, page });
    }

    async getContentDetails(contentId) {
        return this.get(`${Config.ENDPOINTS.CONTENT_DETAILS}/${contentId}`);
    }

    // Recommendation APIs
    async getTrending(type = 'all', limit = 20) {
        return this.get(Config.ENDPOINTS.TRENDING, { type, limit });
    }

    async getNewReleases(language = null, type = 'movie', limit = 20) {
        const params = { type, limit };
        if (language) params.language = language;
        return this.get(Config.ENDPOINTS.NEW_RELEASES, params);
    }

    async getCriticsChoice(type = 'movie', limit = 20) {
        return this.get(Config.ENDPOINTS.CRITICS_CHOICE, { type, limit });
    }

    async getGenreRecommendations(genre, type = 'movie', limit = 20) {
        return this.get(`${Config.ENDPOINTS.GENRE}/${genre}`, { type, limit });
    }

    async getRegionalContent(language, type = 'movie', limit = 20) {
        return this.get(`${Config.ENDPOINTS.REGIONAL}/${language}`, { type, limit });
    }

    async getAnimeRecommendations(genre = null, limit = 20) {
        const params = { limit };
        if (genre) params.genre = genre;
        return this.get(Config.ENDPOINTS.ANIME, params);
    }

    async getSimilarContent(contentId, limit = 20) {
        return this.get(`${Config.ENDPOINTS.SIMILAR}/${contentId}`, { limit });
    }

    async getPersonalizedRecommendations(limit = 20) {
        return this.get(Config.ENDPOINTS.PERSONALIZED, { limit });
    }

    async getAnonymousRecommendations(limit = 20) {
        return this.get(Config.ENDPOINTS.ANONYMOUS, { limit });
    }

    async getAdminChoice(limit = 20) {
        return this.get(Config.ENDPOINTS.ADMIN_CHOICE, { limit });
    }

    // User Interaction APIs
    async recordInteraction(contentId, interactionType, rating = null) {
        const data = { content_id: contentId, interaction_type: interactionType };
        if (rating) data.rating = rating;
        return this.post(Config.ENDPOINTS.INTERACTIONS, data);
    }

    async getWatchlist() {
        return this.get(Config.ENDPOINTS.WATCHLIST);
    }

    async getFavorites() {
        return this.get(Config.ENDPOINTS.FAVORITES);
    }

    // Admin APIs
    async adminSearch(query, source = 'tmdb', page = 1) {
        return this.get(Config.ENDPOINTS.ADMIN_SEARCH, { query, source, page });
    }

    async saveAdminContent(contentData) {
        return this.post(Config.ENDPOINTS.ADMIN_CONTENT, contentData);
    }

    async createAdminRecommendation(data) {
        return this.post(Config.ENDPOINTS.ADMIN_RECOMMENDATIONS, data);
    }

    async getAdminRecommendations(page = 1, perPage = 20) {
        return this.get(Config.ENDPOINTS.ADMIN_RECOMMENDATIONS, { page, per_page: perPage });
    }

    async getAnalytics() {
        return this.get(Config.ENDPOINTS.ADMIN_ANALYTICS);
    }
}

// Create global API instance
const api = new API();