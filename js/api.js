// Ultra-Fast API Client with Preloading & Caching (Real Backend Integration)
import { API_ENDPOINTS, PERFORMANCE_CONFIG, CACHE_KEYS } from './config.js';

class APIClient {
  constructor() {
    this.baseURL = API_ENDPOINTS.BASE_URL;
    this.cache = new Map();
    this.preloadCache = new Map();
    this.requestQueue = new Map();
    this.retryCount = new Map();
    
    // Initialize performance monitoring
    this.performanceMarks = new Map();
    
    // Preload critical data immediately
    this.preloadCriticalData();
    
    // Setup service worker for caching
    this.setupServiceWorker();
  }

  // Preload critical API endpoints for <100ms responses
  async preloadCriticalData() {
    const criticalEndpoints = [
      { url: '/recommendations/trending?limit=20', key: 'trending' },
      { url: '/recommendations/new-releases?limit=10', key: 'new_releases' },
      { url: '/recommendations/critics-choice?limit=10', key: 'critics_choice' },
      { url: '/recommendations/anonymous?limit=15', key: 'anonymous' }
    ];

    try {
      // Preload all critical endpoints in parallel
      const preloadPromises = criticalEndpoints.map(async (endpoint) => {
        const startTime = performance.now();
        const data = await this.fetchWithCache(endpoint.url, { skipAuth: true });
        const loadTime = performance.now() - startTime;
        
        // Store in preload cache for instant access
        this.preloadCache.set(endpoint.key, {
          data,
          timestamp: Date.now(),
          loadTime
        });
        
        console.log(`Preloaded ${endpoint.key} in ${loadTime.toFixed(2)}ms`);
        return data;
      });

      await Promise.all(preloadPromises);
      console.log('🚀 Critical data preloaded successfully');
      
      // Dispatch event for components
      window.dispatchEvent(new CustomEvent('dataPreloaded'));
      
    } catch (error) {
      console.warn('Preload warning:', error);
      // Continue without preloaded data
    }
  }

