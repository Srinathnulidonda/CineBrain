class APIClient {
  constructor() {
    this.baseURL = CineBrain.API_BASE_URL;
    this.cache = new Map();
    this.requestQueue = new Map();
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || {})}`;
    
    // Check cache for GET requests
    if ((!options.method || options.method === 'GET') && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CineBrain.PERFORMANCE.CACHE_DURATION) {
        return cached.data;
      }
    }
    
    // Prevent duplicate requests
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }
    
    const requestPromise = this._makeRequest(url, options);
    this.requestQueue.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      
      // Cache successful GET requests
      if ((!options.method || options.method === 'GET') && result.success) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }
      
      return result;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }
  
  async _makeRequest(url, options) {
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...Auth.getAuthHeaders(),
        ...options.headers
      },
      timeout: CineBrain.PERFORMANCE.API_TIMEOUT,
      ...options
    };
    
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }
    
    let lastError;
    
    for (let attempt = 1; attempt <= CineBrain.PERFORMANCE.RETRY_ATTEMPTS; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        const response = await fetch(url, {
          ...config,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (response.ok) {
          return { success: true, data, status: response.status };
        } else {
          // Handle auth errors
          if (response.status === 401) {
            Auth.logout();
            return { success: false, error: 'Authentication required', status: 401 };
          }
          
          return { success: false, error: data.error || 'Request failed', status: response.status };
        }
      } catch (error) {
        lastError = error;
        
        // Don't retry on auth errors or client errors
        if (error.name === 'AbortError' && attempt < CineBrain.PERFORMANCE.RETRY_ATTEMPTS) {
          await this._delay(CineBrain.PERFORMANCE.RETRY_DELAY * attempt);
          continue;
        }
        
        break;
      }
    }
    
    return { 
      success: false, 
      error: lastError.message || 'Network error',
      status: 0
    };
  }
  
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Content APIs
  async search(query, type = 'multi', page = 1) {
    return this.request(`/search?query=${encodeURIComponent(query)}&type=${type}&page=${page}`);
  }
  
  async getContentDetails(contentId) {
    return this.request(`/content/${contentId}`);
  }
  
  // Recommendation APIs
  async getTrending(type = 'all', limit = 20, region = null) {
    const params = new URLSearchParams({ type, limit: limit.toString() });
    if (region) params.append('region', region);
    return this.request(`/recommendations/trending?${params}`);
  }
  
  async getNewReleases(language = null, type = 'movie', limit = 20) {
    const params = new URLSearchParams({ type, limit: limit.toString() });
    if (language) params.append('language', language);
    return this.request(`/recommendations/new-releases?${params}`);
  }
  
  async getCriticsChoice(type = 'movie', limit = 20) {
    return this.request(`/recommendations/critics-choice?type=${type}&limit=${limit}`);
  }
  
  async getGenreRecommendations(genre, type = 'movie', limit = 20, region = null) {
    const params = new URLSearchParams({ type, limit: limit.toString() });
    if (region) params.append('region', region);
    return this.request(`/recommendations/genre/${genre}?${params}`);
  }
  
  async getRegionalRecommendations(language, type = 'movie', limit = 20) {
    return this.request(`/recommendations/regional/${language}?type=${type}&limit=${limit}`);
  }
  
  async getAnimeRecommendations(genre = null, limit = 20) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (genre) params.append('genre', genre);
    return this.request(`/recommendations/anime?${params}`);
  }
  
  async getSimilarRecommendations(contentId, limit = 20) {
    return this.request(`/recommendations/similar/${contentId}?limit=${limit}`);
  }
  
  async getPersonalizedRecommendations(limit = 20) {
    return this.request(`/recommendations/personalized?limit=${limit}`);
  }
  
  async getMLPersonalizedRecommendations(limit = 20) {
    return this.request(`/recommendations/ml-personalized?limit=${limit}`);
  }
  
  async getAnonymousRecommendations(limit = 20) {
    return this.request(`/recommendations/anonymous?limit=${limit}`);
  }
  
  async getAdminChoiceRecommendations(type = 'admin_choice', limit = 20) {
    return this.request(`/recommendations/admin-choice?type=${type}&limit=${limit}`);
  }
  
  // User APIs
  async getWatchlist() {
    return this.request('/user/watchlist');
  }
  
  async getFavorites() {
    return this.request('/user/favorites');
  }
  
  async recordInteraction(contentId, interactionType, rating = null) {
    return this.request('/interactions', {
      method: 'POST',
      body: { content_id: contentId, interaction_type: interactionType, rating }
    });
  }
  
  // Admin APIs
  async adminSearch(query, source = 'tmdb', page = 1) {
    return this.request(`/admin/search?query=${encodeURIComponent(query)}&source=${source}&page=${page}`);
  }
  
  async saveExternalContent(contentData) {
    return this.request('/admin/content', {
      method: 'POST',
      body: contentData
    });
  }
  
  async createAdminRecommendation(contentId, type, description) {
    return this.request('/admin/recommendations', {
      method: 'POST',
      body: { content_id: contentId, recommendation_type: type, description }
    });
  }
  
  async getAdminRecommendations(page = 1, perPage = 20) {
    return this.request(`/admin/recommendations?page=${page}&per_page=${perPage}`);
  }
  
  async getAnalytics() {
    return this.request('/admin/analytics');
  }
  
  async checkMLService() {
    return this.request('/admin/ml-service-check');
  }
  
  async updateMLService() {
    return this.request('/admin/ml-service-update', { method: 'POST' });
  }
  
  async getMLStats() {
    return this.request('/admin/ml-stats');
  }
  
  // Prefetch critical data
  async prefetchCriticalData() {
    const prefetchPromises = [
      this.getTrending('all', 10),
      this.getNewReleases(null, 'movie', 10),
      this.getCriticsChoice('movie', 10)
    ];
    
    if (Auth.isAuthenticated) {
      prefetchPromises.push(this.getPersonalizedRecommendations(10));
    } else {
      prefetchPromises.push(this.getAnonymousRecommendations(10));
    }
    
    try {
      await Promise.allSettled(prefetchPromises);
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  }
  
  clearCache() {
    this.cache.clear();
  }
}

// Global API instance
window.API = new APIClient();

// Prefetch data on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    API.prefetchCriticalData();
  }, CineBrain.PERFORMANCE.PREFETCH_DELAY);
});