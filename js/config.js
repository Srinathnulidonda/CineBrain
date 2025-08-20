// CineScope Configuration
window.CineScope = {
    // API Configuration
    API: {
        BASE_URL: 'https://backend-app-970m.onrender.com/api',
        ENDPOINTS: {
            AUTH: {
                LOGIN: '/login',
                REGISTER: '/register'
            },
            CONTENT: {
                SEARCH: '/search',
                DETAILS: '/content',
                TRENDING: '/recommendations/trending',
                NEW_RELEASES: '/recommendations/new-releases',
                CRITICS_CHOICE: '/recommendations/critics-choice',
                GENRE: '/recommendations/genre',
                REGIONAL: '/recommendations/regional',
                ANIME: '/recommendations/anime',
                SIMILAR: '/recommendations/similar',
                ADMIN_CHOICE: '/recommendations/admin-choice'
            },
            USER: {
                INTERACTIONS: '/interactions',
                WATCHLIST: '/user/watchlist',
                FAVORITES: '/user/favorites',
                PERSONALIZED: '/recommendations/personalized'
            },
            ADMIN: {
                SEARCH: '/admin/search',
                CONTENT: '/admin/content',
                RECOMMENDATIONS: '/admin/recommendations',
                ANALYTICS: '/admin/analytics',
                ML_CHECK: '/admin/ml-service-check',
                ML_UPDATE: '/admin/ml-service-update',
                ML_STATS: '/admin/ml-stats'
            }
        }
    },

    // Design System
    DESIGN: {
        COLORS: {
            BASE: {
                VOID: '#0a0a0b',
                CHARCOAL: '#121218',
                SURFACE: '#1a1a22'
            },
            ACCENT: {
                BLUE: '#2563eb',
                PURPLE: '#9333ea'
            },
            TEXT: {
                PRIMARY: '#ffffff',
                SECONDARY: '#e2e8f0',
                MUTED: '#94a3b8'
            }
        },
        BREAKPOINTS: {
            SM: 576,
            MD: 768,
            LG: 992,
            XL: 1200,
            XXL: 1400
        },
        ANIMATIONS: {
            FAST: '0.15s',
            NORMAL: '0.2s',
            SLOW: '0.3s'
        }
    },

    // Tailwind CSS Prefix
    TW_PREFIX: 'tw-',

    // Navigation Configuration
    NAV: {
        DESKTOP_BREAKPOINT: 992,
        MOBILE_NAV_HEIGHT: '80px'
    },

    // Content Configuration
    CONTENT: {
        CARDS_PER_ROW: {
            MOBILE: 2,
            TABLET: 3,
            DESKTOP: 4,
            LARGE: 5
        },
        LAZY_LOAD_THRESHOLD: '100px',
        IMAGE_SIZES: {
            POSTER_SMALL: 'w300',
            POSTER_MEDIUM: 'w500',
            BACKDROP_SMALL: 'w780',
            BACKDROP_LARGE: 'w1280'
        }
    },

    // Feature Flags
    FEATURES: {
        ENABLE_ANALYTICS: true,
        ENABLE_PWA: true,
        ENABLE_OFFLINE: false
    }
};

// Utility Functions
window.CineScope.utils = {
    // Get current username from URL path
    getCurrentUsername() {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);

        // Check if we're in a user route (has username)
        const protectedRoutes = ['profile', 'watchlist', 'favorites', 'settings', 'activity', 'search', 'details', 'anime', 'genre', 'regional'];
        if (segments.length >= 2 && protectedRoutes.includes(segments[1])) {
            return segments[0];
        }

        return null;
    },

    // Build user route URL
    buildUserRoute(username, route, params = '') {
        return `/${username}/${route}${params}`;
    },

    // Check if current route requires authentication
    isProtectedRoute() {
        return this.getCurrentUsername() !== null;
    },

    // Format release date
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Format rating
    formatRating(rating) {
        return rating ? parseFloat(rating).toFixed(1) : 'N/A';
    },

    // Generate content card ID
    generateCardId(content) {
        return `content-card-${content.id}`;
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
    }
};