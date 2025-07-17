// API Configuration and Communication
class API {
    constructor() {
        this.baseURL = 'https://backend-app-970m.onrender.com/api';
        this.token = null;
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Setup network monitoring
        this.setupNetworkMonitoring();
        
        // Setup request interceptors
        this.setupInterceptors();
    }
    
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processRequestQueue();
            this.showToast('Connection restored', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showToast('You are offline. Some features may be limited.', 'info');
        });
    }
    
    setupInterceptors() {
        // Add auth token to requests
        this.addRequestInterceptor((config) => {
            if (this.token) {
                config.headers = {
                    ...config.headers,
                    'Authorization': `Bearer ${this.token}`
                };
            }
            return config;
        });
        
        // Handle response errors
        this.addResponseInterceptor(
            (response) => response,
            (error) => {
                if (error.status === 401) {
                    this.handleAuthError();
                }
                return Promise.reject(error);
            }
        );
    }
    
    addRequestInterceptor(interceptor) {
        this.requestInterceptor = interceptor;
    }
    
    addResponseInterceptor(successHandler, errorHandler) {
        this.responseSuccessHandler = successHandler;
        this.responseErrorHandler = errorHandler;
    }
    
    async request(endpoint, options = {}) {
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        // Apply request interceptor
        if (this.requestInterceptor) {
            Object.assign(config, this.requestInterceptor(config));
        }
        
        const url = `${this.baseURL}${endpoint}`;
        const cacheKey = `${config.method}:${url}:${JSON.stringify(config.body || {})}`;
        
        // Check cache for GET requests
        if (config.method === 'GET' && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        // Handle offline requests
        if (!this.isOnline && config.method !== 'GET') {
            return this.queueRequest(endpoint, config);
        }
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache GET requests
            if (config.method === 'GET') {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }
            
            // Apply response interceptor
            if (this.responseSuccessHandler) {
                return this.responseSuccessHandler(data);
            }
            
            return data;
        } catch (error) {
            // Apply error interceptor
            if (this.responseErrorHandler) {
                return this.responseErrorHandler(error);
            }
            
            console.error('API Request failed:', error);
            throw error;
        }
    }
    
    queueRequest(endpoint, config) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                endpoint,
                config,
                resolve,
                reject
            });
        });
    }
    
    async processRequestQueue() {
        while (this.requestQueue.length > 0) {
            const { endpoint, config, resolve, reject } = this.requestQueue.shift();
            try {
                const result = await this.request(endpoint, config);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }
    }
    
    handleAuthError() {
        this.token = null;
        localStorage.removeItem('token');
        this.showToast('Session expired. Please log in again.', 'error');
        
        // Redirect to login if not already there
        if (!window.location.pathname.includes('login.html')) {
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
            }
    
    setToken(token) {
        this.token = token;
    }
    
    clearToken() {
        this.token = null;
    }
    
    // Authentication endpoints
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
        return this.request('/homepage');
    }
    
    async getPersonalizedRecommendations() {
        return this.request('/recommendations/personalized');
    }
    
    async getRecommendations() {
        return this.request('/recommendations');
    }
    
    async getContentDetails(contentId) {
        return this.request(`/content/${contentId}/details`);
    }
    
    async searchContent(query, type = 'movie') {
        const params = new URLSearchParams({ q: query, type });
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
    async adminBrowseContent(params = {}) {
        const queryParams = new URLSearchParams(params);
        return this.request(`/admin/enhanced-browse?${queryParams}`);
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
    
    async adminGetSystemStatus() {
        return this.request('/admin/system-status');
    }
    
    async adminSyncContent() {
        return this.request('/enhanced-sync', {
            method: 'POST'
        });
    }
    
    // Utility methods
    showToast(message, type = 'info') {
        if (typeof window !== 'undefined' && window.showToast) {
            window.showToast(message, type);
        }
    }
    
    clearCache() {
        this.cache.clear();
    }
    
    getCacheSize() {
        return this.cache.size;
    }
    
    // Batch requests
    async batchRequest(requests) {
        const promises = requests.map(({ endpoint, options }) => 
            this.request(endpoint, options).catch(error => ({ error }))
        );
        
        return Promise.all(promises);
    }
    
    // Upload file (for future use)
    async uploadFile(file, endpoint) {
        const formData = new FormData();
        formData.append('file', file);
        
        return this.request(endpoint, {
            method: 'POST',
            body: formData,
            headers: {} // Let browser set Content-Type for FormData
        });
    }
}

// Create global API instance
const api = new API();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}