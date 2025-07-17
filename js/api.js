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
            console.log(`Making API request to: ${url}`);
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error ${response.status}:`, errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`API Response from ${endpoint}:`, data);
            
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
            console.error(`API Request failed for ${endpoint}:`, error);
            
            // Apply error interceptor
            if (this.responseErrorHandler) {
                return this.responseErrorHandler(error);
            }
            
            // Return cached data if available for GET requests
            if (config.method === 'GET' && this.cache.has(cacheKey)) {
                console.log('Returning cached data due to network error');
                return this.cache.get(cacheKey).data;
            }
            
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
        console.log('Token set:', token ? 'Yes' : 'No');
    }
    
    clearToken() {
        this.token = null;
        console.log('Token cleared');
    }
    
    // Authentication endpoints
    async login(credentials) {
        console.log('Attempting login with:', { username: credentials.username });
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }
    
    async register(userData) {
        console.log('Attempting registration with:', { 
            username: userData.username, 
            email: userData.email 
        });
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    // Content endpoints with fallback data
    async getHomepage() {
        try {
            return await this.request('/homepage');
        } catch (error) {
            console.warn('Failed to fetch homepage data, using fallback');
            return this.getFallbackHomepageData();
        }
    }
    
    async getPersonalizedRecommendations() {
        try {
            return await this.request('/recommendations/personalized');
        } catch (error) {
            console.warn('Failed to fetch personalized recommendations, using fallback');
            return this.getFallbackRecommendations();
        }
    }
    
    async getRecommendations() {
        try {
            return await this.request('/recommendations');
        } catch (error) {
            console.warn('Failed to fetch recommendations, using fallback');
            return this.getFallbackRecommendations();
        }
    }
    
    async getContentDetails(contentId) {
        try {
            return await this.request(`/content/${contentId}/details`);
        } catch (error) {
            console.warn('Failed to fetch content details, using fallback');
            return this.getFallbackContentDetails(contentId);
        }
    }
    
    async searchContent(query, type = 'movie') {
        try {
            const params = new URLSearchParams({ q: query, type });
            return await this.request(`/search?${params}`);
        } catch (error) {
            console.warn('Search failed, using fallback');
            return this.getFallbackSearchResults(query);
        }
    }
    
    // User interaction endpoints
    async recordInteraction(data) {
        try {
            return await this.request('/interact', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.warn('Failed to record interaction:', error);
            // Store locally for later sync
            this.storeOfflineInteraction(data);
            return { success: true, offline: true };
        }
    }
    
    storeOfflineInteraction(data) {
        const offlineInteractions = JSON.parse(localStorage.getItem('offlineInteractions') || '[]');
        offlineInteractions.push({
            ...data,
            timestamp: Date.now()
        });
        localStorage.setItem('offlineInteractions', JSON.stringify(offlineInteractions));
    }
    
    // Fallback data methods
    getFallbackHomepageData() {
        return {
            trending: {
                movies: this.getSampleMovies(),
                tv: this.getSampleTVShows(),
                anime: this.getSampleAnime()
            },
            whats_hot: this.getSampleMovies().slice(0, 15),
            critics_choice: this.getSampleMovies().slice(5, 15),
            regional: {
                Telugu: this.getSampleMovies().slice(0, 10),
                Hindi: this.getSampleMovies().slice(2, 12),
                Tamil: this.getSampleMovies().slice(4, 14),
                Kannada: this.getSampleMovies().slice(6, 16)
            },
            user_favorites: this.getSampleMovies().slice(0, 10),
            admin_curated: this.getSampleMovies().slice(0, 15)
        };
    }
    
    getFallbackRecommendations() {
        const sampleMovies = this.getSampleMovies();
        return {
            hybrid_recommendations: sampleMovies.slice(0, 15),
            watch_history_based: sampleMovies.slice(5, 20),
            favorites_based: sampleMovies.slice(10, 25),
            wishlist_influenced: sampleMovies.slice(15, 25),
            regional_suggestions: sampleMovies.slice(0, 10),
            collaborative_filtering: sampleMovies.slice(8, 23)
        };
    }
    
    getFallbackContentDetails(contentId) {
        const movie = this.getSampleMovies().find(m => m.id == contentId) || this.getSampleMovies()[0];
        return {
            content: movie,
            tmdb_details: {
                tagline: "An epic adventure awaits",
                runtime: 120,
                budget: 50000000,
                revenue: 150000000,
                production_companies: [{ name: "Sample Studios" }],
                production_countries: [{ name: "United States" }],
                credits: {
                    cast: this.getSampleCast(),
                    crew: this.getSampleCrew()
                }
            },
            youtube_videos: {
                trailers: this.getSampleVideos(),
                teasers: this.getSampleVideos()
            },
            user_reviews: this.getSampleReviews(),
            similar_content: this.getSampleMovies().slice(0, 8)
        };
    }
    
    getFallbackSearchResults(query) {
        const allContent = this.getSampleMovies();
        const filtered = allContent.filter(item => 
            item.title.toLowerCase().includes(query.toLowerCase())
        );
        
        return {
            database_results: filtered,
            tmdb_results: filtered
        };
    }

    
    clearCache() {
        this.cache.clear();
    }
    
    getCacheSize() {
        return this.cache.size;
    }
}

// Create global API instance
const api = new API();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}