const CONSTANTS = {
    CONTENT_TYPES: {
        MOVIE: 'movie',
        TV: 'tv',
        ANIME: 'anime'
    },
    
    INTERACTION_TYPES: {
        VIEW: 'view',
        LIKE: 'like',
        FAVORITE: 'favorite',
        WISHLIST: 'wishlist',
        RATING: 'rating'
    },
    
    GENRES: {
        28: "Action",
        12: "Adventure", 
        16: "Animation",
        35: "Comedy",
        80: "Crime",
        99: "Documentary",
        18: "Drama",
        10751: "Family",
        14: "Fantasy",
        36: "History",
        27: "Horror",
        10402: "Music",
        9648: "Mystery",
        10749: "Romance",
        878: "Science Fiction",
        10770: "TV Movie",
        53: "Thriller",
        10752: "War",
        37: "Western"
    },
    
    LANGUAGES: {
        en: 'English',
        hi: 'Hindi',
        te: 'Telugu',
        ta: 'Tamil',
        kn: 'Kannada',
        ml: 'Malayalam',
        bn: 'Bengali',
        mr: 'Marathi',
        gu: 'Gujarati',
        pa: 'Punjabi'
    },
    
    SORT_OPTIONS: {
        POPULARITY_DESC: 'popularity.desc',
        POPULARITY_ASC: 'popularity.asc',
        RATING_DESC: 'vote_average.desc',
        RATING_ASC: 'vote_average.asc',
        RELEASE_DATE_DESC: 'release_date.desc',
        RELEASE_DATE_ASC: 'release_date.asc',
        TITLE_ASC: 'title.asc',
        TITLE_DESC: 'title.desc'
    },
    
    IMAGE_SIZES: {
        POSTER: {
            SMALL: 'w185',
            MEDIUM: 'w342',
            LARGE: 'w500',
            XLARGE: 'w780'
        },
        BACKDROP: {
            SMALL: 'w300',
            MEDIUM: 'w780',
            LARGE: 'w1280',
            ORIGINAL: 'original'
        }
    },
    
    STORAGE_KEYS: {
        AUTH_TOKEN: 'auth_token',
        USER_DATA: 'user_data',
        USER_PREFERENCES: 'user_preferences',
        THEME: 'theme',
        LANGUAGE: 'language',
        CACHE_PREFIX: 'cache_',
        OFFLINE_DATA: 'offline_data',
        ERROR_LOGS: 'error_logs'
    },
    
    EVENTS: {
        CONTENT_SELECTED: 'content_selected',
        USER_LOGGED_IN: 'user_logged_in',
        USER_LOGGED_OUT: 'user_logged_out',
        THEME_CHANGED: 'theme_changed',
        OFFLINE_MODE: 'offline_mode',
        ONLINE_MODE: 'online_mode'
    },
    
    ADMIN_ROLES: {
        SUPER_ADMIN: 'super_admin',
        ADMIN: 'admin',
        MODERATOR: 'moderator'
    },
    
    API_ENDPOINTS: {
        LOGIN: '/login',
        REGISTER: '/register',
        HOMEPAGE: '/homepage',
        RECOMMENDATIONS: '/recommendations',
        PERSONALIZED_RECOMMENDATIONS: '/recommendations/personalized',
        CONTENT_DETAILS: '/content',
        SEARCH: '/search',
        INTERACT: '/interact',
        ADMIN_BROWSE: '/admin/enhanced-browse',
        ADMIN_CREATE_POST: '/admin/create-post',
        ADMIN_POSTS: '/admin/posts',
        ADMIN_ANALYTICS: '/admin/analytics',
        ADMIN_SYSTEM_STATUS: '/admin/system-status',
        ENHANCED_SYNC: '/enhanced-sync'
    }
};

window.CONSTANTS = CONSTANTS;