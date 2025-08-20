// Storage utilities for token and user management
const Storage = {
    // Keys
    KEYS: {
        TOKEN: 'cinescope_token',
        USER: 'cinescope_user',
        THEME: 'cinescope_theme',
        CACHE_PREFIX: 'cinescope_cache_',
        WATCHLIST: 'cinescope_watchlist',
        FAVORITES: 'cinescope_favorites'
    },

    // Token management
    setToken(token) {
        if (token) {
            localStorage.setItem(this.KEYS.TOKEN, token);
        }
    },

    getToken() {
        return localStorage.getItem(this.KEYS.TOKEN);
    },

    removeToken() {
        localStorage.removeItem(this.KEYS.TOKEN);
    },

    // User management
    setUser(user) {
        if (user) {
            localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
        }
    },

    getUser() {
        const userStr = localStorage.getItem(this.KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
    },

    removeUser() {
        localStorage.removeItem(this.KEYS.USER);
    },

    // Theme management
    setTheme(theme) {
        localStorage.setItem(this.KEYS.THEME, theme);
    },

    getTheme() {
        return localStorage.getItem(this.KEYS.THEME) || 'dark';
    },

    // Cache management
    setCache(key, data, duration = CONFIG.CACHE_DURATION) {
        const cacheData = {
            data,
            timestamp: Date.now(),
            duration
        };
        sessionStorage.setItem(this.KEYS.CACHE_PREFIX + key, JSON.stringify(cacheData));
    },

    getCache(key) {
        const cacheStr = sessionStorage.getItem(this.KEYS.CACHE_PREFIX + key);
        if (!cacheStr) return null;

        const cache = JSON.parse(cacheStr);
        if (Date.now() - cache.timestamp > cache.duration) {
            sessionStorage.removeItem(this.KEYS.CACHE_PREFIX + key);
            return null;
        }

        return cache.data;
    },

    clearCache() {
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
            if (key.startsWith(this.KEYS.CACHE_PREFIX)) {
                sessionStorage.removeItem(key);
            }
        });
    },

    // Local watchlist/favorites for anonymous users
    getLocalWatchlist() {
        const data = localStorage.getItem(this.KEYS.WATCHLIST);
        return data ? JSON.parse(data) : [];
    },

    addToLocalWatchlist(contentId) {
        const watchlist = this.getLocalWatchlist();
        if (!watchlist.includes(contentId)) {
            watchlist.push(contentId);
            localStorage.setItem(this.KEYS.WATCHLIST, JSON.stringify(watchlist));
        }
    },

    removeFromLocalWatchlist(contentId) {
        let watchlist = this.getLocalWatchlist();
        watchlist = watchlist.filter(id => id !== contentId);
        localStorage.setItem(this.KEYS.WATCHLIST, JSON.stringify(watchlist));
    },

    getLocalFavorites() {
        const data = localStorage.getItem(this.KEYS.FAVORITES);
        return data ? JSON.parse(data) : [];
    },

    addToLocalFavorites(contentId) {
        const favorites = this.getLocalFavorites();
        if (!favorites.includes(contentId)) {
            favorites.push(contentId);
            localStorage.setItem(this.KEYS.FAVORITES, JSON.stringify(favorites));
        }
    },

    removeFromLocalFavorites(contentId) {
        let favorites = this.getLocalFavorites();
        favorites = favorites.filter(id => id !== contentId);
        localStorage.setItem(this.KEYS.FAVORITES, JSON.stringify(favorites));
    },

    // Clear all data
    clearAll() {
        this.removeToken();
        this.removeUser();
        this.clearCache();
        localStorage.removeItem(this.KEYS.WATCHLIST);
        localStorage.removeItem(this.KEYS.FAVORITES);
    }
};