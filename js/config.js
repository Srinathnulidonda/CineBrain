// CineScope Configuration
const CONFIG = {
    // API Configuration
    API_BASE: 'https://backend-app-970m.onrender.com/api',
    API_TIMEOUT: 15000,

    // Application Settings
    APP_NAME: 'CineScope',
    APP_VERSION: '2.0.0',
    TW_PREFIX: 'tw-',

    // Pagination
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 50,

    // Image Configuration
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p/',
    DEFAULT_POSTER_SIZES: ['w300', 'w500'],
    DEFAULT_BACKDROP_SIZES: ['w780', 'w1280'],
    PLACEHOLDER_IMAGE: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWExYTFkIi8+CjxwYXRoIGQ9Ik0xNTAgMjI1TDE3NSAyMDBIMTI1TDE1MCAyMjVaTTE1MCAyMjVMMTI1IDI1MEgxNzVMMTUwIDIyNVoiIGZpbGw9IiM2YjdiODAiLz4KPHN2Zz4K',

    // YouTube Configuration
    YOUTUBE_BASE: 'https://www.youtube.com/watch?v=',
    YOUTUBE_EMBED_BASE: 'https://www.youtube.com/embed/',

    // Local Storage Keys
    STORAGE_KEYS: {
        AUTH_TOKEN: 'cinescope_auth_token',
        USER_DATA: 'cinescope_user_data',
        THEME_PREFERENCE: 'cinescope_theme',
        LANGUAGE_PREFERENCE: 'cinescope_language',
        SEARCH_HISTORY: 'cinescope_search_history',
        RECENTLY_VIEWED: 'cinescope_recently_viewed',
        USER_PREFERENCES: 'cinescope_user_preferences'
    },

    // Session Storage Keys
    SESSION_KEYS: {
        CURRENT_ROUTE: 'cinescope_current_route',
        SEARCH_FILTERS: 'cinescope_search_filters',
        SCROLL_POSITION: 'cinescope_scroll_position',
        TEMP_DATA: 'cinescope_temp_data'
    },

    // Content Types
    CONTENT_TYPES: {
        MOVIE: 'movie',
        TV: 'tv',
        ANIME: 'anime',
        ALL: 'all'
    },

    // Genres
    MOVIE_GENRES: [
        'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
        'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
        'Romance', 'Science Fiction', 'Thriller', 'War', 'Western'
    ],

    ANIME_GENRES: [
        'Shonen', 'Shojo', 'Seinen', 'Josei', 'Kodomomuke'
    ],

    // Regional Languages
    REGIONAL_LANGUAGES: [
        { code: 'hindi', name: 'Hindi', flag: '🇮🇳' },
        { code: 'telugu', name: 'Telugu', flag: '🇮🇳' },
        { code: 'tamil', name: 'Tamil', flag: '🇮🇳' },
        { code: 'kannada', name: 'Kannada', flag: '🇮🇳' },
        { code: 'malayalam', name: 'Malayalam', flag: '🇮🇳' },
        { code: 'english', name: 'English', flag: '🇺🇸' }
    ],

    // Recommendation Types
    RECOMMENDATION_TYPES: {
        TRENDING: 'trending',
        NEW_RELEASES: 'new-releases',
        CRITICS_CHOICE: 'critics-choice',
        PERSONALIZED: 'personalized',
        SIMILAR: 'similar',
        GENRE: 'genre',
        REGIONAL: 'regional',
        ANIME: 'anime',
        ADMIN_CHOICE: 'admin-choice'
    },

    // User Interaction Types
    INTERACTION_TYPES: {
        VIEW: 'view',
        LIKE: 'like',
        FAVORITE: 'favorite',
        WATCHLIST: 'watchlist',
        SEARCH: 'search',
        SHARE: 'share'
    },

    // Admin Panel
    ADMIN_ROLES: {
        SUPER_ADMIN: 'super_admin',
        ADMIN: 'admin',
        MODERATOR: 'moderator'
    },

    // Performance Settings
    PERFORMANCE: {
        DEBOUNCE_DELAY: 300,
        THROTTLE_DELAY: 100,
        LAZY_LOAD_THRESHOLD: 100,
        INTERSECTION_THRESHOLD: 0.1,
        MAX_CONCURRENT_REQUESTS: 6,
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },

    // Animation Settings
    ANIMATION: {
        FAST: 200,
        NORMAL: 300,
        SLOW: 500,
        VERY_SLOW: 800,
        STAGGER_DELAY: 100
    },

    // Breakpoints (matching CSS)
    BREAKPOINTS: {
        XS: 0,
        SM: 576,
        MD: 768,
        LG: 992,
        XL: 1200,
        XXL: 1400
    },

    // Error Messages
    ERROR_MESSAGES: {
        NETWORK_ERROR: 'Network error. Please check your connection.',
        AUTH_REQUIRED: 'Please log in to continue.',
        ACCESS_DENIED: 'Access denied. Insufficient permissions.',
        NOT_FOUND: 'Content not found.',
        SERVER_ERROR: 'Server error. Please try again later.',
        VALIDATION_ERROR: 'Please check your input and try again.',
        RATE_LIMIT: 'Too many requests. Please wait and try again.',
        OFFLINE: 'You are currently offline.',
        TIMEOUT: 'Request timed out. Please try again.'
    },

    // Success Messages
    SUCCESS_MESSAGES: {
        LOGIN_SUCCESS: 'Successfully logged in!',
        LOGOUT_SUCCESS: 'Successfully logged out!',
        REGISTER_SUCCESS: 'Account created successfully!',
        PROFILE_UPDATED: 'Profile updated successfully!',
        SETTINGS_SAVED: 'Settings saved successfully!',
        ADDED_TO_WATCHLIST: 'Added to watchlist!',
        REMOVED_FROM_WATCHLIST: 'Removed from watchlist!',
        ADDED_TO_FAVORITES: 'Added to favorites!',
        REMOVED_FROM_FAVORITES: 'Removed from favorites!'
    },

    // Rating Ranges
    RATING_RANGES: {
        HIGH: { min: 7.5, max: 10, class: 'high', color: '#22c55e' },
        MEDIUM: { min: 5.0, max: 7.4, class: 'medium', color: '#f59e0b' },
        LOW: { min: 0, max: 4.9, class: 'low', color: '#ef4444' }
    },

    // Feature Flags
    FEATURES: {
        DARK_MODE: true,
        PWA_ENABLED: true,
        OFFLINE_SUPPORT: true,
        PUSH_NOTIFICATIONS: true,
        ANALYTICS: true,
        ML_RECOMMENDATIONS: true,
        ADMIN_PANEL: true,
        USER_PROFILES: true,
        SOCIAL_FEATURES: false,
        PREMIUM_FEATURES: false
    },

    // Development Settings
    DEV: {
        ENABLE_LOGS: false,
        MOCK_API: false,
        SHOW_PERFORMANCE: false,
        ENABLE_DEBUG: false
    },

    // PWA Settings
    PWA: {
        UPDATE_AVAILABLE_MESSAGE: 'A new version is available. Refresh to update.',
        INSTALL_PROMPT_MESSAGE: 'Install CineScope for a better experience!',
        OFFLINE_MESSAGE: 'You are currently offline. Some features may be limited.'
    }
};

