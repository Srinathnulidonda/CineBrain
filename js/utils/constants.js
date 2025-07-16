// API Configuration
const API_CONFIG = {
    BASE_URL: 'https://backend-app-970m.onrender.com/api',
    ENDPOINTS: {
        LOGIN: '/login',
        REGISTER: '/register',
        HOMEPAGE: '/homepage',
        RECOMMENDATIONS: '/recommendations',
        PERSONALIZED: '/recommendations/personalized',
        CONTENT_DETAILS: '/content',
        SEARCH: '/search',
        INTERACT: '/interact',
        ADMIN_BROWSE: '/admin/enhanced-browse',
        ADMIN_POSTS: '/admin/posts',
        ADMIN_ANALYTICS: '/admin/analytics'
    },
    TIMEOUT: 10000
};

// Image Configuration
const IMAGE_CONFIG = {
    TMDB_BASE: 'https://image.tmdb.org/t/p',
    SIZES: {
        POSTER_SMALL: 'w200',
        POSTER_MEDIUM: 'w342',
        POSTER_LARGE: 'w500',
        BACKDROP_SMALL: 'w780',
        BACKDROP_LARGE: 'w1280',
        PROFILE: 'w185'
    },
    PLACEHOLDER: 'assets/images/placeholder.jpg'
};

// UI Constants
const UI_CONFIG = {
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 500,
    SCROLL_THRESHOLD: 100,
    ITEMS_PER_PAGE: 20,
    MOBILE_BREAKPOINT: 768,
    TOUCH_SENSITIVITY: 50
};

// Interaction Types
const INTERACTION_TYPES = {
    VIEW: 'view',
    LIKE: 'like',
    FAVORITE: 'favorite',
    WISHLIST: 'wishlist',
    SHARE: 'share'
};

// Content Types
const CONTENT_TYPES = {
    MOVIE: 'movie',
    TV: 'tv',
    ANIME: 'anime'
};

// Genre Mapping
const GENRE_MAP = {
    28: "Action",
    12: "Adventure", 
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Science Fiction",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western"
};

// Regional Languages
const REGIONAL_LANGUAGES = {
    Telugu: 'te',
    Hindi: 'hi', 
    Tamil: 'ta',
    Kannada: 'kn',
    Malayalam: 'ml',
    Bengali: 'bn',
    Marathi: 'mr',
    Gujarati: 'gu',
    Punjabi: 'pa'
};

// App States
const APP_STATES = {
    LOADING: 'loading',
    LOADED: 'loaded',
    ERROR: 'error',
    OFFLINE: 'offline'
};

// Event Names
const EVENTS = {
    USER_LOGIN: 'user:login',
    USER_LOGOUT: 'user:logout',
    CONTENT_INTERACT: 'content:interact',
    SEARCH_QUERY: 'search:query',
    PAGE_CHANGE: 'page:change',
    THEME_CHANGE: 'theme:change',
    NETWORK_CHANGE: 'network:change'
};

// Error Messages
const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    AUTHENTICATION_ERROR: 'Please log in to continue.',
    NOT_FOUND: 'Content not found.',
    SERVER_ERROR: 'Server error. Please try again later.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    OFFLINE: 'You are currently offline. Some features may not be available.'
};

// Success Messages
const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'Login successful!',
    REGISTER_SUCCESS: 'Registration successful!',
    FAVORITE_ADDED: 'Added to favorites!',
    FAVORITE_REMOVED: 'Removed from favorites!',
    WISHLIST_ADDED: 'Added to wishlist!',
    WISHLIST_REMOVED: 'Removed from wishlist!'
};

// Local Storage Keys
const STORAGE_KEYS = {
    AUTH_TOKEN: 'cinestream_auth_token',
    USER_DATA: 'cinestream_user_data',
    USER_PREFERENCES: 'cinestream_user_preferences',
    SEARCH_HISTORY: 'cinestream_search_history',
    THEME: 'cinestream_theme',
    CACHE_TIMESTAMP: 'cinestream_cache_timestamp',
    OFFLINE_DATA: 'cinestream_offline_data'
};

// Theme Configuration
const THEME_CONFIG = {
    DARK: 'dark',
    LIGHT: 'light',
    AUTO: 'auto'
};

// Netflix Color Palette
const COLORS = {
    NETFLIX_RED: '#E50914',
    NETFLIX_DARK: '#141414',
    NETFLIX_SECONDARY: '#221f1f',
    NETFLIX_GRAY: '#999999',
    NETFLIX_LIGHT_GRAY: '#b3b3b3',
    WHITE: '#ffffff',
    BLACK: '#000000'
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_CONFIG,
        IMAGE_CONFIG,
        UI_CONFIG,
        INTERACTION_TYPES,
        CONTENT_TYPES,
        GENRE_MAP,
        REGIONAL_LANGUAGES,
        APP_STATES,
        EVENTS,
        ERROR_MESSAGES,
        SUCCESS_MESSAGES,
        STORAGE_KEYS,
        THEME_CONFIG,
        COLORS
    };
}