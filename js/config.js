// CineScope Configuration & API Endpoints (Real Backend Integration)
const CONFIG = {
  APP_NAME: 'CineBrain',
  APP_TAGLINE: 'The Mind Behind Your Next Favorite',
  VERSION: '2.0.0',
  ENVIRONMENT: 'production',
  
  // Performance Settings
  API_TIMEOUT: 15000,
  CACHE_DURATION: 30000, // 30 seconds for dynamic data
  STATIC_CACHE_DURATION: 86400000, // 24 hours for static data
  PRELOAD_ENABLED: true,
  PRELOAD_CRITICAL_ENDPOINTS: [
    '/recommendations/trending?limit=20',
    '/recommendations/new-releases?limit=10',
    '/recommendations/critics-choice?limit=10'
  ]
};

// Real API Endpoints (Zero Placeholders)
export const API_ENDPOINTS = {
  BASE_URL: 'https://backend-app-970m.onrender.com/api',

  // Content Discovery (Real Backend)
  TRENDING: '/recommendations/trending',          // ?type=all|movie|tv&limit=&region=
  NEW_RELEASES: '/recommendations/new-releases',  // ?type=movie|tv&language=&limit=
  TOP_RATED: '/recommendations/critics-choice',   // ?type=movie|tv&limit=
  REGIONAL: '/recommendations/regional',          // append '/:language' + ?type=&limit=
  GENRE_RECS: '/recommendations/genre',           // append '/:genre' + ?type=&limit=
  ANIME: '/recommendations/anime',                // ?genre=&limit=
  ADMIN_CHOICE: '/recommendations/admin-choice',  // public feed of admin picks
  ANONYMOUS_RECS: '/recommendations/anonymous',   // fallback for non-auth users

  // Search & Filtering (Real Backend)
  SEARCH: '/search',          // ?query=&type=multi|movie|tv|anime&page=
  AUTOCOMPLETE: '/search',    // alias to search for UI autocomplete

  // Content Details (Real Backend)
  CONTENT_DETAILS: '/content',         // append '/:id' (returns cast, crew, similar_content)
  SIMILAR: '/recommendations/similar', // append '/:id' + ?limit=

  // User Features (Authenticated; Real Backend)
  RECOMMENDATIONS: '/recommendations/personalized',     // GET (requires Bearer token)
  ML_RECOMMENDATIONS: '/recommendations/ml-personalized', // GET (requires Bearer token)
  WATCHLIST: '/user/watchlist',                         // GET (requires Bearer token)
  FAVORITES: '/user/favorites',                         // GET (requires Bearer token)
  USER_RATINGS: '/interactions',                        // POST to create rating/interaction

  // Authentication (Real Backend)
  LOGIN: '/login',       // POST
  REGISTER: '/register', // POST

  // Health Check
  HEALTH: '/health'
};

// Performance Monitoring
export const PERFORMANCE_CONFIG = {
  ENABLE_METRICS: true,
  TARGET_LOAD_TIME: 2000, // 2 seconds
  TARGET_FCP: 1200,       // First Contentful Paint
  TARGET_LCP: 2100,       // Largest Contentful Paint
  TARGET_TTI: 2500,       // Time to Interactive
  
  // Error Thresholds
  MAX_API_ERRORS: 3,
  MAX_RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000
};

// UI Configuration
export const UI_CONFIG = {
  ANIMATION_DURATION: 200,
  TOAST_DURATION: 3000,
  CAROUSEL_AUTO_PLAY: true,
  CAROUSEL_INTERVAL: 5000,
  INFINITE_SCROLL_THRESHOLD: 200,
  
  // Mobile Configuration
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  
  // Content Display
  DEFAULT_GRID_SIZE: 20,
  CAROUSEL_VISIBLE_ITEMS: 6,
  MOBILE_CAROUSEL_ITEMS: 2
};

// Cache Keys
export const CACHE_KEYS = {
  USER_DATA: 'cinebrain_user',
  AUTH_TOKEN: 'cinebrain_token',
  TRENDING_CACHE: 'trending_content',
  NEW_RELEASES_CACHE: 'new_releases',
  CRITICS_CHOICE_CACHE: 'critics_choice',
  SEARCH_HISTORY: 'search_history',
  USER_PREFERENCES: 'user_preferences'
};

// Theme Configuration
export const THEME_CONFIG = {
  DEFAULT_THEME: 'dark',
  THEMES: {
    dark: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      background: '#0a0a0b',
      surface: '#141418',
      accent: '#1e1e23'
    },
    light: {
      primary: '#3b82f6',
      secondary: '#8b5cf6', 
      background: '#ffffff',
      surface: '#f8fafc',
      accent: '#e2e8f0'
    }
  }
};

// Regional Content Configuration
export const REGIONAL_CONFIG = {
  SUPPORTED_LANGUAGES: {
    'english': { code: 'en', label: 'English', flag: '🇺🇸' },
    'hindi': { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
    'telugu': { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
    'tamil': { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
    'kannada': { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
    'malayalam': { code: 'ml', label: 'മലയാളം', flag: '🇮🇳' }
  },
  
  DEFAULT_REGION: 'english',
  AUTO_DETECT_REGION: true
};

// Content Types
export const CONTENT_TYPES = {
  MOVIE: 'movie',
  TV: 'tv', 
  ANIME: 'anime',
  ALL: 'all'
};

// Interaction Types
export const INTERACTION_TYPES = {
  VIEW: 'view',
  LIKE: 'like',
  FAVORITE: 'favorite',
  WATCHLIST: 'watchlist',
  RATING: 'rating',
  SEARCH: 'search'
};

// Export configuration object
export default CONFIG;