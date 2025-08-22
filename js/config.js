window.CineBrain = {
  API_BASE_URL: 'https://backend-app-970m.onrender.com/api',
  APP_NAME: 'CineBrain',
  APP_TAGLINE: 'The Mind Behind Your Next Favorite',
  VERSION: '2.0.0',
  
  // Theme configuration
  THEME: {
    COLORS: {
      CINEMA_BLACK: '#0a0a0b',
      PLATINUM_BLUE: '#3b82f6',
      ROYAL_PURPLE: '#8b5cf6',
      VIP_GOLD: '#f59e0b',
      DARK_GRAY: '#1f2937',
      LIGHT_GRAY: '#6b7280',
      SUCCESS: '#10b981',
      ERROR: '#ef4444',
      WARNING: '#f59e0b'
    },
    ANIMATIONS: {
      FAST: '0.15s',
      NORMAL: '0.3s',
      SLOW: '0.5s',
      EASE: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
    }
  },
  
  // Regional languages mapping
  REGIONAL_LANGUAGES: {
    hindi: { code: 'hi', name: 'Hindi', industry: 'Bollywood' },
    telugu: { code: 'te', name: 'Telugu', industry: 'Tollywood' },
    tamil: { code: 'ta', name: 'Tamil', industry: 'Kollywood' },
    kannada: { code: 'kn', name: 'Kannada', industry: 'Sandalwood' },
    malayalam: { code: 'ml', name: 'Malayalam', industry: 'Mollywood' },
    english: { code: 'en', name: 'English', industry: 'Hollywood' }
  },
  
  // Content genres
  GENRES: [
    'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime',
    'Documentary', 'Drama', 'Fantasy', 'Horror', 'Musical', 'Mystery',
    'Romance', 'Sci-Fi', 'Thriller', 'Western'
  ],
  
  // Anime genres
  ANIME_GENRES: {
    shonen: ['Action', 'Adventure', 'Martial Arts', 'School'],
    shojo: ['Romance', 'Drama', 'School', 'Slice of Life'],
    seinen: ['Action', 'Drama', 'Thriller', 'Psychological'],
    josei: ['Romance', 'Drama', 'Slice of Life'],
    kodomomuke: ['Kids', 'Family', 'Adventure', 'Comedy']
  },
  
  // Performance settings
  PERFORMANCE: {
    API_TIMEOUT: 10000,
    IMAGE_LAZY_THRESHOLD: '50px',
    PREFETCH_DELAY: 2000,
    CACHE_DURATION: 300000, // 5 minutes
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  },
  
  // UI settings
  UI: {
    ITEMS_PER_PAGE: 20,
    SEARCH_DEBOUNCE: 300,
    SCROLL_THRESHOLD: 200,
    MOBILE_BREAKPOINT: 768,
    TOUCH_THRESHOLD: 10
  },
  
  // Device detection
  IS_MOBILE: window.innerWidth <= 768,
  IS_TABLET: window.innerWidth > 768 && window.innerWidth <= 1024,
  IS_DESKTOP: window.innerWidth > 1024,
  
  // Feature flags
  FEATURES: {
    OFFLINE_MODE: true,
    PUSH_NOTIFICATIONS: true,
    ANALYTICS: false,
    EXPERIMENTAL: false
  }
};

// Initialize theme
document.documentElement.style.setProperty('--cinema-black', CineBrain.THEME.COLORS.CINEMA_BLACK);
document.documentElement.style.setProperty('--platinum-blue', CineBrain.THEME.COLORS.PLATINUM_BLUE);
document.documentElement.style.setProperty('--royal-purple', CineBrain.THEME.COLORS.ROYAL_PURPLE);
document.documentElement.style.setProperty('--vip-gold', CineBrain.THEME.COLORS.VIP_GOLD);