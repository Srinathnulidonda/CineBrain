class APIService {
    constructor() {
        this.baseURL = 'https://backend-app-970m.onrender.com/api';
        this.token = localStorage.getItem('authToken');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

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

    // Authentication
    async login(credentials) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    }

    async register(userData) {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    // Content
    async getHomepage() {
        return this.request('/homepage');
    }

    async getRecommendations() {
        return this.request('/recommendations');
    }

    async getContentDetails(id) {
        return this.request(`/content/${id}/details`);
    }

    async searchContent(query, type = 'movie') {
        return this.request(`/search?q=${encodeURIComponent(query)}&type=${type}`);
    }

    // User interactions
    async recordInteraction(data) {
        return this.request('/interact', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Admin
    async adminBrowseContent(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/admin/enhanced-browse?${queryString}`);
    }

    async adminCreatePost(postData) {
        return this.request('/admin/create-post', {
            method: 'POST',
            body: JSON.stringify(postData),
        });
    }

    async adminGetPosts() {
        return this.request('/admin/posts');
    }

    async adminGetAnalytics() {
        return this.request('/admin/analytics');
    }

    updateToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }
}

const apiService = new APIService();