// CineScope Configuration - Production Backend Integration
const BASE_URL = 'https://backend-app-970m.onrender.com/api';

const API_ENDPOINTS = {
  // Authentication
  LOGIN: `${BASE_URL}/login`,
  REGISTER: `${BASE_URL}/register`,
  LOGOUT: `${BASE_URL}/logout`,
  
  // Content Discovery
  TRENDING: `${BASE_URL}/recommendations/trending`,
  POPULAR: `${BASE_URL}/recommendations/trending?type=movie`,
  TOP_RATED: `${BASE_URL}/recommendations/critics-choice`,
  NEW_RELEASES: `${BASE_URL}/recommendations/new-releases`,
  REGIONAL: `${BASE_URL}/recommendations/regional`,
  GENRES: `${BASE_URL}/recommendations/genre`,
  ANIME: `${BASE_URL}/recommendations/anime`,
  ADMIN_CHOICE: `${BASE_URL}/recommendations/admin-choice`,
  
  // Search & Filtering
  SEARCH: `${BASE_URL}/search`,
  AUTOCOMPLETE: `${BASE_URL}/search`,
  
  // Content Details
  MOVIE_DETAILS: `${BASE_URL}/content`,
  TV_DETAILS: `${BASE_URL}/content`,
  SIMILAR: `${BASE_URL}/recommendations/similar`,
  
  // User Features (Authenticated)
  RECOMMENDATIONS: `${BASE_URL}/recommendations/personalized`,
  ML_RECOMMENDATIONS: `${BASE_URL}/recommendations/ml-personalized`,
  WATCHLIST: `${BASE_URL}/user/watchlist`,
  FAVORITES: `${BASE_URL}/user/favorites`,
  WATCH_HISTORY: `${BASE_URL}/user/activity`,
  USER_RATINGS: `${BASE_URL}/interactions`,
  
  // Admin
  ADMIN_SEARCH: `${BASE_URL}/admin/search`,
  ADMIN_CONTENT: `${BASE_URL}/admin/content`,
  ADMIN_RECOMMENDATIONS: `${BASE_URL}/admin/recommendations`,
  ADMIN_ANALYTICS: `${BASE_URL}/admin/analytics`,
  ADMIN_ML_CHECK: `${BASE_URL}/admin/ml-service-check`,
  ADMIN_ML_STATS: `${BASE_URL}/admin/ml-stats`
};

// App Configuration
const APP_CONFIG = {
  APP_NAME: 'CineScope',
  APP_VERSION: '1.0.0',
  API_TIMEOUT: 15000,
  CACHE_TTL: 300000, // 5 minutes
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/',
  IMAGE_SIZES: {
    poster_small: 'w300',
    poster_medium: 'w500',
    poster_large: 'w780',
    backdrop_small: 'w780',
    backdrop_large: 'w1280',
    backdrop_original: 'original'
  },
  ANIMATIONS: {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },
  BREAKPOINTS: {
    mobile: 575,
    tablet: 768,
    desktop: 992,
    wide: 1400
  },
  GENRES: {
    movie: [
      { id: 28, name: 'Action' },
      { id: 12, name: 'Adventure' },
      { id: 16, name: 'Animation' },
      { id: 35, name: 'Comedy' },
      { id: 80, name: 'Crime' },
      { id: 99, name: 'Documentary' },
      { id: 18, name: 'Drama' },
      { id: 10751, name: 'Family' },
      { id: 14, name: 'Fantasy' },
      { id: 36, name: 'History' },
      { id: 27, name: 'Horror' },
      { id: 10402, name: 'Music' },
      { id: 9648, name: 'Mystery' },
      { id: 10749, name: 'Romance' },
      { id: 878, name: 'Science Fiction' },
      { id: 53, name: 'Thriller' },
      { id: 10752, name: 'War' },
      { id: 37, name: 'Western' }
    ],
    tv: [
      { id: 10759, name: 'Action & Adventure' },
      { id: 16, name: 'Animation' },
      { id: 35, name: 'Comedy' },
      { id: 80, name: 'Crime' },
      { id: 99, name: 'Documentary' },
      { id: 18, name: 'Drama' },
      { id: 10751, name: 'Family' },
      { id: 10762, name: 'Kids' },
      { id: 9648, name: 'Mystery' },
      { id: 10763, name: 'News' },
      { id: 10764, name: 'Reality' },
      { id: 10765, name: 'Sci-Fi & Fantasy' },
      { id: 10766, name: 'Soap' },
      { id: 10767, name: 'Talk' },
      { id: 10768, name: 'War & Politics' },
      { id: 37, name: 'Western' }
    ]
  },
  REGIONAL_LANGUAGES: [
    { code: 'hindi', name: 'Hindi', region: 'IN' },
    { code: 'telugu', name: 'Telugu', region: 'IN' },
    { code: 'tamil', name: 'Tamil', region: 'IN' },
    { code: 'kannada', name: 'Kannada', region: 'IN' },
    { code: 'malayalam', name: 'Malayalam', region: 'IN' }
  ],
  ANIME_GENRES: [
    'shonen', 'shojo', 'seinen', 'josei', 'kodomomuke'
  ]
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BASE_URL, API_ENDPOINTS, APP_CONFIG };
}