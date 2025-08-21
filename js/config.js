// CineScope Configuration - Real Backend Integration
const API_CONFIG = {
    BASE_URL: 'https://backend-app-970m.onrender.com/api',
    TIMEOUT: 15000,
    RETRY_ATTEMPTS: 3,
    CACHE_DURATION: 30000, // 30 seconds for dynamic data
    STATIC_CACHE_DURATION: 86400000 // 24 hours for static data
};

const API_ENDPOINTS = {
    // Authentication
    LOGIN: '/login',
    REGISTER: '/register',
    REFRESH_TOKEN: '/refresh-token',
    LOGOUT: '/logout',
    
    // Content Discovery
    SEARCH: '/search',
    CONTENT_DETAILS: '/content/{id}',
    AUTOCOMPLETE: '/search?query={query}&limit=5',
    
    // Recommendations (Real ML-Powered)
    TRENDING: '/recommendations/trending',
    POPULAR: '/recommendations/trending?type=movie',
    TOP_RATED: '/recommendations/critics-choice',
    NEW_RELEASES: '/recommendations/new-releases',
    CRITICS_CHOICE: '/recommendations/critics-choice',
    
    // Genre & Regional
    GENRES: '/recommendations/genre/{genre}',
    REGIONAL: '/recommendations/regional/{language}',
    ANIME: '/recommendations/anime',
    
    // Personalized (Authenticated)
    RECOMMENDATIONS: '/recommendations/personalized',
    ML_RECOMMENDATIONS: '/recommendations/ml-personalized',
    SIMILAR: '/recommendations/similar/{id}',
    
    // User Features
    WATCHLIST: '/user/watchlist',
    FAVORITES: '/user/favorites',
    USER_ACTIVITY: '/user/activity',
    USER_PROFILE: '/user/profile',
    USER_SETTINGS: '/user/settings',
    INTERACTIONS: '/interactions',
    
    // Admin Dashboard
    ADMIN_SEARCH: '/admin/search',
    ADMIN_CONTENT: '/admin/content',
    ADMIN_RECOMMENDATIONS: '/admin/recommendations',
    ADMIN_ANALYTICS: '/admin/analytics',
    ADMIN_ML_CHECK: '/admin/ml-service-check',
    ADMIN_ML_UPDATE: '/admin/ml-service-update',
    
    // Public Admin Choices
    ADMIN_CHOICE: '/recommendations/admin-choice'
};

const PERFORMANCE_CONFIG = {
    PRELOAD_IMAGES: 5,
    LAZY_LOAD_THRESHOLD: 200,
    DEBOUNCE_SEARCH: 300,
    CAROUSEL_AUTOPLAY: 5000,
    ANIMATION_DURATION: 200,
    SCROLL_THRESHOLD: 100
};

const UI_CONFIG = {
    CARDS_PER_ROW: {
        mobile: 2,
        tablet: 3,
        desktop: 5,
        ultrawide: 7
    },
    PAGINATION_SIZE: 20,
    SEARCH_SUGGESTION_LIMIT: 8,
    RECOMMENDATION_SECTIONS: {
        trending: 20,
        newReleases: 15,
        criticsChoice: 12,
        genre: 10,
        similar: 8
    }
};

// Performance Markers
const PERF_MARKS = {
    APP_START: 'app-start',
    API_READY: 'api-ready', 
    AUTH_READY: 'auth-ready',
    FIRST_CONTENT: 'first-content',
    INTERACTIVE: 'interactive'
};

// Export for global access
window.CineScope = {
    API_CONFIG,
    API_ENDPOINTS,
    PERFORMANCE_CONFIG,
    UI_CONFIG,
    PERF_MARKS
};