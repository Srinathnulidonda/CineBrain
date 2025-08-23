// CineBrain Configuration - Real Backend Integration
const API_ENDPOINTS = {
  BASE_URL: 'https://backend-app-970m.onrender.com/api',

  // Content Discovery (Real)
  TRENDING: '/recommendations/trending',
  NEW_RELEASES: '/recommendations/new-releases',
  TOP_RATED: '/recommendations/critics-choice',
  REGIONAL: '/recommendations/regional',
  GENRE_RECS: '/recommendations/genre',
  ANIME: '/recommendations/anime',
  ADMIN_CHOICE: '/recommendations/admin-choice',
  ANONYMOUS_RECS: '/recommendations/anonymous',

  // Search & Filtering (Real)
  SEARCH: '/search',
  AUTOCOMPLETE: '/search',

  // Content Details (Real)
  CONTENT_DETAILS: '/content',
  SIMILAR: '/recommendations/similar',
  
  // User Features (Authenticated)
  RECOMMENDATIONS: '/recommendations/personalized',
  ML_RECOMMENDATIONS: '/recommendations/ml-personalized',
  WATCHLIST: '/user/watchlist',
  FAVORITES: '/user/favorites',
  INTERACTIONS: '/interactions',

  // Authentication (Real)
  LOGIN: '/login',
  REGISTER: '/register',

  // Admin Features
  ADMIN_SEARCH: '/admin/search',
  ADMIN_CONTENT: '/admin/content',
  ADMIN_RECOMMENDATIONS: '/admin/recommendations',
  ADMIN_ANALYTICS: '/admin/analytics',

  // Health Check
  HEALTH: '/health',
};

// Performance Configuration
const PERFORMANCE_CONFIG = {
  API_TIMEOUT: 10000, // 10 seconds
  CACHE_DURATION: 300000, // 5 minutes
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  PRELOAD_DELAY: 100, // 100ms
  IMAGE_LAZY_THRESHOLD: '200px',
  INTERSECTION_THRESHOLD: 0.1
};

// Cache Configuration
const CACHE_CONFIG = {
  TRENDING: 'trending_cache',
  NEW_RELEASES: 'new_releases_cache',
  CRITICS_CHOICE: 'critics_choice_cache',
  REGIONAL: 'regional_cache',
  ANIME: 'anime_cache',
  SEARCH_RESULTS: 'search_cache',
  USER_DATA: 'user_cache',
  CONTENT_DETAILS: 'content_cache'
};

// Theme Configuration
const THEME_CONFIG = {
  DEFAULT_THEME: 'dark',
  STORAGE_KEY: 'cinebrain_theme',
  COLORS: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    dark: '#0a0a0b',
    light: '#f8f9fa'
  }
};

// Regional Language Mapping
const LANGUAGE_CONFIG = {
  'hindi': { code: 'hi', name: 'Hindi', region: 'IN' },
  'telugu': { code: 'te', name: 'Telugu', region: 'IN' },
  'tamil': { code: 'ta', name: 'Tamil', region: 'IN' },
  'kannada': { code: 'kn', name: 'Kannada', region: 'IN' },
  'malayalam': { code: 'ml', name: 'Malayalam', region: 'IN' },
  'english': { code: 'en', name: 'English', region: 'US' },
  'japanese': { code: 'ja', name: 'Japanese', region: 'JP' }
};

// Content Type Configuration
const CONTENT_TYPE_CONFIG = {
  movie: {
    icon: 'fas fa-film',
    color: 'primary',
    label: 'Movie'
  },
  tv: {
    icon: 'fas fa-tv',
    color: 'success',
    label: 'TV Series'
  },
  anime: {
    icon: 'fas fa-dragon',
    color: 'warning',
    label: 'Anime'
  },
  documentary: {
    icon: 'fas fa-file-video',
    color: 'info',
    label: 'Documentary'
  }
};

// Export to global scope
window.API_ENDPOINTS = API_ENDPOINTS;
window.PERFORMANCE_CONFIG = PERFORMANCE_CONFIG;
window.CACHE_CONFIG = CACHE_CONFIG;
window.THEME_CONFIG = THEME_CONFIG;
window.LANGUAGE_CONFIG = LANGUAGE_CONFIG;
window.CONTENT_TYPE_CONFIG = CONTENT_TYPE_CONFIG;