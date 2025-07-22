// API Configuration and Helper Functions
class APIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.token = null;
        this.loadToken();
    }

    loadToken() {
        this.token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    }

    saveToken(token, remember = false) {
        this.token = token;
        if (remember) {
            localStorage.setItem('authToken', token);
        } else {
            sessionStorage.setItem('authToken', token);
        }
    }

    clearToken() {
        this.token = null;
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('authToken');
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options,
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.clearToken();
                    window.location.href = '/login';
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error('API Request failed:', error);
            return { success: false, error: error.message };
        }
    }

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Initialize API client
const API = new APIClient('https://backend-app-970m.onrender.com/api');

// API Methods
const ApiService = {
    // Authentication
    async login(credentials) {
        return await API.post('/login', credentials);
    },

    async register(userData) {
        return await API.post('/register', userData);
    },

    // Content Discovery
    async search(query, type = 'multi', page = 1) {
        return await API.get(`/search?query=${encodeURIComponent(query)}&type=${type}&page=${page}`);
    },

    async getContentDetails(contentId) {
        return await API.get(`/content/${contentId}`);
    },

    // Recommendations
    async getTrending(type = 'all', limit = 20) {
        return await API.get(`/recommendations/trending?type=${type}&limit=${limit}`);
    },

    async getNewReleases(language = null, type = 'movie', limit = 20) {
        const params = new URLSearchParams({ type, limit });
        if (language) params.append('language', language);
        return await API.get(`/recommendations/new-releases?${params}`);
    },

    async getCriticsChoice(type = 'movie', limit = 20) {
        return await API.get(`/recommendations/critics-choice?type=${type}&limit=${limit}`);
    },

    async getGenreRecommendations(genre, type = 'movie', limit = 20) {
        return await API.get(`/recommendations/genre/${genre}?type=${type}&limit=${limit}`);
    },

    async getRegionalContent(language, type = 'movie', limit = 20) {
        return await API.get(`/recommendations/regional/${language}?type=${type}&limit=${limit}`);
    },

    async getAnimeRecommendations(genre = null, limit = 20) {
        const params = new URLSearchParams({ limit });
        if (genre) params.append('genre', genre);
        return await API.get(`/recommendations/anime?${params}`);
    },

    async getSimilarContent(contentId, limit = 20) {
        return await API.get(`/recommendations/similar/${contentId}?limit=${limit}`);
    },

    async getPersonalizedRecommendations(limit = 20) {
        return await API.get(`/recommendations/personalized?limit=${limit}`);
    },

    async getAnonymousRecommendations(limit = 20) {
        return await API.get(`/recommendations/anonymous?limit=${limit}`);
    },

    async getAdminChoice(limit = 20) {
        return await API.get(`/recommendations/admin-choice?limit=${limit}`);
    },

    // User Interactions
    async recordInteraction(contentId, interactionType, rating = null) {
        return await API.post('/interactions', {
            content_id: contentId,
            interaction_type: interactionType,
            rating
        });
    },

    async getWatchlist() {
        return await API.get('/user/watchlist');
    },

    async getFavorites() {
        return await API.get('/user/favorites');
    },

    // Admin APIs
    async adminSearch(query, source = 'tmdb', page = 1) {
        return await API.get(`/admin/search?query=${encodeURIComponent(query)}&source=${source}&page=${page}`);
    },

    async saveExternalContent(contentData) {
        return await API.post('/admin/content', contentData);
    },

    async createAdminRecommendation(contentId, type, description) {
        return await API.post('/admin/recommendations', {
            content_id: contentId,
            recommendation_type: type,
            description
        });
    },

    async getAdminRecommendations(page = 1, perPage = 20) {
        return await API.get(`/admin/recommendations?page=${page}&per_page=${perPage}`);
    },

    async getAnalytics() {
        return await API.get('/admin/analytics');
    },

    async checkMLService() {
        return await API.get('/admin/ml-service-check');
    },

    async updateMLService() {
        return await API.post('/admin/ml-service-update');
    }
};

// Error handling utility
window.handleApiError = function(error, defaultMessage = 'An error occurred') {
    const message = error?.message || defaultMessage;
    showToast(message, 'error');
    console.error('API Error:', error);
};

// Export for use in other files
window.ApiService = ApiService;
window.API = API;