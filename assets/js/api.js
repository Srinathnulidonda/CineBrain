class APIService {
    constructor() {
        this.baseURL = 'https://backend-app-970m.onrender.com/api';
        this.token = localStorage.getItem('authToken');
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        
        // Setup network monitoring
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Helper method to make authenticated requests
    async makeRequest(url, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Unauthorized');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            if (!this.isOnline) {
                // Queue request for when online
                this.requestQueue.push({ url, options });
                throw new Error('Offline - request queued');
            }
            throw error;
        }
    }

    // Process queued requests when back online
    async processQueue() {
        while (this.requestQueue.length > 0) {
            const { url, options } = this.requestQueue.shift();
            try {
                await this.makeRequest(url, options);
            } catch (error) {
                console.error('Failed to process queued request:', error);
            }
        }
    }

    // Handle unauthorized responses
    handleUnauthorized() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        this.token = null;
        
        if (window.location.pathname !== '/login.html') {
            window.location.href = 'login.html';
        }
    }

    // Authentication endpoints
    async login(credentials) {
        const response = await this.makeRequest(`${this.baseURL}/login`, {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (response.token) {
            this.token = response.token;
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('user', JSON.stringify({
                id: response.user_id,
                username: response.username
            }));
        }
        
        return response;
    }

    async register(userData) {
                const response = await this.makeRequest(`${this.baseURL}/register`, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (response.token) {
            this.token = response.token;
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('user', JSON.stringify({
                id: response.user_id,
                username: response.username
            }));
        }
        
        return response;
    }

    async logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        this.token = null;
        window.location.href = 'index.html';
    }

    // Content endpoints
    async getHomepage() {
        return await this.makeRequest(`${this.baseURL}/homepage`);
    }

    async getRecommendations() {
        return await this.makeRequest(`${this.baseURL}/recommendations`);
    }

    async getPersonalizedRecommendations() {
        return await this.makeRequest(`${this.baseURL}/recommendations/personalized`);
    }

    async getContentDetails(contentId) {
        return await this.makeRequest(`${this.baseURL}/content/${contentId}/details`);
    }

    async searchContent(query, type = 'movie') {
        const params = new URLSearchParams({ q: query, type });
        return await this.makeRequest(`${this.baseURL}/search?${params}`);
    }

    // User interaction endpoints
    async recordInteraction(data) {
        return await this.makeRequest(`${this.baseURL}/interact`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async rateContent(contentId, rating) {
        return await this.recordInteraction({
            content_id: contentId,
            interaction_type: 'rating',
            rating: rating
        });
    }

    async addToWishlist(contentId) {
        return await this.recordInteraction({
            content_id: contentId,
            interaction_type: 'wishlist'
        });
    }

    async markAsFavorite(contentId) {
        return await this.recordInteraction({
            content_id: contentId,
            interaction_type: 'favorite'
        });
    }

    async recordView(contentId) {
        return await this.recordInteraction({
            content_id: contentId,
            interaction_type: 'view'
        });
    }

    // Admin endpoints
    async adminBrowseContent(params = {}) {
        const queryParams = new URLSearchParams(params);
        return await this.makeRequest(`${this.baseURL}/admin/enhanced-browse?${queryParams}`);
    }

    async adminCreatePost(postData) {
        return await this.makeRequest(`${this.baseURL}/admin/create-post`, {
            method: 'POST',
            body: JSON.stringify(postData)
        });
    }

    async adminGetPosts() {
        return await this.makeRequest(`${this.baseURL}/admin/posts`);
    }

    async adminUpdatePost(postId, postData) {
        return await this.makeRequest(`${this.baseURL}/admin/posts/${postId}`, {
            method: 'PUT',
            body: JSON.stringify(postData)
        });
    }

    async adminDeletePost(postId) {
        return await this.makeRequest(`${this.baseURL}/admin/posts/${postId}`, {
            method: 'DELETE'
        });
    }

    async adminGetAnalytics() {
        return await this.makeRequest(`${this.baseURL}/admin/analytics`);
    }

    async adminGetSystemStatus() {
        return await this.makeRequest(`${this.baseURL}/admin/system-status`);
    }

    async adminSyncContent() {
        return await this.makeRequest(`${this.baseURL}/enhanced-sync`, {
            method: 'POST'
        });
    }

    // Utility methods
    isAuthenticated() {
        return !!this.token;
    }

    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    // Cache management
    async getCachedData(key) {
        try {
            const cached = localStorage.getItem(`cache_${key}`);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                const now = Date.now();
                const fiveMinutes = 5 * 60 * 1000;
                
                if (now - timestamp < fiveMinutes) {
                    return data;
                }
            }
        } catch (error) {
            console.error('Cache read error:', error);
        }
        return null;
    }

    setCachedData(key, data) {
        try {
            const cacheData = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Cache write error:', error);
        }
    }

    clearCache() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
    }
}

// Create global API instance
const api = new APIService();