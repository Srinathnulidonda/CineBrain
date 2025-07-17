const CONFIG = {
    API: {
        BASE_URL: 'https://backend-app-970m.onrender.com/api',
        TIMEOUT: 10000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },
    
    EXTERNAL_APIS: {
        TMDB: {
            BASE_URL: 'https://api.themoviedb.org/3',
            IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
            IMAGE_SIZES: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original']
        },
        YOUTUBE: {
            BASE_URL: 'https://www.youtube.com',
            EMBED_URL: 'https://www.youtube.com/embed'
        }
    },
    
    CACHE: {
        DEFAULT_TTL: 3600000, // 1 hour
        USER_DATA_TTL: 86400000, // 24 hours
        CONTENT_TTL: 7200000, // 2 hours
        SEARCH_TTL: 1800000 // 30 minutes
    },
    
    UI: {
        ANIMATION_DURATION: 300,
        TOAST_DURATION: 5000,
        INFINITE_SCROLL_THRESHOLD: 200,
        DEBOUNCE_DELAY: 300,
        ITEMS_PER_PAGE: 20
    },
    
    FEATURES: {
        OFFLINE_MODE: true,
        PWA_ENABLED: true,
        PUSH_NOTIFICATIONS: false,
        ANALYTICS: true,
        ERROR_REPORTING: true
    },
    
    BREAKPOINTS: {
        XS: 576,
        SM: 768,
        MD: 992,
        LG: 1200,
        XL: 1400
    }
};

// Environment-specific overrides
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    CONFIG.API.BASE_URL = 'http://localhost:5000/api';
    CONFIG.FEATURES.ERROR_REPORTING = false;
}

window.CONFIG = CONFIG;