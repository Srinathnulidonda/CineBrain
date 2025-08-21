// Application Configuration
const Config = {
    API_BASE: 'https://backend-app-970m.onrender.com/api',
    APP_NAME: 'CineScope',
    APP_VERSION: '1.0.0',

    // TMDB Configuration
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p/',
    TMDB_POSTER_SIZES: {
        small: 'w185',
        medium: 'w300',
        large: 'w500',
        original: 'original'
    },
    TMDB_BACKDROP_SIZES: {
        small: 'w300',
        medium: 'w780',
        large: 'w1280',
        original: 'original'
    },

    // Application Settings
    DEFAULT_AVATAR: '/assets/images/default-avatar.png',
    ITEMS_PER_PAGE: 20,
    DEBOUNCE_DELAY: 300,
    TOKEN_KEY: 'cinescope_token',
    USER_KEY: 'cinescope_user',
    THEME_KEY: 'cinescope_theme',

    // Content Types
    CONTENT_TYPES: {
        MOVIE: 'movie',
        TV: 'tv',
        ANIME: 'anime',
        ALL: 'all'
    },

    // Genres
    GENRES: {
        movie: ['Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Fantasy', 'Horror', 'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Western'],
        anime: ['Shonen', 'Shojo', 'Seinen', 'Josei', 'Kodomomuke']
    },

    // Regional Languages
    LANGUAGES: {
        hindi: { code: 'hi', name: 'Hindi', region: 'Bollywood' },
        telugu: { code: 'te', name: 'Telugu', region: 'Tollywood' },
        tamil: { code: 'ta', name: 'Tamil', region: 'Kollywood' },
        kannada: { code: 'kn', name: 'Kannada', region: 'Sandalwood' },
        malayalam: { code: 'ml', name: 'Malayalam', region: 'Mollywood' },
        english: { code: 'en', name: 'English', region: 'Hollywood' }
    },

    // API Endpoints
    ENDPOINTS: {
        // Auth
        LOGIN: '/login',
        REGISTER: '/register',
        LOGOUT: '/logout',

        // Content
        SEARCH: '/search',
        CONTENT_DETAILS: '/content',

        // Recommendations
        TRENDING: '/recommendations/trending',
        NEW_RELEASES: '/recommendations/new-releases',
        CRITICS_CHOICE: '/recommendations/critics-choice',
        GENRE: '/recommendations/genre',
        REGIONAL: '/recommendations/regional',
        ANIME: '/recommendations/anime',
        SIMILAR: '/recommendations/similar',
        PERSONALIZED: '/recommendations/personalized',
        ANONYMOUS: '/recommendations/anonymous',
        ADMIN_CHOICE: '/recommendations/admin-choice',

        // User
        INTERACTIONS: '/interactions',
        WATCHLIST: '/user/watchlist',
        FAVORITES: '/user/favorites',

        // Admin
        ADMIN_SEARCH: '/admin/search',
        ADMIN_CONTENT: '/admin/content',
        ADMIN_RECOMMENDATIONS: '/admin/recommendations',
        ADMIN_ANALYTICS: '/admin/analytics'
    },

    // Interaction Types
    INTERACTIONS: {
        VIEW: 'view',
        LIKE: 'like',
        FAVORITE: 'favorite',
        WATCHLIST: 'watchlist',
        SEARCH: 'search',
        RATING: 'rating'
    },

    // Toast Messages
    MESSAGES: {
        LOGIN_SUCCESS: 'Welcome back to CineScope!',
        LOGIN_FAILED: 'Invalid credentials. Please try again.',
        REGISTER_SUCCESS: 'Account created successfully!',
        REGISTER_FAILED: 'Registration failed. Please try again.',
        LOGOUT_SUCCESS: 'You have been logged out.',
        SESSION_EXPIRED: 'Your session has expired. Please login again.',
        NETWORK_ERROR: 'Network error. Please check your connection.',
        GENERIC_ERROR: 'Something went wrong. Please try again.',
        WATCHLIST_ADD: 'Added to watchlist',
        WATCHLIST_REMOVE: 'Removed from watchlist',
        FAVORITE_ADD: 'Added to favorites',
        FAVORITE_REMOVE: 'Removed from favorites'
    },

    // Validation Rules
    VALIDATION: {
        USERNAME_MIN: 3,
        USERNAME_MAX: 20,
        PASSWORD_MIN: 6,
        PASSWORD_MAX: 50,
        EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    }
};

// Freeze configuration to prevent modifications
Object.freeze(Config);