// Environment Detection
CONFIG.IS_PRODUCTION = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
CONFIG.IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
CONFIG.IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
CONFIG.IS_ANDROID = /Android/.test(navigator.userAgent);
CONFIG.IS_TOUCH_DEVICE = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
CONFIG.SUPPORTS_WEBP = (() => {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
})();

// Browser Capabilities
CONFIG.BROWSER_SUPPORT = {
    intersection_observer: 'IntersectionObserver' in window,
    service_worker: 'serviceWorker' in navigator,
    local_storage: (() => {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }
    })(),
    fetch: 'fetch' in window,
    web_share: 'share' in navigator,
    fullscreen: 'requestFullscreen' in document.documentElement,
    picture_in_picture: 'pictureInPictureEnabled' in document
};

// Performance Monitoring
CONFIG.PERFORMANCE_OBSERVER = (() => {
    if (!CONFIG.DEV.SHOW_PERFORMANCE || !('PerformanceObserver' in window)) {
        return null;
    }

    const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
            if (CONFIG.DEV.ENABLE_LOGS) {
                console.log(`Performance: ${entry.name} - ${entry.duration.toFixed(2)}ms`);
            }
        });
    });

    try {
        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        return observer;
    } catch (e) {
        return null;
    }
})();

// Freeze configuration in production
if (CONFIG.IS_PRODUCTION) {
    Object.freeze(CONFIG);
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Global access
window.CONFIG = CONFIG;