  // Get preloaded data for instant responses
  getPreloaded(key) {
    const cached = this.preloadCache.get(key);
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      return cached.data;
    }
    return null;
  }

  // Main API request method with caching and retries
  async request(endpoint, options = {}) {
    const startTime = performance.now();
    const requestId = `${options.method || 'GET'}_${endpoint}_${Date.now()}`;
    
    try {
      // Check for immediate cache hit first
      const cacheKey = this.getCacheKey(endpoint, options);
      const cached = this.getFromCache(cacheKey);
      if (cached && !options.skipCache) {
        const responseTime = performance.now() - startTime;
        console.log(`Cache hit: ${endpoint} (${responseTime.toFixed(2)}ms)`);
        return cached;
      }

      // Check if request is already in progress
      if (this.requestQueue.has(cacheKey)) {
        return await this.requestQueue.get(cacheKey);
      }

      // Create new request
      const requestPromise = this.executeRequest(endpoint, options);
      this.requestQueue.set(cacheKey, requestPromise);

      const result = await requestPromise;
      const totalTime = performance.now() - startTime;
      
      // Cache successful responses
      if (result && !options.skipCache) {
        this.setCache(cacheKey, result, options.cacheTime);
      }
      
      // Clean up request queue
      this.requestQueue.delete(cacheKey);
      
      // Performance logging
      console.log(`API: ${endpoint} (${totalTime.toFixed(2)}ms)`);
      
      return result;
      
    } catch (error) {
      // Clean up on error
      this.requestQueue.delete(requestId);
      
      // Retry logic
      const retryCount = this.retryCount.get(endpoint) || 0;
      if (retryCount < PERFORMANCE_CONFIG.MAX_RETRY_ATTEMPTS && this.shouldRetry(error)) {
        this.retryCount.set(endpoint, retryCount + 1);
        console.log(`Retrying ${endpoint} (attempt ${retryCount + 1})`);
        
        await this.delay(PERFORMANCE_CONFIG.RETRY_DELAY * (retryCount + 1));
        return this.request(endpoint, { ...options, isRetry: true });
      }
      
      this.retryCount.delete(endpoint);
      throw error;
    }
  }

  async executeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options.fetchOptions
    };

    // Add authentication if available and not explicitly skipped
    if (!options.skipAuth) {
      const token = this.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add request body for POST/PUT
    if (options.data) {
      config.body = JSON.stringify(options.data);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PERFORMANCE_CONFIG.API_TIMEOUT);
    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  // Convenient HTTP methods
  async get(endpoint, params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, options);
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      data,
      ...options
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT', 
      data,
      ...options
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options
    });
  }

  // Enhanced caching with TTL
  getCacheKey(endpoint, options) {
    return `${endpoint}_${JSON.stringify(options.data || {})}_${options.method || 'GET'}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  setCache(key, data, ttl = 30000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // Prevent memory leaks - limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  // Utility methods
  getAuthToken() {
    return localStorage.getItem(CACHE_KEYS.AUTH_TOKEN);
  }

  shouldRetry(error) {
    // Retry on network errors, timeouts, and 5xx status codes
    return error.message.includes('timeout') || 
           error.message.includes('fetch') ||
           error.message.includes('500') ||
           error.message.includes('502') ||
           error.message.includes('503');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Service Worker setup for additional caching
  async setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.log('Service Worker registration failed:', error);
      }
    }
  }

  // Clear all caches
  clearCache() {
    this.cache.clear();
    this.preloadCache.clear();
    this.requestQueue.clear();
    this.retryCount.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      preloadSize: this.preloadCache.size,
      activeRequests: this.requestQueue.size
    };
  }
}

// Create singleton instance
const API = new APIClient();

// Export for global use
window.API = API;
export default API;

// Pre-built API method shortcuts for common endpoints
export const ContentAPI = {
  // Get trending content with preload fallback
  getTrending: async (type = 'all', limit = 20) => {
    const preloaded = API.getPreloaded('trending');
    if (preloaded) return preloaded;
    
    return API.get(API_ENDPOINTS.TRENDING, { type, limit });
  },

  // Get new releases
  getNewReleases: async (type = 'movie', language = null, limit = 20) => {
    const preloaded = API.getPreloaded('new_releases');
    if (preloaded && !language) return preloaded;
    
    const params = { type, limit };
    if (language) params.language = language;
    
    return API.get(API_ENDPOINTS.NEW_RELEASES, params);
  },

  // Get critics choice
  getCriticsChoice: async (type = 'movie', limit = 20) => {
    const preloaded = API.getPreloaded('critics_choice');
    if (preloaded) return preloaded;
    
    return API.get(API_ENDPOINTS.TOP_RATED, { type, limit });
  },

  // Search content
  search: async (query, type = 'multi', page = 1) => {
    return API.get(API_ENDPOINTS.SEARCH, { query, type, page });
  },

  // Get content details
  getDetails: async (contentId) => {
    return API.get(`${API_ENDPOINTS.CONTENT_DETAILS}/${contentId}`);
  },

  // Get similar content
  getSimilar: async (contentId, limit = 10) => {
    return API.get(`${API_ENDPOINTS.SIMILAR}/${contentId}`, { limit });
  },

  // Get regional content
  getRegional: async (language, type = 'movie', limit = 20) => {
    return API.get(`${API_ENDPOINTS.REGIONAL}/${language}`, { type, limit });
  },

  // Get anime recommendations
  getAnime: async (genre = null, limit = 20) => {
    const params = { limit };
    if (genre) params.genre = genre;
    
    return API.get(API_ENDPOINTS.ANIME, params);
  },

  // Get anonymous recommendations
  getAnonymous: async (limit = 20) => {
    const preloaded = API.getPreloaded('anonymous');
    if (preloaded) return preloaded;
    
    return API.get(API_ENDPOINTS.ANONYMOUS_RECS, { limit });
  }
};

// Export Content API methods
window.ContentAPI = ContentAPI;