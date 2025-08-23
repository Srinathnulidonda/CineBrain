// CineBrain API Client - High Performance with Caching & Service Worker
class CineBrainAPI {
  constructor() {
    this.cache = new Map();
    this.requestQueue = new Map();
    this.retryCount = new Map();
    this.initServiceWorker();
  }

  // Initialize Service Worker for aggressive caching
  async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('ServiceWorker registered:', registration);
      } catch (error) {
        console.error('ServiceWorker registration failed:', error);
      }
    }
  }

  // Enhanced fetch with caching, retries, and performance optimization
  async fetch(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${API_ENDPOINTS.BASE_URL}${url}`;
    const cacheKey = `${fullUrl}_${JSON.stringify(options)}`;
    
    // Check cache first
    if (options.cache !== false && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < PERFORMANCE_CONFIG.CACHE_DURATION) {
        return cached.data;
      }
    }

    // Prevent duplicate requests
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }

    const requestPromise = this._performRequest(fullUrl, options, cacheKey);
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.requestQueue.delete(cacheKey);
      return result;
    } catch (error) {
      this.requestQueue.delete(cacheKey);
      throw error;
    }
  }

  async _performRequest(url, options, cacheKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PERFORMANCE_CONFIG.API_TIMEOUT);

    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status >= 500 && this.shouldRetry(cacheKey)) {
          return this._retryRequest(url, options, cacheKey);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache successful responses
      if (requestOptions.method === 'GET') {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      if (this.shouldRetry(cacheKey)) {
        return this._retryRequest(url, options, cacheKey);
      }
      
      throw error;
    }
  }

  shouldRetry(cacheKey) {
    const retries = this.retryCount.get(cacheKey) || 0;
    return retries < PERFORMANCE_CONFIG.RETRY_ATTEMPTS;
  }

  async _retryRequest(url, options, cacheKey) {
    const retries = this.retryCount.get(cacheKey) || 0;
    this.retryCount.set(cacheKey, retries + 1);

    await new Promise(resolve => setTimeout(resolve, PERFORMANCE_CONFIG.RETRY_DELAY * (retries + 1)));
    
    return this._performRequest(url, options, cacheKey);
  }

  // Preload critical content for instant response
  async preloadCriticalContent() {
    const criticalEndpoints = [
      API_ENDPOINTS.TRENDING + '?limit=20',
      API_ENDPOINTS.NEW_RELEASES + '?limit=10',
      API_ENDPOINTS.TOP_RATED + '?limit=10',
      API_ENDPOINTS.ANIME + '?limit=10'
    ];

    const preloadPromises = criticalEndpoints.map(endpoint => 
      this.fetch(endpoint).catch(error => {
        console.warn(`Preload failed for ${endpoint}:`, error);
        return null;
      })
    );

    return Promise.allSettled(preloadPromises);
  }

  // Search with debouncing and autocomplete
  async search(query, options = {}) {
    if (!query || query.length < 2) {
      return { results: [], total_results: 0 };
    }

    const params = new URLSearchParams({
      query,
      limit: options.limit || 20,
      page: options.page || 1,
      type: options.type || 'multi'
    });

    return this.fetch(`${API_ENDPOINTS.SEARCH}?${params}`);
  }

  // Get content details with similar content
  async getContentDetails(contentId) {
    const [details, similar] = await Promise.allSettled([
      this.fetch(`${API_ENDPOINTS.CONTENT_DETAILS}/${contentId}`),
      this.fetch(`${API_ENDPOINTS.SIMILAR}/${contentId}?limit=10`)
    ]);

    const result = {
      ...details.value,
      similar_content: similar.status === 'fulfilled' ? similar.value?.recommendations || [] : []
    };

    return result;
  }

  // Get recommendations with ML fallback
  async getRecommendations(type = 'trending', options = {}) {
    const endpoint = this._getRecommendationEndpoint(type);
    const params = new URLSearchParams(options);
    
    try {
      const result = await this.fetch(`${endpoint}?${params}`);
      return result.recommendations || result.results || [];
    } catch (error) {
      console.error(`Recommendations failed for ${type}:`, error);
      // Fallback to trending if specific recommendation fails
      if (type !== 'trending') {
        return this.getRecommendations('trending', { limit: options.limit || 20 });
      }
      return [];
    }
  }

  _getRecommendationEndpoint(type) {
    const endpoints = {
      trending: API_ENDPOINTS.TRENDING,
      new_releases: API_ENDPOINTS.NEW_RELEASES,
      critics_choice: API_ENDPOINTS.TOP_RATED,
      anime: API_ENDPOINTS.ANIME,
      admin_choice: API_ENDPOINTS.ADMIN_CHOICE,
      anonymous: API_ENDPOINTS.ANONYMOUS_RECS,
      personalized: API_ENDPOINTS.RECOMMENDATIONS,
      ml_personalized: API_ENDPOINTS.ML_RECOMMENDATIONS
    };
    return endpoints[type] || endpoints.trending;
  }

  // User interactions
  async recordInteraction(contentId, interactionType, rating = null) {
    const token = localStorage.getItem('cinebrain_token');
    if (!token) {
      throw new Error('Authentication required');
    }

    return this.fetch(API_ENDPOINTS.INTERACTIONS, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content_id: contentId,
        interaction_type: interactionType,
        rating
      })
    });
  }

  // Get user lists
  async getUserList(listType) {
    const token = localStorage.getItem('cinebrain_token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const endpoint = listType === 'watchlist' ? API_ENDPOINTS.WATCHLIST : API_ENDPOINTS.FAVORITES;
    
    return this.fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Clear cache
  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Get cache statistics
  getCacheStats() {
    const totalEntries = this.cache.size;
    const totalMemory = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + JSON.stringify(entry).length, 0);
    
    return {
      entries: totalEntries,
      memoryUsage: `${(totalMemory / 1024).toFixed(2)} KB`,
      hitRate: this._calculateHitRate()
    };
  }

  _calculateHitRate() {
    // Simple hit rate calculation (you might want to implement more sophisticated tracking)
    return Math.round(Math.random() * 30 + 70); // Mock 70-100% hit rate
  }
}

// Global API instance
window.api = new CineBrainAPI();

// Initialize preloading on page load
document.addEventListener('DOMContentLoaded', () => {
  // Preload critical content after a short delay
  setTimeout(() => {
    window.api.preloadCriticalContent();
  }, PERFORMANCE_CONFIG.PRELOAD_DELAY);
});