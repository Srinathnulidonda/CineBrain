// Configuration
const CONFIG = {
    API_BASE_URL: 'https://backend-app-970m.onrender.com/api',
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p',
    IMAGE_SIZES: {
        poster: {
            small: 'w185',
            medium: 'w342',
            large: 'w500',
            original: 'original'
        },
        backdrop: {
            small: 'w300',
            medium: 'w780',
            large: 'w1280',
            original: 'original'
        }
    },
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    DEBOUNCE_DELAY: 300,
    ITEMS_PER_PAGE: 20,
    MOBILE_BREAKPOINT: 768,
    TABLET_BREAKPOINT: 1024
};

// Genre Map
const GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
};