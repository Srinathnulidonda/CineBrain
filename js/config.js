// CineBrain Configuration - Real Backend Integration
export const CONFIG = {
  API_BASE_URL: 'https://backend-app-970m.onrender.com/api',
  
  // API Endpoints mapping
  API_ENDPOINTS: {
    // Authentication
    LOGIN: '/login',
    REGISTER: '/register',
    
    // Content Discovery
    TRENDING: '/recommendations/trending',
    NEW_RELEASES: '/recommendations/new-releases',
    TOP_RATED: '/recommendations/critics-choice',
    REGIONAL: '/recommendations/regional',
    GENRE_RECS: '/recommendations/genre',
    ANIME: '/recommendations/anime',
    ADMIN_CHOICE: '/recommendations/admin-choice',
    ANONYMOUS_RECS: '/recommendations/anonymous',
    
    // Search & Content
    SEARCH: '/search',
    CONTENT_DETAILS: '/content',
    SIMILAR: '/recommendations/similar',
    
    // User Features
    RECOMMENDATIONS: '/recommendations/personalized',
    ML_RECOMMENDATIONS: '/recommendations/ml-personalized',
    WATCHLIST: '/user/watchlist',
    FAVORITES: '/user/favorites',
    USER_RATINGS: '/interactions',
    
    // Admin
    ADMIN_SEARCH: '/admin/search',
    ADMIN_CONTENT: '/admin/content',
    ADMIN_RECOMMENDATIONS: '/admin/recommendations',
    ADMIN_ANALYTICS: '/admin/analytics',
    ADMIN_ML_CHECK: '/admin/ml-service-check',
    
    // Health
    HEALTH: '/health'
  },
  
  // Performance settings
  CACHE_DURATION: {
    CONTENT: 86400000,    // 24 hours
    RECOMMENDATIONS: 300000, // 5 minutes
    USER_DATA: 60000,      // 1 minute
    SEARCH: 30000          // 30 seconds
  },
  
  // Preload priorities
  PRELOAD_ENDPOINTS: [
    'TRENDING',
    'NEW_RELEASES',
    'ANONYMOUS_RECS'
  ],
  
  // Image CDN
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/',
  IMAGE_SIZES: {
    POSTER_SMALL: 'w300',
    POSTER_LARGE: 'w500',
    BACKDROP: 'w1280',
    PROFILE: 'w185'
  }
};

// Service Worker registration for caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}