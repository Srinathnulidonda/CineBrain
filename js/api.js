import { buildUrl, APP_CONFIG } from './config.js';

class APIClient {
  constructor() {
    this.cache = new Map();
    this.retryCount = 3;
    this.baseDelay = 1000;
    this.preloadedData = new Map();
    this.pendingRequests = new Map();
    this.initServiceWorker();
  }

  async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  getCacheKey(url, options = {}) {
    return `${url}:${JSON.stringify(options)}`;
  }

  isValidCache(item) {
    return item && (Date.now() - item.timestamp) < item.ttl;
  }

  setCache(key, data, ttl = APP_CONFIG.CACHE_DURATION.DYNAMIC) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  getCache(key) {
    const item = this.cache.get(key);
    if (this.isValidCache(item)) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  async request(url, options = {}) {
    const cacheKey = this.getCacheKey(url, options);
    
    // Check cache first
    const cached = this.getCache(cacheKey);
    if (cached && !options.bypassCache) {
      return cached;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this._makeRequest(url, options);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.pendingRequests.delete(cacheKey);
      
      // Cache successful responses
      if (result && !result.error) {
        const ttl = options.ttl || (options.method === 'GET' ? APP_CONFIG.CACHE_DURATION.DYNAMIC : 0);
        if (ttl > 0) {
          this.setCache(cacheKey, result, ttl);
        }
      }
      
      return result;
    } catch (error) {
      this.pendingRequests.delete(cacheKey);
      throw error;
    }
  }

  async _makeRequest(url, options = {}) {
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    let lastError;
    
    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        const startTime = performance.now();
        const response = await fetch(url, config);
        const endTime = performance.now();
        
        // Log performance
        if (endTime - startTime > 100) {
          console.warn(`Slow API call: ${url} took ${(endTime - startTime).toFixed(2)}ms`);
        }

        if (!response.ok) {
          if (response.status >= 400 && response.status < 500) {
            // Client errors - don't retry
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
        
      } catch (error) {
        lastError = error;
        
        if (attempt < this.retryCount - 1) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  // Preload critical data
  async preloadCriticalData() {
    const preloadPromises = [
      this.getTrending({ limit: 10 }),
      this.getAdminChoice({ limit: 5 }),
      this.getNewReleases({ limit: 5, type: 'movie' }),
      this.getCriticsChoice({ limit: 5, type: 'movie' })
    ];

    try {
      const results = await Promise.allSettled(preloadPromises);
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`Preloaded data ${index + 1}`);
        }
      });
    } catch (error) {
      console.warn('Preload failed:', error);
    }
  }

  // Authentication
  async login(credentials) {
    return this.request(buildUrl.login(), {
      method: 'POST',
      body: credentials,
      ttl: 0
    });
  }

  async register(userData) {
    return this.request(buildUrl.register(), {
      method: 'POST',
      body: userData,
      ttl: 0
    });
  }

  // Content Discovery
  async getTrending(params = {}) {
    return this.request(buildUrl.trending(params), {
      ttl: APP_CONFIG.CACHE_DURATION.DYNAMIC
    });
  }

  async getNewReleases(params = {}) {
    return this.request(buildUrl.newReleases(params), {
      ttl: APP_CONFIG.CACHE_DURATION.DYNAMIC
    });
  }

  async getCriticsChoice(params = {}) {
    return this.request(buildUrl.topRated(params), {
      ttl: APP_CONFIG.CACHE_DURATION.DYNAMIC
    });
  }

  async getRegionalContent(language, params = {}) {
    return this.request(buildUrl.regional(language, params), {
      ttl: APP_CONFIG.CACHE_DURATION.DYNAMIC
    });
  }

  async getGenreContent(genre, params = {}) {
    return this.request(buildUrl.genreRecs(genre, params), {
      ttl: APP_CONFIG.CACHE_DURATION.DYNAMIC
    });
  }

  async getAnimeContent(params = {}) {
    return this.request(buildUrl.anime(params), {
      ttl: APP_CONFIG.CACHE_DURATION.DYNAMIC
    });
  }

  async getAdminChoice(params = {}) {
    return this.request(buildUrl.adminChoice(params), {
      ttl: APP_CONFIG.CACHE_DURATION.DYNAMIC
    });
  }

  async getAnonymousRecommendations(params = {}) {
    return this.request(buildUrl.anonymousRecs(params), {
      ttl: APP_CONFIG.CACHE_DURATION.DYNAMIC
    });
  }

  // Search
  async search(params = {}) {
    return this.request(buildUrl.search(params), {
      ttl: APP_CONFIG.CACHE_DURATION.DYNAMIC
    });
  }

  // Content Details
  async getContentDetails(id) {
    return this.request(buildUrl.contentDetails(id), {
      ttl: APP_CONFIG.CACHE_DURATION.STATIC
    });
  }

  async getSimilarContent(id, params = {}) {
    return this.request(buildUrl.similar(id, params), {
      ttl: APP_CONFIG.CACHE_DURATION.STATIC
    });
  }

  // User Features (require auth)
  async getPersonalizedRecommendations(token, params = {}) {
    return this.request(`${buildUrl.BASE_URL}/recommendations/personalized?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
      ttl: APP_CONFIG.CACHE_DURATION.USER_DATA
    });
  }

  async getMLRecommendations(token, params = {}) {
    return this.request(`${buildUrl.BASE_URL}/recommendations/ml-personalized?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
      ttl: APP_CONFIG.CACHE_DURATION.USER_DATA
    });
  }

  async getWatchlist(token) {
    return this.request(buildUrl.watchlist(), {
      headers: { Authorization: `Bearer ${token}` },
      ttl: APP_CONFIG.CACHE_DURATION.USER_DATA
    });
  }

  async getFavorites(token) {
    return this.request(buildUrl.favorites(), {
      headers: { Authorization: `Bearer ${token}` },
      ttl: APP_CONFIG.CACHE_DURATION.USER_DATA
    });
  }

  async recordInteraction(token, interaction) {
    return this.request(buildUrl.userRatings(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: interaction,
      ttl: 0
    });
  }

  // Admin Features
  async adminSearch(token, params = {}) {
    return this.request(buildUrl.adminSearch(params), {
      headers: { Authorization: `Bearer ${token}` },
      ttl: 0
    });
  }

  async adminSaveContent(token, content) {
    return this.request(buildUrl.adminContent(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: content,
      ttl: 0
    });
  }

  async adminCreateRecommendation(token, recommendation) {
    return this.request(buildUrl.adminRecommendations(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: recommendation,
      ttl: 0
    });
  }

  async getAdminAnalytics(token) {
    return this.request(buildUrl.adminAnalytics(), {
      headers: { Authorization: `Bearer ${token}` },
      ttl: APP_CONFIG.CACHE_DURATION.USER_DATA
    });
  }

  async getMLServiceCheck(token) {
    return this.request(buildUrl.adminMLCheck(), {
      headers: { Authorization: `Bearer ${token}` },
      ttl: 0
    });
  }

  // Utility methods
  clearCache() {
    this.cache.clear();
  }

  clearUserCache() {
    for (const [key, value] of this.cache.entries()) {
      if (key.includes('user') || key.includes('personalized') || key.includes('watchlist') || key.includes('favorites')) {
        this.cache.delete(key);
      }
    }
  }

  getHealthStatus() {
    return this.request(`${buildUrl.BASE_URL}/health`, {
      ttl: 30000 // 30 seconds
    });
  }
}

// Create global instance
const apiClient = new APIClient();

// Export default instance and class
export { APIClient };
export default apiClient;