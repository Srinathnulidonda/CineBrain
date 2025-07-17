const API_BASE = 'https://backend-app-970m.onrender.com/api';

class APIService {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.updateAuthHeaders();
    }

    updateAuthHeaders() {
        this.baseHeaders = {
            'Content-Type': 'application/json',
            'Authorization': this.token ? `Bearer ${this.token}` : ''
        };
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            headers: this.baseHeaders,
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async login(credentials) {
        const data = await this.makeRequest('/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (data.token) {
            this.token = data.token;
            localStorage.setItem('auth_token', this.token);
            this.updateAuthHeaders();
        }
        
        return data;
    }

    async register(userData) {
        return await this.makeRequest('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async getHomepage() {
        return await this.makeRequest('/homepage');
    }

    async getPersonalizedRecommendations() {
        return await this.makeRequest('/recommendations/personalized');
    }

    async getRecommendations() {
        return await this.makeRequest('/recommendations');
    }

    async getContentDetails(contentId) {
        return await this.makeRequest(`/content/${contentId}/details`);
    }

    async searchContent(query, type = 'movie') {
        return await this.makeRequest(`/search?q=${encodeURIComponent(query)}&type=${type}`);
    }

    async recordInteraction(data) {
        return await this.makeRequest('/interact', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async adminBrowseContent(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.makeRequest(`/admin/enhanced-browse?${queryString}`);
    }

    async adminCreatePost(data) {
        return await this.makeRequest('/admin/create-post', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async adminGetPosts() {
        return await this.makeRequest('/admin/posts');
    }

    async adminGetAnalytics() {
        return await this.makeRequest('/admin/analytics');
    }

    async adminGetSystemStatus() {
        return await this.makeRequest('/admin/system-status');
    }

    async enhancedSync() {
        return await this.makeRequest('/enhanced-sync', {
            method: 'POST'
        });
    }
}

const api = new APIService();