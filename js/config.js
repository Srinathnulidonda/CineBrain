// Configuration
const CONFIG = {
    API_BASE: 'https://backend-app-970m.onrender.com/api',
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p',
    TAILWIND_PREFIX: 'tw-',
    TOKEN_KEY: 'cinescope_token',
    USER_KEY: 'cinescope_user',
    TOAST_DURATION: 3000,
    DEBOUNCE_DELAY: 500,
    PAGE_SIZE: 20,
    CACHE_TTL: 300000, // 5 minutes
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
        ADMIN: '/admin/',
        ADMIN_SEARCH: '/admin/search',
        ADMIN_RECOMMENDATIONS: '/admin/recommendations',
        ADMIN_ANALYTICS: '/admin/analytics',
        ADMIN_ML: '/admin/ml'
    },
    GENRES: {
        movie: [
            'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime',
            'Documentary', 'Drama', 'Fantasy', 'Horror', 'Musical', 'Mystery',
            'Romance', 'Sci-Fi', 'Thriller', 'Western'
        ],
        tv: [
            'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
            'Drama', 'Fantasy', 'Horror', 'Mystery', 'Reality', 'Romance',
            'Sci-Fi', 'Thriller'
        ],
        anime: ['Shonen', 'Shojo', 'Seinen', 'Josei', 'Kodomomuke']
    },
    LANGUAGES: [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'te', name: 'Telugu' },
        { code: 'ta', name: 'Tamil' },
        { code: 'kn', name: 'Kannada' },
        { code: 'ml', name: 'Malayalam' }
    ]
};

// Make CONFIG globally available
window.CONFIG = CONFIG;