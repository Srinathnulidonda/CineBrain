// CineBrain Configuration - No Placeholders
const CONFIG = {
    BASE_URL: 'https://backend-app-970m.onrender.com',
    CDN_BASE: 'https://image.tmdb.org/t/p',
    YOUTUBE_BASE: 'https://www.youtube.com/watch?v=',
    
    API_ENDPOINTS: {
        // Authentication
        REGISTER: '/api/register',
        LOGIN: '/api/login',
        
        // Search & Discovery
        SEARCH: '/api/search',
        CONTENT_DETAILS: '/api/content',
        
        // Recommendations
        TRENDING: '/api/recommendations/trending',
        NEW_RELEASES: '/api/recommendations/new-releases', 
        CRITICS_CHOICE: '/api/recommendations/critics-choice',
        GENRE: '/api/recommendations/genre',
        REGIONAL: '/api/recommendations/regional',
        ANIME: '/api/recommendations/anime',
        SIMILAR: '/api/recommendations/similar',
        PERSONALIZED: '/api/recommendations/personalized',
        ML_PERSONALIZED: '/api/recommendations/ml-personalized',
        ANONYMOUS: '/api/recommendations/anonymous',
        ADMIN_CHOICE: '/api/recommendations/admin-choice',
        
        // User Management
        USER_WATCHLIST: '/api/user/watchlist',
        USER_FAVORITES: '/api/user/favorites',
        INTERACTIONS: '/api/interactions',
        
        // Admin
        ADMIN_SEARCH: '/api/admin/search',
        ADMIN_CONTENT: '/api/admin/content',
        ADMIN_RECOMMENDATIONS: '/api/admin/recommendations',
        ADMIN_ANALYTICS: '/api/admin/analytics',
        ADMIN_ML_CHECK: '/api/admin/ml-service-check',
        ADMIN_ML_UPDATE: '/api/admin/ml-service-update',
        ADMIN_ML_STATS: '/api/admin/ml-stats',
        
        // System
        HEALTH: '/api/health'
    },
    
    POSTER_SIZES: {
        MINI: '/w185',
        SMALL: '/w300', 
        MEDIUM: '/w500',
        LARGE: '/w780'
    },
    
    BACKDROP_SIZES: {
        SMALL: '/w780',
        MEDIUM: '/w1280', 
        LARGE: '/original'
    },
    
    GENRES: {
        ACTION: 'Action',
        ADVENTURE: 'Adventure', 
        ANIMATION: 'Animation',
        COMEDY: 'Comedy',
        CRIME: 'Crime',
        DOCUMENTARY: 'Documentary',
        DRAMA: 'Drama',
        FAMILY: 'Family',
        FANTASY: 'Fantasy',
        HISTORY: 'History',
        HORROR: 'Horror',
        MUSIC: 'Music',
        MYSTERY: 'Mystery',
        ROMANCE: 'Romance',
        SCIENCE_FICTION: 'Science Fiction',
        THRILLER: 'Thriller',
        WAR: 'War',
        WESTERN: 'Western'
    },
    
    REGIONAL_LANGUAGES: {
        HINDI: 'hindi',
        TELUGU: 'telugu', 
        TAMIL: 'tamil',
        KANNADA: 'kannada',
        MALAYALAM: 'malayalam',
        ENGLISH: 'english'
    },
    
    ANIME_GENRES: {
        SHONEN: 'shonen',
        SHOJO: 'shojo', 
        SEINEN: 'seinen',
        JOSEI: 'josei',
        KODOMOMUKE: 'kodomomuke'
    },
    
    CONTENT_TYPES: {
        MOVIE: 'movie',
        TV: 'tv',
        ANIME: 'anime'
    },
    
    INTERACTION_TYPES: {
        VIEW: 'view',
        LIKE: 'like', 
        FAVORITE: 'favorite',
        WATCHLIST: 'watchlist',
        RATING: 'rating',
        SEARCH: 'search'
    },
    
    PERFORMANCE: {
        CACHE_DURATION: 300000, // 5 minutes
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        REQUEST_TIMEOUT: 10000,
        PRELOAD_DELAY: 100
    },
    
    UI: {
        MOBILE_BREAKPOINT: 768,
        TABLET_BREAKPOINT: 1024,
        DESKTOP_BREAKPOINT: 1200,
        CARDS_PER_ROW_MOBILE: 2,
        CARDS_PER_ROW_TABLET: 4, 
        CARDS_PER_ROW_DESKTOP: 6,
        HERO_ROTATION_INTERVAL: 5000,
        SEARCH_DEBOUNCE: 300
    }
};

// Feature Detection
CONFIG.FEATURES = {
    SERVICE_WORKER: 'serviceWorker' in navigator,
    WEB_P: (() => {
        const canvas = document.createElement('canvas');
        return canvas.toDataURL && canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })(),
    INTERSECTION_OBSERVER: 'IntersectionObserver' in window,
    HISTORY_API: !!(window.history && window.history.pushState)
};

// Environment Detection  
CONFIG.ENV = {
    IS_MOBILE: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    IS_STANDALONE: window.matchMedia('(display-mode: standalone)').matches,
    IS_DEVELOPMENT: location.hostname === 'localhost' || location.hostname === '127.0.0.1',
    CONNECTION_TYPE: navigator.connection ? navigator.connection.effectiveType : 'unknown'
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}