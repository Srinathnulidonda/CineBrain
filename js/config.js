// config.js - Configuration and API endpoints (NO PLACEHOLDERS)
const CONFIG = {
    BASE_URL: 'https://backend-app-970m.onrender.com/api',

    // API Endpoints Map
    API_ENDPOINTS: {
        // Authentication
        LOGIN: '/login',
        REGISTER: '/register',
        REFRESH_TOKEN: '/refresh',
        LOGOUT: '/logout',

        // Content Discovery
        TRENDING: '/recommendations/trending',
        POPULAR: '/recommendations/trending?type=movie',
        TOP_RATED: '/recommendations/critics-choice',
        NEW_RELEASES: '/recommendations/new-releases',
        REGIONAL: '/recommendations/regional',
        GENRES: '/recommendations/genre',
        ANIME: '/recommendations/anime',
        ADMIN_CHOICE: '/recommendations/admin-choice',

        // Search & Filtering
        SEARCH: '/search',
        FILTER: '/search',
        AUTOCOMPLETE: '/search',

        // Content Details
        CONTENT_DETAILS: '/content',
        SIMILAR: '/recommendations/similar',

        // User Features (Authenticated)
        RECOMMENDATIONS: '/recommendations/personalized',
        ML_RECOMMENDATIONS: '/recommendations/ml-personalized',
        ANONYMOUS_RECOMMENDATIONS: '/recommendations/anonymous',
        WATCHLIST: '/user/watchlist',
        FAVORITES: '/user/favorites',
        INTERACTIONS: '/interactions',

        // Admin
        ADMIN_SEARCH: '/admin/search',
        ADMIN_CONTENT: '/admin/content',
        ADMIN_RECOMMENDATIONS: '/admin/recommendations',
        ADMIN_ANALYTICS: '/admin/analytics',
        ADMIN_ML_CHECK: '/admin/ml-service-check',
        ADMIN_ML_UPDATE: '/admin/ml-service-update',
        ADMIN_ML_STATS: '/admin/ml-stats'
    },

    // Performance Configuration
    CACHE_DURATION: {
        STATIC: 86400000, // 24 hours
        DYNAMIC: 30000,   // 30 seconds
        USER_DATA: 5000   // 5 seconds
    },

    // UI Configuration
    BREAKPOINTS: {
        MOBILE: 575,
        TABLET: 768,
        DESKTOP: 992,
        ULTRA_WIDE: 1400
    },

    // Feature Flags
    FEATURES: {
        LAZY_LOADING: true,
        INFINITE_SCROLL: true,
        OFFLINE_MODE: true,
        HAPTIC_FEEDBACK: true,
        VIDEO_PREVIEW: true,
        ML_RECOMMENDATIONS: true
    },

    // Regional Languages
    LANGUAGES: {
        hindi: { code: 'hi', name: 'Hindi', region: 'IN' },
        telugu: { code: 'te', name: 'Telugu', region: 'IN' },
        tamil: { code: 'ta', name: 'Tamil', region: 'IN' },
        kannada: { code: 'kn', name: 'Kannada', region: 'IN' },
        malayalam: { code: 'ml', name: 'Malayalam', region: 'IN' },
        english: { code: 'en', name: 'English', region: 'US' }
    },

    // Genre Mapping
    GENRES: {
        action: { id: 28, name: 'Action', icon: '🎬' },
        adventure: { id: 12, name: 'Adventure', icon: '🗺️' },
        animation: { id: 16, name: 'Animation', icon: '🎨' },
        comedy: { id: 35, name: 'Comedy', icon: '😄' },
        crime: { id: 80, name: 'Crime', icon: '🔍' },
        documentary: { id: 99, name: 'Documentary', icon: '📹' },
        drama: { id: 18, name: 'Drama', icon: '🎭' },
        fantasy: { id: 14, name: 'Fantasy', icon: '🦄' },
        horror: { id: 27, name: 'Horror', icon: '👻' },
        romance: { id: 10749, name: 'Romance', icon: '💕' },
        scifi: { id: 878, name: 'Sci-Fi', icon: '🚀' },
        thriller: { id: 53, name: 'Thriller', icon: '😱' }
    }
};

// Freeze configuration to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.API_ENDPOINTS);
Object.freeze(CONFIG.CACHE_DURATION);
Object.freeze(CONFIG.BREAKPOINTS);
Object.freeze(CONFIG.FEATURES);
Object.freeze(CONFIG.LANGUAGES);
Object.freeze(CONFIG.GENRES);