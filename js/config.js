// CineScope Configuration - Production Ready
const CONFIG = {
    API_BASE_URL: 'https://backend-app-970m.onrender.com/api',

    // API Endpoints Map
    API_ENDPOINTS: {
        // Authentication
        LOGIN: '/login',
        REGISTER: '/register',
        REFRESH_TOKEN: '/refresh-token',
        LOGOUT: '/logout',

        // Content Discovery
        TRENDING: '/recommendations/trending',
        POPULAR: '/recommendations/popular',
        TOP_RATED: '/recommendations/top-rated',
        NEW_RELEASES: '/recommendations/new-releases',
        CRITICS_CHOICE: '/recommendations/critics-choice',
        ADMIN_CHOICE: '/recommendations/admin-choice',

        // Regional & Genre
        REGIONAL: '/recommendations/regional',
        GENRES: '/recommendations/genre',
        ANIME: '/recommendations/anime',

        // Search & Filtering
        SEARCH: '/search',
        AUTOCOMPLETE: '/search/autocomplete',
        FILTER: '/filter',

        // Content Details
        CONTENT_DETAILS: '/content',
        SIMILAR: '/recommendations/similar',

        // User Features
        RECOMMENDATIONS: '/recommendations/personalized',
        ML_RECOMMENDATIONS: '/recommendations/ml-personalized',
        WATCHLIST: '/user/watchlist',
        FAVORITES: '/user/favorites',
        WATCH_HISTORY: '/user/activity',
        INTERACTIONS: '/interactions',

        // Admin
        ADMIN_SEARCH: '/admin/search',
        ADMIN_CONTENT: '/admin/content',
        ADMIN_RECOMMENDATIONS: '/admin/recommendations',
        ADMIN_ANALYTICS: '/admin/analytics',
        ADMIN_ML_CHECK: '/admin/ml-service-check',
        ADMIN_ML_STATS: '/admin/ml-stats'
    },

    // Performance Settings
    CACHE_DURATION: {
        CONTENT: 30000, // 30 seconds for dynamic content
        STATIC: 86400000, // 24 hours for static content
        USER: 5000 // 5 seconds for user data
    },

    // UI Settings
    LAZY_LOAD_OFFSET: 50,
    INFINITE_SCROLL_THRESHOLD: 200,
    DEBOUNCE_DELAY: 300,
    ANIMATION_DURATION: 200,

    // Feature Flags
    FEATURES: {
        SERVICE_WORKER: true,
        OFFLINE_MODE: true,
        PUSH_NOTIFICATIONS: false,
        HAPTIC_FEEDBACK: true
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);