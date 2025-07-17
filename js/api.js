// API Configuration
const API_CONFIG = {
    BASE_URL: 'https://backend-app-970m.onrender.com/api',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};

class APIService {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.token = localStorage.getItem('auth_token');
        this.refreshToken = localStorage.getItem('refresh_token');
    }

    // Get authorization headers
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Generic HTTP request method with retry logic
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            timeout: API_CONFIG.TIMEOUT,
            headers: this.getHeaders(options.auth !== false),
            ...options
        };

        let lastError;
        for (let attempt = 1; attempt <= API_CONFIG.RETRY_ATTEMPTS; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);

                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    if (response.status === 401) {
                        await this.handleUnauthorized();
                        throw new Error('Unauthorized');
                    }
                    
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                lastError = error;
                
                if (attempt < API_CONFIG.RETRY_ATTEMPTS && this.shouldRetry(error)) {
                    await this.delay(API_CONFIG.RETRY_DELAY * attempt);
                    continue;
                }
                
                throw error;
            }
        }

        throw lastError;
    }

    // Check if error should trigger a retry
    shouldRetry(error) {
        return error.name === 'AbortError' || 
               error.message.includes('network') ||
               error.message.includes('timeout');
    }

    // Delay utility for retries
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Handle unauthorized responses
    async handleUnauthorized() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        this.token = null;
        
        if (window.location.pathname !== '/login.html' && window.location.pathname !== '/') {
            window.location.href = '/login.html';
        }
    }

    // Authentication Methods
    async login(credentials) {
        try {
            const response = await this.request('/login', {
                method: 'POST',
                body: JSON.stringify(credentials),
                auth: false
            });

            if (response.token) {
                this.token = response.token;
                localStorage.setItem('auth_token', response.token);
                localStorage.setItem('user_data', JSON.stringify({
                    id: response.user_id,
                    username: response.username
                }));
            }

            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw new Error(error.message || 'Login failed');
        }
    }

    async register(userData) {
        try {
            const response = await this.request('/register', {
                method: 'POST',
                body: JSON.stringify(userData),
                auth: false
            });

            if (response.token) {
                this.token = response.token;
                localStorage.setItem('auth_token', response.token);
                localStorage.setItem('user_data', JSON.stringify({
                    id: response.user_id,
                    username: response.username
                }));
            }

            return response;
        } catch (error) {
            console.error('Registration error:', error);
            throw new Error(error.message || 'Registration failed');
        }
    }

    // Content Methods
    async getHomepage() {
        try {
            return await this.request('/homepage', { auth: false });
        } catch (error) {
            console.error('Homepage fetch error:', error);
            throw new Error('Failed to load homepage content');
        }
    }

    async getRecommendations() {
        try {
            return await this.request('/recommendations');
        } catch (error) {
            console.error('Recommendations fetch error:', error);
            throw new Error('Failed to load recommendations');
        }
    }

    async getPersonalizedRecommendations() {
        try {
            return await this.request('/recommendations/personalized');
        } catch (error) {
            console.error('Personalized recommendations fetch error:', error);
            throw new Error('Failed to load personalized recommendations');
        }
    }

    async getContentDetails(contentId) {
        try {
            return await this.request(`/content/${contentId}`, { auth: false });
        } catch (error) {
            console.error('Content details fetch error:', error);
            throw new Error('Failed to load content details');
        }
    }

    async getEnhancedContentDetails(contentId) {
        try {
            return await this.request(`/content/${contentId}/details`, { auth: false });
        } catch (error) {
            console.error('Enhanced content details fetch error:', error);
            throw new Error('Failed to load enhanced content details');
        }
    }

    async searchContent(query, type = 'movie') {
        try {
            const params = new URLSearchParams({ q: query, type });
            return await this.request(`/search?${params}`, { auth: false });
        } catch (error) {
            console.error('Search error:', error);
            throw new Error('Search failed');
        }
    }

    // User Interaction Methods
    async recordInteraction(data) {
        try {
            return await this.request('/interact', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.error('Interaction recording error:', error);
            throw new Error('Failed to record interaction');
        }
    }

    async addToWatchlist(contentId) {
        return this.recordInteraction({
            content_id: contentId,
            interaction_type: 'wishlist'
        });
    }

    async addToFavorites(contentId) {
        return this.recordInteraction({
            content_id: contentId,
            interaction_type: 'favorite'
        });
    }

    async rateContent(contentId, rating) {
        return this.recordInteraction({
            content_id: contentId,
            interaction_type: 'view',
            rating: rating
        });
    }

    async markAsWatched(contentId) {
        return this.recordInteraction({
            content_id: contentId,
            interaction_type: 'view'
        });
    }

    // Admin Methods
    async adminBrowseContent(params = {}) {
        try {
            const queryParams = new URLSearchParams(params);
            return await this.request(`/admin/enhanced-browse?${queryParams}`);
        } catch (error) {
            console.error('Admin browse error:', error);
            throw new Error('Failed to browse admin content');
        }
    }

    async adminCreatePost(postData) {
        try {
            return await this.request('/admin/create-post', {
                method: 'POST',
                body: JSON.stringify(postData)
            });
        } catch (error) {
            console.error('Admin post creation error:', error);
            throw new Error('Failed to create admin post');
        }
    }

    async adminGetPosts() {
        try {
            return await this.request('/admin/posts');
        } catch (error) {
            console.error('Admin posts fetch error:', error);
            throw new Error('Failed to fetch admin posts');
        }
    }

    async adminUpdatePost(postId, updateData) {
        try {
            return await this.request(`/admin/posts/${postId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
        } catch (error) {
            console.error('Admin post update error:', error);
            throw new Error('Failed to update admin post');
        }
    }

    async adminDeletePost(postId) {
        try {
            return await this.request(`/admin/posts/${postId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Admin post delete error:', error);
            throw new Error('Failed to delete admin post');
        }
    }

    async adminGetAnalytics() {
        try {
            return await this.request('/admin/analytics');
        } catch (error) {
            console.error('Admin analytics fetch error:', error);
            throw new Error('Failed to fetch analytics');
        }
    }

    async adminGetSystemStatus() {
        try {
            return await this.request('/admin/system-status');
        } catch (error) {
            console.error('System status fetch error:', error);
            throw new Error('Failed to fetch system status');
        }
    }

    async adminSyncContent() {
        try {
            return await this.request('/admin/enhanced-sync', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Content sync error:', error);
            throw new Error('Failed to sync content');
        }
    }

    // Utility Methods
    isAuthenticated() {
        return !!this.token && !!localStorage.getItem('user_data');
    }

    getCurrentUser() {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    }

    logout() {
        this.token = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        window.location.href = '/login.html';
    }

    // Network status monitoring
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            console.log('Network: Online');
            this.showNetworkStatus('Connected', 'success');
        });

        window.addEventListener('offline', () => {
            console.log('Network: Offline');
            this.showNetworkStatus('Offline', 'error');
        });
    }

    showNetworkStatus(message, type) {
        const notification = document.createElement('div');
        notification.className = `network-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Request caching for frequently accessed data
    cache = new Map();
    
    async getCachedRequest(key, fetcher, ttl = 300000) { // 5 minutes default TTL
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.data;
        }

        try {
            const data = await fetcher();
            this.cache.set(key, {
                data,
                timestamp: Date.now()
            });
            return data;
        } catch (error) {
            // Return cached data if available, even if stale
            if (cached) {
                console.warn('Using stale cache due to error:', error.message);
                return cached.data;
            }
            throw error;
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

// Create global API instance
const API = new APIService();

// Initialize network monitoring
API.setupNetworkMonitoring();

export default API;