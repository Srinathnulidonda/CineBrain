// API Service Class
class APIService {
    constructor() {
        this.baseURL = 'https://backend-app-970m.onrender.com/api';
        this.token = localStorage.getItem('authToken');
        this.headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            this.headers['Authorization'] = `Bearer ${this.token}`;
        }
    }
    
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
            this.headers['Authorization'] = `Bearer ${token}`;
        } else {
            localStorage.removeItem('authToken');
            delete this.headers['Authorization'];
        }
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.headers,
                ...options.headers
            }
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
    
    // Authentication endpoints
    async login(credentials) {
        const response = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (response.token) {
            this.setToken(response.token);
            localStorage.setItem('userId', response.user_id);
            localStorage.setItem('username', response.username);
        }
        
        return response;
    }
    
    async register(userData) {
        const response = await this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (response.token) {
            this.setToken(response.token);
            localStorage.setItem('userId', response.user_id);
            localStorage.setItem('username', response.username);
        }
        
        return response;
    }
    
    logout() {
        this.setToken(null);
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        window.location.href = '/';
    }
    
    // Content endpoints
    async getHomepage() {
        return this.request('/homepage');
    }
    
    async getRecommendations() {
        return this.request('/recommendations');
    }
    
    async getPersonalizedRecommendations() {
        return this.request('/recommendations/personalized');
    }
    
    async getContentDetails(contentId) {
        return this.request(`/content/${contentId}/details`);
    }
    
    async searchContent(query, type = '') {
        const params = new URLSearchParams({ q: query });
        if (type) params.append('type', type);
        return this.request(`/search?${params}`);
    }
    
    // User interaction endpoints
    async recordInteraction(data) {
        return this.request('/interact', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    // Admin endpoints
    async adminBrowseContent(params) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/admin/enhanced-browse?${queryString}`);
    }
    
    async adminCreatePost(postData) {
        return this.request('/admin/create-post', {
            method: 'POST',
            body: JSON.stringify(postData)
        });
    }
    
    async adminGetPosts() {
        return this.request('/admin/posts');
    }
    
    async adminUpdatePost(postId, data) {
        return this.request(`/admin/posts/${postId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async adminDeletePost(postId) {
        return this.request(`/admin/posts/${postId}`, {
            method: 'DELETE'
        });
    }
    
    async adminGetAnalytics() {
        return this.request('/admin/analytics');
    }
    
    async adminSystemStatus() {
        return this.request('/admin/system-status');
    }
    
    async adminSyncContent() {
        return this.request('/admin/enhanced-sync', {
            method: 'POST'
        });
    }
}

// Create global API instance
window.api = new APIService();
