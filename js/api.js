// CineScope API Client - Real Backend Integration with Caching & Service Worker
class APIClient {
  constructor() {
    this.cache = new Map();
    this.requestQueue = [];
    this.activeRequests = new Map();
    this.initServiceWorker();
  }

  async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (e) {
        console.warn('Service Worker registration failed:', e);
      }
    }
  }

  getCacheKey(url, params) {
    return `${url}?${new URLSearchParams(params).toString()}`;
  }

  isValidCache(cachedData) {
    if (!cachedData) return false;
    const age = Date.now() - cachedData.timestamp;
    return age < APP_CONFIG.CACHE_TTL;
  }

  async request(url, options = {}) {
    const { 
      method = 'GET', 
      params = {}, 
      data = null, 
      headers = {},
      useCache = true,
      retry = 3,
      timeout = APP_CONFIG.API_TIMEOUT 
    } = options;

    // Check cache for GET requests
    if (method === 'GET' && useCache) {
      const cacheKey = this.getCacheKey(url, params);
      const cachedData = this.cache.get(cacheKey);
      if (this.isValidCache(cachedData)) {
        return cachedData.data;
      }

      // Check if request is already in flight
      if (this.activeRequests.has(cacheKey)) {
        return this.activeRequests.get(cacheKey);
      }
    }

    // Build request configuration
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Add body for non-GET requests
    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    // Build URL with params for GET requests
    let requestUrl = url;
    if (method === 'GET' && Object.keys(params).length > 0) {
      requestUrl += '?' + new URLSearchParams(params).toString();
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Make request with retry logic
    const makeRequest = async (retryCount = 0) => {
      try {
        const response = await fetch(requestUrl, {
          ...config,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            // Handle unauthorized - clear auth and redirect
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/auth/login.html';
            throw new Error('Unauthorized');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Cache successful GET requests
        if (method === 'GET' && useCache) {
          const cacheKey = this.getCacheKey(url, params);
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
          this.activeRequests.delete(cacheKey);
        }

        return data;
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        if (retryCount < retry - 1 && error.message !== 'Unauthorized') {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          return makeRequest(retryCount + 1);
        }

        if (method === 'GET' && useCache) {
          const cacheKey = this.getCacheKey(url, params);
          this.activeRequests.delete(cacheKey);
        }

        throw error;
      }
    };

    // Store promise for deduplication
    if (method === 'GET' && useCache) {
      const cacheKey = this.getCacheKey(url, params);
      const promise = makeRequest();
      this.activeRequests.set(cacheKey, promise);
      return promise;
    }

    return makeRequest();
  }

  // Specific API methods
  async getTrending(type = 'all', limit = 20) {
    return this.request(API_ENDPOINTS.TRENDING, {
      params: { type, limit }
    });
  }

  async getNewReleases(language = null, type = 'movie', limit = 20) {
    const params = { type, limit };
    if (language) params.language = language;
    return this.request(API_ENDPOINTS.NEW_RELEASES, { params });
  }

  async getCriticsChoice(type = 'movie', limit = 20) {
    return this.request(API_ENDPOINTS.TOP_RATED, {
      params: { type, limit }
    });
  }

  async getGenreContent(genre, type = 'movie', limit = 20) {
    return this.request(`${API_ENDPOINTS.GENRES}/${genre}`, {
      params: { type, limit }
    });
  }

  async getRegionalContent(language, type = 'movie', limit = 20) {
    return this.request(`${API_ENDPOINTS.REGIONAL}/${language}`, {
      params: { type, limit }
    });
  }

  async getAnimeContent(genre = null, limit = 20) {
    const params = { limit };
    if (genre) params.genre = genre;
    return this.request(API_ENDPOINTS.ANIME, { params });
  }

  async searchContent(query, type = 'multi', page = 1) {
    return this.request(API_ENDPOINTS.SEARCH, {
      params: { query, type, page }
    });
  }

  async getContentDetails(contentId) {
    return this.request(`${API_ENDPOINTS.MOVIE_DETAILS}/${contentId}`);
  }

  async getSimilarContent(contentId, limit = 20) {
    return this.request(`${API_ENDPOINTS.SIMILAR}/${contentId}`, {
      params: { limit }
    });
  }

  async getPersonalizedRecommendations(limit = 20) {
    return this.request(API_ENDPOINTS.ML_RECOMMENDATIONS, {
      params: { limit },
      useCache: false
    });
  }

  async getWatchlist() {
    return this.request(API_ENDPOINTS.WATCHLIST, {
      useCache: false
    });
  }

  async getFavorites() {
    return this.request(API_ENDPOINTS.FAVORITES, {
      useCache: false
    });
  }

  async addInteraction(contentId, interactionType, rating = null) {
    return this.request(API_ENDPOINTS.USER_RATINGS, {
      method: 'POST',
      data: {
        content_id: contentId,
        interaction_type: interactionType,
        rating
      }
    });
  }

  async getAdminChoiceContent(limit = 20) {
    return this.request(API_ENDPOINTS.ADMIN_CHOICE, {
      params: { limit }
    });
  }

  // Clear cache methods
  clearCache() {
    this.cache.clear();
  }

  clearCacheForUrl(url) {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.startsWith(url)) {
        this.cache.delete(key);
      }
    });
  }

  // Prefetch methods for performance
  async prefetchContent(urls) {
    const promises = urls.map(url => 
      this.request(url, { useCache: true }).catch(() => null)
    );
    await Promise.all(promises);
  }

  // Image preloading
  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
  }

  async preloadImages(srcs) {
    const promises = srcs.map(src => this.preloadImage(src).catch(() => null));
    await Promise.all(promises);
  }
}

// Create global API instance
const API = new APIClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}