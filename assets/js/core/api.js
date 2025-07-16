class APIClient {
    constructor() {
        this.baseURL = this.getBaseURL();
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    getBaseURL() {
        // Detect environment and return appropriate base URL
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://127.0.0.1:5000';
        }
        return 'https://backend-app-970m.onrender.com';
    }

    getAuthHeaders() {
        const token = StorageManager.get('token');
        if (token) {
            return {
                ...this.defaultHeaders,
                'Authorization': `Bearer ${token}`
            };
        }
        return this.defaultHeaders;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = options.authenticated ? this.getAuthHeaders() : this.defaultHeaders;
        
        const config = {
            headers,
            ...options,
            credentials: 'include'
        };

        // Remove custom properties
        delete config.authenticated;

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new APIError(
                    errorData.error || `HTTP ${response.status}`,
                    response.status,
                    errorData
                );
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new APIError('Network error - please check your connection', 0);
            }
            
            throw new APIError('An unexpected error occurred', 0);
        }
    }

    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET',
            authenticated: true
        });
    }

    async post(endpoint, data = {}, authenticated = true) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
            authenticated
        });
    }

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
            authenticated: true
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE',
            authenticated: true
        });
    }

    // Authentication endpoints
    async login(credentials) {
        return this.post('/api/login', credentials, false);
    }

    async register(userData) {
        return this.post('/api/register', userData, false);
    }

    // Content endpoints
    async getHomepage() {
        return this.get('/api/homepage');
    }

    async getPersonalizedRecommendations() {
        return this.get('/api/recommendations/personalized');
    }

    async getContentDetails(contentId) {
        return this.get(`/api/content/${contentId}/details`);
    }

    async searchContent(query, type = 'movie') {
        return this.get('/api/search', { q: query, type });
    }

    // User interaction endpoints
    async addToWatchlist(contentId) {
        return this.post('/api/interact', {
            content_id: contentId,
            interaction_type: 'wishlist'
        });
    }

    async addToFavorites(contentId) {
        return this.post('/api/interact', {
            content_id: contentId,
            interaction_type: 'favorite'
        });
    }

    async rateContent(contentId, rating) {
        return this.post('/api/interact', {
            content_id: contentId,
            interaction_type: 'rating',
            rating: rating
        });
    }

    async getUserWatchlist() {
        return this.get('/api/user/watchlist');
    }

    async getUserFavorites() {
        return this.get('/api/user/favorites');
    }

    // Admin endpoints
    async getAdminAnalytics() {
        return this.get('/api/admin/analytics');
    }

    async getAdminPosts() {
        return this.get('/api/admin/posts');
    }

    async createAdminPost(postData) {
        return this.post('/api/admin/create-post', postData);
    }

    async updateAdminPost(postId, postData) {
        return this.put(`/api/admin/posts/${postId}`, postData);
    }

    async deleteAdminPost(postId) {
        return this.delete(`/api/admin/posts/${postId}`);
    }

    async browseContent(params = {}) {
        return this.get('/api/admin/enhanced-browse', params);
    }

    async syncContent() {
        return this.post('/api/enhanced-sync', {});
    }

    async getSystemStatus() {
        return this.get('/api/admin/system-status');
    }
}

class APIError extends Error {
    constructor(message, status, data = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Export for use in other modules
window.APIClient = APIClient;
window.APIError = APIError;