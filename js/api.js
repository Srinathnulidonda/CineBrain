// API service for backend communication
const API_BASE = 'https://backend-app-970m.onrender.com/api';

class APIService {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.baseURL = API_BASE;
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

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
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
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication endpoints
    async login(credentials) {
        const response = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async register(userData) {
        const response = await this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async logout() {
        this.setToken(null);
        return { success: true };
    }

    // Content endpoints
    async getHomepage() {
        return await this.request('/homepage');
    }

    async getRecommendations() {
        return await this.request('/recommendations');
    }

    async getPersonalizedRecommendations() {
        return await this.request('/recommendations/personalized');
    }

    async getContentDetails(contentId) {
        return await this.request(`/content/${contentId}/details`);
    }

    async searchContent(query, type = 'movie') {
        const params = new URLSearchParams({ q: query, type });
        return await this.request(`/search?${params}`);
    }

    // User interactions
    async recordInteraction(data) {
        return await this.request('/interact', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Admin endpoints
    async adminBrowseContent(params = {}) {
        const queryParams = new URLSearchParams(params);
        return await this.request(`/admin/enhanced-browse?${queryParams}`);
    }

    async adminCreatePost(postData) {
        return await this.request('/admin/create-post', {
            method: 'POST',
            body: JSON.stringify(postData),
        });
    }

    async adminGetPosts() {
        return await this.request('/admin/posts');
    }

    async adminUpdatePost(postId, data) {
        return await this.request(`/admin/posts/${postId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async adminDeletePost(postId) {
        return await this.request(`/admin/posts/${postId}`, {
            method: 'DELETE',
        });
    }

    async adminGetAnalytics() {
        return await this.request('/admin/analytics');
    }

    async adminGetSystemStatus() {
        return await this.request('/admin/system-status');
    }

    async adminSyncContent() {
        return await this.request('/enhanced-sync', {
            method: 'POST',
        });
    }

    // Utility methods
    isAuthenticated() {
        return !!this.token;
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.baseURL}/../health`);
            return response.ok;
        } catch {
            return false;
        }
    }
}

// Create global API instance
window.apiService = new APIService();