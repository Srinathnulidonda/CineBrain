// CineBrain Configuration & API Endpoints
const CONFIG = {
    APP_NAME: 'CineBrain',
    APP_TAGLINE: 'The Mind Behind Your Next Favorite',
    VERSION: '2.0.0',

    // Backend API Configuration
    API: {
        BASE_URL: 'https://backend-app-970m.onrender.com/api',
        TIMEOUT: 10000, // 10 seconds
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000 // 1 second
    },

    // Performance Settings
    PERFORMANCE: {
        API_CACHE_DURATION: 300000, // 5 minutes
        IMAGE_LAZY_LOAD: true,
        PREFETCH_ENABLED: true,
        SERVICE_WORKER_ENABLED: true
    },

    // UI Settings
    UI: {
        ITEMS_PER_PAGE: 20,
        MOBILE_BREAKPOINT: 768,
        ANIMATION_DURATION: 300,
        DEBOUNCE_DELAY: 500
    }
};

// API Endpoints Map (Real Backend Integration)
const API_ENDPOINTS = {
    // Authentication
    LOGIN: '/login',
    REGISTER: '/register',

    // Content Discovery
    SEARCH: '/search',
    TRENDING: '/recommendations/trending',
    NEW_RELEASES: '/recommendations/new-releases',
    CRITICS_CHOICE: '/recommendations/critics-choice',
    GENRE_RECS: '/recommendations/genre',
    REGIONAL: '/recommendations/regional',
    ANIME: '/recommendations/anime',
    ADMIN_CHOICE: '/recommendations/admin-choice',
    ANONYMOUS_RECS: '/recommendations/anonymous',

    // Content Details
    CONTENT_DETAILS: '/content',
    SIMILAR: '/recommendations/similar',

    // User Features (Authenticated)
    PERSONALIZED: '/recommendations/personalized',
    ML_PERSONALIZED: '/recommendations/ml-personalized',
    WATCHLIST: '/user/watchlist',
    FAVORITES: '/user/favorites',
    INTERACTIONS: '/interactions',

    // Admin Features
    ADMIN_SEARCH: '/admin/search',
    ADMIN_CONTENT: '/admin/content',
    ADMIN_RECOMMENDATIONS: '/admin/recommendations',
    ADMIN_ANALYTICS: '/admin/analytics',

    // System
    HEALTH: '/health'
};

// Content Types & Genres
const CONTENT_TYPES = {
    MOVIE: 'movie',
    TV: 'tv',
    ANIME: 'anime',
    ALL: 'all'
};

const GENRES = {
    ACTION: 'action',
    ADVENTURE: 'adventure',
    ANIMATION: 'animation',
    BIOGRAPHY: 'biography',
    COMEDY: 'comedy',
    CRIME: 'crime',
    DOCUMENTARY: 'documentary',
    DRAMA: 'drama',
    FANTASY: 'fantasy',
    HORROR: 'horror',
    MUSICAL: 'musical',
    MYSTERY: 'mystery',
    ROMANCE: 'romance',
    SCI_FI: 'sci-fi',
    THRILLER: 'thriller',
    WESTERN: 'western'
};

const REGIONAL_LANGUAGES = {
    HINDI: 'hindi',
    TELUGU: 'telugu',
    TAMIL: 'tamil',
    KANNADA: 'kannada',
    MALAYALAM: 'malayalam',
    ENGLISH: 'english'
};

// Theme Configuration
const THEME_CONFIG = {
    DEFAULT: 'dark',
    STORAGE_KEY: 'cinebrain-theme',
    AUTO_DETECT: true
};

// Image Configuration
const IMAGE_CONFIG = {
    POSTER_SIZES: {
        SMALL: 'w200',
        MEDIUM: 'w300',
        LARGE: 'w500',
        XLARGE: 'w780'
    },
    BACKDROP_SIZES: {
        SMALL: 'w300',
        MEDIUM: 'w780',
        LARGE: 'w1280',
        ORIGINAL: 'original'
    },
    PLACEHOLDER: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSI0NTAiIGZpbGw9IiMxNDE0MTgiLz48dGV4dCB4PSIxNTAiIHk9IjIyNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='
};

// Local Storage Keys
const STORAGE_KEYS = {
    AUTH_TOKEN: 'cinebrain-token',
    USER_DATA: 'cinebrain-user',
    THEME: 'cinebrain-theme',
    SEARCH_HISTORY: 'cinebrain-search-history',
    VIEWED_CONTENT: 'cinebrain-viewed',
    API_CACHE: 'cinebrain-api-cache'
};

// Utility Functions
const UTILS = {
    // Generate unique session ID
    generateSessionId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Format date
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Format rating
    formatRating(rating) {
        if (!rating) return 'N/A';
        return parseFloat(rating).toFixed(1);
    },

    // Truncate text
    truncateText(text, maxLength = 150) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    },

    // Get rating color class
    getRatingColorClass(rating) {
        if (!rating) return 'text-gray-400';
        if (rating >= 8) return 'text-green-500';
        if (rating >= 6) return 'text-yellow-500';
        if (rating >= 4) return 'text-orange-500';
        return 'text-red-500';
    },

    // Get genre color class
    getGenreColorClass(genre) {
        const genreMap = {
            'Action': 'genre-action',
            'Comedy': 'genre-comedy',
            'Drama': 'genre-drama',
            'Horror': 'genre-horror',
            'Romance': 'genre-romance',
            'Science Fiction': 'genre-scifi',
            'Thriller': 'genre-thriller'
        };
        return genreMap[genre] || 'genre-chip';
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, API_ENDPOINTS, CONTENT_TYPES, GENRES, REGIONAL_LANGUAGES, THEME_CONFIG, IMAGE_CONFIG, STORAGE_KEYS, UTILS };
}