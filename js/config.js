// Global configuration
const CONFIG = {
    API_BASE: 'https://backend-app-970m.onrender.com/api',
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p',
    TW_PREFIX: 'tw-',
    TOAST_DURATION: 3000,
    DEBOUNCE_DELAY: 300,
    PAGE_SIZE: 20,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    ROUTES: {
        HOME: '/',
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        SEARCH: '/content/search',
        DETAILS: '/content/details',
        ANIME: '/content/anime',
        GENRE: '/content/genre',
        REGIONAL: '/content/regional',
        WATCHLIST: '/user/watchlist',
        FAVORITES: '/user/favorites',
        SETTINGS: '/user/settings',
        ACTIVITY: '/user/activity',
        PROFILE: '/user/profile',
        ADMIN: '/admin/'
    }
};

// Safe area CSS variables
document.documentElement.style.setProperty('--safe-area-top', 'env(safe-area-inset-top)');
document.documentElement.style.setProperty('--safe-area-right', 'env(safe-area-inset-right)');
document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)');
document.documentElement.style.setProperty('--safe-area-left', 'env(safe-area-inset-left)');