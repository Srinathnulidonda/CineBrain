// API Service Layer
class ApiService {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.cache = new Map();
    }

    // Helper method for requests
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = AuthService.getToken();

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                if (response.status === 401) {
                    AuthService.logout();
                    window.location.href = '/';
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Auth endpoints
    async login(credentials) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async register(userData) {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // Content endpoints
    async getHomepage() {
        const cacheKey = 'homepage';
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const data = await this.request('/homepage');
        this.setCache(cacheKey, data);
        return data;
    }

    async getPersonalizedRecommendations() {
        return this.request('/recommendations/personalized');
    }

    async getContentDetails(contentId) {
        const cacheKey = `content_${contentId}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const data = await this.request(`/content/${contentId}/details`);
        this.setCache(cacheKey, data);
        return data;
    }

    async searchContent(query, type = 'movie') {
        return this.request(`/search?q=${encodeURIComponent(query)}&type=${type}`);
    }

    async recordInteraction(contentId, interactionType, rating = null) {
        return this.request('/interact', {
            method: 'POST',
            body: JSON.stringify({
                content_id: contentId,
                interaction_type: interactionType,
                rating
            })
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

    async adminUpdatePost(postId, updateData) {
        return this.request(`/admin/posts/${postId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
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

    async adminGetSystemStatus() {
        return this.request('/admin/system-status');
    }

    // Cache management
    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }
}

// Create singleton instance
const API = new ApiService();