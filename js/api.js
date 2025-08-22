import { CONFIG } from './config.js';

// API Client with caching, retries, and preloading
class APIClient {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.preloadQueue = [];
    this.initPreloading();
  }

  // Build full URL
  buildUrl(endpoint, params = {}) {
    const baseUrl = CONFIG.API_BASE_URL + CONFIG.API_ENDPOINTS[endpoint];
    if (!baseUrl) throw new Error(`Unknown endpoint: ${endpoint}`);
    
    const url = new URL(baseUrl, window.location.origin);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
    
    return url.toString();
  }

  // Get auth headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  // Cache management
  getCacheKey(url, options = {}) {
    return `${url}::${JSON.stringify(options)}`;
  }

  getFromCache(key, maxAge) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Request with retry logic
  async fetchWithRetry(url, options = {}, retries = 3) {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: this.getHeaders()
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError;
  }

  // Main request method with caching
  async request(endpoint, options = {}) {
    const { params = {}, method = 'GET', body = null, cache = true } = options;
    const url = this.buildUrl(endpoint, method === 'GET' ? params : {});
    const cacheKey = this.getCacheKey(url, options);
    
    // Check cache for GET requests
    if (method === 'GET' && cache) {
      const cacheMaxAge = CONFIG.CACHE_DURATION[endpoint] || CONFIG.CACHE_DURATION.CONTENT;
      const cached = this.getFromCache(cacheKey, cacheMaxAge);
      if (cached) {
        return cached;
      }
    }
    
    // Dedup concurrent requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }
    
    // Make request
    const requestPromise = this.fetchWithRetry(url, {
      method,
      body: body ? JSON.stringify(body) : null
    }).then(data => {
      if (method === 'GET' && cache) {
        this.setCache(cacheKey, data);
      }
      this.pendingRequests.delete(cacheKey);
      return data;
    }).catch(error => {
      this.pendingRequests.delete(cacheKey);
      throw error;
    });
    
    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  // Preloading system
  initPreloading() {
    // Preload critical endpoints on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.preloadCritical());
    } else {
      this.preloadCritical();
    }
  }

  async preloadCritical() {
    const endpoints = CONFIG.PRELOAD_ENDPOINTS;
    
    for (const endpoint of endpoints) {
      this.preload(endpoint, { limit: 10 });
    }
  }

  preload(endpoint, params = {}) {
    // Add to queue for idle time processing
    this.preloadQueue.push({ endpoint, params });
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.processPreloadQueue());
    } else {
      setTimeout(() => this.processPreloadQueue(), 100);
    }
  }

  async processPreloadQueue() {
    while (this.preloadQueue.length > 0) {
      const { endpoint, params } = this.preloadQueue.shift();
      try {
        await this.request(endpoint, { params });
      } catch (error) {
        console.warn(`Preload failed for ${endpoint}:`, error);
      }
    }
  }

  // Convenience methods
  get(endpoint, params = {}, options = {}) {
    return this.request(endpoint, { ...options, params, method: 'GET' });
  }

  post(endpoint, body = {}, options = {}) {
    return this.request(endpoint, { ...options, body, method: 'POST', cache: false });
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const api = new APIClient();

// Global error handler
window.addEventListener('unhandledrejection', event => {
  if (event.reason && event.reason.message && event.reason.message.includes('HTTP 401')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-changed'));
  }
});