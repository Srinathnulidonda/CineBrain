// CineScope Configuration & API Endpoints
export const API_ENDPOINTS = {
  BASE_URL: 'https://backend-app-970m.onrender.com/api',

  // Content Discovery (real)
  TRENDING: '/recommendations/trending',
  NEW_RELEASES: '/recommendations/new-releases',
  TOP_RATED: '/recommendations/critics-choice',
  REGIONAL: '/recommendations/regional',
  GENRE_RECS: '/recommendations/genre',
  ANIME: '/recommendations/anime',
  ADMIN_CHOICE: '/recommendations/admin-choice',
  ANONYMOUS_RECS: '/recommendations/anonymous',

  // Search & Filtering (real)
  SEARCH: '/search',
  AUTOCOMPLETE: '/search',
  FILTER: null,

  // Content Details (real)
  CONTENT_DETAILS: '/content',
  SIMILAR: '/recommendations/similar',
  MOVIE_DETAILS: '/content',
  TV_DETAILS: '/content',
  CAST_CREW: '/content',
  REVIEWS: null,

  // User Features (Authenticated; real)
  RECOMMENDATIONS: '/recommendations/personalized',
  ML_RECOMMENDATIONS: '/recommendations/ml-personalized',
  WATCHLIST: '/user/watchlist',
  FAVORITES: '/user/favorites',
  WATCH_HISTORY: null,
  USER_RATINGS: '/interactions',

  // Authentication (real)
  LOGIN: '/login',
  REGISTER: '/register',
  REFRESH_TOKEN: null,
  LOGOUT: null,

  // Admin
  ADMIN_SEARCH: '/admin/search',
  ADMIN_CONTENT: '/admin/content',
  ADMIN_RECOMMENDATIONS: '/admin/recommendations',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_ML_CHECK: '/admin/ml-service-check',

  // Health (real)
  HEALTH: '/health',
};

// URL Builders
export const buildUrl = {
  // Content
  contentDetails: (id) => `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.CONTENT_DETAILS}/${id}`,
  movieDetails: (id) => `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.MOVIE_DETAILS}/${id}`,
  tvDetails: (id) => `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.TV_DETAILS}/${id}`,
  castCrew: (id) => `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.CAST_CREW}/${id}`,
  similar: (id, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.SIMILAR}/${id}${qs ? `?${qs}` : ''}`;
  },

  // Recommendations
  trending: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.TRENDING}${qs ? `?${qs}` : ''}`;
  },
  newReleases: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.NEW_RELEASES}${qs ? `?${qs}` : ''}`;
  },
  topRated: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.TOP_RATED}${qs ? `?${qs}` : ''}`;
  },
  regional: (language, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.REGIONAL}/${language}${qs ? `?${qs}` : ''}`;
  },
  genreRecs: (genre, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.GENRE_RECS}/${genre}${qs ? `?${qs}` : ''}`;
  },
  anime: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.ANIME}${qs ? `?${qs}` : ''}`;
  },
  adminChoice: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.ADMIN_CHOICE}${qs ? `?${qs}` : ''}`;
  },
  anonymousRecs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.ANONYMOUS_RECS}${qs ? `?${qs}` : ''}`;
  },

  // Search
  search: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.SEARCH}${qs ? `?${qs}` : ''}`;
  },

  // Auth
  login: () => `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.LOGIN}`,
  register: () => `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.REGISTER}`,

  // User
  watchlist: () => `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WATCHLIST}`,
  favorites: () => `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.FAVORITES}`,
  userRatings: () => `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USER_RATINGS}`,
  
  // Admin
  adminSearch: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.ADMIN_SEARCH}${qs ? `?${qs}` : ''}`;
  },
  adminContent: () => `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.ADMIN_CONTENT}`,
  adminRecommendations: () => `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.ADMIN_RECOMMENDATIONS}`,
  adminAnalytics: () => `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.ADMIN_ANALYTICS}`,
  adminMLCheck: () => `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.ADMIN_ML_CHECK}`,
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'CineScope',
  VERSION: '2.0.0',
  CACHE_DURATION: {
    STATIC: 24 * 60 * 60 * 1000, // 24 hours
    DYNAMIC: 30 * 1000, // 30 seconds
    USER_DATA: 5 * 60 * 1000, // 5 minutes
  },
  PERFORMANCE: {
    PRELOAD_LIMIT: 10,
    INFINITE_SCROLL_THRESHOLD: 200,
    DEBOUNCE_DELAY: 300,
    ANIMATION_DURATION: 200,
  },
  BREAKPOINTS: {
    MOBILE: 575,
    TABLET: 768,
    DESKTOP: 992,
    ULTRAWIDE: 1400,
  },
  YOUTUBE_EMBED_BASE: 'https://www.youtube.com/embed/',
  DEFAULT_POSTER: '/assets/default-poster.jpg',
  AVATAR_API: 'https://ui-avatars.com/api/',
};

// Genres mapping
export const GENRES = {
  ACTION: 'action',
  ADVENTURE: 'adventure',
  ANIMATION: 'animation',
  COMEDY: 'comedy',
  CRIME: 'crime',
  DOCUMENTARY: 'documentary',
  DRAMA: 'drama',
  FAMILY: 'family',
  FANTASY: 'fantasy',
  HISTORY: 'history',
  HORROR: 'horror',
  MUSIC: 'music',
  MYSTERY: 'mystery',
  ROMANCE: 'romance',
  SCIENCE_FICTION: 'sci-fi',
  THRILLER: 'thriller',
  WAR: 'war',
  WESTERN: 'western'
};

// Regional languages
export const REGIONAL_LANGUAGES = {
  HINDI: 'hindi',
  TELUGU: 'telugu',
  TAMIL: 'tamil',
  KANNADA: 'kannada',
  MALAYALAM: 'malayalam',
  ENGLISH: 'english'
};

// Preload critical data
export const PRELOAD_ENDPOINTS = [
  () => buildUrl.trending({ limit: 10 }),
  () => buildUrl.adminChoice({ limit: 5 }),
  () => buildUrl.newReleases({ limit: 5, type: 'movie' }),
  () => buildUrl.topRated({ limit: 5, type: 'movie' }),
];

export default {
  API_ENDPOINTS,
  buildUrl,
  APP_CONFIG,
  GENRES,
  REGIONAL_LANGUAGES,
  PRELOAD_ENDPOINTS
};